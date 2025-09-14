const express = require('express');
const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin'); // Correct import
const router = express.Router();

// Admin Login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validate input
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username and password are required'
      });
    }

    // Find admin by username or email using the static method
    const admin = await Admin.findByUsernameOrEmail(username);

    if (!admin) {
      return res.status(401).json({
        success: false,
        message: 'Invalid admin credentials'
      });
    }

    // Check if admin is active
    if (!admin.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Admin account is deactivated. Please contact system administrator.'
      });
    }

    // Check password using the instance method
    const isPasswordValid = await admin.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid admin credentials'
      });
    }

    // Update last login
    admin.lastLogin = new Date();
    await admin.save();

    // Generate JWT token (use consistent secret)
    const token = jwt.sign(
      { 
        id: admin._id, 
        username: admin.username,
        email: admin.email,
        role: admin.role,
        isAdmin: true
      },
      process.env.JWT_SECRET || 'vtuappjwtsecret100300', // Use consistent secret
      { expiresIn: '7d' } // Extended expiry for better persistence
    );

    // Return success response
    res.json({
      success: true,
      message: 'Admin login successful',
      token,
      admin: {
        id: admin._id,
        username: admin.username,
        email: admin.email,
        role: admin.role,
        lastLogin: admin.lastLogin,
        isActive: admin.isActive,
        permissions: admin.permissions
      }
    });

  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during admin login'
    });
  }
});

// Admin token verification middleware
const verifyAdminToken = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'vtuappjwtsecret100300');
    
    // Check if this is an admin token
    if (!decoded.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.'
      });
    }
    
    // Verify admin still exists and is active
    const admin = await Admin.findById(decoded.id);
    if (!admin || !admin.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin account not found or deactivated.'
      });
    }
    
    req.admin = decoded;
    req.adminData = admin; // Store full admin data for use in routes
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired. Please log in again.'
      });
    }
    res.status(400).json({
      success: false,
      message: 'Invalid token.'
    });
  }
};

// ADD THIS: Token verification endpoint that frontend needs
router.get('/verify', verifyAdminToken, async (req, res) => {
  try {
    // If middleware passed, token is valid
    const admin = req.adminData; // Full admin data from middleware
    
    res.json({
      success: true,
      message: 'Token is valid',
      admin: {
        id: admin._id,
        username: admin.username,
        email: admin.email,
        role: admin.role,
        lastLogin: admin.lastLogin,
        isActive: admin.isActive,
        permissions: admin.permissions
      }
    });
  } catch (error) {
    console.error('Token verification endpoint error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during token verification'
    });
  }
});

// Optional: Logout endpoint to invalidate tokens (if you want to implement token blacklisting)
router.post('/logout', verifyAdminToken, async (req, res) => {
  try {
    // You could implement token blacklisting here if needed
    // For now, just return success (client will clear token)
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during logout'
    });
  }
});

// Optional: Refresh token endpoint
router.post('/refresh', verifyAdminToken, async (req, res) => {
  try {
    const admin = req.adminData;
    
    // Generate new token
    const token = jwt.sign(
      { 
        id: admin._id, 
        username: admin.username,
        email: admin.email,
        role: admin.role,
        isAdmin: true
      },
      process.env.JWT_SECRET || 'vtuappjwtsecret100300',
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      message: 'Token refreshed successfully',
      token
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during token refresh'
    });
  }
});

// Export the router and middleware
module.exports = { router, verifyAdminToken };