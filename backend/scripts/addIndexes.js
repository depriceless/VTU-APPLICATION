// scripts/addIndexes.js - Fixed to handle existing indexes
const mongoose = require('mongoose');
require('dotenv').config();

async function addIndexes() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    
    const db = mongoose.connection.db;
    
    console.log('📝 Checking and creating indexes...\n');
    
    // Helper function to create index safely
    async function createIndexSafely(collection, indexSpec, options) {
      try {
        await db.collection(collection).createIndex(indexSpec, options);
        console.log(`✅ Created index on ${collection}:`, options.name);
      } catch (err) {
        if (err.code === 85 || err.codeName === 'IndexOptionsConflict') {
          console.log(`ℹ️  Index already exists on ${collection}:`, options.name);
        } else if (err.code === 86 || err.codeName === 'IndexKeySpecsConflict') {
          console.log(`ℹ️  Similar index already exists on ${collection}:`, options.name);
        } else {
          console.error(`❌ Error creating index on ${collection}:`, err.message);
        }
      }
    }
    
    // Transaction indexes (CRITICAL for performance)
    console.log('📊 TRANSACTIONS collection:');
    await createIndexSafely('transactions', 
      { userId: 1, createdAt: -1 },
      { name: 'userId_createdAt_desc' }
    );
    await createIndexSafely('transactions',
      { userId: 1, status: 1 },
      { name: 'userId_status' }
    );
    await createIndexSafely('transactions',
      { userId: 1, type: 1 },
      { name: 'userId_type' }
    );
    
    // Wallet indexes
    console.log('\n💰 WALLETS collection:');
    await createIndexSafely('wallets',
      { userId: 1 },
      { unique: true, name: 'userId_unique' }
    );
    
    // User indexes
    console.log('\n👤 USERS collection:');
    await createIndexSafely('users',
      { email: 1 },
      { unique: true, sparse: true, name: 'email_unique' }
    );
    await createIndexSafely('users',
      { phone: 1 },
      { unique: true, sparse: true, name: 'phone_unique' }
    );
    
    console.log('\n✅ Index check/creation completed!\n');
    
    // List all existing indexes to verify
    const collections = ['transactions', 'wallets', 'users'];
    console.log('📋 CURRENT INDEXES:\n');
    
    for (const collName of collections) {
      try {
        const indexes = await db.collection(collName).indexes();
        console.log(`${collName.toUpperCase()}:`);
        indexes.forEach((index, i) => {
          const keys = Object.keys(index.key).map(k => `${k}: ${index.key[k]}`).join(', ');
          console.log(`  ${i + 1}. ${index.name} (${keys})${index.unique ? ' [UNIQUE]' : ''}`);
        });
        console.log('');
      } catch (err) {
        console.log(`  Collection '${collName}' not found or error:`, err.message);
        console.log('');
      }
    }
    
    console.log('✅ All done!\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

addIndexes();