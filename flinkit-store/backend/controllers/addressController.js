const Address = require('../models/Address');

/**
 * GET /api/addresses
 */
const getAddresses = async (req, res, next) => {
  try {
    const addresses = await Address.find({ user: req.user._id }).sort({ isDefault: -1, createdAt: -1 });
    return res.status(200).json({ success: true, data: { addresses } });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/addresses
 */
const addAddress = async (req, res, next) => {
  try {
    const { fullName, phone, houseNumber, street, landmark, city, state, pinCode, deliveryInstructions, isDefault } = req.body;

    // If this is marked as default, unset any existing default
    if (isDefault) {
      await Address.updateMany({ user: req.user._id }, { isDefault: false });
    }

    // If it's the user's first address, auto-set as default
    const count = await Address.countDocuments({ user: req.user._id });
    const shouldBeDefault = isDefault || count === 0;

    const address = await Address.create({
      user: req.user._id,
      fullName, phone, houseNumber, street, landmark,
      city, state, pinCode, deliveryInstructions,
      isDefault: shouldBeDefault,
    });

    return res.status(201).json({ success: true, message: 'Address added.', data: { address } });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/addresses/:id
 */
const updateAddress = async (req, res, next) => {
  try {
    const address = await Address.findOne({ _id: req.params.id, user: req.user._id });
    if (!address) {
      return res.status(404).json({ success: false, message: 'Address not found.' });
    }

    if (req.body.isDefault) {
      await Address.updateMany({ user: req.user._id }, { isDefault: false });
    }

    Object.assign(address, req.body);
    await address.save();

    return res.status(200).json({ success: true, message: 'Address updated.', data: { address } });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/addresses/:id
 */
const deleteAddress = async (req, res, next) => {
  try {
    const address = await Address.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!address) {
      return res.status(404).json({ success: false, message: 'Address not found.' });
    }

    // If deleted was default, set the next one as default
    if (address.isDefault) {
      const next = await Address.findOne({ user: req.user._id }).sort({ createdAt: -1 });
      if (next) { next.isDefault = true; await next.save(); }
    }

    return res.status(200).json({ success: true, message: 'Address deleted.' });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/addresses/check-serviceability
 */
const checkServiceability = async (req, res, next) => {
  try {
    const { pinCode } = req.body;
    const serviceable = (process.env.SERVICEABLE_PINCODES || '').split(',').map((p) => p.trim());
    const isServiceable = serviceable.includes(String(pinCode));
    return res.status(200).json({
      success: true,
      data: { isServiceable, pinCode },
      message: isServiceable ? 'Delivery available at this PIN code.' : 'Sorry, we do not deliver to this PIN code yet.',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAddresses, addAddress, updateAddress, deleteAddress, checkServiceability };
