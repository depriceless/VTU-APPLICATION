'use client';

import React, { useState, useEffect } from 'react';
import { Shield, Lock, Eye, EyeOff, AlertCircle, CheckCircle, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import apiClient from '@/lib/api';

export default function TwoFactorAuthPage() {
  const router = useRouter();
  const { user: contextUser, isAuthenticated } = useAuth();
  
  const [showNewPin, setShowNewPin] = useState(false);
  const [showConfirmPin, setShowConfirmPin] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [recoveryWord, setRecoveryWord] = useState('');
  const [transactionPin, setTransactionPin] = useState('');
  const [transactionPinStatus, setTransactionPinStatus] = useState('Not-Set');
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);
  const [alert, setAlert] = useState({ show: false, type: '', message: '' });
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        console.log('🔍 Fetching user profile for 2FA page...');
        const response = await apiClient.get('/auth/profile');
        
        console.log('📥 Profile response:', response.data);

        if (response.data?.success) {
          setTransactionPinStatus(response.data.user.isPinSetup ? 'Set' : 'Not-Set');
        } else {
          showAlert('error', response.data?.message || 'Failed to fetch user profile');
        }
      } catch (error) {
        console.error('❌ Error fetching profile:', error);
        showAlert('error', 'Failed to load profile. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserProfile();
  }, []);

  const showAlert = (type, message) => {
    setAlert({ show: true, type, message });
    setTimeout(() => setAlert({ show: false, type: '', message: '' }), 4000);
  };

  const handleCreatePin = async () => {
    if (newPin.length !== 4) {
      showAlert('error', 'PIN must be exactly 4 digits');
      return;
    }

    if (newPin !== confirmPin) {
      showAlert('error', 'PINs do not match');
      return;
    }

    if (!recoveryWord.trim()) {
      showAlert('error', 'Please enter a recovery word');
      return;
    }

    const weakPins = ['0000', '1234', '1111', '2222', '3333', '4444', '5555', '6666', '7777', '8888', '9999', '4321'];
    if (weakPins.includes(newPin)) {
      showAlert('error', 'Please choose a stronger PIN. Avoid sequential numbers or repeated digits.');
      return;
    }

    try {
      setIsProcessing(true);

      console.log('🔐 Creating transaction PIN...');
      const response = await apiClient.post('/auth/setup-pin', {
        pin: newPin,
        confirmPin: confirmPin,
        recoveryWord: recoveryWord
      });

      console.log('📥 Setup PIN response:', response.data);

      if (response.data?.success) {
        setTransactionPinStatus('Set');
        setNewPin('');
        setConfirmPin('');
        setRecoveryWord('');
        showAlert('success', 'Transaction PIN created successfully!');
      } else {
        showAlert('error', response.data?.message || 'Failed to create PIN');
      }
    } catch (error) {
      console.error('❌ PIN setup error:', error);
      
      if (error.response?.data?.message) {
        showAlert('error', error.response.data.message);
      } else if (error.message) {
        showAlert('error', error.message);
      } else {
        showAlert('error', 'Failed to create PIN. Please try again.');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEnable2FA = async () => {
    if (transactionPin.length !== 4) {
      showAlert('error', 'Please enter your 4-digit transaction PIN');
      return;
    }

    try {
      setIsProcessing(true);

      console.log('🔐 Verifying PIN for 2FA...');
      const response = await apiClient.post('/auth/verify-pin', {
        pin: transactionPin
      });

      console.log('📥 Verify PIN response:', response.data);

      if (response.data?.success) {
        setIs2FAEnabled(!is2FAEnabled);
        setTransactionPin('');
        showAlert('success', `2-Factor Authentication ${!is2FAEnabled ? 'enabled' : 'disabled'} successfully!`);
      } else {
        showAlert('error', response.data?.message || 'Invalid PIN');
      }
    } catch (error) {
      console.error('❌ 2FA enable error:', error);
      
      if (error.response?.data?.message) {
        showAlert('error', error.response.data.message);
      } else if (error.message) {
        showAlert('error', error.message);
      } else {
        showAlert('error', 'Failed to verify PIN. Please try again.');
      }
    } finally {
      setIsProcessing(false);
    }
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
            borderTopColor: '#ff2b2b',
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
      {alert.show && (
        <div className="alert-notification">
          <div className={`alert-content ${alert.type}`}>
            {alert.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
            <span>{alert.message}</span>
          </div>
        </div>
      )}

      {/* Page Header */}
      <div className="page-header">
        <h1 className="page-title">SECURITY SETTINGS</h1>
        <div className="breadcrumb">
          <span className="breadcrumb-link" onClick={() => router.push('/dashboard')}>Dashboard</span>
          <span className="breadcrumb-separator">/</span>
          <span className="breadcrumb-current">2FA Security</span>
        </div>
      </div>

      {/* Create Transaction Pin Card */}
      <div className="card">
        <h2 className="card-title">Create Transaction Pin</h2>

        <div className="form">
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="newPin">New Pin</label>
              <div className="input-with-icon">
                <Lock size={18} className="input-icon" />
                <input
                  id="newPin"
                  type={showNewPin ? 'text' : 'password'}
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  maxLength={4}
                  placeholder="Create New Four (4) Digits Pin"
                  className="text-input"
                  disabled={isProcessing || transactionPinStatus === 'Set'}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPin(!showNewPin)}
                  className="eye-button"
                  disabled={isProcessing || transactionPinStatus === 'Set'}
                >
                  {showNewPin ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="confirmPin">Confirm New Pin</label>
              <div className="input-with-icon">
                <Lock size={18} className="input-icon" />
                <input
                  id="confirmPin"
                  type={showConfirmPin ? 'text' : 'password'}
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  maxLength={4}
                  placeholder="Confirm New Four (4) Digits Pin"
                  className="text-input"
                  disabled={isProcessing || transactionPinStatus === 'Set'}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPin(!showConfirmPin)}
                  className="eye-button"
                  disabled={isProcessing || transactionPinStatus === 'Set'}
                >
                  {showConfirmPin ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="recoveryWord">Create Recovery Word</label>
            <p className="recovery-note">
              Write out this word somewhere, it can only be used to reset your transaction pin if forgotten.
            </p>
            <input
              id="recoveryWord"
              type="text"
              value={recoveryWord}
              onChange={(e) => setRecoveryWord(e.target.value)}
              placeholder="e.g samdav"
              className="text-input-plain"
              disabled={isProcessing || transactionPinStatus === 'Set'}
            />
          </div>
        </div>

        <button
          onClick={handleCreatePin}
          className="submit-btn"
          disabled={isProcessing || transactionPinStatus === 'Set'}
        >
          {isProcessing ? 'Creating...' : transactionPinStatus === 'Set' ? 'PIN Already Set' : 'Create Pin'}
        </button>
      </div>

      {/* 2FA Table Card */}
      <div className="card">
        <h2 className="card-title">Enable/Disable 2Factor Authentication</h2>

        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Request</th>
                <th>Status</th>
                <th>Transaction Pin</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td data-label="Request">2FACTOR AUTHENTICATION</td>
                <td data-label="Status">
                  <span className="status-badge">{transactionPinStatus}</span>
                </td>
                <td data-label="Transaction Pin">
                  <div className="transaction-pin-input-wrapper">
                    <input
                      type="password"
                      value={transactionPin}
                      onChange={(e) => setTransactionPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      maxLength={4}
                      placeholder="Enter Your Four (4) Digits Pin"
                      className="table-input"
                      disabled={transactionPinStatus === 'Not-Set' || isProcessing}
                    />
                  </div>
                </td>
                <td data-label="Action">
                  <button
                    onClick={handleEnable2FA}
                    className="enable-btn"
                    disabled={transactionPinStatus === 'Not-Set' || isProcessing}
                  >
                    {isProcessing ? 'Processing...' : is2FAEnabled ? 'Disable' : 'Enable'}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <style jsx>{`
        .page-container {
          padding: 16px 24px;
          max-width: 1200px;
          margin: 0 auto;
        }

        .alert-notification {
          position: fixed;
          top: 20px;
          right: 20px;
          z-index: 9999;
          animation: slideIn 0.3s ease-out;
        }

        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        .alert-content {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px 24px;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          font-size: 14px;
          font-weight: 500;
        }

        .alert-content.success {
          background: #4caf50;
          color: white;
        }

        .alert-content.error {
          background: #ef4444;
          color: white;
        }

        .page-header {
          margin-bottom: 24px;
        }

        .page-title {
          font-size: 20px;
          font-weight: 700;
          color: #ff2b2b;
          margin: 0;
          letter-spacing: 0.3px;
        }

        .breadcrumb {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 14px;
          margin-top: 8px;
        }

        .breadcrumb-link {
          color: #6b7280;
          font-weight: 500;
          cursor: pointer;
          transition: color 0.2s;
        }

        .breadcrumb-link:hover {
          color: #ff2b2b;
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
          border-radius: 8px;
          padding: 24px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          border: 1px solid #e5e7eb;
          margin-bottom: 24px;
        }

        .card-title {
          font-size: 18px;
          font-weight: 600;
          color: #1f2937;
          margin: 0 0 20px 0;
          padding-bottom: 12px;
          border-bottom: 2px solid #e5e7eb;
        }

        .form {
          margin-bottom: 20px;
        }

        .form-row {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 20px;
          margin-bottom: 20px;
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

        .recovery-note {
          font-size: 13px;
          color: #dc2626;
          font-style: italic;
          margin: 0 0 8px 0;
        }

        .input-with-icon {
          position: relative;
          display: flex;
          align-items: center;
        }

        .input-icon {
          position: absolute;
          left: 12px;
          color: #9ca3af;
          pointer-events: none;
          z-index: 1;
        }

        .text-input {
          width: 100%;
          padding: 12px 44px 12px 42px;
          font-size: 14px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          transition: all 0.2s;
          color: #1f2937;
          font-weight: 500;
        }

        .text-input-plain {
          width: 100%;
          padding: 12px;
          font-size: 14px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          transition: all 0.2s;
          color: #1f2937;
          font-weight: 500;
        }

        .text-input:hover:not(:disabled),
        .text-input-plain:hover:not(:disabled) {
          border-color: #9ca3af;
        }

        .text-input:focus,
        .text-input-plain:focus {
          outline: none;
          border-color: #ff2b2b;
          box-shadow: 0 0 0 3px rgba(255, 43, 43, 0.1);
        }

        .text-input:disabled,
        .text-input-plain:disabled {
          background: #f3f4f6;
          cursor: not-allowed;
          opacity: 0.6;
        }

        .text-input::placeholder,
        .text-input-plain::placeholder {
          color: #9ca3af;
          font-weight: 400;
        }

        .eye-button {
          position: absolute;
          right: 12px;
          background: none;
          border: none;
          cursor: pointer;
          padding: 4px;
          color: #6b7280;
          transition: color 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .eye-button:hover:not(:disabled) {
          color: #1f2937;
        }

        .eye-button:disabled {
          cursor: not-allowed;
          opacity: 0.5;
        }

        .submit-btn {
          background: #ff2b2b;
          color: white;
          border: none;
          border-radius: 6px;
          padding: 12px 32px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .submit-btn:hover:not(:disabled) {
          background: #dc2626;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(255, 43, 43, 0.3);
        }

        .submit-btn:disabled {
          background: #d1d5db;
          cursor: not-allowed;
          transform: none;
        }

        .table-responsive {
          overflow-x: auto;
        }

        .data-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 14px;
        }

        .data-table thead {
          background: #f9fafb;
        }

        .data-table th {
          padding: 12px;
          text-align: left;
          font-weight: 600;
          color: #374151;
          border-bottom: 2px solid #e5e7eb;
        }

        .data-table td {
          padding: 16px 12px;
          border-bottom: 1px solid #e5e7eb;
          color: #6b7280;
        }

        .status-badge {
          display: inline-block;
          background: #9ca3af;
          color: white;
          padding: 4px 12px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 600;
        }

        .transaction-pin-input-wrapper {
          display: flex;
          width: 100%;
        }

        .table-input {
          width: 100%;
          padding: 10px 14px;
          border: 1px solid #d1d5db;
          border-radius: 4px;
          font-size: 14px;
          transition: all 0.2s;
          box-sizing: border-box;
        }

        .table-input:focus {
          outline: none;
          border-color: #ff2b2b;
          box-shadow: 0 0 0 3px rgba(255, 43, 43, 0.1);
        }

        .table-input:disabled {
          background: #f3f4f6;
          cursor: not-allowed;
          opacity: 0.6;
        }

        .enable-btn {
          background: #4caf50;
          color: white;
          border: none;
          border-radius: 4px;
          padding: 8px 24px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
        }

        .enable-btn:hover:not(:disabled) {
          background: #388e3c;
          transform: translateY(-1px);
        }

        .enable-btn:disabled {
          background: #d1d5db;
          cursor: not-allowed;
          opacity: 0.6;
          transform: none;
        }

        /* Mobile optimizations */
        @media (max-width: 768px) {
          .page-container {
            padding: 12px;
          }

          .card {
            padding: 16px;
          }

          .form-row {
            grid-template-columns: 1fr;
            gap: 16px;
          }

          .form-group label {
            font-size: 13px;
          }

          .text-input {
            padding: 12px 42px 12px 40px;
            font-size: 16px; /* Better for mobile number input */
          }

          .input-icon {
            left: 10px;
          }

          .eye-button {
            right: 10px;
          }

          .text-input-plain {
            padding: 12px;
            font-size: 16px;
          }

          .data-table thead {
            display: none;
          }

          .data-table tr {
            display: block;
            margin-bottom: 16px;
            border: 1px solid #e5e7eb;
            border-radius: 6px;
            padding: 12px;
          }

          .data-table td {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 12px 0;
            border-bottom: 1px solid #f3f4f6;
          }

          .data-table td:last-child {
            border-bottom: none;
          }

          .data-table td::before {
            content: attr(data-label);
            font-weight: 600;
            color: #374151;
            font-size: 13px;
            flex: 0 0 40%;
            padding-right: 10px;
          }

          .transaction-pin-input-wrapper {
            width: 100%;
            flex: 1;
          }

          .table-input {
            width: 100%;
            padding: 10px 12px;
            font-size: 16px;
          }

          .enable-btn {
            width: 100%;
            padding: 10px 16px;
            font-size: 14px;
          }

          .status-badge {
            font-size: 11px;
            padding: 4px 8px;
          }

          .table-input::placeholder {
            font-size: 13px;
          }
        }

        @media (max-width: 480px) {
          .card {
            padding: 12px;
          }

          .card-title {
            font-size: 16px;
            margin-bottom: 16px;
          }

          .text-input {
            padding: 14px 40px 14px 38px;
          }

          .input-icon {
            left: 8px;
          }

          .eye-button {
            right: 8px;
          }

          .submit-btn {
            width: 100%;
            padding: 14px 16px;
            font-size: 15px;
          }

          .data-table td {
            flex-direction: column;
            align-items: flex-start;
            gap: 6px;
          }

          .data-table td::before {
            flex: none;
            width: 100%;
            padding-right: 0;
            margin-bottom: 4px;
          }

          .table-input {
            padding: 12px 14px;
            width: 100%;
          }

          .enable-btn {
            width: 100%;
            padding: 12px 16px;
          }

          .text-input::placeholder,
          .text-input-plain::placeholder,
          .table-input::placeholder {
            font-size: 14px;
          }
        }

        @media (max-width: 360px) {
          .text-input {
            font-size: 15px;
            padding: 12px 38px 12px 36px;
          }

          .text-input-plain {
            font-size: 15px;
            padding: 12px;
          }

          .table-input {
            font-size: 15px;
            padding: 10px 12px;
          }

          .text-input::placeholder,
          .text-input-plain::placeholder,
          .table-input::placeholder {
            font-size: 13px;
          }
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}