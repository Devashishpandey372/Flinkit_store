/**
 * test_deployed_webhook.js
 *
 * Safe CLI utility to execute the duplicate webhook idempotency test
 * against your DEPLOYED Flinkit Store backend (e.g., Render) or localhost.
 *
 * HOW IT WORKS:
 * 1. Reads RAZORPAY_WEBHOOK_SECRET securely from your backend/.env (never logged or exposed).
 * 2. Generates an authentic HMAC-SHA256 signature for a test webhook payload.
 * 3. Sends Delivery #1 with a unique Razorpay Event ID (x-razorpay-event-id).
 * 4. Sends Delivery #2 with the EXACT SAME payload, signature, and event ID.
 * 5. Verifies:
 *    - Delivery #1 returns HTTP 200 (processed).
 *    - Delivery #2 returns HTTP 200 with { duplicate: true } (skipped, zero mutation).
 *
 * USAGE:
 *   # Against local server:
 *   node scripts/test_deployed_webhook.js
 *
 *   # Against your deployed Render backend:
 *   TARGET_URL=https://your-flinkit-backend.onrender.com node scripts/test_deployed_webhook.js
 *
 *   # With an existing test order ID from your database:
 *   TARGET_URL=https://your-flinkit-backend.onrender.com ORDER_ID=65abcd... node scripts/test_deployed_webhook.js
 */

require('dotenv').config();
const crypto = require('crypto');
const https = require('https');
const http = require('http');
const { URL } = require('url');

const TARGET_URL = (process.env.TARGET_URL || 'http://localhost:5000').replace(/\/+$/, '');
const WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET;
const ORDER_ID = process.env.ORDER_ID || null;
const RAZORPAY_ORDER_ID = process.env.RAZORPAY_ORDER_ID || `order_test_${Date.now()}`;

if (!WEBHOOK_SECRET) {
  console.error('\n❌ ERROR: RAZORPAY_WEBHOOK_SECRET is not defined in backend/.env.');
  console.error('Please configure RAZORPAY_WEBHOOK_SECRET in backend/.env before running this test.\n');
  process.exit(1);
}

const sendHttpRequest = (targetEndpoint, rawPayload, headers) => {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(targetEndpoint);
    const client = parsedUrl.protocol === 'https:' ? https : http;

    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'POST',
      timeout: 15000, // 15-second strict timeout
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(rawPayload),
        ...headers,
      },
    };

    const req = client.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.setTimeout(15000, () => {
      req.destroy(new Error('Request timed out after 15000ms. Aborted safely.'));
    });

    req.on('error', (err) => reject(err));
    req.write(rawPayload);
    req.end();
  });
};

const runTest = async () => {
  console.log('\n================================================================');
  console.log('🚀 FLINKIT STORE — DEPLOYED RAZORPAY WEBHOOK IDEMPOTENCY TEST');
  console.log('================================================================');
  console.log(`🌐 Target Base URL:    ${TARGET_URL}`);
  console.log(`🎯 Webhook Endpoint:   ${TARGET_URL}/api/payments/webhook`);
  console.log(`🔒 Signature Mode:     HMAC-SHA256 (via backend/.env secret)`);

  const eventId = `evt_deployed_test_${Date.now()}`;
  const paymentId = `pay_deployed_test_${Date.now()}`;

  // 1. Prepare realistic payload
  const payload = {
    id: eventId,
    entity: 'event',
    event: 'payment.captured',
    payload: {
      payment: {
        entity: {
          id: paymentId,
          order_id: RAZORPAY_ORDER_ID,
          amount: 12000, // 120 INR in paise
          currency: 'INR',
          status: 'captured',
          notes: ORDER_ID ? { orderId: ORDER_ID } : {},
        },
      },
    },
    created_at: Math.floor(Date.now() / 1000),
  };

  const rawPayload = JSON.stringify(payload);

  // 2. Compute authentic HMAC-SHA256 signature locally
  const signature = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(rawPayload)
    .digest('hex');

  const headers = {
    'x-razorpay-signature': signature,
    'x-razorpay-event-id': eventId,
  };

  console.log(`🆔 Test Event ID:      ${eventId}`);
  console.log(`💳 Test Payment ID:    ${paymentId}`);
  console.log(`📦 Razorpay Order ID:  ${RAZORPAY_ORDER_ID}\n`);

  try {
    // ─── DELIVERY #1 ──────────────────────────────────────────────
    console.log('📡 [Step 1] Sending Delivery #1 (Initial Event)...');
    const res1 = await sendHttpRequest(`${TARGET_URL}/api/payments/webhook`, rawPayload, headers);
    console.log(`   Status:   HTTP ${res1.status}`);
    console.log(`   Response:`, JSON.stringify(res1.body, null, 2));

    if (res1.status !== 200) {
      throw new Error(`Delivery #1 failed with status HTTP ${res1.status}: ${JSON.stringify(res1.body)}`);
    }

    if (res1.body.duplicate === true) {
      throw new Error(`Delivery #1 was unexpectedly marked as duplicate!`);
    }

    console.log('   ✅ Delivery #1 successfully processed and acknowledged.\n');

    // ─── DELIVERY #2 (REPLAY) ────────────────────────────────────
    console.log('📡 [Step 2] Sending Delivery #2 (Replay with IDENTICAL Event ID & Payload)...');
    const res2 = await sendHttpRequest(`${TARGET_URL}/api/payments/webhook`, rawPayload, headers);
    console.log(`   Status:   HTTP ${res2.status}`);
    console.log(`   Response:`, JSON.stringify(res2.body, null, 2));

    if (res2.status !== 200) {
      throw new Error(`Delivery #2 failed with status HTTP ${res2.status}: ${JSON.stringify(res2.body)}`);
    }

    if (!res2.body.duplicate) {
      throw new Error(`Delivery #2 was NOT recognized as a duplicate! Expected { duplicate: true }.`);
    }

    console.log('   ✅ Delivery #2 successfully recognized as DUPLICATE. Zero state re-processing.\n');

    // ─── TAMPERED SIGNATURE CHECK ────────────────────────────────
    console.log('🛡️ [Step 3] Verifying Security (Tampered Signature Rejection)...');
    const tamperedHeaders = {
      'x-razorpay-signature': 'invalid_tampered_signature_hex_123',
      'x-razorpay-event-id': `evt_tamper_${Date.now()}`,
    };
    const resTampered = await sendHttpRequest(`${TARGET_URL}/api/payments/webhook`, rawPayload, tamperedHeaders);
    console.log(`   Status:   HTTP ${resTampered.status} (Expected 400 Bad Request)`);
    console.log(`   Response:`, JSON.stringify(resTampered.body, null, 2));

    if (resTampered.status !== 400) {
      throw new Error(`Expected HTTP 400 for tampered signature, received HTTP ${resTampered.status}`);
    }

    console.log('   ✅ Tampered signatures are strictly rejected.\n');

    // ─── SUCCESS REPORT ──────────────────────────────────────────
    console.log('================================================================');
    console.log('🎉 IDEMPOTENCY TEST PASSED SUCCESSFULLY ON TARGET SERVER!');
    console.log('================================================================');
    console.log('\n📊 MONGODB VERIFICATION COMMANDS:');
    console.log('Open MongoDB Compass or Mongo Shell connected to your database and run:');
    console.log(`  db.processedwebhooks.find({ eventId: "${eventId}" })`);
    console.log('Expected result: Exactly 1 document found.');
    console.log(`  db.processedwebhooks.countDocuments({ eventId: "${eventId}" })`);
    console.log('Expected result: 1\n');
  } catch (err) {
    console.error('\n❌ Test execution failed:', err.message);
    process.exit(1);
  }
};

runTest();

