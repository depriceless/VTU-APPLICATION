import React, { useState, useEffect, useCallback } from 'react';

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
    padding: '8px 12px',
    border: '2px solid #e2e8f0',
    borderRadius: '6px',
    fontSize: '14px',
    color: '#000',
    backgroundColor: '#fff'
  };

  const labelStyle = {
    display: 'block',
    marginBottom: '8px',
    fontSize: '14px',
    fontWeight: '600',
    color: '#000'
  };

  const gridStyle = {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px',
    marginBottom: '20px'
  };

  // Filter roles based on current user's role
  const filteredRoles = Object.entries(ROLE_CONFIG).filter(([key, config]) => {
    // Super admin can assign all roles except super_admin to others
    if (currentUserRole === 'super_admin') {
      return key !== 'super_admin' || selectedAdmin?.role === 'super_admin';
    }
    // Other admins can only assign roles with lower priority
    const currentUserPriority = ROLE_CONFIG[currentUserRole]?.priority || 99;
    const rolePriority = config.priority;
    return rolePriority > currentUserPriority || (selectedAdmin && selectedAdmin.role === key);
  });

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
        maxWidth: '500px',
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
          <h3 style={{ margin: 0, color: '#000', fontSize: '18px', fontWeight: '600' }}>
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
                disabled={selectedAdmin?.role === 'super_admin' && currentUserRole !== 'super_admin'}
              >
                <option value="">Select Role</option>
                {filteredRoles.map(([key, config]) => (
                  <option key={key} value={key}>{config.name}</option>
                ))}
              </select>
              {selectedAdmin?.role === 'super_admin' && currentUserRole !== 'super_admin' && (
                <p style={{ fontSize: '12px', color: '#718096', marginTop: '4px' }}>
                  Only super admins can modify super admin roles
                </p>
              )}
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
              disabled={selectedAdmin?.role === 'super_admin' && currentUserRole !== 'super_admin'}
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
                color: '#000',
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
  PERMISSION_CATEGORIES,
  currentUserRole,
  ROLE_CONFIG 
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

  const canEditRole = !selectedRole || 
    (currentUserRole === 'super_admin') ||
    (selectedRole.name !== 'super_admin' && ROLE_CONFIG[selectedRole.name]?.priority > ROLE_CONFIG[currentUserRole]?.priority);

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
        maxWidth: '800px',
        width: '100%',
        maxHeight: '90vh',
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
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600' }}>
                Role Name *
              </label>
              <input
                type="text"
                value={roleForm.name}
                onChange={(e) => setRoleForm(prev => ({ ...prev, name: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '2px solid #e2e8f0',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
                required
                disabled={!canEditRole}
              />
              {!canEditRole && (
                <p style={{ fontSize: '12px', color: '#718096', marginTop: '4px' }}>
                  You don't have permission to edit this role
                </p>
              )}
            </div>
            
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600' }}>
                Description
              </label>
              <input
                type="text"
                value={roleForm.description}
                onChange={(e) => setRoleForm(prev => ({ ...prev, description: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '2px solid #e2e8f0',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
                disabled={!canEditRole}
              />
            </div>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#1a202c' }}>
                Permissions ({roleForm.permissions.length} selected)
              </h4>
              {canEditRole && (
                <button
                  onClick={() => setRoleForm(prev => ({ ...prev, permissions: ALL_PERMISSIONS.map(p => p.id) }))}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: '#f7fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  Select All
                </button>
              )}
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
                      cursor: canEditRole ? 'pointer' : 'default'
                    }}
                    onClick={() => canEditRole && toggleCategory(categoryKey)}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '16px' }}>{category.icon}</span>
                        <span style={{ fontWeight: '600', color: category.color }}>
                          {category.name}
                        </span>
                        <span style={{ fontSize: '12px', color: '#718096' }}>
                          ({selectedCount}/{categoryPermissions.length})
                        </span>
                      </div>
                      <span style={{ fontSize: '16px' }}>
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
                          cursor: canEditRole ? 'pointer' : 'default',
                          borderRadius: '4px',
                          transition: 'background-color 0.2s',
                          opacity: canEditRole ? 1 : 0.7
                        }}
                        onMouseEnter={(e) => canEditRole && (e.target.style.backgroundColor = '#f8f9fa')}
                        onMouseLeave={(e) => canEditRole && (e.target.style.backgroundColor = 'transparent')}
                        >
                          <input
                            type="checkbox"
                            checked={roleForm.permissions.includes(permission.id)}
                            onChange={() => canEditRole && togglePermission(permission.id)}
                            style={{ width: '16px', height: '16px' }}
                            disabled={!canEditRole}
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
                color: '#718096',
                fontSize: '14px',
                fontWeight: '600',
                cursor: actionLoading ? 'not-allowed' : 'pointer'
              }}
            >
              Cancel
            </button>
            {canEditRole && (
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
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const AdminManagement = () => {
  const [admins, setAdmins] = useState([]);
  const [filteredAdmins, setFilteredAdmins] = useState([]);
  const [roles, setRoles] = useState([]);
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
  const [currentUser, setCurrentUser] = useState(null);

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
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://vtu-application.onrender.com';

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

  // Check mobile screen
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Token and current user management
  useEffect(() => {
    const authToken = localStorage.getItem('admin_token') || sessionStorage.getItem('admin_token');
    if (authToken) {
      setToken(authToken);
      // Get current user from token or localStorage
      const userData = localStorage.getItem('admin_user');
      if (userData) {
        try {
          const parsedUser = JSON.parse(userData);
          setCurrentUser(parsedUser);
        } catch (e) {
          console.error('Error parsing user data:', e);
        }
      }
    } else {
      showNotification('Please login again', 'error');
      setTimeout(() => {
        window.location.href = '/';
      }, 2000);
    }
  }, [showNotification]);

  // Filter admins based on current user's role
  useEffect(() => {
    if (admins.length > 0 && currentUser) {
      if (currentUser.role === 'super_admin') {
        // Super admin can see all admins
        setFilteredAdmins(admins);
      } else {
        // Non-super admin can only see themselves
        const currentUserAdmin = admins.filter(admin => 
          admin._id === currentUser._id || admin.email === currentUser.email
        );
        setFilteredAdmins(currentUserAdmin);
      }
    } else {
      setFilteredAdmins([]);
    }
  }, [admins, currentUser]);

  // Check permissions
  const canCreateAdmin = currentUser?.role === 'super_admin';
  const canDeleteAdmin = (admin) => {
    if (currentUser?.role === 'super_admin') return true;
    if (admin.role === 'super_admin') return false;
    const currentUserPriority = ROLE_CONFIG[currentUser?.role]?.priority || 99;
    const adminPriority = ROLE_CONFIG[admin.role]?.priority || 99;
    return adminPriority > currentUserPriority;
  };

  const canEditAdmin = (admin) => {
    // Non-super admin can only edit their own profile
    if (currentUser?.role !== 'super_admin') {
      return admin._id === currentUser?._id || admin.email === currentUser?.email;
    }
    
    if (admin.role === 'super_admin' && currentUser?.role !== 'super_admin') return false;
    if (currentUser?.role === 'super_admin') return true;
    const currentUserPriority = ROLE_CONFIG[currentUser?.role]?.priority || 99;
    const adminPriority = ROLE_CONFIG[admin.role]?.priority || 99;
    return adminPriority > currentUserPriority;
  };

  // API Functions
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
        throw new Error('Network error: Unable to connect to server.');
      }
      
      throw error;
    }
  }, [token, API_BASE_URL]);

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
      console.log("WHAT FIELDS DO WE GET?", data[0]);
      
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
      
      // Process admin data with proper date handling
      const processedAdmins = adminsData.map(admin => ({
        _id: admin._id || admin.id || `temp-${Math.random()}`,
        username: admin.name || admin.username || admin.userName || 'Unknown User',
        email: admin.email || admin.emailAddress || 'No email',
        role: admin.role || admin.roleType || admin.userRole || 'user',
        isActive: admin.isActive !== undefined ? admin.isActive : 
                  admin.status === 'active' ? true : 
                  admin.status === 'inactive' ? false : true,
       lastLogin: admin.updatedAt || admin.lastLogin || admin.last_login || admin.lastSession || admin.lastLoginAt || null,
        phone: admin.phone || admin.phoneNumber || '',
        createdAt: admin.createdAt || admin.created_at || admin.registrationDate || null,
        ...admin
      }));
      
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
    } catch (error) {
      console.error('Error fetching roles:', error);
      showNotification(`Failed to fetch roles: ${error.message}`, 'error');
      setRoles([]);
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

  // Data fetching
  useEffect(() => {
    if (token) {
      fetchStats();
      if (activeTab === 'admins') {
        fetchAdmins();
      } else if (activeTab === 'roles') {
        fetchRoles();
      }
    }
  }, [token, activeTab, filters, fetchStats, fetchAdmins, fetchRoles]);

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
    if (selectedAdmins.length === filteredAdmins.length && filteredAdmins.length > 0) {
      setSelectedAdmins([]);
    } else {
      setSelectedAdmins(filteredAdmins.map(admin => admin._id).filter(id => id));
    }
  }, [selectedAdmins.length, filteredAdmins]);

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
    if (!canEditAdmin(admin)) {
      showNotification('You do not have permission to edit this admin', 'error');
      return;
    }
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
  }, [canEditAdmin, showNotification]);

  const handleNewAdmin = useCallback(() => {
    if (!canCreateAdmin) {
      showNotification('Only super admins can create new admin users', 'error');
      return;
    }
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
  }, [canCreateAdmin, showNotification]);

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
    if (!dateString) return 'Never';
    
    try {
      const date = new Date(dateString);
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        return 'Invalid Date';
      }
      
      // Check if date is in the future (might indicate wrong format)
      if (date > new Date()) {
        return 'Never';
      }
      
      const now = new Date();
      const diffMs = now - date;
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      
      // If less than 1 day, show relative time
      if (diffDays === 0) {
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        if (diffHours === 0) {
          const diffMinutes = Math.floor(diffMs / (1000 * 60));
          if (diffMinutes === 0) {
            return 'Just now';
          }
          return `${diffMinutes}m ago`;
        }
        return `${diffHours}h ago`;
      }
      
      // If less than 7 days, show relative days
      if (diffDays < 7) {
        return `${diffDays}d ago`;
      }
      
      // Otherwise show formatted date
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      console.error('Error formatting date:', dateString, error);
      return 'Invalid Date';
    }
  }, []);

  const getInitials = useCallback((username) => {
    if (!username || typeof username !== 'string') return '??';
    
    const cleanUsername = username.trim().replace(/\s+/g, ' ');
    const names = cleanUsername.split(' ').filter(name => name.length > 0);
    
    if (names.length === 0) return '??';
    
    if (names.length === 1) {
      return names[0].charAt(0).toUpperCase();
    }
    
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

  // Tab navigation
  const TabNavigation = () => (
    <div style={{
      display: 'flex',
      gap: '8px',
      marginBottom: '24px',
      borderBottom: '1px solid #e2e8f0',
      overflowX: 'auto'
    }}>
      {[
        { id: 'admins', label: 'Admin Users', icon: '👨‍💼', count: filteredAdmins.length },
        { id: 'roles', label: 'Roles & Permissions', icon: '🔑', count: stats.totalRoles }
      ].map((tab) => (
        <button
          key={tab.id}
          onClick={() => setActiveTab(tab.id)}
          style={{
            padding: '12px 16px',
            border: 'none',
            borderBottom: activeTab === tab.id ? '2px solid #ff3b30' : '2px solid transparent',
            backgroundColor: 'transparent',
            color: activeTab === tab.id ? '#ff3b30' : '#718096',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            whiteSpace: 'nowrap'
          }}
        >
          <span>{tab.icon}</span>
          <span>{tab.label}</span>
          {tab.count !== null && (
            <span style={{
              backgroundColor: activeTab === tab.id ? '#ff3b30' : '#e2e8f0',
              color: activeTab === tab.id ? '#fff' : '#718096',
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
    // Hide filters and search for non-super admins since they can only see themselves
    const showFilters = currentUser?.role === 'super_admin';
    
    return (
      <div>
        {/* Filters and Search - Only show for super admin */}
        {showFilters && (
          <div style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            gap: '16px',
            alignItems: 'stretch',
            marginBottom: '24px'
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

            {/* Role Filter */}
            <select
              value={filters.role}
              onChange={(e) => handleFilterChange('role', e.target.value)}
              style={{
                padding: '12px 16px',
                border: '2px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '14px',
                backgroundColor: '#fff',
                minWidth: '140px'
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
            </select>

            {/* Add Admin Button */}
            <button
              onClick={handleNewAdmin}
              disabled={!canCreateAdmin}
              style={{
                padding: '12px 16px',
                backgroundColor: canCreateAdmin ? '#ff3b30' : '#cbd5e0',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: canCreateAdmin ? 'pointer' : 'not-allowed',
                whiteSpace: 'nowrap'
              }}
            >
              + Add Admin
            </button>
          </div>
        )}

        {/* Admin Users Table */}
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
              <p style={{ marginTop: '16px', color: '#718096' }}>Loading admin users...</p>
            </div>
          ) : !Array.isArray(filteredAdmins) || filteredAdmins.length === 0 ? (
            <div style={{ padding: '60px 20px', textAlign: 'center', color: '#718096' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>👨‍💼</div>
              <h3 style={{ color: '#1a202c', marginBottom: '8px' }}>No admin users found</h3>
              <p>No admin users match your search criteria</p>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8f9fa' }}>
                  {currentUser?.role === 'super_admin' && (
                    <th style={{ padding: '16px', textAlign: 'left', borderBottom: '1px solid #e2e8f0', width: '50px' }}>
                      <input
                        type="checkbox"
                        checked={selectedAdmins.length === filteredAdmins.length && filteredAdmins.length > 0}
                        onChange={selectAllAdmins}
                        style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                      />
                    </th>
                  )}
                  <th style={{ padding: '16px', textAlign: 'left', fontSize: '14px', fontWeight: '600', color: '#1a202c', borderBottom: '1px solid #e2e8f0' }}>
                    Admin User
                  </th>
                  <th style={{ padding: '16px', textAlign: 'left', fontSize: '14px', fontWeight: '600', color: '#1a202c', borderBottom: '1px solid #e2e8f0' }}>
                    Role
                  </th>
                  <th style={{ padding: '16px', textAlign: 'left', fontSize: '14px', fontWeight: '600', color: '#1a202c', borderBottom: '1px solid #e2e8f0' }}>
                    Status
                  </th>
                  <th style={{ padding: '16px', textAlign: 'left', fontSize: '14px', fontWeight: '600', color: '#1a202c', borderBottom: '1px solid #e2e8f0' }}>
                    Last Login
                  </th>
                  <th style={{ padding: '16px', textAlign: 'right', fontSize: '14px', fontWeight: '600', color: '#1a202c', borderBottom: '1px solid #e2e8f0', width: '150px' }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredAdmins.map((admin) => (
                  <tr
                    key={admin._id}
                    style={{
                      borderBottom: '1px solid #f1f5f9',
                      backgroundColor: selectedAdmins.includes(admin._id) ? '#fff5f5' : '#fff'
                    }}
                  >
                    {currentUser?.role === 'super_admin' && (
                      <td style={{ padding: '16px' }}>
                        <input
                          type="checkbox"
                          checked={selectedAdmins.includes(admin._id)}
                          onChange={() => handleAdminSelect(admin._id)}
                          style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                        />
                      </td>
                    )}
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
                          <div style={{ fontWeight: '600', color: '#1a202c', fontSize: '14px' }}>
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
                      <div style={{ color: '#1a202c', fontSize: '14px' }}>
                        {formatDate(admin.lastLogin)}
                      </div>
                    </td>
                    <td style={{ padding: '16px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <button
                          onClick={() => handleEditAdmin(admin)}
                          disabled={!canEditAdmin(admin)}
                          style={{
                            padding: '4px 8px',
                            backgroundColor: canEditAdmin(admin) ? '#f7fafc' : '#f0f0f0',
                            border: '1px solid #e2e8f0',
                            borderRadius: '4px',
                            fontSize: '12px',
                            fontWeight: '600',
                            color: canEditAdmin(admin) ? '#1a202c' : '#a0aec0',
                            cursor: canEditAdmin(admin) ? 'pointer' : 'not-allowed'
                          }}
                        >
                          Edit
                        </button>
                        {currentUser?.role === 'super_admin' && (
                          <>
                            <button
                              onClick={() => toggleAdminStatus(admin._id, admin.isActive)}
                              disabled={actionLoading || !canEditAdmin(admin)}
                              style={{
                                padding: '4px 8px',
                                backgroundColor: admin.isActive ? (canEditAdmin(admin) ? '#ff8c00' : '#cbd5e0') : (canEditAdmin(admin) ? '#28a745' : '#cbd5e0'),
                                color: '#fff',
                                border: 'none',
                                borderRadius: '4px',
                                fontSize: '12px',
                                fontWeight: '600',
                                cursor: (actionLoading || !canEditAdmin(admin)) ? 'not-allowed' : 'pointer',
                                opacity: actionLoading ? 0.7 : 1
                              }}
                            >
                              {admin.isActive ? 'Deactivate' : 'Activate'}
                            </button>
                            <button
                              onClick={() => deleteAdmin(admin._id)}
                              disabled={actionLoading || !canDeleteAdmin(admin)}
                              style={{
                                padding: '4px 8px',
                                backgroundColor: canDeleteAdmin(admin) ? '#dc3545' : '#cbd5e0',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '4px',
                                fontSize: '12px',
                                fontWeight: '600',
                                cursor: (actionLoading || !canDeleteAdmin(admin)) ? 'not-allowed' : 'pointer',
                                opacity: actionLoading ? 0.7 : 1
                              }}
                            >
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Show pagination only for super admin */}
        {currentUser?.role === 'super_admin' && !loading && Array.isArray(filteredAdmins) && filteredAdmins.length > 0 && <PaginationControls />}
      </div>
    );
  };

  // Roles & Permissions Tab Content
  const RolesPermissionsContent = () => (
    <div>
      <div style={{
        display: 'flex',
        justifyContent: 'flex-end',
        marginBottom: '24px'
      }}>
        <button
          onClick={handleNewRole}
          style={{
            padding: '12px 16px',
            backgroundColor: '#ff3b30',
            color: '#fff',
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
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '20px',
        marginBottom: '32px'
      }}>
        {Array.isArray(roles) && roles.map((role) => {
          const roleConfig = ROLE_CONFIG[role.name] || { color: '#6c757d', name: role.name, priority: 99 };
          return (
            <div
              key={role._id || role.id || Math.random()}
              style={{
                backgroundColor: '#fff',
                padding: '24px',
                borderRadius: '12px',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
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
                  <button
                    onClick={() => deleteRole(role._id)}
                    disabled={actionLoading || role.name === 'super_admin'}
                    style={{
                      padding: '6px 12px',
                      backgroundColor: role.name === 'super_admin' ? '#cbd5e0' : '#dc3545',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: '600',
                      cursor: (actionLoading || role.name === 'super_admin') ? 'not-allowed' : 'pointer',
                      opacity: actionLoading ? 0.7 : 1
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <h4 style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#1a202c',
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
    </div>
  );

  return (
    <ErrorBoundary>
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
        
        {/* Header Stats Cards - Show different stats based on role */}
       <div style={{
  display: 'grid',
  gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(180px, 1fr))',
  gap: isMobile ? '10px' : '12px',
  marginBottom: isMobile ? '20px' : '24px',
  width: '100%'
}}>
  {/* If super admin, show admin stats */}
  {currentUser?.role === 'super_admin' && [
    { label: 'Total Admins', value: stats?.totalAdmins || 0, color: '#ff3b30', icon: '👨‍💼' },
    { label: 'Active Admins', value: stats?.activeAdmins || 0, color: '#ff3b30', icon: '✅' },
    { label: 'Inactive', value: stats?.inactiveAdmins || 0, color: '#ff3b30', icon: '⏸️' },
    { label: 'Total Roles', value: stats?.totalRoles || 0, color: '#ff3b30', icon: '🔑' }
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
        {stat.value.toLocaleString()}
      </p>
    </div>
  ))}
  
  {/* If NOT super admin, show personal info */}
  {currentUser?.role !== 'super_admin' && [
    { label: 'Your Role', value: ROLE_CONFIG[currentUser?.role]?.name || 'Unknown', color: '#ff3b30', icon: '👤', isText: true },
    { label: 'Status', value: currentUser?.isActive ? 'Active' : 'Inactive', color: currentUser?.isActive ? '#28a745' : '#ff3b30', icon: currentUser?.isActive ? '✅' : '⏸️', isText: true },
    { label: 'Last Login', value: formatDate(currentUser?.lastLogin), color: '#ff3b30', icon: '🕒', isText: true },
    { label: 'Email', value: currentUser?.email ? currentUser.email.substring(0, 15) + (currentUser.email.length > 15 ? '...' : '') : 'N/A', color: '#ff3b30', icon: '📧', isText: true }
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
        fontSize: isMobile ? '14px' : '16px', 
        fontWeight: '600', 
        margin: 0,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis'
      }}>
        {stat.value}
      </p>
    </div>
  ))}
</div>

        {/* Main Content Card */}
        <div style={{
          backgroundColor: '#fff',
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
          border: '1px solid #e2e8f0',
          overflow: 'hidden'
        }}>
          {/* Tab Navigation Header */}
          <div style={{
            padding: isMobile ? '16px' : '20px',
            borderBottom: '1px solid #e2e8f0',
            backgroundColor: '#f7fafc'
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
                fontSize: isMobile ? '18px' : '20px',
                fontWeight: '700',
                margin: 0
              }}>
                Admin Management {currentUser?.role !== 'super_admin' && '(Your Profile)'}
              </h2>
            </div>
            
            <TabNavigation />
          </div>

          {/* Tab Content */}
          <div style={{ padding: isMobile ? '16px' : '20px' }}>
            {activeTab === 'admins' && <AdminUsersContent />}
            {activeTab === 'roles' && <RolesPermissionsContent />}
          </div>
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
          currentUserRole={currentUser?.role}
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
          currentUserRole={currentUser?.role}
          ROLE_CONFIG={ROLE_CONFIG}
        />
      </div>
    </ErrorBoundary>
  );
};

export default AdminManagement;