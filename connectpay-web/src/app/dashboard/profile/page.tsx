'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Home, ChevronLeft, RefreshCw, User, AlertCircle, X, Copy, CheckCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import apiClient from '@/lib/api';

interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  username: string;
  dateJoined: string;
  apiToken?: string;
  referralId?: string;
  userStatus?: string;
}

interface VirtualAccount {
  accounts: Array<{
    accountNumber: string;
    accountName: string;
    bankName: string;
  }>;
  reference?: string;
  gateway: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const { user: contextUser, logout } = useAuth();
  
  const [user, setUser] = useState<UserProfile | null>(null);
  const [virtualAccount, setVirtualAccount] = useState<VirtualAccount | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const processAccountData = (data: any) => {
    if (!data || !data.gateway) {
      console.warn('⚠️ Invalid account data structure');
      return null;
    }

    const gateway = data.gateway.toLowerCase();
    const accounts: any[] = [];

    if (gateway === 'paystack') {
      if (data.accountNumber && data.accountName && data.bankName) {
        accounts.push({
          bankName: data.bankName,
          accountNumber: data.accountNumber,
          accountName: data.accountName
        });
      } else if (data.accounts && Array.isArray(data.accounts)) {
        data.accounts.forEach((account: any) => {
          accounts.push({
            bankName: account.bankName || account.bank_name || 'Unknown Bank',
            accountNumber: account.accountNumber || account.account_number || '',
            accountName: account.accountName || account.account_name || 'Unknown Name',
          });
        });
      }
    } else if (gateway === 'monnify' && data.accounts && Array.isArray(data.accounts)) {
      data.accounts.forEach((account: any) => {
        accounts.push({
          bankName: account.bankName || account.bank_name || 'Unknown Bank',
          accountNumber: account.accountNumber || account.account_number || '',
          accountName: account.accountName || account.account_name || 'Unknown Name',
        });
      });
    }

    if (accounts.length === 0) {
      console.warn('⚠️ No accounts found in response');
      return null;
    }

    return {
      accounts,
      reference: data.reference || data.accountReference,
      gateway: gateway
    };
  };

  const fetchVirtualAccount = async () => {
    try {
      console.log('🔍 Fetching virtual account details...');
      const response = await apiClient.get('/payment/virtual-account');
      
      console.log('📦 Virtual Account API Response:', JSON.stringify(response.data, null, 2));
      
      if (response.data?.success && response.data?.data && isMountedRef.current) {
        const processedData = processAccountData(response.data.data);
        if (processedData) {
          setVirtualAccount(processedData);
          console.log('✅ Virtual account loaded successfully');
        }
      }
    } catch (error: any) {
      if (isMountedRef.current) {
        console.error('❌ Error fetching virtual account:', error);
      }
    }
  };

  const fetchUserProfile = async () => {
    if (!isMountedRef.current) return;

    try {
      console.log('🔍 Fetching user profile...');
      const response = await apiClient.get('/auth/profile');
      
      if (response.data?.success && isMountedRef.current) {
        const userData = response.data.user;
        
        const formattedUser: UserProfile = {
          id: userData.id || userData._id || '',
          name: userData.name || userData.username || 'User',
          email: userData.email || '',
          phone: userData.phone || '',
          username: userData.username || '',
          dateJoined: userData.createdAt || userData.dateJoined || new Date().toISOString(),
          apiToken: userData.apiToken || userData.apiAuthToken || '',
          referralId: userData.referralId || userData.referralCode || '',
          userStatus: userData.userStatus || userData.status || 'Active',
        };
        
        setUser(formattedUser);
        setApiError(null);
        console.log('✅ User profile loaded');
      } else if (isMountedRef.current) {
        setUser(null);
      }
    } catch (error: any) {
      if (isMountedRef.current) {
        console.error('❌ Error fetching profile:', error);
        
        if (error.status !== 401) {
          setApiError('Unable to fetch profile. Please check your connection.');
        }
      }
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      await Promise.all([
        fetchUserProfile(),
        fetchVirtualAccount()
      ]);
      setIsLoading(false);
    };

    fetchData();
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([
      fetchUserProfile(),
      fetchVirtualAccount()
    ]);
    setIsRefreshing(false);
  };

  const getInitials = (name: string): string => {
    if (!name) return 'U';
    const parts = name.trim().split(' ').filter(part => part.length > 0);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return parts[0].substring(0, 1).toUpperCase();
  };

  const capitalizeFirstLetter = (text: string): string => {
    if (!text) return text;
    return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    }).catch((err) => {
      console.error('Failed to copy:', err);
    });
  };

  if (isLoading) {
    return (
      <div className="page-container">
        <div className="loading-wrapper">
          <div className="spinner"></div>
          <p className="loading-text">Loading profile...</p>
        </div>
        <style jsx>{`
          .page-container {
            padding: 16px 24px;
            max-width: 1400px;
            margin: 0 auto;
            min-height: 400px;
          }
          .loading-wrapper {
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 400px;
            flex-direction: column;
            gap: 16px;
          }
          .spinner {
            width: 48px;
            height: 48px;
            border: 4px solid #e5e7eb;
            border-top-color: #dc2626;
            border-radius: 50%;
            animation: spin 1s linear infinite;
          }
          .loading-text {
            color: #6b7280;
            font-size: 14px;
            font-weight: 500;
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="page-container">
      {apiError && (
        <div className="error-alert">
          <AlertCircle size={18} className="error-icon" />
          <div className="error-content">
            <p className="error-text">{apiError}</p>
          </div>
          <button onClick={() => setApiError(null)} className="error-close">
            <X size={16} />
          </button>
        </div>
      )}

      {user ? (
        <>
          <div className="profile-section">
            <div className="section-header">
              <h2 className="section-title">Profile</h2>
              <button 
                onClick={handleRefresh} 
                className={`refresh-button ${isRefreshing ? 'refreshing' : ''}`}
                disabled={isRefreshing}
              >
                <RefreshCw size={18} />
              </button>
            </div>
            
            <div className="avatar-section">
              <div className="avatar">
                <span style={{ position: 'relative', zIndex: 1 }}>{getInitials(user.name)}</span>
              </div>
              <div className="avatar-info">
                <p className="avatar-label">Full Name: {user.name.split(' ').slice(0, 2).join(' ') || 'Not provided'}</p>
                <div className="name-inputs">
                  <input 
                    type="text" 
                    className="name-input" 
                    value={user.name.split(' ')[0] || ''} 
                    readOnly 
                    placeholder="First Name"
                  />
                  <input 
                    type="text" 
                    className="name-input" 
                    value={user.name.split(' ')[1] || ''} 
                    readOnly 
                    placeholder="Second Name"
                  />
                  <button className="update-button">Update</button>
                </div>
              </div>
            </div>

            <div className="info-list">
              <div className="info-item">
                <div className="info-label">Email:</div>
                <div className="info-value">
                  <span className="info-text">{capitalizeFirstLetter(user.email) || 'Not provided'}</span>
                  <button className="change-password-button">Change Password</button>
                </div>
              </div>

              <div className="info-item">
                <div className="info-label">Phone No:</div>
                <div className="info-value">
                  <span className="info-text">{user.phone || 'Not provided'}</span>
                </div>
              </div>

              {virtualAccount && virtualAccount.accounts && virtualAccount.accounts.length > 0 ? (
                <>
                  {virtualAccount.accounts.slice(0, 2).map((account, index) => (
                    <div key={index} className="info-item">
                      <div className="info-label">Auto Funding Account No {index + 1}:</div>
                      <div className="info-value">
                        <div className="funding-account-card">
                          <div className="account-number-row">
                            <div className="account-number">{account.accountNumber}</div>
                            <button
                              onClick={() => copyToClipboard(account.accountNumber, `account-${index}`)}
                              className="copy-button"
                            >
                              {copiedField === `account-${index}` ? (
                                <CheckCircle size={16} style={{ color: '#22c55e' }} />
                              ) : (
                                <Copy size={16} style={{ color: '#dc2626' }} />
                              )}
                            </button>
                          </div>
                          <div className="account-bank">{capitalizeFirstLetter(account.bankName)}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </>
              ) : (
                <>
                  <div className="info-item">
                    <div className="info-label">Auto Funding Account No 1:</div>
                    <div className="info-value">
                      <div className="loading-account-inline">
                        <div className="spinner-small"></div>
                        <span>Loading account details...</span>
                      </div>
                    </div>
                  </div>
                  <div className="info-item">
                    <div className="info-label">Auto Funding Account No 2:</div>
                    <div className="info-value">
                      <div className="loading-account-inline">
                        <div className="spinner-small"></div>
                        <span>Loading account details...</span>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {user.apiToken && (
                <div className="info-item">
                  <div className="info-label">API Authorization Token (Key):</div>
                  <div className="info-value">
                    <div className="api-token-container">
                      <div className="api-token-row">
                        <span className="api-token">{user.apiToken}</span>
                        <button
                          onClick={() => copyToClipboard(user.apiToken!, 'api-token')}
                          className="copy-button"
                        >
                          {copiedField === 'api-token' ? (
                            <CheckCircle size={16} style={{ color: '#22c55e' }} />
                          ) : (
                            <Copy size={16} style={{ color: '#dc2626' }} />
                          )}
                        </button>
                      </div>
                      <button className="api-doc-button">Get API Documentation</button>
                    </div>
                  </div>
                </div>
              )}

              {user.referralId && (
                <div className="info-item">
                  <div className="info-label">Referral ID:</div>
                  <div className="info-value">
                    <span className="info-text">{user.referralId}</span>
                  </div>
                </div>
              )}

              {user.userStatus && (
                <div className="info-item">
                  <div className="info-label">User Status:</div>
                  <div className="info-value">
                    <span className={`status-badge status-${user.userStatus.toLowerCase()}`}>
                      {user.userStatus}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      ) : (
        <div className="empty-state">
          <User size={64} className="empty-icon" />
          <p className="empty-title">No Profile Data</p>
          <p className="empty-subtitle">Unable to load your profile information</p>
        </div>
      )}

      <style jsx>{`
        .page-container {
          padding: 16px 24px;
          max-width: 750px;
          margin: auto;
          padding-top: 0px;
          margin-top: 4rem;
        }

        .error-alert {
          background: #fee2e2;
          border: 1px solid #fca5a5;
          border-radius: 8px;
          padding: 12px 16px;
          margin-bottom: 16px;
          margin-top: 16px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .error-icon {
          color: #dc2626;
          flex-shrink: 0;
        }

        .error-content {
          flex: 1;
        }

        .error-text {
          margin: 0;
          font-size: 14px;
          color: #991b1b;
          font-weight: 600;
        }

        .error-close {
          background: none;
          border: none;
          cursor: pointer;
          padding: 4px;
          display: flex;
          align-items: center;
          color: #dc2626;
        }

        .profile-section {
          background: white;
          border-radius: 12px;
          padding: 32px;
          margin-bottom: 20px;
          border: 1px solid #e5e7eb;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }

        .section-title {
          font-size: 20px;
          font-weight: 700;
          color: #1f2937;
          margin: 0;
        }

        .refresh-button {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 8px;
          cursor: pointer;
          display: flex;
          align-items: center;
          transition: all 0.2s ease;
          color: #dc2626;
        }

        .refresh-button:hover:not(:disabled) {
          background: #fef2f2;
          border-color: #dc2626;
        }

        .refresh-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .refresh-button.refreshing {
          animation: spin 1s linear infinite;
        }

        .avatar-section {
          display: flex;
          align-items: flex-start;
          gap: 24px;
          margin-bottom: 32px;
          padding-bottom: 24px;
          border-bottom: 1px solid #e5e7eb;
        }

        .avatar {
          width: 100px;
          height: 100px;
          border-radius: 50%;
          background: #4a9eff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 32px;
          font-weight: 700;
          color: white;
          flex-shrink: 0;
          border: 3px solid #e8f4ff;
          position: relative;
          overflow: hidden;
        }
        
        .avatar::before {
          content: '';
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 40%;
          background: #3b8ee8;
          border-radius: 0 0 50% 50%;
        }

        .avatar-info {
          flex: 1;
          min-width: 0;
        }

        .avatar-label {
          font-size: 14px;
          font-weight: 600;
          color: #374151;
          margin: 0 0 12px 0;
        }

        .name-inputs {
          display: flex;
          gap: 12px;
          align-items: stretch;
        }

        .name-input {
          flex: 1;
          padding: 10px 14px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 14px;
          color: #1f2937;
          background: #f9fafb;
          min-width: 0;
        }

        .name-input:focus {
          outline: none;
          border-color: #dc2626;
          background: white;
        }

        .update-button {
          background: #dc2626;
          color: white;
          border: none;
          padding: 10px 24px;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          white-space: nowrap;
          flex-shrink: 0;
        }

        .update-button:hover {
          background: #b91c1c;
        }

        .info-list {
          display: flex;
          flex-direction: column;
          gap: 0;
        }

        .info-item {
          display: flex;
          flex-direction: column;
          gap: 8px;
          padding: 18px 0;
          border-bottom: 1px solid #e5e7eb;
        }

        .info-item:last-child {
          border-bottom: none;
        }

        .info-label {
          font-size: 14px;
          font-weight: 600;
          color: #374151;
        }

        .info-value {
          font-size: 14px;
          font-weight: 500;
          color: #1f2937;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .info-text {
          word-break: break-word;
        }

        .funding-account-card {
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 12px;
        }

        .account-number-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 6px;
          gap: 8px;
        }

        .account-number {
          font-size: 16px;
          font-weight: 700;
          color: #1f2937;
          letter-spacing: 0.5px;
          word-break: break-all;
        }

        .copy-button {
          background: none;
          border: none;
          cursor: pointer;
          padding: 4px;
          display: flex;
          align-items: center;
          transition: all 0.2s ease;
          flex-shrink: 0;
        }

        .copy-button:hover {
          opacity: 0.7;
        }

        .account-bank {
          font-size: 12px;
          font-weight: 600;
          color: #4b5563;
        }

        .loading-account-inline {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .spinner-small {
          width: 16px;
          height: 16px;
          border: 2px solid #e5e7eb;
          border-top-color: #dc2626;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        .loading-account-inline span {
          font-size: 13px;
          color: #6b7280;
        }

        .api-token-container {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .api-token-row {
          display: flex;
          align-items: center;
          gap: 8px;
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          padding: 10px;
        }

        .api-token {
          font-weight: 500;
          color: #1f2937;
          word-break: break-all;
          flex: 1;
          font-size: 13px;
        }

        .change-password-button {
          background: #10b981;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 4px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          align-self: flex-start;
        }

        .change-password-button:hover {
          background: #059669;
        }

        .api-doc-button {
          background: #dc2626;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 4px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          align-self: flex-start;
        }

        .api-doc-button:hover {
          background: #b91c1c;
        }

        .status-badge {
          display: inline-block;
          padding: 6px 16px;
          border-radius: 4px;
          font-size: 13px;
          font-weight: 700;
          text-transform: capitalize;
          align-self: flex-start;
        }

        .status-active {
          background: #dc2626;
          color: white;
        }

        .status-api {
          background: #dc2626;
          color: white;
        }

        .status-inactive {
          background: #ef4444;
          color: white;
        }

        .status-pending {
          background: #f59e0b;
          color: white;
        }

        .empty-state {
          background: white;
          border-radius: 12px;
          padding: 60px 24px;
          text-align: center;
          border: 1px solid #e5e7eb;
        }

        .empty-icon {
          color: #dc2626;
          opacity: 0.3;
          margin: 0 auto 20px;
        }

        .empty-title {
          font-size: 20px;
          font-weight: 700;
          color: #1f2937;
          margin: 0 0 8px 0;
        }

        .empty-subtitle {
          font-size: 14px;
          color: #6b7280;
          margin: 0;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        /* Tablet styles */
        @media (max-width: 768px) {
          .page-container {
            padding: 12px 16px;
            margin-top: 2rem;
          }

          .profile-section {
            padding: 24px 16px;
          }

          .section-title {
            font-size: 18px;
          }

          .avatar {
            width: 80px;
            height: 80px;
            font-size: 28px;
          }
        }

        /* Mobile styles */
        @media (max-width: 640px) {
          .page-container {
            padding: 12px 12px;
            margin-top: 1rem;
          }

          .profile-section {
            padding: 20px 12px;
            border-radius: 8px;
          }

          .section-header {
            margin-bottom: 20px;
          }

          .section-title {
            font-size: 18px;
          }

          .refresh-button {
            padding: 6px;
          }

          .avatar-section {
            flex-direction: column;
            align-items: center;
            text-align: center;
            gap: 16px;
            margin-bottom: 24px;
            padding-bottom: 20px;
          }

          .avatar {
            width: 80px;
            height: 80px;
            font-size: 28px;
          }

          .avatar-info {
            width: 100%;
          }

          .avatar-label {
            font-size: 13px;
            margin-bottom: 10px;
          }

          .name-inputs {
            flex-direction: column;
            gap: 10px;
          }

          .name-input {
            width: 100%;
            padding: 10px 12px;
            font-size: 14px;
          }

          .update-button {
            width: 100%;
            padding: 10px 16px;
          }

          .info-item {
            padding: 14px 0;
            gap: 6px;
          }

          .info-label {
            font-size: 13px;
          }

          .info-value {
            font-size: 13px;
          }

          .funding-account-card {
            padding: 10px;
          }

          .account-number {
            font-size: 14px;
          }

          .account-bank {
            font-size: 11px;
          }

          .api-token {
            font-size: 11px;
            line-height: 1.4;
          }

          .api-token-row {
            padding: 8px;
          }

          .change-password-button,
          .api-doc-button {
            width: 100%;
            padding: 10px 16px;
            font-size: 13px;
          }

          .status-badge {
            padding: 6px 12px;
            font-size: 12px;
          }

          .empty-state {
            padding: 40px 16px;
          }

          .empty-icon {
            width: 48px;
            height: 48px;
          }

          .empty-title {
            font-size: 18px;
          }

          .empty-subtitle {
            font-size: 13px;
          }
        }

        /* Extra small mobile */
        @media (max-width: 375px) {
          .page-container {
            padding: 8px;
          }

          .profile-section {
            padding: 16px 10px;
          }

          .section-title {
            font-size: 16px;
          }

          .avatar {
            width: 70px;
            height: 70px;
            font-size: 24px;
          }

          .account-number {
            font-size: 13px;
          }

          .api-token {
            font-size: 10px;
          }
        }
      `}</style>
    </div>
  );
}