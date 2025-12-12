// scripts/test-smile-bundles.js
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const axios = require('axios');

const CK_USER_ID = process.env.CLUBKONNECT_USER_ID;
const CK_API_KEY = process.env.CLUBKONNECT_API_KEY;

async function testSmileBundles() {
  console.log('🧪 Testing Smile Bundles Endpoint...\n');
  
  if (!CK_USER_ID || !CK_API_KEY) {
    console.error('❌ Credentials not loaded!');
    process.exit(1);
  }
  
  // 🔥 Correct endpoint for Smile
  const url = `https://www.nellobytesystems.com/APISmileBundlesV1.asp?UserID=${CK_USER_ID}&APIKey=${CK_API_KEY}`;
  
  console.log('📡 Request URL:', url);
  console.log('⏳ Fetching...\n');

  try {
    const response = await axios.get(url, { timeout: 30000 });
    
    console.log('✅ Response Status:', response.status);
    
    let data = response.data;
    if (typeof data === 'string') {
      data = JSON.parse(data);
    }

    console.log('\n📋 TOP-LEVEL KEYS:', Object.keys(data));
    console.log('\n📄 FULL RESPONSE:\n', JSON.stringify(data, null, 2));

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
  }
}

testSmileBundles();