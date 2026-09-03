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
 * Helper to escape CSV values according to RFC 4180
 */
const escapeCsvCell = (val) => {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

/**
 * Exports attendance CSV for a given session.
 * Enforces role authorization (STAFF vs assigned INSTRUCTOR).
 */
const exportAttendanceCsv = async (sessionId, user) => {
  if (!mongoose.Types.ObjectId.isValid(sessionId)) {
    const error = new Error('Invalid session ID format.');
    error.statusCode = 400;
    throw error;
  }

  const sessionDoc = await Session.findById(sessionId);
  if (!sessionDoc) {
    const error = new Error('Session not found.');
    error.statusCode = 404;
    throw error;
  }

  // Instructor authorization check: must be primary or co-instructor
  if (user && user.role === 'INSTRUCTOR') {
    const userIdStr = user._id.toString();
    const isPrimary = sessionDoc.primaryInstructor && sessionDoc.primaryInstructor.toString() === userIdStr;
    const isCo = sessionDoc.coInstructors && sessionDoc.coInstructors.some(coId => coId.toString() === userIdStr);

    if (!isPrimary && !isCo) {
      const error = new Error('Access denied. Instructors can only export attendance for assigned sessions.');
      error.statusCode = 403;
      throw error;
    }
  }

  // Fetch all bookings for the session
  const bookings = await Booking.find({ session: sessionId })
    .populate('member', 'name email')
    .sort({ createdAt: 1 });

  // Build CSV
  const headers = ['Member Name', 'Member Email', 'Status', 'Booking Creation Time'];
  const rows = [headers.map(escapeCsvCell).join(',')];

  for (const b of bookings) {
    const memberName = b.member ? b.member.name : 'Unknown Member';
    const memberEmail = b.member ? b.member.email : '';
    const status = b.status || '';
    const createdAtIso = b.createdAt ? new Date(b.createdAt).toISOString() : '';

    const row = [
      escapeCsvCell(memberName),
      escapeCsvCell(memberEmail),
      escapeCsvCell(status),
      escapeCsvCell(createdAtIso)
    ];
    rows.push(row.join(','));
  }

  return rows.join('\r\n');
};

/**
 * Retrieves bookings with text search, class filter, session filter, status filter,
 * role-based instructor visibility, safe sorting whitelist, and database-level pagination.
 */
const getAllBookings = async (query = {}, user = null) => {
  const filter = {};
  let allowedSessionIds = null;

  // 1. Server-side Role Authorization for Instructors
  if (user && user.role === 'INSTRUCTOR') {
    const instructorSessions = await Session.find({
      $or: [
        { primaryInstructor: user._id },
        { coInstructors: user._id }
      ]
    }).select('_id');

    allowedSessionIds = instructorSessions.map(s => s._id.toString());
    if (allowedSessionIds.length === 0) {
      const limitVal = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));
      return { total: 0, page: 1, pages: 0, limit: limitVal, bookings: [] };
    }
  }

  // 2. Session Filter (sessionId / session)
  const requestedSessionId = query.sessionId || query.session;
  if (requestedSessionId) {
    if (!mongoose.Types.ObjectId.isValid(requestedSessionId)) {
      const error = new Error('Invalid session ID format.');
      error.statusCode = 400;
      throw error;
    }

    if (allowedSessionIds !== null && !allowedSessionIds.includes(requestedSessionId.toString())) {
      // Instructor requesting an unassigned session
      const limitVal = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));
      return { total: 0, page: 1, pages: 0, limit: limitVal, bookings: [] };
    }

    filter.session = new mongoose.Types.ObjectId(requestedSessionId);
  } else if (allowedSessionIds !== null) {
    filter.session = { $in: allowedSessionIds.map(id => new mongoose.Types.ObjectId(id)) };
  }

  // 3. Class Filter (classId / class)
  const requestedClassId = query.classId || query.class;
  if (requestedClassId) {
    if (!mongoose.Types.ObjectId.isValid(requestedClassId)) {
      const error = new Error('Invalid class ID format.');
      error.statusCode = 400;
      throw error;
    }

    const sessionQuery = { classId: requestedClassId };
    if (allowedSessionIds !== null) {
      sessionQuery._id = { $in: allowedSessionIds };
    }

    const classSessions = await Session.find(sessionQuery).select('_id');
    const classSessionIds = classSessions.map(s => s._id.toString());

    if (classSessionIds.length === 0) {
      const limitVal = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));
      return { total: 0, page: 1, pages: 0, limit: limitVal, bookings: [] };
    }

    const classSessionObjectIds = classSessionIds.map(id => new mongoose.Types.ObjectId(id));

    if (filter.session) {
      if (filter.session.$in) {
        const existingSet = new Set(filter.session.$in.map(id => id.toString()));
        const intersected = classSessionIds.filter(id => existingSet.has(id));
        if (intersected.length === 0) {
          const limitVal = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));
          return { total: 0, page: 1, pages: 0, limit: limitVal, bookings: [] };
        }
        filter.session = { $in: intersected.map(id => new mongoose.Types.ObjectId(id)) };
      } else {
        const singleSessionId = filter.session.toString();
        if (!classSessionIds.includes(singleSessionId)) {
          const limitVal = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));
          return { total: 0, page: 1, pages: 0, limit: limitVal, bookings: [] };
        }
      }
    } else {
      filter.session = { $in: classSessionObjectIds };
    }
  }

  // 4. Text Search Filter (member name or email)
  const searchText = query.search || query.q || query.memberSearch;
  if (searchText && searchText.trim() !== '') {
    const searchRegex = new RegExp(searchText.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    const matchingMembers = await Member.find({
      $or: [
        { name: searchRegex },
        { email: searchRegex }
      ]
    }).select('_id');

    const matchingMemberIds = matchingMembers.map(m => m._id);
    if (matchingMemberIds.length === 0) {
      const limitVal = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));
      return { total: 0, page: 1, pages: 0, limit: limitVal, bookings: [] };
    }

    filter.member = { $in: matchingMemberIds };
  } else if (query.memberId || query.member) {
    const memberId = query.memberId || query.member;
    if (!mongoose.Types.ObjectId.isValid(memberId)) {
      const error = new Error('Invalid member ID format.');
      error.statusCode = 400;
      throw error;
    }
    filter.member = new mongoose.Types.ObjectId(memberId);
  }

  // 5. Status Filter
  if (query.status) {
    const statusUpper = query.status.toUpperCase();
    const validStatuses = ['BOOKED', 'WAITLISTED', 'CANCELLED', 'ATTENDED', 'NO_SHOW'];
    if (!validStatuses.includes(statusUpper)) {
      const error = new Error(`Invalid status filter. Allowed values: ${validStatuses.join(', ')}`);
      error.statusCode = 400;
      throw error;
    }
    filter.status = statusUpper;
  }

  // 6. Safe Sorting Whitelist
  const rawSortBy = (query.sortBy || query.sort || 'createdAt').toString().toLowerCase();
  const rawOrder = (query.order || query.sortOrder || query.dir || 'desc').toString().toLowerCase();
  const sortDir = (rawOrder === 'asc' || rawOrder === '1') ? 1 : -1;

  let isSessionSort = false;
  let sortFieldKey = 'createdAt';

  if (['sessiondate', 'sessiontime', 'sessiondatetime', 'startdatetime', 'session'].includes(rawSortBy)) {
    isSessionSort = true;
  } else if (rawSortBy === 'status') {
    sortFieldKey = 'status';
  } else {
    // Default to createdAt
    sortFieldKey = 'createdAt';
  }

  // 7. Pagination Setup
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));
  const skip = (page - 1) * limit;

  let total = 0;
  let bookings = [];

  if (isSessionSort) {
    // Database aggregation to sort by joined session.startDateTime
    const pipeline = [
      { $match: filter },
      {
        $lookup: {
          from: 'sessions',
          localField: 'session',
          foreignField: '_id',
          as: 'sessionDoc'
        }
      },
      { $unwind: '$sessionDoc' },
      { $sort: { 'sessionDoc.startDateTime': sortDir, createdAt: -1, _id: 1 } },
      {
        $facet: {
          metadata: [{ $count: 'total' }],
          data: [{ $skip: skip }, { $limit: limit }]
        }
      }
    ];

    const aggregateResult = await Booking.aggregate(pipeline);
    const metadata = aggregateResult[0]?.metadata || [];
    total = metadata[0]?.total || 0;

    const bookingItems = aggregateResult[0]?.data || [];
    const bookingIds = bookingItems.map(item => item._id);

    const populatedBookings = await Booking.find({ _id: { $in: bookingIds } })
      .populate('member', 'name email membershipExpiry')
      .populate({
        path: 'session',
        populate: [
          { path: 'classId', select: 'title discipline' },
          { path: 'room', select: 'name location' },
          { path: 'primaryInstructor', select: 'name email' }
        ]
      });

    const bookingMap = new Map(populatedBookings.map(b => [b._id.toString(), b]));
    bookings = bookingIds.map(id => bookingMap.get(id.toString())).filter(Boolean);
  } else {
    total = await Booking.countDocuments(filter);
    const sortObj = sortFieldKey === 'status'
      ? { status: sortDir, createdAt: -1 }
      : { createdAt: sortDir };

    bookings = await Booking.find(filter)
      .sort(sortObj)
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
  }

  return {
    total,
    page,
    pages: Math.ceil(total / limit) || 0,
    limit,
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
  getBookingHistory,
  exportAttendanceCsv
};

