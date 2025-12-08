// ============================================
// config/cableTVPackages.js - CLEANED VERSION
// ============================================
// Cable TV packages are now fetched from MongoDB via syncCablePlans.js
// This file only maintains operator metadata and pricing rules

const CABLE_OPERATORS = {
  dstv: {
    name: 'DStv',
    code: 'dstv',
    description: 'DStv - Africa\'s leading entertainment service',
    clubkonnectCode: 'dstv',
    color: '#0055A5',
    popular: true,
    active: true
  },
  gotv: {
    name: 'GOtv',
    code: 'gotv',
    description: 'GOtv - Affordable entertainment for everyone',
    clubkonnectCode: 'gotv',
    color: '#FF0000',
    popular: true,
    active: true
  },
  startimes: {
    name: 'Startimes',
    code: 'startimes',
    description: 'Startimes - Digital TV for all',
    clubkonnectCode: 'startimes',
    color: '#FFA500',
    popular: false,
    active: true
  }
};

// ============================================
// PRICING CONFIGURATION
// ============================================
const CABLE_PRICING = {
  // Cable TV has NO MARKUP - pass-through pricing
  markup: 0,
  markupType: 'flat', // 'flat' or 'percentage'
  
  // Minimum transaction amounts
  minAmount: 500,
  maxAmount: 200000,
  
  // Commission structure (for your records, not applied to customer)
  commissionRates: {
    dstv: 0,    // 0% commission on DStv
    gotv: 0,    // 0% commission on GOtv
    startimes: 0 // 0% commission on Startimes
  }
};

// ============================================
// BUSINESS RULES
// ============================================
const CABLE_RULES = {
  // Validation rules
  smartcard: {
    minLength: 10,
    maxLength: 12,
    pattern: /^\d+$/, // Only digits
  },
  
  // Auto-renewal settings
  autoRenewal: {
    enabled: false,
    reminderDays: 3 // Days before expiry to send reminder
  },
  
  // Popular package thresholds
  popularThreshold: {
    salesCount: 100, // Packages with 100+ sales become popular
    keywords: ['padi', 'yanga', 'smallie', 'nova', 'basic', 'compact'] // Keywords that mark packages as popular
  }
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get operator details by code
 */
function getOperatorByCode(code) {
  const normalizedCode = code.toLowerCase();
  return CABLE_OPERATORS[normalizedCode] || null;
}

/**
 * Get all active operators
 */
function getActiveOperators() {
  return Object.values(CABLE_OPERATORS).filter(op => op.active);
}

/**
 * Calculate customer price for cable TV (no markup)
 */
function calculateCablePrice(providerCost) {
  // Cable TV has zero markup
  return {
    providerCost: Number(providerCost),
    markup: 0,
    customerPrice: Number(providerCost),
    commission: 0
  };
}

/**
 * Validate smart card number
 */
function validateSmartCard(smartcard, operator) {
  if (!smartcard || typeof smartcard !== 'string') {
    return { valid: false, error: 'Smart card number is required' };
  }

  const cleaned = smartcard.trim();
  
  // Length check
  if (cleaned.length < CABLE_RULES.smartcard.minLength || 
      cleaned.length > CABLE_RULES.smartcard.maxLength) {
    return { 
      valid: false, 
      error: `Smart card must be ${CABLE_RULES.smartcard.minLength}-${CABLE_RULES.smartcard.maxLength} digits` 
    };
  }

  // Pattern check (only digits)
  if (!CABLE_RULES.smartcard.pattern.test(cleaned)) {
    return { valid: false, error: 'Smart card must contain only numbers' };
  }

  return { valid: true, smartcard: cleaned };
}

/**
 * Check if package is popular based on name keywords
 */
function isPopularPackage(packageName) {
  const nameLower = packageName.toLowerCase();
  return CABLE_RULES.popularThreshold.keywords.some(keyword => 
    nameLower.includes(keyword)
  );
}

// ============================================
// EXPORTS
// ============================================
module.exports = {
  CABLE_OPERATORS,
  CABLE_PRICING,
  CABLE_RULES,
  
  // Helper functions
  getOperatorByCode,
  getActiveOperators,
  calculateCablePrice,
  validateSmartCard,
  isPopularPackage
};