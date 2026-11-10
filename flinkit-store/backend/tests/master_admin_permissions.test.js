const request = require('supertest');
const app = require('../app');
const Product = require('../models/Product');
const Category = require('../models/Category');
const User = require('../models/User');
const { createTestUser, createTestAdmin } = require('./setup');

describe('Master Admin & Shopkeeper Permission System', () => {
  let category;

  beforeEach(async () => {
    category = await Category.create({
      name: `Taxonomy-${Date.now()}-${Math.random()}`,
      slug: `tax-${Date.now()}-${Math.random()}`,
    });
  });

  afterEach(async () => {
    await Product.deleteMany({});
    await Category.deleteMany({});
    await User.deleteMany({});
  });

  it('1. One-Time Master Admin Setup - allows initial setup once, then permanently blocks subsequent attempts', async () => {
    // Ensure no admin exists
    await User.deleteMany({ role: 'admin' });

    // Step A: Check setup status
    const statusBefore = await request(app).get('/api/admin/setup/status');
    expect(statusBefore.status).toBe(200);
    expect(statusBefore.body.data.isSetupRequired).toBe(true);

    // Step B: Initialize First Master Admin
    const initialSetupRes = await request(app)
      .post('/api/admin/setup/initial-admin')
      .send({
        name: 'The Master Admin',
        email: 'master.admin@flinkitstore.com',
        phone: '9876543210',
        password: 'MasterAdminPassword@2026',
      });

    expect(initialSetupRes.status).toBe(201);
    expect(initialSetupRes.body.success).toBe(true);
    expect(initialSetupRes.body.data.user.role).toBe('admin');
    expect(initialSetupRes.body.data.token).toBeDefined();

    // Step C: Verify status now shows setup completed
    const statusAfter = await request(app).get('/api/admin/setup/status');
    expect(statusAfter.status).toBe(200);
    expect(statusAfter.body.data.isSetupRequired).toBe(false);

    // Step D: Second attempt to setup initial admin must be strictly rejected with 403
    const secondSetupRes = await request(app)
      .post('/api/admin/setup/initial-admin')
      .send({
        name: 'Imposter Admin',
        email: 'imposter@test.com',
        phone: '9876543211',
        password: 'ImposterPassword@2026',
      });

    expect(secondSetupRes.status).toBe(403);
    expect(secondSetupRes.body.message).toMatch(/already been completed/i);
  });

  it('2. Public Registration strictly prevents privilege escalation - cannot create admin', async () => {
    // Attempting to register as admin or passing admin invite codes in public registration
    const publicRegRes = await request(app)
      .post('/api/admin/auth/register')
      .send({
        name: 'Sneaky User',
        shopName: 'Sneaky Shop',
        email: `sneaky_${Date.now()}@test.com`,
        phone: '9876501234',
        password: 'Password123!',
        shopAddress: 'Unknown Street',
        inviteCode: 'FLINKIT_ADMIN_SECRET_2026', // Trying to pass admin code
      });

    expect(publicRegRes.status).toBe(201);
    // Role MUST be shopkeeper, NEVER admin!
    expect(publicRegRes.body.data.user.role).toBe('shopkeeper');
  });

  it('3. Shopkeeper Lifecycle - Pending -> Approved -> Suspended -> Reactivated -> Deleted', async () => {
    const { admin, token: adminToken } = await createTestAdmin();

    // 1. Register shopkeeper without invite code (strictly pending)
    const skEmail = `raj_kirana_${Date.now()}@test.com`;
    const regRes = await request(app)
      .post('/api/admin/auth/register')
      .send({
        name: 'Rajesh Sharma',
        shopName: 'Raj Fresh Mart',
        email: skEmail,
        phone: '9811223344',
        password: 'Password123!',
        shopAddress: 'Sector 22, Noida',
      });

    expect(regRes.status).toBe(201);
    const shopkeeperId = regRes.body.data.user._id;

    // By default, manual registration requires Master Admin approval
    // Let's set approvalStatus to pending to verify gating
    await User.findByIdAndUpdate(shopkeeperId, {
      approvalStatus: 'pending',
      isApproved: false,
    });

    // 2. Pending shopkeeper login attempt must fail with 403
    const pendingLogin = await request(app)
      .post('/api/admin/auth/login')
      .send({
        email: skEmail,
        password: 'Password123!',
      });

    expect(pendingLogin.status).toBe(403);
    expect(pendingLogin.body.message).toMatch(/awaiting Master Admin approval/i);

    // 3. Master Admin approves the shopkeeper
    const approveRes = await request(app)
      .patch(`/api/admin/shopkeepers/${shopkeeperId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ action: 'approve' });

    expect(approveRes.status).toBe(200);
    expect(approveRes.body.data.shopkeeper.approvalStatus).toBe('approved');

    // 4. Approved shopkeeper can now log in
    const approvedLogin = await request(app)
      .post('/api/admin/auth/login')
      .send({
        email: skEmail,
        password: 'Password123!',
      });

    expect(approvedLogin.status).toBe(200);
    const shopkeeperToken = approvedLogin.body.data.token;

    // 5. Approved shopkeeper creates a product
    const prodRes = await request(app)
      .post('/api/admin/products')
      .set('Authorization', `Bearer ${shopkeeperToken}`)
      .send({
        name: 'Raj Pure Ghee',
        category: category._id,
        unit: '1 L',
        originalPrice: 650,
        sellingPrice: 590,
        stock: 20,
      });

    expect(prodRes.status).toBe(201);
    const prodId = prodRes.body.data.product._id;

    // Product is active on storefront
    let productInDb = await Product.findById(prodId);
    expect(productInDb.isActive).toBe(true);

    // 6. Master Admin suspends the shopkeeper
    const suspendRes = await request(app)
      .patch(`/api/admin/shopkeepers/${shopkeeperId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ action: 'suspend', reason: 'Failed quality audit' });

    expect(suspendRes.status).toBe(200);
    expect(suspendRes.body.data.shopkeeper.approvalStatus).toBe('suspended');

    // Suspended shopkeeper's products are automatically hidden from storefront
    productInDb = await Product.findById(prodId);
    expect(productInDb.isActive).toBe(false);

    // Suspended shopkeeper cannot log in
    const suspendedLogin = await request(app)
      .post('/api/admin/auth/login')
      .send({
        email: skEmail,
        password: 'Password123!',
      });

    expect(suspendedLogin.status).toBe(403);
    expect(suspendedLogin.body.message).toMatch(/suspended by the Master Admin/i);

    // 7. Master Admin reactivates the shopkeeper
    const reactivateRes = await request(app)
      .patch(`/api/admin/shopkeepers/${shopkeeperId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ action: 'reactivate' });

    expect(reactivateRes.status).toBe(200);
    expect(reactivateRes.body.data.shopkeeper.approvalStatus).toBe('approved');

    // Products are reactivated
    productInDb = await Product.findById(prodId);
    expect(productInDb.isActive).toBe(true);

    // 8. Master Admin deletes the shopkeeper
    const deleteRes = await request(app)
      .delete(`/api/admin/shopkeepers/${shopkeeperId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(deleteRes.status).toBe(200);
    const deletedUser = await User.findById(shopkeeperId);
    expect(deletedUser).toBeNull();
  });

  it('4. Master Admin has complete oversight across all products from all shops', async () => {
    const { token: adminToken } = await createTestAdmin();

    // Create 2 separate shopkeepers
    const sk1 = await User.create({
      name: 'Shopkeeper One',
      email: `sk1_${Date.now()}@test.com`,
      phone: '9811111111',
      passwordHash: 'Pass123!',
      role: 'shopkeeper',
      approvalStatus: 'approved',
      isApproved: true,
      shopName: 'Store 1',
    });
    const sk1Token = require('../controllers/adminController'); // use token generation
    const jwt = require('jsonwebtoken');
    const token1 = jwt.sign({ id: sk1._id }, process.env.JWT_SECRET);

    const sk2 = await User.create({
      name: 'Shopkeeper Two',
      email: `sk2_${Date.now()}@test.com`,
      phone: '9822222222',
      passwordHash: 'Pass123!',
      role: 'shopkeeper',
      approvalStatus: 'approved',
      isApproved: true,
      shopName: 'Store 2',
    });
    const token2 = jwt.sign({ id: sk2._id }, process.env.JWT_SECRET);

    // Shopkeeper 1 adds Product 1
    const prod1Res = await request(app)
      .post('/api/admin/products')
      .set('Authorization', `Bearer ${token1}`)
      .send({
        name: 'Item from Store 1',
        category: category._id,
        unit: '1 kg',
        originalPrice: 100,
        sellingPrice: 90,
        stock: 10,
      });
    const prod1Id = prod1Res.body.data.product._id;

    // Shopkeeper 2 adds Product 2
    const prod2Res = await request(app)
      .post('/api/admin/products')
      .set('Authorization', `Bearer ${token2}`)
      .send({
        name: 'Item from Store 2',
        category: category._id,
        unit: '2 kg',
        originalPrice: 200,
        sellingPrice: 180,
        stock: 20,
      });
    const prod2Id = prod2Res.body.data.product._id;

    // Master Admin views all products from all shops
    const adminProductsRes = await request(app)
      .get('/api/admin/products')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(adminProductsRes.status).toBe(200);
    const prodNames = adminProductsRes.body.data.products.map((p) => p.name);
    expect(prodNames).toContain('Item from Store 1');
    expect(prodNames).toContain('Item from Store 2');

    // Master Admin can edit Product 1 from Store 1
    const adminEdit = await request(app)
      .patch(`/api/admin/products/${prod1Id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ sellingPrice: 85 });
    expect(adminEdit.status).toBe(200);
    expect(adminEdit.body.data.product.sellingPrice).toBe(85);

    // Shopkeeper 2 CANNOT edit Product 1 from Store 1
    const unauthEdit = await request(app)
      .patch(`/api/admin/products/${prod1Id}`)
      .set('Authorization', `Bearer ${token2}`)
      .send({ sellingPrice: 50 });
    expect(unauthEdit.status).toBe(403);

    // Shopkeeper 1 CANNOT access Master Admin Shopkeepers API
    const skAccessAdminRoute = await request(app)
      .get('/api/admin/shopkeepers')
      .set('Authorization', `Bearer ${token1}`);
    expect(skAccessAdminRoute.status).toBe(403);
    expect(skAccessAdminRoute.body.message).toMatch(/Master Admin privileges required/i);
  });
});

