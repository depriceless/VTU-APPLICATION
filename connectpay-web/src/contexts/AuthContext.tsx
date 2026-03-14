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
import apiClient, { getCsrfToken } from '@/lib/api';
import { User, AuthContextType } from '@/types/auth';
import { logger } from '@/lib/logger';

// ── Token is now an httpOnly cookie set by the backend ────────────────────────
// The frontend never reads or writes the token directly.
// The browser attaches it automatically to every request via withCredentials.
// ─────────────────────────────────────────────────────────────────────────────

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

// ── Provider ──────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser]         = useState<User | null>(null);
  const [balance, setBalance]   = useState<number>(0);
  const [loading, setLoading]   = useState(true);
  const [csrfReady, setCsrfReady] = useState(false);

  const router   = useRouter();
  const pathname = usePathname();

  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);

  const isProtectedRoute = PROTECTED_ROUTES.some(r => pathname?.startsWith(r));

  // ── CSRF init ─────────────────────────────────────────────────────────────
  // Fetch CSRF token once on mount before any state-changing requests fire.
  // checkAuth (GET) is safe without it, but login/logout (POST) need it.

  useEffect(() => {
    getCsrfToken()
      .then(() => setCsrfReady(true))
      .catch(() => {
        // Still mark ready — api.ts will retry on 403
        setCsrfReady(true);
      });
  }, []);

  // ── Balance ───────────────────────────────────────────────────────────────

  const refreshBalance = useCallback(async () => {
    try {
      const response = await apiClient.get('/balance');
      if (response.data?.success) {
        const raw = response.data.balance;
        if (typeof raw === 'number' && isFinite(raw) && raw >= 0) {
          setBalance(raw);
        } else {
          logger.warn('Unexpected balance shape from API');
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
  // GET /auth/me is CSRF-safe (read-only) — fires immediately on mount.
  // No need to wait for csrfReady here.

  const checkAuth = useCallback(async () => {
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
        setUser(null);
        setBalance(0);
      }
    } catch {
      // 401 means no valid cookie — user is not logged in, that's fine
      setUser(null);
      setBalance(0);
    } finally {
      setLoading(false);
    }
  }, [refreshBalance]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Periodic session check (every 60s) — re-validates cookie server-side
  useEffect(() => {
    const interval = setInterval(async () => {
      if (!user) return;
      try {
        await apiClient.get('/auth/me');
      } catch (error: any) {
        if (error.response?.status === 401) {
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
  // Waits for CSRF token to be ready before posting credentials.

  const login = async (credentials: { email: string; password: string }) => {
    // Ensure CSRF token is available before POSTing
    if (!csrfReady) {
      await getCsrfToken().catch(() => null);
    }

    try {
      const loginResponse = await apiClient.post('/auth/login', credentials);

      if (!loginResponse.data?.success) {
        throw new Error(loginResponse.data?.message || 'Login failed');
      }

      if (loginResponse.data?.user) {
        setUser(loginResponse.data.user);
        await refreshBalance();
        resetInactivityTimer(true);
        return;
      }

      const meResponse = await apiClient.get('/auth/me');
      if (meResponse.data?.user) {
        setUser(meResponse.data.user);
        const raw = meResponse.data.balance;
        if (typeof raw === 'number' && isFinite(raw) && raw >= 0) {
          setBalance(raw);
        } else {
          await refreshBalance();
        }
        resetInactivityTimer(true);
      } else {
        throw new Error('Failed to fetch user profile after login');
      }
    } catch (error: any) {
      setUser(null);
      setBalance(0);
      throw error;
    }
  };

  // ── Logout ────────────────────────────────────────────────────────────────
  // Skips the POST if there's no active session — prevents CSRF warning
  // on page load when the old session has already expired server-side.

  const logout = async () => {
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);

    // Only call the logout endpoint if we have an active session
    if (user) {
      try {
        await apiClient.post('/auth/logout');
      } catch {
        // Non-critical — session already expired or network issue
      }
    }

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