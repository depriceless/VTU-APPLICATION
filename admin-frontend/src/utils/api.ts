import React, { useState, useEffect } from 'react';

// TypeScript interfaces matching your backend structure
interface LoginCredentials {
  username: string;
  password: string;
  rememberMe: boolean;
}

interface AuthResponse {
  success: boolean;
  message: string;
  token?: string;
  admin?: {
    id: string;
    username: string;
    email: string;
    role: 'super_admin' | 'admin' | 'support';
    lastLogin?: string;
    isActive: boolean;
  };
}

interface ValidationError {
  field: string;
  message: string;
}

interface AppError {
  message: string;
  type: 'validation' | 'authentication' | 'network' | 'server';
}

const AdminLogin: React.FC = () => {
  // State management similar to your VTU app
  const [credentials, setCredentials] = useState<LoginCredentials>({
    username: '',
    password: '',
    rememberMe: false
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<AppError | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [showPassword, setShowPassword] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // API configuration
  const API_BASE_URL = 'http://192.168.126.7:5000/api';

  // Initialize component on mount
  useEffect(() => {
    initializeComponent();
  }, []);

  const initializeComponent = async () => {
    try {
      await loadStoredCredentials();
      setIsInitialized(true);
    } catch (error) {
      console.error('Component initialization error:', error);
      setIsInitialized(true);
    }
  };

  // Load stored credentials from localStorage
  const loadStoredCredentials = async () => {
    try {
      const savedUsername = localStorage.getItem('vtu_admin_username');
      const rememberMe = localStorage.getItem('vtu_admin_remember') === 'true';
      
      if (savedUsername && rememberMe) {
        setCredentials(prev => ({
          ...prev,
          username: savedUsername,
          rememberMe: true
        }));
      }
    } catch (error) {
      console.error('Error loading stored credentials:', error);
    }
  };

  // Save credentials to localStorage
  const saveCredentials = async (username: string, remember: boolean) => {
    try {
      if (remember) {
        localStorage.setItem('vtu_admin_username', username);
        localStorage.setItem('vtu_admin_remember', 'true');
      } else {
        localStorage.removeItem('vtu_admin_username');
        localStorage.removeItem('vtu_admin_remember');
      }
    } catch (error) {
      console.error('Error saving credentials:', error);
    }
  };

  // Form validation
  const validateCredentials = (): ValidationError[] => {
    const errors: ValidationError[] = [];

    if (!credentials.username.trim()) {
      errors.push({
        field: 'username',
        message: 'Username or email is required'
      });
    } else if (credentials.username.trim().length < 3) {
      errors.push({
        field: 'username',
        message: 'Username must be at least 3 characters'
      });
    }

    if (!credentials.password) {
      errors.push({
        field: 'password',
        message: 'Password is required'
      });
    } else if (credentials.password.length < 6) {
      errors.push({
        field: 'password',
        message: 'Password must be at least 6 characters'
      });
    }

    return errors;
  };

  // API request handler
  const makeAuthRequest = async (endpoint: string, data: any) => {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Request failed with status ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API request error:', error);
      throw error;
    }
  };

  // Handle login process
  const processLogin = async () => {
    setError(null);
    setValidationErrors([]);

    // Validate form
    const errors = validateCredentials();
    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }

    setIsLoading(true);

    try {
      const response: AuthResponse = await makeAuthRequest('/admin/login', {
        username: credentials.username.trim(),
        password: credentials.password,
      });

      if (response.success && response.token && response.admin) {
        // Store authentication data
        localStorage.setItem('vtu_admin_token', response.token);
        localStorage.setItem('vtu_admin_data', JSON.stringify(response.admin));
        
        // Save credentials if remember me is checked
        await saveCredentials(credentials.username, credentials.rememberMe);

        // Update admin last login timestamp
        if (response.admin.lastLogin) {
          console.log('Last login:', new Date(response.admin.lastLogin));
        }

        // Success - redirect to dashboard or trigger parent callback
        console.log('Authentication successful:', response.admin);
        
        // Show success message
        alert(`Welcome back, ${response.admin.username}! Redirecting to dashboard...`);
        
      } else {
        setError({
          message: response.message || 'Authentication failed',
          type: 'authentication'
        });
      }

    } catch (error) {
      console.error('Login processing error:', error);
      
      if (error instanceof TypeError && error.message.includes('fetch')) {
        setError({
          message: 'Cannot connect to server. Please check your internet connection.',
          type: 'network'
        });
      } else if (error.message.includes('Invalid credentials')) {
        setError({
          message: 'Invalid username or password. Please check your credentials.',
          type: 'authentication'
        });
      } else if (error.message.includes('Account deactivated')) {
        setError({
          message: 'Your admin account has been deactivated. Contact system administrator.',
          type: 'authentication'
        });
      } else {
        setError({
          message: error.message || 'An unexpected error occurred. Please try again.',
          type: 'server'
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Handle input changes
  const updateCredentials = (field: keyof LoginCredentials, value: string | boolean) => {
    setCredentials(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear errors when user starts typing
    if (error) {
      setError(null);
    }
    
    if (validationErrors.length > 0) {
      setValidationErrors([]);
    }
  };

  // Handle Enter key press
  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !isLoading && credentials.username && credentials.password) {
      processLogin();
    }
  };

  // Handle forgot password
  const handleForgotPassword = () => {
    console.log('Forgot password clicked');
    alert('Password recovery will be implemented soon. Please contact your system administrator.');
  };

  // Get field error message
  const getFieldError = (field: string): string => {
    const fieldError = validationErrors.find(err => err.field === field);
    return fieldError ? fieldError.message : '';
  };

  // Check if form can be submitted
  const canSubmit = credentials.username.trim() && credentials.password && !isLoading;

  if (!isInitialized) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingCard}>
          <div style={styles.spinner}></div>
          <span style={styles.loadingText}>Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.loginCard}>
        {/* Header Section */}
        <div style={styles.header}>
          <div style={styles.logoContainer}>
            <div style={styles.logo}>
              <span style={styles.logoText}>VTU</span>
            </div>
          </div>
          <h1 style={styles.title}>Admin Panel</h1>
          <p style={styles.subtitle}>Please sign in to continue</p>
        </div>

        {/* Form Section */}
        <div style={styles.formContainer}>
          {/* Username/Email Input */}
          <div style={styles.inputContainer}>
            <label style={styles.inputLabel}>Username or Email</label>
            <input
              type="text"
              style={Object.assign(
                {},
                styles.textInput,
                getFieldError('username') ? styles.inputError : {}
              )}
              placeholder="Enter your username or email"
              value={credentials.username}
              onChange={(e) => updateCredentials('username', e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={isLoading}
              autoComplete="username"
              autoCapitalize="none"
            />
            {getFieldError('username') && (
              <span style={styles.fieldErrorText}>{getFieldError('username')}</span>
            )}
          </div>

          {/* Password Input */}
          <div style={styles.inputContainer}>
            <label style={styles.inputLabel}>Password</label>
            <div style={styles.passwordWrapper}>
              <input
                type={showPassword ? 'text' : 'password'}
                style={Object.assign(
                  {},
                  styles.textInput,
                  styles.passwordInput,
                  getFieldError('password') ? styles.inputError : {}
                )}
                placeholder="Enter your password"
                value={credentials.password}
                onChange={(e) => updateCredentials('password', e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={isLoading}
                autoComplete="current-password"
              />
              <button
                type="button"
                style={styles.passwordToggleButton}
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLoading}
              >
                <span style={styles.passwordToggleIcon}>
                  {showPassword ? '🙈' : '👁️'}
                </span>
              </button>
            </div>
            {getFieldError('password') && (
              <span style={styles.fieldErrorText}>{getFieldError('password')}</span>
            )}
          </div>

          {/* Remember Me Checkbox */}
          <div style={styles.checkboxContainer}>
            <label style={styles.checkboxLabel}>
              <input
                type="checkbox"
                style={styles.checkboxInput}
                checked={credentials.rememberMe}
                onChange={(e) => updateCredentials('rememberMe', e.target.checked)}
                disabled={isLoading}
              />
              <span style={styles.checkboxText}>Remember me</span>
            </label>
          </div>

          {/* Error Display */}
          {error && (
            <div style={Object.assign({}, styles.errorContainer, styles[`error${error.type}`])}>
              <span style={styles.errorIcon}>
                {error.type === 'network' ? '🌐' : 
                 error.type === 'validation' ? '⚠️' : 
                 error.type === 'authentication' ? '🔒' : '❌'}
              </span>
              <span style={styles.errorMessage}>{error.message}</span>
            </div>
          )}

          {/* Login Button */}
          <button
            type="button"
            style={Object.assign(
              {},
              styles.loginButton,
              isLoading ? styles.buttonLoading : {},
              !canSubmit ? styles.buttonDisabled : {}
            )}
            disabled={!canSubmit}
            onClick={processLogin}
          >
            {isLoading ? (
              <div style={styles.buttonLoadingContent}>
                <div style={styles.buttonSpinner}></div>
                <span>Signing in...</span>
              </div>
            ) : (
              <span>Sign In</span>
            )}
          </button>

          {/* Forgot Password Link */}
          <div style={styles.forgotPasswordContainer}>
            <button
              type="button"
              style={styles.forgotPasswordLink}
              onClick={handleForgotPassword}
              disabled={isLoading}
            >
              Forgot your password?
            </button>
          </div>
        </div>

        {/* Footer */}
        <div style={styles.footer}>
          <p style={styles.footerText}>
            VTU Admin System © 2024
          </p>
        </div>
      </div>
    </div>
  );
};

// Styles object similar to React Native StyleSheet
const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f5f5f5',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '20px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  },

  loadingCard: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '40px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)'
  },

  loginCard: {
    width: '100%',
    maxWidth: '400px',
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
    padding: '32px',
    border: '1px solid #e1e1e1'
  },

  header: {
    textAlign: 'center',
    marginBottom: '32px'
  },

  logoContainer: {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: '16px'
  },

  logo: {
    width: '56px',
    height: '56px',
    backgroundColor: '#ff3b30',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 16px rgba(255, 59, 48, 0.25)'
  },

  logoText: {
    color: '#ffffff',
    fontSize: '18px',
    fontWeight: '700',
    letterSpacing: '0.5px'
  },

  title: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#1a1a1a',
    margin: '0 0 8px 0',
    letterSpacing: '-0.3px'
  },

  subtitle: {
    fontSize: '15px',
    color: '#666666',
    margin: '0',
    fontWeight: '400'
  },

  formContainer: {
    width: '100%'
  },

  inputContainer: {
    marginBottom: '20px'
  },

  inputLabel: {
    display: 'block',
    fontSize: '14px',
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: '8px'
  },

  textInput: {
    width: '100%',
    padding: '12px 16px',
    fontSize: '16px',
    border: '1px solid #d1d1d1',
    borderRadius: '8px',
    backgroundColor: '#ffffff',
    color: '#1a1a1a',
    outline: 'none',
    transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
    boxSizing: 'border-box'
  },

  inputError: {
    borderColor: '#ff3b30',
    backgroundColor: '#fef7f7',
    boxShadow: '0 0 0 3px rgba(255, 59, 48, 0.1)'
  },

  fieldErrorText: {
    display: 'block',
    color: '#ff3b30',
    fontSize: '12px',
    fontWeight: '500',
    marginTop: '6px'
  },

  passwordWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center'
  },

  passwordInput: {
    paddingRight: '48px'
  },

  passwordToggleButton: {
    position: 'absolute',
    right: '12px',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    padding: '4px',
    borderRadius: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },

  passwordToggleIcon: {
    fontSize: '16px',
    userSelect: 'none'
  },

  checkboxContainer: {
    marginBottom: '24px'
  },

  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    cursor: 'pointer',
    fontSize: '14px',
    color: '#666666'
  },

  checkboxInput: {
    marginRight: '8px',
    accentColor: '#ff3b30'
  },

  checkboxText: {
    fontWeight: '400',
    userSelect: 'none'
  },

  errorContainer: {
    display: 'flex',
    alignItems: 'flex-start',
    padding: '12px 16px',
    borderRadius: '8px',
    marginBottom: '20px',
    fontSize: '14px',
    fontWeight: '500',
    lineHeight: '1.4'
  },

  errorvalidation: {
    backgroundColor: '#fff8e1',
    border: '1px solid #ffecb3',
    color: '#f57f17'
  },

  errorauthentication: {
    backgroundColor: '#ffebee',
    border: '1px solid #ffcdd2',
    color: '#c62828'
  },

  errornetwork: {
    backgroundColor: '#e8f5e8',
    border: '1px solid '#c8e6c9',
    color: '#2e7d32'
  },

  errorserver: {
    backgroundColor: '#ffebee',
    border: '1px solid #ffcdd2',
    color: '#c62828'
  },

  errorIcon: {
    marginRight: '8px',
    fontSize: '16px',
    flexShrink: 0,
    marginTop: '1px'
  },

  errorMessage: {
    flex: 1
  },

  loginButton: {
    width: '100%',
    padding: '14px 20px',
    fontSize: '16px',
    fontWeight: '600',
    color: '#ffffff',
    backgroundColor: '#ff3b30',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    marginBottom: '16px',
    boxShadow: '0 2px 8px rgba(255, 59, 48, 0.2)'
  },

  buttonLoading: {
    backgroundColor: '#ff6b5e',
    cursor: 'not-allowed',
    boxShadow: 'none'
  },

  buttonDisabled: {
    backgroundColor: '#cccccc',
    cursor: 'not-allowed',
    boxShadow: 'none'
  },

  buttonLoadingContent: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },

  buttonSpinner: {
    width: '16px',
    height: '16px',
    border: '2px solid transparent',
    borderTop: '2px solid #ffffff',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginRight: '8px'
  },

  forgotPasswordContainer: {
    textAlign: 'center'
  },

  forgotPasswordLink: {
    background: 'none',
    border: 'none',
    color: '#ff3b30',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    textDecoration: 'none',
    padding: '4px 8px'
  },

  footer: {
    textAlign: 'center',
    marginTop: '24px',
    paddingTop: '20px',
    borderTop: '1px solid #f0f0f0'
  },

  footerText: {
    fontSize: '12px',
    color: '#999999',
    margin: '0'
  },

  spinner: {
    width: '20px',
    height: '20px',
    border: '2px solid #f3f3f3',
    borderTop: '2px solid #ff3b30',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginBottom: '12px'
  },

  loadingText: {
    color: '#666666',
    fontSize: '14px'
  }
};

export default AdminLogin;