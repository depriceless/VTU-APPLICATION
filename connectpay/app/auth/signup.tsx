import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';

const API_BASE_URL = Platform.OS === 'web' 
  ? process.env.EXPO_PUBLIC_API_URL_WEB 
  : process.env.EXPO_PUBLIC_API_URL;

export default function SignupScreen() {
  const router = useRouter();
  
  // Refs for input navigation
  const fullNameRef = useRef(null);
  const usernameRef = useRef(null);
  const phoneRef = useRef(null);
  const emailRef = useRef(null);
  const passwordRef = useRef(null);
  const confirmPasswordRef = useRef(null);

  // Form state
  const [formData, setFormData] = useState({
    fullName: '',
    username: '',
    phone: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [focusedField, setFocusedField] = useState('');

  const updateFormData = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear field-specific errors when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
    if (message) setMessage(null);
  };

  const validateField = (field, value) => {
    switch (field) {
      case 'fullName':
        return !value.trim() ? 'Full name is required' : 
               value.trim().length < 2 ? 'Full name must be at least 2 characters' : '';
      case 'username':
        return !value.trim() ? 'Username is required' : 
               value.length < 3 ? 'Username must be at least 3 characters' :
               !/^[a-zA-Z0-9_]+$/.test(value) ? 'Username can only contain letters, numbers, and underscores' : '';
      case 'phone':
        return !value.trim() ? 'Phone number is required' : 
               !/^\+?[\d\s\-\(\)]{10,}$/.test(value.replace(/\s/g, '')) ? 'Please enter a valid phone number' : '';
      case 'email':
        return !value.trim() ? 'Email is required' : 
               !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? 'Please enter a valid email address' : '';
      case 'password':
        return !value ? 'Password is required' : 
               value.length < 8 ? 'Password must be at least 8 characters' :
               !/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(value) ? 'Password must contain uppercase, lowercase, and number' : '';
      case 'confirmPassword':
        return !value ? 'Please confirm your password' : 
               value !== formData.password ? 'Passwords do not match' : '';
      default:
        return '';
    }
  };

  const validateForm = () => {
    const newErrors = {};
    Object.keys(formData).forEach(field => {
      const error = validateField(field, formData[field]);
      if (error) newErrors[field] = error;
    });
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignup = async () => {
    if (!validateForm()) return;
    
    setLoading(true);
    setMessage(null);

    const data = {
      phone: formData.phone.trim(),
      name: formData.fullName.trim(),
      username: formData.username.trim(),
      email: formData.email.trim(),
      password: formData.password.trim(),
    };

    try {
      const response = await axios.post(`${API_BASE_URL}/api/auth/register`, data, {
        timeout: 10000,
        headers: { 'Content-Type': 'application/json' },
      });

      const { token, user } = response.data;
      
      setMessage({ text: 'Account created successfully! Setting up your profile...', type: 'success' });

      setTimeout(() => {
        router.push({
          pathname: './pin-setup',
          params: { 
            userToken: token,
            userName: user.name 
          }
        });
      }, 1500);

    } catch (error) {
      console.error('Signup error:', error);
      
      if (error.response?.status === 409) {
        setMessage({ text: 'Email or username already exists. Please try different credentials.', type: 'error' });
      } else if (error.response?.data?.message) {
        setMessage({ text: error.response.data.message, type: 'error' });
      } else {
        setMessage({ text: 'Unable to create account. Please check your connection and try again.', type: 'error' });
      }
    } finally {
      setLoading(false);
    }
  };

  const renderInput = ({ field, placeholder, keyboardType = 'default', secureTextEntry = false, showPasswordToggle = false, nextField, autoCapitalize = 'words' }) => (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>{placeholder}</Text>
      <View style={styles.inputWrapper}>
        <TextInput
          ref={field === 'fullName' ? fullNameRef :
               field === 'username' ? usernameRef :
               field === 'phone' ? phoneRef :
               field === 'email' ? emailRef :
               field === 'password' ? passwordRef :
               confirmPasswordRef}
          style={[
            styles.input,
            errors[field] && styles.inputError,
            focusedField === field && styles.inputFocused,
          ]}
          placeholder={`Enter your ${placeholder.toLowerCase()}`}
          placeholderTextColor="#999"
          value={formData[field]}
          onChangeText={(value) => updateFormData(field, value)}
          onFocus={() => setFocusedField(field)}
          onBlur={() => {
            setFocusedField('');
            const error = validateField(field, formData[field]);
            if (error) setErrors(prev => ({ ...prev, [field]: error }));
          }}
          onSubmitEditing={() => {
            if (nextField) {
              const refs = { fullName: fullNameRef, username: usernameRef, phone: phoneRef, email: emailRef, password: passwordRef, confirmPassword: confirmPasswordRef };
              refs[nextField]?.current?.focus();
            } else {
              handleSignup();
            }
          }}
          keyboardType={keyboardType}
          secureTextEntry={secureTextEntry && (field === 'password' ? !showPassword : !showConfirmPassword)}
          autoCapitalize={autoCapitalize}
          returnKeyType={nextField ? 'next' : 'done'}
          accessibilityLabel={`${placeholder} input`}
        />
        {showPasswordToggle && (
          <TouchableOpacity
            style={styles.eyeButton}
            onPress={() => field === 'password' ? setShowPassword(!showPassword) : setShowConfirmPassword(!showConfirmPassword)}
            accessibilityLabel={`Toggle ${placeholder.toLowerCase()} visibility`}
          >
            <Ionicons
              name={(field === 'password' ? showPassword : showConfirmPassword) ? 'eye-off-outline' : 'eye-outline'}
              size={22}
              color="#666"
            />
          </TouchableOpacity>
        )}
      </View>
      {errors[field] ? (
        <Text style={styles.fieldError}>{errors[field]}</Text>
      ) : null}
    </View>
  );

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
          {/* Header */}
          <View style={styles.headerSection}>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Join us and start your journey</Text>
          </View>

          {/* Status Message */}
          {message && (
            <View style={[styles.messageContainer, message.type === 'success' ? styles.successContainer : styles.errorContainer]}>
              <Text style={[styles.messageText, message.type === 'success' ? styles.successText : styles.errorText]}>
                {message.text}
              </Text>
            </View>
          )}

          {/* Form */}
          <View style={styles.formSection}>
            {renderInput({ field: 'fullName', placeholder: 'Full Name', nextField: 'username' })}
            {renderInput({ field: 'username', placeholder: 'Username', nextField: 'phone', autoCapitalize: 'none' })}
            {renderInput({ field: 'phone', placeholder: 'Phone Number', keyboardType: 'phone-pad', nextField: 'email', autoCapitalize: 'none' })}
            {renderInput({ field: 'email', placeholder: 'Email Address', keyboardType: 'email-address', nextField: 'password', autoCapitalize: 'none' })}
            {renderInput({ field: 'password', placeholder: 'Password', secureTextEntry: true, showPasswordToggle: true, nextField: 'confirmPassword', autoCapitalize: 'none' })}
            {renderInput({ field: 'confirmPassword', placeholder: 'Confirm Password', secureTextEntry: true, showPasswordToggle: true, autoCapitalize: 'none' })}
          </View>

          {/* Action Section */}
          <View style={styles.actionSection}>
            <TouchableOpacity
              style={[styles.signupButton, loading && styles.signupButtonDisabled]}
              onPress={handleSignup}
              disabled={loading}
              accessibilityLabel="Create account button"
            >
              {loading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator color="#fff" size="small" />
                  <Text style={[styles.signupButtonText, styles.loadingText]}>
                    Creating Account...
                  </Text>
                </View>
              ) : (
                <Text style={styles.signupButtonText}>Create Account</Text>
              )}
            </TouchableOpacity>

            {/* Login Link */}
            <View style={styles.loginContainer}>
              <Text style={styles.loginText}>Already have an account?</Text>
              <TouchableOpacity 
                onPress={() => router.push('./login')}
                style={styles.loginButton}
                accessibilityLabel="Go to login"
              >
                <Text style={styles.loginLinkText}>Sign In</Text>
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
    backgroundColor: '#f8f9fa',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 20,
  },

  // Header
  headerSection: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 32,
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

  // Messages
  messageContainer: {
    marginBottom: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  successContainer: {
    backgroundColor: '#f0f9f4',
    borderColor: '#16a34a',
  },
  errorContainer: {
    backgroundColor: '#fef2f2',
    borderColor: '#dc2626',
  },
  messageText: {
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
  },
  successText: {
    color: '#16a34a',
  },
  errorText: {
    color: '#dc2626',
  },

  // Form
  formSection: {
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
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
  eyeButton: {
    position: 'absolute',
    right: 16,
    top: 16,
    padding: 4,
  },
  fieldError: {
    color: '#dc2626',
    fontSize: 13,
    marginTop: 6,
    marginLeft: 4,
    fontWeight: '500',
  },

  // Actions
  actionSection: {
    marginBottom: 20,
  },
  signupButton: {
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
  signupButtonDisabled: {
    backgroundColor: '#fca5a5',
    shadowOpacity: 0,
    elevation: 0,
  },
  signupButtonText: {
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

  // Login Link
  loginContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginText: {
    color: '#6b7280',
    fontSize: 15,
    fontWeight: '400',
  },
  loginButton: {
    marginLeft: 4,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  loginLinkText: {
    color: '#ff2b2b',
    fontWeight: '600',
    fontSize: 15,
  },
});