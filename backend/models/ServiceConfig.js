const mongoose = require('mongoose');

const serviceConfigSchema = new mongoose.Schema({
serviceType: {
  type: String,
  enum: ['airtime', 'data', 'electricity', 'cable_tv', 'internet', 'fund_betting', 'education', 'print_recharge', 'transfer'],
  required: true,
  unique: true
},
  displayName: String,
  description: String,
  isActive: { type: Boolean, default: true },
  maintenanceMode: { type: Boolean, default: false },
  maintenanceMessage: String,
  
  limits: {
    min: { type: Number, default: 50 },
    max: { type: Number, default: 500000 },
    dailyLimit: { type: Number, default: 1000000 }
  },
  
  pricing: {
    markupPercentage: { type: Number, default: 0 },
    flatFee: { type: Number, default: 0 }
  },
  
  statistics: {
    totalTransactions: { type: Number, default: 0 },
    successfulTransactions: { type: Number, default: 0 },
    totalRevenue: { type: Number, default: 0 },
    lastTransactionAt: Date,
    successRate: { type: Number, default: 100 }
  },
  
  lastModified: { type: Date, default: Date.now },
  modifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, {
  timestamps: true
});

module.exports = mongoose.model('ServiceConfig', serviceConfigSchema);