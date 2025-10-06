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
  
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
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
    if (currentStep === 3) {
      setPin('');
      setPinError('');
      checkPinStatus();
    }
  }, [currentStep]);

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
      // Ensure all plans have customerPrice
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

  const handleBuyForSelf = () => {
    Alert.alert('Info', 'This would use your registered phone number. For demo, please enter a number manually.');
  };

  const handleQuickPlanSelect = (plan: DataPlan) => {
    setSelectedPlan(plan);
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
  };

  return (
    <View style={styles.container}>
      {currentStep === 1 && (
        <ScrollView
          style={styles.scrollContent}
          contentContainerStyle={{ paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.section}>
            <Text style={styles.label}>Beneficiary</Text>
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
                style={[styles.actionBtn, { flex: 1, marginHorizontal: 8 }]} 
                onPress={handleBuyForSelf}
              >
                <Text style={styles.actionBtnText}>👤 Self</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.actionBtn, { flex: 1, marginLeft: 8 }]} 
                onPress={showRecentNumbers}
              >
                <Text style={styles.actionBtnText}>🕐 Recent ({recentNumbers.length})</Text>
              </TouchableOpacity>
            </View>
          </View>

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
              <Text style={styles.error}>{getNetworkSpecificValidation(phone)}</Text>
            )}
            {phone !== '' && isPhoneValid && detectNetwork(phone) && (
              <Text style={styles.success}>
                ✓ {networks.find(n => n.id === detectNetwork(phone))?.label} number detected
              </Text>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>
              Select Network{selectedNetwork ? ' (Auto-detected)' : ''}
            </Text>
            <View style={styles.networkRow}>
              {networks.map((net) => (
                <TouchableOpacity
                  key={net.id}
                  style={[
                    styles.networkCard,
                    selectedNetwork === net.id && styles.networkSelected,
                  ]}
                  onPress={() => setSelectedNetwork(net.id)}
                >
                  <Image source={net.logo} style={styles.networkLogo} />
                  <Text style={styles.networkLabel}>{net.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {showPlans && (
            <View style={styles.section}>
              <Text style={styles.label}>Select Data Plan</Text>
              
              {isLoadingPlans ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color="#ff3b30" />
                  <Text style={styles.loadingText}>Loading plans...</Text>
                </View>
              ) : dataPlans.length > 0 ? (
                <>
                  <View style={styles.categoryTabs}>
                    <TouchableOpacity
                      style={[
                        styles.categoryTab,
                        selectedCategory === 'daily' && styles.categoryTabActive
                      ]}
                      onPress={() => setSelectedCategory('daily')}
                    >
                      <Text style={[
                        styles.categoryTabText,
                        selectedCategory === 'daily' && styles.categoryTabTextActive
                      ]}>
                        Daily
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.categoryTab,
                        selectedCategory === 'short' && styles.categoryTabActive
                      ]}
                      onPress={() => setSelectedCategory('short')}
                    >
                      <Text style={[
                        styles.categoryTabText,
                        selectedCategory === 'short' && styles.categoryTabTextActive
                      ]}>
                        2-3 Days
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.categoryTab,
                        selectedCategory === 'weekly' && styles.categoryTabActive
                      ]}
                      onPress={() => setSelectedCategory('weekly')}
                    >
                      <Text style={[
                        styles.categoryTabText,
                        selectedCategory === 'weekly' && styles.categoryTabTextActive
                      ]}>
                        Weekly
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.categoryTab,
                        selectedCategory === 'monthly' && styles.categoryTabActive
                      ]}
                      onPress={() => setSelectedCategory('monthly')}
                    >
                      <Text style={[
                        styles.categoryTabText,
                        selectedCategory === 'monthly' && styles.categoryTabTextActive
                      ]}>
                        Monthly
                      </Text>
                    </TouchableOpacity>
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
                            styles.planRow,
                            selectedPlan?.id === plan.id && styles.planRowSelected
                          ]}
                          onPress={() => handleQuickPlanSelect(plan)}
                        >
                          <View style={styles.planRowLeft}>
                            <Text style={styles.planRowName}>{plan.name}</Text>
                            <Text style={styles.planRowData}>{plan.dataSize}</Text>
                            <Text style={styles.planRowValidity}>{plan.validity}</Text>
                          </View>
                          <View style={styles.planRowRight}>
                            <Text style={styles.planRowAmount}>₦{plan.customerPrice.toLocaleString()}</Text>
                          </View>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  ) : (
                    <View style={styles.emptyCategory}>
                      <Text style={styles.emptyCategoryText}>
                        No {selectedCategory} plans available
                      </Text>
                      <TouchableOpacity 
                        style={styles.showAllBtn}
                        onPress={() => {
                          const counts = {
                            daily: categorizedPlans.daily.length,
                            weekly: categorizedPlans.weekly.length,
                            monthly: categorizedPlans.monthly.length
                          };
                          const maxCategory = Object.keys(counts).reduce((a, b) => 
                            counts[a] > counts[b] ? a : b
                          ) as PlanCategory;
                          setSelectedCategory(maxCategory);
                        }}
                      >
                        <Text style={styles.showAllBtnText}>View Available Plans</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {selectedPlan && (
                    <View style={styles.selectedPlanSummary}>
                      <Text style={styles.success}>
                        ✓ {selectedPlan.name}: {selectedPlan.dataSize} for {selectedPlan.validity} - ₦{selectedPlan.customerPrice.toLocaleString()}
                      </Text>
                    </View>
                  )}
                </>
              ) : (
                <Text style={styles.error}>No data plans available for this network</Text>
              )}
            </View>
          )}

          <TouchableOpacity
            style={[styles.proceedBtn, !canProceed && styles.proceedDisabled]}
            disabled={!canProceed}
            onPress={() => setCurrentStep(2)}
          >
            <Text style={styles.proceedText}>
              {canProceed && selectedPlan 
                ? `Review Purchase • ₦${selectedPlan.customerPrice.toLocaleString()}`
                : 'Review Purchase'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {currentStep === 2 && (
        <ScrollView
          style={styles.scrollContent}
          contentContainerStyle={{ paddingBottom: 40 }}
        >
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

                {selectedPlan && (
                  <View style={styles.transactionPreview}>
                    <Text style={styles.previewLabel}>After purchase:</Text>
                    <Text style={[
                      styles.previewAmount,
                      (userBalance.total - selectedPlan.customerPrice) < 0 ? styles.insufficientPreview : styles.sufficientPreview
                    ]}>
                      ₦{Math.max(0, (userBalance.total || userBalance.amount || 0) - selectedPlan.customerPrice).toLocaleString()}
                    </Text>
                  </View>
                )}

                {selectedPlan && selectedPlan.customerPrice > (userBalance.total || userBalance.amount || 0) && (
                  <View style={styles.insufficientBalanceWarning}>
                    <Text style={styles.warningText}>
                      ⚠️ Insufficient balance for this transaction
                    </Text>
                    <TouchableOpacity 
                      style={styles.topUpBtn}
                      onPress={() => {}}
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

          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Purchase Summary</Text>

            {selectedNetwork && (
              <View style={styles.summaryRow}>
                <View style={styles.summaryLeft}>
                  <Image
                    source={networks.find((n) => n.id === selectedNetwork)?.logo}
                    style={styles.summaryLogo}
                  />
                  <Text style={styles.summaryText}>
                    {networks.find((n) => n.id === selectedNetwork)?.label} Data
                  </Text>
                </View>
              </View>
            )}

            {selectedPlan && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Plan:</Text>
                <Text style={styles.summaryValue}>{selectedPlan.name}</Text>
              </View>
            )}

            {selectedPlan && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Data:</Text>
                <Text style={styles.summaryValue}>{selectedPlan.dataSize}</Text>
              </View>
            )}

            {selectedPlan && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Validity:</Text>
                <Text style={styles.summaryValue}>{selectedPlan.validity}</Text>
              </View>
            )}

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Recipient:</Text>
              <Text style={styles.summaryValue}>{phone}</Text>
            </View>

            {selectedPlan && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Amount:</Text>
                <Text style={[styles.summaryValue, styles.summaryAmount]}>
                  ₦{selectedPlan.customerPrice.toLocaleString()}
                </Text>
              </View>
            )}

            <View style={styles.summaryDivider} />

            {selectedPlan && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Total:</Text>
                <Text style={[styles.summaryValue, styles.summaryTotal]}>
                  ₦{selectedPlan.customerPrice.toLocaleString()}
                </Text>
              </View>
            )}

            {userBalance && selectedPlan && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Balance After:</Text>
                <Text style={[
                  styles.summaryValue, 
                  styles.summaryBalance,
                  (userBalance.total - selectedPlan.customerPrice) < 0 ? styles.negativeBalance : {}
                ]}>
                  ₦{Math.max(0, (userBalance.total || userBalance.amount || 0) - selectedPlan.customerPrice).toLocaleString()}
                </Text>
              </View>
            )}
          </View>

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

          <TouchableOpacity
            style={[styles.proceedBtn, styles.backBtn]}
            onPress={() => setCurrentStep(1)}
          >
            <Text style={[styles.proceedText, styles.backBtnText]}>← Edit Details</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {currentStep === 3 && (
        <ScrollView
          style={styles.scrollContent}
          contentContainerStyle={{ paddingBottom: 40 }}
        >
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
              <View style={styles.pinSummaryCard}>
                <Text style={styles.pinSummaryTitle}>Confirm Transaction</Text>

                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Network:</Text>
                  <Text style={styles.summaryValue}>
                    {networks.find((n) => n.id === selectedNetwork)?.label}
                  </Text>
                </View>

                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Plan:</Text>
                  <Text style={styles.summaryValue}>{selectedPlan?.name}</Text>
                </View>

                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Data:</Text>
                  <Text style={styles.summaryValue}>{selectedPlan?.dataSize}</Text>
                </View>

                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Phone:</Text>
                  <Text style={styles.summaryValue}>{phone}</Text>
                </View>

                {selectedPlan && (
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Amount:</Text>
                    <Text style={[styles.summaryValue, styles.summaryAmount]}>
                      ₦{selectedPlan.customerPrice.toLocaleString()}
                    </Text>
                  </View>
                )}
              </View>

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
                    Confirm Payment • ₦{selectedPlan?.customerPrice.toLocaleString()}
                  </Text>
                )}
              </TouchableOpacity>
            </>
          )}

          <TouchableOpacity
            style={[styles.proceedBtn, styles.backBtn]}
            onPress={() => setCurrentStep(2)}
            disabled={isValidatingPin || isProcessingPayment}
          >
            <Text style={[styles.proceedText, styles.backBtnText]}>← Back to Summary</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

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
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  scrollContent: { flex: 1 },
  section: { marginHorizontal: 16, marginTop: 20, marginBottom: 8 },
  label: { fontSize: 16, fontWeight: '600', marginBottom: 12, color: '#333' },
  buttonRow: { flexDirection: 'row' },
  actionBtn: { borderWidth: 1, borderColor: '#ddd', padding: 14, borderRadius: 12, alignItems: 'center', backgroundColor: '#fff' },
  actionBtnText: { color: '#555', fontSize: 14, fontWeight: '500' },
  networkRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  networkCard: { borderWidth: 1, borderColor: '#ddd', padding: 12, borderRadius: 12, alignItems: 'center', flex: 1, backgroundColor: '#fff', minHeight: 80 },
  networkSelected: { borderColor: '#ff3b30', backgroundColor: '#fff5f5', borderWidth: 2 },
  networkLogo: { width: 40, height: 40, resizeMode: 'contain', marginBottom: 4 },
  networkLabel: { fontSize: 10, fontWeight: '600', color: '#666' },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 12, padding: 14, fontSize: 16, backgroundColor: '#fff' },
  error: { color: '#ff3b30', fontSize: 12, marginTop: 6, fontWeight: '500' },
  success: { color: '#28a745', fontSize: 12, marginTop: 6, fontWeight: '500' },
  proceedBtn: { margin: 16, padding: 16, borderRadius: 12, backgroundColor: '#ff3b30', alignItems: 'center', shadowColor: '#ff3b30', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  proceedDisabled: { backgroundColor: '#ccc', shadowOpacity: 0, elevation: 0 },
  proceedText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  backBtn: { backgroundColor: '#6c757d', marginTop: 8, shadowColor: '#6c757d' },
  backBtnText: { color: '#fff' },
  loadingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  categoryTabs: { flexDirection: 'row', marginBottom: 16, backgroundColor: '#f0f0f0', borderRadius: 12, padding: 4, gap: 8 },
  categoryTab: { flex: 1, paddingVertical: 10, paddingHorizontal: 6, borderRadius: 8, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' },
  categoryTabActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  categoryTabText: { fontSize: 11, fontWeight: '500', color: '#666' },
  categoryTabTextActive: { color: '#ff3b30', fontWeight: '700' },
  plansScrollView: { maxHeight: 300 },
  planRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, marginBottom: 8, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#ddd' },
  planRowSelected: { borderColor: '#ff3b30', backgroundColor: '#fff5f5', borderWidth: 2 },
  planRowLeft: { flex: 1 },
  planRowName: { fontSize: 14, fontWeight: 'bold', color: '#ff3b30', marginBottom: 4 },
  planRowData: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 2 },
  planRowValidity: { fontSize: 12, color: '#666' },
  planRowRight: { alignItems: 'flex-end' },
  planRowAmount: { fontSize: 18, fontWeight: '700', color: '#28a745' },
  emptyCategory: { padding: 40, alignItems: 'center' },
  emptyCategoryText: { color: '#999', fontSize: 14, marginBottom: 12 },
  showAllBtn: { backgroundColor: '#ff3b30', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20 },
  showAllBtnText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  selectedPlanSummary: { marginTop: 12, padding: 12, backgroundColor: '#f0f9ff', borderRadius: 8, borderLeftWidth: 3, borderLeftColor: '#28a745' },
  summaryCard: { margin: 16, padding: 20, borderRadius: 16, backgroundColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 3 },
  summaryTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16, textAlign: 'center', color: '#333' },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  summaryLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  summaryLogo: { width: 30, height: 30, resizeMode: 'contain', marginRight: 8 },
  summaryLabel: { fontWeight: '600', fontSize: 14, color: '#666', flex: 1 },
  summaryText: { fontSize: 14, color: '#333', fontWeight: '500' },
  summaryValue: { fontSize: 14, color: '#333', fontWeight: '600', textAlign: 'right' },
  summaryAmount: { fontSize: 16, color: '#ff3b30' },
  summaryDivider: { height: 1, backgroundColor: '#eee', marginVertical: 12 },
  summaryTotal: { fontSize: 18, color: '#ff3b30', fontWeight: '700' },
  balanceCard: { margin: 16, padding: 20, borderRadius: 16, backgroundColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 3, borderLeftWidth: 4, borderLeftColor: '#ff3b30' },
  balanceHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  balanceTitle: { fontSize: 16, fontWeight: '600', color: '#333' },
  refreshBtn: { padding: 4 },
  refreshText: { fontSize: 16 },
  totalBalance: { fontSize: 32, fontWeight: '700', color: '#28a745', textAlign: 'center', marginBottom: 16 },
  lastUpdated: { fontSize: 11, color: '#999', textAlign: 'center', marginTop: 8 },
  insufficientBalanceWarning: { marginTop: 16, padding: 12, backgroundColor: '#fff3cd', borderRadius: 8, borderWidth: 1, borderColor: '#ffeaa7' },
  warningText: { color: '#856404', fontSize: 14, fontWeight: '500', textAlign: 'center', marginBottom: 8 },
  topUpBtn: { backgroundColor: '#ff3b30', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, alignSelf: 'center' },
  topUpBtnText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  loadingBalance: { alignItems: 'center', paddingVertical: 20 },
  noBalanceText: { color: '#666', fontSize: 14, textAlign: 'center', marginBottom: 12 },
  retryBtn: { backgroundColor: '#ff3b30', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20 },
  retryBtnText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  summaryBalance: { fontSize: 16, fontWeight: '600', color: '#28a745' },
  negativeBalance: { color: '#dc3545' },
  pinCard: { margin: 16, padding: 24, borderRadius: 16, backgroundColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 3, alignItems: 'center' },
  pinTitle: { fontSize: 18, fontWeight: '700', color: '#333', marginBottom: 16, textAlign: 'center' },
  pinInputContainer: { width: '100%', alignItems: 'center', marginBottom: 16 },
  pinInput: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', letterSpacing: 8, borderWidth: 2, borderColor: '#ddd', borderRadius: 12, paddingVertical: 16, paddingHorizontal: 20, backgroundColor: '#f8f9fa', width: 150 },
  pinInputError: { borderColor: '#ff3b30', backgroundColor: '#fff5f5' },
  pinError: { color: '#ff3b30', fontSize: 14, textAlign: 'center', marginBottom: 16, fontWeight: '500' },
  pinHelp: { color: '#666', fontSize: 14, textAlign: 'center', marginBottom: 16 },
  pinDotsContainer: { flexDirection: 'row', justifyContent: 'center', gap: 12, marginBottom: 20 },
  pinDot: { width: 16, height: 16, borderRadius: 8, backgroundColor: '#e0e0e0', borderWidth: 2, borderColor: '#ddd' },
  pinDotFilled: { backgroundColor: '#ff3b30', borderColor: '#ff3b30' },
  pinDotError: { backgroundColor: '#ff6b6b', borderColor: '#ff3b30' },
  pinSummaryCard: { margin: 16, padding: 20, borderRadius: 16, backgroundColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 3, borderTopWidth: 4, borderTopColor: '#ff3b30' },
  pinSummaryTitle: { fontSize: 16, fontWeight: '700', color: '#333', marginBottom: 16, textAlign: 'center' },
  attemptsWarning: { color: '#ff8c00', fontSize: 14, fontWeight: '500', textAlign: 'center', marginBottom: 16, backgroundColor: '#fff3cd', padding: 8, borderRadius: 8 },
  lockedCard: { margin: 16, padding: 20, borderRadius: 16, backgroundColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 3, borderLeftWidth: 4, borderLeftColor: '#dc3545' },
  lockedTitle: { fontSize: 18, fontWeight: '700', color: '#dc3545', textAlign: 'center', marginBottom: 12 },
  lockedText: { color: '#666', fontSize: 14, textAlign: 'center', marginBottom: 16, lineHeight: 20 },
  noPinCard: { margin: 16, padding: 20, borderRadius: 16, backgroundColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 3, borderLeftWidth: 4, borderLeftColor: '#ff8c00' },
  noPinTitle: { fontSize: 18, fontWeight: '700', color: '#ff8c00', textAlign: 'center', marginBottom: 12 },
  noPinText: { color: '#666', fontSize: 14, textAlign: 'center', marginBottom: 16, lineHeight: 20 },
  modalContainer: { flex: 1, backgroundColor: '#fff', paddingTop: Platform.OS === 'ios' ? 50 : 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#eee' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  modalCloseBtn: { padding: 8 },
  modalCloseBtnText: { fontSize: 18, color: '#666', fontWeight: 'bold' },
  contactItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  contactInfo: { flex: 1 },
  contactName: { fontSize: 16, fontWeight: '500', color: '#333', marginBottom: 2 },
  contactNumber: { color: '#666', fontSize: 14 },
  recentTime: { fontSize: 12, color: '#999' },
  transactionPreview: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f0f0f0' },
  previewLabel: { fontSize: 14, color: '#666', fontWeight: '500' },
  previewAmount: { fontSize: 16, fontWeight: '600' },
  sufficientPreview: { color: '#28a745' },
  insufficientPreview: { color: '#dc3545' },
  emptyText: { textAlign: 'center', color: '#999', fontSize: 16, marginTop: 40 },
  loadingContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, backgroundColor: '#f8f9fa', borderRadius: 12 },
  loadingText: { marginLeft: 8, color: '#666' },
});