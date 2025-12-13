// ============================================
// ClubKonnect Credentials Tester
// ============================================
require('dotenv').config();
const axios = require('axios');
const fs = require('fs');

const CK_CONFIG = {
  userId: process.env.CLUBKONNECT_USER_ID,
  apiKey: process.env.CLUBKONNECT_API_KEY,
  baseUrl: 'https://www.nellobytesystems.com'
};

console.log('\n╔════════════════════════════════════════╗');
console.log('║  CLUBKONNECT CREDENTIALS TESTER        ║');
console.log('╚════════════════════════════════════════╝\n');

console.log('📋 Loaded Credentials:');
console.log('   UserID:', CK_CONFIG.userId ? `${CK_CONFIG.userId.substring(0, 8)}...` : 'NOT SET');
console.log('   API Key:', CK_CONFIG.apiKey ? `${CK_CONFIG.apiKey.substring(0, 10)}...` : 'NOT SET');
console.log('');

if (!CK_CONFIG.userId || !CK_CONFIG.apiKey) {
  console.error('❌ Credentials not found in .env file\n');
  process.exit(1);
}

async function testAPI(endpoint, params, description) {
  console.log(`\n🧪 Testing: ${description}`);
  console.log('─'.repeat(60));
  
  try {
    const queryParams = new URLSearchParams({
      UserID: CK_CONFIG.userId,
      APIKey: CK_CONFIG.apiKey,
      ...params
    });
    
    const url = `${CK_CONFIG.baseUrl}${endpoint}?${queryParams}`;
    console.log('📡 URL:', url.replace(CK_CONFIG.apiKey, '***'));
    
    const response = await axios.get(url, { 
      timeout: 30000,
      validateStatus: () => true // Don't throw on any status
    });
    
    let data = response.data;
    if (typeof data === 'string') {
      try {
        data = JSON.parse(data);
      } catch (e) {
        console.log('⚠️  Response is not JSON:', data.substring(0, 200));
        return { success: false, error: 'Invalid JSON' };
      }
    }
    
    console.log('📥 Status:', response.status);
    console.log('📥 Response:', JSON.stringify(data, null, 2));
    
    // Check for common error responses
    if (data.status === 'AUTHENTICATION_FAILED_1') {
      console.log('❌ Authentication FAILED');
      return { success: false, error: 'Authentication failed' };
    }
    
    if (data.status === 'MISSING_USERID' || data.status === 'MISSING_APIKEY') {
      console.log('❌ Missing credentials');
      return { success: false, error: 'Missing credentials' };
    }
    
    if (data.statuscode === '100' || data.statuscode === '200' || data.status === 'success') {
      console.log('✅ SUCCESS');
      return { success: true, data };
    }
    
    // For data retrieval endpoints
    if (data.SMILE_ID || data['01'] || Object.keys(data).length > 1) {
      console.log('✅ Data received successfully');
      return { success: true, data };
    }
    
    console.log('⚠️  Unexpected response');
    return { success: false, error: 'Unexpected response', data };
    
  } catch (error) {
    console.log('❌ Error:', error.message);
    return { success: false, error: error.message };
  }
}

async function runTests() {
  const results = [];
  
  // Test 1: Check wallet balance (simplest auth test)
  results.push({
    name: 'Wallet Balance',
    result: await testAPI('/APIWalletBalanceV1.asp', {}, 'Check Wallet Balance')
  });
  
  // Test 2: Data plans (doesn't need APIKey sometimes)
  results.push({
    name: 'Data Plans',
    result: await testAPI('/APIDatabundlePlansV2.asp', {}, 'Fetch Data Plans')
  });
  
  // Test 3: Smile packages
  results.push({
    name: 'Smile Packages',
    result: await testAPI('/APISmilePackagesV2.asp', {}, 'Fetch Smile Packages')
  });
  
  // Test 4: Cable TV packages
  results.push({
    name: 'Cable TV',
    result: await testAPI('/APICableTVPackagesV2.asp', {}, 'Fetch Cable TV Packages')
  });
  
  // Summary
  console.log('\n\n╔════════════════════════════════════════╗');
  console.log('║           TEST SUMMARY                 ║');
  console.log('╚════════════════════════════════════════╝\n');
  
  results.forEach(test => {
    const status = test.result.success ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} - ${test.name}`);
    if (!test.result.success && test.result.error) {
      console.log(`      Error: ${test.result.error}`);
    }
  });
  
  const passCount = results.filter(r => r.result.success).length;
  console.log('\n' + '─'.repeat(60));
  console.log(`Results: ${passCount}/${results.length} tests passed`);
  console.log('─'.repeat(60));
  
  if (passCount === 0) {
    console.log('\n❌ ALL TESTS FAILED');
    console.log('\n💡 Possible issues:');
    console.log('   1. Invalid credentials in .env file');
    console.log('   2. ClubKonnect account not active');
    console.log('   3. Network/firewall blocking requests');
    console.log('   4. API endpoint changes');
    console.log('\n📞 Contact ClubKonnect support:');
    console.log('   - Verify your User ID and API Key');
    console.log('   - Check if your account is active');
    console.log('   - Ask for current API documentation\n');
  } else if (passCount < results.length) {
    console.log('\n⚠️  PARTIAL SUCCESS');
    console.log('Some endpoints work, check failed ones specifically\n');
  } else {
    console.log('\n✅ ALL TESTS PASSED');
    console.log('Your credentials are working correctly!\n');
  }
}

runTests();