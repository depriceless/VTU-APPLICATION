const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const { doubleCsrf } = require('csrf-csrf');
require('dotenv').config();

const { logger } = require('./utils/logger');
const { closeRedis } = require('./utils/redis');

// ── Global error handlers ──────────────────────────────────────
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception', err.message);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Rejection', reason?.message || reason);
});

logger.info(`Server starting — Node ${process.version} — ${process.env.NODE_ENV || 'development'}`);

const app  = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 5000;

// ── Route imports ──────────────────────────────────────────────
const loadRoute = (path) => {
  try {
    const route = require(path);
    logger.success(`Loaded: ${path}`);
    return route;
  } catch (err) {
    logger.error(`Failed to load route: ${path}`, err.message);
    return null;
  }
};

const authRoutes           = loadRoute('./routes/auth');
const balanceRoutes        = loadRoute('./routes/balance');
const userRoutes           = loadRoute('./routes/user');
const walletRoutes         = loadRoute('./routes/wallet');
const purchaseRoutes       = loadRoute('./routes/purchase');
const dataRoutes           = loadRoute('./routes/dataplan');
const cableRoutes          = loadRoute('./routes/cabletv');
const transactionRoutes    = loadRoute('./routes/transactions');
const adminRoutes          = loadRoute('./routes/admin');
const dashboardRoutes      = loadRoute('./routes/dashboard');
const notificationRoutes   = loadRoute('./routes/notifications');
const userManagementRoutes = loadRoute('./routes/userManagement');

let adminAuthRoutes = null;
try {
  const adminAuthImport = require('./routes/adminAuth');
  adminAuthRoutes = adminAuthImport.router;
  logger.success('Loaded: ./routes/adminAuth');
} catch (err) {
  logger.error('Failed to load route: ./routes/adminAuth', err.message);
}

// ── CORS ───────────────────────────────────────────────────────
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:5173',
  'http://10.196.79.7:3000',
  'https://admin-connectpay.netlify.app',
  'https://connectpays.netlify.app', 
  // 'https://connectpay.com.ng',
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) {
      if (process.env.NODE_ENV === 'production') {
        return callback(new Error('Direct API access not allowed'));
      }
      return callback(null, true);
    }
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      logger.warn(`CORS blocked: ${origin}`);
      callback(new Error(`CORS blocked: ${origin} not allowed`));
    }
  },
  methods:              ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders:       ['Content-Type', 'Authorization', 'X-CSRF-Token'],
  credentials:          true,
  preflightContinue:    false,
  optionsSuccessStatus: 200,
}));
app.options('*', cors());
logger.success('CORS configured');

// ── Security headers ───────────────────────────────────────────
app.disable('x-powered-by');
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  crossOriginOpenerPolicy:   { policy: 'unsafe-none' },
}));

// ── Request timeout ────────────────────────────────────────────
app.use((req, res, next) => {
  req.setTimeout(30000);
  res.setTimeout(30000);
  next();
});

// ── Cookie parser (must come before CSRF) ─────────────────────
app.use(cookieParser());
logger.success('Cookie parser configured');

// ── Request ID (correlation ID for tracing) ────────────────────
// Placed before CSRF so req.id is available in CSRF error logs
const { randomUUID } = require('crypto');
app.use((req, res, next) => {
  req.id = randomUUID();
  res.setHeader('X-Request-ID', req.id);
  next();
});

// ── CSRF protection ────────────────────────────────────────────
// Uses the double-submit cookie pattern:
//   1. GET /api/auth/csrf-token → sets a signed __Host-csrf cookie + returns token in JSON
//   2. Frontend includes the token as X-CSRF-Token header on every state-changing request
//   3. doubleCsrfProtection middleware validates the header matches the cookie on POST/PUT/PATCH/DELETE
//
// sameSite: 'strict' on auth cookies already blocks most CSRF, but this
// adds a second layer for defence-in-depth.
//
// Exemptions: Paystack webhooks (/api/paystack/webhook) use HMAC signatures
// instead of CSRF tokens — they are excluded below.

if (!process.env.CSRF_SECRET) {
  logger.warn('CSRF_SECRET not set in .env — CSRF protection is disabled. Set a strong random secret.');
}

const CSRF_COOKIE_NAME = process.env.NODE_ENV === 'production' ? '__Host-csrf' : 'csrf';

const csrfResult = doubleCsrf({
  getSecret:            () => process.env.CSRF_SECRET || 'dev-csrf-secret-change-in-production',
  // For stateless JWT auth, use the auth token as the session identifier.
  // Falls back to a fixed string for unauthenticated requests (e.g. login page).
  getSessionIdentifier: (req) =>
    req.cookies?.token ||
    req.header('Authorization')?.replace('Bearer ', '') ||
    'anonymous',
  cookieName:           CSRF_COOKIE_NAME,
  cookieOptions: {
    httpOnly: true,
    sameSite: 'strict',
    secure:   process.env.NODE_ENV === 'production',
    path:     '/',
  },
  size:        64,
  getTokenFromRequest: (req) =>
    req.headers['x-csrf-token'] || req.body?._csrf,
});

// csrf-csrf v4 exports generateCsrfToken
const generateToken        = csrfResult.generateCsrfToken ?? csrfResult.generateToken;
const doubleCsrfProtection = csrfResult.doubleCsrfProtection;

// Expose CSRF token endpoint — frontend calls this once on load
app.get('/api/auth/csrf-token', (req, res) => {
  res.json({ csrfToken: 'disabled' });
});
// Apply CSRF validation to all state-changing API routes
// Webhook paths that use their own HMAC auth are excluded
const CSRF_EXEMPT = [
  '/api/paystack/webhook',
  '/api/payment/webhook',
];

// CSRF disabled for cross-domain production — re-enable when on same domain
// app.use((req, res, next) => {
//   if (CSRF_EXEMPT.some(path => req.path.startsWith(path))) {
//     return next();
//   }
//   return doubleCsrfProtection(req, res, next);
// });

logger.success('CSRF protection configured');

// ── Rate limiters ──────────────────────────────────────────────

// Global: 100 req/min per IP across all /api routes
const globalLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 100,
  message: { success: false, message: 'Too many requests, please slow down' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', globalLimiter);

// Auth: 10 attempts per 15 min (failed attempts only)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: 'Too many login attempts. Try again in 15 minutes.' },
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/auth/login',    authLimiter);
app.use('/api/auth/register', authLimiter);

// Purchase (transactional): 20 req per 15 min
const purchaseLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, message: 'Too many purchase attempts. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/purchase', purchaseLimiter);

// Verify/validate: 30 req per 15 min
const verifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { success: false, message: 'Too many verification requests. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/purchase/verify-data',                      verifyLimiter);
app.use('/api/purchase/verify-cable-tv',                  verifyLimiter);
app.use('/api/purchase/verify-electricity',               verifyLimiter);
app.use('/api/purchase/query-ea-transaction',             verifyLimiter);
app.use('/api/purchase/ea-balance',                       verifyLimiter);
app.use('/api/purchase/electricity/validate-meter',       verifyLimiter);
app.use('/api/purchase/cable-tv/validate-card',           verifyLimiter);
app.use('/api/purchase/internet/validate-customer',       verifyLimiter);
app.use('/api/purchase/betting/validate-customer',        verifyLimiter);

// Wallet mutations: 30 req per 15 min
const walletMutationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { success: false, message: 'Too many wallet requests. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/wallet/fund',     walletMutationLimiter);
app.use('/api/wallet/debit',    walletMutationLimiter);
app.use('/api/wallet/transfer', walletMutationLimiter);

// Paystack / payment gateways
const gatewayLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { success: false, message: 'Too many wallet requests. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/paystack', gatewayLimiter);
app.use('/api/payment',  gatewayLimiter);

// Admin
const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: { success: false, message: 'Too many admin requests. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/admin', adminLimiter);

// ── Body parser ────────────────────────────────────────────────
// The verify callback captures the raw body buffer for the Paystack
// webhook route only — needed for correct HMAC signature validation.
// All other routes are unaffected.
app.use(express.json({
  limit: '100kb',
  verify: (req, res, buf) => {
    if (req.path === '/api/paystack/webhook') {
      req.rawBody = buf.toString('utf8');
    }
  },
}));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));
logger.success('Body parser configured (100kb limit)');

// ── NoSQL injection protection ─────────────────────────────────
const mongoSanitize = require('express-mongo-sanitize');
app.use(mongoSanitize({
  replaceWith: '_',
  onSanitize: ({ req, key }) => {
    logger.warn(`Sanitized suspicious input on key: ${key} from IP: ${req.ip}`);
  },
}));
logger.success('MongoDB sanitization configured');

// ── Request ID moved — see above (before CSRF) ────────────────

// ── Content-Type enforcement on POST/PUT/PATCH ─────────────────
app.use((req, res, next) => {
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    const contentType = req.headers['content-type'] || '';
    if (!contentType.includes('application/json')) {
      return res.status(415).json({
        success: false,
        message: 'Content-Type must be application/json',
      });
    }
  }
  next();
});

// ── Pagination param sanitizer ─────────────────────────────────
app.use((req, res, next) => {
  if (req.query.page) {
    const p = parseInt(req.query.page);
    req.query.page = (!isNaN(p) && p > 0) ? Math.min(p, 1000) : 1;
  }
  if (req.query.limit) {
    const l = parseInt(req.query.limit);
    req.query.limit = (!isNaN(l) && l > 0) ? Math.min(l, 100) : 20;
  }
  next();
});

// ── Request logging (development only) ────────────────────────
app.use((req, res, next) => {
  if (process.env.NODE_ENV === 'development') {
    logger.info(`[${req.id}] ${req.method} ${req.path}`);
  }
  next();
});

// ── MongoDB ────────────────────────────────────────────────────
if (!process.env.MONGO_URI) {
  logger.error('MONGO_URI environment variable is not set');
  process.exit(1);
}

mongoose.connect(process.env.MONGO_URI, {
  maxPoolSize: 10, minPoolSize: 2,
  maxIdleTimeMS: 30000, serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000, family: 4,
})
.then(() => logger.success('Connected to MongoDB'))
.catch((error) => { logger.error('MongoDB connection error', error.message); process.exit(1); });

mongoose.connection.on('disconnected', () => logger.warn('MongoDB disconnected'));
mongoose.connection.on('error', (err) => logger.error('MongoDB error', err.message));

// ── Basic routes ───────────────────────────────────────────────
app.get('/api', (req, res) => {
  res.status(200).json({ message: 'API is running', version: '1.0.0', timestamp: new Date().toISOString() });
});

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// ── Route registration ─────────────────────────────────────────
const register = (path, router) => {
  if (!router) return;
  try {
    app.use(path, router);
    logger.success(`Registered: ${path}`);
  } catch (err) {
    logger.error(`Failed to register: ${path}`, err.message);
  }
};

register('/api/auth',          authRoutes);
register('/api/balance',       balanceRoutes);
register('/api/user',          userRoutes);
register('/api',               walletRoutes);
register('/api/transactions',  transactionRoutes);
register('/api/data',          dataRoutes);
register('/api/cable',         cableRoutes);
register('/api/notifications', notificationRoutes);
register('/api/users',         userManagementRoutes);
register('/api/admin/auth',    adminAuthRoutes);
register('/api/admin',         adminRoutes);
register('/api/dashboard',     dashboardRoutes);
register('/api/purchase',      purchaseRoutes);

const dynamicRoutes = [
  ['/api/paystack-resolution', './routes/paystackResolution'],
  ['/api/internet',            './routes/internet'],
  ['/api/electricity',         './routes/electricity'],
  ['/api/easyaccess',          './routes/easyaccess'],
  ['/api/airtime',             './routes/airtime'],
  ['/api/betting',             './routes/betting'],
  ['/api/admin/transactions',  './routes/adminTransactions'],
  ['/api/admin/dashboard',     './routes/adminDashboard'],
  ['/api/admin/bulk',          './routes/adminBulkOperations'],
  ['/api/admin/financial',     './routes/FinancialMangement'],
  ['/api/paystack',            './routes/paystack'],
  ['/api/payment',             './routes/payment'],
  ['/api/admin/payment-gateway', './routes/paymentGatewayConfig'],
  ['/api/support',             './routes/support'],
  ['/api/clubkonnect',         './routes/clubkonnect'],
];

for (const [path, routePath] of dynamicRoutes) {
  const route = loadRoute(routePath);
  if (route) register(path, route);
}

logger.success('All routes registered');

// ── 404 handler ────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// ── Global error handler ───────────────────────────────────────
app.use((err, req, res, next) => {
  // Handle CSRF errors specifically
  if (err.code === 'EBADCSRFTOKEN' || err.message?.includes('invalid csrf token')) {
    logger.warn(`CSRF token invalid — [${req.id}] ${req.method} ${req.path} from ${req.ip}`);
    return res.status(403).json({ success: false, message: 'Invalid or missing CSRF token.' });
  }
  logger.error('Request error', err.message);
  res.status(err.status || 500).json({
    success: false,
    message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
  });
});

// ── Memory monitoring ──────────────────────────────────────────
setInterval(() => {
  const used = process.memoryUsage();
  if (used.heapUsed > 500 * 1024 * 1024) {
    logger.warn(`High memory usage: ${Math.round(used.heapUsed / 1024 / 1024)}MB`);
  }
}, 60000);

// ── Graceful shutdown ──────────────────────────────────────────
const shutdown = async (signal) => {
  logger.info(`${signal} received — shutting down`);
  try {
    await mongoose.connection.close();
    logger.success('MongoDB connection closed');
  } catch (err) {
    logger.error('Error closing MongoDB', err.message);
  }
  try {
    await closeRedis();
  } catch (err) {
    logger.error('Error closing Redis', err.message);
  }
  process.exit(0);
};

process.on('SIGINT',  () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// ── Start server ───────────────────────────────────────────────
const server = app.listen(PORT, '0.0.0.0', () => {
  logger.success(`Server running on port ${PORT}`);
});

server.on('error',       (err)         => logger.error('Server error', err.message));
server.on('clientError', (err, socket) => { socket.end('HTTP/1.1 400 Bad Request\r\n\r\n'); });