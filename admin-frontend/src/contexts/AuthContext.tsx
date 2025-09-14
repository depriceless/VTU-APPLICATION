import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Types and Interfaces
interface AdminUser {
  id: string;
  username: string;
  email: string;
  fullName: string;
  role: 'super_admin' | 'admin' | 'support' | 'financial_manager';
  permissions: string[];
  avatar?: string;
  isActive: boolean;
  lastLogin?: string;
  createdAt: string;
}

interface AuthState {
  isAuthenticated: boolean;
  admin: AdminUser | null;
  token: string | null;
  isLoading: boolean;
}

interface AuthContextType extends AuthState {
  login: (admin: AdminUser, token: string, rememberMe?: boolean) => void;
  logout: () => void;
  updateAdmin: (updates: Partial<AdminUser>) => void;
  hasPermission: (permission: string) => boolean;
  hasRole: (role: string | string[]) => boolean;
  refreshToken: () => Promise<boolean>;
  resetInactivityTimer: () => void;
}

// Initial state
const initialAuthState: AuthState = {
  isAuthenticated: false,
  admin: null,
  token: null,
  isLoading: true
};

// Create context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Storage keys
const STORAGE_KEYS = {
  TOKEN: 'admin_token',
  ADMIN: 'admin_user',
  USERNAME: 'remembered_username',
  LAST_ACTIVITY: 'last_activity_time'
} as const;

// Configuration
const INACTIVITY_TIMEOUT = 5* 60 * 1000; // 1 minute in milliseconds

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>(initialAuthState);
  const [inactivityTimer, setInactivityTimer] = useState<NodeJS.Timeout | null>(null);

  // Initialize authentication state
  useEffect(() => {
    initializeAuth();
    setupActivityListeners();
    
    return () => {
      removeActivityListeners();
      if (inactivityTimer) {
        clearTimeout(inactivityTimer);
      }
    };
  }, []);

  // Reset inactivity timer when auth state changes
  useEffect(() => {
    if (authState.isAuthenticated) {
      resetInactivityTimer();
    } else {
      if (inactivityTimer) {
        clearTimeout(inactivityTimer);
      }
    }
  }, [authState.isAuthenticated]);

  const initializeAuth = async () => {
    try {
      const storedToken = localStorage.getItem(STORAGE_KEYS.TOKEN) || 
                         sessionStorage.getItem(STORAGE_KEYS.TOKEN);
      const storedAdmin = localStorage.getItem(STORAGE_KEYS.ADMIN) || 
                         sessionStorage.getItem(STORAGE_KEYS.ADMIN);
      const lastActivity = localStorage.getItem(STORAGE_KEYS.LAST_ACTIVITY);

      // Check if session expired due to inactivity
      if (lastActivity) {
        const lastActivityTime = parseInt(lastActivity);
        const currentTime = Date.now();
        const timeSinceLastActivity = currentTime - lastActivityTime;

        if (timeSinceLastActivity > INACTIVITY_TIMEOUT) {
          console.log('Session expired due to inactivity');
          clearAuthStorage();
          setAuthState(prev => ({ ...prev, isLoading: false }));
          return;
        }
      }

      if (storedToken && storedAdmin) {
        const adminData: AdminUser = JSON.parse(storedAdmin);
        
        // Set auth state immediately to prevent logout on reload
        setAuthState({
          isAuthenticated: true,
          admin: adminData,
          token: storedToken,
          isLoading: false
        });

        // Update last activity time
        updateLastActivityTime();

        // Verify token in background (non-blocking)
        try {
          const response = await fetch('http://localhost:5000/api/admin/auth/verify', {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${storedToken}`
            }
          });
          
          if (!response.ok) {
            console.warn('Token verification failed, logging out');
            logout();
          }
        } catch (error) {
          console.warn('Token verification error (network issue):', error);
          // Don't logout on network errors - keep user logged in
        }
      } else {
        setAuthState(prev => ({ ...prev, isLoading: false }));
      }
    } catch (error) {
      console.error('Auth initialization error:', error);
      clearAuthStorage();
      setAuthState(prev => ({ ...prev, isLoading: false }));
    }
  };

  const setupActivityListeners = () => {
    // Add event listeners for user activity
    window.addEventListener('mousemove', resetInactivityTimer);
    window.addEventListener('keypress', resetInactivityTimer);
    window.addEventListener('click', resetInactivityTimer);
    window.addEventListener('scroll', resetInactivityTimer);
    window.addEventListener('touchstart', resetInactivityTimer);
  };

  const removeActivityListeners = () => {
    window.removeEventListener('mousemove', resetInactivityTimer);
    window.removeEventListener('keypress', resetInactivityTimer);
    window.removeEventListener('click', resetInactivityTimer);
    window.removeEventListener('scroll', resetInactivityTimer);
    window.removeEventListener('touchstart', resetInactivityTimer);
  };

  const resetInactivityTimer = () => {
    if (!authState.isAuthenticated) return;

    // Clear existing timer
    if (inactivityTimer) {
      clearTimeout(inactivityTimer);
    }

    // Update last activity time
    updateLastActivityTime();

    // Set new timer
    const timer = setTimeout(() => {
      console.log('User inactive for too long, logging out');
      logout();
    }, INACTIVITY_TIMEOUT);

    setInactivityTimer(timer);
  };

  const updateLastActivityTime = () => {
    if (authState.isAuthenticated) {
      localStorage.setItem(STORAGE_KEYS.LAST_ACTIVITY, Date.now().toString());
    }
  };

  const login = (admin: AdminUser, token: string, rememberMe = false) => {
    const storage = rememberMe ? localStorage : sessionStorage;
    
    // Store auth data
    storage.setItem(STORAGE_KEYS.TOKEN, token);
    storage.setItem(STORAGE_KEYS.ADMIN, JSON.stringify(admin));
    
    // Store username for remember me functionality
    if (rememberMe) {
      localStorage.setItem(STORAGE_KEYS.USERNAME, admin.username);
    } else {
      localStorage.removeItem(STORAGE_KEYS.USERNAME);
    }

    // Update last activity time
    updateLastActivityTime();

    // Update state
    setAuthState({
      isAuthenticated: true,
      admin,
      token,
      isLoading: false
    });

    // Start inactivity timer
    resetInactivityTimer();
  };

  const logout = () => {
    clearAuthStorage();
    if (inactivityTimer) {
      clearTimeout(inactivityTimer);
    }
    setAuthState({
      isAuthenticated: false,
      admin: null,
      token: null,
      isLoading: false
    });
  };

  const updateAdmin = (updates: Partial<AdminUser>) => {
    if (!authState.admin) return;

    const updatedAdmin = { ...authState.admin, ...updates };
    
    // Update storage
    const storage = localStorage.getItem(STORAGE_KEYS.ADMIN) ? localStorage : sessionStorage;
    storage.setItem(STORAGE_KEYS.ADMIN, JSON.stringify(updatedAdmin));
    
    // Update state
    setAuthState(prev => ({
      ...prev,
      admin: updatedAdmin
    }));
  };

  const hasPermission = (permission: string): boolean => {
    if (!authState.admin) return false;
    return authState.admin.permissions.includes(permission) || 
           authState.admin.role === 'super_admin';
  };

  const hasRole = (role: string | string[]): boolean => {
    if (!authState.admin) return false;
    const roles = Array.isArray(role) ? role : [role];
    return roles.includes(authState.admin.role);
  };

  const refreshToken = async (): Promise<boolean> => {
    if (!authState.token) return false;

    try {
      const response = await fetch('http://localhost:5000/api/admin/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authState.token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.token && data.admin) {
          const storage = localStorage.getItem(STORAGE_KEYS.TOKEN) ? localStorage : sessionStorage;
          storage.setItem(STORAGE_KEYS.TOKEN, data.token);
          storage.setItem(STORAGE_KEYS.ADMIN, JSON.stringify(data.admin));
          
          setAuthState(prev => ({
            ...prev,
            token: data.token,
            admin: data.admin
          }));

          // Reset inactivity timer on token refresh
          resetInactivityTimer();
          return true;
        }
      }
      
      // Refresh failed, logout user
      logout();
      return false;
    } catch (error) {
      console.error('Token refresh error:', error);
      logout();
      return false;
    }
  };

  const clearAuthStorage = () => {
    localStorage.removeItem(STORAGE_KEYS.TOKEN);
    localStorage.removeItem(STORAGE_KEYS.ADMIN);
    localStorage.removeItem(STORAGE_KEYS.LAST_ACTIVITY);
    sessionStorage.removeItem(STORAGE_KEYS.TOKEN);
    sessionStorage.removeItem(STORAGE_KEYS.ADMIN);
  };

  const contextValue: AuthContextType = {
    ...authState,
    login,
    logout,
    updateAdmin,
    hasPermission,
    hasRole,
    refreshToken,
    resetInactivityTimer
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use auth context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Export types for use in other components
export type { AdminUser, AuthState, AuthContextType };