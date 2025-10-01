// scripts/setupServices.js
require('dotenv').config();
const mongoose = require('mongoose');
const ServiceConfig = require('../models/ServiceConfig');

// Connect to MongoDB Atlas (same as your main server)
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('Connected to MongoDB Atlas successfully');
  } catch (error) {
    console.error('Database connection failed:', error);
    process.exit(1);
  }
};

const defaultServices = [
  {
    serviceType: 'airtime',
    displayName: 'Airtime Top-up',
    description: 'Mobile airtime recharge for all networks',
    limits: { min: 50, max: 50000, dailyLimit: 500000 },
    pricing: { markupPercentage: 2, flatFee: 0 }
  },
  {
    serviceType: 'data',
    displayName: 'Data Bundles',
    description: 'Mobile data bundle subscriptions',
    limits: { min: 50, max: 50000, dailyLimit: 500000 },
    pricing: { markupPercentage: 3, flatFee: 0 }
  },
  {
    serviceType: 'electricity',
    displayName: 'Electricity Bills',
    description: 'Prepaid and postpaid electricity payments',
    limits: { min: 500, max: 100000, dailyLimit: 1000000 },
    pricing: { markupPercentage: 1, flatFee: 50 }
  },
  {
    serviceType: 'cable_tv',
    displayName: 'Cable TV',
    description: 'Cable TV subscriptions',
    limits: { min: 500, max: 50000, dailyLimit: 500000 },
    pricing: { markupPercentage: 2, flatFee: 0 }
  },
  {
    serviceType: 'internet',
    displayName: 'Internet Bills',
    description: 'Internet service provider payments',
    limits: { min: 500, max: 200000, dailyLimit: 1000000 },
    pricing: { markupPercentage: 2, flatFee: 0 }
  },
  {
    serviceType: 'betting',
    displayName: 'Betting Wallet',
    description: 'Fund betting accounts',
    limits: { min: 100, max: 500000, dailyLimit: 2000000 },
    pricing: { markupPercentage: 1, flatFee: 0 }
  },
  {
    serviceType: 'print_recharge',
    displayName: 'Print & Recharge',
    description: 'Printing services and recharge card purchases',
    limits: { min: 50, max: 10000, dailyLimit: 100000 },
    pricing: { markupPercentage: 5, flatFee: 0 }
  },
  {
    serviceType: 'education',
    displayName: 'Education Services',
    description: 'School fees, exam fees, and educational payments',
    limits: { min: 500, max: 500000, dailyLimit: 2000000 },
    pricing: { markupPercentage: 1, flatFee: 100 }
  }
];

async function setupServices() {
  try {
    console.log('Starting service setup...');
    
    await connectDB();
    
    for (const serviceData of defaultServices) {
      const existing = await ServiceConfig.findOne({ serviceType: serviceData.serviceType });
      if (!existing) {
        await ServiceConfig.create(serviceData);
        console.log(`✓ Created service config for: ${serviceData.serviceType}`);
      } else {
        console.log(`- Service already exists: ${serviceData.serviceType}`);
      }
    }
    
    console.log('✓ Service setup completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Service setup error:', error);
    process.exit(1);
  }
}

setupServices();