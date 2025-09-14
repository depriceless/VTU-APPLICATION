// routes/admin/transactions.js
const express = require('express');
const router = express.Router();
const Transaction = require('../models/Transaction');
const adminAuth = require('../middleware/adminAuth');
const mongoose = require('mongoose');

// GET /api/admin/transactions - Get all transactions with advanced filtering
router.get('/', adminAuth, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      type,
      category,
      dateFrom,
      dateTo,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const query = {};
    if (status && status !== 'all') query.status = status;
    if (type && type !== 'all') query.type = type;
    if (category && category !== 'all') query.category = category;

    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
      if (dateTo) {
        const endDate = new Date(dateTo);
        endDate.setHours(23, 59, 59, 999);
        query.createdAt.$lte = endDate;
      }
    }

    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [
        { reference: searchRegex },
        { description: searchRegex }
      ];
    }

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    const sortConfig = {};
    sortConfig[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const [transactions, total] = await Promise.all([
      Transaction.find(query)
        .populate('userId', 'name email phone username')
        .populate('walletId', 'balance')
        .sort(sortConfig)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Transaction.countDocuments(query)
    ]);

    const transformedTransactions = transactions.map(transaction => ({
      ...transaction,
      userInfo: transaction.userId ? {
        id: transaction.userId._id || transaction.userId,
        name: transaction.userId.name || 'Unknown User',
        email: transaction.userId.email || 'N/A',
        phone: transaction.userId.phone || 'N/A'
      } : {
        id: transaction.userId,
        name: 'Unknown User',
        email: 'N/A',
        phone: 'N/A'
      }
    }));

    res.json({
      success: true,
      transactions: transformedTransactions,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });

  } catch (error) {
    console.error('Admin transactions fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching transactions'
    });
  }
});

// GET specific transaction details
router.get('/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid transaction ID format'
      });
    }

    const transaction = await Transaction.findById(id)
      .populate('userId', 'name email phone username createdAt')
      .populate('walletId', 'balance')
      .populate('relatedTransactionId')
      .lean();

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    // Get related transactions (same user, similar time)
    const relatedTransactions = await Transaction.find({
      userId: transaction.userId._id || transaction.userId,
      _id: { $ne: transaction._id },
      createdAt: {
        $gte: new Date(new Date(transaction.createdAt) - 24 * 60 * 60 * 1000), // 24 hours before
        $lte: new Date(new Date(transaction.createdAt) + 24 * 60 * 60 * 1000)  // 24 hours after
      }
    })
    .sort({ createdAt: -1 })
    .limit(5)
    .lean();

    res.json({
      success: true,
      transaction: {
        ...transaction,
        userInfo: transaction.userId ? {
          id: transaction.userId._id || transaction.userId,
          name: transaction.userId.name || 'Unknown User',
          email: transaction.userId.email || 'N/A',
          phone: transaction.userId.phone || 'N/A',
          username: transaction.userId.username || 'N/A',
          memberSince: transaction.userId.createdAt
        } : null,
        walletInfo: transaction.walletId ? {
          id: transaction.walletId._id || transaction.walletId,
          balance: transaction.walletId.balance || 0
        } : null
      },
      relatedTransactions
    });

  } catch (error) {
    console.error('Admin transaction detail fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching transaction details',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// PUT /api/admin/transactions/:id/status - Update transaction status
router.put('/:id/status', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reason } = req.body;

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid transaction ID format'
      });
    }

    // Validate status
    const validStatuses = ['pending', 'completed', 'failed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be one of: ' + validStatuses.join(', ')
      });
    }

    const transaction = await Transaction.findById(id);
    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    // Update transaction status
    const updateData = { status };
    
    // Add timestamp and reason based on status
    if (status === 'completed') {
      updateData.completedAt = new Date();
    } else if (status === 'failed') {
      updateData.failedAt = new Date();
      if (reason) {
        if (!transaction.metadata) transaction.metadata = {};
        transaction.metadata.failureReason = reason;
      }
    } else if (status === 'cancelled') {
      if (reason) {
        if (!transaction.metadata) transaction.metadata = {};
        transaction.metadata.cancellationReason = reason;
      }
    }

    // Add admin action log
    if (!transaction.metadata) transaction.metadata = {};
    if (!transaction.metadata.adminActions) transaction.metadata.adminActions = [];
    
    transaction.metadata.adminActions.push({
      action: 'status_change',
      from: transaction.status,
      to: status,
      reason: reason || 'No reason provided',
      adminId: req.admin.id,
      adminName: req.admin.name,
      timestamp: new Date()
    });

    // Save the metadata changes first
    await transaction.save();

    // Then update with the status changes
    const updatedTransaction = await Transaction.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    ).populate('userId', 'name email');

    console.log(`Admin ${req.admin.name} updated transaction ${id} status to ${status}`);

    res.json({
      success: true,
      message: `Transaction status updated to ${status}`,
      transaction: updatedTransaction
    });

  } catch (error) {
    console.error('Admin transaction status update error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating transaction status',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// DELETE /api/admin/transactions/:id - Delete individual transaction
router.delete('/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid transaction ID format'
      });
    }

    console.log(`Admin ${req.admin.name} attempting to delete transaction ${id}`);

    const transaction = await Transaction.findById(id).populate('userId', 'name email');
    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    // Check if transaction can be deleted (business rules)
    if (transaction.status === 'completed' && ['funding', 'payment'].includes(transaction.category)) {
      return res.status(400).json({
        success: false,
        message: 'Completed funding/payment transactions cannot be deleted for audit compliance'
      });
    }

    // Soft delete: Mark as deleted instead of removing from database
    const deleteMetadata = {
      deletedAt: new Date(),
      deletedBy: {
        adminId: req.admin._id,
        adminName: req.admin.name,
        adminEmail: req.admin.email
      },
      deletionReason: reason || 'No reason provided',
      originalStatus: transaction.status
    };

    // Add to existing metadata
    if (!transaction.metadata) transaction.metadata = {};
    transaction.metadata.deletion = deleteMetadata;
    
    // Add admin action log
    if (!transaction.metadata.adminActions) transaction.metadata.adminActions = [];
    transaction.metadata.adminActions.push({
      action: 'delete_transaction',
      reason: reason || 'No reason provided',
      adminId: req.admin._id,
      adminName: req.admin.name,
      timestamp: new Date()
    });

    // Update transaction to mark as deleted
    const updatedTransaction = await Transaction.findByIdAndUpdate(
      id,
      {
        status: 'cancelled', // Change status to cancelled
        metadata: transaction.metadata,
        updatedAt: new Date()
      },
      { new: true }
    );

    // For complete removal (use with caution):
    // await Transaction.findByIdAndDelete(id);

    console.log(`Transaction ${id} soft-deleted by admin ${req.admin.name}`);

    res.json({
      success: true,
      message: 'Transaction deleted successfully',
      transaction: {
        id: updatedTransaction._id,
        reference: updatedTransaction.reference,
        deletedAt: deleteMetadata.deletedAt,
        deletedBy: deleteMetadata.deletedBy.adminName
      }
    });

  } catch (error) {
    console.error('Transaction deletion error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting transaction',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// POST /api/admin/transactions/:id/retry - Retry failed transaction
router.post('/:id/retry', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid transaction ID format'
      });
    }

    const transaction = await Transaction.findById(id);
    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    if (transaction.status !== 'failed') {
      return res.status(400).json({
        success: false,
        message: 'Only failed transactions can be retried'
      });
    }

    // Check retry count
    const retryCount = transaction.metadata?.retryCount || 0;
    if (retryCount >= 3) {
      return res.status(400).json({
        success: false,
        message: 'Maximum retry attempts (3) reached for this transaction'
      });
    }

    // Update transaction for retry
    const metadata = transaction.metadata || {};
    metadata.retryCount = retryCount + 1;
    metadata.lastRetryAt = new Date();
    metadata.retryInitiatedBy = {
      adminId: req.admin._id,
      adminName: req.admin.name
    };

    if (!metadata.adminActions) metadata.adminActions = [];
    metadata.adminActions.push({
      action: 'retry_transaction',
      retryAttempt: metadata.retryCount,
      adminId: req.admin._id,
      adminName: req.admin.name,
      timestamp: new Date()
    });

    await Transaction.findByIdAndUpdate(id, {
      status: 'pending',
      metadata: metadata,
      failedAt: null
    });

    console.log(`Transaction ${id} retry #${metadata.retryCount} initiated by ${req.admin.name}`);

    res.json({
      success: true,
      message: `Transaction retry initiated (attempt #${metadata.retryCount})`,
      retryAttempt: metadata.retryCount
    });

  } catch (error) {
    console.error('Transaction retry error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrying transaction',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// POST /api/admin/transactions/:id/cancel - Cancel pending transaction
router.post('/:id/cancel', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid transaction ID format'
      });
    }

    if (!reason || reason.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Cancellation reason is required'
      });
    }

    const transaction = await Transaction.findById(id);
    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    if (transaction.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Only pending transactions can be cancelled'
      });
    }

    // Update transaction metadata
    const metadata = transaction.metadata || {};
    metadata.cancellationReason = reason;
    metadata.cancelledBy = {
      adminId: req.admin._id,
      adminName: req.admin.name
    };

    if (!metadata.adminActions) metadata.adminActions = [];
    metadata.adminActions.push({
      action: 'cancel_transaction',
      reason: reason,
      adminId: req.admin._id,
      adminName: req.admin.name,
      timestamp: new Date()
    });

    const updatedTransaction = await Transaction.findByIdAndUpdate(
      id,
      {
        status: 'cancelled',
        metadata: metadata
      },
      { new: true }
    ).populate('userId', 'name email');

    console.log(`Transaction ${id} cancelled by admin ${req.admin.name}: ${reason}`);

    res.json({
      success: true,
      message: 'Transaction cancelled successfully',
      transaction: updatedTransaction
    });

  } catch (error) {
    console.error('Transaction cancellation error:', error);
    res.status(500).json({
      success: false,
      message: 'Error cancelling transaction',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// POST /api/admin/transactions/fund-user - Admin manually funds a user
router.post('/fund-user', adminAuth, async (req, res) => {
  try {
    const { userId, amount, reason, reference } = req.body;

    // Validate input
    if (!userId || !amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'User ID and positive amount are required'
      });
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID format'
      });
    }

    console.log(`Admin ${req.admin.name} funding user ${userId} with ${amount}`);

    // Check if user exists and get wallet
    const User = require('../models/User');
    const Wallet = require('../models/Wallet');

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const wallet = await Wallet.findOne({ userId: userId });
    if (!wallet) {
      return res.status(404).json({
        success: false,
        message: 'User wallet not found'
      });
    }

    // Generate transaction reference
    const transactionRef = reference || Transaction.generateReference('ADMIN_FUND');

    // Create transaction record
    const transaction = new Transaction({
      walletId: wallet._id,
      userId: userId,
      type: 'credit',
      amount: parseFloat(amount),
      previousBalance: wallet.balance,
      newBalance: wallet.balance + parseFloat(amount),
      description: reason || 'Manual funding by admin',
      reference: transactionRef,
      status: 'completed',
      category: 'funding',
      metadata: {
        adminFunding: {
          adminId: req.admin._id,
          adminName: req.admin.name,
          adminEmail: req.admin.email,
          reason: reason || 'Manual funding',
          timestamp: new Date(),
          ip_address: req.ip,
          user_agent: req.get('User-Agent')
        },
        source: 'admin_panel'
      },
      processedAt: new Date(),
      completedAt: new Date()
    });

    // Update wallet balance
    await Wallet.findByIdAndUpdate(wallet._id, {
      $inc: { balance: parseFloat(amount) }
    });

    // Save transaction
    await transaction.save();

    // Populate transaction for response
    const populatedTransaction = await Transaction.findById(transaction._id)
      .populate('userId', 'name email phone')
      .populate('walletId', 'balance');

    console.log(`Admin funding completed: ${transactionRef} - ${amount} credited to ${user.name}`);

    res.json({
      success: true,
      message: `Successfully funded user ${user.name} with ₦${amount.toLocaleString()}`,
      transaction: populatedTransaction,
      walletBalance: wallet.balance + parseFloat(amount)
    });

  } catch (error) {
    console.error('Admin funding error:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing admin funding',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// POST /api/admin/transactions/debit-user - Admin manually debits a user
router.post('/debit-user', adminAuth, async (req, res) => {
  try {
    const { userId, amount, reason, reference } = req.body;

    // Validate input
    if (!userId || !amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'User ID and positive amount are required'
      });
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID format'
      });
    }

    console.log(`Admin ${req.admin.name} debiting user ${userId} with ${amount}`);

    // Check if user exists and get wallet
    const User = require('../models/User');
    const Wallet = require('../models/Wallet');

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const wallet = await Wallet.findOne({ userId: userId });
    if (!wallet) {
      return res.status(404).json({
        success: false,
        message: 'User wallet not found'
      });
    }

    // Check if user has sufficient balance
    if (wallet.balance < parseFloat(amount)) {
      return res.status(400).json({
        success: false,
        message: `Insufficient balance. User has ₦${wallet.balance.toLocaleString()}, requested ₦${parseFloat(amount).toLocaleString()}`
      });
    }

    // Generate transaction reference
    const transactionRef = reference || Transaction.generateReference('ADMIN_DEBIT');

    // Create transaction record
    const transaction = new Transaction({
      walletId: wallet._id,
      userId: userId,
      type: 'debit',
      amount: parseFloat(amount),
      previousBalance: wallet.balance,
      newBalance: wallet.balance - parseFloat(amount),
      description: reason || 'Manual debit by admin',
      reference: transactionRef,
      status: 'completed',
      category: 'withdrawal',
      metadata: {
        adminDebit: {
          adminId: req.admin._id,
          adminName: req.admin.name,
          adminEmail: req.admin.email,
          reason: reason || 'Manual debit',
          timestamp: new Date(),
          ip_address: req.ip,
          user_agent: req.get('User-Agent')
        },
        source: 'admin_panel'
      },
      processedAt: new Date(),
      completedAt: new Date()
    });

    // Update wallet balance
    await Wallet.findByIdAndUpdate(wallet._id, {
      $inc: { balance: -parseFloat(amount) }
    });

    // Save transaction
    await transaction.save();

    // Populate transaction for response
    const populatedTransaction = await Transaction.findById(transaction._id)
      .populate('userId', 'name email phone')
      .populate('walletId', 'balance');

    console.log(`Admin debit completed: ${transactionRef} - ${amount} debited from ${user.name}`);

    res.json({
      success: true,
      message: `Successfully debited ₦${amount.toLocaleString()} from user ${user.name}`,
      transaction: populatedTransaction,
      walletBalance: wallet.balance - parseFloat(amount)
    });

  } catch (error) {
    console.error('Admin debit error:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing admin debit',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/admin/transactions/user/:userId - Get specific user's transaction history
router.get('/user/:userId', adminAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 20, type, status, category } = req.query;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID format'
      });
    }

    console.log(`Admin fetching transaction history for user ${userId}`);

    // Check if user exists
    const User = require('../models/User');
    const user = await User.findById(userId).select('name email phone username');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Build query
    const query = { userId: userId };
    if (type && type !== 'all') query.type = type;
    if (status && status !== 'all') query.status = status;
    if (category && category !== 'all') query.category = category;

    // Calculate pagination
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    // Fetch transactions and total count
    const [transactions, total] = await Promise.all([
      Transaction.find(query)
        .populate('walletId', 'balance')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Transaction.countDocuments(query)
    ]);

    // Get user wallet info
    const Wallet = require('../models/Wallet');
    const wallet = await Wallet.findOne({ userId: userId }).select('balance');

    console.log(`Found ${transactions.length} transactions for user ${user.name}`);

    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        username: user.username
      },
      wallet: {
        balance: wallet?.balance || 0
      },
      transactions,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
        hasNext: pageNum < Math.ceil(total / limitNum),
        hasPrev: pageNum > 1
      }
    });

  } catch (error) {
    console.error('Error fetching user transactions:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching user transactions',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// POST /api/admin/transactions/manual - Create manual transaction (flexible funding/debit)
router.post('/manual', adminAuth, async (req, res) => {
  try {
    const { 
      userId, 
      walletId, 
      type, 
      amount, 
      category, 
      description, 
      reference,
      metadata = {} 
    } = req.body;

    // Validate required fields
    if (!userId || !type || !amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'User ID, transaction type, and positive amount are required'
      });
    }

    // Validate transaction type
    const validTypes = ['credit', 'debit'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: `Invalid transaction type. Must be one of: ${validTypes.join(', ')}`
      });
    }

    console.log(`Admin ${req.admin.name} creating manual ${type} transaction for user ${userId}`);

    // Get user and wallet
    const User = require('../models/User');
    const Wallet = require('../models/Wallet');

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const wallet = await Wallet.findOne({ 
      $or: [
        { _id: walletId },
        { userId: userId }
      ]
    });

    if (!wallet) {
      return res.status(404).json({
        success: false,
        message: 'Wallet not found'
      });
    }

    // Check balance for debit transactions
    if (type === 'debit' && wallet.balance < parseFloat(amount)) {
      return res.status(400).json({
        success: false,
        message: `Insufficient balance. Available: ₦${wallet.balance.toLocaleString()}`
      });
    }

    // Calculate new balance
    const previousBalance = wallet.balance;
    const newBalance = type === 'credit' 
      ? previousBalance + parseFloat(amount)
      : previousBalance - parseFloat(amount);

    // Generate reference if not provided
    const transactionRef = reference || Transaction.generateReference(`ADMIN_${type.toUpperCase()}`);

    // Prepare transaction metadata
    const transactionMetadata = {
      ...metadata,
      manualTransaction: {
        adminId: req.admin._id,
        adminName: req.admin.name,
        adminEmail: req.admin.email,
        reason: description || `Manual ${type} transaction`,
        timestamp: new Date(),
        ip_address: req.ip,
        user_agent: req.get('User-Agent')
      },
      source: 'admin_panel'
    };

    // Create transaction
    const transaction = new Transaction({
      walletId: wallet._id,
      userId: userId,
      type: type,
      amount: parseFloat(amount),
      previousBalance: previousBalance,
      newBalance: newBalance,
      description: description || `Manual ${type} by admin`,
      reference: transactionRef,
      status: 'completed',
      category: category || (type === 'credit' ? 'funding' : 'withdrawal'),
      metadata: transactionMetadata,
      processedAt: new Date(),
      completedAt: new Date()
    });

    // Update wallet balance
    const balanceUpdate = type === 'credit' 
      ? { $inc: { balance: parseFloat(amount) } }
      : { $inc: { balance: -parseFloat(amount) } };

    await Wallet.findByIdAndUpdate(wallet._id, balanceUpdate);

    // Save transaction
    await transaction.save();

    // Populate for response
    const populatedTransaction = await Transaction.findById(transaction._id)
      .populate('userId', 'name email phone')
      .populate('walletId', 'balance');

    console.log(`Manual transaction completed: ${transactionRef}`);

    res.json({
      success: true,
      message: `Manual ${type} transaction completed successfully`,
      transaction: populatedTransaction,
      walletBalance: newBalance
    });

  } catch (error) {
    console.error('Manual transaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating manual transaction',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;