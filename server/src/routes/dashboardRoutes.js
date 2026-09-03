const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { authenticate } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

router.use(authenticate);

/**
 * @route   GET /api/dashboard
 * @desc    Get dashboard metrics and summaries
 * @access  Private (STAFF only)
 */
router.get('/', requireRole('STAFF'), dashboardController.getDashboard);

module.exports = router;
