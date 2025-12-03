import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Loader from './ui/Loader';

import { API_CONFIG } from "../config/api.config";
const API_BASE_URL = API_CONFIG.ADMIN_AUTH;

// Import your logo
import Logo from '../assets/logo.png';

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
  const navigate = useNavigate();

  const [credentials, setCredentials] = useState<LoginCredentials>({
    username: '',
    password: '',
    rememberMe: false
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<AppError | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [showPassword, setShowPassword] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const savedUsername = localStorage.getItem('remembered_username');
    if (savedUsername) {
      setCredentials(prev => ({ ...prev, username: savedUsername, rememberMe: true }));
    }

    // Check if mobile
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    // Initial check
    checkMobile();
    
    // Add resize listener
    window.addEventListener('resize', checkMobile);
    
    // Add CSS animation keyframes and input styles
    if (!document.querySelector('#admin-login-animations')) {
      const style = document.createElement('style');
      style.id = 'admin-login-animations';
      style.textContent = `
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.05); opacity: 0.8; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes logoSpin {
          0% { transform: rotate(0deg) scale(1); }
          25% { transform: rotate(90deg) scale(1.1); }
          50% { transform: rotate(180deg) scale(1); }
          75% { transform: rotate(270deg) scale(1.1); }
          100% { transform: rotate(360deg) scale(1); }
        }
        
        /* Force pure black text and pure white background for inputs */
        .admin-login-input {
          color: #000000 !important;
          background-color: #ffffff !important;
          font-weight: 600 !important;
          -webkit-text-fill-color: #000000 !important;
        }
        
        .admin-login-input::placeholder {
          color: #999999 !important;
          opacity: 0.8 !important;
        }
        
        .admin-login-input:focus {
          color: #000000 !important;
          background-color: #ffffff !important;
          -webkit-text-fill-color: #000000 !important;
        }
        
        .admin-login-input:disabled {
          color: #000000 !important;
          background-color: #ffffff !important;
          -webkit-text-fill-color: #000000 !important;
        }
        
        /* Remove any autofill styles */
        .admin-login-input:-webkit-autofill,
        .admin-login-input:-webkit-autofill:hover, 
        .admin-login-input:-webkit-autofill:focus {
          -webkit-text-fill-color: #000000 !important;
          -webkit-box-shadow: 0 0 0px 1000px #ffffff inset !important;
          transition: background-color 5000s ease-in-out 0s;
        }
        
        .logo-spin {
          animation: logoSpin 2s linear infinite;
        }
          input[type="checkbox"] {
  accent-color: #ff2b2b !important;
}
        .logo-pulse {
          animation: pulse 1.5s ease-in-out infinite;
        }

        /* Mobile-specific styles */
        @media (max-width: 768px) {
          .mobile-full-height {
            min-height: -webkit-fill-available;
          }
          
          .mobile-tap-target {
            min-height: 44px;
            min-width: 44px;
          }
        }
      `;
      document.head.appendChild(style);
    }

    return () => {
      window.removeEventListener('resize', checkMobile);
    };
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
        navigate('/dashboard');
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

  // Custom Loader Component with Logo
  const LogoLoader = () => (
    <div style={isMobile ? styles.mobileLoaderContainer : styles.loaderContainer}>
      <div style={styles.logoLoader}>
        <img 
          src={Logo} 
          alt="ConnectPay Logo" 
          style={isMobile ? styles.mobileLogoLoaderImage : styles.logoLoaderImage}
          className="logo-spin"
        />
      </div>
      <div style={styles.loaderText}>
        <p style={isMobile ? styles.mobileLoaderMessage : styles.loaderMessage}>
          Authenticating...
        </p>
        <p style={isMobile ? styles.mobileLoaderSubMessage : styles.loaderSubMessage}>
          Please wait while we verify your credentials
        </p>
      </div>
    </div>
  );

  if (isLoading) {
    return <LogoLoader />;
  }

  return (
    <div style={isMobile ? styles.mobileContainer : styles.container} className="mobile-full-height">
      <div style={isMobile ? styles.mobileLoginCard : styles.loginCard}>
        {/* Header Section */}
        <div style={isMobile ? styles.mobileHeader : styles.header}>
          <div style={isMobile ? styles.mobileLogo : styles.logo}>
            <img 
              src={Logo} 
              alt="ConnectPay Logo" 
              style={isMobile ? styles.mobileLogoImage : styles.logoImage}
            />
          </div>
          <h1 style={isMobile ? styles.mobileTitle : styles.title}>ConnectPay</h1>
          <p style={isMobile ? styles.mobileSubtitle : styles.subtitle}>
            Sign in to access the admin dashboard
          </p>
        </div>

        {/* Form Section */}
        <form onSubmit={(e) => { e.preventDefault(); processLogin(); }} style={styles.form}>
          {/* Username Field */}
          <div style={styles.inputGroup}>
            <label style={isMobile ? styles.mobileLabel : styles.label} htmlFor="username">
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
                  ...(isMobile ? styles.mobileInput : styles.input),
                  ...(getFieldError('username') ? styles.inputError : {})
                }}
                autoComplete="username"
                autoFocus={!isMobile}
                className="admin-login-input"
              />
              <span style={isMobile ? styles.mobileInputIcon : styles.inputIcon}>👤</span>
            </div>
            {getFieldError('username') && (
              <span style={isMobile ? styles.mobileErrorMessage : styles.errorMessage}>
                {getFieldError('username')}
              </span>
            )}
          </div>

          {/* Password Field */}
          <div style={styles.inputGroup}>
            <label style={isMobile ? styles.mobileLabel : styles.label} htmlFor="password">
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
                  ...(isMobile ? styles.mobileInput : styles.input),
                  ...(getFieldError('password') ? styles.inputError : {})
                }}
                autoComplete="current-password"
                className="admin-login-input"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={isMobile ? styles.mobilePasswordToggle : styles.passwordToggle}
                disabled={isLoading}
                className="mobile-tap-target"
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
            {getFieldError('password') && (
              <span style={isMobile ? styles.mobileErrorMessage : styles.errorMessage}>
                {getFieldError('password')}
              </span>
            )}
          </div>

          {/* Remember Me */}
          <div style={styles.checkboxGroup}>
            <label style={isMobile ? styles.mobileCheckboxLabel : styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={credentials.rememberMe}
                onChange={(e) => updateCredentials('rememberMe', e.target.checked)}
                style={isMobile ? styles.mobileCheckbox : styles.checkbox}
                disabled={isLoading}
              />
              <span style={isMobile ? styles.mobileCheckboxText : styles.checkboxText}>
                Remember me
              </span>
            </label>
          </div>

          {/* Error Display */}
          {error && (
            <div style={isMobile ? styles.mobileErrorAlert : styles.errorAlert}>
              <span style={isMobile ? styles.mobileErrorIcon : styles.errorIcon}>⚠️</span>
              <span>{error.message}</span>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!canSubmit}
            style={{
              ...(isMobile ? styles.mobileSubmitButton : styles.submitButton),
              ...(canSubmit ? styles.submitButtonEnabled : styles.submitButtonDisabled)
            }}
            className="mobile-tap-target"
          >
            {isLoading ? (
              <span style={isMobile ? styles.mobileLoadingText : styles.loadingText}>
                <div style={styles.buttonLogoContainer}>
                  <img 
                    src={Logo} 
                    alt="Loading" 
                    style={styles.buttonLogo}
                    className="logo-pulse"
                  />
                </div>
                Signing In...
              </span>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        {/* Footer */}
        <div style={isMobile ? styles.mobileFooter : styles.footer}>
          <p style={isMobile ? styles.mobileFooterText : styles.footerText}>
            Secure admin access • VTU Management System
          </p>
        </div>
      </div>
    </div>
  );
};

// Updated styles with mobile responsiveness
const styles = {
  // Desktop Styles
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
    transform: 'translateY(-14vh)'
  } as React.CSSProperties,

  header: {
    textAlign: 'center' as const,
    marginBottom: '40px',
    position: 'relative' as const,
    paddingTop: '120px'
  },

  logo: {
    position: 'absolute' as const,
    top: '0px',
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10
  },

  logoImage: {
    width: '190px',
    height: '190px',
    objectFit: 'contain' as const
  },

  title: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#ff2b2b',
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
    border: '2px solid #e1e5e9',
    borderRadius: '12px',
    outline: 'none',
    transition: 'all 0.2s ease-in-out',
    backgroundColor: '#ffffff',
    boxSizing: 'border-box' as const,
    color: '#000000',
    fontWeight: '600',
    fontFamily: 'inherit',
    WebkitTextFillColor: '#000000',
    opacity: 1,
  } as React.CSSProperties,

  inputError: {
    borderColor: '#ff3b30',
    backgroundColor: '#ffffff'
  },

  inputIcon: {
    position: 'absolute' as const,
    right: '16px',
    fontSize: '18px',
    color: '#666666',
    pointerEvents: 'none' as const,
    zIndex: 1
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
    justifyContent: 'center',
    zIndex: 2
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
    cursor: 'pointer',
    width: '18px',
    height: '18px'
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
    gap: '12px'
  },

  submitButtonEnabled: {
    backgroundColor: '#ff2b2b',
    color: '#ffffff',
    boxShadow: '0 4px 14px 0 rgba(255, 43, 43, 0.3)'
  },

  submitButtonDisabled: {
    backgroundColor: '#cccccc',
    color: '#999999',
    cursor: 'not-allowed'
  },

  loadingText: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    fontSize: '16px',
    fontWeight: '600'
  },

  buttonLogoContainer: {
    width: '24px',
    height: '24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },

  buttonLogo: {
    width: '100%',
    height: '100%',
    objectFit: 'contain' as const
  },

  // Desktop Loader Styles
  loaderContainer: {
    display: 'flex',
    flexDirection: 'column' as const,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    minWidth: '100vw',
    backgroundColor: '#f8f9fa',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    margin: 0,
    zIndex: 1000
  } as React.CSSProperties,

  logoLoader: {
    marginBottom: '32px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center'
  },

  logoLoaderImage: {
    width: '120px',
    height: '120px',
    objectFit: 'contain' as const
  },

  loaderText: {
    textAlign: 'center' as const
  },

  loaderMessage: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#333333',
    margin: '0 0 8px 0'
  },

  loaderSubMessage: {
    fontSize: '14px',
    color: '#666666',
    margin: '0',
    fontWeight: '500'
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
  },

  // Mobile Styles
  mobileContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'flex-start',
    minHeight: '100vh',
    width: '100vw',
    backgroundColor: '#f8f9fa',
    padding: '16px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    margin: 0,
    boxSizing: 'border-box' as const,
    overflowY: 'auto' as const,
    WebkitOverflowScrolling: 'touch' as const
  } as React.CSSProperties,

  mobileLoginCard: {
    width: '100%',
    maxWidth: '400px',
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    padding: '32px 24px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
    border: '1px solid #e1e1e1',
    margin: 'auto',
    marginTop: '8vh'
  } as React.CSSProperties,

  mobileHeader: {
    textAlign: 'center' as const,
    marginBottom: '32px',
    position: 'relative' as const,
    paddingTop: '100px'
  },

  mobileLogo: {
    position: 'absolute' as const,
    top: '0px',
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10
  },

  mobileLogoImage: {
    width: '150px',
    height: '150px',
    objectFit: 'contain' as const
  },

  mobileTitle: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#ff2b2b',
    margin: '0 0 8px 0',
    letterSpacing: '-0.3px'
  },

  mobileSubtitle: {
    fontSize: '14px',
    color: '#666666',
    margin: '0',
    fontWeight: '400',
    lineHeight: '1.4'
  },

  mobileLabel: {
    display: 'block',
    fontSize: '13px',
    fontWeight: '600',
    color: '#333333',
    marginBottom: '8px'
  },

  mobileInput: {
    width: '100%',
    padding: '14px 50px 14px 16px',
    fontSize: '15px',
    border: '2px solid #e1e5e9',
    borderRadius: '10px',
    outline: 'none',
    transition: 'all 0.2s ease-in-out',
    backgroundColor: '#ffffff',
    boxSizing: 'border-box' as const,
    color: '#000000',
    fontWeight: '600',
    fontFamily: 'inherit',
    WebkitTextFillColor: '#000000',
    opacity: 1,
    WebkitAppearance: 'none' as const,
    MozAppearance: 'textfield' as const
  } as React.CSSProperties,

  mobileInputIcon: {
    position: 'absolute' as const,
    right: '16px',
    fontSize: '16px',
    color: '#666666',
    pointerEvents: 'none' as const,
    zIndex: 1
  },

  mobilePasswordToggle: {
    position: 'absolute' as const,
    right: '16px',
    background: 'none',
    border: 'none',
    fontSize: '16px',
    cursor: 'pointer',
    color: '#666666',
    padding: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
    minWidth: '44px',
    minHeight: '44px'
  },

  mobileCheckboxLabel: {
    display: 'flex',
    alignItems: 'center',
    cursor: 'pointer',
    fontSize: '13px'
  },

  mobileCheckbox: {
    marginRight: '8px',
    cursor: 'pointer',
    width: '20px',
    height: '20px',
    minWidth: '20px',
    minHeight: '20px'
  },

  mobileCheckboxText: {
    color: '#666666',
    fontWeight: '500',
    fontSize: '13px'
  },

  mobileErrorMessage: {
    display: 'block',
    fontSize: '11px',
    color: '#ff3b30',
    marginTop: '6px',
    fontWeight: '500'
  },

  mobileErrorAlert: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '8px',
    padding: '12px',
    backgroundColor: '#fff5f5',
    border: '1px solid #ff3b30',
    borderRadius: '8px',
    fontSize: '13px',
    color: '#ff3b30',
    marginBottom: '20px',
    fontWeight: '500',
    lineHeight: '1.4'
  },

  mobileErrorIcon: {
    fontSize: '14px',
    flexShrink: 0,
    marginTop: '1px'
  },

  mobileSubmitButton: {
    width: '100%',
    padding: '16px',
    fontSize: '15px',
    fontWeight: '600',
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer',
    transition: 'all 0.2s ease-in-out',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    minHeight: '50px'
  },

  mobileLoadingText: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    fontSize: '15px',
    fontWeight: '600'
  },

  mobileLoaderContainer: {
    display: 'flex',
    flexDirection: 'column' as const,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    width: '100vw',
    backgroundColor: '#f8f9fa',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    margin: 0,
    zIndex: 1000,
    padding: '20px'
  } as React.CSSProperties,

  mobileLogoLoaderImage: {
    width: '100px',
    height: '100px',
    objectFit: 'contain' as const
  },

  mobileLoaderMessage: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#333333',
    margin: '0 0 8px 0',
    textAlign: 'center' as const
  },

  mobileLoaderSubMessage: {
    fontSize: '13px',
    color: '#666666',
    margin: '0',
    fontWeight: '500',
    textAlign: 'center' as const,
    lineHeight: '1.4'
  },

  mobileFooter: {
    textAlign: 'center' as const,
    marginTop: '28px',
    paddingTop: '20px',
    borderTop: '1px solid #f0f0f0'
  },

  mobileFooterText: {
    fontSize: '11px',
    color: '#999999',
    margin: '0',
    fontWeight: '500',
    lineHeight: '1.4'
  }
};

export default AdminLogin;