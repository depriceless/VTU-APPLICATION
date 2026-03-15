'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Sidebar from '@/components/dashboard/Sidebar';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import '@/app/dashboard/DashboardLayout.css';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { logout, user, isAuthenticated, loading, balance } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mobile = window.innerWidth <= 768;
    setIsMobile(mobile);
    setIsSidebarOpen(!mobile);
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (window.innerWidth <= 768) setIsSidebarOpen(false);
  }, [pathname]);

  // Redirect to login only after loading is done and user is not authenticated
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [loading, isAuthenticated, router]);

  const handleToggleSidebar = () => {
    if (window.innerWidth <= 768) setIsSidebarOpen(prev => !prev);
    else setIsCollapsed(prev => !prev);
  };

  const handleNavigate = (path: string) => router.push(path);
  const handleLogout = async () => { try { await logout(); } catch {} };

  // Only show spinner while the auth check is in progress
  if (loading) {
    return (
      <div className="dl-loading">
        <div className="dl-spinner" />
        <p>Loading...</p>
      </div>
    );
  }

  // Auth check done but no user — return null, redirect fires via useEffect above
  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="app-container">
      <DashboardHeader
        onToggleSidebar={handleToggleSidebar}
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
      <main className={`main-content ${isCollapsed ? 'collapsed' : ''} ${!isSidebarOpen && isMobile ? 'no-sidebar' : ''}`}>
        {children}
      </main>
    </div>
  );
}