const axios = require('axios');

const API_KEY = process.env.GOOGLE_PLACES_API_KEY || process.env.GOOGLE_MAPS_API_KEY;
const NEARBY_URL = 'https://maps.googleapis.com/maps/api/place/nearbysearch/json';
const RADIUS = 2000;
const R_EARTH_KM = 6371;

function toRad(deg) {
  return (deg * Math.PI) / 180;
}

function haversineKm(lat1, lng1, lat2, lng2) {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R_EARTH_KM * c;
}

/**
 * Find nearby stores using Google Places API (legacy Nearby Search).
 * Uses keyword=product to search for stores matching the product.
 * @param {string} product - Product name / search keyword
 * @param {number} latitude
 * @param {number} longitude
 * @returns {Promise<Array<{ name, rating, address, location, distance }>>}
 */
async function findNearbyStores(product, latitude, longitude) {
  if (!API_KEY) {
    throw new Error('GOOGLE_MAPS_API_KEY or GOOGLE_PLACES_API_KEY is required');
  }

  const params = new URLSearchParams({
    location: `${latitude},${longitude}`,
    radius: String(RADIUS),
    type: 'store',
    key: API_KEY
  });

  if (product && typeof product === 'string' && product.trim()) {
    params.set('keyword', product.trim());
  }

  const response = await axios.get(`${NEARBY_URL}?${params.toString()}`, {
    timeout: 10000
  });

  const data = response.data;
  if (data.status === 'REQUEST_DENIED' || data.status === 'INVALID_REQUEST') {
    throw new Error(data.error_message || 'Places API error');
  }

  const results = data.results || [];
  const stores = results.map((place) => {
    const loc = place.geometry?.location;
    const lat = typeof loc?.lat === 'number' ? loc.lat : null;
    const lng = typeof loc?.lng === 'number' ? loc.lng : null;

    let distance = null;
    if (lat != null && lng != null) {
      distance = haversineKm(latitude, longitude, lat, lng);
    }

    return {
      name: place.name || 'Unknown store',
      rating: place.rating ?? null,
      address: place.vicinity || null,
      location: lat != null && lng != null ? { lat, lng } : null,
      distance
    };
  }).filter((s) => s.location != null);

  // Sort by distance
  stores.sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));
  return stores.slice(0, 15);
}

module.exports = {
  findNearbyStores
};
