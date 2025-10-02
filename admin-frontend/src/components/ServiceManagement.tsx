import React, { useState, useEffect, useCallback } from 'react';

const ServiceManagement = () => {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedServices, setSelectedServices] = useState([]);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [selectedService, setSelectedService] = useState(null);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [serviceDetailsLoading, setServiceDetailsLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [token, setToken] = useState('');
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [showAnalyticsModal, setShowAnalyticsModal] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  // Pricing form state
  const [pricingForm, setPricingForm] = useState({
    markupPercentage: '',
    flatFee: '',
    minAmount: '',
    maxAmount: '',
    dailyLimit: ''
  });

  // Filters and search state
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    serviceType: '',
    page: 1,
    limit: 25,
    sortBy: 'displayName',
    sortOrder: 'asc'
  });

  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalServices: 0,
    hasNextPage: false,
    hasPrevPage: false
  });

  const [stats, setStats] = useState({
    totalServices: 0,
    activeServices: 0,
    maintenanceServices: 0,
    inactiveServices: 0
  });

  // API Base URL Configuration
  const API_BASE_URL = import.meta?.env?.VITE_API_URL || 'https://vtu-application.onrender.com';

  // Service type icons and colors
  const SERVICE_CONFIG = {
    airtime: { icon: '📱', color: '#007bff', name: 'Airtime' },
    data: { icon: '📶', color: '#28a745', name: 'Data' },
    electricity: { icon: '💡', color: '#ffc107', name: 'Electricity' },
    cable_tv: { icon: '📺', color: '#dc3545', name: 'Cable TV' },
    internet: { icon: '🌐', color: '#6f42c1', name: 'Internet' },
    betting: { icon: '🎯', color: '#e83e8c', name: 'Betting' },
    education: { icon: '🎓', color: '#20c997', name: 'Education' },
    print_recharge: { icon: '🖨️', color: '#fd7e14', name: 'Print/Recharge' },
    transfer: { icon: '💸', color: '#6c757d', name: 'Transfers' }
  };

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

  const makeApiCall = useCallback(async (endpoint, options = {}) => {
    const defaultOptions = {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    };

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...defaultOptions,
      ...options
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }, [token, API_BASE_URL]);

  // Check mobile screen
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const authToken = localStorage.getItem('admin_token') || sessionStorage.getItem('admin_token');
    if (authToken) {
      setToken(authToken);
    } else {
      showNotification('Please login again', 'error');
      setTimeout(() => {
        window.location.href = '/';
      }, 2000);
    }
  }, [showNotification]);

  useEffect(() => {
    if (token) {
      fetchStats();
    }
  }, [token]);

  // API Functions
  const fetchStats = useCallback(async () => {
    if (!token) return;
    
    try {
      const data = await makeApiCall('/api/admin/overview');
      
      const statsData = data.overview || {};
      setStats({
        totalServices: statsData.services || 0,
        activeServices: statsData.activeProviders || 0,
        maintenanceServices: statsData.maintenanceServices || 0,
        inactiveServices: statsData.inactiveServices || 0
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
      showNotification(`Failed to fetch statistics: ${error.message}`, 'error');
      setStats({
        totalServices: 0,
        activeServices: 0,
        maintenanceServices: 0,
        inactiveServices: 0
      });
    }
  }, [token, makeApiCall, showNotification]);

  const fetchServices = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      console.log('Fetching services with token:', token.substring(0, 20) + '...');
      console.log('API Base URL:', API_BASE_URL);
      
      const queryParams = new URLSearchParams();
      if (filters.search) queryParams.append('search', filters.search);
      if (filters.status) queryParams.append('status', filters.status);
      if (filters.serviceType) queryParams.append('serviceType', filters.serviceType);
      queryParams.append('page', filters.page.toString());
      queryParams.append('limit', filters.limit.toString());
      queryParams.append('sortBy', filters.sortBy);
      queryParams.append('sortOrder', filters.sortOrder);
      
      const apiUrl = `${API_BASE_URL}/api/admin/services/config?${queryParams}`;
      console.log('Making API call to:', apiUrl);
      
      const data = await makeApiCall(`/api/admin/services/config?${queryParams}`);
      console.log('API response:', data);
      
      let servicesData = data.data || data.services || data || [];
      console.log('Services data:', servicesData);
      
      // Client-side filtering as fallback
      if (filters.status === 'active') {
        servicesData = servicesData.filter(service => service.isActive && !service.maintenanceMode);
      } else if (filters.status === 'inactive') {
        servicesData = servicesData.filter(service => !service.isActive);
      } else if (filters.status === 'maintenance') {
        servicesData = servicesData.filter(service => service.maintenanceMode);
      }
      
      if (filters.serviceType) {
        servicesData = servicesData.filter(service => service.serviceType === filters.serviceType);
      }
      
      // Apply sorting
      servicesData.sort((a, b) => {
        if (filters.sortBy === 'displayName') {
          return filters.sortOrder === 'asc' 
            ? a.displayName.localeCompare(b.displayName)
            : b.displayName.localeCompare(a.displayName);
        }
        return 0;
      });
      
      // Apply pagination
      const startIndex = (filters.page - 1) * filters.limit;
      const paginatedServices = servicesData.slice(startIndex, startIndex + filters.limit);
      
      setServices(paginatedServices);
      setPagination({
        currentPage: filters.page,
        totalPages: Math.ceil(servicesData.length / filters.limit),
        totalServices: servicesData.length,
        hasNextPage: startIndex + filters.limit < servicesData.length,
        hasPrevPage: filters.page > 1
      });
      
    } catch (error) {
      console.error('Error fetching services:', error);
      showNotification(`Failed to fetch services: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  }, [filters, token, makeApiCall, showNotification]);

  const fetchServiceDetails = useCallback(async (serviceId) => {
    if (!token) return null;
    
    try {
      setServiceDetailsLoading(true);
      const data = await makeApiCall(`/api/admin/services/${serviceId}`);
      return data.data || data;
    } catch (error) {
      console.error('Error fetching service details:', error);
      showNotification('Failed to fetch service details', 'error');
      return null;
    } finally {
      setServiceDetailsLoading(false);
    }
  }, [token, makeApiCall, showNotification]);

  const updateServiceStatus = useCallback(async (serviceId, statusUpdate) => {
    if (!token) return;
    
    try {
      setActionLoading(true);
      await makeApiCall(`/api/admin/services/config/${serviceId}`, {
        method: 'PUT',
        body: JSON.stringify(statusUpdate)
      });
      showNotification('Service status updated successfully');
      
      // Update local state
      setServices(prev => prev.map(service => 
        service._id === serviceId 
          ? { ...service, ...statusUpdate }
          : service
      ));
      
      // Update selected service if it's the one being modified
      if (selectedService && selectedService._id === serviceId) {
        setSelectedService(prev => ({ ...prev, ...statusUpdate }));
      }
      
      // Refresh stats
      await fetchStats();
      
    } catch (error) {
      console.error('Error updating service status:', error);
      showNotification(`Failed to update service status: ${error.message}`, 'error');
    } finally {
      setActionLoading(false);
    }
  }, [token, makeApiCall, showNotification, selectedService, fetchStats]);

  const updateServicePricing = useCallback(async (serviceId, pricingData) => {
    if (!token) return;
    
    try {
      setActionLoading(true);
      
      await makeApiCall(`/api/admin/services/config/${serviceId}`, {
        method: 'PUT',
        body: JSON.stringify({
          pricing: { 
            markupPercentage: pricingData.markupPercentage, 
            flatFee: pricingData.flatFee 
          },
          limits: {
            min: pricingData.minAmount,
            max: pricingData.maxAmount, 
            dailyLimit: pricingData.dailyLimit
          }
        })
      });
      
      showNotification('Service pricing updated successfully');
      
      // Update local state
      setServices(prev => prev.map(service => 
        service._id === serviceId 
          ? { 
              ...service, 
              pricing: { markupPercentage: pricingData.markupPercentage, flatFee: pricingData.flatFee },
              limits: { 
                min: pricingData.minAmount, 
                max: pricingData.maxAmount, 
                dailyLimit: pricingData.dailyLimit 
              }
            }
          : service
      ));
      
      // Update selected service
      if (selectedService && selectedService._id === serviceId) {
        setSelectedService(prev => ({
          ...prev,
          pricing: { markupPercentage: pricingData.markupPercentage, flatFee: pricingData.flatFee },
          limits: { 
            min: pricingData.minAmount, 
            max: pricingData.maxAmount, 
            dailyLimit: pricingData.dailyLimit 
          }
        }));
      }
      
    } catch (error) {
      console.error('Error updating service pricing:', error);
      showNotification(`Failed to update pricing: ${error.message}`, 'error');
    } finally {
      setActionLoading(false);
    }
  }, [token, makeApiCall, showNotification, selectedService]);

  const performBulkAction = useCallback(async (action, serviceIds) => {
    if (!token) {
      showNotification('Please login again', 'error');
      return;
    }
    
    if (serviceIds.length === 0) {
      showNotification('Please select services first', 'error');
      return;
    }

    const confirmMessage = `Are you sure you want to ${action} ${serviceIds.length} service(s)?`;
    if (!window.confirm(confirmMessage)) return;

    try {
      setActionLoading(true);
      
      let endpoint, method, body;
      
      if (action === 'activate') {
        endpoint = '/api/admin/services/bulk-toggle';
        method = 'POST';
        body = { serviceIds, isActive: true };
      } else if (action === 'deactivate') {
        endpoint = '/api/admin/services/bulk-toggle';
        method = 'POST';
        body = { serviceIds, isActive: false };
      } else if (action === 'maintenance') {
        endpoint = '/api/admin/services/maintenance-mode';
        method = 'PUT';
        body = { serviceIds, maintenanceMode: true, maintenanceMessage: 'Bulk maintenance mode enabled' };
      }

      await makeApiCall(endpoint, {
        method,
        body: JSON.stringify(body)
      });

      showNotification(`Bulk ${action} completed successfully`);
      
      // Clear selections and refresh data
      setSelectedServices([]);
      setShowBulkActions(false);
      await Promise.all([fetchServices(), fetchStats()]);
      
    } catch (error) {
      console.error('Error performing bulk action:', error);
      showNotification(`Failed to perform bulk ${action}: ${error.message}`, 'error');
    } finally {
      setActionLoading(false);
    }
  }, [token, makeApiCall, showNotification, fetchServices, fetchStats]);

  // Load data on component mount and filter changes
  useEffect(() => {
    if (token) {
      fetchServices();
    }
  }, [fetchServices, token]);

  // Handle filter changes
  const handleFilterChange = useCallback((key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: key !== 'page' ? 1 : value
    }));
  }, []);

  const handleServiceSelect = useCallback((serviceId) => {
    setSelectedServices(prev => 
      prev.includes(serviceId) 
        ? prev.filter(id => id !== serviceId)
        : [...prev, serviceId]
    );
  }, []);

  const handleViewDetails = useCallback(async (service) => {
    const serviceDetails = await fetchServiceDetails(service._id);
    if (serviceDetails) {
      setSelectedService(serviceDetails);
      setShowServiceModal(true);
    }
  }, [fetchServiceDetails]);

  const selectAllServices = useCallback(() => {
    if (selectedServices.length === services.length) {
      setSelectedServices([]);
    } else {
      setSelectedServices(services.map(service => service._id));
    }
  }, [selectedServices.length, services]);

  const handlePricingAction = useCallback((service) => {
    setSelectedService(service);
    setPricingForm({
      markupPercentage: service.pricing?.markupPercentage || '',
      flatFee: service.pricing?.flatFee || '',
      minAmount: service.limits?.min || '',
      maxAmount: service.limits?.max || '',
      dailyLimit: service.limits?.dailyLimit || ''
    });
    setShowPricingModal(true);
    setShowServiceModal(false);
  }, []);

  const handlePricingSubmit = useCallback(async () => {
    if (!selectedService) return;
    
    await updateServicePricing(selectedService._id, {
      markupPercentage: parseFloat(pricingForm.markupPercentage),
      flatFee: parseFloat(pricingForm.flatFee),
      minAmount: parseFloat(pricingForm.minAmount),
      maxAmount: parseFloat(pricingForm.maxAmount),
      dailyLimit: parseFloat(pricingForm.dailyLimit)
    });
    
    setShowPricingModal(false);
    setShowServiceModal(true);
  }, [selectedService, updateServicePricing, pricingForm]);

  const handleAnalyticsAction = useCallback((service) => {
    setSelectedService(service);
    setShowAnalyticsModal(true);
    setShowServiceModal(false);
  }, []);

  // Status badges
  const getStatusBadge = useCallback((service) => {
    if (service.maintenanceMode) {
      return (
        <span style={{
          backgroundColor: '#ffc107',
          color: '#000',
          padding: '4px 8px',
          borderRadius: '12px',
          fontSize: '11px',
          fontWeight: '600',
          textTransform: 'uppercase'
        }}>
          Maintenance
        </span>
      );
    }

    const statusConfig = {
      true: { bg: '#28a745', text: 'Active' },
      false: { bg: '#6c757d', text: 'Inactive' }
    };

    const config = statusConfig[service.isActive] || statusConfig.false;

    return (
      <span style={{
        backgroundColor: config.bg,
        color: '#fff',
        padding: '4px 8px',
        borderRadius: '12px',
        fontSize: '11px',
        fontWeight: '600',
        textTransform: 'uppercase'
      }}>
        {config.text}
      </span>
    );
  }, []);

  const getServiceIcon = useCallback((serviceType) => {
    const config = SERVICE_CONFIG[serviceType] || { icon: '🔧', color: '#6c757d' };
    return (
      <span style={{ 
        fontSize: '24px',
        color: config.color
      }}>
        {config.icon}
      </span>
    );
  }, []);

  const formatCurrency = useCallback((amount) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0
    }).format(amount);
  }, []);

  // Notification Component
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

  // Pagination component
  const PaginationControls = () => (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: '20px',
      flexWrap: 'wrap',
      gap: '16px'
    }}>
      <div style={{ fontSize: '14px', color: '#718096' }}>
        Showing {((pagination.currentPage - 1) * filters.limit) + 1} to{' '}
        {Math.min(pagination.currentPage * filters.limit, pagination.totalServices)} of{' '}
        {pagination.totalServices} services
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button
          onClick={() => handleFilterChange('page', pagination.currentPage - 1)}
          disabled={!pagination.hasPrevPage}
          style={{
            padding: '8px 12px',
            border: '1px solid #e2e8f0',
            borderRadius: '6px',
            backgroundColor: pagination.hasPrevPage ? '#fff' : '#f8f9fa',
            color: pagination.hasPrevPage ? '#1a202c' : '#a0aec0',
            cursor: pagination.hasPrevPage ? 'pointer' : 'not-allowed',
            fontSize: '14px'
          }}
        >
          Previous
        </button>

        <span style={{ padding: '8px 12px', fontSize: '14px', color: '#1a202c' }}>
          Page {pagination.currentPage} of {pagination.totalPages}
        </span>

        <button
          onClick={() => handleFilterChange('page', pagination.currentPage + 1)}
          disabled={!pagination.hasNextPage}
          style={{
            padding: '8px 12px',
            border: '1px solid #e2e8f0',
            borderRadius: '6px',
            backgroundColor: pagination.hasNextPage ? '#fff' : '#f8f9fa',
            color: pagination.hasNextPage ? '#1a202c' : '#a0aec0',
            cursor: pagination.hasNextPage ? 'pointer' : 'not-allowed',
            fontSize: '14px'
          }}
        >
          Next
        </button>
      </div>
    </div>
  );

  // Service Modal Component
  const ServiceModal = () => {
    if (!showServiceModal || !selectedService) return null;

    return (
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
          backgroundColor: '#fff',
          borderRadius: '16px',
          maxWidth: '600px',
          width: '100%',
          maxHeight: '80vh',
          overflow: 'auto'
        }}>
          <div style={{
            padding: '24px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <h3 style={{ margin: 0, color: '#1a202c', fontSize: '18px', fontWeight: '600' }}>
              Service Details
            </h3>
            <button
              onClick={() => setShowServiceModal(false)}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '24px',
                cursor: 'pointer',
                color: '#718096'
              }}
            >
              ×
            </button>
          </div>

          <div style={{ padding: '24px' }}>
            {serviceDetailsLoading ? (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <div style={{
                  display: 'inline-block',
                  width: '30px',
                  height: '30px',
                  border: '3px solid #e2e8f0',
                  borderTop: '3px solid #ff3b30',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }} />
                <p style={{ marginTop: '16px', color: '#718096' }}>Loading details...</p>
              </div>
            ) : (
              <>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  marginBottom: '24px',
                  padding: '20px',
                  backgroundColor: '#f8f9fa',
                  borderRadius: '12px'
                }}>
                  <div style={{ fontSize: '48px' }}>
                    {getServiceIcon(selectedService.serviceType)}
                  </div>
                  <div>
                    <h4 style={{ margin: '0 0 8px 0', color: '#1a202c', fontSize: '18px' }}>
                      {selectedService.displayName}
                    </h4>
                    <p style={{ margin: '0 0 4px 0', color: '#718096', fontSize: '14px' }}>
                      {selectedService.serviceType}
                    </p>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                      {getStatusBadge(selectedService)}
                      {selectedService.maintenanceMode && (
                        <span style={{
                          backgroundColor: '#fff3cd',
                          color: '#856404',
                          padding: '4px 8px',
                          borderRadius: '12px',
                          fontSize: '11px',
                          fontWeight: '600'
                        }}>
                          {selectedService.maintenanceMessage || 'Under Maintenance'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div style={{
                  display: 'flex',
                  gap: '12px',
                  marginBottom: '24px',
                  flexWrap: 'wrap'
                }}>
                  {selectedService.isActive ? (
                    <button
                      onClick={() => updateServiceStatus(selectedService._id, { isActive: false })}
                      disabled={actionLoading}
                      style={{
                        padding: '8px 16px',
                        backgroundColor: '#ff8c00',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: actionLoading ? 'not-allowed' : 'pointer',
                        opacity: actionLoading ? 0.7 : 1
                      }}
                    >
                      {actionLoading ? 'Processing...' : 'Deactivate'}
                    </button>
                  ) : (
                    <button
                      onClick={() => updateServiceStatus(selectedService._id, { isActive: true })}
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
                      {actionLoading ? 'Processing...' : 'Activate'}
                    </button>
                  )}

                  <button
                    onClick={() => updateServiceStatus(selectedService._id, { 
                      maintenanceMode: !selectedService.maintenanceMode 
                    })}
                    disabled={actionLoading}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: selectedService.maintenanceMode ? '#28a745' : '#ffc107',
                      color: selectedService.maintenanceMode ? '#fff' : '#000',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: actionLoading ? 'not-allowed' : 'pointer',
                      opacity: actionLoading ? 0.7 : 1
                    }}
                  >
                    {actionLoading ? 'Processing...' : selectedService.maintenanceMode ? 'End Maintenance' : 'Maintenance Mode'}
                  </button>

                  <button
                    onClick={() => handlePricingAction(selectedService)}
                    disabled={actionLoading}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#007bff',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: actionLoading ? 'not-allowed' : 'pointer',
                      opacity: actionLoading ? 0.7 : 1
                    }}
                  >
                    Pricing
                  </button>

                  <button
                    onClick={() => handleAnalyticsAction(selectedService)}
                    disabled={actionLoading}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#6f42c1',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: actionLoading ? 'not-allowed' : 'pointer',
                      opacity: actionLoading ? 0.7 : 1
                    }}
                  >
                    Analytics
                  </button>
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
                  gap: '16px'
                }}>
                  <div>
                    <h5 style={{ margin: '0 0 8px 0', color: '#1a202c', fontSize: '14px', fontWeight: '600' }}>
                      Pricing
                    </h5>
                    <p style={{ margin: '0 0 16px 0', color: '#718096', fontSize: '14px' }}>
                      Markup: {selectedService.pricing?.markupPercentage}%<br/>
                      Flat Fee: {formatCurrency(selectedService.pricing?.flatFee || 0)}
                    </p>
                  </div>

                  <div>
                    <h5 style={{ margin: '0 0 8px 0', color: '#1a202c', fontSize: '14px', fontWeight: '600' }}>
                      Limits
                    </h5>
                    <p style={{ margin: '0 0 16px 0', color: '#718096', fontSize: '14px' }}>
                      Min: {formatCurrency(selectedService.limits?.min || 0)}<br/>
                      Max: {formatCurrency(selectedService.limits?.max || 0)}<br/>
                      Daily: {formatCurrency(selectedService.limits?.dailyLimit || 0)}
                    </p>
                  </div>

                  <div>
                    <h5 style={{ margin: '0 0 8px 0', color: '#1a202c', fontSize: '14px', fontWeight: '600' }}>
                      Statistics
                    </h5>
                    <p style={{ margin: '0 0 16px 0', color: '#718096', fontSize: '14px' }}>
                      Success Rate: {selectedService.statistics?.successRate || 0}%<br/>
                      Revenue: {formatCurrency(selectedService.statistics?.totalRevenue || 0)}
                    </p>
                  </div>

                  <div>
                    <h5 style={{ margin: '0 0 8px 0', color: '#1a202c', fontSize: '14px', fontWeight: '600' }}>
                      Last Updated
                    </h5>
                    <p style={{ margin: '0 0 16px 0', color: '#718096', fontSize: '14px' }}>
                      {new Date(selectedService.lastModified).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {selectedService.description && (
                  <div style={{ marginTop: '24px' }}>
                    <h5 style={{ margin: '0 0 8px 0', color: '#1a202c', fontSize: '14px', fontWeight: '600' }}>
                      Description
                    </h5>
                    <p style={{ margin: 0, color: '#718096', fontSize: '14px' }}>
                      {selectedService.description}
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Pricing Modal Component
  const PricingModal = () => {
    if (!showPricingModal || !selectedService) return null;

    return (
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
        zIndex: 1001,
        padding: '20px'
      }}>
        <div style={{
          backgroundColor: '#fff',
          borderRadius: '16px',
          maxWidth: '500px',
          width: '100%',
          overflow: 'hidden'
        }}>
          <div style={{
            padding: '24px',
            borderBottom: '1px solid #e2e8f0',
            backgroundColor: '#f8f9fa'
          }}>
            <h3 style={{ margin: 0, color: '#1a202c', fontSize: '18px', fontWeight: '600' }}>
              Update Pricing - {selectedService.displayName}
            </h3>
          </div>

          <div style={{ padding: '24px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600' }}>
                  Markup %
                </label>
                <input
                  type="number"
                  value={pricingForm.markupPercentage}
                  onChange={(e) => setPricingForm(prev => ({ ...prev, markupPercentage: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '2px solid #e2e8f0',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                  min="0"
                  max="100"
                  step="0.1"
                />
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600' }}>
                  Flat Fee (₦)
                </label>
                <input
                  type="number"
                  value={pricingForm.flatFee}
                  onChange={(e) => setPricingForm(prev => ({ ...prev, flatFee: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '2px solid #e2e8f0',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                  min="0"
                  step="1"
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '24px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600' }}>
                  Min Amount
                </label>
                <input
                  type="number"
                  value={pricingForm.minAmount}
                  onChange={(e) => setPricingForm(prev => ({ ...prev, minAmount: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '2px solid #e2e8f0',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                  min="0"
                  step="1"
                />
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600' }}>
                  Max Amount
                </label>
                <input
                  type="number"
                  value={pricingForm.maxAmount}
                  onChange={(e) => setPricingForm(prev => ({ ...prev, maxAmount: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '2px solid #e2e8f0',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                  min="0"
                  step="1"
                />
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600' }}>
                  Daily Limit
                </label>
                <input
                  type="number"
                  value={pricingForm.dailyLimit}
                  onChange={(e) => setPricingForm(prev => ({ ...prev, dailyLimit: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '2px solid #e2e8f0',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                  min="0"
                  step="1"
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowPricingModal(false);
                  setShowServiceModal(true);
                }}
                disabled={actionLoading}
                style={{
                  padding: '10px 20px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  backgroundColor: '#fff',
                  color: '#718096',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: actionLoading ? 'not-allowed' : 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handlePricingSubmit}
                disabled={actionLoading}
                style={{
                  padding: '10px 20px',
                  border: 'none',
                  borderRadius: '8px',
                  backgroundColor: '#007bff',
                  color: '#fff',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: actionLoading ? 'not-allowed' : 'pointer'
                }}
              >
                {actionLoading ? 'Updating...' : 'Update Pricing'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Analytics Modal Component
  const AnalyticsModal = () => {
    if (!showAnalyticsModal || !selectedService) return null;

    return (
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
        zIndex: 1001,
        padding: '20px'
      }}>
        <div style={{
          backgroundColor: '#fff',
          borderRadius: '16px',
          maxWidth: '600px',
          width: '100%',
          maxHeight: '80vh',
          overflow: 'auto'
        }}>
          <div style={{
            padding: '24px',
            borderBottom: '1px solid #e2e8f0',
            backgroundColor: '#f8f9fa'
          }}>
            <h3 style={{ margin: 0, color: '#1a202c', fontSize: '18px', fontWeight: '600' }}>
              Analytics - {selectedService.displayName}
            </h3>
          </div>

          <div style={{ padding: '24px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '24px' }}>
              <div style={{ textAlign: 'center', padding: '16px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#28a745' }}>
                  {selectedService.statistics?.successRate || 0}%
                </div>
                <div style={{ fontSize: '12px', color: '#718096' }}>Success Rate</div>
              </div>
              <div style={{ textAlign: 'center', padding: '16px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#007bff' }}>
                  {formatCurrency(selectedService.statistics?.totalRevenue || 0)}
                </div>
                <div style={{ fontSize: '12px', color: '#718096' }}>Total Revenue</div>
              </div>
            </div>

            {selectedService.analytics && (
              <div style={{ marginBottom: '24px' }}>
                <h5 style={{ margin: '0 0 16px 0', color: '#1a202c', fontSize: '16px', fontWeight: '600' }}>
                  Recent Performance
                </h5>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div style={{ padding: '16px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
                    <h6 style={{ margin: '0 0 8px 0', color: '#1a202c', fontSize: '14px', fontWeight: '600' }}>
                      Last 24 Hours
                    </h6>
                    <p style={{ margin: '0', color: '#718096', fontSize: '14px' }}>
                      Transactions: {selectedService.analytics.last24Hours?.transactions || 0}<br/>
                      Revenue: {formatCurrency(selectedService.analytics.last24Hours?.revenue || 0)}<br/>
                      Success Rate: {selectedService.analytics.last24Hours?.successRate || 0}%
                    </p>
                  </div>
                  <div style={{ padding: '16px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
                    <h6 style={{ margin: '0 0 8px 0', color: '#1a202c', fontSize: '14px', fontWeight: '600' }}>
                      Last 7 Days
                    </h6>
                    <p style={{ margin: '0', color: '#718096', fontSize: '14px' }}>
                      Transactions: {selectedService.analytics.last7Days?.transactions || 0}<br/>
                      Revenue: {formatCurrency(selectedService.analytics.last7Days?.revenue || 0)}<br/>
                      Success Rate: {selectedService.analytics.last7Days?.successRate || 0}%
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div style={{ marginBottom: '16px' }}>
              <h5 style={{ margin: '0 0 8px 0', color: '#1a202c', fontSize: '14px', fontWeight: '600' }}>
                Performance Metrics
              </h5>
              <div style={{ fontSize: '14px', color: '#718096' }}>
                Last updated: {new Date(selectedService.lastModified).toLocaleString()}
              </div>
            </div>

            <div style={{ 
              height: '200px', 
              backgroundColor: '#f8f9fa', 
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#718096',
              marginBottom: '24px',
              border: '2px dashed #e2e8f0'
            }}>
              Transaction Volume Chart (Integration with charting library needed)
            </div>

            <div style={{ 
              height: '200px', 
              backgroundColor: '#f8f9fa', 
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#718096',
              border: '2px dashed #e2e8f0'
            }}>
              Revenue Trend Chart (Integration with charting library needed)
            </div>
          </div>

          <div style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0', textAlign: 'right' }}>
            <button
              onClick={() => {
                setShowAnalyticsModal(false);
                setShowServiceModal(true);
              }}
              style={{
                padding: '8px 16px',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                backgroundColor: '#fff',
                color: '#718096',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Bulk Actions Dropdown
  const BulkActionsDropdown = () => {
    if (!showBulkActions || selectedServices.length === 0) return null;

    return (
      <div style={{
        position: 'absolute',
        right: 0,
        top: '100%',
        backgroundColor: '#fff',
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1)',
        zIndex: 100,
        minWidth: '150px',
        marginTop: '4px'
      }}>
        <button
          onClick={() => performBulkAction('activate', selectedServices)}
          disabled={actionLoading}
          style={{
            width: '100%',
            padding: '12px 16px',
            border: 'none',
            backgroundColor: 'transparent',
            textAlign: 'left',
            fontSize: '14px',
            cursor: actionLoading ? 'not-allowed' : 'pointer',
            borderBottom: '1px solid #f1f5f9'
          }}
        >
          Activate Selected
        </button>
        <button
          onClick={() => performBulkAction('deactivate', selectedServices)}
          disabled={actionLoading}
          style={{
            width: '100%',
            padding: '12px 16px',
            border: 'none',
            backgroundColor: 'transparent',
            textAlign: 'left',
            fontSize: '14px',
            cursor: actionLoading ? 'not-allowed' : 'pointer',
            borderBottom: '1px solid #f1f5f9'
          }}
        >
          Deactivate Selected
        </button>
        <button
          onClick={() => performBulkAction('maintenance', selectedServices)}
          disabled={actionLoading}
          style={{
            width: '100%',
            padding: '12px 16px',
            border: 'none',
            backgroundColor: 'transparent',
            textAlign: 'left',
            fontSize: '14px',
            cursor: actionLoading ? 'not-allowed' : 'pointer'
          }}
        >
          Maintenance Mode
        </button>
      </div>
    );
  };

  return (
    <div style={{
      width: '100%',
      maxWidth: '100%',
      backgroundColor: '#f8f9fa',
      minHeight: '100vh',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
      
      <NotificationBanner />
      
      {/* Header Stats Cards */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: isMobile ? '16px' : '24px',
        marginBottom: '32px',
        padding: '20px'
      }}>
        {[
          { label: 'Total Services', value: stats.totalServices, color: '#ff3b30', icon: '🔧' },
          { label: 'Active Services', value: stats.activeServices, color: '#28a745', icon: '✅' },
          { label: 'Maintenance', value: stats.maintenanceServices, color: '#ffc107', icon: '⚠️' },
          { label: 'Inactive', value: stats.inactiveServices, color: '#6c757d', icon: '⏸️' }
        ].map((stat, index) => (
          <div key={index} style={{
            backgroundColor: '#fff',
            padding: isMobile ? '20px' : '24px',
            borderRadius: '16px',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1)',
            border: '1px solid #e2e8f0',
            flex: '1',
            minWidth: isMobile ? '140px' : '200px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <span style={{ fontSize: '24px' }}>{stat.icon}</span>
              <h3 style={{ color: '#1a202c', fontSize: '14px', fontWeight: '600', margin: 0 }}>
                {stat.label}
              </h3>
            </div>
            <p style={{ color: stat.color, fontSize: isMobile ? '20px' : '24px', fontWeight: '700', margin: 0 }}>
              {stat.value.toLocaleString()}
            </p>
          </div>
        ))}
      </div>

      {/* Main Content Card */}
      <div style={{
        backgroundColor: '#fff',
        borderRadius: '16px',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1)',
        border: '1px solid #e2e8f0',
        overflow: 'hidden',
        margin: '0 20px 20px 20px'
      }}>
        {/* Filters and Search Header */}
        <div style={{
          padding: isMobile ? '20px' : '24px',
          borderBottom: '1px solid #e2e8f0',
          backgroundColor: '#f8f9fa'
        }}>
          <div style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            gap: '16px',
            alignItems: isMobile ? 'stretch' : 'center',
            justifyContent: 'space-between',
            marginBottom: '20px'
          }}>
            <h2 style={{
              color: '#1a202c',
              fontSize: isMobile ? '20px' : '24px',
              fontWeight: '700',
              margin: 0
            }}>
              Service Management
            </h2>

            {selectedServices.length > 0 && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '8px 16px',
                backgroundColor: '#fff5f5',
                borderRadius: '8px',
                border: '1px solid #fed7d7',
                position: 'relative'
              }}>
                <span style={{ fontSize: '14px', color: '#ff3b30', fontWeight: '600' }}>
                  {selectedServices.length} service{selectedServices.length > 1 ? 's' : ''} selected
                </span>
                <button
                  onClick={() => setShowBulkActions(!showBulkActions)}
                  disabled={actionLoading}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: '#ff3b30',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: actionLoading ? 'not-allowed' : 'pointer',
                    opacity: actionLoading ? 0.7 : 1
                  }}
                >
                  {actionLoading ? 'Processing...' : 'Bulk Actions'}
                </button>
                <BulkActionsDropdown />
              </div>
            )}
          </div>

          {/* Search and Filters */}
          <div style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            gap: '16px',
            alignItems: 'stretch'
          }}>
            {/* Search */}
            <div style={{ flex: '1', position: 'relative' }}>
              <input
                type="text"
                placeholder="Search services by name or type..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 16px 12px 40px',
                  border: '2px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '14px',
                  backgroundColor: '#fff',
                  boxSizing: 'border-box'
                }}
              />
              <span style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#718096',
                fontSize: '16px'
              }}>
                🔍
              </span>
            </div>

            {/* Status Filter */}
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              style={{
                padding: '12px 16px',
                border: '2px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '14px',
                backgroundColor: '#fff',
                minWidth: '120px'
              }}
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="maintenance">Maintenance</option>
            </select>

            {/* Service Type Filter */}
            <select
              value={filters.serviceType}
              onChange={(e) => handleFilterChange('serviceType', e.target.value)}
              style={{
                padding: '12px 16px',
                border: '2px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '14px',
                backgroundColor: '#fff',
                minWidth: '140px'
              }}
            >
              <option value="">All Types</option>
              {Object.entries(SERVICE_CONFIG).map(([key, config]) => (
                <option key={key} value={key}>{config.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Services Table */}
        <div style={{ overflowX: 'auto' }}>
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center' }}>
              <div style={{
                display: 'inline-block',
                width: '40px',
                height: '40px',
                border: '4px solid #f3f3f3',
                borderTop: '4px solid #ff3b30',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }} />
              <p style={{ marginTop: '16px', color: '#718096' }}>Loading services...</p>
            </div>
          ) : services.length === 0 ? (
            <div style={{ padding: '60px 20px', textAlign: 'center', color: '#718096' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔧</div>
              <h3 style={{ color: '#1a202c', marginBottom: '8px' }}>No services found</h3>
              <p>No services are configured in the system or match your search criteria</p>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8f9fa' }}>
                  <th style={{ padding: '16px', textAlign: 'left', borderBottom: '1px solid #e2e8f0', width: '50px' }}>
                    <input
                      type="checkbox"
                      checked={selectedServices.length === services.length && services.length > 0}
                      onChange={selectAllServices}
                      style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                    />
                  </th>
                  <th style={{ padding: '16px', textAlign: 'left', fontSize: '14px', fontWeight: '600', color: '#1a202c', borderBottom: '1px solid #e2e8f0' }}>
                    Service
                  </th>
                  <th style={{ padding: '16px', textAlign: 'left', fontSize: '14px', fontWeight: '600', color: '#1a202c', borderBottom: '1px solid #e2e8f0' }}>
                    Status
                  </th>
                  <th style={{ padding: '16px', textAlign: 'left', fontSize: '14px', fontWeight: '600', color: '#1a202c', borderBottom: '1px solid #e2e8f0' }}>
                    Pricing
                  </th>
                  <th style={{ padding: '16px', textAlign: 'left', fontSize: '14px', fontWeight: '600', color: '#1a202c', borderBottom: '1px solid #e2e8f0' }}>
                    Limits
                  </th>
                  <th style={{ padding: '16px', textAlign: 'right', fontSize: '14px', fontWeight: '600', color: '#1a202c', borderBottom: '1px solid #e2e8f0', width: '120px' }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {services.map((service) => (
                  <tr
                    key={service._id}
                    style={{
                      borderBottom: '1px solid #f1f5f9',
                      backgroundColor: selectedServices.includes(service._id) ? '#fff5f5' : '#fff'
                    }}
                  >
                    <td style={{ padding: '16px' }}>
                      <input
                        type="checkbox"
                        checked={selectedServices.includes(service._id)}
                        onChange={() => handleServiceSelect(service._id)}
                        style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                      />
                    </td>
                    <td style={{ padding: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ fontSize: '24px' }}>
                          {getServiceIcon(service.serviceType)}
                        </div>
                        <div>
                          <div style={{ fontWeight: '600', color: '#1a202c', fontSize: '14px' }}>
                            {service.displayName}
                          </div>
                          <div style={{ color: '#718096', fontSize: '12px' }}>
                            {service.serviceType}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '16px' }}>
                      {getStatusBadge(service)}
                    </td>
                    <td style={{ padding: '16px' }}>
                      <div style={{ fontWeight: '600', color: '#1a202c', fontSize: '14px' }}>
                        {service.pricing?.markupPercentage}% + {formatCurrency(service.pricing?.flatFee || 0)}
                      </div>
                      <div style={{ color: '#718096', fontSize: '12px' }}>
                        Markup + Fee
                      </div>
                    </td>
                    <td style={{ padding: '16px' }}>
                      <div style={{ color: '#1a202c', fontSize: '14px' }}>
                        {formatCurrency(service.limits?.min || 0)} - {formatCurrency(service.limits?.max || 0)}
                      </div>
                      <div style={{ color: '#718096', fontSize: '12px' }}>
                        Daily: {formatCurrency(service.limits?.dailyLimit || 0)}
                      </div>
                    </td>
                    <td style={{ padding: '16px', textAlign: 'right' }}>
                      <button
                        onClick={() => handleViewDetails(service)}
                        disabled={serviceDetailsLoading}
                        style={{
                          padding: '6px 12px',
                          backgroundColor: '#f7fafc',
                          border: '1px solid #e2e8f0',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: '600',
                          color: '#1a202c',
                          cursor: serviceDetailsLoading ? 'not-allowed' : 'pointer',
                          opacity: serviceDetailsLoading ? 0.7 : 1
                        }}
                      >
                        {serviceDetailsLoading ? 'Loading...' : 'Manage'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {!loading && services.length > 0 && (
          <div style={{ padding: '20px 24px', borderTop: '1px solid #e2e8f0' }}>
            <PaginationControls />
          </div>
        )}
      </div>

      {/* Modals */}
      <ServiceModal />
      <PricingModal />
      <AnalyticsModal />
    </div>
  );
};

export default ServiceManagement;