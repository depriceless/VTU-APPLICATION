// config/cableTVPackages.js - CABLE TV NO MARKUP (Data & Education unchanged)

const CABLE_TV_PACKAGES = {
  dstv: {
    name: 'DStv',
    code: 'dstv',
    packages: [
      { id: 'dstv-padi', name: 'DStv Padi', providerCost: 4400 },
      { id: 'dstv-yanga', name: 'DStv Yanga', providerCost: 6000 },
      { id: 'dstv-confam', name: 'DStv Confam', providerCost: 11000 },
      { id: 'dstv79', name: 'DStv Compact', providerCost: 19000 },
      { id: 'dstv7', name: 'DStv Compact Plus', providerCost: 30000 },
      { id: 'dstv3', name: 'DStv Premium', providerCost: 44500 },
      { id: 'dstv9', name: 'DStv Premium-French', providerCost: 69000 },
      { id: 'dstv10', name: 'DStv Premium-Asia', providerCost: 50500 },
      { id: 'confam-extra', name: 'DStv Confam + ExtraView', providerCost: 17000 },
      { id: 'yanga-extra', name: 'DStv Yanga + ExtraView', providerCost: 12000 },
      { id: 'padi-extra', name: 'DStv Padi + ExtraView', providerCost: 10400 },
      { id: 'dstv30', name: 'DStv Compact + Extra View', providerCost: 25000 },
      { id: 'com-frenchtouch', name: 'DStv Compact + French Touch', providerCost: 26000 },
      { id: 'dstv33', name: 'DStv Premium + Extra View', providerCost: 50500 },
      { id: 'com-frenchtouch-extra', name: 'DStv Compact + French Touch + ExtraView', providerCost: 32000 },
      { id: 'dstv43', name: 'DStv Compact Plus + French Plus', providerCost: 54500 },
      { id: 'complus-frenchtouch', name: 'DStv Compact Plus + French Touch', providerCost: 37000 },
      { id: 'dstv45', name: 'DStv Compact Plus + Extra View', providerCost: 36000 },
      { id: 'complus-french-extraview', name: 'DStv Compact Plus + FrenchPlus + Extra View', providerCost: 60500 },
      { id: 'dstv47', name: 'DStv Compact + French Plus', providerCost: 43500 },
      { id: 'dstv62', name: 'DStv Premium + French + Extra View', providerCost: 75000 },
      { id: 'frenchplus-addon', name: 'DStv French Plus Add-on', providerCost: 24500 },
      { id: 'dstv-greatwall', name: 'DStv Great Wall Standalone Bouquet', providerCost: 3800 },
      { id: 'frenchtouch-addon', name: 'DStv French Touch Add-on', providerCost: 7000 },
      { id: 'extraview-access', name: 'ExtraView Access', providerCost: 6000 },
      { id: 'dstv-yanga-showmax', name: 'DStv Yanga + Showmax', providerCost: 7750 },
      { id: 'dstv-greatwall-showmax', name: 'DStv Great Wall + Showmax', providerCost: 7300 },
      { id: 'dstv-compact-plus-showmax', name: 'DStv Compact Plus + Showmax', providerCost: 31750 },
      { id: 'dstv-confam-showmax', name: 'DStv Confam + Showmax', providerCost: 12750 },
      { id: 'dstv-compact-showmax', name: 'DStv Compact + Showmax', providerCost: 20750 },
      { id: 'dstv-padi-showmax', name: 'DStv Padi + Showmax', providerCost: 7900 },
      { id: 'dstv-asia-showmax', name: 'DStv Asia + Showmax', providerCost: 18400 },
      { id: 'dstv-premium-french-showmax', name: 'DStv Premium + French + Showmax', providerCost: 69000 },
      { id: 'dstv-premium-showmax', name: 'DStv Premium + Showmax', providerCost: 44500 },
      { id: 'dstv-indian', name: 'DStv Indian', providerCost: 14900 },
      { id: 'dstv-fta-plus', name: 'DStv FTA Plus', providerCost: 1600 },
      { id: 'dstv-access-1', name: 'DStv Access', providerCost: 2000 },
      { id: 'dstv-indian-add-on', name: 'DStv India Add-on', providerCost: 14900 },
      { id: 'dstv-mobile-1', name: 'DSTV MOBILE', providerCost: 790 }
    ]
  },

  gotv: {
    name: 'GOtv',
    code: 'gotv',
    packages: [
      { id: 'gotv-smallie', name: 'GOtv Smallie - monthly', providerCost: 1900 },
      { id: 'gotv-jinja', name: 'GOtv Jinja', providerCost: 3900 },
      { id: 'gotv-jolli', name: 'GOtv Jolli', providerCost: 5800 },
      { id: 'gotv-max', name: 'GOtv Max', providerCost: 8500 },
      { id: 'gotv-supa', name: 'GOtv Supa - monthly', providerCost: 11400 },
      { id: 'gotv-supa-plus', name: 'GOtv Supa Plus - monthly', providerCost: 16800 },
      { id: 'gotv-smallie-3months', name: 'GOtv Smallie - quarterly', providerCost: 5100 },
      { id: 'gotv-smallie-1year', name: 'GOtv Smallie - yearly', providerCost: 15000 }
    ]
  },

  startimes: {
    name: 'Startimes',
    code: 'startimes',
    packages: [
      { id: 'nova-weekly', name: 'Nova (Antenna) - 1 Week', providerCost: 700 },
      { id: 'nova-dish-weekly', name: 'Nova (Dish) - 1 Week', providerCost: 700 },
      { id: 'basic-weekly', name: 'Basic (Antenna) - 1 Week', providerCost: 1400 },
      { id: 'smart-weekly', name: 'Basic (Dish) - 1 Week', providerCost: 1700 },
      { id: 'classic-weekly', name: 'Classic (Antenna) - 1 Week', providerCost: 2000 },
      { id: 'classic-weekly-dish', name: 'Classic (Dish) - 1 Week', providerCost: 2500 },
      { id: 'super-antenna-weekly', name: 'Super (Antenna) - 1 Week', providerCost: 3200 },
      { id: 'super-weekly', name: 'Super (Dish) - 1 Week', providerCost: 3300 },
      { id: 'nova', name: 'Nova (Dish) - 1 Month', providerCost: 2100 },
      { id: 'uni-2', name: 'Nova (Antenna) - 1 Month', providerCost: 2100 },
      { id: 'basic', name: 'Basic (Antenna) - 1 Month', providerCost: 4000 },
      { id: 'smart', name: 'Basic (Dish) - 1 Month', providerCost: 5100 },
      { id: 'classic', name: 'Classic (Antenna) - 1 Month', providerCost: 6000 },
      { id: 'special-monthly', name: 'Classic (Dish) - 1 Month', providerCost: 7400 },
      { id: 'super-antenna-monthly', name: 'Super (Antenna) - 1 Month', providerCost: 9500 },
      { id: 'super', name: 'Super (Dish) - 1 Month', providerCost: 9800 },
      { id: 'uni-1', name: 'Chinese (Dish) - 1 month', providerCost: 21000 },
      { id: 'global-monthly-dish', name: 'Global (Dish) - 1 Month', providerCost: 21000 }
    ]
  }
};
const EDUCATION_SERVICES = {
  waec: {
    name: 'WAEC',
    code: 'waec',
    services: [
      { id: 'waecdirect', name: 'WAEC Result Checker PIN', providerCost: 3900 }
    ]
  },
  jamb: {
    name: 'JAMB',
    code: 'jamb',
    services: []
  }
};

const { calculateCustomerPrice } = require('./pricing');

// CABLE TV ONLY: Return ClubKonnect price directly (NO MARKUP)
function getCablePackageById(operator, packageId) {
  const packages = CABLE_TV_PACKAGES[operator]?.packages || [];
  const pkg = packages.find(p => p.id === packageId);
  
  if (!pkg) return null;
  
  // For Cable TV: Use ClubKonnect price directly
  return {
    ...pkg,
    customerPrice: pkg.providerCost,  // NO markup
    profit: 0  // Zero profit for Cable TV
  };
}

// CABLE TV ONLY: Return ClubKonnect prices directly (NO MARKUP)
function getCableTVPackages(operator) {
  const packages = CABLE_TV_PACKAGES[operator]?.packages || [];
  
  return packages.map(pkg => ({
    ...pkg,
    customerPrice: pkg.providerCost,  // NO markup
    profit: 0  // Zero profit for Cable TV
  }));
}

function getEducationService(provider, serviceId) {
  const services = EDUCATION_SERVICES[provider]?.services || [];
  const service = services.find(s => s.id === serviceId);
  
  if (!service) return null;
  
  // For Education: Use ClubKonnect price directly (no markup)
  return {
    ...service,
    customerPrice: service.providerCost,  // NO markup
    profit: 0  // Zero profit for Education
  };
}

module.exports = {
  CABLE_TV_PACKAGES,
  EDUCATION_SERVICES,
  getCableTVPackages,
  getCablePackageById,
  getEducationService
};