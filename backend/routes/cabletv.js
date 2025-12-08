// routes/cabletv.js - UPDATED VERSION (Fetches from MongoDB like dataplan.js)
const express = require('express');
const router = express.Router();
const axios = require('axios');
const { authenticate } = require('../middleware/auth');
const CableTVPlan = require('../models/CableTVPlan');

// ClubKonnect Configuration (for validation only)
const CK_CONFIG = {
  userId: process.env.CLUBKONNECT_USER_ID,
  apiKey: process.env.CLUBKONNECT_API_KEY,
  baseUrl: process.env.CLUBKONNECT_BASE_URL || 'https://www.nellobytesystems.com'
};

console.log('Cable TV Routes - ClubKonnect Config:', {
  userId: CK_CONFIG.userId ? 'SET' : 'MISSING',
  apiKey: CK_CONFIG.apiKey ? 'SET' : 'MISSING',
  baseUrl: CK_CONFIG.baseUrl
});

// Operator info
const OPERATOR_INFO = {
  dstv: { 
    name: 'DStv', 
    logo: '📺', 
    color: '#FFA500',
    description: 'Digital Satellite Television',
    smartCardLength: 10
  },
  gotv: { 
    name: 'GOtv', 
    logo: '📡', 
    color: '#00A651',
    description: 'Digital Terrestrial Television',
    smartCardLength: 10
  },
  startimes: { 
    name: 'StarTimes', 
    logo: '🛰️', 
    color: '#FF0000',
    description: 'Digital Television Service',
    smartCardLength: 11
  }
};

// Operator mapping for ClubKonnect
const OPERATOR_MAPPING = {
  'dstv': 'dstv',
  'gotv': 'gotv',
  'startime': 'startimes',
  'startimes': 'startimes'
};

// Cache headers helper
const getLastModified = () => {
  return new Date();
};

const setCacheHeaders = (res, maxAge = 3600) => {
  res.set({
    'Cache-Control': `public, max-age=${maxAge}`,
    'Last-Modified': getLastModified().toUTCString()
  });
};

// Helper to add pricing to packages (no markup for Cable TV)
const addPricingToPackages = (packages) => {
  return packages.map(pkg => ({
    id: pkg.packageId,
    packageId: pkg.packageId,
    variation_id: pkg.packageId,
    operator: pkg.operator,
    name: pkg.name,
    amount: pkg.providerCost,  // Customer pays exact ClubKonnect price
    providerCost: pkg.providerCost,
    customerPrice: pkg.providerCost,  // No markup
    profit: 0,  // Zero profit for Cable TV
    duration: pkg.duration,
    description: pkg.description || pkg.name,
    package_name: pkg.name,
    popular: pkg.popular || false,
    active: pkg.active !== false
  }));
};

// Helper function to make ClubKonnect requests (for validation only)
const makeClubKonnectRequest = async (endpoint, params) => {
  try {
    const queryParams = new URLSearchParams({
      UserID: CK_CONFIG.userId,
      APIKey: CK_CONFIG.apiKey,
      ...params
    });
    
    const url = `${CK_CONFIG.baseUrl}${endpoint}?${queryParams}`;
    console.log('ClubKonnect Request:', url.replace(CK_CONFIG.apiKey, '***'));
    
    const response = await axios.get(url, { timeout: 30000 });
    
    let data = response.data;
    if (typeof data === 'string') {
      try {
        data = JSON.parse(data);
      } catch (e) {
        console.error('Failed to parse response:', data);
        throw new Error('Invalid API response format');
      }
    }
    
    console.log('ClubKonnect Response:', data);
    return data;
    
  } catch (error) {
    console.error('ClubKonnect API Error:', error.message);
    throw error;
  }
};

// ========== SMART CARD VALIDATION ENDPOINT ==========
router.post('/validate-smartcard', authenticate, async (req, res) => {
  try {
    const { smartCardNumber, operator } = req.body;
    
    console.log('Validating smart card:', {
      operator,
      smartCardNumber: smartCardNumber ? smartCardNumber.slice(0, 4) + '***' : 'MISSING'
    });

    if (!smartCardNumber) {
      return res.status(400).json({
        success: false,
        message: 'Smart card number is required'
      });
    }

    if (!operator) {
      return res.status(400).json({
        success: false,
        message: 'Operator is required'
      });
    }

    const clubKonnectOperator = OPERATOR_MAPPING[operator.toLowerCase()];
    
    if (!clubKonnectOperator) {
      return res.status(400).json({
        success: false,
        message: 'Unsupported operator'
      });
    }

    const response = await makeClubKonnectRequest('/APIVerifyCableTVV1.0.asp', {
      CableTV: clubKonnectOperator,
      SmartCardNo: smartCardNumber
    });

    console.log('Verification response:', response);

    if (response.customer_name && 
        response.customer_name !== 'INVALID_SMARTCARDNO' &&
        response.customer_name !== 'INVALID_CREDENTIALS' &&
        response.customer_name !== 'MISSING_CREDENTIALS') {
      
      return res.json({
        success: true,
        customerName: response.customer_name,
        message: 'Smart card verified successfully'
      });
    } else {
      return res.json({
        success: false,
        message: 'Invalid smart card number for this operator'
      });
    }

  } catch (error) {
    console.error('Smart card validation error:', error);
    
    return res.status(500).json({
      success: false,
      message: error.message || 'Smart card validation failed'
    });
  }
});

// ========== GET OPERATORS ==========
router.get('/providers', authenticate, async (req, res) => {
  try {
    setCacheHeaders(res, 7200);
    
    const operators = ['dstv', 'gotv', 'startimes'];
    const operatorsWithStats = await Promise.all(
      operators.map(async (operator) => {
        const packages = await CableTVPlan.find({ operator, active: true });
        const packagesWithPricing = addPricingToPackages(packages);
        const popularPackages = packagesWithPricing.filter(p => p.popular);
        
        return {
          code: operator,
          ...OPERATOR_INFO[operator],
          totalPackages: packagesWithPricing.length,
          popularPackages: popularPackages.length,
          priceRange: {
            min: packagesWithPricing.length > 0 ? Math.min(...packagesWithPricing.map(p => p.amount)) : 0,
            max: packagesWithPricing.length > 0 ? Math.max(...packagesWithPricing.map(p => p.amount)) : 0
          }
        };
      })
    );

    res.json({
      success: true,
      message: 'Cable TV providers retrieved',
      providers: operatorsWithStats,
      count: operatorsWithStats.length,
      lastModified: getLastModified()
    });

  } catch (error) {
    console.error('Get providers error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve providers'
    });
  }
});

// ========== GET PACKAGES BY OPERATOR ==========
router.get('/packages/:operator', authenticate, async (req, res) => {
  try {
    const { operator } = req.params;
    const normalizedOperator = operator.toLowerCase();

    const validOperators = ['dstv', 'gotv', 'startimes'];
    if (!validOperators.includes(normalizedOperator)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid operator. Valid operators are: dstv, gotv, startimes'
      });
    }

    setCacheHeaders(res);

    const packages = await CableTVPlan.find({ 
      operator: normalizedOperator, 
      active: true 
    }).sort({ providerCost: 1 });

    if (!packages || packages.length === 0) {
      return res.status(404).json({
        success: false,
        message: `No packages available for ${normalizedOperator.toUpperCase()}`
      });
    }

    const formattedPackages = addPricingToPackages(packages);
    const operatorInfo = OPERATOR_INFO[normalizedOperator];

    res.json({
      success: true,
      message: `Packages retrieved for ${normalizedOperator.toUpperCase()}`,
      operator: normalizedOperator,
      operatorInfo: {
        code: normalizedOperator,
        ...operatorInfo
      },
      data: formattedPackages,
      count: formattedPackages.length,
      lastModified: getLastModified()
    });

  } catch (error) {
    console.error('Get packages error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch cable packages',
      error: error.message
    });
  }
});

// ========== GET POPULAR PACKAGES BY OPERATOR ==========
router.get('/packages/:operator/popular', authenticate, async (req, res) => {
  try {
    const { operator } = req.params;
    const normalizedOperator = operator.toLowerCase();

    const validOperators = ['dstv', 'gotv', 'startimes'];
    if (!validOperators.includes(normalizedOperator)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid operator'
      });
    }

    setCacheHeaders(res);

    const packages = await CableTVPlan.find({ 
      operator: normalizedOperator, 
      active: true,
      popular: true 
    }).sort({ providerCost: 1 });

    const formattedPackages = addPricingToPackages(packages);
    const operatorInfo = OPERATOR_INFO[normalizedOperator];

    res.json({
      success: true,
      message: `Popular packages retrieved for ${normalizedOperator.toUpperCase()}`,
      operator: normalizedOperator,
      operatorInfo: {
        code: normalizedOperator,
        ...operatorInfo
      },
      data: formattedPackages,
      count: formattedPackages.length,
      lastModified: getLastModified()
    });

  } catch (error) {
    console.error('Popular packages error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error retrieving popular packages'
    });
  }
});

// ========== GET SINGLE PACKAGE ==========
router.get('/package/:packageId', authenticate, async (req, res) => {
  try {
    const { packageId } = req.params;

    setCacheHeaders(res);

    const pkg = await CableTVPlan.findOne({ packageId, active: true });

    if (!pkg) {
      return res.status(404).json({
        success: false,
        message: 'Package not found'
      });
    }

    const [formattedPackage] = addPricingToPackages([pkg]);

    // Find similar packages (same operator, similar price)
    const similarPackagesData = await CableTVPlan.find({
      operator: pkg.operator,
      active: true,
      packageId: { $ne: packageId },
      providerCost: { 
        $gte: pkg.providerCost - 1000, 
        $lte: pkg.providerCost + 1000 
      }
    }).limit(3);

    const similarPackages = addPricingToPackages(similarPackagesData);
    const operatorInfo = OPERATOR_INFO[pkg.operator];

    res.json({
      success: true,
      message: 'Package retrieved',
      package: formattedPackage,
      operator: {
        code: pkg.operator,
        ...operatorInfo
      },
      similarPackages,
      lastModified: getLastModified()
    });

  } catch (error) {
    console.error('Single package error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error retrieving package'
    });
  }
});

// ========== HEALTH CHECK ==========
router.get('/health', (req, res) => {
  res.json({
    success: true,
    service: 'cable-tv',
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;