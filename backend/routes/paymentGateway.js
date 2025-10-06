const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const MonnifyAccount = require('../models/MonnifyAccount');
const PaystackAccount = require('../models/PaystackAccount');

// Payment Gateway Configuration
// Change this to switch between providers: 'monnify' or 'paystack'
const ACTIVE_GATEWAY = process.env.ACTIVE_PAYMENT_GATEWAY || 'paystack';

console.log(`💳 Active Payment Gateway: ${ACTIVE_GATEWAY.toUpperCase()}`);

// Get user's virtual account (automatically selects based on active gateway)
router.get('/virtual-account', authenticate, async (req, res) => {
  try {
    console.log(`📍 Fetching ${ACTIVE_GATEWAY} account for user:`, req.user.id);
    
    let accountData;

    if (ACTIVE_GATEWAY === 'paystack') {
      const paystackAccount = await PaystackAccount.findOne({ userId: req.user.id });
      
      if (!paystackAccount) {
        return res.status(404).json({
          success: false,
          message: 'No Paystack virtual account found',
          gateway: 'paystack'
        });
      }

      accountData = {
        gateway: 'paystack',
        accountNumber: paystackAccount.accountNumber,
        accountName: paystackAccount.accountName,
        bankName: paystackAccount.bankName,
        accounts: [{
          accountNumber: paystackAccount.accountNumber,
          accountName: paystackAccount.accountName,
          bankName: paystackAccount.bankName
        }]
      };

    } else if (ACTIVE_GATEWAY === 'monnify') {
      const monnifyAccount = await MonnifyAccount.findOne({ userId: req.user.id });
      
      if (!monnifyAccount) {
        return res.status(404).json({
          success: false,
          message: 'No Monnify virtual accounts found',
          gateway: 'monnify'
        });
      }

      accountData = {
        gateway: 'monnify',
        accounts: monnifyAccount.accounts,
        accountReference: monnifyAccount.accountReference,
        totalAccounts: monnifyAccount.accounts.length
      };
    }

    res.status(200).json({
      success: true,
      data: accountData
    });

  } catch (error) {
    console.error('❌ Get virtual account error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve virtual account'
    });
  }
});

// Get all payment accounts (both Monnify and Paystack)
router.get('/all-accounts', authenticate, async (req, res) => {
  try {
    console.log('📍 Fetching all payment accounts for user:', req.user.id);
    
    const monnifyAccount = await MonnifyAccount.findOne({ userId: req.user.id });
    const paystackAccount = await PaystackAccount.findOne({ userId: req.user.id });

    const allAccounts = {
      monnify: monnifyAccount ? {
        exists: true,
        accounts: monnifyAccount.accounts,
        accountReference: monnifyAccount.accountReference
      } : { exists: false },
      paystack: paystackAccount ? {
        exists: true,
        accountNumber: paystackAccount.accountNumber,
        accountName: paystackAccount.accountName,
        bankName: paystackAccount.bankName
      } : { exists: false },
      activeGateway: ACTIVE_GATEWAY
    };

    res.status(200).json({
      success: true,
      data: allAccounts
    });

  } catch (error) {
    console.error('❌ Get all accounts error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve payment accounts'
    });
  }
});

// Get active gateway info
router.get('/active-gateway', (req, res) => {
  res.json({
    success: true,
    activeGateway: ACTIVE_GATEWAY,
    availableGateways: ['monnify', 'paystack']
  });
});

console.log('✅ Payment Gateway routes initialized');
console.log(`   Active Gateway: ${ACTIVE_GATEWAY}`);

module.exports = router;