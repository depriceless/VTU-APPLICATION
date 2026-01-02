'use client';

import React, { useState } from 'react';
import { 
  AirtimeSuccessModal,
  DataSuccessModal,
  CableTVSuccessModal,
  ElectricitySuccessModal
}  from '@/components/SuccessModal/page';

export default function TestModalsPage() {
  const [activeModal, setActiveModal] = useState<string | null>(null);

  const testButtons = [
    { id: 'airtime', label: '📱 Airtime Success', color: '#dc2626' },
    { id: 'data', label: '📊 Data Success', color: '#2563eb' },
    { id: 'cable', label: '📺 Cable TV Success', color: '#7c3aed' },
    { id: 'electricity', label: '⚡ Electricity Success', color: '#f59e0b' },
  ];

  return (
    <div style={{ padding: '40px', maxWidth: '600px', margin: '0 auto' }}>
      <h1 style={{ 
        fontSize: '28px', 
        fontWeight: '700', 
        marginBottom: '16px',
        color: '#1f2937'
      }}>
        Test All Success Modals
      </h1>
      
      <p style={{ 
        color: '#6b7280', 
        marginBottom: '32px',
        fontSize: '16px'
      }}>
        Click any button below to preview how each success modal will look
      </p>

      <div style={{ display: 'grid', gap: '12px', marginBottom: '24px' }}>
        {testButtons.map(button => (
          <button
            key={button.id}
            onClick={() => setActiveModal(button.id)}
            style={{
              width: '100%',
              padding: '16px',
              background: button.color,
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            {button.label}
          </button>
        ))}
      </div>

      <div style={{ 
        padding: '16px', 
        background: '#fef3c7', 
        borderRadius: '8px',
        border: '1px solid #fde68a'
      }}>
        <p style={{ 
          fontSize: '14px', 
          color: '#92400e', 
          margin: 0,
          fontWeight: '500'
        }}>
          ℹ️ This is a test page. No API calls will be made. Your actual pages remain untouched.
        </p>
      </div>

      {/* Airtime Success Modal */}
      <AirtimeSuccessModal
        isOpen={activeModal === 'airtime'}
        onClose={() => setActiveModal(null)}
        onBuyMore={() => {
          setActiveModal(null);
          alert('Buy More Airtime clicked!');
        }}
        networkName="MTN"
        phone="08012345678"
        amount={1000}
        reference="AIRTIME-TXN-123456"
        newBalance={5000.50}
      />

      {/* Data Success Modal */}
      <DataSuccessModal
        isOpen={activeModal === 'data'}
        onClose={() => setActiveModal(null)}
        onBuyMore={() => {
          setActiveModal(null);
          alert('Buy More Data clicked!');
        }}
        networkName="AIRTEL"
        phone="08012345678"
        bundleName="5GB Monthly Plan"
        amount={2500}
        reference="DATA-TXN-789012"
        newBalance={2500.75}
      />

      {/* Cable TV Success Modal */}
      <CableTVSuccessModal
        isOpen={activeModal === 'cable'}
        onClose={() => setActiveModal(null)}
        onSubscribeMore={() => {
          setActiveModal(null);
          alert('Subscribe Again clicked!');
        }}
        provider="DSTV"
        smartCardNumber="1234567890"
        planName="Compact Plus"
        amount={12500}
        reference="CABLE-TXN-345678"
        newBalance={10000.00}
      />

      {/* Electricity Success Modal */}
      <ElectricitySuccessModal
        isOpen={activeModal === 'electricity'}
        onClose={() => setActiveModal(null)}
        onBuyMore={() => {
          setActiveModal(null);
          alert('Buy More Units clicked!');
        }}
        disco="EKEDC"
        meterNumber="12345678901"
        meterType="Prepaid"
        amount={5000}
        token="1234-5678-9012-3456"
        reference="POWER-TXN-901234"
        newBalance={15000.25}
      />
    </div>
  );
}