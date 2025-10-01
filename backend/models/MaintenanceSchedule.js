// models/MaintenanceSchedule.js
const mongoose = require('mongoose');

const maintenanceScheduleSchema = new mongoose.Schema({
  enabled: {
    type: Boolean,
    required: true,
    default: false
  },
  message: {
    type: String,
    default: 'System maintenance in progress. Please try again later.',
    maxlength: 500
  },
  scheduledStart: {
    type: Date,
    default: null
  },
  scheduledEnd: {
    type: Date,
    default: null
  },
  affectedServices: [{
    type: String,
    enum: ['Airtime', 'Data', 'Cable TV', 'Electricity', 'Betting', 'Education', 'All']
  }],
  reason: {
    type: String,
    maxlength: 1000
  },
  scheduledBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true
  },
  actualStart: Date,
  actualEnd: Date,
  status: {
    type: String,
    enum: ['scheduled', 'active', 'completed', 'cancelled'],
    default: 'scheduled'
  },
  notes: String
}, {
  timestamps: true
});

// Index for finding active maintenance
maintenanceScheduleSchema.index({ enabled: 1, status: 1 });
maintenanceScheduleSchema.index({ scheduledStart: 1, scheduledEnd: 1 });

// Method to check if maintenance is currently active
maintenanceScheduleSchema.methods.isCurrentlyActive = function() {
  if (!this.enabled) return false;
  
  const now = new Date();
  if (this.scheduledStart && this.scheduledEnd) {
    return now >= this.scheduledStart && now <= this.scheduledEnd;
  }
  
  return this.enabled; // If no schedule, just check enabled flag
};

// Static method to get current active maintenance
maintenanceScheduleSchema.statics.getCurrentMaintenance = function() {
  return this.findOne({ enabled: true, status: 'active' })
    .populate('scheduledBy', 'username')
    .sort({ createdAt: -1 });
};

module.exports = mongoose.model('MaintenanceSchedule', maintenanceScheduleSchema);

// models/SystemHealth.js
const mongoose = require('mongoose');

const systemHealthSchema = new mongoose.Schema({
  metrics: {
    uptime: {
      type: Number,
      required: true
    },
    cpuUsage: {
      type: Number,
      min: 0,
      max: 100
    },
    memoryUsage: {
      type: Number,
      min: 0,
      max: 100
    },
    diskUsage: {
      type: Number,
      min: 0,
      max: 100
    },
    activeConnections: {
      type: Number,
      min: 0
    },
    errorRate: {
      type: Number,
      min: 0,
      max: 100
    },
    apiResponseTime: {
      type: Number,
      min: 0
    },
    lastChecked: {
      type: Date,
      default: Date.now
    }
  },
  status: {
    type: String,
    enum: ['healthy', 'degraded', 'unhealthy', 'critical'],
    default: 'healthy'
  },
  alerts: [{
    type: {
      type: String,
      enum: ['cpu_high', 'memory_high', 'disk_full', 'api_slow', 'error_rate_high']
    },
    message: String,
    threshold: Number,
    value: Number,
    severity: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical']
    }
  }],
  checkedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  automated: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Indexes for performance
systemHealthSchema.index({ createdAt: -1 });
systemHealthSchema.index({ status: 1, createdAt: -1 });

// Method to determine overall health status
systemHealthSchema.methods.calculateHealthStatus = function() {
  const { cpuUsage, memoryUsage, diskUsage, errorRate, apiResponseTime } = this.metrics;
  
  let score = 100;
  
  // CPU penalty
  if (cpuUsage > 90) score -= 30;
  else if (cpuUsage > 80) score -= 20;
  else if (cpuUsage > 70) score -= 10;
  
  // Memory penalty
  if (memoryUsage > 95) score -= 25;
  else if (memoryUsage > 85) score -= 15;
  else if (memoryUsage > 75) score -= 5;
  
  // Disk penalty
  if (diskUsage > 95) score -= 20;
  else if (diskUsage > 85) score -= 10;
  
  // Error rate penalty
  if (errorRate > 10) score -= 40;
  else if (errorRate > 5) score -= 20;
  else if (errorRate > 2) score -= 10;
  
  // API response time penalty
  if (apiResponseTime > 5000) score -= 15;
  else if (apiResponseTime > 2000) score -= 10;
  else if (apiResponseTime > 1000) score -= 5;
  
  if (score >= 80) return 'healthy';
  if (score >= 60) return 'degraded';
  if (score >= 40) return 'unhealthy';
  return 'critical';
};

// Static method to get latest health status
systemHealthSchema.statics.getLatest = function() {
  return this.findOne().sort({ createdAt: -1 });
};

// Static method to get health trend
systemHealthSchema.statics.getHealthTrend = function(hours = 24) {
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);
  return this.find({ createdAt: { $gte: since } })
    .sort({ createdAt: 1 })
    .select('metrics.cpuUsage metrics.memoryUsage metrics.apiResponseTime status createdAt');
};

module.exports = mongoose.model('SystemHealth', systemHealthSchema);

// models/SystemLog.js
const mongoose = require('mongoose');

const systemLogSchema = new mongoose.Schema({
  level: {
    type: String,
    enum: ['debug', 'info', 'warn', 'error', 'fatal'],
    required: true
  },
  service: {
    type: String,
    required: true,
    trim: true
  },
  message: {
    type: String,
    required: true,
    maxlength: 1000
  },
  details: {
    type: Object,
    default: {}
  },
  metadata: {
    type: Object,
    default: {}
  },
  stackTrace: {
    type: String
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  transactionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transaction'
  },
  ipAddress: {
    type: String
  },
  userAgent: {
    type: String
  },
  resolved: {
    type: Boolean,
    default: false
  },
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  resolvedAt: Date,
  resolution: {
    type: String,
    maxlength: 1000
  },
  count: {
    type: Number,
    default: 1
  },
  firstOccurred: {
    type: Date,
    default: Date.now
  },
  lastOccurred: {
    type: Date,
    default: Date.now
  },
  tags: [String],
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  }
}, {
  timestamps: true
});

// Indexes for better query performance
systemLogSchema.index({ level: 1, createdAt: -1 });
systemLogSchema.index({ service: 1, createdAt: -1 });
systemLogSchema.index({ resolved: 1, level: 1 });
systemLogSchema.index({ userId: 1, createdAt: -1 });
systemLogSchema.index({ tags: 1 });
systemLogSchema.index({ severity: 1, resolved: 1 });

// Method to increment count for duplicate logs
systemLogSchema.methods.incrementCount = function() {
  this.count += 1;
  this.lastOccurred = new Date();
  return this.save();
};

// Static method to create or update log entry
systemLogSchema.statics.createOrUpdate = async function(logData) {
  const { level, service, message, details } = logData;
  
  // Look for similar log in the last hour
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const existingLog = await this.findOne({
    level,
    service,
    message,
    resolved: false,
    createdAt: { $gte: oneHourAgo }
  });
  
  if (existingLog) {
    return existingLog.incrementCount();
  } else {
    return this.create({
      ...logData,
      firstOccurred: new Date(),
      lastOccurred: new Date()
    });
  }
};

// Static method to get error summary
systemLogSchema.statics.getErrorSummary = function(hours = 24) {
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);
  
  return this.aggregate([
    { $match: { createdAt: { $gte: since } } },
    {
      $group: {
        _id: {
          level: '$level',
          service: '$service'
        },
        count: { $sum: '$count' },
        resolved: { $sum: { $cond: ['$resolved', '$count', 0] } },
        unresolved: { $sum: { $cond: ['$resolved', 0, '$count'] } }
      }
    },
    {
      $group: {
        _id: '$_id.level',
        services: {
          $push: {
            service: '$_id.service',
            count: '$count',
            resolved: '$resolved',
            unresolved: '$unresolved'
          }
        },
        totalCount: { $sum: '$count' },
        totalResolved: { $sum: '$resolved' },
        totalUnresolved: { $sum: '$unresolved' }
      }
    },
    { $sort: { totalCount: -1 } }
  ]);
};

// Method to auto-resolve old logs
systemLogSchema.statics.autoResolveOld = function(days = 7) {
  const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return this.updateMany(
    { 
      createdAt: { $lt: cutoffDate }, 
      resolved: false,
      level: { $in: ['info', 'warn'] }
    },
    { 
      resolved: true, 
      resolution: 'Auto-resolved due to age',
      resolvedAt: new Date()
    }
  );
};

module.exports = mongoose.model('SystemLog', systemLogSchema);

// models/ServiceProvider.js (Referenced in health.js)
const mongoose = require('mongoose');

const serviceProviderSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true
  },
  serviceType: {
    type: String,
    required: true,
    enum: ['airtime', 'data', 'electricity', 'cable', 'betting', 'education']
  },
  apiProvider: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ApiProvider',
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  priority: {
    type: Number,
    default: 1,
    min: 1,
    max: 10
  },
  commissionRate: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  timeout: {
    type: Number,
    default: 30000
  },
  maxRetries: {
    type: Number,
    default: 3
  },
  healthCheck: {
    status: {
      type: String,
      enum: ['online', 'degraded', 'offline', 'unknown'],
      default: 'unknown'
    },
    responseTime: {
      type: Number,
      default: 0
    },
    lastChecked: Date,
    message: String
  },
  lastSync: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

serviceProviderSchema.index({ serviceType: 1, isActive: 1, priority: 1 });

module.exports = mongoose.model('ServiceProvider', serviceProviderSchema);