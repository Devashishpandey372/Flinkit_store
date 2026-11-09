const request = require('supertest');
const app = require('../app');
const Product = require('../models/Product');
const Category = require('../models/Category');
const Cart = require('../models/Cart');
const Address = require('../models/Address');
const Order = require('../models/Order');
const { createTestUser } = require('./setup');

describe('Order API Endpoints', () => {
  let user;
  let token;
  let category;
  let product;
  let address;

  beforeEach(async () => {
    const auth = await createTestUser();
    user = auth.user;
    token = auth.token;

    category = await Category.create({
      name: `Category-${Date.now()}-${Math.random()}`,
      slug: `category-${Date.now()}-${Math.random()}`,
    });

    product = await Product.create({
      name: 'Farm Eggs',
      slug: `farm-eggs-${Date.now()}-${Math.random()}`,
      category: category._id,
      unit: '6 pcs',
      originalPrice: 60,
      sellingPrice: 50,
      stock: 20,
      isActive: true,
    });

    address = await Address.create({
      user: user._id,
      fullName: 'Dev User',
      phone: '9876543210',
      houseNumber: '101',
      street: 'MG Road',
      landmark: 'Near Metro',
      city: 'Delhi',
      state: 'Delhi',
      pinCode: '110001',
      isDefault: true,
    });
  });

  afterEach(async () => {
    await Order.deleteMany({});
    await Cart.deleteMany({});
    await Address.deleteMany({});
    await Product.deleteMany({});
    await Category.deleteMany({});
  });

  it('POST /api/orders - should create an order from cart and deduct stock', async () => {
    // Add to cart
    await request(app)
      .post('/api/cart/items')
      .set('Authorization', `Bearer ${token}`)
      .send({ productId: product._id, quantity: 2 });

    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({
        addressId: address._id,
        paymentMethod: 'cod',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.order).toBeDefined();
    expect(res.body.data.order.items.length).toBe(1);
    expect(res.body.data.order.items[0].quantity).toBe(2);
    expect(res.body.data.order.subtotal).toBe(100);
    // subtotal < 499, deliveryFee should be 40
    expect(res.body.data.order.deliveryFee).toBe(40);
    expect(res.body.data.order.totalAmount).toBe(140);
    expect(res.body.data.order.fulfillmentStatus).toBe('placed');

    // Verify stock deducted
    const updatedProd = await Product.findById(product._id);
    expect(updatedProd.stock).toBe(18);

    // Verify cart cleared
    const cartRes = await request(app)
      .get('/api/cart')
      .set('Authorization', `Bearer ${token}`);
    expect(cartRes.body.data.cart.items.length).toBe(0);
  });

  it('POST /api/orders - should reject creating order if cart is empty', async () => {
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({
        addressId: address._id,
        paymentMethod: 'cod',
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/empty/i);
  });

  it('GET /api/orders/my-orders - should list user orders', async () => {
    await request(app)
      .post('/api/cart/items')
      .set('Authorization', `Bearer ${token}`)
      .send({ productId: product._id, quantity: 1 });

    await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({ addressId: address._id, paymentMethod: 'cod' });

    const res = await request(app)
      .get('/api/orders/my-orders')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.orders.length).toBe(1);
    expect(res.body.data.pagination.total).toBe(1);
  });

  it('GET /api/orders/:id - should get single order details', async () => {
    await request(app)
      .post('/api/cart/items')
      .set('Authorization', `Bearer ${token}`)
      .send({ productId: product._id, quantity: 1 });

    const createRes = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({ addressId: address._id, paymentMethod: 'cod' });

    const orderId = createRes.body.data.order._id;

    const res = await request(app)
      .get(`/api/orders/${orderId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.order._id.toString()).toBe(orderId);
  });

  it('PATCH /api/orders/:id/cancel - should cancel placed order and restore stock', async () => {
    await request(app)
      .post('/api/cart/items')
      .set('Authorization', `Bearer ${token}`)
      .send({ productId: product._id, quantity: 3 });

    const createRes = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({ addressId: address._id, paymentMethod: 'cod' });

    const orderId = createRes.body.data.order._id;

    // Check stock was deducted to 17
    let prod = await Product.findById(product._id);
    expect(prod.stock).toBe(17);

    // Cancel order
    const cancelRes = await request(app)
      .patch(`/api/orders/${orderId}/cancel`)
      .set('Authorization', `Bearer ${token}`)
      .send({ cancellationReason: 'Ordered by mistake' });

    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body.data.order.fulfillmentStatus).toBe('cancelled');

    // Check stock restored back to 20
    prod = await Product.findById(product._id);
    expect(prod.stock).toBe(20);
  });
});

