// backend/routes/adminClubkonnect.js
const express = require('express');
const router = express.Router();
const axios = require('axios');
const adminAuth = require('../middleware/adminAuth');

// ClubKonnect Configuration
const CK_CONFIG = {
  userId: process.env.CLUBKONNECT_USER_ID,
  apiKey: process.env.CLUBKONNECT_API_KEY,
  baseUrl: 'https://www.nellobytesystems.com'
};

// Helper function to make ClubKonnect API requests
const makeRequest = async (endpoint, data = {}) => {
  try {
    const payload = {
      ...data,
      userid: CK_CONFIG.userId,
      pass: CK_CONFIG.apiKey
    };

    const response = await axios.post(
      `${CK_CONFIG.baseUrl}${endpoint}`,
      payload,
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 30000
      }
    );

    return response.data;
  } catch (error) {
    console.error('ClubKonnect API Error:', error.message);
    throw new Error(error.response?.data?.message || 'ClubKonnect API request failed');
  }
};

// ===== WALLET MANAGEMENT =====

// Get wallet balance
router.get('/balance', adminAuth, async (req, res) => {
  try {
    const data = await makeRequest('/APIWalletBalanceV1.asp', {});
    
    res.json({
      success: true,
      balance: data.balance,
      phone: data.phoneno,
      accountId: data.id,
      lastUpdated: data.date
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get transaction history (mock for now - implement based on ClubKonnect docs)
router.get('/transactions', adminAuth, async (req, res) => {
  try {
    const { page = 1, limit = 20, type } = req.query;
    
    // TODO: Replace with actual ClubKonnect transaction history endpoint
    // For now, return mock data structure
    res.json({
      success: true,
      transactions: [],
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: 0
      },
      message: 'Transaction history endpoint needs ClubKonnect API documentation'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ===== TEST PURCHASES =====

// Test airtime purchase
router.post('/test/airtime', adminAuth, async (req, res) => {
  try {
    const { network, phone, amount } = req.body;

    if (!network || !phone || !amount) {
      return res.status(400).json({
        success: false,
        message: 'Network, phone, and amount are required'
      });
    }

    const data = await makeRequest('/APIAirtimeV1.asp', {
      network,
      phone,
      amt: amount,
      client_ref: `TEST-${Date.now()}`
    });

    res.json({
      success: true,
      transaction: data,
      message: 'Test airtime purchase successful'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Test data purchase
router.post('/test/data', adminAuth, async (req, res) => {
  try {
    const { network, phone, dataplan } = req.body;

    if (!network || !phone || !dataplan) {
      return res.status(400).json({
        success: false,
        message: 'Network, phone, and dataplan are required'
      });
    }

    const data = await makeRequest('/APIDATAV1.asp', {
      network,
      phone,
      dataplan,
      client_ref: `TEST-${Date.now()}`
    });

    res.json({
      success: true,
      transaction: data,
      message: 'Test data purchase successful'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get data plans for a network
router.get('/data-plans/:network', adminAuth, async (req, res) => {
  try {
    const { network } = req.params;
    
    const data = await makeRequest('/APIDataPlansV1.asp', { network });

    res.json({
      success: true,
      plans: data.plans || data,
      network
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get airtime discount rates
router.get('/airtime-discount', adminAuth, async (req, res) => {
  try {
    const data = await makeRequest('/APIAirtimeDiscountV1.asp', {});

    res.json({
      success: true,
      discounts: data
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ===== API CONFIGURATION =====

// Get ClubKonnect configuration status
router.get('/config', adminAuth, async (req, res) => {
  try {
    res.json({
      success: true,
      config: {
        userId: CK_CONFIG.userId ? '***' + CK_CONFIG.userId.slice(-4) : 'Not Set',
        apiKey: CK_CONFIG.apiKey ? '***' + CK_CONFIG.apiKey.slice(-4) : 'Not Set',
        baseUrl: CK_CONFIG.baseUrl,
        configured: !!(CK_CONFIG.userId && CK_CONFIG.apiKey)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Test API connection
router.get('/test-connection', adminAuth, async (req, res) => {
  try {
    const startTime = Date.now();
    const data = await makeRequest('/APIWalletBalanceV1.asp', {});
    const responseTime = Date.now() - startTime;

    res.json({
      success: true,
      status: 'connected',
      responseTime: `${responseTime}ms`,
      balance: data.balance,
      message: 'Connection successful'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      status: 'failed',
      message: error.message
    });
  }
});

// Query transaction status
router.get('/query/:orderId', adminAuth, async (req, res) => {
  try {
    const { orderId } = req.params;
    
    const data = await makeRequest('/APIQueryV1.asp', {
      orderid: orderId
    });

    res.json({
      success: true,
      transaction: data
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;