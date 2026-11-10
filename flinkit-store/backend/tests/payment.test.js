const crypto = require('crypto');
const request = require('supertest');
const app = require('../app');
const Product = require('../models/Product');
const Category = require('../models/Category');
const Order = require('../models/Order');
const Address = require('../models/Address');
const ProcessedWebhook = require('../models/ProcessedWebhook');
const { createTestUser } = require('./setup');
const razorpayConfig = require('../config/razorpay');

describe('Payment API Endpoints & Webhook Idempotency', () => {
  let user;
  let token;
  let order;
  let product;
  const initialStock = 20;
  const orderedQty = 2;

  afterEach(() => {
    jest.restoreAllMocks();
  });

  beforeEach(async () => {
    const auth = await createTestUser();
    user = auth.user;
    token = auth.token;

    const category = await Category.create({
      name: `Category-${Date.now()}-${Math.random()}`,
      slug: `category-${Date.now()}-${Math.random()}`,
    });

    product = await Product.create({
      name: 'Sample Drink',
      slug: `sample-drink-${Date.now()}-${Math.random()}`,
      category: category._id,
      unit: '500 ml',
      originalPrice: 50,
      sellingPrice: 40,
      stock: initialStock - orderedQty, // 18 remaining after order reservation
    });

    order = await Order.create({
      user: user._id,
      items: [
        {
          product: product._id,
          name: product.name,
          unit: product.unit,
          sellingPrice: product.sellingPrice,
          originalPrice: product.originalPrice,
          quantity: orderedQty,
        },
      ],
      deliveryAddress: {
        fullName: 'Dev User',
        phone: '9876543210',
        houseNumber: '12',
        street: 'Main Road',
        city: 'Delhi',
        state: 'Delhi',
        pinCode: '110001',
      },
      subtotal: 80,
      deliveryFee: 40,
      totalAmount: 120,
      paymentMethod: 'online',
      paymentStatus: 'pending',
      fulfillmentStatus: 'placed',
    });
  });

  afterEach(async () => {
    await Order.deleteMany({});
    await Product.deleteMany({});
    await Category.deleteMany({});
    await ProcessedWebhook.deleteMany({});
  });

  it('POST /api/payments/create-order - should create Razorpay order for online payment', async () => {
    jest.spyOn(razorpayConfig, 'getRazorpay').mockReturnValue({
      orders: {
        create: jest.fn().mockResolvedValue({
          id: 'order_mock_rzp_12345',
          amount: 12000,
          currency: 'INR',
        }),
      },
    });

    const res = await request(app)
      .post('/api/payments/create-order')
      .set('Authorization', `Bearer ${token}`)
      .send({ orderId: order._id });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.razorpayOrderId).toBe('order_mock_rzp_12345');
    expect(res.body.data.amount).toBe(12000);
  });

  it('POST /api/payments/create-order - should reject if order is COD', async () => {
    order.paymentMethod = 'cod';
    await order.save();

    const res = await request(app)
      .post('/api/payments/create-order')
      .set('Authorization', `Bearer ${token}`)
      .send({ orderId: order._id });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/cash on delivery/i);
  });

  it('POST /api/payments/verify - should verify payment signature and mark order paid', async () => {
    const razorpay_order_id = 'order_mock_rzp_12345';
    const razorpay_payment_id = 'pay_mock_12345';

    order.razorpayOrderId = razorpay_order_id;
    await order.save();

    const razorpay_signature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    const res = await request(app)
      .post('/api/payments/verify')
      .set('Authorization', `Bearer ${token}`)
      .send({
        orderId: order._id,
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.order.paymentStatus).toBe('paid');
    expect(res.body.data.order.fulfillmentStatus).toBe('confirmed');

    const updated = await Order.findById(order._id);
    expect(updated.paymentStatus).toBe('paid');
    expect(updated.razorpayPaymentId).toBe(razorpay_payment_id);
  });

  it('POST /api/payments/verify - should reject invalid signature', async () => {
    const razorpay_order_id = 'order_mock_rzp_12345';
    order.razorpayOrderId = razorpay_order_id;
    await order.save();

    const res = await request(app)
      .post('/api/payments/verify')
      .set('Authorization', `Bearer ${token}`)
      .send({
        orderId: order._id,
        razorpay_order_id,
        razorpay_payment_id: 'pay_mock_12345',
        razorpay_signature: 'invalid_tampered_signature',
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/signature/i);
  });

  it('POST /api/payments/verify - should be idempotent if order already verified', async () => {
    const razorpay_order_id = 'order_mock_rzp_already_paid';
    const razorpay_payment_id = 'pay_mock_already_paid';

    order.razorpayOrderId = razorpay_order_id;
    order.paymentStatus = 'paid';
    order.razorpayPaymentId = razorpay_payment_id;
    await order.save();

    const razorpay_signature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    const res = await request(app)
      .post('/api/payments/verify')
      .set('Authorization', `Bearer ${token}`)
      .send({
        orderId: order._id,
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toMatch(/already verified/i);
  });

  // ─── Webhook Idempotency Tests ─────────────────────────────────

  it('POST /api/payments/webhook - should handle payment.captured webhook on first delivery', async () => {
    const razorpayOrderId = 'order_webhook_rzp_123';
    const razorpayPaymentId = 'pay_webhook_123';
    const eventId = 'evt_test_first_delivery_101';

    order.razorpayOrderId = razorpayOrderId;
    await order.save();

    const payload = {
      id: eventId,
      entity: 'event',
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: razorpayPaymentId,
            order_id: razorpayOrderId,
            amount: 12000,
            currency: 'INR',
            status: 'captured',
            notes: { orderId: order._id.toString() },
          },
        },
      },
    };

    const rawPayload = JSON.stringify(payload);
    const signature = crypto
      .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
      .update(rawPayload)
      .digest('hex');

    const res = await request(app)
      .post('/api/payments/webhook')
      .set('x-razorpay-signature', signature)
      .set('Content-Type', 'application/json')
      .send(rawPayload);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.orderId).toBe(order._id.toString());

    // Verify order updated in DB
    const updated = await Order.findById(order._id);
    expect(updated.paymentStatus).toBe('paid');
    expect(updated.fulfillmentStatus).toBe('confirmed');
    expect(updated.razorpayPaymentId).toBe(razorpayPaymentId);

    // Verify ProcessedWebhook record created
    const processedRecord = await ProcessedWebhook.findOne({ eventId });
    expect(processedRecord).toBeTruthy();
    expect(processedRecord.eventType).toBe('payment.captured');
    expect(processedRecord.paymentId).toBe(razorpayPaymentId);
  });

  it('POST /api/payments/webhook - should detect duplicate delivery and return 200 without repeat updates', async () => {
    const razorpayOrderId = 'order_webhook_rzp_duplicate_test';
    const razorpayPaymentId = 'pay_webhook_dup_123';
    const eventId = 'evt_test_duplicate_202';

    order.razorpayOrderId = razorpayOrderId;
    await order.save();

    const payload = {
      id: eventId,
      entity: 'event',
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: razorpayPaymentId,
            order_id: razorpayOrderId,
            amount: 12000,
            currency: 'INR',
            status: 'captured',
            notes: { orderId: order._id.toString() },
          },
        },
      },
    };

    const rawPayload = JSON.stringify(payload);
    const signature = crypto
      .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
      .update(rawPayload)
      .digest('hex');

    // 1st delivery
    const res1 = await request(app)
      .post('/api/payments/webhook')
      .set('x-razorpay-signature', signature)
      .set('Content-Type', 'application/json')
      .send(rawPayload);

    expect(res1.status).toBe(200);
    expect(res1.body.success).toBe(true);

    const initialPaidAt = (await Order.findById(order._id)).paidAt;

    // 2nd delivery (duplicate with identical eventId & payload)
    const res2 = await request(app)
      .post('/api/payments/webhook')
      .set('x-razorpay-signature', signature)
      .set('Content-Type', 'application/json')
      .send(rawPayload);

    expect(res2.status).toBe(200);
    expect(res2.body.success).toBe(true);
    expect(res2.body.duplicate).toBe(true);
    expect(res2.body.message).toMatch(/already processed/i);

    // Ensure order was NOT re-saved with new timestamp
    const updated = await Order.findById(order._id);
    expect(updated.paidAt.getTime()).toBe(initialPaidAt.getTime());

    // Product stock must remain 18 (one inventory deduction only)
    const prodCheck = await Product.findById(product._id);
    expect(prodCheck.stock).toBe(18);
  });

  it('POST /api/payments/webhook - should handle concurrent duplicate webhook deliveries safely', async () => {
    const razorpayOrderId = 'order_webhook_concurrent_rzp';
    const razorpayPaymentId = 'pay_webhook_concurrent';
    const eventId = 'evt_test_concurrent_303';

    order.razorpayOrderId = razorpayOrderId;
    await order.save();

    const payload = {
      id: eventId,
      entity: 'event',
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: razorpayPaymentId,
            order_id: razorpayOrderId,
            amount: 12000,
            currency: 'INR',
            status: 'captured',
          },
        },
      },
    };

    const rawPayload = JSON.stringify(payload);
    const signature = crypto
      .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
      .update(rawPayload)
      .digest('hex');

    // Fire 3 concurrent requests simultaneously
    const results = await Promise.all([
      request(app).post('/api/payments/webhook').set('x-razorpay-signature', signature).set('Content-Type', 'application/json').send(rawPayload),
      request(app).post('/api/payments/webhook').set('x-razorpay-signature', signature).set('Content-Type', 'application/json').send(rawPayload),
      request(app).post('/api/payments/webhook').set('x-razorpay-signature', signature).set('Content-Type', 'application/json').send(rawPayload),
    ]);

    // All must return HTTP 200
    results.forEach((r) => {
      expect(r.status).toBe(200);
      expect(r.body.success).toBe(true);
    });

    // Exactly one must be the primary processor, the other 2 must be duplicates
    const duplicateResponses = results.filter((r) => r.body.duplicate === true);
    expect(duplicateResponses.length).toBe(2);

    // Order must be paid and confirmed
    const updated = await Order.findById(order._id);
    expect(updated.paymentStatus).toBe('paid');
    expect(updated.fulfillmentStatus).toBe('confirmed');

    // Only 1 record in ProcessedWebhook
    const recordCount = await ProcessedWebhook.countDocuments({ eventId });
    expect(recordCount).toBe(1);
  });

  it('POST /api/payments/webhook - should reject invalid signature with HTTP 400', async () => {
    const payload = {
      id: 'evt_invalid_sig',
      event: 'payment.captured',
      payload: { payment: { entity: { id: 'pay_xyz', order_id: 'order_xyz' } } },
    };

    const rawPayload = JSON.stringify(payload);

    const res = await request(app)
      .post('/api/payments/webhook')
      .set('x-razorpay-signature', 'forged_fake_signature')
      .set('Content-Type', 'application/json')
      .send(rawPayload);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/signature/i);
  });

  it('POST /api/payments/webhook - should handle payment.failed event and mark order failed', async () => {
    const razorpayOrderId = 'order_webhook_failed_test';
    order.razorpayOrderId = razorpayOrderId;
    await order.save();

    const payload = {
      id: 'evt_failed_test_404',
      event: 'payment.failed',
      payload: {
        payment: {
          entity: {
            id: 'pay_failed_123',
            order_id: razorpayOrderId,
            status: 'failed',
          },
        },
      },
    };

    const rawPayload = JSON.stringify(payload);
    const signature = crypto
      .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
      .update(rawPayload)
      .digest('hex');

    const res = await request(app)
      .post('/api/payments/webhook')
      .set('x-razorpay-signature', signature)
      .set('Content-Type', 'application/json')
      .send(rawPayload);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const updated = await Order.findById(order._id);
    expect(updated.paymentStatus).toBe('failed');
  });

  it('POST /api/payments/webhook - should allow later successful payment to update order after earlier failure', async () => {
    const razorpayOrderId = 'order_webhook_retry_success';
    order.razorpayOrderId = razorpayOrderId;
    order.paymentStatus = 'failed'; // Earlier attempt failed
    await order.save();

    const successEventId = 'evt_retry_success_505';
    const payload = {
      id: successEventId,
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: 'pay_retry_success_456',
            order_id: razorpayOrderId,
            amount: 12000,
            currency: 'INR',
            status: 'captured',
          },
        },
      },
    };

    const rawPayload = JSON.stringify(payload);
    const signature = crypto
      .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
      .update(rawPayload)
      .digest('hex');

    const res = await request(app)
      .post('/api/payments/webhook')
      .set('x-razorpay-signature', signature)
      .set('Content-Type', 'application/json')
      .send(rawPayload);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const updated = await Order.findById(order._id);
    expect(updated.paymentStatus).toBe('paid');
    expect(updated.fulfillmentStatus).toBe('confirmed');
    expect(updated.razorpayPaymentId).toBe('pay_retry_success_456');
  });

  it('POST /api/payments/dev/replay-webhook - should replay a captured webhook in dev mode and reject in production', async () => {
    const razorpayOrderId = 'order_replay_dev_test';
    const razorpayPaymentId = 'pay_replay_dev_123';
    const eventId = 'evt_replay_dev_606';

    order.razorpayOrderId = razorpayOrderId;
    await order.save();

    const payload = {
      id: eventId,
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: razorpayPaymentId,
            order_id: razorpayOrderId,
            amount: 12000,
            currency: 'INR',
            status: 'captured',
          },
        },
      },
    };

    const rawPayload = JSON.stringify(payload);
    const signature = crypto
      .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
      .update(rawPayload)
      .digest('hex');

    // 1st Replay Call in development: should succeed and verify signature
    const devRes = await request(app)
      .post('/api/payments/dev/replay-webhook')
      .set('x-razorpay-signature', signature)
      .set('Content-Type', 'application/json')
      .send(rawPayload);

    expect(devRes.status).toBe(200);
    expect(devRes.body.success).toBe(true);

    // 2nd Replay Call: should detect duplicate
    const devReplayRes = await request(app)
      .post('/api/payments/dev/replay-webhook')
      .set('x-razorpay-signature', signature)
      .set('Content-Type', 'application/json')
      .send(rawPayload);

    expect(devReplayRes.status).toBe(200);
    expect(devReplayRes.body.duplicate).toBe(true);

    // In production mode: replay endpoint must return 403 Forbidden
    const origEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    const prodRes = await request(app)
      .post('/api/payments/dev/replay-webhook')
      .set('x-razorpay-signature', signature)
      .set('Content-Type', 'application/json')
      .send(rawPayload);

    expect(prodRes.status).toBe(403);
    expect(prodRes.body.message).toMatch(/disabled in production/i);

    process.env.NODE_ENV = origEnv;
  });
});
