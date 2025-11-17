import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  ActivityIndicator,
  useWindowDimensions,
  RefreshControl,
  StatusBar,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import apiService from '../services/api.service';
import receiptService from '../services/receipt.service';
import { StockItem, Customer, CartItem } from '../types';
import { usePrinter } from '../../hooks/usePrinter';

// Cart Item Component with internal state to prevent drawer re-renders
const CartItemComponent = React.memo(
  ({
    item,
    onUpdateQuantity,
    onUpdateDiscount,
    onRemove,
  }: {
    item: CartItem;
    onUpdateQuantity: (productId: number, quantity: number) => void;
    onUpdateDiscount: (productId: number, discount: number) => void;
    onRemove: (productId: number) => void;
  }) => {
    const [localQuantity, setLocalQuantity] = useState(item.quantity);
    const [localDiscount, setLocalDiscount] = useState(item.discount_percent.toString());
    const [localTotal, setLocalTotal] = useState(item.total);
    const timeoutRef = React.useRef<NodeJS.Timeout | null>(null);

    // Sync with parent state changes (e.g., when item is added or removed)
    React.useEffect(() => {
      setLocalQuantity(item.quantity);
      setLocalTotal(item.total);
    }, [item.quantity, item.total]);

    // Calculate total locally
    const calculateLocalTotal = (qty: number, disc: number) => {
      const subtotal = qty * item.unit_price;
      const discountAmount = subtotal * (disc / 100);
      return subtotal - discountAmount;
    };

    const handleQuantityChange = (newQty: number) => {
      if (newQty <= 0) {
        onRemove(item.product.id);
        return;
      }

      // Check stock availability
      if (newQty > item.product.quantity) {
        Alert.alert('Stock Limit', `Only ${item.product.quantity} items available`);
        return;
      }

      setLocalQuantity(newQty);
      const disc = parseFloat(localDiscount) || 0;
      const newTotal = calculateLocalTotal(newQty, disc);
      setLocalTotal(newTotal);

      // Debounce the parent update
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        onUpdateQuantity(item.product.id, newQty);
      }, 100);
    };

    const handleDiscountChange = (text: string) => {
      setLocalDiscount(text);
      const disc = parseFloat(text) || 0;
      const newTotal = calculateLocalTotal(localQuantity, disc);
      setLocalTotal(newTotal);

      // Debounce the parent update
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        onUpdateDiscount(item.product.id, disc);
      }, 300);
    };

    // Cleanup timeout on unmount
    React.useEffect(() => {
      return () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
      };
    }, []);

    return (
      <View className="border-b border-gray-100 p-4">
        <View className="mb-2 flex-row items-start justify-between">
          <View className="flex-1">
            <Text className="font-medium text-gray-900">{item.product.name}</Text>
            <Text className="mt-1 text-xs text-gray-500">SKU: {item.product.sku}</Text>
          </View>
          <TouchableOpacity onPress={() => onRemove(item.product.id)}>
            <Text className="ml-2 text-xl text-red-600">×</Text>
          </TouchableOpacity>
        </View>

        <View className="mb-2 flex-row items-center justify-between">
          <View className="flex-row items-center">
            <TouchableOpacity
              onPress={() => handleQuantityChange(localQuantity - 1)}
              className="h-9 w-9 items-center justify-center rounded bg-gray-200"
              disabled={localQuantity <= 1}>
              <Text
                className={`text-lg font-bold ${localQuantity <= 1 ? 'text-gray-400' : 'text-gray-700'}`}>
                −
              </Text>
            </TouchableOpacity>
            <Text className="w-12 text-center text-base font-semibold">{localQuantity}</Text>
            <TouchableOpacity
              onPress={() => handleQuantityChange(localQuantity + 1)}
              className="h-9 w-9 items-center justify-center rounded bg-gray-200"
              disabled={localQuantity >= item.product.quantity}>
              <Text
                className={`text-lg font-bold ${localQuantity >= item.product.quantity ? 'text-gray-400' : 'text-gray-700'}`}>
                +
              </Text>
            </TouchableOpacity>
          </View>
          <View>
            <Text className="text-sm text-gray-600">@ ${item.unit_price.toFixed(2)}</Text>
            <Text className="text-xs text-gray-400">Stock: {item.product.quantity}</Text>
          </View>
        </View>

        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center">
            <Text className="mr-2 text-sm text-gray-600">Discount:</Text>
            <TextInput
              className="w-16 rounded border border-gray-300 px-2 py-1 text-sm"
              value={localDiscount}
              onChangeText={handleDiscountChange}
              keyboardType="numeric"
              selectTextOnFocus
            />
            <Text className="ml-1 text-sm text-gray-600">%</Text>
          </View>
          <Text className="font-bold text-gray-900">${localTotal.toFixed(2)}</Text>
        </View>
      </View>
    );
  },
  (prevProps, nextProps) => {
    // Only re-render if the product ID changes (item was replaced)
    return prevProps.item.product.id === nextProps.item.product.id;
  }
);

export default function POSScreen() {
  const { user, logout } = useAuth();
  const { width, height } = useWindowDimensions();
  const { printReceipt, isConnected, PrinterComponent } = usePrinter();
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [filteredStock, setFilteredStock] = useState<StockItem[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showCart, setShowCart] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const cartWidth = 380;

  const loadStock = useCallback(async () => {
    const locationId = user?.location_id;

    console.log('Loading stock for location:', locationId);
    console.log('User location_id:', user?.location_id);

    if (!locationId) {
      Alert.alert('Error', 'No location assigned to your account');
      setIsLoading(false);
      return;
    }

    try {
      console.log('Calling getLocationStock API with locationId:', locationId);
      const response = await apiService.getLocationStock(locationId);
      console.log('Stock response:', response);

      if (response.ok || response.success) {
        console.log('Stock data:', response.data);
        // Transform backend data to match frontend interface
        const transformedData = (response.data || []).map((item: any) => ({
          id: item.product_id,
          name: item.name_en || item.name_ar || 'Unknown',
          sku: item.sku,
          barcode: item.barcode,
          category_name: item.category_name_en || item.category_name_ar,
          unit_price: parseFloat(item.unit_price) || 0,
          quantity: parseInt(item.quantity) || 0,
          location_type: item.location_type,
          location_id: item.location_id,
        }));

        console.log('Transformed stock items:', transformedData);
        setStockItems(transformedData);
      } else {
        console.log('Stock response not successful:', response);
      }
    } catch (error) {
      console.error('Failed to load stock:', error);
      Alert.alert('Error', 'Failed to load stock');
    } finally {
      setIsLoading(false);
    }
  }, [user?.location_id]);

  const loadCustomers = useCallback(async () => {
    try {
      const response = await apiService.getCustomers();
      console.log('Customers response:', response);

      // Handle pagination response format: {data: [], total: 0, current_page: 1, ...}
      const customersData = response.data || [];
      console.log('Customers data:', customersData);

      if (Array.isArray(customersData)) {
        setCustomers(customersData);
      } else {
        setCustomers([]);
      }
    } catch (error) {
      console.error('Failed to load customers:', error);
      setCustomers([]);
    }
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([loadStock(), loadCustomers()]);
    } catch (error) {
      console.error('Refresh error:', error);
    } finally {
      setRefreshing(false);
    }
  }, [loadStock, loadCustomers]);

  const filterStock = useCallback(() => {
    if (!searchQuery.trim()) {
      setFilteredStock(stockItems);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = stockItems.filter(
      (item) =>
        item.name.toLowerCase().includes(query) ||
        item.sku?.toLowerCase().includes(query) ||
        item.barcode?.toLowerCase().includes(query)
    );
    setFilteredStock(filtered);
  }, [searchQuery, stockItems]);

  useEffect(() => {
    loadStock();
    loadCustomers();
  }, [loadStock, loadCustomers]);

  useEffect(() => {
    filterStock();
  }, [filterStock]);

  const addToCart = (product: StockItem) => {
    if (product.quantity <= 0) {
      Alert.alert('Out of Stock', 'This product is currently out of stock');
      return;
    }

    const existingItem = cart.find((item) => item.product.id === product.id);

    if (existingItem) {
      if (existingItem.quantity >= product.quantity) {
        Alert.alert('Error', `Only ${product.quantity} items available in stock`);
        return;
      }
      updateCartItemQuantity(product.id, existingItem.quantity + 1);
    } else {
      const newItem: CartItem = {
        product,
        quantity: 1,
        unit_price: product.unit_price,
        discount_percent: 0,
        total: product.unit_price,
      };
      setCart([...cart, newItem]);
      setShowCart(true);
    }
  };

  const removeFromCart = useCallback((productId: number) => {
    setCart((prevCart) => prevCart.filter((item) => item.product.id !== productId));
  }, []);

  const updateCartItemQuantity = useCallback(
    (productId: number, quantity: number) => {
      if (quantity <= 0) {
        removeFromCart(productId);
        return;
      }

      setCart((prevCart) =>
        prevCart.map((item) => {
          if (item.product.id === productId) {
            const stockItem = stockItems.find((s) => s.id === productId);
            if (stockItem && quantity > stockItem.quantity) {
              Alert.alert('Error', 'Not enough stock available');
              return item;
            }

            const subtotal = quantity * item.unit_price;
            const discount = subtotal * (item.discount_percent / 100);
            const total = subtotal - discount;

            return { ...item, quantity, total };
          }
          return item;
        })
      );
    },
    [stockItems, removeFromCart]
  );

  const updateCartItemDiscount = useCallback((productId: number, discount: number) => {
    setCart((prevCart) =>
      prevCart.map((item) => {
        if (item.product.id === productId) {
          const subtotal = item.quantity * item.unit_price;
          const discountAmount = subtotal * (discount / 100);
          const total = subtotal - discountAmount;

          return { ...item, discount_percent: discount, total };
        }
        return item;
      })
    );
  }, []);

  const calculateTotal = useCallback(() => {
    return cart.reduce((sum, item) => sum + item.total, 0);
  }, [cart]);

  const generateBluetoothReceipt = (receiptData: {
    invoiceNumber: string;
    customerName?: string;
    items: CartItem[];
    subtotal: number;
    discount: number;
    tax: number;
    total: number;
    date: string;
    cashierName?: string;
  }) => {
    const storeName = 'إيصال بيع';
    const customerLine = receiptData.customerName
      ? `العميل: ${receiptData.customerName}`
      : 'العميل: زبون نقدي';

    const itemsLines = receiptData.items
      .map((item) => {
        const name = item.product.name;
        const qty = item.quantity.toString();
        const price = item.unit_price.toFixed(2);
        const total = item.total.toFixed(2);
        return `${name}\nالكمية: ${qty}  السعر: ${price}  الإجمالي: ${total}`;
      })
      .join('\n');

    return `
${storeName}
--------------------
رقم الفاتورة: ${receiptData.invoiceNumber}
${customerLine}
${receiptData.cashierName ? `الكاشير: ${receiptData.cashierName}\n` : ''}
${receiptData.date}
--------------------
${itemsLines}
--------------------
المجموع الفرعي: ${receiptData.subtotal.toFixed(2)}
الخصم: ${receiptData.discount.toFixed(2)}
الضريبة: ${receiptData.tax.toFixed(2)}
الإجمالي: ${receiptData.total.toFixed(2)}
شكراً لتسوقكم معنا
`;
  };

  const handleCheckout = async () => {
    if (cart.length === 0) {
      Alert.alert('Error', 'Cart is empty');
      return;
    }

    if (!user?.location_id) {
      Alert.alert('Error', 'No location assigned to your account');
      return;
    }

    Alert.alert(
      'Confirm Sale',
      `Total: $${calculateTotal().toFixed(2)}\n${selectedCustomer ? `Customer: ${selectedCustomer.name}` : 'Walk-in Customer'}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              setIsLoading(true);
              const invoiceData = {
                location_id: user.location_id!,
                customer_id: selectedCustomer?.id,
                items: cart.map((item) => ({
                  product_id: item.product.id,
                  quantity: item.quantity,
                  unit_price: item.unit_price,
                  discount_percent: item.discount_percent || 0,
                })),
                paid_amount: calculateTotal(),
                payment_method: 'cash', // Default to cash for POS sales
              };

              console.log('Creating invoice with data:', JSON.stringify(invoiceData, null, 2));
              console.log('User location_id:', user.location_id);

              const response = await apiService.createSalesInvoice(invoiceData);

              if (response.ok || response.success) {
                const invoice = response.data;

                // Ask if user wants to print receipt
                Alert.alert('Success', 'Sale completed successfully!', [
                  {
                    text: 'Print Receipt',
                    onPress: async () => {
                      const receiptData = {
                        invoiceNumber: invoice.invoice_number,
                        customerName: selectedCustomer?.name,
                        items: cart.length > 0 ? cart : invoice.items || [],
                        subtotal: parseFloat(invoice.subtotal) || 0,
                        tax: parseFloat(invoice.tax_amount) || 0,
                        discount: parseFloat(invoice.discount_amount) || 0,
                        total: parseFloat(invoice.total_amount) || 0,
                        date: new Date().toLocaleString(),
                        locationId: user.location_id!,
                        cashierName: user.full_name,
                      };

                      try {
                        if (isConnected()) {
                          const receiptString = generateBluetoothReceipt(receiptData);
                          await printReceipt(receiptString);
                          Alert.alert('Success', 'Receipt sent to Bluetooth printer.');
                        } else {
                          await receiptService.printReceipt(receiptData);
                        }
                      } catch (error) {
                        console.error('Print error:', error);
                        Alert.alert(
                          'Print Error',
                          'Failed to print receipt. Check printer connection.'
                        );
                      }
                      clearCart();
                      setSelectedCustomer(null);
                      setShowCart(false);
                      loadStock();
                    },
                  },
                  {
                    text: 'Skip',
                    onPress: () => {
                      clearCart();
                      setSelectedCustomer(null);
                      setShowCart(false);
                      loadStock();
                    },
                  },
                ]);
              } else {
                Alert.alert('Error', response.message || 'Failed to create sale');
              }
            } catch (error: any) {
              console.error('Checkout error:', error);
              console.error('Error response:', error.response?.data);
              const errorMessage =
                error.response?.data?.message || error.message || 'Failed to complete sale';
              Alert.alert('Error', errorMessage);
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
    );
  };

  const clearCart = () => {
    Alert.alert('Clear Cart', 'Are you sure you want to clear the cart?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: () => setCart([]) },
    ]);
  };

  if (isLoading && stockItems.length === 0) {
    return (
      <View className="flex-1 bg-gray-50">
        <SafeAreaView edges={['top']} style={{ backgroundColor: '#FFFFFF' }}>
          <View className="bg-white px-5 py-4 shadow-sm">
            <View className="mb-2 h-6 w-32 rounded-lg bg-gray-200" />
            <View className="h-4 w-24 rounded bg-gray-100" />
          </View>
        </SafeAreaView>

        <View className="p-4">
          <View className="mb-3 flex-row gap-3">
            {[1, 2].map((i) => (
              <View
                key={i}
                className="h-48 flex-1 rounded-3xl bg-white p-4"
                style={{ elevation: 2 }}>
                <View className="mb-3 h-6 w-20 rounded-full bg-gray-200" />
                <View className="mb-2 h-10 w-full rounded bg-gray-100" />
                <View className="mb-4 h-4 w-16 rounded bg-gray-100" />
                <View className="flex-row items-center justify-between">
                  <View className="h-8 w-20 rounded bg-gray-200" />
                  <View className="h-12 w-12 rounded-2xl bg-gray-200" />
                </View>
              </View>
            ))}
          </View>
          <View className="mb-3 flex-row gap-3">
            {[1, 2].map((i) => (
              <View
                key={i}
                className="h-48 flex-1 rounded-3xl bg-white p-4"
                style={{ elevation: 2 }}>
                <View className="mb-3 h-6 w-20 rounded-full bg-gray-200" />
                <View className="mb-2 h-10 w-full rounded bg-gray-100" />
                <View className="mb-4 h-4 w-16 rounded bg-gray-100" />
                <View className="flex-row items-center justify-between">
                  <View className="h-8 w-20 rounded bg-gray-200" />
                  <View className="h-12 w-12 rounded-2xl bg-gray-200" />
                </View>
              </View>
            ))}
          </View>
        </View>
      </View>
    );
  }

  const CustomerModal = () => (
    <Modal
      visible={showCustomerModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowCustomerModal(false)}>
      <View className="flex-1 justify-end bg-black/40">
        <TouchableOpacity
          className="flex-1"
          activeOpacity={1}
          onPress={() => setShowCustomerModal(false)}
        />
        <View className="rounded-t-3xl bg-white" style={{ maxHeight: height * 0.7 }}>
          <SafeAreaView>
            <View className="flex-row items-center justify-between border-b border-gray-100 p-5">
              <View>
                <Text className="text-xl font-bold text-gray-900">Select Customer</Text>
                <Text className="mt-1 text-xs text-gray-500">Choose a customer for this sale</Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowCustomerModal(false)}
                className="h-10 w-10 items-center justify-center rounded-full bg-gray-100">
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView className="p-4" showsVerticalScrollIndicator={false}>
              <TouchableOpacity
                onPress={() => {
                  setSelectedCustomer(null);
                  setShowCustomerModal(false);
                }}
                className="mb-3 rounded-2xl border border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100 p-4"
                activeOpacity={0.7}
                style={{
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.05,
                  shadowRadius: 4,
                  elevation: 2,
                }}>
                <View className="flex-row items-center">
                  <View className="mr-3 h-12 w-12 items-center justify-center rounded-full bg-gray-200">
                    <Ionicons name="person-outline" size={24} color="#6B7280" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-base font-bold text-gray-900">Walk-in Customer</Text>
                    <Text className="mt-0.5 text-sm text-gray-500">No customer information</Text>
                  </View>
                  <Ionicons name="checkmark-circle" size={24} color="#10B981" />
                </View>
              </TouchableOpacity>

              {customers && customers.length > 0 ? (
                customers.map((customer) => (
                  <TouchableOpacity
                    key={customer.id}
                    onPress={() => {
                      setSelectedCustomer(customer);
                      setShowCustomerModal(false);
                    }}
                    className="mb-3 rounded-2xl border border-gray-200 bg-white p-4"
                    activeOpacity={0.7}
                    style={{
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.05,
                      shadowRadius: 4,
                      elevation: 2,
                    }}>
                    <View className="flex-row items-center">
                      <View className="mr-3 h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                        <Text className="text-lg font-bold text-blue-600">
                          {customer.name.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <View className="flex-1">
                        <Text className="text-base font-bold text-gray-900">{customer.name}</Text>
                        {customer.phone && (
                          <View className="mt-1 flex-row items-center">
                            <Ionicons name="call-outline" size={14} color="#6B7280" />
                            <Text className="ml-1 text-sm text-gray-600">{customer.phone}</Text>
                          </View>
                        )}
                        {customer.balance !== undefined && customer.balance > 0 && (
                          <View className="mt-1 flex-row items-center">
                            <Ionicons name="wallet-outline" size={14} color="#F59E0B" />
                            <Text className="ml-1 text-sm font-semibold text-orange-600">
                              Balance: ${customer.balance.toFixed(2)}
                            </Text>
                          </View>
                        )}
                      </View>
                      <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                    </View>
                  </TouchableOpacity>
                ))
              ) : (
                <View className="items-center p-12">
                  <Ionicons name="people-outline" size={64} color="#D1D5DB" />
                  <Text className="mt-4 text-base text-gray-400">No customers found</Text>
                  <Text className="mt-1 text-sm text-gray-400">Add customers to see them here</Text>
                </View>
              )}
            </ScrollView>
          </SafeAreaView>
        </View>
      </View>
    </Modal>
  );

  return (
    <View className="flex-1 bg-gray-50">
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" translucent={false} />

      {/* Modern Header with SafeArea */}
      <SafeAreaView edges={['top']} style={{ backgroundColor: '#FFFFFF' }}>
        <View className="bg-white px-5 py-4 shadow-sm">
          <View className="mb-4 flex-row items-center justify-between">
            <View className="flex-1">
              <Text className="text-2xl font-bold tracking-tight text-gray-900">Point of Sale</Text>
              <Text className="mt-0.5 text-sm text-gray-500">Sales Terminal</Text>
            </View>
            <View className="flex-row items-center gap-3">
              <TouchableOpacity
                onPress={() => setShowCart(true)}
                className="flex-row items-center rounded-2xl bg-blue-600 px-4 py-3"
                style={{
                  shadowColor: '#3B82F6',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 8,
                  elevation: 6,
                }}>
                <Ionicons name="cart" size={20} color="#FFFFFF" />
                {cart.length > 0 && (
                  <View className="ml-2 h-5 w-5 items-center justify-center rounded-full bg-white">
                    <Text className="text-xs font-extrabold text-blue-600">{cart.length}</Text>
                  </View>
                )}
              </TouchableOpacity>
              <TouchableOpacity onPress={logout} className="rounded-2xl bg-gray-100 px-4 py-3">
                <Ionicons name="log-out-outline" size={20} color="#374151" />
              </TouchableOpacity>
            </View>
          </View>

          <View className="flex-row items-center rounded-2xl border border-gray-200 bg-gray-50 px-5 py-3.5">
            <Ionicons name="search" size={20} color="#9CA3AF" style={{ marginRight: 12 }} />
            <TextInput
              className="flex-1 text-base text-gray-900"
              placeholder="Search products..."
              placeholderTextColor="#9CA3AF"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
        </View>
      </SafeAreaView>

      {/* Modern Products Grid */}
      <View className="flex-1 bg-gray-50">
        <FlatList
          data={filteredStock}
          keyExtractor={(item) => item.id.toString()}
          numColumns={2}
          columnWrapperStyle={{ gap: 12 }}
          contentContainerStyle={{ gap: 12, padding: 16, paddingBottom: 24 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#3B82F6']}
              tintColor="#3B82F6"
            />
          }
          renderItem={({ item }) => (
            <View
              className={`flex-1 overflow-hidden rounded-3xl ${item.quantity <= 0 ? 'bg-gray-100' : 'bg-white'}`}
              style={{
                maxWidth: '50%',
                borderWidth: item.quantity <= 0 ? 1 : 0,
                borderColor: '#E5E7EB',
                elevation: item.quantity <= 0 ? 0 : 4,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.08,
                shadowRadius: 12,
              }}>
              <View className="p-4">
                {/* Stock Badge */}
                <View
                  className={`mb-3 self-start rounded-full px-3 py-1 ${item.quantity <= 0 ? 'bg-red-100' : 'bg-green-100'}`}>
                  <Text
                    className={`text-xs font-bold ${item.quantity <= 0 ? 'text-red-700' : 'text-green-700'}`}>
                    {item.quantity <= 0 ? 'Out of Stock' : `${item.quantity} in stock`}
                  </Text>
                </View>

                {/* Product Name */}
                <Text
                  className={`mb-1 text-base font-bold leading-tight ${item.quantity <= 0 ? 'text-gray-400' : 'text-gray-900'}`}
                  numberOfLines={2}>
                  {item.name}
                </Text>

                {/* SKU */}
                <Text className="mb-4 text-xs font-medium text-gray-400">{item.sku}</Text>

                {/* Price and Add Button */}
                <View className="flex-row items-center justify-between">
                  <View>
                    <Text className="mb-0.5 text-xs text-gray-500">Price</Text>
                    <Text
                      className={`text-2xl font-extrabold ${item.quantity <= 0 ? 'text-gray-400' : 'text-blue-600'}`}>
                      ${item.unit_price.toFixed(2)}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => addToCart(item)}
                    disabled={item.quantity <= 0}
                    className={`h-12 w-12 items-center justify-center rounded-2xl ${item.quantity <= 0 ? 'bg-gray-300' : 'bg-blue-600'}`}
                    style={
                      !item.quantity
                        ? {}
                        : {
                            shadowColor: '#3B82F6',
                            shadowOffset: { width: 0, height: 4 },
                            shadowOpacity: 0.4,
                            shadowRadius: 8,
                            elevation: 8,
                          }
                    }>
                    <Ionicons name="add" size={28} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View className="items-center p-16">
              <Text className="mb-4 text-6xl">📦</Text>
              <Text className="mb-2 text-lg font-bold text-gray-900">No Products Found</Text>
              <Text className="text-center text-gray-500">
                Try adjusting your search or check back later
              </Text>
            </View>
          }
        />
      </View>

      {showCart && (
        <Modal
          visible={true}
          animationType="fade"
          transparent={true}
          onRequestClose={() => setShowCart(false)}
          statusBarTranslucent>
          <View className="flex-1 flex-row">
            <TouchableOpacity
              className="flex-1 bg-black/40"
              activeOpacity={1}
              onPress={() => setShowCart(false)}
            />
            <View style={{ width: cartWidth }} className="bg-white">
              <SafeAreaView className="flex-1">
                <View className="flex-row items-center justify-between border-b border-gray-100 bg-white p-4">
                  <View>
                    <Text className="text-lg font-bold text-gray-900">Cart</Text>
                    <Text className="text-xs text-gray-500">{cart.length} items</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setShowCart(false)}
                    className="h-9 w-9 items-center justify-center rounded-lg bg-gray-100">
                    <Text className="text-xl text-gray-600">×</Text>
                  </TouchableOpacity>
                </View>

                {/* Customer Selection */}
                <View
                  className="border-b border-gray-100 p-4"
                  style={{ backgroundColor: '#FFFFFF' }}>
                  <Text className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    👤 Customer
                  </Text>
                  <TouchableOpacity
                    onPress={() => setShowCustomerModal(true)}
                    className="flex-row items-center justify-between rounded-xl bg-gray-50 px-4 py-3.5"
                    style={{ borderWidth: 1, borderColor: '#E5E7EB' }}>
                    <View className="flex-1">
                      <Text className="font-semibold text-gray-900">
                        {selectedCustomer ? selectedCustomer.name : 'Walk-in Customer'}
                      </Text>
                      {selectedCustomer?.phone && (
                        <Text className="mt-0.5 text-xs text-gray-500">
                          📱 {selectedCustomer.phone}
                        </Text>
                      )}
                    </View>
                    <Text className="text-lg text-blue-600">›</Text>
                  </TouchableOpacity>
                  {selectedCustomer && (
                    <TouchableOpacity
                      onPress={() => setSelectedCustomer(null)}
                      className="mt-2 flex-row items-center">
                      <Text className="text-sm font-medium text-red-500">✕ Clear Customer</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Cart Items */}
                {cart.length === 0 ? (
                  <View className="flex-1 items-center justify-center p-8">
                    <Text className="text-lg text-gray-400">Cart is empty</Text>
                    <Text className="mt-2 text-sm text-gray-400">Add products to get started</Text>
                  </View>
                ) : (
                  <FlatList
                    data={cart}
                    keyExtractor={(item) => item.product.id.toString()}
                    renderItem={({ item }) => (
                      <CartItemComponent
                        item={item}
                        onUpdateQuantity={updateCartItemQuantity}
                        onUpdateDiscount={updateCartItemDiscount}
                        onRemove={removeFromCart}
                      />
                    )}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    removeClippedSubviews={false}
                    maxToRenderPerBatch={10}
                    updateCellsBatchingPeriod={50}
                    windowSize={10}
                    initialNumToRender={10}
                    extraData={cart}
                  />
                )}

                {/* Cart Summary */}
                <View className="border-t border-gray-100 bg-white p-4">
                  <View className="mb-3 rounded-xl bg-gray-50 p-4">
                    <View className="mb-2 flex-row items-center justify-between">
                      <Text className="text-sm text-gray-600">Items</Text>
                      <Text className="font-semibold text-gray-900">
                        {cart.reduce((sum, item) => sum + item.quantity, 0)}
                      </Text>
                    </View>
                    <View className="flex-row items-center justify-between">
                      <Text className="text-base font-bold text-gray-900">Total</Text>
                      <Text className="text-2xl font-bold text-gray-900">
                        ${calculateTotal().toFixed(2)}
                      </Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    onPress={handleCheckout}
                    disabled={cart.length === 0 || isLoading}
                    className={`mb-2 rounded-2xl py-4 ${cart.length === 0 || isLoading ? 'bg-gray-200' : 'bg-blue-600'}`}
                    style={
                      cart.length > 0 && !isLoading
                        ? {
                            shadowColor: '#3B82F6',
                            shadowOffset: { width: 0, height: 6 },
                            shadowOpacity: 0.4,
                            shadowRadius: 12,
                            elevation: 8,
                          }
                        : {}
                    }
                    activeOpacity={0.8}>
                    {isLoading ? (
                      <ActivityIndicator color="white" />
                    ) : (
                      <View className="flex-row items-center justify-center">
                        <Ionicons name="checkmark-circle" size={22} color="#FFFFFF" />
                        <Text className="ml-2 text-center text-base font-bold text-white">
                          Complete Sale
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={clearCart}
                    disabled={cart.length === 0}
                    className="rounded-xl bg-gray-50 py-3">
                    <Text
                      className={`text-center font-medium ${cart.length === 0 ? 'text-gray-400' : 'text-gray-700'}`}>
                      Clear Cart
                    </Text>
                  </TouchableOpacity>
                </View>
              </SafeAreaView>
            </View>
          </View>
        </Modal>
      )}

      <CustomerModal />
      
      {/* Hidden Bluetooth Printer Component */}
      <View style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }}>
        <PrinterComponent />
      </View>
    </View>
  );
}
