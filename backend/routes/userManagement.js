const express = require('express');
const User = require('../models/User');
const Wallet = require('../models/Wallet');
const Transaction = require('../models/Transaction');
const mongoose = require('mongoose');

const router = express.Router();

// GET /api/users/management/list - Get paginated users with filters
router.get('/management/list', async (req, res) => {
  try {
    const {
      search = '',
      status = '',
      kycLevel = '',
      accountType = '',
      page = 1,
      limit = 25,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build query
    const query = {};

    // Search functionality
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { username: { $regex: search, $options: 'i' } }
      ];
    }

    // Status filter
    if (status) {
      switch (status) {
        case 'active':
          query.isActive = true;
          query.suspendedAt = { $exists: false };
          query.deletedAt = { $exists: false };
          break;
        case 'suspended':
          query.suspendedAt = { $exists: true };
          query.$or = [
            { suspensionType: 'permanent' },
            { suspensionExpiresAt: { $gt: new Date() } }
          ];
          break;
        case 'pending_verification':
          query.isEmailVerified = false;
          query.deletedAt = { $exists: false };
          break;
        case 'inactive':
          query.isActive = false;
          query.suspendedAt = { $exists: false };
          query.deletedAt = { $exists: false };
          break;
        case 'deleted':
          query.deletedAt = { $exists: true };
          break;
      }
    }

    // KYC Level filter
    if (kycLevel) {
      query.kycLevel = parseInt(kycLevel);
    }

    // Account Type filter
    if (accountType) {
      query.accountType = accountType;
    }

    // Exclude permanently deleted users unless specifically requested
    if (status !== 'deleted') {
      query.deletedAt = { $exists: false };
    }

    // Pagination
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    // Sort
    const sortObj = {};
    sortObj[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Execute queries
    const [users, totalUsers] = await Promise.all([
      User.find(query)
        .select('-password -pin -resetPasswordToken -emailVerificationToken')
        .sort(sortObj)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      User.countDocuments(query)
    ]);

    // Get user IDs for wallet and transaction data
    const userIds = users.map(user => user._id);

    // Fetch wallet data for all users
    const wallets = await Wallet.find({ userId: { $in: userIds } })
      .select('userId balance stats.transactionCount')
      .lean();

    // Create wallet lookup map
    const walletMap = {};
    wallets.forEach(wallet => {
      walletMap[wallet.userId.toString()] = wallet;
    });

    // Format users with additional data
    const formattedUsers = users.map(user => {
      const wallet = walletMap[user._id.toString()];
      const status = getStatusFromUser(user);
      
      return {
        ...user,
        status,
        kycStatus: getKycStatus(user),
        walletBalance: wallet ? wallet.balance : 0,
        transactionCount: wallet ? wallet.stats.transactionCount : 0,
        registrationDate: formatDate(user.createdAt),
        lastLoginFormatted: user.lastLogin ? formatRelativeTime(user.lastLogin) : 'Never',
        displayName: user.name || user.username
      };
    });

    // Pagination info
    const totalPages = Math.ceil(totalUsers / limitNum);
    const hasNextPage = pageNum < totalPages;
    const hasPrevPage = pageNum > 1;

    res.json({
      success: true,
      users: formattedUsers,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalUsers,
        hasNextPage,
        hasPrevPage,
        limit: limitNum
      }
    });

  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/users/management/stats - Get user statistics
router.get('/management/stats', async (req, res) => {
  try {
    const stats = await Promise.all([
      // Total users (excluding deleted)
      User.countDocuments({ deletedAt: { $exists: false } }),
      
      // Active users
      User.countDocuments({ 
        isActive: true, 
        suspendedAt: { $exists: false },
        deletedAt: { $exists: false }
      }),
      
      // Suspended users
      User.countDocuments({
        suspendedAt: { $exists: true },
        $or: [
          { suspensionType: 'permanent' },
          { suspensionExpiresAt: { $gt: new Date() } }
        ],
        deletedAt: { $exists: false }
      }),
      
      // Unverified users
      User.countDocuments({ 
        isEmailVerified: false,
        deletedAt: { $exists: false }
      })
    ]);

    res.json({
      success: true,
      overview: {
        totalUsers: stats[0],
        activeUsers: stats[1],
        suspendedUsers: stats[2],
        unverifiedUsers: stats[3]
      }
    });

  } catch (error) {
    console.error('Error fetching user stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/users/management/:id - Get single user details
router.get('/management/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID'
      });
    }

    const user = await User.findById(id)
      .select('-password -pin -resetPasswordToken -emailVerificationToken')
      .lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get wallet data
    const wallet = await Wallet.findOne({ userId: id }).lean();

    // Get recent transactions
    const recentTransactions = await Transaction.find({ userId: id })
      .select('type amount description status createdAt category')
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    // Get transaction summary
    const transactionSummary = await Transaction.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(id),
          status: 'completed'
        }
      },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      }
    ]);

    // Format user data
    const formattedUser = {
      ...user,
      status: getStatusFromUser(user),
      kycStatus: getKycStatus(user),
      walletBalance: wallet ? wallet.balance : 0,
      transactionCount: wallet ? wallet.stats.transactionCount : 0,
      registrationDate: formatDate(user.createdAt),
      lastLoginFormatted: user.lastLogin ? formatRelativeTime(user.lastLogin) : 'Never',
      displayName: user.name || user.username,
      wallet: wallet ? {
        balance: wallet.balance,
        currency: wallet.currency,
        isActive: wallet.isActive,
        stats: wallet.stats
      } : null,
      recentTransactions: recentTransactions.map(tx => ({
        ...tx,
        formattedAmount: formatCurrency(tx.amount),
        timeAgo: formatRelativeTime(tx.createdAt)
      })),
      transactionSummary
    };

    res.json({
      success: true,
      user: formattedUser
    });

  } catch (error) {
    console.error('Error fetching user details:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user details',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// PUT /api/users/management/:id/status - Update user status
router.put('/management/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { action, reason, expiresAt } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID'
      });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    switch (action) {
      case 'activate':
        user.isActive = true;
        user.suspendedAt = undefined;
        user.suspensionReason = undefined;
        user.suspensionExpiresAt = undefined;
        user.suspensionType = undefined;
        break;

      case 'suspend':
        const expirationDate = expiresAt ? new Date(expiresAt) : null;
        await user.suspend(reason, expirationDate);
        break;

      case 'unsuspend':
        await user.unsuspend();
        break;

      case 'delete':
        await user.softDelete();
        break;

      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid action'
        });
    }

    if (action !== 'suspend') {
      await user.save();
    }

    // Log admin action - Fixed undefined error
    console.log('Admin Action:', {
      adminId: req.user?._id || req.admin?._id || 'unknown',
      adminEmail: req.user?.email || req.admin?.email || 'unknown',
      action: `user_${action}`,
      targetUserId: user._id,
      targetUserEmail: user.email,
      reason: reason || 'No reason provided',
      timestamp: new Date().toISOString(),
      ip: req.ip
    });

    // ONLY send one response
    return res.json({
      success: true,
      message: `User ${action}d successfully`,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        status: getStatusFromUser(user),
        isActive: user.isActive,
        suspendedAt: user.suspendedAt,
        suspensionReason: user.suspensionReason
      }
    });

  } catch (error) {
    console.error('Error updating user status:', error);
    
    // Only send error response if headers haven't been sent already
    if (!res.headersSent) {
      return res.status(500).json({
        success: false,
        message: 'Failed to update user status',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
});

// POST /api/users/management/bulk - Bulk operations
router.post('/management/bulk', async (req, res) => {
  try {
    const { userIds, action, reason, expiresAt } = req.body;

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user IDs array'
      });
    }

    // Validate all user IDs
    const invalidIds = userIds.filter(id => !mongoose.Types.ObjectId.isValid(id));
    if (invalidIds.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user IDs found',
        invalidIds
      });
    }

    const users = await User.find({ _id: { $in: userIds } });
    const results = [];
    const errors = [];

    for (const user of users) {
      try {
        switch (action) {
          case 'activate':
            user.isActive = true;
            user.suspendedAt = undefined;
            user.suspensionReason = undefined;
            user.suspensionExpiresAt = undefined;
            user.suspensionType = undefined;
            await user.save();
            break;

          case 'suspend':
            const expirationDate = expiresAt ? new Date(expiresAt) : null;
            await user.suspend(reason, expirationDate);
            break;

          case 'delete':
            await user.softDelete();
            break;

          default:
            throw new Error('Invalid action');
        }

        results.push({
          userId: user._id,
          name: user.name,
          email: user.email,
          status: 'success'
        });

      } catch (error) {
        errors.push({
          userId: user._id,
          name: user.name,
          email: user.email,
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      message: `Bulk ${action} completed`,
      results: {
        successful: results,
        failed: errors,
        total: userIds.length,
        successCount: results.length,
        errorCount: errors.length
      }
    });

  } catch (error) {
    console.error('Error performing bulk operation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to perform bulk operation',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Helper functions
function getStatusFromUser(user) {
  if (user.deletedAt) return 'deleted';
  if (user.suspendedAt && (user.suspensionType === 'permanent' || 
      (user.suspensionExpiresAt && user.suspensionExpiresAt > new Date()))) {
    return 'suspended';
  }
  if (!user.isEmailVerified) return 'pending_verification';
  if (user.isActive) return 'active';
  return 'inactive';
}

function getKycStatus(user) {
  if (user.kycLevel === 0) return 'not_started';
  if (user.kycData && user.kycData.verificationStatus) {
    return user.kycData.verificationStatus;
  }
  return user.kycLevel > 0 ? 'verified' : 'not_started';
}

function formatDate(date) {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

function formatRelativeTime(date) {
  const now = new Date();
  const diffMs = now - new Date(date);
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor(diffMs / (1000 * 60));

  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 30) return `${diffDays}d ago`;
  return formatDate(date);
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0
  }).format(amount);
}

module.exports = router;