'use client';

import React, { useState } from 'react';
import { Home, ChevronRight, Search, CheckCircle, XCircle, Clock, AlertCircle, Smartphone } from 'lucide-react';
import { useRouter } from 'next/navigation';
import apiClient from '@/lib/api';

export default function VerifyDataPurchasePage(){
  const router = useRouter();
  const [reference, setReference] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleVerify = async () => {
    const cleanReference = reference.trim();
    
    if (!cleanReference) {
      setError('Please enter a transaction reference');
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      console.log('🔍 Verifying reference:', cleanReference);
      const response = await apiClient.get(`/purchase/verify-data/${cleanReference}`);
      
      console.log('✅ API Response:', response.data);
      
      if (response.data?.success) {
        const data = response.data.data || response.data.transaction;
        
        // Extract phone and network from description if N/A
        let phone = data.phone;
        let network = data.network;
        let description = data.description;
        
        if (description) {
          // Remove (EasyAccess) or (ClubKonnect) from description
          description = description.replace(/\s*\((EasyAccess|ClubKonnect)\)/gi, '');
          
          // Extract phone if N/A
          if (phone === 'N/A') {
            const phoneMatch = description.match(/(\d{11})/);
            if (phoneMatch) phone = phoneMatch[1];
          }
          
          // Extract network if N/A
          if (network === 'N/A') {
            const networkMatch = description.match(/(MTN|GLO|AIRTEL|9MOBILE)/i);
            if (networkMatch) network = networkMatch[1].toUpperCase();
          }
        }
        
        setResult({
          ...data,
          phone,
          network,
          description
        });
      } else {
        setError(response.data?.message || 'Transaction not found');
      }
    } catch (err: any) {
      console.error('❌ Verification error:', err);
      console.error('Error response:', err.response?.data);
      
      if (err.response) {
        const errorMsg = err.response.data?.message || err.response.statusText;
        const statusCode = err.response.status;
        
        console.log(`Status: ${statusCode}, Message: ${errorMsg}`);
        
        if (statusCode === 404) {
          setError(`Transaction not found. This reference "${cleanReference}" does not exist in your records or is not a data transaction.`);
        } else if (statusCode === 401 || statusCode === 403) {
          setError('Authentication error. Please log in again.');
        } else {
          setError(`Error (${statusCode}): ${errorMsg}`);
        }
      } else if (err.request) {
        setError('Network error. Please check your internet connection and try again.');
      } else {
        setError(err.message || 'Unable to verify transaction. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed':
      case 'success':
      case 'successful':
        return '#22c55e';
      case 'failed':
      case 'error':
        return '#ef4444';
      case 'pending':
      case 'processing':
        return '#f59e0b';
      default:
        return '#6b7280';
    }
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <h1 className="page-title">Verify Data Purchase</h1>
        <div className="breadcrumb">
          <span className="breadcrumb-link" onClick={() => router.push('/dashboard')}>Dashboard</span>
          <span className="breadcrumb-separator">/</span>
          <span className="breadcrumb-link" onClick={() => router.push('/dashboard')}>Self Service</span>
          <span className="breadcrumb-separator">/</span>
          <span className="breadcrumb-current">Verify Data Purchase</span>
        </div>
      </div>

      {/* Main Content */}
      <div className="content-card">
        <div className="card-header">
          <div>
            <h2 className="card-title">Check Data Purchase Status</h2>
            <p className="card-subtitle">Enter your transaction reference to verify your data purchase</p>
          </div>
        </div>

        <div className="verify-section">
          <div className="input-group">
            <label htmlFor="reference" className="input-label">
              Transaction Reference
            </label>
            <input
              type="text"
              id="reference"
              className="input-field"
              placeholder="Enter transaction reference (e.g., DT357a1bf205dbc9)"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleVerify()}
              disabled={isLoading}
            />
            <p className="input-hint">
              You can find your transaction reference in your transaction history or confirmation message
            </p>
          </div>

          <button
            onClick={handleVerify}
            className="verify-button"
            disabled={isLoading || !reference.trim()}
          >
            {isLoading ? (
              <>
                <div className="spinner-small"></div>
                Verifying...
              </>
            ) : (
              <>
                <Search size={18} />
                Verify Purchase
              </>
            )}
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="alert alert-error">
            <AlertCircle size={20} />
            <div className="alert-content">
              <p className="alert-title">Verification Failed</p>
              <p className="alert-message">{error}</p>
            </div>
          </div>
        )}

        {/* Result Display */}
        {result && (
          <div className="result-card">
            <div className="result-details">
              <div className="detail-row">
                <span className="detail-label">Reference:</span>
                <span className="detail-value">{result.reference || reference}</span>
              </div>

              <div className="detail-row">
                <span className="detail-label">Status:</span>
                <span className="detail-value" style={{ 
                  color: getStatusColor(result.status), 
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  justifyContent: 'flex-end'
                }}>
                  {result.status?.toLowerCase() === 'completed' && <CheckCircle size={16} />}
                  {result.status?.toLowerCase() === 'failed' && <XCircle size={16} />}
                  {result.status?.toLowerCase() === 'pending' && <Clock size={16} />}
                  {result.status?.toUpperCase()}
                </span>
              </div>
              
              {result.amount && (
                <div className="detail-row">
                  <span className="detail-label">Amount:</span>
                  <span className="detail-value">₦{parseFloat(result.amount).toLocaleString()}</span>
                </div>
              )}

              {result.phone && result.phone !== 'N/A' && (
                <div className="detail-row">
                  <span className="detail-label">Phone Number:</span>
                  <span className="detail-value">{result.phone}</span>
                </div>
              )}

              {result.network && result.network !== 'N/A' && (
                <div className="detail-row">
                  <span className="detail-label">Network:</span>
                  <span className="detail-value">{result.network}</span>
                </div>
              )}

              {result.dataPlan && (
                <div className="detail-row">
                  <span className="detail-label">Data Plan:</span>
                  <span className="detail-value">{result.dataPlan}</span>
                </div>
              )}

              {result.createdAt && (
                <div className="detail-row">
                  <span className="detail-label">Date:</span>
                  <span className="detail-value">
                    {new Date(result.createdAt).toLocaleString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
              )}

              {result.description && (
                <div className="detail-row">
                  <span className="detail-label">Description:</span>
                  <span className="detail-value">{result.description}</span>
                </div>
              )}
            </div>

            {result.status?.toLowerCase() === 'failed' && (
              <div className="result-footer">
                <p className="footer-text">
                  If you believe this is an error, please contact support with your transaction reference.
                </p>
                <button 
                  className="contact-support-btn"
                  onClick={() => router.push('/dashboard/need-help')}
                >
                  Contact Support
                </button>
              </div>
            )}

            {result.status?.toLowerCase() === 'pending' && (
              <div className="result-footer">
                <p className="footer-text">
                  Your transaction is still being processed. Please check back in a few minutes.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      <style jsx>{`
        .page-container {
          padding: 16px 24px;
          max-width: 800px;
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
        }

        .breadcrumb-link:hover {
          color: #dc2626;
        }

        .breadcrumb-separator {
          color: #9ca3af;
        }

        .breadcrumb-current {
          color: #1f2937;
          font-weight: 500;
        }

        .content-card {
          background: white;
          border-radius: 12px;
          padding: 24px;
          border: 1px solid #e5e7eb;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .card-header {
          margin-bottom: 24px;
          padding-bottom: 20px;
          border-bottom: 2px solid #f3f4f6;
        }

        .card-title {
          font-size: 22px;
          font-weight: 700;
          color: #1f2937;
          margin: 0 0 8px 0;
        }

        .card-subtitle {
          font-size: 14px;
          color: #6b7280;
          margin: 0;
        }

        .verify-section {
          margin-bottom: 24px;
        }

        .input-group {
          margin-bottom: 24px;
        }

        .input-label {
          display: block;
          font-size: 14px;
          font-weight: 600;
          color: #374151;
          margin-bottom: 8px;
        }

        .input-field {
          width: 100%;
          padding: 12px 16px;
          border: 2px solid #d1d5db;
          border-radius: 8px;
          font-size: 15px;
          color: #1f2937;
          transition: all 0.2s ease;
          box-sizing: border-box;
        }

        .input-field:focus {
          outline: none;
          border-color: #dc2626;
          box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.1);
        }

        .input-field:disabled {
          background: #f9fafb;
          cursor: not-allowed;
        }

        .input-hint {
          font-size: 12px;
          color: #6b7280;
          margin: 8px 0 0 0;
        }

        .verify-button {
          width: 100%;
          background: #dc2626;
          color: white;
          border: none;
          padding: 14px 24px;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: all 0.2s ease;
        }

        .verify-button:hover:not(:disabled) {
          background: #b91c1c;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(220, 38, 38, 0.3);
        }

        .verify-button:disabled {
          background: #9ca3af;
          cursor: not-allowed;
          transform: none;
        }

        .spinner-small {
          width: 18px;
          height: 18px;
          border: 2px solid #ffffff40;
          border-top-color: #ffffff;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        .alert {
          padding: 16px;
          border-radius: 8px;
          display: flex;
          align-items: flex-start;
          gap: 12px;
          margin-bottom: 24px;
        }

        .alert-error {
          background: #fee2e2;
          border: 1px solid #fca5a5;
          color: #991b1b;
        }

        .alert-content {
          flex: 1;
        }

        .alert-title {
          font-size: 14px;
          font-weight: 700;
          margin: 0 0 4px 0;
        }

        .alert-message {
          font-size: 13px;
          margin: 0;
        }

        .result-card {
          background: #f9fafb;
          border: 2px solid #e5e7eb;
          border-radius: 12px;
          padding: 24px;
          animation: slideIn 0.3s ease;
        }

        .result-details {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .detail-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 16px;
          padding: 12px 0;
          border-bottom: 1px solid #e5e7eb;
        }

        .detail-row:last-child {
          border-bottom: none;
        }

        .detail-label {
          font-size: 14px;
          font-weight: 600;
          color: #4b5563;
          white-space: nowrap;
        }

        .detail-value {
          font-size: 14px;
          font-weight: 500;
          color: #1f2937;
          text-align: right;
          word-break: break-word;
        }

        .result-footer {
          margin-top: 24px;
          padding-top: 20px;
          border-top: 2px solid #e5e7eb;
          text-align: center;
        }

        .footer-text {
          font-size: 14px;
          color: #6b7280;
          margin: 0 0 16px 0;
        }

        .contact-support-btn {
          background: #dc2626;
          color: white;
          border: none;
          padding: 10px 24px;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .contact-support-btn:hover {
          background: #b91c1c;
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        @media (max-width: 768px) {
          .page-container {
            padding: 12px 16px;
          }

          .page-title {
            font-size: 18px;
          }

          .breadcrumb {
            font-size: 13px;
          }

          .content-card {
            padding: 20px 16px;
            border-radius: 10px;
          }

          .card-title {
            font-size: 18px;
          }

          .card-subtitle {
            font-size: 13px;
          }

          .detail-row {
            flex-direction: column;
            gap: 6px;
            padding: 10px 0;
          }

          .detail-value {
            text-align: left;
            font-size: 13px;
          }

          .detail-label {
            font-size: 13px;
          }
        }

        @media (max-width: 640px) {
          .page-container {
            padding: 12px;
          }

          .page-title {
            font-size: 17px;
          }

          .breadcrumb {
            font-size: 12px;
            flex-wrap: wrap;
          }

          .content-card {
            padding: 18px 14px;
          }

          .card-title {
            font-size: 17px;
          }

          .input-field {
            padding: 11px 14px;
            font-size: 14px;
          }

          .verify-button {
            padding: 13px 20px;
            font-size: 15px;
          }

          .result-card {
            padding: 20px 16px;
          }
        }

        @media (max-width: 480px) {
          .page-container {
            padding: 10px;
          }

          .page-title {
            font-size: 16px;
          }

          .content-card {
            padding: 16px 12px;
          }

          .card-title {
            font-size: 16px;
          }

          .input-field {
            padding: 10px 12px;
            font-size: 13px;
          }

          .verify-button {
            padding: 12px 18px;
            font-size: 14px;
          }

          .detail-label,
          .detail-value {
            font-size: 12px;
          }
        }

        @media (max-width: 375px) {
          .page-container {
            padding: 8px;
          }

          .content-card {
            padding: 14px 10px;
          }

          .card-title {
            font-size: 15px;
          }

          .input-field {
            font-size: 12px;
          }
        }
      `}</style>
    </div>
  );
}