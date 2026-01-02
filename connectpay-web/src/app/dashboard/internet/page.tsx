'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, X, RefreshCw } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import apiClient from '@/lib/api';
import { InternetSuccessModal } from '@/components/SuccessModal/page';
interface InternetPlan {
  id: string;
  name: string;
  dataSize: string;
  speed: string;
  validity: string;
  amount: number;
  description?: string;
  category?: string;
  popular?: boolean;
}

export default function BuyInternetPage() {
  const router = useRouter();
  const { user: contextUser, isAuthenticated } = useAuth();
  
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);
  const [selectedProvider, setSelectedProvider] = useState('');
  const [selectedPlan, setSelectedPlan] = useState<InternetPlan | null>(null);
  const [customerNumber, setCustomerNumber] = useState('');
  const [pin, setPin] = useState('');
  const [balance, setBalance] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoadingPlans, setIsLoadingPlans] = useState(false);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);
  const [providerDropdownOpen, setProviderDropdownOpen] = useState(false);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [pinError, setPinError] = useState('');
  const [plansError, setPlansError] = useState<string | null>(null);
  const [availablePlans, setAvailablePlans] = useState<InternetPlan[]>([]);
  const [successData, setSuccessData] = useState<any>(null);
  
  const providerDropdownRef = useRef<HTMLDivElement>(null);
  const pinInputRef = useRef<HTMLInputElement>(null);
  const isMountedRef = useRef(true);

  const internetProviders = [
    { id: 'smile', label: 'SMILE', logo: '🌐' }
  ];

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const extractBalance = (balanceData: any): number => {
    if (balanceData === null || balanceData === undefined) return 0;
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
      
      if (response.data?.success && response.data?.balance !== undefined && isMountedRef.current) {
        const balanceValue = extractBalance(response.data.balance);
        setBalance(balanceValue);
      }
    } catch (error: any) {
      console.error('❌ Error fetching balance:', error);
    } finally {
      if (isMountedRef.current) {
        setIsLoadingBalance(false);
      }
    }
  };

  const fetchInternetPlans = async (providerCode: string) => {
    setIsLoadingPlans(true);
    setPlansError(null);
    
    try {
      console.log('=== INTERNET PLANS FETCH DEBUG ===');
      console.log(`📡 Fetching internet plans for: ${providerCode}`);
      
      // CRITICAL FIX: Use the correct API endpoint
      // Your backend route is: router.get('/provider/:code/plans', ...)
      // When mounted in app.js as app.use('/api/internet', internetRoutes)
      // The full path becomes: /api/internet/provider/smile/plans
      const endpoint = `/internet/provider/${providerCode}/plans`;
      console.log('🔍 API Endpoint:', endpoint);
      console.log('🔍 Full URL will be:', `${window.location.origin}/api${endpoint}`);
      console.log('🔍 Auth token exists:', !!localStorage.getItem('token'));
      
      const response = await apiClient.get(endpoint);
      
      console.log('📥 API Response Status:', response.status);
      console.log('📥 API Response Data:', response.data);
      console.log('📥 Plans Count:', response.data?.plans?.length || 0);

      if (response.data?.success && response.data?.plans && Array.isArray(response.data.plans)) {
        const transformedPlans: InternetPlan[] = response.data.plans.map((plan: any) => ({
          id: plan.id || plan.planId || String(plan.name).toLowerCase().replace(/\s+/g, '_'),
          name: plan.name || plan.planName || 'Unnamed Plan',
          dataSize: plan.dataSize || plan.data || 'N/A',
          speed: plan.speed || '10-20Mbps',
          validity: plan.validity || plan.period || '30 days',
          amount: parseFloat(plan.amount || plan.price || 0),
          description: plan.description,
          category: plan.category || 'monthly',
          popular: plan.popular || false
        }));
        
        console.log(`✅ Successfully loaded ${transformedPlans.length} plans from ClubKonnect API`);
        setAvailablePlans(transformedPlans);
        
        // Cache plans for 1 hour
        try {
          localStorage.setItem(
            `internet_plans_${providerCode}`,
            JSON.stringify({ plans: transformedPlans, timestamp: Date.now() })
          );
        } catch (e) {
          console.warn('⚠️ Could not cache plans:', e);
        }
      } else {
        console.error('❌ Invalid API response structure:', response.data);
        throw new Error(response.data?.message || 'Invalid response from server');
      }

    } catch (error: any) {
      console.error('=== INTERNET PLANS FETCH ERROR ===');
      console.error('❌ Error Type:', error.constructor.name);
      console.error('❌ Error Message:', error.message);
      console.error('❌ Error Response Status:', error.response?.status);
      console.error('❌ Error Response Data:', error.response?.data);
      console.error('❌ Error Config:', {
        url: error.config?.url,
        method: error.config?.method,
        headers: error.config?.headers
      });
      console.error('❌ Full Error:', error);
      
      let errorMessage = 'Failed to load internet plans';
      
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      // Check for specific ClubKonnect errors
      if (errorMessage.includes('MobileNetwork_NOT_AVAILABLE')) {
        errorMessage = `⚠️ BACKEND ERROR: The backend is trying to call ClubKonnect API instead of returning static plans. The /api/internet/provider/smile/plans route should return static plans immediately without calling external APIs.`;
      } else if (errorMessage.includes('NOT_AVAILABLE')) {
        errorMessage = `Internet provider "${providerCode.toUpperCase()}" is not available at this time.`;
      } else if (error.response?.status === 404) {
        errorMessage = `❌ 404 ERROR: The endpoint /api/internet/provider/${providerCode}/plans was not found. Check your backend route mounting in app.js or server.js. It should be: app.use('/api/internet', internetRoutes)`;
      } else if (error.response?.status === 401) {
        errorMessage = '❌ 401 UNAUTHORIZED: Authentication failed. Please log in again.';
      } else if (error.response?.status === 500) {
        errorMessage = `❌ 500 SERVER ERROR: Backend crashed. Check your server console logs for details.`;
      }
      
      console.error('📢 User-facing error message:', errorMessage);
      setPlansError(errorMessage);
      
      // Try to load cached plans as fallback
      try {
        const cached = localStorage.getItem(`internet_plans_${providerCode}`);
        if (cached) {
          const { plans, timestamp } = JSON.parse(cached);
          const isStale = Date.now() - timestamp > 3600000; // 1 hour
          
          if (!isStale && plans.length > 0) {
            console.log('⚠️ Using cached plans as fallback');
            setAvailablePlans(plans);
            setPlansError(`${errorMessage} (Using cached plans)`);
          }
        }
      } catch (cacheError) {
        console.error('❌ Cache read error:', cacheError);
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoadingPlans(false);
      }
    }
  };

  useEffect(() => {
    fetchBalance().finally(() => {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    });
  }, []);

  useEffect(() => {
    if (selectedProvider) {
      fetchInternetPlans(selectedProvider);
    } else {
      setAvailablePlans([]);
      setSelectedPlan(null);
    }
  }, [selectedProvider]);

  useEffect(() => {
    if (currentStep === 2) {
      fetchBalance();
    }
  }, [currentStep]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (providerDropdownRef.current && !providerDropdownRef.current.contains(event.target as Node)) {
        setProviderDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (showPinModal) {
      setTimeout(() => {
        pinInputRef.current?.focus();
      }, 100);
    }
  }, [showPinModal]);

  const isCustomerNumberValid = customerNumber.length >= 6 && /^[A-Za-z0-9]+$/.test(customerNumber);
  const amount = selectedPlan?.amount || 0;
  const hasEnoughBalance = amount <= balance;
  const canProceed = isCustomerNumberValid && selectedProvider && selectedPlan && hasEnoughBalance;

  const handleProviderSelect = (providerId: string) => {
    setSelectedProvider(providerId);
    setProviderDropdownOpen(false);
    setSelectedPlan(null);
  };

  const handlePlanSelect = (plan: InternetPlan) => {
    setSelectedPlan(plan);
    setShowPlanModal(false);
  };

  const handleShowPlans = () => {
    if (!selectedProvider) {
      alert('Please select an internet provider first.');
      return;
    }
    
    if (isLoadingPlans) {
      alert('Please wait while plans are being loaded...');
      return;
    }
    
    if (plansError && availablePlans.length === 0) {
      alert(`Unable to load plans: ${plansError}`);
      return;
    }
    
    setShowPlanModal(true);
  };

  const handleProceedToReview = () => {
    if (!canProceed) {
      if (!isCustomerNumberValid) alert('Please enter a valid customer ID (minimum 6 characters)');
      else if (!selectedProvider) alert('Please select a provider');
      else if (!selectedPlan) alert('Please select a plan');
      else if (!hasEnoughBalance) alert('Insufficient balance');
      return;
    }
    setCurrentStep(2);
  };

  const handleProceedToPinEntry = () => {
    setPin('');
    setPinError('');
    setShowPinModal(true);
  };

  const handleBuyInternet = async () => {
    try {
      if (pin.length !== 4) {
        setPinError('Please enter a 4-digit PIN');
        return;
      }

      setIsProcessing(true);
      setPinError('');

      console.log('=== INTERNET PURCHASE START ===');
      console.log('Purchase payload:', {
        type: 'internet',
        provider: selectedProvider,
        planId: selectedPlan?.id,
        customerNumber: customerNumber,
        amount: amount
      });

      const response = await apiClient.post('/purchase', {
        type: 'internet',
        provider: selectedProvider,
        plan: selectedPlan?.name,
        planId: selectedPlan?.id,
        planType: selectedPlan?.category || 'monthly',
        customerNumber: customerNumber,
        amount: amount,
        pin: pin,
      });

      console.log('📥 Purchase response:', response.data);

      if (response.data?.success) {
        console.log('✅ Internet purchase successful!');
        
        const providerName = internetProviders.find(p => p.id === selectedProvider)?.label || selectedProvider?.toUpperCase();
        
        setSuccessData({
          transaction: response.data.transaction || {},
          providerName,
          customerNumber,
          plan: selectedPlan,
          amount: response.data.transaction?.amount || amount,
          newBalance: response.data.newBalance || response.data.balance
        });

        if (response.data.newBalance !== undefined) {
          setBalance(extractBalance(response.data.newBalance));
        } else if (response.data.balance !== undefined) {
          setBalance(extractBalance(response.data.balance));
        } else {
          await fetchBalance();
        }

        setCustomerNumber('');
        setSelectedProvider('');
        setSelectedPlan(null);
        setAvailablePlans([]);
        setPin('');
        setCurrentStep(1);

        setShowPinModal(false);
        setTimeout(() => {
          setShowSuccessModal(true);
        }, 200);
      } else {
        setPinError(response.data?.message || 'Transaction failed. Please try again.');
      }

    } catch (error: any) {
      console.error('❌ Purchase error:', error);
      
      if (error.response?.data?.message) {
        setPinError(error.response.data.message);
      } else if (error.message) {
        setPinError(error.message);
      } else {
        setPinError('Unable to process payment. Please try again.');
      }
    } finally {
      setIsProcessing(false);
      console.log('=== INTERNET PURCHASE END ===');
    }
  };

  const handleClosePinModal = () => {
    if (!isProcessing) {
      setShowPinModal(false);
      setPin('');
      setPinError('');
    }
  };

  const handleCloseSuccessModal = () => {
    setShowSuccessModal(false);
    setSuccessData(null);
  };

  const handleBuyMoreInternet = () => {
    setShowSuccessModal(false);
    setSuccessData(null);
    setCurrentStep(1);
  };

  const handleBackToForm = () => {
    setCurrentStep(1);
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
        <h1 className="page-title">INTERNET</h1>
        <div className="breadcrumb">
          <span className="breadcrumb-link" onClick={() => router.push('/dashboard')}>Dashboard</span>
          <span className="breadcrumb-separator">/</span>
          <span className="breadcrumb-current">Internet</span>
        </div>
      </div>

      {currentStep === 1 && (
        <div className="card">
          <div className="balance-header">
            <div className="wallet-badge">
              <span>Wallet Balance: ₦{balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <button className="refresh-btn" onClick={fetchBalance} disabled={isLoadingBalance} title="Refresh balance">
              <RefreshCw size={16} className={isLoadingBalance ? 'spinning' : ''} />
            </button>
          </div>

          <div className="form">
            <div className="form-group">
              <label htmlFor="customerNumber">Customer ID / Phone Number</label>
              <input
                id="customerNumber"
                type="text"
                value={customerNumber}
                onChange={(e) => setCustomerNumber(e.target.value)}
                placeholder="Enter customer ID or phone number"
                className="text-input"
                disabled={isProcessing}
              />
              {customerNumber !== '' && !isCustomerNumberValid && (
                <div className="validation-error">
                  Enter valid customer ID or phone number (minimum 6 characters)
                </div>
              )}
              {customerNumber !== '' && isCustomerNumberValid && (
                <div className="validation-success">
                  Valid customer identifier
                </div>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="provider">Internet Provider</label>
              <div className="custom-select-wrapper" ref={providerDropdownRef}>
                <div 
                  className="custom-select-trigger"
                  onClick={() => setProviderDropdownOpen(!providerDropdownOpen)}
                >
                  <span className={selectedProvider ? 'selected' : 'placeholder'}>
                    {selectedProvider 
                      ? internetProviders.find(p => p.id === selectedProvider)?.label 
                      : 'Choose internet provider'}
                  </span>
                  <ChevronDown 
                    size={16} 
                    className={`dropdown-icon ${providerDropdownOpen ? 'open' : ''}`}
                  />
                </div>
                
                {providerDropdownOpen && (
                  <div className="custom-select-dropdown">
                    {internetProviders.map(provider => (
                      <div
                        key={provider.id}
                        className={`custom-select-option ${selectedProvider === provider.id ? 'selected' : ''}`}
                        onClick={() => handleProviderSelect(provider.id)}
                      >
                        {provider.logo} {provider.label}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="form-group">
              <label>Select Plan</label>
              {selectedProvider ? (
                <div 
                  className={`plan-selector ${selectedPlan ? 'selected' : ''} ${isLoadingPlans ? 'disabled' : ''}`}
                  onClick={handleShowPlans}
                >
                  {isLoadingPlans ? (
                    <span className="loading-text">Loading plans...</span>
                  ) : selectedPlan ? (
                    <div className="selected-plan-content">
                      <div className="plan-main-info">
                        <span className="plan-name">{selectedPlan.name}</span>
                        <span className="plan-price">₦{selectedPlan.amount.toLocaleString()}</span>
                      </div>
                      <div className="plan-details">
                        <span className="plan-detail">{selectedPlan.dataSize} • {selectedPlan.speed} • {selectedPlan.validity}</span>
                      </div>
                    </div>
                  ) : (
                    <span className="placeholder">Tap to select a plan</span>
                  )}
                  <span className="arrow">›</span>
                </div>
              ) : (
                <div className="plan-disabled">
                  <span>Select a provider first</span>
                </div>
              )}
              {plansError && (
                <div className="error-banner">⚠️ {plansError}</div>
              )}
            </div>

            {selectedPlan && !hasEnoughBalance && (
              <div className="insufficient-warning">
                Insufficient balance. You need ₦{amount.toLocaleString()} but have ₦{balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            )}
          </div>

          <button 
            onClick={handleProceedToReview} 
            className="submit-btn"
            disabled={!canProceed || isProcessing}
          >
            {!canProceed ? 'Complete Form to Continue' : `Review Purchase • ₦${amount.toLocaleString()}`}
          </button>
        </div>
      )}

      {currentStep === 2 && selectedPlan && (
        <div className="card">
          <h2 className="review-title">Transaction Summary</h2>
          <div className="summary-card">
            <div className="summary-row">
              <span>Provider</span>
              <span>{internetProviders.find(p => p.id === selectedProvider)?.label}</span>
            </div>
            <div className="summary-row">
              <span>Plan</span>
              <span>{selectedPlan.name}</span>
            </div>
            <div className="summary-row">
              <span>Data</span>
              <span>{selectedPlan.dataSize}</span>
            </div>
            <div className="summary-row">
              <span>Validity</span>
              <span>{selectedPlan.validity}</span>
            </div>
            <div className="summary-row">
              <span>Customer ID</span>
              <span>{customerNumber}</span>
            </div>
            <div className="summary-divider"></div>
            <div className="summary-row total">
              <span>Total Amount</span>
              <span>₦{amount.toLocaleString()}</span>
            </div>
          </div>

          <button 
            onClick={handleProceedToPinEntry} 
            className="submit-btn"
            disabled={!hasEnoughBalance || isProcessing}
          >
            {!hasEnoughBalance ? 'Insufficient Balance' : 'Proceed to Payment'}
          </button>
          <button 
            onClick={handleBackToForm} 
            className="secondary-btn"
            disabled={isProcessing}
          >
            Back to Form
          </button>
        </div>
      )}

      {showPlanModal && (
        <div className="modal-overlay" onClick={() => setShowPlanModal(false)}>
          <div className="modal-content plans-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowPlanModal(false)}>
              <X size={24} />
            </button>
            <h2 className="modal-title">
              {selectedProvider && internetProviders.find(p => p.id === selectedProvider)?.label} Plans
            </h2>
            
            {isLoadingPlans ? (
              <div className="loading-container">
                <div className="spinner-small"></div>
                <p className="loading-text">Loading plans from ClubKonnect...</p>
              </div>
            ) : availablePlans.length > 0 ? (
              <div className="plans-list">
                {availablePlans.map((plan) => (
                  <div
                    key={plan.id}
                    className={`plan-item ${selectedPlan?.id === plan.id ? 'selected' : ''}`}
                    onClick={() => handlePlanSelect(plan)}
                  >
                    <div className="plan-item-content">
                      <div className="plan-item-header">
                        <span className="plan-item-name">{plan.name}</span>
                        <span className="plan-item-price">₦{plan.amount.toLocaleString()}</span>
                      </div>
                      <div className="plan-item-details">
                        <span className="plan-item-detail">📊 {plan.dataSize}</span>
                        <span className="plan-item-detail">⚡ {plan.speed}</span>
                        <span className="plan-item-detail">📅 {plan.validity}</span>
                      </div>
                      {plan.description && (
                        <p className="plan-item-description">{plan.description}</p>
                      )}
                    </div>
                    {selectedPlan?.id === plan.id && (
                      <div className="plan-check">✓</div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <p>{plansError || 'No plans available'}</p>
                <button 
                  className="retry-btn"
                  onClick={() => selectedProvider && fetchInternetPlans(selectedProvider)}
                >
                  Retry
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {showPinModal && (
        <div className="modal-overlay" onClick={handleClosePinModal}>
          <div className="modal-content pin-modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={handleClosePinModal} disabled={isProcessing}>
              <X size={24} />
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
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '');
                  setPin(value);
                  setPinError('');
                }}
                placeholder="****"
                className="pin-input"
                disabled={isProcessing}
              />
              <div className="pin-dots">
                {[0, 1, 2, 3].map((index) => (
                  <div
                    key={index}
                    className={`pin-dot ${pin.length > index ? 'filled' : ''} ${pinError ? 'error' : ''}`}
                  />
                ))}
              </div>
            </div>

            {pinError && (
              <div className="pin-error-message">{pinError}</div>
            )}

            <button 
              onClick={handleBuyInternet} 
              className="submit-btn"
              disabled={pin.length !== 4 || isProcessing}
            >
              {isProcessing ? 'Processing...' : 'Confirm Purchase'}
            </button>

            <button 
              onClick={handleClosePinModal} 
              className="cancel-btn"
              disabled={isProcessing}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <InternetSuccessModal
  isOpen={showSuccessModal}
  onClose={handleCloseSuccessModal}
  onBuyMore={handleBuyMoreInternet}
  provider={successData?.providerName}
  planName={successData?.plan?.name}
  phone={successData?.customerNumber}
  amount={successData?.amount}
  reference={successData?.transaction?.reference}
/>

      <style jsx>{`
        .page-container { padding: 16px 24px; max-width: 1200px; margin: 0 auto; }
        .page-header { margin-bottom: 20px; }
        .page-title { font-size: 20px; font-weight: 700; color: #dc2626; margin: 0 0 8px 0; letter-spacing: 0.3px; }
        .breadcrumb { display: flex; align-items: center; gap: 6px; font-size: 14px; }
        .breadcrumb-link { color: #6b7280; font-weight: 500; cursor: pointer; transition: color 0.2s; }
        .breadcrumb-link:hover { color: #dc2626; }
        .breadcrumb-separator { color: #9ca3af; }
        .breadcrumb-current { color: #1f2937; font-weight: 500; }
        .card { background: white; border-radius: 10px; padding: 20px; box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05); border: 1px solid #e5e7eb; max-width: 600px; margin: 0 auto; }
        .balance-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
        .wallet-badge { background: white; border: 1px solid #d1d5db; padding: 10px 14px; border-radius: 6px; flex: 1; }
        .wallet-badge span { font-size: 13px; font-weight: 700; color: #16a34a; }
        .refresh-btn { background: #f3f4f6; border: 1px solid #d1d5db; border-radius: 6px; padding: 10px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; margin-left: 8px; }
        .refresh-btn:hover:not(:disabled) { background: #e5e7eb; }
        .refresh-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .spinning { animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .form { display: flex; flex-direction: column; gap: 16px; margin-bottom: 16px; }
        .form-group { display: flex; flex-direction: column; }
        .form-group label { font-size: 14px; font-weight: 600; color: #374151; margin-bottom: 8px; }
        .text-input { width: 100%; padding: 12px 14px; font-size: 15px; border: 1px solid #d1d5db; border-radius: 6px; transition: all 0.2s; color: #1f2937; font-weight: 500; }
        .text-input:hover { border-color: #9ca3af; }
        .text-input:focus { outline: none; border-color: #dc2626; box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.1); }
        .text-input:disabled { background: #f3f4f6; cursor: not-allowed; }
        .text-input::placeholder { color: #9ca3af; font-weight: 400; }
        .validation-success { margin-top: 8px; padding: 6px 12px; background: #dcfce7; border-radius: 6px; color: #16a34a; font-size: 13px; font-weight: 500; }
        .validation-error { margin-top: 8px; color: #dc2626; font-size: 13px; font-weight: 500; }
        .custom-select-wrapper { position: relative; }
        .custom-select-trigger { width: 100%; padding: 12px 14px; font-size: 15px; border: 1px solid #d1d5db; border-radius: 6px; background: white; cursor: pointer; transition: all 0.2s; display: flex; justify-content: space-between; align-items: center; user-select: none; }
        .custom-select-trigger:hover { border-color: #9ca3af; }
        .custom-select-trigger .placeholder { color: #9ca3af; font-weight: 400; }
        .custom-select-trigger .selected { color: #1f2937; font-weight: 500; }
        .dropdown-icon { transition: transform 0.2s; color: #1f2937; flex-shrink: 0; }
        .dropdown-icon.open { transform: rotate(180deg); }
        .custom-select-dropdown { position: absolute; top: calc(100% + 4px); left: 0; right: 0; background: white; border: 1px solid #d1d5db; border-radius: 6px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1); z-index: 1000; max-height: 200px; overflow-y: auto; animation: dropdownSlide 0.2s ease-out; }
        @keyframes dropdownSlide { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
        .custom-select-option { padding: 12px 14px; font-size: 15px; color: #1f2937; font-weight: 500; cursor: pointer; transition: all 0.15s; user-select: none; }
        .custom-select-option:hover { background: #fef2f2; color: #dc2626; }
        .custom-select-option.selected { background: #dc2626; color: white; font-weight: 600; }
        .plan-selector { width: 100%; padding: 14px; border: 1px solid #d1d5db; border-radius: 6px; background: white; cursor: pointer; transition: all 0.2s; display: flex; justify-content: space-between; align-items: center; }
        .plan-selector:hover:not(.disabled) { border-color: #9ca3af; }
        .plan-selector.selected { border-color: #dc2626; background: #fef2f2; border-width: 2px; }
        .plan-selector.disabled { opacity: 0.6; cursor: not-allowed; }
        .plan-selector .placeholder { color: #9ca3af; font-weight: 400; font-size: 15px; }
        .plan-selector .loading-text { color: #6b7280; font-size: 15px; }
        .plan-selector .arrow { color: #999; font-size: 24px; font-weight: bold; }
        .selected-plan-content { flex: 1; }
        .plan-main-info { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; gap: 12px; }
        .plan-name { font-size: 16px; font-weight: 600; color: #1f2937; flex: 1; }
        .plan-price { font-size: 16px; font-weight: 700; color: #dc2626; flex-shrink: 0; }
        .plan-details { margin-top: 4px; }
        .plan-detail { font-size: 12px; color: #666; }
        .plan-disabled { width: 100%; padding: 14px; border: 1px solid #e5e7eb; border-radius: 6px; background: #fafafa; text-align: center; }
        .plan-disabled span { color: #999; font-size: 15px; }
        .error-banner { margin-top: 8px; background: #fff3e0; padding: 8px 12px; border-radius: 6px; color: #e65100; font-size: 13px; font-weight: 500; }
        .insufficient-warning { margin-top: 12px; padding: 10px; background: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; color: #dc2626; font-size: 13px; font-weight: 500; text-align: center; }
        .submit-btn { width: 100%; padding: 14px; background: #dc2626; color: white; font-size: 16px; font-weight: 600; border: none; border-radius: 6px; cursor: pointer; transition: all 0.2s; }
        .submit-btn:hover:not(:disabled) { background: #b91c1c; transform: translateY(-1px); box-shadow: 0 4px 12px rgba(220, 38, 38, 0.3); }
        .submit-btn:active:not(:disabled) { transform: translateY(0); }
        .submit-btn:disabled { background: #d1d5db; cursor: not-allowed; transform: none; }
        .secondary-btn { width: 100%; padding: 14px; background: white; color: #6b7280; font-size: 16px; font-weight: 600; border: 1px solid #e5e7eb; border-radius: 6px; cursor: pointer; transition: all 0.2s; margin-top: 12px; }
        .secondary-btn:hover:not(:disabled) { background: #f9fafb; color: #1f2937; }
        .secondary-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .review-title { font-size: 18px; font-weight: 700; color: #1f2937; margin: 0 0 16px 0; }
        .summary-card { background: #f9fafb; border-radius: 10px; padding: 16px; margin-bottom: 16px; }
        .summary-row { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #e5e7eb; font-size: 14px; }
        .summary-row:last-child { border-bottom: none; }
        .summary-row span:first-child { color: #6b7280; font-weight: 500; }
        .summary-row span:last-child { color: #1f2937; font-weight: 600; }
        .summary-divider { height: 1px; background: #e5e7eb; margin: 12px 0; }
        .summary-row.total { padding: 16px; background: #fef2f2; margin: 12px -16px -16px; border-radius: 0 0 10px 10px; border-bottom: none; }
        .summary-row.total span:first-child { color: #1f2937; font-size: 15px; font-weight: 600; }
        .summary-row.total span:last-child { color: #dc2626; font-size: 24px; font-weight: 700; }
        .loading-container { display: flex; justify-content: center; align-items: center; min-height: 400px; flex-direction: column; gap: 16px; }
        .spinner { width: 48px; height: 48px; border: 4px solid #e5e7eb; border-top-color: #dc2626; border-radius: 50%; animation: spin 1s linear infinite; }
        .spinner-small { width: 24px; height: 24px; border: 3px solid #e5e7eb; border-top-color: #dc2626; border-radius: 50%; animation: spin 1s linear infinite; }
        .loading-text { color: #6b7280; font-size: 14px; font-weight: 500; }
        .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.5); display: flex; align-items: center; justify-content: center; z-index: 9999; padding: 16px; animation: fadeIn 0.2s ease-out; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .modal-content { background: white; border-radius: 16px; padding: 32px 24px; max-width: 500px; width: 100%; position: relative; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1); animation: slideUp 0.3s ease-out; max-height: 90vh; overflow-y: auto; }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .plans-modal { max-width: 600px; }
        .modal-title { font-size: 20px; font-weight: 700; color: #1f2937; margin: 0 0 20px 0; text-align: center; }
        .modal-close { position: absolute; top: 16px; right: 16px; background: #f3f4f6; border: none; border-radius: 8px; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s; color: #6b7280; }
        .modal-close:hover { background: #e5e7eb; color: #1f2937; }
        .modal-close:disabled { opacity: 0.5; cursor: not-allowed; }
        .plans-list { display: flex; flex-direction: column; gap: 10px; max-height: 500px; overflow-y: auto; padding-right: 4px; }
        .plans-list::-webkit-scrollbar { width: 6px; }
        .plans-list::-webkit-scrollbar-track { background: #f3f4f6; border-radius: 3px; }
        .plans-list::-webkit-scrollbar-thumb { background: #dc2626; border-radius: 3px; }
        .plan-item { background: #fafafa; border: 2px solid #e5e7eb; border-radius: 10px; padding: 14px; cursor: pointer; transition: all 0.2s; position: relative; }
        .plan-item:hover { border-color: #fca5a5; background: #fef2f2; }
        .plan-item.selected { border-color: #dc2626; background: #fef2f2; }
        .plan-item-content { flex: 1; }
        .plan-item-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; gap: 12px; }
        .plan-item-name { font-size: 16px; font-weight: 600; color: #1f2937; flex: 1; }
        .plan-item-price { font-size: 16px; font-weight: 700; color: #dc2626; flex-shrink: 0; }
        .plan-item-details { display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 4px; }
        .plan-item-detail { font-size: 12px; color: #666; background: #f8f9fa; padding: 4px 8px; border-radius: 12px; }
        .plan-item-description { font-size: 12px; color: #666; margin-top: 4px; font-style: italic; }
        .plan-check { position: absolute; top: 8px; right: 8px; width: 20px; height: 20px; border-radius: 50%; background: #dc2626; color: white; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; }
        .empty-state { padding: 40px; text-align: center; color: #9ca3af; font-size: 14px; }
        .retry-btn { margin-top: 16px; background: #dc2626; color: white; padding: 10px 20px; border-radius: 6px; border: none; font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.2s; }
        .retry-btn:hover { background: #b91c1c; }
        .pin-modal-content { max-width: 400px; }
        .pin-modal-title { font-size: 22px; font-weight: 700; color: #1f2937; text-align: center; margin: 0 0 8px 0; }
        .pin-modal-subtitle { font-size: 14px; color: #6b7280; text-align: center; margin: 0 0 24px 0; }
        .pin-input-container { position: relative; margin-bottom: 20px; }
        .pin-input { width: 100%; padding: 16px; font-size: 24px; text-align: center; border: 2px solid #d1d5db; border-radius: 8px; letter-spacing: 12px; font-weight: 600; transition: all 0.2s; opacity: 0; position: absolute; top: 0; left: 0; }
        .pin-input:focus { outline: none; border-color: #dc2626; box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.1); }
        .pin-dots { display: flex; justify-content: center; gap: 16px; padding: 24px; background: #f9fafb; border-radius: 8px; border: 2px solid #d1d5db; }
        .pin-dot { width: 16px; height: 16px; border-radius: 50%; background: #e5e7eb; transition: all 0.2s; }
        .pin-dot.filled { background: #dc2626; transform: scale(1.1); }
        .pin-dot.error { background: #ef4444; animation: shake 0.3s; }
        @keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-4px); } 75% { transform: translateX(4px); } }
        .pin-error-message { background: #fef2f2; color: #dc2626; padding: 12px; border-radius: 6px; font-size: 14px; font-weight: 500; text-align: center; margin-bottom: 16px; border: 1px solid #fecaca; }
        .cancel-btn { width: 100%; padding: 14px; background: white; color: #6b7280; font-size: 16px; font-weight: 600; border: 1px solid #e5e7eb; border-radius: 6px; cursor: pointer; transition: all 0.2s; }
        .cancel-btn:hover:not(:disabled) { background: #f9fafb; color: #1f2937; }
        .cancel-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        @media (max-width: 768px) { 
          .page-container { padding: 12px; } 
          .page-title { font-size: 18px; } 
          .card { padding: 16px; } 
          .modal-content { padding: 24px 20px; } 
          .success-title { font-size: 20px; } 
          .pin-modal-title { font-size: 20px; } 
        }
        @media (max-width: 480px) { 
          .pin-dots { gap: 12px; padding: 20px; } 
          .pin-dot { width: 14px; height: 14px; } 
        }
      `}</style>
    </div>
  );
}