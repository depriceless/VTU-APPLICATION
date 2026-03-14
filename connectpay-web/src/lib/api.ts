// src/lib/api.ts - Header-based auth version (cross-domain compatible)
import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { logger } from './logger';

// ── Storage helper ────────────────────────────────────────────────────────────
export const storage = {
  getItem(key: string): string | null {
    if (typeof window !== 'undefined') return localStorage.getItem(key);
    return null;
  },
  setItem(key: string, value: string): void {
    if (typeof window !== 'undefined') localStorage.setItem(key, value);
  },
  removeItem(key: string): void {
    if (typeof window !== 'undefined') localStorage.removeItem(key);
  }
};

export const TOKEN_KEY = 'authToken';

// ── Token helpers ─────────────────────────────────────────────────────────────
export function getToken(): string | null {
  return storage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  storage.setItem(TOKEN_KEY, token);
}

export function removeToken(): void {
  storage.removeItem(TOKEN_KEY);
}

// ── CSRF (disabled for cross-domain — returns dummy value) ────────────────────
export async function getCsrfToken(): Promise<string> {
  return 'disabled';
}

export function initCsrf(): void {
  // No-op — CSRF disabled for cross-domain production
}

// ── API Configuration ─────────────────────────────────────────────────────────
const API_CONFIG = {
  development: 'http://localhost:5000/api',
  production:  'https://vtu-application.onrender.com/api',
};

const isDevelopment = process.env.NODE_ENV === 'development';
export const API_BASE_URL = isDevelopment ? API_CONFIG.development : API_CONFIG.production;

// ── Pending requests map for deduplication ────────────────────────────────────
const pendingRequests = new Map<string, AbortController>();

// ── Axios instance ────────────────────────────────────────────────────────────
export const apiClient: AxiosInstance = axios.create({
  baseURL:         API_BASE_URL,
  timeout:         30000,
  withCredentials: false,
  headers: {
    'Content-Type': 'application/json',
    'Accept':       'application/json',
  },
});

// ── Request interceptor ───────────────────────────────────────────────────────
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const method = config.method?.toUpperCase() ?? 'GET';

    // Attach JWT token to every request
    const token = getToken();
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }

    // Deduplicate GET requests only
    const requestKey = `${method}:${config.url}`;
    if (method === 'GET' && pendingRequests.has(requestKey)) {
      pendingRequests.get(requestKey)?.abort();
    }
    const controller = new AbortController();
    config.signal = controller.signal;
    pendingRequests.set(requestKey, controller);

    if (isDevelopment) {
      logger.apiRequest(method, config.url ?? 'unknown');
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response interceptor ──────────────────────────────────────────────────────
apiClient.interceptors.response.use(
  (response) => {
    const requestKey = `${response.config.method?.toUpperCase()}:${response.config.url}`;
    pendingRequests.delete(requestKey);

    if (isDevelopment) {
      logger.apiResponse(
        response.config.method?.toUpperCase() ?? 'GET',
        response.config.url ?? 'unknown',
        response.status
      );
    }

    return response;
  },
  async (error) => {
    if (error.config) {
      const requestKey = `${error.config.method?.toUpperCase()}:${error.config.url}`;
      pendingRequests.delete(requestKey);
    }

    if (isDevelopment) {
      logger.apiError(
        error.config?.method?.toUpperCase() ?? 'GET',
        error.config?.url ?? 'unknown',
        error
      );
    }

    const enhancedError: any = new Error(
      error.response?.data?.message || error.message || 'Network error'
    );
    enhancedError.status   = error.response?.status;
    enhancedError.data     = error.response?.data;
    enhancedError.response = error.response;
    enhancedError.code     = error.code;
    enhancedError.config   = {
      url:     error.config?.url,
      method:  error.config?.method,
      baseURL: error.config?.baseURL,
    };

    if (error.code === 'ERR_NETWORK')       enhancedError.message = 'Cannot connect to server';
    else if (error.code === 'ECONNABORTED') enhancedError.message = 'Request timeout';
    else if (!error.response)               enhancedError.message = 'Network error';

    return Promise.reject(enhancedError);
  }
);

// ── Interfaces ────────────────────────────────────────────────────────────────
export interface LoginResponse {
  user: {
    id:       string;
    name:     string;
    email:    string;
    phone:    string;
    username: string;
  };
  token: string;
}

export interface RegisterResponse {
  user: {
    id:       string;
    name:     string;
    email:    string;
    phone:    string;
    username: string;
  };
  token: string;
}

export interface ApiError {
  message:        string;
  status?:        number;
  originalError?: any;
}

export default apiClient;