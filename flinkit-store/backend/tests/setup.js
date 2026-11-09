const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const workerId = process.env.JEST_WORKER_ID || '1';
const TEST_DB_URI = process.env.TEST_MONGODB_URI || `mongodb://localhost:27017/flinkit-store-test-${workerId}`;

jest.setTimeout(15000);

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret_key_1234567890';
process.env.NODE_ENV = 'test';
process.env.RAZORPAY_KEY_ID = 'rzp_test_testkey';
process.env.RAZORPAY_KEY_SECRET = 'testsecretkey';
process.env.RAZORPAY_WEBHOOK_SECRET = 'testwebhooksecret';

beforeAll(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(TEST_DB_URI);
  }
});

afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  }
});

const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '1d' });
};

const createTestUser = async (overrides = {}) => {
  const email = `user_${Date.now()}_${Math.random().toString(36).substring(7)}@test.com`;
  const user = await User.create({
    name: 'Test User',
    email,
    phone: '9876543210',
    passwordHash: 'Password123!',
    role: 'user',
    ...overrides,
  });
  const token = generateToken(user._id);
  return { user, token };
};

const createTestAdmin = async (overrides = {}) => {
  const email = `admin_${Date.now()}_${Math.random().toString(36).substring(7)}@test.com`;
  const admin = await User.create({
    name: 'Test Admin',
    email,
    phone: '9876543211',
    passwordHash: 'AdminPassword123!',
    role: 'admin',
    ...overrides,
  });
  const token = generateToken(admin._id);
  return { admin, token };
};

module.exports = {
  createTestUser,
  createTestAdmin,
  generateToken,
};

