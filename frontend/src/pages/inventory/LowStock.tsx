import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { stockApi } from '@/lib/api';
import { formatQuantity } from '@/lib/utils';
import { ColumnDef, DataTable, FilterSelect } from '@/components/data-table/DataTable';
import { Page, PageHeader, StatStrip, StatusBadge } from '@/components/layout/Page';

interface StockRow {
  id: number;
  product_id: number;
  name_en: string;
  name_ar?: string;
  sku?: string;
  unit?: string;
  category_name_en?: string;
  location_id: number;
  location_name: string;
  quantity: number;
  min_level: number;
  shortfall: number;
}

// Same rule as the dashboard: below the product's minimum, or 10 when none is set.
const minLevel = (min: unknown) => (Number(min) > 0 ? Number(min) : 10);

export default function LowStock() {
  const navigate = useNavigate();
  const [locationId, setLocationId] = useState('');
  const [severity, setSeverity] = useState('');

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['stock-by-location'],
    queryFn: async () => {
      const response = await stockApi.getAllByLocation();
      return (response.data.data || []) as any[];
    },
  });

  const low: StockRow[] = useMemo(
    () =>
      rows
        .filter((r) => r.product_active !== false && r.product_active !== 0)
        .map((r) => {
          const min = minLevel(r.min_stock_level);
          const quantity = Number(r.quantity);
          return { ...r, quantity, min_level: min, shortfall: Math.max(min - quantity, 0) };
        })
        .filter((r) => r.quantity < r.min_level),
    [rows]
  );

  const locations = useMemo(() => {
    const map = new Map<string, string>();
    low.forEach((r) => map.set(String(r.location_id), r.location_name));
    return Array.from(map, ([value, label]) => ({ value, label }));
  }, [low]);

  const filtered = low.filter(
    (r) => (!locationId || String(r.location_id) === locationId) && (!severity || (severity === 'out' ? r.quantity <= 0 : r.quantity > 0))
  );
  const outCount = low.filter((r) => r.quantity <= 0).length;
  const productCount = new Set(low.map((r) => r.product_id)).size;

  const columns: ColumnDef<StockRow>[] = [
    {
      id: 'product',
      header: 'Product',
      alwaysVisible: true,
      value: (r) => r.name_ar || r.name_en,
      cell: (r) => (
        <div className="min-w-0" dir="auto">
          <p className="truncate font-medium">{r.name_ar || r.name_en}</p>
          {r.name_ar && <p className="truncate text-xs text-muted-foreground">{r.name_en}</p>}
        </div>
      ),
    },
    { id: 'sku', header: 'SKU', defaultHidden: true, value: (r) => r.sku, cell: (r) => <span className="font-mono text-xs text-muted-foreground">{r.sku || '—'}</span> },
    { id: 'category', header: 'Category', value: (r) => r.category_name_en, cell: (r) => <span className="text-muted-foreground">{r.category_name_en || '—'}</span> },
    { id: 'location', header: 'Location', value: (r) => r.location_name, cell: (r) => r.location_name || '—' },
    {
      id: 'quantity',
      header: 'In stock',
      align: 'end',
      value: (r) => r.quantity,
      cell: (r) => <span className={`tabular-nums font-semibold ${r.quantity <= 0 ? 'text-red-600 dark:text-red-400' : 'text-amber-700 dark:text-amber-300'}`}>{formatQuantity(r.quantity)}</span>,
    },
    { id: 'min_level', header: 'Minimum', align: 'end', value: (r) => r.min_level, cell: (r) => <span className="tabular-nums text-muted-foreground">{formatQuantity(r.min_level)}</span> },
    { id: 'shortfall', header: 'To reorder', align: 'end', value: (r) => r.shortfall, cell: (r) => <span className="tabular-nums font-medium">{formatQuantity(r.shortfall)}</span> },
    {
      id: 'severity',
      header: 'Status',
      value: (r) => (r.quantity <= 0 ? 0 : 1),
      cell: (r) => (r.quantity <= 0 ? <StatusBadge tone="red">Out of stock</StatusBadge> : <StatusBadge tone="amber">Low</StatusBadge>),
    },
  ];

  return (
    <Page>
      <PageHeader icon={AlertTriangle} title="Low Stock" description="Items below their minimum level, per location" />

      <StatStrip
        items={[
          { label: 'Products affected', value: productCount },
          { label: 'Low (per location)', value: low.length - outCount, onClick: () => setSeverity('low'), active: severity === 'low' },
          { label: 'Out of stock', value: outCount, onClick: () => setSeverity('out'), active: severity === 'out' },
          { label: 'Units to reorder', value: formatQuantity(low.reduce((s, r) => s + r.shortfall, 0)) },
        ]}
      />

      <DataTable
        data={filtered}
        columns={columns}
        rowKey={(r) => `${r.product_id}-${r.location_id}`}
        loading={isLoading}
        defaultSort={{ id: 'quantity', dir: 'asc' }}
        searchPlaceholder="Search product, SKU, category…"
        onRowClick={(r) => navigate(`/products/edit/${r.product_id}`)}
        storageKey="low-stock"
        exportFileName="low-stock"
        emptyTitle="All stock levels are healthy"
        activeFilterCount={(locationId ? 1 : 0) + (severity ? 1 : 0)}
        onResetFilters={() => {
          setLocationId('');
          setSeverity('');
        }}
        filters={
          <>
            <FilterSelect label="Location" value={locationId} onChange={setLocationId} options={locations} />
            <FilterSelect
              label="Status"
              value={severity}
              onChange={setSeverity}
              options={[
                { value: 'out', label: 'Out of stock' },
                { value: 'low', label: 'Low' },
              ]}
            />
          </>
        }
      />
    </Page>
  );
}
