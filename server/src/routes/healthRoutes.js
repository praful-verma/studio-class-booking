const express = require('express');
const router = express.Router();

/**
 * @route   GET /api/health
 * @desc    Health check endpoint returning API status
 * @access  Public
 */
router.get('/', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'Class Booking API is running',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
