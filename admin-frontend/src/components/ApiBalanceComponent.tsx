import React, { useState, useEffect } from 'react';

interface ApiBalance {
  provider: string;
  balance: number;
  currency: string;
  lastUpdated: string;
  loading: boolean;
  status: string;
}

const ApiBalanceComponent: React.FC = () => {
  const [balances, setBalances] = useState<ApiBalance[]>([
    {
      provider: 'ClubKonnect',
      balance: 0,
      currency: '₦',
      lastUpdated: '',
      loading: true,
      status: 'Loading...'
    },
    {
      provider: 'ConnectPay',
      balance: 0,
      currency: '₦',
      lastUpdated: '',
      loading: true,
      status: 'Loading...'
    }
  ]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchApiBalances = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('admin_token') || sessionStorage.getItem('admin_token');
      
      // Use the dashboard-balance endpoint
      const response = await fetch('https://vtu-application.onrender.com/api/clubkonnect/dashboard-balance', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      
      if (response.ok) {
        const data = await response.json();
        
        // Update state with both ClubKonnect and Platform balances
        setBalances([
          {
            provider: data.data.clubKonnect.provider,
            balance: data.data.clubKonnect.balance,
            currency: data.data.clubKonnect.currency,
            lastUpdated: now,
            loading: false,
            status: data.data.clubKonnect.status
          },
          {
            provider: data.data.platform.provider,
            balance: data.data.platform.balance,
            currency: data.data.platform.currency,
            lastUpdated: now,
            loading: false,
            status: data.data.platform.status
          }
        ]);
        setError(null);
      } else {
        // Fallback to mock data
        const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        setBalances([
          {
            provider: 'ClubKonnect',
            balance: 15420.75,
            currency: '₦',
            lastUpdated: now,
            loading: false,
            status: 'Demo Data'
          },
          {
            provider: 'ConnectPay',
            balance: 89250.30,
            currency: '₦',
            lastUpdated: now,
            loading: false,
            status: 'Demo Data'
          }
        ]);
      }
    } catch (error) {
      console.error('Error fetching API balances:', error);
      const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      
      setBalances([
        {
          provider: 'ClubKonnect',
          balance: 15420.75,
          currency: '₦',
          lastUpdated: now,
          loading: false,
          status: 'Connection Error'
        },
        {
          provider: 'ConnectPay',
          balance: 89250.30,
          currency: '₦',
          lastUpdated: now,
          loading: false,
          status: 'Online'
        }
      ]);
      setError('Unable to fetch real-time balances. Showing demo data.');
    } finally {
      setLoading(false);
    }
  };

  const formatBalance = (balance: number, currency: string): string => {
    return `${currency}${balance.toLocaleString('en-NG', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  };

  useEffect(() => {
    fetchApiBalances();
    
    // Refresh balance every 5 minutes
    const interval = setInterval(fetchApiBalances, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{
      backgroundColor: '#fff',
      padding: '16px',
      borderRadius: '12px',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
      border: '1px solid #e2e8f0',
      marginBottom: '20px'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px'
      }}>
        <h3 style={{
          fontSize: '16px',
          fontWeight: '600',
          color: '#1a202c',
          margin: 0
        }}>
          API Balances
        </h3>
        <button
          onClick={fetchApiBalances}
          disabled={loading}
          style={{
            padding: '6px 12px',
            backgroundColor: '#ff3b30',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: '500',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            opacity: loading ? 0.7 : 1
          }}
        >
          {loading ? 'Refreshing...' : '↻ Refresh'}
        </button>
      </div>

      {error && (
        <div style={{
          backgroundColor: '#fff5f5',
          border: '1px solid #fed7d7',
          color: '#c53030',
          padding: '12px',
          borderRadius: '8px',
          marginBottom: '12px',
          fontSize: '14px'
        }}>
          ⚠️ {error}
        </div>
      )}

      <div style={{
        display: 'grid',
        gap: '12px'
      }}>
        {balances.map((api, index) => (
          <div
            key={index}
            style={{
              backgroundColor: '#f7fafc',
              padding: '16px',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              opacity: api.loading ? 0.7 : 1
            }}
          >
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '8px'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  backgroundColor: api.provider === 'ClubKonnect' ? '#10b981' : '#ff3b30',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  color: '#fff'
                }}>
                  {api.provider === 'ClubKonnect' ? 'CK' : 'CP'}
                </div>
                <div>
                  <h4 style={{
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#1a202c',
                    margin: '0 0 2px 0'
                  }}>
                    {api.provider}
                  </h4>
                  <span style={{
                    fontSize: '11px',
                    color: '#718096',
                    backgroundColor: '#e2e8f0',
                    padding: '2px 6px',
                    borderRadius: '4px'
                  }}>
                    {api.status}
                  </span>
                </div>
              </div>
              
              <div style={{ textAlign: 'right' }}>
                <div style={{
                  fontSize: '20px',
                  fontWeight: '700',
                  color: api.provider === 'ClubKonnect' ? '#10b981' : '#ff3b30',
                  marginBottom: '4px'
                }}>
                  {api.loading ? 'Loading...' : formatBalance(api.balance, api.currency)}
                </div>
                {api.lastUpdated && !api.loading && (
                  <p style={{
                    fontSize: '11px',
                    color: '#a0aec0',
                    margin: 0
                  }}>
                    Updated: {api.lastUpdated}
                  </p>
                )}
              </div>
            </div>
            
            {api.balance < 1000 && api.balance > 0 && !api.loading && (
              <div style={{
                backgroundColor: '#fff7ed',
                border: '1px solid #fed7aa',
                color: '#c2410c',
                padding: '8px',
                borderRadius: '6px',
                fontSize: '12px',
                marginTop: '10px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                ⚠️ Low balance! Consider topping up.
              </div>
            )}
            
            {api.balance === 0 && !api.loading && (
              <div style={{
                backgroundColor: '#fff5f5',
                border: '1px solid #fed7d7',
                color: '#c53030',
                padding: '8px',
                borderRadius: '6px',
                fontSize: '12px',
                marginTop: '10px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                🚨 Zero balance! Top up required.
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ApiBalanceComponent;