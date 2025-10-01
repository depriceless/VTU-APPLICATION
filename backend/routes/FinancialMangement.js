const express = require('express');
const router = express.Router();

// Import the adminAuth middleware
const verifyAdminToken = require('../middleware/adminAuth');

const Transaction = require('../models/Transaction');
const User = require('../models/User');
const Wallet = require('../models/Wallet');
const ServiceConfig = require('../models/ServiceConfig');

// You'll need to create these new models
const BankAccount = require('../models/BankAccount');
const Settlement = require('../models/Settlement');

// ==================== REVENUE MANAGEMENT ====================

/**
 * @route   GET /api/admin/financial/revenue
 * @desc    Get revenue data with date range filtering
 * @access  Private (Admin)
 */
router.get('/revenue', verifyAdminToken, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date are required',
        code: 'MISSING_DATES'
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    if (start > end) {
      return res.status(400).json({
        success: false,
        message: 'Start date cannot be after end date',
        code: 'INVALID_DATE_RANGE'
      });
    }

    // Calculate current period dates
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const yearStart = new Date(now.getFullYear(), 0, 1);

    // Previous period for growth calculation
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

    // Parallel queries for better performance
    const [
      todayRevenue,
      weeklyRevenue,
      monthlyRevenue,
      yearlyRevenue,
      prevMonthRevenue,
      topServices,
      recentTransactions
    ] = await Promise.all([
      // Today's revenue
      Transaction.aggregate([
        {
          $match: {
            createdAt: { $gte: todayStart },
            status: 'completed',
            $or: [
              { type: 'credit' },
              { type: 'payment' },
              { category: { $in: ['airtime', 'data', 'electricity', 'cableTv', 'betting'] } }
            ]
          }
        },
        { $group: { _id: null, totalRevenue: { $sum: '$amount' } } }
      ]),

      // Weekly revenue
      Transaction.aggregate([
        {
          $match: {
            createdAt: { $gte: weekStart },
            status: 'completed',
            $or: [
              { type: 'credit' },
              { type: 'payment' },
              { category: { $in: ['airtime', 'data', 'electricity', 'cableTv', 'betting'] } }
            ]
          }
        },
        { $group: { _id: null, totalRevenue: { $sum: '$amount' } } }
      ]),

      // Monthly revenue
      Transaction.aggregate([
        {
          $match: {
            createdAt: { $gte: monthStart },
            status: 'completed',
            $or: [
              { type: 'credit' },
              { type: 'payment' },
              { category: { $in: ['airtime', 'data', 'electricity', 'cableTv', 'betting'] } }
            ]
          }
        },
        { $group: { _id: null, totalRevenue: { $sum: '$amount' } } }
      ]),

      // Yearly revenue
      Transaction.aggregate([
        {
          $match: {
            createdAt: { $gte: yearStart },
            status: 'completed',
            $or: [
              { type: 'credit' },
              { type: 'payment' },
              { category: { $in: ['airtime', 'data', 'electricity', 'cableTv', 'betting'] } }
            ]
          }
        },
        { $group: { _id: null, totalRevenue: { $sum: '$amount' } } }
      ]),

      // Previous month revenue for growth calculation
      Transaction.aggregate([
        {
          $match: {
            createdAt: { $gte: prevMonthStart, $lte: prevMonthEnd },
            status: 'completed',
            $or: [
              { type: 'credit' },
              { type: 'payment' },
              { category: { $in: ['airtime', 'data', 'electricity', 'cableTv', 'betting'] } }
            ]
          }
        },
        { $group: { _id: null, totalRevenue: { $sum: '$amount' } } }
      ]),

      // Top performing services with growth calculation
      Transaction.aggregate([
        {
          $match: {
            createdAt: { $gte: start, $lte: end },
            status: 'completed',
            category: { $exists: true, $ne: null }
          }
        },
        {
          $group: {
            _id: '$category',
            revenue: { $sum: '$amount' },
            transactions: { $sum: 1 }
          }
        },
        { $sort: { revenue: -1 } },
        { $limit: 10 }
      ]),

      // Recent transactions
      Transaction.find({
        createdAt: { $gte: start, $lte: end },
        status: 'completed'
      })
      .populate('userId', 'username email phone')
      .sort({ createdAt: -1 })
      .limit(20)
    ]);

    // Calculate growth for each service
    const serviceGrowthPromises = topServices.map(async (service) => {
      const prevPeriodRevenue = await Transaction.aggregate([
        {
          $match: {
            createdAt: { $gte: prevMonthStart, $lte: prevMonthEnd },
            status: 'completed',
            category: service._id
          }
        },
        { $group: { _id: null, revenue: { $sum: '$amount' } } }
      ]);

      const currentRevenue = service.revenue;
      const previousRevenue = prevPeriodRevenue[0]?.revenue || 0;
      const growth = previousRevenue > 0 
        ? ((currentRevenue - previousRevenue) / previousRevenue) * 100 
        : currentRevenue > 0 ? 100 : 0;

      return {
        ...service,
        growth: parseFloat(growth.toFixed(2))
      };
    });

    const servicesWithGrowth = await Promise.all(serviceGrowthPromises);

    // Service icons mapping
    const serviceIcons = {
      'airtime': '📱',
      'data': '📶', 
      'electricity': '⚡',
      'cableTv': '📺',
      'betting': '🎲',
      'transfer': '💸',
      'funding': '💰',
      'default': '📋'
    };

    // Enhanced top services with icons and real growth
    const enhancedTopServices = servicesWithGrowth.map(service => ({
      name: service._id || 'Unknown',
      icon: serviceIcons[service._id] || serviceIcons.default,
      revenue: service.revenue,
      transactions: service.transactions,
      growth: service.growth
    }));

    // Calculate overall revenue growth
    const currentMonthRevenue = monthlyRevenue[0]?.totalRevenue || 0;
    const previousMonthRevenue = prevMonthRevenue[0]?.totalRevenue || 0;
    const revenueGrowth = previousMonthRevenue > 0 
      ? ((currentMonthRevenue - previousMonthRevenue) / previousMonthRevenue) * 100 
      : currentMonthRevenue > 0 ? 100 : 0;

    const revenueData = {
      todayRevenue: todayRevenue[0]?.totalRevenue || 0,
      weeklyRevenue: weeklyRevenue[0]?.totalRevenue || 0,
      monthlyRevenue: currentMonthRevenue,
      yearlyRevenue: yearlyRevenue[0]?.totalRevenue || 0,
      revenueGrowth: parseFloat(revenueGrowth.toFixed(2)),
      topServices: enhancedTopServices,
      recentTransactions: recentTransactions.map(tx => ({
        id: tx._id,
        reference: tx.reference,
        amount: tx.amount,
        description: tx.description || tx.category || 'N/A',
        user: tx.userId?.username || 'Unknown',
        date: tx.createdAt
      }))
    };

    res.json({
      success: true,
      data: revenueData,
      message: 'Revenue data retrieved successfully'
    });

  } catch (error) {
    console.error('Revenue fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching revenue data'
    });
  }
});

// ==================== COMMISSION SETTINGS ====================

/**
 * @route   GET /api/admin/financial/commissions
 * @desc    Get current commission settings for all services
 * @access  Private (Admin)
 */
router.get('/commissions', verifyAdminToken, async (req, res) => {
  try {
    const services = await ServiceConfig.find().select('serviceType pricing displayName isActive');
    
    const commissionSettings = {};
    services.forEach(service => {
      if (service.isActive !== false) {
        commissionSettings[service.serviceType] = {
          percentage: service.pricing?.markupPercentage || 0,
          flatFee: service.pricing?.flatFee || 0,
          displayName: service.displayName || service.serviceType
        };
      }
    });

    // If no services found, initialize with basic structure
    if (Object.keys(commissionSettings).length === 0) {
      const defaultServices = [
        { type: 'airtime', name: 'Airtime' },
        { type: 'data', name: 'Data' },
        { type: 'electricity', name: 'Electricity' },
        { type: 'cableTv', name: 'Cable TV' },
        { type: 'betting', name: 'Betting' }
      ];

      for (const service of defaultServices) {
        commissionSettings[service.type] = { 
          percentage: 0, 
          flatFee: 0,
          displayName: service.name
        };
      }
    }

    res.json({
      success: true,
      data: commissionSettings
    });

  } catch (error) {
    console.error('Commission fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching commission settings'
    });
  }
});

/**
 * @route   PUT /api/admin/financial/commissions
 * @desc    Update commission settings for a service
 * @access  Private (Admin)
 */
router.put('/commissions', verifyAdminToken, async (req, res) => {
  try {
    const { service, percentage, flatFee } = req.body;

    if (!service) {
      return res.status(400).json({
        success: false,
        message: 'Service type is required',
        code: 'MISSING_SERVICE_TYPE'
      });
    }

    // Validate percentage
    if (typeof percentage !== 'number' || percentage < 0 || percentage > 100) {
      return res.status(400).json({
        success: false,
        message: 'Percentage must be a number between 0 and 100',
        code: 'INVALID_PERCENTAGE'
      });
    }

    // Validate flat fee
    if (typeof flatFee !== 'number' || flatFee < 0) {
      return res.status(400).json({
        success: false,
        message: 'Flat fee must be a non-negative number',
        code: 'INVALID_FLAT_FEE'
      });
    }

    // Find or create service config
    let serviceConfig = await ServiceConfig.findOne({ serviceType: service });
    
    if (!serviceConfig) {
      // Create new service config
      serviceConfig = new ServiceConfig({
        serviceType: service,
        displayName: service.charAt(0).toUpperCase() + service.slice(1),
        pricing: { markupPercentage: percentage, flatFee: flatFee },
        isActive: true,
        createdAt: new Date()
      });
    } else {
      // Update existing
      if (!serviceConfig.pricing) {
        serviceConfig.pricing = {};
      }
      serviceConfig.pricing.markupPercentage = percentage;
      serviceConfig.pricing.flatFee = flatFee;
      serviceConfig.lastModified = new Date();
    }

    await serviceConfig.save();

    res.json({
      success: true,
      message: 'Commission settings updated successfully',
      data: {
        service,
        percentage,
        flatFee
      }
    });

  } catch (error) {
    console.error('Commission update error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating commission settings'
    });
  }
});

// ==================== WALLET MANAGEMENT ====================

/**
 * @route   GET /api/admin/financial/wallet-stats
 * @desc    Get wallet statistics and recent activities
 * @access  Private (Admin)
 */
router.get('/wallet-stats', verifyAdminToken, async (req, res) => {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    // Parallel queries for wallet statistics
    const [
      totalBalance,
      totalUsers,
      walletsWithRecentActivity,
      pendingTransactions,
      lowBalanceUsers,
      recentActivities
    ] = await Promise.all([
      // Total balance across all wallets
      Wallet.aggregate([
        { $group: { _id: null, totalBalance: { $sum: '$balance' } } }
      ]),

      // Total users count
      User.countDocuments(),

      // Active wallets (has transactions in last 30 days)
      Transaction.aggregate([
        {
          $match: {
            createdAt: { $gte: thirtyDaysAgo }
          }
        },
        {
          $group: {
            _id: '$userId',
            transactionCount: { $sum: 1 }
          }
        },
        {
          $count: 'activeWallets'
        }
      ]),

      // Pending transactions count
      Transaction.countDocuments({ status: 'pending' }),

      // Low balance users (balance < 1000)
      Wallet.countDocuments({ balance: { $lt: 1000 } }),

      // Recent wallet activities
      Transaction.find()
        .populate('userId', 'username email')
        .sort({ createdAt: -1 })
        .limit(15)
        .select('type amount status createdAt userId description category')
    ]);

    const walletStats = {
      totalBalance: totalBalance[0]?.totalBalance || 0,
      totalUsers,
      activeWallets: walletsWithRecentActivity[0]?.activeWallets || 0,
      pendingTransactions,
      lowBalanceUsers,
      recentActivities: recentActivities.map(activity => ({
        userName: activity.userId?.username || 'Unknown User',
        type: activity.type === 'credit' ? 'Credit' : 'Debit',
        amount: activity.amount,
        status: activity.status.charAt(0).toUpperCase() + activity.status.slice(1),
        timestamp: activity.createdAt.toLocaleString(),
        description: activity.description || activity.category || 'Transaction'
      }))
    };

    res.json({
      success: true,
      data: walletStats
    });

  } catch (error) {
    console.error('Wallet stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching wallet statistics'
    });
  }
});

// ==================== BANK INTEGRATION ====================

/**
 * @route   GET /api/admin/financial/bank-accounts
 * @desc    Get all configured bank accounts
 * @access  Private (Admin)
 */
router.get('/bank-accounts', verifyAdminToken, async (req, res) => {
  try {
    const bankAccounts = await BankAccount.find()
      .select('accountName accountNumber bankName bankCode isActive createdAt lastUsed')
      .sort({ createdAt: -1 });

    const formattedAccounts = bankAccounts.map(account => ({
      id: account._id,
      accountName: account.accountName,
      accountNumber: account.accountNumber,
      bankName: account.bankName,
      bankCode: account.bankCode,
      isActive: account.isActive,
      createdAt: account.createdAt,
      lastUsed: account.lastUsed
    }));

    res.json({
      success: true,
      data: formattedAccounts
    });

  } catch (error) {
    console.error('Bank accounts fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching bank accounts'
    });
  }
});

/**
 * @route   POST /api/admin/financial/bank-accounts
 * @desc    Add new bank account
 * @access  Private (Admin)
 */
router.post('/bank-accounts', verifyAdminToken, async (req, res) => {
  try {
    const { accountName, accountNumber, bankName, bankCode, isActive } = req.body;

    // Validate required fields
    if (!accountName || !accountNumber || !bankName) {
      return res.status(400).json({
        success: false,
        message: 'Account name, number, and bank name are required',
        code: 'MISSING_REQUIRED_FIELDS'
      });
    }

    // Check if account number already exists
    const existingAccount = await BankAccount.findOne({ 
      accountNumber: accountNumber.trim(),
      bankCode: bankCode 
    });

    if (existingAccount) {
      return res.status(400).json({
        success: false,
        message: 'Bank account with this number already exists',
        code: 'DUPLICATE_ACCOUNT'
      });
    }

    // Create new bank account
    const newAccount = new BankAccount({
      accountName: accountName.trim(),
      accountNumber: accountNumber.trim(),
      bankName: bankName.trim(),
      bankCode: bankCode?.trim() || '',
      isActive: isActive !== undefined ? isActive : true,
      createdAt: new Date()
    });

    await newAccount.save();

    res.status(201).json({
      success: true,
      data: {
        id: newAccount._id,
        accountName: newAccount.accountName,
        accountNumber: newAccount.accountNumber,
        bankName: newAccount.bankName,
        bankCode: newAccount.bankCode,
        isActive: newAccount.isActive,
        createdAt: newAccount.createdAt
      },
      message: 'Bank account added successfully'
    });

  } catch (error) {
    console.error('Bank account creation error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while adding bank account'
    });
  }
});

/**
 * @route   PUT /api/admin/financial/bank-accounts/:id
 * @desc    Update bank account
 * @access  Private (Admin)
 */
router.put('/bank-accounts/:id', verifyAdminToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    const bankAccount = await BankAccount.findById(id);
    
    if (!bankAccount) {
      return res.status(404).json({
        success: false,
        message: 'Bank account not found',
        code: 'ACCOUNT_NOT_FOUND'
      });
    }

    if (typeof isActive === 'boolean') {
      bankAccount.isActive = isActive;
      bankAccount.lastModified = new Date();
      await bankAccount.save();
    }

    res.json({
      success: true,
      message: 'Bank account updated successfully',
      data: {
        id: bankAccount._id,
        isActive: bankAccount.isActive
      }
    });

  } catch (error) {
    console.error('Bank account update error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating bank account'
    });
  }
});

// ==================== SETTLEMENT REPORTS ====================

/**
 * @route   GET /api/admin/financial/settlements
 * @desc    Get settlement data and history
 * @access  Private (Admin)
 */
router.get('/settlements', verifyAdminToken, async (req, res) => {
  try {
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000 - 1);

    const [
      pendingSettlements,
      todayCompleted,
      totalSettled,
      recentSettlements
    ] = await Promise.all([
      // Pending settlements total amount
      Settlement.aggregate([
        { $match: { status: 'pending' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),

      // Today's completed settlements
      Settlement.aggregate([
        { 
          $match: { 
            status: 'completed',
            processedAt: { $gte: todayStart, $lte: todayEnd }
          } 
        },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),

      // Total settled amount (all time)
      Settlement.aggregate([
        { $match: { status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),

      // Recent settlements with bank account details
      Settlement.find()
        .populate('bankAccountId', 'accountName bankName accountNumber')
        .sort({ createdAt: -1 })
        .limit(20)
    ]);

    const settlementData = {
      pendingSettlements: pendingSettlements[0]?.total || 0,
      completedToday: todayCompleted[0]?.total || 0,
      totalSettled: totalSettled[0]?.total || 0,
      settlements: recentSettlements.map(settlement => ({
        id: settlement._id,
        amount: settlement.amount,
        status: settlement.status.charAt(0).toUpperCase() + settlement.status.slice(1),
        bankAccount: settlement.bankAccountId 
          ? `${settlement.bankAccountId.bankName} - ${settlement.bankAccountId.accountNumber}`
          : 'N/A',
        date: settlement.processedAt || settlement.createdAt,
        reference: settlement.reference || settlement._id.toString().slice(-8).toUpperCase()
      }))
    };

    res.json({
      success: true,
      data: settlementData
    });

  } catch (error) {
    console.error('Settlement data fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching settlement data'
    });
  }
});

/**
 * @route   POST /api/admin/financial/settlements/:id/process
 * @desc    Process a pending settlement
 * @access  Private (Admin)
 */
router.post('/settlements/:id/process', verifyAdminToken, async (req, res) => {
  try {
    const { id } = req.params;

    const settlement = await Settlement.findById(id);
    
    if (!settlement) {
      return res.status(404).json({
        success: false,
        message: 'Settlement not found',
        code: 'SETTLEMENT_NOT_FOUND'
      });
    }

    if (settlement.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Settlement is not in pending status',
        code: 'INVALID_STATUS'
      });
    }

    // Update settlement status
    settlement.status = 'completed';
    settlement.processedAt = new Date();
    settlement.processedBy = req.admin.id; // Assuming admin info is in req.admin

    await settlement.save();

    // Update bank account last used
    if (settlement.bankAccountId) {
      await BankAccount.findByIdAndUpdate(
        settlement.bankAccountId,
        { lastUsed: new Date() }
      );
    }

    res.json({
      success: true,
      message: 'Settlement processed successfully',
      data: { 
        settlementId: id, 
        status: 'completed', 
        processedAt: settlement.processedAt 
      }
    });

  } catch (error) {
    console.error('Settlement processing error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while processing settlement'
    });
  }
});

// ==================== TAX REPORTS ====================

/**
 * @route   GET /api/admin/financial/tax-reports
 * @desc    Get tax report data
 * @access  Private (Admin)
 */
router.get('/tax-reports', verifyAdminToken, async (req, res) => {
  try {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
    const yearStart = new Date(now.getFullYear(), 0, 1);

    // Get revenue by period for completed transactions only
    const [monthlyRevenue, quarterlyRevenue, yearlyRevenue, serviceBreakdown] = await Promise.all([
      Transaction.aggregate([
        {
          $match: {
            createdAt: { $gte: monthStart },
            status: 'completed',
            category: { $in: ['airtime', 'data', 'electricity', 'cableTv', 'betting'] }
          }
        },
        { $group: { _id: null, revenue: { $sum: '$amount' } } }
      ]),

      Transaction.aggregate([
        {
          $match: {
            createdAt: { $gte: quarterStart },
            status: 'completed',
            category: { $in: ['airtime', 'data', 'electricity', 'cableTv', 'betting'] }
          }
        },
        { $group: { _id: null, revenue: { $sum: '$amount' } } }
      ]),

      Transaction.aggregate([
        {
          $match: {
            createdAt: { $gte: yearStart },
            status: 'completed',
            category: { $in: ['airtime', 'data', 'electricity', 'cableTv', 'betting'] }
          }
        },
        { $group: { _id: null, revenue: { $sum: '$amount' } } }
      ]),

      Transaction.aggregate([
        {
          $match: {
            createdAt: { $gte: yearStart },
            status: 'completed',
            category: { $exists: true, $ne: null }
          }
        },
        {
          $group: {
            _id: '$category',
            grossRevenue: { $sum: '$amount' },
            transactionCount: { $sum: 1 }
          }
        },
        { $sort: { grossRevenue: -1 } }
      ])
    ]);

    const currentMonth = monthlyRevenue[0]?.revenue || 0;
    const currentQuarter = quarterlyRevenue[0]?.revenue || 0;
    const currentYear = yearlyRevenue[0]?.revenue || 0;

    // Calculate VAT (7.5%) and format breakdown
    const breakdown = serviceBreakdown.map(item => {
      const grossRevenue = item.grossRevenue;
      const vat = grossRevenue * 0.075; // 7.5% VAT
      const netRevenue = grossRevenue - vat;

      return {
        category: item._id.charAt(0).toUpperCase() + item._id.slice(1),
        grossRevenue,
        vat,
        netRevenue,
        transactionCount: item.transactionCount
      };
    });

    const taxReports = {
      currentMonth: currentMonth * 0.075,
      currentQuarter: currentQuarter * 0.075,
      currentYear: currentYear * 0.075,
      breakdown
    };

    res.json({
      success: true,
      data: taxReports
    });

  } catch (error) {
    console.error('Tax reports fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching tax reports'
    });
  }
});

module.exports = router;