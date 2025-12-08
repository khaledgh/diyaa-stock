import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/diyaa-stock/new/backend/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Enable sending cookies with requests
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

export const productTypeApi = {
  getAll: () => api.get('/product-types'),
  create: (data: any) => api.post('/product-types', data),
  update: (id: number, data: any) => api.put(`/product-types/${id}`, data),
  delete: (id: number) => api.delete(`/product-types/${id}`),
};

export const locationApi = {
  getAll: () => api.get('/locations'),
  getById: (id: number) => api.get(`/locations/${id}`),
  create: (data: any) => api.post('/locations', data),
  update: (id: number, data: any) => api.put(`/locations/${id}`, data),
  delete: (id: number) => api.delete(`/locations/${id}`),
};

// Employee API removed - now merged with userApi
// All employee data is now managed through the users endpoint

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
  getAllStock: () => api.get('/stock/inventory'),
  getByLocation: (locationId: number) => api.get(`/stock/location/${locationId}`),
  getMovements: (params?: any) => api.get('/stock/movements', { params }),
  adjustStock: (data: any) => api.post('/stock/adjust', data),
  addStock: (data: any) => api.post('/stock/add', data),
};

export const transferApi = {
  getAll: (params?: any) => api.get('/transfers', { params }),
  getById: (id: number) => api.get(`/transfers/${id}`),
  create: (data: any) => api.post('/transfers', data),
};

export const invoiceApi = {
  getAll: (params?: any) => api.get('/invoices', { params }),
  getStats: () => api.get('/invoices/stats'),
  getById: (id: number, type?: string) => api.get(`/invoices/${id}`, { params: { invoice_type: type } }),
  createPurchase: (data: any) => api.post('/invoices/purchase', data),
  createSales: (data: any) => api.post('/invoices/sales', data),
  update: (id: number, data: any, type?: string) => api.put(`/invoices/${id}`, data, { params: { invoice_type: type } }),
  updateSalesItem: (invoiceId: number, itemId: number, data: any) => api.put(`/invoices/sales/${invoiceId}/items/${itemId}`, data),
  updatePurchaseItem: (invoiceId: number, itemId: number, data: any) => api.put(`/invoices/purchase/${invoiceId}/items/${itemId}`, data),
  addSalesItem: (invoiceId: number, data: any) => api.post(`/invoices/sales/${invoiceId}/items`, data),
  addPurchaseItem: (invoiceId: number, data: any) => api.post(`/invoices/purchase/${invoiceId}/items`, data),
  delete: (id: number, type?: string) => api.delete(`/invoices/${id}`, { params: { invoice_type: type } }),
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
  locationSales: (params?: any) => api.get('/reports/location-sales', { params }),
};

export const userApi = {
  getAll: (params?: any) => api.get('/users', { params }),
  getById: (id: number) => api.get(`/users/${id}`),
  create: (data: any) => api.post('/users', data),
  update: (id: number, data: any) => api.put(`/users/${id}`, data),
  delete: (id: number) => api.delete(`/users/${id}`),
};

export const vendorApi = {
  getAll: (params?: any) => api.get('/vendors', { params }),
  getById: (id: number) => api.get(`/vendors/${id}`),
  create: (data: any) => api.post('/vendors', data),
  update: (id: number, data: any) => api.put(`/vendors/${id}`, data),
  delete: (id: number) => api.delete(`/vendors/${id}`),
};

export const creditNoteApi = {
  getAll: (params?: any) => api.get('/credit-notes', { params }),
  getById: (id: number) => api.get(`/credit-notes/${id}`),
  create: (data: any) => api.post('/credit-notes', data),
  update: (id: number, data: any) => api.put(`/credit-notes/${id}`, data),
  approve: (id: number) => api.post(`/credit-notes/${id}/approve`),
  cancel: (id: number) => api.post(`/credit-notes/${id}/cancel`),
  delete: (id: number) => api.delete(`/credit-notes/${id}`),
};

export const paymentAllocationApi = {
  allocateFIFO: (data: any) => api.post('/payment-allocations/allocate-fifo', data),
  getPaymentAllocations: (paymentId: number) => api.get(`/payment-allocations/${paymentId}/allocations`),
  getInvoiceAllocations: (invoiceId: number, invoiceType: string) => 
    api.get(`/invoices/${invoiceId}/allocations`, { params: { invoice_type: invoiceType } }),
  getAllocationSummary: (paymentId: number) => api.get(`/payment-allocations/${paymentId}/allocation-summary`),
};
