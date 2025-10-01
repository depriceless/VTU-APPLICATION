// models/ServiceProvider.js
const mongoose = require('mongoose');

const serviceProviderSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  serviceType: {
    type: String,
    enum: ['airtime', 'data', 'electricity', 'cable_tv', 'internet', 'betting'],
    required: true
  },
  
  isActive: { type: Boolean, default: true },
  priority: { type: Number, default: 1 }, // Lower number = higher priority
  
  apiConfig: {
    baseUrl: String,
    apiKey: String,
    secretKey: String,
    timeout: { type: Number, default: 30000 }
  },
  
  healthCheck: {
    lastChecked: Date,
    status: { type: String, enum: ['online', 'offline', 'degraded'], default: 'online' },
    responseTime: Number,
    uptime: { type: Number, default: 100 }
  },
  
  statistics: {
    totalRequests: { type: Number, default: 0 },
    successfulRequests: { type: Number, default: 0 },
    failedRequests: { type: Number, default: 0 },
    averageResponseTime: { type: Number, default: 0 }
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('ServiceProvider', serviceProviderSchema);