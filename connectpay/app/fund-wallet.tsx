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
  Platform
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
  TIMEOUT: 30000, // 30 seconds
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
          
          // Don't retry on 401/403 errors
          if (response.status === 401 || response.status === 403) {
            throw new Error(`Authentication failed: ${errorMsg}`);
          }
          
          continue; // Try next URL
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
        
        // If this was an auth error or last URL, throw
        if (error.message.includes('Authentication') || i === urls.length - 1) {
          throw new Error(errors.join('; ') || error.message);
        }
      }
    }

    throw new Error(errors.join('; ') || 'All API endpoints failed');
  }, [token]);

  return { makeRequest };
};

const useVirtualAccount = (token: string) => {
  const [bankData, setBankData] = useState<BankData | null>(null);
  const [activeGateway, setActiveGateway] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const { makeRequest } = useAPI(token);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Replace the loadFromCache and fetchAccountDetails functions in your FundWallet component

const loadFromCache = useCallback(async () => {
  try {
    const cached = await AsyncStorage.getItem(STORAGE_KEYS.CACHED_ACCOUNT);
    if (cached) {
      const data = JSON.parse(cached);
      const cacheAge = Date.now() - data.timestamp;
      const cacheValid = cacheAge < 3600000; // 1 hour
      
      console.log('[Cache] Cache age:', cacheAge / 1000, 'seconds');
      console.log('[Cache] Cached gateway:', data.gateway);
      
      if (cacheValid) {
        console.log('[Cache] Loaded account from cache');
        setBankData(data.bankData);
        setActiveGateway(data.gateway);
        
        // Verify gateway in background - if different, refetch
        fetchActiveGateway().then(currentGateway => {
          if (currentGateway && currentGateway !== data.gateway) {
            console.log('[Cache] Gateway changed! Old:', data.gateway, 'New:', currentGateway);
            console.log('[Cache] Invalidating cache and refetching...');
            fetchAccountDetails(false); // Force refetch without cache
          }
        });
        
        return true;
      } else {
        console.log('[Cache] Cache expired');
      }
    }
  } catch (error) {
    console.log('[Cache] Load failed:', error);
  }
  return false;
}, [fetchActiveGateway]);

const fetchAccountDetails = useCallback(async (useCache = true) => {
  if (!mountedRef.current) return;
  
  console.log('[Account] Starting fetch, useCache:', useCache);
  setLoading(true);
  setError('');

  try {
    // Fetch active gateway first to check if it changed
    const currentGateway = await fetchActiveGateway();
    console.log('[Account] Current active gateway:', currentGateway);

    // Try cache only if enabled AND gateway matches
    if (useCache) {
      const cached = await AsyncStorage.getItem(STORAGE_KEYS.CACHED_ACCOUNT);
      if (cached) {
        const data = JSON.parse(cached);
        const cacheAge = Date.now() - data.timestamp;
        const cacheValid = cacheAge < 3600000;
        
        // Check if gateway has changed
        if (data.gateway !== currentGateway) {
          console.log('[Cache] Gateway mismatch! Cached:', data.gateway, 'Active:', currentGateway);
          console.log('[Cache] Invalidating cache...');
          await AsyncStorage.removeItem(STORAGE_KEYS.CACHED_ACCOUNT);
        } else if (cacheValid) {
          console.log('[Cache] Using valid cache');
          setBankData(data.bankData);
          setActiveGateway(data.gateway);
          if (mountedRef.current) {
            setLoading(false);
          }
          return;
        }
      }
    }

    // Fetch from API
    console.log('[Account] Fetching from API...');
    const accountResponse = await makeRequest(API_CONFIG.ENDPOINTS.VIRTUAL_ACCOUNT);

    if (!mountedRef.current) return;

    console.log('[Account] API response gateway:', accountResponse.data?.gateway);

    if (accountResponse.success && accountResponse.data) {
      const processed = processAccountData(accountResponse.data);
      
      // Double check gateway matches
      if (currentGateway && processed.gateway !== currentGateway) {
        console.warn('[Account] WARNING: API returned different gateway than active gateway!');
        console.warn('[Account] API gateway:', processed.gateway, 'Active gateway:', currentGateway);
      }
      
      setBankData(processed);
      setActiveGateway(processed.gateway);
      await saveToCache(processed, processed.gateway);
      console.log('[Account] Successfully loaded account details for gateway:', processed.gateway);
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
    } else if (errorMessage.includes('404') || errorMessage.includes('not found')) {
      Alert.alert(
        'Account Setup Required',
        'Your virtual account needs to be set up. Please contact support.',
        [{ text: 'OK' }]
      );
    } else {
      Alert.alert(
        'Connection Error',
        errorMessage,
        [{ text: 'OK' }]
      );
    }
  } finally {
    if (mountedRef.current) {
      setLoading(false);
    }
  }
}, [makeRequest, fetchActiveGateway, saveToCache, processAccountData]);

  useEffect(() => {
    if (token && token.trim()) {
      console.log('[Account] Token available, fetching account details');
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
    refetch: () => fetchAccountDetails(false),
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

  const { makeRequest } = useAPI(token);
  const { bankData, activeGateway, loading, error: accountError, refetch } = useVirtualAccount(token);

  // Debug token on mount
  useEffect(() => {
    console.log('[FundWallet] Component mounted with token:', token ? 'Available' : 'Missing');
    console.log('[FundWallet] Token length:', token?.length || 0);
  }, []);

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

    // Validation
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
        
        // Reset form and callback
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
  }, [amount, cardInfo, makeRequest, onSuccess]);

  const getGatewayName = useCallback(() => {
    const gateway = bankData?.gateway || activeGateway;
    return GATEWAY_NAMES[gateway as keyof typeof GATEWAY_NAMES] || 'Payment Gateway';
  }, [bankData, activeGateway]);

  const renderBankTransferSection = () => (
    <View style={styles.section}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>Your Virtual Account Details</Text>
        {bankData?.gateway && (
          <View style={styles.gatewayBadge}>
            <Text style={styles.gatewayText}>{getGatewayName()}</Text>
          </View>
        )}
      </View>

      <View style={styles.bankCard}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color="#ff3b30" size="small" />
            <Text style={styles.loadingText}>Loading account...</Text>
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
                {bankData.accounts.length > 1 
                  ? 'Transfer to any account above. Your wallet updates automatically within minutes.'
                  : 'Transfer to this account. Your wallet updates automatically within minutes.'
                }
              </Text>
            </View>

            <TouchableOpacity 
              style={styles.refreshButton}
              onPress={refetch}
              activeOpacity={0.7}
            >
              <Ionicons name="refresh-outline" size={18} color="#ff3b30" />
              <Text style={styles.refreshButtonText}>Refresh Account</Text>
            </TouchableOpacity>
          </>
        ) : (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={48} color="#ff3b30" />
            <Text style={styles.errorContainerText}>
              {accountError || 'Failed to load account'}
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
      {/* Amount Input - Moved to top for card */}
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
        {amount !== '' && !validators.amount(amount) && (
          <Text style={styles.validationError}>
            Amount must be between {formatters.currency(AMOUNT_LIMITS.MIN)} and {formatters.currency(AMOUNT_LIMITS.MAX)}
          </Text>
        )}
        {amount !== '' && validators.amount(amount) && (
          <Text style={styles.validationSuccess}>✓ Valid amount</Text>
        )}
      </View>

      {/* Card Details */}
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

      {/* Pay Button */}
      <TouchableOpacity 
        style={[styles.proceedBtn, (isProcessing || !amount) && styles.proceedDisabled]} 
        onPress={handleCardPayment} 
        disabled={isProcessing || !amount}
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
      >
        {/* Payment Method Selection */}
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

        {/* Messages */}
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

        {/* Content based on payment method */}
        {paymentMethod === 'bank' ? renderBankTransferSection() : renderCardPaymentSection()}

        {/* Help Text */}
        <View style={styles.helpContainer}>
          <Text style={styles.helpText}>
            {paymentMethod === 'bank' 
              ? 'This account is permanent and can be used anytime to fund your wallet.'
              : 'Your wallet will be credited immediately after successful payment.'
            }
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

// ============================================================================
// Styles
// ============================================================================

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
  },
  gatewayText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
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
    paddingVertical: 30,
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
  quickAmountGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  quickAmountBtn: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#e8e8e8',
    backgroundColor: '#fafafa',
    minWidth: '22%',
  },
  quickAmountSelected: {
    backgroundColor: '#ff3b30',
    borderColor: '#ff3b30',
  },
  quickAmountText: {
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },
  quickAmountTextSelected: {
    color: '#fff',
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
});