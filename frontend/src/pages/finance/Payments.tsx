import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { CreditCard } from 'lucide-react';
import { paymentApi } from '@/lib/api';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { ColumnDef, DataTable, FilterSelect } from '@/components/data-table/DataTable';
import { Page, PageHeader, StatStrip, StatusBadge } from '@/components/layout/Page';

const isDeleted = (p: any) => p.invoice_number === 'Invoice Deleted';
const invoiceLink = (p: any) =>
  p.invoice_type === 'sales' ? `/invoices/sales/${p.invoice_id}` : p.invoice_type === 'purchase' ? `/invoices/purchase/${p.invoice_id}` : null;

export default function Payments() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [type, setType] = useState('');
  const [method, setMethod] = useState('');

  const { data: payments = [], isLoading } = useQuery({
    queryKey: ['payments'],
    queryFn: async () => {
      const response = await paymentApi.getAll();
      return response.data.data || [];
    },
  });

  const methods = useMemo(() => Array.from(new Set(payments.map((p: any) => p.payment_method).filter(Boolean))) as string[], [payments]);
  const filtered = useMemo(
    () => payments.filter((p: any) => (!type || (p.invoice_type || 'deleted') === type) && (!method || p.payment_method === method)),
    [payments, type, method]
  );

  const live = payments.filter((p: any) => !isDeleted(p));
  const received = live.filter((p: any) => p.invoice_type === 'sales').reduce((s: number, p: any) => s + Math.abs(Number(p.amount)), 0);
  const paid = live.filter((p: any) => p.invoice_type === 'purchase').reduce((s: number, p: any) => s + Math.abs(Number(p.amount)), 0);

  const columns: ColumnDef<any>[] = [
    { id: 'date', header: t('common.date') || 'Date', value: (p) => p.created_at, cell: (p) => <span className="whitespace-nowrap text-muted-foreground">{formatDateTime(p.created_at)}</span> },
    {
      id: 'type',
      header: 'Direction',
      value: (p) => p.invoice_type || 'deleted',
      cell: (p) =>
        !p.invoice_type ? (
          <StatusBadge tone="gray">Deleted</StatusBadge>
        ) : p.invoice_type === 'sales' ? (
          <StatusBadge tone="green">Received</StatusBadge>
        ) : (
          <StatusBadge tone="blue">Paid out</StatusBadge>
        ),
    },
    {
      id: 'invoice',
      header: 'Invoice',
      alwaysVisible: true,
      value: (p) => p.invoice_number || `#${p.invoice_id}`,
      cell: (p) =>
        isDeleted(p) ? (
          <span className="italic text-muted-foreground line-through">Invoice deleted</span>
        ) : (
          <span className="font-medium text-primary">{p.invoice_number || `#${p.invoice_id}`}</span>
        ),
    },
    {
      id: 'method',
      header: t('payments.paymentMethod') || 'Method',
      value: (p) => p.payment_method,
      cell: (p) => (
        <span className="inline-flex items-center gap-1.5 capitalize text-muted-foreground">
          <CreditCard className="h-3.5 w-3.5" aria-hidden />
          {p.payment_method?.replace('_', ' ') || '—'}
        </span>
      ),
    },
    { id: 'reference', header: t('payments.referenceNumber') || 'Reference', defaultHidden: true, value: (p) => p.reference_number, cell: (p) => <span className="font-mono text-xs">{p.reference_number || '—'}</span> },
    { id: 'created_by', header: 'Recorded by', value: (p) => p.created_by_name, cell: (p) => <span className="text-muted-foreground">{p.created_by_name || '—'}</span> },
    {
      id: 'amount',
      header: t('common.amount') || 'Amount',
      align: 'end',
      value: (p) => Number(p.amount),
      cell: (p) => (
        <span className={`tabular-nums font-semibold ${isDeleted(p) ? 'text-muted-foreground line-through' : p.invoice_type === 'sales' ? 'text-emerald-600 dark:text-emerald-400' : ''}`}>
          {formatCurrency(Math.abs(Number(p.amount)))}
        </span>
      ),
    },
  ];

  return (
    <Page>
      <PageHeader icon={CreditCard} title={t('payments.title') || 'Payments'} description={t('payments.subtitle') || 'Every payment received from customers and paid to vendors'} />

      <StatStrip
        items={[
          { label: 'Received from customers', value: formatCurrency(received) },
          { label: 'Paid to vendors', value: formatCurrency(paid) },
          { label: 'Net cash flow', value: formatCurrency(received - paid) },
          { label: 'Payments', value: live.length.toLocaleString() },
        ]}
      />

      <DataTable
        data={filtered}
        columns={columns}
        rowKey={(p) => p.id}
        loading={isLoading}
        defaultSort={{ id: 'date', dir: 'desc' }}
        searchPlaceholder="Search invoice, method, reference…"
        onRowClick={(p) => {
          const link = !isDeleted(p) && invoiceLink(p);
          if (link) navigate(link);
        }}
        storageKey="payments"
        exportFileName="payments"
        emptyTitle="No payments found"
        activeFilterCount={(type ? 1 : 0) + (method ? 1 : 0)}
        onResetFilters={() => {
          setType('');
          setMethod('');
        }}
        filters={
          <>
            <FilterSelect
              label="Direction"
              value={type}
              onChange={setType}
              options={[
                { value: 'sales', label: 'Received' },
                { value: 'purchase', label: 'Paid out' },
                { value: 'deleted', label: 'Deleted invoice' },
              ]}
            />
            <FilterSelect label="Method" value={method} onChange={setMethod} options={methods.map((m) => ({ value: m, label: m.replace('_', ' ') }))} />
          </>
        }
        footer={(rows) => ({
          date: <span className="text-xs font-medium text-muted-foreground">{rows.length} payments</span>,
          amount: formatCurrency(rows.filter((p) => !isDeleted(p)).reduce((s, p) => s + Math.abs(Number(p.amount)), 0)),
        })}
      />
    </Page>
  );
}
