import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { CreditCard } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { paymentApi } from '@/lib/api';
import { formatCurrency, formatDateTime } from '@/lib/utils';

export default function Payments() {
  const { t } = useTranslation();

  const { data: payments, isLoading } = useQuery({
    queryKey: ['payments'],
    queryFn: async () => {
      const response = await paymentApi.getAll();
      return response.data.data;
    },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">{t('payments.title')}</h1>

      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="text-center py-8">{t('common.loading')}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('common.date')}</TableHead>
                  <TableHead>Invoice ID</TableHead>
                  <TableHead>{t('common.amount')}</TableHead>
                  <TableHead>{t('payments.paymentMethod')}</TableHead>
                  <TableHead>{t('payments.referenceNumber')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments?.map((payment: any) => (
                  <TableRow key={payment.id}>
                    <TableCell>{formatDateTime(payment.created_at)}</TableCell>
                    <TableCell>#{payment.invoice_id}</TableCell>
                    <TableCell className="font-medium">{formatCurrency(payment.amount)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4" />
                        {t(`payments.${payment.payment_method}`)}
                      </div>
                    </TableCell>
                    <TableCell>{payment.reference_number || '-'}</TableCell>
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
