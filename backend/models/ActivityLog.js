// models/ActivityLog.js
const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User' // Assuming admins are also Users
  },
  type: {
    type: String,
    enum: [
      'user_registration',
      'user_verification', 
      'transaction_dispute',
      'service_update',
      'system_alert',
      'transaction_failed',
      'kyc_approved',
      'kyc_rejected',
      'user_suspended',
      'service_maintenance',
      'login',
      'wallet_funding',
      'betting_transaction'
    ],
    required: true
  },
  description: {
    type: String,
    required: true
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed
  },
  ipAddress: String
}, {
  timestamps: true
});

// Index for better query performance
activityLogSchema.index({ createdAt: -1 });
activityLogSchema.index({ userId: 1, createdAt: -1 });
activityLogSchema.index({ type: 1 });

module.exports = mongoose.model('ActivityLog', activityLogSchema);