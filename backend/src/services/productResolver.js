const path = require('path');

const products = require(path.join(__dirname, '../../data/products.json'));

function normalize(str) {
  if (!str || typeof str !== 'string') return '';
  return str
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getKeywords(productName) {
  const n = normalize(productName);
  const words = n.split(' ').filter(Boolean);
  const keywords = new Set(words);
  words.forEach((w) => {
    if (w.length >= 3) keywords.add(w);
    if (w.length >= 4) keywords.add(w.slice(0, 4));
  });
  return keywords;
}

const productKeywords = products.map((p) => ({
  name: p.product,
  keywords: getKeywords(p.product)
}));

/**
 * Resolve raw detection (e.g. "bottle", "Coca Cola") to best match from our 30 products.
 */
function resolveProduct(rawName) {
  if (!rawName || typeof rawName !== 'string') {
    return { resolvedName: 'Unknown product', confidence: 0 };
  }

  const raw = normalize(rawName);
  if (!raw) return { resolvedName: rawName.trim(), confidence: 0 };

  const rawWords = new Set(raw.split(' ').filter(Boolean));
  let best = { name: null, score: 0 };

  for (const { name, keywords } of productKeywords) {
    const nameNorm = normalize(name);
    if (nameNorm === raw || nameNorm.includes(raw) || raw.includes(nameNorm)) {
      return { resolvedName: name, confidence: 0.95 };
    }
    let score = 0;
    for (const kw of keywords) {
      if (rawWords.has(kw) || raw.includes(kw)) score += 1;
    }
    if (rawWords.size > 0 && score / Math.max(rawWords.size, 1) >= 0.3 && score > best.score) {
      best = { name, score };
    }
  }

  if (best.name) {
    return { resolvedName: best.name, confidence: Math.min(0.9, 0.5 + best.score * 0.1) };
  }
  return { resolvedName: rawName.trim(), confidence: 0 };
}

module.exports = {
  resolveProduct
};
