import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, SafeAreaView, KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const API_BASE_URL_ROOT = 'https://vtu-application.onrender.com';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const { token: urlToken } = useLocalSearchParams();
  
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    // If token comes from URL params (deep link), use it automatically
    if (urlToken && typeof urlToken === 'string') {
      console.log('✅ Token loaded from deep link');
      console.log('📝 Token length:', urlToken.length);
      setToken(urlToken);
    }
  }, [urlToken]);

  const validateInputs = () => {
    if (!token.trim()) {
      Alert.alert('Missing Code', 'Please enter the reset code from your email.');
      return false;
    }

    if (!newPassword.trim()) {
      Alert.alert('Missing Password', 'Please enter a new password.');
      return false;
    }

    if (!confirmPassword.trim()) {
      Alert.alert('Missing Confirmation', 'Please confirm your new password.');
      return false;
    }

    if (newPassword.length < 6) {
      Alert.alert('Password Too Short', 'Password must be at least 6 characters long.');
      return false;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Passwords Don\'t Match', 'The passwords you entered do not match.');
      return false;
    }

    return true;
  };

  const handleResetPassword = async () => {
    // Validation
    if (!validateInputs()) {
      return;
    }

    setLoading(true);

    try {
      console.log('🔄 Resetting password...');
      console.log('📤 API URL:', `${API_BASE_URL_ROOT}/api/auth/reset-password`);
      console.log('📤 Token length:', token.trim().length);
      
      const response = await fetch(`${API_BASE_URL_ROOT}/api/auth/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: token.trim(),
          newPassword: newPassword.trim(),
        }),
      });

      const data = await response.json();
      console.log('📥 Response status:', response.status);
      console.log('📥 Response data:', data);

      if (response.ok && data.success) {
        Alert.alert(
          '✅ Success',
          'Your password has been reset successfully! You can now login with your new password.',
          [
            {
              text: 'Go to Login',
              onPress: () => {
                // Clear the form
                setToken('');
                setNewPassword('');
                setConfirmPassword('');
                // Navigate to login
                router.replace('/auth/login');
              },
            },
          ]
        );
      } else {
        // Handle specific error messages
        let errorMessage = data.message || 'Failed to reset password.';
        
        if (errorMessage.includes('expired')) {
          errorMessage = 'Your reset code has expired. Please request a new one.';
        } else if (errorMessage.includes('invalid')) {
          errorMessage = 'Invalid reset code. Please check and try again.';
        }
        
        Alert.alert('Reset Failed', errorMessage, [
          {
            text: 'Request New Code',
            onPress: () => router.push('/auth/forgot-password'),
          },
          {
            text: 'Try Again',
            style: 'cancel',
          },
        ]);
      }
    } catch (error) {
      console.error('❌ Reset password error:', error);
      Alert.alert(
        'Connection Error',
        'Unable to connect to the server. Please check your internet connection and try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Stack.Screen 
        options={{ 
          title: 'Reset Password',
          headerShown: true,
          headerStyle: {
            backgroundColor: '#ff3b30',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: '600',
            color: '#fff',
          },
        }} 
      />
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardView}
        >
          <ScrollView 
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.content}>
              {/* Header */}
              <View style={styles.headerSection}>
                <View style={styles.iconContainer}>
                  <Ionicons name="lock-closed" size={48} color="#ff3b30" />
                </View>
                <Text style={styles.title}>Reset Your Password</Text>
                <Text style={styles.subtitle}>
                  Enter the reset code from your email and choose a secure new password.
                </Text>
              </View>

              {/* Reset Code Input */}
              <View style={styles.inputSection}>
                <Text style={styles.label}>
                  Reset Code {urlToken && <Text style={styles.autoFilledBadge}>✓ Auto-filled</Text>}
                </Text>
                <TextInput
                  style={[styles.input, urlToken && styles.inputAutoFilled]}
                  placeholder="Enter reset code from email"
                  placeholderTextColor="#999"
                  value={token}
                  onChangeText={setToken}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading}
                  multiline={false}
                />
                {urlToken && (
                  <Text style={styles.helperTextSuccess}>
                    ✓ Code loaded from email link
                  </Text>
                )}
                {!urlToken && (
                  <Text style={styles.helperText}>
                    Check your email for the reset code
                  </Text>
                )}
              </View>

              {/* New Password Input */}
              <View style={styles.inputSection}>
                <Text style={styles.label}>New Password</Text>
                <View style={styles.passwordContainer}>
                  <TextInput
                    style={styles.passwordInput}
                    placeholder="Enter new password"
                    placeholderTextColor="#999"
                    value={newPassword}
                    onChangeText={setNewPassword}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    editable={!loading}
                  />
                  <TouchableOpacity
                    style={styles.eyeIcon}
                    onPress={() => setShowPassword(!showPassword)}
                    disabled={loading}
                  >
                    <Ionicons
                      name={showPassword ? 'eye-off' : 'eye'}
                      size={22}
                      color="#999"
                    />
                  </TouchableOpacity>
                </View>
                <Text style={styles.helperText}>
                  Must be at least 6 characters
                </Text>
              </View>

              {/* Confirm Password Input */}
              <View style={styles.inputSection}>
                <Text style={styles.label}>Confirm Password</Text>
                <View style={styles.passwordContainer}>
                  <TextInput
                    style={styles.passwordInput}
                    placeholder="Confirm new password"
                    placeholderTextColor="#999"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showConfirmPassword}
                    autoCapitalize="none"
                    editable={!loading}
                  />
                  <TouchableOpacity
                    style={styles.eyeIcon}
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                    disabled={loading}
                  >
                    <Ionicons
                      name={showConfirmPassword ? 'eye-off' : 'eye'}
                      size={22}
                      color="#999"
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Reset Button */}
              <TouchableOpacity 
                style={[styles.button, loading && styles.buttonDisabled]} 
                onPress={handleResetPassword}
                disabled={loading}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={20} color="#fff" style={styles.buttonIcon} />
                    <Text style={styles.buttonText}>Reset Password</Text>
                  </>
                )}
              </TouchableOpacity>

              {/* Back to Login */}
              <TouchableOpacity 
                style={styles.backButton}
                onPress={() => router.back()}
                disabled={loading}
              >
                <Ionicons name="arrow-back" size={16} color="#ff3b30" />
                <Text style={styles.backButtonText}>Back to Login</Text>
              </TouchableOpacity>

              {/* Help Section */}
              <View style={styles.helpSection}>
                <Text style={styles.helpText}>
                  Didn't receive the code?{' '}
                  <Text 
                    style={styles.helpLink}
                    onPress={() => !loading && router.push('/auth/forgot-password')}
                  >
                    Request a new one
                  </Text>
                </Text>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </>
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
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 40,
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#fff5f5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 10,
  },
  inputSection: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  autoFilledBadge: {
    color: '#4CAF50',
    fontSize: 12,
    fontWeight: '500',
  },
  input: {
    backgroundColor: '#f8f8f8',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    color: '#333',
  },
  inputAutoFilled: {
    backgroundColor: '#f0f8f0',
    borderColor: '#4CAF50',
  },
  passwordContainer: {
    position: 'relative',
  },
  passwordInput: {
    backgroundColor: '#f8f8f8',
    paddingVertical: 14,
    paddingHorizontal: 16,
    paddingRight: 50,
    borderRadius: 10,
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    color: '#333',
  },
  eyeIcon: {
    position: 'absolute',
    right: 15,
    top: 15,
    padding: 5,
  },
  helperText: {
    fontSize: 12,
    color: '#999',
    marginTop: 6,
  },
  helperTextSuccess: {
    fontSize: 12,
    color: '#4CAF50',
    marginTop: 6,
  },
  button: {
    backgroundColor: '#ff3b30',
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    flexDirection: 'row',
    shadowColor: '#ff3b30',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    backgroundColor: '#ffb3b0',
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonIcon: {
    marginRight: 8,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  backButton: {
    marginTop: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    paddingVertical: 12,
  },
  backButtonText: {
    color: '#ff3b30',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  helpSection: {
    marginTop: 24,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    alignItems: 'center',
  },
  helpText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  helpLink: {
    color: '#ff3b30',
    fontWeight: '600',
  },
});