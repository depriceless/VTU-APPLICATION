import React, { useState, useEffect } from 'react';
import UserManagement from './UserManagement';
import TransactionManagement from './TransactionManagement';
import ServiceManagement from './ServiceManagement';
import FinancialManagement from './FinancialManagement';
import SystemManagement from './SystemManagement';
import AdminManagement from './AdminManagement';
import NotificationManagement from './NotificationManagement';
import SupportTicketDetail from './SupportTicketDetail';

const AdminDashboard = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeMenu, setActiveMenu] = useState('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // Dashboard state
  const [dashboardStats, setDashboardStats] = useState({
    todayRevenue: { value: 0, change: 0, loading: true },
    totalTransactions: { value: 0, timeframe: 'Last 24 hours', loading: true },
    activeUsers: { value: 0, status: 'Online now', loading: true },
    successRate: { value: 0, context: 'Last 24 hours', loading: true }
  });
  
  const [activitiesLoading, setActivitiesLoading] = useState(true);
  const [recentActivities, setRecentActivities] = useState([]);
  const [menuStats, setMenuStats] = useState({});
  const [adminProfile, setAdminProfile] = useState({
    name: 'Admin User',
    email: 'admin@vtuapp.com',
    role: 'Super Administrator',
    phone: '+234 123 456 7890',
    avatar: 'AU'
  });

  // API Balance State
  const [apiBalances, setApiBalances] = useState([
    {
      provider: 'ClubKonnect',
      balance: 0,
      currency: '₦',
      lastUpdated: '',
      loading: true,
      status: 'Checking...'
    },
    {
      provider: 'VTU Service',
      balance: 0,
      currency: '₦',
      lastUpdated: '',
      loading: true,
      status: 'Checking...'
    }
  ]);
  const [apiBalancesLoading, setApiBalancesLoading] = useState(true);

  // Scrollbar styling
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      html, body {
        overflow: hidden !important;
        margin: 0 !important;
        padding: 0 !important;
        width: 100% !important;
        height: 100% !important;
      }
      * {
        box-sizing: border-box !important;
      }
      ::-webkit-scrollbar {
        width: 8px;
        background-color: #ffffff;
      }
      ::-webkit-scrollbar-thumb {
        background-color: #cbd5e0;
        border-radius: 4px;
      }
      ::-webkit-scrollbar-thumb:hover {
        background-color: #a0aec0;
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      if (style.parentNode) {
        style.parentNode.removeChild(style);
      }
    };
  }, []);

  // Check screen size
  useEffect(() => {
    const checkScreenSize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile && isExpanded) {
        setIsExpanded(false);
      }
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, [isExpanded]);

  // Ticket event listener
  useEffect(() => {
    const handleShowTicket = (event) => {
      setActiveMenu(`ticket-${event.detail.ticketId}`);
    };
    
    window.addEventListener('showTicket', handleShowTicket);
    return () => {
      window.removeEventListener('showTicket', handleShowTicket);
    };
  }, []);

  // API functions
  const fetchDashboardStats = async () => {
    try {
      const token = localStorage.getItem('admin_token') || sessionStorage.getItem('admin_token');
      const response = await fetch('https://vtu-application.onrender.com/api/dashboard/stats', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) throw new Error('Failed to fetch dashboard stats');
      
      const data = await response.json();
      
      setDashboardStats({
        todayRevenue: { 
          value: data.todayRevenue || 0, 
          change: data.revenueChange || 0, 
          loading: false 
        },
        totalTransactions: { 
          value: data.totalTransactions || 0, 
          timeframe: 'Last 24 hours', 
          loading: false 
        },
        activeUsers: { 
          value: data.activeUsers || 0, 
          status: 'Online now', 
          loading: false 
        },
        successRate: { 
          value: data.successRate || 0, 
          context: 'Last 24 hours', 
          loading: false 
        }
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      setDashboardStats({
        todayRevenue: { value: 0, change: 0, loading: false },
        totalTransactions: { value: 0, timeframe: 'Last 24 hours', loading: false },
        activeUsers: { value: 0, status: 'Offline', loading: false },
        successRate: { value: 0, context: 'No data', loading: false }
      });
    }
  };

  const fetchRecentActivities = async () => {
    try {
      setActivitiesLoading(true);
      const token = localStorage.getItem('admin_token') || sessionStorage.getItem('admin_token');
      const response = await fetch('https://vtu-application.onrender.com/api/dashboard/recent-activities', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) throw new Error('Failed to fetch activities');
      
      const data = await response.json();
      setRecentActivities(data.activities || data || []);
    } catch (error) {
      console.error('Error fetching recent activities:', error);
      setRecentActivities([
        { icon: '⚠️', description: 'Unable to load activities - API connection failed', timeAgo: 'Just now' }
      ]);
    } finally {
      setActivitiesLoading(false);
    }
  };

  const fetchMenuStats = async () => {
    try {
      const token = localStorage.getItem('admin_token') || sessionStorage.getItem('admin_token');
      const response = await fetch('https://vtu-application.onrender.com/api/services/stats', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) throw new Error('Failed to fetch menu stats');
      
      const data = await response.json();
      setMenuStats(data.data || data || {});
    } catch (error) {
      console.error('Error fetching menu stats:', error);
      setMenuStats({});
    }
  };

  const fetchAdminProfile = async () => {
    try {
      const token = localStorage.getItem('admin_token') || sessionStorage.getItem('admin_token');
      
      if (!token) {
        window.location.href = '/';
        return;
      }
      
      const response = await fetch('https://vtu-application.onrender.com/api/admin/profile', {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include'
      });
      
      if (response.status === 401) {
        localStorage.removeItem('admin_token');
        sessionStorage.removeItem('admin_token');
        window.location.href = '/';
        return;
      }
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.success && data.profile) {
        setAdminProfile({
          name: data.profile.name || 'Admin User',
          email: data.profile.email || 'admin@vtuapp.com',
          role: data.profile.role === 'super_admin' ? 'Super Administrator' : 
                data.profile.role === 'admin' ? 'Administrator' : 
                data.profile.role === 'support' ? 'Support Staff' : 'Admin User',
          phone: data.profile.phone || '+234 123 456 7890',
          avatar: data.profile.avatar || 'AU'
        });
      }
    } catch (error) {
      console.error('Error fetching admin profile:', error);
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        console.log('Network error - using cached profile data');
      }
    }
  };

  // NEW: Fetch API Balances
 const fetchApiBalances = async () => {
  try {
    setApiBalancesLoading(true);
    const token = localStorage.getItem('admin_token') || sessionStorage.getItem('admin_token');
    
    console.log('🔍 Debug - Token exists?', token ? 'YES' : 'NO');
    console.log('Token length:', token ? token.length : 'N/A');
    console.log('Token preview:', token ? token.substring(0, 20) + '...' : 'N/A');
    
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    // First try with token
    const response = await fetch('https://vtu-application.onrender.com/api/clubkonnect/dashboard-balance', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Response status:', response.status);
    console.log('Response status text:', response.statusText);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ API response with token:', data);
      
      setApiBalances([
        {
          provider: 'ClubKonnect',
          balance: data.data?.clubKonnect?.balance || 0,
          currency: data.data?.clubKonnect?.currency || '₦',
          lastUpdated: now,
          loading: false,
          status: data.data?.clubKonnect?.status || 'Online'
        },
        {
          provider: 'VTU Service',
          balance: data.data?.platform?.balance || 0,
          currency: data.data?.platform?.currency || '₦',
          lastUpdated: now,
          loading: false,
          status: data.data?.platform?.status || 'Online'
        }
      ]);
      
    } else if (response.status === 401) {
      console.log('🚨 401 Unauthorized - trying without token...');
      
      // Try without token
      const response2 = await fetch('https://vtu-application.onrender.com/api/clubkonnect/dashboard-balance', {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Response without token status:', response2.status);
      
      if (response2.ok) {
        const data = await response2.json();
        console.log('✅ Success without token! Data:', data);
        
        setApiBalances([
          {
            provider: 'ClubKonnect',
            balance: data.data?.clubKonnect?.balance || 0,
            currency: data.data?.clubKonnect?.currency || '₦',
            lastUpdated: now,
            loading: false,
            status: data.data?.clubKonnect?.status || 'Online'
          },
          {
            provider: 'VTU Service',
            balance: data.data?.platform?.balance || 0,
            currency: data.data?.platform?.currency || '₦',
            lastUpdated: now,
            loading: false,
            status: data.data?.platform?.status || 'Online'
          }
        ]);
      } else {
        console.log('❌ Both attempts failed - using mock data');
        setApiBalances([
          {
            provider: 'ClubKonnect',
            balance: 15420.75,
            currency: '₦',
            lastUpdated: now,
            loading: false,
            status: 'Auth Error'
          },
          {
            provider: 'VTU Service',
            balance: 89250.30,
            currency: '₦',
            lastUpdated: now,
            loading: false,
            status: 'Auth Error'
          }
        ]);
      }
    } else {
      console.log('❌ Other error:', response.status);
      setApiBalances([
        {
          provider: 'ClubKonnect',
          balance: 15420.75,
          currency: '₦',
          lastUpdated: now,
          loading: false,
          status: `Error ${response.status}`
        },
        {
          provider: 'VTU Service',
          balance: 89250.30,
          currency: '₦',
          lastUpdated: now,
          loading: false,
          status: `Error ${response.status}`
        }
      ]);
    }
    
  } catch (error) {
    console.error('❌ Network error fetching API balances:', error);
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    setApiBalances([
      {
        provider: 'ClubKonnect',
        balance: 15420.75,
        currency: '₦',
        lastUpdated: now,
        loading: false,
        status: 'Network Error'
      },
      {
        provider: 'VTU Service',
        balance: 89250.30,
        currency: '₦',
        lastUpdated: now,
        loading: false,
        status: 'Network Error'
      }
    ]);
  } finally {
    setApiBalancesLoading(false);
  }
};

  // Fetch data on component mount
  useEffect(() => {
    fetchDashboardStats();
    fetchRecentActivities();
    fetchMenuStats();
    fetchAdminProfile();
    fetchApiBalances(); // NEW: Fetch API balances

    // Set up auto-refresh intervals
    const statsInterval = setInterval(fetchDashboardStats, 30000);
    const activitiesInterval = setInterval(fetchRecentActivities, 60000);
    const menuStatsInterval = setInterval(fetchMenuStats, 300000);
    const profileInterval = setInterval(fetchAdminProfile, 60000);
    const apiBalanceInterval = setInterval(fetchApiBalances, 120000); // NEW: Refresh API balances every 2 minutes

    return () => {
      clearInterval(statsInterval);
      clearInterval(activitiesInterval);
      clearInterval(menuStatsInterval);
      clearInterval(profileInterval);
      clearInterval(apiBalanceInterval);
    };
  }, []);

  // Menu items with real data from backend
  const menuItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: '🏠',
      notifications: 0,
      searchKeywords: ['dashboard', 'overview', 'analytics', 'home']
    },
    {
      id: 'users',
      label: 'User Management',
      icon: '👥',
      notifications: menuStats.pendingVerifications || 0,
      searchKeywords: ['users', 'customers', 'kyc', 'verification'],
      subItems: [
        { 
          id: 'all-users', 
          label: 'All Users', 
          icon: '👤',
          description: 'View and manage all registered users',
          count: menuStats.totalUsers ? menuStats.totalUsers.toLocaleString() : 'Loading...'
        },
        { 
          id: 'user-verification', 
          label: 'Verification/KYC', 
          icon: '✅',
          description: 'Review pending identity verifications',
          count: menuStats.pendingVerifications ? `${menuStats.pendingVerifications} pending` : 'Loading...'
        },
        { 
          id: 'suspended-users', 
          label: 'Suspended Users', 
          icon: '⚠️',
          description: 'Manage blocked and suspended accounts',
          count: menuStats.suspendedUsers ? menuStats.suspendedUsers.toString() : 'Loading...'
        },
        { 
          id: 'user-logs', 
          label: 'Activity Logs', 
          icon: '📊',
          description: 'Track user activities and behaviors',
          count: 'Real-time'
        }
      ]
    },
    {
      id: 'transactions',
      label: 'Transaction Management',
      icon: '💳',
      notifications: (menuStats.failedTransactions || 0) + (menuStats.pendingTransactions || 0),
      searchKeywords: ['transactions', 'payments', 'money'],
      subItems: [
        { 
          id: 'all-transactions', 
          label: 'All Transactions', 
          icon: '💳',
          description: 'View complete transaction history',
          count: menuStats.totalTransactions ? menuStats.totalTransactions.toLocaleString() : 'Loading...'
        },
        { 
          id: 'failed-transactions', 
          label: 'Failed Transactions', 
          icon: '❌',
          description: 'Review and resolve failed payments',
          count: menuStats.failedTransactions ? menuStats.failedTransactions.toString() : 'Loading...'
        },
        { 
          id: 'pending-transactions', 
          label: 'Pending Transactions', 
          icon: '⏳',
          description: 'Monitor transactions awaiting completion',
          count: menuStats.pendingTransactions ? menuStats.pendingTransactions.toString() : 'Loading...'
        },
        { 
          id: 'refunds', 
          label: 'Refunds & Reversals', 
          icon: '💰',
          description: 'Process refunds and transaction reversals',
          count: menuStats.refundRequests ? menuStats.refundRequests.toString() : '0'
        }
      ]
    },
    {
      id: 'services',
      label: 'Service Management',
      icon: '📱',
      notifications: 0,
      searchKeywords: ['services', 'bills', 'airtime', 'data'],
      subItems: [
        { 
          id: 'airtime', 
          label: 'Airtime Services', 
          icon: '📞',
          description: 'Manage MTN, Airtel, Glo, 9Mobile top-ups',
          count: '4 providers'
        },
        { 
          id: 'data', 
          label: 'Data Bundle Plans', 
          icon: '📶',
          description: 'Configure data bundle offerings',
          count: '24 plans'
        },
        { 
          id: 'cable-tv', 
          label: 'Cable TV', 
          icon: '📺',
          description: 'DStv, GOtv, Startimes subscriptions',
          count: '3 providers'
        },
        { 
          id: 'electricity', 
          label: 'Electricity Bills', 
          icon: '⚡',
          description: 'Electricity bill payment services',
          count: '11 DISCOs'
        },
        { 
          id: 'service-pricing', 
          label: 'Service Pricing', 
          icon: '💲',
          description: 'Configure service rates and commissions',
          count: 'Active'
        },
        { 
          id: 'service-status', 
          label: 'Service Status', 
          icon: '🔧',
          description: 'Enable/disable services and maintenance',
          count: menuStats.servicesOnline ? 'Online' : 'Checking...'
        }
      ]
    },
    {
      id: 'financial',
      label: 'Financial Management',
      icon: '💰',
      notifications: 0,
      searchKeywords: ['financial', 'revenue', 'money', 'reports'],
      subItems: [
        { 
          id: 'revenue', 
          label: 'Revenue Reports', 
          icon: '📈',
          description: 'Track earnings and profit analysis',
          count: menuStats.todayRevenue ? `₦${(menuStats.todayRevenue / 1000).toFixed(1)}K today` : 'Loading...'
        },
        { 
          id: 'commission', 
          label: 'Commission Settings', 
          icon: '📊',
          description: 'Configure commission structures',
          count: '2.5% avg'
        },
        { 
          id: 'wallet', 
          label: 'Wallet Management', 
          icon: '👛',
          description: 'Manage user wallet balances',
          count: menuStats.totalWalletBalance ? `₦${(menuStats.totalWalletBalance / 1000000).toFixed(1)}M total` : 'Loading...'
        },
        { 
          id: 'settlements', 
          label: 'Settlement Reports', 
          icon: '📄',
          description: 'Bank settlement and payout reports',
          count: 'Daily'
        }
      ]
    },
    {
      id: 'system',
      label: 'System Management',
      icon: '⚙️',
      notifications: menuStats.systemAlerts || 0,
      searchKeywords: ['system', 'api', 'configuration', 'health'],
      subItems: [
        { 
          id: 'api-config', 
          label: 'API Configuration', 
          icon: '🔌',
          description: 'Configure external service APIs',
          count: '12 APIs'
        },
        { 
          id: 'system-health', 
          label: 'System Health', 
          icon: '💚',
          description: 'Monitor system performance and uptime',
          count: menuStats.systemUptime || 'Checking...'
        },
        { 
          id: 'error-logs', 
          label: 'Error Logs', 
          icon: '🚨',
          description: 'Review system errors and issues',
          count: menuStats.todayErrors !== undefined ? `${menuStats.todayErrors} today` : 'Loading...'
        }
      ]
    },
    {
      id: 'admin',
      label: 'Admin Management',
      icon: '🛡️',
      notifications: 0,
      searchKeywords: ['admin', 'users', 'permissions', 'roles'],
      subItems: [
        { 
          id: 'admin-users', 
          label: 'Admin Users', 
          icon: '👨‍💼',
          description: 'Manage administrative user accounts',
          count: menuStats.adminUsers ? `${menuStats.adminUsers} admins` : 'Loading...'
        },
        { 
          id: 'permissions', 
          label: 'Role Permissions', 
          icon: '🔑',
          description: 'Configure user roles and access levels',
          count: '5 roles'
        },
        { 
          id: 'admin-logs', 
          label: 'Admin Activity', 
          icon: '📝',
          description: 'Track administrative actions',
          count: 'Real-time'
        }
      ]
    },
    {
      id: 'reports',
      label: 'Reports & Analytics',
      icon: '📊',
      notifications: 0,
      searchKeywords: ['reports', 'analytics', 'statistics', 'data'],
      subItems: [
        { 
          id: 'sales-reports', 
          label: 'Sales Reports', 
          icon: '📈',
          description: 'Comprehensive sales performance data',
          count: 'Updated'
        },
        { 
          id: 'customer-analytics', 
          label: 'Customer Analytics', 
          icon: '👥',
          description: 'User behavior and engagement insights',
          count: 'Live data'
        },
        { 
          id: 'service-performance', 
          label: 'Service Performance', 
          icon: '⚡',
          description: 'Service usage and success rates',
          count: menuStats.serviceSuccessRate ? `${menuStats.serviceSuccessRate}%` : 'Loading...'
        }
      ]
    },
    {
      id: 'notifications',
      label: 'Notifications',
      icon: '🔔',
      notifications: Math.min(menuStats.unreadNotifications || 0, 99),
      searchKeywords: ['notifications', 'alerts', 'messages']
    },
    {
      id: 'profile',
      label: 'Profile Settings',
      icon: '👤',
      notifications: 0,
      searchKeywords: ['profile', 'settings', 'account']
    }
  ];

  const filteredMenuItems = searchQuery ? menuItems.filter(item => {
    const query = searchQuery.toLowerCase();
    return item.searchKeywords.some(keyword => 
      keyword.toLowerCase().includes(query)
    ) || item.label.toLowerCase().includes(query);
  }) : menuItems;

  const toggleSidebar = () => setIsExpanded(!isExpanded);
  const handleMenuClick = (menuId) => {
    setActiveMenu(menuId);
    setShowProfileDropdown(false);
    if (isMobile && isExpanded) setIsExpanded(false);
  };
  const clearSearch = () => setSearchQuery('');
  
  const handleLogout = () => {
    const rememberedUsername = localStorage.getItem('remembered_username');
    
    const itemsToKeep = ['remembered_username'];
    Object.keys(localStorage).forEach(key => {
      if (!itemsToKeep.includes(key)) {
        localStorage.removeItem(key);
      }
    });
    
    sessionStorage.clear();
    
    document.cookie.split(';').forEach(cookie => {
      const eqPos = cookie.indexOf('=');
      const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
      document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
    });
    
    if (rememberedUsername) {
      localStorage.setItem('remembered_username', rememberedUsername);
    }
    
    window.location.href = '/'; 
  };

  const handleProfile = () => {
    setActiveMenu('profile');
    setShowProfileDropdown(false);
  };

  const currentMenuItem = menuItems.find(item => item.id === activeMenu);

  // Dashboard content with real data
  const renderDashboardContent = () => {
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

    const formatBalance = (balance) => {
      return new Intl.NumberFormat('en-NG', {
        style: 'currency',
        currency: 'NGN',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(balance);
    };

    const statsCards = [
      { 
        icon: '💰', 
        title: "Today's Revenue", 
        value: dashboardStats.todayRevenue.loading ? 'Loading...' : formatCurrency(dashboardStats.todayRevenue.value),
        change: dashboardStats.todayRevenue.loading ? '...' : 
                `${dashboardStats.todayRevenue.change >= 0 ? '+' : ''}${dashboardStats.todayRevenue.change.toFixed(1)}% from yesterday`,
        color: '#ff3b30',
        loading: dashboardStats.todayRevenue.loading
      },
      { 
        icon: '💳', 
        title: 'Total Transactions', 
        value: dashboardStats.totalTransactions.loading ? 'Loading...' : formatNumber(dashboardStats.totalTransactions.value),
        change: dashboardStats.totalTransactions.timeframe,
        color: '#ff3b30',
        loading: dashboardStats.totalTransactions.loading
      },
      { 
        icon: '👥', 
        title: 'Active Users', 
        value: dashboardStats.activeUsers.loading ? 'Loading...' : formatNumber(dashboardStats.activeUsers.value),
        change: dashboardStats.activeUsers.status,
        color: '#ff3b30',
        loading: dashboardStats.activeUsers.loading
      },
      { 
        icon: '📊', 
        title: 'Success Rate', 
        value: dashboardStats.successRate.loading ? 'Loading...' : `${dashboardStats.successRate.value.toFixed(1)}%`,
        change: dashboardStats.successRate.context,
        color: '#ff3b30',
        loading: dashboardStats.successRate.loading
      }
    ];

    return (
      <div style={{width: '100%', maxWidth: '100%'}}>
        {/* Main Stats Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: isMobile ? '8px' : '10px',
          marginBottom: isMobile ? '16px' : '20px',
          width: '100%'
        }}>
          {statsCards.map((item, index) => (
            <div key={index} style={{
              backgroundColor: '#fff',
              padding: isMobile ? '10px' : '14px',
              borderRadius: '8px',
              boxShadow: '0 1px 4px rgba(0, 0, 0, 0.1)',
              border: '1px solid #e2e8f0',
              opacity: item.loading ? 0.7 : 1,
              transition: 'opacity 0.3s ease'
            }}>
              <div style={{
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px', 
                marginBottom: index === 0 ? '6px' : '8px'
              }}>
                <div style={{
                  fontSize: index === 0 ? (isMobile ? '16px' : '18px') : (isMobile ? '18px' : '20px')
                }}>{item.icon}</div>
                <h3 style={{
                  color: '#1a202c', 
                  fontSize: index === 0 ? (isMobile ? '11px' : '13px') : (isMobile ? '12px' : '14px'),
                  fontWeight: '600', 
                  margin: 0
                }}>
                  {item.title}
                </h3>
              </div>
              <p style={{
                color: item.loading ? '#718096' : item.color, 
                fontSize: index === 0 ? (isMobile ? '14px' : '16px') : (isMobile ? '16px' : '18px'),
                fontWeight: '700', 
                margin: 0
              }}>
                {item.value}
              </p>
              <p style={{
                color: '#718096', 
                fontSize: index === 0 ? (isMobile ? '9px' : '11px') : (isMobile ? '10px' : '12px'),
                margin: '2px 0 0 0'
              }}>
                {item.change}
              </p>
            </div>
          ))}
        </div>

        {/* API Balances Section */}
        <div style={{
          backgroundColor: '#fff',
          padding: isMobile ? '12px' : '16px',
          borderRadius: '8px',
          boxShadow: '0 1px 4px rgba(0, 0, 0, 0.1)',
          border: '1px solid #e2e8f0',
          marginBottom: isMobile ? '16px' : '20px',
          width: '100%'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px'
          }}>
            <h3 style={{
              color: '#1a202c', 
              fontSize: isMobile ? '16px' : '18px', 
              fontWeight: '600',
              margin: 0
            }}>
              API Provider Balances
            </h3>
            <button
              onClick={fetchApiBalances}
              disabled={apiBalancesLoading}
              style={{
                padding: '6px 12px',
                backgroundColor: '#ff3b30',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: '500',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                opacity: apiBalancesLoading ? 0.7 : 1
              }}
            >
              {apiBalancesLoading ? 'Refreshing...' : '↻ Refresh'}
            </button>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: isMobile ? '12px' : '16px'
          }}>
            {apiBalances.map((api, index) => (
              <div key={index} style={{
                backgroundColor: '#f8f9fa',
                padding: isMobile ? '14px' : '16px',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                opacity: api.loading ? 0.7 : 1
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: '12px'
                }}>
                  <div>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      marginBottom: '4px'
                    }}>
                      <div style={{
                        width: '36px',
                        height: '36px',
                        backgroundColor: '#ff3b30',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '16px',
                        fontWeight: 'bold',
                        color: '#fff'
                      }}>
                        {api.provider === 'ClubKonnect' ? 'CK' : 'VTU'}
                      </div>
                      <div>
                        <h4 style={{
                          fontSize: '14px',
                          fontWeight: '600',
                          color: '#1a202c',
                          margin: 0
                        }}>
                          {api.provider}
                        </h4>
                        <span style={{
                          fontSize: '11px',
                          color: '#718096',
                          backgroundColor: '#e2e8f0',
                          padding: '2px 6px',
                          borderRadius: '4px'
                        }}>
                          {api.status}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div style={{ textAlign: 'right' }}>
                    <div style={{
                      fontSize: isMobile ? '16px' : '18px',
                      fontWeight: '700',
                      color: '#ff3b30',
                      marginBottom: '4px'
                    }}>
                      {api.loading ? 'Loading...' : formatBalance(api.balance)}
                    </div>
                    {api.lastUpdated && !api.loading && (
                      <div style={{
                        fontSize: '11px',
                        color: '#718096'
                      }}>
                        Updated: {api.lastUpdated}
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Low balance warning */}
                {api.balance < 1000 && api.balance > 0 && !api.loading && (
                  <div style={{
                    backgroundColor: '#fff7ed',
                    border: '1px solid #fed7aa',
                    color: '#c2410c',
                    padding: '8px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    ⚠️ Low balance! Consider topping up.
                  </div>
                )}
                
                {api.balance === 0 && !api.loading && (
                  <div style={{
                    backgroundColor: '#fff5f5',
                    border: '1px solid #fed7d7',
                    color: '#c53030',
                    padding: '8px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    🚨 Zero balance! Top up required.
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity Section */}
        <div style={{
          backgroundColor: '#fff',
          padding: isMobile ? '12px' : '16px',
          borderRadius: '8px',
          boxShadow: '0 1px 4px rgba(0, 0, 0, 0.1)',
          border: '1px solid #e2e8f0',
          width: '100%',
          maxWidth: '100%'
        }}>
          <h3 style={{
            color: '#1a202c', 
            fontSize: isMobile ? '16px' : '18px', 
            fontWeight: '600', 
            marginBottom: '16px'
          }}>
            Recent Activity
          </h3>
          
          {activitiesLoading ? (
            <div style={{display: 'flex', flexDirection: 'column', gap: '12px'}}>
              {[1, 2, 3, 4].map((_, index) => (
                <div key={index} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: isMobile ? '10px' : '12px',
                  borderRadius: '8px',
                  backgroundColor: '#f7fafc'
                }}>
                  <div style={{
                    width: '20px',
                    height: '20px',
                    backgroundColor: '#e2e8f0',
                    borderRadius: '50%'
                  }} />
                  <div style={{flex: 1}}>
                    <div style={{
                      height: '14px',
                      backgroundColor: '#e2e8f0',
                      borderRadius: '4px',
                      marginBottom: '4px',
                      width: `${60 + index * 10}%`
                    }} />
                    <div style={{
                      height: '12px',
                      backgroundColor: 'rgba(241, 245, 249, 0.8)',
                      borderRadius: '4px',
                      width: '40%'
                    }} />
                  </div>
                </div>
              ))}
            </div>
          ) : recentActivities.length > 0 ? (
            <div style={{display: 'flex', flexDirection: 'column', gap: '12px'}}>
              {recentActivities.map((activity, index) => (
                <div key={index} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: isMobile ? '10px' : '12px',
                  borderRadius: '8px',
                  backgroundColor: '#f7fafc'
                }}>
                  <div style={{fontSize: isMobile ? '16px' : '18px'}}>{activity.icon}</div>
                  <div style={{flex: 1}}>
                    <p style={{margin: 0, fontSize: isMobile ? '13px' : '14px', color: '#1a202c'}}>
                      {activity.description}
                    </p>
                    <p style={{margin: 0, fontSize: isMobile ? '11px' : '12px', color: '#718096'}}>
                      {activity.timeAgo}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{
              textAlign: 'center',
              padding: '20px',
              color: '#718096',
              fontSize: '14px'
            }}>
              No recent activities found
            </div>
          )}
        </div>
      </div>
    );
  };

  // Profile content
  const renderProfileContent = () => (
    <div style={{width: '100%', maxWidth: '100%'}}>
      <div style={{
        backgroundColor: '#fff',
        padding: isMobile ? '16px' : '24px',
        borderRadius: '12px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        border: '1px solid #e2e8f0',
        marginBottom: '20px',
        width: '100%'
      }}>
        <div style={{
          display: 'flex',
          alignItems: isMobile ? 'flex-start' : 'center',
          gap: isMobile ? '16px' : '24px',
          marginBottom: isMobile ? '20px' : '24px',
          flexDirection: isMobile ? 'column' : 'row',
          textAlign: isMobile ? 'center' : 'left'
        }}>
          <div style={{
            width: isMobile ? '60px' : '80px',
            height: isMobile ? '60px' : '80px',
            background: 'linear-gradient(135deg, #667eea, #764ba2)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: isMobile ? '20px' : '24px',
            color: '#fff',
            fontWeight: 'bold'
          }}>
            {adminProfile.avatar}
          </div>
          <div>
            <h2 style={{fontSize: isMobile ? '18px' : '20px', fontWeight: '700', color: '#000000', margin: '0 0 8px 0'}}>
              {adminProfile.name}
            </h2>
            <p style={{fontSize: isMobile ? '14px' : '16px', color: '#000000', margin: '0 0 8px 0'}}>
              {adminProfile.email}
            </p>
            <span style={{
              backgroundColor: '#28a745',
              color: '#fff',
              padding: '4px 8px',
              borderRadius: '12px',
              fontSize: '11px',
              fontWeight: '600'
            }}>
              {adminProfile.role}
            </span>
          </div>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: isMobile ? '16px' : '20px',
          width: '100%'
        }}>
          {[
            { label: 'Full Name', value: adminProfile.name, type: 'text' },
            { label: 'Email Address', value: adminProfile.email, type: 'email' },
            { label: 'Phone Number', value: adminProfile.phone, type: 'tel' },
            { label: 'Role', value: 'super_admin', type: 'select' }
          ].map((field, index) => (
            <div key={index}>
              <label style={{display: 'block', fontSize: '14px', fontWeight: '600', color: '#000000', marginBottom: '8px'}}>
                {field.label}
              </label>
              {field.type === 'select' ? (
                <select value={field.value} style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '14px',
                  backgroundColor: '#ffffff',
                  color: '#000000',
                  boxSizing: 'border-box'
                }}>
                  <option value="super_admin">Super Administrator</option>
                  <option value="admin">Administrator</option>
                  <option value="manager">Manager</option>
                </select>
              ) : (
                <input 
                  type={field.type} 
                  value={field.value} 
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '14px',
                    backgroundColor: '#ffffff',
                    color: '#000000',
                    boxSizing: 'border-box'
                  }} 
                />
              )}
            </div>
          ))}
        </div>

        <div style={{
          display: 'flex',
          gap: '12px',
          marginTop: '24px',
          flexDirection: isMobile ? 'column' : 'row'
        }}>
          <button style={{
            padding: '10px 16px',
            backgroundColor: '#ff3b30',
            color: '#ffffff',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            flex: isMobile ? '1' : 'none'
          }}>
            Update Profile
          </button>
          <button style={{
            padding: '10px 16px',
            backgroundColor: '#f7fafc',
            color: '#000000',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            flex: isMobile ? '1' : 'none'
          }}>
            Change Password
          </button>
        </div>
      </div>
    </div>
  );

  const renderUserManagementContent = () => <UserManagement />;

  // Sub-menu content
  const renderSubMenuContent = () => {
    if (!currentMenuItem || !currentMenuItem.subItems) return null;

    return (
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: isMobile ? '16px' : '20px',
        width: '100%'
      }}>
        {currentMenuItem.subItems.map((subItem) => (
          <div key={subItem.id} style={{
            backgroundColor: '#fff',
            padding: isMobile ? '16px' : '20px',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            border: '1px solid #e2e8f0'
          }}>
            <div style={{display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px'}}>
              <div style={{
                fontSize: isMobile ? '20px' : '24px',
                width: isMobile ? '40px' : '48px',
                height: isMobile ? '40px' : '48px',
                backgroundColor: '#fff5f5',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid #ff3b30'
              }}>
                {subItem.icon}
              </div>
              <div style={{flex: 1, minWidth: 0}}>
                <h3 style={{
                  color: '#1a202c',
                  fontSize: isMobile ? '14px' : '16px',
                  fontWeight: '600',
                  margin: 0
                }}>
                  {subItem.label}
                </h3>
                <p style={{
                  color: '#718096',
                  fontSize: '12px',
                  margin: '4px 0 0 0',
                  fontWeight: '500'
                }}>
                  {subItem.count}
                </p>
              </div>
            </div>
            <p style={{
              color: '#4a5568',
              fontSize: isMobile ? '13px' : '14px',
              margin: 0,
              lineHeight: '1.4'
            }}>
              {subItem.description}
            </p>
          </div>
        ))}
      </div>
    );
  };

  // Admin profile component for header
  const AdminProfileHeader = () => (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '6px 12px',
      backgroundColor: '#f7fafc',
      borderRadius: '8px',
      cursor: 'pointer',
      position: 'relative'
    }} onClick={() => setShowProfileDropdown(!showProfileDropdown)}>
      <div style={{
        width: isMobile ? '32px' : '36px',
        height: isMobile ? '32px' : '36px',
        background: 'linear-gradient(135deg, #667eea, #764ba2)',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: isMobile ? '12px' : '14px',
        color: '#fff',
        fontWeight: 'bold'
      }}>
        {adminProfile.avatar}
      </div>
      {!isMobile && (
        <div>
          <p style={{fontSize: '14px', fontWeight: '600', color: '#1a202c', margin: 0}}>
            {adminProfile.name}
          </p>
          <p style={{fontSize: '12px', color: '#718096', margin: 0}}>
            {adminProfile.role}
          </p>
        </div>
      )}
      
      {/* Profile Dropdown */}
      {showProfileDropdown && (
        <div style={{
          position: 'absolute',
          top: '100%',
          right: 0,
          marginTop: '8px',
          backgroundColor: '#fff',
          borderRadius: '8px',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1)',
          border: '1px solid #e2e8f0',
          minWidth: isMobile ? '160px' : '180px',
          zIndex: 1001
        }}>
          <div style={{padding: '8px 0'}}>
            <button
              onClick={handleProfile}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: 'none',
                background: 'none',
                textAlign: 'left',
                cursor: 'pointer',
                fontSize: '14px',
                color: '#1a202c',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <span>👤</span>
              Profile Settings
            </button>
            <hr style={{margin: '6px 0', border: 'none', borderTop: '1px solid #e2e8f0'}} />
            <button
              onClick={handleLogout}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: 'none',
                background: 'none',
                textAlign: 'left',
                cursor: 'pointer',
                fontSize: '14px',
                color: '#ff3b30',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <span>🚪</span>
              Logout
            </button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      display: 'flex',
      backgroundColor: '#f8f9fa',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      overflow: 'hidden'
    }}>
      {/* Mobile Overlay */}
      {isMobile && isExpanded && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 998
          }}
          onClick={() => setIsExpanded(false)}
        />
      )}

      {/* Sidebar */}
      <div style={{
        backgroundColor: '#fff',
        boxShadow: isMobile && isExpanded ? '2px 0 8px rgba(0, 0, 0, 0.15)' : 'none',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        position: isMobile ? 'fixed' : 'relative',
        left: isMobile ? (isExpanded ? 0 : '-280px') : 0,
        top: 0,
        zIndex: 999,
        width: isExpanded ? (isMobile ? '280px' : '280px') : isMobile ? '0' : '80px',
        borderRight: '1px solid #e2e8f0',
        transition: 'all 0.3s ease',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: isMobile ? '16px' : '16px',
          borderBottom: '1px solid #e2e8f0',
          flexShrink: 0,
          display: isExpanded ? 'block' : 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: isExpanded ? 'auto' : '60px'
        }}>
          {isExpanded ? (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '16px'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
              <div style={{
width: isMobile ? '48px' : '56px', // Increased to 48px/56px
  height: isMobile ? '48px' : '56px', // Increased to 48px/56px
  borderRadius: '10px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  overflow: 'hidden'
}}>
                  <img 
                    src="/src/assets/logo.png" 
                    alt="VTU Logo"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain'
                    }}
                  />
                </div>
                <div>
                  <h1 style={{fontSize: isMobile ? '16px' : '18px', fontWeight: '700', color: 'red', margin: 0}}>
                    Connectpay
                  </h1>
                  <p style={{fontSize: '12px', color: 'black', margin: 0}}>Control Panel</p>
                </div>
              </div>

              <button
                style={{
                  padding: '6px',
                  border: 'none',
                  background: '#f7fafc',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  color: '#718096',
                  width: '28px',
                  height: '28px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                onClick={toggleSidebar}
              >
                {isExpanded ? '«' : '»'}
              </button>
            </div>
          ) : (
            <button
              style={{
                padding: '8px',
                border: 'none',
                background: 'transparent',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '20px',
                color: '#718096'
              }}
              onClick={toggleSidebar}
            >
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden'
              }}>
                <img 
                  src="/src/assets/logo.png" 
                  alt="VTU Logo"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain'
                  }}
                />
              </div>
            </button>
          )}

          {/* Search Bar */}
          {isExpanded && (
            <div style={{position: 'relative'}}>
              <div style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#718096',
                fontSize: '14px'
              }}>🔍</div>
              <input
                type="text"
                placeholder="Search menu items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px 10px 36px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '14px',
                  backgroundColor: '#f7fafc',
                  outline: 'none',
                  boxSizing: 'border-box',
                  color: '#000000'
                }}
              />
              {searchQuery && (
                <button
                  onClick={clearSearch}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#718096',
                    fontSize: '14px'
                  }}
                >
                  ✕
                </button>
              )}
            </div>
          )}
        </div>

        {/* Menu Items */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: isExpanded ? '12px 0' : '8px 0'
        }}>
          <nav>
            {filteredMenuItems.map((item) => (
              <div
                key={item.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: isExpanded ? 'space-between' : 'center',
                  padding: isExpanded ? '10px 16px' : '10px 0',
                  margin: isExpanded ? '0 8px 6px 8px' : '0 12px 6px 12px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  color: activeMenu === item.id ? '#fff' : '#1a202c',
                  backgroundColor: activeMenu === item.id ? '#ff3b30' : 'transparent',
                  minHeight: '44px'
                }}
                onClick={() => handleMenuClick(item.id)}
                title={!isExpanded ? item.label : ''}
              >
                {isExpanded ? (
                  <>
                    <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
                      <span style={{fontSize: '16px', width: '20px', textAlign: 'center'}}>
                        {item.icon}
                      </span>
                      <span style={{fontSize: '14px', fontWeight: '600'}}>
                        {item.label}
                      </span>
                    </div>

                    {item.notifications > 0 && (
                      <span style={{
                        backgroundColor: activeMenu === item.id ? 'rgba(255, 255, 255, 0.2)' : '#ff3b30',
                        color: '#fff',
                        padding: '2px 6px',
                        borderRadius: '10px',
                        fontSize: '10px',
                        fontWeight: '700',
                        minWidth: '18px',
                        textAlign: 'center'
                      }}>
                        {item.notifications}
                      </span>
                    )}
                  </>
                ) : (
                  <div style={{
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <span style={{fontSize: '18px'}}>
                      {item.icon}
                    </span>
                    {item.notifications > 0 && (
                      <span style={{
                        position: 'absolute',
                        top: '-4px',
                        right: '-4px',
                        backgroundColor: '#ff3b30',
                        color: '#fff',
                        padding: '1px 5px',
                        borderRadius: '8px',
                        fontSize: '9px',
                        fontWeight: '700',
                        minWidth: '14px',
                        textAlign: 'center',
                        lineHeight: '1'
                      }}>
                        {item.notifications}
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </nav>

          {/* No search results */}
          {searchQuery && filteredMenuItems.length === 0 && isExpanded && (
            <div style={{
              textAlign: 'center',
              padding: '20px',
              color: '#718096',
              fontSize: '14px'
            }}>
              <div style={{fontSize: '24px', marginBottom: '8px'}}>🔍</div>
              No items found for "{searchQuery}"
              <br />
              <button
                onClick={clearSearch}
                style={{
                  marginTop: '8px',
                  background: 'none',
                  border: 'none',
                  color: '#ff3b30',
                  cursor: 'pointer',
                  fontSize: '12px',
                  textDecoration: 'underline'
                }}
              >
                Clear search
              </button>
            </div>
          )}
        </div>

        {/* Simple footer without admin profile */}
        {isExpanded && (
          <div style={{
            padding: isMobile ? '12px 16px' : '12px 16px',
            borderTop: '1px solid #e2e8f0',
            backgroundColor: '#f7fafc',
            flexShrink: 0,
            textAlign: 'center'
          }}>
            <p style={{fontSize: '12px', color: '#718096', margin: 0}}>
              VTU Admin Panel v1.0
            </p>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div style={{
        flex: 1,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#f8f9fa',
        overflow: 'hidden'
      }}>
        {/* Mobile Header Bar */}
        {isMobile && (
          <div style={{
            backgroundColor: '#fff',
            padding: '10px 14px',
            borderBottom: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0
          }}>
            <button
              onClick={toggleSidebar}
              style={{
                padding: '6px',
                border: 'none',
                background: '#f7fafc',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                color: '#718096'
              }}
            >
              ☰
            </button>
            <div>
              <h1 style={{fontSize: '14px', fontWeight: '700', color: '#ff3b30', margin: 0}}>
                {currentMenuItem ? currentMenuItem.label : 'Dashboard'}
              </h1>
            </div>
            <AdminProfileHeader />
          </div>
        )}

        {/* Content Header */}
        {!isMobile && (
          <div style={{
            backgroundColor: '#fff',
            padding: '7px 30px',
            borderBottom: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            flexShrink: 0
          }}>
            <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px'}}>
              <div>
                <h1 style={{
                  fontSize: '20px',
                  fontWeight: '700', 
                  color: '#ff3b30',
                  margin: 0
                }}>
                  {currentMenuItem ? currentMenuItem.label : 'Dashboard'}
                </h1>
                <p style={{
                  fontSize: '13px',
                  color: '#718096', 
                  margin: '2px 0 0 0'
                }}>
                  {currentMenuItem && currentMenuItem.subItems 
                    ? `Manage ${currentMenuItem.label.toLowerCase()} settings and view analytics`
                    : activeMenu === 'profile'
                    ? 'Manage your account settings and preferences'
                    : 'Welcome back! Here\'s your system overview'
                  }
                </p>
              </div>
              <AdminProfileHeader />
            </div>
          </div>
        )}

        {/* Content Body */}
        <div style={{
          flex: 1,
          padding: isMobile ? '16px' : '24px',
          overflowY: 'auto',
          overflowX: 'hidden'
        }}>
          {activeMenu === 'dashboard' 
            ? renderDashboardContent() 
            : activeMenu === 'profile' 
            ? renderProfileContent()
            : activeMenu === 'users' || activeMenu === 'all-users'
            ? renderUserManagementContent()
            : activeMenu === 'transactions' || 
              activeMenu === 'all-transactions' || 
              activeMenu === 'failed-transactions' || 
              activeMenu === 'pending-transactions' || 
              activeMenu === 'refunds'
            ? <TransactionManagement />
            : activeMenu === 'services' || 
              activeMenu === 'airtime' || 
              activeMenu === 'data' || 
              activeMenu === 'cable-tv' || 
              activeMenu === 'electricity' || 
              activeMenu === 'service-pricing' || 
              activeMenu === 'service-status'
            ? <ServiceManagement />
            : activeMenu === 'financial' ||
              activeMenu === 'revenue' ||
              activeMenu === 'commission' ||
              activeMenu === 'wallet' ||
              activeMenu === 'settlements' ||
              activeMenu === 'tax-reports'
            ? <FinancialManagement />
            : activeMenu === 'system' || 
              activeMenu === 'api-config' || 
              activeMenu === 'system-health' || 
              activeMenu === 'error-logs'
            ? <SystemManagement />
            : activeMenu === 'admin' ||
              activeMenu === 'admin-users' ||
              activeMenu === 'permissions' ||
              activeMenu === 'admin-logs'
            ? <AdminManagement />
            : activeMenu === 'notifications'
            ? <NotificationManagement />
            : activeMenu.startsWith('ticket-')
            ? <SupportTicketDetail ticketId={activeMenu.replace('ticket-', '')} />
            : renderSubMenuContent()
          }
        </div>
      </div>

      {/* Backdrop for dropdown */}
      {showProfileDropdown && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 999
          }}
          onClick={() => setShowProfileDropdown(false)}
        />
      )}
    </div>
  );
};

export default AdminDashboard;