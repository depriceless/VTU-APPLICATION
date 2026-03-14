// utils/logger.ts or lib/logger.ts
// Safe logging utility that prevents sensitive data exposure
const isDevelopment = process.env.NODE_ENV === 'development';

// List of sensitive field names that should never be logged
const SENSITIVE_FIELDS = [
  'password',
  'token',
  'authorization',
  'emailOrPhone',
  'email',
  'phone',
  'accountNumber',
  'accountName',
  'cvv',
  'pin',
  'otp',
  'secret',
  'apiKey',
  'privateKey'
];

/**
 * Sanitize data by redacting sensitive fields
 */
function sanitizeData(data: any): any {
  if (!data) return data;
  
  // Handle Error objects
  if (data instanceof Error) {
    return {
      name: data.name,
      message: data.message,
      ...(data as any).code && { code: (data as any).code },
      ...(data as any).status && { status: (data as any).status },
      ...(data as any).response && { response: sanitizeData((data as any).response) }
    };
  }

  // Handle arrays
  if (Array.isArray(data)) {
    return data.map(item => sanitizeData(item));
  }
  
  // Handle objects
  if (typeof data === 'object') {
    const sanitized: any = {};
    
    for (const [key, value] of Object.entries(data)) {
      // Check if this field is sensitive
      const isSensitive = SENSITIVE_FIELDS.some(field => 
        key.toLowerCase().includes(field.toLowerCase())
      );
      
      if (isSensitive) {
        sanitized[key] = '***REDACTED***';
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = sanitizeData(value);
      } else {
        sanitized[key] = value;
      }
    }
    
    return sanitized;
  }
  
  return data;
}

/**
 * Safe logger that only logs in development and sanitizes sensitive data
 */
export const logger = {
  /**
   * General purpose logging (only in development)
   */
  log: (...args: any[]) => {
    if (isDevelopment) {
      console.log(...args);
    }
  },

  /**
   * Error logging (always enabled but sanitized)
   */
  error: (...args: any[]) => {
    const sanitized = args.map(arg => sanitizeData(arg));
    console.warn('❌ [ERROR]', ...sanitized); // Using warn to avoid Next.js overlay
  },

  /**
   * Warning logging (only in development)
   */
  warn: (...args: any[]) => {
    if (isDevelopment) {
      console.warn('⚠️ [WARN]', ...args);
    }
  },

  /**
   * API request logging (sanitized)
   */
  apiRequest: (method: string, url: string, data?: any) => {
    if (isDevelopment) {
      console.log(`🚀 [API] ${method} ${url}`);
      if (data) {
        console.log('📦 Request data:', sanitizeData(data));
      }
    }
  },

  /**
   * API response logging (sanitized, no full data)
   */
  apiResponse: (method: string, url: string, status: number) => {
    if (isDevelopment) {
      if (status >= 200 && status < 300) {
        console.log(`✅ [API] ${method} ${url} - ${status}`);
      } else {
        console.warn(`❌ [API] ${method} ${url} - ${status}`); // Use warn
      }
    }
  },

  /**
   * API error logging (sanitized)
   */
  apiError: (method: string, url: string, error: any) => {
    if (isDevelopment) {
      console.warn(`❌ [API] ${method} ${url}`, {
        message: error?.message || 'Unknown error',
        code: error?.code,
        status: error?.response?.status || error?.status
        // Note: Not logging full error response
      });
    }
  },

  /**
   * Authentication logging (heavily sanitized)
   */
  auth: (message: string, hasToken?: boolean) => {
    if (isDevelopment) {
      console.log(`🔐 [Auth] ${message}`, hasToken ? '(Token present)' : '(No token)');
    }
  },

  /**
   * NEVER log sensitive data - use this as a reminder
   */
  sensitive: (...args: any[]) => {
    if (isDevelopment) {
      console.warn('⚠️ Attempted to log sensitive data - blocked for security');
    }
  },

  /**
   * Production-safe info logging
   */
  info: (message: string) => {
    if (isDevelopment) {
      console.log(`ℹ️ ${message}`);
    }
  },

  /**
   * Success logging
   */
  success: (message: string) => {
    if (isDevelopment) {
      console.log(`✅ ${message}`);
    }
  },

  /**
   * Debug logging - shows full unsanitized details (use only for debugging)
   */
  debug: (...args: any[]) => {
    if (isDevelopment) {
      console.log('🐛 [DEBUG]:', ...args);
    }
  },

  /**
   * Debug errors - shows full unsanitized error for debugging
   */
  debugError: (message: string, error: any) => {
    if (isDevelopment) {
      console.groupCollapsed('🐛 [DEBUG ERROR]:', message);
      console.warn('Full Error:', error);
      console.warn('Error Message:', error?.message);
      console.warn('Response Status:', error?.response?.status);
      console.warn('Response Data:', error?.response?.data);
      console.warn('Response Headers:', error?.response?.headers);
      console.warn('Request Config:', error?.config);
      console.groupEnd();
    }
  },
};

// Export sanitizeData for use in other modules if needed
export { sanitizeData };