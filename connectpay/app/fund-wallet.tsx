import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  ActivityIndicator, 
  ScrollView, 
  Alert 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';

// Types
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
  accounts?: BankAccount[];
  reference?: string;
  bankName?: string;
  accountName?: string;
  accountNumber?: string;
  gateway?: string;
}

interface CardInfo {
  cardNumber: string;
  expiry: string;
  cvv: string;
}

interface PaymentMethod {
  id: 'bank' | 'card';
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}

// API Configuration
const API_CONFIG = {
  BASE_URL: Constants.expoConfig?.extra?.EXPO_PUBLIC_API_URL 
    ? `${Constants.expoConfig.extra.EXPO_PUBLIC_API_URL}/api`
    : 'https://vtu-application.onrender.com/api',
  ENDPOINTS: {
    GET_VIRTUAL_ACCOUNT: '/payment/virtual-account',
    CARD_PAYMENT: '/card/pay',
    ACTIVE_GATEWAY: '/payment/active-gateway'
  }
};
console.log('🔧 FundWallet API URL:', API_CONFIG.BASE_URL);

const PAYMENT_METHODS: PaymentMethod[] = [
  { id: 'bank', label: 'BANK TRANSFER', icon: 'business-outline' },
  { id: 'card', label: 'DEBIT CARD', icon: 'card-outline' }
];

export default function FundWallet({ token, currentBalance = 0, onSuccess }: FundWalletProps) {
  const [amount, setAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'bank' | 'card'>('bank');
  const [loading, setLoading] = useState<boolean>(true);
  const [bankData, setBankData] = useState<BankData | null>(null);
  const [cardInfo, setCardInfo] = useState<CardInfo>({ cardNumber: '', expiry: '', cvv: '' });
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [activeGateway, setActiveGateway] = useState<string>('');

  useEffect(() => {
    if (token) {
      checkActiveGateway();
      fetchAccountDetails();
    } else {
      setError('Please login to continue');
      setLoading(false);
    }
  }, [token]);

  const makeAPICall = async (url: string, options: RequestInit = {}): Promise<any> => {
    const method = options.method || 'GET';
    console.log(`\n📡 === API REQUEST ===`);
    console.log(`Method: ${method}`);
    console.log(`URL: ${url}`);
    console.log(`Time: ${new Date().toISOString()}`);
    
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
          ...options.headers,
        },
      });

      const responseText = await response.text();
      console.log(`📄 Response Status: ${response.status}`);
      console.log(`📄 Response (first 300 chars):`, responseText.substring(0, 300));

      let data: any;
      try {
        data = responseText ? JSON.parse(responseText) : {};
      } catch (parseError) {
        console.error('❌ JSON Parse Error:', parseError);
        throw new Error('Invalid server response');
      }

      if (!response.ok) {
        console.error('❌ Request failed:', data);
        throw new Error(data.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      console.log('✅ Request successful\n');
      return data;

    } catch (error) {
      console.error('❌ API Error:', error);
      
      if (error instanceof Error && error.message === 'Network request failed') {
        throw new Error('Cannot connect to server. Please check your internet connection.');
      }
      
      throw error;
    }
  };

  const checkActiveGateway = async () => {
    try {
      const response = await makeAPICall(
        `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.ACTIVE_GATEWAY}`,
        { method: 'GET' }
      );

      if (response.success) {
        setActiveGateway(response.activeGateway);
        console.log('💳 Active Gateway:', response.activeGateway);
      }
    } catch (error) {
      console.error('❌ Failed to check active gateway:', error);
    }
  };

  const processAccounts = (data: any) => {
    console.log('📋 Processing account data...');
    console.log('Gateway:', data.gateway);
    
    if (data.gateway === 'paystack') {
      // Paystack has single account
      setBankData({
        accounts: [{
          bankName: data.bankName,
          accountNumber: data.accountNumber,
          accountName: data.accountName
        }],
        bankName: data.bankName,
        accountName: data.accountName,
        accountNumber: data.accountNumber,
        gateway: 'paystack'
      });
      console.log('✅ Loaded Paystack account');
    } else if (data.gateway === 'monnify') {
      // Monnify has multiple accounts
      const allAccounts: BankAccount[] = data.accounts.map((acc: any) => ({
        bankName: acc.bankName || acc.bank_name,
        accountNumber: acc.accountNumber || acc.account_number,
        accountName: acc.accountName || acc.account_name
      }));

      setBankData({
        accounts: allAccounts,
        reference: data.accountReference,
        bankName: allAccounts[0]?.bankName,
        accountName: allAccounts[0]?.accountName,
        accountNumber: allAccounts[0]?.accountNumber,
        gateway: 'monnify'
      });
      console.log('✅ Loaded', allAccounts.length, 'Monnify accounts');
    }
  };

  const fetchAccountDetails = async () => {
    setLoading(true);
    setError('');
    
    try {
      console.log('🔍 Fetching virtual account details...');
      
      // Use unified endpoint - automatically returns active gateway account
      const response = await makeAPICall(
        `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.GET_VIRTUAL_ACCOUNT}`,
        { method: 'GET' }
      );

      if (response.success && response.data) {
        processAccounts(response.data);
      } else {
        throw new Error(response.message || 'Failed to load account');
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load account details';
      console.error('❌ Fetch error:', errorMessage);
      
      // Check if account doesn't exist
      if (errorMessage.includes('404') || errorMessage.includes('not found')) {
        setError('Virtual account not created yet. Please contact support.');
        
        Alert.alert(
          'Account Setup Required',
          'Your virtual account needs to be set up. Please contact support or try again later.',
          [{ text: 'OK' }]
        );
      } else {
        setError(errorMessage);
        
        Alert.alert(
          'Error Loading Account',
          errorMessage,
          [
            { text: 'Retry', onPress: fetchAccountDetails },
            { text: 'Cancel', style: 'cancel' }
          ]
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const validateAmount = (value: string): boolean => {
    const numericAmount = Number(value);
    return value.trim() !== '' && !isNaN(numericAmount) && numericAmount > 0 && numericAmount <= 1000000;
  };

  const validateCardNumber = (cardNumber: string): boolean => {
    const cleaned = cardNumber.replace(/\s/g, '');
    return /^\d{13,19}$/.test(cleaned);
  };

  const validateExpiry = (expiry: string): boolean => {
    const regex = /^(0[1-9]|1[0-2])\/\d{2}$/;
    if (!regex.test(expiry)) return false;

    const [month, year] = expiry.split('/');
    const currentYear = new Date().getFullYear() % 100;
    const currentMonth = new Date().getMonth() + 1;
    const expYear = parseInt(year);
    const expMonth = parseInt(month);

    if (expYear < currentYear) return false;
    if (expYear === currentYear && expMonth < currentMonth) return false;

    return true;
  };

  const validateCVV = (cvv: string): boolean => {
    return /^\d{3,4}$/.test(cvv);
  };

  const formatCardNumber = (text: string): string => {
    const cleaned = text.replace(/\s/g, '');
    const match = cleaned.match(/.{1,4}/g);
    return match ? match.join(' ').substr(0, 19) : cleaned;
  };

  const formatExpiry = (text: string): string => {
    const cleaned = text.replace(/\D/g, '');
    if (cleaned.length >= 2) {
      return cleaned.substring(0, 2) + '/' + cleaned.substring(2, 4);
    }
    return cleaned;
  };

  const handleCardPayment = async () => {
    const numericAmount = Number(amount);

    setError('');
    setSuccess('');

    if (!validateAmount(amount)) {
      setError('Please enter a valid amount (₦1 - ₦1,000,000)');
      return;
    }

    if (!validateCardNumber(cardInfo.cardNumber)) {
      setError('Please enter a valid card number');
      return;
    }
    if (!validateExpiry(cardInfo.expiry)) {
      setError('Please enter a valid expiry date (MM/YY)');
      return;
    }
    if (!validateCVV(cardInfo.cvv)) {
      setError('Please enter a valid CVV (3-4 digits)');
      return;
    }

    setLoading(true);

    try {
      const [expiry_month, expiry_year] = cardInfo.expiry.split('/');
      const cleanedCardNumber = cardInfo.cardNumber.replace(/\s/g, '');

      const response = await makeAPICall(
        `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.CARD_PAYMENT}`, 
        {
          method: 'POST',
          body: JSON.stringify({
            amount: numericAmount,
            card_number: cleanedCardNumber,
            cvv: cardInfo.cvv,
            expiry_month,
            expiry_year: `20${expiry_year}`,
          }),
        }
      );

      if (response.status === 'success' || response.success) {
        setSuccess(`Wallet funded successfully with ₦${numericAmount.toLocaleString()}!`);

        setTimeout(() => {
          setAmount('');
          setCardInfo({ cardNumber: '', expiry: '', cvv: '' });
          if (onSuccess) onSuccess();
        }, 2000);
      } else {
        setError(response.message || 'Card payment failed');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Payment processing failed';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const getGatewayName = () => {
    if (bankData?.gateway === 'paystack') return 'Paystack';
    if (bankData?.gateway === 'monnify') return 'Monnify';
    return activeGateway === 'paystack' ? 'Paystack' : 'Monnify';
  };

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
                style={[styles.methodButton, paymentMethod === method.id && styles.methodButtonActive]}
                onPress={() => {
                  setPaymentMethod(method.id);
                  setError('');
                  setSuccess('');
                }}
              >
                <Ionicons 
                  name={method.icon} 
                  size={20} 
                  color={paymentMethod === method.id ? '#ff3b30' : '#666'} 
                />
                <Text style={[styles.methodText, paymentMethod === method.id && styles.methodTextActive]}>
                  {method.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Error/Success Messages */}
        {error ? (
          <View style={styles.messageContainer}>
            <Text style={styles.errorText}>⚠️ {error}</Text>
          </View>
        ) : null}
        
        {success ? (
          <View style={styles.messageContainer}>
            <Text style={styles.successText}>✅ {success}</Text>
          </View>
        ) : null}

        {/* Bank Transfer Section */}
        {paymentMethod === 'bank' && (
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
              ) : bankData && bankData.accounts && bankData.accounts.length > 0 ? (
                <>
                  {bankData.accounts.map((account, index) => (
                    <View 
                      key={index} 
                      style={[
                        styles.accountBlock,
                        index < bankData.accounts!.length - 1 && styles.accountWithBorder
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
                      <View style={styles.accountRow}>
                        <Text style={styles.accountLabel}>Account Number:</Text>
                        <Text style={[styles.accountValue, styles.accountNumber]}>
                          {account.accountNumber}
                        </Text>
                      </View>
                    </View>
                  ))}

                  <View style={styles.infoBox}>
                    <Ionicons name="information-circle-outline" size={16} color="#666" />
                    <Text style={styles.infoText}>
                      {bankData.accounts.length > 1 
                        ? 'Transfer any amount to any account above. Your wallet will be credited automatically within minutes.'
                        : 'Transfer any amount to this account. Your wallet will be credited automatically within minutes.'
                      }
                    </Text>
                  </View>
                </>
              ) : (
                <View style={styles.errorContainer}>
                  <Ionicons name="alert-circle-outline" size={48} color="#ff3b30" />
                  <Text style={styles.errorContainerText}>
                    {error || 'Failed to load account'}
                  </Text>
                  <TouchableOpacity style={styles.retryButton} onPress={fetchAccountDetails}>
                    <Text style={styles.retryButtonText}>Retry</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Card Payment Section */}
        {paymentMethod === 'card' && (
          <>
            <View style={styles.section}>
              <Text style={styles.label}>Enter Card Details</Text>
              <TextInput
                style={[styles.input, error && error.includes('card') && styles.inputError]}
                placeholder="1234 5678 9012 3456"
                placeholderTextColor="#aaa"
                value={cardInfo.cardNumber}
                keyboardType="numeric"
                maxLength={19}
                onChangeText={(text) => {
                  const formatted = formatCardNumber(text);
                  setCardInfo({...cardInfo, cardNumber: formatted});
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
                    const formatted = formatExpiry(text);
                    setCardInfo({...cardInfo, expiry: formatted});
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
                    const numericText = text.replace(/[^0-9]/g, '');
                    setCardInfo({...cardInfo, cvv: numericText});
                    setError('');
                  }}
                />
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>Enter Amount</Text>
              <TextInput
                style={[styles.input, error && error.includes('amount') && styles.inputError]}
                placeholder="Enter amount (₦1 - ₦1,000,000)"
                placeholderTextColor="#aaa"
                keyboardType="numeric"
                value={amount}
                onChangeText={(text) => { 
                  const numericText = text.replace(/[^0-9]/g, '');
                  setAmount(numericText); 
                  setError(''); 
                  setSuccess(''); 
                }}
              />
              {amount !== '' && !validateAmount(amount) && (
                <Text style={styles.validationError}>Amount must be between ₦1 and ₦1,000,000</Text>
              )}
              {amount !== '' && validateAmount(amount) && (
                <Text style={styles.validationSuccess}>✓ Valid amount</Text>
              )}
            </View>

            <TouchableOpacity 
              style={[styles.proceedBtn, (loading || !amount) && styles.proceedDisabled]} 
              onPress={handleCardPayment} 
              disabled={loading || !amount}
            >
              {loading ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator color="#fff" size="small" />
                  <Text style={[styles.proceedText, { marginLeft: 8 }]}>Processing...</Text>
                </View>
              ) : (
                <>
                  <Ionicons name="card-outline" size={20} color="#fff" />
                  <Text style={styles.proceedText}>
                    Pay with Card{amount ? ` • ₦${Number(amount).toLocaleString()}` : ''}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </>
        )}

        {/* Help Text */}
        <View style={styles.helpContainer}>
          <Text style={styles.helpText}>
            {paymentMethod === 'bank' 
              ? `This account ${bankData?.accounts && bankData.accounts.length > 1 ? 'numbers are' : 'number is'} permanent and can be used anytime to fund your wallet.`
              : 'Your wallet will be credited immediately after successful payment.'
            }
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

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
    marginBottom: 8,
  },
  label: { 
    fontSize: 16, 
    fontWeight: '600', 
    color: '#333' 
  },
  gatewayBadge: {
    backgroundColor: '#ff3b30',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  gatewayText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  methodGrid: { 
    flexDirection: 'row', 
    gap: 8 
  },
  methodButton: { 
    paddingVertical: 14, 
    paddingHorizontal: 12, 
    borderWidth: 1, 
    borderColor: '#ddd', 
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
    borderWidth: 2 
  },
  methodText: { 
    fontWeight: '600', 
    textAlign: 'center', 
    color: '#333', 
    fontSize: 12 
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
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ffdddd',
  },
  successText: { 
    color: '#28a745', 
    fontSize: 14, 
    fontWeight: '600', 
    textAlign: 'center',
    backgroundColor: '#f0f9f4',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#c3e6cb',
  },
  bankCard: {
    padding: 20,
    borderRadius: 12,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 10,
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
    marginBottom: 8,
  },
  accountLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  accountValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
    textAlign: 'right',
    flex: 1,
    marginLeft: 12,
  },
  accountNumber: {
    fontSize: 16,
    color: '#ff3b30',
    fontWeight: '700',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    gap: 8,
    marginTop: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: '#666',
    lineHeight: 18,
  },
  errorContainer: {
    alignItems: 'center',
    paddingVertical: 30,
    gap: 12,
  },
  errorContainerText: {
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#ff3b30',
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginTop: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    backgroundColor: '#fff',
    marginBottom: 12,
  },
  inputError: { 
    borderColor: '#ff3b30', 
    borderWidth: 2 
  },
  inputHalf: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  cardRow: { 
    flexDirection: 'row', 
    gap: 8,
    marginBottom: 12,
  },
  validationError: {
    color: '#ff3b30',
    fontSize: 12,
    marginTop: -8,
    marginBottom: 8,
    fontWeight: '500',
  },
  validationSuccess: {
    color: '#28a745',
    fontSize: 12,
    marginTop: -8,
    marginBottom: 8,
    fontWeight: '500',
  },
  proceedBtn: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#ff3b30',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#ff3b30',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  proceedDisabled: { 
    backgroundColor: '#ccc',
    shadowOpacity: 0,
    elevation: 0,
  },
  proceedText: { 
    color: '#fff', 
    fontSize: 16, 
    fontWeight: '600' 
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  helpContainer: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 24,
  },
  helpText: { 
    textAlign: 'center', 
    color: '#666', 
    fontSize: 12, 
    fontStyle: 'italic',
    lineHeight: 18,
  },
});



