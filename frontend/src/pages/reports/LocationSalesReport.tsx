import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MapPin } from 'lucide-react';
import { reportApi } from '@/lib/api';
import { formatCurrency, toLocalISODate } from '@/lib/utils';
import { ColumnDef, DataTable, DateRangeFilter } from '@/components/data-table/DataTable';
import { Page, PageHeader, StatStrip } from '@/components/layout/Page';

export default function LocationSalesReport() {
  const today = toLocalISODate();
  const [range, setRange] = useState({ from: today, to: today });

  const { data: report, isLoading } = useQuery({
    queryKey: ['location-sales', range],
    queryFn: async () => {
      const response = await reportApi.locationSales({ from_date: range.from, to_date: range.to });
      return response.data.data || response.data;
    },
    enabled: !!(range.from && range.to),
  });

  const num = (v: unknown) => Number(v || 0);
  const rows: any[] = report?.locations || [];
  const s = report?.summary || {};
  const margin = (r: any) => (num(r.total_sales) > 0 ? (num(r.gross_profit) / num(r.total_sales)) * 100 : null);

  const columns: ColumnDef<any>[] = [
    { id: 'location', header: 'Location', alwaysVisible: true, value: (r) => r.location_name, cell: (r) => <span className="font-medium">{r.location_name}</span> },
    { id: 'invoices', header: 'Invoices', align: 'end', value: (r) => num(r.invoice_count), cell: (r) => <span className="tabular-nums text-muted-foreground">{num(r.invoice_count)}</span> },
    { id: 'sales', header: 'Sales', align: 'end', value: (r) => num(r.total_sales), cell: (r) => <span className="tabular-nums font-semibold">{formatCurrency(num(r.total_sales))}</span> },
    {
      id: 'avg',
      header: 'Avg invoice',
      align: 'end',
      value: (r) => (num(r.invoice_count) ? num(r.total_sales) / num(r.invoice_count) : 0),
      cell: (r) => <span className="tabular-nums text-muted-foreground">{formatCurrency(num(r.invoice_count) ? num(r.total_sales) / num(r.invoice_count) : 0)}</span>,
    },
    {
      id: 'returns',
      header: 'Returns',
      align: 'end',
      value: (r) => num(r.total_credit_notes),
      cell: (r) => (num(r.total_credit_notes) ? <span className="tabular-nums text-orange-600">−{formatCurrency(num(r.total_credit_notes))}</span> : <span className="text-muted-foreground/50">—</span>),
    },
    {
      id: 'profit',
      header: 'Gross profit',
      align: 'end',
      value: (r) => num(r.gross_profit),
      cell: (r) => (
        <div>
          <p className="tabular-nums font-medium">{formatCurrency(num(r.gross_profit))}</p>
          {margin(r) !== null && <p className="text-xs tabular-nums text-muted-foreground">{margin(r)!.toFixed(1)}%</p>}
        </div>
      ),
    },
    { id: 'paid', header: 'Collected', align: 'end', value: (r) => num(r.total_paid), cell: (r) => <span className="tabular-nums">{formatCurrency(num(r.total_paid))}</span> },
    {
      id: 'unpaid',
      header: 'Unpaid',
      align: 'end',
      value: (r) => num(r.total_unpaid),
      cell: (r) => <span className={`tabular-nums ${num(r.total_unpaid) > 0.009 ? 'font-medium text-red-600 dark:text-red-400' : 'text-muted-foreground'}`}>{formatCurrency(num(r.total_unpaid))}</span>,
    },
    { id: 'products', header: 'Products', align: 'end', defaultHidden: true, value: (r) => num(r.products_sold), cell: (r) => <span className="tabular-nums text-muted-foreground">{num(r.products_sold)}</span> },
  ];

  const collectionRate = num(s.total_sales) > 0 ? (num(s.total_paid) / num(s.total_sales)) * 100 : 0;

  return (
    <Page>
      <PageHeader icon={MapPin} backTo="/reports" title="Sales by Location" description="Sales, profit and collections per warehouse, store and van" />

      <StatStrip
        items={[
          { label: 'Sales', value: formatCurrency(num(s.total_sales)), hint: `${num(s.total_invoices)} invoices` },
          { label: 'Gross profit', value: formatCurrency(num(s.total_profit)), hint: num(s.total_sales) > 0 ? `${((num(s.total_profit) / num(s.total_sales)) * 100).toFixed(1)}% margin` : undefined },
          { label: 'Collected', value: formatCurrency(num(s.total_paid)), hint: `${collectionRate.toFixed(0)}% of sales` },
          { label: 'Returns', value: formatCurrency(num(s.total_credit_notes)) },
        ]}
      />

      <DataTable
        data={rows}
        columns={columns}
        rowKey={(r) => r.location_id}
        loading={isLoading}
        defaultSort={{ id: 'sales', dir: 'desc' }}
        searchPlaceholder="Search location…"
        storageKey="location-sales"
        exportFileName={`location-sales-${range.from}-${range.to}`}
        emptyTitle="No active locations"
        filters={<DateRangeFilter from={range.from} to={range.to} onChange={setRange} clearable={false} />}
        footer={(list) => ({
          location: <span className="text-xs font-medium text-muted-foreground">{list.length} locations</span>,
          invoices: list.reduce((t, r) => t + num(r.invoice_count), 0),
          sales: formatCurrency(list.reduce((t, r) => t + num(r.total_sales), 0)),
          returns: formatCurrency(list.reduce((t, r) => t + num(r.total_credit_notes), 0)),
          profit: formatCurrency(list.reduce((t, r) => t + num(r.gross_profit), 0)),
          paid: formatCurrency(list.reduce((t, r) => t + num(r.total_paid), 0)),
          unpaid: formatCurrency(list.reduce((t, r) => t + num(r.total_unpaid), 0)),
        })}
      />
    </Page>
  );
}
