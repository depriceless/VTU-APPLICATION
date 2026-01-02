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

const EDUCATION_MARKUP = 50; // ₦50 profit per card

// EasyAccess Configuration
const EA_CONFIG = {
  token: process.env.EASYACCESS_TOKEN || '3e17bad4c941d642424fc7a60320b622',
  baseUrl: 'https://easyaccess.com.ng/api'
};

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
 * Fetch WAEC packages from EasyAccess
 */
async function fetchWAECPackagesEasyAccess() {
  try {
    const url = `${EA_CONFIG.baseUrl}/get_plans.php?product_type=waec`;
    
    console.log('📡 Fetching WAEC packages from EasyAccess...');
    
    const response = await axios.get(url, {
      timeout: 30000,
      headers: {
        'AuthorizationToken': EA_CONFIG.token,
        'cache-control': 'no-cache'
      }
    });

    let data = response.data;
    
    if (typeof data === 'string') {
      try {
        data = JSON.parse(data);
      } catch (e) {
        console.error('Failed to parse WAEC response from EasyAccess');
        throw new Error('Invalid response from EasyAccess');
      }
    }

    console.log('✅ WAEC EasyAccess Response:', JSON.stringify(data, null, 2));
    
    // ✅ FIXED: Add markup to customer price
    const providerCost = 3300; // EasyAccess price
    const customerPrice = providerCost + EDUCATION_MARKUP; // ₦3,350
    
    const packages = [{
      id: 'waec',
      code: 'waec',
      name: 'WAEC Result Checker PIN',
      description: 'WAEC Result Checker PIN',
      price: customerPrice, // ✅ Customer pays ₦3,350
      providerCost: providerCost, // ✅ We pay ₦3,300
      provider: 'easyaccess',
      validity: '1 year',
      active: true,
      category: 'secondary'
    }];

    console.log(`✅ Parsed ${packages.length} WAEC package from EasyAccess`);
    console.log(`💰 WAEC Pricing: Provider=₦${providerCost}, Customer=₦${customerPrice}, Profit=₦${EDUCATION_MARKUP}`);
    return packages;
    
  } catch (error) {
    console.error('❌ Error fetching WAEC from EasyAccess:', error.message);
    return [];
  }
}


/**
 * Fetch NECO packages from EasyAccess
 */
async function fetchNECOPackagesEasyAccess() {
  try {
    const url = `${EA_CONFIG.baseUrl}/get_plans.php?product_type=neco`;
    
    console.log('📡 Fetching NECO packages from EasyAccess...');
    
    const response = await axios.get(url, {
      timeout: 30000,
      headers: {
        'AuthorizationToken': EA_CONFIG.token,
        'cache-control': 'no-cache'
      }
    });

    let data = response.data;
    
    if (typeof data === 'string') {
      try {
        data = JSON.parse(data);
      } catch (e) {
        console.error('Failed to parse NECO response from EasyAccess');
        throw new Error('Invalid response from EasyAccess');
      }
    }

    console.log('✅ NECO EasyAccess Response:', JSON.stringify(data, null, 2));
    
    // ✅ FIXED: Add markup to customer price
    const providerCost = 1150; // EasyAccess price
    const customerPrice = providerCost + EDUCATION_MARKUP; // ₦1,200
    
    const packages = [{
      id: 'neco',
      code: 'neco',
      name: 'NECO Result Checker Token',
      description: 'NECO Result Checker Token',
      price: customerPrice, // ✅ Customer pays ₦1,200
      providerCost: providerCost, // ✅ We pay ₦1,150
      provider: 'easyaccess',
      validity: '1 year',
      active: true,
      category: 'secondary'
    }];

    console.log(`✅ Parsed ${packages.length} NECO package from EasyAccess`);
    console.log(`💰 NECO Pricing: Provider=₦${providerCost}, Customer=₦${customerPrice}, Profit=₦${EDUCATION_MARKUP}`);
    return packages;
    
  } catch (error) {
    console.error('❌ Error fetching NECO from EasyAccess:', error.message);
    return [];
  }
}

/**
 * Fetch NABTEB packages from EasyAccess
 */
async function fetchNABTEBPackagesEasyAccess() {
  try {
    const url = `${EA_CONFIG.baseUrl}/get_plans.php?product_type=nabteb`;
    
    console.log('📡 Fetching NABTEB packages from EasyAccess...');
    
    const response = await axios.get(url, {
      timeout: 30000,
      headers: {
        'AuthorizationToken': EA_CONFIG.token,
        'cache-control': 'no-cache'
      }
    });

    let data = response.data;
    
    if (typeof data === 'string') {
      try {
        data = JSON.parse(data);
      } catch (e) {
        console.error('Failed to parse NABTEB response from EasyAccess');
        throw new Error('Invalid response from EasyAccess');
      }
    }

    console.log('✅ NABTEB EasyAccess Response:', JSON.stringify(data, null, 2));
    
    // ✅ FIXED: Add markup to customer price
    const providerCost = 830; // EasyAccess price
    const customerPrice = providerCost + EDUCATION_MARKUP; // ₦880
    
    const packages = [{
      id: 'nabteb',
      code: 'nabteb',
      name: 'NABTEB Result Checker PIN',
      description: 'NABTEB Result Checker PIN',
      price: customerPrice, // ✅ Customer pays ₦880
      providerCost: providerCost, // ✅ We pay ₦830
      provider: 'easyaccess',
      validity: '1 year',
      active: true,
      category: 'secondary'
    }];

    console.log(`✅ Parsed ${packages.length} NABTEB package from EasyAccess`);
    console.log(`💰 NABTEB Pricing: Provider=₦${providerCost}, Customer=₦${customerPrice}, Profit=₦${EDUCATION_MARKUP}`);
    return packages;
    
  } catch (error) {
    console.error('❌ Error fetching NABTEB from EasyAccess:', error.message);
    return [];
  }
}


/**
 * Fetch NBAIS packages from EasyAccess
 */
async function fetchNBAISPackagesEasyAccess() {
  try {
    const url = `${EA_CONFIG.baseUrl}/get_plans.php?product_type=nbais`;
    
    console.log('📡 Fetching NBAIS packages from EasyAccess...');
    
    const response = await axios.get(url, {
      timeout: 30000,
      headers: {
        'AuthorizationToken': EA_CONFIG.token,
        'cache-control': 'no-cache'
      }
    });

    let data = response.data;
    
    if (typeof data === 'string') {
      try {
        data = JSON.parse(data);
      } catch (e) {
        console.error('Failed to parse NBAIS response from EasyAccess');
        throw new Error('Invalid response from EasyAccess');
      }
    }

    console.log('✅ NBAIS EasyAccess Response:', JSON.stringify(data, null, 2));
    
    // ✅ FIXED: Add markup to customer price
    const providerCost = 900; // EasyAccess price
    const customerPrice = providerCost + EDUCATION_MARKUP; // ₦950
    
    const packages = [{
      id: 'nbais',
      code: 'nbais',
      name: 'NBAIS Result Checker PIN',
      description: 'NBAIS Result Checker PIN',
      price: customerPrice, // ✅ Customer pays ₦950
      providerCost: providerCost, // ✅ We pay ₦900
      provider: 'easyaccess',
      validity: '1 year',
      active: true,
      category: 'secondary'
    }];

    console.log(`✅ Parsed ${packages.length} NBAIS package from EasyAccess`);
    console.log(`💰 NBAIS Pricing: Provider=₦${providerCost}, Customer=₦${customerPrice}, Profit=₦${EDUCATION_MARKUP}`);
    return packages;
    
  } catch (error) {
    console.error('❌ Error fetching NBAIS from EasyAccess:', error.message);
    return [];
  }
}

/**
 * Fetch all education packages from EasyAccess
 */
async function fetchAllEducationPackagesEasyAccess() {
  try {
    console.log('📚 Fetching all education packages from EasyAccess...');
    
    const [waecPackages, necoPackages, nabtebPackages, nbaisPackages] = await Promise.all([
      fetchWAECPackagesEasyAccess(),
      fetchNECOPackagesEasyAccess(),
      fetchNABTEBPackagesEasyAccess(),
      fetchNBAISPackagesEasyAccess()
    ]);

    return {
      waec: waecPackages,
      neco: necoPackages,
      nabteb: nabtebPackages,
      nbais: nbaisPackages,
      all: [...waecPackages, ...necoPackages, ...nabtebPackages, ...nbaisPackages]
    };
  } catch (error) {
    console.error('❌ Error fetching education packages from EasyAccess:', error);
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
    
    const packages = await fetchAllEducationPackagesEasyAccess();
    
    console.log('✅ Returning EasyAccess packages:', {
      waec: packages.waec.length,
      neco: packages.neco.length,
      nabteb: packages.nabteb.length,
      nbais: packages.nbais.length,
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


// ============================================================
// UPDATED: Process Education Purchase with Profit Tracking
// ============================================================

async function processEducationPurchase({ provider, examType, phone, amount, quantity, userId }) {
  try {
    console.log('=== EASYACCESS EDUCATION PURCHASE START ===');
    console.log('Provider:', provider);
    console.log('Exam Type:', examType);
    console.log('Phone:', phone);
    console.log('Amount:', amount);
    console.log('Quantity:', quantity || 1);

    // Validate required fields
    if (!provider || !examType || !phone) {
      throw new Error('Missing required fields: provider, examType, phone');
    }

    if (!/^0[789][01]\d{8}$/.test(phone)) {
      throw new Error('Invalid phone number format');
    }

    // Validate quantity (default to 1 if not provided)
    const qty = parseInt(quantity) || 1;
    if (qty < 1 || qty > 10) {
      throw new Error('Quantity must be between 1 and 10');
    }

    // Validate provider
    const validProviders = ['waec', 'neco', 'nabteb', 'nbais'];
    const normalizedProvider = provider.toLowerCase();
    
    if (!validProviders.includes(normalizedProvider)) {
      throw new Error(`Unsupported education provider: ${provider}. Valid options: WAEC, NECO, NABTEB, NBAIS`);
    }

    // Get package details from EasyAccess
    let packages;
    switch (normalizedProvider) {
      case 'waec':
        packages = await fetchWAECPackagesEasyAccess();
        break;
      case 'neco':
        packages = await fetchNECOPackagesEasyAccess();
        break;
      case 'nabteb':
        packages = await fetchNABTEBPackagesEasyAccess();
        break;
      case 'nbais':
        packages = await fetchNBAISPackagesEasyAccess();
        break;
      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }

    if (!packages || packages.length === 0) {
      throw new Error(`No packages available for ${provider.toUpperCase()}`);
    }

    const selectedPackage = packages[0]; // There's only 1 package per provider
    
    // ✅ CRITICAL FIX: Use customerPrice (with markup) for validation
    const pricePerPin = selectedPackage.price; // Customer price (₦3,350 for WAEC)
    const providerCostPerPin = selectedPackage.providerCost; // Provider cost (₦3,300 for WAEC)
    const totalCustomerAmount = pricePerPin * qty; // What customer pays
    const totalProviderCost = providerCostPerPin * qty; // What we pay EasyAccess
    const totalProfit = totalCustomerAmount - totalProviderCost; // Our profit

    console.log('📦 Package Details:', {
      name: selectedPackage.name,
      customerPricePerPin: pricePerPin,
      providerCostPerPin: providerCostPerPin,
      profitPerPin: pricePerPin - providerCostPerPin,
      quantity: qty,
      totalCustomerPays: totalCustomerAmount,
      totalProviderCost: totalProviderCost,
      totalProfit: totalProfit,
      amountReceived: amount
    });

    // ✅ FIXED: Validate against customer price (with markup)
    if (totalCustomerAmount !== amount) {
      throw new Error(
        `PRICE_MISMATCH: Expected ₦${totalCustomerAmount.toLocaleString()} (₦${pricePerPin} × ${qty}), but received ₦${amount.toLocaleString()}`
      );
    }

    // Call EasyAccess API
    const requestId = `EDU_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    console.log('📡 Calling EasyAccess API...');
    console.log('Endpoint:', `${EA_CONFIG.baseUrl}/${normalizedProvider}_v2.php`);

    const FormData = require('form-data');
    const formData = new FormData();
    formData.append('no_of_pins', qty.toString());

    const response = await axios.post(
      `${EA_CONFIG.baseUrl}/${normalizedProvider}_v2.php`,
      formData,
      {
        headers: {
          'AuthorizationToken': EA_CONFIG.token,
          'cache-control': 'no-cache',
          ...formData.getHeaders()
        },
        timeout: 60000
      }
    );

    console.log('📥 EasyAccess Response Status:', response.status);
    console.log('📥 EasyAccess Response Data:', response.data);

    let data = response.data;
    
    // Parse response if string
    if (typeof data === 'string') {
      try {
        data = JSON.parse(data);
      } catch (e) {
        console.error('❌ Failed to parse response:', data);
        throw new Error('Invalid response from EasyAccess');
      }
    }

    // Check success
    const isSuccess = data.success === 'true' || data.success === true;

    if (!isSuccess) {
      const errorMessage = data.message || 'Purchase failed';
      console.error('❌ EasyAccess Error:', errorMessage);
      
      // Handle specific errors
      if (errorMessage.includes('Invalid Authorization Token')) {
        throw new Error('API authentication failed. Please contact support.');
      }
      if (errorMessage.includes('Insufficient Balance')) {
        throw new Error('Insufficient balance with provider. Please contact support.');
      }
      
      throw new Error(errorMessage);
    }

    // Parse pins from response
    const pins = [];
    
    for (let i = 1; i <= qty; i++) {
      const pinKey = i === 1 ? 'pin' : `pin${i}`;
      const pinValue = data[pinKey];
      
      if (pinValue) {
        // Parse different pin formats
        if (normalizedProvider === 'waec' || normalizedProvider === 'nabteb') {
          // Format: "pin<=>serial" e.g., "577698975131<=>WRN192476073"
          const parts = pinValue.split('<=>');
          pins.push({
            pin: parts[0] || pinValue,
            serial: parts[1] || null
          });
        } else {
          // NECO and NBAIS: just the token/pin
          pins.push({
            pin: pinValue,
            serial: null
          });
        }
      }
    }

    console.log('✅ Parsed Pins:', pins);

    // Create description
    const pinsText = pins.map((p, index) => {
      if (p.serial) {
        return `Card #${index + 1}: PIN: ${p.pin}, Serial: ${p.serial}`;
      } else {
        return `Card #${index + 1}: ${p.pin}`;
      }
    }).join(' | ');

    const description = `${provider.toUpperCase()} ${selectedPackage.name} - ${qty} card(s) - ${phone}. ${pinsText}`;

    console.log('✅ Purchase Successful!');
    console.log('💰 Profit Breakdown:', {
      customerPaid: totalCustomerAmount,
      providerCost: totalProviderCost,
      profit: totalProfit
    });

    return {
      success: true,
      reference: data.reference_no || requestId,
      description: description,
      successMessage: data.message || `Successfully purchased ${qty} ${provider.toUpperCase()} pin(s)`,
      transactionData: {
        provider: provider.toUpperCase(),
        examType: examType,
        serviceName: selectedPackage.name,
        phone,
        quantity: qty,
        pins: pins,
        pricePerPin: pricePerPin, // Customer price per pin
        providerCost: totalProviderCost, // What we paid EasyAccess
        customerPrice: totalCustomerAmount, // What customer paid us
        profit: totalProfit, // Our profit (₦50 × qty)
        serviceType: 'education',
        reference: data.reference_no || requestId,
        transaction_date: data.transaction_date || new Date().toISOString(),
        apiResponse: data
      }
    };

  } catch (error) {
    console.error('=== EASYACCESS EDUCATION PURCHASE ERROR ===');
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
        quantity: quantity || 1,
        serviceType: 'education'
      }
    };
  }
}

async function processInternetPurchase({ provider, plan, planId, planType, customerNumber, amount, userId }) {
  try {
    console.log('\n=== INTERNET PURCHASE DEBUG ===');
    console.log('Provider:', provider);
    console.log('Plan:', plan);
    console.log('Plan ID:', planId);
    console.log('Customer Number:', customerNumber);
    console.log('Amount:', amount);

    if (!provider || !plan || !customerNumber) {
      throw new Error('Missing required fields: provider, plan, customerNumber');
    }

    if (provider.toLowerCase() !== 'smile') {
      throw new Error('Only Smile internet is currently supported');
    }

   const SMILE_PLAN_MAPPING = {
  // FlexiDaily Plans - FIXED
  '1GB FlexiDaily': '843',        // ✅ Corrected
  'SmileMINI 1GB for 1days': '843',
  '2.5GB FlexiDaily': '844',      // ✅ FIXED: Changed from '625' to '844'
  'Smile MINI 2.5GB for 1days': '844',
  'Smile MINI 3GB for 2days': '845',
  'Smile MINI 5GB for 2days': '846',
  
  // FlexiWeekly Plans
  '1GB FlexiWeekly': '847',       // ✅ Corrected
  'Smile MINI 1GB for 7days': '847',
  '2GB FlexiWeekly': '848',       // ✅ Corrected
  '3.5GB FlexiWeekly': '848',
  'Smile MINI 3.5GB for 7days': '848',
  '6GB FlexiWeekly': '849',       // ✅ Corrected
  'Smile MINI 6GB for 7days': '849',
  
  // Bigga Plans (Monthly)
  '1.5GB Bigga': '828',           // ✅ Corrected
  'Smile MIDI 1.5GB for 30days': '828',
  '2GB Bigga': '829',             // ✅ Corrected
  'Smile MIDI 2GB for 30days': '829',
  '3GB Bigga': '830',             // ✅ Corrected
  'Smile MIDI 3GB for 30days': '830',
  '5GB Bigga': '831',             // ✅ Corrected
  '6.5GB Bigga': '831',
  'Smile MIDI 6GB for 30days': '831',
  '10GB Bigga': '833',            // ✅ Corrected
  'Smile MIDI 8GB for 30days': '832',
  'Smile MIDI 10GB for 30days': '833',
  '15GB Bigga': '834',            // ✅ Corrected
  'Smile MIDI 13GB for 30days': '834',
  '20GB Bigga': '836',            // ✅ Corrected
  'Smile MIDI 18GB for 30days': '835',
  '25GB Bigga': '837',            // ✅ Corrected
  'Smile MIDI 20GB for 30days': '836',
  '30GB Bigga': '837',            // ✅ Corrected
  'Smile MIDI 25GB for 30days': '837',
  '40GB Bigga': '838',            // ✅ Corrected
  'Smile MIDI 40GB for 30days': '838',
  '60GB Bigga': '839',            // ✅ Corrected
  'Smile MIDI 65GB for 30days': '839',
  '75GB Bigga': '840',            // ✅ Corrected
  '100GB Bigga': '840',           // ✅ Corrected
  'Smile MIDI 100GB for 30days': '840',
  '130GB Bigga': '841',           // ✅ Corrected
  'Smile MIDI 130GB for 30days': '841',
  'Smile MIDI 210GB for 30days': '842',
  
  // Unlimited Plans
  'UnlimitedLite': '823',
  'Smile MAXI Lite for 30days': '823',
  'UnlimitedEssential': '824',
  'Smile MAXI Essential for 30days': '824',
  'Smile Maxi Home for 30days': '826',
  'Smile MAXI Office for 30days': '827',
  'Smile MAXI DataFlux for 30days': '825',
  
  // Freedom Plans
  'Freedom 3Mbps': '826',
  'Freedom 6Mbps': '827',
  'Freedom BestEffort': '825',
  'Freedom Mobile Plan for 30days': '758',
  
  // Jumbo Plans
  '90GB Jumbo': '850',
  'Smile JUMBO 90GB for 60days': '850',
  '160GB Jumbo': '851',
  'Smile JUMBO 300GB for 90days': '851',
  '200GB Jumbo': '852',
  'Smile JUMBO 350GB for 120days': '852',
  '400GB Jumbo': '853',
  'Smile JUMBO 500GB for 180days': '853',
  
  // Annual Plans
  '15GB Annual': '854',
  'Smile ANNUAL 20GB for 365days': '854',
  '35GB Annual': '855',
  'Smile ANNUAL 50GB for 365days': '855',
  '70GB Annual': '856',
  'Smile ANNUAL 120GB for 365days': '856',
  '125GB Annual': '857',
  'Smile ANNUAL 250GB for 365days': '857',
  '200GB Annual': '858',
  'Smile ANNUAL 450GB for 365days': '858',
  '500GB Annual': '859',
  'Smile ANNUAL 700GB for 365days': '859',
  '1TB Annual': '860',
  'Smile ANNUAL 1TB for 365days': '860',
  
  // Voice Plans
  'SmileVoice 65min': '803',
  'SmileVoice ONLY 65 for 30days': '803',
  'SmileVoice 135min': '804',
  'SmileVoice ONLY 135 for 30days': '804',
  'SmileVoice 430min': '805',
  'SmileVoice ONLY 430 for 30days': '805',
  'SmileVoice 150min': '806',
  'SmileVoice ONLY 150 for 60days': '806',
  'SmileVoice 450min': '808',
  'SmileVoice ONLY 175 for 90days': '807',
  'SmileVoice 175min': '807',
  'SmileVoice ONLY 450 for 60days': '808',
  'SmileVoice 500min': '809',
  'SmileVoice ONLY 500 for 90days': '809'
};



    let correctPlanId = planId;
    
    if (!correctPlanId || correctPlanId === 'undefined') {
      correctPlanId = SMILE_PLAN_MAPPING[plan];
      console.log(`🔍 Looked up plan ID for "${plan}": ${correctPlanId}`);
    }

    if (!correctPlanId) {
      console.error(`❌ No plan ID found for plan: "${plan}"`);
      throw new Error(`Invalid plan selected: "${plan}". Please select a valid Smile plan.`);
    }

    console.log('✅ Using Plan ID:', correctPlanId);

    // Validate price (no profit margin for internet)
    const clubKonnectPrice = amount;

    console.log('💰 Internet Purchase Pricing:', {
      plan: plan,
      planId: correctPlanId,
      clubKonnectPrice: clubKonnectPrice,
      customerPays: amount,
      profit: 0
    });

    // ✅ CRITICAL: Use correct network code for Smile
    const networkCode = 'smile-direct'; // This is correct according to Document 1
    const requestId = `NET_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    console.log('📡 ClubKonnect API Call Details:');
    console.log('  - Network Code:', networkCode);
    console.log('  - Plan ID:', correctPlanId);
    console.log('  - Customer Number:', customerNumber);
    console.log('  - Request ID:', requestId);

    // ✅ Call ClubKonnect API
    const purchaseResponse = await makeClubKonnectRequest('/APISmileV1.asp', {
      MobileNetwork: networkCode,
      DataPlan: correctPlanId,
      MobileNumber: customerNumber,
      RequestID: requestId
    });

    console.log('📥 ClubKonnect Response:', purchaseResponse);

    // ✅ Parse response
    const statusCode = purchaseResponse.statuscode || purchaseResponse.status_code;
    const status = purchaseResponse.status || purchaseResponse.orderstatus;
    const remark = purchaseResponse.remark || purchaseResponse.message;

    console.log('📊 Response Analysis:', {
      statusCode,
      status,
      remark,
      orderid: purchaseResponse.orderid
    });

    // ✅ Check for success
    if (statusCode === '100' || statusCode === '200' || 
        status === 'ORDER_RECEIVED' || status === 'ORDER_COMPLETED') {
      
      console.log('✅ Purchase successful!');
      
      return {
        success: true,
        reference: purchaseResponse.orderid || requestId,
        description: `Internet - SMILE ${plan} - ${customerNumber}`,
        successMessage: remark || 'Smile internet subscription successful',
        transactionData: {
          provider: 'SMILE',
          plan: plan,
          planId: correctPlanId,
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

    // ✅ Handle specific errors
    console.error('❌ Purchase failed:', { statusCode, status, remark });

    if (status === 'INVALID_ACCOUNTNO' || status === 'INVALID_MOBILENUMBER') {
      throw new Error('Invalid Smile account number. Please verify the number and try again.');
    }
    
    if (status === 'DATAPLAN_NOT_AVAILABLE' || status === 'PLAN_NOT_AVAILABLE') {
      throw new Error('Selected plan is not currently available. Please try a different plan.');
    }
    
    if (status === 'MobileNetwork_NOT_AVAILABLE') {
      throw new Error('Smile service is temporarily unavailable. Please try again later.');
    }
    
    if (status === 'INSUFFICIENT_BALANCE') {
      throw new Error('Provider has insufficient balance. Please contact support.');
    }

    throw new Error(remark || status || 'Internet subscription failed. Please try again.');

  } catch (error) {
    console.error('\n=== INTERNET PURCHASE ERROR ===');
    console.error('Error Message:', error.message);
    console.error('Error Stack:', error.stack);
    
    const reference = `NET_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    return {
      success: false,
      reference,
      errorMessage: error.message,
      transactionData: { 
        provider: provider?.toUpperCase(), 
        plan, 
        planId,
        customerNumber, 
        serviceType: 'internet' 
      }
    };
  }
}

// ============================================================
// ✅ HELPER: Find Smile Plan by Name or ID
// ============================================================
async function findSmilePlan(planNameOrId) {
  // This is the OFFICIAL mapping from Document 3
  const SMILE_PLANS = {
    // Use plan ID as key for fast lookup
    '624': { id: '624', name: '1GB FlexiDaily', amount: 450 },
    '625': { id: '625', name: '2.5GB FlexiDaily', amount: 750 },
    '843': { id: '843', name: 'SmileMINI 1GB for 1days', amount: 450 },
    '844': { id: '844', name: 'Smile MINI 2.5GB for 1days', amount: 750 },
    '845': { id: '845', name: 'Smile MINI 3GB for 2days', amount: 1500 },
    '846': { id: '846', name: 'Smile MINI 5GB for 2days', amount: 2200 },
    '626': { id: '626', name: '1GB FlexiWeekly', amount: 750 },
    '627': { id: '627', name: '2GB FlexiWeekly', amount: 1550 },
    '628': { id: '628', name: '6GB FlexiWeekly', amount: 2300 },
    '847': { id: '847', name: 'Smile MINI 1GB for 7days', amount: 750 },
    '848': { id: '848', name: 'Smile MINI 3.5GB for 7days', amount: 1500 },
    '849': { id: '849', name: 'Smile MINI 6GB for 7days', amount: 2300 },
    '606': { id: '606', name: '1.5GB Bigga', amount: 1550 },
    '607': { id: '607', name: '2GB Bigga', amount: 1850 },
    '608': { id: '608', name: '3GB Bigga', amount: 2300 },
    '620': { id: '620', name: '5GB Bigga', amount: 3100 },
    '609': { id: '609', name: '6.5GB Bigga', amount: 3800 },
    '722': { id: '722', name: '10GB Bigga', amount: 4600 },
    '723': { id: '723', name: '15GB Bigga', amount: 6200 },
    '724': { id: '724', name: '20GB Bigga', amount: 8000 },
    '725': { id: '725', name: '25GB Bigga', amount: 9500 },
    '615': { id: '615', name: '30GB Bigga', amount: 12500 },
    '616': { id: '616', name: '40GB Bigga', amount: 15500 },
    '617': { id: '617', name: '60GB Bigga', amount: 21000 },
    '618': { id: '618', name: '75GB Bigga', amount: 23000 },
    '619': { id: '619', name: '100GB Bigga', amount: 27500 },
    '668': { id: '668', name: '130GB Bigga', amount: 30500 },
    '828': { id: '828', name: 'Smile MIDI 1.5GB for 30days', amount: 1250 },
    '829': { id: '829', name: 'Smile MIDI 2GB for 30days', amount: 1500 },
    '830': { id: '830', name: 'Smile MIDI 3GB for 30days', amount: 2000 },
    '831': { id: '831', name: 'Smile MIDI 6GB for 30days', amount: 3000 },
    '832': { id: '832', name: 'Smile MIDI 8GB for 30days', amount: 3500 },
    '833': { id: '833', name: 'Smile MIDI 10GB for 30days', amount: 4000 },
    '834': { id: '834', name: 'Smile MIDI 13GB for 30days', amount: 5000 },
    '835': { id: '835', name: 'Smile MIDI 18GB for 30days', amount: 6000 },
    '836': { id: '836', name: 'Smile MIDI 20GB for 30days', amount: 7000 },
    '837': { id: '837', name: 'Smile MIDI 25GB for 30days', amount: 9000 },
    '838': { id: '838', name: 'Smile MIDI 40GB for 30days', amount: 12500 },
    '839': { id: '839', name: 'Smile MIDI 65GB for 30days', amount: 15000 },
    '840': { id: '840', name: 'Smile MIDI 100GB for 30days', amount: 20000 },
    '841': { id: '841', name: 'Smile MIDI 130GB for 30days', amount: 25000 },
    '842': { id: '842', name: 'Smile MIDI 210GB for 30days', amount: 40000 },
    '730': { id: '730', name: 'UnlimitedLite', amount: 18500 },
    '729': { id: '729', name: 'UnlimitedEssential', amount: 27700 },
    '823': { id: '823', name: 'Smile MAXI Lite for 30days', amount: 15000 },
    '824': { id: '824', name: 'Smile MAXI Essential for 30days', amount: 27700 },
    '826': { id: '826', name: 'Smile Maxi Home for 30days', amount: 38500 },
    '827': { id: '827', name: 'Smile MAXI Office for 30days', amount: 45000 },
    '825': { id: '825', name: 'Smile MAXI DataFlux for 30days', amount: 61500 },
    '726': { id: '726', name: 'Freedom 3Mbps', amount: 38500 },
    '727': { id: '727', name: 'Freedom 6Mbps', amount: 46500 },
    '728': { id: '728', name: 'Freedom BestEffort', amount: 61500 },
    '758': { id: '758', name: 'Freedom Mobile Plan for 30days', amount: 5000 },
    '665': { id: '665', name: '90GB Jumbo', amount: 31000 },
    '666': { id: '666', name: '160GB Jumbo', amount: 53000 },
    '667': { id: '667', name: '200GB Jumbo', amount: 62000 },
    '721': { id: '721', name: '400GB Jumbo', amount: 77000 },
    '850': { id: '850', name: 'Smile JUMBO 90GB for 60days', amount: 25000 },
    '851': { id: '851', name: 'Smile JUMBO 300GB for 90days', amount: 50000 },
    '852': { id: '852', name: 'Smile JUMBO 350GB for 120days', amount: 60000 },
    '853': { id: '853', name: 'Smile JUMBO 500GB for 180days', amount: 77000 },
    '687': { id: '687', name: '15GB Annual', amount: 14000 },
    '688': { id: '688', name: '35GB Annual', amount: 29000 },
    '689': { id: '689', name: '70GB Annual', amount: 49500 },
    '664': { id: '664', name: '125GB Annual', amount: 77000 },
    '604': { id: '604', name: '200GB Annual', amount: 107000 },
    '673': { id: '673', name: '500GB Annual', amount: 154000 },
    '674': { id: '674', name: '1TB Annual', amount: 185000 },
    '854': { id: '854', name: 'Smile ANNUAL 20GB for 365days', amount: 14000 },
    '855': { id: '855', name: 'Smile ANNUAL 50GB for 365days', amount: 29000 },
    '856': { id: '856', name: 'Smile ANNUAL 120GB for 365days', amount: 49500 },
    '857': { id: '857', name: 'Smile ANNUAL 250GB for 365days', amount: 77000 },
    '858': { id: '858', name: 'Smile ANNUAL 450GB for 365days', amount: 107000 },
    '859': { id: '859', name: 'Smile ANNUAL 700GB for 365days', amount: 154000 },
    '860': { id: '860', name: 'Smile ANNUAL 1TB for 365days', amount: 180000 },
    '747': { id: '747', name: 'SmileVoice 65min', amount: 900 },
    '748': { id: '748', name: 'SmileVoice 135min', amount: 1850 },
    '749': { id: '749', name: 'SmileVoice 430min', amount: 5700 },
    '750': { id: '750', name: 'SmileVoice 150min', amount: 2700 },
    '751': { id: '751', name: 'SmileVoice 450min', amount: 7200 },
    '752': { id: '752', name: 'SmileVoice 175min', amount: 3600 },
    '753': { id: '753', name: 'SmileVoice 500min', amount: 9000 },
    '803': { id: '803', name: 'SmileVoice ONLY 65 for 30days', amount: 900 },
    '804': { id: '804', name: 'SmileVoice ONLY 135 for 30days', amount: 1850 },
    '805': { id: '805', name: 'SmileVoice ONLY 430 for 30days', amount: 5700 },
    '806': { id: '806', name: 'SmileVoice ONLY 150 for 60days', amount: 2700 },
    '807': { id: '807', name: 'SmileVoice ONLY 175 for 90days', amount: 3600 },
    '808': { id: '808', name: 'SmileVoice ONLY 450 for 60days', amount: 7200 },
    '809': { id: '809', name: 'SmileVoice ONLY 500 for 90days', amount: 9000 }
  };
  
  // Try direct ID lookup first
  if (SMILE_PLANS[planNameOrId]) {
    return SMILE_PLANS[planNameOrId];
  }
  
  // Try name lookup
  const planByName = Object.values(SMILE_PLANS).find(p => p.name === planNameOrId);
  if (planByName) {
    return planByName;
  }
  
  return null;
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

// Add this test route to your purchase.js or create a separate test file

router.get('/test-smile-api', authenticate, async (req, res) => {
  try {
    console.log('\n=== TESTING CLUBKONNECT SMILE API ===');
    
    const CK_CONFIG = {
      userId: process.env.CLUBKONNECT_USER_ID || 'CK101263696',
      apiKey: process.env.CLUBKONNECT_API_KEY || 'E94SKRM091S21A66T8Q6790WE17LYA24ADOJ4FRL691JC00KJ34D241M19RRX1HU',
      baseUrl: 'https://www.nellobytesystems.com'
    };

    // Test 1: Check if we can get Smile packages
    console.log('\n📦 Test 1: Fetching Smile Packages List');
    try {
      const packagesUrl = `${CK_CONFIG.baseUrl}/APISmilePackagesV2.asp?UserID=${CK_CONFIG.userId}`;
      const packagesResponse = await axios.get(packagesUrl, { timeout: 15000 });
      console.log('✅ Packages API Response Status:', packagesResponse.status);
      console.log('📦 Packages Data Preview:', JSON.stringify(packagesResponse.data).substring(0, 500));
    } catch (error) {
      console.error('❌ Packages API Failed:', error.message);
    }

    // Test 2: Verify a Smile account
    console.log('\n🔍 Test 2: Verifying Smile Account');
    try {
      const verifyUrl = `${CK_CONFIG.baseUrl}/APIVerifySmileV1.asp?UserID=${CK_CONFIG.userId}&APIKey=${CK_CONFIG.apiKey}&MobileNetwork=smile-direct&MobileNumber=08141900468`;
      const verifyResponse = await axios.get(verifyUrl, { timeout: 15000 });
      console.log('✅ Verify API Response Status:', verifyResponse.status);
      console.log('🔍 Verify Data:', verifyResponse.data);
    } catch (error) {
      console.error('❌ Verify API Failed:', error.message);
    }

    // Test 3: Try different network code formats
    console.log('\n🧪 Test 3: Testing Different Network Codes');
    const networkCodesToTry = [
      'smile-direct',
      'SMILE-DIRECT', 
      'smile',
      'SMILE',
      'Smile',
      '05', // Sometimes providers use numeric codes
      'smile_direct'
    ];

    const testResults = {};

    for (const networkCode of networkCodesToTry) {
      try {
        console.log(`\n  Testing network code: "${networkCode}"`);
        
        const testUrl = `${CK_CONFIG.baseUrl}/APISmileV1.asp`;
        const params = new URLSearchParams({
          UserID: CK_CONFIG.userId,
          APIKey: CK_CONFIG.apiKey,
          MobileNetwork: networkCode,
          DataPlan: '625', // 2.5GB FlexiDaily
          MobileNumber: '08141900468',
          RequestID: `TEST_${Date.now()}`
        });

        const response = await axios.get(`${testUrl}?${params}`, { 
          timeout: 15000,
          headers: { 'Accept': 'application/json' }
        });

        let data = response.data;
        if (typeof data === 'string') {
          try {
            data = JSON.parse(data);
          } catch (e) {
            // Keep as string
          }
        }

        testResults[networkCode] = {
          status: response.status,
          data: data
        };

        console.log(`  ✅ Response for "${networkCode}":`, data);

        // If we get a successful response, stop testing
        if (data.statuscode === '100' || data.statuscode === '200' || 
            data.status === 'ORDER_RECEIVED' || data.status === 'ORDER_COMPLETED') {
          console.log(`  🎉 SUCCESS! Correct network code is: "${networkCode}"`);
          break;
        }

      } catch (error) {
        testResults[networkCode] = {
          status: 'ERROR',
          error: error.message
        };
        console.log(`  ❌ Failed for "${networkCode}":`, error.message);
      }
    }

    // Test 4: Check API Balance
    console.log('\n💰 Test 4: Checking ClubKonnect API Balance');
    try {
      const balanceUrl = `${CK_CONFIG.baseUrl}/APIWalletBalanceV1.asp?UserID=${CK_CONFIG.userId}&APIKey=${CK_CONFIG.apiKey}`;
      const balanceResponse = await axios.get(balanceUrl, { timeout: 15000 });
      console.log('✅ Balance API Response:', balanceResponse.data);
    } catch (error) {
      console.error('❌ Balance API Failed:', error.message);
    }

    // Return summary
    res.json({
      success: true,
      message: 'ClubKonnect API diagnostic test completed',
      tests: {
        packagesAPI: 'Check console logs',
        verifyAPI: 'Check console logs',
        networkCodeTests: testResults,
        balanceAPI: 'Check console logs'
      },
      recommendation: 'Check your server console logs for detailed results',
      note: 'Look for the network code that returns SUCCESS in Test 3'
    });

  } catch (error) {
    console.error('❌ Diagnostic Test Error:', error);
    res.status(500).json({
      success: false,
      message: 'Diagnostic test failed',
      error: error.message
    });
  }
});

// ============================================================
// ADDITIONAL: Test specific Smile purchase
// ============================================================
router.post('/test-smile-purchase', authenticate, async (req, res) => {
  try {
    const { customerNumber, planId } = req.body;

    if (!customerNumber || !planId) {
      return res.status(400).json({
        success: false,
        message: 'Provide customerNumber and planId in request body'
      });
    }

    console.log('\n=== TESTING SMILE PURCHASE ===');
    console.log('Customer Number:', customerNumber);
    console.log('Plan ID:', planId);

    const CK_CONFIG = {
      userId: process.env.CLUBKONNECT_USER_ID,
      apiKey: process.env.CLUBKONNECT_API_KEY,
      baseUrl: 'https://www.nellobytesystems.com'
    };

    const params = new URLSearchParams({
      UserID: CK_CONFIG.userId,
      APIKey: CK_CONFIG.apiKey,
      MobileNetwork: 'smile-direct',
      DataPlan: planId,
      MobileNumber: customerNumber,
      RequestID: `TEST_${Date.now()}`
    });

    const url = `${CK_CONFIG.baseUrl}/APISmileV1.asp?${params}`;
    
    console.log('📡 Request URL:', url);

    const response = await axios.get(url, {
      timeout: 30000,
      headers: { 'Accept': 'application/json' }
    });

    let data = response.data;
    if (typeof data === 'string') {
      data = JSON.parse(data);
    }

    console.log('📥 Response:', data);

    res.json({
      success: true,
      message: 'Test purchase completed',
      request: {
        customerNumber,
        planId,
        networkCode: 'smile-direct'
      },
      response: data,
      analysis: {
        statusCode: data.statuscode || data.status_code,
        status: data.status || data.orderstatus,
        isSuccess: data.statuscode === '100' || data.statuscode === '200',
        remark: data.remark || data.message
      }
    });

  } catch (error) {
    console.error('❌ Test Purchase Error:', error);
    res.status(500).json({
      success: false,
      message: 'Test purchase failed',
      error: error.message,
      response: error.response?.data
    });
  }
});
// ========== VERIFY DATA PURCHASE (UPDATED - CLEAN DESCRIPTION) ==========
router.get('/verify-data/:reference', authenticate, async (req, res) => {
  try {
    const { reference } = req.params;
    const cleanReference = reference.trim();
    
    if (!cleanReference) {
      return res.status(400).json({
        success: false,
        message: 'Transaction reference is required'
      });
    }

    console.log('🔍 Verifying data purchase:', cleanReference);
    console.log('👤 User ID:', req.user.userId);

    // Find transaction with flexible serviceType matching
    const transaction = await Transaction.findOne({
      reference: cleanReference,
      userId: req.user.userId,
      $or: [
        { serviceType: { $in: ['data', 'data_easyaccess'] } },
        { serviceType: { $exists: false }, description: { $regex: /data purchase/i } },
        { serviceType: null, description: { $regex: /data purchase/i } }
      ]
    });

    if (!transaction) {
      console.log('❌ Transaction not found');
      return res.status(404).json({
        success: false,
        message: 'Transaction not found in your records'
      });
    }

    console.log('✅ Transaction found:', {
      reference: transaction.reference,
      serviceType: transaction.serviceType,
      status: transaction.status
    });

    // ✅ Clean description - remove (EasyAccess) and (ClubKonnect)
    let cleanDescription = transaction.description;
    if (cleanDescription) {
      cleanDescription = cleanDescription
        .replace(/\s*\(EasyAccess\)/gi, '')
        .replace(/\s*\(ClubKonnect\)/gi, '')
        .trim();
    }

    // Format response
    const responseData = {
      reference: transaction.reference,
      status: transaction.status,
      amount: transaction.amount,
      phone: transaction.metadata?.phone || transaction.transactionData?.phone || 'N/A',
      network: transaction.metadata?.network || transaction.transactionData?.network || 'N/A',
      dataPlan: transaction.metadata?.plan || transaction.metadata?.dataPlan || 
                transaction.transactionData?.plan || cleanDescription,
      description: cleanDescription, // ✅ Use cleaned description
      createdAt: transaction.createdAt,
      balanceBefore: transaction.balanceBefore,
      balanceAfter: transaction.balanceAfter
    };

    console.log('✅ Sending response:', responseData);

    res.json({
      success: true,
      message: 'Transaction found',
      data: responseData
    });

  } catch (error) {
    console.error('❌ Error verifying data purchase:', error);
    res.status(500).json({
      success: false,
      message: 'Server error verifying transaction',
      error: error.message
    });
  }
});

// ========== DEBUG: LIST ALL TRANSACTIONS ==========
router.get('/debug-transactions', authenticate, async (req, res) => {
  try {
    console.log('🔍 DEBUG: Fetching transactions for user:', req.user.userId);

    // Get last 20 transactions for this user (all types)
    const allTransactions = await Transaction.find({
      userId: req.user.userId
    })
    .sort({ createdAt: -1 })
    .limit(20)
    .select('reference serviceType status amount createdAt metadata transactionData');

    // Get only data transactions
    const dataTransactions = await Transaction.find({
      userId: req.user.userId,
      serviceType: { $in: ['data', 'data_easyaccess'] }
    })
    .sort({ createdAt: -1 })
    .limit(10)
    .select('reference serviceType status amount createdAt metadata transactionData');

    console.log(`✅ Found ${allTransactions.length} total transactions`);
    console.log(`✅ Found ${dataTransactions.length} data transactions`);

    res.json({
      success: true,
      userId: req.user.userId,
      totalCount: allTransactions.length,
      dataCount: dataTransactions.length,
      message: `Found ${allTransactions.length} total transactions, ${dataTransactions.length} are data transactions`,
      allTransactions: allTransactions.map(tx => ({
        reference: tx.reference,
        serviceType: tx.serviceType,
        status: tx.status,
        amount: tx.amount,
        date: tx.createdAt,
        network: tx.metadata?.network || tx.transactionData?.network,
        phone: tx.metadata?.phone || tx.transactionData?.phone
      })),
      dataTransactions: dataTransactions.map(tx => ({
        reference: tx.reference,
        serviceType: tx.serviceType,
        status: tx.status,
        amount: tx.amount,
        date: tx.createdAt,
        network: tx.metadata?.network || tx.transactionData?.network,
        phone: tx.metadata?.phone || tx.transactionData?.phone,
        plan: tx.metadata?.plan || tx.transactionData?.plan
      }))
    });

  } catch (error) {
    console.error('❌ Debug error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ========== VERIFY PAYSTACK FUNDING ==========
router.get('/verify-paystack-funding/:reference', authenticate, async (req, res) => {
  try {
    const { reference } = req.params;
    
    if (!reference) {
      return res.status(400).json({
        success: false,
        message: 'Transaction reference is required'
      });
    }

    console.log('🔍 Verifying Paystack funding:', reference);

    const transaction = await Transaction.findOne({
      reference: reference,
      userId: req.user.userId,
      $or: [
        { serviceType: 'funding' },
        { type: 'credit' },
        { description: { $regex: /paystack/i } }
      ]
    });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Paystack transaction not found'
      });
    }

    const responseData = {
      reference: transaction.reference,
      status: transaction.status,
      amount: transaction.amount,
      paymentMethod: 'Paystack',
      description: transaction.description,
      createdAt: transaction.createdAt,
      balanceAfter: transaction.balanceAfter
    };

    res.json({
      success: true,
      message: 'Transaction found',
      data: responseData
    });

  } catch (error) {
    console.error('❌ Error verifying Paystack funding:', error);
    res.status(500).json({
      success: false,
      message: 'Server error verifying transaction',
      error: error.message
    });
  }
});

// ========== VERIFY MONNIFY FUNDING ==========
router.get('/verify-monnify-funding/:reference', authenticate, async (req, res) => {
  try {
    const { reference } = req.params;
    
    if (!reference) {
      return res.status(400).json({
        success: false,
        message: 'Transaction reference is required'
      });
    }

    console.log('🔍 Verifying Monnify funding:', reference);

    const transaction = await Transaction.findOne({
      reference: reference,
      userId: req.user.userId,
      $or: [
        { serviceType: 'funding' },
        { type: 'credit' },
        { description: { $regex: /monnify/i } }
      ]
    });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Monnify transaction not found'
      });
    }

    const responseData = {
      reference: transaction.reference,
      status: transaction.status,
      amount: transaction.amount,
      paymentMethod: 'Monnify',
      description: transaction.description,
      createdAt: transaction.createdAt,
      balanceAfter: transaction.balanceAfter
    };

    res.json({
      success: true,
      message: 'Transaction found',
      data: responseData
    });

  } catch (error) {
    console.error('❌ Error verifying Monnify funding:', error);
    res.status(500).json({
      success: false,
      message: 'Server error verifying transaction',
      error: error.message
    });
  }
});

// ========== VERIFY CABLE TV SUBSCRIPTION ==========
router.get('/verify-cable-tv/:reference', authenticate, async (req, res) => {
  try {
    const { reference } = req.params;
    
    if (!reference) {
      return res.status(400).json({
        success: false,
        message: 'Transaction reference is required'
      });
    }

    console.log('🔍 Verifying Cable TV subscription:', reference);

    const transaction = await Transaction.findOne({
      reference: reference,
      userId: req.user.userId,
      serviceType: 'cable_tv'
    });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Cable TV transaction not found'
      });
    }

    const responseData = {
      reference: transaction.reference,
      status: transaction.status,
      amount: transaction.amount,
      operator: transaction.metadata?.operator || transaction.transactionData?.operator || 'N/A',
      smartCardNumber: transaction.metadata?.smartCardNumber || transaction.transactionData?.smartCardNumber || 'N/A',
      packageName: transaction.metadata?.packageName || transaction.transactionData?.packageName || 'N/A',
      description: transaction.description,
      createdAt: transaction.createdAt,
      balanceAfter: transaction.balanceAfter
    };

    res.json({
      success: true,
      message: 'Transaction found',
      data: responseData
    });

  } catch (error) {
    console.error('❌ Error verifying Cable TV:', error);
    res.status(500).json({
      success: false,
      message: 'Server error verifying transaction',
      error: error.message
    });
  }
});

// ========== VERIFY ELECTRICITY TOKEN ==========
router.get('/verify-electricity/:reference', authenticate, async (req, res) => {
  try {
    const { reference } = req.params;
    
    if (!reference) {
      return res.status(400).json({
        success: false,
        message: 'Transaction reference is required'
      });
    }

    console.log('🔍 Verifying Electricity token:', reference);

    const transaction = await Transaction.findOne({
      reference: reference,
      userId: req.user.userId,
      serviceType: 'electricity'
    });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Electricity transaction not found'
      });
    }

    const responseData = {
      reference: transaction.reference,
      status: transaction.status,
      amount: transaction.amount,
      provider: transaction.metadata?.provider || transaction.transactionData?.provider || 'N/A',
      meterNumber: transaction.metadata?.meterNumber || transaction.transactionData?.meterNumber || 'N/A',
      meterType: transaction.metadata?.meterType || transaction.transactionData?.meterType || 'N/A',
      token: transaction.metadata?.token || transaction.transactionData?.token || 'N/A',
      description: transaction.description,
      createdAt: transaction.createdAt,
      balanceAfter: transaction.balanceAfter
    };

    res.json({
      success: true,
      message: 'Transaction found',
      data: responseData
    });

  } catch (error) {
    console.error('❌ Error verifying Electricity:', error);
    res.status(500).json({
      success: false,
      message: 'Server error verifying transaction',
      error: error.message
    });
  }
});

/// ========== ENHANCED DEBUG: SEARCH FOR SPECIFIC TRANSACTION ==========
router.get('/debug-find/:reference', authenticate, async (req, res) => {
  try {
    const { reference } = req.params;
    
    console.log('🔍 Searching for transaction:', reference);
    console.log('👤 Current User ID:', req.user.userId);

    // Search 1: Exact match, any user
    const exactMatch = await Transaction.findOne({ reference: reference });
    
    // Search 2: Exact match, current user, any service type
    const userMatch = await Transaction.findOne({ 
      reference: reference,
      userId: req.user.userId
    });

    // Search 3: Partial match (case insensitive)
    const partialMatch = await Transaction.findOne({
      reference: { $regex: new RegExp(reference, 'i') }
    });

    // Search 4: All transactions with this reference (any user)
    const allMatches = await Transaction.find({
      reference: reference
    });

    // Search 5: Current user's recent data transactions
    const userDataTransactions = await Transaction.find({
      userId: req.user.userId,
      serviceType: { $in: ['data', 'data_easyaccess'] }
    })
    .sort({ createdAt: -1 })
    .limit(10)
    .select('reference serviceType status amount createdAt');

    console.log('Search Results:');
    console.log('- Exact match (any user):', exactMatch ? 'FOUND' : 'NOT FOUND');
    console.log('- User match:', userMatch ? 'FOUND' : 'NOT FOUND');
    console.log('- Partial match:', partialMatch ? 'FOUND' : 'NOT FOUND');
    console.log('- Total matches:', allMatches.length);

    if (exactMatch) {
      console.log('📋 Exact Match Details:');
      console.log('  - User ID:', exactMatch.userId);
      console.log('  - Service Type:', exactMatch.serviceType);
      console.log('  - Belongs to you?', exactMatch.userId.toString() === req.user.userId);
      console.log('  - Is data transaction?', ['data', 'data_easyaccess'].includes(exactMatch.serviceType));
    }

    res.json({
      success: true,
      searchReference: reference,
      currentUserId: req.user.userId,
      results: {
        transactionExists: !!exactMatch,
        belongsToCurrentUser: exactMatch ? exactMatch.userId.toString() === req.user.userId : false,
        
        exactMatch: exactMatch ? {
          reference: exactMatch.reference,
          userId: exactMatch.userId,
          serviceType: exactMatch.serviceType,
          status: exactMatch.status,
          amount: exactMatch.amount,
          createdAt: exactMatch.createdAt,
          description: exactMatch.description,
          belongsToCurrentUser: exactMatch.userId.toString() === req.user.userId,
          metadata: exactMatch.metadata,
          transactionData: exactMatch.transactionData
        } : null,
        
        userMatch: userMatch ? {
          reference: userMatch.reference,
          serviceType: userMatch.serviceType,
          status: userMatch.status,
          amount: userMatch.amount
        } : null,
        
        allMatchesCount: allMatches.length,
        allMatches: allMatches.map(tx => ({
          reference: tx.reference,
          userId: tx.userId.toString(),
          serviceType: tx.serviceType,
          belongsToCurrentUser: tx.userId.toString() === req.user.userId
        }))
      },
      
      yourRecentDataTransactions: userDataTransactions.map(tx => ({
        reference: tx.reference,
        serviceType: tx.serviceType,
        status: tx.status,
        amount: tx.amount,
        date: tx.createdAt
      })),
      
      diagnosis: {
        problemFound: exactMatch && exactMatch.userId.toString() !== req.user.userId 
          ? 'WRONG_USER' 
          : exactMatch && !['data', 'data_easyaccess'].includes(exactMatch.serviceType)
          ? 'WRONG_SERVICE_TYPE'
          : !exactMatch
          ? 'NOT_FOUND'
          : 'SHOULD_WORK',
        
        actualServiceType: exactMatch?.serviceType,
        expectedServiceTypes: ['data', 'data_easyaccess'],
        isDataTransaction: exactMatch ? ['data', 'data_easyaccess'].includes(exactMatch.serviceType) : false,
        actualUserId: exactMatch?.userId.toString(),
        expectedUserId: req.user.userId
      },
      
      recommendation: exactMatch 
        ? (exactMatch.userId.toString() === req.user.userId
            ? ((['data', 'data_easyaccess'].includes(exactMatch.serviceType))
                ? '✅ Transaction found and valid! The verify endpoint should work.'
                : `⚠️ Wrong service type: "${exactMatch.serviceType}". Update verify route to include this type.`)
            : '❌ Transaction belongs to a different user. You need to log in with the correct account.')
        : '❌ Transaction not found. The reference may be incorrect or transaction was never created.'
    });

  } catch (error) {
    console.error('❌ Debug find error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;