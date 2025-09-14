// routes/services.js - Service Management Aggregator Route
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');

// Updated admin authentication middleware
const authenticateAdmin = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    if (!authHeader) {
      return res.status(401).json({ 
        success: false, 
        message: 'Access denied. No token provided.' 
      });
    }

    const token = authHeader.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'Access denied. Invalid token format.' 
      });
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    
    // Check if user exists and is admin (implement based on your user model)
    // For now, we'll assume the token contains admin info
    if (!decoded.isAdmin && decoded.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied. Admin privileges required.' 
      });
    }

    req.user = decoded;
    next();
  } catch (error) {
    console.error('Admin auth error:', error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid token.' 
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false, 
        message: 'Token expired.' 
      });
    }
    res.status(500).json({ 
      success: false, 
      message: 'Authentication error.' 
    });
  }
};

// GET /api/services/overview - Service status overview
router.get('/overview', authenticateAdmin, async (req, res) => {
  try {
    // Import your existing configurations
    const DATA_PLANS = {
      mtn: [
        { id: 1, name: '1GB Monthly', amount: 1200, status: 'active' },
        { id: 2, name: '2GB Monthly', amount: 2400, status: 'active' }
      ],
      airtel: [
        { id: 3, name: '1.5GB Monthly', amount: 1000, status: 'active' }
      ],
      glo: [
        { id: 4, name: '3GB Monthly', amount: 1500, status: 'inactive' }
      ]
    };

    // Aggregate data from different services
    const overview = {
      airtime: {
        status: 'active',
        providers: 4, // MTN, Airtel, Glo, 9Mobile
        successRate: 95.2,
        lastUpdated: new Date()
      },
      data: {
        status: 'active',
        providers: 4,
        totalPlans: Object.values(DATA_PLANS).reduce((total, plans) => total + plans.length, 0),
        successRate: 97.8,
        lastUpdated: new Date()
      },
      cableTV: {
        status: 'active',
        providers: 4, // DStv, GOtv, StarTimes, Showmax
        successRate: 98.5,
        lastUpdated: new Date()
      },
      electricity: {
        status: 'maintenance', // Since you don't have this service yet
        providers: 5,
        successRate: 0,
        lastUpdated: new Date()
      },
      betting: {
        status: 'active',
        providers: 7,
        successRate: 92.1,
        lastUpdated: new Date()
      }
    };

    // Calculate overall statistics
    const activeServices = Object.values(overview).filter(service => service.status === 'active').length;
    const totalProviders = Object.values(overview).reduce((total, service) => total + service.providers, 0);
    const averageSuccessRate = Object.values(overview)
      .filter(service => service.successRate > 0)
      .reduce((sum, service, _, arr) => sum + service.successRate / arr.length, 0);

    res.json({
      success: true,
      data: {
        services: overview,
        summary: {
          totalServices: Object.keys(overview).length,
          activeServices,
          maintenanceServices: Object.values(overview).filter(s => s.status === 'maintenance').length,
          totalProviders,
          overallSuccessRate: Math.round(averageSuccessRate * 10) / 10,
          lastUpdated: new Date()
        }
      }
    });

  } catch (error) {
    console.error('Services overview error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch services overview'
    });
  }
});

// GET /api/services/airtime/providers - Wrapper for airtime networks
router.get('/airtime/providers', authenticateAdmin, async (req, res) => {
  try {
    const AIRTIME_CONFIG = {
      mtn: { name: 'MTN', code: 'mtn', status: 'active', successRate: 98.5, commission: 2.5 },
      airtel: { name: 'Airtel', code: 'airtel', status: 'active', successRate: 97.8, commission: 2.0 },
      glo: { name: 'Glo', code: 'glo', status: 'maintenance', successRate: 95.2, commission: 1.8 },
      '9mobile': { name: '9Mobile', code: '9mobile', status: 'active', successRate: 96.4, commission: 2.2 }
    };

    const providers = Object.values(AIRTIME_CONFIG).map(provider => ({
      id: provider.code,
      name: provider.name,
      status: provider.status,
      successRate: provider.successRate,
      commission: provider.commission
    }));

    res.json({
      success: true,
      data: {
        providers,
        count: providers.length,
        lastUpdated: new Date()
      }
    });

  } catch (error) {
    console.error('Airtime providers error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch airtime providers'
    });
  }
});

// GET /api/services/data/plans - Wrapper for data plans
router.get('/data/plans', authenticateAdmin, async (req, res) => {
  try {
    // Sample data plans structure
    const DATA_PLANS = {
      mtn: [
        { id: 1, name: '1GB Monthly', dataSize: '1GB', amount: 1200, validity: '30 days', category: 'monthly', popular: true, status: 'active' },
        { id: 2, name: '2GB Monthly', dataSize: '2GB', amount: 2400, validity: '30 days', category: 'monthly', popular: true, status: 'active' }
      ],
      airtel: [
        { id: 3, name: '1.5GB Monthly', dataSize: '1.5GB', amount: 1000, validity: '30 days', category: 'monthly', popular: true, status: 'active' }
      ],
      glo: [
        { id: 4, name: '3GB Monthly', dataSize: '3GB', amount: 1500, validity: '30 days', category: 'monthly', popular: false, status: 'inactive' }
      ],
      '9mobile': [
        { id: 5, name: '500MB Weekly', dataSize: '500MB', amount: 500, validity: '7 days', category: 'weekly', popular: false, status: 'active' }
      ]
    };

    const allPlans = [];
    let totalPlans = 0;
    
    // Aggregate data from all networks
    Object.entries(DATA_PLANS).forEach(([network, plans]) => {
      const activePlans = plans.filter(plan => plan.status === 'active');
      totalPlans += activePlans.length;
      
      activePlans.forEach(plan => {
        allPlans.push({
          id: plan.id,
          network: network.toUpperCase(),
          name: plan.name,
          dataSize: plan.dataSize,
          price: plan.amount,
          validity: plan.validity,
          category: plan.category,
          popular: plan.popular,
          status: plan.status
        });
      });
    });

    // Group by network for better organization
    const plansByNetwork = {};
    Object.keys(DATA_PLANS).forEach(network => {
      plansByNetwork[network] = DATA_PLANS[network]
        .filter(plan => plan.status === 'active')
        .map(plan => ({
          id: plan.id,
          name: plan.name,
          dataSize: plan.dataSize,
          price: plan.amount,
          validity: plan.validity,
          category: plan.category,
          popular: plan.popular,
          status: plan.status
        }));
    });

    res.json({
      success: true,
      data: {
        plans: allPlans,
        plansByNetwork,
        statistics: {
          totalPlans,
          networks: Object.keys(DATA_PLANS).length,
          popularPlans: allPlans.filter(plan => plan.popular).length,
          categories: {
            daily: allPlans.filter(plan => plan.category === 'daily').length,
            weekly: allPlans.filter(plan => plan.category === 'weekly').length,
            monthly: allPlans.filter(plan => plan.category === 'monthly').length
          }
        },
        lastUpdated: new Date()
      }
    });

  } catch (error) {
    console.error('Data plans error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch data plans'
    });
  }
});

// GET /api/services/cable/providers - Wrapper for cable TV providers
router.get('/cable/providers', authenticateAdmin, async (req, res) => {
  try {
    const CABLE_PROVIDERS = {
      dstv: { name: 'DStv', code: 'dstv', status: 'active', packages: 15, successRate: 99.2 },
      gotv: { name: 'GOtv', code: 'gotv', status: 'active', packages: 8, successRate: 98.7 },
      startimes: { name: 'StarTimes', code: 'startimes', status: 'maintenance', packages: 6, successRate: 97.5 },
      showmax: { name: 'Showmax', code: 'showmax', status: 'active', packages: 2, successRate: 98.9 }
    };

    const providers = Object.values(CABLE_PROVIDERS).map(provider => ({
      id: provider.code,
      name: provider.name,
      status: provider.status,
      packages: provider.packages,
      successRate: provider.successRate
    }));

    res.json({
      success: true,
      data: {
        providers,
        count: providers.length,
        activeCount: providers.filter(p => p.status === 'active').length,
        lastUpdated: new Date()
      }
    });

  } catch (error) {
    console.error('Cable providers error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch cable providers'
    });
  }
});

// GET /api/services/electricity/discos - Placeholder for electricity service
router.get('/electricity/discos', authenticateAdmin, async (req, res) => {
  try {
    // Placeholder data - you'll implement the actual electricity service later
    const ELECTRICITY_DISCOS = [
      { id: 'ekedc', name: 'Eko Electric', status: 'active', successRate: 96.8 },
      { id: 'ikedc', name: 'Ikeja Electric', status: 'active', successRate: 95.5 },
      { id: 'aedc', name: 'Abuja Electric', status: 'maintenance', successRate: 94.2 },
      { id: 'phedc', name: 'Port Harcourt Electric', status: 'maintenance', successRate: 0 },
      { id: 'kedc', name: 'Kano Electric', status: 'maintenance', successRate: 0 }
    ];

    res.json({
      success: true,
      data: {
        discos: ELECTRICITY_DISCOS,
        count: ELECTRICITY_DISCOS.length,
        activeCount: ELECTRICITY_DISCOS.filter(d => d.status === 'active').length,
        message: 'Some electricity services under development',
        lastUpdated: new Date()
      }
    });

  } catch (error) {
    console.error('Electricity DISCOs error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch electricity DISCOs'
    });
  }
});

// PUT /api/services/:serviceType/:providerId/status - Enable/disable service providers
router.put('/:serviceType/:providerId/status', authenticateAdmin, async (req, res) => {
  try {
    const { serviceType, providerId } = req.params;
    const { status } = req.body;

    // Validate inputs
    const validServiceTypes = ['airtime', 'data', 'cable', 'electricity'];
    const validStatuses = ['active', 'inactive', 'maintenance'];

    if (!validServiceTypes.includes(serviceType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid service type'
      });
    }

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be: active, inactive, or maintenance'
      });
    }

    // For now, simulate the status update
    // In production, you'd update your database/configuration
    console.log(`Admin ${req.user.userId} updated ${serviceType} provider ${providerId} status to ${status}`);
    
    res.json({
      success: true,
      message: `${serviceType} provider ${providerId} status updated to ${status}`,
      data: {
        serviceType,
        providerId,
        newStatus: status,
        updatedBy: req.user.userId,
        updatedAt: new Date()
      }
    });

  } catch (error) {
    console.error('Service status update error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update service status'
    });
  }
});

// GET /api/services/stats - Get service statistics for dashboard
router.get('/stats', authenticateAdmin, async (req, res) => {
  try {
    // This would typically come from your database
    // For now, using mock data that matches your dashboard needs
    const stats = {
      todayRevenue: 250000,
      revenueChange: 12.5,
      totalTransactions: 1547,
      transactionChange: 8.3,
      activeUsers: 423,
      userChange: 15.2,
      successRate: 96.8,
      rateChange: 2.1,
      servicesOnline: 4,
      systemUptime: '99.9%',
      todayErrors: 3,
      unreadNotifications: 12,
      adminUsers: 5,
      pendingVerifications: 23,
      failedTransactions: 8,
      pendingTransactions: 15,
      suspendedUsers: 7,
      totalUsers: 12450,
      totalWalletBalance: 45000000,
      refundRequests: 2,
      serviceSuccessRate: 96.8,
      systemAlerts: 1,
      recentActivity: [
        {
          id: 1,
          type: 'transaction',
          message: 'MTN airtime purchase completed',
          user: 'user123@example.com',
          amount: 1000,
          timestamp: new Date(Date.now() - 5 * 60 * 1000) // 5 minutes ago
        },
        {
          id: 2,
          type: 'user',
          message: 'New user registration',
          user: 'newuser@example.com',
          timestamp: new Date(Date.now() - 15 * 60 * 1000) // 15 minutes ago
        },
        {
          id: 3,
          type: 'service',
          message: 'Glo network maintenance completed',
          timestamp: new Date(Date.now() - 30 * 60 * 1000) // 30 minutes ago
        }
      ]
    };

    res.json({
      success: true,
      data: stats,
      lastUpdated: new Date()
    });

  } catch (error) {
    console.error('Service stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch service statistics'
    });
  }
});

// Test endpoint to check if routes are working
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Services routes are working',
    timestamp: new Date()
  });
});

module.exports = router;