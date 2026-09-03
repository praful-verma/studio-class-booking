const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const connectDB = require('../config/db');
const classService = require('../services/classService');
const roomService = require('../services/roomService');
const sessionService = require('../services/sessionService');
const memberService = require('../services/memberService');
const bookingService = require('../services/bookingService');
const dashboardService = require('../services/dashboardService');
const alertService = require('../services/alertService');
const User = require('../models/User');
const Member = require('../models/Member');
const bcrypt = require('bcryptjs');

async function runStep9Tests() {
  console.log('=====================================================');
  console.log('   STEP 9 DASHBOARD & MEMBERSHIP ALERTS TEST SUITE   ');
  console.log('=====================================================');

  await connectDB();

  const timestamp = Date.now();

  // 1. Setup Test Users (Staff & Instructor)
  const staffUser = await User.findOne({ role: 'STAFF' }) || await User.create({
    name: `Step9 Staff ${timestamp}`,
    email: `staff_${timestamp}@example.com`,
    passwordHash: await bcrypt.hash('Demo@123', 10),
    role: 'STAFF',
    isActive: true
  });

  const instUser = await User.create({
    name: `Step9 Inst ${timestamp}`,
    email: `inst_${timestamp}@example.com`,
    passwordHash: await bcrypt.hash('Demo@123', 10),
    role: 'INSTRUCTOR',
    isActive: true
  });

  // 2. Setup Class, Room, & Today's Session
  const testClass = await classService.createClass({
    title: `Dashboard Class ${timestamp}`,
    discipline: 'Fitness',
    defaultDuration: 45,
    defaultCapacity: 1 // Capacity 1 to test waitlisting
  });

  const testRoom = await roomService.createRoom({
    name: `Dash Room ${timestamp}`,
    capacity: 10
  });

  const todayStr = new Date().toISOString().split('T')[0];
  const todaySession = await sessionService.createSession({
    classId: testClass._id,
    date: todayStr,
    startTime: '12:00',
    primaryInstructor: instUser._id,
    room: testRoom._id,
    capacity: 1
  });

  // Past session for attendance test
  const pastSession = await sessionService.createSession({
    classId: testClass._id,
    date: '2020-01-01',
    startTime: '10:00',
    primaryInstructor: instUser._id,
    room: testRoom._id,
    capacity: 10
  });

  // 3. Setup Members & Bookings
  const memberA = await memberService.createMember({
    name: `Dash Member A ${timestamp}`,
    email: `dashA_${timestamp}@example.com`,
    membershipExpiry: '2035-12-31'
  });

  const memberB = await memberService.createMember({
    name: `Dash Member B ${timestamp}`,
    email: `dashB_${timestamp}@example.com`,
    membershipExpiry: '2035-12-31'
  });

  // Booking 1: Booked today on todaySession
  const b1 = await bookingService.createBooking({ memberId: memberA._id, sessionId: todaySession._id }, staffUser);
  // Booking 2: Waitlisted today on todaySession (since capacity=1)
  const b2 = await bookingService.createBooking({ memberId: memberB._id, sessionId: todaySession._id }, staffUser);

  // Booking 3: Past booking settled as ATTENDED
  const pastBooking = await bookingService.createBooking({ memberId: memberA._id, sessionId: pastSession._id }, staffUser);
  await bookingService.settleAttendance(pastBooking._id, { status: 'ATTENDED' }, staffUser);

  console.log('✓ Dashboard test environment initialized successfully.\n');

  // --- TEST 1: Dashboard Metrics Server-side Calculation ---
  console.log('[TEST 1] Testing Dashboard Metrics calculation...');
  const dashMetrics = await dashboardService.getDashboardMetrics();
  console.log('  -> Summary:', dashMetrics.summary);
  console.log('  -> Bookings by Status:', dashMetrics.bookingsByStatus);

  if (dashMetrics.summary.sessionsToday < 1) throw new Error('Test 1 Failed: sessionsToday should be >= 1');
  if (dashMetrics.summary.bookingsToday < 2) throw new Error('Test 1 Failed: bookingsToday should be >= 2');
  if (dashMetrics.summary.currentWaitlistedMembers < 1) throw new Error('Test 1 Failed: currentWaitlistedMembers should be >= 1');
  if (dashMetrics.bookingsByStatus.BOOKED < 1) throw new Error('Test 1 Failed: BOOKED count should be >= 1');
  if (dashMetrics.bookingsByStatus.WAITLISTED < 1) throw new Error('Test 1 Failed: WAITLISTED count should be >= 1');

  // --- TEST 2: Dashboard Attendance Trend ---
  console.log('\n[TEST 2] Testing Dashboard 8-Week Attendance Trend...');
  console.log(`  -> Weeks returned: ${dashMetrics.attendancePerWeek.length} (Expected: 8)`);
  if (dashMetrics.attendancePerWeek.length !== 8) throw new Error('Test 2 Failed: attendancePerWeek should contain 8 items');

  // --- TEST 3: Membership Expiry Alerts Detection ---
  console.log('\n[TEST 3] Testing Membership Expiry Alerts...');
  const now = new Date();
  const todayDateObj = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  // Member 1: Already Expired
  const expiredDate = new Date(todayDateObj.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const expiredMember = await memberService.createMember({
    name: `Expired User ${timestamp}`,
    email: `expired_alert_${timestamp}@example.com`,
    membershipExpiry: expiredDate
  });

  // Member 2: Expiring within 5 days (Soon)
  const expiringSoonDate = new Date(todayDateObj.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const expiringSoonMember = await memberService.createMember({
    name: `Expiring Soon User ${timestamp}`,
    email: `soon_alert_${timestamp}@example.com`,
    membershipExpiry: expiringSoonDate
  });

  // Member 3: Expiring in 20 days (Far future - no alert)
  const farFutureDate = new Date(todayDateObj.getTime() + 20 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const farFutureMember = await memberService.createMember({
    name: `Far Future User ${timestamp}`,
    email: `far_alert_${timestamp}@example.com`,
    membershipExpiry: farFutureDate
  });

  const alertsResult = await alertService.getMembershipAlerts();
  console.log(`  -> Total Active Alerts: ${alertsResult.total}`);
  const foundExpired = alertsResult.alerts.find(a => a.memberId.toString() === expiredMember._id.toString());
  const foundSoon = alertsResult.alerts.find(a => a.memberId.toString() === expiringSoonMember._id.toString());
  const foundFar = alertsResult.alerts.find(a => a.memberId.toString() === farFutureMember._id.toString());

  if (!foundExpired || foundExpired.status !== 'EXPIRED') throw new Error('Test 3 Failed: Expired member missing or status incorrect');
  if (!foundSoon || foundSoon.status !== 'EXPIRING_SOON') throw new Error('Test 3 Failed: Expiring soon member missing or status incorrect');
  if (foundFar) throw new Error('Test 3 Failed: Far future member should not generate an alert');

  // --- TEST 4: Membership Alert Count Badge Endpoint ---
  console.log('\n[TEST 4] Testing Alert Badge Count endpoint...');
  const countResult = await alertService.getMembershipAlertCount();
  console.log(`  -> Badge Count: ${countResult.total} (Matches active alerts total: ${alertsResult.total})`);
  if (countResult.total !== alertsResult.total) throw new Error('Test 4 Failed: Badge count mismatch');

  // --- TEST 5: Alert Dismissal ---
  console.log('\n[TEST 5] Testing Alert Dismissal for Expiring Soon Member...');
  const originalExpiry = expiringSoonMember.membershipExpiry;
  await alertService.dismissMembershipAlert(expiringSoonMember._id);

  const reloadedExpiringSoonMember = await Member.findById(expiringSoonMember._id);
  console.log(`  -> Member actual membershipExpiry untouched: ${reloadedExpiringSoonMember.membershipExpiry.toISOString()}`);
  console.log(`  -> Member dismissedExpiryDate recorded: ${reloadedExpiringSoonMember.dismissedExpiryDate.toISOString()}`);

  if (reloadedExpiringSoonMember.membershipExpiry.toISOString() !== originalExpiry.toISOString()) {
    throw new Error('Test 5 Failed: Dismissal altered member membershipExpiry date!');
  }

  const alertsAfterDismissal = await alertService.getMembershipAlerts();
  const foundDismissedInAlerts = alertsAfterDismissal.alerts.find(a => a.memberId.toString() === expiringSoonMember._id.toString());
  console.log(`  -> Dismissed member present in active alerts list: ${Boolean(foundDismissedInAlerts)} (Expected: false)`);
  if (foundDismissedInAlerts) throw new Error('Test 5 Failed: Dismissed member should no longer appear in active alerts');

  // --- TEST 6: Alert Reappearance on Membership Update ---
  console.log('\n[TEST 6] Testing Alert Reappearance after membership renewal to a new expiring date...');
  // Update member expiry to a new date still within 7 days (e.g. today + 3 days)
  const newSoonDate = new Date(todayDateObj.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  await memberService.updateMember(expiringSoonMember._id, { membershipExpiry: newSoonDate });

  const alertsAfterUpdate = await alertService.getMembershipAlerts();
  const foundReappeared = alertsAfterUpdate.alerts.find(a => a.memberId.toString() === expiringSoonMember._id.toString());
  console.log(`  -> Member present in active alerts after expiry update: ${Boolean(foundReappeared)} (Expected: true)`);
  if (!foundReappeared) throw new Error('Test 6 Failed: Dismissed alert did not reappear after membership expiry date was updated!');

  console.log('\n=====================================================');
  console.log('   ALL STEP 9 DASHBOARD & ALERTS TESTS PASSED!       ');
  console.log('=====================================================\n');
  process.exit(0);
}

runStep9Tests().catch(err => {
  console.error('\nFAILED STEP 9 TEST:', err);
  process.exit(1);
});
