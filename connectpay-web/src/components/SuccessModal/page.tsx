import React from 'react';
import { X } from 'lucide-react';

// Base Success Modal Component
export const SuccessModal = ({ 
  isOpen, 
  onClose, 
  title = "Transaction Successful!",
  icon = "✓",
  iconBgColor = "#dcfce7",
  iconColor = "#16a34a",
  details = [],
  children,
  actions = []
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>
          <X size={24} />
        </button>

        <div 
          className="success-icon" 
          style={{ background: iconBgColor, color: iconColor }}
        >
          {icon}
        </div>
        
        <h2 className="success-title">{title}</h2>
        
        {details.length > 0 && (
          <div className="success-details">
            {details.map((detail, index) => (
              <div 
                key={index} 
                className={`detail-row ${detail.highlight ? 'highlight' : ''}`}
              >
                <span className="detail-label">{detail.label}:</span>
                <span className="detail-value">{detail.value}</span>
              </div>
            ))}
          </div>
        )}

        {children}

        {actions.length > 0 && (
          <div className="success-actions">
            {actions.map((action, index) => (
              <button
                key={index}
                className={`action-btn ${action.variant || 'primary'}`}
                onClick={action.onClick}
              >
                {action.label}
              </button>
            ))}
          </div>
        )}

        <style jsx>{`
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
            z-index: 9999;
            padding: 16px;
            animation: fadeIn 0.2s ease-out;
          }

          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }

          .modal-content {
            background: white;
            border-radius: 16px;
            padding: 32px 24px;
            max-width: 500px;
            width: 100%;
            position: relative;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
            animation: slideUp 0.3s ease-out;
            max-height: 90vh;
            overflow-y: auto;
          }

          @keyframes slideUp {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          .modal-close {
            position: absolute;
            top: 16px;
            right: 16px;
            background: #f3f4f6;
            border: none;
            border-radius: 8px;
            width: 36px;
            height: 36px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: all 0.2s;
            color: #6b7280;
          }

          .modal-close:hover {
            background: #e5e7eb;
            color: #1f2937;
          }

          .success-icon {
            width: 64px;
            height: 64px;
            border-radius: 50%;
            font-size: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 20px;
            font-weight: 700;
          }

          .success-title {
            font-size: 24px;
            font-weight: 700;
            color: #1f2937;
            text-align: center;
            margin: 0 0 24px 0;
          }

          .success-details {
            background: #f9fafb;
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 24px;
          }

          .detail-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 10px 0;
            border-bottom: 1px solid #e5e7eb;
          }

          .detail-row:last-child {
            border-bottom: none;
          }

          .detail-row.highlight {
            background: #fef2f2;
            margin: 12px -12px -12px;
            padding: 14px 12px;
            border-radius: 0 0 8px 8px;
            border-bottom: none;
          }

          .detail-label {
            font-size: 14px;
            color: #6b7280;
            font-weight: 500;
          }

          .detail-value {
            font-size: 14px;
            color: #1f2937;
            font-weight: 600;
            text-align: right;
            word-break: break-word;
            max-width: 60%;
          }

          .detail-row.highlight .detail-value {
            color: #dc2626;
            font-size: 16px;
          }

          .success-actions {
            display: flex;
            flex-direction: column;
            gap: 10px;
          }

          .action-btn {
            width: 100%;
            padding: 14px;
            border-radius: 8px;
            font-size: 15px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
            border: none;
          }

          .action-btn.primary {
            background: #dc2626;
            color: white;
          }

          .action-btn.primary:hover {
            background: #b91c1c;
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(220, 38, 38, 0.3);
          }

          .action-btn.secondary {
            background: white;
            color: #6b7280;
            border: 1px solid #e5e7eb;
          }

          .action-btn.secondary:hover {
            background: #f9fafb;
            color: #1f2937;
          }

          .action-btn.success {
            background: #16a34a;
            color: white;
          }

          .action-btn.success:hover {
            background: #15803d;
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(22, 163, 74, 0.3);
          }

          @media (max-width: 768px) {
            .modal-content {
              padding: 24px 20px;
            }

            .success-title {
              font-size: 20px;
            }

            .success-icon {
              width: 56px;
              height: 56px;
              font-size: 28px;
            }
          }
        `}</style>
      </div>
    </div>
  );
};

// Airtime Success Modal
export const AirtimeSuccessModal = ({ 
  isOpen, 
  onClose, 
  onBuyMore,
  onPrintReceipt,
  networkName,
  phone,
  amount,
  reference
}) => {
  const details = [
    { label: 'Network', value: networkName },
    { label: 'Phone Number', value: phone },
    { label: 'Amount', value: `₦${amount?.toLocaleString()}` },
  ];

  if (reference) {
    details.push({ label: 'Reference', value: reference });
  }

  const actions = [
    { label: 'Buy More Airtime', onClick: onBuyMore, variant: 'primary' },
    { label: 'Print Receipt', onClick: onPrintReceipt || (() => alert('Print Receipt')), variant: 'success' },
    { label: 'Close', onClick: onClose, variant: 'secondary' }
  ];

  return (
    <SuccessModal
      isOpen={isOpen}
      onClose={onClose}
      title="Airtime Purchase Successful!"
      details={details}
      actions={actions}
    />
  );
};

// Data Bundle Success Modal
export const DataSuccessModal = ({ 
  isOpen, 
  onClose, 
  onBuyMore,
  onPrintReceipt,
  networkName,
  phone,
  bundleName,
  amount,
  reference
}) => {
  const details = [
    { label: 'Network', value: networkName },
    { label: 'Phone Number', value: phone },
    { label: 'Data Bundle', value: bundleName },
    { label: 'Amount', value: `₦${amount?.toLocaleString()}` },
  ];

  if (reference) {
    details.push({ label: 'Reference', value: reference });
  }

  const actions = [
    { label: 'Buy More Data', onClick: onBuyMore, variant: 'primary' },
    { label: 'Print Receipt', onClick: onPrintReceipt || (() => alert('Print Receipt')), variant: 'success' },
    { label: 'Close', onClick: onClose, variant: 'secondary' }
  ];

  return (
    <SuccessModal
      isOpen={isOpen}
      onClose={onClose}
      title="Data Purchase Successful!"
      details={details}
      actions={actions}
    />
  );
};

// Cable TV Success Modal
export const CableTVSuccessModal = ({ 
  isOpen, 
  onClose, 
  onSubscribeMore,
  onPrintReceipt,
  provider,
  smartCardNumber,
  customerName,
  planName,
  amount,
  reference
}) => {
  const details = [
    { label: 'Provider', value: provider },
    { label: 'Smart Card', value: smartCardNumber },
  ];

  if (customerName) {
    details.push({ label: 'Customer Name', value: customerName });
  }

  details.push(
    { label: 'Plan', value: planName },
    { label: 'Amount', value: `₦${amount?.toLocaleString()}` }
  );

  if (reference) {
    details.push({ label: 'Reference', value: reference });
  }

  const actions = [
    { label: 'Subscribe Again', onClick: onSubscribeMore, variant: 'primary' },
    { label: 'Print Receipt', onClick: onPrintReceipt || (() => alert('Print Receipt')), variant: 'success' },
    { label: 'Close', onClick: onClose, variant: 'secondary' }
  ];

  return (
    <SuccessModal
      isOpen={isOpen}
      onClose={onClose}
      title="Cable TV Subscription Successful!"
      details={details}
      actions={actions}
    />
  );
};

// Electricity Success Modal
export const ElectricitySuccessModal = ({ 
  isOpen, 
  onClose, 
  onBuyMore,
  onPrintReceipt,
  disco,
  meterNumber,
  meterType,
  customerName,
  amount,
  token,
  reference
}) => {
  const details = [
    { label: 'Distribution Company', value: disco },
    { label: 'Meter Number', value: meterNumber },
    { label: 'Meter Type', value: meterType },
  ];

  if (customerName) {
    details.push({ label: 'Customer Name', value: customerName });
  }

  details.push({ label: 'Amount', value: `₦${amount?.toLocaleString()}` });

  if (token) {
    details.push({ label: 'Token', value: token, highlight: true });
  }

  if (reference) {
    details.push({ label: 'Reference', value: reference });
  }

  const actions = [
    { label: 'Buy More Units', onClick: onBuyMore, variant: 'primary' },
    { label: 'Print Receipt', onClick: onPrintReceipt || (() => alert('Print Receipt')), variant: 'success' },
    { label: 'Close', onClick: onClose, variant: 'secondary' }
  ];

  return (
    <SuccessModal
      isOpen={isOpen}
      onClose={onClose}
      title="Electricity Purchase Successful!"
      icon="⚡"
      iconBgColor="#fef3c7"
      iconColor="#f59e0b"
      details={details}
      actions={actions}
    />
  );
};

// Education/Exam PIN Success Modal
export const EducationSuccessModal = ({ 
  isOpen, 
  onClose, 
  onBuyMore,
  onPrintReceipt,
  examName,
  quantity,
  phone,
  amount,
  pins,
  reference
}) => {
  const details = [
    { label: 'Exam Type', value: examName },
    { label: 'Quantity', value: quantity },
    { label: 'Phone Number', value: phone },
    { label: 'Amount', value: `₦${amount?.toLocaleString()}` },
  ];

  if (reference) {
    details.push({ label: 'Reference', value: reference });
  }

  const actions = [
    { label: 'Buy More', onClick: onBuyMore, variant: 'primary' },
    { label: 'Print Receipt', onClick: onPrintReceipt || (() => alert('Print Receipt')), variant: 'success' },
    { label: 'Close', onClick: onClose, variant: 'secondary' }
  ];

  const pinsSection = pins && pins.length > 0 ? (
    <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #e5e7eb' }}>
      <div style={{ fontSize: '15px', fontWeight: '600', color: '#1f2937', marginBottom: '12px' }}>
        Your PINs
      </div>
      {pins.map((pinData, index) => (
        <div 
          key={index}
          style={{
            background: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            padding: '12px',
            marginBottom: '8px',
            borderLeft: '4px solid #dc2626'
          }}
        >
          <div style={{ fontSize: '13px', fontWeight: '600', color: '#666', marginBottom: '8px' }}>
            PIN {index + 1}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px', fontSize: '13px' }}>
            <span style={{ color: '#6b7280', fontWeight: '500' }}>PIN:</span>
            <span style={{ fontSize: '16px', fontWeight: '700', color: '#dc2626', letterSpacing: '1px' }}>
              {pinData.pin}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
            <span style={{ color: '#6b7280', fontWeight: '500' }}>Serial:</span>
            <span style={{ fontSize: '13px', fontWeight: '600', color: '#1f2937' }}>
              {pinData.serial}
            </span>
          </div>
        </div>
      ))}
    </div>
  ) : null;

  return (
    <SuccessModal
      isOpen={isOpen}
      onClose={onClose}
      title="Purchase Successful!"
      icon="📚"
      iconBgColor="#dbeafe"
      iconColor="#2563eb"
      details={details}
      actions={actions}
    >
      {pinsSection}
    </SuccessModal>
  );
};

// Print Recharge Success Modal
export const PrintRechargeSuccessModal = ({ 
  isOpen, 
  onClose, 
  onPrintMore,
  onPrintReceipt,
  networkName,
  denomination,
  quantity,
  amount,
  pins,
  reference
}) => {
  const details = [
    { label: 'Network', value: networkName },
    { label: 'Denomination', value: `₦${denomination?.toLocaleString()}` },
    { label: 'Quantity', value: quantity },
    { label: 'Total Amount', value: `₦${amount?.toLocaleString()}` },
  ];

  if (reference) {
    details.push({ label: 'Reference', value: reference });
  }

  const actions = [
    { label: 'Print More', onClick: onPrintMore, variant: 'primary' },
    { label: 'Print Receipt', onClick: onPrintReceipt || (() => alert('Print Receipt')), variant: 'success' },
    { label: 'Close', onClick: onClose, variant: 'secondary' }
  ];

  const pinsSection = pins && pins.length > 0 ? (
    <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #e5e7eb' }}>
      <div style={{ fontSize: '15px', fontWeight: '600', color: '#1f2937', marginBottom: '12px' }}>
        Recharge PINs
      </div>
      {pins.map((pinData, index) => (
        <div 
          key={index}
          style={{
            background: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            padding: '12px',
            marginBottom: '8px',
            borderLeft: '4px solid #16a34a'
          }}
        >
          <div style={{ fontSize: '13px', fontWeight: '600', color: '#666', marginBottom: '8px' }}>
            PIN {index + 1}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px', fontSize: '13px' }}>
            <span style={{ color: '#6b7280', fontWeight: '500' }}>PIN:</span>
            <span style={{ fontSize: '16px', fontWeight: '700', color: '#16a34a', letterSpacing: '1px' }}>
              {pinData.pin}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
            <span style={{ color: '#6b7280', fontWeight: '500' }}>Serial:</span>
            <span style={{ fontSize: '13px', fontWeight: '600', color: '#1f2937' }}>
              {pinData.serial}
            </span>
          </div>
        </div>
      ))}
    </div>
  ) : null;

  return (
    <SuccessModal
      isOpen={isOpen}
      onClose={onClose}
      title="Recharge Cards Generated!"
      icon="🎫"
      iconBgColor="#dcfce7"
      iconColor="#16a34a"
      details={details}
      actions={actions}
    >
      {pinsSection}
    </SuccessModal>
  );
};

// Internet/SME Data Success Modal
export const InternetSuccessModal = ({ 
  isOpen, 
  onClose, 
  onBuyMore,
  onPrintReceipt,
  provider,
  planName,
  phone,
  amount,
  reference
}) => {
  const details = [
    { label: 'Provider', value: provider },
    { label: 'Plan', value: planName },
    { label: 'Phone Number', value: phone },
    { label: 'Amount', value: `₦${amount?.toLocaleString()}` },
  ];

  if (reference) {
    details.push({ label: 'Reference', value: reference });
  }

  const actions = [
    { label: 'Buy More', onClick: onBuyMore, variant: 'primary' },
    { label: 'Print Receipt', onClick: onPrintReceipt || (() => alert('Print Receipt')), variant: 'success' },
    { label: 'Close', onClick: onClose, variant: 'secondary' }
  ];

  return (
    <SuccessModal
      isOpen={isOpen}
      onClose={onClose}
      title="Internet Purchase Successful!"
      icon="🌐"
      iconBgColor="#ede9fe"
      iconColor="#7c3aed"
      details={details}
      actions={actions}
    />
  );
};

// Demo Component
export default function SuccessModalDemo() {
  const [activeModal, setActiveModal] = React.useState(null);

  const demoModals = [
    {
      id: 'airtime',
      label: 'Airtime',
      component: AirtimeSuccessModal,
      props: {
        networkName: 'MTN',
        phone: '08012345678',
        amount: 1000,
        reference: 'TXN-ABC123'
      }
    },
    {
      id: 'data',
      label: 'Data',
      component: DataSuccessModal,
      props: {
        networkName: 'AIRTEL',
        phone: '08012345678',
        bundleName: '5GB Monthly',
        amount: 2500,
        reference: 'TXN-DEF456'
      }
    },
    {
      id: 'cable',
      label: 'Cable TV',
      component: CableTVSuccessModal,
      props: {
        provider: 'DSTV',
        smartCardNumber: '1234567890',
        customerName: 'John Doe',
        planName: 'Compact Plus',
        amount: 12500,
        reference: 'TXN-GHI789'
      }
    },
    {
      id: 'electricity',
      label: 'Electricity',
      component: ElectricitySuccessModal,
      props: {
        disco: 'EKEDC',
        meterNumber: '12345678901',
        meterType: 'Prepaid',
        customerName: 'Jane Smith',
        amount: 5000,
        token: '1234-5678-9012-3456',
        reference: 'TXN-JKL012'
      }
    },
    {
      id: 'education',
      label: 'Education',
      component: EducationSuccessModal,
      props: {
        examName: 'WAEC',
        quantity: 2,
        phone: '08012345678',
        amount: 3000,
        pins: [
          { pin: '1234567890', serial: 'SN-001-2024' },
          { pin: '0987654321', serial: 'SN-002-2024' }
        ],
        reference: 'TXN-MNO345'
      }
    },
    {
      id: 'print',
      label: 'Print Recharge',
      component: PrintRechargeSuccessModal,
      props: {
        networkName: 'MTN',
        denomination: 100,
        quantity: 5,
        amount: 500,
        pins: [
          { pin: '1111-2222-3333', serial: 'MTN-100-001' },
          { pin: '4444-5555-6666', serial: 'MTN-100-002' },
          { pin: '7777-8888-9999', serial: 'MTN-100-003' }
        ],
        reference: 'TXN-PQR678'
      }
    },
    {
      id: 'internet',
      label: 'Internet',
      component: InternetSuccessModal,
      props: {
        provider: 'SMILE',
        planName: '10GB - 30 Days',
        phone: '08012345678',
        amount: 5000,
        reference: 'TXN-STU901'
      }
    }
  ];

  return (
    <div style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '32px', fontWeight: '700', marginBottom: '8px', color: '#1f2937' }}>
        Success Modal Components
      </h1>
      <p style={{ color: '#6b7280', marginBottom: '32px', fontSize: '16px' }}>
        Complete reusable success modal system with Print Receipt button
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '40px' }}>
        {demoModals.map(modal => (
          <button
            key={modal.id}
            onClick={() => setActiveModal(modal.id)}
            style={{
              padding: '16px',
              background: '#dc2626',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#b91c1c';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#dc2626';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            {modal.label}
          </button>
        ))}
      </div>

      <div style={{ background: '#f9fafb', padding: '24px', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
        <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px', color: '#1f2937' }}>
          ✅ All Modals Include:
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '14px', color: '#6b7280' }}>
          <div>• Primary Action Button (Buy More / Subscribe Again)</div>
          <div>• <strong style={{ color: '#16a34a' }}>Print Receipt Button</strong> (NEW!)</div>
          <div>• Close Button</div>
        </div>
      </div>

      {demoModals.map(modal => {
        const ModalComponent = modal.component;
        return (
          <ModalComponent
            key={modal.id}
            isOpen={activeModal === modal.id}
            onClose={() => setActiveModal(null)}
            onBuyMore={() => {
              alert('Buy More clicked!');
            }}
            onSubscribeMore={() => {
              alert('Subscribe More clicked!');
            }}
            onPrintMore={() => {
              alert('Print More clicked!');
            }}
            onPrintReceipt={() => {
              alert('Print Receipt clicked! This would trigger your print receipt function.');
              setActiveModal(null);
            }}
            {...modal.props}
          />
        );
      })}
    </div>
  );
}