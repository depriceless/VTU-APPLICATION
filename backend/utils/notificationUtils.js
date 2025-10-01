const Notification = require('../models/Notification');

class NotificationUtils {
  // Create system notification
  static async createSystemNotification({
    title,
    message,
    priority = 'medium',
    recipient,
    actionRequired = false,
    actionLabel = '',
    actionUrl = '',
    relatedEntity = {}
  }) {
    try {
      const notification = new Notification({
        type: 'system',
        title,
        message,
        priority,
        recipient,
        actionRequired,
        actionLabel,
        actionUrl,
        relatedEntity
      });
      
      await notification.save();
      return notification;
    } catch (error) {
      console.error('Error creating system notification:', error);
      throw error;
    }
  }

  // Create support notification
  static async createSupportNotification({
    title,
    message,
    priority = 'medium',
    recipient,
    ticketId,
    actionRequired = true,
    actionLabel = 'View Ticket',
    actionUrl = `/support/tickets/${ticketId}`
  }) {
    try {
      const notification = new Notification({
        type: 'support',
        title,
        message,
        priority,
        recipient,
        actionRequired,
        actionLabel,
        actionUrl,
        relatedEntity: {
          type: 'ticket',
          id: ticketId
        }
      });
      
      await notification.save();
      return notification;
    } catch (error) {
      console.error('Error creating support notification:', error);
      throw error;
    }
  }

  // Create announcement
  static async createAnnouncement({
    title,
    message,
    priority = 'low',
    recipients, // Array of admin IDs
    actionRequired = false
  }) {
    try {
      const notifications = recipients.map(recipient => ({
        type: 'announcement',
        title,
        message,
        priority,
        recipient,
        actionRequired
      }));
      
      await Notification.insertMany(notifications);
      return notifications;
    } catch (error) {
      console.error('Error creating announcements:', error);
      throw error;
    }
  }

  // Get unread count for admin
  static async getUnreadCount(adminId) {
    try {
      return await Notification.countDocuments({
        recipient: adminId,
        read: false
      });
    } catch (error) {
      console.error('Error getting unread count:', error);
      return 0;
    }
  }
}

module.exports = NotificationUtils;