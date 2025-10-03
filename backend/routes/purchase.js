// routes/purchase.js - INTEGRATED WITH CLUBKONNECT API
const express = require('express');
const router = express.Router();
const axios = require('axios');
const { authenticate } = require('../middleware/auth');
const User = require('../models/User');
const Wallet = require('../models/Wallet');
const Transaction = require('../models/Transaction');
const { DATA_PLANS } = require('../config/dataPlans');
const ServiceConfig = require('../models/ServiceConfig');

// ClubKonnect Configuration
const CK_CONFIG = {
  userId: process.env.CLUBKONNECT_USER_ID,
  apiKey: process.env.CLUBKONNECT_API_KEY,
  baseUrl: process.env.CLUBKONNECT_BASE_URL || 'https://www.nellobytesystems.com'
};

// Helper function to make ClubKonnect API requests
const makeClubKonnectRequest = async (endpoint, params) => {
  try {
    const queryParams = new URLSearchParams({
      UserID: CK_CONFIG.userId,
      APIKey: CK_CONFIG.apiKey,
      ...params
    });
    
    const url = `${CK_CONFIG.baseUrl}${endpoint}?${queryParams}`;
    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || error.message);
  }
};

// Initialize services if missing
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

// Service validation function
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
  LOCK_DURATION: 15 * 60 * 1000,
  PIN_EXPIRY: 24 * 60 * 60 * 1000
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

// GET /api/purchase/pin-status
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

// POST /api/purchase - Main purchase endpoint
router.post('/', authenticate, async (req, res) => {
  console.log('🎯 PURCHASE ENDPOINT HIT!');
  console.log('Request body:', req.body);
  console.log('ClubKonnect Config:', {
    userId: CK_CONFIG.userId ? 'SET' : 'NOT SET',
    apiKey: CK_CONFIG.apiKey ? 'SET' : 'NOT SET',
    baseUrl: CK_CONFIG.baseUrl
  });
  
  try {
    const { type, amount, pin, ...serviceData } = req.body;

    if (!type || !amount || !pin) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: type, amount, pin'
      });
    }

    if (!/^\d{4}$/.test(pin)) {
      console.log('❌ PIN validation failed - not 4 digits');
      return res.status(400).json({ success: false, message: 'PIN must be exactly 4 digits' });
    }
    console.log('✅ PIN format validated');

    // Validate service availability
    console.log(`🔍 Validating service availability for: ${type}`);
    const serviceValidation = await validateServiceAvailability(type);
    if (!serviceValidation.available) {
      console.log(`❌ Service ${type} not available:`, serviceValidation.reason);
      return res.status(400).json({ success: false, message: serviceValidation.reason });
    }
    console.log(`✅ Service ${type} is available`);

    // Amount limits
    const amountLimits = {
      airtime: { min: 50, max: 500000 },
      data: { min: 50, max: 500000 },
      electricity: { min: 100, max: 100000 },
      education: { min: 500, max: 1000000 },
      print_recharge: { min: 100, max: 50000 },
      transfer: { min: 100, max: 1000000 },
      internet: { min: 500, max: 200000 },
      fund_betting: { min: 100, max: 500000 },
      cable_tv: { min: 500, max: 50000 }
    };

    const limits = amountLimits[type];
    if (amount < limits.min || amount > limits.max) {
      console.log(`❌ Amount validation failed. Amount: ${amount}, Min: ${limits.min}, Max: ${limits.max}`);
      return res.status(400).json({
        success: false,
        message: `Amount must be between ₦${limits.min.toLocaleString()} and ₦${limits.max.toLocaleString()}`
      });
    }
    console.log(`✅ Amount validated: ₦${amount}`);

    console.log('🔍 Fetching user and wallet...');
    const user = await User.findById(req.user.userId).select('+pin');
    const wallet = await Wallet.findOne({ userId: req.user.userId });

    if (!user || !wallet) {
      console.log('❌ User or wallet not found');
      return res.status(404).json({ success: false, message: 'User or wallet not found' });
    }
    console.log(`✅ User found: ${user.email}, Wallet balance: ₦${wallet.balance}`);

    if (!user.pin || !user.isPinSetup) {
      console.log('❌ PIN not set up for user');
      return res.status(400).json({
        success: false,
        message: 'Transaction PIN not set. Please set up your PIN first.'
      });
    }
    console.log('✅ User has PIN set up');

    // Check account lock
    console.log('🔍 Checking account lock status...');
    const attemptData = getPinAttemptData(req.user.userId);
    const now = new Date();

    if (attemptData.lockedUntil && now < attemptData.lockedUntil) {
      const remainingMinutes = Math.ceil((attemptData.lockedUntil - now) / (1000 * 60));
      console.log(`❌ Account is locked for ${remainingMinutes} minutes`);
      return res.status(423).json({
        success: false,
        message: `Account locked. Try again in ${remainingMinutes} minutes.`
      });
    }
    console.log('✅ Account not locked');

    // Validate PIN
    console.log('🔍 Validating PIN...');
    const isPinValid = await user.comparePin(pin);
    console.log(`PIN validation result: ${isPinValid ? 'VALID' : 'INVALID'}`);

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

    // Check balance
    console.log(`🔍 Checking balance. Required: ₦${amount}, Available: ₦${wallet.balance}`);
    if (wallet.balance < amount) {
      console.log('❌ Insufficient balance');
      return res.status(400).json({
        success: false,
        message: `Insufficient balance. Available: ₦${wallet.balance.toLocaleString()}`
      });
    }
    console.log('✅ Sufficient balance available');

    resetPinAttempts(req.user.userId);
    console.log('✅ PIN attempts reset');

    // Process purchase based on type using ClubKonnect API
    console.log(`🚀 Processing ${type} purchase via ClubKonnect...`);
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
      case 'print_recharge':
        purchaseResult = await processPrintRechargePurchase({ ...serviceData, amount, userId: req.user.userId });
        break;
      default:
        return res.status(400).json({ success: false, message: 'Unsupported service type' });
    }

    if (purchaseResult.success) {
      console.log('✅ ClubKonnect purchase successful');
      console.log('💳 Debiting wallet...');
      const transactionResult = await wallet.debit(amount, purchaseResult.description, purchaseResult.reference);
      console.log(`✅ Wallet debited. New balance: ₦${transactionResult.wallet.balance}`);

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
      console.log('✅ Success response sent to client');
    } else {
      console.log('❌ ClubKonnect purchase failed:', purchaseResult.errorMessage);
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
    console.error('❌ PURCHASE ERROR:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ success: false, message: 'Server error processing purchase' });
  }
});

// ========== CLUBKONNECT API INTEGRATION FUNCTIONS ==========

async function processAirtimePurchase({ network, phone, amount, userId }) {
  try {
    if (!network || !phone) throw new Error('Missing required fields: network, phone');
    if (!/^0[789][01]\d{8}$/.test(phone)) throw new Error('Invalid phone number format');

    const requestId = `AIR_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const response = await makeClubKonnectRequest('/APIAirtimeV1.asp', {
      MobileNetwork: network.toUpperCase(),
      Amount: amount,
      MobileNumber: phone,
      RequestID: requestId
    });

    return {
      success: true,
      reference: requestId,
      description: `Airtime purchase - ${network.toUpperCase()} - ${phone}`,
      successMessage: 'Airtime purchase successful',
      transactionData: {
        network: network.toUpperCase(),
        phone,
        serviceType: 'airtime',
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

    let validatedPlan = null;
    if (planId) {
      const networkPlans = DATA_PLANS[network];
      if (networkPlans) {
        validatedPlan = networkPlans.find(p => p.id === planId);
        if (!validatedPlan) throw new Error(`Invalid plan ID ${planId}`);
        if (validatedPlan.amount !== amount) {
          throw new Error(`Amount mismatch: expected ₦${validatedPlan.amount}`);
        }
      }
    }

    const requestId = `DATA_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const response = await makeClubKonnectRequest('/APIDatabundleV1.asp', {
      MobileNetwork: network.toUpperCase(),
      DataPlan: validatedPlan?.id || planId || plan,
      MobileNumber: phone,
      RequestID: requestId
    });

    return {
      success: true,
      reference: requestId,
      description: `Data purchase - ${network.toUpperCase()} ${validatedPlan?.name || plan} - ${phone}`,
      successMessage: 'Data purchase successful',
      transactionData: {
        network: network.toUpperCase(),
        phone,
        plan: validatedPlan?.name || plan,
        planId: validatedPlan?.id || planId,
        dataSize: validatedPlan?.dataSize,
        validity: validatedPlan?.validity,
        serviceType: 'data',
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

async function processElectricityPurchase({ provider, meterNumber, meterType, amount, phone, userId }) {
  try {
    if (!provider || !meterNumber || !meterType || !phone) {
      throw new Error('Missing required fields');
    }

    const requestId = `ELEC_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const response = await makeClubKonnectRequest('/APIElectricityV1.asp', {
      ElectricCompany: provider.toUpperCase(),
      MeterType: meterType,
      MeterNo: meterNumber,
      Amount: amount,
      PhoneNo: phone,
      RequestID: requestId
    });

    return {
      success: true,
      reference: requestId,
      description: `Electricity - ${provider.toUpperCase()} ${meterType} - ${meterNumber}`,
      successMessage: 'Electricity payment successful',
      transactionData: {
        provider: provider.toUpperCase(),
        meterNumber,
        meterType,
        serviceType: 'electricity',
        apiResponse: response
      }
    };
  } catch (error) {
    const reference = `ELEC_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    return {
      success: false,
      reference,
      errorMessage: error.message,
      transactionData: { provider: provider?.toUpperCase(), meterNumber, meterType, serviceType: 'electricity' }
    };
  }
}

async function processCableTVPurchase({ operator, smartCardNumber, packageId, amount, userId }) {
  try {
    if (!operator || !smartCardNumber || !packageId) {
      throw new Error('Missing required fields');
    }

    const requestId = `TV_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const response = await makeClubKonnectRequest('/APICableTVV1.asp', {
      CableTV: operator.toUpperCase(),
      Package: packageId,
      SmartCardNo: smartCardNumber,
      RequestID: requestId
    });

    return {
      success: true,
      reference: requestId,
      description: `Cable TV - ${operator.toUpperCase()} ${packageId} - ${smartCardNumber}`,
      successMessage: 'Cable TV subscription successful',
      transactionData: {
        operator: operator.toUpperCase(),
        smartCardNumber,
        packageId,
        serviceType: 'cable_tv',
        apiResponse: response
      }
    };
  } catch (error) {
    const reference = `CABLE_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    return {
      success: false,
      reference,
      errorMessage: error.message,
      transactionData: { operator: operator?.toUpperCase(), smartCardNumber, packageId, serviceType: 'cable_tv' }
    };
  }
}

async function processFundBettingPurchase({ provider, customerId, customerName, amount, userId }) {
  try {
    if (!provider || !customerId) throw new Error('Missing required fields: provider, customerId');

    const requestId = `BET_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const response = await makeClubKonnectRequest('/APIBettingV1.asp', {
      BettingCompany: provider.toUpperCase(),
      CustomerID: customerId,
      Amount: amount,
      RequestID: requestId
    });

    return {
      success: true,
      reference: requestId,
      description: `Betting Fund - ${provider.toUpperCase()} - ${customerId}`,
      successMessage: 'Betting account funded successfully',
      transactionData: {
        provider: provider.toUpperCase(),
        customerId,
        customerName,
        serviceType: 'fund_betting',
        apiResponse: response
      }
    };
  } catch (error) {
    const reference = `BET_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    return {
      success: false,
      reference,
      errorMessage: error.message,
      transactionData: { provider: provider?.toUpperCase(), customerId, serviceType: 'fund_betting' }
    };
  }
}

async function processEducationPurchase({ provider, examType, phone, userId }) {
  try {
    if (!provider || !examType || !phone) {
      throw new Error('Missing required fields');
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

    return {
      success: true,
      reference: requestId,
      description: `${provider.toUpperCase()} ${examType} - ${phone}`,
      successMessage: 'Education payment successful',
      transactionData: {
        provider: provider.toUpperCase(),
        examType,
        phone,
        serviceType: 'education',
        apiResponse: response
      }
    };
  } catch (error) {
    const reference = `EDU_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    return {
      success: false,
      reference,
      errorMessage: error.message,
      transactionData: { provider: provider?.toUpperCase(), examType, serviceType: 'education' }
    };
  }
}

async function processInternetPurchase({ provider, plan, customerNumber, amount, userId }) {
  try {
    if (!provider || !plan || !customerNumber) {
      throw new Error('Missing required fields');
    }

    const requestId = `NET_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    let endpoint;

    if (provider === 'smile') {
      endpoint = '/APISmileV1.asp';
    } else if (provider === 'spectranet') {
      endpoint = '/APISpectranetV1.asp';
    } else {
      throw new Error('Unsupported internet provider');
    }

    const response = await makeClubKonnectRequest(endpoint, {
      MobileNetwork: provider.toUpperCase(),
      DataPlan: plan,
      MobileNumber: customerNumber,
      RequestID: requestId
    });

    return {
      success: true,
      reference: requestId,
      description: `Internet - ${provider.toUpperCase()} ${plan} - ${customerNumber}`,
      successMessage: 'Internet subscription successful',
      transactionData: {
        provider: provider.toUpperCase(),
        plan,
        customerNumber,
        serviceType: 'internet',
        apiResponse: response
      }
    };
  } catch (error) {
    const reference = `NET_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    return {
      success: false,
      reference,
      errorMessage: error.message,
      transactionData: { provider: provider?.toUpperCase(), plan, customerNumber, serviceType: 'internet' }
    };
  }
}

async function processPrintRechargePurchase({ network, value, quantity, amount, userId }) {
  try {
    if (!network || !value || !quantity) {
      throw new Error('Missing required fields');
    }

    const requestId = `EPIN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const response = await makeClubKonnectRequest('/APIEPINV1.asp', {
      MobileNetwork: network.toUpperCase(),
      Value: value,
      Quantity: quantity,
      RequestID: requestId
    });

    return {
      success: true,
      reference: requestId,
      description: `E-PIN - ${network.toUpperCase()} ₦${value} x ${quantity}`,
      successMessage: 'Recharge PINs generated successfully',
      transactionData: {
        network: network.toUpperCase(),
        value,
        quantity,
        serviceType: 'print_recharge',
        apiResponse: response
      }
    };
  } catch (error) {
    const reference = `EPIN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    return {
      success: false,
      reference,
      errorMessage: error.message,
      transactionData: { network: network?.toUpperCase(), value, quantity, serviceType: 'print_recharge' }
    };
  }
}

module.exports = router;