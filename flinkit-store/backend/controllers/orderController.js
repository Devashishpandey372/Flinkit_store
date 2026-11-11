const mongoose = require('mongoose');
const Order = require('../models/Order');
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const Address = require('../models/Address');

const DELIVERY_FEE = 40;
const FREE_DELIVERY_THRESHOLD = 499;

/**
 * Compensating rollback helper when MongoDB multi-document transactions are unavailable
 */
const rollbackDeductions = async (deductedItems, sessionOption = {}) => {
  if (!deductedItems || deductedItems.length === 0) return;
  for (const ded of deductedItems) {
    try {
      await Product.findByIdAndUpdate(
        ded.productId,
        { $inc: { stock: ded.quantity } },
        sessionOption
      );
    } catch (err) {
      console.error(
        `[Inventory Rollback] Failed to restore stock for product ${ded.productId}:`,
        err?.message || err
      );
    }
  }
};

/**
 * POST /api/orders  — create a new order (atomic stock reservation)
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
  const deductedItems = [];

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

    // Build order items and atomically reserve stock
    const orderItems = [];
    let subtotal = 0;

    for (const item of cart.items) {
      const productId = item.product?._id || item.product;
      const requestedQty = Number(item.quantity);

      if (!requestedQty || requestedQty <= 0) {
        if (session) {
          await session.abortTransaction();
        } else {
          await rollbackDeductions(deductedItems);
        }
        return res.status(400).json({
          success: false,
          message: 'Invalid item quantity.',
        });
      }

      // Concurrency-safe atomic deduction:
      // Decrements stock ONLY IF current stock >= requestedQty AND product is active & not out of stock
      const updatedProduct = await Product.findOneAndUpdate(
        {
          _id: productId,
          stock: { $gte: requestedQty },
          isActive: true,
          availabilityStatus: { $ne: 'out_of_stock' },
        },
        {
          $inc: { stock: -requestedQty },
        },
        {
          new: true,
          ...sessionOption,
        }
      );

      if (!updatedProduct) {
        if (session) {
          await session.abortTransaction();
        } else {
          await rollbackDeductions(deductedItems);
        }

        const currentProduct = await Product.findById(productId, null, sessionOption);
        if (!currentProduct || !currentProduct.isActive || currentProduct.availabilityStatus === 'out_of_stock') {
          return res.status(400).json({
            success: false,
            message: `Product "${item.product?.name || 'Item'}" is out of stock or unavailable.`,
          });
        }
        return res.status(400).json({
          success: false,
          message: `Only ${currentProduct.stock} unit(s) of "${currentProduct.name}" available.`,
        });
      }

      deductedItems.push({
        productId,
        quantity: requestedQty,
      });

      orderItems.push({
        product: updatedProduct._id,
        name: updatedProduct.name,
        image: updatedProduct.image,
        unit: updatedProduct.unit,
        sellingPrice: updatedProduct.sellingPrice,
        originalPrice: updatedProduct.originalPrice,
        quantity: requestedQty,
      });

      subtotal += updatedProduct.sellingPrice * requestedQty;
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
      isStockRestored: false,
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
    } else {
      await rollbackDeductions(deductedItems);
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

    // Concurrency-safe atomic state transition:
    // Only match if fulfillmentStatus is 'placed' or 'confirmed' AND stock hasn't already been restored
    const order = await Order.findOneAndUpdate(
      {
        _id: id,
        user: req.user._id,
        fulfillmentStatus: { $in: ['placed', 'confirmed'] },
        isStockRestored: { $ne: true },
      },
      {
        $set: {
          fulfillmentStatus: 'cancelled',
          cancelledAt: new Date(),
          isStockRestored: true,
          ...(cancellationReason ? { cancellationReason } : {}),
        },
      },
      { new: true }
    );

    if (!order) {
      const existing = await Order.findOne({ _id: id, user: req.user._id });
      if (!existing) {
        return res.status(404).json({ success: false, message: 'Order not found.' });
      }
      return res.status(400).json({
        success: false,
        message: `Order cannot be cancelled in "${existing.fulfillmentStatus}" status or stock has already been restored.`,
      });
    }

    // Restore stock exactly once
    for (const item of order.items) {
      await Product.findByIdAndUpdate(item.product, { $inc: { stock: item.quantity } });
    }

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
