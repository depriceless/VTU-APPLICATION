// services/easyaccessService.js - EasyAccess API Integration Service
const axios = require('axios');
const { calculateCustomerPrice } = require('../config/pricing');

const EASYACCESS_CONFIG = {
  BASE_URL: 'https://easyaccess.com.ng/api',
  TOKEN: process.env.EASYACCESS_TOKEN || '3e17bad4c941d642424fc7a60320b622',
  TIMEOUT: 30000
};

// Network code mapping
const EASYACCESS_NETWORK_CODES = {
  'mtn': '01',
  'glo': '02',
  'airtel': '03',
  '9mobile': '04'
};

const NETWORK_FROM_CODE = {
  '01': 'mtn',
  '02': 'glo',
  '03': 'airtel',
  '04': '9mobile'
};

// EasyAccess product types mapping
const EASYACCESS_PRODUCT_TYPES = {
  'gift': {
    'mtn': 'mtn_gifting',
    'glo': 'glo_gifting',
    'airtel': 'airtel_gifting',
    '9mobile': '9mobile_gifting'
  },
  'cg': {
    'mtn': 'mtn_cg',
    'glo': 'glo_cg',
    'airtel': 'airtel_cg'
    // Note: 9mobile doesn't have CG on EasyAccess
  }
};

// Helper function to make EasyAccess API requests
async function makeEasyAccessRequest(endpoint, method = 'GET', data = null) {
  try {
    console.log(`📡 EasyAccess ${method} ${endpoint}`);
    
    const config = {
      method,
      url: `${EASYACCESS_CONFIG.BASE_URL}${endpoint}`,
      headers: {
        'AuthorizationToken': EASYACCESS_CONFIG.TOKEN,
        'cache-control': 'no-cache',
        'User-Agent': 'VTU-App/1.0'
      },
      timeout: EASYACCESS_CONFIG.TIMEOUT
    };

    if (method === 'POST' && data) {
      const formData = new URLSearchParams();
      Object.keys(data).forEach(key => {
        formData.append(key, data[key]);
      });
      config.data = formData;
      config.headers['Content-Type'] = 'application/x-www-form-urlencoded';
    }

    const response = await axios(config);
    
    // Handle EasyAccess responses (some return plain text, some JSON)
    let responseData = response.data;
    
    if (typeof responseData === 'string') {
      // Try to parse as JSON
      try {
        responseData = JSON.parse(responseData);
      } catch (e) {
        // If it's plain text success (like PIN numbers)
        if (responseData.includes('success') || responseData.includes('PIN') || /^\d+/.test(responseData)) {
          return { success: true, data: responseData };
        }
        // Check for error indicators
        if (responseData.toLowerCase().includes('invalid') || 
            responseData.toLowerCase().includes('insufficient') ||
            responseData.toLowerCase().includes('failed')) {
          throw new Error(responseData);
        }
        // Return as-is for other cases
        return { success: true, raw: responseData };
      }
    }
    
    return responseData;
  } catch (error) {
    console.error('❌ EasyAccess API Error:', {
      endpoint,
      method,
      error: error.message,
      response: error.response?.data
    });
    
    if (error.response) {
      const errorMsg = error.response.data?.message || 
                      error.response.data?.error || 
                      JSON.stringify(error.response.data);
      throw new Error(`EasyAccess API: ${errorMsg}`);
    }
    throw error;
  }
}

// Check wallet balance
async function checkWalletBalance() {
  try {
    const response = await makeEasyAccessRequest('/wallet_balance.php');
    
    if (response.success === false || response.success === 'false') {
      throw new Error(response.message || 'Invalid authorization token');
    }
    
    return {
      success: true,
      balance: parseFloat(response.balance) || 0,
      email: response.email,
      accountDetails: {
        account1: { number: response.funding_acctno1, bank: response.funding_bank1 },
        account2: { number: response.funding_acctno2, bank: response.funding_bank2 },
        account3: { number: response.funding_acctno3, bank: response.funding_bank3 }
      },
      checkedDate: response.checked_date,
      referenceNo: response.reference_no,
      status: response.status || 'Successful'
    };
  } catch (error) {
    console.error('EasyAccess balance check error:', error.message);
    throw error;
  }
}

// Fetch plans from EasyAccess
async function fetchEasyAccessPlans(network, planType = 'gift') {
  try {
    const normalizedNetwork = network.toLowerCase();
    const normalizedPlanType = planType.toLowerCase();
    
    // Validate plan type
    if (!['gift', 'cg'].includes(normalizedPlanType)) {
      throw new Error('EasyAccess only supports gift and cg data types');
    }
    
    // Get product type
    const productType = EASYACCESS_PRODUCT_TYPES[normalizedPlanType]?.[normalizedNetwork];
    if (!productType) {
      return { success: true, plans: [] }; // No plans for this combo
    }
    
    console.log(`Fetching ${productType} plans for ${network}`);
    
    const response = await makeEasyAccessRequest(`/get_plans.php?product_type=${productType}`);
    
    // Extract network plans
    const networkKey = normalizedNetwork.toUpperCase();
    const plans = response[networkKey] || response[networkKey.toLowerCase()] || [];
    
    if (!Array.isArray(plans)) {
      return { success: true, plans: [] };
    }
    
    // Format plans
    const formattedPlans = plans.map(plan => {
      const providerCost = parseFloat(plan.price) || 0;
      const pricing = calculateCustomerPrice(providerCost, 'data');
      
      return {
        id: `ea_${plan.plan_id}`,
        planId: plan.plan_id,
        name: plan.name,
        network: normalizedNetwork,
        dataSize: extractDataSize(plan.name),
        validity: plan.validity || extractValidity(plan.name),
        providerCost,
        customerPrice: pricing.customerPrice,
        amount: pricing.customerPrice,
        profit: pricing.profit,
        provider: 'easyaccess',
        type: normalizedPlanType,
        category: getPlanCategory(plan.name),
        popular: isPlanPopular(plan.name),
        active: true,
        lastUpdated: new Date()
      };
    });
    
    return {
      success: true,
      plans: formattedPlans,
      count: formattedPlans.length,
      productType,
      network: normalizedNetwork,
      planType: normalizedPlanType
    };
    
  } catch (error) {
    console.error(`Error fetching EasyAccess ${planType} plans for ${network}:`, error);
    return { success: false, message: error.message, plans: [] };
  }
}

// Purchase data via EasyAccess
async function purchaseEasyAccessData({ network, phone, planId, clientReference, planName }) {
  try {
    console.log('🛒 EasyAccess Purchase Request:', { network, phone, planId, clientReference });
    
    const networkCode = EASYACCESS_NETWORK_CODES[network.toLowerCase()];
    if (!networkCode) {
      throw new Error(`Invalid network: ${network}`);
    }
    
    const data = {
      network: networkCode,
      mobileno: phone,
      dataplan: planId,
      client_reference: clientReference || `txn_${Date.now()}`,
      webhook_url: process.env.EASYACCESS_WEBHOOK_URL || ''
    };
    
    const response = await makeEasyAccessRequest('/data.php', 'POST', data);
    
    console.log('EasyAccess Purchase Response:', response);
    
    if (response.success === false || response.success === 'false') {
      throw new Error(response.message || 'Purchase failed');
    }
    
    // Successful response
    return {
      success: true,
      message: response.message || 'Data purchase successful',
      network: response.network || network.toUpperCase(),
      phone: response.mobileno || phone,
      plan: response.dataplan || planName,
      amount: parseFloat(response.amount) || 0,
      balanceBefore: parseFloat(response.balance_before) || 0,
      balanceAfter: parseFloat(response.balance_after) || 0,
      referenceNo: response.reference_no,
      clientReference: response.client_reference || data.client_reference,
      transactionDate: response.transaction_date,
      status: response.status || 'Successful',
      rawResponse: response
    };
    
  } catch (error) {
    console.error('EasyAccess purchase error:', error);
    throw error;
  }
}

// Query transaction status
async function queryEasyAccessTransaction(referenceNo) {
  try {
    const response = await makeEasyAccessRequest('/query_transaction.php', 'POST', {
      reference: referenceNo
    });
    
    if (response.success === false || response.success === 'false') {
      throw new Error(response.message || 'Transaction not found');
    }
    
    return {
      success: true,
      message: response.message,
      status: response.status,
      referenceNo: response.reference_no,
      transactionDate: response.transaction_date,
      details: response
    };
    
  } catch (error) {
    console.error('EasyAccess query error:', error);
    throw error;
  }
}

// Helper functions
function extractDataSize(planName) {
  const match = planName.match(/(\d+(\.\d+)?)\s*(GB|MB|TB)/i);
  return match ? `${match[1]} ${match[3].toUpperCase()}` : 'Unknown';
}

function extractValidity(planName) {
  const name = planName.toLowerCase();
  if (name.includes('daily') || name.includes('1 day')) return '1 day';
  if (name.includes('weekly') || name.includes('7 days')) return '7 days';
  if (name.includes('monthly') || name.includes('30 days')) return '30 days';
  return '30 days';
}

function getPlanCategory(planName) {
  const name = planName.toLowerCase();
  if (name.includes('daily')) return 'daily';
  if (name.includes('weekly')) return 'weekly';
  return 'monthly';
}

function isPlanPopular(planName) {
  const popularKeywords = ['1GB', '2GB', '5GB', '10GB', 'daily', 'weekly'];
  return popularKeywords.some(keyword => 
    planName.toLowerCase().includes(keyword.toLowerCase())
  );
}

module.exports = {
  checkWalletBalance,
  fetchEasyAccessPlans,
  purchaseEasyAccessData,
  queryEasyAccessTransaction,
  EASYACCESS_NETWORK_CODES,
  EASYACCESS_PRODUCT_TYPES
};