import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Printer, ShoppingCart, MapPin, User, Calendar, Plus, Edit2, Save, X, Users, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Page, PageHeader, PaymentBadge, StatusBadge } from '@/components/layout/Page';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Combobox } from '@/components/ui/combobox';
import { invoiceApi, paymentApi, productApi, stockApi } from '@/lib/api';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import PaymentAllocation from '@/components/PaymentAllocation';

export default function SalesInvoiceDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isPaymentAllocationOpen, setIsPaymentAllocationOpen] = useState(false);
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

  const { data: invoice, isLoading } = useQuery({
    queryKey: ['sales-invoice', id],
    queryFn: async () => {
      if (!id) throw new Error('Invoice ID is required');
      const response = await invoiceApi.getById(Number(id), 'sales');
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

  const { data: locationStock } = useQuery({
    queryKey: ['location-stock', invoice?.location_id],
    queryFn: async () => {
      if (!invoice?.location_id) return [];
      const response = await stockApi.getByLocation(invoice.location_id);
      return response.data.data || [];
    },
    enabled: !!invoice?.location_id,
  });

  // Payment mutation
  const createPaymentMutation = useMutation({
    mutationFn: (data: any) => paymentApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-invoice', id] });
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
      invoiceApi.updateSalesItem(Number(id), itemId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-invoice', id] });
      toast.success('Item updated successfully');
      cancelEdit();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update item');
    },
  });

  // Add item mutation
  const addItemMutation = useMutation({
    mutationFn: (data: any) => invoiceApi.addSalesItem(Number(id), data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-invoice', id] });
      toast.success('Item added successfully');
      cancelAddItem();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to add item');
    },
  });

  // Finalize mutation
  const finalizeMutation = useMutation({
    mutationFn: () => invoiceApi.update(Number(id), { status: 'finalized' }, 'sales'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-invoice', id] });
      queryClient.invalidateQueries({ queryKey: ['location-stock'] });
      toast.success('Invoice finalized and stock updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to finalize invoice');
    },
  });

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    if (!invoice) return;
    try {
      const companySettings = localStorage.getItem('company_settings');
      let params = new URLSearchParams({
        type: 'sales'
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
      a.download = `sales_invoice_${invoice.invoice_number}.pdf`;
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
      invoice_type: 'sales',
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

    // Check stock for sales
    const stock = locationStock?.find((s: any) => s.product_id === Number(newProductId));
    if (!stock || stock.quantity < Number(newQuantity)) {
      toast.error('Insufficient stock in selected location');
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
          <Button onClick={() => navigate('/invoices/sales')} className="mt-4">
            Back to Sales Invoices
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

  const productOptions = products?.map((product: any) => {
    const stock = locationStock?.find((s: any) => s.product_id === product.id);
    const stockInfo = invoice?.location_id ? ` (Stock: ${stock?.quantity || 0})` : '';
    return {
      value: product.id.toString(),
      label: `${product.name_ar || product.name_en || product.name || 'Unknown Product'}${stockInfo}`,
    };
  }) || [];

  const customerName = invoice.customer_name || invoice.customer?.name;
  const locationName = invoice.location_name || invoice.location?.name;
  const locationType = invoice.location_type || invoice.location?.type;
  const creatorName =
    invoice.created_by_name ||
    [invoice.created_by_user?.first_name, invoice.created_by_user?.last_name].filter(Boolean).join(' ') ||
    invoice.created_by_user?.email;
  const netAmount = invoice.total_amount - creditNotesTotal;
  const paidPct = netAmount > 0 ? Math.min((invoice.paid_amount / netAmount) * 100, 100) : 100;

  const SummaryRow = ({ label, value, tone, strong }: { label: string; value: string; tone?: string; strong?: boolean }) => (
    <div className={`flex items-center justify-between ${strong ? 'text-base font-semibold' : 'text-sm'}`}>
      <span className={tone || (strong ? '' : 'text-muted-foreground')}>{label}</span>
      <span className={`tabular-nums ${tone || ''}`}>{value}</span>
    </div>
  );

  return (
    <Page>
      <div className="print:hidden">
        <PageHeader
          backTo="/invoices/sales"
          icon={ShoppingCart}
          title={
            <span className="flex items-center gap-2">
              {invoice.invoice_number}
              <PaymentBadge status={invoice.payment_status} />
              {invoice.status === 'draft' && <StatusBadge tone="amber">Draft</StatusBadge>}
            </span>
          }
          description={`Sales invoice · ${formatDateTime(invoice.created_at)}`}
          actions={
            <>
              {invoice.status === 'draft' && (
                <Button onClick={() => finalizeMutation.mutate()} disabled={finalizeMutation.isPending}>
                  <Save className="me-1.5 h-4 w-4" />
                  {finalizeMutation.isPending ? 'Finalizing…' : 'Finalize'}
                </Button>
              )}
              {remaining > 0 && invoice.status !== 'draft' && (
                <Button onClick={() => setIsPaymentDialogOpen(true)}>
                  <Plus className="me-1.5 h-4 w-4" />
                  Add Payment
                </Button>
              )}
              {invoice.customer_id && remaining > 0 && (
                <Button variant="outline" onClick={() => setIsPaymentAllocationOpen(true)}>
                  <Users className="me-1.5 h-4 w-4" />
                  Pay Multiple
                </Button>
              )}
              <Button variant="outline" onClick={() => navigate(`/invoices/${id}/edit?type=sales`)}>
                <Edit2 className="me-1.5 h-4 w-4" />
                Edit
              </Button>
              <Button variant="outline" size="icon" onClick={handlePrint} title="Print" aria-label="Print">
                <Printer className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={handleDownloadPDF} title="Download PDF" aria-label="Download PDF">
                <Download className="h-4 w-4" />
              </Button>
            </>
          }
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="min-w-0 space-y-4 lg:col-span-2">
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
                      // Auto-populate unit price for sales invoices
                      if (value) {
                        const selectedProduct = products?.find((p: any) => p.id.toString() === value);
                        if (selectedProduct) {
                          setNewUnitPrice(selectedProduct.unit_price?.toString() || '');
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
                  {creditNotesTotal > 0 && <TableHead className="text-right">After Credit</TableHead>}
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
                            // Auto-populate unit price for sales invoices
                            if (value) {
                              const selectedProduct = products?.find((p: any) => p.id.toString() === value);
                              if (selectedProduct) {
                                setEditUnitPrice(selectedProduct.unit_price?.toString() || '');
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
                        formatCurrency(item.total)
                      )}
                    </TableCell>
                    {creditNotesTotal > 0 && (
                      <TableCell className="text-right font-medium">
                        {editingItemId === item.id ? (
                          <span>-</span>
                        ) : (
                          <span className={getCreditedQuantity(item.product_id) > 0 ? 'text-green-600' : ''}>
                            {formatCurrency(getItemRemainingTotal(item))}
                          </span>
                        )}
                      </TableCell>
                    )}
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

        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Payment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5">
              <SummaryRow label="Subtotal" value={formatCurrency(invoice.subtotal)} />
              {invoice.discount_amount > 0 && <SummaryRow label="Discount" value={`−${formatCurrency(invoice.discount_amount)}`} />}
              {invoice.tax_amount > 0 && <SummaryRow label="Tax" value={formatCurrency(invoice.tax_amount)} />}
              <div className="border-t pt-2.5">
                <SummaryRow label="Total" value={formatCurrency(invoice.total_amount)} strong />
              </div>
              {creditNotesTotal > 0 && (
                <>
                  <SummaryRow label="Returns" value={`−${formatCurrency(creditNotesTotal)}`} tone="text-orange-600" />
                  <SummaryRow label="Net amount" value={formatCurrency(netAmount)} strong />
                </>
              )}
              <SummaryRow label="Paid" value={formatCurrency(invoice.paid_amount)} tone="text-emerald-600 dark:text-emerald-400" />
              <div className="h-1.5 rounded-full bg-muted" aria-hidden>
                <div className="h-1.5 rounded-full bg-emerald-500" style={{ width: `${paidPct}%` }} />
              </div>
              <div className={`flex items-center justify-between rounded-md px-3 py-2 ${remaining > 0.009 ? 'bg-red-50 dark:bg-red-500/10' : 'bg-emerald-50 dark:bg-emerald-500/10'}`}>
                <span className={`text-sm font-medium ${remaining > 0.009 ? 'text-red-700 dark:text-red-300' : 'text-emerald-700 dark:text-emerald-300'}`}>
                  {remaining > 0.009 ? 'Balance due' : 'Fully paid'}
                </span>
                <span className={`text-lg font-semibold tabular-nums ${remaining > 0.009 ? 'text-red-700 dark:text-red-300' : 'text-emerald-700 dark:text-emerald-300'}`}>
                  {formatCurrency(Math.max(remaining, 0))}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-3 text-sm">
                <div className="flex items-start gap-3">
                  <User className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                  <div className="min-w-0">
                    <dt className="text-xs text-muted-foreground">Customer</dt>
                    <dd className="font-medium" dir="auto">
                      {invoice.customer_id ? (
                        <button type="button" className="text-primary hover:underline" onClick={() => navigate(`/customers/${invoice.customer_id}`)}>
                          {customerName || `#${invoice.customer_id}`}
                        </button>
                      ) : (
                        'Walk-in customer'
                      )}
                    </dd>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                  <div>
                    <dt className="text-xs text-muted-foreground">Location</dt>
                    <dd className="font-medium">
                      {locationName || '—'}
                      {locationType && <span className="ms-1.5 text-xs font-normal capitalize text-muted-foreground">{locationType}</span>}
                    </dd>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                  <div>
                    <dt className="text-xs text-muted-foreground">Date</dt>
                    <dd className="font-medium">{formatDateTime(invoice.created_at)}</dd>
                  </div>
                </div>
                {creatorName && (
                  <div className="flex items-start gap-3">
                    <Users className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                    <div>
                      <dt className="text-xs text-muted-foreground">Created by</dt>
                      <dd className="font-medium">{creatorName}</dd>
                    </div>
                  </div>
                )}
                {invoice.notes && (
                  <div className="border-t pt-3">
                    <dt className="text-xs text-muted-foreground">Notes</dt>
                    <dd className="mt-0.5 whitespace-pre-wrap">{invoice.notes}</dd>
                  </div>
                )}
              </dl>
            </CardContent>
          </Card>
        </div>
      </div>

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

      {invoice.customer_id && (
        <PaymentAllocation
          open={isPaymentAllocationOpen}
          onClose={() => setIsPaymentAllocationOpen(false)}
          entityId={invoice.customer_id}
          entityName={invoice.customer_name || invoice.customer?.name || "Customer"}
          type="sales"
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['sales-invoice', id] });
          }}
        />
      )}
    </Page>
  );
}
