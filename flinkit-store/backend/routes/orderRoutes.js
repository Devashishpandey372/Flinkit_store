const express = require('express');
const { body } = require('express-validator');
const { validate } = require('../middleware/validateRequest');
const { protect } = require('../middleware/authMiddleware');
const { createOrder, getMyOrders, getOrderById, cancelOrder } = require('../controllers/orderController');

const router = express.Router();

router.use(protect);

router.post(
  '/',
  [
    body('addressId').isMongoId().withMessage('Invalid address ID'),
    body('paymentMethod').isIn(['online', 'cod']).withMessage('Invalid payment method'),
  ],
  validate,
  createOrder
);

router.get('/my-orders', getMyOrders);
router.get('/:id', getOrderById);
router.patch('/:id/cancel', cancelOrder);

module.exports = router;
