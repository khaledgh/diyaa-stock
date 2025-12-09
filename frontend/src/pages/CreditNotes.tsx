import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Plus, FileText, CheckCircle, XCircle, Trash2, Eye, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pagination } from '@/components/ui/pagination';
import { Combobox } from '@/components/ui/combobox';
import { creditNoteApi, vendorApi, locationApi, productApi, api, invoiceApi } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';

interface CreditNoteItem {
  product_id: number;
  quantity: number;
  unit_price: number;
  reason: string;
}

export default function CreditNotes() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedCreditNote, setSelectedCreditNote] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [perPage] = useState(20);

  const [formData, setFormData] = useState({
    vendor_id: '',
    location_id: '',
    credit_note_date: new Date().toISOString().split('T')[0],
    purchase_invoice_id: '',
    notes: '',
    items: [] as CreditNoteItem[],
  });

  // State for invoice search
  const [invoiceSearchTerm, setInvoiceSearchTerm] = useState('');

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

  // Fetch vendors
  const { data: vendorsData } = useQuery({
    queryKey: ['vendors'],
    queryFn: async () => {
      const response = await vendorApi.getAll();
      return response.data.data || response.data || [];
    },
  });

  // Fetch locations
  const { data: locationsData } = useQuery({
    queryKey: ['locations'],
    queryFn: async () => {
      const response = await locationApi.getAll();
      return response.data.data || response.data || [];
    },
  });

  // Fetch purchase invoices for credit note selection with server-side search
  const { data: purchaseInvoicesData, isLoading: isLoadingInvoices } = useQuery({
    queryKey: ['purchase-invoices-search', invoiceSearchTerm],
    queryFn: async () => {
      const response = await invoiceApi.getAll({ 
        invoice_type: 'purchase',
        search: invoiceSearchTerm || undefined,
        limit: 50
      });
      return response.data.data.data || response.data.data || response.data || [];
    },
    enabled: isDialogOpen, // Only fetch when dialog is open
  });

  // Fetch products
  const { data: productsData } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      try {
        const response = await productApi.getAll();
        console.log('Products API Response:', response.data);
        
        // Try different response structures
        if (response.data?.data?.data && Array.isArray(response.data.data.data)) {
          return response.data.data.data;
        }
        if (response.data?.data && Array.isArray(response.data.data)) {
          return response.data.data;
        }
        if (Array.isArray(response.data)) {
          return response.data;
        }
        
        console.log('Products: Unknown format, returning empty array');
        return [];
      } catch (error) {
        console.error('Failed to fetch products:', error);
        return [];
      }
    },
  });

  // Fetch location stock when location is selected
  const { data: locationStockData } = useQuery({
    queryKey: ['location-stock', formData.location_id],
    queryFn: async () => {
      if (!formData.location_id) return [];
      try {
        const response = await api.get(`/locations/${formData.location_id}/stock`);
        console.log('Location stock:', response.data);
        return response.data.data || response.data || [];
      } catch (error) {
        console.error('Failed to fetch location stock:', error);
        return [];
      }
    },
    enabled: !!formData.location_id && isDialogOpen,
  });

  const vendors = Array.isArray(vendorsData) ? vendorsData : [];
  const locations = Array.isArray(locationsData) ? locationsData : [];
  const products = Array.isArray(productsData) ? productsData : [];
  const locationStock = Array.isArray(locationStockData) ? locationStockData : [];
  const purchaseInvoices = Array.isArray(purchaseInvoicesData) ? purchaseInvoicesData : [];

  console.log('Products loaded:', products.length, products);
  console.log('Location stock:', locationStock.length, locationStock);

  const vendorOptions = vendors.map((v: any) => ({ 
    value: v.id?.toString() || '', 
    label: v.company_name || v.name || 'Unknown Vendor' 
  }));
  const locationOptions = locations.map((l: any) => ({ 
    value: l.id?.toString() || '', 
    label: l.name || l.name_en || l.name_ar || 'Unknown Location' 
  }));
  
  const purchaseInvoiceOptions = purchaseInvoices.map((p: any) => ({
    value: p.id?.toString() || '',
    label: `${p.invoice_number} - ${p.vendor?.company_name || p.vendor?.name || 'Unknown Vendor'} (${formatCurrency(p.total_amount || 0)})`
  }));
  
  // Filter products to only show those with stock in selected location
  const availableProducts = formData.location_id 
    ? products.filter((p: any) => {
        const stockItem = locationStock.find((s: any) => s.product_id === p.id);
        return stockItem && stockItem.quantity > 0;
      })
    : products;

  const productOptions = availableProducts.map((p: any) => {
    const stockItem = locationStock.find((s: any) => s.product_id === p.id);
    const quantity = stockItem?.quantity || 0;
    
    return {
      value: p.id?.toString() || '', 
      label: `${p.name_en || p.name || p.name_ar || 'Unknown Product'} (Stock: ${quantity})`
    };
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: creditNoteApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credit-notes'] });
      toast.success(t('creditNotes.creditNoteCreated'));
      handleCloseDialog();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create credit note');
    },
  });

  const approveMutation = useMutation({
    mutationFn: (id: number) => creditNoteApi.approve(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credit-notes'] });
      toast.success(t('creditNotes.creditNoteApproved'));
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to approve credit note');
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (id: number) => creditNoteApi.cancel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credit-notes'] });
      toast.success(t('creditNotes.creditNoteCancelled'));
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to cancel credit note');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => creditNoteApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credit-notes'] });
      toast.success(t('creditNotes.deleteSuccess'));
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete credit note');
    },
  });

  const handleOpenDialog = () => {
    setFormData({
      vendor_id: '',
      location_id: '',
      credit_note_date: new Date().toISOString().split('T')[0],
      purchase_invoice_id: '',
      notes: '',
      items: [],
    });
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setInvoiceSearchTerm(''); // Reset search when closing dialog
  };

  const handlePurchaseInvoiceChange = async (purchaseInvoiceId: string) => {
    setFormData({ 
      ...formData, 
      purchase_invoice_id: purchaseInvoiceId,
      vendor_id: '',
      location_id: '',
      items: []
    });

    if (!purchaseInvoiceId) return;

    try {
      // Fetch full purchase invoice details
      const response = await invoiceApi.getById(parseInt(purchaseInvoiceId), 'purchase');
      const invoice = response.data.data || response.data;
      
      if (invoice) {
        // Check for existing approved credit notes for this invoice
        try {
          const creditNotesResponse = await creditNoteApi.getAll({
            search: '',
            status: 'approved',
            page: 1,
            per_page: 100
          });
          
          const existingCreditNotes = creditNotesResponse.data?.data || creditNotesResponse.data || [];
          const invoiceCreditNotes = existingCreditNotes.filter((cn: any) => 
            cn.purchase_invoice_id === parseInt(purchaseInvoiceId)
          );
          
          if (invoiceCreditNotes.length > 0) {
            toast.info(`Info: ${invoiceCreditNotes.length} approved credit note(s) already exist. You can create additional credit notes for remaining quantities.`);
          }
        } catch (creditCheckError) {
          console.warn('Could not check existing credit notes:', creditCheckError);
        }

        // Auto-populate vendor and location
        setFormData(prev => ({
          ...prev,
          vendor_id: invoice.vendor_id?.toString() || '',
          location_id: invoice.location_id?.toString() || '',
          items: invoice.items?.map((item: any) => ({
            product_id: item.product_id,
            quantity: item.quantity,
            unit_price: item.unit_price,
            reason: 'Return from purchase invoice'
          })) || []
        }));
      }
    } catch (error) {
      console.error('Failed to fetch purchase invoice details:', error);
      toast.error('Failed to load purchase invoice details');
    }
  };

  const handleAddItem = () => {
    setFormData({
      ...formData,
      items: [
        ...formData.items,
        { product_id: 0, quantity: 1, unit_price: 0, reason: '' },
      ],
    });
  };

  const handleRemoveItem = (index: number) => {
    const newItems = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: newItems });
  };

  const handleItemChange = async (index: number, field: keyof CreditNoteItem, value: any) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    
    // Auto-fill unit price when product is selected
    if (field === 'product_id' && value) {
      const product = products.find((p: any) => p.id === parseInt(value));
      if (product) {
        // Use cost_price (purchase price) if available, otherwise use unit_price
        const price = product.cost_price || product.unit_price || 0;
        newItems[index].unit_price = price;
      }

      // Validate quantity against invoice limits if purchase invoice is selected
      if (formData.purchase_invoice_id && newItems[index].quantity > 0) {
        await validateItemQuantity(parseInt(value), newItems[index].quantity, index);
      }
    }
    
    // Validate quantity when it changes
    if (field === 'quantity' && value > 0 && newItems[index].product_id > 0) {
      if (formData.purchase_invoice_id) {
        await validateItemQuantity(newItems[index].product_id, value, index);
      }
    }
    
    setFormData({ ...formData, items: newItems });
  };

  const validateItemQuantity = async (productId: number, quantity: number, itemIndex: number) => {
    if (!formData.purchase_invoice_id) return;

    try {
      // Get existing approved credit notes for this invoice
      const creditNotesResponse = await creditNoteApi.getAll({
        search: '',
        status: 'approved',
        page: 1,
        per_page: 100
      });
      
      const existingCreditNotes = creditNotesResponse.data?.data || creditNotesResponse.data || [];
      const invoiceCreditNotes = existingCreditNotes.filter((cn: any) => 
        cn.purchase_invoice_id === parseInt(formData.purchase_invoice_id)
      );

      // Calculate already credited quantity for this product
      let alreadyCredited = 0;
      for (const cn of invoiceCreditNotes) {
        for (const item of cn.items || []) {
          if (item.product_id === productId) {
            alreadyCredited += item.quantity;
          }
        }
      }

      // Add current item quantity (excluding the item being edited)
      for (let i = 0; i < formData.items.length; i++) {
        if (i !== itemIndex && formData.items[i].product_id === productId) {
          alreadyCredited += formData.items[i].quantity;
        }
      }

      // Get original invoice to check the maximum quantity
      const invoiceResponse = await invoiceApi.getById(parseInt(formData.purchase_invoice_id), 'purchase');
      const invoice = invoiceResponse.data.data || invoiceResponse.data;
      
      if (invoice && invoice.items) {
        const invoiceItem = invoice.items.find((item: any) => item.product_id === productId);
        if (invoiceItem) {
          const maxQuantity = invoiceItem.quantity;
          const totalRequested = alreadyCredited + quantity;
          
          if (totalRequested > maxQuantity) {
            toast.error(`Quantity limit exceeded for this product. Invoice quantity: ${maxQuantity}, Already credited: ${alreadyCredited}, Requested: ${quantity}`);
            return false;
          }
        }
      }
    } catch (error) {
      console.warn('Could not validate quantity:', error);
    }
    
    return true;
  };

  const handleSubmit = () => {
    if (!formData.location_id || formData.items.length === 0) {
      toast.error('Please fill all required fields and add at least one item');
      return;
    }

    // Convert date to ISO format with time
    const dateWithTime = `${formData.credit_note_date}T00:00:00Z`;

    const data = {
      vendor_id: formData.vendor_id ? parseInt(formData.vendor_id) : null,
      location_id: parseInt(formData.location_id),
      credit_note_date: dateWithTime,
      purchase_invoice_id: formData.purchase_invoice_id ? parseInt(formData.purchase_invoice_id) : null,
      notes: formData.notes,
      items: formData.items.map(item => ({
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: parseFloat(item.unit_price.toString()),
        reason: item.reason,
      })),
    };

    createMutation.mutate(data);
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
    if (confirm(t('common.confirmDelete'))) {
      approveMutation.mutate(id);
    }
  };

  const handleCancel = (id: number) => {
    if (confirm(t('common.confirmDelete'))) {
      cancelMutation.mutate(id);
    }
  };

  const handleDelete = (id: number) => {
    if (confirm(t('creditNotes.confirmDelete'))) {
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

  const totalAmount = formData.items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
            <FileText className="h-8 w-8 text-orange-600" />
            {t('creditNotes.title')}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage product returns and credit notes
          </p>
        </div>
        <Button onClick={handleOpenDialog} className="w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" />
          {t('creditNotes.createCreditNote')}
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
                placeholder={t('creditNotes.searchCreditNotes')}
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
              <option value="all">{t('common.all')}</option>
              <option value="draft">{t('creditNotes.draft')}</option>
              <option value="approved">{t('creditNotes.approved')}</option>
              <option value="cancelled">{t('creditNotes.cancelled')}</option>
            </select>
          </div>

          {isLoading ? (
            <div className="text-center py-8">Loading...</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Credit Note #</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Vendor</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {creditNotes.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                          No credit notes found
                        </TableCell>
                      </TableRow>
                    ) : (
                      creditNotes.map((cn: any) => (
                        <TableRow key={cn.id}>
                          <TableCell className="font-medium">{cn.credit_note_number}</TableCell>
                          <TableCell>{new Date(cn.credit_note_date).toLocaleDateString()}</TableCell>
                          <TableCell>{cn.vendor?.company_name || cn.vendor?.name || '-'}</TableCell>
                          <TableCell>{cn.location?.name || '-'}</TableCell>
                          <TableCell className="text-right">{formatCurrency(cn.total_amount || 0)}</TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(cn.status)}`}>
                              {cn.status}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button variant="ghost" size="sm" onClick={() => handleView(cn.id)}>
                                <Eye className="h-4 w-4" />
                              </Button>
                              {cn.status === 'draft' && (
                                <>
                                  <Button variant="ghost" size="sm" onClick={() => handleApprove(cn.id)}>
                                    <CheckCircle className="h-4 w-4 text-green-600" />
                                  </Button>
                                  <Button variant="ghost" size="sm" onClick={() => handleCancel(cn.id)}>
                                    <XCircle className="h-4 w-4 text-red-600" />
                                  </Button>
                                  <Button variant="ghost" size="sm" onClick={() => handleDelete(cn.id)}>
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

      {/* Create Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Credit Note</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Purchase Invoice *</Label>
                <Combobox
                  options={purchaseInvoiceOptions}
                  value={formData.purchase_invoice_id}
                  onChange={handlePurchaseInvoiceChange}
                  placeholder="Select purchase invoice"
                  searchPlaceholder="Search by invoice number..."
                  emptyText={isLoadingInvoices ? "Loading..." : "No purchase invoices found"}
                  onSearchChange={setInvoiceSearchTerm}
                />
              </div>
              <div>
                <Label>Vendor</Label>
                <Combobox
                  options={vendorOptions}
                  value={formData.vendor_id}
                  onChange={(value) => setFormData({ ...formData, vendor_id: value })}
                  placeholder="Select vendor"
                  searchPlaceholder="Search vendors..."
                  emptyText="No vendors found"
                  disabled={!!formData.purchase_invoice_id}
                />
              </div>
              <div>
                <Label>Location *</Label>
                <Combobox
                  options={locationOptions}
                  value={formData.location_id}
                  onChange={(value) => setFormData({ ...formData, location_id: value })}
                  placeholder="Select location"
                  searchPlaceholder="Search locations..."
                  emptyText="No locations found"
                  disabled={!!formData.purchase_invoice_id}
                />
              </div>
              <div>
                <Label>Date *</Label>
                <Input
                  type="date"
                  value={formData.credit_note_date}
                  onChange={(e) => setFormData({ ...formData, credit_note_date: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label>Notes</Label>
              <textarea
                className="w-full px-3 py-2 border rounded-md"
                rows={3}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Reason for credit note..."
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <Label>Items *</Label>
                <Button type="button" size="sm" onClick={handleAddItem}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Item
                </Button>
              </div>

              {formData.items.map((item, index) => (
                <div key={index} className="grid grid-cols-12 gap-2 mb-2 items-end">
                  <div className="col-span-4">
                    <Combobox
                      options={productOptions}
                      value={item.product_id.toString()}
                      onChange={(value) => handleItemChange(index, 'product_id', parseInt(value))}
                      placeholder="Select product"
                      searchPlaceholder="Search products..."
                      emptyText="No products found"
                    />
                  </div>
                  <div className="col-span-2">
                    <Input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={item.quantity}
                      onChange={(e) => handleItemChange(index, 'quantity', parseFloat(e.target.value))}
                      placeholder="Qty"
                    />
                  </div>
                  <div className="col-span-2">
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={item.unit_price}
                      onChange={(e) => handleItemChange(index, 'unit_price', parseFloat(e.target.value))}
                      placeholder="Price"
                    />
                  </div>
                  <div className="col-span-3">
                    <Input
                      value={item.reason}
                      onChange={(e) => handleItemChange(index, 'reason', e.target.value)}
                      placeholder="Reason"
                    />
                  </div>
                  <div className="col-span-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveItem(index)}
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="text-right text-lg font-bold">
              Total: {formatCurrency(totalAmount)}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Creating...' : 'Create Credit Note'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Credit Note Details</DialogTitle>
          </DialogHeader>
          {selectedCreditNote && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Credit Note Number</Label>
                  <p className="font-medium">{selectedCreditNote.credit_note_number}</p>
                </div>
                <div>
                  <Label>Date</Label>
                  <p>{new Date(selectedCreditNote.credit_note_date).toLocaleDateString()}</p>
                </div>
                <div>
                  <Label>Vendor</Label>
                  <p>{selectedCreditNote.vendor?.company_name || selectedCreditNote.vendor?.name || '-'}</p>
                </div>
                <div>
                  <Label>Location</Label>
                  <p>{selectedCreditNote.location?.name}</p>
                </div>
                <div>
                  <Label>Status</Label>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(selectedCreditNote.status)}`}>
                    {selectedCreditNote.status}
                  </span>
                </div>
                <div>
                  <Label>Total Amount</Label>
                  <p className="font-bold">{formatCurrency(selectedCreditNote.total_amount || 0)}</p>
                </div>
              </div>

              {selectedCreditNote.notes && (
                <div>
                  <Label>Notes</Label>
                  <p className="text-sm">{selectedCreditNote.notes}</p>
                </div>
              )}

              <div>
                <Label>Items</Label>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Unit Price</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Reason</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedCreditNote.items?.map((item: any) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.product?.name_en || item.product?.name_ar || 'Unknown Product'}</TableCell>
                        <TableCell>{Number(item.quantity).toFixed(2)}</TableCell>
                        <TableCell>{formatCurrency(item.unit_price || 0)}</TableCell>
                        <TableCell>{formatCurrency(item.total || 0)}</TableCell>
                        <TableCell>{item.reason || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setIsViewDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
