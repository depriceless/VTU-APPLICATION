'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Home, Smartphone, Wifi, Tv, Zap, Printer, DollarSign, Globe, 
  GraduationCap, History, User, HelpCircle, LogOut, Menu, Wallet, 
  ChevronDown, ChevronRight, Shield, CheckCircle, AlertCircle, CreditCard
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (value: boolean) => void;
  currentPath?: string;
  onNavigate: (path: string) => void;
  isCollapsed: boolean;
  setIsCollapsed: (value: boolean) => void;
  isMobile: boolean;
  onLogout: () => void;
  balance: number;
  contextUser: any;
}

const Sidebar = ({ 
  isOpen, 
  setIsOpen, 
  currentPath = '/dashboard', 
  onNavigate, 
  isCollapsed, 
  setIsCollapsed, 
  isMobile, 
  onLogout,
  balance,
  contextUser
}: SidebarProps) => {
  const [expandedMenus, setExpandedMenus] = useState<any>({});
  const sidebarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isMobile && isOpen && sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
        const isMenuButton = (event.target as HTMLElement).closest('.mobile-menu-btn');
        if (!isMenuButton) {
          setIsOpen(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMobile, isOpen, setIsOpen]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen && isMobile) {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isMobile, setIsOpen]);

  const toggleMenu = (menuId: string) => {
    if (isCollapsed && !isMobile) {
      setIsCollapsed(false);
    }
    setExpandedMenus((prev: any) => ({
      ...prev,
      [menuId]: !prev[menuId]
    }));
  };

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home, path: '/dashboard', color: '#ff2b2b' },
    {
      id: 'recharge', label: 'Recharge', icon: Smartphone, color: '#2196F3',
      submenu: [
        { label: 'Buy Airtime', path: '/dashboard/buy-airtime', icon: Smartphone },
        { label: 'Buy Data', path: '/dashboard/buy-data', icon: Wifi },
        { label: 'Airtime to Cash', path: '/dashboard/airtime-to-cash', icon: DollarSign }
      ]
    },
    {
      id: 'education', label: 'Education', icon: GraduationCap, color: '#E91E63',
      submenu: [
        { label: 'WAEC Result', path: '/dashboard/waec-result', icon: GraduationCap },
        { label: 'NECO Result', path: '/dashboard/neco-result', icon: GraduationCap },
        { label: 'NABTEB Result', path: '/dashboard/nabteb-result', icon: GraduationCap }
      ]
    },
    {
      id: 'bills', label: 'Bill Payments', icon: Zap, color: '#03A9F4',
      submenu: [
        { label: 'Cable TV', path: '/dashboard/cable-tv', icon: Tv },
        { label: 'Electricity', path: '/dashboard/electricity', icon: Zap },
        { label: 'Internet', path: '/dashboard/internet', icon: Globe }
      ]
    },
    {
      id: 'other-services', label: 'Other Services', icon: Menu, color: '#9C27B0',
      submenu: [
        { label: 'Print Recharge', path: '/dashboard/print-recharge', icon: Printer },
        { label: 'Fund Betting', path: '/dashboard/fund-betting', icon: DollarSign }
      ]
    },
    {
      id: 'self-service', label: 'Self Service', icon: HelpCircle, color: '#6366f1',
      submenu: [
        { label: 'Verify Data Purchase', path: '/dashboard/verify-data-purchase', icon: CheckCircle },
      ]
    },
    { id: 'mobile-app', label: 'Download Mobile App', icon: Smartphone, path: '/dashboard/mobile-app', color: '#3b82f6' },
    { id: 'two-factor', label: '2FA Security', icon: Shield, path: '/dashboard/two-factor-auth', color: '#f59e0b' },
    {
      id: 'transactions', label: 'Transaction History', icon: History, color: '#FF9800',
      submenu: [
        { label: 'Payment History', path: '/dashboard/payment-history', icon: History },
        { label: 'Purchase History', path: '/dashboard/purchase-history', icon: History },
        { label: 'Airtime Convert History', path: '/dashboard/airtime-convert-history', icon: History }
      ]
    },
    { id: 'wallet', label: 'Wallet Summary', icon: Wallet, path: '/dashboard/wallet-summary', color: '#4CAF50' },
    { id: 'profile', label: 'Profile', icon: User, path: '/dashboard/profile', color: '#607D8B' },
    { id: 'support', label: 'Support', icon: HelpCircle, path: '/dashboard/need-help', color: '#00BCD4' },
    { id: 'logout', label: 'Logout', icon: LogOut, path: '/logout', color: '#ef4444', isLogout: true },
  ];

  const handleNavigation = (path: string, isLogout = false) => {
    if (isLogout) {
      onLogout();
    } else if (onNavigate) {
      onNavigate(path);
    }
    
    if (isMobile) {
      setIsOpen(false);
    }
  };

  const MenuItem = ({ item }: any) => {
    const hasSubmenu = item.submenu && item.submenu.length > 0;
    const isExpanded = expandedMenus[item.id];
    const isActive = currentPath === item.path;
    const Icon = item.icon;

    if (hasSubmenu) {
      return (
        <div className="menu-item-wrapper">
          <button 
            onClick={() => toggleMenu(item.id)} 
            className="menu-item submenu-toggle"
            aria-expanded={isExpanded}
            aria-label={`${item.label} menu`}
          >
            <div className="menu-item-content">
              <div className="menu-icon" style={{ color: item.color }}>
                <Icon size={20} />
              </div>
              {!isCollapsed && <span className="menu-label">{item.label}</span>}
            </div>
            {!isCollapsed && (isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />)}
          </button>
          {isExpanded && !isCollapsed && (
            <div className="submenu">
              {item.submenu.map((subItem: any, index: number) => {
                const SubIcon = subItem.icon;
                const isSubActive = currentPath === subItem.path;
                return (
                  <button
                    key={index}
                    onClick={() => handleNavigation(subItem.path)}
                    className={`submenu-item ${isSubActive ? 'active' : ''}`}
                    aria-label={subItem.label}
                  >
                    <SubIcon size={18} />
                    <span>{subItem.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      );
    }

    return (
      <button 
        onClick={() => handleNavigation(item.path, item.isLogout)} 
        className={`menu-item ${isActive ? 'active' : ''}`}
        aria-label={item.label}
        aria-current={isActive ? 'page' : undefined}
      >
        <div className="menu-item-content">
          <div className="menu-icon" style={{ color: isActive ? '#dc2626' : item.color }}>
            <Icon size={20} />
          </div>
          {!isCollapsed && <span className="menu-label">{item.label}</span>}
        </div>
      </button>
    );
  };

  return (
    <>
      {isOpen && isMobile && (
        <div 
          className="sidebar-overlay" 
          onClick={() => setIsOpen(false)} 
        />
      )}
      <aside className={`sidebar ${isOpen ? 'open' : ''} ${isCollapsed ? 'collapsed' : ''}`} ref={sidebarRef}>
        <div className="user-profile-section">
          {!isCollapsed ? (
            <div className="user-info">
              <h3 className="user-name">Welcome, {contextUser?.name?.split(' ')[0] || 'User'}</h3>
              <div className="user-wallet">
                <Wallet size={14} />
                <span>e-Wallet: ₦{balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            </div>
          ) : (
            <div className="user-info-collapsed">
              <div className="user-avatar-small">
                {contextUser?.name?.charAt(0)?.toUpperCase() || 'U'}
              </div>
            </div>
          )}
        </div>
        
        <nav className="sidebar-nav" role="navigation" aria-label="Main navigation">
          {menuItems.map((item) => <MenuItem key={item.id} item={item} />)}
        </nav>
      </aside>
    </>
  );
};

export default Sidebar;