// routes/internet.js - FIXED: Using Official ClubKonnect Plan IDs
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

// ✅ CORRECTED SMILE PLANS - Using Official ClubKonnect Plan IDs & Prices
// Source: https://www.nellobytesystems.com/APISmilePackagesV2.asp
const SMILE_PLANS = [
  // FlexiDaily Plans
  { id: '624', name: '1GB FlexiDaily', dataSize: '1GB', validity: '1 day', amount: 450, category: 'daily', popular: false },
  { id: '625', name: '2.5GB FlexiDaily', dataSize: '2.5GB', validity: '2 days', amount: 750, category: 'daily', popular: true },
  
  // FlexiWeekly Plans
  { id: '626', name: '1GB FlexiWeekly', dataSize: '1GB', validity: '7 days', amount: 750, category: 'weekly', popular: false },
  { id: '627', name: '2GB FlexiWeekly', dataSize: '2GB', validity: '7 days', amount: 1550, category: 'weekly', popular: true },
  { id: '628', name: '6GB FlexiWeekly', dataSize: '6GB', validity: '7 days', amount: 2300, category: 'weekly', popular: false },
  
  // Bigga Plans (30 days validity) - Most Popular
  { id: '606', name: '1.5GB Bigga', dataSize: '1.5GB', validity: '30 days', amount: 1550, category: 'monthly', popular: false },
  { id: '607', name: '2GB Bigga', dataSize: '2GB', validity: '30 days', amount: 1850, category: 'monthly', popular: true },
  { id: '608', name: '3GB Bigga', dataSize: '3GB', validity: '30 days', amount: 2300, category: 'monthly', popular: true },
  { id: '620', name: '5GB Bigga', dataSize: '5GB', validity: '30 days', amount: 3100, category: 'monthly', popular: true },
  { id: '609', name: '6.5GB Bigga', dataSize: '6.5GB', validity: '30 days', amount: 3800, category: 'monthly', popular: false },
  { id: '722', name: '10GB Bigga', dataSize: '10GB', validity: '30 days', amount: 4600, category: 'monthly', popular: true },
  { id: '723', name: '15GB Bigga', dataSize: '15GB', validity: '30 days', amount: 6200, category: 'monthly', popular: false },
  { id: '724', name: '20GB Bigga', dataSize: '20GB', validity: '30 days', amount: 8000, category: 'monthly', popular: false },
  { id: '725', name: '25GB Bigga', dataSize: '25GB', validity: '30 days', amount: 9500, category: 'monthly', popular: false },
  { id: '615', name: '30GB Bigga', dataSize: '30GB', validity: '30 days', amount: 12500, category: 'monthly', popular: false },
  { id: '616', name: '40GB Bigga', dataSize: '40GB', validity: '30 days', amount: 15500, category: 'monthly', popular: false },
  { id: '617', name: '60GB Bigga', dataSize: '60GB', validity: '30 days', amount: 21000, category: 'monthly', popular: false },
  { id: '618', name: '75GB Bigga', dataSize: '75GB', validity: '30 days', amount: 23000, category: 'monthly', popular: false },
  { id: '619', name: '100GB Bigga', dataSize: '100GB', validity: '30 days', amount: 27500, category: 'monthly', popular: false },
  { id: '668', name: '130GB Bigga', dataSize: '130GB', validity: '30 days', amount: 30500, category: 'monthly', popular: false },
  
  // Unlimited Plans
  { id: '730', name: 'UnlimitedLite', dataSize: 'Unlimited', validity: '30 days', amount: 18500, category: 'monthly', popular: false },
  { id: '729', name: 'UnlimitedEssential', dataSize: 'Unlimited', validity: '30 days', amount: 27700, category: 'monthly', popular: false },
  
  // Freedom Plans (High Speed)
  { id: '726', name: 'Freedom 3Mbps', dataSize: 'Unlimited', validity: '30 days', amount: 38500, category: 'monthly', popular: false },
  { id: '727', name: 'Freedom 6Mbps', dataSize: 'Unlimited', validity: '30 days', amount: 46500, category: 'monthly', popular: false },
  { id: '728', name: 'Freedom BestEffort', dataSize: 'Unlimited', validity: '30 days', amount: 61500, category: 'monthly', popular: false },
  
  // Jumbo Plans (Long validity)
  { id: '665', name: '90GB Jumbo', dataSize: '90GB', validity: '60 days', amount: 31000, category: 'jumbo', popular: false },
  { id: '666', name: '160GB Jumbo', dataSize: '160GB', validity: '90 days', amount: 53000, category: 'jumbo', popular: false },
  { id: '667', name: '200GB Jumbo', dataSize: '200GB', validity: '120 days', amount: 62000, category: 'jumbo', popular: false },
  { id: '721', name: '400GB Jumbo', dataSize: '400GB', validity: '180 days', amount: 77000, category: 'jumbo', popular: false },
  
  // 365 Plans (Annual)
  { id: '687', name: '15GB Annual', dataSize: '15GB', validity: '365 days', amount: 14000, category: 'annual', popular: false },
  { id: '688', name: '35GB Annual', dataSize: '35GB', validity: '365 days', amount: 29000, category: 'annual', popular: false },
  { id: '689', name: '70GB Annual', dataSize: '70GB', validity: '365 days', amount: 49500, category: 'annual', popular: false },
  { id: '664', name: '125GB Annual', dataSize: '125GB', validity: '365 days', amount: 77000, category: 'annual', popular: false },
  { id: '604', name: '200GB Annual', dataSize: '200GB', validity: '365 days', amount: 107000, category: 'annual', popular: false },
  { id: '673', name: '500GB Annual', dataSize: '500GB', validity: '365 days', amount: 154000, category: 'annual', popular: false },
  { id: '674', name: '1TB Annual', dataSize: '1TB', validity: '365 days', amount: 185000, category: 'annual', popular: false },
  
  // SmileVoice Plans
  { id: '747', name: 'SmileVoice 65min', dataSize: '65 minutes', validity: '30 days', amount: 900, category: 'voice', popular: false },
  { id: '748', name: 'SmileVoice 135min', dataSize: '135 minutes', validity: '30 days', amount: 1850, category: 'voice', popular: false },
  { id: '749', name: 'SmileVoice 430min', dataSize: '430 minutes', validity: '30 days', amount: 5700, category: 'voice', popular: false },
  { id: '750', name: 'SmileVoice 150min', dataSize: '150 minutes', validity: '60 days', amount: 2700, category: 'voice', popular: false },
  { id: '751', name: 'SmileVoice 450min', dataSize: '450 minutes', validity: '60 days', amount: 7200, category: 'voice', popular: false },
  { id: '752', name: 'SmileVoice 175min', dataSize: '175 minutes', validity: '90 days', amount: 3600, category: 'voice', popular: false },
  { id: '753', name: 'SmileVoice 500min', dataSize: '500 minutes', validity: '90 days', amount: 9000, category: 'voice', popular: false },
  
  // Mobile Plan
  { id: '758', name: 'Freedom Mobile Plan', dataSize: 'Mobile Data', validity: '30 days', amount: 5000, category: 'mobile', popular: false },
];

// Add speed information and descriptions to all plans
const formattedSmilePlans = SMILE_PLANS.map(plan => {
  let speed = '10-20Mbps';
  
  // Adjust speed based on plan type
  if (plan.name.includes('Freedom 3Mbps')) speed = '3Mbps';
  if (plan.name.includes('Freedom 6Mbps')) speed = '6Mbps';
  if (plan.name.includes('Freedom BestEffort')) speed = 'Best Effort';
  if (plan.name.includes('UnlimitedLite')) speed = 'Fair Usage';
  if (plan.name.includes('UnlimitedEssential')) speed = 'Essential Speed';
  
  return {
    ...plan,
    speed,
    description: `Smile ${plan.name} - ${plan.dataSize} valid for ${plan.validity}`
  };
});

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
    limits: { min: 450, max: 185000 }, // Updated to match actual price range
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
      planCategories: ['daily', 'weekly', 'monthly', 'jumbo', 'annual', 'voice', 'mobile']
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
      const validCategories = ['daily', 'weekly', 'monthly', 'jumbo', 'annual', 'voice', 'mobile'];
      if (!validCategories.includes(category)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid category. Valid categories are: daily, weekly, monthly, jumbo, annual, voice, mobile',
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
      jumbo: filteredPlans.filter(p => p.category === 'jumbo'),
      annual: filteredPlans.filter(p => p.category === 'annual'),
      voice: filteredPlans.filter(p => p.category === 'voice'),
      mobile: filteredPlans.filter(p => p.category === 'mobile')
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
          monthly: plansByCategory.monthly.length,
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
      dataSource: 'static_official',
      lastUpdated: '2024-12-07',
      note: 'Official ClubKonnect plan IDs and prices. Synced with APISmilePackagesV2.asp'
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
      message: 'Smile plans retrieved (official ClubKonnect configuration)',
      plansCount: formattedSmilePlans.length,
      plans: formattedSmilePlans,
      note: 'These plans use official ClubKonnect plan IDs from APISmilePackagesV2.asp. Last synced: 2024-12-07'
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