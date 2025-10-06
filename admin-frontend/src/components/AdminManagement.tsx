import React, { useState, useEffect, useCallback } from 'react';

const STYLES = {
  searchInput: {
    width: '100%',
    padding: '12px 16px 12px 40px',
    border: '2px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '14px',
    backgroundColor: '#fff',
    boxSizing: 'border-box'
  },
  formInput: {
    width: '100%',
    padding: '8px 12px',
    border: '2px solid #e2e8f0',
    borderRadius: '6px',
    fontSize: '14px'
  },
  select: {
    padding: '12px 16px',
    border: '2px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '14px',
    backgroundColor: '#fff'
  }
};

// AdminModal component
const AdminModal = ({ 
  showAdminModal, 
  setShowAdminModal, 
  selectedAdmin, 
  adminForm, 
  setAdminForm, 
  actionLoading, 
  handleAdminSubmit,
  ROLE_CONFIG 
}) => {
  if (!showAdminModal) return null;

  const inputStyle = {
    width: '100%',
    padding: '8px 12px',
    border: '2px solid #e2e8f0',
    borderRadius: '6px',
    fontSize: '14px'
  };

  const labelStyle = {
    display: 'block',
    marginBottom: '8px',
    fontSize: '14px',
    fontWeight: '600'
  };

  const gridStyle = {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px',
    marginBottom: '20px'
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
          <h3 style={{ margin: 0, color: '#1a202c', fontSize: '18px', fontWeight: '600' }}>
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
              <label style={labelStyle}>Full Name *</label>
              <input
                type="text"
                value={adminForm.name}
                onChange={(e) => setAdminForm(prev => ({ ...prev, name: e.target.value }))}
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
              value={adminForm.status}
              onChange={(e) => setAdminForm(prev => ({ ...prev, status: e.target.value }))}
              style={inputStyle}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="suspended">Suspended</option>
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
                color: '#718096',
                fontSize: '14px',
                fontWeight: '600',
                cursor: actionLoading ? 'not-allowed' : 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleAdminSubmit}
              disabled={actionLoading || !adminForm.name || !adminForm.email || !adminForm.role || (!selectedAdmin && !adminForm.password)}
              style={{
                padding: '10px 20px',
                border: 'none',
                borderRadius: '8px',
                backgroundColor: '#ff3b30',
                color: '#fff',
                fontSize: '14px',
                fontWeight: '600',
                cursor: actionLoading ? 'not-allowed' : 'pointer',
                opacity: actionLoading || !adminForm.name || !adminForm.email || !adminForm.role || (!selectedAdmin && !adminForm.password) ? 0.7 : 1
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
              />
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
              />
            </div>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#1a202c' }}>
                Permissions ({roleForm.permissions.length} selected)
              </h4>
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
                          cursor: 'pointer',
                          borderRadius: '4px',
                          transition: 'background-color 0.2s'
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
                color: '#718096',
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
  const [isMobile, setIsMobile] = useState(false); // Added isMobile state

  // Form states
  const [adminForm, setAdminForm] = useState({
    name: '',
    email: '',
    phone: '',
    role: '',
    password: '',
    confirmPassword: '',
    status: 'active'
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
    sortBy: 'name',
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
 const isDevelopment = window.location.hostname === 'localhost' || 
                     window.location.hostname === '127.0.0.1';
const API_BASE_URL = isDevelopment 
  ? 'http://localhost:5002' 
  : 'https://vtu-application.onrender.com';

  // Role and permission configurations
  const ROLE_CONFIG = {
    super_admin: { color: '#ff3b30', name: 'Super Admin', priority: 1 },
    admin: { color: '#ff8c00', name: 'Administrator', priority: 2 },
    manager: { color: '#28a745', name: 'Manager', priority: 3 },
    support: { color: '#007bff', name: 'Support', priority: 4 },
    moderator: { color: '#6f42c1', name: 'Moderator', priority: 5 }
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
      fetchAdmins();
      fetchRoles();
      fetchActivityLogs();
    }
  }, [token, activeTab]);

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
      
      setAdmins(data.admins || []);
      setPagination(data.pagination || {
        currentPage: 1,
        totalPages: 1,
        totalItems: 0,
        hasNextPage: false,
        hasPrevPage: false
      });
    } catch (error) {
      console.error('Error fetching admins:', error);
      showNotification(`Failed to fetch admin users: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  }, [filters, token, makeApiCall, showNotification]);

  const fetchRoles = useCallback(async () => {
    if (!token) return;
    
    try {
      const data = await makeApiCall('/api/admin/management/roles');
      setRoles(data.roles || []);
      setPermissions(data.permissions || ALL_PERMISSIONS);
    } catch (error) {
      console.error('Error fetching roles:', error);
      showNotification(`Failed to fetch roles: ${error.message}`, 'error');
    }
  }, [token, makeApiCall, showNotification]);

  const fetchActivityLogs = useCallback(async () => {
    if (!token) return;
    
    try {
      const data = await makeApiCall('/api/admin/management/activity-logs');
      setActivityLogs(data.logs || []);
    } catch (error) {
      console.error('Error fetching activity logs:', error);
      showNotification(`Failed to fetch activity logs: ${error.message}`, 'error');
    }
  }, [token, makeApiCall, showNotification]);

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

  // Admin management functions
  const createAdmin = useCallback(async (adminData) => {
    if (!token) return;
    
    try {
      setActionLoading(true);
      await makeApiCall('/api/admin/management/admins', {
        method: 'POST',
        body: JSON.stringify(adminData)
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

  const toggleAdminStatus = useCallback(async (adminId, newStatus) => {
    if (!token) return;
    
    try {
      setActionLoading(true);
      await makeApiCall(`/api/admin/management/admins/${adminId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus })
      });
      showNotification(`Admin ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully`);
      await fetchAdmins();
      await fetchStats();
    } catch (error) {
      console.error('Error toggling admin status:', error);
      showNotification(`Failed to update admin status: ${error.message}`, 'error');
    } finally {
      setActionLoading(false);
    }
  }, [token, makeApiCall, showNotification, fetchAdmins, fetchStats]);

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
    if (selectedAdmins.length === admins.length) {
      setSelectedAdmins([]);
    } else {
      setSelectedAdmins(admins.map(admin => admin._id));
    }
  }, [selectedAdmins.length, admins]);

  // Form handlers
  const handleAdminSubmit = useCallback(async () => {
    if (adminForm.password !== adminForm.confirmPassword) {
      showNotification('Passwords do not match', 'error');
      return;
    }
    
    const adminData = {
      name: adminForm.name,
      email: adminForm.email,
      phone: adminForm.phone,
      role: adminForm.role,
      status: adminForm.status
    };
    
    if (adminForm.password) {
      adminData.password = adminForm.password;
    }
    
    if (selectedAdmin) {
      await updateAdmin(selectedAdmin._id, adminData);
    } else {
      await createAdmin(adminData);
    }
    
    setShowAdminModal(false);
    setAdminForm({
      name: '',
      email: '',
      phone: '',
      role: '',
      password: '',
      confirmPassword: '',
      status: 'active'
    });
    setSelectedAdmin(null);
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
      name: admin.name,
      email: admin.email,
      phone: admin.phone || '',
      role: admin.role,
      password: '',
      confirmPassword: '',
      status: admin.status
    });
    setShowAdminModal(true);
  }, []);

  const handleNewAdmin = useCallback(() => {
    setSelectedAdmin(null);
    setAdminForm({
      name: '',
      email: '',
      phone: '',
      role: '',
      password: '',
      confirmPassword: '',
      status: 'active'
    });
    setShowAdminModal(true);
  }, []);

  const handleConfigureRole = useCallback((role) => {
    setSelectedRole(role);
    setRoleForm({
      name: role.name,
      description: role.description || '',
      permissions: role.permissions || []
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
  const getStatusBadge = useCallback((status) => {
    const statusConfig = {
      active: { bg: '#28a745', text: 'Active' },
      inactive: { bg: '#6c757d', text: 'Inactive' },
      suspended: { bg: '#dc3545', text: 'Suspended' }
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
  }, []);

  const getRoleBadge = useCallback((role) => {
    const config = ROLE_CONFIG[role] || { color: '#6c757d', name: role };
    
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
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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
        { id: 'admins', label: 'Admin Users', icon: '👨‍💼', count: stats.totalAdmins },
        { id: 'roles', label: 'Roles & Permissions', icon: '🔑', count: stats.totalRoles },
        { id: 'logs', label: 'Activity Logs', icon: '📝', count: null }
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
  const AdminUsersContent = () => (
    <div>
      {/* Filters and Search */}
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
          style={{...STYLES.select, minWidth: '140px'}}
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
          <option value="suspended">Suspended</option>
        </select>

        {/* Add Admin Button */}
        <button
          onClick={handleNewAdmin}
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
          + Add Admin
        </button>
      </div>

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
        ) : admins.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: '#718096' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>👨‍💼</div>
            <h3 style={{ color: '#1a202c', marginBottom: '8px' }}>No admin users found</h3>
            <p>No admin users match your search criteria</p>
          </div>
        ) : (
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
                  Last Active
                </th>
                <th style={{ padding: '16px', textAlign: 'right', fontSize: '14px', fontWeight: '600', color: '#1a202c', borderBottom: '1px solid #e2e8f0', width: '150px' }}>
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
                        {admin.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: '600', color: '#1a202c', fontSize: '14px' }}>
                          {admin.name}
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
                    {getStatusBadge(admin.status)}
                  </td>
                  <td style={{ padding: '16px' }}>
                    <div style={{ color: '#1a202c', fontSize: '14px' }}>
                      {admin.lastActive ? formatDate(admin.lastActive) : 'Never'}
                    </div>
                  </td>
                  <td style={{ padding: '16px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      <button
                        onClick={() => handleEditAdmin(admin)}
                        style={{
                          padding: '4px 8px',
                          backgroundColor: '#f7fafc',
                          border: '1px solid #e2e8f0',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: '600',
                          color: '#1a202c',
                          cursor: 'pointer'
                        }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => toggleAdminStatus(admin._id, admin.status === 'active' ? 'inactive' : 'active')}
                        disabled={actionLoading}
                        style={{
                          padding: '4px 8px',
                          backgroundColor: admin.status === 'active' ? '#ff8c00' : '#28a745',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: '600',
                          cursor: actionLoading ? 'not-allowed' : 'pointer',
                          opacity: actionLoading ? 0.7 : 1
                        }}
                      >
                        {admin.status === 'active' ? 'Deactivate' : 'Activate'}
                      </button>
                      <button
                        onClick={() => deleteAdmin(admin._id)}
                        disabled={actionLoading}
                        style={{
                          padding: '4px 8px',
                          backgroundColor: '#dc3545',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: '600',
                          cursor: actionLoading ? 'not-allowed' : 'pointer',
                          opacity: actionLoading ? 0.7 : 1
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {!loading && admins.length > 0 && <PaginationControls />}
    </div>
  );

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
        {roles.map((role) => {
          const roleConfig = ROLE_CONFIG[role.name] || { color: '#6c757d', name: role.name, priority: 99 };
          return (
            <div
              key={role._id}
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
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <h4 style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#1a202c',
                  margin: '0 0 8px 0'
                }}>
                  Permissions ({role.permissions.length})
                </h4>
                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '6px'
                }}>
                  {Object.entries(PERMISSION_CATEGORIES).map(([categoryKey, category]) => {
                    const categoryPermissions = role.permissions.filter(p => 
                      ALL_PERMISSIONS.find(ap => ap.id === p && ap.category === categoryKey)
                    );
                    
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
                Access to {role.permissions.length} of {ALL_PERMISSIONS.length} total permissions
              </div>
            </div>
          );
        })}
      </div>

      {/* Permission Matrix */}
      <div style={{
        backgroundColor: '#fff',
        padding: '24px',
        borderRadius: '12px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        border: '1px solid #e2e8f0'
      }}>
        <h3 style={{
          fontSize: '18px',
          fontWeight: '700',
          color: '#1a202c',
          margin: '0 0 20px 0'
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
                  color: '#1a202c',
                  borderBottom: '1px solid #e2e8f0'
                }}>
                  Permission
                </th>
                {roles.map((role) => {
                  const roleConfig = ROLE_CONFIG[role.name] || { color: '#6c757d', name: role.name };
                  return (
                    <th
                      key={role._id}
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
                      colSpan={roles.length + 1}
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
                        color: '#1a202c'
                      }}>
                        {permission.name}
                      </td>
                      {roles.map((role) => {
                        const hasPermission = role.permissions.includes(permission.id);
                        
                        return (
                          <td
                            key={role._id}
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

  // Activity Logs Tab Content
  const ActivityLogsContent = () => (
    <div style={{
      backgroundColor: '#fff',
      padding: '24px',
      borderRadius: '12px',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
      border: '1px solid #e2e8f0'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px'
      }}>
        <h3 style={{
          fontSize: '18px',
          fontWeight: '700',
          color: '#1a202c',
          margin: 0
        }}>
          Admin Activity Logs
        </h3>
        <div style={{ display: 'flex', gap: '12px' }}>
          <select style={{
            padding: '8px 12px',
            border: '1px solid #e2e8f0',
            borderRadius: '6px',
            fontSize: '14px'
          }}>
            <option value="all">All Activities</option>
            <option value="login">Login/Logout</option>
            <option value="user">User Management</option>
            <option value="transaction">Transactions</option>
            <option value="service">Services</option>
            <option value="system">System Changes</option>
          </select>
          <button style={{
            padding: '8px 16px',
            backgroundColor: '#f7fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer'
          }}>
            Export Logs
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {activityLogs.length > 0 ? activityLogs.map((log, index) => (
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
              fontSize: '16px'
            }}>
              {getActivityIcon(log.action)}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{
                fontSize: '14px',
                fontWeight: '600',
                color: '#1a202c',
                marginBottom: '4px'
              }}>
                {log.description}
              </div>
              <div style={{
                fontSize: '12px',
                color: '#718096'
              }}>
                by {log.adminName} • {formatDate(log.timestamp)} • IP: {log.ipAddress}
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
              {log.status}
            </div>
          </div>
        )) : (
          <div style={{
            textAlign: 'center',
            padding: '40px',
            color: '#718096'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📝</div>
            <h3 style={{ color: '#1a202c', marginBottom: '8px' }}>No activity logs found</h3>
            <p>Admin activity will appear here when actions are performed</p>
          </div>
        )}
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
      info: '#007bff'
    };
    return colors[status] || colors.info;
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
          { label: 'Total Admins', value: stats.totalAdmins, color: '#ff3b30', icon: '👨‍💼' },
          { label: 'Active Admins', value: stats.activeAdmins, color: '#28a745', icon: '✅' },
          { label: 'Inactive Admins', value: stats.inactiveAdmins, color: '#6c757d', icon: '⏸️' },
          { label: 'Total Roles', value: stats.totalRoles, color: '#007bff', icon: '🔑' }
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
        {/* Tab Navigation */}
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
              Admin Management
            </h2>
          </div>
          
          <TabNavigation />
        </div>

        {/* Tab Content */}
        <div style={{ padding: isMobile ? '16px' : '24px' }}>
          {activeTab === 'admins' && <AdminUsersContent />}
          {activeTab === 'roles' && <RolesPermissionsContent />}
          {activeTab === 'logs' && <ActivityLogsContent />}
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
  );
};

export default AdminManagement;