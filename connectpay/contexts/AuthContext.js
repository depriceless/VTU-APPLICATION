// AuthContext.js - Fix the login function

import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../src/config/api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [balance, setBalance] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Load token and user data on app start
  useEffect(() => {
    loadStoredData();
  }, []);

  const loadStoredData = async () => {
    try {
      console.log('📂 Loading stored data...');
      const storedToken = await AsyncStorage.getItem('token');
      
      if (storedToken) {
        console.log('✅ Token found in storage');
        setToken(storedToken);
        
        // Set token in API client headers
        apiClient.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
        
        // Fetch user profile and balance
        await Promise.all([
          fetchUserProfile(storedToken),
          fetchBalance(storedToken)
        ]);
      } else {
        console.log('⚠️ No token found in storage');
      }
    } catch (error) {
      console.error('❌ Error loading stored data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUserProfile = async (authToken) => {
    try {
      console.log('👤 Fetching user profile...');
      const response = await apiClient.get('/auth/profile', {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      
      if (response.data?.success && response.data?.user) {
        console.log('✅ User profile loaded:', response.data.user.name);
        setUser(response.data.user);
      }
    } catch (error) {
      console.error('❌ Error fetching profile:', error.message);
    }
  };

  const fetchBalance = async (authToken) => {
    try {
      console.log('💰 Fetching balance...');
      const response = await apiClient.get('/wallet/balance', {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      
      if (response.data?.success) {
        const balanceValue = response.data.balance?.amount || 
                           response.data.balance || 
                           0;
        console.log('✅ Balance loaded:', balanceValue);
        setBalance(balanceValue);
      }
    } catch (error) {
      console.error('❌ Error fetching balance:', error.message);
    }
  };

  // FIXED LOGIN FUNCTION
  const login = async (authToken) => {
    try {
      console.log('🔐 Login function called with token');
      
      if (!authToken) {
        throw new Error('No token provided to login function');
      }

      // 1. Save token to AsyncStorage FIRST
      await AsyncStorage.setItem('token', authToken);
      console.log('💾 Token saved to AsyncStorage in login function');
      
      // 2. Verify it was saved
      const verifyToken = await AsyncStorage.getItem('token');
      if (!verifyToken) {
        throw new Error('Token verification failed after save');
      }
      console.log('✅ Token save verified in login function');
      
      // 3. Update state
      setToken(authToken);
      
      // 4. Set in API client headers
      apiClient.defaults.headers.common['Authorization'] = `Bearer ${authToken}`;
      console.log('✅ Token set in API client headers');
      
      // 5. Fetch user data
      await Promise.all([
        fetchUserProfile(authToken),
        fetchBalance(authToken)
      ]);
      
      console.log('✅ Login function completed successfully');
      return true;
    } catch (error) {
      console.error('❌ Login function error:', error);
      // Clean up on error
      await AsyncStorage.removeItem('token');
      setToken(null);
      setUser(null);
      setBalance(0);
      throw error;
    }
  };

  const logout = async () => {
    try {
      console.log('🚪 Logout initiated');
      setIsLoggingOut(true);
      
      // Clear storage
      await AsyncStorage.multiRemove(['token', 'user', 'balance']);
      console.log('🗑️ Storage cleared');
      
      // Clear API headers
      delete apiClient.defaults.headers.common['Authorization'];
      
      // Clear state
      setToken(null);
      setUser(null);
      setBalance(0);
      
      console.log('✅ Logout completed');
    } catch (error) {
      console.error('❌ Logout error:', error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  const refreshUserData = async () => {
    if (token) {
      await Promise.all([
        fetchUserProfile(token),
        fetchBalance(token)
      ]);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        balance,
        isLoading,
        isLoggingOut,
        login,
        logout,
        refreshUserData,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};