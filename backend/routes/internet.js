// routes/internet.js - FIXED: Smile uses static plans (no listing endpoint available)
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

// 🔥 STATIC SMILE PLANS - ClubKonnect doesn't provide a listing endpoint for Smile
// Update these prices periodically by checking ClubKonnect dashboard or contacting support
const SMILE_PLANS = [
  // FlexiDaily Plans
  { id: '533', name: '1GB FlexiDaily', dataSize: '1GB', validity: '1 day', amount: 300, category: 'daily', popular: false },
  { id: '534', name: '2GB FlexiDaily', dataSize: '2GB', validity: '1 day', amount: 500, category: 'daily', popular: true },
  { id: '535', name: '3GB FlexiDaily', dataSize: '3GB', validity: '1 day', amount: 700, category: 'daily', popular: false },
  
  // FlexiWeekly Plans
  { id: '536', name: '2GB FlexiWeekly', dataSize: '2GB', validity: '7 days', amount: 1000, category: 'weekly', popular: false },
  { id: '537', name: '5GB FlexiWeekly', dataSize: '5GB', validity: '7 days', amount: 2000, category: 'weekly', popular: true },
  { id: '538', name: '10GB FlexiWeekly', dataSize: '10GB', validity: '7 days', amount: 3500, category: 'weekly', popular: false },
  
  // FlexiMonthly Plans (most popular)
  { id: '624', name: '1GB Flexi', dataSize: '1GB', validity: '30 days', amount: 1000, category: 'monthly', popular: false },
  { id: '625', name: '2GB Flexi', dataSize: '2GB', validity: '30 days', amount: 1500, category: 'monthly', popular: true },
  { id: '626', name: '3GB Flexi', dataSize: '3GB', validity: '30 days', amount: 2000, category: 'monthly', popular: true },
  { id: '627', name: '5GB Flexi', dataSize: '5GB', validity: '30 days', amount: 2500, category: 'monthly', popular: true },
  { id: '628', name: '10GB Flexi', dataSize: '10GB', validity: '30 days', amount: 4000, category: 'monthly', popular: true },
  { id: '629', name: '15GB Flexi', dataSize: '15GB', validity: '30 days', amount: 5500, category: 'monthly', popular: false },
  { id: '630', name: '20GB Flexi', dataSize: '20GB', validity: '30 days', amount: 7000, category: 'monthly', popular: false },
  { id: '631', name: '25GB Flexi', dataSize: '25GB', validity: '30 days', amount: 8500, category: 'monthly', popular: false },
  { id: '632', name: '30GB Flexi', dataSize: '30GB', validity: '30 days', amount: 10000, category: 'monthly', popular: false },
  { id: '633', name: '50GB Flexi', dataSize: '50GB', validity: '30 days', amount: 15000, category: 'monthly', popular: false },
  { id: '634', name: '75GB Flexi', dataSize: '75GB', validity: '30 days', amount: 20000, category: 'monthly', popular: false },
  { id: '635', name: '100GB Flexi', dataSize: '100GB', validity: '30 days', amount: 25000, category: 'monthly', popular: false },
  
  // Unlimited Plans
  { id: '636', name: 'UnlimitedLite - Day', dataSize: 'Unlimited', validity: '1 day', amount: 1000, category: 'daily', popular: false },
  { id: '637', name: 'UnlimitedLite - Week', dataSize: 'Unlimited', validity: '7 days', amount: 3000, category: 'weekly', popular: false },
  { id: '638', name: 'UnlimitedLite - Month', dataSize: 'Unlimited', validity: '30 days', amount: 10000, category: 'monthly', popular: false },
];

// Add speed information to all plans
const formattedSmilePlans = SMILE_PLANS.map(plan => ({
  ...plan,
  speed: '10-20Mbps',
  description: `Smile ${plan.name} - ${plan.dataSize} valid for ${plan.validity}`
}));

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
    limits: { min: 300, max: 25000 },
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

// GET /api/internet/provider/:code/plans - Returns static Smile plans
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

    setCacheHeaders(res, 1800); // Cache for 30 minutes

    let filteredPlans = [...formattedSmilePlans];

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

    console.log(`✅ Returning ${filteredPlans.length} Smile plans to client`);

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
      dataSource: 'static',
      note: 'Smile plan prices are configured manually. Contact support to update prices.'
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

// GET /api/internet/refresh-plans - Returns fresh copy of static plans
router.get('/refresh-plans', authenticate, async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'Smile plans retrieved (static configuration)',
      plansCount: formattedSmilePlans.length,
      plans: formattedSmilePlans,
      note: 'These are statically configured plans. To update prices, modify SMILE_PLANS in routes/internet.js'
    });

  } catch (error) {
    console.error('Error refreshing plans:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve plans',
      error: error.message
    });
  }
});

module.exports = router;