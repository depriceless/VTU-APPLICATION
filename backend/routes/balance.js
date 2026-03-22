const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const Wallet = require('../models/Wallet');
const { logger } = require('../utils/logger');

// GET user wallet balance
router.get('/', authenticate, async (req, res) => {
  try {
    const wallet = await Wallet.findOne({ userId: req.user.userId });

    if (!wallet) {
      return res.status(404).json({ success: false, message: 'Wallet not found' });
    }

    const amount = parseFloat(wallet.balance || 0);

    res.status(200).json({
      success: true,
      balance: isNaN(amount) ? 0 : amount,
      currency: wallet.currency || 'NGN',
      lastUpdated: wallet.updatedAt?.toISOString() || new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Balance fetch error', error);
    res.status(500).json({ success: false, message: 'Server error fetching balance' });
  }
});

// PUT route — blocked, balance is only updated internally by Paystack webhook and purchase routes
router.put('/', authenticate, async (req, res) => {
  return res.status(403).json({
    success: false,
    message: 'Forbidden. Balance cannot be updated directly.',
  });
});

module.exports = router;