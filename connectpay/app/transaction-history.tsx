import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Platform,
  StatusBar,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Stack } from 'expo-router';
import { AuthContext } from '../contexts/AuthContext';
import { ThemeContext } from '../contexts/ThemeContext';
import TransactionDetails from './TransactionDetails';

const API_CONFIG = {
  BASE_URL: Platform.OS === 'web' 
    ? `${process.env.EXPO_PUBLIC_API_URL_WEB}/api`
    : `${process.env.EXPO_PUBLIC_API_URL}/api`,
  ENDPOINTS: {
    TRANSACTIONS: '/transactions',
  }
};

const FILTER_TABS = [
  { key: 'all', label: 'All' },
  { key: 'credit', label: 'Deposit of funds' },
  { key: 'debit', label: 'Withdrawal of funds' },
];

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
  metadata?: any;
}

export default function TransactionHistory() {
  const router = useRouter();
  const { token, user } = useContext(AuthContext);
  const { isDark, colors } = useContext(ThemeContext);

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [showTransactionDetails, setShowTransactionDetails] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');

  const makeApiCall = async (endpoint: string, fallbackValue: any = null) => {
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
        return await response.json();
      }
      return fallbackValue;
    } catch (error) {
      console.error(`${endpoint} API error:`, error);
      return fallbackValue;
    }
  };

  const fetchTransactions = async () => {
    try {
      setIsLoading(true);
      
      const response = await makeApiCall(API_CONFIG.ENDPOINTS.TRANSACTIONS, { 
        success: false, 
        transactions: [] 
      });
      
      if (response?.success) {
        const txData = response.transactions || [];
        const formattedTransactions: Transaction[] = txData.map((tx: any, index: number) => ({
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

  const applyFilter = () => {
    let filtered = [...transactions];

    if (activeFilter === 'credit') {
      filtered = filtered.filter(tx => tx.type === 'credit' || tx.type === 'transfer_in');
    } else if (activeFilter === 'debit') {
      filtered = filtered.filter(tx => tx.type === 'debit' || tx.type === 'transfer_out');
    }

    filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    setFilteredTransactions(filtered);
  };

  useEffect(() => {
    fetchTransactions();
  }, [token]);

  useEffect(() => {
    applyFilter();
  }, [transactions, activeFilter]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchTransactions();
    setIsRefreshing(false);
  };

  const formatTransactionDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getTransactionIcon = (transaction: Transaction) => {
    if (transaction.status === 'failed') {
      return { name: 'close', bg: '#fee2e2', color: '#dc3545' };
    }
    
    if (transaction.type === 'credit' || transaction.type === 'transfer_in') {
      return { name: 'arrow-down', bg: '#e8f5e9', color: '#28a745' };
    }
    
    return { name: 'arrow-up', bg: '#fee2e2', color: '#dc3545' };
  };

  const getTransactionColor = (transaction: Transaction) => {
    if (transaction.status === 'failed') return '#dc3545';
    
    if (transaction.type === 'credit' || transaction.type === 'transfer_in') {
      return '#28a745';
    }
    
    return '#ff2b2b';
  };

  const handleTransactionPress = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setShowTransactionDetails(true);
  };

  return (
    <>
      {/* Configure the red navigation header */}
      <Stack.Screen 
        options={{
          headerShown: true,
          headerStyle: {
            backgroundColor: '#ff2b2b',
          },
          headerTintColor: '#fff',
          headerTitle: 'My Transactions',
          headerTitleStyle: {
            fontWeight: '700',
            fontSize: 18,
          },
          headerShadowVisible: false,
        }} 
      />
      
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Filter Tabs */}
        <View style={[styles.filterContainer, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterScrollContent}
          >
            {FILTER_TABS.map((tab) => (
              <TouchableOpacity
                key={tab.key}
                style={[
                  styles.filterTab,
                  activeFilter === tab.key && styles.filterTabActive,
                  { 
                    backgroundColor: activeFilter === tab.key ? '#1a4d2e' : colors.cardBg,
                    borderColor: activeFilter === tab.key ? '#1a4d2e' : colors.border
                  }
                ]}
                onPress={() => setActiveFilter(tab.key)}
              >
                <Text style={[
                  styles.filterTabText,
                  activeFilter === tab.key && styles.filterTabTextActive,
                  { color: activeFilter === tab.key ? '#fff' : colors.text }
                ]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Transactions List */}
        <ScrollView 
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              colors={['#ff2b2b']}
              tintColor={isDark ? '#ffffff' : '#ff2b2b'}
            />
          }
        >
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#ff2b2b" />
              <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading transactions...</Text>
            </View>
          ) : filteredTransactions.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={[styles.emptyIconContainer, { backgroundColor: isDark ? colors.border : '#f3f4f6' }]}>
                <Ionicons name="receipt-outline" size={64} color={colors.textSecondary} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No Transactions Found</Text>
              <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
                {activeFilter === 'all' ? 
                  'Your transaction history will appear here' :
                  `No ${activeFilter === 'credit' ? 'deposit' : 'withdrawal'} transactions found`
                }
              </Text>
            </View>
          ) : (
            <View style={styles.transactionsList}>
              {filteredTransactions.map((tx) => {
                const icon = getTransactionIcon(tx);
                
                return (
                  <TouchableOpacity
                    key={tx._id}
                    style={[styles.transactionItem, { backgroundColor: colors.cardBg, borderBottomColor: colors.border }]}
                    onPress={() => handleTransactionPress(tx)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.transactionLeft}>
                      <View style={[styles.iconContainer, { backgroundColor: icon.bg }]}>
                        <Ionicons name={icon.name as any} size={20} color={icon.color} />
                      </View>
                      <View style={styles.transactionInfo}>
                        <Text style={[styles.transactionName, { color: colors.text }]} numberOfLines={1}>
                          {tx.description || `${tx.type} transaction`}
                        </Text>
                        <Text style={[styles.transactionDate, { color: colors.textSecondary }]}>
                          {formatTransactionDate(tx.createdAt)}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.transactionRight}>
                      <Text style={[
                        styles.transactionAmount,
                        { color: getTransactionColor(tx) }
                      ]}>
                        {tx.type === 'credit' || tx.type === 'transfer_in' ? '+' : '−'} {tx.amount.toFixed(2)} ₦
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
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
            <TransactionDetails
              transaction={selectedTransaction}
              onClose={() => setShowTransactionDetails(false)}
              userInfo={user}
            />
          )}
        </Modal>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  filterContainer: {
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  filterScrollContent: {
    paddingHorizontal: 20,
    gap: 12,
  },
  filterTab: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterTabActive: {
    backgroundColor: '#1a4d2e',
    borderColor: '#1a4d2e',
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  filterTabTextActive: {
    color: '#fff',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 16,
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
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  transactionsList: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 16,
    marginBottom: 8,
    borderBottomWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  transactionDate: {
    fontSize: 12,
  },
  transactionRight: {
    alignItems: 'flex-end',
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '700',
  },
});