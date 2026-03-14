// routes/purchase.js
const express = require('express');
const router = express.Router();
const axios = require('axios');
const { authenticate } = require('../middleware/auth');
const User = require('../models/User');
const Wallet = require('../models/Wallet');
const Transaction = require('../models/Transaction');
const ServiceConfig = require('../models/ServiceConfig');
const { calculateCustomerPrice, validateCustomerPrice } = require('../config/pricing');
const { logger } = require('../utils/logger');

const EDUCATION_MARKUP = 50;

// ── Provider configs ───────────────────────────────────────────
const EA_CONFIG = {
  token:   process.env.EASYACCESS_TOKEN,
  baseUrl: 'https://easyaccess.com.ng/api/live/v1',
};

const CK_CONFIG = {
  userId:  process.env.CLUBKONNECT_USER_ID,
  apiKey:  process.env.CLUBKONNECT_API_KEY,
  baseUrl: process.env.CLUBKONNECT_BASE_URL || 'https://www.nellobytesystems.com',
};

if (!EA_CONFIG.token)  logger.warn('EASYACCESS_TOKEN is not set');
if (!CK_CONFIG.userId) logger.warn('CLUBKONNECT_USER_ID is not set');
if (!CK_CONFIG.apiKey) logger.warn('CLUBKONNECT_API_KEY is not set');

// ── Mappings ───────────────────────────────────────────────────
const NETWORK_CODES = { MTN: '01', GLO: '02', AIRTEL: '04', '9MOBILE': '03' };

const EA_NETWORK_MAP = { mtn: 1, glo: 2, airtel: 3, '9mobile': 4 };

const EA_TV_COMPANY = { dstv: 1, gotv: 2, startimes: 3, startime: 3, showmax: 4 };

const EA_ELECTRICITY_COMPANY = {
  '01': 1, '02': 2, '03': 3, '04': 4, '05': 6, '06': 5,
  '07': 7, '08': 8, '09': 9, '10': 10, '11': 11, '12': 12,
  ekedc: 1, ikedc: 2, phedc: 3, kedco: 4, ibedc: 6,
  aedc: 5, eedc: 7, bedc: 8, jed: 9, kaedco: 10, aba: 11, yedc: 12,
};

const EA_METER_TYPE = {
  '01': 1, '02': 2, prepaid: 1, postpaid: 2, '1': 1, '2': 2,
};

// ── Education provider costs (server-authoritative) ────────────
const EDUCATION_PROVIDER_COSTS = { waec: 3300, neco: 1150, nabteb: 830, nbais: 900 };

// ── Reference param validator ──────────────────────────────────
// Max 100 chars, alphanumeric + underscores + hyphens only
const validateReference = (ref) => {
  if (!ref || typeof ref !== 'string') return false;
  const clean = ref.trim();
  return clean.length > 0 && clean.length <= 100 && /^[a-zA-Z0-9_\-]+$/.test(clean);
};

// ── EasyAccess headers ─────────────────────────────────────────
const eaHeaders = () => ({
  Authorization:   `Bearer ${EA_CONFIG.token}`,
  'Cache-Control': 'no-cache',
  'Content-Type':  'application/json',
});

// ── ClubKonnect helper ─────────────────────────────────────────
const makeClubKonnectRequest = async (endpoint, params) => {
  try {
    const queryParams = new URLSearchParams({
      UserID: CK_CONFIG.userId,
      APIKey: CK_CONFIG.apiKey,
      ...params,
    });

    const url      = `${CK_CONFIG.baseUrl}${endpoint}?${queryParams}`;
    const response = await axios.get(url, {
      timeout: 30000,
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    });

    let data = response.data;
    if (typeof data === 'string') {
      try { data = JSON.parse(data); } catch {
        throw new Error('Invalid response format from provider');
      }
    }

    if (data.status) {
      const errorStatuses = [
        'INVALID_CREDENTIALS', 'MISSING_CREDENTIALS', 'MISSING_USERID',
        'MISSING_APIKEY', 'MISSING_MOBILENETWORK', 'MISSING_AMOUNT',
        'INVALID_AMOUNT', 'MINIMUM_50', 'MINIMUM_200000',
        'INVALID_RECIPIENT', 'ORDER_FAILED',
      ];
      if (errorStatuses.includes(data.status)) {
        throw new Error(data.status.replace(/_/g, ' ').toLowerCase());
      }
    }

    return data;
  } catch (error) {
    if (error.code === 'ECONNABORTED') throw new Error('Request timeout. Please try again.');
    throw error;
  }
};

// ── EasyAccess helpers ─────────────────────────────────────────
const normalizeEAResponse = (data, httpStatus = null) => {
  if (!data || typeof data !== 'object') {
    return { code: 500, status: 'failed', message: 'Invalid response from provider' };
  }
  if (data.code !== undefined && data.status !== undefined) return data;
  const inferredCode   = httpStatus || 503;
  const inferredStatus = (inferredCode === 200 || inferredCode === 201) ? 'success' : 'failed';
  return { code: inferredCode, status: inferredStatus, ...data };
};

const classifyEAError = (error) => {
  const httpStatus = error.response?.status;
  if (['ECONNREFUSED', 'ENOTFOUND', 'ENETUNREACH', 'EHOSTUNREACH'].includes(error.code)) {
    return { type: 'network', retry: false, message: 'Cannot reach provider. Please check your server internet connection.' };
  }
  if (error.code === 'ECONNABORTED') {
    return { type: 'timeout', retry: true, message: 'Provider is taking too long to respond. Please try again.' };
  }
  if (httpStatus === 503) {
    return { type: 'service', retry: true, message: 'Provider service temporarily unavailable.' };
  }
  return { type: 'unknown', retry: false, message: 'Provider request failed.' };
};

const makeEasyAccessRequest = async (method, endpoint, data = null, attempt = 1) => {
  try {
    const config = {
      method,
      url:     `${EA_CONFIG.baseUrl}/${endpoint}`,
      headers: eaHeaders(),
      timeout: 60000,
    };
    if (data) config.data = data;

    logger.info(`EasyAccess ${method.toUpperCase()} /${endpoint} (attempt ${attempt})`);
    const response = await axios(config);
    return normalizeEAResponse(response.data, response.status);
  } catch (error) {
    const classified = classifyEAError(error);
    logger.error(`EasyAccess error (attempt ${attempt}): ${classified.type}`, error.message);

    if (attempt === 1 && classified.retry) {
      await new Promise(r => setTimeout(r, 2000));
      return makeEasyAccessRequest(method, endpoint, data, 2);
    }

    if (error.response?.data) return normalizeEAResponse(error.response.data, error.response.status);
    return { code: 503, status: 'failed', message: classified.message };
  }
};

const isEASuccess = (data) =>
  (data.code === 200 || data.code === 201) &&
  ['success', 'successful'].includes((data.status || '').toLowerCase());

// ── Service availability check ─────────────────────────────────
const validateServiceAvailability = async (serviceType) => {
  try {
    const serviceTypeMapping = {
      fund_betting: 'fund_betting', betting: 'fund_betting',
      cable_tv: 'cable_tv', print_recharge: 'print_recharge',
      data: 'data', data_easyaccess: 'data',
    };
    const normalized = serviceTypeMapping[serviceType.toLowerCase()] || serviceType.toLowerCase();
    const service    = await ServiceConfig.findOne({ serviceType: normalized });
    if (!service)                return { available: false, reason: `${serviceType} service not found` };
    if (!service.isActive)       return { available: false, reason: `${serviceType} service is not active` };
    if (service.maintenanceMode) return { available: false, reason: service.maintenanceMessage || `${serviceType} is in maintenance` };
    return { available: true };
  } catch (error) {
    return { available: false, reason: 'Error checking service availability' };
  }
};

// ── Education packages ─────────────────────────────────────────
async function fetchAllEducationPackagesEasyAccess() {
  const makePackage = (id, name, providerCost) => ([{
    id, code: id, name, price: providerCost + EDUCATION_MARKUP, providerCost,
    provider: 'easyaccess', active: true,
  }]);

  const [waec, neco, nabteb, nbais] = await Promise.all([
    makeEasyAccessRequest('get', 'get-plans?product_type=waec').then(() => makePackage('waec', 'WAEC Result Checker PIN', EDUCATION_PROVIDER_COSTS.waec)).catch(() => []),
    makeEasyAccessRequest('get', 'get-plans?product_type=neco').then(() => makePackage('neco', 'NECO Result Checker Token', EDUCATION_PROVIDER_COSTS.neco)).catch(() => []),
    makeEasyAccessRequest('get', 'get-plans?product_type=nabteb').then(() => makePackage('nabteb', 'NABTEB Result Checker PIN', EDUCATION_PROVIDER_COSTS.nabteb)).catch(() => []),
    makeEasyAccessRequest('get', 'get-plans?product_type=nbais').then(() => makePackage('nbais', 'NBAIS Result Checker PIN', EDUCATION_PROVIDER_COSTS.nbais)).catch(() => []),
  ]);
  return { waec, neco, nabteb, nbais, all: [...waec, ...neco, ...nabteb, ...nbais] };
}

// ── PIN attempt tracking (MongoDB-backed, survives restarts) ──
// Falls back to in-memory if DB write fails — still better than pure memory
const PIN_CONFIG = { MAX_ATTEMPTS: 3, LOCK_DURATION: 15 * 60 * 1000 };

const getPinAttemptData = async (userId) => {
  try {
    const user = await User.findById(userId).select('pinAttempts pinLockedUntil');
    return {
      attempts:    user?.pinAttempts   || 0,
      lockedUntil: user?.pinLockedUntil || null,
    };
  } catch {
    // Fallback to in-memory if DB unavailable
    if (!pinAttempts.has(userId)) pinAttempts.set(userId, { attempts: 0, lockedUntil: null });
    return pinAttempts.get(userId);
  }
};

const incrementPinAttempts = async (userId) => {
  try {
    const user = await User.findById(userId).select('pinAttempts pinLockedUntil');
    const attempts = (user?.pinAttempts || 0) + 1;
    const update = { pinAttempts: attempts };
    if (attempts >= PIN_CONFIG.MAX_ATTEMPTS) {
      update.pinLockedUntil = new Date(Date.now() + PIN_CONFIG.LOCK_DURATION);
    }
    await User.findByIdAndUpdate(userId, update);
    return { attempts, lockedUntil: update.pinLockedUntil || null };
  } catch {
    const data = pinAttempts.get(userId) || { attempts: 0, lockedUntil: null };
    data.attempts += 1;
    if (data.attempts >= PIN_CONFIG.MAX_ATTEMPTS) {
      data.lockedUntil = new Date(Date.now() + PIN_CONFIG.LOCK_DURATION);
    }
    pinAttempts.set(userId, data);
    return data;
  }
};

const resetPinAttempts = async (userId) => {
  try {
    await User.findByIdAndUpdate(userId, { pinAttempts: 0, pinLockedUntil: null });
  } catch {
    pinAttempts.set(userId, { attempts: 0, lockedUntil: null });
  }
};

// In-memory fallback store
const pinAttempts = new Map();

// ============================================================
// GET ROUTES
// ============================================================

router.get('/pin-status', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('+pin');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const isPinSet    = Boolean(user.pin && user.isPinSetup);
    const attemptData = await getPinAttemptData(req.user.userId);
    const now         = new Date();
    let isLocked = false, lockTimeRemaining = 0;

    if (attemptData.lockedUntil && now < new Date(attemptData.lockedUntil)) {
      isLocked          = true;
      lockTimeRemaining = Math.ceil((new Date(attemptData.lockedUntil) - now) / (1000 * 60));
    } else if (attemptData.lockedUntil && now >= new Date(attemptData.lockedUntil)) {
      await resetPinAttempts(req.user.userId);
    }

    res.json({
      success: true, isPinSet, hasPinSet: isPinSet, isLocked, lockTimeRemaining,
      attemptsRemaining: Math.max(0, PIN_CONFIG.MAX_ATTEMPTS - attemptData.attempts),
    });
  } catch (error) {
    logger.error('PIN status check error', error.message);
    res.status(500).json({ success: false, message: 'Server error checking PIN status' });
  }
});

router.get('/history', authenticate, async (req, res) => {
  try {
    const transactions = await Transaction.find({ userId: req.user.userId, serviceType: 'print_recharge' })
      .sort({ createdAt: -1 }).limit(50);

    res.json({
      success: true,
      data: {
        transactions: transactions.map(tx => ({
          _id:          tx._id,
          network:      tx.metadata?.network      || 'UNKNOWN',
          type:         tx.metadata?.type         || 'unknown',
          amount:       tx.amount,
          quantity:     tx.metadata?.quantity     || 1,
          denomination: tx.metadata?.denomination || tx.amount,
          pins:         tx.metadata?.pins         || [],
          status:       tx.status                 || 'completed',
          createdAt:    tx.createdAt,
          balanceAfter: tx.newBalance             || tx.balanceAfter || 0,
          reference:    tx.reference,
        })),
      },
    });
  } catch (error) {
    logger.error('History fetch error', error.message);
    res.status(500).json({ success: false, message: 'Failed to fetch history' });
  }
});

router.get('/education/packages', authenticate, async (req, res) => {
  try {
    const packages = await fetchAllEducationPackagesEasyAccess();
    res.json({ success: true, data: packages, lastUpdated: new Date().toISOString() });
  } catch (error) {
    logger.error('Education packages fetch error', error.message);
    res.status(500).json({ success: false, message: 'Failed to fetch education packages' });
  }
});

// ============================================================
// VALIDATION ROUTES
// ============================================================

router.post('/electricity/validate-meter', authenticate, async (req, res) => {
  try {
    const { meterNumber, provider, meterType, amount } = req.body;
    if (!meterNumber || !provider) {
      return res.status(400).json({ success: false, message: 'Missing required fields: meterNumber, provider' });
    }

    const companyCode = EA_ELECTRICITY_COMPANY[String(provider).toLowerCase()] || EA_ELECTRICITY_COMPANY[String(provider)];
    if (!companyCode) return res.status(400).json({ success: false, message: 'Invalid electricity provider' });

    const meterTypeCode  = EA_METER_TYPE[String(meterType).toLowerCase()] || EA_METER_TYPE[String(meterType)] || 1;
    const DISCO_MINIMUMS = { 4: 2000, 10: 2000 };
    const minAmount      = DISCO_MINIMUMS[companyCode] || 1000;
    const verifyAmount   = Math.max(parseInt(amount) || 0, minAmount);

    const data = await makeEasyAccessRequest('post', 'verify-electricity', {
      company: companyCode, metertype: meterTypeCode, meterno: meterNumber, amount: verifyAmount,
    });

    if (!isEASuccess(data)) {
      return res.status(400).json({ success: false, message: data.message || 'Meter validation failed' });
    }

    res.json({
      success: true,
      message: 'Meter validation successful',
      data: {
        customerName:    data.customer_name,
        customerAddress: data.customer_address   || '',
        meterType:       data.customer_metertype || (meterTypeCode === 1 ? 'PREPAID' : 'POSTPAID'),
        arrears:         data.customer_arrears   || 0,
        meterNumber,
        provider:        companyCode,
      },
    });
  } catch (error) {
    logger.error('Meter validation error', error.message);
    res.status(500).json({ success: false, message: 'Server error validating meter number' });
  }
});

router.post('/cable-tv/validate-card', authenticate, async (req, res) => {
  try {
    const { smartCardNumber, operator } = req.body;
    if (!smartCardNumber || !operator) {
      return res.status(400).json({ success: false, message: 'Missing required fields: smartCardNumber, operator' });
    }

    const companyCode = EA_TV_COMPANY[operator.toLowerCase()];
    if (!companyCode) return res.status(400).json({ success: false, message: 'Invalid cable TV operator' });

    const data = await makeEasyAccessRequest('post', 'verify-tv', { company: companyCode, iucno: smartCardNumber });
    if (!isEASuccess(data)) {
      return res.status(400).json({ success: false, message: data.message || 'Smart card validation failed' });
    }

    res.json({
      success: true,
      message: 'Smart card validated successfully',
      data: {
        customerName:   data.customer_name,
        currentPackage: data.current_package  || '',
        customerStatus: data.customer_status  || '',
        dueDate:        data.due_date         || '',
        renewalAmount:  data.renewal_amount   || 0,
        currentBalance: data.current_balance  || 0,
        smartCardNumber,
        operator:       operator.toUpperCase(),
      },
    });
  } catch (error) {
    logger.error('Smart card validation error', error.message);
    res.status(500).json({ success: false, message: 'Server error validating smart card' });
  }
});

router.post('/internet/validate-customer', authenticate, async (req, res) => {
  try {
    const { customerNumber, provider } = req.body;
    if (!customerNumber || !provider) return res.status(400).json({ success: false, message: 'Missing required fields' });
    if (provider.toLowerCase() !== 'smile') return res.status(400).json({ success: false, message: 'Only Smile is currently supported' });

    try {
      const response = await makeClubKonnectRequest('/APIVerifySmileV1.asp', {
        MobileNetwork: 'smile-direct', MobileNumber: customerNumber,
      });
      if (!response?.customer_name || response.customer_name.toUpperCase().includes('INVALID')) {
        return res.status(400).json({ success: false, message: 'Invalid Smile account number' });
      }
      return res.json({
        success: true, message: 'Customer validated successfully',
        data: { customerName: response.customer_name, customerNumber, provider: 'SMILE' },
      });
    } catch {
      return res.json({
        success: true, message: 'Validation service unavailable, you can still proceed',
        data: { customerName: 'Smile Customer', customerNumber, provider: 'SMILE', warning: 'Could not verify account number' },
      });
    }
  } catch (error) {
    logger.error('Customer validation error', error.message);
    res.status(500).json({ success: false, message: 'Server error validating customer number' });
  }
});

router.post('/betting/validate-customer', authenticate, async (req, res) => {
  try {
    const { customerId, provider } = req.body;
    if (!customerId || !provider) return res.status(400).json({ success: false, message: 'Missing required fields' });

    const providerMapping = {
      bet9ja: 'BET9JA', sportybet: 'SPORTYBET', nairabet: 'NAIRABET',
      betway: 'BETWAY', '1xbet': '1XBET', betking: 'BETKING',
    };
    const bettingCompany = providerMapping[provider.toLowerCase()] || provider.toUpperCase();

    const response = await makeClubKonnectRequest('/APIVerifyBettingV1.asp', {
      BettingCompany: bettingCompany, CustomerID: customerId,
    });

    if (!response?.customer_name || response.customer_name.toLowerCase().includes('invalid')) {
      return res.status(400).json({ success: false, message: 'Invalid customer ID for this betting platform' });
    }

    res.json({
      success: true, message: 'Customer ID validated successfully',
      data: { customerName: response.customer_name, customerId, provider: bettingCompany },
    });
  } catch (error) {
    logger.error('Betting customer validation error', error.message);
    res.status(500).json({ success: false, message: 'Server error validating customer ID' });
  }
});

// ============================================================
// MAIN PURCHASE ROUTE
// ============================================================
router.post('/', authenticate, async (req, res) => {
  try {
    const { type, amount, pin, ...serviceData } = req.body;

    if (!type || !amount || !pin) {
      return res.status(400).json({ success: false, message: 'Missing required fields: type, amount, pin' });
    }
    if (!/^\d{4}$/.test(pin)) {
      return res.status(400).json({ success: false, message: 'PIN must be exactly 4 digits' });
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid amount' });
    }

    const serviceValidation = await validateServiceAvailability(type);
    if (!serviceValidation.available) {
      return res.status(400).json({ success: false, message: serviceValidation.reason });
    }

    const amountLimits = {
      airtime:         { min: 50,   max: 200000  },
      data:            { min: 50,   max: 500000  },
      data_easyaccess: { min: 50,   max: 500000  },
      electricity:     { min: 1000, max: 100000  },
      education:       { min: 500,  max: 1000000 },
      print_recharge:  { min: 100,  max: 50000   },
      recharge:        { min: 100,  max: 50000   },
      internet:        { min: 500,  max: 200000  },
      fund_betting:    { min: 100,  max: 500000  },
      cable_tv:        { min: 500,  max: 200000  },
    };

    const limits = amountLimits[type];
    if (!limits) return res.status(400).json({ success: false, message: 'Unsupported service type' });
    if (parsedAmount < limits.min || parsedAmount > limits.max) {
      return res.status(400).json({
        success: false,
        message: `Amount must be between ₦${limits.min.toLocaleString()} and ₦${limits.max.toLocaleString()}`,
      });
    }

    if (type === 'education') {
      const provider     = serviceData.provider?.toLowerCase();
      const qty          = parseInt(serviceData.quantity) || 1;
      const providerCost = EDUCATION_PROVIDER_COSTS[provider];
      if (!providerCost) {
        return res.status(400).json({ success: false, message: 'Unsupported education provider' });
      }
      const expectedAmount = (providerCost + EDUCATION_MARKUP) * qty;
      if (Math.abs(parsedAmount - expectedAmount) > 1) {
        logger.warn(`Education price mismatch: expected ${expectedAmount}, got ${parsedAmount}`);
        return res.status(400).json({ success: false, message: 'Invalid amount for selected plan' });
      }
    }

    const user   = await User.findById(req.user.userId).select('+pin');
    const wallet = await Wallet.findOne({ userId: req.user.userId });
    if (!user || !wallet) return res.status(404).json({ success: false, message: 'User or wallet not found' });
    if (!user.pin || !user.isPinSetup) {
      return res.status(400).json({ success: false, message: 'Transaction PIN not set. Please set up your PIN first.' });
    }

    const attemptData = await getPinAttemptData(req.user.userId);
    const now = new Date();

    if (attemptData.lockedUntil && now < new Date(attemptData.lockedUntil)) {
      const remainingMinutes = Math.ceil((new Date(attemptData.lockedUntil) - now) / (1000 * 60));
      return res.status(423).json({ success: false, message: `Account locked. Try again in ${remainingMinutes} minutes.` });
    }

    const isPinValid = await user.comparePin(pin);
    if (!isPinValid) {
      const updated = await incrementPinAttempts(req.user.userId);
      if (updated.lockedUntil) {
        return res.status(423).json({ success: false, message: 'Invalid PIN. Account locked due to too many failed attempts.' });
      }
      return res.status(400).json({
        success: false,
        message: `Invalid PIN. ${PIN_CONFIG.MAX_ATTEMPTS - updated.attempts} attempts remaining.`,
      });
    }

    if (wallet.balance < parsedAmount) {
      return res.status(400).json({ success: false, message: `Insufficient balance. Available: ₦${wallet.balance.toLocaleString()}` });
    }

    await resetPinAttempts(req.user.userId);

    let purchaseResult;

    switch (type) {
      case 'airtime':
        purchaseResult = await processAirtimePurchase({ ...serviceData, amount: parsedAmount, userId: req.user.userId });
        break;
      case 'data':
      case 'data_easyaccess':
        purchaseResult = await processEasyAccessDataPurchase({ ...serviceData, amount: parsedAmount, userId: req.user.userId });
        break;
      case 'electricity':
        purchaseResult = await processElectricityPurchase({ ...serviceData, amount: parsedAmount, userId: req.user.userId });
        break;
      case 'cable_tv':
        purchaseResult = await processCableTVPurchase({ ...serviceData, amount: parsedAmount, userId: req.user.userId });
        break;
      case 'fund_betting':
        purchaseResult = await processFundBettingPurchase({ ...serviceData, amount: parsedAmount, userId: req.user.userId });
        break;
      case 'education':
        purchaseResult = await processEducationPurchase({ ...serviceData, amount: parsedAmount, userId: req.user.userId });
        break;
      case 'internet':
        purchaseResult = await processInternetPurchase({ ...serviceData, amount: parsedAmount, userId: req.user.userId });
        break;
      case 'recharge':
      case 'print_recharge':
        purchaseResult = await processPrintRechargePurchase({ ...serviceData, amount: parsedAmount, userId: req.user.userId });
        break;
      default:
        return res.status(400).json({ success: false, message: 'Unsupported service type' });
    }

    if (purchaseResult.success) {
      const transactionResult = await wallet.debit(parsedAmount, purchaseResult.description, purchaseResult.reference);

      try {
        await Transaction.create({
          userId:          req.user.userId,
          walletId:        wallet._id,
          type:            'debit',
          amount:          parsedAmount,
          description:     purchaseResult.description,
          reference:       purchaseResult.reference,
          status:          'completed',
          category:        'withdrawal',
          serviceType:     type,
          previousBalance: transactionResult.transaction?.balanceBefore || (wallet.balance + parsedAmount),
          newBalance:      transactionResult.wallet?.balance            || wallet.balance,
          balanceBefore:   transactionResult.transaction?.balanceBefore || (wallet.balance + parsedAmount),
          balanceAfter:    transactionResult.wallet?.balance            || wallet.balance,
          metadata:        {
            network:        purchaseResult.transactionData?.network,
            phone:          purchaseResult.transactionData?.phone,
            plan:           purchaseResult.transactionData?.plan,
            planId:         purchaseResult.transactionData?.planId,
            provider:       purchaseResult.transactionData?.provider,
            meterNumber:    purchaseResult.transactionData?.meterNumber,
            meterType:      purchaseResult.transactionData?.meterType,
            token:          purchaseResult.transactionData?.token,
            smartCardNumber:purchaseResult.transactionData?.smartCardNumber,
            packageName:    purchaseResult.transactionData?.packageName,
            operator:       purchaseResult.transactionData?.operator,
            customerName:   purchaseResult.transactionData?.customerName,
            customerId:     purchaseResult.transactionData?.customerId,
            quantity:       purchaseResult.transactionData?.quantity,
            denomination:   purchaseResult.transactionData?.denomination,
            pins:           purchaseResult.transactionData?.pins,
            examType:       purchaseResult.transactionData?.examType,
            customerPrice:  purchaseResult.transactionData?.customerPrice,
            amountPaid:     purchaseResult.transactionData?.amountPaid,
            orderid:        purchaseResult.transactionData?.orderid,
            reference:      purchaseResult.transactionData?.reference,
            transactionDate:purchaseResult.transactionData?.transactionDate,
            serviceType:    type,
          },
          processedAt: new Date(),
        });
      } catch (dbError) {
        logger.error('Transaction DB save failed (purchase still succeeded)', dbError.message);
      }

      res.json({
        success: true,
        message: purchaseResult.successMessage,
        transaction: {
          _id: purchaseResult.reference, type, amount: parsedAmount,
          ...purchaseResult.transactionData,
          status: 'completed', reference: purchaseResult.reference, timestamp: new Date(),
        },
        newBalance: {
          mainBalance:  transactionResult.wallet.balance,
          bonusBalance: 0,
          totalBalance: transactionResult.wallet.balance,
        },
      });
    } else {
      res.status(400).json({
        success: false,
        message: purchaseResult.errorMessage || 'Purchase failed',
        transaction: {
          _id: purchaseResult.reference, type, amount: parsedAmount,
          ...purchaseResult.transactionData,
          status: 'failed', reference: purchaseResult.reference, timestamp: new Date(),
        },
      });
    }
  } catch (error) {
    logger.error('Purchase error', error.message);
    res.status(500).json({ success: false, message: 'Server error processing purchase' });
  }
});

// ============================================================
// GENERATE ROUTE
// ============================================================
router.post('/generate', authenticate, async (req, res) => {
  try {
    const { network, type, denomination, quantity, pin } = req.body;
    if (!network || !type || !denomination || !quantity || !pin) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }
    if (!/^\d{4}$/.test(pin)) {
      return res.status(400).json({ success: false, message: 'PIN must be exactly 4 digits' });
    }

    const qty = parseInt(quantity);
    if (isNaN(qty) || qty < 1 || qty > 100) {
      return res.status(400).json({ success: false, message: 'Quantity must be between 1 and 100' });
    }

    const validDenominations = [100, 200, 500, 1000, 1500, 2000];
    const parsedDenom        = parseInt(denomination);
    if (!validDenominations.includes(parsedDenom)) {
      return res.status(400).json({ success: false, message: `Invalid denomination. Must be one of: ${validDenominations.join(', ')}` });
    }

    const totalAmount = parsedDenom * qty;

    const user   = await User.findById(req.user.userId).select('+pin');
    const wallet = await Wallet.findOne({ userId: req.user.userId });
    if (!user || !wallet) return res.status(404).json({ success: false, message: 'User or wallet not found' });
    if (!user.pin || !user.isPinSetup) {
      return res.status(400).json({ success: false, message: 'Transaction PIN not set.' });
    }

    const attemptData = await getPinAttemptData(req.user.userId);
    const now = new Date();
    if (attemptData.lockedUntil && now < new Date(attemptData.lockedUntil)) {
      return res.status(423).json({ success: false, message: `Account locked. Try again in ${Math.ceil((new Date(attemptData.lockedUntil) - now) / 60000)} minutes.` });
    }

    const isPinValid = await user.comparePin(pin);
    if (!isPinValid) {
      const updated = await incrementPinAttempts(req.user.userId);
      if (updated.lockedUntil) {
        return res.status(423).json({ success: false, message: 'Invalid PIN. Account locked.' });
      }
      return res.status(401).json({ success: false, message: `Invalid PIN. ${PIN_CONFIG.MAX_ATTEMPTS - updated.attempts} attempts remaining.` });
    }
    await resetPinAttempts(req.user.userId);

    if (wallet.balance < totalAmount) {
      return res.status(400).json({ success: false, message: `Insufficient balance. Required: ₦${totalAmount.toLocaleString()}` });
    }

    const result = await processPrintRechargePurchase({ network, denomination: parsedDenom, quantity: qty, amount: totalAmount, cardType: type, userId: req.user.userId });

    if (result.success) {
      const transactionResult = await wallet.debit(totalAmount, result.description, result.reference);
      await Transaction.create({
        userId:          req.user.userId,
        walletId:        wallet._id,
        type:            'debit',
        amount:          totalAmount,
        description:     result.description,
        reference:       result.reference,
        status:          'completed',
        category:        'withdrawal',
        serviceType:     'print_recharge',
        previousBalance: transactionResult.transaction.balanceBefore,
        newBalance:      wallet.balance,
        balanceBefore:   transactionResult.transaction.balanceBefore,
        balanceAfter:    wallet.balance,
        metadata: {
          network:      result.transactionData.network,
          type:         result.transactionData.type,
          quantity:     result.transactionData.quantity,
          denomination: result.transactionData.denomination,
          pins:         result.transactionData.pins,
          serviceType:  'print_recharge',
        },
      });
      return res.json({
        success: true, message: result.successMessage, pins: result.transactionData.pins,
        newBalance: { amount: wallet.balance, mainBalance: wallet.balance, totalBalance: wallet.balance, currency: 'NGN', lastUpdated: new Date().toISOString() },
      });
    }
    return res.status(400).json({ success: false, message: result.errorMessage });
  } catch (error) {
    logger.error('Generate error', error.message);
    res.status(500).json({ success: false, message: 'Failed to generate recharge PINs' });
  }
});

// ============================================================
// PROCESSING FUNCTIONS
// ============================================================

async function processAirtimePurchase({ network, phone, amount, userId }) {
  try {
    if (!network || !phone) throw new Error('Missing required fields: network, phone');
    if (!/^0[789][01]\d{8}$/.test(phone)) throw new Error('Invalid phone number format');

    const networkCode = NETWORK_CODES[network.toUpperCase()] || network;
    const requestId   = `AIR_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const response = await makeClubKonnectRequest('/APIAirtimeV1.asp', {
      MobileNetwork: networkCode, Amount: amount, MobileNumber: phone, RequestID: requestId,
    });

    const isSuccess = ['100', '200'].includes(response.statuscode) ||
                      ['ORDER_RECEIVED', 'ORDER_COMPLETED'].includes(response.status);
    if (!isSuccess) throw new Error(response.remark || response.status || 'Purchase failed');

    return {
      success: true, reference: response.orderid || requestId,
      description: `Airtime purchase - ${network.toUpperCase()} - ${phone}`,
      successMessage: response.remark || 'Airtime purchase successful',
      transactionData: { network: network.toUpperCase(), phone, customerPrice: amount, serviceType: 'airtime', orderid: response.orderid },
    };
  } catch (error) {
    return { success: false, reference: `AIR_${Date.now()}`, errorMessage: error.message,
      transactionData: { network: network?.toUpperCase(), phone, serviceType: 'airtime' } };
  }
}

async function processEasyAccessDataPurchase({ network, phone, planId, plan, amount, userId }) {
  try {
    if (!planId) throw new Error('Plan ID is required');
    if (!network || !phone) throw new Error('Missing required fields: network, phone');
    if (!/^0[789][01]\d{8}$/.test(phone)) throw new Error('Invalid phone number format');

    const networkCode = EA_NETWORK_MAP[network.toLowerCase()];
    if (!networkCode) throw new Error('Invalid network');

    const numericPlanId = parseInt(planId);
    if (isNaN(numericPlanId)) throw new Error(`Invalid plan ID: ${planId}`);

    const clientReference = `EA_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const data = await makeEasyAccessRequest('post', 'purchase-data', {
      network: networkCode, dataplan: numericPlanId, mobileno: phone, client_reference: clientReference,
    });

    if (!isEASuccess(data)) throw new Error(data.message || 'Data purchase failed');

    return {
      success: true, reference: data.reference || clientReference,
      description: `Data purchase - ${network.toUpperCase()} ${plan || planId} - ${phone}`,
      successMessage: data.message || 'Data purchase successful',
      transactionData: {
        network: network.toUpperCase(), phone, plan: plan || planId, planId,
        customerPrice: amount, serviceType: 'data', provider: 'easyaccess', reference: data.reference,
      },
    };
  } catch (error) {
    return { success: false, reference: `EA_${Date.now()}`,
      errorMessage: error.response?.data?.message || error.message,
      transactionData: { network: network?.toUpperCase(), phone, serviceType: 'data', provider: 'easyaccess' } };
  }
}

async function processCableTVPurchase({ operator, packageId, smartCardNumber, phone, amount, userId }) {
  const requestRef = `TV_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  try {
    if (!operator || !packageId || !smartCardNumber) throw new Error('Missing required fields: operator, packageId, smartCardNumber');

    const companyCode      = EA_TV_COMPANY[operator.toLowerCase()];
    if (!companyCode) throw new Error(`Unsupported cable operator: ${operator}`);

    const numericPackageId = parseInt(packageId);
    if (isNaN(numericPackageId)) throw new Error(`Invalid package ID: ${packageId}`);

    const data = await makeEasyAccessRequest('post', 'pay-tv', {
      company: companyCode, package: numericPackageId, iucno: smartCardNumber,
      amount, max_amount_payable: amount,
    });

    if (!isEASuccess(data)) throw new Error(data.message || 'Cable TV subscription failed');

    return {
      success: true, reference: data.reference || requestRef,
      description: `Cable TV - ${(data.company || operator).toUpperCase()} ${data.package || packageId} - ${smartCardNumber}`,
      successMessage: data.message || 'Cable TV subscription successful',
      transactionData: {
        operator: (data.company || operator).toUpperCase(), packageId,
        packageName: data.package || packageId, smartCardNumber, phone,
        customerPrice: amount, amountPaid: data.amount_paid || amount,
        serviceType: 'cable_tv', provider: 'easyaccess',
        reference: data.reference, transactionDate: data.transaction_date,
      },
    };
  } catch (error) {
    return { success: false, reference: requestRef, errorMessage: error.message,
      transactionData: { operator: operator?.toUpperCase(), packageId, smartCardNumber, serviceType: 'cable_tv' } };
  }
}

async function processElectricityPurchase({ provider, meterType, meterNumber, phone, amount, userId }) {
  try {
    if (!provider || !meterNumber || !meterType) throw new Error('Missing required fields');

    const companyCode = EA_ELECTRICITY_COMPANY[String(provider).toLowerCase()] || EA_ELECTRICITY_COMPANY[String(provider)];
    if (!companyCode) throw new Error(`Unsupported electricity provider: ${provider}`);

    const meterTypeCode  = EA_METER_TYPE[String(meterType).toLowerCase()] || EA_METER_TYPE[String(meterType)] || 1;
    const DISCO_MINIMUMS = { 4: 2000, 10: 2000 };
    const minAmount      = DISCO_MINIMUMS[companyCode] || 1000;
    if (amount < minAmount) throw new Error(`Minimum electricity payment for this provider is ₦${minAmount.toLocaleString()}`);

    const data = await makeEasyAccessRequest('post', 'pay-electricity', {
      company: companyCode, metertype: meterTypeCode, meterno: meterNumber,
      amount, max_amount_payable: amount,
    });

    if (!isEASuccess(data)) throw new Error(data.message || 'Electricity payment failed');

    return {
      success: true, reference: data.reference || `ELEC_${Date.now()}`,
      description: `Electricity - ${data.company || provider} ${meterTypeCode === 1 ? 'Prepaid' : 'Postpaid'} - ${meterNumber}`,
      successMessage: data.message || 'Electricity payment successful',
      transactionData: {
        provider: data.company || provider, meterNumber: data.meterno || meterNumber,
        meterType: meterTypeCode === 1 ? 'Prepaid' : 'Postpaid', phone,
        token: data.token || null, customerName: data.customer_name || '',
        customerAddress: data.customer_address || '', customerPrice: amount,
        amountPaid: data.amount_paid || amount, serviceType: 'electricity',
        provider_name: 'easyaccess', reference: data.reference, transactionDate: data.transaction_date,
      },
    };
  } catch (error) {
    return { success: false, reference: `ELEC_${Date.now()}`, errorMessage: error.message,
      transactionData: { provider, meterNumber, meterType, serviceType: 'electricity' } };
  }
}

async function processFundBettingPurchase({ provider, customerId, customerName, amount, userId }) {
  try {
    if (!provider || !customerId) throw new Error('Missing required fields: provider, customerId');

    const providerMapping = {
      bet9ja: 'BET9JA', sportybet: 'SPORTYBET', nairabet: 'NAIRABET',
      betway: 'BETWAY', '1xbet': '1XBET', betking: 'BETKING',
      merrybet: 'MERRYBET', msport: 'MSPORT',
    };
    const bettingCompany = providerMapping[provider.toLowerCase()] || provider.toUpperCase();
    const providerCost   = Math.round(amount / 1.025);
    const requestId      = `BET_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const response = await makeClubKonnectRequest('/APIBettingV1.asp', {
      BettingCompany: bettingCompany, CustomerID: customerId, Amount: providerCost, RequestID: requestId,
    });

    const isSuccess = ['100', '200'].includes(response.statuscode) ||
                      ['ORDER_RECEIVED', 'ORDER_COMPLETED'].includes(response.status);
    if (!isSuccess) throw new Error(response.remark || response.status || 'Betting fund failed');

    return {
      success: true, reference: response.orderid || requestId,
      description: `Betting Fund - ${bettingCompany} - ${customerId}`,
      successMessage: response.remark || `${bettingCompany} account funded successfully`,
      transactionData: { provider: bettingCompany, customerId, customerName, customerPrice: amount, serviceType: 'fund_betting' },
    };
  } catch (error) {
    return { success: false, reference: `BET_${Date.now()}`, errorMessage: error.message,
      transactionData: { provider: provider?.toUpperCase(), customerId, serviceType: 'fund_betting' } };
  }
}

async function processEducationPurchase({ provider, examType, phone, amount, quantity, userId }) {
  try {
    if (!provider || !examType || !phone) throw new Error('Missing required fields: provider, examType, phone');
    if (!/^0[789][01]\d{8}$/.test(phone)) throw new Error('Invalid phone number format');

    const qty = parseInt(quantity) || 1;
    if (qty < 1 || qty > 50) throw new Error('Quantity must be between 1 and 50');

    const normalizedProvider = provider.toLowerCase();
    const EXAM_BOARD_CODES   = { waec: 1, neco: 2, nabteb: 3, nbais: 4 };
    const examBoardCode      = EXAM_BOARD_CODES[normalizedProvider];
    if (!examBoardCode) throw new Error(`Unsupported provider: ${provider}`);

    const data = await makeEasyAccessRequest('post', 'exam-pins', {
      exam_board: examBoardCode, no_of_pins: qty, max_amount_payable: amount,
    });

    if (!isEASuccess(data)) throw new Error(data.message || 'Education purchase failed');

    const pins = (data.pins || []).map(pinString => {
      if (['waec', 'nabteb'].includes(normalizedProvider)) {
        const parts = pinString.split('<=>');
        return { pin: parts[0] || pinString, serial: parts[1] || null };
      }
      return { pin: pinString, serial: null };
    });

    const pinsText    = pins.map((p, i) => p.serial ? `Card #${i + 1}: PIN: ${p.pin}, Serial: ${p.serial}` : `Card #${i + 1}: ${p.pin}`).join(' | ');
    const description = `${provider.toUpperCase()} Exam PIN - ${qty} card(s) - ${phone}. ${pinsText}`;

    return {
      success: true, reference: data.reference || `EDU_${Date.now()}`,
      description, successMessage: data.message || `Successfully purchased ${qty} ${provider.toUpperCase()} pin(s)`,
      transactionData: {
        provider: provider.toUpperCase(), examType, phone, quantity: qty, pins,
        customerPrice: amount, amountPaid: data.amount_paid || amount,
        serviceType: 'education', provider_name: 'easyaccess',
        reference: data.reference, transactionDate: data.transaction_date,
      },
    };
  } catch (error) {
    return { success: false, reference: `EDU_${Date.now()}`,
      errorMessage: error.response?.data?.message || error.message,
      transactionData: { provider: provider?.toUpperCase(), examType, phone, serviceType: 'education' } };
  }
}

async function processInternetPurchase({ provider, plan, planId, planType, customerNumber, amount, userId }) {
  try {
    if (!provider || !plan || !customerNumber) throw new Error('Missing required fields');
    if (provider.toLowerCase() !== 'smile') throw new Error('Only Smile internet is currently supported');

    const SMILE_PLAN_MAPPING = {
      '1GB FlexiDaily': '843', '2.5GB FlexiDaily': '844',
      'Smile MINI 3GB for 2days': '845', 'Smile MINI 5GB for 2days': '846',
      '1GB FlexiWeekly': '847', '2GB FlexiWeekly': '848', '6GB FlexiWeekly': '849',
      '1.5GB Bigga': '828', '2GB Bigga': '829', '3GB Bigga': '830', '5GB Bigga': '831',
      '10GB Bigga': '833', '15GB Bigga': '834', '20GB Bigga': '836', '25GB Bigga': '837',
      '30GB Bigga': '837', '40GB Bigga': '838', '60GB Bigga': '839', '75GB Bigga': '840',
      '100GB Bigga': '840', '130GB Bigga': '841', 'UnlimitedLite': '823',
      'UnlimitedEssential': '824', 'Freedom 3Mbps': '826', 'Freedom 6Mbps': '827',
      'Freedom BestEffort': '825', '90GB Jumbo': '850', '160GB Jumbo': '851',
      '200GB Jumbo': '852', '400GB Jumbo': '853', '15GB Annual': '854',
      '35GB Annual': '855', '70GB Annual': '856', '125GB Annual': '857',
      '200GB Annual': '858', '500GB Annual': '859', '1TB Annual': '860',
    };

    const correctPlanId = planId || SMILE_PLAN_MAPPING[plan];
    if (!correctPlanId) throw new Error(`Invalid plan selected: "${plan}"`);

    const requestId = `NET_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const purchaseResponse = await makeClubKonnectRequest('/APISmileV1.asp', {
      MobileNetwork: 'smile-direct', DataPlan: correctPlanId, MobileNumber: customerNumber, RequestID: requestId,
    });

    const statusCode = purchaseResponse.statuscode || purchaseResponse.status_code;
    const status     = purchaseResponse.status     || purchaseResponse.orderstatus;
    const remark     = purchaseResponse.remark     || purchaseResponse.message;

    if (['100', '200'].includes(statusCode) || ['ORDER_RECEIVED', 'ORDER_COMPLETED'].includes(status)) {
      return {
        success: true, reference: purchaseResponse.orderid || requestId,
        description: `Internet - SMILE ${plan} - ${customerNumber}`,
        successMessage: remark || 'Smile internet subscription successful',
        transactionData: { provider: 'SMILE', plan, planId: correctPlanId, customerNumber, customerPrice: amount, serviceType: 'internet' },
      };
    }
    throw new Error(remark || status || 'Internet subscription failed');
  } catch (error) {
    return { success: false, reference: `NET_${Date.now()}`, errorMessage: error.message,
      transactionData: { provider: provider?.toUpperCase(), plan, customerNumber, serviceType: 'internet' } };
  }
}

async function processPrintRechargePurchase({ network, denomination, quantity, amount, cardType, userId }) {
  try {
    if (!network || !denomination || !quantity) throw new Error('Missing required fields');
    const validDenominations = [100, 200, 500, 1000, 1500, 2000];
    if (!validDenominations.includes(denomination)) {
      throw new Error(`Invalid denomination. Must be one of: ${validDenominations.join(', ')}`);
    }

    const networkCode = NETWORK_CODES[network.toUpperCase()] || network;
    const requestId   = `EPIN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const response = await makeClubKonnectRequest('/APIEPINV1.asp', {
      MobileNetwork: networkCode, Value: denomination, Quantity: quantity, RequestID: requestId,
    });

    if (response.TXN_EPIN && Array.isArray(response.TXN_EPIN)) {
      const pins        = response.TXN_EPIN.map(epin => ({ pin: epin.pin, serial: epin.sno }));
      const pinsText    = pins.map(p => `PIN: ${p.pin} (Serial: ${p.serial})`).join(', ');
      const description = `${network.toUpperCase()} ${cardType || 'AIRTIME'} Recharge - ${quantity} card(s) x ₦${denomination}. ${pinsText}`;
      return {
        success: true, reference: response.TXN_EPIN[0].transactionid || requestId,
        description, successMessage: `Generated ${quantity} PIN(s) successfully`,
        transactionData: {
          network: network.toUpperCase(), value: denomination, quantity, denomination,
          type: cardType || 'airtime', pins, customerPrice: amount, serviceType: 'print_recharge',
        },
      };
    }
    throw new Error('No PINs received from provider');
  } catch (error) {
    return { success: false, reference: `EPIN_${Date.now()}`, errorMessage: error.message,
      transactionData: { network: network?.toUpperCase(), value: denomination, quantity, serviceType: 'print_recharge' } };
  }
}

// ============================================================
// SERVICE INITIALIZATION
// ============================================================
(async () => {
  try {
    const services = [
      { type: 'airtime',        name: 'Airtime Purchase',           active: true },
      { type: 'data',           name: 'Data Purchase (EasyAccess)', active: true },
      { type: 'electricity',    name: 'Electricity Payment',        active: true },
      { type: 'cable_tv',       name: 'Cable TV Subscription',      active: true },
      { type: 'internet',       name: 'Internet Subscription',      active: true },
      { type: 'fund_betting',   name: 'Fund Betting Account',       active: true },
      { type: 'education',      name: 'Education Payment',          active: true },
      { type: 'print_recharge', name: 'Print Recharge',             active: true },
      { type: 'transfer',       name: 'Money Transfer',             active: true },
    ];

    for (const serviceInfo of services) {
      let service = await ServiceConfig.findOne({ serviceType: serviceInfo.type });
      if (!service) {
        service = new ServiceConfig({
          serviceType:     serviceInfo.type,
          displayName:     serviceInfo.name,
          isActive:        serviceInfo.active,
          maintenanceMode: false,
          pricing:         { markupPercentage: 0, flatFee: 0 },
          limits:          { min: serviceInfo.type === 'education' ? 500 : 50, max: 1000000, dailyLimit: 1000000 },
        });
        await service.save();
        logger.success(`Service initialized: ${serviceInfo.type}`);
      } else if (!service.isActive || service.maintenanceMode) {
        service.isActive        = true;
        service.maintenanceMode = false;
        await service.save();
      }
    }
  } catch (error) {
    logger.error('Service initialization error', error.message);
  }
})();

// ============================================================
// VERIFY ROUTES
// ============================================================

router.get('/verify-data/:reference', authenticate, async (req, res) => {
  try {
    if (!validateReference(req.params.reference)) {
      return res.status(400).json({ success: false, message: 'Invalid reference format' });
    }
    const transaction = await Transaction.findOne({
      reference: req.params.reference.trim(),
      userId:    req.user.userId,
    });

    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }

    res.json({
      success: true,
      message: 'Transaction found',
      data: {
        reference:     transaction.reference,
        status:        transaction.status,
        amount:        transaction.amount,
        phone:         transaction.metadata?.phone   || 'N/A',
        network:       transaction.metadata?.network || 'N/A',
        dataPlan:      transaction.metadata?.plan    || transaction.description,
        description:   transaction.description,
        createdAt:     transaction.createdAt,
        balanceBefore: transaction.previousBalance   || transaction.balanceBefore,
        balanceAfter:  transaction.newBalance        || transaction.balanceAfter,
      },
    });
  } catch (error) {
    logger.error('Verify data transaction error', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.get('/verify-cable-tv/:reference', authenticate, async (req, res) => {
  try {
    if (!validateReference(req.params.reference)) {
      return res.status(400).json({ success: false, message: 'Invalid reference format' });
    }
    const transaction = await Transaction.findOne({
      reference: req.params.reference.trim(),
      userId:    req.user.userId,
    });

    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Cable TV transaction not found' });
    }

    res.json({
      success: true,
      message: 'Transaction found',
      data: {
        reference:       transaction.reference,
        status:          transaction.status,
        amount:          transaction.amount,
        operator:        transaction.metadata?.operator        || 'N/A',
        smartCardNumber: transaction.metadata?.smartCardNumber || 'N/A',
        packageName:     transaction.metadata?.packageName     || 'N/A',
        token:           transaction.metadata?.token           || null,
        description:     transaction.description,
        createdAt:       transaction.createdAt,
        balanceBefore:   transaction.previousBalance           || transaction.balanceBefore,
        balanceAfter:    transaction.newBalance                || transaction.balanceAfter,
      },
    });
  } catch (error) {
    logger.error('Verify cable TV transaction error', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.get('/verify-electricity/:reference', authenticate, async (req, res) => {
  try {
    if (!validateReference(req.params.reference)) {
      return res.status(400).json({ success: false, message: 'Invalid reference format' });
    }
    const transaction = await Transaction.findOne({
      reference: req.params.reference.trim(),
      userId:    req.user.userId,
    });

    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Electricity transaction not found' });
    }

    res.json({
      success: true,
      message: 'Transaction found',
      data: {
        reference:     transaction.reference,
        status:        transaction.status,
        amount:        transaction.amount,
        provider:      transaction.metadata?.provider    || 'N/A',
        meterNumber:   transaction.metadata?.meterNumber || 'N/A',
        meterType:     transaction.metadata?.meterType   || 'N/A',
        token:         transaction.metadata?.token       || 'N/A',
        description:   transaction.description,
        createdAt:     transaction.createdAt,
        balanceBefore: transaction.previousBalance       || transaction.balanceBefore,
        balanceAfter:  transaction.newBalance            || transaction.balanceAfter,
      },
    });
  } catch (error) {
    logger.error('Verify electricity transaction error', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.get('/query-ea-transaction/:reference', authenticate, async (req, res) => {
  try {
    if (!validateReference(req.params.reference)) {
      return res.status(400).json({ success: false, message: 'Invalid reference format' });
    }
    const data = await makeEasyAccessRequest('get', `query-transactions?reference=${req.params.reference}`);
    res.json({ success: true, data });
  } catch (error) {
    logger.error('Query EA transaction error', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.get('/ea-balance', authenticate, async (req, res) => {
  try {
    const data = await makeEasyAccessRequest('get', 'wallet-balance');
    res.json({ success: true, data });
  } catch (error) {
    logger.error('EA balance check error', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;