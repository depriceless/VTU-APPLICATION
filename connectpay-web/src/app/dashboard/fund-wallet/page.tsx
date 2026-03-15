'use client';

import { useState, useCallback } from 'react';
import apiClient from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

type PaymentMethod = 'bank' | 'paystack';

interface BankAccount {
  bankName: string;
  accountNumber: string;
  accountName: string;
}

interface BankData {
  accounts: BankAccount[];
  gateway: string;
}

const AMOUNT_LIMITS = { MIN: 100, MAX: 1_000_000 };
const fmt = (n: number) => '\u20a6' + n.toLocaleString('en-NG', { minimumFractionDigits: 2 });

export default function FundWalletPage() {
  useAuth();

  const [method,       setMethod]       = useState<PaymentMethod>('bank');
  const [amount,       setAmount]       = useState('');
  const [bankData,     setBankData]     = useState<BankData | null>(null);
  const [showAccounts, setShowAccounts] = useState(false);
  const [loading,      setLoading]      = useState(false);
  const [refreshing,   setRefreshing]   = useState(false);
  const [acctError,    setAcctError]    = useState('');
  const [error,        setError]        = useState('');
  const [copied,       setCopied]       = useState<string | null>(null);
  const [paying,       setPaying]       = useState(false);

  const num         = Number(amount) || 0;
  const fee         = Math.min(Math.round(num * 0.015), 2000);
  const total       = num + fee;
  const amountValid = num >= AMOUNT_LIMITS.MIN && num <= AMOUNT_LIMITS.MAX;

  const fetchAccount = useCallback(async (force = false) => {
    if (force) setRefreshing(true);
    else setLoading(true);
    setAcctError('');
    try {
      const res  = await apiClient.get('/payment/virtual-account');
      const data = res.data?.data || res.data;
      if (!data) throw new Error('No account data received');

      const accounts: BankAccount[] = [];
      if (data.accounts && Array.isArray(data.accounts)) {
        data.accounts.forEach((a: any) => accounts.push({
          bankName:      a.bankName      || a.bank_name      || 'Unknown Bank',
          accountNumber: a.accountNumber || a.account_number || '',
          accountName:   a.accountName   || a.account_name   || 'Unknown',
        }));
      } else if (data.accountNumber) {
        accounts.push({
          bankName:      data.bankName      || 'Unknown Bank',
          accountNumber: data.accountNumber || '',
          accountName:   data.accountName   || 'Unknown',
        });
      }
      if (accounts.length === 0) throw new Error('No account details found');
      setBankData({ accounts, gateway: data.gateway || 'paystack' });
    } catch (err: any) {
      setAcctError(err.message || 'Failed to load account details');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const handleShowAccounts = () => {
    setShowAccounts(true);
    if (!bankData) fetchAccount();
  };

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const handlePaystack = async () => {
    if (!amountValid) return;
    setPaying(true);
    setError('');
    try {
      const res = await apiClient.post('/paystack/initialize-payment', { amount: num });
      const url = res.data?.data?.authorizationUrl;
      if (url) window.location.href = url;
      else throw new Error('No payment URL received');
    } catch (err: any) {
      setError(err.message || 'Failed to initialize payment');
      setPaying(false);
    }
  };

  return (
    <div className="min-h-full bg-gray-100 p-3 sm:p-6">
      <div className="max-w-2xl mx-auto w-full">

        {/* Title */}
        <div className="mb-4">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Fund Wallet</h1>
          <p className="text-sm text-gray-400 mt-1">Add money to your ConnectPay wallet</p>
        </div>

        {/* White container */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 sm:p-6">

            {/* Amount input */}
            <div className="mb-5">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Enter Amount
              </label>
              <div className={[
                'flex items-center border-2 rounded-xl overflow-hidden transition-colors',
                amount && !amountValid ? 'border-gray-400' :
                amount && amountValid  ? 'border-gray-700' : 'border-gray-200',
              ].join(' ')}>
                <span className="px-3 sm:px-4 py-3 bg-gray-100 text-sm font-bold text-gray-500 border-r-2 border-gray-200 whitespace-nowrap">
                  NGN
                </span>
                <input
                  type="number"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder="0"
                  className="flex-1 min-w-0 px-3 sm:px-4 py-3 text-lg sm:text-xl font-bold text-gray-900 outline-none bg-transparent"
                />
              </div>
              {amount && !amountValid && (
                <p className="mt-1.5 text-xs text-gray-500">
                  Amount must be between {fmt(AMOUNT_LIMITS.MIN)} and {fmt(AMOUNT_LIMITS.MAX)}
                </p>
              )}
            </div>

            {/* Channel label */}
            <p className="text-sm font-semibold text-gray-700 mb-3">
              Select A Payment Channel:
            </p>

            {/* Paystack option */}
            <label className={[
              'flex items-start gap-3 border-2 rounded-xl p-3 sm:p-4 mb-3 cursor-pointer transition-all',
              method === 'paystack' ? 'border-gray-900 bg-gray-50' : 'border-gray-200 hover:border-gray-300',
            ].join(' ')}>
              <input
                type="radio" name="method" value="paystack"
                checked={method === 'paystack'}
                onChange={() => { setMethod('paystack'); setShowAccounts(false); setError(''); }}
                className="mt-0.5 w-4 h-4 shrink-0 accent-gray-900"
              />
              <div className="min-w-0">
                <p className="font-bold text-sm text-gray-900">Fund with Paystack</p>
                <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">
                  Pay with your card securely | Min: 100 ~ Max: 5,000,000 &bull; 1.5% charge
                </p>
              </div>
            </label>

            {/* Bank Transfer option */}
            <label className={[
              'flex items-start gap-3 border-2 rounded-xl p-3 sm:p-4 mb-5 cursor-pointer transition-all',
              method === 'bank' ? 'border-gray-900 bg-gray-50' : 'border-gray-200 hover:border-gray-300',
            ].join(' ')}>
              <input
                type="radio" name="method" value="bank"
                checked={method === 'bank'}
                onChange={() => { setMethod('bank'); setError(''); }}
                className="mt-0.5 w-4 h-4 shrink-0 accent-gray-900"
              />
              <div className="min-w-0">
                <p className="font-bold text-sm text-gray-900">Bank Transfer (Auto Wallet Funding)</p>
                <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">
                  Instant funding | Min: 100 ~ Max: 50,000,000 &bull; N20-N100 charges
                </p>
              </div>
            </label>

            {/* BANK TRANSFER */}
            {method === 'bank' && (
              <div>
                {!showAccounts && (
                  <button
                    onClick={handleShowAccounts}
                    className="w-full py-4 rounded-xl bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-bold text-sm tracking-wide transition-colors"
                  >
                    PAY WITH AN ALLOCATED ACCOUNT
                  </button>
                )}

                {showAccounts && (
                  <div className="border border-gray-200 rounded-xl overflow-hidden">
                    {loading ? (
                      <div className="py-10 flex flex-col items-center gap-3">
                        <div className="w-8 h-8 border-4 border-gray-100 border-t-gray-700 rounded-full animate-spin" />
                        <p className="text-sm text-gray-400">Loading account details...</p>
                      </div>
                    ) : acctError ? (
                      <div className="py-8 px-4 flex flex-col items-center gap-4">
                        <p className="text-sm text-gray-600 text-center">{acctError}</p>
                        <button
                          onClick={() => fetchAccount(true)}
                          className="bg-red-600 hover:bg-red-700 text-white text-sm font-bold px-6 py-2.5 rounded-xl transition-colors"
                        >
                          Retry
                        </button>
                      </div>
                    ) : bankData ? (
                      <div>
                        {/* Header */}
                        <div className="text-center py-5 border-b border-gray-100 px-4">
                          <p className="text-sm text-gray-500 font-medium mb-1">Transfer</p>
                          <p className="text-3xl sm:text-4xl font-extrabold text-gray-900 break-all">
                          {num >= 100 ? fmt(num) : 'Enter ₦100 or above'}
                          </p>
                          <p className="text-sm text-gray-500 mt-1">to any account below</p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            your wallet will be credited automatically
                          </p>
                        </div>

                        {/* Account rows */}
                        <div className="divide-y divide-gray-100">
                          {bankData.accounts.map((acc, i) => (
                            <div key={i} className="px-4 py-4">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-semibold text-gray-900 truncate">
                                    {acc.bankName}
                                  </p>
                                  <p className="text-xs text-gray-400 mt-0.5 truncate">
                                    {acc.accountName}
                                  </p>
                                </div>
                                <button
                                  onClick={() => copy(acc.accountNumber, `${i}`)}
                                  className="flex items-center gap-1.5 shrink-0 group"
                                >
                                  <span className="text-sm sm:text-base font-extrabold text-gray-900 tracking-widest">
                                    {acc.accountNumber}
                                  </span>
                                  <span className={[
                                    'text-xs font-bold px-2 py-0.5 rounded-md transition-colors shrink-0',
                                    copied === `${i}`
                                      ? 'bg-gray-100 text-gray-500'
                                      : 'bg-red-600 text-white group-hover:bg-red-700',
                                  ].join(' ')}>
                                    {copied === `${i}` ? '\u2713' : 'Copy'}
                                  </span>
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Account name */}
                        <div className="px-4 py-4 border-t border-gray-100 flex flex-wrap justify-between items-center gap-2">
                          <span className="text-sm text-gray-500">Account Name (s)</span>
                          <span className="text-sm font-bold text-gray-900 text-right">
                            {bankData.accounts[0]?.accountName}
                          </span>
                        </div>

                        {/* Refresh */}
                        <div className="px-4 pb-4">
                          <button
                            onClick={() => fetchAccount(true)}
                            disabled={refreshing}
                            className="w-full py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm font-semibold text-gray-600 hover:bg-gray-100 active:bg-gray-200 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                          >
                            {refreshing ? (
                              <>
                                <div className="w-4 h-4 border-2 border-gray-200 border-t-gray-500 rounded-full animate-spin" />
                                Refreshing...
                              </>
                            ) : (
                              '\u21bb Refresh Account'
                            )}
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            )}

            {/* PAYSTACK */}
            {method === 'paystack' && (
              <div>
                {num >= AMOUNT_LIMITS.MIN && (
                  <div className="border border-gray-200 rounded-xl overflow-hidden mb-4">
                    <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                      <p className="font-bold text-sm text-gray-900">Transaction Summary</p>
                    </div>
                    <div className="p-4 space-y-3">
                      {([
                        ['Payer',         'Your Account'],
                        ['Amount',        fmt(num)],
                        ['Charge (1.5%)', fmt(fee)],
                        ['Purpose',       'Deposit to Wallet'],
                      ] as [string, string][]).map(([label, value]) => (
                        <div key={label} className="flex justify-between items-center gap-2">
                          <span className="text-sm text-gray-400 shrink-0">{label}</span>
                          <span className="text-sm font-semibold text-gray-900 text-right break-all">{value}</span>
                        </div>
                      ))}
                      <div className="pt-3 border-t border-gray-100 flex justify-between items-center gap-2">
                        <span className="text-sm font-bold text-gray-900 shrink-0">Total to Pay:</span>
                        <span className="text-sm font-extrabold text-gray-900 text-right">{fmt(total)}</span>
                      </div>
                    </div>
                  </div>
                )}

                {error && (
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 mb-4">
                    <p className="text-sm text-gray-600">{error}</p>
                  </div>
                )}

                <button
                  onClick={handlePaystack}
                  disabled={!amountValid || paying}
                  className={[
                    'w-full py-4 rounded-xl font-extrabold text-base text-white flex items-center justify-center gap-3 transition-all',
                    !amountValid || paying
                      ? 'bg-gray-300 cursor-not-allowed'
                      : 'bg-red-600 hover:bg-red-700 active:bg-red-800',
                  ].join(' ')}
                >
                  {paying ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>Proceed to Pay{num >= AMOUNT_LIMITS.MIN ? ` \u00b7 ${fmt(total)}` : ''}</>
                  )}
                </button>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}