import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { 
  Plus, 
  Minus, 
  Trash2, 
  Search,
  Package,
  User,
  Receipt
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter 
} from '@/components/ui/dialog';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue 
} from '@/components/ui/select';
import { customerApi, productApi, vanApi, invoiceApi } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';

interface CartItem {
  product: any;
  quantity: number;
  unit_price: number;
  discount: number;
}

interface QuickInvoiceModalProps {
  open: boolean;
  onClose: () => void;
  customerId?: number;
  onSuccess?: () => void;
}

export default function QuickInvoiceModal({ 
  open, 
  onClose, 
  customerId,
  onSuccess 
}: QuickInvoiceModalProps) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(customerId?.toString() || '');
  const [selectedVanId, setSelectedVanId] = useState<string>('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [notes, setNotes] = useState('');

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setCart([]);
      setNotes('');
      setSearch('');
      if (customerId) {
        setSelectedCustomerId(customerId.toString());
      }
    }
  }, [open, customerId]);

  // Fetch data
  const { data: customers } = useQuery({
    queryKey: ['customers-list'],
    queryFn: async () => {
      const response = await customerApi.getAll({ per_page: 1000 });
      return response.data?.data || response.data || [];
    },
    enabled: open,
  });

  const { data: products } = useQuery({
    queryKey: ['products-list'],
    queryFn: async () => {
      const response = await productApi.getAll({ per_page: 1000 });
      return response.data?.data || response.data || [];
    },
    enabled: open,
  });

  const { data: vans } = useQuery({
    queryKey: ['vans-list'],
    queryFn: async () => {
      const response = await vanApi.getAll();
      return response.data?.data || response.data || [];
    },
    enabled: open,
  });

  // Create invoice mutation
  const createInvoice = useMutation({
    mutationFn: async (data: any) => {
      return await invoiceApi.createSales(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['customer-invoices'] });
      toast.success('Invoice created successfully!');
      onClose();
      onSuccess?.();
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to create invoice');
    },
  });

  // Filter products by search
  const filteredProducts = (products || []).filter((p: any) => 
    p.name_en?.toLowerCase().includes(search.toLowerCase()) ||
    p.name_ar?.includes(search) ||
    p.sku?.toLowerCase().includes(search.toLowerCase())
  );

  // Add product to cart
  const addToCart = (product: any) => {
    const existing = cart.find(item => item.product.id === product.id);
    if (existing) {
      setCart(cart.map(item => 
        item.product.id === product.id 
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, {
        product,
        quantity: 1,
        unit_price: product.unit_price || 0,
        discount: 0
      }]);
    }
    setSearch('');
  };

  // Update item quantity
  const updateQuantity = (productId: number, delta: number) => {
    setCart(cart.map(item => {
      if (item.product.id === productId) {
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  // Remove item from cart
  const removeFromCart = (productId: number) => {
    setCart(cart.filter(item => item.product.id !== productId));
  };

  // Calculate totals
  const subtotal = cart.reduce((sum, item) => 
    sum + (item.unit_price * item.quantity) - item.discount, 0
  );
  const total = subtotal;

  // Handle submit
  const handleSubmit = () => {
    if (!selectedCustomerId) {
      toast.error('Please select a customer');
      return;
    }
    if (cart.length === 0) {
      toast.error('Please add at least one product');
      return;
    }

    const invoiceData = {
      customer_id: Number(selectedCustomerId),
      van_id: selectedVanId ? Number(selectedVanId) : null,
      invoice_type: 'sales',
      invoice_date: new Date().toISOString(),
      due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      notes,
      status: 'unpaid',
      items: cart.map(item => ({
        product_id: item.product.id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        discount: item.discount,
        total: (item.unit_price * item.quantity) - item.discount
      })),
      subtotal,
      discount: 0,
      tax: 0,
      total_amount: total
    };

    createInvoice.mutate(invoiceData);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-blue-600" />
            Quick Invoice
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 lg:divide-x">
          {/* Left: Product Selection */}
          <div className="p-4 space-y-4">
            {/* Customer & Van Selection */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs mb-1.5 block">Customer *</Label>
                <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select customer">
                      {selectedCustomerId && (
                        <span className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          {customers?.find((c: any) => c.id.toString() === selectedCustomerId)?.name}
                        </span>
                      )}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {customers?.map((customer: any) => (
                      <SelectItem key={customer.id} value={customer.id.toString()}>
                        {customer.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs mb-1.5 block">Van (Optional)</Label>
                <Select value={selectedVanId} onValueChange={setSelectedVanId}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select van" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {vans?.map((van: any) => (
                      <SelectItem key={van.id} value={van.id.toString()}>
                        {van.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Product Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search products by name or SKU..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9"
              />
            </div>

            {/* Product List */}
            <div className="h-[250px] border rounded-md overflow-y-auto">
              <div className="p-2 space-y-1">
                {search && filteredProducts.slice(0, 20).map((product: any) => (
                  <button
                    key={product.id}
                    onClick={() => addToCart(product)}
                    className="w-full flex items-center justify-between p-2 rounded hover:bg-muted text-left"
                  >
                    <div className="flex items-center gap-3">
                      <Package className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium text-sm">{product.name_en || product.name_ar}</p>
                        <p className="text-xs text-muted-foreground">{product.sku}</p>
                      </div>
                    </div>
                    <span className="text-sm font-medium text-blue-600">
                      {formatCurrency(product.unit_price)}
                    </span>
                  </button>
                ))}
                {search && filteredProducts.length === 0 && (
                  <p className="text-center py-8 text-muted-foreground text-sm">
                    No products found
                  </p>
                )}
                {!search && (
                  <p className="text-center py-8 text-muted-foreground text-sm">
                    Start typing to search for products
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Right: Cart */}
          <div className="p-4 space-y-4 bg-muted/30">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              Cart ({cart.length} items)
            </h3>

            <div className="h-[250px] overflow-y-auto">
              <div className="space-y-2 pr-2">
                {cart.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground text-sm">
                    No items in cart
                  </p>
                ) : (
                  cart.map((item) => (
                    <div 
                      key={item.product.id} 
                      className="flex items-center justify-between p-3 bg-background rounded-lg border"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {item.product.name_en || item.product.name_ar}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatCurrency(item.unit_price)} × {item.quantity}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center border rounded">
                          <button
                            onClick={() => updateQuantity(item.product.id, -1)}
                            className="p-1 hover:bg-muted"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="px-2 text-sm font-medium">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.product.id, 1)}
                            className="p-1 hover:bg-muted"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                        <p className="w-20 text-right text-sm font-medium">
                          {formatCurrency(item.unit_price * item.quantity)}
                        </p>
                        <button
                          onClick={() => removeFromCart(item.product.id)}
                          className="p-1 text-red-500 hover:bg-red-50 rounded"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Notes */}
            <div>
              <Label className="text-xs mb-1.5 block">Notes</Label>
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add notes (optional)"
                className="h-9"
              />
            </div>

            {/* Totals */}
            <div className="border-t pt-3 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold">
                <span>Total</span>
                <span className="text-blue-600">{formatCurrency(total)}</span>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="px-6 py-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={createInvoice.isPending || cart.length === 0}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {createInvoice.isPending ? 'Creating...' : 'Create Invoice'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
