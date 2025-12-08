const mongoose = require('mongoose');
const axios = require('axios');
const DataPlan = require('../models/DataPlan');
require('dotenv').config();

const CLUBKONNECT_CONFIG = {
  userId: process.env.CLUBKONNECT_USER_ID,
  apiKey: process.env.CLUBKONNECT_API_KEY,
  baseUrl: 'https://www.nellobytesystems.com'
};

// Network name mapping
const NETWORK_MAP = {
  'MTN': 'mtn',
  'GLO': 'glo',
  'Glo': 'glo',
  '9MOBILE': '9mobile',
  '9mobile': '9mobile',
  'm_9mobile': '9mobile',  // ← ADD THIS LINE
  'AIRTEL': 'airtel',
  'Airtel': 'airtel'
};

async function syncPlansFromClubConnect() {
  try {
    console.log('🔄 Starting ClubConnect sync...\n');

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Connected to MongoDB\n');

    // Fetch plans from ClubConnect
    const url = `${CLUBKONNECT_CONFIG.baseUrl}/APIDatabundlePlansV2.asp?UserID=${CLUBKONNECT_CONFIG.userId}&APIKey=${CLUBKONNECT_CONFIG.apiKey}`;
    console.log('📡 Fetching plans from ClubConnect...');
    
    const response = await axios.get(url, { timeout: 30000 });
    
    let plansData = response.data;
    
    // Parse if string
    if (typeof plansData === 'string') {
      plansData = JSON.parse(plansData);
    }

    console.log('✅ Plans fetched from ClubConnect\n');

    if (!plansData || !plansData.MOBILE_NETWORK) {
      throw new Error('Invalid response format from ClubConnect');
    }

    let totalUpdated = 0;
    let totalNew = 0;
    let totalFailed = 0;
    let priceChanges = [];

    const mobileNetworks = plansData.MOBILE_NETWORK;

    // Process each network
    for (const [networkName, networkArray] of Object.entries(mobileNetworks)) {
      const normalizedNetwork = NETWORK_MAP[networkName];
      
      if (!normalizedNetwork) {
        console.log(`⚠️  Skipping unknown network: ${networkName}`);
        continue;
      }

      console.log(`📡 Processing ${normalizedNetwork.toUpperCase()} plans...`);

      if (!Array.isArray(networkArray) || networkArray.length === 0) {
        console.log(`⚠️  No data for ${normalizedNetwork}`);
        continue;
      }

      // Get the network object (should be first item in array)
      const networkData = networkArray[0];
      
      if (!networkData.PRODUCT || !Array.isArray(networkData.PRODUCT)) {
        console.log(`⚠️  No products for ${normalizedNetwork}`);
        continue;
      }

      const products = networkData.PRODUCT;

      for (const product of products) {
        try {
          const planId = product.PRODUCT_ID;
          const planName = product.PRODUCT_NAME;
        const planAmount = Math.round(parseFloat(product.PRODUCT_AMOUNT));

          if (!planId || !planName || isNaN(planAmount)) {
            console.log(`⚠️  Skipping invalid product: ${JSON.stringify(product)}`);
            continue;
          }

          // Find existing plan
          const existingPlan = await DataPlan.findOne({
            network: normalizedNetwork,
            planId: planId
          });

          // Determine category and validity from plan name
          const { category, validity, dataSize } = parsePlanDetails(planName);

          const planData = {
            planId: planId,
            network: normalizedNetwork,
            name: planName,
            dataSize: dataSize,
            validity: validity,
            providerCost: planAmount,
            category: category,
            active: true,
            popular: false,
            lastUpdated: new Date()
          };

          if (existingPlan) {
            // Check if price changed
            if (existingPlan.providerCost !== planAmount) {
              priceChanges.push({
                network: normalizedNetwork,
                planId: planId,
                planName: planName,
                oldPrice: existingPlan.providerCost,
                newPrice: planAmount
              });
            }

            // Update existing plan
            await DataPlan.updateOne(
              { _id: existingPlan._id },
              { $set: planData }
            );
            totalUpdated++;
          } else {
            // Create new plan
            await DataPlan.create(planData);
            totalNew++;
          }

          process.stdout.write('.');
        } catch (error) {
          console.error(`\n❌ Error processing product:`, error.message);
          totalFailed++;
        }
      }

      console.log(` ✅ ${normalizedNetwork.toUpperCase()} done\n`);
    }

    console.log('\n📊 Sync Summary:');
    console.log(`   ✅ Updated: ${totalUpdated} plans`);
    console.log(`   ➕ New: ${totalNew} plans`);
    console.log(`   ❌ Failed: ${totalFailed} plans`);

    if (priceChanges.length > 0) {
      console.log('\n💰 Price Changes Detected:');
      priceChanges.forEach(change => {
        console.log(`   ${change.network.toUpperCase()} ${change.planName}`);
        console.log(`   ₦${change.oldPrice} → ₦${change.newPrice}`);
      });
    } else {
      console.log('\n✅ No price changes detected');
    }

    // Final stats
    const totalPlans = await DataPlan.countDocuments({ active: true });
    console.log(`\n📈 Total active plans in database: ${totalPlans}`);

    console.log('\n✅ Sync completed successfully!\n');

  } catch (error) {
    console.error('❌ Sync error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  } finally {
    await mongoose.connection.close();
    console.log('🔌 MongoDB connection closed');
    process.exit(0);
  }
}

// Helper function to parse plan details from name
function parsePlanDetails(planName) {
  const lower = planName.toLowerCase();
  
  // Extract data size (e.g., "500 MB", "1 GB", "10GB")
  let dataSize = 'Unknown';
  const sizeMatch = planName.match(/(\d+\.?\d*)\s*(MB|GB|mb|gb)/i);
  if (sizeMatch) {
    dataSize = `${sizeMatch[1]}${sizeMatch[2].toUpperCase()}`;
  }
  
  // Extract validity
  let validity = '30 days';
  let category = 'monthly';
  
  if (lower.includes('1 day') || lower.includes('daily')) {
    validity = '1 day';
    category = 'daily';
  } else if (lower.includes('2 day')) {
    validity = '2 days';
    category = 'daily';
  } else if (lower.includes('3 day')) {
    validity = '3 days';
    category = 'daily';
  } else if (lower.includes('7 day') || lower.includes('week')) {
    validity = '7 days';
    category = 'weekly';
  } else if (lower.includes('14 day')) {
    validity = '14 days';
    category = 'weekly';
  } else if (lower.includes('30 day') || lower.includes('month')) {
    validity = '30 days';
    category = 'monthly';
  } else if (lower.includes('60 day') || lower.includes('2 month')) {
    validity = '60 days';
    category = 'monthly';
  } else if (lower.includes('90 day') || lower.includes('3 month')) {
    validity = '90 days';
    category = 'monthly';
  }
  
  return { category, validity, dataSize };
}

// Run sync
syncPlansFromClubConnect();