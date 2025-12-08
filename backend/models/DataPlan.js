const mongoose = require('mongoose');

const DataPlanSchema = new mongoose.Schema({
  // Unique identifier (e.g., "1000.0", "500.01")
  planId: {
    type: String,
    required: true,
    index: true
  },

  // Network (mtn, glo, airtel, 9mobile)
  network: {
    type: String,
    required: true,
    lowercase: true,
    enum: ['mtn', 'glo', 'airtel', '9mobile'],
    index: true
  },

  // Plan details
  name: {
    type: String,
    required: true
  },

  dataSize: {
    type: String,
    required: true
  },

  validity: {
    type: String,
    required: true
  },

  // Provider cost (what ClubConnect charges you)
  providerCost: {
    type: Number,
    required: true,
    min: 0
  },

  // Category (daily, weekly, monthly)
  category: {
    type: String,
    required: true,
    enum: ['daily', 'weekly', 'monthly'],
    index: true
  },

  // ✅ Plan type (Direct, SME, Gift) - ONLY 3 TYPES
  planType: {
    type: String,
    required: true,
    enum: ['direct', 'sme', 'gift'],  // ✅ REMOVED 'sme2'
    default: 'direct',
    index: true
  },

  // Status flags
  active: {
    type: Boolean,
    default: true,
    index: true
  },

  popular: {
    type: Boolean,
    default: false,
    index: true
  },

  // Tracking
  lastUpdated: {
    type: Date,
    default: Date.now
  },

  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// ✅ Compound unique index (network + planId together must be unique)
DataPlanSchema.index({ network: 1, planId: 1 }, { unique: true });

// Other indexes for fast queries
DataPlanSchema.index({ network: 1, active: 1 });
DataPlanSchema.index({ network: 1, category: 1, active: 1 });
DataPlanSchema.index({ network: 1, planType: 1, active: 1 });
DataPlanSchema.index({ network: 1, popular: 1, active: 1 });

// Virtual for customer price (calculated dynamically)
DataPlanSchema.virtual('pricing').get(function() {
  const { calculateCustomerPrice } = require('../config/pricing');
  return calculateCustomerPrice(this.providerCost, 'data');
});

// Include virtuals in JSON
DataPlanSchema.set('toJSON', { virtuals: true });
DataPlanSchema.set('toObject', { virtuals: true });

const DataPlan = mongoose.model('DataPlan', DataPlanSchema);

module.exports = DataPlan;