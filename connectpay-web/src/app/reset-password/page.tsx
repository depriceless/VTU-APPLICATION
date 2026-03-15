'use client';

import { Suspense } from 'react';
import { useState, useRef, FormEvent, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/Header/page';
import Footer from '@/components/Footer/page';
import apiClient from '@/lib/api';

function ResetPasswordForm() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const token        = searchParams.get('token');

  const passwordRef        = useRef<HTMLInputElement>(null);
  const confirmPasswordRef = useRef<HTMLInputElement>(null);

  const [loading,              setLoading]              = useState(false);
  const [showPassword,         setShowPassword]         = useState(false);
  const [showConfirmPassword,  setShowConfirmPassword]  = useState(false);
  const [passwordError,        setPasswordError]        = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [errorMessage,         setErrorMessage]         = useState('');
  const [success,              setSuccess]              = useState(false);

  useEffect(() => {
    if (!token) {
      setErrorMessage('Invalid or missing reset token. Please request a new password reset link.');
    }
  }, [token]);

  const validatePassword = (v: string) => {
    if (!v) return 'Password is required';
    if (v.length < 8) return 'Password must be at least 8 characters';
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(v)) return 'Must contain uppercase, lowercase, and a number';
    return '';
  };

  const validateConfirm = (v: string, pw: string) => {
    if (!v) return 'Please confirm your password';
    if (v !== pw) return 'Passwords do not match';
    return '';
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (loading || !token) return;
    setErrorMessage('');

    const pw      = passwordRef.current?.value ?? '';
    const confirm = confirmPasswordRef.current?.value ?? '';
    const pwErr      = validatePassword(pw);
    const confirmErr = validateConfirm(confirm, pw);
    setPasswordError(pwErr);
    setConfirmPasswordError(confirmErr);
    if (pwErr || confirmErr) return;

    setLoading(true);
    try {
      await apiClient.post('/auth/reset-password', { token, password: pw });
      setSuccess(true);
      setTimeout(() => router.replace('/login'), 3000);
    } catch (error: any) {
      const status  = error?.response?.status;
      const message = error?.response?.data?.message;
      if (status === 400) setErrorMessage(message || 'Invalid or expired reset link. Please request a new one.');
      else if (status === 429) setErrorMessage('Too many attempts. Please try again later.');
      else if (status >= 500) setErrorMessage('Server error. Please try again later.');
      else if (error.request) setErrorMessage('Cannot reach the server. Please check your connection.');
      else setErrorMessage(message || 'Something went wrong. Please try again.');
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
              <div className={`w-16 h-16 rounded-full flex items-center justify-center ${success ? 'bg-green-50' : 'bg-red-50'}`}>
                {success ? (
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                )}
              </div>
            </div>

            {success ? (
              <div className="text-center py-2">
                <h2 className="text-2xl font-bold text-gray-900 mb-3">Password Reset!</h2>
                <p className="text-sm text-gray-500 leading-relaxed mb-6">
                  Your password has been updated successfully. Redirecting you to the login page...
                </p>
                <div className="flex justify-center mb-6">
                  <div className="w-8 h-8 border-4 border-red-100 border-t-red-600 rounded-full animate-spin" />
                </div>
                <Link href="/login" className="w-full inline-flex justify-center items-center py-3 px-4 border border-transparent text-base font-bold rounded-xl text-white bg-red-600 hover:bg-red-700 transition-colors">
                  Go to Sign In
                </Link>
              </div>
            ) : (
              <>
                <div className="text-center mb-8">
                  <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Set New Password</h2>
                  <p className="text-sm text-gray-500 leading-relaxed">Choose a strong password for your ConnectPay account.</p>
                </div>

                {errorMessage && (
                  <div className="mb-5 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm font-medium text-center">
                    {errorMessage}
                    {!token && (
                      <div className="mt-2">
                        <Link href="/forgot-password" className="underline font-semibold">Request a new reset link</Link>
                      </div>
                    )}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">New Password</label>
                    <div className="relative">
                      <input
                        ref={passwordRef} id="password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="new-password" placeholder="Enter new password"
                        disabled={loading || !token}
                        onChange={() => { setPasswordError(''); setErrorMessage(''); }}
                        onBlur={() => setPasswordError(validatePassword(passwordRef.current?.value ?? ''))}
                        className={`appearance-none block w-full px-4 py-3 pr-12 border ${passwordError ? 'border-red-500 bg-red-50' : 'border-gray-300 bg-white'} placeholder-gray-500 text-gray-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-base transition-colors`}
                      />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-800">
                        {showPassword
                          ? <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                          : <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                        }
                      </button>
                    </div>
                    {passwordError && <p className="mt-1 text-sm text-red-600 ml-1 font-medium">{passwordError}</p>}
                    <p className="mt-1 text-xs text-gray-400 ml-1">Min 8 characters, uppercase, lowercase, and a number</p>
                  </div>

                  <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-semibold text-gray-700 mb-2">Confirm New Password</label>
                    <div className="relative">
                      <input
                        ref={confirmPasswordRef} id="confirmPassword"
                        type={showConfirmPassword ? 'text' : 'password'}
                        autoComplete="new-password" placeholder="Confirm new password"
                        disabled={loading || !token}
                        onChange={() => { setConfirmPasswordError(''); setErrorMessage(''); }}
                        onBlur={() => setConfirmPasswordError(validateConfirm(confirmPasswordRef.current?.value ?? '', passwordRef.current?.value ?? ''))}
                        className={`appearance-none block w-full px-4 py-3 pr-12 border ${confirmPasswordError ? 'border-red-500 bg-red-50' : 'border-gray-300 bg-white'} placeholder-gray-500 text-gray-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-base transition-colors`}
                      />
                      <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-800">
                        {showConfirmPassword
                          ? <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                          : <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                        }
                      </button>
                    </div>
                    {confirmPasswordError && <p className="mt-1 text-sm text-red-600 ml-1 font-medium">{confirmPasswordError}</p>}
                  </div>

                  <button
                    type="submit" disabled={loading || !token}
                    className={`w-full flex justify-center items-center py-3 px-4 border border-transparent text-base font-bold rounded-xl text-white transition-colors ${loading || !token ? 'bg-red-300 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500`}
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Resetting...
                      </span>
                    ) : 'Reset Password'}
                  </button>

                  <div className="text-center pt-1">
                    <Link href="/login" className="text-sm font-semibold text-red-600 hover:text-red-700">Back to Sign In</Link>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-red-100 border-t-red-600 rounded-full animate-spin" />
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}