import React, { useState, useEffect } from 'react';
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://vtu-application.onrender.com';

// TypeScript Interfaces
interface GatewayData {
  enabled: boolean;
  hasKeys: boolean;
  totalTransactions: number;
  successfulTransactions: number;
  totalAmount: number;
  successRate: number;
}

interface SwitchHistory {
  from?: string;
  to?: string;
  switchedAt?: string;
  reason?: string;
}

interface GatewayConfig {
  activeGateway: 'paystack' | 'monnify';
  gateways: {
    paystack: GatewayData;
    monnify: GatewayData;
  };
  recentSwitches: SwitchHistory[];
}

const PaymentGatewayConfig: React.FC = () => {
  const [isMobile, setIsMobile] = useState<boolean>(window.innerWidth < 768);
  const [loading, setLoading] = useState<boolean>(true);
  const [switching, setSwitching] = useState<boolean>(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState<boolean>(false);
  const [targetGateway, setTargetGateway] = useState<'paystack' | 'monnify' | null>(null);
  const [gatewayConfig, setGatewayConfig] = useState<GatewayConfig>({
    activeGateway: 'paystack',
    gateways: {
      paystack: {
        enabled: true,
        hasKeys: false,
        totalTransactions: 0,
        successfulTransactions: 0,
        totalAmount: 0,
        successRate: 0
      },
      monnify: {
        enabled: true,
        hasKeys: false,
        totalTransactions: 0,
        successfulTransactions: 0,
        totalAmount: 0,
        successRate: 0
      }
    },
    recentSwitches: []
  });

  // Check screen size
  useEffect(() => {
    const checkScreenSize = (): void => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // Fetch gateway configuration
  const fetchGatewayConfig = async (): Promise<void> => {
    try {
      setLoading(true);
      const token = localStorage.getItem('admin_token') || sessionStorage.getItem('admin_token');
      
     const response = await fetch(`${API_BASE_URL}/api/admin/payment-gateway/config`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error('Failed to fetch gateway config');

      const data = await response.json();
      if (data.success) {
        setGatewayConfig(data.data);
      }
    } catch (error) {
      console.error('Error fetching gateway config:', error);
      alert('Failed to load payment gateway configuration');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGatewayConfig();
    // Refresh every 30 seconds
    const interval = setInterval(fetchGatewayConfig, 30000);
    return () => clearInterval(interval);
  }, []);

  // Handle gateway switch
  const handleSwitchGateway = async (): Promise<void> => {
    if (!targetGateway) return;

    try {
      setSwitching(true);
      const token = localStorage.getItem('admin_token') || sessionStorage.getItem('admin_token');

     const response = await fetch(`${API_BASE_URL}/api/admin/payment-gateway/switch`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          gateway: targetGateway,
          reason: 'Manual switch via admin dashboard'
        })
      });

      const data = await response.json();

      if (data.success) {
        alert(`✅ Successfully switched to ${targetGateway === 'paystack' ? 'Paystack' : 'Monnify'}!`);
        await fetchGatewayConfig();
      } else {
        alert(`❌ ${data.message || 'Failed to switch gateway'}`);
      }
    } catch (error) {
      console.error('Error switching gateway:', error);
      alert('❌ Failed to switch payment gateway');
    } finally {
      setSwitching(false);
      setShowConfirmDialog(false);
      setTargetGateway(null);
    }
  };

  const initiateSwitch = (gateway: 'paystack' | 'monnify'): void => {
    if (gateway === gatewayConfig.activeGateway) {
      alert(`${gateway === 'paystack' ? 'Paystack' : 'Monnify'} is already the active gateway`);
      return;
    }
    setTargetGateway(gateway);
    setShowConfirmDialog(true);
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString?: string): string => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString('en-NG', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '400px',
        color: '#718096'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>💳</div>
          <p>Loading payment gateway configuration...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', maxWidth: '100%' }}>
      {/* Header */}
      <div style={{
        backgroundColor: '#fff',
        padding: isMobile ? '16px' : '20px',
        borderRadius: '12px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        border: '1px solid #e2e8f0',
        marginBottom: '20px'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '12px',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div>
            <h2 style={{
              fontSize: isMobile ? '18px' : '20px',
              fontWeight: '700',
              color: '#1a202c',
              margin: 0
            }}>
              💳 Payment Gateway Configuration
            </h2>
            <p style={{
              fontSize: isMobile ? '13px' : '14px',
              color: '#718096',
              margin: '4px 0 0 0'
            }}>
              Switch between Paystack and Monnify payment gateways
            </p>
          </div>
          <button
            onClick={fetchGatewayConfig}
            disabled={loading}
            style={{
              padding: '8px 16px',
              backgroundColor: '#f7fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              color: '#1a202c'
            }}
          >
            🔄 Refresh
          </button>
        </div>

        {/* Active Gateway Indicator */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 16px',
          backgroundColor: '#fff5f5',
          border: '1px solid #ff3b30',
          borderRadius: '8px',
          fontSize: '14px',
          fontWeight: '600',
          color: '#ff3b30'
        }}>
          <span style={{ fontSize: '16px' }}>✅</span>
          Active Gateway: {gatewayConfig.activeGateway === 'paystack' ? 'Paystack' : 'Monnify'}
        </div>
      </div>

      {/* Gateway Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
        gap: isMobile ? '16px' : '20px',
        marginBottom: '20px'
      }}>
        {/* Paystack Card */}
        <div style={{
          backgroundColor: '#fff',
          padding: isMobile ? '16px' : '20px',
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
          border: gatewayConfig.activeGateway === 'paystack' ? '2px solid #ff3b30' : '1px solid #e2e8f0',
          position: 'relative'
        }}>
          {/* Active Badge */}
          {gatewayConfig.activeGateway === 'paystack' && (
            <div style={{
              position: 'absolute',
              top: '12px',
              right: '12px',
              backgroundColor: '#ff3b30',
              color: '#fff',
              padding: '4px 12px',
              borderRadius: '12px',
              fontSize: '11px',
              fontWeight: '700'
            }}>
              ACTIVE
            </div>
          )}

          {/* Header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '16px'
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              backgroundColor: '#ff3b30',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px',
              fontWeight: 'bold',
              color: '#fff'
            }}>
              P
            </div>
            <div>
              <h3 style={{
                fontSize: '18px',
                fontWeight: '700',
                color: '#1a202c',
                margin: 0
              }}>
                Paystack
              </h3>
              <p style={{
                fontSize: '13px',
                color: '#718096',
                margin: '2px 0 0 0'
              }}>
                {gatewayConfig.gateways.paystack.hasKeys ? '✅ Configured' : '⚠️ Not Configured'}
              </p>
            </div>
          </div>

          {/* Stats */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '12px',
            marginBottom: '16px'
          }}>
            <div style={{
              backgroundColor: '#f7fafc',
              padding: '12px',
              borderRadius: '8px',
              border: '1px solid #e2e8f0'
            }}>
              <p style={{ fontSize: '12px', color: '#718096', margin: 0 }}>Total Transactions</p>
              <p style={{ fontSize: '18px', fontWeight: '700', color: '#1a202c', margin: '4px 0 0 0' }}>
                {gatewayConfig.gateways.paystack.totalTransactions.toLocaleString()}
              </p>
            </div>
            <div style={{
              backgroundColor: '#f7fafc',
              padding: '12px',
              borderRadius: '8px',
              border: '1px solid #e2e8f0'
            }}>
              <p style={{ fontSize: '12px', color: '#718096', margin: 0 }}>Success Rate</p>
              <p style={{ fontSize: '18px', fontWeight: '700', color: '#ff3b30', margin: '4px 0 0 0' }}>
                {gatewayConfig.gateways.paystack.successRate}%
              </p>
            </div>
            <div style={{
              backgroundColor: '#f7fafc',
              padding: '12px',
              borderRadius: '8px',
              border: '1px solid #e2e8f0'
            }}>
              <p style={{ fontSize: '12px', color: '#718096', margin: 0 }}>Total Amount</p>
              <p style={{ fontSize: '16px', fontWeight: '700', color: '#1a202c', margin: '4px 0 0 0' }}>
                {formatCurrency(gatewayConfig.gateways.paystack.totalAmount)}
              </p>
            </div>
            <div style={{
              backgroundColor: '#f7fafc',
              padding: '12px',
              borderRadius: '8px',
              border: '1px solid #e2e8f0'
            }}>
              <p style={{ fontSize: '12px', color: '#718096', margin: 0 }}>Successful</p>
              <p style={{ fontSize: '16px', fontWeight: '700', color: '#ff3b30', margin: '4px 0 0 0' }}>
                {gatewayConfig.gateways.paystack.successfulTransactions.toLocaleString()}
              </p>
            </div>
          </div>

          {/* Switch Button */}
          <button
            onClick={() => initiateSwitch('paystack')}
            disabled={gatewayConfig.activeGateway === 'paystack' || !gatewayConfig.gateways.paystack.enabled || switching}
            style={{
              width: '100%',
              padding: '10px',
              backgroundColor: gatewayConfig.activeGateway === 'paystack' ? '#e2e8f0' : '#ff3b30',
              color: gatewayConfig.activeGateway === 'paystack' ? '#718096' : '#fff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: gatewayConfig.activeGateway === 'paystack' ? 'not-allowed' : 'pointer'
            }}
          >
            {gatewayConfig.activeGateway === 'paystack' ? '✅ Currently Active' : '🔄 Switch to Paystack'}
          </button>
        </div>

        {/* Monnify Card */}
        <div style={{
          backgroundColor: '#fff',
          padding: isMobile ? '16px' : '20px',
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
          border: gatewayConfig.activeGateway === 'monnify' ? '2px solid #ff3b30' : '1px solid #e2e8f0',
          position: 'relative'
        }}>
          {/* Active Badge */}
          {gatewayConfig.activeGateway === 'monnify' && (
            <div style={{
              position: 'absolute',
              top: '12px',
              right: '12px',
              backgroundColor: '#ff3b30',
              color: '#fff',
              padding: '4px 12px',
              borderRadius: '12px',
              fontSize: '11px',
              fontWeight: '700'
            }}>
              ACTIVE
            </div>
          )}

          {/* Header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '16px'
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              backgroundColor: '#ff3b30',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px',
              fontWeight: 'bold',
              color: '#fff'
            }}>
              M
            </div>
            <div>
              <h3 style={{
                fontSize: '18px',
                fontWeight: '700',
                color: '#1a202c',
                margin: 0
              }}>
                Monnify
              </h3>
              <p style={{
                fontSize: '13px',
                color: '#718096',
                margin: '2px 0 0 0'
              }}>
                {gatewayConfig.gateways.monnify.hasKeys ? '✅ Configured' : '⚠️ Not Configured'}
              </p>
            </div>
          </div>

          {/* Stats */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '12px',
            marginBottom: '16px'
          }}>
            <div style={{
              backgroundColor: '#f7fafc',
              padding: '12px',
              borderRadius: '8px',
              border: '1px solid #e2e8f0'
            }}>
              <p style={{ fontSize: '12px', color: '#718096', margin: 0 }}>Total Transactions</p>
              <p style={{ fontSize: '18px', fontWeight: '700', color: '#1a202c', margin: '4px 0 0 0' }}>
                {gatewayConfig.gateways.monnify.totalTransactions.toLocaleString()}
              </p>
            </div>
            <div style={{
              backgroundColor: '#f7fafc',
              padding: '12px',
              borderRadius: '8px',
              border: '1px solid #e2e8f0'
            }}>
              <p style={{ fontSize: '12px', color: '#718096', margin: 0 }}>Success Rate</p>
              <p style={{ fontSize: '18px', fontWeight: '700', color: '#ff3b30', margin: '4px 0 0 0' }}>
                {gatewayConfig.gateways.monnify.successRate}%
              </p>
            </div>
            <div style={{
              backgroundColor: '#f7fafc',
              padding: '12px',
              borderRadius: '8px',
              border: '1px solid #e2e8f0'
            }}>
              <p style={{ fontSize: '12px', color: '#718096', margin: 0 }}>Total Amount</p>
              <p style={{ fontSize: '16px', fontWeight: '700', color: '#1a202c', margin: '4px 0 0 0' }}>
                {formatCurrency(gatewayConfig.gateways.monnify.totalAmount)}
              </p>
            </div>
            <div style={{
              backgroundColor: '#f7fafc',
              padding: '12px',
              borderRadius: '8px',
              border: '1px solid #e2e8f0'
            }}>
              <p style={{ fontSize: '12px', color: '#718096', margin: 0 }}>Successful</p>
              <p style={{ fontSize: '16px', fontWeight: '700', color: '#ff3b30', margin: '4px 0 0 0' }}>
                {gatewayConfig.gateways.monnify.successfulTransactions.toLocaleString()}
              </p>
            </div>
          </div>

          {/* Switch Button */}
          <button
            onClick={() => initiateSwitch('monnify')}
            disabled={gatewayConfig.activeGateway === 'monnify' || !gatewayConfig.gateways.monnify.enabled || switching}
            style={{
              width: '100%',
              padding: '10px',
              backgroundColor: gatewayConfig.activeGateway === 'monnify' ? '#e2e8f0' : '#ff3b30',
              color: gatewayConfig.activeGateway === 'monnify' ? '#718096' : '#fff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: gatewayConfig.activeGateway === 'monnify' ? 'not-allowed' : 'pointer'
            }}
          >
            {gatewayConfig.activeGateway === 'monnify' ? '✅ Currently Active' : '🔄 Switch to Monnify'}
          </button>
        </div>
      </div>

      {/* Recent Switches */}
      {gatewayConfig.recentSwitches && gatewayConfig.recentSwitches.length > 0 && (
        <div style={{
          backgroundColor: '#fff',
          padding: isMobile ? '16px' : '20px',
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
          border: '1px solid #e2e8f0'
        }}>
          <h3 style={{
            fontSize: isMobile ? '16px' : '18px',
            fontWeight: '700',
            color: '#1a202c',
            marginBottom: '16px'
          }}>
            📜 Recent Gateway Switches
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {gatewayConfig.recentSwitches.map((switchItem, index) => (
              <div key={index} style={{
                padding: '12px',
                backgroundColor: '#f7fafc',
                borderRadius: '8px',
                border: '1px solid #e2e8f0'
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '8px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '16px' }}>🔄</span>
                    <span style={{ fontSize: '14px', color: '#1a202c', fontWeight: '600' }}>
                      {switchItem.from?.toUpperCase()} → {switchItem.to?.toUpperCase()}
                    </span>
                  </div>
                  <span style={{ fontSize: '13px', color: '#718096' }}>
                    {formatDate(switchItem.switchedAt)}
                  </span>
                </div>
                {switchItem.reason && (
                  <p style={{
                    fontSize: '13px',
                    color: '#718096',
                    margin: '8px 0 0 24px'
                  }}>
                    {switchItem.reason}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <>
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              zIndex: 9998,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onClick={() => !switching && setShowConfirmDialog(false)}
          />
          <div style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            backgroundColor: '#fff',
            padding: isMobile ? '20px' : '24px',
            borderRadius: '12px',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.2)',
            zIndex: 9999,
            maxWidth: isMobile ? '90%' : '400px',
            width: '100%'
          }}>
            <h3 style={{
              fontSize: '18px',
              fontWeight: '700',
              color: '#1a202c',
              margin: '0 0 12px 0'
            }}>
              ⚠️ Confirm Gateway Switch
            </h3>
            <p style={{
              fontSize: '14px',
              color: '#718096',
              margin: '0 0 20px 0',
              lineHeight: '1.5'
            }}>
              Are you sure you want to switch to <strong>{targetGateway === 'paystack' ? 'Paystack' : 'Monnify'}</strong>? 
              This will affect all new transactions immediately.
            </p>
            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={() => !switching && setShowConfirmDialog(false)}
                disabled={switching}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#f7fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: switching ? 'not-allowed' : 'pointer',
                  color: '#1a202c'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSwitchGateway}
                disabled={switching}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#ff3b30',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: switching ? 'not-allowed' : 'pointer',
                  color: '#fff',
                  opacity: switching ? 0.7 : 1
                }}
              >
                {switching ? 'Switching...' : 'Yes, Switch Gateway'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default PaymentGatewayConfig;