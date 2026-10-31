import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Save, Trash2, ShoppingCart, Package, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Page, PageHeader } from '@/components/layout/Page';
import { Combobox } from '@/components/ui/combobox';
import { invoiceApi, productApi, locationApi, customerApi, stockApi, vendorApi } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { DatePicker } from '@/components/ui/date-picker';

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

  const selectedLocationRef = useRef(selectedLocation);
  useEffect(() => {
    selectedLocationRef.current = selectedLocation;
  }, [selectedLocation]);

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

          if (!selectedLocationRef.current) {
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

      if (data.location_id) setSelectedLocation(data.location_id.toString());
      if (invoiceType === 'sales' && data.customer_id) setSelectedCustomer(data.customer_id.toString());
      if (invoiceType === 'purchase' && data.vendor_id) setSelectedVendor(data.vendor_id.toString());

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
      if (prod && invoiceItems.some((other, i) => i !== index && other.product_id === prod.id)) {
        toast.error(`${prod.name_ar || prod.name_en || 'This product'} is already on this invoice`);
        return;
      }
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

    // One line per product (also catches lines filled in by the AI assistant or an older edit).
    const seen = new Set<number>();
    const duplicate = invoiceItems.find((item) => {
      if (!item.product_id) return false;
      if (seen.has(item.product_id)) return true;
      seen.add(item.product_id);
      return false;
    });
    if (duplicate) {
      newErrors.items = `${duplicate.product_name} appears more than once — combine the quantities into one line`;
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

  const isPurchase = invoiceType === 'purchase';
  const lineGrid = 'md:grid md:grid-cols-[minmax(0,1fr)_84px_104px_76px_100px_36px] md:items-center md:gap-2';
  const numberInput = 'h-8 text-end tabular-nums';
  const itemCount = invoiceItems.length;

  const addProduct = (value: string) => {
    if (!value) return;
    const prod = products?.find((p: any) => p.id.toString() === value);
    if (!prod) return;
    setProductSearch('');
    setSelectedProduct('');

    // Already on the invoice: bump that line instead of adding a second one.
    const existingIndex = invoiceItems.findIndex((item) => item.product_id === prod.id);
    if (existingIndex !== -1) {
      const existing = invoiceItems[existingIndex];
      handleItemChange(existingIndex, 'quantity', (Number(existing.quantity) || 0) + 1);
      toast.info(`${existing.product_name} is already on this invoice — quantity increased`);
      return;
    }

    const price = isPurchase ? prod.cost_price : prod.unit_price;
    const newItem: InvoiceItem = {
      product_id: prod.id,
      product_name: prod.name_ar || prod.name_en || prod.name || 'Unknown Product',
      quantity: 0,
      unit_price: price || 0,
      discount_percent: 0,
      total: 0,
    };
    setInvoiceItems([...invoiceItems, newItem]);
    setErrors({ ...errors, items: '' });
    setProductSearch('');
    setSelectedProduct('');
  };

  return (
    <Page className="max-w-[1400px]">
      <PageHeader
        backTo={`/invoices/${invoiceType}`}
        icon={isPurchase ? Package : ShoppingCart}
        title={
          isEdit
            ? `Edit ${isPurchase ? 'Purchase' : 'Sales'} Invoice ${invoiceToEdit?.invoice_number ? `#${invoiceToEdit.invoice_number}` : ''}`
            : `New ${isPurchase ? 'Purchase' : 'Sales'} Invoice`
        }
        description={
          isEdit && invoiceToEdit?.location_name
            ? `Location: ${invoiceToEdit.location_name}`
            : isPurchase
              ? 'Adds stock to the selected location'
              : 'Reduces stock at the selected location'
        }
      />

      <form onSubmit={handleSubmit}>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="min-w-0 space-y-4">
            {/* Details */}
            <Card>
              <CardContent className="grid gap-4 p-4 sm:grid-cols-2 xl:grid-cols-3">
                <div className="space-y-1.5">
                  <Label htmlFor="location">Location *</Label>
                  <Combobox
                    options={[{ value: '', label: 'Select location...' }, ...locationOptions]}
                    value={selectedLocation}
                    onChange={(value) => {
                      setSelectedLocation(value);
                      setErrors({ ...errors, location: '' });
                      setInvoiceItems([]);
                    }}
                    placeholder="Select location"
                    searchPlaceholder="Search locations..."
                    emptyText="No locations found"
                  />
                  {errors.location && (
                    <p className="flex items-center gap-1 text-xs text-red-600">
                      <AlertCircle className="h-3 w-3" />
                      {errors.location}
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label>{isPurchase ? 'Vendor' : 'Customer'}</Label>
                  {isPurchase ? (
                    <Combobox
                      options={[{ value: '', label: 'Select vendor (optional)...' }, ...vendorOptions]}
                      value={selectedVendor}
                      onChange={setSelectedVendor}
                      clearable
                      onSearchChange={setVendorSearch}
                      placeholder="Select vendor"
                      searchPlaceholder="Search vendors..."
                      emptyText="No vendors found"
                    />
                  ) : (
                    <Combobox
                      options={[{ value: '', label: 'Walk-in customer' }, ...customerOptions]}
                      value={selectedCustomer}
                      onChange={setSelectedCustomer}
                      clearable
                      onSearchChange={setCustomerSearch}
                      placeholder="Walk-in customer"
                      searchPlaceholder="Search customers..."
                      emptyText="No customers found"
                    />
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="invoiceDate">Invoice date *</Label>
                  <DatePicker id="invoiceDate" value={invoiceDate} onChange={setInvoiceDate} />
                </div>
              </CardContent>
            </Card>

            {/* Line items */}
            <Card>
              <div className="flex items-center justify-between border-b px-4 py-3">
                <h2 className="text-sm font-semibold">
                  Items {itemCount > 0 && <span className="ms-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">{itemCount}</span>}
                </h2>
                {errors.items && (
                  <p className="flex items-center gap-1 text-xs text-red-600">
                    <AlertCircle className="h-3 w-3" />
                    {errors.items}
                  </p>
                )}
              </div>

              {!selectedLocation ? (
                <div className="m-4 rounded-lg border-2 border-dashed py-10 text-center">
                  <Package className="mx-auto mb-2 h-8 w-8 text-muted-foreground/50" aria-hidden />
                  <p className="text-sm text-muted-foreground">Select a location to start adding items</p>
                </div>
              ) : (
                <div>
                  <div className={`hidden border-b bg-muted/40 px-4 py-2 text-xs font-medium text-muted-foreground ${lineGrid}`}>
                    <span>Product</span>
                    <span className="text-end">Qty</span>
                    <span className="text-end">Unit price</span>
                    <span className="text-end">Disc. %</span>
                    <span className="text-end">Total</span>
                    <span />
                  </div>

                  <div className="divide-y">
                    {invoiceItems.map((item, index) => (
                      <div key={index} className={`space-y-2 px-4 py-2.5 md:space-y-0 ${lineGrid}`}>
                        <div className="min-w-0">
                          <Combobox
                            options={[
                              { value: '0', label: 'Select matching product...' },
                              ...productOptions,
                              ...(item.product_id && !productOptions.some((p: any) => p.value === item.product_id?.toString())
                                ? [{ value: item.product_id.toString(), label: item.product_name || 'Selected product' }]
                                : []),
                            ]}
                            value={item.product_id?.toString() || ''}
                            onChange={(val) => handleItemChange(index, 'product_id', val)}
                            onSearchChange={setProductSearch}
                            placeholder="Select product"
                            className="h-8"
                          />
                          {(!item.product_id || item.product_id === 0) && (
                            <p className="mt-1 rounded border border-orange-200 bg-orange-50 px-2 py-0.5 text-[11px] italic text-orange-700 dark:border-orange-900/50 dark:bg-orange-500/10 dark:text-orange-300">
                              From AI: {item.product_name} (not matched)
                            </p>
                          )}
                        </div>
                        <div className="grid grid-cols-3 gap-2 md:contents">
                          <label className="space-y-1 md:space-y-0">
                            <span className="text-xs text-muted-foreground md:hidden">Qty</span>
                            <Input type="number" min="0" step="0.01" aria-label="Quantity" value={item.quantity} onChange={(e) => handleItemChange(index, 'quantity', e.target.value)} className={numberInput} />
                          </label>
                          <label className="space-y-1 md:space-y-0">
                            <span className="text-xs text-muted-foreground md:hidden">Unit price</span>
                            <Input type="number" min="0" step="0.01" aria-label="Unit price" value={item.unit_price} onChange={(e) => handleItemChange(index, 'unit_price', e.target.value)} className={numberInput} />
                          </label>
                          <label className="space-y-1 md:space-y-0">
                            <span className="text-xs text-muted-foreground md:hidden">Disc. %</span>
                            <Input type="number" min="0" max="100" step="0.01" aria-label="Discount percent" value={item.discount_percent} onChange={(e) => handleItemChange(index, 'discount_percent', e.target.value)} className={numberInput} />
                          </label>
                        </div>
                        <div className="flex items-center justify-between md:contents">
                          <span className="text-end text-sm font-semibold tabular-nums">{formatCurrency(item.total || 0)}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(index)}
                            aria-label="Remove item"
                            title="Remove item"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}

                    <div className="flex items-center gap-2 bg-muted/20 px-4 py-2.5">
                      <Plus className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                      <div className="min-w-0 flex-1">
                        <Combobox
                          options={[{ value: '', label: 'Search and add product...' }, ...productOptions]}
                          value={selectedProduct}
                          onChange={addProduct}
                          onSearchChange={setProductSearch}
                          placeholder="Add a product — type to search by name or SKU"
                          searchPlaceholder="Search products by SKU or name..."
                          emptyText="No products found"
                          className="h-8 border-dashed"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </Card>

            {/* Notes */}
            <Card>
              <CardContent className="space-y-1.5 p-4">
                <Label htmlFor="notes">Notes</Label>
                <textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  placeholder="Optional notes shown on the invoice"
                />
              </CardContent>
            </Card>
          </div>

          {/* Summary */}
          <div>
            <Card className="lg:sticky lg:top-4">
              <div className="border-b px-4 py-3">
                <h2 className="text-sm font-semibold">Payment & summary</h2>
              </div>
              <CardContent className="space-y-4 p-4">
                <div className="space-y-1.5">
                  <Label htmlFor="paymentMethod">Payment method</Label>
                  <select
                    id="paymentMethod"
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="cash">Cash</option>
                    <option value="card">Card</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="check">Check</option>
                  </select>
                </div>

                {paymentMethod !== 'cash' && (
                  <div className="space-y-1.5">
                    <Label htmlFor="referenceNumber">Reference number</Label>
                    <Input id="referenceNumber" value={referenceNumber} onChange={(e) => setReferenceNumber(e.target.value)} placeholder="Transaction reference" />
                  </div>
                )}

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="paidAmount">Amount paid</Label>
                    {total > 0 && (
                      <button
                        type="button"
                        className="text-xs font-medium text-primary hover:underline"
                        onClick={() => {
                          setPaidAmount(total.toFixed(2));
                          setErrors({ ...errors, paidAmount: '' });
                        }}
                      >
                        Paid in full
                      </button>
                    )}
                  </div>
                  <Input
                    id="paidAmount"
                    type="number"
                    step="0.01"
                    min="0"
                    max={total}
                    value={paidAmount}
                    onChange={(e) => {
                      setPaidAmount(e.target.value);
                      setErrors({ ...errors, paidAmount: '' });
                    }}
                    className={`text-end tabular-nums ${errors.paidAmount ? 'border-red-500' : ''}`}
                  />
                  {errors.paidAmount && (
                    <p className="flex items-center gap-1 text-xs text-red-600">
                      <AlertCircle className="h-3 w-3" />
                      {errors.paidAmount}
                    </p>
                  )}
                </div>

                <dl className="space-y-2 rounded-lg bg-muted/40 p-3 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Items</dt>
                    <dd className="tabular-nums">{itemCount}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Total</dt>
                    <dd className="font-semibold tabular-nums">{formatCurrency(total)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Paid</dt>
                    <dd className="tabular-nums text-emerald-600 dark:text-emerald-400">{formatCurrency(Number(paidAmount) || 0)}</dd>
                  </div>
                  <div className="flex items-center justify-between border-t pt-2">
                    <dt className="font-medium">{remaining > 0.009 ? 'Balance due' : 'Fully paid'}</dt>
                    <dd className={`text-lg font-semibold tabular-nums ${remaining > 0.009 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                      {formatCurrency(Math.max(remaining, 0))}
                    </dd>
                  </div>
                </dl>

                <div className="space-y-2">
                  {isEdit && (
                    <Button type="submit" onClick={(e) => handleSubmit(e, 'finalized')} disabled={createInvoiceMutation.isPending || invoiceItems.length === 0} className="w-full">
                      <Save className="me-1.5 h-4 w-4" />
                      {createInvoiceMutation.isPending ? 'Saving…' : 'Save & Finalize'}
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant={isEdit ? 'outline' : 'default'}
                    onClick={(e) => handleSubmit(e, 'draft')}
                    disabled={createInvoiceMutation.isPending || invoiceItems.length === 0}
                    className="w-full"
                  >
                    <Save className="me-1.5 h-4 w-4" />
                    {createInvoiceMutation.isPending ? 'Saving…' : 'Save as Draft'}
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => navigate(`/invoices/${invoiceType}`)} className="w-full text-muted-foreground">
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </Page>
  );
}
