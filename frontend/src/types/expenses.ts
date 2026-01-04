export interface ExpenseCategory {
  id: number;
  name_en: string;
  name_ar?: string;
  description?: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Expense {
  id: number;
  expense_number: string;
  expense_category_id: number;
  expense_category?: ExpenseCategory;
  vendor_id?: number;
  vendor?: any; // Replace with Vendor type if available
  amount: number;
  tax_amount: number;
  expense_date: string;
  payment_method: string;
  reference_number?: string;
  notes?: string;
  created_by: number;
  created_by_user?: any; // Replace with User type if available
  created_at?: string;
  updated_at?: string;
}
