// src/lib/api.ts
import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';

// ✅ Storage helper for web (uses localStorage)
const storage = {
  getItem(key: string): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(key);
    }
    return null;
  },
  
  setItem(key: string, value: string): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(key, value);
    }
  },
  
  removeItem(key: string): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(key);
    }
  }
};

const TOKEN_KEY = 'userToken';

// ✅ SMART API Configuration - Auto-detects environment
interface ApiConfig {
  development: {
    web: string;
    mobile: string; // For React Native / mobile testing
  };
  production: {
    web: string;
    mobile: string;
  };
}

const API_CONFIG: ApiConfig = {
  development: {
    web: 'http://localhost:5002/api',        // ✅ For web browsers (Next.js)
    mobile: 'http://172.28.46.7:5002/api',   // ✅ For mobile devices on same network
  },
  production: {
    web: 'https://vtu-application.onrender.com/api',
    mobile: 'https://vtu-application.onrender.com/api',
  }
};

const isDevelopment = true; // Set to true for local development

// ✅ Smart detection: Use 'mobile' URL if accessing from mobile device
const getBaseURL = (): string => {
  const env = isDevelopment ? 'development' : 'production';
  
  // Check if running in browser
  if (typeof window !== 'undefined') {
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
    
    // Check if accessing via IP address (mobile testing)
    const isAccessingViaIP = window.location.hostname.match(/^\d+\.\d+\.\d+\.\d+$/);
    
    if (isMobile || isAccessingViaIP) {
      console.log('📱 Mobile device or IP access detected - using mobile API URL');
      return API_CONFIG[env].mobile;
    }
  }
  
  console.log('💻 Web browser detected - using web API URL');
  return API_CONFIG[env].web;
};

export const API_BASE_URL = getBaseURL();

// ✅ EasyAccess API Configuration
export const EASYACCESS_CONFIG = {
  baseURL: 'https://easyaccess.com.ng/api',
  authToken: '3e17bad4c941d642424fc7a60320b622',
  endpoints: {
    balance: '/wallet_balance.php',
    waec: '/waec_v2.php',
    neco: '/neco_v2.php',
    nabteb: '/nabteb_v2.php',
    nbais: '/nbais_v2.php',
    getPlans: '/get_plans.php',
    queryTransaction: '/query_transaction.php',
  }
};

console.log('╔════════════════════════════════════════╗');
console.log('║       API Configuration Report         ║');
console.log('╠════════════════════════════════════════╣');
console.log('║ Club Konnect Base URL:', API_BASE_URL);
console.log('║ EasyAccess Base URL:', EASYACCESS_CONFIG.baseURL);
console.log('║ Environment:', isDevelopment ? 'Development' : 'Production');
console.log('║ Platform:', typeof window !== 'undefined' && window.location.hostname.match(/^\d+\.\d+\.\d+\.\d+$/) ? 'Mobile (IP)' : 'Web (localhost)');
console.log('║ Token Key:', TOKEN_KEY);
console.log('╚════════════════════════════════════════╝');

// ✅ Create Club Konnect axios instance
export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  }
});

// ✅ Create EasyAccess axios instance
export const easyAccessClient: AxiosInstance = axios.create({
  baseURL: EASYACCESS_CONFIG.baseURL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'AuthorizationToken': EASYACCESS_CONFIG.authToken,
    'cache-control': 'no-cache',
  }
});

// ✅ Club Konnect Request interceptor
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    try {
      const token = storage.getItem(TOKEN_KEY);
      
      if (isDevelopment) {
        console.log(`🚀 [Club Konnect] ${config.method?.toUpperCase()} ${config.url}`);
        console.log(`🔑 Token status: ${token ? 'EXISTS' : 'MISSING'}`);
        console.log(`📦 Request data:`, config.data);
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

// ✅ EasyAccess Request interceptor
easyAccessClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    if (isDevelopment) {
      console.log(`🚀 [EasyAccess] ${config.method?.toUpperCase()} ${config.url}`);
      console.log(`📦 Request data:`, config.data);
    }
    return config;
  },
  (error) => {
    console.error('❌ [EasyAccess] Request Error:', error);
    return Promise.reject(error);
  }
);

// ✅ Club Konnect Response interceptor
apiClient.interceptors.response.use(
  (response) => {
    if (isDevelopment) {
      console.log(`✅ [Club Konnect] ${response.config.method?.toUpperCase()} ${response.config.url} - ${response.status}`);
      console.log(`📥 Response data:`, response.data);
    }
    return response;
  },
  async (error) => {
    console.error('╔════════════════════════════════════════╗');
    console.error('║   CLUB KONNECT API ERROR DETAILS      ║');
    console.error('╠════════════════════════════════════════╣');
    console.error('║ URL:', error.config?.url || 'unknown');
    console.error('║ Method:', error.config?.method?.toUpperCase() || 'unknown');
    console.error('║ Base URL:', error.config?.baseURL || 'unknown');
    console.error('║ Full URL:', error.config?.baseURL ? `${error.config.baseURL}${error.config.url}` : 'unknown');
    console.error('║ Status:', error.response?.status || 'no response');
    console.error('║ Status Text:', error.response?.statusText || 'none');
    console.error('║ Error Code:', error.code || 'none');
    console.error('║ Error Message:', error.message || 'none');
    console.error('╠════════════════════════════════════════╣');
    console.error('║ Request Data Sent:');
    console.error(error.config?.data || 'No request data');
    console.error('╠════════════════════════════════════════╣');
    console.error('║ Response Data Received:');
    console.error(error.response?.data || 'No response data');
    console.error('╚════════════════════════════════════════╝');
    
    if (error.response?.status === 401) {
      console.log('🔒 401 Unauthorized - Token expired or invalid');
      console.log('🗑️ Clearing token from storage');
      storage.removeItem(TOKEN_KEY);
      
      if (typeof window !== 'undefined') {
        const currentPath = window.location.pathname;
        
        if (!currentPath.includes('/login') && !currentPath.includes('/register')) {
          console.log('🔄 Redirecting to login page...');
          window.location.href = '/login';
        }
      }
    }
    
    const enhancedError: any = new Error(
      error.response?.data?.message || error.message || 'Network error'
    );
    
    enhancedError.status = error.response?.status;
    enhancedError.data = error.response?.data;
    enhancedError.config = {
      url: error.config?.url,
      method: error.config?.method,
      baseURL: error.config?.baseURL,
    };
    
    if (error.code === 'ERR_NETWORK') {
      enhancedError.message = 'Cannot connect to server. Please check if backend is running on ' + API_BASE_URL;
      console.error('🔴 NETWORK ERROR: Backend not reachable!');
    } else if (error.code === 'ECONNABORTED') {
      enhancedError.message = 'Request timeout. Server took too long to respond.';
      console.error('⏱️ TIMEOUT ERROR: Request took too long!');
    } else if (!error.response) {
      enhancedError.message = 'Network error. Please check your internet connection.';
      console.error('🌐 CONNECTION ERROR: No response from server!');
    }
    
    return Promise.reject(enhancedError);
  }
);

// ✅ EasyAccess Response interceptor
easyAccessClient.interceptors.response.use(
  (response) => {
    if (isDevelopment) {
      console.log(`✅ [EasyAccess] ${response.config.method?.toUpperCase()} ${response.config.url} - ${response.status}`);
      console.log(`📥 Response data:`, response.data);
    }
    return response;
  },
  async (error) => {
    console.error('╔════════════════════════════════════════╗');
    console.error('║    EASYACCESS API ERROR DETAILS       ║');
    console.error('╠════════════════════════════════════════╣');
    console.error('║ URL:', error.config?.url || 'unknown');
    console.error('║ Method:', error.config?.method?.toUpperCase() || 'unknown');
    console.error('║ Status:', error.response?.status || 'no response');
    console.error('║ Error Message:', error.message || 'none');
    console.error('╠════════════════════════════════════════╣');
    console.error('║ Response Data:');
    console.error(error.response?.data || 'No response data');
    console.error('╚════════════════════════════════════════╝');
    
    const enhancedError: any = new Error(
      error.response?.data?.message || error.message || 'EasyAccess API error'
    );
    
    enhancedError.status = error.response?.status;
    enhancedError.data = error.response?.data;
    
    return Promise.reject(enhancedError);
  }
);

export const getAuthToken = (): string | null => {
  try {
    const token = storage.getItem(TOKEN_KEY);
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

export const easyAccessAPI = {
  async checkBalance() {
    try {
      const response = await easyAccessClient.get(EASYACCESS_CONFIG.endpoints.balance);
      return response.data;
    } catch (error) {
      console.error('❌ EasyAccess Balance Check Error:', error);
      throw error;
    }
  },

  async getPlans(productType: 'waec' | 'neco' | 'nabteb' | 'nbais') {
    try {
      const response = await easyAccessClient.get(
        `${EASYACCESS_CONFIG.endpoints.getPlans}?product_type=${productType}`
      );
      return response.data;
    } catch (error) {
      console.error(`❌ EasyAccess Get ${productType.toUpperCase()} Plans Error:`, error);
      throw error;
    }
  },

  async purchasePin(params: {
    type: 'waec' | 'neco' | 'nabteb' | 'nbais';
    quantity: number;
    maxAmountPayable?: number;
  }) {
    try {
      const endpoint = EASYACCESS_CONFIG.endpoints[params.type];
      
      const postData: any = {
        no_of_pins: params.quantity,
      };

      if (params.maxAmountPayable) {
        postData.max_amount_payable = params.maxAmountPayable.toString();
      }

      const response = await easyAccessClient.post(endpoint, postData);
      return response.data;
    } catch (error) {
      console.error(`❌ EasyAccess Purchase ${params.type.toUpperCase()} Error:`, error);
      throw error;
    }
  },

  async queryTransaction(reference: string) {
    try {
      const response = await easyAccessClient.post(
        EASYACCESS_CONFIG.endpoints.queryTransaction,
        { reference }
      );
      return response.data;
    } catch (error) {
      console.error('❌ EasyAccess Query Transaction Error:', error);
      throw error;
    }
  }
};

export interface LoginResponse {
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
    phone: string;
    username: string;
  };
}

export interface RegisterResponse {
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
    phone: string;
    username: string;
  };
}

export interface ApiError {
  message: string;
  status?: number;
  originalError?: any;
}

export interface EasyAccessBalanceResponse {
  success: string;
  message: string;
  email?: string;
  balance?: string;
  funding_acctno1?: string;
  funding_bank1?: string;
  checked_date?: string;
  reference_no?: string;
  status?: string;
}

export interface EasyAccessPinResponse {
  success: string;
  message: string;
  pin?: string;
  pin2?: string;
  pin3?: string;
  pin4?: string;
  pin5?: string;
  pin6?: string;
  pin7?: string;
  pin8?: string;
  pin9?: string;
  pin10?: string;
  amount?: number;
  transaction_date?: string;
  reference_no?: string;
  status?: string;
  auto_refund_status?: string;
}

export { storage, TOKEN_KEY };
export default apiClient;