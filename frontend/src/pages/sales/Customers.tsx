import { useState } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, Users, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { customerApi } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { ColumnDef, DataTable, SortState } from '@/components/data-table/DataTable';
import { Page, PageHeader, RowAction, RowActions } from '@/components/layout/Page';

export default function Customers() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);
  const [sort, setSort] = useState<SortState | null>({ id: 'name', dir: 'asc' });
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    tax_number: '',
    credit_limit: '0',
    opening_balance: '0',
  });

  const { data: customersResponse, isLoading } = useQuery({
    queryKey: ['customers', searchTerm, page, perPage, sort],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      try {
        const response = await customerApi.getAll({
          search: searchTerm,
          page,
          per_page: perPage,
          sortBy: sort?.id,
          orderBy: sort?.dir,
        });
        
        const apiData = response.data;
        
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
        
        if (Array.isArray(apiData)) {
          return { data: apiData, pagination: null };
        }
        
        return { data: [], pagination: null };
      } catch (error) {
        console.error('Failed to fetch customers:', error);
        return { data: [], pagination: null };
      }
    },
  });

  const customers = Array.isArray(customersResponse?.data) ? customersResponse.data : [];
  const pagination = customersResponse?.pagination;

  const createMutation = useMutation({
    mutationFn: customerApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success('Customer saved successfully');
      setIsDialogOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: any) => customerApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success('Customer updated successfully');
      setIsDialogOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: customerApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success('Customer deleted successfully');
    },
  });

  const handleOpenDialog = (customer?: any) => {
    if (customer) {
      setEditingCustomer(customer);
      setFormData(customer);
    } else {
      setEditingCustomer(null);
      setFormData({ name: '', phone: '', email: '', address: '', tax_number: '', credit_limit: '0', opening_balance: '0' });
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingCustomer) {
      updateMutation.mutate({ id: editingCustomer.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const columns: ColumnDef<any>[] = [
    {
      id: 'name',
      header: t('customers.name'),
      alwaysVisible: true,
      value: (c) => c.name,
      cell: (c) => (
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
            {c.name?.charAt(0)?.toUpperCase() || '?'}
          </span>
          <div className="min-w-0">
            <p className="truncate font-medium" dir="auto">{c.name}</p>
            {c.address && <p className="truncate text-xs text-muted-foreground" dir="auto">{c.address}</p>}
          </div>
        </div>
      ),
    },
    { id: 'phone', header: t('customers.phone'), value: (c) => c.phone, cell: (c) => <span className="tabular-nums text-muted-foreground" dir="ltr">{c.phone || '—'}</span> },
    { id: 'email', header: t('customers.email'), defaultHidden: true, value: (c) => c.email, cell: (c) => <span className="text-muted-foreground">{c.email || '—'}</span> },
    {
      id: 'balance',
      header: 'Balance',
      align: 'end',
      value: (c) => Number(c.balance || 0),
      cell: (c) => {
        const b = Number(c.balance || 0);
        return (
          <span className={`tabular-nums font-medium ${b > 0.009 ? 'text-red-600 dark:text-red-400' : b < -0.009 ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}`}>
            {formatCurrency(b)}
          </span>
        );
      },
    },
    { id: 'created_at', header: 'Added', defaultHidden: true, value: (c) => c.created_at, cell: (c) => <span className="text-muted-foreground">{formatDate(c.created_at)}</span> },
    {
      id: 'actions',
      header: '',
      alwaysVisible: true,
      sortable: false,
      align: 'end',
      cell: (c) => (
        <RowActions>
          <RowAction label="Statement" icon={FileText} onClick={() => navigate(`/customers/${c.id}/statement`)} />
          <RowAction label="Edit" icon={Edit} onClick={() => handleOpenDialog(c)} />
          <RowAction
            label="Delete"
            icon={Trash2}
            tone="danger"
            onClick={() => {
              if (confirm('Are you sure you want to delete this customer?')) deleteMutation.mutate(c.id);
            }}
          />
        </RowActions>
      ),
    },
  ];

  return (
    <Page>
      <PageHeader
        icon={Users}
        title={t('customers.title')}
        description="Your customers, their contact details and balances"
        actions={
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="me-1.5 h-4 w-4" />
            {t('customers.addCustomer')}
          </Button>
        }
      />

      <DataTable
        data={customers}
        columns={columns}
        rowKey={(c) => c.id}
        loading={isLoading}
        search={searchTerm}
        onSearchChange={(v) => {
          setSearchTerm(v);
          setPage(1);
        }}
        searchPlaceholder="Search name, phone, email…"
        sort={sort}
        onSortChange={(v) => {
          setSort(v);
          setPage(1);
        }}
        pagination={{ page, pageSize: perPage, total: pagination?.total || 0, onPageChange: setPage, onPageSizeChange: setPerPage }}
        onRowClick={(c) => navigate(`/customers/${c.id}`)}
        storageKey="customers"
        exportFileName="customers"
        emptyTitle="No customers found"
      />

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingCustomer ? t('customers.editCustomer') : t('customers.addCustomer')}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">{t('customers.name')} *</Label>
                <Input 
                  id="name" 
                  value={formData.name} 
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
                  required 
                  placeholder="Customer name"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">{t('customers.phone')}</Label>
                  <Input 
                    id="phone" 
                    value={formData.phone} 
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })} 
                    placeholder="Phone number"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">{t('customers.email')}</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    value={formData.email} 
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })} 
                    placeholder="Email"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">{t('customers.address')}</Label>
                <Input 
                  id="address" 
                  value={formData.address} 
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })} 
                  placeholder="Address"
                />
              </div>
              {!editingCustomer && (
                <div className="space-y-2">
                  <Label htmlFor="opening_balance">Opening Balance</Label>
                  <Input 
                    id="opening_balance" 
                    type="number"
                    step="0.01"
                    value={formData.opening_balance} 
                    onChange={(e) => setFormData({ ...formData, opening_balance: e.target.value })} 
                    placeholder="0.00"
                  />
                  <p className="text-xs text-muted-foreground">Positive = amount owed by customer</p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                {t('common.cancel')}
              </Button>
              <Button type="submit">{t('common.save')}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Page>
  );
}
