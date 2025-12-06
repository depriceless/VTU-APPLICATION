// src/config/api.ts
import axios, { AxiosInstance } from 'axios';
import * as SecureStore from 'expo-secure-store'; // ✅ FIXED: Use SecureStore
import { Platform } from 'react-native';

// ✅ ADDED: Unified storage helper
const storage = {
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
      return localStorage.getItem(key);
    } else {
      return await SecureStore.getItemAsync(key);
    }
  },
  
  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') {
      localStorage.setItem(key, value);
    } else {
      await SecureStore.setItemAsync(key, value);
    }
  },
  
  async removeItem(key: string): Promise<void> {
    if (Platform.OS === 'web') {
      localStorage.removeItem(key);
    } else {
      await SecureStore.deleteItemAsync(key);
    }
  }
};

// ✅ FIXED: Use consistent key name
const TOKEN_KEY = 'userToken';

// API Configuration
interface ApiConfig {
  development: {
    android: string;
    ios: string;
  };
  production: {
    android: string;
    ios: string;
  };
}

const API_CONFIG: ApiConfig = {
  development: {
    // For Physical Device on same network
    android: 'http://172.17.23.7:5002/api',
    ios: 'http://172.17.23.7:5002/api',
    
    // Alternative for emulators (uncomment if needed)
    // android: 'http://10.0.2.2:5002/api',  // Android Emulator
    // ios: 'http://localhost:5002/api',     // iOS Simulator
  },
  production: {
    // Same URL for both platforms in production
    android: 'https://vtu-application.onrender.com/api',
    ios: 'https://vtu-application.onrender.com/api',
  }
};

// Determine environment
const isDevelopment = __DEV__;

// Get base URL
const getBaseURL = (): string => {
  const env = isDevelopment ? 'development' : 'production';
  return API_CONFIG[env][Platform.OS as 'android' | 'ios'];
};

export const API_BASE_URL = getBaseURL();

// Enhanced logging
console.log('=== API Configuration ===');
console.log('📍 Base URL:', API_BASE_URL);
console.log('🔧 Environment:', isDevelopment ? 'Development' : 'Production');
console.log('📱 Platform:', Platform.OS);
console.log('🔑 Token Key:', TOKEN_KEY);
console.log('========================');

// Create axios instance with enhanced config
export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  }
});

// Request interceptor
apiClient.interceptors.request.use(
  async (config) => {
    try {
      // ✅ FIXED: Use SecureStore with consistent key
      const token = await storage.getItem(TOKEN_KEY);
      
      // Debug logging
      if (isDevelopment) {
        console.log(`🚀 ${config.method?.toUpperCase()} ${config.url}`);
        console.log(`🔑 Token status: ${token ? 'EXISTS' : 'MISSING'}`);
        if (token) {
          console.log(`🔑 Token length: ${token.length}`);
          console.log(`🔑 Token preview: ${token.substring(0, 20)}...`);
        }
      }
      
      if (token) {
        // Ensure headers object exists
        if (!config.headers) {
          config.headers = {} as any;
        }
        config.headers.Authorization = `Bearer ${token}`;
        
        if (isDevelopment) {
          console.log(`✅ Token added to request headers`);
        }
      } else {
        console.warn(`⚠️ No token found in SecureStore (key: ${TOKEN_KEY})`);
      }
    } catch (error) {
      console.error('❌ Error getting token from SecureStore:', error);
    }
    return config;
  },
  (error) => {
    console.error('❌ Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor
apiClient.interceptors.response.use(
  (response) => {
    // Log success in development
    if (isDevelopment) {
      console.log(`✅ ${response.config.method?.toUpperCase()} ${response.config.url} - ${response.status}`);
    }
    return response;
  },
  async (error) => {
    // Handle 401 Unauthorized
    if (error.response?.status === 401) {
      console.log('⚠️ Unauthorized - Clearing token from SecureStore');
      await storage.removeItem(TOKEN_KEY);
      // TODO: Navigate to login screen or dispatch logout action
    }
    
    // Enhanced error logging
    const errorDetails = {
      url: error.config?.url,
      method: error.config?.method?.toUpperCase(),
      status: error.response?.status,
      message: error.response?.data?.message || error.message,
      data: error.response?.data,
    };
    
    console.error('❌ API Error:', errorDetails);
    
    // Return a user-friendly error
    const userError = {
      message: error.response?.data?.message || 'Network error. Please try again.',
      status: error.response?.status,
      originalError: error,
    };
    
    return Promise.reject(userError);
  }
);

// ✅ ADDED: Export storage helper for use in other files
export { storage, TOKEN_KEY };

export default apiClient;