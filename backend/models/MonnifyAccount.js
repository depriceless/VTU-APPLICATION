const mongoose = require('mongoose');

const MonnifyAccountSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  accountReference: {
    type: String,
    required: true,
    unique: true
  },
  accounts: [{
    bankName: String,
    bankCode: String,
    accountNumber: String,
    accountName: String
  }],
  customerEmail: {
    type: String,
    required: true
  },
  customerName: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('MonnifyAccount', MonnifyAccountSchema);