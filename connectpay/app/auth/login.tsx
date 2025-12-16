import React, { useState, useContext, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
  Image,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import apiClient from '../../src/config/api';
import { AuthContext } from '../../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

const storage = {
  async getItem(key) {
    if (Platform.OS === 'web') {
      return localStorage.getItem(key);
    } else {
      return await SecureStore.getItemAsync(key);
    }
  },
  
  async setItem(key, value) {
    if (Platform.OS === 'web') {
      localStorage.setItem(key, value);
    } else {
      await SecureStore.setItemAsync(key, value);
    }
  },
  
  async removeItem(key) {
    if (Platform.OS === 'web') {
      localStorage.removeItem(key);
    } else {
      await SecureStore.deleteItemAsync(key);
    }
  }
};

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useContext(AuthContext);

  const emailRef = useRef(null);
  const passwordRef = useRef(null);

  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false); // ✅ For Sign In button only
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [isEmailFocused, setIsEmailFocused] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  
  // Biometric states
  const [isBiometricSupported, setIsBiometricSupported] = useState(false);
  const [hasBiometricCredentials, setHasBiometricCredentials] = useState(false);
  const [isBiometricLoading, setIsBiometricLoading] = useState(false); // ✅ For Biometric button only

  useEffect(() => {
    setTimeout(() => {
      emailRef.current?.focus();
    }, 100);
    
    checkBiometricSupport();
  }, []);

  const checkBiometricSupport = async () => {
    try {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      setIsBiometricSupported(compatible);
      
      if (compatible) {
        const enrolled = await LocalAuthentication.isEnrolledAsync();
        if (enrolled) {
          const savedCredentials = await storage.getItem('biometric_credentials');
          setHasBiometricCredentials(!!savedCredentials);
        }
      }
    } catch (error) {
      console.error('Biometric check error:', error);
    }
  };

  const saveBiometricCredentials = async (emailOrPhone, password) => {
    try {
      const credentials = JSON.stringify({ emailOrPhone, password });
      await storage.setItem('biometric_credentials', credentials);
      setHasBiometricCredentials(true);
      Alert.alert('Success', 'Biometric login enabled!');
    } catch (error) {
      console.error('Error saving biometric credentials:', error);
      Alert.alert('Error', 'Failed to enable biometric login.');
    }
  };

  // ✅ FIXED: Biometric authentication - only sets isBiometricLoading
  const handleBiometricAuth = async () => {
    if (!isBiometricSupported || isBiometricLoading || loading) {
      return;
    }

    setIsBiometricLoading(true); // ✅ Only biometric loading
    
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to login to ConnectPay',
        fallbackLabel: 'Use password',
        disableDeviceFallback: false,
      });

      if (result.success) {
        const savedCredentials = await storage.getItem('biometric_credentials');
        if (savedCredentials) {
          const { emailOrPhone, password } = JSON.parse(savedCredentials);
          await handleLoginWithCredentials(emailOrPhone, password, true); // ✅ Pass flag for biometric
        }
      } else {
        if (result.error !== 'user_cancel') {
          Alert.alert('Authentication Failed', 'Please try again or use password.');
        }
      }
    } catch (error) {
      console.error('Biometric auth error:', error);
      Alert.alert('Error', 'Biometric authentication failed.');
    } finally {
      setIsBiometricLoading(false); // ✅ Only biometric loading
    }
  };

  const enableBiometricLogin = () => {
    Alert.alert(
      'Enable Biometric Login?',
      'Do you want to enable fingerprint/face ID for faster login?',
      [
        {
          text: 'Not Now',
          style: 'cancel',
        },
        {
          text: 'Enable',
          onPress: () => saveBiometricCredentials(emailOrPhone, password),
        },
      ]
    );
  };

  const validateEmailOrPhone = (value) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!value.trim()) {
      return 'Email or phone is required';
    }

    const cleanedValue = value.replace(/[\s\-\(\)]/g, '');

    if (emailRegex.test(value)) {
      return '';
    }

    if (/^[\+]?\d{7,15}$/.test(cleanedValue)) {
      return '';
    }

    return 'Please enter a valid email or phone number';
  };

  const validatePassword = (value) => {
    if (!value.trim()) {
      return 'Password is required';
    }
    if (value.length < 6) {
      return 'Password must be at least 6 characters';
    }
    return '';
  };

  const handleEmailChange = (value) => {
    setEmailOrPhone(value);
    setEmailError('');
    setErrorMessage('');
  };

  const handlePasswordChange = (value) => {
    setPassword(value);
    setPasswordError('');
    setErrorMessage('');
  };

  const handleEmailBlur = () => {
    setIsEmailFocused(false);
    const error = validateEmailOrPhone(emailOrPhone);
    setEmailError(error);
  };

  const handlePasswordBlur = () => {
    setIsPasswordFocused(false);
    const error = validatePassword(password);
    setPasswordError(error);
  };

  // ✅ FIXED: Main login handler - only sets loading (not isBiometricLoading)
  const handleLogin = async () => {
    if (loading || isBiometricLoading) return;

    setErrorMessage('');
    setSuccessMessage('');

    const emailValidationError = validateEmailOrPhone(emailOrPhone);
    const passwordValidationError = validatePassword(password);

    setEmailError(emailValidationError);
    setPasswordError(passwordValidationError);

    if (emailValidationError || passwordValidationError) {
      return;
    }

    if (!emailOrPhone.trim() || !password.trim()) {
      setErrorMessage('Phone/Email and Password are required.');
      return;
    }

    setLoading(true); // ✅ Only sign in loading

    try {
      console.log('🔄 Attempting login...');

      const response = await apiClient.post('/auth/login', {
        emailOrPhone: emailOrPhone.trim(),
        password: password.trim(),
      });

      console.log('✅ Login response received:', response.status);

      if (response.status === 200 || response.status === 201) {
        const token = response.data.token || response.data.data?.token;
        
        if (token) {
          console.log('✅ Login successful, token received');
          
          await storage.setItem('userToken', token);
          console.log('💾 Token saved to SecureStore');
          
          const verifyToken = await storage.getItem('userToken');
          console.log('🔍 Token verification:', verifyToken ? 'CONFIRMED ✅' : 'FAILED ❌');
          
          if (!verifyToken) {
            throw new Error('Token save verification failed');
          }
          
          await login(token);
          console.log('✅ Context login completed');
          
          if (!hasBiometricCredentials && isBiometricSupported) {
            setTimeout(() => {
              enableBiometricLogin();
            }, 1000);
          }
          
          setSuccessMessage('Login successful! Redirecting...');
          
          setTimeout(() => {
            console.log('🚀 Navigating to dashboard');
            router.replace('/dashboard');
          }, 800);
        } else {
          console.log('❌ No token in response');
          setErrorMessage('Login failed. No authentication token received.');
        }
      }

    } catch (error) {
      console.error('❌ Login error:', error);

      if (error.response) {
        const status = error.response.status;
        const message = error.response.data?.message;
        
        if (status === 401 || status === 400) {
          setErrorMessage(message || 'Invalid email/phone or password.');
        } else if (status === 422) {
          setErrorMessage(message || 'Invalid input data provided.');
        } else if (status === 429) {
          setErrorMessage('Too many login attempts. Please try again later.');
        } else if (status >= 500) {
          setErrorMessage('Server error. Please try again later.');
        } else {
          setErrorMessage(message || 'Login failed. Please try again.');
        }
      } else if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        setErrorMessage('Request timed out. Please check your internet connection.');
      } else if (error.request) {
        setErrorMessage('Cannot reach the server. Please check your internet connection.');
      } else {
        setErrorMessage(error.message || 'An unexpected error occurred. Please try again.');
      }
    } finally {
      setLoading(false); // ✅ Only sign in loading
    }
  };

  // ✅ FIXED: Biometric login handler - uses isBiometricLoading when called from biometric
  const handleLoginWithCredentials = async (emailOrPhoneValue, passwordValue, isBiometric = false) => {
    if (loading || isBiometricLoading) return;

    setErrorMessage('');
    setSuccessMessage('');

    const emailValidationError = validateEmailOrPhone(emailOrPhoneValue);
    const passwordValidationError = validatePassword(passwordValue);

    if (emailValidationError || passwordValidationError) {
      return;
    }

    if (!emailOrPhoneValue.trim() || !passwordValue.trim()) {
      setErrorMessage('Phone/Email and Password are required.');
      return;
    }

    // ✅ Already loading from biometric button, don't set loading again
    if (!isBiometric) {
      setLoading(true);
    }

    try {
      console.log('🔄 Attempting biometric login...');

      const response = await apiClient.post('/auth/login', {
        emailOrPhone: emailOrPhoneValue.trim(),
        password: passwordValue.trim(),
      });

      console.log('✅ Biometric login response received:', response.status);

      if (response.status === 200 || response.status === 201) {
        const token = response.data.token || response.data.data?.token;
        
        if (token) {
          console.log('✅ Biometric login successful');
          
          await storage.setItem('userToken', token);
          console.log('💾 Token saved to SecureStore');
          
          const verifyToken = await storage.getItem('userToken');
          console.log('🔍 Token verification:', verifyToken ? 'CONFIRMED ✅' : 'FAILED ❌');
          
          if (!verifyToken) {
            throw new Error('Token save verification failed');
          }
          
          await login(token);
          console.log('✅ Context updated');
          
          setEmailOrPhone(emailOrPhoneValue);
          setPassword(passwordValue);
          
          setSuccessMessage('Login successful! Redirecting...');
          setTimeout(() => {
            console.log('🚀 Navigating to dashboard');
            router.replace('/dashboard');
          }, 800);
        } else {
          console.log('❌ No token in response');
          setErrorMessage('Login failed. No authentication token received.');
        }
      }

    } catch (error) {
      console.error('❌ Biometric login error:', error);

      if (error.response) {
        const status = error.response.status;
        const message = error.response.data?.message;
        
        if (status === 401 || status === 400) {
          setErrorMessage(message || 'Invalid email/phone or password.');
        } else if (status === 422) {
          setErrorMessage(message || 'Invalid input data provided.');
        } else if (status === 429) {
          setErrorMessage('Too many login attempts. Please try again later.');
        } else if (status >= 500) {
          setErrorMessage('Server error. Please try again later.');
        } else {
          setErrorMessage(message || 'Login failed. Please try again.');
        }
      } else if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        setErrorMessage('Request timed out. Please check your internet connection.');
      } else if (error.request) {
        setErrorMessage('Cannot reach the server. Please check your internet connection.');
      } else {
        setErrorMessage(error.message || 'An unexpected error occurred. Please try again.');
      }
    } finally {
      if (!isBiometric) {
        setLoading(false);
      }
      // ✅ isBiometricLoading is already handled in handleBiometricAuth
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardAvoidingView}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.headerSection}>
            <View style={styles.logoContainer}>
              <Image 
                source={require('../../assets/images/logo.png')}
                style={styles.logoImage}
                resizeMode="contain"
              />
            </View>
            
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>Sign in to your account</Text>
          </View>

          <View style={styles.formSection}>
            {errorMessage ? (
              <View style={styles.messageContainer}>
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            ) : null}
            
            {successMessage ? (
              <View style={styles.messageContainer}>
                <Text style={styles.successText}>{successMessage}</Text>
              </View>
            ) : null}

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email or Phone Number</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  ref={emailRef}
                  style={[
                    styles.input,
                    (errorMessage || emailError) ? styles.inputError : null,
                    isEmailFocused ? styles.inputFocused : null
                  ]}
                  placeholder="Enter your email or phone number"
                  placeholderTextColor="#999"
                  value={emailOrPhone}
                  onChangeText={handleEmailChange}
                  onFocus={() => setIsEmailFocused(true)}
                  onBlur={handleEmailBlur}
                  onSubmitEditing={() => passwordRef.current?.focus()}
                  autoCapitalize="none"
                  keyboardType="default"
                  returnKeyType="next"
                  accessibilityLabel="Email or phone number input"
                />
              </View>
              {emailError ? (
                <Text style={styles.fieldErrorText}>{emailError}</Text>
              ) : null}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Password</Text>
              <View style={styles.inputWrapper}>
                <View style={styles.passwordContainer}>
                  <TextInput
                    ref={passwordRef}
                    style={[
                      styles.passwordInput,
                      (errorMessage || passwordError) ? styles.inputError : null,
                      isPasswordFocused ? styles.inputFocused : null
                    ]}
                    placeholder="Enter your password"
                    placeholderTextColor="#999"
                    secureTextEntry={!showPassword}
                    value={password}
                    onChangeText={handlePasswordChange}
                    onFocus={() => setIsPasswordFocused(true)}
                    onBlur={handlePasswordBlur}
                    onSubmitEditing={handleLogin}
                    autoCapitalize="none"
                    returnKeyType="done"
                    accessibilityLabel="Password input"
                  />
                  <TouchableOpacity
                    style={styles.eyeIconButton}
                    onPress={togglePasswordVisibility}
                    activeOpacity={0.7}
                    accessibilityLabel={showPassword ? "Hide password" : "Show password"}
                  >
                    <Ionicons
                      name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={22}
                      color="#666"
                    />
                  </TouchableOpacity>
                </View>
              </View>
              {passwordError ? (
                <Text style={styles.fieldErrorText}>{passwordError}</Text>
              ) : null}
            </View>

            <View style={styles.forgotPasswordContainer}>
              <TouchableOpacity
                onPress={() => router.push('/auth/forgot-password')}
                style={styles.forgotPasswordButton}
                accessibilityLabel="Forgot password link"
              >
                <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.actionSection}>
            {/* ✅ Sign In Button - only shows loading when signing in */}
            <TouchableOpacity
              style={[styles.loginButton, (loading || isBiometricLoading) && styles.loginButtonDisabled]}
              onPress={handleLogin}
              disabled={loading || isBiometricLoading}
              accessibilityLabel="Login button"
            >
              {loading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator color="#fff" size="small" />
                  <Text style={[styles.loginButtonText, styles.loadingText]}>
                    Signing in...
                  </Text>
                </View>
              ) : (
                <Text style={styles.loginButtonText}>Sign In</Text>
              )}
            </TouchableOpacity>

            {/* ✅ Biometric Button - only shows loading when authenticating biometrically */}
            {isBiometricSupported && hasBiometricCredentials && (
              <View style={styles.biometricSection}>
                <TouchableOpacity
                  style={[styles.biometricButton, (isBiometricLoading || loading) && styles.biometricButtonDisabled]}
                  onPress={handleBiometricAuth}
                  disabled={isBiometricLoading || loading}
                >
                  {isBiometricLoading ? (
                    <View style={styles.loadingContainer}>
                      <ActivityIndicator color="#ff2b2b" size="small" />
                      <Text style={[styles.biometricText, styles.loadingText]}>
                        Authenticating...
                      </Text>
                    </View>
                  ) : (
                    <>
                      <Ionicons name="finger-print" size={20} color="#ff2b2b" />
                      <Text style={styles.biometricText}>Sign in with Biometric</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.signupContainer}>
              <Text style={styles.signupText}>Don't have an account?</Text>
              <TouchableOpacity 
                onPress={() => router.push('/auth/signup')}
                style={styles.signupButton}
                accessibilityLabel="Sign up link"
              >
                <Text style={styles.signupLinkText}>Create Account</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#f8f9fa' 
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  headerSection: {
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  logoContainer: {
    marginBottom: -65,
  },
  logoImage: {
    width: 200,
    height: 200,
  },
  title: { 
    fontSize: 28,
    fontWeight: 'bold', 
    color: '#ff2b2b', 
    marginBottom: 17,
    letterSpacing: -0.5,
  },
  subtitle: { 
    fontSize: 16, 
    color: '#555', 
    fontWeight: '400',
  },
  formSection: {
    marginBottom: 50,
  },
  inputGroup: {
    marginBottom: 40,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
    marginLeft: 4,
  },
  inputWrapper: {
    position: 'relative',
  },
  input: {
    backgroundColor: '#ffffff',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    fontSize: 16,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    fontWeight: '400',
    color: '#1f2937',
  },
  inputFocused: {
    borderColor: '#ff2b2b',
    backgroundColor: '#fffbfb',
  },
  inputError: {
    borderColor: '#dc2626',
    backgroundColor: '#fef2f2',
  },
  passwordContainer: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
  },
  passwordInput: {
    backgroundColor: '#ffffff',
    paddingVertical: 16,
    paddingHorizontal: 16,
    paddingRight: 52,
    borderRadius: 12,
    fontSize: 16,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    fontWeight: '400',
    color: '#1f2937',
    flex: 1,
  },
  eyeIconButton: {
    position: 'absolute',
    right: 16,
    padding: 4,
  },
  fieldErrorText: {
    color: '#dc2626',
    fontSize: 13,
    marginTop: 6,
    marginLeft: 4,
    fontWeight: '500',
  },
  messageContainer: {
    marginBottom: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    color: '#dc2626',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
    backgroundColor: '#fef2f2',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    width: '100%',
  },
  successText: {
    color: '#16a34a',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    width: '100%',
  },
  forgotPasswordContainer: {
    alignItems: 'flex-end',
    marginBottom: 6,
  },
  forgotPasswordButton: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  forgotPasswordText: { 
    color: '#ff2b2b', 
    fontWeight: '600',
    fontSize: 14,
  },
  actionSection: {
    marginBottom: 20,
  },
  loginButton: { 
    backgroundColor: '#ff2b2b', 
    paddingVertical: 18, 
    borderRadius: 12, 
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#ff2b2b',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  loginButtonDisabled: { 
    backgroundColor: '#fca5a5',
    shadowOpacity: 0,
    elevation: 0,
  },
  loginButtonText: { 
    color: '#ffffff', 
    fontWeight: '700', 
    fontSize: 16,
    letterSpacing: 0.5,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loadingText: {
    marginLeft: 12,
  },
  biometricSection: {
    marginBottom: 16,
  },
  biometricButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: '#ff2b2b',
    borderRadius: 12,
    backgroundColor: 'transparent',
  },
  biometricButtonDisabled: {
    opacity: 0.6,
  },
  biometricText: {
    color: '#ff2b2b',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  signupContainer: { 
    flexDirection: 'row', 
    alignItems: 'center',
    justifyContent: 'center',
  },
  signupText: { 
    color: '#6b7280', 
    fontSize: 15,
    fontWeight: '400',
  },
  signupButton: {
    marginLeft: 4,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  signupLinkText: { 
    color: '#ff2b2b', 
    fontWeight: '600', 
    fontSize: 15,
  },
});