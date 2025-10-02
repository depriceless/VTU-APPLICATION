import React, { useState, useEffect, useCallback } from 'react';

const FinancialManagement = () => {
  const [activeTab, setActiveTab] = useState('revenue-reports');
  const [isMobile, setIsMobile] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [token, setToken] = useState('');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Financial data states
  const [revenueData, setRevenueData] = useState({
    todayRevenue: 0,
    weeklyRevenue: 0,
    monthlyRevenue: 0,
    yearlyRevenue: 0,
    revenueGrowth: 0,
    topServices: [],
    recentTransactions: []
  });

  const [commissionSettings, setCommissionSettings] = useState({
    airtime: { percentage: 2.5, flatFee: 0 },
    data: { percentage: 3.0, flatFee: 0 },
    electricity: { percentage: 1.5, flatFee: 10 },
    cableTv: { percentage: 2.0, flatFee: 25 },
    betting: { percentage: 1.0, flatFee: 0 }
  });

  const [walletStats, setWalletStats] = useState({
    totalBalance: 0,
    totalUsers: 0,
    activeWallets: 0,
    pendingTransactions: 0,
    lowBalanceUsers: 0,
    recentActivities: []
  });

  const [settlementData, setSettlementData] = useState({
    pendingSettlements: 0,
    completedToday: 0,
    totalSettled: 0,
    settlements: []
  });

  const [bankAccounts, setBankAccounts] = useState([]);
  const [taxReports, setTaxReports] = useState({
    currentMonth: 0,
    currentQuarter: 0,
    currentYear: 0,
    breakdown: []
  });

  // Form states
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });

  const [newCommissionForm, setNewCommissionForm] = useState({
    service: 'airtime',
    percentage: '',
    flatFee: ''
  });

  const [bankAccountForm, setBankAccountForm] = useState({
    accountName: '',
    accountNumber: '',
    bankName: '',
    bankCode: '',
    isActive: true
  });

  // API Base URL
  const API_BASE_URL = import.meta?.env?.VITE_API_URL || 'https://vtu-application.onrender.com';

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

  const formatCurrency = useCallback((amount) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0
    }).format(amount);
  }, []);

  const formatNumber = useCallback((num) => {
    return new Intl.NumberFormat('en-NG').format(num);
  }, []);

  // Check mobile screen
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Initialize token
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

  // API Functions
  const fetchRevenueData = useCallback(async () => {
    if (!token) return;
    
    try {
      const data = await makeApiCall(`/api/admin/financial/revenue?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`);
      setRevenueData(data.data || data);
    } catch (error) {
      console.error('Error fetching revenue data:', error);
      showNotification(`Failed to fetch revenue data: ${error.message}`, 'error');
    }
  }, [token, makeApiCall, showNotification, dateRange]);

  const fetchCommissionSettings = useCallback(async () => {
    if (!token) return;
    
    try {
      const data = await makeApiCall('/api/admin/financial/commissions');
      setCommissionSettings(data.data || data);
    } catch (error) {
      console.error('Error fetching commission settings:', error);
      showNotification(`Failed to fetch commission settings: ${error.message}`, 'error');
    }
  }, [token, makeApiCall, showNotification]);

  const fetchWalletStats = useCallback(async () => {
    if (!token) return;
    
    try {
      const data = await makeApiCall('/api/admin/financial/wallet-stats');
      setWalletStats(data.data || data);
    } catch (error) {
      console.error('Error fetching wallet stats:', error);
      showNotification(`Failed to fetch wallet statistics: ${error.message}`, 'error');
    }
  }, [token, makeApiCall, showNotification]);

  const fetchSettlementData = useCallback(async () => {
    if (!token) return;
    
    try {
      const data = await makeApiCall('/api/admin/financial/settlements');
      setSettlementData(data.data || data);
    } catch (error) {
      console.error('Error fetching settlement data:', error);
      showNotification(`Failed to fetch settlement data: ${error.message}`, 'error');
    }
  }, [token, makeApiCall, showNotification]);

  const fetchBankAccounts = useCallback(async () => {
    if (!token) return;
    
    try {
      const data = await makeApiCall('/api/admin/financial/bank-accounts');
      setBankAccounts(data.data || data);
    } catch (error) {
      console.error('Error fetching bank accounts:', error);
      showNotification(`Failed to fetch bank accounts: ${error.message}`, 'error');
    }
  }, [token, makeApiCall, showNotification]);

  const fetchTaxReports = useCallback(async () => {
    if (!token) return;
    
    try {
      const data = await makeApiCall('/api/admin/financial/tax-reports');
      setTaxReports(data.data || data);
    } catch (error) {
      console.error('Error fetching tax reports:', error);
      showNotification(`Failed to fetch tax reports: ${error.message}`, 'error');
    }
  }, [token, makeApiCall, showNotification]);

  const updateCommissionSettings = useCallback(async (service, settings) => {
    if (!token) return;
    
    try {
      setActionLoading(true);
      await makeApiCall('/api/admin/financial/commissions', {
        method: 'PUT',
        body: JSON.stringify({ service, ...settings })
      });
      
      setCommissionSettings(prev => ({
        ...prev,
        [service]: settings
      }));
      
      showNotification('Commission settings updated successfully');
    } catch (error) {
      console.error('Error updating commission settings:', error);
      showNotification(`Failed to update commission settings: ${error.message}`, 'error');
    } finally {
      setActionLoading(false);
    }
  }, [token, makeApiCall, showNotification]);

  const addBankAccount = useCallback(async (accountData) => {
    if (!token) return;
    
    try {
      setActionLoading(true);
      const data = await makeApiCall('/api/admin/financial/bank-accounts', {
        method: 'POST',
        body: JSON.stringify(accountData)
      });
      
      setBankAccounts(prev => [...prev, data.data || data]);
      setBankAccountForm({
        accountName: '',
        accountNumber: '',
        bankName: '',
        bankCode: '',
        isActive: true
      });
      
      showNotification('Bank account added successfully');
    } catch (error) {
      console.error('Error adding bank account:', error);
      showNotification(`Failed to add bank account: ${error.message}`, 'error');
    } finally {
      setActionLoading(false);
    }
  }, [token, makeApiCall, showNotification]);

  const processSettlement = useCallback(async (settlementId) => {
    if (!token) return;
    
    try {
      setActionLoading(true);
      await makeApiCall(`/api/admin/financial/settlements/${settlementId}/process`, {
        method: 'POST'
      });
      
      await fetchSettlementData();
      showNotification('Settlement processed successfully');
    } catch (error) {
      console.error('Error processing settlement:', error);
      showNotification(`Failed to process settlement: ${error.message}`, 'error');
    } finally {
      setActionLoading(false);
    }
  }, [token, makeApiCall, showNotification, fetchSettlementData]);

  // Load data on component mount and tab changes
  useEffect(() => {
    if (token) {
      setLoading(true);
      const loadData = async () => {
        try {
          switch (activeTab) {
            case 'revenue-reports':
              await fetchRevenueData();
              break;
            case 'commission-settings':
              await fetchCommissionSettings();
              break;
            case 'wallet-management':
              await fetchWalletStats();
              break;
            case 'bank-integration':
              await fetchBankAccounts();
              break;
            case 'settlement-reports':
              await fetchSettlementData();
              break;
            case 'tax-reports':
              await fetchTaxReports();
              break;
            default:
              break;
          }
        } finally {
          setLoading(false);
        }
      };
      
      loadData();
    }
  }, [token, activeTab, fetchRevenueData, fetchCommissionSettings, fetchWalletStats, fetchBankAccounts, fetchSettlementData, fetchTaxReports]);

  // Tab configuration
  const tabs = [
    { id: 'revenue-reports', label: 'Revenue Reports', icon: '📈' },
    { id: 'commission-settings', label: 'Commission Settings', icon: '💰' },
    { id: 'wallet-management', label: 'Wallet Management', icon: '👛' },
    { id: 'bank-integration', label: 'Bank Integration', icon: '🏦' },
    { id: 'settlement-reports', label: 'Settlement Reports', icon: '📄' },
    { id: 'tax-reports', label: 'Tax Reports', icon: '📊' }
  ];

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

  // Revenue Reports Component
  const RevenueReports = () => (
    <div style={{ width: '100%' }}>
      {/* Date Range Filter */}
      <div style={{
        backgroundColor: '#fff',
        padding: '20px',
        borderRadius: '12px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        marginBottom: '24px',
        border: '1px solid #e2e8f0'
      }}>
        <h3 style={{ margin: '0 0 16px 0', color: '#1a202c', fontSize: '18px', fontWeight: '600' }}>
          Revenue Overview
        </h3>
        <div style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          gap: '16px',
          alignItems: isMobile ? 'stretch' : 'center',
          marginBottom: '20px'
        }}>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600' }}>
              Start Date
            </label>
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
              style={{
                padding: '8px 12px',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                fontSize: '14px'
              }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600' }}>
              End Date
            </label>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
              style={{
                padding: '8px 12px',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                fontSize: '14px'
              }}
            />
          </div>
          <button
            onClick={fetchRevenueData}
            style={{
              padding: '8px 16px',
              backgroundColor: '#ff3b30',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              marginTop: isMobile ? '0' : '28px'
            }}
          >
            Update Report
          </button>
        </div>
      </div>

      {/* Revenue Stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
        marginBottom: '24px'
      }}>
        {[
          { label: 'Today', value: revenueData.todayRevenue, icon: '📅', color: '#ff3b30' },
          { label: 'This Week', value: revenueData.weeklyRevenue, icon: '📊', color: '#28a745' },
          { label: 'This Month', value: revenueData.monthlyRevenue, icon: '📈', color: '#ffc107' },
          { label: 'This Year', value: revenueData.yearlyRevenue, icon: '🏆', color: '#dc3545' }
        ].map((stat, index) => (
          <div key={index} style={{
            backgroundColor: '#fff',
            padding: '20px',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
            border: '1px solid #e2e8f0',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>{stat.icon}</div>
            <h4 style={{ margin: '0 0 8px 0', color: '#1a202c', fontSize: '14px', fontWeight: '600' }}>
              {stat.label}
            </h4>
            <p style={{ margin: 0, color: stat.color, fontSize: '20px', fontWeight: '700' }}>
              {formatCurrency(stat.value)}
            </p>
          </div>
        ))}
      </div>

      {/* Top Services */}
      <div style={{
        backgroundColor: '#fff',
        padding: '20px',
        borderRadius: '12px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        border: '1px solid #e2e8f0'
      }}>
        <h3 style={{ margin: '0 0 16px 0', color: '#1a202c', fontSize: '18px', fontWeight: '600' }}>
          Top Performing Services
        </h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8f9fa' }}>
                <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: '600', borderBottom: '1px solid #e2e8f0' }}>
                  Service
                </th>
                <th style={{ padding: '12px', textAlign: 'right', fontSize: '14px', fontWeight: '600', borderBottom: '1px solid #e2e8f0' }}>
                  Revenue
                </th>
                <th style={{ padding: '12px', textAlign: 'right', fontSize: '14px', fontWeight: '600', borderBottom: '1px solid #e2e8f0' }}>
                  Transactions
                </th>
                <th style={{ padding: '12px', textAlign: 'right', fontSize: '14px', fontWeight: '600', borderBottom: '1px solid #e2e8f0' }}>
                  Growth
                </th>
              </tr>
            </thead>
            <tbody>
              {revenueData.topServices.length > 0 ? revenueData.topServices.map((service, index) => (
                <tr key={index} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '16px' }}>{service.icon}</span>
                      <span style={{ fontSize: '14px', fontWeight: '600' }}>{service.name}</span>
                    </div>
                  </td>
                  <td style={{ padding: '12px', textAlign: 'right', fontSize: '14px', fontWeight: '600', color: '#28a745' }}>
                    {formatCurrency(service.revenue)}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'right', fontSize: '14px' }}>
                    {formatNumber(service.transactions)}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'right', fontSize: '14px', color: service.growth >= 0 ? '#28a745' : '#dc3545' }}>
                    {service.growth >= 0 ? '+' : ''}{service.growth.toFixed(1)}%
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="4" style={{ padding: '20px', textAlign: 'center', color: '#718096' }}>
                    No data available for selected period
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  // Commission Settings Component
  const CommissionSettings = () => (
    <div style={{ width: '100%' }}>
      <div style={{
        backgroundColor: '#fff',
        padding: '20px',
        borderRadius: '12px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        border: '1px solid #e2e8f0'
      }}>
        <h3 style={{ margin: '0 0 16px 0', color: '#1a202c', fontSize: '18px', fontWeight: '600' }}>
          Service Commission Settings
        </h3>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '20px'
        }}>
          {Object.entries(commissionSettings).map(([service, settings]) => (
            <div key={service} style={{
              padding: '16px',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              backgroundColor: '#f8f9fa'
            }}>
              <h4 style={{ margin: '0 0 12px 0', color: '#1a202c', fontSize: '16px', fontWeight: '600', textTransform: 'capitalize' }}>
                {service.replace(/([A-Z])/g, ' $1').trim()}
              </h4>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600' }}>
                    Percentage (%)
                  </label>
                  <input
                    type="number"
                    value={settings.percentage}
                    onChange={(e) => setCommissionSettings(prev => ({
                      ...prev,
                      [service]: { ...prev[service], percentage: parseFloat(e.target.value) || 0 }
                    }))}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #e2e8f0',
                      borderRadius: '6px',
                      fontSize: '14px',
                      boxSizing: 'border-box'
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
                    value={settings.flatFee}
                    onChange={(e) => setCommissionSettings(prev => ({
                      ...prev,
                      [service]: { ...prev[service], flatFee: parseFloat(e.target.value) || 0 }
                    }))}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #e2e8f0',
                      borderRadius: '6px',
                      fontSize: '14px',
                      boxSizing: 'border-box'
                    }}
                    min="0"
                    step="1"
                  />
                </div>
              </div>
              
              <button
                onClick={() => updateCommissionSettings(service, settings)}
                disabled={actionLoading}
                style={{
                  width: '100%',
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
                {actionLoading ? 'Updating...' : 'Update Commission'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // Wallet Management Component
  const WalletManagement = () => (
    <div style={{ width: '100%' }}>
      {/* Wallet Stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
        marginBottom: '24px'
      }}>
        {[
          { label: 'Total Balance', value: walletStats.totalBalance, icon: '💰', format: 'currency' },
          { label: 'Total Users', value: walletStats.totalUsers, icon: '👥', format: 'number' },
          { label: 'Active Wallets', value: walletStats.activeWallets, icon: '✅', format: 'number' },
          { label: 'Low Balance Users', value: walletStats.lowBalanceUsers, icon: '⚠️', format: 'number' }
        ].map((stat, index) => (
          <div key={index} style={{
            backgroundColor: '#fff',
            padding: '20px',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
            border: '1px solid #e2e8f0',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>{stat.icon}</div>
            <h4 style={{ margin: '0 0 8px 0', color: '#1a202c', fontSize: '14px', fontWeight: '600' }}>
              {stat.label}
            </h4>
            <p style={{ margin: 0, color: '#ff3b30', fontSize: '20px', fontWeight: '700' }}>
              {stat.format === 'currency' ? formatCurrency(stat.value) : formatNumber(stat.value)}
            </p>
          </div>
        ))}
      </div>

      {/* Recent Wallet Activities */}
      <div style={{
        backgroundColor: '#fff',
        padding: '20px',
        borderRadius: '12px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        border: '1px solid #e2e8f0'
      }}>
        <h3 style={{ margin: '0 0 16px 0', color: '#1a202c', fontSize: '18px', fontWeight: '600' }}>
          Recent Wallet Activities
        </h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8f9fa' }}>
                <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: '600', borderBottom: '1px solid #e2e8f0' }}>
                  User
                </th>
                <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: '600', borderBottom: '1px solid #e2e8f0' }}>
                  Transaction
                </th>
                <th style={{ padding: '12px', textAlign: 'right', fontSize: '14px', fontWeight: '600', borderBottom: '1px solid #e2e8f0' }}>
                  Amount
                </th>
                <th style={{ padding: '12px', textAlign: 'center', fontSize: '14px', fontWeight: '600', borderBottom: '1px solid #e2e8f0' }}>
                  Status
                </th>
                <th style={{ padding: '12px', textAlign: 'right', fontSize: '14px', fontWeight: '600', borderBottom: '1px solid #e2e8f0' }}>
                  Time
                </th>
              </tr>
            </thead>
            <tbody>
              {walletStats.recentActivities.length > 0 ? walletStats.recentActivities.map((activity, index) => (
                <tr key={index} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '12px', fontSize: '14px', fontWeight: '600' }}>
                    {activity.userName}
                  </td>
                  <td style={{ padding: '12px', fontSize: '14px' }}>
                    {activity.type}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'right', fontSize: '14px', fontWeight: '600', color: activity.type === 'Credit' ? '#28a745' : '#dc3545' }}>
                    {activity.type === 'Credit' ? '+' : '-'}{formatCurrency(activity.amount)}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    <span style={{
                      backgroundColor: activity.status === 'Completed' ? '#d4edda' : activity.status === 'Pending' ? '#fff3cd' : '#f8d7da',
                      color: activity.status === 'Completed' ? '#155724' : activity.status === 'Pending' ? '#856404' : '#721c24',
                      padding: '4px 8px',
                      borderRadius: '12px',
                      fontSize: '11px',
                      fontWeight: '600'
                    }}>
                      {activity.status}
                    </span>
                  </td>
                  <td style={{ padding: '12px', textAlign: 'right', fontSize: '12px', color: '#718096' }}>
                    {activity.timestamp}
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="5" style={{ padding: '20px', textAlign: 'center', color: '#718096' }}>
                    No recent wallet activities
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  // Bank Integration Component
  const BankIntegration = () => (
    <div style={{ width: '100%' }}>
      {/* Add New Bank Account Form */}
      <div style={{
        backgroundColor: '#fff',
        padding: '20px',
        borderRadius: '12px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        border: '1px solid #e2e8f0',
        marginBottom: '24px'
      }}>
        <h3 style={{ margin: '0 0 16px 0', color: '#1a202c', fontSize: '18px', fontWeight: '600' }}>
          Add New Bank Account
        </h3>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
          gap: '16px',
          marginBottom: '20px'
        }}>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600' }}>
              Account Name
            </label>
            <input
              type="text"
              value={bankAccountForm.accountName}
              onChange={(e) => setBankAccountForm(prev => ({ ...prev, accountName: e.target.value }))}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                fontSize: '14px',
                boxSizing: 'border-box'
              }}
              placeholder="Enter account name"
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600' }}>
              Account Number
            </label>
            <input
              type="text"
              value={bankAccountForm.accountNumber}
              onChange={(e) => setBankAccountForm(prev => ({ ...prev, accountNumber: e.target.value }))}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                fontSize: '14px',
                boxSizing: 'border-box'
              }}
              placeholder="Enter account number"
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600' }}>
              Bank Name
            </label>
            <select
              value={bankAccountForm.bankName}
              onChange={(e) => setBankAccountForm(prev => ({ ...prev, bankName: e.target.value, bankCode: e.target.selectedOptions[0].dataset.code || '' }))}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                fontSize: '14px',
                boxSizing: 'border-box'
              }}
            >
              <option value="">Select Bank</option>
              <option value="Access Bank" data-code="044">Access Bank</option>
              <option value="GTBank" data-code="058">GTBank</option>
              <option value="First Bank" data-code="011">First Bank</option>
              <option value="UBA" data-code="033">UBA</option>
              <option value="Zenith Bank" data-code="057">Zenith Bank</option>
              <option value="Fidelity Bank" data-code="070">Fidelity Bank</option>
              <option value="Sterling Bank" data-code="232">Sterling Bank</option>
              <option value="Union Bank" data-code="032">Union Bank</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600' }}>
              Status
            </label>
            <select
              value={bankAccountForm.isActive}
              onChange={(e) => setBankAccountForm(prev => ({ ...prev, isActive: e.target.value === 'true' }))}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                fontSize: '14px',
                boxSizing: 'border-box'
              }}
            >
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>
        </div>
        
        <button
          onClick={() => addBankAccount(bankAccountForm)}
          disabled={actionLoading || !bankAccountForm.accountName || !bankAccountForm.accountNumber || !bankAccountForm.bankName}
          style={{
            padding: '10px 20px',
            backgroundColor: '#ff3b30',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: actionLoading ? 'not-allowed' : 'pointer',
            opacity: actionLoading || !bankAccountForm.accountName || !bankAccountForm.accountNumber || !bankAccountForm.bankName ? 0.7 : 1
          }}
        >
          {actionLoading ? 'Adding...' : 'Add Bank Account'}
        </button>
      </div>

      {/* Existing Bank Accounts */}
      <div style={{
        backgroundColor: '#fff',
        padding: '20px',
        borderRadius: '12px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        border: '1px solid #e2e8f0'
      }}>
        <h3 style={{ margin: '0 0 16px 0', color: '#1a202c', fontSize: '18px', fontWeight: '600' }}>
          Configured Bank Accounts
        </h3>
        
        {bankAccounts.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8f9fa' }}>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: '600', borderBottom: '1px solid #e2e8f0' }}>
                    Account Details
                  </th>
                  <th style={{ padding: '12px', textAlign: 'center', fontSize: '14px', fontWeight: '600', borderBottom: '1px solid #e2e8f0' }}>
                    Status
                  </th>
                  <th style={{ padding: '12px', textAlign: 'right', fontSize: '14px', fontWeight: '600', borderBottom: '1px solid #e2e8f0' }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {bankAccounts.map((account, index) => (
                  <tr key={index} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px' }}>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: '600', color: '#1a202c' }}>
                          {account.accountName}
                        </div>
                        <div style={{ fontSize: '12px', color: '#718096' }}>
                          {account.bankName} • {account.accountNumber}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <span style={{
                        backgroundColor: account.isActive ? '#d4edda' : '#f8d7da',
                        color: account.isActive ? '#155724' : '#721c24',
                        padding: '4px 8px',
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontWeight: '600'
                      }}>
                        {account.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right' }}>
                      <button
                        style={{
                          padding: '4px 8px',
                          backgroundColor: '#f7fafc',
                          border: '1px solid #e2e8f0',
                          borderRadius: '4px',
                          fontSize: '12px',
                          cursor: 'pointer',
                          marginRight: '8px'
                        }}
                      >
                        Edit
                      </button>
                      <button
                        style={{
                          padding: '4px 8px',
                          backgroundColor: '#fff5f5',
                          border: '1px solid #fed7d7',
                          borderRadius: '4px',
                          fontSize: '12px',
                          color: '#c53030',
                          cursor: 'pointer'
                        }}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px', color: '#718096' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🏦</div>
            <h4 style={{ margin: '0 0 8px 0' }}>No Bank Accounts Configured</h4>
            <p style={{ margin: 0 }}>Add your first bank account to enable settlement processing</p>
          </div>
        )}
      </div>
    </div>
  );

  // Settlement Reports Component
  const SettlementReports = () => (
    <div style={{ width: '100%' }}>
      {/* Settlement Stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
        marginBottom: '24px'
      }}>
        {[
          { label: 'Pending Settlements', value: settlementData.pendingSettlements, icon: '⏳', color: '#ffc107' },
          { label: 'Completed Today', value: settlementData.completedToday, icon: '✅', color: '#28a745' },
          { label: 'Total Settled', value: settlementData.totalSettled, icon: '💰', color: '#ff3b30' }
        ].map((stat, index) => (
          <div key={index} style={{
            backgroundColor: '#fff',
            padding: '20px',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
            border: '1px solid #e2e8f0',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>{stat.icon}</div>
            <h4 style={{ margin: '0 0 8px 0', color: '#1a202c', fontSize: '14px', fontWeight: '600' }}>
              {stat.label}
            </h4>
            <p style={{ margin: 0, color: stat.color, fontSize: '20px', fontWeight: '700' }}>
              {formatCurrency(stat.value)}
            </p>
          </div>
        ))}
      </div>

      {/* Settlement Table */}
      <div style={{
        backgroundColor: '#fff',
        padding: '20px',
        borderRadius: '12px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        border: '1px solid #e2e8f0'
      }}>
        <h3 style={{ margin: '0 0 16px 0', color: '#1a202c', fontSize: '18px', fontWeight: '600' }}>
          Settlement History
        </h3>
        
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8f9fa' }}>
                <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: '600', borderBottom: '1px solid #e2e8f0' }}>
                  Settlement ID
                </th>
                <th style={{ padding: '12px', textAlign: 'right', fontSize: '14px', fontWeight: '600', borderBottom: '1px solid #e2e8f0' }}>
                  Amount
                </th>
                <th style={{ padding: '12px', textAlign: 'center', fontSize: '14px', fontWeight: '600', borderBottom: '1px solid #e2e8f0' }}>
                  Status
                </th>
                <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: '600', borderBottom: '1px solid #e2e8f0' }}>
                  Bank Account
                </th>
                <th style={{ padding: '12px', textAlign: 'right', fontSize: '14px', fontWeight: '600', borderBottom: '1px solid #e2e8f0' }}>
                  Date
                </th>
                <th style={{ padding: '12px', textAlign: 'center', fontSize: '14px', fontWeight: '600', borderBottom: '1px solid #e2e8f0' }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {settlementData.settlements.length > 0 ? settlementData.settlements.map((settlement, index) => (
                <tr key={index} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '12px', fontSize: '14px', fontWeight: '600' }}>
                    {settlement.id}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'right', fontSize: '14px', fontWeight: '600', color: '#28a745' }}>
                    {formatCurrency(settlement.amount)}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    <span style={{
                      backgroundColor: settlement.status === 'Completed' ? '#d4edda' : settlement.status === 'Pending' ? '#fff3cd' : '#f8d7da',
                      color: settlement.status === 'Completed' ? '#155724' : settlement.status === 'Pending' ? '#856404' : '#721c24',
                      padding: '4px 8px',
                      borderRadius: '12px',
                      fontSize: '11px',
                      fontWeight: '600'
                    }}>
                      {settlement.status}
                    </span>
                  </td>
                  <td style={{ padding: '12px', fontSize: '14px' }}>
                    {settlement.bankAccount}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'right', fontSize: '12px', color: '#718096' }}>
                    {settlement.date}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    {settlement.status === 'Pending' && (
                      <button
                        onClick={() => processSettlement(settlement.id)}
                        disabled={actionLoading}
                        style={{
                          padding: '4px 8px',
                          backgroundColor: '#28a745',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '4px',
                          fontSize: '12px',
                          cursor: actionLoading ? 'not-allowed' : 'pointer'
                        }}
                      >
                        Process
                      </button>
                    )}
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="6" style={{ padding: '20px', textAlign: 'center', color: '#718096' }}>
                    No settlements found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  // Tax Reports Component
  const TaxReports = () => (
    <div style={{ width: '100%' }}>
      {/* Tax Overview */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
        marginBottom: '24px'
      }}>
        {[
          { label: 'Current Month VAT', value: taxReports.currentMonth, icon: '📊', color: '#ff3b30' },
          { label: 'Current Quarter', value: taxReports.currentQuarter, icon: '📈', color: '#28a745' },
          { label: 'Current Year', value: taxReports.currentYear, icon: '🏆', color: '#ffc107' }
        ].map((stat, index) => (
          <div key={index} style={{
            backgroundColor: '#fff',
            padding: '20px',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
            border: '1px solid #e2e8f0',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>{stat.icon}</div>
            <h4 style={{ margin: '0 0 8px 0', color: '#1a202c', fontSize: '14px', fontWeight: '600' }}>
              {stat.label}
            </h4>
            <p style={{ margin: 0, color: stat.color, fontSize: '20px', fontWeight: '700' }}>
              {formatCurrency(stat.value)}
            </p>
          </div>
        ))}
      </div>

      {/* Tax Breakdown */}
      <div style={{
        backgroundColor: '#fff',
        padding: '20px',
        borderRadius: '12px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        border: '1px solid #e2e8f0'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ margin: 0, color: '#1a202c', fontSize: '18px', fontWeight: '600' }}>
            Tax Breakdown by Service
          </h3>
          <button
            style={{
              padding: '8px 16px',
              backgroundColor: '#28a745',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            Export Report
          </button>
        </div>
        
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8f9fa' }}>
                <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: '600', borderBottom: '1px solid #e2e8f0' }}>
                  Service Category
                </th>
                <th style={{ padding: '12px', textAlign: 'right', fontSize: '14px', fontWeight: '600', borderBottom: '1px solid #e2e8f0' }}>
                  Gross Revenue
                </th>
                <th style={{ padding: '12px', textAlign: 'right', fontSize: '14px', fontWeight: '600', borderBottom: '1px solid #e2e8f0' }}>
                  VAT (7.5%)
                </th>
                <th style={{ padding: '12px', textAlign: 'right', fontSize: '14px', fontWeight: '600', borderBottom: '1px solid #e2e8f0' }}>
                  Net Revenue
                </th>
              </tr>
            </thead>
            <tbody>
              {taxReports.breakdown.length > 0 ? taxReports.breakdown.map((item, index) => (
                <tr key={index} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '12px', fontSize: '14px', fontWeight: '600' }}>
                    {item.category}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'right', fontSize: '14px', fontWeight: '600' }}>
                    {formatCurrency(item.grossRevenue)}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'right', fontSize: '14px', color: '#dc3545', fontWeight: '600' }}>
                    {formatCurrency(item.vat)}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'right', fontSize: '14px', color: '#28a745', fontWeight: '600' }}>
                    {formatCurrency(item.netRevenue)}
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="4" style={{ padding: '20px', textAlign: 'center', color: '#718096' }}>
                    No tax data available for current period
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

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

  // Main Content Renderer
  const renderContent = () => {
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
          <p style={{ marginTop: '16px', color: '#718096' }}>Loading financial data...</p>
        </div>
      );
    }

    switch (activeTab) {
      case 'revenue-reports':
        return <RevenueReports />;
      case 'commission-settings':
        return <CommissionSettings />;
      case 'wallet-management':
        return <WalletManagement />;
      case 'bank-integration':
        return <BankIntegration />;
      case 'settlement-reports':
        return <SettlementReports />;
      case 'tax-reports':
        return <TaxReports />;
      default:
        return <RevenueReports />;
    }
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
      
      <div style={{ padding: '20px' }}>
        <TabNavigation />
        {renderContent()}
      </div>
    </div>
  );
};

export default FinancialManagement;