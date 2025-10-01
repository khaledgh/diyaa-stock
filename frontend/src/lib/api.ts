import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/diyaa-stock/new/backend/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Only logout if not on login page to avoid redirect loops
      const isLoginRequest = error.config?.url?.includes('/login');
      if (!isLoginRequest) {
        console.log('401 Unauthorized - logging out');
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// API endpoints
export const authApi = {
  login: (email: string, password: string) => 
    api.post('/login', { email, password }),
  me: () => api.get('/me'),
};

export const productApi = {
  getAll: (params?: any) => api.get('/products', { params }),
  getById: (id: number) => api.get(`/products/${id}`),
  create: (data: any) => api.post('/products', data),
  update: (id: number, data: any) => api.put(`/products/${id}`, data),
  delete: (id: number) => api.delete(`/products/${id}`),
};

export const categoryApi = {
  getAll: () => api.get('/categories'),
  create: (data: any) => api.post('/categories', data),
  update: (id: number, data: any) => api.put(`/categories/${id}`, data),
  delete: (id: number) => api.delete(`/categories/${id}`),
};

export const locationApi = {
  getAll: () => api.get('/locations'),
  getById: (id: number) => api.get(`/locations/${id}`),
  create: (data: any) => api.post('/locations', data),
  update: (id: number, data: any) => api.put(`/locations/${id}`, data),
  delete: (id: number) => api.delete(`/locations/${id}`),
};

export const employeeApi = {
  getAll: () => api.get('/employees'),
  getById: (id: number) => api.get(`/employees/${id}`),
  create: (data: any) => api.post('/employees', data),
  update: (id: number, data: any) => api.put(`/employees/${id}`, data),
  delete: (id: number) => api.delete(`/employees/${id}`),
};

export const customerApi = {
  getAll: (params?: any) => api.get('/customers', { params }),
  getById: (id: number) => api.get(`/customers/${id}`),
  create: (data: any) => api.post('/customers', data),
  update: (id: number, data: any) => api.put(`/customers/${id}`, data),
  delete: (id: number) => api.delete(`/customers/${id}`),
};

export const vanApi = {
  getAll: () => api.get('/vans'),
  getById: (id: number) => api.get(`/vans/${id}`),
  getStock: (id: number) => api.get(`/vans/${id}/stock`),
  create: (data: any) => api.post('/vans', data),
  update: (id: number, data: any) => api.put(`/vans/${id}`, data),
  delete: (id: number) => api.delete(`/vans/${id}`),
};

export const stockApi = {
  getWarehouse: () => api.get('/stock'),
  getMovements: (params?: any) => api.get('/stock/movements', { params }),
};

export const transferApi = {
  getAll: (params?: any) => api.get('/transfers', { params }),
  getById: (id: number) => api.get(`/transfers/${id}`),
  create: (data: any) => api.post('/transfers', data),
};

export const invoiceApi = {
  getAll: (params?: any) => api.get('/invoices', { params }),
  getStats: () => api.get('/invoices/stats'),
  getById: (id: number) => api.get(`/invoices/${id}`),
  createPurchase: (data: any) => api.post('/invoices/purchase', data),
  createSales: (data: any) => api.post('/invoices/sales', data),
};

export const paymentApi = {
  getAll: (params?: any) => api.get('/payments', { params }),
  create: (data: any) => api.post('/payments', data),
};

export const reportApi = {
  dashboard: () => api.get('/reports/dashboard'),
  sales: (params?: any) => api.get('/reports/sales', { params }),
  stockMovements: (params?: any) => api.get('/reports/stock-movements', { params }),
  receivables: () => api.get('/reports/receivables'),
  productPerformance: (params?: any) => api.get('/reports/product-performance', { params }),
};

export const userApi = {
  getAll: (params?: any) => api.get('/users', { params }),
  getById: (id: number) => api.get(`/users/${id}`),
  create: (data: any) => api.post('/users', data),
  update: (id: number, data: any) => api.put(`/users/${id}`, data),
  delete: (id: number) => api.delete(`/users/${id}`),
};
