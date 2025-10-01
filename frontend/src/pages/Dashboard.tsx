import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Package, DollarSign, AlertCircle, Truck, TrendingDown, TrendingUp, Bell, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { reportApi, productApi } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from 'recharts';
import { useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function Dashboard() {
  const { t } = useTranslation();
  const [showLowStockAlert, setShowLowStockAlert] = useState(true);

  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const response = await reportApi.dashboard();
      return response.data.data || response.data;
    },
  });

  const { data: lowStockProducts } = useQuery({
    queryKey: ['low-stock-products'],
    queryFn: async () => {
      const response = await productApi.getAll({ low_stock: true });
      // Handle paginated response
      const apiData = response.data.data || response.data;
      return Array.isArray(apiData) ? apiData : (apiData.data || []);
    },
    enabled: dashboardData?.low_stock_count > 0,
  });

  if (isLoading) {
    return <div className="text-center py-8">{t('common.loading')}</div>;
  }

  const stats = [
    {
      title: t('dashboard.totalProducts'),
      value: dashboardData?.total_products || 0,
      icon: Package,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100 dark:bg-blue-900',
    },
    {
      title: t('dashboard.warehouseValue'),
      value: formatCurrency(dashboardData?.warehouse_value || 0),
      icon: DollarSign,
      color: 'text-green-600',
      bgColor: 'bg-green-100 dark:bg-green-900',
    },
    {
      title: t('dashboard.todaySales'),
      value: formatCurrency(dashboardData?.today_sales_total || 0),
      subtitle: `${dashboardData?.today_sales_count || 0} ${t('invoices.title')}`,
      icon: DollarSign,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100 dark:bg-purple-900',
    },
    {
      title: t('dashboard.pendingPayments'),
      value: formatCurrency(dashboardData?.pending_payments || 0),
      subtitle: 'Receivables from customers',
      icon: AlertCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-100 dark:bg-red-900',
    },
    {
      title: 'Amount to Pay',
      value: formatCurrency(dashboardData?.payables || 0),
      subtitle: 'Unpaid purchase invoices',
      icon: TrendingDown,
      color: 'text-red-700',
      bgColor: 'bg-red-200 dark:bg-red-950',
    },
    {
      title: t('dashboard.lowStock'),
      value: dashboardData?.low_stock_count || 0,
      icon: AlertCircle,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100 dark:bg-orange-900',
    },
    {
      title: t('dashboard.activeVans'),
      value: dashboardData?.active_vans || 0,
      icon: Truck,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-100 dark:bg-indigo-900',
    },
  ];

  return (
    <div className="space-y-8 p-6 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 min-h-screen">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            {t('dashboard.title')}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Welcome back! Here's what's happening today.</p>
        </div>
      </div>

      {/* Low Stock Alert */}
      {showLowStockAlert && dashboardData?.low_stock_count > 0 && (
        <Alert className="border-orange-200 bg-orange-50 dark:bg-orange-900/20 dark:border-orange-800">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <Bell className="h-5 w-5 text-orange-600 dark:text-orange-400 mt-0.5" />
              <div className="flex-1">
                <AlertTitle className="text-orange-800 dark:text-orange-300 font-semibold">
                  Low Stock Alert!
                </AlertTitle>
                <AlertDescription className="text-orange-700 dark:text-orange-400 mt-1">
                  You have {dashboardData.low_stock_count} product(s) running low on stock. Please restock soon.
                </AlertDescription>
                {lowStockProducts && lowStockProducts.length > 0 && (
                  <div className="mt-3 space-y-1">
                    {lowStockProducts.slice(0, 5).map((product: any) => (
                      <div key={product.id} className="text-sm text-orange-600 dark:text-orange-400">
                        • {product.name_en} - Stock: {product.warehouse_stock} (Min: {product.min_stock_level})
                      </div>
                    ))}
                    {lowStockProducts.length > 5 && (
                      <div className="text-sm text-orange-600 dark:text-orange-400 font-medium">
                        + {lowStockProducts.length - 5} more products
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowLowStockAlert(false)}
              className="text-orange-600 hover:text-orange-700 hover:bg-orange-100 dark:hover:bg-orange-900/30"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </Alert>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => (
          <Card key={index} className="hover:shadow-xl transition-all duration-300 border-0 bg-white dark:bg-gray-800 overflow-hidden group">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                    {stat.title}
                  </p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
                    {stat.value}
                  </p>
                  {stat.subtitle && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {stat.subtitle}
                    </p>
                  )}
                </div>
                <div className={`flex-shrink-0 p-4 rounded-2xl ${stat.bgColor} group-hover:scale-110 transition-transform duration-300`}>
                  <stat.icon className={`h-7 w-7 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Chart */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              {t('dashboard.salesChart')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dashboardData?.sales_chart || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" stroke="#6b7280" />
                <YAxis stroke="#6b7280" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                  }} 
                />
                <Bar dataKey="total" fill="#3b82f6" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Revenue Trend */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              Revenue Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dashboardData?.sales_chart || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" stroke="#6b7280" />
                <YAxis stroke="#6b7280" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                  }} 
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="total" 
                  stroke="#10b981" 
                  strokeWidth={3}
                  dot={{ fill: '#10b981', r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
