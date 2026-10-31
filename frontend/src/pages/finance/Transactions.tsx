import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ArrowLeftRight } from 'lucide-react';
import { invoiceApi } from '@/lib/api';
import { formatCurrency, formatDateTime, toLocalISODate } from '@/lib/utils';
import { ColumnDef, DataTable, DateRangeFilter, FilterSelect } from '@/components/data-table/DataTable';
import { Page, PageHeader, PaymentBadge, StatStrip, StatusBadge } from '@/components/layout/Page';

interface Txn {
  key: string;
  id: number;
  type: 'sales' | 'purchase';
  invoice_number: string;
  date: string;
  party: string;
  location: string;
  amount: number;
  paid: number;
  payment_status: string;
}

// Large enough for any realistic date range; the range filter keeps it bounded.
const FETCH_LIMIT = 2000;

export default function Transactions() {
  const navigate = useNavigate();
  const now = new Date();
  const [range, setRange] = useState({ from: toLocalISODate(new Date(now.getFullYear(), now.getMonth(), 1)), to: toLocalISODate(now) });
  const [type, setType] = useState('');
  const [status, setStatus] = useState('');

  const fetchInvoices = async (invoiceType: 'sales' | 'purchase') => {
    const response = await invoiceApi.getAll({
      invoice_type: invoiceType,
      limit: FETCH_LIMIT,
      from_date: range.from && range.to ? range.from : undefined,
      to_date: range.from && range.to ? range.to : undefined,
    });
    // Sales responses nest under "invoices", purchases under "data".
    const payload = response.data.invoices || response.data.data;
    return (payload?.data || []) as any[];
  };

  const { data: sales = [], isLoading: loadingSales } = useQuery({ queryKey: ['transactions', 'sales', range], queryFn: () => fetchInvoices('sales') });
  const { data: purchases = [], isLoading: loadingPurchases } = useQuery({ queryKey: ['transactions', 'purchase', range], queryFn: () => fetchInvoices('purchase') });

  const all: Txn[] = useMemo(
    () => [
      ...sales.map((inv) => ({
        key: `s-${inv.id}`,
        id: inv.id,
        type: 'sales' as const,
        invoice_number: inv.invoice_number,
        date: inv.created_at,
        party: inv.customer?.name || 'Walk-in customer',
        location: inv.location?.name || '',
        amount: Number(inv.total_amount),
        paid: Number(inv.paid_amount),
        payment_status: inv.payment_status,
      })),
      ...purchases.map((inv) => ({
        key: `p-${inv.id}`,
        id: inv.id,
        type: 'purchase' as const,
        invoice_number: inv.invoice_number,
        date: inv.invoice_date || inv.created_at,
        party: inv.vendor?.company_name || inv.vendor?.name || 'Vendor',
        location: inv.location?.name || '',
        amount: Number(inv.total_amount),
        paid: Number(inv.paid_amount),
        payment_status: inv.payment_status,
      })),
    ],
    [sales, purchases]
  );

  const filtered = all.filter((t) => (!type || t.type === type) && (!status || t.payment_status === status));
  const totalSales = all.filter((t) => t.type === 'sales').reduce((s, t) => s + t.amount, 0);
  const totalPurchases = all.filter((t) => t.type === 'purchase').reduce((s, t) => s + t.amount, 0);

  const columns: ColumnDef<Txn>[] = [
    { id: 'date', header: 'Date', value: (t) => t.date, cell: (t) => <span className="whitespace-nowrap text-muted-foreground">{formatDateTime(t.date)}</span> },
    {
      id: 'type',
      header: 'Type',
      value: (t) => t.type,
      cell: (t) => (t.type === 'sales' ? <StatusBadge tone="green">Sale</StatusBadge> : <StatusBadge tone="blue">Purchase</StatusBadge>),
    },
    { id: 'invoice_number', header: 'Invoice', alwaysVisible: true, value: (t) => t.invoice_number, cell: (t) => <span className="font-medium text-primary">{t.invoice_number}</span> },
    { id: 'party', header: 'Customer / Vendor', value: (t) => t.party, cell: (t) => <span className="block max-w-[220px] truncate" dir="auto">{t.party}</span> },
    { id: 'location', header: 'Location', value: (t) => t.location, cell: (t) => <span className="text-muted-foreground">{t.location || '—'}</span> },
    { id: 'amount', header: 'Amount', align: 'end', value: (t) => t.amount, cell: (t) => <span className="tabular-nums font-semibold">{formatCurrency(t.amount)}</span> },
    { id: 'paid', header: 'Paid', align: 'end', value: (t) => t.paid, cell: (t) => <span className="tabular-nums text-muted-foreground">{formatCurrency(t.paid)}</span> },
    { id: 'status', header: 'Payment', value: (t) => t.payment_status, cell: (t) => <PaymentBadge status={t.payment_status} /> },
  ];

  return (
    <Page>
      <PageHeader icon={ArrowLeftRight} title="Transactions" description="Sales and purchase invoices in one timeline" />

      <StatStrip
        items={[
          { label: 'Sales', value: formatCurrency(totalSales), hint: `${sales.length} invoices` },
          { label: 'Purchases', value: formatCurrency(totalPurchases), hint: `${purchases.length} invoices` },
          { label: 'Sales minus purchases', value: formatCurrency(totalSales - totalPurchases), hint: 'Not profit — see Profit & Loss' },
        ]}
      />

      <DataTable
        data={filtered}
        columns={columns}
        rowKey={(t) => t.key}
        loading={loadingSales || loadingPurchases}
        defaultSort={{ id: 'date', dir: 'desc' }}
        searchPlaceholder="Search invoice, customer, vendor…"
        onRowClick={(t) => navigate(`/invoices/${t.type}/${t.id}`)}
        storageKey="transactions"
        exportFileName={`transactions-${range.from}-${range.to}`}
        emptyTitle="No transactions in this period"
        activeFilterCount={(type ? 1 : 0) + (status ? 1 : 0)}
        onResetFilters={() => {
          setType('');
          setStatus('');
        }}
        filters={
          <>
            <DateRangeFilter from={range.from} to={range.to} onChange={setRange} clearable={false} />
            <FilterSelect label="Type" value={type} onChange={setType} options={[{ value: 'sales', label: 'Sales' }, { value: 'purchase', label: 'Purchases' }]} />
            <FilterSelect
              label="Payment"
              value={status}
              onChange={setStatus}
              options={[
                { value: 'paid', label: 'Paid' },
                { value: 'partial', label: 'Partial' },
                { value: 'unpaid', label: 'Unpaid' },
              ]}
            />
          </>
        }
      />
    </Page>
  );
}
