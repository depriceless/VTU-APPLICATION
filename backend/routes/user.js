// routes/user.js
const express = require('express');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const User = require('../models/User');
const { authenticate } = require('../middleware/auth');
const { logger } = require('../utils/logger');

const router = express.Router();

// ── Rate limiters ──────────────────────────────────────────────

// FIX: rate limit on password change — prevents brute-force
const changePasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  keyGenerator: (req) => req.user?.userId || req.ip,
  handler: (req, res) => {
    logger.warn(`Change-password rate limit hit for user ${req.user?.userId}`);
    res.status(429).json({ success: false, message: 'Too many attempts. Please try again later.' });
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// FIX: rate limit on PIN change — prevents brute-force
const changePinLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  keyGenerator: (req) => req.user?.userId || req.ip,
  handler: (req, res) => {
    logger.warn(`Change-PIN rate limit hit for user ${req.user?.userId}`);
    res.status(429).json({ success: false, message: 'Too many attempts. Please try again later.' });
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// ── PIN lockout helpers ────────────────────────────────────────
const MAX_PIN_ATTEMPTS = 3;
const PIN_LOCK_DURATION = 30 * 60 * 1000; // 30 minutes

const checkPinLockout = (user) => {
  if (user.pinLockedUntil && user.pinLockedUntil > new Date()) {
    const minutesLeft = Math.ceil((user.pinLockedUntil - Date.now()) / 60000);
    return { locked: true, minutesLeft };
  }
  return { locked: false };
};

const incrementPinAttempts = async (user) => {
  user.failedPinAttempts = (user.failedPinAttempts || 0) + 1;
  if (user.failedPinAttempts >= MAX_PIN_ATTEMPTS) {
    user.pinLockedUntil = new Date(Date.now() + PIN_LOCK_DURATION);
    user.failedPinAttempts = 0;
    logger.warn(`PIN locked for user ${user._id} after ${MAX_PIN_ATTEMPTS} failed attempts`);
  }
  await user.save();
};

const resetPinAttempts = async (user) => {
  if (user.failedPinAttempts > 0 || user.pinLockedUntil) {
    user.failedPinAttempts = 0;
    user.pinLockedUntil = null;
    await user.save();
  }
};

// ── PUT /change-password ───────────────────────────────────────
router.put('/change-password', authenticate, changePasswordLimiter, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Both old and new password are required' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters' });
    }

    const user = await User.findById(req.user.userId).select('+password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Old password is incorrect' });
    }

    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      return res.status(400).json({ success: false, message: 'New password must be different from old password' });
    }

    // Pre-save hook handles hashing
    user.password = newPassword;
    await user.save();

    logger.info(`Password updated for user: ${user._id}`);

    res.status(200).json({ success: true, message: 'Password updated successfully' });

  } catch (error) {
    logger.error('Change password error', error.message);
    res.status(500).json({ success: false, message: 'Server error updating password' });
  }
});

// ── PUT /change-pin ────────────────────────────────────────────
router.put('/change-pin', authenticate, changePinLimiter, async (req, res) => {
  try {
    const { oldPin, newPin } = req.body;

    if (!oldPin || !newPin) {
      return res.status(400).json({ success: false, message: 'Both old and new PIN are required' });
    }

    if (!/^\d{4}$/.test(oldPin) || !/^\d{4}$/.test(newPin)) {
      return res.status(400).json({ success: false, message: 'PIN must be exactly 4 digits' });
    }

    if (oldPin === newPin) {
      return res.status(400).json({ success: false, message: 'New PIN must be different from old PIN' });
    }

    const user = await User.findById(req.user.userId).select('+pin +failedPinAttempts +pinLockedUntil');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (!user.pin) {
      return res.status(400).json({ success: false, message: 'No PIN set for this account. Please set a PIN first.' });
    }

    // FIX: check lockout before comparing PIN
    const lockout = checkPinLockout(user);
    if (lockout.locked) {
      return res.status(403).json({
        success: false,
        message: `PIN is locked due to too many failed attempts. Try again in ${lockout.minutesLeft} minute(s).`,
      });
    }

    const isMatch = await bcrypt.compare(oldPin, user.pin);
    if (!isMatch) {
      // FIX: increment failed attempts and potentially lock
      await incrementPinAttempts(user);
      return res.status(400).json({ success: false, message: 'Old PIN is incorrect' });
    }

    // FIX: reset lockout on success
    await resetPinAttempts(user);

    // Pre-save hook handles hashing
    user.pin = newPin;
    await user.save();

    logger.info(`PIN updated for user: ${user._id}`);

    res.status(200).json({ success: true, message: 'PIN updated successfully' });

  } catch (error) {
    logger.error('Change PIN error', error.message);
    res.status(500).json({ success: false, message: 'Server error updating PIN' });
  }
});

module.exports = router;