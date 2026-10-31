import { useState } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Package, Pencil, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { categoryApi, productApi } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { ColumnDef, DataTable, FilterSelect, SortState } from '@/components/data-table/DataTable';
import { ActiveBadge, Page, PageHeader, RowAction, RowActions } from '@/components/layout/Page';

// Table column id -> backend sortBy column
const SORT_FIELDS: Record<string, string> = {
  sku: 'sku',
  name: 'name_en',
  unit_price: 'unit_price',
  cost_price: 'cost_price',
  status: 'is_active',
};

export default function Products() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [sort, setSort] = useState<SortState | null>({ id: 'name', dir: 'asc' });
  const [categoryId, setCategoryId] = useState('');
  const [status, setStatus] = useState('active');

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['products', { search, page, pageSize, sort, categoryId, status }],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const response = await productApi.getAll({
        search: search || undefined,
        page,
        per_page: pageSize,
        sortBy: sort ? SORT_FIELDS[sort.id] : undefined,
        orderBy: sort?.dir,
        category_id: categoryId || undefined,
        status: status || 'all',
      });
      const apiData = response.data.data || response.data;
      if (Array.isArray(apiData?.data)) return { rows: apiData.data, total: apiData.total ?? apiData.pagination?.total ?? apiData.data.length };
      if (Array.isArray(apiData)) return { rows: apiData, total: apiData.length };
      return { rows: [], total: 0 };
    },
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories', 'filter'],
    queryFn: async () => {
      const response = await categoryApi.getAll();
      const d = response.data.data || response.data;
      return Array.isArray(d) ? d : d?.data || [];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: productApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success(t('common.deleteSuccess') || 'Product deleted');
    },
    onError: (error: any) => toast.error(error.response?.data?.message || 'Failed to delete product'),
  });

  const handleDelete = (id: number) => {
    if (confirm(t('common.confirmDelete') || 'Delete this product?')) deleteMutation.mutate(id);
  };

  const columns: ColumnDef<any>[] = [
    {
      id: 'name',
      header: t('products.name'),
      alwaysVisible: true,
      value: (p) => p.name_ar || p.name_en,
      cell: (p) => (
        <div className="min-w-0" dir="auto">
          <p className="truncate font-medium">{p.name_ar || p.name_en}</p>
          {p.name_ar && p.name_en && <p className="truncate text-xs text-muted-foreground">{p.name_en}</p>}
        </div>
      ),
    },
    { id: 'sku', header: t('products.sku'), value: (p) => p.sku, cell: (p) => <span className="font-mono text-xs text-muted-foreground">{p.sku || '—'}</span> },
    {
      id: 'category',
      header: t('products.category'),
      sortable: false,
      value: (p) => p.category?.name_ar || p.category?.name_en,
      cell: (p) => <span dir="auto">{p.category?.name_ar || p.category?.name_en || '—'}</span>,
    },
    {
      id: 'type',
      header: t('products.type'),
      sortable: false,
      defaultHidden: true,
      value: (p) => p.product_type?.name_ar || p.product_type?.name_en,
      cell: (p) => <span dir="auto">{p.product_type?.name_ar || p.product_type?.name_en || '—'}</span>,
    },
    { id: 'cost_price', header: t('products.costPrice'), align: 'end', defaultHidden: true, value: (p) => Number(p.cost_price), cell: (p) => <span className="tabular-nums">{formatCurrency(p.cost_price)}</span> },
    { id: 'unit_price', header: t('products.unitPrice'), align: 'end', value: (p) => Number(p.unit_price), cell: (p) => <span className="tabular-nums font-medium">{formatCurrency(p.unit_price)}</span> },
    { id: 'status', header: t('common.status'), value: (p) => (p.is_active ? 1 : 0), cell: (p) => <ActiveBadge active={p.is_active} activeLabel={t('common.active')} inactiveLabel={t('common.inactive')} /> },
    {
      id: 'actions',
      header: '',
      alwaysVisible: true,
      sortable: false,
      align: 'end',
      cell: (p) => (
        <RowActions>
          <RowAction label="Edit" icon={Pencil} onClick={() => navigate(`/products/edit/${p.id}`)} />
          <RowAction label="Delete" icon={Trash2} tone="danger" onClick={() => handleDelete(p.id)} />
        </RowActions>
      ),
    },
  ];

  const resetPage = <T,>(fn: (v: T) => void) => (v: T) => {
    fn(v);
    setPage(1);
  };
  const activeFilters = (categoryId ? 1 : 0) + (status !== 'active' ? 1 : 0);

  return (
    <Page>
      <PageHeader
        icon={Package}
        title={t('products.title')}
        description="Manage your product catalog and prices"
        actions={
          <Button onClick={() => navigate('/products/new')}>
            <Plus className="me-1.5 h-4 w-4" />
            {t('products.addProduct')}
          </Button>
        }
      />
      <DataTable
        data={data?.rows || []}
        columns={columns}
        rowKey={(p) => p.id}
        loading={isLoading}
        className={isFetching && !isLoading ? 'opacity-80 transition-opacity' : undefined}
        search={search}
        onSearchChange={resetPage(setSearch)}
        searchPlaceholder="Search name, SKU…"
        sort={sort}
        onSortChange={resetPage(setSort)}
        pagination={{ page, pageSize, total: data?.total || 0, onPageChange: setPage, onPageSizeChange: setPageSize }}
        onRowClick={(p) => navigate(`/products/edit/${p.id}`)}
        storageKey="products"
        exportFileName="products"
        activeFilterCount={activeFilters}
        onResetFilters={() => {
          setCategoryId('');
          setStatus('active');
          setPage(1);
        }}
        filters={
          <>
            <FilterSelect
              label={t('products.category')}
              value={categoryId}
              onChange={resetPage(setCategoryId)}
              options={categories.map((c: any) => ({ value: String(c.id), label: c.name_ar || c.name_en }))}
            />
            <FilterSelect
              label={t('common.status')}
              value={status === 'all' ? '' : status}
              onChange={(v) => resetPage(setStatus)(v || 'all')}
              options={[
                { value: 'active', label: t('common.active') },
                { value: 'inactive', label: t('common.inactive') },
              ]}
            />
          </>
        }
      />
    </Page>
  );
}
