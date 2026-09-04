const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const connectDB = require('../config/db');
const User = require('../models/User');
const userService = require('../services/userService');
const bcrypt = require('bcryptjs');

async function testUsersEndpoint() {
  console.log('=====================================================');
  console.log('       TESTING USER ENDPOINT (GET /api/users)       ');
  console.log('=====================================================');

  await connectDB();

  const timestamp = Date.now();

  // Create Active Instructor 1
  const inst1 = await User.create({
    name: `Alpha Instructor ${timestamp}`,
    email: `alpha_${timestamp}@example.com`,
    passwordHash: await bcrypt.hash('Demo@123', 10),
    role: 'INSTRUCTOR',
    isActive: true
  });

  // Create Active Instructor 2
  const inst2 = await User.create({
    name: `Beta Instructor ${timestamp}`,
    email: `beta_${timestamp}@example.com`,
    passwordHash: await bcrypt.hash('Demo@123', 10),
    role: 'INSTRUCTOR',
    isActive: true
  });

  // Create Inactive Instructor (should be excluded)
  const inactiveInst = await User.create({
    name: `Inactive Instructor ${timestamp}`,
    email: `inactive_${timestamp}@example.com`,
    passwordHash: await bcrypt.hash('Demo@123', 10),
    role: 'INSTRUCTOR',
    isActive: false
  });

  console.log('✓ Created active and inactive test instructors in DB.\n');

  // Test 1: Fetch users with role=INSTRUCTOR
  console.log('[TEST 1] Querying active INSTRUCTOR users...');
  const instructors = await userService.getUsers({ role: 'INSTRUCTOR' });

  console.log(`  -> Active instructors returned count: ${instructors.length}`);

  const found1 = instructors.find(u => u._id.toString() === inst1._id.toString());
  const found2 = instructors.find(u => u._id.toString() === inst2._id.toString());
  const foundInactive = instructors.find(u => u._id.toString() === inactiveInst._id.toString());

  if (!found1 || !found2) throw new Error('Test 1 Failed: Active instructors missing from response');
  if (foundInactive) throw new Error('Test 1 Failed: Inactive instructor was returned!');

  // Test 2: Verify safe fields returned (no passwordHash)
  console.log('\n[TEST 2] Verifying security and fields selection...');
  const firstUser = instructors[0];
  console.log('  -> User object keys:', Object.keys(firstUser.toObject ? firstUser.toObject() : firstUser));

  if (firstUser.passwordHash) throw new Error('Test 2 Failed: passwordHash was leaked!');
  if (!firstUser.name || !firstUser.email || !firstUser.role) throw new Error('Test 2 Failed: Required public fields missing');

  // Test 3: Verify sorting by name
  console.log('\n[TEST 3] Verifying sorting by name...');
  let sorted = true;
  for (let i = 0; i < instructors.length - 1; i++) {
    if (instructors[i].name.localeCompare(instructors[i + 1].name) > 0) {
      sorted = false;
      break;
    }
  }
  console.log(`  -> Names sorted alphabetically: ${sorted}`);
  if (!sorted) throw new Error('Test 3 Failed: Instructor list is not sorted by name');

  console.log('\n=====================================================');
  console.log('   ALL USER ENDPOINT TESTS PASSED CLEANLY!           ');
  console.log('=====================================================\n');
  process.exit(0);
}

testUsersEndpoint().catch(err => {
  console.error('\nFAILED USER ENDPOINT TEST:', err);
  process.exit(1);
});
