const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate user and get token
 * @access  Public
 */
router.post('/login', authController.login);

/**
 * @route   GET /api/auth/me
 * @desc    Get authenticated user profile
 * @access  Private
 */
router.get('/me', authenticate, authController.getMe);

/**
 * @route   GET /api/auth/test-staff
 * @desc    Temporary test route for verifying STAFF role authorization
 * @access  Private (STAFF only)
 */
router.get('/test-staff', authenticate, requireRole('STAFF'), (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Access granted. User possesses STAFF authorization.',
    user: req.user
  });
});

module.exports = router;
