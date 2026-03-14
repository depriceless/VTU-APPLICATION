// utils/logger.js - Secure Backend Logger

const isDevelopment = process.env.NODE_ENV === 'development';

// Sensitive fields to NEVER log
const SENSITIVE_FIELDS = [
  'password', 'token', 'authorization', 'email', 'phone',
  'accountnumber', 'balance', 'cvv', 'pin', 'otp', 'userid'
];

// Sanitize data before logging
function sanitize(data) {
  if (!data) return data;

  if (typeof data === 'string') return data;

  if (data instanceof Error) {
    return {
      message: data.message,
      ...(data.code   && { code:   data.code }),
      ...(data.status && { status: data.status }),
    };
  }

  if (Array.isArray(data)) {
    return data.map(item => sanitize(item));
  }

  if (typeof data === 'object') {
    const sanitized = {};
    for (const [key, value] of Object.entries(data)) {
      const isSensitive = SENSITIVE_FIELDS.some(field =>
        key.toLowerCase().includes(field.toLowerCase())
      );

      if (isSensitive) {
        sanitized[key] = '***REDACTED***';
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = sanitize(value);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }

  return data;
}

// Extract a readable message from either a string or an Error object.
// Callers use both forms:
//   logger.error('msg', error)         → error is an Error object
//   logger.error('msg', error.message) → error is already a string
function resolveError(error) {
  if (!error) return null;
  if (typeof error === 'string') return { message: error };
  if (error instanceof Error) {
    return {
      message: error.message,
      ...(error.code   && { code:   error.code }),
      ...(error.status && { status: error.status }),
    };
  }
  // Plain object passed — sanitize it
  return sanitize(error);
}

const logger = {
  info: (message, meta) => {
    if (isDevelopment) {
      meta !== undefined
        ? console.log(`ℹ️ ${message}`, sanitize(meta))
        : console.log(`ℹ️ ${message}`);
    }
  },

  success: (message, meta) => {
    if (isDevelopment) {
      meta !== undefined
        ? console.log(`✅ ${message}`, sanitize(meta))
        : console.log(`✅ ${message}`);
    }
  },

  // Always logs (production included) — sanitized
  error: (message, error) => {
    const errorInfo = resolveError(error);
    errorInfo
      ? console.error(`❌ ${message}`, errorInfo)
      : console.error(`❌ ${message}`);
  },

  warn: (message, meta) => {
    if (isDevelopment) {
      meta !== undefined
        ? console.warn(`⚠️ ${message}`, sanitize(meta))
        : console.warn(`⚠️ ${message}`);
    }
  },

  sensitive: () => {
    if (isDevelopment) {
      console.warn('⚠️ Attempted to log sensitive data - BLOCKED');
    }
  },
};

module.exports = { logger, sanitize };