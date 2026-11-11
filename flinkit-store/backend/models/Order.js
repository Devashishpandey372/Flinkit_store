const mongoose = require('mongoose');

// Snapshot of item at time of order — never reference live product prices
const orderItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
    },
    name: { type: String, required: true },
    image: { type: String },
    unit: { type: String },
    sellingPrice: { type: Number, required: true },
    originalPrice: { type: Number, required: true },
    quantity: { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

// Snapshot of address at time of order
const deliveryAddressSchema = new mongoose.Schema(
  {
    fullName: String,
    phone: String,
    houseNumber: String,
    street: String,
    landmark: String,
    city: String,
    state: String,
    pinCode: String,
    deliveryInstructions: String,
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    items: {
      type: [orderItemSchema],
      required: true,
      validate: {
        validator: (v) => v.length > 0,
        message: 'Order must have at least one item',
      },
    },
    deliveryAddress: {
      type: deliveryAddressSchema,
      required: true,
    },
    subtotal: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    deliveryFee: { type: Number, default: 40 },
    totalAmount: { type: Number, required: true },

    paymentMethod: {
      type: String,
      enum: ['online', 'cod'],
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'refunded'],
      default: 'pending',
    },
    fulfillmentStatus: {
      type: String,
      enum: ['placed', 'confirmed', 'packed', 'out_for_delivery', 'delivered', 'cancelled'],
      default: 'placed',
    },

    // Razorpay fields
    razorpayOrderId: { type: String },
    razorpayPaymentId: { type: String },
    razorpaySignature: { type: String },

    // Timestamps of key events
    paidAt: { type: Date },
    deliveredAt: { type: Date },
    cancelledAt: { type: Date },

    cancellationReason: { type: String },

    // Expiry, Inventory & Reconciliation tracking
    isStockRestored: { type: Boolean, default: false },
    expiredAt: { type: Date },
    needsReconciliation: { type: Boolean, default: false },
    reconciliationReason: { type: String },
  },
  {
    timestamps: true,
  }
);

orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ fulfillmentStatus: 1 });
orderSchema.index({ paymentStatus: 1 });
orderSchema.index({ razorpayOrderId: 1 });
orderSchema.index({ paymentMethod: 1, paymentStatus: 1, fulfillmentStatus: 1, createdAt: 1 });

module.exports = mongoose.model('Order', orderSchema);
