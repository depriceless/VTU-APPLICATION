const express = require('express');
const router = express.Router();
const axios = require('axios');
const { authenticate } = require('../middleware/auth');
const MonnifyAccount = require('../models/MonnifyAccount');
const PaystackAccount = require('../models/PaystackAccount');
const PaymentGatewayConfig = require('../models/PaymentGatewayConfig');
const User = require('../models/User');

console.log('💳 Payment Gateway routes initializing...');

// Paystack Configuration
const PAYSTACK_CONFIG = {
  secretKey: process.env.PAYSTACK_SECRET_KEY,
  publicKey: process.env.PAYSTACK_PUBLIC_KEY,
  baseUrl: 'https://api.paystack.co'
};

// Monnify Configuration
const MONNIFY_CONFIG = {
  apiKey: process.env.MONNIFY_API_KEY,
  secretKey: process.env.MONNIFY_SECRET_KEY,
  contractCode: process.env.MONNIFY_CONTRACT_CODE,
  baseUrl: process.env.MONNIFY_BASE_URL || 'https://sandbox.monnify.com'
};

// Debug configuration
console.log('🔍 Payment Gateway Configuration Check:');
console.log('   Paystack Secret Key:', PAYSTACK_CONFIG.secretKey ? '✅ Set' : '❌ Missing');
console.log('   Paystack Public Key:', PAYSTACK_CONFIG.publicKey ? '✅ Set' : '❌ Missing');
console.log('   Monnify API Key:', MONNIFY_CONFIG.apiKey ? '✅ Set' : '❌ Missing');
console.log('   Monnify Secret Key:', MONNIFY_CONFIG.secretKey ? '✅ Set' : '❌ Missing');

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

// Helper function to generate varied account names for Monnify
const generateAccountNames = (userName, bankName) => {
  const variations = [
    userName,
    userName.toUpperCase(),
    userName.split(' ').reverse().join(' '),
  ];
  
  const bankIndex = {
    'Moniepoint': 0,
    'Access Bank': 1,
    'Wema Bank': 2
  };
  
  return variations[bankIndex[bankName] || 0];
};

// Helper function to create Paystack account
async function createPaystackAccount(userId) {
  console.log('🔄 Auto-creating Paystack account for user:', userId);
  
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
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
      console.log('✅ Customer created:', customerId);
    } catch (error) {
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
        preferred_bank: 'wema-bank'
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

    return paystackAccount;

  } catch (error) {
    console.error('❌ Auto-create Paystack account error:', error.response?.data || error.message);
    throw error;
  }
}

// Helper function to create Monnify account
async function createMonnifyAccount(userId) {
  console.log('🔄 Auto-creating Monnify account for user:', userId);
  
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    console.log('🔍 Creating Monnify accounts for:', user.email);

    const accessToken = await getMonnifyToken();
    console.log('✅ Monnify access token obtained');

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

      console.log('📤 Attempting to create all Monnify accounts at once...');

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

      console.log(`✅ Created ${allAccounts.length} Monnify accounts successfully`);

    } catch (error) {
      console.log('⚠️ Bulk creation failed, trying individual creation...');
      
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

          await new Promise(resolve => setTimeout(resolve, 500));

        } catch (individualError) {
          console.error(`❌ Failed to create ${bankConfigs[i].name} account:`, 
            individualError.response?.data || individualError.message);
        }
      }
    }

    if (allAccounts.length === 0) {
      throw new Error('Failed to create any Monnify virtual accounts');
    }

    const monnifyAccount = new MonnifyAccount({
      userId: userId,
      accountReference: accountReference,
      accounts: allAccounts,
      customerEmail: user.email,
      customerName: user.name
    });

    await monnifyAccount.save();
    console.log(`✅ ${allAccounts.length} Monnify account(s) saved to database`);

    const createdBanks = allAccounts.map(acc => acc.bankName).join(', ');
    console.log(`📋 Created accounts for: ${createdBanks}`);

    return monnifyAccount;

  } catch (error) {
    console.error('❌ Auto-create Monnify account error:', error.response?.data || error.message);
    throw error;
  }
}

// ROUTE 1: Get active gateway info (NO AUTHENTICATION REQUIRED)
router.get('/active-gateway', async (req, res) => {
  try {
    console.log('🔍 [Active Gateway] Request received');
    
    const config = await PaymentGatewayConfig.getConfig();
    
    console.log('🔍 [Active Gateway] Config retrieved:', {
      activeGateway: config.activeGateway,
      configId: config._id
    });
    
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
      message: 'Failed to get active gateway',
      error: process.env.NODE_ENV === 'production' ? undefined : error.message
    });
  }
});

// ROUTE 2: Get user's virtual account (with auto-creation)
router.get('/virtual-account', authenticate, async (req, res) => {
  try {
    const config = await PaymentGatewayConfig.getConfig();
    const ACTIVE_GATEWAY = config.activeGateway;
    
    console.log(`📍 Fetching ${ACTIVE_GATEWAY} account for user:`, req.user.id);
    
    let accountData;

    if (ACTIVE_GATEWAY === 'paystack') {
      let paystackAccount = await PaystackAccount.findOne({ userId: req.user.id });
      
      if (!paystackAccount) {
        console.log('⚠️ No Paystack account found. Auto-creating...');
        try {
          paystackAccount = await createPaystackAccount(req.user.id);
          console.log('✅ Paystack account auto-created successfully');
        } catch (createError) {
          console.error('❌ Failed to auto-create Paystack account:', createError.message);
          return res.status(500).json({
            success: false,
            message: 'Failed to create Paystack virtual account',
            gateway: 'paystack',
            error: process.env.NODE_ENV === 'production' ? undefined : createError.message
          });
        }
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
      let monnifyAccount = await MonnifyAccount.findOne({ userId: req.user.id });
      
      if (!monnifyAccount) {
        console.log('⚠️ No Monnify account found. Auto-creating...');
        try {
          monnifyAccount = await createMonnifyAccount(req.user.id);
          console.log('✅ Monnify account auto-created successfully');
        } catch (createError) {
          console.error('❌ Failed to auto-create Monnify account:', createError.message);
          return res.status(500).json({
            success: false,
            message: 'Failed to create Monnify virtual accounts',
            gateway: 'monnify',
            error: process.env.NODE_ENV === 'production' ? undefined : createError.message
          });
        }
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
      message: 'Failed to retrieve virtual account',
      error: process.env.NODE_ENV === 'production' ? undefined : error.message
    });
  }
});

// ROUTE 3: Get all payment accounts
router.get('/all-accounts', authenticate, async (req, res) => {
  try {
    console.log('📍 Fetching all payment accounts for user:', req.user.id);
    
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
      message: 'Failed to retrieve payment accounts',
      error: process.env.NODE_ENV === 'production' ? undefined : error.message
    });
  }
});

// ROUTE 4: Test endpoint
router.get('/test', (req, res) => {
  console.log('📍 Payment routes test endpoint hit');
  res.json({
    success: true,
    message: 'Payment routes are working!',
    timestamp: new Date().toISOString(),
    routes: [
      'GET /api/payment/active-gateway',
      'GET /api/payment/virtual-account (requires auth)',
      'GET /api/payment/all-accounts (requires auth)',
      'GET /api/payment/test'
    ]
  });
});

console.log('✅ Payment Gateway routes initialized');
console.log('   📋 Available routes:');
console.log('      GET /api/payment/active-gateway');
console.log('      GET /api/payment/virtual-account (auth required)');
console.log('      GET /api/payment/all-accounts (auth required)');
console.log('      GET /api/payment/test');

module.exports = router;