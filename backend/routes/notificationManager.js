const fs = require('fs');
const path = require('path');

// File to store notifications persistently
const NOTIFICATIONS_FILE = path.join(__dirname, '../notifications.json');

class NotificationManager {
  constructor() {
    this.notifications = [];
    this.notificationCounter = 1;
    this.loadNotifications();
  }

  // Load notifications from file
  loadNotifications() {
    try {
      if (fs.existsSync(NOTIFICATIONS_FILE)) {
        const data = fs.readFileSync(NOTIFICATIONS_FILE, 'utf8');
        this.notifications = JSON.parse(data);
        console.log(`Loaded ${this.notifications.length} existing notifications from storage`);
        
        // Set counter to avoid duplicate IDs
        if (this.notifications.length > 0) {
          const maxCounter = Math.max(...this.notifications.map(n => {
            const match = n._id.match(/notif_\d+_(\d+)/);
            return match ? parseInt(match[1]) : 0;
          }));
          this.notificationCounter = maxCounter + 1;
        }
      } else {
        console.log('No existing notifications file found, starting fresh');
      }
    } catch (error) {
      console.log('Error loading notifications, starting fresh:', error.message);
      this.notifications = [];
    }
  }

  // Save notifications to file
  saveNotifications() {
    try {
      fs.writeFileSync(NOTIFICATIONS_FILE, JSON.stringify(this.notifications, null, 2));
      console.log(`Saved ${this.notifications.length} notifications to storage`);
    } catch (error) {
      console.error('Error saving notifications:', error);
    }
  }

  // Create notification
  createNotification(notificationData) {
    const notification = {
      _id: `notif_${Date.now()}_${this.notificationCounter++}`,
      title: notificationData.title,
      message: notificationData.message,
      type: notificationData.type || 'system',
      priority: notificationData.priority || 'medium',
      read: false,
      readAt: null,
      actionRequired: notificationData.actionRequired || false,
      actionLabel: notificationData.actionLabel || '',
      actionUrl: notificationData.actionUrl || '',
      metadata: notificationData.metadata || {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      expiresAt: notificationData.expiresAt || null
    };

    this.notifications.unshift(notification);
    this.saveNotifications();
    
    console.log(`Notification created and saved: ${notification.title} (ID: ${notification._id})`);
    return notification;
  }

  // Get all notifications with filtering
  getNotifications(filter = 'all', type = 'all', page = 1, limit = 50) {
    let filteredNotifications = [...this.notifications];
    
    // Filter by read status
    if (filter === 'unread') {
      filteredNotifications = filteredNotifications.filter(notif => !notif.read);
    } else if (filter === 'read') {
      filteredNotifications = filteredNotifications.filter(notif => notif.read);
    }
    
    // Filter by type
    if (type !== 'all') {
      filteredNotifications = filteredNotifications.filter(notif => notif.type === type);
    }
    
    // Remove expired notifications
    const now = new Date();
    filteredNotifications = filteredNotifications.filter(notif => 
      !notif.expiresAt || new Date(notif.expiresAt) > now
    );
    
    // Sort by creation date (newest first)
    filteredNotifications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    // Pagination
    const startIndex = (parseInt(page) - 1) * parseInt(limit);
    const endIndex = startIndex + parseInt(limit);
    const paginatedNotifications = filteredNotifications.slice(startIndex, endIndex);
    
    return {
      notifications: paginatedNotifications,
      total: filteredNotifications.length,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(filteredNotifications.length / parseInt(limit)),
        totalItems: filteredNotifications.length,
        hasNext: endIndex < filteredNotifications.length,
        hasPrev: startIndex > 0
      }
    };
  }

  // Get notification statistics
  getStats() {
    return {
      total: this.notifications.length,
      unread: this.notifications.filter(n => !n.read).length,
      system: this.notifications.filter(n => n.type === 'system').length,
      support: this.notifications.filter(n => n.type === 'support').length,
      announcement: this.notifications.filter(n => n.type === 'announcement').length,
      high: this.notifications.filter(n => n.priority === 'high').length,
      medium: this.notifications.filter(n => n.priority === 'medium').length,
      low: this.notifications.filter(n => n.priority === 'low').length
    };
  }

  // Mark notification as read
  markAsRead(id) {
    const notificationIndex = this.notifications.findIndex(n => n._id === id);
    
    if (notificationIndex === -1) {
      return null;
    }
    
    this.notifications[notificationIndex].read = true;
    this.notifications[notificationIndex].readAt = new Date().toISOString();
    this.notifications[notificationIndex].updatedAt = new Date().toISOString();
    
    this.saveNotifications();
    console.log(`Notification marked as read: ${this.notifications[notificationIndex].title}`);
    
    return this.notifications[notificationIndex];
  }

  // Mark all as read
  markAllAsRead() {
    const now = new Date().toISOString();
    let updatedCount = 0;
    
    this.notifications.forEach(notification => {
      if (!notification.read) {
        notification.read = true;
        notification.readAt = now;
        notification.updatedAt = now;
        updatedCount++;
      }
    });
    
    if (updatedCount > 0) {
      this.saveNotifications();
    }
    
    console.log(`Marked ${updatedCount} notifications as read`);
    return updatedCount;
  }

  // Delete notification
  deleteNotification(id) {
    const notificationIndex = this.notifications.findIndex(n => n._id === id);
    
    if (notificationIndex === -1) {
      return null;
    }
    
    const deletedNotification = this.notifications.splice(notificationIndex, 1)[0];
    this.saveNotifications();
    
    console.log(`Notification deleted: ${deletedNotification.title}`);
    return deletedNotification;
  }

  // Find notification by ID
  findById(id) {
    return this.notifications.find(n => n._id === id);
  }
}

// Create singleton instance
const notificationManager = new NotificationManager();

module.exports = notificationManager;