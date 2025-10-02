const API_URL = `${import.meta.env.VITE_API_URL}/api/admin/system`;

interface ApiProvider {
  _id: string;
  name: string;
  code: string;
  type: string;
  status: 'active' | 'inactive' | 'maintenance' | 'error';
  endpoint: string;
  timeout: number;
  retries: number;
  successRate: number;
  currentBalance?: number;
  isActive: boolean;
  priority: number;
  weight: number;
  lastSync: string;
  healthCheck: {
    status: string;
    lastCheck?: string;
  };
}

interface SystemHealthMetrics {
  uptime: number;
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  activeConnections: number;
  errorRate: number;
  apiResponseTime: number;
  lastChecked: string;
}

interface SystemLog {
  _id: string;
  level: 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  service: string;
  message: string;
  details: any;
  resolved: boolean;
  createdAt: string;
  count?: number;
}

interface MaintenanceMode {
  enabled: boolean;
  message: string;
  scheduledStart: string | null;
  scheduledEnd: string | null;
  affectedServices: string[];
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

const getToken = (): string | null => localStorage.getItem('adminToken');

const getHeaders = (): HeadersInit => ({
  'Authorization': `Bearer ${getToken()}`,
  'Content-Type': 'application/json'
});

// API Providers
export const getProviders = async (): Promise<ApiResponse<ApiProvider[]>> => {
  const response = await fetch(`${API_URL}/providers`, {
    headers: getHeaders()
  });
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  return response.json();
};

export const getProviderWithBalance = async (providerId: string): Promise<ApiResponse<ApiProvider>> => {
  const response = await fetch(`${API_URL}/providers/${providerId}`, {
    headers: getHeaders()
  });
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  return response.json();
};

export const testProvider = async (providerId: string): Promise<ApiResponse<any>> => {
  const response = await fetch(`${API_URL}/providers/test/${providerId}`, {
    method: 'POST',
    headers: getHeaders()
  });
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  return response.json();
};

export const updateProvider = async (
  providerId: string, 
  updates: Partial<ApiProvider>
): Promise<ApiResponse<ApiProvider>> => {
  const response = await fetch(`${API_URL}/providers/${providerId}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(updates)
  });
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  return response.json();
};

// System Health
export const getSystemHealth = async (): Promise<ApiResponse<{ metrics: SystemHealthMetrics; status: string }>> => {
  const response = await fetch(`${API_URL}/health`, {
    headers: getHeaders()
  });
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  return response.json();
};

// System Logs
export const getSystemLogs = async (params?: {
  level?: string;
  service?: string;
  resolved?: boolean;
  page?: number;
  limit?: number;
}): Promise<ApiResponse<{ logs: SystemLog[]; pagination: any }>> => {
  const queryParams = new URLSearchParams();
  if (params?.level) queryParams.append('level', params.level);
  if (params?.service) queryParams.append('service', params.service);
  if (params?.resolved !== undefined) queryParams.append('resolved', String(params.resolved));
  if (params?.page) queryParams.append('page', String(params.page));
  if (params?.limit) queryParams.append('limit', String(params.limit));

  const response = await fetch(`${API_URL}/logs?${queryParams}`, {
    headers: getHeaders()
  });
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  return response.json();
};

export const resolveLog = async (logId: string, resolution?: string): Promise<ApiResponse<SystemLog>> => {
  const response = await fetch(`${API_URL}/logs/${logId}/resolve`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify({ resolution })
  });
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  return response.json();
};

// Maintenance Mode
export const getMaintenanceMode = async (): Promise<ApiResponse<MaintenanceMode>> => {
  const response = await fetch(`${API_URL}/maintenance`, {
    headers: getHeaders()
  });
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  return response.json();
};

export const updateMaintenanceMode = async (
  settings: Partial<MaintenanceMode>
): Promise<ApiResponse<MaintenanceMode>> => {
  const response = await fetch(`${API_URL}/maintenance`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(settings)
  });
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  return response.json();
};

export type { ApiProvider, SystemHealthMetrics, SystemLog, MaintenanceMode };