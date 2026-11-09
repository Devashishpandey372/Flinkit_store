const express = require('express');
const { body } = require('express-validator');
const { validate } = require('../middleware/validateRequest');
const { protect } = require('../middleware/authMiddleware');
const {
  getAddresses, addAddress, updateAddress, deleteAddress, checkServiceability,
} = require('../controllers/addressController');

const router = express.Router();

router.use(protect);

const addressValidation = [
  body('fullName').trim().notEmpty().withMessage('Full name is required'),
  body('phone').matches(/^[6-9]\d{9}$/).withMessage('Invalid Indian mobile number'),
  body('houseNumber').trim().notEmpty().withMessage('House/flat number is required'),
  body('street').trim().notEmpty().withMessage('Street/locality is required'),
  body('city').trim().notEmpty().withMessage('City is required'),
  body('state').trim().notEmpty().withMessage('State is required'),
  body('pinCode').matches(/^\d{6}$/).withMessage('Invalid PIN code'),
];

router.get('/', getAddresses);
router.post('/', addressValidation, validate, addAddress);
router.patch('/:id', addressValidation, validate, updateAddress);
router.delete('/:id', deleteAddress);
router.post('/check-serviceability', [
  body('pinCode').matches(/^\d{6}$/).withMessage('Invalid PIN code'),
], validate, checkServiceability);

module.exports = router;
