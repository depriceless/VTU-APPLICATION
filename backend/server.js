const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// === ENHANCED ERROR HANDLING FOR DEBUGGING ===
process.on('uncaughtException', (err) => {
  console.error('\n🚨 === UNCAUGHT EXCEPTION ===');
  console.error('Time:', new Date().toISOString());
  console.error('Error:', err.message);
  console.error('Stack:', err.stack);
  console.error('Name:', err.name);
  console.error('Code:', err.code);
  console.error('===============================\n');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('\n🚨 === UNHANDLED REJECTION ===');
  console.error('Time:', new Date().toISOString());
  console.error('Promise:', promise);
  console.error('Reason:', reason);
  console.error('===============================\n');
});

console.log('🟡 Server starting at:', new Date().toISOString());
console.log('🟡 Node version:', process.version);
console.log('🟡 Environment:', process.env.NODE_ENV || 'development');

// === CHECK REQUIRED MODULES ===
console.log('🔍 Checking required modules...');
try {
  console.log('✅ Express loaded');
  console.log('✅ Mongoose loaded');
  console.log('✅ CORS loaded');
} catch (err) {
  console.error('❌ Module loading error:', err.message);
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 5000;

// === ROUTES IMPORTS WITH ERROR HANDLING ===
console.log('🔍 Loading routes...');
let authRoutes, balanceRoutes, userRoutes, walletRoutes, purchaseRoutes;
let dataRoutes, cableRoutes, transactionRoutes, adminAuthRoutes;
let adminRoutes, dashboardRoutes, notificationRoutes, userManagementRoutes;

try {
  authRoutes = require('./routes/auth');
  console.log('✅ Auth routes loaded');
} catch (err) {
  console.error('❌ Auth routes error:', err.message);
  authRoutes = null;
}

try {
  balanceRoutes = require('./routes/balance');
  console.log('✅ Balance routes loaded');
} catch (err) {
  console.error('❌ Balance routes error:', err.message);
  balanceRoutes = null;
}

try {
  userRoutes = require('./routes/user');
  console.log('✅ User routes loaded (includes change-password and change-pin)');
} catch (err) {
  console.error('❌ User routes error:', err.message);
  userRoutes = null;
}

try {
  walletRoutes = require('./routes/wallet');
  console.log('✅ Wallet routes loaded');
} catch (err) {
  console.error('❌ Wallet routes error:', err.message);
  walletRoutes = null;
}

try {
  purchaseRoutes = require('./routes/purchase');
  console.log('✅ Purchase routes loaded');
} catch (err) {
  console.error('❌ Purchase routes error:', err.message);
  purchaseRoutes = null;
}

try {
  dataRoutes = require('./routes/dataplan');
  console.log('✅ Data routes loaded');
} catch (err) {
  console.error('❌ Data routes error:', err.message);
  dataRoutes = null;
}

try {
  cableRoutes = require('./routes/cabletv');
  console.log('✅ Cable routes loaded');
} catch (err) {
  console.error('❌ Cable routes error:', err.message);
  cableRoutes = null;
}

try {
  transactionRoutes = require('./routes/transactions');
  console.log('✅ Transaction routes loaded');
} catch (err) {
  console.error('❌ Transaction routes error:', err.message);
  transactionRoutes = null;
}

console.log('ℹ️  Account routes commented out - file not created yet');

// === ADMIN AUTH DEBUG SECTION ===
console.log('🔍 Debugging admin auth routes...');
try {
  const adminAuthImport = require('./routes/adminAuth');
  console.log('✅ Admin auth import successful');
  console.log('📋 Admin auth exports:', Object.keys(adminAuthImport));
  
  adminAuthRoutes = adminAuthImport.router;
  console.log('📋 Router extracted:', adminAuthRoutes ? 'exists' : 'missing');
  
  if (adminAuthRoutes && adminAuthRoutes.stack) {
    console.log('📋 Router stack length:', adminAuthRoutes.stack.length);
    adminAuthRoutes.stack.forEach((layer, index) => {
      if (layer.route) {
        console.log(`📋 Route ${index}:`, layer.route.path, 'Methods:', Object.keys(layer.route.methods));
      } else {
        console.log(`📋 Middleware ${index}:`, layer.regexp ? layer.regexp.toString() : 'unknown');
      }
    });
  } else {
    console.log('❌ Router has no stack or router is missing');
  }
} catch (err) {
  console.error('❌ Admin auth import error:', err.message);
  console.error('❌ Stack trace:', err.stack);
  adminAuthRoutes = null;
}

try {
  adminRoutes = require('./routes/admin');
  console.log('✅ Admin routes loaded');
} catch (err) {
  console.error('❌ Admin routes error:', err.message);
  adminRoutes = null;
}

try {
  dashboardRoutes = require('./routes/dashboard');
  console.log('✅ Dashboard routes loaded');
} catch (err) {
  console.error('❌ Dashboard routes error:', err.message);
  dashboardRoutes = null;
}

try {
  notificationRoutes = require('./routes/notifications');
  console.log('✅ Notification routes loaded');
} catch (err) {
  console.error('❌ Notification routes error:', err.message);
  notificationRoutes = null;
}

try {
  userManagementRoutes = require('./routes/userManagement');
  console.log('✅ User management routes loaded');
} catch (err) {
  console.error('❌ User management routes error:', err.message);
  userManagementRoutes = null;
}

// === SECURITY MIDDLEWARE ===
app.use(helmet());

// === CORS CONFIGURATION ===
try {
  app.use(cors({
    origin: [
      'http://localhost:3000',
      'http://localhost:8081', 
      'exp://localhost:19000',
      'http://localhost:19006',
      'http://localhost:5173',
      'http://192.168.126.7:5173',
      'https://admin-connectpay.netlify.app',
      'https://*.netlify.app'
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    preflightContinue: false,
    optionsSuccessStatus: 200
  }));

  app.options('*', cors());
  console.log('✅ CORS configured');
} catch (err) {
  console.error('❌ CORS error:', err.message);
}

try {
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));
  console.log('✅ Body parser configured');
} catch (err) {
  console.error('❌ Body parser error:', err.message);
}

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path} - IP: ${req.ip}`);
  next();
});

// === MONGODB CONNECTION ===
console.log('🔍 Connecting to MongoDB...');
console.log('🔍 MongoDB URI:', process.env.MONGO_URI ? 'Set' : 'NOT SET');

if (!process.env.MONGO_URI) {
  console.error('❌ MONGO_URI environment variable is not set!');
  process.exit(1);
}

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 30000,
  socketTimeoutMS: 60000,
  maxPoolSize: 10,
  retryWrites: true,
})
.then(async () => {
  console.log('✅ Connected to MongoDB successfully\n');
})
.catch((error) => {
  console.error('❌ MongoDB connection error:', error.message);
  console.error('Stack:', error.stack);
  process.exit(1);
});

mongoose.connection.on('disconnected', () => {
  console.log('⚠️ MongoDB disconnected');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB connection error:', err);
});

// === BASIC ROUTES ===
app.get('/api', (req, res) => {
  console.log('📍 API root endpoint hit');
  res.status(200).json({
    message: 'API is running',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/health', (req, res) => {
  console.log('📍 Health check endpoint hit');
  res.status(200).json({ 
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    mongoConnection: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

app.get('/api/get-server-ip', (req, res) => {
  const https = require('https');
  
  https.get('https://api.ipify.org?format=json', (resp) => {
    let data = '';
    resp.on('data', (chunk) => { data += chunk; });
    resp.on('end', () => {
      const ipData = JSON.parse(data);
      console.log('YOUR IP IS:', ipData.ip);
      res.json({ ip: ipData.ip });
    });
  });
});

app.get('/api/admin/auth/direct-test', (req, res) => {
  console.log('📍 Direct admin auth test hit');
  res.json({
    success: true,
    message: 'Direct admin auth test route works!',
    timestamp: new Date().toISOString()
  });
});

// === TEST ROUTE FOR INTERNET (NO AUTH) ===
app.get('/api/internet-test', (req, res) => {
  console.log('📍 Direct internet test route hit');
  res.json({
    success: true,
    message: 'Internet routes are reachable',
    timestamp: new Date().toISOString()
  });
});

// === ROUTE REGISTRATION WITH ERROR HANDLING ===
console.log('🔍 Registering routes...');

if (authRoutes) {
  try {
    app.use('/api/auth', authRoutes);
    console.log('✅ Auth routes registered');
  } catch (err) {
    console.error('❌ Auth routes registration error:', err.message);
  }
}

if (balanceRoutes) {
  try {
    app.use('/api/balance', balanceRoutes);
    console.log('✅ Balance routes registered');
  } catch (err) {
    console.error('❌ Balance routes registration error:', err.message);
  }
}

if (userRoutes) {
  try {
    app.use('/api/user', userRoutes);
    console.log('✅ User routes registered (includes /change-password and /change-pin)');
  } catch (err) {
    console.error('❌ User routes registration error:', err.message);
  }
}

console.log('ℹ️  Account routes skipped - not loaded');

if (walletRoutes) {
  try {
    app.use('/api', walletRoutes);
    console.log('✅ Wallet routes registered');
  } catch (err) {
    console.error('❌ Wallet routes registration error:', err.message);
  }
}

// ============================================
// 🔥 INTERNET ROUTES - REGISTER EARLY (BEFORE PURCHASE)
// ============================================
try {
  const internetRoutes = require('./routes/internet');
  console.log('✅ Internet routes module loaded');
  
  // Debug the router before registration
  if (internetRoutes && internetRoutes.stack) {
    console.log('📋 Internet router has', internetRoutes.stack.length, 'layers');
    internetRoutes.stack.forEach((layer, index) => {
      if (layer.route) {
        const methods = Object.keys(layer.route.methods).join(',').toUpperCase();
        console.log(`   ${index}. ${methods} ${layer.route.path}`);
      }
    });
  } else {
    console.log('⚠️  Internet router has no stack');
  }
  
  app.use('/api/internet', internetRoutes);
  console.log('✅ Internet routes registered at /api/internet');
  console.log('   Expected endpoints:');
  console.log('   - GET  /api/internet/providers');
  console.log('   - GET  /api/internet/provider/:code');
  console.log('   - GET  /api/internet/provider/:code/plans');
  console.log('   - POST /api/internet/validate-account');
  console.log('   - GET  /api/internet/refresh-plans');
  
} catch (err) {
  console.error('❌ Internet routes error:', err.message);
  console.error('Stack:', err.stack);
}

// ============================================
// ELECTRICITY ROUTES
// ============================================
try {
  const electricityRoutes = require('./routes/electricity');
  app.use('/api/electricity', electricityRoutes);
  console.log('✅ Electricity routes registered at /api/electricity');
} catch (err) {
  console.error('❌ Electricity routes error:', err.message);
}

// ============================================
// DATA ROUTES
// ============================================
if (dataRoutes) {
  try {
    app.use('/api/data', dataRoutes);
    console.log('✅ Data routes registered');
  } catch (err) {
    console.error('❌ Data routes registration error:', err.message);
  }
}

// ============================================
// CABLE TV ROUTES
// ============================================
if (cableRoutes) {
  try {
    app.use('/api/cable', cableRoutes);
    console.log('✅ Cable routes registered at /api/cable');
  } catch (err) {
    console.error('❌ Cable routes registration error:', err.message);
  }
}

// ============================================
// AIRTIME ROUTES
// ============================================
try {
  app.use('/api/airtime', require('./routes/airtime'));
  console.log('✅ Airtime routes registered');
} catch (err) {
  console.error('❌ Airtime routes error:', err.message);
}

// ============================================
// BETTING ROUTES
// ============================================
try {
  app.use('/api/betting', require('./routes/betting'));
  console.log('✅ Betting routes registered');
} catch (err) {
  console.error('❌ Betting routes error:', err.message);
}

// ============================================
// PURCHASE ROUTES - AFTER SPECIFIC ROUTES
// ============================================
if (purchaseRoutes) {
  try {
    app.use('/api/purchase', purchaseRoutes);
    app.use('/api/recharge', purchaseRoutes);
    console.log('✅ Purchase routes registered');
  } catch (err) {
    console.error('❌ Purchase routes registration error:', err.message);
  }
}

// ============================================
// TRANSACTION ROUTES
// ============================================
if (transactionRoutes) {
  try {
    app.use('/api/transactions', transactionRoutes);
    console.log('✅ Transaction routes registered');
  } catch (err) {
    console.error('❌ Transaction routes registration error:', err.message);
  }
}

// ============================================
// ADMIN AUTH ROUTES
// ============================================
if (adminAuthRoutes) {
  try {
    console.log('🔍 About to register admin auth routes...');
    
    if (adminAuthRoutes.stack) {
      adminAuthRoutes.stack.forEach((layer, index) => {
        if (layer.route) {
          console.log(`  - ${Object.keys(layer.route.methods).join(',').toUpperCase()} ${layer.route.path}`);
        }
      });
    }
    
    app.use('/api/admin/auth', adminAuthRoutes);
    console.log('✅ Admin auth routes registered at /api/admin/auth');
    
  } catch (err) {
    console.error('❌ Admin auth routes registration error:', err.message);
    console.error('❌ Stack:', err.stack);
  }
} else {
  console.error('❌ Admin auth routes not available for registration');
}

// ============================================
// OTHER ADMIN ROUTES
// ============================================
if (adminRoutes) {
  try {
    app.use('/api/admin', adminRoutes);
    console.log('✅ Admin routes registered');
  } catch (err) {
    console.error('❌ Admin routes registration error:', err.message);
  }
}

if (dashboardRoutes) {
  try {
    app.use('/api/dashboard', dashboardRoutes);
    console.log('✅ Dashboard routes registered');
  } catch (err) {
    console.error('❌ Dashboard routes registration error:', err.message);
  }
}

try {
  app.use('/api/admin/transactions', require('./routes/adminTransactions'));
  console.log('✅ Admin transaction routes registered');
} catch (err) {
  console.error('❌ Admin transaction routes error:', err.message);
}

try {
  app.use('/api/admin/dashboard', require('./routes/adminDashboard'));
  console.log('✅ Admin dashboard routes registered');
} catch (err) {
  console.error('❌ Admin dashboard routes error:', err.message);
}

try {
  app.use('/api/admin/bulk', require('./routes/adminBulkOperations'));
  console.log('✅ Admin bulk routes registered');
} catch (err) {
  console.error('❌ Admin bulk routes error:', err.message);
}

try {
  app.use('/api/admin/financial', require('./routes/FinancialMangement'));
  console.log('✅ Financial management routes registered');
} catch (err) {
  console.error('❌ Financial management routes error:', err.message);
}

if (notificationRoutes) {
  try {
    app.use('/api/notifications', notificationRoutes);
    console.log('✅ Notification routes registered');
  } catch (err) {
    console.error('❌ Notification routes registration error:', err.message);
  }
}

console.log('ℹ️  Monnify routes commented out - needs Balance→Wallet fix');

// ============================================
// PAYMENT ROUTES
// ============================================
try {
  const paystackRoutes = require('./routes/paystack');
  app.use('/api/paystack', paystackRoutes);
  console.log('✅ Paystack routes registered');
} catch (err) {
  console.error('❌ Paystack routes error:', err.message);
}

try {
  const paymentRoutes = require('./routes/payment');
  app.use('/api/payment', paymentRoutes);
  console.log('✅ Payment gateway routes registered');
} catch (err) {
  console.error('❌ Payment gateway routes error:', err.message);
}

try {
  const paymentGatewayConfigRoutes = require('./routes/paymentGatewayConfig');
  app.use('/api/admin/payment-gateway', paymentGatewayConfigRoutes);
  console.log('✅ Payment gateway admin config routes registered');
} catch (err) {
  console.error('❌ Payment gateway admin config routes error:', err.message);
}

console.log('ℹ️  Card routes commented out - needs Balance→Wallet fix');

// ============================================
// SUPPORT AND OTHER ROUTES
// ============================================
try {
  app.use('/api/support', require('./routes/support'));
  console.log('✅ Support routes registered');
} catch (err) {
  console.error('❌ Support routes error:', err.message);
}

try {
  const clubkonnectRoutes = require('./routes/clubkonnect');
  app.use('/api/clubkonnect', clubkonnectRoutes);
  console.log('✅ ClubKonnect VTU routes registered');
} catch (err) {
  console.error('❌ ClubKonnect routes error:', err.message);
}

console.log('ℹ️  Services routes commented out - needs ServiceConfig model');

if (userManagementRoutes) {
  try {
    app.use('/api/users', userManagementRoutes);
    console.log('✅ User management routes registered');
  } catch (err) {
    console.error('❌ User management routes registration error:', err.message);
  }
}

console.log('✅ All routes registered\n');

// === 404 HANDLER ===
app.use((req, res) => {
  console.log(`❌ 404 - Route not found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// === GLOBAL ERROR HANDLER ===
app.use((err, req, res, next) => {
  console.error('\n🚨 === GLOBAL ERROR HANDLER ===');
  console.error('Time:', new Date().toISOString());
  console.error('URL:', req.originalUrl);
  console.error('Method:', req.method);
  console.error('Error:', err.message);
  console.error('Stack:', err.stack);
  console.error('===============================\n');

  res.status(500).json({
    success: false,
    message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
});

// === GRACEFUL SHUTDOWN ===
process.on('SIGINT', async () => {
  console.log('\n🛑 === SIGINT received - Shutting down gracefully ===');
  try {
    await mongoose.connection.close();
    console.log('✅ MongoDB connection closed');
  } catch (err) {
    console.error('❌ Error closing MongoDB:', err.message);
  }
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 === SIGTERM received - Shutting down gracefully ===');
  try {
    await mongoose.connection.close();
    console.log('✅ MongoDB connection closed');
  } catch (err) {
    console.error('❌ Error closing MongoDB:', err.message);
  }
  process.exit(0);
});

// === START SERVER ===
console.log('🔍 Starting server...');
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log('🟢 Server setup complete!');
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📍 API Base: http://localhost:${PORT}/api/`);
  console.log(`🏥 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🧪 Internet test: http://localhost:${PORT}/api/internet-test`);
  console.log(`🔧 Direct admin test: http://localhost:${PORT}/api/admin/auth/direct-test`);
  console.log(`🔐 Change password: http://localhost:${PORT}/api/user/change-password`);
  console.log(`🔑 Change PIN: http://localhost:${PORT}/api/user/change-pin`);
  console.log(`🟢 Server fully started at: ${new Date().toISOString()}`);
});

server.on('error', (err) => {
  console.error('🚨 Server error:', err);
  console.error('Error code:', err.code);
  console.error('Error message:', err.message);
});

server.on('clientError', (err, socket) => {
  console.error('🚨 Client error:', err);
  socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
});