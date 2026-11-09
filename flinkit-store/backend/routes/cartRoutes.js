const express = require('express');
const { body } = require('express-validator');
const { validate } = require('../middleware/validateRequest');
const { protect } = require('../middleware/authMiddleware');
const { getCart, addToCart, updateCartItem, removeCartItem, clearCart } = require('../controllers/cartController');

const router = express.Router();

router.use(protect);

router.get('/', getCart);
router.delete('/', clearCart);
router.delete('/clear', clearCart);

router.post(
  '/items',
  [
    body('productId').isMongoId().withMessage('Invalid product ID'),
    body('quantity').optional().isInt({ min: 1 }).withMessage('Quantity must be a positive integer'),
  ],
  validate,
  addToCart
);

router.patch(
  '/items/:productId',
  [body('quantity').isInt({ min: 1 }).withMessage('Quantity must be a positive integer')],
  validate,
  updateCartItem
);

router.delete('/items/:productId', removeCartItem);

module.exports = router;
