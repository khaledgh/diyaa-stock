import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
  Package,
  DollarSign,
  AlertCircle,
  TrendingDown,
  TrendingUp,
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
import { usePermissions } from '@/hooks/usePermissions';

export default function Dashboard() {
  const { t } = useTranslation();
  const { isSales } = usePermissions();
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
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const receivables = dashboardData?.pending_payments || 0;
  const payables = dashboardData?.payables || 0;

  const cards = isSales() ? [
    { title: "Today's Sales", val: dashboardData?.today_sales_total || 0, icon: DollarSign, color: 'text-blue-600' },
    { title: "Today's Collections", val: dashboardData?.today_collections || 0, icon: Wallet, color: 'text-indigo-600' },
    { title: 'Pending Receivables', val: receivables, icon: TrendingUp, color: 'text-green-600' },
    { title: 'Monthly Collections', val: dashboardData?.monthly_collections || 0, icon: DollarSign, color: 'text-purple-600' }
  ] : [
    { title: 'Monthly Collections', val: dashboardData?.monthly_collections || 0, icon: DollarSign, color: 'text-blue-600' },
    { title: 'Pending Receivables', val: receivables, icon: TrendingUp, color: 'text-green-600' },
    { title: 'Total Payables', val: payables, icon: TrendingDown, color: 'text-red-600' },
    { title: 'Active Locations', val: dashboardData?.active_locations || 0, icon: Users, color: 'text-purple-600', isCurrency: false }
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('dashboard.title')}</h1>
          <p className="text-muted-foreground">Overview of your activity</p>
        </div>
        <div className="flex gap-2">
          <Link to="/sales/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Sale
            </Button>
          </Link>
          {!isSales() && (
            <Link to="/inventory">
              <Button variant="outline" className="h-10">
                <Package className="mr-2 h-4 w-4" />
                Inventory
              </Button>
            </Link>
          )}
        </div>
      </div>

      {showLowStockAlert && !isSales() && dashboardData?.low_stock_count > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Low Stock Warning</AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            <span>There are {dashboardData.low_stock_count} products with low stock levels.</span>
            <div className="flex items-center gap-2">
              <Link to="/reports/stock-movements" className="underline font-medium">View Report</Link>
              <Button variant="ghost" size="sm" onClick={() => setShowLowStockAlert(false)}>Dismiss</Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {cards.map((item, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{item.title}</CardTitle>
              <item.icon className={`h-4 w-4 ${item.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {item.isCurrency === false ? item.val : formatCurrency(item.val as number)}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Sales Activity</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dashboardData?.sales_chart || []}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" tickLine={false} axisLine={false} fontSize={12} tick={{ fill: '#888888' }} />
                  <YAxis tickLine={false} axisLine={false} fontSize={12} tick={{ fill: '#888888' }} tickFormatter={(val) => `$${val}`} />
                  <Tooltip />
                  <Area type="monotone" dataKey="total" stroke="#2563eb" fill="#3b82f6" fillOpacity={0.1} strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Quick Access</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <Link to="/invoices/sales">
                <Button variant="outline" className="w-full h-24 flex-col gap-2">
                  <FileText className="h-6 w-6" />
                  <span>Sales Log</span>
                </Button>
              </Link>
              {isSales() ? (
                <Link to="/pos">
                  <Button variant="outline" className="w-full h-24 flex-col gap-2">
                    <Plus className="h-6 w-6" />
                    <span>POS</span>
                  </Button>
                </Link>
              ) : (
                <Link to="/inventory">
                  <Button variant="outline" className="w-full h-24 flex-col gap-2">
                    <Package className="h-6 w-6" />
                    <span>Inventory</span>
                  </Button>
                </Link>
              )}
              <Link to={isSales() ? "/customers" : "/finance/receivables"}>
                <Button variant="outline" className="w-full h-24 flex-col gap-2">
                  {isSales() ? <Users className="h-6 w-6" /> : <Wallet className="h-6 w-6" />}
                  <span>{isSales() ? "Customers" : "Receivables"}</span>
                </Button>
              </Link>
              {isSales() ? (
                <Link to="/credit-notes">
                  <Button variant="outline" className="w-full h-24 flex-col gap-2">
                    <FileText className="h-6 w-6" />
                    <span>Credit Notes</span>
                  </Button>
                </Link>
              ) : (
                <Link to="/reports">
                  <Button variant="outline" className="w-full h-24 flex-col gap-2">
                    <BarChart3 className="h-6 w-6" />
                    <span>Reports</span>
                  </Button>
                </Link>
              )}
            </div>

            <div className="p-4 bg-muted rounded-lg border">
               <h4 className="text-sm font-medium mb-2">Total Inventory Value</h4>
               <p className="text-3xl font-bold">{formatCurrency(dashboardData?.inventory_value || 0)}</p>
               {!isSales() && (
                 <Link to="/reports/inventory-valuation" className="text-xs text-blue-600 hover:underline mt-2 inline-block">
                   Full valuation report &rarr;
                 </Link>
               )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
