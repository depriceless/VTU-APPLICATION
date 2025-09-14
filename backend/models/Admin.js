const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const adminSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 30
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  phone: {
    type: String,
    trim: true,
    default: null,
    validate: {
      validator: function(v) {
        // Allow null/undefined or valid phone format
        if (!v) return true;
        return /^\+?[\d\s\-\(\)]{10,15}$/.test(v);
      },
      message: 'Invalid phone number format'
    }
  },
  role: {
    type: String,
    enum: ['super_admin', 'admin', 'support'],
    default: 'admin'
  },
  lastLogin: {
    type: Date
  },
  isActive: {
    type: Boolean,
    default: true
  },
  permissions: {
    type: [String],
    default: []
  },
  // Additional profile fields
  profileImage: {
    type: String,
    default: null
  },
  department: {
    type: String,
    default: null
  },
  loginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: {
    type: Date
  }
}, {
  timestamps: true
});

// Virtual for checking if account is locked
adminSchema.virtual('isLocked').get(function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Hash password before saving
adminSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
adminSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Increment login attempts
adminSchema.methods.incLoginAttempts = function() {
  // If we have a previous lock that has expired, restart at 1
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $set: {
        loginAttempts: 1
      },
      $unset: {
        lockUntil: 1
      }
    });
  }
  
  const updates = { $inc: { loginAttempts: 1 } };
  
  // Lock account after 5 failed attempts for 2 hours
  if (this.loginAttempts + 1 >= 5 && !this.isLocked) {
    updates.$set = { lockUntil: Date.now() + 2 * 60 * 60 * 1000 }; // 2 hours
  }
  
  return this.updateOne(updates);
};

// Reset login attempts
adminSchema.methods.resetLoginAttempts = function() {
  return this.updateOne({
    $unset: {
      loginAttempts: 1,
      lockUntil: 1
    }
  });
};

// Static method to find by username or email
adminSchema.statics.findByUsernameOrEmail = function(identifier) {
  return this.findOne({
    $or: [
      { username: identifier },
      { email: identifier }
    ]
  });
};

// Update last login
adminSchema.methods.updateLastLogin = function() {
  return this.updateOne({ lastLogin: new Date() });
};

// Remove password from JSON output
adminSchema.methods.toJSON = function() {
  const admin = this.toObject({ virtuals: true });
  delete admin.password;
  delete admin.loginAttempts;
  delete admin.lockUntil;
  return admin;
};

// Index for better query performance
adminSchema.index({ email: 1 });
adminSchema.index({ username: 1 });
adminSchema.index({ isActive: 1 });
adminSchema.index({ role: 1 });

module.exports = mongoose.model('Admin', adminSchema);