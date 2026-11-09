const Cart = require('../models/Cart');
const Product = require('../models/Product');

/**
 * GET /api/cart
 */
const getCart = async (req, res, next) => {
  try {
    let cart = await Cart.findOne({ user: req.user._id }).populate({
      path: 'items.product',
      populate: { path: 'category', select: 'name slug' },
    });

    if (!cart) {
      cart = { items: [] };
    }

    return res.status(200).json({ success: true, data: { cart } });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/cart/items  { productId, quantity }
 */
const addToCart = async (req, res, next) => {
  try {
    const { productId, quantity = 1 } = req.body;

    const product = await Product.findOne({ _id: productId, isActive: true });
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found or unavailable.' });
    }
    if (product.stock < 1) {
      return res.status(400).json({ success: false, message: 'Product is out of stock.' });
    }

    let cart = await Cart.findOne({ user: req.user._id });

    if (!cart) {
      cart = new Cart({ user: req.user._id, items: [] });
    }

    const existingItemIdx = cart.items.findIndex(
      (i) => i.product.toString() === productId
    );

    const requestedQty = existingItemIdx >= 0
      ? cart.items[existingItemIdx].quantity + quantity
      : quantity;

    if (requestedQty > product.stock) {
      return res.status(400).json({
        success: false,
        message: `Only ${product.stock} unit(s) available.`,
      });
    }

    if (existingItemIdx >= 0) {
      cart.items[existingItemIdx].quantity = requestedQty;
    } else {
      cart.items.push({ product: productId, quantity });
    }

    await cart.save();
    await cart.populate({ path: 'items.product', populate: { path: 'category', select: 'name slug' } });

    return res.status(200).json({ success: true, message: 'Cart updated.', data: { cart } });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/cart/items/:productId  { quantity }
 */
const updateCartItem = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const { quantity } = req.body;

    if (quantity < 1) {
      return res.status(400).json({ success: false, message: 'Quantity must be at least 1.' });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }
    if (quantity > product.stock) {
      return res.status(400).json({
        success: false,
        message: `Only ${product.stock} unit(s) available.`,
      });
    }

    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      return res.status(404).json({ success: false, message: 'Cart not found.' });
    }

    const itemIdx = cart.items.findIndex((i) => i.product.toString() === productId);
    if (itemIdx === -1) {
      return res.status(404).json({ success: false, message: 'Item not in cart.' });
    }

    cart.items[itemIdx].quantity = quantity;
    await cart.save();
    await cart.populate({ path: 'items.product', populate: { path: 'category', select: 'name slug' } });

    return res.status(200).json({ success: true, message: 'Cart updated.', data: { cart } });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/cart/items/:productId
 */
const removeCartItem = async (req, res, next) => {
  try {
    const { productId } = req.params;

    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      return res.status(404).json({ success: false, message: 'Cart not found.' });
    }

    cart.items = cart.items.filter((i) => i.product.toString() !== productId);
    await cart.save();
    await cart.populate({ path: 'items.product', populate: { path: 'category', select: 'name slug' } });

    return res.status(200).json({ success: true, message: 'Item removed from cart.', data: { cart } });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/cart  (clear entire cart)
 */
const clearCart = async (req, res, next) => {
  try {
    await Cart.findOneAndUpdate({ user: req.user._id }, { items: [] });
    return res.status(200).json({ success: true, message: 'Cart cleared.' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getCart, addToCart, updateCartItem, removeCartItem, clearCart };
