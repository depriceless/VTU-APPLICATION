const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const MonnifyAccount = require('../models/MonnifyAccount');
const PaystackAccount = require('../models/PaystackAccount');
const PaymentGatewayConfig = require('../models/PaymentGatewayConfig');

console.log('💳 Payment Gateway routes initializing...');

// Get user's virtual account (automatically selects based on active gateway)
router.get('/virtual-account', authenticate, async (req, res) => {
  try {
    // Get active gateway from database instead of env variable
    const config = await PaymentGatewayConfig.getConfig();
    const ACTIVE_GATEWAY = config.activeGateway;
    
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
    
    // Get active gateway from database
    const config = await PaymentGatewayConfig.getConfig();
    const ACTIVE_GATEWAY = config.activeGateway;
    
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
router.get('/active-gateway', async (req, res) => {
  try {
    // Get active gateway from database
    const config = await PaymentGatewayConfig.getConfig();
    
    res.json({
      success: true,
      activeGateway: config.activeGateway,
      availableGateways: ['monnify', 'paystack'],
      gateways: {
        paystack: {
          enabled: config.gateways.paystack.enabled,
          configured: !!(config.gateways.paystack.publicKey && config.gateways.paystack.secretKey)
        },
        monnify: {
          enabled: config.gateways.monnify.enabled,
          configured: !!(config.gateways.monnify.apiKey && config.gateways.monnify.secretKey)
        }
      }
    });
  } catch (error) {
    console.error('❌ Get active gateway error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get active gateway'
    });
  }
});

console.log('✅ Payment Gateway routes initialized');

module.exports = router;