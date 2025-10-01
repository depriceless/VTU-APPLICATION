// models/ApiProvider.js
const mongoose = require('mongoose');

const apiProviderSchema = new mongoose.Schema({
  // Basic Configuration
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
    maxlength: 20
  },
  type: {
    type: String,
    required: true,
    enum: ['Primary Provider', 'Secondary Provider', 'Backup Provider', 'Custom Provider'],
    default: 'Custom Provider'
  },
  
  // Connection Settings
  endpoint: {
    type: String,
    required: true,
    trim: true,
    validate: {
      validator: function(v) {
        return /^https?:\/\/.+/.test(v);
      },
      message: 'Endpoint must be a valid HTTP/HTTPS URL'
    }
  },
  apiKey: {
    type: String,
    required: true,
    minlength: 10
  },
  timeout: {
    type: Number,
    default: 30000,
    min: 5000,
    max: 120000
  },
  retries: {
    type: Number,
    default: 3,
    min: 0,
    max: 10
  },
  
  // Status and Health
  status: {
    type: String,
    enum: ['active', 'inactive', 'maintenance', 'error'],
    default: 'inactive'
  },
  isActive: {
    type: Boolean,
    default: false
  },
  maintenanceMode: {
    type: Boolean,
    default: false
  },
  maintenanceMessage: {
    type: String,
    default: ''
  },
  
  // Performance Metrics
  successRate: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  averageResponseTime: {
    type: Number,
    default: 0
  },
  totalRequests: {
    type: Number,
    default: 0
  },
  successfulRequests: {
    type: Number,
    default: 0
  },
  failedRequests: {
    type: Number,
    default: 0
  },
  lastSuccessfulRequest: {
    type: Date
  },
  lastFailedRequest: {
    type: Date
  },
  lastSync: {
    type: Date,
    default: Date.now
  },
  
  // Priority and Load Balancing
  priority: {
    type: Number,
    default: 5,
    min: 1,
    max: 10
  },
  weight: {
    type: Number,
    default: 1,
    min: 0,
    max: 10
  },
  
  // Additional Configuration
  headers: {
    type: Map,
    of: String,
    default: new Map()
  },
  metadata: {
    type: Object,
    default: {}
  },
  
  // Health Check Settings
  healthCheck: {
    enabled: {
      type: Boolean,
      default: true
    },
    interval: {
      type: Number,
      default: 300000 // 5 minutes
    },
    endpoint: {
      type: String,
      default: '/health'
    },
    lastCheck: {
      type: Date
    },
    status: {
      type: String,
      enum: ['healthy', 'unhealthy', 'unknown'],
      default: 'unknown'
    }
  },
  
  // Rate Limiting
  rateLimit: {
    enabled: {
      type: Boolean,
      default: false
    },
    requestsPerSecond: {
      type: Number,
      default: 10
    },
    requestsPerMinute: {
      type: Number,
      default: 600
    },
    requestsPerHour: {
      type: Number,
      default: 36000
    }
  },
  
  // Error Tracking
  recentErrors: [{
    timestamp: {
      type: Date,
      default: Date.now
    },
    error: {
      type: String,
      required: true
    },
    statusCode: {
      type: Number
    },
    responseTime: {
      type: Number
    }
  }],
  
  // Configuration History
  configHistory: [{
    timestamp: {
      type: Date,
      default: Date.now
    },
    modifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin'
    },
    changes: {
      type: Object
    },
    reason: {
      type: String
    }
  }],
  
  // Audit Fields
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  lastModifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  }
}, {
  timestamps: true
});

// Indexes for better performance
apiProviderSchema.index({ code: 1 });
apiProviderSchema.index({ status: 1, isActive: 1 });
apiProviderSchema.index({ priority: 1, weight: -1 });
apiProviderSchema.index({ type: 1 });

// Virtual for calculating uptime percentage
apiProviderSchema.virtual('uptimePercentage').get(function() {
  const totalRequests = this.totalRequests || 1;
  return Math.round((this.successfulRequests / totalRequests) * 10000) / 100;
});

// Method to update success rate
apiProviderSchema.methods.updateSuccessRate = function() {
  const totalRequests = this.totalRequests || 1;
  this.successRate = Math.round((this.successfulRequests / totalRequests) * 10000) / 100;
  return this.successRate;
};

// Method to record successful request
apiProviderSchema.methods.recordSuccess = function(responseTime = 0) {
  this.totalRequests += 1;
  this.successfulRequests += 1;
  this.lastSuccessfulRequest = new Date();
  this.lastSync = new Date();
  
  // Update average response time
  if (responseTime > 0) {
    const currentAvg = this.averageResponseTime || 0;
    const totalSuccessful = this.successfulRequests;
    this.averageResponseTime = Math.round(((currentAvg * (totalSuccessful - 1)) + responseTime) / totalSuccessful);
  }
  
  this.updateSuccessRate();
  
  // Update status to active if it was in error
  if (this.status === 'error') {
    this.status = 'active';
  }
};

// Method to record failed request
apiProviderSchema.methods.recordFailure = function(error, statusCode, responseTime) {
  this.totalRequests += 1;
  this.failedRequests += 1;
  this.lastFailedRequest = new Date();
  this.lastSync = new Date();
  
  // Add to recent errors (keep only last 10)
  this.recentErrors.unshift({
    error: error,
    statusCode: statusCode,
    responseTime: responseTime,
    timestamp: new Date()
  });
  
  if (this.recentErrors.length > 10) {
    this.recentErrors = this.recentErrors.slice(0, 10);
  }
  
  this.updateSuccessRate();
  
  // Update status if failure rate is too high
  const recentFailures = this.recentErrors.length;
  if (recentFailures >= 5) {
    this.status = 'error';
  }
};

// Method to test connection
apiProviderSchema.methods.testConnection = async function() {
  const axios = require('axios');
  
  try {
    const startTime = Date.now();
    const response = await axios.get(this.endpoint + (this.healthCheck.endpoint || '/health'), {
      timeout: this.timeout,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        ...Object.fromEntries(this.headers)
      }
    });
    
    const responseTime = Date.now() - startTime;
    
    this.recordSuccess(responseTime);
    this.healthCheck.lastCheck = new Date();
    this.healthCheck.status = 'healthy';
    
    return {
      success: true,
      responseTime: responseTime,
      statusCode: response.status,
      message: 'Connection successful'
    };
    
  } catch (error) {
    const responseTime = Date.now() - Date.now();
    this.recordFailure(error.message, error.response?.status, responseTime);
    this.healthCheck.lastCheck = new Date();
    this.healthCheck.status = 'unhealthy';
    
    return {
      success: false,
      error: error.message,
      statusCode: error.response?.status || 0,
      message: 'Connection failed'
    };
  }
};

// Method to get provider stats
apiProviderSchema.methods.getStats = function() {
  return {
    totalRequests: this.totalRequests,
    successfulRequests: this.successfulRequests,
    failedRequests: this.failedRequests,
    successRate: this.successRate,
    averageResponseTime: this.averageResponseTime,
    uptimePercentage: this.uptimePercentage,
    lastSuccessfulRequest: this.lastSuccessfulRequest,
    lastFailedRequest: this.lastFailedRequest,
    recentErrorsCount: this.recentErrors.length,
    healthStatus: this.healthCheck.status
  };
};

// Static method to get active providers
apiProviderSchema.statics.getActiveProviders = function() {
  return this.find({ isActive: true, status: { $ne: 'maintenance' } })
    .sort({ priority: 1, weight: -1 });
};

// Static method to get providers by type
apiProviderSchema.statics.getProvidersByType = function(type) {
  return this.find({ type: type, isActive: true })
    .sort({ priority: 1, weight: -1 });
};

// Pre-save middleware to track configuration changes
apiProviderSchema.pre('save', function(next) {
  if (this.isModified() && !this.isNew) {
    const changes = this.getChanges();
    if (Object.keys(changes).length > 0) {
      this.configHistory.unshift({
        changes: changes,
        modifiedBy: this.lastModifiedBy,
        timestamp: new Date()
      });
      
      // Keep only last 20 history entries
      if (this.configHistory.length > 20) {
        this.configHistory = this.configHistory.slice(0, 20);
      }
    }
  }
  next();
});

// Method to get configuration changes
apiProviderSchema.methods.getChanges = function() {
  const changes = {};
  const modifiedPaths = this.modifiedPaths();
  
  modifiedPaths.forEach(path => {
    if (!['configHistory', 'updatedAt', 'lastSync'].includes(path)) {
      changes[path] = this[path];
    }
  });
  
  return changes;
};

// Remove sensitive data from JSON output
apiProviderSchema.methods.toJSON = function() {
  const provider = this.toObject({ virtuals: true });
  
  // Mask API key for security
  if (provider.apiKey) {
    provider.apiKey = '****-****-****-' + provider.apiKey.slice(-4);
  }
  
  // Remove sensitive headers
  if (provider.headers) {
    const maskedHeaders = {};
    for (const [key, value] of provider.headers) {
      if (key.toLowerCase().includes('auth') || key.toLowerCase().includes('key')) {
        maskedHeaders[key] = '****';
      } else {
        maskedHeaders[key] = value;
      }
    }
    provider.headers = maskedHeaders;
  }
  
  return provider;
};

module.exports = mongoose.model('ApiProvider', apiProviderSchema);