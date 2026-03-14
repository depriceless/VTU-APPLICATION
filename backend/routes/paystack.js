// routes/paystack.js
const express  = require('express');
const router   = express.Router();
const axios    = require('axios');
const crypto   = require('crypto');
const mongoose = require('mongoose');
const User            = require('../models/User');
const Wallet          = require('../models/Wallet');
const Transaction     = require('../models/Transaction');
const PaystackAccount = require('../models/PaystackAccount');
const { authenticate } = require('../middleware/auth');
const { logger }      = require('../utils/logger');

const PAYSTACK_CONFIG = {
  secretKey: process.env.PAYSTACK_SECRET_KEY,
  publicKey:  process.env.PAYSTACK_PUBLIC_KEY,
  baseUrl:    'https://api.paystack.co',
};

if (!PAYSTACK_CONFIG.secretKey) logger.warn('PAYSTACK_SECRET_KEY is not set');
if (!PAYSTACK_CONFIG.publicKey)  logger.warn('PAYSTACK_PUBLIC_KEY is not set');

// ── Webhook ────────────────────────────────────────────────────
// Uses rawBody (set by app.js) for HMAC — JSON.stringify(req.body)
// can silently reorder keys and break the signature check.
router.post('/webhook', async (req, res) => {
  let session;

  try {
    // STEP 1: Verify signature against raw body bytes
    const rawBody = req.rawBody;
    if (!rawBody) {
      logger.warn('Paystack webhook: rawBody missing — check app.js verify callback');
      return res.status(400).json({ success: false, message: 'Invalid request' });
    }

    const hash = crypto
      .createHmac('sha512', PAYSTACK_CONFIG.secretKey)
      .update(rawBody)
      .digest('hex');

    if (hash !== req.headers['x-paystack-signature']) {
      logger.warn('Invalid Paystack webhook signature');
      return res.status(400).json({ success: false, message: 'Invalid signature' });
    }

    const { event, data } = req.body;

    // STEP 2: Only process charge.success
    if (event !== 'charge.success') {
      return res.status(200).json({ success: true });
    }

    const { reference, amount, customer, metadata, channel, status, authorization } = data;

    if (status !== 'success') {
      return res.status(200).json({ success: true });
    }

    const amountInNaira = parseFloat((amount / 100).toFixed(2));
    const customerEmail = customer?.email?.toLowerCase().trim();

    // STEP 3: Idempotency check
    const existingTransaction = await Transaction.findOne({
      reference,
      'gateway.provider': 'paystack',
    });

    if (existingTransaction) {
      return res.status(200).json({ success: true });
    }

    // STEP 4: Account lookup
    let paystackAccount = null;

    if (customerEmail) {
      paystackAccount = await PaystackAccount.findOne({
        customerEmail: { $regex: new RegExp(`^${customerEmail.trim()}$`, 'i') },
      });
    }
    if (!paystackAccount && metadata?.account_number) {
      paystackAccount = await PaystackAccount.findOne({ accountNumber: metadata.account_number });
    }
    if (!paystackAccount && customer?.customer_code) {
      paystackAccount = await PaystackAccount.findOne({ customerId: customer.customer_code });
    }

    // STEP 5: Account not found — log for reconciliation, return 200
    if (!paystackAccount) {
      logger.warn(`Paystack webhook: account not found for reference ${reference}`);

      let user = null;
      if (customerEmail) {
        user = await User.findOne({ email: { $regex: new RegExp(`^${customerEmail}$`, 'i') } });
      }

      await Transaction.create({
        type:     'credit',
        amount:   amountInNaira,
        description: 'Paystack deposit - ACCOUNT NOT FOUND (RECONCILE)',
        reference,
        status:   'pending_reconciliation',
        category: 'funding',
        userId:   user?._id || new mongoose.Types.ObjectId(),
        walletId: new mongoose.Types.ObjectId(),
        previousBalance: 0,
        newBalance: 0,
        gateway: { provider: 'paystack', gatewayReference: reference },
        metadata: {
          customerEmail,
          reconciliationNeeded: true,
          userFound: !!user,
        },
      });

      return res.status(200).json({ success: true });
    }

    const userId = paystackAccount.userId;

    // STEP 6: Verify user exists
    const user = await User.findById(userId);
    if (!user) {
      logger.warn(`Paystack webhook: user not found for account ${paystackAccount._id}`);
      await Transaction.create({
        userId, walletId: new mongoose.Types.ObjectId(),
        previousBalance: 0, newBalance: 0,
        type: 'credit', amount: amountInNaira,
        description: 'Paystack deposit - USER NOT FOUND',
        reference, status: 'failed', category: 'funding',
        gateway: { provider: 'paystack', gatewayReference: reference },
        metadata: { customerEmail },
      });
      return res.status(200).json({ success: true });
    }

    // STEP 7: Database transaction
    session = await mongoose.startSession();
    session.startTransaction();

    try {
      let wallet = await Wallet.findOne({ userId }).session(session);
      if (!wallet) {
        wallet = new Wallet({ userId, balance: 0, currency: 'NGN', isActive: true });
        await wallet.save({ session });
      }

      const previousBalance = wallet.balance || 0;
      const newBalance      = previousBalance + amountInNaira;

      wallet.balance                    = newBalance;
      wallet.lastTransactionDate        = new Date();
      wallet.stats                      = wallet.stats || {};
      wallet.stats.totalCredits         = (wallet.stats.totalCredits  || 0) + amountInNaira;
      wallet.stats.totalDeposits        = (wallet.stats.totalDeposits || 0) + amountInNaira;
      wallet.stats.transactionCount     = (wallet.stats.transactionCount || 0) + 1;
      wallet.stats.depositCount         = (wallet.stats.depositCount  || 0) + 1;

      await wallet.save({ session });

      const transaction = new Transaction({
        walletId: wallet._id, userId,
        type: 'credit', amount: amountInNaira,
        previousBalance, newBalance,
        description: `Wallet funding via Paystack${channel ? ` (${channel})` : ''}`,
        reference, status: 'completed', category: 'funding',
        gateway: {
          provider: 'paystack',
          gatewayReference: reference,
          gatewayResponse: { channel, status },
        },
        metadata: {
          source:            'paystack_webhook',
          paystackAccountId: paystackAccount._id,
          accountNumber:     paystackAccount.accountNumber,
          bankName:          paystackAccount.bankName,
        },
      });
      await transaction.save({ session });

      paystackAccount.lastPaymentReference = reference;
      paystackAccount.lastPaymentAmount    = amountInNaira;
      paystackAccount.lastPaymentDate      = new Date();
      paystackAccount.totalReceived        = (paystackAccount.totalReceived || 0) + amountInNaira;
      paystackAccount.transactionCount     = (paystackAccount.transactionCount || 0) + 1;
      await paystackAccount.save({ session });

      await session.commitTransaction();
      logger.success(`Paystack payment processed: ₦${amountInNaira} for user ${userId}`);

      return res.status(200).json({ success: true });

    } catch (txError) {
      if (session) await session.abortTransaction();
      throw txError;
    }

  } catch (error) {
    logger.error('Paystack webhook error', error.message);
    try {
      await Transaction.create({
        type: 'credit',
        amount: req.body.data?.amount ? req.body.data.amount / 100 : 0,
        description: 'Paystack webhook error',
        reference: req.body.data?.reference || `ERROR-${Date.now()}`,
        status: 'failed', category: 'funding',
        userId:   new mongoose.Types.ObjectId(),
        walletId: new mongoose.Types.ObjectId(),
        previousBalance: 0, newBalance: 0,
        gateway: { provider: 'paystack', gatewayReference: req.body.data?.reference || 'unknown' },
        metadata: { error: error.message, event: req.body.event },
      });
    } catch (logError) {
      logger.error('Failed to log webhook error', logError.message);
    }
    return res.status(500).json({ success: false, message: 'Webhook processing failed' });
  } finally {
    if (session) await session.endSession();
  }
});

// ── Create virtual account ─────────────────────────────────────
router.post('/create-virtual-account', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const user   = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    let paystackAccount = await PaystackAccount.findOne({ userId });
    if (paystackAccount) {
      return res.status(200).json({
        success: true,
        message: 'Virtual account already exists',
        data: {
          accountNumber: paystackAccount.accountNumber,
          accountName:   paystackAccount.accountName,
          bankName:      paystackAccount.bankName,
        },
      });
    }

    let customerId;
    try {
      const customerResponse = await axios.post(
        `${PAYSTACK_CONFIG.baseUrl}/customer`,
        {
          email:      user.email,
          first_name: user.name?.split(' ')[0] || 'User',
          last_name:  user.name?.split(' ').slice(1).join(' ') || user.name?.split(' ')[0] || 'Customer',
          phone:      user.phone || '',
        },
        { headers: { Authorization: `Bearer ${PAYSTACK_CONFIG.secretKey}`, 'Content-Type': 'application/json' } }
      );
      customerId = customerResponse.data.data.customer_code;
    } catch (error) {
      if (error.response?.status === 400) {
        const fetchResponse = await axios.get(
          `${PAYSTACK_CONFIG.baseUrl}/customer/${encodeURIComponent(user.email)}`,
          { headers: { Authorization: `Bearer ${PAYSTACK_CONFIG.secretKey}` } }
        );
        customerId = fetchResponse.data.data.customer_code;
      } else {
        throw error;
      }
    }

    const accountResponse = await axios.post(
      `${PAYSTACK_CONFIG.baseUrl}/dedicated_account`,
      { customer: customerId, preferred_bank: 'wema-bank', country: 'NG' },
      { headers: { Authorization: `Bearer ${PAYSTACK_CONFIG.secretKey}`, 'Content-Type': 'application/json' } }
    );

    const accountData = accountResponse.data.data;

    paystackAccount = new PaystackAccount({
      userId, customerId,
      accountNumber:    accountData.account_number,
      accountName:      accountData.account_name,
      bankName:         accountData.bank.name,
      bankCode:         accountData.bank.id,
      accountReference: accountData.id,
      customerEmail:    user.email.toLowerCase(),
      customerName:     user.name,
      isActive:         true,
    });
    await paystackAccount.save();

    logger.success(`Paystack virtual account created for user ${userId}`);

    res.status(201).json({
      success: true,
      message: 'Paystack virtual account created successfully',
      data: {
        accountNumber: accountData.account_number,
        accountName:   accountData.account_name,
        bankName:      accountData.bank.name,
      },
    });
  } catch (error) {
    logger.error('Create Paystack account error', error.message);
    res.status(500).json({ success: false, message: 'Failed to create Paystack virtual account' });
  }
});

// ── Get user account ───────────────────────────────────────────
router.get('/user-account', authenticate, async (req, res) => {
  try {
    const paystackAccount = await PaystackAccount.findOne({ userId: req.user.id });
    if (!paystackAccount) {
      return res.status(404).json({ success: false, message: 'No Paystack virtual account found' });
    }

    const recentTransactions = await Transaction.find({
      userId: req.user.id,
      'gateway.provider': 'paystack',
      status: 'completed',
    }).sort({ createdAt: -1 }).limit(5).select('amount description reference createdAt');

    res.status(200).json({
      success: true,
      data: {
        accountNumber: paystackAccount.accountNumber,
        accountName:   paystackAccount.accountName,
        bankName:      paystackAccount.bankName,
        isActive:      paystackAccount.isActive,
        lastPayment:   paystackAccount.lastPaymentDate ? {
          date:      paystackAccount.lastPaymentDate,
          amount:    paystackAccount.lastPaymentAmount,
          reference: paystackAccount.lastPaymentReference,
        } : null,
        totalReceived:      paystackAccount.totalReceived || 0,
        recentTransactions,
      },
    });
  } catch (error) {
    logger.error('Get Paystack account error', error.message);
    res.status(500).json({ success: false, message: 'Failed to retrieve Paystack account' });
  }
});

// ── Verify transaction ─────────────────────────────────────────
// Only returns data for transactions belonging to the requesting user.
router.get('/verify/:reference', authenticate, async (req, res) => {
  try {
    const { reference } = req.params;

    // Always check local DB first — scoped to this user
    const localTx = await Transaction.findOne({ reference, userId: req.user.id });
    if (localTx) {
      return res.status(200).json({ success: true, source: 'local', data: localTx });
    }

    // Only hit Paystack API if the transaction was initiated by this user
    // (pending transactions may not be in DB yet — verify it was theirs)
    const pendingTx = await Transaction.findOne({
      reference,
      userId: req.user.id,
      status: 'pending',
    });

    if (!pendingTx) {
      // No local record for this user — don't proxy to Paystack
      return res.status(404).json({ success: false, message: 'Transaction not found.' });
    }

    const response = await axios.get(
      `${PAYSTACK_CONFIG.baseUrl}/transaction/verify/${reference}`,
      { headers: { Authorization: `Bearer ${PAYSTACK_CONFIG.secretKey}` } }
    );

    const txData = response.data.data;
    res.status(200).json({
      success: true, source: 'paystack',
      data: {
        status:    txData.status,
        amount:    txData.amount / 100,
        reference: txData.reference,
        paidAt:    txData.paid_at,
        channel:   txData.channel,
      },
    });
  } catch (error) {
    logger.error('Verify Paystack transaction error', error.message);
    res.status(500).json({ success: false, message: 'Failed to verify transaction' });
  }
});

// ── Initialize payment ─────────────────────────────────────────
router.post('/initialize-payment', authenticate, async (req, res) => {
  try {
    const { amount } = req.body;
    const user = await User.findById(req.user.id);

    if (!amount || amount < 100) {
      return res.status(400).json({ success: false, message: 'Minimum amount is ₦100' });
    }

    // Cap at ₦1,000,000 per transaction — adjust to your business limits
    if (amount > 1_000_000) {
      return res.status(400).json({ success: false, message: 'Maximum amount per transaction is ₦1,000,000' });
    }

    const response = await axios.post(
      `${PAYSTACK_CONFIG.baseUrl}/transaction/initialize`,
      {
        email:  user.email,
        amount: amount * 100,
        callback_url: process.env.FRONTEND_URL
          ? `${process.env.FRONTEND_URL}/payment/callback`
          : `${req.protocol}://${req.get('host')}/api/paystack/callback`,
        metadata: {
          userId:  user._id.toString(),
          purpose: 'wallet_funding',
          source:  'manual_payment',
        },
      },
      { headers: { Authorization: `Bearer ${PAYSTACK_CONFIG.secretKey}`, 'Content-Type': 'application/json' } }
    );

    let wallet = await Wallet.findOne({ userId: user._id });
    if (!wallet) {
      wallet = new Wallet({ userId: user._id, balance: 0, currency: 'NGN', isActive: true });
      await wallet.save();
    }

    await Transaction.create({
      userId: user._id, walletId: wallet._id,
      previousBalance: wallet.balance, newBalance: wallet.balance,
      type: 'credit', amount,
      description: 'Manual wallet funding initiated',
      reference: response.data.data.reference,
      status: 'pending', category: 'funding',
      gateway: { provider: 'paystack', gatewayReference: response.data.data.reference },
      metadata: { initiatedAt: new Date() },
    });

    res.status(200).json({
      success: true,
      data: {
        authorizationUrl: response.data.data.authorization_url,
        reference:        response.data.data.reference,
        accessCode:       response.data.data.access_code,
      },
    });
  } catch (error) {
    logger.error('Initialize payment error', error.message);
    res.status(500).json({ success: false, message: 'Failed to initialize payment' });
  }
});

// ── Payment callback ───────────────────────────────────────────
// This is a browser redirect from Paystack — not authenticated.
// We verify the transaction with Paystack directly rather than
// trusting the reference param alone.
router.get('/callback', async (req, res) => {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

  try {
    const txReference = req.query.reference || req.query.trxref;
    if (!txReference) {
      return res.redirect(`${frontendUrl}/payment?error=no_reference`);
    }

    // Verify with Paystack — don't trust query param status alone
    const response = await axios.get(
      `${PAYSTACK_CONFIG.baseUrl}/transaction/verify/${encodeURIComponent(txReference)}`,
      { headers: { Authorization: `Bearer ${PAYSTACK_CONFIG.secretKey}` } }
    );

    const txData = response.data.data;

    if (txData.status === 'success') {
      // Only update if this reference exists in our DB and is still pending
      // Completed status is set authoritatively by the webhook — this is
      // just a UI redirect helper, not the source of truth
      await Transaction.findOneAndUpdate(
        { reference: txReference, status: 'pending' },
        { 'metadata.callbackProcessed': true, 'metadata.callbackAt': new Date() }
      );
      return res.redirect(`${frontendUrl}/payment?success=true&reference=${txReference}`);
    } else {
      await Transaction.findOneAndUpdate(
        { reference: txReference, status: 'pending' },
        { status: 'failed' }
      );
      return res.redirect(`${frontendUrl}/payment?error=payment_failed`);
    }
  } catch (error) {
    logger.error('Payment callback error', error.message);
    return res.redirect(`${frontendUrl}/payment?error=verification_failed`);
  }
});

module.exports = router;