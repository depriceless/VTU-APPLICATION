const express = require('express');
const router = express.Router();
const { authenticate, isAdmin } = require('../middleware/auth');
const PaymentGatewayConfig = require('../models/PaymentGatewayConfig');

// Get current payment gateway configuration
router.get('/config', authenticate, isAdmin, async (req, res) => {
  try {
    const config = await PaymentGatewayConfig.getConfig();
    
    // Don't send sensitive keys to frontend
    const safeConfig = {
      activeGateway: config.activeGateway,
      gateways: {
        paystack: {
          enabled: config.gateways.paystack.enabled,
          hasKeys: !!(config.gateways.paystack.publicKey && config.gateways.paystack.secretKey),
          lastUsed: config.gateways.paystack.lastUsed,
          totalTransactions: config.gateways.paystack.totalTransactions,
          successfulTransactions: config.gateways.paystack.successfulTransactions,
          totalAmount: config.gateways.paystack.totalAmount,
          successRate: config.gateways.paystack.totalTransactions > 0 
            ? ((config.gateways.paystack.successfulTransactions / config.gateways.paystack.totalTransactions) * 100).toFixed(2)
            : 0
        },
        monnify: {
          enabled: config.gateways.monnify.enabled,
          hasKeys: !!(config.gateways.monnify.apiKey && config.gateways.monnify.secretKey),
          lastUsed: config.gateways.monnify.lastUsed,
          totalTransactions: config.gateways.monnify.totalTransactions,
          successfulTransactions: config.gateways.monnify.successfulTransactions,
          totalAmount: config.gateways.monnify.totalAmount,
          successRate: config.gateways.monnify.totalTransactions > 0 
            ? ((config.gateways.monnify.successfulTransactions / config.gateways.monnify.totalTransactions) * 100).toFixed(2)
            : 0
        }
      },
      lastSwitchedAt: config.lastSwitchedAt,
      recentSwitches: config.switchHistory.slice(-5).reverse()
    };

    res.json({
      success: true,
      data: safeConfig
    });
  } catch (error) {
    console.error('❌ Get gateway config error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payment gateway configuration'
    });
  }
});

// Switch active payment gateway
router.post('/switch', authenticate, isAdmin, async (req, res) => {
  try {
    const { gateway, reason } = req.body;

    if (!gateway || !['paystack', 'monnify'].includes(gateway)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid gateway. Must be "paystack" or "monnify"'
      });
    }

    const config = await PaymentGatewayConfig.getConfig();

    // Check if trying to switch to the same gateway
    if (config.activeGateway === gateway) {
      return res.status(400).json({
        success: false,
        message: `${gateway.charAt(0).toUpperCase() + gateway.slice(1)} is already the active gateway`
      });
    }

    // Check if gateway is enabled
    if (!config.gateways[gateway].enabled) {
      return res.status(400).json({
        success: false,
        message: `${gateway.charAt(0).toUpperCase() + gateway.slice(1)} gateway is currently disabled`
      });
    }

    // Check if gateway has API keys configured
    const hasKeys = gateway === 'paystack' 
      ? !!(config.gateways.paystack.publicKey && config.gateways.paystack.secretKey)
      : !!(config.gateways.monnify.apiKey && config.gateways.monnify.secretKey);

    if (!hasKeys) {
      return res.status(400).json({
        success: false,
        message: `${gateway.charAt(0).toUpperCase() + gateway.slice(1)} gateway API keys are not configured`
      });
    }

    const previousGateway = config.activeGateway;

    // Update configuration
    config.activeGateway = gateway;
    config.lastSwitchedBy = req.user.id;
    config.lastSwitchedAt = new Date();
    
    // Add to switch history
    config.switchHistory.push({
      from: previousGateway,
      to: gateway,
      switchedBy: req.user.id,
      switchedAt: new Date(),
      reason: reason || 'Manual switch by admin'
    });

    await config.save();

    console.log(`✅ Payment gateway switched from ${previousGateway} to ${gateway} by admin ${req.user.id}`);

    res.json({
      success: true,
      message: `Payment gateway successfully switched to ${gateway.charAt(0).toUpperCase() + gateway.slice(1)}`,
      data: {
        activeGateway: gateway,
        previousGateway,
        switchedAt: new Date()
      }
    });
  } catch (error) {
    console.error('❌ Switch gateway error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to switch payment gateway'
    });
  }
});

// Update gateway API keys
router.put('/keys/:gateway', authenticate, isAdmin, async (req, res) => {
  try {
    const { gateway } = req.params;
    const keys = req.body;

    if (!['paystack', 'monnify'].includes(gateway)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid gateway'
      });
    }

    const config = await PaymentGatewayConfig.getConfig();

    if (gateway === 'paystack') {
      if (keys.publicKey) config.gateways.paystack.publicKey = keys.publicKey;
      if (keys.secretKey) config.gateways.paystack.secretKey = keys.secretKey;
    } else {
      if (keys.apiKey) config.gateways.monnify.apiKey = keys.apiKey;
      if (keys.secretKey) config.gateways.monnify.secretKey = keys.secretKey;
      if (keys.contractCode) config.gateways.monnify.contractCode = keys.contractCode;
    }

    await config.save();

    console.log(`✅ ${gateway} API keys updated by admin ${req.user.id}`);

    res.json({
      success: true,
      message: `${gateway.charAt(0).toUpperCase() + gateway.slice(1)} API keys updated successfully`
    });
  } catch (error) {
    console.error('❌ Update keys error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update API keys'
    });
  }
});

// Toggle gateway enabled/disabled
router.patch('/toggle/:gateway', authenticate, isAdmin, async (req, res) => {
  try {
    const { gateway } = req.params;
    const { enabled } = req.body;

    if (!['paystack', 'monnify'].includes(gateway)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid gateway'
      });
    }

    const config = await PaymentGatewayConfig.getConfig();
    
    // Don't allow disabling the active gateway
    if (config.activeGateway === gateway && enabled === false) {
      return res.status(400).json({
        success: false,
        message: 'Cannot disable the currently active gateway. Switch to another gateway first.'
      });
    }

    config.gateways[gateway].enabled = enabled;
    await config.save();

    console.log(`✅ ${gateway} gateway ${enabled ? 'enabled' : 'disabled'} by admin ${req.user.id}`);

    res.json({
      success: true,
      message: `${gateway.charAt(0).toUpperCase() + gateway.slice(1)} gateway ${enabled ? 'enabled' : 'disabled'} successfully`
    });
  } catch (error) {
    console.error('❌ Toggle gateway error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to toggle gateway status'
    });
  }
});

console.log('✅ Payment Gateway Config routes initialized');

module.exports = router;
