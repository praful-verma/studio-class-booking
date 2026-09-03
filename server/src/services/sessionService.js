const Session = require('../models/Session');
const Class = require('../models/Class');
const Room = require('../models/Room');
const User = require('../models/User');

/**
 * Calculates UTC dateOnly, startDateTime, and endDateTime from input parameters.
 */
const calculateDateTimes = (dateInput, startTimeStr, durationMinutes) => {
  const dateObj = new Date(dateInput);
  if (isNaN(dateObj.getTime())) {
    const error = new Error('Invalid session date.');
    error.statusCode = 400;
    throw error;
  }

  const timeParts = startTimeStr.split(':');
  if (timeParts.length < 2) {
    const error = new Error('startTime must be in HH:MM format (e.g. "09:30").');
    error.statusCode = 400;
    throw error;
  }

  const hours = parseInt(timeParts[0], 10);
  const minutes = parseInt(timeParts[1], 10);

  if (isNaN(hours) || hours < 0 || hours > 23 || isNaN(minutes) || minutes < 0 || minutes > 59) {
    const error = new Error('startTime must be a valid time in HH:MM format.');
    error.statusCode = 400;
    throw error;
  }

  // Build UTC startDateTime
  const startDateTime = new Date(Date.UTC(
    dateObj.getUTCFullYear(),
    dateObj.getUTCMonth(),
    dateObj.getUTCDate(),
    hours,
    minutes,
    0,
    0
  ));

  const endDateTime = new Date(startDateTime.getTime() + durationMinutes * 60 * 1000);
  const dateOnly = new Date(Date.UTC(
    dateObj.getUTCFullYear(),
    dateObj.getUTCMonth(),
    dateObj.getUTCDate(),
    0, 0, 0, 0
  ));

  return { dateOnly, startDateTime, endDateTime };
};

/**
 * Validates that an instructor ID refers to an active user with role INSTRUCTOR.
 */
const validateInstructorUser = async (instructorId, fieldName = 'Instructor') => {
  const user = await User.findById(instructorId);
  if (!user) {
    const error = new Error(`${fieldName} user not found.`);
    error.statusCode = 404;
    throw error;
  }
  if (user.role !== 'INSTRUCTOR') {
    const error = new Error(`${fieldName} must have the INSTRUCTOR role.`);
    error.statusCode = 400;
    throw error;
  }
  if (!user.isActive) {
    const error = new Error(`${fieldName} account is inactive.`);
    error.statusCode = 400;
    throw error;
  }
  return user;
};

/**
 * Validates primary and co-instructors rules.
 */
const validateInstructors = async (primaryInstructorId, coInstructorsInput = []) => {
  await validateInstructorUser(primaryInstructorId, 'Primary instructor');

  const coInstructorIds = Array.isArray(coInstructorsInput) ? coInstructorsInput : [];
  const uniqueCoIds = new Set();

  for (const coId of coInstructorIds) {
    const coIdStr = coId.toString();
    if (coIdStr === primaryInstructorId.toString()) {
      const error = new Error('Primary instructor cannot also be listed as a co-instructor.');
      error.statusCode = 400;
      throw error;
    }
    if (uniqueCoIds.has(coIdStr)) {
      const error = new Error('Duplicate co-instructors are not allowed.');
      error.statusCode = 400;
      throw error;
    }
    uniqueCoIds.add(coIdStr);
    await validateInstructorUser(coId, 'Co-instructor');
  }

  return Array.from(uniqueCoIds);
};

/**
 * Checks for room and instructor scheduling overlaps.
 * Overlap formula: existing.startDateTime < newEndDateTime AND existing.endDateTime > newStartDateTime
 */
const checkSchedulingConflicts = async ({ roomId, primaryInstructorId, coInstructorIds = [], startDateTime, endDateTime, excludeSessionId = null }) => {
  const baseQuery = {
    status: { $ne: 'CANCELLED' },
    startDateTime: { $lt: endDateTime },
    endDateTime: { $gt: startDateTime }
  };

  if (excludeSessionId) {
    baseQuery._id = { $ne: excludeSessionId };
  }

  // 1. Room Overlap Check
  const roomConflict = await Session.findOne({
    ...baseQuery,
    room: roomId
  });

  if (roomConflict) {
    const error = new Error('Room scheduling conflict: The selected room is already booked for an overlapping session.');
    error.statusCode = 400;
    throw error;
  }

  // 2. Instructor Overlap Check (Primary + Co-Instructors)
  const allInstructors = [primaryInstructorId, ...coInstructorIds];
  const instructorConflict = await Session.findOne({
    ...baseQuery,
    $or: [
      { primaryInstructor: { $in: allInstructors } },
      { coInstructors: { $in: allInstructors } }
    ]
  });

  if (instructorConflict) {
    const error = new Error('Instructor scheduling conflict: One or more assigned instructors (primary or co-instructor) have an overlapping session.');
    error.statusCode = 400;
    throw error;
  }
};

/**
 * Creates a new class session.
 */
const createSession = async (sessionData) => {
  const { classId, date, startTime, primaryInstructor, room, coInstructors, duration, capacity } = sessionData;

  if (!classId || !date || !startTime || !primaryInstructor || !room) {
    const error = new Error('Please provide classId, date, startTime, primaryInstructor, and room.');
    error.statusCode = 400;
    throw error;
  }

  // Validate Class & default values
  const classDoc = await Class.findById(classId);
  if (!classDoc) {
    const error = new Error('Class not found.');
    error.statusCode = 404;
    throw error;
  }
  if (classDoc.isArchived) {
    const error = new Error('Cannot schedule a session for an archived class.');
    error.statusCode = 400;
    throw error;
  }

  // Validate Room
  const roomDoc = await Room.findById(room);
  if (!roomDoc) {
    const error = new Error('Room not found.');
    error.statusCode = 404;
    throw error;
  }
  if (roomDoc.isArchived) {
    const error = new Error('Cannot schedule a session in an archived room.');
    error.statusCode = 400;
    throw error;
  }

  // Determine duration and capacity (fallback to Class defaults)
  const finalDuration = duration !== undefined ? Number(duration) : classDoc.defaultDuration;
  const finalCapacity = capacity !== undefined ? Number(capacity) : classDoc.defaultCapacity;

  if (isNaN(finalDuration) || finalDuration < 1) {
    const error = new Error('Duration must be a number greater than or equal to 1.');
    error.statusCode = 400;
    throw error;
  }

  if (isNaN(finalCapacity) || finalCapacity < 1) {
    const error = new Error('Capacity must be a number greater than or equal to 1.');
    error.statusCode = 400;
    throw error;
  }

  // Validate Instructors
  const validatedCoInstructors = await validateInstructors(primaryInstructor, coInstructors);

  // Compute startDateTime & endDateTime
  const { dateOnly, startDateTime, endDateTime } = calculateDateTimes(date, startTime, finalDuration);

  // Check Overlaps
  await checkSchedulingConflicts({
    roomId: room,
    primaryInstructorId: primaryInstructor,
    coInstructorIds: validatedCoInstructors,
    startDateTime,
    endDateTime
  });

  const newSession = await Session.create({
    classId,
    date: dateOnly,
    startTime: startTime.trim(),
    duration: finalDuration,
    startDateTime,
    endDateTime,
    capacity: finalCapacity,
    primaryInstructor,
    coInstructors: validatedCoInstructors,
    room,
    status: 'SCHEDULED'
  });

  return Session.findById(newSession._id).populate('classId room primaryInstructor coInstructors');
};

/**
 * Retrieves all sessions.
 * Server-side role enforcement: INSTRUCTORS only see sessions where they are primary or co-instructor.
 */
const getAllSessions = async (query = {}, user = null) => {
  const filter = {};

  // Server-side Role Authorization for Instructors
  if (user && user.role === 'INSTRUCTOR') {
    filter.$or = [
      { primaryInstructor: user._id },
      { coInstructors: user._id }
    ];
  }

  if (query.status) {
    filter.status = query.status.toUpperCase();
  }

  if (query.classId) {
    filter.classId = query.classId;
  }

  if (query.roomId) {
    filter.room = query.roomId;
  }

  if (query.startDate || query.endDate) {
    filter.startDateTime = {};
    if (query.startDate) {
      filter.startDateTime.$gte = new Date(query.startDate);
    }
    if (query.endDate) {
      filter.startDateTime.$lte = new Date(query.endDate);
    }
  }

  const sessions = await Session.find(filter)
    .sort({ startDateTime: 1 })
    .populate('classId', 'title discipline defaultDuration defaultCapacity')
    .populate('room', 'name capacity location')
    .populate('primaryInstructor', 'name email role')
    .populate('coInstructors', 'name email role');

  return sessions;
};

/**
 * Retrieves a single session by ID.
 * Enforces instructor-only access rule.
 */
const getSessionById = async (id, user = null) => {
  const session = await Session.findById(id)
    .populate('classId', 'title discipline defaultDuration defaultCapacity')
    .populate('room', 'name capacity location')
    .populate('primaryInstructor', 'name email role')
    .populate('coInstructors', 'name email role');

  if (!session) {
    const error = new Error('Session not found.');
    error.statusCode = 404;
    throw error;
  }

  // Server-side Authorization Check for Instructors
  if (user && user.role === 'INSTRUCTOR') {
    const isPrimary = session.primaryInstructor && session.primaryInstructor._id.toString() === user._id.toString();
    const isCo = session.coInstructors && session.coInstructors.some(co => co._id.toString() === user._id.toString());

    if (!isPrimary && !isCo) {
      const error = new Error('Access denied. Instructors can only view sessions where they are assigned as primary or co-instructor.');
      error.statusCode = 403;
      throw error;
    }
  }

  return session;
};

/**
 * Updates an existing session.
 */
const updateSession = async (id, updateData) => {
  const session = await Session.findById(id);
  if (!session) {
    const error = new Error('Session not found.');
    error.statusCode = 404;
    throw error;
  }

  const classId = updateData.classId || session.classId;
  const room = updateData.room || session.room;
  const primaryInstructor = updateData.primaryInstructor || session.primaryInstructor;
  const coInstructors = updateData.coInstructors !== undefined ? updateData.coInstructors : session.coInstructors;
  const dateInput = updateData.date || session.date;
  const startTimeInput = updateData.startTime || session.startTime;
  const durationInput = updateData.duration !== undefined ? updateData.duration : session.duration;
  const capacityInput = updateData.capacity !== undefined ? updateData.capacity : session.capacity;

  // Validate Class & Room
  const classDoc = await Class.findById(classId);
  if (!classDoc) {
    const error = new Error('Class not found.');
    error.statusCode = 404;
    throw error;
  }

  const roomDoc = await Room.findById(room);
  if (!roomDoc) {
    const error = new Error('Room not found.');
    error.statusCode = 404;
    throw error;
  }

  const durationNum = Number(durationInput);
  const capacityNum = Number(capacityInput);

  if (isNaN(durationNum) || durationNum < 1) {
    const error = new Error('Duration must be a number greater than or equal to 1.');
    error.statusCode = 400;
    throw error;
  }

  if (isNaN(capacityNum) || capacityNum < 1) {
    const error = new Error('Capacity must be a number greater than or equal to 1.');
    error.statusCode = 400;
    throw error;
  }

  // Validate Instructors
  const validatedCoInstructors = await validateInstructors(primaryInstructor, coInstructors);

  // Re-compute DateTimes
  const { dateOnly, startDateTime, endDateTime } = calculateDateTimes(dateInput, startTimeInput, durationNum);

  // Overlap Check excluding current session ID
  await checkSchedulingConflicts({
    roomId: room,
    primaryInstructorId: primaryInstructor,
    coInstructorIds: validatedCoInstructors,
    startDateTime,
    endDateTime,
    excludeSessionId: id
  });

  session.classId = classId;
  session.room = room;
  session.primaryInstructor = primaryInstructor;
  session.coInstructors = validatedCoInstructors;
  session.date = dateOnly;
  session.startTime = startTimeInput;
  session.duration = durationNum;
  session.capacity = capacityNum;
  session.startDateTime = startDateTime;
  session.endDateTime = endDateTime;

  if (updateData.status && ['SCHEDULED', 'COMPLETED', 'CANCELLED'].includes(updateData.status.toUpperCase())) {
    session.status = updateData.status.toUpperCase();
  }

  await session.save();

  return Session.findById(id).populate('classId room primaryInstructor coInstructors');
};

/**
 * Cancels a session (sets status: 'CANCELLED'). Frees up room and instructor schedules.
 */
const cancelSession = async (id) => {
  const session = await Session.findById(id);
  if (!session) {
    const error = new Error('Session not found.');
    error.statusCode = 404;
    throw error;
  }

  session.status = 'CANCELLED';
  await session.save();

  return Session.findById(id).populate('classId room primaryInstructor coInstructors');
};

/**
 * Helper to normalize days of week input into a Set of numbers (0=Sun to 6=Sat).
 */
const normalizeDaysOfWeek = (pattern) => {
  if (!pattern) return new Set();
  const arr = Array.isArray(pattern) ? pattern : [pattern];
  const dayMap = {
    sunday: 0, sun: 0, '0': 0,
    monday: 1, mon: 1, '1': 1,
    tuesday: 2, tue: 2, tues: 2, '2': 2,
    wednesday: 3, wed: 3, '3': 3,
    thursday: 4, thu: 4, thur: 4, thurs: 4, '4': 4,
    friday: 5, fri: 5, '5': 5,
    saturday: 6, sat: 6, '6': 6
  };

  const resultSet = new Set();
  for (const item of arr) {
    if (typeof item === 'number' && item >= 0 && item <= 6) {
      resultSet.add(item);
    } else if (item !== undefined && item !== null) {
      const key = String(item).trim().toLowerCase();
      if (dayMap[key] !== undefined) {
        resultSet.add(dayMap[key]);
      }
    }
  }
  return resultSet;
};

/**
 * Bulk-generates sessions for a weekly pattern across a date range.
 * Reuses existing validation and overlap checks. Skips conflicting/duplicate occurrences with clear reasons.
 */
const generateRecurringSessions = async (data) => {
  const {
    classId,
    startDate,
    endDate,
    weeklyPattern,
    daysOfWeek,
    startTime,
    primaryInstructor,
    room,
    coInstructors,
    duration,
    capacity
  } = data;

  if (!classId || !startDate || !endDate || !startTime || !primaryInstructor || !room) {
    const error = new Error('Please provide classId, startDate, endDate, startTime, primaryInstructor, and room.');
    error.statusCode = 400;
    throw error;
  }

  const patternInput = weeklyPattern !== undefined ? weeklyPattern : daysOfWeek;
  const targetDaysSet = normalizeDaysOfWeek(patternInput);
  if (targetDaysSet.size === 0) {
    const error = new Error('Please provide a valid weeklyPattern or daysOfWeek (e.g. ["MONDAY", "WEDNESDAY"] or [1, 3]).');
    error.statusCode = 400;
    throw error;
  }

  const startObj = new Date(startDate);
  const endObj = new Date(endDate);

  if (isNaN(startObj.getTime()) || isNaN(endObj.getTime())) {
    const error = new Error('Invalid startDate or endDate format.');
    error.statusCode = 400;
    throw error;
  }

  if (startObj > endObj) {
    const error = new Error('startDate must be before or equal to endDate.');
    error.statusCode = 400;
    throw error;
  }

  // 1. Validate Class
  const classDoc = await Class.findById(classId);
  if (!classDoc) {
    const error = new Error('Class not found.');
    error.statusCode = 404;
    throw error;
  }
  if (classDoc.isArchived) {
    const error = new Error('Cannot schedule sessions for an archived class.');
    error.statusCode = 400;
    throw error;
  }

  // 2. Validate Room
  const roomDoc = await Room.findById(room);
  if (!roomDoc) {
    const error = new Error('Room not found.');
    error.statusCode = 404;
    throw error;
  }
  if (roomDoc.isArchived) {
    const error = new Error('Cannot schedule sessions in an archived room.');
    error.statusCode = 400;
    throw error;
  }

  // 3. Fallbacks for duration & capacity
  const finalDuration = duration !== undefined ? Number(duration) : classDoc.defaultDuration;
  const finalCapacity = capacity !== undefined ? Number(capacity) : classDoc.defaultCapacity;

  if (isNaN(finalDuration) || finalDuration < 1) {
    const error = new Error('Duration must be a number greater than or equal to 1.');
    error.statusCode = 400;
    throw error;
  }

  if (isNaN(finalCapacity) || finalCapacity < 1) {
    const error = new Error('Capacity must be a number greater than or equal to 1.');
    error.statusCode = 400;
    throw error;
  }

  // 4. Validate Instructors
  const validatedCoInstructors = await validateInstructors(primaryInstructor, coInstructors);

  // 5. Date Loop Iteration
  const createdSessions = [];
  const skippedSessions = [];

  const currentDate = new Date(Date.UTC(
    startObj.getUTCFullYear(),
    startObj.getUTCMonth(),
    startObj.getUTCDate()
  ));

  const lastDate = new Date(Date.UTC(
    endObj.getUTCFullYear(),
    endObj.getUTCMonth(),
    endObj.getUTCDate()
  ));

  while (currentDate <= lastDate) {
    const dayOfWeek = currentDate.getUTCDay();
    if (targetDaysSet.has(dayOfWeek)) {
      const dateStr = currentDate.toISOString().split('T')[0];

      // Calculate startDateTime and endDateTime for candidate date
      const { dateOnly, startDateTime, endDateTime } = calculateDateTimes(dateStr, startTime, finalDuration);

      // Duplicate Check: Check if an active/scheduled session already exists for same class, room, and startDateTime
      const existingDuplicate = await Session.findOne({
        classId,
        room,
        startDateTime,
        status: { $ne: 'CANCELLED' }
      });

      if (existingDuplicate) {
        skippedSessions.push({
          date: dateStr,
          startTime: startTime.trim(),
          reason: 'Duplicate session already exists for this class, room, and start time.'
        });
      } else {
        // Overlap Check (Room & Instructors)
        try {
          await checkSchedulingConflicts({
            roomId: room,
            primaryInstructorId: primaryInstructor,
            coInstructorIds: validatedCoInstructors,
            startDateTime,
            endDateTime
          });

          // No conflicts or duplicates -> Create Session
          const newSession = await Session.create({
            classId,
            date: dateOnly,
            startTime: startTime.trim(),
            duration: finalDuration,
            startDateTime,
            endDateTime,
            capacity: finalCapacity,
            primaryInstructor,
            coInstructors: validatedCoInstructors,
            room,
            status: 'SCHEDULED'
          });

          const populated = await Session.findById(newSession._id).populate('classId room primaryInstructor coInstructors');
          createdSessions.push(populated);
        } catch (conflictError) {
          skippedSessions.push({
            date: dateStr,
            startTime: startTime.trim(),
            reason: conflictError.message
          });
        }
      }
    }

    // Increment date by 1 day
    currentDate.setUTCDate(currentDate.getUTCDate() + 1);
  }

  return {
    created: createdSessions.length,
    skipped: skippedSessions.length,
    createdSessions,
    skippedSessions
  };
};

module.exports = {
  createSession,
  getAllSessions,
  getSessionById,
  updateSession,
  cancelSession,
  generateRecurringSessions
};
