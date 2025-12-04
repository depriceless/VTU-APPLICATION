import React, { useState, useEffect, useCallback } from 'react';
import { API_CONFIG } from '../config/api.config';  // ADD THIS LINE

// TypeScript interfaces (keep your existing interfaces)
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

// API configuration

const API_BASE_URL = API_CONFIG.BASE_URL;

// Transaction Details Modal Component (keep your existing modal)
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

// Main TransactionManagement Component
const TransactionManagement: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedTransactions, setSelectedTransactions] = useState<string[]>([]);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [showBulkActions, setShowBulkActions] = useState<boolean>(false);

  // Filters state
  const [filters, setFilters] = useState<TransactionFilters>({
    search: '',
    status: '',
    type: '',
    category: '',
    dateFrom: '',
    dateTo: ''
  });

  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 25,
    total: 0,
    pages: 0,
    hasNext: false,
    hasPrev: false
  });

  // Check mobile screen and sidebar state
  useEffect(() => {
    const checkMobile = () => {
      const width = window.innerWidth;
      setIsMobile(width < 768);
      
      // Check if sidebar is collapsed by looking for common sidebar classes or attributes
      const sidebar = document.querySelector('[data-sidebar]');
      const isSidebarCollapsed = sidebar?.classList.contains('collapsed') || 
                                sidebar?.getAttribute('data-collapsed') === 'true' ||
                                width < 1024; // Assume sidebar is collapsed on smaller screens
      
      // Adjust table responsiveness based on sidebar state
      if (isSidebarCollapsed) {
        document.documentElement.style.setProperty('--table-min-width', '800px');
      } else {
        document.documentElement.style.setProperty('--table-min-width', '1000px');
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    // Also check when sidebar might be toggled (you might need to adjust this based on your sidebar implementation)
    const observer = new MutationObserver(checkMobile);
    observer.observe(document.body, { 
      attributes: true, 
      attributeFilter: ['class'],
      subtree: true 
    });

    return () => {
      window.removeEventListener('resize', checkMobile);
      observer.disconnect();
    };
  }, []);

  // Get auth token
  const getAuthToken = () => {
    return localStorage.getItem('admin_token') || sessionStorage.getItem('admin_token');
  };

  // Fetch transactions
  const fetchTransactions = useCallback(async (page: number = 1) => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: pagination.limit.toString(),
        sortBy: 'createdAt',
        sortOrder: 'desc',
        ...filters
      });

      // Remove undefined/empty values
      Array.from(queryParams.keys()).forEach(key => {
        const value = queryParams.get(key);
        if (!value || value === 'undefined' || value === '') {
          queryParams.delete(key);
        }
      });

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
      } else {
        throw new Error(data.message || 'Failed to fetch transactions');
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
      setTransactions([]);
      setPagination({ page: 1, limit: 25, total: 0, pages: 0 });
      alert(`Error fetching transactions: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  }, [filters, pagination.limit]);

  // Load data on mount and when dependencies change
  useEffect(() => {
    const token = getAuthToken();
    if (token) {
      fetchTransactions(1);
    }
  }, [filters]);

  // Handle filter changes
  const handleFilterChange = (key: keyof TransactionFilters, value: string | number | undefined) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
    }));
    setPagination(prev => ({ ...prev, page: 1 }));
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

  // Handle delete individual transaction
  const handleDeleteTransaction = async (transactionId: string) => {
    const confirmed = confirm('Are you sure you want to delete this transaction? This action cannot be undone.');
    if (!confirmed) return;

    const reason = prompt('Enter reason for deletion (optional):');

    try {
      setActionLoading(true);
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
    } finally {
      setActionLoading(false);
    }
  };

  // Bulk export selected transactions
  const handleBulkExport = async () => {
    if (selectedTransactions.length === 0) {
      alert('Please select transactions to export');
      return;
    }

    setActionLoading(true);
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

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `transactions_export_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      alert('Transactions exported successfully!');
    } catch (error) {
      console.error('Export error:', error);
      alert(`Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setActionLoading(false);
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

    setActionLoading(true);
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
        setShowBulkActions(false);
        fetchTransactions(pagination.page);
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      console.error('Bulk update error:', error);
      alert(`Status update failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setActionLoading(false);
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
    
    setActionLoading(true);
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
        setShowBulkActions(false);
        fetchTransactions(pagination.page);
      } else {
        throw new Error(data.message || 'Failed to delete transactions');
      }
    } catch (error) {
      console.error('Bulk delete error:', error);
      alert(`Delete failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setActionLoading(false);
    }
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

  // Get status badge component
  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { bg: '#ff8c00', text: 'Pending' },
      completed: { bg: '#28a745', text: 'Completed' },
      failed: { bg: '#ff3b30', text: 'Failed' },
      cancelled: { bg: '#6c757d', text: 'Cancelled' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;

    return (
      <span style={{
        backgroundColor: config.bg,
        color: '#fff',
        padding: '4px 8px',
        borderRadius: '12px',
        fontSize: '11px',
        fontWeight: '600',
        textTransform: 'uppercase'
      }}>
        {config.text}
      </span>
    );
  };

  // Get type badge component
  const getTypeBadge = (type: string) => {
    const typeConfig = {
      credit: { bg: '#28a745', text: 'Credit' },
      debit: { bg: '#ff3b30', text: 'Debit' },
      transfer_in: { bg: '#007bff', text: 'Transfer In' },
      transfer_out: { bg: '#6f42c1', text: 'Transfer Out' }
    };

    const config = typeConfig[type as keyof typeof typeConfig] || typeConfig.credit;

    return (
      <span style={{
        backgroundColor: config.bg,
        color: '#fff',
        padding: '4px 8px',
        borderRadius: '12px',
        fontSize: '11px',
        fontWeight: '600',
        textTransform: 'uppercase'
      }}>
        {config.text}
      </span>
    );
  };

  // Bulk Actions Dropdown
  const BulkActionsDropdown = () => {
    if (!showBulkActions || selectedTransactions.length === 0) return null;

    return (
      <div style={{
        position: 'absolute',
        right: 0,
        top: '100%',
        backgroundColor: '#fff',
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        zIndex: 100,
        minWidth: '150px',
        marginTop: '4px'
      }}>
        <button
          onClick={handleBulkExport}
          disabled={actionLoading}
          style={{
            width: '100%',
            padding: '12px 16px',
            border: 'none',
            backgroundColor: 'transparent',
            textAlign: 'left',
            fontSize: '14px',
            cursor: actionLoading ? 'not-allowed' : 'pointer',
            borderBottom: '1px solid #f1f5f9',
            color: '#000000'
          }}
        >
          Export Selected
        </button>
        <button
          onClick={() => handleBulkStatusUpdate('completed')}
          disabled={actionLoading}
          style={{
            width: '100%',
            padding: '12px 16px',
            border: 'none',
            backgroundColor: 'transparent',
            textAlign: 'left',
            fontSize: '14px',
            cursor: actionLoading ? 'not-allowed' : 'pointer',
            borderBottom: '1px solid #f1f5f9',
            color: '#000000'
          }}
        >
          Mark Completed
        </button>
        <button
          onClick={() => handleBulkStatusUpdate('failed')}
          disabled={actionLoading}
          style={{
            width: '100%',
            padding: '12px 16px',
            border: 'none',
            backgroundColor: 'transparent',
            textAlign: 'left',
            fontSize: '14px',
            cursor: actionLoading ? 'not-allowed' : 'pointer',
            borderBottom: '1px solid #f1f5f9',
            color: '#000000'
          }}
        >
          Mark Failed
        </button>
        <button
          onClick={handleBulkDelete}
          disabled={actionLoading}
          style={{
            width: '100%',
            padding: '12px 16px',
            border: 'none',
            backgroundColor: 'transparent',
            textAlign: 'left',
            fontSize: '14px',
            cursor: actionLoading ? 'not-allowed' : 'pointer',
            color: '#ff3b30'
          }}
        >
          Delete Selected
        </button>
      </div>
    );
  };

  // Pagination Controls
  const PaginationControls = () => (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: '20px',
      flexWrap: 'wrap',
      gap: '16px'
    }}>
      <div style={{
        fontSize: '14px',
        color: '#718096'
      }}>
        Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
        {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
        {pagination.total} transactions
      </div>

      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        <button
          onClick={() => fetchTransactions(pagination.page - 1)}
          disabled={!pagination.hasPrev}
          style={{
            padding: '8px 12px',
            border: '1px solid #e2e8f0',
            borderRadius: '6px',
            backgroundColor: pagination.hasPrev ? '#fff' : '#f8f9fa',
            color: pagination.hasPrev ? '#000000' : '#a0aec0',
            cursor: pagination.hasPrev ? 'pointer' : 'not-allowed',
            fontSize: '14px'
          }}
        >
          Previous
        </button>

        <span style={{
          padding: '8px 12px',
          fontSize: '14px',
          color: '#000000'
        }}>
          Page {pagination.page} of {pagination.pages}
        </span>

        <button
          onClick={() => fetchTransactions(pagination.page + 1)}
          disabled={!pagination.hasNext}
          style={{
            padding: '8px 12px',
            border: '1px solid #e2e8f0',
            borderRadius: '6px',
            backgroundColor: pagination.hasNext ? '#fff' : '#f8f9fa',
            color: pagination.hasNext ? '#000000' : '#a0aec0',
            cursor: pagination.hasNext ? 'pointer' : 'not-allowed',
            fontSize: '14px'
          }}
        >
          Next
        </button>
      </div>
    </div>
  );

  return (
    <div style={{
      width: '100%',
      maxWidth: '100%',
      overflow: 'hidden'
    }}>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        :root {
          --table-min-width: 1000px;
        }
        
        .responsive-table {
          min-width: var(--table-min-width);
        }
        
        @media (max-width: 1200px) {
          .responsive-table {
            min-width: 900px;
          }
        }
        
        @media (max-width: 768px) {
          .responsive-table {
            min-width: 800px;
          }
        }
      `}</style>

      {/* Main Content Card */}
      <div style={{
        backgroundColor: '#fff',
        borderRadius: '12px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        border: '1px solid #e2e8f0',
        overflow: 'hidden',
        width: '100%'
      }}>
        {/* Filters and Search Header */}
        <div style={{
          padding: isMobile ? '16px' : '20px',
          borderBottom: '1px solid #e2e8f0',
          backgroundColor: '#f7fafc',
          width: '100%',
          boxSizing: 'border-box'
        }}>
          <div style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            gap: '16px',
            alignItems: isMobile ? 'stretch' : 'center',
            justifyContent: 'space-between',
            marginBottom: '16px',
            width: '100%'
          }}>
            <h2 style={{
              color: '#1a202c',
              fontSize: isMobile ? '18px' : '20px',
              fontWeight: '700',
              margin: 0,
              whiteSpace: 'nowrap'
            }}>
              Transaction Management
            </h2>

            {selectedTransactions.length > 0 && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '8px 16px',
                backgroundColor: '#fff5f5',
                borderRadius: '8px',
                border: '1px solid #fed7d7',
                position: 'relative',
                flexShrink: 0
              }}>
                <span style={{
                  fontSize: '14px',
                  color: '#ff3b30',
                  fontWeight: '600',
                  whiteSpace: 'nowrap'
                }}>
                  {selectedTransactions.length} transaction{selectedTransactions.length > 1 ? 's' : ''} selected
                </span>
                <button
                  onClick={() => setShowBulkActions(!showBulkActions)}
                  disabled={actionLoading}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: '#ff3b30',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: actionLoading ? 'not-allowed' : 'pointer',
                    opacity: actionLoading ? 0.7 : 1,
                    whiteSpace: 'nowrap'
                  }}
                >
                  {actionLoading ? 'Processing...' : 'Actions'}
                </button>
                <BulkActionsDropdown />
              </div>
            )}
          </div>

          {/* Search and Filters */}
          <div style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            gap: '12px',
            alignItems: 'stretch',
            flexWrap: 'wrap'
          }}>
            {/* Search */}
            <div style={{ 
              flex: isMobile ? '1' : '2', 
              position: 'relative',
              minWidth: isMobile ? '100%' : '200px'
            }}>
              <input
                type="text"
                placeholder="Search by reference, description, user..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px 10px 36px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '14px',
                  backgroundColor: '#fff',
                  boxSizing: 'border-box',
                  color: '#000000'
                }}
              />
              <span style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#718096',
                fontSize: '14px'
              }}>
                🔍
              </span>
            </div>

            {/* Status Filter */}
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              style={{
                padding: '10px 12px',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '14px',
                backgroundColor: '#fff',
                minWidth: '120px',
                color: '#000000',
                flex: '1'
              }}
            >
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
              <option value="cancelled">Cancelled</option>
            </select>

            {/* Type Filter */}
            <select
              value={filters.type}
              onChange={(e) => handleFilterChange('type', e.target.value)}
              style={{
                padding: '10px 12px',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '14px',
                backgroundColor: '#fff',
                minWidth: '120px',
                color: '#000000',
                flex: '1'
              }}
            >
              <option value="">All Types</option>
              <option value="credit">Credit</option>
              <option value="debit">Debit</option>
              <option value="transfer_in">Transfer In</option>
              <option value="transfer_out">Transfer Out</option>
            </select>

            {/* Category Filter */}
            <select
              value={filters.category}
              onChange={(e) => handleFilterChange('category', e.target.value)}
              style={{
                padding: '10px 12px',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '14px',
                backgroundColor: '#fff',
                minWidth: '120px',
                color: '#000000',
                flex: '1'
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

          {/* Date Filters */}
          <div style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            gap: '12px',
            marginTop: '12px',
            flexWrap: 'wrap'
          }}>
            <input
              type="date"
              placeholder="Date From"
              value={filters.dateFrom}
              onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
              style={{
                padding: '10px 12px',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '14px',
                backgroundColor: '#fff',
                minWidth: '140px',
                color: '#000000',
                flex: '1'
              }}
            />
            <input
              type="date"
              placeholder="Date To"
              value={filters.dateTo}
              onChange={(e) => handleFilterChange('dateTo', e.target.value)}
              style={{
                padding: '10px 12px',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '14px',
                backgroundColor: '#fff',
                minWidth: '140px',
                color: '#000000',
                flex: '1'
              }}
            />
            <button
              onClick={() => {
                setFilters({
                  search: '',
                  status: '',
                  type: '',
                  category: '',
                  dateFrom: '',
                  dateTo: ''
                });
              }}
              style={{
                padding: '10px 16px',
                backgroundColor: '#f7fafc',
                color: '#718096',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                flex: '1',
                minWidth: '120px'
              }}
            >
              Clear Filters
            </button>
          </div>
        </div>

        {/* Transactions Table */}
        <div style={{ 
          overflowX: 'auto',
          width: '100%'
        }}>
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center' }}>
              <div style={{
                display: 'inline-block',
                width: '40px',
                height: '40px',
                border: '4px solid #f3f3f3',
                borderTop: '4px solid #ff3b30',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }} />
              <p style={{ marginTop: '16px', color: '#718096' }}>Loading transactions...</p>
            </div>
          ) : transactions.length === 0 ? (
            <div style={{
              padding: '60px 20px',
              textAlign: 'center',
              color: '#718096'
            }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>💳</div>
              <h3 style={{ color: '#1a202c', marginBottom: '8px' }}>No transactions found</h3>
              <p>Try adjusting your search or filter criteria</p>
            </div>
          ) : (
            <table className="responsive-table" style={{
              width: '100%',
              borderCollapse: 'collapse'
            }}>
              <thead>
                <tr style={{ backgroundColor: '#f8f9fa' }}>
                  <th style={{
                    padding: '16px',
                    textAlign: 'left',
                    borderBottom: '1px solid #e2e8f0',
                    width: '50px'
                  }}>
                    <input
                      type="checkbox"
                      checked={selectedTransactions.length === transactions.length && transactions.length > 0}
                      onChange={handleSelectAll}
                      style={{
                        width: '16px',
                        height: '16px',
                        cursor: 'pointer'
                      }}
                    />
                  </th>
                  <th style={{
                    padding: '16px',
                    textAlign: 'left',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#1a202c',
                    borderBottom: '1px solid #e2e8f0',
                    minWidth: '150px'
                  }}>Reference</th>
                  <th style={{
                    padding: '16px',
                    textAlign: 'left',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#1a202c',
                    borderBottom: '1px solid #e2e8f0',
                    minWidth: '150px'
                  }}>User</th>
                  <th style={{
                    padding: '16px',
                    textAlign: 'left',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#1a202c',
                    borderBottom: '1px solid #e2e8f0',
                    minWidth: '100px'
                  }}>Type</th>
                  <th style={{
                    padding: '16px',
                    textAlign: 'left',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#1a202c',
                    borderBottom: '1px solid #e2e8f0',
                    minWidth: '120px'
                  }}>Amount</th>
                  <th style={{
                    padding: '16px',
                    textAlign: 'left',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#1a202c',
                    borderBottom: '1px solid #e2e8f0',
                    minWidth: '100px'
                  }}>Status</th>
                  <th style={{
                    padding: '16px',
                    textAlign: 'left',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#1a202c',
                    borderBottom: '1px solid #e2e8f0',
                    minWidth: '120px'
                  }}>Category</th>
                  <th style={{
                    padding: '16px',
                    textAlign: 'left',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#1a202c',
                    borderBottom: '1px solid #e2e8f0',
                    minWidth: '150px'
                  }}>Date</th>
                  <th style={{
                    padding: '16px',
                    textAlign: 'right',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#1a202c',
                    borderBottom: '1px solid #e2e8f0',
                    minWidth: '180px'
                  }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((transaction) => (
                  <tr
                    key={transaction._id}
                    style={{
                      borderBottom: '1px solid #f1f5f9',
                      backgroundColor: selectedTransactions.includes(transaction._id) ? '#fff5f5' : '#fff'
                    }}
                  >
                    <td style={{ padding: '16px' }}>
                      <input
                        type="checkbox"
                        checked={selectedTransactions.includes(transaction._id)}
                        onChange={() => handleTransactionSelect(transaction._id)}
                        style={{
                          width: '16px',
                          height: '16px',
                          cursor: 'pointer'
                        }}
                      />
                    </td>
                    <td style={{ padding: '16px' }}>
                      <div>
                        <div style={{
                          fontWeight: '600',
                          color: '#1a202c',
                          fontSize: '14px'
                        }}>
                          {transaction.reference}
                        </div>
                        <div style={{
                          color: '#718096',
                          fontSize: '12px'
                        }}>
                          {transaction.description}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '16px' }}>
                      <div>
                        <div style={{
                          fontWeight: '600',
                          color: '#1a202c',
                          fontSize: '14px'
                        }}>
                          {transaction.userInfo?.name || 'Unknown User'}
                        </div>
                        <div style={{
                          color: '#718096',
                          fontSize: '12px'
                        }}>
                          {transaction.userInfo?.email || 'N/A'}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '16px' }}>
                      {getTypeBadge(transaction.type)}
                    </td>
                    <td style={{ padding: '16px' }}>
                      <div style={{
                        fontWeight: '600',
                        color: transaction.type.includes('debit') ? '#ff3b30' : '#28a745',
                        fontSize: '14px'
                      }}>
                        {transaction.type.includes('debit') ? '-' : '+'}{formatCurrency(transaction.amount)}
                      </div>
                    </td>
                    <td style={{ padding: '16px' }}>
                      {getStatusBadge(transaction.status)}
                    </td>
                    <td style={{ padding: '16px' }}>
                      <div style={{
                        color: '#1a202c',
                        fontSize: '14px',
                        textTransform: 'capitalize'
                      }}>
                        {transaction.category}
                      </div>
                    </td>
                    <td style={{ padding: '16px' }}>
                      <div style={{
                        color: '#1a202c',
                        fontSize: '14px'
                      }}>
                        {formatDate(transaction.createdAt)}
                      </div>
                    </td>
                    <td style={{ padding: '16px', textAlign: 'right' }}>
                      <div style={{ 
                        display: 'flex', 
                        gap: '8px', 
                        justifyContent: 'flex-end',
                        flexWrap: 'nowrap'
                      }}>
                        <button
                          onClick={() => handleViewDetails(transaction)}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: '#ff3b30',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          View
                        </button>
                        <button
                          onClick={() => handleDeleteTransaction(transaction._id)}
                          disabled={actionLoading}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: '#dc2626',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: '600',
                            cursor: actionLoading ? 'not-allowed' : 'pointer',
                            opacity: actionLoading ? 0.7 : 1,
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {actionLoading ? 'Deleting...' : 'Delete'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {!loading && transactions.length > 0 && (
          <div style={{ 
            padding: '16px 20px', 
            borderTop: '1px solid #e2e8f0',
            width: '100%',
            boxSizing: 'border-box'
          }}>
            <PaginationControls />
          </div>
        )}
      </div>

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
    </div>
  );
};

export default TransactionManagement;