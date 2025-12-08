const mongoose = require('mongoose');
const axios = require('axios');
const DataPlan = require('../models/DataPlan');
require('dotenv').config();

const CLUBKONNECT_CONFIG = {
  userId: process.env.CLUBKONNECT_USER_ID,
  apiKey: process.env.CLUBKONNECT_API_KEY,
  baseUrl: 'https://www.nellobytesystems.com'
};

function determinePlanType(planName) {
  const nameLower = planName.toLowerCase();
  
  if (nameLower.includes('awoof')) return 'awoof';
  
  // SME plans (includes both SME and SME2)
  if (nameLower.includes('sme') || nameLower.includes('corporate')) {
    return 'sme';
  }
  
  // Gift plans
  if (nameLower.includes('gift') || nameLower.includes('gifting')) {
    return 'gift';
  }
  
  // Direct plans (default)
  return 'direct';
}

// Helper function to parse plan details
function parsePlanDetails(planName) {
  let category = 'monthly';
  let validity = '';
  let dataSize = '';

  // Extract data size
  const dataSizeMatch = planName.match(/(\d+(?:\.\d+)?)\s*(MB|GB)/i);
  if (dataSizeMatch) {
    dataSize = dataSizeMatch[0];
  }

  // Determine category and validity based on plan name
  if (planName.match(/daily|1\s*day/i)) {
    category = 'daily';
    validity = '1 day';
  } else if (planName.match(/weekly|7\s*days?|week/i)) {
    category = 'weekly';
    validity = '7 days';
  } else if (planName.match(/(\d+)\s*days?/i)) {
    const daysMatch = planName.match(/(\d+)\s*days?/i);
    const days = parseInt(daysMatch[1]);
    
    if (days <= 1) {
      category = 'daily';
      validity = `${days} day`;
    } else if (days <= 7) {
      category = 'weekly';
      validity = `${days} days`;
    } else {
      category = 'monthly';
      validity = `${days} days`;
    }
  } else if (planName.match(/month|30\s*days?/i)) {
    category = 'monthly';
    validity = '30 days';
  }

  return { category, validity, dataSize };
}

// Main sync function
async function syncPlans() {
  let connection;
  
  try {
    console.log('🔄 Starting ClubConnect sync...');

    // Connect to MongoDB
    connection = await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Fetch plans from ClubConnect
    console.log('📡 Fetching plans from ClubConnect...');
    const url = `${CLUBKONNECT_CONFIG.baseUrl}/APIDatabundlePlansV2.asp?UserID=${CLUBKONNECT_CONFIG.userId}&APIKey=${CLUBKONNECT_CONFIG.apiKey}`;
    
    const response = await axios.get(url, { 
      timeout: 30000,
      headers: {
        'User-Agent': 'VTU-App/1.0'
      }
    });

    if (!response.data || !response.data.MOBILE_NETWORK) {
      throw new Error('Invalid response from ClubConnect API');
    }

    console.log('✅ Plans fetched from ClubConnect');

    const data = response.data;
    let updatedCount = 0;
    let newCount = 0;
    let failedCount = 0;
    let skippedAwoofCount = 0;
    const priceChanges = [];
    const planTypeCounts = { direct: 0, sme: 0, gift: 0 }; // ✅ Fixed: Only 3 types

    // Process each network
    for (const [networkCode, networkArray] of Object.entries(data.MOBILE_NETWORK)) {
      // ✅ Better network name normalization
      let normalizedNetwork;
      if (networkCode.toLowerCase().includes('9mobile')) {
        normalizedNetwork = '9mobile';
      } else {
        normalizedNetwork = networkCode.toLowerCase();
      }

      console.log(`📡 Processing ${normalizedNetwork.toUpperCase()} plans...`);

      if (!networkArray || !Array.isArray(networkArray) || networkArray.length === 0) {
        console.log(`⚠️  No data for ${normalizedNetwork}`);
        continue;
      }

      const products = networkArray[0].PRODUCT;
      if (!products || !Array.isArray(products)) {
        console.log(`⚠️  No products for ${normalizedNetwork}`);
        continue;
      }

      // Process each plan
      for (const product of products) {
        try {
          const planId = product.PRODUCT_ID;
          const planName = product.PRODUCT_NAME;
          const planAmount = Math.round(parseFloat(product.PRODUCT_AMOUNT));

          if (!planId || !planName || isNaN(planAmount)) {
            process.stdout.write('-');
            failedCount++;
            continue;
          }

          // ✅ Determine plan type
          const planType = determinePlanType(planName);

          // ✅ SKIP AWOOF DATA PLANS
          if (planType === 'awoof') {
            process.stdout.write('-');
            skippedAwoofCount++;
            continue;
          }

          // Find existing plan
          const existingPlan = await DataPlan.findOne({
            network: normalizedNetwork,
            planId: planId
          });

          // Determine category and validity from plan name
          const { category, validity, dataSize } = parsePlanDetails(planName);

          // Clean up plan name (keep labels for categorization)
          const cleanedName = planName
            .replace(/\s+/g, ' ')
            .trim();

          const planData = {
            planId: planId,
            network: normalizedNetwork,
            name: cleanedName,
            dataSize: dataSize,
            validity: validity,
            providerCost: planAmount,
            category: category,
            planType: planType, // ✅ Save plan type
            active: true,
            popular: false,
            lastUpdated: new Date()
          };

          if (existingPlan) {
            // Check for price changes
            if (existingPlan.providerCost !== planAmount) {
              priceChanges.push({
                network: normalizedNetwork,
                plan: planName,
                oldPrice: existingPlan.providerCost,
                newPrice: planAmount,
                difference: planAmount - existingPlan.providerCost
              });
            }

            // Update existing plan
            await DataPlan.updateOne(
              { _id: existingPlan._id },
              { $set: planData }
            );
            
            updatedCount++;
            planTypeCounts[planType]++;
            process.stdout.write('.');
          } else {
            // Create new plan
            await DataPlan.create(planData);
            newCount++;
            planTypeCounts[planType]++;
            process.stdout.write('+');
          }

        } catch (error) {
          console.error(`\n❌ Error processing plan:`, error.message);
          failedCount++;
          process.stdout.write('✗');
        }
      }

      console.log(` ✅ ${normalizedNetwork.toUpperCase()} done`);
    }

    // Print summary
    console.log('\n📊 Sync Summary:');
    console.log(`   ✅ Updated: ${updatedCount} plans`);
    console.log(`   ➕ New: ${newCount} plans`);
    console.log(`   ⏭️  Skipped (Awoof Data): ${skippedAwoofCount} plans`);
    console.log(`   ❌ Failed: ${failedCount} plans`);

    // Show price changes
    if (priceChanges.length > 0) {
      console.log('\n💰 Price Changes Detected:');
      priceChanges.forEach(change => {
        const direction = change.difference > 0 ? '📈' : '📉';
        console.log(`   ${direction} ${change.network.toUpperCase()}: ${change.plan}`);
        console.log(`      Old: ₦${change.oldPrice} → New: ₦${change.newPrice} (${change.difference > 0 ? '+' : ''}₦${change.difference})`);
      });
    } else {
      console.log('✅ No price changes detected');
    }

    // Show plan type statistics
    console.log('\n📈 Plans by Type:');
    const typeLabels = {
      direct: 'Direct Data',  // ✅ Fixed: Removed sme2
      sme: 'SME Data',
      gift: 'Gift Data'
    };
    
    for (const [type, count] of Object.entries(planTypeCounts)) {
      if (count > 0) {
        const label = typeLabels[type] || type.toUpperCase();
        console.log(`   ${label}: ${count} plans`);
      }
    }

    // Get total active plans count
    const totalPlans = await DataPlan.countDocuments({ active: true });
    console.log(`\n📊 Total active plans: ${totalPlans}`);

    console.log('\n✅ Sync completed successfully!');

  } catch (error) {
    console.error('\n❌ Sync error:', error.message);
    if (error.response) {
      console.error('API Response:', error.response.status, error.response.statusText);
    }
    process.exit(1);
  } finally {
    if (connection) {
      await mongoose.connection.close();
      console.log('🔌 MongoDB connection closed');
    }
  }
}

// Run the sync
syncPlans();