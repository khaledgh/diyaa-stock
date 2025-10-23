import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ShoppingCart, Plus, Minus, Trash2, X, DollarSign, Package, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { invoiceApi, productApi, locationApi, customerApi, stockApi } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { Combobox } from '@/components/ui/combobox';
import { InvoicePrint } from '@/components/InvoicePrint';

interface CartItem {
  product_id: number;
  product_name: string;
  sku: string;
  quantity: number;
  unit_price: number;
  total: number;
}

export default function POS() {
  const queryClient = useQueryClient();
  const printRef = useRef<HTMLDivElement>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedLocation, setSelectedLocation] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [selectedProduct, setSelectedProduct] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [paidAmount, setPaidAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [lastInvoice, setLastInvoice] = useState<any>(null);

  const { data: locations } = useQuery({
    queryKey: ['locations'],
    queryFn: async () => {
      const response = await locationApi.getAll();
      return response.data.data || [];
    },
  });

  const { data: customers } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const response = await customerApi.getAll();
      // Handle paginated response
      const apiData = response.data.data || response.data;
      return Array.isArray(apiData) ? apiData : (apiData.data || []);
    },
  });

  const { data: products } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const response = await productApi.getAll();
      // Handle paginated response
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

  const handlePrint = () => {
    if (printRef.current) {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write('<html><head><title>Print Receipt</title>');
        printWindow.document.write('</head><body>');
        printWindow.document.write(printRef.current.innerHTML);
        printWindow.document.write('</body></html>');
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
          printWindow.print();
          printWindow.close();
        }, 250);
      }
    }
  };

  const createSaleMutation = useMutation({
    mutationFn: (data: any) => invoiceApi.createSales(data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['location-stock'] });
      
      // Save invoice data for printing
      const total = calculateTotal();
      const invoiceData = {
        invoiceNumber: response.data.data?.invoice_number,
        invoiceDate: new Date().toISOString(),
        customerName: customers?.find((c: any) => c.id === Number(selectedCustomer))?.name || 'Walk-in Customer',
        locationName: locations?.find((l: any) => l.id === Number(selectedLocation))?.name,
        items: cart,
        subtotal: total,
        paidAmount: Number(paidAmount) || 0,
        remainingAmount: total - (Number(paidAmount) || 0),
        paymentMethod,
      };
      setLastInvoice(invoiceData);
      
      toast.success('Sale completed successfully!');
      handleClearCart();
      setIsCheckoutOpen(false);
      
      // Auto print after 500ms
      setTimeout(() => {
        handlePrint();
      }, 500);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to complete sale');
    },
  });

  const addProductToCart = (productId: number, qty: number = 1) => {
    if (!selectedLocation) {
      toast.error('Please select a location first');
      return;
    }

    const product = products?.find((p: any) => p.id === productId);
    const stock = locationStock?.find((s: any) => s.product_id === productId);

    if (!stock || stock.quantity < qty) {
      toast.error('Insufficient stock in selected location');
      return;
    }

    const existingItem = cart.find(item => item.product_id === productId);
    
    if (existingItem) {
      const newQuantity = existingItem.quantity + qty;
      if (newQuantity > stock.quantity) {
        toast.error('Insufficient stock');
        return;
      }
      setCart(cart.map(item =>
        item.product_id === productId
          ? { ...item, quantity: newQuantity, total: newQuantity * item.unit_price }
          : item
      ));
    } else {
      const newItem: CartItem = {
        product_id: productId,
        product_name: product?.name_en || '',
        sku: product?.sku || '',
        quantity: qty,
        unit_price: product?.unit_price || 0,
        total: qty * (product?.unit_price || 0),
      };
      setCart([...cart, newItem]);
    }

    toast.success(`${product?.name_en} added to cart`);
  };

  const handleAddToCart = () => {
    if (!selectedProduct || !quantity) {
      toast.error('Please select product and quantity');
      return;
    }

    addProductToCart(Number(selectedProduct), Number(quantity));
    setSelectedProduct('');
    setQuantity('1');
  };

  const handleUpdateQuantity = (productId: number, newQuantity: number) => {
    if (newQuantity <= 0) {
      handleRemoveItem(productId);
      return;
    }

    const stock = locationStock?.find((s: any) => s.product_id === productId);
    if (stock && newQuantity > stock.quantity) {
      toast.error('Insufficient stock');
      return;
    }

    setCart(cart.map(item =>
      item.product_id === productId
        ? { ...item, quantity: newQuantity, total: newQuantity * item.unit_price }
        : item
    ));
  };

  const handleRemoveItem = (productId: number) => {
    setCart(cart.filter(item => item.product_id !== productId));
  };

  const handleClearCart = () => {
    setCart([]);
    setSelectedLocation('');
    setSelectedCustomer('');
    setPaidAmount('');
    setPaymentMethod('cash');
  };

  const calculateTotal = () => {
    return cart.reduce((sum, item) => sum + item.total, 0);
  };

  const handleCheckout = () => {
    if (cart.length === 0) {
      toast.error('Cart is empty');
      return;
    }
    if (!selectedLocation) {
      toast.error('Please select a location');
      return;
    }
    setIsCheckoutOpen(true);
  };

  const handleCompleteSale = () => {
    const total = calculateTotal();
    const paid = Number(paidAmount) || 0;

    if (paid < total) {
      if (!window.confirm(`Customer owes ${formatCurrency(total - paid)}. Continue?`)) {
        return;
      }
    }

    const saleData: any = {
      location_id: Number(selectedLocation),
      items: cart.map(item => ({
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        discount_percent: 0,
      })),
      paid_amount: paid,
      payment_method: paymentMethod,
    };

    if (selectedCustomer) {
      saleData.customer_id = Number(selectedCustomer);
    }

    createSaleMutation.mutate(saleData);
  };

  const locationOptions = locations?.map((location: any) => ({
    value: location.id.toString(),
    label: `${location.name} (${location.type})`,
  })) || [];

  const customerOptions = customers?.map((customer: any) => ({
    value: customer.id.toString(),
    label: customer.name,
  })) || [];

  const productOptions = products?.map((product: any) => {
    const stock = locationStock?.find((s: any) => s.product_id === product.id);
    return {
      value: product.id.toString(),
      label: `${product.name_en} - ${product.sku} (Stock: ${stock?.quantity || 0})`,
      disabled: !stock || stock.quantity === 0,
    };
  }) || [];

  return (
    <div className="h-full flex flex-col lg:flex-row gap-6 p-6">
      {/* Left Side - Product Selection */}
      <div className="flex-1 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <ShoppingCart className="h-8 w-8 text-green-600" />
            Point of Sale
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Quick sales checkout system</p>
        </div>

        {/* Location & Customer Selection */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <h2 className="text-lg font-semibold">Sale Information</h2>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="w-full space-y-2">
                <Label className="text-base">Select Location <span className="text-red-500">*</span></Label>
                <Combobox
                  options={[{ value: '', label: 'Select location...' }, ...locationOptions]}
                  value={selectedLocation}
                  onChange={setSelectedLocation}
                  placeholder="Select location"
                  searchPlaceholder="Search locations..."
                  emptyText="No locations found"
                />
              </div>
              <div className="w-full space-y-2">
                <Label className="text-base">Customer (Optional)</Label>
                <Combobox
                  options={[{ value: '', label: 'Walk-in customer' }, ...customerOptions]}
                  value={selectedCustomer}
                  onChange={setSelectedCustomer}
                  placeholder="Select customer"
                  searchPlaceholder="Search customers..."
                  emptyText="No customers found"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Product Selection */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-blue-600" />
              <h2 className="text-lg font-semibold">Add Products</h2>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-3 w-full space-y-2">
                <Label className="text-base">Product</Label>
                <Combobox
                  options={[{ value: '', label: 'Select product...' }, ...productOptions]}
                  value={selectedProduct}
                  onChange={setSelectedProduct}
                  placeholder="Search products..."
                  searchPlaceholder="Type to search..."
                  emptyText="No products in location"
                  disabled={!selectedLocation}
                />
              </div>
              <div className="w-full space-y-2">
                <Label className="text-base">Quantity</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="1"
                    min="1"
                    className="flex-1 h-11"
                  />
                  <Button onClick={handleAddToCart} disabled={!selectedLocation} size="lg" className="px-6">
                    <Plus className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Product Grid */}
        {selectedLocation && locationStock && locationStock.length > 0 && (
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <h2 className="text-lg font-semibold">Quick Select</h2>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {locationStock.slice(0, 12).map((stock: any) => {
                  const product = products?.find((p: any) => p.id === stock.product_id);
                  if (!product || stock.quantity === 0) return null;
                  return (
                    <button
                      key={stock.product_id}
                      onClick={() => addProductToCart(stock.product_id, 1)}
                      className="p-4 border-2 border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all text-left"
                    >
                      <div className="font-semibold text-sm mb-1 truncate">{product.name_en}</div>
                      <div className="text-xs text-gray-500 mb-2">{product.sku}</div>
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-bold text-green-600">{formatCurrency(product.unit_price)}</span>
                        <span className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">Stock: {stock.quantity}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Right Side - Cart */}
      <div className="lg:w-[420px] space-y-4">
        <Card className="border-0 shadow-xl sticky top-6">
          <CardHeader className="bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-t-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-6 w-6" />
                <h2 className="text-xl font-bold">Cart ({cart.length})</h2>
              </div>
              {cart.length > 0 && (
                <Button variant="ghost" size="sm" onClick={handleClearCart} className="text-white hover:bg-white/20">
                  <X className="h-4 w-4 mr-1" />
                  Clear
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            {cart.length === 0 ? (
              <div className="text-center py-12">
                <ShoppingCart className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500 font-medium">Cart is empty</p>
                <p className="text-sm text-gray-400 mt-1">Add products to get started</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="max-h-[400px] overflow-y-auto space-y-3 pr-2">
                  {cart.map((item) => (
                    <div key={item.product_id} className="flex items-center gap-3 p-3 border-2 border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-300 dark:hover:border-blue-600 transition-colors">
                      <div className="flex-1">
                        <div className="font-semibold text-sm mb-1">{item.product_name}</div>
                        <div className="text-xs text-gray-500 mb-2">{item.sku}</div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-600">{formatCurrency(item.unit_price)} × {item.quantity}</span>
                          <span className="text-base font-bold text-green-600">{formatCurrency(item.total)}</span>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleUpdateQuantity(item.product_id, item.quantity - 1)}
                            className="h-8 w-8 p-0"
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <span className="w-10 text-center text-sm font-bold">{item.quantity}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleUpdateQuantity(item.product_id, item.quantity + 1)}
                            className="h-8 w-8 p-0"
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveItem(item.product_id)}
                          className="h-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t-2 pt-4 mt-4 space-y-2">
                  <div className="flex justify-between text-base text-gray-600 dark:text-gray-400">
                    <span>Items:</span>
                    <span>{cart.reduce((sum, item) => sum + item.quantity, 0)}</span>
                  </div>
                  <div className="flex justify-between text-2xl font-bold text-gray-900 dark:text-white">
                    <span>Total:</span>
                    <span className="text-green-600">{formatCurrency(calculateTotal())}</span>
                  </div>
                </div>

                <Button
                  className="w-full bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white"
                  size="lg"
                  onClick={handleCheckout}
                  disabled={cart.length === 0 || !selectedLocation}
                >
                  <DollarSign className="mr-2 h-5 w-5" />
                  Proceed to Checkout
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Checkout Dialog */}
      <Dialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Complete Sale</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-muted p-4 rounded-md">
              <div className="flex justify-between text-lg font-bold">
                <span>Total Amount:</span>
                <span>{formatCurrency(calculateTotal())}</span>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Amount Paid</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setPaidAmount(calculateTotal().toString())}
                  className="h-8"
                >
                  <DollarSign className="h-3 w-3 mr-1" />
                  Full Amount
                </Button>
              </div>
              <Input
                type="number"
                value={paidAmount}
                onChange={(e) => setPaidAmount(e.target.value)}
                placeholder="0.00"
                min="0"
                step="0.01"
                className="h-11"
              />
            </div>

            <div>
              <Label>Payment Method</Label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full border rounded-md p-2"
              >
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="bank_transfer">Bank Transfer</option>
              </select>
            </div>

            {Number(paidAmount) > 0 && (
              <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-md">
                <div className="flex justify-between">
                  <span>Change:</span>
                  <span className="font-bold text-green-600">
                    {formatCurrency(Math.max(0, Number(paidAmount) - calculateTotal()))}
                  </span>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsCheckoutOpen(false)}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCompleteSale}
              disabled={createSaleMutation.isPending}
              className="w-full sm:w-auto"
            >
              {createSaleMutation.isPending ? 'Processing...' : 'Complete Sale'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Print Component (Hidden) */}
      {lastInvoice && (
        <InvoicePrint
          ref={printRef}
          invoiceNumber={lastInvoice.invoiceNumber}
          invoiceDate={lastInvoice.invoiceDate}
          customerName={lastInvoice.customerName}
          locationName={lastInvoice.locationName}
          items={lastInvoice.items}
          subtotal={lastInvoice.subtotal}
          paidAmount={lastInvoice.paidAmount}
          remainingAmount={lastInvoice.remainingAmount}
          paymentMethod={lastInvoice.paymentMethod}
        />
      )}

      {/* Manual Print Button (if needed) */}
      {lastInvoice && (
        <Button
          onClick={handlePrint}
          className="fixed bottom-6 right-6 shadow-lg"
          size="lg"
        >
          <Printer className="mr-2 h-5 w-5" />
          Print Last Receipt
        </Button>
      )}
    </div>
  );
}
