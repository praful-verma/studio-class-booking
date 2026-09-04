const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticate } = require('../middleware/authMiddleware');

router.use(authenticate);

/**
 * @route   GET /api/users
 * @desc    Get active users list with optional role filter
 * @access  Private (Authenticated users)
 */
router.get('/', userController.getUsers);

module.exports = router;
