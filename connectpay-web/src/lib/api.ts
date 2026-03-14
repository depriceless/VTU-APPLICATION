// src/lib/api.ts - Cookie-based auth version
import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { logger } from './logger';

// ── Storage helper (kept for non-auth data e.g. rememberedEmail) ──────────────
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

export const TOKEN_KEY = 'userToken';

// ── Pending requests map for deduplication ────────────────────────────────────
const pendingRequests = new Map<string, AbortController>();

// ── API Configuration ─────────────────────────────────────────────────────────
const API_CONFIG = {
  development: {
    web:    'http://localhost:5000/api',
    mobile: 'http://10.196.79.7:5000/api',
  },
  production: {
    web:    'https://vtu-application.onrender.com/api',
    mobile: 'https://vtu-application.onrender.com/api',
  }
};

const isDevelopment = process.env.NODE_ENV === 'development';

const getBaseURL = (): string => {
  const env = isDevelopment ? 'development' : 'production';
  return API_CONFIG[env].web;
};

export const API_BASE_URL = getBaseURL();

// ── CSRF token management ─────────────────────────────────────────────────────
// Fetches a CSRF token from the server and caches it in memory.
// The token is refreshed automatically on 403 responses (token rotated or expired).
// Only applied to state-changing methods — GET/HEAD/OPTIONS are safe and exempt.

const CSRF_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
let csrfToken: string | null = null;
let csrfFetchPromise: Promise<string> | null = null;

async function fetchCsrfToken(): Promise<string> {
  // Deduplicate concurrent calls — only one fetch in flight at a time
  if (csrfFetchPromise) return csrfFetchPromise;

  csrfFetchPromise = axios
    .get<{ csrfToken: string }>(`${API_BASE_URL}/auth/csrf-token`, {
      withCredentials: true,
    })
    .then((res) => {
      csrfToken = res.data.csrfToken;
      csrfFetchPromise = null;
      return csrfToken;
    })
    .catch((err) => {
      csrfFetchPromise = null;
      throw err;
    });

  return csrfFetchPromise;
}

export async function getCsrfToken(): Promise<string> {
  if (csrfToken) return csrfToken;
  return fetchCsrfToken();
}

// Call this on app load (e.g. in your root layout or _app.tsx)
// so the token is ready before the first POST is made.
export function initCsrf(): void {
  if (typeof window !== 'undefined') {
    fetchCsrfToken().catch(() => {
      // Silent — will retry on first state-changing request
    });
  }
}

// ── Axios instance ────────────────────────────────────────────────────────────
export const apiClient: AxiosInstance = axios.create({
  baseURL:         API_BASE_URL,
  timeout:         30000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'Accept':       'application/json',
  },
});

// ── Request interceptor ───────────────────────────────────────────────────────
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const method = config.method?.toUpperCase() ?? 'GET';

    // Attach CSRF token to all state-changing requests
    if (CSRF_METHODS.has(method)) {
      try {
        const token = await getCsrfToken();
        config.headers['X-CSRF-Token'] = token;
      } catch {
        // If CSRF fetch fails, let the request proceed —
        // the server will return a 403 which triggers the retry below
      }
    }

    const requestKey = `${method}:${config.url}`;
    // Only deduplicate GET requests — never abort POST/PUT/DELETE
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

    // CSRF token expired or rotated — refresh and retry the request once
    if (
      error.response?.status === 403 &&
      error.response?.data?.message?.toLowerCase().includes('csrf') &&
      !error.config?._csrfRetried
    ) {
      csrfToken = null; // Invalidate cached token
      try {
        const newToken = await fetchCsrfToken();
        error.config._csrfRetried = true;
        error.config.headers['X-CSRF-Token'] = newToken;
        return apiClient(error.config);
      } catch {
        // CSRF refresh failed — fall through to normal error handling
      }
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
}

export interface RegisterResponse {
  user: {
    id:       string;
    name:     string;
    email:    string;
    phone:    string;
    username: string;
  };
}

export interface ApiError {
  message:        string;
  status?:        number;
  originalError?: any;
}

export default apiClient;