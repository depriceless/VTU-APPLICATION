'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, X, Check, Search, Tv, User, ShieldCheck } from 'lucide-react';
import apiClient from '@/lib/api';
import { CableTVSuccessModal } from '@/components/SuccessModal/page';
import { logger } from '@/lib/logger';

// ── Customer Verified Modal ───────────────────────────────────────────────────
function CustomerVerifiedModal({ isOpen, onConfirm, onClose, customerName, smartCardNumber, operatorName }) {
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9998, backdropFilter: 'blur(3px)' }} />
      <div style={{
        position: 'fixed', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 360, maxWidth: 'calc(100vw - 32px)',
        background: 'white', borderRadius: 20, zIndex: 9999, overflow: 'hidden',
        boxShadow: '0 32px 64px rgba(0,0,0,0.18)',
        animation: 'cvPopIn 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)'
      }}>
        {/* Green header */}
        <div style={{ background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)', padding: '24px 20px 20px', textAlign: 'center', position: 'relative' }}>
          <button onClick={onClose} style={{ position: 'absolute', top: 12, right: 12, width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
            <X size={14} />
          </button>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', border: '2px solid rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
            <ShieldCheck size={28} color="white" strokeWidth={2} />
          </div>
          <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'white' }}>Card Verified</p>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.8)' }}>Please confirm customer details</p>
        </div>

        {/* Body */}
        <div style={{ padding: '20px' }}>
          {/* Customer Name */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 14px', background: '#f9fafb', borderRadius: 10, marginBottom: 8, border: '1px solid #f3f4f6' }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, flexShrink: 0, background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <User size={15} color="#16a34a" />
            </div>
            <div style={{ minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 11, color: '#9ca3af', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Customer Name</p>
              <p style={{ margin: '2px 0 0', fontSize: 16, fontWeight: 700, color: '#111827', lineHeight: 1.3 }}>{customerName}</p>
            </div>
          </div>

          {/* Smart Card + Operator row */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
            <div style={{ flex: 1, padding: '10px 12px', background: '#f9fafb', borderRadius: 10, border: '1px solid #f3f4f6' }}>
              <p style={{ margin: 0, fontSize: 10, color: '#9ca3af', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Smart Card</p>
              <p style={{ margin: '2px 0 0', fontSize: 13, fontWeight: 700, color: '#111827' }}>{smartCardNumber}</p>
            </div>
            <div style={{ flex: 1, padding: '10px 12px', background: '#f9fafb', borderRadius: 10, border: '1px solid #f3f4f6' }}>
              <p style={{ margin: 0, fontSize: 10, color: '#9ca3af', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Operator</p>
              <p style={{ margin: '2px 0 0', fontSize: 13, fontWeight: 700, color: '#111827' }}>{operatorName}</p>
            </div>
          </div>

          {/* Confirm */}
          <button
            onClick={onConfirm}
            style={{ width: '100%', padding: '13px', background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)', color: 'white', fontSize: 15, fontWeight: 700, border: 'none', borderRadius: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 4px 14px rgba(22,163,74,0.3)' }}
          >
            <Check size={16} strokeWidth={3} />
            Yes, this is correct
          </button>

          <button
            onClick={onClose}
            style={{ width: '100%', padding: '11px', background: 'transparent', color: '#6b7280', fontSize: 14, fontWeight: 500, border: 'none', borderRadius: 10, cursor: 'pointer', marginTop: 8 }}
          >
            Wrong card? Go back
          </button>
        </div>
      </div>

      <style>{`
        @keyframes cvPopIn {
          from { opacity: 0; transform: translate(-50%, -48%) scale(0.92) }
          to   { opacity: 1; transform: translate(-50%, -50%) scale(1) }
        }
      `}</style>
    </>
  );
}

// ── Package Sheet ─────────────────────────────────────────────────────────────
function PackageBottomSheet({ isOpen, onClose, packages, selectedPackage, onSelect, operatorLabel }) {
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

  const filtered = packages.filter(pkg =>
    pkg.name.toLowerCase().includes(search.toLowerCase())
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
            <p style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#111827' }}>{operatorLabel} Packages</p>
            <p style={{ margin: 0, fontSize: 12, color: '#6b7280', marginTop: 2 }}>{packages.length} plans available</p>
          </div>
          <button onClick={onClose} style={{ width: 34, height: 34, borderRadius: '50%', background: '#f3f4f6', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#6b7280', flexShrink: 0 }}>
            <X size={16} />
          </button>
        </div>
        <div style={{ padding: '12px 16px' }}>
          <div style={{ position: 'relative' }}>
            <Search size={15} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', pointerEvents: 'none' }} />
            <input
              ref={searchRef}
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search packages..."
              autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false}
              style={{ width: '100%', padding: '9px 12px 9px 34px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 16, outline: 'none', background: '#f9fafb', boxSizing: 'border-box', color: '#111827' }}
            />
          </div>
        </div>
        <div style={{ overflowY: 'auto', flex: 1, padding: '0 12px 20px' }}>
          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#9ca3af', fontSize: 14 }}>No packages match "{search}"</div>
          ) : filtered.map(pkg => {
            const isSelected = selectedPackage?.id === pkg.id;
            return (
              <div key={pkg.id} onClick={() => { onSelect(pkg); onClose(); }} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 10px', marginBottom: 6, borderRadius: 10, border: isSelected ? '2px solid #dc2626' : '1.5px solid #f3f4f6', background: isSelected ? '#fff5f5' : 'white', cursor: 'pointer', transition: 'border-color 0.15s, background 0.15s' }}>
                <div style={{ width: 38, height: 38, borderRadius: 8, flexShrink: 0, background: isSelected ? '#fef2f2' : '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Tv size={16} color={isSelected ? '#dc2626' : '#9ca3af'} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#111827', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pkg.name}</p>
                  <span style={{ display: 'inline-block', marginTop: 3, fontSize: 11, color: '#6b7280', background: '#f3f4f6', padding: '1px 6px', borderRadius: 4 }}>⏱ {pkg.duration}</span>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#dc2626' }}>₦{pkg.customerPrice.toLocaleString()}</p>
                  <div style={{ width: 22, height: 22, borderRadius: '50%', flexShrink: 0, background: isSelected ? '#dc2626' : '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.15s' }}>
                    <Check size={12} color={isSelected ? 'white' : '#d1d5db'} strokeWidth={3} />
                  </div>
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

// ── Main Component ────────────────────────────────────────────────────────────
export default function BuyCableTV() {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedOperator, setSelectedOperator] = useState('');
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [smartCardNumber, setSmartCardNumber] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerConfirmed, setCustomerConfirmed] = useState(false); // ✅ NEW
  const [showCustomerModal, setShowCustomerModal] = useState(false); // ✅ NEW
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [balance, setBalance] = useState(0);
  const [cablePackages, setCablePackages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingPackages, setIsLoadingPackages] = useState(false);
  const [isValidatingCard, setIsValidatingCard] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [operatorDropdownOpen, setOperatorDropdownOpen] = useState(false);
  const [packageSheetOpen, setPackageSheetOpen] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [cardError, setCardError] = useState('');
  const [pinError, setPinError] = useState('');
  const [successData, setSuccessData] = useState(null);

  const operatorDropdownRef = useRef(null);
  const pinInputRef = useRef(null);
  const isMountedRef = useRef(true);

  const operators = [
    { id: 'dstv',      label: 'DStv',      logo: '/assets/images/DStv.png' },
    { id: 'gotv',      label: 'GOtv',      logo: '/assets/images/gotv.jpg' },
    { id: 'startimes', label: 'StarTimes', logo: '/assets/images/startime.png' },
    { id: 'showmax',   label: 'Showmax',   logo: '/assets/images/showmax.png' },
  ];

  const extractBalance = (balanceData) => {
    if (!balanceData) return 0;
    if (typeof balanceData === 'number') return balanceData;
    if (typeof balanceData === 'object') {
      const b = balanceData.mainBalance || balanceData.totalBalance || balanceData.amount || balanceData.balance || balanceData.current || balanceData.value || 0;
      return parseFloat(b) || 0;
    }
    return parseFloat(balanceData) || 0;
  };

  const fetchBalance = async () => {
    try {
      const response = await apiClient.get('/balance');
      if (isMountedRef.current) setBalance(extractBalance(response.data?.balance));
    } catch (error) {
      logger.error('Error fetching balance');
    } finally {
      if (isMountedRef.current) setIsLoading(false);
    }
  };

  const fetchCablePackages = async (operator) => {
    setIsLoadingPackages(true);
    setCablePackages([]);
    setSelectedPackage(null);
    try {
      const response = await apiClient.get(`/cable/packages/${operator}`);
      if (response.data.success && response.data.data) {
        const valid = response.data.data
          .filter((pkg, idx, arr) => pkg.customerPrice > 0 && arr.findIndex(p => p.id === pkg.id) === idx)
          .sort((a, b) => a.customerPrice - b.customerPrice);
        setCablePackages(valid);
      } else {
        alert(response.data?.message || 'Failed to fetch cable packages');
      }
    } catch (error) {
      setCablePackages([]);
      alert(`Failed to load ${operator.toUpperCase()} packages: ${error.message}`);
    } finally {
      setIsLoadingPackages(false);
    }
  };

  const validateSmartCard = async () => {
    if (smartCardNumber.length < 10 || !selectedOperator) return;
    setIsValidatingCard(true);
    setCardError('');
    setCustomerName('');
    setCustomerConfirmed(false);
    try {
      const response = await apiClient.post('/cable/validate-smartcard', {
        smartCardNumber, operator: selectedOperator
      });
      if (response.data?.success) {
        setCustomerName(response.data.customerName || 'Verified Customer');
        setShowCustomerModal(true); // ✅ show modal instead of inline text
      } else {
        setCardError(response.data?.message || 'Validation failed');
      }
    } catch (error) {
      setCardError(error.message || 'Unable to validate');
    } finally {
      setIsValidatingCard(false);
    }
  };

  // ✅ User confirmed in modal
  const handleCustomerConfirm = () => {
    setCustomerConfirmed(true);
    setShowCustomerModal(false);
  };

  // ✅ User tapped "Wrong card? Go back"
  const handleCustomerModalClose = () => {
    setShowCustomerModal(false);
    setCustomerName('');
    setCustomerConfirmed(false);
    setSmartCardNumber('');
    setCardError('');
  };

  const handlePurchase = async () => {
    if (pin.length !== 4) { setPinError('Please enter a 4-digit PIN'); return; }
    setIsProcessing(true);
    setPinError('');
    try {
      const response = await apiClient.post('/purchase', {
        type: 'cable_tv', operator: selectedOperator,
        packageId: selectedPackage?.id, smartCardNumber, phone,
        amount: selectedPackage?.customerPrice, pin,
      });
      if (response.data?.success) {
        setSuccessData({
          transaction: response.data.transaction || {},
          operatorName: operators.find(op => op.id === selectedOperator)?.label,
          phone, smartCardNumber, customerName,
          amount: response.data.transaction?.amount || selectedPackage?.customerPrice,
          packageName: selectedPackage?.name,
          newBalance: response.data.newBalance
        });
        if (response.data.newBalance) setBalance(extractBalance(response.data.newBalance));
        setShowPinModal(false);
        setTimeout(() => setShowSuccessModal(true), 200);
      } else {
        setPinError(response.data?.message || 'Transaction failed');
      }
    } catch (error) {
      setPinError(error.message || 'Unable to process payment');
    } finally {
      setIsProcessing(false);
    }
  };

  const resetForm = () => {
    setCurrentStep(1); setPhone(''); setSelectedOperator('');
    setSelectedPackage(null); setSmartCardNumber(''); setCustomerName('');
    setCustomerConfirmed(false); setPin(''); setCardError(''); setPinError('');
  };

  useEffect(() => { isMountedRef.current = true; return () => { isMountedRef.current = false; }; }, []);
  useEffect(() => { fetchBalance(); }, []);
  useEffect(() => { if (selectedOperator) fetchCablePackages(selectedOperator); }, [selectedOperator]);
  useEffect(() => {
    if (selectedOperator && selectedOperator !== 'showmax' && smartCardNumber.length >= 10 && /^\d+$/.test(smartCardNumber)) {
      const t = setTimeout(validateSmartCard, 1000);
      return () => clearTimeout(t);
    } else {
      if (!isValidatingCard) { setCustomerName(''); setCustomerConfirmed(false); }
    }
  }, [smartCardNumber, selectedOperator]);
  useEffect(() => {
    const handleOutside = (e) => {
      if (operatorDropdownRef.current && !operatorDropdownRef.current.contains(e.target))
        setOperatorDropdownOpen(false);
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);
  useEffect(() => {
    if (showPinModal) setTimeout(() => pinInputRef.current?.focus(), 100);
  }, [showPinModal]);

  const isPhoneValid = phone.length === 11 && /^0[789][01]\d{8}$/.test(phone);
  const isShowmax = selectedOperator === 'showmax';
  const isSmartCardValid = smartCardNumber.length >= 10 && /^\d+$/.test(smartCardNumber);
  // ✅ For non-Showmax: must be confirmed in modal. For Showmax: just valid card number.
  const isCardVerified = isShowmax ? isSmartCardValid : (isSmartCardValid && customerConfirmed);
  const hasEnoughBalance = selectedPackage ? selectedPackage.customerPrice <= balance : true;
  const canProceed = isPhoneValid && selectedOperator && selectedPackage && isCardVerified;
  const selectedOp = operators.find(o => o.id === selectedOperator);

  if (isLoading) {
    return (
      <div className="page-container">
        <div className="loading-container"><div className="spinner" /><p>Loading...</p></div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">CABLE TV</h1>
        <div className="breadcrumb">
          <span className="breadcrumb-link">Dashboard</span>
          <span className="breadcrumb-separator">/</span>
          <span className="breadcrumb-current">Cable TV</span>
        </div>
      </div>

      {currentStep === 1 && (
        <div className="card">
          <div className="wallet-badge">
            <span>Wallet Bal.: ₦{balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>

          {/* Phone */}
          <div className="form-group">
            <label htmlFor="phone">Recipient Phone Number</label>
            <input
              id="phone" type="tel" value={phone}
              onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
              placeholder="08012345678" maxLength={11} className="text-input"
            />
            {phone && !isPhoneValid && <div className="validation-error">Enter valid 11-digit number</div>}
          </div>

          {/* Operator */}
          <div className="form-group">
            <label>Cable TV Operator</label>
            <div className="custom-select-wrapper" ref={operatorDropdownRef}>
              <div className="custom-select-trigger" onClick={() => setOperatorDropdownOpen(!operatorDropdownOpen)}>
                <span className={selectedOperator ? 'selected' : 'placeholder'}>
                  {selectedOp
                    ? <span className="operator-display">
                        <img src={selectedOp.logo} alt="" className="operator-logo" />
                        {selectedOp.label}
                      </span>
                    : '----------'}
                </span>
                <ChevronDown className={`dropdown-icon ${operatorDropdownOpen ? 'open' : ''}`} />
              </div>
              {operatorDropdownOpen && (
                <div className="custom-select-dropdown">
                  {operators.map(op => (
                    <div key={op.id} className={`custom-select-option ${selectedOperator === op.id ? 'selected' : ''}`}
                      onClick={() => {
                        setSelectedOperator(op.id);
                        setOperatorDropdownOpen(false);
                        setSmartCardNumber(''); setCustomerName('');
                        setCustomerConfirmed(false); setCardError('');
                      }}
                    >
                      <img src={op.logo} alt={op.label} className="operator-logo" />
                      {op.label}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Package */}
          {selectedOperator && (
            <div className="form-group">
              <label>Select Package</label>
              {isLoadingPackages ? (
                <div className="loading-packages"><div className="spinner-small" /><span>Loading packages...</span></div>
              ) : cablePackages.length > 0 ? (
                <div className="custom-select-trigger" onClick={() => setPackageSheetOpen(true)}>
                  <span className={selectedPackage ? 'selected' : 'placeholder'}>
                    {selectedPackage
                      ? <span style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center', gap: 8 }}>
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedPackage.name}</span>
                          <span style={{ color: '#dc2626', fontWeight: 700, flexShrink: 0 }}>₦{selectedPackage.customerPrice.toLocaleString()}</span>
                        </span>
                      : 'Tap to choose a package'}
                  </span>
                  <ChevronDown className="dropdown-icon" style={{ flexShrink: 0 }} />
                </div>
              ) : (
                <div className="validation-error">No packages available</div>
              )}
            </div>
          )}

          {/* Smart card */}
          {selectedOperator && (
            <div className="form-group">
              <label>{isShowmax ? 'Showmax Account Number' : 'Smart Card / IUC Number'}</label>
              <div className="input-with-indicator">
                <input
                  type="text" value={smartCardNumber}
                  onChange={e => {
                    setSmartCardNumber(e.target.value.replace(/\D/g, ''));
                    setCustomerName(''); setCustomerConfirmed(false); setCardError('');
                  }}
                  placeholder={isShowmax ? 'Enter Showmax account number' : 'Enter smart card / IUC number'}
                  maxLength={15}
                  className={`text-input ${cardError ? 'error' : ''} ${(customerConfirmed || (isShowmax && isSmartCardValid)) ? 'success' : ''}`}
                />
                {isValidatingCard && !isShowmax && <div className="input-loader"><div className="spinner-small" /></div>}
              </div>
              {cardError && <div className="validation-error">{cardError}</div>}
              {isShowmax && isSmartCardValid && !cardError && (
                <div className="validation-success">✓ Account number entered</div>
              )}
              {/* ✅ Compact confirmed chip — replaces inline success text */}
              {!isShowmax && customerConfirmed && customerName && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, padding: '8px 12px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, fontSize: 13, fontWeight: 600, color: '#15803d' }}>
                  <ShieldCheck size={13} color="#16a34a" />
                  <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{customerName}</span>
                  <button
                    onClick={() => setShowCustomerModal(true)}
                    style={{ marginLeft: 'auto', fontSize: 11, color: '#16a34a', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, textDecoration: 'underline', flexShrink: 0 }}
                  >
                    View
                  </button>
                </div>
              )}
            </div>
          )}

          <button onClick={() => setCurrentStep(2)} className="submit-btn" disabled={!canProceed}>
            {canProceed && selectedPackage
              ? `Review Purchase • ₦${selectedPackage.customerPrice.toLocaleString()}`
              : 'Complete Form to Continue'}
          </button>
        </div>
      )}

      {currentStep === 2 && (
        <div className="card">
          <h2 className="review-title">Review Purchase</h2>
          <div className="summary-card">
            <div className="summary-row">
              <span>Operator</span>
              <span className="summary-value-with-logo">
                <img src={selectedOp?.logo} alt="" className="operator-logo-small" />
                {selectedOp?.label}
              </span>
            </div>
            <div className="summary-row"><span>Phone Number</span><span>{phone}</span></div>
            {selectedPackage && <>
              <div className="summary-row"><span>Package</span><span>{selectedPackage.name}</span></div>
              <div className="summary-row"><span>Duration</span><span>{selectedPackage.duration}</span></div>
            </>}
            <div className="summary-row"><span>Smart Card</span><span>{smartCardNumber}</span></div>
            {customerName && <div className="summary-row"><span>Customer</span><span>{customerName}</span></div>}
            <div className="summary-divider" />
            {selectedPackage && (
              <div className="summary-row total">
                <span>Amount to Pay</span>
                <span>₦{selectedPackage.customerPrice.toLocaleString()}</span>
              </div>
            )}
          </div>
          {!hasEnoughBalance && (
            <div className="insufficient-warning">Insufficient balance. Please fund your wallet.</div>
          )}
          <button
            onClick={() => { if (!hasEnoughBalance) { alert('Insufficient balance.'); return; } setShowPinModal(true); }}
            className="submit-btn" disabled={!hasEnoughBalance}
          >
            {hasEnoughBalance ? 'Proceed to Payment' : 'Insufficient Balance'}
          </button>
          <button onClick={() => setCurrentStep(1)} className="secondary-btn">Back to Form</button>
        </div>
      )}

      {/* PIN modal */}
      {showPinModal && (
        <div className="modal-overlay" onClick={() => !isProcessing && setShowPinModal(false)}>
          <div className="modal-content pin-modal-content" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowPinModal(false)} disabled={isProcessing}><X /></button>
            <h2 className="pin-modal-title">Enter Transaction PIN</h2>
            <p className="pin-modal-subtitle">Enter your 4-digit PIN to complete the purchase</p>
            <div className="pin-input-container" onClick={() => pinInputRef.current?.focus()}>
              <input ref={pinInputRef} type="password" inputMode="numeric" maxLength={4} value={pin}
                onChange={e => { setPin(e.target.value.replace(/\D/g, '')); setPinError(''); }}
                className="pin-input" disabled={isProcessing} />
              <div className="pin-dots">
                {[0,1,2,3].map(i => (
                  <div key={i} className={`pin-dot ${pin.length > i ? 'filled' : ''} ${pinError ? 'error' : ''}`} />
                ))}
              </div>
            </div>
            {pinError && <div className="pin-error-message">{pinError}</div>}
            <button onClick={handlePurchase} className="submit-btn" disabled={pin.length !== 4 || isProcessing}>
              {isProcessing ? 'Processing...' : 'Confirm Purchase'}
            </button>
            <button onClick={() => setShowPinModal(false)} className="cancel-btn" disabled={isProcessing}>Cancel</button>
          </div>
        </div>
      )}

      {/* ✅ Customer Verified Modal */}
      <CustomerVerifiedModal
        isOpen={showCustomerModal}
        onConfirm={handleCustomerConfirm}
        onClose={handleCustomerModalClose}
        customerName={customerName}
        smartCardNumber={smartCardNumber}
        operatorName={selectedOp?.label || ''}
      />

      <PackageBottomSheet
        isOpen={packageSheetOpen}
        onClose={() => setPackageSheetOpen(false)}
        packages={cablePackages}
        selectedPackage={selectedPackage}
        onSelect={setSelectedPackage}
        operatorLabel={selectedOp?.label || ''}
      />

      <CableTVSuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        onSubscribeMore={() => { setShowSuccessModal(false); resetForm(); }}
        provider={successData?.operatorName}
        smartCardNumber={successData?.smartCardNumber}
        customerName={successData?.customerName}
        planName={successData?.packageName}
        amount={successData?.amount}
        reference={successData?.transaction?.reference}
        newBalance={successData?.newBalance}
      />

      <style jsx>{`
        .page-container { padding: 16px 24px; max-width: 1200px; margin: 0 auto; }
        .loading-container { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 400px; gap: 16px; }
        .spinner { width: 48px; height: 48px; border: 4px solid #e5e7eb; border-top-color: #dc2626; border-radius: 50%; animation: spin 1s linear infinite; }
        .spinner-small { width: 20px; height: 20px; border: 3px solid #f3f4f6; border-top-color: #dc2626; border-radius: 50%; animation: spin 0.8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .page-header { margin-bottom: 20px; }
        .page-title { font-size: 20px; font-weight: 700; color: #dc2626; margin: 0 0 8px 0; }
        .breadcrumb { display: flex; align-items: center; gap: 6px; font-size: 14px; }
        .breadcrumb-link { color: #6b7280; cursor: pointer; }
        .breadcrumb-separator { color: #9ca3af; }
        .breadcrumb-current { color: #1f2937; font-weight: 500; }
        .card { background: white; border-radius: 10px; padding: 20px; box-shadow: 0 1px 2px rgba(0,0,0,0.05); border: 1px solid #e5e7eb; max-width: 600px; margin: 0 auto; }
        .wallet-badge { background: white; border: 1px solid #d1d5db; padding: 10px 14px; border-radius: 6px; margin-bottom: 20px; display: inline-block; }
        .wallet-badge span { font-size: 13px; font-weight: 700; color: #16a34a; }
        .form-group { margin-bottom: 20px; }
        .form-group label { display: block; font-size: 14px; font-weight: 600; color: #374151; margin-bottom: 8px; }
        .custom-select-wrapper { position: relative; }
        .custom-select-trigger { width: 100%; padding: 12px 14px; font-size: 15px; border: 1px solid #d1d5db; border-radius: 6px; background: white; cursor: pointer; display: flex; justify-content: space-between; align-items: center; box-sizing: border-box; }
        .custom-select-trigger:hover { border-color: #9ca3af; }
        .custom-select-trigger .placeholder { color: #9ca3af; }
        .custom-select-trigger .selected { color: #1f2937; font-weight: 500; display: flex; width: 100%; min-width: 0; }
        .dropdown-icon { transition: transform 0.2s; flex-shrink: 0; margin-left: 8px; }
        .dropdown-icon.open { transform: rotate(180deg); }
        .custom-select-dropdown { position: absolute; top: calc(100% + 4px); left: 0; right: 0; background: white; border: 1px solid #d1d5db; border-radius: 6px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); z-index: 1000; }
        .custom-select-option { padding: 12px 14px; cursor: pointer; transition: all 0.15s; display: flex; align-items: center; gap: 10px; color: #1f2937; font-weight: 500; }
        .custom-select-option:hover:not(.disabled) { background: #fef2f2; color: #dc2626; }
        .custom-select-option.selected { background: #dc2626; color: white; }
        .operator-display { display: flex; align-items: center; gap: 10px; }
        .operator-logo { width: 24px; height: 24px; object-fit: contain; }
        .operator-logo-small { width: 20px; height: 20px; object-fit: contain; margin-right: 6px; }
        .text-input { width: 100%; padding: 12px 14px; font-size: 15px; border: 1px solid #d1d5db; border-radius: 6px; transition: all 0.2s; color: #1f2937; font-weight: 500; background: white; box-sizing: border-box; }
        .text-input:focus { outline: none; border-color: #dc2626; box-shadow: 0 0 0 3px rgba(220,38,38,0.1); }
        .text-input.error { border-color: #ef4444; background: #fff5f5; }
        .text-input.success { border-color: #22c55e; background: #f0fdf4; }
        .input-with-indicator { position: relative; }
        .input-loader { position: absolute; right: 14px; top: 50%; transform: translateY(-50%); }
        .loading-packages { display: flex; align-items: center; gap: 12px; padding: 12px 14px; background: #f9fafb; border-radius: 6px; border: 1px solid #e5e7eb; }
        .validation-error { color: #ef4444; font-size: 13px; margin-top: 6px; font-weight: 500; }
        .validation-success { color: #16a34a; font-size: 13px; margin-top: 6px; font-weight: 500; background: #f0fdf4; padding: 6px 10px; border-radius: 4px; display: inline-block; }
        .submit-btn { width: 100%; padding: 14px; background: #dc2626; color: white; font-size: 16px; font-weight: 600; border: none; border-radius: 6px; cursor: pointer; transition: all 0.2s; margin-top: 8px; }
        .submit-btn:hover:not(:disabled) { background: #b91c1c; transform: translateY(-1px); box-shadow: 0 4px 12px rgba(220,38,38,0.3); }
        .submit-btn:disabled { background: #d1d5db; cursor: not-allowed; transform: none; box-shadow: none; }
        .cancel-btn { width: 100%; padding: 14px; background: white; color: #6b7280; font-size: 16px; font-weight: 600; border: 1px solid #e5e7eb; border-radius: 6px; cursor: pointer; margin-top: 12px; }
        .review-title { font-size: 18px; font-weight: 700; color: #1f2937; margin: 0 0 16px 0; }
        .summary-card { background: #f9fafb; border-radius: 10px; padding: 16px; margin-bottom: 16px; }
        .summary-row { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #e5e7eb; font-size: 14px; }
        .summary-row:last-child { border-bottom: none; }
        .summary-row span:first-child { color: #6b7280; font-weight: 500; }
        .summary-row span:last-child { color: #1f2937; font-weight: 600; }
        .summary-value-with-logo { display: flex; align-items: center; gap: 8px; }
        .summary-divider { height: 1px; background: #e5e7eb; margin: 12px 0; }
        .summary-row.total { padding: 16px; background: #fef2f2; margin: 12px -16px -16px; border-radius: 0 0 10px 10px; border-bottom: none; }
        .summary-row.total span:first-child { color: #1f2937; font-size: 15px; font-weight: 600; }
        .summary-row.total span:last-child { color: #dc2626; font-size: 24px; font-weight: 700; }
        .insufficient-warning { padding: 10px; background: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; color: #dc2626; font-size: 13px; font-weight: 500; text-align: center; margin-bottom: 16px; }
        .secondary-btn { width: 100%; padding: 14px; background: white; color: #6b7280; font-size: 16px; font-weight: 600; border: 1px solid #e5e7eb; border-radius: 6px; cursor: pointer; margin-top: 12px; }
        .secondary-btn:hover { background: #f9fafb; }
        .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 9999; padding: 16px; }
        .modal-content { background: white; border-radius: 16px; padding: 32px 24px; max-width: 500px; width: 100%; position: relative; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1); }
        .pin-modal-content { max-width: 400px; }
        .modal-close { position: absolute; top: 16px; right: 16px; background: #f3f4f6; border: none; border-radius: 8px; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #6b7280; }
        .pin-modal-title { font-size: 22px; font-weight: 700; text-align: center; margin-bottom: 8px; color: #1f2937; }
        .pin-modal-subtitle { font-size: 14px; color: #6b7280; text-align: center; margin-bottom: 24px; }
        .pin-input-container { position: relative; margin-bottom: 20px; cursor: text; }
        .pin-input { width: 100%; padding: 16px; font-size: 24px; text-align: center; border: 2px solid #d1d5db; border-radius: 8px; opacity: 0; position: absolute; top: 0; left: 0; height: 100%; }
        .pin-dots { display: flex; justify-content: center; gap: 16px; padding: 24px; background: #f9fafb; border-radius: 8px; border: 2px solid #d1d5db; }
        .pin-dot { width: 16px; height: 16px; border-radius: 50%; background: #e5e7eb; transition: all 0.2s; }
        .pin-dot.filled { background: #dc2626; transform: scale(1.1); }
        .pin-dot.error { background: #ef4444; }
        .pin-error-message { background: #fef2f2; color: #dc2626; padding: 12px; border-radius: 6px; font-size: 14px; text-align: center; margin-bottom: 16px; }
        @media (max-width: 768px) { .page-container { padding: 12px; } .card { padding: 16px; } }
      `}</style>
    </div>
  );
}