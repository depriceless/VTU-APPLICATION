// src/config/api.ts
import axios, { AxiosInstance } from 'axios';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

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

const TOKEN_KEY = 'userToken';

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
    android: 'http://172.17.23.7:5002/api',
    ios: 'http://172.17.23.7:5002/api',
  },
  production: {
    android: 'https://vtu-application.onrender.com/api',
    ios: 'https://vtu-application.onrender.com/api',
  }
};

const isDevelopment = __DEV__;

const getBaseURL = (): string => {
  const env = isDevelopment ? 'development' : 'production';
  return API_CONFIG[env][Platform.OS as 'android' | 'ios'];
};

export const API_BASE_URL = getBaseURL();

console.log('=== API Configuration ===');
console.log('📍 Base URL:', API_BASE_URL);
console.log('🔧 Environment:', isDevelopment ? 'Development' : 'Production');
console.log('📱 Platform:', Platform.OS);
console.log('🔑 Token Key:', TOKEN_KEY);
console.log('========================');

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  }
});

apiClient.interceptors.request.use(
  async (config) => {
    try {
      const token = await storage.getItem(TOKEN_KEY);
      
      if (isDevelopment) {
        console.log(`🚀 ${config.method?.toUpperCase()} ${config.url}`);
        console.log(`🔑 Token status: ${token ? 'EXISTS' : 'MISSING'}`);
      }
      
      if (token) {
        if (!config.headers) {
          config.headers = {} as any;
        }
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('❌ Error getting token:', error);
    }
    return config;
  },
  (error) => {
    console.error('❌ Request Error:', error);
    return Promise.reject(error);
  }
);

apiClient.interceptors.response.use(
  (response) => {
    if (isDevelopment) {
      console.log(`✅ ${response.config.method?.toUpperCase()} ${response.config.url} - ${response.status}`);
    }
    return response;
  },
  async (error) => {
    if (error.response?.status === 401) {
      console.log('⚠️ Unauthorized - Clearing token');
      await storage.removeItem(TOKEN_KEY);
    }
    
    const errorDetails = {
      url: error.config?.url,
      method: error.config?.method?.toUpperCase(),
      status: error.response?.status,
      message: error.response?.data?.message || error.message,
      data: error.response?.data,
    };
    
    console.error('❌ API Error:', errorDetails);
    
    const userError = {
      message: error.response?.data?.message || 'Network error. Please try again.',
      status: error.response?.status,
      originalError: error,
    };
    
    return Promise.reject(userError);
  }
);

// Helper function to get auth token (for non-axios requests)
export const getAuthToken = async (): Promise<string | null> => {
  try {
    const token = await storage.getItem(TOKEN_KEY);
    if (token) {
      console.log('🔑 Token retrieved successfully');
      return token;
    } else {
      console.warn('⚠️ No token found');
      return null;
    }
  } catch (error) {
    console.error('❌ Error retrieving token:', error);
    return null;
  }
};

// Helper function for fetch-based API calls
export const makeFetchRequest = async (
  endpoint: string,
  options: RequestInit = {}
): Promise<any> => {
  try {
    const token = await getAuthToken();
    const url = `${API_BASE_URL}${endpoint}`;
    
    console.log(`📡 Fetch Request: ${options.method || 'GET'} ${url}`);
    console.log(`🔑 Token: ${token ? 'EXISTS' : 'MISSING'}`);
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...options.headers,
      },
    });
    
    console.log(`📥 Response: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      let errorData;
      try {
        const text = await response.text();
        errorData = text ? JSON.parse(text) : {};
      } catch {
        errorData = { message: `HTTP ${response.status}: ${response.statusText}` };
      }
      
      throw new Error(errorData.message || `HTTP ${response.status}`);
    }
    
    const text = await response.text();
    return text ? JSON.parse(text) : {};
    
  } catch (error: any) {
    console.error('❌ Fetch Error:', error.message);
    throw error;
  }
};

export { storage, TOKEN_KEY };
export default apiClient;