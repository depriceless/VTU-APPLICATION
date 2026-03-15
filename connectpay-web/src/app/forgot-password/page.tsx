'use client';

import { useState, useRef, FormEvent } from 'react';
import Link from 'next/link';
import Header from '@/components/Header/page';
import Footer from '@/components/Footer/page';
import apiClient from '@/lib/api';

export default function ForgotPasswordPage() {
  const inputRef = useRef<HTMLInputElement>(null);

  const [loading,      setLoading]      = useState(false);
  const [inputError,   setInputError]   = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [submitted,    setSubmitted]    = useState(false);

  const validate = (value: string): string => {
    if (!value.trim()) return 'Email or phone number is required';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^\d{10,15}$/;
    const cleaned    = value.replace(/[\s\-\(\)]/g, '');
    if (!emailRegex.test(value) && !phoneRegex.test(cleaned)) {
      return 'Please enter a valid email or phone number';
    }
    return '';
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (loading) return;

    const value = (inputRef.current?.value ?? '').trim();
    const err   = validate(value);
    setInputError(err);
    setErrorMessage('');
    if (err) return;

    setLoading(true);

    try {
      await apiClient.post('/auth/forgot-password', {
        email: value.toLowerCase(),
      });

      setSubmitted(true);

    } catch (error: any) {
      const status  = error?.response?.status;
      const message = error?.response?.data?.message;

      if (status === 429) {
        setErrorMessage('Too many attempts. Please try again later.');
      } else if (status >= 500) {
        setErrorMessage('Server error. Please try again later.');
      } else if (error.request) {
        setErrorMessage('Cannot reach the server. Please check your connection.');
      } else {
        setErrorMessage(message || 'Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header />

      <main className="flex-grow flex items-center justify-center pt-32 pb-8 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md mx-auto">
          <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8">

            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
              </div>
            </div>

            {!submitted ? (
              <>
                <div className="text-center mb-8">
                  <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Forgot Password?</h2>
                  <p className="text-sm text-gray-500 leading-relaxed">
                    Enter your email or phone number and we will send you instructions to reset your password.
                  </p>
                </div>

                {errorMessage && (
                  <div className="mb-5 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm font-medium text-center">
                    {errorMessage}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label htmlFor="emailOrPhone" className="block text-sm font-semibold text-gray-700 mb-2">
                      Email or Phone Number
                    </label>
                    <input
                      ref={inputRef}
                      id="emailOrPhone"
                      name="emailOrPhone"
                      type="text"
                      autoComplete="email"
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                      inputMode="email"
                      placeholder="Enter your email or phone number"
                      disabled={loading}
                      onChange={() => { setInputError(''); setErrorMessage(''); }}
                      onBlur={() => setInputError(validate(inputRef.current?.value ?? ''))}
                      className={`appearance-none block w-full px-4 py-3 border ${
                        inputError ? 'border-red-500 bg-red-50' : 'border-gray-300 bg-white'
                      } placeholder-gray-500 text-gray-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-base transition-colors`}
                    />
                    {inputError && (
                      <p className="mt-1 text-sm text-red-600 ml-1 font-medium">{inputError}</p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className={`w-full flex justify-center items-center py-3 px-4 border border-transparent text-base font-bold rounded-xl text-white transition-colors ${
                      loading ? 'bg-red-400 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'
                    } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500`}
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Sending...
                      </span>
                    ) : 'Send Reset Link'}
                  </button>

                  <div className="text-center pt-1">
                    <Link href="/login" className="text-sm font-semibold text-red-600 hover:text-red-700">
                      Remember your password? Sign in
                    </Link>
                  </div>
                </form>
              </>
            ) : (
              <div className="text-center py-4">
                <div className="flex justify-center mb-6">
                  <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center">
                    <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>

                <h2 className="text-2xl font-bold text-gray-900 mb-3">Check Your Email</h2>
                <p className="text-sm text-gray-500 leading-relaxed mb-8">
                  If an account exists for that email or phone number, password reset instructions have been sent. Please check your inbox and spam folder.
                </p>

                <Link
                  href="/login"
                  className="w-full inline-flex justify-center items-center py-3 px-4 border border-transparent text-base font-bold rounded-xl text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
                >
                  Back to Sign In
                </Link>
              </div>
            )}

          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}