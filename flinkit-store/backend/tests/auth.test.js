const request = require('supertest');
const app = require('../app');
const User = require('../models/User');
const { createTestUser } = require('./setup');

describe('Auth API Endpoints', () => {
  afterEach(async () => {
    await User.deleteMany({});
  });

  it('POST /api/auth/signup - should register a new user', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send({
        name: 'John Doe',
        email: 'john@example.com',
        phone: '9876543210',
        password: 'Password123!',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.name).toBe('John Doe');
    expect(res.body.data.user.role).toBe('user');
    expect(res.body.data.token).toBeDefined();
  });

  it('POST /api/auth/signup - should reject duplicate email', async () => {
    await createTestUser({ email: 'duplicate@example.com' });

    const res = await request(app)
      .post('/api/auth/signup')
      .send({
        name: 'Another User',
        email: 'duplicate@example.com',
        phone: '9876543211',
        password: 'Password123!',
      });

    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/already registered/i);
  });

  it('POST /api/auth/login - should authenticate valid user', async () => {
    await request(app)
      .post('/api/auth/signup')
      .send({
        name: 'Alice Smith',
        email: 'alice@example.com',
        phone: '9876543212',
        password: 'Password123!',
      });

    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'alice@example.com',
        password: 'Password123!',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.name).toBe('Alice Smith');
  });

  it('POST /api/auth/login - should reject invalid password', async () => {
    await createTestUser({ email: 'bob@example.com' });

    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'bob@example.com',
        password: 'WrongPassword!',
      });

    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/invalid/i);
  });

  it('GET /api/auth/me - should return current user info', async () => {
    const { user, token } = await createTestUser();

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.user._id.toString()).toBe(user._id.toString());
  });

  it('POST /api/auth/logout - should clear cookie', async () => {
    const res = await request(app).post('/api/auth/logout');
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/logged out/i);
  });
});

