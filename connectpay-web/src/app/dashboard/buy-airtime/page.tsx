'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import apiClient, { storage } from '@/lib/api';
import { AirtimeSuccessModal } from '@/components/SuccessModal/page';

export default function BuyAirtimePage() {
  const router = useRouter();
  const { user: contextUser, isAuthenticated } = useAuth();
  const [selectedNetwork, setSelectedNetwork] = useState('');
  const [amount, setAmount] = useState('');
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [balance, setBalance] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
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

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Extract balance helper
  const extractBalance = (balanceData: any): number => {
    if (balanceData === null || balanceData === undefined) return 0;
    if (typeof balanceData === 'number') return balanceData;
    if (typeof balanceData === 'object') {
      const balance = balanceData.amount || balanceData.balance || balanceData.current || balanceData.value || 0;
      return parseFloat(balance) || 0;
    }
    return parseFloat(balanceData) || 0;
  };

  // Fetch balance from API
  const fetchBalance = async () => {
    try {
      const response = await apiClient.get('/balance');
      
      if (response.data?.success && response.data?.balance && isMountedRef.current) {
        const balanceValue = extractBalance(response.data.balance);
        setBalance(balanceValue);
      }
    } catch (error: any) {
      console.error('Error fetching balance:', error);
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchBalance();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto-focus PIN input when modal opens
  useEffect(() => {
    if (showPinModal) {
      setTimeout(() => {
        pinInputRef.current?.focus();
      }, 100);
    }
  }, [showPinModal]);

  const handleNetworkSelect = (networkId: string) => {
    setSelectedNetwork(networkId);
    setDropdownOpen(false);
  };

  const handleProceedToPinEntry = () => {
    if (!selectedNetwork || !amount || !phone) {
      alert('Please fill in all fields');
      return;
    }
    if (phone.length !== 11) {
      alert('Phone number must be 11 digits');
      return;
    }
    const amountNum = parseFloat(amount);
    if (amountNum < 50) {
      alert('Minimum amount is ₦50');
      return;
    }
    if (amountNum > 100000) {
      alert('Maximum amount is ₦100,000');
      return;
    }
    if (amountNum > balance) {
      alert(`Insufficient balance. Available: ₦${balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
      return;
    }

    // Show PIN modal
    setPin('');
    setPinError('');
    setShowPinModal(true);
  };

  const handleBuyAirtime = async () => {
    try {
      // Validate PIN first
      if (pin.length !== 4) {
        setPinError('Please enter a 4-digit PIN');
        return;
      }

      setIsProcessing(true);
      setPinError('');

      const amountNum = parseFloat(amount);

      // 🔍 DIAGNOSTIC LOGGING
      console.log('=== PURCHASE DEBUG INFO ===');
      console.log('🔑 Token in localStorage:', storage.getItem('userToken') ? 'EXISTS ✅' : 'MISSING ❌');
      console.log('👤 User from context:', contextUser);
      console.log('🔐 Is authenticated:', isAuthenticated);
      console.log('📤 Payload:', {
        type: 'airtime',
        network: selectedNetwork,
        phone: phone,
        amount: amountNum,
        pin: pin ? '****' : 'empty',
      });
      console.log('========================');
      
      const response = await apiClient.post('/purchase', {
        type: 'airtime',
        network: selectedNetwork,
        phone: phone,
        amount: amountNum,
        pin: pin,
      });

      console.log('📥 Purchase response:', response.data);

      if (response.data?.success) {
        // Success! Show success modal
        const networkName = networks.find(n => n.id === selectedNetwork)?.label || selectedNetwork.toUpperCase();
        
        setSuccessData({
          transaction: response.data.transaction || {},
          networkName,
          phone,
          amount: response.data.transaction?.amount || amountNum,
          newBalance: response.data.newBalance || response.data.balance
        });

        // Refresh balance
        if (response.data.newBalance !== undefined) {
          const newBalanceValue = extractBalance(response.data.newBalance);
          setBalance(newBalanceValue);
        } else if (response.data.balance !== undefined) {
          const newBalanceValue = extractBalance(response.data.balance);
          setBalance(newBalanceValue);
        } else {
          // Fallback: refresh from API
          await fetchBalance();
        }

        // Reset form
        setPhone('');
        setAmount('');
        setSelectedNetwork('');
        setPin('');

        // Close PIN modal and show success modal
        setShowPinModal(false);
        setTimeout(() => {
          setShowSuccessModal(true);
        }, 200);
      } else {
        // API returned success: false
        setPinError(response.data?.message || 'Transaction failed. Please try again.');
      }

    } catch (error: any) {
      console.error('❌ Purchase error:', error);
      
      // Handle different error types
      if (error.response?.data?.message) {
        setPinError(error.response.data.message);
      } else if (error.message) {
        setPinError(error.message);
      } else {
        setPinError('Unable to process payment. Please try again.');
      }
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

  const handleBuyMoreAirtime = () => {
    setShowSuccessModal(false);
    setSuccessData(null);
  };

  if (isLoading) {
    return (
      <div className="page-container">
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          minHeight: '400px',
          flexDirection: 'column',
          gap: '16px'
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            border: '4px solid #e5e7eb',
            borderTopColor: '#dc2626',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}></div>
          <p style={{ color: '#6b7280', fontSize: '14px', fontWeight: '500' }}>Loading...</p>
        </div>
        <style jsx>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="page-container">
      {/* Page Header */}
      <div className="page-header">
        <h1 className="page-title">BUY AIRTIME</h1>
        <div className="breadcrumb">
          <span className="breadcrumb-link" onClick={() => router.push('/dashboard')}>Dashboard</span>
          <span className="breadcrumb-separator">/</span>
          <span className="breadcrumb-current">Airtime</span>
        </div>
      </div>

      {/* Main Card */}
      <div className="card">
        {/* Wallet Balance Badge */}
        <div className="wallet-badge">
          <span>Wallet Bal.: ₦{balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>

        {/* Purchase Form */}
        <div className="form">
          {/* Network Selection - Custom Dropdown */}
          <div className="form-group">
            <label htmlFor="network">Select Network</label>
            <div className="custom-select-wrapper" ref={dropdownRef}>
              <div 
                className="custom-select-trigger"
                onClick={() => setDropdownOpen(!dropdownOpen)}
              >
                <span className={selectedNetwork ? 'selected' : 'placeholder'}>
                  {selectedNetwork 
                    ? networks.find(n => n.id === selectedNetwork)?.label 
                    : '----------'}
                </span>
                <ChevronDown 
                  size={16} 
                  className={`dropdown-icon ${dropdownOpen ? 'open' : ''}`}
                />
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

          {/* Amount Input */}
          <div className="form-group">
            <label htmlFor="amount">Airtime Amount(₦):</label>
            <input
              id="amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g 50"
              min="50"
              max="100000"
              className="text-input"
              disabled={isProcessing}
            />
          </div>

          {/* Phone Number Input */}
          <div className="form-group">
            <label htmlFor="phone">Receiver's Phone No. (without space):</label>
            <input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
              placeholder="e.g 08012345678"
              maxLength={11}
              className="text-input"
              disabled={isProcessing}
            />
          </div>
        </div>

        {/* Submit Button */}
        <button 
          onClick={handleProceedToPinEntry} 
          className="submit-btn"
          disabled={isProcessing}
        >
          Continue
        </button>

        {/* Check Airtime Balance Section */}
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
              onClick={handleBuyAirtime} 
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

    {/* Success Modal */}
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
      <style jsx>{`
        .page-container {
          padding: 16px 24px;
          max-width: 1200px;
          margin: 0 auto;
        }

        .page-header {
          margin-bottom: 20px;
        }

        .page-title {
          font-size: 20px;
          font-weight: 700;
          color: #dc2626;
          margin: 0 0 8px 0;
          letter-spacing: 0.3px;
        }

        .breadcrumb {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 14px;
        }

        .breadcrumb-link {
          color: #6b7280;
          font-weight: 500;
          cursor: pointer;
          transition: color 0.2s;
        }

        .breadcrumb-link:hover {
          color: #dc2626;
        }

        .breadcrumb-separator {
          color: #9ca3af;
          font-weight: 400;
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
          margin-bottom: 16px;
          display: inline-block;
        }

        .wallet-badge span {
          font-size: 13px;
          font-weight: 700;
          color: #16a34a;
        }

        .form {
          display: flex;
          flex-direction: column;
          gap: 16px;
          margin-bottom: 16px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
        }

        .form-group label {
          font-size: 14px;
          font-weight: 600;
          color: #374151;
          margin-bottom: 8px;
        }

        /* Custom Select Styles */
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
          transition: all 0.2s;
          display: flex;
          justify-content: space-between;
          align-items: center;
          user-select: none;
        }

        .custom-select-trigger:hover {
          border-color: #9ca3af;
        }

        .custom-select-trigger:active,
        .custom-select-trigger.active {
          border-color: #dc2626;
          box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.1);
        }

        .custom-select-trigger .placeholder {
          color: #9ca3af;
          font-weight: 400;
        }

        .custom-select-trigger .selected {
          color: #1f2937;
          font-weight: 500;
        }

        .dropdown-icon {
          transition: transform 0.2s;
          color: #1f2937;
          flex-shrink: 0;
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
          max-height: 200px;
          overflow-y: auto;
          animation: dropdownSlide 0.2s ease-out;
        }

        @keyframes dropdownSlide {
          from {
            opacity: 0;
            transform: translateY(-8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .custom-select-option {
          padding: 12px 14px;
          font-size: 15px;
          color: #1f2937;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s;
          user-select: none;
        }

        .custom-select-option:hover {
          background: #fef2f2;
          color: #dc2626;
        }

        .custom-select-option.selected {
          background: #dc2626;
          color: white;
          font-weight: 600;
        }

        .custom-select-option.selected:hover {
          background: #b91c1c;
          color: white;
        }

        .custom-select-dropdown::-webkit-scrollbar {
          width: 6px;
        }

        .custom-select-dropdown::-webkit-scrollbar-track {
          background: #f3f4f6;
          border-radius: 3px;
        }

        .custom-select-dropdown::-webkit-scrollbar-thumb {
          background: #dc2626;
          border-radius: 3px;
        }

        .custom-select-dropdown::-webkit-scrollbar-thumb:hover {
          background: #b91c1c;
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
        }

        .text-input:hover {
          border-color: #9ca3af;
        }

        .text-input:focus {
          outline: none;
          border-color: #dc2626;
          box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.1);
        }

        .text-input:disabled {
          background: #f3f4f6;
          cursor: not-allowed;
        }

        .text-input::placeholder {
          color: #9ca3af;
          font-weight: 400;
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
          margin-bottom: 24px;
        }

        .submit-btn:hover:not(:disabled) {
          background: #b91c1c;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(220, 38, 38, 0.3);
        }

        .submit-btn:active:not(:disabled) {
          transform: translateY(0);
        }

        .submit-btn:disabled {
          background: #d1d5db;
          cursor: not-allowed;
          transform: none;
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
        }

        .cancel-btn:hover:not(:disabled) {
          background: #f9fafb;
          color: #1f2937;
        }

        .cancel-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        /* Check Airtime Balance Section */
        .balance-check-section {
          margin-top: 24px;
        }

        .balance-check-card {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 16px;
          transition: all 0.2s;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
        }

        .balance-check-card:hover {
          border-color: #dc2626;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(220, 38, 38, 0.1);
        }

        .balance-check-title {
          font-size: 14px;
          font-weight: 600;
          color: #374151;
          margin: 0 0 12px 0;
          text-align: center;
          letter-spacing: 0.5px;
        }

        .balance-check-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
        }

        .balance-check-label {
          font-size: 13px;
          font-weight: 500;
          color: #6b7280;
          margin: 0;
        }

        .balance-check-code {
          font-size: 20px;
          font-weight: 700;
          color: #dc2626;
          background: #fef2f2;
          padding: 10px 16px;
          border-radius: 6px;
          border: 1px solid #fecaca;
          width: 100%;
          text-align: center;
          letter-spacing: 1px;
          font-family: 'Courier New', monospace;
        }

        /* PIN Modal */
        .pin-modal-content {
          max-width: 400px;
        }

        .pin-modal-title {
          font-size: 22px;
          font-weight: 700;
          color: #1f2937;
          text-align: center;
          margin: 0 0 8px 0;
        }

        .pin-modal-subtitle {
          font-size: 14px;
          color: #6b7280;
          text-align: center;
          margin: 0 0 24px 0;
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
          letter-spacing: 12px;
          font-weight: 600;
          transition: all 0.2s;
          opacity: 0;
          position: absolute;
          top: 0;
          left: 0;
        }

        .pin-input:focus {
          outline: none;
          border-color: #dc2626;
          box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.1);
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
          animation: shake 0.3s;
        }

        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }

        .pin-error-message {
          background: #fef2f2;
          color: #dc2626;
          padding: 12px;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          text-align: center;
          margin-bottom: 16px;
          border: 1px solid #fecaca;
        }

        /* Success Modal */
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
          animation: fadeIn 0.2s ease-out;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        .modal-content {
          background: white;
          border-radius: 16px;
          padding: 32px 24px;
          max-width: 500px;
          width: 100%;
          position: relative;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
          animation: slideUp 0.3s ease-out;
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
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
          transition: all 0.2s;
          color: #6b7280;
        }

        .modal-close:hover {
          background: #e5e7eb;
          color: #1f2937;
        }

        .modal-close:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        @media (max-width: 768px) {
          .page-container {
            padding: 12px;
          }

          .page-title {
            font-size: 18px;
          }

          .card {
            padding: 16px;
          }

          .balance-check-code {
            font-size: 18px;
            padding: 8px 12px;
          }

          .modal-content {
            padding: 24px 20px;
          }

         
          .pin-modal-title {
            font-size: 20px;
          }
        }

        @media (max-width: 480px) {
          .balance-check-code {
            font-size: 16px;
          }

          .pin-dots {
            gap: 12px;
            padding: 20px;
          }

          .pin-dot {
            width: 14px;
            height: 14px;
          }
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}