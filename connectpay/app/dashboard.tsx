import React, { useContext, useEffect, useState, useCallback, useRef } from 'react';
import { ActivityIndicator, Alert, AppState, Platform, StatusBar, Modal } from 'react-native';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../contexts/AuthContext';
import { ThemeContext } from '../contexts/ThemeContext';
import { useRouter } from 'expo-router';
import apiClient from '../src/config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SCREEN_WIDTH = Dimensions.get('window').width;
const REFRESH_COOLDOWN = 30000;
const BALANCE_AUTO_REFRESH_INTERVAL = 30000; // Changed from 60000 to 30000 (30 seconds)

export default function Dashboard() {
  const { logout, token, user: contextUser, balance: contextBalance, isLoggingOut } = useContext(AuthContext);
  const { isDark, colors } = useContext(ThemeContext);
  const router = useRouter();

  // State management
  const [user, setUser] = useState(null);
  const [accountBalance, setAccountBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [balanceVisible, setBalanceVisible] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [apiError, setApiError] = useState(null);

  const lastRefreshRef = useRef(0);
  const abortControllersRef = useRef(new Set());
  const isMountedRef = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      abortControllersRef.current.forEach(controller => controller.abort());
      abortControllersRef.current.clear();
    };
  }, []);

  // Cancel all API calls when logout starts
  useEffect(() => {
    if (isLoggingOut) {
      console.log('🚫 Logout started - Cancelling all API calls');
      abortControllersRef.current.forEach(controller => controller.abort());
      abortControllersRef.current.clear();
    }
  }, [isLoggingOut]);

  const makeApiCall = useCallback(async (endpoint, fallbackValue = null) => {
    if (isLoggingOut || !isMountedRef.current) {
      console.log(`🚫 API call blocked: ${endpoint}`);
      return fallbackValue;
    }

    // CRITICAL: Check AsyncStorage for token if not in state
    let authToken = token;
    
    if (!authToken) {
      console.log('⚠️ No token in state, checking AsyncStorage...');
      try {
        authToken = await AsyncStorage.getItem('userToken');
        if (authToken) {
          console.log('✅ Token recovered from AsyncStorage');
        } else {
          console.log('❌ No token in AsyncStorage either');
          return fallbackValue;
        }
      } catch (error) {
        console.error('❌ Error reading token from AsyncStorage:', error);
        return fallbackValue;
      }
    }

    const controller = new AbortController();
    abortControllersRef.current.add(controller);

    try {
      console.log(`🔑 Making API call to ${endpoint}`);
      console.log(`🔑 Token exists: ${!!authToken}`);
      console.log(`🔑 Token length: ${authToken?.length}`);
      
      const response = await apiClient.get(endpoint, {
        signal: controller.signal,
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      });

      abortControllersRef.current.delete(controller);

      if (isLoggingOut || !isMountedRef.current) {
        console.log(`🚫 Response ignored (logging out): ${endpoint}`);
        return fallbackValue;
      }

      console.log(`✅ API call successful: ${endpoint} - Status: ${response.status}`);
      return response.data;
    } catch (error) {
      abortControllersRef.current.delete(controller);

      if (isLoggingOut || !isMountedRef.current || error.name === 'AbortError' || error.code === 'ERR_CANCELED') {
        return fallbackValue;
      }

      if (error.response?.status === 401) {
        console.error('❌ 401 Unauthorized - Token invalid or expired');
        Alert.alert(
          'Session Expired',
          'Your session has expired. Please log in again.',
          [{ text: 'OK', onPress: logout }]
        );
        return fallbackValue;
      }

      console.error(`❌ API Error (${endpoint}):`, {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
        url: error.config?.url
      });
      
      setApiError('Unable to connect. Please check your internet connection.');
      return fallbackValue;
    }
  }, [token, logout, isLoggingOut]);

  // Extract balance helper
  const extractBalance = useCallback((balanceData) => {
    if (balanceData === null || balanceData === undefined) return 0;
    if (typeof balanceData === 'number') return balanceData;
    if (typeof balanceData === 'object') {
      const balance = balanceData.amount || balanceData.balance || balanceData.current || balanceData.value || 0;
      return parseFloat(balance) || 0;
    }
    return parseFloat(balanceData) || 0;
  }, []);

  // Fetch balance from API
  const fetchBalance = useCallback(async () => {
    if (isLoggingOut || !isMountedRef.current || !token) {
      console.log('🚫 fetchBalance blocked - isLoggingOut:', isLoggingOut, 'isMounted:', isMountedRef.current, 'hasToken:', !!token);
      return;
    }

    try {
      console.log('🔍 Fetching balance from /balance endpoint...');
      // Use /balance (apiClient already has /api base URL)
      const response = await makeApiCall('/balance', null);
      
      console.log('📦 Balance API Response:', JSON.stringify(response, null, 2));
      
      if (response?.success && response?.balance && isMountedRef.current) {
        const balance = extractBalance(response.balance);
        setAccountBalance(balance);
        console.log('✅ Balance refreshed successfully:', balance);
      } else if (response) {
        console.log('⚠️ Unexpected balance response structure:', response);
        console.log('⚠️ Keeping current balance');
      }
    } catch (error) {
      if (isMountedRef.current) {
        console.error('❌ Error fetching balance:', error);
        console.error('❌ Error details:', {
          message: error?.message,
          status: error?.status,
          response: error?.response?.data
        });
        // Keep current balance on error
      }
    }
  }, [makeApiCall, extractBalance, isLoggingOut, token]);

  // Update balance from context (initial load)
  useEffect(() => {
    if (contextBalance !== undefined && contextBalance !== null) {
      const finalBalance = extractBalance(contextBalance);
      setAccountBalance(finalBalance);
    }
  }, [contextBalance, extractBalance]);

  // Update user from context
  useEffect(() => {
    if (contextUser) {
      setUser({
        name: contextUser.name || 'User',
        email: contextUser.email || 'user@example.com',
        phone: contextUser.phone,
        username: contextUser.username,
      });
    }
  }, [contextUser]);

  // Auto-refresh balance AND transactions every 1 minute
  useEffect(() => {
    if (!token || isLoggingOut) {
      return;
    }

    // Initial fetch after 2 seconds (let context load first)
    const initialTimeout = setTimeout(() => {
      if (!isLoggingOut && isMountedRef.current) {
        fetchBalance();
        fetchTransactions();
      }
    }, 2000);

    // Set up interval for periodic refresh of BOTH balance and transactions
    const refreshInterval = setInterval(() => {
      if (!isLoggingOut && isMountedRef.current) {
        console.log('⏰ Auto-refreshing balance and transactions...');
        fetchBalance();
        fetchTransactions();
      }
    }, BALANCE_AUTO_REFRESH_INTERVAL);

    // Cleanup
    return () => {
      clearTimeout(initialTimeout);
      clearInterval(refreshInterval);
      console.log('🧹 Cleaning up auto-refresh');
    };
  }, [token, fetchBalance, fetchTransactions, isLoggingOut]);

  // Format date helper
  const formatTransactionDate = useCallback((dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }, []);

  // Transaction icon helper
  const getTransactionIcon = useCallback((transaction) => {
    if (transaction.status === 'failed') {
      return { name: 'close', bg: '#fee2e2', color: '#dc3545' };
    }
    
    if (transaction.type === 'credit' || transaction.type === 'transfer_in') {
      return { name: 'arrow-down', bg: '#e8f5e9', color: '#28a745' };
    }
    
    return { name: 'arrow-up', bg: '#fee2e2', color: '#dc3545' };
  }, []);

  // Transaction color helper
  const getTransactionColor = useCallback((transaction) => {
    if (transaction.status === 'failed') return '#dc3545';
    
    if (transaction.type === 'credit' || transaction.type === 'transfer_in') {
      return '#28a745';
    }
    
    return '#ff2b2b';
  }, []);

  // Fetch transactions
  const fetchTransactions = useCallback(async () => {
    if (isLoggingOut || !isMountedRef.current) {
      console.log('🚫 fetchTransactions blocked');
      return;
    }

    try {
      const response = await makeApiCall('/transactions', { 
        success: false, 
        transactions: [] 
      });
      
      if (response?.success && isMountedRef.current) {
        const txData = response.transactions || [];
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
        setApiError(null);
      } else if (isMountedRef.current) {
        setTransactions([]);
      }
    } catch (error) {
      if (isMountedRef.current) {
        console.error('Error fetching transactions:', error);
        setTransactions([]);
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [makeApiCall, isLoggingOut]);

  // Initial fetch
  useEffect(() => {
    if (token && !isLoggingOut) {
      fetchTransactions();
    }
  }, [token, fetchTransactions, isLoggingOut]);

  // App state change handler
  useEffect(() => {
    const handleAppStateChange = (nextAppState) => {
      if (nextAppState === 'active' && token && !isLoggingOut && isMountedRef.current) {
        const now = Date.now();
        if (now - lastRefreshRef.current > REFRESH_COOLDOWN) {
          lastRefreshRef.current = now;
          fetchBalance();
          fetchTransactions();
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [fetchTransactions, fetchBalance, token, isLoggingOut]);

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    if (isLoggingOut || !isMountedRef.current) {
      console.log('🚫 Refresh blocked');
      return;
    }
    
    setIsRefreshing(true);
    setApiError(null);
    try {
      // Refresh both balance and transactions
      await Promise.all([
        fetchBalance(),
        fetchTransactions()
      ]);
    } catch (error) {
      console.error('Refresh failed:', error);
    } finally {
      if (isMountedRef.current) {
        setIsRefreshing(false);
      }
    }
  }, [fetchTransactions, fetchBalance, isLoggingOut]);

const handleTransactionPress = useCallback((transaction) => {
  router.push({
    pathname: '/TransactionDetailsScreen',
    params: {
      transaction: JSON.stringify(transaction),
    }
  });
}, [router]);

  // Navigation handlers
  const navigateToProfile = useCallback(() => {
    try {
      router.push('/profile');
    } catch (error) {
      console.error('Navigation error:', error);
      Alert.alert('Navigation Error', 'Could not open profile. Please try again.');
    }
  }, [router]);

  const handleQuickAction = useCallback((route) => {
    try {
      router.push(route);
    } catch (error) {
      console.error('Navigation error:', error);
      Alert.alert('Navigation Error', 'Could not open service. Please try again.');
    }
  }, [router]);

  const handleLogout = useCallback(() => {
    setShowLogoutConfirm(true);
  }, []);

  const confirmLogout = useCallback(async () => {
    setShowLogoutConfirm(false);
    try {
      await logout();
      router.replace('/auth/login');
    } catch (error) {
      console.error('Logout error:', error);
      router.replace('/auth/login');
    }
  }, [logout, router]);

  const handleFundWallet = useCallback(() => {
    router.push('/fund-wallet');
  }, [router]);

  const toggleBalanceVisibility = useCallback(() => {
    setBalanceVisible(prev => !prev);
  }, []);


  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={colors.background} />
      
      {/* Modern Header */}
      <View style={[styles.modernHeader, { backgroundColor: colors.background }]}>
        <View style={styles.modernHeaderTop}>
          <TouchableOpacity 
            style={styles.modernProfileSection}
            onPress={navigateToProfile}
          >
            <View style={styles.modernAvatar}>
              {user?.name ? (
                <Text style={styles.modernAvatarText}>
                  {user.name.charAt(0).toUpperCase()}
                </Text>
              ) : (
                <Ionicons name="person" size={20} color="#ff2b2b" />
              )}
            </View>
            <Text style={[styles.modernGreetingText, { color: colors.text }]}>
              Hello, {user?.name?.split(' ')[0] || 'User'}
            </Text>
          </TouchableOpacity>
          
          <View style={styles.modernHeaderIcons}>
            <TouchableOpacity 
              style={[styles.modernIconButton, { backgroundColor: isDark ? colors.border : '#f5f5f5' }]}
              onPress={handleRefresh}
              disabled={isRefreshing || isLoggingOut}
            >
              <Ionicons name={isRefreshing ? "reload" : "notifications-outline"} size={22} color={colors.text} />
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.modernIconButton, { backgroundColor: isDark ? colors.border : '#f5f5f5' }]}
              onPress={() => router.push('/need-help')}
            >
              <Ionicons name="help-circle-outline" size={22} color={colors.text} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={isLoggingOut ? undefined : handleRefresh}
            colors={['#ff2b2b']}
            tintColor={isDark ? '#ffffff' : '#ff2b2b'}
            title="Pull to refresh..."
            titleColor={colors.textSecondary}
          />
        }
      >
        {/* Modern Balance Card */}
        <View style={[styles.modernBalanceCard, { backgroundColor: '#ff2b2b' }]}>
          <View style={styles.balanceCardHeader}>
            <View>
              <View style={styles.balanceTypeRow}>
                <Text style={styles.balanceType}>Wallet Balance</Text>
                <TouchableOpacity onPress={toggleBalanceVisibility} style={styles.eyeButton}>
                  <Ionicons 
                    name={balanceVisible ? "eye-outline" : "eye-off-outline"} 
                    size={18} 
                    color="#fff" 
                  />
                </TouchableOpacity>
              </View>
              <Text style={styles.modernBalanceAmount}>
                {balanceVisible ? `₦${accountBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '₦****'}
              </Text>
            </View>
            <TouchableOpacity style={styles.fundWalletButton} onPress={handleFundWallet}>
              <Ionicons name="add" size={18} color="#ff2b2b" />
              <Text style={styles.fundWalletText}>Fund wallet</Text>
            </TouchableOpacity>
          </View>
          
          {/* Decorative Pattern */}
          <View style={styles.cardPattern}>
            <View style={styles.patternCircle1} />
            <View style={styles.patternCircle2} />
          </View>
        </View>

        {/* Top Services Section */}
        <View style={styles.servicesSection}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Top services</Text>
          
          <View style={styles.topServicesGrid}>
            {[
              { name: 'Airtime', icon: 'call', color: '#E3F2FD', iconColor: '#2196F3', route: '/buy-airtime' },
              { name: 'Data', icon: 'wifi', color: '#FFF3E0', iconColor: '#FF9800', route: '/buy-data' },
              { name: 'TV', icon: 'tv', color: '#E8F5E9', iconColor: '#4CAF50', route: '/cable-tv' },
              { name: 'Electricity', icon: 'flash', color: '#E1F5FE', iconColor: '#03A9F4', route: '/electricity' },
              { name: 'Print recharge', icon: 'print', color: '#F3E5F5', iconColor: '#9C27B0', route: '/print-recharge' },
              { name: 'Betting', icon: 'football', color: '#FFF9C4', iconColor: '#FBC02D', route: '/fund-betting' },
              { name: 'Internet', icon: 'globe', color: '#E0F2F1', iconColor: '#009688', route: '/internet' },
              { name: 'Education', icon: 'school', color: '#FCE4EC', iconColor: '#E91E63', route: '/education' },
            ].map((service) => (
              <View key={service.name} style={styles.topServiceWrapper}>
                <TouchableOpacity
                  style={[styles.topServiceItem, { backgroundColor: service.color }]}
                  onPress={() => handleQuickAction(service.route)}
                >
                  <Ionicons name={service.icon} size={22} color={service.iconColor} />
                </TouchableOpacity>
                <Text style={[styles.topServiceText, { color: colors.text }]}>{service.name}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Promotions Banner */}
        <View style={styles.promotionsSection}>
          <View style={[styles.promotionBanner, { backgroundColor: '#ffffff' }]}>
            <View style={styles.promotionContent}>
              <Text style={[styles.promotionTitle, { color: '#ff2b2b' }]}>Special Offer! 🎉</Text>
              <Text style={[styles.promotionSubtitle, { color: '#666666' }]}>Get 10% cashback on all bills payment</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#ff2b2b" />
          </View>
        </View>

        {/* Recent Transactions */}
        <View style={styles.recentTransactionsSection}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent transactions</Text>
            {transactions.length > 0 && (
              <TouchableOpacity 
                style={styles.seeAllButton}
                onPress={() => router.push('/transaction-history')}
              >
                <Text style={styles.seeAllText}>View all</Text>
                <Ionicons name="arrow-forward" size={16} color="#ff2b2b" />
              </TouchableOpacity>
            )}
          </View>
          
          {transactions.length === 0 ? (
            <View style={[styles.emptyTransactions, { backgroundColor: isDark ? colors.border : '#fff' }]}>
              <Ionicons name="receipt-outline" size={48} color={colors.textSecondary} />
              <Text style={[styles.emptyTransactionsText, { color: colors.textSecondary }]}>
                {isLoading ? 'Loading transactions...' : 'No transactions yet'}
              </Text>
            </View>
          ) : (
            <View style={styles.transactionsList}>
             {transactions.slice(0, 2).map((tx) => {
                const icon = getTransactionIcon(tx);
                
                return (
                  <TouchableOpacity
                    key={tx._id}
                    style={[styles.modernTransactionItem, { backgroundColor: colors.cardBg, borderBottomColor: colors.border }]}
                    onPress={() => handleTransactionPress(tx)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.transactionItemLeft}>
                      <View style={[styles.modernTransactionIcon, { backgroundColor: icon.bg }]}>
                        <Ionicons 
                          name={icon.name} 
                          size={20} 
                          color={icon.color} 
                        />
                      </View>
                      <View style={styles.transactionItemInfo}>
                        <Text style={[styles.modernTransactionTitle, { color: colors.text }]} numberOfLines={1}>
                          {tx.description || `${tx.type} transaction`}
                        </Text>
                        <Text style={[styles.modernTransactionDate, { color: colors.textSecondary }]}>
                          {formatTransactionDate(tx.createdAt)}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.transactionItemRight}>
                      <Text style={[styles.modernTransactionAmount, { color: getTransactionColor(tx) }]}>
                        {tx.type === 'credit' || tx.type === 'transfer_in' ? '+' : '−'} {tx.amount.toFixed(2)} ₦
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={[styles.bottomNav, { backgroundColor: colors.cardBg, borderTopColor: colors.border }]}>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('/dashboard')}>
          <Ionicons name="home" size={24} color="#ff2b2b" />
          <Text style={[styles.navText, { color: '#ff2b2b' }]}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('/services')}>
          <Ionicons name="apps-outline" size={24} color={colors.textSecondary} />
          <Text style={[styles.navText, { color: colors.textSecondary }]}>Services</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('/transaction-history')}>
          <Ionicons name="receipt-outline" size={24} color={colors.textSecondary} />
          <Text style={[styles.navText, { color: colors.textSecondary }]}>Transactions</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.navItem} onPress={navigateToProfile}>
          <Ionicons name="person-outline" size={24} color={colors.textSecondary} />
          <Text style={[styles.navText, { color: colors.textSecondary }]}>Profile</Text>
        </TouchableOpacity>
      </View>
{/* No more modal - navigation happens in handleTransactionPress */}

      {/* Logout Confirmation Modal */}
      <Modal
        visible={showLogoutConfirm}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowLogoutConfirm(false)}
      >
        <View style={styles.confirmationOverlay}>
          <View style={[styles.confirmationModal, { backgroundColor: colors.cardBg }]}>
            <Text style={[styles.confirmationTitle, { color: colors.text }]}>Logout Confirmation</Text>
            <Text style={[styles.confirmationMessage, { color: colors.textSecondary }]}>Are you sure you want to logout?</Text>

            <View style={styles.confirmationButtons}>
              <TouchableOpacity 
                style={[styles.cancelButton, { backgroundColor: isDark ? colors.border : '#f3f4f6' }]} 
                onPress={() => setShowLogoutConfirm(false)}
              >
                <Text style={[styles.cancelButtonText, { color: colors.text }]}>Cancel</Text>
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

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#f8f9fa' 
  },
  
  // Modern Header Styles
  modernHeader: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 10 : StatusBar.currentHeight + 10,
    paddingBottom: 15,
  },
  modernHeaderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modernProfileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  modernAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#fff5f5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ff2b2b',
    marginRight: 12,
  },
  modernAvatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ff2b2b',
  },
  modernGreetingText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  modernHeaderIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  modernIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Scroll Content
  scrollContent: {
    paddingBottom: 100,
  },
  
  // Modern Balance Card
  modernBalanceCard: {
    marginHorizontal: 20,
    marginVertical: 20,
    borderRadius: 20,
    padding: 16,
    backgroundColor: '#ff2b2b',
    shadowColor: '#ff2b2b',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
    overflow: 'hidden',
    minHeight: 100,
  },
  balanceCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    zIndex: 2,
  },
  balanceTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  balanceType: {
    color: '#fff',
    fontSize: 14,
    opacity: 0.9,
    marginRight: 8,
  },
  eyeButton: {
    padding: 4,
  },
  modernBalanceAmount: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  fundWalletButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  fundWalletText: {
    color: '#ff2b2b',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  cardPattern: {
    position: 'absolute',
    right: -20,
    bottom: -20,
    width: 200,
    height: 200,
  },
  patternCircle1: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    right: 20,
    bottom: 20,
  },
  patternCircle2: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    right: 40,
    bottom: 60,
  },
  
  // Services Section
  servicesSection: {
    marginTop: 10,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 15,
  },
  topServicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  topServiceWrapper: {
    width: '23%',
    alignItems: 'center',
    marginBottom: 16,
  },
  topServiceItem: {
    width: 52,
    height: 52,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  topServiceText: {
    fontSize: 10,
    color: '#1f2937',
    textAlign: 'center',
    fontWeight: '600',
  },
  
  // Promotions Section
  promotionsSection: {
    marginTop: 20,
    paddingHorizontal: 20,
  },
  promotionBanner: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  promotionContent: {
    flex: 1,
  },
  promotionTitle: {
    color: '#ff2b2b',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  promotionSubtitle: {
    color: '#666666',
    fontSize: 14,
    fontWeight: '500',
  },
  
  // Recent Transactions Section
  recentTransactionsSection: {
    marginTop: 30,
    paddingHorizontal: 20,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  seeAllText: {
    color: '#ff2b2b',
    fontSize: 14,
    fontWeight: '600',
    marginRight: 4,
  },
  emptyTransactions: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  emptyTransactionsText: {
    fontSize: 15,
    color: '#6b7280',
    marginTop: 12,
    fontWeight: '500',
  },
  transactionsList: {
    gap: 8,
  },
  modernTransactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 8,
    borderBottomWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  transactionItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  modernTransactionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  transactionItemInfo: {
    flex: 1,
  },
  modernTransactionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  modernTransactionDate: {
    fontSize: 12,
    color: '#9ca3af',
    fontWeight: '500',
  },
  transactionItemRight: {
    alignItems: 'flex-end',
  },
  modernTransactionAmount: {
    fontSize: 16,
    fontWeight: '700',
  },
  
  // Bottom Navigation
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingBottom: Platform.OS === 'ios' ? 28 : 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  navText: {
    fontSize: 11,
    marginTop: 4,
    fontWeight: '600',
  },
  
  // Modals
  confirmationOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmationModal: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
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
    marginBottom: 12,
  },
  confirmationMessage: {
    fontSize: 15,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  confirmationButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 15,
    color: '#374151',
    fontWeight: '600',
  },
  logoutConfirmButton: {
    flex: 1,
    backgroundColor: '#ff2b2b',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  logoutConfirmButtonText: {
    fontSize: 15,
    color: '#fff',
    fontWeight: '600',
  },
});