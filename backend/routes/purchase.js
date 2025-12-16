// routes/purchase.js - COMPLETE FIXED VERSION
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
    console.log('🔍 Validating service:', serviceType);
    
    let normalizedServiceType = serviceType.toLowerCase();
    
    const serviceTypeMapping = {
      'fund_betting': 'fund_betting',
      'betting': 'fund_betting',
      'cable_tv': 'cable_tv',
      'print_recharge': 'print_recharge',
      'data_easyaccess': 'data_easyaccess'
    };
    
    if (serviceTypeMapping[normalizedServiceType]) {
      normalizedServiceType = serviceTypeMapping[normalizedServiceType];
    }
    
    console.log('🔍 Normalized service type:', normalizedServiceType);
    
    const service = await ServiceConfig.findOne({ serviceType: normalizedServiceType });
    
    console.log('🔍 Service found:', service ? 'Yes' : 'No');
    if (service) {
      console.log('🔍 Service details:', {
        serviceType: service.serviceType,
        isActive: service.isActive,
        maintenanceMode: service.maintenanceMode
      });
    }
    
    if (!service) {
      console.error('❌ Service not found in database:', normalizedServiceType);
      return {
        available: false,
        reason: `${serviceType} service not found in database`
      };
    }
    
    if (!service.isActive) {
      console.error('❌ Service is not active:', normalizedServiceType);
      return {
        available: false,
        reason: `${serviceType} service is not active`
      };
    }
    
    if (service.maintenanceMode) {
      console.error('❌ Service is in maintenance mode:', normalizedServiceType);
      return {
        available: false,
        reason: service.maintenanceMessage || `${serviceType} service is currently in maintenance`
      };
    }
    
    console.log('✅ Service validation passed:', normalizedServiceType);
    return { available: true };
    
  } catch (error) {
    console.error('❌ Service validation error:', error);
    return { 
      available: false, 
      reason: `Error checking ${serviceType} service: ${error.message}` 
    };
  }
};
/**
 * Fetch WAEC packages from ClubKonnect
 */
async function fetchWAECPackages() {
  try {
    const url = `${CK_CONFIG.baseUrl}/APIWAECPackagesV2.asp?UserID=${CK_CONFIG.userId}`;
    
    console.log('📡 Fetching WAEC packages from ClubKonnect...');
    
    const response = await axios.get(url, {
      timeout: 30000,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    let data = response.data;
    
    if (typeof data === 'string') {
      try {
        data = JSON.parse(data);
      } catch (e) {
        console.error('Failed to parse WAEC response');
        throw new Error('Invalid response from ClubKonnect');
      }
    }

    console.log('✅ WAEC Raw Response:', JSON.stringify(data, null, 2));
    
    const packages = [];
    
    if (data.EXAM_TYPE && Array.isArray(data.EXAM_TYPE)) {
      console.log(`Found ${data.EXAM_TYPE.length} WAEC products`);
      
      data.EXAM_TYPE.forEach(product => {
        packages.push({
          id: product.PRODUCT_CODE || product.product_code || 'waecdirect',
          code: product.PRODUCT_CODE || product.product_code || 'waecdirect',
          name: product.PRODUCT_DESCRIPTION || product.description || 'WAEC Result Checker PIN',
          description: product.PRODUCT_DESCRIPTION || product.description || 'WAEC Result Checker PIN',
          price: parseFloat(product.PRODUCT_AMOUNT || product.amount || 3900),
          provider: 'waec',
          validity: '1 year',
          active: true
        });
      });
    }

    console.log(`✅ Parsed ${packages.length} WAEC packages`);
    
    if (packages.length === 0) {
      console.log('⚠️ No WAEC packages from API, using fallback');
      return [
        {
          id: 'waecdirect',
          code: 'waecdirect',
          name: 'WAEC Result Checker PIN',
          description: 'WAEC Result Checker PIN',
          price: 3900,
          provider: 'waec',
          validity: '1 year',
          active: true
        }
      ];
    }
    
    return packages;
    
  } catch (error) {
    console.error('❌ Error fetching WAEC packages:', error.message);
    
    return [
      {
        id: 'waecdirect',
        code: 'waecdirect',
        name: 'WAEC Result Checker PIN',
        description: 'WAEC Result Checker PIN',
        price: 3900,
        provider: 'waec',
        validity: '1 year',
        active: true
      }
    ];
  }
}

/**
 * Fetch JAMB packages from ClubKonnect
 */
async function fetchJAMBPackages() {
  try {
    const url = `${CK_CONFIG.baseUrl}/APIJAMBPackagesV2.asp?UserID=${CK_CONFIG.userId}`;
    
    console.log('📡 Fetching JAMB packages from ClubKonnect...');
    
    const response = await axios.get(url, {
      timeout: 30000,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    let data = response.data;
    
    if (typeof data === 'string') {
      try {
        data = JSON.parse(data);
      } catch (e) {
        console.error('Failed to parse JAMB response');
        throw new Error('Invalid response from ClubKonnect');
      }
    }

    console.log('✅ JAMB Raw Response:', JSON.stringify(data, null, 2));
    
    const packages = [];
    
    if (data.EXAM_TYPE && Array.isArray(data.EXAM_TYPE)) {
      console.log(`Found ${data.EXAM_TYPE.length} JAMB products`);
      
      data.EXAM_TYPE.forEach(product => {
        packages.push({
          id: product.PRODUCT_CODE || product.product_code || 'utme',
          code: product.PRODUCT_CODE || product.product_code || 'utme',
          name: product.PRODUCT_DESCRIPTION || product.description || 'JAMB UTME e-PIN',
          description: product.PRODUCT_DESCRIPTION || product.description || 'JAMB UTME e-PIN',
          price: parseFloat(product.PRODUCT_AMOUNT || product.amount || 4500),
          provider: 'jamb',
          validity: 'Current session',
          active: true
        });
      });
    }

    console.log(`✅ Parsed ${packages.length} JAMB packages`);
    
    if (packages.length === 0) {
      console.log('⚠️ No JAMB packages from API, using fallback');
      return [
        {
          id: 'utme',
          code: 'utme',
          name: 'JAMB UTME e-PIN',
          description: 'JAMB UTME Registration PIN',
          price: 4500,
          provider: 'jamb',
          validity: 'Current session',
          active: true
        },
        {
          id: 'de',
          code: 'de',
          name: 'JAMB Direct Entry e-PIN',
          description: 'JAMB Direct Entry Registration PIN',
          price: 4500,
          provider: 'jamb',
          validity: 'Current session',
          active: true
        }
      ];
    }
    
    return packages;
    
  } catch (error) {
    console.error('❌ Error fetching JAMB packages:', error.message);
    
    return [
      {
        id: 'utme',
        code: 'utme',
        name: 'JAMB UTME e-PIN',
        description: 'JAMB UTME Registration PIN',
        price: 4500,
        provider: 'jamb',
        validity: 'Current session',
        active: true
      },
      {
        id: 'de',
        code: 'de',
        name: 'JAMB Direct Entry e-PIN',
        description: 'JAMB Direct Entry Registration PIN',
        price: 4500,
        provider: 'jamb',
        validity: 'Current session',
        active: true
      }
    ];
  }
}

/**
 * Fetch all education packages (WAEC + JAMB)
 */
async function fetchAllEducationPackages() {
  try {
    console.log('📚 Fetching all education packages...');
    
    const [waecPackages, jambPackages] = await Promise.all([
      fetchWAECPackages(),
      fetchJAMBPackages()
    ]);

    return {
      waec: waecPackages,
      jamb: jambPackages,
      all: [...waecPackages, ...jambPackages]
    };
  } catch (error) {
    console.error('❌ Error fetching education packages:', error);
    throw error;
  }
}

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

router.get('/education/packages', authenticate, async (req, res) => {
  try {
    console.log('📚 GET /education/packages called by user:', req.user.userId);
    
    const packages = await fetchAllEducationPackages();
    
    console.log('✅ Returning packages:', {
      waec: packages.waec.length,
      jamb: packages.jamb.length,
      total: packages.all.length
    });
    
    res.json({
      success: true,
      data: packages,
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error in /education/packages route:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch education packages',
      error: error.message
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
      data_easyaccess: { min: 50, max: 500000 },  // ✅ ADDED
      electricity: { min: 100, max: 100000 },
      education: { min: 500, max: 1000000 },
      print_recharge: { min: 100, max: 50000 },
      recharge: { min: 100, max: 50000 },
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
      case 'data_easyaccess':  // ✅ ADDED
        purchaseResult = await processEasyAccessDataPurchase({ 
          ...serviceData, 
          amount, 
          userId: req.user.userId 
        });
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

    const validDenominations = [100, 200, 500, 1000, 1500, 2000];
    
    if (!validDenominations.includes(value)) {
      throw new Error(`Invalid denomination. Must be one of: ${validDenominations.join(', ')}`);
    }

    const providerCostPerCard = value;
    const totalProviderCost = providerCostPerCard * quantity;
    const profit = amount - totalProviderCost;

    const networkCode = NETWORK_CODES[network.toUpperCase()] || network;
    const requestId = `EPIN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const response = await makeClubKonnectRequest('/APIEPINV1.asp', {
      MobileNetwork: networkCode,
      Value: providerCostPerCard,
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
          providerCost: totalProviderCost,
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
    console.log('\n=== AIRTIME PURCHASE DEBUG ===');
    console.log('Raw inputs:', { network, phone, amount, userId });
    console.log('Amount type:', typeof amount);
    console.log('Amount value:', amount);
    
    if (!network || !phone) throw new Error('Missing required fields: network, phone');
    if (!/^0[789][01]\d{8}$/.test(phone)) throw new Error('Invalid phone number format');

    // ❌ PROBLEM: This line reduces your amount!
    // const providerCost = Math.round(amount / 1.02);
    
    // ✅ FIX: Send the EXACT amount customer pays
    const providerCost = amount; // Send exactly ₦50
    const profit = 0; // No profit markup for now

    console.log('Calculated providerCost:', providerCost);
    console.log('Sending to ClubKonnect:', providerCost);

    const networkCode = NETWORK_CODES[network.toUpperCase()] || network;
    const requestId = `AIR_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    console.log('Network code:', networkCode);
    console.log('Request ID:', requestId);

    const apiParams = {
      MobileNetwork: networkCode,
      Amount: providerCost,  // ✅ Exact amount
      MobileNumber: phone,
      RequestID: requestId
    };

    console.log('📡 API Params:', JSON.stringify(apiParams, null, 2));

    const response = await makeClubKonnectRequest('/APIAirtimeV1.asp', apiParams);

    console.log('📥 ClubKonnect Response:', JSON.stringify(response, null, 2));

    const isSuccess = response.statuscode === '100' || response.statuscode === '200' || 
                      response.status === 'ORDER_RECEIVED' || response.status === 'ORDER_COMPLETED';

    if (!isSuccess) {
      console.error('❌ Purchase failed:', response.remark || response.status);
      throw new Error(response.remark || response.status || 'Purchase failed');
    }

    console.log('✅ Purchase successful!');
    console.log('=== END DEBUG ===\n');

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
    console.error('=== AIRTIME PURCHASE ERROR ===');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('=== END ERROR ===\n');
    
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
    
    const DataPlan = require('../models/DataPlan');
    const selectedPlan = await DataPlan.findOne({ 
      network: normalizedNetwork, 
      planId: planId,
      active: true 
    });
    
    if (!selectedPlan) {
      throw new Error('Invalid plan selected or plan not available');
    }

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const isStale = selectedPlan.lastUpdated < oneHourAgo;

    if (isStale) {
      console.log('⚠️  Plan data is stale, fetching fresh prices...');
      
      try {
        const freshPlansUrl = `https://www.nellobytesystems.com/APIDatabundlePlansV2.asp?UserID=${process.env.CLUBKONNECT_USER_ID}`;
        const response = await axios.get(freshPlansUrl, { timeout: 10000 });
        
        let plansData = response.data;
        if (typeof plansData === 'string') {
          plansData = JSON.parse(plansData);
        }

        const networkCodeMap = { 'mtn': '01', 'glo': '02', '9mobile': '03', 'airtel': '04' };
        const networkCode = networkCodeMap[normalizedNetwork];
        const freshNetworkPlans = plansData[networkCode];

        if (freshNetworkPlans && Array.isArray(freshNetworkPlans)) {
          const freshPlan = freshNetworkPlans.find(p => 
            (p.dataplan_id || p.plan_id || p.id) === planId
          );

          if (freshPlan) {
            const freshProviderCost = parseFloat(freshPlan.plan_amount || freshPlan.amount || 0);
            
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
              await DataPlan.updateOne(
                { _id: selectedPlan._id },
                { $set: { lastUpdated: new Date() } }
              );
            }
          }
        }
      } catch (fetchError) {
        console.error('⚠️  Could not fetch fresh prices, using cached:', fetchError.message);
      }
    }

    const pricing = calculateCustomerPrice(selectedPlan.providerCost, 'data');

    if (pricing.customerPrice !== amount) {
      throw new Error(
        `PRICE_CHANGED: Plan price updated. New price: ₦${pricing.customerPrice.toLocaleString()} (was ₦${amount.toLocaleString()})`
      );
    }

    const networkCode = NETWORK_CODES[network.toUpperCase()] || network;
    const requestId = `DATA_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

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
// ============================================================
// OPTIMIZED: Fast EasyAccess Data Purchase
// ============================================================

async function processEasyAccessDataPurchase({ network, phone, planId, plan, amount, userId }) {
  try {
    console.log('\n=== EASYACCESS DATA PURCHASE START ===');
    console.log('Network:', network);
    console.log('Phone:', phone);
    console.log('Plan ID:', planId);
    console.log('Amount:', amount);

    if (!network || !phone || !planId) {
      throw new Error('Missing required fields: network, phone, planId');
    }

    if (!/^0[789][01]\d{8}$/.test(phone)) {
      throw new Error('Invalid phone number format');
    }

    const EASYACCESS_BASE_URL = 'https://easyaccess.com.ng/api';
    const EASYACCESS_TOKEN = process.env.EASYACCESS_TOKEN || '3e17bad4c941d642424fc7a60320b622';

    // ✅ OPTIMIZATION 1: Skip price validation entirely or use cached prices
    // The price was already validated when user selected the plan in BuyData.tsx
    // We trust the planId and amount that were sent from the frontend
    
    console.log('⚡ Skipping price re-fetch for speed...');

    // ✅ OPTIMIZATION 2: Calculate pricing from the amount passed in
    // Since frontend already calculated customerPrice, we reverse-engineer the providerCost
    const pricing = calculateCustomerPrice(amount * 0.98, 'data'); // Rough estimate
    
    console.log('💰 Pricing:', {
      customerPrice: amount,
      estimatedProfit: pricing.profit
    });

    // ✅ OPTIMIZATION 3: Call EasyAccess API immediately
    const EASYACCESS_NETWORK_MAP = {
      'mtn': '01',
      'glo': '02',
      'airtel': '03',
      '9mobile': '04'
    };

    const networkCode = EASYACCESS_NETWORK_MAP[network.toLowerCase()];
    const clientReference = `EA_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    console.log('📡 Calling EasyAccess API immediately...');

    const FormData = require('form-data');
    const formData = new FormData();
    formData.append('network', networkCode);
    formData.append('mobileno', phone);
    formData.append('dataplan', planId);
    formData.append('client_reference', clientReference);

    const purchaseUrl = `${EASYACCESS_BASE_URL}/data.php`;

    const purchaseResponse = await axios.post(purchaseUrl, formData, {
      headers: {
        'AuthorizationToken': EASYACCESS_TOKEN,
        'cache-control': 'no-cache',
        ...formData.getHeaders()
      },
      timeout: 60000
    });

    console.log('📥 Purchase Response Status:', purchaseResponse.status);
    console.log('📥 Purchase Response Data:', purchaseResponse.data);

    let purchaseData = purchaseResponse.data;
    
    if (typeof purchaseData === 'string') {
      try {
        purchaseData = JSON.parse(purchaseData);
      } catch (e) {
        console.error('❌ Failed to parse purchase response:', purchaseData);
        throw new Error('Invalid response from provider');
      }
    }

    const isSuccess = purchaseData.success === 'true' || purchaseData.success === true;

    if (!isSuccess) {
      const errorMessage = purchaseData.message || 'Purchase failed';
      console.error('❌ EasyAccess purchase failed:', errorMessage);
      throw new Error(errorMessage);
    }

    console.log('✅ EasyAccess purchase successful!');

    return {
      success: true,
      reference: purchaseData.reference_no || clientReference,
      description: `Data purchase - ${network.toUpperCase()} ${plan} - ${phone}`,
      successMessage: 'Data purchase successful',
      transactionData: {
        network: network.toUpperCase(),
        phone,
        plan: plan,
        planId: planId,
        providerCost: pricing.providerCost,
        customerPrice: amount,
        profit: pricing.profit,
        serviceType: 'data',
        provider: 'easyaccess',
        reference: purchaseData.reference_no || clientReference,
        clientReference: clientReference,
        balanceAfter: purchaseData.balance_after || null,
        apiResponse: purchaseData
      }
    };

  } catch (error) {
    console.error('\n=== EASYACCESS PURCHASE ERROR ===');
    console.error('Error:', error.message);
    
    const reference = `EA_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    return {
      success: false,
      reference,
      errorMessage: error.message,
      transactionData: { 
        network: network?.toUpperCase(), 
        phone, 
        plan, 
        planId,
        provider: 'easyaccess',
        serviceType: 'data' 
      }
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

    console.log('=== EDUCATION PURCHASE START ===');
    console.log('Provider:', provider);
    console.log('ExamType (from frontend):', examType);
    console.log('Phone:', phone);
    console.log('Amount:', amount);

    let packages;
    if (provider === 'waec') {
      packages = await fetchWAECPackages();
    } else if (provider === 'jamb') {
      packages = await fetchJAMBPackages();
    } else {
      throw new Error('Unsupported education provider');
    }

    console.log(`📦 Fetched ${packages.length} packages from ClubKonnect`);

    const selectedPackage = packages.find(pkg => 
      pkg.code === examType || pkg.id === examType
    );

    if (!selectedPackage) {
      console.error('❌ Package not found:', examType);
      console.log('Available packages:', packages.map(p => p.code));
      throw new Error(`Package not found: ${examType}`);
    }

    console.log('✅ Selected Package:', selectedPackage);

    if (selectedPackage.price !== amount) {
      console.error('❌ Price mismatch!');
      console.log('ClubKonnect price:', selectedPackage.price);
      console.log('Customer paid:', amount);
      
      throw new Error(
        `PRICE_CHANGED: Current price is ₦${selectedPackage.price.toLocaleString()}, but received ₦${amount.toLocaleString()}. Please refresh and try again.`
      );
    }

    const requestId = `EDU_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    let endpoint, params;

    if (provider === 'waec') {
      endpoint = '/APIWAECV1.asp';
      params = { 
        ExamType: selectedPackage.code,
        PhoneNo: phone, 
        RequestID: requestId 
      };
    } else if (provider === 'jamb') {
      endpoint = '/APIJAMBV1.asp';
      params = { 
        ExamType: selectedPackage.code,
        PhoneNo: phone, 
        RequestID: requestId 
      };
    }

    console.log('📡 API Call:', { endpoint, params });

    const response = await makeClubKonnectRequest(endpoint, params);

    console.log('📥 ClubKonnect Response:', response);

    const isSuccess = 
      response.statuscode === '100' || 
      response.statuscode === '200' || 
      response.status === 'ORDER_RECEIVED' || 
      response.status === 'ORDER_COMPLETED';

    if (!isSuccess) {
      if (response.status === 'INVALID_EXAMTYPE') {
        throw new Error('Invalid exam type. Please contact support.');
      }
      if (response.status === 'INVALID_PHONENO') {
        throw new Error('Invalid phone number format');
      }
      if (response.status === 'INSUFFICIENT_BALANCE') {
        throw new Error('Insufficient balance in ClubKonnect account. Please contact support.');
      }
      
      throw new Error(response.remark || response.status || 'Purchase failed');
    }

    const cardDetails = response.carddetails || '';
    
    console.log('✅ Purchase successful!');
    console.log('Card Details:', cardDetails);
    console.log('Order ID:', response.orderid);

    return {
      success: true,
      reference: response.orderid || requestId,
      description: `${provider.toUpperCase()} ${selectedPackage.name} - ${phone}`,
      successMessage: response.remark || 'Education PIN purchased successfully',
      transactionData: {
        provider: provider.toUpperCase(),
        examType: selectedPackage.code,
        serviceName: selectedPackage.name,
        phone,
        cardDetails: cardDetails,
        providerCost: selectedPackage.price,
        customerPrice: selectedPackage.price,
        profit: 0,
        serviceType: 'education',
        orderid: response.orderid,
        statuscode: response.statuscode,
        date: response.date,
        walletbalance: response.walletbalance,
        apiResponse: response
      }
    };
    
  } catch (error) {
    console.error('=== EDUCATION PURCHASE ERROR ===');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    
    const reference = `EDU_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    return {
      success: false,
      reference,
      errorMessage: error.message,
      transactionData: { 
        provider: provider?.toUpperCase(), 
        examType, 
        phone,
        serviceType: 'education' 
      }
    };
  }
}

async function processInternetPurchase({ provider, plan, planType, customerNumber, amount, userId }) {
  try {
    if (!provider || !plan || !customerNumber) {
      throw new Error('Missing required fields: provider, plan, customerNumber');
    }

    if (provider.toLowerCase() !== 'smile') {
      throw new Error('Only Smile internet is currently supported');
    }

    console.log('📡 Using static Smile plan prices...');
    
    const selectedPlan = await findSmilePlan(plan);
    
    if (!selectedPlan) {
      throw new Error('Invalid plan selected or plan not available');
    }

    const clubKonnectPrice = selectedPlan.amount;

    if (clubKonnectPrice !== amount) {
      throw new Error(
        `PRICE_CHANGED: Plan price is ₦${clubKonnectPrice.toLocaleString()} but received ₦${amount.toLocaleString()}`
      );
    }

    console.log('Internet Purchase:', {
      plan: selectedPlan.name,
      clubKonnectPrice: clubKonnectPrice,
      customerPays: amount,
      profit: 0
    });

    const networkCode = 'smile-direct';
    const planId = selectedPlan.id;
    const requestId = `NET_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const purchaseResponse = await makeClubKonnectRequest('/APISmileV1.asp', {
      MobileNetwork: networkCode,
      DataPlan: planId,
      MobileNumber: customerNumber,
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
        description: `Internet - SMILE ${plan} - ${customerNumber}`,
        successMessage: remark || 'Smile internet subscription successful',
        transactionData: {
          provider: 'SMILE',
          plan: plan,
          planId: planId,
          customerNumber,
          providerCost: clubKonnectPrice,
          customerPrice: clubKonnectPrice,
          profit: 0,
          serviceType: 'internet',
          orderid: purchaseResponse.orderid,
          statuscode: statusCode,
          status: status,
          apiResponse: purchaseResponse
        }
      };
    }

    if (status === 'INVALID_ACCOUNTNO') {
      throw new Error('Invalid Smile account number');
    }
    if (status === 'DATAPLAN_NOT_AVAILABLE') {
      throw new Error('Selected plan is not currently available');
    }

    throw new Error(remark || status || 'Internet subscription failed');

  } catch (error) {
    const reference = `NET_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    return {
      success: false,
      reference,
      errorMessage: error.message,
      transactionData: { 
        provider: provider?.toUpperCase(), 
        plan, 
        customerNumber, 
        serviceType: 'internet' 
      }
    };
  }
}

async function findSmilePlan(planName) {
  const SMILE_PLANS = [
    { id: '624', name: '1GB FlexiDaily', amount: 450 },
    { id: '625', name: '2.5GB FlexiDaily', amount: 750 },
    { id: '626', name: '1GB FlexiWeekly', amount: 750 },
    { id: '627', name: '2GB FlexiWeekly', amount: 1550 },
    { id: '628', name: '6GB FlexiWeekly', amount: 2300 },
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
    { id: '730', name: 'UnlimitedLite', amount: 18500 },
    { id: '729', name: 'UnlimitedEssential', amount: 27700 },
    { id: '726', name: 'Freedom 3Mbps', amount: 38500 },
    { id: '727', name: 'Freedom 6Mbps', amount: 46500 },
    { id: '728', name: 'Freedom BestEffort', amount: 61500 },
    { id: '665', name: '90GB Jumbo', amount: 31000 },
    { id: '666', name: '160GB Jumbo', amount: 53000 },
    { id: '667', name: '200GB Jumbo', amount: 62000 },
    { id: '721', name: '400GB Jumbo', amount: 77000 },
    { id: '687', name: '15GB Annual', amount: 14000 },
    { id: '688', name: '35GB Annual', amount: 29000 },
    { id: '689', name: '70GB Annual', amount: 49500 },
    { id: '664', name: '125GB Annual', amount: 77000 },
    { id: '604', name: '200GB Annual', amount: 107000 },
    { id: '673', name: '500GB Annual', amount: 154000 },
    { id: '674', name: '1TB Annual', amount: 185000 },
    { id: '747', name: 'SmileVoice 65min', amount: 900 },
    { id: '748', name: 'SmileVoice 135min', amount: 1850 },
    { id: '749', name: 'SmileVoice 430min', amount: 5700 },
    { id: '750', name: 'SmileVoice 150min', amount: 2700 },
    { id: '751', name: 'SmileVoice 450min', amount: 7200 },
    { id: '752', name: 'SmileVoice 175min', amount: 3600 },
    { id: '753', name: 'SmileVoice 500min', amount: 9000 },
    { id: '758', name: 'Freedom Mobile Plan', amount: 5000 }
  ];
  
  return SMILE_PLANS.find(p => p.name === planName);
}

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

    let operatorsData = null;
    if (data.TV_ID) {
      operatorsData = data.TV_ID;
    } else if (data.DSTV || data.DStv || data.GOtv || data.Startimes) {
      operatorsData = data;
    } else {
      throw new Error('Invalid response from ClubKonnect API');
    }

    const OPERATOR_KEY_MAPPING = {
      'dstv': ['DStv', 'DSTV'],
      'gotv': ['GOtv', 'GOTV'],
      'startimes': ['Startimes', 'STARTIMES', 'StarTimes'],
      'startime': ['Startimes', 'STARTIMES', 'StarTimes']
    };

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

    const packageInfo = products.find(p => p.PACKAGE_ID === packageId);
    
    if (!packageInfo) {
      throw new Error('Invalid package selected or package not available');
    }

    const clubKonnectPrice = parseFloat(packageInfo.PACKAGE_AMOUNT);

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
          customerPrice: clubKonnectPrice,
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

// Add this to your purchase.js at the very bottom, replacing the existing initialization

// ✅ UPDATED: Service Initialization with data_easyaccess
(async () => {
  try {
    console.log('🔧 Initializing service configurations...');
    
    const services = [
      { type: 'airtime', name: 'Airtime Purchase', active: true },
      { type: 'data', name: 'Data Purchase', active: true },
      { type: 'data_easyaccess', name: 'EasyAccess Data Purchase', active: true },  // ✅ CRITICAL
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
        console.log(`✅ Created service config for: ${serviceInfo.type}`);
      } else {
        // ✅ UPDATE existing service to ensure it's active
        if (!service.isActive || service.maintenanceMode) {
          service.isActive = true;
          service.maintenanceMode = false;
          await service.save();
          console.log(`✅ Updated service config for: ${serviceInfo.type}`);
        }
      }
    }
    
    console.log('✅ All service configurations initialized');
  } catch (error) {
    console.error('❌ Service initialization error:', error);
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

router.get('/check-service/:type', authenticate, async (req, res) => {
  try {
    const service = await ServiceConfig.findOne({ serviceType: req.params.type });
    res.json({
      exists: !!service,
      service: service || 'Not found',
      all: await ServiceConfig.find()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;