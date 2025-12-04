import React, { useState, useEffect, useCallback } from 'react';
import { API_CONFIG } from '../config/api.config';  // ADD THIS LINE

const FinancialManagement = () => {
  const [activeTab, setActiveTab] = useState('revenue-reports');
  const [loading, setLoading] = useState(true);
  const [selectedTransactions, setSelectedTransactions] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [token, setToken] = useState('');
  const [showSettlementModal, setShowSettlementModal] = useState(false);
  const [settlementForm, setSettlementForm] = useState({
    amount: '',
    bankAccount: '',
    description: ''
  });

  // Filters and search state
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    type: '',
    category: '',
    dateFrom: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    dateTo: new Date().toISOString().split('T')[0],
    page: 1,
    limit: 25,
    sortBy: 'createdAt',
    sortOrder: 'desc'
  });

  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalTransactions: 0,
    hasNextPage: false,
    hasPrevPage: false
  });

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

  const [financialStats, setFinancialStats] = useState({
    totalRevenue: 0,
    totalCommission: 0,
    totalTax: 0,
    netProfit: 0
  });

  // Form states
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

  // API Base URL Configuration
const API_BASE_URL = API_CONFIG.BASE_URL;
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
      window.location.href = '/';
    }
  }, []);

  // Fetch financial stats
  const fetchFinancialStats = useCallback(async () => {
    if (!token) return;
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/financial/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) throw new Error('Failed to fetch financial stats');
      
      const data = await response.json();
      setFinancialStats(data.overview || data);
    } catch (error) {
      console.error('Error fetching financial stats:', error);
      setFinancialStats({
        totalRevenue: 0,
        totalCommission: 0,
        totalTax: 0,
        netProfit: 0
      });
    }
  }, [token, API_BASE_URL]);

  // API Functions
  const fetchRevenueData = useCallback(async () => {
    if (!token) return;
    
    try {
      setLoading(true);
      const response = await fetch(
        `${API_BASE_URL}/api/admin/financial/revenue?startDate=${filters.dateFrom}&endDate=${filters.dateTo}`, 
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      if (!response.ok) throw new Error('Failed to fetch revenue data');
      
      const data = await response.json();
      
      // Validate and clean the data
      const validatedData = {
        todayRevenue: data.data?.todayRevenue || data.todayRevenue || 0,
        weeklyRevenue: data.data?.weeklyRevenue || data.weeklyRevenue || 0,
        monthlyRevenue: data.data?.monthlyRevenue || data.monthlyRevenue || 0,
        yearlyRevenue: data.data?.yearlyRevenue || data.yearlyRevenue || 0,
        revenueGrowth: data.data?.revenueGrowth || data.revenueGrowth || 0,
        topServices: Array.isArray(data.data?.topServices) 
          ? data.data.topServices 
          : Array.isArray(data.topServices) 
            ? data.topServices 
            : [],
        recentTransactions: Array.isArray(data.data?.recentTransactions) 
          ? data.data.recentTransactions.map(t => ({
              _id: t._id || `temp-${Math.random()}`,
              reference: t.reference || 'N/A',
              userInfo: t.userInfo || { name: 'N/A' },
              type: t.type || 'credit',
              amount: t.amount || 0,
              status: t.status || 'pending',
              createdAt: t.createdAt || new Date().toISOString(),
              description: t.description || ''
            }))
          : Array.isArray(data.recentTransactions)
            ? data.recentTransactions.map(t => ({
                _id: t._id || `temp-${Math.random()}`,
                reference: t.reference || 'N/A',
                userInfo: t.userInfo || { name: 'N/A' },
                type: t.type || 'credit',
                amount: t.amount || 0,
                status: t.status || 'pending',
                createdAt: t.createdAt || new Date().toISOString(),
                description: t.description || ''
              }))
            : []
      };
      
      setRevenueData(validatedData);
      await fetchFinancialStats();
    } catch (error) {
      console.error('Error fetching revenue data:', error);
      alert('Failed to fetch revenue data');
      // Set empty data structure to prevent errors
      setRevenueData({
        todayRevenue: 0,
        weeklyRevenue: 0,
        monthlyRevenue: 0,
        yearlyRevenue: 0,
        revenueGrowth: 0,
        topServices: [],
        recentTransactions: []
      });
    } finally {
      setLoading(false);
    }
  }, [token, filters.dateFrom, filters.dateTo, API_BASE_URL, fetchFinancialStats]);

  const fetchCommissionSettings = useCallback(async () => {
    if (!token) return;
    
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/admin/financial/commissions`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) throw new Error('Failed to fetch commission settings');
      
      const data = await response.json();
      setCommissionSettings(data.data || data);
    } catch (error) {
      console.error('Error fetching commission settings:', error);
      alert('Failed to fetch commission settings');
    } finally {
      setLoading(false);
    }
  }, [token, API_BASE_URL]);

  const fetchWalletStats = useCallback(async () => {
    if (!token) return;
    
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/admin/financial/wallet-stats`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) throw new Error('Failed to fetch wallet stats');
      
      const data = await response.json();
      setWalletStats(data.data || data);
    } catch (error) {
      console.error('Error fetching wallet stats:', error);
      alert('Failed to fetch wallet statistics');
    } finally {
      setLoading(false);
    }
  }, [token, API_BASE_URL]);

  const fetchSettlementData = useCallback(async () => {
  if (!token) return;
  
  try {
    setLoading(true);
    const response = await fetch(`${API_BASE_URL}/api/admin/financial/settlements`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) throw new Error('Failed to fetch settlement data');
    
    const data = await response.json();
    
    // Validate and clean settlement data
    const validatedData = {
      pendingSettlements: data.data?.pendingSettlements || data.pendingSettlements || 0,
      completedToday: data.data?.completedToday || data.completedToday || 0,
      totalSettled: data.data?.totalSettled || data.totalSettled || 0,
      settlements: Array.isArray(data.data?.settlements) 
        ? data.data.settlements.map(s => ({
            id: s.id || s._id || `settlement-${Math.random()}`,
            amount: s.amount || 0,
            status: s.status || 'Pending',
            bankAccount: s.bankAccount || 'N/A',
            date: s.date || s.createdAt || new Date().toISOString().split('T')[0]
          }))
        : Array.isArray(data.settlements)
          ? data.settlements.map(s => ({
              id: s.id || s._id || `settlement-${Math.random()}`,
              amount: s.amount || 0,
              status: s.status || 'Pending',
              bankAccount: s.bankAccount || 'N/A',
              date: s.date || s.createdAt || new Date().toISOString().split('T')[0]
            }))
          : []
    };
    
    setSettlementData(validatedData);
  } catch (error) {
    console.error('Error fetching settlement data:', error);
    alert('Failed to fetch settlement data');
    // Set empty data structure to prevent errors
    setSettlementData({
      pendingSettlements: 0,
      completedToday: 0,
      totalSettled: 0,
      settlements: []
    });
  } finally {
    setLoading(false);
  }
}, [token, API_BASE_URL]);

  const fetchBankAccounts = useCallback(async () => {
    if (!token) return;
    
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/admin/financial/bank-accounts`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) throw new Error('Failed to fetch bank accounts');
      
      const data = await response.json();
      setBankAccounts(data.data || data);
    } catch (error) {
      console.error('Error fetching bank accounts:', error);
      alert('Failed to fetch bank accounts');
    } finally {
      setLoading(false);
    }
  }, [token, API_BASE_URL]);

  const fetchTaxReports = useCallback(async () => {
    if (!token) return;
    
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/admin/financial/tax-reports`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) throw new Error('Failed to fetch tax reports');
      
      const data = await response.json();
      setTaxReports(data.data || data);
    } catch (error) {
      console.error('Error fetching tax reports:', error);
      alert('Failed to fetch tax reports');
    } finally {
      setLoading(false);
    }
  }, [token, API_BASE_URL]);

  const updateCommissionSettings = async (service, settings) => {
    if (!token) {
      alert('Please login again');
      return null;
    }
    
    try {
      setActionLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/admin/financial/commissions`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ service, ...settings })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update commission settings');
      }

      const data = await response.json();
      setCommissionSettings(prev => ({
        ...prev,
        [service]: settings
      }));
      
      alert('Commission settings updated successfully');
      return data;
    } catch (error) {
      console.error('Error updating commission settings:', error);
      alert(`Failed to update commission settings: ${error.message}`);
      return null;
    } finally {
      setActionLoading(false);
    }
  };

  const addBankAccount = async (accountData) => {
    if (!token) {
      alert('Please login again');
      return null;
    }
    
    try {
      setActionLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/admin/financial/bank-accounts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(accountData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to add bank account');
      }

      const data = await response.json();
      setBankAccounts(prev => [...prev, data.data || data]);
      setBankAccountForm({
        accountName: '',
        accountNumber: '',
        bankName: '',
        bankCode: '',
        isActive: true
      });
      
      alert('Bank account added successfully');
      return data;
    } catch (error) {
      console.error('Error adding bank account:', error);
      alert(`Failed to add bank account: ${error.message}`);
      return null;
    } finally {
      setActionLoading(false);
    }
  };

  const processSettlement = async (settlementId) => {
  // Don't process if it's a generated ID
  if (settlementId.startsWith('settlement-')) {
    alert('This is a demo settlement. Real settlements will have proper IDs.');
    return null;
  }
  
  if (!token) {
    alert('Please login again');
    return null;
  }
  
  try {
    setActionLoading(true);
    const response = await fetch(`${API_BASE_URL}/api/admin/financial/settlements/${settlementId}/process`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to process settlement');
    }

    const data = await response.json();
    await fetchSettlementData();
    alert('Settlement processed successfully');
    return data;
  } catch (error) {
    console.error('Error processing settlement:', error);
    alert(`Failed to process settlement: ${error.message}`);
    return null;
  } finally {
    setActionLoading(false);
  }
};

  const createSettlement = async (settlementData) => {
    if (!token) {
      alert('Please login again');
      return null;
    }
    
    try {
      setActionLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/admin/financial/settlements`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(settlementData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create settlement');
      }

      const data = await response.json();
      await fetchSettlementData();
      setShowSettlementModal(false);
      setSettlementForm({ amount: '', bankAccount: '', description: '' });
      alert('Settlement created successfully');
      return data;
    } catch (error) {
      console.error('Error creating settlement:', error);
      alert(`Failed to create settlement: ${error.message}`);
      return null;
    } finally {
      setActionLoading(false);
    }
  };

  // Load data on component mount and tab changes
  useEffect(() => {
    if (token) {
      fetchFinancialStats();
    }
  }, [token, fetchFinancialStats]);

  useEffect(() => {
    if (token) {
      const loadData = async () => {
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
      };
      
      loadData();
    }
  }, [token, activeTab, fetchRevenueData, fetchCommissionSettings, fetchWalletStats, fetchBankAccounts, fetchSettlementData, fetchTaxReports]);

  // Utility functions
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatNumber = (num) => {
    return new Intl.NumberFormat('en-NG').format(num);
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: 1
    }));
  };

  const handleTransactionSelect = (transactionId) => {
    if (!transactionId) return;
    
    setSelectedTransactions(prev => 
      prev.includes(transactionId)
        ? prev.filter(id => id !== transactionId)
        : [...prev, transactionId]
    );
  };

  const selectAllTransactions = () => {
    const transactionIds = revenueData.recentTransactions
      ?.map(t => t?._id)
      .filter(id => id) || [];
      
    if (selectedTransactions.length === transactionIds.length) {
      setSelectedTransactions([]);
    } else {
      setSelectedTransactions(transactionIds);
    }
  };

  const handleViewDetails = (transaction) => {
    setSelectedTransaction(transaction);
    setShowModal(true);
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      completed: { bg: '#28a745', text: 'Completed' },
      pending: { bg: '#ff8c00', text: 'Pending' },
      failed: { bg: '#ff3b30', text: 'Failed' },
      cancelled: { bg: '#6c757d', text: 'Cancelled' }
    };

    const config = statusConfig[status] || statusConfig.pending;

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
  };

  const getTypeBadge = (type) => {
    const typeConfig = {
      credit: { bg: '#28a745', text: 'Credit' },
      debit: { bg: '#ff3b30', text: 'Debit' },
      transfer_in: { bg: '#007bff', text: 'Transfer In' },
      transfer_out: { bg: '#6f42c1', text: 'Transfer Out' }
    };

    const config = typeConfig[type] || typeConfig.credit;

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
  };

  // Pagination Controls
  const PaginationControls = () => (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: '20px',
      flexWrap: 'wrap',
      gap: '16px'
    }}>
      <div style={{
        fontSize: '14px',
        color: '#718096'
      }}>
        Showing {((pagination.currentPage - 1) * filters.limit) + 1} to{' '}
        {Math.min(pagination.currentPage * filters.limit, pagination.totalTransactions)} of{' '}
        {pagination.totalTransactions} transactions
      </div>

      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
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

        <span style={{
          padding: '8px 12px',
          fontSize: '14px',
          color: '#1a202c'
        }}>
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
            color: pagination.hasNextPage ? '#1a202c' : '#30363fff',
            cursor: pagination.hasNextPage ? 'pointer' : 'not-allowed',
            fontSize: '14px'
          }}
        >
          Next
        </button>
      </div>
    </div>
  );

  // Bulk Actions Dropdown
  const BulkActionsDropdown = () => {
    if (!showBulkActions || selectedTransactions.length === 0) return null;

    return (
      <div style={{
        position: 'absolute',
        right: 0,
        top: '100%',
        backgroundColor: '#fff',
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        zIndex: 100,
        minWidth: '150px',
        marginTop: '4px'
      }}>
        <button
          onClick={() => {
            const confirmMessage = `Export ${selectedTransactions.length} transaction(s)?`;
            if (window.confirm(confirmMessage)) {
              alert('Export functionality to be implemented');
            }
          }}
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
          Export Selected
        </button>
        <button
          onClick={() => {
            const reason = prompt('Enter reason for marking as completed:');
            if (reason) {
              alert('Bulk status update functionality to be implemented');
            }
          }}
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
          Mark as Completed
        </button>
        <button
          onClick={() => {
            if (window.confirm(`Are you sure you want to delete ${selectedTransactions.length} transaction(s)?`)) {
              alert('Bulk delete functionality to be implemented');
            }
          }}
          disabled={actionLoading}
          style={{
            width: '100%',
            padding: '12px 16px',
            border: 'none',
            backgroundColor: 'transparent',
            textAlign: 'left',
            fontSize: '14px',
            cursor: actionLoading ? 'not-allowed' : 'pointer',
            color: '#ff3b30'
          }}
        >
          Delete Selected
        </button>
      </div>
    );
  };

  // Tab configuration
  const tabs = [
    { id: 'revenue-reports', label: 'Revenue Reports', icon: '📈' },
    { id: 'commission-settings', label: 'Commission Settings', icon: '💰' },
    { id: 'wallet-management', label: 'Wallet Management', icon: '👛' },
    { id: 'bank-integration', label: 'Bank Integration', icon: '🏦' },
    { id: 'settlement-reports', label: 'Settlement Reports', icon: '📄' },
    { id: 'tax-reports', label: 'Tax Reports', icon: '📊' }
  ];

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

  // Revenue Reports Component - FIXED VERSION
  const RevenueReports = () => {
    try {
      return (
        <div style={{ width: '100%' }}>
          {/* Stats Cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: isMobile ? '10px' : '12px',
            marginBottom: isMobile ? '20px' : '24px',
            width: '100%'
          }}>
            {[
              { label: 'Total Revenue', value: financialStats.totalRevenue, color: '#28a745', icon: '💰' },
              { label: 'Total Commission', value: financialStats.totalCommission, color: '#ffc107', icon: '💸' },
              { label: 'Total Tax', value: financialStats.totalTax, color: '#dc3545', icon: '🏛️' },
              { label: 'Net Profit', value: financialStats.netProfit, color: '#17a2b8', icon: '📊' }
            ].map((stat, index) => (
              <div key={index} style={{
                backgroundColor: '#fff',
                padding: isMobile ? '12px' : '16px',
                borderRadius: '8px',
                boxShadow: '0 1px 4px rgba(0, 0, 0, 0.1)',
                border: '1px solid #e2e8f0',
                opacity: 1,
                transition: 'opacity 0.3s ease'
              }}>
                <div style={{
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px', 
                  marginBottom: '8px'
                }}>
                  <div style={{fontSize: isMobile ? '18px' : '20px'}}>{stat.icon}</div>
                  <h3 style={{
                    color: '#1a202c', 
                    fontSize: isMobile ? '12px' : '14px', 
                    fontWeight: '600', 
                    margin: 0
                  }}>
                    {stat.label}
                  </h3>
                </div>
                <p style={{
                  color: stat.color, 
                  fontSize: isMobile ? '16px' : '18px', 
                  fontWeight: '700', 
                  margin: 0
                }}>
                  {formatCurrency(stat.value)}
                </p>
              </div>
            ))}
          </div>

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
                  value={filters.dateFrom}
                  onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
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
                  value={filters.dateTo}
                  onChange={(e) => handleFilterChange('dateTo', e.target.value)}
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

            {/* Quick Revenue Stats */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '16px'
            }}>
              {[
                { label: 'Today', value: revenueData.todayRevenue, icon: '📅', color: '#28a745' },
                { label: 'This Week', value: revenueData.weeklyRevenue, icon: '📊', color: '#007bff' },
                { label: 'This Month', value: revenueData.monthlyRevenue, icon: '📈', color: '#ffc107' },
                { label: 'This Year', value: revenueData.yearlyRevenue, icon: '🏆', color: '#17a2b8' }
              ].map((stat, index) => (
                <div key={index} style={{
                  backgroundColor: '#f8f9fa',
                  padding: '16px',
                  borderRadius: '8px',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '24px', marginBottom: '8px' }}>{stat.icon}</div>
                  <h4 style={{ margin: '0 0 8px 0', color: '#1a202c', fontSize: '14px', fontWeight: '600' }}>
                    {stat.label}
                  </h4>
                  <p style={{ margin: 0, color: stat.color, fontSize: '18px', fontWeight: '700' }}>
                    {formatCurrency(stat.value)}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Transactions */}
          <div style={{
            backgroundColor: '#fff',
            padding: '20px',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
            border: '1px solid #e2e8f0'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '16px'
            }}>
              <h3 style={{ margin: 0, color: '#1a202c', fontSize: '18px', fontWeight: '600' }}>
                Recent Transactions
              </h3>
              {selectedTransactions.length > 0 && (
                <div style={{ position: 'relative' }}>
                  <button
                    onClick={() => setShowBulkActions(!showBulkActions)}
                    disabled={actionLoading}
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
                    Bulk Actions ({selectedTransactions.length})
                  </button>
                  <BulkActionsDropdown />
                </div>
              )}
            </div>

            {loading ? (
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
                <p style={{ marginTop: '16px', color: '#718096' }}>Loading transactions...</p>
              </div>
            ) : revenueData.recentTransactions?.length > 0 ? (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8f9fa' }}>
                      <th style={{
                        padding: '12px',
                        textAlign: 'left',
                        borderBottom: '1px solid #e2e8f0',
                        width: '50px'
                      }}>
                        <input
                          type="checkbox"
                          checked={selectedTransactions.length === revenueData.recentTransactions.length}
                          onChange={selectAllTransactions}
                          style={{
                            width: '16px',
                            height: '16px',
                            cursor: 'pointer'
                          }}
                        />
                      </th>
                      <th style={{
                        padding: '12px',
                        textAlign: 'left',
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#1a202c',
                        borderBottom: '1px solid #e2e8f0'
                      }}>Reference</th>
                      <th style={{
                        padding: '12px',
                        textAlign: 'left',
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#1a202c',
                        borderBottom: '1px solid #e2e8f0'
                      }}>User</th>
                      <th style={{
                        padding: '12px',
                        textAlign: 'left',
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#1a202c',
                        borderBottom: '1px solid #e2e8f0'
                      }}>Type</th>
                      <th style={{
                        padding: '12px',
                        textAlign: 'right',
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#1a202c',
                        borderBottom: '1px solid #e2e8f0'
                      }}>Amount</th>
                      <th style={{
                        padding: '12px',
                        textAlign: 'left',
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#1a202c',
                        borderBottom: '1px solid #e2e8f0'
                      }}>Status</th>
                      <th style={{
                        padding: '12px',
                        textAlign: 'right',
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#1a202c',
                        borderBottom: '1px solid #e2e8f0'
                      }}>Date</th>
                      <th style={{
                        padding: '12px',
                        textAlign: 'right',
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#1a202c',
                        borderBottom: '1px solid #e2e8f0',
                        width: '120px'
                      }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {revenueData.recentTransactions.map((transaction, index) => {
                      // Skip if transaction is null or undefined
                      if (!transaction) return null;
                      
                      // Generate a unique ID if _id doesn't exist
                      const transactionId = transaction._id || `temp-id-${index}-${Date.now()}`;
                      
                      return (
                        <tr key={transactionId} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '12px' }}>
                            <input
                              type="checkbox"
                              checked={selectedTransactions.includes(transactionId)}
                              onChange={() => handleTransactionSelect(transactionId)}
                              style={{
                                width: '16px',
                                height: '16px',
                                cursor: 'pointer'
                              }}
                            />
                          </td>
                          <td style={{ padding: '12px', fontSize: '14px', fontWeight: '600' }}>
                            {transaction.reference || 'N/A'}
                          </td>
                          <td style={{ padding: '12px', fontSize: '14px' }}>
                            {transaction.userInfo?.name || 'N/A'}
                          </td>
                          <td style={{ padding: '12px' }}>
                            {getTypeBadge(transaction.type || 'credit')}
                          </td>
                          <td style={{ padding: '12px', textAlign: 'right', fontSize: '14px', fontWeight: '600', 
                            color: (transaction.type || '').includes('debit') ? '#ff3b30' : '#28a745' }}>
                            {(transaction.type || '').includes('debit') ? '-' : '+'}{formatCurrency(transaction.amount || 0)}
                          </td>
                          <td style={{ padding: '12px' }}>
                            {getStatusBadge(transaction.status || 'pending')}
                          </td>
                          <td style={{ padding: '12px', textAlign: 'right', fontSize: '12px', color: '#718096' }}>
                            {transaction.createdAt ? new Date(transaction.createdAt).toLocaleDateString() : 'N/A'}
                          </td>
                          <td style={{ padding: '12px', textAlign: 'right' }}>
                            <button
                              onClick={() => handleViewDetails(transaction)}
                              style={{
                                padding: '6px 12px',
                                backgroundColor: '#007bff',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '4px',
                                fontSize: '12px',
                                cursor: 'pointer'
                              }}
                            >
                              View
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px', color: '#718096' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>💳</div>
                <h4 style={{ margin: '0 0 8px 0' }}>No transactions found</h4>
                <p style={{ margin: 0 }}>No transactions for selected period</p>
              </div>
            )}
          </div>
        </div>
      );
    } catch (error) {
      console.error('Error in RevenueReports:', error);
      return (
        <div style={{
          backgroundColor: '#fff',
          padding: '40px',
          borderRadius: '12px',
          textAlign: 'center',
          border: '1px solid #e2e8f0'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🚨</div>
          <h3 style={{ color: '#ff3b30', marginBottom: '8px' }}>Error Loading Revenue Data</h3>
          <p style={{ color: '#718096', marginBottom: '20px' }}>
            There was an error loading the revenue reports. Please try again.
          </p>
          <button
            onClick={fetchRevenueData}
            style={{
              padding: '10px 20px',
              backgroundColor: '#ff3b30',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            Retry
          </button>
        </div>
      );
    }
  };

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
        gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: isMobile ? '10px' : '12px',
        marginBottom: isMobile ? '20px' : '24px',
        width: '100%'
      }}>
        {[
          { label: 'Total Balance', value: walletStats.totalBalance, color: '#28a745', icon: '💰' },
          { label: 'Total Users', value: walletStats.totalUsers, color: '#007bff', icon: '👥' },
          { label: 'Active Wallets', value: walletStats.activeWallets, color: '#28a745', icon: '✅' },
          { label: 'Low Balance Users', value: walletStats.lowBalanceUsers, color: '#ffc107', icon: '⚠️' }
        ].map((stat, index) => (
          <div key={index} style={{
            backgroundColor: '#fff',
            padding: isMobile ? '12px' : '16px',
            borderRadius: '8px',
            boxShadow: '0 1px 4px rgba(0, 0, 0, 0.1)',
            border: '1px solid #e2e8f0'
          }}>
            <div style={{
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px', 
              marginBottom: '8px'
            }}>
              <div style={{fontSize: isMobile ? '18px' : '20px'}}>{stat.icon}</div>
              <h3 style={{
                color: '#1a202c', 
                fontSize: isMobile ? '12px' : '14px', 
                fontWeight: '600', 
                margin: 0
              }}>
                {stat.label}
              </h3>
            </div>
            <p style={{
              color: stat.color, 
              fontSize: isMobile ? '16px' : '18px', 
              fontWeight: '700', 
              margin: 0
            }}>
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
        {loading ? (
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
            <p style={{ marginTop: '16px', color: '#718096' }}>Loading activities...</p>
          </div>
        ) : walletStats.recentActivities.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
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
                {walletStats.recentActivities.map((activity, index) => (
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
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px', color: '#718096' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>👛</div>
            <h4 style={{ margin: '0 0 8px 0' }}>No wallet activities</h4>
            <p style={{ margin: 0 }}>No recent wallet activities found</p>
          </div>
        )}
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
              onChange={(e) => setBankAccountForm(prev => ({ 
                ...prev, 
                bankName: e.target.value, 
                bankCode: e.target.selectedOptions[0].dataset.code || '' 
              }))}
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
        
        {loading ? (
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
            <p style={{ marginTop: '16px', color: '#718096' }}>Loading bank accounts...</p>
          </div>
        ) : bankAccounts.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
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
        gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: isMobile ? '10px' : '12px',
        marginBottom: isMobile ? '20px' : '24px',
        width: '100%'
      }}>
        {[
          { label: 'Pending Settlements', value: settlementData.pendingSettlements, color: '#ffc107', icon: '⏳' },
          { label: 'Completed Today', value: settlementData.completedToday, color: '#28a745', icon: '✅' },
          { label: 'Total Settled', value: settlementData.totalSettled, color: '#007bff', icon: '💰' }
        ].map((stat, index) => (
          <div key={index} style={{
            backgroundColor: '#fff',
            padding: isMobile ? '12px' : '16px',
            borderRadius: '8px',
            boxShadow: '0 1px 4px rgba(0, 0, 0, 0.1)',
            border: '1px solid #e2e8f0'
          }}>
            <div style={{
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px', 
              marginBottom: '8px'
            }}>
              <div style={{fontSize: isMobile ? '18px' : '20px'}}>{stat.icon}</div>
              <h3 style={{
                color: '#1a202c', 
                fontSize: isMobile ? '12px' : '14px', 
                fontWeight: '600', 
                margin: 0
              }}>
                {stat.label}
              </h3>
            </div>
            <p style={{
              color: stat.color, 
              fontSize: isMobile ? '16px' : '18px', 
              fontWeight: '700', 
              margin: 0
            }}>
              {formatCurrency(stat.value)}
            </p>
          </div>
        ))}
      </div>

      {/* Create Settlement Button */}
      <div style={{
        backgroundColor: '#fff',
        padding: '20px',
        borderRadius: '12px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        border: '1px solid #e2e8f0',
        marginBottom: '24px'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <h3 style={{ margin: '0 0 8px 0', color: '#1a202c', fontSize: '18px', fontWeight: '600' }}>
              Settlement Management
            </h3>
            <p style={{ margin: 0, color: '#718096', fontSize: '14px' }}>
              Manage and process financial settlements
            </p>
          </div>
          <button
            onClick={() => setShowSettlementModal(true)}
            style={{
              padding: '10px 20px',
              backgroundColor: '#ff3b30',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            Create Settlement
          </button>
        </div>
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
        
        {loading ? (
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
            <p style={{ marginTop: '16px', color: '#718096' }}>Loading settlements...</p>
          </div>
        ) : settlementData.settlements.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
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
              {settlementData.settlements.map((settlement, index) => {
  // Add null check for settlement
  if (!settlement) return null;
  
  // Use fallback values for all properties
  const settlementId = settlement.id || settlement._id || `settlement-${index}`;
  const amount = settlement.amount || 0;
  const status = settlement.status || 'Pending';
  const bankAccount = settlement.bankAccount || 'N/A';
  const date = settlement.date || settlement.createdAt || new Date().toISOString().split('T')[0];
  
  return (
    <tr key={settlementId} style={{ borderBottom: '1px solid #f1f5f9' }}>
      <td style={{ padding: '12px', fontSize: '14px', fontWeight: '600' }}>
        {settlementId}
      </td>
      <td style={{ padding: '12px', textAlign: 'right', fontSize: '14px', fontWeight: '600', color: '#28a745' }}>
        {formatCurrency(amount)}
      </td>
      <td style={{ padding: '12px', textAlign: 'center' }}>
        <span style={{
          backgroundColor: status === 'Completed' ? '#d4edda' : status === 'Pending' ? '#fff3cd' : '#f8d7da',
          color: status === 'Completed' ? '#155724' : status === 'Pending' ? '#856404' : '#721c24',
          padding: '4px 8px',
          borderRadius: '12px',
          fontSize: '11px',
          fontWeight: '600'
        }}>
          {status}
        </span>
      </td>
      <td style={{ padding: '12px', fontSize: '14px' }}>
        {bankAccount}
      </td>
      <td style={{ padding: '12px', textAlign: 'right', fontSize: '12px', color: '#718096' }}>
        {date}
      </td>
      <td style={{ padding: '12px', textAlign: 'center' }}>
        {status === 'Pending' && (
          <button
            onClick={() => processSettlement(settlementId)}
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
  );
})}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px', color: '#718096' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📄</div>
            <h4 style={{ margin: '0 0 8px 0' }}>No settlements found</h4>
            <p style={{ margin: 0 }}>Create your first settlement to get started</p>
          </div>
        )}
      </div>
    </div>
  );

  // Tax Reports Component
  const TaxReports = () => (
    <div style={{ width: '100%' }}>
      {/* Tax Overview */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: isMobile ? '10px' : '12px',
        marginBottom: isMobile ? '20px' : '24px',
        width: '100%'
      }}>
        {[
          { label: 'Current Month VAT', value: taxReports.currentMonth, color: '#dc3545', icon: '📊' },
          { label: 'Current Quarter', value: taxReports.currentQuarter, color: '#ffc107', icon: '📈' },
          { label: 'Current Year', value: taxReports.currentYear, color: '#28a745', icon: '🏆' }
        ].map((stat, index) => (
          <div key={index} style={{
            backgroundColor: '#fff',
            padding: isMobile ? '12px' : '16px',
            borderRadius: '8px',
            boxShadow: '0 1px 4px rgba(0, 0, 0, 0.1)',
            border: '1px solid #e2e8f0'
          }}>
            <div style={{
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px', 
              marginBottom: '8px'
            }}>
              <div style={{fontSize: isMobile ? '18px' : '20px'}}>{stat.icon}</div>
              <h3 style={{
                color: '#1a202c', 
                fontSize: isMobile ? '12px' : '14px', 
                fontWeight: '600', 
                margin: 0
              }}>
                {stat.label}
              </h3>
            </div>
            <p style={{
              color: stat.color, 
              fontSize: isMobile ? '16px' : '18px', 
              fontWeight: '700', 
              margin: 0
            }}>
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
        
        {loading ? (
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
            <p style={{ marginTop: '16px', color: '#718096' }}>Loading tax data...</p>
          </div>
        ) : taxReports.breakdown.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
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
                {taxReports.breakdown.map((item, index) => (
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
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px', color: '#718096' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📊</div>
            <h4 style={{ margin: '0 0 8px 0' }}>No tax data available</h4>
            <p style={{ margin: 0 }}>No tax data for current period</p>
          </div>
        )}
      </div>
    </div>
  );

  // Transaction Details Modal
  const TransactionDetailsModal = () => {
    if (!showModal || !selectedTransaction) return null;

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
          borderRadius: '12px',
          maxWidth: '600px',
          width: '100%',
          maxHeight: '80vh',
          overflow: 'auto',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
          border: '1px solid #e2e8f0'
        }}>
          <div style={{
            padding: '20px',
            borderBottom: '1px solid #e2e8f0',
            backgroundColor: '#f7fafc',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div>
              <h3 style={{ margin: 0, color: '#1a202c', fontSize: '18px', fontWeight: '600' }}>
                Transaction Details
              </h3>
              <p style={{ margin: '4px 0 0 0', color: '#718096', fontSize: '14px' }}>
                Reference: {selectedTransaction.reference}
              </p>
            </div>
            <button
              onClick={() => setShowModal(false)}
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

          <div style={{ padding: '20px' }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '16px',
              marginBottom: '20px'
            }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', fontWeight: '600', color: '#718096' }}>
                  Amount
                </label>
                <div style={{ fontSize: '18px', fontWeight: '700', 
                  color: (selectedTransaction.type || '').includes('debit') ? '#ff3b30' : '#28a745' }}>
                  {(selectedTransaction.type || '').includes('debit') ? '-' : '+'}{formatCurrency(selectedTransaction.amount || 0)}
                </div>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', fontWeight: '600', color: '#718096' }}>
                  Status
                </label>
                <div>
                  {getStatusBadge(selectedTransaction.status || 'pending')}
                </div>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', fontWeight: '600', color: '#718096' }}>
                  Type
                </label>
                <div>
                  {getTypeBadge(selectedTransaction.type || 'credit')}
                </div>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', fontWeight: '600', color: '#718096' }}>
                  Category
                </label>
                <div style={{ fontSize: '14px', fontWeight: '600', textTransform: 'capitalize' }}>
                  {selectedTransaction.category || 'N/A'}
                </div>
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', fontWeight: '600', color: '#718096' }}>
                Description
              </label>
              <div style={{ 
                padding: '12px',
                backgroundColor: '#f8f9fa',
                borderRadius: '6px',
                fontSize: '14px'
              }}>
                {selectedTransaction.description || 'No description available'}
              </div>
            </div>

            {selectedTransaction.userInfo && (
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', fontWeight: '600', color: '#718096' }}>
                  User Information
                </label>
                <div style={{ 
                  padding: '12px',
                  backgroundColor: '#f8f9fa',
                  borderRadius: '6px'
                }}>
                  <div style={{ fontSize: '14px', fontWeight: '600' }}>
                    {selectedTransaction.userInfo.name || 'N/A'}
                  </div>
                  <div style={{ fontSize: '12px', color: '#718096' }}>
                    {selectedTransaction.userInfo.email || 'N/A'}
                  </div>
                </div>
              </div>
            )}

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', fontWeight: '600', color: '#718096' }}>
                Timestamps
              </label>
              <div style={{ 
                padding: '12px',
                backgroundColor: '#f8f9fa',
                borderRadius: '6px',
                fontSize: '12px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span>Created:</span>
                  <span>{selectedTransaction.createdAt ? new Date(selectedTransaction.createdAt).toLocaleString() : 'N/A'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Updated:</span>
                  <span>{selectedTransaction.updatedAt ? new Date(selectedTransaction.updatedAt).toLocaleString() : 'N/A'}</span>
                </div>
              </div>
            </div>

            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={() => setShowModal(false)}
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
      </div>
    );
  };

  // Settlement Creation Modal
  const SettlementModal = () => {
    if (!showSettlementModal) return null;

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
          borderRadius: '12px',
          maxWidth: '400px',
          width: '100%',
          overflow: 'hidden',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
          border: '1px solid #e2e8f0'
        }}>
          <div style={{
            padding: '20px',
            borderBottom: '1px solid #e2e8f0',
            backgroundColor: '#f7fafc'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <h3 style={{ margin: 0, color: '#1a202c', fontSize: '18px', fontWeight: '600' }}>
                Create Settlement
              </h3>
              <button
                onClick={() => setShowSettlementModal(false)}
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
          </div>

          <div style={{ padding: '20px' }}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: '600',
                color: '#1a202c'
              }}>
                Amount (₦)
              </label>
              <input
                type="number"
                placeholder="Enter settlement amount"
                value={settlementForm.amount}
                onChange={(e) => setSettlementForm(prev => ({ ...prev, amount: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '14px',
                  boxSizing: 'border-box'
                }}
                min="0"
                step="0.01"
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: '600',
                color: '#1a202c'
              }}>
                Bank Account
              </label>
              <select
                value={settlementForm.bankAccount}
                onChange={(e) => setSettlementForm(prev => ({ ...prev, bankAccount: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                  backgroundColor: '#fff',
                  color: '#000000'
                }}
              >
                <option value="">Select Bank Account</option>
                {bankAccounts.filter(acc => acc.isActive).map(account => (
                  <option key={account._id} value={account._id}>
                    {account.bankName} - {account.accountNumber}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: '500',
                color: '#718096'
              }}>
                Description (Optional)
              </label>
              <textarea
                placeholder="Enter settlement description"
                value={settlementForm.description}
                onChange={(e) => setSettlementForm(prev => ({ ...prev, description: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                  resize: 'vertical',
                  minHeight: '80px'
                }}
              />
            </div>

            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={() => setShowSettlementModal(false)}
                disabled={actionLoading}
                style={{
                  padding: '10px 16px',
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
                onClick={() => createSettlement(settlementForm)}
                disabled={actionLoading || !settlementForm.amount || !settlementForm.bankAccount}
                style={{
                  padding: '10px 16px',
                  border: 'none',
                  borderRadius: '8px',
                  backgroundColor: '#ff3b30',
                  color: '#fff',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: (actionLoading || !settlementForm.amount || !settlementForm.bankAccount) ? 'not-allowed' : 'pointer',
                  opacity: (actionLoading || !settlementForm.amount || !settlementForm.bankAccount) ? 0.7 : 1
                }}
              >
                {actionLoading ? 'Creating...' : 'Create Settlement'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Main content renderer
  const renderContent = () => {
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
      maxWidth: '100%'
    }}>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
      
      <TabNavigation />
      {renderContent()}
      <TransactionDetailsModal />
      <SettlementModal />
    </div>
  );
};

export default FinancialManagement;