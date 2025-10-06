// config/pricing.js - Tiered Pricing Configuration

const PRICING_CONFIG = {
  // Data Plans - Tiered markup based on provider cost
  data: {
    type: 'tiered',
    tiers: [
      { maxCost: 300, markup: 3, description: 'Very small plans (up to ₦300)' },     // ₦3 for plans ≤ ₦300
      { maxCost: 700, markup: 15, description: 'Small plans (₦301-₦700)' },          // ₦15 for plans ₦301-₦700
      { maxCost: 1500, markup: 30, description: 'Medium plans (₦701-₦1500)' },       // ₦30 for plans ₦701-₦1500
      { maxCost: 3000, markup: 40, description: 'Medium-large plans (₦1501-₦3000)' }, // ₦40 for plans ₦1501-₦3000
      { maxCost: Infinity, markup: 50, description: 'Large plans (above ₦3000)' }    // ₦50 for plans > ₦3000
    ],
    description: 'Tiered pricing based on plan cost'
  },

  // Airtime - Percentage markup
  airtime: {
    type: 'percentage',
    markup: 2,
    minProfit: 10,
    description: '2% markup on airtime'
  },

  // Electricity - Percentage markup
  electricity: {
    type: 'percentage',
    markup: 2,
    minProfit: 50,
    description: '2% markup on electricity'
  },

  // Cable TV - Fixed markup per package
  cable_tv: {
    type: 'fixed',
    markup: 0,
    description: 'Fixed ₦100 profit per cable subscription'
  },

  // Betting - Percentage markup
  fund_betting: {
    type: 'percentage',
    markup: 2.5,
    minProfit: 20,
    description: '2.5% markup on betting deposits'
  },

  // Education - Fixed markup
  education: {
    type: 'fixed',
    markup: 150,
    description: 'Fixed ₦150 profit per education payment'
  },

  // Print Recharge - Percentage markup
  print_recharge: {
    type: 'percentage',
    markup: 3,
    minProfit: 20,
    description: '3% markup on recharge cards'
  },

  // Internet (Smile) - Fixed markup
  internet: {
    type: 'fixed',
    markup: 100,
    description: 'Fixed ₦100 profit per internet bundle'
  }
};

/**
 * Calculate customer price from provider cost
 * @param {number} providerCost - What ClubKonnect charges you
 * @param {string} serviceType - Type of service (data, airtime, etc.)
 * @returns {object} - { providerCost, customerPrice, profit }
 */
function calculateCustomerPrice(providerCost, serviceType) {
  const config = PRICING_CONFIG[serviceType];
  
  if (!config) {
    throw new Error(`No pricing config found for service: ${serviceType}`);
  }

  let profit = 0;
  let customerPrice = 0;

  if (config.type === 'fixed') {
    // Fixed markup: just add the fixed amount
    profit = config.markup;
    customerPrice = providerCost + profit;
    
  } else if (config.type === 'percentage') {
    // Percentage markup: calculate percentage and ensure minimum
    const percentageProfit = (providerCost * config.markup) / 100;
    profit = Math.max(percentageProfit, config.minProfit || 0);
    customerPrice = providerCost + profit;
    
  } else if (config.type === 'tiered') {
    // Tiered markup: find the appropriate tier
    const tier = config.tiers.find(t => providerCost <= t.maxCost);
    if (tier) {
      profit = tier.markup;
      customerPrice = providerCost + profit;
    } else {
      throw new Error(`No tier found for cost: ${providerCost}`);
    }
  }

  // Round to nearest Naira
  customerPrice = Math.round(customerPrice);
  profit = Math.round(profit);

  return {
    providerCost: Math.round(providerCost),
    customerPrice,
    profit,
    markupType: config.type,
    markupValue: config.type === 'tiered' ? 'tiered' : config.markup
  };
}

/**
 * Get pricing info for a service
 * @param {string} serviceType - Type of service
 * @returns {object} - Pricing configuration
 */
function getPricingConfig(serviceType) {
  return PRICING_CONFIG[serviceType] || null;
}

/**
 * Calculate profit from a transaction
 * @param {number} customerPrice - What customer paid
 * @param {number} providerCost - What you paid ClubKonnect
 * @returns {number} - Your profit
 */
function calculateProfit(customerPrice, providerCost) {
  return Math.round(customerPrice - providerCost);
}

/**
 * Validate customer is paying correct price
 * @param {number} customerAmount - Amount customer is trying to pay
 * @param {number} providerCost - ClubKonnect's price
 * @param {string} serviceType - Service type
 * @returns {object} - { valid, expectedPrice, message }
 */
function validateCustomerPrice(customerAmount, providerCost, serviceType) {
  const pricing = calculateCustomerPrice(providerCost, serviceType);
  
  if (customerAmount === pricing.customerPrice) {
    return {
      valid: true,
      expectedPrice: pricing.customerPrice,
      profit: pricing.profit
    };
  }

  return {
    valid: false,
    expectedPrice: pricing.customerPrice,
    message: `Invalid amount. Expected: ₦${pricing.customerPrice.toLocaleString()}, Got: ₦${customerAmount.toLocaleString()}`
  };
}

module.exports = {
  PRICING_CONFIG,
  calculateCustomerPrice,
  getPricingConfig,
  calculateProfit,
  validateCustomerPrice
};