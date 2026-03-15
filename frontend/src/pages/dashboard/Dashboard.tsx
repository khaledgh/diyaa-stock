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
    <div className="p-8 space-y-8 bg-slate-50/50 dark:bg-transparent min-h-screen">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-8">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white lg:text-5xl">
            {t('dashboard.title')}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 text-lg">
            Welcome back, <span className="font-semibold text-indigo-600 dark:text-indigo-400">Merchant</span>! Here's your business at a glance.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/invoices/new">
            <Button className="h-12 px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-200 dark:shadow-none transition-all hover:scale-105 gap-2">
              <Plus className="h-5 w-5" />
              <span className="font-semibold text-base">New Invoice</span>
            </Button>
          </Link>
          <Link to="/products/new">
            <Button variant="outline" className="h-12 px-6 rounded-2xl border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 transition-all gap-2">
              <Package className="h-5 w-5 text-indigo-500" />
              <span className="font-semibold text-base text-slate-700 dark:text-slate-300 text-base">Add Item</span>
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Receivables Card */}
        <Card className="border-0 shadow-xl shadow-indigo-500/5 bg-white dark:bg-slate-950 overflow-hidden relative group">
          <div className="absolute top-0 right-0 p-4 -mr-8 -mt-8 bg-emerald-500/10 rounded-full w-32 h-32 group-hover:scale-110 transition-transform" />
          <CardContent className="p-8 relative z-10">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40">
                    <TrendingUp className="h-6 w-6 text-emerald-600" />
                  </div>
                  <p className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Receivables</p>
                </div>
                <p className="text-4xl font-black text-slate-900 dark:text-white">
                  {formatCurrency(receivables)}
                </p>
                <div className="mt-4 flex items-center gap-2 text-sm">
                  <span className="bg-emerald-100 text-emerald-700 px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1">
                    <ArrowUpRight className="h-3 w-3" />
                    +12%
                  </span>
                  <span className="text-slate-400 italic">vs last month</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payables Card */}
        <Card className="border-0 shadow-xl shadow-indigo-500/5 bg-white dark:bg-slate-950 overflow-hidden relative group">
          <div className="absolute top-0 right-0 p-4 -mr-8 -mt-8 bg-rose-500/10 rounded-full w-32 h-32 group-hover:scale-110 transition-transform" />
          <CardContent className="p-8 relative z-10">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40">
                    <TrendingDown className="h-6 w-6 text-rose-600" />
                  </div>
                  <p className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Payables</p>
                </div>
                <p className="text-4xl font-black text-slate-900 dark:text-white">
                  {formatCurrency(payables)}
                </p>
                <div className="mt-4 flex items-center gap-2 text-sm">
                  <span className="bg-rose-100 text-rose-700 px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1">
                    <ArrowDownRight className="h-3 w-3" />
                    -5%
                  </span>
                  <span className="text-slate-400 italic">vs last month</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Net Position Card */}
        <Card className="border-0 shadow-xl shadow-indigo-600/10 bg-indigo-600 dark:bg-indigo-900 overflow-hidden relative group">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 to-transparent" />
          <div className="absolute bottom-0 left-0 p-4 -ml-4 -mb-4 bg-white/10 rounded-full w-24 h-24 group-hover:scale-110 transition-transform" />
          <CardContent className="p-8 relative z-10">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2.5 rounded-xl bg-white/20">
                  <Wallet className="h-6 w-6 text-white" />
                </div>
                <p className="text-sm font-bold text-indigo-100 uppercase tracking-wider">Net Position</p>
              </div>
              <p className="text-4xl font-black text-white">
                {formatCurrency(Math.abs(netCashFlow))}
              </p>
              <p className="mt-4 text-sm font-semibold text-indigo-100 flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${netCashFlow >= 0 ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                {netCashFlow >= 0 ? 'Surplus Balance' : 'Outstanding Liability'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
        {[
          { icon: Package, value: dashboardData?.total_products || 0, label: t('dashboard.totalProducts'), color: 'blue' },
          { icon: DollarSign, value: formatCurrency(dashboardData?.today_sales_total || 0), label: "Today's Sales", color: 'purple' },
          { icon: TrendingUp, value: formatCurrency(dashboardData?.monthly_collections || 0), label: "Monthly Collections", color: 'emerald' },
          { icon: AlertCircle, value: dashboardData?.low_stock_count || 0, label: t('dashboard.lowStock'), color: 'orange' },
          { icon: Receipt, value: dashboardData?.credit_notes_pending || 0, label: "Pending Issues", color: 'rose' },
        ].map((stat, i) => (
          <Card key={i} className="border-0 shadow-lg shadow-slate-200/50 dark:shadow-none bg-white/80 dark:bg-slate-900/50 backdrop-blur-xl hover:scale-105 transition-transform cursor-default">
            <CardContent className="p-6">
              <div className="flex flex-col items-center text-center gap-3">
                <div className={`p-3 rounded-2xl bg-${stat.color}-50 dark:bg-${stat.color}-950/40`}>
                  <stat.icon className={`h-6 w-6 text-${stat.color}-600 dark:text-${stat.color}-400`} />
                </div>
                <div>
                  <p className="text-2xl font-black text-slate-800 dark:text-white leading-none mb-1">{stat.value}</p>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-tighter">{stat.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="border-0 shadow-xl shadow-slate-200/50 dark:shadow-none bg-white dark:bg-slate-950 overflow-hidden">
          <CardHeader className="pb-4 border-b border-slate-50 dark:border-slate-900 bg-slate-50/30 dark:bg-transparent">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <BarChart3 className="h-6 w-6 text-indigo-500" />
              Sales Performance
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8">
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dashboardData?.sales_chart || []}>
                  <defs>
                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#4F46E5" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" opacity={0.5} />
                  <XAxis 
                    dataKey="date" 
                    axisLine={false}
                    tickLine={false}
                    tick={{fill: '#94A3B8', fontSize: 12, fontWeight: 600}}
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false}
                    tickLine={false}
                    tick={{fill: '#94A3B8', fontSize: 12, fontWeight: 600}}
                    tickFormatter={(value) => `$${value}`}
                  />
                  <Tooltip 
                    contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', fontWeight: 'bold'}}
                    itemStyle={{color: '#4F46E5'}}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="total" 
                    stroke="#4F46E5" 
                    strokeWidth={4}
                    fillOpacity={1} 
                    fill="url(#colorSales)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Inventory Status with Radial feel */}
        <Card className="border-0 shadow-xl shadow-slate-200/50 dark:shadow-none bg-white dark:bg-slate-950 overflow-hidden">
          <CardHeader className="pb-4 border-b border-slate-50 dark:border-slate-900 bg-slate-50/30 dark:bg-transparent">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Package className="h-6 w-6 text-indigo-500" />
              Inventory Metrics
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8">
            <div className="flex items-center justify-between mb-8">
              <div>
                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Total Stock Value</p>
                <p className="text-3xl font-black text-slate-900 dark:text-white mt-1">
                  {formatCurrency(dashboardData?.inventory_value || 0)}
                </p>
              </div>
              <div className="p-4 rounded-3xl bg-indigo-50 dark:bg-indigo-900/30">
                <DollarSign className="h-10 w-10 text-indigo-600" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="p-6 rounded-3xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Active Hubs</p>
                <p className="text-3xl font-black text-slate-800 dark:text-white">{dashboardData?.active_locations || 0}</p>
                <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full mt-3 overflow-hidden">
                  <div className="h-full bg-indigo-500 rounded-full" style={{width: '70%'}} />
                </div>
              </div>
              <div className="p-6 rounded-3xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Monthly Rev.</p>
                <p className="text-3xl font-black text-slate-800 dark:text-white">{formatCurrency(dashboardData?.product_revenue || 0)}</p>
                <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full mt-3 overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{width: '85%'}} />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Links with more style */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {[
          { to: "/invoices/sales", icon: FileText, label: "View Invoices", color: "indigo" },
          { to: "/customers", icon: Users, label: "Customers", color: "emerald" },
          { to: "/reports", icon: BarChart3, label: "Business Reports", color: "purple" },
          { to: "/inventory", icon: Package, label: "Inventory Hub", color: "amber" },
        ].map((link, i) => (
          <Link key={i} to={link.to} className="group">
            <Card className="border-0 shadow-lg shadow-slate-200/50 dark:shadow-none group-hover:scale-105 transition-all overflow-hidden relative">
              <div className={`absolute top-0 left-0 w-1 h-full bg-${link.color}-500`} />
              <CardContent className="p-6 flex items-center gap-4">
                <div className={`p-3 rounded-2xl bg-${link.color}-50 dark:bg-${link.color}-950/40 group-hover:rotate-12 transition-transform`}>
                  <link.icon className={`h-6 w-6 text-${link.color}-600 dark:text-${link.color}-400`} />
                </div>
                <span className="text-base font-bold text-slate-700 dark:text-slate-300 group-hover:text-indigo-600 transition-colors">{link.label}</span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
