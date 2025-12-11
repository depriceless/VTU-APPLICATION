import React, { useState, useEffect, useContext, useRef } from 'react';
import SuccessModal from './SuccessModal';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
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

const API_CONFIG = {
  BASE_URL: Platform.OS === 'web' 
    ? `${process.env.EXPO_PUBLIC_API_URL_WEB}/api`
    : `${process.env.EXPO_PUBLIC_API_URL}/api`,
};

interface Contact {
  id: string;
  name: string;
  phoneNumbers: { number: string }[];
}

interface RecentNumber {
  number: string;
  name?: string;
  timestamp: number;
}

interface UserBalance {
  main: number;
  bonus: number;
  total: number;
  amount: number;
  lastUpdated: number;
}

interface PinStatus {
  isPinSet: boolean;
  hasPinSet: boolean;
  isLocked: boolean;
  lockTimeRemaining: number;
  attemptsRemaining: number;
}

interface ElectricityProvider {
  id: string;
  name: string;
  fullName: string;
  acronym: string;
  isActive: boolean;
  minAmount: number;
  maxAmount: number;
  fee: number;
}

interface MeterType {
  id: string;
  name: string;
  type: 'prepaid' | 'postpaid';
  description: string;
}

// Helper function to safely extract balance amount (same as BuyAirtime)
const getBalanceAmount = (balanceData: any): number => {
  if (!balanceData) return 0;
  
  if (typeof balanceData === 'number') {
    return parseFloat(balanceData.toString()) || 0;
  }
  
  if (typeof balanceData === 'string') {
    return parseFloat(balanceData) || 0;
  }
  
  const amount = balanceData.total || 
                 balanceData.amount || 
                 balanceData.balance || 
                 balanceData.main || 
                 balanceData.totalBalance || 
                 balanceData.mainBalance || 
                 0;
  
  return parseFloat(amount) || 0;
};

export default function BuyElectricity() {
  const { token, balance, refreshBalance } = useContext(AuthContext);
  
  // Form state
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [selectedMeterType, setSelectedMeterType] = useState<string | null>(null);
  const [meterNumber, setMeterNumber] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerAccountNumber, setCustomerAccountNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [amount, setAmount] = useState('');
  const [pin, setPin] = useState('');
  
  // UI state
  const [showPinEntry, setShowPinEntry] = useState(false);
  const [showContactsModal, setShowContactsModal] = useState(false);
  const [showRecentsModal, setShowRecentsModal] = useState(false);
  const [showProvidersModal, setShowProvidersModal] = useState(false);
  const [showMeterTypeModal, setShowMeterTypeModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  
  // Data state
  const [contactsList, setContactsList] = useState<Contact[]>([]);
  const [recentNumbers, setRecentNumbers] = useState<RecentNumber[]>([]);
  const [userBalance, setUserBalance] = useState<UserBalance | null>(null);
  const [pinStatus, setPinStatus] = useState<PinStatus | null>(null);
  const [electricityProviders, setElectricityProviders] = useState<ElectricityProvider[]>([]);
  const [successData, setSuccessData] = useState<any>(null);
  
  // Loading states
  const [isLoadingContacts, setIsLoadingContacts] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);
  const [isValidatingPin, setIsValidatingPin] = useState(false);
  const [isValidatingMeter, setIsValidatingMeter] = useState(false);
  const [isLoadingProviders, setIsLoadingProviders] = useState(false);
  
  // Error states
  const [pinError, setPinError] = useState('');
  const [meterError, setMeterError] = useState('');
  
  const pinInputRef = useRef<TextInput>(null);

  const quickAmounts = [500, 1000, 2000, 5000, 10000, 20000];

  const meterTypes: MeterType[] = [
    { 
      id: '01', 
      name: 'Prepaid Meter', 
      type: 'prepaid',
      description: 'Pay before you use - Buy units in advance'
    },
    { 
      id: '02', 
      name: 'Postpaid Meter', 
      type: 'postpaid',
      description: 'Pay after you use - Monthly billing'
    },
  ];

  const defaultProviders: ElectricityProvider[] = [
    { id: '01', name: 'Eko Electric', fullName: 'Eko Electricity Distribution Company', acronym: 'EKEDC', isActive: true, minAmount: 500, maxAmount: 100000, fee: 0 },
    { id: '02', name: 'Ikeja Electric', fullName: 'Ikeja Electric Distribution Company', acronym: 'IKEDC', isActive: true, minAmount: 500, maxAmount: 100000, fee: 0 },
    { id: '03', name: 'Abuja Electric', fullName: 'Abuja Electricity Distribution Company', acronym: 'AEDC', isActive: true, minAmount: 500, maxAmount: 100000, fee: 0 },
    { id: '04', name: 'Kano Electric', fullName: 'Kano Electricity Distribution Company', acronym: 'KEDC', isActive: true, minAmount: 500, maxAmount: 100000, fee: 0 },
    { id: '05', name: 'Port Harcourt Electric', fullName: 'Port Harcourt Electric Distribution Company', acronym: 'PHEDC', isActive: true, minAmount: 500, maxAmount: 100000, fee: 0 },
    { id: '06', name: 'Jos Electric', fullName: 'Jos Electricity Distribution Company', acronym: 'JEDC', isActive: true, minAmount: 500, maxAmount: 100000, fee: 0 },
    { id: '07', name: 'Ibadan Electric', fullName: 'Ibadan Electricity Distribution Company', acronym: 'IBEDC', isActive: true, minAmount: 500, maxAmount: 100000, fee: 0 },
    { id: '08', name: 'Kaduna Electric', fullName: 'Kaduna Electric Distribution Company', acronym: 'KAEDC', isActive: true, minAmount: 500, maxAmount: 100000, fee: 0 },
    { id: '09', name: 'Enugu Electric', fullName: 'Enugu Electricity Distribution Company', acronym: 'EEDC', isActive: true, minAmount: 500, maxAmount: 100000, fee: 0 },
    { id: '10', name: 'Benin Electric', fullName: 'Benin Electricity Distribution Company', acronym: 'BEDC', isActive: true, minAmount: 500, maxAmount: 100000, fee: 0 },
  ];

  // Validation
  const isPhoneValid = phone.length === 11 && /^0[789][01]\d{8}$/.test(phone);
  const isMeterNumberValid = meterNumber.length >= 10 && /^\d+$/.test(meterNumber);
  const amountNum = parseInt(amount) || 0;
  const isAmountValid = amountNum >= 100 && amountNum <= 100000;
  const currentBalance = getBalanceAmount(userBalance);
  const hasEnoughBalance = currentBalance > 0 ? amountNum <= currentBalance : true;
  const canProceed = isPhoneValid && selectedProvider && selectedMeterType && 
                    isMeterNumberValid && isAmountValid && customerName.trim() !== '' && hasEnoughBalance;
  const isPinValid = pin.length === 4 && /^\d{4}$/.test(pin);

  // ============================================================================
  // EFFECTS
  // ============================================================================

  // Auto-validate meter when number is entered
  useEffect(() => {
    if (isMeterNumberValid && selectedProvider && selectedMeterType && meterNumber.length >= 10) {
      const timer = setTimeout(() => {
        validateMeter();
      }, 1500);
      return () => clearTimeout(timer);
    } else {
      setCustomerName('');
      setCustomerAddress('');
      setCustomerAccountNumber('');
      setMeterError('');
    }
  }, [meterNumber, selectedProvider, selectedMeterType]);

  // Initialize on mount
  useEffect(() => {
    loadRecentNumbers();
    loadFormState();
    fetchElectricityProviders();
    
    if (balance) {
      const balanceAmount = getBalanceAmount(balance);
      console.log('Initial balance from context:', balanceAmount);
      setUserBalance({
        main: balanceAmount,
        bonus: 0,
        total: balanceAmount,
        amount: balanceAmount,
        lastUpdated: Date.now(),
      });
    }
    
    setTimeout(() => {
      fetchUserBalance();
      checkPinStatus();
    }, 1000);
  }, []);

  // Refresh balance on step 2
  useEffect(() => {
    if (currentStep === 2) {
      fetchUserBalance();
    }
  }, [currentStep]);

  // Clear PIN when modal opens
  useEffect(() => {
    if (showPinEntry) {
      setPin('');
      setPinError('');
      checkPinStatus();
      setTimeout(() => pinInputRef.current?.focus(), 300);
    }
  }, [showPinEntry]);

  // Save form state
  useEffect(() => {
    saveFormState();
  }, [phone, amount, selectedProvider, selectedMeterType, meterNumber]);

  // ============================================================================
  // API FUNCTIONS
  // ============================================================================

  const getAuthToken = async () => {
    if (!token) throw new Error('Authentication required');
    return token;
  };

  const makeApiRequest = async (endpoint: string, options: any = {}) => {
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

      let data: any = {};
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
        
        if (endpoint === '/purchase' && data && typeof data === 'object') {
          const error: any = new Error(errorMessage);
          error.responseData = data;
          error.httpStatus = response.status;
          throw error;
        }
        
        throw new Error(errorMessage);
      }

      return data;
    } catch (error: any) {
      if (error.name === 'TypeError' && error.message.includes('Network request failed')) {
        throw new Error('Network connection failed. Please check your internet connection.');
      }
      throw error;
    }
  };

  const fetchElectricityProviders = async () => {
    setIsLoadingProviders(true);
    try {
      const response = await makeApiRequest('/electricity/providers');
      if (response.success && Array.isArray(response.data)) {
        setElectricityProviders(response.data);
      } else {
        setElectricityProviders(defaultProviders);
      }
    } catch (error) {
      setElectricityProviders(defaultProviders);
    } finally {
      setIsLoadingProviders(false);
    }
  };


const validateMeter = async () => {
  if (!isMeterNumberValid || !selectedProvider || !selectedMeterType) {
    setMeterError('Please enter valid meter details');
    return;
  }

  setIsValidatingMeter(true);
  setMeterError('');
  setCustomerName('');
  setCustomerAddress('');
  setCustomerAccountNumber('');

  try {
    // ✅ FIXED: Changed endpoint to match backend route
    const response = await makeApiRequest('/electricity/validate-meter', {
      method: 'POST',
      body: JSON.stringify({ 
        meterNumber, 
        provider: selectedProvider,
        meterType: selectedMeterType
      }),
    });

    if (response?.success) {
      setCustomerName(response.data?.customerName || 'Verified Customer');
      setCustomerAddress(response.data?.customerAddress || '');
      setCustomerAccountNumber(response.data?.accountNumber || '');
    } else {
      setMeterError(response?.message || 'Meter validation failed');
    }
  } catch (error: any) {
    setMeterError(error.message || 'Unable to validate meter');
    setCustomerName('');
    setCustomerAddress('');
    setCustomerAccountNumber('');
  } finally {
    setIsValidatingMeter(false);
  }
};

  const checkPinStatus = async () => {
    try {
      const response = await makeApiRequest('/purchase/pin-status');
      if (response.success) {
        setPinStatus(response);
      }
    } catch (error) {
      console.error('Error checking PIN status:', error);
    }
  };

  const fetchUserBalance = async () => {
    setIsLoadingBalance(true);
    try {
      if (refreshBalance) {
        await refreshBalance();
      }
      
      if (balance !== undefined && balance !== null) {
        const balanceAmount = getBalanceAmount(balance);
        const realBalance: UserBalance = {
          amount: balanceAmount,
          total: balanceAmount,
          main: balanceAmount,
          bonus: 0,
          lastUpdated: Date.now(),
        };
        setUserBalance(realBalance);
        await AsyncStorage.setItem("userBalance", JSON.stringify(realBalance));
      } else {
        const balanceData = await makeApiRequest("/balance");
        if (balanceData.success && balanceData.balance) {
          const balanceAmount = getBalanceAmount(balanceData.balance);
          const realBalance: UserBalance = {
            amount: balanceAmount,
            total: balanceAmount,
            main: balanceAmount,
            bonus: 0,
            lastUpdated: Date.now(),
          };
          setUserBalance(realBalance);
          await AsyncStorage.setItem("userBalance", JSON.stringify(realBalance));
        }
      }
    } catch (error) {
      try {
        const cachedBalance = await AsyncStorage.getItem("userBalance");
        if (cachedBalance) {
          setUserBalance(JSON.parse(cachedBalance));
        } else {
          setUserBalance(null);
        }
      } catch (cacheError) {
        setUserBalance(null);
      }
    } finally {
      setIsLoadingBalance(false);
    }
  };

  // ============================================================================
  // STORAGE FUNCTIONS
  // ============================================================================

  const saveFormState = async () => {
    try {
      const formState = { phone, selectedProvider, selectedMeterType, meterNumber, amount };
      await AsyncStorage.setItem('electricityFormState', JSON.stringify(formState));
    } catch (error) {
      console.log('Error saving form state:', error);
    }
  };

  const loadFormState = async () => {
    try {
      const savedState = await AsyncStorage.getItem('electricityFormState');
      if (savedState) {
        const formData = JSON.parse(savedState);
        if (formData.phone) setPhone(formData.phone);
        if (formData.selectedProvider) setSelectedProvider(formData.selectedProvider);
        if (formData.selectedMeterType) setSelectedMeterType(formData.selectedMeterType);
        if (formData.meterNumber) setMeterNumber(formData.meterNumber);
        if (formData.amount) setAmount(formData.amount);
      }
    } catch (error) {
      console.log('Error loading form state:', error);
    }
  };

  const saveRecentNumber = async (number: string, name?: string) => {
    try {
      const recent = await AsyncStorage.getItem('recentNumbers');
      let recentList: RecentNumber[] = recent ? JSON.parse(recent) : [];
      recentList = recentList.filter(item => item.number !== number);
      recentList.unshift({ number, name, timestamp: Date.now() });
      recentList = recentList.slice(0, 10);
      await AsyncStorage.setItem('recentNumbers', JSON.stringify(recentList));
      setRecentNumbers(recentList);
    } catch (error) {
      console.log('Error saving recent number:', error);
    }
  };

  const loadRecentNumbers = async () => {
    try {
      const recent = await AsyncStorage.getItem('recentNumbers');
      if (recent) {
        setRecentNumbers(JSON.parse(recent));
      }
    } catch (error) {
      console.log('Error loading recent numbers:', error);
    }
  };

  // ============================================================================
  // CONTACT FUNCTIONS
  // ============================================================================

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
        const validContacts = data.filter(c => c.phoneNumbers && c.phoneNumbers.length > 0);
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
      Alert.alert('Error', 'Failed to load contacts. Please try again.');
    } finally {
      setIsLoadingContacts(false);
    }
  };

  const showRecentNumbers = () => {
    if (recentNumbers.length > 0) {
      setShowRecentsModal(true);
    } else {
      Alert.alert('No recent numbers', 'You haven\'t made any recent electricity purchases.');
    }
  };

  const handleContactSelect = (number: string, name?: string) => {
    const cleaned = number.replace(/\D/g, '');
    let formattedNumber = '';

    if (cleaned.length === 10 && cleaned.startsWith('0')) {
      formattedNumber = cleaned;
    } else if (cleaned.length === 10) {
      formattedNumber = '0' + cleaned;
    } else if (cleaned.length === 11 && cleaned.startsWith('0')) {
      formattedNumber = cleaned;
    } else if (cleaned.length === 13 && cleaned.startsWith('234')) {
      formattedNumber = '0' + cleaned.substring(3);
    } else {
      Alert.alert('Invalid number', 'Selected contact does not have a valid Nigerian phone number.');
      return;
    }

    setPhone(formattedNumber);
    setShowContactsModal(false);
    setShowRecentsModal(false);
  };

  // ============================================================================
  // PAYMENT FUNCTIONS
  // ============================================================================

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

  const validatePinAndPurchase = async () => {
    if (!isPinValid) {
      setPinError('PIN must be exactly 4 digits');
      return;
    }

    setIsValidatingPin(true);
    setIsProcessingPayment(true);
    setPinError('');

    try {
      const response = await makeApiRequest('/purchase', {
        method: 'POST',
        body: JSON.stringify({
          type: 'electricity',
          provider: selectedProvider,
          meterType: selectedMeterType,
          meterNumber: meterNumber,
          phone: phone,
          amount: amountNum,
          pin: pin,
          customerName: customerName,
        }),
      });

      if (response.success === true) {
        await saveRecentNumber(phone, customerName);
        
        if (response.newBalance) {
          const balanceAmount = getBalanceAmount(response.newBalance);
          const updatedBalance: UserBalance = {
            main: balanceAmount,
            bonus: 0,
            total: balanceAmount,
            amount: balanceAmount,
            lastUpdated: Date.now(),
          };
          setUserBalance(updatedBalance);
          await AsyncStorage.setItem("userBalance", JSON.stringify(updatedBalance));
        }

        await AsyncStorage.removeItem('electricityFormState');

        const providerName = electricityProviders.find(p => p.id === selectedProvider)?.name || selectedProvider?.toUpperCase();
        const meterTypeName = meterTypes.find(m => m.id === selectedMeterType)?.name || selectedMeterType;
        
        setSuccessData({
          transaction: response.transaction || {},
          providerName,
          phone,
          amount: response.transaction?.amount || amountNum,
          meterNumber,
          customerName,
          customerAddress,
          meterType: meterTypeName,
          newBalance: response.newBalance
        });

        setShowPinEntry(false);
        setTimeout(() => setShowSuccessModal(true), 300);
      } else {
        if (response.message && response.message.toLowerCase().includes('pin')) {
          setPinError(response.message);
        }
        Alert.alert('Transaction Failed', response.message || 'Payment could not be processed');
      }
    } catch (error: any) {
      if (error.message.includes('locked') || error.message.includes('attempts') || error.message.includes('PIN')) {
        setPinError(error.message);
      } else {
        Alert.alert('Payment Error', error.message || 'Unable to process payment. Please try again.');
      }
    } finally {
      setIsValidatingPin(false);
      setIsProcessingPayment(false);
    }
  };

  const handlePinAreaPress = () => {
    setTimeout(() => pinInputRef.current?.focus(), 50);
  };

  const handleCloseSuccessModal = () => {
    setShowSuccessModal(false);
    setSuccessData(null);
  };

  const handleBuyMoreElectricity = () => {
    setShowSuccessModal(false);
    setSuccessData(null);
    setCurrentStep(1);
    setMeterNumber('');
    setAmount('');
    setPhone('');
    setPin('');
    setCustomerName('');
    setCustomerAddress('');
    setCustomerAccountNumber('');
    setPinError('');
    setMeterError('');
    setShowPinEntry(false);
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <View style={styles.container}>
      {/* STEP 1: FORM */}
      {currentStep === 1 && (
        <ScrollView
          style={styles.scrollContent}
          contentContainerStyle={styles.scrollContentContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Quick Actions */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Select Recipient</Text>
            <View style={styles.quickActions}>
              <TouchableOpacity 
                style={styles.quickActionBtn} 
                onPress={selectContact}
                disabled={isLoadingContacts}
              >
                {isLoadingContacts ? (
                  <ActivityIndicator size="small" color="#ff3b30" />
                ) : (
                  <>
                    <Text style={styles.quickActionIcon}>📱</Text>
                    <Text style={styles.quickActionText}>Contacts</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.quickActionBtn} 
                onPress={showRecentNumbers}
              >
                <Text style={styles.quickActionIcon}>🕐</Text>
                <Text style={styles.quickActionText}>Recent</Text>
                {recentNumbers.length > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{recentNumbers.length}</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Phone Number */}
          <View style={styles.card}>
            <Text style={styles.inputLabel}>Phone Number</Text>
            <TextInput
              style={styles.textInput}
              keyboardType="phone-pad"
              placeholder="08012345678"
              placeholderTextColor="#999"
              maxLength={11}
              value={phone}
              onChangeText={setPhone}
            />
            {phone !== '' && !isPhoneValid && (
              <Text style={styles.validationError}>Enter valid 11-digit number starting with 070, 080, 081, or 090</Text>
            )}
            {phone !== '' && isPhoneValid && (
              <View style={styles.validationSuccess}>
                <Text style={styles.validationSuccessText}>✓ Valid phone number</Text>
              </View>
            )}
          </View>

          {/* Provider Selection */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Electricity Provider</Text>
            <TouchableOpacity
              style={styles.packageSelector}
              onPress={() => setShowProvidersModal(true)}
              disabled={isLoadingProviders}
            >
              <Text style={[
                styles.packageSelectorText,
                selectedProvider && styles.packageSelectorTextSelected
              ]}>
                {selectedProvider ? 
                  `${electricityProviders.find(p => p.id === selectedProvider)?.fullName} (${electricityProviders.find(p => p.id === selectedProvider)?.acronym})` 
                  : 'Choose your DISCO'}
              </Text>
              {isLoadingProviders ? (
                <ActivityIndicator size="small" color="#999" />
              ) : (
                <Text style={styles.dropdownArrow}>▼</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Meter Type */}
          {selectedProvider && (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Meter Type</Text>
              <TouchableOpacity
                style={styles.packageSelector}
                onPress={() => setShowMeterTypeModal(true)}
              >
                <Text style={[
                  styles.packageSelectorText,
                  selectedMeterType && styles.packageSelectorTextSelected
                ]}>
                  {selectedMeterType ? 
                    meterTypes.find(m => m.id === selectedMeterType)?.name 
                    : 'Choose meter type'}
                </Text>
                <Text style={styles.dropdownArrow}>▼</Text>
              </TouchableOpacity>
              {selectedMeterType && (
                <Text style={styles.packageDescription}>
                  {meterTypes.find(m => m.id === selectedMeterType)?.description}
                </Text>
              )}
            </View>
          )}

          {/* Meter Number */}
          {selectedProvider && selectedMeterType && (
            <View style={styles.card}>
              <Text style={styles.inputLabel}>Meter Number</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={[
                    styles.textInput,
                    meterError && styles.textInputError,
                    customerName && !meterError && styles.textInputSuccess
                  ]}
                  keyboardType="numeric"
                  placeholder="Enter meter number"
                  placeholderTextColor="#999"
                  value={meterNumber}
                  onChangeText={setMeterNumber}
                  maxLength={15}
                />
                {isValidatingMeter && (
                  <ActivityIndicator 
                    size="small" 
                    color="#ff3b30" 
                    style={styles.inputLoader}
                  />
                )}
              </View>
              {meterError && (
                <Text style={styles.validationError}>{meterError}</Text>
              )}
              {customerName && !meterError && (
                <View style={styles.customerInfo}>
                  <Text style={styles.validationSuccessText}>✓ Meter verified</Text>
                  <Text style={styles.customerName}>Customer: {customerName}</Text>
                  {customerAddress && (
                    <Text style={styles.customerAddress}>Address: {customerAddress}</Text>
                  )}
                  {customerAccountNumber && (
                    <Text style={styles.customerAccount}>Account: {customerAccountNumber}</Text>
                  )}
                </View>
              )}
            </View>
          )}

          {/* Amount */}
          {selectedProvider && selectedMeterType && customerName && (
            <View style={styles.card}>
              <Text style={styles.inputLabel}>Amount (₦)</Text>
              <TextInput
                style={styles.textInput}
                keyboardType="numeric"
                placeholder="Enter amount (min. ₦100)"
                placeholderTextColor="#999"
                value={amount}
                onChangeText={setAmount}
                maxLength={6}
              />
              {amount !== '' && !isAmountValid && (
                <Text style={styles.validationError}>Amount must be between ₦100 and ₦100,000</Text>
              )}
              {amount !== '' && isAmountValid && hasEnoughBalance && (
                <View style={styles.validationSuccess}>
                  <Text style={styles.validationSuccessText}>✓ Valid amount</Text>
                </View>
              )}
              {amount !== '' && isAmountValid && !hasEnoughBalance && userBalance && (
                <Text style={styles.validationError}>
                  Insufficient balance. Available: ₦{userBalance.total.toLocaleString()}
                </Text>
              )}

              {/* Quick Amount Buttons */}
              <View style={styles.quickAmountGrid}>
                {quickAmounts.map((quickAmt) => (
                  <TouchableOpacity
                    key={quickAmt}
                    style={[
                      styles.quickAmountBtn,
                      amount === quickAmt.toString() && styles.quickAmountBtnSelected
                    ]}
                    onPress={() => handleQuickAmount(quickAmt)}
                  >
                    <Text style={[
                      styles.quickAmountText,
                      amount === quickAmt.toString() && styles.quickAmountTextSelected
                    ]}>
                      ₦{quickAmt.toLocaleString()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Proceed Button */}
          <TouchableOpacity
            style={[styles.primaryButton, !canProceed && styles.primaryButtonDisabled]}
            disabled={!canProceed}
            onPress={() => setCurrentStep(2)}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryButtonText}>
              {canProceed && amount 
                ? `Review Purchase • ₦${amountNum.toLocaleString()}`
                : 'Complete Form to Continue'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* STEP 2: REVIEW */}
      {currentStep === 2 && (
        <ScrollView
          style={styles.scrollContent}
          contentContainerStyle={styles.scrollContentContainer}
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
                    {electricityProviders.find(p => p.id === selectedProvider)?.fee > 0 && (
                      <View style={styles.balanceRow}>
                        <Text style={styles.balanceRowLabel}>Service Fee</Text>
                        <Text style={styles.balanceRowValue}>
                          -₦{electricityProviders.find(p => p.id === selectedProvider)?.fee}
                        </Text>
                      </View>
                    )}
                    <View style={styles.balanceDivider} />
                    <View style={styles.balanceRow}>
                      <Text style={styles.balanceRowLabelBold}>Remaining Balance</Text>
                      <Text style={[
                        styles.balanceRowValueBold,
                        ((userBalance.total || userBalance.amount || 0) - amountNum - (electricityProviders.find(p => p.id === selectedProvider)?.fee || 0)) < 0 && styles.negativeAmount
                      ]}>
                        ₦{Math.max(0, (userBalance.total || userBalance.amount || 0) - amountNum - (electricityProviders.find(p => p.id === selectedProvider)?.fee || 0)).toLocaleString()}
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
              <Text style={styles.summaryLabel}>Provider</Text>
              <Text style={styles.summaryValue}>
                {electricityProviders.find(p => p.id === selectedProvider)?.acronym}
              </Text>
            </View>

            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Meter Type</Text>
              <Text style={styles.summaryValue}>
                {meterTypes.find(m => m.id === selectedMeterType)?.name}
              </Text>
            </View>

            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Meter Number</Text>
              <Text style={styles.summaryValue}>{meterNumber}</Text>
            </View>

            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Customer</Text>
              <Text style={styles.summaryValue}>{customerName}</Text>
            </View>

            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Recipient</Text>
              <Text style={styles.summaryValue}>{phone}</Text>
            </View>

            <View style={styles.summaryDivider} />

            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Amount</Text>
              <Text style={styles.summaryValue}>₦{amountNum.toLocaleString()}</Text>
            </View>

            {electricityProviders.find(p => p.id === selectedProvider)?.fee > 0 && (
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Service Fee</Text>
                <Text style={styles.summaryValue}>
                  ₦{electricityProviders.find(p => p.id === selectedProvider)?.fee}
                </Text>
              </View>
            )}

            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabelTotal}>Total Amount</Text>
              <Text style={styles.summaryValueTotal}>
                ₦{(amountNum + (electricityProviders.find(p => p.id === selectedProvider)?.fee || 0)).toLocaleString()}
              </Text>
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
      )}

      {/* PIN Entry Modal - Bottom Sheet */}
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

            {/* PIN Input Area - Pressable */}
            <TouchableOpacity 
              style={styles.pinInputArea}
              activeOpacity={0.6}
              onPress={handlePinAreaPress}
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
              <Text style={styles.pinInputHint}>
                Tap here to enter PIN
              </Text>
              
              {/* Actual Input - Transparent overlay */}
              <TextInput
                ref={pinInputRef}
                style={styles.overlayPinInput}
                value={pin}
                onChangeText={(text) => {
                  const cleaned = text.replace(/\D/g, '').substring(0, 4);
                  setPin(cleaned);
                  setPinError('');
                }}
                keyboardType="number-pad"
                secureTextEntry={true}
                maxLength={4}
                autoFocus={false}
                caretHidden={true}
                contextMenuHidden={true}
              />
            </TouchableOpacity>

            {pinError && (
              <Text style={styles.pinErrorText}>{pinError}</Text>
            )}

            {/* Confirm Payment Button */}
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

            {/* Cancel PIN Entry */}
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

      {/* Provider Selection Modal */}
      <Modal visible={showProvidersModal} animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Provider</Text>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowProvidersModal(false)}
            >
              <Text style={styles.modalCloseText}>✕</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={electricityProviders.filter(p => p.isActive)}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.providerItem,
                  selectedProvider === item.id && styles.providerItemSelected
                ]}
                onPress={() => {
                  setSelectedProvider(item.id);
                  setShowProvidersModal(false);
                  setSelectedMeterType(null);
                  setMeterNumber('');
                  setCustomerName('');
                  setCustomerAddress('');
                  setCustomerAccountNumber('');
                  setMeterError('');
                }}
                activeOpacity={0.7}
              >
                <View style={styles.providerInfo}>
                  <Text style={styles.providerName}>{item.name}</Text>
                  <Text style={styles.providerFullName}>{item.fullName}</Text>
                  <Text style={styles.providerDetails}>
                    {item.acronym} • Fee: ₦{item.fee} • Min: ₦{item.minAmount.toLocaleString()}
                  </Text>
                </View>
                {selectedProvider === item.id && (
                  <Text style={styles.selectedIcon}>✓</Text>
                )}
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>

      {/* Meter Type Modal */}
      <Modal visible={showMeterTypeModal} animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Meter Type</Text>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowMeterTypeModal(false)}
            >
              <Text style={styles.modalCloseText}>✕</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={meterTypes}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.meterTypeItem,
                  selectedMeterType === item.id && styles.meterTypeItemSelected
                ]}
                onPress={() => {
                  setSelectedMeterType(item.id);
                  setShowMeterTypeModal(false);
                  setMeterNumber('');
                  setCustomerName('');
                  setCustomerAddress('');
                  setCustomerAccountNumber('');
                  setMeterError('');
                }}
                activeOpacity={0.7}
              >
                <View style={styles.meterTypeInfo}>
                  <Text style={styles.meterTypeName}>{item.name}</Text>
                  <Text style={styles.meterTypeDescription}>{item.description}</Text>
                </View>
                {selectedMeterType === item.id && (
                  <Text style={styles.selectedIcon}>✓</Text>
                )}
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>

      {/* Contacts Modal */}
      <Modal visible={showContactsModal} animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Contact</Text>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowContactsModal(false)}
            >
              <Text style={styles.modalCloseText}>✕</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={contactsList}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.listItem}
                onPress={() => handleContactSelect(item.phoneNumbers[0].number, item.name)}
                activeOpacity={0.7}
              >
                <View style={styles.contactAvatar}>
                  <Text style={styles.contactAvatarText}>
                    {item.name?.charAt(0).toUpperCase() || '?'}
                  </Text>
                </View>
                <View style={styles.contactDetails}>
                  <Text style={styles.contactName}>{item.name}</Text>
                  <Text style={styles.contactPhone}>{item.phoneNumbers[0].number}</Text>
                </View>
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>

      {/* Recent Numbers Modal */}
      <Modal visible={showRecentsModal} animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Recent Numbers</Text>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowRecentsModal(false)}
            >
              <Text style={styles.modalCloseText}>✕</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={recentNumbers}
            keyExtractor={(item) => item.number + item.timestamp}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.listItem}
                onPress={() => handleContactSelect(item.number, item.name)}
                activeOpacity={0.7}
              >
                <View style={styles.contactAvatar}>
                  <Text style={styles.contactAvatarText}>
                    {item.name?.charAt(0).toUpperCase() || '📱'}
                  </Text>
                </View>
                <View style={styles.contactDetails}>
                  <Text style={styles.contactName}>
                    {item.name || 'Unknown'}
                  </Text>
                  <Text style={styles.contactPhone}>{item.number}</Text>
                </View>
                <Text style={styles.dateText}>
                  {new Date(item.timestamp).toLocaleDateString()}
                </Text>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>No recent numbers found</Text>
              </View>
            }
          />
        </View>
      </Modal>

      {/* Success Modal */}
      {showSuccessModal && successData && (
        <SuccessModal
          visible={showSuccessModal}
          onClose={handleCloseSuccessModal}
          onBuyMore={handleBuyMoreElectricity}
          transaction={successData.transaction}
          type="electricity"
          providerName={successData.providerName}
          phone={successData.phone}
          amount={successData.amount}
          meterNumber={successData.meterNumber}
          customerName={successData.customerName}
          customerAddress={successData.customerAddress}
          meterType={successData.meterType}
          newBalance={successData.newBalance}
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

  quickActions: {
    flexDirection: 'row',
    gap: 10,
  },

  quickActionBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: '#f8f8f8',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e8e8e8',
    position: 'relative',
  },

  quickActionIcon: {
    fontSize: 20,
    marginBottom: 2,
  },

  quickActionText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#333',
  },

  badge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: '#ff3b30',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },

  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },

  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    marginBottom: 8,
  },

  inputContainer: {
    position: 'relative',
  },

  textInput: {
    borderWidth: 1,
    borderColor: '#e8e8e8',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1a1a1a',
    backgroundColor: '#fafafa',
  },

  textInputError: {
    borderColor: '#ff3b30',
    backgroundColor: '#fff5f5',
  },

  textInputSuccess: {
    borderColor: '#2e7d32',
    backgroundColor: '#f8fff9',
  },

  inputLoader: {
    position: 'absolute',
    right: 16,
    top: 16,
  },

  validationError: {
    color: '#ff3b30',
    fontSize: 13,
    marginTop: 8,
    fontWeight: '500',
  },

  validationSuccess: {
    marginTop: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#e8f5e9',
    borderRadius: 8,
    alignSelf: 'flex-start',
  },

  validationSuccessText: {
    color: '#2e7d32',
    fontSize: 13,
    fontWeight: '500',
  },

  packageSelector: {
    borderWidth: 1,
    borderColor: '#e8e8e8',
    borderRadius: 12,
    padding: 16,
    backgroundColor: '#fafafa',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  packageSelectorText: {
    fontSize: 14,
    color: '#999',
    flex: 1,
  },

  packageSelectorTextSelected: {
    color: '#1a1a1a',
    fontWeight: '500',
  },

  dropdownArrow: {
    fontSize: 12,
    color: '#999',
  },

  packageDescription: {
    fontSize: 12,
    color: '#999',
    marginTop: 8,
  },

  customerInfo: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#e8f5e9',
    borderRadius: 8,
  },

  customerName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    marginTop: 4,
  },

  customerAddress: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },

  customerAccount: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },

  quickAmountGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },

  quickAmountBtn: {
    flex: 1,
    minWidth: '30%',
    paddingVertical: 12,
    paddingHorizontal: 8,
    backgroundColor: '#f8f8f8',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e8e8e8',
    alignItems: 'center',
  },

  quickAmountBtnSelected: {
    backgroundColor: '#fff5f5',
    borderColor: '#ff3b30',
    borderWidth: 2,
  },

  quickAmountText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },

  quickAmountTextSelected: {
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
    minHeight: 120,
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

  overlayPinInput: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0,
    fontSize: 1,
  },

  pinErrorText: {
    color: '#ff3b30',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: -12,
    marginBottom: 20,
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e8e8e8',
  },

  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
  },

  modalCloseButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },

  modalCloseText: {
    fontSize: 20,
    color: '#666',
    fontWeight: '600',
  },

  providerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },

  providerItemSelected: {
    backgroundColor: '#fff5f5',
    borderLeftWidth: 4,
    borderLeftColor: '#ff3b30',
  },

  providerInfo: {
    flex: 1,
    paddingRight: 12,
  },

  providerName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 2,
  },

  providerFullName: {
    fontSize: 13,
    color: '#666',
    marginBottom: 2,
  },

  providerDetails: {
    fontSize: 12,
    color: '#999',
  },

  selectedIcon: {
    color: '#2e7d32',
    fontSize: 18,
    fontWeight: '700',
  },

  meterTypeItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },

  meterTypeItemSelected: {
    backgroundColor: '#fff5f5',
    borderLeftWidth: 4,
    borderLeftColor: '#ff3b30',
  },

  meterTypeInfo: {
    flex: 1,
    paddingRight: 12,
  },

  meterTypeName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },

  meterTypeDescription: {
    fontSize: 13,
    color: '#666',
  },

  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },

  contactAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  contactAvatarText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#666',
  },

  contactDetails: {
    flex: 1,
  },

  contactName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1a1a1a',
    marginBottom: 2,
  },

  contactPhone: {
    fontSize: 12,
    color: '#999',
  },

  dateText: {
    fontSize: 11,
    color: '#999',
  },

  emptyState: {
    padding: 40,
    alignItems: 'center',
  },

  emptyStateText: {
    color: '#999',
    fontSize: 14,
  },
});