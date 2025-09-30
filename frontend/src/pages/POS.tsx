import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { ShoppingCart, Plus, Minus, Trash2, X, Printer } from 'lucide-react';
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
import { invoiceApi, productApi, vanApi, customerApi, stockApi } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { Combobox } from '@/components/ui/combobox';

interface CartItem {
  product_id: number;
  product_name: string;
  sku: string;
  quantity: number;
  unit_price: number;
  total: number;
}

export default function POS() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedVan, setSelectedVan] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [selectedProduct, setSelectedProduct] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [paidAmount, setPaidAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  const { data: vans } = useQuery({
    queryKey: ['vans'],
    queryFn: async () => {
      const response = await vanApi.getAll();
      return response.data.data || [];
    },
  });

  const { data: customers } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const response = await customerApi.getAll();
      return response.data.data || [];
    },
  });

  const { data: products } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const response = await productApi.getAll();
      return response.data.data || [];
    },
  });

  const { data: vanStock } = useQuery({
    queryKey: ['van-stock', selectedVan],
    queryFn: async () => {
      if (!selectedVan) return [];
      const response = await vanApi.getStock(Number(selectedVan));
      return response.data.data || [];
    },
    enabled: !!selectedVan,
  });

  const createSaleMutation = useMutation({
    mutationFn: (data: any) => invoiceApi.createSales(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['van-stock'] });
      toast.success('Sale completed successfully!');
      handleClearCart();
      setIsCheckoutOpen(false);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to complete sale');
    },
  });

  const handleAddToCart = () => {
    if (!selectedProduct || !quantity) {
      toast.error('Please select product and quantity');
      return;
    }

    if (!selectedVan) {
      toast.error('Please select a van first');
      return;
    }

    const product = products?.find((p: any) => p.id === Number(selectedProduct));
    const stock = vanStock?.find((s: any) => s.product_id === Number(selectedProduct));

    if (!stock || stock.quantity < Number(quantity)) {
      toast.error('Insufficient stock in selected van');
      return;
    }

    const existingItem = cart.find(item => item.product_id === Number(selectedProduct));
    
    if (existingItem) {
      const newQuantity = existingItem.quantity + Number(quantity);
      if (newQuantity > stock.quantity) {
        toast.error('Insufficient stock');
        return;
      }
      setCart(cart.map(item =>
        item.product_id === Number(selectedProduct)
          ? { ...item, quantity: newQuantity, total: newQuantity * item.unit_price }
          : item
      ));
    } else {
      const newItem: CartItem = {
        product_id: Number(selectedProduct),
        product_name: product?.name_en || '',
        sku: product?.sku || '',
        quantity: Number(quantity),
        unit_price: product?.unit_price || 0,
        total: Number(quantity) * (product?.unit_price || 0),
      };
      setCart([...cart, newItem]);
    }

    setSelectedProduct('');
    setQuantity('1');
  };

  const handleUpdateQuantity = (productId: number, newQuantity: number) => {
    if (newQuantity <= 0) {
      handleRemoveItem(productId);
      return;
    }

    const stock = vanStock?.find((s: any) => s.product_id === productId);
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
    setSelectedVan('');
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
    if (!selectedVan) {
      toast.error('Please select a van');
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
      van_id: Number(selectedVan),
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

  const vanOptions = vans?.filter((van: any) => van.is_active).map((van: any) => ({
    value: van.id.toString(),
    label: van.name,
  })) || [];

  const customerOptions = customers?.map((customer: any) => ({
    value: customer.id.toString(),
    label: customer.name,
  })) || [];

  const productOptions = products?.map((product: any) => {
    const stock = vanStock?.find((s: any) => s.product_id === product.id);
    return {
      value: product.id.toString(),
      label: `${product.name_en} - ${product.sku} (Stock: ${stock?.quantity || 0})`,
      disabled: !stock || stock.quantity === 0,
    };
  }) || [];

  return (
    <div className="h-full flex flex-col lg:flex-row gap-4">
      {/* Left Side - Product Selection */}
      <div className="flex-1 space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              <h2 className="text-lg font-semibold">Point of Sale</h2>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Select Van <span className="text-red-500">*</span></Label>
                <Combobox
                  options={[{ value: '', label: 'Select van...' }, ...vanOptions]}
                  value={selectedVan}
                  onChange={setSelectedVan}
                  placeholder="Select van"
                  searchPlaceholder="Search..."
                  emptyText="No vans found"
                />
              </div>
              <div>
                <Label>Customer (Optional)</Label>
                <Combobox
                  options={[{ value: '', label: 'Walk-in customer' }, ...customerOptions]}
                  value={selectedCustomer}
                  onChange={setSelectedCustomer}
                  placeholder="Select customer"
                  searchPlaceholder="Search..."
                  emptyText="No customers found"
                />
              </div>
            </div>

            <div className="border-t pt-4">
              <h3 className="font-semibold mb-3">Add Products</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-2">
                  <Label>Product</Label>
                  <Combobox
                    options={[{ value: '', label: 'Select product...' }, ...productOptions]}
                    value={selectedProduct}
                    onChange={setSelectedProduct}
                    placeholder="Select product"
                    searchPlaceholder="Search..."
                    emptyText="No products in van"
                    disabled={!selectedVan}
                  />
                </div>
                <div>
                  <Label>Quantity</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      placeholder="1"
                      min="1"
                      className="flex-1"
                    />
                    <Button onClick={handleAddToCart} disabled={!selectedVan}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Right Side - Cart */}
      <div className="lg:w-96 space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Cart</h2>
              {cart.length > 0 && (
                <Button variant="ghost" size="sm" onClick={handleClearCart}>
                  <X className="h-4 w-4 mr-1" />
                  Clear
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {cart.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Cart is empty
              </div>
            ) : (
              <div className="space-y-3">
                {cart.map((item) => (
                  <div key={item.product_id} className="flex items-center gap-2 p-2 border rounded">
                    <div className="flex-1">
                      <div className="font-medium text-sm">{item.product_name}</div>
                      <div className="text-xs text-muted-foreground">{item.sku}</div>
                      <div className="text-sm font-bold mt-1">{formatCurrency(item.total)}</div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleUpdateQuantity(item.product_id, item.quantity - 1)}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleUpdateQuantity(item.product_id, item.quantity + 1)}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveItem(item.product_id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                ))}

                <div className="border-t pt-3 mt-3">
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total:</span>
                    <span>{formatCurrency(calculateTotal())}</span>
                  </div>
                </div>

                <Button
                  className="w-full"
                  size="lg"
                  onClick={handleCheckout}
                  disabled={cart.length === 0 || !selectedVan}
                >
                  Checkout
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
              <Label>Amount Paid</Label>
              <Input
                type="number"
                value={paidAmount}
                onChange={(e) => setPaidAmount(e.target.value)}
                placeholder="0.00"
                min="0"
                step="0.01"
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
    </div>
  );
}
