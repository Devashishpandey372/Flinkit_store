const express = require('express');
const { body } = require('express-validator');
const { validate } = require('../middleware/validateRequest');
const { protect } = require('../middleware/authMiddleware');
const { adminOnly, adminOrShopkeeper } = require('../middleware/adminMiddleware');
const { uploadSingle } = require('../middleware/uploadMiddleware');
const {
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
} = require('../controllers/adminController');

const router = express.Router();

// ─── Public Initial Setup Routes ──────────────────────────────
router.get('/setup/status', getSetupStatus);
router.post(
  '/setup/initial-admin',
  [
    body('name').trim().isLength({ min: 2, max: 50 }).withMessage('Name must be 2–50 characters'),
    body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email address'),
    body('phone').matches(/^[6-9]\d{9}$/).withMessage('Please provide a valid 10-digit Indian mobile number'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  ],
  validate,
  setupInitialAdmin
);

// ─── Public Admin / Shopkeeper Auth Routes ───────────────────
router.post(
  '/auth/register',
  [
    body('name').trim().isLength({ min: 2, max: 50 }).withMessage('Name must be 2–50 characters'),
    body('shopName').trim().notEmpty().withMessage('Shop name is required'),
    body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email address'),
    body('phone').matches(/^[6-9]\d{9}$/).withMessage('Please provide a valid 10-digit Indian mobile number'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('shopAddress').trim().notEmpty().withMessage('Shop address is required'),
  ],
  validate,
  adminRegister
);

router.post(
  '/auth/login',
  [
    body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  validate,
  adminLogin
);

// Aliases
router.post('/register', adminRegister);
router.post('/login', adminLogin);

// ─── Authenticated Admin / Shopkeeper Routes ─────────────────
router.use(protect, adminOrShopkeeper);

// Profile
router.get('/auth/me', getAdminProfile);
router.get('/me', getAdminProfile);
router.patch('/auth/profile', updateAdminProfile);

// Dashboard Metrics
router.get('/dashboard', getDashboard);
router.get('/stats', getDashboard);

// Upload Product Image (Multer)
router.post('/upload', uploadSingle, adminUploadImage);

// Products
router.get('/products', adminGetProducts);
router.get('/products/:id', adminGetSingleProduct);
router.post(
  '/products',
  [
    body('name').trim().notEmpty().withMessage('Product name is required'),
    body('category').isMongoId().withMessage('Invalid category ID'),
    body('unit').trim().notEmpty().withMessage('Unit is required'),
    body('originalPrice').isFloat({ min: 0 }).withMessage('Original price must be non-negative'),
    body('sellingPrice').isFloat({ min: 0 }).withMessage('Selling price must be non-negative'),
  ],
  validate,
  adminCreateProduct
);
router.put('/products/:id', adminUpdateProduct);
router.patch('/products/:id', adminUpdateProduct);
router.delete('/products/:id', adminDeleteProduct);
router.patch('/products/:id/stock', adminUpdateStock);
router.patch('/products/:id/availability', adminUpdateAvailability);

// Orders (Master Admin sees all, Shopkeeper sees orders containing their items)
router.get('/orders', adminGetOrders);
router.patch(
  '/orders/:id/status',
  [body('fulfillmentStatus').notEmpty().withMessage('Status is required')],
  validate,
  adminUpdateOrderStatus
);

// Categories (Shopkeepers have read-only access)
router.get('/categories', adminGetCategories);

// ─── Master Admin Strictly Controlled Routes ───────────────────
router.get('/shopkeepers', adminOnly, adminGetShopkeepers);
router.post('/shopkeepers/invite', adminOnly, adminInviteShopkeeper);
router.patch('/shopkeepers/:id/status', adminOnly, adminUpdateShopkeeperStatus);
router.patch('/shopkeepers/:id/approve', adminOnly, adminUpdateShopkeeperStatus); // backward compatibility
router.delete('/shopkeepers/:id', adminOnly, adminDeleteShopkeeper);

router.get('/users', adminOnly, adminGetUsers);
router.patch('/users/:id/toggle-active', adminOnly, adminToggleUserActive);

router.post(
  '/categories',
  adminOnly,
  [body('name').trim().notEmpty().withMessage('Category name required')],
  validate,
  adminCreateCategory
);
router.patch('/categories/:id', adminOnly, adminUpdateCategory);
router.delete('/categories/:id', adminOnly, adminDeleteCategory);

module.exports = router;
