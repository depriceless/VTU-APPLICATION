import React, { useState, useEffect, useContext, useRef } from 'react';
import InternetSuccessModal from './internetsucessmodal';

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

interface InternetPlan {
  id: string;
  name: string;
  dataSize: string;
  speed: string;
  validity: string;
  amount: number;
  description?: string;
  category?: string;
  popular?: boolean;
}

interface InternetProvider {
  id: string;
  label: string;
  logo: any;
  plans: InternetPlan[];
}

// Helper function to safely extract balance amount
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

export default function BuyInternet() {
  const { token, user, balance, refreshBalance } = useContext(AuthContext);
  const pinInputRef = useRef<TextInput>(null);

  const [currentStep, setCurrentStep] = useState<1 | 2>(1);
  const [showPinEntry, setShowPinEntry] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<InternetPlan | null>(null);
  const [customerNumber, setCustomerNumber] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [pin, setPin] = useState('');
  const [contactsList, setContactsList] = useState<Contact[]>([]);
  const [recentNumbers, setRecentNumbers] = useState<RecentNumber[]>([]);
  const [userBalance, setUserBalance] = useState<UserBalance | null>(null);
  const [pinStatus, setPinStatus] = useState<PinStatus | null>(null);
  const [showContactsModal, setShowContactsModal] = useState(false);
  const [showRecentsModal, setShowRecentsModal] = useState(false);
  const [showPlansModal, setShowPlansModal] = useState(false);
  const [isLoadingContacts, setIsLoadingContacts] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);
  const [isValidatingPin, setIsValidatingPin] = useState(false);
  const [pinError, setPinError] = useState('');

  // NEW: States for dynamic plans
  const [availablePlans, setAvailablePlans] = useState<InternetPlan[]>([]);
  const [isLoadingPlans, setIsLoadingPlans] = useState(false);
  const [plansError, setPlansError] = useState<string | null>(null);

  // Success modal state
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successData, setSuccessData] = useState(null);

  // Internet Service Providers (static info only)
  const internetProviders: InternetProvider[] = [
    {
      id: 'smile',
      label: 'SMILE',
      logo: require('../assets/images/smile-logo.jpeg'),
      plans: availablePlans // Use dynamic plans
    }
  ];

  // ---------- Validation ----------
  const isCustomerNumberValid = customerNumber.length >= 6 && /^[A-Za-z0-9]+$/.test(customerNumber);
  const amount = selectedPlan?.amount || 0;
  const currentBalance = getBalanceAmount(userBalance);
  const hasEnoughBalance = currentBalance > 0 ? amount <= currentBalance : true;
  const canProceed = isCustomerNumberValid && selectedProvider && selectedPlan && hasEnoughBalance;
  const isPinValid = pin.length === 4 && /^\d{4}$/.test(pin);

  // Load data on mount
  useEffect(() => {
    loadRecentNumbers();
    loadFormState();

    // Initialize balance from AuthContext
    if (balance) {
      const balanceAmount = getBalanceAmount(balance);
      console.log('Initial balance from context:', balanceAmount, 'Raw balance:', balance);
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

  // Fetch plans when provider is selected
  useEffect(() => {
    if (selectedProvider) {
      fetchInternetPlans(selectedProvider);
    }
  }, [selectedProvider]);

  // Refresh balance when stepping to review page
  useEffect(() => {
    if (currentStep === 2) {
      fetchUserBalance();
    }
  }, [currentStep]);

  // Clear PIN when showing PIN entry and focus input
  useEffect(() => {
    if (showPinEntry) {
      setPin('');
      setPinError('');
      checkPinStatus();
      
      setTimeout(() => {
        pinInputRef.current?.focus();
      }, 300);
    }
  }, [showPinEntry]);

  // Save form state whenever it changes
  useEffect(() => {
    saveFormState();
  }, [customerNumber, selectedProvider, selectedPlan]);

  // Debug logging for balance
  useEffect(() => {
    if (userBalance) {
      console.log('=== BALANCE DEBUG ===');
      console.log('userBalance object:', JSON.stringify(userBalance, null, 2));
      console.log('Extracted amount:', getBalanceAmount(userBalance));
      console.log('Purchase amount:', amount);
      console.log('Current balance:', currentBalance);
      console.log('Has enough?', hasEnoughBalance);
      console.log('===================');
    }
  }, [userBalance, amount]);

  // ---------- NEW: Fetch Plans from Backend ----------
  const fetchInternetPlans = async (providerCode: string) => {
  setIsLoadingPlans(true);
  setPlansError(null);
  
  try {
    console.log(`📡 Fetching plans for ${providerCode}...`);
    
    const authToken = await getAuthToken();
    
    // Build the full URL
    const endpoint = `/internet/provider/${providerCode}/plans`;
    const fullUrl = `${API_CONFIG.BASE_URL}${endpoint}`;
    
    console.log('🔍 Full URL:', fullUrl);
    console.log('🔍 API_CONFIG.BASE_URL:', API_CONFIG.BASE_URL);
    console.log('🔍 Token exists:', !!authToken);
    console.log('🔍 Token length:', authToken?.length);
    
    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    console.log('📥 Response status:', response.status);
    console.log('📥 Response ok:', response.ok);
    console.log('📥 Response headers:', JSON.stringify(Object.fromEntries(response.headers.entries())));

    let data;
    try {
      const responseText = await response.text();
      console.log('📥 Response text (first 200 chars):', responseText.substring(0, 200));
      data = responseText ? JSON.parse(responseText) : {};
    } catch (parseError) {
      console.error('❌ JSON Parse Error:', parseError);
      throw new Error('Invalid response from server');
    }

    console.log('📥 Parsed data:', JSON.stringify(data, null, 2));

    if (!response.ok) {
      console.error('❌ HTTP Error:', response.status, data.message);
      throw new Error(data.message || `HTTP ${response.status}: Failed to fetch plans`);
    }

    if (data.success && data.plans && Array.isArray(data.plans)) {
      const transformedPlans: InternetPlan[] = data.plans.map((plan: any) => ({
        id: plan.id || plan.planId,
        name: plan.name || plan.planName,
        dataSize: plan.dataSize || 'Unknown',
        speed: plan.speed || '10-20Mbps',
        validity: plan.validity || '30 days',
        amount: parseFloat(plan.amount) || 0,
        description: plan.description,
        category: plan.category || 'monthly',
        popular: plan.popular || false
      }));

      console.log(`✅ Loaded ${transformedPlans.length} plans from ClubKonnect`);
      setAvailablePlans(transformedPlans);
      
      // Cache plans locally
      await AsyncStorage.setItem(
        `internet_plans_${providerCode}`,
        JSON.stringify({ plans: transformedPlans, timestamp: Date.now() })
      );
    } else {
      console.error('❌ Invalid response structure:', data);
      throw new Error('No plans available');
    }

  } catch (error: any) {
    console.error('❌ Error fetching plans:', error);
    console.error('❌ Error name:', error.name);
    console.error('❌ Error message:', error.message);
    console.error('❌ Error stack:', error.stack);
    
    setPlansError(error.message || 'Failed to load plans');
    
    // Try to load cached plans
    try {
      const cached = await AsyncStorage.getItem(`internet_plans_${providerCode}`);
      if (cached) {
        const { plans, timestamp } = JSON.parse(cached);
        const isStale = Date.now() - timestamp > 3600000; // 1 hour
        
        if (!isStale) {
          console.log('⚠️  Using cached plans due to fetch error');
          setAvailablePlans(plans);
          setPlansError('Using cached plans - prices may not be current');
        } else {
          Alert.alert(
            'Connection Error',
            'Unable to fetch current plans. Please check your internet connection and try again.'
          );
        }
      } else {
        Alert.alert(
          'Error',
          'Unable to load internet plans. Please try again later.'
        );
      }
    } catch (cacheError) {
      console.error('❌ Cache error:', cacheError);
      Alert.alert(
        'Error',
        'Unable to load internet plans. Please try again later.'
      );
    }
  } finally {
    setIsLoadingPlans(false);
  }
};
  // ---------- API Helper Functions ----------
  const getAuthToken = async () => {
    if (!token) {
      console.log('No token available from AuthContext');
      throw new Error('Authentication required');
    }
    return token;
  };

  const makeApiRequest = async (endpoint, options = {}) => {
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
      console.error(`API Error for ${endpoint}:`, error.message);

      if (error.name === 'TypeError' && error.message.includes('Network request failed')) {
        throw new Error('Network connection failed. Please check your internet connection.');
      }

      if (error.message.includes('Authentication') || 
          error.message.includes('Session expired') ||
          error.responseData) {
        throw error;
      }

      throw new Error(error.message || 'Request failed');
    }
  };

  // ---------- PIN Functions ----------
  const checkPinStatus = async () => {
    try {
      console.log('Checking PIN status...');
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
      console.log("Refreshing balance from AuthContext");
      console.log("Raw balance object:", JSON.stringify(balance, null, 2));
      
      if (refreshBalance) {
        await refreshBalance();
      }
      
      if (balance !== undefined && balance !== null) {
        const balanceAmount = getBalanceAmount(balance);
        
        console.log("Balance from context:", balanceAmount, "Raw balance:", balance);
        
        const realBalance: UserBalance = {
          amount: balanceAmount,
          total: balanceAmount,
          main: balanceAmount,
          bonus: 0,
          lastUpdated: Date.now(),
        };

        setUserBalance(realBalance);
        await AsyncStorage.setItem("userBalance", JSON.stringify(realBalance));
        console.log("Balance updated from AuthContext:", realBalance);
      } else {
        console.log("No balance from context, trying API...");
        const balanceData = await makeApiRequest("/balance");
        
        if (balanceData.success && balanceData.balance) {
          const balanceAmount = getBalanceAmount(balanceData.balance);
          
          console.log("Balance from API:", balanceAmount);
          
          const realBalance: UserBalance = {
            amount: balanceAmount,
            total: balanceAmount,
            main: balanceAmount,
            bonus: 0,
            lastUpdated: Date.now(),
          };

          setUserBalance(realBalance);
          await AsyncStorage.setItem("userBalance", JSON.stringify(realBalance));
          console.log("Balance updated from API:", realBalance);
        }
      }
    } catch (error) {
      console.error("Balance fetch error:", error);
      
      try {
        const cachedBalance = await AsyncStorage.getItem("userBalance");
        if (cachedBalance) {
          const parsedBalance = JSON.parse(cachedBalance);
          setUserBalance(parsedBalance);
          console.log("Using cached balance:", parsedBalance);
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

  const saveFormState = async () => {
    try {
      const formState = { 
        customerNumber, 
        selectedProvider, 
        selectedPlan: selectedPlan ? {
          id: selectedPlan.id,
          name: selectedPlan.name,
          amount: selectedPlan.amount
        } : null 
      };
      await AsyncStorage.setItem('internetFormState', JSON.stringify(formState));
    } catch (error) {
      console.log('Error saving form state:', error);
    }
  };

  const loadFormState = async () => {
    try {
      const savedState = await AsyncStorage.getItem('internetFormState');
      if (savedState) {
        const { customerNumber: savedNumber, selectedProvider: savedProvider, selectedPlan: savedPlan } = JSON.parse(savedState);
        setCustomerNumber(savedNumber || '');
        setSelectedProvider(savedProvider || null);
        
        // Don't restore selected plan - user should select fresh plan with current price
        setSelectedPlan(null);
      }
    } catch (error) {
      console.log('Error loading form state:', error);
    }
  };

  const saveRecentNumber = async (number: string, name?: string) => {
    try {
      const recent = await AsyncStorage.getItem('recentInternetNumbers');
      let recentList: RecentNumber[] = recent ? JSON.parse(recent) : [];

      recentList = recentList.filter(item => item.number !== number);
      recentList.unshift({
        number,
        name,
        timestamp: Date.now()
      });
      recentList = recentList.slice(0, 10);

      await AsyncStorage.setItem('recentInternetNumbers', JSON.stringify(recentList));
      setRecentNumbers(recentList);
    } catch (error) {
      console.log('Error saving recent number:', error);
    }
  };

  const loadRecentNumbers = async () => {
    try {
      const recent = await AsyncStorage.getItem('recentInternetNumbers');
      if (recent) {
        setRecentNumbers(JSON.parse(recent));
      }
    } catch (error) {
      console.log('Error loading recent numbers:', error);
    }
  };

  // ---------- Contact Selection ----------
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
      Alert.alert('No recent numbers', 'You haven\'t made any recent internet subscriptions.');
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
      // For internet, also accept alphanumeric customer IDs
      setCustomerNumber(number);
      setCustomerName(name || '');
      setShowContactsModal(false);
      setShowRecentsModal(false);
      return;
    }

    setCustomerNumber(formattedNumber);
    setCustomerName(name || '');
    setShowContactsModal(false);
    setShowRecentsModal(false);
  };

  const showPlanSelection = () => {
    if (!selectedProvider) {
      Alert.alert('Select Provider', 'Please select an internet provider first.');
      return;
    }
    
    if (isLoadingPlans) {
      Alert.alert('Loading Plans', 'Please wait while plans are being loaded...');
      return;
    }
    
    if (plansError && availablePlans.length === 0) {
      Alert.alert('No Plans Available', 'Unable to load plans. Please try again.');
      return;
    }
    
    setShowPlansModal(true);
  };

  const handlePlanSelect = (plan: InternetPlan) => {
    setSelectedPlan(plan);
    setShowPlansModal(false);
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

  const handlePinAreaPress = () => {
    setTimeout(() => {
      pinInputRef.current?.focus();
    }, 50);
  };

  // ---------- Purchase Processing ----------
  const validatePinAndPurchase = async () => {
    console.log('=== INTERNET PAYMENT START ===');
    
    if (!isPinValid) {
      console.log('PIN invalid:', pin);
      setPinError('PIN must be exactly 4 digits');
      return;
    }

    console.log('Starting internet payment process...');
    setIsValidatingPin(true);
    setIsProcessingPayment(true);
    setPinError('');

    try {
      console.log('Internet payment payload:', {
        type: 'internet',
        provider: selectedProvider,
        plan: selectedPlan?.name,
        planType: 'monthly',
        customerNumber: customerNumber,
        amount: amount,
        pinProvided: !!pin
      });

      const response = await makeApiRequest('/purchase', {
        method: 'POST',
        body: JSON.stringify({
          type: 'internet',
          provider: selectedProvider,
          plan: selectedPlan?.name,
          planType: 'monthly',
          customerNumber: customerNumber,
          amount: amount,
          pin: pin,
        }),
      });

      console.log('Internet purchase response:', response);

      if (response.success === true) {
        console.log('Internet payment successful!');
        
        await saveRecentNumber(customerNumber, customerName);
        
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
          console.log('Balance updated:', updatedBalance);
        }

        await AsyncStorage.removeItem('internetFormState');

        const providerName = internetProviders.find(p => p.id === selectedProvider)?.label || selectedProvider?.toUpperCase();
        setSuccessData({
          transaction: response.transaction || {},
          providerName,
          customerNumber,
          plan: selectedPlan,
          amount: response.transaction?.amount || amount,
          newBalance: response.newBalance
        });

        setShowPinEntry(false);
        setTimeout(() => {
          setShowSuccessModal(true);
        }, 300);

      } else {
        console.log('Internet payment failed:', response.message);
        
        if (response.message && response.message.toLowerCase().includes('pin')) {
          setPinError(response.message);
        }
        
        Alert.alert('Transaction Failed', response.message || 'Payment could not be processed');
      }

    } catch (error) {
      console.error('Internet payment error:', error);
      
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
      console.log('=== INTERNET PAYMENT END ===');
    }
  };

  // Success modal handlers
  const handleCloseSuccessModal = () => {
    console.log('User closed success modal');
    setShowSuccessModal(false);
    setSuccessData(null);
  };

  const handleBuyMoreInternet = () => {
    console.log('User selected: Buy More Internet');
    setShowSuccessModal(false);
    setSuccessData(null);

    setCurrentStep(1);
    setCustomerNumber('');
    setCustomerName('');
    setSelectedProvider(null);
    setSelectedPlan(null);
    setPin('');
    setPinError('');
    setShowPinEntry(false);
    setAvailablePlans([]);
  };

  return (
    <View style={styles.container}>
      {/* STEP 1: FORM */}
      {currentStep === 1 && (
        <ScrollView
          style={styles.scrollContent}
          contentContainerStyle={styles.scrollContentContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Quick Access */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Quick Access</Text>
            <View style={styles.quickActions}>
              <TouchableOpacity 
                style={styles.quickActionBtn} 
                onPress={selectContact}
                disabled={isLoadingContacts}
                activeOpacity={0.7}
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
                activeOpacity={0.7}
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

          {/* Customer Number Input */}
          <View style={styles.card}>
            <Text style={styles.inputLabel}>Customer ID / Phone Number</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Enter customer ID or phone number"
              placeholderTextColor="#999"
              value={customerNumber}
              onChangeText={setCustomerNumber}
              autoCapitalize="none"
            />
            {customerNumber !== '' && !isCustomerNumberValid && (
              <Text style={styles.validationError}>Enter valid customer ID or phone number (minimum 6 characters)</Text>
            )}
            {customerNumber !== '' && isCustomerNumberValid && (
              <View style={styles.validationSuccess}>
                <Text style={styles.validationSuccessText}>Valid customer identifier</Text>
              </View>
            )}
          </View>

         

          {/* Provider Selection */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Internet Provider</Text>
            <View style={styles.networkGrid}>
              {internetProviders.map((provider) => (
                <TouchableOpacity
                  key={provider.id}
                  style={[
                    styles.networkItem,
                    selectedProvider === provider.id && styles.networkItemSelected,
                  ]}
                  onPress={() => {
                    setSelectedProvider(provider.id);
                    setSelectedPlan(null);
                  }}
                  activeOpacity={0.7}
                >
                  <Image source={provider.logo} style={styles.networkLogo} />
                  <Text style={[
                    styles.networkName,
                    selectedProvider === provider.id && styles.networkNameSelected
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

          {/* Plan Selection */}
          <View style={styles.card}>
            <View style={styles.planHeader}>
              <Text style={styles.sectionTitle}>Select Plan</Text>
              {isLoadingPlans && (
                <ActivityIndicator size="small" color="#ff3b30" />
              )}
            </View>
            
            {plansError && (
              <View style={styles.errorBanner}>
                <Text style={styles.errorText}>⚠️ {plansError}</Text>
              </View>
            )}
            
            {selectedProvider ? (
              <TouchableOpacity
                style={[
                  styles.planSelector,
                  selectedPlan && styles.planSelectorSelected,
                  isLoadingPlans && styles.planSelectorDisabled
                ]}
                onPress={showPlanSelection}
                disabled={isLoadingPlans}
                activeOpacity={0.7}
              >
                {selectedPlan ? (
                  <View style={styles.selectedPlanContent}>
                    <View style={styles.planMainInfo}>
                      <Text style={styles.planName}>{selectedPlan.name}</Text>
                      <Text style={styles.planPrice}>₦{selectedPlan.amount.toLocaleString()}</Text>
                    </View>
                    <View style={styles.planDetails}>
                      <Text style={styles.planDetail}>{selectedPlan.dataSize} • {selectedPlan.speed} • {selectedPlan.validity}</Text>
                    </View>
                  </View>
                ) : (
                  <Text style={styles.planSelectorPlaceholder}>
                    {isLoadingPlans ? 'Loading plans...' : 'Tap to select a plan'}
                  </Text>
                )}
                <Text style={styles.planSelectorArrow}>›</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.planDisabled}>
                <Text style={styles.planDisabledText}>Select a provider first</Text>
              </View>
            )}
          </View>

          {/* Proceed Button */}
          <TouchableOpacity
            style={[styles.primaryButton, !canProceed && styles.primaryButtonDisabled]}
            disabled={!canProceed}
            onPress={() => setCurrentStep(2)}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryButtonText}>
              {canProceed ? `Review purchase • ₦${amount.toLocaleString()}` : 'Complete Form to Continue'}
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
                  ₦{getBalanceAmount(userBalance).toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })}
                </Text>

                {amount > 0 && (
                  <View style={styles.balanceCalculation}>
                    <View style={styles.balanceRow}>
                      <Text style={styles.balanceRowLabel}>Purchase Amount</Text>
                      <Text style={styles.balanceRowValue}>-₦{amount.toLocaleString()}</Text>
                    </View>
                    <View style={styles.balanceDivider} />
                    <View style={styles.balanceRow}>
                      <Text style={styles.balanceRowLabelBold}>Remaining Balance</Text>
                      <Text style={[
                        styles.balanceRowValueBold,
                        (getBalanceAmount(userBalance) - amount) < 0 && styles.negativeAmount
                      ]}>
                        ₦{Math.max(0, getBalanceAmount(userBalance) - amount).toLocaleString()}
                      </Text>
                    </View>
                  </View>
                )}

                {amount > getBalanceAmount(userBalance) && (
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

            {selectedProvider && (
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Provider</Text>
                <View style={styles.summaryValueContainer}>
                  <Image
                    source={internetProviders.find((p) => p.id === selectedProvider)?.logo}
                    style={styles.summaryNetworkLogo}
                  />
                  <Text style={styles.summaryValue}>
                    {internetProviders.find((p) => p.id === selectedProvider)?.label}
                  </Text>
                </View>
              </View>
            )}

            {selectedPlan && (
              <>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>Plan</Text>
                  <Text style={styles.summaryValue}>{selectedPlan.name}</Text>
                </View>

                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>Data</Text>
                  <Text style={styles.summaryValue}>{selectedPlan.dataSize}</Text>
                </View>

                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>Validity</Text>
                  <Text style={styles.summaryValue}>{selectedPlan.validity}</Text>
                </View>
              </>
            )}

            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Customer ID</Text>
              <Text style={styles.summaryValue}>{customerNumber}</Text>
            </View>

            {customerName && (
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Customer Name</Text>
                <Text style={styles.summaryValue}>{customerName}</Text>
              </View>
            )}

            <View style={styles.summaryDivider} />

            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabelTotal}>Total Amount</Text>
              <Text style={styles.summaryValueTotal}>₦{amount.toLocaleString()}</Text>
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
            <Text style={styles.modalTitle}>Recent Customers</Text>
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
                <Text style={styles.emptyStateText}>No recent customers found</Text>
              </View>
            }
          />
        </View>
      </Modal>

      {/* Plans Modal */}
      <Modal visible={showPlansModal} animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {selectedProvider && internetProviders.find(p => p.id === selectedProvider)?.label} Plans
            </Text>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowPlansModal(false)}
            >
              <Text style={styles.modalCloseText}>✕</Text>
            </TouchableOpacity>
          </View>
          
          {isLoadingPlans ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#ff3b30" />
              <Text style={styles.loadingText}>Loading plans from ClubKonnect...</Text>
            </View>
          ) : availablePlans.length > 0 ? (
            <FlatList
              data={availablePlans}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.planItem,
                    selectedPlan?.id === item.id && styles.planItemSelected
                  ]}
                  onPress={() => handlePlanSelect(item)}
                  activeOpacity={0.7}
                >
                  <View style={styles.planItemContent}>
                    <View style={styles.planHeader}>
                      <Text style={styles.planItemName}>{item.name}</Text>
                      <Text style={styles.planItemPrice}>₦{item.amount.toLocaleString()}</Text>
                    </View>
                    <View style={styles.planItemDetails}>
                      <Text style={styles.planItemDetail}>📊 {item.dataSize}</Text>
                      <Text style={styles.planItemDetail}>⚡ {item.speed}</Text>
                      <Text style={styles.planItemDetail}>📅 {item.validity}</Text>
                    </View>
                    {item.description && (
                      <Text style={styles.planItemDescription}>{item.description}</Text>
                    )}
                 
                  </View>
                </TouchableOpacity>
              )}
              showsVerticalScrollIndicator={false}
            />
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>
                {plansError || 'No plans available'}
              </Text>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={() => selectedProvider && fetchInternetPlans(selectedProvider)}
              >
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Modal>

      {/* Success Modal */}
      {showSuccessModal && successData && (
        <InternetSuccessModal
          visible={showSuccessModal}
          onClose={handleCloseSuccessModal}
          onBuyMore={handleBuyMoreInternet}
          transaction={successData.transaction}
          providerName={successData.providerName}
          customerNumber={successData.customerNumber}
          amount={successData.amount}
          newBalance={successData.newBalance}
          planDetails={successData.plan}
        />
      )}
    </View>
  );
}

// ---------- Styles ----------
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

planHeader: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 8,
},


  errorBanner: {
    backgroundColor: '#fff3e0',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },

  errorText: {
    color: '#e65100',
    fontSize: 13,
    fontWeight: '500',
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

  textInput: {
    borderWidth: 1,
    borderColor: '#e8e8e8',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1a1a1a',
    backgroundColor: '#fafafa',
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

  networkGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },

  networkItem: {
    width: '48%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fafafa',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e8e8e8',
    position: 'relative',
    paddingVertical: 12,
    paddingHorizontal: 8,
    minHeight: 80,
  },

  networkItemSelected: {
    borderColor: '#ff3b30',
    backgroundColor: '#fff5f5',
  },

  networkLogo: {
    width: 40,
    height: 40,
    resizeMode: 'contain',
    marginBottom: 4,
  },

  networkName: {
    fontSize: 10,
    fontWeight: '600',
    color: '#666',
    textAlign: 'center',
  },

  networkNameSelected: {
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

  planSelector: {
    borderWidth: 1,
    borderColor: '#e8e8e8',
    borderRadius: 12,
    padding: 16,
    backgroundColor: '#fafafa',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  planSelectorSelected: {
    borderColor: '#ff3b30',
    backgroundColor: '#fff5f5',
    borderWidth: 2,
  },

  planSelectorDisabled: {
    opacity: 0.6,
  },

  planSelectorPlaceholder: {
    color: '#999',
    fontSize: 16,
  },

  planSelectorArrow: {
    color: '#999',
    fontSize: 24,
    fontWeight: 'bold',
  },

  planDisabled: {
    borderWidth: 1,
    borderColor: '#e8e8e8',
    borderRadius: 12,
    padding: 16,
    backgroundColor: '#fafafa',
  },

  planDisabledText: {
    color: '#999',
    fontSize: 16,
    textAlign: 'center',
  },

  selectedPlanContent: {
    flex: 1,
  },

planMainInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
    gap: 12,
  },


    planName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    flex: 1,
  },

    planPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ff3b30',
    flexShrink: 0,
  },

  planDetails: {
    marginTop: 4,
  },

  planDetail: {
    fontSize: 12,
    color: '#666',
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
    textAlign: 'right',
    maxWidth: '60%',
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

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },

  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
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
    paddingVertical: 60,
    alignItems: 'center',
  },

  emptyStateText: {
    fontSize: 15,
    color: '#999',
    marginBottom: 16,
  },

  retryButton: {
    backgroundColor: '#ff3b30',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },

  retryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },

  planItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#fff',
  },

   planItemSelected: {
    backgroundColor: '#fff5f5',
    borderLeftWidth: 4,
    borderLeftColor: '#ff3b30',
  },

  
planItemContent: {
  flex: 1,
  // No extra padding needed
},

planItemName: {
  fontSize: 16,
  fontWeight: '600',
  color: '#1a1a1a',
  flex: 1,
},


 planItemPrice: {
  fontSize: 16,
  fontWeight: '700',
  color: '#ff3b30',
  flexShrink: 0,
  textAlign: 'right',
},

  planItemDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 8,
    marginBottom: 4,
  },

   planItemDetail: {
    fontSize: 12,
    color: '#666',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },

  planItemDescription: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    fontStyle: 'italic',
  },
});