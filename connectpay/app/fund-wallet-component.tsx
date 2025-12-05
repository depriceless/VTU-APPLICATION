import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  ActivityIndicator, 
  ScrollView, 
  Alert,
  Clipboard,
  Platform,
  RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ============================================================================
// Constants & Configuration
// ============================================================================

const AMOUNT_LIMITS = {
  MIN: 100,
  MAX: 1000000,
} as const;

const QUICK_AMOUNTS = [500, 1000, 2000, 5000, 10000, 20000, 50000, 100000] as const;

const STORAGE_KEYS = {
  AUTH_TOKEN: 'userToken',
  CACHED_ACCOUNT: 'cachedVirtualAccount',
} as const;

const API_CONFIG = {
  BASE_URL: Platform.OS === 'web' 
    ? `${process.env.EXPO_PUBLIC_API_URL_WEB}/api`
    : `${process.env.EXPO_PUBLIC_API_URL}/api`,
  FALLBACK_URL: 'https://vtu-application.onrender.com/api',
  ENDPOINTS: {
    VIRTUAL_ACCOUNT: '/payment/virtual-account',
    CARD_PAYMENT: '/card/pay',
    ACTIVE_GATEWAY: '/payment/active-gateway',
  },
  TIMEOUT: 30000,
} as const;

const GATEWAY_NAMES = {
  paystack: 'Paystack',
  monnify: 'Monnify',
} as const;

// ============================================================================
// Types
// ============================================================================

interface FundWalletProps {
  token: string;
  currentBalance?: number;
  onSuccess?: () => void;
}

interface BankAccount {
  bankName: string;
  accountNumber: string;
  accountName: string;
}

interface BankData {
  accounts: BankAccount[];
  reference?: string;
  gateway: 'paystack' | 'monnify';
}

interface CardInfo {
  cardNumber: string;
  expiry: string;
  cvv: string;
}

type PaymentMethodType = 'bank' | 'card';

interface PaymentMethod {
  id: PaymentMethodType;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const PAYMENT_METHODS: PaymentMethod[] = [
  { id: 'bank', label: 'BANK TRANSFER', icon: 'business-outline' },
  { id: 'card', label: 'DEBIT CARD', icon: 'card-outline' },
];

// ============================================================================
// Validation Utilities
// ============================================================================

const validators = {
  amount: (value: string): boolean => {
    const num = Number(value);
    return value.trim() !== '' && 
           !isNaN(num) && 
           num >= AMOUNT_LIMITS.MIN && 
           num <= AMOUNT_LIMITS.MAX;
  },

  cardNumber: (cardNumber: string): boolean => {
    const cleaned = cardNumber.replace(/\s/g, '');
    return /^\d{13,19}$/.test(cleaned);
  },

  expiry: (expiry: string): boolean => {
    const regex = /^(0[1-9]|1[0-2])\/\d{2}$/;
    if (!regex.test(expiry)) return false;

    const [month, year] = expiry.split('/');
    const currentYear = new Date().getFullYear() % 100;
    const currentMonth = new Date().getMonth() + 1;
    const expYear = parseInt(year, 10);
    const expMonth = parseInt(month, 10);

    if (expYear < currentYear) return false;
    if (expYear === currentYear && expMonth < currentMonth) return false;

    return true;
  },

  cvv: (cvv: string): boolean => {
    return /^\d{3,4}$/.test(cvv);
  },
};

// ============================================================================
// Formatting Utilities
// ============================================================================

const formatters = {
  cardNumber: (text: string): string => {
    const cleaned = text.replace(/\s/g, '');
    const match = cleaned.match(/.{1,4}/g);
    return match ? match.join(' ').substring(0, 19) : cleaned;
  },

  expiry: (text: string): string => {
    const cleaned = text.replace(/\D/g, '');
    if (cleaned.length >= 2) {
      return cleaned.substring(0, 2) + '/' + cleaned.substring(2, 4);
    }
    return cleaned;
  },

  currency: (amount: number): string => {
    return `₦${amount.toLocaleString()}`;
  },
};

// ============================================================================
// Cache Management
// ============================================================================

const clearAccountCache = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(STORAGE_KEYS.CACHED_ACCOUNT);
    console.log('[Cache] Account cache cleared');
  } catch (error) {
    console.error('[Cache] Failed to clear cache:', error);
  }
};

const saveToCache = async (bankData: BankData, gateway: string): Promise<void> => {
  try {
    const cacheData = {
      bankData,
      gateway,
      timestamp: Date.now(),
    };
    await AsyncStorage.setItem(STORAGE_KEYS.CACHED_ACCOUNT, JSON.stringify(cacheData));
    console.log('[Cache] Account saved to cache for gateway:', gateway);
  } catch (error) {
    console.error('[Cache] Failed to save to cache:', error);
  }
};

// ============================================================================
// Custom Hooks
// ============================================================================

const useAPI = (token?: string) => {
  const makeRequest = useCallback(async (
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<any> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT);

    const urls = [
      `${API_CONFIG.BASE_URL}${endpoint}`,
      `${API_CONFIG.FALLBACK_URL}${endpoint}`,
    ];

    const errors: string[] = [];

    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      try {
        console.log(`[API] Attempting request ${i + 1}/${urls.length}: ${url}`);
        
        const response = await fetch(url, {
          ...options,
          headers: {
            'Content-Type': 'application/json',
            ...(token && token.trim() && { Authorization: `Bearer ${token.trim()}` }),
            ...options.headers,
          },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        console.log(`[API] Response status: ${response.status}`);

        const responseText = await response.text();
        console.log(`[API] Response received: ${responseText.substring(0, 200)}...`);
        
        const data = responseText ? JSON.parse(responseText) : {};

        if (!response.ok) {
          const errorMsg = data.message || data.error || `HTTP ${response.status}: ${response.statusText}`;
          console.log(`[API] Request failed: ${errorMsg}`);
          errors.push(`URL ${i + 1}: ${errorMsg}`);
          
          if (response.status === 401 || response.status === 403) {
            throw new Error(`Authentication failed: ${errorMsg}`);
          }
          
          continue;
        }

        console.log(`[API] Request successful`);
        return data;
        
      } catch (error: any) {
        clearTimeout(timeoutId);
        
        if (error.name === 'AbortError') {
          console.log(`[API] Request timeout at URL ${i + 1}`);
          errors.push(`URL ${i + 1}: Request timeout`);
        } else {
          console.log(`[API] Error at URL ${i + 1}:`, error.message);
          errors.push(`URL ${i + 1}: ${error.message}`);
        }
        
        if (error.message.includes('Authentication') || i === urls.length - 1) {
          throw new Error(errors.join('; ') || error.message);
        }
      }
    }

    throw new Error(errors.join('; ') || 'All API endpoints failed');
  }, [token]);

  return { makeRequest };
};

// ============================================================================
// Helper Functions
// ============================================================================

const processAccountData = (data: any): BankData => {
  console.log('[Account] Processing account data:', data);
  
  if (!data || !data.gateway) {
    console.warn('[Account] Invalid account data:', data);
    throw new Error('Invalid account data received from server');
  }

  const gateway = data.gateway.toLowerCase();
  const isPaystack = gateway === 'paystack';
  const isMonnify = gateway === 'monnify';

  if (!isPaystack && !isMonnify) {
    console.warn('[Account] Unknown gateway:', gateway);
    throw new Error(`Unknown payment gateway: ${gateway}`);
  }

  const accounts: BankAccount[] = [];

  if (isPaystack && data.account) {
    accounts.push({
      bankName: data.account.bank_name || 'Unknown Bank',
      accountNumber: data.account.account_number || '',
      accountName: data.account.account_name || 'Unknown Name',
    });
  } else if (isMonnify && data.accounts && Array.isArray(data.accounts)) {
    data.accounts.forEach((account: any) => {
      accounts.push({
        bankName: account.bankName || account.bank_name || 'Unknown Bank',
        accountNumber: account.accountNumber || account.account_number || '',
        accountName: account.accountName || account.account_name || 'Unknown Name',
      });
    });
  }

  if (accounts.length === 0) {
    console.warn('[Account] No accounts found in data:', data);
    throw new Error('No account details found in response');
  }

  return {
    accounts,
    reference: data.reference,
    gateway: gateway as 'paystack' | 'monnify',
  };
};

// ============================================================================
// Main Hook - SIMPLIFIED VERSION
// ============================================================================

const useVirtualAccount = (token: string) => {
  const [bankData, setBankData] = useState<BankData | null>(null);
  const [activeGateway, setActiveGateway] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [refreshing, setRefreshing] = useState(false);
  const { makeRequest } = useAPI(token);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const fetchActiveGateway = useCallback(async (): Promise<string | null> => {
    try {
      console.log('[Gateway] Fetching active gateway...');
      const response = await makeRequest(API_CONFIG.ENDPOINTS.ACTIVE_GATEWAY);
      console.log('[Gateway] Response:', JSON.stringify(response));
      
      let gateway: string | null = null;
      
      if (response.success && response.activeGateway) {
        gateway = response.activeGateway;
      } else if (response.success && response.data?.activeGateway) {
        gateway = response.data.activeGateway;
      } else if (response.activeGateway) {
        gateway = response.activeGateway;
      }
      
      if (gateway) {
        console.log('[Gateway] ✅ Active gateway found:', gateway);
        return gateway.toLowerCase();
      }
      
      console.warn('[Gateway] ⚠️ No active gateway found in response');
      return null;
    } catch (error: any) {
      console.error('[Gateway] ❌ Failed to fetch:', error.message);
      return null;
    }
  }, [makeRequest]);

  const fetchAccountDetails = useCallback(async (forceRefresh = false) => {
    if (!mountedRef.current) return;
    
    console.log('[Account] Starting fetch, forceRefresh:', forceRefresh);
    
    setRefreshing(true);
    if (!forceRefresh) {
      setLoading(true);
    }
    
    setError('');

    try {
      // Clear cache if forced refresh
      if (forceRefresh) {
        await clearAccountCache();
        console.log('[Account] Cache cleared for forced refresh');
      }

      // 1. Fetch active gateway first
      const currentGateway = await fetchActiveGateway();
      console.log('[Account] Current active gateway from API:', currentGateway);

      if (!currentGateway) {
        throw new Error('Unable to determine active gateway. Please try again.');
      }

      // 2. Check cache first (unless force refresh)
      if (!forceRefresh) {
        const cached = await AsyncStorage.getItem(STORAGE_KEYS.CACHED_ACCOUNT);
        if (cached) {
          const data = JSON.parse(cached);
          const cacheAge = Date.now() - data.timestamp;
          const cacheValid = cacheAge < 600000; // 10 minutes
          
          console.log('[Cache] Checking cache...');
          console.log('  Cached Gateway:', data.gateway);
          console.log('  Current Gateway:', currentGateway);
          console.log('  Cache Age:', cacheAge, 'ms');
          console.log('  Cache Valid:', cacheValid);
          
          // Only use cache if gateway matches AND cache is valid
          if (cacheValid && data.gateway === currentGateway) {
            console.log('[Cache] ✅ Using cached data');
            if (mountedRef.current) {
              setBankData(data.bankData);
              setActiveGateway(data.gateway);
              setLoading(false);
              setRefreshing(false);
            }
            return;
          } else {
            console.log('[Cache] ⚠️ Cache invalid or gateway mismatch');
            await clearAccountCache();
          }
        }
      }

      // 3. Fetch fresh data from API
      console.log('[Account] Fetching fresh account from API...');
      const accountResponse = await makeRequest(API_CONFIG.ENDPOINTS.VIRTUAL_ACCOUNT);

      if (!mountedRef.current) return;

      console.log('[Account] API response:', accountResponse);

      if (accountResponse.success && accountResponse.data) {
        const processed = processAccountData(accountResponse.data);
        
        console.log('[Account] 🔥 Setting state with gateway:', processed.gateway);
        
        if (mountedRef.current) {
          setBankData(processed);
          setActiveGateway(processed.gateway);
        }
        await saveToCache(processed, processed.gateway);
        console.log('[Account] ✅ Successfully loaded account details for gateway:', processed.gateway);
      } else {
        throw new Error(accountResponse.message || 'Failed to load account details');
      }
    } catch (error: any) {
      if (!mountedRef.current) return;
      
      console.error('[Account] Error:', error.message);
      const errorMessage = error.message || 'Failed to load account details';
      setError(errorMessage);

      if (errorMessage.includes('Authentication') || errorMessage.includes('401') || errorMessage.includes('403')) {
        Alert.alert(
          'Authentication Error',
          'Your session may have expired. Please log in again.',
          [{ text: 'OK' }]
        );
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [makeRequest, fetchActiveGateway]);

  const manualRefresh = useCallback(() => {
    console.log('[Account] Manual refresh triggered');
    fetchAccountDetails(true);
  }, [fetchAccountDetails]);

  // Initial load
  useEffect(() => {
    if (token && token.trim()) {
      console.log('[Account] Token available, initializing...');
      fetchAccountDetails();
    } else {
      console.log('[Account] No valid token available');
      setError('No authentication token available');
      setLoading(false);
    }
  }, [token]);

  return {
    bankData,
    activeGateway,
    loading,
    error,
    refreshing,
    refetch: manualRefresh,
  };
};

// ============================================================================
// Main Component
// ============================================================================

export default function FundWallet({ token, currentBalance = 0, onSuccess }: FundWalletProps) {
  const [amount, setAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>('bank');
  const [cardInfo, setCardInfo] = useState<CardInfo>({ 
    cardNumber: '', 
    expiry: '', 
    cvv: '' 
  });
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showGatewaySelector, setShowGatewaySelector] = useState(false);

  const { 
    bankData, 
    activeGateway, 
    loading, 
    error: accountError, 
    refreshing,
    refetch 
  } = useVirtualAccount(token);

  const { makeRequest } = useAPI(token);

  useEffect(() => {
    console.log('[FundWallet] Component mounted with token:', token ? 'Available' : 'Missing');
    console.log('[FundWallet] Token length:', token?.length || 0);
  }, [token]);

  // 🆕 DEBUG EFFECT - ADD THIS
  useEffect(() => {
    const checkGatewayAPI = async () => {
      try {
        console.log('🧪 DEBUG: Checking gateway API directly...');
        
        // Test the API directly
        const response = await fetch('https://vtu-application.onrender.com/api/payment/active-gateway', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        const data = await response.json();
        console.log('🧪 DEBUG: Direct API Response:', JSON.stringify(data));
        
        // Also check what admin endpoint returns
        try {
          const adminResponse = await fetch('https://vtu-application.onrender.com/api/admin/payment-gateway/config', {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          
          const adminData = await adminResponse.json();
          console.log('🧪 DEBUG: Admin Config Response:', JSON.stringify(adminData));
        } catch (adminError) {
          console.log('🧪 DEBUG: Cannot access admin endpoint');
        }
      } catch (error) {
        console.error('🧪 DEBUG: Failed to check API:', error);
      }
    };
    
    if (token) {
      checkGatewayAPI();
    }
  }, [token]);

  const copyToClipboard = useCallback((text: string, label: string) => {
    Clipboard.setString(text);
    Alert.alert('Copied!', `${label} copied to clipboard`);
  }, []);

  const handleQuickAmount = useCallback((quickAmount: number) => {
    setAmount(quickAmount.toString());
    setError('');
  }, []);

  const handleCardPayment = useCallback(async () => {
    setError('');
    setSuccess('');

    if (!validators.amount(amount)) {
      setError(`Amount must be between ${formatters.currency(AMOUNT_LIMITS.MIN)} and ${formatters.currency(AMOUNT_LIMITS.MAX)}`);
      return;
    }

    if (!validators.cardNumber(cardInfo.cardNumber)) {
      setError('Please enter a valid card number');
      return;
    }

    if (!validators.expiry(cardInfo.expiry)) {
      setError('Please enter a valid expiry date (MM/YY)');
      return;
    }

    if (!validators.cvv(cardInfo.cvv)) {
      setError('Please enter a valid CVV (3-4 digits)');
      return;
    }

    setIsProcessing(true);

    try {
      const [expiry_month, expiry_year] = cardInfo.expiry.split('/');
      const cleanedCardNumber = cardInfo.cardNumber.replace(/\s/g, '');

      console.log('[Payment] Processing card payment...');

      const response = await makeRequest(API_CONFIG.ENDPOINTS.CARD_PAYMENT, {
        method: 'POST',
        body: JSON.stringify({
          amount: Number(amount),
          card_number: cleanedCardNumber,
          cvv: cardInfo.cvv,
          expiry_month,
          expiry_year: `20${expiry_year}`,
        }),
      });

      if (response.status === 'success' || response.success) {
        console.log('[Payment] Payment successful');
        setSuccess(`Wallet funded successfully with ${formatters.currency(Number(amount))}!`);
        
        setTimeout(() => {
          setAmount('');
          setCardInfo({ cardNumber: '', expiry: '', cvv: '' });
          setSuccess('');
          onSuccess?.();
        }, 2000);
      } else {
        throw new Error(response.message || 'Card payment failed');
      }
    } catch (error: any) {
      console.error('[Payment] Payment failed:', error.message);
      setError(error.message || 'Payment processing failed');
    } finally {
      setIsProcessing(false);
    }
  }, [amount, cardInfo, onSuccess, makeRequest]);

  const getGatewayName = useCallback(() => {
    const gateway = bankData?.gateway || activeGateway;
    return GATEWAY_NAMES[gateway as keyof typeof GATEWAY_NAMES] || 'Payment Gateway';
  }, [bankData, activeGateway]);

  const renderGatewaySelector = () => (
    <View style={styles.gatewaySelectorContainer}>
      <TouchableOpacity 
        style={styles.gatewaySelectorButton}
        onPress={() => setShowGatewaySelector(!showGatewaySelector)}
      >
        <Text style={styles.gatewaySelectorText}>
          🔧 Gateway Debug: {getGatewayName()}
        </Text>
        <Ionicons 
          name={showGatewaySelector ? "chevron-up" : "chevron-down"} 
          size={20} 
          color="#ff3b30" 
        />
      </TouchableOpacity>
      
      {showGatewaySelector && (
        <View style={styles.gatewayOptions}>
          <TouchableOpacity 
            style={[styles.gatewayOption, activeGateway === 'paystack' && styles.gatewayOptionActive]}
            onPress={() => {
              Alert.alert(
                'Force Paystack',
                'This will try to fetch Paystack data. Note: If API returns Monnify, it may not work.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { 
                    text: 'Force Refresh', 
                    onPress: () => {
                      // Clear cache and refetch
                      AsyncStorage.removeItem(STORAGE_KEYS.CACHED_ACCOUNT);
                      refetch();
                    }
                  }
                ]
              );
            }}
          >
            <Text style={styles.gatewayOptionText}>Force Refresh & Clear Cache</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.gatewayOption}
            onPress={() => {
              Alert.alert(
                'API Check',
                `Current gateway: ${getGatewayName()}\n\nCheck console logs for API responses.`,
                [{ text: 'OK' }]
              );
            }}
          >
            <Text style={styles.gatewayOptionText}>Check API Status</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const renderQuickAmounts = () => (
    <View style={styles.quickAmountsContainer}>
      <Text style={styles.quickAmountsLabel}>Quick Select</Text>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.quickAmountsScroll}
      >
        {QUICK_AMOUNTS.map((quickAmount) => (
          <TouchableOpacity
            key={quickAmount}
            style={[
              styles.quickAmountButton,
              amount === quickAmount.toString() && styles.quickAmountButtonActive
            ]}
            onPress={() => handleQuickAmount(quickAmount)}
          >
            <Text style={[
              styles.quickAmountText,
              amount === quickAmount.toString() && styles.quickAmountTextActive
            ]}>
              {formatters.currency(quickAmount)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderBankTransferSection = () => (
    <View style={styles.section}>
      <View style={styles.amountSection}>
        <Text style={styles.label}>Enter Amount to Fund</Text>
        <TextInput
          style={[styles.input, error && error.includes('amount') && styles.inputError]}
          placeholder={`Enter amount (${formatters.currency(AMOUNT_LIMITS.MIN)} - ${formatters.currency(AMOUNT_LIMITS.MAX)})`}
          placeholderTextColor="#aaa"
          keyboardType="numeric"
          value={amount}
          onChangeText={(text) => { 
            setAmount(text.replace(/[^0-9]/g, '')); 
            setError(''); 
            setSuccess(''); 
          }}
        />
        {renderQuickAmounts()}
      </View>

      {/* 🆕 Gateway Debug Selector */}
      {renderGatewaySelector()}

      <View style={styles.labelRow}>
        <Text style={styles.label}>Your Virtual Account Details</Text>
        {getGatewayName() && (
          <View style={styles.gatewayBadge}>
            <Text style={styles.gatewayText}>{getGatewayName()}</Text>
            <TouchableOpacity onPress={refetch} style={styles.gatewayRefreshBtn}>
              <Ionicons name="refresh-outline" size={12} color="#fff" />
            </TouchableOpacity>
          </View>
        )}
      </View>

      <View style={styles.bankCard}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color="#ff3b30" size="large" />
            <Text style={styles.loadingText}>Loading account details...</Text>
          </View>
        ) : bankData && bankData.accounts.length > 0 ? (
          <>
            {bankData.accounts.map((account, index) => (
              <View 
                key={index} 
                style={[
                  styles.accountBlock,
                  index < bankData.accounts.length - 1 && styles.accountWithBorder
                ]}
              >
                <View style={styles.accountRow}>
                  <Text style={styles.accountLabel}>Bank:</Text>
                  <Text style={styles.accountValue}>{account.bankName}</Text>
                </View>

                <View style={styles.accountRow}>
                  <Text style={styles.accountLabel}>Account Name:</Text>
                  <Text style={styles.accountValue}>{account.accountName}</Text>
                </View>

                <TouchableOpacity 
                  style={styles.accountRow}
                  onPress={() => copyToClipboard(account.accountNumber, 'Account number')}
                  activeOpacity={0.7}
                >
                  <Text style={styles.accountLabel}>Account Number:</Text>
                  <View style={styles.accountNumberRow}>
                    <Text style={[styles.accountValue, styles.accountNumber]}>
                      {account.accountNumber}
                    </Text>
                    <Ionicons name="copy-outline" size={16} color="#ff3b30" />
                  </View>
                </TouchableOpacity>
              </View>
            ))}

            <View style={styles.infoBox}>
              <Ionicons name="information-circle-outline" size={16} color="#666" />
              <Text style={styles.infoText}>
                {amount 
                  ? `Transfer ${formatters.currency(Number(amount))} to the account above. Your wallet will update automatically.`
                  : 'Transfer to this account. Your wallet updates automatically within minutes.'
                }
                {'\n\n'}
                <Text style={{ fontWeight: '600', color: '#ff3b30' }}>
                  Active Gateway: {getGatewayName()}
                </Text>
                {'\n'}
                <Text style={{ fontSize: 11, color: '#666', marginTop: 5 }}>
                  If gateway shows wrong value, use "Force Refresh & Clear Cache" above
                </Text>
              </Text>
            </View>

            <TouchableOpacity 
              style={styles.refreshButton}
              onPress={refetch}
              activeOpacity={0.7}
              disabled={refreshing}
            >
              {refreshing ? (
                <ActivityIndicator color="#ff3b30" size="small" />
              ) : (
                <Ionicons name="refresh-outline" size={18} color="#ff3b30" />
              )}
              <Text style={styles.refreshButtonText}>
                {refreshing ? 'Refreshing...' : 'Refresh Account'}
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={48} color="#ff3b30" />
            <Text style={styles.errorContainerText}>
              {accountError || 'Failed to load account details'}
            </Text>
            <TouchableOpacity style={styles.retryButton} onPress={refetch}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );

  const renderCardPaymentSection = () => (
    <>
      <View style={styles.section}>
        <Text style={styles.label}>Enter Amount</Text>
        <TextInput
          style={[styles.input, error && error.includes('amount') && styles.inputError]}
          placeholder={`Enter amount (${formatters.currency(AMOUNT_LIMITS.MIN)} - ${formatters.currency(AMOUNT_LIMITS.MAX)})`}
          placeholderTextColor="#aaa"
          keyboardType="numeric"
          value={amount}
          onChangeText={(text) => { 
            setAmount(text.replace(/[^0-9]/g, '')); 
            setError(''); 
            setSuccess(''); 
          }}
        />
        {renderQuickAmounts()}
        {amount !== '' && !validators.amount(amount) && (
          <Text style={styles.validationError}>
            Amount must be between {formatters.currency(AMOUNT_LIMITS.MIN)} and {formatters.currency(AMOUNT_LIMITS.MAX)}
          </Text>
        )}
        {amount !== '' && validators.amount(amount) && (
          <Text style={styles.validationSuccess}>✓ Valid amount</Text>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Card Details</Text>
        <TextInput
          style={[styles.input, error && error.includes('card') && styles.inputError]}
          placeholder="1234 5678 9012 3456"
          placeholderTextColor="#aaa"
          value={cardInfo.cardNumber}
          keyboardType="numeric"
          maxLength={19}
          onChangeText={(text) => {
            setCardInfo({...cardInfo, cardNumber: formatters.cardNumber(text)});
            setError('');
          }}
        />
        
        <View style={styles.cardRow}>
          <TextInput
            style={[styles.inputHalf, error && error.includes('expiry') && styles.inputError]}
            placeholder="MM/YY"
            placeholderTextColor="#aaa"
            value={cardInfo.expiry}
            keyboardType="numeric"
            maxLength={5}
            onChangeText={(text) => {
              setCardInfo({...cardInfo, expiry: formatters.expiry(text)});
              setError('');
            }}
          />
          <TextInput
            style={[styles.inputHalf, error && error.includes('CVV') && styles.inputError]}
            placeholder="CVV"
            placeholderTextColor="#aaa"
            value={cardInfo.cvv}
            keyboardType="numeric"
            maxLength={4}
            secureTextEntry
            onChangeText={(text) => {
              setCardInfo({...cardInfo, cvv: text.replace(/[^0-9]/g, '')});
              setError('');
            }}
          />
        </View>
      </View>

      <TouchableOpacity 
        style={[styles.proceedBtn, (isProcessing || !amount || !validators.amount(amount)) && styles.proceedDisabled]} 
        onPress={handleCardPayment} 
        disabled={isProcessing || !amount || !validators.amount(amount)}
        activeOpacity={0.8}
      >
        {isProcessing ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color="#fff" size="small" />
            <Text style={[styles.proceedText, { marginLeft: 8 }]}>Processing...</Text>
          </View>
        ) : (
          <>
            <Ionicons name="card-outline" size={20} color="#fff" />
            <Text style={styles.proceedText}>
              Pay with Card{amount ? ` • ${formatters.currency(Number(amount))}` : ''}
            </Text>
          </>
        )}
      </TouchableOpacity>
    </>
  );

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollContent}
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refetch}
            colors={['#ff3b30']}
            tintColor="#ff3b30"
          />
        }
      >
        <View style={styles.section}>
          <Text style={styles.label}>Select Payment Method</Text>
          <View style={styles.methodGrid}>
            {PAYMENT_METHODS.map((method) => (
              <TouchableOpacity
                key={method.id}
                style={[
                  styles.methodButton, 
                  paymentMethod === method.id && styles.methodButtonActive
                ]}
                onPress={() => {
                  setPaymentMethod(method.id);
                  setError('');
                  setSuccess('');
                }}
                activeOpacity={0.7}
              >
                <Ionicons 
                  name={method.icon} 
                  size={20} 
                  color={paymentMethod === method.id ? '#ff3b30' : '#666'} 
                />
                <Text style={[
                  styles.methodText, 
                  paymentMethod === method.id && styles.methodTextActive
                ]}>
                  {method.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {bankData?.gateway && (
          <View style={styles.gatewayStatusContainer}>
            <Text style={styles.gatewayStatusText}>
              Active Payment Gateway: <Text style={styles.gatewayName}>{getGatewayName()}</Text>
            </Text>
          </View>
        )}

        {error && (
          <View style={styles.messageContainer}>
            <Text style={styles.errorText}>⚠️ {error}</Text>
          </View>
        )}
        
        {success && (
          <View style={styles.messageContainer}>
            <Text style={styles.successText}>✅ {success}</Text>
          </View>
        )}

        {paymentMethod === 'bank' ? renderBankTransferSection() : renderCardPaymentSection()}

        <View style={styles.helpContainer}>
          <Text style={styles.helpText}>
            {paymentMethod === 'bank' 
              ? 'This account is permanent and can be used anytime to fund your wallet. Wallet updates automatically within 2-5 minutes.'
              : 'Your wallet will be credited immediately after successful payment. Card payments are secured with SSL encryption.'
            }
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#f8f9fa' 
  },
  scrollContent: { 
    flex: 1 
  },
  section: { 
    margin: 16, 
    marginBottom: 24 
  },
  amountSection: {
    marginBottom: 24,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  label: { 
    fontSize: 16, 
    fontWeight: '600', 
    color: '#333',
    marginBottom: 12,
  },
  gatewayBadge: {
    backgroundColor: '#ff3b30',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  gatewayText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  gatewayRefreshBtn: {
    padding: 2,
  },
  gatewayStatusContainer: {
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 10,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ff3b30',
  },
  gatewayStatusText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  gatewayName: {
    fontWeight: '700',
    color: '#ff3b30',
  },
  gatewaySelectorContainer: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  gatewaySelectorButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ff3b30',
  },
  gatewaySelectorText: {
    color: '#ff3b30',
    fontWeight: '600',
    fontSize: 14,
  },
  gatewayOptions: {
    backgroundColor: '#fff',
    marginTop: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e8e8e8',
    overflow: 'hidden',
  },
  gatewayOption: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  gatewayOptionActive: {
    backgroundColor: '#fff5f5',
  },
  gatewayOptionText: {
    color: '#333',
    fontSize: 14,
    textAlign: 'center',
  },
  methodGrid: { 
    flexDirection: 'row', 
    gap: 12 
  },
  methodButton: { 
    paddingVertical: 16, 
    paddingHorizontal: 16, 
    borderWidth: 2, 
    borderColor: '#e8e8e8', 
    borderRadius: 12, 
    backgroundColor: '#fff', 
    flexDirection: 'row',
    alignItems: 'center', 
    justifyContent: 'center', 
    flex: 1, 
    gap: 8,
  },
  methodButtonActive: { 
    backgroundColor: '#fff5f5', 
    borderColor: '#ff3b30',
  },
  methodText: { 
    fontWeight: '600', 
    textAlign: 'center', 
    color: '#666', 
    fontSize: 13 
  },
  methodTextActive: { 
    color: '#ff3b30', 
    fontWeight: '700' 
  },
  messageContainer: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  errorText: { 
    color: '#ff3b30', 
    fontSize: 14, 
    textAlign: 'center', 
    fontWeight: '500',
    backgroundColor: '#fff5f5',
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ffdddd',
  },
  successText: { 
    color: '#28a745', 
    fontSize: 14, 
    fontWeight: '600', 
    textAlign: 'center',
    backgroundColor: '#f0f9f4',
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#c3e6cb',
  },
  bankCard: {
    padding: 20,
    borderRadius: 16,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  loadingText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
  },
  accountBlock: {
    marginBottom: 16,
    paddingBottom: 16,
  },
  accountWithBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  accountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  accountLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  accountValue: {
    fontSize: 14,
    color: '#1a1a1a',
    fontWeight: '600',
    textAlign: 'right',
    flex: 1,
    marginLeft: 12,
  },
  accountNumberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    justifyContent: 'flex-end',
  },
  accountNumber: {
    fontSize: 16,
    color: '#ff3b30',
    fontWeight: '700',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#f8f9fa',
    padding: 14,
    borderRadius: 10,
    gap: 10,
    marginTop: 8,
    marginBottom: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#666',
    lineHeight: 19,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#e8e8e8',
    borderRadius: 10,
    backgroundColor: '#fafafa',
  },
  refreshButtonText: {
    color: '#ff3b30',
    fontSize: 14,
    fontWeight: '600',
  },
  errorContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 14,
  },
  errorContainerText: {
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
    maxWidth: '80%',
  },
  retryButton: {
    backgroundColor: '#ff3b30',
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 10,
    marginTop: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: '#e8e8e8',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    backgroundColor: '#fff',
    marginBottom: 12,
    color: '#1a1a1a',
  },
  inputError: { 
    borderColor: '#ff3b30', 
    borderWidth: 2,
    backgroundColor: '#fff5f5',
  },
  inputHalf: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e8e8e8',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    backgroundColor: '#fff',
    color: '#1a1a1a',
  },
  cardRow: { 
    flexDirection: 'row', 
    gap: 12,
    marginBottom: 12,
  },
  validationError: {
    color: '#ff3b30',
    fontSize: 13,
    marginTop: -8,
    marginBottom: 8,
    fontWeight: '500',
  },
  validationSuccess: {
    color: '#28a745',
    fontSize: 13,
    marginTop: -8,
    marginBottom: 8,
    fontWeight: '600',
  },
  proceedBtn: {
    margin: 16,
    padding: 18,
    borderRadius: 12,
    backgroundColor: '#ff3b30',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: '#ff3b30',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  proceedDisabled: { 
    backgroundColor: '#ccc',
    shadowOpacity: 0,
    elevation: 0,
  },
  proceedText: { 
    color: '#fff', 
    fontSize: 16, 
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  helpContainer: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  helpText: { 
    textAlign: 'center', 
    color: '#666', 
    fontSize: 13, 
    fontStyle: 'italic',
    lineHeight: 20,
  },
  quickAmountsContainer: {
    marginTop: 8,
  },
  quickAmountsLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    marginBottom: 8,
  },
  quickAmountsScroll: {
    gap: 8,
  },
  quickAmountButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e8e8e8',
    marginRight: 8,
  },
  quickAmountButtonActive: {
    backgroundColor: '#fff5f5',
    borderColor: '#ff3b30',
  },
  quickAmountText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  quickAmountTextActive: {
    color: '#ff3b30',
    fontWeight: '600',
  },
});