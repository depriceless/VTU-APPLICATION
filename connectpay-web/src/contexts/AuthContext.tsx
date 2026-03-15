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

const INACTIVITY_TIMEOUT = 3 * 60 * 1000; // 3 minutes

function setAuthCookie(token: string) {
  const maxAge = 7 * 24 * 60 * 60;
  document.cookie = `authToken=${token}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

function removeAuthCookie() {
  document.cookie = 'authToken=; path=/; max-age=0; SameSite=Lax';
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser]       = useState<User | null>(null);
  const [balance, setBalance] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  const router   = useRouter();
  const pathname = usePathname();

  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const routerRef          = useRef(router);
  const userRef            = useRef(user);
  const isProtectedRoute   = pathname?.startsWith('/dashboard') ?? false;

  // Keep refs in sync without causing re-renders or effect re-runs
  useEffect(() => { routerRef.current = router; }, [router]);
  useEffect(() => { userRef.current = user; }, [user]);

  const refreshBalance = useCallback(async () => {
    try {
      const response = await apiClient.get('/balance');
      if (response.data?.success) {
        const raw = response.data.balance;
        if (typeof raw === 'number' && isFinite(raw) && raw >= 0) setBalance(raw);
      }
    } catch {
      logger.error('Failed to fetch balance');
    }
  }, []);

  // ── Inactivity timer — stable, never recreated ─────────────────
  // Uses refs so this function never changes identity, meaning the
  // activity useEffect never re-runs on navigation (the bug fix)
  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);

    inactivityTimerRef.current = setTimeout(() => {
      removeToken();
      removeAuthCookie();
      setUser(null);
      setBalance(0);
      routerRef.current.push('/login?reason=inactivity');
    }, INACTIVITY_TIMEOUT);
  }, []); // ← no dependencies = never recreated

  // ── Attach activity listeners once when user logs in ───────────
  useEffect(() => {
    if (!user) {
      // User logged out — clear timer
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
      return;
    }

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    events.forEach(e => document.addEventListener(e, resetInactivityTimer));
    resetInactivityTimer(); // start timer immediately on login

    return () => {
      events.forEach(e => document.removeEventListener(e, resetInactivityTimer));
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    };
  }, [user, resetInactivityTimer]); // resetInactivityTimer is stable so this only runs when user changes

  // ── Initial auth check ──────────────────────────────────────────
  const checkAuth = useCallback(async () => {
    const token = getToken();
    if (!token) {
      removeAuthCookie();
      setLoading(false);
      return;
    }

    try {
      const response = await apiClient.get('/auth/me');
      if (response.data?.user) {
        setUser(response.data.user);
        setAuthCookie(token);
        const raw = response.data.balance;
        if (typeof raw === 'number' && isFinite(raw) && raw >= 0) setBalance(raw);
        else await refreshBalance();
      } else {
        removeToken();
        removeAuthCookie();
        setUser(null);
        setBalance(0);
      }
    } catch {
      removeToken();
      removeAuthCookie();
      setUser(null);
      setBalance(0);
    } finally {
      setLoading(false);
    }
  }, [refreshBalance]);

  useEffect(() => { checkAuth(); }, [checkAuth]);

  // ── Periodic session check every 60s ───────────────────────────
  useEffect(() => {
    const interval = setInterval(async () => {
      if (!userRef.current) return;
      try {
        await apiClient.get('/auth/me');
      } catch (error: any) {
        if (error.response?.status === 401) {
          removeToken();
          removeAuthCookie();
          setUser(null);
          setBalance(0);
          if (pathname?.startsWith('/dashboard')) {
            routerRef.current.replace('/login?reason=expired');
          }
        }
      }
    }, 60_000);
    return () => clearInterval(interval);
  }, []); // ← runs once, uses refs internally

  // ── Login ───────────────────────────────────────────────────────
  const login = async (credentials: { email: string; password: string }): Promise<User> => {
    try {
      const cleanEmail    = credentials.email.trim().toLowerCase().replace(/\s+/g, '');
      const cleanPassword = credentials.password.trim();

      const loginResponse = await apiClient.post('/auth/login', {
        emailOrPhone: cleanEmail,
        password:     cleanPassword,
      });

      if (!loginResponse.data?.success) {
        throw new Error(loginResponse.data?.message || 'Login failed');
      }

      const token = loginResponse.data?.token;
      if (token) {
        setToken(token);
        setAuthCookie(token);
      }

      const meResponse = await apiClient.get('/auth/me');
      if (!meResponse.data?.user) throw new Error('Failed to fetch user profile');

      const freshUser = meResponse.data.user;
      setUser(freshUser);

      const raw = meResponse.data.balance;
      if (typeof raw === 'number' && isFinite(raw) && raw >= 0) setBalance(raw);
      else await refreshBalance();

      return freshUser;

    } catch (error: any) {
      removeToken();
      removeAuthCookie();
      setUser(null);
      setBalance(0);
      throw error;
    }
  };

  // ── Logout ──────────────────────────────────────────────────────
  const logout = async () => {
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    if (user) {
      try { await apiClient.post('/auth/logout', {}); } catch {}
    }
    removeToken();
    removeAuthCookie();
    setUser(null);
    setBalance(0);
    router.push('/login');
  };

  const value: AuthContextType = {
    user, loading, login, logout,
    isAuthenticated: !!user,
    balance, refreshBalance,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}