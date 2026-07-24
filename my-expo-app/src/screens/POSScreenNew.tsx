import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import apiService from '../services/api.service';
import { StockItem, Customer, CartItem, Category } from '../types';
import { usePrinter } from '../../hooks/usePrinter';
import QuantityModal from '../components/QuantityModal';
import { useTranslation } from 'react-i18next';
// AsyncStorage removed - not currently used

// ─── Helpers ────────────────────────────────────────────────────────────────
const ALL_CATEGORY = '__ALL__';

const showToast = (message: string) => {
  if (Platform.OS === 'android') {
    ToastAndroid.show(message, ToastAndroid.SHORT);
  } else {
    Alert.alert('', message);
  }
};

// Parse decimal input (comma or dot)
const parseDecimal = (text: string): number => {
  const normalized = text.replace(',', '.');
  return parseFloat(normalized) || 0;
};

// ─── Main Component ─────────────────────────────────────────────────────────
export default function POSScreenNew({ navigation }: any) {
  const { user, logout } = useAuth();
  const { height } = useWindowDimensions();
  const { printReceiptData } = usePrinter();
  const { t } = useTranslation();

  // Data
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [, setCategories] = useState<Category[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [locations, setLocations] = useState<any[]>([]);

  // UI State
  const [selectedCategory, setSelectedCategory] = useState<string>(ALL_CATEGORY);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showCartModal, setShowCartModal] = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedLocationId, setSelectedLocationId] = useState<number | null>(user?.location_id || null);
  const [paymentType, setPaymentType] = useState<'paid' | 'partial'>('paid');
  const [partialAmount, setPartialAmount] = useState('');
  const [isPrinting, setIsPrinting] = useState(false);
  const [showQuantityModal, setShowQuantityModal] = useState(false);
  const [quantityModalProduct, setQuantityModalProduct] = useState<StockItem | null>(null);
  const [locationMode, setLocationMode] = useState<'automatic' | 'manual'>('automatic');
  const [userLocations, setUserLocations] = useState<any[]>([]);
  const [todaySession, setTodaySession] = useState<any>(null);

  // Search
  const [searchResults, setSearchResults] = useState<StockItem[]>([]);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [customerSearchResults, setCustomerSearchResults] = useState<Customer[]>([]);
  const [isSearchingCustomers, setIsSearchingCustomers] = useState(false);
  const [quantityTextMap, setQuantityTextMap] = useState<{ [key: number]: string }>({});

  const isAdmin = user?.role === 'admin';
  const categoryListRef = useRef<ScrollView>(null);

  // ─── Data Loading ───────────────────────────────────────────────────────
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
        const transformed = (response.data || []).map((item: any) => {
          const rawName = item.name_ar || item.name || 'Unknown';
          const isUnknown = rawName.toLowerCase() === 'unknown';
          return {
            id: item.product_id || item.id,
            name: isUnknown ? (item.name_en || item.name_ar || item.name || 'Unknown') : rawName,
            name_en: isUnknown ? null : (item.name_en || null),
            sku: item.sku,
            barcode: item.barcode,
            category_name: item.category_name_en || item.category_name_ar || '',
            category_id: item.category_id,
            unit_price: parseFloat(item.unit_price || item.price) || 0,
            quantity: parseFloat(item.quantity) || 0,
            location_type: item.location_type,
            location_id: item.location_id,
          };
        });
        setStockItems(transformed);
      }
    } catch {
      Alert.alert('Error', 'Failed to load stock');
    } finally {
      setIsLoading(false);
    }
  }, [selectedLocationId, user?.location_id, isAdmin]);

  const loadCategories = useCallback(async () => {
    try {
      const resp = await apiService.getCategories();
      const data = resp.data || resp;
      if (Array.isArray(data)) {
        setCategories(data.filter((c: any) => c.is_active !== false));
      }
    } catch {
      // silently fail
    }
  }, []);

  const loadLocations = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const resp = await apiService.getLocations();
      if (resp.data) setLocations(resp.data);
    } catch {
      // silently fail
    }
  }, [isAdmin]);

  const loadCustomers = useCallback(async () => {
    try {
      const response = await apiService.getCustomers();
      const data = response.data || [];
      setCustomers(Array.isArray(data) ? data : []);
    } catch {
      setCustomers([]);
    }
  }, []);

  const loadSessionInfo = useCallback(async () => {
    if (isAdmin) return;
    try {
      const [modeResp, sessionResp, locsResp] = await Promise.all([
        apiService.getLocationMode(),
        apiService.getTodaySession(),
        apiService.getUserLocations(user?.id || 0),
      ]);
      
      const mode = modeResp.mode || 'automatic';
      setLocationMode(mode);
      setTodaySession(sessionResp.session);
      setUserLocations(locsResp.data || []);
      
      if (sessionResp.session) {
        setSelectedLocationId(sessionResp.session.location_id);
      }
    } catch {
      // ignore
    }
  }, [user?.id, isAdmin]);

  useEffect(() => {
    if (isAdmin) {
      loadLocations();
    } else {
      loadSessionInfo();
    }
  }, [isAdmin, loadLocations, loadSessionInfo]);

  useEffect(() => {
    loadStock();
    loadCategories();
    loadCustomers();
  }, [loadStock, loadCategories, loadCustomers]);

  useEffect(() => {
    if (selectedLocationId) loadStock();
  }, [selectedLocationId, loadStock]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      if (isAdmin) await loadLocations();
      await Promise.all([loadStock(), loadCategories(), loadCustomers()]);
    } catch {
      // silently fail
    } finally {
      setRefreshing(false);
    }
  }, [loadStock, loadCategories, loadCustomers, loadLocations, isAdmin]);

  // ─── Filtering ──────────────────────────────────────────────────────────
  const filteredItems = React.useMemo(() => {
    let items = stockItems;
    
    // Apply search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter(
        (item) =>
          item.name.toLowerCase().includes(q) ||
          item.sku?.toLowerCase().includes(q) ||
          item.barcode?.toLowerCase().includes(q)
      );
    }
    
    // Apply category filter
    if (selectedCategory !== ALL_CATEGORY) {
      items = items.filter((i) => i.category_name === selectedCategory);
    }
    
    return items;
  }, [stockItems, selectedCategory, searchQuery]);

  // Unique category names from stock
  const categoryNames = React.useMemo(() => {
    const names = new Set<string>();
    stockItems.forEach((item) => {
      if (item.category_name) names.add(item.category_name);
    });
    return Array.from(names).sort();
  }, [stockItems]);

  // Group items by category for the list
  const sections = React.useMemo(() => {
    if (selectedCategory !== ALL_CATEGORY) {
      // Sort: in-stock items first, then out-of-stock
      const sorted = [...filteredItems].sort((a, b) => {
        if (a.quantity > 0 && b.quantity <= 0) return -1;
        if (a.quantity <= 0 && b.quantity > 0) return 1;
        return 0;
      });
      return [{ title: selectedCategory, data: sorted }];
    }
    const map = new Map<string, StockItem[]>();
    filteredItems.forEach((item) => {
      const cat = item.category_name || 'Other';
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(item);
    });
    return Array.from(map.entries()).map(([title, data]) => {
      // Sort each category: in-stock first, then out-of-stock
      const sorted = data.sort((a, b) => {
        if (a.quantity > 0 && b.quantity <= 0) return -1;
        if (a.quantity <= 0 && b.quantity > 0) return 1;
        return 0;
      });
      return { title, data: sorted };
    });
  }, [filteredItems, selectedCategory]);

  // Search filter
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const q = searchQuery.toLowerCase();
    const results = stockItems.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.sku?.toLowerCase().includes(q) ||
        item.barcode?.toLowerCase().includes(q)
    );
    setSearchResults(results);
  }, [searchQuery, stockItems]);

  // ─── Cart Logic ─────────────────────────────────────────────────────────
  const getCartQty = (productId: number): number => {
    const item = cart.find((c) => c.product.id === productId);
    return item ? item.quantity : 0;
  };

  const setCartQty = (item: StockItem, qty: number, priceOverride?: number, discountOverride?: number) => {
    if (!selectedCustomer && qty > 0) {
      Alert.alert('Customer Required', 'Please select a customer before adding items.', [
        { text: 'Select Customer', onPress: () => setShowCustomerModal(true) },
        { text: 'Cancel', style: 'cancel' }
      ]);
      return;
    }
    
    setCart((prev) => {
      const existing = prev.find((c) => c.product.id === item.id);
      
      // If qty <= 0, remove the item
      if (qty <= 0) {
        return prev.filter((c) => c.product.id !== item.id);
      }

      // Check stock limit for NEW items or if increasing quantity
      if (qty > item.quantity) {
        if (item.quantity <= 0) {
          showToast(t('pos.outOfStock') || 'Out of stock');
          return existing ? prev : prev;
        }
        
        // If they are already at max stock, show message and don't increase
        if (existing && existing.quantity >= item.quantity) {
          showToast(`${t('pos.only')} ${item.quantity} ${t('pos.available')}`);
          return prev;
        }
        
        // Otherwise, adjust to max available stock
        showToast(`${t('pos.adjustedTo')} ${item.quantity}`);
        qty = item.quantity;
      }

      // Determine price and discount (prioritize overrides, then existing cart values, then base product price)
      const finalPrice = priceOverride !== undefined ? priceOverride : (existing ? existing.unit_price : item.unit_price);
      const finalDiscount = discountOverride !== undefined ? discountOverride : (existing ? existing.discount_percent : 0);
      const total = Math.round((qty * finalPrice * (1 - finalDiscount / 100)) * 100) / 100;

      if (existing) {
        return prev.map((c) =>
          c.product.id === item.id
            ? {
                ...c,
                quantity: qty,
                unit_price: finalPrice,
                discount_percent: finalDiscount,
                total: total,
              }
            : c
        );
      }

      return [
        ...prev,
        {
          product: item,
          quantity: qty,
          unit_price: finalPrice,
          discount_percent: finalDiscount,
          total: total,
        },
      ];
    });
  };

  const updateCartDiscount = (productId: number, discount: number) => {
    setCart((prev) =>
      prev.map((c) =>
        c.product.id === productId
          ? { ...c, discount_percent: discount, total: Math.round((c.quantity * c.unit_price * (1 - discount / 100)) * 100) / 100 }
          : c
      )
    );
  };

  const openItemEditModal = (item: CartItem) => {
    setQuantityModalProduct(item.product);
    setShowQuantityModal(true);
  };

  const removeFromCart = (productId: number) => {
    setCart((prev) => prev.filter((c) => c.product.id !== productId));
  };

  const clearCart = () => {
    Alert.alert('Clear Cart', 'Remove all items?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: () => setCart([]) },
    ]);
  };

  const calculateTotal = () => Math.round(cart.reduce((sum, item) => sum + item.total, 0) * 100) / 100;
  const totalItems = Math.round(cart.reduce((sum, item) => sum + item.quantity, 0) * 100) / 100;

  // ─── Checkout ───────────────────────────────────────────────────────────
  const handleCheckout = async () => {
    if (cart.length === 0) return Alert.alert('Error', 'Cart is empty');
    const locationId = selectedLocationId || user?.location_id;
    if (!locationId) return Alert.alert('Error', 'No location assigned');

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
              const paidAmount = paymentType === 'paid' ? totalAmount : parseDecimal(partialAmount);

              const invoiceData = {
                location_id: locationId,
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
                Alert.alert('Success', 'Sale completed!', [
                  {
                    text: 'Print Receipt',
                    onPress: async () => {
                      try {
                        setIsPrinting(true);
                        // Fetch customer balance for receipt
                        let customerBalance: number | undefined;
                        if (selectedCustomer?.id) {
                          try {
                            const custResp = await apiService.getCustomerById(selectedCustomer.id);
                            const cust = custResp.data || custResp;
                            customerBalance = parseFloat(cust.balance) || 0;
                          } catch { /* silently continue without balance */ }
                        }
                        await printReceiptData({
                          invoiceNumber: invoice.invoice_number,
                          customerName: selectedCustomer?.name,
                          items: cart.map((i) => ({
                            name: i.product.name,
                            quantity: i.quantity,
                            unitPrice: i.unit_price,
                            total: i.total,
                            discountPercent: i.discount_percent || 0,
                          })),
                          subtotal: parseFloat(invoice.subtotal) || 0,
                          discount: parseFloat(invoice.discount_amount) || 0,
                          tax: parseFloat(invoice.tax_amount) || 0,
                          total: parseFloat(invoice.total_amount) || 0,
                          paidAmount,
                          date: new Date().toLocaleString(),
                          cashierName: user?.full_name,
                          locationName: user?.location_name,
                          customerBalance,
                        });
                      } catch (err: any) {
                        Alert.alert('Print Error', err?.message || 'Failed to print');
                      } finally {
                        setIsPrinting(false);
                      }
                      resetAfterSale();
                    },
                  },
                  { text: 'Skip', onPress: resetAfterSale },
                ]);
              } else {
                Alert.alert('Error', response.message || 'Failed to create sale');
              }
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.message || error.message || 'Failed');
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
    );
  };

  const resetAfterSale = () => {
    setCart([]);
    setSelectedCustomer(null);
    setShowCartModal(false);
    setPaymentType('paid');
    setPartialAmount('');
    loadStock();
  };

  // ─── Customer Search ────────────────────────────────────────────────────
  const customerSearchTimeout = useRef<NodeJS.Timeout | null>(null);
  const handleCustomerSearch = (text: string) => {
    setCustomerSearchQuery(text);
    if (customerSearchTimeout.current) clearTimeout(customerSearchTimeout.current);
    customerSearchTimeout.current = setTimeout(async () => {
      if (!text.trim()) {
        setCustomerSearchResults([]);
        setIsSearchingCustomers(false);
        return;
      }
      setIsSearchingCustomers(true);
      try {
        const resp = await apiService.getCustomers({ search: text });
        const data = resp.data || [];
        setCustomerSearchResults(Array.isArray(data) ? data : []);
      } catch {
        // silently fail
      } finally {
        setIsSearchingCustomers(false);
      }
    }, 400);
  };

  const displayedCustomers = customerSearchQuery.trim() ? customerSearchResults : customers;

  // ─── Loading State ──────────────────────────────────────────────────────
  if (isLoading && stockItems.length === 0) {
    return (
      <View className="flex-1 bg-gray-50 items-center justify-center">
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text className="text-gray-500 mt-4">{t('common.loading')}</Text>
      </View>
    );
  }

  // ─── Sales Location Selector (Based on Mode) ───────────────────────────
  if (!isAdmin && !todaySession && locationMode === 'automatic') {
    return (
      <View className="flex-1 bg-gray-50">
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <SafeAreaView edges={['top']} style={{ backgroundColor: '#FFF' }}>
          <View className="bg-white px-5 py-4 border-b border-gray-100">
            <Text className="text-2xl font-bold text-gray-900">{t('pos.startSession')}</Text>
            <Text className="text-sm text-gray-500 mt-1">{t('pos.chooseWorkingLocation')}</Text>
          </View>
        </SafeAreaView>
        <ScrollView className="flex-1 p-5">
          {userLocations.length > 0 ? (
            userLocations.map((loc) => (
              <TouchableOpacity
                key={loc.id}
                onPress={async () => {
                  try {
                    setIsLoading(true);
                    const resp = await apiService.createSession(loc.id);
                    if (resp.ok || resp.success) {
                      setTodaySession(resp.data);
                      setSelectedLocationId(loc.id);
                      loadStock();
                    }
                  } catch (err: any) {
                    Alert.alert('Error', err?.message || 'Failed to start session');
                  } finally {
                    setIsLoading(false);
                  }
                }}
                className="bg-white flex-row items-center p-5 rounded-2xl mb-4 border border-blue-50"
                style={{ elevation: 3 }}>
                <View className="w-12 h-12 items-center justify-center rounded-2xl bg-blue-50 mr-4">
                  <Ionicons name="storefront" size={26} color="#2563EB" />
                </View>
                <View className="flex-1">
                  <Text className="text-base font-bold text-gray-900">{loc.name}</Text>
                  <Text className="text-xs text-gray-500 uppercase font-semibold">{loc.type || 'Branch'}</Text>
                </View>
                <Ionicons name="arrow-forward-circle" size={28} color="#2563EB" />
              </TouchableOpacity>
            ))
          ) : (
            <View className="items-center py-20">
              <Ionicons name="alert-circle-outline" size={64} color="#D1D5DB" />
              <Text className="text-gray-500 text-lg font-bold mt-4">{t('pos.noLocationsAssigned')}</Text>
              <Text className="text-gray-400 text-center mt-2 px-10">
                You are not specifically assigned to any location. Please contact your manager.
              </Text>
            </View>
          )}
        </ScrollView>
      </View>
    );
  }

  if (!isAdmin && !todaySession && locationMode === 'manual') {
    return (
      <View className="flex-1 bg-gray-50 items-center justify-center p-10">
        <View className="w-20 h-20 bg-orange-100 rounded-full items-center justify-center mb-6">
          <Ionicons name="lock-closed" size={40} color="#F97316" />
        </View>
        <Text className="text-xl font-bold text-gray-900 text-center">{t('pos.locationNotAssigned')}</Text>
        <Text className="text-gray-500 text-center mt-3 leading-6">
          Your operating location for today must be set by an Administrator.
          Please ask your manager to assign your station.
        </Text>
        <TouchableOpacity 
          onPress={loadSessionInfo}
          className="mt-8 bg-white border border-gray-200 px-6 py-3 rounded-full flex-row items-center">
          <Ionicons name="refresh" size={18} color="#4B5563" className="mr-2" />
          <Text className="text-gray-600 font-bold ml-2">{t('pos.checkAgain')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ─── Admin Location Selector ────────────────────────────────────────────
  if (isAdmin && !selectedLocationId) {
    return (
      <View className="flex-1 bg-gray-50">
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <SafeAreaView edges={['top']} style={{ backgroundColor: '#FFF' }}>
          <View className="bg-white px-5 py-4" style={{ elevation: 2 }}>
            <Text className="text-2xl font-bold text-gray-900">{t('pos.title')}</Text>
            <Text className="text-sm text-gray-500 mt-1">{t('pos.selectLocationToContinue')}</Text>
          </View>
        </SafeAreaView>
        <View className="flex-1 items-center justify-center p-6">
          <View className="w-20 h-20 items-center justify-center rounded-full bg-blue-100 mb-6">
            <Ionicons name="location" size={40} color="#2563EB" />
          </View>
          <Text className="text-xl font-bold text-gray-900 mb-2">{t('common.chooseLocation')}</Text>
          <Text className="text-sm text-gray-500 text-center mb-8">{t('pos.selectBranchToLoadProducts')}</Text>
          <View className="w-full">
            {locations.length > 0 ? (
              locations.map((loc) => (
                <TouchableOpacity
                  key={loc.id}
                  onPress={() => setSelectedLocationId(loc.id)}
                  className="bg-white flex-row items-center p-4 rounded-2xl mb-3 border border-gray-200"
                  style={{ elevation: 2 }}>
                  <View className="w-12 h-12 items-center justify-center rounded-xl bg-blue-50 mr-4">
                    <Ionicons name="storefront" size={24} color="#2563EB" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-base font-bold text-gray-900">{loc.name}</Text>
                    {loc.type && <Text className="text-xs text-gray-500 capitalize">{loc.type}</Text>}
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                </TouchableOpacity>
              ))
            ) : (
              <View className="items-center p-8">
                <ActivityIndicator size="large" color="#2563EB" />
                <Text className="text-gray-500 mt-4">Loading locations...</Text>
              </View>
            )}
          </View>
        </View>
      </View>
    );
  }

  // ─── Item Card (Menu Style) ─────────────────────────────────────────────
  const renderItemCard = (item: StockItem) => {
    const qty = getCartQty(item.id);
    const outOfStock = item.quantity <= 0;

    return (
      <View
        key={item.id}
        className={`flex-row items-center px-3 py-2.5 bg-white mb-1.5 mx-3 rounded-2xl ${outOfStock ? 'opacity-40' : ''}`}
        style={{ elevation: outOfStock ? 0 : 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4 }}>
        {/* Product icon with cart badge */}
        <View className="relative mr-3">
          <View className="w-12 h-12 rounded-2xl bg-blue-50 items-center justify-center">
            <Ionicons name="cube-outline" size={22} color="#3B82F6" />
          </View>
          {qty > 0 && (
            <View className="absolute -top-1.5 -right-1.5 bg-blue-600 min-w-[20px] h-[20px] rounded-full items-center justify-center px-1">
              <Text className="text-white text-[9px] font-black">{qty}</Text>
            </View>
          )}
        </View>

        {/* Product info */}
        <View className="flex-1 mr-2">
          <Text className="text-sm font-bold text-gray-900" numberOfLines={1}>
            {item.name?.toLowerCase() === 'unknown' ? (item.name_en || item.name_ar || item.name) : item.name}
          </Text>
          {item.name?.toLowerCase() !== 'unknown' && (item.name_en || item.name_ar) && (
            <Text className="text-[10px] text-gray-500 font-semibold" numberOfLines={1}>
              {item.name_en || item.name_ar}
            </Text>
          )}
          <View className="flex-row items-center mt-0.5">
            <Text className="text-base font-black text-blue-600">${item.unit_price.toFixed(2)}</Text>
            <View className={`rounded-full px-1.5 py-0.5 ml-2 ${outOfStock ? 'bg-red-100' : 'bg-green-50'}`}>
              <Text className={`text-[9px] font-bold ${outOfStock ? 'text-red-600' : 'text-green-600'}`}>
                {outOfStock ? 'Out' : `${item.quantity}`}
              </Text>
            </View>
          </View>
        </View>

        {/* Quantity stepper */}
        {!outOfStock && (
          <View className="flex-row items-center">
            {qty > 0 ? (
              <>
                <TouchableOpacity
                  onPress={() => setCartQty(item, qty - 1)}
                  className="w-12 h-12 rounded-2xl bg-blue-600 items-center justify-center"
                  style={{ elevation: 4 }}>
                  <Ionicons name="remove" size={24} color="#FFF" />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    setQuantityModalProduct(item);
                    setShowQuantityModal(true);
                  }}
                  className="mx-1 px-2 py-1 min-w-[40px]">
                  <Text className="text-center text-sm font-bold text-gray-900">{qty}</Text>
                </TouchableOpacity>
              </>
            ) : null}
            <TouchableOpacity
              onPress={() => {
                if (!selectedCustomer) {
                  setShowCustomerModal(true);
                  showToast("Please select a customer first");
                  return;
                }
                const displayName = item.name?.toLowerCase() === 'unknown' ? (item.name_en || item.name_ar || item.name) : item.name;
                setCartQty(item, qty + 1);
                if (qty === 0) showToast(`${displayName} ${t('pos.added')}`);
              }}
              className={`w-12 h-12 rounded-2xl items-center justify-center ${selectedCustomer ? 'bg-blue-600' : 'bg-blue-300'}`}
              style={{ elevation: 4 }}>
              <Ionicons name="add" size={24} color="#FFF" />
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <View className="flex-1 bg-slate-50">
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <SafeAreaView edges={['top']} style={{ backgroundColor: '#FFF' }}>
        <View className="bg-white px-4 pt-2 pb-1" style={{ elevation: 2 }}>
          {/* Top row: title + logout */}
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-lg font-black text-gray-900">{t('nav.sales')}</Text>
            <TouchableOpacity
              onPress={logout}
              className="w-9 h-9 rounded-full bg-gray-100 items-center justify-center">
              <Ionicons name="log-out-outline" size={18} color="#374151" />
            </TouchableOpacity>
          </View>

          {/* Admin location pills */}
          {isAdmin && locations.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-1">
              <View className="flex-row gap-1.5 pr-4">
                {locations.map((loc) => (
                  <TouchableOpacity
                    key={loc.id}
                    onPress={() => setSelectedLocationId(loc.id)}
                    className={`rounded-full px-3 py-1.5 border ${selectedLocationId === loc.id ? 'border-blue-600 bg-blue-600' : 'border-gray-200 bg-white'}`}>
                    <Text className={`text-[11px] font-semibold ${selectedLocationId === loc.id ? 'text-white' : 'text-gray-600'}`}>
                      {loc.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          )}

          {/* Category pills */}
          <ScrollView ref={categoryListRef} horizontal showsHorizontalScrollIndicator={false}>
            <View className="flex-row gap-1.5 pb-1">
              <TouchableOpacity
                onPress={() => setSelectedCategory(ALL_CATEGORY)}
                className={`rounded-full px-3 py-1.5 border ${selectedCategory === ALL_CATEGORY ? 'border-blue-600 bg-blue-600' : 'border-gray-200 bg-white'}`}>
                <Text className={`text-[11px] font-bold ${selectedCategory === ALL_CATEGORY ? 'text-white' : 'text-gray-600'}`}>
                  {t('pos.all')}
                </Text>
              </TouchableOpacity>
              {categoryNames.map((name) => (
                <TouchableOpacity
                  key={name}
                  onPress={() => setSelectedCategory(name)}
                  className={`rounded-full px-3 py-1.5 border ${selectedCategory === name ? 'border-blue-600 bg-blue-600' : 'border-gray-200 bg-white'}`}>
                  <Text className={`text-[11px] font-bold ${selectedCategory === name ? 'text-white' : 'text-gray-600'}`}>
                    {name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {/* Customer Selection Bar (compact) */}
          <View className="mt-1 mb-1">
            <TouchableOpacity
              onPress={() => setShowCustomerModal(true)}
              className={`flex-row items-center justify-between rounded-2xl px-3 py-2.5 border ${selectedCustomer ? 'border-emerald-400 bg-emerald-50' : 'border-indigo-400 bg-indigo-50'}`}
              activeOpacity={0.8}>
              <View className="flex-1 flex-row items-center">
                <View className={`w-8 h-8 rounded-xl items-center justify-center mr-2.5 ${selectedCustomer ? 'bg-emerald-100' : 'bg-indigo-600'}`}>
                  <Ionicons name="person" size={16} color={selectedCustomer ? '#10B981' : '#FFFFFF'} />
                </View>
                <View>
                  <Text className={`text-[9px] font-bold uppercase tracking-[0.5px] ${selectedCustomer ? 'text-emerald-600' : 'text-indigo-500'}`}>
                    {selectedCustomer ? t('pos.customer') : t('pos.selectCustomer')}
                  </Text>
                  <Text className="text-sm font-black text-slate-900">
                    {selectedCustomer ? selectedCustomer.name : t('pos.tapToChoose')}
                  </Text>
                </View>
              </View>
              <View className={`w-7 h-7 rounded-full items-center justify-center ${selectedCustomer ? 'bg-emerald-100' : 'bg-indigo-100'}`}>
                <Ionicons name={selectedCustomer ? "checkmark-circle" : "chevron-forward"} size={16} color={selectedCustomer ? '#10B981' : '#4F46E5'} />
              </View>
            </TouchableOpacity>
          </View>

          {/* Product Search Input */}
          <View className="mb-2">
            <View className="flex-row items-center bg-slate-100 rounded-xl px-3 py-2.5">
              <Ionicons name="search" size={18} color={searchQuery ? "#3B82F6" : "#94A3B8"} />
              <TextInput
                className="flex-1 ml-2 text-sm font-medium text-gray-900"
                placeholder={t('pos.searchProducts')}
                placeholderTextColor="#94A3B8"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={20} color="#94A3B8" />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </SafeAreaView>


      {/* ── Item List (grouped by category) ────────────────────────────── */}

      <FlatList
        data={sections}
        keyExtractor={(section) => section.title}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#4F46E5']} />}
        contentContainerStyle={{ paddingBottom: 120, paddingTop: 4 }}
        renderItem={({ item: section }) => (
          <View className="mb-3">
            <View className="px-5 mb-2">
               <Text className="text-[11px] font-black text-slate-400 uppercase tracking-widest">{section.title}</Text>
            </View>
            <View className={viewMode === 'grid' ? "flex-row flex-wrap px-2" : ""}>
              {section.data.map((item) => {
                const cartQty = getCartQty(item.id);
                const outOfStock = item.quantity <= 0;
                return viewMode === 'grid' ? (
                  <TouchableOpacity
                    key={item.id}
                    onPress={() => {
                      if (!selectedCustomer) {
                        setShowCustomerModal(true);
                        showToast('Please select a customer first');
                        return;
                      }
                      const displayName = item.name?.toLowerCase() === 'unknown' ? (item.name_en || item.name_ar || item.name) : item.name;
                      setCartQty(item, cartQty + 1);
                      if (cartQty === 0) showToast(`${displayName} added`);
                    }}
                    disabled={outOfStock}
                    className="w-1/3 p-1.5"
                  >
                    <View className={`bg-white rounded-2xl p-3 border border-slate-100 ${outOfStock ? 'opacity-40' : ''}`} style={{ elevation: outOfStock ? 0 : 2 }}>
                       <View className="flex-row items-center justify-between mb-2">
                         <View className="w-9 h-9 rounded-xl bg-blue-50 items-center justify-center">
                           <Ionicons name="cube-outline" size={18} color="#3B82F6" />
                         </View>
                         {cartQty > 0 && (
                           <View className="bg-blue-600 min-w-[22px] h-[22px] rounded-full items-center justify-center px-1">
                              <Text className="text-white text-[10px] font-black">{cartQty}</Text>
                           </View>
                         )}
                       </View>
                       <Text className="text-xs font-bold text-slate-900 mb-0.5" numberOfLines={1}>
                         {item.name?.toLowerCase() === 'unknown' ? (item.name_en || item.name_ar || item.name) : item.name}
                       </Text>
                       {item.name?.toLowerCase() !== 'unknown' && (item.name_en || item.name_ar) && (
                         <Text className="text-[9px] text-slate-400 font-semibold mb-1" numberOfLines={1}>
                           {item.name_en || item.name_ar}
                         </Text>
                       )}
                       <Text className="text-sm font-black text-blue-600">${item.unit_price.toFixed(2)}</Text>
                       <View className={`rounded-full px-1.5 py-0.5 mt-1 self-start ${outOfStock ? 'bg-red-100' : 'bg-green-50'}`}>
                         <Text className={`text-[8px] font-bold ${outOfStock ? 'text-red-600' : 'text-green-600'}`}>
                           {outOfStock ? 'Out' : `${item.quantity}`}
                         </Text>
                       </View>
                    </View>
                  </TouchableOpacity>
                ) : renderItemCard(item);
              })}
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View className="items-center p-16">
            <Ionicons name="cube-outline" size={64} color="#D1D5DB" />
            <Text className="text-lg font-bold text-gray-400 mt-4">{t('pos.noProducts')}</Text>
          </View>
        }
      />

      {/* ── Floating Cart Bar (pinned at bottom of content area) ──────────── */}
      {cart.length > 0 && (
        <View style={{ position: 'absolute', bottom: 12, left: 0, right: 0 }}>
          <TouchableOpacity
            onPress={() => setShowCartModal(true)}
            className="mx-3 flex-row items-center justify-between rounded-2xl px-4 py-3"
            style={{ elevation: 12, shadowColor: '#1D4ED8', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.5, shadowRadius: 16, backgroundColor: '#1D4ED8' }}
            activeOpacity={0.9}>
            <View className="flex-row items-center">
              <View className="w-9 h-9 rounded-xl bg-white/20 items-center justify-center mr-2.5">
                <Ionicons name="cart" size={18} color="#FFF" />
              </View>
              <View>
                <Text className="text-white/70 text-[10px] font-bold">{totalItems} ITEMS</Text>
                <Text className="text-white font-black text-lg leading-tight">${calculateTotal().toFixed(2)}</Text>
              </View>
            </View>
            <View className="bg-white rounded-xl px-5 py-2.5" style={{ elevation: 2 }}>
              <Text className="text-blue-700 font-black text-sm">{t('pos.viewCart')}</Text>
            </View>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Search Modal (modern) ────────────────────────────────────── */}
      <Modal visible={showSearchModal} animationType="slide" onRequestClose={() => setShowSearchModal(false)}>
        <SafeAreaView className="flex-1 bg-slate-50">
          {/* Search header */}
          <View className="bg-white px-4 pt-3 pb-3" style={{ elevation: 3 }}>
            <View className="flex-row items-center">
              <TouchableOpacity onPress={() => { setShowSearchModal(false); setSearchQuery(''); }} className="w-10 h-10 rounded-xl bg-slate-100 items-center justify-center mr-3">
                <Ionicons name="arrow-back" size={20} color="#374151" />
              </TouchableOpacity>
              <View className="flex-1 flex-row items-center bg-slate-100 rounded-2xl px-4 py-3" style={{ borderWidth: 2, borderColor: searchQuery.trim() ? '#3B82F6' : '#F1F5F9' }}>
                <Ionicons name="search" size={20} color={searchQuery.trim() ? '#3B82F6' : '#94A3B8'} />
                <TextInput
                  className="flex-1 ml-2.5 text-base font-semibold text-gray-900"
                  placeholder="Search products..."
                  placeholderTextColor="#94A3B8"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  autoFocus
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery('')} className="bg-slate-200 w-7 h-7 rounded-full items-center justify-center">
                    <Ionicons name="close" size={14} color="#64748B" />
                  </TouchableOpacity>
                )}
              </View>
            </View>
            {searchQuery.trim() && searchResults.length > 0 && (
              <Text className="text-xs font-bold text-slate-400 mt-2 ml-14">
                {searchResults.length} product{searchResults.length !== 1 ? 's' : ''} found
              </Text>
            )}
          </View>

          <FlatList
            data={searchResults}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={{ paddingBottom: 120, paddingTop: 8 }}
            renderItem={({ item }) => renderItemCard(item)}
            ListEmptyComponent={
              <View className="items-center pt-20">
                <View className="w-20 h-20 rounded-full bg-slate-100 items-center justify-center mb-4">
                  <Ionicons name={searchQuery.trim() ? "search-outline" : "sparkles-outline"} size={36} color="#CBD5E1" />
                </View>
                <Text className="text-slate-400 font-bold text-base">
                  {searchQuery.trim() ? 'No results found' : 'Search for products'}
                </Text>
                <Text className="text-slate-300 text-sm mt-1">
                  {searchQuery.trim() ? 'Try different keywords' : 'Type a name, SKU, or barcode'}
                </Text>
              </View>
            }
          />

          {/* Floating cart in search */}
          {cart.length > 0 && (
            <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}>
              <TouchableOpacity
                onPress={() => { setShowSearchModal(false); setSearchQuery(''); setShowCartModal(true); }}
                className="mx-3 mb-1 flex-row items-center justify-between rounded-2xl px-4 py-3"
                style={{ elevation: 12, backgroundColor: '#1D4ED8' }}>
                <View className="flex-row items-center">
                  <Ionicons name="cart" size={18} color="#FFF" />
                  <Text className="text-white font-bold ml-2">{totalItems} items</Text>
                </View>
                <Text className="text-white font-black text-lg">${calculateTotal().toFixed(2)}</Text>
              </TouchableOpacity>
              <SafeAreaView edges={['bottom']} />
            </View>
          )}
        </SafeAreaView>
      </Modal>

      {/* ── Cart Modal (modern) ─────────────────────────────────────── */}
      <Modal visible={showCartModal} animationType="slide" onRequestClose={() => setShowCartModal(false)}>
        <SafeAreaView className="flex-1 bg-slate-50">
          {/* Cart Header */}
          <View className="bg-white px-4 py-3" style={{ elevation: 3 }}>
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center">
                <TouchableOpacity onPress={() => setShowCartModal(false)} className="w-10 h-10 rounded-xl bg-slate-100 items-center justify-center mr-3">
                  <Ionicons name="arrow-back" size={20} color="#374151" />
                </TouchableOpacity>
                <View>
                  <Text className="text-lg font-black text-gray-900">{t('pos.yourCart')}</Text>
                  <Text className="text-[11px] text-slate-400 font-semibold">{cart.length} item{cart.length !== 1 ? 's' : ''} • {totalItems} units</Text>
                </View>
              </View>
              {cart.length > 0 && (
                <TouchableOpacity onPress={clearCart} className="flex-row items-center bg-red-50 border border-red-100 px-3 py-2 rounded-xl">
                  <Ionicons name="trash-outline" size={14} color="#EF4444" />
                  <Text className="text-[11px] font-bold text-red-500 ml-1">{t('pos.clear')}</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Customer Selection (compact) */}
          <TouchableOpacity
            onPress={() => setShowCustomerModal(true)}
            className="bg-white mx-3 mt-2 rounded-2xl px-4 py-3 flex-row items-center justify-between" style={{ elevation: 2 }}>
            <View className="flex-row items-center">
              <View className={`w-9 h-9 rounded-xl items-center justify-center mr-3 ${selectedCustomer ? 'bg-emerald-100' : 'bg-blue-100'}`}>
                <Ionicons name="person" size={16} color={selectedCustomer ? '#10B981' : '#2563EB'} />
              </View>
              <View>
                <Text className="text-[9px] font-bold text-slate-400 uppercase">{t('pos.customer')}</Text>
                <Text className="font-bold text-slate-900 text-sm">
                  {selectedCustomer ? selectedCustomer.name : 'Walk-in Customer'}
                </Text>
              </View>
            </View>
            <View className="flex-row items-center">
              {selectedCustomer && (
                <TouchableOpacity onPress={() => setSelectedCustomer(null)} className="mr-2 bg-red-50 w-7 h-7 rounded-full items-center justify-center">
                  <Ionicons name="close" size={12} color="#EF4444" />
                </TouchableOpacity>
              )}
              <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
            </View>
          </TouchableOpacity>

          {/* Cart Items */}
          {cart.length === 0 ? (
            <View className="flex-1 items-center justify-center p-8">
              <View className="w-24 h-24 rounded-full bg-slate-100 items-center justify-center mb-4">
                <Ionicons name="cart-outline" size={48} color="#CBD5E1" />
              </View>
              <Text className="text-lg font-bold text-slate-400">{t('pos.cartEmpty')}</Text>
              <Text className="text-sm text-slate-300 mt-1">{t('pos.addProductsToGetStarted')}</Text>
            </View>
          ) : (
            <FlatList
              data={cart}
              keyExtractor={(item) => item.product.id.toString()}
              contentContainerStyle={{ padding: 12, paddingBottom: 16 }}
              renderItem={({ item }) => (
                <View className="bg-white rounded-2xl mb-2 overflow-hidden" style={{ elevation: 2 }}>
                  {/* Item header row */}
                  <View className="flex-row items-center px-4 pt-3 pb-2">
                    <View className="w-10 h-10 rounded-xl bg-blue-50 items-center justify-center mr-3">
                      <Ionicons name="cube-outline" size={18} color="#3B82F6" />
                    </View>
                    <View className="flex-1">
                      <Text className="font-bold text-slate-900 text-sm" numberOfLines={1}>
                        {item.product.name?.toLowerCase() === 'unknown' ? (item.product.name_en || item.product.name_ar || item.product.name) : item.product.name}
                      </Text>
                      <Text className="text-[11px] text-slate-400 font-semibold">@ ${item.unit_price.toFixed(2)} each</Text>
                    </View>
                    <Text className="text-lg font-black text-slate-900">${item.total.toFixed(2)}</Text>
                  </View>
                  {/* Actions row */}
                  <View className="flex-row items-center justify-between px-4 pb-3 pt-1">
                    <View className="flex-row items-center">
                      <TouchableOpacity
                        onPress={() => {
                          const newQty = item.quantity - 1;
                          setQuantityTextMap(prev => { const n = { ...prev }; delete n[item.product.id]; return n; });
                          setCartQty(item.product, newQty);
                        }}
                        className="w-8 h-8 rounded-lg bg-slate-100 items-center justify-center">
                        <Ionicons name="remove" size={16} color="#64748B" />
                      </TouchableOpacity>
                      <TextInput
                        className="w-12 text-center text-sm font-black text-slate-900 mx-1"
                        value={quantityTextMap[item.product.id] !== undefined ? quantityTextMap[item.product.id] : item.quantity.toString()}
                        onChangeText={(t) => {
                          setQuantityTextMap(prev => ({ ...prev, [item.product.id]: t }));
                          const normalized = t.replace(',', '.');
                          if (!normalized.endsWith('.') && normalized !== '') {
                            const val = parseFloat(normalized);
                            if (!isNaN(val) && val >= 0) setCartQty(item.product, val);
                          }
                        }}
                        onBlur={() => {
                          const raw = quantityTextMap[item.product.id];
                          if (raw !== undefined) {
                            const val = parseFloat(raw.replace(',', '.'));
                            if (!isNaN(val) && val >= 0) setCartQty(item.product, val);
                            setQuantityTextMap(prev => { const n = { ...prev }; delete n[item.product.id]; return n; });
                          }
                        }}
                        keyboardType="decimal-pad"
                        selectTextOnFocus
                      />
                      <TouchableOpacity
                        onPress={() => {
                          const newQty = item.quantity + 1;
                          setQuantityTextMap(prev => { const n = { ...prev }; delete n[item.product.id]; return n; });
                          setCartQty(item.product, newQty);
                        }}
                        className="w-8 h-8 rounded-lg bg-slate-100 items-center justify-center">
                        <Ionicons name="add" size={16} color="#64748B" />
                      </TouchableOpacity>
                    </View>
                    <View className="flex-row items-center gap-2">
                      <TouchableOpacity 
                        onPress={() => openItemEditModal(item)}
                        className="bg-indigo-50 px-2.5 py-1.5 rounded-lg border border-indigo-100">
                        <Text className="text-[9px] font-black text-indigo-600">{t('pos.edit')}</Text>
                      </TouchableOpacity>
                      <View className="flex-row items-center bg-slate-50 rounded-lg px-2 py-1">
                        <Text className="text-[10px] text-slate-400 mr-0.5">{t('pos.disc')}</Text>
                        <TextInput
                          className="w-8 text-center text-[10px] font-bold text-slate-700"
                          value={item.discount_percent.toString()}
                          onChangeText={(t) => updateCartDiscount(item.product.id, parseDecimal(t))}
                          keyboardType="decimal-pad"
                          selectTextOnFocus
                        />
                        <Text className="text-[10px] text-slate-400">%</Text>
                      </View>
                      <TouchableOpacity onPress={() => removeFromCart(item.product.id)} className="w-8 h-8 rounded-lg bg-red-50 items-center justify-center">
                        <Ionicons name="trash-outline" size={14} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              )}
            />
          )}

          {/* Cart Footer / Checkout */}
          {cart.length > 0 && (
            <View className="bg-white border-t border-slate-100 px-4 pt-3 pb-2" style={{ elevation: 8 }}>
              {/* Total */}
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-sm font-bold text-slate-500">{t('pos.total')}</Text>
                <Text className="text-2xl font-black text-slate-900">${calculateTotal().toFixed(2)}</Text>
              </View>

              {/* Payment toggle */}
              <View className="flex-row rounded-xl bg-slate-100 p-1 mb-2">
                <TouchableOpacity
                  onPress={() => setPaymentType('paid')}
                  className={`flex-1 items-center rounded-lg py-2 ${paymentType === 'paid' ? 'bg-white' : ''}`}
                  style={paymentType === 'paid' ? { elevation: 2 } : {}}>
                  <Text className={`text-xs font-black ${paymentType === 'paid' ? 'text-emerald-600' : 'text-slate-400'}`}>
                    ✓ {t('pos.fullyPaid')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setPaymentType('partial')}
                  className={`flex-1 items-center rounded-lg py-2 ${paymentType === 'partial' ? 'bg-white' : ''}`}
                  style={paymentType === 'partial' ? { elevation: 2 } : {}}>
                  <Text className={`text-xs font-black ${paymentType === 'partial' ? 'text-orange-500' : 'text-slate-400'}`}>
                    ◐ {t('pos.partial')}
                  </Text>
                </TouchableOpacity>
              </View>

              {paymentType === 'partial' && (
                <View className="flex-row items-center rounded-xl bg-slate-50 border border-slate-200 px-4 py-3 mb-2">
                  <Text className="mr-2 text-base font-black text-slate-300">$</Text>
                  <TextInput
                    className="flex-1 text-base font-bold text-slate-900"
                    placeholder={t('pos.amountPaidPlaceholder')}
                    placeholderTextColor="#CBD5E1"
                    value={partialAmount}
                    onChangeText={setPartialAmount}
                    keyboardType="decimal-pad"
                  />
                </View>
              )}

              {/* Checkout button */}
              <TouchableOpacity
                onPress={handleCheckout}
                disabled={isLoading}
                className={`rounded-2xl py-4 ${isLoading ? 'bg-slate-200' : ''}`}
                style={!isLoading ? { elevation: 8, backgroundColor: '#1D4ED8', shadowColor: '#1D4ED8', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 12 } : {}}
                activeOpacity={0.85}>
                {isLoading ? (
                  <ActivityIndicator color="#94A3B8" />
                ) : (
                  <View className="flex-row items-center justify-center">
                    <Ionicons name="checkmark-circle" size={22} color="#FFF" />
                    <Text className="ml-2 text-white font-black text-base">{t('pos.completeSale')}</Text>
                  </View>
                )}
              </TouchableOpacity>
              <SafeAreaView edges={['bottom']} />
            </View>
          )}
        </SafeAreaView>
      </Modal>
      {/* ── Customer Modal (modern bottom sheet) ────────────────── */}
      <Modal visible={showCustomerModal} animationType="slide" transparent onRequestClose={() => setShowCustomerModal(false)}>
        <View className="flex-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <TouchableOpacity className="flex-1" activeOpacity={1} onPress={() => setShowCustomerModal(false)} />
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'position'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}>
            <View className="rounded-t-[28px] bg-white" style={{ maxHeight: height * 0.75 }}>
              <SafeAreaView>
              {/* Drag handle */}
              <View className="items-center pt-3 pb-1">
                <View className="w-10 h-1 bg-slate-200 rounded-full" />
              </View>

              {/* Title row */}
              <View className="flex-row items-center justify-between px-5 pb-3">
                <View>
                  <Text className="text-lg font-black text-slate-900">{t('pos.selectCustomer')}</Text>
                  <Text className="text-[11px] text-slate-400 font-semibold">{customers.length} {t('pos.customersAvailable')}</Text>
                </View>
                <TouchableOpacity onPress={() => { setShowCustomerModal(false); setCustomerSearchQuery(''); }} className="w-9 h-9 rounded-xl bg-slate-100 items-center justify-center">
                  <Ionicons name="close" size={18} color="#64748B" />
                </TouchableOpacity>
              </View>

              {/* Search */}
              <View className="px-5 pb-3">
                <View className="flex-row items-center rounded-2xl bg-slate-100 px-4 py-3" style={{ borderWidth: 2, borderColor: customerSearchQuery.trim() ? '#3B82F6' : '#F1F5F9' }}>
                  <Ionicons name="search" size={18} color={customerSearchQuery.trim() ? '#3B82F6' : '#94A3B8'} />
                  <TextInput
                    className="flex-1 ml-2.5 text-sm font-semibold text-gray-900"
                    placeholder={t('pos.searchByPhone')}
                    placeholderTextColor="#94A3B8"
                    value={customerSearchQuery}
                    onChangeText={handleCustomerSearch}
                  />
                  {isSearchingCustomers && <ActivityIndicator size="small" color="#3B82F6" />}
                </View>
              </View>

              <ScrollView className="px-4 pb-4" showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                {/* Walk-in */}
                <TouchableOpacity
                  onPress={() => { setSelectedCustomer(null); setShowCustomerModal(false); setCustomerSearchQuery(''); }}
                  className={`mb-2 rounded-2xl p-3 flex-row items-center ${!selectedCustomer ? 'bg-emerald-50 border border-emerald-200' : 'bg-white border border-slate-100'}`}
                  style={{ elevation: !selectedCustomer ? 0 : 1 }}>
                  <View className={`mr-3 w-10 h-10 rounded-xl items-center justify-center ${!selectedCustomer ? 'bg-emerald-100' : 'bg-slate-100'}`}>
                    <Ionicons name="walk-outline" size={18} color={!selectedCustomer ? '#10B981' : '#64748B'} />
                  </View>
                  <Text className={`text-sm font-bold flex-1 ${!selectedCustomer ? 'text-emerald-700' : 'text-slate-700'}`}>{t('pos.walkInCustomer')}</Text>
                  {!selectedCustomer && <Ionicons name="checkmark-circle" size={20} color="#10B981" />}
                </TouchableOpacity>

                {displayedCustomers.map((customer) => (
                  <TouchableOpacity
                    key={customer.id}
                    onPress={() => { setSelectedCustomer(customer); setShowCustomerModal(false); }}
                    className={`mb-2 rounded-2xl p-3 flex-row items-center ${selectedCustomer?.id === customer.id ? 'bg-blue-50 border border-blue-200' : 'bg-white border border-slate-100'}`}
                    style={{ elevation: 1 }}>
                    <View className={`mr-3 w-10 h-10 rounded-xl items-center justify-center ${selectedCustomer?.id === customer.id ? 'bg-blue-100' : 'bg-indigo-50'}`}>
                      <Text className={`text-sm font-black ${selectedCustomer?.id === customer.id ? 'text-blue-600' : 'text-indigo-500'}`}>
                        {customer.name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View className="flex-1">
                      <Text className="text-sm font-bold text-slate-900">{customer.name}</Text>
                      {customer.phone && <Text className="text-[11px] text-slate-400 mt-0.5">{customer.phone}</Text>}
                    </View>
                    {selectedCustomer?.id === customer.id && <Ionicons name="checkmark-circle" size={20} color="#3B82F6" />}
                  </TouchableOpacity>
                ))}

                {displayedCustomers.length === 0 && (
                  <View className="items-center py-10">
                    <View className="w-16 h-16 rounded-full bg-slate-100 items-center justify-center mb-3">
                      <Ionicons name="people-outline" size={32} color="#CBD5E1" />
                    </View>
                    <Text className="text-slate-400 font-bold">{t('pos.noCustomersFound')}</Text>
                  </View>
                )}
              </ScrollView>
            </SafeAreaView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* ── Quantity Modal ─────────────────────────────────────────────── */}
      {quantityModalProduct && (
        <QuantityModal
          visible={showQuantityModal}
          productName={quantityModalProduct.name}
          currentQuantity={getCartQty(quantityModalProduct.id)}
          maxQuantity={quantityModalProduct.quantity}
          unitPrice={cart.find(c => c.product.id === quantityModalProduct.id)?.unit_price ?? quantityModalProduct.unit_price}
          currentDiscount={cart.find(c => c.product.id === quantityModalProduct.id)?.discount_percent ?? 0}
          onConfirm={(qty, price, disc) => {
            setCartQty(quantityModalProduct, qty, price, disc);
            setShowQuantityModal(false);
            setQuantityModalProduct(null);
          }}
          onCancel={() => {
            setShowQuantityModal(false);
            setQuantityModalProduct(null);
          }}
        />
      )}

      {/* ── Printing Overlay ───────────────────────────────────────────── */}
      {isPrinting && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15,23,42,0.7)', justifyContent: 'center', alignItems: 'center', zIndex: 9999 }}>
          <View className="bg-white rounded-3xl p-10 items-center" style={{ minWidth: 220, elevation: 20 }}>
            <View className="w-16 h-16 rounded-full bg-blue-50 items-center justify-center mb-4">
              <ActivityIndicator size="large" color="#1D4ED8" />
            </View>
            <Text className="text-slate-900 font-black text-lg">{t('pos.printingReceipt')}</Text>
            <Text className="text-slate-400 text-sm mt-1 font-medium">{t('pos.pleaseWait')}</Text>
          </View>
        </View>
      )}
    </View>
  );
}
