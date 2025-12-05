const express = require('express');
const router = express.Router();
const axios = require('axios');
const crypto = require('crypto');
const User = require('../models/User');
const PaystackAccount = require('../models/PaystackAccount');
const { authenticate } = require('../middleware/auth');
const Balance = require('../models/Balance');

// Paystack Configuration
const PAYSTACK_CONFIG = {
  secretKey: process.env.PAYSTACK_SECRET_KEY,
  publicKey: process.env.PAYSTACK_PUBLIC_KEY,
  baseUrl: 'https://api.paystack.co'
};

// Validate Paystack configuration on load
console.log('🔍 Paystack Config Check:', {
  secretKey: PAYSTACK_CONFIG.secretKey ? '✅ Set' : '❌ Missing',
  publicKey: PAYSTACK_CONFIG.publicKey ? '✅ Set' : '❌ Missing'
});

// 1. Create Dedicated Virtual Account
router.post('/create-virtual-account', authenticate, async (req, res) => {
  try {
    console.log('📍 Create Paystack virtual account for user:', req.user.id);
    
    const userId = req.user.id;
    
    // Check if user already has a Paystack account
    const existingAccount = await PaystackAccount.findOne({ userId });
    if (existingAccount) {
      console.log('✅ Paystack account already exists for user:', userId);
      return res.status(200).json({
        success: true,
        message: 'Virtual account already exists',
        data: existingAccount
      });
    }

    // Get user details
    const user = await User.findById(userId);
    if (!user) {
      console.error('❌ User not found:', userId);
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    console.log('🔍 Creating Paystack virtual account for:', user.email);

    // Step 1: Create or get customer
    let customerId;
    try {
      const customerResponse = await axios.post(
        `${PAYSTACK_CONFIG.baseUrl}/customer`,
        {
          email: user.email,
          first_name: user.name.split(' ')[0],
          last_name: user.name.split(' ').slice(1).join(' ') || user.name.split(' ')[0],
          phone: user.phone || ''
        },
        {
          headers: {
            'Authorization': `Bearer ${PAYSTACK_CONFIG.secretKey}`,
            'Content-Type': 'application/json'
          }
        }
      );
      customerId = customerResponse.data.data.customer_code;
      console.log('✅ Customer created/retrieved:', customerId);
    } catch (error) {
      // Customer might already exist, try to fetch
      if (error.response?.status === 400) {
        const fetchResponse = await axios.get(
          `${PAYSTACK_CONFIG.baseUrl}/customer/${user.email}`,
          {
            headers: {
              'Authorization': `Bearer ${PAYSTACK_CONFIG.secretKey}`
            }
          }
        );
        customerId = fetchResponse.data.data.customer_code;
        console.log('✅ Existing customer retrieved:', customerId);
      } else {
        throw error;
      }
    }

    // Step 2: Create dedicated virtual account
    const accountResponse = await axios.post(
      `${PAYSTACK_CONFIG.baseUrl}/dedicated_account`,
      {
        customer: customerId,
        preferred_bank: 'wema-bank' // or 'titan-paystack'
      },
      {
        headers: {
          'Authorization': `Bearer ${PAYSTACK_CONFIG.secretKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const accountData = accountResponse.data.data;
    console.log('✅ Paystack virtual account created:', accountData.account_number);

    // Save to database
    const paystackAccount = new PaystackAccount({
      userId: userId,
      customerId: customerId,
      accountNumber: accountData.account_number,
      accountName: accountData.account_name,
      bankName: accountData.bank.name,
      bankCode: accountData.bank.id,
      accountReference: accountData.id,
      customerEmail: user.email,
      customerName: user.name,
      isActive: true
    });

    await paystackAccount.save();
    console.log('✅ Paystack account saved to database');

    res.status(201).json({
      success: true,
      message: 'Paystack virtual account created successfully',
      data: {
        accountNumber: accountData.account_number,
        accountName: accountData.account_name,
        bankName: accountData.bank.name,
        customerId: customerId
      }
    });

  } catch (error) {
    console.error('❌ Create Paystack account error:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to create Paystack virtual account',
      error: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message
    });
  }
});

// 2. Get User's Paystack Account
router.get('/user-account', authenticate, async (req, res) => {
  try {
    console.log('📍 Get Paystack account for user:', req.user.id);
    
    const paystackAccount = await PaystackAccount.findOne({ userId: req.user.id });
    
    if (!paystackAccount) {
      console.log('⚠️ No Paystack account found for user:', req.user.id);
      return res.status(404).json({
        success: false,
        message: 'No Paystack virtual account found. Create one first.'
      });
    }

    console.log('✅ Paystack account found for user:', req.user.id);

    res.status(200).json({
      success: true,
      data: {
        accountNumber: paystackAccount.accountNumber,
        accountName: paystackAccount.accountName,
        bankName: paystackAccount.bankName,
        customerId: paystackAccount.customerId
      }
    });

  } catch (error) {
    console.error('❌ Get Paystack account error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve Paystack account'
    });
  }
});

router.post('/webhook', async (req, res) => {
  try {
    console.log('📩 Paystack Webhook received at:', new Date().toISOString());
    
    // Verify webhook signature
    const hash = crypto
      .createHmac('sha512', PAYSTACK_CONFIG.secretKey)
      .update(JSON.stringify(req.body))
      .digest('hex');

    if (hash !== req.headers['x-paystack-signature']) {
      console.error('❌ Invalid webhook signature');
      return res.status(400).json({ message: 'Invalid signature' });
    }

    const { event, data } = req.body;
    console.log('🔍 Webhook Event:', event);

    // Only process successful charge events
    if (event !== 'charge.success') {
      console.log('⚠️ Ignoring event:', event);
      return res.status(200).json({ message: 'Event ignored' });
    }

    console.log('🔍 FULL WEBHOOK DATA:', JSON.stringify(data, null, 2));

    const {
      reference,
      amount,
      customer,
      paid_at,
      channel
    } = data;

    // Amount is in kobo, convert to naira
    const amountInNaira = amount / 100;

    console.log('🔍 Extracted data:');
    console.log('   Amount: ₦', amountInNaira);
    console.log('   Reference:', reference);
    console.log('   Customer Email:', customer.email);
    console.log('   Channel:', channel);

    // Find Paystack account by customer email
    const paystackAccount = await PaystackAccount.findOne({
      customerEmail: customer.email
    });

    if (!paystackAccount) {
      console.error('❌ Paystack account not found for:', customer.email);
      return res.status(404).json({ message: 'Account not found' });
    }

    console.log('✅ Account found for user:', paystackAccount.userId);

    // Find Balance document
    const balance = await Balance.findOne({ userId: paystackAccount.userId });
    
    if (!balance) {
      console.error('❌ Balance document not found for user:', paystackAccount.userId);
      return res.status(404).json({ message: 'Balance document not found' });
    }

    // FIXED: Properly initialize transactions array if it doesn't exist
    if (!balance.transactions) {
      balance.transactions = [];
    }

    // Check for duplicate transaction
    const isDuplicate = balance.transactions.some(
      t => t.reference === reference
    );
    
    if (isDuplicate) {
      console.log('⚠️ Duplicate transaction detected:', reference);
      return res.status(200).json({ 
        success: true, 
        message: 'Transaction already processed' 
      });
    }

    // Update Balance
    const previousBalance = balance.balance;
    const creditAmount = parseFloat(amountInNaira);
    balance.balance += creditAmount;
    balance.lastTransactionDate = new Date(paid_at);
    
    // FIXED: Create and save transaction record
    const transaction = {
      type: 'credit',
      amount: creditAmount,
      reference: reference,
      description: `Wallet funding via Paystack (${channel})`,
      status: 'completed',
      gateway: 'paystack',
      channel: channel,
      previousBalance: previousBalance,
      newBalance: balance.balance,
      metadata: {
        customerEmail: customer.email,
        customerId: data.customer?.customer_code,
        paidAt: paid_at
      },
      date: new Date(paid_at)
    };

    balance.transactions.push(transaction);
    
    if (balance.stats) {
      balance.stats.totalDeposits = (balance.stats.totalDeposits || 0) + creditAmount;
      balance.stats.depositCount = (balance.stats.depositCount || 0) + 1;
    }
    
    await balance.save();

    console.log('✅ ========== WALLET CREDITED (PAYSTACK) ==========');
    console.log(`   User ID: ${paystackAccount.userId}`);
    console.log(`   Amount Credited: ₦${creditAmount.toLocaleString()}`);
    console.log(`   Previous Balance: ₦${previousBalance.toLocaleString()}`);
    console.log(`   New Balance: ₦${balance.balance.toLocaleString()}`);
    console.log(`   Transaction Ref: ${reference}`);
    console.log(`   Payment Channel: ${channel}`);
    console.log(`   Transaction Saved: YES ✅`);
    console.log('==================================================');

    res.status(200).json({
      success: true,
      message: 'Webhook processed successfully',
      data: {
        userId: paystackAccount.userId,
        newBalance: balance.balance,
        creditedAmount: creditAmount,
        transactionSaved: true
      }
    });

  } catch (error) {
    console.error('❌ PAYSTACK WEBHOOK ERROR:', error.message);
    console.error('Stack:', error.stack);
    
    res.status(500).json({
      success: false,
      message: 'Webhook processing failed',
      error: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message
    });
  }
});

// 4. Verify Transaction
router.get('/verify/:reference', authenticate, async (req, res) => {
  try {
    console.log('📍 Verify Paystack transaction:', req.params.reference);
    
    const { reference } = req.params;
    
    const response = await axios.get(
      `${PAYSTACK_CONFIG.baseUrl}/transaction/verify/${reference}`,
      {
        headers: {
          'Authorization': `Bearer ${PAYSTACK_CONFIG.secretKey}`
        }
      }
    );

    const transactionData = response.data.data;
    console.log('✅ Transaction verification successful:', transactionData.status);

    res.status(200).json({
      success: true,
      data: {
        status: transactionData.status,
        amount: transactionData.amount / 100,
        reference: transactionData.reference,
        paidAt: transactionData.paid_at
      }
    });

  } catch (error) {
    console.error('❌ Verify transaction error:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to verify transaction'
    });
  }
});

// 5. Initialize Payment (for manual payments)
router.post('/initialize-payment', authenticate, async (req, res) => {
  try {
    const { amount } = req.body; // Amount in Naira
    const user = await User.findById(req.user.id);

    const response = await axios.post(
      `${PAYSTACK_CONFIG.baseUrl}/transaction/initialize`,
      {
        email: user.email,
        amount: amount * 100, // Convert to kobo
        callback_url: `${process.env.FRONTEND_URL}/payment/callback`,
        metadata: {
          userId: user._id,
          purpose: 'wallet_funding'
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${PAYSTACK_CONFIG.secretKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    res.status(200).json({
      success: true,
      data: {
        authorizationUrl: response.data.data.authorization_url,
        reference: response.data.data.reference,
        accessCode: response.data.data.access_code
      }
    });

  } catch (error) {
    console.error('❌ Initialize payment error:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to initialize payment'
    });
  }
});

// Test endpoint
router.get('/test', (req, res) => {
  console.log('📍 Paystack test endpoint hit');
  res.json({
    success: true,
    message: 'Paystack routes are working!',
    timestamp: new Date().toISOString(),
    routes: [
      'POST /api/paystack/create-virtual-account',
      'GET /api/paystack/user-account',
      'POST /api/paystack/webhook',
      'GET /api/paystack/verify/:reference',
      'POST /api/paystack/initialize-payment',
      'GET /api/paystack/test'
    ]
  });
});

console.log('✅ Paystack routes initialized');

// Replace your existing health check code in routes/paystack.js with this:

// Immediate + Periodic Health Check
let healthCheckInterval = null;

const runHealthCheck = async () => {
  try {
    console.log('🏥 Paystack Health Check:', new Date().toISOString());
    
    // Check configuration
    const configStatus = {
      secretKey: !!PAYSTACK_CONFIG.secretKey,
      publicKey: !!PAYSTACK_CONFIG.publicKey,
      baseUrl: PAYSTACK_CONFIG.baseUrl
    };
    
    console.log('📊 Paystack Config Status:', configStatus);
    
    // Check database connection
    const accountCount = await PaystackAccount.countDocuments();
    console.log('💾 Total Paystack accounts in DB:', accountCount);
    
    // Optional: Ping Paystack API to verify keys
    if (PAYSTACK_CONFIG.secretKey) {
      try {
        const response = await axios.get(
          `${PAYSTACK_CONFIG.baseUrl}/bank`,
          {
            headers: {
              'Authorization': `Bearer ${PAYSTACK_CONFIG.secretKey}`
            },
            timeout: 5000
          }
        );
        console.log('✅ Paystack API: Reachable and responding');
        console.log('📋 Available banks:', response.data.data?.length || 0);
      } catch (apiError) {
        if (apiError.response?.status === 401) {
          console.log('⚠️ Paystack API: Invalid API key (401 Unauthorized)');
        } else if (apiError.code === 'ECONNABORTED') {
          console.log('⚠️ Paystack API: Request timeout');
        } else {
          console.log('⚠️ Paystack API: Connection issue -', apiError.message);
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Paystack health check error:', error.message);
  }
};

const startHealthCheck = () => {
  if (healthCheckInterval) return; // Prevent multiple intervals
  
  console.log('🔄 Starting Paystack health monitoring...');
  
  // Run immediately on startup
  runHealthCheck();
  
  // Then run every 5 minutes
  healthCheckInterval = setInterval(runHealthCheck, 5 * 60 * 1000);
  
  console.log('✅ Paystack health checks: Immediate + Every 5 minutes');
};

// Start health checks
startHealthCheck();

console.log('✅ Paystack routes initialized with health monitoring');

module.exports = router;