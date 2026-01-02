'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, X, Check, RefreshCw } from 'lucide-react';
import apiClient from '@/lib/api';
import { CableTVSuccessModal } from '@/components/SuccessModal/page';



export default function BuyCableTV() {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedOperator, setSelectedOperator] = useState('');
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [smartCardNumber, setSmartCardNumber] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [balance, setBalance] = useState(0);
  const [cablePackages, setCablePackages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingPackages, setIsLoadingPackages] = useState(false);
  const [isValidatingCard, setIsValidatingCard] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRefreshingBalance, setIsRefreshingBalance] = useState(false);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);
  const [operatorDropdownOpen, setOperatorDropdownOpen] = useState(false);
  const [packageDropdownOpen, setPackageDropdownOpen] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [cardError, setCardError] = useState('');
  const [pinError, setPinError] = useState('');
  const [successData, setSuccessData] = useState(null);
  
  const operatorDropdownRef = useRef(null);
  const packageDropdownRef = useRef(null);
  const pinInputRef = useRef(null);
  const isMountedRef = useRef(true);

  const operators = [
    { id: 'dstv', label: 'DStv', logo: '/assets/images/DStv.png' },
    { id: 'gotv', label: 'GOtv', logo: '/assets/images/gotv.jpg' },
    { id: 'startime', label: 'StarTimes', logo: '/assets/images/startime.png' },
    { id: 'showmax', label: 'Showmax', logo: '/assets/images/showmax.png', disabled: true, comingSoon: true }
  ];

  const extractBalance = (balanceData) => {
    if (!balanceData) return 0;
    if (typeof balanceData === 'number') return balanceData;
    if (typeof balanceData === 'object') {
      const balance = balanceData.amount || balanceData.balance || balanceData.current || balanceData.value || 0;
      return parseFloat(balance) || 0;
    }
    return parseFloat(balanceData) || 0;
  };

  const fetchBalance = async () => {
    setIsLoadingBalance(true);
    try {
      const response = await apiClient.get('/balance');
      if (response.data?.success && isMountedRef.current) {
        setBalance(extractBalance(response.data.balance));
      } else if (response.data?.balance !== undefined && isMountedRef.current) {
        setBalance(extractBalance(response.data.balance));
      }
    } catch (error) {
      console.error('Error fetching balance:', error);
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
        setIsLoadingBalance(false);
      }
    }
  };

  const refreshBalance = async () => {
    setIsRefreshingBalance(true);
    try {
      await fetchBalance();
    } finally {
      setIsRefreshingBalance(false);
    }
  };

  const fetchCablePackages = async (operator) => {
    setIsLoadingPackages(true);
    setCablePackages([]);
    setSelectedPackage(null);
    
    try {
      console.log('🔍 Fetching packages for:', operator);
      
      // ✅ Backend fetches directly from ClubKonnect - USE GET NOT POST!
      const response = await apiClient.get(`/cable/packages/${operator}`);
      
      console.log('📦 Package Response:', response);
      console.log('📦 Response Data:', response.data);

      if (response.data.success && response.data.data) {
        console.log('✅ Raw packages:', response.data.data);
        
        // Remove duplicates based on package ID and name
        const uniquePackages = response.data.data.reduce((acc, pkg) => {
          const existingIndex = acc.findIndex(p => 
            p.id === pkg.id || (p.name === pkg.name && p.customerPrice === pkg.customerPrice)
          );
          if (existingIndex === -1) {
            acc.push(pkg);
          }
          return acc;
        }, []);
        
        // Data already comes formatted from backend
        const validPackages = uniquePackages
          .filter(pkg => pkg.customerPrice > 0)
          .sort((a, b) => a.customerPrice - b.customerPrice);

        console.log('✅ Valid packages after filter:', validPackages);

        if (validPackages.length === 0) {
          alert('No valid packages available for this operator. All packages have zero price.');
        } else {
          setCablePackages(validPackages);
          console.log(`✅ Loaded ${validPackages.length} packages from ClubKonnect`);
        }
      } else {
        console.error('❌ Response format issue:', response.data);
        alert(response.data?.message || 'Failed to fetch cable packages - invalid response format');
      }
    } catch (error) {
      console.error('❌ Package fetch error:', error);
      console.error('❌ Error details:', error.message);
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

    try {
      const response = await apiClient.post('/cable/validate-smartcard', {
        smartCardNumber,
        operator: selectedOperator
      });

      if (response.data?.success) {
        setCustomerName(response.data.customerName || 'Verified Customer');
      } else {
        setCardError(response.data?.message || 'Validation failed');
      }
    } catch (error) {
      setCardError(error.message || 'Unable to validate');
    } finally {
      setIsValidatingCard(false);
    }
  };

  const handleProceedToPinEntry = () => {
    if (!hasEnoughBalance) {
      alert('Insufficient balance. Please fund your wallet to continue.');
      return;
    }
    setShowPinModal(true);
  };

  const handlePurchase = async () => {
    if (pin.length !== 4) {
      setPinError('Please enter a 4-digit PIN');
      return;
    }

    setIsProcessing(true);
    setPinError('');

    try {
      console.log('🔄 Sending purchase request:', {
        type: 'cable_tv',
        operator: selectedOperator,
        packageId: selectedPackage?.id,
        smartCardNumber,
        phone,
        amount: selectedPackage?.customerPrice,
      });

      const response = await apiClient.post('/purchase', {
        type: 'cable_tv',
        operator: selectedOperator,
        packageId: selectedPackage?.id,
        smartCardNumber,
        phone,
        amount: selectedPackage?.customerPrice,
        pin,
      });

      console.log('✅ Purchase response:', response.data);

      if (response.data?.success) {
        setSuccessData({
          transaction: response.data.transaction || {},
          operatorName: operators.find(op => op.id === selectedOperator)?.label,
          phone,
          smartCardNumber,
          customerName,
          amount: response.data.transaction?.amount || selectedPackage?.customerPrice,
          packageName: selectedPackage?.name,
          newBalance: response.data.newBalance
        });

        if (response.data.newBalance) {
          setBalance(extractBalance(response.data.newBalance));
        }

        setShowPinModal(false);
        setTimeout(() => setShowSuccessModal(true), 200);
      } else {
        setPinError(response.data?.message || 'Transaction failed');
      }
    } catch (error) {
      console.error('❌ Purchase error:', error);
      setPinError(error.message || 'Unable to process payment');
    } finally {
      setIsProcessing(false);
    }
  };

  const resetForm = () => {
    setCurrentStep(1);
    setPhone('');
    setSelectedOperator('');
    setSelectedPackage(null);
    setSmartCardNumber('');
    setCustomerName('');
    setPin('');
    setCardError('');
    setPinError('');
  };

  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  useEffect(() => {
    fetchBalance();
  }, []);

  useEffect(() => {
    if (selectedOperator) {
      fetchCablePackages(selectedOperator);
    }
  }, [selectedOperator]);

  useEffect(() => {
    if (selectedOperator && smartCardNumber.length >= 10 && /^\d+$/.test(smartCardNumber)) {
      const timer = setTimeout(validateSmartCard, 1000);
      return () => clearTimeout(timer);
    }
  }, [smartCardNumber, selectedOperator]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (operatorDropdownRef.current && !operatorDropdownRef.current.contains(event.target)) {
        setOperatorDropdownOpen(false);
      }
      if (packageDropdownRef.current && !packageDropdownRef.current.contains(event.target)) {
        setPackageDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (showPinModal) {
      setTimeout(() => pinInputRef.current?.focus(), 100);
    }
  }, [showPinModal]);

  const isPhoneValid = phone.length === 11 && /^0[789][01]\d{8}$/.test(phone);
  const isSmartCardValid = smartCardNumber.length >= 10 && /^\d+$/.test(smartCardNumber);
  const hasEnoughBalance = selectedPackage ? selectedPackage.customerPrice <= balance : true;
  const canProceedToReview = isPhoneValid && selectedOperator && selectedPackage && isSmartCardValid && customerName;

  if (isLoading) {
    return (
      <div className="page-container">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading...</p>
        </div>
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

          <div className="form-group">
            <label htmlFor="phone">Recipient Phone Number</label>
            <input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
              placeholder="08012345678"
              maxLength={11}
              className="text-input"
            />
            {phone && !isPhoneValid && (
              <div className="validation-error">Enter valid 11-digit number</div>
            )}
            {isPhoneValid && (
              <div className="validation-success">✓ Valid phone number</div>
            )}
          </div>

          <div className="form-group">
            <label>Cable TV Operator</label>
            <div className="custom-select-wrapper" ref={operatorDropdownRef}>
              <div 
                className="custom-select-trigger"
                onClick={() => setOperatorDropdownOpen(!operatorDropdownOpen)}
              >
                <span className={selectedOperator ? 'selected' : 'placeholder'}>
                  {selectedOperator 
                    ? <span className="operator-display">
                        <img src={operators.find(n => n.id === selectedOperator)?.logo} alt="" className="operator-logo" />
                        {operators.find(n => n.id === selectedOperator)?.label}
                      </span>
                    : '----------'}
                </span>
                <ChevronDown className={`dropdown-icon ${operatorDropdownOpen ? 'open' : ''}`} />
              </div>
              
              {operatorDropdownOpen && (
                <div className="custom-select-dropdown">
                  {operators.map(operator => (
                    <div
                      key={operator.id}
                      className={`custom-select-option ${selectedOperator === operator.id ? 'selected' : ''} ${operator.disabled ? 'disabled' : ''}`}
                      onClick={() => !operator.disabled && (setSelectedOperator(operator.id), setOperatorDropdownOpen(false))}
                    >
                      <img src={operator.logo} alt={operator.label} className="operator-logo" />
                      {operator.label}
                      {operator.comingSoon && <span className="coming-soon-badge">Soon</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {selectedOperator && (
            <div className="form-group">
              <label>Select Package</label>
              {isLoadingPackages ? (
                <div className="loading-packages">
                  <div className="spinner-small"></div>
                  <span>Loading packages...</span>
                </div>
              ) : cablePackages.length > 0 ? (
                <div className="custom-select-wrapper" ref={packageDropdownRef}>
                  <div 
                    className="custom-select-trigger"
                    onClick={() => setPackageDropdownOpen(!packageDropdownOpen)}
                  >
                  <span className={selectedPackage ? 'selected' : 'placeholder'}>
                      {selectedPackage 
                        ? selectedPackage.name
                        : 'Choose Package'}
                    </span>
                    <ChevronDown className={`dropdown-icon ${packageDropdownOpen ? 'open' : ''}`} />
                  </div>
                  
                  {packageDropdownOpen && (
                    <div className="custom-select-dropdown package-dropdown">
                      {cablePackages.map(pkg => (
                     <div
                          key={pkg.id}
                          className={`package-option ${selectedPackage?.id === pkg.id ? 'selected' : ''}`}
                          onClick={() => (setSelectedPackage(pkg), setPackageDropdownOpen(false))}
                        >
                          <div className="package-option-details">
                            <div className="package-option-name">{pkg.name}</div>
                            <div className="package-duration">⏱ {pkg.duration}</div>
                          </div>
                          {selectedPackage?.id === pkg.id && <Check className="package-check" />}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="validation-error">No packages available</div>
              )}
            </div>
          )}

          {selectedOperator && (
            <div className="form-group">
              <label>Smart Card Number</label>
              <div className="input-with-indicator">
                <input
                  type="text"
                  value={smartCardNumber}
                  onChange={(e) => setSmartCardNumber(e.target.value.replace(/\D/g, ''))}
                  placeholder="Enter smart card number"
                  maxLength={15}
                  className={`text-input ${cardError ? 'error' : ''} ${customerName ? 'success' : ''}`}
                />
                {isValidatingCard && (
                  <div className="input-loader">
                    <div className="spinner-small"></div>
                  </div>
                )}
              </div>
              {cardError && <div className="validation-error">{cardError}</div>}
              {customerName && <div className="validation-success"> {customerName}</div>}
            </div>
          )}

          <button 
            onClick={() => setCurrentStep(2)} 
            className="submit-btn"
            disabled={!canProceedToReview}
          >
            {canProceedToReview && selectedPackage 
              ? `Review Purchase• ₦${selectedPackage.customerPrice.toLocaleString()}`
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
                <img src={operators.find(op => op.id === selectedOperator)?.logo} alt="" className="operator-logo-small" />
                {operators.find(op => op.id === selectedOperator)?.label}
              </span>
            </div>

            <div className="summary-row">
              <span>Phone Number</span>
              <span>{phone}</span>
            </div>

            {selectedPackage && (
              <>
                <div className="summary-row">
                  <span>Package</span>
                  <span>{selectedPackage.name}</span>
                </div>

                <div className="summary-row">
                  <span>Duration</span>
                  <span>{selectedPackage.duration}</span>
                </div>
              </>
            )}

            <div className="summary-row">
              <span>Smart Card</span>
              <span>{smartCardNumber}</span>
            </div>

            {customerName && (
              <div className="summary-row">
                <span>Customer</span>
                <span>{customerName}</span>
              </div>
            )}

            <div className="summary-divider"></div>

            {selectedPackage && (
              <div className="summary-row total">
                <span>Amount to Pay</span>
                <span>₦{selectedPackage.customerPrice.toLocaleString()}</span>
              </div>
            )}
          </div>

          {selectedPackage && selectedPackage.customerPrice > balance && (
            <div className="insufficient-warning">
              Insufficient balance. Please fund your wallet to continue.
            </div>
          )}

          <button 
            onClick={handleProceedToPinEntry} 
            className="submit-btn"
            disabled={!hasEnoughBalance || isProcessing}
          >
            {hasEnoughBalance ? 'Proceed to Payment' : 'Insufficient Balance'}
          </button>

          <button onClick={() => setCurrentStep(1)} className="secondary-btn">
            Back to Form
          </button>
        </div>
      )}

      {showPinModal && (
        <div className="modal-overlay" onClick={() => !isProcessing && setShowPinModal(false)}>
          <div className="modal-content pin-modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowPinModal(false)} disabled={isProcessing}>
              <X />
            </button>

            <h2 className="pin-modal-title">Enter Transaction PIN</h2>
            <p className="pin-modal-subtitle">Enter your 4-digit PIN to complete the purchase</p>

            <div className="pin-input-container">
              <input
                ref={pinInputRef}
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={pin}
                onChange={(e) => (setPin(e.target.value.replace(/\D/g, '')), setPinError(''))}
                className="pin-input"
                disabled={isProcessing}
              />
              <div className="pin-dots">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className={`pin-dot ${pin.length > i ? 'filled' : ''} ${pinError ? 'error' : ''}`} />
                ))}
              </div>
            </div>

            {pinError && <div className="pin-error-message">{pinError}</div>}

            <button onClick={handlePurchase} className="submit-btn" disabled={pin.length !== 4 || isProcessing}>
              {isProcessing ? 'Processing...' : 'Confirm Purchase'}
            </button>

            <button onClick={() => setShowPinModal(false)} className="cancel-btn" disabled={isProcessing}>
              Cancel
            </button>
          </div>
        </div>
      )}

{/* Success Modal - Using reusable component */}
<CableTVSuccessModal
  isOpen={showSuccessModal}
  onClose={() => setShowSuccessModal(false)}
  onSubscribeMore={() => {
    setShowSuccessModal(false);
    resetForm();
  }}
  provider={successData?.operatorName}
  smartCardNumber={successData?.smartCardNumber}
  customerName={successData?.customerName}
  planName={successData?.packageName}
  amount={successData?.amount}
  reference={successData?.transaction?.reference}
  newBalance={successData?.newBalance}
/>

      <style jsx>{`
        .page-container {
          padding: 16px 24px;
          max-width: 1200px;
          margin: 0 auto;
        }
        .loading-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 400px;
          gap: 16px;
        }
        .spinner {
          width: 48px;
          height: 48px;
          border: 4px solid #e5e7eb;
          border-top-color: #dc2626;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        .spinner-small {
          width: 20px;
          height: 20px;
          border: 3px solid #f3f4f6;
          border-top-color: #dc2626;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .spinning {
          animation: spin 1s linear infinite;
        }
        .page-header {
          margin-bottom: 20px;
        }
        .page-title {
          font-size: 20px;
          font-weight: 700;
          color: #dc2626;
          margin: 0 0 8px 0;
        }
        .breadcrumb {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 14px;
        }
        .breadcrumb-link {
          color: #6b7280;
          cursor: pointer;
        }
        .breadcrumb-separator {
          color: #9ca3af;
        }
        .breadcrumb-current {
          color: #1f2937;
          font-weight: 500;
        }
        .card {
          background: white;
          border-radius: 10px;
          padding: 20px;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
          border: 1px solid #e5e7eb;
          max-width: 600px;
          margin: 0 auto;
        }
        .wallet-badge {
          background: white;
          border: 1px solid #d1d5db;
          padding: 10px 14px;
          border-radius: 6px;
          margin-bottom: 20px;
          display: inline-block;
        }
        .wallet-badge span {
          font-size: 13px;
          font-weight: 700;
          color: #16a34a;
        }
        .form-group {
          margin-bottom: 20px;
        }
        .form-group label {
          display: block;
          font-size: 14px;
          font-weight: 600;
          color: #374151;
          margin-bottom: 8px;
        }
        .custom-select-wrapper {
          position: relative;
        }
        .custom-select-trigger {
          width: 100%;
          padding: 12px 14px;
          font-size: 15px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          background: white;
          cursor: pointer;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .custom-select-trigger:hover {
          border-color: #9ca3af;
        }
        .custom-select-trigger .placeholder {
          color: #9ca3af;
        }
        .custom-select-trigger .selected {
          color: #1f2937;
          font-weight: 500;
        }
        .dropdown-icon {
          transition: transform 0.2s;
        }
        .dropdown-icon.open {
          transform: rotate(180deg);
        }
        .custom-select-dropdown {
          position: absolute;
          top: calc(100% + 4px);
          left: 0;
          right: 0;
          background: white;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          z-index: 1000;
          max-height: 300px;
          overflow-y: auto;
        }
        .custom-select-option {
          padding: 12px 14px;
          cursor: pointer;
          transition: all 0.15s;
          display: flex;
          align-items: center;
          gap: 10px;
          color: #1f2937;
          font-weight: 500;
        }
        .custom-select-option:hover:not(.disabled) {
          background: #fef2f2;
          color: #dc2626;
        }
        .custom-select-option.selected {
          background: #dc2626;
          color: white;
        }
        .custom-select-option.disabled {
          cursor: not-allowed;
        }
        .custom-select-option.disabled .operator-logo {
          opacity: 0.5;
        }
        .custom-select-option.disabled span:not(.coming-soon-badge) {
          opacity: 0.5;
        }
        .coming-soon-badge {
          background: #ff9500;
          color: white;
          font-size: 10px;
          padding: 2px 6px;
          border-radius: 4px;
          margin-left: auto;
        }
        .operator-display {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .operator-logo {
          width: 24px;
          height: 24px;
          object-fit: contain;
        }
        .operator-logo-small {
          width: 20px;
          height: 20px;
          object-fit: contain;
          margin-right: 6px;
        }
        .package-dropdown {
          max-height: 350px;
        }
        .package-option {
          padding: 10px 14px;
          cursor: pointer;
          border-bottom: 1px solid #f3f4f6;
          display: flex;
          align-items: center;
          gap: 12px;
          transition: background 0.15s;
        }
        .package-option:hover {
          background: #fef2f2;
        }
        .package-option.selected {
          background: #fff5f5;
          border-left: 3px solid #dc2626;
        }
        .package-option-details {
          flex: 1;
        }
       .package-option-name {
          font-size: 14px;
          font-weight: 600;
          color: #1f2937;
          margin-bottom: 4px;
          line-height: 1.3;
        }
     
        .package-duration {
          font-size: 11px;
          color: #6b7280;
          background: #f3f4f6;
          padding: 2px 6px;
          border-radius: 3px;
          display: inline-block;
        }
    
        .package-check {
          color: #dc2626;
          width: 18px;
          height: 18px;
        }
        .text-input {
          width: 100%;
          padding: 12px 14px;
          font-size: 15px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          transition: all 0.2s;
          color: #1f2937;
          font-weight: 500;
          background: white;
        }
        .text-input:hover {
          border-color: #9ca3af;
        }
        .text-input:focus {
          outline: none;
          border-color: #dc2626;
          box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.1);
        }
        .text-input.error {
          border-color: #ef4444;
          background: #fff5f5;
        }
        .text-input.success {
          border-color: #22c55e;
          background: #f0fdf4;
        }
        .input-with-indicator {
          position: relative;
        }
        .input-loader {
          position: absolute;
          right: 14px;
          top: 50%;
          transform: translateY(-50%);
        }
        .loading-packages {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 14px;
          background: #f9fafb;
          border-radius: 6px;
          border: 1px solid #e5e7eb;
        }
        .validation-error {
          color: #ef4444;
          font-size: 13px;
          margin-top: 6px;
          font-weight: 500;
        }
        .validation-success {
          color: #22c55e;
          font-size: 13px;
          margin-top: 6px;
          font-weight: 500;
          background: #f0fdf4;
          padding: 6px 10px;
          border-radius: 4px;
          display: inline-block;
        }
        .submit-btn {
          width: 100%;
          padding: 14px;
          background: #dc2626;
          color: white;
          font-size: 16px;
          font-weight: 600;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s;
          margin-top: 8px;
        }
        .submit-btn:hover:not(:disabled) {
          background: #b91c1c;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(220, 38, 38, 0.3);
        }
        .submit-btn:disabled {
          background: #d1d5db;
          cursor: not-allowed;
        }
        .cancel-btn {
          width: 100%;
          padding: 14px;
          background: white;
          color: #6b7280;
          font-size: 16px;
          font-weight: 600;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s;
          margin-top: 12px;
        }
        .cancel-btn:hover {
          background: #f9fafb;
        }
        .review-title {
          font-size: 18px;
          font-weight: 700;
          color: #1f2937;
          margin: 0 0 16px 0;
        }
        .summary-card {
          background: #f9fafb;
          border-radius: 10px;
          padding: 16px;
          margin-bottom: 16px;
        }
        .summary-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 0;
          border-bottom: 1px solid #e5e7eb;
          font-size: 14px;
        }
        .summary-row:last-child {
          border-bottom: none;
        }
        .summary-row span:first-child {
          color: #6b7280;
          font-weight: 500;
        }
        .summary-row span:last-child {
          color: #1f2937;
          font-weight: 600;
        }
        .summary-value-with-logo {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #1f2937;
          font-weight: 600;
        }
        .summary-divider {
          height: 1px;
          background: #e5e7eb;
          margin: 12px 0;
        }
        .summary-row.total {
          padding: 16px;
          background: #fef2f2;
          margin: 12px -16px -16px;
          border-radius: 0 0 10px 10px;
          border-bottom: none;
        }
        .summary-row.total span:first-child {
          color: #1f2937;
          font-size: 15px;
          font-weight: 600;
        }
        .summary-row.total span:last-child {
          color: #dc2626;
          font-size: 24px;
          font-weight: 700;
        }
        .insufficient-warning {
          margin-top: 12px;
          padding: 10px;
          background: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: 6px;
          color: #dc2626;
          font-size: 13px;
          font-weight: 500;
          text-align: center;
          margin-bottom: 16px;
        }
        .secondary-btn {
          width: 100%;
          padding: 14px;
          background: white;
          color: #6b7280;
          font-size: 16px;
          font-weight: 600;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s;
          margin-top: 12px;
        }
        .secondary-btn:hover {
          background: #f9fafb;
          color: #1f2937;
        }
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          padding: 16px;
        }
        .modal-content {
          background: white;
          border-radius: 16px;
          padding: 32px 24px;
          max-width: 500px;
          width: 100%;
          position: relative;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
        }
        .pin-modal-content {
          max-width: 400px;
        }
        .modal-close {
          position: absolute;
          top: 16px;
          right: 16px;
          background: #f3f4f6;
          border: none;
          border-radius: 8px;
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: #6b7280;
        }
        .modal-close:hover {
          background: #e5e7eb;
        }
        .pin-modal-title {
          font-size: 22px;
          font-weight: 700;
          text-align: center;
          margin-bottom: 8px;
          color: #1f2937;
        }
        .pin-modal-subtitle {
          font-size: 14px;
          color: #6b7280;
          text-align: center;
          margin-bottom: 24px;
        }
        .pin-input-container {
          position: relative;
          margin-bottom: 20px;
        }
        .pin-input {
          width: 100%;
          padding: 16px;
          font-size: 24px;
          text-align: center;
          border: 2px solid #d1d5db;
          border-radius: 8px;
          opacity: 0;
          position: absolute;
        }
        .pin-dots {
          display: flex;
          justify-content: center;
          gap: 16px;
          padding: 24px;
          background: #f9fafb;
          border-radius: 8px;
          border: 2px solid #d1d5db;
        }
        .pin-dot {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #e5e7eb;
          transition: all 0.2s;
        }
        .pin-dot.filled {
          background: #dc2626;
          transform: scale(1.1);
        }
        .pin-dot.error {
          background: #ef4444;
        }
        .pin-error-message {
          background: #fef2f2;
          color: #dc2626;
          padding: 12px;
          border-radius: 6px;
          font-size: 14px;
          text-align: center;
          margin-bottom: 16px;
        }

        @media (max-width: 768px) {
          .page-container {
            padding: 12px;
          }
          .card {
            padding: 16px;
          }
        }
      `}</style>
    </div>
  );
}