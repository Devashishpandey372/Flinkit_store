const crypto = require('crypto');
const razorpayConfig = require('../config/razorpay');
const Order = require('../models/Order');

/**
 * POST /api/payments/create-order
 * Creates a Razorpay order for an existing order
 */
const createRazorpayOrder = async (req, res, next) => {
  try {
    const { orderId } = req.body;

    const order = await Order.findOne({ _id: orderId, user: req.user._id });
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    if (order.paymentStatus === 'paid') {
      return res.status(400).json({ success: false, message: 'Order is already paid.' });
    }

    if (order.paymentMethod !== 'online') {
      return res.status(400).json({ success: false, message: 'This order uses Cash on Delivery.' });
    }

    const razorpay = razorpayConfig.getRazorpay();

    const razorpayOrder = await razorpay.orders.create({
      amount: Math.round(order.totalAmount * 100), // paise
      currency: 'INR',
      receipt: `flinkit_${order._id}`,
      notes: {
        orderId: order._id.toString(),
        userId: req.user._id.toString(),
      },
    });

    // Store razorpay order id
    order.razorpayOrderId = razorpayOrder.id;
    await order.save();

    return res.status(200).json({
      success: true,
      data: {
        razorpayOrderId: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        key: process.env.RAZORPAY_KEY_ID,
        orderId: order._id,
        user: {
          name: req.user.name,
          email: req.user.email,
          phone: req.user.phone,
        },
      },
    });
  } catch (error) {
    console.error('Razorpay order creation error:', error?.message || error);
    return res.status(500).json({
      success: false,
      message: error?.error?.description || error?.message || 'Failed to create Razorpay order.',
      error: process.env.NODE_ENV === 'development' ? error?.message : undefined,
    });
  }
};

/**
 * POST /api/payments/verify
 * Verifies payment signature and marks order as paid
 */
const verifyPayment = async (req, res, next) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ success: false, message: 'Missing payment verification data.' });
    }

    // Verify HMAC signature
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ success: false, message: 'Payment verification failed. Invalid signature.' });
    }

    // Find order and update
    const order = await Order.findOne({
      _id: orderId,
      user: req.user._id,
      razorpayOrderId: razorpay_order_id,
    });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    // Prevent duplicate processing
    if (order.paymentStatus === 'paid') {
      return res.status(200).json({ success: true, message: 'Payment already verified.', data: { order } });
    }

    order.paymentStatus = 'paid';
    order.razorpayPaymentId = razorpay_payment_id;
    order.razorpaySignature = razorpay_signature;
    order.paidAt = new Date();
    order.fulfillmentStatus = 'confirmed';
    await order.save();

    return res.status(200).json({
      success: true,
      message: 'Payment verified successfully.',
      data: { order },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/payments/webhook
 * Razorpay webhook for async payment events
 */
const handleWebhook = async (req, res, next) => {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!webhookSecret) {
      return res.status(500).json({ success: false, message: 'Webhook secret not configured.' });
    }

    const signature = req.headers['x-razorpay-signature'];
    let rawBody;
    let data;

    if (Buffer.isBuffer(req.body)) {
      rawBody = req.body.toString('utf8');
      try {
        data = JSON.parse(rawBody);
      } catch (err) {
        return res.status(400).json({ success: false, message: 'Invalid JSON payload' });
      }
    } else if (typeof req.body === 'string') {
      rawBody = req.body;
      try {
        data = JSON.parse(rawBody);
      } catch (err) {
        return res.status(400).json({ success: false, message: 'Invalid JSON payload' });
      }
    } else {
      data = req.body || {};
      rawBody = JSON.stringify(req.body);
    }

    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawBody)
      .digest('hex');

    if (signature !== expectedSignature) {
      return res.status(400).json({ success: false, message: 'Invalid webhook signature.' });
    }

    const event = data.event;
    const payload = data.payload;

    if (event === 'payment.captured') {
      const razorpayOrderId = payload.payment.entity.order_id;
      const razorpayPaymentId = payload.payment.entity.id;

      const order = await Order.findOne({ razorpayOrderId });
      if (order && order.paymentStatus !== 'paid') {
        order.paymentStatus = 'paid';
        order.razorpayPaymentId = razorpayPaymentId;
        order.paidAt = new Date();
        order.fulfillmentStatus = 'confirmed';
        await order.save();
      }
    }

    if (event === 'payment.failed') {
      const razorpayOrderId = payload.payment.entity.order_id;
      const order = await Order.findOne({ razorpayOrderId });
      if (order && order.paymentStatus === 'pending') {
        order.paymentStatus = 'failed';
        await order.save();
      }
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    next(error);
  }
};

module.exports = { createRazorpayOrder, verifyPayment, handleWebhook };
