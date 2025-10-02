import React, { useState, useEffect } from 'react';

const NotificationManagement = () => {
  const [notifications, setNotifications] = useState([]);
  const [filter, setFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    total: 0,
    unread: 0,
    system: 0,
    support: 0,
    announcement: 0
  });

  // Dashboard color scheme
  const colors = {
    primary: '#ff3b30',
    primaryLight: '#ff6b6b',
    background: '#f8f9fa',
    cardBackground: '#fff',
    border: '#e2e8f0',
    textPrimary: '#1a202c',
    textSecondary: '#718096',
    textMuted: '#a0aec0',
    success: '#28a745',
    warning: '#ff8c00',
    info: '#667eea',
    hover: '#f7fafc'
  };

  // API Base URL - update this to match your server
  const API_BASE_URL = 'https://vtu-application.onrender.com';

  // Fetch notifications from API
  const fetchNotifications = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log(`Fetching notifications: filter=${filter}, type=${typeFilter}`);
      
      const response = await fetch(`${API_BASE_URL}/api/notifications?filter=${filter}&type=${typeFilter}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
          // Removed authentication for now
        }
      });
      
      console.log(`Response status: ${response.status}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Received data:', data);
      
      if (data.success) {
        setNotifications(data.data.notifications || []);
        setStats(data.data.statistics || {
          total: 0,
          unread: 0,
          system: 0,
          support: 0,
          announcement: 0
        });
        console.log(`Loaded ${data.data.notifications?.length || 0} notifications`);
      } else {
        throw new Error(data.message || 'Failed to fetch notifications');
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
      setError(`Failed to load notifications: ${error.message}`);
      setNotifications([]);
      setStats({
        total: 0,
        unread: 0,
        system: 0,
        support: 0,
        announcement: 0
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch notification statistics
  const fetchNotificationStats = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/notifications/stats/overview`, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setStats(data.data);
        }
      }
    } catch (error) {
      console.error('Error fetching notification stats:', error);
    }
  };

  // Mark notification as read
  const markAsRead = async (id) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/notifications/${id}/read`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // Update local state
          setNotifications(prev => 
            prev.map(notif => 
              notif._id === id ? { ...notif, read: true } : notif
            )
          );
          // Refresh stats
          fetchNotificationStats();
        }
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Mark all notifications as read
  const markAllAsRead = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/notifications/read-all`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // Update all notifications to read
          setNotifications(prev => 
            prev.map(notif => ({ ...notif, read: true }))
          );
          // Refresh stats
          fetchNotificationStats();
        }
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  // Delete notification
  const deleteNotification = async (id) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/notifications/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // Remove from local state
          setNotifications(prev => prev.filter(notif => notif._id !== id));
          setShowModal(false);
          // Refresh stats
          fetchNotificationStats();
        }
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  // Create test notification
  const createTestNotification = async () => {
    try {
      const testNotification = {
        title: `Test Notification ${Date.now()}`,
        message: 'This is a test notification created from the admin panel.',
        type: 'system',
        priority: 'normal',
        actionRequired: false
      };

      const response = await fetch(`${API_BASE_URL}/api/notifications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(testNotification)
      });

      if (response.ok) {
        console.log('Test notification created successfully');
        fetchNotifications(); // Refresh the list
      }
    } catch (error) {
      console.error('Error creating test notification:', error);
    }
  };

  // Handle filter changes
  useEffect(() => {
    fetchNotifications();
  }, [filter, typeFilter]);

  // Initial data fetch
  useEffect(() => {
    fetchNotifications();
    fetchNotificationStats();
    
    // Set up auto-refresh every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'system': return '⚙️';
      case 'support': return '💬';
      case 'announcement': return '📢';
      default: return '🔔';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return colors.primary;
      case 'medium': return colors.warning;
      case 'low': return colors.success;
      default: return colors.textMuted;
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'system': return colors.primary;
      case 'support': return colors.info;
      case 'announcement': return colors.success;
      default: return colors.textMuted;
    }
  };

  const formatTimeAgo = (timestamp) => {
    if (!timestamp) return 'Recently';
    
    const now = new Date();
    const notificationTime = new Date(timestamp);
    const diff = now - notificationTime;
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const NotificationItem = ({ notification }) => (
    <div
      style={{
        backgroundColor: notification.read ? colors.cardBackground : '#fff5f5',
        border: `1px solid ${notification.read ? colors.border : colors.primaryLight}`,
        borderRadius: '12px',
        padding: '16px',
        marginBottom: '12px',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        position: 'relative',
        boxShadow: notification.read ? '0 2px 4px rgba(0, 0, 0, 0.05)' : '0 2px 8px rgba(255, 59, 48, 0.1)'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = notification.read ? colors.hover : '#ffeaea';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = notification.read ? colors.cardBackground : '#fff5f5';
      }}
      onClick={() => {
        if (!notification.read) {
          markAsRead(notification._id);
        }
        setSelectedNotification(notification);
        setShowModal(true);
      }}
    >
      {!notification.read && (
        <div style={{
          position: 'absolute',
          top: '16px',
          right: '16px',
          width: '8px',
          height: '8px',
          backgroundColor: colors.primary,
          borderRadius: '50%'
        }} />
      )}

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        <div style={{
          fontSize: '20px',
          width: '40px',
          height: '40px',
          backgroundColor: notification.read ? colors.hover : getTypeColor(notification.type) + '15',
          borderRadius: '10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          border: `1px solid ${notification.read ? colors.border : getTypeColor(notification.type) + '30'}`
        }}>
          {getNotificationIcon(notification.type)}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
            <h3 style={{ 
              fontSize: '14px', 
              fontWeight: '600', 
              color: colors.textPrimary, 
              margin: 0,
              flex: 1
            }}>
              {notification.title}
            </h3>
            {notification.priority && (
              <span style={{
                fontSize: '10px',
                fontWeight: '600',
                color: '#fff',
                backgroundColor: getPriorityColor(notification.priority),
                padding: '2px 6px',
                borderRadius: '8px',
                textTransform: 'uppercase'
              }}>
                {notification.priority}
              </span>
            )}
            <span style={{
              fontSize: '10px',
              fontWeight: '600',
              color: '#fff',
              backgroundColor: getTypeColor(notification.type),
              padding: '2px 6px',
              borderRadius: '8px',
              textTransform: 'uppercase'
            }}>
              {notification.type}
            </span>
          </div>

          <p style={{ 
            fontSize: '13px', 
            color: colors.textSecondary, 
            margin: '0 0 8px 0',
            lineHeight: '1.4'
          }}>
            {notification.message}
          </p>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
            <span style={{ fontSize: '11px', color: colors.textMuted }}>
              {formatTimeAgo(notification.createdAt)}
            </span>
            
            {notification.actionRequired && (
              <span style={{ 
                fontSize: '11px', 
                color: colors.primary, 
                fontWeight: '600',
                backgroundColor: '#ff3b3015',
                padding: '2px 8px',
                borderRadius: '6px'
              }}>
                {notification.actionLabel || 'Action Required'}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ width: '100%', maxWidth: '100%' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '24px',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '700', color: colors.textPrimary, margin: 0 }}>
            Notifications
          </h1>
          <p style={{ fontSize: '14px', color: colors.textSecondary, margin: '4px 0 0 0' }}>
            Manage system alerts, customer support, and announcements
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button
            onClick={createTestNotification}
            style={{
              padding: '10px 16px',
              backgroundColor: colors.success,
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
          >
            Create Test
          </button>
          
          <button
            onClick={markAllAsRead}
            disabled={stats.unread === 0}
            style={{
              padding: '10px 16px',
              backgroundColor: stats.unread === 0 ? colors.hover : colors.primary,
              color: stats.unread === 0 ? colors.textMuted : '#fff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: stats.unread === 0 ? 'not-allowed' : 'pointer',
              opacity: stats.unread === 0 ? 0.6 : 1,
              transition: 'all 0.3s ease'
            }}
          >
            Mark All Read
          </button>
          
          <button
            onClick={fetchNotifications}
            style={{
              padding: '10px 16px',
              backgroundColor: colors.hover,
              color: colors.textSecondary,
              border: `1px solid ${colors.border}`,
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Connection Status */}
      {error && (
        <div style={{
          backgroundColor: '#fee',
          border: '1px solid #fcc',
          borderRadius: '8px',
          padding: '12px',
          marginBottom: '16px'
        }}>
          <p style={{ color: '#c44', margin: 0, fontSize: '14px' }}>
            {error}
          </p>
          <p style={{ color: '#866', margin: '4px 0 0 0', fontSize: '12px' }}>
            API URL: {API_BASE_URL}/api/notifications
          </p>
        </div>
      )}

      {/* Statistics Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
        marginBottom: '24px'
      }}>
        {[
          { label: 'Total Notifications', value: stats.total, icon: '🔔', color: colors.info },
          { label: 'Unread', value: stats.unread, icon: '📥', color: colors.primary },
          { label: 'System Alerts', value: stats.system, icon: '⚙️', color: colors.warning },
          { label: 'Support Tickets', value: stats.support, icon: '💬', color: colors.success },
          { label: 'Announcements', value: stats.announcement, icon: '📢', color: colors.info }
        ].map((stat, index) => (
          <div key={index} style={{
            backgroundColor: colors.cardBackground,
            padding: '16px',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
            border: `1px solid ${colors.border}`,
            transition: 'transform 0.2s ease'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ fontSize: '14px', color: colors.textSecondary, margin: '0 0 4px 0' }}>
                  {stat.label}
                </p>
                <p style={{ fontSize: '24px', fontWeight: '700', color: stat.color, margin: 0 }}>
                  {stat.value}
                </p>
              </div>
              <div style={{ 
                fontSize: '24px',
                width: '48px',
                height: '48px',
                backgroundColor: stat.color + '15',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: `1px solid ${stat.color}30`
              }}>{stat.icon}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{
        backgroundColor: colors.cardBackground,
        padding: '16px',
        borderRadius: '12px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        border: `1px solid ${colors.border}`,
        marginBottom: '24px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <label style={{ fontSize: '14px', fontWeight: '600', color: colors.textPrimary }}>
            Filter by:
          </label>
          
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            style={{
              padding: '8px 12px',
              border: `1px solid ${colors.border}`,
              borderRadius: '6px',
              fontSize: '14px',
              backgroundColor: colors.hover,
              color: colors.textPrimary,
              outline: 'none'
            }}
          >
            <option value="all">All Notifications</option>
            <option value="unread">Unread Only</option>
            <option value="read">Read Only</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            style={{
              padding: '8px 12px',
              border: `1px solid ${colors.border}`,
              borderRadius: '6px',
              fontSize: '14px',
              backgroundColor: colors.hover,
              color: colors.textPrimary,
              outline: 'none'
            }}
          >
            <option value="all">All Types</option>
            <option value="system">System Alerts</option>
            <option value="support">Customer Support</option>
            <option value="announcement">Announcements</option>
          </select>

          <span style={{ fontSize: '12px', color: colors.textMuted, marginLeft: 'auto' }}>
            Showing {notifications.length} notifications
          </span>
        </div>
      </div>

      {/* Notifications List */}
      <div style={{
        backgroundColor: colors.cardBackground,
        padding: '16px',
        borderRadius: '12px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        border: `1px solid ${colors.border}`,
        minHeight: '400px'
      }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <div style={{ fontSize: '32px', marginBottom: '16px' }}>⏳</div>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>Loading notifications...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.5 }}>🔔</div>
            <h3 style={{ color: colors.textPrimary, fontSize: '16px', marginBottom: '8px' }}>
              No notifications found
            </h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              {filter !== 'all' || typeFilter !== 'all' 
                ? 'Try changing your filters to see more notifications' 
                : 'All caught up! You have no notifications at the moment.'
              }
            </p>
            <button
              onClick={createTestNotification}
              style={{
                marginTop: '16px',
                padding: '8px 16px',
                backgroundColor: colors.primary,
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                cursor: 'pointer'
              }}
            >
              Create Test Notification
            </button>
          </div>
        ) : (
          <div>
            {notifications.map(notification => (
              <NotificationItem key={notification._id} notification={notification} />
            ))}
          </div>
        )}
      </div>

      {/* Notification Detail Modal */}
      {showModal && selectedNotification && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: colors.cardBackground,
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '500px',
            width: '100%',
            maxHeight: '90vh',
            overflow: 'auto',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{
                fontSize: '24px',
                width: '48px',
                height: '48px',
                backgroundColor: getTypeColor(selectedNotification.type) + '15',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: `1px solid ${getTypeColor(selectedNotification.type)}30`
              }}>
                {getNotificationIcon(selectedNotification.type)}
              </div>
              <div style={{ flex: 1 }}>
                <h2 style={{ fontSize: '18px', fontWeight: '700', color: colors.textPrimary, margin: 0 }}>
                  {selectedNotification.title}
                </h2>
                <p style={{ fontSize: '12px', color: colors.textMuted, margin: '4px 0 0 0' }}>
                  {formatTimeAgo(selectedNotification.createdAt)}
                </p>
              </div>
            </div>

            <div style={{ 
              marginBottom: '20px',
              padding: '12px',
              backgroundColor: colors.hover,
              borderRadius: '8px'
            }}>
              <p style={{ fontSize: '14px', color: colors.textSecondary, lineHeight: '1.5', margin: 0 }}>
                {selectedNotification.message}
              </p>
            </div>

            {/* Show metadata if available */}
            {selectedNotification.metadata && Object.keys(selectedNotification.metadata).length > 0 && (
              <div style={{ 
                marginBottom: '20px',
                padding: '12px',
                backgroundColor: '#f0f8ff',
                borderRadius: '8px',
                border: '1px solid #cce7ff'
              }}>
                <h4 style={{ fontSize: '12px', margin: '0 0 8px 0', color: colors.textSecondary }}>
                  Additional Details:
                </h4>
                {Object.entries(selectedNotification.metadata).map(([key, value]) => (
                  <p key={key} style={{ fontSize: '12px', margin: '2px 0', color: colors.textSecondary }}>
                    <strong>{key}:</strong> {String(value)}
                  </p>
                ))}
              </div>
            )}

            <div style={{ 
              display: 'flex', 
              gap: '12px', 
              justifyContent: 'flex-end',
              borderTop: `1px solid ${colors.border}`,
              paddingTop: '16px',
              flexWrap: 'wrap'
            }}>
              <button
                onClick={() => deleteNotification(selectedNotification._id)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: 'transparent',
                  color: colors.primary,
                  border: `1px solid ${colors.primary}`,
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
              >
                Delete
              </button>
              
             {selectedNotification.actionRequired && (
  <button
    onClick={() => {
      console.log('Button clicked!');
      console.log('Selected notification:', selectedNotification);
      
      if (selectedNotification.actionUrl) {
        // Extract ticket ID from URL like /admin/support/tickets/TKT-123
        const ticketId = selectedNotification.actionUrl.split('/').pop();
        console.log('Extracted ticket ID:', ticketId);
        
        // Create and dispatch a custom event that the AdminDashboard can listen to
        const event = new CustomEvent('showTicket', { 
          detail: { ticketId: ticketId }
        });
        console.log('Dispatching event:', event);
        window.dispatchEvent(event);
        
        console.log('Event dispatched successfully');
      } else {
        console.log('No actionUrl found');
        alert(`Action triggered for: ${selectedNotification.title}`);
      }
      
      console.log('Closing modal...');
      setShowModal(false);
    }}
    style={{
      padding: '8px 16px',
      backgroundColor: colors.primary,
      color: '#fff',
      border: 'none',
      borderRadius: '6px',
      fontSize: '14px',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.3s ease'
    }}
  >
    {selectedNotification.actionLabel || 'View Ticket'}
  </button>
)}
              
              <button
                onClick={() => setShowModal(false)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: colors.hover,
                  color: colors.textSecondary,
                  border: `1px solid ${colors.border}`,
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationManagement;