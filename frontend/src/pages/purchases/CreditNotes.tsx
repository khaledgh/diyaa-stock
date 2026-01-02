import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Plus, FileText, CheckCircle, XCircle, Trash2, Eye, Search, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pagination } from '@/components/ui/pagination';
import { Combobox } from '@/components/ui/combobox';
import { creditNoteApi, vendorApi, locationApi, productApi, api, invoiceApi, customerApi } from '@/lib/api';
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
  const [isEditMode, setIsEditMode] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [perPage] = useState(20);

  const [formData, setFormData] = useState({
    type: 'purchase', // purchase or sales
    vendor_id: '',
    customer_id: '',
    location_id: '',
    credit_note_date: new Date().toISOString().split('T')[0],
    purchase_invoice_id: '',
    sales_invoice_id: '',
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

  // Fetch customers
  const { data: customersData } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const response = await customerApi.getAll();
      return response.data.data || response.data || [];
    },
  });

  // Fetch invoices (sales or purchase) for credit note selection
  const { data: invoicesData, isLoading: isLoadingInvoices } = useQuery({
    queryKey: ['invoices-search', formData.type, invoiceSearchTerm],
    queryFn: async () => {
      const response = await invoiceApi.getAll({
        invoice_type: formData.type as any,
        search: invoiceSearchTerm || undefined,
        limit: 50
      });
      return response.data.data.data || response.data.data || response.data || [];
    },
    enabled: isDialogOpen,
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
  const customers = Array.isArray(customersData) ? customersData : [];
  const locations = Array.isArray(locationsData) ? locationsData : [];
  const products = Array.isArray(productsData) ? productsData : [];
  const locationStock = Array.isArray(locationStockData) ? locationStockData : [];
  const availableInvoices = Array.isArray(invoicesData) ? invoicesData : [];

  console.log('Products loaded:', products.length, products);
  console.log('Location stock:', locationStock.length, locationStock);

  const vendorOptions = vendors.map((v: any) => ({
    value: v.id?.toString() || '',
    label: v.company_name || v.name || 'Unknown Vendor'
  }));
  const customerOptions = customers.map((c: any) => ({
    value: c.id?.toString() || '',
    label: c.name || 'Unknown Customer'
  }));
  const locationOptions = locations.map((l: any) => ({
    value: l.id?.toString() || '',
    label: l.name || l.name_en || l.name_ar || 'Unknown Location'
  }));

  const invoiceOptions = availableInvoices.map((p: any) => ({
    value: p.id?.toString() || '',
    label: `${p.invoice_number} - ${formData.type === 'purchase' ? (p.vendor?.company_name || p.vendor?.name) : p.customer?.name || 'Walk-in'} (${formatCurrency(p.total_amount || 0)})`
  }));

  // Show all products, regardless of current stock level. 
  // Validation for quantity availability (for Purchase Returns) happens in handleItemChange/validateItemQuantity.
  const availableProducts = products;

  const productOptions = availableProducts.map((p: any) => {
    const stockItem = locationStock.find((s: any) => s.product_id === p.id);
    const quantity = stockItem?.quantity || 0;
    // Format quantity to avoid floating-point precision issues
    const formattedQuantity = Number(quantity).toFixed(2);

    return {
      value: p.id?.toString() || '',
      label: `${p.name_en || p.name || p.name_ar || 'Unknown Product'} (Stock: ${formattedQuantity})`
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

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number, data: any }) => creditNoteApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credit-notes'] });
      toast.success(t('creditNotes.creditNoteUpdated'));
      handleCloseDialog();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update credit note');
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
    setIsEditMode(false);
    setSelectedCreditNote(null);
    setFormData({
      type: 'purchase',
      vendor_id: '',
      customer_id: '',
      location_id: '',
      credit_note_date: new Date().toISOString().split('T')[0],
      purchase_invoice_id: '',
      sales_invoice_id: '',
      notes: '',
      items: [],
    });
    setIsDialogOpen(true);
  };

  const handleEdit = (cn: any) => {
    setSelectedCreditNote(cn);
    setIsEditMode(true);
    setFormData({
      type: cn.type || 'purchase',
      vendor_id: cn.vendor_id?.toString() || '',
      customer_id: cn.customer_id?.toString() || '',
      location_id: cn.location_id?.toString() || '',
      credit_note_date: new Date(cn.credit_note_date).toISOString().split('T')[0],
      purchase_invoice_id: cn.purchase_invoice_id?.toString() || '',
      sales_invoice_id: cn.sales_invoice_id?.toString() || '',
      notes: cn.notes || '',
      items: cn.items?.map((item: any) => ({
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        reason: item.reason || '',
      })) || [],
    });
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setInvoiceSearchTerm(''); // Reset search when closing dialog
  };

  const handleInvoiceChange = async (invoiceId: string) => {
    setFormData({
      ...formData,
      purchase_invoice_id: formData.type === 'purchase' ? invoiceId : '',
      sales_invoice_id: formData.type === 'sales' ? invoiceId : '',
      vendor_id: '',
      customer_id: '',
      location_id: '',
      items: []
    });

    if (!invoiceId) return;

    try {
      // Fetch full invoice details
      const response = await invoiceApi.getById(parseInt(invoiceId), formData.type as any);
      const invoice = response.data.data || response.data;

      if (invoice) {
        // Auto-populate vendor/customer and location
        setFormData(prev => ({
          ...prev,
          vendor_id: formData.type === 'purchase' ? (invoice.vendor_id?.toString() || '') : '',
          customer_id: formData.type === 'sales' ? (invoice.customer_id?.toString() || '') : '',
          location_id: invoice.location_id?.toString() || '',
          items: invoice.items?.map((item: any) => ({
            product_id: item.product_id,
            quantity: item.quantity,
            unit_price: item.unit_price,
            reason: `Return from ${formData.type} invoice`
          })) || []
        }));
      }
    } catch (error) {
      console.error('Failed to fetch invoice details:', error);
      toast.error('Failed to load invoice details');
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
      if (formData.purchase_invoice_id || formData.sales_invoice_id) {
        await validateItemQuantity(parseInt(value), newItems[index].quantity, index);
      }
    }

    // Validate quantity when it changes
    if (field === 'quantity' && value > 0 && newItems[index].product_id > 0) {
      if (formData.purchase_invoice_id || formData.sales_invoice_id) {
        await validateItemQuantity(newItems[index].product_id, value, index);
      }
    }

    setFormData({ ...formData, items: newItems });
  };

  const validateItemQuantity = async (productId: number, quantity: number, itemIndex: number) => {
    const invoiceId = formData.purchase_invoice_id || formData.sales_invoice_id;
    if (!invoiceId) return;

    try {
      // Get existing approved credit notes for this invoice
      const creditNotesResponse = await creditNoteApi.getAll({
        search: '',
        status: 'approved',
        page: 1,
        per_page: 500
      });

      const existingCreditNotes = creditNotesResponse.data?.data || creditNotesResponse.data || [];
      const invoiceCreditNotes = existingCreditNotes.filter((cn: any) =>
        (formData.type === 'purchase' ? cn.purchase_invoice_id : cn.sales_invoice_id) === parseInt(invoiceId) &&
        (!isEditMode || cn.id !== selectedCreditNote?.id)
      );

      // Calculate already credited quantity
      let alreadyCredited = 0;
      for (const cn of invoiceCreditNotes) {
        for (const item of cn.items || []) {
          if (item.product_id === productId) {
            alreadyCredited += item.quantity;
          }
        }
      }

      // Add current item quantity
      for (let i = 0; i < formData.items.length; i++) {
        if (i !== itemIndex && formData.items[i].product_id === productId) {
          alreadyCredited += formData.items[i].quantity;
        }
      }

      // Get original invoice
      const invoiceResponse = await invoiceApi.getById(parseInt(invoiceId), formData.type as any);
      const invoice = invoiceResponse.data.data || invoiceResponse.data;

      if (invoice && invoice.items) {
        const invoiceItem = invoice.items.find((item: any) => item.product_id === productId);
        if (invoiceItem) {
          const maxQuantity = invoiceItem.quantity;
          const totalRequested = alreadyCredited + quantity;

          if (totalRequested > maxQuantity) {
            toast.error(`Limit exceeded. Max: ${maxQuantity}, Credited: ${alreadyCredited}, Requested: ${quantity}`);
            return false;
          }
        }
      }
    } catch (error) {
      console.warn('Validation error:', error);
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
      type: formData.type,
      vendor_id: formData.type === 'purchase' && formData.vendor_id ? parseInt(formData.vendor_id) : null,
      customer_id: formData.type === 'sales' && formData.customer_id ? parseInt(formData.customer_id) : null,
      location_id: parseInt(formData.location_id),
      credit_note_date: dateWithTime,
      purchase_invoice_id: formData.purchase_invoice_id ? parseInt(formData.purchase_invoice_id) : null,
      sales_invoice_id: formData.sales_invoice_id ? parseInt(formData.sales_invoice_id) : null,
      notes: formData.notes,
      items: formData.items.map(item => ({
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: parseFloat(item.unit_price.toString()),
        reason: item.reason,
      })),
    };

    if (isEditMode && selectedCreditNote) {
      updateMutation.mutate({ id: selectedCreditNote.id, data });
    } else {
      createMutation.mutate(data);
    }
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
    if (confirm(t('creditNotes.confirmApprove'))) {
      approveMutation.mutate(id);
    }
  };

  const handleCancel = (id: number) => {
    if (confirm(t('creditNotes.confirmCancel'))) {
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
                        <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                          No credit notes found
                        </TableCell>
                      </TableRow>
                    ) : (
                      creditNotes.map((cn: any) => (
                        <TableRow key={cn.id}>
                          <TableCell className="font-medium">{cn.credit_note_number}</TableCell>
                          <TableCell>{new Date(cn.credit_note_date).toLocaleDateString()}</TableCell>
                          <TableCell className="capitalize">{cn.type || 'purchase'}</TableCell>
                          <TableCell>
                            {cn.type === 'sales'
                              ? (cn.customer?.name || 'Walk-in')
                              : (cn.vendor?.company_name || cn.vendor?.name || '-')}
                          </TableCell>
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
                              {(cn.status === 'draft' || cn.status === 'approved') && (
                                <Button variant="ghost" size="sm" onClick={() => handleEdit(cn)}>
                                  <Pencil className="h-4 w-4 text-blue-600" />
                                </Button>
                              )}
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
            <DialogTitle>{isEditMode ? 'Edit Credit Note' : 'Create Credit Note'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Credit Note Type *</Label>
                <div className="flex gap-4 mt-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={formData.type === 'purchase'}
                      onChange={() => setFormData({
                        ...formData,
                        type: 'purchase',
                        purchase_invoice_id: '',
                        sales_invoice_id: '',
                        vendor_id: '',
                        customer_id: '',
                        items: []
                      })}
                    />
                    Purchase Return (Vendor)
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={formData.type === 'sales'}
                      onChange={() => setFormData({
                        ...formData,
                        type: 'sales',
                        purchase_invoice_id: '',
                        sales_invoice_id: '',
                        vendor_id: '',
                        customer_id: '',
                        items: []
                      })}
                    />
                    Sales Return (Customer)
                  </label>
                </div>
              </div>
              <div>
                <Label>{formData.type === 'purchase' ? 'Purchase' : 'Sales'} Invoice *</Label>
                <Combobox
                  options={invoiceOptions}
                  value={formData.type === 'purchase' ? formData.purchase_invoice_id : formData.sales_invoice_id}
                  onChange={handleInvoiceChange}
                  placeholder={`Select ${formData.type} invoice`}
                  searchPlaceholder="Search by invoice number..."
                  emptyText={isLoadingInvoices ? "Loading..." : `No ${formData.type} invoices found`}
                  onSearchChange={setInvoiceSearchTerm}
                />
              </div>
              <div>
                <Label>{formData.type === 'purchase' ? 'Vendor' : 'Customer'}</Label>
                <Combobox
                  options={formData.type === 'purchase' ? vendorOptions : customerOptions}
                  value={formData.type === 'purchase' ? formData.vendor_id : formData.customer_id}
                  onChange={(value) => setFormData({
                    ...formData,
                    vendor_id: formData.type === 'purchase' ? value : '',
                    customer_id: formData.type === 'sales' ? value : ''
                  })}
                  placeholder={`Select ${formData.type === 'purchase' ? 'vendor' : 'customer'}`}
                  searchPlaceholder={`Search ${formData.type === 'purchase' ? 'vendors' : 'customers'}...`}
                  emptyText="No results found"
                  disabled={!!(formData.purchase_invoice_id || formData.sales_invoice_id)}
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
                  disabled={!!(formData.purchase_invoice_id || formData.sales_invoice_id)}
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
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
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
                  <Label>Type</Label>
                  <p className="capitalize font-medium">{selectedCreditNote.type || 'purchase'}</p>
                </div>
                <div>
                  <Label>Status</Label>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(selectedCreditNote.status)}`}>
                    {selectedCreditNote.status}
                  </span>
                </div>
                {(selectedCreditNote.purchase_invoice || selectedCreditNote.sales_invoice) && (
                  <div className="col-span-2">
                    <Label>Related Invoice</Label>
                    <p className="font-medium text-blue-600">
                      {selectedCreditNote.type === 'sales'
                        ? selectedCreditNote.sales_invoice?.invoice_number
                        : selectedCreditNote.purchase_invoice?.invoice_number}
                    </p>
                  </div>
                )}
                <div>
                  <Label>{selectedCreditNote.type === 'sales' ? 'Customer' : 'Vendor'}</Label>
                  <p>
                    {selectedCreditNote.type === 'sales'
                      ? (selectedCreditNote.customer?.name || 'Walk-in')
                      : (selectedCreditNote.vendor?.company_name || selectedCreditNote.vendor?.name || '-')}
                  </p>
                </div>
                <div>
                  <Label>Location</Label>
                  <p>{selectedCreditNote.location?.name}</p>
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
