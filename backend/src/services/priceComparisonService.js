const {
  comparePrices,
  fallbackPlatformSearchRows,
  mergeShoppingIntoCanonicalRows
} = require('./priceService');
const { searchProducts, isSerpApiConfigured } = require('./searchApiService');

/**
 * Online price rows for PriceTable: local JSON first, then SerpAPI merged into
 * Amazon / Flipkart / JioMart / BigBasket / Blinkit / DMart (+ a few other sellers).
 */
async function searchPrices(productName, options = {}) {
  if (!productName || !String(productName).trim()) return [];

  const name = String(productName).trim();
  const local = comparePrices(name);
  if (local.length > 0) return local;

  const category = options.category || 'all';
  const subcategory = options.subcategory || '';

  if (isSerpApiConfigured()) {
    try {
      const rows = await searchProducts(name, {
        category,
        subcategory,
        maxPages: 2,
        maxProducts: 40,
        /** Keep broad Shopping rows so we can match Amazon/Flipkart prices (precise filter drops too many). */
        precise: false
      });
      const withLinks = rows.filter((r) => r.link && r.link !== '#');
      const merged = mergeShoppingIntoCanonicalRows(name, withLinks);
      if (merged.length > 0) return merged;
    } catch (e) {
      console.warn('SerpAPI price lookup failed:', e.message);
    }
  }

  return fallbackPlatformSearchRows(name);
}

module.exports = {
  searchPrices
};
