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

    // Get packages from ClubKonnect
    const response = await makeClubKonnectRequest('/APICableTVPackagesV2.asp', {
      CableTV: clubKonnectOperator
    });

    console.log('Raw ClubKonnect packages response:', JSON.stringify(response, null, 2));

    // Parse the response based on ClubKonnect's actual format
    let packages = [];
    
    // ClubKonnect returns an object with package codes as keys
    if (response && typeof response === 'object' && !Array.isArray(response)) {
      // Filter out non-package fields (status codes, etc.)
      const packageEntries = Object.entries(response).filter(([code]) => {
        // Exclude common API response fields
        const excludedFields = ['status', 'statuscode', 'message', 'error'];
        return !excludedFields.includes(code.toLowerCase());
      });

      packages = packageEntries.map(([code, details]) => {
        // Handle different response formats
        let description = '';
        let amount = 0;

        // Case 1: details is a string (most common for ClubKonnect)
        if (typeof details === 'string') {
          description = details;
          
          // Extract amount from description
          // Matches: "N4,400", "N 4,400", "4400 Naira", "NGN4400", etc.
          const amountMatch = description.match(/(?:N|NGN|₦)?\s?([\d,]+(?:\.\d{2})?)/i);
          if (amountMatch) {
            amount = parseFloat(amountMatch[1].replace(/,/g, ''));
          }
        } 
        // Case 2: details is an object
        else if (typeof details === 'object' && details !== null) {
          description = details.description || details.name || details.package_name || code;
          amount = parseFloat(details.amount || details.price || 0);
        }
        // Case 3: fallback
        else {
          description = String(details || code);
        }

        // Return formatted package
        return {
          id: code,
          variation_id: code,
          name: description.trim(),
          amount: amount,
          duration: '30 days',
          description: description.trim(),
          package_name: description.trim()
        };
      })
      // Filter out packages with invalid amounts
      .filter(pkg => pkg.amount > 0);
    } 
    // Fallback: if response is an array
    else if (Array.isArray(response)) {
      packages = response
        .map(pkg => {
          const description = pkg.description || pkg.name || pkg.package_name || '';
          let amount = parseFloat(pkg.amount || pkg.price || 0);
          
          // If amount not found, try to extract from description
          if (amount === 0 && description) {
            const amountMatch = description.match(/(?:N|NGN|₦)?\s?([\d,]+(?:\.\d{2})?)/i);
            if (amountMatch) {
              amount = parseFloat(amountMatch[1].replace(/,/g, ''));
            }
          }

          return {
            id: pkg.code || pkg.package_code || pkg.id || pkg.variation_id,
            variation_id: pkg.code || pkg.package_code || pkg.id || pkg.variation_id,
            name: description,
            amount: amount,
            duration: pkg.duration || '30 days',
            description: description,
            package_name: description
          };
        })
        .filter(pkg => pkg.amount > 0);
    }
    
    // Log parsing results
    console.log(`Successfully parsed ${packages.length} packages`);
    if (packages.length > 0) {
      console.log('Sample package:', packages[0]);
    } else {
      console.warn('No valid packages found in response');
    }

    console.log(`Processed ${packages.length} packages for ${operator}`);

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