'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, X, Check, RefreshCw } from 'lucide-react';
import apiClient, { storage } from '@/lib/api';

export default function PrintRechargePage() {
  const [activeTab, setActiveTab] = useState('generate');
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedNetwork, setSelectedNetwork] = useState(null);
  const [cardType, setCardType] = useState('airtime');
  const [denomination, setDenomination] = useState(null);
  const [quantity, setQuantity] = useState('1');
  const [balance, setBalance] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [generatedPins, setGeneratedPins] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [networkDropdownOpen, setNetworkDropdownOpen] = useState(false);
  const pinInputRef = useRef(null);
  const networkDropdownRef = useRef(null);

  const networks = [
    { id: 'mtn', label: 'MTN' },
    { id: 'airtel', label: 'AIRTEL' },
    { id: 'glo', label: 'GLO' },
    { id: '9mobile', label: '9MOBILE' }
  ];

  const getDenominations = (network) => {
    const networkDenominations = {
      mtn: [100, 200, 500, 1000, 1500, 2000],
      airtel: [100, 200, 500, 1000, 2000],
      glo: [100, 200, 500, 1000],
      '9mobile': [100, 200, 500, 1000]
    };
    return network ? networkDenominations[network] || [100, 200, 500, 1000] : [100, 200, 500, 1000];
  };

  const denominations = getDenominations(selectedNetwork);
  const totalAmount = denomination && quantity ? denomination * Math.max(1, Math.min(100, parseInt(quantity) || 1)) : 0;
  const hasEnoughBalance = totalAmount <= balance;
  const canProceed = selectedNetwork && cardType && denomination && parseInt(quantity) > 0 && parseInt(quantity) <= 100 && hasEnoughBalance;
  const isPinValid = pin.length === 4 && /^\d{4}$/.test(pin);

  const extractBalance = (balanceData) => {
    if (balanceData === null || balanceData === undefined) return 0;
    if (typeof balanceData === 'number') return balanceData;
    if (typeof balanceData === 'object') {
      const balance = balanceData.amount || balanceData.balance || balanceData.total || balanceData.main || 0;
      return parseFloat(balance) || 0;
    }
    return parseFloat(balanceData) || 0;
  };

  const fetchBalance = async () => {
    setIsLoadingBalance(true);
    try {
      const response = await apiClient.get('/balance');
      if (response.data?.success && response.data.balance) {
        setBalance(extractBalance(response.data.balance));
      }
    } catch (error) {
      console.error('Error fetching balance:', error);
    } finally {
      setIsLoadingBalance(false);
    }
  };

  const loadTransactionHistory = async () => {
    try {
      const response = await apiClient.get('/purchase/history?type=recharge');
      if (response.data?.success && response.data.data?.transactions) {
        setTransactions(response.data.data.transactions);
      }
    } catch (error) {
      console.error('Error loading history:', error);
    }
  };

  useEffect(() => {
    fetchBalance().finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    if (activeTab === 'history') {
      loadTransactionHistory();
    }
  }, [activeTab]);

  useEffect(() => {
    if (currentStep === 2) {
      fetchBalance();
    }
  }, [currentStep]);

  useEffect(() => {
    if (showPinModal) {
      setTimeout(() => pinInputRef.current?.focus(), 100);
    }
  }, [showPinModal]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (networkDropdownRef.current && !networkDropdownRef.current.contains(event.target)) {
        setNetworkDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (selectedNetwork && denomination && !denominations.includes(denomination)) {
      setDenomination(null);
    }
  }, [selectedNetwork, denomination, denominations]);

  const handleQuantityChange = (text) => {
    if (text === '') {
      setQuantity('');
      return;
    }
    const numericValue = text.replace(/[^0-9]/g, '');
    if (numericValue === '' || numericValue === '0') {
      setQuantity('1');
    } else if (parseInt(numericValue) > 100) {
      setQuantity('100');
    } else {
      setQuantity(numericValue);
    }
  };

  const handleProceedToPayment = () => {
    setPin('');
    setPinError('');
    setShowPinModal(true);
  };

  const generateRechargePins = async () => {
    if (!isPinValid) {
      setPinError('PIN must be exactly 4 digits');
      return;
    }

    const qty = parseInt(quantity);
    if (isNaN(qty) || qty < 1 || qty > 100) {
      setPinError('Quantity must be between 1 and 100');
      return;
    }

    if (!hasEnoughBalance) {
      setPinError('Insufficient balance for this transaction');
      return;
    }

    setIsProcessing(true);
    setPinError('');

    try {
      const response = await apiClient.post('/purchase', {
        type: 'print_recharge',
        network: selectedNetwork,
        cardType: cardType,
        denomination,
        quantity: qty,
        amount: totalAmount,
        pin,
      });

      if (response.data?.success === true) {
        const pins = response.data.pins || response.data.data?.pins || response.data.transaction?.pins || [];
        setGeneratedPins(pins);

        if (response.data.newBalance) {
          setBalance(extractBalance(response.data.newBalance));
        }

        setShowPinModal(false);
        setTimeout(() => setShowSuccessModal(true), 300);
      } else {
        setPinError(response.data?.message || 'Transaction failed. Please try again.');
      }
    } catch (error) {
      console.error('Payment error:', error);
      setPinError(error.message || 'Unable to process payment. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCloseSuccessModal = () => {
    setShowSuccessModal(false);
    setGeneratedPins([]);
    setCurrentStep(1);
    setSelectedNetwork(null);
    setDenomination(null);
    setQuantity('1');
    setPin('');
    setPinError('');
    fetchBalance();
  };

  const handleViewHistory = () => {
    setShowSuccessModal(false);
    setGeneratedPins([]);
    setActiveTab('history');
    setCurrentStep(1);
    setSelectedNetwork(null);
    setDenomination(null);
    setQuantity('1');
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
        <h1 className="page-title">PRINT RECHARGE</h1>
        <div className="breadcrumb">
          <span className="breadcrumb-link">Dashboard</span>
          <span className="breadcrumb-separator">/</span>
          <span className="breadcrumb-current">Print Recharge</span>
        </div>
      </div>

      <div className="tab-container">
        <button
          className={`tab ${activeTab === 'generate' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('generate');
            setCurrentStep(1);
          }}
        >
          Generate Card
        </button>
        <button
          className={`tab ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          History
        </button>
      </div>

      {activeTab === 'generate' ? (
        currentStep === 1 ? (
          <div className="card">
            <div className="balance-header">
              <div className="wallet-badge">
                <span>Wallet Balance: ₦{balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <button className="refresh-btn" onClick={fetchBalance} disabled={isLoadingBalance}>
                <RefreshCw size={16} className={isLoadingBalance ? 'spinning' : ''} />
              </button>
            </div>

            <div className="form-section">
              <label className="section-label">Select Network</label>
              <div className="custom-select-wrapper" ref={networkDropdownRef}>
                <div className="custom-select-trigger" onClick={() => setNetworkDropdownOpen(!networkDropdownOpen)}>
                  <span className={selectedNetwork ? 'selected' : 'placeholder'}>
                    {selectedNetwork ? networks.find(n => n.id === selectedNetwork)?.label : 'Choose network provider'}
                  </span>
                  <ChevronDown size={16} className={`dropdown-icon ${networkDropdownOpen ? 'open' : ''}`} />
                </div>
                {networkDropdownOpen && (
                  <div className="custom-select-dropdown">
                    {networks.map(network => (
                      <div
                        key={network.id}
                        className={`custom-select-option ${selectedNetwork === network.id ? 'selected' : ''}`}
                        onClick={() => {
                          setSelectedNetwork(network.id);
                          setNetworkDropdownOpen(false);
                        }}
                      >
                        {network.label}
                        {selectedNetwork === network.id && <Check size={16} className="check-icon" />}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="form-section">
              <label className="section-label">Card Type</label>
              <div className="card-type-row">
                <button
                  className={`card-type-btn ${cardType === 'airtime' ? 'selected' : ''}`}
                  onClick={() => setCardType('airtime')}
                >
                  Airtime
                </button>
                <button
                  className={`card-type-btn ${cardType === 'data' ? 'selected' : ''}`}
                  onClick={() => setCardType('data')}
                >
                  Data
                </button>
              </div>
            </div>

            <div className="form-section">
              <label className="section-label">Denomination</label>
              <div className="denomination-grid">
                {denominations.map((amount) => (
                  <button
                    key={amount}
                    className={`denomination-btn ${denomination === amount ? 'selected' : ''}`}
                    onClick={() => setDenomination(amount)}
                  >
                    ₦{amount}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-section">
              <label className="section-label">Quantity</label>
              <input
                type="text"
                className="text-input"
                placeholder="Enter quantity (1-100)"
                value={quantity}
                onChange={(e) => handleQuantityChange(e.target.value)}
                maxLength={3}
              />
              {(!quantity || parseInt(quantity) < 1) && (
                <div className="validation-error">Please enter a valid quantity (1-100)</div>
              )}
            </div>

            {denomination && quantity && (
              <div className="form-section">
                <label className="section-label">Total Amount</label>
                <div className="total-amount">₦{totalAmount.toLocaleString()}</div>
                {!hasEnoughBalance && (
                  <div className="insufficient-warning">
                    Insufficient balance. Available: ₦{balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                )}
              </div>
            )}

            <button className="submit-btn" disabled={!canProceed} onClick={() => setCurrentStep(2)}>
              {!hasEnoughBalance ? 'Insufficient Balance' :
               canProceed ? `Review Purchase • ₦${totalAmount.toLocaleString()}` :
               'Complete Form to Continue'}
            </button>
          </div>
        ) : (
          <div className="card">
            <h2 className="review-title">Review Purchase</h2>
            <div className="summary-card">
              <div className="summary-row">
                <span>Network</span>
                <span>{networks.find(n => n.id === selectedNetwork)?.label}</span>
              </div>
              <div className="summary-row">
                <span>Type</span>
                <span>{cardType?.toUpperCase()}</span>
              </div>
              <div className="summary-row">
                <span>Denomination</span>
                <span>₦{denomination?.toLocaleString()}</span>
              </div>
              <div className="summary-row">
                <span>Quantity</span>
                <span>{quantity} cards</span>
              </div>
              <div className="summary-divider"></div>
              <div className="summary-row total">
                <span>Total Amount</span>
                <span>₦{totalAmount.toLocaleString()}</span>
              </div>
            </div>

            {!hasEnoughBalance && (
              <div className="insufficient-warning">Insufficient balance for this transaction</div>
            )}

            <button className="submit-btn" disabled={!hasEnoughBalance} onClick={handleProceedToPayment}>
              {hasEnoughBalance ? 'Proceed to Payment' : 'Insufficient Balance'}
            </button>
            <button className="secondary-btn" onClick={() => setCurrentStep(1)}>Back To Form</button>
          </div>
        )
      ) : (
        <div className="card">
          {transactions.length > 0 ? (
            <div className="transactions-list">
              {transactions.map((transaction) => (
                <div key={transaction._id} className="transaction-card">
                  <div className="transaction-header">
                    <span className="transaction-network">{transaction.network.toUpperCase()}</span>
                    <span className="transaction-amount">₦{transaction.amount.toLocaleString()}</span>
                  </div>
                  <div className="transaction-type">
                    {transaction.type} • {transaction.quantity} card{transaction.quantity > 1 ? 's' : ''} • ₦{transaction.denomination}
                  </div>

                  {transaction.pins && transaction.pins.length > 0 && transaction.pins.map((pinData, index) => (
                    <div key={index} className="pin-container">
                      <div className="pin-row">
                        <span className="pin-label">PIN:</span>
                        <span className="pin-code">{pinData.pin}</span>
                      </div>
                      <div className="pin-row">
                        <span className="pin-label">Serial:</span>
                        <span className="pin-serial">{pinData.serial}</span>
                      </div>
                    </div>
                  ))}

                  <div className="transaction-date">
                    {new Date(transaction.createdAt).toLocaleDateString()} • {new Date(transaction.createdAt).toLocaleTimeString()}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <p className="empty-state-text">No recharge cards generated yet</p>
              <p className="empty-state-subtext">Generate your first recharge card to see it here</p>
            </div>
          )}
        </div>
      )}

      {showPinModal && (
        <div className="modal-overlay" onClick={() => !isProcessing && setShowPinModal(false)}>
          <div className="modal-content pin-modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => !isProcessing && setShowPinModal(false)} disabled={isProcessing}>
              <X size={24} />
            </button>
            <h2 className="pin-modal-title">Enter Transaction PIN</h2>
            <p className="pin-modal-subtitle">Enter your 4-digit PIN to confirm</p>

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
                {[0, 1, 2, 3].map((index) => (
                  <div key={index} className={`pin-dot ${pin.length > index ? 'filled' : ''} ${pinError ? 'error' : ''}`} />
                ))}
              </div>
            </div>

            {pinError && <div className="pin-error-message">{pinError}</div>}

            <button className="submit-btn" disabled={!isPinValid || isProcessing} onClick={generateRechargePins}>
              {isProcessing ? 'Processing...' : 'Confirm Payment'}
            </button>
            <button className="cancel-btn" onClick={() => setShowPinModal(false)} disabled={isProcessing}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {showSuccessModal && (
        <div className="modal-overlay" onClick={handleCloseSuccessModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={handleCloseSuccessModal}>
              <X size={24} />
            </button>
            <div className="success-icon">✓</div>
            <h2 className="success-title">Cards Generated!</h2>
            <p className="success-subtitle">
              {quantity} {cardType} card{parseInt(quantity) > 1 ? 's' : ''} • {networks.find(n => n.id === selectedNetwork)?.label}
            </p>

            <div className="pins-scroll">
              {generatedPins.length > 0 ? (
                generatedPins.map((pinData, index) => (
                  <div key={index} className="generated-pin-card">
                    <div className="generated-pin-label">Card #{index + 1}</div>
                    <div className="pin-data-row">
                      <span className="pin-data-label">PIN</span>
                      <span className="pin-value">{pinData.pin || 'N/A'}</span>
                    </div>
                    <div className="pin-data-row">
                      <span className="pin-data-label">Serial</span>
                      <span className="serial-value">{pinData.serial || 'N/A'}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="no-pins-card">
                  <p className="no-pins-text">Cards generated successfully! Check the History tab to view your cards.</p>
                </div>
              )}
            </div>

            <div className="success-actions">
              <button className="action-btn primary" onClick={handleCloseSuccessModal}>Generate More</button>
              <button className="action-btn secondary" onClick={handleViewHistory}>View History</button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .page-container { padding: 16px 24px; max-width: 1200px; margin: 0 auto; }
        .page-header { margin-bottom: 20px; }
        .page-title { font-size: 20px; font-weight: 700; color: #dc2626; margin: 0 0 8px 0; letter-spacing: 0.3px; }
        .breadcrumb { display: flex; align-items: center; gap: 6px; font-size: 14px; }
        .breadcrumb-link { color: #6b7280; font-weight: 500; cursor: pointer; transition: color 0.2s; }
        .breadcrumb-link:hover { color: #dc2626; }
        .breadcrumb-separator { color: #9ca3af; }
        .breadcrumb-current { color: #1f2937; font-weight: 500; }
        .tab-container { display: flex; gap: 8px; margin-bottom: 16px; background: white; border-radius: 10px; padding: 6px; border: 1px solid #e5e7eb; max-width: 700px; margin-left: auto; margin-right: auto; }
        .tab { flex: 1; padding: 12px; background: transparent; border: none; border-radius: 6px; font-size: 15px; font-weight: 600; color: #6b7280; cursor: pointer; transition: all 0.2s; }
        .tab.active { background: #dc2626; color: white; }
        .tab:hover:not(.active) { background: #f9fafb; color: #1f2937; }
        .card { background: white; border-radius: 10px; padding: 20px; box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05); border: 1px solid #e5e7eb; max-width: 700px; margin: 0 auto; }
        .balance-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
        .wallet-badge { background: white; border: 1px solid #d1d5db; padding: 10px 14px; border-radius: 6px; flex: 1; }
        .wallet-badge span { font-size: 13px; font-weight: 700; color: #16a34a; }
        .refresh-btn { background: #f3f4f6; border: 1px solid #d1d5db; border-radius: 6px; padding: 10px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; margin-left: 8px; }
        .refresh-btn:hover:not(:disabled) { background: #e5e7eb; }
        .refresh-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .spinning { animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .form-section { margin-bottom: 20px; }
        .section-label { display: block; font-size: 14px; font-weight: 600; color: #374151; margin-bottom: 10px; }
        .custom-select-wrapper { position: relative; }
        .custom-select-trigger { width: 100%; padding: 12px 14px; font-size: 15px; border: 1px solid #d1d5db; border-radius: 6px; background: white; cursor: pointer; transition: all 0.2s; display: flex; justify-content: space-between; align-items: center; }
        .custom-select-trigger:hover { border-color: #9ca3af; }
        .custom-select-trigger .placeholder { color: #9ca3af; font-weight: 400; }
        .custom-select-trigger .selected { color: #1f2937; font-weight: 500; }
        .dropdown-icon { transition: transform 0.2s; color: #1f2937; }
        .dropdown-icon.open { transform: rotate(180deg); }
        .custom-select-dropdown { position: absolute; top: calc(100% + 4px); left: 0; right: 0; background: white; border: 1px solid #d1d5db; border-radius: 6px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1); z-index: 1000; max-height: 200px; overflow-y: auto; }
        .custom-select-option { padding: 12px 14px; font-size: 15px; color: #1f2937; font-weight: 500; cursor: pointer; transition: all 0.15s; display: flex; justify-content: space-between; align-items: center; }
        .custom-select-option:hover { background: #fef2f2; color: #dc2626; }
        .custom-select-option.selected { background: #dc2626; color: white; font-weight: 600; }
        .check-icon { flex-shrink: 0; }
        .card-type-row { display: flex; gap: 12px; }
        .card-type-btn { flex: 1; padding: 14px; border-radius: 10px; border: 1px solid #e5e7eb; background: #fafafa; font-size: 15px; font-weight: 600; color: #666; cursor: pointer; transition: all 0.2s; }
        .card-type-btn.selected { background: #dc2626; border-color: #dc2626; color: white; }
        .card-type-btn:hover:not(.selected) { background: #f3f4f6; }
        .denomination-grid { display: flex; flex-wrap: wrap; gap: 10px; }
        .denomination-btn { padding: 12px 20px; border-radius: 10px; border: 1px solid #e5e7eb; background: #fafafa; font-size: 14px; font-weight: 600; color: #666; cursor: pointer; transition: all 0.2s; min-width: 30%; }
        .denomination-btn.selected { background: #dc2626; border-color: #dc2626; color: white; }
        .denomination-btn:hover:not(.selected) { background: #f3f4f6; border-color: #fca5a5; }
        .text-input { width: 100%; padding: 12px 14px; font-size: 15px; border: 1px solid #d1d5db; border-radius: 6px; transition: all 0.2s; color: #1f2937; font-weight: 500; }
        .text-input:focus { outline: none; border-color: #dc2626; box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.1); }
        .text-input::placeholder { color: #9ca3af; font-weight: 400; }
        .validation-error { margin-top: 8px; color: #dc2626; font-size: 13px; font-weight: 500; }
        .total-amount { font-size: 28px; font-weight: 700; color: #dc2626; margin-top: 4px; }
        .insufficient-warning { margin-top: 12px; padding: 10px; background: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; color: #dc2626; font-size: 13px; font-weight: 500; text-align: center; }
        .submit-btn { width: 100%; padding: 14px; background: #dc2626; color: white; font-size: 16px; font-weight: 600; border: none; border-radius: 6px; cursor: pointer; transition: all 0.2s; margin-top: 8px; }
        .submit-btn:hover:not(:disabled) { background: #b91c1c; transform: translateY(-1px); box-shadow: 0 4px 12px rgba(220, 38, 38, 0.3); }
        .submit-btn:disabled { background: #d1d5db; cursor: not-allowed; transform: none; }
        .secondary-btn { width: 100%; padding: 14px; background: white; color: #6b7280; font-size: 16px; font-weight: 600; border: 1px solid #e5e7eb; border-radius: 6px; cursor: pointer; transition: all 0.2s; margin-top: 12px; }
        .secondary-btn:hover { background: #f9fafb; color: #1f2937; }
        .review-title { font-size: 18px; font-weight: 700; color: #1f2937; margin: 0 0 16px 0; }
        .balance-overview { background: #f9fafb; border-radius: 10px; padding: 16px; margin-bottom: 16px; }
        .balance-calc-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; font-size: 14px; }
        .balance-calc-row span:first-child { color: #6b7280; font-weight: 500; }
        .balance-calc-row span:last-child { color: #1f2937; font-weight: 600; }
        .balance-calc-row .negative { color: #dc2626; }
        .balance-calc-row.total { padding-top: 12px; font-size: 15px; }
        .balance-calc-row.total span:first-child { color: #1f2937; font-weight: 600; }
        .balance-calc-row.total span:last-child { color: #16a34a; font-weight: 700; }
        .balance-calc-divider { height: 1px; background: #e5e7eb; margin: 8px 0; }
        .summary-card { background: #f9fafb; border-radius: 10px; padding: 16px; margin-bottom: 16px; }
        .summary-row { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #e5e7eb; font-size: 14px; }
        .summary-row:last-child { border-bottom: none; }
        .summary-row span:first-child { color: #6b7280; font-weight: 500; }
        .summary-row span:last-child { color: #1f2937; font-weight: 600; }
        .summary-divider { height: 1px; background: #e5e7eb; margin: 12px 0; }
        .summary-row.total { padding: 16px; background: #fef2f2; margin: 12px -16px -16px; border-radius: 0 0 10px 10px; border-bottom: none; }
        .summary-row.total span:first-child { color: #1f2937; font-size: 15px; font-weight: 600; }
        .summary-row.total span:last-child { color: #dc2626; font-size: 24px; font-weight: 700; }
        .transactions-list { display: flex; flex-direction: column; gap: 12px; }
        .transaction-card { background: #fafafa; border: 1px solid #e5e7eb; border-radius: 10px; padding: 16px; }
        .transaction-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
        .transaction-network { font-weight: 700; color: #1f2937; font-size: 15px; }
        .transaction-amount { font-weight: 700; color: #dc2626; font-size: 15px; }
        .transaction-type { color: #666; font-size: 13px; margin-bottom: 12px; }
        .pin-container { background: #fff; padding: 12px; border-radius: 8px; margin-bottom: 8px; border-left: 4px solid #dc2626; }
        .pin-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
        .pin-row:last-child { margin-bottom: 0; }
        .pin-label { font-size: 12px; color: #666; font-weight: 500; }
        .pin-code { font-size: 15px; font-weight: 700; color: #1f2937; letter-spacing: 1px; }
        .pin-serial { font-size: 13px; color: #666; font-weight: 600; }
        .transaction-date { color: #999; font-size: 12px; margin-top: 8px; }
        .empty-state { padding: 60px 20px; text-align: center; }
        .empty-state-text { font-size: 16px; color: #666; font-weight: 500; margin: 0 0 8px 0; }
        .empty-state-subtext { font-size: 14px; color: #999; margin: 0; }
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
        .cancel-btn { width: 100%; padding: 14px; background: white; color: #6b7280; font-size: 16px; font-weight: 600; border: 1px solid #e5e7eb; border-radius: 6px; cursor: pointer; transition: all 0.2s; margin-top: 12px; }
        .cancel-btn:hover:not(:disabled) { background: #f9fafb; color: #1f2937; }
        .cancel-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .success-icon { width: 64px; height: 64px; border-radius: 50%; background: #dcfce7; color: #16a34a; font-size: 32px; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; font-weight: 700; }
        .success-title { font-size: 24px; font-weight: 700; color: #1f2937; text-align: center; margin: 0 0 8px 0; }
        .success-subtitle { font-size: 14px; color: #6b7280; text-align: center; margin: 0 0 24px 0; }
        .pins-scroll { max-height: 400px; overflow-y: auto; margin-bottom: 24px; padding-right: 4px; }
        .pins-scroll::-webkit-scrollbar { width: 6px; }
        .pins-scroll::-webkit-scrollbar-track { background: #f3f4f6; border-radius: 3px; }
        .pins-scroll::-webkit-scrollbar-thumb { background: #dc2626; border-radius: 3px; }
        .generated-pin-card { background: #f8f9fa; border-radius: 12px; padding: 16px; margin-bottom: 12px; border-left: 4px solid #dc2626; }
        .generated-pin-label { font-size: 14px; font-weight: 600; color: #666; margin-bottom: 12px; }
        .pin-data-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
        .pin-data-row:last-child { margin-bottom: 0; }
        .pin-data-label { font-size: 13px; font-weight: 500; color: #666; }
        .pin-value { font-size: 18px; font-weight: 700; color: #dc2626; letter-spacing: 2px; }
        .serial-value { font-size: 14px; font-weight: 600; color: #333; }
        .no-pins-card { background: #fff3cd; border-radius: 12px; padding: 16px; border-left: 4px solid #ff8c00; }
        .no-pins-text { color: #856404; font-size: 14px; text-align: center; line-height: 20px; margin: 0; }
        .success-actions { display: flex; flex-direction: column; gap: 10px; }
        .action-btn { width: 100%; padding: 14px; border-radius: 8px; font-size: 15px; font-weight: 600; cursor: pointer; transition: all 0.2s; border: none; }
        .action-btn.primary { background: #dc2626; color: white; }
        .action-btn.primary:hover { background: #b91c1c; transform: translateY(-1px); box-shadow: 0 4px 12px rgba(220, 38, 38, 0.3); }
        .action-btn.secondary { background: white; color: #6b7280; border: 1px solid #e5e7eb; }
        .action-btn.secondary:hover { background: #f9fafb; color: #1f2937; }
        @media (max-width: 768px) { .page-container { padding: 12px; } .page-title { font-size: 18px; } .card { padding: 16px; } .modal-content { padding: 24px 20px; } .success-title { font-size: 20px; } .pin-modal-title { font-size: 20px; } .tab { font-size: 14px; padding: 10px; } }
        @media (max-width: 480px) { .denomination-grid { gap: 8px; } .denomination-btn { min-width: 48%; font-size: 13px; padding: 10px 16px; } .success-icon { width: 56px; height: 56px; font-size: 28px; } .pin-dots { gap: 12px; padding: 20px; } .pin-dot { width: 14px; height: 14px; } }
      `}</style>
    </div>
  );
}