import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { AlertCircle, CreditCard } from 'lucide-react';
import { reportApi } from '@/lib/api';
import { cn, formatCurrency, formatDate, toLocalISODate } from '@/lib/utils';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ColumnDef, DataTable, DateRangeFilter, FilterSelect } from '@/components/data-table/DataTable';
import { BadgeTone, Page, PageHeader, StatStrip, StatusBadge } from '@/components/layout/Page';

type GroupBy = 'day' | 'month' | 'year';

const TYPE_LABEL: Record<string, string> = { Received: 'Received', Payed: 'Paid to vendor', Expense: 'Expense' };
const TYPE_TONE: Record<string, BadgeTone> = { Received: 'green', Payed: 'blue', Expense: 'amber' };

const periodLabel = (date: string, groupBy: GroupBy) => {
  const d = (date || '').slice(0, 10);
  if (groupBy === 'year') return d.slice(0, 4);
  if (groupBy === 'month') {
    const [y, m] = d.split('-').map(Number);
    return y && m ? new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : d;
  }
  return formatDate(d);
};

export default function PaymentsReport() {
  const navigate = useNavigate();
  const today = new Date();
  const [range, setRange] = useState({ from: toLocalISODate(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 29)), to: toLocalISODate(today) });
  const [groupBy, setGroupBy] = useState<GroupBy>('day');
  const [typeFilter, setTypeFilter] = useState('');
  const [selectedRow, setSelectedRow] = useState<any>(null);

  const { data: payments = [], isLoading, error } = useQuery({
    queryKey: ['payments-report', range, groupBy, typeFilter],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const params: Record<string, string> = { from_date: range.from, to_date: range.to, group_by: groupBy };
      if (typeFilter) params.payment_type = typeFilter;
      const response = await reportApi.payments(params);
      return (response.data.data || []) as any[];
    },
    enabled: !!(range.from && range.to),
  });

  const { data: details = [], isLoading: loadingDetails } = useQuery({
    queryKey: ['payments-report-details', selectedRow, groupBy],
    queryFn: async () => {
      const response = await reportApi.paymentsDetails({
        date: selectedRow.date,
        entity_name: selectedRow.entity_name,
        payment_type: selectedRow.payment_type,
        group_by: groupBy,
      });
      return (response.data.data || []) as any[];
    },
    enabled: !!selectedRow,
  });

  const totals = useMemo(() => {
    const sum = (type: string) => payments.filter((p) => p.payment_type === type).reduce((s, p) => s + Math.abs(Number(p.total_amount) || 0), 0);
    const received = sum('Received');
    const paid = sum('Payed');
    const expenses = sum('Expense');
    return { received, paid, expenses, net: received - paid - expenses, count: payments.reduce((s, p) => s + (Number(p.payment_count) || 0), 0) };
  }, [payments]);

  const columns: ColumnDef<any>[] = [
    {
      id: 'date',
      header: groupBy === 'day' ? 'Date' : groupBy === 'month' ? 'Month' : 'Year',
      alwaysVisible: true,
      value: (p) => (p.date || '').slice(0, 10),
      cell: (p) => <span className="whitespace-nowrap font-medium">{periodLabel(p.date, groupBy)}</span>,
    },
    {
      id: 'type',
      header: 'Type',
      value: (p) => TYPE_LABEL[p.payment_type] || p.payment_type,
      cell: (p) => <StatusBadge tone={TYPE_TONE[p.payment_type] || 'gray'}>{TYPE_LABEL[p.payment_type] || p.payment_type}</StatusBadge>,
    },
    { id: 'entity', header: 'Customer / Vendor / Category', value: (p) => p.entity_name, cell: (p) => <span className="block max-w-[260px] truncate" dir="auto">{p.entity_name}</span> },
    { id: 'count', header: 'Payments', align: 'end', value: (p) => Number(p.payment_count) || 0, cell: (p) => <span className="tabular-nums text-muted-foreground">{p.payment_count}</span> },
    {
      id: 'amount',
      header: 'Amount',
      align: 'end',
      value: (p) => (p.payment_type === 'Received' ? 1 : -1) * Math.abs(Number(p.total_amount) || 0),
      cell: (p) => (
        <span className={cn('tabular-nums font-semibold', p.payment_type === 'Received' ? 'text-emerald-600 dark:text-emerald-400' : '')}>
          {p.payment_type === 'Received' ? '' : '−'}
          {formatCurrency(Math.abs(Number(p.total_amount) || 0))}
        </span>
      ),
    },
  ];

  const detailColumns: ColumnDef<any>[] = [
    {
      id: 'time',
      header: groupBy === 'day' ? 'Time' : 'Date',
      value: (d) => d.created_at,
      cell: (d) => (
        <span className="whitespace-nowrap text-muted-foreground tabular-nums">
          {groupBy === 'day' ? new Date(d.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : formatDate(d.created_at)}
        </span>
      ),
    },
    {
      id: 'invoice',
      header: 'Invoice / Expense',
      value: (d) => d.invoice_number,
      cell: (d) => (d.invoice_number && d.invoice_number !== '-' ? <span className="font-medium text-primary">{d.invoice_number}</span> : <span className="text-muted-foreground">Unallocated</span>),
    },
    { id: 'method', header: 'Method', value: (d) => d.payment_method, cell: (d) => <span className="capitalize">{(d.payment_method || '—').replace('_', ' ')}</span> },
    { id: 'reference', header: 'Reference', value: (d) => d.reference_number, cell: (d) => <span className="font-mono text-xs">{d.reference_number || '—'}</span> },
    { id: 'notes', header: 'Notes', defaultHidden: true, value: (d) => d.notes, cell: (d) => <span className="line-clamp-1 text-muted-foreground">{d.notes || '—'}</span> },
    { id: 'creator', header: 'Recorded by', value: (d) => d.creator_name, cell: (d) => <span className="text-muted-foreground">{d.creator_name || '—'}</span> },
    {
      id: 'amount',
      header: 'Amount',
      align: 'end',
      value: (d) => Math.abs(Number(d.amount) || 0),
      cell: (d) => (
        <span className={cn('tabular-nums font-semibold', d.type_label === 'Received' ? 'text-emerald-600 dark:text-emerald-400' : '')}>
          {formatCurrency(Math.abs(Number(d.amount) || 0))}
        </span>
      ),
    },
  ];

  if (error) {
    return (
      <Page>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Failed to load the payments report. Please try again.</AlertDescription>
        </Alert>
      </Page>
    );
  }

  return (
    <Page>
      <PageHeader
        icon={CreditCard}
        backTo="/reports"
        title="Payments Report"
        description="Money received from customers, paid to vendors and spent on expenses"
      />

      <StatStrip
        items={[
          { label: 'Received', value: <span className="text-emerald-600 dark:text-emerald-400">{formatCurrency(totals.received)}</span>, onClick: () => setTypeFilter(typeFilter === 'Received' ? '' : 'Received'), active: typeFilter === 'Received' },
          { label: 'Paid to vendors', value: formatCurrency(totals.paid), onClick: () => setTypeFilter(typeFilter === 'Payed' ? '' : 'Payed'), active: typeFilter === 'Payed' },
          { label: 'Expenses', value: formatCurrency(totals.expenses), onClick: () => setTypeFilter(typeFilter === 'Expense' ? '' : 'Expense'), active: typeFilter === 'Expense' },
          {
            label: 'Net cash flow',
            value: <span className={totals.net < 0 ? 'text-red-600 dark:text-red-400' : ''}>{formatCurrency(totals.net)}</span>,
            hint: `${totals.count} payments`,
          },
        ]}
      />

      <DataTable
        data={payments}
        columns={columns}
        rowKey={(p) => `${p.date}-${p.payment_type}-${p.entity_name}`}
        loading={isLoading}
        defaultSort={{ id: 'date', dir: 'desc' }}
        searchPlaceholder="Search customer, vendor, category…"
        onRowClick={setSelectedRow}
        storageKey="payments-report"
        exportFileName={`payments-report-${range.from}-${range.to}`}
        printTitle="Payments Report"
        emptyTitle="No payments in this period"
        activeFilterCount={typeFilter ? 1 : 0}
        onResetFilters={() => setTypeFilter('')}
        filters={
          <>
            <DateRangeFilter from={range.from} to={range.to} onChange={setRange} clearable={false} />
            <div className="inline-flex h-8 rounded-md border bg-background p-0.5 text-xs" role="group" aria-label="Group by">
              {(['day', 'month', 'year'] as GroupBy[]).map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGroupBy(g)}
                  className={cn('rounded px-2.5 font-medium capitalize transition-colors', groupBy === g ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground')}
                >
                  {g === 'day' ? 'Daily' : g === 'month' ? 'Monthly' : 'Yearly'}
                </button>
              ))}
            </div>
            <FilterSelect
              label="Type"
              value={typeFilter}
              onChange={setTypeFilter}
              options={[
                { value: 'Received', label: 'Received' },
                { value: 'Payed', label: 'Paid to vendor' },
                { value: 'Expense', label: 'Expense' },
              ]}
            />
          </>
        }
        footer={(rows) => ({
          date: <span className="text-xs font-medium text-muted-foreground">{rows.length} rows</span>,
          count: rows.reduce((s, p) => s + (Number(p.payment_count) || 0), 0),
          amount: formatCurrency(rows.reduce((s, p) => s + (p.payment_type === 'Received' ? 1 : -1) * Math.abs(Number(p.total_amount) || 0), 0)),
        })}
      />

      <Dialog open={!!selectedRow} onOpenChange={(open) => !open && setSelectedRow(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Payment details</DialogTitle>
            {selectedRow && (
              <DialogDescription className="flex flex-wrap items-center gap-2">
                <span>{periodLabel(selectedRow.date, groupBy)}</span>
                <span>·</span>
                <span className="font-medium text-foreground" dir="auto">{selectedRow.entity_name}</span>
                <StatusBadge tone={TYPE_TONE[selectedRow.payment_type] || 'gray'}>{TYPE_LABEL[selectedRow.payment_type] || selectedRow.payment_type}</StatusBadge>
              </DialogDescription>
            )}
          </DialogHeader>
          <DataTable
            data={details}
            columns={detailColumns}
            rowKey={(d) => `${d.invoice_type}-${d.id}`}
            loading={loadingDetails}
            defaultSort={{ id: 'time', dir: 'desc' }}
            defaultPageSize={10}
            hideSearch={details.length < 8}
            onRowClick={(d) => {
              if (d.invoice_type === 'expense') navigate('/expenses');
              else if (d.invoice_id) navigate(`/invoices/${d.invoice_type}/${d.invoice_id}`);
            }}
            exportFileName={`payments-${selectedRow?.entity_name || 'details'}`}
            printTitle={selectedRow ? `Payments · ${selectedRow.entity_name} · ${periodLabel(selectedRow.date, groupBy)}` : 'Payments'}
            emptyTitle="No individual payments found"
            className="shadow-none"
          />
        </DialogContent>
      </Dialog>
    </Page>
  );
}
