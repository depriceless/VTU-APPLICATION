const express = require('express');
const router = express.Router();
const axios = require('axios');
const { authenticate } = require('../middleware/auth');
const Balance = require('../models/Balance');
const User = require('../models/User');

// Gateway Configuration
const ACTIVE_CARD_GATEWAY = process.env.ACTIVE_CARD_GATEWAY || 'paystack'; // 'paystack' or 'monnify'

const PAYSTACK_CONFIG = {
  secretKey: process.env.PAYSTACK_SECRET_KEY,
  publicKey: process.env.PAYSTACK_PUBLIC_KEY,
  baseUrl: 'https://api.paystack.co'
};

const MONNIFY_CONFIG = {
  apiKey: process.env.MONNIFY_API_KEY,
  secretKey: process.env.MONNIFY_SECRET_KEY,
  contractCode: process.env.MONNIFY_CONTRACT_CODE,
  baseUrl: process.env.MONNIFY_BASE_URL || 'https://sandbox.monnify.com'
};

console.log('💳 Card Payment Route initialized');
console.log('🔑 Active Card Gateway:', ACTIVE_CARD_GATEWAY);
console.log('🔑 Paystack:', {
  hasKey: !!PAYSTACK_CONFIG.secretKey,
  keyPrefix: PAYSTACK_CONFIG.secretKey ? PAYSTACK_CONFIG.secretKey.substring(0, 8) : 'MISSING'
});
console.log('🔑 Monnify:', {
  hasApiKey: !!MONNIFY_CONFIG.apiKey,
  hasSecretKey: !!MONNIFY_CONFIG.secretKey
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

// Credit wallet helper function
async function creditWallet(userId, amount, reference, gateway) {
  const balance = await Balance.findOne({ userId });
  if (!balance) {
    throw new Error('Balance document not found');
  }

  const previousBalance = balance.balance;
  balance.balance += amount;
  balance.lastTransactionDate = new Date();
  
  if (balance.stats) {
    balance.stats.totalDeposits = (balance.stats.totalDeposits || 0) + amount;
    balance.stats.depositCount = (balance.stats.depositCount || 0) + 1;
  }
  
  await balance.save();

  console.log('✅ ========== WALLET CREDITED ==========');
  console.log(`   Gateway: ${gateway}`);
  console.log(`   User ID: ${userId}`);
  console.log(`   Amount: ₦${amount.toLocaleString()}`);
  console.log(`   Previous: ₦${previousBalance.toLocaleString()}`);
  console.log(`   New Balance: ₦${balance.balance.toLocaleString()}`);
  console.log(`   Reference: ${reference}`);
  console.log('=======================================');

  return balance.balance;
}

// Paystack card payment
async function processPaystackPayment(user, amount, cardDetails) {
  console.log('💳 Processing via Paystack...');

  // Step 1: Initialize transaction
  const initResponse = await axios.post(
    `${PAYSTACK_CONFIG.baseUrl}/transaction/initialize`,
    {
      email: user.email,
      amount: amount * 100, // Convert to kobo
    },
    {
      headers: {
        'Authorization': `Bearer ${PAYSTACK_CONFIG.secretKey}`,
        'Content-Type': 'application/json'
      }
    }
  );

  const { reference } = initResponse.data.data;
  console.log('✅ Transaction initialized:', reference);

  // Step 2: Charge card
  const chargeResponse = await axios.post(
    `${PAYSTACK_CONFIG.baseUrl}/charge`,
    {
      email: user.email,
      amount: amount * 100,
      card: {
        number: cardDetails.card_number.replace(/\s/g, ''),
        cvv: cardDetails.cvv,
        expiry_month: cardDetails.expiry_month,
        expiry_year: cardDetails.expiry_year
      },
      reference: reference
    },
    {
      headers: {
        'Authorization': `Bearer ${PAYSTACK_CONFIG.secretKey}`,
        'Content-Type': 'application/json'
      }
    }
  );

  console.log('📊 Paystack charge status:', chargeResponse.data.status);
  const chargeData = chargeResponse.data.data;

  return {
    success: chargeResponse.data.status === 'success' && chargeData.status === 'success',
    status: chargeData.status,
    reference: reference,
    message: chargeData.gateway_response || chargeData.display_text,
    data: chargeData
  };
}

// Monnify card payment
async function processMonnifyPayment(user, amount, cardDetails) {
  console.log('💳 Processing via Monnify...');

  const token = await getMonnifyToken();
  const transactionReference = `CARD_${user._id}_${Date.now()}`;

  const response = await axios.post(
    `${MONNIFY_CONFIG.baseUrl}/api/v1/merchant/transactions/init-transaction`,
    {
      amount: amount,
      customerName: user.name,
      customerEmail: user.email,
      paymentReference: transactionReference,
      paymentDescription: 'Wallet funding',
      currencyCode: 'NGN',
      contractCode: MONNIFY_CONFIG.contractCode,
      redirectUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/payment/callback`,
      paymentMethods: ['CARD']
    },
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }
  );

  console.log('📊 Monnify response:', response.data.responseBody);
  const responseBody = response.data.responseBody;

  // Monnify typically returns a checkout URL for card payments
  // You'll need to handle the redirect or show iframe
  return {
    success: false, // Requires redirect/iframe
    status: 'pending',
    reference: transactionReference,
    checkoutUrl: responseBody.checkoutUrl,
    message: 'Redirect to payment page required',
    data: responseBody
  };
}

// Main payment route
router.post('/pay', authenticate, async (req, res) => {
  try {
    console.log('📍 Card payment endpoint hit');
    console.log('👤 User ID:', req.user.id);
    
    const userId = req.user.id || req.user.userId;
    const { amount, card_number, cvv, expiry_month, expiry_year } = req.body;

    // Validation
    if (!amount || !card_number || !cvv || !expiry_month || !expiry_year) {
      console.log('❌ Missing required fields');
      return res.status(400).json({
        success: false,
        message: 'All card details are required'
      });
    }

    if (amount < 100) {
      return res.status(400).json({
        success: false,
        message: 'Minimum amount is ₦100'
      });
    }

    // Get user details
    const user = await User.findById(userId);
    if (!user) {
      console.error('❌ User not found:', userId);
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    console.log('💳 Processing payment:', {
      gateway: ACTIVE_CARD_GATEWAY,
      amount: `₦${amount}`,
      email: user.email,
      cardLast4: card_number.slice(-4)
    });

    const cardDetails = { card_number, cvv, expiry_month, expiry_year };
    let result;

    // Process based on active gateway
    try {
      if (ACTIVE_CARD_GATEWAY === 'paystack') {
        result = await processPaystackPayment(user, amount, cardDetails);
      } else if (ACTIVE_CARD_GATEWAY === 'monnify') {
        result = await processMonnifyPayment(user, amount, cardDetails);
      } else {
        throw new Error('Invalid card gateway configured');
      }
    } catch (gatewayError) {
      console.error(`❌ ${ACTIVE_CARD_GATEWAY} failed:`, gatewayError.message);
      
      // Try fallback gateway
      const fallbackGateway = ACTIVE_CARD_GATEWAY === 'paystack' ? 'monnify' : 'paystack';
      console.log(`🔄 Trying fallback gateway: ${fallbackGateway}`);
      
      try {
        if (fallbackGateway === 'paystack' && PAYSTACK_CONFIG.secretKey) {
          result = await processPaystackPayment(user, amount, cardDetails);
        } else if (fallbackGateway === 'monnify' && MONNIFY_CONFIG.apiKey) {
          result = await processMonnifyPayment(user, amount, cardDetails);
        } else {
          throw new Error('No fallback gateway available');
        }
      } catch (fallbackError) {
        console.error('❌ Fallback also failed:', fallbackError.message);
        throw gatewayError; // Throw original error
      }
    }

    // Handle successful payment
    if (result.success) {
      const newBalance = await creditWallet(
        userId, 
        amount, 
        result.reference, 
        ACTIVE_CARD_GATEWAY
      );

      return res.status(200).json({
        success: true,
        status: 'success',
        message: 'Payment successful',
        data: {
          reference: result.reference,
          amount: amount,
          newBalance: newBalance,
          gateway: ACTIVE_CARD_GATEWAY
        }
      });
    }

    // Handle pending/redirect required
    if (result.checkoutUrl) {
      return res.status(200).json({
        success: false,
        status: 'redirect_required',
        message: 'Please complete payment on the payment page',
        data: {
          checkoutUrl: result.checkoutUrl,
          reference: result.reference
        }
      });
    }

    // Handle OTP or additional authentication
    if (result.status === 'send_otp' || result.status === 'send_pin') {
      return res.status(200).json({
        success: false,
        status: result.status,
        message: 'Additional authentication required',
        data: {
          reference: result.reference,
          display_text: result.message
        }
      });
    }

    // Payment failed
    console.log('❌ Payment failed:', result.message);
    return res.status(400).json({
      success: false,
      message: result.message || 'Payment failed',
      data: {
        reference: result.reference,
        status: result.status
      }
    });

  } catch (error) {
    console.error('❌ Card payment error:', error.message);
    console.error('❌ Error response:', error.response?.data);
    
    const errorMessage = error.response?.data?.message || error.message;
    
    res.status(500).json({
      success: false,
      message: errorMessage,
      error: process.env.NODE_ENV === 'production' 
        ? 'Payment processing failed' 
        : errorMessage
    });
  }
});

// Verify payment status
router.get('/verify/:reference', authenticate, async (req, res) => {
  try {
    console.log('📍 Verifying payment:', req.params.reference);
    
    // Try Paystack first
    try {
      const response = await axios.get(
        `${PAYSTACK_CONFIG.baseUrl}/transaction/verify/${req.params.reference}`,
        {
          headers: {
            'Authorization': `Bearer ${PAYSTACK_CONFIG.secretKey}`
          }
        }
      );

      console.log('✅ Paystack verification:', response.data.data.status);
      return res.status(200).json({
        success: true,
        gateway: 'paystack',
        data: response.data.data
      });
    } catch (paystackError) {
      console.log('⚠️ Not a Paystack transaction, trying Monnify...');
    }

    // Try Monnify
    const token = await getMonnifyToken();
    const response = await axios.get(
      `${MONNIFY_CONFIG.baseUrl}/api/v2/transactions/${encodeURIComponent(req.params.reference)}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );

    console.log('✅ Monnify verification:', response.data.responseBody.paymentStatus);
    res.status(200).json({
      success: true,
      gateway: 'monnify',
      data: response.data.responseBody
    });

  } catch (error) {
    console.error('❌ Verification error:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      message: 'Verification failed'
    });
  }
});

// Get active card gateway
router.get('/active-gateway', (req, res) => {
  res.json({
    success: true,
    activeGateway: ACTIVE_CARD_GATEWAY,
    availableGateways: {
      paystack: !!PAYSTACK_CONFIG.secretKey,
      monnify: !!(MONNIFY_CONFIG.apiKey && MONNIFY_CONFIG.secretKey)
    }
  });
});

// Test endpoint
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Card payment routes are working!',
    activeGateway: ACTIVE_CARD_GATEWAY,
    timestamp: new Date().toISOString()
  });
});

module.exports = router;