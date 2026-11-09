/**
 * Admin seed script
 * Usage: node utils/seedAdmin.js
 * Configure ADMIN_* env variables in .env first
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

const seedAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const existing = await User.findOne({ email: process.env.ADMIN_EMAIL });
    if (existing) {
      if (existing.role === 'admin') {
        console.log('✅ Admin already exists:', existing.email);
      } else {
        existing.role = 'admin';
        existing.isActive = true;
        await existing.save();
        console.log('✅ Existing user promoted to admin:', existing.email);
      }
    } else {
      const admin = await User.create({
        name: process.env.ADMIN_NAME || 'Admin',
        email: process.env.ADMIN_EMAIL,
        phone: process.env.ADMIN_PHONE || '9999999999',
        passwordHash: process.env.ADMIN_PASSWORD,
        role: 'admin',
        isActive: true,
      });
      console.log('✅ Admin created:', admin.email);
      console.log('   Password:', process.env.ADMIN_PASSWORD);
      console.log('⚠️  Change this password immediately after first login!');
    }
  } catch (error) {
    console.error('❌ Error seeding admin:', error.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
};

seedAdmin();
