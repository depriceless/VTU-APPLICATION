// routes/electricity.js - FIXED VERSION - Direct ClubKonnect Fetching
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

// Helper function for ClubKonnect API calls
const makeClubKonnectRequest = async (endpoint, params) => {
  try {
    const queryParams = new URLSearchParams({
      UserID: CK_CONFIG.userId,
      APIKey: CK_CONFIG.apiKey,
      ...params
    });
    
    const url = `${CK_CONFIG.baseUrl}${endpoint}?${queryParams}`;
    console.log('ClubKonnect Request URL:', url);
    
    const response = await axios.get(url, { 
      timeout: 30000,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'VTU-App/1.0'
      }
    });
    
    console.log('ClubKonnect Response Status:', response.status);
    console.log('ClubKonnect Response Data:', response.data);
    
    let data = response.data;
    if (typeof data === 'string') {
      try {
        data = JSON.parse(data);
      } catch (e) {
        throw new Error('Invalid API response format');
      }
    }
    
    return data;
  } catch (error) {
    console.error('ClubKonnect API Error:', error.message);
    throw error;
  }
};

// Electricity company codes mapping
const ELECTRICITY_COMPANY_CODES = {
  '01': '01', // Eko Electric
  '02': '02', // Ikeja Electric
  '03': '03', // Abuja Electric
  '04': '04', // Kano Electric
  '05': '05', // Port Harcourt Electric
  '06': '06', // Jos Electric
  '07': '07', // Ibadan Electric
  '08': '08', // Kaduna Electric
  '09': '09', // Enugu Electric
  '10': '10', // Benin Electric
};

// Fallback providers (in case API fails)
const FALLBACK_PROVIDERS = [
  { id: '01', name: 'Eko Electric', fullName: 'Eko Electricity Distribution Company', acronym: 'EKEDC', isActive: true, minAmount: 500, maxAmount: 100000, fee: 0 },
  { id: '02', name: 'Ikeja Electric', fullName: 'Ikeja Electric Distribution Company', acronym: 'IKEDC', isActive: true, minAmount: 500, maxAmount: 100000, fee: 0 },
  { id: '03', name: 'Abuja Electric', fullName: 'Abuja Electricity Distribution Company', acronym: 'AEDC', isActive: true, minAmount: 500, maxAmount: 100000, fee: 0 },
  { id: '04', name: 'Kano Electric', fullName: 'Kano Electricity Distribution Company', acronym: 'KEDC', isActive: true, minAmount: 500, maxAmount: 100000, fee: 0 },
  { id: '05', name: 'Port Harcourt Electric', fullName: 'Port Harcourt Electric Distribution Company', acronym: 'PHEDC', isActive: true, minAmount: 500, maxAmount: 100000, fee: 0 },
  { id: '06', name: 'Jos Electric', fullName: 'Jos Electricity Distribution Company', acronym: 'JEDC', isActive: true, minAmount: 500, maxAmount: 100000, fee: 0 },
  { id: '07', name: 'Ibadan Electric', fullName: 'Ibadan Electricity Distribution Company', acronym: 'IBEDC', isActive: true, minAmount: 500, maxAmount: 100000, fee: 0 },
  { id: '08', name: 'Kaduna Electric', fullName: 'Kaduna Electric Distribution Company', acronym: 'KAEDC', isActive: true, minAmount: 500, maxAmount: 100000, fee: 0 },
  { id: '09', name: 'Enugu Electric', fullName: 'Enugu Electricity Distribution Company', acronym: 'EEDC', isActive: true, minAmount: 500, maxAmount: 100000, fee: 0 },
  { id: '10', name: 'Benin Electric', fullName: 'Benin Electricity Distribution Company', acronym: 'BEDC', isActive: true, minAmount: 500, maxAmount: 100000, fee: 0 },
];

// ✅ GET /api/electricity/providers - Fetch directly from ClubKonnect
router.get('/providers', authenticate, async (req, res) => {
  try {
    console.log('📡 Fetching electricity providers from ClubKonnect...');

    try {
      // ✅ Fetch from ClubKonnect API
      const response = await makeClubKonnectRequest('/APIElectricityCompaniesV1.asp', {});

      console.log('ClubKonnect Providers Response:', response);

      // Parse the response and format it
      let providers = [];

      if (response && typeof response === 'object') {
        // If ClubKonnect returns a list of companies
        if (Array.isArray(response)) {
          providers = response.map(company => ({
            id: company.company_id || company.id,
            name: company.company_name || company.name,
            fullName: company.full_name || company.company_name || company.name,
            acronym: company.acronym || company.company_name,
            isActive: company.is_active !== false,
            minAmount: company.min_amount || 500,
            maxAmount: company.max_amount || 100000,
            fee: company.fee || 0
          }));
        } 
        // If response has a companies property
        else if (response.companies && Array.isArray(response.companies)) {
          providers = response.companies.map(company => ({
            id: company.company_id || company.id,
            name: company.company_name || company.name,
            fullName: company.full_name || company.company_name || company.name,
            acronym: company.acronym || company.company_name,
            isActive: company.is_active !== false,
            minAmount: company.min_amount || 500,
            maxAmount: company.max_amount || 100000,
            fee: company.fee || 0
          }));
        }
        // If response is a simple object with company data
        else {
          // Use fallback as ClubKonnect might not have a providers list endpoint
          console.log('⚠️ ClubKonnect response format unexpected, using fallback');
          providers = FALLBACK_PROVIDERS;
        }
      } else {
        // Use fallback
        providers = FALLBACK_PROVIDERS;
      }

      // Filter only active providers
      const activeProviders = providers.filter(p => p.isActive);

      res.json({
        success: true,
        message: 'Electricity providers retrieved successfully',
        data: activeProviders,
        count: activeProviders.length,
        source: providers.length > 0 && providers !== FALLBACK_PROVIDERS ? 'clubkonnect' : 'fallback'
      });

    } catch (apiError) {
      console.error('❌ ClubKonnect fetch failed:', apiError.message);
      
      // Fallback to default providers
      const providers = FALLBACK_PROVIDERS.filter(p => p.isActive);
      
      res.json({
        success: true,
        message: 'Electricity providers retrieved (fallback)',
        data: providers,
        count: providers.length,
        source: 'fallback'
      });
    }

  } catch (error) {
    console.error('Error fetching electricity providers:', error);
    res.status(500).json({
      success: false,
      message: 'Server error retrieving electricity providers'
    });
  }
});

// ✅ GET /api/electricity/provider/:id - Get specific provider
router.get('/provider/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const provider = FALLBACK_PROVIDERS.find(p => p.id === id);

    if (!provider) {
      return res.status(404).json({
        success: false,
        message: 'Electricity provider not found'
      });
    }

    if (!provider.isActive) {
      return res.status(503).json({
        success: false,
        message: 'Provider service temporarily unavailable'
      });
    }

    res.json({
      success: true,
      message: `${provider.name} details retrieved`,
      data: provider
    });

  } catch (error) {
    console.error('Error fetching provider details:', error);
    res.status(500).json({
      success: false,
      message: 'Server error retrieving provider details'
    });
  }
});

// ✅ POST /api/electricity/validate-meter - Validate meter number directly from ClubKonnect
router.post('/validate-meter', authenticate, async (req, res) => {
  try {
    const { meterNumber, provider, meterType } = req.body;

    console.log('=== METER VALIDATION REQUEST ===');
    console.log('Provider:', provider);
    console.log('Meter Number:', meterNumber);
    console.log('Meter Type:', meterType);

    if (!meterNumber || !provider) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: meterNumber, provider'
      });
    }

    if (!/^\d{10,13}$/.test(meterNumber)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid meter number format. Must be 10-13 digits.'
      });
    }

    const companyCode = ELECTRICITY_COMPANY_CODES[provider];
    if (!companyCode) {
      return res.status(400).json({
        success: false,
        message: 'Invalid electricity provider'
      });
    }

    // ✅ Validate meter directly from ClubKonnect
    const response = await makeClubKonnectRequest('/APIVerifyElectricityV1.asp', {
      ElectricCompany: companyCode,
      MeterNo: meterNumber
    });

    console.log('ClubKonnect Validation Response:', response);

    // Check if validation was successful
    if (!response || !response.customer_name || 
        response.customer_name === '' || 
        response.customer_name === 'INVALID_METERNO' ||
        response.customer_name.toUpperCase().includes('INVALID')) {
      
      return res.status(400).json({
        success: false,
        message: 'Meter number not found. Please verify the meter number and selected provider.'
      });
    }

    res.json({
      success: true,
      message: 'Meter validation successful',
      data: {
        customerName: response.customer_name,
        customerAddress: response.address || response.customer_address || '',
        accountNumber: response.account_number || response.accountNumber || '',
        meterNumber: meterNumber,
        provider: companyCode
      }
    });

  } catch (error) {
    console.error('=== METER VALIDATION ERROR ===');
    console.error('Error Message:', error.message);
    
    res.status(500).json({
      success: false,
      message: error.message || 'Server error validating meter number.'
    });
  }
});

// ✅ GET /api/electricity/history - Get electricity payment history
router.get('/history', authenticate, async (req, res) => {
  try {
    const { provider, limit = 20, page = 1 } = req.query;
    
    const Transaction = require('../models/Transaction');

    const query = {
      userId: req.user.userId,
      serviceType: 'electricity'
    };

    if (provider) {
      query['metadata.provider'] = provider;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const transactions = await Transaction.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    const totalTransactions = await Transaction.countDocuments(query);

    const formattedTransactions = transactions.map(tx => ({
      _id: tx._id,
      reference: tx.reference,
      provider: tx.metadata?.provider || 'UNKNOWN',
      meterType: tx.metadata?.meterType || 'unknown',
      meterNumber: tx.metadata?.meterNumber || 'Unknown',
      amount: tx.amount,
      status: tx.status,
      createdAt: tx.createdAt,
      balanceAfter: tx.balanceAfter || tx.newBalance,
      token: tx.metadata?.token || null
    }));

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