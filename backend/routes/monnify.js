const express = require('express');
const router = express.Router();
const axios = require('axios');
const User = require('../models/User');
const MonnifyAccount = require('../models/MonnifyAccount');
const { authenticate } = require('../middleware/auth');
const Wallet = require('../models/Wallet');

// Monnify Configuration
const MONNIFY_CONFIG = {
  apiKey: process.env.MONNIFY_API_KEY,
  secretKey: process.env.MONNIFY_SECRET_KEY,
  contractCode: process.env.MONNIFY_CONTRACT_CODE,
  baseUrl: process.env.MONNIFY_BASE_URL || 'https://sandbox.monnify.com'
};

// Validate Monnify configuration on load
console.log('🔍 Monnify Config Check:', {
  apiKey: MONNIFY_CONFIG.apiKey ? '✅ Set' : '❌ Missing',
  secretKey: MONNIFY_CONFIG.secretKey ? '✅ Set' : '❌ Missing',
  contractCode: MONNIFY_CONFIG.contractCode ? '✅ Set' : '❌ Missing',
  baseUrl: MONNIFY_CONFIG.baseUrl
});

// Get Monnify Access Token
const getMonnifyToken = async () => {
  try {
    const auth = Buffer.from(`${MONNIFY_CONFIG.apiKey}:${MONNIFY_CONFIG.secretKey}`).toString('base64');
    
    const response = await axios.post(
      `${MONNIFY_CONFIG.baseUrl}/api/v1/auth/login`,
      {},
      {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data.responseBody.accessToken;
  } catch (error) {
    console.error('❌ Monnify token error:', error.response?.data || error.message);
    throw new Error('Failed to get Monnify access token');
  }
};

// Helper function to generate varied account names
const generateAccountNames = (userName, bankName) => {
  const variations = [
    userName, // Original name
    userName.toUpperCase(), // Uppercase
    userName.split(' ').reverse().join(' '), // Reversed (LastName FirstName)
  ];
  
  // Return different variation based on bank
  const bankIndex = {
    'Moniepoint': 0,
    'Access Bank': 1,
    'Wema Bank': 2
  };
  
  return variations[bankIndex[bankName] || 0];
};

// 1. Create Reserved Account (with retry for multiple accounts)
router.post('/create-reserved-account', authenticate, async (req, res) => {
  try {
    console.log('📍 Create reserved account endpoint hit for user:', req.user.id);
    
    const userId = req.user.id;
    
    // Check if user already has an account
    const existingAccount = await MonnifyAccount.findOne({ userId });
    if (existingAccount) {
      console.log('✅ Account already exists for user:', userId);
      return res.status(200).json({
        success: true,
        message: 'Account already exists',
        data: {
          accounts: existingAccount.accounts,
          accountReference: existingAccount.accountReference
        }
      });
    }

    // Get user details
    const user = await User.findById(userId);
    if (!user) {
      console.error('❌ User not found:', userId);
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    console.log('🔍 Creating Monnify accounts for:', user.email);

    // Get Monnify token
    const accessToken = await getMonnifyToken();
    console.log('✅ Monnify access token obtained');

    // Strategy: Create accounts one by one to ensure all 3 are created
    const bankConfigs = [
      { code: "50515", name: "Moniepoint" },
      { code: "044", name: "Access Bank" },
      { code: "035", name: "Wema Bank" }
    ];

    let allAccounts = [];
    const accountReference = `USER_${userId}_${Date.now()}`;

    // Try creating with all banks first
    try {
      const requestBody = {
        accountReference: accountReference,
        accountName: user.name,
        currencyCode: "NGN",
        contractCode: MONNIFY_CONFIG.contractCode,
        customerEmail: user.email,
        customerName: user.name,
        getAllAvailableBanks: false,
        preferredBanks: ["50515", "044", "035"]
      };

      console.log('📤 Attempting to create all accounts at once...');

      const monnifyResponse = await axios.post(
        `${MONNIFY_CONFIG.baseUrl}/api/v2/bank-transfer/reserved-accounts`,
        requestBody,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const accountData = monnifyResponse.data.responseBody;
      allAccounts = accountData.accounts.map(acc => ({
        bankName: acc.bankName,
        bankCode: acc.bankCode,
        accountNumber: acc.accountNumber,
        accountName: acc.accountName
      }));

      console.log(`✅ Created ${allAccounts.length} accounts successfully`);

    } catch (error) {
      console.log('⚠️ Bulk creation failed, trying individual creation...');
      
      // If bulk creation fails, try creating accounts individually
      for (let i = 0; i < bankConfigs.length; i++) {
        try {
          const bank = bankConfigs[i];
          const individualRef = `${accountReference}_${bank.code}`;
          
          const requestBody = {
            accountReference: individualRef,
            accountName: generateAccountNames(user.name, bank.name),
            currencyCode: "NGN",
            contractCode: MONNIFY_CONFIG.contractCode,
            customerEmail: user.email,
            customerName: user.name,
            getAllAvailableBanks: false,
            preferredBanks: [bank.code]
          };

          console.log(`📤 Creating account for ${bank.name}...`);

          const response = await axios.post(
            `${MONNIFY_CONFIG.baseUrl}/api/v2/bank-transfer/reserved-accounts`,
            requestBody,
            {
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
              }
            }
          );

          const accountData = response.data.responseBody;
          if (accountData.accounts && accountData.accounts.length > 0) {
            allAccounts.push({
              bankName: accountData.accounts[0].bankName,
              bankCode: accountData.accounts[0].bankCode,
              accountNumber: accountData.accounts[0].accountNumber,
              accountName: accountData.accounts[0].accountName
            });
            console.log(`✅ Created ${bank.name} account successfully`);
          }

          // Small delay between requests
          await new Promise(resolve => setTimeout(resolve, 500));

        } catch (individualError) {
          console.error(`❌ Failed to create ${bankConfigs[i].name} account:`, 
            individualError.response?.data || individualError.message);
        }
      }
    }

    // Check if we got at least one account
    if (allAccounts.length === 0) {
      throw new Error('Failed to create any virtual accounts');
    }

    // Save to database
    const monnifyAccount = new MonnifyAccount({
      userId: userId,
      accountReference: accountReference,
      accounts: allAccounts,
      customerEmail: user.email,
      customerName: user.name
    });

    await monnifyAccount.save();
    console.log(`✅ ${allAccounts.length} account(s) saved to database`);

    // Log which banks were created
    const createdBanks = allAccounts.map(acc => acc.bankName).join(', ');
    console.log(`📋 Created accounts for: ${createdBanks}`);

    res.status(201).json({
      success: true,
      message: `${allAccounts.length} virtual account(s) created successfully`,
      data: {
        accounts: allAccounts,
        accountReference: accountReference,
        totalAccounts: allAccounts.length
      }
    });

  } catch (error) {
    console.error('❌ Create account error:', error.response?.data || error.message);
    console.error('❌ Stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to create virtual account',
      error: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message
    });
  }
});

// 2. Get User's Accounts
router.get('/user-accounts', authenticate, async (req, res) => {
  try {
    console.log('📍 Get user accounts endpoint hit for user:', req.user.id);
    
    const userId = req.user.id;
    
    const monnifyAccount = await MonnifyAccount.findOne({ userId });
    
    if (!monnifyAccount) {
      console.log('⚠️ No accounts found for user:', userId);
      return res.status(404).json({
        success: false,
        message: 'No virtual accounts found. Create one first.'
      });
    }

    console.log('✅ Accounts found for user:', userId);
    console.log(`📊 Total accounts: ${monnifyAccount.accounts.length}`);

    res.status(200).json({
      success: true,
      data: {
        accounts: monnifyAccount.accounts,
        accountReference: monnifyAccount.accountReference,
        totalAccounts: monnifyAccount.accounts.length
      }
    });

  } catch (error) {
    console.error('❌ Get accounts error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve accounts'
    });
  }
});

// 3. Webhook - Receive Payment Notifications
router.post('/webhook', async (req, res) => {
  try {
    console.log('📩 Monnify Webhook received at:', new Date().toISOString());
    console.log('🔍 FULL WEBHOOK BODY:', JSON.stringify(req.body, null, 2));

    // Extract data from eventData
    const eventData = req.body.eventData || req.body;
    const product = eventData.product || {};
    
    const {
      transactionReference,
      paymentReference,
      amountPaid,
      paidOn,
      paymentStatus,
      destinationAccountInformation
    } = eventData;

    const accountReference = product.reference;
    const accountNumber = destinationAccountInformation?.accountNumber;

    console.log('🔍 Extracted data:');
    console.log('   Payment Status:', paymentStatus);
    console.log('   Amount:', amountPaid);
    console.log('   Account Reference:', accountReference);
    console.log('   Account Number:', accountNumber);

    if (paymentStatus !== 'PAID') {
      console.log('⚠️ Payment not completed. Status:', paymentStatus);
      return res.status(200).json({ message: 'Payment not completed yet' });
    }

    console.log('💰 Payment confirmed - searching for account...');

    // Find Monnify account
    let monnifyAccount = null;
    
    if (accountNumber) {
      console.log('🔍 Searching by account number:', accountNumber);
      monnifyAccount = await MonnifyAccount.findOne({
        'accounts.accountNumber': accountNumber
      });
      
      if (monnifyAccount) {
        console.log('✅ Account found by account number for user:', monnifyAccount.userId);
      }
    }

    if (!monnifyAccount && accountReference) {
      console.log('🔍 Searching by account reference:', accountReference);
      monnifyAccount = await MonnifyAccount.findOne({ accountReference });
    }

    if (!monnifyAccount) {
      console.error('❌ Account not found');
      return res.status(404).json({ message: 'Account not found' });
    }

    // Find Balance document (THIS IS THE KEY CHANGE)
    const balance = await Balance.findOne({ userId: monnifyAccount.userId });
    
    if (!balance) {
      console.error('❌ Balance document not found for user:', monnifyAccount.userId);
      return res.status(404).json({ message: 'Balance document not found' });
    }

    // Check for duplicate transaction
    const isDuplicate = balance.transactions?.some(
      t => t.reference === transactionReference
    );
    
    if (isDuplicate) {
      console.log('⚠️ Duplicate transaction detected:', transactionReference);
      return res.status(200).json({ 
        success: true, 
        message: 'Transaction already processed' 
      });
    }

    // Update Balance document
    const previousBalance = balance.balance;
    const creditAmount = parseFloat(amountPaid);
    balance.balance += creditAmount;
    balance.lastTransactionDate = new Date();
    
    // Update stats if they exist
    if (balance.stats) {
      balance.stats.totalDeposits = (balance.stats.totalDeposits || 0) + creditAmount;
      balance.stats.depositCount = (balance.stats.depositCount || 0) + 1;
    }
    
    await balance.save();

    console.log('✅ ========== WALLET CREDITED SUCCESSFULLY ==========');
    console.log(`   User ID: ${monnifyAccount.userId}`);
    console.log(`   Amount Credited: ₦${creditAmount.toLocaleString()}`);
    console.log(`   Previous Balance: ₦${previousBalance.toLocaleString()}`);
    console.log(`   New Balance: ₦${balance.balance.toLocaleString()}`);
    console.log(`   Transaction Ref: ${transactionReference}`);
    console.log(`   Account Number Used: ${accountNumber}`);
    console.log('===================================================');

    res.status(200).json({
      success: true,
      message: 'Webhook processed successfully',
      data: {
        userId: monnifyAccount.userId,
        newBalance: balance.balance,
        creditedAmount: creditAmount
      }
    });

  } catch (error) {
    console.error('❌ WEBHOOK ERROR:', error.message);
    console.error('Stack:', error.stack);
    
    res.status(500).json({
      success: false,
      message: 'Webhook processing failed',
      error: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message
    });
  }
});

// 4. Verify Payment (Manual check)
router.get('/verify/:reference', authenticate, async (req, res) => {
  try {
    console.log('📍 Verify payment endpoint hit for reference:', req.params.reference);
    
    const { reference } = req.params;
    
    const accessToken = await getMonnifyToken();

    const response = await axios.get(
      `${MONNIFY_CONFIG.baseUrl}/api/v2/transactions/${encodeURIComponent(reference)}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      }
    );

    const transactionData = response.data.responseBody;
    console.log('✅ Payment verification successful:', transactionData.paymentStatus);

    res.status(200).json({
      success: true,
      data: transactionData
    });

  } catch (error) {
    console.error('❌ Verify payment error:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to verify payment'
    });
  }
});

// Test endpoint to verify route is working
router.get('/test', (req, res) => {
  console.log('📍 Monnify test endpoint hit');
  res.json({
    success: true,
    message: 'Monnify routes are working!',
    timestamp: new Date().toISOString(),
    routes: [
      'POST /api/monnify/create-reserved-account',
      'GET /api/monnify/user-accounts',
      'POST /api/monnify/webhook',
      'GET /api/monnify/verify/:reference',
      'GET /api/monnify/test'
    ]
  });
});

// Debug endpoint - Test Monnify connection
router.get('/debug-monnify', async (req, res) => {
  try {
    console.log('🔍 Testing Monnify credentials...');
    
    const auth = Buffer.from(
      `${MONNIFY_CONFIG.apiKey}:${MONNIFY_CONFIG.secretKey}`
    ).toString('base64');
    
    console.log('API Key:', MONNIFY_CONFIG.apiKey);
    console.log('Secret Key:', MONNIFY_CONFIG.secretKey?.substring(0, 10) + '...');
    console.log('Contract Code:', MONNIFY_CONFIG.contractCode);
    console.log('Base URL:', MONNIFY_CONFIG.baseUrl);
    
    const response = await axios.post(
      `${MONNIFY_CONFIG.baseUrl}/api/v1/auth/login`,
      {},
      {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('✅ Monnify login successful!');
    
    res.json({
      success: true,
      message: 'Monnify credentials are valid!',
      token: 'Token received successfully'
    });
    
  } catch (error) {
    console.error('❌ Monnify login failed!');
    console.error('Status:', error.response?.status);
    console.error('Error data:', error.response?.data);
    
    res.status(500).json({
      success: false,
      message: 'Monnify login failed',
      error: error.response?.data || error.message,
      status: error.response?.status
    });
  }
});

// Delete account endpoint
router.delete('/delete-my-account', authenticate, async (req, res) => {
  try {
    const result = await MonnifyAccount.deleteOne({ userId: req.user.id });
    res.json({ 
      success: true, 
      message: 'Account deleted', 
      deletedCount: result.deletedCount 
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Log all registered routes
console.log('✅ Monnify routes initialized:');
console.log('   POST /create-reserved-account');
console.log('   GET /user-accounts');
console.log('   POST /webhook');
console.log('   GET /verify/:reference');
console.log('   GET /test');

module.exports = router;