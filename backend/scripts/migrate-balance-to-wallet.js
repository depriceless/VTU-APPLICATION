// scripts/migrate-balance-to-wallet.js
// RUN THIS ONCE TO MIGRATE ALL BALANCE DATA TO WALLET MODEL

// ✅ LOAD ENVIRONMENT VARIABLES FIRST
require('dotenv').config();

const mongoose = require('mongoose');
const Balance = require('../models/Balance');
const Wallet = require('../models/Wallet');
const Transaction = require('../models/Transaction');

async function migrateBalanceToWallet() {
  try {
    console.log('🔄 ==========================================');
    console.log('🔄 STARTING BALANCE → WALLET MIGRATION');
    console.log('🔄 ==========================================\n');

    // ✅ CHECK ENVIRONMENT VARIABLES (support both MONGODB_URI and MONGO_URI)
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
    
    if (!mongoUri) {
      console.error('❌ ERROR: MongoDB URI not found in environment variables');
      console.error('   Make sure you have MONGODB_URI or MONGO_URI in your .env file');
      process.exit(1);
    }

    console.log('🔍 MongoDB URI:', mongoUri.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@'));

    // Connect to database
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to database\n');

    // Get all Balance records
    const balances = await Balance.find({});
    console.log(`📊 Found ${balances.length} Balance records to migrate\n`);

    if (balances.length === 0) {
      console.log('✅ No Balance records to migrate');
      process.exit(0);
    }

    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    for (const balance of balances) {
      const session = await mongoose.startSession();
      
      try {
        console.log(`\n📝 Processing User: ${balance.userId}`);
        console.log(`   Balance: ₦${balance.balance.toLocaleString()}`);
        console.log(`   Transactions: ${balance.transactions?.length || 0}`);

        await session.startTransaction();

        // Check if Wallet already exists
        let wallet = await Wallet.findOne({ userId: balance.userId }).session(session);
        
        if (wallet) {
          console.log('   ⚠️  Wallet exists - Merging data...');
          
          // Update balance if Balance model has higher amount
          if (balance.balance > wallet.balance) {
            console.log(`   💰 Updating balance: ₦${wallet.balance} → ₦${balance.balance}`);
            wallet.balance = balance.balance;
          }
          
        } else {
          console.log('   🆕 Creating new Wallet...');
          
          // Create new Wallet from Balance data
          wallet = new Wallet({
            userId: balance.userId,
            balance: balance.balance,
            currency: balance.currency || 'NGN',
            isActive: balance.isActive !== false,
            isDormant: balance.isDormant || false,
            lastTransactionDate: balance.lastTransactionDate,
            dailyLimit: balance.dailyLimit || 1000000,
            monthlyLimit: balance.monthlyLimit || 10000000,
            minimumBalance: balance.minimumBalance || 0,
            stats: {
              totalCredits: balance.stats?.totalDeposits || 0,
              totalDebits: balance.stats?.totalWithdrawals || 0,
              transactionCount: (balance.stats?.depositCount || 0) + (balance.stats?.withdrawalCount || 0),
              averageTransactionAmount: 0
            }
          });
        }

        // Save wallet
        await wallet.save({ session });
        console.log('   ✅ Wallet saved');

        // Migrate transactions from Balance to Transaction model
        if (balance.transactions && balance.transactions.length > 0) {
          console.log(`   📋 Migrating ${balance.transactions.length} transactions...`);
          
          let migratedCount = 0;
          
          for (const txn of balance.transactions) {
            try {
              // Check if transaction already exists
              const existingTxn = await Transaction.findOne({ 
                reference: txn.reference 
              }).session(session);

              if (existingTxn) {
                console.log(`      ⏭️  Skipping duplicate: ${txn.reference}`);
                continue;
              }

              // Create Transaction record
              const transaction = new Transaction({
                walletId: wallet._id,
                userId: balance.userId,
                type: txn.type,
                amount: txn.amount,
                previousBalance: txn.previousBalance,
                newBalance: txn.newBalance,
                description: txn.description,
                reference: txn.reference,
                status: txn.status || 'completed',
                category: 'funding',
                gateway: {
                  provider: txn.gateway,
                  gatewayReference: txn.reference,
                  gatewayResponse: {
                    channel: txn.channel,
                    metadata: txn.metadata
                  }
                },
                metadata: {
                  source: 'balance_migration',
                  originalDate: txn.date,
                  ...txn.metadata
                },
                createdAt: txn.date || new Date(),
                processedAt: txn.date || new Date(),
                completedAt: txn.status === 'completed' ? (txn.date || new Date()) : undefined
              });

              await transaction.save({ session });
              migratedCount++;
              
            } catch (txnError) {
              console.log(`      ⚠️  Transaction error: ${txnError.message}`);
            }
          }
          
          console.log(`   ✅ Migrated ${migratedCount}/${balance.transactions.length} transactions`);
        }

        await session.commitTransaction();
        successCount++;
        console.log(`   ✅ Migration successful for user ${balance.userId}`);

      } catch (error) {
        await session.abortTransaction();
        errorCount++;
        errors.push({
          userId: balance.userId,
          error: error.message
        });
        console.error(`   ❌ Migration failed: ${error.message}`);
      } finally {
        session.endSession();
      }
    }

    console.log('\n🎉 ==========================================');
    console.log('🎉 MIGRATION COMPLETED');
    console.log('🎉 ==========================================');
    console.log(`✅ Successful: ${successCount}`);
    console.log(`❌ Failed: ${errorCount}`);
    
    if (errors.length > 0) {
      console.log('\n⚠️  ERRORS:');
      errors.forEach(err => {
        console.log(`   User ${err.userId}: ${err.error}`);
      });
    }

    console.log('\n📋 NEXT STEPS:');
    console.log('1. Verify wallets: Check if all users have correct balances');
    console.log('2. Test transactions: Make a test deposit');
    console.log('3. If everything works, you can delete Balance model');
    console.log('4. Update any routes still using Balance model');

  } catch (error) {
    console.error('\n❌ MIGRATION ERROR:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from database');
    process.exit(0);
  }
}

// Run migration
migrateBalanceToWallet();