// API Configuration
export const API_BASE_URL = 'https://transgate-api.linksbridge.top/api';

export const API_ENDPOINTS = {
  LOGIN: '/login',
  ME: '/me',
  PRODUCTS: '/products',
  STOCK: '/stock',
  VAN_STOCK: (vanId: number) => `/vans/${vanId}/stock`,
  CUSTOMERS: '/customers',
  CREATE_SALES_INVOICE: '/invoices/sales',
  INVOICES: '/invoices',
} as const;
