const express = require('express');
const router = express.Router();
const axios = require('axios');
const User = require('../models/User');
const PaystackAccount = require('../models/PaystackAccount');
const MonnifyAccount = require('../models/MonnifyAccount');
const { authenticate } = require('../middleware/auth');

const ACTIVE_GATEWAY = process.env.ACTIVE_PAYMENT_GATEWAY || 'monnify';

const PAYSTACK_CONFIG = {
  secretKey: process.env.PAYSTACK_SECRET_KEY,
  publicKey: process.env.PAYSTACK_PUBLIC_KEY,
  baseUrl: 'https://api.paystack.co'
};

const MONNIFY_CONFIG = {
  apiKey: process.env.MONNIFY_API_KEY,
  secretKey: process.env.MONNIFY_SECRET_KEY,
  contractCode: process.env.MONNIFY_CONTRACT_CODE,
  baseUrl: process.env.MONNIFY_BASE_URL || 'https://api.monnify.com'
};

console.log('💳 Active Payment Gateway:', ACTIVE_GATEWAY);
console.log('🔑 Paystack Key loaded:', {
  hasKey: !!PAYSTACK_CONFIG.secretKey,
  keyPrefix: PAYSTACK_CONFIG.secretKey ? PAYSTACK_CONFIG.secretKey.substring(0, 8) : 'MISSING',
  keyLength: PAYSTACK_CONFIG.secretKey ? PAYSTACK_CONFIG.secretKey.length : 0
});
console.log('🔑 Monnify Config loaded:', {
  hasApiKey: !!MONNIFY_CONFIG.apiKey,
  hasSecretKey: !!MONNIFY_CONFIG.secretKey,
  hasContractCode: !!MONNIFY_CONFIG.contractCode
});

// Get Monnify access token
async function getMonnifyToken() {
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
}

async function createMonnifyAccount(user) {
  console.log('🔧 Creating Monnify reserved account for:', user.email);

  const token = await getMonnifyToken();
  console.log('✅ Monnify token obtained');

  const accountResponse = await axios.post(
    `${MONNIFY_CONFIG.baseUrl}/api/v2/bank-transfer/reserved-accounts`,
    {
      accountReference: `${user._id}_${Date.now()}`,
      accountName: user.name,
      currencyCode: 'NGN',
      contractCode: MONNIFY_CONFIG.contractCode,
      customerEmail: user.email,
      customerName: user.name,
      getAllAvailableBanks: true
    },
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }
  );

  const accountData = accountResponse.data.responseBody;

  const monnifyAccount = new MonnifyAccount({
    userId: user._id,
    accountReference: accountData.accountReference,
    accountName: accountData.accountName,
    customerEmail: accountData.customerEmail,
    customerName: accountData.customerName,
    accounts: accountData.accounts.map(acc => ({
      bankCode: acc.bankCode,
      bankName: acc.bankName,
      accountNumber: acc.accountNumber
    })),
    collectionChannel: accountData.collectionChannel,
    reservationReference: accountData.reservationReference,
    reservedAccountType: accountData.reservedAccountType,
    status: accountData.status,
    createdOn: accountData.createdOn
  });

  await monnifyAccount.save();
  console.log('✅ Monnify account created:', accountData.accounts.length, 'bank accounts');

  return {
    gateway: 'monnify',
    accounts: accountData.accounts,
    accountReference: accountData.accountReference
  };
}

async function createPaystackAccount(user) {
  console.log('🔧 Creating Paystack account for:', user.email);

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
    if (error.response?.status === 400 && error.response?.data?.message?.includes('Customer already exists')) {
      console.log('ℹ️ Customer exists, fetching existing customer...');
      const fetchResponse = await axios.get(
        `${PAYSTACK_CONFIG.baseUrl}/customer/${user.email}`,
        {
          headers: {
            'Authorization': `Bearer ${PAYSTACK_CONFIG.secretKey}`
          }
        }
      );
      customerId = fetchResponse.data.data.customer_code;
      console.log('✅ Existing customer found:', customerId);
    } else {
      console.error('❌ Customer creation error:', error.response?.data || error.message);
      throw error;
    }
  }

  console.log('🔧 Creating dedicated account...');
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

  const paystackAccount = new PaystackAccount({
    userId: user._id,
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
  console.log('✅ Paystack account created and saved:', accountData.account_number);

  return {
    accountNumber: accountData.account_number,
    accountName: accountData.account_name,
    bankName: accountData.bank.name,
    gateway: 'paystack'
  };
}

router.get('/virtual-account', authenticate, async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    console.log('📍 Fetching virtual account for user:', userId);

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (ACTIVE_GATEWAY === 'monnify') {
      let monnifyAccount = await MonnifyAccount.findOne({ userId });

      if (!monnifyAccount) {
        console.log('⚠️ No Monnify account found. Creating new account...');
        
        try {
          const accountData = await createMonnifyAccount(user);
          
          return res.status(201).json({
            success: true,
            message: 'Virtual account created successfully',
            data: accountData
          });
        } catch (createError) {
          console.error('❌ Failed to create Monnify account:', createError.message);
          console.error('❌ Error details:', createError.response?.data || createError);
          return res.status(500).json({
            success: false,
            message: 'Failed to create virtual account',
            error: createError.response?.data?.responseMessage || createError.message
          });
        }
      }

      console.log('✅ Returning existing Monnify account');
      return res.status(200).json({
        success: true,
        data: {
          gateway: 'monnify',
          accounts: monnifyAccount.accounts,
          accountReference: monnifyAccount.accountReference,
          totalAccounts: monnifyAccount.accounts.length
        }
      });
    }

    if (ACTIVE_GATEWAY === 'paystack') {
      let paystackAccount = await PaystackAccount.findOne({ userId });

      if (!paystackAccount) {
        console.log('⚠️ No account found. Creating new account...');
        
        try {
          const accountData = await createPaystackAccount(user);
          
          return res.status(201).json({
            success: true,
            message: 'Virtual account created successfully',
            data: {
              ...accountData,
              accounts: [{
                accountNumber: accountData.accountNumber,
                accountName: accountData.accountName,
                bankName: accountData.bankName
              }]
            }
          });
        } catch (createError) {
          console.error('❌ Failed to create account:', createError.message);
          console.error('❌ Error details:', createError.response?.data || createError);
          return res.status(500).json({
            success: false,
            message: 'Failed to create virtual account',
            error: createError.response?.data?.message || createError.message
          });
        }
      }

      console.log('✅ Returning existing account');
      return res.status(200).json({
        success: true,
        data: {
          gateway: 'paystack',
          accountNumber: paystackAccount.accountNumber,
          accountName: paystackAccount.accountName,
          bankName: paystackAccount.bankName,
          accounts: [{
            accountNumber: paystackAccount.accountNumber,
            accountName: paystackAccount.accountName,
            bankName: paystackAccount.bankName
          }]
        }
      });
    }

    return res.status(400).json({
      success: false,
      message: 'Gateway not configured'
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to process request',
      error: error.message
    });
  }
});

router.get('/active-gateway', (req, res) => {
  res.json({
    success: true,
    activeGateway: ACTIVE_GATEWAY
  });
});

console.log('✅ Payment Gateway routes initialized');

module.exports = router;