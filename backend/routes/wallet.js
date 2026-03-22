const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');
const User = require('../models/User');
const Wallet = require('../models/Wallet');
const Transaction = require('../models/Transaction');
const { authenticate } = require('../middleware/auth');
const { logger } = require('../utils/logger');

// ── Input validators ───────────────────────────────────────────
const validateAmount = (amount, max = 1000000) => {
  const parsed = parseFloat(amount);
  if (!amount || isNaN(parsed) || parsed <= 0) return { valid: false, message: 'Invalid amount. Please enter a valid positive number.' };
  if (parsed > max) return { valid: false, message: `Amount cannot exceed ₦${max.toLocaleString()}` };
  return { valid: true, value: parsed };
};

// FIX: rate limiter on transfer — prevents rapid drain attempts
const transferLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  keyGenerator: (req) => req.user?.userId || req.ip,
  handler: (req, res) => {
    logger.warn(`Transfer rate limit hit for user ${req.user?.userId || req.ip}`);
    res.status(429).json({ success: false, message: 'Too many transfer attempts. Please slow down.' });
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// FIX: rate limiter on transaction list — prevents scraping
const transactionLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  keyGenerator: (req) => req.user?.userId || req.ip,
  handler: (req, res) => {
    res.status(429).json({ success: false, message: 'Too many requests. Please slow down.' });
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// ── GET /api/wallet/balance ────────────────────────────────────
router.get('/wallet/balance', authenticate, async (req, res) => {
  try {
    const wallet = await Wallet.findByUserId(req.user.userId);
    if (!wallet) return res.status(404).json({ success: false, message: 'Wallet not found' });

    const recentTransactions = await Transaction.getWalletTransactions(wallet._id, { limit: 5 });

    res.json({
      success: true,
      balance: wallet.balance,
      formattedBalance: wallet.formattedBalance,
      wallet: {
        id:                  wallet._id,
        isActive:            wallet.isActive,
        currency:            wallet.currency,
        lastTransactionDate: wallet.lastTransactionDate,
      },
      stats: wallet.stats,
      recentTransactions,
    });
  } catch (error) {
    logger.error('Get balance error', error.message);
    res.status(500).json({ success: false, message: 'Server error fetching balance' });
  }
});

// ── POST /api/wallet/fund ──────────────────────────────────────
// BLOCKED — wallet funding is handled internally by Paystack webhook only
router.post('/wallet/fund', authenticate, async (req, res) => {
  return res.status(403).json({
    success: false,
    message: 'Forbidden. Wallet can only be funded through a verified payment.',
  });
});

// ── POST /api/wallet/debit ─────────────────────────────────────
// BLOCKED — wallet debit is handled internally by purchase routes only
router.post('/wallet/debit', authenticate, async (req, res) => {
  return res.status(403).json({
    success: false,
    message: 'Forbidden. Wallet debit is handled internally only.',
  });
});

// ── GET /api/wallet/transactions ───────────────────────────────
router.get('/wallet/transactions', authenticate, transactionLimiter, async (req, res) => {
  try {
    // FIX: clamp page and limit to safe ranges — prevents abuse like limit=999999
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));

    // FIX: whitelist type and status values — prevents NoSQL injection via query params
    const ALLOWED_TYPES    = ['debit', 'credit'];
    const ALLOWED_STATUSES = ['completed', 'pending', 'failed', 'pending_reconciliation'];
    const type   = ALLOWED_TYPES.includes(req.query.type)       ? req.query.type   : undefined;
    const status = ALLOWED_STATUSES.includes(req.query.status)  ? req.query.status : undefined;

    // FIX: validate date params are actual dates before passing to DB
    let startDate, endDate;
    if (req.query.startDate) {
      startDate = new Date(req.query.startDate);
      if (isNaN(startDate.getTime())) startDate = undefined;
    }
    if (req.query.endDate) {
      endDate = new Date(req.query.endDate);
      if (isNaN(endDate.getTime())) endDate = undefined;
    }

    const wallet = await Wallet.findByUserId(req.user.userId);
    if (!wallet) return res.status(404).json({ success: false, message: 'Wallet not found' });

    const transactions = await Transaction.getUserTransactions(req.user.userId, {
      page, limit, type, status, startDate, endDate,
    });

    const totalQuery = { userId: new mongoose.Types.ObjectId(req.user.userId) };
    if (type)   totalQuery.type   = type;
    if (status) totalQuery.status = status;
    if (startDate || endDate) {
      totalQuery.createdAt = {};
      if (startDate) totalQuery.createdAt.$gte = startDate;
      if (endDate)   totalQuery.createdAt.$lte = endDate;
    }

    const totalTransactions = await Transaction.countDocuments(totalQuery);

    res.json({
      success: true,
      transactions,
      pagination: {
        currentPage:       page,
        totalPages:        Math.ceil(totalTransactions / limit),
        totalTransactions,
        hasNext:           (page * limit) < totalTransactions,
        hasPrev:           page > 1,
      },
      wallet: {
        balance:          wallet.balance,
        formattedBalance: wallet.formattedBalance,
        stats:            wallet.stats,
      },
    });
  } catch (error) {
    logger.error('Get transactions error', error.message);
    res.status(500).json({ success: false, message: 'Server error fetching transactions' });
  }
});

// ── POST /api/wallet/transfer ──────────────────────────────────
router.post('/wallet/transfer', authenticate, transferLimiter, async (req, res) => {
  try {
    const { recipientEmail, amount, description } = req.body;

    // Validate email format
    if (!recipientEmail || typeof recipientEmail !== 'string' || recipientEmail.length > 254) {
      return res.status(400).json({ success: false, message: 'Invalid recipient email' });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(recipientEmail)) {
      return res.status(400).json({ success: false, message: 'Invalid recipient email format' });
    }

    const check = validateAmount(amount, 500000);
    if (!check.valid) return res.status(400).json({ success: false, message: check.message });

    // FIX: sanitize description before storing
    if (description && typeof description !== 'string') {
      return res.status(400).json({ success: false, message: 'Invalid description' });
    }
    const safeDescription = description
      ? description.slice(0, 200).replace(/[<>"']/g, '').trim()
      : null;

    const sender    = await User.findById(req.user.userId);
    const recipient = await User.findOne({ email: recipientEmail.toLowerCase().trim() });

    if (!sender) return res.status(404).json({ success: false, message: 'Sender not found' });

    // Vague message — don't confirm whether the email is registered
    if (!recipient) {
      return res.status(400).json({ success: false, message: 'Transfer failed. Please check the recipient details and try again.' });
    }

    if (sender._id.toString() === recipient._id.toString()) {
      return res.status(400).json({ success: false, message: 'Cannot transfer to yourself' });
    }

    // FIX: check recipient account is active before transferring
    if (!recipient.isActive) {
      return res.status(400).json({ success: false, message: 'Transfer failed. Please check the recipient details and try again.' });
    }

    const senderWallet    = await Wallet.findByUserId(sender._id);
    let   recipientWallet = await Wallet.findByUserId(recipient._id);

    if (!senderWallet) return res.status(404).json({ success: false, message: 'Sender wallet not found' });
    if (!recipientWallet) recipientWallet = await Wallet.createForUser(recipient._id);

    // FIX: check sender wallet is active before allowing transfer
    if (!senderWallet.isActive) {
      return res.status(403).json({ success: false, message: 'Your wallet is not active.' });
    }

    const result = await senderWallet.transfer(
      recipientWallet,
      check.value,
      safeDescription || `Transfer to ${recipient.name}`
    );

    logger.info(`Transfer: ₦${check.value} from ${sender._id} to ${recipient._id}`);

    res.json({
      success: true,
      message: `₦${check.value.toLocaleString()} transferred successfully to ${recipient.name}`,
      transfer: {
        amount:    check.value,
        recipient: { name: recipient.name, email: recipient.email },
        reference: result.reference,
        newBalance:       senderWallet.balance,
        formattedBalance: senderWallet.formattedBalance,
      },
    });
  } catch (error) {
    logger.error('Transfer error', error.message);
    // FIX: don't leak internal error messages to client
    res.status(400).json({ success: false, message: 'Transfer failed. Please try again.' });
  }
});

// ── GET /api/wallet/stats ──────────────────────────────────────
router.get('/wallet/stats', authenticate, async (req, res) => {
  try {
    const wallet = await Wallet.findByUserId(req.user.userId);
    if (!wallet) return res.status(404).json({ success: false, message: 'Wallet not found' });

    const thirtyDaysAgo = new Date(Date.now() - (30 * 24 * 60 * 60 * 1000));
    const sevenDaysAgo  = new Date(Date.now() - (7  * 24 * 60 * 60 * 1000));

    const [monthlyTransactions, weeklyTransactions] = await Promise.all([
      Transaction.countDocuments({ userId: req.user.userId, createdAt: { $gte: thirtyDaysAgo } }),
      Transaction.countDocuments({ userId: req.user.userId, createdAt: { $gte: sevenDaysAgo  } }),
    ]);

    res.json({
      success: true,
      stats: {
        currentBalance:   wallet.balance,
        formattedBalance: wallet.formattedBalance,
        ...wallet.stats,
        monthlyTransactions,
        weeklyTransactions,
        walletAge: Math.ceil((new Date() - wallet.createdAt) / (24 * 60 * 60 * 1000)),
        isActive:  wallet.isActive,
        currency:  wallet.currency,
      },
    });
  } catch (error) {
    logger.error('Get wallet stats error', error.message);
    res.status(500).json({ success: false, message: 'Server error fetching wallet statistics' });
  }
});

// ── POST /api/wallet/create ────────────────────────────────────
router.post('/wallet/create', authenticate, async (req, res) => {
  try {
    const existingWallet = await Wallet.findByUserId(req.user.userId);
    if (existingWallet) {
      return res.status(400).json({ success: false, message: 'User already has a wallet' });
    }

    const wallet = await Wallet.createForUser(req.user.userId);

    res.json({
      success: true,
      message: 'Wallet created successfully',
      wallet: {
        id:               wallet._id,
        balance:          wallet.balance,
        formattedBalance: wallet.formattedBalance,
        currency:         wallet.currency,
      },
    });
  } catch (error) {
    logger.error('Create wallet error', error.message);
    res.status(500).json({ success: false, message: 'Error creating wallet' });
  }
});

module.exports = router;