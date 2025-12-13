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

/**
 * Fetch WAEC packages from ClubKonnect
 */
async function fetchWAECPackages() {
  try {
    const url = `${CK_CONFIG.baseUrl}/APIWAECPackagesV2.asp?UserID=${CK_CONFIG.userId}`;
    
    console.log('📡 Fetching WAEC packages from ClubKonnect...');
    
    const response = await axios.get(url, {
      timeout: 30000,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    let data = response.data;
    
    if (typeof data === 'string') {
      try {
        data = JSON.parse(data);
      } catch (e) {
        console.error('Failed to parse WAEC response');
        throw new Error('Invalid response from ClubKonnect');
      }
    }

    console.log('✅ WAEC Raw Response:', JSON.stringify(data, null, 2));
    
    const packages = [];
    
    if (data.WAEC && Array.isArray(data.WAEC)) {
      data.WAEC.forEach(service => {
        if (service.PRODUCT && Array.isArray(service.PRODUCT)) {
          service.PRODUCT.forEach(product => {
            packages.push({
              id: product.PACKAGE_ID || product.package_id,
              code: product.PACKAGE_ID || product.package_id,
              name: product.PACKAGE_NAME || product.name,
              description: product.PACKAGE_NAME || product.name,
              price: parseFloat(product.PACKAGE_AMOUNT || product.amount || 0),
              provider: 'waec',
              validity: '1 year',
              active: true
            });
          });
        }
      });
    }

    console.log(`✅ Parsed ${packages.length} WAEC packages`);
    return packages;
    
  } catch (error) {
    console.error('❌ Error fetching WAEC packages:', error.message);
    
    // Return fallback packages
    return [
      {
        id: 'waecdirect',
        code: 'waecdirect',
        name: 'WAEC Result Checker PIN',
        description: 'WAEC Result Checker PIN',
        price: 3900,
        provider: 'waec',
        validity: '1 year',
        active: true
      },
      {
        id: 'waec-registration',
        code: 'waec-registration',
        name: 'WAEC Registration PIN',
        description: 'WAEC Registration PIN',
        price: 14000,
        provider: 'waec',
        validity: 'Current session',
        active: true
      }
    ];
  }
}

/**
 * Fetch JAMB packages from ClubKonnect
 */
async function fetchJAMBPackages() {
  try {
    const url = `${CK_CONFIG.baseUrl}/APIJAMBPackagesV2.asp?UserID=${CK_CONFIG.userId}`;
    
    console.log('📡 Fetching JAMB packages from ClubKonnect...');
    
    const response = await axios.get(url, {
      timeout: 30000,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    let data = response.data;
    
    if (typeof data === 'string') {
      try {
        data = JSON.parse(data);
      } catch (e) {
        console.error('Failed to parse JAMB response');
        throw new Error('Invalid response from ClubKonnect');
      }
    }

    console.log('✅ JAMB Raw Response:', JSON.stringify(data, null, 2));
    
    const packages = [];
    
    if (data.JAMB && Array.isArray(data.JAMB)) {
      data.JAMB.forEach(service => {
        if (service.PRODUCT && Array.isArray(service.PRODUCT)) {
          service.PRODUCT.forEach(product => {
            packages.push({
              id: product.PACKAGE_ID || product.package_id,
              code: product.PACKAGE_ID || product.package_id,
              name: product.PACKAGE_NAME || product.name,
              description: product.PACKAGE_NAME || product.name,
              price: parseFloat(product.PACKAGE_AMOUNT || product.amount || 0),
              provider: 'jamb',
              validity: 'Current session',
              active: true
            });
          });
        }
      });
    }

    console.log(`✅ Parsed ${packages.length} JAMB packages`);
    return packages;
    
  } catch (error) {
    console.error('❌ Error fetching JAMB packages:', error.message);
    
    // Return fallback packages
    return [
      {
        id: 'utme',
        code: 'utme',
        name: 'JAMB UTME e-PIN',
        description: 'JAMB UTME Registration PIN',
        price: 4500,
        provider: 'jamb',
        validity: 'Current session',
        active: true
      },
      {
        id: 'de',
        code: 'de',
        name: 'JAMB Direct Entry e-PIN',
        description: 'JAMB Direct Entry Registration PIN',
        price: 4500,
        provider: 'jamb',
        validity: 'Current session',
        active: true
      }
    ];
  }
}

/**
 * GET /api/education/packages
 * Fetch all education packages from ClubKonnect
 */
router.get('/packages', authenticate, async (req, res) => {
  try {
    console.log('📚 GET /education/packages called by user:', req.user.userId);
    
    const [waecPackages, jambPackages] = await Promise.all([
      fetchWAECPackages(),
      fetchJAMBPackages()
    ]);
    
    const packages = {
      waec: waecPackages,
      jamb: jambPackages,
      all: [...waecPackages, ...jambPackages]
    };
    
    console.log('✅ Returning packages:', {
      waec: packages.waec.length,
      jamb: packages.jamb.length,
      total: packages.all.length
    });
    
    res.json({
      success: true,
      data: packages,
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error in /education/packages route:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch education packages',
      error: error.message
    });
  }
});

/**
 * GET /api/education/test
 * Test endpoint
 */
router.get('/test', (req, res) => {
  console.log('📍 Education test route hit');
  res.json({
    success: true,
    message: 'Education routes are working',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;