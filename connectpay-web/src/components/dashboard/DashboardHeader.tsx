'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Menu, X, Bell, Search, User, ChevronLeft, Shield, Lock, Key, LogOut 
} from 'lucide-react';

interface DashboardHeaderProps {
  onToggleSidebar: () => void;
  isCollapsed: boolean;
  setIsCollapsed: (value: boolean) => void;
  isMobile: boolean;
  isSidebarOpen: boolean;
  onNavigate: (path: string) => void;
  onLogout: () => void;
}

const DashboardHeader = ({
  onToggleSidebar,
  isCollapsed,
  setIsCollapsed,
  isMobile,
  isSidebarOpen,
  onNavigate,
  onLogout
}: DashboardHeaderProps) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowNotifications(false);
        setShowProfileMenu(false);
      }
      if (event.key === '/' && !['INPUT', 'TEXTAREA'].includes((document.activeElement as HTMLElement)?.tagName)) {
        event.preventDefault();
        searchInputRef.current?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const notifications = [
    { id: 1, title: 'Transaction Successful', message: 'Your airtime purchase was successful', time: '2 mins ago', unread: true },
    { id: 2, title: 'Wallet Funded', message: 'Your wallet has been credited with ₦5,000', time: '1 hour ago', unread: true },
    { id: 3, title: 'New Feature', message: 'Check out our new data plans', time: '3 hours ago', unread: false }
  ];

  const profileMenuItems = [
    { id: 'profile', label: 'Profile', icon: User, path: '/dashboard/profile' },
    { id: 'two-factor', label: '2FA Security', icon: Shield, path: '/dashboard/two-factor' },
    { id: 'change-pin', label: 'Change PIN', icon: Lock, path: '/dashboard/change-pin' },
    { id: 'change-password', label: 'Change Password', icon: Key, path: '/dashboard/change-password' },
    { id: 'logout', label: 'Logout', icon: LogOut, path: '/logout', isLogout: true },
  ];

  const unreadCount = notifications.filter(n => n.unread).length;

  const handleProfileNavigation = (path: string, isLogout = false) => {
    if (isLogout) {
      onLogout();
    } else {
      onNavigate(path);
    }
    
    setShowProfileMenu(false);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      console.log('Searching for:', searchQuery);
    }
  };

  return (
    <header className={`dashboard-header ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="header-left">
        {isMobile ? (
          <button 
            className="mobile-menu-btn" 
            onClick={onToggleSidebar}
            aria-label={isSidebarOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={isSidebarOpen}
          >
            {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        ) : (
          <button 
            className="collapse-btn" 
            onClick={() => setIsCollapsed(!isCollapsed)}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <ChevronLeft size={24} className={isCollapsed ? 'rotated' : ''} />
          </button>
        )}
        <div className="header-logo">
          <h1 className="logo-text">CONNECTPAY</h1>
        </div>
      </div>
      <div className="header-right">
        <form className="search-container" onSubmit={handleSearch}>
          <Search size={18} className="search-icon" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search services..."
            className="search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search services"
          />
        </form>
        <div className="notification-container" ref={notificationRef}>
          <button 
            className="notification-btn" 
            onClick={() => setShowNotifications(!showNotifications)}
            aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
            aria-expanded={showNotifications}
          >
            <Bell size={20} />
            {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
          </button>
          {showNotifications && (
            <>
              <div className="notification-overlay" onClick={() => setShowNotifications(false)} />
              <div className="notification-dropdown">
                <div className="notification-header">
                  <h3>Notifications</h3>
                  <span className="notification-count">{unreadCount} new</span>
                </div>
                <div className="notification-list">
                  {notifications.map(notif => (
                    <div key={notif.id} className={`notification-item ${notif.unread ? 'unread' : ''}`}>
                      <div className="notification-content">
                        <h4>{notif.title}</h4>
                        <p>{notif.message}</p>
                        <span className="notification-time">{notif.time}</span>
                      </div>
                      {notif.unread && <span className="unread-dot" />}
                    </div>
                  ))}
                </div>
                <button className="view-all-btn">View All Notifications</button>
              </div>
            </>
          )}
        </div>
        
        <div className="profile-container" ref={profileRef}>
          <button 
            className="profile-avatar" 
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            aria-label="User profile menu"
            aria-expanded={showProfileMenu}
          >
            <User size={20} />
          </button>
          {showProfileMenu && (
            <>
              <div className="profile-overlay" onClick={() => setShowProfileMenu(false)} />
              <div className="profile-dropdown">
                <div className="profile-menu" role="menu">
                  {profileMenuItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        className="profile-menu-item"
                        onClick={() => handleProfileNavigation(item.path, item.isLogout)}
                        role="menuitem"
                      >
                        <Icon size={18} />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default DashboardHeader;