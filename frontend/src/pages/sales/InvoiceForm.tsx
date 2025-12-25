import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowLeft, Save, Plus, Trash2, ShoppingCart, Package, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { invoiceApi, productApi, vanApi, customerApi, stockApi, vendorApi } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';

interface InvoiceItem {
  product_id: number;
  product_name?: string;
  quantity: number;
  unit_price: number;
  discount_percent?: number;
  total?: number;
}

export default function InvoiceForm() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const invoiceType = (searchParams.get('type') || 'sales') as 'purchase' | 'sales';

  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([]);
  const [selectedVan, setSelectedVan] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [vendorSearchTerm, setVendorSearchTerm] = useState('');
  const [showVendorDropdown, setShowVendorDropdown] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState('');
  const customerDropdownRef = useRef<HTMLDivElement>(null);
  const vendorDropdownRef = useRef<HTMLDivElement>(null);
  const [quantity, setQuantity] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [discount, setDiscount] = useState('');
  const [paidAmount, setPaidAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [purchaseLocationType, setPurchaseLocationType] = useState('warehouse');
  const [purchaseLocationVan, setPurchaseLocationVan] = useState('');

  const { data: products } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const response = await productApi.getAll();
      // Handle paginated response
      const apiData = response.data.data || response.data;
      return Array.isArray(apiData) ? apiData : (apiData.data || []);
    },
  });

  const { data: vans } = useQuery({
    queryKey: ['vans'],
    queryFn: async () => {
      const response = await vanApi.getAll();
      return response.data.data || [];
    },
  });

  const { data: customers } = useQuery({
    queryKey: ['customers', customerSearchTerm],
    queryFn: async () => {
      const response = await customerApi.getAll({ search: customerSearchTerm, per_page: 50 });
      // Handle paginated response
      const apiData = response.data.data || response.data;
      return Array.isArray(apiData) ? apiData : (apiData.data || []);
    },
  });

  const { data: vendors } = useQuery({
    queryKey: ['vendors', vendorSearchTerm],
    queryFn: async () => {
      const response = await vendorApi.getAll({ search: vendorSearchTerm, per_page: 50 });
      // Handle paginated response
      const apiData = response.data.data || response.data;
      return Array.isArray(apiData) ? apiData : (apiData.data || []);
    },
  });

  const { data: vanStock } = useQuery({
    queryKey: ['van-stock', selectedVan],
    queryFn: async () => {
      if (!selectedVan || invoiceType !== 'sales') return [];
      const response = await vanApi.getStock(Number(selectedVan));
      return response.data.data || [];
    },
    enabled: !!selectedVan && invoiceType === 'sales',
  });

  // Warehouse stock query for purchase invoices (for future use)
  useQuery({
    queryKey: ['warehouse-stock'],
    queryFn: async () => {
      const response = await stockApi.getWarehouse();
      return response.data.data || [];
    },
    enabled: invoiceType === 'purchase',
  });

  const createInvoiceMutation = useMutation({
    mutationFn: (data: any) => {
      return invoiceType === 'purchase' 
        ? invoiceApi.createPurchase(data)
        : invoiceApi.createSales(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['warehouse-stock'] });
      queryClient.invalidateQueries({ queryKey: ['van-stock'] });
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

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (customerDropdownRef.current && !customerDropdownRef.current.contains(event.target as Node)) {
        setShowCustomerDropdown(false);
      }
      if (vendorDropdownRef.current && !vendorDropdownRef.current.contains(event.target as Node)) {
        setShowVendorDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCustomerSelect = (customer: any) => {
    setSelectedCustomer(customer.id.toString());
    setCustomerSearchTerm(customer.name);
    setShowCustomerDropdown(false);
  };

  const handleCustomerSearchChange = (value: string) => {
    setCustomerSearchTerm(value);
    setShowCustomerDropdown(true);
    if (!value) {
      setSelectedCustomer('');
    }
  };

  const handleVendorSelect = (vendor: any) => {
    setSelectedCustomer(vendor.id.toString());
    setVendorSearchTerm(vendor.company_name || vendor.name);
    setShowVendorDropdown(false);
  };

  const handleVendorSearchChange = (value: string) => {
    setVendorSearchTerm(value);
    setShowVendorDropdown(true);
    if (!value) {
      setSelectedCustomer('');
    }
  };

  const handleAddItem = () => {
    if (!selectedProduct || !quantity || !unitPrice) {
      toast.error('Please fill all item fields');
      return;
    }

    const product = products?.find((p: any) => p.id === Number(selectedProduct));
    
    // Check stock for sales
    if (invoiceType === 'sales') {
      const stock = vanStock?.find((s: any) => s.product_id === Number(selectedProduct));
      if (!stock || stock.quantity < Number(quantity)) {
        toast.error('Insufficient van stock');
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

    if (invoiceType === 'sales' && !selectedVan) {
      newErrors.van = 'Van is required for sales invoices';
    }

    if (invoiceType === 'purchase' && purchaseLocationType === 'van' && !purchaseLocationVan) {
      newErrors.purchaseLocation = 'Van is required when location type is van';
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

    if (invoiceType === 'sales') {
      invoiceData.van_id = Number(selectedVan);
      if (selectedCustomer) {
        invoiceData.customer_id = Number(selectedCustomer);
      }
    } else if (invoiceType === 'purchase') {
      invoiceData.location_type = purchaseLocationType;
      invoiceData.location_id = purchaseLocationType === 'van' ? Number(purchaseLocationVan) : 0;
      if (selectedCustomer) {
        invoiceData.vendor_id = Number(selectedCustomer);
      }
    }

    createInvoiceMutation.mutate(invoiceData);
  };

  const total = calculateTotal();
  const remaining = total - (Number(paidAmount) || 0);

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
              ? 'Create a new purchase invoice - adds stock to warehouse or van' 
              : 'Create a new sales invoice for customer orders'}
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
                  {invoiceType === 'sales' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="van">Van *</Label>
                        <select
                          id="van"
                          value={selectedVan}
                          onChange={(e) => {setSelectedVan(e.target.value); setErrors({...errors, van: ''})}}
                          className={`flex h-11 w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${errors.van ? 'border-red-500' : 'border-input'}`}
                          required
                        >
                          <option value="">Select van</option>
                          {vans?.map((van: any) => (
                            <option key={van.id} value={van.id}>
                              {van.name}
                            </option>
                          ))}
                        </select>
                        {errors.van && (
                          <p className="text-sm text-red-600 flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" />
                            {errors.van}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2" ref={customerDropdownRef}>
                        <Label htmlFor="customer">Customer</Label>
                        <div className="relative">
                          <Input
                            id="customer"
                            type="text"
                            value={customerSearchTerm}
                            onChange={(e) => handleCustomerSearchChange(e.target.value)}
                            onFocus={() => setShowCustomerDropdown(true)}
                            placeholder="Search customer (optional)"
                            className="h-11"
                          />
                          {showCustomerDropdown && customers && customers.length > 0 && (
                            <div className="absolute z-50 w-full mt-1 bg-background border border-input rounded-md shadow-lg max-h-60 overflow-auto">
                              {customers.map((customer: any) => (
                                <div
                                  key={customer.id}
                                  onClick={() => handleCustomerSelect(customer)}
                                  className="px-3 py-2 hover:bg-accent cursor-pointer text-sm"
                                >
                                  <div className="font-medium">{customer.name}</div>
                                  {customer.phone && (
                                    <div className="text-xs text-muted-foreground">{customer.phone}</div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {invoiceType === 'purchase' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2" ref={vendorDropdownRef}>
                        <Label htmlFor="vendor">Vendor</Label>
                        <div className="relative">
                          <Input
                            id="vendor"
                            type="text"
                            value={vendorSearchTerm}
                            onChange={(e) => handleVendorSearchChange(e.target.value)}
                            onFocus={() => setShowVendorDropdown(true)}
                            placeholder="Search vendor (optional)"
                            className="h-11"
                          />
                          {showVendorDropdown && vendors && vendors.length > 0 && (
                            <div className="absolute z-50 w-full mt-1 bg-background border border-input rounded-md shadow-lg max-h-60 overflow-auto">
                              {vendors.map((vendor: any) => (
                                <div
                                  key={vendor.id}
                                  onClick={() => handleVendorSelect(vendor)}
                                  className="px-3 py-2 hover:bg-accent cursor-pointer text-sm"
                                >
                                  <div className="font-medium">{vendor.company_name || vendor.name}</div>
                                  {vendor.phone && (
                                    <div className="text-xs text-muted-foreground">{vendor.phone}</div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="locationType">Destination Location *</Label>
                        <select
                          id="locationType"
                          value={purchaseLocationType}
                          onChange={(e) => {
                            setPurchaseLocationType(e.target.value);
                            if (e.target.value === 'warehouse') {
                              setPurchaseLocationVan('');
                              setErrors({...errors, purchaseLocation: ''});
                            }
                          }}
                          className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <option value="warehouse">Warehouse</option>
                          <option value="van">Van</option>
                        </select>
                      </div>

                      {purchaseLocationType === 'van' && (
                        <div className="space-y-2 md:col-span-2">
                          <Label htmlFor="purchaseVan">Select Van *</Label>
                          <select
                            id="purchaseVan"
                            value={purchaseLocationVan}
                            onChange={(e) => {setPurchaseLocationVan(e.target.value); setErrors({...errors, purchaseLocation: ''})}}
                            className={`flex h-11 w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${errors.purchaseLocation ? 'border-red-500' : 'border-input'}`}
                          >
                            <option value="">Select van</option>
                            {vans?.map((van: any) => (
                              <option key={van.id} value={van.id}>
                                {van.name}
                              </option>
                            ))}
                          </select>
                          {errors.purchaseLocation && (
                            <p className="text-sm text-red-600 flex items-center gap-1">
                              <AlertCircle className="h-3 w-3" />
                              {errors.purchaseLocation}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
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
                    <select
                      id="product"
                      value={selectedProduct}
                      onChange={(e) => setSelectedProduct(e.target.value)}
                      className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <option value="">Select product</option>
                      {products?.map((product: any) => (
                        <option key={product.id} value={product.id}>
                          {product.name_en}
                        </option>
                      ))}
                    </select>
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
