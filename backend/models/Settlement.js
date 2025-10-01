// models/Settlement.js
const mongoose = require('mongoose');

const settlementSchema = new mongoose.Schema({
  reference: {
    type: String,
    unique: true,
    required: true,
    default: function() {
      return 'STL-' + new Date().getFullYear() + '-' + 
             Math.random().toString(36).substr(2, 9).toUpperCase();
    }
  },
  amount: {
    type: Number,
    required: [true, 'Settlement amount is required'],
    min: [0, 'Amount must be positive']
  },
  bankAccountId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BankAccount',
    required: [true, 'Bank account is required']
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending'
  },
  transactionIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transaction'
  }],
  description: {
    type: String,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  processedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  processedAt: {
    type: Date
  },
  failureReason: {
    type: String,
    maxlength: [200, 'Failure reason cannot exceed 200 characters']
  },
  externalReference: {
    type: String,
    trim: true
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
});

// Indexes for better query performance
settlementSchema.index({ status: 1 });
settlementSchema.index({ bankAccountId: 1 });
settlementSchema.index({ processedAt: -1 });
settlementSchema.index({ reference: 1 }, { unique: true });

// Pre-save middleware to generate reference if not provided
settlementSchema.pre('save', function(next) {
  if (!this.reference) {
    this.reference = 'STL-' + new Date().getFullYear() + '-' + 
                    Math.random().toString(36).substr(2, 9).toUpperCase();
  }
  next();
});

module.exports = mongoose.model('Settlement', settlementSchema);