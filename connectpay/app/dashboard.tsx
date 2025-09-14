import React, { useContext, useEffect, useState, useCallback } from 'react';
import FundWallet from './fund-wallet'; 
import TransactionDetails from './TransactionDetails'; // ✅ NEW: Transaction details component
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../contexts/AuthContext';
import { useRouter } from 'expo-router';

const SCREEN_WIDTH = Dimensions.get('window').width;

// ✅ FIXED: API Configuration - Updated endpoints to match server routes
const API_CONFIG = {
  BASE_URL: 'http://localhost:5000/api',
  ENDPOINTS: {
    PROFILE: '/auth/profile',
    BALANCE: '/balance',
    TRANSACTIONS: '/transactions', // This should match your backend route
  }
};

// ✅ Enhanced TypeScript interfaces
interface User {
  name: string;
  email: string;
  phone?: string;
  username?: string;
  dateJoined?: string;
}

interface Transaction {
  _id: string;
  type: string;
  amount: number;
  date: string;
  createdAt: string;
  status: string;
  description?: string;
  reference: string;
  category: string;
  previousBalance?: number;
  newBalance?: number;
  gateway?: {
    provider?: string;
    gatewayReference?: string;
  };
  metadata?: {
    ip_address?: string;
    user_agent?: string;
    source?: string;
    notes?: string;
    betting?: {
      provider?: string;
      customerId?: string;
      customerName?: string;
    };
  };
}

interface MenuItemType {
  name: string;
  icon: string;
  route?: string;
}

export default function Dashboard() {
  const { logout, token, isLoggedIn, user: contextUser, balance: contextBalance } = useContext(AuthContext);
  const router = useRouter();

  // ✅ Enhanced state management
  const [user, setUser] = useState<User | null>(null);
  const [accountBalance, setAccountBalance] = useState<number>(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeMenu, setActiveMenu] = useState('Dashboard');
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [balanceVisible, setBalanceVisible] = useState(true);
  const [showFundWallet, setShowFundWallet] = useState(false);
  
  // ✅ NEW: Transaction detail states
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [showTransactionDetails, setShowTransactionDetails] = useState(false);
  const [showAllTransactions, setShowAllTransactions] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const sidebarAnim = useState(new Animated.Value(-SCREEN_WIDTH * 0.7))[0];

  const menuItems: MenuItemType[] = [
    { name: 'Dashboard', icon: 'home-outline', route: '/dashboard' },
    { name: 'Profile', icon: 'person-outline', route: '/profile' },
    { name: 'Buy Airtime', icon: 'call-outline', route: '/buy-airtime' },
    { name: 'Buy Data', icon: 'wifi-outline', route: '/buy-data' },
    { name: 'Electricity', icon: 'flash-outline', route: '/electricity' },
    { name: 'Cable TV', icon: 'tv-outline', route: '/cable-tv' },
    { name: 'Internet', icon: 'globe-outline', route: '/internet' },
    { name: 'Transfer', icon: 'send-outline', route: '/transfer' },
    { name: 'Settings', icon: 'settings-outline', route: '/settings' },
    { name: 'Logout', icon: 'log-out-outline' },
  ];

  // ✅ NEW: Helper function to filter sensitive information from transactions
  const getFilteredTransaction = (transaction: Transaction) => {
    const {
      previousBalance,     // Remove balance information
      newBalance,         // Remove balance information
      metadata,
      ...filteredTransaction
    } = transaction;

    // Filter metadata to remove sensitive information
    const filteredMetadata = metadata ? {
      source: metadata.source,
      notes: metadata.notes,
      // Explicitly exclude sensitive data:
      // betting: undefined,        // Remove betting information
      // ip_address: undefined,     // Remove IP tracking
      // user_agent: undefined,     // Remove browser info
    } : {};

    return {
      ...filteredTransaction,
      metadata: filteredMetadata,
      // Explicitly remove balance fields
      previousBalance: undefined,
      newBalance: undefined,
    };
  };

  // ✅ Helper function for API calls with better error handling
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

// Add this new function
const fetchBalanceOnly = async () => {
  try {
    console.log('=== BALANCE FETCH START ===');
    const balanceResponse = await makeApiCall(API_CONFIG.ENDPOINTS.BALANCE, null);
    
    // Only update balance if we get a valid response
    if (balanceResponse && balanceResponse.success && balanceResponse.balance) {
      let balance = 0;
      
      if (balanceResponse.balance.amount !== undefined) {
        balance = balanceResponse.balance.amount;
        console.log('Found balance.amount:', balance);
      } else if (typeof balanceResponse.balance === 'number') {
        balance = balanceResponse.balance;
        console.log('Found direct balance:', balance);
      }
      
      const finalBalance = parseFloat(balance);
      
      // Only update if we got a valid positive number
      if (!isNaN(finalBalance) && finalBalance >= 0) {
        console.log('Setting balance to:', finalBalance);
        setAccountBalance(finalBalance);
      } else {
        console.log('Invalid balance received, keeping current value');
      }
    } else {
      console.log('No valid balance response, keeping current value');
    }
  } catch (error) {
    console.error('Balance fetch error:', error);
    // Don't reset balance to 0 on error - keep current value
  }
};


  // ✅ Enhanced transaction formatting
  const formatTransactionDate = (dateString: string) => {
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

  // ✅ Get transaction icon based on type and category
  const getTransactionIcon = (transaction: Transaction) => {
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

  // ✅ Get transaction color based on type
  // ✅ NEW: Get status color (for status badge only)
const getStatusColor = (transaction: Transaction) => {
  if (transaction.status === 'failed') return '#dc3545';
  if (transaction.status === 'pending') return '#ffc107';
  if (transaction.status === 'completed') return '#28a745'; // GREEN for completed
  return '#6c757d'; // default
};

// ✅ UPDATED: Get transaction type color (for amount and icon)
const getTransactionColor = (transaction: Transaction) => {
  // Only failed transactions override the type color
  if (transaction.status === 'failed') return '#dc3545';
  
  // For all other statuses, use type-based colors
  switch (transaction.type) {
    case 'credit':
    case 'transfer_in':
      return '#28a745'; // Green for credits
    case 'debit':
    case 'transfer_out':
      return '#ff2b2b'; // Red for debits
    default:
      return '#6c757d';
  }
};

  // ✅ IMPROVED: Better transaction formatting with real API structure
const fetchData = async (showLoader = true) => {
  try {
    console.log('Starting fetchData...');
    
    if (showLoader) setIsLoading(true);
    setIsRefreshing(!showLoader);

    // Make all API calls using Promise.allSettled
    const [userResponse, balanceResponse, transactionsResponse] = await Promise.allSettled([
      makeApiCall(API_CONFIG.ENDPOINTS.PROFILE, { name: 'User', email: 'user@example.com' }),
      makeApiCall(API_CONFIG.ENDPOINTS.BALANCE, { balance: 0 }),
      makeApiCall(API_CONFIG.ENDPOINTS.TRANSACTIONS, { success: false, transactions: [] })
    ]);

    // Handle user data
    if (userResponse.status === 'fulfilled' && userResponse.value) {
      console.log('User data received:', userResponse.value);
      setUser({
        name: userResponse.value.name || userResponse.value.user?.name || 'User',
        email: userResponse.value.email || userResponse.value.user?.email || 'user@example.com',
        phone: userResponse.value.phone || userResponse.value.user?.phone,
        username: userResponse.value.username || userResponse.value.user?.username,
        dateJoined: userResponse.value.dateJoined || userResponse.value.user?.dateJoined
      });
    } else {
      console.warn('User API failed, using fallback');
      setUser({ name: 'User', email: 'user@example.com' });
    }

    // Handle balance data
    // Handle balance data - IMPROVED
if (balanceResponse.status === 'fulfilled' && balanceResponse.value) {
  console.log('Raw balance response:', balanceResponse.value);
  
  // Try multiple ways to extract the balance
  let balance = 0;
  const response = balanceResponse.value;
  
  if (typeof response === 'number') {
    balance = response;
  } else if (response.balance !== undefined) {
    balance = response.balance;
  } else if (response.data && response.data.balance !== undefined) {
    balance = response.data.balance;
  } else if (response.amount !== undefined) {
    balance = response.amount;
  } else if (response.wallet_balance !== undefined) {
    balance = response.wallet_balance;
  }
  
  // Ensure it's a valid number
  const parsedBalance = parseFloat(balance);
  const finalBalance = isNaN(parsedBalance) ? 0 : parsedBalance;
  
  console.log('Parsed balance:', finalBalance);
  setAccountBalance(finalBalance);
} else {
  console.warn('Balance API failed, setting to 0');
  setAccountBalance(0);
}

    // Handle transactions data
    console.log('Checking transactions response...');
    
    if (transactionsResponse.status === 'fulfilled') {
      if (transactionsResponse.value?.success) {
        const txData = transactionsResponse.value.transactions || [];
        console.log('Number of transactions found:', txData.length);

        if (txData.length === 0) {
          console.warn('No transactions returned from API');
          setTransactions([]);
        } else {
          const formattedTransactions = txData.map((tx, index) => ({
            _id: tx._id || tx.id || `tx_${Date.now()}_${index}`,
            type: tx.type || 'credit',
            amount: parseFloat(tx.amount || 0),
            date: tx.createdAt || tx.date || new Date().toISOString(),
            createdAt: tx.createdAt || tx.date || new Date().toISOString(),
            status: tx.status || 'completed',
            description: tx.description || `${tx.type || 'Transaction'} transaction`,
            reference: tx.reference || `REF_${tx._id || Date.now()}_${index}`,
            category: (
              tx.description?.toLowerCase().includes('airtime') ? 'airtime' :
              tx.description?.toLowerCase().includes('data') ? 'data' :
              tx.description?.toLowerCase().includes('electricity') ? 'electricity' :
              tx.description?.toLowerCase().includes('cable') ? 'cable' :
              tx.description?.toLowerCase().includes('betting') ? 'betting' :
              tx.description?.toLowerCase().includes('transfer') ? 'transfer' :
              tx.category || 'general'
            ),
            previousBalance: tx.previousBalance || 0,
            newBalance: tx.newBalance || 0,
            gateway: tx.gateway || {},
            metadata: tx.metadata || {}
          }));

          console.log('Formatted transactions count:', formattedTransactions.length);
          setTransactions(formattedTransactions);
        }
      } else {
        console.error('API returned success: false');
        setTransactions([]);
      }
    } else {
      console.error('Transactions API call failed');
      setTransactions([]);
    }

  } catch (error) {
    console.error('Error in fetchData:', error);

    // Fallback values on error
    if (!user) setUser({ name: 'User', email: 'user@example.com' });
    if (accountBalance === undefined) setAccountBalance(0);
    if (!transactions.length) setTransactions([]);
  } finally {
    setIsLoading(false);
    setIsRefreshing(false);
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
  // Use data from AuthContext if available
  if (contextUser) {
    setUser({
      name: contextUser.name || 'User',
      email: contextUser.email || 'user@example.com',
      phone: contextUser.phone,
      username: contextUser.username,
    });
  }
  
  if (contextBalance !== undefined && contextBalance !== null) {
  // Parse the balance if it's an object
  let finalBalance = 0;
  
  if (typeof contextBalance === 'number') {
    finalBalance = contextBalance;
  } else if (typeof contextBalance === 'object') {
    // Try different properties
    finalBalance = contextBalance.amount || 
                   contextBalance.balance || 
                   contextBalance.current || 
                   contextBalance.value || 
                   Object.values(contextBalance).find(val => typeof val === 'number') || 0;
  } else {
    finalBalance = parseFloat(contextBalance) || 0;
  }
  
  console.log('Context balance:', contextBalance);
  console.log('Parsed balance:', finalBalance);
  setAccountBalance(finalBalance);
}
  
  // Only fetch transactions

// Only fetch transactions
  fetchTransactionsOnly();
}, [token, contextUser, contextBalance]);

// Add app state listener to refresh when app becomes active
// Add app state listener with throttling
useEffect(() => {
  let lastRefresh = 0;
  const REFRESH_COOLDOWN = 30000; // 30 seconds minimum between auto-refreshes
  
  const handleAppStateChange = (nextAppState) => {
    if (nextAppState === 'active') {
      const now = Date.now();
      if (now - lastRefresh > REFRESH_COOLDOWN) {
        console.log('App became active - refreshing balance (throttled)');
        lastRefresh = now;
        fetchBalanceOnly();
      } else {
        console.log('Balance refresh skipped - too soon since last refresh');
      }
    }
  };

  const subscription = AppState.addEventListener('change', handleAppStateChange);
  
  return () => {
    subscription?.remove();
  };
}, []);


// ENHANCED: Manual refresh function
const handleRefresh = async () => {
  console.log('Manual refresh triggered');
  setIsRefreshing(true);
  
  try {
    // Refresh both balance and transactions
    await Promise.all([
      fetchBalanceOnly(),
      fetchTransactionsOnly()
    ]);
    
    console.log('Refresh completed successfully');
  } catch (error) {
    console.error('Refresh failed:', error);
  } finally {
    setIsRefreshing(false);
  }
};


  // ✅ NEW: Handle transaction click
  const handleTransactionPress = (transaction: Transaction) => {
    console.log('Transaction selected:', transaction);
    setSelectedTransaction(transaction);
    setShowTransactionDetails(true);
  };

  // ✅ Navigation and other handlers (unchanged)
  const navigateToProfile = () => {
    console.log('Profile pressed, user data:', user);
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

  const handleProfilePress = navigateToProfile;

  const handleLogout = async () => {
    console.log('🔥 LOGOUT REQUESTED - SHOWING CONFIRMATION 🔥'); 
    setShowLogoutConfirm(true);
  };

  const confirmLogout = async () => {
    console.log('✅ LOGOUT CONFIRMED - PROCEEDING');
    setShowLogoutConfirm(false);

    try {
      console.log('🔄 Step 1: Calling AuthContext logout()...');
      await logout();
      console.log('✅ Step 2: AuthContext logout completed successfully');

      console.log('🚀 Step 3: Navigating to login screen...');
      const loginRoutes = ['/', '/login', '/(auth)/login', '/signin'];

      for (const route of loginRoutes) {
        try {
          router.replace(route);
          console.log(`🎯 Successfully navigated to ${route}`);
          return;
        } catch (error) {
          console.log(`Failed to navigate to ${route}:`, error);
        }
      }
    } catch (error) {
      console.error('❌ Logout error occurred:', error);
      Alert.alert('Logout Error', 'An error occurred during logout. Please restart the app.');
    }
  };

  const cancelLogout = () => {
    console.log('❌ LOGOUT CANCELLED');
    setShowLogoutConfirm(false);
  };

  const toggleSidebar = () => {
    Animated.timing(sidebarAnim, {
      toValue: sidebarOpen ? -SCREEN_WIDTH * 0.7 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
    setSidebarOpen(!sidebarOpen);
  };

  const handleMenuPress = (item: MenuItemType) => {
    console.log('Menu item pressed:', item.name);
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

  const handleQuickAction = (route: string) => {
    router.push(route);
  };

  const handleFundWallet = () => {
    console.log('Fund Wallet button pressed - showing modal');
    setShowFundWallet(true);
  };

  const toggleBalanceVisibility = () => {
    setBalanceVisible(!balanceVisible);
  };

const handleFundWalletSuccess = async () => {
  console.log('Fund wallet success - refreshing data');
  setShowFundWallet(false);
  
  // Add a small delay to allow backend to process
  setTimeout(async () => {
    await fetchBalanceOnly();
    await fetchTransactionsOnly();
  }, 2000);
};

  return (
    <SafeAreaView style={styles.container}>
      {/* Sidebar */}
      <Animated.View style={[styles.sidebar, { left: sidebarAnim }]}>
        <View style={styles.profileSection}>
          <View style={styles.profileHeader}>
            <TouchableOpacity onPress={handleProfilePress} style={styles.profileTouchable}>
              <View style={styles.profileAvatar}>
                {user?.name ? (
                  <Text style={styles.avatarText}>
                    {user.name.charAt(0).toUpperCase()}
                  </Text>
                ) : (
                  <Ionicons name="person-outline" size={24} color="#ff2b2b" />
                )}
              </View>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleProfilePress} style={styles.profileInfoTouchable}>
              <View style={styles.profileInfo}>
                <Text style={styles.profileName}>
                  {user?.name || (isLoading ? 'Loading...' : 'User')}
                </Text>
                <Text style={styles.profileEmail}>
                  {user?.email || (isLoading ? 'Loading...' : 'user@example.com')}
                </Text>
                {user?.phone && (
                  <Text style={styles.profilePhone}>{user.phone}</Text>
                )}
                <Text style={styles.tapToViewProfile}>Tap to view profile</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.sidebarTitle}>Menu</Text>
        {menuItems.map((item) => (
          <TouchableOpacity
            key={item.name}
            style={[
              styles.sidebarItem,
              activeMenu === item.name && styles.activeSidebarItem,
              item.name === 'Logout' && styles.sidebarLogoutButton,
            ]}
            onPress={() => handleMenuPress(item)}
          >
            <Ionicons
              name={item.icon as any}
              size={22}
              color={
                item.name === 'Logout'
                  ? '#fff'
                  : activeMenu === item.name
                  ? '#fff'
                  : '#ff2b2b'
              }
            />
            <Text
              style={[
                styles.sidebarText,
                activeMenu === item.name && styles.activeSidebarText,
                item.name === 'Logout' && styles.sidebarLogoutText,
              ]}
            >
              {item.name}
            </Text>
          </TouchableOpacity>
        ))}
      </Animated.View>

      {/* Header Card */}
      <View style={styles.headerCard}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={toggleSidebar}>
            <Ionicons name="menu-outline" size={28} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleProfilePress} style={styles.headerProfileButton}>
            <Text style={styles.greeting}>Hello, {user?.name?.split(' ')[0] || 'User'}</Text>
            <Ionicons name="chevron-forward-outline" size={16} color="#fff" style={{ marginLeft: 5 }} />
          </TouchableOpacity>
        </View>

        <View style={styles.balanceSection}>
          <View style={styles.balanceInfo}>
            <View style={styles.balanceTitleRow}>
              <Text style={styles.balanceTitle}>Wallet Balance</Text>
              <TouchableOpacity onPress={toggleBalanceVisibility} style={styles.balanceToggle}>
                <Ionicons 
                  name={balanceVisible ? "eye-outline" : "eye-off-outline"} 
                  size={20} 
                  color="#fff" 
                />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleRefresh} style={styles.refreshButton} disabled={isRefreshing}>
                <Ionicons 
                  name={isRefreshing ? "reload-outline" : "refresh-outline"} 
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
            <Ionicons name="add-circle-outline" size={20} color="#fff" />
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
            <Ionicons name="call-outline" size={20} color="#ff2b2b" />
            <Text style={styles.actionText}>Buy Airtime</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleQuickAction('/buy-data')}
          >
            <Ionicons name="wifi-outline" size={20} color="#ff2b2b" />
            <Text style={styles.actionText}>Buy Data</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleQuickAction('/electricity')}
          >
            <Ionicons name="flash-outline" size={20} color="#ff2b2b" />
            <Text style={styles.actionText}>Electricity</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleQuickAction('/cable-tv')}
          >
            <Ionicons name="tv-outline" size={20} color="#ff2b2b" />
            <Text style={styles.actionText}>Cable TV</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleQuickAction('/print-recharge')}
          >
            <Ionicons name="print-outline" size={20} color="#ff2b2b" />
            <Text style={styles.actionText}>Print Recharge</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleQuickAction('/fund-betting')}
          >
            <Ionicons name="football-outline" size={20} color="#ff2b2b" />
            <Text style={styles.actionText}>Fund Betting</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleQuickAction('/internet')}
          >
            <Ionicons name="globe-outline" size={20} color="#ff2b2b" />
            <Text style={styles.actionText}>Internet</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleQuickAction('/education')}
          >
            <Ionicons name="school-outline" size={20} color="#ff2b2b" />
            <Text style={styles.actionText}>Education</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleQuickAction('/transfer')}
          >
            <Ionicons name="send-outline" size={20} color="#ff2b2b" />
            <Text style={styles.actionText}>Transfer</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.needHelpContainer}>
          <TouchableOpacity
            style={styles.needHelpButton}
            onPress={() => handleQuickAction('/need-help')}
          >
            <Ionicons name="help-circle-outline" size={20} color="#fff" />
            <Text style={styles.needHelpText}>Need Help</Text>
          </TouchableOpacity>
        </View>

        {/* ✅ ENHANCED: Transaction Section */}
        <View style={styles.transactionsContainer}>
          <View style={styles.transactionsHeader}>
            <Text style={styles.transactionsTitle}>Recent Transactions</Text>
            {transactions.length > 3 && (
              <TouchableOpacity 
                style={styles.viewAllButton}
                onPress={() => setShowAllTransactions(true)}
              >
                <Text style={styles.viewAllText}>View All</Text>
                <Ionicons name="chevron-forward-outline" size={14} color="#ff2b2b" />
              </TouchableOpacity>
            )}
          </View>
          
          {transactions.length === 0 ? (
            <View style={styles.noTransactionsContainer}>
              <Ionicons name="receipt-outline" size={48} color="#ccc" />
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
      {/* ✅ ICON: Use transaction type color */}
      <View style={[styles.transactionIconContainer, { backgroundColor: `${getTransactionColor(tx)}15` }]}>
        <Ionicons 
          name={getTransactionIcon(tx) as any} 
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
          {/* ✅ STATUS BADGE: Use status color */}
         <View style={[styles.statusBadge, { backgroundColor: getStatusColor(tx) }]}>
            <Text style={styles.statusText}>{tx.status}</Text>
          </View>
          <Text style={styles.transactionReference}>#{tx.reference.slice(-6)}</Text>
        </View>
      </View>
    </View>
    <View style={styles.transactionRight}>
      {/* ✅ AMOUNT: Use transaction type color */}
      <Text style={[styles.transactionAmount, { color: getTransactionColor(tx) }]}>
        {tx.type === 'credit' || tx.type === 'transfer_in' ? '+' : '-'}₦{tx.amount.toLocaleString()}
      </Text>
      <Ionicons name="chevron-forward-outline" size={16} color="#ccc" />
    </View>
  </TouchableOpacity>
))}
            </View>
          )}
        </View>
      </ScrollView>

      
     {/* Transaction Details Modal with Enhanced Receipt Download */}
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

          // Share receipt using React Native Share API
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
                <Ionicons name="download-outline" size={20} color="#fff" />
               <Text style={{ color: '#fff', marginLeft: 8, fontWeight: '600' }}>
  Share Receipt
</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </Modal>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <View style={styles.confirmationOverlay}>
          <View style={styles.confirmationModal}>
            <Text style={styles.confirmationTitle}>Logout Confirmation</Text>
            <Text style={styles.confirmationMessage}>Are you sure you want to logout?</Text>

            <View style={styles.confirmationButtons}>
              <TouchableOpacity 
                style={styles.cancelButton} 
                onPress={cancelLogout}
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
      )}

      {/* Fund Wallet Modal */}
      <Modal
        visible={showFundWallet}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowFundWallet(false)}
      >
        <FundWallet 
          onClose={() => setShowFundWallet(false)}
          onSuccess={handleFundWalletSuccess}
          token={token}
          currentBalance={accountBalance}
        />
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fafafa' },
  sidebar: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: SCREEN_WIDTH * 0.7,
    backgroundColor: '#fff',
    paddingTop: 50,
    paddingHorizontal: 20,
    zIndex: 10,
  },
  profileSection: {
    marginBottom: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  profileTouchable: {},
  profileInfoTouchable: {
    flex: 1,
    marginLeft: 12,
  },
  profileAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f8f8f8',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ff2b2b',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ff2b2b',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  profileEmail: {
    fontSize: 12,
    color: '#666',
    marginBottom: 1,
  },
  profilePhone: {
    fontSize: 11,
    color: '#888',
    marginBottom: 2,
  },
  tapToViewProfile: {
    fontSize: 10,
    color: '#ff2b2b',
    fontStyle: 'italic',
  },
  headerProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  balanceTitleRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    marginBottom: 0,
  },
  balanceToggle: {
    padding: 4,
    marginLeft: 8,
  },
  refreshButton: {
    padding: 4,
    marginLeft: 8,
  },
  sidebarTitle: {
    color: '#ff2b2b',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  sidebarItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  activeSidebarItem: { backgroundColor: '#ff2b2b' },
  sidebarText: { color: '#000', fontSize: 18, marginLeft: 15 },
  activeSidebarText: { color: '#fff', fontWeight: 'bold' },
  sidebarLogoutButton: {
    backgroundColor: '#ff2b2b',
    marginTop: 10,
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  sidebarLogoutText: {
    color: '#fff',
    fontWeight: '600',
  },
  headerCard: {
    backgroundColor: '#ff2b2b',
    borderRadius: 0,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 8,
    marginLeft: -7,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  balanceSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  balanceInfo: {
    flex: 1,
  },
  balanceTitle: { color: '#fff', fontSize: 16, marginBottom: 5, opacity: 0.9 },
  balanceAmount: { color: '#fff', fontSize: 26, fontWeight: 'bold' },
fundButton: {
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: 'rgba(255, 255, 255, 0.2)',  // Semi-transparent white
  paddingVertical: 12,
  paddingHorizontal: 18,
  borderRadius: 12,
  borderWidth: 1,
  borderColor: 'rgba(255, 255, 255, 0.4)',     // Lighter border
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.15,
  shadowRadius: 4,
  elevation: 3,
},

  fundButtonText: { color: 'white', marginLeft: 6, fontWeight: '600', fontSize: 14 },
  greeting: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  needHelpContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  needHelpButton: {
    backgroundColor: '#ff2b2b',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 40,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 5,
    minWidth: 200,
  },
  needHelpText: {
    color: '#fff',
    marginLeft: 10,
    fontWeight: '700',
    fontSize: 16,
  },
  scrollContent: { paddingHorizontal: 20, paddingVertical: 20 },
  servicesHeader: { 
    fontSize: 18, 
    fontWeight: '600', 
    color: '#333', 
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
    paddingVertical: 15,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  actionText: { color: '#333', marginTop: 8, fontWeight: '500', fontSize: 12, textAlign: 'center' },
  
  // ✅ ENHANCED: Transaction Styles
  transactionsContainer: { 
    marginTop: 2,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    
  },
  transactionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  transactionsTitle: { 
    fontSize: 18, 
    fontWeight: 'bold', 
    color: '#333' 
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
  
  // ✅ NEW: No transactions state
  noTransactionsContainer: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  noTransactions: { 
    color: '#666', 
    fontStyle: 'italic',
    fontSize: 16,
    marginTop: 10,
  },
  noTransactionsSubtext: {
    color: '#999',
    fontSize: 12,
    marginTop: 5,
  },
  
  // ✅ NEW: Enhanced transaction item styles
  transactionsList: {
    marginTop: 5,
  },
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
    backgroundColor: '#fff',
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  transactionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionDescription: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  transactionDate: {
    fontSize: 12,
    color: '#666',
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
    color: '#999',
    fontFamily: 'monospace',
  },
  transactionRight: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  
  // ✅ Confirmation Modal Styles
  confirmationOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  confirmationModal: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 25,
    width: '80%',
    maxWidth: 350,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  confirmationTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 15,
  },
  confirmationMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 25,
  },
  confirmationButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingVertical: 12,
    marginRight: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#333',
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