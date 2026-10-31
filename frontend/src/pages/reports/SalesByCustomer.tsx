import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { FileSpreadsheet, FileText, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { reportApi } from '@/lib/api';
import { formatCurrency, toLocalISODate } from '@/lib/utils';
import { exportSalesByCustomer } from '@/lib/exportExcel';
import { exportSalesByCustomerPDF } from '@/lib/exportPDF';
import { ColumnDef, DataTable, DateRangeFilter, FilterSelect } from '@/components/data-table/DataTable';
import { Page, PageHeader, StatStrip } from '@/components/layout/Page';

export default function SalesByCustomer() {
  const navigate = useNavigate();
  const now = new Date();
  const [range, setRange] = useState({ from: toLocalISODate(new Date(now.getFullYear(), now.getMonth() - 1, now.getDate())), to: toLocalISODate(now) });
  const [balance, setBalance] = useState('');

  const { data: report, isLoading } = useQuery({
    queryKey: ['sales-by-customer', range],
    queryFn: async () => {
      const response = await reportApi.salesByCustomer({ from_date: range.from, to_date: range.to });
      return response.data.data || response.data;
    },
    enabled: !!(range.from && range.to),
  });

  const num = (v: unknown) => Number(v || 0);
  const rows: any[] = report?.customers || [];
  const filtered = rows.filter((r) => !balance || (balance === 'owing' ? num(r.total_outstanding) > 0.009 : num(r.total_outstanding) <= 0.009));
  const s = report?.summary || {};

  const columns: ColumnDef<any>[] = [
    { id: 'customer', header: 'Customer', alwaysVisible: true, value: (r) => r.customer_name, cell: (r) => <span className="font-medium" dir="auto">{r.customer_name}</span> },
    { id: 'invoices', header: 'Invoices', align: 'end', value: (r) => num(r.invoice_count), cell: (r) => <span className="tabular-nums text-muted-foreground">{num(r.invoice_count)}</span> },
    { id: 'sales', header: 'Sales', align: 'end', value: (r) => num(r.total_sales), cell: (r) => <span className="tabular-nums font-semibold">{formatCurrency(num(r.total_sales))}</span> },
    {
      id: 'returns',
      header: 'Returns',
      align: 'end',
      value: (r) => num(r.total_credit_notes),
      cell: (r) => (num(r.total_credit_notes) ? <span className="tabular-nums text-orange-600">−{formatCurrency(num(r.total_credit_notes))}</span> : <span className="text-muted-foreground/50">—</span>),
    },
    { id: 'paid', header: 'Paid', align: 'end', value: (r) => num(r.total_paid), cell: (r) => <span className="tabular-nums">{formatCurrency(num(r.total_paid))}</span> },
    {
      id: 'outstanding',
      header: 'Outstanding',
      align: 'end',
      value: (r) => num(r.total_outstanding),
      cell: (r) => <span className={`tabular-nums font-medium ${num(r.total_outstanding) > 0.009 ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground'}`}>{formatCurrency(num(r.total_outstanding))}</span>,
    },
    {
      id: 'share',
      header: 'Share',
      align: 'end',
      value: (r) => (num(s.total_sales) > 0 ? (num(r.total_sales) / num(s.total_sales)) * 100 : 0),
      cell: (r) => {
        const pct = num(s.total_sales) > 0 ? (num(r.total_sales) / num(s.total_sales)) * 100 : 0;
        return (
          <div className="ms-auto flex w-24 items-center justify-end gap-2">
            <div className="h-1.5 flex-1 rounded-full bg-muted">
              <div className="h-1.5 rounded-full" style={{ width: `${Math.min(pct, 100)}%`, background: 'var(--chart-1)' }} />
            </div>
            <span className="w-9 text-end tabular-nums text-xs text-muted-foreground">{pct.toFixed(0)}%</span>
          </div>
        );
      },
    },
  ];

  return (
    <Page>
      <PageHeader
        icon={Users}
        backTo="/reports"
        title="Sales by Customer"
        description="Who buys the most, and who still owes"
        actions={
          <>
            <Button variant="outline" disabled={!rows.length} onClick={() => exportSalesByCustomer(rows, range.from, range.to)}>
              <FileSpreadsheet className="me-1.5 h-4 w-4" /> Excel
            </Button>
            <Button variant="outline" disabled={!rows.length} onClick={() => exportSalesByCustomerPDF(rows, range.from, range.to)}>
              <FileText className="me-1.5 h-4 w-4" /> PDF
            </Button>
          </>
        }
      />

      <StatStrip
        items={[
          { label: 'Sales', value: formatCurrency(num(s.total_sales)), hint: `${num(s.total_invoices)} invoices` },
          { label: 'Returns', value: formatCurrency(num(s.total_credit_notes)) },
          { label: 'Paid', value: formatCurrency(num(s.total_paid)) },
          { label: 'Outstanding', value: formatCurrency(num(s.total_outstanding)), hint: `${num(s.total_customers)} customers` },
        ]}
      />

      <DataTable
        data={filtered}
        columns={columns}
        rowKey={(r) => r.customer_id || r.customer_name}
        loading={isLoading}
        defaultSort={{ id: 'sales', dir: 'desc' }}
        searchPlaceholder="Search customer…"
        onRowClick={(r) => r.customer_id && navigate(`/customers/${r.customer_id}`)}
        storageKey="sales-by-customer"
        exportFileName={`sales-by-customer-${range.from}-${range.to}`}
        emptyTitle="No sales in this period"
        activeFilterCount={balance ? 1 : 0}
        onResetFilters={() => setBalance('')}
        filters={
          <>
            <DateRangeFilter from={range.from} to={range.to} onChange={setRange} clearable={false} />
            <FilterSelect
              label="Balance"
              value={balance}
              onChange={setBalance}
              options={[
                { value: 'owing', label: 'Still owes' },
                { value: 'settled', label: 'Settled' },
              ]}
            />
          </>
        }
        footer={(list) => ({
          customer: <span className="text-xs font-medium text-muted-foreground">{list.length} customers</span>,
          invoices: list.reduce((t, r) => t + num(r.invoice_count), 0),
          sales: formatCurrency(list.reduce((t, r) => t + num(r.total_sales), 0)),
          returns: formatCurrency(list.reduce((t, r) => t + num(r.total_credit_notes), 0)),
          paid: formatCurrency(list.reduce((t, r) => t + num(r.total_paid), 0)),
          outstanding: formatCurrency(list.reduce((t, r) => t + num(r.total_outstanding), 0)),
        })}
      />
    </Page>
  );
}
