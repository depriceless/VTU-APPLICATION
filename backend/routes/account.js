// routes/account.js
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Balance = require('../models/Balance');
const Transaction = require('../models/Transaction');
const PaystackAccount = require('../models/PaystackAccount');
const MonnifyAccount = require('../models/MonnifyAccount');
const { authenticate } = require('../middleware/auth');

// === DEACTIVATE ACCOUNT ===
router.post('/deactivate', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { reason, password } = req.body;

    // Validate password
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if account is already deactivated
    if (user.status === 'deactivated') {
      return res.status(400).json({
        success: false,
        message: 'Account is already deactivated'
      });
    }

    // Verify password
    const bcrypt = require('bcrypt');
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid password'
      });
    }

    // Update user status to deactivated
    user.status = 'deactivated';
    user.deactivatedAt = new Date();
    user.deactivationReason = reason || 'User requested deactivation';
    await user.save();

    console.log(`✅ Account deactivated for user: ${user.email}`);

    res.json({
      success: true,
      message: 'Account has been deactivated successfully. You can reactivate it by logging in within 30 days.',
      deactivatedAt: user.deactivatedAt
    });

  } catch (error) {
    console.error('❌ Deactivate account error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to deactivate account',
      error: error.message
    });
  }
});

// === REACTIVATE ACCOUNT ===
router.post('/reactivate', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    // Find user
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if account is deactivated
    if (user.status !== 'deactivated') {
      return res.status(400).json({
        success: false,
        message: 'Account is not deactivated'
      });
    }

    // Check if deactivation period has expired (30 days)
    const deactivatedDate = new Date(user.deactivatedAt);
    const currentDate = new Date();
    const daysSinceDeactivation = Math.floor((currentDate - deactivatedDate) / (1000 * 60 * 60 * 24));

    if (daysSinceDeactivation > 30) {
      return res.status(400).json({
        success: false,
        message: 'Deactivation period has expired. Please contact support to reactivate your account.',
        daysSinceDeactivation
      });
    }

    // Verify password
    const bcrypt = require('bcrypt');
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid password'
      });
    }

    // Reactivate account
    user.status = 'active';
    user.deactivatedAt = null;
    user.deactivationReason = null;
    await user.save();

    console.log(`✅ Account reactivated for user: ${user.email}`);

    res.json({
      success: true,
      message: 'Account has been reactivated successfully. You can now log in.',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        status: user.status
      }
    });

  } catch (error) {
    console.error('❌ Reactivate account error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reactivate account',
      error: error.message
    });
  }
});

// === DELETE ACCOUNT PERMANENTLY ===
router.delete('/delete', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { password, confirmText } = req.body;

    // Validate confirmation text
    if (confirmText !== 'DELETE MY ACCOUNT') {
      return res.status(400).json({
        success: false,
        message: 'Please type "DELETE MY ACCOUNT" to confirm deletion'
      });
    }

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Verify password
    const bcrypt = require('bcrypt');
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid password'
      });
    }

    // Check if user has balance
    const balance = await Balance.findOne({ user: userId });
    if (balance && balance.amount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete account with remaining balance of ₦${balance.amount.toLocaleString()}. Please withdraw or transfer your funds first.`,
        currentBalance: balance.amount
      });
    }

    // Store user email for logging
    const userEmail = user.email;

    // Delete user's data
    await Promise.all([
      User.findByIdAndDelete(userId),
      Balance.deleteMany({ user: userId }),
      Transaction.deleteMany({ user: userId }),
      PaystackAccount.deleteMany({ user: userId }),
      MonnifyAccount.deleteMany({ user: userId }),
    ]);

    console.log(`✅ Account permanently deleted for user: ${userEmail}`);

    res.json({
      success: true,
      message: 'Your account and all associated data have been permanently deleted.'
    });

  } catch (error) {
    console.error('❌ Delete account error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete account',
      error: error.message
    });
  }
});

// === GET ACCOUNT STATUS ===
router.get('/status', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;

    const user = await User.findById(userId).select('status deactivatedAt deactivationReason');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      status: user.status,
      deactivatedAt: user.deactivatedAt,
      deactivationReason: user.deactivationReason,
      canReactivate: user.status === 'deactivated' && user.deactivatedAt 
        ? Math.floor((new Date() - new Date(user.deactivatedAt)) / (1000 * 60 * 60 * 24)) <= 30
        : false
    });

  } catch (error) {
    console.error('❌ Get account status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get account status',
      error: error.message
    });
  }
});

module.exports = router;