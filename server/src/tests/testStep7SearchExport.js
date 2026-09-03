const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const connectDB = require('../config/db');
const classService = require('../services/classService');
const roomService = require('../services/roomService');
const sessionService = require('../services/sessionService');
const memberService = require('../services/memberService');
const bookingService = require('../services/bookingService');
const User = require('../models/User');
const bcrypt = require('bcryptjs');

async function runStep7Tests() {
  console.log('=====================================================');
  console.log('   STEP 7 SEARCH, FILTER, SORT, PAGINATION & CSV    ');
  console.log('=====================================================');

  await connectDB();

  const timestamp = Date.now();

  // 1. Setup Test Users (Staff + 2 Instructors)
  const staffUser = await User.findOne({ role: 'STAFF' }) || await User.create({
    name: `Step7 Staff ${timestamp}`,
    email: `staff_${timestamp}@example.com`,
    passwordHash: await bcrypt.hash('Demo@123', 10),
    role: 'STAFF',
    isActive: true
  });

  const instructor1 = await User.create({
    name: `Instructor One ${timestamp}`,
    email: `inst1_${timestamp}@example.com`,
    passwordHash: await bcrypt.hash('Demo@123', 10),
    role: 'INSTRUCTOR',
    isActive: true
  });

  const instructor2 = await User.create({
    name: `Instructor Two ${timestamp}`,
    email: `inst2_${timestamp}@example.com`,
    passwordHash: await bcrypt.hash('Demo@123', 10),
    role: 'INSTRUCTOR',
    isActive: true
  });

  // 2. Setup Classes & Rooms
  const classA = await classService.createClass({
    title: `Yoga Flow ${timestamp}`,
    discipline: 'Yoga',
    defaultDuration: 60,
    defaultCapacity: 5
  });

  const classB = await classService.createClass({
    title: `HIIT Burn ${timestamp}`,
    discipline: 'Fitness',
    defaultDuration: 45,
    defaultCapacity: 5
  });

  const room1 = await roomService.createRoom({
    name: `Studio A ${timestamp}`,
    capacity: 10,
    location: 'Floor 1'
  });

  // 3. Setup Sessions
  // Session 1: Instructor 1 primary, Class A, earlier date
  const session1 = await sessionService.createSession({
    classId: classA._id,
    date: '2030-01-10',
    startTime: '09:00',
    primaryInstructor: instructor1._id,
    room: room1._id,
    capacity: 5
  });

  // Session 2: Instructor 2 primary, Class B, later date
  const session2 = await sessionService.createSession({
    classId: classB._id,
    date: '2030-01-15',
    startTime: '10:00',
    primaryInstructor: instructor2._id,
    room: room1._id,
    capacity: 5
  });

  // 4. Setup Members (including special characters for CSV escaping test)
  const memberAlice = await memberService.createMember({
    name: 'Alice Johnson',
    email: `alice_${timestamp}@example.com`,
    membershipExpiry: '2035-12-31'
  });

  const memberBob = await memberService.createMember({
    name: 'Bob Smith',
    email: `bob_${timestamp}@example.com`,
    membershipExpiry: '2035-12-31'
  });

  const memberSpecial = await memberService.createMember({
    name: 'O\'Connor, "Special" \nMember',
    email: `special_${timestamp}@example.com`,
    membershipExpiry: '2035-12-31'
  });

  // 5. Create Bookings
  // Booking 1: Alice on Session 1 (BOOKED)
  const b1 = await bookingService.createBooking({ memberId: memberAlice._id, sessionId: session1._id }, staffUser);
  // Booking 2: Bob on Session 1 (BOOKED)
  const b2 = await bookingService.createBooking({ memberId: memberBob._id, sessionId: session1._id }, staffUser);
  // Booking 3: Special Member on Session 1 (BOOKED)
  const b3 = await bookingService.createBooking({ memberId: memberSpecial._id, sessionId: session1._id }, staffUser);
  // Booking 4: Alice on Session 2 (BOOKED)
  const b4 = await bookingService.createBooking({ memberId: memberAlice._id, sessionId: session2._id }, staffUser);

  console.log('✓ Test environment setup successfully.\n');

  // --- TEST 1: Member Name Text Search ---
  console.log('[TEST 1] Testing Member Name Text Search ("Alice")...');
  const resSearchName = await bookingService.getAllBookings({ search: 'Alice' }, staffUser);
  console.log(`  -> Found ${resSearchName.total} bookings for "Alice" (Expected: 2)`);
  if (resSearchName.total !== 2) throw new Error('Test 1 Failed: Expected 2 bookings for Alice');

  // --- TEST 2: Member Email Text Search ---
  console.log('\n[TEST 2] Testing Member Email Text Search ("bob_")...');
  const resSearchEmail = await bookingService.getAllBookings({ search: `bob_${timestamp}` }, staffUser);
  console.log(`  -> Found ${resSearchEmail.total} bookings for Bob email (Expected: 1)`);
  if (resSearchEmail.total !== 1) throw new Error('Test 2 Failed: Expected 1 booking for Bob email');

  // --- TEST 3: Class Filter ---
  console.log('\n[TEST 3] Testing Class Filter (Class A)...');
  const resClassFilter = await bookingService.getAllBookings({ classId: classA._id.toString() }, staffUser);
  console.log(`  -> Found ${resClassFilter.total} bookings for Class A (Expected: 3)`);
  if (resClassFilter.total !== 3) throw new Error('Test 3 Failed: Expected 3 bookings for Class A');

  // --- TEST 4: Session Filter ---
  console.log('\n[TEST 4] Testing Session Filter (Session 2)...');
  const resSessionFilter = await bookingService.getAllBookings({ sessionId: session2._id.toString() }, staffUser);
  console.log(`  -> Found ${resSessionFilter.total} bookings for Session 2 (Expected: 1)`);
  if (resSessionFilter.total !== 1) throw new Error('Test 4 Failed: Expected 1 booking for Session 2');

  // --- TEST 5: Status Filter ---
  console.log('\n[TEST 5] Testing Status Filter ("BOOKED")...');
  const resStatusFilter = await bookingService.getAllBookings({ status: 'BOOKED' }, staffUser);
  console.log(`  -> Found ${resStatusFilter.total} BOOKED status bookings`);
  if (resStatusFilter.total < 4) throw new Error('Test 5 Failed: Expected at least 4 BOOKED bookings');

  // --- TEST 6: Supported Sort Options ---
  console.log('\n[TEST 6] Testing Sort Options (createdAt, status, startDateTime)...');
  const resSortCreatedAsc = await bookingService.getAllBookings({ sort: 'createdAt', order: 'asc', limit: 10 }, staffUser);
  const resSortCreatedDesc = await bookingService.getAllBookings({ sort: 'createdAt', order: 'desc', limit: 10 }, staffUser);
  console.log(`  -> Sort createdAt asc first ID: ${resSortCreatedAsc.bookings[0]._id}`);
  console.log(`  -> Sort createdAt desc first ID: ${resSortCreatedDesc.bookings[0]._id}`);

  const resSortSessionAsc = await bookingService.getAllBookings({ sort: 'startDateTime', order: 'asc', limit: 10 }, staffUser);
  console.log(`  -> Sort startDateTime asc first session date: ${new Date(resSortSessionAsc.bookings[0].session.startDateTime).toISOString()}`);

  // --- TEST 7: Pagination and Total Count ---
  console.log('\n[TEST 7] Testing Pagination (limit=2, page=1 & page=2)...');
  const page1 = await bookingService.getAllBookings({ limit: 2, page: 1 }, staffUser);
  const page2 = await bookingService.getAllBookings({ limit: 2, page: 2 }, staffUser);
  console.log(`  -> Page 1 results: ${page1.bookings.length}, total: ${page1.total}, pages: ${page1.pages}`);
  console.log(`  -> Page 2 results: ${page2.bookings.length}`);
  if (page1.bookings.length !== 2 || page2.bookings.length < 1) throw new Error('Test 7 Failed: Pagination mismatch');

  // --- TEST 8: STAFF Sees All Bookings ---
  console.log('\n[TEST 8] Verifying STAFF sees all bookings across sessions...');
  const staffBookings = await bookingService.getAllBookings({}, staffUser);
  console.log(`  -> STAFF total bookings visible: ${staffBookings.total}`);
  if (staffBookings.total < 4) throw new Error('Test 8 Failed: STAFF should see all bookings');

  // --- TEST 9: INSTRUCTOR Only Sees Bookings for Assigned Sessions ---
  console.log('\n[TEST 9] Verifying INSTRUCTOR 1 only sees bookings for assigned session 1...');
  const inst1Bookings = await bookingService.getAllBookings({}, instructor1);
  console.log(`  -> Instructor 1 total bookings visible: ${inst1Bookings.total} (Expected: 3)`);
  if (inst1Bookings.total !== 3) throw new Error('Test 9 Failed: Instructor 1 should only see 3 bookings for Session 1');

  const inst2Bookings = await bookingService.getAllBookings({}, instructor2);
  console.log(`  -> Instructor 2 total bookings visible: ${inst2Bookings.total} (Expected: 1)`);
  if (inst2Bookings.total !== 1) throw new Error('Test 9 Failed: Instructor 2 should only see 1 booking for Session 2');

  // --- TEST 10: Unauthorized Instructor CSV Export Rejection ---
  console.log('\n[TEST 10] Verifying Instructor 2 CANNOT export attendance for Instructor 1 session (Expect 403 error)...');
  try {
    await bookingService.exportAttendanceCsv(session1._id, instructor2);
    throw new Error('Test 10 Failed: Unauthorized instructor export was not rejected!');
  } catch (err) {
    console.log(`  -> Correctly rejected with status ${err.statusCode}: "${err.message}"`);
    if (err.statusCode !== 403) throw new Error('Test 10 Failed: Expected statusCode 403');
  }

  // --- TEST 11: STAFF Can Export Attendance ---
  console.log('\n[TEST 11] Verifying STAFF can export attendance CSV...');
  const staffCsv = await bookingService.exportAttendanceCsv(session1._id, staffUser);
  console.log(`  -> STAFF CSV length: ${staffCsv.length} bytes`);
  if (!staffCsv.includes('Member Name,Member Email,Status,Booking Creation Time')) {
    throw new Error('Test 11 Failed: CSV headers missing');
  }

  // --- TEST 12: Assigned INSTRUCTOR Can Export Attendance ---
  console.log('\n[TEST 12] Verifying assigned INSTRUCTOR 1 can export attendance CSV...');
  const instCsv = await bookingService.exportAttendanceCsv(session1._id, instructor1);
  console.log(`  -> Instructor 1 CSV length: ${instCsv.length} bytes`);

  // --- TEST 13: CSV Escaping & Special Characters ---
  console.log('\n[TEST 13] Verifying CSV escaping of special characters (commas, quotes, newlines)...');
  console.log('--- Generated CSV Output Preview ---');
  console.log(staffCsv);
  console.log('------------------------------------');

  if (!staffCsv.includes('"O\'Connor, ""Special"" \nMember"')) {
    throw new Error('Test 13 Failed: Special characters (quotes, commas, newlines) were not correctly escaped in CSV!');
  }
  console.log('  -> Special character escaping verified successfully!');

  console.log('\n=====================================================');
  console.log('   ALL 13 STEP 7 SEARCH, SORT & CSV TESTS PASSED!   ');
  console.log('=====================================================\n');
  process.exit(0);
}

runStep7Tests().catch(err => {
  console.error('\nFAILED STEP 7 TEST:', err);
  process.exit(1);
});
