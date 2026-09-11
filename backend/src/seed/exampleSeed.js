const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const Product = require('../models/Product');
const Price = require('../models/Price');
const Store = require('../models/Store');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/snapshop';

const run = async () => {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB for seeding');

  const dataPath = path.join(__dirname, '../../../database/example_data.json');
  const raw = fs.readFileSync(dataPath, 'utf-8');
  const data = JSON.parse(raw);

  await Product.deleteMany({});
  await Price.deleteMany({});
  await Store.deleteMany({});

  const products = await Product.insertMany(data.products || []);
  console.log(`Inserted ${products.length} products`);

  const productMap = {};
  products.forEach((p) => {
    productMap[p.name] = p._id;
  });

  const prices = (data.prices || []).map((p) => ({
    ...p,
    product: productMap[p.productName]
  }));

  const pricesInserted = await Price.insertMany(prices);
  console.log(`Inserted ${pricesInserted.length} prices`);

  const storesInserted = await Store.insertMany(data.stores || []);
  console.log(`Inserted ${storesInserted.length} stores`);

  await mongoose.disconnect();
  console.log('Seeding complete');
};

run().catch((err) => {
  console.error('Seed failed', err);
  process.exit(1);
});

