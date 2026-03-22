const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { logger } = require('../utils/logger');

// ── KYC encryption helpers ───────────────────────────────────────────────────
// Encrypts sensitive government IDs (BVN, NIN) at rest using AES-256-GCM.
// Requires KYC_ENCRYPTION_KEY in .env — a 32-byte hex string:
//   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

const ALGO = 'aes-256-gcm';

function encryptKyc(plaintext) {
  if (!plaintext) return plaintext;
  const key = Buffer.from(process.env.KYC_ENCRYPTION_KEY, 'hex');
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
}

function decryptKyc(ciphertext) {
  if (!ciphertext || !ciphertext.includes(':')) return ciphertext;
  const [ivHex, tagHex, dataHex] = ciphertext.split(':');
  const key = Buffer.from(process.env.KYC_ENCRYPTION_KEY, 'hex');
  const decipher = crypto.createDecipheriv(ALGO, key, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  return decipher.update(Buffer.from(dataHex, 'hex')) + decipher.final('utf8');
}

// ── Schema ───────────────────────────────────────────────────────────────────

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true,
    lowercase: true,
    minlength: [3, 'Username must be at least 3 characters'],
    maxlength: [30, 'Username cannot exceed 30 characters'],
    match: [/^[a-zA-Z0-9._-]+$/, 'Username can only contain letters, numbers, dots, underscores, and hyphens']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address']
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    unique: true,
    trim: true,
    match: [/^\d{10,15}$/, 'Phone number must be 10-15 digits']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters'],
    select: false
  },
  pin: {
    type: String,
    select: false,
    validate: {
      validator: function(v) {
        if (!v) return true;
        if (v.startsWith('$2')) return true; // Already hashed
        return /^\d{4}$/.test(v);
      },
      message: 'PIN must be exactly 4 digits'
    }
  },
  isPinSetup: { type: Boolean, default: false },
  role: {
  type:    String,
  enum:    ['user', 'admin', 'support'],
  default: 'user',
  index:   true,
},
  isEmailVerified: { type: Boolean, default: false },
  isPhoneVerified: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  lastLogin: { type: Date },

  resetPasswordToken: { type: String, select: false },
  resetPasswordExpires: { type: Date, select: false },
  emailVerificationToken: { type: String, select: false },
  emailVerificationExpires: { type: Date, select: false },

  avatar: { type: String, default: null },
  dateOfBirth: { type: Date },
  address: {
    street: String,
    city: String,
    state: String,
    country: { type: String, default: 'Nigeria' },
    zipCode: String
  },

  preferences: {
    currency: { type: String, default: 'NGN', enum: ['NGN', 'USD', 'EUR'] },
    language: { type: String, default: 'en', enum: ['en', 'yo', 'ig', 'ha'] },
    timezone: { type: String, default: 'Africa/Lagos' },
    notifications: {
      email: { type: Boolean, default: true },
      sms: { type: Boolean, default: true },
      push: { type: Boolean, default: true },
      marketing: { type: Boolean, default: false }
    }
  },

  accountType: { type: String, enum: ['basic', 'premium', 'business'], default: 'basic' },
  kycLevel: { type: Number, min: 0, max: 3, default: 0 },
  kycData: {
    // BVN and NIN stored encrypted — use getKycData() to decrypt
    bvn: String,
    nin: String,
    idType: { type: String, enum: ['national_id', 'drivers_license', 'voters_card', 'passport'] },
    idNumber: String,
    idExpiryDate: Date,
    verificationStatus: { type: String, enum: ['pending', 'verified', 'rejected'], default: 'pending' }
  },

  status: {
    type: String,
    enum: ['active', 'deactivated', 'suspended'],
    default: 'active'
  },
  deactivatedAt: { type: Date, default: null },
  deactivationReason: { type: String, default: null },

  suspendedAt: { type: Date },
  suspensionReason: { type: String },
  suspensionExpiresAt: { type: Date },
  suspensionType: { type: String, enum: ['temporary', 'permanent'], default: 'temporary' },
  suspendedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  deletedAt: { type: Date },
  deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  lastLoginIP: { type: String },
  registrationIP: { type: String },
  failedLoginAttempts: { type: Number, default: 0 },
  lockedUntil: { type: Date },

  // PIN attempt tracking (persisted across server restarts)
  pinAttempts:    { type: Number, default: 0 },
  pinLockedUntil: { type: Date }

}, {
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: function(doc, ret) {
      delete ret.password;
      delete ret.pin;
      delete ret.resetPasswordToken;
      delete ret.resetPasswordExpires;
      delete ret.emailVerificationToken;
      delete ret.emailVerificationExpires;
      delete ret.__v;
      // Strip raw KYC values — never expose encrypted strings to API consumers
      if (ret.kycData) {
        delete ret.kycData.bvn;
        delete ret.kycData.nin;
      }
      ret.status = doc.getStatus ? doc.getStatus() : 'unknown';
      return ret;
    }
  },
  toObject: { virtuals: true }
});

// ── Indexes ──────────────────────────────────────────────────────────────────

userSchema.index({ email: 1 });
userSchema.index({ username: 1 });
userSchema.index({ phone: 1 });
userSchema.index({ isActive: 1 });
userSchema.index({ kycLevel: 1 });
userSchema.index({ accountType: 1 });
userSchema.index({ suspendedAt: 1 });
userSchema.index({ isActive: 1, suspendedAt: 1 });
userSchema.index({ deletedAt: 1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ lastLogin: -1 });

// ── Virtuals ─────────────────────────────────────────────────────────────────

userSchema.virtual('displayName').get(function() { return this.name || this.username; });
userSchema.virtual('accountAge').get(function() {
  if (!this.createdAt) return 0;
  return Math.ceil((new Date() - this.createdAt) / (1000 * 60 * 60 * 24));
});
userSchema.virtual('wallet', { ref: 'Wallet', localField: '_id', foreignField: 'userId', justOne: true });
userSchema.virtual('transactions', { ref: 'Transaction', localField: '_id', foreignField: 'userId' });

userSchema.virtual('isSuspended').get(function() {
  if (!this.suspendedAt) return false;
  if (this.suspensionType === 'permanent') return true;
  if (this.suspensionExpiresAt && this.suspensionExpiresAt > new Date()) return true;
  return false;
});

userSchema.virtual('suspensionStatus').get(function() {
  if (!this.suspendedAt) return 'active';
  if (this.suspensionType === 'permanent') return 'permanently_suspended';
  if (this.suspensionExpiresAt) {
    return this.suspensionExpiresAt > new Date() ? 'temporarily_suspended' : 'suspension_expired';
  }
  return 'suspended';
});

// ── Pre-save hooks ───────────────────────────────────────────────────────────

// Hash password
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;
  this.password = await bcrypt.hash(this.password, saltRounds);
  next();
});

// Hash PIN
userSchema.pre('save', async function(next) {
  if (!this.isModified('pin') || !this.pin) return next();
  const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;
  this.pin = await bcrypt.hash(this.pin, saltRounds);
  next();
});

// Encrypt BVN and NIN before saving
userSchema.pre('save', function(next) {
  if (!process.env.KYC_ENCRYPTION_KEY) return next();
  if (this.kycData) {
    if (this.isModified('kycData.bvn') && this.kycData.bvn && !this.kycData.bvn.includes(':')) {
      this.kycData.bvn = encryptKyc(this.kycData.bvn);
    }
    if (this.isModified('kycData.nin') && this.kycData.nin && !this.kycData.nin.includes(':')) {
      this.kycData.nin = encryptKyc(this.kycData.nin);
    }
  }
  next();
});

// Auto-activate if suspension has expired
userSchema.pre('save', function(next) {
  if (this.suspendedAt && this.suspensionExpiresAt && this.suspensionExpiresAt <= new Date()) {
    this.isActive = true;
    this.suspendedAt = undefined;
    this.suspensionReason = undefined;
    this.suspensionExpiresAt = undefined;
    this.suspensionType = undefined;
  }
  next();
});

// ── Post-save hooks ──────────────────────────────────────────────────────────

userSchema.post('save', async function(doc, next) {
  try {
    const Wallet = mongoose.model('Wallet');
    const existingWallet = await Wallet.findOne({ userId: doc._id });
    if (!existingWallet) {
      await Wallet.createForUser(doc._id);
      logger.info('Wallet automatically created for new user');
    }
    next();
  } catch (err) {
    next(err);
  }
});

// ── Instance methods ─────────────────────────────────────────────────────────

userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.comparePin = async function(candidatePin) {
  if (!this.pin) return false;
  return await bcrypt.compare(candidatePin, this.pin);
};

userSchema.methods.updateLastLogin = function(ip = null) {
  this.lastLogin = new Date();
  if (ip) this.lastLoginIP = ip;
  return this.save();
};

// Decrypt KYC data for authorised use (admin/KYC verification only)
userSchema.methods.getKycData = function() {
  if (!this.kycData) return null;
  return {
    ...this.kycData.toObject(),
    bvn: this.kycData.bvn ? decryptKyc(this.kycData.bvn) : null,
    nin: this.kycData.nin ? decryptKyc(this.kycData.nin) : null,
  };
};

userSchema.methods.getWallet = async function() {
  const Wallet = mongoose.model('Wallet');
  return await Wallet.findByUserId(this._id);
};

userSchema.methods.createWallet = async function() {
  const Wallet = mongoose.model('Wallet');
  return await Wallet.createForUser(this._id);
};

userSchema.methods.getTransactions = async function(options = {}) {
  const Transaction = mongoose.model('Transaction');
  return await Transaction.getUserTransactions(this._id, options);
};

userSchema.methods.canTransact = function(amount) {
  const limits = { 0: 50000, 1: 200000, 2: 1000000, 3: 10000000 };
  return amount <= limits[this.kycLevel];
};

userSchema.methods.getTransactionLimit = function() {
  const limits = { 0: 50000, 1: 200000, 2: 1000000, 3: 10000000 };
  return limits[this.kycLevel] || 50000;
};

userSchema.methods.suspend = function(reason, expiresAt = null, suspendedBy = null) {
  this.isActive = false;
  this.suspendedAt = new Date();
  this.suspensionReason = reason;
  this.suspensionExpiresAt = expiresAt;
  this.suspensionType = expiresAt ? 'temporary' : 'permanent';
  this.suspendedBy = suspendedBy;
  return this.save();
};

userSchema.methods.unsuspend = function() {
  this.isActive = true;
  this.suspendedAt = undefined;
  this.suspensionReason = undefined;
  this.suspensionExpiresAt = undefined;
  this.suspensionType = undefined;
  this.suspendedBy = undefined;
  return this.save();
};

userSchema.methods.softDelete = function(deletedBy = null) {
  this.isActive = false;
  this.deletedAt = new Date();
  this.deletedBy = deletedBy;
  return this.save();
};

userSchema.methods.getStatus = function() {
  if (this.deletedAt) return 'deleted';
  if (this.suspendedAt && (this.suspensionType === 'permanent' ||
      (this.suspensionExpiresAt && this.suspensionExpiresAt > new Date()))) {
    return 'suspended';
  }
  if (!this.isEmailVerified) return 'pending_verification';
  if (this.isActive) return 'active';
  return 'inactive';
};

// ── Static methods ───────────────────────────────────────────────────────────

userSchema.statics.findByEmailOrPhone = function(emailOrPhone) {
  const emailRegex = /^\S+@\S+\.\S+$/;
  const phoneRegex = /^\d+$/;
  if (emailRegex.test(emailOrPhone)) {
    return this.findOne({ email: emailOrPhone.toLowerCase() });
  }
  const clean = emailOrPhone.replace(/[\s\-\(\)]/g, '');
  if (phoneRegex.test(clean)) {
    return this.findOne({ phone: clean });
  }
  return Promise.resolve(null);
};

userSchema.statics.findActiveUsers = function() { return this.find({ isActive: true }); };
userSchema.statics.findByKycLevel = function(level) { return this.find({ kycLevel: level }); };

userSchema.statics.findSuspended = function() {
  return this.find({
    suspendedAt: { $exists: true },
    $or: [
      { suspensionType: 'permanent' },
      { suspensionExpiresAt: { $gt: new Date() } }
    ]
  });
};

userSchema.statics.findExpiredSuspensions = function() {
  return this.find({
    suspendedAt: { $exists: true },
    suspensionType: 'temporary',
    suspensionExpiresAt: { $lte: new Date() },
    isActive: false
  });
};

userSchema.statics.autoUnsuspendExpired = async function() {
  return this.updateMany(
    {
      suspendedAt: { $exists: true },
      suspensionType: 'temporary',
      suspensionExpiresAt: { $lte: new Date() },
      isActive: false
    },
    {
      $set: { isActive: true },
      $unset: {
        suspendedAt: '',
        suspensionReason: '',
        suspensionExpiresAt: '',
        suspensionType: '',
        suspendedBy: ''
      }
    }
  );
};

module.exports = mongoose.model('User', userSchema);