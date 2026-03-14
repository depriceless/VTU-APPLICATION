const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { logger } = require('../utils/logger');
const { isTokenBlacklisted } = require('../utils/redis');

const authenticate = async (req, res, next) => {
  try {
    // Cookie-first: read from httpOnly cookie, fall back to Authorization header.
    // Header fallback supports mobile apps and API clients that can't use cookies.
    const token = req.cookies?.token ||
                  req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }

    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET environment variable is not set');
    }

    // Check Redis blacklist before verifying — catches logged-out tokens
    if (await isTokenBlacklisted(token)) {
      return res.status(401).json({
        success: false,
        message: 'Token has been invalidated. Please login again.'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token. User not found.'
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Account is deactivated.'
      });
    }

    req.user = {
      userId:   decoded.userId,
      id:       user._id,
      _id:      user._id,
      name:     user.name,
      email:    user.email,
      isActive: user.isActive,
    };

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ success: false, message: 'Invalid token.' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token expired. Please login again.' });
    }
    logger.error('Authentication error', error.message);
    return res.status(500).json({ success: false, message: 'Server error during authentication.' });
  }
};

module.exports = { authenticate };