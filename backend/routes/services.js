// routes/admin/services.js
const express = require('express');
const router = express.Router();
const ServiceConfig = require('../../models/ServiceConfig');
const ServiceProvider = require('../../models/ServiceProvider');
const Transaction = require('../../models/Transaction');
const { authenticate } = require('../../middleware/auth');

// Middleware to check admin access (adapt based on your admin system)
const requireAdmin = (req, res, next) => {
  // Add your admin check logic here
  if (!req.user || !req.user.isAdmin) {
    return res.status(403).json({ success: false, message: 'Admin access required' });
  }
  next();
};

// GET /api/admin/services/overview - Service dashboard overview
router.get('/overview', authenticate, requireAdmin, async (req, res) => {
  try {
    const services = await ServiceConfig.find();
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    // Get recent transaction stats by service type
    const recentStats = await Transaction.aggregate([
      { 
        $match: { 
          createdAt: { $gte: last24h },
          category: { $in: ['airtime', 'data', 'electricity', 'cable_tv', 'internet', 'betting'] }
        }
      },
      {
        $group: {
          _id: '$category',
          totalTransactions: { $sum: 1 },
          successfulTransactions: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
          totalAmount: { $sum: '$amount' },
          averageAmount: { $avg: '$amount' }
        }
      }
    ]);

    const overview = {
      totalServices: services.length,
      activeServices: services.filter(s => s.isActive && !s.maintenanceMode).length,
      maintenanceServices: services.filter(s => s.maintenanceMode).length,
      inactiveServices: services.filter(s => !s.isActive).length,
      last24hStats: recentStats,
      services: services.map(service => ({
        serviceType: service.serviceType,
        displayName: service.displayName,
        isActive: service.isActive,
        maintenanceMode: service.maintenanceMode,
        successRate: service.statistics.successRate,
        totalRevenue: service.statistics.totalRevenue,
        lastTransactionAt: service.statistics.lastTransactionAt
      }))
    };

    res.json({ success: true, data: overview });
  } catch (error) {
    console.error('Service overview error:', error);
    res.status(500).json({ success: false, message: 'Error fetching service overview' });
  }
});

// GET /api/admin/services - Get all service configurations
router.get('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const services = await ServiceConfig.find()
      .populate('modifiedBy', 'name email')
      .sort({ serviceType: 1 });

    res.json({
      success: true,
      data: services,
      count: services.length
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching services' });
  }
});

// PUT /api/admin/services/:serviceType/toggle - Toggle service active status
router.put('/:serviceType/toggle', authenticate, requireAdmin, async (req, res) => {
  try {
    const { serviceType } = req.params;
    const { isActive, maintenanceMode, reason } = req.body;

    const service = await ServiceConfig.findOne({ serviceType });
    if (!service) {
      return res.status(404).json({ success: false, message: 'Service not found' });
    }

    const oldStatus = { isActive: service.isActive, maintenanceMode: service.maintenanceMode };

    if (typeof isActive !== 'undefined') service.isActive = isActive;
    if (typeof maintenanceMode !== 'undefined') {
      service.maintenanceMode = maintenanceMode;
      if (maintenanceMode && reason) {
        service.maintenanceMessage = reason;
      }
    }

    service.lastModified = new Date();
    service.modifiedBy = req.user.userId;

    await service.save();

    // Log the change
    console.log(`Service ${serviceType} status changed:`, {
      from: oldStatus,
      to: { isActive: service.isActive, maintenanceMode: service.maintenanceMode },
      changedBy: req.user.userId,
      reason
    });

    res.json({
      success: true,
      message: `Service ${serviceType} updated successfully`,
      data: {
        serviceType,
        isActive: service.isActive,
        maintenanceMode: service.maintenanceMode,
        lastModified: service.lastModified
      }
    });
  } catch (error) {
    console.error('Service toggle error:', error);
    res.status(500).json({ success: false, message: 'Error updating service status' });
  }
});

// PUT /api/admin/services/:serviceType/pricing - Update service pricing
router.put('/:serviceType/pricing', authenticate, requireAdmin, async (req, res) => {
  try {
    const { serviceType } = req.params;
    const { markupPercentage, flatFee, minAmount, maxAmount, dailyLimit } = req.body;

    const service = await ServiceConfig.findOne({ serviceType });
    if (!service) {
      return res.status(404).json({ success: false, message: 'Service not found' });
    }

    if (typeof markupPercentage !== 'undefined') service.pricing.markupPercentage = markupPercentage;
    if (typeof flatFee !== 'undefined') service.pricing.flatFee = flatFee;
    if (typeof minAmount !== 'undefined') service.limits.min = minAmount;
    if (typeof maxAmount !== 'undefined') service.limits.max = maxAmount;
    if (typeof dailyLimit !== 'undefined') service.limits.dailyLimit = dailyLimit;

    service.lastModified = new Date();
    service.modifiedBy = req.user.userId;

    await service.save();

    res.json({
      success: true,
      message: `Pricing updated for ${serviceType}`,
      data: {
        serviceType,
        pricing: service.pricing,
        limits: service.limits
      }
    });
  } catch (error) {
    console.error('Pricing update error:', error);
    res.status(500).json({ success: false, message: 'Error updating pricing' });
  }
});

// GET /api/admin/services/:serviceType/analytics - Get detailed service analytics
router.get('/:serviceType/analytics', authenticate, requireAdmin, async (req, res) => {
  try {
    const { serviceType } = req.params;
    const { period = '7d' } = req.query;

    const periodDays = {
      '24h': 1,
      '7d': 7,
      '30d': 30,
      '90d': 90
    };

    const days = periodDays[period] || 7;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const analytics = await Transaction.aggregate([
      {
        $match: {
          category: serviceType,
          createdAt: { $gte: startDate }
        }
      },
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
      { $sort: { "_id.date": 1 } }
    ]);

    const service = await ServiceConfig.findOne({ serviceType });

    res.json({
      success: true,
      data: {
        service: service,
        analytics: analytics,
        period: period
      }
    });
  } catch (error) {
    console.error('Service analytics error:', error);
    res.status(500).json({ success: false, message: 'Error fetching analytics' });
  }
});

module.exports = router;