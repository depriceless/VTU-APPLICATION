// scripts/test-smile-plans.js
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') }); // Load from parent directory
const axios = require('axios');

const CK_USER_ID = process.env.CLUBKONNECT_USER_ID;
const CK_API_KEY = process.env.CLUBKONNECT_API_KEY;

async function testSmilePlans() {
  console.log('🧪 Testing ClubKonnect Smile Plans API...\n');
  
  console.log('🔍 Debug - Environment variables:');
  console.log('User ID from env:', CK_USER_ID || 'NOT LOADED');
  console.log('API Key from env:', CK_API_KEY ? CK_API_KEY.substring(0, 10) + '...' : 'NOT LOADED');
  console.log('');
  
  if (!CK_USER_ID || !CK_API_KEY || CK_USER_ID === 'YOUR_USER_ID') {
    console.error('❌ ERROR: Credentials not loaded from .env file!');
    console.error('Make sure your .env file exists in the backend folder');
    console.error('Expected location:', path.join(__dirname, '..', '.env'));
    process.exit(1);
  }
  
  const url = `https://www.nellobytesystems.com/APIDatabundlePlansV2.asp?UserID=${CK_USER_ID}`;
  
  console.log('📡 Request URL:', url);
  console.log('⏳ Fetching...\n');

  try {
    const response = await axios.get(url, {
      timeout: 30000,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'VTU-App/1.0'
      }
    });

    console.log('✅ Response Status:', response.status);
    console.log('📦 Response Type:', typeof response.data);
    
    let data = response.data;
    
    if (typeof data === 'string') {
      console.log('📄 Raw response (first 500 chars):\n', data.substring(0, 500));
      try {
        data = JSON.parse(data);
        console.log('✅ Successfully parsed JSON');
      } catch (e) {
        console.error('❌ JSON Parse Error:', e.message);
        return;
      }
    }

    console.log('\n📋 TOP-LEVEL KEYS:', Object.keys(data));
    
    // Don't print full structure if it's huge, just show structure
    const structureSample = JSON.stringify(data, null, 2);
    if (structureSample.length > 2000) {
      console.log('\n📄 Response structure (truncated to 2000 chars):');
      console.log(structureSample.substring(0, 2000) + '\n... [truncated]');
    } else {
      console.log('\n📄 FULL RESPONSE STRUCTURE:');
      console.log(structureSample);
    }

    if (data.MOBILE_NETWORK) {
      console.log('\n✅ Found MOBILE_NETWORK key');
      console.log('📋 MOBILE_NETWORK sub-keys:', Object.keys(data.MOBILE_NETWORK));
      
      const possibleSmileKeys = [
        'SMILE-DIRECT', 'smile-direct', 'SMILE', 'smile',
        'Smile', 'smile_direct', 'SMILEDIRECT'
      ];
      
      for (const key of possibleSmileKeys) {
        if (data.MOBILE_NETWORK[key]) {
          console.log(`\n✅ Found Smile plans under: MOBILE_NETWORK.${key}`);
          console.log(`📊 Number of plans: ${data.MOBILE_NETWORK[key].length}`);
          console.log('\n📄 First 3 plans:');
          console.log(JSON.stringify(data.MOBILE_NETWORK[key].slice(0, 3), null, 2));
          return;
        }
      }
      
      console.log('\n❌ Smile not found under MOBILE_NETWORK');
      console.log('Available keys:', Object.keys(data.MOBILE_NETWORK));
    } else {
      console.log('\n⚠️  No MOBILE_NETWORK key found');
      console.log('📄 Checking root-level keys...');
      
      const possibleSmileKeys = [
        'SMILE-DIRECT', 'smile-direct', 'SMILE', 'smile'
      ];
      
      for (const key of possibleSmileKeys) {
        if (data[key]) {
          console.log(`\n✅ Found Smile plans at root: ${key}`);
          console.log(`📊 Number of plans:`, Array.isArray(data[key]) ? data[key].length : 'Not an array');
          if (Array.isArray(data[key])) {
            console.log('\n📄 First 3 plans:');
            console.log(JSON.stringify(data[key].slice(0, 3), null, 2));
          }
          return;
        }
      }
      
      console.log('\n❌ No Smile plans found');
      console.log('All available keys at root:', Object.keys(data));
    }

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    if (error.response) {
      console.error('📄 Response Status:', error.response.status);
      console.error('📄 Response Data:', error.response.data);
    }
  }
}

testSmilePlans();