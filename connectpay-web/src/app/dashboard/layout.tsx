'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Sidebar from '@/components/dashboard/Sidebar';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import apiClient from '@/lib/api';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { logout, user, isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [balance, setBalance] = useState(0);

  // Check authentication
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, loading, router]);

  // Check if mobile
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      if (mobile) {
        setIsSidebarOpen(false);
      }
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Fetch balance
  useEffect(() => {
    const fetchBalance = async () => {
      try {
        const response = await apiClient.get('/balance');
        if (response.data?.success && response.data?.balance) {
          const balanceValue = typeof response.data.balance === 'number' 
            ? response.data.balance 
            : parseFloat(response.data.balance.amount || response.data.balance.balance || 0);
          setBalance(balanceValue);
        }
      } catch (error) {
        console.error('Error fetching balance:', error);
      }
    };

    if (isAuthenticated) {
      fetchBalance();
      // Refresh balance every 30 seconds
      const interval = setInterval(fetchBalance, 30000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  const handleNavigate = (path: string) => {
    router.push(path);
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Show loading or redirect if not authenticated
  if (loading) {
    return null;
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <>
      <div className="app-container">
        <DashboardHeader 
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          isCollapsed={isCollapsed}
          setIsCollapsed={setIsCollapsed}
          isMobile={isMobile}
          isSidebarOpen={isSidebarOpen}
          onNavigate={handleNavigate}
          onLogout={handleLogout}
        />
        
        <Sidebar 
          isOpen={isSidebarOpen}
          setIsOpen={setIsSidebarOpen}
          currentPath={pathname}
          onNavigate={handleNavigate}
          onLogout={handleLogout}
          isCollapsed={isCollapsed}
          setIsCollapsed={setIsCollapsed}
          isMobile={isMobile}
          balance={balance}
          contextUser={user}
        />
        
        <main className={`main-content ${isCollapsed ? 'collapsed' : ''}`}>
          {children}
        </main>
      </div>

      <style jsx global>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html, body { overflow-x: hidden; height: 100%; }
        body { 
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
          background: #f9fafb; 
          font-weight: 500;
        }
        
        .app-container { 
          display: flex; 
          flex-direction: column; 
          min-height: 100vh; 
          background: #f9fafb; 
        }
        
        .sidebar-overlay { 
          position: fixed; 
          top: 0; 
          left: 0; 
          right: 0; 
          bottom: 0; 
          background: rgba(0, 0, 0, 0.5); 
          z-index: 998; 
          display: none; 
        }
        
        .sidebar { 
          position: fixed; 
          top: 64px; 
          left: 0; 
          height: calc(100vh - 64px); 
          width: 280px; 
          background: #dc2626; 
          box-shadow: 2px 0 8px rgba(0, 0, 0, 0.1); 
          z-index: 1000; 
          display: flex; 
          flex-direction: column; 
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); 
          overflow-y: auto;
        }
        
        .sidebar.collapsed { 
          width: 85px; 
        }
        
        .user-profile-section { 
          padding: 20px; 
          background: rgba(0, 0, 0, 0.1); 
          border-bottom: 1px solid rgba(255, 255, 255, 0.1); 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          min-height: 70px; 
        }
        
        .user-info { 
          text-align: center; 
        }
        
        .user-name { 
          font-size: 14px; 
          font-weight: 700; 
          color: #ffffff; 
          margin-bottom: 8px; 
        }
        
        .user-wallet { 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          gap: 6px; 
          color: #ffffff; 
          font-size: 13px; 
          font-weight: 700; 
        }
        
        .user-info-collapsed { 
          display: flex; 
          align-items: center; 
          justify-content: center; 
        }
        
        .user-avatar-small { 
          width: 36px; 
          height: 36px; 
          background: #ffffff; 
          border-radius: 50%; 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          color: #dc2626; 
          font-weight: 700; 
          font-size: 14px; 
        }
        
        .sidebar-nav { 
          flex: 1; 
          overflow-y: auto; 
          padding: 20px 16px; 
        }
        
        .sidebar-nav::-webkit-scrollbar { 
          width: 6px; 
        }
        
        .sidebar-nav::-webkit-scrollbar-thumb { 
          background: rgba(255, 255, 255, 0.2); 
          border-radius: 3px; 
        }
        
        .sidebar.collapsed .sidebar-nav { 
          padding: 20px 8px; 
        }
        
        .menu-item-wrapper { 
          margin-bottom: 4px; 
        }
        
        .menu-item { 
          width: 100%; 
          display: flex; 
          align-items: center; 
          justify-content: space-between; 
          padding: 12px 16px; 
          background: none; 
          border: none; 
          border-radius: 12px; 
          cursor: pointer; 
          transition: all 0.2s ease; 
          color: rgba(255, 255, 255, 0.7); 
          font-size: 14px; 
          font-weight: 600; 
          margin-bottom: 4px; 
        }
        
        .sidebar.collapsed .menu-item { 
          padding: 12px; 
          justify-content: center; 
        }
        
        .menu-item-content { 
          display: flex; 
          align-items: center; 
          gap: 12px; 
        }
        
        .sidebar.collapsed .menu-item-content { 
          gap: 0; 
        }
        
        .menu-icon { 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          flex-shrink: 0; 
        }
        
        .menu-label { 
          color: rgba(255, 255, 255, 0.9); 
          font-weight: 600; 
          white-space: nowrap; 
        }
        
        .menu-item:hover { 
          background: rgba(255, 255, 255, 0.1); 
        }
        
        .menu-item.active { 
          background: #ffffff; 
        }
        
        .menu-item.active .menu-label { 
          color: #dc2626; 
          font-weight: 700; 
        }
        
        .menu-item.active .menu-icon { 
          color: #dc2626 !important; 
        }
        
        .menu-item.active svg { 
          color: #dc2626 !important; 
          stroke: #dc2626 !important; 
        }
        
        .submenu { 
          margin-left: 20px; 
          margin-top: 4px; 
          margin-bottom: 8px; 
          border-left: 2px solid rgba(255, 255, 255, 0.2); 
          padding-left: 12px; 
        }
        
        .submenu-item { 
          width: 100%; 
          display: flex;
          align-items: center; 
          gap: 10px; 
          padding: 10px 12px; 
          background: none; 
          border: none; 
          border-radius: 8px; 
          cursor: pointer; 
          transition: all 0.2s ease; 
          color: rgba(255, 255, 255, 0.7); 
          font-size: 13px; 
          font-weight: 600; 
          margin-bottom: 2px; 
        }
        
        .submenu-item:hover { 
          background: rgba(255, 255, 255, 0.1); 
          color: #ffffff; 
        }
        
        .submenu-item.active { 
          background: #ffffff; 
          color: #dc2626; 
          font-weight: 700; 
        }
        
        .submenu-item.active svg { 
          color: #dc2626 !important; 
          stroke: #dc2626 !important; 
        }
        
        .dashboard-header { 
          position: fixed; 
          top: 0; 
          left: 0; 
          right: 0; 
          background: #dc2626; 
          padding: 12px 24px; 
          display: flex; 
          align-items: center; 
          justify-content: space-between; 
          gap: 20px; 
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1); 
          z-index: 999; 
          height: 64px; 
        }
        
        .header-left { 
          display: flex; 
          align-items: center; 
          gap: 16px; 
        }
        
        .header-logo { 
          display: flex; 
          align-items: center; 
        }
        
        .logo-text { 
          font-size: 16px; 
          font-weight: 800; 
          color: #ffffff; 
          white-space: nowrap; 
        }
        
        .mobile-menu-btn, .collapse-btn { 
          background: rgba(255, 255, 255, 0.1); 
          border: none; 
          cursor: pointer; 
          padding: 8px; 
          color: #ffffff; 
          border-radius: 8px; 
          transition: all 0.2s ease; 
          display: flex; 
          align-items: center; 
          justify-content: center; 
        }
        
        .mobile-menu-btn:hover, .collapse-btn:hover { 
          background: rgba(255, 255, 255, 0.2); 
        }
        
        .collapse-btn .rotated { 
          transform: rotate(180deg); 
        }
        
        .mobile-menu-btn { 
          display: none; 
        }
        
        .header-right { 
          display: flex; 
          align-items: center; 
          gap: 16px; 
        }
        
        .search-container { 
          position: relative; 
          display: flex; 
          align-items: center; 
        }
        
        .search-icon { 
          position: absolute; 
          left: 12px; 
          color: rgba(255, 255, 255, 0.6); 
          pointer-events: none; 
        }
        
        .search-input { 
          padding: 10px 12px 10px 40px; 
          border: 1px solid rgba(255, 255, 255, 0.3); 
          border-radius: 10px; 
          font-size: 14px; 
          font-weight: 600; 
          width: 250px; 
          transition: all 0.2s ease; 
          background: rgba(255, 255, 255, 0.1); 
          color: #ffffff; 
        }
        
        .search-input::placeholder { 
          color: rgba(255, 255, 255, 0.6); 
          font-weight: 600; 
        }
        
        .search-input:focus { 
          outline: none; 
          border-color: rgba(255, 255, 255, 0.5); 
          box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.1); 
          background: rgba(255, 255, 255, 0.15); 
        }
        
        .notification-container { 
          position: relative; 
        }
        
        .notification-btn { 
          position: relative; 
          background: rgba(255, 255, 255, 0.1); 
          border: none; 
          border-radius: 10px; 
          padding: 10px; 
          cursor: pointer; 
          color: #ffffff; 
          transition: all 0.2s ease; 
          display: flex; 
          align-items: center; 
          justify-content: center; 
        }
        
        .notification-btn:hover { 
          background: rgba(255, 255, 255, 0.2); 
        }
        
        .notification-badge { 
          position: absolute; 
          top: 4px; 
          right: 4px; 
          background: #ffffff; 
          color: #dc2626; 
          font-size: 10px; 
          font-weight: 700; 
          padding: 2px 6px; 
          border-radius: 10px; 
          min-width: 18px; 
          text-align: center; 
        }
        
        .notification-overlay, .profile-overlay { 
          position: fixed; 
          top: 0; 
          left: 0; 
          right: 0; 
          bottom: 0; 
          z-index: 1500; 
        }
        
        .notification-dropdown { 
          position: absolute; 
          top: calc(100% + 8px); 
          right: 0; 
          width: 360px; 
          background: white; 
          border-radius: 12px; 
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15); 
          z-index: 2000; 
          overflow: hidden; 
        }
        
        .notification-header { 
          display: flex; 
          justify-content: space-between; 
          align-items: center; 
          padding: 16px 20px; 
          border-bottom: 1px solid #e5e7eb; 
        }
        
        .notification-header h3 { 
          font-size: 16px; 
          font-weight: 800; 
          color: #1f2937; 
        }
        
        .notification-count { 
          font-size: 13px; 
          color: #dc2626; 
          font-weight: 700; 
        }
        
        .notification-list { 
          max-height: 400px; 
          overflow-y: auto; 
        }
        
        .notification-item { 
          position: relative; 
          padding: 16px 20px; 
          border-bottom: 1px solid #f3f4f6; 
          cursor: pointer; 
          transition: background 0.2s ease; 
        }
        
        .notification-item:hover { 
          background: #f9fafb; 
        }
        
        .notification-item.unread { 
          background: #fef2f2; 
        }
        
        .notification-content h4 { 
          font-size: 14px; 
          font-weight: 700; 
          color: #1f2937; 
          margin-bottom: 4px; 
        }
        
        .notification-content p { 
          font-size: 13px; 
          font-weight: 500; 
          color: #6b7280; 
          margin-bottom: 4px; 
        }
        
        .notification-time { 
          font-size: 12px; 
          font-weight: 500; 
          color: #9ca3af; 
        }
        
        .unread-dot { 
          position: absolute; 
          top: 50%; 
          right: 16px; 
          transform: translateY(-50%); 
          width: 8px; 
          height: 8px; 
          background: #dc2626; 
          border-radius: 50%; 
        }
        
        .view-all-btn { 
          width: 100%; 
          padding: 12px; 
          background: #f9fafb; 
          border: none; 
          color: #dc2626; 
          font-weight: 700; 
          font-size: 14px; 
          cursor: pointer; 
          transition: background 0.2s ease; 
        }
        
        .view-all-btn:hover { 
          background: #f3f4f6; 
        }
        
        .profile-container { 
          position: relative; 
        }
        
        .profile-avatar { 
          width: 40px; 
          height: 40px; 
          background: rgba(255, 255, 255, 0.1); 
          border-radius: 20px; 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          color: #ffffff; 
          cursor: pointer; 
          flex-shrink: 0; 
          border: none; 
          transition: all 0.2s ease; 
        }
        
        .profile-avatar:hover { 
          background: rgba(255, 255, 255, 0.2); 
        }
        
        .profile-dropdown { 
          position: absolute; 
          top: calc(100% + 8px); 
          right: 0; 
          width: 220px; 
          background: white; 
          border-radius: 12px; 
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15); 
          z-index: 2000; 
          overflow: hidden; 
        }
        
        .profile-menu { 
          padding: 6px 0; 
        }
        
        .profile-menu-item { 
          width: 100%; 
          display: flex; 
          align-items: center; 
          gap: 10px; 
          padding: 11px 16px; 
          background: none; 
          border: none; 
          cursor: pointer; 
          transition: all 0.2s ease; 
          color: #4b5563; 
          font-size: 13px; 
          font-weight: 600; 
          white-space: nowrap; 
        }
        
        .profile-menu-item:hover { 
          background: #f3f4f6; 
        }
        
        .profile-menu-item svg { 
          color: #6b7280; 
          flex-shrink: 0; 
        }
        
        .main-content { 
          flex: 1; 
          margin-top: 64px; 
          margin-left: 280px; 
          transition: margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1); 
          min-height: calc(100vh - 64px); 
          background: #f9fafb; 
          overflow-y: auto;
        }
        
        .main-content.collapsed { 
          margin-left: 85px; 
        }
        
        @media (max-width: 768px) {
          .sidebar { 
            transform: translateX(-100%); 
            width: 260px !important; 
            top: 56px; 
            height: calc(100vh - 56px); 
          }
          
          .sidebar.open { 
            transform: translateX(0); 
          }
          
          .sidebar-overlay { 
            display: block; 
            top: 56px; 
          }
          
          .user-profile-section { 
            padding: 16px; 
            min-height: 80px; 
          }
          
          .mobile-menu-btn { 
            display: flex; 
          }
          
          .collapse-btn { 
            display: none; 
          }
          
          .dashboard-header { 
            padding: 10px 16px; 
            height: 56px; 
          }
          
          .logo-text { 
            font-size: 15px; 
          }
          
          .search-container { 
            display: none; 
          }
          
          .notification-dropdown { 
            width: calc(100vw - 32px); 
            right: -50px; 
          }
          
          .header-right { 
            gap: 8px; 
          }
          
          .profile-avatar { 
            width: 36px; 
            height: 36px; 
          }
          
          .profile-dropdown { 
            width: 192px; 
            right: 0; 
            top: calc(100% + 4px); 
          }
          
          .main-content { 
            margin-top: 56px; 
            margin-left: 0 !important; 
            min-height: calc(100vh - 56px); 
          }
        }
        
        @media (max-width: 480px) {
          .sidebar { 
            width: 240px !important; 
          }
          
          .dashboard-header { 
            padding: 8px 12px; 
            height: 52px; 
          }
          
          .sidebar { 
            top: 52px; 
            height: calc(100vh - 52px); 
          }
          
          .sidebar-overlay { 
            top: 52px; 
          }
          
          .logo-text { 
            font-size: 14px; 
          }
          
          .main-content { 
            margin-top: 52px; 
            min-height: calc(100vh - 52px); 
          }
          
          .profile-avatar { 
            width: 32px; 
            height: 32px; 
          }
        }
      `}</style>
    </>
  );
}