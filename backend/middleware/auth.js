const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authenticate = async (req, res, next) => {
  try {
    console.log('=== AUTH MIDDLEWARE DEBUG ===');
    const token = req.header('Authorization')?.replace('Bearer ', '');
    console.log('Token received:', token ? 'Yes' : 'No');
    console.log('Token preview:', token ? token.substring(0, 20) + '...' : 'None');
    
    if (!token) {
      console.log('❌ No token provided');
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_secret_key');
    console.log('✅ Token decoded successfully:', decoded);
    
    // Check if user exists
    const user = await User.findById(decoded.userId);
    console.log('User found in DB:', user ? 'Yes' : 'No');
    console.log('User ID being searched:', decoded.userId);
    
    if (!user) {
      console.log('❌ User not found in database');
      return res.status(401).json({
        success: false,
        message: 'Invalid token. User not found.'
      });
    }

    // Check if user account is active
    if (!user.isActive) {
      console.log('❌ User account is deactivated');
      return res.status(403).json({
        success: false,
        message: 'Account is deactivated.'
      });
    }

    console.log('✅ Authentication successful');
    
    // ✅ CRITICAL FIX: Set proper user object with ID fields
    req.user = {
      ...decoded,           // Keep all token payload data
      id: user._id,         // Add user ID from database
      _id: user._id,        // Also include _id for consistency
      name: user.name,      // Add user details for convenience
      email: user.email
    };
    
    console.log('✅ req.user object:', req.user);
    next();
  } catch (error) {
    console.log('❌ Authentication error:', error.message);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token.'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired.'
      });
    }

    console.error('Authentication error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error during authentication.'
    });
  }
};

module.exports = { authenticate };