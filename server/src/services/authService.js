const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Generate JWT token signed with JWT_SECRET
 */
const generateToken = (userId, role) => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not set');
  }
  const expiresIn = process.env.JWT_EXPIRES_IN || '1d';

  return jwt.sign({ userId, role }, secret, { expiresIn });
};

/**
 * Format user object to safely exclude passwordHash
 */
const getSafeUser = (user) => {
  const userObj = user.toObject ? user.toObject() : { ...user };
  delete userObj.passwordHash;
  return userObj;
};

/**
 * Authenticates user credentials and returns JWT token and safe user profile.
 */
const loginUser = async (email, password) => {
  if (!email || !password) {
    const error = new Error('Email and password are required.');
    error.statusCode = 400;
    throw error;
  }

  // 1. Find user by email and explicitly select passwordHash (since User schema has select: false)
  const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+passwordHash');

  if (!user) {
    const error = new Error('Invalid email or password.');
    error.statusCode = 401;
    throw error;
  }

  // 2. Check if user is active
  if (!user.isActive) {
    const error = new Error('Account is inactive. Please contact system staff.');
    error.statusCode = 401;
    throw error;
  }

  // 3. Verify password using bcrypt
  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) {
    const error = new Error('Invalid email or password.');
    error.statusCode = 401;
    throw error;
  }

  // 4. Generate JWT token with minimum required payload (userId, role)
  const token = generateToken(user._id, user.role);

  // 5. Return token and safe user profile (without passwordHash)
  return {
    token,
    user: getSafeUser(user)
  };
};

module.exports = {
  loginUser,
  generateToken,
  getSafeUser
};
