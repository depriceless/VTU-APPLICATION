import React, { useState, useEffect, useContext } from 'react';
import BetFundingSuccessModal from './BetFundingSuccessModal';

import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  ScrollView,
  Modal,
  FlatList,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import * as Contacts from 'expo-contacts';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthContext } from '../contexts/AuthContext';

// API configuration - unified approach
const API_CONFIG = {
  BASE_URL: Platform.OS === 'web' 
    ? `${process.env.EXPO_PUBLIC_API_URL_WEB}/api`
    : `${process.env.EXPO_PUBLIC_API_URL}/api`,
  FALLBACK_URL: 'https://vtu-application.onrender.com/api', // fallback for development
};

interface Contact {
  id: string;
  name: string;
  phoneNumbers: { number: string }[];
}

interface RecentBetting {
  customerId: string;
  provider: string;
  customerName?: string;
  timestamp: number;
}

interface UserBalance {
  main: number;
  bonus: number;
  total: number;
  amount: number;
  currency: string;
  lastUpdated: string;
}

interface PinStatus {
  isPinSet: boolean;
  hasPinSet: boolean;
  isLocked: boolean;
  lockTimeRemaining: number;
  attemptsRemaining: number;
}

interface BettingProvider {
  id: string;
  label: string;
  logo: any;
  minAmount?: number;
  maxAmount?: number;
}

export default function FundBetting() {
  // Use AuthContext when available, fallback to local storage
  const authContext = useContext(AuthContext);
  const { token, user, balance, refreshBalance } = authContext || {};

  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [customerId, setCustomerId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [amount, setAmount] = useState('');
  const [pin, setPin] = useState('');
  const [contactsList, setContactsList] = useState<Contact[]>([]);
  const [recentBetting, setRecentBetting] = useState<RecentBetting[]>([]);
  const [userBalance, setUserBalance] = useState<UserBalance | null>(null);
  const [pinStatus, setPinStatus] = useState<PinStatus | null>(null);
  const [showContactsModal, setShowContactsModal] = useState(false);
  const [showRecentsModal, setShowRecentsModal] = useState(false);
  const [isLoadingContacts, setIsLoadingContacts] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);
  const [isValidatingPin, setIsValidatingPin] = useState(false);
  const [pinError, setPinError] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successData, setSuccessData] = useState<any>(null);

  // Quick amount presets - similar to airtime
  const quickAmounts = [500, 1000, 2000, 5000, 10000, 20000, 50000, 100000];

  // Betting providers with metadata
  const providers: BettingProvider[] = [
    { 
      id: 'bet9ja', 
      label: 'BET9JA', 
      logo: require('../assets/images/bet9ja.jpg'),
      minAmount: 100,
      maxAmount: 500000
    },
    { 
      id: 'sportybet', 
      label: 'SPORTYBET', 
      logo: require('../assets/images/sportybet.png'),
      minAmount: 100,
      maxAmount: 500000
    },
    { 
      id: 'nairabet', 
      label: 'NAIRABET', 
      logo: require('../assets/images/nairabet.png'),
      minAmount: 100,
      maxAmount: 500000
    },
    { 
      id: 'betway', 
      label: 'BETWAY', 
      logo: require('../assets/images/betway.png'),
      minAmount: 100,
      maxAmount: 500000
    },
    { 
      id: '1xbet', 
      label: '1XBET', 
      logo: require('../assets/images/1xbet.png'),
      minAmount: 100,
      maxAmount: 500000
    },
    { 
      id: 'betking', 
      label: 'BETKING', 
      logo: require('../assets/images/betking.jpg'),
      minAmount: 100,
      maxAmount: 500000
    },
  ];

  // Validation logic
  const selectedProviderData = providers.find(p => p.id === selectedProvider);
  const isCustomerIdValid = customerId.trim().length >= 3;
  const amountNum = parseInt(amount) || 0;
  const isAmountValid = selectedProviderData 
    ? amountNum >= (selectedProviderData.minAmount || 100) && amountNum <= (selectedProviderData.maxAmount || 500000)
    : amountNum >= 100 && amountNum <= 500000;
  const hasEnoughBalance = userBalance ? amountNum <= userBalance.total : true;
  const canProceed = isCustomerIdValid && isAmountValid && selectedProvider && hasEnoughBalance;
  const isPinValid = pin.length === 4 && /^\d{4}$/.test(pin);

  // Initialize data on mount
  useEffect(() => {
    initializeComponent();
  }, []);

  // Refresh balance when stepping to review
  useEffect(() => {
    if (currentStep === 2) {
      fetchUserBalance();
    }
  }, [currentStep]);

  // Clear PIN when stepping to PIN entry
  useEffect(() => {
    if (currentStep === 3) {
      setPin('');
      setPinError('');
      checkPinStatus();
    }
  }, [currentStep]);

  // Save form state on changes
  useEffect(() => {
    saveFormState();
  }, [customerId, customerName, amount, selectedProvider]);

  const initializeComponent = async () => {
    try {
      await Promise.all([
        loadRecentBetting(),
        loadFormState(),
        initializeBalance()
      ]);

      // Add small delay for better UX
      setTimeout(() => {
        fetchUserBalance();
        checkPinStatus();
      }, 1000);
    } catch (error) {
      console.error('Initialization error:', error);
    }
  };

  const initializeBalance = async () => {
    // Try to use AuthContext balance first
    if (balance?.amount) {
      const balanceAmount = parseFloat(balance.amount) || 0;
      setUserBalance({
        main: balanceAmount,
        bonus: 0,
        total: balanceAmount,
        amount: balanceAmount,
        currency: balance.currency || "NGN",
        lastUpdated: balance.lastUpdated || new Date().toISOString(),
      });
    } else {
      // Fallback to cached balance
      try {
        const cachedBalance = await AsyncStorage.getItem("userBalance");
        if (cachedBalance) {
          const parsedBalance = JSON.parse(cachedBalance);
          setUserBalance(parsedBalance);
        }
      } catch (error) {
        console.log('No cached balance found');
      }
    }
  };

  // Enhanced token management
  const getAuthToken = async (): Promise<string> => {
    // Try AuthContext first
    if (token && token.trim() !== '' && token !== 'undefined') {
      console.log('Using AuthContext token');
      return token;
    }

    // Fallback to AsyncStorage with multiple key attempts
    const tokenKeys = ['userToken', 'authToken', 'token', 'access_token'];
    
    for (const key of tokenKeys) {
      try {
        const storedToken = await AsyncStorage.getItem(key);
        if (storedToken && storedToken.trim() !== '' && storedToken !== 'undefined' && storedToken !== 'null') {
          const cleanToken = storedToken.trim();
          // Validate JWT structure
          const tokenParts = cleanToken.split('.');
          if (tokenParts.length === 3) {
            console.log(`Found valid token with key: ${key}`);
            return cleanToken;
          }
        }
      } catch (error) {
        console.log(`Error checking token key ${key}:`, error);
      }
    }

    throw new Error('No valid authentication token found');
  };

  // Enhanced API request handler
// Enhanced API request handler - REPLACE your existing makeApiRequest function
const makeApiRequest = async (endpoint: string, options: any = {}) => {
  console.log(`API Request: ${endpoint}`);
  
  try {
    const authToken = await getAuthToken();
    
    const requestConfig = {
      method: 'GET',
      ...options,
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...options.headers,
      },
    };

    // Try primary URL first, then fallback
    const urls = [API_CONFIG.BASE_URL, API_CONFIG.FALLBACK_URL];
    let lastError: Error | null = null;

    for (const baseUrl of urls) {
      try {
        const fullUrl = `${baseUrl}${endpoint}`;
        console.log(`Trying URL: ${fullUrl}`);
        
        const response = await fetch(fullUrl, requestConfig);
        
        let responseText = '';
        try {
          responseText = await response.text();
        } catch (textError) {
          throw new Error('Unable to read server response');
        }

        let data = {};
        if (responseText.trim()) {
          try {
            data = JSON.parse(responseText);
          } catch (parseError) {
            throw new Error(`Invalid JSON response. Status: ${response.status}`);
          }
        }

        // Handle authentication errors
        if (response.status === 401) {
          await clearAuthTokens();
          throw new Error('Session expired. Please login again.');
        }

        if (!response.ok) {
          const errorMessage = (data as any)?.message || (data as any)?.error || `HTTP ${response.status}`;
          
          // IMPORTANT: For service unavailability, preserve the exact error message
          if (endpoint === '/purchase' && data && typeof data === 'object') {
            const error = new Error(errorMessage) as any;
            error.responseData = data;
            error.httpStatus = response.status;
            error.isServiceError = errorMessage.toLowerCase().includes('unavailable') || 
                                  errorMessage.toLowerCase().includes('service') ||
                                  errorMessage.toLowerCase().includes('maintenance');
            throw error;
          }
          
          throw new Error(errorMessage);
        }

        console.log(`API request successful via ${baseUrl}`);
        return data;
        
      } catch (error) {
        console.log(`Failed with ${baseUrl}:`, error.message);
        lastError = error as Error;
        
        // Don't retry for auth errors or service errors
        if (error.message.includes('Session expired') || 
            error.message.includes('401') ||
            (error as any).isServiceError) {
          throw error;
        }
      }
    }

    // All URLs failed
    throw lastError || new Error('All API endpoints failed');

  } catch (error) {
    console.error(`API Error for ${endpoint}:`, error.message);

    // IMPORTANT: Don't mask service unavailability errors as network errors
    if ((error as any).isServiceError) {
      throw error; // Preserve service error messages
    }

    if (error.name === 'TypeError' && error.message.includes('Network request failed')) {
      throw new Error('Network connection failed. Please check your internet connection.');
    }

    throw error;
  }
};

  const clearAuthTokens = async () => {
    const tokenKeys = ['userToken', 'authToken', 'token', 'access_token'];
    for (const key of tokenKeys) {
      try {
        await AsyncStorage.removeItem(key);
      } catch (error) {
        console.log(`Error clearing ${key}:`, error);
      }
    }
  };

  const checkPinStatus = async () => {
    try {
      console.log('Checking PIN status...');
      const response = await makeApiRequest('/purchase/pin-status');
      
      if (response.success) {
        setPinStatus(response);
        console.log('PIN status updated:', response);
      }
    } catch (error) {
      console.error('Error checking PIN status:', error);
      // Set default PIN status to allow form to continue
      setPinStatus({
        isPinSet: true,
        hasPinSet: true,
        isLocked: false,
        lockTimeRemaining: 0,
        attemptsRemaining: 3,
      });
    }
  };

  const fetchUserBalance = async () => {
    setIsLoadingBalance(true);
    try {
      console.log("Fetching balance...");
      
      // Try AuthContext refresh first
      if (refreshBalance) {
        try {
          await refreshBalance();
          
          if (balance?.amount) {
            const balanceAmount = parseFloat(balance.amount) || 0;
            const updatedBalance: UserBalance = {
              main: balanceAmount,
              bonus: 0,
              total: balanceAmount,
              amount: balanceAmount,
              currency: balance.currency || "NGN",
              lastUpdated: balance.lastUpdated || new Date().toISOString(),
            };

            setUserBalance(updatedBalance);
            await AsyncStorage.setItem("userBalance", JSON.stringify(updatedBalance));
            console.log("Balance updated from AuthContext:", updatedBalance);
            return;
          }
        } catch (contextError) {
          console.log("AuthContext balance refresh failed, trying API:", contextError);
        }
      }

      // Fallback to direct API call
      const balanceData = await makeApiRequest("/balance");
      
      if (balanceData.success && balanceData.balance) {
        const balanceAmount = parseFloat(balanceData.balance.amount) || 0;
        
        const updatedBalance: UserBalance = {
          main: balanceAmount,
          bonus: 0,
          total: balanceAmount,
          amount: balanceAmount,
          currency: balanceData.balance.currency || "NGN",
          lastUpdated: balanceData.balance.lastUpdated || new Date().toISOString(),
        };

        setUserBalance(updatedBalance);
        await AsyncStorage.setItem("userBalance", JSON.stringify(updatedBalance));
        console.log("Balance fetched from API:", updatedBalance);
      } else {
        throw new Error(balanceData.message || "Balance fetch failed");
      }
    } catch (error) {
      console.error("Balance fetch error:", error);
      
      // Use cached balance as ultimate fallback
      try {
        const cachedBalance = await AsyncStorage.getItem("userBalance");
        if (cachedBalance) {
          const parsedBalance = JSON.parse(cachedBalance);
          setUserBalance(parsedBalance);
          console.log("Using cached balance:", parsedBalance);
        }
      } catch (cacheError) {
        console.error("Cache read error:", cacheError);
        setUserBalance(null);
      }
    } finally {
      setIsLoadingBalance(false);
    }
  };

  const saveFormState = async () => {
    try {
      const formState = { customerId, customerName, amount, selectedProvider };
      await AsyncStorage.setItem('bettingFormState', JSON.stringify(formState));
    } catch (error) {
      console.log('Error saving form state:', error);
    }
  };

  const loadFormState = async () => {
    try {
      const savedState = await AsyncStorage.getItem('bettingFormState');
      if (savedState) {
        const { 
          customerId: savedId, 
          customerName: savedName, 
          amount: savedAmount, 
          selectedProvider: savedProvider 
        } = JSON.parse(savedState);
        
        setCustomerId(savedId || '');
        setCustomerName(savedName || '');
        setAmount(savedAmount || '');
        setSelectedProvider(savedProvider || null);
      }
    } catch (error) {
      console.log('Error loading form state:', error);
    }
  };

  const saveRecentBetting = async (customerId: string, provider: string, customerName?: string) => {
    try {
      const recent = await AsyncStorage.getItem('recentBetting');
      let recentList: RecentBetting[] = recent ? JSON.parse(recent) : [];

      // Remove existing entry for same customer/provider
      recentList = recentList.filter(item => 
        item.customerId !== customerId || item.provider !== provider
      );
      
      // Add new entry at beginning
      recentList.unshift({
        customerId,
        provider,
        customerName,
        timestamp: Date.now()
      });
      
      // Keep only last 10 entries
      recentList = recentList.slice(0, 10);

      await AsyncStorage.setItem('recentBetting', JSON.stringify(recentList));
      setRecentBetting(recentList);
    } catch (error) {
      console.log('Error saving recent betting:', error);
    }
  };

  const loadRecentBetting = async () => {
    try {
      const recent = await AsyncStorage.getItem('recentBetting');
      if (recent) {
        setRecentBetting(JSON.parse(recent));
      }
    } catch (error) {
      console.log('Error loading recent betting:', error);
    }
  };

  // Contact selection functions
  const selectContact = async () => {
    setIsLoadingContacts(true);
    try {
      const { status } = await Contacts.requestPermissionsAsync();
      if (status === 'granted') {
        const { data } = await Contacts.getContactsAsync({
          fields: [Contacts.Fields.PhoneNumbers, Contacts.Fields.Name],
          pageSize: 100,
          sort: Contacts.SortTypes.FirstName,
        });
        
        const validContacts = data.filter(
          c => c.phoneNumbers && c.phoneNumbers.length > 0
        );
        
        if (validContacts.length > 0) {
          setContactsList(validContacts);
          setShowContactsModal(true);
        } else {
          Alert.alert('No contacts', 'No contacts with phone numbers found.');
        }
      } else {
        Alert.alert('Permission denied', 'Cannot access contacts without permission.');
      }
    } catch (error) {
      console.error('Contact selection error:', error);
      Alert.alert('Error', 'Failed to load contacts. Please try again.');
    } finally {
      setIsLoadingContacts(false);
    }
  };

  const showRecentBettingList = () => {
    if (recentBetting.length > 0) {
      setShowRecentsModal(true);
    } else {
      Alert.alert('No recent betting', 'You haven\'t made any recent betting transactions.');
    }
  };

  const handleContactSelect = (number: string, name?: string) => {
    setCustomerName(name || '');
    setShowContactsModal(false);
  };

  const handleRecentSelect = (item: RecentBetting) => {
    setCustomerId(item.customerId);
    setCustomerName(item.customerName || '');
    setSelectedProvider(item.provider);
    setShowRecentsModal(false);
  };

  const handleQuickAmount = (quickAmount: number) => {
    setAmount(quickAmount.toString());
  };

  // Main payment processing function
  // REPLACE your existing validatePinAndPurchase function with this:
const validatePinAndPurchase = async () => {
  console.log('=== BETTING PAYMENT START ===');
  
  if (!isPinValid) {
    console.log('PIN invalid:', pin);
    setPinError('PIN must be exactly 4 digits');
    return;
  }

  console.log('Starting betting fund process...');
  setIsValidatingPin(true);
  setIsProcessingPayment(true);
  setPinError('');

  try {
    const payload = {
      type: 'fund_betting',
      provider: selectedProvider,
      customerId: customerId.trim(),
      customerName: customerName.trim(),
      amount: amountNum,
      pin: pin,
    };

    console.log('Betting fund payload:', payload);

    const response = await makeApiRequest('/purchase', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    console.log('Betting fund response:', response);

    if (response.success === true) {
      console.log('Betting fund successful!');
      
      // Save to recent betting
      await saveRecentBetting(customerId, selectedProvider!, customerName);
      
      // Update balance
      if (response.newBalance) {
        const balanceAmount = response.newBalance.amount || 
                             response.newBalance.totalBalance || 
                             response.newBalance.mainBalance || 0;
        
        const updatedBalance: UserBalance = {
          main: balanceAmount,
          bonus: 0,
          total: balanceAmount,
          amount: balanceAmount,
          currency: response.newBalance.currency || "NGN",
          lastUpdated: response.newBalance.lastUpdated || new Date().toISOString(),
        };

        setUserBalance(updatedBalance);
        await AsyncStorage.setItem("userBalance", JSON.stringify(updatedBalance));
        console.log('Balance updated after transaction:', updatedBalance);

        // Update AuthContext if available
        if (refreshBalance) {
          try {
            await refreshBalance();
          } catch (error) {
            console.log('AuthContext refresh failed:', error);
          }
        }
      }

      // Clear form state
      await AsyncStorage.removeItem('bettingFormState');

      // Prepare success data
      const providerName = providers.find(p => p.id === selectedProvider)?.label || selectedProvider?.toUpperCase();
      setSuccessData({
        transaction: response.transaction || {},
        providerName,
        customerId,
        customerName,
        amount: response.transaction?.amount || amountNum,
        newBalance: response.newBalance
      });

      // Show success modal after brief delay
      setTimeout(() => {
        setShowSuccessModal(true);
      }, 300);

    } else {
      console.log('Betting fund failed:', response.message);
      
      if (response.message && response.message.toLowerCase().includes('pin')) {
        setPinError(response.message);
      } else {
        Alert.alert('Transaction Failed', response.message || 'Payment could not be processed');
      }
    }

  } catch (error: any) {
    console.error('Betting fund error:', error);
    
    // IMPROVED ERROR HANDLING - Check for service errors first
    if (error.message && (
        error.message.includes('Fund Betting Account service is currently unavailable') ||
        error.message.includes('service is currently unavailable') ||
        error.message.includes('maintenance') ||
        error.message.includes('unavailable')
    )) {
      Alert.alert('Service Unavailable', error.message);
      return;
    }
    
    if (error.message.includes('locked') || error.message.includes('attempts')) {
      setPinError(error.message);
    } else if (error.message.includes('PIN') || error.message.includes('pin')) {
      setPinError(error.message);
    } else if (error.message.includes('Session expired')) {
      Alert.alert('Session Expired', 'Please login again to continue.');
    } else {
      Alert.alert('Payment Error', error.message || 'Unable to process payment. Please try again.');
    }

  } finally {
    setIsValidatingPin(false);
    setIsProcessingPayment(false);
    console.log('=== BETTING PAYMENT END ===');
  }
};

  // Success modal handlers
  const handlePlaceBet = () => {
    console.log('User selected: Place a Bet');
    setShowSuccessModal(false);
    setSuccessData(null);
    // Navigate to betting screen if needed
  };

  const handleCloseBettingModal = () => {
    console.log('User closed betting success modal');
    setShowSuccessModal(false);
    setSuccessData(null);
    // Reset to step 1 for new transaction
    setCurrentStep(1);
    resetForm();
  };

  const handleFundMore = () => {
    console.log('User selected: Fund More');
    setShowSuccessModal(false);
    setSuccessData(null);
    resetForm();
  };

  const resetForm = () => {
    setCurrentStep(1);
    setCustomerId('');
    setCustomerName('');
    setAmount('');
    setSelectedProvider(null);
    setPin('');
    setPinError('');
  };

  return (
    <View style={styles.container}>
      {/* STEP 1: FORM INPUT */}
      {currentStep === 1 && (
        <ScrollView
          style={styles.scrollContent}
          contentContainerStyle={{ paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Quick Options */}
          <View style={styles.section}>
            <Text style={styles.label}>Quick Options</Text>
            <View style={styles.buttonRow}>
              <TouchableOpacity 
                style={[styles.actionBtn, { flex: 1, marginRight: 8 }]} 
                onPress={selectContact}
                disabled={isLoadingContacts}
              >
                {isLoadingContacts ? (
                  <ActivityIndicator size="small" color="#555" />
                ) : (
                  <Text style={styles.actionBtnText}>Contacts</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.actionBtn, { flex: 1, marginLeft: 8 }]} 
                onPress={showRecentBettingList}
              >
                <Text style={styles.actionBtnText}>Recent ({recentBetting.length})</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Provider Selection */}
          <View style={styles.section}>
            <Text style={styles.label}>Select Betting Platform</Text>
            <View style={styles.providersContainer}>
              {providers.map((provider) => (
                <TouchableOpacity
                  key={provider.id}
                  style={[
                    styles.providerCard,
                    selectedProvider === provider.id && styles.providerSelected,
                  ]}
                  onPress={() => setSelectedProvider(provider.id)}
                >
                  <Image source={provider.logo} style={styles.providerLogo} />
                  <Text style={styles.providerLabel}>{provider.label}</Text>
                  {selectedProvider === provider.id && (
                    <View style={styles.selectedIndicator}>
                      <Text style={styles.selectedIndicatorText}>✓</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Customer Details */}
          <View style={styles.section}>
            <Text style={styles.label}>Account Details</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter betting account ID/username"
              value={customerId}
              onChangeText={setCustomerId}
              autoCapitalize="none"
              placeholderTextColor="#999"
            />
            {customerId !== '' && !isCustomerIdValid && (
              <Text style={styles.error}>Account ID must be at least 3 characters</Text>
            )}
            {customerId !== '' && isCustomerIdValid && (
              <Text style={styles.success}>✓ Valid account ID</Text>
            )}
            
            <TextInput
              style={[styles.input, { marginTop: 12 }]}
              placeholder="Account holder name (optional)"
              value={customerName}
              onChangeText={setCustomerName}
              placeholderTextColor="#999"
            />
          </View>

          {/* Quick Amount Selection */}
          <View style={styles.section}>
            <Text style={styles.label}>Quick Amount Selection</Text>
            <View style={styles.quickAmountGrid}>
              {quickAmounts.map((quickAmount) => (
                <TouchableOpacity
                  key={quickAmount}
                  style={[
                    styles.quickAmountBtn,
                    amount === quickAmount.toString() && styles.quickAmountSelected
                  ]}
                  onPress={() => handleQuickAmount(quickAmount)}
                >
                  <Text style={[
                    styles.quickAmountText,
                    amount === quickAmount.toString() && styles.quickAmountSelectedText
                  ]}>
                    ₦{quickAmount.toLocaleString()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Custom Amount */}
          <View style={styles.section}>
            <Text style={styles.label}>Custom Amount</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              placeholder={`Enter amount (₦${selectedProviderData?.minAmount || 100} - ₦${selectedProviderData?.maxAmount?.toLocaleString() || '500,000'})`}
              value={amount}
              onChangeText={setAmount}
              placeholderTextColor="#999"
            />
            {amount !== '' && !isAmountValid && (
              <Text style={styles.error}>
                Amount must be between ₦{selectedProviderData?.minAmount || 100} and ₦{selectedProviderData?.maxAmount?.toLocaleString() || '500,000'}
              </Text>
            )}
            {amount !== '' && isAmountValid && hasEnoughBalance && (
              <Text style={styles.success}>✓ Valid amount</Text>
            )}
            {amount !== '' && isAmountValid && !hasEnoughBalance && userBalance && (
              <Text style={styles.error}>
                Insufficient balance. Available: ₦{userBalance.total.toLocaleString()}
              </Text>
            )}
          </View>

          {/* Continue Button */}
          <TouchableOpacity
            style={[styles.proceedBtn, !canProceed && styles.proceedDisabled]}
            disabled={!canProceed}
            onPress={() => setCurrentStep(2)}
          >
            <Text style={styles.proceedText}>
              {canProceed 
                ? `Continue • ₦${amountNum.toLocaleString()}` 
                : 'review purchase'
              }
            </Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* STEP 2: REVIEW & CONFIRMATION */}
      {currentStep === 2 && (
        <ScrollView
          style={styles.scrollContent}
          contentContainerStyle={{ paddingBottom: 40 }}
        >
          {/* Balance Display */}
          <View style={styles.balanceCard}>
            <View style={styles.balanceHeader}>
              <Text style={styles.balanceTitle}>Wallet Balance</Text>
              <TouchableOpacity 
                style={styles.refreshBtn} 
                onPress={fetchUserBalance}
                disabled={isLoadingBalance}
              >
                {isLoadingBalance ? (
                  <ActivityIndicator size="small" color="#ff3b30" />
                ) : (
                  <Text style={styles.refreshText}>Refresh</Text>
                )}
              </TouchableOpacity>
            </View>

            {userBalance ? (
              <>
                <Text style={styles.totalBalance}>
                  ₦{Number(userBalance.total || userBalance.amount || 0).toLocaleString()}
                </Text>

                <Text style={styles.lastUpdated}>
                  Last updated: {new Date(userBalance.lastUpdated || Date.now()).toLocaleTimeString()}
                </Text>

                {amountNum > 0 && (
                  <View style={styles.transactionPreview}>
                    <Text style={styles.previewLabel}>After transaction:</Text>
                    <Text style={[
                      styles.previewAmount,
                      (userBalance.total - amountNum) < 0 ? styles.insufficientPreview : styles.sufficientPreview
                    ]}>
                      ₦{Math.max(0, (userBalance.total || userBalance.amount || 0) - amountNum).toLocaleString()}
                    </Text>
                  </View>
                )}

                {amountNum > (userBalance.total || userBalance.amount || 0) && (
                  <View style={styles.insufficientBalanceWarning}>
                    <Text style={styles.warningText}>
                      Insufficient balance for this transaction
                    </Text>
                    <TouchableOpacity 
                      style={styles.topUpBtn}
                      onPress={() => {/* Navigate to top-up */}}
                    >
                      <Text style={styles.topUpBtnText}>Top Up Wallet</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </>
            ) : (
              <View style={styles.loadingBalance}>
                <Text style={styles.noBalanceText}>
                  {isLoadingBalance ? 'Loading balance...' : 'Unable to load balance'}
                </Text>
                {!isLoadingBalance && (
                  <TouchableOpacity 
                    style={styles.retryBtn}
                    onPress={fetchUserBalance}
                  >
                    <Text style={styles.retryBtnText}>Tap to Retry</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
    
          {/* Transaction Summary */}
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Transaction Summary</Text>

            {selectedProvider && (
              <View style={styles.summaryRow}>
                <View style={styles.summaryLeft}>
                  <Image
                    source={providers.find((p) => p.id === selectedProvider)?.logo}
                    style={styles.summaryLogo}
                  />
                  <Text style={styles.summaryText}>
                    {providers.find((p) => p.id === selectedProvider)?.label} Funding
                  </Text>
                </View>
              </View>
            )}

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Account ID:</Text>
              <Text style={styles.summaryValue}>{customerId}</Text>
            </View>

            {customerName && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Account Name:</Text>
                <Text style={styles.summaryValue}>{customerName}</Text>
              </View>
            )}

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Amount:</Text>
              <Text style={[styles.summaryValue, styles.summaryAmount]}>
                ₦{amountNum.toLocaleString()}
              </Text>
            </View>

            <View style={styles.summaryDivider} />

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total Charge:</Text>
              <Text style={[styles.summaryValue, styles.summaryTotal]}>
                ₦{amountNum.toLocaleString()}
              </Text>
            </View>

            {userBalance && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Remaining Balance:</Text>
                <Text style={[
                  styles.summaryValue, 
                  styles.summaryBalance,
                  (userBalance.total - amountNum) < 0 ? styles.negativeBalance : {}
                ]}>
                  ₦{Math.max(0, userBalance.total - amountNum).toLocaleString()}
                </Text>
              </View>
            )}
          </View>

          {/* Action Buttons */}
          <TouchableOpacity
            style={[
              styles.proceedBtn, 
              !hasEnoughBalance && styles.proceedDisabled
            ]}
            disabled={!hasEnoughBalance}
            onPress={() => setCurrentStep(3)}
          >
            <Text style={styles.proceedText}>
              {!hasEnoughBalance ? 'Insufficient Balance' : 'Confirm with PIN'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.proceedBtn, styles.backBtn]}
            onPress={() => setCurrentStep(1)}
          >
            <Text style={[styles.proceedText, styles.backBtnText]}>← Edit Details</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* STEP 3: PIN VERIFICATION */}
      {currentStep === 3 && (
        <ScrollView
          style={styles.scrollContent}
          contentContainerStyle={{ paddingBottom: 40 }}
        >
          {/* PIN Status Checks */}
          {pinStatus?.isLocked && (
            <View style={styles.lockedCard}>
              <Text style={styles.lockedTitle}>Account Locked</Text>
              <Text style={styles.lockedText}>
                Too many failed PIN attempts. Please wait {pinStatus.lockTimeRemaining} minutes before trying again.
              </Text>
              <TouchableOpacity 
                style={styles.refreshBtn}
                onPress={checkPinStatus}
              >
                <Text style={styles.refreshText}>Check Status</Text>
              </TouchableOpacity>
            </View>
          )}

          {!pinStatus?.isPinSet && !pinStatus?.isLocked && (
            <View style={styles.noPinCard}>
              <Text style={styles.noPinTitle}>PIN Required</Text>
              <Text style={styles.noPinText}>
                You need to set up a 4-digit transaction PIN in your account settings before making transactions.
              </Text>
            </View>
          )}

          {pinStatus?.isPinSet && !pinStatus?.isLocked && (
            <>
              {/* Final Transaction Summary */}
              <View style={styles.pinSummaryCard}>
                <Text style={styles.pinSummaryTitle}>Confirm Transaction</Text>

                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Platform:</Text>
                  <Text style={styles.summaryValue}>
                    {providers.find((p) => p.id === selectedProvider)?.label}
                  </Text>
                </View>

                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Account:</Text>
                  <Text style={styles.summaryValue}>{customerId}</Text>
                </View>

                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Amount:</Text>
                  <Text style={[styles.summaryValue, styles.summaryAmount]}>
                    ₦{amountNum.toLocaleString()}
                  </Text>
                </View>
              </View>

              {/* PIN Input */}
              <View style={styles.pinCard}>
                <Text style={styles.pinTitle}>Enter Your Transaction PIN</Text>

                {pinStatus?.attemptsRemaining < 3 && (
                  <Text style={styles.attemptsWarning}>
                    Warning: {pinStatus.attemptsRemaining} attempts remaining
                  </Text>
                )}

                <View style={styles.pinInputContainer}>
                  <TextInput
                    style={[styles.pinInput, pinError ? styles.pinInputError : {}]}
                    value={pin}
                    onChangeText={(text) => {
                      setPin(text.replace(/\D/g, '').substring(0, 4));
                      setPinError('');
                    }}
                    keyboardType="numeric"
                    secureTextEntry={true}
                    placeholder="••••"
                    maxLength={4}
                    autoFocus={true}
                    placeholderTextColor="#999"
                  />
                </View>

                {pinError ? (
                  <Text style={styles.pinError}>{pinError}</Text>
                ) : (
                  <Text style={styles.pinHelp}>
                    Enter your 4-digit PIN to authorize this betting fund transaction
                  </Text>
                )}

                {/* PIN Dots Indicator */}
                <View style={styles.pinDotsContainer}>
                  {[0, 1, 2, 3].map((index) => (
                    <View
                      key={index}
                      style={[
                        styles.pinDot,
                        pin.length > index && styles.pinDotFilled,
                        pinError && styles.pinDotError
                      ]}
                    />
                  ))}
                </View>
              </View>

              {/* Confirm Transaction Button */}
              <TouchableOpacity
                style={[
                  styles.proceedBtn,
                  (!isPinValid || isValidatingPin || isProcessingPayment) && styles.proceedDisabled
                ]}
                disabled={!isPinValid || isValidatingPin || isProcessingPayment}
                onPress={validatePinAndPurchase}
              >
                {isValidatingPin || isProcessingPayment ? (
                  <View style={styles.loadingRow}>
                    <ActivityIndicator size="small" color="#fff" />
                    <Text style={[styles.proceedText, { marginLeft: 8 }]}>
                      {isProcessingPayment ? 'Processing Transaction...' : 'Validating PIN...'}
                    </Text>
                  </View>
                ) : (
                  <Text style={styles.proceedText}>
                    Fund Account • ₦{amountNum.toLocaleString()}
                  </Text>
                )}
              </TouchableOpacity>
            </>
          )}

          {/* Back to Review Button */}
          <TouchableOpacity
            style={[styles.proceedBtn, styles.backBtn]}
            onPress={() => setCurrentStep(2)}
            disabled={isValidatingPin || isProcessingPayment}
          >
            <Text style={[styles.proceedText, styles.backBtnText]}>← Back to Review</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* Contacts Selection Modal */}
      <Modal visible={showContactsModal} animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Contact</Text>
            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => setShowContactsModal(false)}
            >
              <Text style={styles.modalCloseBtnText}>×</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={contactsList}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.contactItem}
                onPress={() => handleContactSelect(item.phoneNumbers[0].number, item.name)}
              >
                <View style={styles.contactInfo}>
                  <Text style={styles.contactName}>{item.name}</Text>
                  <Text style={styles.contactNumber}>{item.phoneNumbers[0].number}</Text>
                </View>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <Text style={styles.emptyText}>No contacts with phone numbers found</Text>
            }
          />
        </View>
      </Modal>

      {/* Recent Transactions Modal */}
      <Modal visible={showRecentsModal} animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Recent Betting Funds</Text>
            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => setShowRecentsModal(false)}
            >
              <Text style={styles.modalCloseBtnText}>×</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={recentBetting}
            keyExtractor={(item) => `${item.customerId}-${item.provider}-${item.timestamp}`}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.contactItem}
                onPress={() => handleRecentSelect(item)}
              >
                <View style={styles.contactInfo}>
                  <Text style={styles.contactName}>
                    {item.customerName || 'Account Holder'}
                  </Text>
                  <Text style={styles.contactNumber}>
                    {item.customerId} • {providers.find(p => p.id === item.provider)?.label || item.provider.toUpperCase()}
                  </Text>
                </View>
                <Text style={styles.recentTime}>
                  {new Date(item.timestamp).toLocaleDateString()}
                </Text>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <Text style={styles.emptyText}>No recent betting transactions found</Text>
            }
          />
        </View>
      </Modal>

      {/* Success Modal */}
      {showSuccessModal && successData && (
        <BetFundingSuccessModal
          visible={showSuccessModal}
          onClose={handleCloseBettingModal}
          onPlaceBet={handlePlaceBet}
          transaction={successData.transaction}
          betPlatform={successData.providerName}
          fundingMethod="Wallet"
          amount={successData.amount}
          newBalance={successData.newBalance?.totalBalance || successData.newBalance?.amount || 0}
          bonusAmount={0}
        />
      )}
    </View>
  );
}

// Styles
const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#f8f9fa' 
  },

  scrollContent: { 
    flex: 1,
    paddingTop: 8,
  },

  section: { 
    margin: 16, 
    marginBottom: 24 
  },
  
  label: { 
    fontSize: 16, 
    fontWeight: '600', 
    marginBottom: 12, 
    color: '#1a1a1a' 
  },

  buttonRow: { 
    flexDirection: 'row',
    gap: 12,
  },
  
  actionBtn: {
    borderWidth: 1,
    borderColor: '#e1e5e9',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#fff',
    flex: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  
  actionBtnText: { 
    color: '#495057', 
    fontSize: 14, 
    fontWeight: '600' 
  },

  providersContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  
  providerCard: {
    borderWidth: 1.5,
    borderColor: '#e1e5e9',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    backgroundColor: '#fff',
    minHeight: 100,
    width: '30%',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  
  providerSelected: { 
    borderColor: '#ff3b30', 
    backgroundColor: '#fff5f5',
    borderWidth: 2,
    transform: [{ scale: 1.02 }],
  },
  
  providerLogo: { 
    width: 48, 
    height: 48, 
    resizeMode: 'contain', 
    marginBottom: 8 
  },
  
  providerLabel: { 
    fontSize: 11, 
    fontWeight: '700', 
    color: '#495057', 
    textAlign: 'center',
    lineHeight: 14,
  },

  selectedIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#ff3b30',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },

  selectedIndicatorText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },

  quickAmountGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  
  quickAmountBtn: {
    borderWidth: 1,
    borderColor: '#e1e5e9',
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 24,
    backgroundColor: '#fff',
    minWidth: '22%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  
  quickAmountSelected: {
    backgroundColor: '#ff3b30',
    borderColor: '#ff3b30',
    transform: [{ scale: 1.05 }],
  },
  
  quickAmountText: {
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '600',
    color: '#495057',
  },
  
  quickAmountSelectedText: {
    color: '#fff',
  },

  input: {
    borderWidth: 1.5,
    borderColor: '#e1e5e9',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  
  error: { 
    color: '#dc3545', 
    fontSize: 13, 
    marginTop: 8,
    fontWeight: '500',
    lineHeight: 18,
  },
  
  success: {
    color: '#28a745',
    fontSize: 13,
    marginTop: 8,
    fontWeight: '600',
  },

  proceedBtn: {
    margin: 16,
    padding: 18,
    borderRadius: 14,
    backgroundColor: '#ff3b30',
    alignItems: 'center',
    shadowColor: '#ff3b30',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  
  proceedDisabled: { 
    backgroundColor: '#adb5bd',
    shadowOpacity: 0,
    elevation: 0,
  },
  
  proceedText: { 
    color: '#fff', 
    fontSize: 17, 
    fontWeight: '700' 
  },

  backBtn: {
    backgroundColor: '#6c757d',
    marginTop: 8,
    shadowColor: '#6c757d',
  },
  
  backBtnText: {
    color: '#fff',
  },

  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  summaryCard: {
    margin: 16,
    padding: 24,
    borderRadius: 16,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  
  summaryTitle: { 
    fontSize: 20, 
    fontWeight: '700', 
    marginBottom: 20, 
    textAlign: 'center',
    color: '#1a1a1a' 
  },
  
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  
  summaryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  
  summaryLogo: { 
    width: 32, 
    height: 32, 
    resizeMode: 'contain', 
    marginRight: 12 
  },
  
  summaryLabel: { 
    fontWeight: '600', 
    fontSize: 15, 
    color: '#6c757d',
    flex: 1,
  },
  
  summaryText: { 
    fontSize: 15, 
    color: '#1a1a1a', 
    fontWeight: '600' 
  },
  
  summaryValue: { 
    fontSize: 15, 
    color: '#1a1a1a', 
    fontWeight: '700',
    textAlign: 'right',
    maxWidth: '50%',
  },
  
  summaryAmount: { 
    fontSize: 17, 
    color: '#ff3b30',
    fontWeight: '700',
  },
  
  summaryDivider: {
    height: 1,
    backgroundColor: '#e9ecef',
    marginVertical: 16,
  },
  
  summaryTotal: {
    fontSize: 20,
    color: '#ff3b30',
    fontWeight: '800',
  },

  balanceCard: {
    margin: 16,
    padding: 24,
    borderRadius: 16,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderLeftWidth: 5,
    borderLeftColor: '#ff3b30',
  },
  
  balanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  
  balanceTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  
  refreshBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
  },
  
  refreshText: {
    fontSize: 16,
    color: '#ff3b30',
  },
  
  totalBalance: {
    fontSize: 36,
    fontWeight: '800',
    color: '#28a745',
    textAlign: 'center',
    marginBottom: 8,
  },
  
  lastUpdated: {
    fontSize: 12,
    color: '#6c757d',
    textAlign: 'center',
    marginBottom: 16,
  },
  
  transactionPreview: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  
  previewLabel: {
    fontSize: 15,
    color: '#6c757d',
    fontWeight: '600',
  },
  
  previewAmount: {
    fontSize: 17,
    fontWeight: '700',
  },
  
  sufficientPreview: {
    color: '#28a745',
  },
  
  insufficientPreview: {
    color: '#dc3545',
  },

  insufficientBalanceWarning: {
    marginTop: 20,
    padding: 16,
    backgroundColor: '#fff3cd',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ffeaa7',
  },
  
  warningText: {
    color: '#856404',
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 12,
  },
  
  topUpBtn: {
    backgroundColor: '#ff3b30',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 24,
    alignSelf: 'center',
  },
  
  topUpBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  
  loadingBalance: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  
  noBalanceText: {
    color: '#6c757d',
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 16,
  },
  
  retryBtn: {
    backgroundColor: '#ff3b30',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 24,
  },
  
  retryBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  
  summaryBalance: {
    fontSize: 17,
    fontWeight: '700',
    color: '#28a745',
  },
  
  negativeBalance: {
    color: '#dc3545',
  },

  // PIN Entry Styles
  pinCard: {
    margin: 16,
    padding: 28,
    borderRadius: 16,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    alignItems: 'center',
  },
  
  pinTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 20,
    textAlign: 'center',
  },
  
  pinInputContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 20,
  },
  
  pinInput: {
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 12,
    borderWidth: 2,
    borderColor: '#e1e5e9',
    borderRadius: 14,
    paddingVertical: 20,
    paddingHorizontal: 24,
    backgroundColor: '#f8f9fa',
    width: 180,
  },
  
  pinInputError: {
    borderColor: '#dc3545',
    backgroundColor: '#fff5f5',
  },
  
  pinError: {
    color: '#dc3545',
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 20,
    fontWeight: '600',
    lineHeight: 20,
  },
  
  pinHelp: {
    color: '#6c757d',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  
  pinDotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 24,
  },
  
  pinDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#e9ecef',
    borderWidth: 2,
    borderColor: '#dee2e6',
  },
  
  pinDotFilled: {
    backgroundColor: '#ff3b30',
    borderColor: '#ff3b30',
  },
  
  pinDotError: {
    backgroundColor: '#dc3545',
    borderColor: '#dc3545',
  },

  pinSummaryCard: {
    margin: 16,
    padding: 24,
    borderRadius: 16,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderTopWidth: 4,
    borderTopColor: '#ff3b30',
  },
  
  pinSummaryTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 20,
    textAlign: 'center',
  },

  attemptsWarning: {
    color: '#fd7e14',
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 20,
    backgroundColor: '#fff3cd',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ffeaa7',
  },

  // Account Status Cards
  lockedCard: {
    margin: 16,
    padding: 24,
    borderRadius: 16,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderLeftWidth: 5,
    borderLeftColor: '#dc3545',
  },
  
  lockedTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#dc3545',
    textAlign: 'center',
    marginBottom: 16,
  },
  
  lockedText: {
    color: '#6c757d',
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },

  noPinCard: {
    margin: 16,
    padding: 24,
    borderRadius: 16,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderLeftWidth: 5,
    borderLeftColor: '#fd7e14',
  },
  
  noPinTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fd7e14',
    textAlign: 'center',
    marginBottom: 16,
  },
  
  noPinText: {
    color: '#6c757d',
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },

  // Modal Styles
  modalContainer: { 
    flex: 1, 
    backgroundColor: '#fff',
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
  },
  
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    backgroundColor: '#f8f9fa',
  },
  
  modalTitle: { 
    fontSize: 20, 
    fontWeight: '700', 
    color: '#1a1a1a' 
  },
  
  modalCloseBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  
  modalCloseBtnText: {
    fontSize: 20,
    color: '#6c757d',
    fontWeight: '700',
  },

  contactItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f3f4',
    backgroundColor: '#fff',
  },
  
  contactInfo: {
    flex: 1,
  },
  
  contactName: { 
    fontSize: 17, 
    fontWeight: '600', 
    color: '#1a1a1a',
    marginBottom: 4,
  },
  
  contactNumber: { 
    color: '#6c757d', 
    fontSize: 15,
    fontWeight: '500',
  },
  
  recentTime: {
    fontSize: 13,
    color: '#adb5bd',
    fontWeight: '500',
  },

  emptyText: {
    textAlign: 'center',
    color: '#adb5bd',
    fontSize: 16,
    marginTop: 60,
    fontWeight: '500',
    lineHeight: 24,
  },
});