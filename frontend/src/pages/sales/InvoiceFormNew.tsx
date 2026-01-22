import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowLeft, Save, Trash2, ShoppingCart, Package, AlertCircle, Edit2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Combobox } from '@/components/ui/combobox';
import { invoiceApi, productApi, locationApi, customerApi, stockApi, vendorApi } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';

interface InvoiceItem {
  product_id: number;
  product_name?: string;
  quantity: number;
  unit_price: number;
  discount_percent?: number;
  total?: number;
}

export default function InvoiceFormNew() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const invoiceType = (searchParams.get('type') || 'sales') as 'purchase' | 'sales';

  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([]);
  const [selectedLocation, setSelectedLocation] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [selectedVendor, setSelectedVendor] = useState('');
  const [selectedProduct, setSelectedProduct] = useState('');
  const [paidAmount, setPaidAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [productSearch, setProductSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [debouncedCustomerSearch, setDebouncedCustomerSearch] = useState('');
  const [vendorSearch, setVendorSearch] = useState('');
  const [debouncedVendorSearch, setDebouncedVendorSearch] = useState('');

  // Item editing state
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);
  const [editProductId, setEditProductId] = useState('');
  const [editQuantity, setEditQuantity] = useState('');
  const [editUnitPrice, setEditUnitPrice] = useState('');
  const [editDiscount, setEditDiscount] = useState('');

  // Debounce product search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(productSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [productSearch]);

  // Debounce customer search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedCustomerSearch(customerSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [customerSearch]);

  // Debounce vendor search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedVendorSearch(vendorSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [vendorSearch]);

  const { data: locations } = useQuery({
    queryKey: ['locations'],
    queryFn: async () => {
      const response = await locationApi.getAll();
      return response.data.data || [];
    },
  });

  const { data: products } = useQuery({
    queryKey: ['products', debouncedSearch],
    queryFn: async () => {
      const response = await productApi.getAll({ searchTerm: debouncedSearch });
      const apiData = response.data.data || response.data;
      return Array.isArray(apiData) ? apiData : (apiData.data || []);
    },
  });

  const { data: customers } = useQuery({
    queryKey: ['customers', debouncedCustomerSearch],
    queryFn: async () => {
      const response = await customerApi.getAll({ search: debouncedCustomerSearch, per_page: 50 });
      const apiData = response.data.data || response.data;
      return Array.isArray(apiData) ? apiData : (apiData.data || []);
    },
  });

  const { data: vendors } = useQuery({
    queryKey: ['vendors', debouncedVendorSearch],
    queryFn: async () => {
      const response = await vendorApi.getAll({ search: debouncedVendorSearch, per_page: 50 });
      const apiData = response.data.data || response.data;
      return Array.isArray(apiData) ? apiData : (apiData.data || []);
    },
  });

  const { data: locationStock } = useQuery({
    queryKey: ['location-stock', selectedLocation],
    queryFn: async () => {
      if (!selectedLocation) return [];
      const response = await stockApi.getByLocation(Number(selectedLocation));
      return response.data.data || [];
    },
    enabled: !!selectedLocation,
  });

  const createInvoiceMutation = useMutation({
    mutationFn: (data: any) => {
      return invoiceType === 'purchase'
        ? invoiceApi.createPurchase(data)
        : invoiceApi.createSales(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['location-stock'] });
      toast.success(`${invoiceType === 'purchase' ? 'Purchase' : 'Sales'} invoice created successfully`);
      navigate(`/invoices/${invoiceType}`);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create invoice');
    },
  });


  const handleRemoveItem = (index: number) => {
    setInvoiceItems(invoiceItems.filter((_, i) => i !== index));
  };

  // Item editing functions
  const startEdit = (index: number) => {
    const item = invoiceItems[index];
    setEditingItemIndex(index);
    setEditProductId(item.product_id.toString());
    setEditQuantity(item.quantity.toString());
    setEditUnitPrice(item.unit_price.toString());
    setEditDiscount((item.discount_percent || 0).toString());
  };

  const cancelEdit = () => {
    setEditingItemIndex(null);
    setEditProductId('');
    setEditQuantity('');
    setEditUnitPrice('');
    setEditDiscount('');
  };

  const saveEdit = () => {
    if (editingItemIndex === null) return;

    if (!editProductId || !editQuantity || !editUnitPrice) {
      toast.error('Please fill all required fields');
      return;
    }

    if (!selectedLocation) {
      toast.error('Please select a location first');
      return;
    }

    const product = products?.find((p: any) => p.id === Number(editProductId));

    // Check stock for sales
    if (invoiceType === 'sales') {
      const stock = locationStock?.find((s: any) => s.product_id === Number(editProductId));
      if (!stock || stock.quantity < Number(editQuantity)) {
        toast.error('Insufficient stock in selected location');
        return;
      }
    }

    const itemTotal = Number(editQuantity) * Number(editUnitPrice);
    const discountAmount = itemTotal * (Number(editDiscount) || 0) / 100;
    const finalTotal = itemTotal - discountAmount;

    const updatedItem: InvoiceItem = {
      product_id: Number(editProductId),
      product_name: product?.name_ar || product?.name_en || product?.name || 'Unknown Product',
      quantity: Number(editQuantity),
      unit_price: Number(editUnitPrice),
      discount_percent: Number(editDiscount) || 0,
      total: finalTotal,
    };

    const newItems = [...invoiceItems];
    newItems[editingItemIndex] = updatedItem;
    setInvoiceItems(newItems);
    cancelEdit();
  };

  const calculateTotal = () => {
    return invoiceItems.reduce((sum, item) => sum + (item.total || 0), 0);
  };

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!selectedLocation) {
      newErrors.location = 'Location is required';
    }

    if (invoiceItems.length === 0) {
      newErrors.items = 'Please add at least one item to the invoice';
    }

    if (paidAmount && Number(paidAmount) < 0) {
      newErrors.paidAmount = 'Paid amount cannot be negative';
    }

    if (paidAmount && Number(paidAmount) > calculateTotal()) {
      newErrors.paidAmount = 'Paid amount cannot exceed total amount';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Please fix the errors before submitting');
      return;
    }

    const invoiceData: any = {
      location_id: Number(selectedLocation),
      invoice_date: invoiceDate,
      items: invoiceItems.map(item => ({
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        discount_percent: item.discount_percent || 0,
      })),
      paid_amount: Number(paidAmount) || 0,
      payment_method: paymentMethod,
      reference_number: referenceNumber || undefined,
      notes: notes || undefined,
    };

    if (invoiceType === 'sales' && selectedCustomer) {
      invoiceData.customer_id = Number(selectedCustomer);
    } else if (invoiceType === 'purchase' && selectedVendor) {
      invoiceData.vendor_id = Number(selectedVendor);
    }

    createInvoiceMutation.mutate(invoiceData);
  };

  const total = calculateTotal();
  const remaining = total - (Number(paidAmount) || 0);

  const locationOptions = locations?.map((loc: any) => ({
    value: loc.id.toString(),
    label: `${loc.name} (${loc.type})`,
  })) || [];

  const customerOptions = customers?.map((customer: any) => ({
    value: customer.id.toString(),
    label: customer.name,
  })) || [];

  const vendorOptions = vendors?.map((vendor: any) => ({
    value: vendor.id.toString(),
    label: vendor.company_name || vendor.name,
  })) || [];

  const productOptions = products?.map((product: any) => {
    const stock = locationStock?.find((s: any) => s.product_id === product.id);
    const stockInfo = selectedLocation ? ` (Stock: ${stock?.quantity || 0})` : '';
    return {
      value: product.id.toString(),
      label: `${product.name_ar || product.name_en || product.name || 'Unknown Product'}${stockInfo}`,
    };
  }) || [];

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/invoices/${invoiceType}`)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            {invoiceType === 'purchase' ? (
              <><Package className="h-8 w-8 text-blue-600" /> New Purchase Invoice</>
            ) : (
              <><ShoppingCart className="h-8 w-8 text-green-600" /> New Sales Invoice</>
            )}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {invoiceType === 'purchase'
              ? 'Create a purchase invoice - adds stock to selected location'
              : 'Create a sales invoice - reduces stock from selected location'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Invoice Details */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle>Invoice Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="location">Location *</Label>
                      <Combobox
                        options={[
                          { value: '', label: 'Select location...' },
                          ...locationOptions,
                        ]}
                        value={selectedLocation}
                        onChange={(value) => {
                          setSelectedLocation(value);
                          setErrors({ ...errors, location: '' });
                          setInvoiceItems([]); // Clear items when changing location
                          cancelEdit(); // Cancel any ongoing edits
                        }}
                        placeholder="Select location"
                        searchPlaceholder="Search locations..."
                        emptyText="No locations found"
                      />
                      {errors.location && (
                        <p className="text-sm text-red-600 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {errors.location}
                        </p>
                      )}
                    </div>

                    {invoiceType === 'purchase' && (
                      <div className="space-y-2">
                        <Label htmlFor="invoiceDate">Invoice Date *</Label>
                        <Input
                          id="invoiceDate"
                          type="date"
                          value={invoiceDate}
                          onChange={(e) => setInvoiceDate(e.target.value)}
                          className="h-11"
                        />
                      </div>
                    )}

                    {invoiceType === 'sales' && (
                      <div className="space-y-2">
                        <Label htmlFor="customer">Customer</Label>
                        <Combobox
                          options={[
                            { value: '', label: 'Select customer (optional)...' },
                            ...customerOptions,
                          ]}
                          value={selectedCustomer}
                          onChange={setSelectedCustomer}
                          onSearchChange={setCustomerSearch}
                          placeholder="Select customer"
                          searchPlaceholder="Search customers..."
                          emptyText="No customers found"
                        />
                      </div>
                    )}

                    {invoiceType === 'purchase' && (
                      <div className="space-y-2">
                        <Label htmlFor="vendor">Vendor</Label>
                        <Combobox
                          options={[
                            { value: '', label: 'Select vendor (optional)...' },
                            ...vendorOptions,
                          ]}
                          value={selectedVendor}
                          onChange={setSelectedVendor}
                          onSearchChange={setVendorSearch}
                          placeholder="Select vendor"
                          searchPlaceholder="Search vendors..."
                          emptyText="No vendors found"
                        />
                      </div>
                    )}

                    {invoiceType === 'sales' && (
                      <div className="space-y-2">
                        <Label htmlFor="invoiceDate">Invoice Date *</Label>
                        <Input
                          id="invoiceDate"
                          type="date"
                          value={invoiceDate}
                          onChange={(e) => setInvoiceDate(e.target.value)}
                          className="h-11"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Items Table */}
            <Card className="border-0 shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Invoice Items</CardTitle>
                {errors.items && (
                  <p className="text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.items}
                  </p>
                )}
              </CardHeader>
              <CardContent>
                {!selectedLocation ? (
                  <div className="text-center py-12 bg-gray-50 dark:bg-gray-800/50 rounded-lg border-2 border-dashed">
                    <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 dark:text-gray-400">Please select a location to start adding items</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[300px]">Product</TableHead>
                          <TableHead className="w-[100px]">Quantity</TableHead>
                          <TableHead className="w-[150px]">Unit Price</TableHead>
                          <TableHead className="w-[100px]">Discount %</TableHead>
                          <TableHead className="w-[120px]">Total</TableHead>
                          <TableHead className="w-[80px] text-center">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {invoiceItems.map((item, index) => (
                          <TableRow key={index}>
                            <TableCell>
                              {editingItemIndex === index ? (
                                <Combobox
                                  options={[
                                    { value: '', label: 'Select product...' },
                                    ...productOptions,
                                  ]}
                                  value={editProductId}
                                  onChange={(value) => {
                                    setEditProductId(value);
                                    if (value) {
                                      const product = products?.find((p: any) => p.id.toString() === value);
                                      if (product) {
                                        const price = invoiceType === 'sales' ? product.unit_price : product.cost_price;
                                        setEditUnitPrice(price?.toString() || '');
                                      }
                                    }
                                  }}
                                  placeholder="Select product"
                                  searchPlaceholder="Search products..."
                                  emptyText="No products found"
                                />
                              ) : (
                                <div className="font-medium">{item.product_name}</div>
                              )}
                            </TableCell>
                            <TableCell>
                              {editingItemIndex === index ? (
                                <Input
                                  type="number"
                                  min="0.01"
                                  step="0.01"
                                  value={editQuantity}
                                  onChange={(e) => setEditQuantity(e.target.value)}
                                />
                              ) : (
                                Number(item.quantity).toFixed(2)
                              )}
                            </TableCell>
                            <TableCell>
                              {editingItemIndex === index ? (
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={editUnitPrice}
                                  onChange={(e) => setEditUnitPrice(e.target.value)}
                                />
                              ) : (
                                formatCurrency(item.unit_price)
                              )}
                            </TableCell>
                            <TableCell>
                              {editingItemIndex === index ? (
                                <Input
                                  type="number"
                                  min="0"
                                  max="100"
                                  step="0.01"
                                  value={editDiscount}
                                  onChange={(e) => setEditDiscount(e.target.value)}
                                />
                              ) : (
                                `${Number(item.discount_percent || 0).toFixed(2)}%`
                              )}
                            </TableCell>
                            <TableCell className="font-semibold text-primary">
                              {editingItemIndex === index ? (
                                formatCurrency((Number(editQuantity) || 0) * (Number(editUnitPrice) || 0) * (1 - (Number(editDiscount) || 0) / 100))
                              ) : (
                                formatCurrency(item.total || 0)
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2 justify-center">
                                {editingItemIndex === index ? (
                                  <>
                                    <Button
                                      type="button"
                                      size="sm"
                                      onClick={saveEdit}
                                      className="p-1 h-8 w-8"
                                    >
                                      <Save className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="outline"
                                      onClick={cancelEdit}
                                      className="p-1 h-8 w-8 text-gray-500"
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </>
                                ) : (
                                  <>
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => startEdit(index)}
                                      className="p-1 h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                    >
                                      <Edit2 className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => handleRemoveItem(index)}
                                      className="p-1 h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}

                        {/* New Item Row (Auto-add) */}
                        <TableRow className="bg-muted/30">
                          <TableCell>
                            <Combobox
                              options={[
                                { value: '', label: 'Search and add product...' },
                                ...productOptions,
                              ]}
                              value={selectedProduct}
                              onChange={(value) => {
                                if (value) {
                                  // Auto-add product when selected
                                  const prod = products?.find((p: any) => p.id.toString() === value);
                                  if (prod) {
                                    const price = invoiceType === 'sales' ? prod.unit_price : prod.cost_price;

                                    // Default values for auto-add
                                    const qty = 1;
                                    const disc = 0;

                                    // Stock check for sales
                                    if (invoiceType === 'sales') {
                                      const stock = locationStock?.find((s: any) => s.product_id === prod.id);
                                      if (!stock || stock.quantity < qty) {
                                        toast.error('Insufficient stock in selected location');
                                        return;
                                      }
                                    }

                                    const itemTotal = qty * (price || 0);
                                    const finalTotal = itemTotal - (itemTotal * disc / 100);

                                    const newItem: InvoiceItem = {
                                      product_id: prod.id,
                                      product_name: prod.name_ar || prod.name_en || prod.name || 'Unknown Product',
                                      quantity: qty,
                                      unit_price: price || 0,
                                      discount_percent: disc,
                                      total: finalTotal,
                                    };

                                    setInvoiceItems([...invoiceItems, newItem]);
                                    setErrors({ ...errors, items: '' });
                                    // Clear product search to be ready for next one
                                    setProductSearch('');
                                    setSelectedProduct('');
                                  }
                                }
                              }}
                              onSearchChange={setProductSearch}
                              placeholder="Type to search product..."
                              searchPlaceholder="Search products by SKU or Name..."
                              emptyText="No products found"
                              className="border-none bg-transparent shadow-none"
                            />
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">-</TableCell>
                          <TableCell className="text-muted-foreground text-sm">-</TableCell>
                          <TableCell className="text-muted-foreground text-sm">-</TableCell>
                          <TableCell className="text-muted-foreground text-sm">-</TableCell>
                          <TableCell className="text-center">
                            <Package className="h-4 w-4 text-muted-foreground mx-auto" />
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Notes */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle>Additional Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    placeholder="Add any additional notes..."
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Summary Sidebar */}
          <div className="space-y-6">
            <Card className="border-0 shadow-lg sticky top-6">
              <CardHeader>
                <CardTitle>Payment & Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="paymentMethod">Payment Method</Label>
                  <select
                    id="paymentMethod"
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="cash">Cash</option>
                    <option value="card">Card</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="check">Check</option>
                  </select>
                </div>

                {paymentMethod !== 'cash' && (
                  <div className="space-y-2">
                    <Label htmlFor="referenceNumber">Reference Number</Label>
                    <Input
                      id="referenceNumber"
                      value={referenceNumber}
                      onChange={(e) => setReferenceNumber(e.target.value)}
                      className="h-11"
                      placeholder="Transaction reference"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="paidAmount">Paid Amount</Label>
                  <Input
                    id="paidAmount"
                    type="number"
                    step="0.01"
                    min="0"
                    max={total}
                    value={paidAmount}
                    onChange={(e) => { setPaidAmount(e.target.value); setErrors({ ...errors, paidAmount: '' }) }}
                    className={`h-11 ${errors.paidAmount ? 'border-red-500' : ''}`}
                  />
                  {errors.paidAmount && (
                    <p className="text-sm text-red-600 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.paidAmount}
                    </p>
                  )}
                </div>

                <div className="border-t pt-4 space-y-2">
                  <div className="flex justify-between text-lg">
                    <span className="font-medium">Subtotal:</span>
                    <span className="font-bold">{formatCurrency(total)}</span>
                  </div>
                  <div className="flex justify-between text-lg">
                    <span className="font-medium">Paid:</span>
                    <span className="font-bold text-green-600">{formatCurrency(Number(paidAmount) || 0)}</span>
                  </div>
                  <div className="flex justify-between text-xl border-t pt-2">
                    <span className="font-bold">Remaining:</span>
                    <span className={`font-bold ${remaining > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {formatCurrency(remaining)}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-3 pt-4">
                  <Button
                    type="submit"
                    disabled={createInvoiceMutation.isPending || invoiceItems.length === 0}
                    size="lg"
                    className="w-full"
                  >
                    <Save className="mr-2 h-4 w-4" />
                    {createInvoiceMutation.isPending ? 'Creating...' : 'Create Invoice'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate(`/invoices/${invoiceType}`)}
                    size="lg"
                    className="w-full"
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
}
