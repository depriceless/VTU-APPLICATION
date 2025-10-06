// routes/dataplan.js - REPLACE ENTIRE FILE WITH THIS
const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');

// Import from shared configuration - USE THE NEW FUNCTIONS
const {
  DATA_PLANS,
  NETWORK_INFO,
  getActivePlansForNetwork,  // These now calculate prices dynamically
  getPopularPlansForNetwork,
  getPlansByCategory
} = require('../config/dataPlans');

// Helper functions
const getLastModified = () => {
  return new Date();
};

const setCacheHeaders = (res, maxAge = 3600) => {
  res.set({
    'Cache-Control': `public, max-age=${maxAge}`,
    'Last-Modified': getLastModified().toUTCString()
  });
};

// GET /api/data/networks - Get all available networks
router.get('/networks', authenticate, async (req, res) => {
  try {
    setCacheHeaders(res, 7200);
    
    const networks = ['mtn', 'glo', 'airtel', '9mobile'];
    const networksWithStats = networks.map(network => {
      const plans = getActivePlansForNetwork(network);
      const popularPlans = plans.filter(p => p.popular);
      
      return {
        code: network,
        ...NETWORK_INFO[network],
        totalPlans: plans.length,
        popularPlans: popularPlans.length,
        priceRange: {
          min: Math.min(...plans.map(p => p.customerPrice)),
          max: Math.max(...plans.map(p => p.customerPrice))
        }
      };
    });

    res.json({
      success: true,
      message: 'Available networks retrieved',
      networks: networksWithStats,
      count: networksWithStats.length,
      lastModified: getLastModified()
    });

  } catch (error) {
    console.error('Networks error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error retrieving networks'
    });
  }
});

// GET /api/data/plans/:network - Get data plans for specific network
router.get('/plans/:network', authenticate, async (req, res) => {
  try {
    const { network } = req.params;
    const normalizedNetwork = network.toLowerCase();

    const validNetworks = ['mtn', 'airtel', 'glo', '9mobile'];
    if (!validNetworks.includes(normalizedNetwork)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid network. Valid networks are: mtn, airtel, glo, 9mobile'
      });
    }

    setCacheHeaders(res);

    // This now returns plans WITH customerPrice and profit calculated
    const plans = getActivePlansForNetwork(normalizedNetwork);
    const networkInfo = NETWORK_INFO[normalizedNetwork];

    if (!plans || plans.length === 0) {
      return res.status(404).json({
        success: false,
        message: `No plans available for ${normalizedNetwork.toUpperCase()}`
      });
    }

    // Format plans for response
    const formattedPlans = plans.map(plan => ({
      id: plan.id,
      planId: plan.id,
      network: normalizedNetwork,
      name: plan.name,
      dataSize: plan.dataSize,
      validity: plan.validity,
      category: plan.category,
      providerCost: plan.providerCost,
      customerPrice: plan.customerPrice,  // Now calculated dynamically
      profit: plan.profit,                 // Now calculated dynamically
      popular: plan.popular || false,
      active: plan.active !== false
    }));

    res.json({
      success: true,
      message: `Data plans retrieved for ${normalizedNetwork.toUpperCase()}`,
      network: {
        code: normalizedNetwork,
        ...networkInfo
      },
      plans: formattedPlans,
      count: formattedPlans.length,
      lastModified: getLastModified()
    });

  } catch (error) {
    console.error('Error fetching plans:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Server error retrieving data plans'
    });
  }
});

// GET /api/data/plans/:network/popular
router.get('/plans/:network/popular', authenticate, async (req, res) => {
  try {
    const { network } = req.params;
    const normalizedNetwork = network.toLowerCase();

    const validNetworks = ['mtn', 'airtel', 'glo', '9mobile'];
    if (!validNetworks.includes(normalizedNetwork)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid network. Valid networks are: mtn, airtel, glo, 9mobile'
      });
    }

    setCacheHeaders(res);

    const popularPlans = getPopularPlansForNetwork(normalizedNetwork);
    const networkInfo = NETWORK_INFO[normalizedNetwork];

    const formattedPlans = popularPlans.map(plan => ({
      ...plan,
      planId: plan.id,
      network: normalizedNetwork
    }));

    res.json({
      success: true,
      message: `Popular data plans retrieved for ${normalizedNetwork.toUpperCase()}`,
      network: {
        code: normalizedNetwork,
        ...networkInfo
      },
      plans: formattedPlans,
      count: formattedPlans.length,
      lastModified: getLastModified()
    });

  } catch (error) {
    console.error('Popular plans error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error retrieving popular plans'
    });
  }
});

// GET /api/data/plans/:network/categories
router.get('/plans/:network/categories', authenticate, async (req, res) => {
  try {
    const { network } = req.params;
    const normalizedNetwork = network.toLowerCase();

    const validNetworks = ['mtn', 'airtel', 'glo', '9mobile'];
    if (!validNetworks.includes(normalizedNetwork)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid network. Valid networks are: mtn, airtel, glo, 9mobile'
      });
    }

    setCacheHeaders(res);

    const plansByCategory = {
      daily: getPlansByCategory(normalizedNetwork, 'daily'),
      weekly: getPlansByCategory(normalizedNetwork, 'weekly'),
      monthly: getPlansByCategory(normalizedNetwork, 'monthly')
    };

    const formattedCategories = {};
    for (const [category, plans] of Object.entries(plansByCategory)) {
      formattedCategories[category] = plans.map(plan => ({
        ...plan,
        planId: plan.id,
        network: normalizedNetwork
      }));
    }

    const networkInfo = NETWORK_INFO[normalizedNetwork];

    res.json({
      success: true,
      message: `Data plans by category retrieved for ${normalizedNetwork.toUpperCase()}`,
      network: {
        code: normalizedNetwork,
        ...networkInfo
      },
      categories: formattedCategories,
      summary: {
        daily: formattedCategories.daily.length,
        weekly: formattedCategories.weekly.length,
        monthly: formattedCategories.monthly.length,
        total: formattedCategories.daily.length + formattedCategories.weekly.length + formattedCategories.monthly.length
      },
      lastModified: getLastModified()
    });

  } catch (error) {
    console.error('Categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error retrieving plan categories'
    });
  }
});

// GET /api/data/plan/:planId
router.get('/plan/:planId', authenticate, async (req, res) => {
  try {
    const { planId } = req.params;

    setCacheHeaders(res);

    let foundPlan = null;
    let networkName = null;

    const networks = ['mtn', 'glo', 'airtel', '9mobile'];
    for (const network of networks) {
      const plans = getActivePlansForNetwork(network);
      const plan = plans.find(p => p.id === planId);
      if (plan) {
        foundPlan = { 
          ...plan, 
          planId: plan.id, 
          network
        };
        networkName = network;
        break;
      }
    }

    if (!foundPlan) {
      return res.status(404).json({
        success: false,
        message: 'Data plan not found'
      });
    }

    const networkPlans = getActivePlansForNetwork(networkName);
    const similarPlans = networkPlans
      .filter(plan => 
        plan.id !== planId && 
        plan.category === foundPlan.category &&
        Math.abs(plan.customerPrice - foundPlan.customerPrice) <= 500
      )
      .slice(0, 3)
      .map(plan => ({ 
        ...plan, 
        planId: plan.id, 
        network: networkName
      }));

    const networkInfo = NETWORK_INFO[networkName];

    res.json({
      success: true,
      message: 'Data plan retrieved',
      plan: foundPlan,
      network: {
        code: networkName,
        ...networkInfo
      },
      similarPlans,
      lastModified: getLastModified()
    });

  } catch (error) {
    console.error('Single data plan error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error retrieving data plan'
    });
  }
});

module.exports = router;