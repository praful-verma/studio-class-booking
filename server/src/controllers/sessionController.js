const sessionService = require('../services/sessionService');

/**
 * @route   POST /api/sessions
 * @desc    Create a new class session
 * @access  Private (STAFF only)
 */
const createSession = async (req, res, next) => {
  try {
    const newSession = await sessionService.createSession(req.body);
    res.status(201).json({
      status: 'success',
      data: {
        session: newSession
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/sessions
 * @desc    Get list of sessions (filtered by instructor for INSTRUCTOR role)
 * @access  Private (STAFF and INSTRUCTOR)
 */
const getAllSessions = async (req, res, next) => {
  try {
    const sessions = await sessionService.getAllSessions(req.query, req.user);
    res.status(200).json({
      status: 'success',
      results: sessions.length,
      data: {
        sessions
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/sessions/:id
 * @desc    Get a single session by ID
 * @access  Private (STAFF and INSTRUCTOR)
 */
const getSessionById = async (req, res, next) => {
  try {
    const session = await sessionService.getSessionById(req.params.id, req.user);
    res.status(200).json({
      status: 'success',
      data: {
        session
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PATCH /api/sessions/:id
 * @desc    Update a session definition/schedule
 * @access  Private (STAFF only)
 */
const updateSession = async (req, res, next) => {
  try {
    const updatedSession = await sessionService.updateSession(req.params.id, req.body);
    res.status(200).json({
      status: 'success',
      data: {
        session: updatedSession
      }
    });
  } catch (error) {
    next(error);
  }
};

const bookingService = require('../services/bookingService');

/**
 * @route   PATCH /api/sessions/:id/cancel
 * @desc    Cancel a session
 * @access  Private (STAFF only)
 */
const cancelSession = async (req, res, next) => {
  try {
    const cancelledSession = await sessionService.cancelSession(req.params.id);
    res.status(200).json({
      status: 'success',
      data: {
        session: cancelledSession
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/sessions/:id/attendance.csv
 * @desc    Export session attendance roster as CSV
 * @access  Private (STAFF and INSTRUCTOR)
 */
const exportAttendanceCsv = async (req, res, next) => {
  try {
    const csvData = await bookingService.exportAttendanceCsv(req.params.id, req.user);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="attendance-${req.params.id}.csv"`);
    res.status(200).send(csvData);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createSession,
  getAllSessions,
  getSessionById,
  updateSession,
  cancelSession,
  exportAttendanceCsv
};
