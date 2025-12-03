import React, { useState, useEffect, useCallback } from 'react'
import PaymentGatewayConfig from './PaymentGatewayConfig'; // ADD THIS LINE
const SystemManagement = () => {
  const [activeTab, setActiveTab] = useState('api-config');
  const [loading, setLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [token, setToken] = useState('demo-token-12345');
  const [editingConfig, setEditingConfig] = useState(null);

  // System Health State
  const [systemHealth, setSystemHealth] = useState({
    uptime: '99.9%',
    cpuUsage: 45,
    memoryUsage: 62,
    diskUsage: 34,
    apiResponseTime: 120,
    activeConnections: 1247,
    errorRate: 0.2,
    lastChecked: new Date().toISOString()
  });

  // API Configuration State
  const [apiConfigs, setApiConfigs] = useState([
    {
      id: 'vtpass',
      name: 'VTPass API',
      type: 'Primary Provider',
      status: 'active',
      endpoint: 'https://vtpass.com/api',
      apiKey: '****-****-****-8234',
      timeout: 30000,
      retries: 3,
      lastSync: '2025-01-15T10:30:00Z',
      successRate: 98.5
    },
    {
      id: 'clubkonnect',
      name: 'Club Konnect',
      type: 'Secondary Provider',
      status: 'active',
      endpoint: 'https://clubkonnect.com/api',
      apiKey: '****-****-****-7891',
      timeout: 25000,
      retries: 2,
      lastSync: '2025-01-15T10:28:00Z',
      successRate: 96.2
    },
    {
      id: 'payscribe',
      name: 'Payscribe API',
      type: 'Backup Provider',
      status: 'maintenance',
      endpoint: 'https://payscribe.ng/api',
      apiKey: '****-****-****-5642',
      timeout: 35000,
      retries: 3,
      lastSync: '2025-01-15T09:45:00Z',
      successRate: 94.8
    }
  ]);

  // Error Logs State
  const [errorLogs, setErrorLogs] = useState([
    {
      id: '1',
      timestamp: '2025-01-15T11:30:22Z',
      level: 'error',
      service: 'VTPass API',
      message: 'Connection timeout after 30 seconds',
      details: 'Failed to connect to vtpass.com API endpoint',
      resolved: false,
      count: 3
    },
    {
      id: '2',
      timestamp: '2025-01-15T11:15:08Z',
      level: 'warning',
      service: 'Database',
      message: 'High connection pool usage detected',
      details: '85% of database connections are in use',
      resolved: true,
      count: 1
    },
    {
      id: '3',
      timestamp: '2025-01-15T10:45:33Z',
      level: 'error',
      service: 'Payment Gateway',
      message: 'Transaction validation failed',
      details: 'Invalid webhook signature from payment provider',
      resolved: false,
      count: 7
    }
  ]);

  // Maintenance Mode State
  const [maintenanceMode, setMaintenanceMode] = useState({
    enabled: false,
    message: 'System maintenance in progress. Please try again later.',
    scheduledStart: '',
    scheduledEnd: '',
    affectedServices: []
  });

  // Service Provider Settings
  const [serviceProviders, setServiceProviders] = useState([
    {
      id: 'mtn',
      name: 'MTN Nigeria',
      type: 'Airtime/Data',
      status: 'active',
      priority: 1,
      commissionRate: 2.5,
      timeout: 30000,
      maxRetries: 3,
      lastSync: '2025-01-15T11:20:00Z'
    },
    {
      id: 'airtel',
      name: 'Airtel Nigeria',
      type: 'Airtime/Data', 
      status: 'active',
      priority: 2,
      commissionRate: 2.3,
      timeout: 25000,
      maxRetries: 2,
      lastSync: '2025-01-15T11:18:00Z'
    },
    {
      id: 'dstv',
      name: 'DStv',
      type: 'Cable TV',
      status: 'maintenance',
      priority: 1,
      commissionRate: 3.0,
      timeout: 45000,
      maxRetries: 3,
      lastSync: '2025-01-15T10:30:00Z'
    }
  ]);

  // Tab navigation
 const tabs = [
  { id: 'api-config', label: 'API Configuration', icon: '🔌' },
  { id: 'payment-gateway', label: 'Payment Gateway', icon: '💳' }, // ADD THIS
  { id: 'providers', label: 'Service Providers', icon: '🏢' },
  { id: 'health', label: 'System Health', icon: '💚' },
  { id: 'maintenance', label: 'Maintenance', icon: '🔧' },
  { id: 'logs', label: 'Error Logs', icon: '🚨' }
];

  // Utility functions
  const showNotification = useCallback((message, type = 'success') => {
    if (type === 'success') {
      setSuccess(message);
      setError(null);
    } else {
      setError(message);
      setSuccess(null);
    }
    
    setTimeout(() => {
      setSuccess(null);
      setError(null);
    }, 5000);
  }, []);

  // Initialize component
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // API Functions
  const addNewApiConfig = () => {
    const newConfig = {
      id: `api-${Date.now()}`,
      name: 'New API Provider',
      type: 'Custom Provider',
      status: 'inactive',
      endpoint: 'https://api.example.com',
      apiKey: '****-****-****-0000',
      timeout: 30000,
      retries: 3,
      lastSync: new Date().toISOString(),
      successRate: 0
    };
    
    setApiConfigs(prev => [...prev, newConfig]);
    setEditingConfig(newConfig.id);
    showNotification('New API configuration added. Please configure the settings.');
  };

  const updateApiConfig = useCallback(async (configId, updates) => {
    try {
      setActionLoading(true);
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setApiConfigs(prev => prev.map(config => 
        config.id === configId ? { 
          ...config, 
          ...updates,
          lastSync: new Date().toISOString()
        } : config
      ));
      
      showNotification('API configuration updated successfully');
    } catch (error) {
      showNotification(`Failed to update API config: ${error.message}`, 'error');
    } finally {
      setActionLoading(false);
      setEditingConfig(null);
    }
  }, [showNotification]);

  const toggleMaintenanceMode = useCallback(async (enabled, settings = {}) => {
    try {
      setActionLoading(true);
      
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const payload = { enabled, ...settings };
      setMaintenanceMode(prev => ({ ...prev, ...payload }));
      showNotification(`Maintenance mode ${enabled ? 'enabled' : 'disabled'} successfully`);
    } catch (error) {
      showNotification(`Failed to ${enabled ? 'enable' : 'disable'} maintenance mode: ${error.message}`, 'error');
    } finally {
      setActionLoading(false);
    }
  }, [showNotification]);

  const testApiConnection = useCallback(async (configId) => {
    try {
      setActionLoading(true);
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const responseTime = Math.floor(Math.random() * 300) + 100;
      const success = Math.random() > 0.2;
      
      if (success) {
        showNotification(`API connection test successful - Response time: ${responseTime}ms`);
        
        setApiConfigs(prev => prev.map(config => 
          config.id === configId 
            ? { ...config, successRate: Math.min(100, config.successRate + 0.1) }
            : config
        ));
      } else {
        showNotification(`API connection test failed: Connection timeout`, 'error');
      }
    } catch (error) {
      showNotification(`Connection test failed: ${error.message}`, 'error');
    } finally {
      setActionLoading(false);
    }
  }, [showNotification]);

  const resolveErrorLog = useCallback(async (logId) => {
    try {
      setActionLoading(true);
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setErrorLogs(prev => prev.map(log => 
        log.id === logId ? { ...log, resolved: true } : log
      ));
      
      showNotification('Error log marked as resolved');
    } catch (error) {
      showNotification(`Failed to resolve error log: ${error.message}`, 'error');
    } finally {
      setActionLoading(false);
    }
  }, [showNotification]);

  const refreshSystemHealth = useCallback(async () => {
    try {
      setActionLoading(true);
      
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setSystemHealth(prev => ({
        ...prev,
        cpuUsage: Math.floor(Math.random() * 40) + 30,
        memoryUsage: Math.floor(Math.random() * 30) + 50,
        diskUsage: Math.floor(Math.random() * 20) + 25,
        apiResponseTime: Math.floor(Math.random() * 200) + 80,
        activeConnections: Math.floor(Math.random() * 500) + 1000,
        errorRate: Math.random() * 2,
        lastChecked: new Date().toISOString()
      }));
      
      showNotification('System health data refreshed');
    } catch (error) {
      showNotification(`Failed to refresh health data: ${error.message}`, 'error');
    } finally {
      setActionLoading(false);
    }
  }, [showNotification]);

  const handleConfigFieldChange = (configId, field, value) => {
    setApiConfigs(prev => prev.map(config =>
      config.id === configId ? { ...config, [field]: value } : config
    ));
  };

  const configureProvider = (providerId) => {
    showNotification(`Opening configuration for ${serviceProviders.find(p => p.id === providerId)?.name}`);
  };

  // Utility components
  const StatusBadge = ({ status, size = 'small' }) => {
    const statusConfig = {
      active: { bg: '#28a745', text: 'Active' },
      maintenance: { bg: '#ffc107', text: 'Maintenance', color: '#000' },
      inactive: { bg: '#6c757d', text: 'Inactive' },
      error: { bg: '#dc3545', text: 'Error' }
    };

    const config = statusConfig[status] || statusConfig.inactive;

    return (
      <span style={{
        backgroundColor: config.bg,
        color: config.color || '#fff',
        padding: size === 'large' ? '6px 12px' : '4px 8px',
        borderRadius: '12px',
        fontSize: size === 'large' ? '12px' : '11px',
        fontWeight: '600',
        textTransform: 'uppercase'
      }}>
        {config.text}
      </span>
    );
  };

  const NotificationBanner = () => {
    if (!success && !error) return null;

    return (
      <div style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        zIndex: 2000,
        maxWidth: '400px',
        padding: '16px',
        borderRadius: '8px',
        backgroundColor: success ? '#d4edda' : '#f8d7da',
        border: `1px solid ${success ? '#c3e6cb' : '#f5c6cb'}`,
        color: success ? '#155724' : '#721c24',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '16px' }}>{success ? '✅' : '❌'}</span>
          <span style={{ fontSize: '14px', fontWeight: '500' }}>
            {success || error}
          </span>
          <button
            onClick={() => {
              setSuccess(null);
              setError(null);
            }}
            style={{
              marginLeft: 'auto',
              background: 'none',
              border: 'none',
              fontSize: '18px',
              cursor: 'pointer',
              color: 'inherit'
            }}
          >
            ×
          </button>
        </div>
      </div>
    );
  };

  // Tab Navigation
  const TabNavigation = () => (
    <div style={{
      backgroundColor: '#fff',
      padding: '16px 20px',
      borderRadius: '12px',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
      border: '1px solid #e2e8f0',
      marginBottom: '24px'
    }}>
      <div style={{
        display: 'flex',
        overflowX: 'auto',
        gap: '8px',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none'
      }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '12px 16px',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              backgroundColor: activeTab === tab.id ? '#ff3b30' : '#f8f9fa',
              color: activeTab === tab.id ? '#fff' : '#1a202c',
              transition: 'all 0.3s ease'
            }}
          >
            <span style={{ marginRight: '8px' }}>{tab.icon}</span>
            {isMobile ? tab.label.split(' ')[0] : tab.label}
          </button>
        ))}
      </div>
    </div>
  );

  // Tab content renderers
  const renderApiConfiguration = () => (
    <div style={{ width: '100%' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <h3 style={{ margin: 0, color: '#1a202c', fontSize: '18px', fontWeight: '600' }}>
          API Provider Configuration
        </h3>
        <button
          onClick={addNewApiConfig}
          style={{
            padding: '8px 16px',
            backgroundColor: '#ff3b30',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer'
          }}
        >
          Add New API
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {apiConfigs.map((config) => (
          <div key={config.id} style={{
            backgroundColor: '#fff',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '20px',
              borderBottom: '1px solid #f1f5f9',
              backgroundColor: '#f8f9fa'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                gap: '16px',
                flexWrap: 'wrap'
              }}>
                <div style={{ flex: 1, minWidth: '200px' }}>
                  <h4 style={{ margin: '0 0 8px 0', color: '#1a202c', fontSize: '16px', fontWeight: '600' }}>
                    {config.name}
                  </h4>
                  <p style={{ margin: '0 0 8px 0', color: '#718096', fontSize: '14px' }}>
                    {config.type} • {config.endpoint}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <StatusBadge status={config.status} />
                    <span style={{ color: '#718096', fontSize: '12px' }}>
                      Success Rate: {config.successRate}%
                    </span>
                  </div>
                </div>
                
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => testApiConnection(config.id)}
                    disabled={actionLoading}
                    style={{
                      padding: '6px 12px',
                      backgroundColor: '#28a745',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: '600',
                      cursor: actionLoading ? 'not-allowed' : 'pointer',
                      opacity: actionLoading ? 0.7 : 1
                    }}
                  >
                    {actionLoading ? 'Testing...' : 'Test Connection'}
                  </button>
                  
                  <button
                    onClick={() => updateApiConfig(config.id, {
                      status: config.status === 'active' ? 'inactive' : 'active'
                    })}
                    disabled={actionLoading}
                    style={{
                      padding: '6px 12px',
                      backgroundColor: config.status === 'active' ? '#ffc107' : '#28a745',
                      color: config.status === 'active' ? '#000' : '#fff',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: '600',
                      cursor: actionLoading ? 'not-allowed' : 'pointer',
                      opacity: actionLoading ? 0.7 : 1
                    }}
                  >
                    {config.status === 'active' ? 'Disable' : 'Enable'}
                  </button>
                </div>
              </div>
            </div>

            <div style={{ padding: '20px' }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '20px'
              }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: '#1a202c' }}>
                    API Key
                  </label>
                  <input
                    type="password"
                    value={config.apiKey}
                    onChange={(e) => handleConfigFieldChange(config.id, 'apiKey', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #e2e8f0',
                      borderRadius: '6px',
                      fontSize: '14px',
                      backgroundColor: editingConfig === config.id ? '#fff' : '#f8f9fa',
                      boxSizing: 'border-box',
                      color: '#000000'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: '#1a202c' }}>
                    Timeout (ms)
                  </label>
                  <input
                    type="number"
                    value={config.timeout}
                    onChange={(e) => handleConfigFieldChange(config.id, 'timeout', parseInt(e.target.value))}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #e2e8f0',
                      borderRadius: '6px',
                      fontSize: '14px',
                      boxSizing: 'border-box',
                      backgroundColor: '#fff',
                      color: '#000000'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: '#1a202c' }}>
                    Max Retries
                  </label>
                  <input
                    type="number"
                    value={config.retries}
                    onChange={(e) => handleConfigFieldChange(config.id, 'retries', parseInt(e.target.value))}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #e2e8f0',
                      borderRadius: '6px',
                      fontSize: '14px',
                      boxSizing: 'border-box',
                      backgroundColor: '#fff',
                      color: '#000000'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: '#1a202c' }}>
                    Last Sync
                  </label>
                  <div style={{
                    padding: '8px 12px',
                    backgroundColor: '#f8f9fa',
                    borderRadius: '6px',
                    fontSize: '14px',
                    color: '#718096'
                  }}>
                    {new Date(config.lastSync).toLocaleString()}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '20px', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setEditingConfig(editingConfig === config.id ? null : config.id)}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: editingConfig === config.id ? '#6c757d' : '#ff3b30',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  {editingConfig === config.id ? 'Cancel Edit' : 'Edit'}
                </button>
                
                <button
                  onClick={() => updateApiConfig(config.id, config)}
                  disabled={actionLoading}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#28a745',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: actionLoading ? 'not-allowed' : 'pointer',
                    opacity: actionLoading ? 0.7 : 1
                  }}
                >
                  {actionLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderServiceProviders = () => (
    <div style={{ width: '100%' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <h3 style={{ margin: 0, color: '#1a202c', fontSize: '18px', fontWeight: '600' }}>
          Service Provider Settings
        </h3>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {serviceProviders.map((provider) => (
          <div key={provider.id} style={{
            backgroundColor: '#fff',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            padding: '20px'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginBottom: '20px',
              gap: '16px',
              flexWrap: 'wrap'
            }}>
              <div>
                <h4 style={{ margin: '0 0 8px 0', color: '#1a202c', fontSize: '16px', fontWeight: '600' }}>
                  {provider.name}
                </h4>
                <p style={{ margin: '0 0 8px 0', color: '#718096', fontSize: '14px' }}>
                  {provider.type} • Priority: {provider.priority}
                </p>
                <StatusBadge status={provider.status} />
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => configureProvider(provider.id)}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: '#28a745',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  Configure
                </button>
              </div>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: '16px'
            }}>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: '600', color: '#718096' }}>
                  Commission Rate (%)
                </label>
                <div style={{ fontSize: '16px', fontWeight: '600', color: '#1a202c' }}>
                  {provider.commissionRate}%
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: '600', color: '#718096' }}>
                  Timeout (ms)
                </label>
                <div style={{ fontSize: '16px', fontWeight: '600', color: '#1a202c' }}>
                  {provider.timeout}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: '600', color: '#718096' }}>
                  Max Retries
                </label>
                <div style={{ fontSize: '16px', fontWeight: '600', color: '#1a202c' }}>
                  {provider.maxRetries}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: '600', color: '#718096' }}>
                  Last Sync
                </label>
                <div style={{ fontSize: '14px', color: '#718096' }}>
                  {new Date(provider.lastSync).toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderSystemHealth = () => (
    <div style={{ width: '100%' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <h3 style={{ margin: 0, color: '#1a202c', fontSize: '18px', fontWeight: '600' }}>
          System Health Monitor
        </h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ fontSize: '12px', color: '#718096' }}>
            Last updated: {new Date(systemHealth.lastChecked).toLocaleString()}
          </div>
          <button
            onClick={refreshSystemHealth}
            disabled={actionLoading}
            style={{
              padding: '6px 12px',
              backgroundColor: '#28a745',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: '600',
              cursor: actionLoading ? 'not-allowed' : 'pointer',
              opacity: actionLoading ? 0.7 : 1
            }}
          >
            {actionLoading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Health Metrics Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '20px',
        marginBottom: '32px'
      }}>
        {[
          { label: 'System Uptime', value: systemHealth.uptime, color: '#28a745', icon: '⚡' },
          { label: 'CPU Usage', value: `${systemHealth.cpuUsage}%`, color: systemHealth.cpuUsage > 80 ? '#dc3545' : '#28a745', icon: '🔧' },
          { label: 'Memory Usage', value: `${systemHealth.memoryUsage}%`, color: systemHealth.memoryUsage > 85 ? '#dc3545' : '#ffc107', icon: '💾' },
          { label: 'Disk Usage', value: `${systemHealth.diskUsage}%`, color: systemHealth.diskUsage > 90 ? '#dc3545' : '#28a745', icon: '💿' },
          { label: 'API Response Time', value: `${systemHealth.apiResponseTime}ms`, color: systemHealth.apiResponseTime > 500 ? '#dc3545' : '#28a745', icon: '⚡' },
          { label: 'Active Connections', value: systemHealth.activeConnections.toLocaleString(), color: '#28a745', icon: '🔗' },
          { label: 'Error Rate', value: `${systemHealth.errorRate.toFixed(1)}%`, color: systemHealth.errorRate > 1 ? '#dc3545' : '#28a745', icon: '⚠️' }
        ].map((metric, index) => (
          <div key={index} style={{
            backgroundColor: '#fff',
            padding: '20px',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '24px', marginBottom: '12px' }}>{metric.icon}</div>
            <h4 style={{ margin: '0 0 8px 0', color: '#1a202c', fontSize: '14px', fontWeight: '600' }}>
              {metric.label}
            </h4>
            <div style={{ fontSize: '24px', fontWeight: '700', color: metric.color }}>
              {metric.value}
            </div>
          </div>
        ))}
      </div>

      {/* Performance Chart Placeholder */}
      <div style={{
        backgroundColor: '#fff',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        padding: '24px'
      }}>
        <h4 style={{ margin: '0 0 20px 0', color: '#1a202c', fontSize: '16px', fontWeight: '600' }}>
          Performance Metrics (Last 24 Hours)
        </h4>
        <div style={{
          height: '300px',
          backgroundColor: '#f8f9fa',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '2px dashed #e2e8f0',
          color: '#718096'
        }}>
          Performance Chart (Integration with charting library needed)
        </div>
      </div>
    </div>
  );

  const renderMaintenanceMode = () => (
    <div style={{ width: '100%' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <h3 style={{ margin: 0, color: '#1a202c', fontSize: '18px', fontWeight: '600' }}>
          Maintenance Mode Control
        </h3>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '8px 16px',
          backgroundColor: maintenanceMode.enabled ? '#fff3cd' : '#d4edda',
          border: `1px solid ${maintenanceMode.enabled ? '#ffeaa7' : '#c3e6cb'}`,
          borderRadius: '8px'
        }}>
          <span style={{ fontSize: '16px' }}>{maintenanceMode.enabled ? '⚠️' : '✅'}</span>
          <span style={{ 
            fontWeight: '600', 
            color: maintenanceMode.enabled ? '#856404' : '#155724' 
          }}>
            {maintenanceMode.enabled ? 'Maintenance Mode Active' : 'System Operational'}
          </span>
        </div>
      </div>

      <div style={{
        backgroundColor: '#fff',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        padding: '24px',
        marginBottom: '24px'
      }}>
        <h4 style={{ margin: '0 0 20px 0', color: '#1a202c', fontSize: '16px', fontWeight: '600' }}>
          Maintenance Settings
        </h4>

        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
          gap: '20px',
          marginBottom: '24px'
        }}>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: '#1a202c' }}>
              Maintenance Message
            </label>
            <textarea
              value={maintenanceMode.message}
              onChange={(e) => setMaintenanceMode(prev => ({ ...prev, message: e.target.value }))}
              rows="4"
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                fontSize: '14px',
                resize: 'vertical',
                boxSizing: 'border-box',
                backgroundColor: '#fff',
                color: '#000000'
              }}
              placeholder="Enter message to display during maintenance..."
            />
          </div>

          <div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: '#1a202c' }}>
                Scheduled Start
              </label>
              <input
                type="datetime-local"
                value={maintenanceMode.scheduledStart}
                onChange={(e) => setMaintenanceMode(prev => ({ ...prev, scheduledStart: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                  backgroundColor: '#fff',
                  color: '#000000'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: '#1a202c' }}>
                Scheduled End
              </label>
              <input
                type="datetime-local"
                value={maintenanceMode.scheduledEnd}
                onChange={(e) => setMaintenanceMode(prev => ({ ...prev, scheduledEnd: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                  backgroundColor: '#fff',
                  color: '#000000'
                }}
              />
            </div>
          </div>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', marginBottom: '12px', fontSize: '14px', fontWeight: '600', color: '#1a202c' }}>
            Affected Services
          </label>
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: '12px'
          }}>
            {['Airtime', 'Data', 'Cable TV', 'Electricity', 'Betting', 'Education'].map((service) => (
              <label key={service} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 12px',
                backgroundColor: '#f8f9fa',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px'
              }}>
                <input
                  type="checkbox"
                  checked={maintenanceMode.affectedServices.includes(service)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setMaintenanceMode(prev => ({
                        ...prev,
                        affectedServices: [...prev.affectedServices, service]
                      }));
                    } else {
                      setMaintenanceMode(prev => ({
                        ...prev,
                        affectedServices: prev.affectedServices.filter(s => s !== service)
                      }));
                    }
                  }}
                  style={{ width: '16px', height: '16px' }}
                />
                {service}
              </label>
            ))}
          </div>
        </div>

        <div style={{
          display: 'flex',
          gap: '12px',
          justifyContent: 'flex-end',
          flexWrap: 'wrap'
        }}>
          {maintenanceMode.enabled ? (
            <button
              onClick={() => toggleMaintenanceMode(false)}
              disabled={actionLoading}
              style={{
                padding: '10px 20px',
                backgroundColor: '#28a745',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: actionLoading ? 'not-allowed' : 'pointer',
                opacity: actionLoading ? 0.7 : 1
              }}
            >
              {actionLoading ? 'Disabling...' : 'Disable Maintenance Mode'}
            </button>
          ) : (
            <button
              onClick={() => toggleMaintenanceMode(true, {
                message: maintenanceMode.message,
                scheduledStart: maintenanceMode.scheduledStart,
                scheduledEnd: maintenanceMode.scheduledEnd,
                affectedServices: maintenanceMode.affectedServices
              })}
              disabled={actionLoading}
              style={{
                padding: '10px 20px',
                backgroundColor: '#ffc107',
                color: '#000',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: actionLoading ? 'not-allowed' : 'pointer',
                opacity: actionLoading ? 0.7 : 1
              }}
            >
              {actionLoading ? 'Enabling...' : 'Enable Maintenance Mode'}
            </button>
          )}

          <button
            onClick={() => showNotification('Maintenance scheduling feature coming soon!')}
            style={{
              padding: '10px 20px',
              backgroundColor: '#28a745',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            Schedule Maintenance
          </button>
        </div>
      </div>

      {/* Maintenance History */}
      <div style={{
        backgroundColor: '#fff',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        padding: '24px'
      }}>
        <h4 style={{ margin: '0 0 20px 0', color: '#1a202c', fontSize: '16px', fontWeight: '600' }}>
          Recent Maintenance Activities
        </h4>
        <div style={{
          height: '200px',
          backgroundColor: '#f8f9fa',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '2px dashed #e2e8f0',
          color: '#718096'
        }}>
          Maintenance history will be displayed here
        </div>
      </div>
    </div>
  );

  const renderErrorLogs = () => (
    <div style={{ width: '100%' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <h3 style={{ margin: 0, color: '#1a202c', fontSize: '18px', fontWeight: '600' }}>
          System Error Logs
        </h3>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <select
            style={{
              padding: '6px 12px',
              border: '1px solid #e2e8f0',
              borderRadius: '6px',
              fontSize: '14px',
              backgroundColor: '#fff',
              color: '#000000'
            }}
          >
            <option value="">All Levels</option>
            <option value="error">Error</option>
            <option value="warning">Warning</option>
            <option value="info">Info</option>
          </select>
          <button
            onClick={() => showNotification('Error logs refreshed')}
            style={{
              padding: '6px 12px',
              backgroundColor: '#28a745',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            Refresh
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {errorLogs.map((log) => (
          <div key={log.id} style={{
            backgroundColor: '#fff',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            overflow: 'hidden',
            borderLeft: `4px solid ${
              log.level === 'error' ? '#dc3545' : 
              log.level === 'warning' ? '#ffc107' : '#28a745'
            }`
          }}>
            <div style={{
              padding: '16px',
              borderBottom: log.resolved ? '1px solid #d4edda' : '1px solid #f8d7da',
              backgroundColor: log.resolved ? '#f8f9fa' : '#fff'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                gap: '16px',
                flexWrap: 'wrap'
              }}>
                <div style={{ flex: 1, minWidth: '200px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                    <span style={{
                      padding: '4px 8px',
                      borderRadius: '12px',
                      fontSize: '11px',
                      fontWeight: '600',
                      textTransform: 'uppercase',
                      backgroundColor: 
                        log.level === 'error' ? '#dc3545' :
                        log.level === 'warning' ? '#ffc107' : '#28a745',
                      color: log.level === 'warning' ? '#000' : '#fff'
                    }}>
                      {log.level}
                    </span>
                    
                    <span style={{ fontSize: '12px', color: '#718096' }}>
                      {log.service}
                    </span>
                    
                    {log.count > 1 && (
                      <span style={{
                        backgroundColor: '#ff3b30',
                        color: '#fff',
                        padding: '2px 6px',
                        borderRadius: '10px',
                        fontSize: '10px',
                        fontWeight: '600'
                      }}>
                        {log.count}x
                      </span>
                    )}
                    
                    {log.resolved && (
                      <span style={{
                        backgroundColor: '#28a745',
                        color: '#fff',
                        padding: '4px 8px',
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontWeight: '600'
                      }}>
                        Resolved
                      </span>
                    )}
                  </div>
                  
                  <h5 style={{ margin: '0 0 8px 0', color: '#1a202c', fontSize: '14px', fontWeight: '600' }}>
                    {log.message}
                  </h5>
                  
                  <p style={{ margin: '0 0 8px 0', color: '#718096', fontSize: '13px' }}>
                    {log.details}
                  </p>
                  
                  <div style={{ fontSize: '12px', color: '#a0aec0' }}>
                    {new Date(log.timestamp).toLocaleString()}
                  </div>
                </div>
                
                <div style={{ display: 'flex', gap: '8px' }}>
                  {!log.resolved && (
                    <button
                      onClick={() => resolveErrorLog(log.id)}
                      disabled={actionLoading}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: '#28a745',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: '600',
                        cursor: actionLoading ? 'not-allowed' : 'pointer',
                        opacity: actionLoading ? 0.7 : 1
                      }}
                    >
                      {actionLoading ? 'Resolving...' : 'Resolve'}
                    </button>
                  )}
                  
                  <button
                    onClick={() => showNotification(`Viewing details for log ${log.id}`)}
                    style={{
                      padding: '6px 12px',
                      backgroundColor: '#28a745',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    View Details
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {errorLogs.length === 0 && (
        <div style={{
          backgroundColor: '#fff',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          padding: '60px 20px',
          textAlign: 'center',
          color: '#718096'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div>
          <h3 style={{ color: '#1a202c', marginBottom: '8px' }}>No Error Logs</h3>
          <p>Your system is running smoothly with no recent errors</p>
        </div>
      )}
    </div>
  );

  // Main content renderer
  const renderContent = () => {
    switch (activeTab) {
      case 'api-config':
        return <renderApiConfiguration />;
      case 'providers':
        return <renderServiceProviders />;
      case 'health':
        return <renderSystemHealth />;
      case 'maintenance':
        return <renderMaintenanceMode />;
      case 'logs':
        return <renderErrorLogs />;
      default:
        return <renderApiConfiguration />;
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px' }}>
        <div style={{
          display: 'inline-block',
          width: '40px',
          height: '40px',
          border: '4px solid #f3f3f3',
          borderTop: '4px solid #ff3b30',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
        <p style={{ marginTop: '16px', color: '#718096' }}>Loading system management...</p>
      </div>
    );
  }

  return (
    <div style={{
      width: '100%',
      maxWidth: '100%'
    }}>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
      
      <NotificationBanner />
      
      <div style={{ padding: '20px' }}>
        <TabNavigation />
        
        <div style={{
          backgroundColor: '#fff',
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
          border: '1px solid #e2e8f0',
          padding: '24px'
        }}>
          {activeTab === 'api-config' && renderApiConfiguration()}
          {activeTab === 'providers' && renderServiceProviders()}
          {activeTab === 'health' && renderSystemHealth()}
          {activeTab === 'maintenance' && renderMaintenanceMode()}
          {activeTab === 'logs' && renderErrorLogs()}
          {activeTab === 'payment-gateway' && <PaymentGatewayConfig />}
        </div>
      </div>
    </div>
  );
};

export default SystemManagement;