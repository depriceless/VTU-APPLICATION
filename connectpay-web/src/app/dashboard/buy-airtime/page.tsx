'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, X, RefreshCw } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import apiClient, { storage } from '@/lib/api';
import { AirtimeSuccessModal } from '@/components/SuccessModal/page';
import { logger } from '@/lib/logger';

export default function BuyAirtimePage() {
  const router = useRouter();
  const { user: contextUser, isAuthenticated } = useAuth();
  const [selectedNetwork, setSelectedNetwork] = useState('');
  const [amount, setAmount] = useState('');
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [balance, setBalance] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinError, setPinError] = useState('');
  const [successData, setSuccessData] = useState<any>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const pinInputRef = useRef<HTMLInputElement>(null);
  const isMountedRef = useRef(true);

  const networks = [
    { id: 'mtn', label: 'MTN' },
    { id: 'airtel', label: 'AIRTEL' },
    { id: 'glo', label: 'GLO' },
    { id: '9mobile', label: '9MOBILE' }
  ];

  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
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
      if (response.data?.success && response.data?.balance && isMountedRef.current) {
        setBalance(extractBalance(response.data.balance));
        logger.success('Balance refreshed');
      }
    } catch (error: any) {
      logger.error('Error fetching balance');
    } finally {
      if (isMountedRef.current) setIsLoadingBalance(false);
    }
  };

  useEffect(() => {
    fetchBalance().finally(() => { if (isMountedRef.current) setIsLoading(false); });
  }, []);

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

  const handleProceedToPinEntry = () => {
    if (!selectedNetwork || !amount || !phone) { alert('Please fill in all fields'); return; }
    if (phone.length !== 11) { alert('Phone number must be 11 digits'); return; }
    const amountNum = parseFloat(amount);
    if (amountNum < 50) { alert('Minimum amount is ₦50'); return; }
    if (amountNum > 100000) { alert('Maximum amount is ₦100,000'); return; }
    if (amountNum > balance) {
      alert(`Insufficient balance. Available: ₦${balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
      return;
    }
    setPin('');
    setPinError('');
    setShowPinModal(true);
  };

  const handleBuyAirtime = async () => {
    try {
      if (pin.length !== 4) { setPinError('Please enter a 4-digit PIN'); return; }
      setIsProcessing(true);
      setPinError('');
      const amountNum = parseFloat(amount);
      logger.info('Airtime purchase attempt started');
      const response = await apiClient.post('/purchase', {
        type: 'airtime', network: selectedNetwork, phone, amount: amountNum, pin,
      });
      logger.info('Purchase response received');
      if (response.data?.success) {
        const networkName = networks.find(n => n.id === selectedNetwork)?.label || selectedNetwork.toUpperCase();
        setSuccessData({
          transaction: response.data.transaction || {},
          networkName, phone,
          amount: response.data.transaction?.amount || amountNum,
          newBalance: response.data.newBalance || response.data.balance
        });
        if (response.data.newBalance !== undefined) setBalance(extractBalance(response.data.newBalance));
        else if (response.data.balance !== undefined) setBalance(extractBalance(response.data.balance));
        else await fetchBalance();
        setPhone(''); setAmount(''); setSelectedNetwork(''); setPin('');
        setShowPinModal(false);
        setTimeout(() => setShowSuccessModal(true), 200);
        logger.success('Airtime purchase completed');
      } else {
        setPinError(response.data?.message || 'Transaction failed. Please try again.');
      }
    } catch (error: any) {
      logger.error('Purchase failed');
      if (error.response?.data?.message) setPinError(error.response.data.message);
      else if (error.message) setPinError(error.message);
      else setPinError('Unable to process payment. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClosePinModal = () => {
    if (!isProcessing) { setShowPinModal(false); setPin(''); setPinError(''); }
  };
  const handleCloseSuccessModal = () => { setShowSuccessModal(false); setSuccessData(null); };
  const handleBuyMoreAirtime = () => { setShowSuccessModal(false); setSuccessData(null); };

  if (isLoading) {
    return (
      <div className="page-container">
        <div className="loading-container">
          <div className="spinner" />
          <p className="loading-text">Loading...</p>
        </div>
        <style jsx>{styles}</style>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">BUY AIRTIME</h1>
        <div className="breadcrumb">
          <span className="breadcrumb-link" onClick={() => router.push('/dashboard')}>Dashboard</span>
          <span className="breadcrumb-separator">/</span>
          <span className="breadcrumb-current">Airtime</span>
        </div>
      </div>

      <div className="card">
        {/* ── Wallet balance row ── */}
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
          {/* Network */}
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
                    <div key={network.id}
                      className={`custom-select-option ${selectedNetwork === network.id ? 'selected' : ''}`}
                      onClick={() => handleNetworkSelect(network.id)}>
                      {network.label}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Amount */}
          <div className="form-group">
            <label htmlFor="amount">Airtime Amount (₦)</label>
            <input id="amount" type="number" value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="e.g 50" min="50" max="100000"
              className="text-input" disabled={isProcessing} />
          </div>

          {/* Phone */}
          <div className="form-group">
            <label htmlFor="phone">Receiver's Phone Number</label>
            <input id="phone" type="tel" value={phone}
              onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
              placeholder="e.g 08012345678" maxLength={11}
              className="text-input" disabled={isProcessing} />
          </div>
        </div>

        <button onClick={handleProceedToPinEntry} className="submit-btn" disabled={isProcessing}>
          Continue
        </button>

        {/* Check Airtime Balance */}
        <div className="balance-check-section">
          <div className="balance-check-card">
            <h3 className="balance-check-title">Check Airtime Balance</h3>
            <div className="balance-check-content">
              <p className="balance-check-label">Dial:</p>
              <div className="balance-check-code">*310#</div>
            </div>
          </div>
        </div>
      </div>

      {/* PIN Modal */}
      {showPinModal && (
        <div className="modal-overlay" onClick={handleClosePinModal}>
          <div className="modal-content pin-modal-content" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={handleClosePinModal} disabled={isProcessing}>
              <X size={18} />
            </button>
            <h2 className="pin-modal-title">Enter Transaction PIN</h2>
            <p className="pin-modal-subtitle">Enter your 4-digit PIN to complete the purchase</p>
            <div className="pin-input-container">
              <input ref={pinInputRef} type="password" inputMode="numeric" maxLength={4}
                value={pin} onChange={e => { setPin(e.target.value.replace(/\D/g, '')); setPinError(''); }}
                placeholder="****" className="pin-input" disabled={isProcessing} />
              <div className="pin-dots">
                {[0,1,2,3].map(i => (
                  <div key={i} className={`pin-dot ${pin.length > i ? 'filled' : ''} ${pinError ? 'error' : ''}`} />
                ))}
              </div>
            </div>
            {pinError && <div className="pin-error-message">{pinError}</div>}
            <button onClick={handleBuyAirtime} className="submit-btn" disabled={pin.length !== 4 || isProcessing}>
              {isProcessing ? 'Processing…' : 'Confirm Purchase'}
            </button>
            <button onClick={handleClosePinModal} className="cancel-btn" disabled={isProcessing}>Cancel</button>
          </div>
        </div>
      )}

      <AirtimeSuccessModal
        isOpen={showSuccessModal}
        onClose={handleCloseSuccessModal}
        onBuyMore={handleBuyMoreAirtime}
        networkName={successData?.networkName}
        phone={successData?.phone}
        amount={successData?.amount}
        reference={successData?.transaction?.reference}
        newBalance={successData?.newBalance}
      />

      <style jsx>{styles}</style>
    </div>
  );
}

const styles = `
  .page-container { padding: 16px 24px; max-width: 1200px; margin: 0 auto; }
  .page-header { margin-bottom: 20px; }
  .page-title { font-size: 20px; font-weight: 700; color: #dc2626; margin: 0 0 8px 0; letter-spacing: 0.3px; }
  .breadcrumb { display: flex; align-items: center; gap: 6px; font-size: 14px; }
  .breadcrumb-link { color: #6b7280; font-weight: 500; cursor: pointer; transition: color 0.2s; }
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

  .form { display: flex; flex-direction: column; gap: 16px; margin-bottom: 16px; }
  .form-group { display: flex; flex-direction: column; }
  .form-group label { font-size: 13px; font-weight: 600; color: #374151; margin-bottom: 7px; letter-spacing: 0.01em; }

  .custom-select-wrapper { position: relative; }
  .custom-select-trigger { width: 100%; padding: 11px 14px; font-size: 14px; border: 1.5px solid #d1d5db; border-radius: 8px; background: white; cursor: pointer; transition: all 0.2s; display: flex; justify-content: space-between; align-items: center; user-select: none; }
  .custom-select-trigger:hover { border-color: #9ca3af; }
  .custom-select-trigger .placeholder { color: #9ca3af; font-weight: 400; }
  .custom-select-trigger .selected { color: #1f2937; font-weight: 600; }
  .dropdown-icon { transition: transform 0.2s; color: #6b7280; flex-shrink: 0; }
  .dropdown-icon.open { transform: rotate(180deg); }
  .custom-select-dropdown { position: absolute; top: calc(100% + 6px); left: 0; right: 0; background: white; border: 1.5px solid #e5e7eb; border-radius: 10px; box-shadow: 0 10px 30px rgba(0,0,0,0.1); z-index: 1000; overflow: hidden; animation: dropdownSlide 0.18s ease-out; }
  @keyframes dropdownSlide { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }
  .custom-select-option { padding: 11px 14px; font-size: 14px; color: #1f2937; font-weight: 500; cursor: pointer; transition: all 0.15s; }
  .custom-select-option:hover { background: #fef2f2; color: #dc2626; }
  .custom-select-option.selected { background: #dc2626; color: white; font-weight: 600; }

  .text-input { width: 100%; padding: 11px 14px; font-size: 14px; border: 1.5px solid #d1d5db; border-radius: 8px; transition: all 0.2s; color: #1f2937; font-weight: 500; background: #fff; }
  .text-input:hover { border-color: #9ca3af; }
  .text-input:focus { outline: none; border-color: #dc2626; box-shadow: 0 0 0 3px rgba(220,38,38,0.08); }
  .text-input:disabled { background: #f3f4f6; cursor: not-allowed; }
  .text-input::placeholder { color: #9ca3af; font-weight: 400; }

  .submit-btn { width: 100%; padding: 13px; background: #dc2626; color: white; font-size: 15px; font-weight: 700; border: none; border-radius: 8px; cursor: pointer; transition: all 0.2s; margin-bottom: 20px; letter-spacing: 0.01em; }
  .submit-btn:hover:not(:disabled) { background: #b91c1c; box-shadow: 0 4px 14px rgba(220,38,38,0.3); }
  .submit-btn:disabled { background: #d1d5db; cursor: not-allowed; }

  .cancel-btn { width: 100%; padding: 13px; background: white; color: #6b7280; font-size: 15px; font-weight: 600; border: 1.5px solid #e5e7eb; border-radius: 8px; cursor: pointer; transition: all 0.2s; }
  .cancel-btn:hover:not(:disabled) { border-color: #9ca3af; color: #374151; background: #f9fafb; }
  .cancel-btn:disabled { opacity: 0.5; cursor: not-allowed; }

  .balance-check-section { margin-top: 4px; }
  .balance-check-card { background: white; border: 1px solid #e5e7eb; border-radius: 10px; padding: 16px; transition: all 0.2s; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
  .balance-check-card:hover { border-color: #fca5a5; box-shadow: 0 4px 12px rgba(220,38,38,0.08); }
  .balance-check-title { font-size: 13px; font-weight: 600; color: #374151; margin: 0 0 10px 0; text-align: center; letter-spacing: 0.3px; }
  .balance-check-content { display: flex; flex-direction: column; align-items: center; gap: 6px; }
  .balance-check-label { font-size: 12px; font-weight: 500; color: #6b7280; margin: 0; }
  .balance-check-code { font-size: 20px; font-weight: 700; color: #dc2626; background: #fef2f2; padding: 10px 16px; border-radius: 6px; border: 1px solid #fecaca; width: 100%; text-align: center; letter-spacing: 1px; font-family: 'Courier New', monospace; }

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

  @keyframes spin { to { transform: rotate(360deg); } }

  @media (max-width: 768px) {
    .page-container { padding: 12px; }
    .card { padding: 16px; }
    .modal-content { padding: 24px 18px; }
  }
  @media (max-width: 480px) {
    .pin-dots { gap: 12px; padding: 20px; }
    .pin-dot { width: 12px; height: 12px; }
    .balance-check-code { font-size: 18px; }
  }
`;