'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header/page';
import Footer from '@/components/Footer/page';
import apiClient from '@/lib/api';

export default function PinSetupPage() {
  const router = useRouter();

  // 4 individual digit inputs — same UX feel as a mobile PIN pad
  const [pin,        setPin]        = useState(['', '', '', '']);
  const [confirmPin, setConfirmPin] = useState(['', '', '', '']);
  const [step,       setStep]       = useState<'enter' | 'confirm'>('enter');
  const [loading,    setLoading]    = useState(false);
  const [errorMsg,   setErrorMsg]   = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const pinRefs    = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];
  const confirmRefs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];

  // Auto-focus first box on mount
  useEffect(() => { pinRefs[0].current?.focus(); }, []);

  // Auto-focus first confirm box when step changes
  useEffect(() => {
    if (step === 'confirm') {
      setTimeout(() => confirmRefs[0].current?.focus(), 50);
    }
  }, [step]);

  const handlePinChange = (
    index: number,
    value: string,
    current: string[],
    setCurrent: (v: string[]) => void,
    refs: React.RefObject<HTMLInputElement>[]
  ) => {
    if (!/^\d?$/.test(value)) return; // digits only

    const updated = [...current];
    updated[index] = value;
    setCurrent(updated);
    setErrorMsg('');

    // Move to next box
    if (value && index < 3) {
      refs[index + 1].current?.focus();
    }

    // Auto-advance step when all 4 digits entered
    if (step === 'enter' && updated.every(d => d !== '')) {
      setTimeout(() => setStep('confirm'), 100);
    }
  };

  const handlePinKeyDown = (
    index: number,
    e: React.KeyboardEvent,
    current: string[],
    setCurrent: (v: string[]) => void,
    refs: React.RefObject<HTMLInputElement>[]
  ) => {
    if (e.key === 'Backspace' && !current[index] && index > 0) {
      refs[index - 1].current?.focus();
    }
  };

  const handleSubmit = async () => {
    const pinStr     = pin.join('');
    const confirmStr = confirmPin.join('');

    if (pinStr.length < 4) {
      setErrorMsg('Please enter all 4 digits.');
      return;
    }
    if (confirmStr.length < 4) {
      setErrorMsg('Please confirm all 4 digits.');
      return;
    }
    if (pinStr !== confirmStr) {
      setErrorMsg('PINs do not match. Please try again.');
      setConfirmPin(['', '', '', '']);
      setTimeout(() => confirmRefs[0].current?.focus(), 50);
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      await apiClient.post('/auth/setup-pin', { pin: pinStr });
      setSuccessMsg('PIN set up successfully! Taking you to your dashboard...');
      setTimeout(() => router.replace('/dashboard'), 1500);
    } catch (error: any) {
      const message = error?.response?.data?.message;
      setErrorMsg(message || 'Failed to set up PIN. Please try again.');
      setConfirmPin(['', '', '', '']);
      setTimeout(() => confirmRefs[0].current?.focus(), 50);
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    router.replace('/dashboard');
  };

  const filledDots = (digits: string[]) =>
    digits.map((d, i) => (
      <div
        key={i}
        className={`w-3 h-3 rounded-full transition-all duration-200 ${
          d ? 'bg-red-600 scale-110' : 'bg-gray-200'
        }`}
      />
    ));

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header />

      <main className="flex-grow flex items-center justify-center pt-32 pb-8 px-4">
        <div className="w-full max-w-md mx-auto">
          <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8">

            {/* Icon */}
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
            </div>

            {/* Title */}
            <div className="text-center mb-8">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                {step === 'enter' ? 'Set Up Your PIN' : 'Confirm Your PIN'}
              </h2>
              <p className="text-sm text-gray-500">
                {step === 'enter'
                  ? 'Create a 4-digit PIN to secure your account'
                  : 'Enter your PIN again to confirm'}
              </p>
            </div>

            {/* Dot indicator */}
            <div className="flex justify-center gap-3 mb-8">
              {filledDots(step === 'enter' ? pin : confirmPin)}
            </div>

            {/* Error / Success */}
            {errorMsg && (
              <div className="mb-5 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm font-medium text-center">
                {errorMsg}
              </div>
            )}
            {successMsg && (
              <div className="mb-5 bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-lg text-sm font-medium text-center">
                {successMsg}
              </div>
            )}

            {/* PIN inputs */}
            {step === 'enter' && (
              <div className="flex justify-center gap-4 mb-8">
                {pin.map((digit, i) => (
                  <input
                    key={i}
                    ref={pinRefs[i]}
                    type="password"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handlePinChange(i, e.target.value, pin, setPin, pinRefs)}
                    onKeyDown={(e) => handlePinKeyDown(i, e, pin, setPin, pinRefs)}
                    className="w-14 h-14 text-center text-2xl font-bold border-2 border-gray-300 rounded-xl focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100 transition-colors bg-gray-50"
                    disabled={loading}
                  />
                ))}
              </div>
            )}

            {step === 'confirm' && (
              <div className="flex justify-center gap-4 mb-8">
                {confirmPin.map((digit, i) => (
                  <input
                    key={i}
                    ref={confirmRefs[i]}
                    type="password"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handlePinChange(i, e.target.value, confirmPin, setConfirmPin, confirmRefs)}
                    onKeyDown={(e) => handlePinKeyDown(i, e, confirmPin, setConfirmPin, confirmRefs)}
                    className="w-14 h-14 text-center text-2xl font-bold border-2 border-gray-300 rounded-xl focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100 transition-colors bg-gray-50"
                    disabled={loading}
                  />
                ))}
              </div>
            )}

            {/* Buttons */}
            <div className="space-y-3">
              {step === 'confirm' && (
                <button
                  onClick={handleSubmit}
                  disabled={loading || confirmPin.some(d => !d)}
                  className={`w-full flex justify-center items-center py-3 px-4 border border-transparent text-base font-bold rounded-xl text-white transition-colors ${
                    loading || confirmPin.some(d => !d)
                      ? 'bg-red-300 cursor-not-allowed'
                      : 'bg-red-600 hover:bg-red-700'
                  } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500`}
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Setting up PIN...
                    </span>
                  ) : 'Confirm PIN'}
                </button>
              )}

              {step === 'confirm' && (
                <button
                  type="button"
                  onClick={() => {
                    setStep('enter');
                    setPin(['', '', '', '']);
                    setConfirmPin(['', '', '', '']);
                    setErrorMsg('');
                    setTimeout(() => pinRefs[0].current?.focus(), 50);
                  }}
                  disabled={loading}
                  className="w-full py-3 px-4 text-sm font-semibold text-gray-600 hover:text-gray-800 transition-colors"
                >
                  ← Change PIN
                </button>
              )}

              <button
                type="button"
                onClick={handleSkip}
                disabled={loading}
                className="w-full py-3 px-4 text-sm font-medium text-gray-400 hover:text-gray-600 transition-colors"
              >
                Skip for now
              </button>
            </div>

          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}