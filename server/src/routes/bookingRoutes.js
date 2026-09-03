const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');
const { authenticate } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

// Protect all booking routes with authentication
router.use(authenticate);

/**
 * @route   POST /api/bookings
 * @desc    Create a new booking reservation
 * @access  Private (STAFF only)
 */
/**
 * @route   GET /api/bookings
 * @desc    Get list of bookings
 * @access  Private (STAFF, INSTRUCTOR)
 */
router
  .route('/')
  .post(requireRole('STAFF'), bookingController.createBooking)
  .get(requireRole('STAFF', 'INSTRUCTOR'), bookingController.getAllBookings);

/**
 * @route   GET /api/bookings/:id
 * @desc    Get a single booking by ID
 * @access  Private (STAFF, INSTRUCTOR)
 */
router.get('/:id', requireRole('STAFF', 'INSTRUCTOR'), bookingController.getBookingById);

/**
 * @route   GET /api/bookings/:id/history
 * @desc    Get audit trail history for a booking
 * @access  Private (STAFF, INSTRUCTOR)
 */
router.get('/:id/history', requireRole('STAFF', 'INSTRUCTOR'), bookingController.getBookingHistory);

/**
 * @route   PATCH /api/bookings/:id/cancel
 * @desc    Cancel a booking (auto-promotes waitlist if applicable)
 * @access  Private (STAFF only)
 */
router.patch('/:id/cancel', requireRole('STAFF'), bookingController.cancelBooking);

/**
 * @route   PATCH /api/bookings/:id/attendance
 * @desc    Mark attendance (ATTENDED or NO_SHOW)
 * @access  Private (STAFF only)
 */
router.patch('/:id/attendance', requireRole('STAFF'), bookingController.settleAttendance);

module.exports = router;
