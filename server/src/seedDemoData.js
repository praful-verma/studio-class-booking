require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const connectDB = require('./config/db');
const User = require('./models/User');
const Class = require('./models/Class');
const Room = require('./models/Room');
const Member = require('./models/Member');
const Session = require('./models/Session');
const Booking = require('./models/Booking');
const BookingHistory = require('./models/BookingHistory');

/**
 * Helper to format Date object into YYYY-MM-DD string in UTC.
 */
const formatDateString = (dateObj) => {
  const y = dateObj.getUTCFullYear();
  const m = String(dateObj.getUTCMonth() + 1).padStart(2, '0');
  const d = String(dateObj.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

/**
 * Helper to calculate startDateTime and endDateTime in UTC.
 */
const calculateDateTimes = (dateStr, startTimeStr, durationMinutes) => {
  const [year, month, day] = dateStr.split('-').map(Number);
  const [hours, minutes] = startTimeStr.split(':').map(Number);

  const startDateTime = new Date(Date.UTC(year, month - 1, day, hours, minutes, 0, 0));
  const endDateTime = new Date(startDateTime.getTime() + durationMinutes * 60 * 1000);
  const dateOnly = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));

  return { dateOnly, startDateTime, endDateTime };
};

const seedDemoData = async () => {
  try {
    console.log('=====================================================');
    console.log('   SEEDING REALISTIC STUDIO DEMO DATA               ');
    console.log('=====================================================');

    await connectDB();

    // 1. Fetch or create Demo Users (staff@demo.com & instructor@demo.com)
    let staffUser = await User.findOne({ email: 'staff@demo.com' });
    if (!staffUser) {
      const passwordHash = await bcrypt.hash('Demo@123', 10);
      staffUser = await User.create({
        name: 'Demo Staff User',
        email: 'staff@demo.com',
        passwordHash,
        role: 'STAFF',
        isActive: true
      });
      console.log('[OK] Created demo staff user: staff@demo.com');
    } else {
      console.log('[OK] Found existing demo staff user: staff@demo.com');
    }

    let instructorUser = await User.findOne({ email: 'instructor@demo.com' });
    if (!instructorUser) {
      const passwordHash = await bcrypt.hash('Demo@123', 10);
      instructorUser = await User.create({
        name: 'Demo Instructor User',
        email: 'instructor@demo.com',
        passwordHash,
        role: 'INSTRUCTOR',
        isActive: true
      });
      console.log('[OK] Created demo instructor user: instructor@demo.com');
    } else {
      console.log('[OK] Found existing demo instructor user: instructor@demo.com');
    }

    // 2. Class Templates
    const classDefs = [
      { title: 'Morning Yoga Flow', discipline: 'Yoga', defaultDuration: 60, defaultCapacity: 10, description: 'Energizing morning vinyasa flow.' },
      { title: 'Strength & Conditioning', discipline: 'Strength', defaultDuration: 45, defaultCapacity: 12, description: 'Full body functional strength training.' },
      { title: 'Pilates Fundamentals', discipline: 'Pilates', defaultDuration: 50, defaultCapacity: 8, description: 'Core strength and body alignment.' },
      { title: 'HIIT Express', discipline: 'HIIT', defaultDuration: 30, defaultCapacity: 10, description: 'High intensity interval cardio workout.' }
    ];

    const classMap = {};
    for (const cDef of classDefs) {
      let cDoc = await Class.findOne({ title: cDef.title });
      if (!cDoc) {
        cDoc = await Class.create(cDef);
        console.log(`[OK] Created Class: ${cDef.title}`);
      } else {
        console.log(`[OK] Found existing Class: ${cDef.title}`);
      }
      classMap[cDef.title] = cDoc;
    }

    // 3. Studio Rooms
    const roomDefs = [
      { name: 'Studio A', capacity: 10, location: 'Floor 1, East Wing' },
      { name: 'Studio B', capacity: 8, location: 'Floor 1, West Wing' },
      { name: 'Main Training Hall', capacity: 15, location: 'Floor 2' }
    ];

    const roomMap = {};
    for (const rDef of roomDefs) {
      let rDoc = await Room.findOne({ name: rDef.name });
      if (!rDoc) {
        rDoc = await Room.create(rDef);
        console.log(`[OK] Created Room: ${rDef.name}`);
      } else {
        console.log(`[OK] Found existing Room: ${rDef.name}`);
      }
      roomMap[rDef.name] = rDoc;
    }

    // 4. Studio Members with Expiry Dates
    const now = new Date();
    const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const daysOffset = (days) => new Date(todayUTC.getTime() + days * 24 * 60 * 60 * 1000);

    const memberDefs = [
      { name: 'Aarav Sharma', email: 'aarav.sharma@example.com', membershipExpiry: daysOffset(60) },
      { name: 'Neha Verma', email: 'neha.verma@example.com', membershipExpiry: daysOffset(3) },  // Expiring in 3 days (Alert)
      { name: 'Rohan Mehta', email: 'rohan.mehta@example.com', membershipExpiry: daysOffset(-5) }, // Expired 5 days ago (Alert)
      { name: 'Ananya Singh', email: 'ananya.singh@example.com', membershipExpiry: daysOffset(90) },
      { name: 'Kavya Gupta', email: 'kavya.gupta@example.com', membershipExpiry: daysOffset(45) }
    ];

    const memberMap = {};
    for (const mDef of memberDefs) {
      let mDoc = await Member.findOne({ email: mDef.email });
      if (!mDoc) {
        mDoc = await Member.create(mDef);
        console.log(`[OK] Created Member: ${mDef.name} (${mDef.email})`);
      } else {
        mDoc.name = mDef.name;
        mDoc.membershipExpiry = mDef.membershipExpiry;
        await mDoc.save();
        console.log(`[OK] Updated Member expiry: ${mDef.name}`);
      }
      memberMap[mDef.email] = mDoc;
    }

    // 5. Sessions (Historical Past, Today, and Future)
    const sessionDefs = [
      // Past Completed Sessions (for 8-week attendance trend)
      { classTitle: 'Morning Yoga Flow', roomName: 'Studio A', dateStr: formatDateString(daysOffset(-28)), startTime: '09:00', duration: 60, capacity: 10, status: 'COMPLETED' },
      { classTitle: 'Strength & Conditioning', roomName: 'Main Training Hall', dateStr: formatDateString(daysOffset(-21)), startTime: '10:00', duration: 45, capacity: 12, status: 'COMPLETED' },
      { classTitle: 'Pilates Fundamentals', roomName: 'Studio B', dateStr: formatDateString(daysOffset(-14)), startTime: '11:00', duration: 50, capacity: 8, status: 'COMPLETED' },
      { classTitle: 'HIIT Express', roomName: 'Main Training Hall', dateStr: formatDateString(daysOffset(-7)), startTime: '16:00', duration: 30, capacity: 10, status: 'COMPLETED' },
      { classTitle: 'Morning Yoga Flow', roomName: 'Studio A', dateStr: formatDateString(daysOffset(-2)), startTime: '09:00', duration: 60, capacity: 10, status: 'COMPLETED' },

      // Today's Sessions
      { classTitle: 'Morning Yoga Flow', roomName: 'Studio A', dateStr: formatDateString(daysOffset(0)), startTime: '10:00', duration: 60, capacity: 2, status: 'SCHEDULED' }, // Capacity=2 to test waitlist
      { classTitle: 'Pilates Fundamentals', roomName: 'Studio B', dateStr: formatDateString(daysOffset(0)), startTime: '14:00', duration: 50, capacity: 8, status: 'SCHEDULED' },

      // Future Sessions
      { classTitle: 'Strength & Conditioning', roomName: 'Main Training Hall', dateStr: formatDateString(daysOffset(1)), startTime: '09:00', duration: 45, capacity: 12, status: 'SCHEDULED' },
      { classTitle: 'HIIT Express', roomName: 'Main Training Hall', dateStr: formatDateString(daysOffset(3)), startTime: '11:00', duration: 30, capacity: 10, status: 'SCHEDULED' },
      { classTitle: 'Morning Yoga Flow', roomName: 'Studio A', dateStr: formatDateString(daysOffset(5)), startTime: '16:00', duration: 60, capacity: 10, status: 'SCHEDULED' }
    ];

    const sessionMap = {};
    let createdSessionsCount = 0;
    let skippedSessionsCount = 0;

    for (const sDef of sessionDefs) {
      const targetClass = classMap[sDef.classTitle];
      const targetRoom = roomMap[sDef.roomName];
      const { dateOnly, startDateTime, endDateTime } = calculateDateTimes(sDef.dateStr, sDef.startTime, sDef.duration);

      let sDoc = await Session.findOne({
        classId: targetClass._id,
        room: targetRoom._id,
        startDateTime
      });

      if (!sDoc) {
        sDoc = await Session.create({
          classId: targetClass._id,
          date: dateOnly,
          startTime: sDef.startTime,
          duration: sDef.duration,
          startDateTime,
          endDateTime,
          capacity: sDef.capacity,
          primaryInstructor: instructorUser._id,
          room: targetRoom._id,
          status: sDef.status
        });
        createdSessionsCount++;
      } else {
        skippedSessionsCount++;
      }
      const key = `${sDef.classTitle}_${sDef.dateStr}_${sDef.startTime}`;
      sessionMap[key] = sDoc;
    }

    console.log(`[OK] Sessions processed: ${createdSessionsCount} created, ${skippedSessionsCount} existing skipped.`);

    // 6. Bookings & Audit History
    const bookingDefs = [
      // Past Completed Sessions (ATTENDED)
      { sessionKey: `Morning Yoga Flow_${formatDateString(daysOffset(-28))}_09:00`, memberEmail: 'aarav.sharma@example.com', status: 'ATTENDED' },
      { sessionKey: `Morning Yoga Flow_${formatDateString(daysOffset(-28))}_09:00`, memberEmail: 'ananya.singh@example.com', status: 'ATTENDED' },

      { sessionKey: `Strength & Conditioning_${formatDateString(daysOffset(-21))}_10:00`, memberEmail: 'aarav.sharma@example.com', status: 'ATTENDED' },
      { sessionKey: `Strength & Conditioning_${formatDateString(daysOffset(-21))}_10:00`, memberEmail: 'kavya.gupta@example.com', status: 'ATTENDED' },

      { sessionKey: `Pilates Fundamentals_${formatDateString(daysOffset(-14))}_11:00`, memberEmail: 'ananya.singh@example.com', status: 'ATTENDED' },
      { sessionKey: `Pilates Fundamentals_${formatDateString(daysOffset(-14))}_11:00`, memberEmail: 'kavya.gupta@example.com', status: 'ATTENDED' },

      { sessionKey: `HIIT Express_${formatDateString(daysOffset(-7))}_16:00`, memberEmail: 'aarav.sharma@example.com', status: 'ATTENDED' },

      { sessionKey: `Morning Yoga Flow_${formatDateString(daysOffset(-2))}_09:00`, memberEmail: 'aarav.sharma@example.com', status: 'ATTENDED' },
      { sessionKey: `Morning Yoga Flow_${formatDateString(daysOffset(-2))}_09:00`, memberEmail: 'ananya.singh@example.com', status: 'ATTENDED' },

      // Today's Session 1 (Capacity = 2): Aarav BOOKED, Ananya BOOKED, Kavya WAITLISTED
      { sessionKey: `Morning Yoga Flow_${formatDateString(daysOffset(0))}_10:00`, memberEmail: 'aarav.sharma@example.com', status: 'BOOKED' },
      { sessionKey: `Morning Yoga Flow_${formatDateString(daysOffset(0))}_10:00`, memberEmail: 'ananya.singh@example.com', status: 'BOOKED' },
      { sessionKey: `Morning Yoga Flow_${formatDateString(daysOffset(0))}_10:00`, memberEmail: 'kavya.gupta@example.com', status: 'WAITLISTED' },

      // Today's Session 2: Aarav BOOKED, Kavya BOOKED, Neha CANCELLED
      { sessionKey: `Pilates Fundamentals_${formatDateString(daysOffset(0))}_14:00`, memberEmail: 'aarav.sharma@example.com', status: 'BOOKED' },
      { sessionKey: `Pilates Fundamentals_${formatDateString(daysOffset(0))}_14:00`, memberEmail: 'kavya.gupta@example.com', status: 'BOOKED' },
      { sessionKey: `Pilates Fundamentals_${formatDateString(daysOffset(0))}_14:00`, memberEmail: 'neha.verma@example.com', status: 'CANCELLED' },

      // Future Sessions
      { sessionKey: `Strength & Conditioning_${formatDateString(daysOffset(1))}_09:00`, memberEmail: 'aarav.sharma@example.com', status: 'BOOKED' },
      { sessionKey: `Strength & Conditioning_${formatDateString(daysOffset(1))}_09:00`, memberEmail: 'ananya.singh@example.com', status: 'BOOKED' },

      { sessionKey: `HIIT Express_${formatDateString(daysOffset(3))}_11:00`, memberEmail: 'kavya.gupta@example.com', status: 'BOOKED' },
      { sessionKey: `Morning Yoga Flow_${formatDateString(daysOffset(5))}_16:00`, memberEmail: 'aarav.sharma@example.com', status: 'BOOKED' }
    ];

    let createdBookingsCount = 0;
    let skippedBookingsCount = 0;

    for (const bDef of bookingDefs) {
      const sDoc = sessionMap[bDef.sessionKey];
      const mDoc = memberMap[bDef.memberEmail];
      if (!sDoc || !mDoc) continue;

      let bDoc = await Booking.findOne({ member: mDoc._id, session: sDoc._id });
      if (!bDoc) {
        bDoc = await Booking.create({
          member: mDoc._id,
          session: sDoc._id,
          status: bDef.status
        });

        // Record valid lifecycle transitions in BookingHistory
        if (bDef.status === 'ATTENDED' || bDef.status === 'CANCELLED' || bDef.status === 'NO_SHOW') {
          await BookingHistory.create({
            booking: bDoc._id,
            oldStatus: 'NONE',
            newStatus: 'BOOKED',
            changedBy: staffUser._id,
            timestamp: bDoc.createdAt || new Date(),
            staffNote: 'Demo data seed'
          });
          await BookingHistory.create({
            booking: bDoc._id,
            oldStatus: 'BOOKED',
            newStatus: bDef.status,
            changedBy: staffUser._id,
            timestamp: bDoc.createdAt || new Date(),
            staffNote: 'Demo data seed'
          });
        } else {
          // BOOKED or WAITLISTED
          await BookingHistory.create({
            booking: bDoc._id,
            oldStatus: 'NONE',
            newStatus: bDef.status,
            changedBy: staffUser._id,
            timestamp: bDoc.createdAt || new Date(),
            staffNote: 'Demo data seed'
          });
        }
        createdBookingsCount++;
      } else {
        skippedBookingsCount++;
      }
    }

    console.log(`[OK] Bookings processed: ${createdBookingsCount} created, ${skippedBookingsCount} existing skipped.`);
    console.log('\n=====================================================');
    console.log('   DEMO DATA SEEDED SUCCESSFULLY!                    ');
    console.log('=====================================================\n');
    process.exit(0);
  } catch (error) {
    console.error('Demo data seed error:', error);
    process.exit(1);
  }
};

seedDemoData();
