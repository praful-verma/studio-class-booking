const express = require('express');
const router = express.Router();
const classController = require('../controllers/classController');
const { authenticate } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

// Protect all class routes with authentication
router.use(authenticate);

/**
 * @route   POST /api/classes
 * @desc    Create a new class
 * @access  Private (STAFF only)
 */
/**
 * @route   GET /api/classes
 * @desc    Get list of classes (query includeArchived=true to view archived)
 * @access  Private (STAFF, INSTRUCTOR)
 */
router
  .route('/')
  .post(requireRole('STAFF'), classController.createClass)
  .get(requireRole('STAFF', 'INSTRUCTOR'), classController.getAllClasses);

/**
 * @route   GET /api/classes/:id
 * @desc    Get a class by ID
 * @access  Private (STAFF, INSTRUCTOR)
 */
/**
 * @route   PATCH /api/classes/:id
 * @desc    Update a class by ID
 * @access  Private (STAFF only)
 */
router
  .route('/:id')
  .get(requireRole('STAFF', 'INSTRUCTOR'), classController.getClassById)
  .patch(requireRole('STAFF'), classController.updateClass);

/**
 * @route   PATCH /api/classes/:id/archive
 * @desc    Archive a class
 * @access  Private (STAFF only)
 */
router.patch('/:id/archive', requireRole('STAFF'), classController.archiveClass);

/**
 * @route   PATCH /api/classes/:id/restore
 * @desc    Restore an archived class
 * @access  Private (STAFF only)
 */
router.patch('/:id/restore', requireRole('STAFF'), classController.restoreClass);

module.exports = router;
