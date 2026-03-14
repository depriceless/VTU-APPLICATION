'use client';

import React, { Suspense, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { CheckCircle, XCircle, Clock, Printer, ArrowDownLeft, ArrowUpRight, Copy } from 'lucide-react';

interface Transaction {
  _id: string;
  type: string;
  amount: number;
  date: string;
  createdAt: string;
  status: string;
  description?: string;
  reference: string;
  category?: string;
  previousBalance?: number;
  newBalance?: number;
  gateway?: { provider?: string; gatewayReference?: string };
  metadata?: any;
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '10px 0', borderBottom: '1px solid #f3f4f6', gap: 16 }}>
      <span style={{ fontSize: 13, color: '#6b7280', fontWeight: 500, flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 13, color: '#1f2937', fontWeight: 600, textAlign: 'right', wordBreak: 'break-word', maxWidth: '60%' }}>{value}</span>
    </div>
  );
}

function TransactionDetailsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const receiptRef = useRef<HTMLDivElement>(null);

  let transaction: Transaction | null = null;
  try {
    const raw = searchParams.get('data');
    if (raw) transaction = JSON.parse(decodeURIComponent(raw));
  } catch {
    transaction = null;
  }

  if (!transaction) {
    return (
      <div style={{ padding: 24, maxWidth: 700, margin: '0 auto' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 400, gap: 12, textAlign: 'center' }}>
          <XCircle size={64} color="#dc2626" style={{ opacity: 0.5 }} />
          <p style={{ fontSize: 20, fontWeight: 700, color: '#1f2937', margin: 0 }}>Transaction Not Found</p>
          <p style={{ fontSize: 14, color: '#6b7280', margin: 0 }}>Could not load transaction details.</p>
          <button onClick={() => router.back()} style={{ background: '#dc2626', color: 'white', border: 'none', padding: '12px 28px', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer', marginTop: 8 }}>
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const isCredit = transaction.type === 'credit' || transaction.type === 'transfer_in';
  const isCompleted = transaction.status === 'completed' || transaction.status === 'success';
  const isPending = transaction.status === 'pending';

  const formatDate = (d: string) => {
    const date = new Date(d);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    return `${day}-${month}-${year}  ${String(hours).padStart(2, '0')}:${minutes}:${seconds} ${ampm}`;
  };

  const getMobileNumber = () => {
    const m = transaction!.metadata;
    if (m?.phone) return m.phone;
    if (m?.mobileNumber) return m.mobileNumber;
    if (m?.phoneNumber) return m.phoneNumber;
    if (m?.recipient) return m.recipient;
    if (transaction!.description) {
      const match = transaction!.description.match(/0[789][01]\d{8}/);
      if (match) return match[0];
    }
    return null;
  };

  const getServiceLabel = () => {
    const cat = transaction!.category || '';
    const desc = (transaction!.description || '').toLowerCase();
    const map: Record<string, string> = {
      airtime: 'Airtime', data: 'Data', 'cable-tv': 'Cable TV',
      electricity: 'Electricity', betting: 'Betting',
      internet: 'Internet', education: 'Education',
      funding: 'Wallet Funding', deposit: 'Deposit',
    };
    if (map[cat]) return map[cat];
    if (desc.includes('paystack') || desc.includes('nuban') || desc.includes('fund')) return 'Wallet Funding';
    if (desc.includes('airtime')) return 'Airtime';
    if (desc.includes('data')) return 'Data';
    if (desc.includes('cable') || desc.includes('dstv') || desc.includes('gotv')) return 'Cable TV';
    if (desc.includes('electricity') || desc.includes('power')) return 'Electricity';
    return cat ? cat.charAt(0).toUpperCase() + cat.slice(1) : (isCredit ? 'Credit' : 'Purchase');
  };

  const getGateway = () => {
    if (transaction!.gateway?.provider) return transaction!.gateway.provider;
    const desc = (transaction!.description || '').toLowerCase();
    if (desc.includes('paystack')) return 'Paystack';
    if (desc.includes('flutterwave')) return 'Flutterwave';
    if (desc.includes('nuban') || desc.includes('dedicated')) return 'Bank Transfer (NUBAN)';
    if (transaction!.category === 'funding') return 'Bank - AutoFunding';
    return 'N/A';
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).catch(() => {});
  };

  const handlePrint = () => {
    const content = receiptRef.current;
    if (!content) return;
    const w = window.open('', '', 'width=800,height=600');
    if (!w) return;
    w.document.write(`<html><head><title>Receipt - ${transaction!.reference}</title>
      <style>
        * { margin:0;padding:0;box-sizing:border-box; }
        body { font-family:Arial,sans-serif;padding:32px;color:#1f2937; }
        h1 { color:#dc2626;font-size:24px;margin-bottom:4px; }
        .sub { color:#6b7280;font-size:13px;margin-bottom:24px; }
        .amount-block { font-size:36px;font-weight:800;text-align:center;padding:20px;background:#fef2f2;border-radius:10px;margin:20px 0; }
        h3 { font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:#374151;border-bottom:1px solid #e5e7eb;padding-bottom:6px;margin:20px 0 12px; }
        .row { display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #f3f4f6;font-size:13px; }
        .label { color:#6b7280; } .value { font-weight:600; }
        .badge { display:inline-block;padding:4px 14px;border-radius:20px;font-size:11px;font-weight:700;background:#22c55e;color:white; }
        .footer { margin-top:28px;text-align:center;font-size:11px;color:#9ca3af; }
      </style></head><body>
      <h1>Transaction Receipt</h1><p class="sub">Payment Confirmation</p>
      <div class="amount-block" style="color:${isCredit ? '#16a34a' : '#dc2626'}">
        ₦${transaction!.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </div>
      <h3>Transaction Details</h3>
      <div class="row"><span class="label">Reference</span><span class="value">${transaction!.reference}</span></div>
      <div class="row"><span class="label">Date & Time</span><span class="value">${formatDate(transaction!.createdAt || transaction!.date)}</span></div>
      <div class="row"><span class="label">Type</span><span class="value">${transaction!.type.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}</span></div>
      <div class="row"><span class="label">Service</span><span class="value">${getServiceLabel()}</span></div>
      <div class="row"><span class="label">Gateway</span><span class="value">${getGateway()}</span></div>
      <div class="row"><span class="label">Status</span><span class="value"><span class="badge">${isCompleted ? 'Successful' : isPending ? 'Pending' : 'Failed'}</span></span></div>
      ${transaction!.description ? `<div class="row"><span class="label">Description</span><span class="value">${transaction!.description}</span></div>` : ''}
      <div class="footer"><p>Thank you for your transaction</p><p>This is an electronic receipt and does not require a signature</p></div>
    </body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => { w.print(); w.close(); }, 250);
  };

  const mobileNo = getMobileNumber();
  const statusColor = isCompleted ? '#22c55e' : isPending ? '#f59e0b' : '#ef4444';
  const statusLabel = isCompleted ? 'Successful' : isPending ? 'Pending' : 'Failed';
  const StatusIcon = isCompleted ? CheckCircle : isPending ? Clock : XCircle;

  return (
    <div className="page-container">

      {/* Header — matches Airtime page style exactly */}
      <div className="page-header">
        <h1 className="page-title">TRANSACTION DETAILS</h1>
        <div className="breadcrumb">
          <span className="breadcrumb-link" onClick={() => router.push('/dashboard')}>Dashboard</span>
          <span className="breadcrumb-separator">/</span>
          <span className="breadcrumb-current">Transaction Details</span>
        </div>
      </div>

      {/* Receipt card */}
      <div className="card" ref={receiptRef}>

        {/* Status banner */}
        <div className="status-banner" style={{ background: `${statusColor}15`, borderBottom: `3px solid ${statusColor}` }}>
          <StatusIcon size={40} color={statusColor} />
          <div>
            <p className="status-label" style={{ color: statusColor }}>{statusLabel}</p>
            <p className="status-sub">Transaction {statusLabel.toLowerCase()}</p>
          </div>
        </div>

        {/* Amount */}
        <div className="amount-section">
          <div className="amount-icon" style={{ background: isCredit ? '#dcfce7' : '#fef2f2' }}>
            {isCredit
              ? <ArrowDownLeft size={22} color="#16a34a" />
              : <ArrowUpRight size={22} color="#dc2626" />
            }
          </div>
          <p className="amount-label">{isCredit ? 'Amount Received' : 'Amount Paid'}</p>
          <p className="amount-value" style={{ color: isCredit ? '#16a34a' : '#dc2626' }}>
            ₦{transaction.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <span className="service-chip">{getServiceLabel()}</span>
        </div>

        {/* Reference */}
        <div className="ref-row">
          <span className="ref-text">{transaction.reference}</span>
          <button className="copy-btn" onClick={() => copyToClipboard(transaction!.reference)} title="Copy reference">
            <Copy size={14} />
          </button>
        </div>

        {/* Transaction Details */}
        <div className="section">
          <p className="section-title">Transaction Details</p>
          <Row label="Date & Time" value={formatDate(transaction.createdAt || transaction.date)} />
          <Row label="Type" value={transaction.type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())} />
          <Row label="Status" value={<span style={{ display: 'inline-block', padding: '3px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700, color: 'white', background: statusColor }}>{statusLabel}</span>} />
          {transaction.description && <Row label="Description" value={transaction.description} />}
        </div>

        {/* Service info */}
        {(mobileNo || transaction.metadata?.network || transaction.metadata?.provider || transaction.metadata?.plan) && (
          <div className="section">
            <p className="section-title">Service Information</p>
            {mobileNo && <Row label="Mobile Number" value={mobileNo} />}
            {(transaction.metadata?.network || transaction.metadata?.provider) && (
              <Row label="Network / Provider" value={transaction.metadata.network || transaction.metadata.provider} />
            )}
            {transaction.metadata?.plan && <Row label="Plan / Package" value={transaction.metadata.plan} />}
            {transaction.metadata?.serverResponse && <Row label="Server Response" value={transaction.metadata.serverResponse} />}
          </div>
        )}

        {/* Payment info */}
        <div className="section">
          <p className="section-title">Payment Information</p>
          <Row label="Gateway" value={getGateway()} />
          {transaction.gateway?.gatewayReference && (
            <Row label="Gateway Reference" value={transaction.gateway.gatewayReference} />
          )}
          {transaction.previousBalance != null && Number(transaction.previousBalance) > 0 && (
            <Row label="Previous Balance" value={`₦${Number(transaction.previousBalance).toLocaleString('en-US', { minimumFractionDigits: 2 })}`} />
          )}
          {transaction.newBalance != null && Number(transaction.newBalance) > 0 && (
            <Row label="New Balance" value={`₦${Number(transaction.newBalance).toLocaleString('en-US', { minimumFractionDigits: 2 })}`} />
          )}
        </div>

        {/* Footer */}
        <div className="receipt-footer">
          <p>Thank you for your transaction</p>
          <p>This is an electronic receipt and does not require a signature</p>
        </div>
      </div>

      {/* Actions */}
      <div className="actions">
        <button onClick={handlePrint} className="print-btn">
          <Printer size={16} /> Print Receipt
        </button>
        <button onClick={() => router.back()} className="go-back-btn">
          Go Back
        </button>
      </div>

      <style jsx>{`
      .page-container { padding: 16px 24px; max-width: 1200px; margin: 0 auto; }

        .page-header { margin-bottom: 20px; }
        .page-title { font-size: 20px; font-weight: 700; color: #dc2626; margin: 0 0 8px 0; letter-spacing: 0.3px; }
        .breadcrumb { display: flex; align-items: center; gap: 6px; font-size: 14px; }
        .breadcrumb-link { color: #6b7280; font-weight: 500; cursor: pointer; transition: color 0.2s; }
        .breadcrumb-link:hover { color: #dc2626; }
        .breadcrumb-separator { color: #9ca3af; }
        .breadcrumb-current { color: #1f2937; font-weight: 500; }

        .card { background: white; border-radius: 16px; border: 1px solid #e5e7eb; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.06); max-width: 680px; margin: 0 auto; }

        .status-banner { display: flex; align-items: center; gap: 16px; padding: 20px 24px; }
        .status-label { font-size: 20px; font-weight: 800; margin: 0; }
        .status-sub { font-size: 13px; color: #6b7280; margin: 2px 0 0; }

        .amount-section { text-align: center; padding: 28px 24px 20px; border-bottom: 1px solid #f3f4f6; }
        .amount-icon { width: 52px; height: 52px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 12px; }
        .amount-label { font-size: 13px; color: #6b7280; margin: 0 0 6px; font-weight: 500; }
        .amount-value { font-size: 38px; font-weight: 800; margin: 0 0 10px; }
        .service-chip { display: inline-block; background: #f3f4f6; color: #374151; font-size: 12px; font-weight: 600; padding: 4px 12px; border-radius: 20px; }

        .ref-row { display: flex; align-items: center; justify-content: center; gap: 8px; padding: 12px 24px; background: #f9fafb; border-bottom: 1px solid #f3f4f6; }
        .ref-text { font-size: 13px; color: #4b5563; font-family: monospace; font-weight: 600; word-break: break-all; text-align: center; }
        .copy-btn { background: none; border: 1px solid #d1d5db; border-radius: 6px; padding: 4px 8px; cursor: pointer; display: flex; align-items: center; color: #6b7280; transition: all 0.15s; flex-shrink: 0; }
        .copy-btn:hover { border-color: #dc2626; color: #dc2626; }

        .section { padding: 20px 24px; border-bottom: 1px solid #f3f4f6; }
        .section-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.6px; color: #9ca3af; margin: 0 0 14px; }

        .receipt-footer { padding: 16px 24px; text-align: center; background: #f9fafb; }
        .receipt-footer p { font-size: 11px; color: #9ca3af; margin: 3px 0; }
.actions { display: flex; gap: 12px; margin-top: 16px; max-width: 680px; margin-left: auto; margin-right: auto; }
        .print-btn { flex: 1; display: flex; align-items: center; justify-content: center; gap: 8px; padding: 13px; background: #dc2626; color: white; border: none; border-radius: 10px; font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.2s; }
        .print-btn:hover { background: #b91c1c; transform: translateY(-1px); box-shadow: 0 4px 12px rgba(220,38,38,0.3); }
        .go-back-btn { flex: 1; padding: 13px; background: white; color: #374151; border: 1px solid #e5e7eb; border-radius: 10px; font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.2s; }
        .go-back-btn:hover { background: #f9fafb; }

        @media (max-width: 768px) {
          .page-container { padding: 12px; }
          .amount-value { font-size: 30px; }
          .actions { flex-direction: column; }
        }
      `}</style>
    </div>
  );
}

export default function TransactionDetailsPage() {
  return (
    <Suspense fallback={
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400, flexDirection: 'column', gap: 16 }}>
        <div style={{ width: 40, height: 40, border: '4px solid #e5e7eb', borderTopColor: '#dc2626', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <p style={{ color: '#6b7280', fontSize: 14 }}>Loading...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    }>
      <TransactionDetailsContent />
    </Suspense>
  );
}