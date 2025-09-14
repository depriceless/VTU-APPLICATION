// routes/adminBulkOperations.js
const express = require('express');
const router = express.Router();
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const adminAuth = require('../middleware/adminAuth');
const mongoose = require('mongoose');

// POST /api/admin/bulk/transactions/export - Export selected transactions
router.post('/transactions/export', adminAuth, async (req, res) => {
  try {
    const { transactionIds, format = 'csv', filters } = req.body;

    console.log(`📤 Admin ${req.admin.name} exporting transactions:`, {
      count: transactionIds?.length,
      format,
      hasFilters: !!filters
    });

    let query = {};

    // Use specific transaction IDs if provided
    if (transactionIds && transactionIds.length > 0) {
      // Validate ObjectIds
      const validIds = transactionIds.filter(id => mongoose.Types.ObjectId.isValid(id));
      if (validIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No valid transaction IDs provided'
        });
      }
      query._id = { $in: validIds };
    } else if (filters) {
      // Apply filters if no specific IDs provided
      if (filters.status && filters.status !== 'all') query.status = filters.status;
      if (filters.type && filters.type !== 'all') query.type = filters.type;
      if (filters.category && filters.category !== 'all') query.category = filters.category;
      
      if (filters.dateFrom || filters.dateTo) {
        query.createdAt = {};
        if (filters.dateFrom) query.createdAt.$gte = new Date(filters.dateFrom);
        if (filters.dateTo) {
          const endDate = new Date(filters.dateTo);
          endDate.setHours(23, 59, 59, 999);
          query.createdAt.$lte = endDate;
        }
      }
    }

    // Fetch transactions
    const transactions = await Transaction.find(query)
      .populate('userId', 'name email phone username')
      .populate('walletId', 'balance')
      .sort({ createdAt: -1 })
      .lean();

    if (transactions.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No transactions found for export'
      });
    }

    // Prepare export data
    const exportData = transactions.map(transaction => ({
      'Transaction ID': transaction._id.toString(),
      'Reference': transaction.reference,
      'User ID': transaction.userId?._id?.toString() || transaction.userId?.toString() || 'N/A',
      'User Name': transaction.userId?.name || 'Unknown User',
      'User Email': transaction.userId?.email || 'N/A',
      'User Phone': transaction.userId?.phone || 'N/A',
      'Wallet ID': transaction.walletId?._id?.toString() || transaction.walletId?.toString() || 'N/A',
      'Type': transaction.type,
      'Category': transaction.category,
      'Amount': transaction.amount,
      'Previous Balance': transaction.previousBalance,
      'New Balance': transaction.newBalance,
      'Status': transaction.status,
      'Description': transaction.description || '',
      'Gateway Provider': transaction.gateway?.provider || '',
      'Gateway Reference': transaction.gateway?.gatewayReference || '',
      'Failure Reason': transaction.metadata?.failureReason || '',
      'Created At': new Date(transaction.createdAt).toLocaleString(),
      'Updated At': new Date(transaction.updatedAt).toLocaleString(),
      'Processed At': transaction.processedAt ? new Date(transaction.processedAt).toLocaleString() : '',
      'Completed At': transaction.completedAt ? new Date(transaction.completedAt).toLocaleString() : '',
      'Failed At': transaction.failedAt ? new Date(transaction.failedAt).toLocaleString() : ''
    }));

    // Generate CSV format
    if (format === 'csv') {
      const headers = Object.keys(exportData[0]);
      const csvContent = [
        headers.join(','),
        ...exportData.map(row => 
          headers.map(header => {
            const value = row[header] || '';
            // Escape commas and quotes in CSV
            return typeof value === 'string' && (value.includes(',') || value.includes('"'))
              ? `"${value.replace(/"/g, '""')}"` 
              : value;
          }).join(',')
        )
      ].join('\n');

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `transactions_export_${timestamp}.csv`;

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      
      console.log(`✅ Exported ${transactions.length} transactions as CSV`);
      return res.send(csvContent);
    }

    // Return JSON format for other processing
    res.json({
      success: true,
      data: exportData,
      count: exportData.length,
      exportedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Bulk export error:', error);
    res.status(500).json({
      success: false,
      message: 'Error exporting transactions',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// PUT /api/admin/bulk/transactions/status - Bulk status update
router.put('/transactions/status', adminAuth, async (req, res) => {
  try {
    const { transactionIds, status, reason } = req.body;

    if (!transactionIds || !Array.isArray(transactionIds) || transactionIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Transaction IDs array is required'
      });
    }

    const validStatuses = ['pending', 'completed', 'failed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    console.log(`📝 Admin ${req.admin.name} bulk updating ${transactionIds.length} transactions to ${status}`);

    // Validate ObjectIds
    const validIds = transactionIds.filter(id => mongoose.Types.ObjectId.isValid(id));
    if (validIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid transaction IDs provided'
      });
    }

    // Fetch transactions to update
    const transactions = await Transaction.find({ _id: { $in: validIds } });
    
    if (transactions.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No transactions found with provided IDs'
      });
    }

    // Prepare bulk update operations
    const bulkOps = transactions.map(transaction => {
      const updateData = { status };
      const metadata = transaction.metadata || {};

      // Add timestamp based on status
      if (status === 'completed') {
        updateData.completedAt = new Date();
      } else if (status === 'failed') {
        updateData.failedAt = new Date();
        if (reason) metadata.failureReason = reason;
      } else if (status === 'cancelled') {
        if (reason) metadata.cancellationReason = reason;
      }

      // Add admin action log
      if (!metadata.adminActions) metadata.adminActions = [];
      metadata.adminActions.push({
        action: 'bulk_status_change',
        from: transaction.status,
        to: status,
        reason: reason || 'Bulk operation - no reason provided',
        adminId: req.admin._id,
        adminName: req.admin.name,
        timestamp: new Date()
      });

      updateData.metadata = metadata;

      return {
        updateOne: {
          filter: { _id: transaction._id },
          update: updateData
        }
      };
    });

    // Execute bulk update
    const bulkResult = await Transaction.bulkWrite(bulkOps);

    console.log(`✅ Bulk updated ${bulkResult.modifiedCount} transactions to ${status}`);

    res.json({
      success: true,
      message: `Successfully updated ${bulkResult.modifiedCount} transactions to ${status}`,
      updated: bulkResult.modifiedCount,
      matched: bulkResult.matchedCount,
      details: {
        requested: transactionIds.length,
        validIds: validIds.length,
        found: transactions.length,
        updated: bulkResult.modifiedCount
      }
    });

  } catch (error) {
    console.error('❌ Bulk status update error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating transaction status',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// DELETE /api/admin/bulk/transactions/delete - Bulk delete transactions
// Replace the entire DELETE /api/admin/bulk/transactions/delete route with this:
router.delete('/transactions/delete', adminAuth, async (req, res) => {
  try {
    const { transactionIds, reason } = req.body;
    
    console.log('=== HARD DELETE ATTEMPT ===');
    console.log('Transaction IDs:', transactionIds);
    
    if (!transactionIds || !Array.isArray(transactionIds) || transactionIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Transaction IDs array is required'
      });
    }

    // Validate ObjectIds
    const validIds = transactionIds.filter(id => mongoose.Types.ObjectId.isValid(id));
    console.log('Valid IDs:', validIds);
    
    if (validIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid transaction IDs provided'
      });
    }

    // HARD DELETE - Permanently remove from database
    console.log('Executing deleteMany...');
    const deleteResult = await Transaction.deleteMany({ _id: { $in: validIds } });
    
    console.log('Delete result:', deleteResult);
    console.log(`HARD DELETED ${deleteResult.deletedCount} transactions`);

    res.json({
      success: true,
      message: `Permanently deleted ${deleteResult.deletedCount} transactions`,
      deleted: deleteResult.deletedCount
    });

  } catch (error) {
    console.error('Hard delete error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting transactions: ' + error.message
    });
  }
});

// POST /api/admin/bulk/transactions/retry - Bulk retry failed transactions
router.post('/transactions/retry', adminAuth, async (req, res) => {
  try {
    const { transactionIds } = req.body;

    if (!transactionIds || !Array.isArray(transactionIds) || transactionIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Transaction IDs array is required'
      });
    }

    console.log(`🔄 Admin ${req.admin.name} bulk retrying ${transactionIds.length} transactions`);

    // Validate ObjectIds
    const validIds = transactionIds.filter(id => mongoose.Types.ObjectId.isValid(id));
    if (validIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid transaction IDs provided'
      });
    }

    // Find failed transactions only
    const failedTransactions = await Transaction.find({
      _id: { $in: validIds },
      status: 'failed'
    });

    if (failedTransactions.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No failed transactions found with provided IDs'
      });
    }

    // Prepare retry operations
    const retryResults = {
      success: 0,
      failed: 0,
      details: []
    };

    for (const transaction of failedTransactions) {
      try {
        // Check retry eligibility
        const retryCount = transaction.metadata?.retryCount || 0;
        if (retryCount >= 3) {
          retryResults.failed++;
          retryResults.details.push({
            id: transaction._id,
            reference: transaction.reference,
            status: 'max_retries_reached',
            message: 'Maximum retry attempts reached'
          });
          continue;
        }

        // Update transaction for retry
        const metadata = transaction.metadata || {};
        metadata.retryCount = retryCount + 1;
        metadata.lastRetryAt = new Date();
        metadata.retryInitiatedBy = {
          adminId: req.admin._id,
          adminName: req.admin.name,
          timestamp: new Date()
        };

        // Add admin action log
        if (!metadata.adminActions) metadata.adminActions = [];
        metadata.adminActions.push({
          action: 'retry_transaction',
          retryAttempt: metadata.retryCount,
          adminId: req.admin._id,
          adminName: req.admin.name,
          timestamp: new Date()
        });

        await Transaction.findByIdAndUpdate(transaction._id, {
          status: 'pending',
          metadata: metadata,
          failedAt: null // Clear failed timestamp
        });

        retryResults.success++;
        retryResults.details.push({
          id: transaction._id,
          reference: transaction.reference,
          status: 'retry_initiated',
          message: `Retry attempt #${metadata.retryCount} initiated`
        });

        // TODO: Here you would trigger the actual retry logic
        // This could involve:
        // - Re-queuing the transaction for processing
        // - Calling external APIs again
        // - Triggering webhook notifications

      } catch (retryError) {
        console.error(`Error retrying transaction ${transaction._id}:`, retryError);
        retryResults.failed++;
        retryResults.details.push({
          id: transaction._id,
          reference: transaction.reference,
          status: 'retry_failed',
          message: 'Error initiating retry: ' + retryError.message
        });
      }
    }

    console.log(`✅ Bulk retry completed: ${retryResults.success} success, ${retryResults.failed} failed`);

    res.json({
      success: true,
      message: `Retry initiated for ${retryResults.success} transactions`,
      results: retryResults,
      summary: {
        requested: transactionIds.length,
        validIds: validIds.length,
        eligibleForRetry: failedTransactions.length,
        retryInitiated: retryResults.success,
        retryFailed: retryResults.failed
      }
    });

  } catch (error) {
    console.error('❌ Bulk retry error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrying transactions',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// POST /api/admin/bulk/transactions/notify - Send bulk notifications
router.post('/transactions/notify', adminAuth, async (req, res) => {
  try {
    const { transactionIds, notificationType, message, template } = req.body;

    if (!transactionIds || !Array.isArray(transactionIds) || transactionIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Transaction IDs array is required'
      });
    }

    const validNotificationTypes = ['email', 'sms', 'push', 'in_app'];
    if (!validNotificationTypes.includes(notificationType)) {
      return res.status(400).json({
        success: false,
        message: `Invalid notification type. Must be one of: ${validNotificationTypes.join(', ')}`
      });
    }

    console.log(`📧 Admin ${req.admin.name} sending ${notificationType} notifications for ${transactionIds.length} transactions`);

    // Validate ObjectIds and fetch transactions with user data
    const validIds = transactionIds.filter(id => mongoose.Types.ObjectId.isValid(id));
    const transactions = await Transaction.find({
      _id: { $in: validIds }
    }).populate('userId', 'name email phone fcmToken');

    if (transactions.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No transactions found with provided IDs'
      });
    }

    // Group transactions by user to avoid duplicate notifications
    const userTransactionMap = new Map();
    transactions.forEach(transaction => {
      const userId = transaction.userId._id || transaction.userId;
      if (!userTransactionMap.has(userId.toString())) {
        userTransactionMap.set(userId.toString(), {
          user: transaction.userId,
          transactions: []
        });
      }
      userTransactionMap.get(userId.toString()).transactions.push(transaction);
    });

    const notificationResults = {
      success: 0,
      failed: 0,
      details: []
    };

    // Send notifications to each user
    for (const [userId, { user, transactions: userTransactions }] of userTransactionMap) {
      try {
        // Prepare notification content
        let notificationContent = message;
        if (template === 'transaction_update') {
          const transactionCount = userTransactions.length;
          const transactionRefs = userTransactions.map(t => t.reference).join(', ');
          notificationContent = `Your ${transactionCount} transaction(s) have been updated: ${transactionRefs}`;
        } else if (template === 'status_change') {
          notificationContent = `Transaction status has been updated by admin. Please check your transaction history.`;
        }

        // TODO: Implement actual notification sending logic
        // This would integrate with your notification service:
        // - Email service (SendGrid, AWS SES, etc.)
        // - SMS service (Twilio, etc.)
        // - Push notification service (FCM, etc.)
        
        // For now, just log the notification
        console.log(`📱 Notification to user ${user.name} (${user.email}): ${notificationContent}`);

        // Simulate notification sending
        const notificationSent = true; // Replace with actual notification logic

        if (notificationSent) {
          notificationResults.success++;
          notificationResults.details.push({
            userId: userId,
            userName: user.name,
            userEmail: user.email,
            transactionCount: userTransactions.length,
            status: 'sent',
            message: 'Notification sent successfully'
          });

          // Log notification in transaction metadata
          for (const transaction of userTransactions) {
            const metadata = transaction.metadata || {};
            if (!metadata.notifications) metadata.notifications = [];
            metadata.notifications.push({
              type: notificationType,
              message: notificationContent,
              sentBy: req.admin._id,
              sentAt: new Date(),
              status: 'sent'
            });
            
            await Transaction.findByIdAndUpdate(transaction._id, { metadata });
          }
        } else {
          throw new Error('Notification service unavailable');
        }

      } catch (notificationError) {
        console.error(`Error sending notification to user ${userId}:`, notificationError);
        notificationResults.failed++;
        notificationResults.details.push({
          userId: userId,
          userName: user?.name || 'Unknown',
          userEmail: user?.email || 'N/A',
          status: 'failed',
          message: 'Error sending notification: ' + notificationError.message
        });
      }
    }

    console.log(`✅ Bulk notifications completed: ${notificationResults.success} success, ${notificationResults.failed} failed`);

    res.json({
      success: true,
      message: `Notifications sent to ${notificationResults.success} users`,
      results: notificationResults,
      summary: {
        requestedTransactions: transactionIds.length,
        foundTransactions: transactions.length,
        uniqueUsers: userTransactionMap.size,
        notificationsSent: notificationResults.success,
        notificationsFailed: notificationResults.failed
      }
    });

  } catch (error) {
    console.error('❌ Bulk notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Error sending notifications',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;