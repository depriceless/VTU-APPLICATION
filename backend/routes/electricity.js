// routes/electricity.js - Electricity Bills API
const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');

// Electricity providers configuration
const ELECTRICITY_CONFIG = {
  eko: {
    name: 'Eko Electricity Distribution Company (EKEDC)',
    code: 'eko',
    status: 'active',
    color: '#0066CC',
    logo: '/images/providers/eko.png',
    description: 'Lagos (Mainland) Electricity Distribution',
    serviceArea: 'Lagos Mainland, Agege, Mushin',
    customerService: '01-448-8291',
    website: 'https://ekedp.com',
    meterTypes: ['prepaid', 'postpaid'],
    limits: {
      min: 500,
      max: 100000
    },
    processingTime: '5-10 minutes',
    successRate: 92,
    lastUpdated: new Date('2024-01-01')
  },
  ikeja: {
    name: 'Ikeja Electric Distribution Company (IE)',
    code: 'ikeja',
    status: 'active',
    color: '#FF6600',
    logo: '/images/providers/ikeja.png',
    description: 'Lagos (Island) Electricity Distribution',
    serviceArea: 'Lagos Island, Victoria Island, Ikoyi',
    customerService: '01-448-0909',
    website: 'https://ikejaelectric.com',
    meterTypes: ['prepaid', 'postpaid'],
    limits: {
      min: 500,
      max: 100000
    },
    processingTime: '5-10 minutes',
    successRate: 90,
    lastUpdated: new Date('2024-01-01')
  },
  abuja: {
    name: 'Abuja Electricity Distribution Company (AEDC)',
    code: 'abuja',
    status: 'active',
    color: '#009900',
    logo: '/images/providers/abuja.png',
    description: 'Federal Capital Territory Electricity Distribution',
    serviceArea: 'FCT Abuja, Niger, Nasarawa, Kogi',
    customerService: '0700-2238-5233',
    website: 'https://abujaelectricity.com',
    meterTypes: ['prepaid', 'postpaid'],
    limits: {
      min: 500,
      max: 100000
    },
    processingTime: '10-15 minutes',
    successRate: 85,
    lastUpdated: new Date('2024-01-01')
  },
  ibadan: {
    name: 'Ibadan Electricity Distribution Company (IBEDC)',
    code: 'ibadan',
    status: 'active',
    color: '#CC3300',
    logo: '/images/providers/ibadan.png',
    description: 'Oyo, Osun, Ogun, Kwara Electricity Distribution',
    serviceArea: 'Oyo, Osun, Ogun, Kwara States',
    customerService: '0700-4233-3233',
    website: 'https://ibedc.com',
    meterTypes: ['prepaid', 'postpaid'],
    limits: {
      min: 500,
      max: 100000
    },
    processingTime: '10-15 minutes',
    successRate: 88,
    lastUpdated: new Date('2024-01-01')
  },
  kano: {
    name: 'Kano Electricity Distribution Company (KEDCO)',
    code: 'kano',
    status: 'active',
    color: '#990099',
    logo: '/images/providers/kano.png',
    description: 'Kano, Katsina, Jigawa Electricity Distribution',
    serviceArea: 'Kano, Katsina, Jigawa States',
    customerService: '0700-5336-5336',
    website: 'https://kedco.ng',
    meterTypes: ['prepaid', 'postpaid'],
    limits: {
      min: 500,
      max: 100000
    },
    processingTime: '10-20 minutes',
    successRate: 82,
    lastUpdated: new Date('2024-01-01')
  },
  portharcourt: {
    name: 'Port Harcourt Electricity Distribution Company (PHED)',
    code: 'portharcourt',
    status: 'active',
    color: '#FF3300',
    logo: '/images/providers/portharcourt.png',
    description: 'Rivers, Bayelsa, Cross River, Akwa Ibom Electricity',
    serviceArea: 'Rivers, Bayelsa, Cross River, Akwa Ibom',
    customerService: '0813-8010-840',
    website: 'https://phed.org',
    meterTypes: ['prepaid', 'postpaid'],
    limits: {
      min: 500,
      max: 100000
    },
    processingTime: '15-25 minutes',
    successRate: 80,
    lastUpdated: new Date('2024-01-01')
  },
  enugu: {
    name: 'Enugu Electricity Distribution Company (EEDC)',
    code: 'enugu',
    status: 'active',
    color: '#006600',
    logo: '/images/providers/enugu.png',
    description: 'Enugu, Anambra, Abia, Imo, Ebonyi Electricity',
    serviceArea: 'Enugu, Anambra, Abia, Imo, Ebonyi',
    customerService: '0708-0606-0606',
    website: 'https://eedc.ng',
    meterTypes: ['prepaid', 'postpaid'],
    limits: {
      min: 500,
      max: 100000
    },
    processingTime: '10-15 minutes',
    successRate: 87,
    lastUpdated: new Date('2024-01-01')
  }
};

// Set caching headers
const setCacheHeaders = (res, maxAge = 3600) => {
  const lastModified = Math.max(...Object.values(ELECTRICITY_CONFIG).map(p => p.lastUpdated.getTime()));
  res.set({
    'Cache-Control': `public, max-age=${maxAge}`,
    'Last-Modified': new Date(lastModified).toUTCString()
  });
};

// GET /api/electricity/providers - Get all electricity providers
router.get('/providers', authenticate, async (req, res) => {
  try {
    setCacheHeaders(res, 7200); // Cache for 2 hours

    const providers = Object.values(ELECTRICITY_CONFIG)
      .filter(provider => provider.status === 'active')
      .map(provider => ({
        code: provider.code,
        name: provider.name,
        description: provider.description,
        serviceArea: provider.serviceArea,
        color: provider.color,
        logo: provider.logo,
        meterTypes: provider.meterTypes,
        limits: provider.limits,
        processingTime: provider.processingTime,
        successRate: provider.successRate,
        customerService: provider.customerService,
        website: provider.website
      }));

    res.json({
      success: true,
      message: 'Electricity providers retrieved',
      providers,
      count: providers.length,
      supportedServices: ['prepaid_bill_payment', 'postpaid_bill_payment', 'meter_validation'],
      lastModified: new Date(Math.max(...Object.values(ELECTRICITY_CONFIG).map(p => p.lastUpdated.getTime())))
    });

  } catch (error) {
    console.error('Error fetching electricity providers:', error);
    res.status(500).json({
      success: false,
      message: 'Server error retrieving electricity providers'
    });
  }
});

// GET /api/electricity/provider/:code - Get specific provider details
router.get('/provider/:code', authenticate, async (req, res) => {
  try {
    const { code } = req.params;
    const provider = ELECTRICITY_CONFIG[code];

    if (!provider) {
      return res.status(404).json({
        success: false,
        message: 'Electricity provider not found'
      });
    }

    if (provider.status !== 'active') {
      return res.status(503).json({
        success: false,
        message: 'Provider service temporarily unavailable'
      });
    }

    setCacheHeaders(res);

    res.json({
      success: true,
      message: `${provider.name} details retrieved`,
      provider: {
        ...provider,
        status: undefined // Don't expose internal status
      }
    });

  } catch (error) {
    console.error('Error fetching provider details:', error);
    res.status(500).json({
      success: false,
      message: 'Server error retrieving provider details'
    });
  }
});

// GET /api/electricity/provider/:code/plans - Get tariff plans for provider
router.get('/provider/:code/plans', authenticate, async (req, res) => {
  try {
    const { code } = req.params;
    const provider = ELECTRICITY_CONFIG[code];

    if (!provider) {
      return res.status(404).json({
        success: false,
        message: 'Electricity provider not found'
      });
    }

    setCacheHeaders(res);

    // Mock tariff plans - in production, these would come from the provider's API
    const tariffPlans = [
      {
        id: 'residential_r1',
        name: 'Residential R1',
        category: 'residential',
        description: 'Standard residential tariff for single-phase connections',
        rate: 65.50, // per kWh
        meterTypes: ['prepaid', 'postpaid'],
        minimumCharge: 1500,
        popular: true
      },
      {
        id: 'residential_r2',
        name: 'Residential R2',
        category: 'residential',
        description: 'Residential tariff for three-phase connections',
        rate: 68.20,
        meterTypes: ['prepaid', 'postpaid'],
        minimumCharge: 2000,
        popular: false
      },
      {
        id: 'commercial_c1',
        name: 'Commercial C1',
        category: 'commercial',
        description: 'Small commercial establishments',
        rate: 75.30,
        meterTypes: ['prepaid', 'postpaid'],
        minimumCharge: 3000,
        popular: true
      },
      {
        id: 'commercial_c2',
        name: 'Commercial C2',
        category: 'commercial',
        description: 'Medium commercial establishments',
        rate: 78.50,
        meterTypes: ['prepaid', 'postpaid'],
        minimumCharge: 5000,
        popular: false
      },
      {
        id: 'industrial_i1',
        name: 'Industrial I1',
        category: 'industrial',
        description: 'Light industrial customers',
        rate: 82.00,
        meterTypes: ['prepaid', 'postpaid'],
        minimumCharge: 10000,
        popular: false
      }
    ];

    res.json({
      success: true,
      message: `Tariff plans retrieved for ${provider.name}`,
      provider: {
        code: provider.code,
        name: provider.name
      },
      plans: tariffPlans,
      count: tariffPlans.length,
      categories: ['residential', 'commercial', 'industrial']
    });

  } catch (error) {
    console.error('Error fetching tariff plans:', error);
    res.status(500).json({
      success: false,
      message: 'Server error retrieving tariff plans'
    });
  }
});

// POST /api/electricity/validate-meter - Validate meter number
router.post('/validate-meter', authenticate, async (req, res) => {
  try {
    const { meterNumber, provider, meterType } = req.body;

    if (!meterNumber || !provider || !meterType) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: meterNumber, provider, meterType'
      });
    }

    const providerConfig = ELECTRICITY_CONFIG[provider];
    if (!providerConfig) {
      return res.status(400).json({
        success: false,
        message: 'Invalid electricity provider'
      });
    }

    if (!providerConfig.meterTypes.includes(meterType)) {
      return res.status(400).json({
        success: false,
        message: `Invalid meter type for ${providerConfig.name}`
      });
    }

    // Validate meter number format (basic validation)
    if (!/^\d{10,12}$/.test(meterNumber)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid meter number format. Must be 10-12 digits.'
      });
    }

    // Simulate meter validation (in production, call provider's API)
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const isValid = Math.random() > 0.15; // 85% validation success rate

    if (isValid) {
      // Mock customer data
      const customerData = {
        name: 'John Doe Customer',
        address: '123 Sample Street, Lagos',
        meterType: meterType,
        tariffClass: 'Residential R1',
        lastPayment: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), // 15 days ago
        outstandingBalance: meterType === 'postpaid' ? Math.floor(Math.random() * 5000) : 0
      };

      res.json({
        success: true,
        message: 'Meter validation successful',
        meterNumber,
        provider: providerConfig.name,
        meterType,
        customerData,
        isValid: true
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Invalid meter number or meter not found',
        meterNumber,
        provider: providerConfig.name,
        isValid: false
      });
    }

  } catch (error) {
    console.error('Meter validation error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error validating meter number'
    });
  }
});

// GET /api/electricity/history - Get electricity payment history
router.get('/history', authenticate, async (req, res) => {
  try {
    const { provider, limit = 20, page = 1 } = req.query;
    
    const Transaction = require('../models/Transaction');

    // Build query for electricity transactions
    const query = {
      userId: req.user.userId,
      $or: [
        { description: { $regex: /electricity/i } },
        { reference: { $regex: /^ELEC_/i } }
      ]
    };

    if (provider) {
      query.description = { $regex: new RegExp(`electricity.*${provider}`, 'i') };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const transactions = await Transaction.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    const totalTransactions = await Transaction.countDocuments(query);

    const formattedTransactions = transactions.map(tx => {
      const providerMatch = tx.description.match(/Electricity - (\w+) (prepaid|postpaid) - (\d+)/);
      
      return {
        _id: tx._id,
        reference: tx.reference,
        provider: providerMatch ? providerMatch[1] : 'UNKNOWN',
        meterType: providerMatch ? providerMatch[2] : 'unknown',
        meterNumber: providerMatch ? providerMatch[3] : 'Unknown',
        amount: tx.amount,
        status: tx.status,
        createdAt: tx.createdAt,
        balanceAfter: tx.newBalance,
        token: tx.metadata?.token || null // For prepaid transactions
      };
    });

    res.json({
      success: true,
      message: 'Electricity payment history retrieved',
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
    console.error('Electricity history error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error retrieving electricity history'
    });
  }
});

module.exports = router;