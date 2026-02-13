import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowLeft, Save, Trash2, ShoppingCart, Package, AlertCircle, MapPin } from 'lucide-react';
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
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;

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

  // Fetch invoice details if editing
  const { data: invoiceToEdit, isLoading: isLoadingInvoice } = useQuery({
    queryKey: ['invoice', id],
    queryFn: async () => {
      if (!id) return null;
      const response = await invoiceApi.getById(Number(id), invoiceType);
      return response.data.data;
    },
    enabled: isEdit,
  });

  // Load invoice data into state when editing
  useEffect(() => {
    if (invoiceToEdit) {
      setSelectedLocation(invoiceToEdit.location_id?.toString() || '');
      setInvoiceDate(new Date(invoiceToEdit.invoice_date || invoiceToEdit.created_at).toISOString().split('T')[0]);
      setNotes(invoiceToEdit.notes || '');
      setPaidAmount(invoiceToEdit.paid_amount?.toString() || '');
      setPaymentMethod(invoiceToEdit.payment_method || 'cash');
      setReferenceNumber(invoiceToEdit.reference_number || '');

      if (invoiceType === 'sales') {
        setSelectedCustomer(invoiceToEdit.customer_id?.toString() || '');
      } else {
        setSelectedVendor(invoiceToEdit.vendor_id?.toString() || '');
      }

      if (invoiceToEdit.items) {
        setInvoiceItems(invoiceToEdit.items.map((item: any) => ({
          product_id: item.product_id,
          product_name: item.product?.name_ar || item.product?.name_en || item.product_name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          discount_percent: item.discount_percent || 0,
          total: item.total
        })));
      }
    }
  }, [invoiceToEdit, invoiceType]);

  // Listen for chatbot events
  useEffect(() => {
    const handleFillInvoice = (event: any) => {
      console.log("InvoiceFormNew: Received fill-invoice event", event.detail);
      const data = event.detail;
      if (!data) return;

      if (data.items && Array.isArray(data.items)) {
        console.log("InvoiceFormNew: Adding items", data.items);
        const newItems: InvoiceItem[] = data.items.map((item: any) => ({
          product_id: item.product_id || 0,
          product_name: item.system_name || item.name || 'Unknown Product',
          quantity: Number(item.quantity) || 0,
          unit_price: Number(item.unit_price) || 0,
          discount_percent: Number(item.discount_percent) || 0,
          total: (Number(item.quantity) || 0) * (Number(item.unit_price) || 0) * (1 - (Number(item.discount_percent) || 0) / 100)
        }));
        setInvoiceItems(prev => {
          const updated = [...prev, ...newItems];
          console.log("InvoiceFormNew: Updated items state", updated);

          if (!selectedLocation) {
            toast.warning("Items added! Please select a Location to see them in the table.");
          } else {
            toast.success(`Successfully added ${newItems.length} items`);
          }

          return updated;
        });
      }

      if (data.notes) setNotes(prev => prev ? `${prev}\n${data.notes}` : data.notes);
      if (data.paid_amount) setPaidAmount(data.paid_amount.toString());
      if (data.payment_method) setPaymentMethod(data.payment_method);
      if (data.invoice_number) setReferenceNumber(data.invoice_number);

      toast.info(`Extracted ${data.items?.length || 0} items from AI`);
    };

    window.addEventListener('fill-invoice', handleFillInvoice);
    return () => window.removeEventListener('fill-invoice', handleFillInvoice);
  }, []);

  // No longer using separate editing state as cells are always editable

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

  // Auto-select first location if only one exists or when one is loaded
  useEffect(() => {
    if (locations?.length > 0 && !selectedLocation) {
      setSelectedLocation(locations[0].id.toString());
    }
  }, [locations, selectedLocation]);

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
      if (isEdit) {
        return invoiceApi.update(Number(id), data, invoiceType);
      }
      return invoiceType === 'purchase'
        ? invoiceApi.createPurchase(data)
        : invoiceApi.createSales(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['location-stock'] });
      if (isEdit) {
        queryClient.invalidateQueries({ queryKey: [invoiceType === 'purchase' ? 'purchase-invoice' : 'sales-invoice', id] });
      }
      toast.success(`${invoiceType === 'purchase' ? 'Purchase' : 'Sales'} invoice ${isEdit ? 'updated' : 'created'} successfully`);
      navigate(`/invoices/${invoiceType}`);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create invoice');
    },
  });


  const handleRemoveItem = (index: number) => {
    setInvoiceItems(invoiceItems.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const newItems = [...invoiceItems];
    const item = { ...newItems[index] };

    if (field === 'quantity') item.quantity = Number(value);
    if (field === 'unit_price') item.unit_price = Number(value);
    if (field === 'discount_percent') item.discount_percent = Number(value);

    if (field === 'product_id') {
      const prod = products?.find((p: any) => p.id.toString() === value);
      if (prod) {
        item.product_id = prod.id;
        item.product_name = prod.name_ar || prod.name_en || prod.name;
        // Optionally update price if user switches product
        item.unit_price = invoiceType === 'sales' ? (prod.unit_price || 0) : (prod.cost_price || 0);
      }
    }

    // Recalculate total for this item
    const itemTotal = item.quantity * item.unit_price;
    const discountAmount = itemTotal * (item.discount_percent || 0) / 100;
    item.total = itemTotal - discountAmount;

    newItems[index] = item;
    setInvoiceItems(newItems);
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
    } else {
      const hasZeroQty = invoiceItems.some(item => (item.quantity || 0) <= 0);
      if (hasZeroQty) {
        newErrors.items = 'All items must have a quantity greater than zero';
      } else if (invoiceType === 'sales') {
        // Check stock for all items
        for (const item of invoiceItems) {
          const stock = locationStock?.find((s: any) => s.product_id === item.product_id);
          if (!stock || stock.quantity < item.quantity) {
            newErrors.items = `Insufficient stock for ${item.product_name} (Available: ${stock?.quantity || 0})`;
            break;
          }
        }
      }
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

  const handleSubmit = (e: React.FormEvent, status: 'draft' | 'finalized' = 'finalized') => {
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
      status: status,
    };

    if (invoiceType === 'sales' && selectedCustomer) {
      invoiceData.customer_id = Number(selectedCustomer);
    } else if (invoiceType === 'purchase' && selectedVendor) {
      invoiceData.vendor_id = Number(selectedVendor);
    }

    createInvoiceMutation.mutate(invoiceData);
  };

  if (isEdit && isLoadingInvoice) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <p className="ml-3 text-muted-foreground">Loading invoice details...</p>
      </div>
    );
  }

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
    <div className="space-y-6 p-6  mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/invoices/${invoiceType}`)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            {invoiceType === 'purchase' ? (
              <><Package className="h-8 w-8 text-blue-600" /> {isEdit ? `Edit Purchase Invoice #${invoiceToEdit?.invoice_number}` : 'New Purchase Invoice'}</>
            ) : (
              <><ShoppingCart className="h-8 w-8 text-green-600" /> {isEdit ? `Edit Sales Invoice #${invoiceToEdit?.invoice_number}` : 'New Sales Invoice'}</>
            )}
          </h1>
          {isEdit && invoiceToEdit?.location_name && (
            <div className="flex items-center gap-2 text-muted-foreground mt-2 bg-muted/30 w-fit px-3 py-1 rounded-full border">
              <MapPin className="h-4 w-4" />
              <span className="text-sm font-medium">Location: {invoiceToEdit.location_name}</span>
            </div>
          )}
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
                            <TableCell className="min-w-[250px]">
                              <div className="space-y-1">
                                <Combobox
                                  options={[
                                    { value: '0', label: 'Select matching product...' },
                                    ...productOptions,
                                    // Ensure current product is always in options so label shows correctly
                                    ...(item.product_id && !productOptions.some((p: any) => p.value === item.product_id?.toString())
                                      ? [{ value: item.product_id.toString(), label: item.product_name || 'Selected product' }]
                                      : [])
                                  ]}
                                  value={item.product_id?.toString() || ''}
                                  onChange={(val) => handleItemChange(index, 'product_id', val)}
                                  onSearchChange={setProductSearch}
                                  placeholder="Select product"
                                  className="h-9"
                                />
                                {(!item.product_id || item.product_id === 0) && (
                                  <div className="text-[10px] text-orange-600 bg-orange-50 px-2 py-0.5 rounded border border-orange-100 italic">
                                    From AI: {item.product_name} (Not matched)
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={item.quantity}
                                onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                                className="h-9"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                value={item.unit_price}
                                onChange={(e) => handleItemChange(index, 'unit_price', e.target.value)}
                                className="h-9"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                min="0"
                                max="100"
                                step="0.01"
                                value={item.discount_percent}
                                onChange={(e) => handleItemChange(index, 'discount_percent', e.target.value)}
                                className="h-9"
                              />
                            </TableCell>
                            <TableCell className="font-semibold text-primary">
                              {formatCurrency(item.total || 0)}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2 justify-center">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleRemoveItem(index)}
                                  className="p-1 h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
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
                                    const qty = 0;
                                    const disc = 0;

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
                  {isEdit ? (
                    <Button
                      type="submit"
                      onClick={(e) => handleSubmit(e, 'finalized')}
                      disabled={createInvoiceMutation.isPending || invoiceItems.length === 0}
                      size="lg"
                      className="w-full bg-blue-600 hover:bg-blue-700 font-bold"
                    >
                      <Save className="mr-2 h-4 w-4" />
                      {createInvoiceMutation.isPending ? 'Saving...' : 'Save & Finalize'}
                    </Button>
                  ) : null}

                  <Button
                    type="button"
                    variant={isEdit ? "outline" : "default"}
                    onClick={(e) => handleSubmit(e, 'draft')}
                    disabled={createInvoiceMutation.isPending || invoiceItems.length === 0}
                    size="lg"
                    className={`w-full ${!isEdit ? 'bg-blue-600 hover:bg-blue-700 font-bold' : 'border-blue-600 text-blue-600 hover:bg-blue-50'}`}
                  >
                    <Save className="mr-2 h-4 w-4" />
                    {createInvoiceMutation.isPending ? 'Saving...' : 'Save as Draft'}
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
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
