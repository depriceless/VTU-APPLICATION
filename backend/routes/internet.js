// routes/internet.js - FIXED VERSION: Correct Plan IDs
const express = require('express');
const router = express.Router();
const axios = require('axios');
const { authenticate } = require('../middleware/auth');

// ClubKonnect Configuration
const CK_CONFIG = {
  userId: process.env.CLUBKONNECT_USER_ID,
  apiKey: process.env.CLUBKONNECT_API_KEY,
  baseUrl: process.env.CLUBKONNECT_BASE_URL || 'https://www.nellobytesystems.com'
};

// ✅ FIXED: Removed duplicate plan with wrong ID (625)
// Only using official ClubKonnect plan IDs from Document 1
let SMILE_PLANS_CACHE = [
  // SmileMINI Plans (Daily)
  { id: '843', name: 'SmileMINI 1GB for 1days', dataSize: '1GB', validity: '1 day', amount: 450, category: 'daily', popular: false, speed: '10-20Mbps' },
  { id: '844', name: 'Smile MINI 2.5GB for 1days', dataSize: '2.5GB', validity: '1 day', amount: 750, category: 'daily', popular: true, speed: '10-20Mbps' },
  { id: '845', name: 'Smile MINI 3GB for 2days', dataSize: '3GB', validity: '2 days', amount: 1500, category: 'daily', popular: false, speed: '10-20Mbps' },
  { id: '846', name: 'Smile MINI 5GB for 2days', dataSize: '5GB', validity: '2 days', amount: 2200, category: 'daily', popular: false, speed: '10-20Mbps' },
  
  // SmileMINI Plans (Weekly)
  { id: '847', name: 'Smile MINI 1GB for 7days', dataSize: '1GB', validity: '7 days', amount: 750, category: 'weekly', popular: false, speed: '10-20Mbps' },
  { id: '848', name: 'Smile MINI 3.5GB for 7days', dataSize: '3.5GB', validity: '7 days', amount: 1500, category: 'weekly', popular: true, speed: '10-20Mbps' },
  { id: '849', name: 'Smile MINI 6GB for 7days', dataSize: '6GB', validity: '7 days', amount: 2300, category: 'weekly', popular: false, speed: '10-20Mbps' },
  
  // Smile MIDI Plans (Monthly) - Most Popular
  { id: '828', name: 'Smile MIDI 1.5GB for 30days', dataSize: '1.5GB', validity: '30 days', amount: 1250, category: 'monthly', popular: false, speed: '10-20Mbps' },
  { id: '829', name: 'Smile MIDI 2GB for 30days', dataSize: '2GB', validity: '30 days', amount: 1500, category: 'monthly', popular: true, speed: '10-20Mbps' },
  { id: '830', name: 'Smile MIDI 3GB for 30days', dataSize: '3GB', validity: '30 days', amount: 2000, category: 'monthly', popular: true, speed: '10-20Mbps' },
  { id: '831', name: 'Smile MIDI 6GB for 30days', dataSize: '6GB', validity: '30 days', amount: 3000, category: 'monthly', popular: true, speed: '10-20Mbps' },
  { id: '832', name: 'Smile MIDI 8GB for 30days', dataSize: '8GB', validity: '30 days', amount: 3500, category: 'monthly', popular: false, speed: '10-20Mbps' },
  { id: '833', name: 'Smile MIDI 10GB for 30days', dataSize: '10GB', validity: '30 days', amount: 4000, category: 'monthly', popular: true, speed: '10-20Mbps' },
  { id: '834', name: 'Smile MIDI 13GB for 30days', dataSize: '13GB', validity: '30 days', amount: 5000, category: 'monthly', popular: false, speed: '10-20Mbps' },
  { id: '835', name: 'Smile MIDI 18GB for 30days', dataSize: '18GB', validity: '30 days', amount: 6000, category: 'monthly', popular: false, speed: '10-20Mbps' },
  { id: '836', name: 'Smile MIDI 20GB for 30days', dataSize: '20GB', validity: '30 days', amount: 7000, category: 'monthly', popular: false, speed: '10-20Mbps' },
  { id: '837', name: 'Smile MIDI 25GB for 30days', dataSize: '25GB', validity: '30 days', amount: 9000, category: 'monthly', popular: false, speed: '10-20Mbps' },
  { id: '838', name: 'Smile MIDI 40GB for 30days', dataSize: '40GB', validity: '30 days', amount: 12500, category: 'monthly', popular: false, speed: '10-20Mbps' },
  { id: '839', name: 'Smile MIDI 65GB for 30days', dataSize: '65GB', validity: '30 days', amount: 15000, category: 'monthly', popular: false, speed: '10-20Mbps' },
  { id: '840', name: 'Smile MIDI 100GB for 30days', dataSize: '100GB', validity: '30 days', amount: 20000, category: 'monthly', popular: false, speed: '10-20Mbps' },
  { id: '841', name: 'Smile MIDI 130GB for 30days', dataSize: '130GB', validity: '30 days', amount: 25000, category: 'monthly', popular: false, speed: '10-20Mbps' },
  { id: '842', name: 'Smile MIDI 210GB for 30days', dataSize: '210GB', validity: '30 days', amount: 40000, category: 'monthly', popular: false, speed: '10-20Mbps' },
  
  // Smile MAXI Plans (Unlimited)
  { id: '823', name: 'Smile MAXI Lite for 30days', dataSize: 'Unlimited', validity: '30 days', amount: 15000, category: 'unlimited', popular: false, speed: 'Fair Usage' },
  { id: '824', name: 'Smile MAXI Essential for 30days', dataSize: 'Unlimited', validity: '30 days', amount: 27700, category: 'unlimited', popular: false, speed: 'Essential Speed' },
  { id: '826', name: 'Smile Maxi Home for 30days', dataSize: 'Unlimited', validity: '30 days', amount: 38500, category: 'unlimited', popular: false, speed: '3Mbps' },
  { id: '827', name: 'Smile MAXI Office for 30days', dataSize: 'Unlimited', validity: '30 days', amount: 45000, category: 'unlimited', popular: false, speed: '6Mbps' },
  { id: '825', name: 'Smile MAXI DataFlux for 30days', dataSize: 'Unlimited', validity: '30 days', amount: 61500, category: 'unlimited', popular: false, speed: 'Best Effort' },
  
  // Smile JUMBO Plans (Long validity)
  { id: '850', name: 'Smile JUMBO 90GB for 60days', dataSize: '90GB', validity: '60 days', amount: 25000, category: 'jumbo', popular: false, speed: '10-20Mbps' },
  { id: '851', name: 'Smile JUMBO 300GB for 90days', dataSize: '300GB', validity: '90 days', amount: 50000, category: 'jumbo', popular: false, speed: '10-20Mbps' },
  { id: '852', name: 'Smile JUMBO 350GB for 120days', dataSize: '350GB', validity: '120 days', amount: 60000, category: 'jumbo', popular: false, speed: '10-20Mbps' },
  { id: '853', name: 'Smile JUMBO 500GB for 180days', dataSize: '500GB', validity: '180 days', amount: 77000, category: 'jumbo', popular: false, speed: '10-20Mbps' },
  
  // Smile ANNUAL Plans (365 days)
  { id: '854', name: 'Smile ANNUAL 20GB for 365days', dataSize: '20GB', validity: '365 days', amount: 14000, category: 'annual', popular: false, speed: '10-20Mbps' },
  { id: '855', name: 'Smile ANNUAL 50GB for 365days', dataSize: '50GB', validity: '365 days', amount: 29000, category: 'annual', popular: false, speed: '10-20Mbps' },
  { id: '856', name: 'Smile ANNUAL 120GB for 365days', dataSize: '120GB', validity: '365 days', amount: 49500, category: 'annual', popular: false, speed: '10-20Mbps' },
  { id: '857', name: 'Smile ANNUAL 250GB for 365days', dataSize: '250GB', validity: '365 days', amount: 77000, category: 'annual', popular: false, speed: '10-20Mbps' },
  { id: '858', name: 'Smile ANNUAL 450GB for 365days', dataSize: '450GB', validity: '365 days', amount: 107000, category: 'annual', popular: false, speed: '10-20Mbps' },
  { id: '859', name: 'Smile ANNUAL 700GB for 365days', dataSize: '700GB', validity: '365 days', amount: 154000, category: 'annual', popular: false, speed: '10-20Mbps' },
  { id: '860', name: 'Smile ANNUAL 1TB for 365days', dataSize: '1TB', validity: '365 days', amount: 180000, category: 'annual', popular: false, speed: '10-20Mbps' },
  
  // SmileVoice Plans
  { id: '803', name: 'SmileVoice ONLY 65 for 30days', dataSize: '65 minutes', validity: '30 days', amount: 900, category: 'voice', popular: false, speed: 'Voice Only' },
  { id: '804', name: 'SmileVoice ONLY 135 for 30days', dataSize: '135 minutes', validity: '30 days', amount: 1850, category: 'voice', popular: false, speed: 'Voice Only' },
  { id: '805', name: 'SmileVoice ONLY 430 for 30days', dataSize: '430 minutes', validity: '30 days', amount: 5700, category: 'voice', popular: false, speed: 'Voice Only' },
  { id: '806', name: 'SmileVoice ONLY 150 for 60days', dataSize: '150 minutes', validity: '60 days', amount: 2700, category: 'voice', popular: false, speed: 'Voice Only' },
  { id: '807', name: 'SmileVoice ONLY 175 for 90days', dataSize: '175 minutes', validity: '90 days', amount: 3600, category: 'voice', popular: false, speed: 'Voice Only' },
  { id: '808', name: 'SmileVoice ONLY 450 for 60days', dataSize: '450 minutes', validity: '60 days', amount: 7200, category: 'voice', popular: false, speed: 'Voice Only' },
  { id: '809', name: 'SmileVoice ONLY 500 for 90days', dataSize: '500 minutes', validity: '90 days', amount: 9000, category: 'voice', popular: false, speed: 'Voice Only' },
  
  // Freedom Mobile Plan
  { id: '758', name: 'Freedom Mobile Plan for 30days', dataSize: 'Mobile Data', validity: '30 days', amount: 5000, category: 'mobile', popular: false, speed: '10-20Mbps' },
];

// Cache metadata
let priceLastUpdated = null;
let priceUpdateInProgress = false;
const PRICE_CACHE_DURATION = 6 * 60 * 60 * 1000; // 6 hours

// ============================================================
// ✅ SMART PRICE SYNC: Updates prices in background
// ============================================================
async function syncSmilePricesFromClubKonnect() {
  if (priceUpdateInProgress) {
    console.log('⏳ Price sync already in progress, skipping...');
    return;
  }

  try {
    priceUpdateInProgress = true;
    console.log('🔄 Syncing Smile prices from ClubKonnect...');

    const url = `${CK_CONFIG.baseUrl}/APISmilePackagesV2.asp?UserID=${CK_CONFIG.userId}`;
    
    const response = await axios.get(url, {
      timeout: 30000,
      headers: { 'Accept': 'application/json' }
    });

    let data = response.data;
    if (typeof data === 'string') {
      data = JSON.parse(data);
    }

    console.log('📥 ClubKonnect Response:', Object.keys(data));

    // Parse ClubKonnect response
    const updatedPlans = [];
    let changesDetected = 0;

    for (const cachedPlan of SMILE_PLANS_CACHE) {
      // Try to find matching plan in ClubKonnect response
      let foundPlan = null;

      // Search in the response structure
      if (data.smile_direct && Array.isArray(data.smile_direct)) {
        foundPlan = data.smile_direct.find(p => 
          p.dataplan_id === cachedPlan.id || 
          p.plan_id === cachedPlan.id ||
          p.id === cachedPlan.id
        );
      }

      if (foundPlan) {
        const newPrice = parseFloat(foundPlan.plan_amount || foundPlan.amount || cachedPlan.amount);
        
        if (newPrice !== cachedPlan.amount) {
          console.log(`💰 Price changed for ${cachedPlan.name}: ₦${cachedPlan.amount} → ₦${newPrice}`);
          changesDetected++;
        }

        updatedPlans.push({
          ...cachedPlan,
          amount: newPrice,
          description: `Smile ${cachedPlan.name} - ${cachedPlan.dataSize} valid for ${cachedPlan.validity}`
        });
      } else {
        // Keep existing plan with current price
        updatedPlans.push({
          ...cachedPlan,
          description: `Smile ${cachedPlan.name} - ${cachedPlan.dataSize} valid for ${cachedPlan.validity}`
        });
      }
    }

    if (changesDetected > 0) {
      console.log(`✅ Price sync complete: ${changesDetected} prices updated`);
      SMILE_PLANS_CACHE = updatedPlans;
    } else {
      console.log('✅ Price sync complete: No changes detected');
    }

    priceLastUpdated = new Date();

  } catch (error) {
    console.error('⚠️ Price sync failed (using cached prices):', error.message);
  } finally {
    priceUpdateInProgress = false;
  }
}

// ============================================================
// Auto-sync prices every 6 hours
// ============================================================
setInterval(() => {
  syncSmilePricesFromClubKonnect();
}, PRICE_CACHE_DURATION);

// Sync on startup (after 10 seconds to let server start)
setTimeout(() => {
  syncSmilePricesFromClubKonnect();
}, 10000);

// Internet service providers configuration
const INTERNET_CONFIG = {
  smile: {
    name: 'Smile Communications',
    code: 'smile',
    status: 'active',
    color: '#00A651',
    logo: '/images/providers/smile.png',
    description: '4G LTE Internet Service Provider',
    serviceType: 'wireless',
    coverage: ['Lagos', 'Abuja', 'Port Harcourt', 'Ibadan', 'Benin', 'Kaduna'],
    customerService: '0700-9999-7654',
    website: 'https://smile.com.ng',
    connectionTypes: ['4G LTE', 'Fixed LTE'],
    limits: { min: 450, max: 180000 },
    processingTime: '5-10 minutes',
    successRate: 92
  }
};

const setCacheHeaders = (res, maxAge = 3600) => {
  res.set({
    'Cache-Control': `public, max-age=${maxAge}`,
    'Last-Modified': new Date().toUTCString()
  });
};

// ============================================================
// ✅ GET PLANS: Returns cached plans (with auto-updated prices)
// ============================================================
router.get('/provider/:code/plans', authenticate, async (req, res) => {
  try {
    const { code } = req.params;
    const { category, popular } = req.query;

    if (!code || typeof code !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Invalid provider code',
        error_code: 'INVALID_PROVIDER_CODE'
      });
    }

    if (code.toLowerCase() !== 'smile') {
      return res.status(400).json({
        success: false,
        message: 'Only Smile is currently supported',
        error_code: 'UNSUPPORTED_PROVIDER'
      });
    }

    const provider = INTERNET_CONFIG[code.toLowerCase()];

    if (!provider || provider.status !== 'active') {
      return res.status(503).json({
        success: false,
        message: 'Provider service temporarily unavailable',
        error_code: 'PROVIDER_INACTIVE'
      });
    }

    setCacheHeaders(res, 1800);

    // ✅ Trigger background price update if cache is stale (non-blocking)
    if (priceLastUpdated) {
      const cacheAge = Date.now() - priceLastUpdated.getTime();
      if (cacheAge > PRICE_CACHE_DURATION && !priceUpdateInProgress) {
        console.log('🔄 Cache is stale, triggering background price sync...');
        syncSmilePricesFromClubKonnect(); // Don't await - happens in background
      }
    }

    // Add descriptions
    const formattedPlans = SMILE_PLANS_CACHE.map(plan => ({
      ...plan,
      description: plan.description || `Smile ${plan.name} - ${plan.dataSize} valid for ${plan.validity}`
    }));

    // Apply filters
    let filteredPlans = [...formattedPlans];

    if (category) {
      const validCategories = ['daily', 'weekly', 'monthly', 'jumbo', 'annual', 'voice', 'mobile', 'unlimited'];
      if (!validCategories.includes(category)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid category',
          error_code: 'INVALID_CATEGORY'
        });
      }
      filteredPlans = filteredPlans.filter(plan => plan.category === category);
    }

    if (popular !== undefined) {
      const isPopular = popular === 'true';
      filteredPlans = filteredPlans.filter(plan => plan.popular === isPopular);
    }

    // Group plans by category
    const plansByCategory = {
      daily: filteredPlans.filter(p => p.category === 'daily'),
      weekly: filteredPlans.filter(p => p.category === 'weekly'),
      monthly: filteredPlans.filter(p => p.category === 'monthly'),
      unlimited: filteredPlans.filter(p => p.category === 'unlimited'),
      jumbo: filteredPlans.filter(p => p.category === 'jumbo'),
      annual: filteredPlans.filter(p => p.category === 'annual'),
      voice: filteredPlans.filter(p => p.category === 'voice'),
      mobile: filteredPlans.filter(p => p.category === 'mobile')
    };

    console.log(`✅ Returning ${filteredPlans.length} Smile plans (cached)`);

    res.json({
      success: true,
      message: `Internet plans retrieved for ${provider.name}`,
      provider: {
        code: provider.code,
        name: provider.name,
        serviceType: provider.serviceType,
        coverage: provider.coverage,
        limits: provider.limits
      },
      plans: filteredPlans,
      plansByCategory,
      statistics: {
        total: filteredPlans.length,
        popular: filteredPlans.filter(p => p.popular).length,
        categories: {
          daily: plansByCategory.daily.length,
          weekly: plansByCategory.weekly.length,
          monthly: plansByCategory.monthly.length,
          unlimited: plansByCategory.unlimited.length,
          jumbo: plansByCategory.jumbo.length,
          annual: plansByCategory.annual.length,
          voice: plansByCategory.voice.length,
          mobile: plansByCategory.mobile.length
        },
        priceRange: filteredPlans.length > 0 ? {
          min: Math.min(...filteredPlans.map(p => p.amount)),
          max: Math.max(...filteredPlans.map(p => p.amount))
        } : { min: 0, max: 0 }
      },
      dataSource: 'cached_with_auto_sync',
      lastUpdated: priceLastUpdated ? priceLastUpdated.toISOString() : '2024-12-28',
      nextUpdate: priceLastUpdated ? new Date(priceLastUpdated.getTime() + PRICE_CACHE_DURATION).toISOString() : null,
      note: '✅ Prices auto-sync every 6 hours from ClubKonnect API'
    });

  } catch (error) {
    console.error('❌ Error in plans endpoint:', error);
    res.status(500).json({
      success: false,
      message: 'Server error retrieving internet plans',
      error_code: 'PLANS_FETCH_FAILED',
      error: error.message
    });
  }
});

// GET /api/internet/providers
router.get('/providers', authenticate, async (req, res) => {
  try {
    setCacheHeaders(res, 7200);

    const providers = Object.values(INTERNET_CONFIG)
      .filter(provider => provider.status === 'active')
      .map(provider => ({
        code: provider.code,
        name: provider.name,
        description: provider.description,
        serviceType: provider.serviceType,
        coverage: provider.coverage,
        color: provider.color,
        logo: provider.logo,
        connectionTypes: provider.connectionTypes,
        limits: provider.limits,
        processingTime: provider.processingTime,
        successRate: provider.successRate,
        customerService: provider.customerService,
        website: provider.website
      }));

    res.json({
      success: true,
      message: 'Internet providers retrieved',
      providers,
      count: providers.length,
      serviceTypes: ['wireless'],
      supportedServices: ['data_subscription', 'account_validation']
    });

  } catch (error) {
    console.error('Error fetching internet providers:', error);
    res.status(500).json({
      success: false,
      message: 'Server error retrieving internet providers',
      error_code: 'PROVIDERS_FETCH_FAILED'
    });
  }
});

// GET /api/internet/provider/:code
router.get('/provider/:code', authenticate, async (req, res) => {
  try {
    const { code } = req.params;

    if (!code || typeof code !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Invalid provider code',
        error_code: 'INVALID_PROVIDER_CODE'
      });
    }

    const provider = INTERNET_CONFIG[code.toLowerCase()];

    if (!provider) {
      return res.status(404).json({
        success: false,
        message: 'Internet provider not found',
        error_code: 'PROVIDER_NOT_FOUND'
      });
    }

    if (provider.status !== 'active') {
      return res.status(503).json({
        success: false,
        message: 'Provider service temporarily unavailable',
        error_code: 'PROVIDER_INACTIVE'
      });
    }

    setCacheHeaders(res);

    res.json({
      success: true,
      message: `${provider.name} details retrieved`,
      provider: {
        code: provider.code,
        name: provider.name,
        description: provider.description,
        serviceType: provider.serviceType,
        coverage: provider.coverage,
        color: provider.color,
        logo: provider.logo,
        connectionTypes: provider.connectionTypes,
        limits: provider.limits,
        processingTime: provider.processingTime,
        successRate: provider.successRate,
        customerService: provider.customerService,
        website: provider.website
      },
      planCategories: ['daily', 'weekly', 'monthly', 'unlimited', 'jumbo', 'annual', 'voice', 'mobile']
    });

  } catch (error) {
    console.error('Error fetching provider details:', error);
    res.status(500).json({
      success: false,
      message: 'Server error retrieving provider details',
      error_code: 'PROVIDER_FETCH_FAILED'
    });
  }
});

// POST /api/internet/validate-account
router.post('/validate-account', authenticate, async (req, res) => {
  try {
    const { customerNumber, provider } = req.body;

    if (!customerNumber || !provider) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: customerNumber, provider',
        error_code: 'MISSING_FIELDS'
      });
    }

    if (provider.toLowerCase() !== 'smile') {
      return res.status(400).json({
        success: false,
        message: 'Only Smile is currently supported',
        error_code: 'UNSUPPORTED_PROVIDER'
      });
    }

    try {
      const url = `${CK_CONFIG.baseUrl}/APIVerifySmileV1.asp?UserID=${CK_CONFIG.userId}&APIKey=${CK_CONFIG.apiKey}&MobileNetwork=smile-direct&MobileNumber=${customerNumber}`;
      
      const response = await axios.get(url, {
        timeout: 15000,
        headers: { 'Accept': 'application/json' }
      });

      let data = response.data;
      if (typeof data === 'string') {
        data = JSON.parse(data);
      }

      if (!data.customer_name || 
          data.customer_name === 'INVALID_ACCOUNTNO' ||
          data.customer_name.toUpperCase().includes('INVALID')) {
        
        return res.status(400).json({
          success: false,
          message: 'Invalid Smile account number',
          error_code: 'INVALID_ACCOUNT'
        });
      }

      res.json({
        success: true,
        message: 'Account validation successful',
        customerNumber,
        provider: 'SMILE',
        customerData: {
          name: data.customer_name,
          customerNumber: customerNumber,
          status: 'Active'
        },
        isValid: true
      });

    } catch (apiError) {
      console.error('Validation API Error:', apiError);
      
      res.json({
        success: true,
        message: 'Validation service unavailable, you can still proceed',
        customerNumber,
        provider: 'SMILE',
        customerData: {
          name: 'Smile Customer',
          customerNumber: customerNumber,
          status: 'Unknown'
        },
        isValid: true,
        warning: 'Could not verify account number'
      });
    }

  } catch (error) {
    console.error('Account validation error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error validating customer account',
      error_code: 'VALIDATION_FAILED'
    });
  }
});

// GET /api/internet/refresh-plans - Manually trigger price sync
router.get('/refresh-plans', authenticate, async (req, res) => {
  try {
    console.log('🔄 Manual price refresh requested...');
    
    // Trigger sync and wait for it
    await syncSmilePricesFromClubKonnect();

    res.json({
      success: true,
      message: 'Smile plans refreshed successfully',
      plansCount: SMILE_PLANS_CACHE.length,
      plans: SMILE_PLANS_CACHE,
      lastUpdated: priceLastUpdated ? priceLastUpdated.toISOString() : null,
      note: '✅ Prices synced from ClubKonnect API'
    });

  } catch (error) {
    console.error('Error refreshing plans:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to refresh plans',
      error: error.message
    });
  }
});

module.exports = router;