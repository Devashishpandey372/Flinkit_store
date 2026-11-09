const request = require('supertest');
const app = require('../app');
const Product = require('../models/Product');
const Category = require('../models/Category');
const Cart = require('../models/Cart');
const { createTestUser } = require('./setup');

describe('Cart API Endpoints', () => {
  let user;
  let token;
  let category;
  let product;

  beforeEach(async () => {
    const auth = await createTestUser();
    user = auth.user;
    token = auth.token;

    category = await Category.create({
      name: `Category-${Date.now()}-${Math.random()}`,
      slug: `category-${Date.now()}-${Math.random()}`,
    });

    product = await Product.create({
      name: 'Test Milk',
      slug: `test-milk-${Date.now()}-${Math.random()}`,
      category: category._id,
      unit: '1 L',
      originalPrice: 60,
      sellingPrice: 50,
      stock: 10,
      isActive: true,
    });
  });

  afterEach(async () => {
    await Cart.deleteMany({});
    await Product.deleteMany({});
    await Category.deleteMany({});
  });

  it('GET /api/cart - should return empty cart for new user', async () => {
    const res = await request(app)
      .get('/api/cart')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.cart.items).toEqual([]);
  });

  it('POST /api/cart/items - should add an item to cart', async () => {
    const res = await request(app)
      .post('/api/cart/items')
      .set('Authorization', `Bearer ${token}`)
      .send({ productId: product._id, quantity: 2 });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.cart.items.length).toBe(1);
    expect(res.body.data.cart.items[0].quantity).toBe(2);
    expect(res.body.data.cart.items[0].product._id.toString()).toBe(product._id.toString());
  });

  it('POST /api/cart/items - should reject adding more than stock', async () => {
    const res = await request(app)
      .post('/api/cart/items')
      .set('Authorization', `Bearer ${token}`)
      .send({ productId: product._id, quantity: 15 });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/available/i);
  });

  it('PATCH /api/cart/items/:id - should update quantity', async () => {
    // Add item first
    await request(app)
      .post('/api/cart/items')
      .set('Authorization', `Bearer ${token}`)
      .send({ productId: product._id, quantity: 2 });

    const res = await request(app)
      .patch(`/api/cart/items/${product._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ quantity: 5 });

    expect(res.status).toBe(200);
    expect(res.body.data.cart.items[0].quantity).toBe(5);
  });

  it('DELETE /api/cart/items/:id - should remove item from cart', async () => {
    await request(app)
      .post('/api/cart/items')
      .set('Authorization', `Bearer ${token}`)
      .send({ productId: product._id, quantity: 2 });

    const res = await request(app)
      .delete(`/api/cart/items/${product._id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.cart.items.length).toBe(0);
  });

  it('DELETE /api/cart/clear - should clear all items in cart', async () => {
    await request(app)
      .post('/api/cart/items')
      .set('Authorization', `Bearer ${token}`)
      .send({ productId: product._id, quantity: 2 });

    const res = await request(app)
      .delete('/api/cart/clear')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const getRes = await request(app)
      .get('/api/cart')
      .set('Authorization', `Bearer ${token}`);
    expect(getRes.body.data.cart.items.length).toBe(0);
  });
});

