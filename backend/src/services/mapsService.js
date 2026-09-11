const axios = require('axios');
const { getSubcategoryPlaceTypesOverride } = require('../constants/storeCategories');

const MAPS_API_KEY = process.env.GOOGLE_PLACES_API_KEY || process.env.GOOGLE_MAPS_API_KEY;
const PLACES_URL = 'https://places.googleapis.com/v1/places:searchNearby';

const RADIUS_METERS = 5000;
const HAVERSINE_R = 6371; // Earth radius in km

/** Google Places API (New) `includedTypes` per app category — see Place types table. */
const CATEGORY_INCLUDED_TYPES = {
  all: ['supermarket', 'grocery_store', 'convenience_store'],
  electronics: ['electronics_store', 'home_goods_store'],
  fashion: ['clothing_store', 'shoe_store'],
  grocery: ['supermarket', 'grocery_store', 'convenience_store'],
  home: ['furniture_store', 'home_goods_store', 'hardware_store'],
  beauty: ['drugstore', 'beauty_salon'],
  sports: ['sporting_goods_store'],
  books: ['book_store'],
  toys: ['toy_store'],
  health: ['pharmacy', 'drugstore']
};

function toRad(deg) {
  return (deg * Math.PI) / 180;
}

function haversineKm(lat1, lng1, lat2, lng2) {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return HAVERSINE_R * c;
}

/**
 * Find nearby stores using Google Places API (Nearby Search New).
 * Searches for supermarket, grocery store, and convenience store.
 * @param {number} latitude
 * @param {number} longitude
 * @param {string} [keyword] - Optional product name (not used in Places; kept for compatibility)
 * @param {string} [categoryKey] - App category: narrows Google Place types (default `all`)
 * @param {string} [subcategoryKey] - Optional subcategory: further narrows Place types when set
 * @returns {Promise<Array<{ name, location, distance, rating, address }>>}
 */
async function findNearbyStores(latitude, longitude, keyword, categoryKey = 'all', subcategoryKey = '') {
  if (!MAPS_API_KEY) {
    throw new Error('GOOGLE_MAPS_API_KEY or GOOGLE_PLACES_API_KEY is required. Add one to your .env file.');
  }

  const override = getSubcategoryPlaceTypesOverride(categoryKey, subcategoryKey);
  const placeTypes =
    override || CATEGORY_INCLUDED_TYPES[categoryKey] || CATEGORY_INCLUDED_TYPES.all;

  const fieldMask = 'places.displayName,places.formattedAddress,places.location,places.rating';
  const seen = new Map();

  const results = [];

  for (const type of placeTypes) {
    try {
      const response = await axios.post(
        PLACES_URL,
        {
          includedTypes: [type],
          maxResultCount: 10,
          locationRestriction: {
            circle: {
              center: { latitude, longitude },
              radius: RADIUS_METERS
            }
          }
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': MAPS_API_KEY,
            'X-Goog-FieldMask': fieldMask
          },
          timeout: 10000
        }
      );

      const places = response.data?.places || [];
      for (const place of places) {
        const name = place.displayName?.text || place.name || 'Unknown store';
        const loc = place.location;
        const lat = loc?.latitude;
        const lng = loc?.longitude;

        if (lat == null || lng == null) continue;

        const id = place.name || `${name}-${lat}-${lng}`;
        if (seen.has(id)) continue;
        seen.set(id, true);

        const distance = haversineKm(latitude, longitude, lat, lng);
        const rating = place.rating ?? null;
        const address = place.formattedAddress || null;

        results.push({
          name,
          location: { lat, lng },
          distance,
          rating,
          address
        });
      }
    } catch (err) {
      console.error(`Places API error for type ${type}:`, err.response?.data || err.message);
      // Continue with other types
    }
  }

  // Sort by distance and deduplicate by name+location
  results.sort((a, b) => a.distance - b.distance);
  const deduped = [];
  const nameKey = new Set();
  for (const r of results) {
    const key = `${r.name}-${r.location.lat.toFixed(4)}-${r.location.lng.toFixed(4)}`;
    if (nameKey.has(key)) continue;
    nameKey.add(key);
    deduped.push(r);
  }

  return deduped.slice(0, 20);
}

module.exports = {
  findNearbyStores
};
