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

  // ── Mobile detection — only updates isMobile, never touches isSidebarOpen ──
  useEffect(() => {
    const mobile = window.innerWidth <= 768;
    setIsMobile(mobile);
    setIsSidebarOpen(!mobile); // set ONCE on mount only

    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // ── Close sidebar on route change (mobile only) ──────────────────────────────
  useEffect(() => {
    if (window.innerWidth <= 768) {
      setIsSidebarOpen(false);
    }
  }, [pathname]);

  // ── Toggle sidebar ───────────────────────────────────────────────────────────
  const handleToggleSidebar = () => {
    if (window.innerWidth <= 768) {
      setIsSidebarOpen(prev => !prev);
    } else {
      setIsCollapsed(prev => !prev);
    }
  };

  const handleNavigate = (path: string) => router.push(path);

  const handleLogout = async () => {
    try {
      await logout();
    } catch {
      // logout errors are handled in AuthContext
    }
  };

  // ── Loading state ─────────────────────────────────────────────────────────────
  if (loading || !isAuthenticated) {
    return (
      <div className="dl-loading">
        <div className="dl-spinner" />
        <p>Loading…</p>
      </div>
    );
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

      <main
        className={`main-content ${isCollapsed ? 'collapsed' : ''} ${
          !isSidebarOpen && isMobile ? 'no-sidebar' : ''
        }`}
      >
        {children}
      </main>
    </div>
  );
}