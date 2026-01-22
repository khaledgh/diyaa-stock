import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Plus, FileText, CheckCircle, XCircle, Trash2, Eye, Search, Pencil, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pagination } from '@/components/ui/pagination';
import { creditNoteApi } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';

export default function CreditNotes() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedCreditNote, setSelectedCreditNote] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [perPage] = useState(20);

  // Fetch credit notes
  const { data: creditNotesResponse, isLoading } = useQuery({
    queryKey: ['credit-notes', searchTerm, statusFilter, page],
    queryFn: async () => {
      try {
        const response = await creditNoteApi.getAll({
          search: searchTerm,
          status: statusFilter,
          page,
          per_page: perPage,
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

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
            <FileText className="h-8 w-8 text-orange-600" />
            {t('creditNotes.title') || 'Credit Notes'}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage product returns and credit notes
          </p>
        </div>
        <Button onClick={handleOpenNew} className="w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" />
          {t('creditNotes.createCreditNote') || 'Create Credit Note'}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Credit Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-6 flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                placeholder={t('creditNotes.searchCreditNotes') || 'Search credit notes...'}
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
                className="pl-10"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="px-4 py-2 border rounded-md"
            >
              <option value="all">{t('common.all') || 'All'}</option>
              <option value="draft">{t('creditNotes.draft') || 'Draft'}</option>
              <option value="approved">{t('creditNotes.approved') || 'Approved'}</option>
              <option value="cancelled">{t('creditNotes.cancelled') || 'Cancelled'}</option>
            </select>
          </div>

          {isLoading ? (
            <div className="text-center py-20">
              <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-4" />
              <p className="text-muted-foreground">Loading credit notes...</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Credit Note #</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Entity</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {creditNotes.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                          No credit notes found
                        </TableCell>
                      </TableRow>
                    ) : (
                      creditNotes.map((cn: any) => (
                        <TableRow key={cn.id}>
                          <TableCell className="font-medium whitespace-nowrap">{cn.credit_note_number}</TableCell>
                          <TableCell className="whitespace-nowrap">{new Date(cn.credit_note_date).toLocaleDateString()}</TableCell>
                          <TableCell className="capitalize">{cn.type || 'purchase'}</TableCell>
                          <TableCell>
                            {cn.type === 'sales'
                              ? (cn.customer?.name || 'Walk-in')
                              : (cn.vendor?.company_name || cn.vendor?.name || '-')}
                          </TableCell>
                          <TableCell>{cn.location?.name || '-'}</TableCell>
                          <TableCell className="text-right font-bold">{formatCurrency(cn.total_amount || 0)}</TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${getStatusBadge(cn.status)}`}>
                              {cn.status}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button variant="ghost" size="icon" onClick={() => handleView(cn.id)}>
                                <Eye className="h-4 w-4" />
                              </Button>
                              {(cn.status === 'draft' || cn.status === 'approved') && (
                                <Button variant="ghost" size="icon" onClick={() => handleEdit(cn)}>
                                  <Pencil className="h-4 w-4 text-blue-600" />
                                </Button>
                              )}
                              {cn.status === 'draft' && (
                                <>
                                  <Button variant="ghost" size="icon" onClick={() => handleApprove(cn.id)}>
                                    <CheckCircle className="h-4 w-4 text-green-600" />
                                  </Button>
                                  <Button variant="ghost" size="icon" onClick={() => handleCancel(cn.id)}>
                                    <XCircle className="h-4 w-4 text-red-600" />
                                  </Button>
                                  <Button variant="ghost" size="icon" onClick={() => handleDelete(cn.id)}>
                                    <Trash2 className="h-4 w-4 text-red-600" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {pagination && pagination.total_pages > 1 && (
                <Pagination
                  currentPage={pagination.current_page}
                  totalPages={pagination.total_pages}
                  onPageChange={setPage}
                  totalItems={pagination.total}
                  itemsPerPage={pagination.per_page}
                />
              )}
            </>
          )}
        </CardContent>
      </Card>

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
    </div>
  );
}
