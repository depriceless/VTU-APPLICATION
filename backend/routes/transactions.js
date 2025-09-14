// routes/transactions.js
const express = require('express');
const router = express.Router();
const Transaction = require('../models/Transaction');
const { authenticate } = require('../middleware/auth');
const mongoose = require('mongoose');

// ✅ FIXED: Get user transactions - COMPLETE REWRITE
router.get('/', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 20, type, status, category } = req.query;
    
    console.log('📋 Fetching transactions for user:', req.user.id);
    console.log('📋 Query parameters:', { page, limit, type, status, category });
    
    // Build query object - FIXED: Use proper MongoDB query format
    const query = { userId: req.user.id };
    
    // Add optional filters if provided
    if (type && type !== 'undefined') query.type = type;
    if (status && status !== 'undefined') query.status = status;
    if (category && category !== 'undefined') query.category = category;
    
    console.log('📋 Final query:', query);
    
    // Calculate pagination
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.max(1, parseInt(limit));
    const skip = (pageNum - 1) * limitNum;
    
    // Execute query with pagination - FIXED: Use proper MongoDB methods
    const transactions = await Transaction.find(query)
      .sort({ createdAt: -1 }) // Newest first
      .skip(skip)
      .limit(limitNum)
      .lean(); // Return plain JavaScript objects
    
    // Get total count for pagination info
    const total = await Transaction.countDocuments(query);
    
    console.log(`✅ Found ${transactions.length} transactions for user ${req.user.id}`);
    
    res.json({
      success: true,
      transactions,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('❌ Error fetching transactions:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching transactions: ' + error.message
    });
  }
});

// Get specific transaction by ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    // ✅ FIXED: Added proper ObjectId validation
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid transaction ID format'
      });
    }
    
    const transaction = await Transaction.findById(req.params.id)
      .populate('userId', 'name email phone')
      .populate('walletId', 'balance');
    
    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }
    
    // ✅ FIXED: Better user validation
    // Convert both to string for comparison
    const transactionUserId = transaction.userId._id 
      ? transaction.userId._id.toString() 
      : transaction.userId.toString();
      
    if (transactionUserId !== req.user.id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    res.json({
      success: true,
      transaction
    });
  } catch (error) {
    console.error('Error fetching transaction:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching transaction: ' + error.message
    });
  }
});

// ✅ DEBUG ROUTE TO HELP TROUBLESHOOT
router.get('/debug/test', authenticate, async (req, res) => {
  try {
    console.log('🧪 DEBUG: Testing transactions route');
    console.log('User ID:', req.user.id);
    console.log('User ID type:', typeof req.user.id);
    console.log('User ID string:', req.user.id.toString());
    
    // Test a simple query
    const testTransactions = await Transaction.find({ 
      userId: req.user.id 
    }).limit(3);
    
    console.log('Found transactions:', testTransactions.length);
    
    // Check if we need to convert user ID format
    if (testTransactions.length === 0) {
      console.log('⚠️  No transactions found with direct userId match');
      
      // Try alternative approach - check if userId needs conversion
      const allTransactions = await Transaction.find().limit(5);
      if (allTransactions.length > 0) {
        console.log('Sample transaction userId format:', allTransactions[0].userId);
        console.log('Sample transaction userId type:', typeof allTransactions[0].userId);
        
        // Try converting user ID to match the format in database
        try {
          const objectIdUserId = new mongoose.Types.ObjectId(req.user.id);
          const testWithObjectId = await Transaction.find({ 
            userId: objectIdUserId 
          }).limit(3);
          console.log('Transactions found with ObjectId conversion:', testWithObjectId.length);
        } catch (conversionError) {
          console.log('ObjectId conversion failed:', conversionError.message);
        }
      }
    }
    
    res.json({
      success: true,
      userId: req.user.id,
      userIdType: typeof req.user.id,
      userIdString: req.user.id.toString(),
      testTransactions: testTransactions,
      testTransactionsCount: testTransactions.length,
      message: 'Debug test successful'
    });
  } catch (error) {
    console.error('Debug error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Comprehensive debug route to check database state
router.get('/debug/state', authenticate, async (req, res) => {
  try {
    console.log('🔍 DEBUG: Comprehensive database check');
    console.log('User ID:', req.user.id);
    console.log('User ID type:', typeof req.user.id);
    console.log('User ID string:', req.user.id.toString());
    
    // 1. Check total transactions count
    const totalCount = await Transaction.countDocuments();
    console.log('Total transactions in entire database:', totalCount);
    
    // 2. Check user's transactions count with direct match
    const userCount = await Transaction.countDocuments({ userId: req.user.id });
    console.log('Transactions for current user (direct match):', userCount);
    
    // 3. Try with ObjectId conversion if no results
    let userCountObjectId = 0;
    if (userCount === 0 && totalCount > 0) {
      try {
        const objectIdUserId = new mongoose.Types.ObjectId(req.user.id);
        userCountObjectId = await Transaction.countDocuments({ userId: objectIdUserId });
        console.log('Transactions for current user (ObjectId conversion):', userCountObjectId);
      } catch (conversionError) {
        console.log('ObjectId conversion failed:', conversionError.message);
      }
    }
    
    // 4. Get sample of all transactions
    const allTransactions = await Transaction.find().limit(5);
    console.log('Sample of all transactions:', allTransactions);
    
    // 5. Get user's transactions
    const userTransactions = await Transaction.find({ userId: req.user.id });
    console.log('User transactions:', userTransactions);
    
    // 6. Check if user ID format matches
    if (userCount === 0 && totalCount > 0) {
      console.log('⚠️  WARNING: Transactions exist but not for this user!');
      console.log('This suggests userId format mismatch');
      
      // Check what userId format exists in other transactions
      const sampleTransaction = await Transaction.findOne();
      if (sampleTransaction) {
        console.log('Sample transaction userId:', sampleTransaction.userId);
        console.log('Sample transaction userId type:', typeof sampleTransaction.userId);
        console.log('Sample transaction userId string:', sampleTransaction.userId.toString());
      }
    }
    
    res.json({
      success: true,
      totalTransactions: totalCount,
      userTransactionsDirect: userCount,
      userTransactionsObjectId: userCountObjectId,
      allTransactionsSample: allTransactions,
      userTransactionsList: userTransactions,
      userId: req.user.id,
      userIdType: typeof req.user.id,
      userIdString: req.user.id.toString()
    });
  } catch (error) {
    console.error('Debug error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;