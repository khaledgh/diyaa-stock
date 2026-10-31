import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useNavigate, useLocation } from 'react-router-dom';
import { Eye, Plus, ShoppingCart, Package, Trash2, DollarSign, Edit2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { invoiceApi, customerApi, vendorApi, locationApi } from '@/lib/api';
import { ColumnDef, DataTable, DateRangeFilter, FilterSelect, SortState } from '@/components/data-table/DataTable';
import { Page, PageHeader, PaymentBadge, RowAction, RowActions, StatStrip, StatusBadge } from '@/components/layout/Page';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { toast } from 'sonner';
import PaymentAllocation from '@/components/PaymentAllocation';
import { Combobox } from '@/components/ui/combobox';

export default function InvoicesNew() {
  const navigate = useNavigate();
  const location = useLocation();

  // Determine invoice type from URL path
  const getInvoiceTypeFromPath = () => {
    if (location.pathname.includes('/invoices/purchase')) return 'purchase';
    return 'sales';
  };

  const [invoiceType, setInvoiceType] = useState<'purchase' | 'sales'>(getInvoiceTypeFromPath());
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [sort, setSort] = useState<SortState | null>({ id: 'date', dir: 'desc' });
  const [paymentStatus, setPaymentStatus] = useState('');
  const [docStatus, setDocStatus] = useState('');
  const [locationId, setLocationId] = useState('');
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [isAllocationDialogOpen, setIsAllocationDialogOpen] = useState(false);
  const [isCustomerSelectOpen, setIsCustomerSelectOpen] = useState(false);
  const [tempCustomerId, setTempCustomerId] = useState<string>('');
  const [allocationCustomer, setAllocationCustomer] = useState<{ id: number, name: string } | null>(null);

  const queryClient = useQueryClient();

  const { data: customers } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const response = await customerApi.getAll({ per_page: 1000 });
      const apiData = response.data.data || response.data;
      return Array.isArray(apiData) ? apiData : (apiData.data || []);
    },
    enabled: isCustomerSelectOpen && invoiceType === 'sales',
  });

  const { data: vendors } = useQuery({
    queryKey: ['vendors'],
    queryFn: async () => {
      const response = await vendorApi.getAll({ per_page: 1000 });
      const apiData = response.data.data || response.data;
      return Array.isArray(apiData) ? apiData : (apiData.data || []);
    },
    enabled: isCustomerSelectOpen && invoiceType === 'purchase',
  });

  const handleOpenAllocation = () => {
    setIsCustomerSelectOpen(true);
  };

  const handleConfirmCustomer = () => {
    if (!tempCustomerId) {
      toast.error(`Please select a ${invoiceType === 'sales' ? 'customer' : 'vendor'}`);
      return;
    }

    if (invoiceType === 'sales') {
      const customer = customers?.find((c: any) => c.id.toString() === tempCustomerId);
      if (customer) {
        setAllocationCustomer({ id: customer.id, name: customer.name });
        setIsCustomerSelectOpen(false);
        setIsAllocationDialogOpen(true);
      }
    } else {
      const vendor = vendors?.find((v: any) => v.id.toString() === tempCustomerId);
      if (vendor) {
        setAllocationCustomer({ id: vendor.id, name: vendor.company_name || vendor.name });
        setIsCustomerSelectOpen(false);
        setIsAllocationDialogOpen(true);
      }
    }
  };

  // Sync invoice type with URL when path changes
  useEffect(() => {
    const typeFromPath = getInvoiceTypeFromPath();
    if (typeFromPath !== invoiceType) {
      setInvoiceType(typeFromPath);
      setCurrentPage(1);
      setSearchQuery('');
      setSort({ id: 'date', dir: 'desc' });
      setPaymentStatus('');
      setDocStatus('');
      setLocationId('');
      setDateRange({ from: '', to: '' });
    }
  }, [location.pathname]);

  // Navigate to the correct URL when switching invoice type
  const handleInvoiceTypeChange = (type: 'purchase' | 'sales') => {
    navigate(`/invoices/${type}`);
  };

  const { data: invoicesData, isLoading } = useQuery({
    queryKey: ['invoices', invoiceType, searchQuery, currentPage, pageSize, sort, paymentStatus, docStatus, locationId, dateRange],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const response = await invoiceApi.getAll({
        invoice_type: invoiceType,
        search: searchQuery || undefined,
        limit: pageSize,
        offset: (currentPage - 1) * pageSize,
        sort_by: sort?.id,
        sort_dir: sort?.dir,
        payment_status: paymentStatus || undefined,
        status: docStatus || undefined,
        location_id: locationId || undefined,
        from_date: dateRange.from && dateRange.to ? dateRange.from : undefined,
        to_date: dateRange.from && dateRange.to ? dateRange.to : undefined,
      });
      const payload = response?.data;

      const defaultResult = { data: [], pagination: { total: 0, pages: 1, page: 1 } } as {
        data: any[];
        pagination: { total: number; pages: number; page: number };
      };

      if (!payload) return defaultResult;

      if (Array.isArray(payload)) {
        return {
          data: payload,
          pagination: { total: payload.length, pages: 1, page: 1 },
        };
      }

      if (payload.invoices) {
        const inv = payload.invoices;
        if (Array.isArray(inv)) {
          return { data: inv, pagination: { total: inv.length, pages: 1, page: 1 } };
        }
        const dataArr = Array.isArray(inv?.data) ? inv.data : [];
        const pag = inv?.pagination || { total: dataArr.length, pages: 1, page: 1 };
        return { data: dataArr, pagination: pag };
      }

      if (payload.data) {
        const maybeData = payload.data;
        if (Array.isArray(maybeData)) {
          return {
            data: maybeData,
            pagination: payload.pagination || { total: maybeData.length, pages: 1, page: 1 },
          };
        }
        const innerData = Array.isArray(maybeData?.data) ? maybeData.data : [];
        const pag = maybeData?.pagination || payload.pagination || { total: innerData.length, pages: 1, page: 1 };
        return { data: innerData, pagination: pag };
      }

      return defaultResult;
    },
  });

  const { data: invoiceStats } = useQuery({
    queryKey: ['invoice-stats'],
    queryFn: async () => {
      const response = await invoiceApi.getStats();
      return response.data.data;
    },
  });

  const { data: locations } = useQuery({
    queryKey: ['locations', 'filter'],
    queryFn: async () => {
      const response = await locationApi.getAll();
      const d = response.data.data || response.data;
      return Array.isArray(d) ? d : d?.data || [];
    },
  });

  const deleteInvoiceMutation = useMutation({
    mutationFn: (id: number) => invoiceApi.delete(id, invoiceType),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success(
        `${invoiceType === "purchase" ? "Purchase" : "Sales"
        } invoice deleted successfully`
      );
      setIsDeleteDialogOpen(false);
      setSelectedInvoice(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to delete invoice");
    },
  });

  const invoices = invoicesData?.data || [];
  const pagination = invoicesData?.pagination || { total: 0, pages: 1, page: 1 };

  const handleViewDetails = (invoiceId: number) => {
    // Navigate to appropriate detail page based on invoice type
    if (invoiceType === 'purchase') {
      navigate(`/invoices/purchase/${invoiceId}`);
    } else {
      navigate(`/invoices/sales/${invoiceId}`);
    }
  };

  const handleDeleteInvoice = (invoice: any) => {
    setSelectedInvoice(invoice);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteInvoice = () => {
    if (!selectedInvoice) return;
    deleteInvoiceMutation.mutate(selectedInvoice.id);
  };

  const isPurchase = invoiceType === 'purchase';
  const creditTotal = (inv: any) => (inv.credit_notes || []).reduce((sum: number, cn: any) => sum + (cn.total_amount || 0), 0);
  const partyName = (inv: any) => (isPurchase ? inv.vendor?.company_name || inv.vendor?.name : inv.customer?.name) || '';
  const openPayment = (invoice: any) => {
    const party = isPurchase ? invoice.vendor : invoice.customer;
    if (!party?.id) return;
    setAllocationCustomer({ id: party.id, name: isPurchase ? party.company_name || party.name : party.name });
    setIsAllocationDialogOpen(true);
  };
  const withReset = <T,>(fn: (v: T) => void) => (v: T) => {
    fn(v);
    setCurrentPage(1);
  };

  const columns: ColumnDef<any>[] = [
    {
      id: 'invoice_number',
      header: 'Invoice',
      alwaysVisible: true,
      value: (inv) => inv.invoice_number,
      cell: (inv) => (
        <div className="flex items-center gap-2">
          <span className="font-medium text-primary">{inv.invoice_number}</span>
          {inv.status === 'draft' && <StatusBadge tone="amber" dot={false}>Draft</StatusBadge>}
        </div>
      ),
    },
    {
      id: 'date',
      header: 'Date',
      value: (inv) => inv.invoice_date || inv.created_at,
      cell: (inv) => <span className="whitespace-nowrap text-muted-foreground">{formatDateTime(inv.invoice_date || inv.created_at)}</span>,
    },
    {
      id: isPurchase ? 'vendor' : 'customer',
      header: isPurchase ? 'Vendor' : 'Customer',
      value: partyName,
      cell: (inv) => <span className="block max-w-[220px] truncate font-medium" dir="auto">{partyName(inv) || '—'}</span>,
    },
    { id: 'location', header: 'Location', value: (inv) => inv.location?.name, cell: (inv) => <span className="text-muted-foreground">{inv.location?.name || '—'}</span> },
    { id: 'total', header: 'Total', align: 'end', value: (inv) => Number(inv.total_amount), cell: (inv) => <span className="tabular-nums font-semibold">{formatCurrency(inv.total_amount)}</span> },
    ...(isPurchase
      ? ([
          {
            id: 'credits',
            header: 'Returns',
            align: 'end',
            sortable: false,
            value: (inv: any) => creditTotal(inv),
            cell: (inv: any) => (creditTotal(inv) ? <span className="tabular-nums text-orange-600">−{formatCurrency(creditTotal(inv))}</span> : <span className="text-muted-foreground">—</span>),
          },
        ] as ColumnDef<any>[])
      : []),
    { id: 'paid', header: 'Paid', align: 'end', value: (inv) => Number(inv.paid_amount), cell: (inv) => <span className="tabular-nums">{formatCurrency(inv.paid_amount)}</span> },
    {
      id: 'balance',
      header: 'Balance',
      align: 'end',
      sortable: false,
      value: (inv) => Math.max(inv.total_amount - inv.paid_amount - creditTotal(inv), 0),
      cell: (inv) => {
        const due = Math.max(inv.total_amount - inv.paid_amount - creditTotal(inv), 0);
        return <span className={due > 0.009 ? 'tabular-nums font-medium text-red-600 dark:text-red-400' : 'tabular-nums text-muted-foreground'}>{formatCurrency(due)}</span>;
      },
    },
    { id: 'status', header: 'Payment', value: (inv) => inv.payment_status, cell: (inv) => <PaymentBadge status={inv.payment_status} /> },
    {
      id: 'actions',
      header: '',
      alwaysVisible: true,
      sortable: false,
      align: 'end',
      cell: (inv) => (
        <RowActions>
          <RowAction label="View" icon={Eye} onClick={() => handleViewDetails(inv.id)} />
          <RowAction label="Edit" icon={Edit2} onClick={() => navigate(`/invoices/${inv.id}/edit?type=${invoiceType}`)} />
          {inv.payment_status !== 'paid' && <RowAction label="Record payment" icon={DollarSign} tone="success" onClick={() => openPayment(inv)} />}
          <RowAction label="Delete" icon={Trash2} tone="danger" onClick={() => handleDeleteInvoice(inv)} />
        </RowActions>
      ),
    },
  ];

  const activeFilters = [paymentStatus, docStatus, locationId, dateRange.from || dateRange.to].filter(Boolean).length;

  return (
    <Page>
      <PageHeader
        icon={isPurchase ? Package : ShoppingCart}
        title={isPurchase ? 'Purchase Invoices' : 'Sales Invoices'}
        description={isPurchase ? 'Bills from vendors — they add stock to locations' : 'Invoices to customers — they reduce location stock'}
        actions={
          <>
            <Button variant="outline" onClick={handleOpenAllocation}>
              <DollarSign className="me-1.5 h-4 w-4" />
              {isPurchase ? 'Pay Vendor' : 'Record Payment'}
            </Button>
            <Button onClick={() => navigate(`/invoices/new?type=${invoiceType}`)}>
              <Plus className="me-1.5 h-4 w-4" />
              {isPurchase ? 'New Purchase' : 'New Sale'}
            </Button>
          </>
        }
      />

      <StatStrip
        items={[
          { label: 'Sales invoices', value: invoiceStats?.sales_count ?? '—', hint: 'To customers', active: !isPurchase, onClick: () => handleInvoiceTypeChange('sales') },
          { label: 'Purchase invoices', value: invoiceStats?.purchase_count ?? '—', hint: 'From vendors', active: isPurchase, onClick: () => handleInvoiceTypeChange('purchase') },
        ]}
      />

      <DataTable
        data={invoices}
        columns={columns}
        rowKey={(inv) => inv.id}
        loading={isLoading}
        search={searchQuery}
        onSearchChange={withReset(setSearchQuery)}
        searchPlaceholder={isPurchase ? 'Search invoice # or vendor…' : 'Search invoice #, customer, phone…'}
        sort={sort}
        onSortChange={withReset(setSort)}
        pagination={{ page: currentPage, pageSize, total: pagination.total || 0, onPageChange: setCurrentPage, onPageSizeChange: setPageSize }}
        onRowClick={(inv) => handleViewDetails(inv.id)}
        storageKey={`invoices-${invoiceType}`}
        exportFileName={`${invoiceType}-invoices`}
        emptyTitle="No invoices found"
        activeFilterCount={activeFilters}
        onResetFilters={() => {
          setPaymentStatus('');
          setDocStatus('');
          setLocationId('');
          setDateRange({ from: '', to: '' });
          setCurrentPage(1);
        }}
        filters={
          <>
            <FilterSelect
              label="Payment"
              value={paymentStatus}
              onChange={withReset(setPaymentStatus)}
              options={[
                { value: 'paid', label: 'Paid' },
                { value: 'partial', label: 'Partial' },
                { value: 'unpaid', label: 'Unpaid' },
                { value: 'unpaid,partial', label: 'Unpaid or partial' },
              ].filter((o) => !isPurchase || !o.value.includes(','))}
            />
            <FilterSelect
              label="Status"
              value={docStatus}
              onChange={withReset(setDocStatus)}
              options={[
                { value: 'finalized', label: 'Finalized' },
                { value: 'draft', label: 'Draft' },
              ]}
            />
            <FilterSelect
              label="Location"
              value={locationId}
              onChange={withReset(setLocationId)}
              options={(locations || []).map((l: any) => ({ value: String(l.id), label: l.name }))}
            />
            <DateRangeFilter from={dateRange.from} to={dateRange.to} onChange={withReset(setDateRange)} />
          </>
        }
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Delete</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete this {invoiceType} invoice?
            </p>
            {selectedInvoice && (
              <div className="mt-2 p-3 bg-muted rounded-md">
                <p className="font-medium">{selectedInvoice.invoice_number}</p>
                <p className="text-sm text-muted-foreground">
                  Total: {formatCurrency(selectedInvoice.total_amount)}
                </p>
                <p className="text-sm text-muted-foreground">
                  Status: {selectedInvoice.payment_status}
                </p>
              </div>
            )}
          </div>
          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsDeleteDialogOpen(false);
                setSelectedInvoice(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmDeleteInvoice}
              disabled={deleteInvoiceMutation.isPending}
              variant="destructive"
            >
              {deleteInvoiceMutation.isPending
                ? "Deleting..."
                : "Delete Invoice"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Entity Selection for Allocation */}
      <Dialog open={isCustomerSelectOpen} onOpenChange={setIsCustomerSelectOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Select {invoiceType === 'sales' ? 'Customer' : 'Vendor'} for Payment</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">{invoiceType === 'sales' ? 'Customer' : 'Vendor'}</label>
              <Combobox
                options={invoiceType === 'sales'
                  ? (customers || []).map((c: any) => ({ value: c.id.toString(), label: c.name }))
                  : (vendors || []).map((v: any) => ({ value: v.id.toString(), label: v.company_name || v.name }))
                }
                value={tempCustomerId}
                onChange={setTempCustomerId}
                placeholder={`Search ${invoiceType === 'sales' ? 'customer' : 'vendor'}...`}
              />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setIsCustomerSelectOpen(false)}>Cancel</Button>
            <Button onClick={handleConfirmCustomer} disabled={!tempCustomerId}>Next</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Payment Allocation Component */}
      {allocationCustomer && (
        <PaymentAllocation
          open={isAllocationDialogOpen}
          onClose={() => {
            setIsAllocationDialogOpen(false);
            setAllocationCustomer(null);
            setTempCustomerId('');
          }}
          entityId={allocationCustomer.id}
          entityName={allocationCustomer.name}
          type={invoiceType}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['invoices'] });
          }}
        />
      )}
    </Page>
  );
}
