const express = require('express');
const router = express.Router();
const axios = require('axios');
const { authenticate } = require('../middleware/auth');

// ClubKonnect Configuration
const CK_CONFIG = {
  userId: process.env.CLUBKONNECT_USER_ID,
  apiKey: process.env.CLUBKONNECT_API_KEY,
  baseUrl: process.env.CLUBKONNECT_BASE_URL || 'https://www.nellobytesystems.com'
};

// Helper function to make API requests
const makeRequest = async (endpoint, params) => {
  try {
    const queryParams = new URLSearchParams({
      UserID: CK_CONFIG.userId,
      APIKey: CK_CONFIG.apiKey,
      ...params
    });
    
    const url = `${CK_CONFIG.baseUrl}${endpoint}?${queryParams}`;
    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || error.message);
  }
};

// ========== WALLET BALANCE ==========
router.get('/balance', authenticate, async (req, res) => {
  try {
    const data = await makeRequest('/APIWalletBalanceV1.asp', {});
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ========== AIRTIME ==========
router.post('/airtime', authenticate, async (req, res) => {
  try {
    const { network, phone, amount } = req.body;
    
    if (!network || !phone || !amount) {
      return res.status(400).json({ 
        success: false, 
        message: 'Network, phone, and amount are required' 
      });
    }

    const data = await makeRequest('/APIAirtimeV1.asp', {
      MobileNetwork: network,
      Amount: amount,
      MobileNumber: phone,
      RequestID: `AIR_${Date.now()}`
    });

    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get airtime discount
router.get('/airtime/discount', authenticate, async (req, res) => {
  try {
    const data = await makeRequest('/APIAirtimeDiscountV1.asp', {});
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ========== DATA BUNDLE ==========
router.post('/data', authenticate, async (req, res) => {
  try {
    const { network, plan, phone } = req.body;
    
    if (!network || !plan || !phone) {
      return res.status(400).json({ 
        success: false, 
        message: 'Network, plan, and phone are required' 
      });
    }

    const data = await makeRequest('/APIDatabundleV1.asp', {
      MobileNetwork: network,
      DataPlan: plan,
      MobileNumber: phone,
      RequestID: `DATA_${Date.now()}`
    });

    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get data plans
router.get('/data/plans/:network', authenticate, async (req, res) => {
  try {
    const { network } = req.params;
    const data = await makeRequest('/APIDatabundlePlansV2.asp', {
      MobileNetwork: network
    });
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get all data networks
router.get('/data/networks', authenticate, async (req, res) => {
  try {
    const data = await makeRequest('/APIDatabundleNetworksV2.asp', {});
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ========== CABLE TV ==========
router.post('/cabletv', authenticate, async (req, res) => {
  try {
    const { cable, package: pkg, smartcard } = req.body;
    
    if (!cable || !pkg || !smartcard) {
      return res.status(400).json({ 
        success: false, 
        message: 'Cable, package, and smartcard are required' 
      });
    }

    const data = await makeRequest('/APICableTVV1.asp', {
      CableTV: cable,
      Package: pkg,
      SmartCardNo: smartcard,
      RequestID: `TV_${Date.now()}`
    });

    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Verify smartcard
router.post('/cabletv/verify', authenticate, async (req, res) => {
  try {
    const { cable, smartcard } = req.body;
    
    if (!cable || !smartcard) {
      return res.status(400).json({ 
        success: false, 
        message: 'Cable and smartcard are required' 
      });
    }

    const data = await makeRequest('/APIVerifyCableTVV1.asp', {
      CableTV: cable,
      SmartCardNo: smartcard
    });

    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get cable packages
router.get('/cabletv/packages/:cable', authenticate, async (req, res) => {
  try {
    const { cable } = req.params;
    const data = await makeRequest('/APICableTVPackagesV2.asp', {
      CableTV: cable
    });
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get all cable providers
router.get('/cabletv/providers', authenticate, async (req, res) => {
  try {
    const data = await makeRequest('/APICableTVListV2.asp', {});
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ========== ELECTRICITY ==========
router.post('/electricity', authenticate, async (req, res) => {
  try {
    const { company, meterType, meterNo, amount, phone } = req.body;
    
    if (!company || !meterType || !meterNo || !amount || !phone) {
      return res.status(400).json({ 
        success: false, 
        message: 'All fields are required' 
      });
    }

    const data = await makeRequest('/APIElectricityV1.asp', {
      ElectricCompany: company,
      MeterType: meterType,
      MeterNo: meterNo,
      Amount: amount,
      PhoneNo: phone,
      RequestID: `ELEC_${Date.now()}`
    });

    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Verify meter number
router.post('/electricity/verify', authenticate, async (req, res) => {
  try {
    const { company, meterNo } = req.body;
    
    if (!company || !meterNo) {
      return res.status(400).json({ 
        success: false, 
        message: 'Company and meter number are required' 
      });
    }

    const data = await makeRequest('/APIVerifyElectricityV1.asp', {
      ElectricCompany: company,
      MeterNo: meterNo
    });

    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get all electricity discos
router.get('/electricity/discos', authenticate, async (req, res) => {
  try {
    const data = await makeRequest('/APIElectricityDiscosV1.asp', {});
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ========== BETTING ==========
router.post('/betting', authenticate, async (req, res) => {
  try {
    const { company, customerId, amount } = req.body;
    
    if (!company || !customerId || !amount) {
      return res.status(400).json({ 
        success: false, 
        message: 'Company, customer ID, and amount are required' 
      });
    }

    const data = await makeRequest('/APIBettingV1.asp', {
      BettingCompany: company,
      CustomerID: customerId,
      Amount: amount,
      RequestID: `BET_${Date.now()}`
    });

    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Verify betting customer ID
router.post('/betting/verify', authenticate, async (req, res) => {
  try {
    const { company, customerId } = req.body;
    
    if (!company || !customerId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Company and customer ID are required' 
      });
    }

    const data = await makeRequest('/APIVerifyBettingV1.asp', {
      BettingCompany: company,
      CustomerID: customerId
    });

    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get all betting companies
router.get('/betting/companies', authenticate, async (req, res) => {
  try {
    const data = await makeRequest('/APIBettingCompaniesV2.asp', {});
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ========== EDUCATION (WAEC) ==========
router.post('/education/waec', authenticate, async (req, res) => {
  try {
    const { examType, phone } = req.body;
    
    if (!examType || !phone) {
      return res.status(400).json({ 
        success: false, 
        message: 'Exam type and phone are required' 
      });
    }

    const data = await makeRequest('/APIWAECV1.asp', {
      ExamType: examType,
      PhoneNo: phone,
      RequestID: `WAEC_${Date.now()}`
    });

    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get WAEC packages
router.get('/education/waec/packages', authenticate, async (req, res) => {
  try {
    const data = await makeRequest('/APIWAECPackagesV2.asp', {});
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ========== EDUCATION (JAMB) ==========
router.post('/education/jamb', authenticate, async (req, res) => {
  try {
    const { examType, phone } = req.body;
    
    if (!examType || !phone) {
      return res.status(400).json({ 
        success: false, 
        message: 'Exam type and phone are required' 
      });
    }

    const data = await makeRequest('/APIJAMBV1.asp', {
      ExamType: examType,
      PhoneNo: phone,
      RequestID: `JAMB_${Date.now()}`
    });

    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Verify JAMB profile
router.post('/education/jamb/verify', authenticate, async (req, res) => {
  try {
    const { examType, profileId } = req.body;
    
    if (!examType || !profileId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Exam type and profile ID are required' 
      });
    }

    const data = await makeRequest('/APIVerifyJAMBV1.asp', {
      ExamType: examType,
      ProfileID: profileId
    });

    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get JAMB packages
router.get('/education/jamb/packages', authenticate, async (req, res) => {
  try {
    const data = await makeRequest('/APIJAMBPackagesV2.asp', {});
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ========== AIRTIME E-PIN (PRINT RECHARGE) ==========
router.post('/epin/airtime', authenticate, async (req, res) => {
  try {
    const { network, value, quantity } = req.body;
    
    if (!network || !value || !quantity) {
      return res.status(400).json({ 
        success: false, 
        message: 'Network, value, and quantity are required' 
      });
    }

    const data = await makeRequest('/APIEPINV1.asp', {
      MobileNetwork: network,
      Value: value,
      Quantity: quantity,
      RequestID: `EPIN_${Date.now()}`
    });

    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get e-PIN discount
router.get('/epin/discount', authenticate, async (req, res) => {
  try {
    const data = await makeRequest('/APIEPINDiscountV1.asp', {});
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ========== SMILE INTERNET ==========
router.post('/smile', authenticate, async (req, res) => {
  try {
    const { network, plan, phone } = req.body;
    
    if (!network || !plan || !phone) {
      return res.status(400).json({ 
        success: false, 
        message: 'Network, plan, and phone are required' 
      });
    }

    const data = await makeRequest('/APISmileV1.asp', {
      MobileNetwork: network,
      DataPlan: plan,
      MobileNumber: phone,
      RequestID: `SMILE_${Date.now()}`
    });

    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Verify Smile account
router.post('/smile/verify', authenticate, async (req, res) => {
  try {
    const { network, phone } = req.body;
    
    if (!network || !phone) {
      return res.status(400).json({ 
        success: false, 
        message: 'Network and phone are required' 
      });
    }

    const data = await makeRequest('/APIVerifySmileV1.asp', {
      MobileNetwork: network,
      MobileNumber: phone
    });

    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get Smile packages
router.get('/smile/packages', authenticate, async (req, res) => {
  try {
    const data = await makeRequest('/APISmilePackagesV2.asp', {});
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ========== SPECTRANET INTERNET ==========
router.post('/spectranet', authenticate, async (req, res) => {
  try {
    const { network, plan, phone } = req.body;
    
    if (!network || !plan || !phone) {
      return res.status(400).json({ 
        success: false, 
        message: 'Network, plan, and phone are required' 
      });
    }

    const data = await makeRequest('/APISpectranetV1.asp', {
      MobileNetwork: network,
      DataPlan: plan,
      MobileNumber: phone,
      RequestID: `SPEC_${Date.now()}`
    });

    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get Spectranet packages
router.get('/spectranet/packages', authenticate, async (req, res) => {
  try {
    const data = await makeRequest('/APISpectranetPackagesV2.asp', {});
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ========== TRANSACTION MANAGEMENT ==========
// Query transaction by OrderID or RequestID
router.get('/transaction/query', authenticate, async (req, res) => {
  try {
    const { orderId, requestId } = req.query;
    
    if (!orderId && !requestId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Either orderId or requestId is required' 
      });
    }

    const params = orderId ? { OrderID: orderId } : { RequestID: requestId };
    const data = await makeRequest('/APIQueryV1.asp', params);

    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Cancel transaction
router.post('/transaction/cancel', authenticate, async (req, res) => {
  try {
    const { orderId } = req.body;
    
    if (!orderId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Order ID is required' 
      });
    }

    const data = await makeRequest('/APICancelV1.asp', {
      OrderID: orderId
    });

    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;