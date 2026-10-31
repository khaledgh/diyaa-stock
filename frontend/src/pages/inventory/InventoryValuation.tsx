import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { FileText, Warehouse } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { reportApi } from '@/lib/api';
import { formatCurrency, formatQuantity } from '@/lib/utils';
import { exportInventoryValuationPDF } from '@/lib/exportPDF';
import { ColumnDef, DataTable, FilterSelect } from '@/components/data-table/DataTable';
import { Page, PageHeader, StatStrip } from '@/components/layout/Page';

export default function InventoryValuation() {
  const navigate = useNavigate();
  const [category, setCategory] = useState('');
  const [stockFilter, setStockFilter] = useState('in_stock');

  const { data: report, isLoading } = useQuery({
    queryKey: ['inventory-valuation'],
    queryFn: async () => {
      const response = await reportApi.inventoryValuation();
      return response.data.data || response.data;
    },
  });

  const products: any[] = useMemo(
    () =>
      (report?.products || []).map((p: any) => ({
        ...p,
        total_quantity: Number(p.total_quantity),
        stock_value: Number(p.stock_value),
        retail_value: Number(p.retail_value),
        cost_price: Number(p.cost_price),
        unit_price: Number(p.unit_price),
      })),
    [report]
  );
  const categories = useMemo(
    () => Array.from(new Set(products.map((p) => p.category_name).filter(Boolean))).sort().map((c) => ({ value: c as string, label: c as string })),
    [products]
  );
  const filtered = products.filter(
    (p) =>
      (!category || p.category_name === category) &&
      (stockFilter === '' || (stockFilter === 'in_stock' ? p.total_quantity > 0 : p.total_quantity <= 0))
  );
  const s = report?.summary || {};

  const columns: ColumnDef<any>[] = [
    {
      id: 'name',
      header: 'Product',
      alwaysVisible: true,
      value: (p) => p.name_ar || p.name_en,
      cell: (p) => (
        <div className="min-w-0" dir="auto">
          <p className="truncate font-medium">{p.name_ar || p.name_en}</p>
          {p.name_ar && p.name_en && <p className="truncate text-xs text-muted-foreground">{p.name_en}</p>}
        </div>
      ),
    },
    { id: 'sku', header: 'SKU', defaultHidden: true, value: (p) => p.sku, cell: (p) => <span className="font-mono text-xs text-muted-foreground">{p.sku || '—'}</span> },
    { id: 'category', header: 'Category', value: (p) => p.category_name, cell: (p) => <span className="text-muted-foreground">{p.category_name || '—'}</span> },
    { id: 'quantity', header: 'Quantity', align: 'end', value: (p) => p.total_quantity, cell: (p) => <span className="tabular-nums">{formatQuantity(p.total_quantity)}</span> },
    { id: 'cost_price', header: 'Unit cost', align: 'end', value: (p) => p.cost_price, cell: (p) => <span className="tabular-nums text-muted-foreground">{formatCurrency(p.cost_price)}</span> },
    { id: 'unit_price', header: 'Unit price', align: 'end', defaultHidden: true, value: (p) => p.unit_price, cell: (p) => <span className="tabular-nums text-muted-foreground">{formatCurrency(p.unit_price)}</span> },
    { id: 'stock_value', header: 'Value at cost', align: 'end', value: (p) => p.stock_value, cell: (p) => <span className="tabular-nums font-semibold">{formatCurrency(p.stock_value)}</span> },
    { id: 'retail_value', header: 'Value at retail', align: 'end', value: (p) => p.retail_value, cell: (p) => <span className="tabular-nums">{formatCurrency(p.retail_value)}</span> },
    {
      id: 'margin',
      header: 'Margin',
      align: 'end',
      value: (p) => (p.unit_price > 0 ? ((p.unit_price - p.cost_price) / p.unit_price) * 100 : null),
      cell: (p) => <span className="tabular-nums text-muted-foreground">{p.unit_price > 0 ? `${(((p.unit_price - p.cost_price) / p.unit_price) * 100).toFixed(0)}%` : '—'}</span>,
    },
  ];

  return (
    <Page>
      <PageHeader
        icon={Warehouse}
        title="Inventory Valuation"
        description="What your stock is worth, at cost and at selling price"
        backTo="/reports"
        actions={
          <>
            <Button variant="outline" disabled={!products.length} onClick={async () => await exportInventoryValuationPDF(report?.products || [])}>
              <FileText className="me-1.5 h-4 w-4" /> PDF
            </Button>
          </>
        }
      />

      <StatStrip
        items={[
          { label: 'Value at cost', value: formatCurrency(s.total_cost_value || 0) },
          { label: 'Value at retail', value: formatCurrency(s.total_retail_value || 0) },
          { label: 'Potential gross profit', value: formatCurrency(s.potential_profit || 0) },
          { label: 'Units in stock', value: formatQuantity(s.total_quantity || 0), hint: `${s.total_items || 0} products` },
        ]}
      />

      <DataTable
        data={filtered}
        columns={columns}
        rowKey={(p) => p.id}
        loading={isLoading}
        defaultSort={{ id: 'stock_value', dir: 'desc' }}
        searchPlaceholder="Search product, SKU, category…"
        onRowClick={(p) => navigate(`/products/edit/${p.id}`)}
        storageKey="inventory-valuation"
        exportFileName="inventory-valuation"
        emptyTitle="No products match"
        activeFilterCount={(category ? 1 : 0) + (stockFilter !== 'in_stock' ? 1 : 0)}
        onResetFilters={() => {
          setCategory('');
          setStockFilter('in_stock');
        }}
        filters={
          <>
            <FilterSelect label="Category" value={category} onChange={setCategory} options={categories} />
            <FilterSelect
              label="Stock"
              value={stockFilter}
              onChange={setStockFilter}
              allLabel="All products"
              options={[
                { value: 'in_stock', label: 'In stock' },
                { value: 'empty', label: 'No stock' },
              ]}
            />
          </>
        }
        footer={(rows) => ({
          name: <span className="text-xs font-medium text-muted-foreground">{rows.length} products</span>,
          quantity: formatQuantity(rows.reduce((t, p) => t + p.total_quantity, 0)),
          stock_value: formatCurrency(rows.reduce((t, p) => t + p.stock_value, 0)),
          retail_value: formatCurrency(rows.reduce((t, p) => t + p.retail_value, 0)),
        })}
      />
    </Page>
  );
}
