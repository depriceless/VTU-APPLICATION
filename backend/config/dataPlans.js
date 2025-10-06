// config/dataPlans.js - Dynamic Pricing Version
// Only store provider costs - prices calculated on-the-fly

const DATA_PLANS = {
  mtn: [
    // SME Plans
    { id: '500.0', name: '500MB - 30 days (SME)', dataSize: '500MB', validity: '30 days', providerCost: 424, category: 'monthly', active: true, popular: false },
    { id: '1000.0', name: '1GB - 30 days (SME)', dataSize: '1GB', validity: '30 days', providerCost: 595, category: 'monthly', active: true, popular: true },
    { id: '2000.0', name: '2GB - 30 days (SME)', dataSize: '2GB', validity: '30 days', providerCost: 1189, category: 'monthly', active: true, popular: true },
    { id: '3000.0', name: '3GB - 30 days (SME)', dataSize: '3GB', validity: '30 days', providerCost: 1680, category: 'monthly', active: true, popular: false },
    { id: '5000.0', name: '5GB - 30 days (SME)', dataSize: '5GB', validity: '30 days', providerCost: 2540, category: 'monthly', active: true, popular: true },
    
    // Daily Plans
    { id: '100.01', name: '110MB Daily Plan', dataSize: '110MB', validity: '1 day', providerCost: 97, category: 'daily', active: true, popular: false },
    { id: '200.01', name: '230MB Daily Plan', dataSize: '230MB', validity: '1 day', providerCost: 194, category: 'daily', active: true, popular: false },
    { id: '350.01', name: '500MB Daily Plan', dataSize: '500MB', validity: '1 day', providerCost: 339.50, category: 'daily', active: true, popular: true },
    { id: '500.01', name: '1GB Daily Plan', dataSize: '1GB', validity: '1 day', providerCost: 485, category: 'daily', active: true, popular: true },
    { id: '750.01', name: '2.5GB Daily Plan', dataSize: '2.5GB', validity: '1 day', providerCost: 727.50, category: 'daily', active: true, popular: false },
    
    // 2-Day Plans
    { id: '900.01', name: '2.5GB 2-Day Plan', dataSize: '2.5GB', validity: '2 days', providerCost: 873, category: 'daily', active: true, popular: false },
    { id: '1000.01', name: '3.2GB 2-Day Plan', dataSize: '3.2GB', validity: '2 days', providerCost: 970, category: 'daily', active: true, popular: false },
    
    // Weekly Plans
    { id: '500.02', name: '500MB Weekly Plan', dataSize: '500MB', validity: '7 days', providerCost: 485, category: 'weekly', active: true, popular: false },
    { id: '800.01', name: '1GB Weekly Plan', dataSize: '1GB', validity: '7 days', providerCost: 776, category: 'weekly', active: true, popular: true },
    { id: '2500.01', name: '6GB Weekly Plan', dataSize: '6GB', validity: '7 days', providerCost: 2425, category: 'weekly', active: true, popular: false },
    { id: '3500.01', name: '11GB Weekly Bundle', dataSize: '11GB', validity: '7 days', providerCost: 3395, category: 'weekly', active: true, popular: false },
    { id: '5000.01', name: '20GB Weekly Plan', dataSize: '20GB', validity: '7 days', providerCost: 4850, category: 'weekly', active: true, popular: false },
    
    // Monthly Plans
    { id: '1500.02', name: '2GB+2mins Monthly', dataSize: '2GB', validity: '30 days', providerCost: 1455, category: 'monthly', active: true, popular: true },
    { id: '2000.01', name: '2.7GB+2mins Monthly', dataSize: '2.7GB', validity: '30 days', providerCost: 1940, category: 'monthly', active: true, popular: false },
    { id: '2500.02', name: '3.5GB+5mins Monthly', dataSize: '3.5GB', validity: '30 days', providerCost: 2425, category: 'monthly', active: true, popular: false },
    { id: '3500.02', name: '7GB Monthly Plan', dataSize: '7GB', validity: '30 days', providerCost: 3395, category: 'monthly', active: true, popular: false },
    { id: '4500.01', name: '10GB+10mins Monthly', dataSize: '10GB', validity: '30 days', providerCost: 4365, category: 'monthly', active: true, popular: true },
    { id: '5500.01', name: '12.5GB Monthly', dataSize: '12.5GB', validity: '30 days', providerCost: 5335, category: 'monthly', active: true, popular: false },
    { id: '6500.01', name: '16.5GB+10mins Monthly', dataSize: '16.5GB', validity: '30 days', providerCost: 6305, category: 'monthly', active: true, popular: false },
    { id: '7500.01', name: '20GB Monthly', dataSize: '20GB', validity: '30 days', providerCost: 7275, category: 'monthly', active: true, popular: false },
    { id: '9000.01', name: '25GB Monthly', dataSize: '25GB', validity: '30 days', providerCost: 8730, category: 'monthly', active: true, popular: false },
    { id: '11000.01', name: '36GB Monthly', dataSize: '36GB', validity: '30 days', providerCost: 10670, category: 'monthly', active: true, popular: false },
    { id: '18000.01', name: '75GB Monthly', dataSize: '75GB', validity: '30 days', providerCost: 17460, category: 'monthly', active: true, popular: false },
    { id: '35000.01', name: '165GB Monthly', dataSize: '165GB', validity: '30 days', providerCost: 33950, category: 'monthly', active: true, popular: false },
    
    // Long-term Plans
    { id: '40000.01', name: '150GB 2-Month', dataSize: '150GB', validity: '60 days', providerCost: 38800, category: 'monthly', active: true, popular: false },
    { id: '90000.03', name: '480GB 3-Month', dataSize: '480GB', validity: '90 days', providerCost: 87300, category: 'monthly', active: true, popular: false }
  ],

  glo: [
    // SME Plans - 3 Days
    { id: '1000.11', name: '1GB - 3 days (SME)', dataSize: '1GB', validity: '3 days', providerCost: 282, category: 'daily', active: true, popular: false },
    { id: '3000.11', name: '3GB - 3 days (SME)', dataSize: '3GB', validity: '3 days', providerCost: 846, category: 'daily', active: true, popular: true },
    { id: '5000.11', name: '5GB - 3 days (SME)', dataSize: '5GB', validity: '3 days', providerCost: 1410, category: 'daily', active: true, popular: false },
    
    // SME Plans - 7 Days
    { id: '1000.12', name: '1GB - 7 days (SME)', dataSize: '1GB', validity: '7 days', providerCost: 329, category: 'weekly', active: true, popular: true },
    { id: '3000.12', name: '3GB - 7 days (SME)', dataSize: '3GB', validity: '7 days', providerCost: 987, category: 'weekly', active: true, popular: true },
    { id: '5000.12', name: '5GB - 7 days (SME)', dataSize: '5GB', validity: '7 days', providerCost: 1645, category: 'weekly', active: true, popular: false },
    
    // Night Plans
    { id: '1000.21', name: '1GB - 14 days Night', dataSize: '1GB', validity: '14 days', providerCost: 329, category: 'weekly', active: true, popular: false },
    { id: '3000.21', name: '3GB - 14 days Night', dataSize: '3GB', validity: '14 days', providerCost: 987, category: 'weekly', active: true, popular: false },
    { id: '5000.21', name: '5GB - 14 days Night', dataSize: '5GB', validity: '14 days', providerCost: 1645, category: 'weekly', active: true, popular: false },
    { id: '10000.21', name: '10GB - 14 days Night', dataSize: '10GB', validity: '14 days', providerCost: 3290, category: 'weekly', active: true, popular: false },
    
    // Monthly Plans
    { id: '200', name: '200MB - 14 days (SME)', dataSize: '200MB', validity: '14 days', providerCost: 94, category: 'weekly', active: true, popular: false },
    { id: '500', name: '500MB - 30 days (SME)', dataSize: '500MB', validity: '30 days', providerCost: 235, category: 'monthly', active: true, popular: true },
    { id: '1000', name: '1GB - 30 days (SME)', dataSize: '1GB', validity: '30 days', providerCost: 470, category: 'monthly', active: true, popular: true },
    { id: '2000', name: '2GB - 30 days (SME)', dataSize: '2GB', validity: '30 days', providerCost: 940, category: 'monthly', active: true, popular: true },
    { id: '3000', name: '3GB - 30 days (SME)', dataSize: '3GB', validity: '30 days', providerCost: 1410, category: 'monthly', active: true, popular: false },
    { id: '5000', name: '5GB - 30 days (SME)', dataSize: '5GB', validity: '30 days', providerCost: 2350, category: 'monthly', active: true, popular: true },
    { id: '10000', name: '10GB - 30 days (SME)', dataSize: '10GB', validity: '30 days', providerCost: 4700, category: 'monthly', active: true, popular: false }
  ],

  '9mobile': [
    // Daily Plans
    { id: '100.01', name: '100MB - 1 day', dataSize: '100MB', validity: '1 day', providerCost: 93, category: 'daily', active: true, popular: false },
    { id: '150.01', name: '180MB - 1 day', dataSize: '180MB', validity: '1 day', providerCost: 139.50, category: 'daily', active: true, popular: false },
    { id: '200.01', name: '250MB - 1 day', dataSize: '250MB', validity: '1 day', providerCost: 186, category: 'daily', active: true, popular: true },
    { id: '350.01', name: '450MB - 1 day', dataSize: '450MB', validity: '1 day', providerCost: 325.50, category: 'daily', active: true, popular: false },
    { id: '500.01', name: '650MB - 3 days', dataSize: '650MB', validity: '3 days', providerCost: 465, category: 'daily', active: true, popular: false },
    
    // Weekly & Monthly Plans
    { id: '1500.01', name: '1.75GB - 7 days', dataSize: '1.75GB', validity: '7 days', providerCost: 1395, category: 'weekly', active: true, popular: true },
    { id: '600.01', name: '650MB - 14 days', dataSize: '650MB', validity: '14 days', providerCost: 558, category: 'weekly', active: true, popular: false },
    { id: '1000.01', name: '1.1GB - 30 days', dataSize: '1.1GB', validity: '30 days', providerCost: 930, category: 'monthly', active: true, popular: true },
    { id: '1200.01', name: '1.4GB - 30 days', dataSize: '1.4GB', validity: '30 days', providerCost: 1116, category: 'monthly', active: true, popular: false },
    { id: '2000.01', name: '2.44GB - 30 days', dataSize: '2.44GB', validity: '30 days', providerCost: 1860, category: 'monthly', active: true, popular: true }
  ],

  airtel: [
    // Daily Plans
    { id: '499.91', name: '1GB - 1 day', dataSize: '1GB', validity: '1 day', providerCost: 483.91, category: 'daily', active: true, popular: true },
    { id: '599.91', name: '1.5GB - 2 days', dataSize: '1.5GB', validity: '2 days', providerCost: 580.71, category: 'daily', active: true, popular: false },
    { id: '749.91', name: '2GB - 2 days', dataSize: '2GB', validity: '2 days', providerCost: 725.91, category: 'daily', active: true, popular: true },
    
    // Weekly Plans
    { id: '499.92', name: '500MB - 7 days', dataSize: '500MB', validity: '7 days', providerCost: 483.92, category: 'weekly', active: true, popular: false },
    { id: '799.91', name: '1GB - 7 days', dataSize: '1GB', validity: '7 days', providerCost: 774.31, category: 'weekly', active: true, popular: true },
    { id: '2499.91', name: '6GB - 7 days', dataSize: '6GB', validity: '7 days', providerCost: 2419.91, category: 'weekly', active: true, popular: true },
    
    // Monthly Plans
    { id: '1499.93', name: '2GB - 30 days', dataSize: '2GB', validity: '30 days', providerCost: 1451.93, category: 'monthly', active: true, popular: true },
    { id: '1999.91', name: '3GB - 30 days', dataSize: '3GB', validity: '30 days', providerCost: 1935.91, category: 'monthly', active: true, popular: false },
    { id: '3999.91', name: '10GB - 30 days', dataSize: '10GB', validity: '30 days', providerCost: 3871.91, category: 'monthly', active: true, popular: true }
  ]
};

const NETWORK_INFO = {
  mtn: { name: 'MTN', logo: '🟡', color: '#FFCC00', description: 'MTN Nigeria - Everywhere you go' },
  glo: { name: 'Glo', logo: '🟢', color: '#00A859', description: 'Glo Mobile - Unlimited possibilities' },
  '9mobile': { name: '9mobile', logo: '🟢', color: '#006838', description: '9mobile - More than you expect' },
  airtel: { name: 'Airtel', logo: '🔴', color: '#ED1C24', description: 'Airtel Nigeria - The smartphone network' }
};

// Import pricing calculator
const { calculateCustomerPrice } = require('./pricing');

// Get single plan with dynamic pricing
const getPlanWithPricing = (network, planId) => {
  const plans = DATA_PLANS[network] || [];
  const plan = plans.find(p => p.id === planId);
  
  if (!plan) return null;
  
  const pricing = calculateCustomerPrice(plan.providerCost, 'data');
  
  return {
    ...plan,
    customerPrice: pricing.customerPrice,
    profit: pricing.profit
  };
};

// Get all active plans with dynamic pricing
const getActivePlansForNetwork = (network) => {
  const plans = DATA_PLANS[network] || [];
  
  return plans
    .filter(plan => plan.active !== false)
    .map(plan => {
      const pricing = calculateCustomerPrice(plan.providerCost, 'data');
      return {
        ...plan,
        customerPrice: pricing.customerPrice,
        profit: pricing.profit
      };
    });
};

// Get popular plans with dynamic pricing
const getPopularPlansForNetwork = (network) => {
  return getActivePlansForNetwork(network).filter(plan => plan.popular === true);
};

// Get plans by category with dynamic pricing
const getPlansByCategory = (network, category) => {
  return getActivePlansForNetwork(network).filter(plan => plan.category === category);
};

const getActiveNetworks = () => {
  return Object.keys(DATA_PLANS).map(code => ({ 
    code, 
    ...NETWORK_INFO[code] 
  }));
};

module.exports = {
  DATA_PLANS,
  NETWORK_INFO,
  getActiveNetworks,
  getPlanWithPricing,
  getActivePlansForNetwork,
  getPopularPlansForNetwork,
  getPlansByCategory
};