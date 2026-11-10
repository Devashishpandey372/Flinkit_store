const express = require('express');
const { body } = require('express-validator');
const { validate } = require('../middleware/validateRequest');
const { protect } = require('../middleware/authMiddleware');
const {
  createRazorpayOrder,
  verifyPayment,
  handleWebhook,
  replayWebhookForTesting,
} = require('../controllers/paymentController');

const router = express.Router();

// Webhook uses raw body for signature verification
router.post('/webhook', express.raw({ type: 'application/json' }), handleWebhook);

// Dev/Test only replay endpoint - completely disabled in production
if (process.env.NODE_ENV !== 'production') {
  router.post('/dev/replay-webhook', express.raw({ type: 'application/json' }), replayWebhookForTesting);
}

router.use(protect);

router.post(
  '/create-order',
  [body('orderId').isMongoId().withMessage('Invalid order ID')],
  validate,
  createRazorpayOrder
);

router.post(
  '/verify',
  [
    body('razorpay_order_id').notEmpty().withMessage('Razorpay order ID required'),
    body('razorpay_payment_id').notEmpty().withMessage('Razorpay payment ID required'),
    body('razorpay_signature').notEmpty().withMessage('Signature required'),
    body('orderId').optional().isMongoId().withMessage('Invalid order ID'),
  ],
  validate,
  verifyPayment
);

module.exports = router;
