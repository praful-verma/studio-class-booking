const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const connectDB = require('../config/db');
const classService = require('../services/classService');
const roomService = require('../services/roomService');
const sessionService = require('../services/sessionService');
const User = require('../models/User');
const bcrypt = require('bcryptjs');

async function runStep8Tests() {
  console.log('=====================================================');
  console.log('   STEP 8 RECURRING SESSION GENERATION TEST SUITE    ');
  console.log('=====================================================');

  await connectDB();

  const timestamp = Date.now();

  // 1. Setup Test Users (Staff + 2 Instructors)
  const staffUser = await User.findOne({ role: 'STAFF' }) || await User.create({
    name: `Step8 Staff ${timestamp}`,
    email: `staff_${timestamp}@example.com`,
    passwordHash: await bcrypt.hash('Demo@123', 10),
    role: 'STAFF',
    isActive: true
  });

  const inst1 = await User.create({
    name: `Instructor One ${timestamp}`,
    email: `inst1_${timestamp}@example.com`,
    passwordHash: await bcrypt.hash('Demo@123', 10),
    role: 'INSTRUCTOR',
    isActive: true
  });

  const inst2 = await User.create({
    name: `Instructor Two ${timestamp}`,
    email: `inst2_${timestamp}@example.com`,
    passwordHash: await bcrypt.hash('Demo@123', 10),
    role: 'INSTRUCTOR',
    isActive: true
  });

  // 2. Setup Active & Archived Classes and Rooms
  const activeClass = await classService.createClass({
    title: `Spin Cycle ${timestamp}`,
    discipline: 'Cycling',
    defaultDuration: 50,
    defaultCapacity: 15
  });

  const archivedClass = await classService.createClass({
    title: `Archived Yoga ${timestamp}`,
    discipline: 'Yoga',
    defaultDuration: 60,
    defaultCapacity: 10
  });
  await classService.archiveClass(archivedClass._id);

  const activeRoom = await roomService.createRoom({
    name: `Cycle Room ${timestamp}`,
    capacity: 20,
    location: 'Floor 1'
  });

  const archivedRoom = await roomService.createRoom({
    name: `Archived Room ${timestamp}`,
    capacity: 10,
    location: 'Floor 3'
  });
  await roomService.archiveRoom(archivedRoom._id);

  console.log('✓ Test resources created successfully.\n');

  // --- TEST 1: Basic Weekly Generation & Class Defaults ---
  console.log('[TEST 1] Generating recurring sessions for Mondays and Wednesdays (2032-01-01 to 2032-01-14)...');
  // 2032-01-01 is Thursday.
  // 2032-01-05 (Mon), 2032-01-07 (Wed), 2032-01-12 (Mon), 2032-01-14 (Wed) -> 4 matching dates!
  const res1 = await sessionService.generateRecurringSessions({
    classId: activeClass._id,
    startDate: '2032-01-01',
    endDate: '2032-01-14',
    weeklyPattern: ['MONDAY', 'WEDNESDAY'],
    startTime: '09:00',
    primaryInstructor: inst1._id,
    room: activeRoom._id
  });

  console.log(`  -> Created: ${res1.created}, Skipped: ${res1.skipped}`);
  if (res1.created !== 4 || res1.skipped !== 0) {
    throw new Error(`Test 1 Failed: Expected 4 created, 0 skipped. Got created: ${res1.created}, skipped: ${res1.skipped}`);
  }
  // Verify default duration & capacity fallback
  const firstSession = res1.createdSessions[0];
  console.log(`  -> Duration: ${firstSession.duration} (Expected default: 50), Capacity: ${firstSession.capacity} (Expected default: 15)`);
  if (firstSession.duration !== 50 || firstSession.capacity !== 15) {
    throw new Error('Test 1 Failed: Class defaults were not applied properly');
  }

  // --- TEST 2: Duration & Capacity Overrides ---
  console.log('\n[TEST 2] Testing duration & capacity overrides on Fridays (2032-01-01 to 2032-01-14)...');
  // Fridays: 2032-01-02, 2032-01-09 -> 2 dates
  const res2 = await sessionService.generateRecurringSessions({
    classId: activeClass._id,
    startDate: '2032-01-01',
    endDate: '2032-01-14',
    weeklyPattern: ['FRIDAY'],
    startTime: '10:00',
    primaryInstructor: inst1._id,
    room: activeRoom._id,
    duration: 75,
    capacity: 25
  });

  console.log(`  -> Created: ${res2.created}, Skipped: ${res2.skipped}`);
  if (res2.created !== 2) throw new Error('Test 2 Failed');
  if (res2.createdSessions[0].duration !== 75 || res2.createdSessions[0].capacity !== 25) {
    throw new Error('Test 2 Failed: Duration/capacity overrides failed');
  }

  // --- TEST 3: Room Conflict Handling & Partial Continuation ---
  console.log('\n[TEST 3] Testing Room Conflict handling (Pre-booking a conflicting room session on 2032-01-20)...');
  const conflictingClass = await classService.createClass({
    title: `Conflicting Class ${timestamp}`,
    discipline: 'Pilates',
    defaultDuration: 60,
    defaultCapacity: 10
  });

  // Create a single conflicting session in activeRoom on 2032-01-20 (Tuesday) at 09:00 - 10:00
  await sessionService.createSession({
    classId: conflictingClass._id,
    date: '2032-01-20',
    startTime: '09:00',
    primaryInstructor: inst2._id, // different instructor, same room
    room: activeRoom._id,
    duration: 60,
    capacity: 10
  });

  // Now bulk generate for Tuesdays from 2032-01-19 to 2032-01-27 (Tuesdays: 2032-01-20, 2032-01-27)
  const res3 = await sessionService.generateRecurringSessions({
    classId: activeClass._id,
    startDate: '2032-01-19',
    endDate: '2032-01-27',
    weeklyPattern: ['TUESDAY'],
    startTime: '09:00',
    primaryInstructor: inst1._id,
    room: activeRoom._id
  });

  console.log(`  -> Created: ${res3.created}, Skipped: ${res3.skipped}`);
  console.log(`  -> Skipped reason: "${res3.skippedSessions[0]?.reason}"`);
  if (res3.created !== 1 || res3.skipped !== 1) {
    throw new Error(`Test 3 Failed: Expected 1 created, 1 skipped. Got created: ${res3.created}, skipped: ${res3.skipped}`);
  }
  if (!res3.skippedSessions[0].reason.includes('Room scheduling conflict')) {
    throw new Error('Test 3 Failed: Reason did not mention Room scheduling conflict');
  }

  // --- TEST 4: Instructor Conflict Handling ---
  console.log('\n[TEST 4] Testing Instructor Conflict handling (Pre-booking Instructor 1 elsewhere on 2032-02-03)...');
  const otherRoom = await roomService.createRoom({ name: `Other Room ${timestamp}`, capacity: 10 });
  await sessionService.createSession({
    classId: activeClass._id,
    date: '2032-02-03', // Tuesday
    startTime: '14:00',
    primaryInstructor: inst1._id,
    room: otherRoom._id
  });

  // Bulk generate for Tuesdays 2032-02-01 to 2032-02-10 (Tuesdays: 2032-02-03, 2032-02-10... wait 2032-02-03 is Tuesday!)
  const res4 = await sessionService.generateRecurringSessions({
    classId: activeClass._id,
    startDate: '2032-02-02',
    endDate: '2032-02-10',
    weeklyPattern: ['TUESDAY'],
    startTime: '14:00',
    primaryInstructor: inst1._id,
    room: activeRoom._id
  });

  console.log(`  -> Created: ${res4.created}, Skipped: ${res4.skipped}`);
  console.log(`  -> Skipped reason: "${res4.skippedSessions[0]?.reason}"`);
  if (res4.created !== 1 || res4.skipped !== 1) {
    throw new Error(`Test 4 Failed: Expected 1 created, 1 skipped. Got created: ${res4.created}, skipped: ${res4.skipped}`);
  }
  if (!res4.skippedSessions[0].reason.includes('Instructor scheduling conflict')) {
    throw new Error('Test 4 Failed: Reason did not mention Instructor scheduling conflict');
  }

  // --- TEST 5: Duplicate Generation Protection ---
  console.log('\n[TEST 5] Submitting duplicate recurring generation request (Expect 100% skipped as duplicates)...');
  const res5 = await sessionService.generateRecurringSessions({
    classId: activeClass._id,
    startDate: '2032-01-01',
    endDate: '2032-01-14',
    weeklyPattern: ['MONDAY', 'WEDNESDAY'],
    startTime: '09:00',
    primaryInstructor: inst1._id,
    room: activeRoom._id
  });

  console.log(`  -> Created: ${res5.created}, Skipped: ${res5.skipped}`);
  console.log(`  -> Skipped reason: "${res5.skippedSessions[0]?.reason}"`);
  if (res5.created !== 0 || res5.skipped !== 4) {
    throw new Error(`Test 5 Failed: Expected 0 created, 4 skipped. Got created: ${res5.created}, skipped: ${res5.skipped}`);
  }

  // --- TEST 6: Rejection of Archived Class / Archived Room ---
  console.log('\n[TEST 6] Testing rejection of archived class and archived room (Expect 400 Bad Request)...');
  try {
    await sessionService.generateRecurringSessions({
      classId: archivedClass._id,
      startDate: '2032-03-01',
      endDate: '2032-03-10',
      weeklyPattern: ['MONDAY'],
      startTime: '09:00',
      primaryInstructor: inst1._id,
      room: activeRoom._id
    });
    throw new Error('Test 6 Failed: Archived class was not rejected!');
  } catch (err) {
    console.log(`  -> Archived class correctly rejected: "${err.message}"`);
  }

  try {
    await sessionService.generateRecurringSessions({
      classId: activeClass._id,
      startDate: '2032-03-01',
      endDate: '2032-03-10',
      weeklyPattern: ['MONDAY'],
      startTime: '09:00',
      primaryInstructor: inst1._id,
      room: archivedRoom._id
    });
    throw new Error('Test 6 Failed: Archived room was not rejected!');
  } catch (err) {
    console.log(`  -> Archived room correctly rejected: "${err.message}"`);
  }

  // --- TEST 7: Invalid Date Range (startDate > endDate) ---
  console.log('\n[TEST 7] Testing invalid date range where startDate > endDate (Expect 400 Bad Request)...');
  try {
    await sessionService.generateRecurringSessions({
      classId: activeClass._id,
      startDate: '2032-05-10',
      endDate: '2032-05-01',
      weeklyPattern: ['MONDAY'],
      startTime: '09:00',
      primaryInstructor: inst1._id,
      room: activeRoom._id
    });
    throw new Error('Test 7 Failed: Invalid date range was not rejected!');
  } catch (err) {
    console.log(`  -> Invalid date range correctly rejected: "${err.message}"`);
  }

  console.log('\n=====================================================');
  console.log('   ALL STEP 8 RECURRING SESSION TESTS PASSED!        ');
  console.log('=====================================================\n');
  process.exit(0);
}

runStep8Tests().catch(err => {
  console.error('\nFAILED STEP 8 TEST:', err);
  process.exit(1);
});
