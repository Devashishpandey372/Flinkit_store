const request = require('supertest');
const crypto = require('crypto');
const mongoose = require('mongoose');
const app = require('../app');
const Product = require('../models/Product');
const Category = require('../models/Category');
const Cart = require('../models/Cart');
const Address = require('../models/Address');
const Order = require('../models/Order');
const { createTestUser } = require('./setup');
const { cleanupExpiredOrders } = require('../services/orderExpiryService');

describe('Task 1 & 2: Atomic Inventory Deduction & Order Expiry Safety Tests', () => {
  let user1, token1, address1;
  let user2, token2, address2;
  let category;

  beforeEach(async () => {
    const auth1 = await createTestUser();
    user1 = auth1.user;
    token1 = auth1.token;

    const auth2 = await createTestUser();
    user2 = auth2.user;
    token2 = auth2.token;

    category = await Category.create({
      name: `Category-${Date.now()}-${Math.random()}`,
      slug: `cat-${Date.now()}-${Math.random()}`,
    });

    address1 = await Address.create({
      user: user1._id,
      fullName: 'Buyer One',
      phone: '9876543210',
      houseNumber: '1',
      street: 'Race St',
      city: 'Delhi',
      state: 'Delhi',
      pinCode: '110001',
    });

    address2 = await Address.create({
      user: user2._id,
      fullName: 'Buyer Two',
      phone: '9876543211',
      houseNumber: '2',
      street: 'Race St',
      city: 'Delhi',
      state: 'Delhi',
      pinCode: '110001',
    });
  });

  afterEach(async () => {
    await Order.deleteMany({});
    await Cart.deleteMany({});
    await Product.deleteMany({});
    await Category.deleteMany({});
    await Address.deleteMany({});
  });

  test('1. Prevents negative stock under concurrent purchase race conditions (Last Unit Race)', async () => {
    // Only 1 unit in stock
    const singleProduct = await Product.create({
      name: 'Rare Item',
      slug: `rare-item-${Date.now()}`,
      category: category._id,
      unit: '1 pc',
      originalPrice: 500,
      sellingPrice: 500,
      stock: 1,
      isActive: true,
      availabilityStatus: 'available',
    });

    // Both user1 and user2 add the last unit to their cart
    await Cart.create({
      user: user1._id,
      items: [{ product: singleProduct._id, quantity: 1, price: 500 }],
    });

    await Cart.create({
      user: user2._id,
      items: [{ product: singleProduct._id, quantity: 1, price: 500 }],
    });

    // Simultaneous checkout
    const [res1, res2] = await Promise.all([
      request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${token1}`)
        .send({ addressId: address1._id, paymentMethod: 'online' }),
      request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${token2}`)
        .send({ addressId: address2._id, paymentMethod: 'online' }),
    ]);

    const statuses = [res1.status, res2.status].sort();
    expect(statuses).toEqual([201, 400]);

    // Check inventory in DB: must be exactly 0, NEVER negative
    const updatedProduct = await Product.findById(singleProduct._id);
    expect(updatedProduct.stock).toBe(0);

    // Exactly one order was created
    const totalOrders = await Order.countDocuments();
    expect(totalOrders).toBe(1);
  });

  test('2. Multi-item cart rollback: restores deducted stock if subsequent item is out of stock', async () => {
    const productA = await Product.create({
      name: 'Product A (In Stock)',
      slug: `prod-a-${Date.now()}`,
      category: category._id,
      unit: '1 pc',
      originalPrice: 100,
      sellingPrice: 100,
      stock: 5,
      isActive: true,
      availabilityStatus: 'available',
    });

    const productB = await Product.create({
      name: 'Product B (Out of Stock)',
      slug: `prod-b-${Date.now()}`,
      category: category._id,
      unit: '1 pc',
      originalPrice: 200,
      sellingPrice: 200,
      stock: 0,
      isActive: true,
      availabilityStatus: 'available',
    });

    // Cart contains 2 of A and 1 of B
    await Cart.create({
      user: user1._id,
      items: [
        { product: productA._id, quantity: 2, price: 100 },
        { product: productB._id, quantity: 1, price: 200 },
      ],
    });

    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token1}`)
      .send({ addressId: address1._id, paymentMethod: 'online' });

    expect(res.status).toBe(400);

    // Product A stock must remain 5 (compensating rollback restored the 2 units)
    const checkProductA = await Product.findById(productA._id);
    expect(checkProductA.stock).toBe(5);

    // Product B stock remains 0
    const checkProductB = await Product.findById(productB._id);
    expect(checkProductB.stock).toBe(0);

    // Zero orders created
    const orderCount = await Order.countDocuments();
    expect(orderCount).toBe(0);
  });

  test('3. Abandoned online order auto-expiry releases reserved stock back to inventory', async () => {
    const product = await Product.create({
      name: 'Apples',
      slug: `apples-${Date.now()}`,
      category: category._id,
      unit: '1 kg',
      originalPrice: 120,
      sellingPrice: 100,
      stock: 10,
      isActive: true,
      availabilityStatus: 'available',
    });

    // User creates order for 3 kg (stock goes 10 -> 7)
    await Cart.create({
      user: user1._id,
      items: [{ product: product._id, quantity: 3, price: 100 }],
    });

    const createRes = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token1}`)
      .send({ addressId: address1._id, paymentMethod: 'online' });

    expect(createRes.status).toBe(201);
    const orderId = createRes.body.data.order._id;

    // Verify stock is reserved
    let currentProd = await Product.findById(product._id);
    expect(currentProd.stock).toBe(7);

    // Manually age order past cutoff (35 minutes ago)
    const pastDate = new Date(Date.now() - 35 * 60 * 1000);
    await Order.collection.updateOne(
      { _id: new mongoose.Types.ObjectId(orderId) },
      { $set: { createdAt: pastDate } }
    );

    // Run expiration cleanup with 30 min window
    const result = await cleanupExpiredOrders(30);
    expect(result.expiredCount).toBe(1);
    expect(result.orderIds).toContain(orderId.toString());

    // Verify order status in DB
    const expiredOrder = await Order.findById(orderId);
    expect(expiredOrder.fulfillmentStatus).toBe('cancelled');
    expect(expiredOrder.isStockRestored).toBe(true);
    expect(expiredOrder.expiredAt).toBeDefined();

    // Verify stock restored back to 10
    currentProd = await Product.findById(product._id);
    expect(currentProd.stock).toBe(10);
  });

  test('4. Idempotency: duplicate expiry sweeps do not double-restore stock', async () => {
    const product = await Product.create({
      name: 'Bananas',
      slug: `bananas-${Date.now()}`,
      category: category._id,
      unit: '1 dozen',
      originalPrice: 60,
      sellingPrice: 50,
      stock: 5,
      isActive: true,
      availabilityStatus: 'available',
    });

    // Create order for 2 dozen (stock -> 3)
    await Cart.create({
      user: user1._id,
      items: [{ product: product._id, quantity: 2, price: 50 }],
    });

    const createRes = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token1}`)
      .send({ addressId: address1._id, paymentMethod: 'online' });

    const orderId = createRes.body.data.order._id;
    await Order.collection.updateOne(
      { _id: new mongoose.Types.ObjectId(orderId) },
      { $set: { createdAt: new Date(Date.now() - 40 * 60 * 1000) } }
    );

    // First sweep
    const sweep1 = await cleanupExpiredOrders(30);
    expect(sweep1.expiredCount).toBe(1);

    const stockAfterSweep1 = (await Product.findById(product._id)).stock;
    expect(stockAfterSweep1).toBe(5);

    // Second sweep immediately afterwards
    const sweep2 = await cleanupExpiredOrders(30);
    expect(sweep2.expiredCount).toBe(0);

    // Stock MUST still be 5, NOT 7!
    const stockAfterSweep2 = (await Product.findById(product._id)).stock;
    expect(stockAfterSweep2).toBe(5);
  });

  test('5. Concurrency-safe cancellation: simultaneous cancel calls restore stock only once', async () => {
    const product = await Product.create({
      name: 'Tomatoes',
      slug: `tomatoes-${Date.now()}`,
      category: category._id,
      unit: '1 kg',
      originalPrice: 40,
      sellingPrice: 40,
      stock: 10,
      isActive: true,
      availabilityStatus: 'available',
    });

    // Create order for 4 kg (stock -> 6)
    await Cart.create({
      user: user1._id,
      items: [{ product: product._id, quantity: 4, price: 40 }],
    });

    const createRes = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token1}`)
      .send({ addressId: address1._id, paymentMethod: 'online' });

    const orderId = createRes.body.data.order._id;
    expect((await Product.findById(product._id)).stock).toBe(6);

    // Fire two simultaneous cancellations for the same order
    const [cancel1, cancel2] = await Promise.all([
      request(app)
        .patch(`/api/orders/${orderId}/cancel`)
        .set('Authorization', `Bearer ${token1}`)
        .send({ cancellationReason: 'Changed my mind' }),
      request(app)
        .patch(`/api/orders/${orderId}/cancel`)
        .set('Authorization', `Bearer ${token1}`)
        .send({ cancellationReason: 'Double click cancel' }),
    ]);

    const statuses = [cancel1.status, cancel2.status].sort();
    expect(statuses).toEqual([200, 400]);

    // Final stock MUST be 10 (restored by 4 once), NEVER 14
    const finalProduct = await Product.findById(product._id);
    expect(finalProduct.stock).toBe(10);

    const cancelledOrder = await Order.findById(orderId);
    expect(cancelledOrder.isStockRestored).toBe(true);
    expect(cancelledOrder.fulfillmentStatus).toBe('cancelled');
  });

  test('6. Late payment webhook on expired order: records payment and flags reconciliation without double-deduction or fulfillment', async () => {
    const product = await Product.create({
      name: 'Milk',
      slug: `milk-${Date.now()}`,
      category: category._id,
      unit: '1 L',
      originalPrice: 60,
      sellingPrice: 60,
      stock: 10,
      isActive: true,
      availabilityStatus: 'available',
    });

    // Create order for 2 liters (stock -> 8)
    await Cart.create({
      user: user1._id,
      items: [{ product: product._id, quantity: 2, price: 60 }],
    });

    const createRes = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token1}`)
      .send({ addressId: address1._id, paymentMethod: 'online' });

    const orderId = createRes.body.data.order._id;
    const totalAmount = createRes.body.data.order.totalAmount;
    const razorpayOrderId = 'order_late_webhook_test';
    await Order.findByIdAndUpdate(orderId, { razorpayOrderId });

    // Order expires and stock is restored to 10
    await Order.collection.updateOne(
      { _id: new mongoose.Types.ObjectId(orderId) },
      { $set: { createdAt: new Date(Date.now() - 45 * 60 * 1000) } }
    );
    await cleanupExpiredOrders(30);

    expect((await Product.findById(product._id)).stock).toBe(10);
    expect((await Order.findById(orderId)).fulfillmentStatus).toBe('cancelled');

    // Late Razorpay webhook arrives (payment.captured)
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const webhookEventId = `evt_late_${Date.now()}`;
    const payload = {
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: 'pay_late_123',
            order_id: razorpayOrderId,
            amount: Math.round(totalAmount * 100),
            currency: 'INR',
            status: 'captured',
            notes: { orderId: orderId.toString() },
          },
        },
      },
    };

    const rawBody = JSON.stringify(payload);
    const signature = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');

    const webhookRes = await request(app)
      .post('/api/payments/webhook')
      .set('x-razorpay-signature', signature)
      .set('x-razorpay-event-id', webhookEventId)
      .set('Content-Type', 'application/json')
      .send(rawBody);

    expect(webhookRes.status).toBe(200);
    expect(webhookRes.body.reconciliation).toBe(true);

    // Verify order in DB:
    const updatedOrder = await Order.findById(orderId);
    expect(updatedOrder.paymentStatus).toBe('paid');
    expect(updatedOrder.fulfillmentStatus).toBe('cancelled'); // Remains cancelled!
    expect(updatedOrder.needsReconciliation).toBe(true);
    expect(updatedOrder.reconciliationReason).toContain('Payment captured after order was cancelled or expired');
    expect(updatedOrder.razorpayPaymentId).toBe('pay_late_123');

    // Stock must NOT be deducted again (remains 10)
    expect((await Product.findById(product._id)).stock).toBe(10);
  });

  test('7. Late payment verification on expired order: records payment and flags reconciliation', async () => {
    const product = await Product.create({
      name: 'Paneer',
      slug: `paneer-${Date.now()}`,
      category: category._id,
      unit: '200g',
      originalPrice: 90,
      sellingPrice: 90,
      stock: 5,
      isActive: true,
      availabilityStatus: 'available',
    });

    await Cart.create({
      user: user1._id,
      items: [{ product: product._id, quantity: 1, price: 90 }],
    });

    const createRes = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token1}`)
      .send({ addressId: address1._id, paymentMethod: 'online' });

    const orderId = createRes.body.data.order._id;
    const rzpOrderId = 'order_verify_late_test';
    await Order.findByIdAndUpdate(orderId, { razorpayOrderId: rzpOrderId });
    await Order.collection.updateOne(
      { _id: new mongoose.Types.ObjectId(orderId) },
      { $set: { createdAt: new Date(Date.now() - 50 * 60 * 1000) } }
    );

    // Sweep expires order
    await cleanupExpiredOrders(30);

    // Customer verify request arrives
    const rzpPaymentId = 'pay_verify_late_456';
    const sig = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${rzpOrderId}|${rzpPaymentId}`)
      .digest('hex');

    const verifyRes = await request(app)
      .post('/api/payments/verify')
      .set('Authorization', `Bearer ${token1}`)
      .send({
        orderId,
        razorpay_order_id: rzpOrderId,
        razorpay_payment_id: rzpPaymentId,
        razorpay_signature: sig,
      });

    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.reconciliation).toBe(true);

    const verifiedOrder = await Order.findById(orderId);
    expect(verifiedOrder.paymentStatus).toBe('paid');
    expect(verifiedOrder.fulfillmentStatus).toBe('cancelled');
    expect(verifiedOrder.needsReconciliation).toBe(true);
    expect(verifiedOrder.reconciliationReason).toContain('Payment captured after order was cancelled or expired');
  });
});
