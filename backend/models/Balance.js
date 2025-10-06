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

module.exports = mongoose.model('Balance', BalanceSchema);