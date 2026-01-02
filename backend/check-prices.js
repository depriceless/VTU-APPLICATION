// check-prices.js
// Run this script with: node check-prices.js

const axios = require('axios');

const EASYACCESS_TOKEN = '3e17bad4c941d642424fc7a60320b622';
const BASE_URL = 'https://easyaccess.com.ng/api';

async function checkPrice(productType) {
  try {
    console.log(`\n🔍 Checking ${productType.toUpperCase()} prices...`);
    
    const response = await axios.get(
      `${BASE_URL}/get_plans.php?product_type=${productType}`,
      {
        headers: {
          'AuthorizationToken': EASYACCESS_TOKEN,
          'cache-control': 'no-cache'
        },
        timeout: 10000
      }
    );

    console.log(`✅ Response received for ${productType.toUpperCase()}`);
    console.log('Raw Response:', JSON.stringify(response.data, null, 2));
    
    return { product: productType, data: response.data, success: true };
  } catch (error) {
    console.error(`❌ Error fetching ${productType.toUpperCase()}:`, error.message);
    return { product: productType, error: error.message, success: false };
  }
}

async function main() {
  console.log('═══════════════════════════════════════════════════');
  console.log('   EASYACCESS API LIVE PRICE CHECKER');
  console.log('═══════════════════════════════════════════════════');
  console.log(`Token: ${EASYACCESS_TOKEN}`);
  console.log(`Base URL: ${BASE_URL}`);
  console.log('═══════════════════════════════════════════════════\n');

  const products = ['waec', 'neco', 'nabteb', 'nbais'];
  const results = [];

  for (const product of products) {
    const result = await checkPrice(product);
    results.push(result);
    await new Promise(resolve => setTimeout(resolve, 500)); // 500ms delay between requests
  }

  console.log('\n\n═══════════════════════════════════════════════════');
  console.log('   SUMMARY OF PRICES');
  console.log('═══════════════════════════════════════════════════\n');

  results.forEach(result => {
    if (result.success) {
      console.log(`✅ ${result.product.toUpperCase()}:`);
      
      // Try to extract price from response
      if (typeof result.data === 'string') {
        console.log(`   Response: ${result.data}`);
      } else if (result.data && typeof result.data === 'object') {
        if (result.data.price) {
          console.log(`   Price: ₦${result.data.price}`);
        } else if (result.data.success === 'true' || result.data.success === true) {
          console.log(`   Status: Available (check raw response for price)`);
        } else {
          console.log(`   Data:`, JSON.stringify(result.data, null, 2));
        }
      }
    } else {
      console.log(`❌ ${result.product.toUpperCase()}: ${result.error}`);
    }
    console.log('');
  });

  console.log('═══════════════════════════════════════════════════');
  console.log('   EXPECTED PRICES (From Documentation)');
  console.log('═══════════════════════════════════════════════════');
  console.log('WAEC:   ₦3,300 per pin');
  console.log('NECO:   ₦1,150 per token');
  console.log('NABTEB: ₦830 per pin');
  console.log('NBAIS:  ₦900 per pin');
  console.log('═══════════════════════════════════════════════════\n');
}

main().catch(console.error);