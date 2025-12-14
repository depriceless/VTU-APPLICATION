// routes/easyaccess.js - DEBUG VERSION
const express = require('express');
const router = express.Router();
const axios = require('axios');
const { authenticate } = require('../middleware/auth');
const { calculateCustomerPrice } = require('../config/pricing');

console.log('🔥 EasyAccess routes module loaded at:', new Date().toISOString());

// EasyAccess Configuration
const EASYACCESS_CONFIG = {
  BASE_URL: 'https://easyaccess.com.ng/api',
  TOKEN: process.env.EASYACCESS_TOKEN || '3e17bad4c941d642424fc7a60320b622'
};

// Network mapping for EasyAccess API
const EASYACCESS_NETWORK_MAP = {
  'mtn': '01',
  'glo': '02',
  'airtel': '03',
  '9mobile': '04'
};

// ✅ ADD LOGGING MIDDLEWARE TO SEE IF ROUTE IS HIT
router.use((req, res, next) => {
  console.log(`🔍 [EasyAccess] ${req.method} ${req.path}`);
  console.log(`🔍 [EasyAccess] Headers:`, req.headers.authorization ? 'Token exists' : 'No token');
  next();
});

/**
 * GET /api/easyaccess/plans/:network
 * Fetch EasyAccess plans (Gift + CG) with pricing applied
 */
router.get('/plans/:network', authenticate, async (req, res) => {
  try {
    const { network } = req.params;
    
    console.log(`📡 [EasyAccess Route] Fetching plans for ${network}...`);
    console.log(`📡 [EasyAccess Route] Full URL: ${req.originalUrl}`);
    console.log(`📡 [EasyAccess Route] User ID: ${req.user?.userId}`);
    
    const networkCode = EASYACCESS_NETWORK_MAP[network.toLowerCase()];
    
    if (!networkCode) {
      console.log(`❌ Invalid network: ${network}`);
      return res.status(400).json({
        success: false,
        message: 'Invalid network'
      });
    }

    // Determine which product types to fetch based on network
    const productTypes = {
      mtn: ['mtn_gifting', 'mtn_cg'],
      glo: ['glo_gifting', 'glo_cg'],
      airtel: ['airtel_gifting', 'airtel_cg'],
      '9mobile': ['9mobile_gifting']
    };

    const types = productTypes[network.toLowerCase()] || [];
    console.log(`📦 Product types to fetch: ${types.join(', ')}`);
    
    const allPlans = [];

    // Fetch plans for each product type
    for (const productType of types) {
      try {
        console.log(`📡 Fetching ${productType}...`);
        
        const response = await axios.get(
          `${EASYACCESS_CONFIG.BASE_URL}/get_plans.php?product_type=${productType}`,
          {
            headers: {
              'AuthorizationToken': EASYACCESS_CONFIG.TOKEN,
              'cache-control': 'no-cache'
            },
            timeout: 30000
          }
        );

        let data = response.data;
        
        if (typeof data === 'string') {
          try {
            data = JSON.parse(data);
          } catch (e) {
            console.error(`❌ Failed to parse ${productType} response`);
            continue;
          }
        }

        // EasyAccess returns plans under network name key (e.g., "MTN", "GLO")
        const networkPlans = data[network.toUpperCase()];
        
        console.log(`📦 ${productType}: Found ${networkPlans?.length || 0} plans`);
        
        if (networkPlans && Array.isArray(networkPlans)) {
          networkPlans.forEach((plan) => {
            const providerCost = parseFloat(plan.price);
            
            // ✅ APPLY YOUR TIERED PRICING
            const pricing = calculateCustomerPrice(providerCost, 'data');
            
            allPlans.push({
              id: `ea_${plan.plan_id}`,
              planId: plan.plan_id,
              name: plan.name,
              dataSize: plan.name.split(' ')[0], // Extract data size from name
              providerCost: pricing.providerCost,
              customerPrice: pricing.customerPrice,
              profit: pricing.profit,
              amount: pricing.providerCost,
              validity: plan.validity || '30 days',
              network: network.toLowerCase(),
              provider: 'easyaccess',
              type: productType.includes('gifting') ? 'gift' : 'cg',
              active: true
            });
          });
        }
      } catch (error) {
        console.error(`❌ Error fetching ${productType}:`, error.message);
        // Continue with other product types
      }
    }

    console.log(`✅ Loaded ${allPlans.length} EasyAccess plans with pricing applied`);

    res.json({
      success: true,
      plans: allPlans,
      count: allPlans.length
    });

  } catch (error) {
    console.error('❌ Error in /plans/:network route:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch EasyAccess plans',
      error: error.message
    });
  }
});

// Test endpoint (NO AUTH - for debugging)
router.get('/test-no-auth', (req, res) => {
  console.log('🧪 Test endpoint hit (no auth)');
  res.json({
    success: true,
    message: 'EasyAccess routes are working (no auth)',
    timestamp: new Date().toISOString()
  });
});

// Test endpoint (WITH AUTH)
router.get('/test', authenticate, (req, res) => {
  console.log('🧪 Test endpoint hit (with auth)');
  res.json({
    success: true,
    message: 'EasyAccess routes are working',
    user: req.user?.userId,
    timestamp: new Date().toISOString()
  });
});

console.log('✅ EasyAccess routes registered');

module.exports = router;