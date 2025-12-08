// scripts/cleanDuplicates.js - FIXED VERSION
const mongoose = require('mongoose');
const CableTVPlan = require('../models/CableTVPlan');
const fs = require('fs');
const path = require('path');

// Try multiple ways to load .env
const envPath = path.resolve(__dirname, '../.env');
console.log('🔍 Looking for .env at:', envPath);
console.log('📁 .env file exists?', fs.existsSync(envPath));

if (fs.existsSync(envPath)) {
  require('dotenv').config({ path: envPath });
} else {
  require('dotenv').config();
}

async function removeDuplicates() {
  try {
    // Try both variable names
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
    
    console.log('\n🔍 Environment Check:');
    console.log('   MONGODB_URI:', process.env.MONGODB_URI ? 'Found ✅' : 'Not found ❌');
    console.log('   MONGO_URI:', process.env.MONGO_URI ? 'Found ✅' : 'Not found ❌');
    
    if (!mongoUri) {
      console.error('\n❌ ERROR: No MongoDB connection string found!');
      console.error('Please check your .env file has either:');
      console.error('   MONGODB_URI=your_connection_string');
      console.error('   OR');
      console.error('   MONGO_URI=your_connection_string');
      process.exit(1);
    }

    console.log('\n🔗 Connecting to MongoDB...');
    console.log('   Using:', mongoUri.includes('@') ? mongoUri.substring(0, mongoUri.indexOf('@')) + '@***' : 'mongodb://***');
    
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB successfully!\n');
    
    const operators = ['dstv', 'gotv', 'startimes'];
    let totalDeleted = 0;
    let totalPackages = 0;
    
    for (const operator of operators) {
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`📊 Checking ${operator.toUpperCase()} packages...`);
      
      const packages = await CableTVPlan.find({ operator });
      totalPackages += packages.length;
      console.log(`   Total packages found: ${packages.length}`);
      
      const seen = new Map(); // Use Map to track first occurrence
      const toDelete = [];
      const duplicateDetails = [];
      
      for (const pkg of packages) {
        if (seen.has(pkg.packageId)) {
          toDelete.push(pkg._id);
          duplicateDetails.push({
            packageId: pkg.packageId,
            name: pkg.name,
            price: pkg.providerCost
          });
        } else {
          seen.set(pkg.packageId, pkg);
        }
      }
      
      if (toDelete.length > 0) {
        console.log(`\n   ⚠️  Found ${toDelete.length} duplicate(s):`);
        duplicateDetails.forEach((dup, index) => {
          console.log(`      ${index + 1}. ${dup.packageId} - ${dup.name} (₦${dup.price})`);
        });
        
        console.log(`\n   🗑️  Deleting duplicates...`);
        const result = await CableTVPlan.deleteMany({ _id: { $in: toDelete } });
        console.log(`   ✅ Deleted ${result.deletedCount} duplicate package(s)`);
        totalDeleted += result.deletedCount;
        
        // Verify cleanup
        const remaining = await CableTVPlan.find({ operator });
        console.log(`   📦 Remaining packages: ${remaining.length}`);
      } else {
        console.log(`   ✅ No duplicates found - database is clean!`);
      }
    }
    
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`\n🎉 CLEANUP COMPLETE!`);
    console.log(`   📊 Total packages checked: ${totalPackages}`);
    console.log(`   🗑️  Total duplicates removed: ${totalDeleted}`);
    console.log(`   ✅ Database is now clean!\n`);
    
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB\n');
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    if (error.stack) {
      console.error('\n📋 Stack trace:');
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Run the cleanup
console.log('╔════════════════════════════════════════╗');
console.log('║  Cable TV Package Duplicate Cleaner   ║');
console.log('╚════════════════════════════════════════╝\n');

removeDuplicates();