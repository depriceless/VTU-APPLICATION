// routes/cabletv.js - EasyAccess Version
const express = require('express');
const router = express.Router();
const axios = require('axios');
const { authenticate } = require('../middleware/auth');

// ── EasyAccess Configuration ──────────────────────────────────────────────────
const EA_CONFIG = {
  token: process.env.EASYACCESS_TOKEN || '3e17bad4c941d642424fc7a60320b622',
  baseUrl: 'https://easyaccess.com.ng/api/live/v1'
};

const eaHeaders = () => ({
  'Authorization': `Bearer ${EA_CONFIG.token}`,
  'Cache-Control': 'no-cache',
  'Content-Type': 'application/json'
});

const makeEasyAccessRequest = async (method, endpoint, data = null) => {
  const config = {
    method,
    url: `${EA_CONFIG.baseUrl}/${endpoint}`,
    headers: eaHeaders(),
    timeout: 60000
  };
  if (data) config.data = data;
  console.log(`📡 EasyAccess ${method.toUpperCase()} /${endpoint}`, data || '');
  const response = await axios(config);
  console.log(`📥 EasyAccess Response:`, response.data);
  return response.data;
};

const isEASuccess = (data) =>
  (data.code === 200 || data.code === 201) &&
  ['success', 'successful'].includes((data.status || '').toLowerCase());

// ── EasyAccess Cable TV company codes ────────────────────────────────────────
// 1=DSTV, 2=GOTV, 3=STARTIMES, 4=SHOWMAX
const EA_CABLE_COMPANY = {
  'dstv':      1,
  'gotv':      2,
  'startimes': 3,
  'startime':  3,
  'showmax':   4
};

// ── Maps company code back to product_type for get-plans ─────────────────────
const EA_PRODUCT_TYPE = {
  1: 'dstv',
  2: 'gotv',
  3: 'startimes',
  4: 'showmax'
};

// ── Maps company code to response key in get-plans response ──────────────────
const EA_RESPONSE_KEY = {
  1: 'DSTV',
  2: 'GOTV',
  3: 'STARTIMES',
  4: 'SHOWMAX'
};

// ── Operator display info ─────────────────────────────────────────────────────
const OPERATOR_INFO = {
  dstv: {
    name: 'DStv',
    logo: '📺',
    color: '#FFA500',
    description: 'Digital Satellite Television',
    smartCardLength: 10,
    eaCode: 1
  },
  gotv: {
    name: 'GOtv',
    logo: '📡',
    color: '#00A651',
    description: 'Digital Terrestrial Television',
    smartCardLength: 10,
    eaCode: 2
  },
  startimes: {
    name: 'StarTimes',
    logo: '🛰️',
    color: '#FF0000',
    description: 'Digital Television Service',
    smartCardLength: 11,
    eaCode: 3
  },
  showmax: {
    name: 'Showmax',
    logo: '🎬',
    color: '#E50914',
    description: 'Streaming Television Service',
    smartCardLength: 10,
    eaCode: 4
  }
};

// ── GET /api/cabletv/providers ────────────────────────────────────────────────
router.get('/providers', authenticate, async (req, res) => {
  try {
    const providers = Object.entries(OPERATOR_INFO).map(([code, info]) => ({
      code,
      ...info
    }));

    res.json({
      success: true,
      message: 'Cable TV providers retrieved',
      providers,
      count: providers.length,
      lastModified: new Date()
    });
  } catch (error) {
    console.error('Get providers error:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve providers' });
  }
});

// ── POST /api/cabletv/validate-smartcard (EasyAccess) ────────────────────────
router.post('/validate-smartcard', authenticate, async (req, res) => {
  try {
    const { smartCardNumber, operator } = req.body;

    console.log('=== SMART CARD VALIDATION REQUEST (EasyAccess) ===');
    console.log('Operator:', operator, '| Card:', smartCardNumber ? smartCardNumber.slice(0, 4) + '***' : 'MISSING');

    if (!smartCardNumber) {
      return res.status(400).json({ success: false, message: 'Smart card number is required' });
    }

    if (!operator) {
      return res.status(400).json({ success: false, message: 'Operator is required' });
    }

    const companyCode = EA_CABLE_COMPANY[operator.toLowerCase()];
    if (!companyCode) {
      return res.status(400).json({ success: false, message: 'Unsupported operator' });
    }

    // ✅ Using correct field name 'iucno' as per EasyAccess docs
    const data = await makeEasyAccessRequest('post', 'verify-tv', {
      company: companyCode,
      iucno: smartCardNumber
    });

    if (!isEASuccess(data)) {
      return res.json({
        success: false,
        message: data.message || 'Invalid smart card number for this operator'
      });
    }

    res.json({
      success: true,
      message: 'Smart card verified successfully',
      customerName: data.customer_name,
      customerDetails: {
        name: data.customer_name,
        package: data.current_package || null,
        status: data.customer_status || null,
        dueDate: data.due_date || null,
        renewalAmount: data.renewal_amount || null,
        currentBalance: data.current_balance || null,
        smartCardNumber
      }
    });

  } catch (error) {
    console.error('Smart card validation error:', error.message);
    res.status(500).json({
      success: false,
      message: error.response?.data?.message || error.message || 'Smart card validation failed'
    });
  }
});

// ── GET /api/cabletv/packages/:operator (EasyAccess) ─────────────────────────
router.get('/packages/:operator', authenticate, async (req, res) => {
  try {
    const normalizedOperator = req.params.operator.toLowerCase();

    // Normalize 'startime' -> 'startimes'
    const canonicalOperator = normalizedOperator === 'startime' ? 'startimes' : normalizedOperator;

    const companyCode = EA_CABLE_COMPANY[canonicalOperator];
    if (!companyCode) {
      return res.status(400).json({
        success: false,
        message: 'Invalid operator. Valid operators are: dstv, gotv, startimes, showmax'
      });
    }

    // ✅ Correct endpoint: get-plans?product_type=gotv (GET request, not POST)
    const productType = EA_PRODUCT_TYPE[companyCode];
    console.log(`📡 Fetching ${canonicalOperator.toUpperCase()} packages from EasyAccess using get-plans?product_type=${productType}`);

    const data = await makeEasyAccessRequest('get', `get-plans?product_type=${productType}`);

    // ✅ Response key is uppercase e.g. 'GOTV', 'DSTV', 'STARTIMES'
    const responseKey = EA_RESPONSE_KEY[companyCode];
    const packageArray = data[responseKey];

    if (data.code !== 200 || !Array.isArray(packageArray) || packageArray.length === 0) {
      return res.status(502).json({
        success: false,
        message: data.message || `Failed to fetch packages for ${canonicalOperator.toUpperCase()}`
      });
    }

    console.log(`📦 Raw packages received: ${packageArray.length}`);

    const isPopular = (name = '') => {
      const keywords = ['padi', 'yanga', 'confam', 'compact', 'smallie', 'jinja', 'jolli', 'basic', 'nova'];
      const n = name.toLowerCase();
      return keywords.some(k => n.includes(k));
    };

    // ✅ EasyAccess returns: plan_id, name, price, validity
    const formattedPackages = packageArray
      .map(pkg => {
        const amount = parseFloat(pkg.price || 0);
        if (!pkg.plan_id || !pkg.name || isNaN(amount) || amount <= 0) return null;

        return {
          id: pkg.plan_id,
          packageId: pkg.plan_id,
          variation_id: pkg.plan_id,
          operator: canonicalOperator,
          name: pkg.name.trim(),
          amount,
          customerPrice: amount,
          duration: pkg.validity || '1 Month',
          description: pkg.name.trim(),
          popular: isPopular(pkg.name),
          active: true
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.amount - b.amount);

    console.log(`✅ Returning ${formattedPackages.length} packages for ${canonicalOperator.toUpperCase()}`);

    res.json({
      success: true,
      message: `Packages retrieved for ${canonicalOperator.toUpperCase()}`,
      operator: canonicalOperator,
      operatorInfo: { code: canonicalOperator, ...OPERATOR_INFO[canonicalOperator] },
      data: formattedPackages,
      count: formattedPackages.length,
      lastModified: new Date(),
      source: 'easyaccess'
    });

  } catch (error) {
    console.error('Get packages error:', error.message);
    res.status(500).json({
      success: false,
      message: error.response?.data?.message || 'Failed to fetch cable packages from EasyAccess',
      error: error.message
    });
  }
});

// ── GET /api/cabletv/history ──────────────────────────────────────────────────
router.get('/history', authenticate, async (req, res) => {
  try {
    const { operator, limit = 20, page = 1 } = req.query;
    const Transaction = require('../models/Transaction');

    const query = { userId: req.user.userId, serviceType: 'cable_tv' };
    if (operator) query['metadata.operator'] = operator;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const transactions = await Transaction.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    const totalTransactions = await Transaction.countDocuments(query);

    const formattedTransactions = transactions.map(tx => ({
      _id: tx._id,
      reference: tx.reference,
      operator: tx.metadata?.operator || 'UNKNOWN',
      packageName: tx.metadata?.packageName || 'Unknown',
      smartCardNumber: tx.metadata?.smartCardNumber || 'Unknown',
      customerName: tx.metadata?.customerName || 'Unknown',
      amount: tx.amount,
      status: tx.status,
      createdAt: tx.createdAt,
      balanceAfter: tx.balanceAfter || tx.newBalance
    }));

    res.json({
      success: true,
      message: 'Cable TV payment history retrieved',
      transactions: formattedTransactions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalTransactions,
        pages: Math.ceil(totalTransactions / parseInt(limit))
      },
      statistics: {
        totalSpent: formattedTransactions.reduce((sum, tx) => sum + tx.amount, 0),
        successfulTransactions: formattedTransactions.filter(tx => tx.status === 'completed').length,
        failedTransactions: formattedTransactions.filter(tx => tx.status === 'failed').length
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error retrieving cable TV history' });
  }
});

// ── Health check ──────────────────────────────────────────────────────────────
router.get('/health', (req, res) => {
  res.json({
    success: true,
    service: 'cable-tv',
    provider: 'easyaccess',
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;