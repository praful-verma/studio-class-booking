const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const BookingHistory = require('../models/BookingHistory');
const Session = require('../models/Session');
const Member = require('../models/Member');
const { validateTransition } = require('./bookingStateService');

// Per-session execution mutex to guarantee atomic capacity calculations during concurrent requests
const sessionLocks = new Map();

const withSessionLock = async (sessionId, asyncFn) => {
  const key = sessionId.toString();
  while (sessionLocks.get(key)) {
    await sessionLocks.get(key);
  }

  let resolveLock;
  const lockPromise = new Promise((resolve) => {
    resolveLock = resolve;
  });
  sessionLocks.set(key, lockPromise);

  try {
    return await asyncFn();
  } finally {
    sessionLocks.delete(key);
    resolveLock();
  }
};

/**
 * Creates a new booking for a member and session.
 * Handles capacity checks (BOOKED vs WAITLISTED), membership expiry validation, duplicate checks, and transaction safety.
 */
const createBooking = async (bookingData, user) => {
  const { memberId, sessionId, staffNote } = bookingData;

  return withSessionLock(sessionId, async () => {
    if (!memberId || !sessionId) {
      const error = new Error('Please provide memberId and sessionId.');
      error.statusCode = 400;
      throw error;
    }

  if (!memberId || !sessionId) {
    const error = new Error('Please provide memberId and sessionId.');
    error.statusCode = 400;
    throw error;
  }

  // 1. Member Lookup & Expiry Validation
  const member = await Member.findById(memberId);
  if (!member) {
    const error = new Error('Member not found.');
    error.statusCode = 404;
    throw error;
  }

  const now = new Date();
  if (new Date(member.membershipExpiry) < now) {
    const error = new Error('Member membership has expired. Expired members cannot create new bookings.');
    error.statusCode = 400;
    throw error;
  }

  // 2. Session Lookup & Validation
  const sessionDoc = await Session.findById(sessionId);
  if (!sessionDoc) {
    const error = new Error('Session not found.');
    error.statusCode = 404;
    throw error;
  }

  if (sessionDoc.status === 'CANCELLED') {
    const error = new Error('Cannot book a cancelled session.');
    error.statusCode = 400;
    throw error;
  }

  // 3. Duplicate Booking Check
  const existingBooking = await Booking.findOne({ member: memberId, session: sessionId });
  if (existingBooking) {
    const error = new Error('Member already has a booking for this session.');
    error.statusCode = 400;
    throw error;
  }

  // 4. Capacity Check & Atomic Booking Creation
  let mongoSession = null;
  let newBooking;

  try {
    mongoSession = await mongoose.startSession();
  } catch (err) {
    // Standalone MongoDB dev environment without replica set transactions
    mongoSession = null;
  }

  const executeBookingLogic = async (opts = {}) => {
    // Count active BOOKED reservations
    const bookedCount = await Booking.countDocuments(
      { session: sessionId, status: 'BOOKED' },
      opts
    );

    const targetStatus = bookedCount < sessionDoc.capacity ? 'BOOKED' : 'WAITLISTED';

    // Validate state transition NONE -> BOOKED/WAITLISTED
    validateTransition('NONE', targetStatus);

    // Create Booking
    const [bookingCreated] = await Booking.create(
      [
        {
          member: memberId,
          session: sessionId,
          status: targetStatus
        }
      ],
      opts
    );

    // Create Immutable Booking History Entry
    await BookingHistory.create(
      [
        {
          booking: bookingCreated._id,
          oldStatus: 'NONE',
          newStatus: targetStatus,
          changedBy: user._id,
          staffNote: staffNote ? staffNote.trim() : ''
        }
      ],
      opts
    );

    return bookingCreated;
  };

  if (mongoSession && typeof mongoSession.withTransaction === 'function') {
    try {
      await mongoSession.withTransaction(async () => {
        newBooking = await executeBookingLogic({ session: mongoSession });
      });
    } catch (err) {
      if (err.code === 11000) {
        const error = new Error('Member already has a booking for this session.');
        error.statusCode = 400;
        throw error;
      }
      throw err;
    } finally {
      mongoSession.endSession();
    }
  } else {
    try {
      newBooking = await executeBookingLogic({});
    } catch (err) {
      if (err.code === 11000) {
        const error = new Error('Member already has a booking for this session.');
        error.statusCode = 400;
        throw error;
      }
      throw err;
    }
  }

  return Booking.findById(newBooking._id)
    .populate('member', 'name email membershipExpiry')
    .populate({
      path: 'session',
      populate: [
        { path: 'classId', select: 'title discipline' },
        { path: 'room', select: 'name location' },
        { path: 'primaryInstructor', select: 'name email' }
      ]
    });
  });
};

/**
 * Cancels a booking (BOOKED or WAITLISTED) and automatically promotes the earliest waitlisted booking.
 */
const cancelBooking = async (bookingId, staffNote, user) => {
  const booking = await Booking.findById(bookingId);
  if (!booking) {
    const error = new Error('Booking not found.');
    error.statusCode = 404;
    throw error;
  }

  return withSessionLock(booking.session, async () => {
    const oldStatus = booking.status;

    // Validate state transition from current status -> CANCELLED
    validateTransition(oldStatus, 'CANCELLED');

    // Cancel target booking
    booking.status = 'CANCELLED';
    await booking.save();

    // Create immutable Booking History record
    await BookingHistory.create({
      booking: booking._id,
      oldStatus,
      newStatus: 'CANCELLED',
      changedBy: user._id,
      staffNote: staffNote ? staffNote.trim() : ''
    });

    // If a BOOKED reservation was cancelled, attempt to promote the earliest WAITLISTED booking
    if (oldStatus === 'BOOKED') {
      const earliestWaitlist = await Booking.findOne({
        session: booking.session,
        status: 'WAITLISTED'
      }).sort({ createdAt: 1 });

      if (earliestWaitlist) {
        const waitlistMember = await Member.findById(earliestWaitlist.member);
        const now = new Date();

        // Only promote if member's membership is still valid
        if (waitlistMember && new Date(waitlistMember.membershipExpiry) >= now) {
          // Validate state transition WAITLISTED -> BOOKED
          validateTransition('WAITLISTED', 'BOOKED');

          earliestWaitlist.status = 'BOOKED';
          await earliestWaitlist.save();

          await BookingHistory.create({
            booking: earliestWaitlist._id,
            oldStatus: 'WAITLISTED',
            newStatus: 'BOOKED',
            changedBy: user._id,
            staffNote: 'Auto-promoted from waitlist after cancellation'
          });
        }
      }
    }

    return Booking.findById(bookingId)
      .populate('member', 'name email membershipExpiry')
      .populate({
        path: 'session',
        populate: [
          { path: 'classId', select: 'title discipline' },
          { path: 'room', select: 'name location' }
        ]
      });
  });
};

/**
 * Marks attendance for a BOOKED reservation (ATTENDED or NO_SHOW) after the session start time.
 */
const settleAttendance = async (bookingId, attendanceData, user) => {
  const { status, staffNote } = attendanceData;

  if (!status || !['ATTENDED', 'NO_SHOW'].includes(status.toUpperCase())) {
    const error = new Error("Attendance status must be 'ATTENDED' or 'NO_SHOW'.");
    error.statusCode = 400;
    throw error;
  }

  const targetStatus = status.toUpperCase();

  const booking = await Booking.findById(bookingId).populate('session');
  if (!booking) {
    const error = new Error('Booking not found.');
    error.statusCode = 404;
    throw error;
  }

  const sessionDoc = booking.session;
  const now = new Date();

  // Validate session start time constraint
  if (now < new Date(sessionDoc.startDateTime)) {
    const error = new Error(`Attendance cannot be marked before the session scheduled start time (${new Date(sessionDoc.startDateTime).toISOString()}).`);
    error.statusCode = 400;
    throw error;
  }

  // Validate state transition (BOOKED -> ATTENDED / NO_SHOW)
  validateTransition(booking.status, targetStatus);

  const oldStatus = booking.status;
  booking.status = targetStatus;
  await booking.save();

  // Create immutable Booking History entry
  await BookingHistory.create({
    booking: booking._id,
    oldStatus,
    newStatus: targetStatus,
    changedBy: user._id,
    staffNote: staffNote ? staffNote.trim() : ''
  });

  return Booking.findById(bookingId)
    .populate('member', 'name email membershipExpiry')
    .populate({
      path: 'session',
      populate: [
        { path: 'classId', select: 'title discipline' },
        { path: 'room', select: 'name location' }
      ]
    });
};

/**
 * Retrieves bookings with filtering, sorting, and pagination.
 */
const getAllBookings = async (query = {}) => {
  const filter = {};

  if (query.sessionId) {
    filter.session = query.sessionId;
  }

  if (query.memberId) {
    filter.member = query.memberId;
  }

  if (query.status) {
    filter.status = query.status.toUpperCase();
  }

  const page = parseInt(query.page, 10) || 1;
  const limit = parseInt(query.limit, 10) || 20;
  const skip = (page - 1) * limit;

  const total = await Booking.countDocuments(filter);
  const bookings = await Booking.find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('member', 'name email membershipExpiry')
    .populate({
      path: 'session',
      populate: [
        { path: 'classId', select: 'title discipline' },
        { path: 'room', select: 'name location' },
        { path: 'primaryInstructor', select: 'name email' }
      ]
    });

  return {
    total,
    page,
    pages: Math.ceil(total / limit),
    bookings
  };
};

/**
 * Retrieves a single booking by ID.
 */
const getBookingById = async (id) => {
  const booking = await Booking.findById(id)
    .populate('member', 'name email membershipExpiry')
    .populate({
      path: 'session',
      populate: [
        { path: 'classId', select: 'title discipline' },
        { path: 'room', select: 'name location' },
        { path: 'primaryInstructor', select: 'name email' }
      ]
    });

  if (!booking) {
    const error = new Error('Booking not found.');
    error.statusCode = 404;
    throw error;
  }

  return booking;
};

/**
 * Retrieves immutable audit log history for a booking.
 */
const getBookingHistory = async (bookingId) => {
  const booking = await Booking.findById(bookingId);
  if (!booking) {
    const error = new Error('Booking not found.');
    error.statusCode = 404;
    throw error;
  }

  const history = await BookingHistory.find({ booking: bookingId })
    .sort({ timestamp: -1 })
    .populate('changedBy', 'name email role');

  return history;
};

module.exports = {
  createBooking,
  cancelBooking,
  settleAttendance,
  getAllBookings,
  getBookingById,
  getBookingHistory
};
