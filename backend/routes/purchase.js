// routes/purchase.js - FIXED VERSION
const express = require('express');
const router = express.Router();
const axios = require('axios');
const { authenticate } = require('../middleware/auth');
const User = require('../models/User');
const Wallet = require('../models/Wallet');
const Transaction = require('../models/Transaction');
const ServiceConfig = require('../models/ServiceConfig');
const { calculateCustomerPrice, validateCustomerPrice } = require('../config/pricing');
const { getEducationService } = require('../config/cableTVPackages');

// ClubKonnect Configuration
const CK_CONFIG = {
  userId: process.env.CLUBKONNECT_USER_ID,
  apiKey: process.env.CLUBKONNECT_API_KEY,
  baseUrl: process.env.CLUBKONNECT_BASE_URL || 'https://www.nellobytesystems.com'
};

// Network code mapping
const NETWORK_CODES = {
  'MTN': '01',
  'GLO': '02',
  'AIRTEL': '04',
  '9MOBILE': '03'
};

// Electricity company codes
const ELECTRICITY_COMPANY_CODES = {
  '01': '01', '02': '02', '03': '03', '04': '04',
  '05': '05', '06': '06', '07': '07', '08': '08',
  '09': '09', '10': '10', '11': '11', '12': '12'
};

// Helper function for ClubKonnect API calls
const makeClubKonnectRequest = async (endpoint, params) => {
  try {
    const queryParams = new URLSearchParams({
      UserID: CK_CONFIG.userId,
      APIKey: CK_CONFIG.apiKey,
      ...params
    });
    
    const url = `${CK_CONFIG.baseUrl}${endpoint}?${queryParams}`;
    console.log('ClubKonnect Request URL:', url);
    console.log('ClubKonnect Request Params:', params);
    
    const response = await axios.get(url, {
      timeout: 30000,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
    
    console.log('ClubKonnect Raw Response Status:', response.status);
    console.log('ClubKonnect Raw Response Data:', response.data);
    
    let data = response.data;
    if (typeof data === 'string') {
      try {
        data = JSON.parse(data);
      } catch (e) {
        console.error('JSON Parse Error:', e.message);
        throw new Error(`Invalid response format: ${data}`);
      }
    }
    
    if (data.status) {
      const errorStatuses = [
        'INVALID_CREDENTIALS', 'MISSING_CREDENTIALS', 'MISSING_USERID',
        'MISSING_APIKEY', 'MISSING_MOBILENETWORK', 'MISSING_AMOUNT',
        'INVALID_AMOUNT', 'MINIMUM_50', 'MINIMUM_200000',
        'INVALID_RECIPIENT', 'ORDER_FAILED'
      ];
      
      if (errorStatuses.includes(data.status)) {
        console.error('ClubKonnect Error Status:', data.status);
        throw new Error(data.status.replace(/_/g, ' ').toLowerCase());
      }
    }
    
    return data;
  } catch (error) {
    console.error('=== ClubKonnect API Error ===');
    console.error('Error Name:', error.name);
    console.error('Error Message:', error.message);
    console.error('Error Code:', error.code);
    if (error.response) {
      console.error('Response Status:', error.response.status);
      console.error('Response Data:', error.response.data);
    }
    
    if (error.name === 'TypeError' && error.message.includes('Network request failed')) {
      throw new Error('Network connection failed. Please check your internet connection.');
    }
    
    if (error.code === 'ECONNABORTED') {
      throw new Error('Request timeout. Please try again.');
    }

    throw error;
  }
};

// Service validation
const validateServiceAvailability = async (serviceType) => {
  try {
    let normalizedServiceType = serviceType.toLowerCase();
    const serviceTypeMapping = {
      'fund_betting': 'fund_betting',
      'betting': 'fund_betting',
      'cable_tv': 'cable_tv',
      'print_recharge': 'print_recharge'
    };
    
    if (serviceTypeMapping[normalizedServiceType]) {
      normalizedServiceType = serviceTypeMapping[normalizedServiceType];
    }
    
    const service = await ServiceConfig.findOne({ serviceType: normalizedServiceType });
    
    if (!service || !service.isActive || service.maintenanceMode) {
      return {
        available: false,
        reason: service?.maintenanceMessage || `${serviceType} service is currently unavailable`
      };
    }
    
    return { available: true };
  } catch (error) {
    return { available: false, reason: `${serviceType} service is currently unavailable` };
  }
};

// PIN attempt tracking
const pinAttempts = new Map();
const PIN_CONFIG = {
  MAX_ATTEMPTS: 3,
  LOCK_DURATION: 15 * 60 * 1000
};

const getPinAttemptData = (userId) => {
  if (!pinAttempts.has(userId)) {
    pinAttempts.set(userId, { attempts: 0, lockedUntil: null, lastAttempt: null });
  }
  return pinAttempts.get(userId);
};

const resetPinAttempts = (userId) => {
  pinAttempts.set(userId, { attempts: 0, lockedUntil: null, lastAttempt: null });
};

// ========== GET ROUTES ==========

router.get('/test', (req, res) => {
  console.log('TEST ROUTE HIT - No auth');
  res.json({ success: true, message: 'Purchase router is working' });
});

router.get('/test-auth', authenticate, (req, res) => {
  console.log('TEST AUTH ROUTE HIT - With auth');
  res.json({ success: true, message: 'Purchase router with auth is working' });
});

router.get('/pin-status', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('+pin');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const isPinSet = Boolean(user.pin && user.isPinSetup);
    const attemptData = getPinAttemptData(req.user.userId);
    const now = new Date();

    let isLocked = false;
    let lockTimeRemaining = 0;

    if (attemptData.lockedUntil && now < attemptData.lockedUntil) {
      isLocked = true;
      lockTimeRemaining = Math.ceil((attemptData.lockedUntil - now) / (1000 * 60));
    } else if (attemptData.lockedUntil && now >= attemptData.lockedUntil) {
      resetPinAttempts(req.user.userId);
    }

    res.json({
      success: true,
      isPinSet,
      hasPinSet: isPinSet,
      isLocked,
      lockTimeRemaining,
      attemptsRemaining: Math.max(0, PIN_CONFIG.MAX_ATTEMPTS - attemptData.attempts)
    });
  } catch (error) {
    console.error('PIN status error:', error);
    res.status(500).json({ success: false, message: 'Server error checking PIN status' });
  }
});

router.get('/history', authenticate, async (req, res) => {
  try {
    console.log('History endpoint hit for user:', req.user.userId);
    
    const transactions = await Transaction.find({
      userId: req.user.userId,
      serviceType: 'print_recharge'
    })
    .sort({ createdAt: -1 })
    .limit(50);

    console.log('Found transactions:', transactions.length);

    const formattedTransactions = transactions.map(tx => ({
      _id: tx._id,
      network: tx.metadata?.network || 'UNKNOWN',
      type: tx.metadata?.type || 'unknown',
      amount: tx.amount,
      quantity: tx.metadata?.quantity || 1,
      denomination: tx.metadata?.denomination || tx.amount,
      pins: tx.metadata?.pins || [],
      status: tx.status || 'completed',
      createdAt: tx.createdAt,
      balanceAfter: tx.balanceAfter || tx.newBalance || 0,
      reference: tx.reference
    }));

    res.json({
      success: true,
      data: { transactions: formattedTransactions }
    });
  } catch (error) {
    console.error('History error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch history'
    });
  }
});

router.get('/test-connection', authenticate, async (req, res) => {
  try {
    const response = await makeClubKonnectRequest('/APIWalletBalanceV1.asp', {});
    
    res.json({ 
      success: true, 
      message: 'ClubKonnect API is connected successfully',
      response 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'ClubKonnect connection failed',
      error: error.message
    });
  }
});

// ========== POST ROUTES ==========

router.post('/generate', authenticate, async (req, res) => {
  console.log('=== GENERATE ENDPOINT HIT ===');
  console.log('Request body:', req.body);
  
  try {
    const { network, type, denomination, quantity, pin } = req.body;

    if (!network || !type || !denomination || !quantity || !pin) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: network, type, denomination, quantity, pin'
      });
    }

    if (!/^\d{4}$/.test(pin)) {
      return res.status(400).json({
        success: false,
        message: 'PIN must be exactly 4 digits'
      });
    }

    const qty = parseInt(quantity);
    if (isNaN(qty) || qty < 1 || qty > 100) {
      return res.status(400).json({
        success: false,
        message: 'Quantity must be between 1 and 100'
      });
    }

    const user = await User.findById(req.user.userId).select('+pin');
    const wallet = await Wallet.findOne({ userId: req.user.userId });

    if (!user || !wallet) {
      return res.status(404).json({
        success: false,
        message: 'User or wallet not found'
      });
    }

    if (!user.pin || !user.isPinSetup) {
      return res.status(400).json({
        success: false,
        message: 'Transaction PIN not set. Please set up your PIN first.'
      });
    }

    const attemptData = getPinAttemptData(req.user.userId);
    const now = new Date();

    if (attemptData.lockedUntil && now < attemptData.lockedUntil) {
      const remainingMinutes = Math.ceil((attemptData.lockedUntil - now) / (1000 * 60));
      return res.status(423).json({
        success: false,
        message: `Account locked. Try again in ${remainingMinutes} minutes.`
      });
    }

    const isPinValid = await user.comparePin(pin);
    
    if (!isPinValid) {
      attemptData.attempts += 1;
      attemptData.lastAttempt = now;

      if (attemptData.attempts >= PIN_CONFIG.MAX_ATTEMPTS) {
        attemptData.lockedUntil = new Date(now.getTime() + PIN_CONFIG.LOCK_DURATION);
        return res.status(423).json({
          success: false,
          message: 'Invalid PIN. Account locked due to too many failed attempts.'
        });
      }

      return res.status(401).json({
        success: false,
        message: `Invalid PIN. ${PIN_CONFIG.MAX_ATTEMPTS - attemptData.attempts} attempts remaining.`
      });
    }

    resetPinAttempts(req.user.userId);

    const totalAmount = denomination * qty;
    if (wallet.balance < totalAmount) {
      return res.status(400).json({
        success: false,
        message: `Insufficient balance. Required: ₦${totalAmount.toLocaleString()}, Available: ₦${wallet.balance.toLocaleString()}`
      });
    }

    const result = await processPrintRechargePurchase({
      network,
      denomination,
      quantity: qty,
      amount: totalAmount,
      cardType: type,
      userId: req.user.userId
    });

    if (result.success) {
      const transactionResult = await wallet.debit(totalAmount, result.description, result.reference);
      
      await Transaction.create({
        userId: req.user.userId,
        type: 'debit',
        amount: totalAmount,
        description: result.description,
        reference: result.reference,
        status: 'completed',
        serviceType: 'print_recharge',
        metadata: {
          network: result.transactionData.network,
          type: result.transactionData.type,
          quantity: result.transactionData.quantity,
          denomination: result.transactionData.denomination,
          pins: result.transactionData.pins
        },
        balanceBefore: transactionResult.transaction.balanceBefore,
        balanceAfter: transactionResult.transaction.balanceAfter,
        newBalance: wallet.balance
      });

      return res.json({
        success: true,
        message: result.successMessage,
        pins: result.transactionData.pins,
        newBalance: {
          amount: wallet.balance,
          mainBalance: wallet.balance,
          totalBalance: wallet.balance,
          currency: 'NGN',
          lastUpdated: new Date().toISOString()
        }
      });
    } else {
      return res.status(400).json({
        success: false,
        message: result.errorMessage
      });
    }

  } catch (error) {
    console.error('Generate error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to generate recharge PINs'
    });
  }
});

router.post('/electricity/validate-meter', authenticate, async (req, res) => {
  try {
    const { meterNumber, provider } = req.body;

    if (!meterNumber || !provider) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: meterNumber, provider'
      });
    }

    if (!/^\d{10,13}$/.test(meterNumber)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid meter number format. Must be 10-13 digits.'
      });
    }

    const companyCode = ELECTRICITY_COMPANY_CODES[provider];
    if (!companyCode) {
      return res.status(400).json({
        success: false,
        message: 'Invalid electricity provider'
      });
    }

    const response = await makeClubKonnectRequest('/APIVerifyElectricityV1.asp', {
      ElectricCompany: companyCode,
      MeterNo: meterNumber
    });

    if (!response || !response.customer_name || 
        response.customer_name === '' || 
        response.customer_name === 'INVALID_METERNO' ||
        response.customer_name.toUpperCase().includes('INVALID')) {
      
      return res.status(400).json({
        success: false,
        message: 'Meter number not found. Please verify the meter number and selected provider.'
      });
    }

    res.json({
      success: true,
      message: 'Meter validation successful',
      data: {
        customerName: response.customer_name,
        customerAddress: response.address || response.customer_address || '',
        accountNumber: response.account_number || response.accountNumber || '',
        meterNumber: meterNumber,
        provider: companyCode
      }
    });

  } catch (error) {
    console.error('=== METER VALIDATION ERROR ===');
    console.error('Error Name:', error.name);
    console.error('Error Message:', error.message);
    console.error('Error Stack:', error.stack);
    
    res.status(500).json({
      success: false,
      message: error.message || 'Server error validating meter number.'
    });
  }
});

router.post('/internet/validate-customer', authenticate, async (req, res) => {
  try {
    const { customerNumber, provider } = req.body;

    console.log('=== INTERNET VALIDATION REQUEST ===');
    console.log('Provider:', provider);
    console.log('Customer Number:', customerNumber);

    if (!customerNumber || !provider) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: customerNumber, provider'
      });
    }

    if (provider.toLowerCase() !== 'smile') {
      return res.status(400).json({
        success: false,
        message: 'Only Smile is currently supported'
      });
    }

    try {
      const response = await makeClubKonnectRequest('/APIVerifySmileV1.asp', {
        MobileNetwork: 'smile-direct',
        MobileNumber: customerNumber
      });

      console.log('Smile Validation Response:', response);

      if (!response || !response.customer_name || 
          response.customer_name === 'INVALID_ACCOUNTNO' ||
          response.customer_name.toUpperCase().includes('INVALID')) {
        
        return res.status(400).json({
          success: false,
          message: 'Invalid Smile account number'
        });
      }

      return res.json({
        success: true,
        message: 'Customer validated successfully',
        data: {
          customerName: response.customer_name,
          customerNumber: customerNumber,
          provider: 'SMILE'
        }
      });

    } catch (apiError) {
      console.error('Validation API Error:', apiError);
      
      return res.json({
        success: true,
        message: 'Validation service unavailable, you can still proceed',
        data: {
          customerName: 'Smile Customer',
          customerNumber: customerNumber,
          provider: 'SMILE',
          warning: 'Could not verify account number'
        }
      });
    }

  } catch (error) {
    console.error('Internet validation error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error validating customer number'
    });
  }
});

router.post('/betting/validate-customer', authenticate, async (req, res) => {
  try {
    const { customerId, provider } = req.body;

    if (!customerId || !provider) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: customerId, provider'
      });
    }

    const providerMapping = {
      'bet9ja': 'BET9JA',
      'sportybet': 'SPORTYBET',
      'nairabet': 'NAIRABET',
      'betway': 'BETWAY',
      '1xbet': '1XBET',
      'betking': 'BETKING'
    };

    const bettingCompany = providerMapping[provider.toLowerCase()] || provider.toUpperCase();

    const response = await makeClubKonnectRequest('/APIVerifyBettingV1.asp', {
      BettingCompany: bettingCompany,
      CustomerID: customerId
    });

    if (!response || !response.customer_name || 
        response.customer_name.toLowerCase().includes('error') ||
        response.customer_name.toLowerCase().includes('invalid')) {
      
      return res.status(400).json({
        success: false,
        message: 'Invalid customer ID for this betting platform'
      });
    }

    res.json({
      success: true,
      message: 'Customer ID validated successfully',
      data: {
        customerName: response.customer_name,
        customerId: customerId,
        provider: bettingCompany
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error validating customer ID'
    });
  }
});

router.post('/', authenticate, async (req, res) => {
  console.log('PURCHASE ENDPOINT HIT');
  console.log('Request body:', req.body);
  
  try {
    const { type, amount, pin, ...serviceData } = req.body;

    if (!type || !amount || !pin) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: type, amount, pin'
      });
    }

    if (!/^\d{4}$/.test(pin)) {
      return res.status(400).json({ success: false, message: 'PIN must be exactly 4 digits' });
    }

    const serviceValidation = await validateServiceAvailability(type);
    if (!serviceValidation.available) {
      return res.status(400).json({ success: false, message: serviceValidation.reason });
    }

   const amountLimits = {
  airtime: { min: 50, max: 200000 },
  data: { min: 50, max: 500000 },
  electricity: { min: 100, max: 100000 },
  education: { min: 500, max: 1000000 },
  print_recharge: { min: 100, max: 50000 },
  recharge: { min: 100, max: 50000 },  // ← ADD THIS LINE
  transfer: { min: 100, max: 1000000 },
  internet: { min: 500, max: 200000 },
  fund_betting: { min: 100, max: 500000 },
  cable_tv: { min: 500, max: 50000 }
};
    const limits = amountLimits[type];
    if (amount < limits.min || amount > limits.max) {
      return res.status(400).json({
        success: false,
        message: `Amount must be between ₦${limits.min.toLocaleString()} and ₦${limits.max.toLocaleString()}`
      });
    }

    const user = await User.findById(req.user.userId).select('+pin');
    const wallet = await Wallet.findOne({ userId: req.user.userId });

    if (!user || !wallet) {
      return res.status(404).json({ success: false, message: 'User or wallet not found' });
    }

    if (!user.pin || !user.isPinSetup) {
      return res.status(400).json({
        success: false,
        message: 'Transaction PIN not set. Please set up your PIN first.'
      });
    }

    const attemptData = getPinAttemptData(req.user.userId);
    const now = new Date();

    if (attemptData.lockedUntil && now < attemptData.lockedUntil) {
      const remainingMinutes = Math.ceil((attemptData.lockedUntil - now) / (1000 * 60));
      return res.status(423).json({
        success: false,
        message: `Account locked. Try again in ${remainingMinutes} minutes.`
      });
    }

    const isPinValid = await user.comparePin(pin);

    if (!isPinValid) {
      attemptData.attempts += 1;
      attemptData.lastAttempt = now;

      if (attemptData.attempts >= PIN_CONFIG.MAX_ATTEMPTS) {
        attemptData.lockedUntil = new Date(now.getTime() + PIN_CONFIG.LOCK_DURATION);
        return res.status(423).json({
          success: false,
          message: 'Invalid PIN. Account locked due to too many failed attempts.'
        });
      }

      return res.status(400).json({
        success: false,
        message: `Invalid PIN. ${PIN_CONFIG.MAX_ATTEMPTS - attemptData.attempts} attempts remaining.`
      });
    }

    if (wallet.balance < amount) {
      return res.status(400).json({
        success: false,
        message: `Insufficient balance. Available: ₦${wallet.balance.toLocaleString()}`
      });
    }

    resetPinAttempts(req.user.userId);

    let purchaseResult;
    
    switch (type) {
  case 'airtime':
    purchaseResult = await processAirtimePurchase({ ...serviceData, amount, userId: req.user.userId });
    break;
  case 'data':
    purchaseResult = await processDataPurchase({ ...serviceData, amount, userId: req.user.userId });
    break;
  case 'electricity':
    purchaseResult = await processElectricityPurchase({ ...serviceData, amount, userId: req.user.userId });
    break;
  case 'cable_tv':
    purchaseResult = await processCableTVPurchase({ ...serviceData, amount, userId: req.user.userId });
    break;
  case 'fund_betting':
    purchaseResult = await processFundBettingPurchase({ ...serviceData, amount, userId: req.user.userId });
    break;
  case 'education':
    purchaseResult = await processEducationPurchase({ ...serviceData, amount, userId: req.user.userId });
    break;
  case 'internet':
    purchaseResult = await processInternetPurchase({ ...serviceData, amount, userId: req.user.userId });
    break;
  case 'recharge':
  case 'print_recharge':
    purchaseResult = await processPrintRechargePurchase({ ...serviceData, amount, userId: req.user.userId });
    break;
  default:
    return res.status(400).json({ success: false, message: 'Unsupported service type' });
}

    if (purchaseResult.success) {
      const transactionResult = await wallet.debit(amount, purchaseResult.description, purchaseResult.reference);

      res.json({
        success: true,
        message: purchaseResult.successMessage,
        transaction: {
          _id: purchaseResult.reference,
          type,
          amount,
          ...purchaseResult.transactionData,
          status: 'completed',
          reference: purchaseResult.reference,
          responseMessage: 'Transaction completed successfully',
          timestamp: new Date()
        },
        newBalance: {
          mainBalance: transactionResult.wallet.balance,
          bonusBalance: 0,
          totalBalance: transactionResult.wallet.balance
        }
      });
    } else {
      res.status(400).json({
        success: false,
        message: purchaseResult.errorMessage || 'Purchase failed',
        transaction: {
          _id: purchaseResult.reference,
          type,
          amount,
          ...purchaseResult.transactionData,
          status: 'failed',
          reference: purchaseResult.reference,
          responseMessage: purchaseResult.errorMessage,
          timestamp: new Date()
        }
      });
    }
  } catch (error) {
    console.error('=== PURCHASE ERROR ===');
    console.error('Error Name:', error.name);
    console.error('Error Message:', error.message);
    console.error('Error Stack:', error.stack);
    
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Server error processing purchase',
      error: process.env.NODE_ENV === 'development' ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : undefined
    });
  }
});

// ========== PROCESSING FUNCTIONS ==========

async function processPrintRechargePurchase({ network, denomination, quantity, amount, cardType, userId }) {
  try {
    const value = denomination;
    if (!network || !value || !quantity) {
      throw new Error('Missing required fields');
    }

    // For print recharge, ClubKonnect only accepts exact denominations: 100, 200, 500
    // We cannot apply markup by reducing the value
    const validDenominations = [100, 200, 500, 1000, 1500, 2000];
    
    if (!validDenominations.includes(value)) {
      throw new Error(`Invalid denomination. Must be one of: ${validDenominations.join(', ')}`);
    }

    // Calculate profit AFTER the purchase, not by reducing the ClubKonnect value
    const providerCostPerCard = value; // Send exact value to ClubKonnect
    const totalProviderCost = providerCostPerCard * quantity;
    
    // Your profit comes from the difference between what customer paid and what you pay ClubKonnect
    const profit = amount - totalProviderCost;

    const networkCode = NETWORK_CODES[network.toUpperCase()] || network;
    const requestId = `EPIN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const response = await makeClubKonnectRequest('/APIEPINV1.asp', {
      MobileNetwork: networkCode,
      Value: providerCostPerCard,  // Send exact denomination, not reduced value
      Quantity: quantity,
      RequestID: requestId
    });



    if (response.TXN_EPIN && Array.isArray(response.TXN_EPIN)) {
      const pins = response.TXN_EPIN.map(epin => ({
        pin: epin.pin,
        serial: epin.sno
      }));

      const pinsText = pins.map((p, i) => `PIN: ${p.pin} (Serial: ${p.serial})`).join(', ');
      const description = `${network.toUpperCase()} ${cardType || 'AIRTIME'} Recharge - ${quantity} card(s) x ₦${value}. ${pinsText}`;

      return {
        success: true,
        reference: response.TXN_EPIN[0].transactionid || requestId,
        description: description,
        successMessage: `Generated ${quantity} PIN(s) successfully`,
        transactionData: {
          network: network.toUpperCase(),
          value,
          quantity,
          denomination: value,
          type: cardType || 'airtime',
          pins: pins,
          providerCost: totalProviderCost,  // ← CHANGE THIS
          customerPrice: amount,
          profit,
          serviceType: 'print_recharge',
          transactionid: response.TXN_EPIN[0].transactionid
        }
      };
    }

    throw new Error('No PINs received from provider');
  } catch (error) {
    const reference = `EPIN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    return {
      success: false,
      reference,
      errorMessage: error.message,
      transactionData: { network: network?.toUpperCase(), value: denomination, quantity, serviceType: 'print_recharge' }
    };
  }
}

async function processAirtimePurchase({ network, phone, amount, userId }) {
  try {
    if (!network || !phone) throw new Error('Missing required fields: network, phone');
    if (!/^0[789][01]\d{8}$/.test(phone)) throw new Error('Invalid phone number format');

    const providerCost = Math.round(amount / 1.02);
    const profit = amount - providerCost;

    const networkCode = NETWORK_CODES[network.toUpperCase()] || network;
    const requestId = `AIR_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const response = await makeClubKonnectRequest('/APIAirtimeV1.asp', {
      MobileNetwork: networkCode,
      Amount: providerCost,
      MobileNumber: phone,
      RequestID: requestId
    });

    const isSuccess = response.statuscode === '100' || response.statuscode === '200' || 
                      response.status === 'ORDER_RECEIVED' || response.status === 'ORDER_COMPLETED';

    if (!isSuccess) {
      throw new Error(response.remark || response.status || 'Purchase failed');
    }

    return {
      success: true,
      reference: response.orderid || requestId,
      description: `Airtime purchase - ${network.toUpperCase()} - ${phone}`,
      successMessage: response.remark || 'Airtime purchase successful',
      transactionData: {
        network: network.toUpperCase(),
        phone,
        providerCost,
        customerPrice: amount,
        profit,
        serviceType: 'airtime',
        orderid: response.orderid,
        statuscode: response.statuscode,
        apiResponse: response
      }
    };
  } catch (error) {
    const reference = `AIR_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    return {
      success: false,
      reference,
      errorMessage: error.message,
      transactionData: { network: network?.toUpperCase(), phone, serviceType: 'airtime' }
    };
  }
}

async function processDataPurchase({ network, phone, planId, plan, amount, userId }) {
  try {
    if (!network || !phone) throw new Error('Missing required fields: network, phone');
    if (!/^0[789][01]\d{8}$/.test(phone)) throw new Error('Invalid phone number format');

    const normalizedNetwork = network.toLowerCase();
    
    // Fetch plan from MongoDB
    const DataPlan = require('../models/DataPlan');
    const selectedPlan = await DataPlan.findOne({ 
      network: normalizedNetwork, 
      planId: planId,
      active: true 
    });
    
    if (!selectedPlan) {
      throw new Error('Invalid plan selected or plan not available');
    }

    // ✅ NEW: Check if plan data is stale (older than 1 hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const isStale = selectedPlan.lastUpdated < oneHourAgo;

    if (isStale) {
      console.log('⚠️  Plan data is stale, fetching fresh prices...');
      
      try {
        // Fetch fresh plans from ClubConnect
        const axios = require('axios');
        const freshPlansUrl = `https://www.nellobytesystems.com/APIDatabundlePlansV2.asp?UserID=${process.env.CLUBKONNECT_USER_ID}`;
        const response = await axios.get(freshPlansUrl, { timeout: 10000 });
        
        let plansData = response.data;
        if (typeof plansData === 'string') {
          plansData = JSON.parse(plansData);
        }

        // Find the specific plan in fresh data
        const networkCodeMap = { 'mtn': '01', 'glo': '02', '9mobile': '03', 'airtel': '04' };
        const networkCode = networkCodeMap[normalizedNetwork];
        const freshNetworkPlans = plansData[networkCode];

        if (freshNetworkPlans && Array.isArray(freshNetworkPlans)) {
          const freshPlan = freshNetworkPlans.find(p => 
            (p.dataplan_id || p.plan_id || p.id) === planId
          );

          if (freshPlan) {
            const freshProviderCost = parseFloat(freshPlan.plan_amount || freshPlan.amount || 0);
            
            // Update MongoDB with fresh price
            if (freshProviderCost !== selectedPlan.providerCost) {
              console.log(`💰 Price changed: ₦${selectedPlan.providerCost} → ₦${freshProviderCost}`);
              
              await DataPlan.updateOne(
                { _id: selectedPlan._id },
                { 
                  $set: { 
                    providerCost: freshProviderCost,
                    lastUpdated: new Date()
                  }
                }
              );
              
              selectedPlan.providerCost = freshProviderCost;
            } else {
              // Just update timestamp
              await DataPlan.updateOne(
                { _id: selectedPlan._id },
                { $set: { lastUpdated: new Date() } }
              );
            }
          }
        }
      } catch (fetchError) {
        console.error('⚠️  Could not fetch fresh prices, using cached:', fetchError.message);
        // Continue with cached price (risk accepted)
      }
    }

    // Calculate pricing dynamically with current provider cost
    const pricing = calculateCustomerPrice(selectedPlan.providerCost, 'data');

    // ✅ CRITICAL: Validate amount matches current calculated price
    if (pricing.customerPrice !== amount) {
      // Price changed! Return error with new price
      throw new Error(
        `PRICE_CHANGED: Plan price updated. New price: ₦${pricing.customerPrice.toLocaleString()} (was ₦${amount.toLocaleString()})`
      );
    }

    const networkCode = NETWORK_CODES[network.toUpperCase()] || network;
    const requestId = `DATA_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Use providerCost for API call (what you pay ClubKonnect)
    const response = await makeClubKonnectRequest('/APIDatabundleV1.asp', {
      MobileNetwork: networkCode,
      DataPlan: planId,
      MobileNumber: phone,
      RequestID: requestId
    });

    const isSuccess = response.statuscode === '100' || response.statuscode === '200' || 
                      response.status === 'ORDER_RECEIVED' || response.status === 'ORDER_COMPLETED';

    if (!isSuccess) {
      throw new Error(response.remark || response.status || 'Purchase failed');
    }

    return {
      success: true,
      reference: response.orderid || requestId,
      description: `Data purchase - ${network.toUpperCase()} ${selectedPlan.name} - ${phone}`,
      successMessage: response.remark || 'Data purchase successful',
      transactionData: {
        network: network.toUpperCase(),
        phone,
        plan: selectedPlan.name,
        planId: planId,
        providerCost: selectedPlan.providerCost,
        customerPrice: pricing.customerPrice,
        profit: pricing.profit,
        serviceType: 'data',
        orderid: response.orderid,
        apiResponse: response
      }
    };
  } catch (error) {
    const reference = `DATA_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    return {
      success: false,
      reference,
      errorMessage: error.message,
      transactionData: { network: network?.toUpperCase(), phone, plan, planId, serviceType: 'data' }
    };
  }
}

async function processFundBettingPurchase({ provider, customerId, customerName, amount, userId }) {
  try {
    if (!provider || !customerId) throw new Error('Missing required fields: provider, customerId');
    if (amount < 100 || amount > 500000) {
      throw new Error('Amount must be between ₦100 and ₦500,000');
    }

    const providerCost = Math.round(amount / 1.025);
    const profit = amount - providerCost;

    const requestId = `BET_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const providerMapping = {
      'bet9ja': 'BET9JA', 'sportybet': 'SPORTYBET', 'nairabet': 'NAIRABET',
      'betway': 'BETWAY', '1xbet': '1XBET', 'betking': 'BETKING',
      'merrybet': 'MERRYBET', 'msport': 'MSPORT'
    };

    const bettingCompany = providerMapping[provider.toLowerCase()] || provider.toUpperCase();

    const response = await makeClubKonnectRequest('/APIBettingV1.asp', {
      BettingCompany: bettingCompany,
      CustomerID: customerId,
      Amount: providerCost,
      RequestID: requestId
    });

    const isSuccess = response.statuscode === '100' || response.statuscode === '200' || 
                      response.status === 'ORDER_RECEIVED' || response.status === 'ORDER_COMPLETED';

    if (!isSuccess) {
      if (response.status === 'INVALID_CUSTOMERID' || 
          (response.remark && response.remark.toLowerCase().includes('invalid customer'))) {
        throw new Error('Invalid customer ID for this betting platform');
      }
      throw new Error(response.remark || response.status || 'Betting fund failed');
    }

    return {
      success: true,
      reference: response.orderid || requestId,
      description: `Betting Fund - ${bettingCompany} - ${customerId}`,
      successMessage: response.remark || `${bettingCompany} account funded successfully`,
      transactionData: {
        provider: bettingCompany,
        customerId,
        customerName,
        providerCost,
        customerPrice: amount,
        profit,
        serviceType: 'fund_betting',
        orderid: response.orderid,
        apiResponse: response
      }
    };
  } catch (error) {
    const reference = `BET_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    return {
      success: false,
      reference,
      errorMessage: error.message,
      transactionData: { 
        provider: provider?.toUpperCase(), 
        customerId, 
        customerName,
        serviceType: 'fund_betting' 
      }
    };
  }
}

async function processEducationPurchase({ provider, examType, phone, amount, userId }) {
  try {
    if (!provider || !examType || !phone) {
      throw new Error('Missing required fields');
    }

    // Get service WITHOUT markup (use ClubKonnect price directly)
    const serviceInfo = getEducationService(provider, examType);
    if (!serviceInfo) {
      throw new Error('Invalid education service selected');
    }

    // Validate amount matches ClubKonnect price (no markup)
    if (serviceInfo.providerCost !== amount) {
      throw new Error(`Amount mismatch: expected ₦${serviceInfo.providerCost.toLocaleString()}, got ₦${amount.toLocaleString()}`);
    }

    const requestId = `EDU_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    let endpoint, params;

    if (provider === 'waec') {
      endpoint = '/APIWAECV1.asp';
      params = { ExamType: examType, PhoneNo: phone, RequestID: requestId };
    } else if (provider === 'jamb') {
      endpoint = '/APIJAMBV1.asp';
      params = { ExamType: examType, PhoneNo: phone, RequestID: requestId };
    } else {
      throw new Error('Unsupported education provider');
    }

    const response = await makeClubKonnectRequest(endpoint, params);

    const isSuccess = response.statuscode === '100' || response.statuscode === '200' || 
                      response.status === 'ORDER_RECEIVED' || response.status === 'ORDER_COMPLETED';

    if (!isSuccess) {
      throw new Error(response.remark || response.status || 'Purchase failed');
    }

    return {
      success: true,
      reference: response.orderid || requestId,
      description: `${provider.toUpperCase()} ${serviceInfo.name} - ${phone}`,
      successMessage: response.remark || 'Education payment successful',
      transactionData: {
        provider: provider.toUpperCase(),
        examType,
        serviceName: serviceInfo.name,
        phone,
        providerCost: serviceInfo.providerCost,
        customerPrice: serviceInfo.providerCost,  // Same as providerCost (no markup)
        profit: 0,  // Zero profit for Education
        serviceType: 'education',
        orderid: response.orderid,
        apiResponse: response
      }
    };
  } catch (error) {
    const reference = `EDU_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    return {
      success: false,
      reference,
      errorMessage: error.message,
      transactionData: { 
        provider: provider?.toUpperCase(), 
        examType, 
        serviceType: 'education' 
      }
    };
  }
}

async function processInternetPurchase({ provider, planId, planName, customerNumber, amount, userId }) {
  const requestId = `NET_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    console.log('=== INTERNET PURCHASE START ===');
    console.log('Provider:', provider);
    console.log('Plan ID:', planId, 'Type:', typeof planId);
    console.log('Plan Name:', planName);
    console.log('Customer Number:', customerNumber);
    console.log('Amount:', amount);
    console.log('Request ID:', requestId);
    
    // Validation
    if (!provider || !planId || !customerNumber) {
      throw new Error('Missing required fields: provider, planId, customerNumber');
    }

    if (provider.toLowerCase() !== 'smile') {
      throw new Error('Only Smile internet is currently supported');
    }

    // Lookup plan
    console.log('📡 Looking up plan in static list...');
    const selectedPlan = findSmilePlanById(planId);
    
    if (!selectedPlan) {
      console.error('❌ Invalid plan ID:', planId);
      throw new Error(`Invalid plan ID: "${planId}". Please select a valid Smile plan.`);
    }

    console.log('✅ Plan found:', JSON.stringify(selectedPlan, null, 2));

    const clubKonnectPrice = selectedPlan.amount;

    // Price validation
    if (clubKonnectPrice !== amount) {
      console.error(`❌ Price mismatch: Expected ₦${clubKonnectPrice}, Got ₦${amount}`);
      throw new Error(
        `Price mismatch: Plan "${selectedPlan.name}" costs ₦${clubKonnectPrice.toLocaleString()} but received ₦${amount.toLocaleString()}`
      );
    }

    console.log('✅ Price validation passed');

    // ✅ CRITICAL FIX: Smile API doesn't use MobileNetwork parameter
    // Based on ClubKonnect documentation, Smile uses different parameter structure
    const apiParams = {
      DataPlan: String(planId).trim(),
      MobileNumber: String(customerNumber).trim(),
      RequestID: requestId
    };

    console.log('📡 Calling ClubKonnect Smile API...');
    console.log('API Endpoint: /APISmileV1.asp');
    console.log('API Params:', JSON.stringify(apiParams, null, 2));

    // Make the API call
    let purchaseResponse;
    try {
      purchaseResponse = await makeClubKonnectRequest('/APISmileV1.asp', apiParams);
      console.log('✅ ClubKonnect Response:', JSON.stringify(purchaseResponse, null, 2));
    } catch (apiError) {
      console.error('❌ ClubKonnect API Error:', apiError.message);
      
      // Check if it's a network availability error
      if (apiError.message.includes('MobileNetwork_NOT_AVAILABLE')) {
        throw new Error('Smile service is temporarily unavailable. Please try again later or contact support.');
      }
      
      throw apiError;
    }

    // Parse response
    const statusCode = purchaseResponse.statuscode || purchaseResponse.status_code || purchaseResponse.StatusCode;
    const status = purchaseResponse.status || purchaseResponse.orderstatus || purchaseResponse.Status;
    const remark = purchaseResponse.remark || purchaseResponse.message || purchaseResponse.Remark;
    const orderId = purchaseResponse.orderid || purchaseResponse.OrderID || purchaseResponse.transactionid || requestId;

    console.log('📊 Response Analysis:');
    console.log('  Status Code:', statusCode);
    console.log('  Status:', status);
    console.log('  Remark:', remark);
    console.log('  Order ID:', orderId);

    // ✅ SUCCESS - Check for multiple success indicators
    const successIndicators = [
      statusCode === '100',
      statusCode === '200',
      status === 'ORDER_RECEIVED',
      status === 'ORDER_COMPLETED',
      status === 'SUCCESSFUL',
      remark?.toLowerCase().includes('success')
    ];

    if (successIndicators.some(indicator => indicator)) {
      console.log('✅✅✅ Purchase successful!');
      
      return {
        success: true,
        reference: orderId,
        description: `Internet - SMILE ${selectedPlan.name} - ${customerNumber}`,
        successMessage: remark || 'Smile internet subscription successful',
        transactionData: {
          provider: 'SMILE',
          plan: selectedPlan.name,
          planId: planId,
          customerNumber,
          providerCost: clubKonnectPrice,
          customerPrice: clubKonnectPrice,
          profit: 0,
          serviceType: 'internet',
          orderid: orderId,
          statuscode: statusCode,
          status: status,
          remark: remark,
          apiResponse: purchaseResponse
        }
      };
    }

    // ❌ FAILURE - Handle specific error cases
    console.error('❌ Purchase failed. Status:', status, 'Remark:', remark);
    
    // Map ClubKonnect errors to user-friendly messages
    const errorMessages = {
      'INVALID_ACCOUNTNO': 'Invalid Smile account number. Please verify the customer number.',
      'INVALID_MOBILENUMBER': 'Invalid customer number format. Please check and try again.',
      'DATAPLAN_NOT_AVAILABLE': `The ${selectedPlan.name} plan is temporarily unavailable. Please try another plan.`,
      'MobileNetwork_NOT_AVAILABLE': 'Smile network service is temporarily unavailable. Please try again later.',
      'INSUFFICIENT_BALANCE': 'Service provider balance insufficient. Please contact administrator.',
      'INVALID_DATAPLAN': `Invalid plan selected. Plan ID "${planId}" is not recognized.`,
      'AUTHENTICATION_FAILED': 'Service authentication error. Please contact administrator.',
      'ORDER_FAILED': 'Transaction failed. Please try again or contact support.'
    };

    const errorMessage = errorMessages[status] || remark || status || 'Internet subscription failed. Please try again.';
    throw new Error(errorMessage);

  } catch (error) {
    console.error('=== INTERNET PURCHASE ERROR ===');
    console.error('Error Type:', error.constructor.name);
    console.error('Error Message:', error.message);
    
    return {
      success: false,
      reference: requestId,
      errorMessage: error.message || 'Internet subscription failed',
      transactionData: { 
        provider: provider?.toUpperCase(), 
        planId,
        planName, 
        customerNumber, 
        serviceType: 'internet',
        error: error.message
      }
    };
  }
}

// Keep the same findSmilePlanById function
function findSmilePlanById(planId) {
  const searchId = String(planId).trim();
  console.log('🔍 Searching for plan ID:', searchId, 'Length:', searchId.length);
  
  const SMILE_PLANS = [
    // FlexiDaily
    { id: '624', name: '1GB FlexiDaily', amount: 450 },
    { id: '625', name: '2.5GB FlexiDaily', amount: 750 },
    // FlexiWeekly
    { id: '626', name: '1GB FlexiWeekly', amount: 750 },
    { id: '627', name: '2GB FlexiWeekly', amount: 1550 },
    { id: '628', name: '6GB FlexiWeekly', amount: 2300 },
    // Bigga (Most Popular)
    { id: '606', name: '1.5GB Bigga', amount: 1550 },
    { id: '607', name: '2GB Bigga', amount: 1850 },
    { id: '608', name: '3GB Bigga', amount: 2300 },
    { id: '620', name: '5GB Bigga', amount: 3100 },
    { id: '609', name: '6.5GB Bigga', amount: 3800 },
    { id: '722', name: '10GB Bigga', amount: 4600 },
    { id: '723', name: '15GB Bigga', amount: 6200 },
    { id: '724', name: '20GB Bigga', amount: 8000 },
    { id: '725', name: '25GB Bigga', amount: 9500 },
    { id: '615', name: '30GB Bigga', amount: 12500 },
    { id: '616', name: '40GB Bigga', amount: 15500 },
    { id: '617', name: '60GB Bigga', amount: 21000 },
    { id: '618', name: '75GB Bigga', amount: 23000 },
    { id: '619', name: '100GB Bigga', amount: 27500 },
    { id: '668', name: '130GB Bigga', amount: 30500 },
    // Unlimited
    { id: '730', name: 'UnlimitedLite', amount: 18500 },
    { id: '729', name: 'UnlimitedEssential', amount: 27700 },
    // Freedom
    { id: '726', name: 'Freedom 3Mbps', amount: 38500 },
    { id: '727', name: 'Freedom 6Mbps', amount: 46500 },
    { id: '728', name: 'Freedom BestEffort', amount: 61500 },
    // Jumbo
    { id: '665', name: '90GB Jumbo', amount: 31000 },
    { id: '666', name: '160GB Jumbo', amount: 53000 },
    { id: '667', name: '200GB Jumbo', amount: 62000 },
    { id: '721', name: '400GB Jumbo', amount: 77000 },
    // Annual
    { id: '687', name: '15GB Annual', amount: 14000 },
    { id: '688', name: '35GB Annual', amount: 29000 },
    { id: '689', name: '70GB Annual', amount: 49500 },
    { id: '664', name: '125GB Annual', amount: 77000 },
    { id: '604', name: '200GB Annual', amount: 107000 },
    { id: '673', name: '500GB Annual', amount: 154000 },
    { id: '674', name: '1TB Annual', amount: 185000 },
    // Voice
    { id: '747', name: 'SmileVoice 65min', amount: 900 },
    { id: '748', name: 'SmileVoice 135min', amount: 1850 },
    { id: '749', name: 'SmileVoice 430min', amount: 5700 },
    { id: '750', name: 'SmileVoice 150min', amount: 2700 },
    { id: '751', name: 'SmileVoice 450min', amount: 7200 },
    { id: '752', name: 'SmileVoice 175min', amount: 3600 },
    { id: '753', name: 'SmileVoice 500min', amount: 9000 },
    // Mobile
    { id: '758', name: 'Freedom Mobile Plan', amount: 5000 },
  ];
  
  const found = SMILE_PLANS.find(p => p.id === searchId);
  
  if (found) {
    console.log('✅ Found plan:', found.id, '-', found.name, '- ₦' + found.amount);
    return found;
  }
  
  console.error('❌ Plan ID not found!');
  console.error('Searched for:', searchId);
  console.error('First 10 available IDs:', SMILE_PLANS.slice(0, 10).map(p => p.id).join(', '));
  return null;
}

router.post('/internet/test-purchase', authenticate, async (req, res) => {
  try {
    const { planId, customerNumber } = req.body;
    
    console.log('=== DIAGNOSTIC TEST ===');
    console.log('Plan ID:', planId, 'Type:', typeof planId);
    console.log('Customer:', customerNumber);
    
    const testParams = {
      MobileNetwork: 'smile-direct',
      DataPlan: String(planId),
      MobileNumber: String(customerNumber),
      RequestID: `TEST_${Date.now()}`
    };
    
    console.log('Test Params:', JSON.stringify(testParams, null, 2));
    
    // Build full URL
    const queryParams = new URLSearchParams({
      UserID: CK_CONFIG.userId,
      APIKey: CK_CONFIG.apiKey,
      ...testParams
    });
    
    const url = `${CK_CONFIG.baseUrl}/APISmileV1.asp?${queryParams}`;
    console.log('Full URL:', url);
    
    const response = await axios.get(url, {
      timeout: 30000,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Response Status:', response.status);
    console.log('Response Data:', JSON.stringify(response.data, null, 2));
    
    res.json({
      success: true,
      testUrl: url.replace(CK_CONFIG.apiKey, 'HIDDEN'),
      response: response.data
    });
    
  } catch (error) {
    console.error('Test Error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      details: error.response?.data
    });
  }
});

router.post('/smile-api-test', authenticate, async (req, res) => {
  try {
    console.log('=== SMILE API TEST ===');
    
    const { planId, customerNumber } = req.body;
    
    if (!planId || !customerNumber) {
      return res.status(400).json({
        success: false,
        message: 'Missing planId or customerNumber'
      });
    }

    // Test 1: Try with smile-direct (current approach)
    console.log('\n📡 TEST 1: Using smile-direct');
    const test1Params = {
      UserID: CK_CONFIG.userId,
      APIKey: CK_CONFIG.apiKey,
      MobileNetwork: 'smile-direct',
      DataPlan: String(planId),
      MobileNumber: String(customerNumber),
      RequestID: `TEST1_${Date.now()}`
    };
    
    const url1 = `${CK_CONFIG.baseUrl}/APISmileV1.asp?${new URLSearchParams(test1Params)}`;
    console.log('URL:', url1.replace(CK_CONFIG.apiKey, 'HIDDEN'));
    
    try {
      const response1 = await axios.get(url1, { timeout: 15000 });
      console.log('✅ Response 1:', JSON.stringify(response1.data, null, 2));
    } catch (err1) {
      console.error('❌ Error 1:', err1.response?.data || err1.message);
    }

    // Test 2: Try without MobileNetwork parameter
    console.log('\n📡 TEST 2: Without MobileNetwork parameter');
    const test2Params = {
      UserID: CK_CONFIG.userId,
      APIKey: CK_CONFIG.apiKey,
      DataPlan: String(planId),
      MobileNumber: String(customerNumber),
      RequestID: `TEST2_${Date.now()}`
    };
    
    const url2 = `${CK_CONFIG.baseUrl}/APISmileV1.asp?${new URLSearchParams(test2Params)}`;
    console.log('URL:', url2.replace(CK_CONFIG.apiKey, 'HIDDEN'));
    
    try {
      const response2 = await axios.get(url2, { timeout: 15000 });
      console.log('✅ Response 2:', JSON.stringify(response2.data, null, 2));
    } catch (err2) {
      console.error('❌ Error 2:', err2.response?.data || err2.message);
    }

    // Test 3: Try with different parameter names
    console.log('\n📡 TEST 3: Using Package instead of DataPlan');
    const test3Params = {
      UserID: CK_CONFIG.userId,
      APIKey: CK_CONFIG.apiKey,
      Package: String(planId),
      MobileNumber: String(customerNumber),
      RequestID: `TEST3_${Date.now()}`
    };
    
    const url3 = `${CK_CONFIG.baseUrl}/APISmileV1.asp?${new URLSearchParams(test3Params)}`;
    console.log('URL:', url3.replace(CK_CONFIG.apiKey, 'HIDDEN'));
    
    try {
      const response3 = await axios.get(url3, { timeout: 15000 });
      console.log('✅ Response 3:', JSON.stringify(response3.data, null, 2));
    } catch (err3) {
      console.error('❌ Error 3:', err3.response?.data || err3.message);
    }

    // Test 4: Check credentials with a simpler endpoint
    console.log('\n📡 TEST 4: Testing credentials with wallet balance');
    const test4Params = {
      UserID: CK_CONFIG.userId,
      APIKey: CK_CONFIG.apiKey
    };
    
    const url4 = `${CK_CONFIG.baseUrl}/APIWalletBalanceV1.asp?${new URLSearchParams(test4Params)}`;
    
    try {
      const response4 = await axios.get(url4, { timeout: 15000 });
      console.log('✅ Credentials valid. Wallet response:', JSON.stringify(response4.data, null, 2));
    } catch (err4) {
      console.error('❌ Credentials invalid!', err4.response?.data || err4.message);
    }

    res.json({
      success: true,
      message: 'Test complete. Check server console for detailed logs.',
      note: 'Look for the test that returned success (✅) vs errors (❌)'
    });

  } catch (error) {
    console.error('Test error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

async function processCableTVPurchase({ operator, packageId, smartCardNumber, phone, amount, userId }) {
  const requestId = `TV_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    if (!operator || !packageId || !smartCardNumber || !phone) {
      throw new Error('Missing required fields: operator, packageId, smartCardNumber, or phone');
    }

    if (!/^0[789][01]\d{8}$/.test(phone)) {
      throw new Error('Invalid phone number format');
    }

    if (smartCardNumber.length < 10 || !/^\d+$/.test(smartCardNumber)) {
      throw new Error('Invalid smart card number');
    }

    // ✅ FETCH FRESH PRICE FROM CLUBKONNECT
    console.log('📡 Fetching fresh package price from ClubKonnect...');
    
    const url = `${CK_CONFIG.baseUrl}/APICableTVPackagesV2.asp?UserID=${CK_CONFIG.userId}&APIKey=${CK_CONFIG.apiKey}`;
    
    const response = await axios.get(url, { 
      timeout: 30000,
      headers: {
        'User-Agent': 'VTU-App/1.0'
      }
    });

    let data = response.data;
    
    if (typeof data === 'string') {
      try {
        data = JSON.parse(data);
      } catch (e) {
        throw new Error(`Failed to parse ClubKonnect response`);
      }
    }

    // Find operator data
    let operatorsData = null;
    if (data.TV_ID) {
      operatorsData = data.TV_ID;
    } else if (data.DSTV || data.DStv || data.GOtv || data.Startimes) {
      operatorsData = data;
    } else {
      throw new Error('Invalid response from ClubKonnect API');
    }

    // Operator mapping
    const OPERATOR_KEY_MAPPING = {
      'dstv': ['DStv', 'DSTV'],
      'gotv': ['GOtv', 'GOTV'],
      'startimes': ['Startimes', 'STARTIMES', 'StarTimes'],
      'startime': ['Startimes', 'STARTIMES', 'StarTimes']
    };

    // Find operator packages
    let operatorPackages = null;
    const possibleKeys = OPERATOR_KEY_MAPPING[operator.toLowerCase()];
    
    for (const key of possibleKeys) {
      if (operatorsData[key]) {
        operatorPackages = operatorsData[key];
        break;
      }
    }

    if (!operatorPackages || !Array.isArray(operatorPackages) || operatorPackages.length === 0) {
      throw new Error(`No packages found for ${operator.toUpperCase()}`);
    }

    const products = operatorPackages[0].PRODUCT;
    
    if (!products || !Array.isArray(products)) {
      throw new Error(`No products found for ${operator.toUpperCase()}`);
    }

    // Find the specific package
    const packageInfo = products.find(p => p.PACKAGE_ID === packageId);
    
    if (!packageInfo) {
      throw new Error('Invalid package selected or package not available');
    }

    const clubKonnectPrice = parseFloat(packageInfo.PACKAGE_AMOUNT);

    // ✅ Validate amount matches ClubKonnect price (no markup)
    if (clubKonnectPrice !== amount) {
      throw new Error(
        `Price mismatch: ClubKonnect price is ₦${clubKonnectPrice.toLocaleString()}, but received ₦${amount.toLocaleString()}`
      );
    }

    console.log('Cable TV Purchase:', {
      package: packageInfo.PACKAGE_NAME,
      clubKonnectPrice: clubKonnectPrice,
      customerPays: amount,
      profit: 0
    });

    const operatorMapping = {
      'dstv': 'dstv',
      'gotv': 'gotv',
      'startime': 'startimes',
      'startimes': 'startimes'
    };

    const ckOperator = operatorMapping[operator.toLowerCase()];
    if (!ckOperator) {
      throw new Error(`Unsupported cable operator: ${operator}`);
    }

    // ✅ PURCHASE FROM CLUBKONNECT
    const purchaseResponse = await makeClubKonnectRequest('/APICableTVV1.asp', {
      CableTV: ckOperator,
      Package: packageId,
      SmartCardNo: smartCardNumber,
      PhoneNo: phone,
      RequestID: requestId
    });

    const statusCode = purchaseResponse.statuscode || purchaseResponse.status_code;
    const status = purchaseResponse.status || purchaseResponse.orderstatus;
    const remark = purchaseResponse.remark || purchaseResponse.message;

    if (statusCode === '100' || statusCode === '200' || 
        status === 'ORDER_RECEIVED' || status === 'ORDER_COMPLETED') {
      
      return {
        success: true,
        reference: purchaseResponse.orderid || requestId,
        description: `Cable TV - ${operator.toUpperCase()} ${packageInfo.PACKAGE_NAME} - ${smartCardNumber}`,
        successMessage: remark || 'Cable TV subscription successful',
        transactionData: {
          operator: operator.toUpperCase(),
          packageId,
          packageName: packageInfo.PACKAGE_NAME,
          smartCardNumber,
          phone,
          providerCost: clubKonnectPrice,
          customerPrice: clubKonnectPrice,  // No markup
          profit: 0,
          serviceType: 'cable_tv',
          orderid: purchaseResponse.orderid,
          statuscode: statusCode,
          apiResponse: purchaseResponse
        }
      };
    }

    if (status === 'INVALID_SMARTCARDNO') {
      throw new Error('Invalid smart card number for this operator');
    }

    throw new Error(remark || status || 'Cable TV purchase failed');

  } catch (error) {
    return {
      success: false,
      reference: requestId,
      errorMessage: error.message,
      transactionData: {
        operator: operator?.toUpperCase(),
        packageId,
        smartCardNumber,
        phone,
        serviceType: 'cable_tv',
        requestId,
        error: error.message
      }
    };
  }
}

async function processElectricityPurchase({ provider, meterType, meterNumber, phone, amount, userId }) {
  try {
    if (!provider || !meterNumber || !meterType || !phone) {
      throw new Error('Missing required fields');
    }

    const companyCode = ELECTRICITY_COMPANY_CODES[provider];
    if (!companyCode) {
      throw new Error(`Unsupported electricity provider: ${provider}`);
    }

    const providerCost = Math.round(amount / 1.02);
    const profit = amount - providerCost;

    const requestId = `ELEC_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const response = await makeClubKonnectRequest('/APIElectricityV1.asp', {
      ElectricCompany: companyCode,
      MeterType: meterType,
      MeterNo: meterNumber,
      Amount: providerCost,
      PhoneNo: phone,
      RequestID: requestId
    });

    const isSuccess = response.statuscode === '100' || response.statuscode === '200' || 
                      response.status === 'ORDER_RECEIVED' || response.status === 'ORDER_COMPLETED';

    if (!isSuccess) {
      throw new Error(response.remark || response.status || 'Purchase failed');
    }

    return {
      success: true,
      reference: response.orderid || requestId,
      description: `Electricity - ${companyCode} ${meterType === '01' ? 'Prepaid' : 'Postpaid'} - ${meterNumber}`,
      successMessage: response.remark || 'Electricity payment successful',
      transactionData: {
        provider: companyCode,
        meterNumber,
        meterType: meterType === '01' ? 'Prepaid' : 'Postpaid',
        phone,
        token: response.metertoken,
        providerCost,
        customerPrice: amount,
        profit,
        serviceType: 'electricity',
        orderid: response.orderid,
        apiResponse: response
      }
    };
  } catch (error) {
    const reference = `ELEC_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    return {
      success: false,
      reference,
      errorMessage: error.message,
      transactionData: { provider, meterNumber, meterType, serviceType: 'electricity' }
    };
  }
}

// Initialize services on module load
(async () => {
  try {
    const services = [
      { type: 'airtime', name: 'Airtime Purchase', active: true },
      { type: 'data', name: 'Data Purchase', active: true },
      { type: 'electricity', name: 'Electricity Payment', active: true },
      { type: 'cable_tv', name: 'Cable TV Subscription', active: true },
      { type: 'internet', name: 'Internet Subscription', active: true },
      { type: 'fund_betting', name: 'Fund Betting Account', active: true },
      { type: 'education', name: 'Education Payment', active: true },
      { type: 'print_recharge', name: 'Print Recharge', active: true },
      { type: 'transfer', name: 'Money Transfer', active: true }
    ];

    for (const serviceInfo of services) {
      let service = await ServiceConfig.findOne({ serviceType: serviceInfo.type });
      if (!service) {
        service = new ServiceConfig({
          serviceType: serviceInfo.type,
          displayName: serviceInfo.name,
          isActive: serviceInfo.active,
          maintenanceMode: false,
          pricing: { markupPercentage: 0, flatFee: 0 },
          limits: {
            min: serviceInfo.type === 'education' ? 500 : 50,
            max: serviceInfo.type === 'education' ? 1000000 : 500000,
            dailyLimit: 1000000
          }
        });
        await service.save();
      }
    }
  } catch (error) {
    console.error('Service initialization error:', error);
  }
})();
router.get('/test-clubkonnect', async (req, res) => {
  const params = {
    UserID: process.env.CLUBKONNECT_USER_ID || 'CK101263696',
    APIKey: process.env.CLUBKONNECT_API_KEY || 'E94SKRM091S21A66T8Q6790WE17LYA24ADOJ4FRL691JC00KJ34D241M19RRX1HU',
    MobileNetwork: '01',
    Amount: 50,
    MobileNumber: '08000000000',
    RequestID: `TEST_${Date.now()}`
  };

  const url = `https://www.nellobytesystems.com/APIAirtimeV1.asp?${new URLSearchParams(params)}`;
  
  console.log('Testing ClubKonnect...');
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    console.log('Response:', data);
    
    return res.json({
      success: data.status !== 'AUTHENTICATION_FAILED_1',
      clubKonnectResponse: data,
      message: data.status === 'AUTHENTICATION_FAILED_1' 
        ? '❌ Authentication failed - check your credentials'
        : '✅ Authentication successful!'
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

module.exports = router;