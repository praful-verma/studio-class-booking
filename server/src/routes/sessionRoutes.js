const express = require('express');
const router = express.Router();
const sessionController = require('../controllers/sessionController');
const { authenticate } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

// Protect all session routes with authentication
router.use(authenticate);

/**
 * @route   POST /api/sessions
 * @desc    Create a new class session
 * @access  Private (STAFF only)
 */
/**
 * @route   GET /api/sessions
 * @desc    Get list of sessions (filtered by instructor for INSTRUCTOR role)
 * @access  Private (STAFF, INSTRUCTOR)
 */
router
  .route('/')
  .post(requireRole('STAFF'), sessionController.createSession)
  .get(requireRole('STAFF', 'INSTRUCTOR'), sessionController.getAllSessions);

/**
 * @route   GET /api/sessions/:id
 * @desc    Get a single session by ID
 * @access  Private (STAFF, INSTRUCTOR)
 */
/**
 * @route   PATCH /api/sessions/:id
 * @desc    Update a session
 * @access  Private (STAFF only)
 */
/**
 * @route   DELETE /api/sessions/:id
 * @desc    Cancel a session
 * @access  Private (STAFF only)
 */
router
  .route('/:id')
  .get(requireRole('STAFF', 'INSTRUCTOR'), sessionController.getSessionById)
  .patch(requireRole('STAFF'), sessionController.updateSession)
  .delete(requireRole('STAFF'), sessionController.cancelSession);

/**
 * @route   PATCH /api/sessions/:id/cancel
 * @desc    Cancel a session
 * @access  Private (STAFF only)
 */
router.patch('/:id/cancel', requireRole('STAFF'), sessionController.cancelSession);

module.exports = router;
