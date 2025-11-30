import React, { createContext, useState, useEffect } from 'react';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const AuthContext = createContext();

// API Configuration
const API_CONFIG = {
  BASE_URL: Platform.OS === 'web' 
    ? `${process.env.EXPO_PUBLIC_API_URL_WEB}/api`
    : `${process.env.EXPO_PUBLIC_API_URL}/api`,
  ENDPOINTS: {
    PROFILE: '/auth/profile',
    BALANCE: '/balance',
    TRANSACTIONS: '/transactions',
  }
};

// Storage helper that works on both mobile and web
const storage = {
  async getItem(key) {
    if (Platform.OS === 'web') {
      return localStorage.getItem(key);
    } else {
      return await SecureStore.getItemAsync(key);
    }
  },
  
  async setItem(key, value) {
    if (Platform.OS === 'web') {
      localStorage.setItem(key, value);
    } else {
      await SecureStore.setItemAsync(key, value);
    }
  },
  
  async removeItem(key) {
    if (Platform.OS === 'web') {
      localStorage.removeItem(key);
    } else {
      await SecureStore.deleteItemAsync(key);
    }
  }
};

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [balance, setBalance] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Load token when app starts
  useEffect(() => {
    loadToken();
  }, []);

  // Fetch user profile and balance when token is available
  useEffect(() => {
    if (token && !isLoggingOut) {
      console.log('🔄 Token detected, fetching user data...');
      // Add delay to ensure token is ready
      const timer = setTimeout(() => {
        fetchUserProfile();
        fetchBalance();
      }, 500); // Increased delay to 500ms
      
      return () => clearTimeout(timer);
    }
  }, [token, isLoggingOut]);

  const loadToken = async () => {
    try {
      const savedToken = await storage.getItem('userToken');
      if (savedToken) {
        setToken(savedToken);
        console.log('✅ Token loaded from storage');
      } else {
        console.log('ℹ️ No saved token found (user not logged in)');
      }
    } catch (error) {
      console.error('Error loading token:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserProfile = async () => {
    // STRONG validation - don't fetch if any of these conditions
    if (isLoggingOut || !token || token === 'undefined' || token === 'null' || token.length < 10) {
      console.log('🚫 Skipping profile fetch - invalid token state');
      return;
    }

    try {
      console.log('🔄 Fetching user profile...');

      const response = await fetch(
        `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.PROFILE}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('Profile fetch response status:', response.status);

      if (!response.ok) {
        if (response.status === 401) {
          console.log('❌ Token expired, logging out');
          await logout();
          return;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await response.json();
        console.log('Profile API Response:', data);

        if (data.success && data.user) {
          const userData = {
            id: data.user.id || data.user._id,
            name: data.user.name || data.user.username || 'User',
            email: data.user.email || '',
            phone: data.user.phone || '',
            username: data.user.username || '',
            dateJoined: data.user.createdAt || data.user.dateJoined || new Date().toISOString(),
            isPinSetup: data.user.isPinSetup || false,
            isEmailVerified: data.user.isEmailVerified || false,
            isPhoneVerified: data.user.isPhoneVerified || false,
            lastLogin: data.user.lastLogin,
          };

          setUser(userData);
          console.log('✅ User profile loaded:', userData.name);
        } else {
          console.log('❌ Profile fetch unsuccessful:', data.message);
        }
      } else {
        const text = await response.text();
        console.log('❌ Non-JSON response:', text);
        throw new Error('Invalid response format');
      }
    } catch (error) {
      console.log('❌ Error fetching profile:', error);
    }
  };

  const fetchBalance = async () => {
    // STRONG validation
    if (isLoggingOut || !token || token === 'undefined' || token === 'null' || token.length < 10) {
      console.log('🚫 Skipping balance fetch - invalid token state');
      return;
    }

    try {
      console.log('🔄 Fetching user balance...');

      const response = await fetch(
        `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.BALANCE}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('Balance fetch response status:', response.status);

      if (!response.ok) {
        if (response.status === 401) {
          console.log('❌ Token expired, logging out');
          await logout();
          return;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Balance API Response:', data);

      if (data.success && data.balance) {
        setBalance(data.balance);
        console.log('✅ Balance loaded:', data.balance.amount);
      } else {
        console.log('❌ Balance fetch unsuccessful:', data.message);
        // Set default balance
        setBalance({
          amount: '0.00',
          currency: 'USD',
          lastUpdated: new Date().toISOString()
        });
      }
    } catch (error) {
      console.log('❌ Error fetching balance:', error);
      // Set default balance on error
      setBalance({
        amount: '0.00',
        currency: 'USD',
        lastUpdated: new Date().toISOString()
      });
    }
  };

  const updateProfile = async (updatedData) => {
    try {
      if (!token) {
        console.log('ℹ️ Cannot update profile: No authentication token');
        return false;
      }

      const response = await fetch(
        `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.PROFILE}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(updatedData)
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        const userData = {
          ...user,
          name: data.user.name || updatedData.name,
          email: data.user.email || updatedData.email,
          phone: data.user.phone || updatedData.phone,
          username: data.user.username || updatedData.username,
        };
        
        setUser(userData);
        console.log('✅ Profile updated successfully');
        return true;
      } else {
        console.log('❌ Profile update failed:', data.message);
        return false;
      }
    } catch (error) {
      console.log('❌ Error updating profile:', error);
      return false;
    }
  };

  const login = async (newToken) => {
    try {
      // Validate the token first
      if (!newToken || typeof newToken !== 'string' || newToken.length < 10) {
        console.error('❌ Invalid token received');
        return;
      }
      
      console.log('🔐 Starting login process...');
      setIsLoggingOut(false);
      
      // Save to storage first
      await storage.setItem('userToken', newToken);
      console.log('✅ Token saved to storage');
      
      // Then set token to state
      setToken(newToken);
      console.log('✅ Token set in state');
      
    } catch (error) {
      console.error('❌ Login error:', error);
    }
  };

  const logout = async () => {
    try {
      setIsLoggingOut(true);
      
      // Clear state first to prevent any API calls
      setToken(null);
      setUser(null);
      setBalance(null);
      
      // Then clear storage
      await storage.removeItem('userToken');
      await storage.removeItem('user');
      await storage.removeItem('balance');
      
      console.log('✅ Logout successful');
    } catch (error) {
      console.error('Logout error:', error);
      // Ensure state is cleared even if storage clear fails
      setToken(null);
      setUser(null);
      setBalance(null);
    } finally {
      setIsLoggingOut(false);
    }
  };

  const refreshProfile = () => {
    if (token && !isLoggingOut) {
      fetchUserProfile();
    }
  };

  const refreshBalance = () => {
    if (token && !isLoggingOut) {
      fetchBalance();
    }
  };

  const refreshAll = () => {
    if (token && !isLoggingOut) {
      fetchUserProfile();
      fetchBalance();
    }
  };

  // Helper functions to get data safely
  const getUserName = () => {
    if (!user) return 'User';
    return user.name || user.username || 'User';
  };

  const getUserEmail = () => {
    return user?.email || '';
  };

  const getBalance = () => {
    if (!balance) return '0.00';
    return balance.amount || '0.00';
  };

  const getBalanceWithCurrency = () => {
    if (!balance) return '$0.00';
    const currency = balance.currency === 'USD' ? '$' : balance.currency || '$';
    return `${currency}${balance.amount || '0.00'}`;
  };

  const value = {
    user,
    balance,
    token,
    login,
    logout,
    loading,
    isLoggingOut,
    updateProfile,
    refreshProfile,
    refreshBalance,
    refreshAll,
    // Helper properties for easy access
    userName: getUserName(),
    userEmail: getUserEmail(),
    userBalance: getBalance(),
    userBalanceFormatted: getBalanceWithCurrency(),
    isLoggedIn: !!token,
    isEmailVerified: user?.isEmailVerified || false,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export { AuthContext, AuthProvider };