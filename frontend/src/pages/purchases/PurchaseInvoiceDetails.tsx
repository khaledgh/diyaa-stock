import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowLeft, Package, MapPin, User, Calendar, DollarSign, Plus, Edit2, Save, X, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Combobox } from '@/components/ui/combobox';
import { invoiceApi, paymentApi, productApi, vendorApi } from '@/lib/api';
import { formatCurrency, formatDateTime } from '@/lib/utils';

export default function PurchaseInvoiceDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [referenceNumber, setReferenceNumber] = useState('');

  // Item editing state
  const [editingItemId, setEditingItemId] = useState<number | null>(null);
  const [editProductId, setEditProductId] = useState('');
  const [editQuantity, setEditQuantity] = useState('');
  const [editUnitPrice, setEditUnitPrice] = useState('');
  const [editDiscount, setEditDiscount] = useState('');

  // Add item state
  const [showAddItemForm, setShowAddItemForm] = useState(false);
  const [newProductId, setNewProductId] = useState('');
  const [newQuantity, setNewQuantity] = useState('');
  const [newUnitPrice, setNewUnitPrice] = useState('');
  const [newDiscount, setNewDiscount] = useState('');

  // Invoice date editing state
  const [isEditingInvoiceDate, setIsEditingInvoiceDate] = useState(false);
  const [editInvoiceDate, setEditInvoiceDate] = useState('');

  // Vendor editing state
  const [isEditingVendor, setIsEditingVendor] = useState(false);
  const [editVendorId, setEditVendorId] = useState('');

  const { data: invoice, isLoading } = useQuery({
    queryKey: ['purchase-invoice', id],
    queryFn: async () => {
      if (!id) throw new Error('Invoice ID is required');
      const response = await invoiceApi.getById(Number(id), 'purchase');
      return response.data.data;
    },
    enabled: !!id,
  });

  const { data: products } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const response = await productApi.getAll();
      const apiData = response.data.data || response.data;
      return Array.isArray(apiData) ? apiData : (apiData.data || []);
    },
  });

  const { data: vendors } = useQuery({
    queryKey: ['vendors'],
    queryFn: async () => {
      const response = await vendorApi.getAll();
      const apiData = response.data.data || response.data;
      return Array.isArray(apiData) ? apiData : (apiData.data || []);
    },
  });

  // Payment mutation
  const createPaymentMutation = useMutation({
    mutationFn: (data: any) => paymentApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-invoice', id] });
      toast.success('Payment recorded successfully');
      setIsPaymentDialogOpen(false);
      setPaymentAmount('');
      setPaymentMethod('cash');
      setReferenceNumber('');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to record payment');
    },
  });

  // Item update mutation
  const updateItemMutation = useMutation({
    mutationFn: ({ itemId, data }: { itemId: number; data: any }) =>
      invoiceApi.updatePurchaseItem(Number(id), itemId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-invoice', id] });
      toast.success('Item updated successfully');
      cancelEdit();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update item');
    },
  });

  // Add item mutation
  const addItemMutation = useMutation({
    mutationFn: (data: any) => invoiceApi.addPurchaseItem(Number(id), data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-invoice', id] });
      toast.success('Item added successfully');
      cancelAddItem();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to add item');
    },
  });

  // Invoice date update mutation
  const updateInvoiceDateMutation = useMutation({
    mutationFn: (invoiceDate: string) => {
      return invoiceApi.update(Number(id), { invoice_date: invoiceDate }, 'purchase');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-invoice', id] });
      toast.success('Invoice date updated successfully');
      setIsEditingInvoiceDate(false);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update invoice date');
    },
  });

  // Vendor update mutation
  const updateVendorMutation = useMutation({
    mutationFn: (vendorId: number | null) => {
      return invoiceApi.update(Number(id), { vendor_id: vendorId }, 'purchase');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-invoice', id] });
      toast.success('Vendor updated successfully');
      setIsEditingVendor(false);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update vendor');
    },
  });



  const handleDownloadPDF = async () => {
    if (!invoice) return;
    try {
      const companySettings = localStorage.getItem('company_settings');
      let params = new URLSearchParams({
        type: 'purchase'
      });

      if (companySettings) {
        const settings = JSON.parse(companySettings);
        if (settings.company_name) params.append('company_name', settings.company_name);
        if (settings.company_address) params.append('company_address', settings.company_address);
        if (settings.company_phone) params.append('company_phone', settings.company_phone);
      }

      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/pdf/invoice/${invoice.id}?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('PDF generation failed:', response.status, errorText);
        throw new Error(`Failed to generate PDF: ${response.status}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `purchase_invoice_${invoice.invoice_number}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success('PDF downloaded successfully');
    } catch (error) {
      console.error('PDF export error:', error);
      toast.error('Failed to generate PDF');
    }
  };

  const handleAddPayment = () => {
    if (!invoice || !paymentAmount) {
      toast.error('Please enter payment amount');
      return;
    }

    // Calculate remaining with credit notes
    const cnTotal = invoice.credit_notes?.reduce((sum: number, cn: any) => sum + (cn.total_amount || 0), 0) || 0;
    const remaining = invoice.total_amount - cnTotal - invoice.paid_amount;
    if (Number(paymentAmount) > remaining) {
      toast.error('Payment amount exceeds remaining balance');
      return;
    }

    createPaymentMutation.mutate({
      invoice_id: invoice.id,
      invoice_type: 'purchase',
      amount: Number(paymentAmount),
      payment_method: paymentMethod,
      reference_number: referenceNumber || undefined,
    });
  };

  // Item editing functions
  const startEdit = (item: any) => {
    setEditingItemId(item.id);
    setEditProductId(item.product_id.toString());
    setEditQuantity(item.quantity.toString());
    setEditUnitPrice(item.unit_price.toString());
    setEditDiscount((item.discount_percent || 0).toString());
  };

  const cancelEdit = () => {
    setEditingItemId(null);
    setEditProductId('');
    setEditQuantity('');
    setEditUnitPrice('');
    setEditDiscount('');
  };

  // Invoice date editing functions
  const startEditInvoiceDate = () => {
    if (invoice) {
      const date = invoice.invoice_date || invoice.created_at;
      setEditInvoiceDate(new Date(date).toISOString().split('T')[0]);
      setIsEditingInvoiceDate(true);
    }
  };

  const cancelEditInvoiceDate = () => {
    setIsEditingInvoiceDate(false);
    setEditInvoiceDate('');
  };

  const saveInvoiceDate = () => {
    if (!editInvoiceDate) {
      toast.error('Please select a valid date');
      return;
    }
    updateInvoiceDateMutation.mutate(editInvoiceDate);
  };

  // Vendor editing functions
  const startEditVendor = () => {
    if (invoice) {
      setEditVendorId(invoice.vendor_id?.toString() || '');
      setIsEditingVendor(true);
    }
  };

  const cancelEditVendor = () => {
    setIsEditingVendor(false);
    setEditVendorId('');
  };

  const saveVendor = () => {
    const vendorId = editVendorId ? Number(editVendorId) : null;
    updateVendorMutation.mutate(vendorId);
  };

  const saveEdit = () => {
    if (!editingItemId || !editProductId || !editQuantity || !editUnitPrice) {
      toast.error('Please fill all required fields');
      return;
    }

    updateItemMutation.mutate({
      itemId: editingItemId,
      data: {
        product_id: Number(editProductId),
        quantity: Number(editQuantity),
        unit_price: Number(editUnitPrice),
        discount_percent: Number(editDiscount) || 0,
      },
    });
  };

  // Add item functions
  const cancelAddItem = () => {
    setShowAddItemForm(false);
    setNewProductId('');
    setNewQuantity('');
    setNewUnitPrice('');
    setNewDiscount('');
  };

  const handleAddItem = () => {
    if (!newProductId || !newQuantity || !newUnitPrice) {
      toast.error('Please fill all required fields');
      return;
    }

    addItemMutation.mutate({
      product_id: Number(newProductId),
      quantity: Number(newQuantity),
      unit_price: Number(newUnitPrice),
      discount_percent: Number(newDiscount) || 0,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading invoice...</p>
        </div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-xl font-semibold">Invoice not found</p>
          <Button onClick={() => navigate('/invoices/purchase')} className="mt-4">
            Back to Purchase Invoices
          </Button>
        </div>
      </div>
    );
  }

  // Calculate credit notes total
  const creditNotesTotal = invoice.credit_notes?.reduce((sum: number, cn: any) => sum + (cn.total_amount || 0), 0) || 0;
  // Remaining = Total - Credit Notes - Paid
  const remaining = invoice.total_amount - creditNotesTotal - invoice.paid_amount;

  // Calculate credited quantities per product
  const getCreditedQuantity = (productId: number) => {
    if (!invoice.credit_notes || invoice.credit_notes.length === 0) return 0;
    return invoice.credit_notes.reduce((total: number, cn: any) => {
      if (cn.status !== 'approved') return total;
      const cnItems = cn.items || [];
      const productItems = cnItems.filter((item: any) => item.product_id === productId);
      return total + productItems.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0);
    }, 0);
  };

  // Calculate remaining total after credit notes for each item
  const getItemRemainingTotal = (item: any) => {
    const creditedQty = getCreditedQuantity(item.product_id);
    const remainingQty = item.quantity - creditedQty;
    return remainingQty * item.unit_price * (1 - (item.discount_percent || 0) / 100);
  };

  const productOptions = products?.map((product: any) => ({
    value: product.id.toString(),
    label: `${product.name_ar || product.name_en || product.name || 'Unknown Product'}`,
  })) || [];

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between print:hidden">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/invoices/purchase')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Package className="h-8 w-8 text-blue-600" /> Purchase Invoice
            </h1>
            <p className="text-muted-foreground mt-1">{invoice.invoice_number}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {remaining > 0 && (
            <Button
              onClick={() => setIsPaymentDialogOpen(true)}
              variant="default"
              className="bg-green-600 hover:bg-green-700"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Payment
            </Button>
          )}
          <Button onClick={handleDownloadPDF} variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Download PDF
          </Button>
        </div>
      </div>

      {/* Invoice Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>Invoice Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span className="text-sm">Invoice Date</span>
                </div>
                {!isEditingInvoiceDate && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={startEditInvoiceDate}
                    className="h-6 w-6 p-0"
                  >
                    <Edit2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
              {isEditingInvoiceDate ? (
                <div className="flex items-center gap-2">
                  <Input
                    type="date"
                    value={editInvoiceDate}
                    onChange={(e) => setEditInvoiceDate(e.target.value)}
                    className="flex-1 h-8"
                  />
                  <Button
                    size="sm"
                    onClick={saveInvoiceDate}
                    disabled={updateInvoiceDateMutation.isPending}
                  >
                    <Save className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={cancelEditInvoiceDate}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <p className="font-medium">{formatDateTime(invoice.invoice_date || invoice.created_at)}</p>
              )}
            </div>

            {invoice.location_name && (
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span className="text-sm">Location</span>
                </div>
                <p className="font-medium">
                  {invoice.location_name}
                  <span className="text-xs text-muted-foreground ml-2">
                    ({invoice.location_type})
                  </span>
                </p>
              </div>
            )}

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <User className="h-4 w-4" />
                  <span className="text-sm">Vendor</span>
                </div>
                {!isEditingVendor && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={startEditVendor}
                    className="h-6 w-6 p-0"
                  >
                    <Edit2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
              {isEditingVendor ? (
                <div className="flex items-center gap-2">
                  <Combobox
                    options={[
                      { value: '', label: 'No vendor (optional)' },
                      ...(vendors?.map((v: any) => ({
                        value: v.id.toString(),
                        label: v.company_name || v.name || 'Unknown Vendor',
                      })) || []),
                    ]}
                    value={editVendorId}
                    onChange={setEditVendorId}
                    placeholder="Select vendor"
                    searchPlaceholder="Search vendors..."
                    emptyText="No vendors found"
                  />
                  <Button
                    size="sm"
                    onClick={saveVendor}
                    disabled={updateVendorMutation.isPending}
                  >
                    <Save className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={cancelEditVendor}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <>
                  <p className="font-medium">
                    {invoice.vendor?.company_name || invoice.vendor?.name || invoice.vendor_name || 'No vendor'}
                  </p>
                  {(invoice.vendor?.name || invoice.vendor_company) && invoice.vendor?.company_name && (
                    <p className="text-sm text-muted-foreground">
                      {invoice.vendor?.name || invoice.vendor_company}
                    </p>
                  )}
                </>
              )}
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 text-muted-foreground">
                <DollarSign className="h-4 w-4" />
                <span className="text-sm">Payment Status</span>
              </div>
              <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${invoice.payment_status === 'paid'
                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                : invoice.payment_status === 'partial'
                  ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                  : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                }`}>
                {invoice.payment_status}
              </span>
            </div>

            {invoice.created_by_name && (
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <User className="h-4 w-4" />
                  <span className="text-sm">Created By</span>
                </div>
                <p className="font-medium">{invoice.created_by_name}</p>
              </div>
            )}
          </div>

          {invoice.notes && (
            <div className="mt-6 pt-6 border-t">
              <p className="text-sm text-muted-foreground mb-2">Notes</p>
              <p className="text-sm">{invoice.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Items Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Items</CardTitle>
            <Button
              onClick={() => setShowAddItemForm(!showAddItemForm)}
              variant="outline"
              size="sm"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Item
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {showAddItemForm && (
            <div className="mb-6 p-4 border rounded-lg bg-gray-50 dark:bg-gray-900">
              <h4 className="font-medium mb-4">Add New Item</h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                <div className="space-y-2">
                  <Label htmlFor="new-product">Product</Label>
                  <Combobox
                    options={[
                      { value: '', label: 'Select product...' },
                      ...productOptions,
                    ]}
                    value={newProductId}
                    onChange={(value) => {
                      setNewProductId(value);
                      // Auto-populate unit price for purchase invoices (using cost price)
                      if (value) {
                        const selectedProduct = products?.find((p: any) => p.id.toString() === value);
                        if (selectedProduct) {
                          setNewUnitPrice(selectedProduct.cost_price?.toString() || '');
                        }
                      } else {
                        setNewUnitPrice('');
                      }
                    }}
                    placeholder="Select product"
                    searchPlaceholder="Search products..."
                    emptyText="No products found"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="new-quantity">Quantity</Label>
                  <Input
                    id="new-quantity"
                    type="number"
                    min="1"
                    value={newQuantity}
                    onChange={(e) => setNewQuantity(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="new-unit-price">Unit Price</Label>
                  <Input
                    id="new-unit-price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={newUnitPrice}
                    onChange={(e) => setNewUnitPrice(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="new-discount">Discount %</Label>
                  <Input
                    id="new-discount"
                    type="number"
                    min="0"
                    max="100"
                    value={newDiscount}
                    onChange={(e) => setNewDiscount(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  Total: {formatCurrency((Number(newQuantity) || 0) * (Number(newUnitPrice) || 0) * (1 - (Number(newDiscount) || 0) / 100))}
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={cancelAddItem}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleAddItem}
                    disabled={addItemMutation.isPending}
                  >
                    {addItemMutation.isPending ? 'Adding...' : 'Add Item'}
                  </Button>
                </div>
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-center">Quantity</TableHead>
                  {creditNotesTotal > 0 && <TableHead className="text-center">Credit Noted</TableHead>}
                  <TableHead className="text-right">Unit Price</TableHead>
                  <TableHead className="text-center">Discount</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoice.items?.map((item: any, index: number) => (
                  <TableRow key={index}>
                    <TableCell>
                      {editingItemId === item.id ? (
                        <Combobox
                          options={[
                            { value: '', label: 'Select product...' },
                            ...productOptions,
                          ]}
                          value={editProductId}
                          onChange={(value) => {
                            setEditProductId(value);
                            // Auto-populate unit price for purchase invoices (using cost price)
                            if (value) {
                              const selectedProduct = products?.find((p: any) => p.id.toString() === value);
                              if (selectedProduct) {
                                setEditUnitPrice(selectedProduct.cost_price?.toString() || '');
                              }
                            } else {
                              setEditUnitPrice('');
                            }
                          }}
                          placeholder="Select product"
                          searchPlaceholder="Search products..."
                          emptyText="No products found"
                        />
                      ) : (
                        <div>
                          <p className="font-medium">{item.product?.name_ar || item.product?.name_en || item.product_name || item.name_en || '-'}</p>
                          {(item.product?.sku || item.sku) && (
                            <p className="text-xs text-muted-foreground">SKU: {item.product?.sku || item.sku}</p>
                          )}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {editingItemId === item.id ? (
                        <Input
                          type="number"
                          min="1"
                          value={editQuantity}
                          onChange={(e) => setEditQuantity(e.target.value)}
                          className="w-20 text-center"
                        />
                      ) : (
                        item.quantity
                      )}
                    </TableCell>
                    {creditNotesTotal > 0 && (
                      <TableCell className="text-center">
                        <span className="text-orange-600 font-medium">
                          {getCreditedQuantity(item.product_id) > 0 ? getCreditedQuantity(item.product_id) : '-'}
                        </span>
                      </TableCell>
                    )}
                    <TableCell className="text-right">
                      {editingItemId === item.id ? (
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={editUnitPrice}
                          onChange={(e) => setEditUnitPrice(e.target.value)}
                          className="w-24 text-right"
                        />
                      ) : (
                        formatCurrency(item.unit_price)
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {editingItemId === item.id ? (
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          value={editDiscount}
                          onChange={(e) => setEditDiscount(e.target.value)}
                          className="w-20 text-center"
                        />
                      ) : (
                        `${item.discount_percent || 0}%`
                      )}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {editingItemId === item.id ? (
                        <span>{formatCurrency((Number(editQuantity) || 0) * (Number(editUnitPrice) || 0) * (1 - (Number(editDiscount) || 0) / 100))}</span>
                      ) : (
                        <span className={creditNotesTotal > 0 && getCreditedQuantity(item.product_id) > 0 ? 'text-green-600' : ''}>
                          {formatCurrency(creditNotesTotal > 0 ? getItemRemainingTotal(item) : item.total)}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {editingItemId === item.id ? (
                        <div className="flex items-center gap-2 justify-center">
                          <Button
                            size="sm"
                            onClick={saveEdit}
                            disabled={updateItemMutation.isPending}
                          >
                            <Save className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={cancelEdit}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => startEdit(item)}
                        >
                          <Edit2 className="h-3 w-3" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Credit Notes Card */}
      {invoice.credit_notes && invoice.credit_notes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-orange-600">Credit Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Credit Note #</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoice.credit_notes.map((cn: any) => (
                    <TableRow key={cn.id}>
                      <TableCell className="font-medium">{cn.credit_note_number}</TableCell>
                      <TableCell>{formatDateTime(cn.credit_note_date)}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${cn.status === 'approved'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                          }`}>
                          {cn.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-medium text-orange-600">
                        -{formatCurrency(cn.total_amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Totals Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-3 max-w-md ml-auto">
            <div className="flex justify-between text-lg">
              <span className="text-muted-foreground">Subtotal:</span>
              <span className="font-medium">{formatCurrency(invoice.subtotal)}</span>
            </div>

            {invoice.tax_amount > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tax:</span>
                <span>{formatCurrency(invoice.tax_amount)}</span>
              </div>
            )}

            {invoice.discount_amount > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Discount:</span>
                <span className="text-red-600">-{formatCurrency(invoice.discount_amount)}</span>
              </div>
            )}

            {creditNotesTotal > 0 ? (
              <div className="flex justify-between text-xl font-bold border-t pt-3">
                <span>Total:</span>
                <span>{formatCurrency(invoice.total_amount - creditNotesTotal)}</span>
              </div>
            ) : (
              <div className="flex justify-between text-xl font-bold border-t pt-3">
                <span>Total:</span>
                <span>{formatCurrency(invoice.total_amount)}</span>
              </div>
            )}

            <div className="flex justify-between text-lg border-t pt-3">
              <span className="text-green-600">Paid:</span>
              <span className="font-medium text-green-600">
                {formatCurrency(invoice.paid_amount)}
              </span>
            </div>

            {remaining > 0 && (
              <div className="flex justify-between text-lg">
                <span className="text-red-600 font-medium">Remaining:</span>
                <span className="font-bold text-red-600">
                  {formatCurrency(remaining)}
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Payment Dialog */}
      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add Payment</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="amount">Payment Amount</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0.01"
                max={remaining}
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                placeholder="0.00"
              />
              <p className="text-sm text-muted-foreground">
                Remaining balance: {formatCurrency(remaining)}
              </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="method">Payment Method</Label>
              <select
                id="method"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
              >
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="check">Check</option>
              </select>
            </div>
            {paymentMethod !== 'cash' && (
              <div className="grid gap-2">
                <Label htmlFor="reference">Reference Number</Label>
                <Input
                  id="reference"
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  placeholder="Transaction reference"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsPaymentDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddPayment}
              disabled={!paymentAmount || createPaymentMutation.isPending}
            >
              {createPaymentMutation.isPending ? 'Processing...' : 'Add Payment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Print Styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print\\:block {
            display: block !important;
          }
          .print\\:hidden {
            display: none !important;
          }
          #invoice-content, #invoice-content * {
            visibility: visible;
          }
          #invoice-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
