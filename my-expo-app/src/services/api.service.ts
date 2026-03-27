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

  async getProducts(params?: any) {
    const response = await this.api.get('/products', { params });
    return response.data;
  }

  async getCustomers(params?: any) {
    const response = await this.api.get('/customers', { params });
    return response.data;
  }

  async getCustomerById(id: number) {
    const response = await this.api.get(`/customers/${id}`);
    return response.data;
  }

  async getVendors() {
    const response = await this.api.get('/vendors');
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
    location_id?: number;
    status?: string;
    user_id?: number;
    limit?: number;
    offset?: number;
  }) {
    const response = await this.api.get('/invoices', { params: filters });
    return response.data;
  }

  async getInvoiceById(id: number, type?: string) {
    const response = await this.api.get(`/invoices/${id}`, {
      params: { invoice_type: type },
    });
    return response.data;
  }

  async updateInvoice(id: number, data: any, type?: string) {
    const response = await this.api.put(`/invoices/${id}`, data, {
      params: { invoice_type: type },
    });
    return response.data;
  }

  async deleteInvoice(id: number, type?: string) {
    const response = await this.api.delete(`/invoices/${id}`, {
      params: { invoice_type: type },
    });
    return response.data;
  }

  async finalizeInvoice(id: number, type: string) {
    const response = await this.api.put(`/invoices/${id}`, { status: 'finalized' }, {
      params: { invoice_type: type },
    });
    return response.data;
  }

  // User Management Endpoints
  async getUsers(params?: any) {
    const response = await this.api.get('/users', { params });
    return response.data;
  }

  async updateUser(id: number, data: any) {
    const response = await this.api.put(`/users/${id}`, data);
    return response.data;
  }

  // Commission Endpoints
  async getCommissions(params?: { from_date?: string; to_date?: string }) {
    const response = await this.api.get('/commissions', { params });
    return response.data;
  }

  // Credit Note Endpoints
  async getCreditNotes(params?: any) {
    const response = await this.api.get('/credit-notes', { params });
    return response.data;
  }

  async createCreditNote(data: any) {
    const response = await this.api.post('/credit-notes', data);
    return response.data;
  }

  async approveCreditNote(id: number) {
    const response = await this.api.post(`/credit-notes/${id}/approve`);
    return response.data;
  }

  // Session & Location Management
  async getTodaySession() {
    const response = await this.api.get('/sessions/today');
    return response.data;
  }

  async createSession(locationId: number) {
    const response = await this.api.post('/sessions', { location_id: locationId });
    return response.data;
  }

  async getLocationMode() {
    const response = await this.api.get('/settings/location-mode');
    return response.data;
  }

  async getUserLocations(userId: number) {
    const response = await this.api.get(`/users/${userId}/locations`);
    return response.data;
  }

  // Category Endpoints
  async getCategories() {
    const response = await this.api.get('/categories');
    return response.data;
  }

  // Customer Management
  async createCustomer(data: { name: string; phone?: string; email?: string; address?: string; tax_number?: string; opening_balance?: number }) {
    const response = await this.api.post('/customers', data);
    return response.data;
  }

  async updateCustomer(id: number, data: any) {
    const response = await this.api.put(`/customers/${id}`, data);
    return response.data;
  }

  async getDefaultTemplate(type = 'invoice') {
    const response = await this.api.get('/invoice-templates/default', { params: { type } });
    return response.data;
  }

  // AI/Chatbot Extraction
  async extractDataWithAI(message: string, base64Image?: string, mimeType = 'image/jpeg') {
    const response = await this.api.post('/chatbot', {
      message,
      image: base64Image,
      mime_type: mimeType,
    });

    // Parse the inner Gemini JSON string from candidates[0].content.parts[0].text
    const rawText = response.data?.gemini?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    try {
      return JSON.parse(rawText);
    } catch (e) {
      console.error('Failed to parse AI response:', rawText);
      return { summary: 'Error parsing AI output', items: [] };
    }
  }
}

export default new ApiService();
