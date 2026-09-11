const express = require('express');
const {
  searchProducts,
  isSerpApiConfigured,
  normalizeSortOption
} = require('../services/searchApiService');
const {
  normalizeStoreCategory,
  normalizeStoreSubcategory
} = require('../constants/storeCategories');

const router = express.Router();

router.get('/search', async (req, res) => {
  try {
    const q = req.query.q;
    if (!q) {
      return res.status(400).json({ message: 'Query parameter q is required' });
    }

    if (!isSerpApiConfigured()) {
      return res.status(503).json({
        code: 'SERPAPI_NOT_CONFIGURED',
        message:
          'Quick Search uses SerpAPI only. Add SERPAPI_KEY (or SEARCH_API_KEY) to backend/.env and restart the server.'
      });
    }

    const category = normalizeStoreCategory(
      typeof req.query.category === 'string' ? req.query.category.trim() : 'all'
    );
    const subcategory = normalizeStoreSubcategory(
      category,
      typeof req.query.subcategory === 'string' ? req.query.subcategory.trim() : ''
    );
    const sort = normalizeSortOption(typeof req.query.sort === 'string' ? req.query.sort : 'price_asc');

    let products;
    try {
      products = await searchProducts(q, { category, subcategory, sort });
    } catch (err) {
      console.error('SerpAPI quick search failed:', err.message);
      return res.status(502).json({
        code: 'SERPAPI_ERROR',
        message: err.message || 'SerpAPI request failed. Check your API key, billing, and quota.'
      });
    }

    res.json({ products });
  } catch (err) {
    console.error('productSearch route error:', err);
    res.status(500).json({ message: err.message || 'Failed to search products' });
  }
});

module.exports = router;
