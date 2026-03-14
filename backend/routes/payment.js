// routes/payment.js
const express = require('express');
const router = express.Router();
const axios = require('axios');
const rateLimit = require('express-rate-limit');
const { authenticate } = require('../middleware/auth');
const MonnifyAccount = require('../models/MonnifyAccount');
const PaystackAccount = require('../models/PaystackAccount');
const PaymentGatewayConfig = require('../models/PaymentGatewayConfig');
const User = require('../models/User');
const { logger } = require('../utils/logger');

// ── Rate limiter for fetching virtual account (loose) ──────────
// Allows frequent dashboard loads without triggering 429
const virtualAccountFetchLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30,             // 30 requests per minute — well above any normal usage
  message: { success: false, message: 'Too many requests. Please try again shortly.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ── Rate limiter for account creation only (strict) ────────────
// Applied only when no account exists and one needs to be created
const accountCreationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: { success: false, message: 'Too many account creation attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ── Payment config (read from env only) ───────────────────────
const PAYSTACK_CONFIG = {
  secretKey: process.env.PAYSTACK_SECRET_KEY,
  publicKey: process.env.PAYSTACK_PUBLIC_KEY,
  baseUrl:   'https://api.paystack.co',
};

const MONNIFY_CONFIG = {
  apiKey:       process.env.MONNIFY_API_KEY,
  secretKey:    process.env.MONNIFY_SECRET_KEY,
  contractCode: process.env.MONNIFY_CONTRACT_CODE,
  baseUrl:      process.env.MONNIFY_BASE_URL || 'https://sandbox.monnify.com',
};

if (!PAYSTACK_CONFIG.secretKey) logger.warn('PAYSTACK_SECRET_KEY is not set');
if (!MONNIFY_CONFIG.apiKey)     logger.warn('MONNIFY_API_KEY is not set');
if (!MONNIFY_CONFIG.secretKey)  logger.warn('MONNIFY_SECRET_KEY is not set');

// ── Get Monnify access token ───────────────────────────────────
const getMonnifyToken = async () => {
  try {
    const auth = Buffer.from(`${MONNIFY_CONFIG.apiKey}:${MONNIFY_CONFIG.secretKey}`).toString('base64');
    const response = await axios.post(
      `${MONNIFY_CONFIG.baseUrl}/api/v1/auth/login`,
      {},
      { headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' } }
    );
    return response.data.responseBody.accessToken;
  } catch (error) {
    logger.error('Failed to get Monnify access token', error.message);
    throw new Error('Failed to get Monnify access token');
  }
};

// ── Account name variant helper ────────────────────────────────
const generateAccountNames = (userName, bankName) => {
  const variations = [
    userName,
    userName.toUpperCase(),
    userName.split(' ').reverse().join(' '),
  ];
  const bankIndex = { Moniepoint: 0, 'Access Bank': 1, 'Wema Bank': 2 };
  return variations[bankIndex[bankName] || 0];
};

// ── Create Paystack virtual account ───────────────────────────
async function createPaystackAccount(userId) {
  try {
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

    let customerId;
    try {
      const customerResponse = await axios.post(
        `${PAYSTACK_CONFIG.baseUrl}/customer`,
        {
          email:      user.email,
          first_name: user.name.split(' ')[0],
          last_name:  user.name.split(' ').slice(1).join(' ') || user.name.split(' ')[0],
          phone:      user.phone || '',
        },
        { headers: { Authorization: `Bearer ${PAYSTACK_CONFIG.secretKey}`, 'Content-Type': 'application/json' } }
      );
      customerId = customerResponse.data.data.customer_code;
    } catch (error) {
      if (error.response?.status === 400) {
        const fetchResponse = await axios.get(
          `${PAYSTACK_CONFIG.baseUrl}/customer/${user.email}`,
          { headers: { Authorization: `Bearer ${PAYSTACK_CONFIG.secretKey}` } }
        );
        customerId = fetchResponse.data.data.customer_code;
      } else {
        throw error;
      }
    }

    const accountResponse = await axios.post(
      `${PAYSTACK_CONFIG.baseUrl}/dedicated_account`,
      { customer: customerId, preferred_bank: 'wema-bank' },
      { headers: { Authorization: `Bearer ${PAYSTACK_CONFIG.secretKey}`, 'Content-Type': 'application/json' } }
    );

    const accountData = accountResponse.data.data;

    const paystackAccount = new PaystackAccount({
      userId,
      customerId,
      accountNumber:    accountData.account_number,
      accountName:      accountData.account_name,
      bankName:         accountData.bank.name,
      bankCode:         accountData.bank.id,
      accountReference: accountData.id,
      customerEmail:    user.email,
      customerName:     user.name,
      isActive:         true,
    });

    await paystackAccount.save();
    logger.success('Paystack virtual account created');
    return paystackAccount;
  } catch (error) {
    logger.error('Failed to create Paystack account', error.message);
    throw error;
  }
}

// ── Create Monnify virtual accounts ───────────────────────────
async function createMonnifyAccount(userId) {
  try {
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

    const accessToken      = await getMonnifyToken();
    const bankConfigs      = [
      { code: '50515', name: 'Moniepoint' },
      { code: '044',   name: 'Access Bank' },
      { code: '035',   name: 'Wema Bank' },
    ];
    let allAccounts        = [];
    const accountReference = `USER_${userId}_${Date.now()}`;

    try {
      const monnifyResponse = await axios.post(
        `${MONNIFY_CONFIG.baseUrl}/api/v2/bank-transfer/reserved-accounts`,
        {
          accountReference,
          accountName:         user.name,
          currencyCode:        'NGN',
          contractCode:        MONNIFY_CONFIG.contractCode,
          customerEmail:       user.email,
          customerName:        user.name,
          getAllAvailableBanks: false,
          preferredBanks:      ['50515', '044', '035'],
        },
        { headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' } }
      );

      allAccounts = monnifyResponse.data.responseBody.accounts.map(acc => ({
        bankName:      acc.bankName,
        bankCode:      acc.bankCode,
        accountNumber: acc.accountNumber,
        accountName:   acc.accountName,
      }));
    } catch {
      for (const bank of bankConfigs) {
        try {
          const individualRef = `${accountReference}_${bank.code}`;
          const response = await axios.post(
            `${MONNIFY_CONFIG.baseUrl}/api/v2/bank-transfer/reserved-accounts`,
            {
              accountReference: individualRef,
              accountName:      generateAccountNames(user.name, bank.name),
              currencyCode:     'NGN',
              contractCode:     MONNIFY_CONFIG.contractCode,
              customerEmail:    user.email,
              customerName:     user.name,
              getAllAvailableBanks: false,
              preferredBanks:   [bank.code],
            },
            { headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' } }
          );

          const accounts = response.data.responseBody.accounts;
          if (accounts?.length > 0) {
            allAccounts.push({
              bankName:      accounts[0].bankName,
              bankCode:      accounts[0].bankCode,
              accountNumber: accounts[0].accountNumber,
              accountName:   accounts[0].accountName,
            });
          }
          await new Promise((resolve) => setTimeout(resolve, 500));
        } catch (individualError) {
          logger.error(`Failed to create ${bank.name} account`, individualError.message);
        }
      }
    }

    if (allAccounts.length === 0) {
      throw new Error('Failed to create any Monnify virtual accounts');
    }

    const monnifyAccount = new MonnifyAccount({
      userId,
      accountReference,
      accounts:      allAccounts,
      customerEmail: user.email,
      customerName:  user.name,
    });

    await monnifyAccount.save();
    logger.success(`${allAccounts.length} Monnify account(s) created`);
    return monnifyAccount;
  } catch (error) {
    logger.error('Failed to create Monnify account', error.message);
    throw error;
  }
}

// ── ROUTE 1: Get active gateway ────────────────────────────────
router.get('/active-gateway', authenticate, async (req, res) => {
  try {
    const config = await PaymentGatewayConfig.getConfig();
    res.json({
      success:           true,
      activeGateway:     config.activeGateway,
      availableGateways: ['monnify', 'paystack'],
      gateways: {
        paystack: { enabled: config.gateways.paystack.enabled },
        monnify:  { enabled: config.gateways.monnify.enabled },
      },
    });
  } catch (error) {
    logger.error('Get active gateway error', error.message);
    res.status(500).json({ success: false, message: 'Failed to get active gateway' });
  }
});

// ── ROUTE 2: Get user's virtual account ───────────────────────
// virtualAccountFetchLimiter: loose limit for normal dashboard loads
// accountCreationLimiter: only triggered when account doesn't exist yet
router.get('/virtual-account', authenticate, virtualAccountFetchLimiter, async (req, res) => {
  try {
    const config         = await PaymentGatewayConfig.getConfig();
    const ACTIVE_GATEWAY = config.activeGateway;
    let accountData;

    if (ACTIVE_GATEWAY === 'paystack') {
      let paystackAccount = await PaystackAccount.findOne({ userId: req.user.id });

      if (!paystackAccount) {
        // Apply strict creation limit only when actually creating
        await new Promise((resolve, reject) => {
          accountCreationLimiter(req, res, (err) => err ? reject(err) : resolve(undefined));
        });
        try {
          paystackAccount = await createPaystackAccount(req.user.id);
        } catch (createError) {
          return res.status(500).json({ success: false, message: 'Failed to create Paystack virtual account', gateway: 'paystack' });
        }
      }

      accountData = {
        gateway:       'paystack',
        accountNumber: paystackAccount.accountNumber,
        accountName:   paystackAccount.accountName,
        bankName:      paystackAccount.bankName,
        accounts: [{
          accountNumber: paystackAccount.accountNumber,
          accountName:   paystackAccount.accountName,
          bankName:      paystackAccount.bankName,
        }],
      };

    } else if (ACTIVE_GATEWAY === 'monnify') {
      let monnifyAccount = await MonnifyAccount.findOne({ userId: req.user.id });

      if (!monnifyAccount) {
        // Apply strict creation limit only when actually creating
        await new Promise((resolve, reject) => {
          accountCreationLimiter(req, res, (err) => err ? reject(err) : resolve(undefined));
        });
        try {
          monnifyAccount = await createMonnifyAccount(req.user.id);
        } catch (createError) {
          return res.status(500).json({ success: false, message: 'Failed to create Monnify virtual accounts', gateway: 'monnify' });
        }
      }

      accountData = {
        gateway:          'monnify',
        accounts:         monnifyAccount.accounts,
        accountReference: monnifyAccount.accountReference,
        totalAccounts:    monnifyAccount.accounts.length,
      };
    }

    res.status(200).json({ success: true, data: accountData });
  } catch (error) {
    logger.error('Get virtual account error', error.message);
    res.status(500).json({ success: false, message: 'Failed to retrieve virtual account' });
  }
});

// ── ROUTE 3: Get all payment accounts ─────────────────────────
router.get('/all-accounts', authenticate, async (req, res) => {
  try {
    const config         = await PaymentGatewayConfig.getConfig();
    const ACTIVE_GATEWAY = config.activeGateway;

    const monnifyAccount  = await MonnifyAccount.findOne({ userId: req.user.id });
    const paystackAccount = await PaystackAccount.findOne({ userId: req.user.id });

    const allAccounts = {
      monnify: monnifyAccount
        ? { exists: true, accounts: monnifyAccount.accounts, accountReference: monnifyAccount.accountReference }
        : { exists: false },
      paystack: paystackAccount
        ? { exists: true, accountNumber: paystackAccount.accountNumber, accountName: paystackAccount.accountName, bankName: paystackAccount.bankName }
        : { exists: false },
      activeGateway: ACTIVE_GATEWAY,
    };

    res.status(200).json({ success: true, data: allAccounts });
  } catch (error) {
    logger.error('Get all accounts error', error.message);
    res.status(500).json({ success: false, message: 'Failed to retrieve payment accounts' });
  }
});

module.exports = router;