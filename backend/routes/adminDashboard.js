// routes/adminDashboard.js
const express = require('express');
const router = express.Router();
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const Wallet = require('../models/Wallet');
const adminAuth = require('../middleware/adminAuth');

// GET /api/admin/dashboard/stats - Get dashboard statistics
router.get('/stats', adminAuth, async (req, res) => {
  try {
    console.log('📊 Admin fetching dashboard statistics');

    // Date calculations
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);
    const yesterdayEnd = new Date(todayStart);
    yesterdayEnd.setMilliseconds(-1);

    const last24Hours = new Date(now - 24 * 60 * 60 * 1000);
    const last30Days = new Date(now - 30 * 24 * 60 * 60 * 1000);

    // Parallel execution of all statistics queries
    const [
      todayRevenue,
      yesterdayRevenue,
      totalTransactions24h,
      activeUsers,
      totalUsers,
      successRateData,
      pendingTransactions,
      failedTransactions,
      totalWalletBalance,
      revenueByCategory
    ] = await Promise.all([
      // Today's revenue (completed credit transactions)
      Transaction.aggregate([
        {
          $match: {
            type: 'credit',
            status: 'completed',
            category: { $in: ['funding', 'payment', 'refund'] },
            createdAt: { $gte: todayStart }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' }
          }
        }
      ]),

      // Yesterday's revenue for comparison
      Transaction.aggregate([
        {
          $match: {
            type: 'credit',
            status: 'completed',
            category: { $in: ['funding', 'payment', 'refund'] },
            createdAt: { $gte: yesterdayStart, $lt: yesterdayEnd }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' }
          }
        }
      ]),

      // Total transactions in last 24 hours
      Transaction.countDocuments({
        createdAt: { $gte: last24Hours }
      }),

      // Active users (users with transactions in last 24 hours)
      Transaction.distinct('userId', {
        createdAt: { $gte: last24Hours }
      }),

      // Total registered users
      User.countDocuments(),

      // Success rate calculation (last 24 hours)
      Transaction.aggregate([
        {
          $match: {
            createdAt: { $gte: last24Hours }
          }
        },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]),

      // Pending transactions count
      Transaction.countDocuments({ status: 'pending' }),

      // Failed transactions count  
      Transaction.countDocuments({ status: 'failed' }),

      // Total wallet balance across all wallets
      Wallet.aggregate([
        {
          $group: {
            _id: null,
            total: { $sum: '$balance' }
          }
        }
      ]),

      // Revenue breakdown by category (last 30 days)
      Transaction.aggregate([
        {
          $match: {
            type: 'credit',
            status: 'completed',
            createdAt: { $gte: last30Days }
          }
        },
        {
          $group: {
            _id: '$category',
            total: { $sum: '$amount' },
            count: { $sum: 1 }
          }
        }
      ])
    ]);

    // Process results
    const todayRevenueAmount = todayRevenue[0]?.total || 0;
    const yesterdayRevenueAmount = yesterdayRevenue[0]?.total || 0;
    
    // Calculate revenue change percentage
    const revenueChange = yesterdayRevenueAmount > 0 
      ? ((todayRevenueAmount - yesterdayRevenueAmount) / yesterdayRevenueAmount) * 100
      : todayRevenueAmount > 0 ? 100 : 0;

    // Calculate success rate
    const statusCounts = successRateData.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {});

    const totalTransactionsForRate = Object.values(statusCounts).reduce((a, b) => a + b, 0);
    const completedTransactions = statusCounts.completed || 0;
    const successRate = totalTransactionsForRate > 0 
      ? (completedTransactions / totalTransactionsForRate) * 100 
      : 0;

    const stats = {
      todayRevenue: todayRevenueAmount,
      revenueChange: revenueChange,
      totalTransactions: totalTransactions24h,
      activeUsers: activeUsers.length,
      totalUsers: totalUsers,
      successRate: successRate,
      pendingTransactions: pendingTransactions,
      failedTransactions: failedTransactions,
      totalWalletBalance: totalWalletBalance[0]?.total || 0,
      revenueByCategory: revenueByCategory.reduce((acc, item) => {
        acc[item._id] = {
          amount: item.total,
          count: item.count
        };
        return acc;
      }, {}),
      lastUpdated: new Date().toISOString()
    };

    console.log('✅ Dashboard statistics calculated:', {
      todayRevenue: todayRevenueAmount,
      activeUsers: activeUsers.length,
      successRate: successRate.toFixed(1)
    });

    res.json({
      success: true,
      stats
    });

  } catch (error) {
    console.error('❌ Dashboard statistics error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/admin/dashboard/recent-activities - Get recent system activities
router.get('/recent-activities', adminAuth, async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    
    console.log('📋 Admin fetching recent activities');

    // Get recent transactions with important events
    const recentTransactions = await Transaction.find({
      $or: [
        { status: 'failed' },
        { status: 'pending' },
        { amount: { $gte: 50000 } }, // High value transactions
        { 
          createdAt: { $gte: new Date(Date.now() - 30 * 60 * 1000) } // Last 30 minutes
        }
      ]
    })
    .populate('userId', 'name email')
    .sort({ createdAt: -1 })
    .limit(parseInt(limit))
    .lean();

    // Transform transactions into activity feed format
    const activities = recentTransactions.map(transaction => {
      let icon, description, priority = 'normal';

      if (transaction.status === 'failed') {
        icon = '❌';
        description = `Failed transaction: ${transaction.description || 'N/A'} - ${transaction.formattedAmount || `₦${transaction.amount.toLocaleString()}`}`;
        priority = 'high';
      } else if (transaction.status === 'pending') {
        icon = '⏳';
        description = `Pending transaction: ${transaction.description || 'N/A'} - ${transaction.formattedAmount || `₦${transaction.amount.toLocaleString()}`}`;
        priority = 'medium';
      } else if (transaction.amount >= 50000) {
        icon = '💰';
        description = `High-value transaction: ${transaction.description || 'N/A'} - ${transaction.formattedAmount || `₦${transaction.amount.toLocaleString()}`}`;
        priority = 'medium';
      } else {
        icon = '✅';
        description = `New transaction: ${transaction.description || 'N/A'} - ${transaction.formattedAmount || `₦${transaction.amount.toLocaleString()}`}`;
      }

      // Calculate time ago
      const diffMs = new Date() - new Date(transaction.createdAt);
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      
      let timeAgo;
      if (diffMins < 1) {
        timeAgo = 'Just now';
      } else if (diffMins < 60) {
        timeAgo = `${diffMins} minute(s) ago`;
      } else if (diffHours < 24) {
        timeAgo = `${diffHours} hour(s) ago`;
      } else {
        const diffDays = Math.floor(diffHours / 24);
        timeAgo = `${diffDays} day(s) ago`;
      }

      return {
        id: transaction._id,
        icon,
        description,
        timeAgo,
        priority,
        userId: transaction.userId?._id,
        userName: transaction.userId?.name || 'Unknown User',
        amount: transaction.amount,
        status: transaction.status,
        reference: transaction.reference
      };
    });

    // Add system activities if no recent transactions
    if (activities.length === 0) {
      activities.push({
        icon: '🟢',
        description: 'System is running smoothly - No recent critical activities',
        timeAgo: 'Just now',
        priority: 'low'
      });
    }

    res.json({
      success: true,
      activities: activities.slice(0, parseInt(limit))
    });

  } catch (error) {
    console.error('❌ Recent activities fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching recent activities',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/admin/dashboard/menu-stats - Get statistics for menu items
router.get('/menu-stats', adminAuth, async (req, res) => {
  try {
    console.log('📊 Admin fetching menu statistics');

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [
      totalUsers,
      pendingVerifications,
      suspendedUsers,
      totalTransactions,
      failedTransactions,
      pendingTransactions,
      refundRequests,
      todayRevenue,
      totalWalletBalance,
      serviceSuccessRate,
      adminUsers,
      todayErrors
    ] = await Promise.all([
      // User statistics
      User.countDocuments(),
      User.countDocuments({ 
        $or: [
          { kycStatus: 'pending' },
          { verificationStatus: 'pending' }
        ]
      }),
      User.countDocuments({ 
        $or: [
          { status: 'suspended' },
          { isActive: false }
        ]
      }),

      // Transaction statistics
      Transaction.countDocuments(),
      Transaction.countDocuments({ status: 'failed' }),
      Transaction.countDocuments({ status: 'pending' }),
      Transaction.countDocuments({ category: 'refund', status: 'pending' }),

      // Revenue
      Transaction.aggregate([
        {
          $match: {
            type: 'credit',
            status: 'completed',
            createdAt: { $gte: todayStart }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' }
          }
        }
      ]),

      // Wallet balance
      Wallet.aggregate([
        {
          $group: {
            _id: null,
            total: { $sum: '$balance' }
          }
        }
      ]),

      // Service success rate (last 24 hours)
      Transaction.aggregate([
        {
          $match: {
            category: { $in: ['funding', 'payment'] },
            createdAt: { $gte: new Date(now - 24 * 60 * 60 * 1000) }
          }
        },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]),

      // Admin user count (if Admin model exists)
      // User.countDocuments({ role: { $in: ['admin', 'super_admin'] } }),
      3, // Placeholder - replace with actual query when Admin model is ready

      // Today's error count (placeholder)
      0 // This would come from error logs when implemented
    ]);

    // Calculate service success rate
    const serviceStatusCounts = serviceSuccessRate.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {});

    const totalServiceTransactions = Object.values(serviceStatusCounts).reduce((a, b) => a + b, 0);
    const completedServiceTransactions = serviceStatusCounts.completed || 0;
    const calculatedSuccessRate = totalServiceTransactions > 0 
      ? ((completedServiceTransactions / totalServiceTransactions) * 100).toFixed(1)
      : '100.0';

    const menuStats = {
      // User Management
      totalUsers,
      pendingVerifications,
      suspendedUsers,

      // Transaction Management  
      totalTransactions,
      failedTransactions,
      pendingTransactions,
      refundRequests,

      // Financial
      todayRevenue: todayRevenue[0]?.total || 0,
      totalWalletBalance: totalWalletBalance[0]?.total || 0,

      // Service Management
      servicesOnline: true, // This would be dynamic based on API health checks
      serviceSuccessRate: calculatedSuccessRate,

      // System Management
      systemUptime: '99.9%', // This would come from monitoring service
      todayErrors,
      systemAlerts: failedTransactions + pendingVerifications, // Combined alerts

      // Admin Management
      adminUsers,

      lastUpdated: new Date().toISOString()
    };

    console.log('✅ Menu statistics calculated');

    res.json({
      success: true,
      menuStats
    });

  } catch (error) {
    console.error('❌ Menu statistics error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching menu statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;