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

console.log('Cable TV Routes - ClubKonnect Config:', {
  userId: CK_CONFIG.userId ? 'SET' : 'MISSING',
  apiKey: CK_CONFIG.apiKey ? 'SET' : 'MISSING',
  baseUrl: CK_CONFIG.baseUrl
});

// Helper function to make ClubKonnect requests
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

// Operator mapping for ClubKonnect
const OPERATOR_MAPPING = {
  'dstv': 'dstv',
  'gotv': 'gotv',
  'startime': 'startimes',
  'startimes': 'startimes'
};

// ========== NEW: SMART CARD VALIDATION ENDPOINT ==========
router.post('/validate-smartcard', authenticate, async (req, res) => {
  try {
    const { smartCardNumber, operator } = req.body;
    
    console.log('Validating smart card:', {
      operator,
      smartCardNumber: smartCardNumber ? smartCardNumber.slice(0, 4) + '***' : 'MISSING'
    });

    // Validate input
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

    // Map operator to ClubKonnect format
    const clubKonnectOperator = OPERATOR_MAPPING[operator.toLowerCase()];
    
    if (!clubKonnectOperator) {
      return res.status(400).json({
        success: false,
        message: 'Unsupported operator'
      });
    }

    // Call ClubKonnect verification API
    const response = await makeClubKonnectRequest('/APIVerifyCableTVV1.0.asp', {
      CableTV: clubKonnectOperator,
      SmartCardNo: smartCardNumber
    });

    console.log('Verification response:', response);

    // Check if verification was successful
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

// GET /api/cable/providers - Get all cable providers
router.get('/providers', authenticate, async (req, res) => {
  try {
    const providers = [
      {
        code: 'dstv',
        name: 'DStv',
        description: 'Digital Satellite Television',
        logo: '/images/providers/dstv.png',
        color: '#FFA500',
        features: ['HD Channels', 'Premium Content', 'Sports Packages'],
        smartCardLength: 10
      },
      {
        code: 'gotv',
        name: 'GOtv',
        description: 'Digital Terrestrial Television',
        logo: '/images/providers/gotv.png',
        color: '#00A651',
        features: ['Local Channels', 'Affordable Packages', 'Family Content'],
        smartCardLength: 10
      },
      {
        code: 'startime',
        name: 'StarTimes',
        description: 'Digital Television Service',
        logo: '/images/providers/startimes.png',
        color: '#FF0000',
        features: ['Affordable Plans', 'Local Content', 'International Channels'],
        smartCardLength: 11
      }
    ];

    res.json({
      success: true,
      message: 'Cable TV providers retrieved',
      providers: providers,
      count: providers.length
    });

  } catch (error) {
    console.error('Get providers error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve providers'
    });
  }
});

// GET /api/cable/packages/:operator - Get packages for specific operator
// GET /api/cable/packages/:operator - Get packages for specific operator
router.get('/packages/:operator', authenticate, async (req, res) => {
  try {
    const { operator } = req.params;
    
    const clubKonnectOperator = OPERATOR_MAPPING[operator.toLowerCase()];
    if (!clubKonnectOperator) {
      return res.status(400).json({
        success: false,
        message: 'Unsupported operator'
      });
    }

    console.log(`Fetching packages for ${operator} (${clubKonnectOperator})`);

    const response = await makeClubKonnectRequest('/APICableTVPackagesV2.asp', {
      CableTV: clubKonnectOperator
    });

    console.log('ClubKonnect Raw Response:', JSON.stringify(response, null, 2));

    let packages = [];
    
    if (response && response.TV_ID) {
      const operatorKeyMap = {
        'dstv': 'DStv',
        'gotv': 'GOtv',
        'startimes': 'Startimes'
      };
      
      const operatorKey = operatorKeyMap[clubKonnectOperator];
      
      if (operatorKey && response.TV_ID[operatorKey]) {
        const operatorData = response.TV_ID[operatorKey];
        
        if (Array.isArray(operatorData) && operatorData.length > 0) {
          const productList = operatorData[0].PRODUCT;
          
          if (Array.isArray(productList)) {
           packages = productList.map(product => {
  // Use PACKAGE_AMOUNT as both provider cost and customer price
  const providerCost = parseFloat(product.PACKAGE_AMOUNT || 0);
  
  // NO MARKUP - customer pays exactly what ClubKonnect charges
  const customerPrice = providerCost;
  const profit = 0;
  
  return {
    id: product.PACKAGE_ID,
    variation_id: product.PACKAGE_ID,
    name: product.PACKAGE_NAME,
    amount: customerPrice,  // Customer pays ₦1,900
    providerCost: providerCost,  // You pay ₦1,900
    profit: profit,  // ₦0 profit
    duration: '30 days',
    description: product.PACKAGE_NAME,
    package_name: product.PACKAGE_NAME
  };
}).filter(pkg => pkg.providerCost > 0 && pkg.amount >= 500 && pkg.amount <= 50000);
          }
        }
      }
    }
    
    console.log(`Processed ${packages.length} valid packages for ${operator}`);

    if (packages.length === 0) {
      console.error('No valid packages found!');
      return res.status(400).json({
        success: false,
        message: 'No packages available from provider'
      });
    }

    res.json({
      success: true,
      data: packages,
      operator: operator,
      count: packages.length
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
// Health check
router.get('/health', (req, res) => {
  res.json({
    success: true,
    service: 'cable-tv-clubkonnect',
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;