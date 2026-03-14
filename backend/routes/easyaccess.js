const express = require('express');
const router = express.Router();
const axios = require('axios');
const rateLimit = require('express-rate-limit');
const { authenticate } = require('../middleware/auth');
const { calculateCustomerPrice } = require('../config/pricing');
const { logger } = require('../utils/logger');

logger.success('EasyAccess routes module loaded');

// EasyAccess Configuration
const EASYACCESS_CONFIG = {
  BASE_URL: 'https://easyaccess.com.ng/api',
  TOKEN: process.env.EASYACCESS_TOKEN || '3e17bad4c941d642424fc7a60320b622'
};

// ── Exact product_type strings from EasyAccess dashboard ─────────────────────
const NETWORK_PRODUCT_TYPES = {
  mtn: [
    { productType: 'mtn_gifting', frontendType: 'regular' },
    { productType: 'mtn_sme',     frontendType: 'sme'     },
    { productType: 'mtn_cg',      frontendType: 'cg'      },
    { productType: 'mtn_awoof',   frontendType: 'gift'    },
  ],
  glo: [
    { productType: 'glo_gifting', frontendType: 'regular' },
    { productType: 'glo_cg',      frontendType: 'cg'      },
    { productType: 'glo_awoof',   frontendType: 'gift'    },
  ],
  airtel: [
    { productType: 'airtel_gifting', frontendType: 'regular' },
    { productType: 'airtel_cg',      frontendType: 'cg'      },
    { productType: 'airtel_awoof',   frontendType: 'gift'    },
  ],
  '9mobile': [
    { productType: '9mobile_sme', frontendType: 'sme' },
  ],
};

// ── Which product type to use for the public pricing display ─────────────────
const PUBLIC_PRODUCT_TYPE = {
  mtn:     'mtn_cg',
  airtel:  'airtel_cg',
  glo:     'glo_cg',
  '9mobile': '9mobile_sme',
};

// ── Rate limiter: 60 requests per IP per 15 minutes ──────────────────────────
// 4 networks × a few page loads/refreshes = well under 60 for real users.
// Attackers would need 60+ hits in 15 min to trigger — enough protection.
const publicPricingLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' },
});


// === TEST TOKEN ENDPOINT (NO AUTH) ===
router.get('/test-token-direct', async (req, res) => {
  try {
    logger.info('Testing EasyAccess token');

    const balanceResponse = await axios.get('https://easyaccess.com.ng/api/wallet_balance.php', {
      headers: { 'AuthorizationToken': EASYACCESS_CONFIG.TOKEN, 'cache-control': 'no-cache' },
      timeout: 30000
    });

    const plansResponse = await axios.get(
      `${EASYACCESS_CONFIG.BASE_URL}/get_plans.php?product_type=mtn_gifting`, {
      headers: { 'AuthorizationToken': EASYACCESS_CONFIG.TOKEN, 'cache-control': 'no-cache' },
      timeout: 30000
    });

    res.json({
      success: true,
      message: 'EasyAccess token is valid and working',
      tests: {
        balance: { status: 'passed', data: balanceResponse.data },
        plans:   { status: 'passed', data: plansResponse.data }
      }
    });
  } catch (error) {
    logger.error('EasyAccess token test failed', error);
    res.status(500).json({
      success: false,
      message: 'EasyAccess token test failed',
      error: { message: error.message, status: error.response?.status }
    });
  }
});


// === PUBLIC PLANS ENDPOINT (NO AUTH) — for landing page pricing ===
// ⚠️ Must be ABOVE /plans/:network so Express doesn't treat "public" as a network name
router.get('/plans/public/:network', publicPricingLimiter, async (req, res) => {
  try {
    const normalizedNetwork = req.params.network.toLowerCase();
    const productType = PUBLIC_PRODUCT_TYPE[normalizedNetwork];

    if (!productType) {
      return res.status(400).json({ success: false, message: 'Invalid network. Valid: mtn, glo, airtel, 9mobile' });
    }

    const url = `${EASYACCESS_CONFIG.BASE_URL}/get_plans.php?product_type=${productType}`;
    logger.info(`[Public Pricing] Fetching ${productType} for ${normalizedNetwork}`);

    const response = await axios.get(url, {
      headers: { 'AuthorizationToken': EASYACCESS_CONFIG.TOKEN, 'cache-control': 'no-cache' },
      timeout: 30000
    });

    let data = response.data;
    if (typeof data === 'string') {
      try { data = JSON.parse(data); } catch (e) {
        return res.status(502).json({ success: false, message: 'Invalid response from provider' });
      }
    }

    const networkPlans = data[normalizedNetwork.toUpperCase()] || [];
    const plans = [];

    networkPlans.forEach((plan) => {
      const providerCost = parseFloat(plan.price);
      if (isNaN(providerCost) || providerCost <= 0) return;

      const pricing = calculateCustomerPrice(providerCost, 'data');

      plans.push({
        id:            `ea_${plan.plan_id}`,
        planId:        String(plan.plan_id),
        name:          plan.name,
        dataSize:      plan.name.split(' ')[0],
        customerPrice: pricing.customerPrice,
        validity:      plan.validity || '30days',
        type:          normalizedNetwork === '9mobile' ? 'sme' : 'cg',
      });
    });

    res.json({ success: true, plans, count: plans.length });

  } catch (error) {
    logger.error('[Public Pricing] Failed', error.message);
    res.status(500).json({ success: false, message: 'Failed to fetch plans' });
  }
});


// === GET PLANS ENDPOINT (WITH AUTH) ===
router.get('/plans/:network', authenticate, async (req, res) => {
  try {
    const normalizedNetwork = req.params.network.toLowerCase();

    if (!NETWORK_PRODUCT_TYPES[normalizedNetwork]) {
      return res.status(400).json({ success: false, message: 'Invalid network. Valid: mtn, glo, airtel, 9mobile' });
    }

    const productTypes = NETWORK_PRODUCT_TYPES[normalizedNetwork];
    logger.info(`Fetching ${productTypes.length} product types for ${normalizedNetwork}`);

    const allPlans = [];

    for (const { productType, frontendType } of productTypes) {
      try {
        const url = `${EASYACCESS_CONFIG.BASE_URL}/get_plans.php?product_type=${productType}`;
        logger.info(`Fetching ${productType}...`);

        const response = await axios.get(url, {
          headers: { 'AuthorizationToken': EASYACCESS_CONFIG.TOKEN, 'cache-control': 'no-cache' },
          timeout: 30000
        });

        let data = response.data;
        if (typeof data === 'string') {
          try { data = JSON.parse(data); } catch (e) {
            logger.error(`Failed to parse ${productType} response`);
            continue;
          }
        }

        const networkPlans = data[normalizedNetwork.toUpperCase()] || [];
        logger.info(`${productType}: Found ${networkPlans.length} plans (→ ${frontendType})`);

        networkPlans.forEach((plan) => {
          const providerCost = parseFloat(plan.price);
          if (isNaN(providerCost) || providerCost <= 0) return;

          const pricing = calculateCustomerPrice(providerCost, 'data');

          allPlans.push({
            id:            `ea_${plan.plan_id}`,
            planId:        String(plan.plan_id),
            name:          plan.name,
            dataSize:      plan.name.split(' ')[0],
            providerCost:  pricing.providerCost,
            customerPrice: pricing.customerPrice,
            profit:        pricing.profit,
            amount:        pricing.providerCost,
            validity:      plan.validity || '30days',
            network:       normalizedNetwork,
            provider:      'easyaccess',
            type:          frontendType,
            active:        true
          });
        });

      } catch (error) {
        logger.error(`Error fetching ${productType}: ${error.message}`);
      }
    }

    const breakdown = allPlans.reduce((acc, p) => {
      acc[p.type] = (acc[p.type] || 0) + 1;
      return acc;
    }, {});

    logger.success(`${normalizedNetwork} plans loaded: ${allPlans.length} | ${JSON.stringify(breakdown)}`);

    res.json({
      success: true,
      plans: allPlans,
      count: allPlans.length,
      breakdown
    });

  } catch (error) {
    logger.error('Failed to fetch EasyAccess plans', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch EasyAccess plans',
      error: error.message
    });
  }
});

module.exports = router;