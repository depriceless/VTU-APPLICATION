const mongoose = require('mongoose');
const DataPlan = require('../models/DataPlan');
const { DATA_PLANS } = require('../config/dataPlans');
require('dotenv').config();

async function migrateDataPlans() {
  try {
    console.log('🔄 Starting migration...\n');

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Connected to MongoDB\n');

    // Clear existing plans (optional - remove this if you want to keep existing data)
    const deleteResult = await DataPlan.deleteMany({});
    console.log(`🗑️  Cleared ${deleteResult.deletedCount} existing plans\n`);

    let totalInserted = 0;
    let totalFailed = 0;

    // Migrate each network
    for (const [network, plans] of Object.entries(DATA_PLANS)) {
      console.log(`📡 Migrating ${network.toUpperCase()} plans...`);

      for (const plan of plans) {
        try {
          await DataPlan.create({
            planId: plan.id,
            network: network,
            name: plan.name,
            dataSize: plan.dataSize,
            validity: plan.validity,
            providerCost: plan.providerCost,
            category: plan.category,
            active: plan.active !== false, // default true if not specified
            popular: plan.popular || false
          });

          totalInserted++;
          process.stdout.write('.');
        } catch (error) {
          console.error(`\n❌ Failed to insert plan ${plan.id}:`, error.message);
          totalFailed++;
        }
      }

      console.log(` ✅ ${network.toUpperCase()} done\n`);
    }

    console.log('\n📊 Migration Summary:');
    console.log(`   ✅ Successfully inserted: ${totalInserted} plans`);
    console.log(`   ❌ Failed: ${totalFailed} plans`);

    // Verify migration
    const counts = await DataPlan.aggregate([
      { $group: { _id: '$network', count: { $sum: 1 } } }
    ]);

    console.log('\n📈 Plans per network:');
    counts.forEach(item => {
      console.log(`   ${item._id.toUpperCase()}: ${item.count} plans`);
    });

    console.log('\n✅ Migration completed successfully!\n');

  } catch (error) {
    console.error('❌ Migration error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 MongoDB connection closed');
    process.exit(0);
  }
}

// Run migration
migrateDataPlans();