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
      balance: isNaN(amount) ? 0 : amount,   // flat number — AuthContext reads this directly
      currency: wallet.currency || 'NGN',
      lastUpdated: wallet.updatedAt?.toISOString() || new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Balance fetch error', error);
    res.status(500).json({ success: false, message: 'Server error fetching balance' });
  }
});

// PUT route to update wallet balance (admin/internal use)
router.put('/', authenticate, async (req, res) => {
  try {
    const { amount, operation } = req.body;

    if (typeof amount !== 'number') {
      return res.status(400).json({ success: false, message: 'Amount must be a number' });
    }

    const wallet = await Wallet.findOne({ userId: req.user.userId });

    if (!wallet) {
      return res.status(404).json({ success: false, message: 'Wallet not found' });
    }

    const current = parseFloat(wallet.balance || 0);
    let newBalance;

    switch (operation) {
      case 'add':      newBalance = current + amount; break;
      case 'subtract': newBalance = current - amount; break;
      case 'set':      newBalance = amount;           break;
      default:
        return res.status(400).json({ success: false, message: 'Invalid operation. Use add, subtract, or set' });
    }

    if (newBalance < 0) {
      return res.status(400).json({ success: false, message: 'Insufficient funds' });
    }

    wallet.balance = newBalance;
    await wallet.save();

    res.status(200).json({
      success: true,
      message: `Balance ${operation}ed successfully`,
      balance: parseFloat(wallet.balance),
      currency: wallet.currency || 'NGN',
      lastUpdated: wallet.updatedAt?.toISOString() || new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Balance update error', error);
    res.status(500).json({ success: false, message: 'Server error updating balance' });
  }
});

module.exports = router;