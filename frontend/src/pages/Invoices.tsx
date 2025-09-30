import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { FileText, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { invoiceApi } from '@/lib/api';
import { formatCurrency, formatDateTime } from '@/lib/utils';

export default function Invoices() {
  const { t } = useTranslation();
  const [invoiceType, setInvoiceType] = useState<'purchase' | 'sales'>('sales');

  const { data: invoices, isLoading } = useQuery({
    queryKey: ['invoices', invoiceType],
    queryFn: async () => {
      const response = await invoiceApi.getAll({ invoice_type: invoiceType });
      return response.data.data;
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">{t('invoices.title')}</h1>
        <div className="flex gap-2">
          <Button
            variant={invoiceType === 'purchase' ? 'default' : 'outline'}
            onClick={() => setInvoiceType('purchase')}
          >
            {t('invoices.purchase')}
          </Button>
          <Button
            variant={invoiceType === 'sales' ? 'default' : 'outline'}
            onClick={() => setInvoiceType('sales')}
          >
            {t('invoices.sales')}
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="text-center py-8">{t('common.loading')}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('invoices.invoiceNumber')}</TableHead>
                  <TableHead>{t('common.date')}</TableHead>
                  <TableHead>{t('invoices.customer')}</TableHead>
                  {invoiceType === 'sales' && <TableHead>{t('invoices.van')}</TableHead>}
                  <TableHead>{t('common.total')}</TableHead>
                  <TableHead>{t('invoices.paymentStatus')}</TableHead>
                  <TableHead>{t('common.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices?.map((invoice: any) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        {invoice.invoice_number}
                      </div>
                    </TableCell>
                    <TableCell>{formatDateTime(invoice.created_at)}</TableCell>
                    <TableCell>{invoice.customer_name || '-'}</TableCell>
                    {invoiceType === 'sales' && <TableCell>{invoice.van_name || '-'}</TableCell>}
                    <TableCell>{formatCurrency(invoice.total_amount)}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        invoice.payment_status === 'paid' ? 'bg-green-100 text-green-800' :
                        invoice.payment_status === 'partial' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {t(`invoices.${invoice.payment_status}`)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
