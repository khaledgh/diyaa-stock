import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { CreditCard, Receipt, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { paymentApi } from '@/lib/api';
import { formatCurrency, formatDateTime } from '@/lib/utils';

export default function Payments() {
  const { t } = useTranslation();

  const { data: payments, isLoading } = useQuery({
    queryKey: ['payments'],
    queryFn: async () => {
      const response = await paymentApi.getAll();
      return response.data.data || [];
    },
  });

  const totalPayments = payments?.reduce((sum: number, payment: any) => sum + Number(payment.amount), 0) || 0;

  const getInvoiceLink = (payment: any) => {
    if (payment.invoice_type === 'sales') {
      return `/invoices/sales/${payment.invoice_id}`;
    }
    if (payment.invoice_type === 'purchase') {
      return `/invoices/purchase/${payment.invoice_id}`;
    }
    return '#';
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">{t('payments.title') || 'Payments'}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t('payments.subtitle') || 'Track all payment transactions'}
          </p>
        </div>
        <div className="bg-primary/10 px-4 py-2 rounded-lg">
          <p className="text-sm text-muted-foreground">Total Payments</p>
          <p className="text-2xl font-bold text-primary">{formatCurrency(totalPayments)}</p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            <h2 className="text-lg font-semibold">{t('payments.recentPayments') || 'Recent Payments'}</h2>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">{t('common.loading') || 'Loading...'}</div>
          ) : (
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('common.date') || 'Date'}</TableHead>
                    <TableHead className="hidden md:table-cell">Invoice Type</TableHead>
                    <TableHead className="hidden md:table-cell">Invoice #</TableHead>
                    <TableHead className="text-right">{t('common.amount') || 'Amount'}</TableHead>
                    <TableHead className="hidden sm:table-cell">{t('payments.paymentMethod') || 'Method'}</TableHead>
                    <TableHead className="hidden lg:table-cell">{t('payments.referenceNumber') || 'Reference'}</TableHead>
                    <TableHead className="hidden xl:table-cell">Created By</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No payments found
                      </TableCell>
                    </TableRow>
                  ) : (
                    payments?.map((payment: any) => (
                      <TableRow
                        key={payment.id}
                        className={payment.invoice_number === 'Invoice Deleted' ? 'text-red-500 line-through opacity-70 hover:bg-red-50/50' : ''}
                      >
                        <TableCell>{formatDateTime(payment.created_at)}</TableCell>
                        <TableCell className="hidden md:table-cell">
                          {payment.invoice_type ? (
                            <Badge variant={payment.invoice_type === 'sales' ? 'default' : 'outline'} className="capitalize">
                              {payment.invoice_type}
                            </Badge>
                          ) : (
                            <Badge variant="destructive" className="bg-red-100 text-red-600 border-red-200">Deleted</Badge>
                          )}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {payment.invoice_number === 'Invoice Deleted' ? (
                            <span className="font-medium italic">Invoice Deleted</span>
                          ) : (
                            <Link
                              to={getInvoiceLink(payment)}
                              className="flex items-center gap-1 text-primary hover:underline font-mono text-sm"
                            >
                              {payment.invoice_number || `#${payment.invoice_id}`}
                              <ExternalLink className="h-3 w-3" />
                            </Link>
                          )}
                        </TableCell>
                        <TableCell className={`text-right font-bold ${payment.invoice_number === 'Invoice Deleted' ? '' : (payment.amount < 0 ? 'text-red-600' : 'text-green-600')}`}>
                          {formatCurrency(payment.amount)}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <div className="flex items-center gap-2">
                            <CreditCard className="h-4 w-4" />
                            <span className="capitalize">{payment.payment_method?.replace('_', ' ')}</span>
                          </div>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell font-mono text-sm">
                          {payment.reference_number || '-'}
                        </TableCell>
                        <TableCell className="hidden xl:table-cell">
                          {payment.created_by_name || '-'}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
