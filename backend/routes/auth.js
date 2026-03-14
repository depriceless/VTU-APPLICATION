const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { authenticate } = require('../middleware/auth');
const { logger } = require('../utils/logger');
const { getRedisClient } = require('../utils/redis');

const router = express.Router();

// ── Token blacklist (Redis-backed) ─────────────────────────────
const BLACKLIST_PREFIX = 'blacklist:';

async function blacklistToken(token) {
  try {
    const decoded = jwt.decode(token);
    if (!decoded?.exp) return;
    const ttl = decoded.exp - Math.floor(Date.now() / 1000);
    if (ttl <= 0) return;
    const redis = getRedisClient();
    await redis.set(`${BLACKLIST_PREFIX}${token}`, '1', 'EX', ttl);
  } catch (err) {
    logger.warn('Redis blacklist write failed — token may remain valid until expiry', err.message);
  }
}

async function isTokenBlacklisted(token) {
  try {
    const redis = getRedisClient();
    const result = await redis.get(`${BLACKLIST_PREFIX}${token}`);
    return result !== null;
  } catch (err) {
    logger.warn('Redis blacklist read failed — allowing token through', err.message);
    return false;
  }
}

router.isTokenBlacklisted = isTokenBlacklisted;

// ── Cookie config (kept for backwards compat) ──────────────────
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure:   process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge:   7 * 24 * 60 * 60 * 1000,
};

// ── Validation rules ───────────────────────────────────────────
const signupValidation = [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 100 }),
  body('username').trim().notEmpty().isLength({ min: 3, max: 30 })
    .matches(/^[a-zA-Z0-9._-]+$/).withMessage('Username contains invalid characters'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('phone').matches(/^\d{10,15}$/).withMessage('Phone must be 10-15 digits'),
  body('password')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/).withMessage('Password must contain an uppercase letter')
    .matches(/[a-z]/).withMessage('Password must contain a lowercase letter')
    .matches(/[0-9]/).withMessage('Password must contain a number'),
];

const loginValidation = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email or phone is required')
    .custom((value) => {
      const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
      const isPhone = /^[\+]?\d{7,15}$/.test(value.replace(/[\s\-\(\)]/g, ''));
      if (!isEmail && !isPhone) throw new Error('Please provide a valid email or phone number');
      return true;
    }),
  body('password').notEmpty().withMessage('Password is required'),
];

const profileUpdateValidation = [
  body('name').optional().trim().isLength({ min: 1, max: 100 }).withMessage('Name must be 1–100 characters'),
  body('username').optional().trim().isLength({ min: 3, max: 30 })
    .matches(/^[a-zA-Z0-9._-]+$/).withMessage('Username contains invalid characters'),
  body('email').optional().isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('phone').optional().matches(/^\d{10,15}$/).withMessage('Phone must be 10-15 digits'),
];

// ── POST /signup ───────────────────────────────────────────────
router.post('/signup', signupValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { name, username, email, phone, password } = req.body;

    const existingUser = await User.findOne({ $or: [{ email }, { username }, { phone }] });
    if (existingUser) {
      return res.status(409).json({ success: false, message: 'Account already exists.' });
    }

    const user = new User({ name, username, email, phone, password, registrationIP: req.ip });
    await user.save();

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.cookie('token', token, COOKIE_OPTIONS);

    logger.info('New user registered');
    return res.status(201).json({
      success: true,
      message: 'Account created successfully.',
      token,
      user: { id: user._id, name: user.name, username: user.username, email: user.email },
    });
  } catch (error) {
    logger.error('Signup error', error.message);
    return res.status(500).json({ success: false, message: 'Server error during signup.' });
  }
});

// ── POST /login ────────────────────────────────────────────────
router.post('/login', loginValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { email: emailOrPhone, password } = req.body;

    const clean   = emailOrPhone.replace(/[\s\-\(\)]/g, '');
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailOrPhone);
    const query   = isEmail ? { email: emailOrPhone.toLowerCase() } : { phone: clean };

    const user = await User.findOne(query).select('+password');

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      return res.status(423).json({
        success: false,
        message: 'Account temporarily locked. Please try again later.',
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
      if (user.failedLoginAttempts >= 5) {
        user.lockedUntil = new Date(Date.now() + 30 * 60 * 1000);
      }
      await user.save();
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    if (!user.isActive) {
      return res.status(403).json({ success: false, message: 'Account is deactivated.' });
    }

    user.failedLoginAttempts = 0;
    user.lockedUntil         = undefined;
    user.lastLogin           = new Date();
    user.lastLoginIP         = req.ip;
    await user.save();

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.cookie('token', token, COOKIE_OPTIONS);

    logger.info('User logged in');
    return res.json({
      success: true,
      message: 'Login successful.',
      token,
      user: {
        id:              user._id,
        name:            user.name,
        username:        user.username,
        email:           user.email,
        isEmailVerified: user.isEmailVerified,
      },
    });
  } catch (error) {
    logger.error('Login error', error.message);
    return res.status(500).json({ success: false, message: 'Server error during login.' });
  }
});

// ── POST /logout ───────────────────────────────────────────────
router.post('/logout', authenticate, async (req, res) => {
  try {
    res.clearCookie('token', {
      httpOnly: true,
      secure:   process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });

    const token = req.cookies?.token || req.header('Authorization')?.replace('Bearer ', '');
    if (token) await blacklistToken(token);

    logger.info('User logged out');
    return res.json({ success: true, message: 'Logged out successfully.' });
  } catch (error) {
    logger.error('Logout error', error.message);
    return res.status(500).json({ success: false, message: 'Server error during logout.' });
  }
});

// ── GET /profile ───────────────────────────────────────────────
router.get('/profile', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    return res.json({ success: true, user });
  } catch (error) {
    logger.error('Profile fetch error', error.message);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ── GET /me ────────────────────────────────────────────────────
router.get('/me', authenticate, async (req, res) => {
  try {
    const User   = require('../models/User');
    const Wallet = require('../models/Wallet');

    const [user, wallet] = await Promise.all([
      User.findById(req.user.userId),
      Wallet.findOne({ userId: req.user.userId }),
    ]);

    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    return res.json({ success: true, user, balance: wallet?.balance ?? 0 });
  } catch (error) {
    logger.error('Me endpoint error', error.message);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ── PUT /profile ───────────────────────────────────────────────
router.put('/profile', authenticate, profileUpdateValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const allowedFields = ['name', 'username', 'email', 'phone'];
    const updates = {};
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    const user = await User.findByIdAndUpdate(
      req.user.userId,
      { $set: updates },
      { new: true, runValidators: true }
    );

    return res.json({ success: true, user });
  } catch (error) {
    logger.error('Profile update error', error.message);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ── POST /setup-pin ────────────────────────────────────────────
router.post('/setup-pin', authenticate, [
  body('pin').matches(/^\d{4}$/).withMessage('PIN must be exactly 4 digits'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const user = await User.findById(req.user.userId).select('+pin');
    user.pin        = req.body.pin;
    user.isPinSetup = true;
    await user.save();

    return res.json({ success: true, message: 'PIN set up successfully.' });
  } catch (error) {
    logger.error('PIN setup error', error.message);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ── POST /verify-pin ───────────────────────────────────────────
router.post('/verify-pin', authenticate, [
  body('pin').matches(/^\d{4}$/).withMessage('PIN must be exactly 4 digits'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const user = await User.findById(req.user.userId).select('+pin');
    if (!user.isPinSetup || !user.pin) {
      return res.status(400).json({ success: false, message: 'PIN not set up.' });
    }

    const isMatch = await user.comparePin(req.body.pin);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid PIN.' });
    }

    return res.json({ success: true, message: 'PIN verified.' });
  } catch (error) {
    logger.error('PIN verify error', error.message);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ── POST /forgot-password ──────────────────────────────────────
router.post('/forgot-password', [
  body('email').isEmail().normalizeEmail(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const user = await User.findOne({ email: req.body.email });
    if (!user) {
      return res.json({ success: true, message: 'If that email exists, a reset link has been sent.' });
    }

    const crypto     = require('crypto');
    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken   = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000);
    await user.save();

    // TODO: send resetToken via email
    logger.info('Password reset requested');
    return res.json({ success: true, message: 'If that email exists, a reset link has been sent.' });
  } catch (error) {
    logger.error('Forgot password error', error.message);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ── POST /reset-password ───────────────────────────────────────
router.post('/reset-password', [
  body('token').notEmpty(),
  body('password')
    .isLength({ min: 8 })
    .matches(/[A-Z]/).matches(/[a-z]/).matches(/[0-9]/),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const crypto      = require('crypto');
    const hashedToken = crypto.createHash('sha256').update(req.body.token).digest('hex');
    const user        = await User.findOne({
      resetPasswordToken:   hashedToken,
      resetPasswordExpires: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired reset token.' });
    }

    user.password             = req.body.password;
    user.resetPasswordToken   = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    return res.json({ success: true, message: 'Password reset successfully.' });
  } catch (error) {
    logger.error('Reset password error', error.message);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
});

module.exports = router;