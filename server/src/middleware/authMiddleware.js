const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Authentication Middleware
 * Verifies JWT token from Authorization header and attaches safe user object to req.user.
 */
const authenticate = async (req, res, next) => {
  try {
    let token;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer ')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        status: 'error',
        message: 'Authentication required. No token provided.'
      });
    }

    // Verify JWT Token
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET environment variable is not set');
    }
    let decoded;
    try {
      decoded = jwt.verify(token, secret);
    } catch (err) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid or expired token.'
      });
    }

    // Load user from database by decoded userId
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({
        status: 'error',
        message: 'User no longer exists.'
      });
    }

    // Reject inactive users
    if (!user.isActive) {
      return res.status(401).json({
        status: 'error',
        message: 'User account is inactive.'
      });
    }

    // Attach safe user profile to req.user
    const safeUser = user.toObject();
    delete safeUser.passwordHash;

    req.user = safeUser;
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  authenticate
};
