import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { useAuthStore } from './store/authStore';
import { useSettingsStore } from './store/settingsStore';
import { useEffect } from 'react';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import ProductForm from './pages/ProductForm';
import Customers from './pages/Customers';
import CustomerStatement from './pages/CustomerStatement';
import Employees from './pages/Employees';
import InvoiceForm from './pages/InvoiceFormNew';
import PurchaseInvoiceDetails from './pages/PurchaseInvoiceDetails';
import SalesInvoiceDetails from './pages/SalesInvoiceDetails';

import Vans from './pages/Vans';
import Transfers from './pages/Transfers';
import Invoices from './pages/InvoicesNew';
import Payments from './pages/Payments';
import Transactions from './pages/Transactions';
import LocationSalesReport from './pages/LocationSalesReport';
import LowStock from './pages/LowStock';
import Inventory from './pages/Inventory';
import Vendors from './pages/Vendors';
import Locations from './pages/Locations';
import Categories from './pages/Categories';
import ProductTypes from './pages/ProductTypes';
import CreditNotes from './pages/CreditNotes';
import PaymentAllocation from './pages/PaymentAllocation';

// Report Pages
import ReportsHub from './pages/ReportsHub';
import ReceivablesAging from './pages/ReceivablesAging';
import PayablesAging from './pages/PayablesAging';
import SalesByCustomer from './pages/SalesByCustomer';
import SalesByItem from './pages/SalesByItem';
import InventoryValuation from './pages/InventoryValuation';
import VendorStatement from './pages/VendorStatement';
import CustomerOverview from './pages/CustomerOverview';

// Layout
import Layout from './components/Layout';
import POS from './pages/POS';
import Settings from './pages/Settings';
import Users from './pages/Users';
import InvoiceTemplates from './pages/InvoiceTemplates';

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
            <Route path="products" element={<Products />} />
            <Route path="products/new" element={<ProductForm />} />
            <Route path="products/edit/:id" element={<ProductForm />} />
            <Route path="categories" element={<Categories />} />
            <Route path="product-types" element={<ProductTypes />} />
            <Route path="customers" element={<Customers />} />
            <Route path="customers/:id" element={<CustomerOverview />} />
            <Route path="customers/:id/statement" element={<CustomerStatement />} />
            <Route path="employees" element={<Employees />} />
            <Route path="users" element={<Users />} />
            <Route path="inventory" element={<Inventory />} />
            <Route path="vendors" element={<Vendors />} />
            <Route path="vendors/:id/statement" element={<VendorStatement />} />
            <Route path="vans" element={<Vans />} />
            <Route path="locations" element={<Locations />} />
            <Route path="transfers" element={<Transfers />} />
            <Route path="credit-notes" element={<CreditNotes />} />
            <Route path="payment-allocation" element={<PaymentAllocation />} />
            <Route path="invoices" element={<Navigate to="/invoices/sales" />} />
            <Route path="invoices/sales" element={<Invoices />} />
            <Route path="invoices/purchase" element={<Invoices />} />
            <Route path="invoices/new" element={<InvoiceForm />} />
            <Route path="invoices/purchase/:id" element={<PurchaseInvoiceDetails />} />
            <Route path="invoices/sales/:id" element={<SalesInvoiceDetails />} />
            <Route path="payments" element={<Payments />} />
            <Route path="transactions" element={<Transactions />} />
            {/* Reports */}
            <Route path="reports" element={<ReportsHub />} />
            <Route path="reports/receivables-aging" element={<ReceivablesAging />} />
            <Route path="reports/payables-aging" element={<PayablesAging />} />
            <Route path="reports/sales-by-customer" element={<SalesByCustomer />} />
            <Route path="reports/sales-by-item" element={<SalesByItem />} />
            <Route path="reports/inventory-valuation" element={<InventoryValuation />} />
            <Route path="reports/location-sales" element={<LocationSalesReport />} />
            <Route path="low-stock" element={<LowStock />} />
            <Route path="pos" element={<POS />} />
            <Route path="settings" element={<Settings />} />
            <Route path="settings/templates" element={<InvoiceTemplates />} />
          </Route>
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" richColors />
    </QueryClientProvider>
  );
}

export default App;
