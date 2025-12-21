import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { 
  Package, 
  DollarSign, 
  AlertCircle, 
  TrendingDown, 
  TrendingUp, 
  Bell, 
  X, 
  Receipt, 
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  FileText,
  Users,
  Wallet
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { reportApi, productApi } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer
} from 'recharts';
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
      const apiData = response.data.data || response.data;
      return Array.isArray(apiData) ? apiData : (apiData.data || []);
    },
    enabled: dashboardData?.low_stock_count > 0,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const receivables = dashboardData?.pending_payments || 0;
  const payables = dashboardData?.payables || 0;
  const netCashFlow = receivables - payables;

  return (
    <div className="p-6 space-y-6">
      {/* Header with Quick Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {t('dashboard.title')}
          </h1>
          <p className="text-muted-foreground mt-1">
            Welcome back! Here's your business overview.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/invoices/new">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              New Invoice
            </Button>
          </Link>
          <Link to="/products/new">
            <Button variant="outline" className="gap-2">
              <Package className="h-4 w-4" />
              Add Item
            </Button>
          </Link>
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
                  Low Stock Alert
                </AlertTitle>
                <AlertDescription className="text-orange-700 dark:text-orange-400 mt-1">
                  {dashboardData.low_stock_count} product(s) need restocking.
                </AlertDescription>
                {lowStockProducts && lowStockProducts.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {lowStockProducts.slice(0, 3).map((product: any) => (
                      <span key={product.id} className="text-xs px-2 py-1 bg-orange-100 dark:bg-orange-800/30 rounded-full text-orange-700 dark:text-orange-300">
                        {product.name_en}
                      </span>
                    ))}
                    {lowStockProducts.length > 3 && (
                      <Link to="/low-stock" className="text-xs text-orange-600 dark:text-orange-400 underline hover:no-underline">
                        +{lowStockProducts.length - 3} more
                      </Link>
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

      {/* Financial Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Receivables Card */}
        <Card className="stat-card border-0 shadow-md hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Receivables</p>
                <p className="text-3xl font-bold text-green-600 mt-2">
                  {formatCurrency(receivables)}
                </p>
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <ArrowUpRight className="h-3 w-3 text-green-600" />
                  Money owed by customers
                </p>
              </div>
              <div className="p-4 rounded-2xl bg-green-100 dark:bg-green-900/30">
                <TrendingUp className="h-8 w-8 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payables Card */}
        <Card className="stat-card border-0 shadow-md hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Payables</p>
                <p className="text-3xl font-bold text-red-600 mt-2">
                  {formatCurrency(payables)}
                </p>
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <ArrowDownRight className="h-3 w-3 text-red-600" />
                  Money owed to vendors
                </p>
              </div>
              <div className="p-4 rounded-2xl bg-red-100 dark:bg-red-900/30">
                <TrendingDown className="h-8 w-8 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Net Position Card */}
        <Card className="stat-card border-0 shadow-md hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Net Position</p>
                <p className={`text-3xl font-bold mt-2 ${netCashFlow >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                  {formatCurrency(Math.abs(netCashFlow))}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {netCashFlow >= 0 ? 'Net Receivable' : 'Net Payable'}
                </p>
              </div>
              <div className={`p-4 rounded-2xl ${netCashFlow >= 0 ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-orange-100 dark:bg-orange-900/30'}`}>
                <Wallet className={`h-8 w-8 ${netCashFlow >= 0 ? 'text-blue-600' : 'text-orange-600'}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <Package className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{dashboardData?.total_products || 0}</p>
                <p className="text-xs text-muted-foreground">{t('dashboard.totalProducts')}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                <DollarSign className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{formatCurrency(dashboardData?.today_sales_total || 0)}</p>
                <p className="text-xs text-muted-foreground">{t('dashboard.todaySales')}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30">
                <AlertCircle className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{dashboardData?.low_stock_count || 0}</p>
                <p className="text-xs text-muted-foreground">{t('dashboard.lowStock')}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-teal-100 dark:bg-teal-900/30">
                <Receipt className="h-5 w-5 text-teal-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{dashboardData?.credit_notes_pending || 0}</p>
                <p className="text-xs text-muted-foreground">Pending Credit Notes</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Trend Area Chart */}
        <Card className="border-0 shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Sales Trend (Last 7 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={dashboardData?.sales_chart || []}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(210, 78%, 39%)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(210, 78%, 39%)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                  }} 
                />
                <Area 
                  type="monotone" 
                  dataKey="total" 
                  stroke="hsl(210, 78%, 39%)" 
                  strokeWidth={2}
                  fill="url(#colorSales)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Inventory Value Card */}
        <Card className="border-0 shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              Inventory Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-xl">
              <div>
                <p className="text-sm text-muted-foreground">Total Inventory Value</p>
                <p className="text-3xl font-bold text-foreground mt-1">
                  {formatCurrency(dashboardData?.inventory_value || 0)}
                </p>
              </div>
              <div className="p-3 bg-primary/10 rounded-xl">
                <DollarSign className="h-8 w-8 text-primary" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 border rounded-xl">
                <p className="text-sm text-muted-foreground">Active Locations</p>
                <p className="text-2xl font-bold">{dashboardData?.active_locations || 0}</p>
              </div>
              <div className="p-4 border rounded-xl">
                <p className="text-sm text-muted-foreground">Monthly Revenue</p>
                <p className="text-2xl font-bold">{formatCurrency(dashboardData?.product_revenue || 0)}</p>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Products Sold This Month</span>
              <span className="font-semibold">{dashboardData?.top_products_count || 0} items</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link to="/invoices/sales" className="group">
          <Card className="border-0 shadow-sm hover:shadow-md transition-all group-hover:border-primary/20">
            <CardContent className="p-4 flex items-center gap-3">
              <FileText className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
              <span className="text-sm font-medium">View Invoices</span>
            </CardContent>
          </Card>
        </Link>
        <Link to="/customers" className="group">
          <Card className="border-0 shadow-sm hover:shadow-md transition-all group-hover:border-primary/20">
            <CardContent className="p-4 flex items-center gap-3">
              <Users className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
              <span className="text-sm font-medium">Customers</span>
            </CardContent>
          </Card>
        </Link>
        <Link to="/reports" className="group">
          <Card className="border-0 shadow-sm hover:shadow-md transition-all group-hover:border-primary/20">
            <CardContent className="p-4 flex items-center gap-3">
              <BarChart3 className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
              <span className="text-sm font-medium">Reports</span>
            </CardContent>
          </Card>
        </Link>
        <Link to="/inventory" className="group">
          <Card className="border-0 shadow-sm hover:shadow-md transition-all group-hover:border-primary/20">
            <CardContent className="p-4 flex items-center gap-3">
              <Package className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
              <span className="text-sm font-medium">Inventory</span>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
