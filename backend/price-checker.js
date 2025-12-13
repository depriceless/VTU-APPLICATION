// Test script to get current Smile prices
const axios = require('axios');

async function getClubKonnectSmilePrices() {
  try {
    const url = 'https://www.nellobytesystems.com/APISmilePackagesV2.asp';
    const params = {
      UserID: process.env.CLUBKONNECT_USER_ID,
      APIKey: process.env.CLUBKONNECT_API_KEY
    };

    const response = await axios.get(url, { params });
    
    let data = response.data;
    if (typeof data === 'string') {
      data = JSON.parse(data);
    }

    console.log('ClubKonnect Smile Prices:');
    console.log(JSON.stringify(data, null, 2));
    
    // Extract plan prices
    if (data.SMILE_ID && Array.isArray(data.SMILE_ID)) {
      data.SMILE_ID.forEach(category => {
        if (category.PRODUCT && Array.isArray(category.PRODUCT)) {
          category.PRODUCT.forEach(plan => {
            console.log(`Plan ID: ${plan.PACKAGE_ID} | Name: ${plan.PACKAGE_NAME} | Price: ₦${plan.PACKAGE_AMOUNT}`);
          });
        }
      });
    }
    
    return data;
  } catch (error) {
    console.error('Error fetching prices:', error.message);
  }
}

getClubKonnectSmilePrices();