'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, X, RefreshCw, Check } from 'lucide-react';
import apiClient, { storage } from '@/lib/api';
import { ElectricitySuccessModal } from '@/components/SuccessModal/page';

interface ElectricityProvider {
  id: string;
  name: string;
  fullName: string;
  acronym: string;
  isActive: boolean;
  minAmount: number;
  maxAmount: number;
  fee: number;
}

interface MeterType {
  id: string;
  name: string;
  type: 'prepaid' | 'postpaid';
  description: string;
}

interface PinStatus {
  isPinSet: boolean;
  hasPinSet: boolean;
  isLocked: boolean;
  lockTimeRemaining: number;
  attemptsRemaining: number;
}

const extractBalance = (balanceData: any): number => {
  if (balanceData === null || balanceData === undefined) return 0;
  if (typeof balanceData === 'number') return balanceData;
  if (typeof balanceData === 'object') {
    const balance = balanceData.amount || balanceData.balance || balanceData.current || balanceData.value || 0;
    return parseFloat(balance) || 0;
  }
  return parseFloat(balanceData) || 0;
};

export default function BuyElectricityPage() {
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);
  const [selectedProvider, setSelectedProvider] = useState<ElectricityProvider | null>(null);
  const [selectedMeterType, setSelectedMeterType] = useState<MeterType | null>(null);
  const [meterNumber, setMeterNumber] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerAccountNumber, setCustomerAccountNumber] = useState('');
  const [amount, setAmount] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [pin, setPin] = useState('');
  
  const [showProvidersModal, setShowProvidersModal] = useState(false);
  const [showMeterTypeModal, setShowMeterTypeModal] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  
  const [balance, setBalance] = useState(0);
  const [pinStatus, setPinStatus] = useState<PinStatus | null>(null);
  const [electricityProviders, setElectricityProviders] = useState<ElectricityProvider[]>([]);
  const [successData, setSuccessData] = useState<any>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);
  const [isValidatingMeter, setIsValidatingMeter] = useState(false);
  const [isLoadingProviders, setIsLoadingProviders] = useState(false);
  
  const [pinError, setPinError] = useState('');
  const [meterError, setMeterError] = useState('');
  
  const providersModalRef = useRef<HTMLDivElement>(null);
  const meterTypeModalRef = useRef<HTMLDivElement>(null);
  const pinModalRef = useRef<HTMLDivElement>(null);
  const pinInputRef = useRef<HTMLInputElement>(null);
  const isMountedRef = useRef(true);

  const meterTypes: MeterType[] = [
    { id: '01', name: 'Prepaid Meter', type: 'prepaid', description: 'Pay before you use - Buy units in advance' },
    { id: '02', name: 'Postpaid Meter', type: 'postpaid', description: 'Pay after you use - Monthly billing' },
  ];

  const defaultProviders: ElectricityProvider[] = [
    { id: '01', name: 'Eko Electric', fullName: 'Eko Electricity Distribution Company', acronym: 'EKEDC', isActive: true, minAmount: 500, maxAmount: 100000, fee: 0 },
    { id: '02', name: 'Ikeja Electric', fullName: 'Ikeja Electric Distribution Company', acronym: 'IKEDC', isActive: true, minAmount: 500, maxAmount: 100000, fee: 0 },
    { id: '03', name: 'Abuja Electric', fullName: 'Abuja Electricity Distribution Company', acronym: 'AEDC', isActive: true, minAmount: 500, maxAmount: 100000, fee: 0 },
    { id: '07', name: 'Ibadan Electric', fullName: 'Ibadan Electricity Distribution Company', acronym: 'IBEDC', isActive: true, minAmount: 500, maxAmount: 100000, fee: 0 },
  ];

  const isMeterNumberValid = meterNumber.length >= 10 && /^\d+$/.test(meterNumber);
  const amountNum = parseInt(amount) || 0;
  const isAmountValid = amountNum >= 500 && amountNum <= 100000;
  const isPhoneValid = phoneNumber.length === 11;
  const hasEnoughBalance = amountNum <= balance;
  const canProceed = selectedProvider && selectedMeterType && 
                    isMeterNumberValid && isAmountValid && isPhoneValid &&
                    customerName.trim() !== '' && hasEnoughBalance;

  useEffect(() => {
    if (isMeterNumberValid && selectedProvider && selectedMeterType && meterNumber.length >= 10) {
      const timer = setTimeout(() => validateMeter(), 1500);
      return () => clearTimeout(timer);
    } else {
      setCustomerName('');
      setCustomerAddress('');
      setCustomerAccountNumber('');
      setMeterError('');
    }
  }, [meterNumber, selectedProvider, selectedMeterType]);

  useEffect(() => {
    isMountedRef.current = true;
    loadFormState();
    fetchElectricityProviders();
    setTimeout(() => {
      fetchUserBalance();
      checkPinStatus();
    }, 1000);
    return () => { isMountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (showPinModal) {
      setPin('');
      setPinError('');
      checkPinStatus();
      setTimeout(() => pinInputRef.current?.focus(), 300);
    }
  }, [showPinModal]);

  useEffect(() => {
    saveFormState();
  }, [selectedProvider, selectedMeterType, meterNumber, amount, phoneNumber]);

  const fetchElectricityProviders = async () => {
    setIsLoadingProviders(true);
    try {
      const response = await apiClient.get('/electricity/providers');
      if (response.data?.success && Array.isArray(response.data.data)) {
        setElectricityProviders(response.data.data);
      } else {
        setElectricityProviders(defaultProviders);
      }
    } catch (error) {
      setElectricityProviders(defaultProviders);
    } finally {
      setIsLoadingProviders(false);
    }
  };

  const validateMeter = async () => {
    if (!isMeterNumberValid || !selectedProvider || !selectedMeterType) {
      setMeterError('Please enter valid meter details');
      return;
    }

    setIsValidatingMeter(true);
    setMeterError('');
    setCustomerName('');
    setCustomerAddress('');
    setCustomerAccountNumber('');

    try {
      const response = await apiClient.post('/electricity/validate-meter', { 
        meterNumber, 
        provider: selectedProvider.id,
        meterType: selectedMeterType.id
      });

      if (response.data?.success) {
        setCustomerName(response.data.data?.customerName || 'Verified Customer');
        setCustomerAddress(response.data.data?.customerAddress || '');
        setCustomerAccountNumber(response.data.data?.accountNumber || '');
      } else {
        setMeterError(response.data?.message || 'Meter validation failed');
      }
    } catch (error: any) {
      setMeterError(error.message || 'Unable to validate meter');
      setCustomerName('');
      setCustomerAddress('');
      setCustomerAccountNumber('');
    } finally {
      setIsValidatingMeter(false);
    }
  };

  const checkPinStatus = async () => {
    try {
      const response = await apiClient.get('/purchase/pin-status');
      if (response.data?.success) setPinStatus(response.data);
    } catch (error) {
      console.error('Error checking PIN status:', error);
    }
  };

  const fetchUserBalance = async () => {
    setIsLoadingBalance(true);
    try {
      const response = await apiClient.get('/balance');
      if (response.data?.success && isMountedRef.current) {
        setBalance(extractBalance(response.data.balance));
      }
    } catch (error) {
      console.error('Error fetching balance:', error);
    } finally {
      if (isMountedRef.current) {
        setIsLoadingBalance(false);
        setIsLoading(false);
      }
    }
  };

  const saveFormState = () => {
    try {
      const formState = { 
        selectedProvider: selectedProvider?.id,
        selectedMeterType: selectedMeterType?.id,
        meterNumber, 
        amount,
        phoneNumber
      };
      localStorage.setItem('electricityFormState', JSON.stringify(formState));
    } catch (error) {
      console.log('Error saving form state:', error);
    }
  };

  const loadFormState = () => {
    try {
      const savedState = localStorage.getItem('electricityFormState');
      if (savedState) {
        const formData = JSON.parse(savedState);
        if (formData.selectedProvider) {
          const provider = electricityProviders.find(p => p.id === formData.selectedProvider) || 
                          defaultProviders.find(p => p.id === formData.selectedProvider);
          if (provider) setSelectedProvider(provider);
        }
        if (formData.selectedMeterType) {
          const meterType = meterTypes.find(m => m.id === formData.selectedMeterType);
          if (meterType) setSelectedMeterType(meterType);
        }
        if (formData.meterNumber) setMeterNumber(formData.meterNumber);
        if (formData.amount) setAmount(formData.amount);
        if (formData.phoneNumber) setPhoneNumber(formData.phoneNumber);
      }
    } catch (error) {
      console.log('Error loading form state:', error);
    }
  };

  const handleProceedToReview = () => {
    if (!canProceed) return;
    if (!hasEnoughBalance) {
      alert(`Insufficient balance. You need ₦${amountNum.toLocaleString()} but have ₦${balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
      return;
    }
    setCurrentStep(2);
  };

  const handleProceedToPinEntry = () => {
    if (!pinStatus?.isPinSet) {
      alert('PIN Required: Please set up a transaction PIN in your account settings before making purchases.');
      return;
    }
    if (pinStatus?.isLocked) {
      alert(`Account Locked: Too many failed PIN attempts. Please try again in ${pinStatus.lockTimeRemaining} minutes.`);
      return;
    }
    setShowPinModal(true);
  };

  const handleBuyElectricity = async () => {
    try {
      if (pin.length !== 4) {
        setPinError('Please enter a 4-digit PIN');
        return;
      }

      setIsProcessing(true);
      setPinError('');

      const purchasePayload = {
        type: 'electricity',
        provider: selectedProvider!.id,
        meterType: selectedMeterType!.id,
        meterNumber: meterNumber,
        phone: phoneNumber,
        amount: amountNum,
        pin: pin,
        customerName: customerName,
        customerAddress: customerAddress || '',
        accountNumber: customerAccountNumber || ''
      };

      const response = await apiClient.post('/purchase', purchasePayload);

      if (response.data?.success) {
        setSuccessData({
          transaction: response.data.transaction || {},
          providerName: selectedProvider!.name,
          phone: phoneNumber,
          amount: response.data.transaction?.amount || amountNum,
          meterNumber,
          customerName,
          customerAddress,
          meterType: selectedMeterType!.name,
          newBalance: response.data.newBalance || response.data.balance
        });

        if (response.data.newBalance !== undefined) {
          setBalance(extractBalance(response.data.newBalance));
        } else {
          await fetchUserBalance();
        }

        localStorage.removeItem('electricityFormState');
        setMeterNumber('');
        setAmount('');
        setPhoneNumber('');
        setSelectedProvider(null);
        setSelectedMeterType(null);
        setCustomerName('');
        setCustomerAddress('');
        setCustomerAccountNumber('');
        setPin('');
        setCurrentStep(1);

        setShowPinModal(false);
        setTimeout(() => setShowSuccessModal(true), 200);
      } else {
        setPinError(response.data?.message || 'Transaction failed. Please try again.');
      }
    } catch (error: any) {
      console.error('Purchase error:', error);
      setPinError(error.message || 'Unable to process payment. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="page-container">
        <div className="loading-container">
          <div className="spinner"></div>
          <p className="loading-text">Loading...</p>
        </div>
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

      {currentStep === 1 && (
        <div className="card">
          <div className="balance-header">
            <div className="wallet-badge">
              <span>Wallet Balance: ₦{balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <button className="refresh-btn" onClick={fetchUserBalance} disabled={isLoadingBalance}>
              <RefreshCw size={16} className={isLoadingBalance ? 'spinning' : ''} />
            </button>
          </div>

          <div className="form">
            <div className="form-group">
              <label>Electricity Provider</label>
              <div className="custom-select-trigger" onClick={() => setShowProvidersModal(true)}>
                <span className={selectedProvider ? 'selected' : 'placeholder'}>
                  {selectedProvider ? `${selectedProvider.fullName} (${selectedProvider.acronym})` : 'Choose your DISCO'}
                </span>
                <ChevronDown size={16} />
              </div>
            </div>

            {selectedProvider && (
              <>
                <div className="form-group">
                  <label>Meter Number</label>
                  <div className="input-container">
                    <input
                      type="text"
                      value={meterNumber}
                      onChange={(e) => setMeterNumber(e.target.value.replace(/\D/g, ''))}
                      placeholder="Enter meter number"
                      maxLength={15}
                      className={`text-input ${meterError ? 'error' : ''} ${customerName ? 'success' : ''}`}
                      disabled={isValidatingMeter}
                    />
                    {isValidatingMeter && <div className="spinner-small"></div>}
                  </div>
                  {meterError && <div className="validation-error">{meterError}</div>}
                  {meterNumber.length > 0 && !isMeterNumberValid && (
                    <div className="validation-error">Meter number must be at least 10 digits</div>
                  )}
                </div>

                {meterNumber.length >= 10 && (
                  <div className="form-group">
                    <label>Meter Type</label>
                    <div className="custom-select-trigger" onClick={() => setShowMeterTypeModal(true)}>
                      <span className={selectedMeterType ? 'selected' : 'placeholder'}>
                        {selectedMeterType ? selectedMeterType.name : 'Choose meter type'}
                      </span>
                      <ChevronDown size={16} />
                    </div>
                    {selectedMeterType && <div className="plan-description">{selectedMeterType.description}</div>}
                  </div>
                )}
              </>
            )}

            {selectedProvider && selectedMeterType && customerName && (
              <>
                <div className="form-group">
                  <div className="customer-info">
                    <div className="validation-success">✓ Meter verified</div>
                    <div className="customer-details">
                      <div className="customer-name">Customer: {customerName}</div>
                      {customerAddress && <div className="customer-address">Address: {customerAddress}</div>}
                    </div>
                  </div>
                </div>

                <div className="form-group">
                  <label>Amount (₦)</label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Enter amount (min. ₦500)"
                    min="500"
                    max="100000"
                    className="text-input"
                  />
                  {amount !== '' && !isAmountValid && (
                    <div className="validation-error">Amount must be between ₦500 and ₦100,000</div>
                  )}
                  {amount !== '' && isAmountValid && hasEnoughBalance && (
                    <div className="validation-success">✓ Valid amount</div>
                  )}
                  {amount !== '' && isAmountValid && !hasEnoughBalance && (
                    <div className="validation-error">
                      Insufficient balance. Available: ₦{balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label>Phone Number</label>
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                    placeholder="Enter phone number (11 digits)"
                    maxLength={11}
                    className="text-input"
                  />
                  {phoneNumber.length > 0 && phoneNumber.length !== 11 && (
                    <div className="validation-error">Phone number must be 11 digits</div>
                  )}
                  {phoneNumber.length === 11 && (
                    <div className="validation-success">✓ Valid phone number</div>
                  )}
                </div>
              </>
            )}
          </div>

          <button onClick={handleProceedToReview} className="submit-btn" disabled={!canProceed}>
            {!canProceed ? 'Complete Form to Continue' : `Review Purchase • ₦${amountNum.toLocaleString()}`}
          </button>
        </div>
      )}

      {currentStep === 2 && (
        <div className="card">
          <h2 className="review-title">Review Purchase</h2>
          <div className="summary-card">
            <div className="summary-row"><span>Provider</span><span>{selectedProvider!.name}</span></div>
            <div className="summary-row"><span>Meter Type</span><span>{selectedMeterType!.name}</span></div>
            <div className="summary-row"><span>Meter Number</span><span>{meterNumber}</span></div>
            <div className="summary-row"><span>Customer</span><span>{customerName}</span></div>
            <div className="summary-row"><span>Phone Number</span><span>{phoneNumber}</span></div>
            <div className="summary-divider"></div>
            <div className="summary-row total"><span>Total Amount</span><span>₦{amountNum.toLocaleString()}</span></div>
          </div>

          <button onClick={handleProceedToPinEntry} className="submit-btn" disabled={!hasEnoughBalance}>
            {hasEnoughBalance ? 'Proceed to Payment' : 'Insufficient Balance'}
          </button>
          <button onClick={() => setCurrentStep(1)} className="secondary-btn">Back to Form</button>
        </div>
      )}

      {/* Modals */}
      {showProvidersModal && (
        <div className="modal-overlay" onClick={() => setShowProvidersModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} ref={providersModalRef}>
            <div className="modal-header">
              <h2 className="modal-title">Select Provider</h2>
              <button className="modal-close" onClick={() => setShowProvidersModal(false)}><X size={24} /></button>
            </div>
            <div className="providers-list">
              {electricityProviders.map((provider) => (
                <div
                  key={provider.id}
                  className={`provider-item ${selectedProvider?.id === provider.id ? 'selected' : ''}`}
                  onClick={() => {
                    setSelectedProvider(provider);
                    setShowProvidersModal(false);
                    setSelectedMeterType(null);
                    setMeterNumber('');
                    setCustomerName('');
                  }}
                >
                  <div className="provider-info">
                    <div className="provider-name">{provider.name}</div>
                    <div className="provider-full-name">{provider.fullName}</div>
                  </div>
                  {selectedProvider?.id === provider.id && <Check size={20} />}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {showMeterTypeModal && (
        <div className="modal-overlay" onClick={() => setShowMeterTypeModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} ref={meterTypeModalRef}>
            <div className="modal-header">
              <h2 className="modal-title">Select Meter Type</h2>
              <button className="modal-close" onClick={() => setShowMeterTypeModal(false)}><X size={24} /></button>
            </div>
            <div className="providers-list">
              {meterTypes.map((meter) => (
                <div
                  key={meter.id}
                  className={`provider-item ${selectedMeterType?.id === meter.id ? 'selected' : ''}`}
                  onClick={() => {
                    setSelectedMeterType(meter);
                    setShowMeterTypeModal(false);
                  }}
                >
                  <div className="provider-info">
                    <div className="provider-name">{meter.name}</div>
                    <div className="provider-details">{meter.description}</div>
                  </div>
                  {selectedMeterType?.id === meter.id && <Check size={20} />}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {showPinModal && (
        <div className="modal-overlay">
          <div className="modal-content pin-modal" onClick={(e) => e.stopPropagation()} ref={pinModalRef}>
            <button className="modal-close" onClick={() => setShowPinModal(false)} disabled={isProcessing}><X size={24} /></button>
            <h2 className="pin-title">Enter Transaction PIN</h2>
            <p className="pin-subtitle">Enter your 4-digit PIN to complete</p>

            <div className="pin-input-container">
              <input
                ref={pinInputRef}
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value.replace(/\D/g, ''));
                  setPinError('');
                }}
                className="pin-input"
                disabled={isProcessing}
              />
              <div className="pin-dots">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className={`pin-dot ${pin.length > i ? 'filled' : ''}`} />
                ))}
              </div>
            </div>

            {pinError && <div className="pin-error">{pinError}</div>}

            <button onClick={handleBuyElectricity} className="submit-btn" disabled={pin.length !== 4 || isProcessing}>
              {isProcessing ? 'Processing...' : 'Confirm Purchase'}
            </button>
            <button onClick={() => setShowPinModal(false)} className="cancel-btn" disabled={isProcessing}>Cancel</button>
          </div>
        </div>
      )}

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

      <style jsx>{`
        .page-container { padding: 16px 24px; max-width: 1200px; margin: 0 auto; }
        .page-header { margin-bottom: 20px; }
        .page-title { font-size: 20px; font-weight: 700; color: #dc2626; margin: 0 0 8px 0; }
        .breadcrumb { display: flex; gap: 6px; font-size: 14px; }
        .breadcrumb-link { color: #6b7280; cursor: pointer; }
        .breadcrumb-separator { color: #9ca3af; }
        .breadcrumb-current { color: #1f2937; font-weight: 500; }
        .card { background: white; border-radius: 10px; padding: 20px; box-shadow: 0 1px 2px rgba(0,0,0,0.05); border: 1px solid #e5e7eb; max-width: 700px; margin: 0 auto; }
        .balance-header { display: flex; justify-content: space-between; margin-bottom: 20px; }
        .wallet-badge { background: white; border: 1px solid #d1d5db; padding: 10px 14px; border-radius: 6px; flex: 1; }
        .wallet-badge span { font-size: 13px; font-weight: 700; color: #16a34a; }
        .refresh-btn { background: #f3f4f6; border: 1px solid #d1d5db; border-radius: 6px; padding: 10px; cursor: pointer; margin-left: 8px; transition: all 0.2s; }
        .refresh-btn:hover:not(:disabled) { background: #e5e7eb; }
        .refresh-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .spinning { animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .form { display: flex; flex-direction: column; gap: 16px; margin-bottom: 16px; }
        .form-group { display: flex; flex-direction: column; }
        .form-group label { font-size: 14px; font-weight: 600; color: #374151; margin-bottom: 8px; }
        .custom-select-trigger { width: 100%; padding: 12px 14px; font-size: 15px; border: 1px solid #d1d5db; border-radius: 6px; background: white; cursor: pointer; transition: all 0.2s; display: flex; justify-content: space-between; align-items: center; }
        .custom-select-trigger:hover { border-color: #9ca3af; }
        .custom-select-trigger .placeholder { color: #9ca3af; }
        .custom-select-trigger .selected { color: #1f2937; font-weight: 500; }
        .text-input { width: 100%; padding: 12px 14px; font-size: 15px; border: 1px solid #d1d5db; border-radius: 6px; transition: all 0.2s; color: #1f2937; font-weight: 500; }
        .text-input:hover { border-color: #9ca3af; }
        .text-input:focus { outline: none; border-color: #dc2626; box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.1); }
        .text-input:disabled { background: #f3f4f6; cursor: not-allowed; }
        .text-input.error { border-color: #ef4444; background-color: #fef2f2; }
        .text-input.success { border-color: #10b981; background-color: #f0fdf4; }
        .input-container { position: relative; }
        .spinner-small { width: 16px; height: 16px; border: 2px solid #e5e7eb; border-top-color: #dc2626; border-radius: 50%; animation: spin 1s linear infinite; position: absolute; right: 16px; top: 14px; }
        .validation-error { margin-top: 8px; color: #dc2626; font-size: 13px; font-weight: 500; }
        .validation-success { color: #10b981; font-size: 13px; font-weight: 500; margin-top: 8px; }
        .plan-description { font-size: 12px; color: #6b7280; margin-top: 8px; font-style: italic; }
        .customer-info { margin-top: 12px; padding: 12px; background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; }
        .customer-details { margin-top: 8px; }
        .customer-name { font-size: 14px; font-weight: 600; color: #1f2937; margin-bottom: 2px; }
        .customer-address { font-size: 12px; color: #6b7280; }
        .review-title { font-size: 18px; font-weight: 700; color: #1f2937; margin: 0 0 16px 0; }
        .summary-card { background: #f9fafb; border-radius: 10px; padding: 16px; margin-bottom: 16px; }
        .summary-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; font-size: 14px; }
        .summary-row:last-child { border-bottom: none; }
        .summary-row span:first-child { color: #6b7280; font-weight: 500; }
        .summary-row span:last-child { color: #1f2937; font-weight: 600; }
        .summary-divider { height: 1px; background: #e5e7eb; margin: 12px 0; }
        .summary-row.total { padding: 16px; background: #fef2f2; margin: 12px -16px -16px; border-radius: 0 0 10px 10px; border-bottom: none; }
        .summary-row.total span:first-child { color: #1f2937; font-size: 15px; font-weight: 600; }
        .summary-row.total span:last-child { color: #dc2626; font-size: 24px; font-weight: 700; }
        .submit-btn { width: 100%; padding: 14px; background: #dc2626; color: white; font-size: 16px; font-weight: 600; border: none; border-radius: 6px; cursor: pointer; transition: all 0.2s; }
        .submit-btn:hover:not(:disabled) { background: #b91c1c; transform: translateY(-1px); box-shadow: 0 4px 12px rgba(220, 38, 38, 0.3); }
        .submit-btn:disabled { background: #d1d5db; cursor: not-allowed; }
        .secondary-btn { width: 100%; padding: 14px; background: white; color: #6b7280; font-size: 16px; font-weight: 600; border: 1px solid #e5e7eb; border-radius: 6px; cursor: pointer; transition: all 0.2s; margin-top: 12px; }
        .secondary-btn:hover { background: #f9fafb; color: #1f2937; }
        .cancel-btn { width: 100%; padding: 14px; background: white; color: #6b7280; font-size: 16px; font-weight: 600; border: 1px solid #e5e7eb; border-radius: 6px; cursor: pointer; transition: all 0.2s; }
        .cancel-btn:hover:not(:disabled) { background: #f9fafb; color: #1f2937; }
        .cancel-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .loading-container { display: flex; justify-content: center; align-items: center; min-height: 400px; flex-direction: column; gap: 16px; }
        .spinner { width: 48px; height: 48px; border: 4px solid #e5e7eb; border-top-color: #dc2626; border-radius: 50%; animation: spin 1s linear infinite; }
        .loading-text { color: #6b7280; font-size: 14px; font-weight: 500; }
        .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.5); display: flex; align-items: center; justify-content: center; z-index: 9999; padding: 16px; animation: fadeIn 0.2s; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .modal-content { background: white; border-radius: 16px; max-width: 500px; width: 100%; max-height: 80vh; overflow: hidden; display: flex; flex-direction: column; animation: slideUp 0.3s; }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .modal-header { display: flex; justify-content: space-between; align-items: center; padding: 20px 24px; border-bottom: 1px solid #e5e7eb; }
        .modal-title { font-size: 18px; font-weight: 600; color: #1f2937; margin: 0; }
        .modal-close { background: none; border: none; cursor: pointer; color: #6b7280; padding: 4px; }
        .modal-close:hover { background: #f3f4f6; color: #1f2937; border-radius: 4px; }
        .providers-list { flex: 1; overflow-y: auto; max-height: 60vh; }
        .provider-item { display: flex; justify-content: space-between; align-items: center; padding: 16px 24px; border-bottom: 1px solid #f3f4f6; cursor: pointer; transition: all 0.2s; }
        .provider-item:hover { background: #f9fafb; }
        .provider-item.selected { background: #fef2f2; border-left: 4px solid #dc2626; }
        .provider-info { flex: 1; }
        .provider-name { font-size: 15px; font-weight: 600; color: #1f2937; margin-bottom: 2px; }
        .provider-full-name { font-size: 13px; color: #6b7280; margin-bottom: 2px; }
        .provider-details { font-size: 12px; color: #9ca3af; }
        .pin-modal { max-width: 400px; padding: 24px; }
        .pin-title { font-size: 22px; font-weight: 700; color: #1f2937; text-align: center; margin: 0 0 8px 0; }
        .pin-subtitle { font-size: 14px; color: #6b7280; text-align: center; margin: 0 0 24px 0; }
        .pin-input-container { position: relative; margin-bottom: 20px; }
        .pin-input { width: 100%; padding: 16px; font-size: 24px; text-align: center; border: 2px solid #d1d5db; border-radius: 8px; letter-spacing: 12px; opacity: 0; position: absolute; }
        .pin-input:focus { outline: none; border-color: #dc2626; box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.1); }
        .pin-dots { display: flex; justify-content: center; gap: 16px; padding: 24px; background: #f9fafb; border-radius: 8px; border: 2px solid #d1d5db; }
        .pin-dot { width: 16px; height: 16px; border-radius: 50%; background: #e5e7eb; transition: all 0.2s; }
        .pin-dot.filled { background: #dc2626; transform: scale(1.1); }
        .pin-error { background: #fef2f2; color: #dc2626; padding: 12px; border-radius: 6px; font-size: 14px; font-weight: 500; text-align: center; margin-bottom: 16px; border: 1px solid #fecaca; }
        
        @media (max-width: 768px) { 
          .page-container { padding: 12px; } 
          .card { padding: 16px; } 
          .summary-row.total span:last-child { font-size: 20px; }
        }
      `}</style>
    </div>
  );
}