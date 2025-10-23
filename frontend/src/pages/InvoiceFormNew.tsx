import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowLeft, Save, Plus, Trash2, ShoppingCart, Package, AlertCircle } from 'lucide-react';
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
  const [quantity, setQuantity] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [discount, setDiscount] = useState('');
  const [paidAmount, setPaidAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [productSearch, setProductSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(productSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [productSearch]);

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
      const response = await productApi.getAll({ search: debouncedSearch });
      const apiData = response.data.data || response.data;
      return Array.isArray(apiData) ? apiData : (apiData.data || []);
    },
  });

  const { data: customers } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const response = await customerApi.getAll();
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
      navigate('/invoices');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create invoice');
    },
  });

  // Auto-fill unit price when product is selected
  useEffect(() => {
    if (selectedProduct) {
      const product = products?.find((p: any) => p.id === Number(selectedProduct));
      if (product) {
        setUnitPrice(invoiceType === 'purchase' ? product.cost_price : product.unit_price);
      }
    }
  }, [selectedProduct, products, invoiceType]);

  const handleAddItem = () => {
    if (!selectedProduct || !quantity || !unitPrice) {
      toast.error('Please fill all item fields');
      return;
    }

    if (!selectedLocation) {
      toast.error('Please select a location first');
      return;
    }

    const product = products?.find((p: any) => p.id === Number(selectedProduct));
    
    // Check stock for sales
    if (invoiceType === 'sales') {
      const stock = locationStock?.find((s: any) => s.product_id === Number(selectedProduct));
      if (!stock || stock.quantity < Number(quantity)) {
        toast.error('Insufficient stock in selected location');
        return;
      }
    }

    const itemTotal = Number(quantity) * Number(unitPrice);
    const discountAmount = itemTotal * (Number(discount) || 0) / 100;
    const finalTotal = itemTotal - discountAmount;

    const newItem: InvoiceItem = {
      product_id: Number(selectedProduct),
      product_name: product?.name_en,
      quantity: Number(quantity),
      unit_price: Number(unitPrice),
      discount_percent: Number(discount) || 0,
      total: finalTotal,
    };

    setInvoiceItems([...invoiceItems, newItem]);
    setSelectedProduct('');
    setQuantity('');
    setUnitPrice('');
    setDiscount('');
  };

  const handleRemoveItem = (index: number) => {
    setInvoiceItems(invoiceItems.filter((_, i) => i !== index));
  };

  const calculateTotal = () => {
    return invoiceItems.reduce((sum, item) => sum + (item.total || 0), 0);
  };

  const validateForm = () => {
    const newErrors: {[key: string]: string} = {};

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
      label: `${product.name_en}${stockInfo}`,
    };
  }) || [];

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/invoices')}>
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
                          setErrors({...errors, location: ''});
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
                          placeholder="Select vendor"
                          searchPlaceholder="Search vendors..."
                          emptyText="No vendors found"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Add Items */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle>Add Items</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
                  <div className="md:col-span-2 space-y-2">
                    <Label htmlFor="product">Product</Label>
                    <Combobox
                      options={[
                        { value: '', label: 'Select product...' },
                        ...productOptions,
                      ]}
                      value={selectedProduct}
                      onChange={setSelectedProduct}
                      onSearchChange={setProductSearch}
                      placeholder="Select product"
                      searchPlaceholder="Search products..."
                      emptyText={selectedLocation ? 'No products found' : 'Select location first'}
                      disabled={!selectedLocation}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="quantity">Quantity</Label>
                    <Input
                      id="quantity"
                      type="number"
                      min="1"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      className="h-11"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="unitPrice">Unit Price</Label>
                    <Input
                      id="unitPrice"
                      type="number"
                      step="0.01"
                      value={unitPrice}
                      onChange={(e) => setUnitPrice(e.target.value)}
                      className="h-11"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="discount">Discount %</Label>
                    <Input
                      id="discount"
                      type="number"
                      min="0"
                      max="100"
                      value={discount}
                      onChange={(e) => setDiscount(e.target.value)}
                      className="h-11"
                    />
                  </div>
                </div>

                <Button type="button" onClick={handleAddItem} className="w-full md:w-auto">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Item
                </Button>

                {errors.items && (
                  <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                    <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" />
                      {errors.items}
                    </p>
                  </div>
                )}

                {/* Items Table */}
                {invoiceItems.length > 0 && (
                  <div className="mt-6">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Product</TableHead>
                          <TableHead>Quantity</TableHead>
                          <TableHead>Unit Price</TableHead>
                          <TableHead>Discount</TableHead>
                          <TableHead>Total</TableHead>
                          <TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {invoiceItems.map((item, index) => (
                          <TableRow key={index}>
                            <TableCell>{item.product_name}</TableCell>
                            <TableCell>{item.quantity}</TableCell>
                            <TableCell>{formatCurrency(item.unit_price)}</TableCell>
                            <TableCell>{item.discount_percent}%</TableCell>
                            <TableCell className="font-semibold">{formatCurrency(item.total || 0)}</TableCell>
                            <TableCell>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRemoveItem(index)}
                              >
                                <Trash2 className="h-4 w-4 text-red-600" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
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
                    onChange={(e) => {setPaidAmount(e.target.value); setErrors({...errors, paidAmount: ''})}}
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
                    onClick={() => navigate('/invoices')}
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
