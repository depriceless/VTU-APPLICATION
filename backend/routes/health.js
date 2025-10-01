// routes/health.js - NEW FILE
const express = require('express');
const { verifyAdminToken } = require('../middleware/adminAuth');
const ServiceProvider = require('../models/ServiceProvider');
const Transaction = require('../models/Transaction');
const router = express.Router();

// Health check configurations
const healthCheckConfig = {
  airtime: {
    endpoints: ['/api/airtime/balance', '/api/airtime/validate'],
    timeout: 10000,
    expectedStatus: 200
  },
  data: {
    endpoints: ['/api/data/plans', '/api/data/validate'],
    timeout: 15000,
    expectedStatus: 200
  },
  electricity: {
    endpoints: ['/api/electricity/providers', '/api/electricity/validate-meter'],
    timeout: 20000,
    expectedStatus: 200
  }
};

// Mock health check function (replace with actual API calls)
const performHealthCheck = async (provider, config) => {
  try {
    const startTime = Date.now();
    
    // Simulate API call - replace with actual HTTP requests
    await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500));
    
    const responseTime = Date.now() - startTime;
    const isHealthy = Math.random() > 0.1; // 90% success rate
    
    return {
      status: isHealthy ? 'online' : 'degraded',
      responseTime,
      lastChecked: new Date(),
      message: isHealthy ? 'Service responding normally' : 'Service experiencing issues'
    };
  } catch (error) {
    return {
      status: 'offline',
      responseTime: 0,
      lastChecked: new Date(),
      message: error.message
    };
  }
};

// GET /api/admin/services/health - Comprehensive health status
router.get('/services/health', verifyAdminToken, async (req, res) => {
  try {
    const providers = await ServiceProvider.find({ isActive: true });
    
    const healthStatus = await Promise.all(
      providers.map(async (provider) => {
        const config = healthCheckConfig[provider.serviceType];
        let health;
        
        if (config) {
          health = await performHealthCheck(provider, config);
        } else {
          health = { 
            status: 'unknown', 
            message: 'No health check configured',
            lastChecked: new Date()
          };
        }

        // Update provider health status
        provider.healthCheck = health;
        await provider.save();

        // Get recent transaction success rate
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const txStats = await Transaction.aggregate([
          {
            $match: {
              category: provider.serviceType,
              createdAt: { $gte: twentyFourHoursAgo }
            }
          },
          {
            $group: {
              _id: '$status',
              count: { $sum: 1 }
            }
          }
        ]);

        const successCount = txStats.find(s => s._id === 'completed')?.count || 0;
        const totalCount = txStats.reduce((sum, s) => sum + s.count, 0);
        const successRate = totalCount > 0 ? (successCount / totalCount) * 100 : 100;

        return {
          provider: {
            id: provider._id,
            name: provider.name,
            serviceType: provider.serviceType,
            isActive: provider.isActive
          },
          health: {
            ...health,
            successRate: Math.round(successRate * 100) / 100,
            recentTransactions: totalCount
          },
          recommendations: getHealthRecommendations(health, successRate)
        };
      })
    );

    // Overall system health
    const onlineServices = healthStatus.filter(h => h.health.status === 'online').length;
    const totalServices = healthStatus.length;
    const systemHealth = totalServices > 0 ? (onlineServices / totalServices) * 100 : 100;

    res.json({
      success: true,
      systemHealth: {
        status: systemHealth > 80 ? 'healthy' : systemHealth > 60 ? 'degraded' : 'critical',
        score: Math.round(systemHealth * 100) / 100,
        onlineServices,
        totalServices
      },
      services: healthStatus,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check service health'
    });
  }
});

// GET /api/admin/services/alerts - Get active alerts
router.get('/services/alerts', verifyAdminToken, async (req, res) => {
  try {
    const { severity, resolved } = req.query;
    
    // In a real system, you'd have an Alert model
    // For now, we'll generate alerts based on current health
    const healthStatus = await getCurrentHealthStatus();
    
    const alerts = healthStatus
      .filter(service => service.health.status !== 'online' || service.health.successRate < 90)
      .map(service => ({
        id: `alert_${service.provider.id}_${Date.now()}`,
        severity: service.health.status === 'offline' ? 'critical' : 
                 service.health.successRate < 80 ? 'high' : 'medium',
        service: service.provider.name,
        type: 'health_check',
        message: `Service ${service.provider.name} is ${service.health.status}. Success rate: ${service.health.successRate}%`,
        timestamp: new Date(),
        resolved: false,
        actions: ['restart_service', 'contact_provider', 'review_logs']
      }));

    // Filter by severity if provided
    const filteredAlerts = severity ? 
      alerts.filter(alert => alert.severity === severity) : alerts;

    res.json({
      success: true,
      alerts: filteredAlerts,
      summary: {
        critical: alerts.filter(a => a.severity === 'critical').length,
        high: alerts.filter(a => a.severity === 'high').length,
        medium: alerts.filter(a => a.severity === 'medium').length,
        total: alerts.length
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Get alerts error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch alerts'
    });
  }
});

// Helper functions
function getHealthRecommendations(health, successRate) {
  const recommendations = [];
  
  if (health.status === 'offline') {
    recommendations.push('Check provider API connectivity');
    recommendations.push('Verify API credentials');
    recommendations.push('Contact provider support');
  }
  
  if (successRate < 90) {
    recommendations.push('Review recent failed transactions');
    recommendations.push('Check provider rate limits');
    recommendations.push('Consider failover to backup provider');
  }
  
  if (health.responseTime > 5000) {
    recommendations.push('Investigate API response time issues');
    recommendations.push('Check network latency');
  }
  
  return recommendations.length > 0 ? recommendations : ['No issues detected'];
}

async function getCurrentHealthStatus() {
  // Simplified - in real implementation, this would query the health check system
  const providers = await ServiceProvider.find({ isActive: true });
  return providers.map(p => ({
    provider: p,
    health: p.healthCheck || { status: 'unknown' }
  }));
}

module.exports = router;