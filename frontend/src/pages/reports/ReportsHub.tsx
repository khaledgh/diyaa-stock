import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart3,
  Package,
  TrendingUp,
  TrendingDown,
  Clock,
  DollarSign
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { reportApi } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';

export default function ReportsHub() {
  // Fetch summary data for quick stats
  const { data: receivablesData } = useQuery({
    queryKey: ['receivables-aging-summary'],
    queryFn: async () => {
      const response = await reportApi.receivablesAging();
      return response.data.data || response.data;
    },
  });

  const { data: payablesData } = useQuery({
    queryKey: ['payables-aging-summary'],
    queryFn: async () => {
      const response = await reportApi.payablesAging();
      return response.data.data || response.data;
    },
  });

  const reportCategories = [
    {
      title: 'Receivables',
      icon: TrendingUp,
      color: 'text-green-600',
      bgColor: 'bg-green-50 dark:bg-green-900/20',
      description: 'Track money owed by customers',
      reports: [
        {
          name: 'Receivables Aging Summary',
          href: '/reports/receivables-aging',
          description: 'Outstanding invoices by age',
          stat: receivablesData?.summary?.grand_total
            ? formatCurrency(receivablesData.summary.grand_total)
            : null
        },
        {
          name: 'Customer Statement',
          href: '/customers',
          description: 'Detailed account statements'
        },
        {
          name: 'Customer Balances',
          href: '/reports/sales-by-customer',
          description: 'All customer balances'
        },
      ]
    },
    {
      title: 'Payables',
      icon: TrendingDown,
      color: 'text-red-600',
      bgColor: 'bg-red-50 dark:bg-red-900/20',
      description: 'Track money owed to vendors',
      reports: [
        {
          name: 'Payables Aging Summary',
          href: '/reports/payables-aging',
          description: 'Outstanding bills by age',
          stat: payablesData?.summary?.grand_total
            ? formatCurrency(payablesData.summary.grand_total)
            : null
        },
        {
          name: 'Vendor Balances',
          href: '/vendors',
          description: 'All vendor balances'
        },
      ]
    },
    {
      title: 'Sales',
      icon: DollarSign,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
      description: 'Analyze sales performance',
      reports: [
        {
          name: 'Sales by Customer',
          href: '/reports/sales-by-customer',
          description: 'Customer sales breakdown'
        },
        {
          name: 'Sales by Item',
          href: '/reports/sales-by-item',
          description: 'Product sales breakdown'
        },
        {
          name: 'Sales by Location',
          href: '/reports/location-sales',
          description: 'Location performance'
        },
        {
          name: 'Profit & Loss',
          href: '/reports/profit-loss',
          description: 'Financial performance'
        },
      ]
    },
    {
      title: 'Inventory',
      icon: Package,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50 dark:bg-purple-900/20',
      description: 'Monitor stock levels',
      reports: [
        {
          name: 'Inventory Valuation',
          href: '/reports/inventory-valuation',
          description: 'Total stock value'
        },
        {
          name: 'Stock Summary',
          href: '/inventory',
          description: 'All products by location'
        },
        {
          name: 'Low Stock Alert',
          href: '/low-stock',
          description: 'Products below reorder point'
        },
      ]
    },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
          <BarChart3 className="h-6 w-6 text-primary" />
          Reports
        </h1>
        <p className="text-muted-foreground mt-1">
          View and analyze your business data
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Receivables</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(receivablesData?.summary?.grand_total || 0)}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-200" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {receivablesData?.summary?.total_customers || 0} customers with balance
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Payables</p>
                <p className="text-2xl font-bold text-red-600">
                  {formatCurrency(payablesData?.summary?.grand_total || 0)}
                </p>
              </div>
              <TrendingDown className="h-8 w-8 text-red-200" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {payablesData?.summary?.total_vendors || 0} vendors with balance
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Overdue Receivables</p>
                <p className="text-2xl font-bold text-orange-600">
                  {formatCurrency(receivablesData?.summary?.days_over_45 || 0)}
                </p>
              </div>
              <Clock className="h-8 w-8 text-orange-200" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Outstanding over 45 days
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Net Position</p>
                <p className="text-2xl font-bold text-blue-600">
                  {formatCurrency(
                    (receivablesData?.summary?.grand_total || 0) -
                    (payablesData?.summary?.grand_total || 0)
                  )}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-blue-200" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Receivables minus Payables
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Report Categories */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {reportCategories.map((category) => (
          <Card key={category.title} className="overflow-hidden">
            <CardHeader className={`${category.bgColor} py-4`}>
              <CardTitle className="flex items-center gap-3 text-lg">
                <category.icon className={`h-5 w-5 ${category.color}`} />
                <span>{category.title}</span>
              </CardTitle>
              <p className="text-sm text-muted-foreground">{category.description}</p>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {category.reports.map((report) => (
                  <Link
                    key={report.name}
                    to={report.href}
                    className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                  >
                    <div>
                      <p className="font-medium text-foreground">{report.name}</p>
                      <p className="text-sm text-muted-foreground">{report.description}</p>
                    </div>
                    {report.stat && (
                      <span className={`text-sm font-semibold ${category.color}`}>
                        {report.stat}
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
