'use client';

import { useState, useRef, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/Header/page';
import Footer from '@/components/Footer/page';
import { storage } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

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
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

  useEffect(() => {
    const isRemembered = storage.getItem(REMEMBER_ME_KEY) === 'true';
    const rememberedEmail = storage.getItem(REMEMBERED_EMAIL_KEY);
    if (isRemembered && rememberedEmail) {
      setEmailOrPhone(rememberedEmail);
      setRememberMe(true);
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const reason = params.get('reason');
    if (reason === 'inactivity') {
      setErrorMessage('You were logged out due to inactivity. Please log in again.');
    } else if (reason === 'expired') {
      setErrorMessage('Your session has expired. Please log in again.');
    }
  }, []);

  const validateEmailOrPhone = (value: string): string => {
    if (!value.trim()) return 'Email or phone is required';
    const cleaned = value.replace(/[\s\-\(\)]/g, '');
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return '';
    if (/^[\+]?\d{7,15}$/.test(cleaned)) return '';
    return 'Please enter a valid email or phone number';
  };

  const validatePassword = (value: string): string => {
    if (!value.trim()) return 'Password is required';
    if (value.length < 8) return 'Password must be at least 8 characters';
    return '';
  };

  const handleRememberMeChange = (checked: boolean) => {
    setRememberMe(checked);
    if (!checked) {
      storage.removeItem(REMEMBER_ME_KEY);
      storage.removeItem(REMEMBERED_EMAIL_KEY);
    }
  };

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    if (loading) return;

    setErrorMessage('');

    const emailValidationError = validateEmailOrPhone(emailOrPhone);
    const passwordValidationError = validatePassword(password);
    setEmailError(emailValidationError);
    setPasswordError(passwordValidationError);
    if (emailValidationError || passwordValidationError) return;

    setLoading(true);

    try {
      // login() in AuthContext handles the API call and cookie — just pass credentials
      await login({ email: emailOrPhone.trim(), password: password.trim() });

      if (rememberMe) {
        storage.setItem(REMEMBER_ME_KEY, 'true');
        storage.setItem(REMEMBERED_EMAIL_KEY, emailOrPhone.trim());
      } else {
        storage.removeItem(REMEMBER_ME_KEY);
        storage.removeItem(REMEMBERED_EMAIL_KEY);
      }

      router.replace('/dashboard');

    } catch (error: any) {
      const status = error?.response?.status;
      const message = error?.response?.data?.message;

      if (status === 400 || status === 401) {
        setErrorMessage(message || 'Invalid email/phone or password.');
      } else if (status === 429) {
        setErrorMessage('Too many login attempts. Please try again later.');
      } else if (status >= 500) {
        setErrorMessage('Server error. Please try again later.');
      } else if (error.request) {
        setErrorMessage('Cannot reach the server. Please check your connection.');
      } else {
        setErrorMessage(message || 'Login failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header />

      <main className="flex-grow flex items-center justify-center pt-32 sm:pt-35 pb-8 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md mx-auto">
          <div className="bg-white rounded-2xl border-2 border-gray-200 p-6 sm:p-8">
            <div className="text-center mb-8">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Welcome Back</h2>
              <p className="text-sm sm:text-base text-gray-600">Sign in to your account</p>
            </div>

            {errorMessage && (
              <div className="mb-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm font-medium text-center">
                {errorMessage}
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
                  autoComplete="username"
                  value={emailOrPhone}
                  onChange={(e) => { setEmailOrPhone(e.target.value); setEmailError(''); setErrorMessage(''); }}
                  onBlur={() => setEmailError(validateEmailOrPhone(emailOrPhone))}
                  className={`appearance-none block w-full px-4 py-3 border ${
                    emailError ? 'border-red-500 bg-red-50' : 'border-gray-300 bg-white'
                  } placeholder-gray-500 text-gray-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-base transition-colors`}
                  placeholder="Enter your email or phone number"
                  disabled={loading}
                />
                {emailError && <p className="mt-1 text-sm text-red-600 ml-1 font-medium">{emailError}</p>}
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
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setPasswordError(''); setErrorMessage(''); }}
                    onBlur={() => setPasswordError(validatePassword(password))}
                    className={`appearance-none block w-full px-4 py-3 pr-12 border ${
                      passwordError ? 'border-red-500 bg-red-50' : 'border-gray-300 bg-white'
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
                {passwordError && <p className="mt-1 text-sm text-red-600 ml-1 font-medium">{passwordError}</p>}
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
                className={`w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent text-base font-bold rounded-xl text-white ${
                  loading ? 'bg-red-400 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'
                } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors`}
              >
                {loading ? (
  <>
    <span>Authenticating</span>
    <span className="flex items-center gap-1 mt-1">
      <span className="w-2.5 h-2.5 bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
      <span className="w-2.5 h-2.5 bg-white rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
      <span className="w-2.5 h-2.5 bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
    </span>
  </>
) : 'Sign In'}
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

      <Footer />
    </div>
  );
}