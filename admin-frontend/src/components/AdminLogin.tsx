import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom'; // Add this import
import { useAuth } from '../contexts/AuthContext';
import Loader from './ui/Loader';

const API_BASE_URL = 'http://192.168.126.7:5000/api/admin/auth';

interface LoginCredentials {
  username: string;
  password: string;
  rememberMe: boolean;
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
  const { login } = useAuth();
  const navigate = useNavigate(); // Add this hook

  const [credentials, setCredentials] = useState<LoginCredentials>({
    username: '',
    password: '',
    rememberMe: false
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<AppError | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const savedUsername = localStorage.getItem('remembered_username');
    if (savedUsername) {
      setCredentials(prev => ({ ...prev, username: savedUsername, rememberMe: true }));
    }

    // Add CSS animation keyframes
    if (!document.querySelector('#admin-login-animations')) {
      const style = document.createElement('style');
      style.id = 'admin-login-animations';
      style.textContent = `
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

  const validateCredentials = (): ValidationError[] => {
    const errors: ValidationError[] = [];
    if (!credentials.username.trim()) {
      errors.push({ field: 'username', message: 'Username or email is required' });
    }
    if (!credentials.password) {
      errors.push({ field: 'password', message: 'Password is required' });
    }
    if (credentials.password && credentials.password.length < 6) {
      errors.push({ field: 'password', message: 'Password must be at least 6 characters' });
    }
    return errors;
  };

  const makeAuthRequest = async (endpoint: string, data: any) => {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Request failed with status ${response.status}`);
      }
      
      return await response.json();
    } catch (error: any) {
      if (error.name === 'TypeError' || error.message.includes('fetch')) {
        throw new Error('Unable to connect to server. Please check your connection.');
      }
      throw error;
    }
  };

  const processLogin = async () => {
    setError(null);
    setValidationErrors([]);

    const errors = validateCredentials();
    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }

    setIsLoading(true);

    try {
      const response = await makeAuthRequest('/login', {
        username: credentials.username.trim(),
        password: credentials.password
      });

      if (response.success && response.token && response.admin) {
        login(response.admin, response.token, credentials.rememberMe);
        navigate('/dashboard'); // Add this line to redirect after login
      } else {
        setError({ 
          message: response.message || 'Authentication failed. Please check your credentials.', 
          type: 'authentication' 
        });
      }
    } catch (error: any) {
      const errorMessage = error.message || 'An unexpected error occurred. Please try again.';
      setError({ message: errorMessage, type: 'server' });
    } finally {
      setIsLoading(false);
    }
  };

  const updateCredentials = (field: keyof LoginCredentials, value: string | boolean) => {
    setCredentials(prev => ({ ...prev, [field]: value }));
    if (error) setError(null);
    if (validationErrors.length > 0) setValidationErrors([]);
  };

  const getFieldError = (field: string): string => {
    const fieldError = validationErrors.find(err => err.field === field);
    return fieldError ? fieldError.message : '';
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && canSubmit) {
      processLogin();
    }
  };

  const canSubmit = credentials.username.trim() && credentials.password && !isLoading;

  if (isLoading) {
    return <Loader message="Authenticating..." />;
  }

  return (
    <div style={styles.container}>
      <div style={styles.loginCard}>
        {/* Header Section */}
        <div style={styles.header}>
          <div style={styles.logo}>
            <div style={styles.logoIcon}>🔐</div>
          </div>
          <h1 style={styles.title}>Connectpay Admin Portal</h1>
          <p style={styles.subtitle}>Sign in to access the admin dashboard</p>
        </div>

        {/* Form Section */}
        <form onSubmit={(e) => { e.preventDefault(); processLogin(); }} style={styles.form}>
          {/* Username Field */}
          <div style={styles.inputGroup}>
            <label style={styles.label} htmlFor="username">
              Username or Email
            </label>
            <div style={styles.inputWrapper}>
              <input
                id="username"
                type="text"
                placeholder="Enter your username or email"
                value={credentials.username}
                onChange={(e) => updateCredentials('username', e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={isLoading}
                style={{
                  ...styles.input,
                  ...(getFieldError('username') ? styles.inputError : {})
                }}
                autoComplete="username"
                autoFocus
              />
              <span style={styles.inputIcon}>👤</span>
            </div>
            {getFieldError('username') && (
              <span style={styles.errorMessage}>{getFieldError('username')}</span>
            )}
          </div>

          {/* Password Field */}
          <div style={styles.inputGroup}>
            <label style={styles.label} htmlFor="password">
              Password
            </label>
            <div style={styles.inputWrapper}>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                value={credentials.password}
                onChange={(e) => updateCredentials('password', e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={isLoading}
                style={{
                  ...styles.input,
                  ...(getFieldError('password') ? styles.inputError : {})
                }}
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={styles.passwordToggle}
                disabled={isLoading}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
            {getFieldError('password') && (
              <span style={styles.errorMessage}>{getFieldError('password')}</span>
            )}
          </div>

          {/* Remember Me */}
          <div style={styles.checkboxGroup}>
            <label style={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={credentials.rememberMe}
                onChange={(e) => updateCredentials('rememberMe', e.target.checked)}
                style={styles.checkbox}
                disabled={isLoading}
              />
              <span style={styles.checkboxText}>Remember me</span>
            </label>
          </div>

          {/* Error Display */}
          {error && (
            <div style={styles.errorAlert}>
              <span style={styles.errorIcon}>⚠️</span>
              <span>{error.message}</span>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!canSubmit}
            style={{
              ...styles.submitButton,
              ...(canSubmit ? styles.submitButtonEnabled : styles.submitButtonDisabled)
            }}
          >
            {isLoading ? (
              <span style={styles.loadingText}>
                <span style={styles.spinner}></span>
                Signing In...
              </span>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        {/* Footer */}
        <div style={styles.footer}>
          <p style={styles.footerText}>
            Secure admin access • VTU Management System
          </p>
        </div>
      </div>
    </div>
  );
};

// Updated styles with enhanced centering
const styles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    minWidth: '100vw',
    backgroundColor: '#f8f9fa',
    padding: '20px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    margin: 0,
    boxSizing: 'border-box' as const
  } as React.CSSProperties,

  loginCard: {
    width: '100%',
    maxWidth: '440px',
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    padding: '48px 40px',
    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
    border: '1px solid #e1e1e1',
    margin: 'auto',
    transform: 'translateY(-5vh)' // Slight upward adjustment for better visual centering
  } as React.CSSProperties,

  header: {
    textAlign: 'center' as const,
    marginBottom: '40px'
  },

  logo: {
    marginBottom: '16px'
  },

  logoIcon: {
    fontSize: '48px',
    marginBottom: '8px'
  },

  title: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#333333',
    margin: '0 0 8px 0',
    letterSpacing: '-0.5px'
  },

  subtitle: {
    fontSize: '16px',
    color: '#666666',
    margin: '0',
    fontWeight: '400'
  },

  form: {
    width: '100%'
  },

  inputGroup: {
    marginBottom: '24px'
  },

  label: {
    display: 'block',
    fontSize: '14px',
    fontWeight: '600',
    color: '#333333',
    marginBottom: '8px'
  },

  inputWrapper: {
    position: 'relative' as const,
    display: 'flex',
    alignItems: 'center'
  },

  input: {
    width: '100%',
    padding: '16px 50px 16px 16px',
    fontSize: '16px',
    border: '1px solid #ddd',
    borderRadius: '12px',
    outline: 'none',
    transition: 'all 0.2s ease-in-out',
    backgroundColor: '#ffffff',
    boxSizing: 'border-box' as const
  },

  inputError: {
    borderColor: '#ff3b30',
    backgroundColor: '#fff5f5'
  },

  inputIcon: {
    position: 'absolute' as const,
    right: '16px',
    fontSize: '18px',
    color: '#666666',
    pointerEvents: 'none' as const
  },

  passwordToggle: {
    position: 'absolute' as const,
    right: '16px',
    background: 'none',
    border: 'none',
    fontSize: '18px',
    cursor: 'pointer',
    color: '#666666',
    padding: '0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },

  checkboxGroup: {
    marginBottom: '32px'
  },

  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    cursor: 'pointer',
    fontSize: '14px'
  },

  checkbox: {
    marginRight: '8px',
    cursor: 'pointer'
  },

  checkboxText: {
    color: '#666666',
    fontWeight: '500'
  },

  errorMessage: {
    display: 'block',
    fontSize: '12px',
    color: '#ff3b30',
    marginTop: '6px',
    fontWeight: '500'
  },

  errorAlert: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 16px',
    backgroundColor: '#fff5f5',
    border: '1px solid #ff3b30',
    borderRadius: '8px',
    fontSize: '14px',
    color: '#ff3b30',
    marginBottom: '24px',
    fontWeight: '500'
  },

  errorIcon: {
    fontSize: '16px'
  },

  submitButton: {
    width: '100%',
    padding: '16px',
    fontSize: '16px',
    fontWeight: '600',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'all 0.2s ease-in-out',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px'
  },

  submitButtonEnabled: {
    backgroundColor: '#ff3b30',
    color: '#ffffff',
    boxShadow: '0 4px 14px 0 rgba(255, 59, 48, 0.3)'
  },

  submitButtonDisabled: {
    backgroundColor: '#ccc',
    color: '#999999',
    cursor: 'not-allowed'
  },

  loadingText: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },

  spinner: {
    width: '16px',
    height: '16px',
    border: '2px solid transparent',
    borderTop: '2px solid currentColor',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },

  footer: {
    textAlign: 'center' as const,
    marginTop: '32px',
    paddingTop: '24px',
    borderTop: '1px solid #f0f0f0'
  },

  footerText: {
    fontSize: '12px',
    color: '#999999',
    margin: '0',
    fontWeight: '500'
  }
};

export default AdminLogin;