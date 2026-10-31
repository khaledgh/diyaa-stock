import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Plus, FileText, CheckCircle, XCircle, Trash2, Eye, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { creditNoteApi } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { ColumnDef, DataTable, FilterSelect, SortState } from '@/components/data-table/DataTable';
import { Page, PageHeader, RowAction, RowActions, StatusBadge } from '@/components/layout/Page';

export default function CreditNotes() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedCreditNote, setSelectedCreditNote] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);
  const [sort, setSort] = useState<SortState | null>({ id: 'credit_note_date', dir: 'desc' });

  // Fetch credit notes
  const { data: creditNotesResponse, isLoading } = useQuery({
    queryKey: ['credit-notes', searchTerm, statusFilter, page, perPage, sort],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      try {
        const response = await creditNoteApi.getAll({
          search: searchTerm,
          status: statusFilter,
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
              total_pages: apiData.total_pages,
            },
          };
        }

        if (Array.isArray(apiData)) {
          return { data: apiData, pagination: null };
        }

        return { data: [], pagination: null };
      } catch (error) {
        console.error('Failed to fetch credit notes:', error);
        return { data: [], pagination: null };
      }
    },
  });

  const creditNotes = Array.isArray(creditNotesResponse?.data) ? creditNotesResponse.data : [];
  const pagination = creditNotesResponse?.pagination;

  const approveMutation = useMutation({
    mutationFn: (id: number) => creditNoteApi.approve(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credit-notes'] });
      toast.success(t('creditNotes.creditNoteApproved') || 'Credit note approved');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to approve credit note');
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (id: number) => creditNoteApi.cancel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credit-notes'] });
      toast.success(t('creditNotes.creditNoteCancelled') || 'Credit note cancelled');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to cancel credit note');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => creditNoteApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credit-notes'] });
      toast.success(t('creditNotes.deleteSuccess') || 'Credit note deleted');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete credit note');
    },
  });

  const handleOpenNew = () => {
    navigate('/credit-notes/new');
  };

  const handleEdit = (cn: any) => {
    navigate(`/credit-notes/edit/${cn.id}`);
  };

  const handleView = async (id: number) => {
    try {
      const response = await creditNoteApi.getById(id);
      setSelectedCreditNote(response.data.data || response.data);
      setIsViewDialogOpen(true);
    } catch (error) {
      toast.error('Failed to load credit note details');
    }
  };

  const handleApprove = (id: number) => {
    if (confirm(t('creditNotes.confirmApprove') || 'Are you sure you want to approve this credit note?')) {
      approveMutation.mutate(id);
    }
  };

  const handleCancel = (id: number) => {
    if (confirm(t('creditNotes.confirmCancel') || 'Are you sure you want to cancel this credit note?')) {
      cancelMutation.mutate(id);
    }
  };

  const handleDelete = (id: number) => {
    if (confirm(t('creditNotes.confirmDelete') || 'Are you sure you want to delete this credit note?')) {
      deleteMutation.mutate(id);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: any = {
      draft: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
      approved: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      cancelled: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    };
    return badges[status] || badges.draft;
  };

  const statusTone: Record<string, 'gray' | 'green' | 'red'> = { draft: 'gray', approved: 'green', cancelled: 'red' };
  const resetPage = <T,>(fn: (v: T) => void) => (v: T) => {
    fn(v);
    setPage(1);
  };

  const columns: ColumnDef<any>[] = [
    { id: 'credit_note_number', header: 'Credit note', alwaysVisible: true, value: (cn) => cn.credit_note_number, cell: (cn) => <span className="font-medium text-primary">{cn.credit_note_number}</span> },
    { id: 'credit_note_date', header: 'Date', value: (cn) => cn.credit_note_date, cell: (cn) => <span className="whitespace-nowrap text-muted-foreground">{formatDate(cn.credit_note_date)}</span> },
    {
      id: 'type',
      header: 'Type',
      value: (cn) => cn.type || 'purchase',
      cell: (cn) => (cn.type === 'sales' ? <StatusBadge tone="green" dot={false}>Sales return</StatusBadge> : <StatusBadge tone="blue" dot={false}>Purchase return</StatusBadge>),
    },
    {
      id: 'entity',
      header: 'Customer / Vendor',
      sortable: false,
      value: (cn) => (cn.type === 'sales' ? cn.customer?.name || 'Walk-in' : cn.vendor?.company_name || cn.vendor?.name),
      cell: (cn) => (
        <span className="block max-w-[220px] truncate" dir="auto">
          {cn.type === 'sales' ? cn.customer?.name || 'Walk-in' : cn.vendor?.company_name || cn.vendor?.name || '—'}
        </span>
      ),
    },
    { id: 'location', header: 'Location', sortable: false, value: (cn) => cn.location?.name, cell: (cn) => <span className="text-muted-foreground">{cn.location?.name || '—'}</span> },
    { id: 'total_amount', header: 'Amount', align: 'end', value: (cn) => Number(cn.total_amount || 0), cell: (cn) => <span className="tabular-nums font-semibold">{formatCurrency(cn.total_amount || 0)}</span> },
    { id: 'status', header: 'Status', value: (cn) => cn.status, cell: (cn) => <StatusBadge tone={statusTone[cn.status] || 'gray'}>{cn.status}</StatusBadge> },
    {
      id: 'actions',
      header: '',
      alwaysVisible: true,
      sortable: false,
      align: 'end',
      cell: (cn) => (
        <RowActions>
          <RowAction label="View" icon={Eye} onClick={() => handleView(cn.id)} />
          {(cn.status === 'draft' || cn.status === 'approved') && <RowAction label="Edit" icon={Pencil} onClick={() => handleEdit(cn)} />}
          {cn.status === 'draft' && <RowAction label="Approve" icon={CheckCircle} tone="success" onClick={() => handleApprove(cn.id)} />}
          {cn.status === 'draft' && <RowAction label="Cancel" icon={XCircle} tone="danger" onClick={() => handleCancel(cn.id)} />}
          {(cn.status === 'draft' || cn.status === 'approved') && <RowAction label="Delete" icon={Trash2} tone="danger" onClick={() => handleDelete(cn.id)} />}
        </RowActions>
      ),
    },
  ];

  return (
    <Page>
      <PageHeader
        icon={FileText}
        title={t('creditNotes.title') || 'Credit Notes'}
        description="Returns from customers and to vendors"
        actions={
          <Button onClick={handleOpenNew}>
            <Plus className="me-1.5 h-4 w-4" />
            {t('creditNotes.createCreditNote') || 'Create Credit Note'}
          </Button>
        }
      />

      <DataTable
        data={creditNotes}
        columns={columns}
        rowKey={(cn) => cn.id}
        loading={isLoading}
        search={searchTerm}
        onSearchChange={resetPage(setSearchTerm)}
        searchPlaceholder={t('creditNotes.searchCreditNotes') || 'Search credit notes…'}
        sort={sort}
        onSortChange={resetPage(setSort)}
        pagination={{ page, pageSize: perPage, total: pagination?.total || 0, onPageChange: setPage, onPageSizeChange: setPerPage }}
        onRowClick={(cn) => handleView(cn.id)}
        storageKey="credit-notes"
        exportFileName="credit-notes"
        emptyTitle="No credit notes found"
        activeFilterCount={statusFilter !== 'all' ? 1 : 0}
        onResetFilters={() => resetPage(setStatusFilter)('all')}
        filters={
          <FilterSelect
            label="Status"
            value={statusFilter === 'all' ? '' : statusFilter}
            onChange={(v) => resetPage(setStatusFilter)(v || 'all')}
            options={[
              { value: 'draft', label: t('creditNotes.draft') || 'Draft' },
              { value: 'approved', label: t('creditNotes.approved') || 'Approved' },
              { value: 'cancelled', label: t('creditNotes.cancelled') || 'Cancelled' },
            ]}
          />
        }
      />

      {/* View Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Credit Note Details</DialogTitle>
          </DialogHeader>
          {selectedCreditNote && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground uppercase text-[10px]">Number</Label>
                  <p className="font-bold text-lg">{selectedCreditNote.credit_note_number}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground uppercase text-[10px]">Date</Label>
                  <p>{new Date(selectedCreditNote.credit_note_date).toLocaleDateString()}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground uppercase text-[10px]">Type</Label>
                  <p className="capitalize font-medium">{selectedCreditNote.type || 'purchase'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground uppercase text-[10px]">Status</Label>
                  <div>
                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${getStatusBadge(selectedCreditNote.status)}`}>
                      {selectedCreditNote.status}
                    </span>
                  </div>
                </div>
                {(selectedCreditNote.purchase_invoice || selectedCreditNote.sales_invoice) && (
                  <div className="col-span-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <Label className="text-blue-600 uppercase text-[10px] font-bold">Related Invoice</Label>
                    <p className="font-bold text-blue-700 dark:text-blue-300">
                      {selectedCreditNote.type === 'sales'
                        ? selectedCreditNote.sales_invoice?.invoice_number
                        : selectedCreditNote.purchase_invoice?.invoice_number}
                    </p>
                  </div>
                )}
                <div>
                  <Label className="text-muted-foreground uppercase text-[10px]">{selectedCreditNote.type === 'sales' ? 'Customer' : 'Vendor'}</Label>
                  <p className="font-medium">
                    {selectedCreditNote.type === 'sales'
                      ? (selectedCreditNote.customer?.name || 'Walk-in')
                      : (selectedCreditNote.vendor?.company_name || selectedCreditNote.vendor?.name || '-')}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground uppercase text-[10px]">Location</Label>
                  <p>{selectedCreditNote.location?.name}</p>
                </div>
              </div>

              {selectedCreditNote.notes && (
                <div className="p-3 bg-muted rounded-lg">
                  <Label className="text-muted-foreground uppercase text-[10px]">Notes</Label>
                  <p className="text-sm mt-1 italic">"{selectedCreditNote.notes}"</p>
                </div>
              )}

              <div>
                <Label className="text-muted-foreground uppercase text-[10px] mb-2 block">Items</Label>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead className="text-right">Quantity</TableHead>
                        <TableHead className="text-right">Unit Price</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedCreditNote.items?.map((item: any) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <span className="font-medium text-sm">{item.product?.name_en || item.product?.name || item.product?.name_ar || 'Unknown Product'}</span>
                          </TableCell>
                          <TableCell className="text-right">{Number(item.quantity).toFixed(2)}</TableCell>
                          <TableCell className="text-right font-mono text-xs">{formatCurrency(item.unit_price || 0)}</TableCell>
                          <TableCell className="text-right font-bold text-blue-600">{formatCurrency(item.total || 0)}</TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-muted/30 font-bold">
                        <TableCell colSpan={3} className="text-right uppercase text-xs">Grand Total</TableCell>
                        <TableCell className="text-right text-lg text-primary">{formatCurrency(selectedCreditNote.total_amount || 0)}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="mt-6">
            <Button onClick={() => setIsViewDialogOpen(false)} variant="secondary">Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Page>
  );
}
