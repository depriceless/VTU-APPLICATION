// routes/admin.js - UPDATED VERSION
const express = require('express');
const adminAuth = require('../middleware/adminAuth');
const User = require('../models/User');
const Admin = require('../models/Admin');
const ServiceConfig = require('../models/ServiceConfig');
const ServiceProvider = require('../models/ServiceProvider');
const Transaction = require('../models/Transaction');
const os = require('os');
const axios = require('axios'); // ← ADD THIS LINE
const ApiProvider = require('../models/ApiProvider');
const SystemHealth = require('../models/SystemHealth');
const SystemLog = require('../models/SystemLog');
const MaintenanceMode = require('../models/MaintenanceMode');
const router = express.Router();
// ==================== EXISTING USER MANAGEMENT ====================

// Get all users (admin only)
router.get('/users', adminAuth, async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;
    
    const query = search ? {
      $or: [
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ]
    } : {};

    const users = await User.find(query)
      .select('-password')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const total = await User.countDocuments(query);

    res.json({
      success: true,
      users,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Get user by ID (admin only)
router.get('/users/:id', adminAuth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Update user status (admin only)
router.patch('/users/:id/status', adminAuth, async (req, res) => {
  try {
    const { isActive } = req.body;
    
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'User status updated successfully',
      user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// ==================== SYSTEM OVERVIEW & ANALYTICS ====================

// Get system overview (admin only)
router.get('/overview', adminAuth, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalTransactions = await Transaction.countDocuments();
    const pendingTransactions = await Transaction.countDocuments({ status: 'pending' });
    
    // Get today's transactions
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayTransactions = await Transaction.countDocuments({ 
      createdAt: { $gte: todayStart } 
    });

    // Get revenue stats
    const revenueResult = await Transaction.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: null, totalRevenue: { $sum: '$amount' } } }
    ]);
    const totalRevenue = revenueResult[0]?.totalRevenue || 0;

    res.json({
      success: true,
      overview: {
        totalUsers,
        totalAdmins: await Admin.countDocuments(),
        totalTransactions,
        pendingTransactions,
        todayTransactions,
        totalRevenue,
        services: await ServiceConfig.countDocuments(),
        activeProviders: await ServiceProvider.countDocuments({ isActive: true })
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Admin profile endpoint
router.get('/profile', adminAuth, async (req, res) => {
  try {
    const adminId = req.admin.id;
    
    const admin = await Admin.findById(adminId)
      .select('-password -loginAttempts -lockUntil')
      .lean();
    
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found'
      });
    }

    const profileData = {
      name: admin.username,
      email: admin.email,
      role: admin.role,
      phone: admin.phone || '+234 123 456 7890',
      avatar: admin.username ? admin.username.charAt(0).toUpperCase() : 'A'
    };

    res.json({
      success: true,
      profile: profileData
    });
  } catch (error) {
    console.error('Error fetching admin profile:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching profile'
    });
  }
});

// ==================== SERVICE CONFIGURATION MANAGEMENT ====================

// GET /api/admin/services/config - Get all service configurations
router.get('/services/config', adminAuth, async (req, res) => {
  try {
    const services = await ServiceConfig.find().sort({ serviceType: 1 });
    
    res.json({
      success: true,
      data: services,
      count: services.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Get services config error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch service configurations'
    });
  }
});

// PUT /api/admin/services/config/:serviceId - Update specific service configuration
router.put('/services/config/:serviceId', adminAuth, async (req, res) => {
  try {
    const { serviceId } = req.params;
    const updates = req.body;

    const service = await ServiceConfig.findById(serviceId);
    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service configuration not found'
      });
    }

    // Allowed fields for update
    const allowedUpdates = [
      'isActive', 'maintenanceMode', 'maintenanceMessage', 
      'limits.min', 'limits.max', 'limits.dailyLimit',
      'pricing.markupPercentage', 'pricing.flatFee',
      'displayName', 'description'
    ];

    // Filter and apply updates
    const filteredUpdates = {};
    Object.keys(updates).forEach(key => {
      if (allowedUpdates.includes(key) || key.startsWith('limits.') || key.startsWith('pricing.')) {
        filteredUpdates[key] = updates[key];
      }
    });

    // Handle nested updates
    if (updates.limits) {
      filteredUpdates.limits = { ...service.limits, ...updates.limits };
    }
    if (updates.pricing) {
      filteredUpdates.pricing = { ...service.pricing, ...updates.pricing };
    }

    const updatedService = await ServiceConfig.findByIdAndUpdate(
      serviceId,
      { 
        ...filteredUpdates,
        lastModified: new Date(),
        modifiedBy: req.admin._id
      },
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: 'Service configuration updated successfully',
      data: updatedService
    });

  } catch (error) {
    console.error('Update service config error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update service configuration'
    });
  }
});

// POST /api/admin/services/config/bulk-update - Bulk update service configurations
router.post('/services/config/bulk-update', adminAuth, async (req, res) => {
  try {
    const { updates } = req.body;

    if (!updates || !Array.isArray(updates)) {
      return res.status(400).json({
        success: false,
        message: 'Updates array is required'
      });
    }

    const results = [];
    const errors = [];

    for (const update of updates) {
      try {
        const { serviceId, ...updateData } = update;
        
        const service = await ServiceConfig.findById(serviceId);
        if (!service) {
          errors.push({ serviceId, error: 'Service not found' });
          continue;
        }

        const updatedService = await ServiceConfig.findByIdAndUpdate(
          serviceId,
          {
            ...updateData,
            lastModified: new Date(),
            modifiedBy: req.admin._id
          },
          { new: true }
        );

        results.push(updatedService);
      } catch (error) {
        errors.push({ serviceId: update.serviceId, error: error.message });
      }
    }

    res.json({
      success: true,
      message: `Bulk update completed: ${results.length} successful, ${errors.length} failed`,
      results,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('Bulk update error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to perform bulk update'
    });
  }
});

// ==================== PROVIDER MANAGEMENT ====================

// GET /api/admin/providers - Get all service providers
router.get('/providers', adminAuth, async (req, res) => {
  try {
    const providers = await ServiceProvider.find().sort({ serviceType: 1, priority: 1 });
    
    res.json({
      success: true,
      data: providers,
      count: providers.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Get providers error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch service providers'
    });
  }
});

// POST /api/admin/providers - Create new service provider
router.post('/providers', adminAuth, async (req, res) => {
  try {
    const providerData = req.body;

    // Check if provider code already exists
    const existingProvider = await ServiceProvider.findOne({ code: providerData.code });
    if (existingProvider) {
      return res.status(400).json({
        success: false,
        message: 'Provider code already exists'
      });
    }

    const newProvider = new ServiceProvider(providerData);
    await newProvider.save();

    res.status(201).json({
      success: true,
      message: 'Service provider created successfully',
      data: newProvider
    });

  } catch (error) {
    console.error('Create provider error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create service provider'
    });
  }
});

// PUT /api/admin/providers/:providerId - Update service provider
router.put('/providers/:providerId', adminAuth, async (req, res) => {
  try {
    const { providerId } = req.params;
    const updates = req.body;

    const provider = await ServiceProvider.findById(providerId);
    if (!provider) {
      return res.status(404).json({
        success: false,
        message: 'Service provider not found'
      });
    }

    const updatedProvider = await ServiceProvider.findByIdAndUpdate(
      providerId,
      updates,
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: 'Service provider updated successfully',
      data: updatedProvider
    });

  } catch (error) {
    console.error('Update provider error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update service provider'
    });
  }
});

// DELETE /api/admin/providers/:providerId - Delete service provider
router.delete('/providers/:providerId', adminAuth, async (req, res) => {
  try {
    const { providerId } = req.params;

    const provider = await ServiceProvider.findById(providerId);
    if (!provider) {
      return res.status(404).json({
        success: false,
        message: 'Service provider not found'
      });
    }

    await ServiceProvider.findByIdAndDelete(providerId);

    res.json({
      success: true,
      message: 'Service provider deleted successfully'
    });

  } catch (error) {
    console.error('Delete provider error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete service provider'
    });
  }
});

// PUT /api/admin/providers/:providerId/status - Update provider status
router.put('/providers/:providerId/status', adminAuth, async (req, res) => {
  try {
    const { providerId } = req.params;
    const { isActive } = req.body;

    const provider = await ServiceProvider.findById(providerId);
    if (!provider) {
      return res.status(404).json({
        success: false,
        message: 'Service provider not found'
      });
    }

    provider.isActive = isActive;
    await provider.save();

    res.json({
      success: true,
      message: `Provider ${isActive ? 'activated' : 'deactivated'} successfully`,
      data: provider
    });

  } catch (error) {
    console.error('Update provider status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update provider status'
    });
  }
});

// ==================== SERVICE CONTROL ====================

// PUT /api/admin/services/:serviceId/toggle - Toggle service active status
router.put('/services/:serviceId/toggle', adminAuth, async (req, res) => {
  try {
    const { serviceId } = req.params;
    const { isActive } = req.body;

    const service = await ServiceConfig.findById(serviceId);
    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found'
      });
    }

    service.isActive = isActive;
    service.lastModified = new Date();
    service.modifiedBy = req.admin._id;
    await service.save();

    res.json({
      success: true,
      message: `Service ${isActive ? 'activated' : 'deactivated'} successfully`,
      data: service
    });

  } catch (error) {
    console.error('Toggle service error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to toggle service status'
    });
  }
});

// PUT /api/admin/services/maintenance-mode - Enable/disable maintenance mode
router.put('/services/maintenance-mode', adminAuth, async (req, res) => {
  try {
    const { maintenanceMode, maintenanceMessage } = req.body;

    // Update all services' maintenance mode
    await ServiceConfig.updateMany(
      {},
      {
        maintenanceMode,
        maintenanceMessage: maintenanceMode ? maintenanceMessage : '',
        lastModified: new Date(),
        modifiedBy: req.admin._id
      }
    );

    const updatedServices = await ServiceConfig.find();

    res.json({
      success: true,
      message: `Maintenance mode ${maintenanceMode ? 'enabled' : 'disabled'} for all services`,
      data: updatedServices
    });

  } catch (error) {
    console.error('Maintenance mode error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update maintenance mode'
    });
  }
});

// POST /api/admin/services/bulk-toggle - Bulk toggle services
router.post('/services/bulk-toggle', adminAuth, async (req, res) => {
  try {
    const { serviceIds, isActive } = req.body;

    if (!serviceIds || !Array.isArray(serviceIds)) {
      return res.status(400).json({
        success: false,
        message: 'Service IDs array is required'
      });
    }

    await ServiceConfig.updateMany(
      { _id: { $in: serviceIds } },
      {
        isActive,
        lastModified: new Date(),
        modifiedBy: req.admin._id
      }
    );

    const updatedServices = await ServiceConfig.find({ _id: { $in: serviceIds } });

    res.json({
      success: true,
      message: `${serviceIds.length} services ${isActive ? 'activated' : 'deactivated'}`,
      data: updatedServices
    });

  } catch (error) {
    console.error('Bulk toggle error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to bulk toggle services'
    });
  }
});

// ==================== SERVICE ANALYTICS ====================

// GET /api/admin/services/analytics - Get service analytics
router.get('/services/analytics', adminAuth, async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    
    // Get transaction stats by service type
    const transactionStats = await Transaction.aggregate([
      {
        $match: {
          createdAt: getDateFilter(period)
        }
      },
      {
        $group: {
          _id: '$category',
          totalTransactions: { $sum: 1 },
          successfulTransactions: { 
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          },
          totalAmount: { $sum: '$amount' },
          successAmount: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, '$amount', 0] }
          }
        }
      }
    ]);

    // Calculate success rates
    const analytics = transactionStats.map(stat => ({
      serviceType: stat._id,
      totalTransactions: stat.totalTransactions,
      successfulTransactions: stat.successfulTransactions,
      failedTransactions: stat.totalTransactions - stat.successfulTransactions,
      totalAmount: stat.totalAmount,
      successAmount: stat.successAmount,
      successRate: (stat.successfulTransactions / stat.totalTransactions) * 100
    }));

    res.json({
      success: true,
      period,
      analytics,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Service analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch service analytics'
    });
  }
});

// Helper function for date filtering
function getDateFilter(period) {
  const now = new Date();
  const filter = {};

  switch (period) {
    case '24h':
      filter.$gte = new Date(now.setHours(now.getHours() - 24));
      break;
    case '7d':
      filter.$gte = new Date(now.setDate(now.getDate() - 7));
      break;
    case '30d':
      filter.$gte = new Date(now.setDate(now.getDate() - 30));
      break;
    case '90d':
      filter.$gte = new Date(now.setDate(now.getDate() - 90));
      break;
    default:
      filter.$gte = new Date(now.setDate(now.getDate() - 30));
  }

  return filter;
}

// GET /api/admin/services/performance - Real-time service performance
router.get('/services/performance', adminAuth, async (req, res) => {
  try {
    const services = await ServiceConfig.find();
    
    const performanceData = await Promise.all(
      services.map(async (service) => {
        // Get last 24h stats
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        
        const stats = await Transaction.aggregate([
          {
            $match: {
              category: service.serviceType,
              createdAt: { $gte: twentyFourHoursAgo }
            }
          },
          {
            $group: {
              _id: '$status',
              count: { $sum: 1 },
              totalAmount: { $sum: '$amount' }
            }
          }
        ]);

        const successful = stats.find(s => s._id === 'completed') || { count: 0, totalAmount: 0 };
        const failed = stats.find(s => s._id === 'failed') || { count: 0, totalAmount: 0 };
        const pending = stats.find(s => s._id === 'pending') || { count: 0, totalAmount: 0 };
        
        const total = successful.count + failed.count + pending.count;
        const successRate = total > 0 ? (successful.count / total) * 100 : 0;

        return {
          serviceType: service.serviceType,
          displayName: service.displayName,
          isActive: service.isActive,
          maintenanceMode: service.maintenanceMode,
          performance: {
            successRate: Math.round(successRate * 100) / 100,
            totalTransactions: total,
            successful: successful.count,
            failed: failed.count,
            pending: pending.count,
            revenue: successful.totalAmount
          },
          uptime: '99.5%', // This would come from health checks
          responseTime: '1.2s' // Average response time
        };
      })
    );

    res.json({
      success: true,
      data: performanceData,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Service performance error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch service performance data'
    });
  }
});

// GET /api/admin/services/transactions/stats - Transaction statistics
router.get('/services/transactions/stats', adminAuth, async (req, res) => {
  try {
    const { period = '7d', serviceType } = req.query;
    
    const dateFilter = getDateFilter(period);
    const matchStage = { createdAt: dateFilter };
    
    if (serviceType) {
      matchStage.category = serviceType;
    }

    const stats = await Transaction.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            status: "$status"
          },
          count: { $sum: 1 },
          totalAmount: { $sum: "$amount" }
        }
      },
      {
        $group: {
          _id: "$_id.date",
          transactions: {
            $push: {
              status: "$_id.status",
              count: "$count",
              amount: "$totalAmount"
            }
          },
          totalCount: { $sum: "$count" },
          totalAmount: { $sum: "$totalAmount" }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json({
      success: true,
      period,
      serviceType: serviceType || 'all',
      stats,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Transaction stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch transaction statistics'
    });
  }
});

// GET /api/admin/services/revenue - Revenue analytics
router.get('/services/revenue', adminAuth, async (req, res) => {
  try {
    const { period = '30d', groupBy = 'day' } = req.query;
    
    const dateFormat = groupBy === 'day' ? '%Y-%m-%d' : 
                      groupBy === 'month' ? '%Y-%m' : '%Y-%m-%d';

    const revenueStats = await Transaction.aggregate([
      {
        $match: {
          status: 'completed',
          createdAt: getDateFilter(period)
        }
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: dateFormat, date: "$createdAt" } },
            service: "$category"
          },
          revenue: { $sum: "$amount" },
          transactionCount: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: "$_id.date",
          services: {
            $push: {
              service: "$_id.service",
              revenue: "$revenue",
              transactions: "$transactionCount"
            }
          },
          totalRevenue: { $sum: "$revenue" },
          totalTransactions: { $sum: "$transactionCount" }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Calculate growth percentage
    let growth = 0;
    if (revenueStats.length > 1) {
      const current = revenueStats[revenueStats.length - 1].totalRevenue;
      const previous = revenueStats[revenueStats.length - 2].totalRevenue;
      growth = previous > 0 ? ((current - previous) / previous) * 100 : 100;
    }

    res.json({
      success: true,
      period,
      groupBy,
      totalRevenue: revenueStats.reduce((sum, day) => sum + day.totalRevenue, 0),
      totalTransactions: revenueStats.reduce((sum, day) => sum + day.totalTransactions, 0),
      growth: Math.round(growth * 100) / 100,
      dailyBreakdown: revenueStats,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Revenue analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch revenue analytics'
    });
  }
});

// GET /api/admin/services/performance - Detailed performance metrics
router.get('/services/performance-detailed', adminAuth, async (req, res) => {
  try {
    const { period = '7d' } = req.query;
    const dateFilter = getDateFilter(period);

    const performanceData = await Transaction.aggregate([
      {
        $match: {
          createdAt: dateFilter
        }
      },
      {
        $group: {
          _id: {
            service: '$category',
            status: '$status',
            hour: { $hour: '$createdAt' }
          },
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
          avgResponseTime: { $avg: '$metadata.responseTime' }
        }
      },
      {
        $group: {
          _id: '$_id.service',
          statusBreakdown: {
            $push: {
              status: '$_id.status',
              hour: '$_id.hour',
              count: '$count',
              amount: '$totalAmount'
            }
          },
          totalTransactions: { $sum: '$count' },
          totalAmount: { $sum: '$totalAmount' },
          avgResponseTime: { $avg: '$avgResponseTime' }
        }
      }
    ]);

    const services = await ServiceConfig.find();
    
    const detailedPerformance = performanceData.map(serviceData => {
      const serviceConfig = services.find(s => s.serviceType === serviceData._id);
      const successful = serviceData.statusBreakdown.filter(s => s.status === 'completed');
      const failed = serviceData.statusBreakdown.filter(s => s.status === 'failed');
      
      const successCount = successful.reduce((sum, s) => sum + s.count, 0);
      const successRate = serviceData.totalTransactions > 0 ? 
        (successCount / serviceData.totalTransactions) * 100 : 0;

      // Calculate hourly performance
      const hourlyPerformance = Array.from({ length: 24 }, (_, hour) => {
        const hourData = serviceData.statusBreakdown.filter(s => s.hour === hour);
        const hourSuccess = hourData.filter(s => s.status === 'completed').reduce((sum, s) => sum + s.count, 0);
        const hourTotal = hourData.reduce((sum, s) => sum + s.count, 0);
        
        return {
          hour,
          successRate: hourTotal > 0 ? (hourSuccess / hourTotal) * 100 : 0,
          volume: hourTotal
        };
      });

      return {
        serviceType: serviceData._id,
        displayName: serviceConfig?.displayName || serviceData._id,
        performance: {
          successRate: Math.round(successRate * 100) / 100,
          totalTransactions: serviceData.totalTransactions,
          successful: successCount,
          failed: failed.reduce((sum, f) => sum + f.count, 0),
          revenue: successful.reduce((sum, s) => sum + s.amount, 0),
          avgResponseTime: Math.round(serviceData.avgResponseTime || 0)
        },
        hourlyPerformance,
        peakHours: hourlyPerformance
          .filter(h => h.volume > 0)
          .sort((a, b) => b.volume - a.volume)
          .slice(0, 3)
      };
    });

    res.json({
      success: true,
      period,
      data: detailedPerformance,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Service performance error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch service performance data'
    });
  }
});

// GET /api/admin/services/failure-rates - Detailed failure analysis
router.get('/services/failure-rates', adminAuth, async (req, res) => {
  try {
    const { period = '7d', serviceType } = req.query;
    const dateFilter = getDateFilter(period);
    
    const matchStage = { 
      status: 'failed',
      createdAt: dateFilter 
    };
    
    if (serviceType) {
      matchStage.category = serviceType;
    }

    const failureAnalysis = await Transaction.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: {
            service: '$category',
            errorCode: '$metadata.errorCode',
            hour: { $hour: '$createdAt' }
          },
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
          recentErrors: { 
            $push: {
              error: '$metadata.errorMessage',
              amount: '$amount',
              timestamp: '$createdAt'
            }
          }
        }
      },
      {
        $group: {
          _id: '$_id.service',
          errorBreakdown: {
            $push: {
              errorCode: '$_id.errorCode',
              hour: '$_id.hour',
              count: '$count',
              amount: '$totalAmount',
              recentErrors: { $slice: ['$recentErrors', 5] } // Last 5 errors
            }
          },
          totalFailures: { $sum: '$count' },
          failedAmount: { $sum: '$totalAmount' }
        }
      },
      { $sort: { totalFailures: -1 } }
    ]);

    // Get total transactions for failure rate calculation
    const totalMatch = { createdAt: dateFilter };
    if (serviceType) totalMatch.category = serviceType;

    const totalStats = await Transaction.aggregate([
      { $match: totalMatch },
      {
        $group: {
          _id: '$category',
          totalTransactions: { $sum: 1 }
        }
      }
    ]);

    const failureRates = failureAnalysis.map(serviceData => {
      const totalForService = totalStats.find(t => t._id === serviceData._id);
      const totalTransactions = totalForService?.totalTransactions || 0;
      const failureRate = totalTransactions > 0 ? 
        (serviceData.totalFailures / totalTransactions) * 100 : 0;

      // Group by error code
      const errorSummary = serviceData.errorBreakdown.reduce((acc, error) => {
        if (!acc[error.errorCode]) {
          acc[error.errorCode] = { count: 0, amount: 0, recentErrors: [] };
        }
        acc[error.errorCode].count += error.count;
        acc[error.errorCode].amount += error.amount;
        acc[error.errorCode].recentErrors.push(...error.recentErrors);
        return acc;
      }, {});

      return {
        serviceType: serviceData._id,
        failureRate: Math.round(failureRate * 100) / 100,
        totalFailures: serviceData.totalFailures,
        failedAmount: serviceData.failedAmount,
        totalTransactions,
        errorSummary: Object.entries(errorSummary).map(([errorCode, data]) => ({
          errorCode,
          count: data.count,
          percentage: Math.round((data.count / serviceData.totalFailures) * 100 * 100) / 100,
          amount: data.amount,
          recentErrors: data.recentErrors.slice(0, 3) // Top 3 recent errors
        })).sort((a, b) => b.count - a.count)
      };
    });

    res.json({
      success: true,
      period,
      serviceType: serviceType || 'all',
      data: failureRates,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Failure rates error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch failure rates'
    });
  }
});

// ==================== PRICING MANAGEMENT ====================

// GET /api/admin/pricing/services - Get all services pricing
router.get('/pricing/services', adminAuth, async (req, res) => {
  try {
    const services = await ServiceConfig.find().sort({ serviceType: 1 });
    
    const pricingData = services.map(service => ({
      serviceId: service._id,
      serviceType: service.serviceType,
      displayName: service.displayName,
      currentPricing: service.pricing,
      limits: service.limits,
      statistics: {
        totalRevenue: service.statistics?.totalRevenue || 0,
        successRate: service.statistics?.successRate || 0,
        averageTransaction: service.statistics?.totalTransactions > 0 
          ? service.statistics.totalRevenue / service.statistics.totalTransactions 
          : 0
      },
      lastUpdated: service.lastModified
    }));

    res.json({
      success: true,
      data: pricingData,
      count: pricingData.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Get pricing services error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch services pricing'
    });
  }
});

// PUT /api/admin/pricing/services/:serviceId - Update service pricing
router.put('/pricing/services/:serviceId', adminAuth, async (req, res) => {
  try {
    const { serviceId } = req.params;
    const { markupPercentage, flatFee, minAmount, maxAmount, dailyLimit } = req.body;

    const service = await ServiceConfig.findById(serviceId);
    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found'
      });
    }

    // Validate pricing values
    if (markupPercentage !== undefined) {
      if (markupPercentage < 0 || markupPercentage > 100) {
        return res.status(400).json({
          success: false,
          message: 'Markup percentage must be between 0 and 100'
        });
      }
      service.pricing.markupPercentage = markupPercentage;
    }

    if (flatFee !== undefined) {
      if (flatFee < 0) {
        return res.status(400).json({
          success: false,
          message: 'Flat fee cannot be negative'
        });
      }
      service.pricing.flatFee = flatFee;
    }

    // Update limits if provided
    if (minAmount !== undefined) service.limits.min = minAmount;
    if (maxAmount !== undefined) service.limits.max = maxAmount;
    if (dailyLimit !== undefined) service.limits.dailyLimit = dailyLimit;

    service.lastModified = new Date();
    service.modifiedBy = req.admin._id;

    await service.save();

    res.json({
      success: true,
      message: 'Service pricing updated successfully',
      data: {
        serviceId: service._id,
        serviceType: service.serviceType,
        pricing: service.pricing,
        limits: service.limits,
        lastUpdated: service.lastModified
      }
    });

  } catch (error) {
    console.error('Update service pricing error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update service pricing'
    });
  }
});

// POST /api/admin/pricing/bulk-update - Bulk update pricing
router.post('/pricing/bulk-update', adminAuth, async (req, res) => {
  try {
    const { updates } = req.body;

    if (!updates || !Array.isArray(updates)) {
      return res.status(400).json({
        success: false,
        message: 'Updates array is required'
      });
    }

    const results = [];
    const errors = [];

    for (const update of updates) {
      try {
        const { serviceId, markupPercentage, flatFee } = update;
        
        const service = await ServiceConfig.findById(serviceId);
        if (!service) {
          errors.push({ serviceId, error: 'Service not found' });
          continue;
        }

        if (markupPercentage !== undefined) {
          if (markupPercentage < 0 || markupPercentage > 100) {
            errors.push({ serviceId, error: 'Invalid markup percentage' });
            continue;
          }
          service.pricing.markupPercentage = markupPercentage;
        }

        if (flatFee !== undefined) {
          if (flatFee < 0) {
            errors.push({ serviceId, error: 'Flat fee cannot be negative' });
            continue;
          }
          service.pricing.flatFee = flatFee;
        }

        service.lastModified = new Date();
        service.modifiedBy = req.admin._id;
        await service.save();

        results.push({
          serviceId: service._id,
          serviceType: service.serviceType,
          pricing: service.pricing
        });

      } catch (error) {
        errors.push({ serviceId: update.serviceId, error: error.message });
      }
    }

    res.json({
      success: true,
      message: `Bulk pricing update completed: ${results.length} successful, ${errors.length} failed`,
      results,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('Bulk pricing update error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to perform bulk pricing update'
    });
  }
});

// GET /api/admin/pricing/margins - Get profit margins analysis
router.get('/pricing/margins', adminAuth, async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    const dateFilter = getDateFilter(period);

    // Get completed transactions with service types
    const transactions = await Transaction.aggregate([
      {
        $match: {
          status: 'completed',
          createdAt: dateFilter
        }
      },
      {
        $group: {
          _id: '$category',
          totalAmount: { $sum: '$amount' },
          transactionCount: { $sum: 1 },
          averageAmount: { $avg: '$amount' }
        }
      }
    ]);

    // Get service configurations for pricing data
    const services = await ServiceConfig.find();
    
    const marginAnalysis = transactions.map(tx => {
      const service = services.find(s => s.serviceType === tx._id);
      if (!service) return null;

      const revenue = tx.totalAmount;
      const costPrice = revenue / (1 + service.pricing.markupPercentage / 100) - service.pricing.flatFee * tx.transactionCount;
      const profit = revenue - costPrice;
      const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

      return {
        serviceType: tx._id,
        displayName: service.displayName,
        revenue: Math.round(revenue),
        costPrice: Math.round(costPrice),
        profit: Math.round(profit),
        margin: Math.round(margin * 100) / 100,
        transactionCount: tx.transactionCount,
        averageAmount: Math.round(tx.averageAmount),
        pricing: service.pricing
      };
    }).filter(Boolean);

    // Calculate totals
    const totalRevenue = marginAnalysis.reduce((sum, item) => sum + item.revenue, 0);
    const totalProfit = marginAnalysis.reduce((sum, item) => sum + item.profit, 0);
    const overallMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

    res.json({
      success: true,
      period,
      summary: {
        totalRevenue: Math.round(totalRevenue),
        totalProfit: Math.round(totalProfit),
        overallMargin: Math.round(overallMargin * 100) / 100,
        totalTransactions: marginAnalysis.reduce((sum, item) => sum + item.transactionCount, 0)
      },
      services: marginAnalysis,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Get pricing margins error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch pricing margins'
    });
  }
});

// PUT /api/admin/pricing/margins/:serviceId - Update service margin
router.put('/pricing/margins/:serviceId', adminAuth, async (req, res) => {
  try {
    const { serviceId } = req.params;
    const { targetMargin, markupPercentage, flatFee } = req.body;

    const service = await ServiceConfig.findById(serviceId);
    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found'
      });
    }

    if (targetMargin !== undefined) {
      // Calculate required markup to achieve target margin
      const requiredMarkup = (targetMargin / (100 - targetMargin)) * 100;
      service.pricing.markupPercentage = Math.round(requiredMarkup * 100) / 100;
    }

    if (markupPercentage !== undefined) {
      service.pricing.markupPercentage = markupPercentage;
    }

    if (flatFee !== undefined) {
      service.pricing.flatFee = flatFee;
    }

    service.lastModified = new Date();
    service.modifiedBy = req.admin._id;
    await service.save();

    res.json({
      success: true,
      message: 'Service margin updated successfully',
      data: {
        serviceId: service._id,
        serviceType: service.serviceType,
        pricing: service.pricing,
        calculatedMargin: await calculateCurrentMargin(service.serviceType)
      }
    });

  } catch (error) {
    console.error('Update service margin error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update service margin'
    });
  }
});

// Helper function to calculate current margin
async function calculateCurrentMargin(serviceType) {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  
  const transactions = await Transaction.aggregate([
    {
      $match: {
        category: serviceType,
        status: 'completed',
        createdAt: { $gte: thirtyDaysAgo }
      }
    },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: '$amount' },
        count: { $sum: 1 }
      }
    }
  ]);

  if (transactions.length === 0) return 0;

  const service = await ServiceConfig.findOne({ serviceType });
  const revenue = transactions[0].totalRevenue;
  const costPrice = revenue / (1 + service.pricing.markupPercentage / 100) - service.pricing.flatFee * transactions[0].count;
  const profit = revenue - costPrice;
  
  return revenue > 0 ? (profit / revenue) * 100 : 0;
}


// GET /api/admin/services/:serviceId - Get individual service details
router.get('/services/:serviceId', adminAuth, async (req, res) => {
  try {
    const service = await ServiceConfig.findById(req.params.serviceId);
    if (!service) {
      return res.status(404).json({ success: false, message: 'Service not found' });
    }
    res.json({ success: true, data: service });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching service details' });
  }
});


// PUT /api/admin/services/toggle-by-type/:serviceType - Toggle service by serviceType
router.put('/services/toggle-by-type/:serviceType', adminAuth, async (req, res) => {
  try {
    const { serviceType } = req.params;
    const { isActive } = req.body;

    console.log(`Admin toggling service ${serviceType} to active: ${isActive}`);

    const service = await ServiceConfig.findOne({ serviceType: serviceType });
    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found'
      });
    }

    console.log('Service before update:', {
      serviceType: service.serviceType,
      isActive: service.isActive
    });

    service.isActive = isActive;
    service.lastModified = new Date();
    service.modifiedBy = req.admin._id;
    await service.save();

    console.log('Service after update:', {
      serviceType: service.serviceType,
      isActive: service.isActive
    });

    // Verify the update worked
    const verification = await ServiceConfig.findOne({ serviceType: serviceType });
    console.log('Verification query:', {
      serviceType: verification.serviceType,
      isActive: verification.isActive
    });

    res.json({
      success: true,
      message: `Service ${isActive ? 'activated' : 'deactivated'} successfully`,
      data: service
    });

  } catch (error) {
    console.error('Toggle service by type error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to toggle service status'
    });
  }
});
// PUT /api/admin/services/config/:serviceId - Handle status updates from frontend
router.put('/services/config/:serviceId', adminAuth, async (req, res) => {
  try {
    const { serviceId } = req.params;
    const updates = req.body;

    console.log(`Frontend requesting update for service ${serviceId}:`, updates);

    const service = await ServiceConfig.findById(serviceId);
    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service configuration not found'
      });
    }

    console.log('Service before update:', {
      serviceType: service.serviceType,
      isActive: service.isActive,
      maintenanceMode: service.maintenanceMode
    });

    // Handle status updates specifically
    if (updates.isActive !== undefined) {
      service.isActive = updates.isActive;
    }
    
    if (updates.maintenanceMode !== undefined) {
      service.maintenanceMode = updates.maintenanceMode;
    }

    if (updates.maintenanceMessage !== undefined) {
      service.maintenanceMessage = updates.maintenanceMessage;
    }

    // Handle other updates (pricing, limits, etc.)
    if (updates.pricing) {
      service.pricing = { ...service.pricing, ...updates.pricing };
    }
    
    if (updates.limits) {
      service.limits = { ...service.limits, ...updates.limits };
    }

    service.lastModified = new Date();
    service.modifiedBy = req.admin._id;

    await service.save();

    console.log('Service after update:', {
      serviceType: service.serviceType,
      isActive: service.isActive,
      maintenanceMode: service.maintenanceMode
    });

    // Verify the save worked
    const verification = await ServiceConfig.findById(serviceId);
    console.log('Database verification:', {
      serviceType: verification.serviceType,
      isActive: verification.isActive
    });

    res.json({
      success: true,
      message: 'Service configuration updated successfully',
      data: service
    });

  } catch (error) {
    console.error('Update service config error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update service configuration',
      error: error.message
    });
  }
});


// Add these routes to your existing admin.js file
// These are the missing endpoints your frontend needs

// ==================== ADMIN MANAGEMENT ENDPOINTS ====================

// GET /api/admin/management/stats - Dashboard statistics for admin management
router.get('/management/stats', adminAuth, async (req, res) => {
  try {
    const totalAdmins = await Admin.countDocuments();
    const activeAdmins = await Admin.countDocuments({ isActive: true });
    const inactiveAdmins = await Admin.countDocuments({ isActive: false });
    
    // Count roles (you might need to adjust this based on your role system)
    const totalRoles = await Admin.distinct('role').then(roles => roles.length);

    res.json({
      success: true,
      stats: {
        totalAdmins,
        activeAdmins,
        inactiveAdmins,
        totalRoles
      }
    });
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// GET /api/admin/management/admins - Get all admin users with pagination and filtering
router.get('/management/admins', adminAuth, async (req, res) => {
  try {
    const { 
      search = '', 
      role = '', 
      status = '', 
      page = 1, 
      limit = 25,
      sortBy = 'username',
      sortOrder = 'asc'
    } = req.query;

    // Build query
    const query = {};
    
    if (search) {
      query.$or = [
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    if (role) {
      query.role = role;
    }

    if (status) {
      // Map frontend status to backend field
      if (status === 'active') query.isActive = true;
      else if (status === 'inactive') query.isActive = false;
      // You might need to add 'suspended' status to your Admin model
    }

    // Build sort
    const sortObj = {};
    sortObj[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const totalItems = await Admin.countDocuments(query);
    const totalPages = Math.ceil(totalItems / parseInt(limit));
    const currentPage = parseInt(page);

    const admins = await Admin.find(query)
      .select('-password -loginAttempts -lockUntil')
      .sort(sortObj)
      .limit(parseInt(limit))
      .skip((currentPage - 1) * parseInt(limit))
      .lean();

    // Transform data to match frontend expectations
    const transformedAdmins = admins.map(admin => ({
      _id: admin._id,
      name: admin.username, // Frontend expects 'name' field
      email: admin.email,
      phone: admin.phone || '',
      role: admin.role,
      status: admin.isActive ? 'active' : 'inactive', // Transform boolean to string
      lastActive: admin.lastLogin || admin.updatedAt,
      createdAt: admin.createdAt
    }));

    res.json({
      success: true,
      admins: transformedAdmins,
      pagination: {
        currentPage,
        totalPages,
        totalItems,
        hasNextPage: currentPage < totalPages,
        hasPrevPage: currentPage > 1
      }
    });

  } catch (error) {
    console.error('Error fetching admins:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch admin users'
    });
  }
});

// POST /api/admin/management/admins - Create new admin user
router.post('/management/admins', adminAuth, async (req, res) => {
  try {
    const { name, username, email, phone, role, password, status, isActive } = req.body;

    // Validation
    if (!name && !username) {
      return res.status(400).json({
        success: false,
        message: 'Name or username is required'
      });
    }

    if (!email || !password || !role) {
      return res.status(400).json({
        success: false,
        message: 'Email, password, and role are required'
      });
    }

    const adminUsername = name || username;

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ 
      $or: [{ email }, { username: adminUsername }] 
    });
    
    if (existingAdmin) {
      return res.status(400).json({
        success: false,
        message: 'Admin with this email or username already exists'
      });
    }

    // Determine isActive value - prioritize isActive boolean over status string
    let activeStatus = true; // Default to active
    
    if (isActive !== undefined) {
      // Use isActive if provided
      activeStatus = Boolean(isActive);
    } else if (status !== undefined) {
      // Fall back to status string
      activeStatus = status === 'active';
    }

    console.log('Creating admin with:', {
      username: adminUsername,
      email,
      role,
      isActive: activeStatus,
      receivedIsActive: isActive,
      receivedStatus: status
    });

    // Create new admin
    const newAdmin = new Admin({
      username: adminUsername,
      email,
      phone: phone || null,
      password, // Will be hashed by pre-save middleware
      role,
      isActive: activeStatus // Use the determined active status
    });

    await newAdmin.save();

    // Verify the save worked
    const verifyAdmin = await Admin.findById(newAdmin._id).select('-password');
    console.log('Admin created successfully:', {
      id: verifyAdmin._id,
      username: verifyAdmin.username,
      isActive: verifyAdmin.isActive
    });

    res.status(201).json({
      success: true,
      message: 'Admin user created successfully',
      admin: {
        _id: verifyAdmin._id,
        name: verifyAdmin.username,
        email: verifyAdmin.email,
        phone: verifyAdmin.phone,
        role: verifyAdmin.role,
        isActive: verifyAdmin.isActive,
        status: verifyAdmin.isActive ? 'active' : 'inactive',
        createdAt: verifyAdmin.createdAt
      }
    });

  } catch (error) {
    console.error('Error creating admin:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create admin user',
      error: error.message
    });
  }
});

// PUT /api/admin/management/admins/:adminId - Update admin user
router.put('/management/admins/:adminId', adminAuth, async (req, res) => {
  try {
    const { adminId } = req.params;
    const { name, username, email, phone, role, password, status, isActive } = req.body;

    const admin = await Admin.findById(adminId);
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin user not found'
      });
    }

    // Update fields
    if (name || username) admin.username = name || username;
    if (email) admin.email = email;
    if (phone !== undefined) admin.phone = phone;
    if (role) admin.role = role;
    
    // Handle status update - prioritize isActive over status
    if (isActive !== undefined) {
      admin.isActive = Boolean(isActive);
    } else if (status !== undefined) {
      admin.isActive = status === 'active';
    }
    
    if (password) admin.password = password; // Will be hashed by pre-save middleware

    console.log('Updating admin:', {
      id: adminId,
      isActive: admin.isActive,
      receivedIsActive: isActive,
      receivedStatus: status
    });

    await admin.save();

    // Verify update
    const verifyAdmin = await Admin.findById(adminId).select('-password');
    console.log('Admin updated successfully:', {
      id: verifyAdmin._id,
      isActive: verifyAdmin.isActive
    });

    res.json({
      success: true,
      message: 'Admin user updated successfully',
      admin: {
        _id: verifyAdmin._id,
        name: verifyAdmin.username,
        email: verifyAdmin.email,
        phone: verifyAdmin.phone,
        role: verifyAdmin.role,
        isActive: verifyAdmin.isActive,
        status: verifyAdmin.isActive ? 'active' : 'inactive',
        updatedAt: verifyAdmin.updatedAt
      }
    });

  } catch (error) {
    console.error('Error updating admin:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update admin user',
      error: error.message
    });
  }
});

// PUT /api/admin/management/admins/:adminId/status - Update admin status
router.put('/management/admins/:adminId/status', adminAuth, async (req, res) => {
  try {
    const { adminId } = req.params;
    const { status, isActive } = req.body;

    // Prevent disabling self
    if (adminId === req.admin.id && (isActive === false || status === 'inactive')) {
      return res.status(400).json({
        success: false,
        message: 'Cannot deactivate your own account'
      });
    }

    const admin = await Admin.findById(adminId);
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin user not found'
      });
    }

    // Determine new active status
    let newActiveStatus;
    if (isActive !== undefined) {
      newActiveStatus = Boolean(isActive);
    } else if (status !== undefined) {
      newActiveStatus = status === 'active';
    } else {
      return res.status(400).json({
        success: false,
        message: 'Either isActive or status must be provided'
      });
    }

    console.log('Updating admin status:', {
      id: adminId,
      oldStatus: admin.isActive,
      newStatus: newActiveStatus,
      receivedIsActive: isActive,
      receivedStatus: status
    });

    admin.isActive = newActiveStatus;
    await admin.save();

    // Verify update
    const verifyAdmin = await Admin.findById(adminId).select('-password');
    console.log('Admin status updated:', {
      id: verifyAdmin._id,
      isActive: verifyAdmin.isActive
    });

    res.json({
      success: true,
      message: `Admin ${newActiveStatus ? 'activated' : 'deactivated'} successfully`,
      admin: {
        _id: verifyAdmin._id,
        isActive: verifyAdmin.isActive,
        status: verifyAdmin.isActive ? 'active' : 'inactive',
        updatedAt: verifyAdmin.updatedAt
      }
    });

  } catch (error) {
    console.error('Error updating admin status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update admin status',
      error: error.message
    });
  }
});

// GET /api/admin/management/roles - Get roles and permissions
router.get('/management/roles', adminAuth, async (req, res) => {
  try {
    // Define your role configurations (you might want to move this to a separate file)
    const ROLE_DEFINITIONS = [
      {
        _id: 'super_admin_role',
        name: 'super_admin',
        description: 'Full system access with all permissions',
        permissions: [
          'users_view', 'users_create', 'users_edit', 'users_delete', 'users_suspend',
          'transactions_view', 'transactions_process', 'transactions_refund',
          'services_view', 'services_configure', 'services_pricing',
          'financial_view', 'financial_reports',
          'system_config', 'system_logs',
          'reports_view', 'reports_export'
        ],
        createdAt: new Date()
      },
      {
        _id: 'admin_role',
        name: 'admin',
        description: 'Administrative access with most permissions',
        permissions: [
          'users_view', 'users_create', 'users_edit', 'users_suspend',
          'transactions_view', 'transactions_process',
          'services_view', 'services_configure',
          'financial_view',
          'reports_view', 'reports_export'
        ],
        createdAt: new Date()
      },
      {
        _id: 'manager_role',
        name: 'manager',
        description: 'Management level access',
        permissions: [
          'users_view', 'users_edit',
          'transactions_view',
          'services_view',
          'financial_view',
          'reports_view'
        ],
        createdAt: new Date()
      },
      {
        _id: 'support_role',
        name: 'support',
        description: 'Support staff access',
        permissions: [
          'users_view',
          'transactions_view',
          'services_view'
        ],
        createdAt: new Date()
      }
    ];

    // All available permissions
    const ALL_PERMISSIONS = [
      { id: 'users_view', name: 'View Users', category: 'users' },
      { id: 'users_create', name: 'Create Users', category: 'users' },
      { id: 'users_edit', name: 'Edit Users', category: 'users' },
      { id: 'users_delete', name: 'Delete Users', category: 'users' },
      { id: 'users_suspend', name: 'Suspend Users', category: 'users' },
      { id: 'transactions_view', name: 'View Transactions', category: 'transactions' },
      { id: 'transactions_process', name: 'Process Transactions', category: 'transactions' },
      { id: 'transactions_refund', name: 'Process Refunds', category: 'transactions' },
      { id: 'services_view', name: 'View Services', category: 'services' },
      { id: 'services_configure', name: 'Configure Services', category: 'services' },
      { id: 'services_pricing', name: 'Manage Pricing', category: 'services' },
      { id: 'financial_view', name: 'View Financials', category: 'financial' },
      { id: 'financial_reports', name: 'Generate Reports', category: 'financial' },
      { id: 'system_config', name: 'System Configuration', category: 'system' },
      { id: 'system_logs', name: 'View System Logs', category: 'system' },
      { id: 'reports_view', name: 'View Reports', category: 'reports' },
      { id: 'reports_export', name: 'Export Reports', category: 'reports' }
    ];

    res.json({
      success: true,
      roles: ROLE_DEFINITIONS,
      permissions: ALL_PERMISSIONS
    });

  } catch (error) {
    console.error('Error fetching roles:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch roles'
    });
  }
});

// GET /api/admin/management/activity-logs - Get activity logs
router.get('/management/activity-logs', adminAuth, async (req, res) => {
  try {
    const { action, adminId, page = 1, limit = 50 } = req.query;

    // For now, return empty array since you don't have activity logging yet
    // You'll need to implement activity logging throughout your app
    const mockLogs = [
      {
        _id: 'log1',
        adminId: 'admin123',
        adminName: 'Admin User',
        action: 'login',
        description: 'Admin user logged in',
        status: 'success',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0...',
        timestamp: new Date(),
        metadata: {}
      }
    ];

    res.json({
      success: true,
      logs: mockLogs,
      pagination: {
        currentPage: parseInt(page),
        totalPages: 1,
        totalItems: mockLogs.length,
        hasNextPage: false,
        hasPrevPage: false
      }
    });

  } catch (error) {
    console.error('Error fetching activity logs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch activity logs'
    });
  }
});

// ==================== ADDITIONAL HELPER ENDPOINTS ====================

// GET /api/admin/management/current-admin - Get current admin info
router.get('/management/current-admin', adminAuth, async (req, res) => {
  try {
    const admin = await Admin.findById(req.admin.id)
      .select('-password -loginAttempts -lockUntil');
    
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found'
      });
    }

    res.json({
      success: true,
      admin: {
        _id: admin._id,
        name: admin.username,
        email: admin.email,
        phone: admin.phone,
        role: admin.role,
        status: admin.isActive ? 'active' : 'inactive',
        lastLogin: admin.lastLogin,
        createdAt: admin.createdAt
      }
    });

  } catch (error) {
    console.error('Error fetching current admin:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// ===========================================
// 1. API PROVIDERS MANAGEMENT
// ===========================================

// Get all API providers
router.get('/providers', adminAuth, async (req, res) => {
  try {
    const providers = await ApiProvider.find()
      .select('-apiKey') // Don't expose API keys
      .sort({ priority: 1 });
    
    res.json({
      success: true,
      data: providers
    });
  } catch (error) {
    console.error('Error fetching providers:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch API providers'
    });
  }
});

// Get single provider with balance (ClubKonnect)
router.get('/providers/:id', adminAuth, async (req, res) => {
  try {
    const provider = await ApiProvider.findById(req.params.id);
    
    if (!provider) {
      return res.status(404).json({
        success: false,
        message: 'Provider not found'
      });
    }

    let balance = null;
    
    // Fetch ClubKonnect balance
    if (provider.code === 'CLUBKONNECT') {
      try {
        const balanceResponse = await axios.post(
          `${provider.endpoint}/APIWalletBalanceV1.asp`,
          null,
          {
            params: {
              UserID: provider.metadata.userId,
              APIKey: provider.apiKey
            },
            timeout: 10000
          }
        );

        if (balanceResponse.data) {
          balance = parseFloat(balanceResponse.data) || 0;
        }
      } catch (balanceError) {
        console.error('ClubKonnect balance fetch error:', balanceError.message);
        
        await SystemLog.create({
          level: 'error',
          service: 'ClubKonnect',
          message: 'Failed to fetch balance',
          details: {
            error: balanceError.message,
            provider: provider.code
          }
        });
      }
    }

    // Don't expose API key in response
    const providerData = provider.toObject();
    delete providerData.apiKey;

    res.json({
      success: true,
      data: {
        ...providerData,
        currentBalance: balance
      }
    });
  } catch (error) {
    console.error('Error fetching provider:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch provider details'
    });
  }
});

// Update provider configuration
router.put('/providers/:id', adminAuth, async (req, res) => {
  try {
    const { name, endpoint, timeout, retries, status, isActive, priority, weight } = req.body;

    const provider = await ApiProvider.findByIdAndUpdate(
      req.params.id,
      {
        name,
        endpoint,
        timeout,
        retries,
        status,
        isActive,
        priority,
        weight,
        updatedAt: new Date()
      },
      { new: true, runValidators: true }
    ).select('-apiKey');

    if (!provider) {
      return res.status(404).json({
        success: false,
        message: 'Provider not found'
      });
    }

    // Log configuration change
    await SystemLog.create({
      level: 'info',
      service: 'API Provider',
      message: `Provider ${provider.name} configuration updated`,
      details: {
        providerId: provider._id,
        changes: { name, endpoint, timeout, retries, status, isActive, priority, weight }
      },
      metadata: {
        adminId: req.admin.id,
        adminUsername: req.admin.username
      }
    });

    res.json({
      success: true,
      message: 'Provider updated successfully',
      data: provider
    });
  } catch (error) {
    console.error('Error updating provider:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update provider'
    });
  }
});

// Test provider connection
router.post('/providers/test/:id', adminAuth, async (req, res) => {
  try {
    const provider = await ApiProvider.findById(req.params.id);
    
    if (!provider) {
      return res.status(404).json({
        success: false,
        message: 'Provider not found'
      });
    }

    const startTime = Date.now();
    let testResult = {
      success: false,
      message: '',
      responseTime: 0,
      details: {}
    };

    try {
      if (provider.code === 'CLUBKONNECT') {
        const response = await axios.post(
          `${provider.endpoint}/APIWalletBalanceV1.asp`,
          null,
          {
            params: {
              UserID: provider.metadata.userId,
              APIKey: provider.apiKey
            },
            timeout: provider.timeout
          }
        );

        const responseTime = Date.now() - startTime;
        
        if (response.data) {
          testResult = {
            success: true,
            message: 'Connection successful',
            responseTime,
            details: {
              balance: parseFloat(response.data) || 0,
              status: response.status
            }
          };

          // Update provider metrics
          await ApiProvider.findByIdAndUpdate(provider._id, {
            'metrics.lastResponseTime': responseTime,
            'metrics.successRate': Math.min((provider.metrics?.successRate || 0) + 5, 100),
            'healthCheck.status': 'healthy',
            'healthCheck.lastCheck': new Date()
          });
        }
      } else if (provider.code === 'VTPASS') {
        // VTPass test (adjust endpoint as needed)
        const response = await axios.get(
          `${provider.endpoint}/balance`,
          {
            headers: {
              'Authorization': `Bearer ${provider.apiKey}`
            },
            timeout: provider.timeout
          }
        );

        const responseTime = Date.now() - startTime;
        
        testResult = {
          success: response.status === 200,
          message: 'Connection successful',
          responseTime,
          details: {
            status: response.status,
            data: response.data
          }
        };
      }
    } catch (error) {
      const responseTime = Date.now() - startTime;
      testResult = {
        success: false,
        message: error.response?.data?.message || error.message,
        responseTime,
        details: {
          error: error.message,
          code: error.code
        }
      };

      // Update provider metrics
      await ApiProvider.findByIdAndUpdate(provider._id, {
        'metrics.failureCount': (provider.metrics?.failureCount || 0) + 1,
        'healthCheck.status': 'unhealthy',
        'healthCheck.lastCheck': new Date()
      });

      // Log error
      await SystemLog.create({
        level: 'error',
        service: 'API Provider',
        message: `Connection test failed for ${provider.name}`,
        details: {
          providerId: provider._id,
          error: error.message,
          responseTime
        }
      });
    }

    res.json({
      success: true,
      data: testResult
    });
  } catch (error) {
    console.error('Error testing provider:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to test provider connection'
    });
  }
});

// ===========================================
// 2. SYSTEM HEALTH MONITORING
// ===========================================

// Get current system health
router.get('/health', adminAuth, async (req, res) => {
  try {
    const uptime = process.uptime();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const memoryUsage = ((totalMem - freeMem) / totalMem) * 100;
    
    const cpus = os.cpus();
    let totalIdle = 0, totalTick = 0;
    cpus.forEach(cpu => {
      for (let type in cpu.times) {
        totalTick += cpu.times[type];
      }
      totalIdle += cpu.times.idle;
    });
    const cpuUsage = 100 - (totalIdle / totalTick * 100);

    // Calculate error rate from last hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentTransactions = await Transaction.countDocuments({
      createdAt: { $gte: oneHourAgo }
    });
    const failedTransactions = await Transaction.countDocuments({
      status: 'failed',
      createdAt: { $gte: oneHourAgo }
    });
    const errorRate = recentTransactions > 0 
      ? (failedTransactions / recentTransactions) * 100 
      : 0;

    // Get average API response time
    const activeProviders = await ApiProvider.find({ isActive: true });
    const avgResponseTime = activeProviders.length > 0
      ? activeProviders.reduce((sum, p) => sum + (p.metrics?.lastResponseTime || 0), 0) / activeProviders.length
      : 0;

    // Determine status
    let status = 'healthy';
    if (errorRate > 10 || memoryUsage > 90 || cpuUsage > 90) {
      status = 'unhealthy';
    } else if (errorRate > 5 || memoryUsage > 75 || cpuUsage > 75) {
      status = 'degraded';
    }

    const healthData = {
      metrics: {
        uptime: Math.floor(uptime),
        cpuUsage: parseFloat(cpuUsage.toFixed(2)),
        memoryUsage: parseFloat(memoryUsage.toFixed(2)),
        diskUsage: 0,
        activeConnections: 0,
        errorRate: parseFloat(errorRate.toFixed(2)),
        apiResponseTime: Math.floor(avgResponseTime),
        lastChecked: new Date()
      },
      status,
      checkedBy: req.admin.id
    };

    const health = await SystemHealth.create(healthData);

    res.json({
      success: true,
      data: health
    });
  } catch (error) {
    console.error('Error fetching system health:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch system health'
    });
  }
});

// ===========================================
// 3. SYSTEM LOGS
// ===========================================

// Get system logs
router.get('/logs', adminAuth, async (req, res) => {
  try {
    const { level, service, resolved, page = 1, limit = 50 } = req.query;
    
    const filter = {};
    if (level) filter.level = level;
    if (service) filter.service = service;
    if (resolved !== undefined) filter.resolved = resolved === 'true';

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const logs = await SystemLog.find(filter)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip)
      .populate('resolvedBy', 'username email');

    const total = await SystemLog.countDocuments(filter);

    res.json({
      success: true,
      data: {
        logs,
        pagination: {
          total,
          page: parseInt(page),
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Error fetching logs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch system logs'
    });
  }
});

// Resolve log
router.put('/logs/:id/resolve', adminAuth, async (req, res) => {
  try {
    const { resolution } = req.body;

    const log = await SystemLog.findByIdAndUpdate(
      req.params.id,
      {
        resolved: true,
        resolvedBy: req.admin.id,
        resolvedAt: new Date(),
        resolution
      },
      { new: true }
    ).populate('resolvedBy', 'username email');

    if (!log) {
      return res.status(404).json({
        success: false,
        message: 'Log not found'
      });
    }

    res.json({
      success: true,
      message: 'Log marked as resolved',
      data: log
    });
  } catch (error) {
    console.error('Error resolving log:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to resolve log'
    });
  }
});


// Get maintenance mode
router.get('/maintenance', adminAuth, async (req, res) => {
  try {
    const maintenance = await MaintenanceMode.getCurrent();
    
    res.json({
      success: true,
      data: maintenance
    });
  } catch (error) {
    console.error('Error fetching maintenance mode:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch maintenance mode'
    });
  }
});

// Update maintenance mode
router.put('/maintenance', adminAuth, async (req, res) => {
  try {
    const { enabled, message, scheduledStart, scheduledEnd, affectedServices } = req.body;

    const maintenance = await MaintenanceMode.getCurrent();
    
    maintenance.enabled = enabled;
    if (message) maintenance.message = message;
    if (scheduledStart) maintenance.scheduledStart = scheduledStart;
    if (scheduledEnd) maintenance.scheduledEnd = scheduledEnd;
    if (affectedServices) maintenance.affectedServices = affectedServices;
    
    if (enabled) {
      maintenance.enabledBy = req.admin.id;
    } else {
      maintenance.disabledBy = req.admin.id;
    }

    await maintenance.save();

    // Log change
    await SystemLog.create({
      level: 'info',
      service: 'System',
      message: `Maintenance mode ${enabled ? 'enabled' : 'disabled'}`,
      details: { message, scheduledStart, scheduledEnd, affectedServices },
      metadata: { adminId: req.admin.id }
    });

    res.json({
      success: true,
      message: `Maintenance mode ${enabled ? 'enabled' : 'disabled'}`,
      data: maintenance
    });
  } catch (error) {
    console.error('Error updating maintenance mode:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update maintenance mode'
    });
  }
});

// GET /api/admin/system/providers - Get all API providers
router.get('/system/providers', adminAuth, async (req, res) => {
  try {
    const providers = await ApiProvider.find()
      .select('-apiKey')
      .sort({ priority: 1 });
    
    res.json({
      success: true,
      data: providers
    });
  } catch (error) {
    console.error('Error fetching providers:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch API providers'
    });
  }
});

// GET /api/admin/system/providers/:id - Get provider with balance
router.get('/system/providers/:id', adminAuth, async (req, res) => {
  try {
    const provider = await ApiProvider.findById(req.params.id);
    
    if (!provider) {
      return res.status(404).json({
        success: false,
        message: 'Provider not found'
      });
    }

    let balance = null;
    
    if (provider.code === 'CLUBKONNECT') {
      try {
        const balanceResponse = await axios.post(
          `${provider.endpoint}/APIWalletBalanceV1.asp`,
          null,
          {
            params: {
              UserID: provider.metadata.userId,
              APIKey: provider.apiKey
            },
            timeout: 10000
          }
        );

        if (balanceResponse.data) {
          balance = parseFloat(balanceResponse.data) || 0;
        }
      } catch (balanceError) {
        console.error('Balance fetch error:', balanceError.message);
        
        await SystemLog.create({
          level: 'error',
          service: 'ClubKonnect',
          message: 'Failed to fetch balance',
          details: {
            error: balanceError.message,
            provider: provider.code
          }
        });
      }
    }

    const providerData = provider.toObject();
    delete providerData.apiKey;

    res.json({
      success: true,
      data: {
        ...providerData,
        currentBalance: balance
      }
    });
  } catch (error) {
    console.error('Error fetching provider:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch provider details'
    });
  }
});

// PUT /api/admin/system/providers/:id - Update provider
router.put('/system/providers/:id', adminAuth, async (req, res) => {
  try {
    const { name, endpoint, timeout, retries, status, isActive, priority, weight } = req.body;

    const provider = await ApiProvider.findByIdAndUpdate(
      req.params.id,
      {
        name,
        endpoint,
        timeout,
        retries,
        status,
        isActive,
        priority,
        weight,
        updatedAt: new Date()
      },
      { new: true, runValidators: true }
    ).select('-apiKey');

    if (!provider) {
      return res.status(404).json({
        success: false,
        message: 'Provider not found'
      });
    }

    await SystemLog.create({
      level: 'info',
      service: 'API Provider',
      message: `Provider ${provider.name} configuration updated`,
      details: {
        providerId: provider._id,
        changes: { name, endpoint, timeout, retries, status, isActive, priority, weight }
      },
      metadata: {
        adminId: req.admin.id
      }
    });

    res.json({
      success: true,
      message: 'Provider updated successfully',
      data: provider
    });
  } catch (error) {
    console.error('Error updating provider:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update provider'
    });
  }
});

// POST /api/admin/system/providers/test/:id - Test provider connection
router.post('/system/providers/test/:id', adminAuth, async (req, res) => {
  try {
    const provider = await ApiProvider.findById(req.params.id);
    
    if (!provider) {
      return res.status(404).json({
        success: false,
        message: 'Provider not found'
      });
    }

    const startTime = Date.now();
    let testResult = {
      success: false,
      message: '',
      responseTime: 0,
      details: {}
    };

    try {
      if (provider.code === 'CLUBKONNECT') {
        const response = await axios.post(
          `${provider.endpoint}/APIWalletBalanceV1.asp`,
          null,
          {
            params: {
              UserID: provider.metadata.userId,
              APIKey: provider.apiKey
            },
            timeout: provider.timeout
          }
        );

        const responseTime = Date.now() - startTime;
        
        if (response.data) {
          testResult = {
            success: true,
            message: 'Connection successful',
            responseTime,
            details: {
              balance: parseFloat(response.data) || 0,
              status: response.status
            }
          };

          await ApiProvider.findByIdAndUpdate(provider._id, {
            'metrics.lastResponseTime': responseTime,
            'metrics.successRate': Math.min((provider.metrics?.successRate || 0) + 5, 100),
            'healthCheck.status': 'healthy',
            'healthCheck.lastCheck': new Date()
          });
        }
      } else if (provider.code === 'VTPASS') {
        const response = await axios.get(
          `${provider.endpoint}/balance`,
          {
            headers: {
              'Authorization': `Bearer ${provider.apiKey}`
            },
            timeout: provider.timeout
          }
        );

        const responseTime = Date.now() - startTime;
        
        testResult = {
          success: response.status === 200,
          message: 'Connection successful',
          responseTime,
          details: {
            status: response.status
          }
        };
      }
    } catch (error) {
      const responseTime = Date.now() - startTime;
      testResult = {
        success: false,
        message: error.response?.data?.message || error.message,
        responseTime,
        details: {
          error: error.message,
          code: error.code
        }
      };

      await ApiProvider.findByIdAndUpdate(provider._id, {
        'metrics.failureCount': (provider.metrics?.failureCount || 0) + 1,
        'healthCheck.status': 'unhealthy',
        'healthCheck.lastCheck': new Date()
      });

      await SystemLog.create({
        level: 'error',
        service: 'API Provider',
        message: `Connection test failed for ${provider.name}`,
        details: {
          providerId: provider._id,
          error: error.message,
          responseTime
        }
      });
    }

    res.json({
      success: true,
      data: testResult
    });
  } catch (error) {
    console.error('Error testing provider:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to test provider connection'
    });
  }
});

// ===========================================
// SYSTEM HEALTH
// ===========================================

// GET /api/admin/system/health - Get system health
router.get('/system/health', adminAuth, async (req, res) => {
  try {
    const uptime = process.uptime();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const memoryUsage = ((totalMem - freeMem) / totalMem) * 100;
    
    const cpus = os.cpus();
    let totalIdle = 0, totalTick = 0;
    cpus.forEach(cpu => {
      for (let type in cpu.times) {
        totalTick += cpu.times[type];
      }
      totalIdle += cpu.times.idle;
    });
    const cpuUsage = 100 - (totalIdle / totalTick * 100);

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentTransactions = await Transaction.countDocuments({
      createdAt: { $gte: oneHourAgo }
    });
    const failedTransactions = await Transaction.countDocuments({
      status: 'failed',
      createdAt: { $gte: oneHourAgo }
    });
    const errorRate = recentTransactions > 0 
      ? (failedTransactions / recentTransactions) * 100 
      : 0;

    const activeProviders = await ApiProvider.find({ isActive: true });
    const avgResponseTime = activeProviders.length > 0
      ? activeProviders.reduce((sum, p) => sum + (p.metrics?.lastResponseTime || 0), 0) / activeProviders.length
      : 0;

    let status = 'healthy';
    if (errorRate > 10 || memoryUsage > 90 || cpuUsage > 90) {
      status = 'unhealthy';
    } else if (errorRate > 5 || memoryUsage > 75 || cpuUsage > 75) {
      status = 'degraded';
    }

    const healthData = {
      metrics: {
        uptime: Math.floor(uptime),
        cpuUsage: parseFloat(cpuUsage.toFixed(2)),
        memoryUsage: parseFloat(memoryUsage.toFixed(2)),
        diskUsage: 0,
        activeConnections: 0,
        errorRate: parseFloat(errorRate.toFixed(2)),
        apiResponseTime: Math.floor(avgResponseTime),
        lastChecked: new Date()
      },
      status,
      checkedBy: req.admin.id
    };

    const health = await SystemHealth.create(healthData);

    res.json({
      success: true,
      data: health
    });
  } catch (error) {
    console.error('Error fetching system health:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch system health'
    });
  }
});

// ===========================================
// SYSTEM LOGS
// ===========================================

// GET /api/admin/system/logs - Get logs
router.get('/system/logs', adminAuth, async (req, res) => {
  try {
    const { level, service, resolved, page = 1, limit = 50 } = req.query;
    
    const filter = {};
    if (level) filter.level = level;
    if (service) filter.service = service;
    if (resolved !== undefined) filter.resolved = resolved === 'true';

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const logs = await SystemLog.find(filter)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip)
      .populate('resolvedBy', 'username email');

    const total = await SystemLog.countDocuments(filter);

    res.json({
      success: true,
      data: {
        logs,
        pagination: {
          total,
          page: parseInt(page),
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Error fetching logs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch system logs'
    });
  }
});

// PUT /api/admin/system/logs/:id/resolve - Resolve log
router.put('/system/logs/:id/resolve', adminAuth, async (req, res) => {
  try {
    const { resolution } = req.body;

    const log = await SystemLog.findByIdAndUpdate(
      req.params.id,
      {
        resolved: true,
        resolvedBy: req.admin.id,
        resolvedAt: new Date(),
        resolution
      },
      { new: true }
    ).populate('resolvedBy', 'username email');

    if (!log) {
      return res.status(404).json({
        success: false,
        message: 'Log not found'
      });
    }

    res.json({
      success: true,
      message: 'Log marked as resolved',
      data: log
    });
  } catch (error) {
    console.error('Error resolving log:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to resolve log'
    });
  }
});

// ==================== SYSTEM OVERVIEW & ANALYTICS ====================

// Get system overview (admin only)
router.get('/overview', adminAuth, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalTransactions = await Transaction.countDocuments();
    const pendingTransactions = await Transaction.countDocuments({ status: 'pending' });
    
    // Get today's transactions
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayTransactions = await Transaction.countDocuments({ 
      createdAt: { $gte: todayStart } 
    });

    // Get revenue stats
    const revenueResult = await Transaction.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: null, totalRevenue: { $sum: '$amount' } } }
    ]);
    const totalRevenue = revenueResult[0]?.totalRevenue || 0;

    res.json({
      success: true,
      overview: {
        totalUsers,
        totalAdmins: await Admin.countDocuments(),
        totalTransactions,
        pendingTransactions,
        todayTransactions,
        totalRevenue,
        services: await ServiceConfig.countDocuments(),
        activeProviders: await ServiceProvider.countDocuments({ isActive: true })
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// GET /api/services/stats - Get service statistics for dashboard

router.get('/services/stats', adminAuth, async (req, res) => {
  console.log('🚨 STATS ROUTE HIT - Admin ID:', req.admin?.id);
  
  try {
    console.log('📊 Fetching service stats...');
    
    // Test ServiceConfig model
    console.log('ServiceConfig model:', ServiceConfig ? 'exists' : 'missing');
    
    console.log('Counting total services...');
    const totalServices = await ServiceConfig.countDocuments();
    console.log('✅ Total services:', totalServices);
    
    console.log('Counting active services...');
    const activeServices = await ServiceConfig.countDocuments({ 
      isActive: true, 
      maintenanceMode: false 
    });
    console.log('✅ Active services:', activeServices);
    
    console.log('Counting maintenance services...');
    const maintenanceServices = await ServiceConfig.countDocuments({ 
      maintenanceMode: true 
    });
    console.log('✅ Maintenance services:', maintenanceServices);
    
    console.log('Counting inactive services...');
    const inactiveServices = await ServiceConfig.countDocuments({ 
      isActive: false 
    });
    console.log('✅ Inactive services:', inactiveServices);

    const responseData = {
      success: true,
      data: {
        services: totalServices,
        activeProviders: activeServices,
        maintenanceServices: maintenanceServices,
        inactiveServices: inactiveServices
      }
    };
    
    console.log('📊 Sending response:', responseData);
    res.json(responseData);
    
  } catch (error) {
    console.error('❌❌❌ STATS ROUTE ERROR:', error);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('Error name:', error.name);
    
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch service statistics',
      error: error.message
    });
  }
});


// GET /api/admin/system/maintenance - Get maintenance mode
router.get('/system/maintenance', adminAuth, async (req, res) => {
  try {
    const maintenance = await MaintenanceMode.getCurrent();
    
    res.json({
      success: true,
      data: maintenance
    });
  } catch (error) {
    console.error('Error fetching maintenance mode:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch maintenance mode'
    });
  }
});

// PUT /api/admin/system/maintenance - Update maintenance mode
router.put('/system/maintenance', adminAuth, async (req, res) => {
  try {
    const { enabled, message, scheduledStart, scheduledEnd, affectedServices } = req.body;

    const maintenance = await MaintenanceMode.getCurrent();
    
    maintenance.enabled = enabled;
    if (message) maintenance.message = message;
    if (scheduledStart) maintenance.scheduledStart = scheduledStart;
    if (scheduledEnd) maintenance.scheduledEnd = scheduledEnd;
    if (affectedServices) maintenance.affectedServices = affectedServices;
    
    if (enabled) {
      maintenance.enabledBy = req.admin.id;
    } else {
      maintenance.disabledBy = req.admin.id;
    }

    await maintenance.save();

    await SystemLog.create({
      level: 'info',
      service: 'System',
      message: `Maintenance mode ${enabled ? 'enabled' : 'disabled'}`,
      details: { message, scheduledStart, scheduledEnd, affectedServices },
      metadata: { adminId: req.admin.id }
    });

    res.json({
      success: true,
      message: `Maintenance mode ${enabled ? 'enabled' : 'disabled'}`,
      data: maintenance
    });
  } catch (error) {
    console.error('Error updating maintenance mode:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update maintenance mode'
    });
  }
});
module.exports = router;