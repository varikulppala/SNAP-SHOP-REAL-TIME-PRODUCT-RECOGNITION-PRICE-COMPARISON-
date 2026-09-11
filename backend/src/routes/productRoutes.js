const express = require('express');
const { detectProduct, searchProduct, priceLookup } = require('../controllers/productController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/detect', authMiddleware.optionalAuth, detectProduct);
router.post('/price-lookup', authMiddleware.optionalAuth, priceLookup);
router.post('/search', searchProduct);

module.exports = router;

