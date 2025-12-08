// scripts/syncCablePlans.js
const mongoose = require('mongoose');
const axios = require('axios');
const CableTVPlan = require('../models/CableTVPlan');
require('dotenv').config();

const CLUBKONNECT_CONFIG = {
  userId: process.env.CLUBKONNECT_USER_ID,
  apiKey: process.env.CLUBKONNECT_API_KEY,
  baseUrl: 'https://www.nellobytesystems.com'
};

// Operator mapping for ClubKonnect API
const OPERATOR_MAPPING = {
  'DStv': 'dstv',
  'GOtv': 'gotv',
  'Startimes': 'startimes'
};

// Helper to parse duration from package name
function parseDuration(packageName) {
  const nameLower = packageName.toLowerCase();
  
  if (nameLower.includes('weekly') || nameLower.includes('1 week')) {
    return '1 Week';
  } else if (nameLower.includes('quarterly') || nameLower.includes('3 months')) {
    return '3 Months';
  } else if (nameLower.includes('yearly') || nameLower.includes('1 year')) {
    return '1 Year';
  } else if (nameLower.includes('monthly') || nameLower.includes('1 month')) {
    return '1 Month';
  }
  
  // Default to 1 Month
  return '1 Month';
}

// Helper to determine if package is popular
function isPopularPackage(packageName) {
  const popularKeywords = [
    'padi', 'yanga', 'confam', 'compact', 'smallie', 
    'jinja', 'jolli', 'basic', 'nova'
  ];
  
  const nameLower = packageName.toLowerCase();
  return popularKeywords.some(keyword => nameLower.includes(keyword));
}

// Main sync function
async function syncCablePlans() {
  let connection;
  
  try {
    console.log('🔄 Starting ClubKonnect Cable TV sync...');
    console.log('🕐 Time:', new Date().toISOString());

    // Connect to MongoDB with DNS options
    connection = await mongoose.connect(process.env.MONGO_URI, {
      family: 4, // Force IPv4
      serverSelectionTimeoutMS: 30000
    });
    console.log('✅ Connected to MongoDB');

    // Fetch plans from ClubKonnect
    console.log('📡 Fetching cable packages from ClubKonnect...');
    const url = `${CLUBKONNECT_CONFIG.baseUrl}/APICableTVPackagesV2.asp?UserID=${CLUBKONNECT_CONFIG.userId}&APIKey=${CLUBKONNECT_CONFIG.apiKey}`;
    
    console.log('🔗 Request URL:', url.replace(CLUBKONNECT_CONFIG.apiKey, '***'));
    
    const response = await axios.get(url, { 
      timeout: 30000,
      headers: {
        'User-Agent': 'VTU-App/1.0'
      }
    });

    let data = response.data;
    
    // Parse JSON if needed
    if (typeof data === 'string') {
      try {
        data = JSON.parse(data);
      } catch (e) {
        throw new Error(`Failed to parse response: ${data}`);
      }
    }

    console.log('✅ Raw response received');
    console.log('📋 Response type:', typeof data);
    console.log('📋 Response keys:', data ? Object.keys(data) : 'null');
    console.log('📋 Full response sample:', JSON.stringify(data, null, 2).substring(0, 500));

    if (!data) {
      throw new Error('No data received from ClubKonnect API');
    }

    // Check for different possible response structures
    let operatorsData = null;
    
    if (data.TV_ID) {
      // Original structure
      operatorsData = data.TV_ID;
      console.log('✅ Found TV_ID structure');
    } else if (data.DSTV || data.DStv || data.GOtv || data.Startimes) {
      // Direct operator keys
      operatorsData = data;
      console.log('✅ Found direct operator structure');
    } else {
      console.error('❌ Unknown response structure. Keys:', Object.keys(data));
      throw new Error('Invalid response from ClubKonnect API - unknown structure');
    }

    console.log('✅ Packages fetched from ClubKonnect');
    console.log('📋 Operators found:', Object.keys(operatorsData));

    let updatedCount = 0;
    let newCount = 0;
    let failedCount = 0;
    let skippedCount = 0;
    const priceChanges = [];
    const operatorCounts = { dstv: 0, gotv: 0, startimes: 0 };

    // Process each operator
    for (const [operatorKey, operatorData] of Object.entries(operatorsData)) {
      const normalizedOperator = OPERATOR_MAPPING[operatorKey];
      
      if (!normalizedOperator) {
        console.log(`⚠️  Unknown operator: ${operatorKey}, skipping...`);
        continue;
      }

      console.log(`\n📡 Processing ${normalizedOperator.toUpperCase()} packages...`);

      if (!Array.isArray(operatorData) || operatorData.length === 0) {
        console.log(`⚠️  No data for ${normalizedOperator}`);
        continue;
      }

      const products = operatorData[0].PRODUCT;
      
      if (!products || !Array.isArray(products)) {
        console.log(`⚠️  No products for ${normalizedOperator}`);
        continue;
      }

      // Process each package
      for (const product of products) {
        try {
          const packageId = product.PACKAGE_ID;
          const packageName = product.PACKAGE_NAME;
          const packageAmount = parseFloat(product.PACKAGE_AMOUNT);

          if (!packageId || !packageName || isNaN(packageAmount) || packageAmount <= 0) {
            process.stdout.write('-');
            failedCount++;
            continue;
          }

          // Skip packages that are too cheap (likely errors) or too expensive
          if (packageAmount < 500 || packageAmount > 100000) {
            process.stdout.write('~');
            skippedCount++;
            continue;
          }

          // Find existing package
          const existingPackage = await CableTVPlan.findOne({
            operator: normalizedOperator,
            packageId: packageId
          });

          // Parse duration and popularity
          const duration = parseDuration(packageName);
          const popular = isPopularPackage(packageName);

          // Clean up package name
          const cleanedName = packageName
            .replace(/\s+/g, ' ')
            .trim();

          const packageData = {
            packageId: packageId,
            operator: normalizedOperator,
            name: cleanedName,
            providerCost: packageAmount,
            duration: duration,
            description: cleanedName,
            active: true,
            popular: popular,
            lastUpdated: new Date()
          };

          if (existingPackage) {
            // Check for price changes
            if (existingPackage.providerCost !== packageAmount) {
              priceChanges.push({
                operator: normalizedOperator,
                package: packageName,
                oldPrice: existingPackage.providerCost,
                newPrice: packageAmount,
                difference: packageAmount - existingPackage.providerCost
              });
            }

            // Update existing package
            await CableTVPlan.updateOne(
              { _id: existingPackage._id },
              { $set: packageData }
            );
            
            updatedCount++;
            operatorCounts[normalizedOperator]++;
            process.stdout.write('.');
          } else {
            // Create new package
            await CableTVPlan.create(packageData);
            newCount++;
            operatorCounts[normalizedOperator]++;
            process.stdout.write('+');
          }

        } catch (error) {
          console.error(`\n❌ Error processing package:`, error.message);
          failedCount++;
          process.stdout.write('✗');
        }
      }

      console.log(` ✅ ${normalizedOperator.toUpperCase()} done`);
    }

    // Print summary
    console.log('\n\n📊 Sync Summary:');
    console.log(`   ✅ Updated: ${updatedCount} packages`);
    console.log(`   ➕ New: ${newCount} packages`);
    console.log(`   ⏭️  Skipped: ${skippedCount} packages (out of range)`);
    console.log(`   ❌ Failed: ${failedCount} packages`);

    // Show price changes
    if (priceChanges.length > 0) {
      console.log('\n💰 Price Changes Detected:');
      priceChanges.forEach(change => {
        const direction = change.difference > 0 ? '📈' : '📉';
        console.log(`   ${direction} ${change.operator.toUpperCase()}: ${change.package}`);
        console.log(`      Old: ₦${change.oldPrice.toLocaleString()} → New: ₦${change.newPrice.toLocaleString()} (${change.difference > 0 ? '+' : ''}₦${change.difference.toLocaleString()})`);
      });
    } else {
      console.log('\n✅ No price changes detected');
    }

    // Show operator statistics
    console.log('\n📈 Packages by Operator:');
    for (const [operator, count] of Object.entries(operatorCounts)) {
      if (count > 0) {
        const operatorName = operator.toUpperCase();
        console.log(`   ${operatorName}: ${count} packages`);
      }
    }

    // Get total active packages count
    const totalPackages = await CableTVPlan.countDocuments({ active: true });
    console.log(`\n📊 Total active packages: ${totalPackages}`);

    // Show sample packages from each operator
    console.log('\n📦 Sample Packages:');
    for (const operator of ['dstv', 'gotv', 'startimes']) {
      const sample = await CableTVPlan.findOne({ 
        operator, 
        active: true 
      }).sort({ providerCost: 1 });
      
      if (sample) {
        console.log(`   ${operator.toUpperCase()}: ${sample.name} - ₦${sample.providerCost.toLocaleString()}`);
      }
    }

    console.log('\n✅ Sync completed successfully!');
    console.log('🕐 Finished at:', new Date().toISOString());

  } catch (error) {
    console.error('\n❌ Sync error:', error.message);
    if (error.response) {
      console.error('API Response:', error.response.status, error.response.statusText);
      console.error('API Data:', JSON.stringify(error.response.data, null, 2));
    }
    console.error('Stack:', error.stack);
    process.exit(1);
  } finally {
    if (connection) {
      await mongoose.connection.close();
      console.log('🔌 MongoDB connection closed');
    }
  }
}

// Run the sync
syncCablePlans();