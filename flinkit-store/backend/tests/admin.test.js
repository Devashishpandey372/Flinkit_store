const request = require('supertest');
const app = require('../app');
const Product = require('../models/Product');
const Category = require('../models/Category');
const Order = require('../models/Order');
const User = require('../models/User');
const { createTestUser, createTestAdmin } = require('./setup');

describe('Admin API Endpoints', () => {
  let admin;
  let adminToken;
  let user;
  let userToken;
  let category;
  let product;

  beforeEach(async () => {
    const adminAuth = await createTestAdmin();
    admin = adminAuth.admin;
    adminToken = adminAuth.token;

    const userAuth = await createTestUser();
    user = userAuth.user;
    userToken = userAuth.token;

    category = await Category.create({
      name: `Category-${Date.now()}-${Math.random()}`,
      slug: `cat-${Date.now()}-${Math.random()}`,
    });

    product = await Product.create({
      name: 'Admin Test Apple',
      slug: `admin-apple-${Date.now()}-${Math.random()}`,
      category: category._id,
      unit: '1 kg',
      originalPrice: 100,
      sellingPrice: 80,
      stock: 50,
      isActive: true,
    });
  });

  afterEach(async () => {
    await Order.deleteMany({});
    await Product.deleteMany({});
    await Category.deleteMany({});
    await User.deleteMany({});
  });

  it('GET /api/admin/dashboard - should reject non-admin users with 403', async () => {
    const res = await request(app)
      .get('/api/admin/dashboard')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('GET /api/admin/dashboard - should return dashboard metrics for admin', async () => {
    // Create a paid order
    await Order.create({
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
        city: 'Delhi',
      },
      subtotal: 160,
      deliveryFee: 40,
      totalAmount: 200,
      paymentMethod: 'online',
      paymentStatus: 'paid',
      fulfillmentStatus: 'confirmed',
    });

    const res = await request(app)
      .get('/api/admin/dashboard')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.totalRevenue).toBe(200);
    expect(res.body.data.totalOrders).toBe(1);
    expect(res.body.data.totalProducts).toBeGreaterThanOrEqual(1);
  });

  it('POST /api/admin/products - should create a new product', async () => {
    const res = await request(app)
      .post('/api/admin/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Fresh Mangoes',
        category: category._id,
        unit: '1 kg',
        originalPrice: 120,
        sellingPrice: 99,
        stock: 30,
        isFeatured: true,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.product.name).toBe('Fresh Mangoes');
    expect(res.body.data.product.slug).toMatch(/^fresh-mangoes/);
  });

  it('PATCH /api/admin/products/:id - should update product details', async () => {
    const res = await request(app)
      .patch(`/api/admin/products/${product._id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ sellingPrice: 75, stock: 45 });

    expect(res.status).toBe(200);
    expect(res.body.data.product.sellingPrice).toBe(75);
    expect(res.body.data.product.stock).toBe(45);
  });

  it('DELETE /api/admin/products/:id - should deactivate product', async () => {
    const res = await request(app)
      .delete(`/api/admin/products/${product._id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/deactivated/i);

    const updated = await Product.findById(product._id);
    expect(updated.isActive).toBe(false);
  });

  it('PATCH /api/admin/orders/:id/status - should update fulfillment status and enforce transitions', async () => {
    const order = await Order.create({
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
      deliveryAddress: { fullName: 'Dev User', phone: '9876543210', city: 'Delhi' },
      subtotal: 160,
      totalAmount: 200,
      paymentMethod: 'cod',
      paymentStatus: 'pending',
      fulfillmentStatus: 'placed',
    });

    // Valid transition: placed -> confirmed
    const res = await request(app)
      .patch(`/api/admin/orders/${order._id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ fulfillmentStatus: 'confirmed' });

    expect(res.status).toBe(200);
    expect(res.body.data.order.fulfillmentStatus).toBe('confirmed');

    // Invalid transition: confirmed -> delivered directly
    const invalidRes = await request(app)
      .patch(`/api/admin/orders/${order._id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ fulfillmentStatus: 'delivered' });

    expect(invalidRes.status).toBe(400);
  });

  it('PATCH /api/admin/users/:id/toggle-active - should toggle user active status', async () => {
    const res = await request(app)
      .patch(`/api/admin/users/${user._id}/toggle-active`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.user.isActive).toBe(false);

    // Toggle back
    const res2 = await request(app)
      .patch(`/api/admin/users/${user._id}/toggle-active`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res2.status).toBe(200);
    expect(res2.body.data.user.isActive).toBe(true);
  });

  it('Admin categories CRUD - should create, update, and deactivate category', async () => {
    // Create
    const createRes = await request(app)
      .post('/api/admin/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Exotic Drinks', description: 'Gourmet sodas' });

    expect(createRes.status).toBe(201);
    const catId = createRes.body.data.category._id;

    // Update
    const updateRes = await request(app)
      .patch(`/api/admin/categories/${catId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ description: 'Updated gourmet sodas' });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.category.description).toBe('Updated gourmet sodas');

    // Deactivate
    const deleteRes = await request(app)
      .delete(`/api/admin/categories/${catId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(deleteRes.status).toBe(200);
    const updatedCat = await Category.findById(catId);
    expect(updatedCat.isActive).toBe(false);
  });
});

