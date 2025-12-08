const mongoose = require('mongoose');
const DataPlan = require('../models/DataPlan');
require('dotenv').config();

async function cleanupDuplicates() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    // Find all plans grouped by network + planId
    const allPlans = await DataPlan.find({}).sort({ lastUpdated: -1 });
    
    const seen = new Map();
    const toDelete = [];

    for (const plan of allPlans) {
      const key = `${plan.network}-${plan.planId}`;
      
      if (seen.has(key)) {
        // Duplicate found - keep the most recently updated one
        const existing = seen.get(key);
        
        if (plan.lastUpdated > existing.lastUpdated) {
          // This one is newer, delete the old one
          toDelete.push(existing._id);
          seen.set(key, plan);
        } else {
          // Keep the existing one, delete this one
          toDelete.push(plan._id);
        }
      } else {
        seen.set(key, plan);
      }
    }

    if (toDelete.length > 0) {
      console.log(`🗑️  Removing ${toDelete.length} duplicate plans...`);
      await DataPlan.deleteMany({ _id: { $in: toDelete } });
      console.log('✅ Duplicates removed');
    } else {
      console.log('✅ No duplicates found');
    }

    const finalCount = await DataPlan.countDocuments();
    console.log(`\n📊 Final plan count: ${finalCount}`);

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

cleanupDuplicates();