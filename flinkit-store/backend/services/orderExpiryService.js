const Order = require('../models/Order');
const Product = require('../models/Product');

let expiryTimer = null;
let isCleanupRunning = false;

/**
 * Sweeps for expired online orders that were abandoned before payment completed.
 * Releases reserved inventory back to product stock atomically.
 *
 * @param {number} [expiryMinutes] Order timeout in minutes (defaults to ORDER_EXPIRY_MINUTES or 30)
 * @returns {Promise<{ expiredCount: number, orderIds: string[], skipped?: boolean, error?: string }>}
 */
const cleanupExpiredOrders = async (expiryMinutes) => {
  if (isCleanupRunning) {
    return { expiredCount: 0, orderIds: [], skipped: true };
  }

  isCleanupRunning = true;

  try {
    const minutes = Number(expiryMinutes) || Number(process.env.ORDER_EXPIRY_MINUTES) || 30;
    const cutoffTime = new Date(Date.now() - minutes * 60 * 1000);

    // Find unpaid online orders older than cutoff that haven't been cancelled/restored yet
    const candidateOrders = await Order.find({
      paymentMethod: 'online',
      paymentStatus: { $in: ['pending', 'failed'] },
      fulfillmentStatus: 'placed',
      isStockRestored: { $ne: true },
      createdAt: { $lte: cutoffTime },
    })
      .select('_id items createdAt')
      .lean();

    if (!candidateOrders || candidateOrders.length === 0) {
      return { expiredCount: 0, orderIds: [] };
    }

    const expiredIds = [];

    for (const cand of candidateOrders) {
      // Concurrency-safe atomic transition: lock order and mark stock restored
      const order = await Order.findOneAndUpdate(
        {
          _id: cand._id,
          paymentStatus: { $in: ['pending', 'failed'] },
          fulfillmentStatus: 'placed',
          isStockRestored: { $ne: true },
        },
        {
          $set: {
            fulfillmentStatus: 'cancelled',
            isStockRestored: true,
            expiredAt: new Date(),
            cancellationReason: `Auto-cancelled: Payment not completed within ${minutes} minutes`,
          },
        },
        { new: true }
      );

      // If null, another process or customer action cancelled/paid it first
      if (!order) continue;

      // Restore stock for all items
      for (const item of order.items) {
        try {
          await Product.findByIdAndUpdate(item.product, {
            $inc: { stock: item.quantity },
          });
        } catch (err) {
          console.error(
            `[Order Expiry] Failed to restore stock for product ${item.product} in order ${order._id}:`,
            err?.message || err
          );
        }
      }

      expiredIds.push(order._id.toString());
      console.log(
        `[Order Expiry] Expired abandoned order ${order._id} (created at ${order.createdAt.toISOString()}) and restored stock.`
      );
    }

    return { expiredCount: expiredIds.length, orderIds: expiredIds };
  } catch (error) {
    console.error('[Order Expiry] Error during expired orders cleanup:', error?.message || error);
    return { expiredCount: 0, orderIds: [], error: error?.message };
  } finally {
    isCleanupRunning = false;
  }
};

/**
 * Starts background worker interval for order expiration
 */
const startOrderExpiryWorker = (intervalMs = 5 * 60 * 1000) => {
  if (expiryTimer) return;

  console.log(`[Order Expiry Worker] Starting background worker (interval: ${intervalMs / 1000}s)`);

  // Run initial sweep shortly after boot
  setTimeout(() => {
    cleanupExpiredOrders().catch((err) =>
      console.error('[Order Expiry Worker] Sweep error:', err?.message || err)
    );
  }, 10000);

  expiryTimer = setInterval(() => {
    cleanupExpiredOrders().catch((err) =>
      console.error('[Order Expiry Worker] Sweep error:', err?.message || err)
    );
  }, intervalMs);

  if (expiryTimer && expiryTimer.unref) {
    expiryTimer.unref();
  }
};

/**
 * Stops background worker interval
 */
const stopOrderExpiryWorker = () => {
  if (expiryTimer) {
    clearInterval(expiryTimer);
    expiryTimer = null;
    console.log('[Order Expiry Worker] Stopped background worker.');
  }
};

module.exports = {
  cleanupExpiredOrders,
  startOrderExpiryWorker,
  stopOrderExpiryWorker,
};

