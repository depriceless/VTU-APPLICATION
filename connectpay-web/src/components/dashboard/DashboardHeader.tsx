'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Menu, Bell, Search, User, Shield, Lock, Key, LogOut,
  CheckCircle, AlertCircle, XCircle, Info, ChevronDown, X
} from 'lucide-react';
import './DashboardHeader.css';

interface Notification {
  id: string;
  type: 'success' | 'info' | 'warning' | 'error';
  title: string;
  message: string;
  time: string;
  unread: boolean;
  timestamp: number;
}

interface DashboardHeaderProps {
  onToggleSidebar: () => void;
  isCollapsed: boolean;
  setIsCollapsed: (value: boolean) => void;
  isMobile: boolean;
  isSidebarOpen: boolean;
  onNavigate: (path: string) => void;
  onLogout: () => void;
  notifications?: Notification[];
  onAddNotification?: (notification: Omit<Notification, 'id' | 'timestamp'>) => void;
  onMarkAsRead?: (id: string) => void;
  onMarkAllAsRead?: () => void;
  onClearNotification?: (id: string) => void;
}

const DashboardHeader = ({
  onToggleSidebar,
  isCollapsed,
  setIsCollapsed,
  isMobile,
  isSidebarOpen,
  onNavigate,
  onLogout,
  notifications: externalNotifications,
  onAddNotification,
  onMarkAsRead,
  onMarkAllAsRead,
  onClearNotification,
}: DashboardHeaderProps) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [internalNotifications, setInternalNotifications] = useState<Notification[]>([]);

  const notificationRef  = useRef<HTMLDivElement>(null);
  const profileRef       = useRef<HTMLDivElement>(null);
  const searchRef        = useRef<HTMLDivElement>(null);
  const searchInputRef   = useRef<HTMLInputElement>(null);
  const burgerRef        = useRef<HTMLButtonElement>(null);

  const notifications = externalNotifications || internalNotifications;
  const unreadCount   = notifications.filter(n => n.unread).length;

  const searchableItems = [
    { name: 'Dashboard',         path: '/dashboard',                   keywords: ['dashboard', 'home'] },
    { name: 'Buy Airtime',       path: '/dashboard/buy-airtime',       keywords: ['airtime', 'top up', 'recharge'] },
    { name: 'Buy Data',          path: '/dashboard/buy-data',          keywords: ['data', 'bundle', 'internet'] },
    { name: 'Airtime to Cash',   path: '/dashboard/airtime-to-cash',  keywords: ['convert', 'cash'] },
    { name: 'Cable TV',          path: '/dashboard/cable-tv',          keywords: ['cable', 'dstv', 'gotv'] },
    { name: 'Electricity',       path: '/dashboard/electricity',       keywords: ['electricity', 'meter', 'power'] },
    { name: 'Internet',          path: '/dashboard/internet',          keywords: ['internet', 'spectranet', 'smile'] },
    { name: 'Print Recharge',    path: '/dashboard/print-recharge',    keywords: ['print', 'pin'] },
    { name: 'Fund Betting',      path: '/dashboard/fund-betting',      keywords: ['betting', 'bet9ja'] },
    { name: 'WAEC Result',       path: '/dashboard/waec-result',       keywords: ['waec', 'result'] },
    { name: 'NECO Result',       path: '/dashboard/neco-result',       keywords: ['neco', 'result'] },
    { name: 'NABTEB Result',     path: '/dashboard/nabteb-result',     keywords: ['nabteb'] },
    { name: 'Payment History',   path: '/dashboard/payment-history',   keywords: ['payment', 'history'] },
    { name: 'Purchase History',  path: '/dashboard/purchase-history',  keywords: ['purchase', 'history'] },
    { name: 'Wallet Summary',    path: '/dashboard/wallet-summary',    keywords: ['wallet', 'summary'] },
    { name: 'Profile',           path: '/dashboard/profile',           keywords: ['profile', 'account'] },
    { name: 'Support',           path: '/dashboard/need-help',         keywords: ['support', 'help'] },
    { name: '2FA Security',      path: '/dashboard/two-factor-auth',   keywords: ['2fa', 'security'] },
  ];

  const profileMenuItems = [
    { id: 'profile',         label: 'Profile',          icon: User,   path: '/dashboard/profile' },
    { id: 'two-factor',      label: '2FA Security',     icon: Shield, path: '/dashboard/two-factor-auth' },
    { id: 'change-pin',      label: 'Change PIN',       icon: Lock,   path: '/dashboard/change-pin' },
    { id: 'change-password', label: 'Change Password',  icon: Key,    path: '/dashboard/change-password' },
    { id: 'logout',          label: 'Logout',           icon: LogOut, path: '/logout', isLogout: true },
  ];

  /* click outside — exclude burger button */
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (burgerRef.current && burgerRef.current.contains(e.target as Node)) return;
      if (notificationRef.current && !notificationRef.current.contains(e.target as Node)) setShowNotifications(false);
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setShowProfileMenu(false);
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) { setShowSearch(false); setSearchQuery(''); }
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  /* ESC */
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setShowNotifications(false); setShowProfileMenu(false); setShowSearch(false); setSearchQuery(''); }
    };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, []);

  /* global addNotification */
  useEffect(() => {
    (window as any).addNotification = (n: Omit<Notification, 'id' | 'timestamp'>) => {
      if (onAddNotification) { onAddNotification(n); return; }
      setInternalNotifications(p => [{ ...n, id: Date.now().toString() + Math.random().toString(36).slice(2), timestamp: Date.now() }, ...p]);
    };
    return () => { delete (window as any).addNotification; };
  }, [onAddNotification]);

  const markAsRead    = (id: string) => onMarkAsRead    ? onMarkAsRead(id)  : setInternalNotifications(p => p.map(n => n.id === id ? { ...n, unread: false } : n));
  const markAllAsRead = ()           => onMarkAllAsRead ? onMarkAllAsRead() : setInternalNotifications(p => p.map(n => ({ ...n, unread: false })));
  const clearN        = (id: string) => onClearNotification ? onClearNotification(id) : setInternalNotifications(p => p.filter(n => n.id !== id));

  const fmt = (ts: number) => {
    const s = Math.floor((Date.now() - ts) / 1000);
    if (s < 60)    return 'Just now';
    if (s < 3600)  return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    return new Date(ts).toLocaleDateString();
  };

  const notifIcon = (type: string) => {
    if (type === 'success') return <CheckCircle size={17} style={{ color: '#10b981' }} />;
    if (type === 'error')   return <XCircle     size={17} style={{ color: '#ef4444' }} />;
    if (type === 'warning') return <AlertCircle size={17} style={{ color: '#f59e0b' }} />;
    return                         <Info        size={17} style={{ color: '#3b82f6' }} />;
  };

  const searchResults = searchQuery.trim()
    ? searchableItems.filter(i =>
        i.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        i.keywords.some(k => k.includes(searchQuery.toLowerCase()))
      ).slice(0, 8)
    : [];

  const handleBurgerClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onToggleSidebar();
  };

  return (
    <>
      <header className="dh">

        {/* LEFT: hamburger */}
        <div className="dh-l">
          <button
            ref={burgerRef}
            className="dh-burger"
            onClick={handleBurgerClick}
            aria-label={isMobile
              ? (isSidebarOpen ? 'Close sidebar' : 'Open sidebar')
              : (isCollapsed   ? 'Expand sidebar' : 'Collapse sidebar')}
          >
            <Menu size={22} />
          </button>
        </div>

        {/* CENTER: logo */}
        <div className="dh-c">
          <span className="dh-logo">CONNECT<em>PAY</em></span>
        </div>

        {/* RIGHT: search · bell · profile */}
        <div className="dh-r">

          {/* Search */}
          <div className="dh-pw" ref={searchRef}>
            <button className="dh-ib" aria-label="Search"
              onClick={() => { setShowSearch(p => !p); setTimeout(() => searchInputRef.current?.focus(), 60); }}>
              <Search size={19} />
            </button>
            {showSearch && (
              <div className="dh-pop dh-spop">
                <div className="dh-srow">
                  <Search size={13} style={{ color: '#9ca3af', flexShrink: 0 }} />
                  <input ref={searchInputRef} type="text" placeholder="Search services…"
                    value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && searchResults.length) { onNavigate(searchResults[0].path); setShowSearch(false); setSearchQuery(''); } }}
                    className="dh-sinput" />
                </div>
                {searchResults.length > 0 && (
                  <div className="dh-slist">
                    {searchResults.map((r, i) => (
                      <button key={i} className="dh-sitem"
                        onClick={() => { onNavigate(r.path); setShowSearch(false); setSearchQuery(''); }}>
                        <Search size={12} style={{ color: '#9ca3af' }} /> {r.name}
                      </button>
                    ))}
                  </div>
                )}
                {searchQuery.trim() && !searchResults.length && <p className="dh-nores">No results for "{searchQuery}"</p>}
              </div>
            )}
          </div>

          {/* Bell */}
          <div className="dh-pw" ref={notificationRef}>
            <button className="dh-ib" aria-label={`Notifications${unreadCount ? ` (${unreadCount})` : ''}`}
              aria-expanded={showNotifications} onClick={() => setShowNotifications(p => !p)}>
              <Bell size={19} />
              {unreadCount > 0 && <span className="dh-bdg">{unreadCount > 9 ? '9+' : unreadCount}</span>}
            </button>
            {showNotifications && (
              <div className="dh-pop dh-npop">
                <div className="dh-ph">
                  <span>Notifications</span>
                  {unreadCount > 0 && <button className="dh-tb" onClick={markAllAsRead}>Mark all read</button>}
                </div>
                <div className="dh-nl">
                  {notifications.length === 0 ? (
                    <div className="dh-empty"><Bell size={34} style={{ color: '#d1d5db', marginBottom: 8 }} /><p>No notifications yet</p></div>
                  ) : notifications.map(n => (
                    <div key={n.id} className={`dh-ni${n.unread ? ' ur' : ''}`} onClick={() => n.unread && markAsRead(n.id)}>
                      <span style={{ flexShrink: 0, marginTop: 1 }}>{notifIcon(n.type)}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p className="dh-nt">{n.title}</p>
                        <p className="dh-nm">{n.message}</p>
                        <span className="dh-ntime">{fmt(n.timestamp)}</span>
                      </div>
                      <button className="dh-xb" onClick={e => { e.stopPropagation(); clearN(n.id); }}><X size={12} /></button>
                      {n.unread && <span className="dh-dot" />}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Profile */}
          <div className="dh-pw" ref={profileRef}>
            <button className="dh-pb" aria-label="Profile menu" aria-expanded={showProfileMenu}
              onClick={() => setShowProfileMenu(p => !p)}>
              <span className="dh-av"><User size={15} /></span>
              <ChevronDown size={12} style={{ color: '#6b7280', transition: 'transform .2s', transform: showProfileMenu ? 'rotate(180deg)' : 'none' }} />
            </button>
            {showProfileMenu && (
              <div className="dh-pop dh-ppop">
                {profileMenuItems.map(item => {
                  const Icon = item.icon;
                  return (
                    <button key={item.id} className={`dh-pitem${item.id === 'logout' ? ' lo' : ''}`}
                      onClick={() => { item.isLogout ? onLogout() : onNavigate(item.path); setShowProfileMenu(false); }}>
                      <Icon size={14} /> {item.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      </header>

      {/* Spacer to push content below fixed header */}
      <div style={{ height: 56 }} />
    </>
  );
};

export default DashboardHeader;