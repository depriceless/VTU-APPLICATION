import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator
} from 'react-native';
import { useRouter, Stack } from 'expo-router';

const API_BASE_URL_ROOT = 'https://vtu-application.onrender.com';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const validateInput = () => {
    const newErrors = {};

    if (!emailOrPhone.trim()) {
      newErrors.emailOrPhone = 'Email or phone number is required';
      setErrors(newErrors);
      return false;
    }

    // Check if it's a valid email or phone
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^\d{10,15}$/;
    
    if (!emailRegex.test(emailOrPhone) && !phoneRegex.test(emailOrPhone)) {
      newErrors.emailOrPhone = 'Please enter a valid email or phone number';
      setErrors(newErrors);
      return false;
    }

    setErrors({});
    return true;
  };

  const handleSendResetLink = async () => {
    if (!validateInput()) {
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL_ROOT}/api/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          emailOrPhone: emailOrPhone.trim()
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Show success message
        Alert.alert(
          'Success',
          'Password reset instructions have been sent to your email. Please check your inbox.',
          [
            {
              text: 'OK',
              onPress: () => {
                // Clear the input
                setEmailOrPhone('');
                // Navigate back to login
                router.replace('/auth/login');
              }
            }
          ]
        );
      } else {
        // Show error message
        Alert.alert(
          'Error',
          data.message || 'Failed to send reset link. Please try again.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Forgot password error:', error);
      Alert.alert(
        'Error',
        'Network error. Please check your connection and try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen 
        options={{
          title: 'Forgot Password',
          headerShown: true,
          headerBackTitle: 'Back',
        }} 
      />
      
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <Text style={styles.iconText}>🔐</Text>
          </View>

          <Text style={styles.title}>Forgot Password?</Text>
          <Text style={styles.subtitle}>
            Enter your email or phone number and we'll send you instructions to reset your password.
          </Text>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email or Phone Number</Text>
            <TextInput
              style={[
                styles.input,
                errors.emailOrPhone && styles.inputError
              ]}
              placeholder="Enter your email or phone"
              placeholderTextColor="#999"
              value={emailOrPhone}
              onChangeText={(text) => {
                setEmailOrPhone(text);
                if (errors.emailOrPhone) {
                  setErrors({});
                }
              }}
              autoCapitalize="none"
              keyboardType="email-address"
              editable={!loading}
            />
            {errors.emailOrPhone && (
              <Text style={styles.errorText}>{errors.emailOrPhone}</Text>
            )}
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSendResetLink}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Send Reset Link</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            disabled={loading}
          >
            <Text style={styles.backButtonText}>
              Remember your password? Log in
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  iconText: {
    fontSize: 64,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 24,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  inputError: {
    borderColor: '#ff3b30',
  },
  errorText: {
    color: '#ff3b30',
    fontSize: 12,
    marginTop: 5,
  },
  button: {
    backgroundColor: '#ff3b30',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  backButton: {
    marginTop: 20,
    alignItems: 'center',
  },
  backButtonText: {
    color: '#ff3b30',
    fontSize: 14,
    fontWeight: '500',
  },
});