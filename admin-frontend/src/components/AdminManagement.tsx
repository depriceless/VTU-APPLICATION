import React, { useState, useEffect, useCallback } from 'react';
import { API_CONFIG } from "../config/api.config";

// Error Boundary Component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '40px', textAlign: 'center', color: '#dc3545' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
          <h3 style={{ marginBottom: '16px' }}>Something went wrong</h3>
          <p style={{ marginBottom: '20px' }}>{this.state.error?.message}</p>
          <button 
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{
              padding: '10px 20px',
              backgroundColor: '#ff3b30',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: '600'
            }}
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// AdminModal component
const AdminModal = ({ 
  showAdminModal, 
  setShowAdminModal, 
  selectedAdmin, 
  adminForm, 
  setAdminForm, 
  actionLoading, 
  handleAdminSubmit,
  ROLE_CONFIG,
  currentUserRole 
}) => {
  if (!showAdminModal) return null;

  const inputStyle = {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '14px',
    color: '#000000',
    backgroundColor: '#ffffff',
    boxSizing: 'border-box'
  };

  const labelStyle = {
    display: 'block',
    marginBottom: '8px',
    fontSize: '14px',
    fontWeight: '600',
    color: '#000000'
  };

  const gridStyle = {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px',
    marginBottom: '20px'
  };

  const isSuperAdmin = currentUserRole === 'super_admin';

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
      zIndex: 2000,
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: '#fff',
        borderRadius: '12px',
        maxWidth: '500px',
        width: '100%',
        maxHeight: '80vh',
        overflow: 'auto',
        border: '1px solid #e2e8f0',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1)'
      }}>
        <div style={{
          padding: '20px',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#f8f9fa'
        }}>
          <h3 style={{ margin: 0, color: '#000000', fontSize: '18px', fontWeight: '700' }}>
            {selectedAdmin ? 'Edit Admin User' : 'Create New Admin User'}
          </h3>
          <button
            onClick={() => setShowAdminModal(false)}
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
          <div style={gridStyle}>
            <div>
              <label style={labelStyle}>Username *</label>
              <input
                type="text"
                value={adminForm.username}
                onChange={(e) => setAdminForm(prev => ({ ...prev, username: e.target.value }))}
                style={inputStyle}
                required
              />
            </div>
            
            <div>
              <label style={labelStyle}>Email Address *</label>
              <input
                type="email"
                value={adminForm.email}
                onChange={(e) => setAdminForm(prev => ({ ...prev, email: e.target.value }))}
                style={inputStyle}
                required
              />
            </div>
          </div>

          <div style={gridStyle}>
            <div>
              <label style={labelStyle}>Phone Number</label>
              <input
                type="tel"
                value={adminForm.phone}
                onChange={(e) => setAdminForm(prev => ({ ...prev, phone: e.target.value }))}
                style={inputStyle}
              />
            </div>
            
            <div>
              <label style={labelStyle}>Role *</label>
              <select
                value={adminForm.role}
                onChange={(e) => setAdminForm(prev => ({ ...prev, role: e.target.value }))}
                style={inputStyle}
                required
              >
                <option value="">Select Role</option>
                {Object.entries(ROLE_CONFIG).map(([key, config]) => (
                  <option key={key} value={key}>{config.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={gridStyle}>
            <div>
              <label style={labelStyle}>
                Password {selectedAdmin ? '' : '*'}
              </label>
              <input
                type="password"
                value={adminForm.password}
                onChange={(e) => setAdminForm(prev => ({ ...prev, password: e.target.value }))}
                style={inputStyle}
                placeholder={selectedAdmin ? 'Leave blank to keep current' : 'Enter password'}
              />
            </div>
            
            <div>
              <label style={labelStyle}>Confirm Password</label>
              <input
                type="password"
                value={adminForm.confirmPassword}
                onChange={(e) => setAdminForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                style={inputStyle}
              />
            </div>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={labelStyle}>Status</label>
            <select
              value={adminForm.isActive ? 'active' : 'inactive'}
              onChange={(e) => setAdminForm(prev => ({ ...prev, isActive: e.target.value === 'active' }))}
              style={inputStyle}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <button
              onClick={() => setShowAdminModal(false)}
              disabled={actionLoading}
              style={{
                padding: '10px 20px',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                backgroundColor: '#fff',
                color: '#000000',
                fontSize: '14px',
                fontWeight: '600',
                cursor: actionLoading ? 'not-allowed' : 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleAdminSubmit}
              disabled={actionLoading || !adminForm.username || !adminForm.email || !adminForm.role || (!selectedAdmin && !adminForm.password)}
              style={{
                padding: '10px 20px',
                border: 'none',
                borderRadius: '8px',
                backgroundColor: '#ff3b30',
                color: '#fff',
                fontSize: '14px',
                fontWeight: '600',
                cursor: actionLoading ? 'not-allowed' : 'pointer',
                opacity: actionLoading || !adminForm.username || !adminForm.email || !adminForm.role || (!selectedAdmin && !adminForm.password) ? 0.7 : 1
              }}
            >
              {actionLoading ? 'Saving...' : selectedAdmin ? 'Update Admin' : 'Create Admin'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// RoleModal component for configuring roles
const RoleModal = ({ 
  showRoleModal, 
  setShowRoleModal, 
  selectedRole, 
  roleForm, 
  setRoleForm, 
  actionLoading, 
  handleRoleSubmit,
  ALL_PERMISSIONS,
  PERMISSION_CATEGORIES 
}) => {
  if (!showRoleModal) return null;

  const togglePermission = (permissionId) => {
    setRoleForm(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permissionId)
        ? prev.permissions.filter(p => p !== permissionId)
        : [...prev.permissions, permissionId]
    }));
  };

  const toggleCategory = (category) => {
    const categoryPermissions = ALL_PERMISSIONS
      .filter(p => p.category === category)
      .map(p => p.id);
    
    const allCategorySelected = categoryPermissions.every(p => 
      roleForm.permissions.includes(p)
    );

    setRoleForm(prev => ({
      ...prev,
      permissions: allCategorySelected
        ? prev.permissions.filter(p => !categoryPermissions.includes(p))
        : [...new Set([...prev.permissions, ...categoryPermissions])]
    }));
  };

  const inputStyle = {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '14px',
    color: '#000000',
    backgroundColor: '#ffffff',
    boxSizing: 'border-box'
  };

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
      zIndex: 2000,
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: '#fff',
        borderRadius: '12px',
        maxWidth: '800px',
        width: '100%',
        maxHeight: '90vh',
        overflow: 'auto',
        border: '1px solid #e2e8f0',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1)'
      }}>
        <div style={{
          padding: '20px',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#f8f9fa'
        }}>
          <h3 style={{ margin: 0, color: '#000000', fontSize: '18px', fontWeight: '700' }}>
            {selectedRole ? `Configure ${selectedRole.name} Role` : 'Create New Role'}
          </h3>
          <button
            onClick={() => setShowRoleModal(false)}
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
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: '#000000' }}>
                Role Name *
              </label>
              <input
                type="text"
                value={roleForm.name}
                onChange={(e) => setRoleForm(prev => ({ ...prev, name: e.target.value }))}
                style={inputStyle}
                required
              />
            </div>
            
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: '#000000' }}>
                Description
              </label>
              <input
                type="text"
                value={roleForm.description}
                onChange={(e) => setRoleForm(prev => ({ ...prev, description: e.target.value }))}
                style={inputStyle}
              />
            </div>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#000000' }}>
                Permissions ({roleForm.permissions.length} selected)
              </h4>
              <button
                onClick={() => setRoleForm(prev => ({ ...prev, permissions: ALL_PERMISSIONS.map(p => p.id) }))}
                style={{
                  padding: '8px 12px',
                  backgroundColor: '#f7fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  color: '#000000'
                }}
              >
                Select All
              </button>
            </div>

            <div style={{ maxHeight: '400px', overflow: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
              {Object.entries(PERMISSION_CATEGORIES).map(([categoryKey, category]) => {
                const categoryPermissions = ALL_PERMISSIONS.filter(p => p.category === categoryKey);
                const selectedCount = categoryPermissions.filter(p => 
                  roleForm.permissions.includes(p.id)
                ).length;

                return (
                  <div key={categoryKey} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <div style={{
                      padding: '12px 16px',
                      backgroundColor: '#f8f9fa',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer'
                    }}
                    onClick={() => toggleCategory(categoryKey)}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '16px' }}>{category.icon}</span>
                        <span style={{ fontWeight: '600', color: '#000000' }}>
                          {category.name}
                        </span>
                        <span style={{ fontSize: '12px', color: '#718096' }}>
                          ({selectedCount}/{categoryPermissions.length})
                        </span>
                      </div>
                      <span style={{ fontSize: '16px', color: '#000000' }}>
                        {selectedCount === categoryPermissions.length ? '✅' : '⬜'}
                      </span>
                    </div>
                    
                    <div style={{ padding: '12px' }}>
                      {categoryPermissions.map(permission => (
                        <label key={permission.id} style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '8px',
                          cursor: 'pointer',
                          borderRadius: '4px',
                          transition: 'background-color 0.2s',
                          color: '#000000'
                        }}
                        onMouseEnter={(e) => e.target.style.backgroundColor = '#f8f9fa'}
                        onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                        >
                          <input
                            type="checkbox"
                            checked={roleForm.permissions.includes(permission.id)}
                            onChange={() => togglePermission(permission.id)}
                            style={{ width: '16px', height: '16px' }}
                          />
                          <span style={{ fontSize: '14px' }}>{permission.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <button
              onClick={() => setShowRoleModal(false)}
              disabled={actionLoading}
              style={{
                padding: '10px 20px',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                backgroundColor: '#fff',
                color: '#000000',
                fontSize: '14px',
                fontWeight: '600',
                cursor: actionLoading ? 'not-allowed' : 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleRoleSubmit}
              disabled={actionLoading || !roleForm.name}
              style={{
                padding: '10px 20px',
                border: 'none',
                borderRadius: '8px',
                backgroundColor: '#ff3b30',
                color: '#fff',
                fontSize: '14px',
                fontWeight: '600',
                cursor: actionLoading ? 'not-allowed' : 'pointer',
                opacity: actionLoading || !roleForm.name ? 0.7 : 1
              }}
            >
              {actionLoading ? 'Saving...' : selectedRole ? 'Update Role' : 'Create Role'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const AdminManagement = () => {
  const [admins, setAdmins] = useState([]);
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [activityLogs, setActivityLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAdmins, setSelectedAdmins] = useState([]);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState(null);
  const [selectedRole, setSelectedRole] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [token, setToken] = useState('');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [activeTab, setActiveTab] = useState('admins');
  const [isMobile, setIsMobile] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState('');

  // Form states
  const [adminForm, setAdminForm] = useState({
    username: '',
    email: '',
    phone: '',
    role: '',
    password: '',
    confirmPassword: '',
    isActive: true
  });

  const [roleForm, setRoleForm] = useState({
    name: '',
    description: '',
    permissions: []
  });

  // Filters and search state
  const [filters, setFilters] = useState({
    search: '',
    role: '',
    status: '',
    page: 1,
    limit: 25,
    sortBy: 'username',
    sortOrder: 'asc'
  });

  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    hasNextPage: false,
    hasPrevPage: false
  });

  const [stats, setStats] = useState({
    totalAdmins: 0,
    activeAdmins: 0,
    inactiveAdmins: 0,
    totalRoles: 0
  });

  // API Base URL Configuration
  const API_BASE_URL = API_CONFIG?.BASE_URL || 'http://localhost:5000';

  // Role and permission configurations
  const ROLE_CONFIG = {
    super_admin: { color: '#ff3b30', name: 'Super Admin', priority: 1 },
    admin: { color: '#ff8c00', name: 'Administrator', priority: 2 },
    manager: { color: '#28a745', name: 'Manager', priority: 3 },
    support: { color: '#007bff', name: 'Support', priority: 4 },
    moderator: { color: '#6f42c1', name: 'Moderator', priority: 5 },
    user: { color: '#6c757d', name: 'User', priority: 6 }
  };

  const PERMISSION_CATEGORIES = {
    users: { name: 'User Management', icon: '👥', color: '#007bff' },
    transactions: { name: 'Transactions', icon: '💳', color: '#28a745' },
    services: { name: 'Services', icon: '📱', color: '#ff8c00' },
    financial: { name: 'Financial', icon: '💰', color: '#dc3545' },
    system: { name: 'System', icon: '⚙️', color: '#6c757d' },
    reports: { name: 'Reports', icon: '📊', color: '#20c997' }
  };

  const ALL_PERMISSIONS = [
    { id: 'users_view', name: 'View Users', category: 'users' },
    { id: 'users_create', name: 'Create Users', category: 'users' },
    { id: 'users_edit', name: 'Edit Users', category: 'users' },
    { id: 'users_delete', name: 'Delete Users', category: 'users' },
    { id: 'users_suspend', name: 'Suspend Users', category: 'users' },
    { id: 'transactions_view', name: 'View Transactions', category: 'transactions' },
    { id: 'transactions_process', name: 'Process Transactions', category: 'transactions' },
    { id: 'transactions_refund', name: 'Process Refunds', category: 'transactions' },
    { id: 'services_view', name: 'View Services', category: 'services' },
    { id: 'services_configure', name: 'Configure Services', category: 'services' },
    { id: 'services_pricing', name: 'Manage Pricing', category: 'services' },
    { id: 'financial_view', name: 'View Financials', category: 'financial' },
    { id: 'financial_reports', name: 'Generate Reports', category: 'financial' },
    { id: 'system_config', name: 'System Configuration', category: 'system' },
    { id: 'system_logs', name: 'View System Logs', category: 'system' },
    { id: 'reports_view', name: 'View Reports', category: 'reports' },
    { id: 'reports_export', name: 'Export Reports', category: 'reports' }
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

  // Safe API call function
  const makeApiCall = useCallback(async (endpoint, options = {}) => {
    try {
      const formattedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
      const url = `${API_BASE_URL}${formattedEndpoint}`;
      
      const defaultOptions = {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          ...options.headers
        },
        credentials: 'include',
      };

      const response = await fetch(url, {
        ...defaultOptions,
        ...options
      });

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch (parseError) {
          console.warn('Could not parse error response as JSON');
        }
        throw new Error(errorMessage);
      }

      const contentLength = response.headers.get('content-length');
      if (contentLength === '0' || !response.body) {
        return { success: true };
      }

      return await response.json();
    } catch (error) {
      console.error('API Call failed:', error);
      
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new Error('Network error: Unable to connect to server. Please check your internet connection and ensure the backend is running.');
      }
      
      throw error;
    }
  }, [token, API_BASE_URL]);

  // Get current user role from profile
  const fetchCurrentUserProfile = useCallback(async () => {
    try {
      const authToken = localStorage.getItem('admin_token') || sessionStorage.getItem('admin_token');
      if (!authToken) return;
      
      const response = await fetch(`${API_BASE_URL}/api/admin/profile`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.profile && data.profile.role) {
          setCurrentUserRole(data.profile.role);
          // Also store in localStorage for easy access
          localStorage.setItem('admin_profile', JSON.stringify(data.profile));
        }
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  }, [API_BASE_URL]);

  // API Functions
  const fetchStats = useCallback(async () => {
    if (!token) return;
    
    try {
      const data = await makeApiCall('/api/admin/management/stats');
      setStats(data.stats || {
        totalAdmins: 0,
        activeAdmins: 0,
        inactiveAdmins: 0,
        totalRoles: 0
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
      showNotification(`Failed to fetch statistics: ${error.message}`, 'error');
    }
  }, [token, makeApiCall, showNotification]);

  // Date parsing utility
  const parseDateString = (dateString) => {
    if (!dateString) return null;
    
    // If it's already a Date object
    if (dateString instanceof Date) {
      return !isNaN(dateString.getTime()) ? dateString : null;
    }
    
    // If it's a string
    if (typeof dateString === 'string') {
      // Try ISO format
      let date = new Date(dateString);
      if (!isNaN(date.getTime())) return date;
      
      // Try removing timezone info
      date = new Date(dateString.replace(/GMT[+-]\d{4}|UTC/i, '').trim());
      if (!isNaN(date.getTime())) return date;
      
      // Try common format variations
      const formats = [
        dateString,
        dateString.replace('T', ' '),
        dateString.split('.')[0],
        dateString.split('(')[0].trim(),
      ];
      
      for (const format of formats) {
        date = new Date(format);
        if (!isNaN(date.getTime())) return date;
      }
    }
    
    // If it's a number (timestamp)
    if (typeof dateString === 'number') {
      const date = new Date(dateString);
      if (!isNaN(date.getTime())) return date;
    }
    
    return null;
  };

  const fetchAdmins = useCallback(async () => {
    if (!token) return;
    
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      if (filters.search) queryParams.append('search', filters.search);
      if (filters.role) queryParams.append('role', filters.role);
      if (filters.status) queryParams.append('status', filters.status);
      queryParams.append('page', filters.page.toString());
      queryParams.append('limit', filters.limit.toString());
      
      const data = await makeApiCall(`/api/admin/management/admins?${queryParams}`);
      
      let adminsData = [];
      if (Array.isArray(data)) {
        adminsData = data;
      } else if (data && Array.isArray(data.admins)) {
        adminsData = data.admins;
      } else if (data && Array.isArray(data.users)) {
        adminsData = data.users;
      } else if (data && Array.isArray(data.data)) {
        adminsData = data.data;
      }
      
      const processedAdmins = adminsData.map(admin => {
        // Parse last login date
        const lastLoginDate = parseDateString(
          admin.lastLogin || 
          admin.last_login || 
          admin.lastSession || 
          admin.loginAt || 
          admin.lastLoginAt || 
          admin.last_active ||
          admin.lastActivity
        );
        
        // Fallback to created date if no login date
        const createdDate = parseDateString(
          admin.createdAt || 
          admin.created_at || 
          admin.dateCreated || 
          admin.created
        );
        
        return {
          _id: admin._id || admin.id || `temp-${Math.random()}`,
          username: admin.name || admin.username || admin.userName || 'Unknown User',
          email: admin.email || admin.emailAddress || 'No email',
          role: admin.role || admin.roleType || admin.userRole || 'user',
          isActive: admin.isActive !== undefined ? admin.isActive : 
                    admin.status === 'active' ? true : 
                    admin.status === 'inactive' ? false : true,
          lastLogin: lastLoginDate || createdDate || null,
          phone: admin.phone || admin.phoneNumber || '',
          createdAt: createdDate || new Date(),
          ...admin
        };
      });
      
      setAdmins(processedAdmins);
      setPagination(data.pagination || {
        currentPage: 1,
        totalPages: 1,
        totalItems: processedAdmins.length,
        hasNextPage: false,
        hasPrevPage: false
      });
    } catch (error) {
      console.error('Error fetching admins:', error);
      showNotification(`Failed to fetch admin users: ${error.message}`, 'error');
      setAdmins([]);
    } finally {
      setLoading(false);
    }
  }, [filters, token, makeApiCall, showNotification]);

  const fetchRoles = useCallback(async () => {
    if (!token) return;
    
    try {
      const data = await makeApiCall('/api/admin/management/roles');
      
      let rolesData = [];
      if (Array.isArray(data)) {
        rolesData = data;
      } else if (data && Array.isArray(data.roles)) {
        rolesData = data.roles;
      } else if (data && Array.isArray(data.data)) {
        rolesData = data.data;
      }
      
      setRoles(rolesData);
      setPermissions(Array.isArray(data.permissions) ? data.permissions : ALL_PERMISSIONS);
    } catch (error) {
      console.error('Error fetching roles:', error);
      showNotification(`Failed to fetch roles: ${error.message}`, 'error');
      setRoles([]);
    }
  }, [token, makeApiCall, showNotification]);

  const fetchActivityLogs = useCallback(async () => {
    if (!token) return;
    
    try {
      const data = await makeApiCall('/api/admin/management/activity-logs');
      
      let logsData = [];
      if (Array.isArray(data)) {
        logsData = data;
      } else if (data && Array.isArray(data.logs)) {
        logsData = data.logs;
      } else if (data && Array.isArray(data.data)) {
        logsData = data.data;
      } else if (data && Array.isArray(data.activities)) {
        logsData = data.activities;
      }
      
      setActivityLogs(logsData);
    } catch (error) {
      console.error('Error fetching activity logs:', error);
      showNotification(`Failed to fetch activity logs: ${error.message}`, 'error');
      setActivityLogs([]);
    }
  }, [token, makeApiCall, showNotification]);

  // Admin management functions
  const createAdmin = useCallback(async (adminData) => {
    if (!token) return;
    
    try {
      setActionLoading(true);
      
      const dataToSend = {
        ...adminData,
        isActive: adminData.isActive !== undefined ? adminData.isActive : true
      };
      
      await makeApiCall('/api/admin/management/admins', {
        method: 'POST',
        body: JSON.stringify(dataToSend)
      });
      showNotification('Admin user created successfully');
      await fetchAdmins();
      await fetchStats();
    } catch (error) {
      console.error('Error creating admin:', error);
      showNotification(`Failed to create admin user: ${error.message}`, 'error');
    } finally {
      setActionLoading(false);
    }
  }, [token, makeApiCall, showNotification, fetchAdmins, fetchStats]);

  const updateAdmin = useCallback(async (adminId, adminData) => {
    if (!token) return;
    
    try {
      setActionLoading(true);
      await makeApiCall(`/api/admin/management/admins/${adminId}`, {
        method: 'PUT',
        body: JSON.stringify(adminData)
      });
      showNotification('Admin user updated successfully');
      await fetchAdmins();
    } catch (error) {
      console.error('Error updating admin:', error);
      showNotification(`Failed to update admin user: ${error.message}`, 'error');
    } finally {
      setActionLoading(false);
    }
  }, [token, makeApiCall, showNotification, fetchAdmins]);

  const deleteAdmin = useCallback(async (adminId) => {
    if (!token) return;
    if (!window.confirm('Are you sure you want to delete this admin user?')) return;
    
    try {
      setActionLoading(true);
      await makeApiCall(`/api/admin/management/admins/${adminId}`, {
        method: 'DELETE'
      });
      showNotification('Admin user deleted successfully');
      await fetchAdmins();
      await fetchStats();
    } catch (error) {
      console.error('Error deleting admin:', error);
      showNotification(`Failed to delete admin user: ${error.message}`, 'error');
    } finally {
      setActionLoading(false);
    }
  }, [token, makeApiCall, showNotification, fetchAdmins, fetchStats]);

  const toggleAdminStatus = useCallback(async (adminId, currentStatus) => {
    if (!token) return;
    
    try {
      setActionLoading(true);
      const newStatus = !currentStatus;
      await makeApiCall(`/api/admin/management/admins/${adminId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ isActive: newStatus })
      });
      showNotification(`Admin ${newStatus ? 'activated' : 'deactivated'} successfully`);
      await fetchAdmins();
      await fetchStats();
    } catch (error) {
      console.error('Error toggling admin status:', error);
      showNotification(`Failed to update admin status: ${error.message}`, 'error');
    } finally {
      setActionLoading(false);
    }
  }, [token, makeApiCall, showNotification, fetchAdmins, fetchStats]);

  // Role management functions
  const createRole = useCallback(async (roleData) => {
    if (!token) return;
    
    try {
      setActionLoading(true);
      await makeApiCall('/api/admin/management/roles', {
        method: 'POST',
        body: JSON.stringify(roleData)
      });
      showNotification('Role created successfully');
      await fetchRoles();
      await fetchStats();
    } catch (error) {
      console.error('Error creating role:', error);
      showNotification(`Failed to create role: ${error.message}`, 'error');
    } finally {
      setActionLoading(false);
    }
  }, [token, makeApiCall, showNotification, fetchRoles, fetchStats]);

  const updateRole = useCallback(async (roleId, roleData) => {
    if (!token) return;
    
    try {
      setActionLoading(true);
      await makeApiCall(`/api/admin/management/roles/${roleId}`, {
        method: 'PUT',
        body: JSON.stringify(roleData)
      });
      showNotification('Role updated successfully');
      await fetchRoles();
    } catch (error) {
      console.error('Error updating role:', error);
      showNotification(`Failed to update role: ${error.message}`, 'error');
    } finally {
      setActionLoading(false);
    }
  }, [token, makeApiCall, showNotification, fetchRoles]);

  const deleteRole = useCallback(async (roleId) => {
    if (!token) return;
    if (!window.confirm('Are you sure you want to delete this role?')) return;
    
    try {
      setActionLoading(true);
      await makeApiCall(`/api/admin/management/roles/${roleId}`, {
        method: 'DELETE'
      });
      showNotification('Role deleted successfully');
      await fetchRoles();
      await fetchStats();
    } catch (error) {
      console.error('Error deleting role:', error);
      showNotification(`Failed to delete role: ${error.message}`, 'error');
    } finally {
      setActionLoading(false);
    }
  }, [token, makeApiCall, showNotification, fetchRoles, fetchStats]);

  // Check mobile screen
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Token management and get current user role
  useEffect(() => {
    const authToken = localStorage.getItem('admin_token') || sessionStorage.getItem('admin_token');
    if (authToken) {
      setToken(authToken);
      fetchCurrentUserProfile();
      
      // Also check localStorage for cached profile
      const adminProfile = localStorage.getItem('admin_profile');
      if (adminProfile) {
        try {
          const profile = JSON.parse(adminProfile);
          if (profile.role) {
            setCurrentUserRole(profile.role);
          }
        } catch (e) {
          console.error('Error parsing admin profile:', e);
        }
      }
    } else {
      showNotification('Please login again', 'error');
      setTimeout(() => {
        window.location.href = '/';
      }, 2000);
    }
  }, [showNotification, fetchCurrentUserProfile]);

  // Data fetching
  useEffect(() => {
    if (token) {
      fetchStats();
      if (activeTab === 'admins') {
        fetchAdmins();
      } else if (activeTab === 'roles') {
        fetchRoles();
      } else if (activeTab === 'logs') {
        fetchActivityLogs();
      }
    }
  }, [token, activeTab, filters]);

  // Handle filter changes
  const handleFilterChange = useCallback((key, value) => {
    setFilters(prev => {
      if (prev[key] === value) return prev;
      return {
        ...prev,
        [key]: value,
        page: key !== 'page' ? 1 : value
      };
    });
  }, []);

  const handleAdminSelect = useCallback((adminId) => {
    setSelectedAdmins(prev => 
      prev.includes(adminId) 
        ? prev.filter(id => id !== adminId)
        : [...prev, adminId]
    );
  }, []);

  const selectAllAdmins = useCallback(() => {
    if (selectedAdmins.length === admins.length && admins.length > 0) {
      setSelectedAdmins([]);
    } else {
      setSelectedAdmins(admins.map(admin => admin._id).filter(id => id));
    }
  }, [selectedAdmins.length, admins]);

  // Form handlers
  const handleAdminSubmit = useCallback(async () => {
    if (adminForm.password !== adminForm.confirmPassword) {
      showNotification('Passwords do not match', 'error');
      return;
    }
    
    const adminData = {
      name: adminForm.username,
      email: adminForm.email,
      phone: adminForm.phone,
      role: adminForm.role,
      isActive: adminForm.isActive
    };
    
    if (adminForm.password) {
      adminData.password = adminForm.password;
    }
    
    try {
      if (selectedAdmin) {
        await updateAdmin(selectedAdmin._id, adminData);
      } else {
        await createAdmin(adminData);
      }
      
      setShowAdminModal(false);
      setAdminForm({
        username: '',
        email: '',
        phone: '',
        role: '',
        password: '',
        confirmPassword: '',
        isActive: true
      });
      setSelectedAdmin(null);
    } catch (error) {
      // Error handling is done in the API functions
    }
  }, [adminForm, selectedAdmin, updateAdmin, createAdmin, showNotification]);

  const handleRoleSubmit = useCallback(async () => {
    const roleData = {
      name: roleForm.name,
      description: roleForm.description,
      permissions: roleForm.permissions
    };
    
    if (selectedRole) {
      await updateRole(selectedRole._id, roleData);
    } else {
      await createRole(roleData);
    }
    
    setShowRoleModal(false);
    setRoleForm({
      name: '',
      description: '',
      permissions: []
    });
    setSelectedRole(null);
  }, [roleForm, selectedRole, updateRole, createRole]);

  const handleEditAdmin = useCallback((admin) => {
    setSelectedAdmin(admin);
    setAdminForm({
      username: admin.name || admin.username || '',
      email: admin.email || '',
      phone: admin.phone || '',
      role: admin.role || '',
      password: '',
      confirmPassword: '',
      isActive: admin.isActive !== undefined ? admin.isActive : true
    });
    setShowAdminModal(true);
  }, []);

  const handleNewAdmin = useCallback(() => {
    setSelectedAdmin(null);
    setAdminForm({
      username: '',
      email: '',
      phone: '',
      role: '',
      password: '',
      confirmPassword: '',
      isActive: true
    });
    setShowAdminModal(true);
  }, []);

  const handleConfigureRole = useCallback((role) => {
    setSelectedRole(role);
    setRoleForm({
      name: role.name || '',
      description: role.description || '',
      permissions: Array.isArray(role.permissions) ? role.permissions : []
    });
    setShowRoleModal(true);
  }, []);

  const handleNewRole = useCallback(() => {
    setSelectedRole(null);
    setRoleForm({
      name: '',
      description: '',
      permissions: []
    });
    setShowRoleModal(true);
  }, []);

  // Status badges and utilities
  const getStatusBadge = useCallback((isActive) => {
    const statusConfig = {
      true: { bg: '#28a745', text: 'Active' },
      false: { bg: '#6c757d', text: 'Inactive' }
    };

    const config = statusConfig[isActive] || statusConfig.false;

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

  const getRoleBadge = useCallback((role) => {
    const config = ROLE_CONFIG[role] || { color: '#6c757d', name: role || 'Unknown' };
    
    return (
      <span style={{
        backgroundColor: config.color,
        color: '#fff',
        padding: '4px 8px',
        borderRadius: '12px',
        fontSize: '11px',
        fontWeight: '600',
        textTransform: 'uppercase'
      }}>
        {config.name}
      </span>
    );
  }, []);

  const formatDate = useCallback((dateString) => {
    const date = parseDateString(dateString);
    
    if (!date) {
      return 'Not logged in yet';
    }
    
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffMins < 1) {
      return 'Just now';
    } else if (diffMins < 60) {
      return `${diffMins}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else if (diffDays < 7) {
      return `${diffDays}d ago`;
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    }
  }, []);

  const getInitials = useCallback((username) => {
    if (!username || typeof username !== 'string') return '??';
    
    // Clean up the username - remove extra spaces
    const cleanUsername = username.trim().replace(/\s+/g, ' ');
    const names = cleanUsername.split(' ').filter(name => name.length > 0);
    
    if (names.length === 0) return '??';
    if (names.length === 1) return names[0].charAt(0).toUpperCase();
    
    // Return first letter of first name + first letter of last name
    return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
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
        {Math.min(pagination.currentPage * filters.limit, pagination.totalItems)} of{' '}
        {pagination.totalItems} items
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
            color: pagination.hasPrevPage ? '#000000' : '#a0aec0',
            cursor: pagination.hasPrevPage ? 'pointer' : 'not-allowed',
            fontSize: '14px'
          }}
        >
          Previous
        </button>

        <span style={{ padding: '8px 12px', fontSize: '14px', color: '#000000' }}>
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
            color: pagination.hasNextPage ? '#000000' : '#a0aec0',
            cursor: pagination.hasNextPage ? 'pointer' : 'not-allowed',
            fontSize: '14px'
          }}
        >
          Next
        </button>
      </div>
    </div>
  );

  // Tab navigation
  const TabNavigation = () => (
    <div style={{
      display: 'flex',
      gap: '4px',
      marginBottom: '16px',
      borderBottom: '1px solid #e2e8f0',
      overflowX: 'auto',
      paddingBottom: '4px'
    }}>
      {[
        { id: 'admins', label: 'Admin Users', icon: '👨‍💼', count: stats.totalAdmins },
        { id: 'roles', label: 'Roles & Permissions', icon: '🔑', count: stats.totalRoles },
        { id: 'logs', label: 'Activity Logs', icon: '📝', count: null }
      ].map((tab) => (
        <button
          key={tab.id}
          onClick={() => setActiveTab(tab.id)}
          style={{
            padding: '8px 12px',
            border: 'none',
            borderBottom: activeTab === tab.id ? '2px solid #ff3b30' : '2px solid transparent',
            backgroundColor: 'transparent',
            color: activeTab === tab.id ? '#ff3b30' : '#000000',
            fontSize: '13px',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            whiteSpace: 'nowrap'
          }}
        >
          <span>{tab.icon}</span>
          <span>{tab.label}</span>
          {tab.count !== null && (
            <span style={{
              backgroundColor: activeTab === tab.id ? '#ff3b30' : '#e2e8f0',
              color: activeTab === tab.id ? '#fff' : '#000000',
              padding: '2px 6px',
              borderRadius: '10px',
              fontSize: '10px',
              fontWeight: '700'
            }}>
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );

  // Admin Users Tab Content
  const AdminUsersContent = () => {
    const isSuperAdmin = currentUserRole === 'super_admin';
    
    return (
      <div>
        {/* Stats Cards */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: isMobile ? '8px' : '12px',
          marginBottom: '20px'
        }}>
          {[
            { label: 'Total Admins', value: stats.totalAdmins, color: '#ff3b30', icon: '👨‍💼' },
            { label: 'Active Admins', value: stats.activeAdmins, color: '#28a745', icon: '✅' },
            { label: 'Inactive Admins', value: stats.inactiveAdmins, color: '#6c757d', icon: '⏸️' },
            { label: 'Total Roles', value: stats.totalRoles, color: '#007bff', icon: '🔑' }
          ].map((stat, index) => (
            <div key={index} style={{
              backgroundColor: '#fff',
              padding: isMobile ? '14px' : '18px',
              borderRadius: '10px',
              boxShadow: '0 2px 6px rgba(0, 0, 0, 0.1)',
              border: '1px solid #e2e8f0',
              flex: '1',
              minWidth: isMobile ? '150px' : '180px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                <span style={{ fontSize: '20px' }}>{stat.icon}</span>
                <h3 style={{ color: '#000000', fontSize: '12px', fontWeight: '600', margin: 0 }}>
                  {stat.label}
                </h3>
              </div>
              <p style={{ color: stat.color, fontSize: isMobile ? '18px' : '20px', fontWeight: '700', margin: 0 }}>
                {stat.value.toLocaleString()}
              </p>
            </div>
          ))}
        </div>

        {/* Filters and Search Card */}
        <div style={{
          backgroundColor: '#fff',
          padding: isMobile ? '16px' : '20px',
          borderRadius: '10px',
          boxShadow: '0 2px 6px rgba(0, 0, 0, 0.1)',
          border: '1px solid #e2e8f0',
          marginBottom: '16px'
        }}>
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
                placeholder="Search admin users..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 16px 12px 40px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '14px',
                  backgroundColor: '#ffffff',
                  color: '#000000',
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

            {/* Role Filter */}
            <select
              value={filters.role}
              onChange={(e) => handleFilterChange('role', e.target.value)}
              style={{
                padding: '12px 16px',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '14px',
                backgroundColor: '#ffffff',
                color: '#000000',
                minWidth: '140px',
                boxSizing: 'border-box'
              }}
            >
              <option value="">All Roles</option>
              {Object.entries(ROLE_CONFIG).map(([key, config]) => (
                <option key={key} value={key}>{config.name}</option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              style={{
                padding: '12px 16px',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '14px',
                backgroundColor: '#ffffff',
                color: '#000000',
                minWidth: '120px',
                boxSizing: 'border-box'
              }}
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>

            {/* Add Admin Button - Only for Super Admin */}
            {isSuperAdmin && (
              <button
                onClick={handleNewAdmin}
                style={{
                  padding: '12px 16px',
                  backgroundColor: '#ff3b30',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap'
                }}
              >
                + Add Admin
              </button>
            )}
          </div>
        </div>

        {/* Admin Users Table Card */}
        <div style={{
          backgroundColor: '#fff',
          padding: isMobile ? '16px' : '20px',
          borderRadius: '10px',
          boxShadow: '0 2px 6px rgba(0, 0, 0, 0.1)',
          border: '1px solid #e2e8f0',
          overflow: 'hidden'
        }}>
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
              <p style={{ marginTop: '16px', color: '#718096' }}>Loading admin users...</p>
            </div>
          ) : !Array.isArray(admins) || admins.length === 0 ? (
            <div style={{ padding: '60px 20px', textAlign: 'center', color: '#718096' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>👨‍💼</div>
              <h3 style={{ color: '#000000', marginBottom: '8px' }}>No admin users found</h3>
              <p>No admin users match your search criteria</p>
            </div>
          ) : (
            <>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8f9fa' }}>
                      <th style={{ padding: '16px', textAlign: 'left', borderBottom: '1px solid #e2e8f0', width: '50px' }}>
                        <input
                          type="checkbox"
                          checked={selectedAdmins.length === admins.length && admins.length > 0}
                          onChange={selectAllAdmins}
                          style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                        />
                      </th>
                      <th style={{ padding: '16px', textAlign: 'left', fontSize: '14px', fontWeight: '600', color: '#000000', borderBottom: '1px solid #e2e8f0' }}>
                        Admin User
                      </th>
                      <th style={{ padding: '16px', textAlign: 'left', fontSize: '14px', fontWeight: '600', color: '#000000', borderBottom: '1px solid #e2e8f0' }}>
                        Role
                      </th>
                      <th style={{ padding: '16px', textAlign: 'left', fontSize: '14px', fontWeight: '600', color: '#000000', borderBottom: '1px solid #e2e8f0' }}>
                        Status
                      </th>
                      <th style={{ padding: '16px', textAlign: 'left', fontSize: '14px', fontWeight: '600', color: '#000000', borderBottom: '1px solid #e2e8f0' }}>
                        Last Login
                      </th>
                      <th style={{ padding: '16px', textAlign: 'right', fontSize: '14px', fontWeight: '600', color: '#000000', borderBottom: '1px solid #e2e8f0', width: '150px' }}>
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {admins.map((admin) => (
                      <tr
                        key={admin._id}
                        style={{
                          borderBottom: '1px solid #f1f5f9',
                          backgroundColor: selectedAdmins.includes(admin._id) ? '#fff5f5' : '#fff'
                        }}
                      >
                        <td style={{ padding: '16px' }}>
                          <input
                            type="checkbox"
                            checked={selectedAdmins.includes(admin._id)}
                            onChange={() => handleAdminSelect(admin._id)}
                            style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                          />
                        </td>
                        <td style={{ padding: '16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{
                              width: '40px',
                              height: '40px',
                              background: 'linear-gradient(135deg, #667eea, #764ba2)',
                              borderRadius: '50%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '14px',
                              color: '#fff',
                              fontWeight: 'bold'
                            }}>
                              {getInitials(admin.username)}
                            </div>
                            <div>
                              <div style={{ fontWeight: '600', color: '#000000', fontSize: '14px' }}>
                                {admin.username}
                              </div>
                              <div style={{ color: '#718096', fontSize: '12px' }}>
                                {admin.email}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '16px' }}>
                          {getRoleBadge(admin.role)}
                        </td>
                        <td style={{ padding: '16px' }}>
                          {getStatusBadge(admin.isActive)}
                        </td>
                        <td style={{ padding: '16px' }}>
                          <div style={{ color: '#000000', fontSize: '14px' }}>
                            {formatDate(admin.lastLogin)}
                          </div>
                        </td>
                        <td style={{ padding: '16px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                            <button
                              onClick={() => handleEditAdmin(admin)}
                              style={{
                                padding: '6px 12px',
                                backgroundColor: '#f7fafc',
                                border: '1px solid #e2e8f0',
                                borderRadius: '6px',
                                fontSize: '12px',
                                fontWeight: '600',
                                color: '#000000',
                                cursor: 'pointer'
                              }}
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => toggleAdminStatus(admin._id, admin.isActive)}
                              disabled={actionLoading}
                              style={{
                                padding: '6px 12px',
                                backgroundColor: admin.isActive ? '#ff8c00' : '#28a745',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '6px',
                                fontSize: '12px',
                                fontWeight: '600',
                                cursor: actionLoading ? 'not-allowed' : 'pointer',
                                opacity: actionLoading ? 0.7 : 1
                              }}
                            >
                              {admin.isActive ? 'Deactivate' : 'Activate'}
                            </button>
                            {isSuperAdmin && admin.role !== 'super_admin' && (
                              <button
                                onClick={() => deleteAdmin(admin._id)}
                                disabled={actionLoading}
                                style={{
                                  padding: '6px 12px',
                                  backgroundColor: '#dc3545',
                                  color: '#fff',
                                  border: 'none',
                                  borderRadius: '6px',
                                  fontSize: '12px',
                                  fontWeight: '600',
                                  cursor: actionLoading ? 'not-allowed' : 'pointer',
                                  opacity: actionLoading ? 0.7 : 1
                                }}
                              >
                                Delete
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <PaginationControls />
            </>
          )}
        </div>
      </div>
    );
  };

  // Roles & Permissions Tab Content
  const RolesPermissionsContent = () => {
    const isSuperAdmin = currentUserRole === 'super_admin';
    
    return (
      <div>
        {/* Stats Cards */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: isMobile ? '8px' : '12px',
          marginBottom: '20px'
        }}>
          {[
            { label: 'Total Roles', value: stats.totalRoles, color: '#007bff', icon: '🔑' },
            { label: 'Active Admins', value: stats.activeAdmins, color: '#28a745', icon: '✅' },
            { label: 'Inactive Admins', value: stats.inactiveAdmins, color: '#6c757d', icon: '⏸️' },
            { label: 'Total Permissions', value: ALL_PERMISSIONS.length, color: '#ff3b30', icon: '🔐' }
          ].map((stat, index) => (
            <div key={index} style={{
              backgroundColor: '#fff',
              padding: isMobile ? '14px' : '18px',
              borderRadius: '10px',
              boxShadow: '0 2px 6px rgba(0, 0, 0, 0.1)',
              border: '1px solid #e2e8f0',
              flex: '1',
              minWidth: isMobile ? '150px' : '180px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                <span style={{ fontSize: '20px' }}>{stat.icon}</span>
                <h3 style={{ color: '#000000', fontSize: '12px', fontWeight: '600', margin: 0 }}>
                  {stat.label}
                </h3>
              </div>
              <p style={{ color: stat.color, fontSize: isMobile ? '18px' : '20px', fontWeight: '700', margin: 0 }}>
                {stat.value.toLocaleString()}
              </p>
            </div>
          ))}
        </div>

        {/* Action Bar Card */}
        <div style={{
          backgroundColor: '#fff',
          padding: isMobile ? '16px' : '20px',
          borderRadius: '10px',
          boxShadow: '0 2px 6px rgba(0, 0, 0, 0.1)',
          border: '1px solid #e2e8f0',
          marginBottom: '16px'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexDirection: isMobile ? 'column' : 'row',
            gap: '16px'
          }}>
            <h3 style={{
              color: '#000000',
              fontSize: isMobile ? '16px' : '18px',
              fontWeight: '600',
              margin: 0
            }}>
              Roles & Permissions Management
            </h3>
            {isSuperAdmin && (
              <button
                onClick={handleNewRole}
                style={{
                  padding: '12px 16px',
                  backgroundColor: '#ff3b30',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap'
                }}
              >
                + Create New Role
              </button>
            )}
          </div>
        </div>

        {/* Roles Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '16px',
          marginBottom: '20px'
        }}>
          {Array.isArray(roles) && roles.map((role) => {
            const roleConfig = ROLE_CONFIG[role.name] || { color: '#6c757d', name: role.name, priority: 99 };
            return (
              <div
                key={role._id || role.id || Math.random()}
                style={{
                  backgroundColor: '#fff',
                  padding: '20px',
                  borderRadius: '10px',
                  boxShadow: '0 2px 6px rgba(0, 0, 0, 0.1)',
                  border: '1px solid #e2e8f0'
                }}
              >
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '16px'
                }}>
                  <div>
                    <h3 style={{
                      color: roleConfig.color,
                      fontSize: '16px',
                      fontWeight: '700',
                      margin: '0 0 4px 0'
                    }}>
                      {roleConfig.name}
                    </h3>
                    <p style={{
                      color: '#718096',
                      fontSize: '12px',
                      margin: 0
                    }}>
                      {role.description || 'No description provided'}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => handleConfigureRole(role)}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: roleConfig.color,
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
                    {isSuperAdmin && (
                      <button
                        onClick={() => deleteRole(role._id)}
                        disabled={actionLoading}
                        style={{
                          padding: '6px 12px',
                          backgroundColor: '#dc3545',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: '600',
                          cursor: actionLoading ? 'not-allowed' : 'pointer',
                          opacity: actionLoading ? 0.7 : 1
                        }}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <h4 style={{
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#000000',
                    margin: '0 0 8px 0'
                  }}>
                    Permissions ({Array.isArray(role.permissions) ? role.permissions.length : 0})
                  </h4>
                  <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '6px'
                  }}>
                    {Object.entries(PERMISSION_CATEGORIES).map(([categoryKey, category]) => {
                      const categoryPermissions = Array.isArray(role.permissions) ? 
                        role.permissions.filter(p => 
                          ALL_PERMISSIONS.find(ap => ap.id === p && ap.category === categoryKey)
                        ) : [];
                      
                      if (categoryPermissions.length === 0) return null;
                      
                      return (
                        <span
                          key={categoryKey}
                          style={{
                            backgroundColor: category.color + '20',
                            color: category.color,
                            padding: '2px 6px',
                            borderRadius: '8px',
                            fontSize: '10px',
                            fontWeight: '600',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <span>{category.icon}</span>
                          <span>{category.name} ({categoryPermissions.length})</span>
                        </span>
                      );
                    })}
                  </div>
                </div>

                <div style={{
                  backgroundColor: '#f8f9fa',
                  padding: '12px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  color: '#718096'
                }}>
                  Access to {Array.isArray(role.permissions) ? role.permissions.length : 0} of {ALL_PERMISSIONS.length} total permissions
                </div>
              </div>
            );
          })}
        </div>

        {/* Permission Matrix Card */}
        <div style={{
          backgroundColor: '#fff',
          padding: '20px',
          borderRadius: '10px',
          boxShadow: '0 2px 6px rgba(0, 0, 0, 0.1)',
          border: '1px solid #e2e8f0'
        }}>
          <h3 style={{
            fontSize: '18px',
            fontWeight: '700',
            color: '#000000',
            margin: '0 0 16px 0'
          }}>
            Permission Matrix
          </h3>
          
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8f9fa' }}>
                  <th style={{
                    padding: '12px',
                    textAlign: 'left',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#000000',
                    borderBottom: '1px solid #e2e8f0'
                  }}>
                    Permission
                  </th>
                  {Array.isArray(roles) && roles.map((role) => {
                    const roleConfig = ROLE_CONFIG[role.name] || { color: '#6c757d', name: role.name };
                    return (
                      <th
                        key={role._id || role.id || Math.random()}
                        style={{
                          padding: '12px',
                          textAlign: 'center',
                          fontSize: '12px',
                          fontWeight: '600',
                          color: roleConfig.color,
                          borderBottom: '1px solid #e2e8f0',
                          minWidth: '80px'
                        }}
                      >
                        {roleConfig.name}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {Object.entries(PERMISSION_CATEGORIES).map(([categoryKey, category]) => (
                  <React.Fragment key={categoryKey}>
                    <tr style={{ backgroundColor: '#f8f9fa' }}>
                      <td
                        colSpan={(Array.isArray(roles) ? roles.length : 0) + 1}
                        style={{
                          padding: '8px 12px',
                          fontSize: '13px',
                          fontWeight: '600',
                          color: category.color,
                          borderBottom: '1px solid #e2e8f0'
                        }}
                      >
                        {category.icon} {category.name}
                      </td>
                    </tr>
                    {ALL_PERMISSIONS.filter(p => p.category === categoryKey).map((permission) => (
                      <tr key={permission.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{
                          padding: '8px 12px',
                          fontSize: '13px',
                          color: '#000000'
                        }}>
                          {permission.name}
                        </td>
                        {Array.isArray(roles) && roles.map((role) => {
                          const hasPermission = Array.isArray(role.permissions) && role.permissions.includes(permission.id);
                          
                          return (
                            <td
                              key={role._id || role.id || Math.random()}
                              style={{
                                padding: '8px 12px',
                                textAlign: 'center'
                              }}
                            >
                              <span style={{
                                fontSize: '16px',
                                color: hasPermission ? '#28a745' : '#dc3545'
                              }}>
                                {hasPermission ? '✅' : '❌'}
                              </span>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  // Activity Logs Tab Content
  const ActivityLogsContent = () => (
    <div>
      {/* Stats Cards */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: isMobile ? '8px' : '12px',
        marginBottom: '20px'
      }}>
        {[
          { label: 'Total Activities', value: activityLogs.length, color: '#ff3b30', icon: '📝' },
          { label: 'Today\'s Activities', value: activityLogs.filter(log => {
            const today = new Date().toDateString();
            const logDate = log.timestamp ? new Date(log.timestamp).toDateString() : '';
            return logDate === today;
          }).length, color: '#28a745', icon: '📅' },
          { label: 'Successful Actions', value: activityLogs.filter(log => log.status === 'success').length, color: '#007bff', icon: '✅' },
          { label: 'Failed Actions', value: activityLogs.filter(log => log.status === 'failed').length, color: '#dc3545', icon: '❌' }
        ].map((stat, index) => (
          <div key={index} style={{
            backgroundColor: '#fff',
            padding: isMobile ? '14px' : '18px',
            borderRadius: '10px',
            boxShadow: '0 2px 6px rgba(0, 0, 0, 0.1)',
            border: '1px solid #e2e8f0',
            flex: '1',
            minWidth: isMobile ? '150px' : '180px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
              <span style={{ fontSize: '20px' }}>{stat.icon}</span>
              <h3 style={{ color: '#000000', fontSize: '12px', fontWeight: '600', margin: 0 }}>
                {stat.label}
              </h3>
            </div>
            <p style={{ color: stat.color, fontSize: isMobile ? '18px' : '20px', fontWeight: '700', margin: 0 }}>
              {stat.value.toLocaleString()}
            </p>
          </div>
        ))}
      </div>

      {/* Activity Logs Card */}
      <div style={{
        backgroundColor: '#fff',
        padding: '20px',
        borderRadius: '10px',
        boxShadow: '0 2px 6px rgba(0, 0, 0, 0.1)',
        border: '1px solid #e2e8f0'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px',
          flexDirection: isMobile ? 'column' : 'row',
          gap: '16px'
        }}>
          <h3 style={{
            fontSize: '18px',
            fontWeight: '700',
            color: '#000000',
            margin: 0
          }}>
            Admin Activity Logs
          </h3>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <select style={{
              padding: '10px 12px',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              fontSize: '14px',
              backgroundColor: '#ffffff',
              color: '#000000',
              minWidth: '150px',
              boxSizing: 'border-box'
            }}>
              <option value="all">All Activities</option>
              <option value="login">Login/Logout</option>
              <option value="user">User Management</option>
              <option value="transaction">Transactions</option>
              <option value="service">Services</option>
              <option value="system">System Changes</option>
            </select>
            <button style={{
              padding: '10px 16px',
              backgroundColor: '#f7fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              color: '#000000'
            }}>
              Export Logs
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {Array.isArray(activityLogs) && activityLogs.length > 0 ? activityLogs.map((log, index) => (
            <div
              key={index}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                padding: '16px',
                backgroundColor: '#f8f9fa',
                borderRadius: '8px',
                border: '1px solid #e2e8f0'
              }}
            >
              <div style={{
                width: '40px',
                height: '40px',
                backgroundColor: getActivityColor(log.action),
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '16px',
                color: '#ffffff'
              }}>
                {getActivityIcon(log.action)}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#000000',
                  marginBottom: '4px'
                }}>
                  {log.description || 'No description'}
                </div>
                <div style={{
                  fontSize: '12px',
                  color: '#718096'
                }}>
                  by {log.adminName || 'Unknown'} • {formatDate(log.timestamp)} • IP: {log.ipAddress || 'Unknown'}
                </div>
              </div>
              <div style={{
                padding: '4px 8px',
                backgroundColor: getStatusColor(log.status),
                color: '#fff',
                borderRadius: '12px',
                fontSize: '11px',
                fontWeight: '600'
              }}>
                {log.status || 'unknown'}
              </div>
            </div>
          )) : (
            <div style={{
              textAlign: 'center',
              padding: '40px',
              color: '#718096'
            }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>📝</div>
              <h3 style={{ color: '#000000', marginBottom: '8px' }}>No activity logs found</h3>
              <p>Admin activity will appear here when actions are performed</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // Utility functions for activity logs
  const getActivityIcon = (action) => {
    const icons = {
      login: '🔐',
      logout: '🚪',
      create_user: '👤',
      edit_user: '✏️',
      delete_user: '🗑️',
      transaction: '💳',
      service_config: '⚙️',
      system_change: '🔧',
      default: '📝'
    };
    return icons[action] || icons.default;
  };

  const getActivityColor = (action) => {
    const colors = {
      login: '#28a745',
      logout: '#6c757d',
      create_user: '#007bff',
      edit_user: '#ff8c00',
      delete_user: '#dc3545',
      transaction: '#28a745',
      service_config: '#6f42c1',
      system_change: '#ff3b30',
      default: '#e2e8f0'
    };
    return colors[action] || colors.default;
  };

  const getStatusColor = (status) => {
    const colors = {
      success: '#28a745',
      failed: '#dc3545',
      warning: '#ff8c00',
      info: '#007bff',
      unknown: '#6c757d'
    };
    return colors[status] || colors.unknown;
  };

  return (
    <ErrorBoundary>
      <div style={{
        width: '100%',
        maxWidth: '100%',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      }}>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
        
        <NotificationBanner />
        
        {/* Header Card */}
        <div style={{
          backgroundColor: '#fff',
          padding: isMobile ? '16px' : '20px',
          borderRadius: '10px',
          boxShadow: '0 2px 6px rgba(0, 0, 0, 0.1)',
          border: '1px solid #e2e8f0',
          marginBottom: '16px'
        }}>
          <div style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            gap: '12px',
            alignItems: isMobile ? 'stretch' : 'center',
            justifyContent: 'space-between',
            marginBottom: '16px'
          }}>
            <h2 style={{
              color: '#000000',
              fontSize: isMobile ? '18px' : '20px',
              fontWeight: '700',
              margin: 0
            }}>
              Admin Management
            </h2>
            <p style={{
              fontSize: '13px',
              color: '#718096',
              margin: 0,
              maxWidth: '600px'
            }}>
              {activeTab === 'admins' ? 'Manage administrative user accounts and permissions' :
               activeTab === 'roles' ? 'Configure roles and access permissions for admin users' :
               'Track and monitor admin activities and system changes'}
            </p>
          </div>
          
          <TabNavigation />
        </div>

        {/* Tab Content */}
        <div style={{ padding: isMobile ? '0' : '0' }}>
          {activeTab === 'admins' && <AdminUsersContent />}
          {activeTab === 'roles' && <RolesPermissionsContent />}
          {activeTab === 'logs' && <ActivityLogsContent />}
        </div>

        {/* Modals */}
        <AdminModal 
          showAdminModal={showAdminModal}
          setShowAdminModal={setShowAdminModal}
          selectedAdmin={selectedAdmin}
          adminForm={adminForm}
          setAdminForm={setAdminForm}
          actionLoading={actionLoading}
          handleAdminSubmit={handleAdminSubmit}
          ROLE_CONFIG={ROLE_CONFIG}
          currentUserRole={currentUserRole}
        />

        <RoleModal 
          showRoleModal={showRoleModal}
          setShowRoleModal={setShowRoleModal}
          selectedRole={selectedRole}
          roleForm={roleForm}
          setRoleForm={setRoleForm}
          actionLoading={actionLoading}
          handleRoleSubmit={handleRoleSubmit}
          ALL_PERMISSIONS={ALL_PERMISSIONS}
          PERMISSION_CATEGORIES={PERMISSION_CATEGORIES}
        />
      </div>
    </ErrorBoundary>
  );
};

export default AdminManagement;