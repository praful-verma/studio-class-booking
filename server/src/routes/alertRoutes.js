const express = require('express');
const router = express.Router();
const alertController = require('../controllers/alertController');
const { authenticate } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

router.use(authenticate);

/**
 * @route   GET /api/membership-alerts/count
 * @desc    Get count of active expiry alerts for navigation badge
 * @access  Private (STAFF only)
 */
router.get('/count', requireRole('STAFF'), alertController.getAlertCount);

/**
 * @route   GET /api/membership-alerts
 * @desc    Get active membership expiry alerts
 * @access  Private (STAFF only)
 */
router.get('/', requireRole('STAFF'), alertController.getAlerts);

/**
 * @route   PATCH /api/membership-alerts/:memberId/dismiss
 * @desc    Dismiss alert for a member without modifying membership expiry date
 * @access  Private (STAFF only)
 */
router.patch('/:memberId/dismiss', requireRole('STAFF'), alertController.dismissAlert);

module.exports = router;
