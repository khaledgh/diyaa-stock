import { useState } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { vendorApi } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { ColumnDef, DataTable, SortState } from '@/components/data-table/DataTable';
import { Page, PageHeader, RowAction, RowActions } from '@/components/layout/Page';
import { Building2, Plus, Edit, Trash2, FileText } from 'lucide-react';
import { toast } from 'sonner';

export default function Vendors() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);
  const [sort, setSort] = useState<SortState | null>({ id: 'name', dir: 'asc' });
  const [formData, setFormData] = useState({
    name: '',
    company_name: '',
    phone: '',
    email: '',
    address: '',
    tax_number: '',
    payment_terms: '',
    credit_limit: '',
    opening_balance: '',
  });

  const { data: vendorsResponse, isLoading } = useQuery({
    queryKey: ['vendors', searchTerm, page, perPage, sort],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      try {
        const response = await vendorApi.getAll({
          search: searchTerm,
          page,
          per_page: perPage,
          sortBy: sort?.id,
          orderBy: sort?.dir,
        });
        
        // Backend returns PaginationResponse directly: { data: [], total: X, current_page: 1, per_page: 20, total_pages: Y }
        const apiData = response.data;
        
        // Check if it's the pagination response format
        if (apiData?.data && Array.isArray(apiData.data) && apiData.total !== undefined) {
          return {
            data: apiData.data,
            pagination: {
              total: apiData.total,
              current_page: apiData.current_page,
              per_page: apiData.per_page,
              total_pages: apiData.total_pages
            }
          };
        }
        
        // Fallback: if apiData is directly an array (old format)
        if (Array.isArray(apiData)) {
          return { data: apiData, pagination: null };
        }
        
        return { data: [], pagination: null };
      } catch (error) {
        console.error('Failed to fetch vendors:', error);
        return { data: [], pagination: null };
      }
    },
  });

  const vendors = Array.isArray(vendorsResponse?.data) ? vendorsResponse.data : [];
  const pagination = vendorsResponse?.pagination;

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return await vendorApi.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      toast.success(t('vendors.createSuccess'));
      setIsDialogOpen(false);
      resetForm();
    },
    onError: () => {
      toast.error(t('vendors.createError'));
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: any) => {
      return await vendorApi.update(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      toast.success(t('vendors.updateSuccess'));
      setIsDialogOpen(false);
      resetForm();
    },
    onError: () => {
      toast.error(t('vendors.updateError'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return await vendorApi.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      toast.success(t('vendors.deleteSuccess'));
    },
    onError: () => {
      toast.error(t('vendors.deleteError'));
    },
  });

  const resetForm = () => {
    setFormData({
      name: '',
      company_name: '',
      phone: '',
      email: '',
      address: '',
      tax_number: '',
      payment_terms: '',
      credit_limit: '',
      opening_balance: '',
    });
    setEditingVendor(null);
  };

  const handleEdit = (vendor: any) => {
    setEditingVendor(vendor);
    setFormData({
      name: vendor.name || '',
      company_name: vendor.company_name || '',
      phone: vendor.phone || '',
      email: vendor.email || '',
      address: vendor.address || '',
      tax_number: vendor.tax_number || '',
      payment_terms: vendor.payment_terms || '',
      credit_limit: vendor.credit_limit || '',
      opening_balance: vendor.opening_balance || '',
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.name) {
      toast.error(t('common.fillRequired'));
      return;
    }

    const data = {
      ...formData,
      credit_limit: formData.credit_limit ? parseFloat(formData.credit_limit) : 0,
      opening_balance: formData.opening_balance ? parseFloat(formData.opening_balance) : 0,
    };

    if (editingVendor) {
      updateMutation.mutate({ id: editingVendor.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleDelete = (id: number) => {
    if (window.confirm(t('vendors.deleteConfirm'))) {
      deleteMutation.mutate(id);
    }
  };

  const columns: ColumnDef<any>[] = [
    {
      id: 'name',
      header: t('vendors.name'),
      alwaysVisible: true,
      value: (v) => v.name,
      cell: (v) => (
        <div className="min-w-0">
          <p className="truncate font-medium" dir="auto">{v.name}</p>
          {v.company_name && <p className="truncate text-xs text-muted-foreground" dir="auto">{v.company_name}</p>}
        </div>
      ),
    },
    { id: 'phone', header: t('common.phone'), value: (v) => v.phone, cell: (v) => <span className="tabular-nums text-muted-foreground" dir="ltr">{v.phone || '—'}</span> },
    { id: 'email', header: t('common.email'), defaultHidden: true, value: (v) => v.email, cell: (v) => <span className="text-muted-foreground">{v.email || '—'}</span> },
    { id: 'payment_terms', header: t('vendors.paymentTerms'), defaultHidden: true, value: (v) => v.payment_terms, cell: (v) => <span className="text-muted-foreground">{v.payment_terms || '—'}</span> },
    {
      id: 'total_purchases',
      header: t('vendors.totalPurchases'),
      align: 'end',
      sortable: false,
      value: (v) => Number(v.total_amount || 0),
      cell: (v) => (
        <div>
          <p className="tabular-nums font-medium">{formatCurrency(Number(v.total_amount || 0))}</p>
          <p className="text-xs text-muted-foreground">{v.total_purchases || 0} invoices</p>
        </div>
      ),
    },
    {
      id: 'balance',
      header: 'Balance',
      align: 'end',
      value: (v) => Number(v.balance || 0),
      cell: (v) => {
        const b = Number(v.balance || 0);
        return <span className={`tabular-nums font-medium ${b > 0.009 ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground'}`}>{formatCurrency(b)}</span>;
      },
    },
    {
      id: 'actions',
      header: '',
      alwaysVisible: true,
      sortable: false,
      align: 'end',
      cell: (v) => (
        <RowActions>
          <RowAction label="Statement" icon={FileText} onClick={() => navigate(`/vendors/${v.id}/statement`)} />
          <RowAction label="Edit" icon={Edit} onClick={() => handleEdit(v)} />
          <RowAction label="Delete" icon={Trash2} tone="danger" onClick={() => handleDelete(v.id)} />
        </RowActions>
      ),
    },
  ];

  return (
    <Page>
      <PageHeader
        icon={Building2}
        title={t('vendors.title')}
        description={t('vendors.subtitle')}
        actions={
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="me-1.5 h-4 w-4" />
              {t('vendors.addNew')}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingVendor ? t('vendors.edit') : t('vendors.addNew')}
              </DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <Label>{t('vendors.name')} *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder={t('vendors.namePlaceholder')}
                />
              </div>

              <div>
                <Label>{t('vendors.companyName')}</Label>
                <Input
                  value={formData.company_name}
                  onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                  placeholder={t('vendors.companyNamePlaceholder')}
                />
              </div>

              <div>
                <Label>{t('common.phone')}</Label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder={t('vendors.phonePlaceholder')}
                />
              </div>

              <div>
                <Label>{t('common.email')}</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder={t('vendors.emailPlaceholder')}
                />
              </div>

              <div className="col-span-2">
                <Label>{t('common.address')}</Label>
                <Input
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder={t('vendors.addressPlaceholder')}
                />
              </div>

              <div>
                <Label>{t('vendors.taxNumber')}</Label>
                <Input
                  value={formData.tax_number}
                  onChange={(e) => setFormData({ ...formData, tax_number: e.target.value })}
                  placeholder={t('vendors.taxNumberPlaceholder')}
                />
              </div>

              <div>
                <Label>{t('vendors.paymentTerms')}</Label>
                <Input
                  value={formData.payment_terms}
                  onChange={(e) => setFormData({ ...formData, payment_terms: e.target.value })}
                  placeholder={t('vendors.paymentTermsPlaceholder')}
                />
              </div>

              <div>
                <Label>{t('vendors.creditLimit')}</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.credit_limit}
                  onChange={(e) => setFormData({ ...formData, credit_limit: e.target.value })}
                  placeholder="0.00"
                />
              </div>

              {!editingVendor && (
                <div>
                  <Label>Opening Balance</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.opening_balance}
                    onChange={(e) => setFormData({ ...formData, opening_balance: e.target.value })}
                    placeholder="0.00"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Positive = amount owed to vendor</p>
                </div>
              )}

              <div className="col-span-2">
                <Button 
                  onClick={handleSubmit} 
                  className="w-full"
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {createMutation.isPending || updateMutation.isPending 
                    ? t('common.saving') 
                    : t('common.save')}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        }
      />

      <DataTable
        data={vendors}
        columns={columns}
        rowKey={(v) => v.id}
        loading={isLoading}
        search={searchTerm}
        onSearchChange={(v) => {
          setSearchTerm(v);
          setPage(1);
        }}
        searchPlaceholder="Search name, company, phone, email…"
        sort={sort}
        onSortChange={(v) => {
          setSort(v);
          setPage(1);
        }}
        pagination={{ page, pageSize: perPage, total: pagination?.total || 0, onPageChange: setPage, onPageSizeChange: setPerPage }}
        onRowClick={(v) => navigate(`/vendors/${v.id}/statement`)}
        storageKey="vendors"
        exportFileName="vendors"
        emptyTitle="No vendors found"
      />
    </Page>
  );
}
