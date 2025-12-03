const mongoose = require('mongoose');

const paymentGatewayConfigSchema = new mongoose.Schema({
  activeGateway: {
    type: String,
    enum: ['paystack', 'monnify'],
    default: 'paystack',
    required: true
  },
  gateways: {
    paystack: {
      enabled: {
        type: Boolean,
        default: true
      },
      publicKey: {
        type: String,
        default: ''
      },
      secretKey: {
        type: String,
        default: ''
      },
      lastUsed: Date,
      totalTransactions: {
        type: Number,
        default: 0
      },
      successfulTransactions: {
        type: Number,
        default: 0
      },
      totalAmount: {
        type: Number,
        default: 0
      }
    },
    monnify: {
      enabled: {
        type: Boolean,
        default: true
      },
      apiKey: {
        type: String,
        default: ''
      },
      secretKey: {
        type: String,
        default: ''
      },
      contractCode: {
        type: String,
        default: ''
      },
      lastUsed: Date,
      totalTransactions: {
        type: Number,
        default: 0
      },
      successfulTransactions: {
        type: Number,
        default: 0
      },
      totalAmount: {
        type: Number,
        default: 0
      }
    }
  },
  lastSwitchedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  lastSwitchedAt: Date,
  switchHistory: [{
    from: String,
    to: String,
    switchedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin'
    },
    switchedAt: {
      type: Date,
      default: Date.now
    },
    reason: String
  }]
}, {
  timestamps: true
});

// Ensure only one config document exists
paymentGatewayConfigSchema.statics.getConfig = async function() {
  let config = await this.findOne();
  if (!config) {
    config = await this.create({
      activeGateway: 'paystack'
    });
  }
  return config;
};

module.exports = mongoose.model('PaymentGatewayConfig', paymentGatewayConfigSchema);