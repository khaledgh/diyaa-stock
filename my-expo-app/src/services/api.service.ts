import axios, { AxiosInstance, AxiosError } from 'axios';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from '../config/api';

class ApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor to include token
    this.api.interceptors.request.use(
      async (config) => {
        const token = await SecureStore.getItemAsync('authToken');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Add response interceptor for error handling
    let isRefreshing = false;
    let failedQueue: Array<{ resolve: (token: string) => void; reject: (error: any) => void }> = [];

    const processQueue = (error: any, token: string | null = null) => {
      failedQueue.forEach((prom) => {
        if (error) {
          prom.reject(error);
        } else {
          prom.resolve(token as string);
        }
      });
      failedQueue = [];
    };

    this.api.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as any;

        if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
          if (originalRequest.url?.includes('/login')) {
            return Promise.reject(error);
          }

          if (isRefreshing) {
            return new Promise((resolve, reject) => {
              failedQueue.push({ resolve, reject });
            })
              .then((token) => {
                originalRequest.headers.Authorization = `Bearer ${token}`;
                return this.api(originalRequest);
              })
              .catch((err) => {
                return Promise.reject(err);
              });
          }

          originalRequest._retry = true;
          isRefreshing = true;

          try {
            const email = await SecureStore.getItemAsync('userEmail');
            const password = await SecureStore.getItemAsync('userPassword');

            if (!email || !password) {
              throw new Error('No credentials found for auto-refresh');
            }

            const response = await axios.post(
              `${API_BASE_URL}/login`,
              { email, password },
              {
                headers: { 'Content-Type': 'application/json' },
              }
            );
            const token = response.data?.data?.token || response.data?.token;

            if (token) {
              await SecureStore.setItemAsync('authToken', token);
              originalRequest.headers.Authorization = `Bearer ${token}`;
              processQueue(null, token);
              return this.api(originalRequest);
            } else {
              throw new Error('No token obtained from refresh login');
            }
          } catch (refreshError) {
            processQueue(refreshError, null);
            await SecureStore.deleteItemAsync('authToken');
            await SecureStore.deleteItemAsync('userData');
            await SecureStore.deleteItemAsync('userEmail');
            await SecureStore.deleteItemAsync('userPassword');
            return Promise.reject(refreshError);
          } finally {
            isRefreshing = false;
          }
        }
        return Promise.reject(error);
      }
    );
  }

  async login(email: string, password: string) {
    const response = await this.api.post('/login', { email, password });
    return response.data;
  }

  async getMe() {
    const response = await this.api.get('/me');
    return response.data;
  }

  async getVanStock(vanId: number) {
    const response = await this.api.get(`/vans/${vanId}/stock`);
    return response.data;
  }

  async getLocationStock(locationId: number) {
    const response = await this.api.get(`/locations/${locationId}/stock`);
    return response.data;
  }

  async getVanLocation(vanId: number) {
    const response = await this.api.get(`/locations?van_id=${vanId}&type=van`);
    return response.data;
  }

  async getLocations() {
    const response = await this.api.get('/locations');
    return response.data;
  }

  async getCustomers() {
    const response = await this.api.get('/customers');
    return response.data;
  }

  async createSalesInvoice(data: {
    location_id: number; // Location ID (warehouse, van, branch, etc.)
    customer_id?: number;
    items: Array<{
      product_id: number;
      quantity: number;
      unit_price: number;
      discount_percent?: number;
      tax_percent?: number;
    }>;
    paid_amount?: number;
    payment_method?: string; // Required by backend: 'cash', 'card', 'bank_transfer'
    discount_amount?: number;
    tax_percent?: number;
    notes?: string;
  }) {
    const response = await this.api.post('/invoices/sales', data);
    return response.data;
  }

  async createPurchaseInvoice(data: any) {
    const response = await this.api.post('/invoices/purchase', data);
    return response.data;
  }

  async getInvoices(filters?: {
    invoice_type?: string;
    location_id?: number; // Filter by location_id (van, warehouse, or branch)
    limit?: number;
    offset?: number;
  }) {
    const response = await this.api.get('/invoices', { params: filters });
    return response.data;
  }
}

export default new ApiService();
