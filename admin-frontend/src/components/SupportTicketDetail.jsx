import React, { useState, useEffect } from 'react';

const SupportTicketDetail = ({ ticketId: propTicketId, onBack }) => {
  const ticketId = propTicketId;
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [responseText, setResponseText] = useState('');
  const [submittingResponse, setSubmittingResponse] = useState(false);

  // Consistent color scheme matching dashboard
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
    hover: '#f7fafc',
    error: '#e53e3e'
  };

  // Environment-aware API configuration with better debugging
  const getApiBaseUrl = () => {
    // Check if running in React Native WebView
    const isReactNativeWebView = window.ReactNativeWebView || 
                                 window.webkit?.messageHandlers?.ReactNativeWebView ||
                                 navigator.userAgent.includes('ReactNative');
    
    // Check if running in development mode
    const isDevelopment = process.env.NODE_ENV === 'development' || 
                         window.location.hostname === 'localhost' ||
                         window.location.hostname.startsWith('192.168.');
    
    let apiUrl;
    if (isReactNativeWebView) {
      // WebView - use your computer's IP address
      apiUrl = 'http://192.168.126.7:5000';
    } else if (isDevelopment) {
      // Web development - use localhost
      apiUrl = 'http://192.168.126.7:5000';
    } else {
      // Production - use your production API
      apiUrl = 'https://your-production-api.com';
    }
    
    console.log('API Configuration:', {
      environment: isReactNativeWebView ? 'WebView' : isDevelopment ? 'Development' : 'Production',
      apiUrl: apiUrl,
      hostname: window.location.hostname
    });
    
    return apiUrl;
  };

  const API_BASE_URL = getApiBaseUrl();

  // Network connectivity test
  const testConnection = async () => {
    try {
      console.log('Testing connection to:', API_BASE_URL);
      const response = await fetch(`${API_BASE_URL}/api/health`, {
        method: 'GET',
        timeout: 5000
      });
      console.log('Connection test result:', response.status);
      return response.ok;
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      // Dispatch custom event to go back to notifications
      const event = new CustomEvent('goBackToNotifications');
      window.dispatchEvent(event);
    }
  };

  useEffect(() => {
    if (ticketId) {
      // Test connection first, then fetch ticket
      testConnection().then(isConnected => {
        if (isConnected) {
          fetchTicket();
        } else {
          setError('Cannot connect to server. Please check if your API server is running.');
          setLoading(false);
        }
      });
    }
  }, [ticketId]);

  const fetchTicket = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Fetching ticket from:', `${API_BASE_URL}/api/support/tickets/${ticketId}`);
      
      const response = await fetch(`${API_BASE_URL}/api/support/tickets/${ticketId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        // Add timeout and other options for better error handling
      });
      
      console.log('Fetch response status:', response.status);
      console.log('Fetch response ok:', response.ok);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response text:', errorText);
        throw new Error(`HTTP ${response.status}: ${errorText || 'Unknown error'}`);
      }
      
      const data = await response.json();
      console.log('Received ticket data:', data);
      
      if (data.success) {
        setTicket(data.data);
      } else {
        throw new Error(data.message || 'Failed to fetch ticket');
      }
    } catch (error) {
      console.error('Error fetching ticket:', error);
      
      // Provide more helpful error messages
      let errorMessage = 'Failed to load ticket: ';
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        errorMessage += 'Cannot connect to server. Please check:\n\n';
        errorMessage += '1. Is your API server running?\n';
        errorMessage += `2. Is it accessible at ${API_BASE_URL}?\n`;
        errorMessage += '3. Are there any CORS issues?\n';
        errorMessage += '4. Check your network connection';
      } else {
        errorMessage += error.message;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

 const updateTicketStatus = async (newStatus) => {
  try {
    console.log('Updating ticket status to:', newStatus);
    
    const response = await fetch(`${API_BASE_URL}/api/support/tickets/${ticketId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    });

    console.log('Status update response:', response.status);

    if (response.ok) {
      const data = await response.json();
      console.log('Status update data:', data);
      
      if (data.success) {
        setTicket(data.data);
        
        // Show success feedback
        const successDiv = document.createElement('div');
        successDiv.style.cssText = `
          position: fixed;
          top: 20px;
          right: 20px;
          background: #28a745;
          color: white;
          padding: 12px 16px;
          border-radius: 6px;
          z-index: 1000;
          font-size: 14px;
        `;
        successDiv.textContent = `Status updated to ${newStatus.replace('-', ' ')}`;
        document.body.appendChild(successDiv);
        
        setTimeout(() => {
          if (successDiv.parentNode) {
            document.body.removeChild(successDiv);
          }
        }, 3000);
      } else {
        throw new Error(data.message || 'Failed to update status');
      }
    } else {
      const errorData = await response.text();
      console.error('Status update error:', errorData);
      throw new Error(`HTTP ${response.status}: ${errorData}`);
    }
  } catch (error) {
    console.error('Error updating status:', error);
    
    // Show error feedback
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #e53e3e;
      color: white;
      padding: 12px 16px;
      border-radius: 6px;
      z-index: 1000;
      font-size: 14px;
    `;
    errorDiv.textContent = `Failed to update status: ${error.message}`;
    document.body.appendChild(errorDiv);
    
    setTimeout(() => {
      if (errorDiv.parentNode) {
        document.body.removeChild(errorDiv);
      }
    }, 5000);
  }
};


  const submitResponse = async () => {
  if (!responseText.trim()) return;

  try {
    setSubmittingResponse(true);
    console.log('Submitting response:', responseText);
    
    const response = await fetch(`${API_BASE_URL}/api/support/tickets/${ticketId}/responses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        message: responseText,
        adminName: 'Admin',
        isCustomerVisible: true
      })
    });

    console.log('Response status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('Response data:', data);
      
      if (data.success) {
        setTicket(data.data.ticket);
        setResponseText('');
        
        // Show success feedback
        const successDiv = document.createElement('div');
        successDiv.style.cssText = `
          position: fixed;
          top: 20px;
          right: 20px;
          background: #28a745;
          color: white;
          padding: 12px 16px;
          border-radius: 6px;
          z-index: 1000;
          font-size: 14px;
        `;
        successDiv.textContent = 'Response sent successfully!';
        document.body.appendChild(successDiv);
        
        setTimeout(() => {
          if (successDiv.parentNode) {
            document.body.removeChild(successDiv);
          }
        }, 3000);
      } else {
        throw new Error(data.message || 'Failed to send response');
      }
    } else {
      const errorData = await response.text();
      console.error('Error response:', errorData);
      throw new Error(`HTTP ${response.status}: ${errorData}`);
    }
  } catch (error) {
    console.error('Error sending response:', error);
    
    // Show error feedback
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #e53e3e;
      color: white;
      padding: 12px 16px;
      border-radius: 6px;
      z-index: 1000;
      font-size: 14px;
    `;
    errorDiv.textContent = `Failed to send response: ${error.message}`;
    document.body.appendChild(errorDiv);
    
    setTimeout(() => {
      if (errorDiv.parentNode) {
        document.body.removeChild(errorDiv);
      }
    }, 5000);
  } finally {
    setSubmittingResponse(false);
  }
};

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'open': return colors.primary;
      case 'in-progress': return colors.warning;
      case 'resolved': return colors.success;
      case 'closed': return colors.textMuted;
      default: return colors.textSecondary;
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'high': return colors.error;
      case 'medium': return colors.warning;
      case 'low': return colors.success;
      default: return colors.textSecondary;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '400px',
        flexDirection: 'column',
        gap: '16px'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: `3px solid ${colors.border}`,
          borderTop: `3px solid ${colors.primary}`,
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
        <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
          Loading ticket details...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        backgroundColor: colors.cardBackground,
        padding: '24px',
        borderRadius: '12px',
        border: `1px solid ${colors.border}`,
        textAlign: 'center'
      }}>
        <div style={{
          width: '48px',
          height: '48px',
          backgroundColor: colors.error + '15',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 16px',
          fontSize: '20px',
          color: colors.error
        }}>
          ⚠️
        </div>
        <h3 style={{ color: colors.textPrimary, marginBottom: '8px' }}>Error Loading Ticket</h3>
        <p style={{ color: colors.textSecondary, marginBottom: '16px' }}>{error}</p>
        <button
          onClick={fetchTicket}
          style={{
            padding: '8px 16px',
            backgroundColor: colors.primary,
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer'
          }}
        >
          Try Again
        </button>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div style={{
        backgroundColor: colors.cardBackground,
        padding: '24px',
        borderRadius: '12px',
        border: `1px solid ${colors.border}`,
        textAlign: 'center'
      }}>
        <p style={{ color: colors.textSecondary }}>Ticket not found</p>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', maxWidth: '100%' }}>
      {/* Header */}
      <div style={{
        backgroundColor: colors.cardBackground,
        padding: '20px 24px',
        borderRadius: '12px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        border: `1px solid ${colors.border}`,
        marginBottom: '24px'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '16px',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <button
            onClick={handleBack}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 12px',
              backgroundColor: colors.hover,
              border: `1px solid ${colors.border}`,
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              color: colors.textSecondary,
              fontWeight: '500',
              transition: 'all 0.2s ease'
            }}
          >
            ← Back to Notifications
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{
              padding: '4px 8px',
              backgroundColor: getStatusColor(ticket.status) + '15',
              color: getStatusColor(ticket.status),
              borderRadius: '12px',
              fontSize: '12px',
              fontWeight: '600',
              textTransform: 'capitalize'
            }}>
              {ticket.status?.replace('-', ' ') || 'Unknown'}
            </span>
            
            <span style={{
              padding: '4px 8px',
              backgroundColor: getPriorityColor(ticket.priority) + '15',
              color: getPriorityColor(ticket.priority),
              borderRadius: '12px',
              fontSize: '12px',
              fontWeight: '600',
              textTransform: 'capitalize'
            }}>
              {ticket.priority || 'Normal'} Priority
            </span>
          </div>
        </div>

        <div>
          <h1 style={{
            fontSize: '24px',
            fontWeight: '700',
            color: colors.textPrimary,
            margin: '0 0 8px 0'
          }}>
            {ticket.subject || 'Support Ticket'}
          </h1>
          <p style={{
            fontSize: '16px',
            color: colors.textSecondary,
            margin: 0
          }}>
            Ticket ID: {ticket.ticketId}
          </p>
        </div>
      </div>

      {/* Main Content Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: window.innerWidth < 768 ? '1fr' : '2fr 1fr',
        gap: '24px'
      }}>
        {/* Left Column - Ticket Details */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Customer Information */}
          <div style={{
            backgroundColor: colors.cardBackground,
            padding: '20px',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
            border: `1px solid ${colors.border}`
          }}>
            <h3 style={{
              fontSize: '16px',
              fontWeight: '600',
              color: colors.textPrimary,
              margin: '0 0 16px 0'
            }}>
              Customer Information
            </h3>

            <div style={{
              display: 'grid',
              gridTemplateColumns: window.innerWidth < 768 ? '1fr' : 'repeat(2, 1fr)',
              gap: '16px'
            }}>
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: '600',
                  color: colors.textSecondary,
                  marginBottom: '4px',
                  textTransform: 'uppercase'
                }}>
                  Email Address
                </label>
                <p style={{
                  fontSize: '14px',
                  color: colors.textPrimary,
                  margin: 0,
                  fontWeight: '500'
                }}>
                  {ticket.email || 'N/A'}
                </p>
              </div>

              <div>
                <label style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: '600',
                  color: colors.textSecondary,
                  marginBottom: '4px',
                  textTransform: 'uppercase'
                }}>
                  Category
                </label>
                <p style={{
                  fontSize: '14px',
                  color: colors.textPrimary,
                  margin: 0,
                  fontWeight: '500',
                  textTransform: 'capitalize'
                }}>
                  {ticket.category || 'General'}
                </p>
              </div>

              <div>
                <label style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: '600',
                  color: colors.textSecondary,
                  marginBottom: '4px',
                  textTransform: 'uppercase'
                }}>
                  Created Date
                </label>
                <p style={{
                  fontSize: '14px',
                  color: colors.textPrimary,
                  margin: 0,
                  fontWeight: '500'
                }}>
                  {formatDate(ticket.createdAt)}
                </p>
              </div>

              <div>
                <label style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: '600',
                  color: colors.textSecondary,
                  marginBottom: '4px',
                  textTransform: 'uppercase'
                }}>
                  Last Updated
                </label>
                <p style={{
                  fontSize: '14px',
                  color: colors.textPrimary,
                  margin: 0,
                  fontWeight: '500'
                }}>
                  {formatDate(ticket.updatedAt)}
                </p>
              </div>
            </div>
          </div>

          {/* Customer Message */}
          <div style={{
            backgroundColor: colors.cardBackground,
            padding: '20px',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
            border: `1px solid ${colors.border}`
          }}>
            <h3 style={{
              fontSize: '16px',
              fontWeight: '600',
              color: colors.textPrimary,
              margin: '0 0 12px 0'
            }}>
              Customer Message
            </h3>
            
            <div style={{
              backgroundColor: colors.background,
              padding: '16px',
              borderRadius: '8px',
              border: `1px solid ${colors.border}`
            }}>
              <p style={{
                fontSize: '14px',
                color: colors.textPrimary,
                margin: 0,
                lineHeight: '1.5',
                whiteSpace: 'pre-wrap'
              }}>
                {ticket.comment || 'No message provided'}
              </p>
            </div>
          </div>

          {/* Responses */}
          {ticket.responses && ticket.responses.length > 0 && (
            <div style={{
              backgroundColor: colors.cardBackground,
              padding: '20px',
              borderRadius: '12px',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
              border: `1px solid ${colors.border}`
            }}>
              <h3 style={{
                fontSize: '16px',
                fontWeight: '600',
                color: colors.textPrimary,
                margin: '0 0 16px 0'
              }}>
                Response History
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {ticket.responses.map((response, index) => (
                  <div
                    key={index}
                    style={{
                      backgroundColor: colors.background,
                      padding: '16px',
                      borderRadius: '8px',
                      border: `1px solid ${colors.border}`
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '8px'
                    }}>
                      <span style={{
                        fontSize: '12px',
                        fontWeight: '600',
                        color: colors.primary
                      }}>
                        {response.author || 'Admin'}
                      </span>
                      <span style={{
                        fontSize: '11px',
                        color: colors.textMuted
                      }}>
                        {formatDate(response.createdAt)}
                      </span>
                    </div>
                    <p style={{
                      fontSize: '14px',
                      color: colors.textPrimary,
                      margin: 0,
                      lineHeight: '1.4'
                    }}>
                      {response.message}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add Response */}
          <div style={{
            backgroundColor: colors.cardBackground,
            padding: '20px',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
            border: `1px solid ${colors.border}`
          }}>
            <h3 style={{
              fontSize: '16px',
              fontWeight: '600',
              color: colors.textPrimary,
              margin: '0 0 12px 0'
            }}>
              Add Response
            </h3>
            
            <textarea
              value={responseText}
              onChange={(e) => setResponseText(e.target.value)}
              placeholder="Type your response to the customer..."
              rows={4}
              style={{
                width: '100%',
                padding: '12px',
                border: `1px solid ${colors.border}`,
                borderRadius: '8px',
                fontSize: '14px',
                fontFamily: 'inherit',
                resize: 'vertical',
                outline: 'none',
                boxSizing: 'border-box',
                backgroundColor: colors.hover
              }}
            />
            
            <button
              onClick={submitResponse}
              disabled={!responseText.trim() || submittingResponse}
              style={{
                marginTop: '12px',
                padding: '10px 20px',
                backgroundColor: !responseText.trim() || submittingResponse ? colors.textMuted : colors.primary,
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: !responseText.trim() || submittingResponse ? 'not-allowed' : 'pointer',
                opacity: !responseText.trim() || submittingResponse ? 0.6 : 1,
                transition: 'all 0.2s ease'
              }}
            >
              {submittingResponse ? 'Sending Response...' : 'Send Response'}
            </button>
          </div>
        </div>

        {/* Right Column - Actions */}
        <div>
          <div style={{
            backgroundColor: colors.cardBackground,
            padding: '20px',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
            border: `1px solid ${colors.border}`,
            position: 'sticky',
            top: '20px'
          }}>
            <h3 style={{
              fontSize: '16px',
              fontWeight: '600',
              color: colors.textPrimary,
              margin: '0 0 16px 0'
            }}>
              Update Status
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                { value: 'open', label: 'Open', color: colors.primary },
                { value: 'in-progress', label: 'In Progress', color: colors.warning },
                { value: 'resolved', label: 'Resolved', color: colors.success },
                { value: 'closed', label: 'Closed', color: colors.textMuted }
              ].map(status => (
                <button
                  key={status.value}
                  onClick={() => updateTicketStatus(status.value)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '100%',
                    padding: '12px 16px',
                    backgroundColor: ticket.status === status.value ? status.color : colors.hover,
                    color: ticket.status === status.value ? '#fff' : colors.textPrimary,
                    border: `1px solid ${ticket.status === status.value ? status.color : colors.border}`,
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <span>{status.label}</span>
                  {ticket.status === status.value && (
                    <span style={{ fontSize: '12px' }}>✓</span>
                  )}
                </button>
              ))}
            </div>

            {/* Quick Stats */}
            <div style={{
              marginTop: '24px',
              paddingTop: '16px',
              borderTop: `1px solid ${colors.border}`
            }}>
              <h4 style={{
                fontSize: '14px',
                fontWeight: '600',
                color: colors.textSecondary,
                margin: '0 0 12px 0',
                textTransform: 'uppercase'
              }}>
                Ticket Summary
              </h4>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '12px', color: colors.textMuted }}>Responses</span>
                  <span style={{ fontSize: '12px', fontWeight: '600', color: colors.textPrimary }}>
                    {ticket.responses?.length || 0}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '12px', color: colors.textMuted }}>Category</span>
                  <span style={{ fontSize: '12px', fontWeight: '600', color: colors.textPrimary }}>
                    {ticket.category || 'General'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '12px', color: colors.textMuted }}>Priority</span>
                  <span style={{ fontSize: '12px', fontWeight: '600', color: getPriorityColor(ticket.priority) }}>
                    {ticket.priority || 'Normal'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default SupportTicketDetail;