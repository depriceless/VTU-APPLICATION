'use client';

import React, { useState, useEffect } from 'react';
import { 
  Smartphone, Wifi, Tv, Zap, Menu, X, Home, History, CreditCard, 
  User, Settings, LogOut, Bell, Search, ArrowUpRight, ArrowDownLeft,
  Eye, EyeOff, Plus, Send, Download, TrendingUp, Clock, CheckCircle,
  AlertCircle, DollarSign, BarChart3, Calendar, Filter, RefreshCw,
  Copy, Share2, Printer, ChevronRight, Star, Gift, Shield, Globe,
  HelpCircle, School, Football, Receipt
} from 'lucide-react';

export default function UserDashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [balanceVisible, setBalanceVisible] = useState(true);
  const [walletBalance, setWalletBalance] = useState(25450.00);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [showFundWallet, setShowFundWallet] = useState(false);

  // Sample user data
  const userData = {
    name: 'John Doe',
    email: 'john.doe@example.com',
    phone: '08012345678',
    username: 'johndoe',
  };

  // Sample transactions
  const transactions = [
    { 
      _id: '1', 
      type: 'debit', 
      description: 'MTN Airtime Purchase',
      amount: 500, 
      status: 'completed', 
      createdAt: new Date(Date.now() - 2 * 60000).toISOString(),
      reference: 'REF123456789',
      category: 'airtime'
    },
    { 
      _id: '2', 
      type: 'debit', 
      description: 'Airtel Data Bundle - 2GB',
      amount: 1200, 
      status: 'completed', 
      createdAt: new Date(Date.now() - 60 * 60000).toISOString(),
      reference: 'REF123456790',
      category: 'data'
    },
    { 
      _id: '3', 
      type: 'credit', 
      description: 'Wallet Funding via Bank Transfer',
      amount: 5000, 
      status: 'completed', 
      createdAt: new Date(Date.now() - 3 * 3600000).toISOString(),
      reference: 'REF123456791',
      category: 'funding'
    },
    { 
      _id: '4', 
      type: 'debit', 
      description: 'DSTV Subscription Payment',
      amount: 8200, 
      status: 'completed', 
      createdAt: new Date(Date.now() - 5 * 3600000).toISOString(),
      reference: 'REF123456792',
      category: 'payment'
    },
    { 
      _id: '5', 
      type: 'debit', 
      description: 'Electricity Bill - IKEDC',
      amount: 3500, 
      status: 'pending', 
      createdAt: new Date(Date.now() - 24 * 3600000).toISOString(),
      reference: 'REF123456793',
      category: 'payment'
    },
  ];

  const menuItems = [
    { name: 'Dashboard', icon: Home, route: '/dashboard', category: 'main' },
    { name: 'Profile', icon: User, route: '/profile', category: 'main' },
    { name: 'Buy Airtime', icon: Smartphone, route: '/buy-airtime', category: 'services' },
    { name: 'Buy Data', icon: Wifi, route: '/buy-data', category: 'services' },
    { name: 'Electricity', icon: Zap, route: '/electricity', category: 'services' },
    { name: 'Cable TV', icon: Tv, route: '/cable-tv', category: 'services' },
    { name: 'Internet', icon: Globe, route: '/internet', category: 'services' },
    { name: 'Transfer', icon: Send, route: '/transfer', category: 'financial' },
    { name: 'Transaction History', icon: Receipt, route: '/transaction-history', category: 'financial' },
    { name: 'Settings', icon: Settings, route: '/settings', category: 'account' },
    { name: 'Help & Support', icon: HelpCircle, route: '/need-help', category: 'account' },
    { name: 'Logout', icon: LogOut, category: 'account' },
  ];

  const getCategoryTitle = (category) => {
    switch (category) {
      case 'main': return 'Overview';
      case 'services': return 'Services';
      case 'financial': return 'Financial';
      case 'account': return 'Account';
      default: return '';
    }
  };

  const groupedMenuItems = menuItems.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {});

  const formatTransactionDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  const getTransactionIcon = (transaction) => {
    switch (transaction.category) {
      case 'funding': return Download;
      case 'betting': return Football;
      case 'transfer': return transaction.type === 'debit' ? Send : Download;
      case 'payment': return CreditCard;
      case 'airtime': return Smartphone;
      case 'data': return Wifi;
      default: return transaction.type === 'credit' ? ArrowDownLeft : ArrowUpRight;
    }
  };

  const getStatusColor = (status) => {
    if (status === 'failed') return 'bg-red-500';
    if (status === 'pending') return 'bg-yellow-500';
    if (status === 'completed') return 'bg-green-500';
    return 'bg-gray-500';
  };

  const getTransactionColor = (transaction) => {
    if (transaction.status === 'failed') return 'text-red-600';
    return transaction.type === 'credit' ? 'text-green-600' : 'text-red-600';
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsRefreshing(false);
  };

  const handleMenuClick = (item) => {
    if (item.name === 'Logout') {
      setShowLogoutModal(true);
    } else {
      setActiveTab(item.name);
      if (window.innerWidth < 1024) {
        setSidebarOpen(false);
      }
    }
  };

  const handleLogout = () => {
    setShowLogoutModal(false);
    // Handle logout logic
    console.log('Logging out...');
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-80 bg-white shadow-xl transform transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="flex flex-col h-full">
          {/* Sidebar Header */}
          <div className="flex items-center justify-between p-6 border-b">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center">
                <Smartphone className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-red-600 to-red-700 bg-clip-text text-transparent">ConnectPay</span>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-2 hover:bg-gray-100 rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Profile Section */}
          <div className="p-6 border-b">
            <div className="flex items-center space-x-4">
              <div className="w-14 h-14 bg-red-50 border-2 border-red-600 rounded-full flex items-center justify-center">
                <span className="text-xl font-bold text-red-600">{userData.name.charAt(0)}</span>
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-gray-900">{userData.name}</h3>
                <p className="text-sm text-gray-500">{userData.email}</p>
                <button className="mt-1 text-xs text-red-600 font-semibold flex items-center gap-1 hover:gap-2 transition-all">
                  View Profile
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>

          {/* Menu Items */}
          <nav className="flex-1 overflow-y-auto p-4">
            {Object.entries(groupedMenuItems).map(([category, items]) => (
              <div key={category} className="mb-6">
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-3">
                  {getCategoryTitle(category)}
                </h4>
                <div className="space-y-1">
                  {items.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.name;
                    const isLogout = item.name === 'Logout';
                    
                    return (
                      <button
                        key={item.name}
                        onClick={() => handleMenuClick(item)}
                        className={`w-full flex items-center space-x-3 px-3 py-3 rounded-xl transition-all ${
                          isLogout
                            ? 'bg-red-600 text-white hover:bg-red-700'
                            : isActive
                            ? 'bg-red-600 text-white shadow-lg'
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                          isLogout || isActive ? 'bg-white/20' : 'bg-gray-100'
                        }`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <span className="font-medium flex-1 text-left">{item.name}</span>
                        {isActive && !isLogout && (
                          <div className="w-1 h-5 bg-white rounded-full" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          {/* Footer */}
          <div className="p-6 border-t text-center">
            <p className="text-xs text-gray-500">Version 1.0.0</p>
            <p className="text-xs text-gray-500">© 2025 ConnectPay</p>
          </div>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {/* Top Header */}
        <header className="bg-gradient-to-r from-red-600 to-red-700 rounded-b-3xl shadow-lg">
          <div className="px-6 pt-6 pb-8">
            <div className="flex items-center justify-between mb-8">
              <button 
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 text-white hover:bg-white/20 rounded-lg"
              >
                <Menu className="w-6 h-6" />
              </button>
              <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full cursor-pointer hover:bg-white/20 transition">
                <span className="text-white font-semibold">Hello, {userData.name.split(' ')[0]}</span>
                <ChevronRight className="w-4 h-4 text-white" />
              </div>
            </div>

            {/* Balance Section */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-white/90">Wallet Balance</span>
                  <button 
                    onClick={() => setBalanceVisible(!balanceVisible)}
                    className="p-1 hover:bg-white/20 rounded"
                  >
                    {balanceVisible ? <Eye className="w-5 h-5 text-white" /> : <EyeOff className="w-5 h-5 text-white" />}
                  </button>
                  <button 
                    onClick={handleRefresh}
                    className={`p-1 hover:bg-white/20 rounded ${isRefreshing ? 'animate-spin' : ''}`}
                  >
                    <RefreshCw className="w-4 h-4 text-white" />
                  </button>
                </div>
                <h2 className="text-4xl font-bold text-white">
                  {balanceVisible ? `₦${walletBalance.toLocaleString()}` : '₦****'}
                </h2>
              </div>
              <button 
                onClick={() => setShowFundWallet(true)}
                className="bg-white text-red-600 px-6 py-3 rounded-xl font-semibold flex items-center gap-2 hover:bg-gray-100 transition shadow-lg"
              >
                <Plus className="w-5 h-5" />
                Fund Wallet
              </button>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="p-6">
          {/* Services Header */}
          <h3 className="text-2xl font-bold text-gray-900 text-center mb-6">
            What would you like to do?
          </h3>

          {/* Quick Actions Grid */}
          <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-8">
            {[
              { name: 'Buy Airtime', icon: Smartphone, route: '/buy-airtime' },
              { name: 'Buy Data', icon: Wifi, route: '/buy-data' },
              { name: 'Electricity', icon: Zap, route: '/electricity' },
              { name: 'Cable TV', icon: Tv, route: '/cable-tv' },
              { name: 'Print Recharge', icon: Printer, route: '/print-recharge' },
              { name: 'Fund Betting', icon: Football, route: '/fund-betting' },
              { name: 'Internet', icon: Globe, route: '/internet' },
              { name: 'Education', icon: School, route: '/education' },
              { name: 'Transfer', icon: Send, route: '/transfer' },
            ].map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.name}
                  className="bg-white p-6 rounded-2xl shadow-sm hover:shadow-lg transition-all group"
                >
                  <Icon className="w-8 h-8 text-red-600 mx-auto mb-3 group-hover:scale-110 transition-transform" />
                  <p className="text-sm font-semibold text-gray-700 text-center">{action.name}</p>
                </button>
              );
            })}
          </div>

          {/* Need Help Button */}
          <div className="flex justify-center mb-8">
            <button className="bg-red-600 text-white px-8 py-4 rounded-full font-semibold flex items-center gap-3 hover:bg-red-700 transition shadow-lg">
              <HelpCircle className="w-5 h-5" />
              Need Help
            </button>
          </div>

          {/* Transactions Section */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">Recent Transactions</h3>
              {transactions.length > 3 && (
                <button className="flex items-center gap-2 text-red-600 font-semibold hover:gap-3 transition-all">
                  View All
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </div>

            {transactions.length === 0 ? (
              <div className="text-center py-12">
                <Receipt className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 font-semibold mb-2">No recent transactions</p>
                <p className="text-sm text-gray-400">Your transaction history will appear here</p>
              </div>
            ) : (
              <div className="space-y-3">
                {transactions.slice(0, 3).map((tx) => {
                  const Icon = getTransactionIcon(tx);
                  return (
                    <button
                      key={tx._id}
                      onClick={() => {
                        setSelectedTransaction(tx);
                        setShowTransactionModal(true);
                      }}
                      className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-xl transition-all group"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 ${tx.type === 'credit' ? 'bg-green-50' : 'bg-red-50'} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform`}>
                          <Icon className={`w-6 h-6 ${tx.type === 'credit' ? 'text-green-600' : 'text-red-600'}`} />
                        </div>
                        <div className="text-left">
                          <p className="font-semibold text-gray-900">{tx.description}</p>
                          <p className="text-sm text-gray-500">{formatTransactionDate(tx.createdAt)}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`text-xs px-2 py-1 rounded-full text-white ${getStatusColor(tx.status)}`}>
                              {tx.status}
                            </span>
                            <span className="text-xs text-gray-400">#{tx.reference.slice(-6)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-lg font-bold ${getTransactionColor(tx)}`}>
                          {tx.type === 'credit' ? '+' : '-'}₦{tx.amount.toLocaleString()}
                        </span>
                        <ChevronRight className="w-5 h-5 text-gray-400" />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl">
            <h3 className="text-2xl font-bold text-gray-900 mb-4 text-center">Logout Confirmation</h3>
            <p className="text-gray-600 mb-8 text-center">Are you sure you want to logout?</p>
            <div className="flex gap-4">
              <button
                onClick={() => setShowLogoutModal(false)}
                className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-200 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleLogout}
                className="flex-1 bg-red-600 text-white py-3 rounded-xl font-semibold hover:bg-red-700 transition"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Transaction Details Modal */}
      {showTransactionModal && selectedTransaction && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl p-8 max-w-2xl w-full shadow-2xl my-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-900">Transaction Details</h3>
              <button
                onClick={() => setShowTransactionModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4 mb-8">
              <div className="flex justify-between py-3 border-b">
                <span className="text-gray-600">Amount</span>
                <span className={`font-bold text-lg ${getTransactionColor(selectedTransaction)}`}>
                  {selectedTransaction.type === 'credit' ? '+' : '-'}₦{selectedTransaction.amount.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between py-3 border-b">
                <span className="text-gray-600">Status</span>
                <span className={`px-3 py-1 rounded-full text-white text-sm ${getStatusColor(selectedTransaction.status)}`}>
                  {selectedTransaction.status}
                </span>
              </div>
              <div className="flex justify-between py-3 border-b">
                <span className="text-gray-600">Type</span>
                <span className="font-semibold">{selectedTransaction.type.toUpperCase()}</span>
              </div>
              <div className="flex justify-between py-3 border-b">
                <span className="text-gray-600">Category</span>
                <span className="font-semibold capitalize">{selectedTransaction.category}</span>
              </div>
              <div className="flex justify-between py-3 border-b">
                <span className="text-gray-600">Reference</span>
                <span className="font-mono text-sm">{selectedTransaction.reference}</span>
              </div>
              <div className="flex justify-between py-3 border-b">
                <span className="text-gray-600">Date</span>
                <span>{new Date(selectedTransaction.createdAt).toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-3 border-b">
                <span className="text-gray-600">Description</span>
                <span className="text-right">{selectedTransaction.description}</span>
              </div>
            </div>

            <button
              onClick={() => {
                // Handle share receipt
                alert('Receipt sharing functionality');
              }}
              className="w-full bg-red-600 text-white py-4 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-red-700 transition"
            >
              <Download className="w-5 h-5" />
              Share Receipt
            </button>
          </div>
        </div>
      )}

      {/* Fund Wallet Modal Placeholder */}
      {showFundWallet && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-900">Fund Wallet</h3>
              <button
                onClick={() => setShowFundWallet(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <p className="text-gray-600 text-center py-12">Fund wallet component will be integrated here</p>
          </div>
        </div>
      )}
    </div>
  );
}