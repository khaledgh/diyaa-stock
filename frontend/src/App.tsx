import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { useAuthStore } from './store/authStore';
import { useSettingsStore } from './store/settingsStore';
import { useEffect } from 'react';

// Auth Pages
import Login from './pages/auth/Login';

// Dashboard
import Dashboard from './pages/dashboard/Dashboard';

// Inventory Pages
import Products from './pages/inventory/Products';
import ProductForm from './pages/inventory/ProductForm';
import Categories from './pages/inventory/Categories';
import ProductTypes from './pages/inventory/ProductTypes';
import Inventory from './pages/inventory/Inventory';
import LowStock from './pages/inventory/LowStock';
import InventoryValuation from './pages/inventory/InventoryValuation';

// Sales Pages
import Invoices from './pages/sales/InvoicesNew';
import InvoiceForm from './pages/sales/InvoiceFormNew';
import SalesInvoiceDetails from './pages/sales/SalesInvoiceDetails';
import Customers from './pages/sales/Customers';
import CustomerOverview from './pages/sales/CustomerOverview';
import CustomerStatement from './pages/sales/CustomerStatement';
import POS from './pages/sales/POS';

// Purchase Pages
import PurchaseInvoiceDetails from './pages/purchases/PurchaseInvoiceDetails';
import Vendors from './pages/purchases/Vendors';
import VendorStatement from './pages/purchases/VendorStatement';
import CreditNotes from './pages/purchases/CreditNotes';

// Finance Pages
import Payments from './pages/finance/Payments';
import PaymentAllocation from './pages/finance/PaymentAllocation';
import Transactions from './pages/finance/Transactions';
import Transfers from './pages/finance/Transfers';
import Expenses from './pages/expenses/Expenses';
import ExpenseCategories from './pages/expenses/ExpenseCategories';

// Report Pages
import ReportsHub from './pages/reports/ReportsHub';
import ReceivablesAging from './pages/reports/ReceivablesAging';
import PayablesAging from './pages/reports/PayablesAging';
import SalesByCustomer from './pages/reports/SalesByCustomer';
import SalesByItem from './pages/reports/SalesByItem';
import LocationSalesReport from './pages/reports/LocationSalesReport';
import ProfitLoss from './pages/reports/ProfitLoss';

// Settings Pages
import Settings from './pages/settings/Settings';
import InvoiceTemplates from './pages/settings/InvoiceTemplates';
import Locations from './pages/settings/Locations';
import Vans from './pages/settings/Vans';
import Users from './pages/settings/Users';
import Employees from './pages/settings/Employees';

// Layout
import Layout from './components/Layout';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
}

function App() {
  const { theme, language, setLanguage, setTheme } = useSettingsStore();

  useEffect(() => {
    // Initialize theme and language
    setTheme(theme);
    setLanguage(language);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <PrivateRoute>
                <Layout />
              </PrivateRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" />} />
            <Route path="dashboard" element={<Dashboard />} />

            {/* Inventory */}
            <Route path="products" element={<Products />} />
            <Route path="products/new" element={<ProductForm />} />
            <Route path="products/edit/:id" element={<ProductForm />} />
            <Route path="categories" element={<Categories />} />
            <Route path="product-types" element={<ProductTypes />} />
            <Route path="inventory" element={<Inventory />} />
            <Route path="low-stock" element={<LowStock />} />

            {/* Sales */}
            <Route path="customers" element={<Customers />} />
            <Route path="customers/:id" element={<CustomerOverview />} />
            <Route path="customers/:id/statement" element={<CustomerStatement />} />
            <Route path="invoices" element={<Navigate to="/invoices/sales" />} />
            <Route path="invoices/sales" element={<Invoices />} />
            <Route path="invoices/purchase" element={<Invoices />} />
            <Route path="invoices/new" element={<InvoiceForm />} />
            <Route path="invoices/sales/:id" element={<SalesInvoiceDetails />} />
            <Route path="pos" element={<POS />} />

            {/* Purchases */}
            <Route path="vendors" element={<Vendors />} />
            <Route path="vendors/:id/statement" element={<VendorStatement />} />
            <Route path="invoices/purchase/:id" element={<PurchaseInvoiceDetails />} />
            <Route path="credit-notes" element={<CreditNotes />} />

            {/* Finance */}
            <Route path="payments" element={<Payments />} />
            <Route path="payment-allocation" element={<PaymentAllocation />} />
            <Route path="transactions" element={<Transactions />} />
            <Route path="transfers" element={<Transfers />} />
            <Route path="expenses" element={<Expenses />} />
            <Route path="expenses/categories" element={<ExpenseCategories />} />

            {/* Reports */}
            <Route path="reports" element={<ReportsHub />} />
            <Route path="reports/receivables-aging" element={<ReceivablesAging />} />
            <Route path="reports/payables-aging" element={<PayablesAging />} />
            <Route path="reports/sales-by-customer" element={<SalesByCustomer />} />
            <Route path="reports/sales-by-item" element={<SalesByItem />} />
            <Route path="reports/profit-loss" element={<ProfitLoss />} />
            <Route path="reports/inventory-valuation" element={<InventoryValuation />} />
            <Route path="reports/location-sales" element={<LocationSalesReport />} />

            {/* Settings */}
            <Route path="settings" element={<Settings />} />
            <Route path="settings/templates" element={<InvoiceTemplates />} />
            <Route path="locations" element={<Locations />} />
            <Route path="vans" element={<Vans />} />
            <Route path="users" element={<Users />} />
            <Route path="employees" element={<Employees />} />
          </Route>
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" richColors />
    </QueryClientProvider>
  );
}

export default App;
