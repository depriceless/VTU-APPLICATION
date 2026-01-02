'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Home, ArrowUpRight, AlertCircle, X, ChevronLeft, RefreshCw, Printer, Download } from 'lucide-react';
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

export default function WalletStatement() {
  const router = useRouter();
  const { user: contextUser } = useAuth();
  
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const isMountedRef = useRef(true);
  const statementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const fetchTransactions = async () => {
    if (!isMountedRef.current) return;

    try {
      console.log('🔍 Fetching wallet transactions...');
      const response = await apiClient.get('/transactions');
      
      if (response.data?.success && isMountedRef.current) {
        const txData = response.data.transactions || [];
        
        const formattedTransactions = txData.map((tx: any, index: number) => ({
          _id: tx._id || tx.id || `tx_${Date.now()}_${index}`,
          type: tx.type || 'debit',
          amount: parseFloat(tx.amount || 0),
          date: tx.createdAt || tx.date || new Date().toISOString(),
          createdAt: tx.createdAt || tx.date || new Date().toISOString(),
          status: tx.status || 'completed',
          description: tx.description || `${tx.category || 'Transaction'}`,
          reference: tx.reference || `REF_${tx._id || Date.now()}_${index}`,
          category: tx.category || 'general',
          previousBalance: tx.previousBalance || 0,
          newBalance: tx.newBalance || 0,
          gateway: tx.gateway || {},
          metadata: tx.metadata || {}
        }));
        
        formattedTransactions.sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        
        // Limit to 500 transactions
        const limitedTransactions = formattedTransactions.slice(0, 500);
        
        setTransactions(limitedTransactions);
        setApiError(null);
        console.log('✅ Wallet transactions loaded:', limitedTransactions.length);
      } else if (isMountedRef.current) {
        setTransactions([]);
      }
    } catch (error: any) {
      if (isMountedRef.current) {
        console.error('❌ Error fetching transactions:', error);
        setTransactions([]);
        
        if (error.status !== 401) {
          setApiError('Unable to fetch wallet statement. Please check your connection.');
        }
      }
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      await fetchTransactions();
      setIsLoading(false);
    };

    fetchData();
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchTransactions();
    setIsRefreshing(false);
  };

  const formatTransactionDate = (dateString: string): string => {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    
    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    const ampm = hours >= 12 ? 'pm' : 'am';
    
    hours = hours % 12;
    hours = hours ? hours : 12;
    const hoursStr = String(hours).padStart(2, '0');
    
    return `${day}-${month}-${year} ${hoursStr}:${minutes}:${seconds} ${ampm}`;
  };

  const handlePrint = () => {
    // Get the statement content
    const printContent = statementRef.current;
    if (!printContent) return;

    // Create a new window for printing
    const printWindow = window.open('', '', 'width=800,height=600');
    if (!printWindow) return;

    // Write the content to the new window
    printWindow.document.write(`
      <html>
        <head>
          <title>Wallet Statement</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: Arial, sans-serif;
              padding: 20px;
            }
            .page-title-section {
              padding: 20px;
              margin-bottom: 20px;
              border-bottom: 2px solid #000;
            }
            .page-title {
              font-size: 16px;
              font-weight: 700;
              color: #dc2626;
              text-align: center;
              letter-spacing: 0.5px;
            }
            .table-container {
              border: 1px solid #e5e7eb;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              font-size: 10px;
            }
            thead {
              background: #f9fafb;
              border-bottom: 2px solid #e5e7eb;
            }
            th {
              padding: 10px 8px;
              text-align: left;
              font-size: 11px;
              font-weight: 700;
              color: #374151;
              text-transform: uppercase;
              border: 1px solid #ddd;
            }
            td {
              padding: 8px;
              color: #4b5563;
              font-size: 10px;
              border: 1px solid #e5e7eb;
            }
            tbody tr:nth-child(even) {
              background: #f9fafb;
            }
            .text-center {
              text-align: center;
            }
            @media print {
              body {
                padding: 10px;
              }
              table {
                font-size: 9px;
              }
              th, td {
                padding: 6px 4px;
              }
            }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  const handleDownload = () => {
    // Create CSV content
    const headers = ['S/N', 'Activity', 'Previous Balance', 'New Balance', 'Reference', 'Date'];
    const rows = transactions.map((tx, index) => [
      index + 1,
      tx.description || 'Transaction',
      `₦${tx.previousBalance?.toFixed(2) || '0.00'}`,
      `₦${tx.newBalance?.toFixed(2) || '0.00'}`,
      tx.reference,
      formatTransactionDate(tx.createdAt)
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `wallet-statement-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="page-container">
        <div className="loading-wrapper">
          <div className="spinner"></div>
          <p className="loading-text">Loading wallet statement...</p>
        </div>
        <style jsx global>{`
        @media print {
          /* Hide all body children except main content */
          body > *:not(main):not(div:has(.page-container)) {
            display: none !important;
          }
          
          /* Target specific sidebar elements */
          aside,
          nav:not(.page-container nav),
          [role="navigation"]:not(.page-container [role="navigation"]),
          [class*="sidebar" i],
          [class*="Sidebar" i],
          [id*="sidebar" i],
          [id*="Sidebar" i] {
            display: none !important;
          }
        }
      `}</style>

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
      {/* Header */}
      <div className="header-section no-print">
        <button onClick={() => router.back()} className="back-button">
          <ChevronLeft size={20} strokeWidth={2.5} />
        </button>
        <div className="header-content">
          <Home size={20} className="header-icon" strokeWidth={2.5} />
          <span className="header-slash">/</span>
          <h1 className="header-title">Wallet Statement</h1>
        </div>
        <div className="header-actions">
          <button onClick={handleDownload} className="action-btn download-btn">
            <Download size={18} />
          </button>
          <button onClick={handlePrint} className="action-btn print-btn">
            <Printer size={18} />
          </button>
          <button 
            onClick={handleRefresh} 
            className={`action-btn refresh-btn ${isRefreshing ? 'refreshing' : ''}`}
            disabled={isRefreshing}
          >
            <RefreshCw size={18} />
          </button>
        </div>
      </div>

      {/* API Error Alert */}
      {apiError && (
        <div className="error-alert no-print">
          <AlertCircle size={18} className="error-icon" />
          <div className="error-content">
            <p className="error-text">{apiError}</p>
          </div>
          <button onClick={() => setApiError(null)} className="error-close">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Statement Content */}
      <div className="statement-content" ref={statementRef}>
        {/* Page Title */}
        <div className="page-title-section">
          <h2 className="page-title">E-STATEMENT FOR LAST {transactions.length} TRANSACTIONS</h2>
        </div>

        {/* Transactions Table */}
        {transactions.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon-wrapper">
              <ArrowUpRight size={64} className="empty-icon" />
            </div>
            <p className="empty-title">No Transactions</p>
            <p className="empty-subtitle">Your wallet transactions will appear here</p>
            <button onClick={() => router.push('/dashboard')} className="dashboard-button">
              Go to Dashboard
            </button>
          </div>
        ) : (
          <div className="table-container">
            <div className="table-wrapper">
              <table className="transactions-table">
                <thead>
                  <tr>
                    <th>S/N</th>
                    <th>Activity</th>
                    <th>Previous Balance</th>
                    <th>New Balance</th>
                    <th>Reference</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx, index) => (
                    <tr key={tx._id} className="table-row">
                      <td className="text-center">{index + 1}</td>
                      <td className="activity-cell">{tx.description}</td>
                      <td className="balance-cell">₦{tx.previousBalance?.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) || '0'}</td>
                      <td className="balance-cell">₦{tx.newBalance?.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) || '0'}</td>
                      <td className="reference-cell">{tx.reference}</td>
                      <td className="date-cell">{formatTransactionDate(tx.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

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

        .header-actions {
          display: flex;
          gap: 8px;
        }

        .action-btn {
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

        .action-btn:hover:not(:disabled) {
          background: #fef2f2;
          border-color: #dc2626;
          color: #dc2626;
        }

        .action-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .refresh-btn.refreshing {
          animation: spin 1s linear infinite;
        }

        .download-btn {
          color: #059669;
        }

        .download-btn:hover {
          background: #ecfdf5;
          border-color: #059669;
          color: #059669;
        }

        .print-btn {
          color: #7c3aed;
        }

        .print-btn:hover {
          background: #f5f3ff;
          border-color: #7c3aed;
          color: #7c3aed;
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

        .statement-content {
          background: white;
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
          background: #fef2f2;
          border-radius: 60px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 24px;
        }

        .empty-icon {
          color: #dc2626;
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

        .dashboard-button {
          background: #dc2626;
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .dashboard-button:hover {
          background: #b91c1c;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(220, 38, 38, 0.3);
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
          font-size: 13px;
          min-width: 1000px;
        }

        .transactions-table thead {
          background: #f9fafb;
          border-bottom: 2px solid #e5e7eb;
        }

        .transactions-table th {
          padding: 14px 12px;
          text-align: left;
          font-size: 12px;
          font-weight: 700;
          color: #374151;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          white-space: nowrap;
        }

        .transactions-table tbody tr {
          border-bottom: 1px solid #f3f4f6;
          transition: background-color 0.15s ease;
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
          vertical-align: middle;
        }

        .text-center {
          text-align: center;
        }

        .activity-cell {
          font-weight: 500;
          max-width: 400px;
        }

        .balance-cell {
          font-weight: 600;
          color: #1f2937;
        }

        .reference-cell {
          font-size: 12px;
          max-width: 250px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .date-cell {
          font-size: 12px;
          white-space: nowrap;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        /* Print Styles */
        @media print {
          /* Hide navigation elements only */
          .no-print {
            display: none !important;
          }

          /* Target common sidebar class patterns */
          aside,
          nav,
          [class*="sidebar"],
          [class*="Sidebar"],
          [class*="nav-"],
          [id*="sidebar"],
          [id*="Sidebar"] {
            display: none !important;
          }

          .page-container {
            position: static;
            width: 100%;
            padding: 20px;
            margin: 0;
            max-width: 100%;
          }

          .statement-content {
            box-shadow: none;
          }

          .page-title-section {
            border: none;
            border-radius: 0;
            border-bottom: 2px solid #000;
            page-break-after: avoid;
            margin-bottom: 20px;
          }

          .page-title {
            color: #000 !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .table-container {
            border: 1px solid #000;
            border-radius: 0;
            box-shadow: none;
          }

          .transactions-table {
            font-size: 9px;
          }

          .transactions-table th,
          .transactions-table td {
            padding: 6px 4px;
            border: 1px solid #ddd;
          }

          .transactions-table thead {
            background: #f0f0f0 !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .transactions-table th {
            color: #000 !important;
            border: 1px solid #000;
          }

          .transactions-table tbody tr:hover {
            background: transparent;
          }
        }

        @media (max-width: 768px) {
          .page-container {
            padding: 12px 16px;
          }

          .header-title {
            font-size: 16px;
          }

          .page-title {
            font-size: 14px;
          }

          .transactions-table {
            font-size: 11px;
          }

          .transactions-table th,
          .transactions-table td {
            padding: 10px 8px;
          }
        }
      `}</style>
    </div>
  );
}