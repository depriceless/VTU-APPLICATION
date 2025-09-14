import React, { useState, useEffect } from 'react';

const ServiceManagement = () => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [activeTab, setActiveTab] = useState('overview');
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedService, setSelectedService] = useState(null);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [overviewData, setOverviewData] = useState({
    services: {
      airtime: { providers: 4, status: 'active' },
      data: { providers: 4, status: 'active' },
      cableTV: { providers: 3, status: 'active' },
      electricity: { providers: 5, status: 'maintenance' },
      betting: { providers: 7, status: 'active' }
    },
    summary: {
      totalServices: 5,
      activeServices: 4,
      maintenanceServices: 1,
      totalProviders: 23,
      overallSuccessRate: 96.8
    }
  });

  // Sample service data - replace with actual API calls
  const [serviceData, setServiceData] = useState({
    airtime: {
      providers: [
        { id: 'mtn', name: 'MTN', status: 'active', commission: 2.5, successRate: 98.5 },
        { id: 'airtel', name: 'Airtel', status: 'active', commission: 2.0, successRate: 97.8 },
        { id: 'glo', name: 'Glo', status: 'maintenance', commission: 1.8, successRate: 95.2 },
        { id: '9mobile', name: '9Mobile', status: 'active', commission: 2.2, successRate: 96.4 }
      ]
    },
    data: {
      plans: [
        { id: 1, provider: 'MTN', plan: '1GB Monthly', price: 1200, status: 'active', popularity: 95 },
        { id: 2, provider: 'MTN', plan: '2GB Monthly', price: 2400, status: 'active', popularity: 88 },
        { id: 3, provider: 'Airtel', plan: '1.5GB Monthly', price: 1000, status: 'active', popularity: 92 },
        { id: 4, provider: 'Glo', plan: '3GB Monthly', price: 1500, status: 'inactive', popularity: 78 }
      ]
    },
    cableTv: {
      providers: [
        { id: 'dstv', name: 'DStv', status: 'active', packages: 15, successRate: 99.2 },
        { id: 'gotv', name: 'GOtv', status: 'active', packages: 8, successRate: 98.7 },
        { id: 'startimes', name: 'Startimes', status: 'maintenance', packages: 6, successRate: 97.5 }
      ]
    },
    electricity: {
      discos: [
        { id: 'ekedc', name: 'Eko Electric', status: 'active', successRate: 96.8 },
        { id: 'ikedc', name: 'Ikeja Electric', status: 'active', successRate: 95.5 },
        { id: 'aedc', name: 'Abuja Electric', status: 'maintenance', successRate: 94.2 }
      ]
    }
  });

  // Fetch data from API
  useEffect(() => {
    const fetchOverviewData = async () => {
      try {
        const token = localStorage.getItem('adminToken') || localStorage.getItem('token');
        if (!token) {
          console.log('No admin token found, using default data');
          setLoading(false);
          return;
        }

        const response = await fetch('/api/services/overview', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setOverviewData(data.data);
          }
        } else {
          console.error('Failed to fetch overview data:', response.status);
        }
      } catch (error) {
        console.error('Error fetching overview:', error);
      } finally {
        setLoading(false);
      }
    };

    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    window.addEventListener('resize', checkScreenSize);
    
    // Fetch data
    fetchOverviewData();

    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  const tabs = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'airtime', label: 'Airtime', icon: '📞' },
    { id: 'data', label: 'Data Plans', icon: '📶' },
    { id: 'cable', label: 'Cable TV', icon: '📺' },
    { id: 'electricity', label: 'Electricity', icon: '⚡' },
    { id: 'pricing', label: 'Pricing', icon: '💲' }
  ];

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return '#28a745';
      case 'inactive': return '#6c757d';
      case 'maintenance': return '#ffc107';
      default: return '#6c757d';
    }
  };

  const getStatusBadge = (status) => (
    <span style={{
      backgroundColor: getStatusColor(status),
      color: '#fff',
      padding: '2px 8px',
      borderRadius: '12px',
      fontSize: '11px',
      fontWeight: '600',
      textTransform: 'capitalize'
    }}>
      {status}
    </span>
  );

  const handleStatusToggle = async (serviceType, providerId, currentStatus) => {
    try {
      const newStatus = currentStatus === 'active' ? 'maintenance' : 'active';
      const token = localStorage.getItem('adminToken') || localStorage.getItem('token');
      
      if (!token) {
        alert('Please login to perform this action');
        return;
      }

      const response = await fetch(`/api/services/${serviceType}/${providerId}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        // Update local state
        setServiceData(prev => {
          const updated = { ...prev };
          if (serviceType === 'airtime' && updated.airtime?.providers) {
            updated.airtime.providers = updated.airtime.providers.map(provider =>
              provider.id === providerId ? { ...provider, status: newStatus } : provider
            );
          } else if (serviceType === 'data' && updated.data?.plans) {
            updated.data.plans = updated.data.plans.map(plan =>
              plan.id === providerId ? { ...plan, status: newStatus } : plan
            );
          } else if (serviceType === 'cable' && updated.cableTv?.providers) {
            updated.cableTv.providers = updated.cableTv.providers.map(provider =>
              provider.id === providerId ? { ...provider, status: newStatus } : provider
            );
          } else if (serviceType === 'electricity' && updated.electricity?.discos) {
            updated.electricity.discos = updated.electricity.discos.map(disco =>
              disco.id === providerId ? { ...disco, status: newStatus } : disco
            );
          }
          return updated;
        });

        alert(`Service status updated to ${newStatus}`);
      } else {
        const errorData = await response.json();
        alert(`Failed to update status: ${errorData.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error updating service status:', error);
      alert('Failed to update service status');
    }
  };

  const renderOverview = () => {
    const services = overviewData.services || {};
    const summary = overviewData.summary || {};

    return (
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
        <div style={{
          backgroundColor: '#fff',
          padding: '20px',
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
          border: '1px solid #e2e8f0'
        }}>
          <h3 style={{ color: '#1a202c', fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
            Service Status Overview
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {Object.entries(services).map(([serviceKey, service]) => (
              <div key={serviceKey} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px',
                backgroundColor: '#f7fafc',
                borderRadius: '8px'
              }}>
                <div>
                  <p style={{ margin: 0, fontSize: '14px', fontWeight: '600', color: '#1a202c' }}>
                    {serviceKey === 'cableTV' ? 'Cable TV' : serviceKey.charAt(0).toUpperCase() + serviceKey.slice(1)}
                  </p>
                  <p style={{ margin: 0, fontSize: '12px', color: '#718096' }}>
                    {service.providers} providers
                  </p>
                </div>
                {getStatusBadge(service.status)}
              </div>
            ))}
          </div>
        </div>

        <div style={{
          backgroundColor: '#fff',
          padding: '20px',
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
          border: '1px solid #e2e8f0'
        }}>
          <h3 style={{ color: '#1a202c', fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
            Performance Metrics
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            {[
              { metric: 'Overall Success Rate', value: `${summary.overallSuccessRate || 0}%`, color: '#28a745' },
              { metric: 'Active Services', value: summary.activeServices || 0, color: '#007bff' },
              { metric: 'Total Providers', value: summary.totalProviders || 0, color: '#ff8c00' },
              { metric: 'Maintenance', value: summary.maintenanceServices || 0, color: '#ffc107' }
            ].map((item, index) => (
              <div key={index} style={{ textAlign: 'center' }}>
                <p style={{
                  fontSize: '24px',
                  fontWeight: '700',
                  color: item.color,
                  margin: '0 0 4px 0'
                }}>
                  {item.value}
                </p>
                <p style={{ fontSize: '12px', color: '#718096', margin: 0 }}>
                  {item.metric}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderAirtimeServices = () => (
    <div style={{
      backgroundColor: '#fff',
      padding: '20px',
      borderRadius: '12px',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
      border: '1px solid #e2e8f0'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <h3 style={{ color: '#1a202c', fontSize: '18px', fontWeight: '600', margin: 0 }}>
          Airtime Service Providers
        </h3>
        <button style={{
          backgroundColor: '#ff3b30',
          color: '#fff',
          border: 'none',
          padding: '8px 16px',
          borderRadius: '8px',
          fontSize: '14px',
          fontWeight: '600',
          cursor: 'pointer'
        }}>
          Add Provider
        </button>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#f7fafc' }}>
              {['Provider', 'Status', 'Commission (%)', 'Success Rate (%)', 'Actions'].map(header => (
                <th key={header} style={{
                  padding: '12px',
                  textAlign: 'left',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#1a202c',
                  borderBottom: '1px solid #e2e8f0'
                }}>
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {serviceData.airtime.providers.map((provider) => (
              <tr key={provider.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '12px', fontSize: '14px', color: '#1a202c' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '6px',
                      backgroundColor: '#ff3b30',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '12px',
                      color: '#fff',
                      fontWeight: 'bold'
                    }}>
                      {provider.name.charAt(0)}
                    </div>
                    {provider.name}
                  </div>
                </td>
                <td style={{ padding: '12px' }}>
                  {getStatusBadge(provider.status)}
                </td>
                <td style={{ padding: '12px', fontSize: '14px', color: '#1a202c' }}>
                  {provider.commission}%
                </td>
                <td style={{ padding: '12px', fontSize: '14px', color: '#1a202c' }}>
                  {provider.successRate}%
                </td>
                <td style={{ padding: '12px' }}>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button style={{
                      backgroundColor: '#f7fafc',
                      border: '1px solid #e2e8f0',
                      padding: '4px 8px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      cursor: 'pointer'
                    }}>
                      Edit
                    </button>
                    <button 
                      onClick={() => handleStatusToggle('airtime', provider.id, provider.status)}
                      style={{
                        backgroundColor: provider.status === 'active' ? '#ffc107' : '#28a745',
                        color: '#fff',
                        border: 'none',
                        padding: '4px 8px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        cursor: 'pointer'
                      }}
                    >
                      {provider.status === 'active' ? 'Disable' : 'Enable'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderDataPlans = () => (
    <div style={{
      backgroundColor: '#fff',
      padding: '20px',
      borderRadius: '12px',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
      border: '1px solid #e2e8f0'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <h3 style={{ color: '#1a202c', fontSize: '18px', fontWeight: '600', margin: 0 }}>
          Data Bundle Plans
        </h3>
        <button style={{
          backgroundColor: '#ff3b30',
          color: '#fff',
          border: 'none',
          padding: '8px 16px',
          borderRadius: '8px',
          fontSize: '14px',
          fontWeight: '600',
          cursor: 'pointer'
        }}>
          Add Plan
        </button>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '16px'
      }}>
        {serviceData.data.plans.map((plan) => (
          <div key={plan.id} style={{
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            padding: '16px',
            backgroundColor: plan.status === 'active' ? '#f7fafc' : '#f1f5f9'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
              <div>
                <h4 style={{ fontSize: '16px', fontWeight: '600', color: '#1a202c', margin: 0 }}>
                  {plan.plan}
                </h4>
                <p style={{ fontSize: '14px', color: '#718096', margin: '4px 0' }}>
                  {plan.provider}
                </p>
              </div>
              {getStatusBadge(plan.status)}
            </div>
            
            <div style={{ marginBottom: '12px' }}>
              <p style={{ fontSize: '18px', fontWeight: '700', color: '#ff3b30', margin: 0 }}>
                ₦{plan.price.toLocaleString()}
              </p>
              <p style={{ fontSize: '12px', color: '#718096', margin: '4px 0 0 0' }}>
                Popularity: {plan.popularity}%
              </p>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button style={{
                backgroundColor: '#f7fafc',
                border: '1px solid #e2e8f0',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                cursor: 'pointer',
                flex: 1
              }}>
                Edit
              </button>
              <button 
                onClick={() => handleStatusToggle('data', plan.id, plan.status)}
                style={{
                  backgroundColor: plan.status === 'active' ? '#ffc107' : '#28a745',
                  color: '#fff',
                  border: 'none',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  cursor: 'pointer',
                  flex: 1
                }}
              >
                {plan.status === 'active' ? 'Disable' : 'Enable'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderCableTV = () => (
    <div style={{
      backgroundColor: '#fff',
      padding: '20px',
      borderRadius: '12px',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
      border: '1px solid #e2e8f0'
    }}>
      <h3 style={{ color: '#1a202c', fontSize: '18px', fontWeight: '600', marginBottom: '20px' }}>
        Cable TV Providers
      </h3>

      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '20px'
      }}>
        {serviceData.cableTv.providers.map((provider) => (
          <div key={provider.id} style={{
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '20px',
            backgroundColor: '#f7fafc'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h4 style={{ fontSize: '18px', fontWeight: '600', color: '#1a202c', margin: 0 }}>
                {provider.name}
              </h4>
              {getStatusBadge(provider.status)}
            </div>

            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '14px', color: '#718096' }}>Packages:</span>
                <span style={{ fontSize: '14px', fontWeight: '600', color: '#1a202c' }}>
                  {provider.packages}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '14px', color: '#718096' }}>Success Rate:</span>
                <span style={{ fontSize: '14px', fontWeight: '600', color: '#28a745' }}>
                  {provider.successRate}%
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button style={{
                backgroundColor: '#ff3b30',
                color: '#fff',
                border: 'none',
                padding: '8px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: '600',
                cursor: 'pointer',
                flex: 1
              }}>
                Manage Packages
              </button>
              <button 
                onClick={() => handleStatusToggle('cable', provider.id, provider.status)}
                style={{
                  backgroundColor: provider.status === 'active' ? '#ffc107' : '#28a745',
                  color: '#fff',
                  border: 'none',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
              >
                {provider.status === 'active' ? 'Disable' : 'Enable'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderElectricity = () => (
    <div style={{
      backgroundColor: '#fff',
      padding: '20px',
      borderRadius: '12px',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
      border: '1px solid #e2e8f0'
    }}>
      <h3 style={{ color: '#1a202c', fontSize: '18px', fontWeight: '600', marginBottom: '20px' }}>
        Electricity Distribution Companies
      </h3>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#f7fafc' }}>
              {['DISCO', 'Status', 'Success Rate (%)', 'Last Updated', 'Actions'].map(header => (
                <th key={header} style={{
                  padding: '12px',
                  textAlign: 'left',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#1a202c',
                  borderBottom: '1px solid #e2e8f0'
                }}>
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {serviceData.electricity.discos.map((disco) => (
              <tr key={disco.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '12px', fontSize: '14px', color: '#1a202c', fontWeight: '600' }}>
                  {disco.name}
                </td>
                <td style={{ padding: '12px' }}>
                  {getStatusBadge(disco.status)}
                </td>
                <td style={{ padding: '12px', fontSize: '14px', color: '#1a202c' }}>
                  {disco.successRate}%
                </td>
                <td style={{ padding: '12px', fontSize: '14px', color: '#718096' }}>
                  2 hours ago
                </td>
                <td style={{ padding: '12px' }}>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button style={{
                      backgroundColor: '#f7fafc',
                      border: '1px solid #e2e8f0',
                      padding: '4px 8px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      cursor: 'pointer'
                    }}>
                      Configure
                    </button>
                    <button 
                      onClick={() => handleStatusToggle('electricity', disco.id, disco.status)}
                      style={{
                        backgroundColor: disco.status === 'active' ? '#ffc107' : '#28a745',
                        color: '#fff',
                        border: 'none',
                        padding: '4px 8px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        cursor: 'pointer'
                      }}
                    >
                      {disco.status === 'active' ? 'Disable' : 'Enable'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderPricing = () => (
    <div style={{
      backgroundColor: '#fff',
      padding: '20px',
      borderRadius: '12px',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
      border: '1px solid #e2e8f0'
    }}>
      <h3 style={{ color: '#1a202c', fontSize: '18px', fontWeight: '600', marginBottom: '20px' }}>
        Service Pricing Configuration
      </h3>

      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '20px'
      }}>
        {[
          { service: 'Airtime', commission: '2.5%', markup: '0%', discountTiers: 3 },
          { service: 'Data Plans', commission: '3.0%', markup: '5%', discountTiers: 2 },
          { service: 'Cable TV', commission: '1.5%', markup: '2%', discountTiers: 1 },
          { service: 'Electricity', commission: '2.0%', markup: '1%', discountTiers: 0 }
        ].map((pricing, index) => (
          <div key={index} style={{
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '20px',
            backgroundColor: '#f7fafc'
          }}>
            <h4 style={{ fontSize: '16px', fontWeight: '600', color: '#1a202c', marginBottom: '16px' }}>
              {pricing.service}
            </h4>

            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '14px', color: '#718096' }}>Commission:</span>
                <span style={{ fontSize: '14px', fontWeight: '600', color: '#28a745' }}>
                  {pricing.commission}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '14px', color: '#718096' }}>Markup:</span>
                <span style={{ fontSize: '14px', fontWeight: '600', color: '#ff8c00' }}>
                  {pricing.markup}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '14px', color: '#718096' }}>Discount Tiers:</span>
                <span style={{ fontSize: '14px', fontWeight: '600', color: '#1a202c' }}>
                  {pricing.discountTiers}
                </span>
              </div>
            </div>

            <button style={{
              backgroundColor: '#ff3b30',
              color: '#fff',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              width: '100%'
            }}>
              Configure Pricing
            </button>
          </div>
        ))}
      </div>
    </div>
  );

  const renderTabContent = () => {
    if (loading) {
      return (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '200px',
          fontSize: '16px',
          color: '#718096',
          backgroundColor: '#fff',
          borderRadius: '12px',
          border: '1px solid #e2e8f0'
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: '40px',
              height: '40px',
              border: '3px solid #f3f3f3',
              borderTop: '3px solid #ff3b30',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 12px'
            }}></div>
            <p>Loading services...</p>
          </div>
        </div>
      );
    }

    switch (activeTab) {
      case 'overview': return renderOverview();
      case 'airtime': return renderAirtimeServices();
      case 'data': return renderDataPlans();
      case 'cable': return renderCableTV();
      case 'electricity': return renderElectricity();
      case 'pricing': return renderPricing();
      default: return renderOverview();
    }
  };

  return (
    <div style={{ width: '100%', maxWidth: '100%' }}>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
      
      {/* Header */}
      <div style={{ 
        marginBottom: '24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div>
          <h1 style={{ 
            fontSize: '28px', 
            fontWeight: '700', 
            color: '#1a202c', 
            margin: '0 0 8px 0' 
          }}>
            Service Management
          </h1>
          <p style={{ 
            fontSize: '16px', 
            color: '#718096', 
            margin: 0 
          }}>
            Manage and monitor all platform services
          </p>
        </div>
        
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button style={{
            backgroundColor: '#f7fafc',
            border: '1px solid #e2e8f0',
            padding: '8px 16px',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            color: '#1a202c'
          }}>
            Export Report
          </button>
          <button style={{
            backgroundColor: '#28a745',
            color: '#fff',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer'
          }}>
            Refresh Data
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div style={{
        backgroundColor: '#fff',
        borderRadius: '12px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        border: '1px solid #e2e8f0',
        marginBottom: '20px',
        overflow: 'hidden'
      }}>
        <div style={{
          display: 'flex',
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch'
        }}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: isMobile ? '12px 16px' : '16px 20px',
                border: 'none',
                backgroundColor: activeTab === tab.id ? '#ff3b30' : 'transparent',
                color: activeTab === tab.id ? '#fff' : '#1a202c',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                borderBottom: activeTab === tab.id ? 'none' : '2px solid transparent',
                whiteSpace: 'nowrap',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                minWidth: 'fit-content',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                if (activeTab !== tab.id) {
                  e.target.style.backgroundColor = '#f7fafc';
                }
              }}
              onMouseLeave={(e) => {
                if (activeTab !== tab.id) {
                  e.target.style.backgroundColor = 'transparent';
                }
              }}
            >
              <span style={{ fontSize: '16px' }}>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {renderTabContent()}

      {/* Quick Actions Floating Panel */}
      {!isMobile && (
        <div style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          backgroundColor: '#fff',
          borderRadius: '12px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
          border: '1px solid #e2e8f0',
          padding: '16px',
          minWidth: '200px'
        }}>
          <h4 style={{ 
            fontSize: '14px', 
            fontWeight: '600', 
            color: '#1a202c', 
            margin: '0 0 12px 0' 
          }}>
            Quick Actions
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button style={{
              backgroundColor: '#ff3b30',
              color: '#fff',
              border: 'none',
              padding: '8px 12px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer',
              textAlign: 'left'
            }}>
              🚨 Emergency Shutdown
            </button>
            <button style={{
              backgroundColor: '#28a745',
              color: '#fff',
              border: 'none',
              padding: '8px 12px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer',
              textAlign: 'left'
            }}>
              🔄 Restart All Services
            </button>
            <button style={{
              backgroundColor: '#007bff',
              color: '#fff',
              border: 'none',
              padding: '8px 12px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer',
              textAlign: 'left'
            }}>
              📊 Generate Report
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServiceManagement;