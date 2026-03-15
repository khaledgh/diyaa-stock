import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
  Package,
  DollarSign,
  AlertCircle,
  TrendingDown,
  TrendingUp,
  X,
  Plus,
  FileText,
  Users,
  Wallet,
  BarChart3
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { reportApi } from '@/lib/api';
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const receivables = dashboardData?.pending_payments || 0;
  const payables = dashboardData?.payables || 0;

  return (
    <div className="min-h-full bg-[#f8fafc] dark:bg-slate-950 p-6 lg:p-10 space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1">
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-400">
            {t('dashboard.title')}
          </h1>
          <p className="text-slate-500 font-medium tracking-tight">
            Comprehensive overview of your business ecosystem
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/sales/new">
            <Button size="lg" className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-200 dark:shadow-none transition-all hover:-translate-y-0.5">
              <Plus className="mr-2 h-5 w-5" />
              New Sale
            </Button>
          </Link>
          <Link to="/inventory">
            <Button size="lg" variant="outline" className="border-slate-200 bg-white shadow-sm hover:bg-slate-50 transition-all hover:-translate-y-0.5">
              <Package className="mr-2 h-5 w-5 text-slate-600" />
              Inventory
            </Button>
          </Link>
        </div>
      </div>

      {showLowStockAlert && dashboardData?.low_stock_count > 0 && (
        <Alert variant="destructive" className="bg-white dark:bg-slate-900 border-rose-200 dark:border-rose-900/50 shadow-xl shadow-rose-100/20 relative overflow-hidden group">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-rose-500" />
          <AlertCircle className="h-5 w-5 text-rose-500" />
          <div className="ml-2">
            <AlertTitle className="font-bold text-rose-700 dark:text-rose-400 text-base">Inventory Alert</AlertTitle>
            <AlertDescription className="text-rose-600 dark:text-rose-500/80 font-medium">
              CRITICAL: {dashboardData.low_stock_count} products are running low on stock. 
              <Link to="/reports/stock-movements" className="ml-2 underline decoration-2 underline-offset-4 hover:text-rose-800 transition-colors">Action Required &rarr;</Link>
            </AlertDescription>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            className="absolute right-3 top-3 h-8 w-8 hover:bg-rose-50 rounded-full"
            onClick={() => setShowLowStockAlert(false)}
          >
            <X className="h-4 w-4 text-rose-400" />
          </Button>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { 
            title: 'Monthly Revenue', 
            val: dashboardData?.monthly_collections || 0, 
            icon: DollarSign, 
            color: 'text-indigo-600', 
            bg: 'bg-indigo-50', 
            trend: '+12.5%', 
            up: true 
          },
          { 
            title: 'Receivables', 
            val: receivables, 
            icon: TrendingUp, 
            color: 'text-emerald-600', 
            bg: 'bg-emerald-50', 
            trend: 'Pending', 
            up: true 
          },
          { 
            title: 'Payables', 
            val: payables, 
            icon: TrendingDown, 
            color: 'text-rose-600', 
            bg: 'bg-rose-50', 
            trend: 'Due', 
            up: false 
          },
          { 
            title: 'Locations', 
            val: dashboardData?.active_locations || 0, 
            icon: Users, 
            color: 'text-amber-600', 
            bg: 'bg-amber-50', 
            trend: 'Active', 
            up: true,
            isCurrency: false
          }
        ].map((item, i) => (
          <Card key={i} className="border-0 shadow-sm hover:shadow-xl transition-all duration-300 group overflow-hidden bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className={`p-2.5 rounded-2xl ${item.bg} dark:bg-slate-800 transition-colors group-hover:scale-110 duration-300`}>
                  <item.icon className={`h-6 w-6 ${item.color}`} />
                </div>
                <Badge variant="outline" className={`${item.up ? 'border-emerald-100 text-emerald-600 bg-emerald-50/30' : 'border-amber-100 text-amber-600 bg-amber-50/30'} text-[10px] font-bold uppercase tracking-wider`}>
                  {item.trend}
                </Badge>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-tight">{item.title}</p>
                <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">
                  {item.isCurrency === false ? item.val : formatCurrency(item.val as number)}
                </h3>
              </div>
            </CardContent>
            <div className="h-1 w-full bg-slate-50 dark:bg-slate-800">
              <div className={`h-full ${item.color.replace('text', 'bg')} opacity-40 group-hover:opacity-100 transition-opacity duration-500`} style={{ width: '40%' }} />
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-7 gap-6">
        <Card className="lg:col-span-4 border-0 shadow-lg bg-white dark:bg-slate-900 overflow-hidden border border-slate-100 dark:border-slate-800">
          <CardHeader className="border-b border-slate-50 dark:border-slate-800 pb-4">
            <div className="flex justify-between items-center">
              <CardTitle className="text-xl font-bold flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-indigo-600" />
                Sales Performance
              </CardTitle>
              <div className="flex gap-1">
                {['7D', '1M', '3M'].map(p => (
                   <Button key={p} variant="ghost" size="sm" className={`text-[10px] font-bold h-7 ${p === '1M' ? 'bg-indigo-50 text-indigo-600' : ''}`}>{p}</Button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-8 pl-0">
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dashboardData?.sales_chart || []}>
                  <defs>
                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="date" 
                    tickLine={false}
                    axisLine={false}
                    fontSize={11}
                    fontWeight={600}
                    tick={{ fill: '#94a3b8' }}
                    dy={10}
                  />
                  <YAxis 
                    tickLine={false}
                    axisLine={false}
                    fontSize={11}
                    fontWeight={600}
                    tick={{ fill: '#94a3b8' }}
                    tickFormatter={(val) => `$${val}`}
                  />
                  <Tooltip 
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }} 
                  />
                  <Area 
                    type="monotone" 
                    dataKey="total" 
                    stroke="#4f46e5" 
                    fillOpacity={1} 
                    fill="url(#colorTotal)" 
                    strokeWidth={3}
                    animationDuration={1500}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3 border-0 shadow-lg bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
          <CardHeader className="border-b border-slate-50 dark:border-slate-800">
            <CardTitle className="text-xl font-bold">Quick Command</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-8">
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Sales Log', to: '/sales/invoices', icon: FileText, color: 'text-blue-500', bg: 'bg-blue-50' },
                { label: 'Inventory', to: '/inventory', icon: Package, color: 'text-orange-500', bg: 'bg-orange-50' },
                { label: 'Receivables', to: '/finance/receivables', icon: Wallet, color: 'text-emerald-500', bg: 'bg-emerald-50' },
                { label: 'Reports', to: '/reports', icon: BarChart3, color: 'text-purple-500', bg: 'bg-purple-50' },
              ].map((item, i) => (
                <Link key={i} to={item.to}>
                  <Button variant="outline" className="w-full h-auto py-5 flex-col gap-2 border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/30 transition-all rounded-3xl group">
                    <div className={`p-2 rounded-xl ${item.bg} dark:bg-slate-800 transition-transform group-hover:scale-110`}>
                      <item.icon className={`h-5 w-5 ${item.color}`} />
                    </div>
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-tight">{item.label}</span>
                  </Button>
                </Link>
              ))}
            </div>

            <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-[40px] relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-150 transition-transform duration-700">
                 <Package className="h-24 w-24 text-indigo-600" />
               </div>
               <h4 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Total Inventory Assets</h4>
               <div className="flex items-end justify-between">
                  <span className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter leading-none">
                    {formatCurrency(dashboardData?.inventory_value || 0)}
                  </span>
                  <div className="h-12 w-12 bg-white dark:bg-slate-700 shadow-sm rounded-full flex items-center justify-center">
                    <TrendingUp className="h-6 w-6 text-indigo-600" />
                  </div>
               </div>
               <div className="mt-4 flex items-center gap-2">
                 <div className="h-1.5 flex-1 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                   <div className="h-full bg-indigo-600 w-2/3 rounded-full" />
                 </div>
                 <span className="text-[10px] font-bold text-slate-400">STOCK HEALTH: 65%</span>
               </div>
            </div>
            
            <Link to="/reports/inventory-valuation" className="block">
              <Button variant="ghost" className="w-full text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 font-bold">
                View Detailed Valuation &rarr;
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

}
