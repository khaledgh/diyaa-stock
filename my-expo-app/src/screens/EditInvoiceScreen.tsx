import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import apiService from '../services/api.service';
import { StockItem, Vendor, Customer, CartItem, Invoice } from '../types';

const parseDecimal = (text: string): number => {
  const normalized = text.replace(',', '.');
  return parseFloat(normalized) || 0;
};

export default function EditInvoiceScreen({ route, navigation }: any) {
  const { invoiceId, invoiceType } = route.params || {};
  const { user } = useAuth();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showVendorModal, setShowVendorModal] = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showItemModal, setShowItemModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocationId, setSelectedLocationId] = useState<number | null>(null);
  const [locations, setLocations] = useState<any[]>([]);
  const [paidAmount, setPaidAmount] = useState('0');
  const isAdmin = user?.role === 'admin';

  const loadInvoiceData = useCallback(async () => {
    if (!invoiceId) return;
    setIsLoading(true);
    try {
      const [invoiceRes, productsRes, locationsRes] = await Promise.all([
        apiService.getInvoiceById(invoiceId, invoiceType),
        apiService.getProducts(),
        apiService.getLocations(),
      ]);

      if (invoiceRes.ok || invoiceRes.success) {
        const inv = invoiceRes.data;
        setInvoice(inv);
        setSelectedLocationId(inv.location_id);
        setPaidAmount(inv.paid_amount?.toString() || '0');

        // Load items into cart
        if (inv.items && Array.isArray(inv.items)) {
          const cartItems: CartItem[] = inv.items.map((item: any) => ({
            item_id: item.id,
            product: {
              id: item.product_id,
              name: item.product?.name_en || item.product?.name_ar || item.product_name || 'Unknown',
              sku: item.product?.sku || '',
              unit_price: parseFloat(item.unit_price) || 0,
              quantity: parseFloat(item.quantity) || 0,
            } as StockItem,
            quantity: parseFloat(item.quantity) || 0,
            unit_price: parseFloat(item.unit_price) || 0,
            discount_percent: parseFloat(item.discount_percent) || 0,
            total: parseFloat(item.total) || 0,
          }));
          setCart(cartItems);
        }

        // Load vendor/customer
        if (invoiceType === 'purchase') {
          const vendorsRes = await apiService.getVendors();
          if (vendorsRes.data) setVendors(vendorsRes.data);
          if (inv.vendor_id) {
            const vendor = vendorsRes.data?.find((v: Vendor) => v.id === inv.vendor_id);
            if (vendor) setSelectedVendor(vendor);
          }
        } else {
          const customersRes = await apiService.getCustomers();
          if (customersRes.data) setCustomers(customersRes.data);
          if (inv.customer_id) {
            const customer = customersRes.data?.find((c: Customer) => c.id === inv.customer_id);
            if (customer) setSelectedCustomer(customer);
          }
        }
      }

      // Load products
      let plist: any[] = [];
      if (Array.isArray(productsRes)) {
        plist = productsRes;
      } else if (productsRes?.data && Array.isArray(productsRes.data)) {
        plist = productsRes.data;
      }
      if (plist.length > 0) {
        setStockItems(plist.map((item: any) => ({
          id: item.id,
          name: item.name_en || item.name_ar || 'Unknown',
          sku: item.sku,
          unit_price: parseFloat(item.cost_price || item.unit_price) || 0,
          quantity: 0,
        })));
      }

      // Load locations
      if (locationsRes?.data) setLocations(locationsRes.data);
    } catch (err) {
      Alert.alert('Error', 'Failed to load invoice data');
      navigation.goBack();
    } finally {
      setIsLoading(false);
    }
  }, [invoiceId, invoiceType, navigation]);

  useEffect(() => {
    loadInvoiceData();
  }, [loadInvoiceData]);

  const updateCartQuantity = (productId: number, quantity: number) => {
    if (quantity <= 0) {
      setCart(cart.filter(item => item.product.id !== productId));
      return;
    }
    setCart(cart.map(item => {
      if (item.product.id === productId) {
        const total = quantity * item.unit_price * (1 - item.discount_percent / 100);
        return { ...item, quantity, total };
      }
      return item;
    }));
  };

  const updateCartPrice = (productId: number, price: number) => {
    setCart(cart.map(item => {
      if (item.product.id === productId) {
        const total = item.quantity * price * (1 - item.discount_percent / 100);
        return { ...item, unit_price: price, total };
      }
      return item;
    }));
  };

  const updateCartDiscount = (productId: number, discount: number) => {
    setCart(cart.map(item => {
      if (item.product.id === productId) {
        const total = item.quantity * item.unit_price * (1 - discount / 100);
        return { ...item, discount_percent: discount, total };
      }
      return item;
    }));
  };

  const addProductToCart = (product: StockItem) => {
    const existing = cart.find(item => item.product.id === product.id);
    if (existing) {
      updateCartQuantity(product.id, existing.quantity + 1);
    } else {
      setCart([...cart, {
        product,
        quantity: 1,
        unit_price: product.unit_price,
        discount_percent: 0,
        total: product.unit_price,
      }]);
    }
    setShowItemModal(false);
  };

  const calculateTotal = () => cart.reduce((sum, item) => sum + item.total, 0);

  const handleUpdate = async () => {
    if (invoiceType === 'purchase' && !selectedVendor) {
      return Alert.alert('Error', 'Please select a vendor');
    }
    if (!selectedLocationId) {
      return Alert.alert('Error', 'Please select a location');
    }
    if (cart.length === 0) {
      return Alert.alert('Error', 'Please add items');
    }

    try {
      setIsSubmitting(true);

      if (invoiceType === 'purchase') {
        // Diff-based item sync for purchase invoices
        const originalItemIds = new Set((invoice?.items || []).map((i: any) => i.id as number));
        const cartItemIds = new Set(cart.filter(i => i.item_id).map(i => i.item_id as number));

        // Delete removed items
        for (const origId of originalItemIds) {
          if (!cartItemIds.has(origId)) {
            await apiService.deletePurchaseInvoiceItem(invoiceId, origId);
          }
        }

        // Update existing items / add new items
        for (const cartItem of cart) {
          const payload = {
            product_id: cartItem.product.id,
            quantity: cartItem.quantity,
            unit_price: cartItem.unit_price,
            discount_percent: cartItem.discount_percent,
          };
          if (cartItem.item_id && originalItemIds.has(cartItem.item_id)) {
            await apiService.updatePurchaseInvoiceItem(invoiceId, cartItem.item_id, payload);
          } else {
            await apiService.addPurchaseInvoiceItem(invoiceId, payload);
          }
        }

        // Update invoice metadata (location, vendor, status)
        const metaUpdate: any = {
          vendor_id: selectedVendor?.id,
          status: invoice?.status || 'draft',
        };
        if (selectedLocationId !== invoice?.location_id) {
          metaUpdate.location_id = selectedLocationId;
        }
        const res = await apiService.updateInvoice(invoiceId, metaUpdate, 'purchase');
        if (res.ok || res.success) {
          Alert.alert('Success', 'Invoice updated successfully', [
            { text: 'OK', onPress: () => navigation.goBack() }
          ]);
        } else {
          Alert.alert('Error', res.message || 'Update failed');
        }
      } else {
        // Sales invoices: keep existing bulk update approach
        const updateData: any = {
          location_id: selectedLocationId,
          items: cart.map(item => ({
            product_id: item.product.id,
            quantity: item.quantity,
            unit_price: item.unit_price,
            discount_percent: item.discount_percent,
          })),
          paid_amount: parseDecimal(paidAmount),
          status: invoice?.status || 'draft',
          customer_id: selectedCustomer?.id,
        };

        const res = await apiService.updateInvoice(invoiceId, updateData, invoiceType);
        if (res.ok || res.success) {
          Alert.alert('Success', 'Invoice updated successfully', [
            { text: 'OK', onPress: () => navigation.goBack() }
          ]);
        } else {
          Alert.alert('Error', res.message || 'Update failed');
        }
      }
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to update invoice');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  if (!invoice || (invoice.status === 'finalized' && invoiceType !== 'purchase')) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50 p-6">
        <Ionicons name="lock-closed" size={64} color="#9CA3AF" />
        <Text className="text-xl font-bold text-gray-900 mt-4">Cannot Edit</Text>
        <Text className="text-gray-500 text-center mt-2">
          {!invoice ? 'Invoice not found' : 'Finalized invoices cannot be edited'}
        </Text>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          className="mt-6 bg-blue-600 px-6 py-3 rounded-2xl">
          <Text className="text-white font-bold">Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const filteredProducts = stockItems.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.sku?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1 bg-gray-50"
    >
      <SafeAreaView edges={['top']} className="bg-white px-5 py-4 border-b border-gray-100">
        <View className="flex-row items-center justify-between">
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#374151" />
          </TouchableOpacity>
          <View className="flex-1 ml-4">
            <Text className="text-xl font-bold text-gray-900">Edit Invoice</Text>
            <Text className="text-xs text-gray-500">{invoice.invoice_number}</Text>
          </View>
        </View>
      </SafeAreaView>

      <ScrollView className="flex-1 p-4" showsVerticalScrollIndicator={false}>
        {/* Vendor/Customer Section */}
        {invoiceType === 'purchase' ? (
          <TouchableOpacity
            onPress={() => setShowVendorModal(true)}
            className="flex-row items-center justify-between rounded-2xl px-5 py-4 mb-4 bg-white border border-gray-200">
            <View className="flex-1">
              <Text className="text-xs text-gray-500 font-bold uppercase mb-1">Vendor</Text>
              <Text className="text-base font-bold text-gray-900">
                {selectedVendor?.name || 'Select Vendor'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={() => setShowCustomerModal(true)}
            className="flex-row items-center justify-between rounded-2xl px-5 py-4 mb-4 bg-white border border-gray-200">
            <View className="flex-1">
              <Text className="text-xs text-gray-500 font-bold uppercase mb-1">Customer</Text>
              <Text className="text-base font-bold text-gray-900">
                {selectedCustomer?.name || 'Walk-in Customer'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        )}

        {/* Items Section */}
        <View className="flex-row items-center justify-between mb-3">
          <Text className="text-lg font-bold text-gray-900">Items</Text>
          <TouchableOpacity
            onPress={() => setShowItemModal(true)}
            className="flex-row items-center bg-blue-600 px-4 py-2 rounded-xl">
            <Ionicons name="add" size={18} color="white" />
            <Text className="text-white font-bold ml-1">Add</Text>
          </TouchableOpacity>
        </View>

        {cart.length === 0 ? (
          <View className="bg-white rounded-2xl p-10 items-center border border-dashed border-gray-300">
            <Ionicons name="cart-outline" size={48} color="#D1D5DB" />
            <Text className="text-gray-400 mt-4">No items in invoice</Text>
          </View>
        ) : (
          cart.map((item) => (
            <View key={item.product.id} className="bg-white rounded-2xl p-4 mb-3 border border-gray-100">
              <View className="flex-row justify-between mb-3">
                <View className="flex-1">
                  <Text className="font-bold text-gray-900">{item.product.name}</Text>
                  <Text className="text-xs text-gray-500">SKU: {item.product.sku}</Text>
                </View>
                <TouchableOpacity onPress={() => updateCartQuantity(item.product.id, 0)}>
                  <Ionicons name="trash-outline" size={20} color="#EF4444" />
                </TouchableOpacity>
              </View>

              <View className="flex-row items-center justify-between">
                <View className="flex-1 mr-2">
                  <Text className="text-xs text-gray-400 mb-1">UNIT PRICE</Text>
                  <TextInput
                    className="border border-gray-200 rounded-lg px-3 py-2 text-gray-900 font-bold"
                    keyboardType="decimal-pad"
                    value={item.unit_price.toString()}
                    onChangeText={(val) => updateCartPrice(item.product.id, parseDecimal(val))}
                    selectTextOnFocus
                  />
                </View>
                <View className="mr-2" style={{ width: 72 }}>
                  <Text className="text-xs text-gray-400 mb-1">DISC %</Text>
                  <TextInput
                    className="border border-gray-200 rounded-lg px-3 py-2 text-gray-900 font-bold"
                    keyboardType="decimal-pad"
                    value={item.discount_percent.toString()}
                    onChangeText={(val) => updateCartDiscount(item.product.id, parseDecimal(val))}
                    selectTextOnFocus
                  />
                </View>
                <View className="flex-row items-center bg-gray-100 rounded-xl px-2 py-1">
                  <TouchableOpacity
                    onPress={() => updateCartQuantity(item.product.id, item.quantity - 1)}
                    className="w-10 h-10 items-center justify-center">
                    <Ionicons name="remove" size={22} color="#4B5563" />
                  </TouchableOpacity>
                  <TextInput
                    className="w-16 text-center font-bold text-gray-900 text-lg p-0"
                    keyboardType="decimal-pad"
                    value={item.quantity.toString()}
                    onChangeText={(val) => updateCartQuantity(item.product.id, parseDecimal(val))}
                    selectTextOnFocus
                  />
                  <TouchableOpacity
                    onPress={() => updateCartQuantity(item.product.id, item.quantity + 1)}
                    className="w-10 h-10 items-center justify-center">
                    <Ionicons name="add" size={22} color="#4B5563" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))
        )}

        {/* Paid Amount */}
        <View className="bg-white rounded-2xl p-4 mt-4 mb-20">
          <Text className="text-xs text-gray-500 font-bold uppercase mb-2">Paid Amount</Text>
          <TextInput
            className="border border-gray-200 rounded-lg px-4 py-3 text-gray-900 font-bold text-lg"
            keyboardType="decimal-pad"
            value={paidAmount}
            onChangeText={setPaidAmount}
            placeholder="0.00"
          />
        </View>
      </ScrollView>

      {/* Footer */}
      <View className="bg-white border-t border-gray-100 px-4 py-3">
        <View className="flex-row items-center justify-between mb-3">
          <Text className="text-gray-500 text-sm">Total ({cart.length} items)</Text>
          <Text className="text-2xl font-black text-blue-600">${calculateTotal().toFixed(2)}</Text>
        </View>
        <TouchableOpacity
          onPress={handleUpdate}
          disabled={isSubmitting}
          className={`h-14 rounded-2xl items-center justify-center ${isSubmitting ? 'bg-gray-300' : 'bg-blue-600'}`}>
          {isSubmitting ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white font-bold text-lg">Update Invoice</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Item Picker Modal */}
      <Modal visible={showItemModal} animationType="slide" transparent onRequestClose={() => setShowItemModal(false)}>
        <View className="flex-1 bg-black/60 justify-end">
          <View className="bg-white rounded-t-3xl p-6 h-3/4">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-xl font-bold text-gray-900">Add Product</Text>
              <TouchableOpacity onPress={() => setShowItemModal(false)}>
                <Ionicons name="close" size={24} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            <View className="bg-gray-100 rounded-xl px-4 py-2 flex-row items-center mb-4">
              <Ionicons name="search" size={20} color="#9CA3AF" />
              <TextInput
                placeholder="Search products..."
                className="flex-1 ml-2 text-gray-900"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {filteredProducts.map(product => (
                <TouchableOpacity
                  key={product.id}
                  onPress={() => addProductToCart(product)}
                  className="py-4 border-b border-gray-100">
                  <Text className="text-gray-900 font-bold">{product.name}</Text>
                  <Text className="text-gray-500 text-sm">SKU: {product.sku} | ${product.unit_price.toFixed(2)}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Vendor Modal */}
      {invoiceType === 'purchase' && (
        <Modal visible={showVendorModal} animationType="slide" transparent onRequestClose={() => setShowVendorModal(false)}>
          <View className="flex-1 bg-black/60 justify-end">
            <View className="bg-white rounded-t-3xl p-6 h-2/3">
              <View className="flex-row justify-between items-center mb-4">
                <Text className="text-xl font-bold text-gray-900">Select Vendor</Text>
                <TouchableOpacity onPress={() => setShowVendorModal(false)}>
                  <Ionicons name="close" size={24} color="#9CA3AF" />
                </TouchableOpacity>
              </View>
              <ScrollView>
                {vendors.map(vendor => (
                  <TouchableOpacity
                    key={vendor.id}
                    onPress={() => {
                      setSelectedVendor(vendor);
                      setShowVendorModal(false);
                    }}
                    className="py-4 border-b border-gray-100">
                    <Text className="text-gray-900 font-bold">{vendor.name}</Text>
                    {vendor.company_name && <Text className="text-gray-500 text-sm">{vendor.company_name}</Text>}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}

      {/* Customer Modal */}
      {invoiceType === 'sales' && (
        <Modal visible={showCustomerModal} animationType="slide" transparent onRequestClose={() => setShowCustomerModal(false)}>
          <View className="flex-1 bg-black/60 justify-end">
            <View className="bg-white rounded-t-3xl p-6 h-2/3">
              <View className="flex-row justify-between items-center mb-4">
                <Text className="text-xl font-bold text-gray-900">Select Customer</Text>
                <TouchableOpacity onPress={() => setShowCustomerModal(false)}>
                  <Ionicons name="close" size={24} color="#9CA3AF" />
                </TouchableOpacity>
              </View>
              <ScrollView>
                {customers.map(customer => (
                  <TouchableOpacity
                    key={customer.id}
                    onPress={() => {
                      setSelectedCustomer(customer);
                      setShowCustomerModal(false);
                    }}
                    className="py-4 border-b border-gray-100">
                    <Text className="text-gray-900 font-bold">{customer.name}</Text>
                    {customer.phone && <Text className="text-gray-500 text-sm">{customer.phone}</Text>}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}
    </KeyboardAvoidingView>
  );
}
