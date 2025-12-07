const express = require('express');
const router = express.Router();
const axios = require('axios');
const crypto = require('crypto');
const mongoose = require('mongoose');
const User = require('../models/User');
const Wallet = require('../models/Wallet');
const Transaction = require('../models/Transaction');
const PaystackAccount = require('../models/PaystackAccount');
const { authenticate } = require('../middleware/auth');

// Paystack Configuration
const PAYSTACK_CONFIG = {
  secretKey: process.env.PAYSTACK_SECRET_KEY,
  publicKey: process.env.PAYSTACK_PUBLIC_KEY,
  baseUrl: 'https://api.paystack.co'
};

console.log('🔍 Paystack Config Check:', {
  secretKey: PAYSTACK_CONFIG.secretKey ? '✅ Set' : '❌ Missing',
  publicKey: PAYSTACK_CONFIG.publicKey ? '✅ Set' : '❌ Missing'
});

// ========== ENHANCED WEBHOOK HANDLER ==========
router.post('/webhook', async (req, res) => {
  console.log('📩 ========================================');
  console.log('📩 PAYSTACK WEBHOOK RECEIVED');
  console.log('📩 Time:', new Date().toISOString());
  console.log('📩 ========================================');
  
  let session;
  
  try {
    // ✅ STEP 1: VERIFY WEBHOOK SIGNATURE
    const hash = crypto
      .createHmac('sha512', PAYSTACK_CONFIG.secretKey)
      .update(JSON.stringify(req.body))
      .digest('hex');

    if (hash !== req.headers['x-paystack-signature']) {
      console.error('❌ SECURITY ALERT: Invalid webhook signature');
      console.error('   Received:', req.headers['x-paystack-signature']?.substring(0, 20) + '...');
      console.error('   Computed:', hash.substring(0, 20) + '...');
      
      try {
        // Create a minimal transaction record for failed signature
        await Transaction.create({
          type: 'credit',
          status: 'failed',
          description: 'Paystack webhook - Invalid signature',
          reference: req.body.data?.reference || `INVALID-SIG-${Date.now()}`,
          amount: req.body.data?.amount ? req.body.data.amount / 100 : 0,
          category: 'funding', // ✅ FIXED: Changed from 'deposit' to 'funding'
          userId: new mongoose.Types.ObjectId(), // Dummy ObjectId
          walletId: new mongoose.Types.ObjectId(), // Dummy ObjectId
          previousBalance: 0,
          newBalance: 0,
          gateway: {
            provider: 'paystack',
            gatewayReference: req.body.data?.reference || 'unknown',
            gatewayResponse: { error: 'Invalid webhook signature' }
          },
          metadata: {
            error: 'Invalid webhook signature',
            customerEmail: req.body.data?.customer?.email
          }
        });
      } catch (logError) {
        console.error('Failed to log signature error:', logError);
      }
      
      return res.status(400).json({ success: false, message: 'Invalid signature' });
    }
    
    console.log('✅ Webhook signature verified');

    const { event, data } = req.body;
    
    // ✅ STEP 2: ONLY PROCESS SUCCESSFUL CHARGES
    if (event !== 'charge.success') {
      console.log(`⏭️  Event ignored: ${event}`);
      return res.status(200).json({ success: true, message: `Event ${event} ignored` });
    }

    const { reference, amount, customer, metadata, channel, status, authorization } = data;

    // Validate payment status
    if (status !== 'success') {
      console.log('⚠️  Payment not successful, status:', status);
      return res.status(200).json({ success: true, message: 'Payment not successful' });
    }

    const amountInNaira = parseFloat((amount / 100).toFixed(2));
    const customerEmail = customer?.email?.toLowerCase().trim();

    console.log('💰 Payment Details:');
    console.log('   Reference:', reference);
    console.log('   Amount: ₦' + amountInNaira);
    console.log('   Customer Email:', customerEmail);
    console.log('   Channel:', channel);
    console.log('   Status:', status);
    
    if (metadata) {
      console.log('   Metadata:', JSON.stringify(metadata));
    }

    // ✅ STEP 3: CHECK FOR DUPLICATE (IDEMPOTENCY)
    const existingTransaction = await Transaction.findOne({ 
      reference: reference,
      'gateway.provider': 'paystack'
    });

    if (existingTransaction) {
      console.log('⚠️  DUPLICATE DETECTED - Transaction already processed');
      console.log('   Transaction ID:', existingTransaction._id);
      console.log('   Status:', existingTransaction.status);
      console.log('   Created:', existingTransaction.createdAt);
      return res.status(200).json({ 
        success: true, 
        message: 'Transaction already processed',
        duplicate: true 
      });
    }

    // ✅ STEP 4: ENHANCED ACCOUNT LOOKUP
    let paystackAccount = null;
    let userId = null;
    
    // Method 1: Try by customer email (case-insensitive)
    if (customerEmail) {
      paystackAccount = await PaystackAccount.findOne({
        customerEmail: { $regex: new RegExp(`^${customerEmail.trim()}$`, 'i') }
      });
    }
    
    // Method 2: Try by account number from metadata (virtual accounts)
    if (!paystackAccount && metadata?.account_number) {
      paystackAccount = await PaystackAccount.findOne({
        accountNumber: metadata.account_number
      });
      if (paystackAccount) {
        console.log('✅ Found account by account number:', metadata.account_number);
      }
    }
    
    // Method 3: Try by customerId/customer_code
    if (!paystackAccount && customer?.customer_code) {
      paystackAccount = await PaystackAccount.findOne({
        customerId: customer.customer_code
      });
      if (paystackAccount) {
        console.log('✅ Found account by customer code:', customer.customer_code);
      }
    }

    // ✅ STEP 5: HANDLE ACCOUNT NOT FOUND
    if (!paystackAccount) {
      console.error('❌ PAYSTACK ACCOUNT NOT FOUND');
      console.error('   Customer Email:', customerEmail);
      console.error('   Reference:', reference);
      
      // Try to find user by email
      let user = null;
      if (customerEmail) {
        user = await User.findOne({ 
          email: { $regex: new RegExp(`^${customerEmail}$`, 'i') } 
        });
      }
      
      const reconTx = await Transaction.create({
        type: 'credit',
        amount: amountInNaira,
        description: `Paystack deposit - ACCOUNT NOT FOUND (RECONCILE)`,
        reference: reference,
        status: 'pending_reconciliation',
        category: 'funding', // ✅ FIXED: Changed from 'deposit' to 'funding'
        userId: user?._id || new mongoose.Types.ObjectId(), // Use found user or dummy
        walletId: new mongoose.Types.ObjectId(), // Dummy for now
        previousBalance: 0,
        newBalance: 0,
        gateway: {
          provider: 'paystack',
          gatewayReference: reference,
          gatewayResponse: { channel: channel }
        },
        metadata: {
          customerEmail: customerEmail,
          customerName: customer?.name || metadata?.customer_name,
          paystackCustomerCode: customer?.customer_code,
          accountNumber: metadata?.account_number,
          authorizationCode: authorization?.authorization_code,
          bank: authorization?.bank,
          last4: authorization?.last4,
          reconciliationNeeded: true,
          userFound: !!user,
          realUserId: user?._id,
          error: 'PaystackAccount not found',
          fullData: data
        }
      });
      
      console.log('📋 RECONCILIATION RECORD CREATED:', reconTx._id);
      console.log('📋 User by email found:', user?._id || 'NO');
      console.log('🚨 MANUAL ACTION REQUIRED - Check Transaction ID:', reconTx._id);
      
      // Return 200 (not 404) so Paystack doesn't retry
      return res.status(200).json({ 
        success: false,
        message: 'Account not found - Logged for reconciliation',
        reconciliationId: reconTx._id,
        reference: reference,
        note: 'Admin should manually credit user'
      });
    }

    userId = paystackAccount.userId;
    console.log('✅ Account found - User ID:', userId);
    console.log('   Account Email:', paystackAccount.customerEmail);
    console.log('   Account Number:', paystackAccount.accountNumber);
    console.log('   Customer ID:', paystackAccount.customerId);

    // ✅ STEP 6: VERIFY USER EXISTS
    const user = await User.findById(userId);
    if (!user) {
      console.error('❌ USER NOT FOUND for account:', userId);
      
      await Transaction.create({
        userId: userId,
        walletId: new mongoose.Types.ObjectId(), // Dummy
        previousBalance: 0,
        newBalance: 0,
        type: 'credit',
        amount: amountInNaira,
        description: `Paystack deposit - USER NOT FOUND`,
        reference: reference,
        status: 'failed',
        category: 'funding', // ✅ FIXED
        gateway: {
          provider: 'paystack',
          gatewayReference: reference
        },
        metadata: {
          error: 'User not found for PaystackAccount',
          paystackAccountId: paystackAccount._id,
          customerEmail: customerEmail
        }
      });
      
      return res.status(200).json({ 
        success: false,
        message: 'User not found - Transaction logged',
        reference: reference
      });
    }

    console.log('✅ User verified:', user.email);

    // ✅ STEP 7: START DATABASE TRANSACTION
    session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Find or create wallet
      let wallet = await Wallet.findOne({ userId }).session(session);
      
      if (!wallet) {
        console.log('🆕 Creating new wallet for user:', userId);
        wallet = new Wallet({
          userId: userId,
          balance: 0,
          currency: 'NGN',
          isActive: true,
          stats: {
            totalCredits: 0,
            totalDebits: 0,
            transactionCount: 0,
            totalDeposits: 0,
            depositCount: 0
          }
        });
        await wallet.save({ session });
        console.log('✅ New wallet created:', wallet._id);
      }

      const previousBalance = wallet.balance || 0;
      const newBalance = previousBalance + amountInNaira;

      console.log('💳 Wallet Update:');
      console.log('   Previous Balance: ₦' + previousBalance);
      console.log('   Credit Amount: ₦' + amountInNaira);
      console.log('   New Balance: ₦' + newBalance);

      // ✅ STEP 8: UPDATE WALLET BALANCE
      wallet.balance = newBalance;
      wallet.lastTransactionDate = new Date();
      
      // Update stats
      wallet.stats = wallet.stats || {};
      wallet.stats.totalCredits = (wallet.stats.totalCredits || 0) + amountInNaira;
      wallet.stats.totalDeposits = (wallet.stats.totalDeposits || 0) + amountInNaira;
      wallet.stats.transactionCount = (wallet.stats.transactionCount || 0) + 1;
      wallet.stats.depositCount = (wallet.stats.depositCount || 0) + 1;
      
      // Update wallet history if exists
      if (wallet.history) {
        wallet.history.push({
          type: 'credit',
          amount: amountInNaira,
          previousBalance: previousBalance,
          newBalance: newBalance,
          description: `Deposit via Paystack ${channel}`,
          timestamp: new Date()
        });
      }
      
      await wallet.save({ session });
      console.log('✅ Wallet balance updated');

      // ✅ STEP 9: CREATE TRANSACTION RECORD
      const transaction = new Transaction({
        walletId: wallet._id,
        userId: userId,
        type: 'credit',
        amount: amountInNaira,
        previousBalance: previousBalance,
        newBalance: newBalance,
        description: `Wallet funding via Paystack${channel ? ` (${channel})` : ''}`,
        reference: reference,
        status: 'completed',
        category: 'funding', // ✅ FIXED: Changed from 'deposit' to 'funding'
        gateway: {
          provider: 'paystack',
          gatewayReference: reference,
          gatewayResponse: {
            channel: channel,
            customerEmail: customerEmail,
            status: status,
            amount: amount
          }
        },
        gatewayDetails: {
          reference: reference,
          channel: channel,
          customerEmail: customerEmail,
          customerCode: customer?.customer_code,
          authorizationCode: authorization?.authorization_code,
          bank: authorization?.bank,
          cardType: authorization?.card_type,
          last4: authorization?.last4
        },
        metadata: {
          source: 'paystack_webhook',
          paystackAccountId: paystackAccount._id,
          accountNumber: paystackAccount.accountNumber,
          bankName: paystackAccount.bankName
        }
      });

      await transaction.save({ session });
      console.log('✅ Transaction record created:', transaction._id);

      // ✅ STEP 10: UPDATE PAYSTACK ACCOUNT
      paystackAccount.lastPaymentReference = reference;
      paystackAccount.lastPaymentAmount = amountInNaira;
      paystackAccount.lastPaymentDate = new Date();
      paystackAccount.totalReceived = (paystackAccount.totalReceived || 0) + amountInNaira;
      paystackAccount.transactionCount = (paystackAccount.transactionCount || 0) + 1;
      
      // Store payment history if array exists
      if (paystackAccount.paymentHistory) {
        paystackAccount.paymentHistory.push({
          reference: reference,
          amount: amountInNaira,
          date: new Date(),
          channel: channel
        });
      }
      
      await paystackAccount.save({ session });
      console.log('✅ Paystack account updated');

      // ✅ STEP 11: COMMIT TRANSACTION
      await session.commitTransaction();
      console.log('✅ Database transaction committed');

      console.log('');
      console.log('🎉 ========================================');
      console.log('🎉 PAYMENT SUCCESSFULLY PROCESSED');
      console.log('🎉 ========================================');
      console.log('   User:', user.email);
      console.log('   User ID:', userId);
      console.log('   Amount Credited: ₦' + amountInNaira);
      console.log('   New Balance: ₦' + newBalance);
      console.log('   Transaction ID:', transaction._id);
      console.log('   Wallet ID:', wallet._id);
      console.log('🎉 ========================================');
      console.log('');

      // ✅ STEP 12: SEND SUCCESS RESPONSE
      return res.status(200).json({
        success: true,
        message: 'Payment processed successfully',
        data: {
          userId: userId,
          userEmail: user.email,
          walletId: wallet._id,
          transactionId: transaction._id,
          amount: amountInNaira,
          previousBalance: previousBalance,
          newBalance: newBalance,
          reference: reference
        }
      });

    } catch (transactionError) {
      // ✅ ROLLBACK ON ERROR
      if (session) {
        await session.abortTransaction();
        console.error('❌ Transaction rolled back due to error');
      }
      throw transactionError;
    }

  } catch (error) {
    console.error('');
    console.error('❌ ========================================');
    console.error('❌ WEBHOOK PROCESSING FAILED');
    console.error('❌ ========================================');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    console.error('❌ ========================================');
    
    // Create error transaction for debugging
    try {
      await Transaction.create({
        type: 'credit',
        amount: req.body.data?.amount ? req.body.data.amount / 100 : 0,
        description: `Paystack webhook error - ${error.message.substring(0, 50)}`,
        reference: req.body.data?.reference || `ERROR-${Date.now()}`,
        status: 'failed',
        category: 'funding', // ✅ FIXED: Changed from 'deposit' to 'funding'
        userId: new mongoose.Types.ObjectId(), // Dummy
        walletId: new mongoose.Types.ObjectId(), // Dummy
        previousBalance: 0,
        newBalance: 0,
        gateway: {
          provider: 'paystack',
          gatewayReference: req.body.data?.reference || 'unknown',
          gatewayResponse: { error: error.message }
        },
        metadata: {
          error: error.message,
          stack: error.stack,
          customerEmail: req.body.data?.customer?.email,
          event: req.body.event
        }
      });
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }
    
    // Return 500 so Paystack retries
    return res.status(500).json({
      success: false,
      message: 'Webhook processing failed',
      error: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message
    });
  } finally {
    if (session) {
      await session.endSession();
    }
  }
});

// ========== OTHER ROUTES (ENHANCED) ==========

// 1. Create Dedicated Virtual Account
router.post('/create-virtual-account', authenticate, async (req, res) => {
  try {
    console.log('📍 Create Paystack virtual account for user:', req.user.id);
    
    const userId = req.user.id;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Check if account already exists
    let paystackAccount = await PaystackAccount.findOne({ userId });
    if (paystackAccount) {
      console.log('✅ Paystack account already exists');
      return res.status(200).json({
        success: true,
        message: 'Virtual account already exists',
        data: {
          accountNumber: paystackAccount.accountNumber,
          accountName: paystackAccount.accountName,
          bankName: paystackAccount.bankName,
          customerId: paystackAccount.customerId
        }
      });
    }

    console.log('🔍 Creating Paystack virtual account for:', user.email);

    // Create or retrieve customer
    let customerId;
    try {
      const customerResponse = await axios.post(
        `${PAYSTACK_CONFIG.baseUrl}/customer`,
        {
          email: user.email,
          first_name: user.name?.split(' ')[0] || user.firstName || 'User',
          last_name: user.name?.split(' ').slice(1).join(' ') || user.lastName || user.name?.split(' ')[0] || 'Customer',
          phone: user.phone || '',
          metadata: {
            userId: userId,
            app: 'VTU-App'
          }
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
      if (error.response?.status === 400 && error.response?.data?.message?.includes('exists')) {
        // Customer already exists, fetch them
        const fetchResponse = await axios.get(
          `${PAYSTACK_CONFIG.baseUrl}/customer/${encodeURIComponent(user.email)}`,
          {
            headers: {
              'Authorization': `Bearer ${PAYSTACK_CONFIG.secretKey}`
            }
          }
        );
        customerId = fetchResponse.data.data.customer_code;
        console.log('✅ Existing customer retrieved:', customerId);
      } else {
        console.error('❌ Customer creation error:', error.response?.data || error.message);
        throw error;
      }
    }

    // Create dedicated account
    const accountResponse = await axios.post(
      `${PAYSTACK_CONFIG.baseUrl}/dedicated_account`,
      {
        customer: customerId,
        preferred_bank: 'wema-bank',
        country: 'NG'
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
    paystackAccount = new PaystackAccount({
      userId: userId,
      customerId: customerId,
      accountNumber: accountData.account_number,
      accountName: accountData.account_name,
      bankName: accountData.bank.name,
      bankCode: accountData.bank.id,
      accountReference: accountData.id,
      customerEmail: user.email.toLowerCase(),
      customerName: user.name,
      isActive: true,
      createdAt: new Date(),
      paymentHistory: []
    });

    await paystackAccount.save();
    console.log('✅ Paystack account saved to database');

    // Get or create wallet for transaction record
    let wallet = await Wallet.findOne({ userId });
    if (!wallet) {
      wallet = new Wallet({
        userId: userId,
        balance: 0,
        currency: 'NGN',
        isActive: true
      });
      await wallet.save();
    }

    // Create transaction record for account creation
    await Transaction.create({
      userId: userId,
      walletId: wallet._id,
      previousBalance: wallet.balance,
      newBalance: wallet.balance,
      type: 'credit',
      amount: 0,
      description: 'Paystack virtual account created',
      reference: `ACCT-${Date.now()}`,
      status: 'completed',
      category: 'funding', // ✅ FIXED
      gateway: {
        provider: 'paystack',
        gatewayReference: `ACCT-${Date.now()}`
      },
      metadata: {
        action: 'account_creation',
        accountNumber: accountData.account_number,
        bank: accountData.bank.name
      }
    });

    res.status(201).json({
      success: true,
      message: 'Paystack virtual account created successfully',
      data: {
        accountNumber: accountData.account_number,
        accountName: accountData.account_name,
        bankName: accountData.bank.name,
        customerId: customerId,
        note: 'Fund this account to credit your wallet automatically'
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
    
    const paystackAccount = await PaystackAccount.findOne({ 
      userId: req.user.id 
    });
    
    if (!paystackAccount) {
      return res.status(404).json({
        success: false,
        message: 'No Paystack virtual account found'
      });
    }

    // Get recent transactions for this account
    const recentTransactions = await Transaction.find({
      userId: req.user.id,
      'gateway.provider': 'paystack',
      status: 'completed'
    })
    .sort({ createdAt: -1 })
    .limit(5)
    .select('amount description reference createdAt');

    res.status(200).json({
      success: true,
      data: {
        accountNumber: paystackAccount.accountNumber,
        accountName: paystackAccount.accountName,
        bankName: paystackAccount.bankName,
        customerId: paystackAccount.customerId,
        isActive: paystackAccount.isActive,
        lastPayment: paystackAccount.lastPaymentDate ? {
          date: paystackAccount.lastPaymentDate,
          amount: paystackAccount.lastPaymentAmount,
          reference: paystackAccount.lastPaymentReference
        } : null,
        totalReceived: paystackAccount.totalReceived || 0,
        recentTransactions: recentTransactions
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

// 3. Verify Transaction
router.get('/verify/:reference', authenticate, async (req, res) => {
  try {
    const { reference } = req.params;
    console.log('📍 Verify Paystack transaction:', reference);
    
    // Check local database first
    const localTx = await Transaction.findOne({ reference });
    if (localTx) {
      console.log('✅ Found in local database');
      return res.status(200).json({
        success: true,
        source: 'local',
        data: localTx
      });
    }

    // Verify with Paystack
    const response = await axios.get(
      `${PAYSTACK_CONFIG.baseUrl}/transaction/verify/${reference}`,
      {
        headers: {
          'Authorization': `Bearer ${PAYSTACK_CONFIG.secretKey}`
        }
      }
    );

    const transactionData = response.data.data;
    console.log('✅ Paystack verification successful:', transactionData.status);

    res.status(200).json({
      success: true,
      source: 'paystack',
      data: {
        status: transactionData.status,
        amount: transactionData.amount / 100,
        reference: transactionData.reference,
        paidAt: transactionData.paid_at,
        channel: transactionData.channel,
        customerEmail: transactionData.customer?.email
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

// 4. Initialize Payment (for manual payments)
router.post('/initialize-payment', authenticate, async (req, res) => {
  try {
    const { amount, email } = req.body;
    const user = await User.findById(req.user.id);

    if (!amount || amount < 100) {
      return res.status(400).json({
        success: false,
        message: 'Minimum amount is ₦100'
      });
    }

    const response = await axios.post(
      `${PAYSTACK_CONFIG.baseUrl}/transaction/initialize`,
      {
        email: email || user.email,
        amount: amount * 100,
        callback_url: process.env.FRONTEND_URL ? 
          `${process.env.FRONTEND_URL}/payment/callback` : 
          `${req.protocol}://${req.get('host')}/api/paystack/callback`,
        metadata: {
          userId: user._id.toString(),
          purpose: 'wallet_funding',
          source: 'manual_payment'
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${PAYSTACK_CONFIG.secretKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    // Get or create wallet
    let wallet = await Wallet.findOne({ userId: user._id });
    if (!wallet) {
      wallet = new Wallet({
        userId: user._id,
        balance: 0,
        currency: 'NGN',
        isActive: true
      });
      await wallet.save();
    }

    // Create pending transaction
    await Transaction.create({
      userId: user._id,
      walletId: wallet._id,
      previousBalance: wallet.balance,
      newBalance: wallet.balance,
      type: 'credit',
      amount: amount,
      description: 'Manual wallet funding initiated',
      reference: response.data.data.reference,
      status: 'pending',
      category: 'funding', // ✅ FIXED
      gateway: {
        provider: 'paystack',
        gatewayReference: response.data.data.reference
      },
      metadata: {
        authorizationUrl: response.data.data.authorization_url,
        accessCode: response.data.data.access_code,
        initiatedAt: new Date()
      }
    });

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

// 5. Payment Callback Handler
router.get('/callback', async (req, res) => {
  try {
    const { reference, trxref } = req.query;
    const txReference = reference || trxref;
    
    if (!txReference) {
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/payment?error=no_reference`);
    }

    console.log('📍 Payment callback received:', txReference);
    
    // Verify the transaction
    const response = await axios.get(
      `${PAYSTACK_CONFIG.baseUrl}/transaction/verify/${txReference}`,
      {
        headers: {
          'Authorization': `Bearer ${PAYSTACK_CONFIG.secretKey}`
        }
      }
    );

    const txData = response.data.data;
    
    if (txData.status === 'success') {
      // Update existing transaction
      await Transaction.findOneAndUpdate(
        { reference: txReference },
        {
          status: 'completed',
          metadata: {
            ...txData,
            callbackProcessed: true,
            callbackAt: new Date()
          }
        }
      );
      
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/payment?success=true&reference=${txReference}`);
    } else {
      await Transaction.findOneAndUpdate(
        { reference: txReference },
        { status: 'failed' }
      );
      
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/payment?error=payment_failed`);
    }
    
  } catch (error) {
    console.error('❌ Callback error:', error.message);
    return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/payment?error=verification_failed`);
  }
});

// Test endpoint
router.get('/test', (req, res) => {
  console.log('📍 Paystack test endpoint hit');
  res.json({
    success: true,
    message: 'Paystack routes are working!',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    config: {
      hasSecretKey: !!PAYSTACK_CONFIG.secretKey,
      hasPublicKey: !!PAYSTACK_CONFIG.publicKey
    },
    routes: [
      'POST /api/paystack/create-virtual-account',
      'GET /api/paystack/user-account',
      'POST /api/paystack/webhook',
      'GET /api/paystack/verify/:reference',
      'POST /api/paystack/initialize-payment',
      'GET /api/paystack/callback',
      'GET /api/paystack/test'
    ]
  });
});

console.log('✅ Paystack routes initialized with enhanced webhook');

module.exports = router;