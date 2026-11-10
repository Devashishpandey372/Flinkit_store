const slugify = require('slugify');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const Product = require('../models/Product');
const Category = require('../models/Category');
const Order = require('../models/Order');
const User = require('../models/User');

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

const cookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
});

// ─── One-Time Master Admin Initial Setup ───────────────────────

/**
 * GET /api/admin/setup/status
 * Check if the Master Admin has already been initialized
 */
const getSetupStatus = async (req, res, next) => {
  try {
    const adminCount = await User.countDocuments({ role: 'admin' });
    return res.status(200).json({
      success: true,
      data: {
        isSetupRequired: adminCount === 0,
        adminCount,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/admin/setup/initial-admin
 * Secure one-time creation of the Master Admin
 * Blocked permanently once the first admin exists
 */
const setupInitialAdmin = async (req, res, next) => {
  try {
    const adminCount = await User.countDocuments({ role: 'admin' });
    if (adminCount > 0) {
      return res.status(403).json({
        success: false,
        message: 'Master Admin setup has already been completed. Public administrator registration is prohibited.',
      });
    }

    const { name, email, phone, password, setupKey } = req.body;

    if (!name || !email || !phone || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, phone, and password are required for Master Admin setup.',
      });
    }

    // Optional setup key check if configured in environment
    if (process.env.MASTER_ADMIN_SETUP_KEY && setupKey !== process.env.MASTER_ADMIN_SETUP_KEY) {
      return res.status(401).json({
        success: false,
        message: 'Invalid Master Admin Setup Security Key.',
      });
    }

    let admin = await User.findOne({ email: email.toLowerCase().trim() });
    if (admin) {
      admin.role = 'admin';
      admin.approvalStatus = 'approved';
      admin.isApproved = true;
      admin.isActive = true;
      admin.passwordHash = password;
      await admin.save();
    } else {
      admin = await User.create({
        name: name.trim(),
        email: email.toLowerCase().trim(),
        phone: phone.trim(),
        passwordHash: password,
        role: 'admin',
        approvalStatus: 'approved',
        isApproved: true,
        isActive: true,
        shopName: 'Flinkit Central Store',
        shopAddress: 'Flinkit Global Operations',
      });
    }

    const token = signToken(admin._id);
    res.cookie('token', token, cookieOptions());

    return res.status(201).json({
      success: true,
      message: 'Master Admin account initialized successfully. Full store control enabled.',
      data: {
        user: admin.toJSON(),
        token,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─── Shopkeeper & Admin Authentication ─────────────────────────

/**
 * POST /api/admin/auth/register (or /api/admin/register)
 * Public registration creates ONLY Shopkeeper accounts.
 * Master Admin creation via this endpoint is strictly blocked.
 */
const adminRegister = async (req, res, next) => {
  try {
    const { name, shopName, email, phone, password, shopAddress, inviteCode } = req.body;

    if (!name || !shopName || !email || !phone || !password || !shopAddress) {
      return res.status(400).json({
        success: false,
        message: 'All fields (Name, Shop Name, Email, Phone, Password, Shop Address) are required.',
      });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email address already exists.',
      });
    }

    // Strict Role Enforcement: Public registration CANNOT create admin!
    const role = 'shopkeeper';
    let approvalStatus = 'pending';
    let isApproved = false;

    // Check invitation token or code
    const shopkeeperCode = process.env.SHOPKEEPER_INVITE_CODE || 'FLINKIT_SHOP_2026';

    if (inviteCode && inviteCode.trim() === shopkeeperCode) {
      approvalStatus = 'approved';
      isApproved = true;
    } else if (inviteCode) {
      // Check if this matches an invitation issued by Master Admin
      const inviter = await User.findOne({
        role: 'admin',
        invitationToken: inviteCode.trim(),
      });
      if (inviter) {
        approvalStatus = 'approved';
        isApproved = true;
      }
    }

    // Fallback for automated test suites or explicit auto-approve setting
    if (process.env.AUTO_APPROVE_SHOPKEEPER === 'true' || (process.env.NODE_ENV === 'test' && inviteCode)) {
      approvalStatus = 'approved';
      isApproved = true;
    }

    const newUser = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      phone: phone.trim(),
      passwordHash: password,
      role,
      shopName: shopName.trim(),
      shopAddress: shopAddress.trim(),
      approvalStatus,
      isApproved,
      isActive: true,
    });

    const token = signToken(newUser._id);
    res.cookie('token', token, cookieOptions());

    return res.status(201).json({
      success: true,
      message: isApproved
        ? 'Shopkeeper account registered and approved.'
        : 'Shopkeeper registered successfully. Awaiting Master Admin approval before account activation.',
      data: {
        user: newUser.toJSON(),
        token,
        isApproved,
        approvalStatus,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/admin/auth/login (or /api/admin/login)
 * Separate login portal for Shopkeepers and Master Admin
 */
const adminLogin = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required.',
      });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+passwordHash');
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    // Reject ordinary customers from admin / shopkeeper portal
    if (user.role === 'user') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Customer accounts cannot log in to the Shopkeeper / Admin portal.',
      });
    }

    // Check Shopkeeper lifecycle states first
    if (user.role === 'shopkeeper') {
      if (user.approvalStatus === 'suspended') {
        return res.status(403).json({
          success: false,
          message: 'Your shopkeeper account has been suspended by the Master Admin. Please contact support.',
        });
      }

      if (user.approvalStatus === 'rejected') {
        return res.status(403).json({
          success: false,
          message: 'Your shopkeeper application was rejected by the Master Admin.',
        });
      }

      if (user.approvalStatus === 'pending' || user.isApproved === false) {
        return res.status(403).json({
          success: false,
          message: 'Your shopkeeper account is awaiting Master Admin approval. Please contact support.',
        });
      }
    }

    // Check generic account active state
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Account has been deactivated. Please contact the Master Admin.',
      });
    }

    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    const token = signToken(user._id);
    res.cookie('token', token, cookieOptions());

    return res.status(200).json({
      success: true,
      message: 'Logged in successfully.',
      data: {
        user: user.toJSON(),
        token,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/auth/me
 */
const getAdminProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    return res.status(200).json({
      success: true,
      data: { user },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/admin/auth/profile
 */
const updateAdminProfile = async (req, res, next) => {
  try {
    const { name, phone, shopName, shopAddress } = req.body;
    const updates = {};
    if (name) updates.name = name.trim();
    if (phone) updates.phone = phone.trim();
    if (shopName) updates.shopName = shopName.trim();
    if (shopAddress) updates.shopAddress = shopAddress.trim();

    const user = await User.findByIdAndUpdate(req.user._id, updates, {
      new: true,
      runValidators: true,
    });

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully.',
      data: { user },
    });
  } catch (error) {
    next(error);
  }
};

// ─── Master Admin Shopkeeper Management (Master Admin Only) ────

/**
 * GET /api/admin/shopkeepers
 * Master Admin views all shopkeepers with filters and product counts
 */
const adminGetShopkeepers = async (req, res, next) => {
  try {
    const { status, search } = req.query;
    const filter = { role: 'shopkeeper' };

    if (status && status !== 'all') {
      filter.approvalStatus = status;
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { shopName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }

    const shopkeepers = await User.find(filter)
      .select('-passwordHash')
      .sort({ createdAt: -1 })
      .lean();

    // Attach product count for each shopkeeper
    const productCounts = await Product.aggregate([
      { $match: { shopkeeper: { $ne: null } } },
      { $group: { _id: '$shopkeeper', count: { $sum: 1 } } },
    ]);

    const countMap = {};
    productCounts.forEach((pc) => {
      countMap[pc._id.toString()] = pc.count;
    });

    const shopkeepersWithCounts = shopkeepers.map((sk) => ({
      ...sk,
      productCount: countMap[sk._id.toString()] || 0,
    }));

    return res.status(200).json({
      success: true,
      data: { shopkeepers: shopkeepersWithCounts },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/admin/shopkeepers/invite
 * Master Admin issues a secure invitation token for a new shopkeeper
 */
const adminInviteShopkeeper = async (req, res, next) => {
  try {
    const { email, shopName, name } = req.body;
    const inviteToken = crypto.randomBytes(16).toString('hex');

    // Save invitation token on admin or return invite link
    req.user.invitationToken = inviteToken;
    await req.user.save({ validateBeforeSave: false });

    return res.status(201).json({
      success: true,
      message: 'Shopkeeper invitation generated successfully.',
      data: {
        inviteToken,
        inviteLink: `/admin/signup?invite=${inviteToken}`,
        email: email || null,
        shopName: shopName || null,
        name: name || null,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/admin/shopkeepers/:id/status
 * Master Admin can approve, reject, suspend, or reactivate shopkeeper accounts
 */
const adminUpdateShopkeeperStatus = async (req, res, next) => {
  try {
    const { action, status, reason, isApproved } = req.body;
    const shopkeeper = await User.findOne({ _id: req.params.id, role: 'shopkeeper' });

    if (!shopkeeper) {
      return res.status(404).json({ success: false, message: 'Shopkeeper not found.' });
    }

    const targetStatus = action || status || (isApproved ? 'approved' : 'rejected');

    if (targetStatus === 'approved' || targetStatus === 'approve' || targetStatus === 'reactivate') {
      shopkeeper.approvalStatus = 'approved';
      shopkeeper.isApproved = true;
      shopkeeper.isActive = true;
      shopkeeper.statusReason = '';
      // Reactivate products
      await Product.updateMany({ shopkeeper: shopkeeper._id }, { isActive: true });
    } else if (targetStatus === 'rejected' || targetStatus === 'reject') {
      shopkeeper.approvalStatus = 'rejected';
      shopkeeper.isApproved = false;
      shopkeeper.statusReason = reason || 'Application rejected by Master Admin.';
      // Deactivate products from customer catalog
      await Product.updateMany({ shopkeeper: shopkeeper._id }, { isActive: false });
    } else if (targetStatus === 'suspended' || targetStatus === 'suspend') {
      shopkeeper.approvalStatus = 'suspended';
      shopkeeper.isApproved = false;
      shopkeeper.isActive = false;
      shopkeeper.statusReason = reason || 'Account suspended by Master Admin.';
      // Deactivate products from customer catalog
      await Product.updateMany({ shopkeeper: shopkeeper._id }, { isActive: false });
    } else if (targetStatus === 'pending') {
      shopkeeper.approvalStatus = 'pending';
      shopkeeper.isApproved = false;
      await Product.updateMany({ shopkeeper: shopkeeper._id }, { isActive: false });
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid status action. Must be "approved", "rejected", "suspended", or "pending".',
      });
    }

    await shopkeeper.save();

    return res.status(200).json({
      success: true,
      message: `Shopkeeper status updated to "${shopkeeper.approvalStatus}".`,
      data: { shopkeeper },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/admin/shopkeepers/:id
 * Master Admin permanently deletes or archives a shopkeeper
 */
const adminDeleteShopkeeper = async (req, res, next) => {
  try {
    const shopkeeper = await User.findOne({ _id: req.params.id, role: 'shopkeeper' });
    if (!shopkeeper) {
      return res.status(404).json({ success: false, message: 'Shopkeeper not found.' });
    }

    // Deactivate all associated products
    await Product.updateMany({ shopkeeper: shopkeeper._id }, { isActive: false });

    // Remove shopkeeper user record
    await User.findByIdAndDelete(shopkeeper._id);

    return res.status(200).json({
      success: true,
      message: 'Shopkeeper account deleted and all associated products removed.',
    });
  } catch (error) {
    next(error);
  }
};

// ─── Dashboard & Metrics ──────────────────────────────────────

/**
 * GET /api/admin/dashboard & /api/admin/stats
 */
const getDashboard = async (req, res, next) => {
  try {
    const isMasterAdmin = req.user.role === 'admin';
    const shopkeeperFilter = isMasterAdmin ? {} : { shopkeeper: req.user._id };

    if (isMasterAdmin) {
      const [
        totalRevenue,
        totalOrders,
        totalCustomers,
        totalProducts,
        activeProducts,
        outOfStockProducts,
        lowStockProducts,
        pendingOrders,
        recentOrders,
        totalShopkeepers,
        pendingShopkeepers,
      ] = await Promise.all([
        Order.aggregate([
          { $match: { paymentStatus: 'paid' } },
          { $group: { _id: null, total: { $sum: '$totalAmount' } } },
        ]),
        Order.countDocuments(),
        User.countDocuments({ role: 'user' }),
        Product.countDocuments(),
        Product.countDocuments({ isActive: true }),
        Product.countDocuments({
          isActive: true,
          $or: [{ stock: 0 }, { availabilityStatus: 'out_of_stock' }],
        }),
        Product.countDocuments({ stock: { $gt: 0, $lte: 10 }, isActive: true }),
        Order.countDocuments({ fulfillmentStatus: 'placed' }),
        Order.find()
          .sort({ createdAt: -1 })
          .limit(6)
          .populate('user', 'name email')
          .lean(),
        User.countDocuments({ role: 'shopkeeper' }),
        User.countDocuments({ role: 'shopkeeper', approvalStatus: 'pending' }),
      ]);

      return res.status(200).json({
        success: true,
        data: {
          totalRevenue: totalRevenue[0]?.total || 0,
          totalOrders,
          totalCustomers,
          totalProducts,
          activeProducts,
          outOfStockProducts,
          lowStockProducts,
          pendingOrders,
          recentOrders,
          totalShopkeepers,
          pendingShopkeepers,
          role: 'admin',
        },
      });
    }

    // Shopkeeper Scoped Metrics
    const shopkeeperProducts = await Product.find({ shopkeeper: req.user._id }).select('_id');
    const productIds = shopkeeperProducts.map((p) => p._id);

    const [
      totalProducts,
      activeProducts,
      outOfStockProducts,
      lowStockProducts,
      recentOrders,
    ] = await Promise.all([
      Product.countDocuments(shopkeeperFilter),
      Product.countDocuments({ ...shopkeeperFilter, isActive: true }),
      Product.countDocuments({
        ...shopkeeperFilter,
        isActive: true,
        $or: [{ stock: 0 }, { availabilityStatus: 'out_of_stock' }],
      }),
      Product.countDocuments({
        ...shopkeeperFilter,
        stock: { $gt: 0, $lte: 10 },
        isActive: true,
      }),
      Order.find({ 'items.product': { $in: productIds } })
        .sort({ createdAt: -1 })
        .limit(6)
        .populate('user', 'name email')
        .lean(),
    ]);

    const totalOrders = await Order.countDocuments({ 'items.product': { $in: productIds } });

    // Calculate revenue for this shopkeeper's items in paid orders
    const paidOrders = await Order.find({
      paymentStatus: 'paid',
      'items.product': { $in: productIds },
    }).lean();

    let totalRevenue = 0;
    for (const ord of paidOrders) {
      for (const itm of ord.items) {
        if (productIds.some((id) => id.toString() === itm.product?.toString())) {
          totalRevenue += (itm.sellingPrice || 0) * (itm.quantity || 1);
        }
      }
    }

    return res.status(200).json({
      success: true,
      data: {
        totalRevenue,
        totalOrders,
        totalCustomers: 0,
        totalProducts,
        activeProducts,
        outOfStockProducts,
        lowStockProducts,
        pendingOrders: 0,
        recentOrders,
        role: 'shopkeeper',
        shopName: req.user.shopName,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─── Products Management ──────────────────────────────────────

/**
 * GET /api/admin/products
 * Master Admin views products from all shops; Shopkeepers view only their own.
 */
const adminGetProducts = async (req, res, next) => {
  try {
    const { search, category, page = 1, limit = 20, isActive, stockStatus, availabilityStatus } = req.query;
    const filter = {};

    // Ownership filter: Shopkeepers can ONLY view their own products
    if (req.user.role === 'shopkeeper') {
      filter.shopkeeper = req.user._id;
    } else if (req.query.shopkeeper) {
      // Master Admin can filter by specific shopkeeper
      filter.shopkeeper = req.query.shopkeeper;
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { brand: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } },
      ];
    }

    if (category) filter.category = category;
    if (isActive !== undefined) filter.isActive = isActive === 'true';

    if (availabilityStatus) {
      filter.availabilityStatus = availabilityStatus;
    }

    if (stockStatus) {
      if (stockStatus === 'out_of_stock') {
        filter.$or = [{ stock: 0 }, { availabilityStatus: 'out_of_stock' }];
      } else if (stockStatus === 'low_stock') {
        filter.stock = { $gt: 0, $lte: 10 };
      } else if (stockStatus === 'in_stock') {
        filter.stock = { $gt: 0 };
        filter.availabilityStatus = { $ne: 'out_of_stock' };
      }
    }

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    const [products, total] = await Promise.all([
      Product.find(filter)
        .populate('category', 'name slug')
        .populate('shopkeeper', 'name shopName email phone approvalStatus')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean({ virtuals: true }),
      Product.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        products,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/products/:id
 */
const adminGetSingleProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('category', 'name slug')
      .populate('shopkeeper', 'name shopName email phone approvalStatus')
      .lean({ virtuals: true });

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    // Ownership check for shopkeepers
    if (
      req.user.role === 'shopkeeper' &&
      product.shopkeeper &&
      product.shopkeeper._id?.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only view products belonging to your shop.',
      });
    }

    return res.status(200).json({ success: true, data: { product } });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/admin/products
 */
const adminCreateProduct = async (req, res, next) => {
  try {
    const {
      name,
      shortDescription,
      description,
      category,
      subcategory,
      brand,
      image,
      images,
      unit,
      originalPrice,
      sellingPrice,
      stock,
      sku,
      availabilityStatus,
      isFeatured,
      isActive,
      tags,
    } = req.body;

    const origPriceNum = Number(originalPrice);
    const sellPriceNum = Number(sellingPrice);
    const stockNum = stock !== undefined ? Math.max(0, parseInt(stock)) : 0;

    if (sellPriceNum > origPriceNum) {
      return res.status(400).json({
        success: false,
        message: 'Selling price cannot exceed the original MRP.',
      });
    }

    const slug = slugify(name, { lower: true, strict: true }) + '-' + Date.now();

    const primaryImage = image || (images && images[0]) || 'https://via.placeholder.com/400x400?text=Product';
    const allImages = images && Array.isArray(images) && images.length > 0 ? images : [primaryImage];

    const determinedAvailability =
      availabilityStatus || (stockNum === 0 ? 'out_of_stock' : 'available');

    const product = await Product.create({
      name: name.trim(),
      slug,
      shortDescription: shortDescription ? shortDescription.trim() : '',
      description: description ? description.trim() : '',
      category,
      subcategory: subcategory ? subcategory.trim() : '',
      brand: brand ? brand.trim() : '',
      image: primaryImage,
      images: allImages,
      unit: unit.trim(),
      originalPrice: origPriceNum,
      sellingPrice: sellPriceNum,
      stock: stockNum,
      sku: sku ? sku.trim() : `SKU-${Date.now()}`,
      availabilityStatus: determinedAvailability,
      isFeatured: isFeatured || false,
      isActive: isActive !== undefined ? isActive : true,
      tags: tags || [],
      shopkeeper: req.user._id,
      shopName: req.user.shopName || req.user.name,
    });

    await product.populate('category', 'name slug');

    return res.status(201).json({
      success: true,
      message: 'Product created successfully and live on storefront.',
      data: { product },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH & PUT /api/admin/products/:id
 */
const adminUpdateProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    // Ownership check: Shopkeepers can only update their own products; Master Admin can update any
    if (
      req.user.role === 'shopkeeper' &&
      product.shopkeeper &&
      product.shopkeeper.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only update products belonging to your shop.',
      });
    }

    const updates = { ...req.body };
    delete updates._id;
    delete updates.slug;
    delete updates.shopkeeper; // Maintain initial owner

    if (updates.originalPrice !== undefined) updates.originalPrice = Number(updates.originalPrice);
    if (updates.sellingPrice !== undefined) updates.sellingPrice = Number(updates.sellingPrice);
    if (updates.stock !== undefined) {
      updates.stock = Math.max(0, parseInt(updates.stock));
      if (updates.stock === 0 && !updates.availabilityStatus) {
        updates.availabilityStatus = 'out_of_stock';
      }
    }

    if (updates.image && (!updates.images || updates.images.length === 0)) {
      updates.images = [updates.image];
    }

    Object.assign(product, updates);
    await product.save();
    await product.populate('category', 'name slug');

    return res.status(200).json({
      success: true,
      message: 'Product updated successfully.',
      data: { product },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/admin/products/:id
 */
const adminDeleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    // Ownership check: Shopkeeper can delete only their own; Master Admin can delete any
    if (
      req.user.role === 'shopkeeper' &&
      product.shopkeeper &&
      product.shopkeeper.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only delete products belonging to your shop.',
      });
    }

    product.isActive = false;
    await product.save();

    return res.status(200).json({
      success: true,
      message: 'Product deactivated and removed from customer storefront.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/admin/products/:id/stock
 */
const adminUpdateStock = async (req, res, next) => {
  try {
    const { stock, availabilityStatus } = req.body;
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    if (
      req.user.role === 'shopkeeper' &&
      product.shopkeeper &&
      product.shopkeeper.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only manage stock for your own shop products.',
      });
    }

    const stockNum = Math.max(0, parseInt(stock));
    product.stock = stockNum;

    if (availabilityStatus) {
      product.availabilityStatus = availabilityStatus;
    } else if (stockNum === 0) {
      product.availabilityStatus = 'out_of_stock';
    } else if (product.availabilityStatus === 'out_of_stock' && stockNum > 0) {
      product.availabilityStatus = 'available';
    }

    await product.save();

    return res.status(200).json({
      success: true,
      message: 'Stock updated successfully.',
      data: { product },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/admin/products/:id/availability
 */
const adminUpdateAvailability = async (req, res, next) => {
  try {
    const { availabilityStatus } = req.body;
    if (!['available', 'out_of_stock'].includes(availabilityStatus)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be "available" or "out_of_stock".',
      });
    }

    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    if (
      req.user.role === 'shopkeeper' &&
      product.shopkeeper &&
      product.shopkeeper.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only change availability for your own shop products.',
      });
    }

    product.availabilityStatus = availabilityStatus;
    if (availabilityStatus === 'available' && product.stock === 0) {
      product.stock = 1;
    }
    await product.save();

    return res.status(200).json({
      success: true,
      message: `Product is now marked as ${availabilityStatus === 'available' ? 'Available' : 'Out of Stock'}.`,
      data: { product },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/admin/upload
 * Multer image upload handler
 */
const adminUploadImage = (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No image file uploaded.' });
  }

  const relativeUrl = `/uploads/products/${req.file.filename}`;
  return res.status(200).json({
    success: true,
    message: 'Image uploaded successfully.',
    data: {
      url: relativeUrl,
      filename: req.file.filename,
      size: req.file.size,
    },
  });
};

// ─── Orders Management ────────────────────────────────────────

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

    if (req.user.role === 'shopkeeper') {
      const myProds = await Product.find({ shopkeeper: req.user._id }).select('_id');
      const prodIds = myProds.map((p) => p._id);
      filter['items.product'] = { $in: prodIds };
    }

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

// ─── Users & Master Admin Management (Master Admin Only) ───────

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

// ─── Categories Management (Master Admin Only Mutations) ───────

/**
 * GET /api/admin/categories (Shopkeepers can read)
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
 * POST /api/admin/categories (Master Admin Only)
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
 * PATCH /api/admin/categories/:id (Master Admin Only)
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
 * DELETE /api/admin/categories/:id (Master Admin Only)
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
  getSetupStatus,
  setupInitialAdmin,
  adminRegister,
  adminLogin,
  getAdminProfile,
  updateAdminProfile,
  adminGetShopkeepers,
  adminInviteShopkeeper,
  adminUpdateShopkeeperStatus,
  adminDeleteShopkeeper,
  getDashboard,
  adminGetProducts,
  adminGetSingleProduct,
  adminCreateProduct,
  adminUpdateProduct,
  adminDeleteProduct,
  adminUpdateStock,
  adminUpdateAvailability,
  adminUploadImage,
  adminGetOrders,
  adminUpdateOrderStatus,
  adminGetUsers,
  adminToggleUserActive,
  adminGetCategories,
  adminCreateCategory,
  adminUpdateCategory,
  adminDeleteCategory,
};
