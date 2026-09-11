const path = require('path');

const products = require(path.join(__dirname, '../../data/products.json'));

const buildSearchLink = (platform, productName) => {
  const q = encodeURIComponent(productName);
  switch (platform) {
    case 'Amazon':
      return `https://www.amazon.in/s?k=${q}`;
    case 'Flipkart':
      return `https://www.flipkart.com/search?q=${q}`;
    case 'JioMart':
      return `https://www.jiomart.com/catalogsearch/result?q=${q}`;
    case 'BigBasket':
      return `https://www.bigbasket.com/ps/?q=${q}`;
    case 'Blinkit':
      return `https://blinkit.com/s/?q=${q}`;
    case 'DMart':
      return `https://www.dmart.in/search?q=${q}`;
    default:
      return null;
  }
};

const baseRatings = {
  Amazon: 4.4,
  Flipkart: 4.2,
  JioMart: 4.1,
  BigBasket: 4.3,
  Blinkit: 4.2,
  DMart: 4.0
};

const comparePrices = (productName) => {
  if (!productName) return [];

  const query = productName.toLowerCase();

  const match =
    products.find((p) => p.product.toLowerCase() === query) ||
    products.find(
      (p) =>
        p.product.toLowerCase().includes(query) ||
        query.includes(p.product.toLowerCase())
    );

  if (!match) {
    return [];
  }

  const entries = [
    { platform: 'Amazon', price: match.amazon },
    { platform: 'Flipkart', price: match.flipkart },
    { platform: 'JioMart', price: match.jiomart },
    { platform: 'BigBasket', price: match.bigbasket },
    { platform: 'Blinkit', price: match.blinkit },
    { platform: 'DMart', price: match.dmart }
  ].filter((e) => typeof e.price === 'number');

  const results = entries.map((e, index) => {
    const base = baseRatings[e.platform] || 4.0;
    // Small deterministic variation per row so ratings look natural
    const rating = Math.max(3.5, Math.min(5, base + (index - 1) * 0.1));

    return {
      platform: e.platform,
      price: e.price,
      rating,
      link: buildSearchLink(e.platform, match.product)
    };
  });

  results.sort((a, b) => a.price - b.price);
  return results;
};

/** When no dataset or API prices exist: search links per platform so the UI is still useful. */
function fallbackPlatformSearchRows(productName) {
  if (!productName || !String(productName).trim()) return [];
  const name = String(productName).trim();
  return ['Amazon', 'Flipkart', 'JioMart', 'BigBasket', 'Blinkit', 'DMart'].map((platform, index) => {
    const base = baseRatings[platform] || 4.0;
    const rating = Math.max(3.5, Math.min(5, base + (index - 1) * 0.1));
    return {
      platform,
      price: null,
      rating,
      link: buildSearchLink(platform, name)
    };
  });
}

/** Major Indian retailers — shown first; match seller name or Shopping link host. */
const CANONICAL_PLATFORMS = [
  { platform: 'Amazon', patterns: [/amazon/i], hosts: ['amazon.in', 'amazon.com', 'amzn.'] },
  { platform: 'Flipkart', patterns: [/flipkart/i], hosts: ['flipkart.com', 'fkrt.it'] },
  { platform: 'JioMart', patterns: [/jiomart|jio\s*mart/i], hosts: ['jiomart.com'] },
  { platform: 'BigBasket', patterns: [/big\s*basket|bigbasket/i], hosts: ['bigbasket.com'] },
  { platform: 'Blinkit', patterns: [/blinkit|grofers/i], hosts: ['blinkit.com', 'grofers.com'] },
  { platform: 'DMart', patterns: [/d[\s-]?mart|dmart/i], hosts: ['dmart.in'] }
];

/** Google Shopping links are often redirects; decode adurl/url so we still detect retailer. */
function linkHaystackForRetailerMatch(link) {
  if (!link || typeof link !== 'string') return '';
  let hay = link.toLowerCase();
  try {
    const u = new URL(link);
    for (const param of ['adurl', 'url', 'u', 'q']) {
      const v = u.searchParams.get(param);
      if (!v) continue;
      try {
        const dec = decodeURIComponent(v.replace(/\+/g, ' '));
        if (/^https?:\/\//i.test(dec)) {
          hay += ` ${dec.toLowerCase()}`;
        }
      } catch (e) {
        // ignore
      }
    }
  } catch (e) {
    // ignore
  }
  return hay;
}

function rowBelongsToCanonical(row, { patterns, hosts }) {
  const src = String(row.source || row.seller || row.store || '').trim();
  if (src && patterns.some((p) => p.test(src))) return true;
  const haystack = linkHaystackForRetailerMatch(String(row.link || ''));
  return hosts.some((h) => haystack.includes(h));
}

/**
 * @param {string} productName
 * @param {Array<{ source?: string, price?: number, rating?: number, link?: string }>} serpRows - Google Shopping rows
 * @returns {Array<{ platform: string, price: number|null, rating: number|null, link: string }>}
 */
function mergeShoppingIntoCanonicalRows(productName, serpRows) {
  const name = String(productName || '').trim();
  if (!name) return [];

  const out = [];

  for (const def of CANONICAL_PLATFORMS) {
    const { platform } = def;
    const candidates = (serpRows || []).filter((r) => rowBelongsToCanonical(r, def));

    let best = null;
    let bestPrice = Infinity;
    for (const r of candidates) {
      const p = Number(r.price);
      if (p > 0 && p < bestPrice) {
        bestPrice = p;
        best = r;
      }
    }
    if (!best && candidates.length > 0) {
      best = candidates.reduce((a, b) => {
        const pa = Number(a.price) || Infinity;
        const pb = Number(b.price) || Infinity;
        return pa <= pb ? a : b;
      });
    }

    const base = baseRatings[platform] || 4.0;

    if (best && best.link && best.link !== '#') {
      out.push({
        platform,
        price: Number(best.price) > 0 ? Number(best.price) : null,
        rating: Number(best.rating) > 0 ? Number(best.rating) : base,
        link: best.link
      });
    } else {
      const link = buildSearchLink(platform, name);
      if (link) {
        out.push({
          platform,
          price: null,
          rating: base,
          link
        });
      }
    }
  }

  /** Only the six major rows (Amazon … DMart); no extra random Shopping sellers. */
  return out;
}

module.exports = {
  comparePrices,
  fallbackPlatformSearchRows,
  mergeShoppingIntoCanonicalRows
};

