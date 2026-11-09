const express = require('express');
const { getProducts, searchProducts, getProductById } = require('../controllers/productController');

const router = express.Router();

router.get('/search', searchProducts);
router.get('/', getProducts);
router.get('/:id', getProductById);

module.exports = router;
