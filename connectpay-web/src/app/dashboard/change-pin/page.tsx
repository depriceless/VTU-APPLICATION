'use client';

import React, { useState, useRef, useEffect } from 'react';
import { X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import apiClient from '@/lib/api';

export default function ChangePinPage() {
  const router = useRouter();
  const { user: contextUser, isAuthenticated } = useAuth();
  const [oldPin, setOldPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(true);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const handleChangePin = async () => {
    try {
      setMessage('');
      setIsError(true);

      if (!oldPin || !newPin || !confirmPin) {
        setMessage('Please fill in all fields');
        setIsError(true);
        return;
      }

      if (oldPin.length !== 4 || newPin.length !== 4 || confirmPin.length !== 4) {
        setMessage('PIN must be 4 digits');
        setIsError(true);
        return;
      }

      if (newPin !== confirmPin) {
        setMessage('New PINs do not match');
        setIsError(true);
        return;
      }

      if (oldPin === newPin) {
        setMessage('New PIN must be different from current PIN');
        setIsError(true);
        return;
      }

      setIsProcessing(true);

      const response = await apiClient.put('/user/change-pin', {
        oldPin,
        newPin,
      });

      if (response.data?.success) {
        setIsError(false);
        setMessage(response.data.message || 'PIN updated successfully');
        setOldPin('');
        setNewPin('');
        setConfirmPin('');

        setTimeout(() => {
          if (isMountedRef.current) {
            setShowSuccessModal(true);
          }
        }, 300);
      } else {
        setIsError(true);
        setMessage(response.data?.message || 'Failed to update PIN');
      }

    } catch (error: any) {
      if (error.response?.data?.message) {
        setMessage(error.response.data.message);
      } else if (error.message) {
        setMessage(error.message);
      } else {
        setMessage('Unable to update PIN. Please try again.');
      }
      setIsError(true);
    } finally {
      if (isMountedRef.current) {
        setIsProcessing(false);
      }
    }
  };

  const handleCloseSuccessModal = () => {
    setShowSuccessModal(false);
    router.push('/dashboard');
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">CHANGE PIN</h1>
        <div className="breadcrumb">
          <span className="breadcrumb-link" onClick={() => router.push('/dashboard')}>Dashboard</span>
          <span className="breadcrumb-separator">/</span>
          <span className="breadcrumb-current">Change PIN</span>
        </div>
      </div>

      <div className="card">
        <div className="form">
          <div className="form-group">
            <label htmlFor="oldPin">Current PIN:</label>
            <input
              id="oldPin"
              type="password"
              inputMode="numeric"
              value={oldPin}
              onChange={(e) => setOldPin(e.target.value.replace(/\D/g, ''))}
              placeholder="Enter current 4-digit PIN"
              maxLength={4}
              className="text-input"
              disabled={isProcessing}
            />
          </div>

          <div className="form-group">
            <label htmlFor="newPin">New PIN:</label>
            <input
              id="newPin"
              type="password"
              inputMode="numeric"
              value={newPin}
              onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
              placeholder="Enter new 4-digit PIN"
              maxLength={4}
              className="text-input"
              disabled={isProcessing}
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPin">Confirm New PIN:</label>
            <input
              id="confirmPin"
              type="password"
              inputMode="numeric"
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
              placeholder="Re-enter new 4-digit PIN"
              maxLength={4}
              className="text-input"
              disabled={isProcessing}
            />
          </div>
        </div>

        {message && (
          <div className={`message ${isError ? 'error' : 'success'}`}>
            {message}
          </div>
        )}

        <button 
          onClick={handleChangePin} 
          className="submit-btn"
          disabled={isProcessing || oldPin.length !== 4 || newPin.length !== 4 || confirmPin.length !== 4}
        >
          {isProcessing ? 'Updating...' : 'Update PIN'}
        </button>
      </div>

      {showSuccessModal && (
        <div className="modal-overlay" onClick={handleCloseSuccessModal}>
          <div className="modal-content success-modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={handleCloseSuccessModal}>
              <X size={24} />
            </button>

            <div className="success-icon">
              <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
                <circle cx="32" cy="32" r="32" fill="#10b981" fillOpacity="0.1"/>
                <circle cx="32" cy="32" r="24" fill="#10b981"/>
                <path d="M20 32l8 8 16-16" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>

            <h2 className="success-modal-title">PIN Updated!</h2>
            <p className="success-modal-subtitle">Your transaction PIN has been changed successfully</p>

            <button onClick={handleCloseSuccessModal} className="submit-btn">
              Return to Dashboard
            </button>
          </div>
        </div>
      )}

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
          max-width: 450px;
          margin: 0 auto;
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

        .text-input::placeholder {
          color: #9ca3af;
          font-weight: 400;
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

        .message {
          padding: 12px;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          margin-bottom: 16px;
          text-align: center;
        }

        .message.error {
          background: #fef2f2;
          color: #dc2626;
          border: 1px solid #fecaca;
        }

        .message.success {
          background: #f0fdf4;
          color: #16a34a;
          border: 1px solid #bbf7d0;
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
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .modal-content {
          background: white;
          border-radius: 16px;
          padding: 32px 24px;
          max-width: 400px;
          width: 100%;
          position: relative;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
          animation: slideUp 0.3s ease-out;
        }

        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
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

        .success-modal-content {
          text-align: center;
        }

        .success-icon {
          margin: 0 auto 24px;
          display: flex;
          justify-content: center;
        }

        .success-modal-title {
          font-size: 22px;
          font-weight: 700;
          color: #1f2937;
          margin: 0 0 8px 0;
        }

        .success-modal-subtitle {
          font-size: 14px;
          color: #6b7280;
          margin: 0 0 24px 0;
        }

        @media (max-width: 768px) {
          .page-container { padding: 12px; }
          .page-title { font-size: 18px; }
          .card { padding: 16px; }
          .modal-content { padding: 24px 20px; }
          .success-modal-title { font-size: 20px; }
        }
      `}</style>
    </div>
  );
}