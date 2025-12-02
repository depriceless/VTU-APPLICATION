// src/utils/api.ts - REPLACE ENTIRE FILE WITH THIS

import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'https://vtu-application.onrender.com';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Auth API
export const authAPI = {
  login: (credentials: { username: string; password: string }) =>
    api.post('/api/admin/login', credentials),
  
  logout: () => api.post('/api/admin/logout'),
  
  verifyToken: () => api.get('/api/admin/verify'),
};

// Users API
export const userAPI = {
  getUsers: (params?: any) => api.get('/api/admin/users', { params }),
  
  getUser: (id: string) => api.get(`/api/admin/users/${id}`),
  
  updateUser: (id: string, data: any) => 
    api.put(`/api/admin/users/${id}`, data),
  
  deleteUser: (id: string) => api.delete(`/api/admin/users/${id}`),
};

// Financial API
export const financialAPI = {
  getTransactions: (params?: any) => 
    api.get('/api/admin/transactions', { params }),
  
  getStats: () => api.get('/api/admin/stats'),
  
  updateBalance: (userId: string, amount: number) =>
    api.post(`/api/admin/users/${userId}/balance`, { amount }),
};

// Services API
export const serviceAPI = {
  getServices: () => api.get('/api/admin/services'),
  
  updateService: (id: string, data: any) =>
    api.put(`/api/admin/services/${id}`, data),
  
  getProviderBalance: (provider: string) =>
    api.get(`/api/admin/providers/${provider}/balance`),
};

// Add token to requests automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('vtu_admin_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle responses
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('vtu_admin_token');
      localStorage.removeItem('vtu_admin_data');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;