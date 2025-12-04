require('dotenv').config();
const mongoose = require('mongoose');
const PaymentGatewayConfig = require('../models/PaymentGatewayConfig');

async function setupGateways() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    console.log('🔄 Fetching/creating payment gateway config...');
    const config = await PaymentGatewayConfig.getConfig();
    
    // Configure Monnify
    console.log('🔧 Configuring Monnify...');
    config.gateways.monnify.apiKey = process.env.MONNIFY_API_KEY;
    config.gateways.monnify.secretKey = process.env.MONNIFY_SECRET_KEY;
    config.gateways.monnify.contractCode = process.env.MONNIFY_CONTRACT_CODE;
    config.gateways.monnify.enabled = true;

    // Configure Paystack
    console.log('🔧 Configuring Paystack...');
    config.gateways.paystack.publicKey = process.env.PAYSTACK_PUBLIC_KEY;
    config.gateways.paystack.secretKey = process.env.PAYSTACK_SECRET_KEY;
    config.gateways.paystack.enabled = true;

    // Set default active gateway
    if (!config.activeGateway) {
      config.activeGateway = 'monnify'; // or 'paystack'
    }

    await config.save();
    
    console.log('✅ Payment gateway configuration saved successfully!');
    console.log('\n📊 Current Configuration:');
    console.log('  Active Gateway:', config.activeGateway);
    console.log('  Monnify:', config.gateways.monnify.enabled ? '✅ Enabled' : '❌ Disabled');
    console.log('  Monnify Keys:', config.gateways.monnify.apiKey ? '✅ Configured' : '❌ Missing');
    console.log('  Paystack:', config.gateways.paystack.enabled ? '✅ Enabled' : '❌ Disabled');
    console.log('  Paystack Keys:', config.gateways.paystack.secretKey ? '✅ Configured' : '❌ Missing');
    
    console.log('\n✅ Setup complete! You can now switch payment gateways.\n');
    
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Setup failed:', error.message);
    console.error('Stack:', error.stack);
    await mongoose.disconnect();
    process.exit(1);
  }
}

setupGateways();