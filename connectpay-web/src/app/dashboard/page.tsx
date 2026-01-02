'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Home, Smartphone, Wifi, Tv, Zap, Printer, DollarSign, Globe, GraduationCap, History, HelpCircle, Gift, Send, ArrowUpRight, ArrowDownLeft, AlertCircle, CreditCard, Copy, CheckCircle, X, Eye, EyeOff, Wallet, ChevronRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import apiClient from '@/lib/api';

export default function DashboardPage() {
  const router = useRouter();
  const { user: contextUser } = useAuth();
  
  // State for dynamic data
  const [user, setUser] = useState<any>(null);
  const [balance, setBalance] = useState(0);
  const [bonusBalance, setBonusBalance] = useState(0);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [virtualAccount, setVirtualAccount] = useState<any>(null);
  const [activeGateway, setActiveGateway] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [balanceVisible, setBalanceVisible] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const isMountedRef = useRef(true);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    
    return () => {
      isMountedRef.current = false;
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, []);

  // Update user from context
  useEffect(() => {
    if (contextUser) {
      setUser({
        name: contextUser.name || 'User',
        email: contextUser.email || 'user@example.com',
        phone: contextUser.phone,
        username: contextUser.username,
      });
    }
  }, [contextUser]);

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

  // Fetch active gateway
  const fetchActiveGateway = async () => {
    try {
      console.log('🔍 Fetching active gateway...');
      const response = await apiClient.get('/payment/active-gateway');
      
      if (response.data?.success) {
        const gateway = response.data.activeGateway || response.data.data?.activeGateway;
        if (gateway && isMountedRef.current) {
          setActiveGateway(gateway.toLowerCase());
          console.log('✅ Active gateway:', gateway);
        }
      }
    } catch (error: any) {
      console.error('❌ Error fetching active gateway:', error);
    }
  };

  // Process account data from API
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

  // Fetch virtual account
  const fetchVirtualAccount = async () => {
    try {
      console.log('🔍 Fetching virtual account details...');
      const response = await apiClient.get('/payment/virtual-account');
      
      console.log('📦 Virtual Account API Response:', JSON.stringify(response.data, null, 2));
      
      if (response.data?.success && response.data?.data && isMountedRef.current) {
        const processedData = processAccountData(response.data.data);
        if (processedData) {
          setVirtualAccount(processedData);
          setActiveGateway(processedData.gateway);
          console.log('✅ Virtual account loaded successfully');
        }
      }
    } catch (error: any) {
      if (isMountedRef.current) {
        console.error('❌ Error fetching virtual account:', error);
        if (error.status !== 401) {
          setApiError('Unable to fetch account details. Please try again.');
        }
      }
    }
  };

  // Fetch balance from API
  const fetchBalance = async () => {
    try {
      console.log('🔍 Fetching balance from /balance endpoint...');
      const response = await apiClient.get('/balance');
      
      console.log('📦 Balance API Response:', JSON.stringify(response.data, null, 2));
      
      if (response.data?.success && response.data?.balance) {
        const balanceValue = extractBalance(response.data.balance);
        
        if (isMountedRef.current) {
          setBalance(balanceValue);
          
          if (response.data.bonusBalance) {
            setBonusBalance(extractBalance(response.data.bonusBalance));
          }
        }
        
        console.log('✅ Balance refreshed successfully:', balanceValue);
      }
    } catch (error: any) {
      if (isMountedRef.current) {
        console.error('❌ Error fetching balance:', error);
        
        if (error.status !== 401) {
          setApiError('Unable to fetch balance. Please check your connection.');
        }
      }
    }
  };

  // Format date helper
  const formatTransactionDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  // Transaction icon helper
  const getTransactionIcon = (transaction: any) => {
    if (transaction.status === 'failed') {
      return { name: 'x-circle' as const, bg: '#fee2e2', color: '#dc3545' };
    }
    
    if (transaction.type === 'credit' || transaction.type === 'transfer_in') {
      return { name: 'arrow-down' as const, bg: '#e8f5e9', color: '#28a745' };
    }
    
    return { name: 'arrow-up' as const, bg: '#fee2e2', color: '#dc2626' };
  };

  // Transaction color helper
  const getTransactionColor = (transaction: any): string => {
    if (transaction.status === 'failed') return '#dc3545';
    
    if (transaction.type === 'credit' || transaction.type === 'transfer_in') {
      return '#28a745';
    }
    
    return '#ff2b2b';
  };

  // Fetch transactions
  const fetchTransactions = async () => {
    if (!isMountedRef.current) return;

    try {
      console.log('🔍 Fetching transactions...');
      const response = await apiClient.get('/transactions');
      
      if (response.data?.success && isMountedRef.current) {
        const txData = response.data.transactions || [];
        const formattedTransactions = txData.map((tx: any, index: number) => ({
          _id: tx._id || tx.id || `tx_${Date.now()}_${index}`,
          type: tx.type || 'credit',
          amount: parseFloat(tx.amount || 0),
          date: tx.createdAt || tx.date || new Date().toISOString(),
          createdAt: tx.createdAt || tx.date || new Date().toISOString(),
          status: tx.status || 'completed',
          description: tx.description || `${tx.type || 'Transaction'} transaction`,
          reference: tx.reference || `REF_${tx._id || Date.now()}_${index}`,
          category: tx.category || 'general',
          previousBalance: tx.previousBalance || 0,
          newBalance: tx.newBalance || 0,
          gateway: tx.gateway || {},
          metadata: tx.metadata || {}
        }));
        
        setTransactions(formattedTransactions);
        setApiError(null);
        console.log('✅ Transactions updated:', formattedTransactions.length);
      } else if (isMountedRef.current) {
        setTransactions([]);
      }
    } catch (error: any) {
      if (isMountedRef.current) {
        console.error('❌ Error fetching transactions:', error);
        setTransactions([]);
        
        if (error.status !== 401) {
          setApiError('Unable to fetch transactions. Please check your connection.');
        }
      }
    }
  };

  // Initial data fetch
  useEffect(() => {
    const fetchInitialData = async () => {
      setIsLoading(true);
      await Promise.all([
        fetchActiveGateway(),
        fetchVirtualAccount(),
        fetchBalance(),
        fetchTransactions()
      ]);
      setIsLoading(false);
    };

    fetchInitialData();
  }, []);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const initialTimeout = setTimeout(() => {
      if (isMountedRef.current) {
        fetchBalance();
        fetchTransactions();
      }
    }, 2000);

    refreshIntervalRef.current = setInterval(() => {
      if (isMountedRef.current) {
        console.log('⏰ Auto-refreshing balance and transactions...');
        fetchBalance();
        fetchTransactions();
      }
    }, 30000);

    return () => {
      clearTimeout(initialTimeout);
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, []);

  // Toggle balance visibility
  const toggleBalanceVisibility = () => {
    setBalanceVisible(!balanceVisible);
  };

  // Handle transaction press
  const handleTransactionPress = (transaction: any) => {
    router.push(`/transaction-details?data=${encodeURIComponent(JSON.stringify(transaction))}`);
  };

  // Copy to clipboard
  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    }).catch((err) => {
      console.error('Failed to copy:', err);
    });
  };

 const quickActions = [
    { icon: Smartphone, label: 'Buy Airtime', bgColor: '#fbbf24', path: '/dashboard/buy-airtime' },
    { icon: Wifi, label: 'Buy Data', bgColor: '#64748b', path: '/dashboard/buy-data' },
    { icon: Tv, label: 'TV Subscription', bgColor: '#64748b', path: '/dashboard/cable-tv' },
    { icon: Zap, label: 'Electric Bill', bgColor: '#ef4444', path: '/dashboard/electricity' },
    { icon: Globe, label: 'Internet', bgColor: '#06b6d4', path: '/dashboard/internet' },
    { icon: Printer, label: 'E-Pins', bgColor: '#22c55e', path: '/dashboard/print-recharge' },
    { icon: DollarSign, label: 'Airtime to cash', bgColor: '#f59e0b', path: '/dashboard/airtime-to-cash' },
    { icon: GraduationCap, label: 'Education', bgColor: '#8b5cf6', path: '/dashboard/education' },
    { icon: HelpCircle, label: 'Support', bgColor: '#0ea5e9', path: '/dashboard/need-help' },
  ];

  if (isLoading) {
    return (
      <div className="dashboard-content">
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
          <p style={{ color: '#6b7280', fontSize: '14px', fontWeight: '500' }}>Loading dashboard...</p>
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
    <div className="dashboard-content">
      {/* Dashboard Header */}
      <div className="dashboard-header-section" onClick={() => router.push('/dashboard')}>
        <Home size={20} className="dashboard-header-icon" strokeWidth={2.5} fill="#4b5563" />
        <span className="dashboard-header-slash">/</span>
        <h1 className="dashboard-header-title">Dashboard</h1>
      </div>

      {/* API Error Alert */}
      {apiError && (
        <div style={{
          background: '#fee2e2',
          border: '1px solid #fca5a5',
          borderRadius: '8px',
          padding: '12px 16px',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <AlertCircle size={18} style={{ color: '#dc2626', flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontSize: '14px', color: '#991b1b', fontWeight: '600' }}>{apiError}</p>
          </div>
          <button
            onClick={() => setApiError(null)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <X size={16} style={{ color: '#dc2626' }} />
          </button>
        </div>
      )}

      {/* Auto Funding Accounts Section */}
      <div className="funding-accounts-section">
        <div className="funding-header">
          <CreditCard size={18} className="funding-icon" />
          <h3 className="funding-title">Auto Funding Account</h3>
        </div>

        {virtualAccount && virtualAccount.accounts && virtualAccount.accounts.length > 0 ? (
          <>
            {virtualAccount.accounts.map((account: any, index: number) => (
              <div key={index} className="funding-account-card" style={{ marginBottom: index < virtualAccount.accounts.length - 1 ? '12px' : '0' }}>
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
                <div className="account-bank">{account.bankName}</div>
              </div>
            ))}
            <div className="account-names">
              <span className="account-names-label">Account Name:</span>
              <span className="account-names-text">{virtualAccount.accounts[0].accountName}</span>
            </div>
          </>
        ) : (
          <div className="loading-account">
            <div style={{
              width: '24px',
              height: '24px',
              border: '3px solid #e5e7eb',
              borderTopColor: '#dc2626',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }}></div>
            <p style={{ margin: 0, fontSize: '13px', color: '#6b7280' }}>Loading account details...</p>
          </div>
        )}
      </div>

      {/* Balance Cards Row */}
      <div className="balance-cards-row">
        <div className="balance-card">
          <div className="balance-header">
            <div className="balance-title">
              <Wallet size={14} className="balance-icon" />
              <span>Wallet Balance</span>
            </div>
            <button className="fund-btn" onClick={() => router.push('/dashboard/fund-wallet')}>
              <Send size={11} />
              Fund Wallet
            </button>
          </div>
          <div className="balance-amount-wrapper">
            <div className="balance-amount">
              {balanceVisible 
                ? `₦${balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                : '₦****.**'
              }
            </div>
            <button onClick={toggleBalanceVisibility} className="eye-button">
              {balanceVisible ? <Eye size={14} /> : <EyeOff size={14} />}
            </button>
          </div>
          <div className="balance-footer">Available to spend</div>
        </div>

        <div className="balance-card bonus-card">
          <div className="balance-header">
            <div className="balance-title">
              <Gift size={14} className="balance-icon bonus-icon" />
              <span>Bonus Earnings</span>
            </div>
            <button className="withdraw-btn" onClick={() => router.push('/dashboard/withdraw-bonus')}>
              <ArrowDownLeft size={11} />
              Withdraw
            </button>
          </div>
          <div className="balance-amount bonus-amount">
            ₦{bonusBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="balance-footer">From referrals & cashback</div>
        </div>
      </div>

      {/* Quick Actions Grid */}
      <div className="quick-actions-header">
        <div>
          <h2>Quick Actions</h2>
          <p>Fast access to your favorite services</p>
        </div>
      </div>
      <div className="quick-actions-grid">
        {quickActions.map((action, index) => {
          const Icon = action.icon;
          return (
            <button
              key={index}
              className="action-card"
              onClick={() => router.push(action.path)}
              style={{ background: action.bgColor }}
            >
              <Icon size={28} strokeWidth={2.5} color="white" />
              <span className="action-label">{action.label}</span>
            </button>
          );
        })}
      </div>

      {/* Recent Transactions Section */}
      <div className="recent-transactions-section">
        <div className="section-header-row">
          <h2 style={{ whiteSpace: 'nowrap' }}>Recent Transactions</h2>
          {transactions.length > 0 && (
            <button 
              onClick={() => router.push('/dashboard/transaction-history')}
              className="view-all-btn"
            >
              View All <ChevronRight size={16} />
            </button>
          )}
        </div>

        {transactions.length === 0 ? (
          <div className="empty-transactions">
            <History size={48} style={{ color: '#9ca3af', opacity: 0.5 }} />
            <p className="empty-text">No transactions yet</p>
            <p className="empty-subtext">Your transaction history will appear here</p>
          </div>
        ) : (
          <div className="transactions-list">
            {transactions.slice(0, 3).map((tx) => {
              const icon = getTransactionIcon(tx);
              const IconComponent = icon.name === 'x-circle' ? X : 
                                   icon.name === 'arrow-down' ? ArrowDownLeft : 
                                   ArrowUpRight;
              
              return (
                <div
                  key={tx._id}
                  onClick={() => handleTransactionPress(tx)}
                  className="transaction-item"
                >
                  <div className="transaction-left">
                    <div className="transaction-icon" style={{ backgroundColor: icon.bg }}>
                      <IconComponent size={20} style={{ color: icon.color }} />
                    </div>
                    <div className="transaction-info">
                      <div className="transaction-title">
                        {tx.description || `${tx.type} transaction`}
                      </div>
                      <div className="transaction-date">
                        {formatTransactionDate(tx.createdAt)}
                      </div>
                    </div>
                  </div>
                  <div className="transaction-right">
                    <div className="transaction-amount" style={{ color: getTransactionColor(tx) }}>
                      {tx.type === 'credit' || tx.type === 'transfer_in' ? '+' : '−'}₦{tx.amount.toFixed(2)}
                    </div>
                    <div className="transaction-status" style={{
                      color: tx.status === 'completed' ? '#22c55e' : 
                             tx.status === 'pending' ? '#f59e0b' : '#dc2626'
                    }}>
                      {tx.status}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <style jsx>{`
        .dashboard-content {
          padding: 16px 24px;
          max-width: 1400px;
          margin: 0 auto;
        }

        .dashboard-header-section {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 16px;
          cursor: pointer;
          width: fit-content;
          transition: all 0.2s ease;
        }

        .dashboard-header-section:hover {
          opacity: 0.8;
        }

        .dashboard-header-icon {
          color: #4b5563;
          flex-shrink: 0;
        }

        .dashboard-header-slash {
          font-size: 18px;
          font-weight: 400;
          color: #9ca3af;
          margin: 0 -2px;
        }

        .dashboard-header-title {
          font-size: 20px;
          font-weight: 700;
          color: #dc2626;
          margin: 0;
        }

        .funding-accounts-section {
          background: white;
          border-radius: 10px;
          padding: 16px;
          border: 1px solid #e5e7eb;
          margin-bottom: 16px;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
        }

        .funding-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 12px;
          flex-wrap: wrap;
        }

        .funding-icon {
          color: #dc2626;
        }

        .funding-title {
          font-size: 15px;
          font-weight: 700;
          color: #1f2937;
          margin: 0;
          flex: 1;
        }

        .funding-account-card {
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 10px;
          margin-bottom: 8px;
        }

        .account-number-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 4px;
        }

        .account-number {
          font-size: 16px;
          font-weight: 700;
          color: #1f2937;
          letter-spacing: 0.5px;
        }

        .copy-button {
          background: none;
          border: none;
          cursor: pointer;
          padding: 4px;
          display: flex;
          align-items: center;
          transition: all 0.2s ease;
        }

        .copy-button:hover {
          opacity: 0.7;
        }

        .account-bank {
          font-size: 12px;
          font-weight: 600;
          color: #4b5563;
        }

        .account-names {
          background: #fef2f2;
          border-left: 3px solid #dc2626;
          padding: 10px;
          border-radius: 6px;
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          align-items: center;
          margin-top: 8px;
        }

        .account-names-label {
          font-size: 12px;
          font-weight: 700;
          color: #1f2937;
        }

        .account-names-text {
          font-size: 12px;
          font-weight: 600;
          color: #dc2626;
        }

        .loading-account {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          padding: 32px;
        }

        .balance-cards-row {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 12px;
          margin-bottom: 20px;
        }

        @media (max-width: 768px) {
          .bonus-card {
            display: none;
          }
        }

        .balance-card {
          background: white;
          border-radius: 10px;
          padding: 12px;
          border: 1px solid #e5e7eb;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
        }

        .balance-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }

        .balance-title {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          font-weight: 600;
          color: #1f2937;
        }

        .balance-icon {
          color: #dc2626;
        }

        .bonus-icon {
          color: #22c55e;
        }

        .fund-btn, .withdraw-btn {
          display: flex;
          align-items: center;
          gap: 4px;
          background: #dc2626;
          border: none;
          color: white;
          padding: 4px 8px;
          border-radius: 5px;
          font-size: 11px;
          font-weight: 600;
          cursor: pointer;
          height: 28px;
          transition: all 0.2s ease;
        }

        .fund-btn:hover, .withdraw-btn:hover {
          opacity: 0.9;
          transform: translateY(-1px);
        }

        .withdraw-btn {
          background: #22c55e;
        }

        .balance-amount-wrapper {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 4px;
        }

        .balance-amount {
          font-size: 20px;
          font-weight: 800;
          letter-spacing: -0.5px;
          color: #dc2626;
        }

        .bonus-amount {
          color: #22c55e;
        }

        .eye-button {
          background: none;
          border: none;
          cursor: pointer;
          padding: 4px;
          display: flex;
          align-items: center;
          color: #6b7280;
          transition: all 0.2s ease;
        }

        .eye-button:hover {
          color: #dc2626;
        }

        .balance-footer {
          font-size: 11px;
          color: #6b7280;
          font-weight: 500;
        }

        .quick-actions-header {
          margin-bottom: 16px;
        }

        .quick-actions-header h2 {
          font-size: 18px;
          font-weight: 700;
          color: #1f2937;
          margin: 0 0 4px 0;
        }

        .quick-actions-header p {
          font-size: 13px;
          color: #6b7280;
          font-weight: 500;
          margin: 0;
        }

        .quick-actions-grid {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-bottom: 30px;
          max-width: 350px;
        }

        .action-card {
          background: white;
          border: none;
          border-radius: 12px;
          padding: 16px 18px;
          display: flex;
          flex-direction: row;
          align-items: center;
          gap: 14px;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          height: 72px;
        }
.action-card:hover {
transform: translateY(-2px);
box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}
.action-label {
      font-size: 15px;
      font-weight: 700;
      color: white;
      text-align: left;
      line-height: 1.3;
    }

    .recent-transactions-section {
      margin-top: 30px;
    }

    .section-header-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }

    .section-header-row h2 {
      font-size: 18px;
      font-weight: 700;
      color: #1f2937;
      margin: 0;
    }

    .view-all-btn {
      display: flex;
      align-items: center;
      gap: 4px;
      background: none;
      border: none;
      color: #dc2626;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      padding: 6px 12px;
      border-radius: 6px;
      transition: all 0.2s ease;
    }

    .view-all-btn:hover {
      background: #fef2f2;
    }

    .empty-transactions {
      background: white;
      border-radius: 12px;
      padding: 48px 24px;
      text-align: center;
      border: 1px solid #e5e7eb;
    }

    .empty-text {
      font-size: 16px;
      font-weight: 600;
      color: #4b5563;
      margin: 12px 0 4px 0;
    }

    .empty-subtext {
      font-size: 13px;
      color: #9ca3af;
      margin: 0;
    }

    .transactions-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .transaction-item {
      background: white;
      border-radius: 12px;
      padding: 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      cursor: pointer;
      border: 1px solid #e5e7eb;
      transition: all 0.2s ease;
    }

    .transaction-item:hover {
      transform: translateX(4px);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
      border-color: #dc2626;
    }

    .transaction-left {
      display: flex;
      align-items: center;
      gap: 12px;
      flex: 1;
      min-width: 0;
    }

    .transaction-icon {
      width: 44px;
      height: 44px;
      border-radius: 22px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .transaction-info {
      flex: 1;
      min-width: 0;
    }

    .transaction-title {
      font-size: 14px;
      font-weight: 600;
      color: #1f2937;
      margin-bottom: 4px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .transaction-date {
      font-size: 12px;
      color: #6b7280;
      font-weight: 500;
    }

    .transaction-right {
      text-align: right;
      flex-shrink: 0;
    }

    .transaction-amount {
      font-size: 16px;
      font-weight: 700;
      margin-bottom: 4px;
    }

    .transaction-status {
      font-size: 11px;
      font-weight: 600;
      text-transform: capitalize;
    }

    @media (max-width: 768px) {
      .dashboard-content {
        padding: 12px;
      }

      .quick-actions-grid {
        gap: 10px;
      }

      .action-card {
        padding: 16px 20px;
        gap: 16px;
        height: 70px;
      }

      .action-label {
        font-size: 14px;
      }
    }

    @media (max-width: 480px) {
      .action-card {
        padding: 14px;
        gap: 10px;
      }

      .action-label {
        font-size: 13px;
      }
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `}
  </style>
</div>
 );
}