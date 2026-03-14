// config/pricing.js - Tiered Pricing + Round Up to nearest ₦5

const PRICING_CONFIG = {
  data: {
    type: 'tiered',
    tiers: [
      { maxCost: 300,      markup: 5   },
      { maxCost: 500,      markup: 10  },
      { maxCost: 1000,     markup: 15  },
      { maxCost: 2000,     markup: 20  },
      { maxCost: 5000,     markup: 30  },
      { maxCost: 10000,    markup: 100 },
      { maxCost: 20000,    markup: 150 },
      { maxCost: 50000,    markup: 200 },
      { maxCost: 100000,   markup: 300 },
      { maxCost: Infinity, markup: 500 },
    ]
  },
  electricity: {
    type: 'tiered',
    tiers: [
      { maxCost: 1000,     markup: 50  },
      { maxCost: 5000,     markup: 100 },
      { maxCost: Infinity, markup: 150 },
    ]
  },
  cabletv: {
    type: 'flat',
    markup: 50,
  }
};

// Round up to nearest N
const roundUpTo = (value, nearest) => Math.ceil(value / nearest) * nearest;

// ✅ Returns { providerCost, customerPrice, profit }
const calculateCustomerPrice = (providerCost, serviceType = 'data') => {
  const cost = parseFloat(providerCost) || 0;
  if (cost <= 0) return { providerCost: 0, customerPrice: 0, profit: 0 };

  const config = PRICING_CONFIG[serviceType];
  if (!config) return { providerCost: cost, customerPrice: cost, profit: 0 };

  let markup = 0;

  if (config.type === 'flat') {
    markup = config.markup;
  } else if (config.type === 'tiered') {
    const tier = config.tiers.find(t => cost <= t.maxCost);
    markup = tier ? tier.markup : 500;
  }

  // Round up to nearest ₦5 so prices look clean
  const rawPrice = cost + markup;
  const customerPrice = roundUpTo(rawPrice, 5);
  const profit = customerPrice - cost;

  return {
    providerCost: cost,
    customerPrice,
    profit
  };
};

// Full tier examples:
// ₦485    + ₦10  = ₦495    profit: ₦10
// ₦970    + ₦15  = ₦985    profit: ₦15
// ₦1,455  + ₦20  = ₦1,475  profit: ₦20
// ₦4,850  + ₦30  = ₦4,880  profit: ₦30
// ₦7,275  + ₦100 = ₦7,375  profit: ₦100
// ₦17,460 + ₦150 = ₦17,610 profit: ₦150
// ₦30,000 + ₦200 = ₦30,200 profit: ₦200
// ₦75,000 + ₦300 = ₦75,300 profit: ₦300
// ₦100,000+ ₦500 = ₦100,500 profit: ₦500

module.exports = { calculateCustomerPrice, PRICING_CONFIG };