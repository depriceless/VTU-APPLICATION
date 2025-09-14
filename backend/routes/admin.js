const express = require('express');
const { verifyAdminToken } = require('./adminAuth');
const User = require('../models/User');
const Admin = require('../models/Admin');
const router = express.Router();

// Get all users (admin only)
router.get('/users', verifyAdminToken, async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;
    
    const query = search ? {
      $or: [
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ]
    } : {};

    const users = await User.find(query)
      .select('-password')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const total = await User.countDocuments(query);

    res.json({
      success: true,
      users,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Get user by ID (admin only)
router.get('/users/:id', verifyAdminToken, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Get system overview (admin only)
router.get('/overview', verifyAdminToken, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();

    res.json({
      success: true,
      overview: {
        totalUsers,
        totalAdmins: 1,
        totalTransactions: 0,
        pendingTransactions: 0
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Update user status (admin only)
router.patch('/users/:id/status', verifyAdminToken, async (req, res) => {
  try {
    const { isActive } = req.body;
    
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'User status updated successfully',
      user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Admin profile endpoint
router.get('/profile', verifyAdminToken, async (req, res) => {
  try {
    // Get admin ID from the token
    const adminId = req.admin.id;
    
    // Find admin by ID, excluding password and sensitive fields
    const admin = await Admin.findById(adminId)
      .select('-password -loginAttempts -lockUntil')
      .lean();
    
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found'
      });
    }

    // Format the response to match what your frontend expects
    const profileData = {
      name: admin.username,
      email: admin.email,
      role: admin.role,
      phone: admin.phone || '+234 123 456 7890',
      avatar: admin.username ? admin.username.charAt(0).toUpperCase() : 'A'
    };

    res.json({
      success: true,
      profile: profileData
    });
  } catch (error) {
    console.error('Error fetching admin profile:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching profile'
    });
  }
});

module.exports = router;