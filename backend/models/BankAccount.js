// models/BankAccount.js
const mongoose = require('mongoose');

const bankAccountSchema = new mongoose.Schema({
  accountName: {
    type: String,
    required: [true, 'Account name is required'],
    trim: true,
    maxlength: [100, 'Account name cannot exceed 100 characters']
  },
  accountNumber: {
    type: String,
    required: [true, 'Account number is required'],
    trim: true,
    maxlength: [20, 'Account number cannot exceed 20 characters'],
    validate: {
      validator: function(v) {
        return /^\d{10,20}$/.test(v);
      },
      message: 'Account number must be between 10-20 digits'
    }
  },
  bankName: {
    type: String,
    required: [true, 'Bank name is required'],
    trim: true,
    maxlength: [50, 'Bank name cannot exceed 50 characters']
  },
  bankCode: {
    type: String,
    trim: true,
    maxlength: [10, 'Bank code cannot exceed 10 characters']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastUsed: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastModified: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for faster queries
bankAccountSchema.index({ accountNumber: 1, bankCode: 1 }, { unique: true });
bankAccountSchema.index({ isActive: 1 });

module.exports = mongoose.model('BankAccount', bankAccountSchema);