import React, { useState, useEffect, useContext, useCallback, useMemo, useRef } from 'react';
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

// API configuration
const API_CONFIG = {
  BASE_URL: Platform.OS === 'web' 
    ? `${process.env.EXPO_PUBLIC_API_URL_WEB}/api`
    : `${process.env.EXPO_PUBLIC_API_URL}/api`,
  FALLBACK_URL: 'https://vtu-application.onrender.com/api',
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
  const authContext = useContext(AuthContext);
  const { token, user, balance, refreshBalance } = authContext || {};
  const pinInputRef = useRef<TextInput>(null);

  const [currentStep, setCurrentStep] = useState<1 | 2>(1);
  const [showPinEntry, setShowPinEntry] = useState(false);
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

  const quickAmounts = [500, 1000, 2000, 5000, 10000, 20000, 50000, 100000];

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

  const selectedProviderData = useMemo(() => 
    providers.find(p => p.id === selectedProvider),
    [selectedProvider]
  );

  const isCustomerIdValid = useMemo(() => 
    customerId.trim().length >= 3,
    [customerId]
  );

  const amountNum = useMemo(() => 
    parseInt(amount) || 0,
    [amount]
  );

  const isAmountValid = useMemo(() => 
    selectedProviderData 
      ? amountNum >= (selectedProviderData.minAmount || 100) && amountNum <= (selectedProviderData.maxAmount || 500000)
      : amountNum >= 100 && amountNum <= 500000,
    [amountNum, selectedProviderData]
  );

  const hasEnoughBalance = useMemo(() => 
    userBalance ? amountNum <= userBalance.total : true,
    [userBalance, amountNum]
  );

  const canProceed = useMemo(() => 
    isCustomerIdValid && isAmountValid && selectedProvider && hasEnoughBalance,
    [isCustomerIdValid, isAmountValid, selectedProvider, hasEnoughBalance]
  );

  const isPinValid = useMemo(() => 
    pin.length === 4 && /^\d{4}$/.test(pin),
    [pin]
  );

  useEffect(() => {
    initializeComponent();
  }, []);

  useEffect(() => {
    if (currentStep === 2) {
      fetchUserBalance();
    }
  }, [currentStep]);

  useEffect(() => {
    if (showPinEntry) {
      setPin('');
      setPinError('');
      checkPinStatus();
      // Focus the PIN input after a short delay
      setTimeout(() => {
        if (pinInputRef.current) {
          pinInputRef.current.focus();
        }
      }, 100);
    }
  }, [showPinEntry]);

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

      setTimeout(() => {
        fetchUserBalance();
        checkPinStatus();
      }, 1000);
    } catch (error) {
      console.error('Initialization error:', error);
    }
  };

  const initializeBalance = async () => {
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
      try {
        const cachedBalance = await AsyncStorage.getItem("userBalance");
        if (cachedBalance) {
          setUserBalance(JSON.parse(cachedBalance));
        }
      } catch (error) {
        console.log('No cached balance found');
      }
    }
  };

  const getAuthToken = async (): Promise<string> => {
    if (token && token.trim() !== '' && token !== 'undefined') {
      return token;
    }

    const tokenKeys = ['userToken', 'authToken', 'token', 'access_token'];
    
    for (const key of tokenKeys) {
      try {
        const storedToken = await AsyncStorage.getItem(key);
        if (storedToken && storedToken.trim() !== '' && storedToken !== 'undefined' && storedToken !== 'null') {
          const cleanToken = storedToken.trim();
          const tokenParts = cleanToken.split('.');
          if (tokenParts.length === 3) {
            return cleanToken;
          }
        }
      } catch (error) {
        console.log(`Error checking token key ${key}:`, error);
      }
    }

    throw new Error('No valid authentication token found');
  };

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

      const urls = [API_CONFIG.BASE_URL, API_CONFIG.FALLBACK_URL];
      let lastError: Error | null = null;

      for (const baseUrl of urls) {
        try {
          const fullUrl = `${baseUrl}${endpoint}`;
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

          if (response.status === 401) {
            await clearAuthTokens();
            throw new Error('Session expired. Please login again.');
          }

          if (!response.ok) {
            const errorMessage = (data as any)?.message || (data as any)?.error || `HTTP ${response.status}`;
            
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

          return data;
          
        } catch (error) {
          lastError = error as Error;
          
          if (error.message.includes('Session expired') || 
              error.message.includes('401') ||
              (error as any).isServiceError) {
            throw error;
          }
        }
      }

      throw lastError || new Error('All API endpoints failed');

    } catch (error) {
      console.error(`API Error for ${endpoint}:`, error.message);

      if ((error as any).isServiceError) {
        throw error;
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

  const checkPinStatus = useCallback(async () => {
    try {
      const response = await makeApiRequest('/purchase/pin-status');
      
      if (response.success) {
        setPinStatus(response);
      }
    } catch (error) {
      console.error('Error checking PIN status:', error);
      setPinStatus({
        isPinSet: true,
        hasPinSet: true,
        isLocked: false,
        lockTimeRemaining: 0,
        attemptsRemaining: 3,
      });
    }
  }, []);

  const fetchUserBalance = useCallback(async () => {
    setIsLoadingBalance(true);
    try {
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
            return;
          }
        } catch (contextError) {
          console.log("AuthContext balance refresh failed, trying API:", contextError);
        }
      }

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
      } else {
        throw new Error(balanceData.message || "Balance fetch failed");
      }
    } catch (error) {
      console.error("Balance fetch error:", error);
      
      try {
        const cachedBalance = await AsyncStorage.getItem("userBalance");
        if (cachedBalance) {
          setUserBalance(JSON.parse(cachedBalance));
        }
      } catch (cacheError) {
        setUserBalance(null);
      }
    } finally {
      setIsLoadingBalance(false);
    }
  }, [refreshBalance, balance]);

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

      recentList = recentList.filter(item => 
        item.customerId !== customerId || item.provider !== provider
      );
      
      recentList.unshift({
        customerId,
        provider,
        customerName,
        timestamp: Date.now()
      });
      
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

  const handleProceedToPayment = () => {
    if (!pinStatus?.isPinSet) {
      Alert.alert('PIN Required', 'Please set up a transaction PIN in your account settings before making purchases.');
      return;
    }
    if (pinStatus?.isLocked) {
      Alert.alert('Account Locked', `Too many failed PIN attempts. Please try again in ${pinStatus.lockTimeRemaining} minutes.`);
      return;
    }
    setShowPinEntry(true);
  };

  const validatePinAndPurchase = useCallback(async () => {
    console.log('=== BETTING PAYMENT START ===');
    
    if (!isPinValid) {
      setPinError('PIN must be exactly 4 digits');
      return;
    }

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

      const response = await makeApiRequest('/purchase', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (response.success === true) {
        await saveRecentBetting(customerId, selectedProvider!, customerName);
        
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

          if (refreshBalance) {
            try {
              await refreshBalance();
            } catch (error) {
              console.log('AuthContext refresh failed:', error);
            }
          }
        }

        await AsyncStorage.removeItem('bettingFormState');

        const providerName = providers.find(p => p.id === selectedProvider)?.label || selectedProvider?.toUpperCase();
        setSuccessData({
          transaction: response.transaction || {},
          providerName,
          customerId,
          customerName,
          amount: response.transaction?.amount || amountNum,
          newBalance: response.newBalance
        });

        setShowPinEntry(false);
        setTimeout(() => {
          setShowSuccessModal(true);
        }, 300);

      } else {
        if (response.message && response.message.toLowerCase().includes('pin')) {
          setPinError(response.message);
        } else {
          Alert.alert('Transaction Failed', response.message || 'Payment could not be processed');
        }
      }

    } catch (error: any) {
      console.error('Betting fund error:', error);
      
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
  }, [isPinValid, pin, selectedProvider, customerId, customerName, amountNum]);

  const handleCloseBettingModal = () => {
    setShowSuccessModal(false);
    setSuccessData(null);
    resetForm();
  };

  const handlePlaceBet = () => {
    setShowSuccessModal(false);
    setSuccessData(null);
  };

  const handleFundMore = () => {
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

  const renderFormStep = () => (
    <ScrollView
      style={styles.scrollContent}
      contentContainerStyle={styles.scrollContentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Quick Options */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Quick Options</Text>
        <View style={styles.buttonRow}>
          <TouchableOpacity 
            style={[styles.actionBtn, { flex: 1, marginRight: 8 }]} 
            onPress={selectContact}
            disabled={isLoadingContacts}
            activeOpacity={0.7}
          >
            {isLoadingContacts ? (
              <ActivityIndicator size="small" color="#ff3b30" />
            ) : (
              <Text style={styles.actionBtnText}>Contacts</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionBtn, { flex: 1, marginLeft: 8 }]} 
            onPress={showRecentBettingList}
            activeOpacity={0.7}
          >
            <Text style={styles.actionBtnText}>Recent ({recentBetting.length})</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Provider Selection */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Select Betting Platform</Text>
        <View style={styles.providersContainer}>
          {providers.map((provider) => (
            <TouchableOpacity
              key={provider.id}
              style={[
                styles.providerCard,
                selectedProvider === provider.id && styles.providerSelected,
              ]}
              onPress={() => setSelectedProvider(provider.id)}
              activeOpacity={0.7}
            >
              <Image source={provider.logo} style={styles.providerLogo} />
              <Text style={[
                styles.providerLabel,
                selectedProvider === provider.id && styles.providerLabelSelected
              ]}>
                {provider.label}
              </Text>
              {selectedProvider === provider.id && (
                <View style={styles.checkmark}>
                  <Text style={styles.checkmarkText}>✓</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Customer Details */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Account Details</Text>
        <TextInput
          style={[styles.input, !isCustomerIdValid && customerId !== '' && styles.inputError]}
          placeholder="Enter betting account ID/username"
          value={customerId}
          onChangeText={setCustomerId}
          autoCapitalize="none"
          placeholderTextColor="#999"
        />
        {customerId !== '' && !isCustomerIdValid && (
          <Text style={styles.validationError}>Account ID must be at least 3 characters</Text>
        )}
        {customerId !== '' && isCustomerIdValid && (
          <Text style={styles.validationSuccess}>✓ Valid account ID</Text>
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
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Quick Amount Selection</Text>
        <View style={styles.quickAmountGrid}>
          {quickAmounts.map((quickAmount) => (
            <TouchableOpacity
              key={quickAmount}
              style={[
                styles.quickAmountBtn,
                amount === quickAmount.toString() && styles.quickAmountSelected
              ]}
              onPress={() => handleQuickAmount(quickAmount)}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.quickAmountText,
                amount === quickAmount.toString() && styles.quickAmountTextSelected
              ]}>
                ₦{quickAmount.toLocaleString()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Custom Amount */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Custom Amount</Text>
        <TextInput
          style={[styles.input, amount !== '' && !isAmountValid && styles.inputError]}
          keyboardType="numeric"
          placeholder={`Enter amount (₦${selectedProviderData?.minAmount || 100} - ₦${selectedProviderData?.maxAmount?.toLocaleString() || '500,000'})`}
          value={amount}
          onChangeText={setAmount}
          placeholderTextColor="#999"
        />
        {amount !== '' && !isAmountValid && (
          <Text style={styles.validationError}>
            Amount must be between ₦{selectedProviderData?.minAmount || 100} and ₦{selectedProviderData?.maxAmount?.toLocaleString() || '500,000'}
          </Text>
        )}
        {amount !== '' && isAmountValid && hasEnoughBalance && (
          <Text style={styles.validationSuccess}>✓ Valid amount</Text>
        )}
        {amount !== '' && isAmountValid && !hasEnoughBalance && userBalance && (
          <Text style={styles.validationError}>
            Insufficient balance. Available: ₦{userBalance.total.toLocaleString()}
          </Text>
        )}
      </View>

      {/* Continue Button */}
      <TouchableOpacity
        style={[styles.primaryButton, !canProceed && styles.primaryButtonDisabled]}
        disabled={!canProceed}
        onPress={() => setCurrentStep(2)}
        activeOpacity={0.8}
      >
        <Text style={styles.primaryButtonText}>
          {canProceed 
            ? `Continue • ₦${amountNum.toLocaleString()}` 
            : 'Complete Form to Continue'
          }
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );

  const renderSummaryStep = () => (
    <ScrollView
      style={styles.scrollContent}
      contentContainerStyle={styles.scrollContentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Balance Overview */}
      <View style={styles.balanceOverview}>
        <View style={styles.balanceHeader}>
          <Text style={styles.balanceLabel}>Available Balance</Text>
          <TouchableOpacity 
            style={styles.refreshButton} 
            onPress={fetchUserBalance}
            disabled={isLoadingBalance}
          >
            {isLoadingBalance ? (
              <ActivityIndicator size="small" color="#ff3b30" />
            ) : (
              <Text style={styles.refreshIcon}>↻</Text>
            )}
          </TouchableOpacity>
        </View>

        {userBalance ? (
          <>
            <Text style={styles.balanceAmount}>
              ₦{Number(userBalance.total || userBalance.amount || 0).toLocaleString()}
            </Text>

            {amountNum > 0 && (
              <View style={styles.balanceCalculation}>
                <View style={styles.balanceRow}>
                  <Text style={styles.balanceRowLabel}>Purchase Amount</Text>
                  <Text style={styles.balanceRowValue}>-₦{amountNum.toLocaleString()}</Text>
                </View>
                <View style={styles.balanceDivider} />
                <View style={styles.balanceRow}>
                  <Text style={styles.balanceRowLabelBold}>Remaining Balance</Text>
                  <Text style={[
                    styles.balanceRowValueBold,
                    ((userBalance.total || userBalance.amount || 0) - amountNum) < 0 && styles.negativeAmount
                  ]}>
                    ₦{Math.max(0, (userBalance.total || userBalance.amount || 0) - amountNum).toLocaleString()}
                  </Text>
                </View>
              </View>
            )}

            {amountNum > (userBalance.total || userBalance.amount || 0) && (
              <View style={styles.insufficientWarning}>
                <Text style={styles.insufficientWarningText}>
                  Insufficient balance for this transaction
                </Text>
              </View>
            )}
          </>
        ) : (
          <View style={styles.balanceLoading}>
            <Text style={styles.balanceLoadingText}>
              {isLoadingBalance ? 'Loading balance...' : 'Unable to load balance'}
            </Text>
          </View>
        )}
      </View>
      
      {/* Transaction Summary */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Transaction Summary</Text>

        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Platform</Text>
          <View style={styles.summaryValueContainer}>
            {selectedProvider && (
              <Image
                source={providers.find((p) => p.id === selectedProvider)?.logo}
                style={styles.summaryNetworkLogo}
              />
            )}
            <Text style={styles.summaryValue}>
              {providers.find((p) => p.id === selectedProvider)?.label}
            </Text>
          </View>
        </View>

        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Account ID</Text>
          <Text style={styles.summaryValue}>{customerId}</Text>
        </View>

        {customerName && (
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Account Name</Text>
            <Text style={styles.summaryValue}>{customerName}</Text>
          </View>
        )}

        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Amount</Text>
          <Text style={[styles.summaryValue, styles.summaryAmountValue]}>
            ₦{amountNum.toLocaleString()}
          </Text>
        </View>

        <View style={styles.summaryDivider} />

        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabelTotal}>Total Charge</Text>
          <Text style={styles.summaryValueTotal}>₦{amountNum.toLocaleString()}</Text>
        </View>

        {userBalance && (
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Remaining Balance</Text>
            <Text style={[
              styles.summaryValue, 
              styles.summaryBalance,
              (userBalance.total - amountNum) < 0 ? styles.negativeAmount : {}
            ]}>
              ₦{Math.max(0, userBalance.total - amountNum).toLocaleString()}
            </Text>
          </View>
        )}
      </View>

      {/* Action Buttons */}
      <TouchableOpacity
        style={[
          styles.primaryButton, 
          !hasEnoughBalance && styles.primaryButtonDisabled
        ]}
        disabled={!hasEnoughBalance}
        onPress={handleProceedToPayment}
        activeOpacity={0.8}
      >
        <Text style={styles.primaryButtonText}>
          {!hasEnoughBalance ? 'Insufficient Balance' : 'Proceed to Payment'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={() => setCurrentStep(1)}
        activeOpacity={0.8}
      >
        <Text style={styles.secondaryButtonText}>Edit Details</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  return (
    <View style={styles.container}>
      {currentStep === 1 ? renderFormStep() : renderSummaryStep()}

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

      {/* PIN Entry Modal */}
      <Modal 
        visible={showPinEntry && pinStatus?.isPinSet && !pinStatus?.isLocked} 
        animationType="slide"
        transparent={true}
      >
        <TouchableOpacity 
          style={styles.pinModalOverlay}
          activeOpacity={1}
          onPress={() => {
            if (!isValidatingPin && !isProcessingPayment) {
              setShowPinEntry(false);
              setPin('');
              setPinError('');
            }
          }}
        >
          <TouchableOpacity 
            style={styles.pinBottomSheet}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.dragHandle} />

            <Text style={styles.pinTitle}>Enter Transaction PIN</Text>
            <Text style={styles.pinSubtitle}>Enter your 4-digit PIN to confirm</Text>

            {pinStatus?.attemptsRemaining < 3 && (
              <View style={styles.attemptsWarning}>
                <Text style={styles.attemptsWarningText}>
                  {pinStatus.attemptsRemaining} attempts remaining
                </Text>
              </View>
            )}

            <TouchableOpacity 
              style={styles.pinInputArea}
              activeOpacity={0.7}
              onPress={() => {
                pinInputRef.current?.focus();
              }}
            >
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
              <Text style={styles.pinInputHint}>Tap to enter PIN</Text>
            </TouchableOpacity>

            <TextInput
              ref={pinInputRef}
              style={styles.hiddenPinInput}
              value={pin}
              onChangeText={(text) => {
                setPin(text.replace(/\D/g, '').substring(0, 4));
                setPinError('');
              }}
              keyboardType="number-pad"
              secureTextEntry={true}
              maxLength={4}
              caretHidden={true}
            />

            {pinError && (
              <Text style={styles.pinErrorText}>{pinError}</Text>
            )}

            <TouchableOpacity
              style={[
                styles.primaryButton,
                (!isPinValid || isValidatingPin || isProcessingPayment) && styles.primaryButtonDisabled
              ]}
              disabled={!isPinValid || isValidatingPin || isProcessingPayment}
              onPress={validatePinAndPurchase}
              activeOpacity={0.8}
            >
              {isValidatingPin || isProcessingPayment ? (
                <View style={styles.buttonLoading}>
                  <ActivityIndicator size="small" color="#fff" />
                  <Text style={[styles.primaryButtonText, styles.buttonLoadingText]}>
                    {isProcessingPayment ? 'Processing...' : 'Validating...'}
                  </Text>
                </View>
              ) : (
                <Text style={styles.primaryButtonText}>
                  Confirm Payment
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => {
                setShowPinEntry(false);
                setPin('');
                setPinError('');
              }}
              disabled={isValidatingPin || isProcessingPayment}
              activeOpacity={0.8}
            >
              <Text style={styles.secondaryButtonText}>Cancel</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
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

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#f5f5f5' 
  },

  scrollContent: { 
    flex: 1 
  },

  scrollContentContainer: {
    padding: 16,
    paddingBottom: 40,
  },

  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 16,
  },

  buttonRow: { 
    flexDirection: 'row',
    gap: 12,
  },
  
  actionBtn: {
    borderWidth: 1,
    borderColor: '#e8e8e8',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#fafafa',
    flex: 1,
  },
  
  actionBtnText: { 
    color: '#666', 
    fontSize: 14, 
    fontWeight: '600' 
  },

  providersContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  
  providerCard: {
    flex: 1,
    minWidth: '30%',
    maxWidth: '31%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fafafa',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e8e8e8',
    position: 'relative',
    padding: 8,
  },
  
  providerSelected: { 
    borderColor: '#ff3b30',
    backgroundColor: '#fff5f5',
  },
  
  providerLogo: { 
    width: 40, 
    height: 40, 
    resizeMode: 'contain', 
    marginBottom: 6 
  },
  
  providerLabel: { 
    fontSize: 10, 
    fontWeight: '600', 
    color: '#666', 
    textAlign: 'center',
  },

  providerLabelSelected: {
    color: '#ff3b30',
  },

  checkmark: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#ff3b30',
    alignItems: 'center',
    justifyContent: 'center',
  },

  checkmarkText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
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
    borderWidth: 1,
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
    color: '#1a1a1a',
    backgroundColor: '#fafafa',
  },

  inputError: {
    borderColor: '#ff3b30',
    backgroundColor: '#fff5f5',
  },
  
  validationError: { 
    color: '#ff3b30', 
    fontSize: 13, 
    marginTop: 8,
    fontWeight: '500',
  },
  
  validationSuccess: {
    color: '#28a745',
    fontSize: 13,
    marginTop: 8,
    fontWeight: '600',
  },

  primaryButton: {
    backgroundColor: '#ff3b30',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  
  primaryButtonDisabled: { 
    backgroundColor: '#d0d0d0',
  },
  
  primaryButtonText: { 
    color: '#fff', 
    fontSize: 16, 
    fontWeight: '600' 
  },

  secondaryButton: {
    backgroundColor: '#fff',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e8e8e8',
  },
  
  secondaryButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },

  buttonLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  buttonLoadingText: {
    marginLeft: 0,
  },

  balanceOverview: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  
  balanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  
  balanceLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  
  refreshButton: {
    padding: 4,
  },
  
  refreshIcon: {
    fontSize: 18,
    color: '#ff3b30',
  },
  
  balanceAmount: {
    fontSize: 36,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 16,
  },

  balanceCalculation: {
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    padding: 16,
  },

  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },

  balanceRowLabel: {
    fontSize: 14,
    color: '#666',
  },

  balanceRowValue: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },

  balanceRowLabelBold: {
    fontSize: 15,
    color: '#1a1a1a',
    fontWeight: '600',
  },

  balanceRowValueBold: {
    fontSize: 15,
    color: '#2e7d32',
    fontWeight: '700',
  },

  negativeAmount: {
    color: '#ff3b30',
  },

  balanceDivider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 12,
  },

  insufficientWarning: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#fff3e0',
    borderRadius: 8,
  },

  insufficientWarningText: {
    color: '#e65100',
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  },

  balanceLoading: {
    paddingVertical: 20,
    alignItems: 'center',
  },

  balanceLoadingText: {
    color: '#999',
    fontSize: 14,
  },

  summaryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },

  summaryLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },

  summaryValue: {
    fontSize: 14,
    color: '#1a1a1a',
    fontWeight: '600',
  },

  summaryValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  summaryNetworkLogo: {
    width: 24,
    height: 24,
    resizeMode: 'contain',
  },

  summaryAmountValue: {
    fontSize: 15,
    color: '#ff3b30',
    fontWeight: '700',
  },

  summaryDivider: {
    height: 1,
    backgroundColor: '#e8e8e8',
    marginVertical: 12,
  },

  summaryLabelTotal: {
    fontSize: 16,
    color: '#1a1a1a',
    fontWeight: '600',
  },

  summaryValueTotal: {
    fontSize: 20,
    color: '#ff3b30',
    fontWeight: '700',
  },

  summaryBalance: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2e7d32',
  },

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
    borderBottomColor: '#e8e8e8',
    backgroundColor: '#f8f8f8',
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
  },
  
  modalCloseBtnText: {
    fontSize: 24,
    color: '#666',
    fontWeight: '700',
  },

  contactItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#fff',
  },
  
  contactInfo: {
    flex: 1,
  },
  
  contactName: { 
    fontSize: 16, 
    fontWeight: '600', 
    color: '#1a1a1a',
    marginBottom: 4,
  },
  
  contactNumber: { 
    color: '#666', 
    fontSize: 14,
    fontWeight: '500',
  },
  
  recentTime: {
    fontSize: 13,
    color: '#999',
    fontWeight: '500',
  },

  emptyText: {
    textAlign: 'center',
    color: '#999',
    fontSize: 15,
    marginTop: 60,
    fontWeight: '500',
  },

  pinModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },

  pinBottomSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },

  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#d0d0d0',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },

  pinTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: 6,
  },

  pinSubtitle: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginBottom: 24,
  },

  attemptsWarning: {
    backgroundColor: '#fff3e0',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginBottom: 20,
    alignSelf: 'center',
  },

  attemptsWarningText: {
    color: '#e65100',
    fontSize: 13,
    fontWeight: '600',
  },

  pinInputArea: {
    backgroundColor: '#f8f8f8',
    borderRadius: 16,
    paddingVertical: 32,
    paddingHorizontal: 24,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#e8e8e8',
    alignItems: 'center',
  },

  pinDotsContainer: {
    flexDirection: 'row',
    gap: 20,
    justifyContent: 'center',
    marginBottom: 12,
  },

  pinInputHint: {
    fontSize: 13,
    color: '#999',
    textAlign: 'center',
  },

  pinDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#e8e8e8',
    borderWidth: 2,
    borderColor: '#d0d0d0',
  },

  pinDotFilled: {
    backgroundColor: '#ff3b30',
    borderColor: '#ff3b30',
  },

  pinDotError: {
    backgroundColor: '#ff6b6b',
    borderColor: '#ff3b30',
  },

  hiddenPinInput: {
    position: 'absolute',
    left: -9999,
    width: 1,
    height: 1,
  },

  pinErrorText: {
    color: '#ff3b30',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: -12,
    marginBottom: 20,
  },
});