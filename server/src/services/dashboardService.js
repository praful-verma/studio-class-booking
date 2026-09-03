const Booking = require('../models/Booking');
const Session = require('../models/Session');
const Class = require('../models/Class');

/**
 * Calculates server-side operational dashboard metrics.
 */
const getDashboardMetrics = async () => {
  const now = new Date();

  // UTC Date Boundaries
  const startOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
  const endOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));

  // Current Week (Monday 00:00:00 to Sunday 23:59:59 UTC)
  const dayOfWeek = now.getUTCDay(); // 0 = Sun, 1 = Mon...
  const daysSinceMonday = (dayOfWeek + 6) % 7;
  const startOfWeek = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - daysSinceMonday, 0, 0, 0, 0));
  const endOfWeek = new Date(startOfWeek.getTime() + 7 * 24 * 60 * 60 * 1000 - 1);

  // 1. Summary Metrics
  const sessionsToday = await Session.countDocuments({
    startDateTime: { $gte: startOfToday, $lte: endOfToday },
    status: { $ne: 'CANCELLED' }
  });

  const bookingsToday = await Booking.countDocuments({
    createdAt: { $gte: startOfToday, $lte: endOfToday }
  });

  const noShowsThisWeek = await Booking.countDocuments({
    status: 'NO_SHOW',
    updatedAt: { $gte: startOfWeek, $lte: endOfWeek }
  });

  const currentWaitlistedMembers = await Booking.countDocuments({
    status: 'WAITLISTED'
  });

  // 2. Bookings by Status
  const statusGroup = await Booking.aggregate([
    { $group: { _id: '$status', count: { $sum: 1 } } }
  ]);

  const defaultStatuses = ['BOOKED', 'WAITLISTED', 'CANCELLED', 'ATTENDED', 'NO_SHOW'];
  const bookingsByStatus = {};
  defaultStatuses.forEach(s => { bookingsByStatus[s] = 0; });
  statusGroup.forEach(item => {
    if (item._id && bookingsByStatus[item._id] !== undefined) {
      bookingsByStatus[item._id] = item.count;
    }
  });

  // 3. Bookings by Class
  const bookingsByClass = await Booking.aggregate([
    {
      $lookup: {
        from: 'sessions',
        localField: 'session',
        foreignField: '_id',
        as: 'sessionDoc'
      }
    },
    { $unwind: '$sessionDoc' },
    {
      $lookup: {
        from: 'classes',
        localField: 'sessionDoc.classId',
        foreignField: '_id',
        as: 'classDoc'
      }
    },
    { $unwind: '$classDoc' },
    {
      $group: {
        _id: '$classDoc._id',
        title: { $first: '$classDoc.title' },
        discipline: { $first: '$classDoc.discipline' },
        count: { $sum: 1 }
      }
    },
    { $sort: { count: -1 } }
  ]);

  // 4. Attendance Trend (Last 8 Weeks)
  const eightWeeksStart = new Date(startOfWeek.getTime() - 7 * 7 * 24 * 60 * 60 * 1000);
  const attendedBookings = await Booking.find({
    status: 'ATTENDED',
    updatedAt: { $gte: eightWeeksStart, $lte: endOfWeek }
  }).select('updatedAt createdAt');

  const attendancePerWeek = [];
  for (let i = 7; i >= 0; i--) {
    const wStart = new Date(startOfWeek.getTime() - i * 7 * 24 * 60 * 60 * 1000);
    const wEnd = new Date(wStart.getTime() + 7 * 24 * 60 * 60 * 1000 - 1);
    const count = attendedBookings.filter(b => {
      const t = new Date(b.updatedAt || b.createdAt).getTime();
      return t >= wStart.getTime() && t <= wEnd.getTime();
    }).length;

    attendancePerWeek.push({
      weekIndex: 7 - i,
      startDate: wStart.toISOString(),
      endDate: wEnd.toISOString(),
      weekLabel: `Week ${8 - i} (${wStart.toISOString().split('T')[0]})`,
      count
    });
  }

  return {
    summary: {
      sessionsToday,
      bookingsToday,
      noShowsThisWeek,
      currentWaitlistedMembers
    },
    bookingsByStatus,
    bookingsByClass,
    attendancePerWeek
  };
};

module.exports = {
  getDashboardMetrics
};
