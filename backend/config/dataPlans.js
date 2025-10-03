// config/dataPlans.js - CORRECTED WITH CLUBKONNECT PLAN CODES

const DATA_PLANS = {
  mtn: [
    // SME Plans
    { id: '2', name: '500MB - 30 days (SME)', dataSize: '500MB', validity: '30 days', amount: 424, category: 'SME' },
    { id: '4', name: '1GB - 30 days (SME)', dataSize: '1GB', validity: '30 days', amount: 595, category: 'SME' },
    { id: '5', name: '2GB - 30 days (SME)', dataSize: '2GB', validity: '30 days', amount: 1189, category: 'SME' },
    { id: '6', name: '3GB - 30 days (SME)', dataSize: '3GB', validity: '30 days', amount: 1680, category: 'SME' },
    { id: '8', name: '5GB - 30 days (SME)', dataSize: '5GB', validity: '30 days', amount: 2540, category: 'SME' },
    
    // Daily Plans (Awoof Data)
    { id: '38', name: '110MB Daily Plan', dataSize: '110MB', validity: '1 day', amount: 97, category: 'Daily' },
    { id: '39', name: '230MB Daily Plan', dataSize: '230MB', validity: '1 day', amount: 194, category: 'Daily' },
    { id: '40', name: '500MB Daily Plan', dataSize: '500MB', validity: '1 day', amount: 340, category: 'Daily' },
    { id: '14', name: '1GB Daily Plan', dataSize: '1GB', validity: '1 day', amount: 485, category: 'Daily' },
    { id: '15', name: '2.5GB Daily Plan', dataSize: '2.5GB', validity: '1 day', amount: 728, category: 'Daily' },
    
    // 2-Day Plans
    { id: '16', name: '2.5GB 2-Day Plan', dataSize: '2.5GB', validity: '2 days', amount: 873, category: '2-Day' },
    { id: '17', name: '3.2GB 2-Day Plan', dataSize: '3.2GB', validity: '2 days', amount: 970, category: '2-Day' },
    
    // Weekly Plans (Direct Data)
    { id: '18', name: '500MB Weekly Plan', dataSize: '500MB', validity: '7 days', amount: 485, category: 'Weekly' },
    { id: '19', name: '1GB Weekly Plan', dataSize: '1GB', validity: '7 days', amount: 776, category: 'Weekly' },
    { id: '20', name: '6GB Weekly Plan', dataSize: '6GB', validity: '7 days', amount: 2425, category: 'Weekly' },
    { id: '21', name: '11GB Weekly Bundle', dataSize: '11GB', validity: '7 days', amount: 3395, category: 'Weekly' },
    { id: '36', name: '20GB Weekly Plan', dataSize: '20GB', validity: '7 days', amount: 4850, category: 'Weekly' },
    
    // Monthly Plans (Direct Data)
    { id: '22', name: '2GB Monthly Plan', dataSize: '2GB', validity: '30 days', amount: 1455, category: 'Monthly' },
    { id: '23', name: '2.7GB Monthly Plan', dataSize: '2.7GB', validity: '30 days', amount: 1940, category: 'Monthly' },
    { id: '24', name: '3.5GB Monthly Plan', dataSize: '3.5GB', validity: '30 days', amount: 2425, category: 'Monthly' },
    { id: '26', name: '7GB Monthly Plan', dataSize: '7GB', validity: '30 days', amount: 3395, category: 'Monthly' },
    { id: '27', name: '10GB Monthly Plan', dataSize: '10GB', validity: '30 days', amount: 4365, category: 'Monthly' },
    { id: '28', name: '12.5GB Monthly Plan', dataSize: '12.5GB', validity: '30 days', amount: 5335, category: 'Monthly' },
    { id: '29', name: '16.5GB Monthly Plan', dataSize: '16.5GB', validity: '30 days', amount: 6305, category: 'Monthly' },
    { id: '30', name: '20GB Monthly Plan', dataSize: '20GB', validity: '30 days', amount: 7275, category: 'Monthly' },
    { id: '31', name: '25GB Monthly Plan', dataSize: '25GB', validity: '30 days', amount: 8730, category: 'Monthly' },
    { id: '32', name: '36GB Monthly Plan', dataSize: '36GB', validity: '30 days', amount: 10670, category: 'Monthly' },
    { id: '33', name: '75GB Monthly Plan', dataSize: '75GB', validity: '30 days', amount: 17460, category: 'Monthly' },
    { id: '34', name: '165GB Monthly Plan', dataSize: '165GB', validity: '30 days', amount: 33950, category: 'Monthly' },
    
    // Long-term Plans
    { id: '35', name: '150GB 2-Month Plan', dataSize: '150GB', validity: '60 days', amount: 38800, category: 'Long-term' },
    { id: '37', name: '480GB 3-Month Plan', dataSize: '480GB', validity: '90 days', amount: 87300, category: 'Long-term' }
  ],

  glo: [
    // SME Plans - 3 Days
    { id: '8', name: '1GB - 3 days (SME)', dataSize: '1GB', validity: '3 days', amount: 282, category: 'SME' },
    { id: '9', name: '3GB - 3 days (SME)', dataSize: '3GB', validity: '3 days', amount: 846, category: 'SME' },
    { id: '10', name: '5GB - 3 days (SME)', dataSize: '5GB', validity: '3 days', amount: 1410, category: 'SME' },
    
    // SME Plans - 7 Days
    { id: '11', name: '1GB - 7 days (SME)', dataSize: '1GB', validity: '7 days', amount: 329, category: 'SME' },
    { id: '12', name: '3GB - 7 days (SME)', dataSize: '3GB', validity: '7 days', amount: 987, category: 'SME' },
    { id: '13', name: '5GB - 7 days (SME)', dataSize: '5GB', validity: '7 days', amount: 1645, category: 'SME' },
    
    // Night Plans
    { id: '37', name: '1GB - 14 days Night Plan', dataSize: '1GB', validity: '14 days', amount: 329, category: 'Night' },
    { id: '38', name: '3GB - 14 days Night Plan', dataSize: '3GB', validity: '14 days', amount: 987, category: 'Night' },
    { id: '39', name: '5GB - 14 days Night Plan', dataSize: '5GB', validity: '14 days', amount: 1645, category: 'Night' },
    { id: '40', name: '10GB - 14 days Night Plan', dataSize: '10GB', validity: '14 days', amount: 3290, category: 'Night' },
    
    // SME Plans - Monthly
    { id: '1', name: '200MB - 14 days (SME)', dataSize: '200MB', validity: '14 days', amount: 94, category: 'SME' },
    { id: '2', name: '500MB - 30 days (SME)', dataSize: '500MB', validity: '30 days', amount: 235, category: 'SME' },
    { id: '3', name: '1GB - 30 days (SME)', dataSize: '1GB', validity: '30 days', amount: 470, category: 'SME' },
    { id: '4', name: '2GB - 30 days (SME)', dataSize: '2GB', validity: '30 days', amount: 940, category: 'SME' },
    { id: '5', name: '3GB - 30 days (SME)', dataSize: '3GB', validity: '30 days', amount: 1410, category: 'SME' },
    { id: '6', name: '5GB - 30 days (SME)', dataSize: '5GB', validity: '30 days', amount: 2350, category: 'SME' },
    { id: '7', name: '10GB - 30 days (SME)', dataSize: '10GB', validity: '30 days', amount: 4700, category: 'SME' },
    
    // Awoof Data
    { id: '14', name: '125MB - 1 day', dataSize: '125MB', validity: '1 day', amount: 95, category: 'Daily' },
    { id: '15', name: '260MB - 2 day', dataSize: '260MB', validity: '2 days', amount: 191, category: 'Daily' },
    { id: '28', name: '2GB - 1 day', dataSize: '2GB', validity: '1 day', amount: 477, category: 'Daily' },
    
    // Direct Data Plans
    { id: '16', name: '1.5GB - 14 days', dataSize: '1.5GB', validity: '14 days', amount: 477, category: 'Direct' },
    { id: '29', name: '6GB - 7 days', dataSize: '6GB', validity: '7 days', amount: 1432, category: 'Weekly' },
    { id: '17', name: '2.6GB - 30 days', dataSize: '2.6GB', validity: '30 days', amount: 955, category: 'Monthly' },
    { id: '18', name: '5GB - 30 days', dataSize: '5GB', validity: '30 days', amount: 1432, category: 'Monthly' },
    { id: '19', name: '6.15GB - 30 days', dataSize: '6.15GB', validity: '30 days', amount: 1910, category: 'Monthly' },
    { id: '20', name: '7.5GB - 30 days', dataSize: '7.5GB', validity: '30 days', amount: 2387, category: 'Monthly' },
    { id: '21', name: '10GB - 30 days', dataSize: '10GB', validity: '30 days', amount: 2865, category: 'Monthly' },
    { id: '22', name: '12.5GB - 30 days', dataSize: '12.5GB', validity: '30 days', amount: 3820, category: 'Monthly' },
    { id: '23', name: '16GB - 30 days', dataSize: '16GB', validity: '30 days', amount: 4775, category: 'Monthly' },
    { id: '24', name: '28GB - 30 days', dataSize: '28GB', validity: '30 days', amount: 7640, category: 'Monthly' },
    { id: '25', name: '38GB - 30 days', dataSize: '38GB', validity: '30 days', amount: 9550, category: 'Monthly' },
    { id: '26', name: '64GB - 30 days', dataSize: '64GB', validity: '30 days', amount: 14325, category: 'Monthly' },
    { id: '27', name: '107GB - 30 days', dataSize: '107GB', validity: '30 days', amount: 19100, category: 'Monthly' },
    
    // Weekend Plans
    { id: '30', name: '2.5GB - Weekend Plan', dataSize: '2.5GB', validity: 'Sat & Sun', amount: 477, category: 'Weekend' },
    { id: '31', name: '875MB - Weekend Plan', dataSize: '875MB', validity: 'Sunday', amount: 191, category: 'Weekend' },
    
    // Large Plans
    { id: '32', name: '165GB - 30 days', dataSize: '165GB', validity: '30 days', amount: 28650, category: 'Large' },
    { id: '33', name: '220GB - 30 days', dataSize: '220GB', validity: '30 days', amount: 34380, category: 'Large' },
    { id: '34', name: '320GB - 30 days', dataSize: '320GB', validity: '30 days', amount: 47750, category: 'Large' },
    { id: '35', name: '380GB - 30 days', dataSize: '380GB', validity: '30 days', amount: 57300, category: 'Large' },
    { id: '36', name: '475GB - 30 days', dataSize: '475GB', validity: '30 days', amount: 71625, category: 'Large' }
  ],

  '9mobile': [
    // Awoof Data
    { id: '14', name: '100MB - 1 day', dataSize: '100MB', validity: '1 day', amount: 93, category: 'Daily' },
    { id: '15', name: '180MB - 1 day', dataSize: '180MB', validity: '1 day', amount: 140, category: 'Daily' },
    { id: '16', name: '250MB - 1 day', dataSize: '250MB', validity: '1 day', amount: 186, category: 'Daily' },
    { id: '17', name: '450MB - 1 day', dataSize: '450MB', validity: '1 day', amount: 326, category: 'Daily' },
    { id: '18', name: '650MB - 3 days', dataSize: '650MB', validity: '3 days', amount: 465, category: 'Daily' },
    
    // Direct Data Plans
    { id: '19', name: '1.75GB - 7 days', dataSize: '1.75GB', validity: '7 days', amount: 1395, category: 'Weekly' },
    { id: '20', name: '650MB - 14 days', dataSize: '650MB', validity: '14 days', amount: 558, category: 'Direct' },
    { id: '21', name: '1.1GB - 30 days', dataSize: '1.1GB', validity: '30 days', amount: 930, category: 'Monthly' },
    { id: '22', name: '1.4GB - 30 days', dataSize: '1.4GB', validity: '30 days', amount: 1116, category: 'Monthly' },
    { id: '23', name: '2.44GB - 30 days', dataSize: '2.44GB', validity: '30 days', amount: 1860, category: 'Monthly' },
    { id: '24', name: '3.17GB - 30 days', dataSize: '3.17GB', validity: '30 days', amount: 2325, category: 'Monthly' },
    { id: '25', name: '3.91GB - 30 days', dataSize: '3.91GB', validity: '30 days', amount: 2790, category: 'Monthly' },
    { id: '26', name: '5.10GB - 30 days', dataSize: '5.10GB', validity: '30 days', amount: 3720, category: 'Monthly' },
    { id: '27', name: '6.5GB - 30 days', dataSize: '6.5GB', validity: '30 days', amount: 4650, category: 'Monthly' },
    { id: '28', name: '16GB - 30 days', dataSize: '16GB', validity: '30 days', amount: 11160, category: 'Monthly' },
    { id: '29', name: '24.3GB - 30 days', dataSize: '24.3GB', validity: '30 days', amount: 17205, category: 'Monthly' },
    { id: '30', name: '26.5GB - 30 days', dataSize: '26.5GB', validity: '30 days', amount: 18600, category: 'Monthly' },
    
    // Long-term Plans
    { id: '31', name: '39GB - 60 days', dataSize: '39GB', validity: '60 days', amount: 27900, category: 'Long-term' },
    { id: '32', name: '78GB - 90 days', dataSize: '78GB', validity: '90 days', amount: 55800, category: 'Long-term' },
    { id: '33', name: '190GB - 180 days', dataSize: '190GB', validity: '180 days', amount: 139500, category: 'Long-term' }
  ],

  airtel: [
    // Awoof Data (1-2 days)
    { id: '14', name: '1GB - 1 day', dataSize: '1GB', validity: '1 day', amount: 484, category: 'Daily' },
    { id: '15', name: '1.5GB - 2 days', dataSize: '1.5GB', validity: '2 days', amount: 581, category: 'Daily' },
    { id: '16', name: '2GB - 2 days', dataSize: '2GB', validity: '2 days', amount: 726, category: 'Daily' },
    { id: '17', name: '3GB - 2 days', dataSize: '3GB', validity: '2 days', amount: 968, category: 'Daily' },
    { id: '18', name: '5GB - 2 days', dataSize: '5GB', validity: '2 days', amount: 1452, category: 'Daily' },
    
    // Weekly Plans
    { id: '19', name: '500MB - 7 days', dataSize: '500MB', validity: '7 days', amount: 484, category: 'Weekly' },
    { id: '20', name: '1GB - 7 days', dataSize: '1GB', validity: '7 days', amount: 774, category: 'Weekly' },
    { id: '21', name: '1.5GB - 7 days', dataSize: '1.5GB', validity: '7 days', amount: 968, category: 'Weekly' },
    { id: '22', name: '3.5GB - 7 days', dataSize: '3.5GB', validity: '7 days', amount: 1452, category: 'Weekly' },
    { id: '23', name: '6GB - 7 days', dataSize: '6GB', validity: '7 days', amount: 2420, category: 'Weekly' },
    { id: '24', name: '10GB - 7 days', dataSize: '10GB', validity: '7 days', amount: 2904, category: 'Weekly' },
    { id: '25', name: '18GB - 7 days', dataSize: '18GB', validity: '7 days', amount: 4840, category: 'Weekly' },
    
    // Monthly Plans
    { id: '26', name: '2GB - 30 days', dataSize: '2GB', validity: '30 days', amount: 1452, category: 'Monthly' },
    { id: '27', name: '3GB - 30 days', dataSize: '3GB', validity: '30 days', amount: 1936, category: 'Monthly' },
    { id: '28', name: '4GB - 30 days', dataSize: '4GB', validity: '30 days', amount: 2420, category: 'Monthly' },
    { id: '29', name: '8GB - 30 days', dataSize: '8GB', validity: '30 days', amount: 2904, category: 'Monthly' },
    { id: '30', name: '10GB - 30 days', dataSize: '10GB', validity: '30 days', amount: 3872, category: 'Monthly' },
    { id: '31', name: '13GB - 30 days', dataSize: '13GB', validity: '30 days', amount: 4840, category: 'Monthly' },
    { id: '32', name: '18GB - 30 days', dataSize: '18GB', validity: '30 days', amount: 5808, category: 'Monthly' },
    { id: '33', name: '25GB - 30 days', dataSize: '25GB', validity: '30 days', amount: 7744, category: 'Monthly' },
    { id: '34', name: '35GB - 30 days', dataSize: '35GB', validity: '30 days', amount: 9680, category: 'Monthly' },
    { id: '35', name: '60GB - 30 days', dataSize: '60GB', validity: '30 days', amount: 14520, category: 'Monthly' },
    { id: '36', name: '100GB - 30 days', dataSize: '100GB', validity: '30 days', amount: 19360, category: 'Monthly' },
    { id: '37', name: '160GB - 30 days', dataSize: '160GB', validity: '30 days', amount: 29040, category: 'Monthly' },
    { id: '38', name: '210GB - 30 days', dataSize: '210GB', validity: '30 days', amount: 38720, category: 'Monthly' },
    
    // Long-term Plans
    { id: '39', name: '300GB - 90 days', dataSize: '300GB', validity: '90 days', amount: 48400, category: 'Long-term' },
    { id: '40', name: '350GB - 90 days', dataSize: '350GB', validity: '90 days', amount: 58080, category: 'Long-term' }
  ]
};

module.exports = { DATA_PLANS };