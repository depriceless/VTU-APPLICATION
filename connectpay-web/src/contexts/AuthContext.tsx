'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useRef,
  useCallback,
} from 'react';
import { useRouter, usePathname } from 'next/navigation';
import apiClient, { setToken, removeToken, getToken } from '@/lib/api';
import { User, AuthContextType } from '@/types/auth';
import { logger } from '@/lib/logger';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

const INACTIVITY_TIMEOUT = 30 * 60 * 1000;

const PROTECTED_ROUTES = [
  '/dashboard',
  '/profile',
  '/settings',
  '/buy-airtime',
  '/buy-data',
  '/cable-tv',
  '/electricity',
  '/wallet-summary',
  '/transaction-history',
];

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser]       = useState<User | null>(null);
  const [balance, setBalance] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  const router   = useRouter();
  const pathname = usePathname();

  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);

  const isProtectedRoute = PROTECTED_ROUTES.some(r => pathname?.startsWith(r));

  // ── Balance ───────────────────────────────────────────────────────────────

  const refreshBalance = useCallback(async () => {
    try {
      const response = await apiClient.get('/balance');
      if (response.data?.success) {
        const raw = response.data.balance;
        if (typeof raw === 'number' && isFinite(raw) && raw >= 0) {
          setBalance(raw);
        }
      }
    } catch {
      logger.error('Failed to fetch balance');
    }
  }, []);

  // ── Inactivity timer ──────────────────────────────────────────────────────

  const resetInactivityTimer = useCallback((loggedIn: boolean) => {
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    if (!loggedIn) return;

    inactivityTimerRef.current = setTimeout(() => {
      removeToken();
      setUser(null);
      setBalance(0);
      router.push('/login?reason=inactivity');
    }, INACTIVITY_TIMEOUT);
  }, [router]);

  useEffect(() => {
    if (!user) return;
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    const handleActivity = () => resetInactivityTimer(true);
    events.forEach(e => document.addEventListener(e, handleActivity));
    resetInactivityTimer(true);
    return () => {
      events.forEach(e => document.removeEventListener(e, handleActivity));
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    };
  }, [user, resetInactivityTimer]);

  // ── Initial auth check ────────────────────────────────────────────────────

  const checkAuth = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const response = await apiClient.get('/auth/me');

      if (response.data?.user) {
        setUser(response.data.user);
        const raw = response.data.balance;
        if (typeof raw === 'number' && isFinite(raw) && raw >= 0) {
          setBalance(raw);
        } else {
          await refreshBalance();
        }
      } else {
        removeToken();
        setUser(null);
        setBalance(0);
      }
    } catch {
      removeToken();
      setUser(null);
      setBalance(0);
    } finally {
      setLoading(false);
    }
  }, [refreshBalance]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Periodic session check (every 60s)
  useEffect(() => {
    const interval = setInterval(async () => {
      if (!user) return;
      try {
        await apiClient.get('/auth/me');
      } catch (error: any) {
        if (error.response?.status === 401) {
          removeToken();
          setUser(null);
          setBalance(0);
          if (isProtectedRoute) router.replace('/login?reason=expired');
        }
      }
    }, 60_000);
    return () => clearInterval(interval);
  }, [user, isProtectedRoute, router]);

  // ── Route guard ───────────────────────────────────────────────────────────

  useEffect(() => {
    if (loading) return;
    if (!isProtectedRoute) return;
    if (user) return;
    router.replace('/login');
  }, [user, loading, isProtectedRoute, pathname, router]);

  // ── Login ─────────────────────────────────────────────────────────────────

  const login = async (credentials: { email: string; password: string }): Promise<User> => {
    try {
      const cleanEmail    = credentials.email.trim().toLowerCase().replace(/\s+/g, '');
      const cleanPassword = credentials.password.trim();

      // Step 1 — authenticate and get token
      const loginResponse = await apiClient.post('/auth/login', {
        emailOrPhone: cleanEmail,
        password:     cleanPassword,
      });

      if (!loginResponse.data?.success) {
        throw new Error(loginResponse.data?.message || 'Login failed');
      }

      if (loginResponse.data?.token) {
        setToken(loginResponse.data.token);
      }

      // Step 2 — ALWAYS call /me to get fresh user data including isPinSetup
      // This guarantees isPinSetup is accurate regardless of what the login
      // response returns — fixes mobile autofill / caching issues
      const meResponse = await apiClient.get('/auth/me');

      if (!meResponse.data?.user) {
        throw new Error('Failed to fetch user profile after login');
      }

      const freshUser = meResponse.data.user;
      setUser(freshUser);

      const raw = meResponse.data.balance;
      if (typeof raw === 'number' && isFinite(raw) && raw >= 0) {
        setBalance(raw);
      } else {
        await refreshBalance();
      }

      resetInactivityTimer(true);

      // Return the fresh user so the login page can check isPinSetup
      return freshUser;

    } catch (error: any) {
      removeToken();
      setUser(null);
      setBalance(0);
      throw error;
    }
  };

  // ── Logout ────────────────────────────────────────────────────────────────

  const logout = async () => {
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);

    if (user) {
      try {
        await apiClient.post('/auth/logout', {});
      } catch {
        // Non-critical
      }
    }

    removeToken();
    setUser(null);
    setBalance(0);
    router.push('/login');
  };

  // ── Context value ─────────────────────────────────────────────────────────

  const value: AuthContextType = {
    user,
    loading,
    login,
    logout,
    isAuthenticated: !!user,
    balance,
    refreshBalance,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}