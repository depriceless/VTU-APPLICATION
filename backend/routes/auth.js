const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { authenticate } = require('../middleware/auth');
const { logger } = require('../utils/logger');
const { getRedisClient } = require('../utils/redis');
const { sendPasswordResetEmail, sendPasswordChangedEmail } = require('../emailService');

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

// ── Cookie config ──────────────────────────────────────────────
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure:   process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge:   7 * 24 * 60 * 60 * 1000,
};

// ── Rate limiters ──────────────────────────────────────────────
const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { success: false, message: 'Too many accounts created from this IP. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip,
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: 'Too many login attempts. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { success: false, message: 'Too many password reset requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

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
  body('password').notEmpty().withMessage('Password is required'),
  body().custom((_, { req }) => {
    const value = (req.body.email || req.body.emailOrPhone || '').trim();
    if (!value) throw new Error('Email or phone is required');
    const cleaned = value.replace(/\s+/g, '').replace(/[\-\(\)]/g, '');
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    const isPhone = /^[\+]?\d{7,15}$/.test(cleaned);
    if (!isEmail && !isPhone) throw new Error('Please provide a valid email or phone number');
    return true;
  }),
];

const profileUpdateValidation = [
  body('name').optional().trim().isLength({ min: 1, max: 100 }).withMessage('Name must be 1–100 characters'),
  body('username').optional().trim().isLength({ min: 3, max: 30 })
    .matches(/^[a-zA-Z0-9._-]+$/).withMessage('Username contains invalid characters'),
  body('email').optional().isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('phone').optional().matches(/^\d{10,15}$/).withMessage('Phone must be 10-15 digits'),
];

// ── POST /signup ───────────────────────────────────────────────
router.post('/signup', signupLimiter, signupValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { name, username, email, phone, password } = req.body;

    const [emailExists, usernameExists, phoneExists] = await Promise.all([
      User.findOne({ email }),
      User.findOne({ username }),
      User.findOne({ phone }),
    ]);

    if (emailExists) {
      return res.status(409).json({ success: false, field: 'email', message: 'This email address is already registered.' });
    }
    if (usernameExists) {
      return res.status(409).json({ success: false, field: 'username', message: 'This username is already taken.' });
    }
    if (phoneExists) {
      return res.status(409).json({ success: false, field: 'phone', message: 'This phone number is already registered.' });
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
      user: {
        id:         user._id,
        name:       user.name,
        username:   user.username,
        email:      user.email,
        isPinSetup: false,
      },
    });
  } catch (error) {
    logger.error('Signup error', error.message);
    return res.status(500).json({ success: false, message: 'Server error during signup.' });
  }
});

// ── POST /login ────────────────────────────────────────────────
router.post('/login', loginLimiter, loginValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: errors.array()[0].msg });
    }

    const rawInput = (req.body.email || req.body.emailOrPhone || '').trim().toLowerCase().replace(/\s+/g, '');
    const password = req.body.password;

    const clean   = rawInput.replace(/[\-\(\)]/g, '');
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawInput);
    const query   = isEmail ? { email: rawInput } : { phone: clean };

    const user = await User.findOne(query).select('+password');

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      return res.status(423).json({ success: false, message: 'Account temporarily locked. Please try again later.' });
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
        phone:           user.phone,
        isEmailVerified: user.isEmailVerified ?? false,
        isPinSetup:      user.isPinSetup ?? false,
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

    return res.json({
      success: true,
      user: {
        id:              user._id,
        name:            user.name,
        username:        user.username,
        email:           user.email,
        phone:           user.phone,
        isEmailVerified: user.isEmailVerified ?? false,
        isPinSetup:      user.isPinSetup ?? false,
      },
      balance: wallet?.balance ?? 0,
    });
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
router.post('/forgot-password', forgotPasswordLimiter, [
  body('email').notEmpty().withMessage('Email is required'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const genericResponse = { success: true, message: 'If an account exists for that email, a reset link has been sent.' };

    const user = await User.findOne({ email: req.body.email.trim().toLowerCase() });
    if (!user) return res.json(genericResponse);

    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken   = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000);
    await user.save();

    const emailResult = await sendPasswordResetEmail(user.email, user.name, resetToken);

    if (!emailResult.success) {
      logger.error('Password reset email failed to send', emailResult.message);
    } else {
      logger.info(`Password reset email sent to ${user.email}`);
    }

    return res.json(genericResponse);
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

    // Send confirmation email — non-blocking
    sendPasswordChangedEmail(user.email, user.name).catch(err =>
      logger.error('Password changed email failed', err.message)
    );

    return res.json({ success: true, message: 'Password reset successfully.' });
  } catch (error) {
    logger.error('Reset password error', error.message);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
});

module.exports = router;