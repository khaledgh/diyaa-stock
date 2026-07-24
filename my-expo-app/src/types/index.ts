export interface User {
  id: number;
  email: string;
  full_name: string;
  role: string;
  location_id?: number;
  location_name?: string;
  location_ids?: number[];
  locations?: Location[];
  location_mode?: 'automatic' | 'manual';
  is_active: boolean;
  commission_rate?: number;
  phone?: string;
  position?: string;
}

export interface Location {
  id: number;
  name: string;
  type: string;
  address?: string;
  phone?: string;
  is_active: boolean;
}

export interface Category {
  id: number;
  name_en: string;
  name_ar?: string;
  description?: string;
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
  location_type?: string;
  location_id?: number;
}

export interface Customer {
  id: number;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  balance?: number;
}

export interface Vendor {
  id: number;
  name: string;
  company_name?: string;
  phone?: string;
  email?: string;
  address?: string;
}

export interface CartItem {
  item_id?: number; // backend item ID (for edit diff)
  product: StockItem;
  quantity: number;
  unit_price: number;
  discount_percent: number;
  total: number;
}

export interface Invoice {
  id: number;
  invoice_number: string;
  credit_note_number?: string;
  invoice_type: 'sales' | 'purchase' | 'credit_note';
  customer_id?: number;
  customer_name?: string;
  customer?: { id: number; name: string; balance?: number; phone?: string };
  vendor_id?: number;
  vendor_name?: string;
  vendor?: { id: number; name: string; balance?: number };
  location_id: number;
  location?: { id: number; name: string };
  location_name?: string;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  paid_amount: number;
  payment_status: 'paid' | 'unpaid' | 'partial';
  status?: 'draft' | 'finalized' | 'approved' | 'cancelled' | 'pending';
  created_at: string;
  created_by_user?: { id: number; full_name: string };
  items?: InvoiceItem[];
}

export interface CreditNote {
  id: number;
  credit_note_number: string;
  invoice_id: number;
  invoice_number: string;
  customer_id?: number;
  customer_name?: string;
  vendor_id?: number;
  vendor_name?: string;
  total_amount: number;
  status: 'draft' | 'approved' | 'cancelled';
  created_at: string;
  items?: any[];
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
