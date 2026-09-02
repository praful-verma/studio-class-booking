require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const connectDB = require('./config/db');
const User = require('./models/User');

const seedUsers = [
  {
    name: 'Demo Staff User',
    email: 'staff@demo.com',
    password: 'Demo@123',
    role: 'STAFF'
  },
  {
    name: 'Demo Instructor User',
    email: 'instructor@demo.com',
    password: 'Demo@123',
    role: 'INSTRUCTOR'
  }
];

const seedDatabase = async () => {
  try {
    // 1. Connect to MongoDB
    await connectDB();
    console.log('Seed process: Connected to MongoDB.');

    // 2. Iterate through demo users and upsert safely by email
    for (const userData of seedUsers) {
      const email = userData.email.toLowerCase().trim();
      const passwordHash = await bcrypt.hash(userData.password, 10);

      const existingUser = await User.findOne({ email });

      if (existingUser) {
        // Update existing demo user
        existingUser.name = userData.name;
        existingUser.passwordHash = passwordHash;
        existingUser.role = userData.role;
        existingUser.isActive = true;
        await existingUser.save();
        console.log(`Updated existing user: ${email} (${userData.role})`);
      } else {
        // Create new demo user
        await User.create({
          name: userData.name,
          email,
          passwordHash,
          role: userData.role,
          isActive: true
        });
        console.log(`Created new user: ${email} (${userData.role})`);
      }
    }

    console.log('Database seed completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Database seed error:', error.message);
    process.exit(1);
  }
};

seedDatabase();
