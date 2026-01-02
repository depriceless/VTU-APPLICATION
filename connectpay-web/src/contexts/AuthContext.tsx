'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import apiClient, { storage, TOKEN_KEY } from '@/lib/api';
import { User, AuthContextType } from '@/types/auth';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

// 2 minutes in milliseconds
const INACTIVITY_TIMEOUT = 2 * 60 * 1000; // 2 minutes

// Helper function to check if JWT token is expired
function isTokenExpired(token: string): boolean {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      console.error('❌ Invalid token format');
      return true;
    }

    const payload = JSON.parse(atob(parts[1]));
    
    if (!payload.exp) {
      console.warn('⚠️ Token has no expiration time');
      return false;
    }
    
    const expirationTime = payload.exp * 1000;
    const currentTime = Date.now();
    
    const isExpired = expirationTime <= currentTime;
    
    if (isExpired) {
      console.log('⏰ Token expired at:', new Date(expirationTime));
    } else {
      const timeLeft = Math.floor((expirationTime - currentTime) / 1000 / 60);
      console.log(`✅ Token valid for ${timeLeft} more minutes`);
    }
    
    return isExpired;
  } catch (error) {
    console.error('❌ Failed to parse token:', error);
    return true;
  }
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [balance, setBalance] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  
  // Inactivity timeout refs
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  // Define protected routes
  const protectedRoutes = ['/dashboard', '/profile', '/settings', '/buy-airtime', '/buy-data', '/cable-tv', '/electricity', '/wallet-summary', '/transaction-history'];
  const isProtectedRoute = protectedRoutes.some(route => pathname?.startsWith(route));

  // Reset inactivity timer
  const resetInactivityTimer = () => {
    lastActivityRef.current = Date.now();
    
    // Clear existing timer
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }
    
    // Only set timer if user is logged in
    if (user) {
      inactivityTimerRef.current = setTimeout(() => {
        console.log('⏰ User inactive for 2 minutes, logging out...');
        handleInactivityLogout();
      }, INACTIVITY_TIMEOUT);
    }
  };

  // Handle inactivity logout
  const handleInactivityLogout = () => {
    console.log('🚪 Logging out due to inactivity...');
    storage.removeItem(TOKEN_KEY);
    setUser(null);
    setBalance(0);
    router.push('/login?reason=inactivity');
  };

  // Refresh balance function
  const refreshBalance = async () => {
    try {
      console.log('🔄 Refreshing balance...');
      const response = await apiClient.get('/balance');
      
      if (response.data?.success && response.data?.balance !== undefined) {
        let balanceValue = 0;
        
        // Handle different balance formats
        if (typeof response.data.balance === 'number') {
          balanceValue = response.data.balance;
        } else if (typeof response.data.balance === 'object') {
          balanceValue = response.data.balance.amount || 
                        response.data.balance.balance || 
                        response.data.balance.total || 
                        response.data.balance.current ||
                        response.data.balance.value || 0;
        }
        
        setBalance(balanceValue);
        console.log('✅ Balance refreshed:', balanceValue);
      }
    } catch (error) {
      console.error('❌ Failed to fetch balance:', error);
    }
  };

  // Track user activity
  useEffect(() => {
    if (!user) return;

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    const handleActivity = () => {
      resetInactivityTimer();
    };

    // Add event listeners
    events.forEach(event => {
      document.addEventListener(event, handleActivity);
    });

    // Start initial timer
    resetInactivityTimer();

    // Cleanup
    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
      
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
    };
  }, [user]);

  // Initial auth check on mount
  useEffect(() => {
    checkAuth();
  }, []);

  // Periodic token expiration check (every 1 minute)
  useEffect(() => {
    const interval = setInterval(() => {
      const token = storage.getItem(TOKEN_KEY);
      
      if (token) {
        if (isTokenExpired(token)) {
          console.log('⏰ Token expired during periodic check, logging out...');
          handleTokenExpiration();
        }
      }
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  // Redirect logic when auth state changes
  useEffect(() => {
    if (!loading) {
      if (!user && isProtectedRoute) {
        console.log('🚫 Unauthorized access to protected route:', pathname);
        console.log('🔄 Redirecting to login...');
        router.replace('/login');
      }
    }
  }, [user, loading, isProtectedRoute, pathname, router]);

  const checkAuth = async () => {
    try {
      const token = storage.getItem(TOKEN_KEY);
      
      if (!token) {
        console.log('⚠️ No token found in storage');
        setUser(null);
        setBalance(0);
        setLoading(false);
        return;
      }

      console.log('🔍 Token found, checking expiration...');

      if (isTokenExpired(token)) {
        console.log('⏰ Token is expired, skipping API call');
        handleTokenExpiration();
        return;
      }

      console.log('✅ Token is valid, fetching user profile...');
      
      const response = await apiClient.get('/auth/profile');
      
      if (response.data && response.data.user) {
        setUser(response.data.user);
        console.log('✅ User authenticated:', response.data.user.name);
        await refreshBalance();
      } else {
        console.warn('⚠️ No user data in response');
        setUser(null);
        setBalance(0);
      }
    } catch (error: any) {
      console.error('❌ Auth check failed:', error);
      
      if (error.response?.status === 401 || error.status === 401) {
        console.log('🔒 Received 401, token is invalid');
        handleTokenExpiration();
      } else {
        storage.removeItem(TOKEN_KEY);
        setUser(null);
        setBalance(0);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleTokenExpiration = () => {
    console.log('🔄 Handling token expiration...');
    storage.removeItem(TOKEN_KEY);
    setUser(null);
    setBalance(0);
    setLoading(false);
    
    if (isProtectedRoute) {
      console.log('🔄 Redirecting to login from protected route');
      router.replace('/login?reason=expired');
    }
  };

  const login = async (token: string) => {
    try {
      console.log('🔄 Logging in with token...');
      
      if (isTokenExpired(token)) {
        throw new Error('Token is already expired');
      }
      
      storage.setItem(TOKEN_KEY, token);
      console.log('💾 Token saved to localStorage');
      
      const verifyToken = storage.getItem(TOKEN_KEY);
      console.log('🔍 Token verification:', verifyToken ? 'CONFIRMED ✅' : 'FAILED ❌');
      
      if (!verifyToken) {
        throw new Error('Token save verification failed');
      }
      
      const response = await apiClient.get('/auth/profile');
      
      if (response.data && response.data.user) {
        setUser(response.data.user);
        console.log('✅ Login successful:', response.data.user.name);
        await refreshBalance();
        
        // Start inactivity timer after successful login
        resetInactivityTimer();
      } else {
        throw new Error('Failed to fetch user profile');
      }
      
    } catch (error: any) {
      console.error('❌ Login error:', error);
      storage.removeItem(TOKEN_KEY);
      setUser(null);
      setBalance(0);
      throw error;
    }
  };

  const logout = async () => {
    try {
      console.log('🚪 Logging out...');
      
      // Clear inactivity timer
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
      
      try {
        await apiClient.post('/auth/logout');
        console.log('✅ Backend logout successful');
      } catch (error) {
        console.log('⚠️ Backend logout failed (not critical)');
      }
      
      storage.removeItem(TOKEN_KEY);
      setUser(null);
      setBalance(0);
      
      console.log('✅ Logout successful, token cleared');
      
      router.push('/login');
    } catch (error) {
      console.error('❌ Logout error:', error);
      storage.removeItem(TOKEN_KEY);
      setUser(null);
      setBalance(0);
      router.push('/login');
    }
  };

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
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}