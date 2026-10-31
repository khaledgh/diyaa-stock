import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { FileSpreadsheet, FileText, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { reportApi } from '@/lib/api';
import { formatCurrency, formatQuantity, toLocalISODate } from '@/lib/utils';
import { exportSalesByItem } from '@/lib/exportExcel';
import { exportSalesByItemPDF } from '@/lib/exportPDF';
import { ColumnDef, DataTable, DateRangeFilter, FilterSelect } from '@/components/data-table/DataTable';
import { Page, PageHeader, StatStrip } from '@/components/layout/Page';

export default function SalesByItem() {
  const navigate = useNavigate();
  const now = new Date();
  const [range, setRange] = useState({ from: toLocalISODate(new Date(now.getFullYear(), now.getMonth() - 1, now.getDate())), to: toLocalISODate(now) });
  const [category, setCategory] = useState('');

  const { data: report, isLoading } = useQuery({
    queryKey: ['sales-by-item', range],
    queryFn: async () => {
      const response = await reportApi.salesByItem({ from_date: range.from, to_date: range.to });
      return response.data.data || response.data;
    },
    enabled: !!(range.from && range.to),
  });

  const num = (v: unknown) => Number(v || 0);
  const rows: any[] = report?.products || [];
  const categories = useMemo(
    () => Array.from(new Set(rows.map((r) => r.category_name).filter(Boolean))).sort().map((c) => ({ value: c as string, label: c as string })),
    [rows]
  );
  const filtered = rows.filter((r) => !category || r.category_name === category);
  const s = report?.summary || {};

  const columns: ColumnDef<any>[] = [
    { id: 'product', header: 'Product', alwaysVisible: true, value: (r) => r.product_name, cell: (r) => <span className="font-medium" dir="auto">{r.product_name}</span> },
    { id: 'sku', header: 'SKU', defaultHidden: true, value: (r) => r.sku, cell: (r) => <span className="font-mono text-xs text-muted-foreground">{r.sku || '—'}</span> },
    { id: 'category', header: 'Category', value: (r) => r.category_name, cell: (r) => <span className="text-muted-foreground">{r.category_name}</span> },
    { id: 'quantity', header: 'Qty sold', align: 'end', value: (r) => num(r.quantity_sold), cell: (r) => <span className="tabular-nums">{formatQuantity(num(r.quantity_sold))}</span> },
    { id: 'invoices', header: 'Invoices', align: 'end', defaultHidden: true, value: (r) => num(r.invoice_count), cell: (r) => <span className="tabular-nums text-muted-foreground">{num(r.invoice_count)}</span> },
    { id: 'avg_price', header: 'Avg price', align: 'end', value: (r) => num(r.avg_price), cell: (r) => <span className="tabular-nums text-muted-foreground">{formatCurrency(num(r.avg_price))}</span> },
    { id: 'sales', header: 'Net sales', align: 'end', value: (r) => num(r.total_sales), cell: (r) => <span className="tabular-nums font-semibold">{formatCurrency(num(r.total_sales))}</span> },
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
        icon={Package}
        backTo="/reports"
        title="Sales by Item"
        description="Which products sell, net of returns"
        actions={
          <>
            <Button variant="outline" disabled={!rows.length} onClick={() => exportSalesByItem(rows, range.from, range.to)}>
              <FileSpreadsheet className="me-1.5 h-4 w-4" /> Excel
            </Button>
            <Button variant="outline" disabled={!rows.length} onClick={async () => await exportSalesByItemPDF(rows, range.from, range.to)}>
              <FileText className="me-1.5 h-4 w-4" /> PDF
            </Button>
          </>
        }
      />

      <StatStrip
        items={[
          { label: 'Net sales', value: formatCurrency(num(s.total_sales)) },
          { label: 'Units sold', value: formatQuantity(num(s.total_quantity_sold)) },
          { label: 'Products sold', value: num(s.total_products) },
        ]}
      />

      <DataTable
        data={filtered}
        columns={columns}
        rowKey={(r) => r.product_id}
        loading={isLoading}
        defaultSort={{ id: 'sales', dir: 'desc' }}
        searchPlaceholder="Search product, SKU, category…"
        onRowClick={(r) => navigate(`/products/edit/${r.product_id}`)}
        storageKey="sales-by-item"
        exportFileName={`sales-by-item-${range.from}-${range.to}`}
        emptyTitle="No sales in this period"
        activeFilterCount={category ? 1 : 0}
        onResetFilters={() => setCategory('')}
        filters={
          <>
            <DateRangeFilter from={range.from} to={range.to} onChange={setRange} clearable={false} />
            <FilterSelect label="Category" value={category} onChange={setCategory} options={categories} />
          </>
        }
        footer={(list) => ({
          product: <span className="text-xs font-medium text-muted-foreground">{list.length} products</span>,
          quantity: formatQuantity(list.reduce((t, r) => t + num(r.quantity_sold), 0)),
          sales: formatCurrency(list.reduce((t, r) => t + num(r.total_sales), 0)),
        })}
      />
    </Page>
  );
}
