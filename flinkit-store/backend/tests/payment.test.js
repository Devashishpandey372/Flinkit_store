const crypto = require('crypto');
const request = require('supertest');
const app = require('../app');
const Product = require('../models/Product');
const Category = require('../models/Category');
const Order = require('../models/Order');
const Address = require('../models/Address');
const { createTestUser } = require('./setup');
const razorpayConfig = require('../config/razorpay');

describe('Payment API Endpoints', () => {
  let user;
  let token;
  let order;

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

    const product = await Product.create({
      name: 'Sample Drink',
      slug: `sample-drink-${Date.now()}-${Math.random()}`,
      category: category._id,
      unit: '500 ml',
      originalPrice: 50,
      sellingPrice: 40,
      stock: 10,
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
          quantity: 2,
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

  it('POST /api/payments/webhook - should handle payment.captured webhook', async () => {
    const razorpayOrderId = 'order_webhook_rzp_123';
    const razorpayPaymentId = 'pay_webhook_123';

    order.razorpayOrderId = razorpayOrderId;
    await order.save();

    const payload = {
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: razorpayPaymentId,
            order_id: razorpayOrderId,
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
  });
});
