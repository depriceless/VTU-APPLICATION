// routes/internet.js - FIXED for correct ClubKonnect response structure
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

// Cache for plans (to avoid hitting API repeatedly)
let plansCache = null;
let cacheTimestamp = null;
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

// Helper function to fetch plans from ClubKonnect
async function fetchSmilePlansFromClubKonnect() {
  try {
    // Check cache first
    const now = Date.now();
    if (plansCache && cacheTimestamp && (now - cacheTimestamp < CACHE_DURATION)) {
      console.log('✅ Using cached Smile plans');
      return plansCache;
    }

    console.log('📡 Fetching fresh Smile plans from ClubKonnect...');

    const url = `${CK_CONFIG.baseUrl}/APIDatabundlePlansV2.asp?UserID=${CK_CONFIG.userId}`;
    
    const response = await axios.get(url, {
      timeout: 30000,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'VTU-App/1.0'
      }
    });

    let data = response.data;
    
    // Parse if string
    if (typeof data === 'string') {
      try {
        data = JSON.parse(data);
      } catch (e) {
        throw new Error('Failed to parse ClubKonnect response');
      }
    }

    console.log('📋 ClubKonnect API Response Keys:', Object.keys(data));

    // 🔥 FIX: ClubKonnect returns data under MOBILE_NETWORK key
    let smilePlans = [];
    
    // Check if MOBILE_NETWORK exists and is an object
    if (data.MOBILE_NETWORK && typeof data.MOBILE_NETWORK === 'object') {
      console.log('📋 MOBILE_NETWORK keys:', Object.keys(data.MOBILE_NETWORK));
      
      // Try to find Smile plans under various possible keys
      const possibleKeys = [
        'SMILE-DIRECT', 'smile-direct', 'SMILE', 'smile',
        'Smile', 'smile_direct', 'SMILEDIRECT'
      ];
      
      for (const key of possibleKeys) {
        if (data.MOBILE_NETWORK[key] && Array.isArray(data.MOBILE_NETWORK[key])) {
          smilePlans = data.MOBILE_NETWORK[key];
          console.log(`✅ Found Smile plans under key: ${key}`);
          break;
        }
      }
      
      // If not found, check all keys in MOBILE_NETWORK
      if (smilePlans.length === 0) {
        for (const key in data.MOBILE_NETWORK) {
          if (Array.isArray(data.MOBILE_NETWORK[key]) && 
              key.toLowerCase().includes('smile')) {
            smilePlans = data.MOBILE_NETWORK[key];
            console.log(`✅ Found Smile plans under key: ${key}`);
            break;
          }
        }
      }
    }

    if (smilePlans.length === 0) {
      console.error('❌ No Smile plans found in ClubKonnect response');
      console.log('Available structure:', JSON.stringify(data, null, 2));
      throw new Error('No Smile plans available from provider');
    }

    console.log(`📊 Found ${smilePlans.length} raw Smile plans`);

    // Transform plans to our format
    const formattedPlans = smilePlans.map(plan => {
      const planId = plan.dataplan_id || plan.plan_id || plan.id;
      const planName = plan.plan || plan.plan_name || plan.name || 'Unknown Plan';
      const planAmount = parseFloat(plan.plan_amount || plan.amount || 0);
      const validity = plan.validity || plan.month_validate || plan.plan_validity || '30 days';

      // Extract data size from plan name (e.g., "1GB", "6.5GB")
      const dataMatch = planName.match(/(\d+\.?\d*)\s*(GB|MB)/i);
      const dataSize = dataMatch ? dataMatch[0] : 'Unknown';

      // Determine category based on validity
      let category = 'monthly';
      if (validity.toLowerCase().includes('day')) {
        const days = parseInt(validity);
        if (days <= 1) category = 'daily';
        else if (days <= 7) category = 'weekly';
      } else if (validity.toLowerCase().includes('week')) {
        category = 'weekly';
      }

      return {
        id: planId,
        name: planName,
        dataSize: dataSize,
        speed: '10-20Mbps', // Default speed (not provided by API)
        validity: validity,
        amount: planAmount,
        category: category,
        popular: planAmount >= 2000 && planAmount <= 10000 // Mark mid-range plans as popular
      };
    });

    // Update cache
    plansCache = formattedPlans;
    cacheTimestamp = now;

    console.log(`✅ Fetched ${formattedPlans.length} Smile plans from ClubKonnect`);
    return formattedPlans;

  } catch (error) {
    console.error('❌ Error fetching Smile plans from ClubKonnect:', error.message);
    
    // Return fallback plans if fetch fails
    if (plansCache) {
      console.log('⚠️  Returning cached plans due to fetch error');
      return plansCache;
    }
    
    throw error;
  }
}

// Internet service providers configuration (static info only)
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
    limits: {
      min: 500,
      max: 150000
    },
    processingTime: '5-10 minutes',
    successRate: 92
  }
};

// Clear cache periodically (every hour)
setInterval(() => {
  if (plansCache && cacheTimestamp) {
    const age = Date.now() - cacheTimestamp;
    if (age > CACHE_DURATION) {
      console.log('🔄 Auto-clearing stale plans cache');
      plansCache = null;
      cacheTimestamp = null;
    }
  }
}, CACHE_DURATION);

// Set caching headers helper
const setCacheHeaders = (res, maxAge = 3600) => {
  res.set({
    'Cache-Control': `public, max-age=${maxAge}`,
    'Last-Modified': new Date().toUTCString()
  });
};

// GET /api/internet/providers - Get all internet providers
router.get('/providers', authenticate, async (req, res) => {
  try {
    setCacheHeaders(res, 7200); // Cache for 2 hours

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

// GET /api/internet/provider/:code - Get specific provider details
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
      planCategories: ['daily', 'weekly', 'monthly']
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

// GET /api/internet/provider/:code/plans - Get internet plans (DYNAMIC from ClubKonnect)
router.get('/provider/:code/plans', authenticate, async (req, res) => {
  try {
    const { code } = req.params;
    const { category, popular } = req.query;

    console.log('🎯 Plans route hit for provider:', code);

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

    // 🔥 FETCH PLANS DYNAMICALLY FROM CLUBKONNECT
    const plans = await fetchSmilePlansFromClubKonnect();

    setCacheHeaders(res, 1800); // Cache for 30 minutes

    let filteredPlans = [...plans];

    // Apply filters
    if (category) {
      const validCategories = ['daily', 'weekly', 'monthly'];
      if (!validCategories.includes(category)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid category. Valid categories are: daily, weekly, monthly',
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
      monthly: filteredPlans.filter(p => p.category === 'monthly')
    };

    console.log(`✅ Returning ${filteredPlans.length} plans to client`);

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
          monthly: plansByCategory.monthly.length
        },
        priceRange: filteredPlans.length > 0 ? {
          min: Math.min(...filteredPlans.map(p => p.amount)),
          max: Math.max(...filteredPlans.map(p => p.amount))
        } : { min: 0, max: 0 }
      },
      dataSource: 'clubkonnect',
      cacheAge: cacheTimestamp ? Math.floor((Date.now() - cacheTimestamp) / 1000) : 0
    });

  } catch (error) {
    console.error('Error fetching internet plans:', error);
    res.status(500).json({
      success: false,
      message: 'Server error retrieving internet plans',
      error_code: 'PLANS_FETCH_FAILED',
      error: error.message
    });
  }
});

// POST /api/internet/validate-account - Validate customer account
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

    // Validate with ClubKonnect
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
      
      // Return soft validation
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

// GET /api/internet/refresh-plans - Force refresh plans cache
router.get('/refresh-plans', authenticate, async (req, res) => {
  try {
    // Clear cache
    plansCache = null;
    cacheTimestamp = null;

    // Fetch fresh plans
    const plans = await fetchSmilePlansFromClubKonnect();

    res.json({
      success: true,
      message: 'Plans cache refreshed successfully',
      plansCount: plans.length,
      plans: plans
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