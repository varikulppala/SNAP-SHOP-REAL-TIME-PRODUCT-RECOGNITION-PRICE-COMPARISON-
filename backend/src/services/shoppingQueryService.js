/**
 * Builds a tight search string for SerpAPI / platform links from Vision output.
 * Filters generic labels, dedupes tokens, and infers product type (e.g. AC) when Vision is vague.
 */

const { getSubcategoryShoppingHint } = require('../constants/storeCategories');
const { shouldUsePreciseShoppingQuery } = require('./searchApiService');

const WEAK_SINGLE_WORD =
  /^(unknown|product|thing|object|image|device|appliance|electronics?|white|black|indoor|outdoor)$/i;

function isWeakName(s) {
  if (s == null || typeof s !== 'string') return true;
  const t = s.trim();
  if (t.length < 2) return true;
  if (t.length <= 3 && !/\d/.test(t)) return WEAK_SINGLE_WORD.test(t);
  if (/^unknown product$/i.test(t)) return true;
  if (/^electronic device$/i.test(t)) return true;
  return false;
}

/** Only trust catalog resolution when it clearly matched our seed list. */
const RESOLVE_CONFIDENCE_FOR_SHOPPING = 0.82;

/** Whole phrases that hurt Shopping precision (remotes, accessories, wrong category). */
const GENERIC_LABEL_REGEX =
  /\b(electronic device|electronics|technology|machine|equipment|gadget|hardware|appliance)\b/i;

/** Labels that are too vague to add alone */
function isGenericNoisePhrase(s) {
  if (!s || typeof s !== 'string') return true;
  const t = s.trim();
  if (t.length < 2) return true;
  if (/\belectronic device\b/i.test(t)) return true;
  if (GENERIC_LABEL_REGEX.test(t) && t.length < 28) return true;
  if (/^machine$/i.test(t)) return true;
  if (/^technology$/i.test(t)) return true;
  return false;
}

/** Prefer specific product-type labels over generic Vision tags. */
function labelSpecificity(text) {
  if (!text) return -100;
  const t = text.toLowerCase();
  let score = 0;
  if (
    /\b(air conditioning|air conditioner|split ac|hvac|heat pump|cooling)\b/.test(t)
  ) {
    score += 120;
  }
  if (/\b(refrigerator|fridge|washing machine|microwave|oven|dishwasher)\b/.test(t)) {
    score += 120;
  }
  if (/\b(television|tv\b|laptop|smartphone|headphone|earphone|camera|tablet)\b/.test(t)) {
    score += 100;
  }
  if (/\b(furniture|sofa|chair|table|mattress)\b/.test(t)) score += 80;
  if (/\b(shirt|dress|shoe|jacket|watch|bag)\b/.test(t)) score += 80;
  if (/\b(major appliance|home appliance|kitchen appliance|gas stove)\b/.test(t)) {
    score += 45;
  }
  if (/\b(wall\b|mount(ed)?|indoor|outdoor unit)\b/.test(t)) score += 25;
  if (GENERIC_LABEL_REGEX.test(t)) score -= 60;
  if (/^machine$/i.test(t)) score -= 80;
  return score;
}

function rankLabelsBySpecificity(labels) {
  return [...labels]
    .filter((x) => x && typeof x === 'string')
    .sort((a, b) => labelSpecificity(b) - labelSpecificity(a));
}

/**
 * Logo text often reads "TCL Technology" — Shopping matches better on "TCL".
 */
function normalizeBrandForSearch(brand) {
  if (!brand || typeof brand !== 'string') return '';
  let b = brand.trim();
  b = b.replace(/\s+(technology|technologies|electronics|inc\.?|ltd\.?|corp\.?)$/i, '').trim();
  return b;
}

/**
 * When Vision never says "AC" but clearly shows a wall indoor unit + appliance labels.
 */
function inferProductTypeTail(labels, rawName, ocrHint) {
  const blob = [...labels, rawName || '', ocrHint || ''].join(' ').toLowerCase();

  if (/\b(air conditioning|air conditioner|split ac|hvac|heat pump)\b/.test(blob)) {
    return '';
  }

  if (
    /\b(major appliance|home appliance)\b/.test(blob) &&
    /\b(wall|indoor|mount|white\b|rectangle)\b/.test(blob)
  ) {
    return 'split air conditioner';
  }

  if (
    /\b(major appliance|home appliance|cooling)\b/.test(blob) &&
    /\b(tcl|lg|daikin|voltas|hitachi|carrier|mitsubishi|whirlpool)\b/.test(blob)
  ) {
    return 'air conditioner';
  }

  if (/\brefrigerat|fridge\b/.test(blob)) return 'refrigerator';
  if (/\bwashing machine\b/.test(blob)) return 'washing machine';

  return '';
}

const STOPWORDS = new Set([
  'the',
  'and',
  'or',
  'of',
  'a',
  'an',
  'device',
  'electronic',
  'electronics',
  'technology',
  'machine',
  'equipment',
  'product',
  'object',
  'image'
]);

function tokenizeUnique(phrases) {
  const ordered = [];
  const seen = new Set();
  for (const phrase of phrases) {
    if (!phrase) continue;
    for (const raw of String(phrase).split(/\s+/)) {
      const w = raw.replace(/[^\w]/g, '').toLowerCase();
      if (w.length < 2 || STOPWORDS.has(w)) continue;
      if (seen.has(w)) continue;
      seen.add(w);
      ordered.push(raw.replace(/[^\w\-]/g, ''));
      if (ordered.length >= 14) return ordered.join(' ');
    }
  }
  return ordered.join(' ');
}

function ocrLooksSpecific(ocr) {
  const s = (ocr || '').trim();
  if (s.length < 8) return false;
  if (/\d{2,}/.test(s)) return true;
  if (/[a-z]{2,}[\-_]\d|\d[\-_]?[a-z]{2,}/i.test(s)) return true;
  return false;
}

function finalizeQuery(q, storeCategory, storeSubcategory = '') {
  let out = q.replace(/\s+/g, ' ').trim();
  if (!shouldUsePreciseShoppingQuery(out)) {
    const subHint = getSubcategoryShoppingHint(storeCategory, storeSubcategory);
    if (subHint) {
      out = `${out} ${subHint}`.replace(/\s+/g, ' ').trim();
    }
  }
  if (out.length > 160) out = out.slice(0, 157) + '…';
  return out;
}

/**
 * @param {object} opts
 * @param {string} opts.rawName
 * @param {string} opts.brand
 * @param {string} opts.resolvedName
 * @param {number} opts.resolveConfidence
 * @param {string} opts.storeCategory
 * @param {string} [opts.storeSubcategory]
 * @param {string[]} opts.labels
 * @param {string} opts.ocrHint
 */
function buildShoppingSearchQuery(opts) {
  const {
    rawName = '',
    brand = '',
    resolvedName = '',
    resolveConfidence = 0,
    storeCategory = 'all',
    storeSubcategory = '',
    labels = [],
    ocrHint = ''
  } = opts;

  const ocr = (ocrHint || '').trim();

  const brandShort = normalizeBrandForSearch(brand);
  const rankedLabels = rankLabelsBySpecificity(labels);

  const catalogOk =
    resolvedName &&
    resolveConfidence >= RESOLVE_CONFIDENCE_FOR_SHOPPING &&
    !isWeakName(resolvedName);

  /** Strong on-image text beats a loose catalog match (avoids wrong product links). */
  if (catalogOk && !ocrLooksSpecific(ocr)) {
    const parts = [brandShort, resolvedName].filter(Boolean);
    let q = tokenizeUnique(parts) || parts.join(' ');
    q = finalizeQuery(q, storeCategory, storeSubcategory);
    if (q.length >= 8) return q;
  }

  const blobPreview = [brandShort, ocr, rawName].filter(Boolean).join(' ').trim();
  if (
    ocrLooksSpecific(ocr) ||
    (blobPreview && shouldUsePreciseShoppingQuery(blobPreview))
  ) {
    let typeTail = inferProductTypeTail(rankedLabels, rawName, ocr);
    if (storeCategory === 'electronics' && !typeTail && /\bappliance\b/i.test(rankedLabels.join(' '))) {
      typeTail = 'air conditioner';
    }
    if (storeCategory === 'home' && !typeTail) {
      const b = rankedLabels.join(' ').toLowerCase();
      if (/\b(appliance|wall|indoor)\b/.test(b)) typeTail = 'air conditioner';
    }
    const rawTrim = rawName && String(rawName).trim();
    const ocrLow = (ocr || '').toLowerCase();
    const rawLow = rawTrim ? rawTrim.toLowerCase() : '';
    const rawRedundant =
      rawTrim &&
      (ocrLow.includes(rawLow) || (rawLow.length >= 10 && ocrLow.includes(rawLow.slice(0, 12))));
    const orderedParts = [brandShort, ocr.trim(), rawRedundant ? '' : rawTrim, typeTail].filter(
      (x) => x && String(x).trim() && !isGenericNoisePhrase(String(x)) && !isWeakName(String(x))
    );
    let q = orderedParts.join(' ').replace(/\s+/g, ' ').trim();
    if (q.length < 6 && brandShort) {
      q = finalizeQuery(brandShort, storeCategory, storeSubcategory);
    } else {
      q = finalizeQuery(q, storeCategory, storeSubcategory);
    }
    if (q.length >= 6) return q;
  }

  const phraseParts = [];
  if (brandShort) phraseParts.push(brandShort);

  if (ocr.length >= 2 && ocr.length <= 100 && !GENERIC_LABEL_REGEX.test(ocr)) {
    phraseParts.push(ocr);
  }

  if (rawName && !isGenericNoisePhrase(rawName) && !isWeakName(rawName)) {
    phraseParts.push(rawName);
  }

  for (const L of rankedLabels) {
    if (phraseParts.length >= 5) break;
    if (!L || isGenericNoisePhrase(L)) continue;
    phraseParts.push(L);
  }

  let typeTail = inferProductTypeTail(rankedLabels, rawName, ocr);
  if (storeCategory === 'electronics' && !typeTail && /\bappliance\b/i.test(rankedLabels.join(' '))) {
    typeTail = 'air conditioner';
  }
  if (storeCategory === 'home' && !typeTail) {
    const b = rankedLabels.join(' ').toLowerCase();
    if (/\b(appliance|wall|indoor)\b/.test(b)) typeTail = 'air conditioner';
  }

  if (typeTail) phraseParts.push(typeTail);

  let q = tokenizeUnique(phraseParts);
  if (!q || q.length < 4) {
    q = [brandShort, rankedLabels.find((l) => !isGenericNoisePhrase(l)), typeTail]
      .filter(Boolean)
      .join(' ')
      .trim();
  }

  if (!q || q.length < 3) {
    q = (brandShort || rawName || 'product').trim();
  }

  return finalizeQuery(q, storeCategory, storeSubcategory);
}

module.exports = {
  buildShoppingSearchQuery,
  isWeakName,
  RESOLVE_CONFIDENCE_FOR_SHOPPING
};
