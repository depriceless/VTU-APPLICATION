const axios = require('axios');
require('dotenv').config();

async function testAPI() {
  try {
    const userId = process.env.CLUBKONNECT_USER_ID;
    const apiKey = process.env.CLUBKONNECT_API_KEY;
    
    const url = `https://www.nellobytesystems.com/APIDatabundlePlansV2.asp?UserID=${userId}&APIKey=${apiKey}`;
    console.log('Fetching from ClubConnect...');
    console.log('UserID:', userId);
    console.log('APIKey:', apiKey ? 'Set ✅' : 'Missing ❌');
    
    const response = await axios.get(url);
    
    console.log('\n=== RAW RESPONSE (First 500 chars) ===');
    const responseStr = JSON.stringify(response.data, null, 2);
    console.log(responseStr.substring(0, 500));
    console.log('...(truncated)');
    
    console.log('\n=== RESPONSE TYPE ===');
    console.log('Type:', typeof response.data);
    
    if (typeof response.data === 'object') {
      console.log('\n=== TOP LEVEL KEYS ===');
      console.log('Keys:', Object.keys(response.data));
      
      console.log('\n=== SAMPLE DATA ===');
      const keys = Object.keys(response.data);
      if (keys.length > 0) {
        const firstKey = keys[0];
        console.log(`Network code: ${firstKey}`);
        
        const plans = response.data[firstKey];
        if (Array.isArray(plans) && plans.length > 0) {
          console.log('Sample plan:', JSON.stringify(plans[0], null, 2));
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
  }
}

testAPI();