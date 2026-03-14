// routes/transactions.js
const express = require('express');
const router = express.Router();
const Transaction = require('../models/Transaction');
const { authenticate } = require('../middleware/auth');
const mongoose = require('mongoose');
const { logger } = require('../utils/logger');

// ✅ FIX 1: Whitelist allowed filter values to prevent injection
const ALLOWED_TYPES    = ['credit', 'debit'];
const ALLOWED_STATUSES = ['pending', 'completed', 'failed', 'reversed'];
const ALLOWED_CATEGORIES = ['airtime', 'data', 'electricity', 'cabletv', 'education', 'betting', 'wallet', 'transfer'];

// Get user transactions
router.get('/', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 20, type, status, category } = req.query;

    // Build query object
    const query = { userId: req.user.id };

    // ✅ FIX 1: Only allow whitelisted filter values
    if (type && ALLOWED_TYPES.includes(type)) query.type = type;
    if (status && ALLOWED_STATUSES.includes(status)) query.status = status;
    if (category && ALLOWED_CATEGORIES.includes(category)) query.category = category;

    // ✅ FIX 2: Cap pagination to prevent database dump
    const pageNum  = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20)); // Max 100 per page
    const skip     = (pageNum - 1) * limitNum;

    const transactions = await Transaction.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    const total = await Transaction.countDocuments(query);

    logger.success(`Retrieved ${transactions.length} transactions`);

    res.json({
      success: true,
      transactions,
      pagination: {
        page:  pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    // ✅ FIX 3: Log message only, not full error object
    logger.error('Error fetching transactions', error.message);
    res.status(500).json({ success: false, message: 'Error fetching transactions' });
  }
});

// Get specific transaction by ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid transaction ID format' });
    }

    const transaction = await Transaction.findById(req.params.id)
      .populate('userId', 'name email phone')
      .populate('walletId', 'balance');

    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }

    // Validate user ownership
    const transactionUserId = transaction.userId._id
      ? transaction.userId._id.toString()
      : transaction.userId.toString();

    if (transactionUserId !== req.user.id.toString()) {
      logger.warn('Unauthorized transaction access attempt');
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    logger.success('Transaction retrieved');

    res.json({ success: true, transaction });
  } catch (error) {
    logger.error('Error fetching transaction', error.message);
    res.status(500).json({ success: false, message: 'Error fetching transaction' });
  }
});

// ✅ FIX 4: Debug routes completely removed — never ship debug endpoints

module.exports = router;