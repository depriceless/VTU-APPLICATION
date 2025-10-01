// routes/system.js - System Management Endpoints
const express = require('express');
const adminAuth = require('../middleware/adminAuth');
const ApiProvider = require('../models/ApiProvider');
const SystemHealth = require('../models/SystemHealth');
const SystemLog = require('../models/SystemLog');
const MaintenanceSchedule = require('../models/MaintenanceSchedule');
const router = express.Router();

// ==================== API PROVIDER MANAGEMENT ====================

// GET /api/admin/system/api-providers - Get all API providers
router.get('/api-providers', adminAuth, async (req, res) => {
  try {
    const providers = await ApiProvider.find()
      .populate('createdBy', 'username')
      .populate('lastModifiedBy', 'username')
      .sort({ priority: 1, createdAt: -1 });

    res.json({
      success: true,
      data: providers,
      count: providers.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Get API providers error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch API providers'
    });
  }
});

// POST /api/admin/system/api-providers - Create new API provider
router.post('/api-providers', adminAuth, async (req, res) => {
  try {
    const {
      name,
      code,
      type,
      endpoint,
      apiKey,
      timeout,
      retries,
      priority,
      weight,
      headers,
      metadata
    } = req.body;

    // Check if provider code already exists
    const existingProvider = await ApiProvider.findOne({ code: code.toUpperCase() });
    if (existingProvider) {
      return res.status(400).json({
        success: false,
        message: 'Provider code already exists'
      });
    }

    const newProvider = new ApiProvider({
      name,
      code: code.toUpperCase(),
      type,
      endpoint,
      apiKey,
      timeout: timeout || 30000,
      retries: retries || 3,
      priority: priority || 5,
      weight: weight || 1,
      headers: headers || new Map(),
      metadata: metadata || {},
      createdBy: req.admin.id,
      lastModifiedBy: req.admin.id
    });

    await newProvider.save();

    res.status(201).json({
      success: true,
      message: 'API provider created successfully',
      data: newProvider
    });

  } catch (error) {
    console.error('Create API provider error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create API provider',
      error: error.message
    });
  }
});

// PUT /api/admin/system/api-providers/:providerId - Update API provider
router.put('/api-providers/:providerId', adminAuth, async (req, res) => {
  try {
    const { providerId } = req.params;
    const updates = req.body;

    const provider = await ApiProvider.findById(providerId);
    if (!provider) {
      return res.status(404).json({
        success: false,
        message: 'API provider not found'
      });
    }

    // Update allowed fields
    const allowedUpdates = [
      'name', 'endpoint', 'apiKey', 'timeout', 'retries', 
      'priority', 'weight', 'headers', 'metadata', 'type'
    ];

    allowedUpdates.forEach(field => {
      if (updates[field] !== undefined) {
        provider[field] = updates[field];
      }
    });

    provider.lastModifiedBy = req.admin.id;
    await provider.save();

    res.json({
      success: true,
      message: 'API provider updated successfully',
      data: provider
    });

  } catch (error) {
    console.error('Update API provider error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update API provider'
    });
  }
});

// PUT /api/admin/system/api-providers/:providerId/status - Toggle provider status
router.put('/api-providers/:providerId/status', adminAuth, async (req, res) => {
  try {
    const { providerId } = req.params;
    const { isActive, status, maintenanceMode, maintenanceMessage } = req.body;

    const provider = await ApiProvider.findById(providerId);
    if (!provider) {
      return res.status(404).json({
        success: false,
        message: 'API provider not found'
      });
    }

    if (isActive !== undefined) provider.isActive = isActive;
    if (status !== undefined) provider.status = status;
    if (maintenanceMode !== undefined) provider.maintenanceMode = maintenanceMode;
    if (maintenanceMessage !== undefined) provider.maintenanceMessage = maintenanceMessage;

    provider.lastModifiedBy = req.admin.id;
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

// POST /api/admin/system/api-providers/:providerId/test - Test API provider connection
router.post('/api-providers/:providerId/test', adminAuth, async (req, res) => {
  try {
    const { providerId } = req.params;

    const provider = await ApiProvider.findById(providerId);
    if (!provider) {
      return res.status(404).json({
        success: false,
        message: 'API provider not found'
      });
    }

    const testResult = await provider.testConnection();
    await provider.save(); // Save updated stats

    res.json({
      success: testResult.success,
      message: testResult.message,
      data: {
        providerId: provider._id,
        providerName: provider.name,
        responseTime: testResult.responseTime,
        statusCode: testResult.statusCode,
        timestamp: new Date().toISOString(),
        stats: provider.getStats()
      }
    });

  } catch (error) {
    console.error('Test API provider error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to test API provider connection'
    });
  }
});

// DELETE /api/admin/system/api-providers/:providerId - Delete API provider
router.delete('/api-providers/:providerId', adminAuth, async (req, res) => {
  try {
    const { providerId } = req.params;

    const provider = await ApiProvider.findById(providerId);
    if (!provider) {
      return res.status(404).json({
        success: false,
        message: 'API provider not found'
      });
    }

    await ApiProvider.findByIdAndDelete(providerId);

    res.json({
      success: true,
      message: 'API provider deleted successfully'
    });

  } catch (error) {
    console.error('Delete API provider error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete API provider'
    });
  }
});

// ==================== SYSTEM HEALTH MONITORING ====================

// GET /api/admin/system/health - Get current system health
router.get('/health', adminAuth, async (req, res) => {
  try {
    const os = require('os');
    
    // Get system metrics
    const systemMetrics = {
      uptime: Math.floor(process.uptime()),
      cpuUsage: Math.round(os.loadavg()[0] * 100),
      memoryUsage: Math.round((1 - (os.freemem() / os.totalmem())) * 100),
      diskUsage: await getDiskUsage(),
      activeConnections: await getActiveConnections(),
      errorRate: await getErrorRate(),
      apiResponseTime: await getAverageApiResponseTime(),
      lastChecked: new Date().toISOString()
    };

    // Store health record
    const healthRecord = new SystemHealth({
      metrics: systemMetrics,
      checkedBy: req.admin.id
    });
    await healthRecord.save();

    res.json({
      success: true,
      data: systemMetrics,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Get system health error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch system health data'
    });
  }
});

// GET /api/admin/system/health/history - Get system health history
router.get('/health/history', adminAuth, async (req, res) => {
  try {
    const { period = '24h', limit = 100 } = req.query;
    
    const dateFilter = getDateFilter(period);
    
    const healthHistory = await SystemHealth.find({
      createdAt: dateFilter
    })
    .sort({ createdAt: -1 })
    .limit(parseInt(limit))
    .lean();

    res.json({
      success: true,
      period,
      data: healthHistory,
      count: healthHistory.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Get health history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch system health history'
    });
  }
});

// POST /api/admin/system/health/check - Force system health check
router.post('/health/check', adminAuth, async (req, res) => {
  try {
    const healthChecks = [];
    
    // Check API providers
    const providers = await ApiProvider.find({ isActive: true });
    for (const provider of providers) {
      const testResult = await provider.testConnection();
      await provider.save();
      healthChecks.push({
        type: 'api_provider',
        name: provider.name,
        status: testResult.success ? 'healthy' : 'unhealthy',
        responseTime: testResult.responseTime
      });
    }
    
    // Check database connection
    try {
      await require('mongoose').connection.db.admin().ping();
      healthChecks.push({
        type: 'database',
        name: 'MongoDB',
        status: 'healthy',
        responseTime: 0
      });
    } catch (dbError) {
      healthChecks.push({
        type: 'database',
        name: 'MongoDB',
        status: 'unhealthy',
        error: dbError.message
      });
    }

    // Overall system status
    const overallStatus = healthChecks.every(check => check.status === 'healthy') 
      ? 'healthy' : 'degraded';

    res.json({
      success: true,
      message: 'System health check completed',
      overallStatus,
      checks: healthChecks,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Force health check error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to perform system health check'
    });
  }
});

// ==================== SYSTEM LOGS & ERROR MANAGEMENT ====================

// GET /api/admin/system/logs - Get system logs
router.get('/logs', adminAuth, async (req, res) => {
  try {
    const { 
      level, 
      service, 
      page = 1, 
      limit = 50, 
      period = '24h',
      resolved 
    } = req.query;

    const query = {};
    
    // Apply filters
    if (level) query.level = level;
    if (service) query.service = new RegExp(service, 'i');
    if (resolved !== undefined) query.resolved = resolved === 'true';
    if (period) query.createdAt = getDateFilter(period);

    const logs = await SystemLog.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .lean();

    const totalCount = await SystemLog.countDocuments(query);

    res.json({
      success: true,
      data: logs,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCount / parseInt(limit)),
        totalLogs: totalCount,
        hasNextPage: page * limit < totalCount,
        hasPrevPage: page > 1
      },
      filters: { level, service, period, resolved },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Get system logs error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch system logs'
    });
  }
});

// PUT /api/admin/system/logs/:logId/resolve - Mark log as resolved
router.put('/logs/:logId/resolve', adminAuth, async (req, res) => {
  try {
    const { logId } = req.params;
    const { resolution } = req.body;

    const log = await SystemLog.findById(logId);
    if (!log) {
      return res.status(404).json({
        success: false,
        message: 'Log entry not found'
      });
    }

    log.resolved = true;
    log.resolvedBy = req.admin.id;
    log.resolvedAt = new Date();
    if (resolution) log.resolution = resolution;

    await log.save();

    res.json({
      success: true,
      message: 'Log entry marked as resolved',
      data: log
    });

  } catch (error) {
    console.error('Resolve log error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to resolve log entry'
    });
  }
});

// DELETE /api/admin/system/logs/cleanup - Clean up old logs
router.delete('/logs/cleanup', adminAuth, async (req, res) => {
  try {
    const { olderThan = '30d', level } = req.body;
    
    const dateThreshold = getDateFilter(olderThan);
    const query = { createdAt: { $lt: dateThreshold } };
    
    if (level) query.level = level;

    const result = await SystemLog.deleteMany(query);

    res.json({
      success: true,
      message: `Cleaned up ${result.deletedCount} log entries`,
      deletedCount: result.deletedCount,
      criteria: { olderThan, level }
    });

  } catch (error) {
    console.error('Log cleanup error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cleanup logs'
    });
  }
});

// ==================== MAINTENANCE MODE MANAGEMENT ====================

// GET /api/admin/system/maintenance - Get maintenance status
router.get('/maintenance', adminAuth, async (req, res) => {
  try {
    const maintenanceSchedule = await MaintenanceSchedule.findOne()
      .sort({ createdAt: -1 })
      .populate('scheduledBy', 'username');

    res.json({
      success: true,
      data: maintenanceSchedule || {
        enabled: false,
        message: '',
        scheduledStart: null,
        scheduledEnd: null,
        affectedServices: []
      }
    });

  } catch (error) {
    console.error('Get maintenance status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch maintenance status'
    });
  }
});

// POST /api/admin/system/maintenance - Enable/disable maintenance mode
router.post('/maintenance', adminAuth, async (req, res) => {
  try {
    const {
      enabled,
      message,
      scheduledStart,
      scheduledEnd,
      affectedServices,
      reason
    } = req.body;

    const maintenanceSchedule = new MaintenanceSchedule({
      enabled,
      message: message || 'System maintenance in progress. Please try again later.',
      scheduledStart: scheduledStart ? new Date(scheduledStart) : null,
      scheduledEnd: scheduledEnd ? new Date(scheduledEnd) : null,
      affectedServices: affectedServices || [],
      reason: reason || 'Manual maintenance mode toggle',
      scheduledBy: req.admin.id
    });

    await maintenanceSchedule.save();

    // Log the maintenance action
    const logEntry = new SystemLog({
      level: 'info',
      service: 'System',
      message: `Maintenance mode ${enabled ? 'enabled' : 'disabled'}`,
      details: {
        reason,
        affectedServices,
        scheduledBy: req.admin.username
      },
      metadata: {
        adminId: req.admin.id,
        maintenanceId: maintenanceSchedule._id
      }
    });
    await logEntry.save();

    res.json({
      success: true,
      message: `Maintenance mode ${enabled ? 'enabled' : 'disabled'} successfully`,
      data: maintenanceSchedule
    });

  } catch (error) {
    console.error('Set maintenance mode error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to set maintenance mode'
    });
  }
});

// GET /api/admin/system/maintenance/history - Get maintenance history
router.get('/maintenance/history', adminAuth, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const maintenanceHistory = await MaintenanceSchedule.find()
      .populate('scheduledBy', 'username')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const totalCount = await MaintenanceSchedule.countDocuments();

    res.json({
      success: true,
      data: maintenanceHistory,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCount / parseInt(limit)),
        totalEntries: totalCount
      }
    });

  } catch (error) {
    console.error('Get maintenance history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch maintenance history'
    });
  }
});

// ==================== HELPER FUNCTIONS ====================

async function getDiskUsage() {
  try {
    const { execSync } = require('child_process');
    const output = execSync('df -h / | tail -1').toString();
    const usage = output.split(/\s+/)[4].replace('%', '');
    return parseInt(usage);
  } catch (error) {
    return 0;
  }
}

async function getActiveConnections() {
  try {
    // This would integrate with your connection pool or monitoring
    return Math.floor(Math.random() * 500) + 1000; // Placeholder
  } catch (error) {
    return 0;
  }
}

async function getErrorRate() {
  try {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const totalLogs = await SystemLog.countDocuments({
      createdAt: { $gte: fiveMinutesAgo }
    });
    const errorLogs = await SystemLog.countDocuments({
      level: { $in: ['error', 'fatal'] },
      createdAt: { $gte: fiveMinutesAgo }
    });
    
    return totalLogs > 0 ? (errorLogs / totalLogs) * 100 : 0;
  } catch (error) {
    return 0;
  }
}

async function getAverageApiResponseTime() {
  try {
    const providers = await ApiProvider.find({ isActive: true });
    const avgTimes = providers.map(p => p.averageResponseTime || 0);
    return avgTimes.length > 0 
      ? Math.round(avgTimes.reduce((sum, time) => sum + time, 0) / avgTimes.length)
      : 0;
  } catch (error) {
    return 0;
  }
}

function getDateFilter(period) {
  const now = new Date();
  const filter = {};

  switch (period) {
    case '1h':
      filter.$gte = new Date(now.getTime() - 60 * 60 * 1000);
      break;
    case '6h':
      filter.$gte = new Date(now.getTime() - 6 * 60 * 60 * 1000);
      break;
    case '24h':
      filter.$gte = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      break;
    case '7d':
      filter.$gte = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case '30d':
      filter.$gte = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    default:
      filter.$gte = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  }

  return filter;
}

module.exports = router;