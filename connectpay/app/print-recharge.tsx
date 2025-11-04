import React, { useState, useEffect, useCallback, useMemo, useContext, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
  RefreshControl,
  Modal
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { AuthContext } from '../contexts/AuthContext';

const API_CONFIG = {
  BASE_URL: Platform.OS === 'web' 
    ? `${process.env.EXPO_PUBLIC_API_URL_WEB}/api`
    : `${process.env.EXPO_PUBLIC_API_URL}/api`,
};

interface UserBalance {
  total: number;
  mainBalance: number;
  bonusBalance: number;
  main: number;
  bonus: number;
  amount: number;
  currency: string;
  lastUpdated: string;
}

interface Transaction {
  _id: string;
  network: string;
  type: string;
  amount: number;
  quantity: number;
  denomination: number;
  pins: Array<{ pin: string; serial: string }>;
  status: string;
  createdAt: string;
  balanceAfter: number;
}

interface PinStatus {
  isPinSet: boolean;
  hasPinSet: boolean;
  isLocked: boolean;
  lockTimeRemaining: number;
  attemptsRemaining: number;
}

export default function PrintRecharge() {
  const { token, user, balance, refreshBalance } = useContext(AuthContext);
  
  const [activeTab, setActiveTab] = useState<'generate' | 'history'>('generate');
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);
  const [showPinEntry, setShowPinEntry] = useState(false);
  const [selectedNetwork, setSelectedNetwork] = useState<string | null>(null);
  const [cardType, setCardType] = useState<'airtime' | 'data'>('airtime');
  const [denomination, setDenomination] = useState<number | null>(null);
  const [quantity, setQuantity] = useState<string>('1');
  const [pin, setPin] = useState('');
  const [userBalance, setUserBalance] = useState<UserBalance | null>(null);
  const [pinStatus, setPinStatus] = useState<PinStatus | null>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);
  const [isValidatingPin, setIsValidatingPin] = useState(false);
  const [pinError, setPinError] = useState('');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [generatedPins, setGeneratedPins] = useState<Array<{ pin: string; serial: string }>>([]);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  
  const pinInputRef = useRef<TextInput>(null);

  const networks = [
    { id: 'mtn', label: 'MTN', logo: require('../assets/images/mtnlogo.jpg') },
    { id: 'airtel', label: 'AIRTEL', logo: require('../assets/images/Airtelogo.png') },
    { id: 'glo', label: 'GLO', logo: require('../assets/images/glologo.png') },
    { id: '9mobile', label: '9MOBILE', logo: require('../assets/images/9mobilelogo.jpg') },
  ];

  const getDenominations = useCallback((network: string | null) => {
    const networkDenominations: Record<string, number[]> = {
      mtn: [100, 200, 500, 1000, 1500, 2000],
      airtel: [100, 200, 500, 1000, 2000],
      glo: [100, 200, 500, 1000],
      '9mobile': [100, 200, 500, 1000]
    };
    return network ? networkDenominations[network] || [100, 200, 500, 1000] : [100, 200, 500, 1000];
  }, []);

  const denominations = useMemo(() => getDenominations(selectedNetwork), [selectedNetwork, getDenominations]);

  const totalAmount = useMemo(() => {
    if (!denomination || !quantity) return 0;
    const qty = parseInt(quantity) || 1;
    return denomination * Math.max(1, Math.min(100, qty));
  }, [denomination, quantity]);

  const hasEnoughBalance = useMemo(() => {
    if (!userBalance) return false;
    const availableBalance = userBalance.total || userBalance.amount || 0;
    return totalAmount <= availableBalance;
  }, [userBalance, totalAmount]);

  const canProceed = useMemo(() => {
    const qty = parseInt(quantity) || 0;
    return selectedNetwork && cardType && denomination && qty > 0 && qty <= 100 && hasEnoughBalance;
  }, [selectedNetwork, cardType, denomination, quantity, hasEnoughBalance]);

  const isPinValid = useMemo(() => 
    pin.length === 4 && /^\d{4}$/.test(pin),
    [pin]
  );

  const getAuthToken = async () => {
    if (!token) {
      throw new Error('Authentication required');
    }
    return token;
  };

  const makeApiRequest = async (endpoint: string, options = {}) => {
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

      const fullUrl = `${API_CONFIG.BASE_URL}${endpoint}`;
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
          throw new Error(`Invalid JSON response from server. Status: ${response.status}`);
        }
      }

      if (response.status === 401) {
        throw new Error('Session expired. Please login again.');
      }

      if (!response.ok) {
        const errorMessage = data?.message || data?.error || `HTTP ${response.status}: ${response.statusText}`;
        
        if (endpoint.includes('/purchase') && data && typeof data === 'object') {
          const error = new Error(errorMessage);
          (error as any).responseData = data;
          (error as any).httpStatus = response.status;
          throw error;
        }
        
        throw new Error(errorMessage);
      }

      return data;

    } catch (error) {
      console.error(`API Error for ${endpoint}:`, error.message);

      if (error.name === 'TypeError' && error.message.includes('Network request failed')) {
        throw new Error('Network connection failed. Please check your internet connection.');
      }

      throw error;
    }
  };

  useEffect(() => {
    if (balance) {
      const balanceAmount = parseFloat(balance.amount) || 0;
      setUserBalance({
        main: balanceAmount,
        bonus: 0,
        total: balanceAmount,
        amount: balanceAmount,
        mainBalance: balanceAmount,
        bonusBalance: 0,
        currency: balance.currency || "NGN",
        lastUpdated: balance.lastUpdated || new Date().toISOString(),
      });
    }
    
    setTimeout(() => {
      fetchUserBalance();
      checkPinStatus();
    }, 1000);
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (activeTab === 'history') {
        loadTransactionHistory();
      } else {
        fetchUserBalance();
      }
    }, [activeTab])
  );

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
      
      setTimeout(() => {
        pinInputRef.current?.focus();
      }, 100);
    }
  }, [showPinEntry]);

  const fetchUserBalance = useCallback(async () => {
    setIsLoadingBalance(true);
    try {
      if (refreshBalance) {
        await refreshBalance();
      }
      
      if (balance) {
        const balanceAmount = parseFloat(balance.amount) || 0;
        
        const realBalance: UserBalance = {
          main: balanceAmount,
          bonus: 0,
          total: balanceAmount,
          amount: balanceAmount,
          mainBalance: balanceAmount,
          bonusBalance: 0,
          currency: balance.currency || "NGN",
          lastUpdated: balance.lastUpdated || new Date().toISOString(),
        };

        setUserBalance(realBalance);
        await AsyncStorage.setItem("userBalance", JSON.stringify(realBalance));
      } else {
        const balanceData = await makeApiRequest("/balance");
        
        if (balanceData.success && balanceData.balance) {
          const balanceAmount = parseFloat(balanceData.balance.amount) || 0;
          
          const realBalance: UserBalance = {
            main: balanceAmount,
            bonus: 0,
            total: balanceAmount,
            amount: balanceAmount,
            mainBalance: balanceAmount,
            bonusBalance: 0,
            currency: balanceData.balance.currency || "NGN",
            lastUpdated: balanceData.balance.lastUpdated || new Date().toISOString(),
          };

          setUserBalance(realBalance);
          await AsyncStorage.setItem("userBalance", JSON.stringify(realBalance));
        }
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

  const checkPinStatus = useCallback(async () => {
    try {
      const response = await makeApiRequest('/purchase/pin-status');
      
      if (response.success) {
        setPinStatus(response);
      }
    } catch (error) {
      console.error('Error checking PIN status:', error);
    }
  }, []);

  const loadTransactionHistory = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await makeApiRequest('/purchase/history?type=recharge');
      
      if (response.success && response.data?.transactions) {
        setTransactions(response.data.transactions);
      } else {
        setTransactions([]);
      }
    } catch (error) {
      console.error('History load error:', error);
      setTransactions([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (activeTab === 'history') {
      await loadTransactionHistory();
    } else {
      await fetchUserBalance();
    }
    setRefreshing(false);
  }, [activeTab, loadTransactionHistory, fetchUserBalance]);

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

  const generateRechargePins = useCallback(async () => {
    console.log('=== RECHARGE PIN GENERATION START ===');
    
    if (!isPinValid) {
      setPinError('PIN must be exactly 4 digits');
      return;
    }

    const qty = parseInt(quantity);
    if (isNaN(qty) || qty < 1 || qty > 100) {
      setPinError('Quantity must be between 1 and 100');
      return;
    }

    if (!selectedNetwork || !denomination) {
      setPinError('Please complete all fields');
      return;
    }

    if (!hasEnoughBalance) {
      setPinError('Insufficient balance for this transaction');
      return;
    }

    setIsValidatingPin(true);
    setIsProcessingPayment(true);
    setPinError('');

    try {
      const response = await makeApiRequest('/purchase', {
        method: 'POST',
        body: JSON.stringify({
          type: 'recharge',
          network: selectedNetwork,
          cardType: cardType,
          denomination,
          quantity: qty,
          pin,
        }),
      });

      if (response.success === true) {
        console.log('PIN generation successful!');
        
        // Extract PINs from response
        const pins = response.pins || response.data?.pins || response.transaction?.pins || [];
        setGeneratedPins(pins);
        
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
            mainBalance: balanceAmount,
            bonusBalance: 0,
            currency: response.newBalance.currency || "NGN",
            lastUpdated: response.newBalance.lastUpdated || new Date().toISOString(),
          };

          setUserBalance(updatedBalance);
          await AsyncStorage.setItem("userBalance", JSON.stringify(updatedBalance));
        }

        setShowPinEntry(false);
        setTimeout(() => {
          setShowSuccessModal(true);
        }, 300);

      } else {
        if (response.message && response.message.toLowerCase().includes('pin')) {
          setPinError(response.message);
        }
        
        Alert.alert('Transaction Failed', response.message || 'Payment could not be processed');
      }

    } catch (error) {
      console.error('Payment error:', error);
      
      if (error.message.includes('locked') || error.message.includes('attempts')) {
        setPinError(error.message);
      } else if (error.message.includes('PIN')) {
        setPinError(error.message);
      } else {
        Alert.alert('Payment Error', error.message || 'Unable to process payment. Please try again.');
      }

    } finally {
      setIsValidatingPin(false);
      setIsProcessingPayment(false);
      console.log('=== RECHARGE PIN GENERATION END ===');
    }
  }, [isPinValid, quantity, selectedNetwork, denomination, cardType, pin, hasEnoughBalance]);

  const handleQuantityChange = useCallback((text: string) => {
    if (text === '') {
      setQuantity('');
      return;
    }
    
    const numericValue = text.replace(/[^0-9]/g, '');
    
    if (numericValue === '' || numericValue === '0') {
      setQuantity('1');
    } else if (parseInt(numericValue) > 100) {
      setQuantity('100');
    } else {
      setQuantity(numericValue);
    }
  }, []);

  const handleCloseSuccessModal = () => {
    setShowSuccessModal(false);
    setGeneratedPins([]);
    setCurrentStep(1);
    setSelectedNetwork(null);
    setDenomination(null);
    setQuantity('1');
    setPin('');
    setPinError('');
    fetchUserBalance();
  };

  const handleViewHistory = () => {
    setShowSuccessModal(false);
    setGeneratedPins([]);
    setActiveTab('history');
    setCurrentStep(1);
    setSelectedNetwork(null);
    setDenomination(null);
    setQuantity('1');
    setPin('');
    setPinError('');
  };

  useEffect(() => {
    if (selectedNetwork && denomination && !denominations.includes(denomination)) {
      setDenomination(null);
    }
  }, [selectedNetwork, denomination, denominations]);

  const renderGenerateTab = () => (
    <ScrollView 
      style={styles.scrollContent}
      contentContainerStyle={styles.scrollContentContainer}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Select Network</Text>
        <View style={styles.networkRow}>
          {networks.map((net) => (
            <TouchableOpacity
              key={net.id}
              style={[
                styles.networkCard,
                selectedNetwork === net.id && styles.networkSelected,
              ]}
              onPress={() => setSelectedNetwork(net.id)}
              activeOpacity={0.7}
            >
              <Image source={net.logo} style={styles.networkLogo} />
              <Text style={[
                styles.networkLabel,
                selectedNetwork === net.id && styles.networkLabelSelected
              ]}>
                {net.label}
              </Text>
              {selectedNetwork === net.id && (
                <View style={styles.checkmark}>
                  <Text style={styles.checkmarkText}>✓</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Card Type</Text>
        <View style={styles.cardTypeRow}>
          <TouchableOpacity
            style={[
              styles.cardTypeBtn,
              cardType === 'airtime' && styles.cardTypeSelected,
            ]}
            onPress={() => setCardType('airtime')}
            activeOpacity={0.7}
          >
            <Text style={[
              styles.cardTypeText,
              cardType === 'airtime' && styles.cardTypeTextSelected
            ]}>
              Airtime
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.cardTypeBtn,
              cardType === 'data' && styles.cardTypeSelected,
            ]}
            onPress={() => setCardType('data')}
            activeOpacity={0.7}
          >
            <Text style={[
              styles.cardTypeText,
              cardType === 'data' && styles.cardTypeTextSelected
            ]}>
              Data
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Denomination</Text>
        <View style={styles.denominationGrid}>
          {denominations.map((amount) => (
            <TouchableOpacity
              key={amount}
              style={[
                styles.denominationBtn,
                denomination === amount && styles.denominationSelected,
              ]}
              onPress={() => setDenomination(amount)}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.denominationText,
                denomination === amount && styles.denominationTextSelected
              ]}>
                ₦{amount}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.inputLabel}>Quantity</Text>
        <TextInput
          style={[styles.input, (!quantity || parseInt(quantity) < 1) && styles.inputError]}
          keyboardType="numeric"
          placeholder="Enter quantity (1-100)"
          placeholderTextColor="#999"
          value={quantity}
          onChangeText={handleQuantityChange}
          maxLength={3}
        />
        {(!quantity || parseInt(quantity) < 1) && (
          <Text style={styles.validationError}>Please enter a valid quantity (1-100)</Text>
        )}
      </View>

      {denomination && quantity && (
        <View style={styles.card}>
          <Text style={styles.inputLabel}>Total Amount</Text>
          <Text style={styles.totalAmount}>
            ₦{totalAmount.toLocaleString()}
          </Text>
        </View>
      )}

      <TouchableOpacity
        style={[styles.primaryButton, !canProceed && styles.primaryButtonDisabled]}
        disabled={!canProceed}
        onPress={() => setCurrentStep(2)}
        activeOpacity={0.8}
      >
        <Text style={styles.primaryButtonText}>
          {!hasEnoughBalance ? 'Insufficient Balance' :
           canProceed ? `Review Purchase • ₦${totalAmount.toLocaleString()}` :
           'Complete Form to Continue'}
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

            {totalAmount > 0 && (
              <View style={styles.balanceCalculation}>
                <View style={styles.balanceRow}>
                  <Text style={styles.balanceRowLabel}>Purchase Amount</Text>
                  <Text style={styles.balanceRowValue}>-₦{totalAmount.toLocaleString()}</Text>
                </View>
                <View style={styles.balanceDivider} />
                <View style={styles.balanceRow}>
                  <Text style={styles.balanceRowLabelBold}>Remaining Balance</Text>
                  <Text style={[
                    styles.balanceRowValueBold,
                    ((userBalance.total || userBalance.amount || 0) - totalAmount) < 0 && styles.negativeAmount
                  ]}>
                    ₦{Math.max(0, (userBalance.total || userBalance.amount || 0) - totalAmount).toLocaleString()}
                  </Text>
                </View>
              </View>
            )}

            {totalAmount > (userBalance.total || userBalance.amount || 0) && (
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
          <Text style={styles.summaryLabel}>Network</Text>
          <View style={styles.summaryValueContainer}>
            {selectedNetwork && (
              <Image
                source={networks.find((n) => n.id === selectedNetwork)?.logo}
                style={styles.summaryNetworkLogo}
              />
            )}
            <Text style={styles.summaryValue}>
              {networks.find((n) => n.id === selectedNetwork)?.label}
            </Text>
          </View>
        </View>

        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Type</Text>
          <Text style={styles.summaryValue}>{cardType?.toUpperCase()}</Text>
        </View>

        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Denomination</Text>
          <Text style={styles.summaryValue}>₦{denomination?.toLocaleString()}</Text>
        </View>

        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Quantity</Text>
          <Text style={styles.summaryValue}>{quantity} cards</Text>
        </View>

        <View style={styles.summaryDivider} />

        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabelTotal}>Total Amount</Text>
          <Text style={styles.summaryValueTotal}>₦{totalAmount.toLocaleString()}</Text>
        </View>
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

  const renderHistoryTab = () => (
    <ScrollView 
      style={styles.scrollContent}
      contentContainerStyle={styles.scrollContentContainer}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
        />
      }
      showsVerticalScrollIndicator={false}
    >
      {isLoading ? (
        <ActivityIndicator size="large" style={styles.loader} color="#ff3b30" />
      ) : transactions.length > 0 ? (
        transactions.map((transaction) => (
          <View key={transaction._id} style={styles.transactionCard}>
            <View style={styles.transactionHeader}>
              <Text style={styles.transactionNetwork}>{transaction.network.toUpperCase()}</Text>
              <Text style={styles.transactionAmount}>₦{transaction.amount.toLocaleString()}</Text>
            </View>
            <Text style={styles.transactionType}>
              {transaction.type} • {transaction.quantity} card{transaction.quantity > 1 ? 's' : ''} • ₦{transaction.denomination}
            </Text>

            {transaction.pins && transaction.pins.length > 0 && transaction.pins.map((pinData, index) => (
              <View key={index} style={styles.pinContainer}>
                <View style={styles.pinRow}>
                  <Text style={styles.pinLabel}>PIN:</Text>
                  <Text style={styles.pinCode}>{pinData.pin}</Text>
                </View>
                <View style={styles.pinRow}>
                  <Text style={styles.pinLabel}>Serial:</Text>
                  <Text style={styles.pinSerial}>{pinData.serial}</Text>
                </View>
              </View>
            ))}

            <Text style={styles.transactionDate}>
              {new Date(transaction.createdAt).toLocaleDateString()} • {new Date(transaction.createdAt).toLocaleTimeString()}
            </Text>
          </View>
        ))
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>No recharge cards generated yet</Text>
          <Text style={styles.emptyStateSubtext}>Generate your first recharge card to see it here</Text>
        </View>
      )}
    </ScrollView>
  );

  return (
    <View style={styles.container}>
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'generate' && styles.tabActive]}
          onPress={() => {
            setActiveTab('generate');
            setCurrentStep(1);
          }}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, activeTab === 'generate' && styles.tabTextActive]}>
            Generate Card
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'history' && styles.tabActive]}
          onPress={() => setActiveTab('history')}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, activeTab === 'history' && styles.tabTextActive]}>
            History
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'generate' ? (
        currentStep === 1 ? renderGenerateTab() : renderSummaryStep()
      ) : (
        renderHistoryTab()
      )}

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
              onPress={generateRechargePins}
              activeOpacity={0.8}
            >
              {isValidatingPin || isProcessingPayment ? (
                <View style={styles.buttonLoading}>
                  <ActivityIndicator size="small" color="#fff" />
                  <Text style={[styles.primaryButtonText, styles.buttonLoadingText]}>
                    {isProcessingPayment ? 'Generating...' : 'Validating...'}
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
      <Modal
        visible={showSuccessModal}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.successModalOverlay}>
          <View style={styles.successModalContent}>
            <View style={styles.successHeader}>
              <View style={styles.successIcon}>
                <Text style={styles.successIconText}>✓</Text>
              </View>
              <Text style={styles.successTitle}>Cards Generated!</Text>
              <Text style={styles.successSubtitle}>
                {quantity} {cardType} card{parseInt(quantity) > 1 ? 's' : ''} • {networks.find(n => n.id === selectedNetwork)?.label}
              </Text>
            </View>

            <ScrollView style={styles.pinsScrollView} showsVerticalScrollIndicator={false}>
              {generatedPins.length > 0 ? (
                generatedPins.map((pinData, index) => (
                  <View key={index} style={styles.generatedPinCard}>
                    <Text style={styles.generatedPinLabel}>Card #{index + 1}</Text>
                    <View style={styles.pinDataRow}>
                      <Text style={styles.pinDataLabel}>PIN</Text>
                      <Text style={styles.pinValue}>{pinData.pin || 'N/A'}</Text>
                    </View>
                    <View style={styles.pinDataRow}>
                      <Text style={styles.pinDataLabel}>Serial</Text>
                      <Text style={styles.serialValue}>{pinData.serial || 'N/A'}</Text>
                    </View>
                  </View>
                ))
              ) : (
                <View style={styles.noPinsCard}>
                  <Text style={styles.noPinsText}>
                    Cards generated successfully! Check the History tab to view your cards.
                  </Text>
                </View>
              )}
            </ScrollView>

            <View style={styles.successActions}>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={handleCloseSuccessModal}
                activeOpacity={0.8}
              >
                <Text style={styles.primaryButtonText}>Generate More</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={handleViewHistory}
                activeOpacity={0.8}
              >
                <Text style={styles.secondaryButtonText}>View History</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#f5f5f5' 
  },

  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e8e8e8',
    paddingTop: Platform.OS === 'ios' ? 50 : 16,
  },

  tab: {
    flex: 1,
    padding: 16,
    alignItems: 'center',
  },

  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#ff3b30',
  },

  tabText: {
    color: '#666',
    fontWeight: '500',
    fontSize: 15,
  },

  tabTextActive: {
    color: '#ff3b30',
    fontWeight: '600',
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

  networkRow: {
    flexDirection: 'row',
    gap: 10,
  },

  networkCard: {
    flex: 1,
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

  networkSelected: {
    borderColor: '#ff3b30',
    backgroundColor: '#fff5f5',
  },

  networkLogo: {
    width: 40,
    height: 40,
    resizeMode: 'contain',
    marginBottom: 6,
  },

  networkLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#666',
  },

  networkLabelSelected: {
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

  cardTypeRow: {
    flexDirection: 'row',
    gap: 12,
  },

  cardTypeBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e8e8e8',
    backgroundColor: '#fafafa',
    alignItems: 'center',
  },

  cardTypeSelected: {
    backgroundColor: '#ff3b30',
    borderColor: '#ff3b30',
  },

  cardTypeText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#666',
  },

  cardTypeTextSelected: {
    color: '#fff',
  },

  denominationGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },

  denominationBtn: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e8e8e8',
    backgroundColor: '#fafafa',
    minWidth: '30%',
  },

  denominationSelected: {
    backgroundColor: '#ff3b30',
    borderColor: '#ff3b30',
  },

  denominationText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    textAlign: 'center',
  },

  denominationTextSelected: {
    color: '#fff',
  },

  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    marginBottom: 8,
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

  totalAmount: {
    fontSize: 28,
    fontWeight: '700',
    color: '#ff3b30',
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
    fontWeight: '600',
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

  loader: {
    marginTop: 40,
  },

  emptyState: {
    paddingVertical: 60,
    alignItems: 'center',
  },

  emptyStateText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
    marginBottom: 8,
  },

  emptyStateSubtext: {
    fontSize: 14,
    color: '#999',
  },

  transactionCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },

  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },

  transactionNetwork: {
    fontWeight: '700',
    color: '#1a1a1a',
    fontSize: 15,
  },

  transactionAmount: {
    fontWeight: '700',
    color: '#ff3b30',
    fontSize: 15,
  },

  transactionType: {
    color: '#666',
    fontSize: 13,
    marginBottom: 12,
  },

  pinContainer: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },

  pinRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },

  pinLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },

  pinCode: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1a1a1a',
    letterSpacing: 1,
  },

  pinSerial: {
    fontSize: 13,
    color: '#666',
    fontWeight: '600',
  },

  transactionDate: {
    color: '#999',
    fontSize: 12,
    marginTop: 8,
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

  successModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },

  successModalContent: {
    backgroundColor: '#fff',
    borderRadius: 24,
    width: '100%',
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
  },

  successHeader: {
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },

  successIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#28a745',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },

  successIconText: {
    fontSize: 32,
    color: '#fff',
    fontWeight: 'bold',
  },

  successTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 8,
  },

  successSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },

  pinsScrollView: {
    maxHeight: 300,
    padding: 16,
  },

  generatedPinCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#ff3b30',
  },

  generatedPinLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 12,
  },

  pinDataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },

  pinDataLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#666',
  },

  pinValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ff3b30',
    letterSpacing: 2,
  },

  serialValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },

  noPinsCard: {
    backgroundColor: '#fff3cd',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#ff8c00',
  },

  noPinsText: {
    color: '#856404',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },

  successActions: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
});