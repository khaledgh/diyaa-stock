import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Boxes, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { stockApi, productApi, locationApi } from '@/lib/api';
import { cn, formatQuantity } from '@/lib/utils';
import { ColumnDef, DataTable, FilterSelect } from '@/components/data-table/DataTable';
import { Page, PageHeader, StatStrip, StatusBadge } from '@/components/layout/Page';

interface InventoryRow {
  product_id: number;
  sku: string;
  name_en: string;
  name_ar?: string;
  unit?: string;
  category: string;
  min_level: number;
  total: number;
  byLocation: Record<number, number>;
}

// Same rule as the dashboard and Low Stock page.
const minLevel = (min: unknown) => (Number(min) > 0 ? Number(min) : 10);

function parseLocationQuantities(raw: string | null | undefined): Record<number, number> {
  const out: Record<number, number> = {};
  (raw || '').split('|').forEach((entry) => {
    const parts = entry.split(':');
    if (parts.length >= 3) {
      const id = parseInt(parts[0]);
      if (id) out[id] = (out[id] || 0) + (parseFloat(parts[parts.length - 1]) || 0);
    }
  });
  return out;
}

export default function Inventory() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [category, setCategory] = useState('');
  const [stockStatus, setStockStatus] = useState('');
  const [locationFilter, setLocationFilter] = useState('');

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [addForm, setAddForm] = useState({ product: '', location: '', quantity: '' });
  const [editing, setEditing] = useState<{ productId: number; productName: string; locationId: number; locationName: string; current: number } | null>(null);
  const [newQuantity, setNewQuantity] = useState('');

  const { data: inventory = [], isLoading } = useQuery({
    queryKey: ['all-stock'],
    queryFn: async () => (await stockApi.getAllStock()).data.data || [],
  });
  const { data: products = [] } = useQuery({
    queryKey: ['products-all'],
    queryFn: async () => {
      const d = (await productApi.getAll()).data;
      return d.data || d || [];
    },
    enabled: isAddOpen,
  });
  const { data: locations = [] } = useQuery({
    queryKey: ['locations-all'],
    queryFn: async () => (await locationApi.getAll()).data.data || [],
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['all-stock'] });
    queryClient.invalidateQueries({ queryKey: ['warehouse-stock'] });
    queryClient.invalidateQueries({ queryKey: ['stock-by-location'] });
  };

  const addStockMutation = useMutation({
    mutationFn: (data: any) => stockApi.addStock(data),
    onSuccess: () => {
      invalidate();
      toast.success(t('stock.stockAdded'));
      setIsAddOpen(false);
      setAddForm({ product: '', location: '', quantity: '' });
    },
    onError: () => toast.error(t('stock.stockAddError')),
  });

  const adjustStockMutation = useMutation({
    mutationFn: (data: any) => stockApi.adjustStock(data),
    onSuccess: () => {
      invalidate();
      toast.success('Stock updated');
      setEditing(null);
    },
    onError: () => toast.error('Failed to update stock'),
  });

  const rows: InventoryRow[] = useMemo(
    () =>
      inventory.map((item: any) => ({
        product_id: item.product_id,
        sku: item.sku,
        name_en: item.name_en,
        name_ar: item.name_ar,
        unit: item.unit,
        category: item.category_name_en || '',
        min_level: minLevel(item.min_stock_level),
        total: Number(item.total_quantity || 0),
        byLocation: parseLocationQuantities(item.location_quantities),
      })),
    [inventory]
  );

  const activeLocations: any[] = useMemo(() => locations.filter((l: any) => l.is_active !== false), [locations]);
  const shownLocations = locationFilter ? activeLocations.filter((l) => String(l.id) === locationFilter) : activeLocations;
  const qtyFor = (r: InventoryRow) => (locationFilter ? r.byLocation[Number(locationFilter)] || 0 : r.total);
  // Locations where this product is below its minimum (the Low Stock page's rule).
  const lowLocations = (r: InventoryRow) => shownLocations.filter((l) => (r.byLocation[l.id] || 0) < r.min_level).length;
  const statusOf = (r: InventoryRow) => {
    if (qtyFor(r) <= 0) return 'out';
    return lowLocations(r) > 0 ? 'low' : 'ok';
  };

  const categories = useMemo(() => Array.from(new Set(rows.map((r) => r.category).filter(Boolean))).sort().map((c) => ({ value: c, label: c })), [rows]);
  const filtered = rows.filter((r) => (!category || r.category === category) && (!stockStatus || statusOf(r) === stockStatus));

  const lowCount = rows.filter((r) => statusOf(r) === 'low').length;
  const outCount = rows.filter((r) => statusOf(r) === 'out').length;
  const totalUnits = rows.reduce((s, r) => s + qtyFor(r), 0);

  const openEdit = (r: InventoryRow, loc: any) => {
    const current = r.byLocation[loc.id] || 0;
    setEditing({ productId: r.product_id, productName: r.name_en, locationId: loc.id, locationName: loc.name, current });
    setNewQuantity(String(current));
  };

  const columns: ColumnDef<InventoryRow>[] = [
    {
      id: 'product',
      header: t('products.name'),
      alwaysVisible: true,
      value: (r) => r.name_ar || r.name_en,
      cell: (r) => (
        <div className="min-w-[160px]" dir="auto">
          <p className="truncate font-medium">{r.name_ar || r.name_en}</p>
          <p className="truncate text-xs text-muted-foreground">
            {r.sku}
            {r.name_ar && r.name_en ? ` · ${r.name_en}` : ''}
          </p>
        </div>
      ),
    },
    { id: 'category', header: t('products.category'), value: (r) => r.category, cell: (r) => <span className="text-muted-foreground">{r.category || '—'}</span> },
    ...shownLocations.map(
      (loc): ColumnDef<InventoryRow> => ({
        id: `loc-${loc.id}`,
        header: loc.name,
        align: 'end',
        value: (r) => r.byLocation[loc.id] || 0,
        cell: (r) => {
          const q = r.byLocation[loc.id] || 0;
          return (
            <button
              type="button"
              title={`Adjust ${r.name_en} at ${loc.name}`}
              onClick={(e) => {
                e.stopPropagation();
                openEdit(r, loc);
              }}
              className={cn(
                'inline-flex min-w-[64px] justify-end rounded-md px-2 py-1 tabular-nums transition-colors hover:bg-primary/10 hover:text-primary',
                q <= 0 ? 'text-muted-foreground/60' : q < r.min_level ? 'font-medium text-amber-700 dark:text-amber-300' : ''
              )}
            >
              {formatQuantity(q)}
            </button>
          );
        },
      })
    ),
    ...(!locationFilter
      ? [
          {
            id: 'total',
            header: t('inventory.totalStock') || 'Total',
            align: 'end',
            value: (r: InventoryRow) => r.total,
            cell: (r: InventoryRow) => (
              <span className="tabular-nums font-semibold">
                {formatQuantity(r.total)} <span className="text-xs font-normal text-muted-foreground">{r.unit}</span>
              </span>
            ),
          } as ColumnDef<InventoryRow>,
        ]
      : []),
    {
      id: 'status',
      header: 'Status',
      value: (r) => ({ out: 0, low: 1, ok: 2 })[statusOf(r)],
      cell: (r) => {
        const s = statusOf(r);
        if (s === 'out') return <StatusBadge tone="red">Out of stock</StatusBadge>;
        if (s === 'low') {
          const n = lowLocations(r);
          return <StatusBadge tone="amber" className="normal-case">{locationFilter ? 'Low' : `Low at ${n} location${n > 1 ? 's' : ''}`}</StatusBadge>;
        }
        return <StatusBadge tone="green">In stock</StatusBadge>;
      },
    },
  ];

  return (
    <Page>
      <PageHeader
        icon={Boxes}
        title={t('inventory.title')}
        description="Stock per product and location — click a quantity to adjust it"
        actions={
          <Button onClick={() => setIsAddOpen(true)}>
            <Plus className="me-1.5 h-4 w-4" />
            {t('inventory.addStock')}
          </Button>
        }
      />

      <StatStrip
        items={[
          { label: 'Products', value: rows.length.toLocaleString() },
          { label: locationFilter ? 'Units at this location' : 'Total units', value: formatQuantity(totalUnits) },
          { label: 'Low stock', value: lowCount, onClick: () => setStockStatus(stockStatus === 'low' ? '' : 'low'), active: stockStatus === 'low' },
          { label: 'Out of stock', value: outCount, onClick: () => setStockStatus(stockStatus === 'out' ? '' : 'out'), active: stockStatus === 'out' },
        ]}
      />

      <DataTable
        data={filtered}
        columns={columns}
        rowKey={(r) => r.product_id}
        loading={isLoading}
        defaultSort={{ id: 'product', dir: 'asc' }}
        searchPlaceholder={t('inventory.searchPlaceholder') || 'Search product, SKU, category…'}
        storageKey="inventory"
        exportFileName="inventory"
        emptyTitle="No products found"
        activeFilterCount={[category, stockStatus, locationFilter].filter(Boolean).length}
        onResetFilters={() => {
          setCategory('');
          setStockStatus('');
          setLocationFilter('');
        }}
        filters={
          <>
            <FilterSelect label="Location" value={locationFilter} onChange={setLocationFilter} options={activeLocations.map((l) => ({ value: String(l.id), label: l.name }))} />
            <FilterSelect label="Category" value={category} onChange={setCategory} options={categories} />
            <FilterSelect
              label="Stock"
              value={stockStatus}
              onChange={setStockStatus}
              options={[
                { value: 'ok', label: 'In stock' },
                { value: 'low', label: 'Low' },
                { value: 'out', label: 'Out of stock' },
              ]}
            />
          </>
        }
        footer={(list) => ({
          product: <span className="text-xs font-medium text-muted-foreground">{list.length} products</span>,
          ...Object.fromEntries(shownLocations.map((l) => [`loc-${l.id}`, formatQuantity(list.reduce((s, r) => s + (r.byLocation[l.id] || 0), 0))])),
          total: formatQuantity(list.reduce((s, r) => s + r.total, 0)),
        })}
      />

      {/* Add stock */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('inventory.addStockToLocation')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>{t('products.name')}</Label>
              <Select value={addForm.product} onValueChange={(v) => setAddForm({ ...addForm, product: v })}>
                <SelectTrigger>
                  <SelectValue placeholder={t('inventory.selectProduct')} />
                </SelectTrigger>
                <SelectContent>
                  {products.map((p: any) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.name_en} {p.sku ? `(${p.sku})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{t('locations.location')}</Label>
              <Select value={addForm.location} onValueChange={(v) => setAddForm({ ...addForm, location: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  {activeLocations.map((l) => (
                    <SelectItem key={l.id} value={String(l.id)}>
                      {l.name} ({l.type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{t('common.quantity')}</Label>
              <Input type="number" min="0" step="0.01" value={addForm.quantity} onChange={(e) => setAddForm({ ...addForm, quantity: e.target.value })} placeholder={t('inventory.enterQuantity')} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              disabled={addStockMutation.isPending}
              onClick={() => {
                if (!addForm.product || !addForm.location || !addForm.quantity) return toast.error(t('common.fillRequired'));
                addStockMutation.mutate({ product_id: Number(addForm.product), location_id: Number(addForm.location), quantity: parseFloat(addForm.quantity) });
              }}
            >
              {addStockMutation.isPending ? t('common.saving') : t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Adjust stock */}
      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Adjust stock</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div className="rounded-lg bg-muted/50 p-3 text-sm">
                <p className="font-medium">{editing.productName}</p>
                <p className="text-muted-foreground">
                  {editing.locationName} · currently <span className="font-medium text-foreground">{formatQuantity(editing.current)}</span>
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="new-qty">New quantity</Label>
                <Input id="new-qty" type="number" min="0" step="0.01" autoFocus value={newQuantity} onChange={(e) => setNewQuantity(e.target.value)} />
                {newQuantity !== '' && !isNaN(parseFloat(newQuantity)) && (
                  <p className="text-xs text-muted-foreground">
                    Change: {parseFloat(newQuantity) - editing.current >= 0 ? '+' : ''}
                    {formatQuantity(parseFloat(newQuantity) - editing.current)}
                  </p>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button
              disabled={adjustStockMutation.isPending}
              onClick={() => {
                const q = parseFloat(newQuantity);
                if (!editing || isNaN(q) || q < 0) return toast.error('Enter a valid quantity');
                adjustStockMutation.mutate({ product_id: editing.productId, location_id: editing.locationId, quantity: q, reason: 'Manual stock adjustment' });
              }}
            >
              {adjustStockMutation.isPending ? 'Saving…' : 'Update stock'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Page>
  );
}
