import React, { useContext, useEffect, useState, useCallback } from 'react';
import FundWallet from './fund-wallet'; 
import TransactionDetails from './TransactionDetails';
import { Share } from 'react-native';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Alert,
  Animated,
  Dimensions,
  Modal,
  RefreshControl,
  AppState,
  Platform,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../contexts/AuthContext';
import { useRouter } from 'expo-router';

const SCREEN_WIDTH = Dimensions.get('window').width;

const API_CONFIG = {
  BASE_URL: Platform.OS === 'web' 
    ? `${process.env.EXPO_PUBLIC_API_URL_WEB}/api`
    : `${process.env.EXPO_PUBLIC_API_URL}/api`,
  ENDPOINTS: {
    PROFILE: '/auth/profile',
    BALANCE: '/balance',
    TRANSACTIONS: '/transactions',
  }
};

// Enhanced Sidebar Component
const ImprovedSidebar = ({ 
  sidebarAnim, 
  user, 
  isLoading, 
  activeMenu, 
  onMenuPress, 
  onProfilePress, 
  onClose 
}) => {
  const menuItems = [
    { name: 'Dashboard', icon: 'home', route: '/dashboard', category: 'main' },
    { name: 'Profile', icon: 'person', route: '/profile', category: 'main' },
    { name: 'Buy Airtime', icon: 'call', route: '/buy-airtime', category: 'services' },
    { name: 'Buy Data', icon: 'wifi', route: '/buy-data', category: 'services' },
    { name: 'Electricity', icon: 'flash', route: '/electricity', category: 'services' },
    { name: 'Cable TV', icon: 'tv', route: '/cable-tv', category: 'services' },
    { name: 'Internet', icon: 'globe', route: '/internet', category: 'services' },
    { name: 'Transfer', icon: 'send', route: '/transfer', category: 'financial' },
   { name: 'Transaction History', icon: 'receipt', route: '/transaction-history', category: 'financial' },
    { name: 'Settings', icon: 'settings', route: '/settings', category: 'account' },
 { name: 'Help & Support', icon: 'help-circle', route: '/need-help', category: 'account' },
    { name: 'Logout', icon: 'log-out', category: 'account' },
  ];

  const getCategoryTitle = (category) => {
    switch (category) {
      case 'main': return 'Overview';
      case 'services': return 'Services';
      case 'financial': return 'Financial';
      case 'account': return 'Account';
      default: return '';
    }
  };

  const groupedMenuItems = menuItems.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {});

  const getMenuItemStyle = (item) => {
    if (item.name === 'Logout') {
      return [sidebarStyles.sidebarItem, sidebarStyles.logoutItem];
    }
    if (activeMenu === item.name) {
      return [sidebarStyles.sidebarItem, sidebarStyles.activeSidebarItem];
    }
    return sidebarStyles.sidebarItem;
  };

  const getTextStyle = (item) => {
    if (item.name === 'Logout') {
      return [sidebarStyles.sidebarText, sidebarStyles.logoutText];
    }
    if (activeMenu === item.name) {
      return [sidebarStyles.sidebarText, sidebarStyles.activeText];
    }
    return sidebarStyles.sidebarText;
  };

  const getIconColor = (item) => {
    if (item.name === 'Logout') return '#fff';
    if (activeMenu === item.name) return '#fff';
    return '#666';
  };

  return (
    <Animated.View style={[sidebarStyles.sidebar, { left: sidebarAnim }]}>
      <SafeAreaView style={sidebarStyles.sidebarContent}>
        {/* Header */}
        <View style={sidebarStyles.sidebarHeader}>
          <TouchableOpacity style={sidebarStyles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={24} color="#666" />
          </TouchableOpacity>
        </View>

        {/* Profile Section */}
        <TouchableOpacity style={sidebarStyles.profileSection} onPress={onProfilePress}>
          <View style={sidebarStyles.profileContainer}>
            <View style={sidebarStyles.profileAvatar}>
              {user?.name ? (
                <Text style={sidebarStyles.avatarText}>
                  {user.name.charAt(0).toUpperCase()}
                </Text>
              ) : (
                <Ionicons name="person" size={24} color="#ff2b2b" />
              )}
            </View>
            <View style={sidebarStyles.profileInfo}>
              <Text style={sidebarStyles.profileName}>
                {user?.name || (isLoading ? 'Loading...' : 'User')}
              </Text>
              <Text style={sidebarStyles.profileEmail}>
                {user?.email || (isLoading ? 'Loading...' : 'user@example.com')}
              </Text>
              <View style={sidebarStyles.profileBadge}>
                <Text style={sidebarStyles.profileBadgeText}>View Profile</Text>
                <Ionicons name="chevron-forward" size={14} color="#ff2b2b" />
              </View>
            </View>
          </View>
        </TouchableOpacity>

        {/* Menu Items */}
        <ScrollView style={sidebarStyles.menuContainer}>
          {Object.entries(groupedMenuItems).map(([category, items]) => (
            <View key={category} style={sidebarStyles.menuCategory}>
              <Text style={sidebarStyles.categoryTitle}>{getCategoryTitle(category)}</Text>
              
              {items.map((item) => (
                <TouchableOpacity
                  key={item.name}
                  style={getMenuItemStyle(item)}
                  onPress={() => onMenuPress(item)}
                  activeOpacity={0.7}
                >
                  <View style={sidebarStyles.menuItemContent}>
                    <View style={[
                      sidebarStyles.iconContainer,
                      activeMenu === item.name && sidebarStyles.activeIconContainer,
                      item.name === 'Logout' && sidebarStyles.logoutIconContainer
                    ]}>
                      <Ionicons
                        name={item.icon}
                        size={20}
                        color={getIconColor(item)}
                      />
                    </View>
                    <Text style={getTextStyle(item)}>{item.name}</Text>
                  </View>
                  
                  {activeMenu === item.name && item.name !== 'Logout' && (
                    <View style={sidebarStyles.activeIndicator} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          ))}
        </ScrollView>

        {/* Footer */}
        <View style={sidebarStyles.sidebarFooter}>
          <Text style={sidebarStyles.footerText}>Version 1.0.0</Text>
          <Text style={sidebarStyles.footerText}>© 2025 Connectpay</Text>
        </View>
      </SafeAreaView>
    </Animated.View>
  );
};

export default function Dashboard() {
  const { logout, token, isLoggedIn, user: contextUser, balance: contextBalance } = useContext(AuthContext);
  const router = useRouter();

  // Enhanced state management
  const [user, setUser] = useState(null);
  const [accountBalance, setAccountBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeMenu, setActiveMenu] = useState('Dashboard');
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [balanceVisible, setBalanceVisible] = useState(true);
  const [showFundWallet, setShowFundWallet] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [showTransactionDetails, setShowTransactionDetails] = useState(false);
  const [showAllTransactions, setShowAllTransactions] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const sidebarAnim = useState(new Animated.Value(-SCREEN_WIDTH * 0.85))[0];

  // Helper function for API calls
  const makeApiCall = async (endpoint, fallbackValue = null) => {
    try {
      if (!token) {
        console.warn(`No token available for ${endpoint}`);
        return fallbackValue;
      }

      console.log(`Making API call to: ${API_CONFIG.BASE_URL}${endpoint}`);
      
      const response = await fetch(`${API_CONFIG.BASE_URL}${endpoint}`, {
        method: 'GET',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log(`API Response status for ${endpoint}:`, response.status);

      if (!response.ok) {
        console.error(`API call failed for ${endpoint}:`, response.status);
        return fallbackValue;
      }

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await response.json();
        console.log(`Successfully received data from ${endpoint}`);
        return data;
      } else {
        console.warn(`${endpoint} returned non-JSON response`);
        return fallbackValue;
      }
    } catch (error) {
      console.error(`${endpoint} API error:`, error.message);
      return fallbackValue;
    }
  };

  const fetchBalanceOnly = async () => {
    try {
      console.log('=== BALANCE FETCH START ===');
      const balanceResponse = await makeApiCall(API_CONFIG.ENDPOINTS.BALANCE, null);
      
      if (balanceResponse && balanceResponse.success && balanceResponse.balance) {
        let balance = 0;
        
        if (balanceResponse.balance.amount !== undefined) {
          balance = balanceResponse.balance.amount;
        } else if (typeof balanceResponse.balance === 'number') {
          balance = balanceResponse.balance;
        }
        
        const finalBalance = parseFloat(balance);
        
        if (!isNaN(finalBalance) && finalBalance >= 0) {
          console.log('Setting balance to:', finalBalance);
          setAccountBalance(finalBalance);
        }
      }
    } catch (error) {
      console.error('Balance fetch error:', error);
    }
  };

  // Enhanced transaction formatting
  const formatTransactionDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  const getTransactionIcon = (transaction) => {
    switch (transaction.category) {
      case 'funding':
        return 'wallet-outline';
      case 'betting':
        return 'football-outline';
      case 'transfer':
        return transaction.type === 'transfer_out' ? 'send-outline' : 'download-outline';
      case 'payment':
        return 'card-outline';
      case 'withdrawal':
        return 'cash-outline';
      default:
        return transaction.type === 'credit' ? 'add-circle-outline' : 'remove-circle-outline';
    }
  };

  const getStatusColor = (transaction) => {
    if (transaction.status === 'failed') return '#dc3545';
    if (transaction.status === 'pending') return '#ffc107';
    if (transaction.status === 'completed') return '#28a745';
    return '#6c757d';
  };

  const getTransactionColor = (transaction) => {
    if (transaction.status === 'failed') return '#dc3545';
    
    switch (transaction.type) {
      case 'credit':
      case 'transfer_in':
        return '#28a745';
      case 'debit':
      case 'transfer_out':
        return '#ff2b2b';
      default:
        return '#6c757d';
    }
  };

  const fetchTransactionsOnly = async () => {
    try {
      setIsLoading(true);
      
      const transactionsResponse = await makeApiCall(API_CONFIG.ENDPOINTS.TRANSACTIONS, { success: false, transactions: [] });
      
      if (transactionsResponse?.success) {
        const txData = transactionsResponse.transactions || [];
        const formattedTransactions = txData.map((tx, index) => ({
          _id: tx._id || tx.id || `tx_${Date.now()}_${index}`,
          type: tx.type || 'credit',
          amount: parseFloat(tx.amount || 0),
          date: tx.createdAt || tx.date || new Date().toISOString(),
          createdAt: tx.createdAt || tx.date || new Date().toISOString(),
          status: tx.status || 'completed',
          description: tx.description || `${tx.type || 'Transaction'} transaction`,
          reference: tx.reference || `REF_${tx._id || Date.now()}_${index}`,
          category: tx.category || 'general',
          previousBalance: tx.previousBalance || 0,
          newBalance: tx.newBalance || 0,
          gateway: tx.gateway || {},
          metadata: tx.metadata || {}
        }));
        
        setTransactions(formattedTransactions);
      } else {
        setTransactions([]);
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
      setTransactions([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (contextUser) {
      setUser({
        name: contextUser.name || 'User',
        email: contextUser.email || 'user@example.com',
        phone: contextUser.phone,
        username: contextUser.username,
      });
    }
    
    if (contextBalance !== undefined && contextBalance !== null) {
      let finalBalance = 0;
      
      if (typeof contextBalance === 'number') {
        finalBalance = contextBalance;
      } else if (typeof contextBalance === 'object') {
        finalBalance = contextBalance.amount || 
                       contextBalance.balance || 
                       contextBalance.current || 
                       contextBalance.value || 
                       Object.values(contextBalance).find(val => typeof val === 'number') || 0;
      } else {
        finalBalance = parseFloat(contextBalance) || 0;
      }
      
      setAccountBalance(finalBalance);
    }
    
    fetchTransactionsOnly();
  }, [token, contextUser, contextBalance]);

  useEffect(() => {
    let lastRefresh = 0;
    const REFRESH_COOLDOWN = 30000;
    
    const handleAppStateChange = (nextAppState) => {
      if (nextAppState === 'active') {
        const now = Date.now();
        if (now - lastRefresh > REFRESH_COOLDOWN) {
          console.log('App became active - refreshing balance');
          lastRefresh = now;
          fetchBalanceOnly();
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    return () => {
      subscription?.remove();
    };
  }, []);

  const handleRefresh = async () => {
    console.log('Manual refresh triggered');
    setIsRefreshing(true);
    
    try {
      await Promise.all([
        fetchBalanceOnly(),
        fetchTransactionsOnly()
      ]);
    } catch (error) {
      console.error('Refresh failed:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleTransactionPress = (transaction) => {
    setSelectedTransaction(transaction);
    setShowTransactionDetails(true);
  };

  const navigateToProfile = () => {
    if (sidebarOpen) toggleSidebar();
    const profileRoutes = ['/profile', '/(app)/profile', '/user-profile'];
    for (const route of profileRoutes) {
      try {
        router.push(route);
        return;
      } catch (error) {
        console.log(`Failed to navigate to ${route}:`, error);
      }
    }
    Alert.alert('Navigation Error', 'Could not open profile. Please check if profile screen exists.');
  };

  const handleLogout = async () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = async () => {
    setShowLogoutConfirm(false);

    try {
      await logout();
      const loginRoutes = ['/', '/login', '/(auth)/login', '/signin'];

      for (const route of loginRoutes) {
        try {
          router.replace(route);
          return;
        } catch (error) {
          console.log(`Failed to navigate to ${route}:`, error);
        }
      }
    } catch (error) {
      console.error('Logout error:', error);
      Alert.alert('Logout Error', 'An error occurred during logout. Please restart the app.');
    }
  };

  const toggleSidebar = () => {
    Animated.timing(sidebarAnim, {
      toValue: sidebarOpen ? -SCREEN_WIDTH * 0.85 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
    setSidebarOpen(!sidebarOpen);
  };

  const handleMenuPress = (item) => {
    if (item.name === 'Logout') {
      toggleSidebar();
      setTimeout(() => {
        handleLogout();
      }, 100);
    } else {
      setActiveMenu(item.name);
      if (item.route) router.push(item.route);
      toggleSidebar();
    }
  };

  const handleQuickAction = (route) => {
    router.push(route);
  };

  const handleFundWallet = () => {
    setShowFundWallet(true);
  };

  const toggleBalanceVisibility = () => {
    setBalanceVisible(!balanceVisible);
  };

  const handleFundWalletSuccess = async () => {
    setShowFundWallet(false);
    setTimeout(async () => {
      await fetchBalanceOnly();
      await fetchTransactionsOnly();
    }, 2000);
  };

  const getFilteredTransaction = (transaction) => {
    const {
      previousBalance,
      newBalance,
      metadata,
      ...filteredTransaction
    } = transaction;

    const filteredMetadata = metadata ? {
      source: metadata.source,
      notes: metadata.notes,
    } : {};

    return {
      ...filteredTransaction,
      metadata: filteredMetadata,
      previousBalance: undefined,
      newBalance: undefined,
    };
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#ff2b2b" />
      
      {/* Improved Sidebar */}
      <ImprovedSidebar
        sidebarAnim={sidebarAnim}
        user={user}
        isLoading={isLoading}
        activeMenu={activeMenu}
        onMenuPress={handleMenuPress}
        onProfilePress={navigateToProfile}
        onClose={toggleSidebar}
      />

      {/* Overlay for sidebar */}
      {sidebarOpen && (
        <TouchableOpacity 
          style={styles.overlay} 
          activeOpacity={1} 
          onPress={toggleSidebar}
        />
      )}

      {/* Header Card */}
      <View style={styles.headerCard}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={toggleSidebar} style={styles.menuButton}>
            <Ionicons name="menu" size={28} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity onPress={navigateToProfile} style={styles.headerProfileButton}>
            <Text style={styles.greeting}>Hello, {user?.name?.split(' ')[0] || 'User'}</Text>
            <Ionicons name="chevron-forward" size={16} color="#fff" style={{ marginLeft: 5 }} />
          </TouchableOpacity>
        </View>

        <View style={styles.balanceSection}>
          <View style={styles.balanceInfo}>
            <View style={styles.balanceTitleRow}>
              <Text style={styles.balanceTitle}>Wallet Balance</Text>
              <TouchableOpacity onPress={toggleBalanceVisibility} style={styles.balanceToggle}>
                <Ionicons 
                  name={balanceVisible ? "eye" : "eye-off"} 
                  size={20} 
                  color="#fff" 
                />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleRefresh} style={styles.refreshButton} disabled={isRefreshing}>
                <Ionicons 
                  name={isRefreshing ? "reload" : "refresh"} 
                  size={18} 
                  color="#fff" 
                />
              </TouchableOpacity>
            </View>
            <Text style={styles.balanceAmount}>
              {balanceVisible ? `₦${accountBalance.toLocaleString()}` : '₦****'}
            </Text>
          </View>
          <TouchableOpacity style={styles.fundButton} onPress={handleFundWallet}>
            <Ionicons name="add-circle" size={20} color="#fff" />
            <Text style={styles.fundButtonText}>Fund Wallet</Text>
          </TouchableOpacity>
        </View>
      </View>


      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={['#ff2b2b']}
            tintColor='#ff2b2b'
            title="Pull to refresh..."
          />
        }
      >
        <Text style={styles.servicesHeader}>What would you like to do?</Text>

        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleQuickAction('/buy-airtime')}
          >
            <Ionicons name="call" size={20} color="#ff2b2b" />
            <Text style={styles.actionText}>Buy Airtime</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleQuickAction('/buy-data')}
          >
            <Ionicons name="wifi" size={20} color="#ff2b2b" />
            <Text style={styles.actionText}>Buy Data</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleQuickAction('/electricity')}
          >
            <Ionicons name="flash" size={20} color="#ff2b2b" />
            <Text style={styles.actionText}>Electricity</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleQuickAction('/cable-tv')}
          >
            <Ionicons name="tv" size={20} color="#ff2b2b" />
            <Text style={styles.actionText}>Cable TV</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleQuickAction('/print-recharge')}
          >
            <Ionicons name="print" size={20} color="#ff2b2b" />
            <Text style={styles.actionText}>Print Recharge</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleQuickAction('/fund-betting')}
          >
            <Ionicons name="football" size={20} color="#ff2b2b" />
            <Text style={styles.actionText}>Fund Betting</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleQuickAction('/internet')}
          >
            <Ionicons name="globe" size={20} color="#ff2b2b" />
            <Text style={styles.actionText}>Internet</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleQuickAction('/education')}
          >
            <Ionicons name="school" size={20} color="#ff2b2b" />
            <Text style={styles.actionText}>Education</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleQuickAction('/transfer')}
          >
            <Ionicons name="send" size={20} color="#ff2b2b" />
            <Text style={styles.actionText}>Transfer</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.needHelpContainer}>
          <TouchableOpacity
            style={styles.needHelpButton}
            onPress={() => handleQuickAction('/need-help')}
          >
            <Ionicons name="help-circle" size={20} color="#fff" />
            <Text style={styles.needHelpText}>Need Help</Text>
          </TouchableOpacity>
        </View>

        {/* Transaction Section */}
        <View style={styles.transactionsContainer}>
          <View style={styles.transactionsHeader}>
            <Text style={styles.transactionsTitle}>Recent Transactions</Text>
            {transactions.length > 3 && (
              <TouchableOpacity 
                style={styles.viewAllButton}
                onPress={() => router.push('/transaction-history')}
              >
                <Text style={styles.viewAllText}>View All</Text>
                <Ionicons name="chevron-forward" size={14} color="#ff2b2b" />
              </TouchableOpacity>
            )}
          </View>
          
          {transactions.length === 0 ? (
            <View style={styles.noTransactionsContainer}>
              <Ionicons name="receipt" size={48} color="#ccc" />
              <Text style={styles.noTransactions}>
                {isLoading ? 'Loading transactions...' : 'No recent transactions'}
              </Text>
              <Text style={styles.noTransactionsSubtext}>
                Your transaction history will appear here
              </Text>
            </View>
          ) : (
            <View style={styles.transactionsList}>
              {transactions.slice(0, showAllTransactions ? transactions.length : 5).map((tx) => (
                <TouchableOpacity
                  key={tx._id}
                  style={styles.transactionItem}
                  onPress={() => handleTransactionPress(tx)}
                  activeOpacity={0.7}
                >
                  <View style={styles.transactionLeft}>
                    <View style={[styles.transactionIconContainer, { backgroundColor: `${getTransactionColor(tx)}15` }]}>
                      <Ionicons 
                        name={getTransactionIcon(tx)} 
                        size={20} 
                        color={getTransactionColor(tx)} 
                      />
                    </View>
                    <View style={styles.transactionInfo}>
                      <Text style={styles.transactionDescription}>
                        {tx.description || `${tx.type} transaction`}
                      </Text>
                      <Text style={styles.transactionDate}>
                        {formatTransactionDate(tx.createdAt)}
                      </Text>
                      <View style={styles.transactionMeta}>
                        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(tx) }]}>
                          <Text style={styles.statusText}>{tx.status}</Text>
                        </View>
                        <Text style={styles.transactionReference}>#{tx.reference.slice(-6)}</Text>
                      </View>
                    </View>
                  </View>
                  <View style={styles.transactionRight}>
                    <Text style={[styles.transactionAmount, { color: getTransactionColor(tx) }]}>
                      {tx.type === 'credit' || tx.type === 'transfer_in' ? '+' : '-'}₦{tx.amount.toLocaleString()}
                    </Text>
                    <Ionicons name="chevron-forward" size={16} color="#ccc" />
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Transaction Details Modal */}
      <Modal
        visible={showTransactionDetails}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowTransactionDetails(false)}
      >
        {selectedTransaction && (
          <View style={{ flex: 1 }}>
            <TransactionDetails
              transaction={getFilteredTransaction(selectedTransaction)}
              onClose={() => setShowTransactionDetails(false)}
              userInfo={null}
            />
            <View style={{ padding: 20 }}>
              <TouchableOpacity 
                style={{
                  backgroundColor: '#ff2b2b',
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingVertical: 12,
                  borderRadius: 10,
                  marginBottom: 10,
                }}
                onPress={() => {
                  const formatDate = (dateString) => {
                    return new Date(dateString).toLocaleString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    });
                  };

                  const getStatusIcon = () => {
                    switch (selectedTransaction.status.toLowerCase()) {
                      case 'completed': return '✅';
                      case 'pending': return '⏳';
                      case 'failed': return '❌';
                      default: return '📋';
                    }
                  };

                  const formattedReceiptContent = `
╔══════════════════════════════════════════════════════╗
║                  TRANSACTION RECEIPT                 ║
╚══════════════════════════════════════════════════════╝

🏦 YOUR APP NAME
📧 support@yourapp.com | 📞 +234-XXX-XXXX-XXX

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${getStatusIcon()} STATUS: ${selectedTransaction.status.toUpperCase()}

💰 TRANSACTION AMOUNT
${selectedTransaction.type === 'credit' ? '+ ₦' : '- ₦'}${selectedTransaction.amount.toLocaleString()}

📝 TRANSACTION TYPE: ${selectedTransaction.type.toUpperCase().replace('_', ' ')}
🏷️  CATEGORY: ${selectedTransaction.category.toUpperCase()}

${selectedTransaction.description ? `📋 DESCRIPTION: ${selectedTransaction.description}` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔍 TRANSACTION DETAILS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🆔 Reference ID: ${selectedTransaction.reference}
🔢 Transaction ID: #${selectedTransaction._id.slice(-8).toUpperCase()}
📅 Date: ${formatDate(selectedTransaction.createdAt)}

${selectedTransaction.gateway?.provider ? `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💳 PAYMENT GATEWAY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🏛️  Provider: ${selectedTransaction.gateway.provider.toUpperCase()}
${selectedTransaction.gateway.gatewayReference ? `🔗 Gateway Ref: ${selectedTransaction.gateway.gatewayReference}` : ''}
` : ''}

${selectedTransaction.metadata?.source || selectedTransaction.metadata?.notes ? `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ℹ️  ADDITIONAL INFORMATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${selectedTransaction.metadata?.source ? `📱 Source: ${selectedTransaction.metadata.source}` : ''}
${selectedTransaction.metadata?.notes ? `📝 Notes: ${selectedTransaction.metadata.notes}` : ''}
` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
👤 ACCOUNT INFORMATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

👤 Account Name: ${user?.name || 'N/A'}
📧 Email: ${user?.email || 'N/A'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🙏 Thank you for using our services!
📞 For support: support@yourapp.com
🌐 Visit: www.yourapp.com

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🕐 Generated: ${new Date().toLocaleString()}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          `.trim();

                  Share.share({
                    message: formattedReceiptContent,
                    title: `Receipt - ${selectedTransaction.reference}`,
                  }).then(() => {
                    Alert.alert('Success', 'Receipt shared successfully! You can save it to your device.');
                  }).catch((error) => {
                    console.error('Share error:', error);
                    Alert.alert('Share Error', 'Unable to share receipt. Please try again.');
                  });
                }}
              >
                <Ionicons name="download" size={20} color="#fff" />
                <Text style={{ color: '#fff', marginLeft: 8, fontWeight: '600' }}>
                  Share Receipt
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </Modal>

      {/* Logout Confirmation Modal */}
      <Modal
        visible={showLogoutConfirm}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowLogoutConfirm(false)}
      >
        <View style={styles.confirmationOverlay}>
          <View style={styles.confirmationModal}>
            <Text style={styles.confirmationTitle}>Logout Confirmation</Text>
            <Text style={styles.confirmationMessage}>Are you sure you want to logout?</Text>

            <View style={styles.confirmationButtons}>
              <TouchableOpacity 
                style={styles.cancelButton} 
                onPress={() => setShowLogoutConfirm(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.logoutConfirmButton} 
                onPress={confirmLogout}
              >
                <Text style={styles.logoutConfirmButtonText}>Logout</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

{/* Fund Wallet Modal */}
<Modal
  visible={showFundWallet}
  animationType="slide"
  presentationStyle="pageSheet"
  onRequestClose={() => setShowFundWallet(false)}
>
  <SafeAreaView style={{ flex: 1, backgroundColor: '#f8f9fa' }}>
    {/* Header */}
    <View style={{ 
      flexDirection: 'row', 
      alignItems: 'center', 
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 16,
      backgroundColor: '#fff',
      borderBottomWidth: 1,
      borderBottomColor: '#eee'
    }}>
      <TouchableOpacity onPress={() => setShowFundWallet(false)}>
        <Ionicons name="arrow-back" size={24} color="#333" />
      </TouchableOpacity>
      <Text style={{ fontSize: 18, fontWeight: '700', color: '#333' }}>Fund Wallet</Text>
      <View style={{ width: 24 }} />
    </View>
    
    <FundWallet 
      onClose={() => setShowFundWallet(false)}
      onSuccess={handleFundWalletSuccess}
      token={token}
      currentBalance={accountBalance}
    />
  </SafeAreaView>
</Modal>

    </SafeAreaView>
  );
}

// Sidebar Styles
const sidebarStyles = StyleSheet.create({
  sidebar: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: SCREEN_WIDTH * 0.85,
    backgroundColor: '#fff',
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 10,
  },

  sidebarContent: {
    flex: 1,
    paddingTop: Platform.OS === 'ios' ? 0 : StatusBar.currentHeight,
  },

  sidebarHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },

  closeButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
  },

  profileSection: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },

  profileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  profileAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#fff5f5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ff2b2b',
    marginRight: 15,
  },

  avatarText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ff2b2b',
  },

  profileInfo: {
    flex: 1,
  },

  profileName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 4,
  },

  profileEmail: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },

  profileBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: '#fff5f5',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ffe5e5',
  },

  profileBadgeText: {
    fontSize: 12,
    color: '#ff2b2b',
    fontWeight: '600',
    marginRight: 4,
  },

  menuContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },

  menuCategory: {
    marginBottom: 25,
  },

  categoryTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9ca3af',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 15,
    paddingHorizontal: 4,
  },

  sidebarItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 4,
    position: 'relative',
  },

  activeSidebarItem: {
    backgroundColor: '#ff2b2b',
    shadowColor: '#ff2b2b',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },

  logoutItem: {
    backgroundColor: '#dc2626',
    marginTop: 10,
    shadowColor: '#dc2626',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },

  menuItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },

  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    marginRight: 12,
  },

  activeIconContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },

  logoutIconContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },

  sidebarText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
    flex: 1,
  },

  activeText: {
    color: '#fff',
    fontWeight: '600',
  },

  logoutText: {
    color: '#fff',
    fontWeight: '600',
  },

  activeIndicator: {
    width: 4,
    height: 20,
    backgroundColor: '#fff',
    borderRadius: 2,
  },

  sidebarFooter: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: '#f5f5f5',
    alignItems: 'center',
  },

  footerText: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center',
    marginBottom: 2,
  },
});

// Main Dashboard Styles
const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#fafafa' 
  },

  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 5,
  },

  headerCard: {
    backgroundColor: '#ff2b2b',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 50 : 60,
    paddingBottom: 30,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 8,
  },

  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 25,
  },

  menuButton: {
    padding: 5,
    borderRadius: 8,
  },

  headerProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },

  greeting: { 
    fontSize: 16, 
    fontWeight: '600', 
    color: '#fff' 
  },

  balanceSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  balanceInfo: {
    flex: 1,
  },

  balanceTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },

  balanceTitle: { 
    color: '#fff', 
    fontSize: 16, 
    opacity: 0.9,
    marginRight: 10,
  },

  balanceToggle: {
    padding: 5,
    marginRight: 8,
  },

  refreshButton: {
    padding: 5,
  },

  balanceAmount: { 
    color: '#fff', 
    fontSize: 28, 
    fontWeight: '700' 
  },

  fundButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: -40,
    marginRight: -5,
  },

  fundButtonText: { 
    color: '#ff2b2b',
    marginLeft: -20,
    fontWeight: '600', 
    fontSize: 14,
    textAlign: 'center',
  },

  scrollContent: { 
    paddingHorizontal: 1, 
    paddingVertical: 20 
  },

  servicesHeader: { 
    fontSize: 20, 
    fontWeight: '700', 
    color: '#1f2937', 
    marginBottom: 20, 
    textAlign: 'center' 
  },

  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    marginBottom: 30,
  },

  actionButton: {
    backgroundColor: '#fff',
    width: '30%',
    borderRadius: 12,
    paddingVertical: 18,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },

  actionText: { 
    color: '#374151', 
    marginTop: 8, 
    fontWeight: '600', 
    fontSize: 12, 
    textAlign: 'center' 
  },

  needHelpContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },

  needHelpButton: {
    backgroundColor: '#ff2b2b',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 30,
    borderRadius: 25,
    shadowColor: '#ff2b2b',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },

  needHelpText: {
    color: '#fff',
    marginLeft: 10,
    fontWeight: '600',
    fontSize: 16,
  },

  transactionsContainer: { 
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 15,
     marginHorizontal: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },

  transactionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },

  transactionsTitle: { 
    fontSize: 18, 
    fontWeight: '700', 
    color: '#1f2937' 
  },

  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 10,
  },

  viewAllText: {
    color: '#ff2b2b',
    fontSize: 14,
    fontWeight: '600',
    marginRight: 4,
  },

  noTransactionsContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },

  noTransactions: { 
    color: '#6b7280', 
    fontSize: 16,
    marginTop: 15,
    fontWeight: '500',
  },

  noTransactionsSubtext: {
    color: '#9ca3af',
    fontSize: 14,
    marginTop: 5,
  },

  transactionsList: {
    marginTop: 10,
  },

  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 0,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },

  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },

  transactionIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },

  transactionInfo: {
    flex: 1,
    minWidth: 0,
  },

  transactionDescription: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
    flexShrink: 1,
  },

  transactionDate: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 6,
  },

  transactionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginRight: 8,
  },

  statusText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },

  transactionReference: {
    fontSize: 10,
    color: '#9ca3af',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },

  transactionRight: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    minWidth: 80,
  },

  transactionAmount: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },

  confirmationOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  confirmationModal: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 25,
    width: '85%',
    maxWidth: 350,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },

  confirmationTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 15,
  },

  confirmationMessage: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 25,
  },

  confirmationButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  cancelButton: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    paddingVertical: 12,
    marginRight: 10,
    borderRadius: 10,
    alignItems: 'center',
  },

  cancelButtonText: {
    fontSize: 16,
    color: '#374151',
    fontWeight: '600',
  },

  logoutConfirmButton: {
    flex: 1,
    backgroundColor: '#ff2b2b',
    paddingVertical: 12,
    marginLeft: 10,
    borderRadius: 10,
    alignItems: 'center',
  },

  logoutConfirmButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
});

const updatedQuickActionsStyles = {
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    marginBottom: 30,
    paddingHorizontal: 5, // Add small padding to match transactions
  },

  needHelpContainer: {
    alignItems: 'center',
    marginBottom: 30,
    paddingHorizontal: 5, // Add small padding to match
  },
};