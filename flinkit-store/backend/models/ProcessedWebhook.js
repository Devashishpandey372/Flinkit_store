const mongoose = require('mongoose');

/**
 * ProcessedWebhook Schema
 * Dedicated collection to store processed Razorpay webhook event IDs
 * Ensures idempotency and prevents duplicate payment processing
 */
const processedWebhookSchema = new mongoose.Schema(
  {
    eventId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    eventType: {
      type: String,
      required: true,
      index: true,
    },
    paymentId: {
      type: String,
      trim: true,
    },
    razorpayOrderId: {
      type: String,
      trim: true,
      index: true,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
    },
    amount: {
      type: Number,
    },
    currency: {
      type: String,
      default: 'INR',
    },
    status: {
      type: String,
      enum: ['processed', 'duplicate', 'failed'],
      default: 'processed',
    },
    source: {
      type: String,
      default: 'razorpay_webhook',
    },
    processedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Retain webhook logs for 90 days for audit and dispute resolution
processedWebhookSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

module.exports = mongoose.model('ProcessedWebhook', processedWebhookSchema);

