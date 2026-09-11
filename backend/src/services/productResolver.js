const path = require('path');

const products = require(path.join(__dirname, '../../data/products.json'));

// Generic Google Vision context words that should not affect
// product-catalog matching confidence.
const VISION_NOISE_WORDS = new Set([
  'illustration',
  'screenshot',
  'website',
  'webpage',
  'page',
  'icon',
  'online',
  'advertising'
]);

function normalize(str) {
  if (!str || typeof str !== 'string') return '';

  return str
    .toLowerCase()
    // Preserve apostrophe-based brand names such as Lay's as "lays".
    .replace(/['’]/g, '')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getKeywords(productName) {
  const n = normalize(productName);

  const words = n.split(' ').filter((w) => w.length >= 2);

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
 * Resolve raw detection (e.g. "bottle", "Coca Cola") to best match from our catalog.
 */
function resolveProduct(rawName) {
  if (!rawName || typeof rawName !== 'string') {
    return { resolvedName: 'Unknown product', confidence: 0 };
  }

  const raw = normalize(rawName);
  if (!raw) return { resolvedName: rawName.trim(), confidence: 0 };

  // Ignore generic Vision context words when calculating
  // catalog-match confidence.
  const rawWords = new Set(
    raw
      .split(' ')
      .filter((word) => word.length >= 2)
      .filter((word) => !VISION_NOISE_WORDS.has(word))
  );

  let best = { name: null, score: 0 };
  const candidateScores = [];

  for (const { name, keywords } of productKeywords) {
    const nameNorm = normalize(name);

    // Preserve existing exact/contains behavior.
    if (nameNorm === raw || nameNorm.includes(raw) || raw.includes(nameNorm)) {
      return { resolvedName: name, confidence: 0.95 };
    }

    let score = 0;
    const matchedKeywords = [];

    for (const kw of keywords) {
      if (
        rawWords.has(kw) ||
        [...rawWords].some((word) => word.includes(kw))
      ) {
        score += 1;
        matchedKeywords.push(kw);
      }
    }

    if (score > 0) {
      candidateScores.push({
        name,
        score,
        matchedKeywords
      });
    }

    if (
      rawWords.size > 0 &&
      score / Math.max(rawWords.size, 1) >= 0.3 &&
      score > best.score
    ) {
      best = { name, score };
    }
  }

  // A meaningful keyword that uniquely identifies one catalog product
  // is strong evidence even when Vision adds noisy context words.
  const uniqueCandidates = candidateScores.filter(
    (candidate) =>
      candidate.matchedKeywords.some(
        (keyword) => keyword.length >= 4
      )
  );

  if (uniqueCandidates.length === 1) {
    const candidate = uniqueCandidates[0];

    return {
      resolvedName: candidate.name,
      confidence: 0.9
    };
  }

  if (best.name) {
    return {
      resolvedName: best.name,
      confidence: Math.min(0.9, 0.5 + best.score * 0.1)
    };
  }

  return { resolvedName: rawName.trim(), confidence: 0 };
}

module.exports = {
  resolveProduct
};