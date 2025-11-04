import React, { useState, useEffect, useContext } from 'react';
import DataSuccessModal from './DataSuccessModal';
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
  lastUpdated: number;
}

interface PinStatus {
  isPinSet: boolean;
  hasPinSet: boolean;
  isLocked: boolean;
  lockTimeRemaining: number;
  attemptsRemaining: number;
}

interface DataPlan {
  id: string;
  name: string;
  customerPrice: number;
  amount: number;
  validity: string;
  dataSize: string;
  network: string;
}

type PlanCategory = 'daily' | 'short' | 'weekly' | 'monthly';

export default function BuyData() {
  const { token, user, balance, refreshBalance } = useContext(AuthContext);
  
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);
  const [showPinEntry, setShowPinEntry] = useState(false);
  const [selectedNetwork, setSelectedNetwork] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<DataPlan | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<PlanCategory>('daily');
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [contactsList, setContactsList] = useState<Contact[]>([]);
  const [recentNumbers, setRecentNumbers] = useState<RecentNumber[]>([]);
  const [userBalance, setUserBalance] = useState<UserBalance | null>(null);
  const [pinStatus, setPinStatus] = useState<PinStatus | null>(null);
  const [showContactsModal, setShowContactsModal] = useState(false);
  const [showRecentsModal, setShowRecentsModal] = useState(false);
  const [isLoadingContacts, setIsLoadingContacts] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);
  const [isValidatingPin, setIsValidatingPin] = useState(false);
  const [pinError, setPinError] = useState('');
  const pinInputRef = React.useRef<TextInput>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successData, setSuccessData] = useState(null);
  const [dataPlans, setDataPlans] = useState<DataPlan[]>([]);
  const [isLoadingPlans, setIsLoadingPlans] = useState(false);
  const [showPlans, setShowPlans] = useState(false);

  const categorizePlans = (plans: DataPlan[]) => {
    const daily = plans.filter(p => {
      const validity = p.validity.toLowerCase();
      return validity.includes('1 day') || 
             validity.includes('24 hours') ||
             validity.includes('1day') ||
             (validity.match(/^1\s*day/));
    });
    
    const short = plans.filter(p => {
      const validity = p.validity.toLowerCase();
      return validity.includes('2 days') ||
             validity.includes('3 days') ||
             validity.includes('2days') ||
             validity.includes('3days');
    });
    
    const weekly = plans.filter(p => {
      const validity = p.validity.toLowerCase();
      const dayMatch = validity.match(/(\d+)\s*days?/);
      const dayCount = dayMatch ? parseInt(dayMatch[1]) : 0;
      
      return validity.includes('week') ||
             (dayCount >= 4 && dayCount <= 21) ||
             validity.includes('7 days') ||
             validity.includes('14 days') ||
             validity.includes('7days') ||
             validity.includes('14days');
    });
    
    const monthly = plans.filter(p => {
      const validity = p.validity.toLowerCase();
      const dayMatch = validity.match(/(\d+)\s*days?/);
      const dayCount = dayMatch ? parseInt(dayMatch[1]) : 0;
      
      return validity.includes('month') ||
             (dayCount >= 22) ||
             validity.includes('30 days') ||
             validity.includes('60 days') ||
             validity.includes('90 days') ||
             validity.includes('30days') ||
             validity.includes('60days') ||
             validity.includes('90days') ||
             validity.includes('365 days') ||
             validity.includes('365days');
    });

    const categorized = new Set([...daily, ...short, ...weekly, ...monthly]);
    const uncategorized = plans.filter(p => !categorized.has(p));
    
    return { 
      daily, 
      short,
      weekly, 
      monthly: [...monthly, ...uncategorized] 
    };
  };

  const categorizedPlans = categorizePlans(dataPlans);
  const displayPlans = categorizedPlans[selectedCategory];

  const detectNetwork = (phoneNumber: string): string | null => {
    const prefix = phoneNumber.substring(0, 4);
    const mtnPrefixes = ['0803', '0806', '0703', '0706', '0813', '0816', '0810', '0814', '0903', '0906', '0913', '0916'];
    const airtelPrefixes = ['0802', '0808', '0812', '0701', '0902', '0907', '0901', '0904', '0912'];
    const gloPrefixes = ['0805', '0807', '0815', '0811', '0705', '0905', '0915'];
    const nineMobilePrefixes = ['0809', '0818', '0817', '0909', '0908'];

    if (mtnPrefixes.includes(prefix)) return 'mtn';
    if (airtelPrefixes.includes(prefix)) return 'airtel';
    if (gloPrefixes.includes(prefix)) return 'glo';
    if (nineMobilePrefixes.includes(prefix)) return '9mobile';
    return null;
  };

  const isPhoneValid = phone.length === 11 && /^0[789][01]\d{8}$/.test(phone);
  const hasEnoughBalance = userBalance && selectedPlan ? selectedPlan.customerPrice <= userBalance.total : true;
  const canProceed = isPhoneValid && selectedNetwork && selectedPlan && !isLoadingPlans;
  const isPinValid = pin.length === 4 && /^\d{4}$/.test(pin);

  useEffect(() => {
    if (isPhoneValid) {
      const detectedNetwork = detectNetwork(phone);
      if (detectedNetwork && detectedNetwork !== selectedNetwork) {
        setSelectedNetwork(detectedNetwork);
      }
    }
  }, [phone]);

  useEffect(() => {
    if (selectedNetwork) {
      fetchDataPlans(selectedNetwork);
      setShowPlans(true);
    } else {
      setShowPlans(false);
      setDataPlans([]);
      setSelectedPlan(null);
    }
  }, [selectedNetwork]);

  useEffect(() => {
    loadRecentNumbers();
    loadFormState();
    
    if (balance) {
      const balanceAmount = parseFloat(balance.amount) || 0;
      setUserBalance({
        main: balanceAmount,
        bonus: 0,
        total: balanceAmount,
        lastUpdated: Date.now(),
      });
    }
    
    setTimeout(() => {
      fetchUserBalance();
      checkPinStatus();
    }, 1000);
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
      
      setTimeout(() => {
        pinInputRef.current?.focus();
      }, 100);
    }
  }, [showPinEntry]);

  useEffect(() => {
    saveFormState();
  }, [phone, selectedNetwork, selectedPlan]);

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

  const fetchDataPlans = async (network: string) => {
    setIsLoadingPlans(true);
    try {
      const timestamp = Date.now();
      const response = await makeApiRequest(`/data/plans/${network}?t=${timestamp}`);
      
      console.log('Fetched plans:', response.plans?.slice(0, 2));
      
      if (response.success) {
        const plansWithPrice = (response.plans || []).map(plan => ({
          ...plan,
          customerPrice: plan.customerPrice || plan.providerCost || plan.amount || 0,
          amount: plan.providerCost || plan.amount || 0
        }));
        setDataPlans(plansWithPrice);
      } else {
        throw new Error(response.message || 'Failed to fetch data plans');
      }
    } catch (error) {
      console.error('Error fetching data plans:', error);
      Alert.alert('Error', 'Could not load data plans. Please try again.');
      setDataPlans([]);
    } finally {
      setIsLoadingPlans(false);
    }
  };

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
      
      if (refreshBalance) {
        await refreshBalance();
      }
      
      if (balance) {
        const balanceAmount = parseFloat(balance.amount) || 0;
        
        const realBalance = {
          main: balanceAmount,
          bonus: 0,
          total: balanceAmount,
          amount: balanceAmount,
          currency: balance.currency || "NGN",
          lastUpdated: balance.lastUpdated || new Date().toISOString(),
        };

        setUserBalance(realBalance);
        await AsyncStorage.setItem("userBalance", JSON.stringify(realBalance));
        console.log("Balance updated from AuthContext:", realBalance);
      } else {
        const balanceData = await makeApiRequest("/balance");
        
        if (balanceData.success && balanceData.balance) {
          const balanceAmount = parseFloat(balanceData.balance.amount) || 0;
          
          const realBalance = {
            main: balanceAmount,
            bonus: 0,
            total: balanceAmount,
            amount: balanceAmount,
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

  const saveFormState = async () => {
    try {
      const formState = { phone, selectedNetwork, selectedPlan };
      await AsyncStorage.setItem('dataFormState', JSON.stringify(formState));
    } catch (error) {
      console.log('Error saving form state:', error);
    }
  };

  const loadFormState = async () => {
    try {
      const savedState = await AsyncStorage.getItem('dataFormState');
      if (savedState) {
        const { phone: savedPhone, selectedNetwork: savedNetwork, selectedPlan: savedPlan } = JSON.parse(savedState);
        setPhone(savedPhone || '');
        setSelectedNetwork(savedNetwork || null);
        setSelectedPlan(savedPlan || null);
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

  const networks = [
    { id: 'mtn', label: 'MTN', logo: require('../assets/images/mtnlogo.jpg') },
    { id: 'airtel', label: 'AIRTEL', logo: require('../assets/images/Airtelogo.png') },
    { id: 'glo', label: 'GLO', logo: require('../assets/images/glologo.png') },
    { id: '9mobile', label: '9MOBILE', logo: require('../assets/images/9mobilelogo.jpg') },
  ];

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
      Alert.alert('No recent numbers', 'You haven\'t made any recent transactions.');
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

  const handleQuickPlanSelect = (plan: DataPlan) => {
    setSelectedPlan(plan);
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
    console.log('=== DATA PAYMENT START ===');
    
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
          type: 'data',
          network: selectedNetwork,
          phone: phone,
          planId: selectedPlan?.id,
          plan: selectedPlan?.name,
          amount: selectedPlan?.customerPrice,
          pin: pin,
        }),
      });

      if (response.success === true) {
        console.log('Data payment successful!');
        
        await saveRecentNumber(phone);
        
        if (response.newBalance) {
          const balanceAmount = response.newBalance.amount || 
                               response.newBalance.totalBalance || 
                               response.newBalance.mainBalance || 0;
          
          const updatedBalance = {
            main: balanceAmount,
            bonus: 0,
            total: balanceAmount,
            amount: balanceAmount,
            currency: response.newBalance.currency || "NGN",
            lastUpdated: response.newBalance.lastUpdated || new Date().toISOString(),
          };

          setUserBalance(updatedBalance);
          await AsyncStorage.setItem("userBalance", JSON.stringify(updatedBalance));
        }

        await AsyncStorage.removeItem('dataFormState');

        const networkName = networks.find(n => n.id === selectedNetwork)?.label || selectedNetwork?.toUpperCase();
        setSuccessData({
          transaction: response.transaction || {},
          networkName,
          phone,
          amount: response.transaction?.amount || selectedPlan?.customerPrice,
          dataPlan: selectedPlan?.name,
          newBalance: response.newBalance
        });

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
      console.error('Data payment error:', error);
      
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
      console.log('=== DATA PAYMENT END ===');
    }
  };

  const getNetworkSpecificValidation = (number: string): string => {
    if (!isPhoneValid) return 'Enter valid 11-digit number starting with 070, 080, 081, or 090';

    const detectedNet = detectNetwork(number);
    if (!detectedNet) {
      return 'Number format not recognized. Please verify the number.';
    }

    return '';
  };

  const handleCloseSuccessModal = () => {
    setShowSuccessModal(false);
    setSuccessData(null);
  };

  const handleBuyMoreData = () => {
    setShowSuccessModal(false);
    setSuccessData(null);
    setCurrentStep(1);
    setPhone('');
    setSelectedNetwork(null);
    setSelectedPlan(null);
    setPin('');
    setPinError('');
    setShowPinEntry(false);
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

          {/* Phone Number Input */}
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
              <Text style={styles.validationError}>{getNetworkSpecificValidation(phone)}</Text>
            )}
            {phone !== '' && isPhoneValid && detectNetwork(phone) && (
              <View style={styles.validationSuccess}>
                <Text style={styles.validationSuccessText}>
                  {networks.find(n => n.id === detectNetwork(phone))?.label} number detected
                </Text>
              </View>
            )}
          </View>

          {/* Network Selection */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Network Provider</Text>
            <View style={styles.networkGrid}>
              {networks.map((net) => (
                <TouchableOpacity
                  key={net.id}
                  style={[
                    styles.networkItem,
                    selectedNetwork === net.id && styles.networkItemSelected,
                  ]}
                  onPress={() => setSelectedNetwork(net.id)}
                  activeOpacity={0.7}
                >
                  <Image source={net.logo} style={styles.networkLogo} />
                  <Text style={[
                    styles.networkName,
                    selectedNetwork === net.id && styles.networkNameSelected
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

          {/* Data Plans */}
          {showPlans && (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Select Data Plan</Text>
              
              {isLoadingPlans ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color="#ff3b30" />
                  <Text style={styles.loadingText}>Loading plans...</Text>
                </View>
              ) : dataPlans.length > 0 ? (
                <>
                  <View style={styles.categoryTabs}>
                    {[
                      { key: 'daily', label: 'Daily' },
                      { key: 'short', label: '2-3 Days' },
                      { key: 'weekly', label: 'Weekly' },
                      { key: 'monthly', label: 'Monthly' }
                    ].map(({ key, label }) => (
                      <TouchableOpacity
                        key={key}
                        style={[
                          styles.categoryTab,
                          selectedCategory === key && styles.categoryTabActive
                        ]}
                        onPress={() => setSelectedCategory(key as PlanCategory)}
                      >
                        <Text style={[
                          styles.categoryTabText,
                          selectedCategory === key && styles.categoryTabTextActive
                        ]}>
                          {label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {displayPlans.length > 0 ? (
                    <ScrollView 
                      style={styles.plansScrollView}
                      showsVerticalScrollIndicator={false}
                      nestedScrollEnabled={true}
                    >
                      {displayPlans.map((plan, index) => (
                        <TouchableOpacity
                          key={`${plan.network}-${plan.id}-${index}`}
                          style={[
                            styles.planCard,
                            selectedPlan?.id === plan.id && styles.planCardSelected
                          ]}
                          onPress={() => handleQuickPlanSelect(plan)}
                          activeOpacity={0.7}
                        >
                          <View style={styles.planCardContent}>
                            <View style={styles.planInfo}>
                              <Text style={styles.planDataSize}>{plan.dataSize}</Text>
                              <Text style={styles.planName}>{plan.name}</Text>
                              <Text style={styles.planValidity}>⏱ {plan.validity}</Text>
                            </View>
                            <View style={styles.planPriceContainer}>
                              <Text style={styles.planPrice}>₦{plan.customerPrice.toLocaleString()}</Text>
                            </View>
                          </View>
                          {selectedPlan?.id === plan.id && (
                            <View style={styles.planCheckmark}>
                              <Text style={styles.planCheckmarkText}>✓</Text>
                            </View>
                          )}
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  ) : (
                    <View style={styles.emptyState}>
                      <Text style={styles.emptyStateText}>
                        No {selectedCategory} plans available
                      </Text>
                    </View>
                  )}
                </>
              ) : (
                <Text style={styles.validationError}>No data plans available for this network</Text>
              )}
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
              {canProceed && selectedPlan 
                ? `Review purchase • ₦${selectedPlan.customerPrice.toLocaleString()}`
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

                {selectedPlan && (
                  <View style={styles.balanceCalculation}>
                    <View style={styles.balanceRow}>
                      <Text style={styles.balanceRowLabel}>Purchase Amount</Text>
                      <Text style={styles.balanceRowValue}>-₦{selectedPlan.customerPrice.toLocaleString()}</Text>
                    </View>
                    <View style={styles.balanceDivider} />
                    <View style={styles.balanceRow}>
                      <Text style={styles.balanceRowLabelBold}>Remaining Balance</Text>
                      <Text style={[
                        styles.balanceRowValueBold,
                        (userBalance.total - selectedPlan.customerPrice) < 0 && styles.negativeAmount
                      ]}>
                        ₦{Math.max(0, (userBalance.total || userBalance.amount || 0) - selectedPlan.customerPrice).toLocaleString()}
                      </Text>
                    </View>
                  </View>
                )}

                {selectedPlan && selectedPlan.customerPrice > (userBalance.total || userBalance.amount || 0) && (
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

            {selectedPlan && (
              <>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>Data Plan</Text>
                  <Text style={styles.summaryValue}>{selectedPlan.name}</Text>
                </View>

                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>Data Size</Text>
                  <Text style={styles.summaryValue}>{selectedPlan.dataSize}</Text>
                </View>

                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>Validity</Text>
                  <Text style={styles.summaryValue}>{selectedPlan.validity}</Text>
                </View>
              </>
            )}

            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Recipient</Text>
              <Text style={styles.summaryValue}>{phone}</Text>
            </View>

            <View style={styles.summaryDivider} />

            {selectedPlan && (
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabelTotal}>Total Amount</Text>
                <Text style={styles.summaryValueTotal}>₦{selectedPlan.customerPrice.toLocaleString()}</Text>
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
      )}

      {/* PIN Entry Modal - Bottom Sheet (Like Airtime) */}
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
            {/* Drag Handle */}
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
        <DataSuccessModal
          visible={showSuccessModal}
          onClose={handleCloseSuccessModal}
          onBuyMore={handleBuyMoreData}
          transaction={successData.transaction}
          networkName={successData.networkName}
          phone={successData.phone}
          amount={successData.amount}
          dataPlan={successData.dataPlan}
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
    gap: 10,
  },

  networkItem: {
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

  networkItemSelected: {
    borderColor: '#ff3b30',
    backgroundColor: '#fff5f5',
  },

  networkLogo: {
    width: 40,
    height: 40,
    resizeMode: 'contain',
    marginBottom: 6,
  },

  networkName: {
    fontSize: 10,
    fontWeight: '600',
    color: '#666',
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

  categoryTabs: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    padding: 4,
  },

  categoryTab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 8,
    alignItems: 'center',
  },

  categoryTabActive: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },

  categoryTabText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#666',
  },

  categoryTabTextActive: {
    color: '#ff3b30',
    fontWeight: '700',
  },

  plansScrollView: {
    maxHeight: 320,
  },

  planCard: {
    backgroundColor: '#fafafa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: '#e8e8e8',
    position: 'relative',
  },

  planCardSelected: {
    borderColor: '#ff3b30',
    backgroundColor: '#fff5f5',
  },

  planCardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  planInfo: {
    flex: 1,
  },

  planDataSize: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 4,
  },

  planName: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666',
    marginBottom: 4,
  },

  planValidity: {
    fontSize: 11,
    color: '#999',
  },

  planPriceContainer: {
    alignItems: 'flex-end',
  },

  planPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2e7d32',
  },

  planCheckmark: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#ff3b30',
    alignItems: 'center',
    justifyContent: 'center',
  },

  planCheckmarkText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
  },

  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },

  loadingText: {
    marginLeft: 8,
    color: '#666',
    fontSize: 14,
  },

  emptyState: {
    padding: 40,
    alignItems: 'center',
  },

  emptyStateText: {
    color: '#999',
    fontSize: 14,
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
});