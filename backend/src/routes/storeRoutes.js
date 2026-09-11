const express = require('express');
const { getNearby, getConfig } = require('../controllers/storeController');

const router = express.Router();

router.get('/nearby', getNearby);
router.get('/config', getConfig);

module.exports = router;

