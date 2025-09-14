// services/transactionRetryService.js
const Transaction = require('../models/Transaction');
const Wallet = require('../models/Wallet');
const User = require('../models/User');
const mongoose = require('mongoose');

class TransactionRetryService {
  constructor() {
    this.retryQueue = [];
    this.isProcessing = false;
    this.retryIntervals = [5000, 15000, 45000]; // 5s, 15s, 45s delays
    this.maxRetryAttempts = 3;
  }

  // Add transaction to retry queue
  async queueRetry(transactionId, reason = 'Manual retry') {
    try {
      console.log(`Adding transaction ${transactionId} to retry queue`);
      
      const transaction = await Transaction.findById(transactionId)
        .populate('userId', 'name email phone')
        .populate('walletId', 'balance');

      if (!transaction) {
        throw new Error('Transaction not found');
      }

      if (transaction.status !== 'failed' && transaction.status !== 'pending') {
        throw new Error(`Cannot retry transaction with status: ${transaction.status}`);
      }

      const retryCount = transaction.metadata?.retryCount || 0;
      if (retryCount >= this.maxRetryAttempts) {
        throw new Error(`Maximum retry attempts (${this.maxRetryAttempts}) reached`);
      }

      // Add to retry queue if not already present
      const existingIndex = this.retryQueue.findIndex(item => 
        item.transactionId.toString() === transactionId.toString()
      );

      if (existingIndex === -1) {
        this.retryQueue.push({
          transactionId,
          transaction,
          retryAttempt: retryCount + 1,
          queuedAt: new Date(),
          reason,
          nextRetryAt: new Date(Date.now() + this.retryIntervals[retryCount] || 45000)
        });

        console.log(`Transaction ${transactionId} queued for retry attempt ${retryCount + 1}`);
      }

      this.startProcessing();
      return { success: true, retryAttempt: retryCount + 1 };

    } catch (error) {
      console.error(`Error queuing retry for transaction ${transactionId}:`, error);
      throw error;
    }
  }

  // Start processing retry queue
  async startProcessing() {
    if (this.isProcessing) return;
    
    this.isProcessing = true;
    console.log('Starting retry queue processing');

    while (this.retryQueue.length > 0) {
      const now = new Date();
      
      // Find items ready for retry
      const readyItems = this.retryQueue.filter(item => item.nextRetryAt <= now);
      
      if (readyItems.length === 0) {
        // Wait for next retry time
        const nextRetry = Math.min(...this.retryQueue.map(item => item.nextRetryAt.getTime()));
        const waitTime = Math.max(1000, nextRetry - now.getTime());
        await new Promise(resolve => setTimeout(resolve, Math.min(waitTime, 30000)));
        continue;
      }

      // Process ready items
      for (const item of readyItems) {
        await this.processRetry(item);
        // Remove from queue after processing
        this.retryQueue = this.retryQueue.filter(
          queueItem => queueItem.transactionId.toString() !== item.transactionId.toString()
        );
      }

      // Small delay between batches
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    this.isProcessing = false;
    console.log('Retry queue processing completed');
  }

  // Process individual transaction retry
  async processRetry(queueItem) {
    const { transactionId, transaction, retryAttempt, reason } = queueItem;
    
    try {
      console.log(`Processing retry ${retryAttempt} for transaction ${transactionId}`);

      // Update retry metadata
      await this.updateRetryMetadata(transaction, retryAttempt, reason);

      // Determine retry strategy based on transaction category
      let retryResult;
      
      switch (transaction.category) {
        case 'funding':
          retryResult = await this.retryFundingTransaction(transaction);
          break;
        case 'withdrawal':
          retryResult = await this.retryWithdrawalTransaction(transaction);
          break;
        case 'transfer':
          retryResult = await this.retryTransferTransaction(transaction);
          break;
        case 'payment':
          retryResult = await this.retryPaymentTransaction(transaction);
          break;
        case 'betting':
          retryResult = await this.retryBettingTransaction(transaction);
          break;
        default:
          retryResult = await this.retryGenericTransaction(transaction);
      }

      // Handle retry result
      if (retryResult.success) {
        await this.markRetrySuccess(transaction, retryResult);
        console.log(`Retry successful for transaction ${transactionId}`);
      } else {
        await this.markRetryFailed(transaction, retryResult, retryAttempt);
        console.log(`Retry failed for transaction ${transactionId}: ${retryResult.error}`);
      }

    } catch (error) {
      console.error(`Error processing retry for transaction ${transactionId}:`, error);
      await this.markRetryFailed(transaction, { error: error.message }, retryAttempt);
    }
  }

  // Update retry metadata
  async updateRetryMetadata(transaction, retryAttempt, reason) {
    const metadata = transaction.metadata || {};
    
    metadata.retryCount = retryAttempt;
    metadata.lastRetryAt = new Date();
    metadata.retryReason = reason;
    
    if (!metadata.retryHistory) metadata.retryHistory = [];
    metadata.retryHistory.push({
      attempt: retryAttempt,
      timestamp: new Date(),
      reason: reason
    });

    await Transaction.findByIdAndUpdate(transaction._id, {
      status: 'pending',
      metadata: metadata
    });
  }

  // Retry funding transaction
  async retryFundingTransaction(transaction) {
    try {
      // Simulate gateway API call
      console.log(`Retrying funding transaction: ${transaction.reference}`);
      
      // Check if gateway reference exists
      if (!transaction.gateway?.gatewayReference) {
        return { success: false, error: 'No gateway reference found' };
      }

      // Simulate API call to payment gateway
      const gatewayResult = await this.simulateGatewayCall(
        'funding',
        transaction.gateway.gatewayReference,
        transaction.amount
      );

      if (gatewayResult.success) {
        // Update wallet balance
        await this.updateWalletBalance(
          transaction.walletId,
          transaction.amount,
          'credit'
        );

        return {
          success: true,
          gatewayResponse: gatewayResult.response,
          message: 'Funding transaction completed successfully'
        };
      } else {
        return {
          success: false,
          error: gatewayResult.error,
          gatewayResponse: gatewayResult.response
        };
      }

    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Retry withdrawal transaction
  async retryWithdrawalTransaction(transaction) {
    try {
      console.log(`Retrying withdrawal transaction: ${transaction.reference}`);

      // Check wallet balance
      const wallet = await Wallet.findById(transaction.walletId);
      if (!wallet || wallet.balance < transaction.amount) {
        return { success: false, error: 'Insufficient wallet balance' };
      }

      // Simulate bank transfer API call
      const bankResult = await this.simulateBankTransfer(
        transaction.metadata?.bankDetails,
        transaction.amount,
        transaction.reference
      );

      if (bankResult.success) {
        // Debit wallet
        await this.updateWalletBalance(
          transaction.walletId,
          transaction.amount,
          'debit'
        );

        return {
          success: true,
          bankResponse: bankResult.response,
          message: 'Withdrawal completed successfully'
        };
      } else {
        return {
          success: false,
          error: bankResult.error,
          bankResponse: bankResult.response
        };
      }

    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Retry transfer transaction
  async retryTransferTransaction(transaction) {
    try {
      console.log(`Retrying transfer transaction: ${transaction.reference}`);

      // For transfers, we need to handle both sender and receiver
      const session = await mongoose.startSession();
      
      try {
        await session.withTransaction(async () => {
          // Find related transaction
          const relatedTransaction = await Transaction.findById(
            transaction.relatedTransactionId
          ).session(session);

          if (!relatedTransaction) {
            throw new Error('Related transaction not found');
          }

          // Check sender wallet balance
          if (transaction.type === 'transfer_out') {
            const senderWallet = await Wallet.findById(transaction.walletId).session(session);
            if (!senderWallet || senderWallet.balance < transaction.amount) {
              throw new Error('Insufficient balance for transfer');
            }

            // Execute transfer
            await this.updateWalletBalance(
              transaction.walletId,
              transaction.amount,
              'debit',
              session
            );
            await this.updateWalletBalance(
              relatedTransaction.walletId,
              transaction.amount,
              'credit',
              session
            );

            // Update both transactions
            await Transaction.findByIdAndUpdate(
              transaction._id,
              { status: 'completed', completedAt: new Date() },
              { session }
            );
            await Transaction.findByIdAndUpdate(
              relatedTransaction._id,
              { status: 'completed', completedAt: new Date() },
              { session }
            );
          }
        });

        await session.endSession();
        return { success: true, message: 'Transfer completed successfully' };

      } catch (sessionError) {
        await session.abortTransaction();
        await session.endSession();
        throw sessionError;
      }

    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Retry payment transaction
  async retryPaymentTransaction(transaction) {
    try {
      console.log(`Retrying payment transaction: ${transaction.reference}`);

      // Check wallet balance
      const wallet = await Wallet.findById(transaction.walletId);
      if (!wallet || wallet.balance < transaction.amount) {
        return { success: false, error: 'Insufficient wallet balance' };
      }

      // Simulate service provider API call
      const serviceResult = await this.simulateServiceProviderCall(
        transaction.metadata?.serviceType,
        transaction.metadata?.serviceData,
        transaction.amount
      );

      if (serviceResult.success) {
        // Debit wallet
        await this.updateWalletBalance(
          transaction.walletId,
          transaction.amount,
          'debit'
        );

        return {
          success: true,
          serviceResponse: serviceResult.response,
          message: 'Payment completed successfully'
        };
      } else {
        return {
          success: false,
          error: serviceResult.error,
          serviceResponse: serviceResult.response
        };
      }

    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Retry betting transaction
  async retryBettingTransaction(transaction) {
    try {
      console.log(`Retrying betting transaction: ${transaction.reference}`);

      const bettingData = transaction.metadata?.betting;
      if (!bettingData) {
        return { success: false, error: 'No betting data found' };
      }

      // Check wallet balance
      const wallet = await Wallet.findById(transaction.walletId);
      if (!wallet || wallet.balance < transaction.amount) {
        return { success: false, error: 'Insufficient wallet balance' };
      }

      // Simulate betting provider API call
      const bettingResult = await this.simulateBettingProviderCall(
        bettingData.provider,
        bettingData.customerId,
        transaction.amount,
        transaction.reference
      );

      if (bettingResult.success) {
        // Debit wallet
        await this.updateWalletBalance(
          transaction.walletId,
          transaction.amount,
          'debit'
        );

        return {
          success: true,
          bettingResponse: bettingResult.response,
          message: `Betting transaction completed with ${bettingData.provider}`
        };
      } else {
        return {
          success: false,
          error: bettingResult.error,
          bettingResponse: bettingResult.response
        };
      }

    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Retry generic transaction
  async retryGenericTransaction(transaction) {
    try {
      console.log(`Retrying generic transaction: ${transaction.reference}`);

      // For generic transactions, just mark as completed if no specific logic
      return {
        success: true,
        message: 'Generic transaction retry completed'
      };

    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Mark retry as successful
  async markRetrySuccess(transaction, result) {
    const metadata = transaction.metadata || {};
    
    metadata.retrySuccess = true;
    metadata.retryCompletedAt = new Date();
    metadata.retryResult = result;

    if (metadata.retryHistory) {
      metadata.retryHistory[metadata.retryHistory.length - 1].status = 'success';
      metadata.retryHistory[metadata.retryHistory.length - 1].result = result;
    }

    await Transaction.findByIdAndUpdate(transaction._id, {
      status: 'completed',
      completedAt: new Date(),
      metadata: metadata
    });
  }

  // Mark retry as failed
  async markRetryFailed(transaction, result, retryAttempt) {
    const metadata = transaction.metadata || {};
    
    if (metadata.retryHistory) {
      metadata.retryHistory[metadata.retryHistory.length - 1].status = 'failed';
      metadata.retryHistory[metadata.retryHistory.length - 1].error = result.error;
    }

    // If max attempts reached, mark as permanently failed
    if (retryAttempt >= this.maxRetryAttempts) {
      metadata.retryExhausted = true;
      metadata.finalFailureReason = result.error;
      
      await Transaction.findByIdAndUpdate(transaction._id, {
        status: 'failed',
        failedAt: new Date(),
        metadata: metadata
      });
    } else {
      // Still have retries left, keep as failed for now
      await Transaction.findByIdAndUpdate(transaction._id, {
        metadata: metadata
      });
    }
  }

  // Update wallet balance
  async updateWalletBalance(walletId, amount, type, session = null) {
    const update = type === 'credit' 
      ? { $inc: { balance: amount } }
      : { $inc: { balance: -amount } };

    if (session) {
      return await Wallet.findByIdAndUpdate(walletId, update, { session });
    } else {
      return await Wallet.findByIdAndUpdate(walletId, update);
    }
  }

  // Simulation methods (replace with actual API calls)
  async simulateGatewayCall(type, reference, amount) {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Simulate 80% success rate
    const success = Math.random() > 0.2;
    
    if (success) {
      return {
        success: true,
        response: {
          status: 'successful',
          reference: reference,
          amount: amount,
          timestamp: new Date().toISOString()
        }
      };
    } else {
      return {
        success: false,
        error: 'Gateway timeout or network error',
        response: {
          status: 'failed',
          error_code: 'TIMEOUT',
          timestamp: new Date().toISOString()
        }
      };
    }
  }

  async simulateBankTransfer(bankDetails, amount, reference) {
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const success = Math.random() > 0.15;
    
    if (success) {
      return {
        success: true,
        response: {
          status: 'successful',
          bank_reference: `BNK_${Date.now()}`,
          amount: amount,
          reference: reference
        }
      };
    } else {
      return {
        success: false,
        error: 'Bank transfer failed - insufficient funds or invalid account',
        response: { status: 'failed', error_code: 'INVALID_ACCOUNT' }
      };
    }
  }

  async simulateServiceProviderCall(serviceType, serviceData, amount) {
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const success = Math.random() > 0.1;
    
    return {
      success: success,
      error: success ? null : 'Service provider temporarily unavailable',
      response: {
        status: success ? 'successful' : 'failed',
        service_type: serviceType,
        amount: amount,
        provider_reference: success ? `SVC_${Date.now()}` : null
      }
    };
  }

  async simulateBettingProviderCall(provider, customerId, amount, reference) {
    await new Promise(resolve => setTimeout(resolve, 2500));
    
    const success = Math.random() > 0.25;
    
    return {
      success: success,
      error: success ? null : `${provider} betting service error`,
      response: {
        status: success ? 'successful' : 'failed',
        provider: provider,
        customer_id: customerId,
        amount: amount,
        reference: reference,
        provider_reference: success ? `${provider}_${Date.now()}` : null
      }
    };
  }

  // Get retry queue status
  getQueueStatus() {
    return {
      queueLength: this.retryQueue.length,
      isProcessing: this.isProcessing,
      pendingRetries: this.retryQueue.map(item => ({
        transactionId: item.transactionId,
        retryAttempt: item.retryAttempt,
        nextRetryAt: item.nextRetryAt,
        queuedAt: item.queuedAt
      }))
    };
  }

  // Clear retry queue (for testing/maintenance)
  clearQueue() {
    this.retryQueue = [];
    this.isProcessing = false;
    console.log('Retry queue cleared');
  }
}

// Export singleton instance
module.exports = new TransactionRetryService();