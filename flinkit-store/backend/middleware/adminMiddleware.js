/**
 * Admin and Shopkeeper Authorization Middleware
 */

// Strictly Master Admin Only
const adminOnly = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Master Admin privileges required.',
    });
  }
  next();
};

// Master Admin OR Approved Active Shopkeeper
const adminOrShopkeeper = (req, res, next) => {
  if (!req.user || !['admin', 'shopkeeper'].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Shopkeeper or Admin privileges required.',
    });
  }

  // Shopkeeper lifecycle status checks
  if (req.user.role === 'shopkeeper') {
    if (req.user.approvalStatus === 'suspended') {
      return res.status(403).json({
        success: false,
        message: 'Your shopkeeper account has been suspended by the Master Admin. Please contact support.',
      });
    }

    if (req.user.approvalStatus === 'rejected') {
      return res.status(403).json({
        success: false,
        message: 'Your shopkeeper application was rejected by the Master Admin.',
      });
    }

    if (req.user.approvalStatus === 'pending' || req.user.isApproved === false) {
      return res.status(403).json({
        success: false,
        message: 'Your shopkeeper account is awaiting Master Admin approval. Please contact support.',
      });
    }
  }

  if (!req.user.isActive) {
    return res.status(403).json({
      success: false,
      message: 'Account has been deactivated. Contact support.',
    });
  }

  next();
};

module.exports = { adminOnly, adminOrShopkeeper };
