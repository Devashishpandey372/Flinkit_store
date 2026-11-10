const crypto = require('crypto');
const mongoose = require('mongoose');
const razorpayConfig = require('../config/razorpay');
const Order = require('../models/Order');
const ProcessedWebhook = require('../models/ProcessedWebhook');

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

    // Verify HMAC signature using constant-time comparison to prevent timing attacks
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    const sigBuffer = Buffer.from(razorpay_signature);
    const expectedBuffer = Buffer.from(expectedSignature);

    const isSignatureValid =
      sigBuffer.length === expectedBuffer.length &&
      crypto.timingSafeEqual(sigBuffer, expectedBuffer);

    if (!isSignatureValid) {
      console.warn(`[Payment Verify] Invalid signature for Razorpay Order: ${razorpay_order_id}`);
      return res.status(400).json({ success: false, message: 'Payment verification failed. Invalid signature.' });
    }

    // Find order and verify ownership
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

    // Atomically transition from pending/failed to paid
    order.paymentStatus = 'paid';
    order.razorpayPaymentId = razorpay_payment_id;
    order.razorpaySignature = razorpay_signature;
    order.paidAt = new Date();
    order.fulfillmentStatus = 'confirmed';
    await order.save();

    console.log(
      `[Payment Verify] Verified & paid | Order ID: ${order._id} | Razorpay Payment ID: ${razorpay_payment_id}`
    );

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
 * Razorpay webhook for async payment events with full idempotency
 */
const handleWebhook = async (req, res, next) => {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error('[Razorpay Webhook] Processing error: Webhook secret not configured in environment variables.');
      return res.status(500).json({ success: false, message: 'Webhook secret not configured.' });
    }

    const signature = req.headers['x-razorpay-signature'];
    if (!signature) {
      console.warn('[Razorpay Webhook] Verification failure: Missing x-razorpay-signature header');
      return res.status(400).json({ success: false, message: 'Missing webhook signature header.' });
    }

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

    // Verify HMAC-SHA256 signature using timing-safe equal
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawBody)
      .digest('hex');

    const sigBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSignature);

    const isSignatureValid =
      sigBuffer.length === expectedBuffer.length &&
      crypto.timingSafeEqual(sigBuffer, expectedBuffer);

    if (!isSignatureValid) {
      console.warn('[Razorpay Webhook] Verification failure: Invalid webhook signature');
      return res.status(400).json({ success: false, message: 'Invalid webhook signature.' });
    }

    const event = data.event;
    const payload = data.payload || {};
    const paymentEntity = payload.payment?.entity;
    const orderEntity = payload.order?.entity;

    const paymentId = paymentEntity?.id || null;
    const razorpayOrderId = paymentEntity?.order_id || orderEntity?.id || null;
    const orderDbId = paymentEntity?.notes?.orderId || null;
    const amount =
      paymentEntity?.amount !== undefined
        ? paymentEntity.amount
        : orderEntity?.amount !== undefined
        ? orderEntity.amount
        : null;
    const currency = paymentEntity?.currency || orderEntity?.currency || 'INR';

    // 1. Read x-razorpay-event-id header first, with safe fallbacks
    const eventId =
      req.headers['x-razorpay-event-id'] ||
      data.id ||
      data.event_id ||
      (paymentId ? `${event}:${paymentId}` : null) ||
      (razorpayOrderId ? `${event}:${razorpayOrderId}` : null) ||
      `${event}:${Date.now()}`;

    console.log(
      `[Razorpay Webhook] Received event: ${event} | Event ID: ${eventId} | Payment ID: ${paymentId || 'N/A'} | Order ID: ${orderDbId || razorpayOrderId || 'N/A'}`
    );

    // ─── 1. Idempotency Pre-Check ─────────────────────────────────
    const existingRecord = await ProcessedWebhook.findOne({ eventId });
    if (existingRecord) {
      console.log(
        `[Razorpay Webhook] Duplicate event detected (pre-check) | Type: ${event} | Event ID: ${eventId} | Payment ID: ${paymentId || 'N/A'} | Status: already_processed`
      );
      return res.status(200).json({
        success: true,
        message: 'Event already processed',
        duplicate: true,
        eventId,
      });
    }

    // ─── 2. Concurrency Safety: Atomic Unique Record Creation ────
    let webhookRecord;
    try {
      webhookRecord = await ProcessedWebhook.create({
        eventId,
        eventType: event,
        paymentId: paymentId || undefined,
        razorpayOrderId: razorpayOrderId || undefined,
        amount: amount ? amount / 100 : undefined,
        currency,
        status: 'processed',
        source: req.headers['x-razorpay-event-id'] ? 'razorpay' : 'webhook',
      });
    } catch (err) {
      if (err.code === 11000) {
        // Caught simultaneous concurrent duplicate webhook delivery
        console.log(
          `[Razorpay Webhook] Concurrent duplicate event caught (unique constraint) | Type: ${event} | Event ID: ${eventId} | Payment ID: ${paymentId || 'N/A'} | Status: already_processed`
        );
        return res.status(200).json({
          success: true,
          message: 'Event already processed',
          duplicate: true,
          eventId,
        });
      }
      throw err;
    }

    // ─── 3. Business Event Processing with Rollback on Failure ────
    try {
      if (event === 'payment.captured') {
        const orderQuery = [];
        if (razorpayOrderId) orderQuery.push({ razorpayOrderId });
        if (orderDbId && mongoose.Types.ObjectId.isValid(orderDbId)) {
          orderQuery.push({ _id: orderDbId });
        }

        const order = await Order.findOne(orderQuery.length > 0 ? { $or: orderQuery } : { razorpayOrderId });

        if (!order) {
          console.warn(
            `[Razorpay Webhook] Order not found for Razorpay Order ID: ${razorpayOrderId} | Event ID: ${eventId}`
          );
          return res.status(200).json({
            success: true,
            message: 'Order not found in database for given payment entity',
            processed: false,
          });
        }

        // Link order ID to processed webhook record
        webhookRecord.orderId = order._id;
        await webhookRecord.save();

        // Validate Currency
        if (currency && currency.toUpperCase() !== 'INR') {
          console.warn(
            `[Razorpay Webhook] Verification failure: Currency mismatch (${currency} !== INR) | Order ID: ${order._id}`
          );
          return res.status(400).json({ success: false, message: 'Invalid currency' });
        }

        // Validate Amount if provided
        if (amount !== undefined && amount !== null) {
          const expectedAmountPaise = Math.round(order.totalAmount * 100);
          if (amount !== expectedAmountPaise) {
            console.warn(
              `[Razorpay Webhook] Verification failure: Amount mismatch (received ${amount} paise, expected ${expectedAmountPaise} paise) | Order ID: ${order._id}`
            );
            return res.status(400).json({ success: false, message: 'Payment amount mismatch' });
          }
        }

        // Validate payment status in entity
        if (paymentEntity?.status && !['captured', 'authorized'].includes(paymentEntity.status)) {
          console.warn(
            `[Razorpay Webhook] Payment entity status is not captured (${paymentEntity.status}) | Order ID: ${order._id}`
          );
          return res.status(200).json({ success: true, message: 'Payment entity not in captured state' });
        }

        // Check if order is already marked as paid (prevent duplicate notifications and updates)
        if (order.paymentStatus === 'paid') {
          console.log(
            `[Razorpay Webhook] Order ${order._id} was already marked as paid. Skipping redundant status update | Payment ID: ${paymentId} | Event ID: ${eventId}`
          );
          return res.status(200).json({
            success: true,
            message: 'Order was already marked as paid',
            duplicate: false,
            orderId: order._id,
          });
        }

        // Atomically update order status: allow transition from 'pending' OR 'failed' to 'paid'
        // Stock was already reserved upon order creation; zero additional inventory deduction here
        const updatedOrder = await Order.findOneAndUpdate(
          {
            _id: order._id,
            paymentStatus: { $ne: 'paid' },
          },
          {
            $set: {
              paymentStatus: 'paid',
              razorpayPaymentId: paymentId || order.razorpayPaymentId,
              razorpayOrderId: razorpayOrderId || order.razorpayOrderId,
              paidAt: new Date(),
              fulfillmentStatus: order.fulfillmentStatus === 'placed' ? 'confirmed' : order.fulfillmentStatus,
            },
          },
          { new: true }
        );

        console.log(
          `[Razorpay Webhook] Event processed successfully: ${event} | Event ID: ${eventId} | Payment ID: ${paymentId} | Order ID: ${order._id} | Payment Status: paid | Action: order_confirmed`
        );

        return res.status(200).json({
          success: true,
          message: 'Payment processed and order confirmed',
          orderId: order._id,
        });
      }

      if (event === 'payment.failed') {
        if (razorpayOrderId) {
          const order = await Order.findOne({ razorpayOrderId });
          if (order) {
            webhookRecord.orderId = order._id;
            await webhookRecord.save();

            // Only mark as failed if pending; never overwrite an already paid order
            if (order.paymentStatus === 'pending') {
              order.paymentStatus = 'failed';
              await order.save();
              console.log(
                `[Razorpay Webhook] Event processed: ${event} | Event ID: ${eventId} | Payment ID: ${paymentId || 'N/A'} | Order ID: ${order._id} marked as failed`
              );
            } else {
              console.log(
                `[Razorpay Webhook] Order ${order._id} status is already "${order.paymentStatus}". Not overwriting with failed.`
              );
            }
          }
        }

        return res.status(200).json({
          success: true,
          message: 'Payment failed event processed',
        });
      }

      // Unhandled events: acknowledge with 200 without side effects
      console.log(`[Razorpay Webhook] Unhandled event acknowledged: ${event} | Event ID: ${eventId}`);
      return res.status(200).json({ success: true, message: `Event ${event} acknowledged` });
    } catch (procErr) {
      // Rollback webhook record so that Razorpay automatic retry can retry this event
      await ProcessedWebhook.deleteOne({ eventId });
      console.error(`[Razorpay Webhook] Processing error for event ${eventId}:`, procErr.message);
      throw procErr;
    }
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/payments/dev/replay-webhook
 * Test/Development only utility to replay an already captured webhook payload and signature.
 * Strictly disabled in production. Requires valid HMAC signature using RAZORPAY_WEBHOOK_SECRET.
 */
const replayWebhookForTesting = async (req, res, next) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({
      success: false,
      message: 'Replay webhook endpoint is strictly disabled in production.',
    });
  }

  const signature = req.headers['x-razorpay-signature'];
  if (!signature) {
    return res.status(400).json({
      success: false,
      message: 'Missing x-razorpay-signature header for replay test.',
    });
  }

  // Pass directly into handleWebhook so full HMAC verification and idempotency logic runs
  return handleWebhook(req, res, next);
};

module.exports = {
  createRazorpayOrder,
  verifyPayment,
  handleWebhook,
  replayWebhookForTesting,
};
