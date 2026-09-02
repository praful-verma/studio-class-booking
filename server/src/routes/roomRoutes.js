const express = require('express');
const router = express.Router();
const roomController = require('../controllers/roomController');
const { authenticate } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

// Protect all room routes with authentication
router.use(authenticate);

/**
 * @route   POST /api/rooms
 * @desc    Create a new room
 * @access  Private (STAFF only)
 */
/**
 * @route   GET /api/rooms
 * @desc    Get list of rooms (query includeArchived=true for STAFF)
 * @access  Private (STAFF, INSTRUCTOR)
 */
router
  .route('/')
  .post(requireRole('STAFF'), roomController.createRoom)
  .get(requireRole('STAFF', 'INSTRUCTOR'), roomController.getAllRooms);

/**
 * @route   GET /api/rooms/:id
 * @desc    Get a single room by ID
 * @access  Private (STAFF, INSTRUCTOR)
 */
/**
 * @route   PATCH /api/rooms/:id
 * @desc    Update a room definition
 * @access  Private (STAFF only)
 */
router
  .route('/:id')
  .get(requireRole('STAFF', 'INSTRUCTOR'), roomController.getRoomById)
  .patch(requireRole('STAFF'), roomController.updateRoom);

/**
 * @route   PATCH /api/rooms/:id/archive
 * @desc    Archive a room
 * @access  Private (STAFF only)
 */
router.patch('/:id/archive', requireRole('STAFF'), roomController.archiveRoom);

/**
 * @route   PATCH /api/rooms/:id/restore
 * @desc    Restore an archived room
 * @access  Private (STAFF only)
 */
router.patch('/:id/restore', requireRole('STAFF'), roomController.restoreRoom);

module.exports = router;
