import React, { useState, useEffect } from 'react';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [showUserModal, setShowUserModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [userDetailsLoading, setUserDetailsLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [token, setToken] = useState('');
  // New state variables for credit/debit modals
  const [showCreditModal, setShowCreditModal] = useState(false);
  const [showDebitModal, setShowDebitModal] = useState(false);
  const [transactionForm, setTransactionForm] = useState({
    amount: '',
    reason: '',
    reference: ''
  });

  // Filters and search state
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    kycLevel: '',
    accountType: '',
    page: 1,
    limit: 25,
    sortBy: 'createdAt',
    sortOrder: 'desc'
  });

  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalUsers: 0,
    hasNextPage: false,
    hasPrevPage: false
  });

  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    suspendedUsers: 0,
    unverifiedUsers: 0
  });

  // API Base URL Configuration
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  // Check mobile screen
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
  const authToken = localStorage.getItem('admin_token') || sessionStorage.getItem('admin_token');
  console.log('🔍 Debug - Token from localStorage:', authToken ? 'EXISTS' : 'MISSING');
  
  if (authToken) {
    console.log('🔍 Setting token in state');
    setToken(authToken);
  } else {
    console.log('No token found, redirecting to login');
    window.location.href = '/';
  }
}, []);


// Debug token state changes
useEffect(() => {
  console.log('🔍 Debug - Token state changed:', token ? 'SET' : 'NOT SET');
  console.log('🔍 Debug - Current token:', token);
}, [token]);

// ADD THIS NEW USEEFFECT RIGHT HERE:
useEffect(() => {
  if (token) {
    console.log('🔍 Token is available, fetching initial data');
    fetchStats();
  }
}, [token]);
  // API Functions

const fetchStats = async () => {
  console.log('📊 fetchStats called, token:', token ? 'EXISTS' : 'MISSING');
  
  if (!token) {
    console.log('❌ No token, returning early');
    return;
  }
  
  try {
    console.log('🚀 Making API request to:', `${API_BASE_URL}/api/users/management/stats`);
    
    const response = await fetch(`${API_BASE_URL}/api/users/management/stats`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('📡 Response status:', response.status);
    console.log('📡 Response ok:', response.ok);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log('❌ Response error:', errorText);
      throw new Error('Failed to fetch stats');
    }
    
    const data = await response.json();
    console.log('📊 Raw API response:', data);
    console.log('📊 Raw API response:', data);
console.log('📊 Full response structure:', JSON.stringify(data, null, 2));
console.log('📊 Stats data:', data.stats);
    console.log('📊 Stats data:', data.stats);
   // Try to handle both possible response formats
setStats(data.overview);
    console.log('✅ Stats updated successfully');
  } catch (error) {
    console.error('❌ Error fetching stats:', error);
    // Set default stats on error
    setStats({
      totalUsers: 0,
      activeUsers: 0,
      suspendedUsers: 0,
      unverifiedUsers: 0
    });
  }
};

  // Fetch individual user details
   const fetchUserDetails = async (userId) => {
    try {
      setUserDetailsLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/users/management/${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) throw new Error('Failed to fetch user details');
      
      const data = await response.json();
      return data.user;
    } catch (error) {
      console.error('Error fetching user details:', error);
      alert('Failed to fetch user details');
      return null;
    } finally {
      setUserDetailsLoading(false);
    }
  };

  // Update user status
  const updateUserStatus = async (userId, action, reason = '') => {
  if (!token) {
    alert('Please login again');
    return null;
  }
  
  try {
    setActionLoading(true);
    const response = await fetch(`${API_BASE_URL}/api/users/management/${userId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ action, reason })
    });

    if (!response.ok) throw new Error('Failed to update user status');

    const data = await response.json();
    
    // Refresh data
    await Promise.all([fetchUsers(), fetchStats()]);
    
    alert(`User ${action}d successfully`);
    return data;
  } catch (error) {
    console.error('Error updating user status:', error);
    alert(`Failed to ${action} user`);
    return null;
  } finally {
    setActionLoading(false);
  }
};

  // Credit User Function
 const creditUser = async (userId, amount, reason, reference = '') => {
  if (!token) {
    alert('Please login again');
    return null;
  }
  
  try {
    setActionLoading(true);
    const response = await fetch(`${API_BASE_URL}/api/admin/transactions/fund-user`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`  // ADD THIS LINE
      },
      body: JSON.stringify({
        userId,
        amount: parseFloat(amount),
        reason,
        reference
      })
    });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to credit user');
      }

      const data = await response.json();
      
      // Refresh user details and stats
      const updatedUser = await fetchUserDetails(userId);
      if (updatedUser) {
        setSelectedUser(updatedUser);
      }
      await Promise.all([fetchUsers(), fetchStats()]);
      
      alert(`Successfully credited ₦${parseFloat(amount).toLocaleString()} to user`);
      return data;
    } catch (error) {
      console.error('Error crediting user:', error);
      alert(`Failed to credit user: ${error.message}`);
      return null;
    } finally {
      setActionLoading(false);
    }
  };

  // Debit User Function
  const debitUser = async (userId, amount, reason, reference = '') => {
  if (!token) {
    alert('Please login again');
    return null;
  }
  
  try {
    setActionLoading(true);
    const response = await fetch(`${API_BASE_URL}/api/admin/transactions/debit-user`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`  // ADD THIS LINE
      },
      body: JSON.stringify({
        userId,
        amount: parseFloat(amount),
        reason,
        reference
      })
    });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to debit user');
      }

      const data = await response.json();
      
      // Refresh user details and stats
      const updatedUser = await fetchUserDetails(userId);
      if (updatedUser) {
        setSelectedUser(updatedUser);
      }
      await Promise.all([fetchUsers(), fetchStats()]);
      
      alert(`Successfully debited ₦${parseFloat(amount).toLocaleString()} from user`);
      return data;
    } catch (error) {
      console.error('Error debiting user:', error);
      alert(`Failed to debit user: ${error.message}`);
      return null;
    } finally {
      setActionLoading(false);
    }
  };

  // Bulk operations
 const performBulkAction = async (action, reason = '') => {
  if (!token) {
    alert('Please login again');
    return;
  }
  
  if (selectedUsers.length === 0) {
    alert('Please select users first');
    return;
  }
    const confirmMessage = `Are you sure you want to ${action} ${selectedUsers.length} user(s)?`;
    if (!window.confirm(confirmMessage)) return;

     try {
    setActionLoading(true);
    const response = await fetch(`${API_BASE_URL}/api/users/management/bulk`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`  // ADD THIS LINE
      },
      body: JSON.stringify({ 
        userIds: selectedUsers, 
        action, 
        reason 
      })
    });

      if (!response.ok) throw new Error('Failed to perform bulk action');

      const data = await response.json();
      
      // Clear selections
      setSelectedUsers([]);
      setShowBulkActions(false);
      
      // Refresh data
      await Promise.all([fetchUsers(), fetchStats()]);
      
      alert(`Bulk ${action} completed. ${data.results.successCount} successful, ${data.results.errorCount} failed.`);
    } catch (error) {
      console.error('Error performing bulk action:', error);
      alert(`Failed to perform bulk ${action}`);
    } finally {
      setActionLoading(false);
    }
  };


const fetchUsers = async () => {
  if (!token) {
    console.log('fetchUsers called but no token available');
    return;
  }
  
  try {
    setLoading(true);
    const queryParams = new URLSearchParams(filters);
    const response = await fetch(`${API_BASE_URL}/api/users/management/list?${queryParams}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) throw new Error('Failed to fetch users');
    
    const data = await response.json();
    setUsers(data.users);
    setPagination(data.pagination);
  } catch (error) {
    console.error('Error fetching users:', error);
    alert('Failed to fetch users');
  } finally {
    setLoading(false);
  }
};

  // Load data on component mount and filter changes
useEffect(() => {
  if (token) {
    fetchUsers();
  }
}, [filters, token]);



  // Handle filter changes
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: 1 // Reset to first page when filters change
    }));
  };

  const handleUserSelect = (userId) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  // Handle View Details click
  const handleViewDetails = async (user) => {
    const userDetails = await fetchUserDetails(user._id);
    if (userDetails) {
      setSelectedUser(userDetails);
      setShowUserModal(true);
    }
  };

  const selectAllUsers = () => {
    if (selectedUsers.length === users.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(users.map(user => user._id));
    }
  };

  // Handle Credit Action - FIXED
  const handleCreditAction = () => {
    setTransactionForm({ amount: '', reason: '', reference: '' });
    setShowCreditModal(true);
    setShowUserModal(false); // Close user modal when opening credit modal
  };

  // Handle Debit Action - FIXED
  const handleDebitAction = () => {
    setTransactionForm({ amount: '', reason: '', reference: '' });
    setShowDebitModal(true);
    setShowUserModal(false); // Close user modal when opening debit modal
  };

  // Handle Credit Form Submission - FIXED
  const handleCreditSubmit = async () => {
    if (!transactionForm.amount || !transactionForm.reason) {
      alert('Please fill in all required fields');
      return;
    }
    
    if (isNaN(transactionForm.amount) || parseFloat(transactionForm.amount) <= 0) {
      alert('Please enter a valid amount');
      return;
    }
    
    await creditUser(
      selectedUser._id, 
      transactionForm.amount, 
      transactionForm.reason, 
      transactionForm.reference
    );
    setShowCreditModal(false);
    setShowUserModal(true); // Reopen user modal after transaction
  };

  // Handle Debit Form Submission - FIXED
  const handleDebitSubmit = async () => {
    if (!transactionForm.amount || !transactionForm.reason) {
      alert('Please fill in all required fields');
      return;
    }
    
    if (isNaN(transactionForm.amount) || parseFloat(transactionForm.amount) <= 0) {
      alert('Please enter a valid amount');
      return;
    }
    
    if (parseFloat(transactionForm.amount) > selectedUser.walletBalance) {
      alert(`Insufficient balance. User has ₦${selectedUser.walletBalance.toLocaleString()}`);
      return;
    }
    
    await debitUser(
      selectedUser._id, 
      transactionForm.amount, 
      transactionForm.reason, 
      transactionForm.reference
    );
    setShowDebitModal(false);
    setShowUserModal(true); // Reopen user modal after transaction
  };

  // Status colors and badges
  const getStatusBadge = (status) => {
    const statusConfig = {
      active: { bg: '#28a745', text: 'Active' },
      suspended: { bg: '#ff3b30', text: 'Suspended' },
      pending_verification: { bg: '#ff8c00', text: 'Pending' },
      inactive: { bg: '#6c757d', text: 'Inactive' },
      deleted: { bg: '#dc3545', text: 'Deleted' }
    };

    const config = statusConfig[status] || statusConfig.inactive;

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

  const getKycBadge = (kycStatus, kycLevel) => {
    const kycConfig = {
      verified: { bg: '#28a745', text: `Level ${kycLevel}` },
      pending: { bg: '#ff8c00', text: 'Pending' },
      rejected: { bg: '#ff3b30', text: 'Rejected' },
      not_started: { bg: '#6c757d', text: 'Level 0' }
    };

    const config = kycConfig[kycStatus] || kycConfig.not_started;

    return (
      <span style={{
        backgroundColor: config.bg,
        color: '#fff',
        padding: '4px 8px',
        borderRadius: '12px',
        fontSize: '11px',
        fontWeight: '600'
      }}>
        {config.text}
      </span>
    );
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0
    }).format(amount);
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
      <div style={{
        fontSize: '14px',
        color: '#718096'
      }}>
        Showing {((pagination.currentPage - 1) * filters.limit) + 1} to{' '}
        {Math.min(pagination.currentPage * filters.limit, pagination.totalUsers)} of{' '}
        {pagination.totalUsers} users
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
            border: '1px solid ',
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

  // User Modal Component with Credit/Debit buttons
  const UserModal = () => {
    if (!showUserModal || !selectedUser) return null;

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
          {/* Modal Header */}
          <div style={{
            padding: '24px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <h3 style={{ margin: 0, color: '#1a202c', fontSize: '18px', fontWeight: '600' }}>
              User Details
            </h3>
            <button
              onClick={() => setShowUserModal(false)}
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

          {/* Modal Content */}
          <div style={{ padding: '24px' }}>
            {userDetailsLoading ? (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <div style={{
                  display: 'inline-block',
                  width: '30px',
                  height: '30px',
                  border: '3px solid ',
                  borderTop: '3px solid #ff3b30',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }} />
                <p style={{ marginTop: '16px', color: '#718096' }}>Loading details...</p>
              </div>
            ) : (
              <>
                {/* User Info */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  marginBottom: '24px',
                  padding: '20px',
                  backgroundColor: '#f8f9fa',
                  borderRadius: '12px'
                }}>
                  <div style={{
                    width: '60px',
                    height: '60px',
                    backgroundColor: '#ff3b30',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    fontWeight: '600',
                    fontSize: '24px'
                  }}>
                    {selectedUser.name?.charAt(0)?.toUpperCase() || 'U'}
                  </div>
                  <div>
                    <h4 style={{ margin: '0 0 8px 0', color: '#1a202c', fontSize: '18px' }}>
                      {selectedUser.displayName || selectedUser.name}
                    </h4>
                    <p style={{ margin: '0 0 4px 0', color: '#718096', fontSize: '14px' }}>
                      {selectedUser.email}
                    </p>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                      {getStatusBadge(selectedUser.status)}
                      {getKycBadge(selectedUser.kycStatus, selectedUser.kycLevel)}
                    </div>
                  </div>
                </div>

                {/* Action Buttons with Credit/Debit */}
                <div style={{
                  display: 'flex',
                  gap: '12px',
                  marginBottom: '24px',
                  flexWrap: 'wrap'
                }}>
                  {selectedUser.status === 'suspended' ? (
                    <button
                      onClick={() => updateUserStatus(selectedUser._id, 'unsuspend')}
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
                      {actionLoading ? 'Processing...' : 'Unsuspend'}
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        const reason = prompt('Enter suspension reason:');
                        if (reason) updateUserStatus(selectedUser._id, 'suspend', reason);
                      }}
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
                      {actionLoading ? 'Processing...' : 'Suspend'}
                    </button>
                  )}

                  {selectedUser.status !== 'active' && selectedUser.status !== 'suspended' && (
                    <button
                      onClick={() => updateUserStatus(selectedUser._id, 'activate')}
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
                    onClick={() => {
                      if (window.confirm('Are you sure you want to delete this user?')) {
                        updateUserStatus(selectedUser._id, 'delete');
                      }
                    }}
                    disabled={actionLoading}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#ff3b30',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: actionLoading ? 'not-allowed' : 'pointer',
                      opacity: actionLoading ? 0.7 : 1
                    }}
                  >
                    {actionLoading ? 'Processing...' : 'Delete'}
                  </button>

                  {/* Credit Button - FIXED */}
                  <button
                    onClick={handleCreditAction}
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
                    {actionLoading ? 'Processing...' : 'Credit'}
                  </button>

                  {/* Debit Button - FIXED */}
                  <button
                    onClick={handleDebitAction}
                    disabled={actionLoading || selectedUser.walletBalance <= 0}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: selectedUser.walletBalance <= 0 ? '#6c757d' : '#dc3545',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: (actionLoading || selectedUser.walletBalance <= 0) ? 'not-allowed' : 'pointer',
                      opacity: (actionLoading || selectedUser.walletBalance <= 0) ? 0.7 : 1
                    }}
                  >
                    {actionLoading ? 'Processing...' : 'Debit'}
                  </button>
                </div>

                {/* User Details Grid */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
                  gap: '16px'
                }}>
                  <div>
                    <h5 style={{ margin: '0 0 8px 0', color: '#1a202c', fontSize: '14px', fontWeight: '600' }}>
                      Wallet Balance
                    </h5>
                    <p style={{ margin: '0 0 16px 0', color: '#718096', fontSize: '16px', fontWeight: '600' }}>
                      {formatCurrency(selectedUser.walletBalance)}
                    </p>
                  </div>

                  <div>
                    <h5 style={{ margin: '0 0 8px 0', color: '#1a202c', fontSize: '14px', fontWeight: '600' }}>
                      Transactions
                    </h5>
                    <p style={{ margin: '0 0 16px 0', color: '#718096', fontSize: '16px' }}>
                      {selectedUser.transactionCount || 0}
                    </p>
                  </div>

                  <div>
                    <h5 style={{ margin: '0 0 8px 0', color: '#1a202c', fontSize: '14px', fontWeight: '600' }}>
                      Joined
                    </h5>
                    <p style={{ margin: '0 0 16px 0', color: '#718096', fontSize: '14px' }}>
                      {selectedUser.registrationDate}
                    </p>
                  </div>

                  <div>
                    <h5 style={{ margin: '0 0 8px 0', color: '#1a202c', fontSize: '14px', fontWeight: '600' }}>
                      Last Login
                    </h5>
                    <p style={{ margin: '0 0 16px 0', color: '#718096', fontSize: '14px' }}>
                      {selectedUser.lastLoginFormatted}
                    </p>
                  </div>
                </div>

                {/* Recent Transactions */}
                {selectedUser.recentTransactions && selectedUser.recentTransactions.length > 0 && (
                  <div style={{ marginTop: '24px' }}>
                    <h5 style={{ margin: '0 0 12px 0', color: '#1a202c', fontSize: '16px', fontWeight: '600' }}>
                      Recent Transactions
                    </h5>
                    <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                      {selectedUser.recentTransactions.map((tx, index) => (
                        <div key={index} style={{
                          padding: '12px',
                          backgroundColor: '#f8f9fa',
                          borderRadius: '8px',
                          marginBottom: '8px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}>
                          <div>
                            <div style={{ fontWeight: '600', color: '#1a202c', fontSize: '14px' }}>
                              {tx.description || tx.type}
                            </div>
                            <div style={{ color: '#718096', fontSize: '12px' }}>
                              {tx.timeAgo}
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontWeight: '600', color: '#1a202c', fontSize: '14px' }}>
                              {tx.formattedAmount}
                            </div>
                            <div style={{
                              fontSize: '12px',
                              color: tx.status === 'completed' ? '#28a745' : '#ff8c00'
                            }}>
                              {tx.status}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Bulk Actions Dropdown
  const BulkActionsDropdown = () => {
    if (!showBulkActions || selectedUsers.length === 0) return null;

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
          onClick={() => performBulkAction('activate')}
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
          Activate All
        </button>
        <button
          onClick={() => {
            const reason = prompt('Enter suspension reason for all users:');
            if (reason) performBulkAction('suspend', reason);
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
          Suspend All
        </button>
        <button
          onClick={() => {
            if (window.confirm(`Are you sure you want to delete ${selectedUsers.length} users?`)) {
              performBulkAction('delete');
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
          Delete All
        </button>
      </div>
    );
  };

  // Credit Modal Component - IMPROVED
  const CreditModal = () => {
    if (!showCreditModal || !selectedUser) return null;

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
          maxWidth: '400px',
          width: '100%',
          overflow: 'hidden',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
        }}>
          {/* Header */}
          <div style={{
            padding: '24px',
            borderBottom: '1px solid #e2e8f0',
            backgroundColor: '#f8f9fa'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <h3 style={{ margin: 0, color: '#1a202c', fontSize: '18px', fontWeight: '600' }}>
                Credit User
              </h3>
              <button
                onClick={() => {
                  setShowCreditModal(false);
                  setShowUserModal(true); // Reopen user modal when closing credit modal
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#718096',
                  padding: '0',
                  lineHeight: 1
                }}
              >
                ×
              </button>
            </div>
            <p style={{ margin: '8px 0 0 0', color: '#718096', fontSize: '14px' }}>
              Add funds to {selectedUser.name}'s wallet
            </p>
          </div>

          {/* Form */}
          <div style={{ padding: '24px' }}>
            <div style={{ marginBottom: '20px' }}>
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
                placeholder="Enter amount to credit"
                value={transactionForm.amount}
                onChange={(e) => setTransactionForm(prev => ({ ...prev, amount: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '2px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                  outline: 'none'
                }}
                min="0"
                step="0.01"
                autoFocus // Auto-focus on amount field
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: '600',
                color: '#1a202c'
              }}>
                Reason
              </label>
            <textarea
  placeholder="Enter reason for crediting"
  value={transactionForm.reason}
  onChange={(e) => setTransactionForm(prev => ({ ...prev, reason: e.target.value }))}
  style={{
    width: '100%',
    padding: '12px 16px',
    border: '2px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '14px',
    boxSizing: 'border-box',
    outline: 'none',
    resize: 'vertical',
    minHeight: '80px',
    cursor: 'text',
    lineHeight: '1.4',
    fontFamily: 'inherit'
  }}
/>
 </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: '500',
                color: '#718096'
              }}>
                Reference (Optional)
              </label>
              <input
                type="text"
                placeholder="Enter transaction reference"
                value={transactionForm.reference}
                onChange={(e) => setTransactionForm(prev => ({ ...prev, reference: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '2px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                  outline: 'none'
                }}
              />
            </div>

            {/* Buttons */}
            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={() => {
                  setShowCreditModal(false);
                  setShowUserModal(true); // Reopen user modal when canceling
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
                  cursor: actionLoading ? 'not-allowed' : 'pointer',
                  opacity: actionLoading ? 0.7 : 1
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleCreditSubmit}
                disabled={actionLoading || !transactionForm.amount || !transactionForm.reason}
                style={{
                  padding: '10px 20px',
                  border: 'none',
                  borderRadius: '8px',
                  backgroundColor: '#007bff',
                  color: '#fff',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: (actionLoading || !transactionForm.amount || !transactionForm.reason) ? 'not-allowed' : 'pointer',
                  opacity: (actionLoading || !transactionForm.amount || !transactionForm.reason) ? 0.7 : 1
                }}
              >
                {actionLoading ? 'Processing...' : 'Credit User'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Debit Modal Component - IMPROVED
  const DebitModal = () => {
    if (!showDebitModal || !selectedUser) return null;

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
          maxWidth: '400px',
          width: '100%',
          overflow: 'hidden',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
        }}>
          {/* Header */}
          <div style={{
            padding: '24px',
            borderBottom: '1px solid #e2e8f0',
            backgroundColor: '#f8f9fa'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <h3 style={{ margin: 0, color: '#1a202c', fontSize: '18px', fontWeight: '600' }}>
                Debit User
              </h3>
              <button
                onClick={() => {
                  setShowDebitModal(false);
                  setShowUserModal(true); // Reopen user modal when closing debit modal
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#718096',
                  padding: '0',
                  lineHeight: 1
                }}
              >
                ×
              </button>
            </div>
            <p style={{ margin: '8px 0 0 0', color: '#718096', fontSize: '14px' }}>
              Deduct funds from {selectedUser.name}'s wallet
            </p>
            <p style={{ margin: '4px 0 0 0', color: '#28a745', fontSize: '12px', fontWeight: '600' }}>
              Available Balance: {formatCurrency(selectedUser.walletBalance)}
            </p>
          </div>

          {/* Form */}
          <div style={{ padding: '24px' }}>
            <div style={{ marginBottom: '20px' }}>
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
                placeholder="Enter amount to debit"
                value={transactionForm.amount}
                onChange={(e) => setTransactionForm(prev => ({ ...prev, amount: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '2px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                  outline: 'none'
                }}
                min="0"
                max={selectedUser.walletBalance}
                step="0.01"
                autoFocus // Auto-focus on amount field
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: '600',
                color: '#1a202c'
              }}>
                Reason
              </label>
              <textarea
                placeholder="Enter reason for debiting"
                value={transactionForm.reason}
                onChange={(e) => setTransactionForm(prev => ({ ...prev, reason: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '2px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                  outline: 'none',
                  resize: 'vertical',
                  minHeight: '80px'
                }}
              />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: '500',
                color: '#718096'
              }}>
                Reference (Optional)
              </label>
              <input
                type="text"
                placeholder="Enter transaction reference"
                value={transactionForm.reference}
                onChange={(e) => setTransactionForm(prev => ({ ...prev, reference: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '2px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                  outline: 'none'
                }}
              />
            </div>

            {/* Buttons */}
            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={() => {
                  setShowDebitModal(false);
                  setShowUserModal(true); // Reopen user modal when canceling
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
                  cursor: actionLoading ? 'not-allowed' : 'pointer',
                  opacity: actionLoading ? 0.7 : 1
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleDebitSubmit}
                disabled={actionLoading || !transactionForm.amount || !transactionForm.reason || parseFloat(transactionForm.amount) > selectedUser.walletBalance}
                style={{
                  padding: '10px 20px',
                  border: 'none',
                  borderRadius: '8px',
                  backgroundColor: '#dc3545',
                  color: '#fff',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: (actionLoading || !transactionForm.amount || !transactionForm.reason || parseFloat(transactionForm.amount) > selectedUser.walletBalance) ? 'not-allowed' : 'pointer',
                  opacity: (actionLoading || !transactionForm.amount || !transactionForm.reason || parseFloat(transactionForm.amount) > selectedUser.walletBalance) ? 0.7 : 1
                }}
              >
                {actionLoading ? 'Processing...' : 'Debit User'}
              </button>
            </div>
          </div>
        </div>
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
      
      {/* Header Stats Cards */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: isMobile ? '16px' : '24px',
        marginBottom: '32px'
      }}>
       {[
  { label: 'Total Users', value: stats?.totalUsers || 0, color: '#ff3b30', icon: '👥' },
  { label: 'Active Users', value: stats?.activeUsers || 0, color: '#28a745', icon: '✅' },
  { label: 'Suspended', value: stats?.suspendedUsers || 0, color: '#ff3b30', icon: '🚫' },
  { label: 'Unverified', value: stats?.unverifiedUsers || 0, color: '#ff8c00', icon: '⏳' }
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
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '12px'
            }}>
              <span style={{ fontSize: '24px' }}>{stat.icon}</span>
              <h3 style={{
                color: '#1a202c',
                fontSize: '14px',
                fontWeight: '600',
                margin: 0
              }}>
                {stat.label}
              </h3>
            </div>
            <p style={{
              color: stat.color,
              fontSize: isMobile ? '20px' : '24px',
              fontWeight: '700',
              margin: 0
            }}>
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
        overflow: 'hidden'
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
              User Management
            </h2>

            {selectedUsers.length > 0 && (
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
                <span style={{
                  fontSize: '14px',
                  color: '#ff3b30',
                  fontWeight: '600'
                }}>
                  {selectedUsers.length} user{selectedUsers.length > 1 ? 's' : ''} selected
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
                  {actionLoading ? 'Processing...' : 'Actions'}
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
                placeholder="Search users by name, email, phone..."
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
              <option value="suspended">Suspended</option>
              <option value="pending_verification">Pending</option>
              <option value="inactive">Inactive</option>
            </select>

            {/* KYC Filter */}
            <select
              value={filters.kycLevel}
              onChange={(e) => handleFilterChange('kycLevel', e.target.value)}
              style={{
                padding: '12px 16px',
                border: '2px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '14px',
                backgroundColor: '#fff',
                minWidth: '120px'
              }}
            >
              <option value="">All KYC</option>
              <option value="0">Level 0</option>
              <option value="1">Level 1</option>
              <option value="2">Level 2</option>
              <option value="3">Level 3</option>
            </select>

            {/* Account Type Filter */}
            <select
              value={filters.accountType}
              onChange={(e) => handleFilterChange('accountType', e.target.value)}
              style={{
                padding: '12px 16px',
                border: '2px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '14px',
                backgroundColor: '#fff',
                minWidth: '120px'
              }}
            >
              <option value="">All Types</option>
              <option value="basic">Basic</option>
              <option value="premium">Premium</option>
              <option value="business">Business</option>
            </select>
          </div>
        </div>

        {/* Users Table */}
        <div style={{ overflowX: 'auto' }}>
          {loading ? (
            // Loading skeleton
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
              <p style={{ marginTop: '16px', color: '#718096' }}>Loading users...</p>
            </div>
          ) : users.length === 0 ? (
            // Empty state
            <div style={{
              padding: '60px 20px',
              textAlign: 'center',
              color: '#718096'
            }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>👥</div>
              <h3 style={{ color: '#1a202c', marginBottom: '8px' }}>No users found</h3>
              <p>Try adjusting your search or filter criteria</p>
            </div>
          ) : (
            // Users table
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              minWidth: '800px'
            }}>
              <thead>
                <tr style={{ backgroundColor: '#f8f9fa' }}>
                  <th style={{
                    padding: '16px',
                    textAlign: 'left',
                    borderBottom: '1px solid #e2e8f0',
                    width: '50px'
                  }}>
                    <input
                      type="checkbox"
                      checked={selectedUsers.length === users.length}
                      onChange={selectAllUsers}
                      style={{
                        width: '16px',
                        height: '16px',
                        cursor: 'pointer'
                      }}
                    />
                  </th>
                  <th style={{
                    padding: '16px',
                    textAlign: 'left',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#1a202c',
                    borderBottom: '1px solid #e2e8f0'
                  }}>User</th>
                  <th style={{
                    padding: '16px',
                    textAlign: 'left',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#1a202c',
                    borderBottom: '1px solid #e2e8f0'
                  }}>Status</th>
                  <th style={{
                    padding: '16px',
                    textAlign: 'left',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#1a202c',
                    borderBottom: '1px solid #e2e8f0'
                  }}>KYC</th>
                  <th style={{
                    padding: '16px',
                    textAlign: 'left',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#1a202c',
                    borderBottom: '1px solid #e2e8f0'
                  }}>Wallet</th>
                  <th style={{
                    padding: '16px',
                    textAlign: 'left',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#1a202c',
                    borderBottom: '1px solid #e2e8f0'
                  }}>Joined</th>
                  <th style={{
                    padding: '16px',
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
                {users.map((user) => (
                  <tr
                    key={user._id}
                    style={{
                      borderBottom: '1px solid #f1f5f9',
                      backgroundColor: selectedUsers.includes(user._id) ? '#fff5f5' : '#fff'
                    }}
                  >
                    <td style={{ padding: '16px' }}>
                      <input
                        type="checkbox"
                        checked={selectedUsers.includes(user._id)}
                        onChange={() => handleUserSelect(user._id)}
                        style={{
                          width: '16px',
                          height: '16px',
                          cursor: 'pointer'
                        }}
                      />
                    </td>
                    <td style={{ padding: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                          width: '40px',
                          height: '40px',
                          backgroundColor: '#ff3b30',
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#fff',
                          fontWeight: '600',
                          fontSize: '14px'
                        }}>
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div style={{
                            fontWeight: '600',
                            color: '#1a202c',
                            fontSize: '14px'
                          }}>
                            {user.name}
                          </div>
                          <div style={{
                            color: '#718096',
                            fontSize: '12px'
                          }}>
                            {user.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '16px' }}>
                      {getStatusBadge(user.status)}
                    </td>
                    <td style={{ padding: '16px' }}>
                      {getKycBadge(user.kycStatus, user.kycLevel)}
                    </td>
                    <td style={{ padding: '16px' }}>
                      <div style={{
                        fontWeight: '600',
                        color: '#1a202c',
                        fontSize: '14px'
                      }}>
                        {formatCurrency(user.walletBalance)}
                      </div>
                      <div style={{
                        color: '#718096',
                        fontSize: '12px'
                      }}>
                        {user.transactionCount} transactions
                      </div>
                    </td>
                    <td style={{ padding: '16px' }}>
                      <div style={{
                        color: '#1a202c',
                        fontSize: '14px'
                      }}>
                        {user.registrationDate}
                      </div>
                      <div style={{
                        color: '#718096',
                        fontSize: '12px'
                      }}>
                        {user.lastLoginFormatted}
                      </div>
                    </td>
                    <td style={{ padding: '16px', textAlign: 'right' }}>
                      <button
                        onClick={() => handleViewDetails(user)}
                        disabled={userDetailsLoading}
                        style={{
                          padding: '6px 12px',
                          backgroundColor: '#f7fafc',
                          border: '1px solid #e2e8f0',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: '600',
                          color: '#1a202c',
                          cursor: userDetailsLoading ? 'not-allowed' : 'pointer',
                          opacity: userDetailsLoading ? 0.7 : 1
                        }}
                      >
                        {userDetailsLoading ? 'Loading...' : 'View Details'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {!loading && users.length > 0 && (
          <div style={{ padding: '20px 24px', borderTop: '1px solid #e2e8f0' }}>
            <PaginationControls />
          </div>
        )}
      </div>

      {/* User Modal */}
      <UserModal />

      {/* Credit Modal */}
      <CreditModal />

      {/* Debit Modal */}
      <DebitModal />
    </div>
  );
};

export default UserManagement;