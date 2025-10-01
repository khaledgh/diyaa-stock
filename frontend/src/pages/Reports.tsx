import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { reportApi } from '@/lib/api';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { BarChart3, DollarSign, TrendingUp, Users, Package, FileText } from 'lucide-react';

export default function Reports() {
  const { t } = useTranslation();
  const [reportType, setReportType] = useState<'sales' | 'receivables' | 'performance'>('sales');

  const { data: salesReport } = useQuery({
    queryKey: ['sales-report'],
    queryFn: async () => {
      const response = await reportApi.sales();
      return response.data.data;
    },
    enabled: reportType === 'sales',
  });

  const { data: receivables } = useQuery({
    queryKey: ['receivables'],
    queryFn: async () => {
      const response = await reportApi.receivables();
      return response.data.data;
    },
    enabled: reportType === 'receivables',
  });

  const { data: performance } = useQuery({
    queryKey: ['product-performance'],
    queryFn: async () => {
      const response = await reportApi.productPerformance();
      return response.data.data;
    },
    enabled: reportType === 'performance',
  });

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <BarChart3 className="h-8 w-8 text-blue-600" />
            {t('reports.title')}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Analyze your business performance</p>
        </div>
        <div className="flex gap-3">
          <Button
            variant={reportType === 'sales' ? 'default' : 'outline'}
            onClick={() => setReportType('sales')}
            size="lg"
            className="shadow-md"
          >
            <DollarSign className="mr-2 h-5 w-5" />
            {t('reports.salesReport')}
          </Button>
          <Button
            variant={reportType === 'receivables' ? 'default' : 'outline'}
            onClick={() => setReportType('receivables')}
            size="lg"
            className="shadow-md"
          >
            <TrendingUp className="mr-2 h-5 w-5" />
            {t('reports.receivables')}
          </Button>
          <Button
            variant={reportType === 'performance' ? 'default' : 'outline'}
            onClick={() => setReportType('performance')}
            size="lg"
            className="shadow-md"
          >
            <Package className="mr-2 h-5 w-5" />
            {t('reports.productPerformance')}
          </Button>
        </div>
      </div>

      {reportType === 'sales' && salesReport && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('reports.totalSales')}</p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{formatCurrency(salesReport.summary.total_sales)}</p>
                    <p className="text-sm text-gray-500 mt-1">{salesReport.summary.count} invoices</p>
                  </div>
                  <div className="p-4 bg-blue-100 dark:bg-blue-900 rounded-2xl">
                    <FileText className="h-7 w-7 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('reports.totalPaid')}</p>
                    <p className="text-3xl font-bold text-green-600 mt-2">{formatCurrency(salesReport.summary.total_paid)}</p>
                    <p className="text-sm text-gray-500 mt-1">Collected</p>
                  </div>
                  <div className="p-4 bg-green-100 dark:bg-green-900 rounded-2xl">
                    <DollarSign className="h-7 w-7 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('reports.totalUnpaid')}</p>
                    <p className="text-3xl font-bold text-red-600 mt-2">{formatCurrency(salesReport.summary.total_unpaid)}</p>
                    <p className="text-sm text-gray-500 mt-1">Outstanding</p>
                  </div>
                  <div className="p-4 bg-red-100 dark:bg-red-900 rounded-2xl">
                    <TrendingUp className="h-7 w-7 text-red-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl">Sales Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Van</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {salesReport.sales?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                        No sales found for this period
                      </TableCell>
                    </TableRow>
                  ) : (
                    salesReport.sales?.map((sale: any) => (
                      <TableRow key={sale.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                        <TableCell className="font-medium">{sale.invoice_number}</TableCell>
                        <TableCell>{formatDateTime(sale.created_at)}</TableCell>
                        <TableCell>{sale.customer_name || 'Walk-in'}</TableCell>
                        <TableCell>{sale.van_name || '-'}</TableCell>
                        <TableCell className="font-semibold">{formatCurrency(sale.total_amount)}</TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                            sale.payment_status === 'paid' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                            sale.payment_status === 'partial' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                            'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                          }`}>
                            {sale.payment_status}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}

      {reportType === 'receivables' && receivables && (
        <>
          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Receivable</p>
                  <p className="text-4xl font-bold text-red-600 mt-2">{formatCurrency(receivables.summary.total_receivable)}</p>
                  <p className="text-sm text-gray-500 mt-1">{receivables.summary.count} outstanding invoices</p>
                </div>
                <div className="p-4 bg-red-100 dark:bg-red-900 rounded-2xl">
                  <Users className="h-8 w-8 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl">Outstanding Invoices</CardTitle>
            </CardHeader>
            <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Paid</TableHead>
                  <TableHead>Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {receivables.receivables?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                      No outstanding receivables
                    </TableCell>
                  </TableRow>
                ) : (
                  receivables.receivables?.map((item: any) => (
                    <TableRow key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                      <TableCell className="font-medium">{item.invoice_number}</TableCell>
                      <TableCell>{formatDateTime(item.created_at)}</TableCell>
                      <TableCell>{item.customer_name || 'Walk-in'}</TableCell>
                      <TableCell className="font-semibold">{formatCurrency(item.total_amount)}</TableCell>
                      <TableCell className="text-green-600">{formatCurrency(item.paid_amount)}</TableCell>
                      <TableCell className="font-bold text-red-600">{formatCurrency(item.balance)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        </>
      )}

      {reportType === 'performance' && performance && (
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl">Top Selling Products</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Total Sold</TableHead>
                  <TableHead>Revenue</TableHead>
                  <TableHead>Invoices</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {performance?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                      No sales data available
                    </TableCell>
                  </TableRow>
                ) : (
                  performance?.map((item: any, index: number) => (
                    <TableRow key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 font-bold text-sm">
                            {index + 1}
                          </span>
                          <span className="font-medium">{item.name_en}</span>
                        </div>
                      </TableCell>
                      <TableCell>{item.category_name || '-'}</TableCell>
                      <TableCell className="font-semibold">{item.total_sold || 0}</TableCell>
                      <TableCell className="font-bold text-green-600">{formatCurrency(item.total_revenue || 0)}</TableCell>
                      <TableCell>{item.invoice_count || 0}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
