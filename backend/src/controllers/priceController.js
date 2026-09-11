const { searchPrices } = require('../services/priceComparisonService');
const {
  normalizeStoreCategory,
  normalizeStoreSubcategory
} = require('../constants/storeCategories');

const getPrices = async (req, res) => {
  try {
    const productName = decodeURIComponent(req.params.product);
    if (!productName) {
      return res.status(400).json({ message: 'Product name is required' });
    }

    const category = normalizeStoreCategory(req.query.category);
    const subcategory = normalizeStoreSubcategory(category, req.query.subcategory);
    const prices = await searchPrices(productName, { category, subcategory });
    res.json({ product: productName, prices });
  } catch (err) {
    console.error('getPrices error', err);
    res.status(500).json({ message: 'Failed to fetch prices' });
  }
};

module.exports = {
  getPrices
};

