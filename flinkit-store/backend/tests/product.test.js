const request = require('supertest');
const app = require('../app');
const Product = require('../models/Product');
const Category = require('../models/Category');
require('./setup');

describe('Product and Category API Endpoints', () => {
  let category;
  let product1;
  let product2;

  beforeEach(async () => {
    category = await Category.create({
      name: `Category-${Date.now()}-${Math.random()}`,
      slug: `cat-${Date.now()}-${Math.random()}`,
      sortOrder: 1,
      isActive: true,
    });

    product1 = await Product.create({
      name: 'Organic Milk',
      slug: `organic-milk-${Date.now()}-${Math.random()}`,
      category: category._id,
      unit: '1 L',
      originalPrice: 70,
      sellingPrice: 60,
      stock: 50,
      isFeatured: true,
      tags: ['dairy', 'milk'],
      isActive: true,
    });

    product2 = await Product.create({
      name: 'Whole Grain Bread',
      slug: `bread-${Date.now()}-${Math.random()}`,
      category: category._id,
      unit: '400 g',
      originalPrice: 45,
      sellingPrice: 40,
      stock: 30,
      isFeatured: false,
      tags: ['bakery', 'bread'],
      isActive: true,
    });
  });

  afterEach(async () => {
    await Product.deleteMany({});
    await Category.deleteMany({});
  });

  it('GET /api/categories - should list active categories', async () => {
    const res = await request(app).get('/api/categories');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.categories.length).toBeGreaterThanOrEqual(1);
  });

  it('GET /api/categories/:slug - should get category by slug', async () => {
    const res = await request(app).get(`/api/categories/${category.slug}`);
    expect(res.status).toBe(200);
    expect(res.body.data.category.name).toBe(category.name);
  });

  it('GET /api/products - should return list of products with pagination', async () => {
    const res = await request(app).get('/api/products');
    expect(res.status).toBe(200);
    expect(res.body.data.products.length).toBe(2);
    expect(res.body.data.pagination.total).toBe(2);
  });

  it('GET /api/products?featured=true - should filter featured products', async () => {
    const res = await request(app).get('/api/products?featured=true');
    expect(res.status).toBe(200);
    expect(res.body.data.products.length).toBe(1);
    expect(res.body.data.products[0].name).toBe('Organic Milk');
  });

  it('GET /api/products/:id - should return single product details', async () => {
    const res = await request(app).get(`/api/products/${product1._id}`);
    expect(res.status).toBe(200);
    expect(res.body.data.product.name).toBe('Organic Milk');
    expect(res.body.data.product.category.name).toBe(category.name);
  });
});

