import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';
import { FileText, Eye, Plus, Search, ChevronLeft, ChevronRight, ShoppingCart, Package, Trash2, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { invoiceApi, customerApi } from '@/lib/api';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { toast } from 'sonner';
import PaymentAllocation from '@/components/PaymentAllocation';
import { Combobox } from '@/components/ui/combobox';

export default function InvoicesNew() {
  const { t } = useTranslation();
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
  const [pageSize] = useState(10);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [isAllocationDialogOpen, setIsAllocationDialogOpen] = useState(false);
  const [isCustomerSelectOpen, setIsCustomerSelectOpen] = useState(false);
  const [tempCustomerId, setTempCustomerId] = useState<string>('');
  const [allocationCustomer, setAllocationCustomer] = useState<{id: number, name: string} | null>(null);

  const queryClient = useQueryClient();

  const { data: customers } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const response = await customerApi.getAll({ per_page: 1000 });
      const apiData = response.data.data || response.data;
      return Array.isArray(apiData) ? apiData : (apiData.data || []);
    },
    enabled: isCustomerSelectOpen,
  });

  const handleOpenAllocation = () => {
    setIsCustomerSelectOpen(true);
  };

  const handleConfirmCustomer = () => {
    if (!tempCustomerId) {
      toast.error('Please select a customer');
      return;
    }
    const customer = customers?.find((c: any) => c.id.toString() === tempCustomerId);
    if (customer) {
      setAllocationCustomer({ id: customer.id, name: customer.name });
      setIsCustomerSelectOpen(false);
      setIsAllocationDialogOpen(true);
    }
  };

  // Sync invoice type with URL when path changes
  useEffect(() => {
    const typeFromPath = getInvoiceTypeFromPath();
    if (typeFromPath !== invoiceType) {
      setInvoiceType(typeFromPath);
      setCurrentPage(1);
      setSearchQuery('');
    }
  }, [location.pathname]);

  // Navigate to the correct URL when switching invoice type
  const handleInvoiceTypeChange = (type: 'purchase' | 'sales') => {
    navigate(`/invoices/${type}`);
  };

  const { data: invoicesData, isLoading } = useQuery({
    queryKey: ['invoices', invoiceType, searchQuery, currentPage, pageSize],
    queryFn: async () => {
      const response = await invoiceApi.getAll({ 
        invoice_type: invoiceType,
        search: searchQuery || undefined,
        limit: pageSize,
        offset: (currentPage - 1) * pageSize
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

  const deleteInvoiceMutation = useMutation({
    mutationFn: (id: number) => invoiceApi.delete(id, invoiceType),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success(
        `${
          invoiceType === "purchase" ? "Purchase" : "Sales"
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

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">{t('invoices.title') || 'Invoices'}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {invoiceType === 'purchase' 
              ? 'Purchase invoices add stock to locations' 
              : 'Sales invoices reduce location stock'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {invoiceType === 'sales' && (
            <Button 
              variant="outline" 
              onClick={handleOpenAllocation} 
              size="lg"
              className="bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
            >
              <DollarSign className="mr-2 h-5 w-5" />
              Payment Allocation
            </Button>
          )}
          <Button onClick={() => navigate(`/invoices/new?type=${invoiceType}`)} size="lg" className="shadow-lg">
            <Plus className="mr-2 h-5 w-5" />
            {invoiceType === 'purchase' ? 'New Purchase' : 'New Sale'}
          </Button>
        </div>
      </div>

      {/* Invoice Type Cards */}
      <div className="grid grid-cols-2 gap-4">
        <Card 
          className={`cursor-pointer transition-all ${invoiceType === 'purchase' ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-950' : 'hover:bg-muted'}`}
          onClick={() => handleInvoiceTypeChange('purchase')}
        >
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Package className="h-5 w-5 text-blue-600" />
                  <h3 className="text-lg font-semibold">Purchase</h3>
                </div>
                <p className="text-sm text-muted-foreground">From suppliers</p>
              </div>
              <div className="text-3xl font-bold text-blue-600">
                {invoiceStats?.purchase_count || 0}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className={`cursor-pointer transition-all ${invoiceType === 'sales' ? 'ring-2 ring-green-500 bg-green-50 dark:bg-green-950' : 'hover:bg-muted'}`}
          onClick={() => handleInvoiceTypeChange('sales')}
        >
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <ShoppingCart className="h-5 w-5 text-green-600" />
                  <h3 className="text-lg font-semibold">Sales</h3>
                </div>
                <p className="text-sm text-muted-foreground">To customers</p>
              </div>
              <div className="text-3xl font-bold text-green-600">
                {invoiceStats?.sales_count || 0}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Invoices Table */}
      <Card>
        <CardContent className="pt-6">
          <div className="mb-4 flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search invoices..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-10"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-8">{t('common.loading') || 'Loading...'}</div>
          ) : (
            <>
              <div className="overflow-x-auto -mx-4 sm:mx-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice #</TableHead>
                      <TableHead className="hidden md:table-cell">Date</TableHead>
                      <TableHead className="hidden lg:table-cell">
                        {invoiceType === 'purchase' ? 'Vendor' : 'Customer'}
                      </TableHead>
                      <TableHead className="hidden xl:table-cell">Location</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      {invoiceType === 'purchase' && (
                        <TableHead className="hidden md:table-cell text-right text-orange-600">Credit Notes</TableHead>
                      )}
                      {invoiceType === 'purchase' && (
                        <TableHead className="hidden lg:table-cell text-right">Net Amount</TableHead>
                      )}
                      <TableHead className="hidden sm:table-cell text-right">Paid</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={invoiceType === 'purchase' ? 10 : 8} className="text-center py-8 text-muted-foreground">
                          No invoices found
                        </TableCell>
                      </TableRow>
                    ) : (
                      invoices?.map((invoice: any) => (
                        <TableRow key={invoice.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4" />
                              {invoice.invoice_number}
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            {formatDateTime(invoice.invoice_date || invoice.created_at)}
                          </TableCell>
                          <TableCell className="hidden lg:table-cell">
                            {invoiceType === 'purchase' 
                              ? (invoice.vendor?.company_name || invoice.vendor?.name || '-')
                              : (invoice.customer?.name || '-')}
                          </TableCell>
                          <TableCell className="hidden xl:table-cell">
                            {invoice.location?.name || '-'}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(invoice.total_amount)}
                          </TableCell>
                          {invoiceType === 'purchase' && (
                            <TableCell className="hidden md:table-cell text-right text-orange-600">
                              {invoice.credit_notes && invoice.credit_notes.length > 0
                                ? `-${formatCurrency(invoice.credit_notes.reduce((sum: number, cn: any) => sum + (cn.total_amount || 0), 0))}`
                                : '-'}
                            </TableCell>
                          )}
                          {invoiceType === 'purchase' && (
                            <TableCell className="hidden lg:table-cell text-right font-medium">
                              {formatCurrency(
                                invoice.total_amount - 
                                (invoice.credit_notes?.reduce((sum: number, cn: any) => sum + (cn.total_amount || 0), 0) || 0)
                              )}
                            </TableCell>
                          )}
                          <TableCell className="hidden sm:table-cell text-right">
                            {formatCurrency(invoice.paid_amount)}
                          </TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              invoice.payment_status === 'paid' 
                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                : invoice.payment_status === 'partial'
                                ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                                : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                            }`}>
                              {invoice.payment_status}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleViewDetails(invoice.id)}
                                title="View Details"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              {invoice.payment_status !== 'paid' && invoiceType === 'sales' && invoice.customer?.id && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setAllocationCustomer({ 
                                      id: invoice.customer.id, 
                                      name: invoice.customer.name 
                                    });
                                    setIsAllocationDialogOpen(true);
                                  }}
                                  className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                  title="Record Payment"
                                >
                                  <DollarSign className="h-4 w-4" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteInvoice(invoice)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                title="Delete"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {pagination.pages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <div className="text-sm text-muted-foreground">
                    Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, pagination.total)} of {pagination.total} results
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <div className="text-sm">
                      Page {currentPage} of {pagination.pages}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.min(pagination.pages, p + 1))}
                      disabled={currentPage === pagination.pages}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

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

      {/* Customer Selection for Allocation */}
      <Dialog open={isCustomerSelectOpen} onOpenChange={setIsCustomerSelectOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Select Customer for Payment</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Customer</label>
              <Combobox
                options={(customers || []).map((c: any) => ({ value: c.id.toString(), label: c.name }))}
                value={tempCustomerId}
                onChange={setTempCustomerId}
                placeholder="Search customer..."
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
          customerId={allocationCustomer.id}
          customerName={allocationCustomer.name}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['invoices'] });
          }}
        />
      )}
    </div>
  );
}
