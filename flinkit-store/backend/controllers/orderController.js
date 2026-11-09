const mongoose = require('mongoose');
const Order = require('../models/Order');
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const Address = require('../models/Address');

const DELIVERY_FEE = 40;
const FREE_DELIVERY_THRESHOLD = 499;

/**
 * POST /api/orders  — create a new order (stock reservation)
 */
const createOrder = async (req, res, next) => {
  const desc = mongoose.connection?.client?.topology?.description;
  const canUseTransaction = Boolean(
    desc && (desc.setName || desc.type === 'ReplicaSetWithPrimary' || desc.type === 'Sharded')
  );

  let session = null;
  if (canUseTransaction) {
    session = await mongoose.startSession();
    session.startTransaction();
  }

  const sessionOption = session ? { session } : {};

  try {
    const { addressId, paymentMethod } = req.body;

    if (!['online', 'cod'].includes(paymentMethod)) {
      if (session) await session.abortTransaction();
      return res.status(400).json({ success: false, message: 'Invalid payment method.' });
    }

    // Validate address belongs to user
    const address = await Address.findOne({ _id: addressId, user: req.user._id }, null, sessionOption);
    if (!address) {
      if (session) await session.abortTransaction();
      return res.status(404).json({ success: false, message: 'Address not found.' });
    }

    // Get cart
    const cart = await Cart.findOne({ user: req.user._id }, null, sessionOption).populate('items.product');
    if (!cart || cart.items.length === 0) {
      if (session) await session.abortTransaction();
      return res.status(400).json({ success: false, message: 'Cart is empty.' });
    }

    // Build order items and validate stock
    const orderItems = [];
    let subtotal = 0;

    for (const item of cart.items) {
      const product = await Product.findById(item.product._id, null, sessionOption);

      if (!product || !product.isActive) {
        if (session) await session.abortTransaction();
        return res.status(400).json({
          success: false,
          message: `Product "${item.product.name}" is no longer available.`,
        });
      }

      if (product.stock < item.quantity) {
        if (session) await session.abortTransaction();
        return res.status(400).json({
          success: false,
          message: `Only ${product.stock} unit(s) of "${product.name}" available.`,
        });
      }

      // Deduct stock atomically
      await Product.findByIdAndUpdate(
        product._id,
        { $inc: { stock: -item.quantity } },
        sessionOption
      );

      orderItems.push({
        product: product._id,
        name: product.name,
        image: product.image,
        unit: product.unit,
        sellingPrice: product.sellingPrice,
        originalPrice: product.originalPrice,
        quantity: item.quantity,
      });

      subtotal += product.sellingPrice * item.quantity;
    }

    const deliveryFee = subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_FEE;
    const discount = 0; // Future: coupon system
    const totalAmount = subtotal - discount + deliveryFee;

    // Create delivery address snapshot
    const deliveryAddress = {
      fullName: address.fullName,
      phone: address.phone,
      houseNumber: address.houseNumber,
      street: address.street,
      landmark: address.landmark,
      city: address.city,
      state: address.state,
      pinCode: address.pinCode,
      deliveryInstructions: address.deliveryInstructions,
    };

    const orderData = {
      user: req.user._id,
      items: orderItems,
      deliveryAddress,
      subtotal,
      discount,
      deliveryFee,
      totalAmount,
      paymentMethod,
      paymentStatus: 'pending',
      fulfillmentStatus: 'placed',
    };

    let order;
    if (session) {
      const created = await Order.create([orderData], { session });
      order = created[0];
    } else {
      order = await Order.create(orderData);
    }

    // Clear cart after order created
    await Cart.findOneAndUpdate({ user: req.user._id }, { items: [] }, sessionOption);

    if (session) {
      await session.commitTransaction();
    }

    return res.status(201).json({
      success: true,
      message: 'Order placed successfully.',
      data: { order },
    });
  } catch (error) {
    if (session) {
      await session.abortTransaction();
    }
    next(error);
  } finally {
    if (session) {
      session.endSession();
    }
  }
};

/**
 * GET /api/orders/my-orders
 */
const getMyOrders = async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    const [orders, total] = await Promise.all([
      Order.find({ user: req.user._id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Order.countDocuments({ user: req.user._id }),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        orders,
        pagination: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/orders/:id
 */
const getOrderById = async (req, res, next) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, user: req.user._id });
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }
    return res.status(200).json({ success: true, data: { order } });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/orders/:id/cancel  (cancel by user when placed or confirmed)
 */
const cancelOrder = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { cancellationReason } = req.body || {};

    const order = await Order.findOne({ _id: id, user: req.user._id });
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    if (!['placed', 'confirmed'].includes(order.fulfillmentStatus)) {
      return res.status(400).json({
        success: false,
        message: `Order cannot be cancelled in "${order.fulfillmentStatus}" status.`,
      });
    }

    order.fulfillmentStatus = 'cancelled';
    order.cancelledAt = new Date();
    if (cancellationReason) {
      order.cancellationReason = cancellationReason;
    }

    // Restore stock
    for (const item of order.items) {
      await Product.findByIdAndUpdate(item.product, { $inc: { stock: item.quantity } });
    }

    await order.save();

    return res.status(200).json({
      success: true,
      message: 'Order cancelled successfully.',
      data: { order },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { createOrder, getMyOrders, getOrderById, cancelOrder };
