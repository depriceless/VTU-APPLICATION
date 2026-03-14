// routes/monnify.js
const express = require('express');
const router  = express.Router();
const axios   = require('axios');
const crypto  = require('crypto');
const User           = require('../models/User');
const MonnifyAccount = require('../models/MonnifyAccount');
const Wallet         = require('../models/Wallet');
const Transaction    = require('../models/Transaction');
const { authenticate } = require('../middleware/auth');
const { logger }     = require('../utils/logger');

const MONNIFY_CONFIG = {
  apiKey:       process.env.MONNIFY_API_KEY,
  secretKey:    process.env.MONNIFY_SECRET_KEY,
  contractCode: process.env.MONNIFY_CONTRACT_CODE,
  baseUrl:      process.env.MONNIFY_BASE_URL || 'https://sandbox.monnify.com',
};

// ✅ FIX 1: Use logger — not console.log
if (!MONNIFY_CONFIG.apiKey)       logger.warn('MONNIFY_API_KEY is not set');
if (!MONNIFY_CONFIG.secretKey)    logger.warn('MONNIFY_SECRET_KEY is not set');
if (!MONNIFY_CONFIG.contractCode) logger.warn('MONNIFY_CONTRACT_CODE is not set');

// ── Get Monnify token ──────────────────────────────────────────
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
    // ✅ FIX 2: Never log raw API error responses — may contain credentials
    logger.error('Failed to get Monnify access token', error.message);
    throw new Error('Failed to get Monnify access token');
  }
};

// ── Webhook signature verification ────────────────────────────
// ✅ FIX 3: Monnify webhook had NO signature verification — added
const verifyMonnifySignature = (body, signature) => {
  if (!MONNIFY_CONFIG.secretKey || !signature) return false;
  const hash = crypto
    .createHmac('sha512', MONNIFY_CONFIG.secretKey)
    .update(JSON.stringify(body))
    .digest('hex');
  return hash === signature;
};

const generateAccountNames = (userName, bankName) => {
  const variations = [userName, userName.toUpperCase(), userName.split(' ').reverse().join(' ')];
  const bankIndex  = { Moniepoint: 0, 'Access Bank': 1, 'Wema Bank': 2 };
  return variations[bankIndex[bankName] || 0];
};

// ── Create reserved account ────────────────────────────────────
router.post('/create-reserved-account', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;

    const existingAccount = await MonnifyAccount.findOne({ userId });
    if (existingAccount) {
      return res.status(200).json({
        success: true,
        message: 'Account already exists',
        data: { accounts: existingAccount.accounts, accountReference: existingAccount.accountReference },
      });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

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
          accountName:    user.name,
          currencyCode:   'NGN',
          contractCode:   MONNIFY_CONFIG.contractCode,
          customerEmail:  user.email,
          customerName:   user.name,
          getAllAvailableBanks: false,
          preferredBanks: ['50515', '044', '035'],
        },
        { headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' } }
      );

      allAccounts = monnifyResponse.data.responseBody.accounts.map(acc => ({
        bankName: acc.bankName, bankCode: acc.bankCode,
        accountNumber: acc.accountNumber, accountName: acc.accountName,
      }));
    } catch {
      for (const bank of bankConfigs) {
        try {
          const individualRef   = `${accountReference}_${bank.code}`;
          const response        = await axios.post(
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
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (individualError) {
          logger.error(`Failed to create ${bank.name} Monnify account`, individualError.message);
        }
      }
    }

    if (allAccounts.length === 0) throw new Error('Failed to create any virtual accounts');

    const monnifyAccount = new MonnifyAccount({
      userId, accountReference, accounts: allAccounts,
      customerEmail: user.email, customerName: user.name,
    });
    await monnifyAccount.save();

    logger.success(`Monnify accounts created for user ${userId}`);

    res.status(201).json({
      success: true,
      message: `${allAccounts.length} virtual account(s) created successfully`,
      data: { accounts: allAccounts, accountReference, totalAccounts: allAccounts.length },
    });
  } catch (error) {
    logger.error('Create Monnify account error', error.message);
    res.status(500).json({ success: false, message: 'Failed to create virtual account' });
  }
});

// ── Get user accounts ──────────────────────────────────────────
router.get('/user-accounts', authenticate, async (req, res) => {
  try {
    const monnifyAccount = await MonnifyAccount.findOne({ userId: req.user.id });
    if (!monnifyAccount) {
      return res.status(404).json({ success: false, message: 'No virtual accounts found. Create one first.' });
    }
    res.status(200).json({
      success: true,
      data: {
        accounts:         monnifyAccount.accounts,
        accountReference: monnifyAccount.accountReference,
        totalAccounts:    monnifyAccount.accounts.length,
      },
    });
  } catch (error) {
    logger.error('Get Monnify accounts error', error.message);
    res.status(500).json({ success: false, message: 'Failed to retrieve accounts' });
  }
});

// ── Webhook ────────────────────────────────────────────────────
router.post('/webhook', async (req, res) => {
  try {
    // ✅ FIX 3: Verify Monnify webhook signature
    const signature = req.headers['monnify-signature'];
    if (!verifyMonnifySignature(req.body, signature)) {
      logger.warn('Invalid Monnify webhook signature');
      return res.status(400).json({ success: false, message: 'Invalid signature' });
    }

    const eventData   = req.body.eventData || req.body;
    const product     = eventData.product  || {};

    const {
      transactionReference,
      amountPaid,
      paymentStatus,
      destinationAccountInformation,
    } = eventData;

    const accountReference = product.reference;
    const accountNumber    = destinationAccountInformation?.accountNumber;

    // ✅ FIX 4: Only process PAID status — return 200 for others (not 404)
    if (paymentStatus !== 'PAID') {
      return res.status(200).json({ success: true, message: 'Payment not completed yet' });
    }

    // Find account
    let monnifyAccount = null;
    if (accountNumber) {
      monnifyAccount = await MonnifyAccount.findOne({ 'accounts.accountNumber': accountNumber });
    }
    if (!monnifyAccount && accountReference) {
      monnifyAccount = await MonnifyAccount.findOne({ accountReference });
    }

    if (!monnifyAccount) {
      logger.warn(`Monnify webhook: account not found for reference ${transactionReference}`);
      // ✅ Return 200 so Monnify stops retrying
      return res.status(200).json({ success: true });
    }

    const userId = monnifyAccount.userId;

    // ✅ FIX 5: Use Wallet model — not Balance (which was never imported and crashed the webhook)
    let wallet = await Wallet.findOne({ userId });
    if (!wallet) {
      logger.warn(`Monnify webhook: wallet not found for user ${userId}`);
      return res.status(200).json({ success: true });
    }

    // Idempotency check using Transaction model
    const existingTx = await Transaction.findOne({
      reference: transactionReference,
      'gateway.provider': 'monnify',
    });
    if (existingTx) {
      return res.status(200).json({ success: true, message: 'Transaction already processed' });
    }

    const previousBalance = wallet.balance;
    const creditAmount    = parseFloat(amountPaid);
    const newBalance      = previousBalance + creditAmount;

    wallet.balance             = newBalance;
    wallet.lastTransactionDate = new Date();
    wallet.stats               = wallet.stats || {};
    wallet.stats.totalDeposits = (wallet.stats.totalDeposits || 0) + creditAmount;
    wallet.stats.depositCount  = (wallet.stats.depositCount  || 0) + 1;
    await wallet.save();

    await Transaction.create({
      userId, walletId: wallet._id,
      type: 'credit', amount: creditAmount,
      previousBalance, newBalance,
      description: 'Wallet funding via Monnify',
      reference:   transactionReference,
      status:      'completed', category: 'funding',
      gateway: { provider: 'monnify', gatewayReference: transactionReference },
      metadata: {
        source:        'monnify_webhook',
        accountNumber: accountNumber || '',
        accountReference,
      },
    });

    logger.success(`Monnify payment processed: ₦${creditAmount} for user ${userId}`);

    return res.status(200).json({ success: true });

  } catch (error) {
    logger.error('Monnify webhook error', error.message);
    return res.status(500).json({ success: false, message: 'Webhook processing failed' });
  }
});

// ── Verify payment ─────────────────────────────────────────────
router.get('/verify/:reference', authenticate, async (req, res) => {
  try {
    const accessToken = await getMonnifyToken();
    const response    = await axios.get(
      `${MONNIFY_CONFIG.baseUrl}/api/v2/transactions/${encodeURIComponent(req.params.reference)}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    res.status(200).json({ success: true, data: response.data.responseBody });
  } catch (error) {
    logger.error('Verify Monnify payment error', error.message);
    res.status(500).json({ success: false, message: 'Failed to verify payment' });
  }
});

// ── Delete account ─────────────────────────────────────────────
// ✅ FIX 6: Requires confirmation field to prevent accidental deletion
router.delete('/delete-my-account', authenticate, async (req, res) => {
  try {
    const { confirm } = req.body;
    if (confirm !== 'DELETE') {
      return res.status(400).json({
        success: false,
        message: 'Send { "confirm": "DELETE" } in the request body to confirm account deletion',
      });
    }
    const result = await MonnifyAccount.deleteOne({ userId: req.user.id });
    res.json({ success: true, message: 'Account deleted', deletedCount: result.deletedCount });
  } catch (error) {
    logger.error('Delete Monnify account error', error.message);
    res.status(500).json({ success: false, message: 'Failed to delete account' });
  }
});

// ✅ FIX 7: /test and /debug-monnify routes removed — both exposed config and credentials

module.exports = router;