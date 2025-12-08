const axios = require('axios');
require('dotenv').config();

async function viewAllPrices() {
  try {
    const userId = process.env.CLUBKONNECT_USER_ID;
    const apiKey = process.env.CLUBKONNECT_API_KEY;
    
    console.log('🔍 Fetching ALL prices from ClubConnect...\n');
    
    const url = `https://www.nellobytesystems.com/APIDatabundlePlansV2.asp?UserID=${userId}&APIKey=${apiKey}`;
    const response = await axios.get(url, { timeout: 30000 });
    const data = response.data;
    
    if (!data.MOBILE_NETWORK) {
      console.log('❌ Invalid response format');
      return;
    }
    
    let totalPlans = 0;
    
    // Loop through each network
    for (const [networkName, networkArray] of Object.entries(data.MOBILE_NETWORK)) {
      console.log('\n' + '═'.repeat(80));
      console.log(`📡 ${networkName} PLANS`);
      console.log('═'.repeat(80));
      
      if (!networkArray[0] || !networkArray[0].PRODUCT) {
        console.log('⚠️  No products found');
        continue;
      }
      
      const products = networkArray[0].PRODUCT;
      console.log(`Total plans: ${products.length}\n`);
      
      // Table header
      console.log('ID'.padEnd(12) + '| ' + 'Plan Name'.padEnd(50) + '| ' + 'Price');
      console.log('─'.repeat(80));
      
      // Show all products
      products.forEach((plan, index) => {
        const id = plan.PRODUCT_ID || 'N/A';
        const name = plan.PRODUCT_NAME || 'Unknown';
        const price = plan.PRODUCT_AMOUNT || '0';
        
        console.log(
          id.padEnd(12) + '| ' + 
          name.substring(0, 50).padEnd(50) + '| ' + 
          `₦${price}`
        );
      });
      
      totalPlans += products.length;
      console.log('─'.repeat(80));
      console.log(`Subtotal: ${products.length} plans\n`);
    }
    
    console.log('\n' + '═'.repeat(80));
    console.log(`📊 TOTAL: ${totalPlans} plans across all networks`);
    console.log('═'.repeat(80) + '\n');
    
    // Optional: Save to file
    const fs = require('fs');
    const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
    const filename = `clubconnect-prices-${timestamp}.json`;
    
    fs.writeFileSync(filename, JSON.stringify(data, null, 2));
    console.log(`💾 Full data saved to: ${filename}\n`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
  }
}

viewAllPrices();