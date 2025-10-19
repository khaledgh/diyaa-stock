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
    this.api.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        if (error.response?.status === 401) {
          // Token expired or invalid
          await SecureStore.deleteItemAsync('authToken');
          await SecureStore.deleteItemAsync('userData');
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

  async getCustomers() {
    const response = await this.api.get('/customers');
    return response.data;
  }

  async createSalesInvoice(data: {
    location_id: number; // Van ID is sent as location_id to backend
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

  async getInvoices(filters?: {
    invoice_type?: string;
    van_id?: number;
    limit?: number;
    offset?: number;
  }) {
    const response = await this.api.get('/invoices', { params: filters });
    return response.data;
  }
}

export default new ApiService();
