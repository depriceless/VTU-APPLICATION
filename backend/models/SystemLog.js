const mongoose = require('mongoose');

const systemLogSchema = new mongoose.Schema({
  level: {
    type: String,
    enum: ['debug', 'info', 'warn', 'error', 'fatal'],
    required: true
  },
  service: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  details: {
    type: Object,
    default: {}
  },
  metadata: {
    type: Object,
    default: {}
  },
  resolved: {
    type: Boolean,
    default: false
  },
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  resolvedAt: Date,
  resolution: String
}, {
  timestamps: true
});

systemLogSchema.index({ level: 1, createdAt: -1 });
systemLogSchema.index({ service: 1, createdAt: -1 });
systemLogSchema.index({ resolved: 1 });

module.exports = mongoose.model('SystemLog', systemLogSchema);