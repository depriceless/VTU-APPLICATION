const express = require('express');
const router = express.Router();
const axios = require('axios');
const mongoose = require('mongoose');
const { authenticate } = require('../middleware/auth');
const User = require('../models/User');
const Wallet = require('../models/Wallet');
const Transaction = require('../models/Transaction');

// ============================================
// PAYSTACK CONFIGURATION
// ============================================
const PAYSTACK_CONFIG = {
  baseURL: 'https://api.paystack.co',
  secretKey: process.env.PAYSTACK_SECRET_KEY,
  headers: {
    'Authorization': `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
    'Content-Type': 'application/json'
  }
};

// ============================================
// UTILITY: Detect Reference Type (FIXED - IMPROVED)
// ============================================
function detectReferenceType(reference) {
  const ref = String(reference).trim();
  
  console.log(`🔍 Detecting reference type for: ${ref}`);
  
  // 1. Paystack transaction references (starts with T_)
  if (ref.match(/^T_[a-zA-Z0-9]{10,}$/i)) {
    console.log(`   → Type: Paystack transaction reference (T_ format)`);
    return { type: 'paystack_transaction', pattern: 'T_xxx format' };
  }
  
  // 2. Paystack NUMERIC transaction IDs (15-30 digits)
  if (ref.match(/^[0-9]{15,30}$/)) {
    console.log(`   → Type: Paystack numeric transaction ID`);
    return { type: 'paystack_numeric_id', pattern: 'numeric transaction ID' };
  }
  
  // 3. Paystack session IDs (for bank transfers)
  if (ref.match(/^[a-zA-Z0-9_-]{15,50}$/)) {
    console.log(`   → Type: Paystack session ID`);
    return { type: 'paystack_session', pattern: 'session ID' };
  }
  
  // 4. Bank transfer references (long numbers from banks - usually > 30 digits)
  if (ref.match(/^[0-9]{30,}$/)) {
    console.log(`   → Type: Bank transfer reference`);
    return { type: 'bank_transfer_reference', pattern: 'bank reference number' };
  }
  
  // 5. Short numeric IDs (8-15 digits)
  if (ref.match(/^[0-9]{8,15}$/)) {
    console.log(`   → Type: Paystack short numeric ID`);
    return { type: 'paystack_short_id', pattern: 'short numeric ID' };
  }
  
  // 6. Other alphanumeric references
  if (ref.match(/^[a-zA-Z0-9]{10,20}$/)) {
    console.log(`   → Type: Paystack alphanumeric reference`);
    return { type: 'paystack_alphanumeric', pattern: 'alphanumeric' };
  }
  
  console.log(`   → Type: Unknown format`);
  return { type: 'unknown', pattern: 'unrecognized format' };
}

// ============================================
// UTILITY: Check if Already Credited
// ============================================
async function checkIfAlreadyCredited(userId, userSubmittedReference) {
  console.log(`\n🔒 CHECKING IF ALREADY CREDITED...`);
  console.log(`   User ID: ${userId}`);
  console.log(`   Reference: ${userSubmittedReference}`);
  
  // Method 1: Check by user-submitted reference
  const existingBySubmitted = await Transaction.findOne({
    userId: userId,
    'metadata.userSubmittedReference': userSubmittedReference,
    status: 'completed'
  });
  
  if (existingBySubmitted) {
    console.log(`   ❌ ALREADY CREDITED via user-submitted reference`);
    return {
      isDuplicate: true,
      transaction: existingBySubmitted,
      matchType: 'user_submitted_reference'
    };
  }
  
  console.log(`   ✅ Not yet credited`);
  return { isDuplicate: false };
}

// ============================================
// UTILITY: Resolve Numeric Transaction ID (NEW)
// ============================================
async function resolveNumericTransactionId(reference, amount, paymentDate) {
  console.log(`\n🔢 PAYSTACK NUMERIC ID RESOLUTION`);
  console.log(`   Numeric ID: ${reference}`);
  console.log(`   Amount: ₦${amount}`);
  console.log(`   Date: ${paymentDate}`);
  
  const results = {
    tried: [],
    success: false,
    data: null,
    method: null,
    error: null
  };

  // METHOD 1: Try direct verification with numeric ID
  try {
    console.log('   📍 Method 1: Direct verification with numeric ID...');
    
    const response = await axios.get(
      `${PAYSTACK_CONFIG.baseURL}/transaction/verify/${reference}`,
      { headers: PAYSTACK_CONFIG.headers }
    );
    
    results.tried.push({ method: 'numeric_id_verify', status: response.status });
    
    if (response.data?.status && response.data?.data) {
      console.log('   ✅ Found via direct numeric ID verification!');
      
      // Validate transaction
      const txData = response.data.data;
      if (txData.status !== 'success') {
        console.log(`   ❌ Transaction status is '${txData.status}', not 'success'`);
        return {
          success: false,
          tried: results.tried,
          data: null,
          method: null,
          error: `Transaction is ${txData.status} in Paystack`
        };
      }
      
      const txAmount = txData.amount / 100;
      if (Math.abs(txAmount - amount) > 1) {
        console.log(`   ❌ Amount mismatch: Paystack shows ₦${txAmount}, user entered ₦${amount}`);
        return {
          success: false,
          tried: results.tried,
          data: null,
          method: null,
          error: `Amount mismatch. Paystack shows ₦${txAmount}`
        };
      }
      
      results.success = true;
      results.data = txData;
      results.method = 'numeric_id_verify';
      return results;
    }
  } catch (error) {
    console.log(`   ❌ Numeric ID verification failed: ${error.response?.status || error.message}`);
    results.tried.push({ 
      method: 'numeric_id_verify', 
      error: error.response?.status || error.message,
      paystackMessage: error.response?.data?.message
    });
  }

  // METHOD 2: Search transactions for this ID
  try {
    console.log('   📍 Method 2: Searching transactions...');
    
    const response = await axios.get(
      `${PAYSTACK_CONFIG.baseURL}/transaction`,
      {
        headers: PAYSTACK_CONFIG.headers,
        params: {
          perPage: 200,
          status: 'success'
        }
      }
    );
    
    results.tried.push({ method: 'recent_search', status: response.status });
    
    if (response.data?.status && response.data?.data?.length > 0) {
      console.log(`   Found ${response.data.data.length} transactions`);
      
      // Look for ID match in various fields
      const match = response.data.data.find(t => 
        String(t.id) === String(reference) ||
        String(t.reference) === String(reference) ||
        (t.metadata && t.metadata.transaction_id === reference)
      );
      
      if (match) {
        console.log('   ✅ Found matching transaction!');
        
        // Validate match
        if (match.status !== 'success') {
          console.log(`   ❌ Transaction status is '${match.status}', not 'success'`);
          return {
            success: false,
            tried: results.tried,
            data: null,
            method: null,
            error: `Transaction is ${match.status} in Paystack`
          };
        }
        
        const txAmount = match.amount / 100;
        if (Math.abs(txAmount - amount) > 1) {
          console.log(`   ❌ Amount mismatch: Paystack shows ₦${txAmount}, user entered ₦${amount}`);
          return {
            success: false,
            tried: results.tried,
            data: null,
            method: null,
            error: `Amount mismatch. Paystack shows ₦${txAmount}`
          };
        }
        
        results.success = true;
        results.data = match;
        results.method = 'recent_search_match';
        return results;
      }
    }
  } catch (error) {
    console.log(`   ❌ Transaction search failed: ${error.response?.status || error.message}`);
    results.tried.push({ 
      method: 'recent_search', 
      error: error.response?.status || error.message 
    });
  }

  // METHOD 3: Search by amount and date (as fallback)
  try {
    console.log('   📍 Method 3: Searching by amount and date...');
    
    if (!paymentDate) {
      console.log('   ⚠️ Skipping - payment date required');
    } else {
      const date = new Date(paymentDate);
      const searchParams = new URLSearchParams({
        perPage: 50,
        amount: amount * 100,
        status: 'success',
        from: date.toISOString().split('T')[0],
        to: date.toISOString().split('T')[0]
      });
      
      const response = await axios.get(
        `${PAYSTACK_CONFIG.baseURL}/transaction?${searchParams}`,
        { headers: PAYSTACK_CONFIG.headers }
      );
      
      results.tried.push({ method: 'amount_date_search', status: response.status });
      
      if (response.data?.status && response.data?.data?.length > 0) {
        console.log(`   Found ${response.data.data.length} transaction(s) matching amount and date`);
        
        if (response.data.data.length === 1) {
          console.log('   ✅ Found single transaction matching amount and date!');
          const match = response.data.data[0];
          
          // Additional validation
          if (match.customer?.email) {
            console.log(`   Customer Email: ${match.customer.email}`);
          }
          
          results.success = true;
          results.data = match;
          results.method = 'amount_date_single_match';
          return results;
        } else if (response.data.data.length > 1) {
          console.log('   ⚠️ Multiple transactions match amount and date');
          results.success = true;
          results.data = response.data.data;
          results.method = 'amount_date_multiple_matches';
          return results;
        }
      }
    }
  } catch (error) {
    console.log(`   ❌ Amount/date search failed: ${error.response?.status || error.message}`);
    results.tried.push({ 
      method: 'amount_date_search', 
      error: error.response?.status || error.message 
    });
  }

  console.log('   ❌ Could not resolve numeric transaction ID');
  results.error = 'No matching transaction found with this ID';
  return results;
}

// ============================================
// UTILITY: Resolve Bank Transfer Reference
// ============================================
async function resolveBankTransferByReference(bankReference, amount, paymentDate) {
  console.log(`\n🏦 BANK TRANSFER RESOLUTION`);
  console.log(`   Bank Reference: ${bankReference}`);
  console.log(`   Amount: ₦${amount}`);
  console.log(`   Date: ${paymentDate}`);
  
  const results = {
    tried: [],
    success: false,
    data: null,
    method: null,
    error: null
  };

  try {
    console.log('   📍 Searching for bank transfer...');
    
    // Search recent transactions
    const response = await axios.get(
      `${PAYSTACK_CONFIG.baseURL}/transaction`,
      {
        headers: PAYSTACK_CONFIG.headers,
        params: {
          perPage: 100,
          status: 'success'
        }
      }
    );
    
    if (response.data?.status && response.data?.data?.length > 0) {
      // Look for bank reference in various fields
      const match = response.data.data.find(t => 
        String(t.session_id) === String(bankReference) ||
        (t.metadata && t.metadata.bank_reference === bankReference) ||
        String(t.reference).includes(bankReference.substring(0, 10))
      );
      
      if (match) {
        console.log('   ✅ Found matching bank transfer!');
        
        // Validate
        const txAmount = match.amount / 100;
        if (Math.abs(txAmount - amount) > 1) {
          console.log(`   ❌ Amount mismatch: ₦${txAmount} vs ₦${amount}`);
          return {
            success: false,
            tried: results.tried,
            data: null,
            method: null,
            error: `Amount mismatch. Found ₦${txAmount}`
          };
        }
        
        results.success = true;
        results.data = match;
        results.method = 'bank_transfer_match';
        return results;
      }
    }
  } catch (error) {
    console.log(`   ❌ Bank transfer search failed: ${error.message}`);
  }

  console.log('   ❌ No matching bank transfer found');
  results.error = 'No matching bank transfer found';
  return results;
}

// ============================================
// UTILITY: Try Multiple Paystack Endpoints
// ============================================
async function tryResolvePaystackReference(reference, amount, paymentDate) {
  const ref = String(reference).trim();
  const refType = detectReferenceType(reference);
  
  console.log(`\n🔍 PAYSTACK RESOLUTION`);
  console.log(`   Reference: ${ref}`);
  console.log(`   Type: ${refType.type} (${refType.pattern})`);
  console.log(`   Amount: ₦${amount}`);
  console.log(`   Date: ${paymentDate}`);
  
  // Route to appropriate resolver based on reference type
  switch (refType.type) {
    case 'paystack_numeric_id':
      return await resolveNumericTransactionId(reference, amount, paymentDate);
    
    case 'bank_transfer_reference':
      return await resolveBankTransferByReference(reference, amount, paymentDate);
    
    case 'paystack_session':
      // Session IDs can be verified directly
      break;
    
    default:
      // Continue with standard verification
      break;
  }
  
  const results = {
    tried: [],
    success: false,
    data: null,
    method: null,
    error: null,
    paystackMessage: null
  };

  // STANDARD VERIFICATION
  try {
    console.log('   📍 Standard transaction verification...');
    const response = await axios.get(
      `${PAYSTACK_CONFIG.baseURL}/transaction/verify/${ref}`,
      { headers: PAYSTACK_CONFIG.headers }
    );
    
    results.tried.push({ method: 'transaction_verify', status: response.status });
    
    if (response.data?.status && response.data?.data) {
      console.log('   ✅ Found via standard verification!');
      
      const txData = response.data.data;
      
      // Validate status
      if (txData.status !== 'success') {
        console.log(`   ❌ Transaction status is '${txData.status}'`);
        return {
          success: false,
          tried: results.tried,
          data: null,
          method: null,
          error: `Transaction is ${txData.status} in Paystack`
        };
      }
      
      // Validate amount
      const txAmount = txData.amount / 100;
      if (Math.abs(txAmount - amount) > 1) {
        console.log(`   ❌ Amount mismatch: ₦${txAmount} vs ₦${amount}`);
        return {
          success: false,
          tried: results.tried,
          data: null,
          method: null,
          error: `Amount mismatch. Paystack shows ₦${txAmount}`
        };
      }
      
      results.success = true;
      results.data = txData;
      results.method = 'transaction_verify';
      return results;
    }
  } catch (error) {
    console.log(`   ❌ Verification failed: ${error.response?.status || error.message}`);
    results.tried.push({ 
      method: 'transaction_verify', 
      error: error.response?.status || error.message,
      paystackMessage: error.response?.data?.message
    });
    
    if (error.response?.status === 404 || error.response?.status === 400) {
      return {
        success: false,
        tried: results.tried,
        data: null,
        method: null,
        error: 'Invalid transaction reference',
        paystackMessage: error.response?.data?.message
      };
    }
  }

  console.log('   ❌ Resolution failed');
  results.error = 'Unable to verify transaction with Paystack';
  return results;
}

// ============================================
// ENDPOINT: Resolve Payment (UPDATED)
// ============================================
router.post('/resolve-payment', authenticate, async (req, res) => {
  try {
    const { reference, amount, paymentDate, forceExactMatch } = req.body;
    const userId = req.user.id;

    console.log('\n' + '='.repeat(80));
    console.log('🚀 PAYMENT RESOLUTION REQUEST');
    console.log('='.repeat(80));
    console.log(`User ID: ${userId}`);
    console.log(`Reference: ${reference}`);
    console.log(`Amount: ₦${amount}`);
    console.log(`Date: ${paymentDate}`);
    console.log(`Force Exact Match: ${forceExactMatch || false}`);

    // Validate input
    if (!reference || !amount) {
      return res.status(400).json({
        success: false,
        message: 'Reference and amount are required'
      });
    }

    if (!paymentDate) {
      return res.status(400).json({
        success: false,
        message: 'Payment date is required'
      });
    }

    if (parseFloat(amount) <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Amount must be greater than 0'
      });
    }

    // STEP 1: Duplicate check
    const duplicateCheck = await checkIfAlreadyCredited(userId, reference);
    
    if (duplicateCheck.isDuplicate) {
      console.log('❌ DUPLICATE DETECTED');
      return res.status(400).json({
        success: false,
        message: 'This payment has already been credited to your wallet',
        isDuplicate: true
      });
    }

    // STEP 2: Resolve transaction
    let resolutionResult;
    const refType = detectReferenceType(reference);

    if (forceExactMatch) {
      console.log('\n🎯 FORCE EXACT MATCH MODE');
      
      // Try direct verification first
      try {
        const response = await axios.get(
          `${PAYSTACK_CONFIG.baseURL}/transaction/verify/${reference}`,
          { headers: PAYSTACK_CONFIG.headers }
        );
        
        if (response.data?.status && response.data?.data) {
          const txData = response.data.data;
          
          // Validate
          if (txData.status !== 'success') {
            return res.status(400).json({
              success: false,
              message: `Transaction is ${txData.status} in Paystack`
            });
          }
          
          const txAmount = txData.amount / 100;
          if (Math.abs(txAmount - amount) > 1) {
            return res.status(400).json({
              success: false,
              message: `Amount mismatch. Paystack shows ₦${txAmount}`
            });
          }
          
          resolutionResult = {
            success: true,
            data: txData,
            method: 'force_exact_verify'
          };
        }
      } catch (error) {
        return res.status(404).json({
          success: false,
          message: 'Could not verify transaction with Paystack',
          error: error.response?.data?.message
        });
      }
    } else {
      // Regular resolution based on reference type
      if (refType.type === 'paystack_numeric_id') {
        resolutionResult = await resolveNumericTransactionId(reference, amount, paymentDate);
      } else if (refType.type === 'bank_transfer_reference') {
        resolutionResult = await resolveBankTransferByReference(reference, amount, paymentDate);
      } else {
        resolutionResult = await tryResolvePaystackReference(reference, amount, paymentDate);
      }
    }

    // Check if resolution failed
    if (!resolutionResult.success) {
      console.log('\n❌ RESOLUTION FAILED:', resolutionResult.error);
      
      let errorMessage = resolutionResult.error || 'Unable to find transaction';
      let statusCode = 404;
      
      if (resolutionResult.error === 'Invalid transaction reference') {
        errorMessage = 'Invalid transaction reference';
      } else if (resolutionResult.error?.includes('Amount mismatch')) {
        errorMessage = resolutionResult.error;
        statusCode = 400;
      } else if (resolutionResult.error?.includes('Transaction is')) {
        errorMessage = `Payment ${resolutionResult.error.toLowerCase().replace('transaction is ', '')}`;
        statusCode = 400;
      }
      
      return res.status(statusCode).json({
        success: false,
        message: errorMessage,
        referenceType: refType.type,
        details: resolutionResult.paystackMessage
      });
    }

    // STEP 3: Handle multiple matches
    if (resolutionResult.method === 'amount_date_multiple_matches') {
      console.log('\n⚠️ MULTIPLE MATCHES FOUND');
      
      // Filter uncredited transactions
      const uncreditedMatches = [];
      for (const tx of resolutionResult.data) {
        const alreadyCredited = await Transaction.findOne({
          userId: userId,
          'metadata.paystackReference': tx.reference,
          status: 'completed'
        });
        
        if (!alreadyCredited) {
          uncreditedMatches.push(tx);
        }
      }
      
      if (uncreditedMatches.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'All matching transactions have already been credited'
        });
      }
      
      if (uncreditedMatches.length === 1) {
        resolutionResult.data = uncreditedMatches[0];
      } else {
        return res.json({
          success: true,
          multipleMatches: true,
          message: `Found ${uncreditedMatches.length} potential matches`,
          transactions: uncreditedMatches.map(t => ({
            reference: t.reference,
            amount: t.amount / 100,
            paidAt: t.paid_at,
            channel: t.channel,
            customerEmail: t.customer?.email
          }))
        });
      }
    }

    // STEP 4: Validate single match
    const paystackData = resolutionResult.data;
    const paystackAmount = paystackData.amount / 100;
    const paystackReference = paystackData.reference;

    console.log('\n✅ TRANSACTION RESOLVED');
    console.log(`   Paystack Reference: ${paystackReference}`);
    console.log(`   Amount: ₦${paystackAmount}`);
    console.log(`   Status: ${paystackData.status}`);
    console.log(`   Channel: ${paystackData.channel}`);
    
    if (paystackData.customer?.email) {
      console.log(`   Customer: ${paystackData.customer.email}`);
    }

    // Final amount check
    if (Math.abs(paystackAmount - amount) > 1) {
      return res.status(400).json({
        success: false,
        message: `Amount mismatch. Paystack shows ₦${paystackAmount}`,
        paystackAmount: paystackAmount
      });
    }

    // Final status check
    if (paystackData.status !== 'success') {
      return res.status(400).json({
        success: false,
        message: `Transaction is ${paystackData.status} in Paystack`
      });
    }

    // STEP 5: Final duplicate check
    const finalDuplicateCheck = await Transaction.findOne({
      userId: userId,
      'metadata.paystackReference': paystackReference,
      status: 'completed'
    });

    if (finalDuplicateCheck) {
      return res.status(400).json({
        success: false,
        message: 'This transaction has already been credited',
        isDuplicate: true
      });
    }

    // STEP 6: Credit wallet
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      console.log('\n💰 CREDITING WALLET...');
      
      let wallet = await Wallet.findOne({ userId: userId }).session(session);
      
      if (!wallet) {
        throw new Error('Wallet not found');
      }

      const previousBalance = wallet.balance;
      const newBalance = previousBalance + amount;

      // Update wallet
      wallet.balance = newBalance;
      wallet.lastTransactionDate = new Date();
      wallet.stats.totalCredits += amount;
      wallet.stats.depositCount += 1;
      wallet.stats.totalDeposits += amount;
      wallet.stats.transactionCount += 1;
      
      await wallet.save({ session });
      console.log(`   Balance updated: ₦${previousBalance} → ₦${newBalance}`);

      // Create transaction record
      const transaction = new Transaction({
        userId: userId,
        walletId: wallet._id,
        type: 'credit',
        amount: amount,
        previousBalance: previousBalance,
        newBalance: newBalance,
        status: 'completed',
        category: 'funding',
        description: `Paystack payment - ${paystackData.channel}`,
        reference: `TXN_${Date.now()}`,
        metadata: {
          paystackReference: paystackReference,
          paystackTransactionId: paystackData.id,
          paystackAmount: paystackAmount,
          paystackChannel: paystackData.channel,
          paystackStatus: paystackData.status,
          paymentDate: paymentDate,
          userSubmittedReference: reference,
          customerEmail: paystackData.customer?.email,
          creditedAt: new Date()
        }
      });
      await transaction.save({ session });
      console.log(`   Transaction created: ${transaction._id}`);

      await session.commitTransaction();
      
      console.log('\n✅ PAYMENT COMPLETED SUCCESSFULLY');
      console.log('='.repeat(80));

      res.json({
        success: true,
        message: 'Payment resolved and wallet credited',
        data: {
          amount: amount,
          previousBalance: previousBalance,
          newBalance: newBalance,
          paystackReference: paystackReference,
          transactionId: transaction._id
        }
      });

    } catch (error) {
      await session.abortTransaction();
      console.error('Wallet credit failed:', error);
      throw error;
    } finally {
      session.endSession();
    }

  } catch (error) {
    console.error('\n❌ RESOLUTION ERROR:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing payment',
      error: error.message
    });
  }
});

// ============================================
// OTHER ENDPOINTS (Keep as is)
// ============================================

router.post('/search-by-details', authenticate, async (req, res) => {
  try {
    const { amount, paymentDate, email } = req.body;
    const userId = req.user.id;

    if (!amount || !paymentDate) {
      return res.status(400).json({
        success: false,
        message: 'Amount and payment date are required'
      });
    }

    const searchParams = new URLSearchParams({
      perPage: 50,
      amount: amount * 100,
      status: 'success'
    });

    const date = new Date(paymentDate);
    searchParams.append('from', date.toISOString().split('T')[0]);
    searchParams.append('to', date.toISOString().split('T')[0]);

    const response = await axios.get(
      `${PAYSTACK_CONFIG.baseURL}/transaction?${searchParams}`,
      { headers: PAYSTACK_CONFIG.headers }
    );

    if (response.data?.status && response.data?.data?.length > 0) {
      let transactions = response.data.data;

      if (email) {
        transactions = transactions.filter(t => 
          t.customer?.email?.toLowerCase() === email.toLowerCase()
        );
      }

      // Filter out already credited transactions
      const uncreditedTransactions = [];
      for (const tx of transactions) {
        const alreadyCredited = await Transaction.findOne({
          userId: userId,
          'metadata.paystackReference': tx.reference,
          status: 'completed'
        });
        
        if (!alreadyCredited) {
          uncreditedTransactions.push(tx);
        }
      }

      res.json({
        success: true,
        transactions: uncreditedTransactions.map(t => ({
          reference: t.reference,
          amount: t.amount / 100,
          paidAt: t.paid_at,
          channel: t.channel,
          customerEmail: t.customer?.email
        }))
      });
    } else {
      res.json({
        success: true,
        transactions: []
      });
    }

  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({
      success: false,
      message: 'Error searching transactions'
    });
  }
});

router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Paystack Resolution API - ENHANCED',
    version: '3.0.0',
    features: [
      '✅ Enhanced reference type detection',
      '✅ Numeric transaction ID support',
      '✅ Better bank transfer resolution',
      '✅ Improved error messages',
      '✅ Multi-layer duplicate prevention'
    ]
  });
});

console.log('✅ Paystack Resolution API Enhanced');

module.exports = router;