const path = require('path');
const { comparePrices } = require('./priceService');

const storesData = require(path.join(__dirname, '../../data/stores.json'));

const toRad = (deg) => (deg * Math.PI) / 180;

const haversineKm = (lat1, lng1, lat2, lng2) => {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const getNearbyStores = async ({ lat, lng, productName }) => {
  let basePrice = null;
  if (productName) {
    try {
      const prices = comparePrices(productName);
      if (prices && prices.length > 0) {
        basePrice = prices[0].price;
      }
    } catch (e) {
      basePrice = null;
    }
  }

  const withDistances = storesData.map((store, index) => {
    const distance = haversineKm(lat, lng, store.lat, store.lng);

    let price = null;
    if (typeof basePrice === 'number') {
      const deltaSteps = (index % 3) - 1; // -1, 0, 1
      const delta = deltaSteps * 2;
      price = Math.max(1, basePrice + delta);
    }

    return {
      name: store.name,
      location: { lat: store.lat, lng: store.lng },
      address: store.address || null,
      distance,
      availability: store.availability || 'Unknown',
      productName,
      price
    };
  });

  withDistances.sort((a, b) => a.distance - b.distance);
  return withDistances.slice(0, 15);
};

module.exports = {
  getNearbyStores
};

