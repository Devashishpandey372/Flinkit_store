const express = require('express');
const { body } = require('express-validator');
const { validate } = require('../middleware/validateRequest');
const { protect } = require('../middleware/authMiddleware');
const { adminOnly } = require('../middleware/adminMiddleware');
const {
  getDashboard,
  adminGetProducts, adminCreateProduct, adminUpdateProduct, adminDeleteProduct,
  adminGetOrders, adminUpdateOrderStatus,
  adminGetUsers, adminToggleUserActive,
  adminGetCategories, adminCreateCategory, adminUpdateCategory, adminDeleteCategory,
} = require('../controllers/adminController');

const router = express.Router();

// All admin routes require auth + admin role
router.use(protect, adminOnly);

// Dashboard
router.get('/dashboard', getDashboard);

// Products
router.get('/products', adminGetProducts);
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
router.patch('/products/:id', adminUpdateProduct);
router.delete('/products/:id', adminDeleteProduct);

// Orders
router.get('/orders', adminGetOrders);
router.patch(
  '/orders/:id/status',
  [body('fulfillmentStatus').notEmpty().withMessage('Status is required')],
  validate,
  adminUpdateOrderStatus
);

// Users
router.get('/users', adminGetUsers);
router.patch('/users/:id/toggle-active', adminToggleUserActive);

// Categories
router.get('/categories', adminGetCategories);
router.post(
  '/categories',
  [body('name').trim().notEmpty().withMessage('Category name required')],
  validate,
  adminCreateCategory
);
router.patch('/categories/:id', adminUpdateCategory);
router.delete('/categories/:id', adminDeleteCategory);

module.exports = router;
