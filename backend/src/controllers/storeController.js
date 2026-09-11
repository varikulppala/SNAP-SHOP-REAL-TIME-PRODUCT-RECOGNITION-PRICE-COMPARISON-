const { findNearbyStores: findNearbyMaps } = require('../services/mapsService');
const { findNearbyStores: findNearbyByKeyword } = require('../services/storeService');
const { comparePrices } = require('../services/priceService');
const {
  normalizeStoreCategory,
  normalizeStoreSubcategory
} = require('../constants/storeCategories');

const getNearby = async (req, res) => {
  try {
    const { lat, lng, productName, product, category, subcategory } = req.query;
    if (!lat || !lng) {
      return res.status(400).json({ message: 'lat and lng are required' });
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);
    const keyword = productName || product || '';
    const categoryKey = normalizeStoreCategory(category);
    const subKey = normalizeStoreSubcategory(categoryKey, subcategory);

    // Use mapsService for nearby shops; category / subcategory narrows Google Place types
    let stores = await findNearbyMaps(latitude, longitude, keyword, categoryKey, subKey);
    // If no results from mapsService, fallback to keyword search
    if (stores.length === 0 && keyword.trim()) {
      stores = await findNearbyByKeyword(keyword.trim(), latitude, longitude);
    }

    // Add product price from dataset if productName provided
    let basePrice = null;
    if (productName) {
      try {
        const prices = comparePrices(productName);
        if (prices && prices.length > 0) basePrice = prices[0].price;
      } catch (e) {
        // ignore
      }
    }

    const withPrice = stores.map((store, index) => {
      let price = null;
      if (typeof basePrice === 'number') {
        const delta = (index % 3 - 1) * 2;
        price = Math.max(1, basePrice + delta);
      }
      return { ...store, price };
    });

    res.json({
      productName: keyword || productName,
      category: categoryKey,
      subcategory: subKey || undefined,
      stores: withPrice
    });
  } catch (err) {
    console.error('getNearby error', err);
    res.status(500).json({ message: 'Failed to fetch nearby stores' });
  }
};

const getConfig = (req, res) => {
  const mapsApiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.GOOGLE_PLACES_API_KEY || '';
  res.json({ mapsApiKey });
};

module.exports = {
  getNearby,
  getConfig
};

