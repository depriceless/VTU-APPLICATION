import React, { useState, useEffect, useCallback } from 'react';

// TypeScript interfaces
interface Transaction {
  _id: string;
  userId: string;
  walletId: string;
  type: 'credit' | 'debit' | 'transfer_in' | 'transfer_out';
  amount: number;
  previousBalance: number;
  newBalance: number;
  description: string;
  reference: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  category: 'funding' | 'withdrawal' | 'transfer' | 'payment' | 'refund' | 'fee' | 'bonus' | 'betting';
  gateway?: {
    provider: string;
    gatewayReference: string;
    gatewayResponse: any;
  };
  metadata?: {
    ip_address?: string;
    user_agent?: string;
    source?: string;
    notes?: string;
    failureReason?: string;
    cancellationReason?: string;
    betting?: {
      provider: string;
      customerId: string;
      customerName: string;
      retryCount: number;
    };
  };
  createdAt: string;
  updatedAt: string;
  processedAt: string;
  completedAt?: string;
  failedAt?: string;
  // Additional fields from backend
  userInfo?: {
    id: string;
    name: string;
    email: string;
    phone: string;
  };
  walletInfo?: {
    id: string;
    balance: number;
  };
}

interface TransactionFilters {
  status?: string;
  type?: string;
  category?: string;
  dateFrom?: string;
  dateTo?: string;
  amountMin?: number;
  amountMax?: number;
  search?: string;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  pages: number;
  hasNext?: boolean;
  hasPrev?: boolean;
}

interface ApiResponse {
  success: boolean;
  transactions: Transaction[];
  pagination: PaginationInfo;
  message?: string;
  filters?: TransactionFilters;
}

interface User {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  username?: string;
}

interface UserSearchResponse {
  success: boolean;
  users: User[];
  message?: string;
}

// Transaction Details Modal Component
const TransactionDetailsModal: React.FC<{
  transaction: Transaction;
  isOpen: boolean;
  onClose: () => void;
  formatCurrency: (amount: number) => string;
  formatDate: (dateString: string) => string;
  getStatusColor: (status: string) => string;
  getTypeColor: (type: string) => string;
}> = ({ transaction, isOpen, onClose, formatCurrency, formatDate, getStatusColor, getTypeColor }) => {
  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: '#fff',
        borderRadius: '12px',
        padding: '24px',
        width: '100%',
        maxWidth: '600px',
        maxHeight: '90vh',
        overflowY: 'auto',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '24px',
          paddingBottom: '16px',
          borderBottom: '1px solid #e2e8f0'
        }}>
          <h3 style={{
            fontSize: '20px',
            fontWeight: '700',
            color: '#1a202c',
            margin: 0
          }}>
            Transaction Details
          </h3>
          <button
            onClick={onClose}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: '#f7fafc',
              color: '#718096',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '18px'
            }}
          >
            ×
          </button>
        </div>

        {/* Transaction Info */}
        <div style={{ display: 'grid', gap: '20px' }}>
          {/* Basic Information */}
          <div>
            <h4 style={{
              fontSize: '16px',
              fontWeight: '600',
              color: '#1a202c',
              margin: '0 0 12px 0'
            }}>
              Basic Information
            </h4>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '16px',
              padding: '16px',
              backgroundColor: '#f7fafc',
              borderRadius: '8px'
            }}>
              <div>
                <div style={{ fontSize: '12px', fontWeight: '600', color: '#718096', marginBottom: '4px' }}>
                  Reference
                </div>
                <div style={{ fontSize: '14px', fontWeight: '600', color: '#1a202c' }}>
                  {transaction.reference}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '12px', fontWeight: '600', color: '#718096', marginBottom: '4px' }}>
                  Amount
                </div>
                <div style={{
                  fontSize: '16px',
                  fontWeight: '700',
                  color: transaction.type.includes('debit') ? '#ff3b30' : '#28a745'
                }}>
                  {transaction.type.includes('debit') ? '-' : '+'}{formatCurrency(transaction.amount)}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '12px', fontWeight: '600', color: '#718096', marginBottom: '4px' }}>
                  Type
                </div>
                <span style={{
                  padding: '4px 8px',
                  borderRadius: '12px',
                  fontSize: '11px',
                  fontWeight: '600',
                  backgroundColor: `${getTypeColor(transaction.type)}20`,
                  color: getTypeColor(transaction.type),
                  textTransform: 'uppercase'
                }}>
                  {transaction.type.replace('_', ' ')}
                </span>
              </div>
              <div>
                <div style={{ fontSize: '12px', fontWeight: '600', color: '#718096', marginBottom: '4px' }}>
                  Status
                </div>
                <span style={{
                  padding: '4px 8px',
                  borderRadius: '12px',
                  fontSize: '11px',
                  fontWeight: '600',
                  backgroundColor: `${getStatusColor(transaction.status)}20`,
                  color: getStatusColor(transaction.status),
                  textTransform: 'uppercase'
                }}>
                  {transaction.status}
                </span>
              </div>
              <div>
                <div style={{ fontSize: '12px', fontWeight: '600', color: '#718096', marginBottom: '4px' }}>
                  Category
                </div>
                <div style={{ fontSize: '14px', color: '#1a202c', textTransform: 'capitalize' }}>
                  {transaction.category}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '12px', fontWeight: '600', color: '#718096', marginBottom: '4px' }}>
                  Description
                </div>
                <div style={{ fontSize: '14px', color: '#1a202c' }}>
                  {transaction.description}
                </div>
              </div>
            </div>
          </div>

          {/* User & Wallet Information */}
          <div>
            <h4 style={{
              fontSize: '16px',
              fontWeight: '600',
              color: '#1a202c',
              margin: '0 0 12px 0'
            }}>
              User & Wallet Information
            </h4>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '16px',
              padding: '16px',
              backgroundColor: '#f7fafc',
              borderRadius: '8px'
            }}>
              <div>
                <div style={{ fontSize: '12px', fontWeight: '600', color: '#718096', marginBottom: '4px' }}>
                  User Name
                </div>
                <div style={{ fontSize: '14px', color: '#1a202c' }}>
                  {transaction.userInfo?.name || 'Unknown User'}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '12px', fontWeight: '600', color: '#718096', marginBottom: '4px' }}>
                  Email
                </div>
                <div style={{ fontSize: '14px', color: '#1a202c' }}>
                  {transaction.userInfo?.email || 'N/A'}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '12px', fontWeight: '600', color: '#718096', marginBottom: '4px' }}>
                  Phone
                </div>
                <div style={{ fontSize: '14px', color: '#1a202c' }}>
                  {transaction.userInfo?.phone || 'N/A'}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '12px', fontWeight: '600', color: '#718096', marginBottom: '4px' }}>
                  Wallet Balance
                </div>
                <div style={{ fontSize: '14px', fontWeight: '600', color: '#1a202c' }}>
                  {transaction.walletInfo?.balance ? formatCurrency(transaction.walletInfo.balance) : 'N/A'}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '12px', fontWeight: '600', color: '#718096', marginBottom: '4px' }}>
                  Previous Balance
                </div>
                <div style={{ fontSize: '14px', color: '#1a202c' }}>
                  {formatCurrency(transaction.previousBalance)}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '12px', fontWeight: '600', color: '#718096', marginBottom: '4px' }}>
                  New Balance
                </div>
                <div style={{ fontSize: '14px', fontWeight: '600', color: '#1a202c' }}>
                  {formatCurrency(transaction.newBalance)}
                </div>
              </div>
            </div>
          </div>

          {/* Timestamps */}
          <div>
            <h4 style={{
              fontSize: '16px',
              fontWeight: '600',
              color: '#1a202c',
              margin: '0 0 12px 0'
            }}>
              Timestamps
            </h4>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '16px',
              padding: '16px',
              backgroundColor: '#f7fafc',
              borderRadius: '8px'
            }}>
              <div>
                <div style={{ fontSize: '12px', fontWeight: '600', color: '#718096', marginBottom: '4px' }}>
                  Created
                </div>
                <div style={{ fontSize: '14px', color: '#1a202c' }}>
                  {formatDate(transaction.createdAt)}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '12px', fontWeight: '600', color: '#718096', marginBottom: '4px' }}>
                  Updated
                </div>
                <div style={{ fontSize: '14px', color: '#1a202c' }}>
                  {formatDate(transaction.updatedAt)}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '12px', fontWeight: '600', color: '#718096', marginBottom: '4px' }}>
                  Processed
                </div>
                <div style={{ fontSize: '14px', color: '#1a202c' }}>
                  {transaction.processedAt ? formatDate(transaction.processedAt) : 'N/A'}
                </div>
              </div>
              {transaction.completedAt && (
                <div>
                  <div style={{ fontSize: '12px', fontWeight: '600', color: '#718096', marginBottom: '4px' }}>
                    Completed
                  </div>
                  <div style={{ fontSize: '14px', color: '#1a202c' }}>
                    {formatDate(transaction.completedAt)}
                  </div>
                </div>
              )}
              {transaction.failedAt && (
                <div>
                  <div style={{ fontSize: '12px', fontWeight: '600', color: '#718096', marginBottom: '4px' }}>
                    Failed
                  </div>
                  <div style={{ fontSize: '14px', color: '#1a202c' }}>
                    {formatDate(transaction.failedAt)}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Gateway Information */}
          {transaction.gateway && (
            <div>
              <h4 style={{
                fontSize: '16px',
                fontWeight: '600',
                color: '#1a202c',
                margin: '0 0 12px 0'
              }}>
                Gateway Information
              </h4>
              <div style={{
                padding: '16px',
                backgroundColor: '#f7fafc',
                borderRadius: '8px'
              }}>
                <div style={{ display: 'grid', gap: '12px' }}>
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: '600', color: '#718096', marginBottom: '4px' }}>
                      Provider
                    </div>
                    <div style={{ fontSize: '14px', color: '#1a202c' }}>
                      {transaction.gateway.provider}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: '600', color: '#718096', marginBottom: '4px' }}>
                      Gateway Reference
                    </div>
                    <div style={{ fontSize: '14px', color: '#1a202c' }}>
                      {transaction.gateway.gatewayReference}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Metadata */}
          {transaction.metadata && (
            <div>
              <h4 style={{
                fontSize: '16px',
                fontWeight: '600',
                color: '#1a202c',
                margin: '0 0 12px 0'
              }}>
                Additional Information
              </h4>
              <div style={{
                padding: '16px',
                backgroundColor: '#f7fafc',
                borderRadius: '8px'
              }}>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '12px'
                }}>
                  {transaction.metadata.ip_address && (
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: '600', color: '#718096', marginBottom: '4px' }}>
                        IP Address
                      </div>
                      <div style={{ fontSize: '14px', color: '#1a202c' }}>
                        {transaction.metadata.ip_address}
                      </div>
                    </div>
                  )}
                  {transaction.metadata.source && (
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: '600', color: '#718096', marginBottom: '4px' }}>
                        Source
                      </div>
                      <div style={{ fontSize: '14px', color: '#1a202c' }}>
                        {transaction.metadata.source}
                      </div>
                    </div>
                  )}
                  {transaction.metadata.failureReason && (
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: '600', color: '#ff3b30', marginBottom: '4px' }}>
                        Failure Reason
                      </div>
                      <div style={{ fontSize: '14px', color: '#ff3b30' }}>
                        {transaction.metadata.failureReason}
                      </div>
                    </div>
                  )}
                  {transaction.metadata.cancellationReason && (
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: '600', color: '#718096', marginBottom: '4px' }}>
                        Cancellation Reason
                      </div>
                      <div style={{ fontSize: '14px', color: '#1a202c' }}>
                        {transaction.metadata.cancellationReason}
                      </div>
                    </div>
                  )}
                  {transaction.metadata.notes && (
                    <div style={{ gridColumn: '1 / -1' }}>
                      <div style={{ fontSize: '12px', fontWeight: '600', color: '#718096', marginBottom: '4px' }}>
                        Notes
                      </div>
                      <div style={{ fontSize: '14px', color: '#1a202c' }}>
                        {transaction.metadata.notes}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div style={{
          marginTop: '24px',
          paddingTop: '16px',
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'flex-end'
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px',
              backgroundColor: '#ff3b30',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

// API configuration
const API_BASE_URL = 'http://192.168.126.7:5000';

// Main TransactionManagement Component
const TransactionManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('all');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [filters, setFilters] = useState<TransactionFilters>({});
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0
  });
  const [selectedTransactions, setSelectedTransactions] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState<boolean>(false);
  const [bulkLoading, setBulkLoading] = useState<boolean>(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [showModal, setShowModal] = useState<boolean>(false);

  // Tab configurations
  const tabs = [
    {
      id: 'all',
      label: 'All Transactions',
      icon: '💳',
      filters: {}
    },
    {
      id: 'pending',
      label: 'Pending',
      icon: '⏳',
      filters: { status: 'pending' },
      color: '#ff8c00'
    },
    {
      id: 'failed',
      label: 'Failed',
      icon: '❌',
      filters: { status: 'failed' },
      color: '#ff3b30'
    },
    {
      id: 'disputes',
      label: 'Disputes',
      icon: '⚠️',
      filters: { category: 'dispute' },
      color: '#ff6b35'
    },
    {
      id: 'refunds',
      label: 'Refunds',
      icon: '💰',
      filters: { category: 'refund' },
      color: '#28a745'
    },
    {
      id: 'funding',
      label: 'Funding',
      icon: '📥',
      filters: { category: 'funding' },
      color: '#007bff'
    }
  ];

  // Get auth token (prioritize localStorage, fallback to sessionStorage)
  const getAuthToken = () => {
    return localStorage.getItem('admin_token') || sessionStorage.getItem('admin_token');
  };

  // Fetch transactions from API
  const fetchTransactions = useCallback(async (page: number = 1) => {
    setLoading(true);
    try {
      const activeTabConfig = tabs.find(tab => tab.id === activeTab);
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: pagination.limit.toString(),
        sortBy: 'createdAt',
        sortOrder: 'desc',
        ...activeTabConfig?.filters,
        ...filters
      });

      // Remove undefined/empty values
      Array.from(queryParams.keys()).forEach(key => {
        const value = queryParams.get(key);
        if (!value || value === 'undefined' || value === '') {
          queryParams.delete(key);
        }
      });

      console.log('Fetching transactions with params:', queryParams.toString());

      const token = getAuthToken();
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`${API_BASE_URL}/api/admin/transactions?${queryParams}`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Authentication failed. Please login again.');
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: ApiResponse = await response.json();
      
      if (data.success) {
        setTransactions(data.transactions);
        setPagination(data.pagination);
        console.log(`✅ Fetched ${data.transactions.length} transactions`);
      } else {
        throw new Error(data.message || 'Failed to fetch transactions');
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
      setTransactions([]);
      setPagination({ page: 1, limit: 20, total: 0, pages: 0 });
      
      // Show user-friendly error message
      alert(`Error fetching transactions: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  }, [activeTab, filters, pagination.limit]);

  // Bulk export selected transactions
  const handleBulkExport = async () => {
    if (selectedTransactions.length === 0) {
      alert('Please select transactions to export');
      return;
    }

    setBulkLoading(true);
    try {
      const token = getAuthToken();
      const response = await fetch(`${API_BASE_URL}/api/admin/bulk/transactions/export`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          transactionIds: selectedTransactions,
          format: 'csv'
        })
      });

      if (!response.ok) {
        throw new Error(`Export failed: ${response.status}`);
      }

      // Handle CSV download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `transactions_export_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      console.log(`✅ Exported ${selectedTransactions.length} transactions`);
      alert('Transactions exported successfully!');
    } catch (error) {
      console.error('Export error:', error);
      alert(`Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setBulkLoading(false);
    }
  };

  // Bulk status update
  const handleBulkStatusUpdate = async (newStatus: string) => {
    if (selectedTransactions.length === 0) {
      alert('Please select transactions to update');
      return;
    }

    const reason = prompt(`Enter reason for changing status to ${newStatus}:`);
    if (!reason) return;

    setBulkLoading(true);
    try {
      const token = getAuthToken();
      const response = await fetch(`${API_BASE_URL}/api/admin/bulk/transactions/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          transactionIds: selectedTransactions,
          status: newStatus,
          reason
        })
      });

      const data = await response.json();
      
      if (data.success) {
        alert(data.message);
        setSelectedTransactions([]);
        fetchTransactions(pagination.page);
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      console.error('Bulk update error:', error);
      alert(`Status update failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setBulkLoading(false);
    }
  };

  // Bulk delete transactions
  const handleBulkDelete = async () => {
    if (selectedTransactions.length === 0) {
      alert('Please select transactions to delete');
      return;
    }

    const confirmed = confirm(
      `Are you sure you want to delete ${selectedTransactions.length} selected transaction(s)? This action cannot be undone.`
    );
    if (!confirmed) return;

    const reason = prompt('Enter reason for deletion (optional):');
    
    setBulkLoading(true);
    try {
      const token = getAuthToken();
      const response = await fetch(`${API_BASE_URL}/api/admin/bulk/transactions/delete`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          transactionIds: selectedTransactions,
          reason
        })
      });

      const data = await response.json();
      
      if (data.success) {
        alert(`Successfully deleted ${selectedTransactions.length} transaction(s)`);
        setSelectedTransactions([]);
        fetchTransactions(pagination.page);
      } else {
        throw new Error(data.message || 'Failed to delete transactions');
      }
    } catch (error) {
      console.error('Bulk delete error:', error);
      alert(`Delete failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setBulkLoading(false);
    }
  };

  // Handle view transaction details
  const handleViewDetails = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setShowModal(true);
  };

  // Handle close modal
  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedTransaction(null);
  };

  // Handle retry transaction
  const handleRetryTransaction = async (transactionId: string) => {
    const confirmed = confirm('Are you sure you want to retry this transaction?');
    if (!confirmed) return;

    try {
      const token = getAuthToken();
      const response = await fetch(`${API_BASE_URL}/api/admin/transactions/${transactionId}/retry`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (data.success) {
        alert('Transaction retry initiated successfully');
        fetchTransactions(pagination.page);
      } else {
        alert(`Error: ${data.message}`);
      }
    } catch (error) {
      console.error('Retry error:', error);
      alert('Failed to retry transaction. Please try again.');
    }
  };

  // Handle cancel transaction
  const handleCancelTransaction = async (transactionId: string) => {
    const reason = prompt('Enter cancellation reason:');
    if (!reason) return;

    try {
      const token = getAuthToken();
      const response = await fetch(`${API_BASE_URL}/api/admin/transactions/${transactionId}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ reason })
      });

      const data = await response.json();
      if (data.success) {
        alert('Transaction cancelled successfully');
        fetchTransactions(pagination.page);
      } else {
        alert(`Error: ${data.message}`);
      }
    } catch (error) {
      console.error('Cancel error:', error);
      alert('Failed to cancel transaction. Please try again.');
    }
  };

  // Handle delete individual transaction
  const handleDeleteTransaction = async (transactionId: string) => {
    const confirmed = confirm('Are you sure you want to delete this transaction? This action cannot be undone.');
    if (!confirmed) return;

    const reason = prompt('Enter reason for deletion (optional):');

    try {
      const token = getAuthToken();
      const response = await fetch(`${API_BASE_URL}/api/admin/transactions/${transactionId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ reason })
      });

      const data = await response.json();
      if (data.success) {
        alert('Transaction deleted successfully');
        fetchTransactions(pagination.page);
      } else {
        alert(`Error: ${data.message}`);
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert('Failed to delete transaction. Please try again.');
    }
  };

  // Load transactions on mount and when dependencies change
  useEffect(() => {
    fetchTransactions(1);
  }, [activeTab, filters]);

  // Handle tab change
  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    setSelectedTransactions([]);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  // Handle filter changes
  const handleFilterChange = (newFilters: Partial<TransactionFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  // Handle pagination
  const handlePageChange = (page: number) => {
    setPagination(prev => ({ ...prev, page }));
    fetchTransactions(page);
  };

  // Format currency
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0
    }).format(amount);
  };

  // Format date
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-NG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get status badge color
  const getStatusColor = (status: string): string => {
    const colors = {
      pending: '#ff8c00',
      completed: '#28a745',
      failed: '#ff3b30',
      cancelled: '#6c757d'
    };
    return colors[status as keyof typeof colors] || '#6c757d';
  };

  // Get type badge color
  const getTypeColor = (type: string): string => {
    const colors = {
      credit: '#28a745',
      debit: '#ff3b30',
      transfer_in: '#007bff',
      transfer_out: '#6f42c1'
    };
    return colors[type as keyof typeof colors] || '#6c757d';
  };

  // Handle transaction selection
  const handleTransactionSelect = (transactionId: string) => {
    setSelectedTransactions(prev => 
      prev.includes(transactionId)
        ? prev.filter(id => id !== transactionId)
        : [...prev, transactionId]
    );
  };

  // Select all transactions
  const handleSelectAll = () => {
    if (selectedTransactions.length === transactions.length) {
      setSelectedTransactions([]);
    } else {
      setSelectedTransactions(transactions.map(t => t._id));
    }
  };

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Transaction Details Modal */}
      {selectedTransaction && (
        <TransactionDetailsModal
          transaction={selectedTransaction}
          isOpen={showModal}
          onClose={handleCloseModal}
          formatCurrency={formatCurrency}
          formatDate={formatDate}
          getStatusColor={getStatusColor}
          getTypeColor={getTypeColor}
        />
      )}

      {/* Header */}
      <div style={{
        backgroundColor: '#fff',
        padding: '20px 24px',
        borderBottom: '1px solid #e2e8f0',
        marginBottom: '0'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div>
            <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#1a202c', margin: '0 0 4px 0' }}>
              Transaction Management
            </h2>
            <p style={{ color: '#718096', margin: 0, fontSize: '14px' }}>
              Monitor and manage all system transactions
            </p>
          </div>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button
              onClick={() => setShowFilters(!showFilters)}
              style={{
                padding: '8px 16px',
                backgroundColor: showFilters ? '#ff3b30' : '#f7fafc',
                color: showFilters ? '#fff' : '#718096',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              Filters
            </button>
            <button
              onClick={() => fetchTransactions(pagination.page)}
              disabled={loading}
              style={{
                padding: '8px 16px',
                backgroundColor: '#ff3b30',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                opacity: loading ? 0.6 : 1
              }}
            >
              {loading ? 'Loading...' : 'Refresh'}
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex',
          gap: '8px',
          overflowX: 'auto',
          paddingBottom: '4px'
        }}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              style={{
                padding: '10px 16px',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                whiteSpace: 'nowrap',
                backgroundColor: activeTab === tab.id ? '#ff3b30' : '#f7fafc',
                color: activeTab === tab.id ? '#fff' : '#1a202c',
                transition: 'all 0.2s ease'
              }}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Advanced Filters */}
      {showFilters && (
        <div style={{
          backgroundColor: '#fff',
          padding: '20px 24px',
          borderBottom: '1px solid #e2e8f0',
          marginBottom: '0'
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px',
            alignItems: 'end'
          }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#1a202c', marginBottom: '4px' }}>
                Search
              </label>
              <input
                type="text"
                placeholder="Reference, description..."
                value={filters.search || ''}
                onChange={(e) => handleFilterChange({ search: e.target.value })}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#1a202c', marginBottom: '4px' }}>
                Type
              </label>
              <select
                value={filters.type || ''}
                onChange={(e) => handleFilterChange({ type: e.target.value })}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              >
                <option value="">All Types</option>
                <option value="credit">Credit</option>
                <option value="debit">Debit</option>
                <option value="transfer_in">Transfer In</option>
                <option value="transfer_out">Transfer Out</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#1a202c', marginBottom: '4px' }}>
                Category
              </label>
              <select
                value={filters.category || ''}
                onChange={(e) => handleFilterChange({ category: e.target.value })}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              >
                <option value="">All Categories</option>
                <option value="funding">Funding</option>
                <option value="withdrawal">Withdrawal</option>
                <option value="transfer">Transfer</option>
                <option value="payment">Payment</option>
                <option value="refund">Refund</option>
                <option value="betting">Betting</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#1a202c', marginBottom: '4px' }}>
                Date From
              </label>
              <input
                type="date"
                value={filters.dateFrom || ''}
                onChange={(e) => handleFilterChange({ dateFrom: e.target.value })}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#1a202c', marginBottom: '4px' }}>
                Date To
              </label>
              <input
                type="date"
                value={filters.dateTo || ''}
                onChange={(e) => handleFilterChange({ dateTo: e.target.value })}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setFilters({})}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#f7fafc',
                  color: '#718096',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Actions */}
      {selectedTransactions.length > 0 && (
        <div style={{
          backgroundColor: '#fff5f5',
          padding: '12px 24px',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <span style={{ fontSize: '14px', color: '#1a202c' }}>
            {selectedTransactions.length} transaction(s) selected
          </span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={handleBulkExport}
              disabled={bulkLoading}
              style={{
                padding: '6px 12px',
                backgroundColor: '#ff3b30',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                cursor: bulkLoading ? 'not-allowed' : 'pointer',
                fontSize: '12px',
                opacity: bulkLoading ? 0.6 : 1
              }}
            >
              {bulkLoading ? 'Processing...' : 'Export Selected'}
            </button>
            <button
              onClick={() => handleBulkStatusUpdate('completed')}
              disabled={bulkLoading}
              style={{
                padding: '6px 12px',
                backgroundColor: '#28a745',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                cursor: bulkLoading ? 'not-allowed' : 'pointer',
                fontSize: '12px',
                opacity: bulkLoading ? 0.6 : 1
              }}
            >
              Mark Completed
            </button>
            <button
              onClick={() => handleBulkStatusUpdate('failed')}
              disabled={bulkLoading}
              style={{
                padding: '6px 12px',
                backgroundColor: '#dc3545',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                cursor: bulkLoading ? 'not-allowed' : 'pointer',
                fontSize: '12px',
                opacity: bulkLoading ? 0.6 : 1
              }}
            >
              Mark Failed
            </button>
            <button
              onClick={handleBulkDelete}
              disabled={bulkLoading}
              style={{
                padding: '6px 12px',
                backgroundColor: '#dc2626',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                cursor: bulkLoading ? 'not-allowed' : 'pointer',
                fontSize: '12px',
                opacity: bulkLoading ? 0.6 : 1
              }}
            >
              Delete Selected
            </button>
            <button
              onClick={() => setSelectedTransactions([])}
              style={{
                padding: '6px 12px',
                backgroundColor: '#f7fafc',
                color: '#718096',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              Clear Selection
            </button>
          </div>
        </div>
      )}

      {/* Transactions Table */}
      <div style={{ flex: 1, backgroundColor: '#fff', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ overflowX: 'auto', flex: 1 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ backgroundColor: '#f7fafc', position: 'sticky', top: 0, zIndex: 1 }}>
              <tr>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#718096', borderBottom: '1px solid #e2e8f0' }}>
                  <input
                    type="checkbox"
                    checked={selectedTransactions.length === transactions.length && transactions.length > 0}
                    onChange={handleSelectAll}
                    style={{ marginRight: '8px' }}
                  />
                  REF
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#718096', borderBottom: '1px solid #e2e8f0' }}>
                  USER/WALLET
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#718096', borderBottom: '1px solid #e2e8f0' }}>
                  TYPE
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#718096', borderBottom: '1px solid #e2e8f0' }}>
                  AMOUNT
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#718096', borderBottom: '1px solid #e2e8f0' }}>
                  STATUS
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#718096', borderBottom: '1px solid #e2e8f0' }}>
                  CATEGORY
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#718096', borderBottom: '1px solid #e2e8f0' }}>
                  DATE
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#718096', borderBottom: '1px solid #e2e8f0' }}>
                  ACTIONS
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: '#718096' }}>
                    <div>Loading transactions...</div>
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: '#718096' }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
                    <div>No transactions found</div>
                  </td>
                </tr>
              ) : (
                transactions.map((transaction) => (
                  <tr key={transaction._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 16px', fontSize: '14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input
                          type="checkbox"
                          checked={selectedTransactions.includes(transaction._id)}
                          onChange={() => handleTransactionSelect(transaction._id)}
                        />
                        <div>
                          <div style={{ fontWeight: '600', color: '#1a202c', fontSize: '13px' }}>
                            {transaction.reference}
                          </div>
                          <div style={{ color: '#718096', fontSize: '12px' }}>
                            {transaction.description}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '14px' }}>
                      <div>
                        <div style={{ fontWeight: '600', color: '#1a202c', fontSize: '13px' }}>
                          {transaction.userInfo?.name || 'Unknown User'}
                        </div>
                        <div style={{ color: '#718096', fontSize: '12px' }}>
                          {transaction.userInfo?.email || 'N/A'}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontWeight: '600',
                        backgroundColor: `${getTypeColor(transaction.type)}20`,
                        color: getTypeColor(transaction.type),
                        textTransform: 'uppercase'
                      }}>
                        {transaction.type.replace('_', ' ')}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: '600' }}>
                      <span style={{ color: transaction.type.includes('debit') ? '#ff3b30' : '#28a745' }}>
                        {transaction.type.includes('debit') ? '-' : '+'}{formatCurrency(transaction.amount)}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontWeight: '600',
                        backgroundColor: `${getStatusColor(transaction.status)}20`,
                        color: getStatusColor(transaction.status),
                        textTransform: 'uppercase'
                      }}>
                        {transaction.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '14px', color: '#718096', textTransform: 'capitalize' }}>
                      {transaction.category}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '14px', color: '#718096' }}>
                      {formatDate(transaction.createdAt)}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        <button
                          onClick={() => handleViewDetails(transaction)}
                          style={{
                            padding: '4px 8px',
                            backgroundColor: '#ff3b30',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px'
                          }}
                        >
                          View
                        </button>
                        {transaction.status === 'failed' && (
                          <button 
                            onClick={() => handleRetryTransaction(transaction._id)}
                            style={{
                              padding: '4px 8px',
                              backgroundColor: '#ff8c00',
                              color: '#fff',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '12px'
                            }}
                          >
                            Retry
                          </button>
                        )}
                        {transaction.status === 'pending' && (
                          <button
                            onClick={() => handleCancelTransaction(transaction._id)}
                            style={{
                              padding: '4px 8px',
                              backgroundColor: '#dc3545',
                              color: '#fff',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '12px'
                            }}
                          >
                            Cancel
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteTransaction(transaction._id)}
                          style={{
                            padding: '4px 8px',
                            backgroundColor: '#dc2626',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px'
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div style={{
            padding: '16px 24px',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#f7fafc'
          }}>
            <div style={{ fontSize: '14px', color: '#718096' }}>
              Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} transactions
            </div>
            <div style={{ display: 'flex', gap: '4px' }}>
              <button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page <= 1}
                style={{
                  padding: '6px 12px',
                  backgroundColor: pagination.page <= 1 ? '#f1f5f9' : '#fff',
                  color: pagination.page <= 1 ? '#9ca3af' : '#1a202c',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  cursor: pagination.page <= 1 ? 'not-allowed' : 'pointer',
                  fontSize: '14px'
                }}
              >
                Previous
              </button>
              {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                const page = i + Math.max(1, pagination.page - 2);
                return page <= pagination.pages ? (
                  <button
                    key={page}
                    onClick={() => handlePageChange(page)}
                    style={{
                      padding: '6px 12px',
                      backgroundColor: page === pagination.page ? '#ff3b30' : '#fff',
                      color: page === pagination.page ? '#fff' : '#1a202c',
                      border: '1px solid #e2e8f0',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '14px'
                    }}
                  >
                    {page}
                  </button>
                ) : null;
              })}
              <button
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page >= pagination.pages}
                style={{
                  padding: '6px 12px',
                  backgroundColor: pagination.page >= pagination.pages ? '#f1f5f9' : '#fff',
                  color: pagination.page >= pagination.pages ? '#9ca3af' : '#1a202c',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  cursor: pagination.page >= pagination.pages ? 'not-allowed' : 'pointer',
                  fontSize: '14px'
                }}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TransactionManagement;