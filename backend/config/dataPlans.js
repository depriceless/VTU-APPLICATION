// config/dataPlans.js - COMPLETE WITH ALL REQUIRED EXPORTS

const DATA_PLANS = {
  mtn: [
    // SME Plans
    { id: '2', name: '500MB - 30 days (SME)', dataSize: '500MB', validity: '30 days', amount: 424, category: 'SME', active: true, popular: false },
    { id: '4', name: '1GB - 30 days (SME)', dataSize: '1GB', validity: '30 days', amount: 595, category: 'SME', active: true, popular: true },
    { id: '5', name: '2GB - 30 days (SME)', dataSize: '2GB', validity: '30 days', amount: 1189, category: 'SME', active: true, popular: true },
    { id: '6', name: '3GB - 30 days (SME)', dataSize: '3GB', validity: '30 days', amount: 1680, category: 'SME', active: true, popular: false },
    { id: '8', name: '5GB - 30 days (SME)', dataSize: '5GB', validity: '30 days', amount: 2540, category: 'SME', active: true, popular: true },
    
    // Daily Plans (Awoof Data)
    { id: '38', name: '110MB Daily Plan', dataSize: '110MB', validity: '1 day', amount: 97, category: 'daily', active: true, popular: false },
    { id: '39', name: '230MB Daily Plan', dataSize: '230MB', validity: '1 day', amount: 194, category: 'daily', active: true, popular: false },
    { id: '40', name: '500MB Daily Plan', dataSize: '500MB', validity: '1 day', amount: 340, category: 'daily', active: true, popular: true },
    { id: '14', name: '1GB Daily Plan', dataSize: '1GB', validity: '1 day', amount: 485, category: 'daily', active: true, popular: true },
    { id: '15', name: '2.5GB Daily Plan', dataSize: '2.5GB', validity: '1 day', amount: 728, category: 'daily', active: true, popular: false },
    
    // 2-Day Plans
    { id: '16', name: '2.5GB 2-Day Plan', dataSize: '2.5GB', validity: '2 days', amount: 873, category: 'weekly', active: true, popular: false },
    { id: '17', name: '3.2GB 2-Day Plan', dataSize: '3.2GB', validity: '2 days', amount: 970, category: 'weekly', active: true, popular: false },
    
    // Weekly Plans (Direct Data)
    { id: '18', name: '500MB Weekly Plan', dataSize: '500MB', validity: '7 days', amount: 485, category: 'weekly', active: true, popular: false },
    { id: '19', name: '1GB Weekly Plan', dataSize: '1GB', validity: '7 days', amount: 776, category: 'weekly', active: true, popular: true },
    { id: '20', name: '6GB Weekly Plan', dataSize: '6GB', validity: '7 days', amount: 2425, category: 'weekly', active: true, popular: false },
    { id: '21', name: '11GB Weekly Bundle', dataSize: '11GB', validity: '7 days', amount: 3395, category: 'weekly', active: true, popular: false },
    { id: '36', name: '20GB Weekly Plan', dataSize: '20GB', validity: '7 days', amount: 4850, category: 'weekly', active: true, popular: false },
    
    // Monthly Plans (Direct Data)
    { id: '22', name: '2GB Monthly Plan', dataSize: '2GB', validity: '30 days', amount: 1455, category: 'monthly', active: true, popular: true },
    { id: '23', name: '2.7GB Monthly Plan', dataSize: '2.7GB', validity: '30 days', amount: 1940, category: 'monthly', active: true, popular: false },
    { id: '24', name: '3.5GB Monthly Plan', dataSize: '3.5GB', validity: '30 days', amount: 2425, category: 'monthly', active: true, popular: false },
    { id: '26', name: '7GB Monthly Plan', dataSize: '7GB', validity: '30 days', amount: 3395, category: 'monthly', active: true, popular: false },
    { id: '27', name: '10GB Monthly Plan', dataSize: '10GB', validity: '30 days', amount: 4365, category: 'monthly', active: true, popular: true },
    { id: '28', name: '12.5GB Monthly Plan', dataSize: '12.5GB', validity: '30 days', amount: 5335, category: 'monthly', active: true, popular: false },
    { id: '29', name: '16.5GB Monthly Plan', dataSize: '16.5GB', validity: '30 days', amount: 6305, category: 'monthly', active: true, popular: false },
    { id: '30', name: '20GB Monthly Plan', dataSize: '20GB', validity: '30 days', amount: 7275, category: 'monthly', active: true, popular: false },
    { id: '31', name: '25GB Monthly Plan', dataSize: '25GB', validity: '30 days', amount: 8730, category: 'monthly', active: true, popular: false },
    { id: '32', name: '36GB Monthly Plan', dataSize: '36GB', validity: '30 days', amount: 10670, category: 'monthly', active: true, popular: false },
    { id: '33', name: '75GB Monthly Plan', dataSize: '75GB', validity: '30 days', amount: 17460, category: 'monthly', active: true, popular: false },
    { id: '34', name: '165GB Monthly Plan', dataSize: '165GB', validity: '30 days', amount: 33950, category: 'monthly', active: true, popular: false },
    
    // Long-term Plans
    { id: '35', name: '150GB 2-Month Plan', dataSize: '150GB', validity: '60 days', amount: 38800, category: 'monthly', active: true, popular: false },
    { id: '37', name: '480GB 3-Month Plan', dataSize: '480GB', validity: '90 days', amount: 87300, category: 'monthly', active: true, popular: false }
  ],

  glo: [
    // SME Plans - 3 Days
    { id: '8', name: '1GB - 3 days (SME)', dataSize: '1GB', validity: '3 days', amount: 282, category: 'daily', active: true, popular: false },
    { id: '9', name: '3GB - 3 days (SME)', dataSize: '3GB', validity: '3 days', amount: 846, category: 'daily', active: true, popular: true },
    { id: '10', name: '5GB - 3 days (SME)', dataSize: '5GB', validity: '3 days', amount: 1410, category: 'daily', active: true, popular: false },
    
    // SME Plans - 7 Days
    { id: '11', name: '1GB - 7 days (SME)', dataSize: '1GB', validity: '7 days', amount: 329, category: 'weekly', active: true, popular: true },
    { id: '12', name: '3GB - 7 days (SME)', dataSize: '3GB', validity: '7 days', amount: 987, category: 'weekly', active: true, popular: true },
    { id: '13', name: '5GB - 7 days (SME)', dataSize: '5GB', validity: '7 days', amount: 1645, category: 'weekly', active: true, popular: false },
    
    // Night Plans
    { id: '37', name: '1GB - 14 days Night Plan', dataSize: '1GB', validity: '14 days', amount: 329, category: 'weekly', active: true, popular: false },
    { id: '38', name: '3GB - 14 days Night Plan', dataSize: '3GB', validity: '14 days', amount: 987, category: 'weekly', active: true, popular: false },
    { id: '39', name: '5GB - 14 days Night Plan', dataSize: '5GB', validity: '14 days', amount: 1645, category: 'weekly', active: true, popular: false },
    { id: '40', name: '10GB - 14 days Night Plan', dataSize: '10GB', validity: '14 days', amount: 3290, category: 'weekly', active: true, popular: false },
    
    // SME Plans - Monthly
    { id: '1', name: '200MB - 14 days (SME)', dataSize: '200MB', validity: '14 days', amount: 94, category: 'weekly', active: true, popular: false },
    { id: '2', name: '500MB - 30 days (SME)', dataSize: '500MB', validity: '30 days', amount: 235, category: 'monthly', active: true, popular: true },
    { id: '3', name: '1GB - 30 days (SME)', dataSize: '1GB', validity: '30 days', amount: 470, category: 'monthly', active: true, popular: true },
    { id: '4', name: '2GB - 30 days (SME)', dataSize: '2GB', validity: '30 days', amount: 940, category: 'monthly', active: true, popular: true },
    { id: '5', name: '3GB - 30 days (SME)', dataSize: '3GB', validity: '30 days', amount: 1410, category: 'monthly', active: true, popular: false },
    { id: '6', name: '5GB - 30 days (SME)', dataSize: '5GB', validity: '30 days', amount: 2350, category: 'monthly', active: true, popular: true },
    { id: '7', name: '10GB - 30 days (SME)', dataSize: '10GB', validity: '30 days', amount: 4700, category: 'monthly', active: true, popular: false },
    
    // Awoof Data
    { id: '14', name: '125MB - 1 day', dataSize: '125MB', validity: '1 day', amount: 95, category: 'daily', active: true, popular: false },
    { id: '15', name: '260MB - 2 day', dataSize: '260MB', validity: '2 days', amount: 191, category: 'daily', active: true, popular: false },
    { id: '28', name: '2GB - 1 day', dataSize: '2GB', validity: '1 day', amount: 477, category: 'daily', active: true, popular: true },
    
    // Direct Data Plans
    { id: '16', name: '1.5GB - 14 days', dataSize: '1.5GB', validity: '14 days', amount: 477, category: 'weekly', active: true, popular: false },
    { id: '29', name: '6GB - 7 days', dataSize: '6GB', validity: '7 days', amount: 1432, category: 'weekly', active: true, popular: false },
    { id: '17', name: '2.6GB - 30 days', dataSize: '2.6GB', validity: '30 days', amount: 955, category: 'monthly', active: true, popular: false },
    { id: '18', name: '5GB - 30 days', dataSize: '5GB', validity: '30 days', amount: 1432, category: 'monthly', active: true, popular: false },
    { id: '19', name: '6.15GB - 30 days', dataSize: '6.15GB', validity: '30 days', amount: 1910, category: 'monthly', active: true, popular: false },
    { id: '20', name: '7.5GB - 30 days', dataSize: '7.5GB', validity: '30 days', amount: 2387, category: 'monthly', active: true, popular: false },
    { id: '21', name: '10GB - 30 days', dataSize: '10GB', validity: '30 days', amount: 2865, category: 'monthly', active: true, popular: false },
    { id: '22', name: '12.5GB - 30 days', dataSize: '12.5GB', validity: '30 days', amount: 3820, category: 'monthly', active: true, popular: false },
    { id: '23', name: '16GB - 30 days', dataSize: '16GB', validity: '30 days', amount: 4775, category: 'monthly', active: true, popular: false },
    { id: '24', name: '28GB - 30 days', dataSize: '28GB', validity: '30 days', amount: 7640, category: 'monthly', active: true, popular: false },
    { id: '25', name: '38GB - 30 days', dataSize: '38GB', validity: '30 days', amount: 9550, category: 'monthly', active: true, popular: false },
    { id: '26', name: '64GB - 30 days', dataSize: '64GB', validity: '30 days', amount: 14325, category: 'monthly', active: true, popular: false },
    { id: '27', name: '107GB - 30 days', dataSize: '107GB', validity: '30 days', amount: 19100, category: 'monthly', active: true, popular: false },
    
    // Weekend Plans
    { id: '30', name: '2.5GB - Weekend Plan', dataSize: '2.5GB', validity: 'Sat & Sun', amount: 477, category: 'weekly', active: true, popular: false },
    { id: '31', name: '875MB - Weekend Plan', dataSize: '875MB', validity: 'Sunday', amount: 191, category: 'weekly', active: true, popular: false },
    
    // Large Plans
    { id: '32', name: '165GB - 30 days', dataSize: '165GB', validity: '30 days', amount: 28650, category: 'monthly', active: true, popular: false },
    { id: '33', name: '220GB - 30 days', dataSize: '220GB', validity: '30 days', amount: 34380, category: 'monthly', active: true, popular: false },
    { id: '34', name: '320GB - 30 days', dataSize: '320GB', validity: '30 days', amount: 47750, category: 'monthly', active: true, popular: false },
    { id: '35', name: '380GB - 30 days', dataSize: '380GB', validity: '30 days', amount: 57300, category: 'monthly', active: true, popular: false },
    { id: '36', name: '475GB - 30 days', dataSize: '475GB', validity: '30 days', amount: 71625, category: 'monthly', active: true, popular: false }
  ],

  '9mobile': [
    // Awoof Data
    { id: '14', name: '100MB - 1 day', dataSize: '100MB', validity: '1 day', amount: 93, category: 'daily', active: true, popular: false },
    { id: '15', name: '180MB - 1 day', dataSize: '180MB', validity: '1 day', amount: 140, category: 'daily', active: true, popular: false },
    { id: '16', name: '250MB - 1 day', dataSize: '250MB', validity: '1 day', amount: 186, category: 'daily', active: true, popular: true },
    { id: '17', name: '450MB - 1 day', dataSize: '450MB', validity: '1 day', amount: 326, category: 'daily', active: true, popular: false },
    { id: '18', name: '650MB - 3 days', dataSize: '650MB', validity: '3 days', amount: 465, category: 'daily', active: true, popular: false },
    
    // Direct Data Plans
    { id: '19', name: '1.75GB - 7 days', dataSize: '1.75GB', validity: '7 days', amount: 1395, category: 'weekly', active: true, popular: true },
    { id: '20', name: '650MB - 14 days', dataSize: '650MB', validity: '14 days', amount: 558, category: 'weekly', active: true, popular: false },
    { id: '21', name: '1.1GB - 30 days', dataSize: '1.1GB', validity: '30 days', amount: 930, category: 'monthly', active: true, popular: true },
    { id: '22', name: '1.4GB - 30 days', dataSize: '1.4GB', validity: '30 days', amount: 1116, category: 'monthly', active: true, popular: false },
    { id: '23', name: '2.44GB - 30 days', dataSize: '2.44GB', validity: '30 days', amount: 1860, category: 'monthly', active: true, popular: true },
    { id: '24', name: '3.17GB - 30 days', dataSize: '3.17GB', validity: '30 days', amount: 2325, category: 'monthly', active: true, popular: false },
    { id: '25', name: '3.91GB - 30 days', dataSize: '3.91GB', validity: '30 days', amount: 2790, category: 'monthly', active: true, popular: false },
    { id: '26', name: '5.10GB - 30 days', dataSize: '5.10GB', validity: '30 days', amount: 3720, category: 'monthly', active: true, popular: false },
    { id: '27', name: '6.5GB - 30 days', dataSize: '6.5GB', validity: '30 days', amount: 4650, category: 'monthly', active: true, popular: false },
    { id: '28', name: '16GB - 30 days', dataSize: '16GB', validity: '30 days', amount: 11160, category: 'monthly', active: true, popular: false },
    { id: '29', name: '24.3GB - 30 days', dataSize: '24.3GB', validity: '30 days', amount: 17205, category: 'monthly', active: true, popular: false },
    { id: '30', name: '26.5GB - 30 days', dataSize: '26.5GB', validity: '30 days', amount: 18600, category: 'monthly', active: true, popular: false },
    
    // Long-term Plans
    { id: '31', name: '39GB - 60 days', dataSize: '39GB', validity: '60 days', amount: 27900, category: 'monthly', active: true, popular: false },
    { id: '32', name: '78GB - 90 days', dataSize: '78GB', validity: '90 days', amount: 55800, category: 'monthly', active: true, popular: false },
    { id: '33', name: '190GB - 180 days', dataSize: '190GB', validity: '180 days', amount: 139500, category: 'monthly', active: true, popular: false }
  ],

  airtel: [
    // Awoof Data (1-2 days)
    { id: '14', name: '1GB - 1 day', dataSize: '1GB', validity: '1 day', amount: 484, category: 'daily', active: true, popular: true },
    { id: '15', name: '1.5GB - 2 days', dataSize: '1.5GB', validity: '2 days', amount: 581, category: 'daily', active: true, popular: false },
    { id: '16', name: '2GB - 2 days', dataSize: '2GB', validity: '2 days', amount: 726, category: 'daily', active: true, popular: true },
    { id: '17', name: '3GB - 2 days', dataSize: '3GB', validity: '2 days', amount: 968, category: 'daily', active: true, popular: false },
    { id: '18', name: '5GB - 2 days', dataSize: '5GB', validity: '2 days', amount: 1452, category: 'daily', active: true, popular: false },
    
    // Weekly Plans
    { id: '19', name: '500MB - 7 days', dataSize: '500MB', validity: '7 days', amount: 484, category: 'weekly', active: true, popular: false },
    { id: '20', name: '1GB - 7 days', dataSize: '1GB', validity: '7 days', amount: 774, category: 'weekly', active: true, popular: true },
    { id: '21', name: '1.5GB - 7 days', dataSize: '1.5GB', validity: '7 days', amount: 968, category: 'weekly', active: true, popular: false },
    { id: '22', name: '3.5GB - 7 days', dataSize: '3.5GB', validity: '7 days', amount: 1452, category: 'weekly', active: true, popular: false },
    { id: '23', name: '6GB - 7 days', dataSize: '6GB', validity: '7 days', amount: 2420, category: 'weekly', active: true, popular: true },
    { id: '24', name: '10GB - 7 days', dataSize: '10GB', validity: '7 days', amount: 2904, category: 'weekly', active: true, popular: false },
    { id: '25', name: '18GB - 7 days', dataSize: '18GB', validity: '7 days', amount: 4840, category: 'weekly', active: true, popular: false },
    
    // Monthly Plans
    { id: '26', name: '2GB - 30 days', dataSize: '2GB', validity: '30 days', amount: 1452, category: 'monthly', active: true, popular: true },
    { id: '27', name: '3GB - 30 days', dataSize: '3GB', validity: '30 days', amount: 1936, category: 'monthly', active: true, popular: false },
    { id: '28', name: '4GB - 30 days', dataSize: '4GB', validity: '30 days', amount: 2420, category: 'monthly', active: true, popular: false },
    { id: '29', name: '8GB - 30 days', dataSize: '8GB', validity: '30 days', amount: 2904, category: 'monthly', active: true, popular: false },
    { id: '30', name: '10GB - 30 days', dataSize: '10GB', validity: '30 days', amount: 3872, category: 'monthly', active: true, popular: true },
    { id: '31', name: '13GB - 30 days', dataSize: '13GB', validity: '30 days', amount: 4840, category: 'monthly', active: true, popular: false },
    { id: '32', name: '18GB - 30 days', dataSize: '18GB', validity: '30 days', amount: 5808, category: 'monthly', active: true, popular: false },
    { id: '33', name: '25GB - 30 days', dataSize: '25GB', validity: '30 days', amount: 7744, category: 'monthly', active: true, popular: false },
    { id: '34', name: '35GB - 30 days', dataSize: '35GB', validity: '30 days', amount: 9680, category: 'monthly', active: true, popular: false },
    { id: '35', name: '60GB - 30 days', dataSize: '60GB', validity: '30 days', amount: 14520, category: 'monthly', active: true, popular: false },
    { id: '36', name: '100GB - 30 days', dataSize: '100GB', validity: '30 days', amount: 19360, category: 'monthly', active: true, popular: false },
    { id: '37', name: '160GB - 30 days', dataSize: '160GB', validity: '30 days', amount: 29040, category: 'monthly', active: true, popular: false },
    { id: '38', name: '210GB - 30 days', dataSize: '210GB', validity: '30 days', amount: 38720, category: 'monthly', active: true, popular: false },
    
    // Long-term Plans
    { id: '39', name: '300GB - 90 days', dataSize: '300GB', validity: '90 days', amount: 48400, category: 'monthly', active: true, popular: false },
    { id: '40', name: '350GB - 90 days', dataSize: '350GB', validity: '90 days', amount: 58080, category: 'monthly', active: true, popular: false }
  ]
};

// Network information
const NETWORK_INFO = {
  mtn: {
    name: 'MTN',
    logo: '🟡',
    color: '#FFCC00',
    description: 'MTN Nigeria - Everywhere you go'
  },
  glo: {
    name: 'Glo',
    logo: '🟢',
    color: '#00A859',
    description: 'Glo Mobile - Unlimited possibilities'
  },
  '9mobile': {
    name: '9mobile',
    logo: '🟢',
    color: '#006838',
    description: '9mobile - More than you expect'
  },
  airtel: {
    name: 'Airtel',
    logo: '🔴',
    color: '#ED1C24',
    description: 'Airtel Nigeria - The smartphone network'
  }
};

// Last modified timestamp
const LAST_MODIFIED = new Date();

// Helper functions
const getActiveNetworks = () => {
  return Object.keys(DATA_PLANS).map(code => ({
    code,
    ...NETWORK_INFO[code]
  }));
};

const getActivePlansForNetwork = (network) => {
  const plans = DATA_PLANS[network] || [];
  return plans.filter(plan => plan.active !== false);
};

const getPopularPlansForNetwork = (network) => {
  const plans = getActivePlansForNetwork(network);
  return plans.filter(plan => plan.popular === true);
};

const getPlansByCategory = (network, category) => {
  const plans = getActivePlansForNetwork(network);
  return plans.filter(plan => plan.category === category);
};

const searchPlans = (network, filters = {}) => {
  let plans = getActivePlansForNetwork(network);
  
  if (filters.minAmount) {
    plans = plans.filter(p => p.amount >= filters.minAmount);
  }
  
  if (filters.maxAmount) {
    plans = plans.filter(p => p.amount <= filters.maxAmount);
  }
  
  if (filters.category) {
    plans = plans.filter(p => p.category === filters.category);
  }
  
  if (filters.popular !== undefined) {
    plans = plans.filter(p => p.popular === filters.popular);
  }
  
  return plans;
};

const getLastModified = () => {
  return LAST_MODIFIED;
};

module.exports = {
  DATA_PLANS,
  NETWORK_INFO,
  getActiveNetworks,
  getActivePlansForNetwork,
  getPopularPlansForNetwork,
  getPlansByCategory,
  searchPlans,
  getLastModified
};