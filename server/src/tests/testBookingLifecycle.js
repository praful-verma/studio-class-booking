require('dotenv').config();
const connectDB = require('../config/db');
const classService = require('../services/classService');
const roomService = require('../services/roomService');
const sessionService = require('../services/sessionService');
const memberService = require('../services/memberService');
const bookingService = require('../services/bookingService');
const { validateTransition } = require('../services/bookingStateService');
const BookingHistory = require('../models/BookingHistory');
const User = require('../models/User');

async function runBookingLifecycleTests() {
  console.log('=====================================================');
  console.log('   STEP 6 COMPLETE BOOKING LIFECYCLE TEST SUITE      ');
  console.log('=====================================================');

  await connectDB();

  // Load Staff user & create dedicated test instructor
  const timestamp = Date.now();
  const staffUser = await User.findOne({ role: 'STAFF' }) || await User.findOne({});
  const bcrypt = require('bcryptjs');
  const instUser = await User.create({
    name: `Lifecycle Inst ${timestamp}`,
    email: `lifeinst_${timestamp}@example.com`,
    passwordHash: await bcrypt.hash('Demo@123', 10),
    role: 'INSTRUCTOR',
    isActive: true
  });

  // 1. Setup Test Resources
  const testClass = await classService.createClass({
    title: `Lifecycle Test Class ${timestamp}`,
    discipline: 'Yoga',
    defaultDuration: 60,
    defaultCapacity: 2 // Small capacity (2) to easily test capacity cap & waitlisting
  });

  const testRoom = await roomService.createRoom({
    name: `Lifecycle Room ${timestamp}`,
    capacity: 10,
    location: 'Floor 2'
  });

  // Session A: Past start time (for testing attendance)
  const pastSession = await sessionService.createSession({
    classId: testClass._id,
    date: '2020-01-01',
    startTime: '10:00',
    primaryInstructor: instUser._id,
    room: testRoom._id,
    capacity: 1 // Capacity 1
  });

  // Session B: Future start time (for testing capacity, waitlisting, cancellation, & early attendance failure)
  const futureSession = await sessionService.createSession({
    classId: testClass._id,
    date: '2031-05-20',
    startTime: '14:00',
    primaryInstructor: instUser._id,
    room: testRoom._id,
    capacity: 1 // Capacity 1
  });

  // Create Test Members
  const validMember1 = await memberService.createMember({
    name: `Member One ${timestamp}`,
    email: `member1_${timestamp}@example.com`,
    membershipExpiry: '2030-12-31'
  });

  const validMember2 = await memberService.createMember({
    name: `Member Two ${timestamp}`,
    email: `member2_${timestamp}@example.com`,
    membershipExpiry: '2030-12-31'
  });

  const validMember3 = await memberService.createMember({
    name: `Member Three ${timestamp}`,
    email: `member3_${timestamp}@example.com`,
    membershipExpiry: '2030-12-31'
  });

  const expiredMember = await memberService.createMember({
    name: `Expired Member ${timestamp}`,
    email: `expired_${timestamp}@example.com`,
    membershipExpiry: '2020-01-01' // Past expiry date
  });

  console.log('✓ Test resources setup completed.\n');

  // --- TEST 1: Available capacity -> BOOKED ---
  console.log('[TEST 1] Creating booking with available capacity (Expect status: BOOKED)...');
  const booking1 = await bookingService.createBooking(
    { memberId: validMember1._id, sessionId: futureSession._id, staffNote: 'First booking' },
    staffUser
  );
  console.log(`  -> Result: status = '${booking1.status}' (Expected: 'BOOKED')`);
  if (booking1.status !== 'BOOKED') throw new Error('Test 1 Failed');

  const history1 = await bookingService.getBookingHistory(booking1._id);
  console.log(`  -> History entries count: ${history1.length}, Transition: ${history1[0].oldStatus} -> ${history1[0].newStatus}`);

  // --- TEST 2: Full capacity -> WAITLISTED ---
  console.log('\n[TEST 2] Creating booking when session capacity is full (Expect status: WAITLISTED)...');
  const booking2 = await bookingService.createBooking(
    { memberId: validMember2._id, sessionId: futureSession._id, staffNote: 'Second booking (Waitlisted)' },
    staffUser
  );
  console.log(`  -> Result: status = '${booking2.status}' (Expected: 'WAITLISTED')`);
  if (booking2.status !== 'WAITLISTED') throw new Error('Test 2 Failed');

  // --- TEST 3: Expired Member -> Rejected ---
  console.log('\n[TEST 3] Attempting booking for an EXPIRED member (Expect 400 rejection)...');
  try {
    await bookingService.createBooking(
      { memberId: expiredMember._id, sessionId: futureSession._id },
      staffUser
    );
    throw new Error('Test 3 Failed - Expired member should have been rejected!');
  } catch (err) {
    console.log(`  -> Correctly rejected with message: "${err.message}"`);
  }

  // --- TEST 4: Duplicate Booking -> Rejected ---
  console.log('\n[TEST 4] Attempting duplicate booking for member 1 on same session (Expect 400 rejection)...');
  try {
    await bookingService.createBooking(
      { memberId: validMember1._id, sessionId: futureSession._id },
      staffUser
    );
    throw new Error('Test 4 Failed - Duplicate booking should have been rejected!');
  } catch (err) {
    console.log(`  -> Correctly rejected with message: "${err.message}"`);
  }

  // --- TEST 5: Attendance Before Scheduled Start Time -> Rejected ---
  console.log('\n[TEST 5] Attempting to mark attendance BEFORE session scheduled start time (Expect 400 rejection)...');
  try {
    await bookingService.settleAttendance(
      booking1._id,
      { status: 'ATTENDED' },
      staffUser
    );
    throw new Error('Test 5 Failed - Early attendance should have been rejected!');
  } catch (err) {
    console.log(`  -> Correctly rejected with message: "${err.message}"`);
  }

  // --- TEST 6: Attendance After Start Time -> Allowed ---
  console.log('\n[TEST 6] Creating past session booking and marking ATTENDED after start time...');
  const pastBooking = await bookingService.createBooking(
    { memberId: validMember1._id, sessionId: pastSession._id },
    staffUser
  );
  const settledBooking = await bookingService.settleAttendance(
    pastBooking._id,
    { status: 'ATTENDED', staffNote: 'Attended session' },
    staffUser
  );
  console.log(`  -> Result: status = '${settledBooking.status}' (Expected: 'ATTENDED')`);
  if (settledBooking.status !== 'ATTENDED') throw new Error('Test 6 Failed');

  // --- TEST 7: Invalid State Transitions -> Rejected ---
  console.log('\n[TEST 7] Attempting invalid state transitions (ATTENDED -> CANCELLED & CANCELLED -> BOOKED)...');
  try {
    validateTransition('ATTENDED', 'CANCELLED');
    throw new Error('Test 7 Failed - ATTENDED -> CANCELLED should be forbidden!');
  } catch (err) {
    console.log(`  -> ATTENDED -> CANCELLED correctly forbidden: "${err.message}"`);
  }

  try {
    validateTransition('CANCELLED', 'BOOKED');
    throw new Error('Test 7 Failed - CANCELLED -> BOOKED should be forbidden!');
  } catch (err) {
    console.log(`  -> CANCELLED -> BOOKED correctly forbidden: "${err.message}"`);
  }

  // --- TEST 8: BOOKED -> CANCELLED & Auto-Promote Earliest WAITLISTED ---
  console.log('\n[TEST 8] Cancelling BOOKED reservation (booking 1) and verifying auto-promotion of WAITLISTED booking 2...');
  const cancelledBooking1 = await bookingService.cancelBooking(booking1._id, 'Member requested cancellation', staffUser);
  console.log(`  -> Booking 1 status: '${cancelledBooking1.status}' (Expected: 'CANCELLED')`);

  const reloadedBooking2 = await bookingService.getBookingById(booking2._id);
  console.log(`  -> Booking 2 status after auto-promotion: '${reloadedBooking2.status}' (Expected: 'BOOKED')`);
  if (reloadedBooking2.status !== 'BOOKED') throw new Error('Test 8 Failed - Waitlist auto-promotion failed!');

  const historyBooking2 = await bookingService.getBookingHistory(booking2._id);
  console.log(`  -> Booking 2 History entries: ${historyBooking2.length}. Latest: ${historyBooking2[0].oldStatus} -> ${historyBooking2[0].newStatus} ('${historyBooking2[0].staffNote}')`);

  // --- TEST 9: WAITLISTED -> CANCELLED ---
  console.log('\n[TEST 9] Creating waitlisted booking 3 and cancelling WAITLISTED reservation...');
  const booking3 = await bookingService.createBooking(
    { memberId: validMember3._id, sessionId: futureSession._id },
    staffUser
  );
  console.log(`  -> Booking 3 status: '${booking3.status}' (Expected: 'WAITLISTED')`);

  const cancelledBooking3 = await bookingService.cancelBooking(booking3._id, 'Cancel waitlist', staffUser);
  console.log(`  -> Booking 3 status after cancellation: '${cancelledBooking3.status}' (Expected: 'CANCELLED')`);

  // --- TEST 10: Immutable Booking History -> Block Update/Delete ---
  console.log('\n[TEST 10] Attempting to update/delete immutable BookingHistory document (Expect pre-hook rejection)...');
  try {
    const historyItem = await BookingHistory.findOne({ booking: booking1._id });
    historyItem.staffNote = 'Modified note attempt';
    await historyItem.save();
    throw new Error('Test 10 Failed - History update should have been blocked!');
  } catch (err) {
    console.log(`  -> History update correctly blocked: "${err.message}"`);
  }

  // --- TEST 11: Concurrency Protection ---
  console.log('\n[TEST 11] Testing concurrent booking requests...');
  const concurrentSession = await sessionService.createSession({
    classId: testClass._id,
    date: '2028-08-10',
    startTime: '16:00',
    primaryInstructor: instUser._id,
    room: testRoom._id,
    capacity: 1 // Capacity 1
  });

  const memberA = await memberService.createMember({ name: `Conc A ${timestamp}`, email: `concA_${timestamp}@example.com`, membershipExpiry: '2030-12-31' });
  const memberB = await memberService.createMember({ name: `Conc B ${timestamp}`, email: `concB_${timestamp}@example.com`, membershipExpiry: '2030-12-31' });

  // Fire concurrent booking creation requests simultaneously
  const [resA, resB] = await Promise.all([
    bookingService.createBooking({ memberId: memberA._id, sessionId: concurrentSession._id }, staffUser),
    bookingService.createBooking({ memberId: memberB._id, sessionId: concurrentSession._id }, staffUser)
  ]);

  const statuses = [resA.status, resB.status].sort();
  console.log(`  -> Concurrent booking results: status 1 = '${statuses[0]}', status 2 = '${statuses[1]}' (Expected: one 'BOOKED' and one 'WAITLISTED')`);
  if (statuses[0] !== 'BOOKED' || statuses[1] !== 'WAITLISTED') {
    throw new Error('Test 11 Failed - Concurrency protection allowed overbooking!');
  }

  console.log('\n=====================================================');
  console.log('   ALL 11 BOOKING LIFECYCLE TESTS PASSED CLEANLY!    ');
  console.log('=====================================================\n');
  process.exit(0);
}

runBookingLifecycleTests().catch(err => {
  console.error('\nFAILED BOOKING LIFECYCLE TEST:', err);
  process.exit(1);
});
