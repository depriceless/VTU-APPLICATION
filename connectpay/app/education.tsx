import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  ScrollView,
  Platform,
  Alert,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import EducationSuccessModal from './EducationSuccessModal';
import { AuthContext } from '../contexts/AuthContext';

const API_CONFIG = {
  BASE_URL: Platform.OS === 'web' 
    ? `${process.env.EXPO_PUBLIC_API_URL_WEB}/api`
    : `${process.env.EXPO_PUBLIC_API_URL}/api`,
};

interface ExamCard {
  id: string;
  name: string;
  code: string;
  price: number;
  description: string;
  examBody: string;
  validity: string;
  logo: any;
  category: string;
}

interface RecentPurchase {
  examType: string;
  quantity: number;
  totalAmount: number;
  timestamp: number;
}

interface UserBalance {
  main: number;
  bonus: number;
  total: number;
  lastUpdated: number;
  amount?: number;
  currency?: string;
}

interface PinStatus {
  isPinSet: boolean;
  hasPinSet: boolean;
  isLocked: boolean;
  lockTimeRemaining: number;
  attemptsRemaining: number;
}

export default function BuyEducation() {
  const { token, user, balance, refreshBalance } = useContext(AuthContext);
  
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);
  const [showPinEntry, setShowPinEntry] = useState(false);
  const [selectedExam, setSelectedExam] = useState<ExamCard | null>(null);
  const [quantity, setQuantity] = useState('1');
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [userBalance, setUserBalance] = useState<UserBalance | null>(null);
  const [pinStatus, setPinStatus] = useState<PinStatus | null>(null);
  const [recentPurchases, setRecentPurchases] = useState<RecentPurchase[]>([]);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);
  const [isValidatingPin, setIsValidatingPin] = useState(false);
  const [pinError, setPinError] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successData, setSuccessData] = useState<any>(null);
  const [activeCategory, setActiveCategory] = useState('all');
  const pinInputRef = React.useRef<TextInput>(null);

  const examCards: ExamCard[] = [
    {
      id: 'jamb_utme',
      name: 'JAMB UTME e-PIN',
      code: 'jamb',
      price: 4500,
      description: 'JAMB UTME Registration PIN',
      examBody: 'jamb',
      validity: 'Current session',
      logo: require('../assets/images/jamb.jpeg'),
      category: 'tertiary'
    },
    {
      id: 'jamb_de',
      name: 'JAMB Direct Entry e-PIN',
      code: 'jamb',
      price: 4500,
      description: 'JAMB Direct Entry Registration PIN',
      examBody: 'jamb',
      validity: 'Current session',
      logo: require('../assets/images/jamb.jpeg'),
      category: 'tertiary'
    },
    {
      id: 'waec_checker',
      name: 'WAEC Result Checker PIN',
      code: 'waecdirect',
      price: 3900,
      description: 'WAEC Result Checker PIN',
      examBody: 'waec',
      validity: '1 year',
      logo: require('../assets/images/waec.png'),
      category: 'secondary'
    },
    {
      id: 'waec_registration',
      name: 'WAEC Registration PIN',
      code: 'waec-registration',
      price: 14000,
      description: 'WAEC Registration PIN',
      examBody: 'waec',
      validity: 'Current session',
      logo: require('../assets/images/waec.png'),
      category: 'secondary'
    },
  ];

  const categories = [
    { id: 'all', name: 'All Exams' },
    { id: 'secondary', name: 'Secondary' },
    { id: 'tertiary', name: 'Tertiary' },
  ];

  const filteredExams = activeCategory === 'all' 
    ? examCards 
    : examCards.filter(exam => exam.category === activeCategory);

  const quantityNum = parseInt(quantity) || 1;
  const totalAmount = selectedExam ? selectedExam.price * quantityNum : 0;
  const isQuantityValid = quantityNum >= 1 && quantityNum <= 10;
  const isPhoneValid = phone.length === 11 && /^0[789][01]\d{8}$/.test(phone);
  
  // Safe balance check with proper fallbacks
  const getBalanceAmount = (): number => {
    if (!userBalance) return 0;
    return userBalance.total || userBalance.amount || 0;
  };

  const hasEnoughBalance = totalAmount <= getBalanceAmount();
  const canProceed = selectedExam && isQuantityValid && hasEnoughBalance && isPhoneValid;
  const isPinValid = pin.length === 4 && /^\d{4}$/.test(pin);

  // Load initial data
  useEffect(() => {
    loadRecentPurchases();
    loadFormState();
    
    if (balance) {
      const balanceAmount = parseFloat(balance.amount?.toString() || '0') || 0;
      setUserBalance({
        main: balanceAmount,
        bonus: 0,
        total: balanceAmount,
        lastUpdated: Date.now(),
        amount: balanceAmount,
        currency: balance.currency || "NGN",
      });
    }
    
    // Load balance and PIN status after a short delay
    setTimeout(() => {
      fetchUserBalance();
      checkPinStatus();
    }, 1000);
  }, []);

  // Refresh balance when moving to step 2
  useEffect(() => {
    if (currentStep === 2) {
      fetchUserBalance();
    }
  }, [currentStep]);

  // Setup PIN entry when modal opens
  useEffect(() => {
    if (showPinEntry) {
      setPin('');
      setPinError('');
      checkPinStatus();
      
      // Focus PIN input after a short delay
      setTimeout(() => {
        pinInputRef.current?.focus();
      }, 300);
    }
  }, [showPinEntry]);

  // Save form state when inputs change
  useEffect(() => {
    saveFormState();
  }, [selectedExam, quantity, phone]);

  const getAuthToken = async (): Promise<string> => {
    if (!token) {
      throw new Error('Authentication required. Please login again.');
    }
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

  const checkPinStatus = async () => {
    try {
      const response = await makeApiRequest('/purchase/pin-status');
      if (response.success) {
        setPinStatus(response.data || response);
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
      
      if (balance) {
        const balanceAmount = parseFloat(balance.amount?.toString() || '0') || 0;
        const realBalance: UserBalance = {
          main: balanceAmount,
          bonus: 0,
          total: balanceAmount,
          amount: balanceAmount,
          currency: balance.currency || "NGN",
          lastUpdated: Date.now(),
        };

        setUserBalance(realBalance);
        await AsyncStorage.setItem("userBalance", JSON.stringify(realBalance));
      }
    } catch (error) {
      console.error('Error fetching balance:', error);
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
  };

  const saveFormState = async () => {
    try {
      const formState = { 
        selectedExamId: selectedExam?.id, 
        quantity,
        phone
      };
      await AsyncStorage.setItem('educationFormState', JSON.stringify(formState));
    } catch (error) {
      console.log('Error saving form state:', error);
    }
  };

  const loadFormState = async () => {
    try {
      const savedState = await AsyncStorage.getItem('educationFormState');
      if (savedState) {
        const { selectedExamId, quantity: savedQuantity, phone: savedPhone } = JSON.parse(savedState);
        if (selectedExamId) {
          const exam = examCards.find(e => e.id === selectedExamId);
          setSelectedExam(exam || null);
        }
        setQuantity(savedQuantity || '1');
        setPhone(savedPhone || '');
      }
    } catch (error) {
      console.log('Error loading form state:', error);
    }
  };

  const saveRecentPurchase = async (examType: string, quantity: number, totalAmount: number) => {
    try {
      const recent = await AsyncStorage.getItem('recentEducationPurchases');
      let recentList: RecentPurchase[] = recent ? JSON.parse(recent) : [];

      recentList.unshift({
        examType,
        quantity,
        totalAmount,
        timestamp: Date.now()
      });
      
      // Keep only last 5 purchases
      recentList = recentList.slice(0, 5);

      await AsyncStorage.setItem('recentEducationPurchases', JSON.stringify(recentList));
      setRecentPurchases(recentList);
    } catch (error) {
      console.log('Error saving recent purchase:', error);
    }
  };

  const loadRecentPurchases = async () => {
    try {
      const recent = await AsyncStorage.getItem('recentEducationPurchases');
      if (recent) {
        setRecentPurchases(JSON.parse(recent));
      }
    } catch (error) {
      console.log('Error loading recent purchases:', error);
    }
  };

  const handleProceedToPayment = () => {
    if (!pinStatus?.isPinSet) {
      Alert.alert(
        'PIN Required', 
        'Please set up a transaction PIN in your account settings before making purchases.',
        [{ text: 'OK', style: 'default' }]
      );
      return;
    }
    
    if (pinStatus?.isLocked) {
      Alert.alert(
        'Account Locked', 
        `Too many failed PIN attempts. Please try again in ${pinStatus.lockTimeRemaining} minutes.`,
        [{ text: 'OK', style: 'default' }]
      );
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
    // Use the correct endpoint and data structure to match your backend
    const response = await makeApiRequest('/purchase', {
      method: 'POST',
      body: JSON.stringify({
        type: 'education',  // Service type
        provider: selectedExam?.examBody,  // 'waec' or 'jamb'
        examType: selectedExam?.code,  // The exam code
        phone: phone,
        amount: totalAmount,  // Total amount
        pin: pin,
      }),
    });

    if (response.success === true) {
      await saveRecentPurchase(selectedExam?.name || '', quantityNum, totalAmount);
      
      // Update balance from response
      if (response.newBalance) {
        const balanceAmount = response.newBalance.mainBalance || 
                             response.newBalance.totalBalance || 
                             response.newBalance.amount || 0;
        
        const updatedBalance: UserBalance = {
          main: balanceAmount,
          bonus: 0,
          total: balanceAmount,
          amount: balanceAmount,
          currency: response.newBalance.currency || "NGN",
          lastUpdated: Date.now(),
        };

        setUserBalance(updatedBalance);
        await AsyncStorage.setItem("userBalance", JSON.stringify(updatedBalance));
      }

      // Refresh balance using context
      if (refreshBalance) {
        await refreshBalance();
      }

      // Clear saved form state
      await AsyncStorage.removeItem('educationFormState');

      // Set success data
      setSuccessData({
        transaction: response.transaction || {},
        examName: selectedExam?.name || 'Exam Card',
        quantity: quantityNum,
        amount: totalAmount,
        newBalance: response.newBalance || {
          amount: getBalanceAmount() - totalAmount,
          total: getBalanceAmount() - totalAmount,
          currency: "NGN"
        }
      });

      // Close PIN modal and show success
      setShowPinEntry(false);
      setTimeout(() => {
        setShowSuccessModal(true);
      }, 400);

    } else {
      const errorMsg = response.message || 'Payment could not be processed';
      if (errorMsg.toLowerCase().includes('pin')) {
        setPinError(errorMsg);
      } else {
        Alert.alert('Transaction Failed', errorMsg);
      }
    }

  } catch (error: any) {
    console.error('Payment error:', error);
    
    // Better error handling
    let errorMessage = 'Unable to process payment. Please try again.';
    
    if (error.message.includes('locked') || error.message.includes('attempts')) {
      setPinError(error.message);
      return;
    } else if (error.message.includes('PIN') || error.message.includes('pin')) {
      setPinError(error.message);
      return;
    } else if (error.message.includes('balance') || error.message.includes('insufficient')) {
      errorMessage = error.message;
    } else if (error.message.includes('network') || error.message.includes('connection')) {
      errorMessage = 'Network error. Please check your connection and try again.';
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    Alert.alert('Payment Error', errorMessage);
    
  } finally {
    setIsValidatingPin(false);
    setIsProcessingPayment(false);
  }
};

  const handleCloseSuccessModal = () => {
    setShowSuccessModal(false);
    setSuccessData(null);
  };

  const handleBuyMore = () => {
    setShowSuccessModal(false);
    setSuccessData(null);
    setCurrentStep(1);
    setSelectedExam(null);
    setQuantity('1');
    setPhone('');
    setPin('');
    setPinError('');
    setShowPinEntry(false);
  };

  const handlePinChange = (text: string) => {
    const cleanedText = text.replace(/\D/g, '').substring(0, 4);
    setPin(cleanedText);
    if (pinError) setPinError('');
  };

  const handleCategorySelect = (categoryId: string) => {
    setActiveCategory(categoryId);
    // Reset selection when changing category
    if (selectedExam && !filteredExams.find(exam => exam.id === selectedExam.id)) {
      setSelectedExam(null);
    }
  };

  const handlePinAreaPress = () => {
    setTimeout(() => {
      pinInputRef.current?.focus();
    }, 50);
  };

  // Safe formatting function
  const formatCurrency = (amount: number): string => {
    try {
      return `₦${amount.toLocaleString()}`;
    } catch (error) {
      return '₦0';
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* STEP 1: SELECT EXAM & DETAILS */}
      {currentStep === 1 && (
        <ScrollView
          style={styles.scrollContent}
          contentContainerStyle={styles.scrollContentContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Category Filter */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Filter by Category</Text>
            <View style={styles.categoryRow}>
              {categories.map((category) => (
                <TouchableOpacity
                  key={category.id}
                  style={[
                    styles.categoryBtn,
                    activeCategory === category.id && styles.categoryBtnActive
                  ]}
                  onPress={() => handleCategorySelect(category.id)}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.categoryText,
                    activeCategory === category.id && styles.categoryTextActive
                  ]}>
                    {category.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Exam Selection */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Select Exam Card</Text>
            <View style={styles.examGrid}>
              {filteredExams.map((exam) => (
                <TouchableOpacity
                  key={exam.id}
                  style={[
                    styles.examCard,
                    selectedExam?.id === exam.id && styles.examCardSelected
                  ]}
                  onPress={() => setSelectedExam(exam)}
                  activeOpacity={0.7}
                >
                  <Image source={exam.logo} style={styles.examLogo} />
                  <Text style={styles.examName}>{exam.name}</Text>
                  <Text style={styles.examPrice}>{formatCurrency(exam.price)}</Text>
                  {selectedExam?.id === exam.id && (
                    <View style={styles.selectedIndicator}>
                      <Text style={styles.selectedIndicatorText}>✓</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Quantity Selection */}
          {selectedExam && (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Quantity</Text>
              <View style={styles.quantityContainer}>
                <TouchableOpacity
                  style={[styles.quantityBtn, quantityNum <= 1 && styles.quantityBtnDisabled]}
                  onPress={() => {
                    if (quantityNum > 1) setQuantity((quantityNum - 1).toString());
                  }}
                  disabled={quantityNum <= 1}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.quantityBtnText, quantityNum <= 1 && styles.quantityBtnTextDisabled]}>-</Text>
                </TouchableOpacity>
                
                <TextInput
                  style={styles.quantityInput}
                  keyboardType="numeric"
                  value={quantity}
                  onChangeText={(text) => {
                    const num = parseInt(text.replace(/\D/g, '')) || 1;
                    if (num >= 1 && num <= 10) setQuantity(num.toString());
                  }}
                />
                
                <TouchableOpacity
                  style={[styles.quantityBtn, quantityNum >= 10 && styles.quantityBtnDisabled]}
                  onPress={() => {
                    if (quantityNum < 10) setQuantity((quantityNum + 1).toString());
                  }}
                  disabled={quantityNum >= 10}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.quantityBtnText, quantityNum >= 10 && styles.quantityBtnTextDisabled]}>+</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.quantityHelp}>Maximum 10 cards per transaction</Text>
            </View>
          )}

          {/* Phone Number Input */}
          {selectedExam && (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Recipient Phone Number</Text>
              <TextInput
                style={[styles.textInput, !isPhoneValid && phone !== '' && styles.inputError]}
                keyboardType="phone-pad"
                placeholder="08012345678"
                placeholderTextColor="#999"
                maxLength={11}
                value={phone}
                onChangeText={setPhone}
              />
              <Text style={styles.inputHelp}>
                PIN details will be sent to this number via SMS
              </Text>
              {phone !== '' && !isPhoneValid && (
                <Text style={styles.validationError}>
                  Enter valid 11-digit Nigerian number (070, 080, 081, or 090)
                </Text>
              )}
              {phone !== '' && isPhoneValid && (
                <View style={styles.validationSuccess}>
                  <Text style={styles.validationSuccessText}>✓ Valid phone number</Text>
                </View>
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
              {canProceed 
                ? `Review Purchase • ${formatCurrency(totalAmount)}` 
                : 'Complete Form to Continue'
              }
            </Text>
          </TouchableOpacity>

          {/* Recent Purchases */}
          {recentPurchases.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Recent Purchases</Text>
              <View style={styles.recentList}>
                {recentPurchases.slice(0, 3).map((purchase, index) => (
                  <View key={index} style={styles.recentItem}>
                    <Text style={styles.recentExam}>{purchase.examType}</Text>
                    <Text style={styles.recentDetails}>
                      {purchase.quantity} card(s) • {formatCurrency(purchase.totalAmount)}
                    </Text>
                    <Text style={styles.recentTime}>
                      {new Date(purchase.timestamp).toLocaleDateString()}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </ScrollView>
      )}

      {/* STEP 2: REVIEW & PAYMENT */}
      {currentStep === 2 && selectedExam && (
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
                  {formatCurrency(getBalanceAmount())}
                </Text>

                {totalAmount > 0 && (
                  <View style={styles.balanceCalculation}>
                    <View style={styles.balanceRow}>
                      <Text style={styles.balanceRowLabel}>Purchase Amount</Text>
                      <Text style={styles.balanceRowValue}>-{formatCurrency(totalAmount)}</Text>
                    </View>
                    <View style={styles.balanceDivider} />
                    <View style={styles.balanceRow}>
                      <Text style={styles.balanceRowLabelBold}>Remaining Balance</Text>
                      <Text style={[
                        styles.balanceRowValueBold,
                        (getBalanceAmount() - totalAmount) < 0 && styles.negativeAmount
                      ]}>
                        {formatCurrency(Math.max(0, getBalanceAmount() - totalAmount))}
                      </Text>
                    </View>
                  </View>
                )}

                {!hasEnoughBalance && (
                  <View style={styles.insufficientWarning}>
                    <Text style={styles.insufficientWarningText}>
                      ⚠️ Insufficient balance for this transaction
                    </Text>
                  </View>
                )}
              </>
            ) : (
              <View style={styles.balanceLoading}>
                <ActivityIndicator size="small" color="#ff3b30" />
                <Text style={styles.balanceLoadingText}>
                  {isLoadingBalance ? 'Loading balance...' : 'Unable to load balance'}
                </Text>
              </View>
            )}
          </View>
          
          {/* Transaction Summary */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Purchase Summary</Text>

            <View style={styles.summaryItem}>
              <View style={styles.summaryLeft}>
                <Image source={selectedExam.logo} style={styles.summaryLogo} />
                <View style={styles.summaryTextContainer}>
                  <Text style={styles.summaryText}>{selectedExam.name}</Text>
                  <Text style={styles.summaryDesc}>{selectedExam.description}</Text>
                </View>
              </View>
            </View>

            <View style={styles.summaryDivider} />

            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Quantity</Text>
              <Text style={styles.summaryValue}>{quantityNum}</Text>
            </View>

            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Phone Number</Text>
              <Text style={styles.summaryValue}>{phone}</Text>
            </View>

            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Unit Price</Text>
              <Text style={styles.summaryValue}>{formatCurrency(selectedExam.price)}</Text>
            </View>

            <View style={styles.summaryDivider} />

            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabelTotal}>Total Amount</Text>
              <Text style={styles.summaryValueTotal}>{formatCurrency(totalAmount)}</Text>
            </View>
          </View>

          {/* Action Buttons */}
          <TouchableOpacity
            style={[
              styles.primaryButton, 
              (!hasEnoughBalance || !pinStatus?.isPinSet) && styles.primaryButtonDisabled
            ]}
            disabled={!hasEnoughBalance || !pinStatus?.isPinSet}
            onPress={handleProceedToPayment}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryButtonText}>
              {!pinStatus?.isPinSet 
                ? 'Setup PIN Required' 
                : !hasEnoughBalance 
                  ? 'Insufficient Balance' 
                  : 'Proceed to Payment'
              }
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => setCurrentStep(1)}
            activeOpacity={0.8}
          >
            <Text style={styles.secondaryButtonText}>← Edit Details</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* PIN ENTRY MODAL */}
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

            {pinStatus?.attemptsRemaining !== undefined && pinStatus.attemptsRemaining < 3 && (
              <View style={styles.attemptsWarning}>
                <Text style={styles.attemptsWarningText}>
                  {pinStatus.attemptsRemaining} attempts remaining
                </Text>
              </View>
            )}

            {/* PIN Input Area */}
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
              
              {/* Hidden PIN Input */}
              <TextInput
                ref={pinInputRef}
                style={styles.overlayPinInput}
                value={pin}
                onChangeText={handlePinChange}
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
                  Confirm Payment • {formatCurrency(totalAmount)}
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

      {/* Success Modal */}
      <EducationSuccessModal
        visible={showSuccessModal}
        onClose={handleCloseSuccessModal}
        onBuyMore={handleBuyMore}
        transaction={successData?.transaction || {}}
        examName={successData?.examName || ''}
        quantity={successData?.quantity || 0}
        amount={successData?.amount || 0}
        newBalance={successData?.newBalance || null}
        message={successData ? `${successData.quantity} ${successData.examName} card(s) purchased successfully!` : 'Purchase completed successfully!'}
      />
    </KeyboardAvoidingView>
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

  // Card Styles
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

  // Category Filter
  categoryRow: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    gap: 8 
  },
  categoryBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#fafafa',
    borderWidth: 1,
    borderColor: '#e8e8e8',
  },
  categoryBtnActive: { 
    backgroundColor: '#ff3b30', 
    borderColor: '#ff3b30' 
  },
  categoryText: { 
    fontSize: 14, 
    color: '#666',
    fontWeight: '500',
  },
  categoryTextActive: { 
    color: '#fff', 
    fontWeight: '600' 
  },

  // Exam Selection
  examGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  examCard: {
    width: '48%',
    backgroundColor: '#fafafa',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e8e8e8',
    position: 'relative',
  },
  examCardSelected: { 
    borderColor: '#ff3b30', 
    backgroundColor: '#fff5f5' 
  },
  examLogo: { 
    width: 50, 
    height: 50, 
    resizeMode: 'contain', 
    marginBottom: 8 
  },
  examName: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
    color: '#333',
  },
  examPrice: { 
    fontSize: 16, 
    fontWeight: 'bold', 
    color: '#ff3b30' 
  },
  selectedIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#ff3b30',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedIndicatorText: { 
    color: '#fff', 
    fontSize: 12, 
    fontWeight: 'bold' 
  },

  // Quantity Selection
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  quantityBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ff3b30',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityBtnDisabled: {
    backgroundColor: '#d0d0d0',
  },
  quantityBtnText: { 
    color: '#fff', 
    fontSize: 18, 
    fontWeight: 'bold' 
  },
  quantityBtnTextDisabled: { 
    color: '#999' 
  },
  quantityInput: {
    width: 60,
    height: 40,
    borderWidth: 1,
    borderColor: '#e8e8e8',
    borderRadius: 8,
    marginHorizontal: 12,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
    backgroundColor: '#fafafa',
  },
  quantityHelp: { 
    fontSize: 12, 
    color: '#999', 
    textAlign: 'center' 
  },

  // Input Styles
  textInput: {
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
  inputHelp: { 
    fontSize: 12, 
    color: '#999', 
    marginTop: 6 
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

  // Recent Purchases
  recentList: { 
    backgroundColor: '#fafafa', 
    borderRadius: 12, 
    overflow: 'hidden' 
  },
  recentItem: { 
    padding: 16, 
    borderBottomWidth: 1, 
    borderBottomColor: '#f0f0f0' 
  },
  recentExam: { 
    fontSize: 14, 
    fontWeight: '600', 
    color: '#333', 
    marginBottom: 4 
  },
  recentDetails: { 
    fontSize: 12, 
    color: '#666', 
    marginBottom: 4 
  },
  recentTime: { 
    fontSize: 11, 
    color: '#999' 
  },

  // Buttons
  primaryButton: {
    backgroundColor: '#ff3b30',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#ff3b30',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  primaryButtonDisabled: {
    backgroundColor: '#d0d0d0',
    shadowOpacity: 0,
    elevation: 0,
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

  // Balance Overview
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

  // Summary Styles
  summaryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryLeft: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    flex: 1 
  },
  summaryLogo: { 
    width: 30, 
    height: 30, 
    resizeMode: 'contain', 
    marginRight: 8 
  },
  summaryTextContainer: {
    flex: 1,
  },
  summaryText: { 
    fontSize: 14, 
    color: '#333', 
    fontWeight: '500' 
  },
  summaryDesc: { 
    fontSize: 12, 
    color: '#666' 
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

  // PIN Entry Styles
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
});