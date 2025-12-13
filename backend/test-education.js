// TEST SCRIPT: Save as test-education.js in your backend root folder
// Run with: node test-education.js

require('dotenv').config();
const axios = require('axios');

const CK_CONFIG = {
  userId: process.env.CLUBKONNECT_USER_ID,
  apiKey: process.env.CLUBKONNECT_API_KEY,
  baseUrl: process.env.CLUBKONNECT_BASE_URL || 'https://www.nellobytesystems.com'
};

console.log('🔍 Testing Education Packages Endpoint\n');
console.log('ClubKonnect Config:');
console.log('  User ID:', CK_CONFIG.userId ? '✅ Set' : '❌ Missing');
console.log('  API Key:', CK_CONFIG.apiKey ? '✅ Set (length: ' + CK_CONFIG.apiKey?.length + ')' : '❌ Missing');
console.log('  Base URL:', CK_CONFIG.baseUrl);
console.log('');

async function testWAEC() {
  try {
    const url = `${CK_CONFIG.baseUrl}/APIWAECPackagesV2.asp?UserID=${CK_CONFIG.userId}`;
    console.log('📡 Testing WAEC endpoint...');
    console.log('URL:', url);
    
    const response = await axios.get(url, { timeout: 10000 });
    
    console.log('Status:', response.status);
    console.log('Response type:', typeof response.data);
    
    let data = response.data;
    if (typeof data === 'string') {
      try {
        data = JSON.parse(data);
        console.log('✅ Parsed JSON successfully');
      } catch (e) {
        console.log('❌ Could not parse response as JSON');
        console.log('Raw response:', data.substring(0, 200));
        return { success: false, packages: [] };
      }
    }
    
    console.log('Response structure:', Object.keys(data));
    
    if (data.WAEC && Array.isArray(data.WAEC)) {
      console.log('✅ WAEC array found with', data.WAEC.length, 'items');
      
      const packages = [];
      data.WAEC.forEach((service, idx) => {
        console.log(`  Service ${idx}:`, Object.keys(service));
        if (service.PRODUCT && Array.isArray(service.PRODUCT)) {
          console.log(`    Products:`, service.PRODUCT.length);
          service.PRODUCT.forEach(product => {
            packages.push({
              id: product.PACKAGE_ID || product.package_id,
              name: product.PACKAGE_NAME || product.name,
              price: product.PACKAGE_AMOUNT || product.amount
            });
          });
        }
      });
      
      console.log('✅ Total packages extracted:', packages.length);
      packages.forEach(pkg => {
        console.log(`  - ${pkg.name}: ₦${pkg.price} (ID: ${pkg.id})`);
      });
      
      return { success: true, packages };
    } else {
      console.log('❌ No WAEC array in response');
      console.log('Full response:', JSON.stringify(data, null, 2));
      return { success: false, packages: [] };
    }
    
  } catch (error) {
    console.error('❌ WAEC test failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    return { success: false, packages: [] };
  }
}

async function testJAMB() {
  try {
    const url = `${CK_CONFIG.baseUrl}/APIJAMBPackagesV2.asp?UserID=${CK_CONFIG.userId}`;
    console.log('\n📡 Testing JAMB endpoint...');
    console.log('URL:', url);
    
    const response = await axios.get(url, { timeout: 10000 });
    
    console.log('Status:', response.status);
    console.log('Response type:', typeof response.data);
    
    let data = response.data;
    if (typeof data === 'string') {
      try {
        data = JSON.parse(data);
        console.log('✅ Parsed JSON successfully');
      } catch (e) {
        console.log('❌ Could not parse response as JSON');
        console.log('Raw response:', data.substring(0, 200));
        return { success: false, packages: [] };
      }
    }
    
    console.log('Response structure:', Object.keys(data));
    
    if (data.JAMB && Array.isArray(data.JAMB)) {
      console.log('✅ JAMB array found with', data.JAMB.length, 'items');
      
      const packages = [];
      data.JAMB.forEach((service, idx) => {
        console.log(`  Service ${idx}:`, Object.keys(service));
        if (service.PRODUCT && Array.isArray(service.PRODUCT)) {
          console.log(`    Products:`, service.PRODUCT.length);
          service.PRODUCT.forEach(product => {
            packages.push({
              id: product.PACKAGE_ID || product.package_id,
              name: product.PACKAGE_NAME || product.name,
              price: product.PACKAGE_AMOUNT || product.amount
            });
          });
        }
      });
      
      console.log('✅ Total packages extracted:', packages.length);
      packages.forEach(pkg => {
        console.log(`  - ${pkg.name}: ₦${pkg.price} (ID: ${pkg.id})`);
      });
      
      return { success: true, packages };
    } else {
      console.log('❌ No JAMB array in response');
      console.log('Full response:', JSON.stringify(data, null, 2));
      return { success: false, packages: [] };
    }
    
  } catch (error) {
    console.error('❌ JAMB test failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    return { success: false, packages: [] };
  }
}

// Run tests
(async () => {
  console.log('═══════════════════════════════════════\n');
  
  const waecResult = await testWAEC();
  const jambResult = await testJAMB();
  
  console.log('\n═══════════════════════════════════════');
  console.log('📊 SUMMARY');
  console.log('═══════════════════════════════════════');
  console.log('WAEC:', waecResult.success ? `✅ ${waecResult.packages.length} packages` : '❌ Failed');
  console.log('JAMB:', jambResult.success ? `✅ ${jambResult.packages.length} packages` : '❌ Failed');
  console.log('Total:', waecResult.packages.length + jambResult.packages.length, 'packages');
  console.log('═══════════════════════════════════════\n');
  
  if (!waecResult.success && !jambResult.success) {
    console.log('⚠️  ACTION REQUIRED:');
    console.log('1. Check your .env file has correct CLUBKONNECT_USER_ID');
    console.log('2. Verify your ClubKonnect account is active');
    console.log('3. Check if ClubKonnect API is accessible from your server');
    console.log('4. Try accessing the URLs in a browser to see raw response');
  }
})();