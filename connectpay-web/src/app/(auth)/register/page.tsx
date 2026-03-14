'use client';

import { useState, useRef, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/Header/page';
import Footer from '@/components/Footer/page';
import apiClient from '@/lib/api';

export default function RegisterPage() {
  const router = useRouter();

  const nameRef            = useRef<HTMLInputElement>(null);
  const usernameRef        = useRef<HTMLInputElement>(null);
  const emailRef           = useRef<HTMLInputElement>(null);
  const phoneRef           = useRef<HTMLInputElement>(null);
  const passwordRef        = useRef<HTMLInputElement>(null);
  const confirmPasswordRef = useRef<HTMLInputElement>(null);

  const [name,            setName]            = useState('');
  const [username,        setUsername]        = useState('');
  const [email,           setEmail]           = useState('');
  const [phone,           setPhone]           = useState('');
  const [password,        setPassword]        = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading,         setLoading]         = useState(false);
  const [errorMessage,    setErrorMessage]    = useState('');
  const [successMessage,  setSuccessMessage]  = useState('');
  const [showPassword,        setShowPassword]        = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreeToTerms,    setAgreeToTerms]    = useState(false);

  const [nameError,            setNameError]            = useState('');
  const [usernameError,        setUsernameError]        = useState('');
  const [emailError,           setEmailError]           = useState('');
  const [phoneError,           setPhoneError]           = useState('');
  const [passwordError,        setPasswordError]        = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');

  const validateName = (v: string) => {
    if (!v.trim()) return 'Full name is required';
    if (v.trim().length < 3) return 'Name must be at least 3 characters';
    return '';
  };

  const validateUsername = (v: string) => {
    if (!v.trim()) return 'Username is required';
    if (v.trim().length < 3) return 'Username must be at least 3 characters';
    if (v.trim().length > 30) return 'Username must be at most 30 characters';
    if (!/^[a-zA-Z0-9._-]+$/.test(v.trim())) return 'Only letters, numbers, . _ - allowed';
    return '';
  };

  const validateEmail = (v: string) => {
    if (!v.trim()) return 'Email is required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return 'Please enter a valid email address';
    return '';
  };

  const validatePhone = (v: string) => {
    if (!v.trim()) return 'Phone number is required';
    if (!/^[\+]?\d{10,15}$/.test(v.replace(/[\s\-\(\)]/g, ''))) return 'Please enter a valid phone number';
    return '';
  };

  const validatePassword = (v: string) => {
    if (!v) return 'Password is required';
    if (v.length < 8) return 'Password must be at least 8 characters';
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(v)) return 'Password must contain uppercase, lowercase, and a number';
    return '';
  };

  const validateConfirmPassword = (v: string, pw: string) => {
    if (!v) return 'Please confirm your password';
    if (v !== pw) return 'Passwords do not match';
    return '';
  };

  const handleRegister = async (e: FormEvent) => {
    e.preventDefault();
    if (loading) return;

    setErrorMessage('');
    setSuccessMessage('');

    const nameErr     = validateName(name);
    const usernameErr = validateUsername(username);
    const emailErr    = validateEmail(email);
    const phoneErr    = validatePhone(phone);
    const passErr     = validatePassword(password);
    const confirmErr  = validateConfirmPassword(confirmPassword, password);

    setNameError(nameErr);
    setUsernameError(usernameErr);
    setEmailError(emailErr);
    setPhoneError(phoneErr);
    setPasswordError(passErr);
    setConfirmPasswordError(confirmErr);

    if (nameErr || usernameErr || emailErr || phoneErr || passErr || confirmErr) return;

    if (!agreeToTerms) {
      setErrorMessage('You must agree to the Terms and Conditions');
      return;
    }

    setLoading(true);

    try {
      await apiClient.post('/auth/signup', {
        name:     name.trim(),
        username: username.trim(),
        email:    email.trim().toLowerCase(),
        phone:    phone.trim().replace(/[\s\-\(\)]/g, ''),
        password: password.trim(),
      });

      setSuccessMessage('Account created! Redirecting to login...');
      router.push('/login');

    } catch (error: any) {
      if (error.response) {
        const status  = error.response.status;
        const message = error.response.data?.message;
        const errors  = error.response.data?.errors;

        if (status === 409) {
          setErrorMessage(message || 'Email, phone, or username already exists.');
        } else if (status === 400 || status === 422) {
          if (errors?.length) {
            setErrorMessage(errors[0].msg || 'Invalid input data provided.');
          } else {
            setErrorMessage(message || 'Invalid input data provided.');
          }
        } else if (status === 429) {
          setErrorMessage('Too many registration attempts. Please try again later.');
        } else if (status >= 500) {
          setErrorMessage('Server error. Please try again later.');
        } else {
          setErrorMessage(message || 'Registration failed. Please try again.');
        }
      } else if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        setErrorMessage('Request timed out. Please check your internet connection.');
      } else if (error.request) {
        setErrorMessage('Cannot reach the server. Please check your internet connection.');
      } else {
        setErrorMessage('An unexpected error occurred. Please try again.');
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
          <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8">

            <div className="text-center mb-8">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Create Account</h2>
              <p className="text-sm sm:text-base text-gray-600">Join us today and get started</p>
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

            <form onSubmit={handleRegister} className="space-y-5">

              {/* Full Name */}
              <div>
                <label htmlFor="name" className="block text-sm font-semibold text-gray-700 mb-2">Full Name</label>
                <input
                  ref={nameRef}
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => { setName(e.target.value); setNameError(''); setErrorMessage(''); }}
                  onBlur={() => setNameError(validateName(name))}
                  autoComplete="name"
                  placeholder="Enter your full name"
                  disabled={loading}
                  className={`appearance-none block w-full px-4 py-3 border ${nameError ? 'border-red-500 bg-red-50' : 'border-gray-300 bg-white'} placeholder-gray-500 text-gray-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-base transition-colors`}
                />
                {nameError && <p className="mt-1 text-sm text-red-600 ml-1 font-medium">{nameError}</p>}
              </div>

              {/* Username */}
              <div>
                <label htmlFor="username" className="block text-sm font-semibold text-gray-700 mb-2">Username</label>
                <input
                  ref={usernameRef}
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => { setUsername(e.target.value); setUsernameError(''); setErrorMessage(''); }}
                  onBlur={() => setUsernameError(validateUsername(username))}
                  autoComplete="username"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  placeholder="Choose a username (e.g. john_doe)"
                  disabled={loading}
                  className={`appearance-none block w-full px-4 py-3 border ${usernameError ? 'border-red-500 bg-red-50' : 'border-gray-300 bg-white'} placeholder-gray-500 text-gray-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-base transition-colors`}
                />
                {usernameError && <p className="mt-1 text-sm text-red-600 ml-1 font-medium">{usernameError}</p>}
              </div>

              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">Email Address</label>
                <input
                  ref={emailRef}
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setEmailError(''); setErrorMessage(''); }}
                  onBlur={() => setEmailError(validateEmail(email))}
                  autoComplete="email"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  placeholder="Enter your email address"
                  disabled={loading}
                  className={`appearance-none block w-full px-4 py-3 border ${emailError ? 'border-red-500 bg-red-50' : 'border-gray-300 bg-white'} placeholder-gray-500 text-gray-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-base transition-colors`}
                />
                {emailError && <p className="mt-1 text-sm text-red-600 ml-1 font-medium">{emailError}</p>}
              </div>

              {/* Phone */}
              <div>
                <label htmlFor="phone" className="block text-sm font-semibold text-gray-700 mb-2">Phone Number</label>
                <input
                  ref={phoneRef}
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => { setPhone(e.target.value); setPhoneError(''); setErrorMessage(''); }}
                  onBlur={() => setPhoneError(validatePhone(phone))}
                  autoComplete="tel"
                  placeholder="Enter your phone number"
                  disabled={loading}
                  className={`appearance-none block w-full px-4 py-3 border ${phoneError ? 'border-red-500 bg-red-50' : 'border-gray-300 bg-white'} placeholder-gray-500 text-gray-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-base transition-colors`}
                />
                {phoneError && <p className="mt-1 text-sm text-red-600 ml-1 font-medium">{phoneError}</p>}
              </div>

              {/* Password */}
              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">Password</label>
                <div className="relative">
                  <input
                    ref={passwordRef}
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setPasswordError(''); setErrorMessage(''); }}
                    onBlur={() => setPasswordError(validatePassword(password))}
                    autoComplete="new-password"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    placeholder="Create a strong password"
                    disabled={loading}
                    className={`appearance-none block w-full px-4 py-3 pr-12 border ${passwordError ? 'border-red-500 bg-red-50' : 'border-gray-300 bg-white'} placeholder-gray-500 text-gray-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-base transition-colors`}
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Hide password' : 'Show password'} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-800">
                    {showPassword ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    )}
                  </button>
                </div>
                {passwordError && <p className="mt-1 text-sm text-red-600 ml-1 font-medium">{passwordError}</p>}
              </div>

              {/* Confirm Password */}
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-semibold text-gray-700 mb-2">Confirm Password</label>
                <div className="relative">
                  <input
                    ref={confirmPasswordRef}
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => { setConfirmPassword(e.target.value); setConfirmPasswordError(''); setErrorMessage(''); }}
                    onBlur={() => setConfirmPasswordError(validateConfirmPassword(confirmPassword, password))}
                    autoComplete="new-password"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    placeholder="Confirm your password"
                    disabled={loading}
                    className={`appearance-none block w-full px-4 py-3 pr-12 border ${confirmPasswordError ? 'border-red-500 bg-red-50' : 'border-gray-300 bg-white'} placeholder-gray-500 text-gray-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-base transition-colors`}
                  />
                  <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} aria-label={showConfirmPassword ? 'Hide password' : 'Show password'} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-800">
                    {showConfirmPassword ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    )}
                  </button>
                </div>
                {confirmPasswordError && <p className="mt-1 text-sm text-red-600 ml-1 font-medium">{confirmPasswordError}</p>}
              </div>

              {/* Terms */}
              <div className="flex items-start">
                <input
                  id="terms"
                  type="checkbox"
                  checked={agreeToTerms}
                  onChange={(e) => setAgreeToTerms(e.target.checked)}
                  className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded mt-1"
                />
                <label htmlFor="terms" className="ml-2 block text-sm text-gray-700">
                  I agree to the{' '}
                  <Link href="/terms" className="text-red-600 hover:text-red-700 font-semibold">Terms and Conditions</Link>
                  {' '}and{' '}
                  <Link href="/privacy" className="text-red-600 hover:text-red-700 font-semibold">Privacy Policy</Link>
                </label>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className={`w-full flex justify-center items-center py-3 px-4 border border-transparent text-base font-bold rounded-xl text-white ${
                  loading ? 'bg-red-300 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'
                } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors`}
              >
                {loading ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Creating account...
                  </span>
                ) : (
                  'Create Account'
                )}
              </button>

              <div className="text-center pt-2">
                <p className="text-sm text-gray-600">
                  Already have an account?{' '}
                  <Link href="/login" className="font-semibold text-red-600 hover:text-red-700">Sign In</Link>
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