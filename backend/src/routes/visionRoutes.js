const express = require('express');
const router  = express.Router();
const { authenticateToken } = require('../middleware/auth');
const visionController = require('../controllers/visionController');

// POST /api/vision/identify
router.post('/identify', authenticateToken, visionController.identifyProduct);

module.exports = router;
