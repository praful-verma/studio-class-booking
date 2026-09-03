const bookingService = require('../services/bookingService');

/**
 * @route   POST /api/bookings
 * @desc    Create a new booking reservation
 * @access  Private (STAFF only)
 */
const createBooking = async (req, res, next) => {
  try {
    const newBooking = await bookingService.createBooking(req.body, req.user);
    res.status(201).json({
      status: 'success',
      data: {
        booking: newBooking
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/bookings
 * @desc    Get list of bookings (with filtering and pagination)
 * @access  Private (STAFF and INSTRUCTOR)
 */
const getAllBookings = async (req, res, next) => {
  try {
    const result = await bookingService.getAllBookings(req.query);
    res.status(200).json({
      status: 'success',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/bookings/:id
 * @desc    Get a single booking by ID
 * @access  Private (STAFF and INSTRUCTOR)
 */
const getBookingById = async (req, res, next) => {
  try {
    const booking = await bookingService.getBookingById(req.params.id);
    res.status(200).json({
      status: 'success',
      data: {
        booking
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/bookings/:id/history
 * @desc    Get audit trail history for a booking
 * @access  Private (STAFF and INSTRUCTOR)
 */
const getBookingHistory = async (req, res, next) => {
  try {
    const history = await bookingService.getBookingHistory(req.params.id);
    res.status(200).json({
      status: 'success',
      results: history.length,
      data: {
        history
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PATCH /api/bookings/:id/cancel
 * @desc    Cancel a booking (auto-promotes waitlist if applicable)
 * @access  Private (STAFF only)
 */
const cancelBooking = async (req, res, next) => {
  try {
    const { staffNote } = req.body;
    const cancelledBooking = await bookingService.cancelBooking(req.params.id, staffNote, req.user);
    res.status(200).json({
      status: 'success',
      data: {
        booking: cancelledBooking
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PATCH /api/bookings/:id/attendance
 * @desc    Mark attendance (ATTENDED or NO_SHOW) after session start time
 * @access  Private (STAFF only)
 */
const settleAttendance = async (req, res, next) => {
  try {
    const updatedBooking = await bookingService.settleAttendance(req.params.id, req.body, req.user);
    res.status(200).json({
      status: 'success',
      data: {
        booking: updatedBooking
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createBooking,
  getAllBookings,
  getBookingById,
  getBookingHistory,
  cancelBooking,
  settleAttendance
};
