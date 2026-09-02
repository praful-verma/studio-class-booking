const express = require('express');
const router = express.Router();
const memberController = require('../controllers/memberController');
const { authenticate } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

// Protect all member routes with authentication
router.use(authenticate);

/**
 * @route   POST /api/members
 * @desc    Create a new studio member
 * @access  Private (STAFF only)
 */
/**
 * @route   GET /api/members
 * @desc    Get list of studio members
 * @access  Private (STAFF, INSTRUCTOR)
 */
router
  .route('/')
  .post(requireRole('STAFF'), memberController.createMember)
  .get(requireRole('STAFF'), memberController.getAllMembers);

/**
 * @route   GET /api/members/:id
 * @desc    Get a single member by ID
 * @access  Private (STAFF only)
 */
/**
 * @route   PATCH /api/members/:id
 * @desc    Update a studio member by ID
 * @access  Private (STAFF only)
 */
router
  .route('/:id')
  .get(requireRole('STAFF'), memberController.getMemberById)
  .patch(requireRole('STAFF'), memberController.updateMember);

module.exports = router;
