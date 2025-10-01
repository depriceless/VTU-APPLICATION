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
} from 'react-native';
import { useRouter } from 'expo-router';
import axios from 'axios';
import { AuthContext } from '../../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
// NEW CODE - Add this:
import Constants from 'expo-constants';

const API_BASE_URL = Platform.OS === 'web' 
  ? Constants.expoConfig?.extra?.EXPO_PUBLIC_API_URL_WEB 
  : Constants.expoConfig?.extra?.EXPO_PUBLIC_API_URL;

// Add this console log to verify the URL
console.log('🔍 API URL being used:', API_BASE_URL);

export default function LoginScreen() {
  const router = useRouter();
  const { login, user } = useContext(AuthContext);

  const emailRef = useRef(null);
  const passwordRef = useRef(null);

  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [isEmailFocused, setIsEmailFocused] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);

  useEffect(() => {
    console.log('Current user in context:', user);
    setTimeout(() => {
      emailRef.current?.focus();
    }, 100);
  }, [user]);

  const validateEmailOrPhone = (value) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^[\+]?[\d\s\-\(\)]{7,20}$/;

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

  const handleLogin = async () => {
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

    setLoading(true);

    try {
      console.log('Attempting login with URL:', `${API_BASE_URL}/api/auth/login`);
      console.log('Login data:', { emailOrPhone: emailOrPhone.trim() });

      // Enhanced axios configuration with better error handling
      const response = await axios({
        method: 'post',
        url: `${API_BASE_URL}/api/auth/login`,
        data: { 
          emailOrPhone: emailOrPhone.trim(), 
          password: password.trim() 
        },
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        timeout: 15000, // Increased timeout
        validateStatus: function (status) {
          return status < 500; // Resolve only if status is less than 500
        }
      });

      console.log('Login response status:', response.status);
      console.log('Login response data:', response.data);

      // Handle successful response
      if (response.status === 200 || response.status === 201) {
        if (response.data.token) {
          console.log('Login successful, token received');
          await login(response.data.token);
          setSuccessMessage('Login successful! Redirecting...');
          setTimeout(() => {
            router.replace('/dashboard');
          }, 1000);
        } else if (response.data.success && response.data.data?.token) {
          // Alternative token structure
          console.log('Login successful, token in data object');
          await login(response.data.data.token);
          setSuccessMessage('Login successful! Redirecting...');
          setTimeout(() => {
            router.replace('/dashboard');
          }, 1000);
        } else {
          console.log('No token in response:', response.data);
          setErrorMessage('Login failed. No authentication token received.');
        }
      } else if (response.status === 401) {
        setErrorMessage('Invalid email/phone or password.');
      } else if (response.status === 400) {
        setErrorMessage(response.data.message || 'Invalid login credentials.');
      } else {
        setErrorMessage(response.data.message || 'Login failed. Please try again.');
      }

    } catch (error) {
      console.error('Login error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        config: {
          url: error.config?.url,
          method: error.config?.method,
          timeout: error.config?.timeout
        }
      });

      // Better error handling
      if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        setErrorMessage('Request timed out. Please check your internet connection and try again.');
      } else if (error.response) {
        // Server responded with error status
        const status = error.response.status;
        const data = error.response.data;
        
        if (status === 401 || status === 400) {
          setErrorMessage(data.message || 'Invalid email/phone or password.');
        } else if (status === 422) {
          setErrorMessage(data.message || 'Invalid input data provided.');
        } else if (status === 429) {
          setErrorMessage('Too many login attempts. Please try again later.');
        } else if (status >= 500) {
          setErrorMessage('Server error. Please try again later.');
        } else {
          setErrorMessage(data.message || 'Login failed. Please try again.');
        }
      } else if (error.request) {
        // Request made but no response
        console.error('No response received:', error.request);
        setErrorMessage('Cannot reach the server. Please check your internet connection.');
      } else {
        // Something else happened
        console.error('Request setup error:', error.message);
        setErrorMessage('An unexpected error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
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
          {/* Header Section */}
          <View style={styles.headerSection}>
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>Sign in to your account</Text>
          </View>

          {/* Form Section */}
          <View style={styles.formSection}>
            {/* Status Messages */}
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

            {/* Email/Phone Input */}
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

            {/* Password Input */}
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

            {/* Forgot Password Link */}
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

          {/* Action Section */}
          <View style={styles.actionSection}>
            <TouchableOpacity
              style={[styles.loginButton, loading && styles.loginButtonDisabled]}
              onPress={handleLogin}
              disabled={loading}
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

            {/* Signup section */}
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
  
  // Header Section
  headerSection: {
    alignItems: 'center',
    marginTop: 110,
    marginBottom: 30,
  },
  title: { 
    fontSize: 32, 
    fontWeight: 'bold', 
    color: '#ff2b2b', 
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: { 
    fontSize: 16, 
    color: '#555', 
    fontWeight: '400',
  },

  // Form Section
  formSection: {
    marginBottom: 170,
  },
  messageContainer: {
    marginBottom: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
  errorText: {
    color: '#dc2626',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
  },
  successText: {
    color: '#16a34a',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
  },

  // Input Groups
  inputGroup: {
    marginBottom: 30,
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
  
  // Password Input
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

  // Forgot Password
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

  // Action Section
  actionSection: {
    marginBottom: 20,
  },
  loginButton: { 
    backgroundColor: '#ff2b2b', 
    paddingVertical: 18, 
    borderRadius: 12, 
    alignItems: 'center',
    marginBottom: 24,
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

  // Footer Section
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