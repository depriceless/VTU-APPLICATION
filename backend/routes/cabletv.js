// routes/cabletv.js - FIXED VERSION (Only ClubKonnect prices)
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
    const operators = ['dstv', 'gotv', 'startimes'];
    const operatorsWithStats = operators.map(operator => ({
      code: operator,
      ...OPERATOR_INFO[operator]
    }));

    res.json({
      success: true,
      message: 'Cable TV providers retrieved',
      providers: operatorsWithStats,
      count: operatorsWithStats.length,
      lastModified: new Date()
    });

  } catch (error) {
    console.error('Get providers error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve providers'
    });
  }
});

// ========== GET PACKAGES BY OPERATOR (FETCH FROM CLUBKONNECT DIRECTLY) ==========
router.get('/packages/:operator', authenticate, async (req, res) => {
  try {
    const { operator } = req.params;
    const normalizedOperator = operator.toLowerCase();

    const validOperators = ['dstv', 'gotv', 'startimes', 'startime'];
    if (!validOperators.includes(normalizedOperator)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid operator. Valid operators are: dstv, gotv, startimes'
      });
    }

    console.log(`📡 Fetching ${normalizedOperator.toUpperCase()} packages from ClubKonnect...`);

    // ✅ FETCH DIRECTLY FROM CLUBKONNECT
    const url = `${CK_CONFIG.baseUrl}/APICableTVPackagesV2.asp?UserID=${CK_CONFIG.userId}&APIKey=${CK_CONFIG.apiKey}`;
    
    const response = await axios.get(url, { 
      timeout: 30000,
      headers: {
        'User-Agent': 'VTU-App/1.0'
      }
    });

    let data = response.data;
    
    // Parse JSON if needed
    if (typeof data === 'string') {
      try {
        data = JSON.parse(data);
      } catch (e) {
        throw new Error(`Failed to parse ClubKonnect response: ${data}`);
      }
    }

    console.log('✅ ClubKonnect response received');

    // Check for different possible response structures
    let operatorsData = null;
    
    if (data.TV_ID) {
      operatorsData = data.TV_ID;
    } else if (data.DSTV || data.DStv || data.GOtv || data.Startimes) {
      operatorsData = data;
    } else {
      throw new Error('Invalid response from ClubKonnect API');
    }

    // Operator mapping for ClubKonnect API
    const OPERATOR_KEY_MAPPING = {
      'dstv': ['DStv', 'DSTV'],
      'gotv': ['GOtv', 'GOTV'],
      'startimes': ['Startimes', 'STARTIMES', 'StarTimes'],
      'startime': ['Startimes', 'STARTIMES', 'StarTimes']
    };

    // Find the operator data
    let operatorPackages = null;
    const possibleKeys = OPERATOR_KEY_MAPPING[normalizedOperator];
    
    for (const key of possibleKeys) {
      if (operatorsData[key]) {
        operatorPackages = operatorsData[key];
        break;
      }
    }

    if (!operatorPackages || !Array.isArray(operatorPackages) || operatorPackages.length === 0) {
      return res.status(404).json({
        success: false,
        message: `No packages available for ${normalizedOperator.toUpperCase()}`
      });
    }

    const products = operatorPackages[0].PRODUCT;
    
    if (!products || !Array.isArray(products)) {
      return res.status(404).json({
        success: false,
        message: `No products found for ${normalizedOperator.toUpperCase()}`
      });
    }

    console.log(`📦 Found ${products.length} packages for ${normalizedOperator.toUpperCase()}`);

    // Parse duration from package name
    const parseDuration = (name) => {
      const nameLower = name.toLowerCase();
      if (nameLower.includes('weekly') || nameLower.includes('1 week')) return '1 Week';
      if (nameLower.includes('quarterly') || nameLower.includes('3 months')) return '3 Months';
      if (nameLower.includes('yearly') || nameLower.includes('1 year')) return '1 Year';
      if (nameLower.includes('monthly') || nameLower.includes('1 month')) return '1 Month';
      return '1 Month';
    };

    // Check if popular
    const isPopular = (name) => {
      const popularKeywords = ['padi', 'yanga', 'confam', 'compact', 'smallie', 'jinja', 'jolli', 'basic', 'nova'];
      const nameLower = name.toLowerCase();
      return popularKeywords.some(keyword => nameLower.includes(keyword));
    };

    // ✅ FORMAT PACKAGES WITH CLUBKONNECT PRICES ONLY
    const formattedPackages = products
      .map(product => {
        const packageId = product.PACKAGE_ID;
        const packageName = product.PACKAGE_NAME;
        const packageAmount = parseFloat(product.PACKAGE_AMOUNT);

        // Skip invalid packages
        if (!packageId || !packageName || isNaN(packageAmount) || packageAmount <= 0) {
          return null;
        }

        // Skip packages out of range
        if (packageAmount < 500 || packageAmount > 100000) {
          return null;
        }

        return {
          id: packageId,
          packageId: packageId,
          variation_id: packageId,
          operator: normalizedOperator === 'startime' ? 'startimes' : normalizedOperator,
          name: packageName.replace(/\s+/g, ' ').trim(),
          // ✅ ONLY ONE AMOUNT - ClubKonnect price
          amount: packageAmount,
          customerPrice: packageAmount,
          providerCost: packageAmount,
          profit: 0,
          duration: parseDuration(packageName),
          description: packageName.replace(/\s+/g, ' ').trim(),
          package_name: packageName,
          popular: isPopular(packageName),
          active: true
        };
      })
      .filter(pkg => pkg !== null)
      .sort((a, b) => a.customerPrice - b.customerPrice);

    console.log(`✅ Returning ${formattedPackages.length} valid packages`);

    const operatorInfo = OPERATOR_INFO[normalizedOperator === 'startime' ? 'startimes' : normalizedOperator];

    res.json({
      success: true,
      message: `Packages retrieved for ${normalizedOperator.toUpperCase()}`,
      operator: normalizedOperator === 'startime' ? 'startimes' : normalizedOperator,
      operatorInfo: {
        code: normalizedOperator === 'startime' ? 'startimes' : normalizedOperator,
        ...operatorInfo
      },
      data: formattedPackages,
      count: formattedPackages.length,
      lastModified: new Date(),
      source: 'clubkonnect_direct'
    });

  } catch (error) {
    console.error('Get packages error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch cable packages from ClubKonnect',
      error: error.message
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