const mongoose = require('mongoose');
const User = require('../models/User');
const Product = require('../models/Product');
const { detectProductFromImage } = require('../services/visionService');
const { searchPrices } = require('../services/priceComparisonService');
const { resolveProduct } = require('../services/productResolver');
const {
  normalizeStoreCategory,
  normalizeStoreSubcategory
} = require('../constants/storeCategories');
const { buildShoppingSearchQuery } = require('../services/shoppingQueryService');

/** Min confidence before we replace Vision text with a catalog name from products.json */
const RESOLVE_FOR_DISPLAY_THRESHOLD = 0.66;

const detectProduct = async (req, res) => {
  try {
    const { imageBase64, category: categoryBody, subcategory: subBody, previewOnly } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ message: 'imageBase64 is required' });
    }

    const isPreview =
      previewOnly === true || previewOnly === 'true' || previewOnly === 1;

    const storeCategory = normalizeStoreCategory(categoryBody);
    const storeSubcategory = normalizeStoreSubcategory(storeCategory, subBody);

    const detection = await detectProductFromImage(imageBase64);

    const rawName = detection.product_name || 'Unknown product';
    const { resolvedName, confidence: resolveConfidence } = resolveProduct(rawName);

    const productName =
      resolveConfidence >= RESOLVE_FOR_DISPLAY_THRESHOLD ? resolvedName : rawName;
    const brand = detection.brand || '';

    const priceSearchQuery = buildShoppingSearchQuery({
      rawName,
      brand,
      resolvedName,
      resolveConfidence,
      storeCategory,
      storeSubcategory,
      labels: detection.labels || [],
      ocrHint: detection.ocr_hint || ''
    });

    const productCategory =
      storeCategory === 'all' ? detection.category || 'general' : storeCategory;

    let product = await Product.findOne({ name: productName, brand });
    if (!product) {
      product = await Product.create({
        name: productName,
        brand,
        category: productCategory
      });
    } else if (storeCategory !== 'all') {
      product = await Product.findByIdAndUpdate(
        product._id,
        { category: productCategory },
        { new: true }
      );
    }

    let prices = [];
    if (!isPreview) {
      try {
        prices = await searchPrices(priceSearchQuery, {
          category: storeCategory,
          subcategory: storeSubcategory
        });
      } catch (e) {
        prices = [];
      }

      if (req.user && req.user.id) {
        try {
          const historyLabel =
            (priceSearchQuery && String(priceSearchQuery).trim()) || productName;
          await User.findByIdAndUpdate(
            req.user.id,
            {
              $push: {
                history: {
                  productName: historyLabel,
                  brand,
                  prices
                }
              }
            },
            { new: true }
          );
        } catch (histErr) {
          console.error('detectProduct: history save failed', histErr);
        }
      }
    }

    res.json({
      preview: isPreview,
      product: {
        id: product._id,
        name: product.name,
        brand: product.brand,
        category: product.category
      },
      detection: {
        product_name: productName,
        brand: detection.brand,
        confidence: detection.confidence,
        source: 'google_vision',
        resolved_from_raw: rawName,
        resolve_confidence: resolveConfidence,
        labels: detection.labels || [],
        web_best_guess: detection.web_best_guess,
        web_entities: detection.web_entities,
        price_search_query: priceSearchQuery
      },
      prices,
      storeCategory,
      storeSubcategory,
      session: {
        historySaved: Boolean(req.user?.id && !isPreview),
        tokenExpired: Boolean(req.authExpired)
      }
    });
  } catch (err) {
    console.error('detectProduct error', err);
    const raw = err?.message ? String(err.message) : '';
    let message = 'Failed to detect product';
    if (/GOOGLE_VISION_API_KEY is required/i.test(raw)) {
      message =
        'Server is missing GOOGLE_VISION_API_KEY. Add it to backend/.env and restart the backend.';
    } else if (/Vision API/i.test(raw) || /Vision API request failed/i.test(raw)) {
      message = raw.length <= 280 ? raw : `${raw.slice(0, 277)}…`;
    } else if (/Payload too large|entity too large|request entity too large/i.test(raw)) {
      message = 'Image too large for the server. Try a smaller photo — the app compresses images before upload.';
    } else if (raw && raw.length <= 280) {
      message = raw;
    }
    res.status(500).json({ message, code: 'DETECT_FAILED' });
  }
};

const searchProduct = async (req, res) => {
  try {
    const { query } = req.body;
    if (!query) {
      return res.status(400).json({ message: 'query is required' });
    }

    const prices = await searchPrices(query, { category: 'all' });

    res.json({
      query,
      prices
    });
  } catch (err) {
    console.error('searchProduct error', err);
    res.status(500).json({ message: 'Failed to search product' });
  }
};

/**
 * After upload preview: user-confirmed search text → online prices (+ optional history).
 */
const priceLookup = async (req, res) => {
  try {
    const { query, category: categoryBody, subcategory: subBody, productId, brand } = req.body;
    if (query == null || !String(query).trim()) {
      return res.status(400).json({ message: 'query is required' });
    }

    const storeCategory = normalizeStoreCategory(categoryBody);
    const storeSubcategory = normalizeStoreSubcategory(storeCategory, subBody);
    const q = String(query).trim().slice(0, 200);

    let prices = [];
    try {
      prices = await searchPrices(q, { category: storeCategory, subcategory: storeSubcategory });
    } catch (e) {
      prices = [];
    }

    if (productId && mongoose.Types.ObjectId.isValid(String(productId))) {
      await Product.findByIdAndUpdate(String(productId), { name: q });
    }

    const brandSave = brand != null ? String(brand).trim() : '';

    if (req.user && req.user.id) {
      await User.findByIdAndUpdate(
        req.user.id,
        {
          $push: {
            history: {
              productName: q,
              brand: brandSave,
              prices
            }
          }
        },
        { new: true }
      );
    }

    res.json({
      query: q,
      prices,
      storeCategory,
      storeSubcategory,
      session: {
        historySaved: Boolean(req.user?.id),
        tokenExpired: Boolean(req.authExpired)
      }
    });
  } catch (err) {
    console.error('priceLookup error', err);
    res.status(500).json({ message: 'Failed to lookup prices' });
  }
};

module.exports = {
  detectProduct,
  searchProduct,
  priceLookup
};

