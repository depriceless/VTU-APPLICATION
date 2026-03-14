'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, X, RefreshCw, Check, Search, Zap, User, MapPin, ShieldCheck } from 'lucide-react';
import apiClient from '@/lib/api';
import { ElectricitySuccessModal } from '@/components/SuccessModal/page';

// ── Customer Verified Modal ───────────────────────────────────────────────────
function CustomerVerifiedModal({ isOpen, onConfirm, onClose, customerName, customerAddress, meterNumber, providerName }) {
 useEffect(() => {
  if (isOpen) document.body.style.overflow = 'hidden';
  else document.body.style.overflow = '';
  return () => { document.body.style.overflow = ''; };
}, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.5)',
          zIndex: 9998,
          backdropFilter: 'blur(3px)',
          animation: 'cvFadeIn 0.2s ease'
        }}
      />
      <div style={{
        position: 'fixed', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 360, maxWidth: 'calc(100vw - 32px)',
        background: 'white',
        borderRadius: 20,
        zIndex: 9999,
        boxShadow: '0 32px 64px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.04)',
        animation: 'cvPopIn 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
        overflow: 'hidden'
      }}>

        {/* Green header */}
        <div style={{
          background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
          padding: '24px 20px 20px',
          textAlign: 'center',
          position: 'relative'
        }}>
          <button
            onClick={onClose}
            style={{
              position: 'absolute', top: 12, right: 12,
              width: 28, height: 28, borderRadius: '50%',
              background: 'rgba(255,255,255,0.2)',
              border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white'
            }}
          >
            <X size={14} />
          </button>

          <div style={{
            width: 56, height: 56, borderRadius: '50%',
            background: 'rgba(255,255,255,0.2)',
            border: '2px solid rgba(255,255,255,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 12px',
            animation: 'cvScaleIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) 0.1s both'
          }}>
            <ShieldCheck size={28} color="white" strokeWidth={2} />
          </div>

          <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'white' }}>Meter Verified</p>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.8)' }}>Please confirm customer details</p>
        </div>

        {/* Details body */}
        <div style={{ padding: '20px' }}>

          {/* Customer Name */}
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: 12,
            padding: '12px 14px', background: '#f9fafb',
            borderRadius: 10, marginBottom: 8, border: '1px solid #f3f4f6'
          }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, flexShrink: 0, background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <User size={15} color="#16a34a" />
            </div>
            <div style={{ minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 11, color: '#9ca3af', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Customer Name</p>
              <p style={{ margin: '2px 0 0', fontSize: 16,fontWeight: 700, color: '#111827', lineHeight: 1.3 }}>{customerName}</p>
            </div>
          </div>

          {/* Address */}
          {customerAddress && (
            <div style={{
              display: 'flex', alignItems: 'flex-start', gap: 12,
              padding: '12px 14px', background: '#f9fafb',
              borderRadius: 10, marginBottom: 8, border: '1px solid #f3f4f6'
            }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, flexShrink: 0, background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <MapPin size={15} color="#16a34a" />
              </div>
              <div style={{ minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 11, color: '#9ca3af', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Address</p>
                <p style={{ margin: '2px 0 0', fontSize: 13, fontWeight: 600, color: '#374151', lineHeight: 1.4 }}>{customerAddress}</p>
              </div>
            </div>
          )}

          {/* Meter + Provider row */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
            <div style={{ flex: 1, padding: '10px 12px', background: '#f9fafb', borderRadius: 10, border: '1px solid #f3f4f6' }}>
              <p style={{ margin: 0, fontSize: 10, color: '#9ca3af', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Meter No.</p>
              <p style={{ margin: '2px 0 0', fontSize: 13, fontWeight: 700, color: '#111827' }}>{meterNumber}</p>
            </div>
            <div style={{ flex: 1, padding: '10px 12px', background: '#f9fafb', borderRadius: 10, border: '1px solid #f3f4f6' }}>
              <p style={{ margin: 0, fontSize: 10, color: '#9ca3af', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Provider</p>
              <p style={{ margin: '2px 0 0', fontSize: 13, fontWeight: 700, color: '#111827' }}>{providerName}</p>
            </div>
          </div>

          {/* Confirm */}
          <button
            onClick={onConfirm}
            style={{
              width: '100%', padding: '13px',
              background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
              color: 'white', fontSize: 15, fontWeight: 700,
              border: 'none', borderRadius: 10, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              boxShadow: '0 4px 14px rgba(22,163,74,0.3)'
            }}
          >
            <Check size={16} strokeWidth={3} />
            Yes, this is correct
          </button>

          <button
            onClick={onClose}
            style={{
              width: '100%', padding: '11px',
              background: 'transparent', color: '#6b7280',
              fontSize: 14, fontWeight: 500,
              border: 'none', borderRadius: 10, cursor: 'pointer', marginTop: 8
            }}
          >
            Wrong meter? Go back
          </button>
        </div>
      </div>

      <style>{`
        @keyframes cvFadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes cvPopIn {
          from { opacity: 0; transform: translate(-50%, -48%) scale(0.92) }
          to   { opacity: 1; transform: translate(-50%, -50%) scale(1) }
        }
        @keyframes cvScaleIn {
          from { transform: scale(0.5); opacity: 0 }
          to   { transform: scale(1); opacity: 1 }
        }
      `}</style>
    </>
  );
}

// ── Provider Bottom Sheet ─────────────────────────────────────────────────────
function ProviderBottomSheet({ isOpen, onClose, providers, selectedProvider, onSelect }) {
  const [search, setSearch] = useState('');
  const [isDesktop, setIsDesktop] = useState(false);
  const searchRef = useRef(null);

  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 640);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
  if (isOpen) {
    document.body.style.overflow = 'hidden';
  } else {
      document.body.style.overflow = '';
      setSearch('');
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  const filtered = providers.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.acronym.toLowerCase().includes(search.toLowerCase())
  );

  if (!isOpen) return null;

  const sheetStyle = isDesktop ? {
    position: 'fixed', top: '50%', left: '50%',
    transform: 'translate(-50%, -50%)',
    width: 480, maxWidth: '90vw', maxHeight: '80vh',
    borderRadius: 16, animation: 'fadeScaleIn 0.2s ease',
    boxShadow: '0 24px 48px rgba(0,0,0,0.2)'
  } : {
    position: 'fixed', left: 0, right: 0, bottom: 0,
    maxHeight: '85vh', borderRadius: '20px 20px 0 0',
    animation: 'slideUp 0.3s cubic-bezier(0.32, 0.72, 0, 1)',
    boxShadow: '0 -8px 32px rgba(0,0,0,0.15)'
  };

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9998, animation: 'fadeIn 0.2s ease' }} />
      <div style={{ background: 'white', zIndex: 9999, display: 'flex', flexDirection: 'column', ...sheetStyle }}>
        {!isDesktop && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
            <div style={{ width: 40, height: 4, borderRadius: 2, background: '#d1d5db' }} />
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: isDesktop ? '20px 20px 12px' : '8px 20px 12px', borderBottom: '1px solid #f3f4f6' }}>
          <div>
            <p style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#111827' }}>Select DISCO</p>
            <p style={{ margin: 0, fontSize: 12, color: '#6b7280', marginTop: 2 }}>{providers.length} providers available</p>
          </div>
          <button onClick={onClose} style={{ width: 34, height: 34, borderRadius: '50%', background: '#f3f4f6', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#6b7280', flexShrink: 0 }}>
            <X size={16} />
          </button>
        </div>
        <div style={{ padding: '12px 16px' }}>
          <div style={{ position: 'relative' }}>
            <Search size={15} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', pointerEvents: 'none' }} />
            <input ref={searchRef} value={search} onChange={e => setSearch(e.target.value)} placeholder="Search providers..." autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} style={{ width: '100%', padding: '9px 12px 9px 34px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 16, outline: 'none', background: '#f9fafb', boxSizing: 'border-box', color: '#111827' }} />
          </div>
        </div>
        <div style={{ overflowY: 'auto', flex: 1, padding: '0 12px 20px' }}>
          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#9ca3af', fontSize: 14 }}>No providers match "{search}"</div>
          ) : filtered.map(provider => {
            const isSelected = selectedProvider?.id === provider.id;
            return (
              <div key={provider.id} onClick={() => { onSelect(provider); onClose(); }} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 10px', marginBottom: 6, borderRadius: 10, border: isSelected ? '2px solid #dc2626' : '1.5px solid #f3f4f6', background: isSelected ? '#fff5f5' : 'white', cursor: 'pointer', transition: 'border-color 0.15s, background 0.15s' }}>
                <div style={{ width: 38, height: 38, borderRadius: 8, flexShrink: 0, background: isSelected ? '#fef2f2' : '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Zap size={16} color={isSelected ? '#dc2626' : '#9ca3af'} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#111827', lineHeight: 1.3 }}>{provider.name}</p>
                  <span style={{ display: 'inline-block', marginTop: 3, fontSize: 11, color: '#6b7280', background: '#f3f4f6', padding: '1px 6px', borderRadius: 4 }}>{provider.acronym}</span>
                </div>
                <div style={{ width: 22, height: 22, borderRadius: '50%', flexShrink: 0, background: isSelected ? '#dc2626' : '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.15s' }}>
                  <Check size={12} color={isSelected ? 'white' : '#d1d5db'} strokeWidth={3} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp { from { transform: translateY(100%) } to { transform: translateY(0) } }
        @keyframes fadeScaleIn { from { opacity: 0; transform: translate(-50%, -48%) scale(0.97) } to { opacity: 1; transform: translate(-50%, -50%) scale(1) } }
      `}</style>
    </>
  );
}

// ── Meter Type Bottom Sheet ───────────────────────────────────────────────────
function MeterTypeBottomSheet({ isOpen, onClose, meterTypes, selectedMeterType, onSelect }) {
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 640);
    check(); window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);
  if (!isOpen) return null;
  const sheetStyle = isDesktop ? { position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 420, maxWidth: '90vw', borderRadius: 16, animation: 'fadeScaleIn 0.2s ease', boxShadow: '0 24px 48px rgba(0,0,0,0.2)' } : { position: 'fixed', left: 0, right: 0, bottom: 0, borderRadius: '20px 20px 0 0', animation: 'slideUp 0.3s cubic-bezier(0.32, 0.72, 0, 1)', boxShadow: '0 -8px 32px rgba(0,0,0,0.15)' };
  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9998, animation: 'fadeIn 0.2s ease' }} />
      <div style={{ background: 'white', zIndex: 9999, display: 'flex', flexDirection: 'column', ...sheetStyle }}>
        {!isDesktop && <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}><div style={{ width: 40, height: 4, borderRadius: 2, background: '#d1d5db' }} /></div>}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: isDesktop ? '20px 20px 12px' : '8px 20px 12px', borderBottom: '1px solid #f3f4f6' }}>
          <p style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#111827' }}>Select Meter Type</p>
          <button onClick={onClose} style={{ width: 34, height: 34, borderRadius: '50%', background: '#f3f4f6', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#6b7280' }}><X size={16} /></button>
        </div>
        <div style={{ padding: '16px 12px 24px' }}>
          {meterTypes.map(meter => {
            const isSelected = selectedMeterType?.id === meter.id;
            return (
              <div key={meter.id} onClick={() => { onSelect(meter); onClose(); }} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 12px', marginBottom: 8, borderRadius: 10, border: isSelected ? '2px solid #dc2626' : '1.5px solid #f3f4f6', background: isSelected ? '#fff5f5' : 'white', cursor: 'pointer', transition: 'border-color 0.15s, background 0.15s' }}>
                <div style={{ width: 42, height: 42, borderRadius: 10, flexShrink: 0, background: isSelected ? '#fef2f2' : '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                  {meter.id === '01' ? '⚡' : '📋'}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#111827' }}>{meter.name}</p>
                  <p style={{ margin: 0, fontSize: 12, color: '#6b7280', marginTop: 2 }}>{meter.description}</p>
                </div>
                <div style={{ width: 22, height: 22, borderRadius: '50%', flexShrink: 0, background: isSelected ? '#dc2626' : '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.15s' }}>
                  <Check size={12} color={isSelected ? 'white' : '#d1d5db'} strokeWidth={3} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function BuyElectricityPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [selectedMeterType, setSelectedMeterType] = useState(null);
  const [meterNumber, setMeterNumber] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerConfirmed, setCustomerConfirmed] = useState(false); // ✅ NEW
  const [amount, setAmount] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [pin, setPin] = useState('');

  const [showProviderSheet, setShowProviderSheet] = useState(false);
  const [showMeterTypeSheet, setShowMeterTypeSheet] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false); // ✅ NEW

  const [balance, setBalance] = useState(0);
  const [pinStatus, setPinStatus] = useState(null);
  const [electricityProviders, setElectricityProviders] = useState([]);
  const [successData, setSuccessData] = useState(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isValidatingMeter, setIsValidatingMeter] = useState(false);
  const [validatingMessage, setValidatingMessage] = useState('Verifying meter...');

  const [pinError, setPinError] = useState('');
  const [meterError, setMeterError] = useState('');

  const pinInputRef  = useRef(null);
  const isMountedRef = useRef(true);

  const meterTypes = [
    { id: '01', name: 'Prepaid Meter',  type: 'prepaid',  description: 'Pay before you use — buy units in advance' },
    { id: '02', name: 'Postpaid Meter', type: 'postpaid', description: 'Pay after you use — monthly billing' },
  ];

 const defaultProviders = [
    { id: '01', name: 'Eko Electric',          fullName: 'Eko Electricity Distribution Company',          acronym: 'EKEDC',  minAmount: 1000, maxAmount: 100000 },
    { id: '02', name: 'Ikeja Electric',         fullName: 'Ikeja Electric Distribution Company',           acronym: 'IKEDC',  minAmount: 1000, maxAmount: 100000 },
    { id: '03', name: 'Port Harcourt Electric', fullName: 'Port Harcourt Electric Distribution Company',   acronym: 'PHEDC',  minAmount: 1000, maxAmount: 100000 },
    { id: '04', name: 'Kano Electric',          fullName: 'Kano Electricity Distribution Company',         acronym: 'KEDCO',  minAmount: 2000, maxAmount: 100000 },
    { id: '05', name: 'Ibadan Electric',        fullName: 'Ibadan Electricity Distribution Company',       acronym: 'IBEDC',  minAmount: 2000, maxAmount: 100000 },
    { id: '06', name: 'Abuja Electric',         fullName: 'Abuja Electricity Distribution Company',        acronym: 'AEDC',   minAmount: 1000, maxAmount: 100000 },
    { id: '07', name: 'Enugu Electric',         fullName: 'Enugu Electricity Distribution Company',        acronym: 'EEDC',   minAmount: 1000, maxAmount: 100000 },
    { id: '08', name: 'Benin Electric',         fullName: 'Benin Electricity Distribution Company',        acronym: 'BEDC',   minAmount: 1000, maxAmount: 100000 },
    { id: '09', name: 'Jos Electric',           fullName: 'Jos Electricity Distribution Company',          acronym: 'JED',    minAmount: 1000, maxAmount: 100000 },
    { id: '10', name: 'Kaduna Electric',        fullName: 'Kaduna Electric Distribution Company',          acronym: 'KAEDCO', minAmount: 2000, maxAmount: 100000 },
    { id: '11', name: 'Aba Electric',           fullName: 'Aba Electricity Distribution Company',          acronym: 'ABA',    minAmount: 1000, maxAmount: 100000 },
    { id: '12', name: 'Yola Electric',          fullName: 'Yola Electricity Distribution Company',         acronym: 'YEDC',   minAmount: 1000, maxAmount: 100000 },
  ];

  const isMeterNumberValid = meterNumber.length >= 10 && meterNumber.length <= 13 && /^\d+$/.test(meterNumber);
  const amountNum          = parseInt(amount) || 0;
  const minAmount          = selectedProvider?.minAmount || 1000;
  const isAmountValid      = amountNum >= minAmount && amountNum <= 100000;
  const isPhoneValid       = phoneNumber.length === 11;
  const hasEnoughBalance   = amountNum <= balance;

  // ✅ Gate on customerConfirmed — user must tap "Yes, this is correct" in the modal
  const canProceed = selectedProvider && selectedMeterType && isMeterNumberValid &&
                     customerConfirmed && isAmountValid && isPhoneValid && hasEnoughBalance;

  // ── Auto-validate meter (debounced 1.5s) ─────────────────────────────────
  useEffect(() => {
    if (isMeterNumberValid && selectedProvider && selectedMeterType) {
      const timer = setTimeout(() => validateMeter(), 1500);
      return () => clearTimeout(timer);
    } else {
      setCustomerName('');
      setCustomerAddress('');
      setCustomerConfirmed(false);
      setMeterError('');
    }
  }, [meterNumber, selectedProvider, selectedMeterType]);

  useEffect(() => {
    isMountedRef.current = true;
    fetchElectricityProviders();
    fetchUserBalance();
    checkPinStatus();
    return () => { isMountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (showPinModal) {
      setPin(''); setPinError('');
      setTimeout(() => pinInputRef.current?.focus(), 300);
    }
  }, [showPinModal]);

  const fetchElectricityProviders = async () => {
    try {
      const response = await apiClient.get('/electricity/providers');
      if (response.data?.success && Array.isArray(response.data.data)) {
        setElectricityProviders(response.data.data);
      } else {
        setElectricityProviders(defaultProviders);
      }
    } catch {
      setElectricityProviders(defaultProviders);
    }
  };

  // ✅ FIX: extractBalance handles the { mainBalance, totalBalance } shape
  const extractBalance = (nb: any): number => {
    if (!nb) return 0;
    if (typeof nb === 'number') return nb;
    return parseFloat(nb?.mainBalance ?? nb?.totalBalance ?? nb?.amount ?? nb?.balance ?? 0) || 0;
  };

  const validateMeter = async () => {
    if (!isMeterNumberValid || !selectedProvider || !selectedMeterType) return;
    setIsValidatingMeter(true);
    setValidatingMessage('Verifying meter...');
    setMeterError('');
    setCustomerName('');
    setCustomerAddress('');
    setCustomerConfirmed(false);

    const retryMsgTimer = setTimeout(() => {
      setValidatingMessage('Taking longer than usual, still verifying...');
    }, 20000);

    try {
      const response = await apiClient.post('/electricity/validate-meter', {
        meterNumber,
        provider:  selectedProvider.id,
        meterType: selectedMeterType.id,
        amount:    Math.max(amountNum || 0, minAmount),
      }, { timeout: 75000 });

      if (response.data?.success) {
        // ✅ Store name/address then show confirmation modal
        setCustomerName(response.data.data?.customerName    || 'Verified Customer');
        setCustomerAddress(response.data.data?.customerAddress || '');
        setShowCustomerModal(true);
      } else {
        setMeterError(response.data?.message || 'Meter validation failed. Check the number and try again.');
      }
    } catch (error: any) {
      if (error.code === 'ECONNABORTED' || error.message?.toLowerCase().includes('timeout')) {
        setMeterError('Meter validation timed out. Please try again.');
      } else {
        setMeterError(error.response?.data?.message || error.message || 'Unable to validate meter. Please try again.');
      }
    } finally {
      clearTimeout(retryMsgTimer);
      setIsValidatingMeter(false);
      setValidatingMessage('Verifying meter...');
    }
  };

  // ✅ User clicked "Yes, this is correct"
  const handleCustomerConfirm = () => {
    setCustomerConfirmed(true);
    setShowCustomerModal(false);
  };

  // ✅ User clicked "Wrong meter? Go back" — clear everything
  const handleCustomerModalClose = () => {
    setShowCustomerModal(false);
    setCustomerName('');
    setCustomerAddress('');
    setCustomerConfirmed(false);
    setMeterNumber('');
    setMeterError('');
  };

  const fetchUserBalance = async () => {
    setIsLoadingBalance(true);
    try {
      const response = await apiClient.get('/balance');
      if (response.data?.success && isMountedRef.current) {
        setBalance(extractBalance(response.data.balance));
      }
    } catch {}
    finally {
      if (isMountedRef.current) { setIsLoadingBalance(false); setIsLoading(false); }
    }
  };

  const checkPinStatus = async () => {
    try {
      const response = await apiClient.get('/purchase/pin-status');
      if (response.data?.success) setPinStatus(response.data);
    } catch {}
  };

  const handleProceedToReview = () => { if (canProceed) setCurrentStep(2); };

  const handleProceedToPinEntry = () => {
    if (!pinStatus?.isPinSet) { alert('Please set up a transaction PIN in settings.'); return; }
    if (pinStatus?.isLocked) { alert(`Account locked. Try again in ${pinStatus.lockTimeRemaining} minutes.`); return; }
    setShowPinModal(true);
  };

  const handleBuyElectricity = async () => {
    if (pin.length !== 4) { setPinError('Please enter a 4-digit PIN'); return; }
    setIsProcessing(true); setPinError('');
    try {
      const response = await apiClient.post('/purchase', {
        type:        'electricity',
        provider:    selectedProvider.id,
        meterType:   selectedMeterType.id,
        meterNumber,
        phone:       phoneNumber,
        amount:      amountNum,
        pin,
        customerName,
        customerAddress: customerAddress || '',
      });

      if (response.data?.success) {
        setSuccessData({
          transaction:     response.data.transaction || {},
          providerName:    selectedProvider.name,
          phone:           phoneNumber,
          amount:          response.data.transaction?.amount || amountNum,
          meterNumber,
          customerName,
          customerAddress,
          meterType:       selectedMeterType.name,
          newBalance:      response.data.newBalance,
        });

        // ✅ FIX: correctly parse { mainBalance, totalBalance } shape
        if (response.data.newBalance !== undefined) {
          setBalance(extractBalance(response.data.newBalance));
        } else {
          fetchUserBalance();
        }

        setMeterNumber(''); setAmount(''); setPhoneNumber('');
        setSelectedProvider(null); setSelectedMeterType(null);
        setCustomerName(''); setCustomerAddress('');
        setCustomerConfirmed(false); setPin('');
        setCurrentStep(1);
        setShowPinModal(false);
        setTimeout(() => setShowSuccessModal(true), 200);
      } else {
        setPinError(response.data?.message || 'Transaction failed. Please try again.');
      }
    } catch (error: any) {
      setPinError(error.response?.data?.message || error.message || 'Unable to process payment. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="page-container">
        <div className="loading-container"><div className="spinner" /><p className="loading-text">Loading...</p></div>
        <style jsx>{styles}</style>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">ELECTRICITY</h1>
        <div className="breadcrumb">
          <span className="breadcrumb-link">Dashboard</span>
          <span className="breadcrumb-separator">/</span>
          <span className="breadcrumb-current">Electricity</span>
        </div>
      </div>

      {/* ── Step 1: Form ── */}
      {currentStep === 1 && (
        <div className="card">

          {/* ✅ Wallet bar */}
          <div className="balance-header">
            <div className="wallet-badge">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}}>
                <path d="M20 12V22H4V12"/><path d="M22 7H2v5h20V7z"/><path d="M12 22V7"/>
                <path d="M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z"/>
              </svg>
              <span>₦{balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <button className="refresh-btn" onClick={fetchUserBalance} disabled={isLoadingBalance}>
              <RefreshCw size={13} className={isLoadingBalance ? 'spinning' : ''} />
              <span>{isLoadingBalance ? 'Refreshing…' : 'Refresh'}</span>
            </button>
          </div>

          {/* Provider */}
          <div className="form-group">
            <label>Electricity Provider</label>
            <div className="custom-select-trigger" onClick={() => setShowProviderSheet(true)}>
              <span className={selectedProvider ? 'selected' : 'placeholder'}>
                {selectedProvider
                  ? <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Zap size={15} color="#dc2626" />
                      {selectedProvider.name}
                      <span style={{ fontSize: 11, background: '#f3f4f6', color: '#6b7280', padding: '1px 6px', borderRadius: 4 }}>{selectedProvider.acronym}</span>
                    </span>
                  : 'Choose your DISCO'}
              </span>
              <ChevronDown size={16} style={{ flexShrink: 0, color: '#6b7280' }} />
            </div>
          </div>

          {selectedProvider && (
            <>
              {/* Meter Number */}
              <div className="form-group">
                <label>Meter Number</label>
                <div className="input-container">
                  <input
                    type="text"
                    value={meterNumber}
                    onChange={e => {
                      setMeterNumber(e.target.value.replace(/\D/g, ''));
                      setCustomerName(''); setCustomerAddress('');
                      setCustomerConfirmed(false); setMeterError('');
                    }}
                    placeholder="Enter meter number (10+ digits)"
                    maxLength={13}
                    className={`text-input ${meterError ? 'error' : ''} ${customerConfirmed ? 'success' : ''}`}
                    disabled={isValidatingMeter}
                  />
                  {isValidatingMeter && <div className="spinner-small-abs" />}
                </div>

                {/* Validating state */}
                {isValidatingMeter && (
                  <div className="validating-msg">
                    <div className="spinner-tiny" />
                    {validatingMessage}
                  </div>
                )}

                {/* ✅ FIX: Retry button when validation fails */}
                {meterError && (
                  <div className="meter-error-block">
                    <span>{meterError}</span>
                    <button className="retry-btn" onClick={validateMeter} disabled={isValidatingMeter}>
                      {isValidatingMeter ? 'Retrying…' : '↻ Retry'}
                    </button>
                  </div>
                )}

                {meterNumber.length > 0 && !isMeterNumberValid && (
                  <div className="validation-error">Meter number must be 10–13 digits</div>
                )}

                {/* ✅ Compact confirmed chip — replaces the old inline card */}
                {customerConfirmed && customerName && (
                  <div className="customer-confirmed-chip">
                    <ShieldCheck size={13} color="#16a34a" />
                    <span>{customerName}</span>
                    <button
                      onClick={() => setShowCustomerModal(true)}
                      style={{ marginLeft: 'auto', fontSize: 11, color: '#16a34a', background: 'none', border: 'none', cursor: 'pointer', padding: '0 2px', fontWeight: 600, textDecoration: 'underline', flexShrink: 0 }}
                    >
                      View
                    </button>
                  </div>
                )}
              </div>

              {/* Meter Type — shown after meter length valid */}
              {isMeterNumberValid && (
                <div className="form-group">
                  <label>Meter Type</label>
                  <div className="custom-select-trigger" onClick={() => setShowMeterTypeSheet(true)}>
                    <span className={selectedMeterType ? 'selected' : 'placeholder'}>
                      {selectedMeterType
                        ? <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span>{selectedMeterType.id === '01' ? '⚡' : '📋'}</span>
                            {selectedMeterType.name}
                          </span>
                        : 'Choose meter type'}
                    </span>
                    <ChevronDown size={16} style={{ flexShrink: 0, color: '#6b7280' }} />
                  </div>
                  {selectedMeterType && <div className="plan-description">{selectedMeterType.description}</div>}
                </div>
              )}
            </>
          )}

          {/* ✅ Amount + Phone shown ONLY after customer confirmed in modal */}
          {customerConfirmed && (
            <>
              {/* Amount */}
              <div className="form-group">
                <label>Amount (₦)</label>
                <input
                  type="number"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder={`Min. ₦${minAmount.toLocaleString()}`}
                  min={minAmount}
                  max="100000"
                  className="text-input"
                />
                {amount !== '' && !isAmountValid && (
                  <div className="validation-error">Amount must be between ₦{minAmount.toLocaleString()} and ₦100,000</div>
                )}
                {amount !== '' && isAmountValid && !hasEnoughBalance && (
                  <div className="validation-error">Insufficient balance. Available: ₦{balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
                )}
             
              </div>

              {/* Phone */}
              <div className="form-group">
                <label>Phone Number</label>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={e => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                  placeholder="08012345678"
                  maxLength={11}
                  className="text-input"
                />
                {phoneNumber.length > 0 && !isPhoneValid && (
                  <div className="validation-error">Phone number must be 11 digits</div>
                )}
              </div>
            </>
          )}

          <button onClick={handleProceedToReview} className="submit-btn" disabled={!canProceed}>
            {isValidatingMeter
              ? 'Verifying meter...'
              : canProceed
                ? `Review Purchase • ₦${amountNum.toLocaleString()}`
                : 'Complete Form to Continue'}
          </button>
        </div>
      )}

      {/* ── Step 2: Review ── */}
      {currentStep === 2 && (
        <div className="card">
          <h2 className="review-title">Review Purchase</h2>
          <div className="summary-card">
            <div className="summary-row">
              <span>Provider</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Zap size={13} color="#dc2626" />
                {selectedProvider?.name} ({selectedProvider?.acronym})
              </span>
            </div>
            <div className="summary-row"><span>Meter Type</span><span>{selectedMeterType?.name}</span></div>
            <div className="summary-row"><span>Meter Number</span><span>{meterNumber}</span></div>
            <div className="summary-row"><span>Customer</span><span>{customerName}</span></div>
            {customerAddress && <div className="summary-row"><span>Address</span><span style={{ maxWidth: 200, textAlign: 'right' }}>{customerAddress}</span></div>}
            <div className="summary-row"><span>Phone Number</span><span>{phoneNumber}</span></div>
            <div className="summary-divider" />
            <div className="summary-row total"><span>Total Amount</span><span>₦{amountNum.toLocaleString()}</span></div>
          </div>
          <button onClick={handleProceedToPinEntry} className="submit-btn" disabled={!hasEnoughBalance}>
            {hasEnoughBalance ? 'Proceed to Payment' : 'Insufficient Balance'}
          </button>
          <button onClick={() => setCurrentStep(1)} className="secondary-btn">Back to Form</button>
        </div>
      )}

      {/* ── PIN Modal ── */}
      {showPinModal && (
        <div className="modal-overlay" onClick={() => !isProcessing && setShowPinModal(false)}>
          <div className="modal-content pin-modal-content" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowPinModal(false)} disabled={isProcessing}><X size={18} /></button>
            <h2 className="pin-modal-title">Enter Transaction PIN</h2>
            <p className="pin-modal-subtitle">Enter your 4-digit PIN to complete the purchase</p>
            <div className="pin-input-container" onClick={() => pinInputRef.current?.focus()}>
              <input ref={pinInputRef} type="password" inputMode="numeric" maxLength={4} value={pin}
                onChange={e => { setPin(e.target.value.replace(/\D/g, '')); setPinError(''); }}
                className="pin-input" disabled={isProcessing} />
              <div className="pin-dots">
                {[0,1,2,3].map(i => <div key={i} className={`pin-dot ${pin.length > i ? 'filled' : ''} ${pinError ? 'dot-error' : ''}`} />)}
              </div>
            </div>
            {pinError && <div className="pin-error-message">{pinError}</div>}
            <button onClick={handleBuyElectricity} className="submit-btn" disabled={pin.length !== 4 || isProcessing}>
              {isProcessing ? 'Processing...' : 'Confirm Purchase'}
            </button>
            <button onClick={() => setShowPinModal(false)} className="cancel-btn" disabled={isProcessing}>Cancel</button>
          </div>
        </div>
      )}

      {/* ── Customer Verified Modal ── */}
      <CustomerVerifiedModal
        isOpen={showCustomerModal}
        onConfirm={handleCustomerConfirm}
        onClose={handleCustomerModalClose}
        customerName={customerName}
        customerAddress={customerAddress}
        meterNumber={meterNumber}
        providerName={selectedProvider?.name || ''}
      />

      <ProviderBottomSheet
        isOpen={showProviderSheet}
        onClose={() => setShowProviderSheet(false)}
        providers={electricityProviders.length > 0 ? electricityProviders : defaultProviders}
        selectedProvider={selectedProvider}
        onSelect={(p) => {
          setSelectedProvider(p);
          setSelectedMeterType(null);
          setMeterNumber('');
          setCustomerName(''); setCustomerAddress('');
          setCustomerConfirmed(false); setMeterError('');
        }}
      />
      <MeterTypeBottomSheet
        isOpen={showMeterTypeSheet}
        onClose={() => setShowMeterTypeSheet(false)}
        meterTypes={meterTypes}
        selectedMeterType={selectedMeterType}
        onSelect={setSelectedMeterType}
      />

      <ElectricitySuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        onBuyMore={() => setShowSuccessModal(false)}
        disco={successData?.providerName}
        meterNumber={successData?.meterNumber}
        meterType={successData?.meterType}
        customerName={successData?.customerName}
        amount={successData?.amount}
        token={successData?.transaction?.token}
        reference={successData?.transaction?.reference}
      />

      <style jsx>{styles}</style>
    </div>
  );
}

const styles = `
  .page-container { padding: 16px 24px; max-width: 1200px; margin: 0 auto; }
  .page-header { margin-bottom: 20px; }
  .page-title { font-size: 20px; font-weight: 700; color: #dc2626; margin: 0 0 8px 0; }
  .breadcrumb { display: flex; gap: 6px; font-size: 14px; align-items: center; }
  .breadcrumb-link { color: #6b7280; cursor: pointer; font-weight: 500; }
  .breadcrumb-link:hover { color: #dc2626; }
  .breadcrumb-separator { color: #9ca3af; }
  .breadcrumb-current { color: #1f2937; font-weight: 500; }

  .card { background: white; border-radius: 12px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04); border: 1px solid #e5e7eb; max-width: 600px; margin: 0 auto; }

  /* ── Wallet bar ── */
  .balance-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding: 12px 14px; background: #f9fafb; border-radius: 8px; border: 1px solid #e5e7eb; }
  .wallet-badge { display: flex; align-items: center; gap: 8px; }
  .wallet-badge span { font-size: 15px; font-weight: 700; color: #16a34a; }
  .refresh-btn { background: white; border: 1px solid #e5e7eb; border-radius: 6px; padding: 7px 12px; cursor: pointer; display: flex; align-items: center; gap: 5px; color: #374151; font-size: 12px; font-weight: 600; transition: all 0.2s; }
  .refresh-btn:hover:not(:disabled) { border-color: #dc2626; color: #dc2626; background: #fef2f2; }
  .refresh-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .spinning { animation: spin 0.8s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }

  .form-group { margin-bottom: 18px; }
  .form-group label { display: block; font-size: 13px; font-weight: 600; color: #374151; margin-bottom: 7px; letter-spacing: 0.01em; }

  .custom-select-trigger { width: 100%; padding: 11px 14px; font-size: 14px; border: 1.5px solid #d1d5db; border-radius: 8px; background: white; cursor: pointer; display: flex; justify-content: space-between; align-items: center; box-sizing: border-box; transition: border-color 0.2s; }
  .custom-select-trigger:hover { border-color: #9ca3af; }
  .custom-select-trigger .placeholder { color: #9ca3af; }
  .custom-select-trigger .selected { color: #1f2937; font-weight: 500; display: flex; align-items: center; min-width: 0; flex: 1; }

  .input-container { position: relative; }
  .text-input { width: 100%; padding: 11px 14px; font-size: 14px; border: 1.5px solid #d1d5db; border-radius: 8px; color: #1f2937; font-weight: 500; box-sizing: border-box; transition: all 0.2s; background: white; }
  .text-input:focus { outline: none; border-color: #dc2626; box-shadow: 0 0 0 3px rgba(220,38,38,0.08); }
  .text-input:disabled { background: #f3f4f6; cursor: not-allowed; }
  .text-input.error { border-color: #ef4444; background: #fff5f5; }
  .text-input.success { border-color: #22c55e; background: #f0fdf4; }
  .text-input::placeholder { color: #9ca3af; font-weight: 400; }

  .spinner-small-abs { width: 16px; height: 16px; border: 2px solid #e5e7eb; border-top-color: #dc2626; border-radius: 50%; animation: spin 0.8s linear infinite; position: absolute; right: 14px; top: 50%; transform: translateY(-50%); }
  .spinner-tiny { width: 12px; height: 12px; border: 2px solid #e5e7eb; border-top-color: #6b7280; border-radius: 50%; animation: spin 0.8s linear infinite; flex-shrink: 0; }

  .validating-msg { color: #6b7280; font-size: 12px; margin-top: 6px; font-style: italic; display: flex; align-items: center; gap: 6px; }
  .plan-description { font-size: 12px; color: #6b7280; margin-top: 6px; font-style: italic; }

  /* ✅ Meter error block with retry */
  .meter-error-block { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; margin-top: 6px; padding: 10px 12px; background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; }
  .meter-error-block span { color: #dc2626; font-size: 13px; font-weight: 500; flex: 1; line-height: 1.4; }
  .retry-btn { background: white; border: 1px solid #fca5a5; border-radius: 6px; padding: 4px 10px; font-size: 12px; font-weight: 600; color: #dc2626; cursor: pointer; white-space: nowrap; transition: all 0.15s; flex-shrink: 0; }
  .retry-btn:hover:not(:disabled) { background: #dc2626; color: white; border-color: #dc2626; }
  .retry-btn:disabled { opacity: 0.5; cursor: not-allowed; }

  /* ✅ Compact confirmed chip */
  .customer-confirmed-chip { display: flex; align-items: center; gap: 6px; margin-top: 8px; padding: 8px 12px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; font-size: 13px; font-weight: 600; color: #15803d; }
  .customer-confirmed-chip span { flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0; }

  .validation-error { color: #ef4444; font-size: 12px; margin-top: 6px; font-weight: 500; }
  .validation-success { color: #16a34a; font-size: 12px; margin-top: 6px; font-weight: 500; background: #f0fdf4; padding: 5px 10px; border-radius: 6px; display: inline-block; }

  .submit-btn { width: 100%; padding: 13px; background: #dc2626; color: white; font-size: 15px; font-weight: 700; border: none; border-radius: 8px; cursor: pointer; transition: all 0.2s; margin-top: 8px; letter-spacing: 0.01em; }
  .submit-btn:hover:not(:disabled) { background: #b91c1c; box-shadow: 0 4px 14px rgba(220,38,38,0.3); }
  .submit-btn:disabled { background: #d1d5db; cursor: not-allowed; }
  .secondary-btn { width: 100%; padding: 13px; background: white; color: #6b7280; font-size: 15px; font-weight: 600; border: 1.5px solid #e5e7eb; border-radius: 8px; cursor: pointer; transition: all 0.2s; margin-top: 10px; }
  .secondary-btn:hover { border-color: #9ca3af; color: #374151; background: #f9fafb; }
  .cancel-btn { width: 100%; padding: 13px; background: white; color: #6b7280; font-size: 15px; font-weight: 600; border: 1.5px solid #e5e7eb; border-radius: 8px; cursor: pointer; transition: all 0.2s; margin-top: 10px; }
  .cancel-btn:hover:not(:disabled) { border-color: #9ca3af; color: #374151; background: #f9fafb; }
  .cancel-btn:disabled { opacity: 0.5; cursor: not-allowed; }

  .review-title { font-size: 18px; font-weight: 700; color: #1f2937; margin: 0 0 16px 0; }
  .summary-card { background: #f9fafb; border-radius: 10px; padding: 16px; margin-bottom: 16px; border: 1px solid #e5e7eb; }
  .summary-row { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #e5e7eb; font-size: 14px; }
  .summary-row:last-child { border-bottom: none; }
  .summary-row span:first-child { color: #6b7280; font-weight: 500; }
  .summary-row span:last-child { color: #1f2937; font-weight: 600; }
  .summary-divider { height: 1px; background: #e5e7eb; margin: 4px 0; }
  .summary-row.total { padding: 14px; background: #fef2f2; margin: 8px -16px -16px; border-radius: 0 0 10px 10px; border-bottom: none; }
  .summary-row.total span:first-child { color: #1f2937; font-weight: 600; }
  .summary-row.total span:last-child { color: #dc2626; font-size: 22px; font-weight: 800; }

  .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.45); display: flex; align-items: center; justify-content: center; z-index: 9999; padding: 16px; backdrop-filter: blur(2px); animation: fadeIn 0.2s ease; }
  @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
  .modal-content { background: white; border-radius: 16px; padding: 28px 24px; max-width: 500px; width: 100%; position: relative; box-shadow: 0 24px 48px rgba(0,0,0,0.15); animation: slideUp 0.25s ease-out; }
  @keyframes slideUp { from { opacity: 0; transform: translateY(16px) } to { opacity: 1; transform: translateY(0) } }
  .pin-modal-content { max-width: 380px; }
  .modal-close { position: absolute; top: 14px; right: 14px; background: #f3f4f6; border: none; border-radius: 8px; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #6b7280; transition: all 0.2s; }
  .modal-close:hover { background: #e5e7eb; color: #1f2937; }
  .modal-close:disabled { opacity: 0.5; cursor: not-allowed; }
  .pin-modal-title { font-size: 20px; font-weight: 700; text-align: center; margin: 0 0 6px 0; color: #1f2937; }
  .pin-modal-subtitle { font-size: 13px; color: #6b7280; text-align: center; margin: 0 0 22px 0; }
  .pin-input-container { position: relative; margin-bottom: 18px; cursor: text; }
  .pin-input { width: 100%; padding: 16px; font-size: 24px; text-align: center; border: 2px solid #d1d5db; border-radius: 8px; opacity: 0; position: absolute; top: 0; left: 0; height: 100%; }
  .pin-dots { display: flex; justify-content: center; gap: 14px; padding: 22px; background: #f9fafb; border-radius: 10px; border: 1.5px solid #e5e7eb; }
  .pin-dot { width: 14px; height: 14px; border-radius: 50%; background: #e5e7eb; transition: all 0.2s; }
  .pin-dot.filled { background: #dc2626; transform: scale(1.15); }
  .pin-dot.dot-error { background: #ef4444; }
  .pin-error-message { background: #fef2f2; color: #dc2626; padding: 10px 14px; border-radius: 8px; font-size: 13px; font-weight: 500; text-align: center; margin-bottom: 14px; border: 1px solid #fecaca; }

  .loading-container { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 400px; gap: 14px; }
  .spinner { width: 40px; height: 40px; border: 3px solid #e5e7eb; border-top-color: #dc2626; border-radius: 50%; animation: spin 0.8s linear infinite; }
  .loading-text { color: #6b7280; font-size: 13px; font-weight: 500; }

  @media (max-width: 768px) { .page-container { padding: 12px; } .card { padding: 16px; } .modal-content { padding: 24px 18px; } }
  @media (max-width: 480px) { .pin-dots { gap: 12px; padding: 20px; } .pin-dot { width: 12px; height: 12px; } }
`;