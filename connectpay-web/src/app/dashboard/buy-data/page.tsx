'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, X, RefreshCw } from 'lucide-react';
import apiClient from '@/lib/api';
import { DataSuccessModal } from '@/components/SuccessModal/page';

interface DataPlan {
  id: string;
  name: string;
  customerPrice: number;
  amount: number;
  validity: string;
  dataSize: string;
  network: string;
  type: 'regular' | 'sme' | 'gift' | 'cg';
  provider: 'clubconnect' | 'easyaccess';
  planId?: string;
}

type PlanCategory = 'regular' | 'sme' | 'gift' | 'cg';

export default function BuyDataPage() {
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);
  const [selectedNetwork, setSelectedNetwork] = useState('');
  const [selectedPlan, setSelectedPlan] = useState<DataPlan | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<PlanCategory>('regular');
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [balance, setBalance] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoadingPlans, setIsLoadingPlans] = useState(false);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinError, setPinError] = useState('');
  const [successData, setSuccessData] = useState<any>(null);
  const [dataPlans, setDataPlans] = useState<DataPlan[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const pinInputRef = useRef<HTMLInputElement>(null);
  const isMountedRef = useRef(true);

  const networks = [
    { id: 'mtn', label: 'MTN' },
    { id: 'airtel', label: 'AIRTEL' },
    { id: 'glo', label: 'GLO' },
    { id: '9mobile', label: '9MOBILE' }
  ];

  const extractBalance = (balanceData: any): number => {
    if (balanceData === null || balanceData === undefined) return 0;
    if (typeof balanceData === 'number') return balanceData;
    if (typeof balanceData === 'object') {
      const balance = balanceData.amount || balanceData.balance || balanceData.current || balanceData.value || 0;
      return parseFloat(balance) || 0;
    }
    return parseFloat(balanceData) || 0;
  };

  const detectNetwork = (phoneNumber: string): string | null => {
    const prefix = phoneNumber.substring(0, 4);
    const mtnPrefixes = ['0803', '0806', '0703', '0706', '0813', '0816', '0810', '0814', '0903', '0906', '0913', '0916'];
    const airtelPrefixes = ['0802', '0808', '0812', '0701', '0902', '0907', '0901', '0904', '0912'];
    const gloPrefixes = ['0805', '0807', '0815', '0811', '0705', '0905', '0915'];
    const nineMobilePrefixes = ['0809', '0818', '0817', '0909', '0908'];

    if (mtnPrefixes.includes(prefix)) return 'mtn';
    if (airtelPrefixes.includes(prefix)) return 'airtel';
    if (gloPrefixes.includes(prefix)) return 'glo';
    if (nineMobilePrefixes.includes(prefix)) return '9mobile';
    return null;
  };

  const categorizePlans = (plans: DataPlan[]) => ({
    regular: plans.filter(p => p.type === 'regular'),
    sme: plans.filter(p => p.type === 'sme'),
    gift: plans.filter(p => p.type === 'gift'),
    cg: plans.filter(p => p.type === 'cg'),
  });

  const categorizedPlans = categorizePlans(dataPlans);
  const displayPlans = categorizedPlans[selectedCategory];
  const isPhoneValid = phone.length === 11 && /^0[789][01]\d{8}$/.test(phone);
  const hasEnoughBalance = selectedPlan ? selectedPlan.customerPrice <= balance : true;
  const canProceed = isPhoneValid && selectedNetwork && selectedPlan;

  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  const fetchBalance = async () => {
    setIsLoadingBalance(true);
    try {
      const response = await apiClient.get('/balance');
      if (response.data?.success && isMountedRef.current) {
        setBalance(extractBalance(response.data.balance));
      } else if (response.data?.balance !== undefined && isMountedRef.current) {
        setBalance(extractBalance(response.data.balance));
      }
    } catch (error: any) {
      console.error('Error fetching balance:', error);
      alert('Failed to load balance: ' + error.message);
    } finally {
      if (isMountedRef.current) setIsLoadingBalance(false);
    }
  };

  const fetchClubConnectPlans = async (network: string) => {
    try {
      const timestamp = Date.now();
      const response = await apiClient.get(`/data/plans/${network}?t=${timestamp}`);
      if (response.data.success && response.data.plans) {
        return (response.data.plans || []).map((plan: any) => ({
          ...plan,
          customerPrice: plan.customerPrice || plan.providerCost || plan.amount || 0,
          amount: plan.providerCost || plan.amount || 0,
          provider: 'clubconnect',
          type: plan.name.toLowerCase().includes('sme') ? 'sme' : 'regular'
        }));
      }
      return [];
    } catch (error: any) {
      console.error('Error fetching ClubConnect plans:', error);
      return [];
    }
  };

  const fetchEasyAccessPlans = async (network: string) => {
    try {
      const timestamp = Date.now();
      const response = await apiClient.get(`/easyaccess/plans/${network}?t=${timestamp}`);
      if (response.data.success && response.data.plans) {
        return response.data.plans.map((plan: any) => ({
          id: plan.id,
          planId: plan.planId,
          plan_id: plan.planId,
          name: plan.name,
          dataSize: plan.dataSize,
          customerPrice: plan.customerPrice,
          amount: plan.providerCost,
          validity: plan.validity,
          network: plan.network,
          provider: 'easyaccess',
          type: plan.type
        }));
      }
      return [];
    } catch (error: any) {
      console.error('Error fetching EasyAccess plans:', error);
      return [];
    }
  };

  const fetchAllDataPlans = async (network: string) => {
    setIsLoadingPlans(true);
    try {
      const [clubConnectPlans, easyAccessPlans] = await Promise.all([
        fetchClubConnectPlans(network),
        fetchEasyAccessPlans(network)
      ]);
      setDataPlans([...clubConnectPlans, ...easyAccessPlans]);
    } catch (error: any) {
      console.error('Error fetching data plans:', error);
      alert('Could not load data plans. Please try again.');
      setDataPlans([]);
    } finally {
      setIsLoadingPlans(false);
    }
  };

  useEffect(() => {
    fetchBalance().finally(() => { if (isMountedRef.current) setIsLoading(false); });
  }, []);

  useEffect(() => {
    if (isPhoneValid) {
      const detectedNetwork = detectNetwork(phone);
      if (detectedNetwork && detectedNetwork !== selectedNetwork) {
        setSelectedNetwork(detectedNetwork);
      }
    }
  }, [phone]);

  useEffect(() => {
    if (selectedNetwork) {
      fetchAllDataPlans(selectedNetwork);
      setSelectedPlan(null);
    } else {
      setDataPlans([]);
      setSelectedPlan(null);
    }
  }, [selectedNetwork]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (showPinModal) {
      setTimeout(() => { pinInputRef.current?.focus(); }, 100);
    }
  }, [showPinModal]);

  const handleNetworkSelect = (networkId: string) => {
    setSelectedNetwork(networkId);
    setDropdownOpen(false);
  };

  const handlePlanSelect = (plan: DataPlan) => {
    setSelectedPlan(plan);
  };

  const handleProceedToReview = () => {
    if (!canProceed) {
      if (!isPhoneValid) alert('Please enter a valid 11-digit phone number');
      else if (!selectedNetwork) alert('Please select a network');
      else if (!selectedPlan) alert('Please select a data plan');
      return;
    }
    if (!hasEnoughBalance) {
      alert('Insufficient balance. Please fund your wallet to continue.');
      return;
    }
    setCurrentStep(2);
  };

  const handleProceedToPinEntry = () => {
    setPin('');
    setPinError('');
    setShowPinModal(true);
  };

  const handleBuyData = async () => {
    try {
      if (pin.length !== 4) {
        setPinError('Please enter a 4-digit PIN');
        return;
      }
      if (!selectedNetwork || !phone || phone.length !== 11 || !selectedPlan) {
        setPinError('Invalid purchase details');
        return;
      }

      setIsProcessing(true);
      setPinError('');

      const purchasePayload = {
        type: selectedPlan.provider === 'easyaccess' ? 'data_easyaccess' : 'data',
        network: selectedNetwork,
        phone: phone,
        planId: selectedPlan.provider === 'easyaccess' ? selectedPlan.planId : selectedPlan.id,
        plan: selectedPlan.name,
        amount: selectedPlan.customerPrice,
        provider: selectedPlan.provider,
        pin: pin,
      };

      const response = await apiClient.post('/purchase', purchasePayload);

      if (response.data?.success) {
        const networkName = networks.find(n => n.id === selectedNetwork)?.label || selectedNetwork.toUpperCase();
        
        setSuccessData({
          transaction: response.data.transaction || {},
          networkName,
          phone,
          amount: response.data.transaction?.amount || selectedPlan?.customerPrice,
          dataPlan: selectedPlan?.name,
          dataSize: selectedPlan?.dataSize,
          validity: selectedPlan?.validity,
          newBalance: response.data.newBalance || response.data.balance,
          provider: selectedPlan?.provider
        });

        if (response.data.newBalance !== undefined) {
          setBalance(extractBalance(response.data.newBalance));
        } else if (response.data.balance !== undefined) {
          setBalance(extractBalance(response.data.balance));
        } else {
          await fetchBalance();
        }

        setPhone('');
        setSelectedNetwork('');
        setSelectedPlan(null);
        setDataPlans([]);
        setPin('');
        setCurrentStep(1);

        setShowPinModal(false);
        setTimeout(() => { setShowSuccessModal(true); }, 200);
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

  const handleBuyMoreData = () => {
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
        <h1 className="page-title">BUY DATA</h1>
        <div className="breadcrumb">
          <span className="breadcrumb-link">Dashboard</span>
          <span className="breadcrumb-separator">/</span>
          <span className="breadcrumb-current">Data</span>
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
              <label htmlFor="phone">Phone Number</label>
              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                placeholder="08012345678"
                maxLength={11}
                className="text-input"
                disabled={isProcessing}
              />
              {phone !== '' && isPhoneValid && detectNetwork(phone) && (
                <div className="validation-success">
                  {networks.find(n => n.id === detectNetwork(phone))?.label} number detected
                </div>
              )}
              {phone !== '' && !isPhoneValid && (
                <div className="validation-error">
                  Enter valid 11-digit number starting with 070, 080, 081, or 090
                </div>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="network">Select Network</label>
              <div className="custom-select-wrapper" ref={dropdownRef}>
                <div className="custom-select-trigger" onClick={() => setDropdownOpen(!dropdownOpen)}>
                  <span className={selectedNetwork ? 'selected' : 'placeholder'}>
                    {selectedNetwork ? networks.find(n => n.id === selectedNetwork)?.label : 'Choose network provider'}
                  </span>
                  <ChevronDown size={16} className={`dropdown-icon ${dropdownOpen ? 'open' : ''}`} />
                </div>
                {dropdownOpen && (
                  <div className="custom-select-dropdown">
                    {networks.map(network => (
                      <div
                        key={network.id}
                        className={`custom-select-option ${selectedNetwork === network.id ? 'selected' : ''}`}
                        onClick={() => handleNetworkSelect(network.id)}
                      >
                        {network.label}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {selectedNetwork && (
              <div className="form-group">
                <label>Select Data Plan</label>
                {isLoadingPlans ? (
                  <div className="loading-plans">
                    <div className="spinner-small"></div>
                    <span>Loading plans...</span>
                  </div>
                ) : dataPlans.length > 0 ? (
                  <>
                    <div className="category-tabs">
                      {[
                        { key: 'regular' as PlanCategory, label: 'Regular' },
                        { key: 'sme' as PlanCategory, label: 'SME' },
                        { key: 'cg' as PlanCategory, label: 'CG' },
                        { key: 'gift' as PlanCategory, label: 'Gifting' }
                      ].map(({ key, label }) => (
                        <button
                          key={key}
                          className={`category-tab ${selectedCategory === key ? 'active' : ''}`}
                          onClick={() => setSelectedCategory(key)}
                        >
                          {label}
                        </button>
                      ))}
                    </div>

                    {displayPlans.length > 0 ? (
                      <div className="plans-container">
                        {displayPlans.map((plan, index) => (
                          <div
                            key={`${plan.network}-${plan.id}-${index}`}
                            className={`plan-card ${selectedPlan?.id === plan.id ? 'selected' : ''}`}
                            onClick={() => handlePlanSelect(plan)}
                          >
                            <div className="plan-info">
                              <div className="plan-size">{plan.dataSize}</div>
                              <div className="plan-name">{plan.name}</div>
                              <div className="plan-validity">⏱ {plan.validity}</div>
                            </div>
                            <div className="plan-price">₦{plan.customerPrice.toLocaleString()}</div>
                            {selectedPlan?.id === plan.id && <div className="plan-check">✓</div>}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="empty-state">No {selectedCategory} plans available for this network</div>
                    )}
                  </>
                ) : (
                  <div className="empty-state">No data plans available for this network</div>
                )}
              </div>
            )}

            {selectedPlan && !hasEnoughBalance && (
              <div className="insufficient-warning">
                Insufficient balance. You need ₦{selectedPlan.customerPrice.toLocaleString()} but have ₦{balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            )}
          </div>

          <button onClick={handleProceedToReview} className="submit-btn" disabled={!canProceed || isProcessing}>
            {!canProceed ? 'Complete Form to Continue' : selectedPlan ? `Review Purchase • ₦${selectedPlan.customerPrice.toLocaleString()}` : 'Review Purchase'}
          </button>
        </div>
      )}

      {currentStep === 2 && selectedPlan && (
        <div className="card">
          <h2 className="review-title">Review Purchase</h2>
          <div className="summary-card">
            <div className="summary-row"><span>Network</span><span>{networks.find(n => n.id === selectedNetwork)?.label}</span></div>
            <div className="summary-row"><span>Phone Number</span><span>{phone}</span></div>
            <div className="summary-row"><span>Data Plan</span><span>{selectedPlan.name}</span></div>
            <div className="summary-row"><span>Data Size</span><span>{selectedPlan.dataSize}</span></div>
            <div className="summary-row"><span>Validity</span><span>{selectedPlan.validity}</span></div>
            <div className="summary-divider"></div>
            <div className="summary-row total"><span>Amount to Pay</span><span>₦{selectedPlan.customerPrice.toLocaleString()}</span></div>
          </div>

          {!hasEnoughBalance && (
            <div className="insufficient-warning">Insufficient balance. Please fund your wallet to continue.</div>
          )}

          <button onClick={handleProceedToPinEntry} className="submit-btn" disabled={!hasEnoughBalance || isProcessing}>
            {hasEnoughBalance ? 'Proceed to Payment' : 'Insufficient Balance'}
          </button>
          <button onClick={handleBackToForm} className="secondary-btn" disabled={isProcessing}>Back to Form</button>
        </div>
      )}

      {showPinModal && (
        <div className="modal-overlay" onClick={handleClosePinModal}>
          <div className="modal-content pin-modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={handleClosePinModal} disabled={isProcessing}><X size={24} /></button>
            <h2 className="pin-modal-title">Enter Transaction PIN</h2>
            <p className="pin-modal-subtitle">Enter your 4-digit PIN to complete the purchase</p>
            <div className="pin-input-container">
              <input
                ref={pinInputRef}
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={pin}
                onChange={(e) => { setPin(e.target.value.replace(/\D/g, '')); setPinError(''); }}
                placeholder="****"
                className="pin-input"
                disabled={isProcessing}
              />
              <div className="pin-dots">
                {[0, 1, 2, 3].map((index) => (
                  <div key={index} className={`pin-dot ${pin.length > index ? 'filled' : ''} ${pinError ? 'error' : ''}`} />
                ))}
              </div>
            </div>
            {pinError && <div className="pin-error-message">{pinError}</div>}
            <button onClick={handleBuyData} className="submit-btn" disabled={pin.length !== 4 || isProcessing}>
              {isProcessing ? 'Processing...' : 'Confirm Purchase'}
            </button>
            <button onClick={handleClosePinModal} className="cancel-btn" disabled={isProcessing}>Cancel</button>
          </div>
        </div>
      )}

{/* Success Modal - Using reusable component */}
<DataSuccessModal
  isOpen={showSuccessModal}
  onClose={handleCloseSuccessModal}
  onBuyMore={handleBuyMoreData}
  networkName={successData?.networkName}
  phone={successData?.phone}
  bundleName={successData?.dataPlan}
  dataSize={successData?.dataSize}
  validity={successData?.validity}
  amount={successData?.amount}
  reference={successData?.transaction?.reference}
  newBalance={successData?.newBalance}
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
        .card { background: white; border-radius: 10px; padding: 20px; box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05); border: 1px solid #e5e7eb; max-width: 700px; margin: 0 auto; }
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
        .loading-plans { display: flex; align-items: center; justify-content: center; gap: 8px; padding: 20px; color: #6b7280; font-size: 14px; }
        .spinner-small { width: 16px; height: 16px; border: 2px solid #e5e7eb; border-top-color: #dc2626; border-radius: 50%; animation: spin 1s linear infinite; }
        .category-tabs { display: flex; gap: 6px; margin-bottom: 16px; background: #f0f0f0; border-radius: 8px; padding: 4px; }
        .category-tab { flex: 1; padding: 8px 4px; border-radius: 6px; background: transparent; border: none; font-size: 13px; font-weight: 500; color: #6b7280; cursor: pointer; transition: all 0.2s; }
        .category-tab.active { background: white; color: #dc2626; font-weight: 700; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1); }
        .plans-container { max-height: 400px; overflow-y: auto; display: flex; flex-direction: column; gap: 10px; padding-right: 4px; }
        .plans-container::-webkit-scrollbar { width: 6px; }
        .plans-container::-webkit-scrollbar-track { background: #f3f4f6; border-radius: 3px; }
        .plans-container::-webkit-scrollbar-thumb { background: #dc2626; border-radius: 3px; }
        .plan-card { background: #fafafa; border: 2px solid #e5e7eb; border-radius: 10px; padding: 14px; cursor: pointer; transition: all 0.2s; display: flex; justify-content: space-between; align-items: center; position: relative; }
        .plan-card:hover { border-color: #fca5a5; background: #fef2f2; }
        .plan-card.selected { border-color: #dc2626; background: #fef2f2; }
        .plan-info { flex: 1; }
        .plan-size { font-size: 16px; font-weight: 700; color: #1f2937; margin-bottom: 4px; }
        .plan-name { font-size: 12px; color: #6b7280; margin-bottom: 4px; font-weight: 500; }
        .plan-validity { font-size: 11px; color: #9ca3af; }
        .plan-price { font-size: 16px; font-weight: 700; color: #16a34a; margin-left: 16px; }
        .plan-check { position: absolute; top: 8px; right: 8px; width: 20px; height: 20px; border-radius: 50%; background: #dc2626; color: white; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; }
        .empty-state { padding: 40px; text-align: center; color: #9ca3af; font-size: 14px; }
        .insufficient-warning { margin-top: 12px; padding: 10px; background: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; color: #dc2626; font-size: 13px; font-weight: 500; text-align: center; }
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
        .balance-overview { background: white; border: 1px solid #e5e7eb; border-radius: 10px; padding: 16px; margin-bottom: 16px; }
        .balance-calc-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; font-size: 14px; }
        .balance-calc-row span:first-child { color: #6b7280; font-weight: 500; }
        .balance-calc-row span:last-child { color: #1f2937; font-weight: 600; }
        .balance-calc-row.total { padding-top: 12px; font-size: 15px; }
        .balance-calc-row.total span:first-child { color: #1f2937; font-weight: 600; }
        .balance-calc-row.total span:last-child { color: #16a34a; font-weight: 700; }
        .balance-calc-row .negative { color: #dc2626; }
        .balance-calc-divider { height: 1px; background: #e5e7eb; margin: 8px 0; }
        .submit-btn { width: 100%; padding: 14px; background: #dc2626; color: white; font-size: 16px; font-weight: 600; border: none; border-radius: 6px; cursor: pointer; transition: all 0.2s; }
        .submit-btn:hover:not(:disabled) { background: #b91c1c; transform: translateY(-1px); box-shadow: 0 4px 12px rgba(220, 38, 38, 0.3); }
        .submit-btn:active:not(:disabled) { transform: translateY(0); }
        .submit-btn:disabled { background: #d1d5db; cursor: not-allowed; transform: none; }
        .secondary-btn { width: 100%; padding: 14px; background: white; color: #6b7280; font-size: 16px; font-weight: 600; border: 1px solid #e5e7eb; border-radius: 6px; cursor: pointer; transition: all 0.2s; margin-top: 12px; }
        .secondary-btn:hover:not(:disabled) { background: #f9fafb; color: #1f2937; }
        .secondary-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .cancel-btn { width: 100%; padding: 14px; background: white; color: #6b7280; font-size: 16px; font-weight: 600; border: 1px solid #e5e7eb; border-radius: 6px; cursor: pointer; transition: all 0.2s; }
        .cancel-btn:hover:not(:disabled) { background: #f9fafb; color: #1f2937; }
        .cancel-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .loading-container { display: flex; justify-content: center; align-items: center; min-height: 400px; flex-direction: column; gap: 16px; }
        .spinner { width: 48px; height: 48px; border: 4px solid #e5e7eb; border-top-color: #dc2626; border-radius: 50%; animation: spin 1s linear infinite; }
        .loading-text { color: #6b7280; font-size: 14px; font-weight: 500; }
        .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.5); display: flex; align-items: center; justify-content: center; z-index: 9999; padding: 16px; animation: fadeIn 0.2s ease-out; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .modal-content { background: white; border-radius: 16px; padding: 32px 24px; max-width: 500px; width: 100%; position: relative; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1); animation: slideUp 0.3s ease-out; }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .pin-modal-content { max-width: 400px; }
        .modal-close { position: absolute; top: 16px; right: 16px; background: #f3f4f6; border: none; border-radius: 8px; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s; color: #6b7280; }
        .modal-close:hover { background: #e5e7eb; color: #1f2937; }
        .modal-close:disabled { opacity: 0.5; cursor: not-allowed; }
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
        @media (max-width: 768px) { .page-container { padding: 12px; } .page-title { font-size: 18px; } .card { padding: 16px; } .modal-content { padding: 24px 20px; }  .pin-modal-title { font-size: 20px; } }
        @media (max-width: 480px) { .pin-dots { gap: 12px; padding: 20px; } .pin-dot { width: 14px; height: 14px; } .category-tabs { flex-wrap: wrap; } .category-tab { font-size: 11px; padding: 6px 4px; } }
      `}</style>
    </div>
  );
  }