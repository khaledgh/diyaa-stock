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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import apiService from '../services/api.service';
import { StockItem, Customer, CartItem, Category } from '../types';
import { usePrinter } from '../../hooks/usePrinter';

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
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedLocationId, setSelectedLocationId] = useState<number | null>(user?.location_id || null);
  const [paymentType, setPaymentType] = useState<'paid' | 'partial'>('paid');
  const [partialAmount, setPartialAmount] = useState('');
  const [isPrinting, setIsPrinting] = useState(false);

  // Search
  const [searchResults, setSearchResults] = useState<StockItem[]>([]);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [customerSearchResults, setCustomerSearchResults] = useState<Customer[]>([]);
  const [isSearchingCustomers, setIsSearchingCustomers] = useState(false);

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
        const transformed = (response.data || []).map((item: any) => ({
          id: item.product_id,
          name: item.name_en || item.name_ar || 'Unknown',
          sku: item.sku,
          barcode: item.barcode,
          category_name: item.category_name_en || item.category_name_ar || '',
          category_id: item.category_id,
          unit_price: parseFloat(item.unit_price) || 0,
          quantity: parseInt(item.quantity) || 0,
          location_type: item.location_type,
          location_id: item.location_id,
        }));
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

  useEffect(() => {
    if (isAdmin) loadLocations();
  }, [isAdmin, loadLocations]);

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
    if (selectedCategory !== ALL_CATEGORY) {
      items = items.filter((i) => i.category_name === selectedCategory);
    }
    return items;
  }, [stockItems, selectedCategory]);

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
      return [{ title: selectedCategory, data: filteredItems }];
    }
    const map = new Map<string, StockItem[]>();
    filteredItems.forEach((item) => {
      const cat = item.category_name || 'Other';
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(item);
    });
    return Array.from(map.entries()).map(([title, data]) => ({ title, data }));
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

  const setCartQty = (item: StockItem, qty: number) => {
    if (qty <= 0) {
      setCart((prev) => prev.filter((c) => c.product.id !== item.id));
      return;
    }
    if (qty > item.quantity) {
      showToast(`Only ${item.quantity} available`);
      return;
    }
    setCart((prev) => {
      const existing = prev.find((c) => c.product.id === item.id);
      if (existing) {
        return prev.map((c) =>
          c.product.id === item.id
            ? {
                ...c,
                quantity: qty,
                total: qty * c.unit_price * (1 - c.discount_percent / 100),
              }
            : c
        );
      }
      return [
        ...prev,
        {
          product: item,
          quantity: qty,
          unit_price: item.unit_price,
          discount_percent: 0,
          total: qty * item.unit_price,
        },
      ];
    });
  };

  const updateCartDiscount = (productId: number, discount: number) => {
    setCart((prev) =>
      prev.map((c) =>
        c.product.id === productId
          ? { ...c, discount_percent: discount, total: c.quantity * c.unit_price * (1 - discount / 100) }
          : c
      )
    );
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

  const calculateTotal = () => cart.reduce((sum, item) => sum + item.total, 0);
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

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
                        await printReceiptData({
                          invoiceNumber: invoice.invoice_number,
                          customerName: selectedCustomer?.name,
                          items: cart.map((i) => ({
                            name: i.product.name,
                            quantity: i.quantity,
                            unitPrice: i.unit_price,
                            total: i.total,
                          })),
                          subtotal: parseFloat(invoice.subtotal) || 0,
                          discount: parseFloat(invoice.discount_amount) || 0,
                          tax: parseFloat(invoice.tax_amount) || 0,
                          total: parseFloat(invoice.total_amount) || 0,
                          paidAmount,
                          date: new Date().toLocaleString(),
                          cashierName: user?.full_name,
                          storeName: 'DaftarStock',
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
        <Text className="text-gray-500 mt-4">Loading products...</Text>
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
            <Text className="text-2xl font-bold text-gray-900">Point of Sale</Text>
            <Text className="text-sm text-gray-500 mt-1">Select a location to continue</Text>
          </View>
        </SafeAreaView>
        <View className="flex-1 items-center justify-center p-6">
          <View className="w-20 h-20 items-center justify-center rounded-full bg-blue-100 mb-6">
            <Ionicons name="location" size={40} color="#2563EB" />
          </View>
          <Text className="text-xl font-bold text-gray-900 mb-2">Choose Location</Text>
          <Text className="text-sm text-gray-500 text-center mb-8">Select a branch to load products</Text>
          <View className="w-full">
            {locations.map((loc) => (
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
            ))}
            {locations.length === 0 && (
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
        className={`flex-row items-center px-4 py-3 bg-white mb-2 mx-4 rounded-2xl ${outOfStock ? 'opacity-50' : ''}`}
        style={{ elevation: outOfStock ? 0 : 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4 }}>
        {/* Product icon circle */}
        <View className="w-14 h-14 rounded-full bg-blue-50 items-center justify-center mr-3">
          <Ionicons name="cube-outline" size={26} color="#3B82F6" />
        </View>

        {/* Product info */}
        <View className="flex-1 mr-2">
          <Text className="text-sm font-bold text-gray-900" numberOfLines={2}>{item.name}</Text>
          <Text className="text-base font-extrabold text-blue-600 mt-0.5">${item.unit_price.toFixed(2)}</Text>
          <View className="flex-row items-center mt-0.5">
            <View className={`rounded-full px-2 py-0.5 ${outOfStock ? 'bg-red-100' : 'bg-green-100'}`}>
              <Text className={`text-[10px] font-bold ${outOfStock ? 'text-red-600' : 'text-green-700'}`}>
                {outOfStock ? 'Out of stock' : `Stock: ${item.quantity}`}
              </Text>
            </View>
          </View>
        </View>

        {/* Quantity stepper */}
        {!outOfStock && (
          <View className="flex-row items-center">
            {qty > 0 && (
              <>
                <TouchableOpacity
                  onPress={() => setCartQty(item, qty - 1)}
                  className="w-9 h-9 rounded-full bg-gray-100 items-center justify-center">
                  <Ionicons name="remove" size={20} color="#374151" />
                </TouchableOpacity>
                <TextInput
                  className="w-12 text-center text-base font-bold text-gray-900 mx-1"
                  value={qty.toString()}
                  onChangeText={(t) => {
                    const val = parseDecimal(t);
                    if (val >= 0) setCartQty(item, val);
                  }}
                  keyboardType="decimal-pad"
                  selectTextOnFocus
                />
              </>
            )}
            <TouchableOpacity
              onPress={() => {
                setCartQty(item, qty + 1);
                if (qty === 0) showToast(`${item.name} added`);
              }}
              className="w-9 h-9 rounded-full bg-blue-600 items-center justify-center"
              style={{ elevation: 3 }}>
              <Ionicons name="add" size={20} color="#FFF" />
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
    <View className="flex-1 bg-gray-100">
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <SafeAreaView edges={['top']} style={{ backgroundColor: '#FFF' }}>
        <View className="bg-white px-4 pt-3 pb-2" style={{ elevation: 2 }}>
          {/* Top row: title + actions */}
          <View className="flex-row items-center justify-between mb-3">
            <View className="flex-1">
              <Text className="text-xl font-bold text-gray-900">Menu</Text>
            </View>
            <View className="flex-row items-center gap-2">
              {/* Search button */}
              <TouchableOpacity
                onPress={() => setShowSearchModal(true)}
                className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center">
                <Ionicons name="search" size={20} color="#374151" />
              </TouchableOpacity>
              {/* Logout */}
              <TouchableOpacity
                onPress={logout}
                className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center">
                <Ionicons name="log-out-outline" size={20} color="#374151" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Admin location pills */}
          {isAdmin && locations.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-2">
              <View className="flex-row gap-2 pr-4">
                {locations.map((loc) => (
                  <TouchableOpacity
                    key={loc.id}
                    onPress={() => setSelectedLocationId(loc.id)}
                    className={`rounded-full px-4 py-2 border ${selectedLocationId === loc.id ? 'border-blue-600 bg-blue-600' : 'border-gray-200 bg-white'}`}>
                    <Text className={`text-xs font-semibold ${selectedLocationId === loc.id ? 'text-white' : 'text-gray-600'}`}>
                      {loc.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          )}

          {/* Category pills */}
          <ScrollView ref={categoryListRef} horizontal showsHorizontalScrollIndicator={false}>
            <View className="flex-row gap-2 pb-1">
              <TouchableOpacity
                onPress={() => setSelectedCategory(ALL_CATEGORY)}
                className={`rounded-full px-4 py-2 border ${selectedCategory === ALL_CATEGORY ? 'border-blue-600 bg-blue-50' : 'border-gray-200 bg-white'}`}>
                <Text className={`text-xs font-semibold ${selectedCategory === ALL_CATEGORY ? 'text-blue-700' : 'text-gray-600'}`}>
                  All
                </Text>
              </TouchableOpacity>
              {categoryNames.map((name) => (
                <TouchableOpacity
                  key={name}
                  onPress={() => setSelectedCategory(name)}
                  className={`rounded-full px-4 py-2 border ${selectedCategory === name ? 'border-blue-600 bg-blue-50' : 'border-gray-200 bg-white'}`}>
                  <Text className={`text-xs font-semibold ${selectedCategory === name ? 'text-blue-700' : 'text-gray-600'}`}>
                    {name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>
      </SafeAreaView>

      {/* ── Item List (grouped by category) ────────────────────────────── */}
      <FlatList
        data={sections}
        keyExtractor={(section) => section.title}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#3B82F6']} />}
        contentContainerStyle={{ paddingTop: 8, paddingBottom: 100 }}
        renderItem={({ item: section }) => (
          <View>
            <Text className="text-sm font-bold text-gray-500 uppercase tracking-wide px-5 pt-4 pb-2">
              {section.title}
            </Text>
            {section.data.map((item) => renderItemCard(item))}
          </View>
        )}
        ListEmptyComponent={
          <View className="items-center p-16">
            <Ionicons name="cube-outline" size={64} color="#D1D5DB" />
            <Text className="text-lg font-bold text-gray-400 mt-4">No Products Found</Text>
            <Text className="text-gray-400 text-center mt-1">Try another category or refresh</Text>
          </View>
        }
      />

      {/* ── Floating Cart Bar ──────────────────────────────────────────── */}
      {cart.length > 0 && (
        <SafeAreaView edges={['bottom']} style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}>
          <TouchableOpacity
            onPress={() => setShowCartModal(true)}
            className="mx-4 mb-2 flex-row items-center justify-between bg-blue-600 rounded-2xl px-5 py-4"
            style={{ elevation: 8, shadowColor: '#2563EB', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 12 }}
            activeOpacity={0.9}>
            <View className="flex-row items-center">
              <View className="w-8 h-8 rounded-full bg-white/20 items-center justify-center mr-3">
                <Ionicons name="cart" size={18} color="#FFF" />
              </View>
              <Text className="text-white font-bold text-base">{totalItems} items</Text>
            </View>
            <View className="flex-row items-center">
              <Text className="text-white font-extrabold text-lg mr-2">${calculateTotal().toFixed(2)}</Text>
              <View className="bg-white rounded-full px-4 py-2">
                <Text className="text-blue-600 font-bold text-sm">View Cart</Text>
              </View>
            </View>
          </TouchableOpacity>
        </SafeAreaView>
      )}

      {/* ── Search Modal ───────────────────────────────────────────────── */}
      <Modal visible={showSearchModal} animationType="slide" onRequestClose={() => setShowSearchModal(false)}>
        <SafeAreaView className="flex-1 bg-white">
          <View className="flex-row items-center px-4 py-3 border-b border-gray-100">
            <TouchableOpacity onPress={() => { setShowSearchModal(false); setSearchQuery(''); }} className="mr-3">
              <Ionicons name="arrow-back" size={24} color="#374151" />
            </TouchableOpacity>
            <View className="flex-1 flex-row items-center bg-gray-100 rounded-xl px-4 py-2.5">
              <Ionicons name="search" size={18} color="#9CA3AF" />
              <TextInput
                className="flex-1 ml-2 text-base text-gray-900"
                placeholder="Search items by name, SKU, barcode..."
                placeholderTextColor="#9CA3AF"
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoFocus
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={18} color="#9CA3AF" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          <FlatList
            data={searchResults}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={{ paddingBottom: 100 }}
            renderItem={({ item }) => renderItemCard(item)}
            ListEmptyComponent={
              <View className="items-center p-16">
                <Ionicons name="search" size={48} color="#D1D5DB" />
                <Text className="text-gray-400 mt-4">
                  {searchQuery.trim() ? 'No results found' : 'Start typing to search'}
                </Text>
              </View>
            }
          />

          {/* Floating cart in search too */}
          {cart.length > 0 && (
            <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}>
              <SafeAreaView edges={['bottom']}>
                <TouchableOpacity
                  onPress={() => { setShowSearchModal(false); setSearchQuery(''); setShowCartModal(true); }}
                  className="mx-4 mb-2 flex-row items-center justify-between bg-blue-600 rounded-2xl px-5 py-4"
                  style={{ elevation: 8 }}>
                  <View className="flex-row items-center">
                    <Ionicons name="cart" size={18} color="#FFF" />
                    <Text className="text-white font-bold ml-2">{totalItems} items</Text>
                  </View>
                  <Text className="text-white font-extrabold text-lg">${calculateTotal().toFixed(2)}</Text>
                </TouchableOpacity>
              </SafeAreaView>
            </View>
          )}
        </SafeAreaView>
      </Modal>

      {/* ── Cart Modal ─────────────────────────────────────────────────── */}
      <Modal visible={showCartModal} animationType="slide" onRequestClose={() => setShowCartModal(false)}>
        <SafeAreaView className="flex-1 bg-gray-50">
          {/* Cart Header */}
          <View className="bg-white flex-row items-center justify-between px-5 py-4 border-b border-gray-100" style={{ elevation: 2 }}>
            <View className="flex-row items-center">
              <TouchableOpacity onPress={() => setShowCartModal(false)} className="mr-3">
                <Ionicons name="arrow-back" size={24} color="#374151" />
              </TouchableOpacity>
              <View>
                <Text className="text-xl font-bold text-gray-900">Cart</Text>
                <Text className="text-xs text-gray-500">{cart.length} items</Text>
              </View>
            </View>
            {cart.length > 0 && (
              <TouchableOpacity onPress={clearCart} className="rounded-lg bg-red-50 px-3 py-2">
                <Text className="text-xs font-semibold text-red-500">Clear All</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Customer Selection */}
          <View className="bg-white mx-4 mt-3 rounded-2xl p-4" style={{ elevation: 2 }}>
            <Text className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Customer</Text>
            <TouchableOpacity
              onPress={() => setShowCustomerModal(true)}
              className="flex-row items-center justify-between rounded-xl bg-gray-50 px-4 py-3 border border-gray-200">
              <View className="flex-1 flex-row items-center">
                <View className="w-9 h-9 rounded-full bg-blue-100 items-center justify-center mr-3">
                  <Ionicons name="person" size={18} color="#2563EB" />
                </View>
                <View>
                  <Text className="font-semibold text-gray-900">
                    {selectedCustomer ? selectedCustomer.name : 'Walk-in Customer'}
                  </Text>
                  {selectedCustomer?.phone && (
                    <Text className="text-xs text-gray-500">{selectedCustomer.phone}</Text>
                  )}
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
            </TouchableOpacity>
            {selectedCustomer && (
              <TouchableOpacity onPress={() => setSelectedCustomer(null)} className="mt-2">
                <Text className="text-xs font-medium text-red-500">✕ Clear Customer</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Cart Items */}
          {cart.length === 0 ? (
            <View className="flex-1 items-center justify-center p-8">
              <Ionicons name="cart-outline" size={64} color="#D1D5DB" />
              <Text className="text-lg text-gray-400 mt-4">Cart is empty</Text>
            </View>
          ) : (
            <FlatList
              data={cart}
              keyExtractor={(item) => item.product.id.toString()}
              contentContainerStyle={{ padding: 16, paddingBottom: 16 }}
              renderItem={({ item }) => (
                <View className="bg-white rounded-2xl p-4 mb-3" style={{ elevation: 2 }}>
                  <View className="flex-row items-start justify-between mb-2">
                    <View className="flex-1 mr-2">
                      <Text className="font-bold text-gray-900">{item.product.name}</Text>
                      <Text className="text-xs text-gray-500 mt-0.5">@ ${item.unit_price.toFixed(2)}</Text>
                    </View>
                    <TouchableOpacity onPress={() => removeFromCart(item.product.id)}>
                      <Ionicons name="trash-outline" size={18} color="#EF4444" />
                    </TouchableOpacity>
                  </View>

                  <View className="flex-row items-center justify-between">
                    {/* Qty stepper */}
                    <View className="flex-row items-center">
                      <TouchableOpacity
                        onPress={() => setCartQty(item.product, item.quantity - 1)}
                        className="w-9 h-9 rounded-full bg-gray-100 items-center justify-center">
                        <Ionicons name="remove" size={18} color="#374151" />
                      </TouchableOpacity>
                      <TextInput
                        className="w-16 text-center text-base font-bold text-gray-900 mx-1 border border-gray-200 rounded-lg py-1"
                        value={item.quantity.toString()}
                        onChangeText={(t) => {
                          const val = parseDecimal(t);
                          if (val >= 0) setCartQty(item.product, val);
                        }}
                        keyboardType="decimal-pad"
                        selectTextOnFocus
                      />
                      <TouchableOpacity
                        onPress={() => setCartQty(item.product, item.quantity + 1)}
                        className="w-9 h-9 rounded-full bg-blue-600 items-center justify-center">
                        <Ionicons name="add" size={18} color="#FFF" />
                      </TouchableOpacity>
                    </View>

                    {/* Discount + Total */}
                    <View className="items-end">
                      <View className="flex-row items-center mb-1">
                        <Text className="text-xs text-gray-500 mr-1">Disc:</Text>
                        <TextInput
                          className="w-14 text-center text-xs border border-gray-200 rounded px-1 py-0.5"
                          value={item.discount_percent.toString()}
                          onChangeText={(t) => updateCartDiscount(item.product.id, parseDecimal(t))}
                          keyboardType="decimal-pad"
                          selectTextOnFocus
                        />
                        <Text className="text-xs text-gray-500 ml-0.5">%</Text>
                      </View>
                      <Text className="text-base font-extrabold text-gray-900">${item.total.toFixed(2)}</Text>
                    </View>
                  </View>
                </View>
              )}
            />
          )}

          {/* Cart Footer */}
          {cart.length > 0 && (
            <View className="bg-white border-t border-gray-100 px-5 py-4" style={{ elevation: 4 }}>
              {/* Total */}
              <View className="flex-row items-center justify-between mb-3">
                <Text className="text-base font-bold text-gray-700">Total</Text>
                <Text className="text-2xl font-extrabold text-gray-900">${calculateTotal().toFixed(2)}</Text>
              </View>

              {/* Payment toggle */}
              <View className="flex-row rounded-xl bg-gray-100 p-1 mb-3">
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
                <View className="flex-row items-center rounded-xl border border-gray-200 bg-white px-4 py-3 mb-3">
                  <Text className="mr-2 text-sm text-gray-500">$</Text>
                  <TextInput
                    className="flex-1 text-base font-semibold text-gray-900"
                    placeholder="Amount paid..."
                    placeholderTextColor="#9CA3AF"
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
                className={`rounded-2xl py-4 ${isLoading ? 'bg-gray-300' : 'bg-blue-600'}`}
                style={!isLoading ? { elevation: 6, shadowColor: '#2563EB', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 8 } : {}}
                activeOpacity={0.85}>
                {isLoading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <View className="flex-row items-center justify-center">
                    <Ionicons name="checkmark-circle" size={22} color="#FFF" />
                    <Text className="ml-2 text-white font-bold text-base">Complete Sale</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          )}
        </SafeAreaView>
      </Modal>

      {/* ── Customer Modal ─────────────────────────────────────────────── */}
      <Modal visible={showCustomerModal} animationType="slide" transparent onRequestClose={() => setShowCustomerModal(false)}>
        <View className="flex-1 justify-end bg-black/40">
          <TouchableOpacity className="flex-1" activeOpacity={1} onPress={() => setShowCustomerModal(false)} />
          <View className="rounded-t-3xl bg-white" style={{ maxHeight: height * 0.7 }}>
            <SafeAreaView>
              <View className="flex-row items-center justify-between border-b border-gray-100 p-5">
                <Text className="text-xl font-bold text-gray-900">Select Customer</Text>
                <TouchableOpacity onPress={() => { setShowCustomerModal(false); setCustomerSearchQuery(''); }} className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center">
                  <Ionicons name="close" size={24} color="#6B7280" />
                </TouchableOpacity>
              </View>

              <View className="px-5 py-3 border-b border-gray-100">
                <View className="flex-row items-center rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5">
                  <Ionicons name="search" size={18} color="#9CA3AF" />
                  <TextInput
                    className="flex-1 ml-2 text-base text-gray-900"
                    placeholder="Search by name or phone..."
                    placeholderTextColor="#9CA3AF"
                    value={customerSearchQuery}
                    onChangeText={handleCustomerSearch}
                  />
                  {isSearchingCustomers && <ActivityIndicator size="small" color="#3B82F6" />}
                </View>
              </View>

              <ScrollView className="p-4" showsVerticalScrollIndicator={false}>
                {/* Walk-in */}
                <TouchableOpacity
                  onPress={() => { setSelectedCustomer(null); setShowCustomerModal(false); setCustomerSearchQuery(''); }}
                  className={`mb-3 rounded-2xl p-4 ${!selectedCustomer ? 'border-2 border-green-400 bg-green-50' : 'border border-gray-200 bg-white'}`}>
                  <View className="flex-row items-center">
                    <View className="mr-3 w-10 h-10 rounded-full bg-gray-200 items-center justify-center">
                      <Ionicons name="person-outline" size={20} color="#6B7280" />
                    </View>
                    <Text className="text-base font-bold text-gray-900 flex-1">Walk-in Customer</Text>
                    {!selectedCustomer && <Ionicons name="checkmark-circle" size={22} color="#10B981" />}
                  </View>
                </TouchableOpacity>

                {displayedCustomers.map((customer) => (
                  <TouchableOpacity
                    key={customer.id}
                    onPress={() => { setSelectedCustomer(customer); setShowCustomerModal(false); }}
                    className="mb-3 rounded-2xl border border-gray-200 bg-white p-4"
                    style={{ elevation: 1 }}>
                    <View className="flex-row items-center">
                      <View className="mr-3 w-10 h-10 rounded-full bg-blue-100 items-center justify-center">
                        <Text className="text-base font-bold text-blue-600">{customer.name.charAt(0)}</Text>
                      </View>
                      <View className="flex-1">
                        <Text className="text-base font-bold text-gray-900">{customer.name}</Text>
                        {customer.phone && <Text className="text-xs text-gray-500 mt-0.5">{customer.phone}</Text>}
                      </View>
                      <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
                    </View>
                  </TouchableOpacity>
                ))}

                {displayedCustomers.length === 0 && (
                  <View className="items-center p-8">
                    <Ionicons name="people-outline" size={48} color="#D1D5DB" />
                    <Text className="text-gray-400 mt-3">No customers found</Text>
                  </View>
                )}
              </ScrollView>
            </SafeAreaView>
          </View>
        </View>
      </Modal>

      {/* ── Printing Overlay ───────────────────────────────────────────── */}
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
