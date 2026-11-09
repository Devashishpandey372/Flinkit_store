const slugify = require('slugify');
const Product = require('../models/Product');
const Category = require('../models/Category');
const Order = require('../models/Order');
const User = require('../models/User');

// ─── Dashboard ────────────────────────────────────────────────

/**
 * GET /api/admin/dashboard
 */
const getDashboard = async (req, res, next) => {
  try {
    const [
      totalRevenue,
      totalOrders,
      totalCustomers,
      totalProducts,
      lowStockProducts,
      pendingOrders,
      recentOrders,
    ] = await Promise.all([
      Order.aggregate([
        { $match: { paymentStatus: 'paid' } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } },
      ]),
      Order.countDocuments(),
      User.countDocuments({ role: 'user' }),
      Product.countDocuments({ isActive: true }),
      Product.countDocuments({ stock: { $lte: 10 }, isActive: true }),
      Order.countDocuments({ fulfillmentStatus: 'placed' }),
      Order.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('user', 'name email')
        .lean(),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        totalRevenue: totalRevenue[0]?.total || 0,
        totalOrders,
        totalCustomers,
        totalProducts,
        lowStockProducts,
        pendingOrders,
        recentOrders,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─── Products ─────────────────────────────────────────────────

/**
 * GET /api/admin/products
 */
const adminGetProducts = async (req, res, next) => {
  try {
    const { search, category, page = 1, limit = 20, isActive } = req.query;
    const filter = {};

    if (search) filter.$text = { $search: search };
    if (category) filter.category = category;
    if (isActive !== undefined) filter.isActive = isActive === 'true';

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    const [products, total] = await Promise.all([
      Product.find(filter)
        .populate('category', 'name slug')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean({ virtuals: true }),
      Product.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: { products, pagination: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) } },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/admin/products
 */
const adminCreateProduct = async (req, res, next) => {
  try {
    const { name, description, category, image, unit, originalPrice, sellingPrice, stock, isFeatured, isActive, tags } = req.body;

    const slug = slugify(name, { lower: true, strict: true }) + '-' + Date.now();

    const product = await Product.create({
      name, slug, description, category, image, unit,
      originalPrice, sellingPrice, stock: stock || 0,
      isFeatured: isFeatured || false,
      isActive: isActive !== undefined ? isActive : true,
      tags: tags || [],
    });

    await product.populate('category', 'name slug');

    return res.status(201).json({ success: true, message: 'Product created.', data: { product } });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/admin/products/:id
 */
const adminUpdateProduct = async (req, res, next) => {
  try {
    const updates = { ...req.body };
    delete updates._id;
    delete updates.slug; // Slug should not change

    const product = await Product.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    }).populate('category', 'name slug');

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    return res.status(200).json({ success: true, message: 'Product updated.', data: { product } });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/admin/products/:id
 */
const adminDeleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    return res.status(200).json({ success: true, message: 'Product deactivated.' });
  } catch (error) {
    next(error);
  }
};

// ─── Orders ───────────────────────────────────────────────────

const ALLOWED_TRANSITIONS = {
  placed: ['confirmed', 'cancelled'],
  confirmed: ['packed', 'cancelled'],
  packed: ['out_for_delivery', 'cancelled'],
  out_for_delivery: ['delivered', 'cancelled'],
  delivered: [],
  cancelled: [],
};

/**
 * GET /api/admin/orders
 */
const adminGetOrders = async (req, res, next) => {
  try {
    const { status, paymentStatus, page = 1, limit = 20, dateFrom, dateTo } = req.query;
    const filter = {};

    if (status) filter.fulfillmentStatus = status;
    if (paymentStatus) filter.paymentStatus = paymentStatus;
    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
      if (dateTo) filter.createdAt.$lte = new Date(dateTo);
    }

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .populate('user', 'name email phone')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Order.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: { orders, pagination: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) } },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/admin/orders/:id/status
 */
const adminUpdateOrderStatus = async (req, res, next) => {
  try {
    const { fulfillmentStatus, cancellationReason } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    const allowed = ALLOWED_TRANSITIONS[order.fulfillmentStatus] || [];
    if (!allowed.includes(fulfillmentStatus)) {
      return res.status(400).json({
        success: false,
        message: `Cannot transition from "${order.fulfillmentStatus}" to "${fulfillmentStatus}".`,
      });
    }

    // Prevent marking unpaid online order as confirmed
    if (fulfillmentStatus === 'confirmed' && order.paymentMethod === 'online' && order.paymentStatus !== 'paid') {
      return res.status(400).json({
        success: false,
        message: 'Cannot confirm an unpaid online order.',
      });
    }

    order.fulfillmentStatus = fulfillmentStatus;

    if (fulfillmentStatus === 'delivered') {
      order.deliveredAt = new Date();
      if (order.paymentMethod === 'cod') order.paymentStatus = 'paid';
    }

    if (fulfillmentStatus === 'cancelled') {
      order.cancelledAt = new Date();
      if (cancellationReason) order.cancellationReason = cancellationReason;

      // Restore stock
      for (const item of order.items) {
        await Product.findByIdAndUpdate(item.product, { $inc: { stock: item.quantity } });
      }
    }

    await order.save();

    return res.status(200).json({ success: true, message: 'Order status updated.', data: { order } });
  } catch (error) {
    next(error);
  }
};

// ─── Users ────────────────────────────────────────────────────

/**
 * GET /api/admin/users
 */
const adminGetUsers = async (req, res, next) => {
  try {
    const { search, isActive, page = 1, limit = 20 } = req.query;
    const filter = { role: 'user' };

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }

    if (isActive !== undefined) filter.isActive = isActive === 'true';

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    const [users, total] = await Promise.all([
      User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum).lean(),
      User.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: { users, pagination: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) } },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/admin/users/:id/toggle-active
 */
const adminToggleUserActive = async (req, res, next) => {
  try {
    const user = await User.findOne({ _id: req.params.id, role: 'user' });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    user.isActive = !user.isActive;
    await user.save();

    return res.status(200).json({
      success: true,
      message: `User ${user.isActive ? 'activated' : 'deactivated'}.`,
      data: { user },
    });
  } catch (error) {
    next(error);
  }
};

// ─── Categories ───────────────────────────────────────────────

/**
 * GET /api/admin/categories
 */
const adminGetCategories = async (req, res, next) => {
  try {
    const categories = await Category.find().sort({ sortOrder: 1, name: 1 }).lean();
    return res.status(200).json({ success: true, data: { categories } });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/admin/categories
 */
const adminCreateCategory = async (req, res, next) => {
  try {
    const { name, image, description, sortOrder } = req.body;
    const slug = slugify(name, { lower: true, strict: true });
    const category = await Category.create({ name, slug, image, description, sortOrder: sortOrder || 0 });
    return res.status(201).json({ success: true, message: 'Category created.', data: { category } });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/admin/categories/:id
 */
const adminUpdateCategory = async (req, res, next) => {
  try {
    const category = await Category.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found.' });
    }
    return res.status(200).json({ success: true, message: 'Category updated.', data: { category } });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/admin/categories/:id
 */
const adminDeleteCategory = async (req, res, next) => {
  try {
    const category = await Category.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found.' });
    }
    return res.status(200).json({ success: true, message: 'Category deactivated.' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboard,
  adminGetProducts, adminCreateProduct, adminUpdateProduct, adminDeleteProduct,
  adminGetOrders, adminUpdateOrderStatus,
  adminGetUsers, adminToggleUserActive,
  adminGetCategories, adminCreateCategory, adminUpdateCategory, adminDeleteCategory,
};
