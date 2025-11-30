const isDevelopment = window.location.hostname === 'localhost' || 
                      window.location.hostname === '127.0.0.1';

const BASE_URL = isDevelopment 
  ? 'http://localhost:5002' 
  : 'https://vtu-application.onrender.com';

export const API_CONFIG = {
  BASE_URL: BASE_URL,
  ADMIN_AUTH: `${BASE_URL}/api/admin/auth`,
  ADMIN: `${BASE_URL}/api/admin`,
  ADMIN_MANAGEMENT: `${BASE_URL}/api/admin/management`,
  ADMIN_PROFILE: `${BASE_URL}/api/admin/profile`, // Add this
};