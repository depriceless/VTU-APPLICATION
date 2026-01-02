'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Home, ArrowDownLeft, AlertCircle, X, ChevronLeft, RefreshCw } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import apiClient from '@/lib/api';

interface Transaction {
  _id: string;
  type: string;
  amount: number;
  date: string;
  createdAt: string;
  status: string;
  description?: string;
  reference: string;
  category: string;
  previousBalance?: number;
  newBalance?: number;
  gateway?: {
    provider?: string;
    gatewayReference?: string;
  };
  metadata?: any;
}

export default function PaymentHistory() {
  const router = useRouter();
  const { user: contextUser } = useAuth();
  
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Fetch transactions and filter for payments only
  const fetchPaymentTransactions = async () => {
    if (!isMountedRef.current) return;

    try {
      console.log('🔍 Fetching payment transactions...');
      const response = await apiClient.get('/transactions');
      
      if (response.data?.success && isMountedRef.current) {
        const txData = response.data.transactions || [];
        
        // Filter for PAYMENT transactions only (money IN - excluding service purchases)
        const paymentTransactions = txData.filter((tx: any) => {
          // Service categories that should NOT be in payment history
          const serviceCategories = [
            'airtime', 'data', 'cable-tv', 'electricity', 
            'betting', 'internet', 'education', 'payment'
          ];
          
          // Exclude if it's a service category
          if (tx.category && serviceCategories.includes(tx.category)) {
            return false;
          }
          
          // Exclude if description contains service keywords
          const description = (tx.description || '').toLowerCase();
          const serviceKeywords = [
            'airtime', 'data', 'cable', 'tv', 'dstv', 'gotv', 'startimes',
            'electricity', 'power', 'nepa', 'phcn', 'betting', 'bet',
            'internet', 'wifi', 'education', 'waec', 'jamb', 'neco'
          ];
          
          if (serviceKeywords.some(keyword => description.includes(keyword))) {
            return false;
          }
          
          // Include credits, debits (non-service), transfers in, funding, deposits
          return (
            tx.type === 'credit' || 
            tx.type === 'debit' ||
            tx.type === 'transfer_in' ||
            tx.category === 'funding' ||
            tx.category === 'deposit'
          );
        });
        
        const formattedTransactions = paymentTransactions.map((tx: any, index: number) => ({
          _id: tx._id || tx.id || `tx_${Date.now()}_${index}`,
          type: tx.type || 'credit',
          amount: parseFloat(tx.amount || 0),
          date: tx.createdAt || tx.date || new Date().toISOString(),
          createdAt: tx.createdAt || tx.date || new Date().toISOString(),
          status: tx.status || 'completed',
          description: tx.description || `${tx.type || 'Payment'} transaction`,
          reference: tx.reference || `REF_${tx._id || Date.now()}_${index}`,
          category: tx.category || 'funding',
          previousBalance: tx.previousBalance || 0,
          newBalance: tx.newBalance || 0,
          gateway: tx.gateway || {},
          metadata: tx.metadata || {}
        }));
        
        // Sort by date (newest first)
        formattedTransactions.sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        
        setTransactions(formattedTransactions);
        setApiError(null);
        console.log('✅ Payment transactions loaded:', formattedTransactions.length);
      } else if (isMountedRef.current) {
        setTransactions([]);
      }
    } catch (error: any) {
      if (isMountedRef.current) {
        console.error('❌ Error fetching payment transactions:', error);
        setTransactions([]);
        
        if (error.status !== 401) {
          setApiError('Unable to fetch payment history. Please check your connection.');
        }
      }
    }
  };

  // Initial fetch
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      await fetchPaymentTransactions();
      setIsLoading(false);
    };

    fetchData();
  }, []);

  // Handle refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchPaymentTransactions();
    setIsRefreshing(false);
  };

  // Format date
  const formatTransactionDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }) + ' ' + date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  // Get gateway name
  const getGatewayName = (transaction: Transaction): string => {
    if (transaction.gateway?.provider) {
      return transaction.gateway.provider;
    }
    if (transaction.category === 'funding') {
      return 'Bank - AutoFunding';
    }
    return 'Manual';
  };

  // Handle transaction click
  const handleTransactionPress = (transaction: Transaction) => {
    router.push(`/transaction-details?data=${encodeURIComponent(JSON.stringify(transaction))}`);
  };

  if (isLoading) {
    return (
      <div className="page-container">
        <div className="loading-wrapper">
          <div className="spinner"></div>
          <p className="loading-text">Loading payment history...</p>
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
            border-top-color: #22c55e;
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
      {/* Header */}
      <div className="header-section">
        <button onClick={() => router.back()} className="back-button">
          <ChevronLeft size={20} strokeWidth={2.5} />
        </button>
        <div className="header-content">
          <Home size={20} className="header-icon" strokeWidth={2.5} />
          <span className="header-slash">/</span>
          <h1 className="header-title">Payment History</h1>
        </div>
        <button 
          onClick={handleRefresh} 
          className={`refresh-button ${isRefreshing ? 'refreshing' : ''}`}
          disabled={isRefreshing}
        >
          <RefreshCw size={18} />
        </button>
      </div>

      {/* API Error Alert */}
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

      {/* Page Title */}
      <div className="page-title-section">
        <h2 className="page-title">INSTANT FUNDING (ATM CARD & BANK-AUTO FUNDING) PAYMENT HISTORY</h2>
      </div>

      {/* Transactions Table */}
      {transactions.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon-wrapper">
            <ArrowDownLeft size={64} className="empty-icon" />
          </div>
          <p className="empty-title">No Payment History</p>
          <p className="empty-subtitle">Your payment transactions will appear here</p>
          <button onClick={() => router.push('/dashboard/fund-wallet')} className="fund-button">
            Fund Your Wallet
          </button>
        </div>
      ) : (
        <div className="table-container">
          <div className="table-wrapper">
            <table className="transactions-table">
              <thead>
                <tr>
                  <th>S/N</th>
                  <th>Amount</th>
                  <th>Transaction Reference</th>
                  <th>Gateway</th>
                  <th>Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx, index) => (
                  <tr 
                    key={tx._id}
                    className="table-row"
                  >
                    <td>{index + 1}</td>
                    <td className="amount-cell">₦{tx.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="reference-cell">{tx.reference}</td>
                    <td>{getGatewayName(tx)}</td>
                    <td className="date-cell">{formatTransactionDate(tx.createdAt)}</td>
                    <td>
                      <span className={`status-badge status-${tx.status.toLowerCase()}`}>
                        {tx.status === 'completed' ? 'Successful' : tx.status.charAt(0).toUpperCase() + tx.status.slice(1)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <style jsx>{`
        .page-container {
          padding: 16px 24px;
          max-width: 1400px;
          margin: 0 auto;
        }

        .header-section {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 20px;
        }

        .back-button {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 8px;
          cursor: pointer;
          display: flex;
          align-items: center;
          transition: all 0.2s ease;
          color: #4b5563;
        }

        .back-button:hover {
          background: #fef2f2;
          border-color: #dc2626;
          color: #dc2626;
        }

        .header-content {
          display: flex;
          align-items: center;
          gap: 8px;
          flex: 1;
        }

        .header-icon {
          color: #4b5563;
          flex-shrink: 0;
        }

        .header-slash {
          font-size: 18px;
          font-weight: 400;
          color: #9ca3af;
          margin: 0 -2px;
        }

        .header-title {
          font-size: 20px;
          font-weight: 700;
          color: #dc2626;
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
          color: #22c55e;
        }

        .refresh-button:hover:not(:disabled) {
          background: #f0fdf4;
          border-color: #22c55e;
        }

        .refresh-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .refresh-button.refreshing {
          animation: spin 1s linear infinite;
        }

        .error-alert {
          background: #fee2e2;
          border: 1px solid #fca5a5;
          border-radius: 8px;
          padding: 12px 16px;
          margin-bottom: 16px;
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

        .page-title-section {
          background: white;
          border-radius: 12px;
          padding: 20px 24px;
          margin-bottom: 24px;
          border: 1px solid #e5e7eb;
        }

        .page-title {
          font-size: 16px;
          font-weight: 700;
          color: #dc2626;
          margin: 0;
          text-align: center;
          letter-spacing: 0.5px;
        }

        .empty-state {
          background: white;
          border-radius: 12px;
          padding: 60px 24px;
          text-align: center;
          border: 1px solid #e5e7eb;
        }

        .empty-icon-wrapper {
          width: 120px;
          height: 120px;
          background: #f0fdf4;
          border-radius: 60px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 24px;
        }

        .empty-icon {
          color: #22c55e;
          opacity: 0.5;
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
          margin: 0 0 24px 0;
        }

        .fund-button {
          background: #22c55e;
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .fund-button:hover {
          background: #16a34a;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(34, 197, 94, 0.3);
        }

        .table-container {
          background: white;
          border-radius: 12px;
          border: 1px solid #e5e7eb;
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .table-wrapper {
          overflow-x: auto;
        }

        .transactions-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 14px;
        }

        .transactions-table thead {
          background: #f9fafb;
          border-bottom: 2px solid #e5e7eb;
        }

        .transactions-table th {
          padding: 16px 12px;
          text-align: left;
          font-weight: 700;
          color: #1f2937;
          font-size: 13px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          white-space: nowrap;
        }

        .transactions-table tbody tr {
          border-bottom: 1px solid #f3f4f6;
          transition: all 0.2s ease;
        }

        .transactions-table tbody tr:hover {
          background: #f9fafb;
        }

        .transactions-table tbody tr:last-child {
          border-bottom: none;
        }

        .transactions-table td {
          padding: 14px 12px;
          color: #4b5563;
          font-size: 13px;
        }

        .amount-cell {
          font-weight: 700;
          color: #22c55e;
          font-size: 14px;
        }

        .reference-cell {
          font-size: 13px;
          color: #4b5563;
          max-width: 200px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .date-cell {
          font-size: 12px;
          color: #6b7280;
          white-space: nowrap;
        }

        .status-badge {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 600;
          text-transform: capitalize;
        }

        .status-completed,
        .status-success {
          background: #22c55e;
          color: white;
          padding: 6px 14px;
        }

        .status-pending {
          background: #fef3c7;
          color: #d97706;
        }

        .status-failed {
          background: #fee2e2;
          color: #dc2626;
        }

        @media (max-width: 768px) {
          .page-container {
            padding: 12px;
          }

          .header-title {
            font-size: 16px;
          }

          .page-title {
            font-size: 13px;
          }

          .transactions-table {
            font-size: 12px;
          }

          .transactions-table th {
            padding: 12px 8px;
            font-size: 11px;
          }

          .transactions-table td {
            padding: 12px 8px;
            font-size: 12px;
          }

          .reference-cell {
            max-width: 120px;
          }
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}