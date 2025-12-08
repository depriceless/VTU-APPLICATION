// models/CableTVPlan.js
const mongoose = require('mongoose');

const CableTVPlanSchema = new mongoose.Schema({
  // Unique identifier from ClubKonnect (e.g., "dstv-padi", "gotv-smallie")
  packageId: {
    type: String,
    required: true,
    index: true
  },

  // Operator (dstv, gotv, startimes)
  operator: {
    type: String,
    required: true,
    lowercase: true,
    enum: ['dstv', 'gotv', 'startimes'],
    index: true
  },

  // Package details
  name: {
    type: String,
    required: true
  },

  // Provider cost (what ClubKonnect charges you)
  providerCost: {
    type: Number,
    required: true,
    min: 0
  },

  // Duration (e.g., "1 Month", "1 Week", "3 Months")
  duration: {
    type: String,
    default: '30 days'
  },

  // Description
  description: {
    type: String,
    default: ''
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

// Compound unique index (operator + packageId together must be unique)
CableTVPlanSchema.index({ operator: 1, packageId: 1 }, { unique: true });

// Other indexes for fast queries
CableTVPlanSchema.index({ operator: 1, active: 1 });
CableTVPlanSchema.index({ operator: 1, popular: 1, active: 1 });

// Virtual for customer price (calculated dynamically)
CableTVPlanSchema.virtual('pricing').get(function() {
  // For Cable TV: NO MARKUP - customer pays exactly what ClubKonnect charges
  return {
    providerCost: this.providerCost,
    customerPrice: this.providerCost,  // Same as provider cost
    profit: 0  // Zero profit
  };
});

// Include virtuals in JSON
CableTVPlanSchema.set('toJSON', { virtuals: true });
CableTVPlanSchema.set('toObject', { virtuals: true });

const CableTVPlan = mongoose.model('CableTVPlan', CableTVPlanSchema);

module.exports = CableTVPlan;