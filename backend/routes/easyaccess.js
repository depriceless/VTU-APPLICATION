const express = require('express');
const router = express.Router();
const axios = require('axios');
const { authenticate } = require('../middleware/auth');
const { calculateCustomerPrice } = require('../config/pricing');

console.log('🔥 EasyAccess routes module loaded');

// EasyAccess Configuration
const EASYACCESS_CONFIG = {
  BASE_URL: 'https://easyaccess.com.ng/api',
  TOKEN: process.env.EASYACCESS_TOKEN || '3e17bad4c941d642424fc7a60320b622'
};

console.log('🔑 EasyAccess Token:', EASYACCESS_CONFIG.TOKEN);
console.log('🌐 EasyAccess Base URL:', EASYACCESS_CONFIG.BASE_URL);

// Network mapping
const EASYACCESS_NETWORK_MAP = {
  'mtn': '01',
  'glo': '02',
  'airtel': '03',
  '9mobile': '04'
};

// === TEST TOKEN ENDPOINT (NO AUTH) ===
router.get('/test-token-direct', async (req, res) => {
  console.log('\n🧪 === TESTING EASYACCESS TOKEN DIRECTLY ===');
  console.log('Token:', EASYACCESS_CONFIG.TOKEN);
  
  try {
    // Test 1: Wallet Balance
    console.log('\n📊 Test 1: Checking wallet balance...');
    const balanceUrl = 'https://easyaccess.com.ng/api/wallet_balance.php';
    console.log('URL:', balanceUrl);
    
    const balanceResponse = await axios.get(balanceUrl, {
      headers: {
        'AuthorizationToken': EASYACCESS_CONFIG.TOKEN,
        'cache-control': 'no-cache'
      },
      timeout: 30000
    });
    
    console.log('✅ Balance Response Status:', balanceResponse.status);
    console.log('✅ Balance Response Data:', JSON.stringify(balanceResponse.data, null, 2));
    
    // Test 2: Get Plans
    console.log('\n📦 Test 2: Fetching MTN Gifting plans...');
    const plansUrl = 'https://easyaccess.com.ng/api/get_plans.php?product_type=mtn_gifting';
    console.log('URL:', plansUrl);
    
    const plansResponse = await axios.get(plansUrl, {
      headers: {
        'AuthorizationToken': EASYACCESS_CONFIG.TOKEN,
        'cache-control': 'no-cache'
      },
      timeout: 30000
    });
    
    console.log('✅ Plans Response Status:', plansResponse.status);
    console.log('✅ Plans Response Data:', JSON.stringify(plansResponse.data, null, 2));
    
    res.json({
      success: true,
      message: '✅ EasyAccess token is VALID and working!',
      tests: {
        balance: {
          status: 'passed',
          data: balanceResponse.data
        },
        plans: {
          status: 'passed',
          data: plansResponse.data
        }
      }
    });
    
  } catch (error) {
    console.error('\n❌ === TOKEN TEST FAILED ===');
    console.error('Error Message:', error.message);
    console.error('Error Response:', error.response?.data);
    console.error('Error Status:', error.response?.status);
    console.error('Error Headers:', error.response?.headers);
    
    res.status(500).json({
      success: false,
      message: '❌ EasyAccess token test FAILED',
      error: {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      },
      token: EASYACCESS_CONFIG.TOKEN,
      hint: 'Check if token is valid on EasyAccess dashboard'
    });
  }
});

// === GET PLANS ENDPOINT (WITH AUTH) ===
router.get('/plans/:network', authenticate, async (req, res) => {
  try {
    const { network } = req.params;
    
    console.log('\n📡 === FETCHING EASYACCESS PLANS ===');
    console.log('Network:', network);
    console.log('Token:', EASYACCESS_CONFIG.TOKEN);
    console.log('User ID:', req.user?.userId);
    
    const networkCode = EASYACCESS_NETWORK_MAP[network.toLowerCase()];
    
    if (!networkCode) {
      console.log('❌ Invalid network:', network);
      return res.status(400).json({
        success: false,
        message: 'Invalid network'
      });
    }

    const productTypes = {
      mtn: ['mtn_gifting', 'mtn_cg'],
      glo: ['glo_gifting', 'glo_cg'],
      airtel: ['airtel_gifting', 'airtel_cg'],
      '9mobile': ['9mobile_gifting']
    };

    const types = productTypes[network.toLowerCase()] || [];
    console.log('📦 Product types to fetch:', types);
    
    const allPlans = [];

    for (const productType of types) {
      try {
        const url = `${EASYACCESS_CONFIG.BASE_URL}/get_plans.php?product_type=${productType}`;
        
        console.log(`\n🔄 Fetching ${productType}...`);
        console.log('URL:', url);
        console.log('Headers:', {
          'AuthorizationToken': EASYACCESS_CONFIG.TOKEN,
          'cache-control': 'no-cache'
        });
        
        const response = await axios.get(url, {
          headers: {
            'AuthorizationToken': EASYACCESS_CONFIG.TOKEN,
            'cache-control': 'no-cache'
          },
          timeout: 30000
        });

        console.log(`✅ ${productType} Response Status:`, response.status);
        console.log(`✅ ${productType} Response Data:`, JSON.stringify(response.data, null, 2));

        let data = response.data;
        
        if (typeof data === 'string') {
          try {
            data = JSON.parse(data);
          } catch (e) {
            console.error(`❌ Failed to parse ${productType} response`);
            continue;
          }
        }

        const networkPlans = data[network.toUpperCase()];
        
        console.log(`📦 ${productType}: Found ${networkPlans?.length || 0} plans`);
        
        if (networkPlans && Array.isArray(networkPlans)) {
          networkPlans.forEach((plan) => {
            const providerCost = parseFloat(plan.price);
            const pricing = calculateCustomerPrice(providerCost, 'data');
            
            allPlans.push({
              id: `ea_${plan.plan_id}`,
              planId: plan.plan_id,
              name: plan.name,
              dataSize: plan.name.split(' ')[0],
              providerCost: pricing.providerCost,
              customerPrice: pricing.customerPrice,
              profit: pricing.profit,
              amount: pricing.providerCost,
              validity: plan.validity || '30 days',
              network: network.toLowerCase(),
              provider: 'easyaccess',
              type: productType.includes('gifting') ? 'gift' : 'cg',
              active: true
            });
          });
        }
      } catch (error) {
        console.error(`\n❌ === ERROR FETCHING ${productType} ===`);
        console.error('Error Message:', error.message);
        console.error('Error Response:', error.response?.data);
        console.error('Error Status:', error.response?.status);
        
        if (error.response?.data?.message?.includes('Not an API User')) {
          console.error('🚨 CRITICAL: EasyAccess account not activated!');
          console.error('🚨 Action Required: Contact EasyAccess support');
        }
      }
    }

    console.log(`\n✅ Total plans loaded: ${allPlans.length}`);

    res.json({
      success: true,
      plans: allPlans,
      count: allPlans.length
    });

  } catch (error) {
    console.error('\n❌ === PLANS ENDPOINT ERROR ===');
    console.error('Error:', error.message);
    
    res.status(500).json({
      success: false,
      message: 'Failed to fetch EasyAccess plans',
      error: error.message
    });
  }
});

module.exports = router;