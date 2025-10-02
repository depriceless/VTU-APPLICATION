const mongoose = require('mongoose');
const ApiProvider = require('../models/ApiProvider');
require('dotenv').config();

// Get MongoDB URI from .env
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error('✗ Error: MONGO_URI is not defined in your .env file');
  process.exit(1);
}

// Providers to seed
const providers = [
  {
    name: 'ClubKonnect',
    code: 'CLUBKONNECT',
    type: 'Primary Provider',
    endpoint: process.env.CLUBKONNECT_BASE_URL || 'https://www.nellobytesystems.com',
    apiKey: process.env.CLUBKONNECT_API_KEY, // must exist in .env
    timeout: 30000,
    retries: 3,
    status: 'active',
    isActive: true,
    priority: 1,
    weight: 3,
    metadata: {
      userId: process.env.CLUBKONNECT_USER_ID // must exist in .env
    },
    healthCheck: {
      enabled: true,
      interval: 300000,
      endpoint: '/APIWalletBalanceV1.asp',
      status: 'unknown'
    }
  },
  {
    name: 'Payscribe API',
    code: 'PAYSCRIBE',
    type: 'Backup Provider',
    endpoint: 'https://payscribe.ng/api',
    apiKey: 'placeholder-api-key-payscribe',
    timeout: 35000,
    retries: 3,
    status: 'maintenance',
    isActive: false,
    priority: 2,
    weight: 1,
    healthCheck: {
      enabled: false,
      interval: 300000,
      endpoint: '/health',
      status: 'unknown'
    }
  }
];

async function seedProviders() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✓ Connected to MongoDB');

    // Clear existing providers
    const deleted = await ApiProvider.deleteMany({});
    console.log(`✓ Cleared ${deleted.deletedCount} existing providers`);

    // Insert new providers
    const result = await ApiProvider.insertMany(providers);
    console.log(`✓ Seeded ${result.length} API providers:`);

    result.forEach(provider => {
      console.log(`  - ${provider.name} (${provider.code}): ${provider.status}`);
    });

    // Close connection
    await mongoose.connection.close();
    console.log('✓ Database connection closed');
    process.exit(0);

  } catch (error) {
    console.error('✗ Seed error:', error.message);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  seedProviders();
}

module.exports = seedProviders;
