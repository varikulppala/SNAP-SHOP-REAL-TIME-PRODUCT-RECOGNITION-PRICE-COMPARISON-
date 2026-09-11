const axios = require('axios');

const VISION_API_KEY = process.env.GOOGLE_VISION_API_KEY;
const VISION_URL = 'https://vision.googleapis.com/v1/images:annotate';

/**
 * Detect product from image using Google Vision API (structured features only — no OCR).
 * Uses WEB_DETECTION (best-guess + web entities), LOGO_DETECTION, LABEL_DETECTION.
 */
async function detectProductFromImage(imageBase64) {
  if (!VISION_API_KEY) {
    throw new Error('GOOGLE_VISION_API_KEY is required. Add it to your .env file.');
  }

  let content = imageBase64;
  if (imageBase64.includes(',')) {
    content = imageBase64.split(',').pop();
  }

  let response;
  try {
    response = await axios.post(
      `${VISION_URL}?key=${VISION_API_KEY}`,
      {
        requests: [
          {
            image: { content },
            features: [
              { type: 'WEB_DETECTION', maxResults: 10 },
              { type: 'LABEL_DETECTION', maxResults: 12 },
              { type: 'LOGO_DETECTION', maxResults: 5 }
            ]
          }
        ]
      },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 25000
      }
    );
  } catch (err) {
    if (axios.isAxiosError(err)) {
      const st = err.response?.status;
      const data = err.response?.data;
      const gMsg =
        (typeof data?.error?.message === 'string' && data.error.message) ||
        (typeof data?.error_message === 'string' && data.error_message) ||
        '';
      if (st === 400 && gMsg) {
        throw new Error(`Vision API: ${gMsg}`);
      }
      if (st === 403 || st === 401) {
        throw new Error(
          'Vision API rejected the request — verify GOOGLE_VISION_API_KEY in backend/.env and that the Vision API is enabled for your Google Cloud project.'
        );
      }
      if (st) {
        throw new Error(gMsg ? `Vision API (${st}): ${gMsg}` : `Vision API request failed (HTTP ${st}).`);
      }
      if (err.code === 'ECONNABORTED') {
        throw new Error('Vision API timed out. Try a smaller or simpler photo.');
      }
      throw new Error(err.message || 'Vision API request failed');
    }
    throw err;
  }

  const result = response.data?.responses?.[0];
  if (!result) {
    throw new Error('Invalid Vision API response');
  }

  if (result.error) {
    throw new Error(result.error.message || 'Vision API error');
  }

  const web = result.webDetection || {};
  const bestGuessLabels = web.bestGuessLabels || [];
  const bestGuess = (bestGuessLabels[0] && String(bestGuessLabels[0].label || '').trim()) || '';

  const webEntities = (web.webEntities || [])
    .filter((e) => e && e.description && typeof e.description === 'string')
    .filter((e) => (Number(e.score) || 0) >= 0.25)
    .sort((a, b) => (Number(b.score) || 0) - (Number(a.score) || 0))
    .slice(0, 6)
    .map((e) => e.description.trim())
    .filter(Boolean);

  const labels = result.labelAnnotations || [];
  const logos = result.logoAnnotations || [];

  const SKIP_LABEL =
    /^(product|food|thing|object|image|photography|font|art|material property|white|black)$/i;
  const NOISE_LABEL =
    /^(electronic device|electronics|technology|machine|equipment|hardware|gadget)$/i;

  const usableLabels = labels.filter(
    (l) => l.description && !SKIP_LABEL.test(l.description) && !NOISE_LABEL.test(l.description.trim())
  );

  const labelDescriptions = usableLabels.map((l) => l.description.trim()).filter(Boolean);

  /** Deduped hints for Shopping (labels + Knowledge-style web entities) */
  const mergedHints = [];
  const seenHint = new Set();
  for (const h of [...webEntities, ...labelDescriptions]) {
    const k = h.toLowerCase();
    if (seenHint.has(k)) continue;
    seenHint.add(k);
    mergedHints.push(h);
    if (mergedHints.length >= 10) break;
  }

  let product_name = '';
  let brand = '';
  let confidence = 0.65;

  if (logos.length > 0) {
    const topLogo = logos[0];
    brand = (topLogo.description || '').trim();
    confidence = Math.max(confidence, Number(topLogo.score) || 0.85);
  }

  if (bestGuess) {
    product_name = bestGuess;
    confidence = Math.max(confidence, 0.82);
    if (brand && !product_name.toLowerCase().includes(brand.toLowerCase())) {
      product_name = `${brand} ${product_name}`.trim();
    }
  }

  const productLabels = usableLabels.slice(0, 8);

  const scoreSpecificity = (desc) => {
    const t = (desc || '').toLowerCase();
    let s = 0;
    if (
      /\b(air conditioning|air conditioner|refrigerat|washing machine|microwave|television|laptop|smartphone|mobile phone)\b/.test(
        t
      )
    ) {
      s += 50;
    }
    if (/\b(major appliance|home appliance|kitchen)\b/.test(t)) s += 20;
    return s;
  };

  const sortedForName = [...productLabels].sort(
    (a, b) => scoreSpecificity(b.description) - scoreSpecificity(a.description)
  );

  if (!product_name && sortedForName.length > 0) {
    const topLabel = sortedForName[0];
    if (!brand) {
      product_name = topLabel.description;
    } else {
      const brandLower = brand.toLowerCase();
      const second = sortedForName.find(
        (l) =>
          l.description &&
          l.description.toLowerCase() !== brandLower &&
          !brandLower.includes(l.description.toLowerCase()) &&
          !l.description.toLowerCase().includes(brandLower.replace(/\s+technology$/i, ''))
      );
      product_name = second
        ? `${brand} ${second.description}`.trim()
        : `${brand} ${topLabel.description}`.trim();
    }
    confidence = Math.max(confidence, topLabel.score || 0.7);
  } else if (!product_name && brand) {
    product_name = brand;
  } else if (!product_name && webEntities[0]) {
    product_name = webEntities[0];
    if (brand && !product_name.toLowerCase().includes(brand.toLowerCase())) {
      product_name = `${brand} ${product_name}`.trim();
    }
  }

  if (!product_name) {
    product_name = 'Unknown product';
    confidence = 0.5;
  }

  return {
    product_name: product_name.trim().slice(0, 160),
    brand: brand.trim(),
    confidence: Math.min(1, Math.max(0, confidence)),
    labels: mergedHints.slice(0, 8),
    ocr_hint: '',
    web_best_guess: bestGuess || undefined,
    web_entities: webEntities.slice(0, 5)
  };
}

module.exports = {
  detectProductFromImage
};
