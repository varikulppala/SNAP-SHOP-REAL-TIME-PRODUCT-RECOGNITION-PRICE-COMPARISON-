const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const dotenv = require('dotenv');
const mongoose = require('mongoose');

dotenv.config();

const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const productSearchRoutes = require('./routes/productSearchRoutes');
const priceRoutes = require('./routes/priceRoutes');
const storeRoutes = require('./routes/storeRoutes');

const app = express();

app.use(cors());
/** Base64 screenshots need headroom (~4/3 size); Vision allows large images but we compress on client too */
app.use(express.json({ limit: '35mb' }));
app.use(morgan('dev'));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'snapshop-backend' });
});

app.use('/auth', authRoutes);
app.use('/product', productRoutes);
app.use('/products', productSearchRoutes);
app.use('/prices', priceRoutes);
app.use('/stores', storeRoutes);

app.use((err, req, res, next) => {
  if (err && (err.type === 'entity.too.large' || err.status === 413)) {
    return res.status(413).json({
      message:
        'Image payload too large. Use a smaller photo — the upload page compresses images automatically.'
    });
  }
  if (err) {
    console.error('Unhandled error:', err);
    return res.status(err.status && err.status >= 400 && err.status < 600 ? err.status : 500).json({
      message: err.message || 'Server error'
    });
  }
  next();
});

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/snapshop';
const PORT = process.env.PORT || 4000;

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    app.listen(PORT, () => {
      console.log(`Backend listening on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('MongoDB connection error', err);
    process.exit(1);
  });

