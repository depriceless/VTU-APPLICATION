'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Home, ArrowUpRight, AlertCircle, X, ChevronLeft, RefreshCw, Printer } from 'lucide-react';
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

export default function PurchaseHistory() {
  const router = useRouter();
  const { user: contextUser } = useAuth();
  
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);

  const isMountedRef = useRef(true);
  const receiptRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const fetchPurchaseTransactions = async () => {
    if (!isMountedRef.current) return;

    try {
      console.log('🔍 Fetching purchase transactions...');
      const response = await apiClient.get('/transactions');
      
      if (response.data?.success && isMountedRef.current) {
        const txData = response.data.transactions || [];
        
        const purchaseTransactions = txData.filter((tx: any) => {
          const serviceCategories = [
            'airtime', 'data', 'cable-tv', 'electricity', 
            'betting', 'internet', 'education', 'payment'
          ];
          
          if (tx.category && serviceCategories.includes(tx.category)) {
            return true;
          }
          
          if (tx.type === 'transfer_out') {
            return true;
          }
          
          const description = (tx.description || '').toLowerCase();
          const serviceKeywords = [
            'airtime', 'data', 'cable', 'tv', 'dstv', 'gotv', 'startimes',
            'electricity', 'power', 'nepa', 'phcn', 'betting', 'bet',
            'internet', 'wifi', 'education', 'waec', 'jamb', 'neco'
          ];
          
          return serviceKeywords.some(keyword => description.includes(keyword));
        });
        
        const formattedTransactions = purchaseTransactions.map((tx: any, index: number) => ({
          _id: tx._id || tx.id || `tx_${Date.now()}_${index}`,
          type: tx.type || 'debit',
          amount: parseFloat(tx.amount || 0),
          date: tx.createdAt || tx.date || new Date().toISOString(),
          createdAt: tx.createdAt || tx.date || new Date().toISOString(),
          status: tx.status || 'completed',
          description: tx.description || `${tx.category || 'Purchase'} transaction`,
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
        
        setTransactions(formattedTransactions);
        setApiError(null);
        console.log('✅ Purchase transactions loaded:', formattedTransactions.length);
      } else if (isMountedRef.current) {
        setTransactions([]);
      }
    } catch (error: any) {
      if (isMountedRef.current) {
        console.error('❌ Error fetching purchase transactions:', error);
        setTransactions([]);
        
        if (error.status !== 401) {
          setApiError('Unable to fetch purchase history. Please check your connection.');
        }
      }
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      await fetchPurchaseTransactions();
      setIsLoading(false);
    };

    fetchData();
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchPurchaseTransactions();
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

  const getDataType = (transaction: Transaction): string => {
    if (transaction.metadata?.type) {
      const type = transaction.metadata.type.toLowerCase();
      if (type === 'regular' || type === 'direct') return 'Direct';
      if (type === 'sme' || type === 'corporate') return 'SME';
      if (type === 'gift' || type === 'gifting') return 'Gift';
      return transaction.metadata.type.toUpperCase();
    }
    
    const description = transaction.description?.toLowerCase() || '';
    const plan = transaction.metadata?.plan?.toLowerCase() || '';
    const combinedText = `${description} ${plan}`;
    
    if (combinedText.includes('(cg)')) return 'CG';
    if (combinedText.includes('(dg)')) return 'DG';
    if (combinedText.includes('sme')) return 'SME';
    if (combinedText.includes('corporate')) return 'Corporate';
    if (combinedText.includes('gift') || combinedText.includes('gifting')) return 'Gift';
    if (combinedText.includes('awoof')) return 'Awoof';
    
    if (transaction.category === 'data' || 
        transaction.category === 'data_easyaccess' ||
        combinedText.includes('data purchase')) {
      return 'Direct';
    }
    
    return 'N/A';
  };

  const getMobileNumber = (transaction: Transaction): string => {
    if (transaction.metadata?.phone) return transaction.metadata.phone;
    if (transaction.metadata?.mobileNumber) return transaction.metadata.mobileNumber;
    if (transaction.metadata?.phoneNumber) return transaction.metadata.phoneNumber;
    if (transaction.metadata?.recipient) return transaction.metadata.recipient;
    if (transaction.metadata?.mobile) return transaction.metadata.mobile;
    
    if (transaction.description) {
      const phoneMatch = transaction.description.match(/0[789][01]\d{8}/);
      if (phoneMatch) return phoneMatch[0];
    }
    
    return 'N/A';
  };

  const getServiceName = (transaction: Transaction): string => {
    const categoryMap: { [key: string]: string } = {
      'airtime': 'Airtime',
      'data': 'Data',
      'cable-tv': 'Cable TV',
      'electricity': 'Electricity',
      'betting': 'Betting',
      'internet': 'Internet',
      'education': 'Education',
      'payment': 'Payment',
      'transfer_out': 'Transfer',
      'transfer': 'Transfer',
    };
    
    if (transaction.category && categoryMap[transaction.category]) {
      return categoryMap[transaction.category];
    }
    
    const description = (transaction.description || '').toLowerCase();
    
    if (description.includes('airtime')) return 'Airtime';
    if (description.includes('data')) return 'Data';
    if (description.includes('cable') || description.includes('tv') || description.includes('dstv') || description.includes('gotv') || description.includes('startimes')) return 'Cable TV';
    if (description.includes('electricity') || description.includes('power') || description.includes('nepa') || description.includes('phcn')) return 'Electricity';
    if (description.includes('betting') || description.includes('bet')) return 'Betting';
    if (description.includes('internet') || description.includes('wifi')) return 'Internet';
    if (description.includes('education') || description.includes('waec') || description.includes('jamb') || description.includes('neco')) return 'Education';
    if (description.includes('transfer')) return 'Transfer';
    
    if (transaction.metadata?.serviceType) {
      return transaction.metadata.serviceType;
    }
    
    if (transaction.category && transaction.category !== 'general') {
      return transaction.category.charAt(0).toUpperCase() + transaction.category.slice(1);
    }
    
    return 'Purchase';
  };

  const handleViewReceipt = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setShowReceipt(true);
  };

  const handleCloseReceipt = () => {
    setShowReceipt(false);
    setTimeout(() => setSelectedTransaction(null), 300);
  };

  const handlePrintReceipt = () => {
    const printContent = receiptRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '', 'width=800,height=600');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Receipt - ${selectedTransaction?.reference}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: Arial, sans-serif; padding: 20px; }
            .receipt { max-width: 600px; margin: 0 auto; }
            .receipt-header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #dc2626; padding-bottom: 20px; }
            .receipt-header h1 { color: #dc2626; font-size: 28px; margin-bottom: 5px; }
            .receipt-header p { color: #6b7280; font-size: 14px; }
            .receipt-section { margin-bottom: 25px; }
            .receipt-section h3 { color: #1f2937; font-size: 16px; margin-bottom: 12px; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px; }
            .receipt-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f3f4f6; }
            .receipt-row:last-child { border-bottom: none; }
            .receipt-label { color: #6b7280; font-size: 13px; font-weight: 600; }
            .receipt-value { color: #1f2937; font-size: 13px; font-weight: 500; text-align: right; }
            .receipt-amount { font-size: 24px; color: #dc2626; font-weight: 700; text-align: center; margin: 20px 0; }
            .receipt-status { display: inline-block; padding: 6px 16px; border-radius: 20px; font-size: 12px; font-weight: 600; }
            .status-success { background: #22c55e; color: white; }
            .receipt-footer { margin-top: 30px; padding-top: 20px; border-top: 2px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 12px; }
            @media print { body { padding: 0; } }
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

  if (isLoading) {
    return (
      <div className="page-container">
        <div className="loading-wrapper">
          <div className="spinner"></div>
          <p className="loading-text">Loading purchase history...</p>
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
      {/* Header */}
      <div className="header-section">
        <button onClick={() => router.back()} className="back-button">
          <ChevronLeft size={20} strokeWidth={2.5} />
        </button>
        <div className="header-content">
          <Home size={20} className="header-icon" strokeWidth={2.5} />
          <span className="header-slash">/</span>
          <h1 className="header-title">Purchase History</h1>
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
        <h2 className="page-title">PURCHASE HISTORY (ALL SERVICES & TRANSACTIONS)</h2>
      </div>

      {/* Transactions Table */}
      {transactions.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon-wrapper">
            <ArrowUpRight size={64} className="empty-icon" />
          </div>
          <p className="empty-title">No Purchase History</p>
          <p className="empty-subtitle">Your purchase transactions will appear here</p>
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
                  <th>Mobile No.</th>
                  <th>Network</th>
                  <th>Data Plan</th>
                  <th>Amount</th>
                  <th>Data_Type</th>
                  <th>Server Response</th>
                  <th>Reference</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Receipt</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx, index) => (
                  <tr key={tx._id} className="table-row">
                    <td>{index + 1}</td>
                    <td className="mobile-cell">{getMobileNumber(tx)}</td>
                    <td>{tx.metadata?.network || tx.metadata?.provider || getServiceName(tx)}</td>
                    <td>{tx.description?.replace(/\s*\(EasyAccess\)/gi, '').trim() || 'N/A'}</td>
                    <td className="amount-cell">₦{tx.amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</td>
                    <td>{getDataType(tx)}</td>
                    <td className="response-cell">{tx.metadata?.serverResponse || tx.metadata?.response || 'Success'}</td>
                    <td className="reference-cell">{tx.reference}</td>
                    <td className="date-cell">{formatTransactionDate(tx.createdAt)}</td>
                    <td>
                      <span className={`status-badge status-${tx.status.toLowerCase()}`}>
                        {tx.status === 'completed' ? 'Successful' : tx.status.charAt(0).toUpperCase() + tx.status.slice(1)}
                      </span>
                    </td>
                    <td>
                      <button className="receipt-button" onClick={() => handleViewReceipt(tx)}>View</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Receipt Modal */}
      {showReceipt && selectedTransaction && (
        <div className="modal-overlay" onClick={handleCloseReceipt}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Transaction Receipt</h2>
              <button onClick={handleCloseReceipt} className="modal-close">
                <X size={24} />
              </button>
            </div>

            <div className="receipt-container" ref={receiptRef}>
              <div className="receipt">
                <div className="receipt-header">
                  <h1>Transaction Receipt</h1>
                  <p>Payment Confirmation</p>
                </div>

                <div className="receipt-section">
                  <h3>Transaction Details</h3>
                  <div className="receipt-row">
                    <span className="receipt-label">Amount:</span>
                    <span className="receipt-value">₦{selectedTransaction.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="receipt-row">
                    <span className="receipt-label">Service Type:</span>
                    <span className="receipt-value">{getServiceName(selectedTransaction)}</span>
                  </div>
                  <div className="receipt-row">
                    <span className="receipt-label">Reference:</span>
                    <span className="receipt-value">{selectedTransaction.reference}</span>
                  </div>
                  <div className="receipt-row">
                    <span className="receipt-label">Date & Time:</span>
                    <span className="receipt-value">{formatTransactionDate(selectedTransaction.createdAt)}</span>
                  </div>
                  <div className="receipt-row">
                    <span className="receipt-label">Status:</span>
                    <span className="receipt-value">
                      <span className={`receipt-status status-${selectedTransaction.status.toLowerCase()}`}>
                        {selectedTransaction.status === 'completed' ? 'Successful' : selectedTransaction.status.charAt(0).toUpperCase() + selectedTransaction.status.slice(1)}
                      </span>
                    </span>
                  </div>
                </div>

                <div className="receipt-section">
                  <h3>Service Information</h3>
                  <div className="receipt-row">
                    <span className="receipt-label">Mobile Number:</span>
                    <span className="receipt-value">{getMobileNumber(selectedTransaction)}</span>
                  </div>
                  <div className="receipt-row">
                    <span className="receipt-label">Network/Provider:</span>
                    <span className="receipt-value">{selectedTransaction.metadata?.network || selectedTransaction.metadata?.provider || getServiceName(selectedTransaction)}</span>
                  </div>
                  <div className="receipt-row">
                    <span className="receipt-label">Plan/Package:</span>
                    <span className="receipt-value">{selectedTransaction.description?.replace(/\s*\(EasyAccess\)/gi, '').trim() || 'N/A'}</span>
                  </div>
                  {getDataType(selectedTransaction) !== 'N/A' && (
                    <div className="receipt-row">
                      <span className="receipt-label">Data Type:</span>
                      <span className="receipt-value">{getDataType(selectedTransaction)}</span>
                    </div>
                  )}
                </div>

                <div className="receipt-section">
                  <h3>Payment Information</h3>
                  <div className="receipt-row">
                    <span className="receipt-label">Transaction Type:</span>
                    <span className="receipt-value">{selectedTransaction.type.replace(/_/g, ' ').charAt(0).toUpperCase() + selectedTransaction.type.replace(/_/g, ' ').slice(1)}</span>
                  </div>
                  <div className="receipt-row">
                    <span className="receipt-label">Category:</span>
                    <span className="receipt-value">{selectedTransaction.category.replace(/-/g, ' ').charAt(0).toUpperCase() + selectedTransaction.category.replace(/-/g, ' ').slice(1)}</span>
                  </div>
                  {selectedTransaction.metadata?.serverResponse && (
                    <div className="receipt-row">
                      <span className="receipt-label">Server Response:</span>
                      <span className="receipt-value">{selectedTransaction.metadata.serverResponse}</span>
                    </div>
                  )}
                </div>

                <div className="receipt-footer">
                  <p>Thank you for your transaction</p>
                  <p>This is an electronic receipt and does not require a signature</p>
                </div>
              </div>
            </div>

            <div className="modal-actions">
              <button onClick={handlePrintReceipt} className="action-button print-button">
                <Printer size={18} />
                Print Receipt
              </button>
              <button onClick={handleCloseReceipt} className="action-button close-button">
                Close
              </button>
            </div>
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
          min-width: 1200px;
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

        .mobile-cell {
          font-weight: 500;
        }

        .amount-cell {
          font-weight: 700;
          color: #dc2626;
        }

        .reference-cell {
          font-size: 12px;
          max-width: 180px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .date-cell {
          font-size: 12px;
          white-space: nowrap;
        }

        .response-cell {
          max-width: 150px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .status-badge {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .status-completed {
          background: #10b981;
          color: white;
        }

        .status-pending {
          background: #f59e0b;
          color: white;
        }

        .status-failed {
          background: #ef4444;
          color: white;
        }

        .receipt-button {
          background: #dc2626;
          color: white;
          border: none;
          padding: 6px 16px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .receipt-button:hover {
          background: #b91c1c;
          transform: translateY(-1px);
          box-shadow: 0 2px 8px rgba(220, 38, 38, 0.3);
        }

        /* Modal Styles */
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
          z-index: 1000;
          padding: 20px;
          animation: fadeIn 0.2s ease;
        }

        .modal-content {
          background: white;
          border-radius: 16px;
          max-width: 700px;
          width: 100%;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
          animation: slideUp 0.3s ease;
        }

        .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 24px 28px;
          border-bottom: 2px solid #e5e7eb;
        }

        .modal-title {
          font-size: 22px;
          font-weight: 700;
          color: #1f2937;
          margin: 0;
        }

        .modal-close {
          background: none;
          border: none;
          cursor: pointer;
          padding: 4px;
          display: flex;
          align-items: center;
          color: #6b7280;
          transition: all 0.2s ease;
        }

        .modal-close:hover {
          color: #dc2626;
          transform: rotate(90deg);
        }

        .receipt-container {
          padding: 28px;
        }

        .receipt {
          max-width: 100%;
        }

        .receipt-header {
          text-align: center;
          margin-bottom: 28px;
          padding-bottom: 20px;
          border-bottom: 3px solid #dc2626;
        }

        .receipt-header h1 {
          color: #dc2626;
          font-size: 26px;
          margin: 0 0 6px 0;
          font-weight: 800;
        }

        .receipt-header p {
          color: #6b7280;
          font-size: 14px;
          margin: 0;
        }

        .receipt-amount {
          font-size: 36px;
          color: #dc2626;
          font-weight: 800;
          text-align: center;
          margin: 24px 0;
          padding: 20px;
          background: #fef2f2;
          border-radius: 12px;
        }

        .receipt-section {
          margin-bottom: 24px;
        }

        .receipt-section h3 {
          color: #1f2937;
          font-size: 15px;
          margin-bottom: 14px;
          border-bottom: 2px solid #e5e7eb;
          padding-bottom: 8px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .receipt-row {
          display: flex;
          justify-content: space-between;
          padding: 10px 0;
          border-bottom: 1px solid #f3f4f6;
        }

        .receipt-row:last-child {
          border-bottom: none;
        }

        .receipt-label {
          color: #6b7280;
          font-size: 13px;
          font-weight: 600;
        }

        .receipt-value {
          color: #1f2937;
          font-size: 13px;
          font-weight: 600;
          text-align: right;
          max-width: 60%;
          word-break: break-word;
        }

        .receipt-status {
          display: inline-block;
          padding: 5px 14px;
          border-radius: 16px;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
        }

        .receipt-status.status-completed {
          background: #22c55e;
          color: white;
        }

        .receipt-status.status-pending {
          background: #f59e0b;
          color: white;
        }

        .receipt-status.status-failed {
          background: #ef4444;
          color: white;
        }

        .receipt-footer {
          margin-top: 28px;
          padding-top: 20px;
          border-top: 2px solid #e5e7eb;
          text-align: center;
        }

        .receipt-footer p {
          color: #6b7280;
          font-size: 12px;
          margin: 6px 0;
        }

        .modal-actions {
          display: flex;
          gap: 12px;
          padding: 20px 28px;
          border-top: 2px solid #e5e7eb;
          background: #f9fafb;
        }

        .action-button {
          flex: 1;
          padding: 12px 20px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          border: none;
        }

        .print-button {
          background: #dc2626;
          color: white;
        }

        .print-button:hover {
          background: #b91c1c;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(220, 38, 38, 0.3);
        }

        .close-button {
          background: #e5e7eb;
          color: #374151;
        }

        .close-button:hover {
          background: #d1d5db;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes slideUp {
          from {
            transform: translateY(20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
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

          .modal-content {
            max-width: 100%;
          }

          .receipt-amount {
            font-size: 28px;
          }

          .modal-actions {
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  );
}