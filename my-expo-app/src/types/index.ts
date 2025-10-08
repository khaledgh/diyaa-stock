export interface User {
  id: number;
  email: string;
  full_name: string;
  role: string;
  van_id?: number;
  location_id?: number; // Location ID for the van
  is_active: boolean;
}

export interface Product {
  id: number;
  name: string;
  sku: string;
  barcode?: string;
  category_name?: string;
  unit_price: number;
  quantity?: number;
  description?: string;
}

export interface StockItem extends Product {
  quantity: number;
  location_type: string;
  location_id: number;
}

export interface Customer {
  id: number;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  balance?: number;
}

export interface CartItem {
  product: StockItem;
  quantity: number;
  unit_price: number;
  discount_percent: number;
  total: number;
}

export interface Invoice {
  id: number;
  invoice_number: string;
  customer_id?: number;
  customer_name?: string;
  van_id: number;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  paid_amount: number;
  payment_status: 'paid' | 'unpaid' | 'partial';
  created_at: string;
  items?: InvoiceItem[];
}

export interface InvoiceItem {
  id: number;
  product_id: number;
  product_name: string;
  quantity: number;
  unit_price: number;
  discount_percent: number;
  tax_percent: number;
  total: number;
}
