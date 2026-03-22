// routes/purchase.js
const express = require('express');
const router = express.Router();
const axios = require('axios');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const { authenticate } = require('../middleware/auth');
const User = require('../models/User');
const Wallet = require('../models/Wallet');
const Transaction = require('../models/Transaction');
const ServiceConfig = require('../models/ServiceConfig');
const { calculateCustomerPrice, validateCustomerPrice } = require('../config/pricing');
const { logger } = require('../utils/logger');
const mongoose = require('mongoose');

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

// ── Secure reference generator ─────────────────────────────────
const generateReference = (prefix) =>
  `${prefix}_${crypto.randomUUID().replace(/-/g, '')}`;

// ── Reference param validator ──────────────────────────────────
const validateReference = (ref) => {
  if (!ref || typeof ref !== 'string') return false;
  const clean = ref.trim();
  return clean.length > 0 && clean.length <= 100 && /^[a-zA-Z0-9_\-]+$/.test(clean);
};

// ── Phone number regex ─────────────────────────────────────────
const PHONE_REGEX = /^0[789]\d{9}$/;

// ── FIX: Input validation regexes ─────────────────────────────
// Meter numbers: 11 digits (most DISCOs) or 13 digits (some DISCOs)
const METER_REGEX = /^\d{11,13}$/;
// Smart card numbers: 10–12 digits
const CARD_REGEX = /^\d{10,12}$/;
// Betting customer IDs: alphanumeric, 3–30 chars
const CUST_ID_REGEX = /^[a-zA-Z0-9_\-]{3,30}$/;
// Plan ID: numeric only
const PLAN_ID_REGEX = /^\d{1,10}$/;

// ── FIX: Safe provider error messages — never leak internals ──
const PROVIDER_ERROR_MAP = {
  'Insufficient wallet balance, kindly fund your wallet and try again': 'Service temporarily unavailable. Please try again later.',
  'Insufficient wallet balance': 'Service temporarily unavailable. Please try again later.',
  'INVALID_CREDENTIALS':        'Service configuration error. Please contact support.',
  'MISSING_CREDENTIALS':        'Service configuration error. Please contact support.',
  'MISSING_USERID':             'Service configuration error. Please contact support.',
  'MISSING_APIKEY':             'Service configuration error. Please contact support.',
  'ORDER_FAILED':               'Purchase could not be completed. Please try again.',
  'INVALID_RECIPIENT':          'Invalid recipient. Please check the number and try again.',
  'INVALID_AMOUNT':             'Invalid amount for this service.',
  'MINIMUM_50':                 'Amount is below the minimum allowed.',
  'MINIMUM_200000':             'Amount is below the minimum allowed.',
};

const safeErrorMessage = (msg) =>
  PROVIDER_ERROR_MAP[msg] || 'Purchase failed. Please try again.';

// ── FIX: Rate limiter — 10 purchases per user per minute ───────
const purchaseLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  keyGenerator: (req) => req.user?.userId || req.ip,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(`Rate limit hit for user ${req.user?.userId || req.ip}`);
    res.status(429).json({ success: false, message: 'Too many requests. Please slow down.' });
  },
});

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

    logger.info(`EasyAccess ${method.toUpperCase()} request (attempt ${attempt})`);
    const response = await axios(config);
    return normalizeEAResponse(response.data, response.status);
  } catch (error) {
    const classified = classifyEAError(error);
 logger.error(`EasyAccess error (attempt ${attempt}): ${classified.type}`, {
      message:      error.message,
      status:       error.response?.status,
      responseData: error.response?.data,
      endpoint,
    });

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

// ── PIN attempt tracking ───────────────────────────────────────
const PIN_CONFIG = { MAX_ATTEMPTS: 3, LOCK_DURATION: 15 * 60 * 1000 };
const pinAttempts = new Map(); // fallback only — MongoDB is primary

const getPinAttemptData = async (userId) => {
  try {
    const user = await User.findById(userId).select('pinAttempts pinLockedUntil');
    return { attempts: user?.pinAttempts || 0, lockedUntil: user?.pinLockedUntil || null };
  } catch {
    if (!pinAttempts.has(userId)) pinAttempts.set(userId, { attempts: 0, lockedUntil: null });
    return pinAttempts.get(userId);
  }
};

const incrementPinAttempts = async (userId) => {
  try {
    const user     = await User.findById(userId).select('pinAttempts pinLockedUntil');
    const attempts = (user?.pinAttempts || 0) + 1;
    const update   = { pinAttempts: attempts };
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

// ── Daily spend limit check ────────────────────────────────────
const checkDailyLimit = async (userId, amount) => {
  const DAILY_LIMIT = 500000;
  const todayStart  = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const result = await Transaction.aggregate([
    {
      $match: {
        userId:    new mongoose.Types.ObjectId(userId),
        createdAt: { $gte: todayStart },
        status:    'completed',
        type:      'debit',
      },
    },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);

  const todayTotal = result[0]?.total || 0;
  if (todayTotal + amount > DAILY_LIMIT) {
    return {
      allowed: false,
      message: `Daily limit of ₦${DAILY_LIMIT.toLocaleString()} exceeded. Today's spend: ₦${todayTotal.toLocaleString()}`,
    };
  }
  return { allowed: true };
};

// ── Idempotency check — prevent double spending ───────────────
const checkIdempotency = async (userId, clientRequestId) => {
  if (!clientRequestId) return { isDuplicate: false };
  const existing = await Transaction.findOne({
    userId,
    'metadata.clientRequestId': clientRequestId,
    status: 'completed',
  });
  if (existing) return { isDuplicate: true, transaction: existing };
  return { isDuplicate: false };
};

// ── Data plan price validation ────────────────────────────────
const planCache = new Map();

const validateDataPlanPrice = async (planId, network, submittedAmount) => {
  try {
    const networkCode = EA_NETWORK_MAP[network?.toLowerCase()];
    if (!networkCode) return { valid: false, message: 'Invalid network' };

    // FIX: reject invalid planId early
    const numericPlanId = parseInt(planId);
    if (!planId || isNaN(numericPlanId)) {
      return { valid: false, message: 'Invalid plan ID' };
    }

    const cacheKey = `plans_${network.toLowerCase()}`;
    let cached = planCache.get(cacheKey);

    if (!cached || Date.now() - cached.fetchedAt > 10 * 60 * 1000) {
      const networkName = network.toLowerCase();
      const allProductTypes = [
        'mtn_gifting', 'mtn_sme', 'mtn_cg', 'mtn_awoof',
        'glo_gifting', 'glo_sme',
        'airtel_gifting', 'airtel_sme',
        '9mobile_gifting',
      ];
      const relevantTypes = allProductTypes.filter(t => t.startsWith(networkName));

      const allPlans = [];
      for (const pt of relevantTypes) {
        try {
          const response = await makeEasyAccessRequest('get', `get-plans?product_type=${pt}`);
          const plans = response?.data || response?.plans || response?.result || [];
          if (Array.isArray(plans)) allPlans.push(...plans);
        } catch {
          // one product type failing should not block the rest
        }
      }

      if (allPlans.length === 0) {
        logger.warn(`Could not fetch plans for network ${network} — skipping price validation`);
        return { valid: true, skipped: true };
      }

      cached = { list: allPlans, fetchedAt: Date.now() };
      planCache.set(cacheKey, cached);
    }

    const matchedPlan = cached.list.find(
      p =>
        parseInt(p.id)          === numericPlanId ||
        parseInt(p.plan_id)     === numericPlanId ||
        parseInt(p.dataplan_id) === numericPlanId
    );

    if (!matchedPlan) {
      logger.warn(`Plan ID ${planId} not found in EasyAccess plan list for network ${network} — skipping validation`);
      return { valid: true, skipped: true };
    }

    const providerPrice = parseFloat(
      matchedPlan.price         ||
      matchedPlan.amount        ||
      matchedPlan.plan_amount   ||
      matchedPlan.selling_price ||
      0
    );

    if (providerPrice === 0) {
      logger.warn(`Plan ${planId} has zero/missing price in EasyAccess response — skipping validation`);
      return { valid: true, skipped: true };
    }

    if (Math.abs(submittedAmount - providerPrice) > 1) {
      logger.warn(
        `Data price mismatch — planId: ${planId}, network: ${network}, ` +
        `submitted: ₦${submittedAmount}, provider: ₦${providerPrice}`
      );
      return {
        valid:   false,
        message: `Invalid amount for selected plan. Expected ₦${providerPrice.toLocaleString()}`,
      };
    }

    return { valid: true };
  } catch (error) {
    logger.warn(`Plan price validation error: ${error.message} — skipping validation`);
    return { valid: true, skipped: true };
  }
};

// ── FIX: Validate and sanitize service-specific inputs ─────────
const validateServiceInputs = (type, serviceData) => {
  switch (type) {
    case 'electricity': {
      const { meterNumber, provider, meterType } = serviceData;
      if (!meterNumber) return 'Meter number is required';
      if (!METER_REGEX.test(String(meterNumber).trim())) return 'Invalid meter number. Must be 11–13 digits.';
      if (!provider) return 'Electricity provider is required';
      if (!meterType) return 'Meter type is required';
      return null;
    }
    case 'cable_tv': {
      const { smartCardNumber, operator } = serviceData;
      if (!smartCardNumber) return 'Smart card number is required';
      if (!CARD_REGEX.test(String(smartCardNumber).trim())) return 'Invalid smart card number. Must be 10–12 digits.';
      if (!operator) return 'Cable TV operator is required';
      return null;
    }
    case 'fund_betting': {
      const { customerId, provider } = serviceData;
      if (!customerId) return 'Customer ID is required';
      if (!CUST_ID_REGEX.test(String(customerId).trim())) return 'Invalid customer ID format.';
      if (!provider) return 'Betting provider is required';
      return null;
    }
    case 'data':
    case 'data_easyaccess': {
      const { planId, network, phone } = serviceData;
      if (!planId || !PLAN_ID_REGEX.test(String(planId))) return 'Invalid plan ID';
      if (!network) return 'Network is required';
      if (!phone || !PHONE_REGEX.test(phone)) return 'Invalid phone number format';
      return null;
    }
    case 'airtime': {
      const { network, phone } = serviceData;
      if (!network) return 'Network is required';
      if (!phone || !PHONE_REGEX.test(phone)) return 'Invalid phone number format';
      return null;
    }
    case 'internet': {
      const { provider, customerNumber } = serviceData;
      if (!provider) return 'Provider is required';
      if (!customerNumber) return 'Customer number is required';
      return null;
    }
    case 'education': {
      const { provider, examType, phone } = serviceData;
      if (!provider) return 'Exam board is required';
      if (!examType) return 'Exam type is required';
      if (!phone || !PHONE_REGEX.test(phone)) return 'Invalid phone number format';
      return null;
    }
    case 'recharge':
    case 'print_recharge': {
      const { network, denomination, quantity } = serviceData;
      if (!network) return 'Network is required';
      if (!denomination) return 'Denomination is required';
      if (!quantity) return 'Quantity is required';
      return null;
    }
    default:
      return null;
  }
};

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

    // FIX: validate meter number format
    if (!METER_REGEX.test(String(meterNumber).trim())) {
      return res.status(400).json({ success: false, message: 'Invalid meter number. Must be 11–13 digits.' });
    }

    const companyCode = EA_ELECTRICITY_COMPANY[String(provider).toLowerCase()] || EA_ELECTRICITY_COMPANY[String(provider)];
    if (!companyCode) return res.status(400).json({ success: false, message: 'Invalid electricity provider' });

    const meterTypeCode  = EA_METER_TYPE[String(meterType).toLowerCase()] || EA_METER_TYPE[String(meterType)] || 1;
    const DISCO_MINIMUMS = { 4: 2000, 10: 2000 };
    const minAmount      = DISCO_MINIMUMS[companyCode] || 1000;
    const verifyAmount   = Math.max(parseInt(amount) || 0, minAmount);

    const data = await makeEasyAccessRequest('post', 'verify-electricity', {
      company: companyCode, metertype: meterTypeCode, meterno: String(meterNumber).trim(), amount: verifyAmount,
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
        meterNumber:     String(meterNumber).trim(),
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

    // FIX: validate smart card number format
    if (!CARD_REGEX.test(String(smartCardNumber).trim())) {
      return res.status(400).json({ success: false, message: 'Invalid smart card number. Must be 10–12 digits.' });
    }

    const companyCode = EA_TV_COMPANY[operator.toLowerCase()];
    if (!companyCode) return res.status(400).json({ success: false, message: 'Invalid cable TV operator' });

    const data = await makeEasyAccessRequest('post', 'verify-tv', {
      company: companyCode, iucno: String(smartCardNumber).trim(),
    });
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
        smartCardNumber: String(smartCardNumber).trim(),
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

    // FIX: validate customer ID format
    if (!CUST_ID_REGEX.test(String(customerId).trim())) {
      return res.status(400).json({ success: false, message: 'Invalid customer ID format' });
    }

    const providerMapping = {
      bet9ja: 'BET9JA', sportybet: 'SPORTYBET', nairabet: 'NAIRABET',
      betway: 'BETWAY', '1xbet': '1XBET', betking: 'BETKING',
    };
    const bettingCompany = providerMapping[provider.toLowerCase()] || provider.toUpperCase();

    const response = await makeClubKonnectRequest('/APIVerifyBettingV1.asp', {
      BettingCompany: bettingCompany, CustomerID: String(customerId).trim(),
    });

    if (!response?.customer_name || response.customer_name.toLowerCase().includes('invalid')) {
      return res.status(400).json({ success: false, message: 'Invalid customer ID for this betting platform' });
    }

    res.json({
      success: true, message: 'Customer ID validated successfully',
      data: { customerName: response.customer_name, customerId: String(customerId).trim(), provider: bettingCompany },
    });
  } catch (error) {
    logger.error('Betting customer validation error', error.message);
    res.status(500).json({ success: false, message: 'Server error validating customer ID' });
  }
});

// ============================================================
// MAIN PURCHASE ROUTE — with rate limiter applied
// ============================================================
router.post('/', authenticate, purchaseLimiter, async (req, res) => {
  try {
    // FIX: normalise type before any processing
    const type = req.body.type?.toLowerCase().trim();
    const { amount, pin, clientRequestId } = req.body;
    const serviceData = extractServiceData(type, req.body);

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

    // FIX: validate service-specific inputs early — before hitting any DB or provider
    const inputError = validateServiceInputs(type, serviceData);
    if (inputError) {
      return res.status(400).json({ success: false, message: inputError });
    }

    // Idempotency — reject duplicate requests
    if (clientRequestId) {
      const idempotency = await checkIdempotency(req.user.userId, clientRequestId);
      if (idempotency.isDuplicate) {
        logger.warn(`Duplicate request blocked for user ${req.user.userId}`);
        return res.json({
          success: true,
          message: 'Transaction already processed',
          transaction: idempotency.transaction,
        });
      }
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

    // Education: server-authoritative price check
    if (type === 'education') {
      const provider     = serviceData.provider?.toLowerCase();
      const qty          = parseInt(serviceData.quantity) || 1;
      const providerCost = EDUCATION_PROVIDER_COSTS[provider];
      if (!providerCost) {
        return res.status(400).json({ success: false, message: 'Unsupported education provider' });
      }
      const expectedAmount = (providerCost + EDUCATION_MARKUP) * qty;
      if (Math.abs(parsedAmount - expectedAmount) > 1) {
        logger.warn(`Education price mismatch for user ${req.user.userId}`);
        return res.status(400).json({ success: false, message: 'Invalid amount for selected plan' });
      }
    }

    // Data: live price validation against EasyAccess
    if (type === 'data' || type === 'data_easyaccess') {
      const planValidation = await validateDataPlanPrice(
        serviceData.planId,
        serviceData.network,
        parsedAmount
      );
      if (!planValidation.valid) {
        return res.status(400).json({ success: false, message: planValidation.message });
      }
      if (planValidation.skipped) {
        logger.info(`Data plan price validation skipped for planId ${serviceData.planId} — proceeding`);
      }
    }

    const user = await User.findById(req.user.userId).select('+pin');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (!user.pin || !user.isPinSetup) {
      return res.status(400).json({ success: false, message: 'Transaction PIN not set. Please set up your PIN first.' });
    }

    if (!req.user.userId) {
      return res.status(401).json({ success: false, message: 'Invalid token payload.' });
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

    const dailyCheck = await checkDailyLimit(req.user.userId, parsedAmount);
    if (!dailyCheck.allowed) {
      return res.status(400).json({ success: false, message: dailyCheck.message });
    }

    // ── Mongoose session — wallet debit + transaction record are atomic ──
    // If the server crashes between debit and record save, both roll back.
    // Provider API calls happen inside the session window but cannot be
    // rolled back — if provider succeeds but DB commit fails, we log it
    // loudly for manual reconciliation.
    const session = await mongoose.startSession();
    session.startTransaction();

    let wallet;
    try {
      // Atomic debit inside session
      wallet = await Wallet.findOneAndUpdate(
        { userId: req.user.userId, balance: { $gte: parsedAmount }, isActive: true },
        { $inc: { balance: -parsedAmount } },
        { new: true, session }
      );

      if (!wallet) {
        await session.abortTransaction();
        session.endSession();
        const walletExists = await Wallet.findOne({ userId: req.user.userId });
        if (!walletExists) {
          return res.status(404).json({ success: false, message: 'Wallet not found' });
        }
        return res.status(400).json({
          success: false,
          message: `Insufficient balance. Available: ₦${walletExists.balance.toLocaleString()}`,
        });
      }

      await resetPinAttempts(req.user.userId);

      // Call provider — outside session control, cannot be rolled back
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
          await session.abortTransaction();
          session.endSession();
          return res.status(400).json({ success: false, message: 'Unsupported service type' });
      }

      if (purchaseResult.success) {
        // Save transaction record in same session — both commit together or both roll back
        await Transaction.create([{
          userId:          req.user.userId,
          walletId:        wallet._id,
          type:            'debit',
          amount:          parsedAmount,
          description:     purchaseResult.description,
          reference:       purchaseResult.reference,
          status:          'completed',
          category:        'withdrawal',
          serviceType:     type,
          previousBalance: wallet.balance + parsedAmount,
          newBalance:      wallet.balance,
          balanceBefore:   wallet.balance + parsedAmount,
          balanceAfter:    wallet.balance,
          metadata: {
            network:         purchaseResult.transactionData?.network,
            phone:           purchaseResult.transactionData?.phone,
            plan:            purchaseResult.transactionData?.plan,
            planId:          purchaseResult.transactionData?.planId,
            provider:        purchaseResult.transactionData?.provider,
            meterNumber:     purchaseResult.transactionData?.meterNumber,
            meterType:       purchaseResult.transactionData?.meterType,
            token:           purchaseResult.transactionData?.token,
            smartCardNumber: purchaseResult.transactionData?.smartCardNumber,
            packageName:     purchaseResult.transactionData?.packageName,
            operator:        purchaseResult.transactionData?.operator,
            customerName:    typeof purchaseResult.transactionData?.customerName === 'string'
              ? purchaseResult.transactionData.customerName.slice(0, 100).replace(/[<>"']/g, '')
              : undefined,
            customerId:      purchaseResult.transactionData?.customerId,
            quantity:        purchaseResult.transactionData?.quantity,
            denomination:    purchaseResult.transactionData?.denomination,
            pins:            purchaseResult.transactionData?.pins,
            examType:        purchaseResult.transactionData?.examType,
            customerPrice:   purchaseResult.transactionData?.customerPrice,
            amountPaid:      purchaseResult.transactionData?.amountPaid,
            orderid:         purchaseResult.transactionData?.orderid,
            reference:       purchaseResult.transactionData?.reference,
            transactionDate: purchaseResult.transactionData?.transactionDate,
            serviceType:     type,
            clientRequestId: clientRequestId || null,
          },
          processedAt: new Date(),
        }], { session });

        // Both wallet debit and transaction record ready — commit atomically
        await session.commitTransaction();
        session.endSession();

        return res.json({
          success: true,
          message: purchaseResult.successMessage,
          transaction: {
            _id:          purchaseResult.reference,
            type,
            amount:       parsedAmount,
            status:       'completed',
            reference:    purchaseResult.reference,
            timestamp:    new Date(),
            network:      purchaseResult.transactionData?.network,
            phone:        purchaseResult.transactionData?.phone,
            plan:         purchaseResult.transactionData?.plan,
            token:        purchaseResult.transactionData?.token,
            operator:     purchaseResult.transactionData?.operator,
            meterNumber:  purchaseResult.transactionData?.meterNumber,
            packageName:  purchaseResult.transactionData?.packageName,
            quantity:     purchaseResult.transactionData?.quantity,
            pins:         purchaseResult.transactionData?.pins,
            examType:     purchaseResult.transactionData?.examType,
            customerId:   purchaseResult.transactionData?.customerId,
            customerName: purchaseResult.transactionData?.customerName,
          },
          newBalance: {
            mainBalance:  wallet.balance,
            bonusBalance: 0,
            totalBalance: wallet.balance,
          },
        });

      } else {
        // Provider failed — abort session, wallet debit rolls back automatically
        await session.abortTransaction();
        session.endSession();

        return res.status(400).json({
          success: false,
          message: safeErrorMessage(purchaseResult.errorMessage),
          transaction: {
            _id:       purchaseResult.reference,
            type,
            amount:    parsedAmount,
            status:    'failed',
            reference: purchaseResult.reference,
            timestamp: new Date(),
          },
        });
      }

    } catch (sessionError) {
      // Unexpected error inside session — abort everything
      try {
        await session.abortTransaction();
        session.endSession();
      } catch (abortErr) {
        logger.error('Session abort error', abortErr.message);
      }
      throw sessionError; // re-throw so outer catch handles the response
    }

  } catch (error) {
    logger.error('Purchase error', error.message);
    res.status(500).json({ success: false, message: 'Server error processing purchase' });
  }
});

// ── Whitelist serviceData fields per service type ──────────────
function extractServiceData(type, body) {
  switch (type) {
    case 'airtime':
      return { network: body.network, phone: body.phone };
    case 'data':
    case 'data_easyaccess':
      return { network: body.network, phone: body.phone, planId: body.planId, plan: body.plan };
    case 'electricity':
      return {
        provider:    body.provider,
        meterType:   body.meterType,
        meterNumber: body.meterNumber ? String(body.meterNumber).trim() : undefined,
        phone:       body.phone,
      };
    case 'cable_tv':
      return {
        operator:        body.operator,
        packageId:       body.packageId,
        smartCardNumber: body.smartCardNumber ? String(body.smartCardNumber).trim() : undefined,
        phone:           body.phone,
      };
    case 'fund_betting':
      return {
        provider:     body.provider,
        customerId:   body.customerId ? String(body.customerId).trim() : undefined,
        // FIX: sanitize customerName at extraction point
        customerName: typeof body.customerName === 'string'
          ? body.customerName.slice(0, 100).replace(/[<>"']/g, '')
          : undefined,
      };
    case 'education':
      return { provider: body.provider, examType: body.examType, phone: body.phone, quantity: body.quantity };
    case 'internet':
      return { provider: body.provider, plan: body.plan, planId: body.planId, planType: body.planType, customerNumber: body.customerNumber };
    case 'recharge':
    case 'print_recharge':
      return { network: body.network, denomination: body.denomination, quantity: body.quantity, cardType: body.cardType };
    default:
      return {};
  }
}

// ============================================================
// GENERATE ROUTE — with rate limiter + idempotency added
// ============================================================
router.post('/generate', authenticate, purchaseLimiter, async (req, res) => {
  try {
    const { network, type, denomination, quantity, pin, clientRequestId } = req.body;

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

    // FIX: idempotency on generate route
    if (clientRequestId) {
      const idempotency = await checkIdempotency(req.user.userId, clientRequestId);
      if (idempotency.isDuplicate) {
        logger.warn(`Duplicate generate request blocked for user ${req.user.userId}`);
        return res.json({
          success: true,
          message: 'Already processed',
          transaction: idempotency.transaction,
        });
      }
    }

    const user = await User.findById(req.user.userId).select('+pin');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
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

    const dailyCheck = await checkDailyLimit(req.user.userId, totalAmount);
    if (!dailyCheck.allowed) {
      return res.status(400).json({ success: false, message: dailyCheck.message });
    }

    const wallet = await Wallet.findOneAndUpdate(
      { userId: req.user.userId, balance: { $gte: totalAmount }, isActive: true },
      { $inc: { balance: -totalAmount } },
      { new: true }
    );

    if (!wallet) {
      const walletExists = await Wallet.findOne({ userId: req.user.userId });
      if (!walletExists) return res.status(404).json({ success: false, message: 'Wallet not found' });
      return res.status(400).json({ success: false, message: `Insufficient balance. Required: ₦${totalAmount.toLocaleString()}` });
    }

    const result = await processPrintRechargePurchase({
      network, denomination: parsedDenom, quantity: qty, amount: totalAmount, cardType: type, userId: req.user.userId,
    });

    if (result.success) {
      try {
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
          previousBalance: wallet.balance + totalAmount,
          newBalance:      wallet.balance,
          balanceBefore:   wallet.balance + totalAmount,
          balanceAfter:    wallet.balance,
          metadata: {
            network:         result.transactionData.network,
            type:            result.transactionData.type,
            quantity:        result.transactionData.quantity,
            denomination:    result.transactionData.denomination,
            pins:            result.transactionData.pins,
            serviceType:     'print_recharge',
            clientRequestId: clientRequestId || null,
          },
        });
      } catch (dbError) {
        logger.error('CRITICAL: Generate transaction DB save failed after successful purchase', {
          userId:    req.user.userId,
          amount:    totalAmount,
          reference: result.reference,
          error:     dbError.message,
        });
      }

      return res.json({
        success:    true,
        message:    result.successMessage,
        pins:       result.transactionData.pins,
        newBalance: { amount: wallet.balance, mainBalance: wallet.balance, totalBalance: wallet.balance, currency: 'NGN', lastUpdated: new Date().toISOString() },
      });
    }

    // FIX: atomic refund with guard
    await Wallet.findOneAndUpdate(
      { userId: req.user.userId, balance: { $lte: wallet.balance } },
      { $inc: { balance: totalAmount } }
    );
    return res.status(400).json({ success: false, message: safeErrorMessage(result.errorMessage) });

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
    if (!PHONE_REGEX.test(phone)) throw new Error('Invalid phone number format');

    const networkCode = NETWORK_CODES[network.toUpperCase()] || network;
    const requestId   = generateReference('AIR');

    const response = await makeClubKonnectRequest('/APIAirtimeV1.asp', {
      MobileNetwork: networkCode, Amount: amount, MobileNumber: phone, RequestID: requestId,
    });

    const isSuccess = ['100', '200'].includes(response.statuscode) ||
                      ['ORDER_RECEIVED', 'ORDER_COMPLETED'].includes(response.status);
    if (!isSuccess) throw new Error(response.remark || response.status || 'Purchase failed');

    return {
      success:        true,
      reference:      response.orderid || requestId,
      description:    `Airtime purchase - ${network.toUpperCase()} - ${phone}`,
      successMessage: 'Airtime purchase successful',
      transactionData: { network: network.toUpperCase(), phone, customerPrice: amount, serviceType: 'airtime' },
    };
  } catch (error) {
    return {
      success:         false,
      reference:       generateReference('AIR'),
      errorMessage:    error.message,
      transactionData: { network: network?.toUpperCase(), phone, serviceType: 'airtime' },
    };
  }
}

async function processEasyAccessDataPurchase({ network, phone, planId, plan, amount, userId }) {
  try {
    if (!planId) throw new Error('Plan ID is required');
    if (!network || !phone) throw new Error('Missing required fields: network, phone');
    if (!PHONE_REGEX.test(phone)) throw new Error('Invalid phone number format');

    const networkCode = EA_NETWORK_MAP[network.toLowerCase()];
    if (!networkCode) throw new Error('Invalid network');

    const numericPlanId = parseInt(planId);
    if (isNaN(numericPlanId)) throw new Error(`Invalid plan ID: ${planId}`);

    const clientReference = generateReference('EA');

    const data = await makeEasyAccessRequest('post', 'purchase-data', {
      network: networkCode, dataplan: numericPlanId, mobileno: phone, client_reference: clientReference,
    });

    if (!isEASuccess(data)) throw new Error(data.message || 'Data purchase failed');

    return {
      success:        true,
      reference:      data.reference || clientReference,
      description:    `Data purchase - ${network.toUpperCase()} ${plan || planId} - ${phone}`,
      successMessage: 'Data purchase successful',
      transactionData: {
        network: network.toUpperCase(), phone, plan: plan || planId, planId,
        customerPrice: amount, serviceType: 'data', provider: 'easyaccess', reference: data.reference,
      },
    };
  } catch (error) {
    return {
      success:         false,
      reference:       generateReference('EA'),
      errorMessage:    error.response?.data?.message || error.message,
      transactionData: { network: network?.toUpperCase(), phone, serviceType: 'data', provider: 'easyaccess' },
    };
  }
}

async function processCableTVPurchase({ operator, packageId, smartCardNumber, phone, amount, userId }) {
  const requestRef = generateReference('TV');
  try {
    if (!operator || !packageId || !smartCardNumber) throw new Error('Missing required fields: operator, packageId, smartCardNumber');

    const companyCode = EA_TV_COMPANY[operator.toLowerCase()];
    if (!companyCode) throw new Error(`Unsupported cable operator: ${operator}`);

    const numericPackageId = parseInt(packageId);
    if (isNaN(numericPackageId)) throw new Error(`Invalid package ID: ${packageId}`);

    const data = await makeEasyAccessRequest('post', 'pay-tv', {
      company: companyCode, package: numericPackageId, iucno: smartCardNumber,
      amount, max_amount_payable: amount,
    });

    if (!isEASuccess(data)) throw new Error(data.message || 'Cable TV subscription failed');

    return {
      success:        true,
      reference:      data.reference || requestRef,
      description:    `Cable TV - ${(data.company || operator).toUpperCase()} ${data.package || packageId} - ${smartCardNumber}`,
      successMessage: 'Cable TV subscription successful',
      transactionData: {
        operator: (data.company || operator).toUpperCase(), packageId,
        packageName: data.package || packageId, smartCardNumber, phone,
        customerPrice: amount, amountPaid: data.amount_paid || amount,
        serviceType: 'cable_tv', provider: 'easyaccess',
        reference: data.reference, transactionDate: data.transaction_date,
      },
    };
  } catch (error) {
    return {
      success:         false,
      reference:       requestRef,
      errorMessage:    error.message,
      transactionData: { operator: operator?.toUpperCase(), packageId, smartCardNumber, serviceType: 'cable_tv' },
    };
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
      success:        true,
      reference:      data.reference || generateReference('ELEC'),
      description:    `Electricity - ${data.company || provider} ${meterTypeCode === 1 ? 'Prepaid' : 'Postpaid'} - ${meterNumber}`,
      successMessage: 'Electricity payment successful',
      transactionData: {
        provider: data.company || provider, meterNumber: data.meterno || meterNumber,
        meterType: meterTypeCode === 1 ? 'Prepaid' : 'Postpaid', phone,
        token: data.token || null, customerName: data.customer_name || '',
        customerAddress: data.customer_address || '', customerPrice: amount,
        amountPaid: data.amount_paid || amount, serviceType: 'electricity',
        reference: data.reference, transactionDate: data.transaction_date,
      },
    };
  } catch (error) {
    return {
      success:         false,
      reference:       generateReference('ELEC'),
      errorMessage:    error.message,
      transactionData: { provider, meterNumber, meterType, serviceType: 'electricity' },
    };
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
    const requestId      = generateReference('BET');

    const response = await makeClubKonnectRequest('/APIBettingV1.asp', {
      BettingCompany: bettingCompany, CustomerID: customerId, Amount: providerCost, RequestID: requestId,
    });

    const isSuccess = ['100', '200'].includes(response.statuscode) ||
                      ['ORDER_RECEIVED', 'ORDER_COMPLETED'].includes(response.status);
    if (!isSuccess) throw new Error(response.remark || response.status || 'Betting fund failed');

    return {
      success:        true,
      reference:      response.orderid || requestId,
      description:    `Betting Fund - ${bettingCompany} - ${customerId}`,
      successMessage: `${bettingCompany} account funded successfully`,
      transactionData: { provider: bettingCompany, customerId, customerName, customerPrice: amount, serviceType: 'fund_betting' },
    };
  } catch (error) {
    return {
      success:         false,
      reference:       generateReference('BET'),
      errorMessage:    error.message,
      transactionData: { provider: provider?.toUpperCase(), customerId, serviceType: 'fund_betting' },
    };
  }
}

async function processEducationPurchase({ provider, examType, phone, amount, quantity, userId }) {
  try {
    if (!provider || !examType || !phone) throw new Error('Missing required fields: provider, examType, phone');
    if (!PHONE_REGEX.test(phone)) throw new Error('Invalid phone number format');

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
    const description = `${provider.toUpperCase()} Exam PIN - ${qty} card(s). ${pinsText}`;

    return {
      success:        true,
      reference:      data.reference || generateReference('EDU'),
      description,
      successMessage: `Successfully purchased ${qty} ${provider.toUpperCase()} pin(s)`,
      transactionData: {
        provider: provider.toUpperCase(), examType, phone, quantity: qty, pins,
        customerPrice: amount, amountPaid: data.amount_paid || amount,
        serviceType: 'education', reference: data.reference,
      },
    };
  } catch (error) {
    return {
      success:         false,
      reference:       generateReference('EDU'),
      errorMessage:    error.response?.data?.message || error.message,
      transactionData: { provider: provider?.toUpperCase(), examType, phone, serviceType: 'education' },
    };
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

    const requestId        = generateReference('NET');
    const purchaseResponse = await makeClubKonnectRequest('/APISmileV1.asp', {
      MobileNetwork: 'smile-direct', DataPlan: correctPlanId, MobileNumber: customerNumber, RequestID: requestId,
    });

    const statusCode = purchaseResponse.statuscode || purchaseResponse.status_code;
    const status     = purchaseResponse.status     || purchaseResponse.orderstatus;
    const remark     = purchaseResponse.remark     || purchaseResponse.message;

    if (['100', '200'].includes(statusCode) || ['ORDER_RECEIVED', 'ORDER_COMPLETED'].includes(status)) {
      return {
        success:        true,
        reference:      purchaseResponse.orderid || requestId,
        description:    `Internet - SMILE ${plan} - ${customerNumber}`,
        successMessage: 'Smile internet subscription successful',
        transactionData: { provider: 'SMILE', plan, planId: correctPlanId, customerNumber, customerPrice: amount, serviceType: 'internet' },
      };
    }
    throw new Error(remark || status || 'Internet subscription failed');
  } catch (error) {
    return {
      success:         false,
      reference:       generateReference('NET'),
      errorMessage:    error.message,
      transactionData: { provider: provider?.toUpperCase(), plan, customerNumber, serviceType: 'internet' },
    };
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
    const requestId   = generateReference('EPIN');

    const response = await makeClubKonnectRequest('/APIEPINV1.asp', {
      MobileNetwork: networkCode, Value: denomination, Quantity: quantity, RequestID: requestId,
    });

    if (response.TXN_EPIN && Array.isArray(response.TXN_EPIN)) {
      const pins        = response.TXN_EPIN.map(epin => ({ pin: epin.pin, serial: epin.sno }));
      const pinsText    = pins.map(p => `PIN: ${p.pin} (Serial: ${p.serial})`).join(', ');
      const description = `${network.toUpperCase()} ${cardType || 'AIRTIME'} Recharge - ${quantity} card(s) x ₦${denomination}. ${pinsText}`;
      return {
        success:        true,
        reference:      response.TXN_EPIN[0].transactionid || requestId,
        description,
        successMessage: `Generated ${quantity} PIN(s) successfully`,
        transactionData: {
          network: network.toUpperCase(), value: denomination, quantity, denomination,
          type: cardType || 'airtime', pins, customerPrice: amount, serviceType: 'print_recharge',
        },
      };
    }
    throw new Error('No PINs received from provider');
  } catch (error) {
    return {
      success:         false,
      reference:       generateReference('EPIN'),
      errorMessage:    error.message,
      transactionData: { network: network?.toUpperCase(), value: denomination, quantity, serviceType: 'print_recharge' },
    };
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

// FIX: admin-only routes — add isAdmin middleware
// If you don't have isAdmin yet, create it or replace with your admin check
const isAdmin = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Admin access required' });
  }
  next();
};

router.get('/query-ea-transaction/:reference', authenticate, isAdmin, async (req, res) => {
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

router.get('/ea-balance', authenticate, isAdmin, async (req, res) => {
  try {
    const data = await makeEasyAccessRequest('get', 'wallet-balance');
    res.json({ success: true, data });
  } catch (error) {
    logger.error('EA balance check error', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;