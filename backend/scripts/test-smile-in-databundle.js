// scripts/test-smile-in-databundle.js
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const axios = require('axios');

const CK_USER_ID = process.env.CLUBKONNECT_USER_ID;
const CK_API_KEY = process.env.CLUBKONNECT_API_KEY;

async function testSmileInDatabundle() {
  console.log('🧪 Looking for Smile in Databundle Endpoint...\n');
  
  if (!CK_USER_ID || !CK_API_KEY) {
    console.error('❌ Credentials not loaded!');
    process.exit(1);
  }
  
  // Test the databundle endpoint
  const url = `https://www.nellobytesystems.com/APIDatabundlePlansV2.asp?UserID=${CK_USER_ID}`;
  
  console.log('📡 Fetching all network plans...\n');

  try {
    const response = await axios.get(url, { timeout: 30000 });
    
    let data = response.data;
    if (typeof data === 'string') {
      data = JSON.parse(data);
    }

    console.log('📋 Available networks:', Object.keys(data));
    
    if (data.MOBILE_NETWORK) {
      console.log('\n📋 Networks in MOBILE_NETWORK:', Object.keys(data.MOBILE_NETWORK));
      
      // Check each network
      for (const networkKey of Object.keys(data.MOBILE_NETWORK)) {
        const network = data.MOBILE_NETWORK[networkKey];
        console.log(`\n🔍 Checking ${networkKey}...`);
        
        if (Array.isArray(network)) {
          console.log(`   Structure: Direct array with ${network.length} items`);
          if (network[0]) {
            console.log('   First item keys:', Object.keys(network[0]));
          }
        } else if (network.ID && network.PRODUCT) {
          console.log(`   Structure: Has ID "${network.ID}" and PRODUCT array`);
          console.log(`   Number of products: ${network.PRODUCT?.length || 0}`);
          
          // Check if this might be Smile
          if (networkKey.toLowerCase().includes('smile') || 
              network.ID === 'smile' || 
              network.ID === 'SMILE') {
            console.log('   ✅ THIS MIGHT BE SMILE!');
            console.log('   Sample product:', JSON.stringify(network.PRODUCT?.[0], null, 2));
          }
        }
      }
    }
    
    // Also check root level for any Smile keys
    console.log('\n🔍 Checking root level for Smile keys...');
    const smileKeys = Object.keys(data).filter(k => 
      k.toLowerCase().includes('smile')
    );
    
    if (smileKeys.length > 0) {
      console.log('✅ Found Smile-related keys:', smileKeys);
      smileKeys.forEach(key => {
        console.log(`\n${key}:`, JSON.stringify(data[key], null, 2).substring(0, 500));
      });
    } else {
      console.log('❌ No Smile keys found at root level');
    }

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
  }
}

testSmileInDatabundle();