const axios = require('axios');
const { URL } = require('url');
const {
  normalizeStoreCategory,
  normalizeStoreSubcategory,
  getSubcategoryShoppingHint
} = require('../constants/storeCategories');

const SERP_API_URL = 'https://serpapi.com/search.json';

function getSerpApiKey() {
  const raw = process.env.SERPAPI_KEY || process.env.SEARCH_API_KEY || '';
  return String(raw).trim().replace(/^["']|["']$/g, '');
}

const BASE_RATINGS = { Amazon: 4.4, Flipkart: 4.2, JioMart: 4.1, BigBasket: 4.3, Blinkit: 4.2, DMart: 4.0 };

/** Optional category hint merged into `q` so Google Shopping stays on-topic (e.g. “apple” + grocery). */
const CATEGORY_QUERY_HINT = {
  all: '',
  electronics: 'electronics',
  fashion: 'fashion clothing',
  grocery: 'grocery food',
  home: 'home kitchen',
  beauty: 'beauty personal care',
  sports: 'sports outdoors',
  books: 'books',
  toys: 'toys games',
  health: 'health wellness'
};

const DEFAULT_MAX_PAGES = Math.max(1, parseInt(process.env.SERP_SHOPPING_MAX_PAGES || '4', 10) || 4);
const DEFAULT_MAX_PRODUCTS = Math.max(10, parseInt(process.env.SERP_SHOPPING_MAX_PRODUCTS || '60', 10) || 60);

const ALLOWED_SORT = new Set(['price_asc', 'price_desc', 'rating_desc', 'reviews_desc']);

function normalizeSortOption(raw) {
  if (typeof raw !== 'string') return 'price_asc';
  const v = raw.trim();
  return ALLOWED_SORT.has(v) ? v : 'price_asc';
}

/** SerpAPI google_shopping: 1 = low→high, 2 = high→low. Other sorts use 1 for fetch; order is applied after merge. */
function serpApiSortByParam(sort) {
  if (sort === 'price_desc') return '2';
  return '1';
}

function applyResultSort(products, sort) {
  const list = [...products];
  switch (sort) {
    case 'price_desc':
      list.sort((a, b) => (Number(b.price) || 0) - (Number(a.price) || 0));
      break;
    case 'rating_desc':
      list.sort((a, b) => {
        const dr = (Number(b.rating) || 0) - (Number(a.rating) || 0);
        if (dr !== 0) return dr;
        return (Number(b.reviews) || 0) - (Number(a.reviews) || 0);
      });
      break;
    case 'reviews_desc':
      list.sort((a, b) => {
        const dw = (Number(b.reviews) || 0) - (Number(a.reviews) || 0);
        if (dw !== 0) return dw;
        return (Number(b.rating) || 0) - (Number(a.rating) || 0);
      });
      break;
    case 'price_asc':
    default:
      list.sort((a, b) => {
        const pa = Number(a.price);
        const pb = Number(b.price);
        const aOk = pa > 0;
        const bOk = pb > 0;
        if (aOk && bOk) return pa - pb;
        if (aOk) return -1;
        if (bOk) return 1;
        return 0;
      });
  }
  return list;
}

/** Queries that already name a model/spec should not get extra “electronics / fashion …” tails (hurts exact Shopping matches). */
function shouldUsePreciseShoppingQuery(rawQuery) {
  const q = (rawQuery || '').trim();
  if (q.length >= 26) return true;
  if (/\b(?:gb|tb|kg|mah|mm|cm|inch|hz|w|v|ton)\b/i.test(q)) return true;
  if (/\d{3,}/.test(q)) return true;
  if (/[a-z]{2,}[\-_]\d{2,}|\d{2,}[a-z]{2,}/i.test(q)) return true;
  return false;
}

function buildShoppingQuery(rawQuery, categoryKey, subcategoryKey = '', precise = false) {
  const q = (rawQuery || '').trim();
  if (!q) return '';
  if (precise) return q;
  const cat = normalizeStoreCategory(categoryKey);
  const sub = normalizeStoreSubcategory(cat, subcategoryKey);
  const hint = CATEGORY_QUERY_HINT[cat] || CATEGORY_QUERY_HINT.all;
  const subHint = getSubcategoryShoppingHint(cat, sub);
  const merged = [hint, subHint].filter(Boolean).join(' ');
  if (!merged) return q;
  return `${q} ${merged}`.trim();
}

const TITLE_MATCH_STOP = new Set([
  'the',
  'and',
  'for',
  'with',
  'from',
  'new',
  'buy',
  'pack',
  'set',
  'off',
  'get',
  'all',
  'your',
  'our'
]);

function extractTitleMatchTerms(rawQuery) {
  const q = (rawQuery || '').toLowerCase().replace(/[.,;:'"()]/g, ' ');
  const terms = [];
  for (const w of q.split(/\s+/)) {
    if (!w || w.length < 2) continue;
    if (TITLE_MATCH_STOP.has(w)) continue;
    if (w.length >= 3 || /\d/.test(w)) terms.push(w);
  }
  return terms;
}

function compactAlnum(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[\s\-_./]/g, '');
}

/**
 * Drop Shopping rows whose titles barely overlap the query (reduces wrong-product links after upload).
 */
function filterShoppingResultsByQuery(products, rawQuery) {
  if (!products.length) return products;
  const terms = extractTitleMatchTerms(rawQuery);
  if (terms.length === 0) return products;

  const scored = products.map((p) => {
    const t = (p.title || '').toLowerCase();
    const tCompact = compactAlnum(p.title || '');
    const hits = terms.filter((term) => {
      if (t.includes(term)) return true;
      const c = compactAlnum(term);
      if (c.length >= 5 && tCompact.includes(c)) return true;
      return false;
    }).length;
    return { p, hits };
  });

  const need = terms.length <= 2 ? 1 : Math.max(2, Math.ceil(terms.length * 0.45));
  const kept = scored.filter((x) => x.hits >= need).map((x) => x.p);
  return kept.length > 0 ? kept : products;
}

function dedupeKey(item) {
  if (item.product_id != null) return `id:${item.product_id}`;
  const link = item.product_link || item.link || item.tracking_link || '';
  if (link) return `link:${link}`;
  const title = (item.title || '').trim();
  const price = item.extracted_price ?? item.price ?? '';
  return `t:${title}|${price}`;
}

function collectShoppingArrays(data) {
  if (!data) return [];
  const out = [];
  const push = (arr) => {
    if (Array.isArray(arr)) out.push(...arr);
  };
  push(data.shopping_results);
  push(data.inline_shopping_results);
  const categorized = data.categorized_shopping_results;
  if (Array.isArray(categorized)) {
    for (const block of categorized) {
      push(block?.shopping_results);
    }
  }
  return out;
}

function parseSerpShoppingPrice(item) {
  const asNum = (v) => {
    const n = Number(v);
    return !Number.isNaN(n) && n > 0 ? n : 0;
  };
  let p = asNum(item.extracted_price);
  if (p) return p;
  for (const key of ['price', 'old_price', 'delivery_price']) {
    const raw = item[key];
    if (raw == null) continue;
    if (typeof raw === 'number') {
      p = asNum(raw);
      if (p) return p;
      continue;
    }
    const s = String(raw).replace(/[^\d.,]/g, '').replace(/,/g, '');
    const f = parseFloat(s);
    if (!Number.isNaN(f) && f > 0) return f;
  }
  return 0;
}

function mapShoppingItem(item) {
  const price = parseSerpShoppingPrice(item);
  const title = item.title || 'Product';
  return {
    title,
    source: item.source || item.seller || item.store || item.merchant || '',
    price: Number(price) || 0,
    link: item.link || item.product_link || item.tracking_link || item.source_link || '#',
    image: item.thumbnail || item.image || item.image_link || '',
    rating: item.rating ?? 0,
    reviews: item.reviews ?? 0,
    prices: null,
    ratings: BASE_RATINGS,
    ...buildPlatformLinks(title)
  };
}

function buildPlatformLinks(title) {
  const q = encodeURIComponent(title || '');
  return {
    amazon_link: `https://www.amazon.in/s?k=${q}`,
    flipkart_link: `https://www.flipkart.com/search?q=${q}`,
    jiomart_link: `https://www.jiomart.com/catalogsearch/result?q=${q}`,
    bigbasket_link: `https://www.bigbasket.com/ps/?q=${q}`,
    blinkit_link: `https://blinkit.com/s/?q=${q}`,
    dmart_link: `https://www.dmart.in/search?q=${q}`
  };
}

function formatSerpApiError(err) {
  if (axios.isAxiosError(err) && err.response) {
    const status = err.response.status;
    const body = err.response.data;
    let detail = '';
    if (body && typeof body === 'object') {
      detail = body.error || body.message || '';
    } else if (typeof body === 'string') {
      detail = body;
    }
    if (status === 401 || status === 403) {
      return (
        detail ||
        'SerpAPI rejected your API key (401). Copy the key from https://serpapi.com/manage-api-key — set SERPAPI_KEY in backend/.env with no quotes or spaces, then restart the backend.'
      );
    }
    if (detail) return `SerpAPI error (${status}): ${detail}`;
    return `SerpAPI error (${status}). Check your account usage and billing.`;
  }
  return err.message || 'SerpAPI request failed';
}

/**
 * Search products using SerpAPI (Google Shopping).
 * Merges main, inline, and categorized blocks; follows pagination for more results.
 */
async function searchProducts(productName, options = {}) {
  if (!productName || typeof productName !== 'string') return [];
  const category =
    options.category && CATEGORY_QUERY_HINT[normalizeStoreCategory(options.category)] !== undefined
      ? normalizeStoreCategory(options.category)
      : 'all';
  const subcategory = normalizeStoreSubcategory(category, options.subcategory);
  const sort = normalizeSortOption(options.sort);
  const precise =
    options.precise === true || (options.precise !== false && shouldUsePreciseShoppingQuery(productName));
  const query = buildShoppingQuery(productName, category, subcategory, precise);
  if (!query) return [];

  const apiKey = getSerpApiKey();
  if (!apiKey) {
    throw new Error('SERPAPI_KEY is required. Add it to your .env file.');
  }

  const maxPages = Math.min(Math.max(Number(options.maxPages) || DEFAULT_MAX_PAGES, 1), 8);
  const requestedMax = Math.min(Math.max(Number(options.maxProducts) || DEFAULT_MAX_PRODUCTS, 10), 120);
  let fetchMax = requestedMax;
  if (precise && fetchMax < 28) {
    fetchMax = 28;
  }

  const baseParams = {
    engine: 'google_shopping',
    q: query,
    api_key: apiKey,
    google_domain: 'google.co.in',
    gl: 'in',
    hl: 'en',
    device: 'desktop',
    sort_by: serpApiSortByParam(sort)
  };

  const seen = new Set();
  const mergedItems = [];

  try {
    let data = (
      await axios.get(SERP_API_URL, {
        params: baseParams,
        timeout: 20000
      })
    ).data;

    for (let page = 0; page < maxPages; page += 1) {
      for (const item of collectShoppingArrays(data)) {
        const key = dedupeKey(item);
        if (seen.has(key)) continue;
        seen.add(key);
        mergedItems.push(item);
        if (mergedItems.length >= fetchMax) break;
      }
      if (mergedItems.length >= fetchMax) break;

      const next = data?.serpapi_pagination?.next;
      if (!next || page >= maxPages - 1) break;

      const nextUrl = new URL(next);
      nextUrl.searchParams.set('api_key', apiKey);
      data = (
        await axios.get(nextUrl.toString(), {
          timeout: 20000
        })
      ).data;
    }
  } catch (err) {
    throw new Error(formatSerpApiError(err));
  }

  let products = applyResultSort(
    mergedItems.map((item) => mapShoppingItem(item)),
    sort
  );
  if (precise && products.length > 1) {
    products = filterShoppingResultsByQuery(products, productName);
  }
  return products.slice(0, requestedMax);
}

function isSerpApiConfigured() {
  return Boolean(getSerpApiKey());
}

module.exports = {
  searchProducts,
  isSerpApiConfigured,
  normalizeSortOption,
  shouldUsePreciseShoppingQuery
};
