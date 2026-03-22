// routes/account.js
const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcrypt');
const User = require('../models/User');
const Balance = require('../models/Balance');
const Transaction = require('../models/Transaction');
const PaystackAccount = require('../models/PaystackAccount');
const MonnifyAccount = require('../models/MonnifyAccount');
const { authenticate } = require('../middleware/auth');
const { logger } = require('../utils/logger');

// ── Rate limiters ──────────────────────────────────────────────

// FIX: rate limit on deactivate — prevents password brute-force
const deactivateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  keyGenerator: (req) => req.user?.userId || req.ip,
  handler: (req, res) => {
    logger.warn(`Deactivate rate limit hit for user ${req.user?.userId}`);
    res.status(429).json({ success: false, message: 'Too many attempts. Please try again later.' });
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// FIX: rate limit on reactivate — public route, needs strict limiting
const reactivateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  keyGenerator: (req) => req.ip,
  handler: (req, res) => {
    logger.warn(`Reactivate rate limit hit from IP ${req.ip}`);
    res.status(429).json({ success: false, message: 'Too many attempts. Please try again later.' });
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// FIX: rate limit on delete — prevents password brute-force on destructive action
const deleteLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3,
  keyGenerator: (req) => req.user?.userId || req.ip,
  handler: (req, res) => {
    logger.warn(`Delete rate limit hit for user ${req.user?.userId}`);
    res.status(429).json({ success: false, message: 'Too many attempts. Please try again later.' });
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// ── POST /deactivate ───────────────────────────────────────────
router.post('/deactivate', authenticate, deactivateLimiter, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { reason, password } = req.body;

    if (!password) {
      return res.status(400).json({ success: false, message: 'Password is required' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user.status === 'deactivated') {
      return res.status(400).json({ success: false, message: 'Account is already deactivated' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ success: false, message: 'Invalid password' });
    }

    // FIX: sanitize reason before storing
    const safeReason = reason
      ? String(reason).slice(0, 300).replace(/[<>"']/g, '').trim()
      : 'User requested deactivation';

    // FIX: update both status AND isActive so auth middleware catches it
    user.status = 'deactivated';
    user.isActive = false;
    user.deactivatedAt = new Date();
    user.deactivationReason = safeReason;
    await user.save();

    logger.info(`Account deactivated for user: ${user._id}`);

    res.json({
      success: true,
      message: 'Account has been deactivated successfully. You can reactivate it by logging in within 30 days.',
      deactivatedAt: user.deactivatedAt,
    });

  } catch (error) {
    // FIX: never expose error.message to client
    logger.error('Deactivate account error', error.message);
    res.status(500).json({ success: false, message: 'Failed to deactivate account' });
  }
});

// ── POST /reactivate ───────────────────────────────────────────
// FIX: added reactivateLimiter — this is a public route (no JWT), must be rate-limited
router.post('/reactivate', reactivateLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    // FIX: validate email format before DB query
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (typeof email !== 'string' || email.length > 254 || !emailRegex.test(email)) {
      return res.status(400).json({ success: false, message: 'Invalid email format' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });

    // FIX: vague message — don't confirm whether email is registered
    if (!user || user.status !== 'deactivated') {
      return res.status(400).json({
        success: false,
        message: 'Reactivation failed. Please check your details or contact support.',
      });
    }

    const deactivatedDate = new Date(user.deactivatedAt);
    const daysSinceDeactivation = Math.floor((Date.now() - deactivatedDate) / (1000 * 60 * 60 * 24));

    if (daysSinceDeactivation > 30) {
      return res.status(400).json({
        success: false,
        message: 'Deactivation period has expired. Please contact support to reactivate your account.',
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ success: false, message: 'Invalid password' });
    }

    // FIX: restore both status AND isActive
    user.status = 'active';
    user.isActive = true;
    user.deactivatedAt = null;
    user.deactivationReason = null;
    await user.save();

    logger.info(`Account reactivated for user: ${user._id}`);

    res.json({
      success: true,
      message: 'Account has been reactivated successfully. You can now log in.',
      user: {
        id:     user._id,
        name:   user.name,
        email:  user.email,
        status: user.status,
      },
    });

  } catch (error) {
    logger.error('Reactivate account error', error.message);
    res.status(500).json({ success: false, message: 'Failed to reactivate account' });
  }
});

// ── DELETE /delete ─────────────────────────────────────────────
router.delete('/delete', authenticate, deleteLimiter, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { password, confirmText } = req.body;

    if (confirmText !== 'DELETE MY ACCOUNT') {
      return res.status(400).json({
        success: false,
        message: 'Please type "DELETE MY ACCOUNT" to confirm deletion',
      });
    }

    if (!password) {
      return res.status(400).json({ success: false, message: 'Password is required' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ success: false, message: 'Invalid password' });
    }

    const balance = await Balance.findOne({ user: userId });
    if (balance && balance.amount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete account with remaining balance. Please withdraw or transfer your funds first.`,
        // FIX: don't expose exact balance amount in error context — just block deletion
      });
    }

    const userEmail = user.email;

    await Promise.all([
      User.findByIdAndDelete(userId),
      Balance.deleteMany({ user: userId }),
      Transaction.deleteMany({ user: userId }),
      PaystackAccount.deleteMany({ user: userId }),
      MonnifyAccount.deleteMany({ user: userId }),
    ]);

    logger.info(`Account permanently deleted for user: ${userEmail}`);

    res.json({
      success: true,
      message: 'Your account and all associated data have been permanently deleted.',
    });

  } catch (error) {
    logger.error('Delete account error', error.message);
    res.status(500).json({ success: false, message: 'Failed to delete account' });
  }
});

// ── GET /status ────────────────────────────────────────────────
router.get('/status', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;

    const user = await User.findById(userId).select('status deactivatedAt deactivationReason');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({
      success: true,
      status: user.status,
      deactivatedAt: user.deactivatedAt,
      deactivationReason: user.deactivationReason,
      canReactivate: user.status === 'deactivated' && user.deactivatedAt
        ? Math.floor((Date.now() - new Date(user.deactivatedAt)) / (1000 * 60 * 60 * 24)) <= 30
        : false,
    });

  } catch (error) {
    logger.error('Get account status error', error.message);
    res.status(500).json({ success: false, message: 'Failed to get account status' });
  }
});

module.exports = router;