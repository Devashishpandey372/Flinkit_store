const request = require('supertest');
const app = require('../app');
const Product = require('../models/Product');
const Category = require('../models/Category');
const User = require('../models/User');
const { createTestUser, createTestAdmin } = require('./setup');

describe('Shopkeeper Authentication & Product Management', () => {
  let category;
  let shopkeeperUser;
  let shopkeeperToken;
  let adminToken;
  let normalUserToken;

  beforeEach(async () => {
    const adminAuth = await createTestAdmin();
    adminToken = adminAuth.token;

    const userAuth = await createTestUser();
    normalUserToken = userAuth.token;

    category = await Category.create({
      name: `Category-${Date.now()}-${Math.random()}`,
      slug: `cat-${Date.now()}-${Math.random()}`,
    });

    // Register a test shopkeeper
    const shopkeeperRes = await request(app)
      .post('/api/admin/auth/register')
      .send({
        name: 'Ramesh Gupta',
        shopName: 'Gupta Kirana Store',
        email: `ramesh_${Date.now()}_${Math.random().toString(36).substring(7)}@kirana.com`,
        phone: '9812345678',
        password: 'Password123!',
        shopAddress: 'Shop 12, Main Market, New Delhi',
        inviteCode: 'FLINKIT_SHOP_2026',
      });

    shopkeeperUser = shopkeeperRes.body.data.user;
    shopkeeperToken = shopkeeperRes.body.data.token;
  });

  afterEach(async () => {
    await Product.deleteMany({});
    await Category.deleteMany({});
    await User.deleteMany({});
  });

  it('POST /api/admin/auth/register - should register a new shopkeeper and reject duplicate email', async () => {
    const email = `test_shop_${Date.now()}@test.com`;
    const res = await request(app)
      .post('/api/admin/auth/register')
      .send({
        name: 'Suresh Kumar',
        shopName: 'Suresh Mart',
        email,
        phone: '9876501234',
        password: 'Password123!',
        shopAddress: '45 Green Park, New Delhi',
        inviteCode: 'FLINKIT_SHOP_2026',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.role).toBe('shopkeeper');
    expect(res.body.data.user.shopName).toBe('Suresh Mart');

    // Duplicate email
    const duplicateRes = await request(app)
      .post('/api/admin/auth/register')
      .send({
        name: 'Another User',
        shopName: 'Another Mart',
        email,
        phone: '9876501235',
        password: 'Password123!',
        shopAddress: 'Somewhere',
      });

    expect(duplicateRes.status).toBe(409);
  });

  it('POST /api/admin/auth/login - should log in shopkeeper and reject normal customers', async () => {
    const res = await request(app)
      .post('/api/admin/auth/login')
      .send({
        email: shopkeeperUser.email,
        password: 'Password123!',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.role).toBe('shopkeeper');

    // Normal customer trying to log into admin portal
    const customer = await User.create({
      name: 'Normal Customer',
      email: `cust_${Date.now()}@test.com`,
      phone: '9876543210',
      passwordHash: 'CustPass123!',
      role: 'user',
    });

    const custLoginRes = await request(app)
      .post('/api/admin/auth/login')
      .send({
        email: customer.email,
        password: 'CustPass123!',
      });

    expect(custLoginRes.status).toBe(403);
    expect(custLoginRes.body.message).toMatch(/Customer accounts cannot log in/i);
  });

  it('Shopkeeper Product Management - Add, Get My Products, Update, and Enforce Ownership', async () => {
    // 1. Create product as shopkeeper
    const createRes = await request(app)
      .post('/api/admin/products')
      .set('Authorization', `Bearer ${shopkeeperToken}`)
      .send({
        name: 'Gupta Special Basmati Rice',
        shortDescription: 'Long grain aromatic basmati rice',
        description: 'Authentic aged Indian Basmati rice for biryani.',
        category: category._id,
        brand: 'Gupta Foods',
        unit: '5 kg',
        originalPrice: 500,
        sellingPrice: 420,
        stock: 25,
        sku: 'RICE-BAS-5KG',
        availabilityStatus: 'available',
      });

    expect(createRes.status).toBe(201);
    const prodId = createRes.body.data.product._id;
    expect(createRes.body.data.product.shopkeeper.toString()).toBe(shopkeeperUser._id.toString());
    expect(createRes.body.data.product.discountPercent).toBe(16);

    // 2. Fetch my products as this shopkeeper
    const myProdsRes = await request(app)
      .get('/api/admin/products')
      .set('Authorization', `Bearer ${shopkeeperToken}`);

    expect(myProdsRes.status).toBe(200);
    expect(myProdsRes.body.data.products.length).toBe(1);
    expect(myProdsRes.body.data.products[0]._id).toBe(prodId);

    // 3. Register second shopkeeper
    const shopkeeper2Res = await request(app)
      .post('/api/admin/auth/register')
      .send({
        name: 'Anil Verma',
        shopName: 'Verma Supermarket',
        email: `anil_${Date.now()}@verma.com`,
        phone: '9811122233',
        password: 'Password123!',
        shopAddress: 'Sector 14, Gurgaon',
        inviteCode: 'FLINKIT_SHOP_2026',
      });
    const shopkeeper2Token = shopkeeper2Res.body.data.token;

    // 4. Second shopkeeper cannot see first shopkeeper's product in my products
    const shopkeeper2ProdsRes = await request(app)
      .get('/api/admin/products')
      .set('Authorization', `Bearer ${shopkeeper2Token}`);

    expect(shopkeeper2ProdsRes.body.data.products.length).toBe(0);

    // 5. Second shopkeeper cannot edit first shopkeeper's product (Ownership Enforcement)
    const unauthorizedEdit = await request(app)
      .patch(`/api/admin/products/${prodId}`)
      .set('Authorization', `Bearer ${shopkeeper2Token}`)
      .send({ sellingPrice: 300 });

    expect(unauthorizedEdit.status).toBe(403);
    expect(unauthorizedEdit.body.message).toMatch(/only update products belonging to your shop/i);

    // 6. First shopkeeper CAN update their product
    const authorizedEdit = await request(app)
      .patch(`/api/admin/products/${prodId}`)
      .set('Authorization', `Bearer ${shopkeeperToken}`)
      .send({ sellingPrice: 410, stock: 30 });

    expect(authorizedEdit.status).toBe(200);
    expect(authorizedEdit.body.data.product.sellingPrice).toBe(410);

    // 7. Update stock endpoint
    const stockRes = await request(app)
      .patch(`/api/admin/products/${prodId}/stock`)
      .set('Authorization', `Bearer ${shopkeeperToken}`)
      .send({ stock: 0 });

    expect(stockRes.status).toBe(200);
    expect(stockRes.body.data.product.stock).toBe(0);
    expect(stockRes.body.data.product.availabilityStatus).toBe('out_of_stock');

    // 8. Availability endpoint
    const availRes = await request(app)
      .patch(`/api/admin/products/${prodId}/availability`)
      .set('Authorization', `Bearer ${shopkeeperToken}`)
      .send({ availabilityStatus: 'available' });

    expect(availRes.status).toBe(200);
    expect(availRes.body.data.product.availabilityStatus).toBe('available');
  });

  it('Customer Storefront Integration - Products appear publicly and out of stock products cannot be added to cart', async () => {
    // Add available product
    const prodRes = await request(app)
      .post('/api/admin/products')
      .set('Authorization', `Bearer ${shopkeeperToken}`)
      .send({
        name: 'Organic Honey',
        category: category._id,
        unit: '500 g',
        originalPrice: 300,
        sellingPrice: 250,
        stock: 10,
        availabilityStatus: 'available',
      });
    const honeyId = prodRes.body.data.product._id;

    // Add out-of-stock product
    const oosRes = await request(app)
      .post('/api/admin/products')
      .set('Authorization', `Bearer ${shopkeeperToken}`)
      .send({
        name: 'Rare Saffron',
        category: category._id,
        unit: '1 g',
        originalPrice: 400,
        sellingPrice: 380,
        stock: 0,
        availabilityStatus: 'out_of_stock',
      });
    const saffronId = oosRes.body.data.product._id;

    // Public products API should list both active products
    const publicProds = await request(app).get('/api/products');
    expect(publicProds.status).toBe(200);
    const prodNames = publicProds.body.data.products.map((p) => p.name);
    expect(prodNames).toContain('Organic Honey');
    expect(prodNames).toContain('Rare Saffron');

    // Customer can add available honey to cart
    const addHoneyRes = await request(app)
      .post('/api/cart/items')
      .set('Authorization', `Bearer ${normalUserToken}`)
      .send({ productId: honeyId, quantity: 1 });

    expect(addHoneyRes.status).toBe(200);

    // Customer CANNOT add out-of-stock saffron to cart
    const addSaffronRes = await request(app)
      .post('/api/cart/items')
      .set('Authorization', `Bearer ${normalUserToken}`)
      .send({ productId: saffronId, quantity: 1 });

    expect(addSaffronRes.status).toBe(400);
    expect(addSaffronRes.body.message).toMatch(/out of stock/i);
  });
});

