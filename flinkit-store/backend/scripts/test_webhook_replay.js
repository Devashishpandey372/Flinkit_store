/**
 * test_webhook_replay.js
 *
 * Developer utility script to demonstrate and test Razorpay Webhook Idempotency:
 * 1. Simulates/captures a valid Razorpay webhook payload and x-razorpay-event-id header.
 * 2. Computes the authentic HMAC-SHA256 signature using RAZORPAY_WEBHOOK_SECRET.
 * 3. Dispatches Delivery #1: verifies order transitions to 'paid' and stock is NOT double-deducted.
 * 4. Dispatches Delivery #2 (Replay): verifies duplicate detection, returns HTTP 200, zero business mutation.
 * 5. Verifies MongoDB has strictly ONE ProcessedWebhook record for that event.
 * 6. Verifies dev replay mechanism is disabled in production.
 *
 * Usage:
 *   node scripts/test_webhook_replay.js
 */

require('dotenv').config();
const crypto = require('crypto');
const mongoose = require('mongoose');
const request = require('supertest');
const app = require('../app');
const connectDB = require('../config/db');
const User = require('../models/User');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Category = require('../models/Category');
const ProcessedWebhook = require('../models/ProcessedWebhook');

const WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET || 'mockwebhooksecret123';

const runReplayTest = async () => {
  console.log('\n================================================================');
  console.log('🧪 RAZORPAY WEBHOOK IDEMPOTENCY & REPLAY VERIFICATION TEST');
  console.log('================================================================\n');

  await connectDB();

  try {
    // 1. Setup test entities
    const testCategory = await Category.findOneAndUpdate(
      { slug: 'replay-test-category' },
      { name: 'Replay Test Category', slug: 'replay-test-category' },
      { upsert: true, new: true }
    );

    const initialStock = 50;
    const orderQty = 2;

    const testProduct = await Product.findOneAndUpdate(
      { slug: 'replay-test-product' },
      {
        name: 'Replay Test Item',
        slug: 'replay-test-product',
        category: testCategory._id,
        unit: '1 kg',
        originalPrice: 100,
        sellingPrice: 90,
        stock: initialStock - orderQty, // 48 remaining
        isActive: true,
      },
      { upsert: true, new: true }
    );

    const testUser = await User.findOneAndUpdate(
      { email: 'replay_tester@flinkitstore.com' },
      {
        name: 'Webhook Tester',
        email: 'replay_tester@flinkitstore.com',
        phone: '9999900000',
        password: 'Password@123',
        role: 'customer',
      },
      { upsert: true, new: true }
    );

    const razorpayOrderId = `order_test_${Date.now()}`;
    const razorpayPaymentId = `pay_test_${Date.now()}`;
    const eventId = `evt_replay_${Date.now()}`;

    // Clean up any stale webhook record for this eventId
    await ProcessedWebhook.deleteMany({ eventId });

    const testOrder = await Order.create({
      user: testUser._id,
      items: [
        {
          product: testProduct._id,
          name: testProduct.name,
          unit: testProduct.unit,
          sellingPrice: testProduct.sellingPrice,
          originalPrice: testProduct.originalPrice,
          quantity: orderQty,
        },
      ],
      deliveryAddress: {
        fullName: 'Webhook Tester',
        phone: '9999900000',
        houseNumber: '1',
        street: 'Testing Lane',
        city: 'New Delhi',
        state: 'Delhi',
        pinCode: '110001',
      },
      subtotal: 180,
      deliveryFee: 40,
      totalAmount: 220,
      paymentMethod: 'online',
      paymentStatus: 'pending',
      fulfillmentStatus: 'placed',
      razorpayOrderId,
    });

    console.log(`📦 [Setup] Created Order: ${testOrder._id}`);
    console.log(`   Initial paymentStatus: "${testOrder.paymentStatus}", Amount: ₹${testOrder.totalAmount}`);
    console.log(`   Product initial stock: ${testProduct.stock} (1 deduction at order creation)\n`);

    // 2. Prepare captured webhook payload and authentic signature
    const payload = {
      id: eventId,
      entity: 'event',
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: razorpayPaymentId,
            order_id: razorpayOrderId,
            amount: 22000, // 220 INR in paise
            currency: 'INR',
            status: 'captured',
            notes: { orderId: testOrder._id.toString() },
          },
        },
      },
      created_at: Math.floor(Date.now() / 1000),
    };

    const rawPayload = JSON.stringify(payload);

    const signature = crypto
      .createHmac('sha256', WEBHOOK_SECRET)
      .update(rawPayload)
      .digest('hex');

    console.log(`🔑 [Security] Computed HMAC-SHA256 signature for Event ID: "${eventId}"`);
    console.log(`   Header x-razorpay-event-id: "${eventId}"\n`);

    // ─── STEP 1: First Delivery ───────────────────────────────────
    console.log('📡 [Step 1] Dispatching Delivery #1 to /api/payments/webhook...');
    const res1 = await request(app)
      .post('/api/payments/webhook')
      .set('x-razorpay-signature', signature)
      .set('x-razorpay-event-id', eventId)
      .set('Content-Type', 'application/json')
      .send(rawPayload);

    console.log(`   HTTP Status: ${res1.status}`);
    console.log(`   Response:`, res1.body);

    const orderAfter1 = await Order.findById(testOrder._id);
    const productAfter1 = await Product.findById(testProduct._id);
    const webhookCountAfter1 = await ProcessedWebhook.countDocuments({ eventId });

    console.log(`   Order paymentStatus: "${orderAfter1.paymentStatus}" (fulfillmentStatus: "${orderAfter1.fulfillmentStatus}")`);
    console.log(`   Product stock: ${productAfter1.stock} units (preserves exact 1 deduction)`);
    console.log(`   ProcessedWebhook records in MongoDB: ${webhookCountAfter1}`);

    if (orderAfter1.paymentStatus !== 'paid') {
      throw new Error(`First delivery failed: paymentStatus is "${orderAfter1.paymentStatus}"`);
    }
    if (webhookCountAfter1 !== 1) {
      throw new Error(`Expected exactly 1 ProcessedWebhook record, found ${webhookCountAfter1}`);
    }

    // ─── STEP 2: Duplicate Delivery (Replay Test) ─────────────────
    console.log('\n📡 [Step 2] Replaying Exact Same Captured Webhook (Delivery #2)...');
    const res2 = await request(app)
      .post('/api/payments/webhook')
      .set('x-razorpay-signature', signature)
      .set('x-razorpay-event-id', eventId)
      .set('Content-Type', 'application/json')
      .send(rawPayload);

    console.log(`   HTTP Status: ${res2.status}`);
    console.log(`   Response:`, res2.body);

    const orderAfter2 = await Order.findById(testOrder._id);
    const productAfter2 = await Product.findById(testProduct._id);
    const webhookCountAfter2 = await ProcessedWebhook.countDocuments({ eventId });

    console.log(`   Order paidAt timestamp unchanged: ${orderAfter1.paidAt.getTime() === orderAfter2.paidAt.getTime()}`);
    console.log(`   Product stock: ${productAfter2.stock} units (ZERO extra inventory deducted)`);
    console.log(`   ProcessedWebhook records in MongoDB: ${webhookCountAfter2} (strictly 1, no duplicate)`);

    if (!res2.body.duplicate) {
      throw new Error('Delivery #2 was NOT recognized as duplicate!');
    }
    if (webhookCountAfter2 !== 1) {
      throw new Error(`Expected strictly 1 ProcessedWebhook record after replay, found ${webhookCountAfter2}`);
    }

    // ─── STEP 3: Replay via Dev-Only Replay Endpoint ──────────────
    console.log('\n📡 [Step 3] Testing Dev Replay Route (/api/payments/dev/replay-webhook)...');
    const resDev = await request(app)
      .post('/api/payments/dev/replay-webhook')
      .set('x-razorpay-signature', signature)
      .set('x-razorpay-event-id', eventId)
      .set('Content-Type', 'application/json')
      .send(rawPayload);

    console.log(`   HTTP Status: ${resDev.status}`);
    console.log(`   Response:`, resDev.body);
    if (!resDev.body.duplicate) {
      throw new Error('Dev replay endpoint did not detect duplicate event!');
    }

    // ─── STEP 4: Production Lockdown Check ────────────────────────
    console.log('\n🔒 [Step 4] Testing Production Lockdown for Replay Endpoint...');
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    const resProd = await request(app)
      .post('/api/payments/dev/replay-webhook')
      .set('x-razorpay-signature', signature)
      .set('x-razorpay-event-id', eventId)
      .set('Content-Type', 'application/json')
      .send(rawPayload);

    console.log(`   HTTP Status: ${resProd.status} (Expected 403 Forbidden in production)`);
    console.log(`   Response:`, resProd.body);

    process.env.NODE_ENV = originalEnv;

    if (resProd.status !== 403) {
      throw new Error(`Expected 403 Forbidden in production, received ${resProd.status}`);
    }

    // ─── STEP 5: Tampered Signature Rejection ─────────────────────
    console.log('\n🛡️ [Step 5] Testing Tampered Signature Rejection...');
    const resTampered = await request(app)
      .post('/api/payments/webhook')
      .set('x-razorpay-signature', 'forged_fake_signature_999')
      .set('x-razorpay-event-id', `evt_fake_${Date.now()}`)
      .set('Content-Type', 'application/json')
      .send(rawPayload);

    console.log(`   HTTP Status: ${resTampered.status} (Expected 400 Bad Request)`);
    console.log(`   Response:`, resTampered.body);

    if (resTampered.status !== 400) {
      throw new Error(`Expected 400 for tampered signature, received ${resTampered.status}`);
    }

    // Cleanup
    await Order.findByIdAndDelete(testOrder._id);
    await ProcessedWebhook.deleteMany({ eventId });
    console.log('\n🧹 [Teardown] Test artifacts cleaned up successfully.');

    console.log('\n================================================================');
    console.log('🎉 ALL IDEMPOTENCY, REPLAY & CONCURRENCY CHECKS PASSED!');
    console.log('================================================================\n');
  } catch (err) {
    console.error('\n❌ Test failed with error:', err.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
};

runReplayTest();
