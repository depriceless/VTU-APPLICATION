const mongoose = require('mongoose');
const crypto = require('crypto');

// ── Reference generator ───────────────────────────────────────────────────────
// ✅ Fix 6: crypto.randomBytes instead of Math.random()
function generateReference(prefix = 'TXN') {
  return `${prefix}_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
}

// ── Schema ────────────────────────────────────────────────────────────────────

const walletSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  balance: {
    type: Number,
    default: 0,
    min: [0, 'Wallet balance cannot be negative']
  },
  currency: {
    type: String,
    default: 'NGN',
    enum: ['NGN', 'USD', 'EUR']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isDormant: {
    type: Boolean,
    default: false
  },
  lastTransactionDate: {
    type: Date
  },

  dailyLimit:    { type: Number, default: 1000000 },
  monthlyLimit:  { type: Number, default: 10000000 },
  minimumBalance:{ type: Number, default: 0 },

  stats: {
    totalCredits:             { type: Number, default: 0 },
    totalDebits:              { type: Number, default: 0 },
    transactionCount:         { type: Number, default: 0 },
    averageTransactionAmount: { type: Number, default: 0 },
    totalDeposits:            { type: Number, default: 0 },
    depositCount:             { type: Number, default: 0 }
  },

  metadata: {
    createdBy: String,
    notes: String,
    tags: [String],
    riskLevel: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'low'
    }
  }
}, {
  timestamps: true,
  toJSON:   { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
walletSchema.index({ userId: 1 });
walletSchema.index({ balance: 1 });
walletSchema.index({ isActive: 1 });

// Virtual
walletSchema.virtual('formattedBalance').get(function() {
  return `₦${this.balance.toLocaleString()}`;
});

// ── Methods ───────────────────────────────────────────────────────────────────

/**
 * credit() — atomically add funds to wallet.
 *
 * Uses findOneAndUpdate with $inc so the balance change is a single atomic
 * MongoDB operation. No race condition possible.
 */
walletSchema.methods.credit = async function(amount, description, reference) {
  if (amount <= 0) throw new Error('Credit amount must be positive');

  const Transaction = mongoose.model('Transaction');
  const ref = reference || generateReference('TXN');

  // ✅ Fix 1 & 2: Atomic balance update — no read-modify-write gap
  const updatedWallet = await this.constructor.findOneAndUpdate(
    { _id: this._id, isActive: true },
    {
      $inc: {
        balance:                   amount,
        'stats.totalCredits':      amount,
        'stats.transactionCount':  1,
        'stats.totalDeposits':     amount,
        'stats.depositCount':      1
      },
      $set: { lastTransactionDate: new Date() }
    },
    { new: true, runValidators: true }
  );

  if (!updatedWallet) throw new Error('Wallet not found or is frozen');

  // ✅ Fix 4: Record transaction after confirmed balance update
  const transaction = await Transaction.create({
    walletId:        this._id,
    userId:          this.userId,
    type:            'credit',
    amount,
    previousBalance: updatedWallet.balance - amount,
    newBalance:      updatedWallet.balance,
    description:     description || `Wallet credited with ₦${amount.toLocaleString()}`,
    reference:       ref,
    status:          'completed',
    category:        'funding'
  });

  // Sync in-memory instance
  this.balance               = updatedWallet.balance;
  this.stats                 = updatedWallet.stats;
  this.lastTransactionDate   = updatedWallet.lastTransactionDate;

  return { wallet: updatedWallet, transaction };
};

/**
 * debit() — atomically deduct funds from wallet only if balance is sufficient.
 *
 * The balance check AND the deduction happen in a single findOneAndUpdate
 * query with a { balance: { $gte: amount } } condition. MongoDB either
 * applies the whole update or rejects it — no gap for a second request
 * to slip through.
 */
walletSchema.methods.debit = async function(amount, description, reference) {
  if (amount <= 0) throw new Error('Debit amount must be positive');

  const Transaction = mongoose.model('Transaction');
  const ref = reference || generateReference('TXN');

  // ✅ Fix 1: Atomic check-and-debit — TOCTOU race condition eliminated
  const updatedWallet = await this.constructor.findOneAndUpdate(
    {
      _id:     this._id,
      isActive: true,
      balance: { $gte: amount }   // ← check AND deduct in one operation
    },
    {
      $inc: {
        balance:                  -amount,
        'stats.totalDebits':       amount,
        'stats.transactionCount':  1
      },
      $set: { lastTransactionDate: new Date() }
    },
    { new: true, runValidators: true }
  );

  // If no document was updated, either frozen or truly insufficient balance
  if (!updatedWallet) {
    // Re-fetch to give a precise error message
    const current = await this.constructor.findById(this._id);
    if (!current || !current.isActive) throw new Error('Wallet is frozen or not found');
    throw new Error('Insufficient wallet balance');
  }

  // ✅ Fix 4: Record transaction only after confirmed deduction
  const transaction = await Transaction.create({
    walletId:        this._id,
    userId:          this.userId,
    type:            'debit',
    amount,
    previousBalance: updatedWallet.balance + amount,
    newBalance:      updatedWallet.balance,
    description:     description || `Wallet debited with ₦${amount.toLocaleString()}`,
    reference:       ref,
    status:          'completed',
    category:        'withdrawal'
  });

  // Sync in-memory instance
  this.balance             = updatedWallet.balance;
  this.stats               = updatedWallet.stats;
  this.lastTransactionDate = updatedWallet.lastTransactionDate;

  return { wallet: updatedWallet, transaction };
};

/**
 * transfer() — moves funds between two wallets inside a MongoDB session.
 *
 * Both deductions and both transaction records are committed together.
 * If anything fails mid-way, MongoDB rolls back the entire session —
 * no money disappears and no phantom credits appear.
 *
 * Requires MongoDB replica set (Mongo Atlas supports this by default).
 */
walletSchema.methods.transfer = async function(recipientWallet, amount, description) {
  if (amount <= 0) throw new Error('Transfer amount must be positive');

  const Transaction = mongoose.model('Transaction');
  const ref = generateReference('TRF');

  // ✅ Fix 3 & 4: Session wraps all DB writes — fully atomic
  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    // Atomic debit on sender — fails if balance insufficient
    const updatedSender = await this.constructor.findOneAndUpdate(
      { _id: this._id, isActive: true, balance: { $gte: amount } },
      {
        $inc: {
          balance:                  -amount,
          'stats.totalDebits':       amount,
          'stats.transactionCount':  1
        },
        $set: { lastTransactionDate: new Date() }
      },
      { new: true, session, runValidators: true }
    );

    if (!updatedSender) {
      await session.abortTransaction();
      throw new Error('Insufficient balance or sender wallet is frozen');
    }

    // Atomic credit on recipient
    const updatedRecipient = await this.constructor.findOneAndUpdate(
      { _id: recipientWallet._id, isActive: true },
      {
        $inc: {
          balance:                   amount,
          'stats.totalCredits':      amount,
          'stats.transactionCount':  1
        },
        $set: { lastTransactionDate: new Date() }
      },
      { new: true, session, runValidators: true }
    );

    if (!updatedRecipient) {
      await session.abortTransaction();
      throw new Error('Recipient wallet is frozen or not found');
    }

    // Create both transaction records in the same session
    await Transaction.insertMany([
      {
        walletId:        this._id,
        userId:          this.userId,
        type:            'transfer_out',
        amount,
        previousBalance: updatedSender.balance + amount,
        newBalance:      updatedSender.balance,
        description:     description || `Transfer to wallet ${recipientWallet._id}`,
        reference:       ref,
        status:          'completed',
        category:        'transfer',
        relatedWalletId: recipientWallet._id
      },
      {
        walletId:        recipientWallet._id,
        userId:          recipientWallet.userId,
        type:            'transfer_in',
        amount,
        previousBalance: updatedRecipient.balance - amount,
        newBalance:      updatedRecipient.balance,
        description:     description || `Transfer from wallet ${this._id}`,
        reference:       ref,
        status:          'completed',
        category:        'transfer',
        relatedWalletId: this._id
      }
    ], { session });

    await session.commitTransaction();

    // Sync in-memory instances
    this.balance = updatedSender.balance;
    recipientWallet.balance = updatedRecipient.balance;

    return { reference: ref, amount, updatedSender, updatedRecipient };

  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
};

walletSchema.methods.freeze = function() {
  this.isActive = false;
  return this.save();
};

walletSchema.methods.unfreeze = function() {
  this.isActive = true;
  return this.save();
};

// ── Statics ───────────────────────────────────────────────────────────────────

walletSchema.statics.createForUser = async function(userId) {
  const existingWallet = await this.findOne({ userId });
  if (existingWallet) throw new Error('User already has a wallet');
  const wallet = new this({ userId });
  return wallet.save();
};

walletSchema.statics.findByUserId = function(userId) {
  return this.findOne({ userId }).populate('userId', 'name email phone');
};

module.exports = mongoose.model('Wallet', walletSchema);