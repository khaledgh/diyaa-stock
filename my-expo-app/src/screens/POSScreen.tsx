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
  ToastAndroid,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import apiService from '../services/api.service';
import { StockItem, Customer, CartItem } from '../types';
import { usePrinter } from '../../hooks/usePrinter';
// import * as ImagePicker from 'expo-image-picker'; // Camera scan hidden for now

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

export default function POSScreen({ navigation }: any) {
  const { user, logout } = useAuth();
  const { height } = useWindowDimensions();
  const { printReceiptData } = usePrinter();
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
  const [transactionType, setTransactionType] = useState<'sales' | 'purchase'>('sales');
  const [selectedLocationId, setSelectedLocationId] = useState<number | null>(user?.location_id || null);
  const [locations, setLocations] = useState<any[]>([]);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [customerSearchResults, setCustomerSearchResults] = useState<Customer[]>([]);
  const [isSearchingCustomers, setIsSearchingCustomers] = useState(false);
  const [paymentType, setPaymentType] = useState<'paid' | 'partial'>('paid');
  const [partialAmount, setPartialAmount] = useState('');
  const [isPrinting, setIsPrinting] = useState(false);
  const [draftCount, setDraftCount] = useState(0);
  const [locationMode, setLocationMode] = useState<'automatic' | 'manual' | null>(null);
  const [hasCheckedSession, setHasCheckedSession] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [userLocations, setUserLocations] = useState<any[]>([]);
  const isAdmin = user?.role === 'admin';

  const cartWidth = 380;

  const showToast = (message: string) => {
    if (Platform.OS === 'android') {
      ToastAndroid.show(message, ToastAndroid.SHORT);
    } else {
      // iOS fallback - brief alert
      Alert.alert('', message);
    }
  };

  const loadStock = useCallback(async () => {
    const locationId = selectedLocationId || user?.location_id;

    if (!locationId) {
      if (!isAdmin) Alert.alert('Error', 'No location assigned to your account');
      setIsLoading(false);
      return;
    }

    try {
      const response = await apiService.getLocationStock(locationId);

      if (response.ok || response.success) {
        // Transform backend data to match frontend interface
        const transformedData = (response.data || []).map((item: any) => ({
          id: item.product_id,
          name: item.name_en || item.name_ar || 'Unknown',
          sku: item.sku,
          barcode: item.barcode,
          category_name: item.category_name_en || item.category_name_ar,
          unit_price: parseFloat(item.unit_price) || 0,
          quantity: parseFloat(item.quantity) || 0,
          location_type: item.location_type,
          location_id: item.location_id,
        }));

        setStockItems(transformedData);
      }
    } catch {
      // silently fail
      Alert.alert('Error', 'Failed to load stock');
    } finally {
      setIsLoading(false);
    }
  }, [selectedLocationId, user?.location_id, isAdmin]);
  // -------------------- NEW SESSION LOGIC --------------------
  const loadLocations = useCallback(async () => {
    try {
      const resp = await apiService.getLocations();
      if (resp.data) {
        setLocations(resp.data);
      }
    } catch { /* silently fail */ }
  }, []);

  const initSession = useCallback(async () => {
    try {
      setIsLoading(true);
      // 1. Get location mode
      const modeResp = await apiService.getLocationMode();
      const mode = modeResp.mode || 'automatic';
      setLocationMode(mode);

      // 2. Get today's session
      const sessResp = await apiService.getTodaySession();
      if (sessResp.ok && sessResp.session) {
        setSelectedLocationId(sessResp.session.location_id);
      } else {
        // No session found
        if (isAdmin) {
          await loadLocations();
          setShowLocationModal(true);
        } else if (mode === 'automatic') {
          const locsResp = await apiService.getUserLocations(user?.id || 0);
          const userLocs = locsResp.data || [];
          setUserLocations(userLocs);
          if (userLocs.length === 1) {
            handleLocationSelect(userLocs[0].id);
          } else {
            setShowLocationModal(true);
          }
        } else {
          Alert.alert(
            'Location Required',
            'Your location for today has not been assigned by an admin. Please contact your manager.'
          );
        }
      }
    } catch (e) {
      console.error('Session init error:', e);
    } finally {
      setIsLoading(false);
      setHasCheckedSession(true);
    }
  }, [isAdmin, user?.id]);

  const handleLocationSelect = async (locId: number) => {
    try {
      setIsLoading(true);
      if (!isAdmin) {
        await apiService.createSession(locId);
      }
      setSelectedLocationId(locId);
      setShowLocationModal(false);
    } catch (e) {
      Alert.alert('Error', 'Failed to start session at this location');
    } finally {
      setIsLoading(false);
    }
  };

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

  const loadCustomers = useCallback(async () => {
    try {
      const response = await apiService.getCustomers();

      // Handle pagination response format: {data: [], total: 0, current_page: 1, ...}
      const customersData = response.data || [];

      if (Array.isArray(customersData)) {
        setCustomers(customersData);
      } else {
        setCustomers([]);
      }
    } catch {
      setCustomers([]);
    }
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      if (isAdmin) await loadLocations();
      await Promise.all([loadStock(), loadCustomers()]);
    } catch {
      // silently fail
    } finally {
      setRefreshing(false);
    }
  }, [loadStock, loadCustomers, loadLocations, isAdmin]);

  useEffect(() => {
    initSession();
  }, [initSession]);

  // Customer First Flow
  useEffect(() => {
    if (hasCheckedSession && selectedLocationId && !selectedCustomer && !showCustomerModal) {
      setTimeout(() => setShowCustomerModal(true), 500);
    }
  }, [hasCheckedSession, selectedLocationId, selectedCustomer, showCustomerModal]);

  const loadDraftCount = useCallback(async () => {
    try {
      const locationId = selectedLocationId || user?.location_id;
      const res = await apiService.getInvoices({ invoice_type: 'sales', status: 'draft', location_id: locationId, limit: 1 });
      const total = res?.data?.pagination?.total || res?.pagination?.total || 0;
      setDraftCount(total);
    } catch (_) { /* ignore */ }
  }, [selectedLocationId, user?.location_id]);

  useEffect(() => {
    loadStock();
    loadCustomers();
    loadDraftCount();
  }, [loadStock, loadCustomers, loadDraftCount]);

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
      showToast(`${product.name} added to cart`);
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

  const handleSaveDraft = async () => {
    if (cart.length === 0) {
      Alert.alert('Error', 'Cart is empty');
      return;
    }
    if (!user?.location_id) {
      Alert.alert('Error', 'No location assigned to your account');
      return;
    }
    try {
      setIsLoading(true);
      const invoiceData = {
        location_id: selectedLocationId || user.location_id!,
        customer_id: selectedCustomer?.id,
        items: cart.map((item) => ({
          product_id: item.product.id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          discount_percent: item.discount_percent || 0,
        })),
        paid_amount: 0,
        payment_method: 'cash',
        status: 'draft',
      };
      const response = await apiService.createSalesInvoice(invoiceData);
      if (response.ok || response.success) {
        Alert.alert('Saved', 'Invoice saved as draft');
        setCart([]);
        setSelectedCustomer(null);
        setShowCart(false);
        loadDraftCount();
      } else {
        Alert.alert('Error', response.message || 'Failed to save draft');
      }
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to save draft');
    } finally {
      setIsLoading(false);
    }
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
              const totalAmount = calculateTotal();
              const paidAmount = paymentType === 'paid'
                ? totalAmount
                : parseFloat(partialAmount) || 0;

              const invoiceData = {
                location_id: selectedLocationId || user.location_id!,
                customer_id: selectedCustomer?.id,
                items: cart.map((item) => ({
                  product_id: item.product.id,
                  quantity: item.quantity,
                  unit_price: item.unit_price,
                  discount_percent: item.discount_percent || 0,
                })),
                paid_amount: paidAmount,
                payment_method: 'cash',
                status: 'finalized',
              };

              const response = await apiService.createSalesInvoice(invoiceData);

              if (response.ok || response.success) {
                const invoice = response.data;

                // Ask if user wants to print receipt
                Alert.alert('Success', 'Sale completed successfully!', [
                  {
                    text: 'Print Receipt',
                    onPress: async () => {
                      try {
                        setIsPrinting(true);
                        const printData = {
                          invoiceNumber: invoice.invoice_number,
                          customerName: selectedCustomer?.name,
                          items: cart.map(item => ({
                            name: item.product.name,
                            quantity: item.quantity,
                            unitPrice: item.unit_price,
                            total: item.total,
                            discountPercent: item.discount_percent || 0,
                          })),
                          subtotal: parseFloat(invoice.subtotal) || 0,
                          discount: parseFloat(invoice.discount_amount) || 0,
                          tax: parseFloat(invoice.tax_amount) || 0,
                          total: parseFloat(invoice.total_amount) || 0,
                          paidAmount: paidAmount,
                          date: new Date().toLocaleString(),
                          cashierName: user.full_name,
                          storeName: 'DaftarStock',
                        };
                        await printReceiptData(printData);
                      } catch (err: any) {
                        Alert.alert('Print Error', err?.message || 'Failed to print receipt');
                      } finally {
                        setIsPrinting(false);
                      }
                      setCart([]);
                      setSelectedCustomer(null);
                      setShowCart(false);
                      loadStock();
                    },
                  },
                  {
                    text: 'Skip',
                    onPress: () => {
                      setCart([]);
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

  // handleAIScan hidden for now - camera scan button removed
  // const handleAIScan = async () => { ... };

  const clearCart = () => {
    Alert.alert('Clear Cart', 'Are you sure you want to clear the cart?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: () => setCart([]) },
    ]);
  };

  const searchCustomersFromServer = useCallback(async (query: string) => {
    if (!query.trim()) {
      setCustomerSearchResults([]);
      setIsSearchingCustomers(false);
      return;
    }
    setIsSearchingCustomers(true);
    try {
      const response = await apiService.getCustomers({ search: query });
      const data = response.data || [];
      setCustomerSearchResults(Array.isArray(data) ? data : []);
    } catch {
      // silently fail
    } finally {
      setIsSearchingCustomers(false);
    }
  }, []);

  const customerSearchTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const handleCustomerSearch = (text: string) => {
    setCustomerSearchQuery(text);
    if (customerSearchTimeoutRef.current) clearTimeout(customerSearchTimeoutRef.current);
    customerSearchTimeoutRef.current = setTimeout(() => {
      searchCustomersFromServer(text);
    }, 400);
  };

  const displayedCustomers = customerSearchQuery.trim()
    ? customerSearchResults
    : customers;

  if (isLoading && stockItems.length === 0 && !showLocationModal) {
    return (
      <View className="flex-1 bg-gray-50 items-center justify-center">
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text className="mt-4 text-gray-500 font-medium">Loading session...</Text>
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
                <Text className="mt-1 text-xs text-gray-500">Search or choose a customer</Text>
              </View>
              <TouchableOpacity
                onPress={() => { setShowCustomerModal(false); setCustomerSearchQuery(''); }}
                className="h-10 w-10 items-center justify-center rounded-full bg-gray-100">
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {/* Search Input */}
            <View className="px-5 py-3 border-b border-gray-100">
              <View className="flex-row items-center rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5">
                <Ionicons name="search" size={18} color="#9CA3AF" />
                <TextInput
                  className="flex-1 ml-2 text-base text-gray-900"
                  placeholder="Search by name or phone..."
                  placeholderTextColor="#9CA3AF"
                  value={customerSearchQuery}
                  onChangeText={handleCustomerSearch}
                  autoFocus={false}
                />
                {isSearchingCustomers && <ActivityIndicator size="small" color="#3B82F6" />}
                {customerSearchQuery.length > 0 && !isSearchingCustomers && (
                  <TouchableOpacity onPress={() => { setCustomerSearchQuery(''); setCustomerSearchResults([]); }}>
                    <Ionicons name="close-circle" size={18} color="#9CA3AF" />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            <ScrollView className="p-4" showsVerticalScrollIndicator={false}>
              <TouchableOpacity
                onPress={() => {
                  setSelectedCustomer(null);
                  setShowCustomerModal(false);
                  setCustomerSearchQuery('');
                }}
                className={`mb-3 rounded-2xl p-4 ${!selectedCustomer ? 'border-2 border-green-400 bg-green-50' : 'border border-gray-200 bg-white'}`}
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
                  {!selectedCustomer && <Ionicons name="checkmark-circle" size={24} color="#10B981" />}
                </View>
              </TouchableOpacity>

              {displayedCustomers && displayedCustomers.length > 0 ? (
                displayedCustomers.map((customer) => (
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

  const renderLocationModal = (
    <Modal visible={showLocationModal} animationType="slide" transparent>
      <View className="flex-1 justify-center bg-black/60 px-6">
        <View className="rounded-3xl bg-white p-6 shadow-2xl">
          <View className="mb-6 items-center">
            <View className="mb-3 h-16 w-16 items-center justify-center rounded-2xl bg-blue-100">
              <Ionicons name="location" size={32} color="#3B82F6" />
            </View>
            <Text className="text-xl font-bold text-gray-900">Select Operating Location</Text>
            <Text className="mt-1 text-center text-gray-500">
              Where are you working from today?
            </Text>
          </View>
          <ScrollView className="max-h-80">
            {(isAdmin ? locations : userLocations).map((loc: any) => (
              <TouchableOpacity
                key={loc.id}
                onPress={() => handleLocationSelect(loc.id)}
                className="mb-3 flex-row items-center rounded-2xl border border-gray-100 bg-gray-50 p-4">
                <View className="mr-4 h-10 w-10 items-center justify-center rounded-xl bg-white shadow-sm">
                  <Ionicons name="business" size={20} color="#3B82F6" />
                </View>
                <View className="flex-1">
                  <Text className="text-base font-semibold text-gray-900">{loc.name}</Text>
                  <Text className="text-xs text-gray-500 capitalize">{loc.type || 'Branch'}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            ))}
          </ScrollView>
          {isAdmin && (
            <TouchableOpacity
              onPress={() => setShowLocationModal(false)}
              className="mt-4 items-center py-2">
              <Text className="font-semibold text-gray-400">Cancel</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );

  return (
    <View className="flex-1 bg-gray-50">
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" translucent={true} />
      {renderLocationModal}
      <CustomerModal />
      <SafeAreaView edges={['top']} style={{ backgroundColor: '#FFFFFF' }}>
        <View className="bg-white px-5 py-4" style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2 }}>
          <View className="mb-4 flex-row items-center justify-between">
            <View className="flex-1">
              <Text className="text-2xl font-bold tracking-tight text-gray-900">Point of Sale</Text>
              <Text className="mt-0.5 text-sm text-gray-500">Sales Terminal</Text>
            </View>
            <View className="flex-row items-center gap-3">
              {draftCount > 0 && (
                <View className="flex-row items-center rounded-2xl bg-orange-100 px-3 py-3">
                  <Ionicons name="document-text" size={18} color="#F97316" />
                  <Text className="ml-1 text-sm font-bold text-orange-600">{draftCount}</Text>
                </View>
              )}
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

          <View className="flex-row items-center gap-2">
            <TouchableOpacity
              onPress={() => setShowCustomerModal(true)}
              className={`flex-1 flex-row items-center rounded-2xl px-4 py-3.5 ${selectedCustomer ? 'bg-indigo-50 border border-indigo-100' : 'bg-gray-100'
                }`}>
              <Ionicons
                name="person-circle"
                size={22}
                color={selectedCustomer ? '#4F46E5' : '#6B7280'}
              />
              <Text
                className={`ml-2 flex-1 font-semibold ${selectedCustomer ? 'text-indigo-700' : 'text-gray-500'
                  }`}
                numberOfLines={1}>
                {selectedCustomer ? selectedCustomer.name : 'Select Customer'}
              </Text>
              {selectedCustomer && (
                <TouchableOpacity onPress={() => setSelectedCustomer(null)}>
                  <Ionicons name="close-circle" size={18} color="#4F46E5" />
                </TouchableOpacity>
              )}
            </TouchableOpacity>

            <View className="w-0.5 h-6 bg-gray-200 mx-1" />

            <View className="flex-1 flex-row items-center rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3.5">
              <Ionicons name="search" size={20} color="#9CA3AF" />
              <TextInput
                className="ml-2 flex-1 text-base text-gray-900"
                placeholder="Search products..."
                placeholderTextColor="#9CA3AF"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>
          </View>

          {isAdmin && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-3">
              <View className="flex-row gap-2 pr-4">
                {/* Location Selection */}
                {locations.map((loc) => (
                  <TouchableOpacity
                    key={loc.id}
                    onPress={() => setSelectedLocationId(loc.id)}
                    className={`rounded-xl px-4 py-2 border ${selectedLocationId === loc.id
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 bg-white'
                      }`}>
                    <Text
                      className={`font-medium ${selectedLocationId === loc.id ? 'text-blue-700' : 'text-gray-700'}`}>
                      {loc.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          )}
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
              className={`flex-1 overflow-hidden rounded-2xl ${item.quantity <= 0 ? 'bg-gray-100' : 'bg-white'}`}
              style={{
                maxWidth: '50%',
                borderWidth: item.quantity <= 0 ? 1 : 0,
                borderColor: '#E5E7EB',
                elevation: item.quantity <= 0 ? 0 : 3,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.06,
                shadowRadius: 8,
              }}>
              <View className="p-3">
                {/* Stock Badge + Add Button Row */}
                <View className="flex-row items-center justify-between mb-1.5">
                  <View
                    className={`rounded-full px-2 py-0.5 ${item.quantity <= 0 ? 'bg-red-100' : 'bg-green-100'}`}>
                    <Text
                      className={`text-[10px] font-bold ${item.quantity <= 0 ? 'text-red-700' : 'text-green-700'}`}>
                      {item.quantity <= 0 ? 'Out' : `${item.quantity}`}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => addToCart(item)}
                    disabled={item.quantity <= 0}
                    className={`h-9 w-9 items-center justify-center rounded-xl ${item.quantity <= 0 ? 'bg-gray-300' : 'bg-blue-600'}`}
                    style={
                      !item.quantity
                        ? {}
                        : { elevation: 4 }
                    }>
                    <Ionicons name="add" size={22} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>

                {/* Product Name */}
                <Text
                  className={`text-sm font-bold leading-tight ${item.quantity <= 0 ? 'text-gray-400' : 'text-gray-900'}`}
                  numberOfLines={2}>
                  {item.name}
                </Text>

                {/* Price */}
                <Text
                  className={`mt-1 text-lg font-extrabold ${item.quantity <= 0 ? 'text-gray-400' : 'text-blue-600'}`}>
                  ${item.unit_price.toFixed(2)}
                </Text>
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
                  <View className="flex-row items-center gap-2">
                    {cart.length > 0 && (
                      <TouchableOpacity
                        onPress={clearCart}
                        className="rounded-lg bg-red-50 px-3 py-2">
                        <Text className="text-xs font-semibold text-red-500">Clear</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      onPress={() => setShowCart(false)}
                      className="h-9 w-9 items-center justify-center rounded-lg bg-gray-100">
                      <Text className="text-xl text-gray-600">×</Text>
                    </TouchableOpacity>
                  </View>
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

                  {/* Payment Type Toggle */}
                  <View className="mb-3">
                    <Text className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Payment</Text>
                    <View className="flex-row rounded-xl bg-gray-100 p-1">
                      <TouchableOpacity
                        onPress={() => setPaymentType('paid')}
                        className={`flex-1 items-center rounded-lg py-2.5 ${paymentType === 'paid' ? 'bg-white' : ''}`}
                        style={paymentType === 'paid' ? { elevation: 1 } : {}}>
                        <Text className={`text-sm font-semibold ${paymentType === 'paid' ? 'text-green-600' : 'text-gray-500'}`}>
                          Fully Paid
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => setPaymentType('partial')}
                        className={`flex-1 items-center rounded-lg py-2.5 ${paymentType === 'partial' ? 'bg-white' : ''}`}
                        style={paymentType === 'partial' ? { elevation: 1 } : {}}>
                        <Text className={`text-sm font-semibold ${paymentType === 'partial' ? 'text-orange-600' : 'text-gray-500'}`}>
                          Partial
                        </Text>
                      </TouchableOpacity>
                    </View>
                    {paymentType === 'partial' && (
                      <View className="mt-2 flex-row items-center rounded-xl border border-gray-200 bg-white px-4 py-3">
                        <Text className="mr-2 text-sm text-gray-500">$</Text>
                        <TextInput
                          className="flex-1 text-base font-semibold text-gray-900"
                          placeholder="Amount paid..."
                          placeholderTextColor="#9CA3AF"
                          value={partialAmount}
                          onChangeText={setPartialAmount}
                          keyboardType="numeric"
                        />
                      </View>
                    )}
                  </View>

                  <View className="flex-row gap-3">
                    <TouchableOpacity
                      onPress={handleSaveDraft}
                      disabled={cart.length === 0 || isLoading}
                      className={`flex-1 rounded-2xl py-4 ${cart.length === 0 || isLoading ? 'bg-gray-200' : 'bg-orange-500'}`}
                      activeOpacity={0.8}>
                      <View className="flex-row items-center justify-center">
                        <Ionicons name="document-text-outline" size={20} color="#FFFFFF" />
                        <Text className="ml-1.5 text-center text-sm font-bold text-white">
                          Draft
                        </Text>
                      </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={handleCheckout}
                      disabled={cart.length === 0 || isLoading}
                      className={`flex-[2] rounded-2xl py-4 ${cart.length === 0 || isLoading ? 'bg-gray-200' : 'bg-blue-600'}`}
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
                  </View>
                </View>
              </SafeAreaView>
            </View>
          </View>
        </Modal>
      )}

      <CustomerModal />

      {/* Printing Overlay */}
      {isPrinting && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', zIndex: 9999 }}>
          <View className="bg-white rounded-3xl p-8 items-center" style={{ minWidth: 200 }}>
            <ActivityIndicator size="large" color="#3B82F6" />
            <Text className="text-gray-900 font-bold text-lg mt-4">Printing...</Text>
            <Text className="text-gray-500 text-sm mt-1">Please wait</Text>
          </View>
        </View>
      )}
    </View>
  );
}
