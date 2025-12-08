// ============================================
// routes/dataplan.js - COMPLETE FIXED VERSION
// ============================================
// This makes backend work with frontend's name-parsing logic

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const DataPlan = require('../models/DataPlan');
const { calculateCustomerPrice } = require('../config/pricing');

const NETWORK_INFO = {
  mtn: { name: 'MTN', logo: '🟡', color: '#FFCC00', description: 'MTN Nigeria - Everywhere you go' },
  glo: { name: 'Glo', logo: '🟢', color: '#00A859', description: 'Glo Mobile - Unlimited possibilities' },
  '9mobile': { name: '9mobile', logo: '🟢', color: '#006838', description: '9mobile - More than you expect' },
  airtel: { name: 'Airtel', logo: '🔴', color: '#ED1C24', description: 'Airtel Nigeria - The smartphone network' }
};

const getLastModified = () => {
  return new Date();
};

const setCacheHeaders = (res, maxAge = 3600) => {
  res.set({
    'Cache-Control': `public, max-age=${maxAge}`,
    'Last-Modified': getLastModified().toUTCString()
  });
};

// ✅ UPDATED: Add 'type' field based on name (matching frontend logic)
const addPricingToPlans = (plans) => {
  return plans.map(plan => {
    const pricing = calculateCustomerPrice(plan.providerCost, 'data');
    
    // ✅ Categorize based on plan NAME (exactly like frontend does)
    const nameLower = plan.name.toLowerCase();
    let type = 'regular'; // Default
    
    // Check SME first (frontend checks SME before gift)
    if (nameLower.includes('sme') || nameLower.includes('corporate')) {
      type = 'sme';
    } 
    // Then check Gift
    else if (nameLower.includes('gift') || nameLower.includes('gifting')) {
      type = 'gift';
    }
    // Everything else is 'regular' (Direct Data)
    
    return {
      id: plan.planId,
      planId: plan.planId,
      network: plan.network,
      name: plan.name,
      dataSize: plan.dataSize,
      validity: plan.validity,
      category: plan.category,
      planType: plan.planType || 'direct',
      type: type, // ✅ Frontend will use this
      providerCost: plan.providerCost,
      customerPrice: pricing.customerPrice,
      amount: pricing.customerPrice, // ✅ Also add 'amount' for frontend
      profit: pricing.profit,
      popular: plan.popular || false,
      active: plan.active !== false
    };
  });
};

// GET /api/data/networks
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

// GET /api/data/plans/:network
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

// GET /api/data/plans/:network/types
router.get('/plans/:network/types', authenticate, async (req, res) => {
  try {
    const { network } = req.params;
    const normalizedNetwork = network.toLowerCase();

    const validNetworks = ['mtn', 'airtel', 'glo', '9mobile'];
    if (!validNetworks.includes(normalizedNetwork)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid network'
      });
    }

    setCacheHeaders(res);

    const plans = await DataPlan.find({ 
      network: normalizedNetwork, 
      active: true 
    });

    const formattedPlans = addPricingToPlans(plans);

    // ✅ Count by 'type' field (regular, sme, gift)
    const regularPlans = formattedPlans.filter(p => p.type === 'regular');
    const smePlans = formattedPlans.filter(p => p.type === 'sme');
    const giftPlans = formattedPlans.filter(p => p.type === 'gift');

    const typeCounts = [
      { 
        type: 'regular',
        count: regularPlans.length,
        label: 'Regular Data',
        description: 'Direct data plans, instant delivery',
        startingPrice: regularPlans.length > 0 ? Math.min(...regularPlans.map(p => p.customerPrice)) : null
      },
      { 
        type: 'sme',
        count: smePlans.length,
        label: 'SME Data',
        description: 'Cheapest, may have delays',
        startingPrice: smePlans.length > 0 ? Math.min(...smePlans.map(p => p.customerPrice)) : null
      },
      { 
        type: 'gift',
        count: giftPlans.length,
        label: 'Gift Data',
        description: 'Giftable data plans',
        startingPrice: giftPlans.length > 0 ? Math.min(...giftPlans.map(p => p.customerPrice)) : null
      }
    ];

    const networkInfo = NETWORK_INFO[normalizedNetwork];

    res.json({
      success: true,
      network: {
        code: normalizedNetwork,
        ...networkInfo
      },
      planTypes: typeCounts,
      message: `Available plan types for ${normalizedNetwork.toUpperCase()}`
    });

  } catch (error) {
    console.error('Plan types error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error retrieving plan types'
    });
  }
});

// GET /api/data/plans/:network/type/:planType
router.get('/plans/:network/type/:planType', authenticate, async (req, res) => {
  try {
    const { network, planType } = req.params;
    const normalizedNetwork = network.toLowerCase();
    const normalizedPlanType = planType.toLowerCase();

    const validNetworks = ['mtn', 'airtel', 'glo', '9mobile'];
    const validTypes = ['regular', 'sme', 'gift']; // ✅ Frontend uses these

    if (!validNetworks.includes(normalizedNetwork)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid network'
      });
    }

    if (!validTypes.includes(normalizedPlanType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid plan type. Valid: regular, sme, gift'
      });
    }

    setCacheHeaders(res);

    const plans = await DataPlan.find({ 
      network: normalizedNetwork,
      active: true 
    }).sort({ providerCost: 1 });

    const formattedPlans = addPricingToPlans(plans);
    
    // ✅ Filter by 'type' field (regular, sme, gift)
    const filteredPlans = formattedPlans.filter(p => p.type === normalizedPlanType);

    const networkInfo = NETWORK_INFO[normalizedNetwork];

    res.json({
      success: true,
      message: `${planType.toUpperCase()} plans for ${normalizedNetwork.toUpperCase()}`,
      network: {
        code: normalizedNetwork,
        ...networkInfo
      },
      planType: normalizedPlanType,
      plans: filteredPlans,
      count: filteredPlans.length,
      lastModified: getLastModified()
    });

  } catch (error) {
    console.error('Plan type error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
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

// GET /api/data/plan/:planId
router.get('/plan/:planId', authenticate, async (req, res) => {
  try {
    const { planId } = req.params;

    setCacheHeaders(res);

    const plan = await DataPlan.findOne({ planId, active: true });

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Data plan not found'
      });
    }

    const [formattedPlan] = addPricingToPlans([plan]);

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