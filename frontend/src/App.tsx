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
import Employees from './pages/Employees';
import InvoiceForm from './pages/InvoiceForm';

import Vans from './pages/Vans';
import Stock from './pages/Stock';
import Transfers from './pages/Transfers';
import Invoices from './pages/Invoices';
import Payments from './pages/Payments';
import Reports from './pages/Reports';
import Inventory from './pages/Inventory';
import Vendors from './pages/Vendors';
import Locations from './pages/Locations';


// Layout
import Layout from './components/Layout';
import POS from './pages/POS';
import Settings from './pages/Settings';
import Users from './pages/Users';

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
            <Route path="customers" element={<Customers />} />
            <Route path="employees" element={<Employees />} />
            <Route path="users" element={<Users />} />
            <Route path="inventory" element={<Inventory />} />
            <Route path="vendors" element={<Vendors />} />
            <Route path="vans" element={<Vans />} />
            <Route path="locations" element={<Locations />} />
            <Route path="stock" element={<Stock />} />
            <Route path="transfers" element={<Transfers />} />
            <Route path="invoices" element={<Invoices />} />
            <Route path="invoices/new" element={<InvoiceForm />} />
            <Route path="payments" element={<Payments />} />
            <Route path="reports" element={<Reports />} />
            <Route path="pos" element={<POS />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" richColors />
    </QueryClientProvider>
  );
}

export default App;
