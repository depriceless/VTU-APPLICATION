import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Platform,
  StatusBar,
  Modal,
  Alert,
  TextInput,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { AuthContext } from '../contexts/AuthContext';
import TransactionDetails from './TransactionDetails';
import { Share } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const API_CONFIG = {
  BASE_URL: Platform.OS === 'web' 
    ? `${process.env.EXPO_PUBLIC_API_URL_WEB}/api`
    : `${process.env.EXPO_PUBLIC_API_URL}/api`,
  ENDPOINTS: {
    TRANSACTIONS: '/transactions',
  }
};

// Enhanced Filter Options
const FILTER_OPTIONS = [
  { key: 'all', label: 'All Transactions', icon: 'list' },
  { key: 'credit', label: 'Credits', icon: 'arrow-down-circle', color: '#10b981' },
  { key: 'debit', label: 'Debits', icon: 'arrow-up-circle', color: '#ef4444' },
  { key: 'pending', label: 'Pending', icon: 'time', color: '#f59e0b' },
  { key: 'failed', label: 'Failed', icon: 'close-circle', color: '#ef4444' },
];

const SORT_OPTIONS = [
  { key: 'newest', label: 'Newest First', icon: 'arrow-down' },
  { key: 'oldest', label: 'Oldest First', icon: 'arrow-up' },
  { key: 'amount_high', label: 'Amount: High to Low', icon: 'trending-down' },
  { key: 'amount_low', label: 'Amount: Low to High', icon: 'trending-up' },
];

const TIME_RANGES = [
  { key: 'all', label: 'All Time' },
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'This Week' },
  { key: 'month', label: 'This Month' },
  { key: 'quarter', label: 'This Quarter' },
];

export default function TransactionHistory() {
  const router = useRouter();
  const { token, user } = useContext(AuthContext);

  // Enhanced State Management
  const [transactions, setTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [showTransactionDetails, setShowTransactionDetails] = useState(false);
  
  // Advanced Filter States
  const [showFilters, setShowFilters] = useState(false);
  const [filterType, setFilterType] = useState('all');
  const [sortOrder, setSortOrder] = useState('newest');
  const [timeRange, setTimeRange] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  
  // Analytics States
  const [analytics, setAnalytics] = useState({
    totalTransactions: 0,
    totalCredits: 0,
    totalDebits: 0,
    pendingCount: 0,
    failedCount: 0,
    netFlow: 0,
  });

  // API Helper Function
  const makeApiCall = async (endpoint, fallbackValue = null) => {
    try {
      if (!token) {
        console.warn(`No token available for ${endpoint}`);
        return fallbackValue;
      }

      const response = await fetch(`${API_CONFIG.BASE_URL}${endpoint}`, {
        method: 'GET',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        console.error(`API call failed for ${endpoint}:`, response.status);
        return fallbackValue;
      }

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await response.json();
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

  // Enhanced Transaction Fetching
  const fetchTransactions = async () => {
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
        calculateAnalytics(formattedTransactions);
      } else {
        setTransactions([]);
        calculateAnalytics([]);
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
      setTransactions([]);
      calculateAnalytics([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate Transaction Analytics
  const calculateAnalytics = (txData) => {
    const analytics = txData.reduce((acc, tx) => {
      acc.totalTransactions++;
      
      if (tx.type === 'credit' || tx.type === 'transfer_in') {
        acc.totalCredits += tx.amount;
      } else {
        acc.totalDebits += tx.amount;
      }
      
      if (tx.status === 'pending') acc.pendingCount++;
      if (tx.status === 'failed') acc.failedCount++;
      
      return acc;
    }, {
      totalTransactions: 0,
      totalCredits: 0,
      totalDebits: 0,
      pendingCount: 0,
      failedCount: 0,
    });
    
    analytics.netFlow = analytics.totalCredits - analytics.totalDebits;
    setAnalytics(analytics);
  };

  // Enhanced Filtering Logic
  const applyFilters = () => {
    let filtered = [...transactions];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(tx => 
        tx.description.toLowerCase().includes(query) ||
        tx.reference.toLowerCase().includes(query) ||
        tx.category.toLowerCase().includes(query)
      );
    }

    // Type filter
    if (filterType === 'credit') {
      filtered = filtered.filter(tx => tx.type === 'credit' || tx.type === 'transfer_in');
    } else if (filterType === 'debit') {
      filtered = filtered.filter(tx => tx.type === 'debit' || tx.type === 'transfer_out');
    } else if (filterType === 'pending') {
      filtered = filtered.filter(tx => tx.status === 'pending');
    } else if (filterType === 'failed') {
      filtered = filtered.filter(tx => tx.status === 'failed');
    }

    // Time range filter
    if (timeRange !== 'all') {
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const startOfWeek = new Date(startOfDay);
      startOfWeek.setDate(startOfDay.getDate() - startOfDay.getDay());
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfQuarter = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);

      filtered = filtered.filter(tx => {
        const txDate = new Date(tx.createdAt);
        switch (timeRange) {
          case 'today':
            return txDate >= startOfDay;
          case 'week':
            return txDate >= startOfWeek;
          case 'month':
            return txDate >= startOfMonth;
          case 'quarter':
            return txDate >= startOfQuarter;
          default:
            return true;
        }
      });
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortOrder) {
        case 'oldest':
          return new Date(a.createdAt) - new Date(b.createdAt);
        case 'amount_high':
          return b.amount - a.amount;
        case 'amount_low':
          return a.amount - b.amount;
        case 'newest':
        default:
          return new Date(b.createdAt) - new Date(a.createdAt);
      }
    });

    setFilteredTransactions(filtered);
  };

  useEffect(() => {
    fetchTransactions();
  }, [token]);

  useEffect(() => {
    applyFilters();
  }, [transactions, filterType, sortOrder, timeRange, searchQuery]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchTransactions();
    setIsRefreshing(false);
  };

  // Enhanced Date Formatting
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
      case 'funding': return 'wallet-outline';
      case 'betting': return 'football-outline';
      case 'transfer': return transaction.type === 'transfer_out' ? 'send-outline' : 'download-outline';
      case 'payment': return 'card-outline';
      case 'withdrawal': return 'cash-outline';
      case 'airtime': return 'call-outline';
      case 'data': return 'wifi-outline';
      case 'electricity': return 'flash-outline';
      case 'cable': return 'tv-outline';
      default: return transaction.type === 'credit' ? 'add-circle-outline' : 'remove-circle-outline';
    }
  };

  const getStatusColor = (transaction) => {
    switch (transaction.status) {
      case 'failed': return '#ef4444';
      case 'pending': return '#f59e0b';
      case 'completed': return '#10b981';
      default: return '#6b7280';
    }
  };

  const getTransactionColor = (transaction) => {
    if (transaction.status === 'failed') return '#ef4444';
    
    switch (transaction.type) {
      case 'credit':
      case 'transfer_in':
        return '#10b981';
      case 'debit':
      case 'transfer_out':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  const handleTransactionPress = (transaction) => {
    setSelectedTransaction(transaction);
    setShowTransactionDetails(true);
  };

  const getFilteredTransaction = (transaction) => {
    const { previousBalance, newBalance, metadata, ...filteredTransaction } = transaction;
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

  const clearFilters = () => {
    setFilterType('all');
    setSortOrder('newest');
    setTimeRange('all');
    setSearchQuery('');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      {/* Enhanced Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#1f2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Transaction History</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity 
            onPress={() => setShowSearch(!showSearch)} 
            style={[styles.headerButton, showSearch && styles.headerButtonActive]}
          >
            <Ionicons name="search" size={22} color={showSearch ? "#ff2b2b" : "#6b7280"} />
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => setShowFilters(!showFilters)} 
            style={[styles.headerButton, showFilters && styles.headerButtonActive]}
          >
            <Ionicons name="options" size={22} color={showFilters ? "#ff2b2b" : "#6b7280"} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleRefresh} style={styles.headerButton}>
            <Ionicons name="refresh" size={22} color="#6b7280" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Bar */}
      {showSearch && (
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Ionicons name="search" size={20} color="#9ca3af" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search transactions..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#9ca3af"
            />
            {searchQuery !== '' && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color="#9ca3af" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* Enhanced Analytics Card */}
      <View style={styles.analyticsCard}>
        <Text style={styles.analyticsTitle}>Overview</Text>
        <View style={styles.analyticsGrid}>
          <View style={styles.analyticsItem}>
            <Text style={styles.analyticsNumber}>{analytics.totalTransactions}</Text>
            <Text style={styles.analyticsLabel}>Total</Text>
          </View>
          <View style={styles.analyticsItem}>
            <Text style={[styles.analyticsNumber, { color: '#10b981' }]}>
              ₦{analytics.totalCredits.toLocaleString()}
            </Text>
            <Text style={styles.analyticsLabel}>Credits</Text>
          </View>
          <View style={styles.analyticsItem}>
            <Text style={[styles.analyticsNumber, { color: '#ef4444' }]}>
              ₦{analytics.totalDebits.toLocaleString()}
            </Text>
            <Text style={styles.analyticsLabel}>Debits</Text>
          </View>
          <View style={styles.analyticsItem}>
            <Text style={[
              styles.analyticsNumber, 
              { color: analytics.netFlow >= 0 ? '#10b981' : '#ef4444' }
            ]}>
              {analytics.netFlow >= 0 ? '+' : ''}₦{analytics.netFlow.toLocaleString()}
            </Text>
            <Text style={styles.analyticsLabel}>Net Flow</Text>
          </View>
        </View>
      </View>

      {/* Advanced Filters Panel */}
      {showFilters && (
        <View style={styles.filtersPanel}>
          <View style={styles.filterSection}>
            <Text style={styles.filterSectionTitle}>Filter by Type</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScrollView}>
              {FILTER_OPTIONS.map((filter) => (
                <TouchableOpacity
                  key={filter.key}
                  style={[
                    styles.filterChip,
                    filterType === filter.key && styles.filterChipActive
                  ]}
                  onPress={() => setFilterType(filter.key)}
                >
                  <Ionicons 
                    name={filter.icon} 
                    size={16} 
                    color={filterType === filter.key ? '#fff' : (filter.color || '#6b7280')} 
                  />
                  <Text style={[
                    styles.filterChipText,
                    filterType === filter.key && styles.filterChipTextActive
                  ]}>
                    {filter.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View style={styles.filterSection}>
            <Text style={styles.filterSectionTitle}>Time Range</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScrollView}>
              {TIME_RANGES.map((range) => (
                <TouchableOpacity
                  key={range.key}
                  style={[
                    styles.filterChip,
                    timeRange === range.key && styles.filterChipActive
                  ]}
                  onPress={() => setTimeRange(range.key)}
                >
                  <Text style={[
                    styles.filterChipText,
                    timeRange === range.key && styles.filterChipTextActive
                  ]}>
                    {range.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View style={styles.filterSection}>
            <Text style={styles.filterSectionTitle}>Sort by</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScrollView}>
              {SORT_OPTIONS.map((sort) => (
                <TouchableOpacity
                  key={sort.key}
                  style={[
                    styles.filterChip,
                    sortOrder === sort.key && styles.filterChipActive
                  ]}
                  onPress={() => setSortOrder(sort.key)}
                >
                  <Ionicons 
                    name={sort.icon} 
                    size={16} 
                    color={sortOrder === sort.key ? '#fff' : '#6b7280'} 
                  />
                  <Text style={[
                    styles.filterChipText,
                    sortOrder === sort.key && styles.filterChipTextActive
                  ]}>
                    {sort.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <TouchableOpacity style={styles.clearFiltersButton} onPress={clearFilters}>
            <Ionicons name="refresh" size={16} color="#ff2b2b" />
            <Text style={styles.clearFiltersText}>Clear All Filters</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Results Summary */}
      <View style={styles.summaryBar}>
        <Text style={styles.summaryText}>
          {filteredTransactions.length} of {transactions.length} transactions
        </Text>
        {(filterType !== 'all' || timeRange !== 'all' || searchQuery !== '') && (
          <View style={styles.activeFiltersIndicator}>
            <Ionicons name="funnel" size={14} color="#ff2b2b" />
            <Text style={styles.activeFiltersText}>Filtered</Text>
          </View>
        )}
      </View>

      {/* Enhanced Transactions List */}
      <ScrollView 
        style={styles.scrollContainer}
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
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#ff2b2b" />
            <Text style={styles.loadingText}>Loading transactions...</Text>
          </View>
        ) : filteredTransactions.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
              <Ionicons name="receipt-outline" size={64} color="#d1d5db" />
            </View>
            <Text style={styles.emptyTitle}>No Transactions Found</Text>
            <Text style={styles.emptySubtext}>
              {searchQuery ? 
                `No transactions match "${searchQuery}"` :
                filterType === 'all' && timeRange === 'all' ? 
                  'Your transaction history will appear here' :
                  'Try adjusting your filters'
              }
            </Text>
            {(filterType !== 'all' || timeRange !== 'all' || searchQuery !== '') && (
              <TouchableOpacity style={styles.clearFiltersButtonEmpty} onPress={clearFilters}>
                <Text style={styles.clearFiltersButtonEmptyText}>Clear Filters</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.transactionsList}>
            {filteredTransactions.map((tx, index) => (
              <TouchableOpacity
                key={tx._id}
                style={[
                  styles.transactionItem,
                  index === filteredTransactions.length - 1 && styles.lastTransactionItem
                ]}
                onPress={() => handleTransactionPress(tx)}
                activeOpacity={0.7}
              >
                <View style={styles.transactionLeft}>
                  <View style={[
                    styles.transactionIconContainer, 
                    { backgroundColor: `${getTransactionColor(tx)}15` }
                  ]}>
                    <Ionicons 
                      name={getTransactionIcon(tx)} 
                      size={24} 
                      color={getTransactionColor(tx)} 
                    />
                  </View>
                  <View style={styles.transactionInfo}>
                    <Text style={styles.transactionDescription}>
                      {tx.description || `${tx.type} transaction`}
                    </Text>
                    <View style={styles.transactionSecondaryInfo}>
                      <Text style={styles.transactionDate}>
                        {formatTransactionDate(tx.createdAt)}
                      </Text>
                      <Text style={styles.transactionCategory}>
                        • {tx.category}
                      </Text>
                    </View>
                    <View style={styles.transactionMeta}>
                      <View style={[styles.statusBadge, { backgroundColor: getStatusColor(tx) }]}>
                        <Text style={styles.statusText}>{tx.status}</Text>
                      </View>
                      <Text style={styles.transactionReference}>#{tx.reference.slice(-8)}</Text>
                    </View>
                  </View>
                </View>
                <View style={styles.transactionRight}>
                  <Text style={[styles.transactionAmount, { color: getTransactionColor(tx) }]}>
                    {tx.type === 'credit' || tx.type === 'transfer_in' ? '+' : '-'}₦{tx.amount.toLocaleString()}
                  </Text>
                  <Ionicons name="chevron-forward" size={16} color="#d1d5db" />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
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
            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={styles.shareReceiptButton}
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
                    Alert.alert('Success', 'Receipt shared successfully!');
                  }).catch((error) => {
                    console.error('Share error:', error);
                    Alert.alert('Share Error', 'Unable to share receipt.');
                  });
                }}
              >
                <Ionicons name="share-outline" size={20} color="#fff" />
                <Text style={styles.shareReceiptText}>Share Receipt</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },

  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },

  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  backButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    marginRight: 12,
  },

  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
  },

  headerButton: {
    padding: 8,
    borderRadius: 8,
    marginLeft: 8,
    backgroundColor: '#f9fafb',
  },

  headerButtonActive: {
    backgroundColor: '#fff5f5',
  },

  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },

  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },

  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1f2937',
    marginLeft: 12,
  },

  analyticsCard: {
    backgroundColor: '#fff',
    margin: 20,
    marginBottom: 0,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },

  analyticsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 16,
  },

  analyticsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  analyticsItem: {
    alignItems: 'center',
    flex: 1,
  },

  analyticsNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 4,
  },

  analyticsLabel: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },

  filtersPanel: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginTop: 12,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },

  filterSection: {
    marginBottom: 20,
  },

  filterSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },

  filterScrollView: {
    flexGrow: 0,
  },

  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },

  filterChipActive: {
    backgroundColor: '#ff2b2b',
    borderColor: '#ff2b2b',
  },

  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    marginLeft: 6,
  },

  filterChipTextActive: {
    color: '#fff',
  },

  clearFiltersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#fff5f5',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ffe5e5',
  },

  clearFiltersText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ff2b2b',
    marginLeft: 8,
  },

  summaryBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#f8fafc',
  },

  summaryText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },

  activeFiltersIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#fff5f5',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ffe5e5',
  },

  activeFiltersText: {
    fontSize: 12,
    color: '#ff2b2b',
    fontWeight: '600',
    marginLeft: 4,
  },

  scrollContainer: {
    flex: 1,
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },

  loadingText: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 16,
    fontWeight: '500',
  },

  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },

  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },

  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 8,
    textAlign: 'center',
  },

  emptySubtext: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },

  clearFiltersButtonEmpty: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#ff2b2b',
    borderRadius: 12,
  },

  clearFiltersButtonEmptyText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },

  transactionsList: {
    backgroundColor: '#fff',
    margin: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },

  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },

  lastTransactionItem: {
    borderBottomWidth: 0,
  },

  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },

  transactionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },

  transactionInfo: {
    flex: 1,
  },

  transactionDescription: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },

  transactionSecondaryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },

  transactionDate: {
    fontSize: 13,
    color: '#6b7280',
  },

  transactionCategory: {
    fontSize: 13,
    color: '#9ca3af',
    marginLeft: 8,
    textTransform: 'capitalize',
  },

  transactionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    marginRight: 12,
  },

  statusText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  transactionReference: {
    fontSize: 11,
    color: '#9ca3af',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontWeight: '500',
  },

  transactionRight: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginLeft: 12,
  },

  transactionAmount: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },

  modalActions: {
    padding: 20,
    backgroundColor: '#f8fafc',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },

  shareReceiptButton: {
    backgroundColor: '#ff2b2b',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    shadowColor: '#ff2b2b',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },

  shareReceiptText: {
    color: '#fff',
    marginLeft: 8,
    fontWeight: '600',
    fontSize: 16,
  },
});