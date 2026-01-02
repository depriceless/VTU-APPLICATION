// Login Page with Remember Me functionality
'use client';

import { useState, useRef, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/Header/page';
import Footer from '@/components/Footer/page';
import apiClient, { storage, TOKEN_KEY } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

// Keys for storing remembered credentials
const REMEMBER_ME_KEY = 'rememberMe';
const REMEMBERED_EMAIL_KEY = 'rememberedEmail';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

  // Load remembered credentials on component mount
  useEffect(() => {
    const isRemembered = localStorage.getItem(REMEMBER_ME_KEY) === 'true';
    const rememberedEmail = localStorage.getItem(REMEMBERED_EMAIL_KEY);
    
    if (isRemembered && rememberedEmail) {
      setEmailOrPhone(rememberedEmail);
      setRememberMe(true);
    }
  }, []);

  // Add this after the other useEffect hooks in your login page

useEffect(() => {
  // Check for logout reason in URL params
  const params = new URLSearchParams(window.location.search);
  const reason = params.get('reason');
  
  if (reason === 'inactivity') {
    setErrorMessage('You were logged out due to inactivity. Please log in again.');
  } else if (reason === 'expired') {
    setErrorMessage('Your session has expired. Please log in again.');
  }
}, []);

  const validateEmailOrPhone = (value: string): string => {
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

  const validatePassword = (value: string): string => {
    if (!value.trim()) {
      return 'Password is required';
    }
    if (value.length < 6) {
      return 'Password must be at least 6 characters';
    }
    return '';
  };

  const handleEmailChange = (value: string) => {
    setEmailOrPhone(value);
    setEmailError('');
    setErrorMessage('');
  };

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    setPasswordError('');
    setErrorMessage('');
  };

  const handleRememberMeChange = (checked: boolean) => {
    setRememberMe(checked);
    
    // If unchecked, clear remembered credentials immediately
    if (!checked) {
      localStorage.removeItem(REMEMBER_ME_KEY);
      localStorage.removeItem(REMEMBERED_EMAIL_KEY);
    }
  };

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    
    if (loading) return;

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
          
          storage.setItem(TOKEN_KEY, token);
          console.log('💾 Token saved to localStorage');
          
          const verifyToken = storage.getItem(TOKEN_KEY);
          console.log('🔍 Token verification:', verifyToken ? 'CONFIRMED ✅' : 'FAILED ❌');
          
          if (!verifyToken) {
            throw new Error('Token save verification failed');
          }

          // Save or remove remembered credentials based on checkbox
          if (rememberMe) {
            localStorage.setItem(REMEMBER_ME_KEY, 'true');
            localStorage.setItem(REMEMBERED_EMAIL_KEY, emailOrPhone.trim());
            console.log('💾 Credentials remembered');
          } else {
            localStorage.removeItem(REMEMBER_ME_KEY);
            localStorage.removeItem(REMEMBERED_EMAIL_KEY);
            console.log('🗑️ Credentials not remembered');
          }
          
          setSuccessMessage('Login successful! Redirecting...');
          
          try {
            console.log('🔄 Calling AuthContext login...');
            await login(token);
            console.log('✅ AuthContext login completed');
          } catch (loginError) {
            console.warn('⚠️ AuthContext login failed, but token is saved:', loginError);
          }
          
          console.log('🚀 Redirecting to dashboard...');
          await router.replace('/dashboard');
          
        } else {
          console.log('❌ No token in response');
          setErrorMessage('Login failed. No authentication token received.');
        }
      }

    } catch (error: any) {
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
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <Header />
      
      {/* Main Content - Lower on both mobile and desktop */}
      <main className="flex-grow flex items-center justify-center pt-32 sm:pt-35 pb-8 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md mx-auto">
          <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8">
            {/* Login Form Header */}
            <div className="text-center mb-8">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                Welcome Back
              </h2>
              <p className="text-sm sm:text-base text-gray-600">
                Sign in to your account
              </p>
            </div>

            {errorMessage && (
              <div className="mb-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm font-medium text-center">
                {errorMessage}
              </div>
            )}
            
            {successMessage && (
              <div className="mb-6 bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-lg text-sm font-medium text-center">
                {successMessage}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label htmlFor="emailOrPhone" className="block text-sm font-semibold text-gray-700 mb-2">
                  Email or Phone Number
                </label>
                <input
                  ref={emailRef}
                  id="emailOrPhone"
                  type="text"
                  value={emailOrPhone}
                  onChange={(e) => handleEmailChange(e.target.value)}
                  onBlur={() => {
                    const error = validateEmailOrPhone(emailOrPhone);
                    setEmailError(error);
                  }}
                  className={`appearance-none relative block w-full px-4 py-3 border ${
                    errorMessage || emailError ? 'border-red-500 bg-red-50' : 'border-gray-300 bg-white'
                  } placeholder-gray-500 text-gray-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-base transition-colors`}
                  placeholder="Enter your email or phone number"
                  disabled={loading}
                />
                {emailError && (
                  <p className="mt-1 text-sm text-red-600 ml-1 font-medium">{emailError}</p>
                )}
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <input
                    ref={passwordRef}
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => handlePasswordChange(e.target.value)}
                    onBlur={() => {
                      const error = validatePassword(password);
                      setPasswordError(error);
                    }}
                    className={`appearance-none relative block w-full px-4 py-3 pr-12 border ${
                      errorMessage || passwordError ? 'border-red-500 bg-red-50' : 'border-gray-300 bg-white'
                    } placeholder-gray-500 text-gray-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-base transition-colors`}
                    placeholder="Enter your password"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-800"
                  >
                    {showPassword ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
                {passwordError && (
                  <p className="mt-1 text-sm text-red-600 ml-1 font-medium">{passwordError}</p>
                )}
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input
                    id="remember-me"
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => handleRememberMeChange(e.target.checked)}
                    className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded cursor-pointer"
                  />
                  <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700 cursor-pointer">
                    Remember me
                  </label>
                </div>
                <Link href="/forgot-password" className="text-sm font-semibold text-red-600 hover:text-red-700">
                  Forgot Password?
                </Link>
              </div>

              <button
                type="submit"
                disabled={loading}
                className={`group relative w-full flex justify-center py-3 px-4 border border-transparent text-base font-bold rounded-xl text-white ${
                  loading ? 'bg-red-300 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'
                } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors`}
              >
                {loading ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Signing in...
                  </span>
                ) : (
                  'Sign In'
                )}
              </button>

              <div className="text-center pt-2">
                <p className="text-sm text-gray-600">
                  Don&apos;t have an account?{' '}
                  <Link href="/register" className="font-semibold text-red-600 hover:text-red-700">
                    Create Account
                  </Link>
                </p>
              </div>
            </form>
          </div>
        </div>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}