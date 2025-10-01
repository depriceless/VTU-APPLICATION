import React, { useState, useEffect, useContext } from 'react';
import SuccessModal from './SuccessModal';
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
  StatusBar,
} from 'react-native';
import * as Contacts from 'expo-contacts';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthContext } from '../contexts/AuthContext';

// API Configuration
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
  logo?: any;
}

interface MeterType {
  id: string;
  name: string;
  type: 'prepaid' | 'postpaid';
  description: string;
}

export default function BuyElectricity({ navigation }: { navigation?: any }) {
  const { token, user, balance, refreshBalance } = useContext(AuthContext);
  
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [selectedMeterType, setSelectedMeterType] = useState<string | null>(null);
  const [meterNumber, setMeterNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [amount, setAmount] = useState('');
  const [pin, setPin] = useState('');
  
  // Customer validation data
  const [customerName, setCustomerName] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerAccountNumber, setCustomerAccountNumber] = useState('');
  
  // Lists and data
  const [contactsList, setContactsList] = useState<Contact[]>([]);
  const [recentNumbers, setRecentNumbers] = useState<RecentNumber[]>([]);
  const [userBalance, setUserBalance] = useState<UserBalance | null>(null);
  const [pinStatus, setPinStatus] = useState<PinStatus | null>(null);
  const [electricityProviders, setElectricityProviders] = useState<ElectricityProvider[]>([]);
  
  // Modal states
  const [showContactsModal, setShowContactsModal] = useState(false);
  const [showRecentsModal, setShowRecentsModal] = useState(false);
  const [showProvidersModal, setShowProvidersModal] = useState(false);
  const [showMeterTypeModal, setShowMeterTypeModal] = useState(false);
  
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
  
  // Success modal
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successData, setSuccessData] = useState(null);

  // Quick amount presets for electricity
  const quickAmounts = [500, 1000, 2000, 5000, 10000, 20000];

  // Meter Types
  const meterTypes: MeterType[] = [
    { 
      id: 'prepaid', 
      name: 'Prepaid Meter', 
      type: 'prepaid',
      description: 'Pay before you use electricity - Buy units in advance'
    },
    { 
      id: 'postpaid', 
      name: 'Postpaid Meter', 
      type: 'postpaid',
      description: 'Pay after you use electricity - Monthly billing system'
    },
  ];

  // Default electricity providers
  const defaultProviders: ElectricityProvider[] = [
    { id: 'aedc', name: 'Abuja Electric', fullName: 'Abuja Electricity Distribution Company', acronym: 'AEDC', isActive: true, minAmount: 100, maxAmount: 100000, fee: 50 },
    { id: 'bedc', name: 'Benin Electric', fullName: 'Benin Electricity Distribution Company', acronym: 'BEDC', isActive: true, minAmount: 100, maxAmount: 100000, fee: 50 },
    { id: 'eedc', name: 'Enugu Electric', fullName: 'Enugu Electricity Distribution Company', acronym: 'EEDC', isActive: true, minAmount: 100, maxAmount: 100000, fee: 50 },
    { id: 'ekedc', name: 'Eko Electric', fullName: 'Eko Electricity Distribution Company', acronym: 'EKEDC', isActive: true, minAmount: 100, maxAmount: 100000, fee: 50 },
    { id: 'ibedc', name: 'Ibadan Electric', fullName: 'Ibadan Electricity Distribution Company', acronym: 'IBEDC', isActive: true, minAmount: 100, maxAmount: 100000, fee: 50 },
    { id: 'ikedc', name: 'Ikeja Electric', fullName: 'Ikeja Electric Distribution Company', acronym: 'IKEDC', isActive: true, minAmount: 100, maxAmount: 100000, fee: 50 },
    { id: 'jedc', name: 'Jos Electric', fullName: 'Jos Electricity Distribution Company', acronym: 'JEDC', isActive: true, minAmount: 100, maxAmount: 100000, fee: 50 },
    { id: 'kaedc', name: 'Kaduna Electric', fullName: 'Kaduna Electric Distribution Company', acronym: 'KAEDC', isActive: true, minAmount: 100, maxAmount: 100000, fee: 50 },
    { id: 'kedc', name: 'Kano Electric', fullName: 'Kano Electricity Distribution Company', acronym: 'KEDC', isActive: true, minAmount: 100, maxAmount: 100000, fee: 50 },
    { id: 'phedc', name: 'Port Harcourt Electric', fullName: 'Port Harcourt Electric Distribution Company', acronym: 'PHEDC', isActive: true, minAmount: 100, maxAmount: 100000, fee: 50 },
    { id: 'yedc', name: 'Yola Electric', fullName: 'Yola Electricity Distribution Company', acronym: 'YEDC', isActive: true, minAmount: 100, maxAmount: 100000, fee: 50 },
  ];

  // Validation
  const isPhoneValid = phone.length === 11 && /^0[789][01]\d{8}$/.test(phone);
  const isMeterNumberValid = meterNumber.length >= 10 && /^\d+$/.test(meterNumber);
  const amountNum = parseInt(amount) || 0;
  const isAmountValid = amountNum >= 100 && amountNum <= 100000;
  const hasEnoughBalance = userBalance ? amountNum <= (userBalance.total || userBalance.amount || 0) : true;
  const canProceed = isPhoneValid && selectedProvider && selectedMeterType && 
                    isMeterNumberValid && isAmountValid && hasEnoughBalance && 
                    customerName.trim() !== '';
  const isPinValid = pin.length === 4 && /^\d{4}$/.test(pin);

  // Load data on mount
  useEffect(() => {
    loadRecentNumbers();
    loadFormState();
    fetchElectricityProviders();
    
    // Initialize balance from AuthContext
    if (balance) {
      const balanceAmount = parseFloat(balance.amount) || 0;
      setUserBalance({
        main: balanceAmount,
        bonus: 0,
        total: balanceAmount,
        amount: balanceAmount,
        lastUpdated: Date.now(),
      });
    }
    
    // Fetch updated data
    setTimeout(() => {
      fetchUserBalance();
      checkPinStatus();
    }, 1000);
  }, []);

  // Refresh balance when stepping to review page
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

  // Save form state whenever it changes
  useEffect(() => {
    saveFormState();
  }, [phone, amount, selectedProvider, selectedMeterType, meterNumber]);

  // Meter validation when meter number changes
  useEffect(() => {
    if (isMeterNumberValid && selectedProvider && selectedMeterType && meterNumber.length >= 10) {
      const timeoutId = setTimeout(() => {
        validateMeter();
      }, 1500);

      return () => clearTimeout(timeoutId);
    } else {
      setCustomerName('');
      setCustomerAddress('');
      setCustomerAccountNumber('');
      setMeterError('');
    }
  }, [meterNumber, selectedProvider, selectedMeterType]);

  // Auth token getter using AuthContext
  const getAuthToken = async () => {
    if (!token) {
      throw new Error('Authentication required');
    }
    return token;
  };

  // API request function
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

      let data = {};
      if (responseText.trim()) {
        try {
          data = JSON.parse(responseText);
        } catch (parseError) {
          throw new Error(`Invalid JSON response from server. Status: ${response.status}`);
        }
      }

      // Handle authentication errors
      if (response.status === 401) {
        throw new Error('Session expired. Please login again.');
      }

      if (!response.ok) {
        const errorMessage = data?.message || data?.error || `HTTP ${response.status}: ${response.statusText}`;
        
        if (endpoint === '/purchase' && data && typeof data === 'object') {
          const error = new Error(errorMessage);
          (error as any).responseData = data;
          (error as any).httpStatus = response.status;
          throw error;
        }
        
        throw new Error(errorMessage);
      }

      return data;

    } catch (error) {
      if (error.name === 'TypeError' && error.message.includes('Network request failed')) {
        throw new Error('Network connection failed. Please check your internet connection.');
      }

      throw error;
    }
  };

  // Data fetching functions
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

  const fetchUserBalance = async () => {
    setIsLoadingBalance(true);
    try {
      // Use AuthContext's refresh function
      if (refreshBalance) {
        await refreshBalance();
      }
      
      // Update local balance state from AuthContext
      if (balance) {
        const balanceAmount = parseFloat(balance.amount) || 0;
        
        const realBalance = {
          main: balanceAmount,
          bonus: 0,
          total: balanceAmount,
          amount: balanceAmount,
          lastUpdated: balance.lastUpdated || Date.now(),
        };

        setUserBalance(realBalance);
        await AsyncStorage.setItem("userBalance", JSON.stringify(realBalance));
      } else {
        // Fallback: try direct API call
        const balanceData = await makeApiRequest("/balance");
        
        if (balanceData.success && balanceData.balance) {
          const balanceAmount = parseFloat(balanceData.balance.amount) || 0;
          
          const realBalance = {
            main: balanceAmount,
            bonus: 0,
            total: balanceAmount,
            amount: balanceAmount,
            lastUpdated: balanceData.balance.lastUpdated || Date.now(),
          };

          setUserBalance(realBalance);
          await AsyncStorage.setItem("userBalance", JSON.stringify(realBalance));
        }
      }
    } catch (error) {
      // Try to use cached balance as fallback
      try {
        const cachedBalance = await AsyncStorage.getItem("userBalance");
        if (cachedBalance) {
          const parsedBalance = JSON.parse(cachedBalance);
          setUserBalance(parsedBalance);
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

  // Meter validation
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
        setMeterError(response?.message || 'Meter validation failed. Please check your meter number.');
      }
    } catch (error) {
      setMeterError(error.message || 'Unable to validate meter. Please check your details and try again.');
      setCustomerName('');
      setCustomerAddress('');
      setCustomerAccountNumber('');
    } finally {
      setIsValidatingMeter(false);
    }
  };

  // Storage functions
  const saveFormState = async () => {
    try {
      const formState = { 
        phone, 
        selectedProvider, 
        selectedMeterType, 
        meterNumber, 
        amount 
      };
      await AsyncStorage.setItem('electricityFormState', JSON.stringify(formState));
    } catch (error) {
      console.log('Error saving form state:', error);
    }
  };

  const loadFormState = async () => {
    try {
      const savedState = await AsyncStorage.getItem('electricityFormState');
      if (savedState) {
        const { 
          phone: savedPhone, 
          selectedProvider: savedProvider, 
          selectedMeterType: savedMeterType, 
          meterNumber: savedMeter, 
          amount: savedAmount 
        } = JSON.parse(savedState);

        setPhone(savedPhone || '');
        setSelectedProvider(savedProvider || null);
        setSelectedMeterType(savedMeterType || null);
        setMeterNumber(savedMeter || '');
        setAmount(savedAmount || '');
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
      recentList.unshift({
        number,
        name,
        timestamp: Date.now()
      });
      recentList = recentList.slice(0, 20);

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

  // Contact functions
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

  const handleQuickAmount = (quickAmount: number) => {
    setAmount(quickAmount.toString());
  };

  // Payment processing
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
        // Save recent number
        await saveRecentNumber(phone, customerName);
        
        // Update balance
        if (response.newBalance) {
          const balanceAmount = response.newBalance.amount || 
                               response.newBalance.totalBalance || 
                               response.newBalance.mainBalance || 0;
          
          const updatedBalance = {
            main: balanceAmount,
            bonus: 0,
            total: balanceAmount,
            amount: balanceAmount,
            lastUpdated: response.newBalance.lastUpdated || Date.now(),
          };

          setUserBalance(updatedBalance);
          await AsyncStorage.setItem("userBalance", JSON.stringify(updatedBalance));
        }

        // Clear form
        await AsyncStorage.removeItem('electricityFormState');

        // Prepare success data
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
    }
  };

  const getPhoneValidation = (number: string): string => {
    if (!isPhoneValid) return 'Enter valid 11-digit number starting with 070, 080, 081, or 090';
    return '';
  };

  const handleCloseSuccessModal = () => {
    setShowSuccessModal(false);
    setSuccessData(null);
    // Reset form to initial state
    setCurrentStep(1);
    setSelectedProvider(null);
    setSelectedMeterType(null);
    setMeterNumber('');
    setAmount('');
    setPhone('');
    setPin('');
    setCustomerName('');
    setCustomerAddress('');
    setCustomerAccountNumber('');
    setPinError('');
    setMeterError('');
  };

  const handleBuyMoreElectricity = () => {
    setShowSuccessModal(false);
    setSuccessData(null);
    setCurrentStep(1);
    setMeterNumber('');
    setAmount('');
    setPin('');
    setCustomerName('');
    setCustomerAddress('');
    setCustomerAccountNumber('');
    setPinError('');
    setMeterError('');
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#ff3b30" />
      
      

      {/* STEP 1: FORM */}
      {currentStep === 1 && (
        <ScrollView
          style={styles.scrollContent}
          contentContainerStyle={{ paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Beneficiary Section */}
          <View style={styles.section}>
            <Text style={styles.label}>Select Beneficiary</Text>
            <View style={styles.buttonRow}>
              <TouchableOpacity 
                style={[styles.actionBtn, { flex: 1, marginRight: 8 }]} 
                onPress={selectContact}
                disabled={isLoadingContacts}
              >
                {isLoadingContacts ? (
                  <ActivityIndicator size="small" color="#555" />
                ) : (
                  <Text style={styles.actionBtnText}>📞 Contacts</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.actionBtn, { flex: 1, marginLeft: 8 }]} 
                onPress={showRecentNumbers}
              >
                <Text style={styles.actionBtnText}>🕐 Recent ({recentNumbers.length})</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Phone Number */}
          <View style={styles.section}>
            <Text style={styles.label}>Phone Number</Text>
            <TextInput
              style={styles.input}
              keyboardType="phone-pad"
              placeholder="Enter phone number (e.g., 08012345678)"
              maxLength={11}
              value={phone}
              onChangeText={setPhone}
            />
            {phone !== '' && !isPhoneValid && (
              <Text style={styles.error}>{getPhoneValidation(phone)}</Text>
            )}
            {phone !== '' && isPhoneValid && (
              <Text style={styles.success}>✓ Valid phone number</Text>
            )}
          </View>

          {/* Provider Selection */}
          <View style={styles.section}>
            <Text style={styles.label}>Select Electricity Provider</Text>
            <TouchableOpacity
              style={styles.selector}
              onPress={() => setShowProvidersModal(true)}
              disabled={isLoadingProviders}
            >
              <View style={styles.selectorContent}>
                <Text style={[styles.selectorText, selectedProvider ? styles.selectorTextSelected : {}]}>
                  {selectedProvider ? 
                    electricityProviders.find(p => p.id === selectedProvider)?.fullName + 
                    ` (${electricityProviders.find(p => p.id === selectedProvider)?.acronym})` 
                    : 'Choose your electricity provider (DISCO)'}
                </Text>
                {isLoadingProviders ? (
                  <ActivityIndicator size="small" color="#999" />
                ) : (
                  <Text style={styles.dropdownArrow}>▼</Text>
                )}
              </View>
            </TouchableOpacity>
          </View>

          {/* Meter Type Selection */}
          {selectedProvider && (
            <View style={styles.section}>
              <Text style={styles.label}>Meter Type</Text>
              <TouchableOpacity
                style={styles.selector}
                onPress={() => setShowMeterTypeModal(true)}
              >
                <View style={styles.selectorContent}>
                  <Text style={[styles.selectorText, selectedMeterType ? styles.selectorTextSelected : {}]}>
                    {selectedMeterType ? 
                      meterTypes.find(m => m.id === selectedMeterType)?.name 
                      : 'Choose your meter type'}
                  </Text>
                  <Text style={styles.dropdownArrow}>▼</Text>
                </View>
              </TouchableOpacity>
              {selectedMeterType && (
                <Text style={styles.helperText}>
                  {meterTypes.find(m => m.id === selectedMeterType)?.description}
                </Text>
              )}
            </View>
          )}

          {/* Meter Number */}
          {selectedProvider && selectedMeterType && (
            <View style={styles.section}>
              <Text style={styles.label}>Meter Number</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={[
                    styles.input, 
                    meterError ? styles.inputError : 
                    customerName ? styles.inputSuccess : {}
                  ]}
                  keyboardType="numeric"
                  placeholder="Enter your meter number"
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
                <Text style={styles.error}>{meterError}</Text>
              )}

              {customerName && !meterError && (
                <View style={styles.customerInfo}>
                  <Text style={styles.success}>✓ Meter verified</Text>
                  <Text style={styles.customerName}>Customer: {customerName}</Text>
                  {customerAddress && (
                    <Text style={styles.customerAddress}>Address: {customerAddress}</Text>
                  )}
                  {customerAccountNumber && (
                    <Text style={styles.customerAccount}>Account: {customerAccountNumber}</Text>
                  )}
                </View>
              )}

              {!isMeterNumberValid && meterNumber.length > 0 && meterNumber.length < 10 && (
                <Text style={styles.error}>Meter number must be at least 10 digits</Text>
              )}
            </View>
          )}

          {/* Quick Amount Buttons */}
          {selectedProvider && selectedMeterType && customerName && (
            <View style={styles.section}>
              <Text style={styles.label}>Quick Amount</Text>
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
          )}

          {/* Custom Amount */}
          {selectedProvider && selectedMeterType && customerName && (
            <View style={styles.section}>
              <Text style={styles.label}>Or Enter Custom Amount (₦)</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                placeholder="Enter amount (minimum ₦100)"
                value={amount}
                onChangeText={setAmount}
                maxLength={6}
              />
              {amount !== '' && !isAmountValid && (
                <Text style={styles.error}>Amount must be between ₦100 and ₦100,000</Text>
              )}
              {amount !== '' && isAmountValid && hasEnoughBalance && (
                <Text style={styles.success}>✓ Valid amount</Text>
              )}
              {amount !== '' && isAmountValid && !hasEnoughBalance && userBalance && (
                <Text style={styles.error}>
                  Insufficient balance. Available: ₦{userBalance.total.toLocaleString()}
                </Text>
              )}
              {amount !== '' && isAmountValid && (
                <View style={styles.amountInfo}>
                  <Text style={styles.amountDisplay}>
                    You will pay: ₦{amountNum.toLocaleString()}
                  </Text>
                  {electricityProviders.find(p => p.id === selectedProvider)?.fee && (
                    <Text style={styles.feeInfo}>
                      + ₦{electricityProviders.find(p => p.id === selectedProvider)?.fee} transaction fee
                    </Text>
                  )}
                </View>
              )}
            </View>
          )}

          {/* Proceed Button */}
          <TouchableOpacity
            style={[styles.proceedBtn, !canProceed && styles.proceedDisabled]}
            disabled={!canProceed}
            onPress={() => setCurrentStep(2)}
          >
            <Text style={styles.proceedText}>
              {!isPhoneValid ? 'Enter Valid Phone Number' :
               !selectedProvider ? 'Select Provider' :
               !selectedMeterType ? 'Select Meter Type' :
               !customerName ? 'Validate Meter Number' :
               !isAmountValid ? 'Enter Valid Amount' :
               !hasEnoughBalance ? 'Insufficient Balance' :
               `Review Purchase • ₦${amount ? amountNum.toLocaleString() : '0'}`}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* STEP 2: REVIEW/SUMMARY */}
      {currentStep === 2 && (
        <ScrollView
          style={styles.scrollContent}
          contentContainerStyle={{ paddingBottom: 40 }}
        >
          {/* Balance Card */}
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
                  <Text style={styles.refreshText}>🔄</Text>
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

                {/* Show balance after transaction */}
                {amountNum > 0 && (
                  <View style={styles.transactionPreview}>
                    <Text style={styles.previewLabel}>After purchase:</Text>
                    <Text style={[
                      styles.previewAmount,
                      ((userBalance.total || userBalance.amount || 0) - amountNum - (electricityProviders.find(p => p.id === selectedProvider)?.fee || 0)) < 0 ? 
                        styles.insufficientPreview : styles.sufficientPreview
                    ]}>
                      ₦{Math.max(0, 
                        (userBalance.total || userBalance.amount || 0) - 
                        amountNum - 
                        (electricityProviders.find(p => p.id === selectedProvider)?.fee || 0)
                      ).toLocaleString()}
                    </Text>
                  </View>
                )}

                {/* Insufficient balance warning */}
                {amountNum > (userBalance.total || userBalance.amount || 0) && (
                  <View style={styles.insufficientBalanceWarning}>
                    <Text style={styles.warningText}>
                      ⚠️ Insufficient balance for this transaction
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
                  {isLoadingBalance ? 'Loading your balance...' : 'Unable to load balance'}
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
          
          {/* Summary Card */}
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Purchase Summary</Text>

            {/* Provider */}
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Provider:</Text>
              <Text style={styles.summaryValue}>
                {electricityProviders.find(p => p.id === selectedProvider)?.acronym}
              </Text>
            </View>

            {/* Meter Type */}
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Meter Type:</Text>
              <Text style={styles.summaryValue}>
                {meterTypes.find(m => m.id === selectedMeterType)?.name}
              </Text>
            </View>

            {/* Meter Number */}
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Meter Number:</Text>
              <Text style={styles.summaryValue}>{meterNumber}</Text>
            </View>

            {/* Customer */}
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Customer:</Text>
              <Text style={styles.summaryValue}>{customerName}</Text>
            </View>

            {/* Phone */}
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Phone:</Text>
              <Text style={styles.summaryValue}>{phone}</Text>
            </View>

            <View style={styles.summaryDivider} />

            {/* Amount */}
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Amount:</Text>
              <Text style={[styles.summaryValue, styles.summaryAmount]}>
                ₦{amountNum.toLocaleString()}
              </Text>
            </View>

            {/* Transaction Fee */}
            {electricityProviders.find(p => p.id === selectedProvider)?.fee && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Transaction Fee:</Text>
                <Text style={styles.summaryValue}>
                  ₦{electricityProviders.find(p => p.id === selectedProvider)?.fee}
                </Text>
              </View>
            )}

            {/* Total */}
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total:</Text>
              <Text style={[styles.summaryValue, styles.summaryTotal]}>
                ₦{(
                  amountNum + 
                  (electricityProviders.find(p => p.id === selectedProvider)?.fee || 0)
                ).toLocaleString()}
              </Text>
            </View>

            {userBalance && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Balance After:</Text>
                <Text style={[
                  styles.summaryValue, 
                  styles.summaryBalance,
                  ((userBalance.total || userBalance.amount || 0) - amountNum - (electricityProviders.find(p => p.id === selectedProvider)?.fee || 0)) < 0 ? 
                    styles.negativeBalance : {}
                ]}>
                  ₦{Math.max(0, 
                    (userBalance.total || userBalance.amount || 0) - 
                    amountNum - 
                    (electricityProviders.find(p => p.id === selectedProvider)?.fee || 0)
                  ).toLocaleString()}
                </Text>
              </View>
            )}
          </View>

          {/* Proceed to PIN Button */}
          <TouchableOpacity
            style={[
              styles.proceedBtn, 
              !hasEnoughBalance && styles.proceedDisabled
            ]}
            disabled={!hasEnoughBalance}
            onPress={() => setCurrentStep(3)}
          >
            <Text style={styles.proceedText}>
              {!hasEnoughBalance ? 'Insufficient Balance' : 'Enter PIN to Pay'}
            </Text>
          </TouchableOpacity>

          {/* Back Button */}
          <TouchableOpacity
            style={[styles.proceedBtn, styles.backBtn]}
            onPress={() => setCurrentStep(1)}
          >
            <Text style={[styles.proceedText, styles.backBtnText]}>← Edit Details</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* STEP 3: PIN ENTRY */}
      {currentStep === 3 && (
        <ScrollView
          style={styles.scrollContent}
          contentContainerStyle={{ paddingBottom: 40 }}
        >
          {/* PIN Status Check */}
          {pinStatus?.isLocked && (
            <View style={styles.lockedCard}>
              <Text style={styles.lockedTitle}>🔒 Account Locked</Text>
              <Text style={styles.lockedText}>
                Too many failed PIN attempts. Please try again in {pinStatus.lockTimeRemaining} minutes.
              </Text>
              <TouchableOpacity 
                style={styles.refreshBtn}
                onPress={checkPinStatus}
              >
                <Text style={styles.refreshText}>🔄 Check Status</Text>
              </TouchableOpacity>
            </View>
          )}

          {!pinStatus?.isPinSet && (
            <View style={styles.noPinCard}>
              <Text style={styles.noPinTitle}>📱 PIN Required</Text>
              <Text style={styles.noPinText}>
                You need to set up a 4-digit transaction PIN in your account settings before making purchases.
              </Text>
            </View>
          )}

          {pinStatus?.isPinSet && !pinStatus?.isLocked && (
            <>
              {/* Transaction Summary */}
              <View style={styles.pinSummaryCard}>
                <Text style={styles.pinSummaryTitle}>Confirm Transaction</Text>

                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Provider:</Text>
                  <Text style={styles.summaryValue}>
                    {electricityProviders.find(p => p.id === selectedProvider)?.name}
                  </Text>
                </View>

                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Meter:</Text>
                  <Text style={styles.summaryValue}>{meterNumber}</Text>
                </View>

                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Customer:</Text>
                  <Text style={styles.summaryValue}>{customerName}</Text>
                </View>

                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Phone:</Text>
                  <Text style={styles.summaryValue}>{phone}</Text>
                </View>

                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Total Amount:</Text>
                  <Text style={[styles.summaryValue, styles.summaryAmount]}>
                    ₦{(
                      amountNum + 
                      (electricityProviders.find(p => p.id === selectedProvider)?.fee || 0)
                    ).toLocaleString()}
                  </Text>
                </View>
              </View>

              {/* PIN Entry */}
              <View style={styles.pinCard}>
                <Text style={styles.pinTitle}>Enter Your 4-Digit PIN</Text>

                {pinStatus?.attemptsRemaining < 3 && (
                  <Text style={styles.attemptsWarning}>
                    ⚠️ {pinStatus.attemptsRemaining} attempts remaining
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
                    placeholder="****"
                    maxLength={4}
                    autoFocus={true}
                  />
                </View>

                {pinError ? (
                  <Text style={styles.pinError}>{pinError}</Text>
                ) : (
                  <Text style={styles.pinHelp}>
                    Enter your 4-digit transaction PIN to complete this purchase
                  </Text>
                )}

                {/* PIN Dots Display */}
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

              {/* Confirm Payment Button */}
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
                      {isProcessingPayment ? 'Processing Payment...' : 'Validating PIN...'}
                    </Text>
                  </View>
                ) : (
                  <Text style={styles.proceedText}>
                    Confirm Payment • ₦{(
                      amountNum + 
                      (electricityProviders.find(p => p.id === selectedProvider)?.fee || 0)
                    ).toLocaleString()}
                  </Text>
                )}
              </TouchableOpacity>
            </>
          )}

          {/* Back Button */}
          <TouchableOpacity
            style={[styles.proceedBtn, styles.backBtn]}
            onPress={() => setCurrentStep(2)}
            disabled={isValidatingPin || isProcessingPayment}
          >
            <Text style={[styles.proceedText, styles.backBtnText]}>← Back to Summary</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* Provider Selection Modal */}
      <Modal visible={showProvidersModal} animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Electricity Provider</Text>
            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => setShowProvidersModal(false)}
            >
              <Text style={styles.modalCloseBtnText}>✕</Text>
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
                  // Reset dependent fields
                  setSelectedMeterType(null);
                  setMeterNumber('');
                  setCustomerName('');
                  setCustomerAddress('');
                  setCustomerAccountNumber('');
                  setMeterError('');
                }}
              >
                <View style={styles.providerInfo}>
                  <Text style={styles.providerName}>{item.name}</Text>
                  <Text style={styles.providerFullName}>{item.fullName}</Text>
                  <Text style={styles.providerDetails}>
                    ({item.acronym}) • Fee: ₦{item.fee} • Min: ₦{item.minAmount}
                  </Text>
                </View>
                {selectedProvider === item.id && (
                  <Text style={styles.selectedIcon}>✓</Text>
                )}
              </TouchableOpacity>
            )}
            showsVerticalScrollIndicator={false}
          />
        </View>
      </Modal>

      {/* Meter Type Selection Modal */}
      <Modal visible={showMeterTypeModal} animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Meter Type</Text>
            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => setShowMeterTypeModal(false)}
            >
              <Text style={styles.modalCloseBtnText}>✕</Text>
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
                  // Reset dependent fields
                  setMeterNumber('');
                  setCustomerName('');
                  setCustomerAddress('');
                  setCustomerAccountNumber('');
                  setMeterError('');
                }}
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
            showsVerticalScrollIndicator={false}
          />
        </View>
      </Modal>

      {/* Contacts Modal */}
      <Modal visible={showContactsModal} animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Contact</Text>
            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => setShowContactsModal(false)}
            >
              <Text style={styles.modalCloseBtnText}>✕</Text>
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
          />
        </View>
      </Modal>

      {/* Recent Numbers Modal */}
      <Modal visible={showRecentsModal} animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Recent Numbers</Text>
            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => setShowRecentsModal(false)}
            >
              <Text style={styles.modalCloseBtnText}>✕</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={recentNumbers}
            keyExtractor={(item) => item.number + item.timestamp}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.contactItem}
                onPress={() => handleContactSelect(item.number, item.name)}
              >
                <View style={styles.contactInfo}>
                  <Text style={styles.contactName}>
                    {item.name || 'Unknown'}
                  </Text>
                  <Text style={styles.contactNumber}>{item.number}</Text>
                </View>
                <Text style={styles.recentTime}>
                  {new Date(item.timestamp).toLocaleDateString()}
                </Text>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <Text style={styles.emptyText}>No recent numbers found</Text>
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

// Complete StyleSheet
const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#f8f9fa' 
  },


  // Content
 scrollContent: { 
  flex: 1 
},


  section: { 
    margin: 16, 
    marginBottom: 24 
  },
  label: { 
    fontSize: 16, 
    fontWeight: '600', 
    marginBottom: 8, 
    color: '#2b2d42' 
  },
  helperText: {
    fontSize: 13,
    color: '#6c757d',
    marginTop: 4,
    fontStyle: 'italic',
  },

  // Button Row
  buttonRow: { 
    flexDirection: 'row' 
  },
  actionBtn: {
    borderWidth: 1,
    borderColor: '#dee2e6',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  actionBtnText: { 
    color: '#495057', 
    fontSize: 14, 
    fontWeight: '500' 
  },

  // Input Styles
  input: {
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    backgroundColor: '#fff',
    color: '#2b2d42',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  inputError: {
    borderColor: '#ff6b6b',
  },
  inputSuccess: {
    borderColor: '#51cf66',
  },
  inputContainer: {
    position: 'relative',
  },
  inputLoader: {
    position: 'absolute',
    right: 16,
    top: 16,
  },
  error: { 
    color: '#ff6b6b', 
    fontSize: 13, 
    marginTop: 6,
    fontWeight: '500' 
  },
  success: {
    color: '#51cf66',
    fontSize: 13,
    marginTop: 6,
    fontWeight: '500'
  },

  // Selector Styles
  selector: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  selectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectorText: {
    fontSize: 16,
    color: '#adb5bd',
    flex: 1,
    marginRight: 8,
  },
  selectorTextSelected: {
    color: '#2b2d42',
  },
  dropdownArrow: {
    color: '#adb5bd',
    fontSize: 12,
  },

  // Customer Info
  customerInfo: {
    backgroundColor: '#f8f9fa',
    borderLeftWidth: 3,
    borderLeftColor: '#51cf66',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  customerName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2b2d42',
    marginTop: 4,
  },
  customerAddress: {
    fontSize: 13,
    color: '#6c757d',
    marginTop: 2,
  },
  customerAccount: {
    fontSize: 13,
    color: '#6c757d',
    marginTop: 2,
  },

  // Quick Amount
  quickAmountGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickAmountBtn: {
    borderWidth: 1,
    borderColor: '#dee2e6',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#fff',
    minWidth: 80,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  quickAmountSelected: {
    backgroundColor: '#ff3b30',
    borderColor: '#ff3b30',
  },
  quickAmountText: {
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '500',
    color: '#495057',
  },
  quickAmountSelectedText: {
    color: '#fff',
  },

  // Amount Info
  amountInfo: {
    marginTop: 8,
  },
  amountDisplay: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2b2d42',
    marginTop: 4,
  },
  feeInfo: {
    fontSize: 13,
    color: '#6c757d',
    marginTop: 2,
  },

  // Proceed Button
  proceedBtn: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#ff3b30',
    alignItems: 'center',
    shadowColor: '#ff3b30',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  proceedDisabled: { 
    backgroundColor: '#adb5bd',
    shadowOpacity: 0,
    elevation: 0,
  },
  proceedText: { 
    color: '#fff', 
    fontSize: 16, 
    fontWeight: '600' 
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

  // Balance Card
  balanceCard: {
    margin: 16,
    padding: 20,
    borderRadius: 16,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: '#ff3b30',
  },
  balanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  balanceTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2b2d42',
  },
  refreshBtn: {
    padding: 4,
  },
  refreshText: {
    fontSize: 16,
  },
  totalBalance: {
    fontSize: 32,
    fontWeight: '700',
    color: '#28a745',
    textAlign: 'center',
    marginBottom: 16,
  },
  lastUpdated: {
    fontSize: 11,
    color: '#999',
    textAlign: 'center',
    marginTop: 8,
  },
  transactionPreview: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  previewLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  previewAmount: {
    fontSize: 16,
    fontWeight: '600',
  },
  sufficientPreview: {
    color: '#28a745',
  },
  insufficientPreview: {
    color: '#dc3545',
  },
  insufficientBalanceWarning: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#fff3cd',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ffeaa7',
  },
  warningText: {
    color: '#856404',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 8,
  },
  topUpBtn: {
    backgroundColor: '#ff3b30',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignSelf: 'center',
  },
  topUpBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  loadingBalance: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  noBalanceText: {
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 12,
  },
  retryBtn: {
    backgroundColor: '#ff3b30',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  retryBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },

  // Summary Card
  summaryCard: {
    margin: 16,
    padding: 20,
    borderRadius: 16,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  summaryTitle: { 
    fontSize: 18, 
    fontWeight: '700', 
    marginBottom: 16, 
    textAlign: 'center',
    color: '#2b2d42' 
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryLabel: { 
    fontSize: 15,
    color: '#6c757d',
    fontWeight: '500',
  },
  summaryValue: { 
    fontSize: 15, 
    color: '#2b2d42', 
    fontWeight: '500',
    textAlign: 'right',
  },
  summaryAmount: { 
    fontSize: 16, 
    color: '#ff3b30',
    fontWeight: '600',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: '#e9ecef',
    marginVertical: 16,
  },
  summaryTotal: {
    fontSize: 18,
    color: '#ff3b30',
    fontWeight: '700',
  },
  summaryBalance: {
    fontSize: 16,
    fontWeight: '600',
    color: '#28a745',
  },
  negativeBalance: {
    color: '#dc3545',
  },

  // PIN Entry Styles
  pinCard: {
    margin: 16,
    padding: 24,
    borderRadius: 16,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    alignItems: 'center',
  },
  pinTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2b2d42',
    marginBottom: 16,
    textAlign: 'center',
  },
  pinInputContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 16,
  },
  pinInput: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    letterSpacing: 8,
    borderWidth: 2,
    borderColor: '#dee2e6',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: '#f8f9fa',
    width: 150,
    color: '#2b2d42',
  },
  pinInputError: {
    borderColor: '#ff6b6b',
    backgroundColor: '#fff5f5',
  },
  pinError: {
    color: '#ff6b6b',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
    fontWeight: '500',
  },
  pinHelp: {
    color: '#6c757d',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
  },
  pinDotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 20,
  },
  pinDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#e9ecef',
    borderWidth: 2,
    borderColor: '#dee2e6',
  },
  pinDotFilled: {
    backgroundColor: '#ff3b30',
    borderColor: '#ff3b30',
  },
  pinDotError: {
    backgroundColor: '#ff6b6b',
    borderColor: '#ff6b6b',
  },

  pinSummaryCard: {
    margin: 16,
    padding: 20,
    borderRadius: 16,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    borderTopWidth: 4,
    borderTopColor: '#ff3b30',
  },
  pinSummaryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2b2d42',
    marginBottom: 16,
    textAlign: 'center',
  },

  attemptsWarning: {
    color: '#ff922b',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 16,
    backgroundColor: '#fff3cd',
    padding: 8,
    borderRadius: 8,
  },

  // Account Status Cards
  lockedCard: {
    margin: 16,
    padding: 20,
    borderRadius: 16,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: '#dc3545',
  },
  lockedTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#dc3545',
    textAlign: 'center',
    marginBottom: 12,
  },
  lockedText: {
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },

  noPinCard: {
    margin: 16,
    padding: 20,
    borderRadius: 16,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: '#339af0',
  },
  noPinTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1971c2',
    textAlign: 'center',
    marginBottom: 12,
  },
  noPinText: {
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },

  // Modal Styles
  modalContainer: { 
    flex: 1, 
    backgroundColor: '#f8f9fa',
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    backgroundColor: '#fff',
  },
  modalTitle: { 
    fontSize: 18, 
    fontWeight: '600', 
    color: '#2b2d42' 
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalCloseBtnText: {
    fontSize: 20,
    color: '#6c757d',
  },

  // Provider Items
  providerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    backgroundColor: '#fff',
  },
  providerItemSelected: {
    backgroundColor: '#f8f9fa',
  },
  providerInfo: {
    flex: 1,
    marginRight: 12,
  },
  providerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2b2d42',
    marginBottom: 2,
  },
  providerFullName: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 2,
  },
  providerDetails: {
    fontSize: 12,
    color: '#adb5bd',
  },

  // Meter Type Items
  meterTypeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    backgroundColor: '#fff',
  },
  meterTypeItemSelected: {
    backgroundColor: '#f8f9fa',
  },
  meterTypeInfo: {
    flex: 1,
    marginRight: 12,
  },
  meterTypeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2b2d42',
    marginBottom: 4,
  },
  meterTypeDescription: {
    fontSize: 14,
    color: '#6c757d',
  },

  // Contact Items
  contactItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    backgroundColor: '#fff',
  },
  contactInfo: {
    flex: 1,
  },
  contactName: { 
    fontSize: 16, 
    fontWeight: '600', 
    color: '#2b2d42',
    marginBottom: 2,
  },
  contactNumber: { 
    color: '#6c757d', 
    fontSize: 14 
  },
  recentTime: {
    fontSize: 12,
    color: '#adb5bd',
  },

  selectedIcon: {
    color: '#51cf66',
    fontSize: 18,
    fontWeight: '600',
  },

  emptyText: {
    textAlign: 'center',
    color: '#adb5bd',
    fontSize: 16,
    marginTop: 40,
  },
});