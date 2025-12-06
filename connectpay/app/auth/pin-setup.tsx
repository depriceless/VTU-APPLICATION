import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Platform,
  ScrollView,
  SafeAreaView,
  KeyboardAvoidingView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { storage, TOKEN_KEY } from '../../src/config/api'; // ✅ FIXED: Import from api config
import { Ionicons } from '@expo/vector-icons';

const API_BASE_URL = Platform.OS === 'web' 
  ? `${process.env.EXPO_PUBLIC_API_URL_WEB}/api`
  : `${process.env.EXPO_PUBLIC_API_URL}/api`;

export default function PinSetupScreen() {
  const router = useRouter();
  const { userToken, userName } = useLocalSearchParams();
  const inputRef = useRef(null);

  const [currentStep, setCurrentStep] = useState(1);
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showPin, setShowPin] = useState(false);

  const isPinValid = pin.length === 4 && /^\d{4}$/.test(pin);
  const isConfirmPinValid = confirmPin.length === 4 && /^\d{4}$/.test(confirmPin);
  const pinsMatch = pin === confirmPin && pin.length === 4;

  useEffect(() => {
    // Auto-focus input when step changes
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  }, [currentStep]);

  const makeApiRequest = async (endpoint, options = {}) => {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers: {
          'Authorization': `Bearer ${userToken}`,
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      return data;
    } catch (error) {
      console.error(`API Error for ${endpoint}:`, error);
      throw error;
    }
  };

  const isWeakPin = (pinValue) => {
    const weakPins = ['0000', '1234', '1111', '2222', '3333', '4444', '5555', '6666', '7777', '8888', '9999'];
    return weakPins.includes(pinValue);
  };

  const handleCreatePin = () => {
    if (!isPinValid) {
      setError('PIN must be exactly 4 digits');
      return;
    }

    if (isWeakPin(pin)) {
      setError('Please choose a stronger PIN. Avoid sequential numbers or repeated digits.');
      return;
    }

    setError('');
    setCurrentStep(2);
  };

  const handleConfirmPin = async () => {
    if (!isConfirmPinValid) {
      setError('Please enter all 4 digits');
      return;
    }

    if (!pinsMatch) {
      setError('PINs do not match. Please try again.');
      setConfirmPin('');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      console.log('🔄 Setting up PIN...');
      
      const response = await makeApiRequest('/auth/setup-pin', {
        method: 'POST',
        body: JSON.stringify({
          pin: pin,
          confirmPin: confirmPin,
        }),
      });

      if (response.success) {
        console.log('✅ PIN setup successful');
        
        // ✅ FIXED: Use SecureStore with consistent key
        await storage.setItem('isPinSetup', 'true');
        await storage.setItem(TOKEN_KEY, userToken);
        
        console.log('💾 Token and PIN status saved to SecureStore');
        
        // Verify token was saved
        const verifyToken = await storage.getItem(TOKEN_KEY);
        console.log('🔍 Token verification:', verifyToken ? 'CONFIRMED ✅' : 'FAILED ❌');
        
        if (!verifyToken) {
          throw new Error('Token save verification failed');
        }

        router.replace('/dashboard');

        setTimeout(() => {
          Alert.alert(
            'Success!',
            'Your transaction PIN has been set up successfully.',
            [{ text: 'OK' }]
          );
        }, 500);
      }
    } catch (error) {
      console.error('❌ PIN setup error:', error);

      if (error.message.includes('already set')) {
        setError('PIN has already been set up for this account.');
      } else if (error.message.includes('Invalid')) {
        setError('Invalid PIN format. Please try again.');
      } else if (error.message.includes('Token save verification failed')) {
        setError('Failed to save authentication. Please try logging in again.');
      } else {
        setError('Failed to set up PIN. Please check your connection and try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBackToCreatePin = () => {
    setCurrentStep(1);
    setConfirmPin('');
    setError('');
  };

  const handlePinChange = (text) => {
    const numericText = text.replace(/\D/g, '').substring(0, 4);
    
    if (currentStep === 1) {
      setPin(numericText);
    } else {
      setConfirmPin(numericText);
    }
    
    setError('');
  };

  const getCurrentPin = () => currentStep === 1 ? pin : confirmPin;

  const renderPinDots = () => {
    const currentPin = getCurrentPin();
    
    return (
      <View style={styles.pinDotsContainer}>
        {[0, 1, 2, 3].map((index) => (
          <View
            key={index}
            style={[
              styles.pinDot,
              currentPin.length > index && styles.pinDotFilled,
              error && styles.pinDotError
            ]}
          />
        ))}
      </View>
    );
  };

  const getStatusMessage = () => {
    if (error) return { text: error, type: 'error' };
    
    if (currentStep === 1) {
      if (pin.length === 0) return { text: 'Enter a 4-digit PIN to secure your transactions', type: 'info' };
      if (pin.length < 4) return { text: `${4 - pin.length} more digits needed`, type: 'info' };
      if (isWeakPin(pin)) return { text: 'Consider a stronger PIN for better security', type: 'warning' };
      return { text: 'PIN looks good! Tap Continue to proceed', type: 'success' };
    } else {
      if (confirmPin.length === 0) return { text: 'Re-enter the same 4-digit PIN', type: 'info' };
      if (confirmPin.length < 4) return { text: `${4 - confirmPin.length} more digits needed`, type: 'info' };
      if (pinsMatch) return { text: 'Perfect! PINs match', type: 'success' };
      if (confirmPin.length === 4) return { text: 'PINs do not match. Please try again', type: 'error' };
      return { text: 'Keep typing...', type: 'info' };
    }
  };

  const statusMessage = getStatusMessage();

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardAvoidingView}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Setup Transaction PIN</Text>
            <Text style={styles.headerSubtitle}>
              Step {currentStep} of 2
            </Text>
          </View>
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${(currentStep / 2) * 100}%` }]} />
            </View>
          </View>
        </View>

        <ScrollView 
          style={styles.content}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Welcome Card */}
          <View style={styles.welcomeCard}>
            <View style={styles.iconContainer}>
              <Ionicons name="shield-checkmark" size={32} color="#ff2b2b" />
            </View>
            <Text style={styles.welcomeTitle}>Secure Your Account</Text>
            <Text style={styles.welcomeText}>
              {userName ? `Welcome ${userName}! ` : ''}Create a 4-digit PIN to protect your transactions and wallet operations.
            </Text>
          </View>

          {/* PIN Input Card */}
          <View style={styles.pinCard}>
            <Text style={styles.pinTitle}>
              {currentStep === 1 ? 'Create Your PIN' : 'Confirm Your PIN'}
            </Text>
            
            <View style={styles.pinInputContainer}>
              <View style={styles.inputWrapper}>
                <TextInput
                  ref={inputRef}
                  style={styles.pinInput}
                  value={getCurrentPin()}
                  onChangeText={handlePinChange}
                  keyboardType="numeric"
                  secureTextEntry={!showPin}
                  placeholder="Enter PIN"
                  maxLength={4}
                  autoFocus={true}
                  accessibilityLabel={`${currentStep === 1 ? 'Create' : 'Confirm'} PIN input`}
                />
                <TouchableOpacity
                  style={styles.visibilityButton}
                  onPress={() => setShowPin(!showPin)}
                  accessibilityLabel={showPin ? 'Hide PIN' : 'Show PIN'}
                >
                  <Ionicons
                    name={showPin ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color="#666"
                  />
                </TouchableOpacity>
              </View>
            </View>

            {renderPinDots()}

            {/* Status Message */}
            <View style={styles.statusContainer}>
              <Text style={[
                styles.statusText,
                statusMessage.type === 'error' && styles.statusError,
                statusMessage.type === 'success' && styles.statusSuccess,
                statusMessage.type === 'warning' && styles.statusWarning,
                statusMessage.type === 'info' && styles.statusInfo,
              ]}>
                {statusMessage.text}
              </Text>
            </View>
          </View>

          {/* Security Tips */}
          {currentStep === 1 && (
            <View style={styles.tipsCard}>
              <Text style={styles.tipsTitle}>Security Tips</Text>
              <View style={styles.tipItem}>
                <Ionicons name="checkmark-circle" size={16} color="#28a745" />
                <Text style={styles.tipText}>Use a unique PIN you can remember</Text>
              </View>
              <View style={styles.tipItem}>
                <Ionicons name="checkmark-circle" size={16} color="#28a745" />
                <Text style={styles.tipText}>Avoid sequential numbers (1234)</Text>
              </View>
              <View style={styles.tipItem}>
                <Ionicons name="checkmark-circle" size={16} color="#28a745" />
                <Text style={styles.tipText}>Don't use repeated digits (1111)</Text>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Action Buttons */}
        <View style={styles.actionSection}>
          {currentStep === 1 ? (
            <TouchableOpacity
              style={[styles.primaryButton, !isPinValid && styles.primaryButtonDisabled]}
              disabled={!isPinValid}
              onPress={handleCreatePin}
              accessibilityLabel="Continue to confirm PIN"
            >
              <Text style={styles.primaryButtonText}>Continue</Text>
            </TouchableOpacity>
          ) : (
            <>
              <TouchableOpacity
                style={[
                  styles.primaryButton, 
                  (!pinsMatch || isSubmitting) && styles.primaryButtonDisabled
                ]}
                disabled={!pinsMatch || isSubmitting}
                onPress={handleConfirmPin}
                accessibilityLabel="Complete PIN setup"
              >
                {isSubmitting ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color="#fff" />
                    <Text style={[styles.primaryButtonText, styles.loadingText]}>
                      Setting up PIN...
                    </Text>
                  </View>
                ) : (
                  <Text style={styles.primaryButtonText}>Complete Setup</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={handleBackToCreatePin}
                disabled={isSubmitting}
                accessibilityLabel="Go back to create PIN"
              >
                <Ionicons name="arrow-back" size={16} color="#666" />
                <Text style={styles.secondaryButtonText}>Back to Create PIN</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  keyboardAvoidingView: {
    flex: 1,
  },

  // Header
  header: {
    backgroundColor: '#fff',
    paddingTop: Platform.OS === 'ios' ? 0 : 20,
    paddingBottom: 16,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerContent: {
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  progressContainer: {
    width: '100%',
  },
  progressBar: {
    height: 4,
    backgroundColor: '#e5e7eb',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#ff2b2b',
    borderRadius: 2,
  },

  // Content
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: 24,
    paddingHorizontal: 24,
  },

  // Welcome Card
  welcomeCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#fff5f5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  welcomeTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  welcomeText: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
    textAlign: 'center',
  },

  // PIN Card
  pinCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  pinTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 24,
    textAlign: 'center',
  },

  // PIN Input
  pinInputContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 24,
  },
  inputWrapper: {
    position: 'relative',
    width: 200,
  },
  pinInput: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
    color: '#1f2937',
    width: '100%',
  },
  visibilityButton: {
    position: 'absolute',
    right: 16,
    top: 18,
    padding: 4,
  },

  // PIN Dots
  pinDotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 20,
  },
  pinDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#e5e7eb',
  },
  pinDotFilled: {
    backgroundColor: '#ff2b2b',
  },
  pinDotError: {
    backgroundColor: '#dc2626',
  },

  // Status Messages
  statusContainer: {
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  statusText: {
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
    lineHeight: 20,
  },
  statusError: {
    color: '#dc2626',
  },
  statusSuccess: {
    color: '#16a34a',
  },
  statusWarning: {
    color: '#d97706',
  },
  statusInfo: {
    color: '#6b7280',
  },

  // Tips Card
  tipsCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  tipText: {
    fontSize: 14,
    color: '#6b7280',
    marginLeft: 8,
    flex: 1,
  },

  // Action Section
  actionSection: {
    padding: 24,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  primaryButton: {
    backgroundColor: '#ff2b2b',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#ff2b2b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonDisabled: {
    backgroundColor: '#d1d5db',
    shadowOpacity: 0,
    elevation: 0,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
  },
  secondaryButtonText: {
    color: '#6b7280',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 6,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loadingText: {
    marginLeft: 8,
  },
});