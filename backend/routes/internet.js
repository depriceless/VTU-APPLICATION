// routes/internet.js - Internet Service Provider API (CORRECTED VERSION)
const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');

// Internet service providers configuration
const INTERNET_CONFIG = {
  spectranet: {
    name: 'Spectranet',
    code: 'spectranet',
    status: 'active',
    color: '#FF6600',
    logo: '/images/providers/spectranet.png',
    description: '4G LTE Wireless Broadband Internet',
    serviceType: 'wireless',
    coverage: ['Lagos', 'Abuja', 'Port Harcourt', 'Ibadan', 'Kano'],
    customerService: '0700-773-2872',
    website: 'https://spectranet.com.ng',
    connectionTypes: ['4G LTE', 'Fixed Wireless'],
    limits: {
      min: 1000,
      max: 200000
    },
    processingTime: '5-15 minutes',
    successRate: 94,
    plans: [
      { id: 'daily_500mb', name: 'Daily 500MB', data: '500MB', validity: '1 Day', amount: 300, category: 'daily', popular: false },
      { id: 'weekly_2gb', name: 'Weekly 2GB', data: '2GB', validity: '7 Days', amount: 1000, category: 'weekly', popular: true },
      { id: 'monthly_10gb', name: 'Monthly 10GB', data: '10GB', validity: '30 Days', amount: 3500, category: 'monthly', popular: true },
      { id: 'monthly_25gb', name: 'Monthly 25GB', data: '25GB', validity: '30 Days', amount: 7500, category: 'monthly', popular: true },
      { id: 'monthly_50gb', name: 'Monthly 50GB', data: '50GB', validity: '30 Days', amount: 12000, category: 'monthly', popular: false },
      { id: 'monthly_unlimited', name: 'Unlimited Fair Usage', data: 'Unlimited', validity: '30 Days', amount: 19500, category: 'monthly', popular: false }
    ],
    lastUpdated: new Date('2024-01-01')
  },
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
    successRate: 92,
    plans: [
      { id: 'smallie_1gb', name: 'Smallie 1GB', data: '1GB', validity: '7 Days', amount: 500, category: 'weekly', popular: true },
      { id: 'bigga_6gb', name: 'Bigga 6GB', data: '6GB', validity: '30 Days', amount: 2000, category: 'monthly', popular: true },
      { id: 'mega_15gb', name: 'Mega 15GB', data: '15GB', validity: '30 Days', amount: 4000, category: 'monthly', popular: true },
      { id: 'giga_30gb', name: 'Giga 30GB', data: '30GB', validity: '30 Days', amount: 7000, category: 'monthly', popular: false },
      { id: 'jumbo_75gb', name: 'Jumbo 75GB', data: '75GB', validity: '30 Days', amount: 15000, category: 'monthly', popular: false },
      { id: 'unlimited_weekends', name: 'Unlimited Weekends', data: 'Unlimited', validity: '30 Days', amount: 12500, category: 'monthly', popular: false }
    ],
    lastUpdated: new Date('2024-01-01')
  },
  swift: {
    name: 'Swift Networks',
    code: 'swift',
    status: 'active',
    color: '#0066CC',
    logo: '/images/providers/swift.png',
    description: 'Fiber Optic and Wireless Internet',
    serviceType: 'fiber',
    coverage: ['Lagos', 'Abuja', 'Port Harcourt', 'Ibadan'],
    customerService: '0700-7934-3859',
    website: 'https://swiftng.com',
    connectionTypes: ['Fiber Optic', '4G LTE'],
    limits: {
      min: 2000,
      max: 250000
    },
    processingTime: '10-20 minutes',
    successRate: 89,
    plans: [
      { id: 'starter_5gb', name: 'Starter 5GB', data: '5GB', validity: '30 Days', amount: 2000, category: 'monthly', popular: true },
      { id: 'basic_15gb', name: 'Basic 15GB', data: '15GB', validity: '30 Days', amount: 5000, category: 'monthly', popular: true },
      { id: 'standard_35gb', name: 'Standard 35GB', data: '35GB', validity: '30 Days', amount: 10000, category: 'monthly', popular: true },
      { id: 'premium_75gb', name: 'Premium 75GB', data: '75GB', validity: '30 Days', amount: 18000, category: 'monthly', popular: false },
      { id: 'business_150gb', name: 'Business 150GB', data: '150GB', validity: '30 Days', amount: 35000, category: 'monthly', popular: false },
      { id: 'unlimited_fiber', name: 'Unlimited Fiber', data: 'Unlimited', validity: '30 Days', amount: 45000, category: 'monthly', popular: false }
    ],
    lastUpdated: new Date('2024-01-01')
  },
  ipnx: {
    name: 'IPNX Nigeria',
    code: 'ipnx',
    status: 'active',
    color: '#CC0000',
    logo: '/images/providers/ipnx.png',
    description: 'Enterprise and Residential Internet',
    serviceType: 'fiber',
    coverage: ['Lagos', 'Abuja', 'Port Harcourt'],
    customerService: '01-448-0000',
    website: 'https://ipnxnigeria.net',
    connectionTypes: ['Fiber Optic', 'Dedicated Line'],
    limits: {
      min: 3000,
      max: 300000
    },
    processingTime: '15-30 minutes',
    successRate: 91,
    plans: [
      { id: 'home_10gb', name: 'Home 10GB', data: '10GB', validity: '30 Days', amount: 3000, category: 'monthly', popular: true },
      { id: 'home_25gb', name: 'Home 25GB', data: '25GB', validity: '30 Days', amount: 6500, category: 'monthly', popular: true },
      { id: 'home_50gb', name: 'Home 50GB', data: '50GB', validity: '30 Days', amount: 12000, category: 'monthly', popular: false },
      { id: 'business_100gb', name: 'Business 100GB', data: '100GB', validity: '30 Days', amount: 25000, category: 'monthly', popular: false },
      { id: 'enterprise_250gb', name: 'Enterprise 250GB', data: '250GB', validity: '30 Days', amount: 55000, category: 'monthly', popular: false },
      { id: 'dedicated_unlimited', name: 'Dedicated Unlimited', data: 'Unlimited', validity: '30 Days', amount: 150000, category: 'monthly', popular: false }
    ],
    lastUpdated: new Date('2024-01-01')
  },
  coollink: {
    name: 'CoolLink Communications',
    code: 'coollink',
    status: 'active',
    color: '#009999',
    logo: '/images/providers/coollink.png',
    description: 'Affordable Internet Solutions',
    serviceType: 'wireless',
    coverage: ['Lagos', 'Ogun', 'Oyo'],
    customerService: '0803-000-2665',
    website: 'https://coollink.ng',
    connectionTypes: ['4G LTE', 'Fixed Wireless'],
    limits: {
      min: 800,
      max: 100000
    },
    processingTime: '10-15 minutes',
    successRate: 87,
    plans: [
      { id: 'lite_2gb', name: 'Lite 2GB', data: '2GB', validity: '30 Days', amount: 800, category: 'monthly', popular: true },
      { id: 'standard_8gb', name: 'Standard 8GB', data: '8GB', validity: '30 Days', amount: 2500, category: 'monthly', popular: true },
      { id: 'premium_20gb', name: 'Premium 20GB', data: '20GB', validity: '30 Days', amount: 5500, category: 'monthly', popular: true },
      { id: 'max_50gb', name: 'Max 50GB', data: '50GB', validity: '30 Days', amount: 12000, category: 'monthly', popular: false },
      { id: 'ultra_100gb', name: 'Ultra 100GB', data: '100GB', validity: '30 Days', amount: 22000, category: 'monthly', popular: false }
    ],
    lastUpdated: new Date('2024-01-01')
  }
};

// Set caching headers helper
const setCacheHeaders = (res, maxAge = 3600) => {
  const lastModified = Math.max(...Object.values(INTERNET_CONFIG).map(p => p.lastUpdated.getTime()));
  res.set({
    'Cache-Control': `public, max-age=${maxAge}`,
    'Last-Modified': new Date(lastModified).toUTCString()
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
        website: provider.website,
        totalPlans: provider.plans.length,
        popularPlans: provider.plans.filter(p => p.popular).length
      }));

    res.json({
      success: true,
      message: 'Internet providers retrieved',
      providers,
      count: providers.length,
      serviceTypes: ['wireless', 'fiber'],
      supportedServices: ['data_subscription', 'plan_upgrade', 'account_validation'],
      lastModified: new Date(Math.max(...Object.values(INTERNET_CONFIG).map(p => p.lastUpdated.getTime())))
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

    // Validate provider code
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
        website: provider.website,
        lastUpdated: provider.lastUpdated
      },
      planCategories: ['daily', 'weekly', 'monthly'],
      totalPlans: provider.plans.length
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

// GET /api/internet/provider/:code/plans - Get internet plans for provider
router.get('/provider/:code/plans', authenticate, async (req, res) => {
  try {
    const { code } = req.params;
    const { category, popular } = req.query;

    // Validate provider code
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

    let plans = [...provider.plans]; // Create a copy to avoid mutating original

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
      plans = plans.filter(plan => plan.category === category);
    }

    if (popular !== undefined) {
      const isPopular = popular === 'true';
      plans = plans.filter(plan => plan.popular === isPopular);
    }

    // Group plans by category
    const plansByCategory = {
      daily: plans.filter(p => p.category === 'daily'),
      weekly: plans.filter(p => p.category === 'weekly'),
      monthly: plans.filter(p => p.category === 'monthly')
    };

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
      plans,
      plansByCategory,
      statistics: {
        total: plans.length,
        popular: plans.filter(p => p.popular).length,
        categories: {
          daily: plansByCategory.daily.length,
          weekly: plansByCategory.weekly.length,
          monthly: plansByCategory.monthly.length
        },
        priceRange: plans.length > 0 ? {
          min: Math.min(...plans.map(p => p.amount)),
          max: Math.max(...plans.map(p => p.amount))
        } : { min: 0, max: 0 }
      },
      lastModified: provider.lastUpdated
    });

  } catch (error) {
    console.error('Error fetching internet plans:', error);
    res.status(500).json({
      success: false,
      message: 'Server error retrieving internet plans',
      error_code: 'PLANS_FETCH_FAILED'
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

    const providerConfig = INTERNET_CONFIG[provider.toLowerCase()];
    if (!providerConfig) {
      return res.status(400).json({
        success: false,
        message: 'Invalid internet provider',
        error_code: 'INVALID_PROVIDER'
      });
    }

    // Validate customer number format (basic validation)
    if (!/^\d{8,15}$/.test(customerNumber)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid customer number format. Must be 8-15 digits.',
        error_code: 'INVALID_CUSTOMER_NUMBER'
      });
    }

    // Simulate account validation
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const isValid = Math.random() > 0.12; // 88% validation success rate

    if (isValid) {
      // Mock customer data
      const customerData = {
        name: 'Sample Customer',
        customerNumber,
        accountType: 'Residential',
        currentPlan: providerConfig.plans[Math.floor(Math.random() * providerConfig.plans.length)].name,
        status: 'Active',
        lastPayment: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000), // 20 days ago
        dataBalance: `${Math.floor(Math.random() * 50) + 1}GB remaining`,
        expiryDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000) // 10 days from now
      };

      res.json({
        success: true,
        message: 'Account validation successful',
        customerNumber,
        provider: providerConfig.name,
        customerData,
        isValid: true
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Invalid customer number or account not found',
        customerNumber,
        provider: providerConfig.name,
        isValid: false,
        error_code: 'ACCOUNT_NOT_FOUND'
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

// GET /api/internet/plans/search - Search internet plans across providers
router.get('/plans/search', authenticate, async (req, res) => {
  try {
    const { 
      provider, 
      minAmount, 
      maxAmount, 
      category, 
      popular,
      serviceType
    } = req.query;

    setCacheHeaders(res, 1800); // Cache for 30 minutes

    let allPlans = [];

    // Collect plans from all providers or specific provider
    const providers = provider ? [provider.toLowerCase()] : Object.keys(INTERNET_CONFIG);
    
    providers.forEach(providerCode => {
      const providerConfig = INTERNET_CONFIG[providerCode];
      if (providerConfig && providerConfig.status === 'active') {
        const providerPlans = providerConfig.plans.map(plan => ({
          ...plan,
          provider: {
            code: providerCode,
            name: providerConfig.name,
            serviceType: providerConfig.serviceType,
            color: providerConfig.color
          }
        }));
        allPlans = allPlans.concat(providerPlans);
      }
    });

    // Apply filters
    if (minAmount) {
      const min = parseInt(minAmount);
      if (!isNaN(min)) {
        allPlans = allPlans.filter(plan => plan.amount >= min);
      }
    }

    if (maxAmount) {
      const max = parseInt(maxAmount);
      if (!isNaN(max)) {
        allPlans = allPlans.filter(plan => plan.amount <= max);
      }
    }

    if (category) {
      allPlans = allPlans.filter(plan => plan.category === category);
    }

    if (popular !== undefined) {
      const isPopular = popular === 'true';
      allPlans = allPlans.filter(plan => plan.popular === isPopular);
    }

    if (serviceType) {
      allPlans = allPlans.filter(plan => plan.provider.serviceType === serviceType);
    }

    // Sort by price (ascending)
    allPlans.sort((a, b) => a.amount - b.amount);

    res.json({
      success: true,
      message: 'Internet plans search results',
      plans: allPlans,
      filters: {
        provider,
        minAmount: minAmount ? parseInt(minAmount) : null,
        maxAmount: maxAmount ? parseInt(maxAmount) : null,
        category,
        popular: popular ? popular === 'true' : null,
        serviceType
      },
      count: allPlans.length,
      providers: [...new Set(allPlans.map(p => p.provider.name))]
    });

  } catch (error) {
    console.error('Internet plans search error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error searching internet plans',
      error_code: 'SEARCH_FAILED'
    });
  }
});

// GET /api/internet/history - Get internet subscription history
router.get('/history', authenticate, async (req, res) => {
  try {
    const { provider, limit = 20, page = 1 } = req.query;
    
    const Transaction = require('../models/Transaction');

    // Build query for internet transactions
    const query = {
      userId: req.user.userId,
      $or: [
        { description: { $regex: /internet/i } },
        { reference: { $regex: /^NET_/i } }
      ]
    };

    if (provider) {
      query.description = { $regex: new RegExp(`internet.*${provider}`, 'i') };
    }

    const limitInt = Math.min(parseInt(limit) || 20, 100); // Max 100 records
    const pageInt = parseInt(page) || 1;
    const skip = (pageInt - 1) * limitInt;
    
    const transactions = await Transaction.find(query)
      .sort({ createdAt: -1 })
      .limit(limitInt)
      .skip(skip);

    const totalTransactions = await Transaction.countDocuments(query);

    const formattedTransactions = transactions.map(tx => {
      const providerMatch = tx.description.match(/Internet - (\w+) (.+) - (\d+)/);
      
      return {
        _id: tx._id,
        reference: tx.reference,
        provider: providerMatch ? providerMatch[1] : 'UNKNOWN',
        plan: providerMatch ? providerMatch[2] : 'Unknown Plan',
        customerNumber: providerMatch ? providerMatch[3] : 'Unknown',
        amount: tx.amount,
        status: tx.status,
        createdAt: tx.createdAt,
        balanceAfter: tx.newBalance
      };
    });

    res.json({
      success: true,
      message: 'Internet subscription history retrieved',
      transactions: formattedTransactions,
      pagination: {
        page: pageInt,
        limit: limitInt,
        total: totalTransactions,
        pages: Math.ceil(totalTransactions / limitInt)
      },
      statistics: {
        totalSpent: formattedTransactions.reduce((sum, tx) => sum + tx.amount, 0),
        successfulTransactions: formattedTransactions.filter(tx => tx.status === 'completed').length,
        failedTransactions: formattedTransactions.filter(tx => tx.status === 'failed').length
      }
    });

  } catch (error) {
    console.error('Internet history error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error retrieving internet history',
      error_code: 'HISTORY_FETCH_FAILED'
    });
  }
});

// Export the configuration for use in admin routes
module.exports = router;
module.exports.INTERNET_CONFIG = INTERNET_CONFIG;