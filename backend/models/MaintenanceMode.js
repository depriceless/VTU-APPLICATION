const mongoose = require('mongoose');

const maintenanceModeSchema = new mongoose.Schema({
  enabled: { 
    type: Boolean, 
    default: false 
  },
  message: { 
    type: String, 
    default: 'System maintenance in progress. Please try again later.' 
  },
  scheduledStart: Date,
  scheduledEnd: Date,
  affectedServices: [String],
  enabledBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  disabledBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  }
}, { timestamps: true });

// Ensure only one maintenance mode document exists
maintenanceModeSchema.statics.getCurrent = async function() {
  let mode = await this.findOne();
  if (!mode) {
    mode = await this.create({});
  }
  return mode;
};

module.exports = mongoose.model('MaintenanceMode', maintenanceModeSchema);