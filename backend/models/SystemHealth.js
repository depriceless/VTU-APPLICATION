const mongoose = require('mongoose');

const systemHealthSchema = new mongoose.Schema({
  metrics: {
    uptime: Number,
    cpuUsage: Number,
    memoryUsage: Number,
    diskUsage: Number,
    activeConnections: Number,
    errorRate: Number,
    apiResponseTime: Number,
    lastChecked: Date
  },
  status: {
    type: String,
    enum: ['healthy', 'degraded', 'unhealthy'],
    default: 'healthy'
  },
  checkedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('SystemHealth', systemHealthSchema);