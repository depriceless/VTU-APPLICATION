'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, X, RefreshCw, Check } from 'lucide-react';
import apiClient from '@/lib/api';
import { DataSuccessModal } from '@/components/SuccessModal/page';
import { logger } from '@/lib/logger';

// FIX: simple UUID generator — no external package needed
const generateRequestId = () =>
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });

interface DataPlan {
  id: string;
  planId: string;
  name: string;
  customerPrice: number;
  amount: number;
  validity: string;
  dataSize: string;
  network: string;
  type: 'regular' | 'sme' | 'gift' | 'cg';
}

type PlanCategory = 'regular' | 'sme' | 'gift' | 'cg';

const NETWORK_COLORS: Record<string, { bg: string; badge: string; text: string; border: string }> = {
  mtn:     { bg: 'rgba(255,204,0,0.08)',  badge: '#ffcc00', text: '#b8860b', border: '#ffcc00' },
  airtel:  { bg: 'rgba(220,38,38,0.06)',  badge: '#dc2626', text: '#dc2626', border: '#fca5a5' },
  glo:     { bg: 'rgba(22,163,74,0.07)',  badge: '#16a34a', text: '#16a34a', border: '#86efac' },
  '9mobile':{ bg: 'rgba(21,128,61,0.07)', badge: '#15803d', text: '#15803d', border: '#6ee7b7' },
};

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
    { id: 'mtn',     label: 'MTN'     },
    { id: 'airtel',  label: 'AIRTEL'  },
    { id: 'glo',     label: 'GLO'     },
    { id: '9mobile', label: '9MOBILE' },
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
    const mtnPrefixes        = ['0803','0806','0703','0706','0813','0816','0810','0814','0903','0906','0913','0916'];
    const airtelPrefixes     = ['0802','0808','0812','0701','0902','0907','0901','0904','0912'];
    const gloPrefixes        = ['0805','0807','0815','0811','0705','0905','0915'];
    const nineMobilePrefixes = ['0809','0818','0817','0909','0908'];
    if (mtnPrefixes.includes(prefix))        return 'mtn';
    if (airtelPrefixes.includes(prefix))     return 'airtel';
    if (gloPrefixes.includes(prefix))        return 'glo';
    if (nineMobilePrefixes.includes(prefix)) return '9mobile';
    return null;
  };

  const categorizePlans = (plans: DataPlan[]) => ({
    regular: plans.filter(p => p.type === 'regular'),
    sme:     plans.filter(p => p.type === 'sme'),
    gift:    plans.filter(p => p.type === 'gift'),
    cg:      plans.filter(p => p.type === 'cg'),
  });

  const categorizedPlans = categorizePlans(dataPlans);
  const displayPlans     = categorizedPlans[selectedCategory];
  const isPhoneValid     = phone.length === 11 && /^0[789]\d{9}$/.test(phone); // FIX: updated regex
  const hasEnoughBalance = selectedPlan ? selectedPlan.customerPrice <= balance : true;
  const canProceed       = isPhoneValid && selectedNetwork && selectedPlan;

  useEffect(() => { isMountedRef.current = true; return () => { isMountedRef.current = false; }; }, []);

  const fetchBalance = async () => {
    setIsLoadingBalance(true);
    try {
      const response = await apiClient.get('/balance');
      if (response.data?.success && isMountedRef.current) {
        setBalance(extractBalance(response.data.balance));
      } else if (response.data?.balance !== undefined && isMountedRef.current) {
        setBalance(extractBalance(response.data.balance));
      }
    } catch (error: any) { logger.error('Error fetching balance'); }
    finally { if (isMountedRef.current) setIsLoadingBalance(false); }
  };

  const fetchDataPlans = async (network: string) => {
    setIsLoadingPlans(true);
    try {
      const response = await apiClient.get(`/easyaccess/plans/${network}?t=${Date.now()}`);
      if (response.data.success && response.data.plans) {
        const plans: DataPlan[] = response.data.plans.map((plan: any) => ({
          id:            plan.id != null ? String(plan.id) : String(plan.planId),
          planId:        plan.planId != null ? String(plan.planId) : String(plan.id),
          name:          plan.name ?? 'Unknown Plan',
          dataSize:      plan.dataSize ?? '',
          customerPrice: plan.customerPrice != null ? Number(plan.customerPrice) : 0,
          amount:        plan.providerCost != null ? Number(plan.providerCost) : (plan.amount != null ? Number(plan.amount) : 0),
          validity:      plan.validity ?? '',
          network:       plan.network ?? network,
          type:          (plan.type as PlanCategory) ?? 'regular',
        }));
        if (isMountedRef.current) setDataPlans(plans);
      } else { if (isMountedRef.current) setDataPlans([]); }
    } catch { if (isMountedRef.current) setDataPlans([]); }
    finally { if (isMountedRef.current) setIsLoadingPlans(false); }
  };

  useEffect(() => { fetchBalance().finally(() => { if (isMountedRef.current) setIsLoading(false); }); }, []);

  useEffect(() => {
    if (isPhoneValid) {
      const det = detectNetwork(phone);
      if (det && det !== selectedNetwork) setSelectedNetwork(det);
    }
  }, [phone]);

  useEffect(() => {
    if (selectedNetwork) { fetchDataPlans(selectedNetwork); setSelectedPlan(null); }
    else { setDataPlans([]); setSelectedPlan(null); }
  }, [selectedNetwork]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setDropdownOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => { if (showPinModal) setTimeout(() => pinInputRef.current?.focus(), 100); }, [showPinModal]);

  const handleNetworkSelect   = (id: string) => { setSelectedNetwork(id); setDropdownOpen(false); };
  const handlePlanSelect      = (plan: DataPlan) => setSelectedPlan(plan);
  const handleProceedToReview = () => {
    if (!canProceed) {
      if (!isPhoneValid)         alert('Please enter a valid 11-digit phone number');
      else if (!selectedNetwork) alert('Please select a network');
      else if (!selectedPlan)    alert('Please select a data plan');
      return;
    }
    if (!hasEnoughBalance) { alert('Insufficient balance. Please fund your wallet to continue.'); return; }
    setCurrentStep(2);
  };
  const handleProceedToPinEntry = () => { setPin(''); setPinError(''); setShowPinModal(true); };

  const handleBuyData = async () => {
    // FIX: block if already processing
    if (isProcessing) return;
    try {
      if (pin.length !== 4) { setPinError('Please enter a 4-digit PIN'); return; }
      if (!selectedNetwork || !phone || phone.length !== 11 || !selectedPlan) { setPinError('Invalid purchase details'); return; }
      setIsProcessing(true);
      setPinError('');

      // FIX: generate unique request ID for idempotency
      const clientRequestId = generateRequestId();

      const response = await apiClient.post('/purchase', {
        type:    'data',
        network: selectedNetwork,
        phone,
        planId:  selectedPlan.planId,
        plan:    selectedPlan.name,
        amount:  selectedPlan.customerPrice,
        pin,
        clientRequestId, // FIX: send to backend
      });

      if (response.data?.success) {
        const networkName = networks.find(n => n.id === selectedNetwork)?.label || selectedNetwork.toUpperCase();
        setSuccessData({
          transaction: response.data.transaction || {},
          networkName, phone,
          amount:    response.data.transaction?.amount || selectedPlan?.customerPrice,
          dataPlan:  selectedPlan?.name,
          dataSize:  selectedPlan?.dataSize,
          validity:  selectedPlan?.validity,
          newBalance: response.data.newBalance || response.data.balance,
        });
        if (response.data.newBalance !== undefined) setBalance(extractBalance(response.data.newBalance));
        else if (response.data.balance !== undefined) setBalance(extractBalance(response.data.balance));
        else await fetchBalance();
        setPhone(''); setSelectedNetwork(''); setSelectedPlan(null); setDataPlans([]); setPin(''); setCurrentStep(1);
        setShowPinModal(false);
        setTimeout(() => setShowSuccessModal(true), 200);
      } else {
        setPinError(response.data?.message || 'Transaction failed. Please try again.');
      }
    } catch (error: any) {
      // FIX: handle new backend error codes properly
      const status  = error.response?.status;
      const message = error.response?.data?.message;
      if (status === 423) {
        setPinError(message || 'Account locked due to too many failed PIN attempts.');
      } else if (status === 400 && message?.includes('Daily limit')) {
        setPinError(message);
      } else if (message) {
        setPinError(message);
      } else if (error.message) {
        setPinError(error.message);
      } else {
        setPinError('Unable to process payment. Please try again.');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClosePinModal     = () => { if (!isProcessing) { setShowPinModal(false); setPin(''); setPinError(''); } };
  const handleCloseSuccessModal = () => { setShowSuccessModal(false); setSuccessData(null); };
  const handleBuyMoreData       = () => { setShowSuccessModal(false); setSuccessData(null); setCurrentStep(1); };
  const handleBackToForm        = () => setCurrentStep(1);

 if (isLoading) {
  return (
    <div className="page-container">
      <div className="page-header">
        <div style={{ height: 24, width: 120, background: '#e5e7eb', borderRadius: 6, marginBottom: 10, animation: 'pulse 1.5s infinite' }} />
        <div style={{ height: 14, width: 100, background: '#f3f4f6', borderRadius: 6, animation: 'pulse 1.5s infinite' }} />
      </div>
      <div className="card">
        <div style={{ height: 48, background: '#f3f4f6', borderRadius: 8, marginBottom: 20, animation: 'pulse 1.5s infinite' }} />
        {[0, 1, 2].map(i => (
          <div key={i} style={{ marginBottom: 18 }}>
            <div style={{ height: 13, width: 100, background: '#e5e7eb', borderRadius: 4, marginBottom: 7, animation: 'pulse 1.5s infinite' }} />
            <div style={{ height: 44, background: '#f3f4f6', borderRadius: 8, animation: 'pulse 1.5s infinite' }} />
          </div>
        ))}
        <div style={{ height: 48, background: '#e5e7eb', borderRadius: 8, animation: 'pulse 1.5s infinite' }} />
      </div>
      <style jsx>{sharedStyles}</style>
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
          {/* Balance bar */}
          <div className="balance-header">
            <div className="wallet-badge">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}}>
                <path d="M20 12V22H4V12"/><path d="M22 7H2v5h20V7z"/><path d="M12 22V7"/>
                <path d="M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z"/>
              </svg>
              <span>₦{balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <button className="refresh-btn" onClick={fetchBalance} disabled={isLoadingBalance}>
              <RefreshCw size={13} className={isLoadingBalance ? 'spinning' : ''} />
              <span>{isLoadingBalance ? 'Refreshing…' : 'Refresh'}</span>
            </button>
          </div>

          <div className="form">
            {/* Phone */}
            <div className="form-group">
              <label htmlFor="phone">Phone Number</label>
              <input id="phone" type="tel" value={phone}
                onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
                placeholder="08012345678" maxLength={11} className="text-input" disabled={isProcessing} />
              {phone !== '' && isPhoneValid && detectNetwork(phone) && (
                <div className="validation-success">
                  <Check size={12} style={{flexShrink:0}} />
                  {networks.find(n => n.id === detectNetwork(phone))?.label} number detected
                </div>
              )}
              {phone !== '' && !isPhoneValid && (
                <div className="validation-error">Enter a valid 11-digit number (070, 080, 081, 090)</div>
              )}
            </div>

            {/* Network */}
            <div className="form-group">
              <label htmlFor="network">Select Network</label>
              <div className="custom-select-wrapper" ref={dropdownRef}>
                <div className="custom-select-trigger" onClick={() => setDropdownOpen(!dropdownOpen)}>
                  <span className={selectedNetwork ? 'selected' : 'placeholder'}>
                    {selectedNetwork ? networks.find(n => n.id === selectedNetwork)?.label : 'Choose network provider'}
                  </span>
                  <ChevronDown size={15} className={`dropdown-icon ${dropdownOpen ? 'open' : ''}`} />
                </div>
                {dropdownOpen && (
                  <div className="custom-select-dropdown">
                    {networks.map(net => (
                      <div key={net.id}
                        className={`custom-select-option ${selectedNetwork === net.id ? 'selected' : ''}`}
                        onClick={() => handleNetworkSelect(net.id)}>
                        <span className="net-dot" style={{background: NETWORK_COLORS[net.id]?.badge || '#dc2626'}} />
                        {net.label}
                        {selectedNetwork === net.id && <Check size={14} style={{marginLeft:'auto', color:'white'}} />}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Plans */}
            {selectedNetwork && (
              <div className="form-group">
                <label>Select Data Plan</label>
                {isLoadingPlans ? (
                  <div className="loading-plans">
                    <div className="spinner-small" />
                    <span>Loading plans…</span>
                  </div>
                ) : dataPlans.length > 0 ? (
                  <>
                    <div className="category-tabs">
                      {([
                        { key: 'regular' as PlanCategory, label: 'Regular' },
                        { key: 'sme'     as PlanCategory, label: 'SME'     },
                        { key: 'cg'      as PlanCategory, label: 'CG'      },
                        { key: 'gift'    as PlanCategory, label: 'Gifting' },
                      ]).map(({ key, label }) => (
                        <button key={key}
                          className={`category-tab ${selectedCategory === key ? 'active' : ''}`}
                          onClick={() => setSelectedCategory(key)}>
                          {label}
                        </button>
                      ))}
                    </div>
                    {displayPlans.length > 0 ? (
                      <div className="plans-grid">
                        {displayPlans.map((plan, index) => {
                          const isSelected = selectedPlan?.id === plan.id;
                          return (
                            <div key={`${plan.network}-${plan.id}-${index}`}
                              className={`plan-card ${isSelected ? 'selected' : ''}`}
                              onClick={() => handlePlanSelect(plan)}
                              style={isSelected ? { borderColor: '#d1d5db', background: '#f9fafb' } : {}}>
                              {isSelected && (
                                <div className="plan-selected-badge" style={{background: '#dc2626'}}>
                                  <Check size={10} color="white" strokeWidth={3} />
                                </div>
                              )}
                              <div className="plan-size-pill" style={isSelected ? { background: '#fee2e2', color: '#dc2626' } : {}}>
                                {plan.dataSize}
                              </div>
                              <div className="plan-price" style={isSelected ? { color: '#dc2626' } : {}}>
                                ₦{plan.customerPrice.toLocaleString()}
                              </div>
                              <div className="plan-validity-row">
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                                </svg>
                                {plan.validity}
                              </div>
                              <div className="plan-type-label">{plan.name}</div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="empty-state">
                        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5">
                          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                        </svg>
                        <p>No {selectedCategory} plans available</p>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="empty-state">
                    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5">
                      <path d="M1 6l5 5 5-5 5 5 5-5"/><path d="M1 12l5 5 5-5 5 5 5-5"/><path d="M1 18l5 5 5-5 5 5 5-5"/>
                    </svg>
                    <p>No data plans available for this network</p>
                  </div>
                )}
              </div>
            )}

            {selectedPlan && !hasEnoughBalance && (
              <div className="insufficient-warning">
                Insufficient balance. You need ₦{selectedPlan.customerPrice.toLocaleString()} but have ₦{balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            )}
          </div>

          {/* FIX: disabled while processing */}
          <button onClick={handleProceedToReview} className="submit-btn" disabled={!canProceed || isProcessing}>
            {!canProceed
              ? 'Complete Form to Continue'
              : selectedPlan
                ? `Review Purchase • ₦${selectedPlan.customerPrice.toLocaleString()}`
                : 'Review Purchase'}
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
            <div className="summary-divider" />
            <div className="summary-row total"><span>Amount to Pay</span><span>₦{selectedPlan.customerPrice.toLocaleString()}</span></div>
          </div>
          {!hasEnoughBalance && <div className="insufficient-warning">Insufficient balance. Please fund your wallet to continue.</div>}
          <button onClick={handleProceedToPinEntry} className="submit-btn" disabled={!hasEnoughBalance || isProcessing}>
            {hasEnoughBalance ? 'Proceed to Payment' : 'Insufficient Balance'}
          </button>
          <button onClick={handleBackToForm} className="secondary-btn" disabled={isProcessing}>Back to Form</button>
        </div>
      )}

      {/* PIN Modal */}
      {showPinModal && (
        <div className="modal-overlay" onClick={handleClosePinModal}>
          <div className="modal-content pin-modal-content" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={handleClosePinModal} disabled={isProcessing}><X size={18} /></button>
            <h2 className="pin-modal-title">Enter Transaction PIN</h2>
            <p className="pin-modal-subtitle">Enter your 4-digit PIN to complete the purchase</p>
            <div className="pin-input-container">
              <input ref={pinInputRef} type="password" inputMode="numeric" maxLength={4} value={pin}
                onChange={e => { setPin(e.target.value.replace(/\D/g, '')); setPinError(''); }}
                placeholder="****" className="pin-input" disabled={isProcessing} />
              <div className="pin-dots">
                {[0,1,2,3].map(i => (
                  <div key={i} className={`pin-dot ${pin.length > i ? 'filled' : ''} ${pinError ? 'error' : ''}`} />
                ))}
              </div>
            </div>
            {pinError && <div className="pin-error-message">{pinError}</div>}
            {/* FIX: disabled while processing to prevent double click */}
            <button onClick={handleBuyData} className="submit-btn" disabled={pin.length !== 4 || isProcessing}>
              {isProcessing ? 'Processing…' : 'Confirm Purchase'}
            </button>
            <button onClick={handleClosePinModal} className="cancel-btn" disabled={isProcessing}>Cancel</button>
          </div>
        </div>
      )}

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

      <style jsx>{sharedStyles}</style>
    </div>
  );
}

const sharedStyles = `
  .page-container { padding: 16px 24px; max-width: 1200px; margin: 0 auto; }
  .page-header { margin-bottom: 20px; }
  .page-title { font-size: 20px; font-weight: 700; color: #dc2626; margin: 0 0 8px 0; letter-spacing: 0.3px; }
  .breadcrumb { display: flex; align-items: center; gap: 6px; font-size: 14px; }
  .breadcrumb-link { color: #6b7280; font-weight: 500; cursor: pointer; transition: color 0.2s; }
  .breadcrumb-link:hover { color: #dc2626; }
  .breadcrumb-separator { color: #9ca3af; }
  .breadcrumb-current { color: #1f2937; font-weight: 500; }
  .card { background: white; border-radius: 12px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04); border: 1px solid #e5e7eb; max-width: 700px; margin: 0 auto; }
  .balance-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding: 12px 14px; background: #f9fafb; border-radius: 8px; border: 1px solid #e5e7eb; }
  .wallet-badge { display: flex; align-items: center; gap: 8px; }
  .wallet-badge span { font-size: 15px; font-weight: 700; color: #16a34a; }
  .refresh-btn { background: white; border: 1px solid #e5e7eb; border-radius: 6px; padding: 7px 12px; cursor: pointer; display: flex; align-items: center; gap: 5px; color: #374151; font-size: 12px; font-weight: 600; transition: all 0.2s; }
  .refresh-btn:hover:not(:disabled) { border-color: #dc2626; color: #dc2626; background: #fef2f2; }
  .refresh-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .spinning { animation: spin 0.8s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .form { display: flex; flex-direction: column; gap: 18px; margin-bottom: 18px; }
  .form-group { display: flex; flex-direction: column; }
  .form-group label { font-size: 13px; font-weight: 600; color: #374151; margin-bottom: 7px; letter-spacing: 0.01em; }
  .text-input { width: 100%; padding: 11px 14px; font-size: 14px; border: 1.5px solid #d1d5db; border-radius: 8px; transition: all 0.2s; color: #1f2937; font-weight: 500; background: #fff; }
  .text-input:hover { border-color: #9ca3af; }
  .text-input:focus { outline: none; border-color: #dc2626; box-shadow: 0 0 0 3px rgba(220,38,38,0.08); }
  .text-input:disabled { background: #f3f4f6; cursor: not-allowed; }
  .text-input::placeholder { color: #9ca3af; font-weight: 400; }
  .validation-success { margin-top: 7px; display: flex; align-items: center; gap: 5px; color: #16a34a; font-size: 12px; font-weight: 500; }
  .validation-error { margin-top: 7px; color: #dc2626; font-size: 12px; font-weight: 500; }
  .custom-select-wrapper { position: relative; }
  .custom-select-trigger { width: 100%; padding: 11px 14px; font-size: 14px; border: 1.5px solid #d1d5db; border-radius: 8px; background: white; cursor: pointer; transition: all 0.2s; display: flex; justify-content: space-between; align-items: center; user-select: none; }
  .custom-select-trigger:hover { border-color: #9ca3af; }
  .custom-select-trigger .placeholder { color: #9ca3af; font-weight: 400; }
  .custom-select-trigger .selected { color: #1f2937; font-weight: 600; }
  .dropdown-icon { transition: transform 0.2s; color: #6b7280; flex-shrink: 0; }
  .dropdown-icon.open { transform: rotate(180deg); }
  .custom-select-dropdown { position: absolute; top: calc(100% + 6px); left: 0; right: 0; background: white; border: 1.5px solid #e5e7eb; border-radius: 10px; box-shadow: 0 10px 30px rgba(0,0,0,0.1); z-index: 1000; overflow: hidden; animation: dropdownSlide 0.18s ease-out; }
  @keyframes dropdownSlide { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }
  .custom-select-option { padding: 11px 14px; font-size: 14px; color: #1f2937; font-weight: 500; cursor: pointer; transition: all 0.15s; display: flex; align-items: center; gap: 10px; }
  .custom-select-option:hover { background: #fef2f2; color: #dc2626; }
  .custom-select-option.selected { background: #dc2626; color: white; font-weight: 600; }
  .net-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
  .loading-plans { display: flex; align-items: center; justify-content: center; gap: 8px; padding: 28px; color: #6b7280; font-size: 13px; }
  .spinner-small { width: 16px; height: 16px; border: 2px solid #e5e7eb; border-top-color: #dc2626; border-radius: 50%; animation: spin 0.8s linear infinite; flex-shrink: 0; }
  .category-tabs { display: flex; gap: 4px; margin-bottom: 14px; background: #f3f4f6; border-radius: 10px; padding: 4px; }
  .category-tab { flex: 1; padding: 8px 6px; border-radius: 7px; background: transparent; border: none; font-size: 12px; font-weight: 600; color: #6b7280; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center; gap: 5px; }
  .category-tab.active { background: white; color: #dc2626; box-shadow: 0 1px 4px rgba(0,0,0,0.1); }
  .plans-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 10px; max-height: 420px; overflow-y: auto; padding: 2px 2px 4px; }
  .plans-grid::-webkit-scrollbar { width: 5px; }
  .plans-grid::-webkit-scrollbar-track { background: #f3f4f6; border-radius: 3px; }
  .plans-grid::-webkit-scrollbar-thumb { background: #fca5a5; border-radius: 3px; }
  .plans-grid::-webkit-scrollbar-thumb:hover { background: #dc2626; }
  .plan-card { position: relative; background: #fafafa; border: 1.5px solid #e5e7eb; border-radius: 12px; padding: 14px 12px 12px; cursor: pointer; transition: all 0.2s; display: flex; flex-direction: column; gap: 6px; overflow: hidden; }
  .plan-card:hover { border-color: #fca5a5; background: #fff; box-shadow: 0 4px 12px rgba(220,38,38,0.08); transform: translateY(-1px); }
  .plan-card.selected { box-shadow: 0 4px 16px rgba(220,38,38,0.15); transform: translateY(-1px); }
  .plan-selected-badge { position: absolute; top: 8px; right: 8px; width: 18px; height: 18px; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
  .plan-size-pill { display: inline-block; font-size: 15px; font-weight: 800; color: #1f2937; background: #f3f4f6; padding: 3px 10px; border-radius: 20px; letter-spacing: -0.3px; transition: all 0.2s; width: fit-content; }
  .plan-price { font-size: 17px; font-weight: 800; color: #16a34a; letter-spacing: -0.5px; transition: color 0.2s; }
  .plan-validity-row { display: flex; align-items: center; gap: 4px; font-size: 11px; color: #9ca3af; font-weight: 500; }
  .plan-type-label { font-size: 10px; color: #9ca3af; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; padding: 40px 20px; color: #9ca3af; font-size: 13px; text-align: center; }
  .empty-state p { margin: 0; }
  .insufficient-warning { margin-top: 12px; padding: 10px 14px; background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; color: #dc2626; font-size: 13px; font-weight: 500; }
  .review-title { font-size: 18px; font-weight: 700; color: #1f2937; margin: 0 0 16px 0; }
  .summary-card { background: #f9fafb; border-radius: 10px; padding: 16px; margin-bottom: 16px; border: 1px solid #e5e7eb; }
  .summary-row { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #e5e7eb; font-size: 14px; }
  .summary-row:last-child { border-bottom: none; }
  .summary-row span:first-child { color: #6b7280; font-weight: 500; }
  .summary-row span:last-child { color: #1f2937; font-weight: 600; }
  .summary-divider { height: 1px; background: #e5e7eb; margin: 4px 0; }
  .summary-row.total { padding: 14px; background: #fef2f2; margin: 8px -16px -16px; border-radius: 0 0 10px 10px; border-bottom: none; }
  .summary-row.total span:first-child { color: #1f2937; font-size: 14px; font-weight: 600; }
  .summary-row.total span:last-child { color: #dc2626; font-size: 22px; font-weight: 800; }
  .submit-btn { width: 100%; padding: 13px; background: #dc2626; color: white; font-size: 15px; font-weight: 700; border: none; border-radius: 8px; cursor: pointer; transition: all 0.2s; letter-spacing: 0.01em; }
  .submit-btn:hover:not(:disabled) { background: #b91c1c; box-shadow: 0 4px 14px rgba(220,38,38,0.3); }
  .submit-btn:disabled { background: #d1d5db; cursor: not-allowed; }
  .secondary-btn { width: 100%; padding: 13px; background: white; color: #6b7280; font-size: 15px; font-weight: 600; border: 1.5px solid #e5e7eb; border-radius: 8px; cursor: pointer; transition: all 0.2s; margin-top: 10px; }
  .secondary-btn:hover:not(:disabled) { border-color: #9ca3af; color: #374151; background: #f9fafb; }
  .secondary-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .cancel-btn { width: 100%; padding: 13px; background: white; color: #6b7280; font-size: 15px; font-weight: 600; border: 1.5px solid #e5e7eb; border-radius: 8px; cursor: pointer; transition: all 0.2s; }
  .cancel-btn:hover:not(:disabled) { border-color: #9ca3af; color: #374151; background: #f9fafb; }
  .cancel-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .loading-container { display: flex; justify-content: center; align-items: center; min-height: 400px; flex-direction: column; gap: 14px; }
  .spinner { width: 40px; height: 40px; border: 3px solid #e5e7eb; border-top-color: #dc2626; border-radius: 50%; animation: spin 0.8s linear infinite; }
  .loading-text { color: #6b7280; font-size: 13px; font-weight: 500; }
  .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.45); display: flex; align-items: center; justify-content: center; z-index: 9999; padding: 16px; animation: fadeIn 0.2s ease-out; backdrop-filter: blur(2px); }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  .modal-content { background: white; border-radius: 16px; padding: 28px 24px; max-width: 500px; width: 100%; position: relative; box-shadow: 0 24px 48px rgba(0,0,0,0.15); animation: slideUp 0.25s ease-out; }
  @keyframes slideUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
  .pin-modal-content { max-width: 380px; }
  .modal-close { position: absolute; top: 14px; right: 14px; background: #f3f4f6; border: none; border-radius: 8px; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s; color: #6b7280; }
  .modal-close:hover { background: #e5e7eb; color: #1f2937; }
  .modal-close:disabled { opacity: 0.5; cursor: not-allowed; }
  .pin-modal-title { font-size: 20px; font-weight: 700; color: #1f2937; text-align: center; margin: 0 0 6px 0; }
  .pin-modal-subtitle { font-size: 13px; color: #6b7280; text-align: center; margin: 0 0 22px 0; }
  .pin-input-container { position: relative; margin-bottom: 18px; }
  .pin-input { width: 100%; padding: 16px; font-size: 24px; text-align: center; border: 2px solid #d1d5db; border-radius: 8px; letter-spacing: 12px; font-weight: 600; transition: all 0.2s; opacity: 0; position: absolute; top: 0; left: 0; height: 100%; }
  .pin-dots { display: flex; justify-content: center; gap: 14px; padding: 22px; background: #f9fafb; border-radius: 10px; border: 1.5px solid #e5e7eb; cursor: text; }
  .pin-dot { width: 14px; height: 14px; border-radius: 50%; background: #e5e7eb; transition: all 0.2s; }
  .pin-dot.filled { background: #dc2626; transform: scale(1.15); }
  .pin-dot.error { background: #ef4444; animation: shake 0.3s; }
  @keyframes shake { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-4px)} 75%{transform:translateX(4px)} }
  .pin-error-message { background: #fef2f2; color: #dc2626; padding: 10px 14px; border-radius: 8px; font-size: 13px; font-weight: 500; text-align: center; margin-bottom: 14px; border: 1px solid #fecaca; }
  @media (max-width: 768px) { .page-container { padding: 12px; } .plans-grid { grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 8px; } .modal-content { padding: 24px 18px; } }
  @media (max-width: 480px) { .plans-grid { grid-template-columns: repeat(2, 1fr); } .category-tab { font-size: 11px; } }
@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
`;
