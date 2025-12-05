const mongoose = require('mongoose');

const BalanceSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  balance: {
    type: Number,
    default: 0,
    required: true
  },
  currency: {
    type: String,
    default: 'NGN'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isDormant: {
    type: Boolean,
    default: false
  },
  dailyLimit: {
    type: Number,
    default: 1000000
  },
  monthlyLimit: {
    type: Number,
    default: 10000000
  },
  minimumBalance: {
    type: Number,
    default: 0
  },
  lastTransactionDate: {
    type: Date
  },
  // 🆕 ADDED: Transactions array to store all wallet transactions
  transactions: [{
    type: {
      type: String,
      enum: ['credit', 'debit'],
      required: true
    },
    amount: {
      type: Number,
      required: true
    },
    reference: {
      type: String,
      required: true,
      unique: true
    },
    description: {
      type: String,
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'reversed'],
      default: 'completed'
    },
    gateway: {
      type: String,
      enum: ['paystack', 'monnify', 'manual', 'system'],
      required: true
    },
    channel: {
      type: String // e.g., 'bank_transfer', 'card', etc.
    },
    previousBalance: {
      type: Number,
      required: true
    },
    newBalance: {
      type: Number,
      required: true
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    date: {
      type: Date,
      default: Date.now
    }
  }],
  stats: {
    totalDeposits: { type: Number, default: 0 },
    totalWithdrawals: { type: Number, default: 0 },
    depositCount: { type: Number, default: 0 },
    withdrawalCount: { type: Number, default: 0 }
  },
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
});

// Index for faster transaction lookups
BalanceSchema.index({ 'transactions.reference': 1 });
BalanceSchema.index({ 'transactions.date': -1 });

module.exports = mongoose.model('Balance', BalanceSchema);