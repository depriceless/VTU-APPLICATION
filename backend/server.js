const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Add comprehensive error handling
process.on('uncaughtException', (err) => {
  console.error('=== UNCAUGHT EXCEPTION ===');
  console.error('Time:', new Date().toISOString());
  console.error('Error:', err.message);
  console.error('Stack:', err.stack);
  console.error('===============================');
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('=== UNHANDLED REJECTION ===');
  console.error('Time:', new Date().toISOString());
  console.error('Promise:', promise);
  console.error('Reason:', reason);
  console.error('===============================');
  // Don't exit on unhandled rejection, just log it for now
});

// Log when server starts and exits
console.log('Server starting at:', new Date().toISOString());
process.on('exit', (code) => {
  console.log('Server exiting with code:', code, 'at:', new Date().toISOString());
});

// Import existing routes
const authRoutes = require('./routes/auth');
const balanceRoutes = require('./routes/balance');
const userRoutes = require("./routes/user");
const walletRoutes = require('./routes/wallet');
const purchaseRoutes = require('./routes/purchase');
const dataRoutes = require('./routes/dataplan'); 
const cableRoutes = require('./routes/cabletv')
const transactionRoutes = require('./routes/transactions');
const { router: adminAuthRoutes } = require('./routes/adminAuth');
const adminRoutes = require('./routes/admin');
const dashboardRoutes = require('./routes/dashboard');
const transactionRetryService = require('./services/transactionRetryService');
const servicesRoutes = require('./routes/services');

// Import new user management routes
const userManagementRoutes = require('./routes/userManagement');

// Import middleware
const { 
  authenticateToken, 
  requireAdmin, 
  adminRateLimit 
} = require('./middleware/adminAuth');

console.log('=== DASHBOARD DEBUG ===');
console.log('Dashboard routes loaded successfully:', typeof dashboardRoutes);
console.log('Dashboard routes object:', dashboardRoutes);

const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// CORS configuration
app.use(cors({
  origin: [
    'http://localhost:3000', 
    'http://localhost:8081', 
    'exp://localhost:19000', 
    'http://localhost:19006',
    'http://localhost:5173' // For your React admin panel
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging middleware (to track last request before crash)
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path} - IP: ${req.ip}`);
  next();
});

// Connect to MongoDB with better error handling
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('Connected to MongoDB successfully');
  console.log('Database:', mongoose.connection.name);
})
.catch(err => {
  console.error('MongoDB connection error:', err.message);
  console.error('Stack:', err.stack);
  process.exit(1);
});

// MongoDB connection event listeners
mongoose.connection.on('error', (err) => {
  console.error('MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected');
});

mongoose.connection.on('reconnected', () => {
  console.log('MongoDB reconnected');
});

// Base API route
app.get('/api', (req, res) => {
  res.status(200).json({ 
    message: 'API is running',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Existing routes
app.use('/api/auth', authRoutes);
app.use('/api/balance', balanceRoutes);
app.use("/api/user", userRoutes);
app.use('/api', walletRoutes);
app.use('/api/purchase', purchaseRoutes);
app.use('/api/data', dataRoutes); 
app.use('/api', cableRoutes);
app.use('/api/recharge', purchaseRoutes);
app.use('/api/airtime', require('./routes/airtime'));
app.use('/api/betting', require('./routes/betting'));
app.use('/api/transactions', transactionRoutes);
app.use('/api/admin/auth', adminAuthRoutes);
app.use('/api/admin', adminRoutes); 
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/admin/transactions', require('./routes/adminTransactions'));
app.use('/api/admin/dashboard', require('./routes/adminDashboard'));
app.use('/api/admin/bulk', require('./routes/adminBulkOperations'));
app.use('/api/services', servicesRoutes);

// NEW: User Management Routes (protected with your existing admin authentication)
app.use('/api/users', userManagementRoutes);

console.log('Dashboard routes registered at /api/dashboard');
console.log('User Management routes registered at /api/users');
console.log('=== END DASHBOARD DEBUG ===');

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    mongoConnection: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// 404 handler
app.use('*', (req, res) => {
  console.log(`404 - Route not found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ 
    success: false, 
    message: 'Route not found' 
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('=== GLOBAL ERROR HANDLER ===');
  console.error('Time:', new Date().toISOString());
  console.error('URL:', req.originalUrl);
  console.error('Method:', req.method);
  console.error('Error:', err.message);
  console.error('Stack:', err.stack);
  console.error('===============================');
  
  if (process.env.NODE_ENV === 'production') {
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  } else {
    res.status(500).json({
      success: false,
      message: err.message,
      stack: err.stack
    });
  }
});

// Graceful shutdown handlers
process.on('SIGINT', async () => {
  console.log('\n=== SIGINT received - Shutting down gracefully ===');
  try {
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
    process.exit(0);
  } catch (err) {
    console.error('Error during shutdown:', err);
    process.exit(1);
  }
});

process.on('SIGTERM', async () => {
  console.log('\n=== SIGTERM received - Shutting down gracefully ===');
  try {
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
    process.exit(0);
  } catch (err) {
    console.error('Error during shutdown:', err);
    process.exit(1);
  }
});

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`API Base: http://localhost:${PORT}/api/`);
  console.log(`Auth endpoints: http://localhost:${PORT}/api/auth/`);
  console.log(`Data endpoints: http://localhost:${PORT}/api/data/`);
  console.log(`User Management: http://localhost:${PORT}/api/users/management/`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
  console.log('Server started successfully at:', new Date().toISOString());
});

// Handle server errors
server.on('error', (err) => {
  console.error('Server error:', err);
});

server.on('clientError', (err, socket) => {
  console.error('Client error:', err);
  socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
});