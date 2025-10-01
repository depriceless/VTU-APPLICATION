import React, { useState, useEffect } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView, Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const API_CONFIG = {
  BASE_URL: 'http://10.157.13.7:5000/api',
  ENDPOINTS: {
    CREATE_ACCOUNT: '/monnify/create-reserved-account',
    GET_ACCOUNTS: '/monnify/user-accounts',
  }
};

const PAYMENT_METHODS = [
  { id: 'monnify', label: 'BANK TRANSFER', icon: 'business-outline' },
  { id: 'card', label: 'DEBIT CARD', icon: 'card-outline' }
];

export default function FundWallet({ token, currentBalance = 0, onSuccess }) {
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('monnify');
  const [loading, setLoading] = useState(true);
  const [bankData, setBankData] = useState(null);
  const [cardInfo, setCardInfo] = useState({ cardNumber: '', expiry: '', cvv: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchAccountDetails();
  }, []);

  const makeAPICall = async (url, options) => {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
          ...options.headers,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `HTTP error! status: ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error('API call failed:', error);
      throw error;
    }
  };

  const fetchAccountDetails = async () => {
  setLoading(true);
  try {
    console.log('Fetching account details...');
    const response = await makeAPICall(
      `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.CREATE_ACCOUNT}`, 
      { method: 'POST' }
    );

    console.log('Full API Response:', JSON.stringify(response, null, 2));

    if (response.success) {
      const accounts = response.data.accounts;
      
      // Log to see the actual structure
      console.log('Raw accounts:', accounts);
      console.log('Number of accounts:', accounts.length);
      console.log('First account:', JSON.stringify(accounts[0], null, 2));
      
      // Check if accounts[0] has nested accounts
      const actualAccounts = accounts[0]?.accounts || accounts;
      console.log('Actual accounts to display:', actualAccounts);
      
      // Store all accounts in an array
      const allAccounts = actualAccounts.map((acc) => ({
        bankName: acc.bankName || acc.bank_name,
        accountNumber: acc.accountNumber || acc.account_number,
        accountName: acc.accountName || acc.account_name
      }));

      console.log('Formatted accounts:', allAccounts);

      setBankData({
        accounts: allAccounts,
        reference: response.data.accountReference,
        // Keep backward compatibility
        bankName: allAccounts[0]?.bankName,
        accountName: allAccounts[0]?.accountName,
        accountNumber: allAccounts[0]?.accountNumber,
        secondBank: allAccounts[1]?.bankName,
        secondAccountNumber: allAccounts[1]?.accountNumber
      });

      console.log('All accounts loaded:', allAccounts.length);
    } else {
      setError(response.message || 'Failed to get account details');
    }
  } catch (error) {
    console.error('Fetch account details error:', error);
    setError(error.message || 'Failed to load account details');
  } finally {
    setLoading(false);
  }
};

  const validateAmount = (value) => {
    const numericAmount = Number(value);
    return value.trim() !== '' && !isNaN(numericAmount) && numericAmount > 0 && numericAmount <= 1000000;
  };

  const validateCardNumber = (cardNumber) => {
    const cleaned = cardNumber.replace(/\s/g, '');
    return /^\d{13,19}$/.test(cleaned);
  };

  const validateExpiry = (expiry) => {
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

  const validateCVV = (cvv) => {
    return /^\d{3,4}$/.test(cvv);
  };

  const formatCardNumber = (text) => {
    const cleaned = text.replace(/\s/g, '');
    const match = cleaned.match(/.{1,4}/g);
    return match ? match.join(' ').substr(0, 19) : cleaned;
  };

  const formatExpiry = (text) => {
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

      const response = await makeAPICall(`${API_CONFIG.BASE_URL}/card/pay`, {
        method: 'POST',
        body: JSON.stringify({
          amount: numericAmount,
          card_number: cleanedCardNumber,
          cvv: cardInfo.cvv,
          expiry_month,
          expiry_year: `20${expiry_year}`,
        }),
      });

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
      setError(error.message || 'Network error occurred');
    } finally {
      setLoading(false);
    }
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

        {paymentMethod === 'monnify' && (
  <View style={styles.section}>
    <Text style={styles.label}>Your Permanent Account Details</Text>
    <View style={styles.bankCard}>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color="#ff3b30" size="small" />
          <Text style={styles.loadingText}>Loading account details...</Text>
        </View>
      ) : bankData ? (
        <>
          {/* Display ALL accounts */}
          {bankData.accounts && bankData.accounts.length > 0 ? (
            bankData.accounts.map((account, index) => (
              <View 
                key={index} 
                style={[
                  styles.accountBlock,
                  index < bankData.accounts.length - 1 && styles.accountWithBorder
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
            ))
          ) : (
            // Fallback to old structure if accounts array doesn't exist
            <>
              <View style={styles.accountBlock}>
                <View style={styles.accountRow}>
                  <Text style={styles.accountLabel}>Bank:</Text>
                  <Text style={styles.accountValue}>{bankData.bankName}</Text>
                </View>
                <View style={styles.accountRow}>
                  <Text style={styles.accountLabel}>Account Name:</Text>
                  <Text style={styles.accountValue}>{bankData.accountName}</Text>
                </View>
                <View style={styles.accountRow}>
                  <Text style={styles.accountLabel}>Account Number:</Text>
                  <Text style={[styles.accountValue, styles.accountNumber]}>
                    {bankData.accountNumber}
                  </Text>
                </View>
              </View>

              {bankData.secondBank && (
                <View style={[styles.accountBlock, styles.secondAccount]}>
                  <View style={styles.accountRow}>
                    <Text style={styles.accountLabel}>Bank:</Text>
                    <Text style={styles.accountValue}>{bankData.secondBank}</Text>
                  </View>
                  <View style={styles.accountRow}>
                    <Text style={styles.accountLabel}>Account Name:</Text>
                    <Text style={styles.accountValue}>{bankData.accountName}</Text>
                  </View>
                  <View style={styles.accountRow}>
                    <Text style={styles.accountLabel}>Account Number:</Text>
                    <Text style={[styles.accountValue, styles.accountNumber]}>
                      {bankData.secondAccountNumber}
                    </Text>
                  </View>
                </View>
              )}
            </>
          )}

          <View style={styles.infoBox}>
            <Ionicons name="information-circle-outline" size={16} color="#666" />
            <Text style={styles.infoText}>
              Transfer any amount to any of the accounts above. Your wallet will be credited automatically within minutes.
            </Text>
          </View>
        </>
      ) : (
        <View style={styles.errorContainer}>
          <Text style={styles.errorContainerText}>Failed to load account details</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchAccountDetails}>
            <Text style={styles.retryButtonText}>Tap to Retry</Text>
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
            {paymentMethod === 'monnify' 
              ? 'These account numbers are permanent and can be used anytime to fund your wallet.'
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
  
  label: { 
    fontSize: 16, 
    fontWeight: '600', 
    marginBottom: 8, 
    color: '#333' 
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
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  secondAccount: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 16,
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
    paddingVertical: 20,
  },
  errorContainerText: {
    color: '#666',
    fontSize: 14,
    marginBottom: 12,
  },
  retryButton: {
    backgroundColor: '#ff3b30',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 12,
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
  accountWithBorder: {
  borderBottomWidth: 1,
  borderBottomColor: '#f0f0f0',
  marginBottom: 16,
  paddingBottom: 16,
},
});