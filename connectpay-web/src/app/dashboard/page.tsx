'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Home, Smartphone, Wifi, Tv, Zap, Printer, DollarSign, Globe,
  GraduationCap, History, HelpCircle, Gift, Send, ArrowUpRight,
  ArrowDownLeft, AlertCircle, CreditCard, Copy, CheckCircle, X,
  Eye, EyeOff, Wallet, ChevronRight
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import apiClient from '@/lib/api';
import s from './Dashboard.module.css';

export default function DashboardPage() {
  const router = useRouter();
  const { user: contextUser, balance, refreshBalance } = useAuth();

  const [user, setUser]                     = useState<any>(null);
  const [bonusBalance, setBonusBalance]     = useState(0);
  const [transactions, setTransactions]     = useState<any[]>([]);
  const [virtualAccount, setVirtualAccount] = useState<any>(null);
  const [activeGateway, setActiveGateway]   = useState('');
  const [isLoading, setIsLoading]           = useState(true);
  const [balanceVisible, setBalanceVisible] = useState(true);
  const [apiError, setApiError]             = useState<string | null>(null);
  const [copiedField, setCopiedField]       = useState<string | null>(null);

  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (contextUser) {
      setUser({
        name:     contextUser.name     || 'User',
        email:    contextUser.email    || '',
        phone:    contextUser.phone,
        username: contextUser.username,
      });
    }
  }, [contextUser]);

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-US', { day: '2-digit', month: '2-digit', year: 'numeric' });

  const getTxIcon = (tx: any) => {
    if (tx.status === 'failed')                             return { bg: '#fee2e2', color: '#dc3545', Cmp: X };
    if (tx.type === 'credit' || tx.type === 'transfer_in') return { bg: '#e8f5e9', color: '#28a745', Cmp: ArrowDownLeft };
    return                                                         { bg: '#fee2e2', color: '#dc2626', Cmp: ArrowUpRight };
  };

  const getTxColor = (tx: any) => {
    if (tx.status === 'failed')                             return '#dc3545';
    if (tx.type === 'credit' || tx.type === 'transfer_in') return '#28a745';
    return '#ff2b2b';
  };

  const processAccountData = (data: any) => {
    if (!data?.gateway) return null;
    const gw = data.gateway.toLowerCase();
    const accounts: any[] = [];

    const push = (a: any) => accounts.push({
      bankName:      a.bankName      || a.bank_name      || 'Unknown Bank',
      accountNumber: a.accountNumber || a.account_number || '',
      accountName:   a.accountName   || a.account_name   || 'Unknown',
    });

    if (gw === 'paystack') {
      if (data.accountNumber) push(data);
      else (data.accounts || []).forEach(push);
    } else if (gw === 'monnify') {
      (data.accounts || []).forEach(push);
    }

    if (!accounts.length) return null;
    return { accounts, reference: data.reference || data.accountReference, gateway: gw };
  };

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    const fetchAll = async () => {
      setIsLoading(true);

      await Promise.allSettled([
        // Active gateway
        apiClient.get('/payment/active-gateway', { signal })
          .then(r => {
            if (r.data?.success) {
              const gw = r.data.activeGateway || r.data.data?.activeGateway;
              if (gw) setActiveGateway(gw.toLowerCase());
            }
          })
          .catch(() => {}),

        // Virtual account
        apiClient.get('/payment/virtual-account', { signal })
          .then(r => {
            if (r.data?.success && r.data?.data) {
              const processed = processAccountData(r.data.data);
              if (processed) {
                setVirtualAccount(processed);
                setActiveGateway(processed.gateway);
              }
            }
          })
          .catch((e) => {
            if (e?.code !== 'ERR_CANCELED') setApiError('Unable to fetch account details.');
          }),

        // Balance — from AuthContext, no extra fetch needed
        refreshBalance(),

        // Transactions
        apiClient.get('/transactions', { signal })
          .then(r => {
            if (r.data?.success) {
              const list = (r.data.transactions || []).map((tx: any, i: number) => ({
                _id:         tx._id || tx.id || `tx_${Date.now()}_${i}`,
                type:        tx.type || 'credit',
                amount:      parseFloat(tx.amount || 0),
                date:        tx.createdAt || tx.date || new Date().toISOString(),
                createdAt:   tx.createdAt || tx.date || new Date().toISOString(),
                status:      tx.status || 'completed',
                description: tx.description || `${tx.type || 'Transaction'} transaction`,
                reference:   tx.reference || `REF_${tx._id || Date.now()}_${i}`,
              }));
              setTransactions(list);
              setApiError(null);
            } else {
              setTransactions([]);
            }
          })
          .catch((e) => {
            if (e?.code !== 'ERR_CANCELED') {
              setTransactions([]);
              setApiError('Unable to fetch transactions.');
            }
          }),
      ]);

      setIsLoading(false);

      // Auto-refresh transactions and balance every 60s
      refreshIntervalRef.current = setInterval(() => {
        refreshBalance();
        apiClient.get('/transactions')
          .then(r => {
            if (r.data?.success) {
              setTransactions((r.data.transactions || []).map((tx: any, i: number) => ({
                _id:         tx._id || tx.id || `tx_${Date.now()}_${i}`,
                type:        tx.type || 'credit',
                amount:      parseFloat(tx.amount || 0),
                date:        tx.createdAt || tx.date || new Date().toISOString(),
                createdAt:   tx.createdAt || tx.date || new Date().toISOString(),
                status:      tx.status || 'completed',
                description: tx.description || `${tx.type || 'Transaction'} transaction`,
                reference:   tx.reference || `REF_${tx._id || Date.now()}_${i}`,
              })));
            }
          })
          .catch(() => {});
      }, 60_000);
    };

    fetchAll();

    return () => {
      controller.abort();
      if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    });
  };

  const quickActions = [
    { icon: Smartphone,    label: 'Buy Airtime',    bg: '#fbbf24', path: '/dashboard/buy-airtime' },
    { icon: Wifi,          label: 'Buy Data',        bg: '#64748b', path: '/dashboard/buy-data' },
    { icon: Tv,            label: 'TV Subscription', bg: '#64748b', path: '/dashboard/cable-tv' },
    { icon: Zap,           label: 'Electric Bill',   bg: '#ef4444', path: '/dashboard/electricity' },
    { icon: Globe,         label: 'Internet',        bg: '#06b6d4', path: '/dashboard/internet' },
    { icon: Printer,       label: 'E-Pins',          bg: '#22c55e', path: '/dashboard/print-recharge' },
    { icon: DollarSign,    label: 'Airtime to Cash', bg: '#f59e0b', path: '/dashboard/airtime-to-cash' },
    { icon: GraduationCap, label: 'Education',       bg: '#8b5cf6', path: '/dashboard/education' },
    { icon: HelpCircle,    label: 'Support',         bg: '#0ea5e9', path: '/dashboard/need-help' },
  ];

  if (isLoading) {
    return (
      <div className={s.dashboardContent}>
        <div className={s.loadingWrapper}>
          <div className={s.spinner} />
          <p style={{ color: '#6b7280', fontSize: 14, fontWeight: 500 }}>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={s.dashboardContent}>

      {/* Breadcrumb */}
      <div className={s.headerSection} onClick={() => router.push('/dashboard')}>
        <Home size={20} style={{ color: '#4b5563' }} strokeWidth={2.5} />
        <span className={s.headerSlash}>/</span>
        <h1 className={s.headerTitle}>Dashboard</h1>
      </div>

      {/* API error */}
      {apiError && (
        <div className={s.apiError}>
          <AlertCircle size={18} style={{ color: '#dc2626', flexShrink: 0 }} />
          <p style={{ margin: 0, fontSize: 14, color: '#991b1b', fontWeight: 600, flex: 1 }}>{apiError}</p>
          <button onClick={() => setApiError(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}>
            <X size={16} style={{ color: '#dc2626' }} />
          </button>
        </div>
      )}

      {/* Balance cards */}
      <div className={s.balanceCardsRow}>
        <div className={s.balanceCard}>
          <div className={s.balanceHeader}>
            <div className={s.balanceTitle}>
              <Wallet size={14} className={s.balanceIconRed} />
              <span>Wallet Balance</span>
            </div>
            <button className={s.fundBtn} onClick={() => router.push('/dashboard/fund-wallet')}>
              <Send size={11} /> Fund Wallet
            </button>
          </div>
          <div className={s.balanceAmountWrapper}>
            <span className={s.balanceAmount}>
              {balanceVisible
                ? `₦${balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                : '₦ • • • •'}
            </span>
            <button className={s.eyeButton} onClick={() => setBalanceVisible(v => !v)}>
              {balanceVisible ? <Eye size={14} /> : <EyeOff size={14} />}
            </button>
          </div>
          <div className={s.balanceFooter}>Available to spend</div>
        </div>

        <div className={`${s.balanceCard} ${s.bonusCard}`}>
          <div className={s.balanceHeader}>
            <div className={s.balanceTitle}>
              <Gift size={14} className={s.balanceIconGreen} />
              <span>Bonus Earnings</span>
            </div>
            <button className={s.withdrawBtn} onClick={() => router.push('/dashboard/withdraw-bonus')}>
              <ArrowDownLeft size={11} /> Withdraw
            </button>
          </div>
          <div className={`${s.balanceAmount} ${s.bonusAmount}`}>
            ₦{bonusBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className={s.balanceFooter}>From referrals &amp; cashback</div>
        </div>
      </div>

      {/* Virtual account */}
      <div className={s.fundingSection}>
        <div className={s.fundingHeader}>
          <CreditCard size={16} style={{ color: '#dc2626' }} />
          <h3 className={s.fundingTitle}>Auto Funding Account</h3>
        </div>

        {virtualAccount?.accounts?.length ? (
          <>
            {virtualAccount.accounts.map((acc: any, i: number) => (
              <div key={i} className={s.fundingAccountCard}>
                <div className={s.accountNumberRow}>
                  <span className={s.accountNumber}>{acc.accountNumber}</span>
                  <button
                    className={s.copyButton}
                    onClick={() => copyToClipboard(acc.accountNumber, `acct-${i}`)}
                  >
                    {copiedField === `acct-${i}` ? (
                      <><CheckCircle size={13} style={{ color: '#4ade80' }} /> Copied!</>
                    ) : (
                      <><Copy size={13} /> Copy</>
                    )}
                  </button>
                </div>
                <div className={s.accountBank}>{acc.bankName}</div>
              </div>
            ))}
            <div className={s.accountNames}>
              <span className={s.accountNamesLabel}>Account Name:</span>
              <span className={s.accountNamesText}>{virtualAccount.accounts[0].accountName}</span>
            </div>
          </>
        ) : (
          <div className={s.loadingAccount}>
            <div className={s.spinner} style={{ width: 24, height: 24, borderWidth: 3 }} />
            <p style={{ margin: 0, fontSize: 13, color: '#9ca3af' }}>Loading account details...</p>
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div className={s.quickActionsHeader}>
        <h2>Quick Actions</h2>
        <p>Fast access to your favorite services</p>
      </div>
      <div className={s.quickActionsGrid}>
        {quickActions.map((a, i) => {
          const Icon = a.icon;
          return (
            <button key={i} className={s.actionCard} style={{ background: a.bg }} onClick={() => router.push(a.path)}>
              <Icon size={28} strokeWidth={2.5} color="white" />
              <span className={s.actionLabel}>{a.label}</span>
            </button>
          );
        })}
      </div>

      {/* Recent transactions */}
      <div className={s.recentTransactionsSection}>
        <div className={s.sectionHeaderRow}>
          <h2>Recent Transactions</h2>
          {transactions.length > 0 && (
            <button className={s.viewAllBtn} onClick={() => router.push('/dashboard/transaction-history')}>
              View All <ChevronRight size={16} />
            </button>
          )}
        </div>

        {transactions.length === 0 ? (
          <div className={s.emptyTransactions}>
            <History size={48} style={{ color: '#9ca3af', opacity: 0.5 }} />
            <p className={s.emptyText}>No transactions yet</p>
            <p className={s.emptySubtext}>Your transaction history will appear here</p>
          </div>
        ) : (
          <div className={s.transactionsList}>
            {transactions.slice(0, 3).map(tx => {
              const { bg, color, Cmp } = getTxIcon(tx);
              return (
                <div key={tx._id} className={s.transactionItem}
                  onClick={() => router.push(`/dashboard/transaction-details?data=${encodeURIComponent(JSON.stringify(tx))}`)}>
                  <div className={s.transactionLeft}>
                    <div className={s.transactionIcon} style={{ backgroundColor: bg }}>
                      <Cmp size={20} style={{ color }} />
                    </div>
                    <div className={s.transactionInfo}>
                      <div className={s.transactionTitle}>{tx.description}</div>
                      <div className={s.transactionDate}>{formatDate(tx.createdAt)}</div>
                    </div>
                  </div>
                  <div className={s.transactionRight}>
                    <div className={s.transactionAmount} style={{ color: getTxColor(tx) }}>
                      {tx.type === 'credit' || tx.type === 'transfer_in' ? '+' : '−'}₦{tx.amount.toFixed(2)}
                    </div>
                    <div className={s.transactionStatus} style={{
                      color: tx.status === 'completed' ? '#22c55e' : tx.status === 'pending' ? '#f59e0b' : '#dc2626'
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
    </div>
  );
}