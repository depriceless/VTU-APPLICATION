// admin-frontend/src/services/clubkonnectService.ts
import { API_CONFIG } from '../config/api.config';

const getAuthToken = () => {
  return localStorage.getItem('vtu_admin_token');
};

const makeRequest = async (endpoint: string, options: RequestInit = {}) => {
  const token = getAuthToken();
  
  if (!token) {
    throw new Error('No authentication token found');
  }

  const response = await fetch(`https://vtu-application.onrender.com/api/admin/clubkonnect${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers
    }
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Request failed');
  }

  return data;
};

export const clubkonnectService = {
  // Wallet operations
  async getBalance() {
    return makeRequest('/balance');
  },

  async getTransactions(page = 1, limit = 20, type?: string) {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...(type && { type })
    });
    return makeRequest(`/transactions?${params}`);
  },

  // Test purchases
  async testAirtimePurchase(network: string, phone: string, amount: string) {
    return makeRequest('/test/airtime', {
      method: 'POST',
      body: JSON.stringify({ network, phone, amount })
    });
  },

  async testDataPurchase(network: string, phone: string, dataplan: string) {
    return makeRequest('/test/data', {
      method: 'POST',
      body: JSON.stringify({ network, phone, dataplan })
    });
  },

  // Data plans
  async getDataPlans(network: string) {
    return makeRequest(`/data-plans/${network}`);
  },

  async getAirtimeDiscount() {
    return makeRequest('/airtime-discount');
  },

  // Configuration
  async getConfig() {
    return makeRequest('/config');
  },

  async testConnection() {
    return makeRequest('/test-connection');
  },

  async queryTransaction(orderId: string) {
    return makeRequest(`/query/${orderId}`);
  }
};

export default clubkonnectService;