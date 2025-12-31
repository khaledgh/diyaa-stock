import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import {
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  X,
  DollarSign,
  Search,
  Printer,
  Check,
  MapPin,
  Maximize,
  Minimize,
  User
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { invoiceApi, productApi, locationApi, customerApi, stockApi } from '@/lib/api';
import { formatCurrency, formatQuantity, cn } from '@/lib/utils';
import { InvoicePrint } from '@/components/InvoicePrint';

interface CartItem {
  product_id: number;
  product_name: string;
  sku: string;
  quantity: number;
  unit_price: number;
  discount_percent: number;
  total: number;
}

export default function POS() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const printRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedLocation, setSelectedLocation] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [search, setSearch] = useState('');
  const [paidAmount, setPaidAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [lastInvoice, setLastInvoice] = useState<any>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [invoiceDiscountPercent, setInvoiceDiscountPercent] = useState('0');

  const toggleFullscreen = () => {
    if (!isFullscreen) {
      const element = document.documentElement;
      if (element.requestFullscreen) {
        element.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
    setIsFullscreen(!isFullscreen);
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // Focus search on load
  useEffect(() => {
    if (selectedLocation && searchRef.current) {
      searchRef.current.focus();
    }
  }, [selectedLocation]);

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
      const response = await customerApi.getAll({ per_page: 1000 });
      const apiData = response.data.data || response.data;
      return Array.isArray(apiData) ? apiData : (apiData.data || []);
    },
  });

  const { data: products } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const response = await productApi.getAll({ per_page: 1000 });
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

      const subtotal = calculateSubtotal();
      const discountAmount = calculateInvoiceDiscount();
      const totalAmount = calculateTotal();

      const invoiceData = {
        invoiceNumber: response.data.data?.invoice_number,
        invoiceDate: new Date().toISOString(),
        customerName: customers?.find((c: any) => c.id === Number(selectedCustomer))?.name || 'Walk-in Customer',
        locationName: locations?.find((l: any) => l.id === Number(selectedLocation))?.name,
        items: cart,
        subtotal: subtotal,
        discountAmount: discountAmount,
        totalAmount: totalAmount,
        paidAmount: Number(paidAmount) || 0,
        remainingAmount: totalAmount - (Number(paidAmount) || 0),
        paymentMethod,
      };
      setLastInvoice(invoiceData);

      toast.success('Sale completed!');
      handleClearCart();
      setShowPayment(false);

      setTimeout(() => handlePrint(), 500);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to complete sale');
    },
  });

  // Filter products based on search and stock
  const availableProducts = (products || []).filter((p: any) => {
    const stock = locationStock?.find((s: any) => s.product_id === p.id);
    const hasStock = stock && stock.quantity > 0;
    const matchesSearch = !search ||
      p.name_en?.toLowerCase().includes(search.toLowerCase()) ||
      p.name_ar?.includes(search) ||
      p.sku?.toLowerCase().includes(search.toLowerCase());
    return hasStock && matchesSearch;
  });

  const addToCart = (productId: number) => {
    const product = products?.find((p: any) => p.id === productId);
    const stock = locationStock?.find((s: any) => s.product_id === productId);

    if (!stock || stock.quantity < 0.01) {
      toast.error('Out of stock');
      return;
    }

    const existing = cart.find(item => item.product_id === productId);

    if (existing) {
      const newQty = Math.round(Math.min(existing.quantity + 1, stock.quantity) * 100) / 100;
      if (newQty === existing.quantity && existing.quantity >= stock.quantity) {
        toast.error('Max stock reached');
        return;
      }
      setCart(cart.map(item =>
        item.product_id === productId
          ? {
            ...item,
            quantity: newQty,
            total: Math.round(newQty * item.unit_price * (1 - (item.discount_percent || 0) / 100) * 100) / 100
          }
          : item
      ));
    } else {
      const initialQty = Math.round(Math.min(1, stock.quantity) * 100) / 100;
      const unitPrice = product?.unit_price || 0;
      setCart([...cart, {
        product_id: productId,
        product_name: product?.name_ar || product?.name_en || '',
        sku: product?.sku || '',
        quantity: initialQty,
        unit_price: unitPrice,
        discount_percent: 0,
        total: Math.round(initialQty * unitPrice * 100) / 100,
      }]);
    }
  };

  const updateQuantity = (productId: number, delta: number) => {
    const existing = cart.find(item => item.product_id === productId);
    if (!existing) return;

    const stock = locationStock?.find((s: any) => s.product_id === productId);
    let newQty = existing.quantity + delta;

    // Cap at stock
    if (stock && newQty > stock.quantity) {
      newQty = stock.quantity;
      toast.error(`Only ${formatQuantity(stock.quantity)} available`);
    }

    if (newQty <= 0) {
      setCart(cart.filter(item => item.product_id !== productId));
      return;
    }

    setCart(cart.map(item =>
      item.product_id === productId
        ? {
          ...item,
          quantity: Math.round(newQty * 100) / 100,
          total: Math.round((Math.round(newQty * 100) / 100) * item.unit_price * (1 - (item.discount_percent || 0) / 100) * 100) / 100
        }
        : item
    ));
  };

  const manualQuantityUpdate = (productId: number, value: string) => {
    let qty = parseFloat(value);
    if (isNaN(qty) || qty < 0) return;

    if (qty === 0) {
      setCart(cart.filter(item => item.product_id !== productId));
      return;
    }

    const stock = locationStock?.find((s: any) => s.product_id === productId);
    if (stock && qty > stock.quantity) {
      qty = stock.quantity;
      toast.error(`Only ${formatQuantity(stock.quantity)} available`);
    }

    setCart(cart.map(item =>
      item.product_id === productId
        ? {
          ...item,
          quantity: Math.round(qty * 100) / 100,
          total: Math.round((Math.round(qty * 100) / 100) * item.unit_price * (1 - (item.discount_percent || 0) / 100) * 100) / 100
        }
        : item
    ));
  };

  const updateItemDiscount = (productId: number, value: string) => {
    const discount = parseFloat(value);
    if (isNaN(discount) || discount < 0 || discount > 100) return;

    setCart(cart.map(item =>
      item.product_id === productId
        ? {
          ...item,
          discount_percent: discount,
          total: Math.round(item.quantity * item.unit_price * (1 - discount / 100) * 100) / 100
        }
        : item
    ));
  };

  const handleClearCart = () => {
    setCart([]);
    setSelectedCustomer('');
    setPaidAmount('');
    setPaymentMethod('cash');
    setShowPayment(false);
    setSearch('');
  };

  const calculateSubtotal = () => Math.round(cart.reduce((sum, item) => sum + item.total, 0) * 100) / 100;
  const calculateInvoiceDiscount = () => Math.round(((calculateSubtotal() * (Number(invoiceDiscountPercent) || 0)) / 100) * 100) / 100;
  const calculateTotal = () => Math.round((calculateSubtotal() - calculateInvoiceDiscount()) * 100) / 100;

  const handleCompleteSale = () => {
    const total = calculateTotal();
    const paid = Number(paidAmount) || 0;

    if (paid < total && !window.confirm(`Customer owes ${formatCurrency(total - paid)}. Continue?`)) {
      return;
    }

    const saleData: any = {
      location_id: Number(selectedLocation),
      items: cart.map(item => ({
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        discount_percent: item.discount_percent,
      })),
      discount_percent: Number(invoiceDiscountPercent) || 0,
      paid_amount: paid,
      payment_method: paymentMethod,
    };

    if (selectedCustomer) {
      saleData.customer_id = Number(selectedCustomer);
    }

    createSaleMutation.mutate(saleData);
  };

  const total = calculateTotal();

  // Step 1: Location Selection
  if (!selectedLocation) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex justify-center p-2 bg-muted/30">
        <div className="w-full max-w-2xl animate-in fade-in zoom-in duration-500">
          <div className="text-center mb-5">
            <h2 className="text-2xl font-black tracking-tighter text-gray-900 dark:text-white mb-2">
              Select Store
            </h2>
            <p className="text-muted-foreground font-medium text-sm">Choose your active operating location</p>
          </div>

          <div className="relative max-w-md mx-auto mb-5">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-blue-500/50" />
            <Input
              placeholder="Quick search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-12 h-14 rounded-2xl border-none shadow-lg bg-white dark:bg-gray-800 focus-visible:ring-2 focus-visible:ring-blue-500 text-lg font-medium"
            />
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-3 gap-6 max-h-[500px] overflow-y-auto p-2 custom-scrollbar">
            {locations?.filter((l: any) =>
              !search || l.name.toLowerCase().includes(search.toLowerCase()) || l.type.toLowerCase().includes(search.toLowerCase())
            ).map((location: any) => (
              <button
                key={location.id}
                onClick={() => {
                  setSelectedLocation(location.id.toString());
                  setSearch('');
                }}
                className="group relative aspect-square bg-white dark:bg-gray-900 rounded-[2.5rem] p-6 shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-100 dark:border-gray-800 hover:-translate-y-2 flex flex-col items-center justify-center text-center"
              >
                <div className={cn(
                  "w-16 h-16 rounded-3xl mb-4 flex items-center justify-center transition-all duration-500 group-hover:scale-110 group-hover:rotate-12 shadow-sm group-hover:shadow-blue-500/20",
                  location.type === 'store'
                    ? "bg-blue-50 text-blue-600 dark:bg-blue-900/20"
                    : "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20"
                )}>
                  <MapPin className="h-8 w-8 transition-transform group-hover:scale-110" />
                </div>

                <p className="font-black text-sm tracking-tight text-gray-800 dark:text-gray-200 line-clamp-2 px-2">
                  {location.name}
                </p>

                <span className={cn(
                  "mt-2 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest",
                  location.type === 'store'
                    ? "bg-blue-100/50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                    : "bg-emerald-100/50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                )}>
                  {location.type}
                </span>

                {/* Decoration */}
                <div className="absolute top-4 right-4 h-2 w-2 rounded-full bg-blue-500 scale-0 group-hover:scale-100 transition-transform duration-300 shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-[calc(100vh-1rem)] p-2 space-y-4 w-full mx-auto transition-all ${isFullscreen ? 'fixed inset-0 z-50 bg-background h-screen' : ''}`}>
      <div className="flex items-center gap-4 bg-muted/30 p-2 rounded-2xl border border-muted h-20">
        <div className="flex items-center gap-4 px-2">
          <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-xl">
            <ShoppingCart className="h-6 w-6 text-blue-600" />
          </div>
        </div>

        <div className="h-8 w-[1px] bg-border mx-1" />

        <div className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-gray-900 border rounded-xl shadow-sm hover:shadow-md transition-shadow cursor-pointer" onClick={() => { setSelectedLocation(''); handleClearCart(); }}>
          <MapPin className="h-3.5 w-3.5 text-blue-600" />
          <span className="font-bold text-sm truncate max-w-[150px]">
            {locations?.find((l: any) => l.id === Number(selectedLocation))?.name}
          </span>
          <X className="h-3 w-3 text-muted-foreground hover:text-red-500 ml-1" />
        </div>

        <div className="relative">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <select
            value={selectedCustomer}
            onChange={(e) => setSelectedCustomer(e.target.value)}
            className="pl-9 pr-8 py-2 border-none rounded-xl bg-white dark:bg-gray-900 text-sm w-48 shadow-sm focus:ring-2 focus:ring-blue-500 appearance-none font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <option value="">Walk-in Customer</option>
            {customers?.map((c: any) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div className="flex-1 relative max-w-2xl">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            ref={searchRef}
            placeholder="Scan SKU or search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-12 border-none bg-white dark:bg-gray-900 rounded-xl shadow-sm focus-visible:ring-2 focus-visible:ring-blue-500 text-base"
          />
        </div>

        <div className="flex-1" />

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={toggleFullscreen} className="rounded-xl hover:bg-white dark:hover:bg-gray-800" title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}>
            {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')} disabled={isFullscreen} className="font-semibold text-muted-foreground hover:text-red-600 rounded-xl px-3">
            Exit
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex gap-6 min-h-0">
        {/* Products Grid */}
        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {availableProducts.map((product: any) => {
              const stock = locationStock?.find((s: any) => s.product_id === product.id);
              const inCart = cart.find(item => item.product_id === product.id);

              return (
                <button
                  key={product.id}
                  onClick={() => addToCart(product.id)}
                  className={`p-4 rounded-xl transition-all text-left relative group overflow-hidden border-2
                    ${inCart
                      ? 'border-green-500 bg-green-50/30'
                      : 'border-transparent bg-white dark:bg-gray-900 hover:border-green-200'
                    } shadow-sm hover:shadow-md`}
                >
                  {inCart && (
                    <div className="absolute top-0 right-0 p-2 bg-green-500 rounded-bl-2xl shadow-sm">
                      <span className="relative z-10 text-white text-[10px] font-black flex items-center justify-center -mt-0.5 -mr-0.5 h-4 w-4">
                        {inCart.quantity}
                      </span>
                    </div>
                  )}

                  <div className="relative z-10">
                    <p className="font-bold text-sm leading-tight text-gray-800 dark:text-gray-100 line-clamp-2 min-h-[2.5rem]" dir="auto">
                      {product.name_ar || product.name_en}
                    </p>
                    <p className="text-[10px] text-muted-foreground font-mono mt-1 opacity-50 tracking-wide uppercase">
                      {product.sku}
                    </p>

                    <div className="flex items-end justify-between mt-3 pt-2 border-t border-dashed border-gray-100 dark:border-gray-800">
                      <div>
                        <span className="text-[10px] block text-muted-foreground uppercase font-semibold text-[0.6rem] mb-0.5">Price</span>
                        <span className="block text-lg font-black text-green-600 tracking-tight">
                          {formatCurrency(product.unit_price)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] block text-muted-foreground uppercase font-semibold text-[0.6rem] mb-0.5 text-right">Stock</span>
                        <div className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${stock?.quantity < 10
                          ? 'bg-red-50 text-red-600'
                          : 'bg-gray-100 text-gray-600'
                          }`}>
                          {formatQuantity(stock?.quantity || 0)}
                        </div>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
          {availableProducts.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-20 bg-muted/10 rounded-3xl border-2 border-dashed">
              <ShoppingCart className="h-20 w-20 mb-4 opacity-10" />
              <p className="text-xl font-medium">No matching products found</p>
              <p className="text-sm mt-1">Try a different search term or check stock</p>
            </div>
          )}
        </div>

        <Card className="w-[400px] flex flex-col h-full border-none shadow-xl rounded-2xl overflow-hidden bg-white dark:bg-gray-900">
          <div className="p-3 bg-gradient-to-r from-gray-900 to-gray-800 text-white flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <div className="bg-white/20 p-1.5 rounded-lg">
                <ShoppingCart className="h-4 w-4" />
              </div>
              <div>
                <span className="font-bold text-base leading-none block">Order Cart</span>
                <p className="text-[9px] text-white/70 font-bold uppercase tracking-wider mt-0.5">
                  {cart.length} items
                </p>
              </div>
            </div>
            {cart.length > 0 && (
              <button onClick={handleClearCart} className="hover:bg-red-500/80 p-1.5 rounded-lg bg-white/10 transition-colors">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Cart Items */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0 bg-gray-50/50 dark:bg-transparent custom-scrollbar">
            {cart.length === 0 ? (
              <div className="text-center py-20 text-muted-foreground opacity-50">
                <ShoppingCart className="h-16 w-16 mx-auto mb-4" />
                <p className="text-lg font-bold">Your cart is empty</p>
                <p className="text-xs px-10">Start adding products by clicking them in the grid</p>
              </div>
            ) : (
              cart.map((item) => (
                <div key={item.product_id} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-3 shadow-sm hover:shadow-md transition-all group relative">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1 min-w-0 pr-2">
                      <p className="font-bold text-sm leading-tight text-gray-900 dark:text-white truncate" dir="auto" title={item.product_name}>
                        {item.product_name}
                      </p>
                      <p className="text-[10px] text-muted-foreground font-mono mt-0.5 opacity-60">
                        {item.sku}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-sm text-green-600">
                        {formatCurrency(item.total)}
                      </p>
                      {item.discount_percent > 0 && (
                        <p className="text-[9px] font-bold text-red-500">-{item.discount_percent}% OFF</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 mt-4">
                    <div className="flex flex-col">
                      <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Unit Price</span>
                      <span className="text-xs font-extrabold text-gray-700 dark:text-gray-300">
                        {formatCurrency(item.unit_price)}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Item Discount Field */}
                      <div className="flex items-center bg-gray-50 dark:bg-gray-800/50 rounded-xl px-2 h-9 border border-gray-100 dark:border-gray-800">
                        <span className="text-[10px] font-black text-muted-foreground mr-1">%</span>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={item.discount_percent}
                          onChange={(e) => updateItemDiscount(item.product_id, e.target.value)}
                          className="w-10 text-center text-xs font-black bg-transparent border-none focus:ring-0 p-0"
                        />
                      </div>

                      {/* Quantity Controls */}
                      <div className="flex items-center bg-gray-900 dark:bg-gray-800 text-white rounded-xl p-0.5 h-9">
                        <button
                          onClick={() => updateQuantity(item.product_id, -1)}
                          className="w-8 h-full flex items-center justify-center hover:bg-white/10 rounded-lg transition-colors"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <input
                          type="number"
                          step="0.01"
                          value={item.quantity}
                          onChange={(e) => manualQuantityUpdate(item.product_id, e.target.value)}
                          className="w-12 text-center text-xs font-black bg-transparent border-none focus:ring-0 p-0"
                        />
                        <button
                          onClick={() => updateQuantity(item.product_id, 1)}
                          className="w-8 h-full flex items-center justify-center hover:bg-white/10 rounded-lg transition-colors"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Remove Button */}
                  <button
                    onClick={() => setCart(cart.filter(i => i.product_id !== item.product_id))}
                    className="absolute -top-2 -right-2 h-7 w-7 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 text-red-500 rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Payment Section */}
          <div className="p-4 bg-white dark:bg-gray-950 border-t space-y-4 shadow-[0_-10px_20px_-10px_rgba(0,0,0,0.05)] shrink-0">
            <div className="space-y-3">
              <div className="flex justify-between items-center group">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Subtotal</span>
                <span className="text-sm font-black text-gray-700 dark:text-gray-300">
                  {formatCurrency(calculateSubtotal())}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Discount %</span>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={invoiceDiscountPercent}
                      onChange={(e) => setInvoiceDiscountPercent(e.target.value)}
                      className="h-8 w-16 text-center text-xs font-black bg-muted/50 border-none rounded-lg focus:ring-2 focus:ring-blue-500 transition-all"
                    />
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-black text-red-500">
                    -{formatCurrency(calculateInvoiceDiscount())}
                  </span>
                </div>
              </div>

              <div className="pt-3 border-t-2 border-dashed border-gray-100 dark:border-gray-800 flex justify-between items-end">
                <span className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tighter">Total Amount</span>
                <span className="text-3xl font-black text-blue-600 leading-none tracking-tighter">
                  {formatCurrency(calculateTotal())}
                </span>
              </div>
            </div>

            {cart.length > 0 && !showPayment && (
              <Button
                className="w-full h-12 text-base font-bold rounded-xl bg-blue-600 hover:bg-blue-700 shadow-md transition-all"
                onClick={() => { setShowPayment(true); setPaidAmount(total.toString()); }}
              >
                PAY NOW
              </Button>
            )}

            {showPayment && (
              <div className="space-y-4 animate-in slide-in-from-bottom-4">
                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase tracking-widest opacity-70">Amount Received</Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                      <Input
                        type="number"
                        value={paidAmount}
                        onChange={(e) => setPaidAmount(e.target.value)}
                        placeholder="0.00"
                        className="pl-10 h-12 text-lg font-black rounded-xl border-2 focus:border-blue-500"
                      />
                    </div>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setPaidAmount(total.toString())}
                      className="h-12 w-12 rounded-xl border-2 hover:bg-blue-50"
                      title="Exact amount"
                    >
                      <Check className="h-6 w-6 text-blue-600" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase tracking-widest opacity-70">Payment Method</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {['cash', 'card', 'bank_transfer'].map((method) => (
                      <button
                        key={method}
                        onClick={() => setPaymentMethod(method)}
                        className={`py-2 rounded-xl text-xs font-bold capitalize transition-all border-2
                          ${paymentMethod === method
                            ? 'bg-blue-600 border-blue-600 text-white shadow-md'
                            : 'bg-muted/50 border-transparent hover:border-blue-200'}`}
                      >
                        {method.replace('_', ' ')}
                      </button>
                    ))}
                  </div>
                </div>

                {Number(paidAmount) > 0 && Number(paidAmount) >= total && (
                  <div className="p-4 bg-green-500 text-white rounded-2xl text-center animate-in zoom-in-95 shadow-lg shadow-green-500/20">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80">Change Due</p>
                    <p className="text-3xl font-black">{formatCurrency(Number(paidAmount) - total)}</p>
                  </div>
                )}

                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1 h-12 rounded-xl font-bold" onClick={() => setShowPayment(false)}>
                    CANCEL
                  </Button>
                  <Button
                    className="flex-1 h-12 rounded-xl bg-green-600 hover:bg-green-700 font-extrabold shadow-lg shadow-green-500/20"
                    onClick={handleCompleteSale}
                    disabled={createSaleMutation.isPending || (Number(paidAmount) < total && !selectedCustomer)}
                  >
                    {createSaleMutation.isPending ? '...' : 'FINISH SALE'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Print Component (Hidden) */}
      <div className="hidden">
        {lastInvoice && (
          <InvoicePrint
            ref={printRef}
            invoiceNumber={lastInvoice.invoiceNumber}
            invoiceDate={lastInvoice.invoiceDate}
            customerName={lastInvoice.customerName}
            locationName={lastInvoice.locationName}
            items={lastInvoice.items}
            subtotal={lastInvoice.subtotal}
            discountAmount={lastInvoice.discountAmount}
            totalAmount={lastInvoice.totalAmount}
            paidAmount={lastInvoice.paidAmount}
            remainingAmount={lastInvoice.remainingAmount}
            paymentMethod={lastInvoice.paymentMethod}
          />
        )}
      </div>

      {/* Print Button for desktop */}
      {lastInvoice && !createSaleMutation.isPending && (
        <div className="fixed bottom-6 right-6 flex gap-2 animate-in slide-in-from-right-10">
          <Button
            onClick={handlePrint}
            size="lg"
            className="shadow-2xl h-14 px-8 rounded-2xl bg-blue-600 hover:bg-blue-700 font-bold"
          >
            <Printer className="mr-2 h-5 w-5" />
            REPRINT RECEIPT
          </Button>
        </div>
      )}
    </div>
  );
}
