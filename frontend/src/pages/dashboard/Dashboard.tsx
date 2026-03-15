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
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            {t('dashboard.title')}
          </h1>
          <p className="text-slate-500 mt-1 italic">
            Overview of your business performance
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/sales/new">
            <Button className="bg-primary hover:bg-primary/90">
              <Plus className="mr-2 h-4 w-4" />
              New Sale
            </Button>
          </Link>
          <Link to="/inventory/new">
            <Button variant="outline">
              <Package className="mr-2 h-4 w-4" />
              Add Product
            </Button>
          </Link>
        </div>
      </div>

      {showLowStockAlert && dashboardData?.low_stock_count > 0 && (
        <Alert variant="destructive" className="bg-destructive/5 border-destructive/20">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle className="font-bold">Low Stock Warning</AlertTitle>
          <AlertDescription>
            You have {dashboardData.low_stock_count} products with low inventory. 
            <Link to="/reports/stock-movements" className="ml-2 underline font-semibold">View stock report</Link>
          </AlertDescription>
          <Button 
            variant="ghost" 
            size="icon" 
            className="absolute right-2 top-2 h-6 w-6"
            onClick={() => setShowLowStockAlert(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="shadow-sm border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(dashboardData?.monthly_collections || 0)}</div>
            <p className="text-xs text-muted-foreground">+20.1% from last month</p>
          </CardContent>
        </Card>
        
        <Card className="shadow-sm border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Receivables</CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {formatCurrency(receivables)}
            </div>
            <p className="text-xs text-muted-foreground">Outstanding from customers</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Payables</CardTitle>
            <TrendingDown className="h-4 w-4 text-rose-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-rose-600 dark:text-rose-400">
              {formatCurrency(payables)}
            </div>
            <p className="text-xs text-muted-foreground">Due to suppliers</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Locations</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData?.active_locations || 0}</div>
            <p className="text-xs text-muted-foreground">Branch operations</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-7 gap-4">
        <Card className="lg:col-span-4 shadow-sm border-slate-200">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Sales Analytics</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dashboardData?.sales_chart || []}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis 
                    dataKey="date" 
                    tickLine={false}
                    axisLine={false}
                    fontSize={12}
                    tickFormatter={(val) => val}
                  />
                  <YAxis 
                    tickLine={false}
                    axisLine={false}
                    fontSize={12}
                    tickFormatter={(val) => `$${val}`}
                  />
                  <Tooltip />
                  <Area 
                    type="monotone" 
                    dataKey="total" 
                    stroke="hsl(var(--primary))" 
                    fill="hsl(var(--primary))" 
                    fillOpacity={0.1} 
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3 shadow-sm border-slate-200">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Link to="/sales/invoices">
                <Button variant="outline" className="w-full justify-start h-14 border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                  <FileText className="mr-2 h-4 w-4 text-blue-500" />
                  Sales Log
                </Button>
              </Link>
              <Link to="/inventory">
                <Button variant="outline" className="w-full justify-start h-14 border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                  <Package className="mr-2 h-4 w-4 text-orange-500" />
                  Inventory
                </Button>
              </Link>
              <Link to="/finance/receivables">
                <Button variant="outline" className="w-full justify-start h-14 border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                  <Wallet className="mr-2 h-4 w-4 text-green-500" />
                  Receivables
                </Button>
              </Link>
              <Link to="/reports">
                <Button variant="outline" className="w-full justify-start h-14 border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                  <BarChart3 className="mr-2 h-4 w-4 text-purple-500" />
                  Reports
                </Button>
              </Link>
            </div>

            <div className="mt-6 pt-6 border-t border-slate-100">
               <h4 className="text-sm font-semibold mb-3">Inventory Value</h4>
               <div className="flex items-center justify-between">
                  <span className="text-2xl font-black text-slate-800">
                    {formatCurrency(dashboardData?.inventory_value || 0)}
                  </span>
                  <div className="h-10 w-10 bg-blue-50 rounded-full flex items-center justify-center">
                    <DollarSign className="h-5 w-5 text-blue-600" />
                  </div>
               </div>
               <p className="text-xs text-slate-400 mt-1 uppercase font-bold tracking-tighter">
                  Aggregated across all locations
               </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
