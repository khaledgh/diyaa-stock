import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { reportApi } from '@/lib/api';
import { formatCurrency, formatDateTime } from '@/lib/utils';

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
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">{t('reports.title')}</h1>
        <div className="flex gap-2">
          <Button
            variant={reportType === 'sales' ? 'default' : 'outline'}
            onClick={() => setReportType('sales')}
          >
            {t('reports.salesReport')}
          </Button>
          <Button
            variant={reportType === 'receivables' ? 'default' : 'outline'}
            onClick={() => setReportType('receivables')}
          >
            {t('reports.receivables')}
          </Button>
          <Button
            variant={reportType === 'performance' ? 'default' : 'outline'}
            onClick={() => setReportType('performance')}
          >
            {t('reports.productPerformance')}
          </Button>
        </div>
      </div>

      {reportType === 'sales' && salesReport && (
        <>
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">{t('reports.totalSales')}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{formatCurrency(salesReport.summary.total_sales)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">{t('reports.totalPaid')}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(salesReport.summary.total_paid)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">{t('reports.totalUnpaid')}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-red-600">{formatCurrency(salesReport.summary.total_unpaid)}</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardContent className="pt-6">
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
                  {salesReport.sales?.map((sale: any) => (
                    <TableRow key={sale.id}>
                      <TableCell className="font-medium">{sale.invoice_number}</TableCell>
                      <TableCell>{formatDateTime(sale.created_at)}</TableCell>
                      <TableCell>{sale.customer_name || '-'}</TableCell>
                      <TableCell>{sale.van_name || '-'}</TableCell>
                      <TableCell>{formatCurrency(sale.total_amount)}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          sale.payment_status === 'paid' ? 'bg-green-100 text-green-800' :
                          sale.payment_status === 'partial' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {sale.payment_status}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}

      {reportType === 'receivables' && receivables && (
        <Card>
          <CardHeader>
            <CardTitle>
              Total Receivable: {formatCurrency(receivables.summary.total_receivable)}
            </CardTitle>
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
                {receivables.receivables?.map((item: any) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.invoice_number}</TableCell>
                    <TableCell>{formatDateTime(item.created_at)}</TableCell>
                    <TableCell>{item.customer_name || '-'}</TableCell>
                    <TableCell>{formatCurrency(item.total_amount)}</TableCell>
                    <TableCell>{formatCurrency(item.paid_amount)}</TableCell>
                    <TableCell className="font-bold text-red-600">{formatCurrency(item.balance)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {reportType === 'performance' && performance && (
        <Card>
          <CardContent className="pt-6">
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
                {performance?.map((item: any) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.name_en}</TableCell>
                    <TableCell>{item.category_name || '-'}</TableCell>
                    <TableCell>{item.total_sold || 0}</TableCell>
                    <TableCell>{formatCurrency(item.total_revenue || 0)}</TableCell>
                    <TableCell>{item.invoice_count || 0}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
