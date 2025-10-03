// routes/purchase.js - CORRECTED CLUBKONNECT INTEGRATION
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

// Network code mapping for ClubKonnect
const NETWORK_CODES = {
  'MTN': '01',
  'GLO': '02',
  'AIRTEL': '04',
  '9MOBILE': '03'
};

// Helper function to make ClubKonnect API requests with proper error handling
const makeClubKonnectRequest = async (endpoint, params) => {
  try {
    const queryParams = new URLSearchParams({
      UserID: CK_CONFIG.userId,
      APIKey: CK_CONFIG.apiKey,
      ...params
    });
    
    const url = `${CK_CONFIG.baseUrl}${endpoint}?${queryParams}`;
    console.log('ClubKonnect Request URL:', url.replace(CK_CONFIG.apiKey, '***'));
    
    const response = await axios.get(url, {
      timeout: 30000,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
    
    console.log('ClubKonnect Raw Response:', response.data);
    
    let data = response.data;
    
    // Handle string responses that need parsing
    if (typeof data === 'string') {
      try {
        data = JSON.parse(data);
      } catch (e) {
        throw new Error(`Invalid response format: ${data}`);
      }
    }
    
    // Check for error status responses
    if (data.status) {
      const errorStatuses = [
        'INVALID_CREDENTIALS',
        'MISSING_CREDENTIALS',
        'MISSING_USERID',
        'MISSING_APIKEY',
        'MISSING_MOBILENETWORK',
        'MISSING_AMOUNT',
        'INVALID_AMOUNT',
        'MINIMUM_50',
        'MINIMUM_200000',
        'INVALID_RECIPIENT',
        'ORDER_FAILED'
      ];
      
      if (errorStatuses.includes(data.status)) {
        throw new Error(data.status.replace(/_/g, ' ').toLowerCase());
      }
    }
    
    return data;
  } catch (error) {
    console.error('ClubKonnect API Error:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
    }
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

    // Validate service availability
    const serviceValidation = await validateServiceAvailability(type);
    if (!serviceValidation.available) {
      return res.status(400).json({ success: false, message: serviceValidation.reason });
    }

    // Amount limits
    const amountLimits = {
      airtime: { min: 50, max: 200000 },
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

    // Check account lock
    const attemptData = getPinAttemptData(req.user.userId);
    const now = new Date();

    if (attemptData.lockedUntil && now < attemptData.lockedUntil) {
      const remainingMinutes = Math.ceil((attemptData.lockedUntil - now) / (1000 * 60));
      return res.status(423).json({
        success: false,
        message: `Account locked. Try again in ${remainingMinutes} minutes.`
      });
    }

    // Validate PIN
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

    // Check balance
    if (wallet.balance < amount) {
      return res.status(400).json({
        success: false,
        message: `Insufficient balance. Available: ₦${wallet.balance.toLocaleString()}`
      });
    }

    resetPinAttempts(req.user.userId);

    // Process purchase based on type using ClubKonnect API
    console.log(`Processing ${type} purchase via ClubKonnect...`);
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
      console.log('ClubKonnect purchase successful');
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
      console.log('ClubKonnect purchase failed:', purchaseResult.errorMessage);
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
    console.error('PURCHASE ERROR:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ success: false, message: 'Server error processing purchase' });
  }
});

// ========== CLUBKONNECT API INTEGRATION FUNCTIONS ==========

async function processAirtimePurchase({ network, phone, amount, userId }) {
  try {
    if (!network || !phone) throw new Error('Missing required fields: network, phone');
    if (!/^0[789][01]\d{8}$/.test(phone)) throw new Error('Invalid phone number format');

    const networkCode = NETWORK_CODES[network.toUpperCase()] || network;
    const requestId = `AIR_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    console.log('Airtime Purchase Request:', { networkCode, phone, amount, requestId });

    const response = await makeClubKonnectRequest('/APIAirtimeV1.asp', {
      MobileNetwork: networkCode,
      Amount: amount,
      MobileNumber: phone,
      RequestID: requestId
    });

    console.log('Airtime Purchase Response:', response);

    // Check response status
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
        serviceType: 'airtime',
        orderid: response.orderid,
        statuscode: response.statuscode,
        apiResponse: response
      }
    };
  } catch (error) {
    console.error('Airtime Purchase Error:', error);
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

    const networkCode = NETWORK_CODES[network.toUpperCase()] || network;
    const requestId = `DATA_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const response = await makeClubKonnectRequest('/APIDatabundleV1.asp', {
      MobileNetwork: networkCode,
      DataPlan: validatedPlan?.id || planId || plan,
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
      description: `Data purchase - ${network.toUpperCase()} ${validatedPlan?.name || plan} - ${phone}`,
      successMessage: response.remark || 'Data purchase successful',
      transactionData: {
        network: network.toUpperCase(),
        phone,
        plan: validatedPlan?.name || plan,
        planId: validatedPlan?.id || planId,
        dataSize: validatedPlan?.dataSize,
        validity: validatedPlan?.validity,
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

    const isSuccess = response.statuscode === '100' || response.statuscode === '200' || 
                      response.status === 'ORDER_RECEIVED' || response.status === 'ORDER_COMPLETED';

    if (!isSuccess) {
      throw new Error(response.remark || response.status || 'Purchase failed');
    }

    return {
      success: true,
      reference: response.orderid || requestId,
      description: `Electricity - ${provider.toUpperCase()} ${meterType} - ${meterNumber}`,
      successMessage: response.remark || 'Electricity payment successful',
      transactionData: {
        provider: provider.toUpperCase(),
        meterNumber,
        meterType,
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

    const isSuccess = response.statuscode === '100' || response.statuscode === '200' || 
                      response.status === 'ORDER_RECEIVED' || response.status === 'ORDER_COMPLETED';

    if (!isSuccess) {
      throw new Error(response.remark || response.status || 'Purchase failed');
    }

    return {
      success: true,
      reference: response.orderid || requestId,
      description: `Cable TV - ${operator.toUpperCase()} ${packageId} - ${smartCardNumber}`,
      successMessage: response.remark || 'Cable TV subscription successful',
      transactionData: {
        operator: operator.toUpperCase(),
        smartCardNumber,
        packageId,
        serviceType: 'cable_tv',
        orderid: response.orderid,
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

    const isSuccess = response.statuscode === '100' || response.statuscode === '200' || 
                      response.status === 'ORDER_RECEIVED' || response.status === 'ORDER_COMPLETED';

    if (!isSuccess) {
      throw new Error(response.remark || response.status || 'Purchase failed');
    }

    return {
      success: true,
      reference: response.orderid || requestId,
      description: `Betting Fund - ${provider.toUpperCase()} - ${customerId}`,
      successMessage: response.remark || 'Betting account funded successfully',
      transactionData: {
        provider: provider.toUpperCase(),
        customerId,
        customerName,
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
      transactionData: { provider: provider?.toUpperCase(), customerId, serviceType: 'fund_betting' }
    };
  }
}

async function processEducationPurchase({ provider, examType, phone, amount, userId }) {
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

    const isSuccess = response.statuscode === '100' || response.statuscode === '200' || 
                      response.status === 'ORDER_RECEIVED' || response.status === 'ORDER_COMPLETED';

    if (!isSuccess) {
      throw new Error(response.remark || response.status || 'Purchase failed');
    }

    return {
      success: true,
      reference: response.orderid || requestId,
      description: `${provider.toUpperCase()} ${examType} - ${phone}`,
      successMessage: response.remark || 'Education payment successful',
      transactionData: {
        provider: provider.toUpperCase(),
        examType,
        phone,
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

    const isSuccess = response.statuscode === '100' || response.statuscode === '200' || 
                      response.status === 'ORDER_RECEIVED' || response.status === 'ORDER_COMPLETED';

    if (!isSuccess) {
      throw new Error(response.remark || response.status || 'Purchase failed');
    }

    return {
      success: true,
      reference: response.orderid || requestId,
      description: `Internet - ${provider.toUpperCase()} ${plan} - ${customerNumber}`,
      successMessage: response.remark || 'Internet subscription successful',
      transactionData: {
        provider: provider.toUpperCase(),
        plan,
        customerNumber,
        serviceType: 'internet',
        orderid: response.orderid,
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

    const networkCode = NETWORK_CODES[network.toUpperCase()] || network;
    const requestId = `EPIN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const response = await makeClubKonnectRequest('/APIEPINV1.asp', {
      MobileNetwork: networkCode,
      Value: value,
      Quantity: quantity,
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
      description: `E-PIN - ${network.toUpperCase()} ₦${value} x ${quantity}`,
      successMessage: response.remark || 'Recharge PINs generated successfully',
      transactionData: {
        network: network.toUpperCase(),
        value,
        quantity,
        serviceType: 'print_recharge',
        orderid: response.orderid,
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

// ========== DEBUGGING & TESTING ENDPOINTS ==========

// Test ClubKonnect connection
router.get('/test-connection', authenticate, async (req, res) => {
  try {
    console.log('Testing ClubKonnect connection...');
    console.log('Config:', {
      userId: CK_CONFIG.userId ? 'SET' : 'NOT SET',
      apiKey: CK_CONFIG.apiKey ? 'SET' : 'NOT SET',
      baseUrl: CK_CONFIG.baseUrl
    });

    // Test with balance check endpoint
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
      error: error.message,
      config: {
        userId: CK_CONFIG.userId ? 'SET' : 'NOT SET',
        apiKey: CK_CONFIG.apiKey ? 'SET' : 'NOT SET',
        baseUrl: CK_CONFIG.baseUrl
      }
    });
  }
});

// Test airtime purchase (test mode - doesn't debit wallet)
router.post('/test-airtime', authenticate, async (req, res) => {
  try {
    const { network, phone, amount } = req.body;
    
    if (!network || !phone || !amount) {
      return res.status(400).json({ 
        success: false, 
        message: 'Network, phone, and amount are required' 
      });
    }

    console.log('Testing airtime purchase:', { network, phone, amount });
    
    const result = await processAirtimePurchase({ network, phone, amount, userId: req.user.userId });
    
    res.json({
      success: result.success,
      message: result.success ? 'Test purchase successful (wallet not debited)' : 'Test purchase failed',
      result
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

module.exports = router;