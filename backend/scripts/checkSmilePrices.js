// ============================================
// Smile Internet API Price Checker Script
// ============================================
require('dotenv').config(); // Load .env file
const axios = require('axios');
const fs = require('fs');

const CK_CONFIG = {
  userId: process.env.CLUBKONNECT_USER_ID,
  apiKey: process.env.CLUBKONNECT_API_KEY,
  baseUrl: 'https://www.nellobytesystems.com'
};

// Validate credentials exist
if (!CK_CONFIG.userId || !CK_CONFIG.apiKey) {
  console.error('❌ Missing credentials!');
  console.error('Please set CLUBKONNECT_USER_ID and CLUBKONNECT_API_KEY in your .env file\n');
  process.exit(1);
}

async function checkSmilePrices() {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║   SMILE INTERNET PRICE CHECKER         ║');
  console.log('╚════════════════════════════════════════╝\n');

  try {
    const url = `${CK_CONFIG.baseUrl}/APISmilePackagesV2.asp?UserID=${CK_CONFIG.userId}&APIKey=${CK_CONFIG.apiKey}`;
    
    console.log('🔍 Fetching live prices from ClubKonnect...');
    console.log('📡 URL:', url.replace(CK_CONFIG.apiKey, '***HIDDEN***'));
    console.log('');
    
    const response = await axios.get(url, { timeout: 30000 });
    let data = response.data;

    // Save raw response for inspection
    fs.writeFileSync('smile_api_response.json', JSON.stringify(data, null, 2));
    console.log('💾 Raw API response saved to: smile_api_response.json\n');

    if (typeof data === 'string') {
      try {
        data = JSON.parse(data);
      } catch (e) {
        console.error('❌ Failed to parse JSON response');
        console.log('Raw response:', data.substring(0, 500));
        return;
      }
    }

    if (data.status === 'AUTHENTICATION_FAILED_1') {
      console.error('❌ Authentication failed!');
      console.error('Please check your CLUBKONNECT_USER_ID and CLUBKONNECT_API_KEY\n');
      return;
    }

    console.log('✅ Successfully fetched API data');
    console.log('📋 Response structure:');
    console.log('   Keys:', Object.keys(data));
    console.log('');

    // Try to find plans in different structures
    const apiPlans = [];
    
    // Method 1: Check SMILE_ID array
    if (data.SMILE_ID && Array.isArray(data.SMILE_ID)) {
      console.log('✅ Found SMILE_ID array with', data.SMILE_ID.length, 'items');
      
      data.SMILE_ID.forEach((categoryGroup, idx) => {
        console.log(`   Category ${idx}:`, Object.keys(categoryGroup));
        
        if (categoryGroup.PRODUCT && Array.isArray(categoryGroup.PRODUCT)) {
          console.log(`      └─ PRODUCT array with ${categoryGroup.PRODUCT.length} plans`);
          
          categoryGroup.PRODUCT.forEach(plan => {
            apiPlans.push({
              id: plan.PACKAGE_ID || plan.package_id || plan.id,
              name: plan.PACKAGE_NAME || plan.package_name || plan.name,
              amount: parseFloat(plan.PACKAGE_AMOUNT || plan.package_amount || plan.amount || 0)
            });
          });
        }
      });
    }
    
    // Method 2: Check direct PRODUCT array
    if (data.PRODUCT && Array.isArray(data.PRODUCT)) {
      console.log('✅ Found direct PRODUCT array with', data.PRODUCT.length, 'plans');
      data.PRODUCT.forEach(plan => {
        apiPlans.push({
          id: plan.PACKAGE_ID || plan.package_id || plan.id,
          name: plan.PACKAGE_NAME || plan.package_name || plan.name,
          amount: parseFloat(plan.PACKAGE_AMOUNT || plan.package_amount || plan.amount || 0)
        });
      });
    }

    // Method 3: Check if response is array itself
    if (Array.isArray(data)) {
      console.log('✅ Response is an array with', data.length, 'items');
      data.forEach(plan => {
        apiPlans.push({
          id: plan.PACKAGE_ID || plan.package_id || plan.id,
          name: plan.PACKAGE_NAME || plan.package_name || plan.name,
          amount: parseFloat(plan.PACKAGE_AMOUNT || plan.package_amount || plan.amount || 0)
        });
      });
    }

    console.log('');
    console.log('📦 Total plans extracted:', apiPlans.length);
    console.log('');

    if (apiPlans.length === 0) {
      console.log('⚠️  NO PLANS FOUND IN API RESPONSE!');
      console.log('');
      console.log('🔍 Full response structure:');
      console.log(JSON.stringify(data, null, 2).substring(0, 1000));
      console.log('');
      console.log('💡 Check smile_api_response.json for full response');
      console.log('');
      return;
    }

    // Show first 5 plans as sample
    console.log('📋 Sample plans from API:');
    console.log('─'.repeat(80));
    apiPlans.slice(0, 5).forEach(plan => {
      console.log(`ID: ${plan.id} | ₦${plan.amount.toLocaleString()} | ${plan.name}`);
    });
    console.log('');

    // Compare with hardcoded prices
    const YOUR_PRICES = {
      '624': 450, '625': 750, '626': 750, '627': 1550, '628': 2300,
      '606': 1550, '607': 1850, '608': 2300, '620': 3100, '609': 3800,
      '722': 4600, '723': 6200, '724': 8000, '725': 9500, '615': 12500,
      '616': 15500, '617': 21000, '618': 23000, '619': 27500, '668': 30500,
      '730': 18500, '729': 27700, '726': 38500, '727': 46500, '728': 61500,
      '665': 31000, '666': 53000, '667': 62000, '721': 77000,
      '687': 14000, '688': 29000, '689': 49500, '664': 77000,
      '604': 107000, '673': 154000, '674': 185000,
      '747': 900, '748': 1850, '749': 5700, '750': 2700,
      '751': 7200, '752': 3600, '753': 9000, '758': 5000
    };

    console.log('═══════════════════════════════════════════════════════════════════════════════');
    console.log('PLAN ID  │ PLAN NAME                    │ API PRICE  │ YOUR PRICE │ DIFFERENCE');
    console.log('═══════════════════════════════════════════════════════════════════════════════');

    let matchCount = 0;
    let mismatchCount = 0;
    let newInApi = 0;

    apiPlans.forEach(apiPlan => {
      const yourPrice = YOUR_PRICES[apiPlan.id];
      
      if (yourPrice !== undefined) {
        const diff = yourPrice - apiPlan.amount;
        const diffSymbol = diff === 0 ? '✓' : (diff > 0 ? '↑' : '↓');
        const diffColor = diff === 0 ? '' : (diff > 0 ? '+' : '');
        
        console.log(
          `${String(apiPlan.id).padEnd(8)} │ ${String(apiPlan.name).substring(0, 28).padEnd(28)} │ ₦${apiPlan.amount.toLocaleString().padEnd(9)} │ ₦${yourPrice.toLocaleString().padEnd(9)} │ ${diffSymbol} ${diffColor}₦${Math.abs(diff).toLocaleString()}`
        );

        if (diff === 0) matchCount++;
        else mismatchCount++;
      } else {
        console.log(
          `${String(apiPlan.id).padEnd(8)} │ ${String(apiPlan.name).substring(0, 28).padEnd(28)} │ ₦${apiPlan.amount.toLocaleString().padEnd(9)} │ NOT IN CODE │ ⚠️  NEW`
        );
        newInApi++;
      }
    });

    console.log('\n═══════════════════════════════════════════════════════════════════════════════');
    console.log('📊 SUMMARY');
    console.log('═══════════════════════════════════════════════════════════════════════════════');
    console.log(`✅ Matching prices:        ${matchCount}`);
    console.log(`⚠️  Price differences:      ${mismatchCount}`);
    console.log(`🆕 New plans in API:       ${newInApi}`);
    console.log(`📦 Total API plans:        ${apiPlans.length}`);
    console.log(`📦 Total your plans:       ${Object.keys(YOUR_PRICES).length}`);
    console.log('═══════════════════════════════════════════════════════════════════════════════\n');

    // Save comparison report
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        matching: matchCount,
        mismatches: mismatchCount,
        newPlans: newInApi,
        totalApi: apiPlans.length,
        totalYours: Object.keys(YOUR_PRICES).length
      },
      apiPlans: apiPlans,
      yourPrices: YOUR_PRICES
    };
    
    fs.writeFileSync('price_comparison_report.json', JSON.stringify(report, null, 2));
    console.log('💾 Full comparison saved to: price_comparison_report.json\n');

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    if (error.response) {
      console.error('Response Status:', error.response.status);
      console.error('Response Headers:', error.response.headers);
      console.error('Response Data:', JSON.stringify(error.response.data).substring(0, 500));
    }
    console.log('\n💡 Troubleshooting:');
    console.log('   1. Check your .env file has correct credentials');
    console.log('   2. Verify ClubKonnect API is accessible');
    console.log('   3. Check smile_api_response.json for raw response\n');
  }
}

// Run the checker
checkSmilePrices();

module.exports = { checkSmilePrices };