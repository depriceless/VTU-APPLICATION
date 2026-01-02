'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, RefreshCw } from 'lucide-react';

import apiClient from '@/lib/api';

interface ExamCard {
  id: string;
  name: string;
  code: string;
  price: number;
  description: string;
  examBody: string;
  validity: string;
  category: string;
}

export default function BuyNabteb() {
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);
  const [selectedExam, setSelectedExam] = useState<ExamCard | null>(null);
  const [quantity, setQuantity] = useState('1');
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [balance, setBalance] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);
  const [isLoadingPackages, setIsLoadingPackages] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [pinError, setPinError] = useState('');
  const [successData, setSuccessData] = useState<any>(null);
  const [examCards, setExamCards] = useState<ExamCard[]>([]);
  const pinInputRef = useRef<HTMLInputElement>(null);

  const quantityNum = parseInt(quantity) || 1;
  const totalAmount = selectedExam ? selectedExam.price * quantityNum : 0;
  const isQuantityValid = quantityNum >= 1 && quantityNum <= 10;
  const isPhoneValid = phone.length === 11 && /^0[789][01]\d{8}$/.test(phone);
  const hasEnoughBalance = totalAmount <= balance;
  const canProceed = selectedExam && isQuantityValid && hasEnoughBalance && isPhoneValid;
  const isPinValid = pin.length === 4 && /^\d{4}$/.test(pin);

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
      if (response.data?.success && response.data.balance) {
        setBalance(extractBalance(response.data.balance));
      }
    } catch (error: any) {
      console.error('Error fetching balance:', error);
    } finally {
      setIsLoadingBalance(false);
    }
  };

  const fetchEducationPackages = async () => {
    setIsLoadingPackages(true);
    try {
      const response = await apiClient.get('/purchase/education/packages');
      
      if (response.data?.success && response.data.data) {
        const transformedCards: ExamCard[] = [];
        const packagesData = response.data.data;

        // Process ONLY NABTEB packages
        if (packagesData.nabteb && Array.isArray(packagesData.nabteb)) {
          packagesData.nabteb.forEach((pkg: any) => {
            transformedCards.push({
              id: pkg.id || pkg.code,
              name: pkg.name,
              code: pkg.code,
              price: pkg.price,
              description: pkg.description || pkg.name,
              examBody: 'NABTEB',
              validity: pkg.validity || '1 year',
              category: 'secondary'
            });
          });
        }

        setExamCards(transformedCards);
      }
    } catch (error: any) {
      console.error('Error fetching packages:', error);
      alert('Failed to load NABTEB packages. Please refresh the page.');
    } finally {
      setIsLoadingPackages(false);
    }
  };

  useEffect(() => {
    fetchBalance().finally(() => setIsLoading(false));
    fetchEducationPackages();
  }, []);

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

  const handleQuantityChange = (text: string) => {
    if (text === '') {
      setQuantity('');
      return;
    }
    const numericValue = text.replace(/[^0-9]/g, '');
    if (numericValue === '' || numericValue === '0') {
      setQuantity('1');
    } else if (parseInt(numericValue) > 10) {
      setQuantity('10');
    } else {
      setQuantity(numericValue);
    }
  };

  const handleProceedToPinEntry = () => {
    setPin('');
    setPinError('');
    setShowPinModal(true);
  };

  const handleBuyEducation = async () => {
    if (!isPinValid) {
      setPinError('PIN must be exactly 4 digits');
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
        type: 'education',
        provider: selectedExam?.examBody.toUpperCase(),
        examType: selectedExam?.code,
        phone: phone,
        amount: totalAmount,
        quantity: quantityNum,
        pin: pin,
      });

      if (response.data?.success) {
        setSuccessData({
          transaction: response.data.transaction || {},
          examName: selectedExam?.name || 'Exam Card',
          quantity: quantityNum,
          amount: response.data.transaction?.amount || totalAmount,
          newBalance: response.data.newBalance || response.data.balance,
          pins: response.data.pins || response.data.transaction?.pins || []
        });

        if (response.data.newBalance !== undefined) {
          setBalance(extractBalance(response.data.newBalance));
        } else if (response.data.balance !== undefined) {
          setBalance(extractBalance(response.data.balance));
        } else {
          await fetchBalance();
        }

        setPhone('');
        setSelectedExam(null);
        setQuantity('1');
        setPin('');
        setCurrentStep(1);

        setShowPinModal(false);
        setTimeout(() => setShowSuccessModal(true), 200);
      } else {
        setPinError(response.data?.message || 'Transaction failed. Please try again.');
      }
    } catch (error: any) {
      console.error('Payment error:', error);
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

  const handleBuyMore = () => {
    setShowSuccessModal(false);
    setSuccessData(null);
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
        <h1 className="page-title">BUY NABTEB PINS</h1>
        <div className="breadcrumb">
          <span className="breadcrumb-link">Dashboard</span>
          <span className="breadcrumb-separator">/</span>
          <span className="breadcrumb-current">NABTEB</span>
        </div>
      </div>

      {currentStep === 1 ? (
        <div className="card">
          <div className="balance-header">
            <div className="wallet-badge">
              <span>Wallet Balance: ₦{balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <button className="refresh-btn" onClick={fetchBalance} disabled={isLoadingBalance}>
              <RefreshCw size={16} className={isLoadingBalance ? 'spinning' : ''} />
            </button>
          </div>

          {/* Exam Selection */}
          <div className="form-section">
            <label className="section-label">Select NABTEB Exam Card</label>
            {isLoadingPackages ? (
              <div className="loading-plans">
                <div className="spinner-small"></div>
                <span>Loading NABTEB packages...</span>
              </div>
            ) : examCards.length === 0 ? (
              <div className="empty-state">No NABTEB packages available</div>
            ) : (
              <div className="exam-grid">
                {examCards.map((exam) => (
                  <div
                    key={exam.id}
                    className={`exam-card ${selectedExam?.id === exam.id ? 'selected' : ''}`}
                    onClick={() => setSelectedExam(exam)}
                  >
                    <div className="exam-info">
                      <div className="exam-name">{exam.name}</div>
                      <div className="exam-desc">{exam.description}</div>
                      <div className="exam-validity">⏱ {exam.validity}</div>
                    </div>
                    <div className="exam-price">₦{exam.price.toLocaleString()}</div>
                    {selectedExam?.id === exam.id && <div className="exam-check">✓</div>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quantity */}
          {selectedExam && (
            <div className="form-section">
              <label className="section-label">Quantity (Max 10)</label>
              <div className="quantity-container">
                <button
                  className="quantity-btn"
                  onClick={() => quantityNum > 1 && setQuantity((quantityNum - 1).toString())}
                  disabled={quantityNum <= 1}
                >
                  -
                </button>
                <input
                  type="text"
                  className="quantity-input"
                  value={quantity}
                  onChange={(e) => handleQuantityChange(e.target.value)}
                  maxLength={2}
                />
                <button
                  className="quantity-btn"
                  onClick={() => quantityNum < 10 && setQuantity((quantityNum + 1).toString())}
                  disabled={quantityNum >= 10}
                >
                  +
                </button>
              </div>
            </div>
          )}

          {/* Phone Number */}
          {selectedExam && (
            <div className="form-section">
              <label className="section-label">Recipient Phone Number</label>
              <input
                type="tel"
                className="text-input"
                placeholder="08012345678"
                maxLength={11}
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
              />
              <div className="input-help">PIN details will be sent to this number via SMS</div>
              {phone !== '' && !isPhoneValid && (
                <div className="validation-error">Enter valid 11-digit number starting with 070, 080, 081, or 090</div>
              )}
              {phone !== '' && isPhoneValid && (
                <div className="validation-success">✓ Valid phone number</div>
              )}
            </div>
          )}

          {/* Total Amount */}
          {selectedExam && quantity && (
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
              <span>Exam Card</span>
              <span>{selectedExam?.name}</span>
            </div>
            <div className="summary-row">
              <span>Description</span>
              <span>{selectedExam?.description}</span>
            </div>
            <div className="summary-row">
              <span>Phone Number</span>
              <span>{phone}</span>
            </div>
            <div className="summary-row">
              <span>Unit Price</span>
              <span>₦{selectedExam?.price.toLocaleString()}</span>
            </div>
            <div className="summary-row">
              <span>Quantity</span>
              <span>{quantity} card{quantityNum > 1 ? 's' : ''}</span>
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

          <button className="submit-btn" disabled={!hasEnoughBalance} onClick={handleProceedToPinEntry}>
            {hasEnoughBalance ? 'Proceed to Payment' : 'Insufficient Balance'}
          </button>
          <button className="secondary-btn" onClick={() => setCurrentStep(1)}>Back to Form</button>
        </div>
      )}

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
                  setPin(e.target.value.replace(/\D/g, ''));
                  setPinError('');
                }}
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

            <button className="submit-btn" disabled={!isPinValid || isProcessing} onClick={handleBuyEducation}>
              {isProcessing ? 'Processing...' : 'Confirm Purchase'}
            </button>
            <button className="cancel-btn" onClick={handleClosePinModal} disabled={isProcessing}>Cancel</button>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && successData && (
        <div className="modal-overlay" onClick={handleCloseSuccessModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={handleCloseSuccessModal}>
              <X size={24} />
            </button>
            <div className="success-icon">✓</div>
            <h2 className="success-title">Purchase Successful!</h2>

            <div className="success-details">
              <div className="detail-row">
                <span className="detail-label">Exam Card:</span>
                <span className="detail-value">{successData.examName}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Quantity:</span>
                <span className="detail-value">{successData.quantity} card{successData.quantity > 1 ? 's' : ''}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Phone Number:</span>
                <span className="detail-value">{phone}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Amount Paid:</span>
                <span className="detail-value">₦{successData.amount.toLocaleString()}</span>
              </div>
              
              {successData.pins && successData.pins.length > 0 && (
                <div className="pins-section">
                  <div className="pins-header">Generated PINs</div>
                  {successData.pins.map((pinData: any, index: number) => (
                    <div key={index} className="pin-card">
                      <div className="pin-card-title">Card #{index + 1}</div>
                      <div className="pin-row">
                        <span>PIN:</span>
                        <span className="pin-code">{pinData.pin || 'N/A'}</span>
                      </div>
                      {pinData.serial && (
                        <div className="pin-row">
                          <span>Serial:</span>
                          <span className="pin-serial">{pinData.serial}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {successData.transaction?.reference && (
                <div className="detail-row">
                  <span className="detail-label">Reference:</span>
                  <span className="detail-value">{successData.transaction.reference}</span>
                </div>
              )}
              {successData.newBalance !== undefined && (
                <div className="detail-row highlight">
                  <span className="detail-label">New Balance:</span>
                  <span className="detail-value">₦{extractBalance(successData.newBalance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              )}
            </div>

            <div className="success-actions">
              <button className="action-btn primary" onClick={handleBuyMore}>Buy More</button>
              <button className="action-btn secondary" onClick={handleCloseSuccessModal}>Close</button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .page-container { padding: 16px 24px; max-width: 1200px; margin: 0 auto; }
        .page-header { margin-bottom: 20px; }
        .page-title { font-size: 20px; font-weight: 700; color: #dc2626; margin: 0 0 8px 0; }
        .breadcrumb { display: flex; align-items: center; gap: 6px; font-size: 14px; }
        .breadcrumb-link { color: #6b7280; font-weight: 500; cursor: pointer; }
        .breadcrumb-separator { color: #9ca3af; }
        .breadcrumb-current { color: #1f2937; font-weight: 500; }
        .card { background: white; border-radius: 10px; padding: 20px; box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05); border: 1px solid #e5e7eb; max-width: 700px; margin: 0 auto; }
        .balance-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
        .wallet-badge { background: white; border: 1px solid #d1d5db; padding: 10px 14px; border-radius: 6px; flex: 1; }
        .wallet-badge span { font-size: 13px; font-weight: 700; color: #16a34a; }
        .refresh-btn { background: #f3f4f6; border: 1px solid #d1d5db; border-radius: 6px; padding: 10px; cursor: pointer; margin-left: 8px; }
        .refresh-btn:disabled { opacity: 0.5; }
        .spinning { animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .form-section { margin-bottom: 20px; }
        .section-label { display: block; font-size: 14px; font-weight: 600; color: #374151; margin-bottom: 10px; }
        .loading-plans { display: flex; align-items: center; justify-content: center; gap: 8px; padding: 20px; color: #6b7280; }
        .spinner-small { width: 16px; height: 16px; border: 2px solid #e5e7eb; border-top-color: #dc2626; border-radius: 50%; animation: spin 1s linear infinite; }
        .empty-state { padding: 40px; text-align: center; color: #9ca3af; font-size: 14px; }
        .exam-grid { display: flex; flex-direction: column; gap: 10px; }
        .exam-card { background: #fafafa; border: 2px solid #e5e7eb; border-radius: 10px; padding: 14px; cursor: pointer; transition: all 0.2s; display: flex; justify-content: space-between; align-items: center; position: relative; }
        .exam-card:hover { border-color: #fca5a5; background: #fef2f2; }
        .exam-card.selected { border-color: #dc2626; background: #fef2f2; }
        .exam-info { flex: 1; }
        .exam-name { font-size: 15px; font-weight: 600; color: #1f2937; margin-bottom: 4px; }
        .exam-desc { font-size: 12px; color: #6b7280; margin-bottom: 4px; }
        .exam-validity { font-size: 11px; color: #9ca3af; }
        .exam-price { font-size: 16px; font-weight: 700; color: #16a34a; margin-left: 16px; }
        .exam-check { position: absolute; top: 8px; right: 8px; width: 20px; height: 20px; border-radius: 50%; background: #dc2626; color: white; display: flex; align-items: center; justify-content: center; font-size: 12px; }
        .quantity-container { display: flex; align-items: center; gap: 12px; }
        .quantity-btn { width: 40px; height: 40px; border-radius: 50%; background: #dc2626; color: white; border: none; font-size: 18px; font-weight: 600; cursor: pointer; }
        .quantity-btn:disabled { background: #d1d5db; cursor: not-allowed; }
        .quantity-input { width: 60px; height: 40px; text-align: center; border: 2px solid #d1d5db; border-radius: 6px; font-size: 16px; font-weight: 600; color: #1f2937; background: white; outline: none; }
        .quantity-input:focus { border-color: #dc2626; box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.1); }
        .quantity-input::-webkit-inner-spin-button, .quantity-input::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
        .text-input { width: 100%; padding: 12px 14px; font-size: 15px; border: 1px solid #d1d5db; border-radius: 6px; color: #1f2937; font-weight: 500; }
        .text-input:focus { outline: none; border-color: #dc2626; box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.1); }
        .input-help { font-size: 12px; color: #999; margin-top: 6px; }
        .validation-error { margin-top: 8px; color: #dc2626; font-size: 13px; font-weight: 500; }
        .validation-success { margin-top: 8px; padding: 6px 12px; background: #dcfce7; border-radius: 6px; color: #16a34a; font-size: 13px; font-weight: 500; display: inline-block; }
        .total-amount { font-size: 28px; font-weight: 700; color: #dc2626; margin-top: 4px; }
        .insufficient-warning { margin-top: 12px; padding: 10px; background: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; color: #dc2626; font-size: 13px; font-weight: 500; text-align: center; }
        .submit-btn { width: 100%; padding: 14px; background: #dc2626; color: white; font-size: 16px; font-weight: 600; border: none; border-radius: 6px; cursor: pointer; margin-top: 8px; }
        .submit-btn:hover:not(:disabled) { background: #b91c1c; }
        .submit-btn:disabled { background: #d1d5db; cursor: not-allowed; }
        .secondary-btn { width: 100%; padding: 14px; background: white; color: #6b7280; font-size: 16px; font-weight: 600; border: 1px solid #e5e7eb; border-radius: 6px; cursor: pointer; margin-top: 12px; }
        .review-title { font-size: 18px; font-weight: 700; color: #1f2937; margin: 0 0 16px 0; }
        .summary-card { background: #f9fafb; border-radius: 10px; padding: 16px; margin-bottom: 16px; }
        .summary-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; font-size: 14px; }
        .summary-row:last-child { border-bottom: none; }
        .summary-row span:first-child { color: #6b7280; font-weight: 500; }
        .summary-row span:last-child { color: #1f2937; font-weight: 600; }
        .summary-divider { height: 1px; background: #e5e7eb; margin: 12px 0; }
        .summary-row.total { padding: 16px; background: #fef2f2; margin: 12px -16px -16px; border-radius: 0 0 10px 10px; }
        .summary-row.total span:first-child { font-size: 15px; font-weight: 600; }
        .summary-row.total span:last-child { color: #dc2626; font-size: 24px; font-weight: 700; }
        .loading-container { display: flex; justify-content: center; align-items: center; min-height: 400px; flex-direction: column; gap: 16px; }
        .spinner { width: 48px; height: 48px; border: 4px solid #e5e7eb; border-top-color: #dc2626; border-radius: 50%; animation: spin 1s linear infinite; }
        .loading-text { color: #6b7280; font-size: 14px; }
        .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.5); display: flex; align-items: center; justify-content: center; z-index: 9999; padding: 16px; animation: fadeIn 0.2s ease-out; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .modal-content { background: white; border-radius: 16px; padding: 32px 24px; max-width: 500px; width: 100%; position: relative; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1); animation: slideUp 0.3s ease-out; }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .pin-modal-content { max-width: 400px; }
        .modal-close { position: absolute; top: 16px; right: 16px; background: #f3f4f6; border: none; border-radius: 8px; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #6b7280; }
        .modal-close:hover { background: #e5e7eb; }
        .modal-close:disabled { opacity: 0.5; cursor: not-allowed; }
        .pin-modal-title { font-size: 22px; font-weight: 700; color: #1f2937; text-align: center; margin: 0 0 8px 0; }
        .pin-modal-subtitle { font-size: 14px; color: #6b7280; text-align: center; margin: 0 0 24px 0; }
        .pin-input-container { position: relative; margin-bottom: 20px; }
        .pin-input { width: 100%; padding: 16px; font-size: 24px; text-align: center; border: 2px solid #d1d5db; border-radius: 8px; letter-spacing: 12px; font-weight: 600; opacity: 0; position: absolute; top: 0; left: 0; }
        .pin-input:focus { outline: none; border-color: #dc2626; }
        .pin-dots { display: flex; justify-content: center; gap: 16px; padding: 24px; background: #f9fafb; border-radius: 8px; border: 2px solid #d1d5db; }
        .pin-dot { width: 16px; height: 16px; border-radius: 50%; background: #e5e7eb; transition: all 0.2s; }
        .pin-dot.filled { background: #dc2626; transform: scale(1.1); }
        .pin-dot.error { background: #ef4444; animation: shake 0.3s; }
        @keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-4px); } 75% { transform: translateX(4px); } }
        .pin-error-message { background: #fef2f2; color: #dc2626; padding: 12px; border-radius: 6px; font-size: 14px; font-weight: 500; text-align: center; margin-bottom: 16px; border: 1px solid #fecaca; }
        .cancel-btn { width: 100%; padding: 14px; background: white; color: #6b7280; font-size: 16px; font-weight: 600; border: 1px solid #e5e7eb; border-radius: 6px; cursor: pointer; margin-top: 12px; }
        .cancel-btn:hover:not(:disabled) { background: #f9fafb; }
        .cancel-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .success-icon { width: 64px; height: 64px; border-radius: 50%; background: #dcfce7; color: #16a34a; font-size: 32px; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; font-weight: 700; }
        .success-title { font-size: 24px; font-weight: 700; color: #1f2937; text-align: center; margin: 0 0 24px 0; }
        .success-details { background: #f9fafb; border-radius: 12px; padding: 20px; margin-bottom: 24px; max-height: 400px; overflow-y: auto; }
        .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
        .detail-row:last-child { border-bottom: none; }
        .detail-row.highlight { background: #fef2f2; margin: 12px -12px -12px; padding: 14px 12px; border-radius: 0 0 8px 8px; border-bottom: none; }
        .detail-label { font-size: 14px; color: #6b7280; font-weight: 500; }
        .detail-value { font-size: 14px; color: #1f2937; font-weight: 600; }
        .detail-row.highlight .detail-value { color: #dc2626; font-size: 16px; }
        .pins-section { margin-top: 16px; padding-top: 16px; border-top: 1px solid #e5e7eb; }
        .pins-header { font-size: 15px; font-weight: 600; color: #1f2937; margin-bottom: 12px; }
        .pin-card { background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; margin-bottom: 8px; border-left: 4px solid #dc2626; }
        .pin-card-title { font-size: 13px; font-weight: 600; color: #666; margin-bottom: 8px; }
        .pin-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; font-size: 13px; }
        .pin-row:last-child { margin-bottom: 0; }
        .pin-row span:first-child { color: #6b7280; font-weight: 500; }
        .pin-code { font-size: 16px; font-weight: 700; color: #dc2626; letter-spacing: 1px; }
        .pin-serial { font-size: 13px; font-weight: 600; color: #1f2937; }
        .success-actions { display: flex; flex-direction: column; gap: 10px; }
        .action-btn { width: 100%; padding: 14px; border-radius: 8px; font-size: 15px; font-weight: 600; cursor: pointer; border: none; }
        .action-btn.primary { background: #dc2626; color: white; }
        .action-btn.primary:hover { background: #b91c1c; transform: translateY(-1px); box-shadow: 0 4px 12px rgba(220, 38, 38, 0.3); }
        .action-btn.secondary { background: white; color: #6b7280; border: 1px solid #e5e7eb; }
        .action-btn.secondary:hover { background: #f9fafb; }
        @media (max-width: 768px) {
          .page-container { padding: 12px; }
          .page-title { font-size: 18px; }
          .card { padding: 16px; }
          .modal-content { padding: 24px 20px; }
          .success-title { font-size: 20px; }
          .pin-modal-title { font-size: 20px; }
        }
        @media (max-width: 480px) {
          .success-icon { width: 56px; height: 56px; font-size: 28px; }
          .pin-dots { gap: 12px; padding: 20px; }
          .pin-dot { width: 14px; height: 14px; }
          .exam-grid { gap: 8px; }
        }
      `}</style>
    </div>
  );
}