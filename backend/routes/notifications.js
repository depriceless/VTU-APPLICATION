const express = require('express');
const router = express.Router();
const notificationManager = require('./notificationManager');

console.log('Notifications route file loaded successfully');

// @desc    Get all notifications with filtering
// @route   GET /api/notifications
// @access  Admin
router.get('/', async (req, res) => {
  try {
    const { filter = 'all', type = 'all', page = 1, limit = 50 } = req.query;
    
    console.log(`Fetching notifications - Filter: ${filter}, Type: ${type}`);
    
    const result = notificationManager.getNotifications(filter, type, page, limit);
    const stats = notificationManager.getStats();
    
    console.log(`Returning ${result.notifications.length} notifications (${result.total} total after filtering)`);
    
    res.json({
      success: true,
      data: {
        notifications: result.notifications,
        statistics: stats,
        pagination: result.pagination
      }
    });
    
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching notifications',
      error: process.env.NODE_ENV === 'production' ? undefined : error.message
    });
  }
});

// @desc    Create new notification
// @route   POST /api/notifications
// @access  Admin/System
router.post('/', async (req, res) => {
  try {
    console.log('Creating new notification:', req.body);
    
    const {
      title,
      message,
      type,
      priority,
      actionRequired,
      actionLabel,
      actionUrl,
      metadata,
      expiresAt
    } = req.body;
    
    // Validate required fields
    if (!title || !message) {
      console.log('Validation failed: Missing required fields');
      return res.status(400).json({
        success: false,
        message: 'Title and message are required'
      });
    }
    
    // Validate type
    const validTypes = ['system', 'support', 'announcement'];
    if (type && !validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid notification type. Must be: system, support, or announcement'
      });
    }
    
    // Validate priority
    const validPriorities = ['low', 'medium', 'high'];
    if (priority && !validPriorities.includes(priority)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid priority. Must be: low, medium, or high'
      });
    }
    
    const notification = notificationManager.createNotification({
      title,
      message,
      type,
      priority,
      actionRequired,
      actionLabel,
      actionUrl,
      metadata,
      expiresAt
    });
    
    res.status(201).json({
      success: true,
      data: notification,
      message: 'Notification created successfully'
    });
    
  } catch (error) {
    console.error('Error creating notification:', error);
    res.status(500).json({
      success: false,
      message: 'Server error creating notification',
      error: process.env.NODE_ENV === 'production' ? undefined : error.message
    });
  }
});

// @desc    Mark notification as read
// @route   PUT /api/notifications/:id/read
// @access  Admin
router.put('/:id/read', async (req, res) => {
  try {
    const { id } = req.params;
    
    const notification = notificationManager.markAsRead(id);
    
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }
    
    res.json({
      success: true,
      data: notification,
      message: 'Notification marked as read'
    });
    
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating notification',
      error: process.env.NODE_ENV === 'production' ? undefined : error.message
    });
  }
});

// @desc    Mark all notifications as read
// @route   PUT /api/notifications/read-all
// @access  Admin
router.put('/read-all', async (req, res) => {
  try {
    const updatedCount = notificationManager.markAllAsRead();
    
    res.json({
      success: true,
      data: { updatedCount },
      message: `Marked ${updatedCount} notifications as read`
    });
    
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating notifications',
      error: process.env.NODE_ENV === 'production' ? undefined : error.message
    });
  }
});

// @desc    Delete notification
// @route   DELETE /api/notifications/:id
// @access  Admin
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const deletedNotification = notificationManager.deleteNotification(id);
    
    if (!deletedNotification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }
    
    res.json({
      success: true,
      data: deletedNotification,
      message: 'Notification deleted successfully'
    });
    
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({
      success: false,
      message: 'Server error deleting notification',
      error: process.env.NODE_ENV === 'production' ? undefined : error.message
    });
  }
});

// @desc    Get notification statistics
// @route   GET /api/notifications/stats/overview
// @access  Admin
router.get('/stats/overview', async (req, res) => {
  try {
    const stats = notificationManager.getStats();
    
    res.json({
      success: true,
      data: stats
    });
    
  } catch (error) {
    console.error('Error fetching notification statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching statistics',
      error: process.env.NODE_ENV === 'production' ? undefined : error.message
    });
  }
});

// Health check endpoint
router.get('/health', (req, res) => {
  const stats = notificationManager.getStats();
  res.json({
    success: true,
    message: 'Notifications API is healthy',
    data: {
      totalNotifications: stats.total,
      timestamp: new Date().toISOString()
    }
  });
});

// Debug endpoints for development
if (process.env.NODE_ENV !== 'production') {
  // Create test notifications (debug)
  router.post('/debug/create-test', (req, res) => {
    const testNotifications = [
      {
        title: 'New Support Ticket',
        message: 'A customer has submitted a support ticket regarding login issues.',
        type: 'support',
        priority: 'high',
        actionRequired: true,
        actionLabel: 'View Ticket',
        actionUrl: '/admin/support/tickets/123'
      },
      {
        title: 'System Update',
        message: 'Server maintenance completed successfully. All systems are operational.',
        type: 'system',
        priority: 'medium'
      },
      {
        title: 'New Announcement',
        message: 'New payment gateway has been integrated. Users can now pay with more options.',
        type: 'announcement',
        priority: 'low'
      }
    ];
    
    const created = testNotifications.map(notif => notificationManager.createNotification(notif));
    
    res.json({
      success: true,
      data: created,
      message: `Created ${created.length} test notifications`
    });
  });
  
  // Get all notifications (debug)
  router.get('/debug/all', (req, res) => {
    res.json({
      success: true,
      data: notificationManager.notifications,
      count: notificationManager.notifications.length,
      message: 'All notifications (debug endpoint)'
    });
  });
  
  // Clear all notifications (debug)
  router.delete('/debug/clear', (req, res) => {
    const count = notificationManager.notifications.length;
    notificationManager.notifications = [];
    notificationManager.notificationCounter = 1;
    notificationManager.saveNotifications();
    res.json({
      success: true,
      message: `Cleared ${count} notifications`,
      data: { cleared: count }
    });
  });
}

console.log('Notifications route setup complete');

module.exports = router;