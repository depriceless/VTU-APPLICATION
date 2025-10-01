// scripts/initializeFinancialData.js
const mongoose = require('mongoose');
const ServiceConfig = require('../models/ServiceConfig');
const BankAccount = require('../models/BankAccount');
const Settlement = require('../models/Settlement');

/**
 * Initialize default service configurations if they don't exist
 */
async function initializeServiceConfigs() {
  const defaultServices = [
    {
      serviceType: 'airtime',
      displayName: 'Airtime',
      pricing: { markupPercentage: 2.5, flatFee: 0 },
      isActive: true
    },
    {
      serviceType: 'data',
      displayName: 'Data',
      pricing: { markupPercentage: 3.0, flatFee: 0 },
      isActive: true
    },
    {
      serviceType: 'electricity',
      displayName: 'Electricity',
      pricing: { markupPercentage: 1.5, flatFee: 10 },
      isActive: true
    },
    {
      serviceType: 'cableTv',
      displayName: 'Cable TV',
      pricing: { markupPercentage: 2.0, flatFee: 25 },
      isActive: true
    },
    {
      serviceType: 'betting',
      displayName: 'Betting',
      pricing: { markupPercentage: 1.0, flatFee: 0 },
      isActive: true
    }
  ];

  for (const serviceData of defaultServices) {
    const existingService = await ServiceConfig.findOne({ 
      serviceType: serviceData.serviceType 
    });

    if (!existingService) {
      const newService = new ServiceConfig(serviceData);
      await newService.save();
      console.log(`Created service config for: ${serviceData.displayName}`);
    }
  }
}

/**
 * Create sample bank accounts for testing (optional)
 */
async function createSampleBankAccounts() {
  const sampleAccounts = [
    {
      accountName: 'Business Operations Account',
      accountNumber: '1234567890',
      bankName: 'GTBank',
      bankCode: '058',
      isActive: true
    },
    {
      accountName: 'Settlement Account',
      accountNumber: '0987654321',
      bankName: 'Access Bank',
      bankCode: '044',
      isActive: true
    }
  ];

  for (const accountData of sampleAccounts) {
    const existingAccount = await BankAccount.findOne({
      accountNumber: accountData.accountNumber,
      bankCode: accountData.bankCode
    });

    if (!existingAccount) {
      const newAccount = new BankAccount(accountData);
      await newAccount.save();
      console.log(`Created bank account: ${accountData.accountName}`);
    }
  }
}

/**
 * Update existing transactions to ensure they have proper categories
 */
async function updateTransactionCategories() {
  const Transaction = require('../models/Transaction');
  
  // Find transactions without categories
  const uncategorizedTransactions = await Transaction.find({
    $or: [
      { category: { $exists: false } },
      { category: null },
      { category: '' }
    ]
  });

  console.log(`Found ${uncategorizedTransactions.length} uncategorized transactions`);

  for (const tx of uncategorizedTransactions) {
    let category = 'other';
    
    // Try to determine category from description
    if (tx.description) {
      const desc = tx.description.toLowerCase();
      if (desc.includes('airtime')) category = 'airtime';
      else if (desc.includes('data')) category = 'data';
      else if (desc.includes('electricity') || desc.includes('power')) category = 'electricity';
      else if (desc.includes('cable') || desc.includes('tv')) category = 'cableTv';
      else if (desc.includes('bet')) category = 'betting';
      else if (desc.includes('fund') || desc.includes('deposit')) category = 'funding';
      else if (desc.includes('transfer')) category = 'transfer';
    }

    tx.category = category;
    await tx.save();
  }

  console.log(`Updated ${uncategorizedTransactions.length} transaction categories`);
}

/**
 * Main initialization function
 */
async function initializeFinancialData() {
  try {
    console.log('Starting financial data initialization...');
    
    await initializeServiceConfigs();
    console.log('Service configurations initialized');
    
    await createSampleBankAccounts();
    console.log('Sample bank accounts created');
    
    await updateTransactionCategories();
    console.log('Transaction categories updated');
    
    console.log('Financial data initialization completed successfully');
  } catch (error) {
    console.error('Error during initialization:', error);
    throw error;
  }
}

// Export for use in other scripts
module.exports = {
  initializeServiceConfigs,
  createSampleBankAccounts,
  updateTransactionCategories,
  initializeFinancialData
};

// Run if called directly
if (require.main === module) {
  const connectDB = require('../config/database'); // Adjust path as needed
  
  connectDB()
    .then(() => initializeFinancialData())
    .then(() => {
      console.log('Initialization complete. Exiting...');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Initialization failed:', error);
      process.exit(1);
    });
}