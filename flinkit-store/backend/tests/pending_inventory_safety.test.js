const request = require('supertest');
const crypto = require('crypto');
const app = require('../app');
const Product = require('../models/Product');
const Category = require('../models/Category');
const Cart = require('../models/Cart');
const Address = require('../models/Address');
const Order = require('../models/Order');
const { createTestUser } = require('./setup');
const razorpayConfig = require('../config/razorpay');

describe('Task 3: Pending Order & Inventory Safety Isolation Tests', () => {
  let user;
  let token;
  let category;
  let product;
  let address;
  const initialStock = 10;

  beforeEach(async () => {
    const auth = await createTestUser();
    user = auth.user;
    token = auth.token;

    category = await Category.create({
      name: `Category-${Date.now()}-${Math.random()}`,
      slug: `category-${Date.now()}-${Math.random()}`,
    });

    product = await Product.create({
      name: 'Fresh Mangoes',
      slug: `fresh-mangoes-${Date.now()}-${Math.random()}`,
      category: category._id,
      unit: '1 kg',
      originalPrice: 100,
      sellingPrice: 80,
      stock: initialStock,
      isActive: true,
      availabilityStatus: 'available',
    });

    address = await Address.create({
      user: user._id,
      fullName: 'Safety Tester',
      phone: '9999912345',
      houseNumber: '10',
      street: 'Safety Road',
      city: 'Delhi',
      state: 'Delhi',
      pinCode: '110001',
      isDefault: true,
    });

    jest.spyOn(razorpayConfig, 'getRazorpay').mockReturnValue({
      orders: {
        create: jest.fn().mockImplementation((opts) =>
          Promise.resolve({
            id: `order_mock_${Date.now()}`,
            amount: opts.amount,
            currency: opts.currency,
          })
        ),
      },
    });
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    await Order.deleteMany({});
    await Cart.deleteMany({});
    await Address.deleteMany({});
    await Product.deleteMany({});
    await Category.deleteMany({});
  });

  it('Scenario 1 & 3: Customer creates online order, closes checkout, and never retries -> stock remains reserved indefinitely', async () => {
    // 1. Add 2 units to cart
    await request(app)
      .post('/api/cart/items')
      .set('Authorization', `Bearer ${token}`)
      .send({ productId: product._id, quantity: 2 });

    // 2. Place online order
    const orderRes = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({ addressId: address._id, paymentMethod: 'online' });

    expect(orderRes.status).toBe(201);
    const orderId = orderRes.body.data.order._id;

    // Stock was deducted upon order placement: 10 - 2 = 8
    let prod = await Product.findById(product._id);
    expect(prod.stock).toBe(8);

    // Customer opens modal (creates razorpay order) then closes/abandons it
    await request(app)
      .post('/api/payments/create-order')
      .set('Authorization', `Bearer ${token}`)
      .send({ orderId });

    // Check database state after customer leaves
    const abandonedOrder = await Order.findById(orderId);
    expect(abandonedOrder.paymentStatus).toBe('pending');
    expect(abandonedOrder.fulfillmentStatus).toBe('placed');

    // Finding: Because no auto-expiry cron exists, stock remains 8 indefinitely
    prod = await Product.findById(product._id);
    expect(prod.stock).toBe(8);
  });

  it('Scenario 2: Customer payment fails -> order marked failed, stock remains reserved for retry', async () => {
    await request(app)
      .post('/api/cart/items')
      .set('Authorization', `Bearer ${token}`)
      .send({ productId: product._id, quantity: 3 });

    const orderRes = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({ addressId: address._id, paymentMethod: 'online' });

    const orderId = orderRes.body.data.order._id;

    const rzpRes = await request(app)
      .post('/api/payments/create-order')
      .set('Authorization', `Bearer ${token}`)
      .send({ orderId });

    const razorpayOrderId = rzpRes.body.data.razorpayOrderId;

    // Razorpay sends payment.failed webhook
    const failPayload = {
      id: `evt_fail_${Date.now()}`,
      event: 'payment.failed',
      payload: {
        payment: {
          entity: {
            id: 'pay_failed_test_123',
            order_id: razorpayOrderId,
            status: 'failed',
          },
        },
      },
    };

    const rawPayload = JSON.stringify(failPayload);
    const sig = crypto
      .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
      .update(rawPayload)
      .digest('hex');

    const webhookRes = await request(app)
      .post('/api/payments/webhook')
      .set('x-razorpay-signature', sig)
      .set('Content-Type', 'application/json')
      .send(rawPayload);

    expect(webhookRes.status).toBe(200);

    const order = await Order.findById(orderId);
    expect(order.paymentStatus).toBe('failed');
    expect(order.fulfillmentStatus).toBe('placed'); // Not confirmed

    // Stock is STILL 7 (not released and not double-deducted)
    const prod = await Product.findById(product._id);
    expect(prod.stock).toBe(7);
  });

  it('Scenario 4: Customer retries payment successfully -> confirmed, stock NOT deducted again', async () => {
    await request(app)
      .post('/api/cart/items')
      .set('Authorization', `Bearer ${token}`)
      .send({ productId: product._id, quantity: 2 });

    const orderRes = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({ addressId: address._id, paymentMethod: 'online' });

    const orderId = orderRes.body.data.order._id;

    // Initial stock after order: 10 - 2 = 8
    expect((await Product.findById(product._id)).stock).toBe(8);

    // Initial payment attempt fails
    const initialOrder = await Order.findById(orderId);
    initialOrder.paymentStatus = 'failed';
    await initialOrder.save();

    // Customer clicks "Pay Now" / retry: calls create-order for the SAME orderId
    const retryRes = await request(app)
      .post('/api/payments/create-order')
      .set('Authorization', `Bearer ${token}`)
      .send({ orderId });

    expect(retryRes.status).toBe(200);
    const newRzpOrderId = retryRes.body.data.razorpayOrderId;

    // Payment succeeds, verify endpoint called
    const payId = 'pay_retry_success_999';
    const sig = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${newRzpOrderId}|${payId}`)
      .digest('hex');

    const verifyRes = await request(app)
      .post('/api/payments/verify')
      .set('Authorization', `Bearer ${token}`)
      .send({
        orderId,
        razorpay_order_id: newRzpOrderId,
        razorpay_payment_id: payId,
        razorpay_signature: sig,
      });

    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.data.order.paymentStatus).toBe('paid');
    expect(verifyRes.body.data.order.fulfillmentStatus).toBe('confirmed');

    // CRITICAL: Verify stock is STILL 8 (NOT deducted again to 6!)
    const prodAfterRetry = await Product.findById(product._id);
    expect(prodAfterRetry.stock).toBe(8);
  });

  it('Scenario 5: Customer cancels pending order -> stock restored, duplicate cancel rejected without double restoration', async () => {
    await request(app)
      .post('/api/cart/items')
      .set('Authorization', `Bearer ${token}`)
      .send({ productId: product._id, quantity: 4 });

    const orderRes = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({ addressId: address._id, paymentMethod: 'online' });

    const orderId = orderRes.body.data.order._id;

    // Stock is 10 - 4 = 6
    expect((await Product.findById(product._id)).stock).toBe(6);

    // 1st Cancellation
    const cancelRes1 = await request(app)
      .patch(`/api/orders/${orderId}/cancel`)
      .set('Authorization', `Bearer ${token}`)
      .send({ cancellationReason: 'Changed mind' });

    expect(cancelRes1.status).toBe(200);
    expect(cancelRes1.body.data.order.fulfillmentStatus).toBe('cancelled');

    // Stock restored back to 10
    expect((await Product.findById(product._id)).stock).toBe(10);

    // 2nd Cancellation Attempt (Duplicate cancel)
    const cancelRes2 = await request(app)
      .patch(`/api/orders/${orderId}/cancel`)
      .set('Authorization', `Bearer ${token}`)
      .send({ cancellationReason: 'Try cancel again' });

    expect(cancelRes2.status).toBe(400);
    expect(cancelRes2.body.message).toMatch(/cannot be cancelled in "cancelled" status/i);

    // CRITICAL: Stock is STILL 10 (NOT restored again to 14!)
    expect((await Product.findById(product._id)).stock).toBe(10);
  });
});

