// types/system.types.ts
export interface ApiProvider {
  _id: string;
  name: string;
  code: string;
  type: 'Primary Provider' | 'Secondary Provider' | 'Backup Provider' | 'Custom Provider';
  endpoint: string;
  apiKey: string;
  timeout: number;
  retries: number;
  status: 'active' | 'inactive' | 'maintenance' | 'error';
  isActive: boolean;
  successRate: number;
  averageResponseTime: number;
  priority: number;
  weight: number;
  lastSync: string;
  createdAt: string;
  updatedAt: string;
}

export interface SystemHealth {
  uptime: number;
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  activeConnections: number;
  errorRate: number;
  apiResponseTime: number;
  lastChecked: string;
}

export interface SystemLog {
  _id: string;
  level: 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  service: string;
  message: string;
  details: Record<string, any>;
  resolved: boolean;
  resolvedBy?: string;
  resolvedAt?: string;
  resolution?: string;
  count: number;
  createdAt: string;
  updatedAt: string;
}

export interface MaintenanceMode {
  enabled: boolean;
  message: string;
  scheduledStart: string;
  scheduledEnd: string;
  affectedServices: string[];
  reason?: string;
  status?: 'scheduled' | 'active' | 'completed' | 'cancelled';
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

// services/systemApi.ts
const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://vtu-application.onrender.com/api/admin/system';

class SystemAPI {
  private async request<T = any>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const token = localStorage.getItem('adminToken');
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers
      },
      ...options
    };

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
      const data: ApiResponse<T> = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Request failed');
      }
      
      return data;
    } catch (error) {
      throw error instanceof Error ? error : new Error('Unknown error occurred');
    }
  }

  // API Provider methods
  async getApiProviders(): Promise<ApiResponse<ApiProvider[]>> {
    return this.request<ApiProvider[]>('/api-providers');
  }

  async createApiProvider(
    providerData: Partial<ApiProvider>
  ): Promise<ApiResponse<ApiProvider>> {
    return this.request<ApiProvider>('/api-providers', {
      method: 'POST',
      body: JSON.stringify(providerData)
    });
  }

  async updateApiProvider(
    providerId: string, 
    updates: Partial<ApiProvider>
  ): Promise<ApiResponse<ApiProvider>> {
    return this.request<ApiProvider>(`/api-providers/${providerId}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  }

  async toggleProviderStatus(
    providerId: string,
    statusData: {
      isActive?: boolean;
      status?: ApiProvider['status'];
      maintenanceMode?: boolean;
      maintenanceMessage?: string;
    }
  ): Promise<ApiResponse<ApiProvider>> {
    return this.request<ApiProvider>(`/api-providers/${providerId}/status`, {
      method: 'PUT',
      body: JSON.stringify(statusData)
    });
  }

  async testApiConnection(
    providerId: string
  ): Promise<ApiResponse<{ responseTime: number; statusCode: number; message: string }>> {
    return this.request(`/api-providers/${providerId}/test`, {
      method: 'POST'
    });
  }

  async deleteApiProvider(providerId: string): Promise<ApiResponse<void>> {
    return this.request(`/api-providers/${providerId}`, {
      method: 'DELETE'
    });
  }

  // System Health methods
  async getSystemHealth(): Promise<ApiResponse<SystemHealth>> {
    return this.request<SystemHealth>('/health');
  }

  async getSystemHealthHistory(
    period: '1h' | '6h' | '24h' | '7d' | '30d' = '24h',
    limit: number = 100
  ): Promise<ApiResponse<SystemHealth[]>> {
    return this.request<SystemHealth[]>(`/health/history?period=${period}&limit=${limit}`);
  }

  async forceHealthCheck(): Promise<ApiResponse<any>> {
    return this.request('/health/check', {
      method: 'POST'
    });
  }

  // System Logs methods
  async getSystemLogs(filters: {
    level?: SystemLog['level'];
    service?: string;
    page?: number;
    limit?: number;
    period?: '1h' | '6h' | '24h' | '7d' | '30d';
    resolved?: boolean;
  } = {}): Promise<ApiResponse<{
    data: SystemLog[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalLogs: number;
      hasNextPage: boolean;
      hasPrevPage: boolean;
    };
  }>> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined) {
        params.append(key, value.toString());
      }
    });
    
    return this.request(`/logs?${params}`);
  }

  async resolveLog(
    logId: string, 
    resolution?: string
  ): Promise<ApiResponse<SystemLog>> {
    return this.request<SystemLog>(`/logs/${logId}/resolve`, {
      method: 'PUT',
      body: JSON.stringify({ resolution })
    });
  }

  async cleanupLogs(criteria: {
    olderThan?: '7d' | '30d' | '90d';
    level?: SystemLog['level'];
  }): Promise<ApiResponse<{ deletedCount: number }>> {
    return this.request('/logs/cleanup', {
      method: 'DELETE',
      body: JSON.stringify(criteria)
    });
  }

  // Maintenance methods
  async getMaintenanceStatus(): Promise<ApiResponse<MaintenanceMode>> {
    return this.request<MaintenanceMode>('/maintenance');
  }

  async setMaintenanceMode(
    settings: MaintenanceMode & { reason?: string }
  ): Promise<ApiResponse<MaintenanceMode>> {
    return this.request<MaintenanceMode>('/maintenance', {
      method: 'POST',
      body: JSON.stringify(settings)
    });
  }

  async getMaintenanceHistory(
    page: number = 1,
    limit: number = 20
  ): Promise<ApiResponse<{
    data: MaintenanceMode[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalEntries: number;
    };
  }>> {
    return this.request(`/maintenance/history?page=${page}&limit=${limit}`);
  }
}

export default new SystemAPI();