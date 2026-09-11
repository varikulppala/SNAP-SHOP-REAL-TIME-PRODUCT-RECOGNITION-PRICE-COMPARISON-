const axios = require('axios');
const path = require('path');

const SEARCH_URL = 'https://dummyjson.com/products/search';
const localProducts = require(path.join(__dirname, '../../data/products.json'));

function buildLinks(title) {
  const searchTerm = encodeURIComponent(title);
  return {
    amazon_link: `https://www.amazon.in/s?k=${searchTerm}`,
    flipkart_link: `https://www.flipkart.com/search?q=${searchTerm}`,
    jiomart_link: `https://www.jiomart.com/catalogsearch/result?q=${searchTerm}`,
    bigbasket_link: `https://www.bigbasket.com/ps/?q=${searchTerm}`,
    blinkit_link: `https://blinkit.com/s/?q=${searchTerm}`,
    dmart_link: `https://www.dmart.in/search?q=${searchTerm}`
  };
}

const BASE_RATINGS = { Amazon: 4.4, Flipkart: 4.2, JioMart: 4.1, BigBasket: 4.3, Blinkit: 4.2, DMart: 4.0 };

function buildProduct(item) {
  const title = item.title || item.product || 'Unknown product';
  const price = item.price ?? item.amazon ?? 0;
  return {
    title,
    price,
    rating: item.rating ?? 0,
    thumbnail: item.thumbnail || item.images?.[0] || '',
    prices: null,
    ratings: BASE_RATINGS,
    ...buildLinks(title)
  };
}

function normalize(s) {
  return (s || '').toLowerCase().replace(/['']/g, '').trim();
}

/** Fallback when DummyJSON fails or returns empty: local match or one result with links. */
function fallbackResults(query) {
  const q = normalize(query);
  const matches = localProducts.filter(
    (p) => p.product && normalize(p.product).includes(q) || q.includes(normalize(p.product))
  );
  const baseRatings = { Amazon: 4.4, Flipkart: 4.2, JioMart: 4.1, BigBasket: 4.3, Blinkit: 4.2, DMart: 4.0 };
  if (matches.length > 0) {
    return matches
      .map((p) => ({
        title: p.product,
        price: Math.min(p.amazon ?? 9999, p.flipkart ?? 9999, p.jiomart ?? 9999),
        rating: 4.0,
        thumbnail: '',
        prices: {
          Amazon: p.amazon ?? null,
          Flipkart: p.flipkart ?? null,
          JioMart: p.jiomart ?? null,
          BigBasket: p.bigbasket ?? null,
          Blinkit: p.blinkit ?? null,
          DMart: p.dmart ?? null
        },
        ratings: baseRatings,
        ...buildLinks(p.product)
      }))
      .sort((a, b) => a.price - b.price);
  }
  return [
    {
      title: query.trim(),
      price: 0,
      rating: 0,
      thumbnail: '',
      prices: null,
      ratings: null,
      ...buildLinks(query.trim())
    }
  ];
}

/**
 * Search products via DummyJSON API; fallback to local data or single result with links.
 */
async function searchProducts(productName) {
  if (!productName || typeof productName !== 'string') return [];
  const query = productName.trim();
  if (!query) return [];

  try {
    const response = await axios.get(`${SEARCH_URL}?q=${encodeURIComponent(query)}`, {
      timeout: 15000,
      validateStatus: (status) => status === 200
    });

    const products = response.data?.products || [];
    if (products.length === 0) return fallbackResults(query);

    const results = products.map((p) => buildProduct(p));
    results.sort((a, b) => a.price - b.price);
    return results;
  } catch (err) {
    console.error('productSearchService (DummyJSON failed, using fallback):', err.message);
    return fallbackResults(query);
  }
}

module.exports = {
  searchProducts
};
