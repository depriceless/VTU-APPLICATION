// routes/electricity.js - EasyAccess Version
const express = require('express');
const router = express.Router();
const axios = require('axios');
const { authenticate } = require('../middleware/auth');

const EA_CONFIG = {
  token:   process.env.EASYACCESS_TOKEN,
  baseUrl: 'https://easyaccess.com.ng/api/live/v1'
};

const eaHeaders = () => ({
  'Authorization': `Bearer ${EA_CONFIG.token}`,
  'Cache-Control': 'no-cache',
  'Content-Type':  'application/json'
});

const normalizeEAResponse = (data, httpStatus = null) => {
  if (!data || typeof data !== 'object') {
    return { code: 500, status: 'failed', message: 'Invalid response from EasyAccess' };
  }
  if (data.code !== undefined && data.status !== undefined) return data;
  const inferredCode   = httpStatus || 503;
  const inferredStatus = (inferredCode === 200 || inferredCode === 201) ? 'success' : 'failed';
  return { code: inferredCode, status: inferredStatus, ...data };
};

const classifyError = (error) => {
  const httpStatus = error.response?.status;
  if (['ECONNREFUSED', 'ENOTFOUND', 'ENETUNREACH', 'EHOSTUNREACH'].includes(error.code)) {
    return { type: 'network', retry: false, message: "Cannot reach EasyAccess server. Please check your server's internet connection." };
  }
  if (error.code === 'ECONNABORTED') {
    return { type: 'timeout', retry: true, message: 'EasyAccess is taking too long to respond. Please try again.' };
  }
  if (httpStatus === 503) {
    const msg = error.response?.data?.message || 'EasyAccess service temporarily unavailable.';
    return { type: 'service', retry: true, message: msg };
  }
  return { type: 'unknown', retry: false, message: error.message || 'EasyAccess request failed.' };
};

const makeEasyAccessRequest = async (method, endpoint, data = null, attempt = 1) => {
  try {
    const config = { method, url: `${EA_CONFIG.baseUrl}/${endpoint}`, headers: eaHeaders(), timeout: 60000 };
    if (data) config.data = data;
    console.log(`📡 EasyAccess ${method.toUpperCase()} /${endpoint} (attempt ${attempt})`, data || '');
    const response = await axios(config);
    console.log(`📥 EasyAccess Response [${response.status}]:`, response.data);
    return normalizeEAResponse(response.data, response.status);
  } catch (error) {
    const httpStatus = error.response?.status;
    const rawBody    = error.response?.data;
    const classified = classifyError(error);
    console.error(`❌ EasyAccess Error (attempt ${attempt}): type=${classified.type} http=${httpStatus || 'N/A'} code=${error.code || 'N/A'}`, rawBody || error.message);
    if (attempt === 1 && classified.retry) {
      console.log(`⏳ Retrying in 2s (${classified.type})...`);
      await new Promise(r => setTimeout(r, 2000));
      return makeEasyAccessRequest(method, endpoint, data, 2);
    }
    if (rawBody) return normalizeEAResponse(rawBody, httpStatus);
    return { code: 503, status: 'failed', message: classified.message };
  }
};

const isEASuccess = (data) =>
  (data.code === 200 || data.code === 201) &&
  ['success', 'successful'].includes((data.status || '').toLowerCase());

// ✅ FIXED: Correct EasyAccess company codes per admin confirmation
//    1=EKEDC, 2=IKEDC, 3=PHEDC, 4=KEDCO, 5=AEDC, 6=IBEDC,
//    7=EEDC,  8=BEDC,  9=JED,  10=KAEDCO, 11=ABA, 12=YEDC
const EA_ELECTRICITY_COMPANY = {
  '01': 1,  '02': 2,  '03': 3,  '04': 4,  '05': 6,  '06': 5,
  '07': 7,  '08': 8,  '09': 9,  '10': 10, '11': 11, '12': 12,
  'ekedc': 1, 'ikedc': 2, 'phedc': 3, 'kedco':  4,
  'ibedc': 6, 'aedc':  5, 'eedc':  7, 'bedc':   8,
  'jed':   9, 'kaedco':10, 'aba': 11, 'yedc':   12
};

const EA_METER_TYPE = {
  '01': 1, '1': 1, 'prepaid':  1,
  '02': 2, '2': 2, 'postpaid': 2
};

// ✅ FIXED: IBEDC (eaCode 6) also requires ₦2000 minimum
const DISCO_MINIMUMS = { 4: 2000, 6: 2000, 10: 2000 };

const PROVIDERS = [
  { id: '01', name: 'Eko Electric',          fullName: 'Eko Electricity Distribution Company',        acronym: 'EKEDC',  eaCode: 1,  isActive: true, minAmount: 1000, maxAmount: 100000 },
  { id: '02', name: 'Ikeja Electric',         fullName: 'Ikeja Electric Distribution Company',         acronym: 'IKEDC',  eaCode: 2,  isActive: true, minAmount: 1000, maxAmount: 100000 },
  { id: '03', name: 'Port Harcourt Electric', fullName: 'Port Harcourt Electric Distribution Company', acronym: 'PHEDC',  eaCode: 3,  isActive: true, minAmount: 1000, maxAmount: 100000 },
  { id: '04', name: 'Kano Electric',          fullName: 'Kano Electricity Distribution Company',       acronym: 'KEDCO',  eaCode: 4,  isActive: true, minAmount: 2000, maxAmount: 100000 },
  { id: '05', name: 'Ibadan Electric',        fullName: 'Ibadan Electricity Distribution Company',     acronym: 'IBEDC',  eaCode: 6,  isActive: true, minAmount: 2000, maxAmount: 100000 },
  { id: '06', name: 'Abuja Electric',         fullName: 'Abuja Electricity Distribution Company',      acronym: 'AEDC',   eaCode: 5,  isActive: true, minAmount: 1000, maxAmount: 100000 },
  { id: '07', name: 'Enugu Electric',         fullName: 'Enugu Electricity Distribution Company',      acronym: 'EEDC',   eaCode: 7,  isActive: true, minAmount: 1000, maxAmount: 100000 },
  { id: '08', name: 'Benin Electric',         fullName: 'Benin Electricity Distribution Company',      acronym: 'BEDC',   eaCode: 8,  isActive: true, minAmount: 1000, maxAmount: 100000 },
  { id: '09', name: 'Jos Electric',           fullName: 'Jos Electricity Distribution Company',        acronym: 'JED',    eaCode: 9,  isActive: true, minAmount: 1000, maxAmount: 100000 },
  { id: '10', name: 'Kaduna Electric',        fullName: 'Kaduna Electric Distribution Company',        acronym: 'KAEDCO', eaCode: 10, isActive: true, minAmount: 2000, maxAmount: 100000 },
  { id: '11', name: 'Aba Electric',           fullName: 'Aba Electricity Distribution Company',        acronym: 'ABA',    eaCode: 11, isActive: true, minAmount: 1000, maxAmount: 100000 },
  { id: '12', name: 'Yola Electric',          fullName: 'Yola Electricity Distribution Company',       acronym: 'YEDC',   eaCode: 12, isActive: true, minAmount: 1000, maxAmount: 100000 },
];

// ── GET /api/electricity/providers ──────────────────────────────────────────
router.get('/providers', authenticate, async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'Electricity providers retrieved successfully',
      data:    PROVIDERS.filter(p => p.isActive),
      count:   PROVIDERS.filter(p => p.isActive).length,
      source:  'static'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error retrieving electricity providers' });
  }
});

// ── GET /api/electricity/provider/:id ───────────────────────────────────────
router.get('/provider/:id', authenticate, async (req, res) => {
  try {
    const provider = PROVIDERS.find(p => p.id === req.params.id);
    if (!provider)          return res.status(404).json({ success: false, message: 'Electricity provider not found' });
    if (!provider.isActive) return res.status(503).json({ success: false, message: 'Provider service temporarily unavailable' });
    res.json({ success: true, message: `${provider.name} details retrieved`, data: provider });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error retrieving provider details' });
  }
});

// ── POST /api/electricity/validate-meter ─────────────────────────────────────
router.post('/validate-meter', authenticate, async (req, res) => {
  try {
    const { meterNumber, provider, meterType, amount } = req.body;

    console.log('=== METER VALIDATION REQUEST ===');
    console.log('Provider:', provider, '| Meter:', meterNumber, '| Type:', meterType);

    if (!meterNumber || !provider || !meterType) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: meterNumber, provider, meterType'
      });
    }

    if (!/^\d{10,13}$/.test(meterNumber)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid meter number format. Must be 10–13 digits.'
      });
    }

    const companyCode = EA_ELECTRICITY_COMPANY[String(provider).toLowerCase()] ||
                        EA_ELECTRICITY_COMPANY[String(provider)];
    if (!companyCode) {
      return res.status(400).json({ success: false, message: 'Invalid electricity provider' });
    }

    const meterTypeCode = EA_METER_TYPE[String(meterType).toLowerCase()] ||
                          EA_METER_TYPE[String(meterType)] || 1;

    const minAmount    = DISCO_MINIMUMS[companyCode] || 1000;
    const verifyAmount = Math.max(parseInt(amount) || 0, minAmount);

    const data = await makeEasyAccessRequest('post', 'verify-electricity', {
      company:   companyCode,
      metertype: meterTypeCode,
      meterno:   meterNumber,
      amount:    verifyAmount
    });

    console.log('📋 Verify electricity result:', data);

    if (!isEASuccess(data)) {
      let userMessage = data.message || 'Meter validation failed.';
      if (data.code === 503) {
        userMessage = 'Service temporarily unavailable. Please try again later.';
      }
      return res.status(400).json({ success: false, message: userMessage });
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
        provider: companyCode
      }
    });

  } catch (error) {
    console.error('Meter validation unexpected error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error validating meter number. Please try again.'
    });
  }
});

// ── GET /api/electricity/history ─────────────────────────────────────────────
router.get('/history', authenticate, async (req, res) => {
  try {
    const { provider, limit = 20, page = 1 } = req.query;
    const Transaction = require('../models/Transaction');

    const query = { userId: req.user.userId, serviceType: 'electricity' };
    if (provider) query['metadata.provider'] = provider;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [transactions, totalTransactions] = await Promise.all([
      Transaction.find(query).sort({ createdAt: -1 }).limit(parseInt(limit)).skip(skip),
      Transaction.countDocuments(query)
    ]);

    const formattedTransactions = transactions.map(tx => ({
      _id:          tx._id,
      reference:    tx.reference,
      provider:     tx.metadata?.provider    || 'UNKNOWN',
      meterType:    tx.metadata?.meterType   || 'unknown',
      meterNumber:  tx.metadata?.meterNumber || 'Unknown',
      amount:       tx.amount,
      token:        tx.metadata?.token       || null,
      status:       tx.status,
      createdAt:    tx.createdAt,
      balanceAfter: tx.balanceAfter || tx.newBalance
    }));

    res.json({
      success:      true,
      message:      'Electricity payment history retrieved',
      transactions: formattedTransactions,
      pagination: {
        page:  parseInt(page),
        limit: parseInt(limit),
        total: totalTransactions,
        pages: Math.ceil(totalTransactions / parseInt(limit))
      },
      statistics: {
        totalSpent:             formattedTransactions.reduce((s, tx) => s + tx.amount, 0),
        successfulTransactions: formattedTransactions.filter(tx => tx.status === 'completed').length,
        failedTransactions:     formattedTransactions.filter(tx => tx.status === 'failed').length
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error retrieving electricity history' });
  }
});

module.exports = router;