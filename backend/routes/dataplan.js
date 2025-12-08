// routes/dataplan.js - MongoDB Version
const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const DataPlan = require('../models/DataPlan');
const { calculateCustomerPrice } = require('../config/pricing');

// Network info (keep this - it's just display info)
const NETWORK_INFO = {
  mtn: { name: 'MTN', logo: '🟡', color: '#FFCC00', description: 'MTN Nigeria - Everywhere you go' },
  glo: { name: 'Glo', logo: '🟢', color: '#00A859', description: 'Glo Mobile - Unlimited possibilities' },
  '9mobile': { name: '9mobile', logo: '🟢', color: '#006838', description: '9mobile - More than you expect' },
  airtel: { name: 'Airtel', logo: '🔴', color: '#ED1C24', description: 'Airtel Nigeria - The smartphone network' }
};

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

// Helper to add pricing to plans
const addPricingToPlans = (plans) => {
  return plans.map(plan => {
    const pricing = calculateCustomerPrice(plan.providerCost, 'data');
    return {
      id: plan.planId,
      planId: plan.planId,
      network: plan.network,
      name: plan.name,
      dataSize: plan.dataSize,
      validity: plan.validity,
      category: plan.category,
      providerCost: plan.providerCost,
      customerPrice: pricing.customerPrice,
      profit: pricing.profit,
      popular: plan.popular || false,
      active: plan.active !== false
    };
  });
};

// GET /api/data/networks - Get all available networks
router.get('/networks', authenticate, async (req, res) => {
  try {
    setCacheHeaders(res, 7200);
    
    const networks = ['mtn', 'glo', 'airtel', '9mobile'];
    const networksWithStats = await Promise.all(
      networks.map(async (network) => {
        const plans = await DataPlan.find({ network, active: true });
        const plansWithPricing = addPricingToPlans(plans);
        const popularPlans = plansWithPricing.filter(p => p.popular);
        
        return {
          code: network,
          ...NETWORK_INFO[network],
          totalPlans: plansWithPricing.length,
          popularPlans: popularPlans.length,
          priceRange: {
            min: Math.min(...plansWithPricing.map(p => p.customerPrice)),
            max: Math.max(...plansWithPricing.map(p => p.customerPrice))
          }
        };
      })
    );

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

    // Fetch plans from MongoDB
    const plans = await DataPlan.find({ 
      network: normalizedNetwork, 
      active: true 
    }).sort({ providerCost: 1 });

    if (!plans || plans.length === 0) {
      return res.status(404).json({
        success: false,
        message: `No plans available for ${normalizedNetwork.toUpperCase()}`
      });
    }

    // Add pricing to plans
    const formattedPlans = addPricingToPlans(plans);
    const networkInfo = NETWORK_INFO[normalizedNetwork];

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

    // Fetch popular plans from MongoDB
    const plans = await DataPlan.find({ 
      network: normalizedNetwork, 
      active: true,
      popular: true 
    }).sort({ providerCost: 1 });

    const formattedPlans = addPricingToPlans(plans);
    const networkInfo = NETWORK_INFO[normalizedNetwork];

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

    // Fetch plans by category from MongoDB
    const dailyPlans = await DataPlan.find({ 
      network: normalizedNetwork, 
      active: true, 
      category: 'daily' 
    }).sort({ providerCost: 1 });

    const weeklyPlans = await DataPlan.find({ 
      network: normalizedNetwork, 
      active: true, 
      category: 'weekly' 
    }).sort({ providerCost: 1 });

    const monthlyPlans = await DataPlan.find({ 
      network: normalizedNetwork, 
      active: true, 
      category: 'monthly' 
    }).sort({ providerCost: 1 });

    const formattedCategories = {
      daily: addPricingToPlans(dailyPlans),
      weekly: addPricingToPlans(weeklyPlans),
      monthly: addPricingToPlans(monthlyPlans)
    };

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

// GET /api/data/plan/:planId - Get single plan by ID
router.get('/plan/:planId', authenticate, async (req, res) => {
  try {
    const { planId } = req.params;

    setCacheHeaders(res);

    // Find plan in MongoDB (search all networks)
    const plan = await DataPlan.findOne({ planId, active: true });

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Data plan not found'
      });
    }

    // Add pricing to plan
    const [formattedPlan] = addPricingToPlans([plan]);

    // Find similar plans (same network, same category, similar price)
    const similarPlansData = await DataPlan.find({
      network: plan.network,
      category: plan.category,
      active: true,
      planId: { $ne: planId },
      providerCost: { 
        $gte: plan.providerCost - 500, 
        $lte: plan.providerCost + 500 
      }
    }).limit(3);

    const similarPlans = addPricingToPlans(similarPlansData);
    const networkInfo = NETWORK_INFO[plan.network];

    res.json({
      success: true,
      message: 'Data plan retrieved',
      plan: formattedPlan,
      network: {
        code: plan.network,
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