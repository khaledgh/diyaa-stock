import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import apiService from '../services/api.service';
import { StockItem, CartItem, Customer } from '../types';

export default function POSScreen() {
  const { user, logout } = useAuth();
  const { width } = useWindowDimensions();
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [filteredStock, setFilteredStock] = useState<StockItem[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showCart, setShowCart] = useState(false);

  const isSmallScreen = width < 768;
  const cartWidth = isSmallScreen ? width : Math.min(400, width * 0.35);

  const loadStock = useCallback(async () => {
    if (!user?.van_id) {
      Alert.alert('Error', 'No van assigned to your account');
      setIsLoading(false);
      return;
    }

    try {
      const response = await apiService.getVanStock(user.van_id);
      if (response.success) {
        setStockItems(response.data || []);
      }
    } catch {
      Alert.alert('Error', 'Failed to load stock');
    } finally {
      setIsLoading(false);
    }
  }, [user?.van_id]);

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
  }, [loadStock]);

  useEffect(() => {
    filterStock();
  }, [filterStock]);

  const addToCart = (product: StockItem) => {
    const existingItem = cart.find((item) => item.product.id === product.id);

    if (existingItem) {
      if (existingItem.quantity >= product.quantity) {
        Alert.alert('Error', 'Not enough stock available');
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
      if (isSmallScreen) setShowCart(true);
    }
  };

  const updateCartItemQuantity = (productId: number, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }

    setCart(
      cart.map((item) => {
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
  };

  const updateCartItemDiscount = (productId: number, discount: number) => {
    setCart(
      cart.map((item) => {
        if (item.product.id === productId) {
          const subtotal = item.quantity * item.unit_price;
          const discountAmount = subtotal * (discount / 100);
          const total = subtotal - discountAmount;

          return { ...item, discount_percent: discount, total };
        }
        return item;
      })
    );
  };

  const removeFromCart = (productId: number) => {
    setCart(cart.filter((item) => item.product.id !== productId));
  };

  const calculateTotal = () => {
    return cart.reduce((sum, item) => sum + item.total, 0);
  };

  const handleCheckout = async () => {
    if (cart.length === 0) {
      Alert.alert('Error', 'Cart is empty');
      return;
    }

    if (!user?.van_id) {
      Alert.alert('Error', 'No van assigned to your account');
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
                van_id: user.van_id!,
                customer_id: selectedCustomer?.id,
                items: cart.map((item) => ({
                  product_id: item.product.id,
                  quantity: item.quantity,
                  unit_price: item.unit_price,
                  discount_percent: item.discount_percent,
                })),
                paid_amount: calculateTotal(),
              };

              const response = await apiService.createSalesInvoice(invoiceData);

              if (response.success) {
                Alert.alert('Success', 'Sale completed successfully', [
                  {
                    text: 'OK',
                    onPress: () => {
                      setCart([]);
                      setSelectedCustomer(null);
                      setShowCart(false);
                      loadStock();
                    },
                  },
                ]);
              }
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.message || 'Failed to complete sale');
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
      <View className="flex-1 justify-center items-center bg-gray-50">
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text className="mt-4 text-gray-600">Loading stock...</Text>
      </View>
    );
  }

  const CartComponent = () => (
    <View style={{ width: isSmallScreen ? '100%' : cartWidth }} className="bg-white border-l border-gray-200">
      <View className="p-4 border-b border-gray-200 flex-row justify-between items-center">
        <Text className="text-lg font-semibold text-gray-900">Cart ({cart.length})</Text>
        {isSmallScreen && (
          <TouchableOpacity onPress={() => setShowCart(false)}>
            <Text className="text-blue-600 font-medium">Close</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView className="flex-1">
        {cart.map((item) => (
          <View key={item.product.id} className="p-4 border-b border-gray-100">
            <View className="flex-row justify-between items-start mb-2">
              <Text className="flex-1 font-medium text-gray-900">{item.product.name}</Text>
              <TouchableOpacity onPress={() => removeFromCart(item.product.id)}>
                <Text className="text-red-600 ml-2">✕</Text>
              </TouchableOpacity>
            </View>

            <View className="flex-row items-center mb-2">
              <TouchableOpacity
                onPress={() => updateCartItemQuantity(item.product.id, item.quantity - 1)}
                className="bg-gray-200 w-8 h-8 rounded items-center justify-center"
              >
                <Text className="text-lg font-bold">-</Text>
              </TouchableOpacity>
              <Text className="text-base font-medium w-12 text-center">{item.quantity}</Text>
              <TouchableOpacity
                onPress={() => updateCartItemQuantity(item.product.id, item.quantity + 1)}
                className="bg-gray-200 w-8 h-8 rounded items-center justify-center"
              >
                <Text className="text-lg font-bold">+</Text>
              </TouchableOpacity>
              <Text className="text-sm text-gray-600 ml-2">@ ${item.unit_price.toFixed(2)}</Text>
            </View>

            <View className="flex-row items-center">
              <Text className="text-sm text-gray-600 mr-2">Discount:</Text>
              <TextInput
                className="border border-gray-300 rounded px-2 py-1 w-16 text-sm"
                value={item.discount_percent.toString()}
                onChangeText={(text) => updateCartItemDiscount(item.product.id, parseFloat(text) || 0)}
                keyboardType="numeric"
              />
              <Text className="text-sm text-gray-600 ml-1">%</Text>
            </View>

            <Text className="text-right font-semibold text-gray-900 mt-2">${item.total.toFixed(2)}</Text>
          </View>
        ))}
      </ScrollView>

      <View className="border-t border-gray-200 p-4">
        <View className="flex-row justify-between mb-4">
          <Text className="text-xl font-bold text-gray-900">Total:</Text>
          <Text className="text-xl font-bold text-blue-600">${calculateTotal().toFixed(2)}</Text>
        </View>

        <TouchableOpacity
          onPress={handleCheckout}
          disabled={cart.length === 0 || isLoading}
          className={`rounded-lg py-4 mb-2 ${cart.length === 0 || isLoading ? 'bg-gray-300' : 'bg-green-600'}`}
        >
          {isLoading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white text-center font-semibold text-lg">Complete Sale</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={clearCart}
          disabled={cart.length === 0}
          className={`rounded-lg py-3 ${cart.length === 0 ? 'bg-gray-200' : 'bg-red-100'}`}
        >
          <Text className={`text-center font-medium ${cart.length === 0 ? 'text-gray-400' : 'text-red-600'}`}>
            Clear Cart
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View className="flex-1 bg-gray-50">
      <View className="bg-blue-600 pt-12 pb-6 px-4">
        <View className="flex-row justify-between items-center mb-4">
          <View>
            <Text className="text-white text-2xl font-bold">POS System</Text>
            <Text className="text-blue-100 text-sm">{user?.full_name}</Text>
          </View>
          <View className="flex-row items-center">
            {isSmallScreen && cart.length > 0 && (
              <TouchableOpacity
                onPress={() => setShowCart(true)}
                className="bg-blue-700 px-4 py-2 rounded-lg mr-2"
              >
                <Text className="text-white font-medium">Cart ({cart.length})</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={logout} className="bg-blue-700 px-4 py-2 rounded-lg">
              <Text className="text-white font-medium">Logout</Text>
            </TouchableOpacity>
          </View>
        </View>

        <TextInput
          className="bg-white rounded-lg px-4 py-3 text-base"
          placeholder="Search products..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <View className="flex-1" style={{ flexDirection: isSmallScreen ? 'column' : 'row' }}>
        <View className="flex-1 bg-white">
          <View className="p-4 border-b border-gray-200">
            <Text className="text-lg font-semibold text-gray-900">
              Products ({filteredStock.length})
            </Text>
          </View>

          <FlatList
            data={filteredStock}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => (
              <TouchableOpacity
                className="p-4 border-b border-gray-100 flex-row justify-between items-center"
                onPress={() => addToCart(item)}
              >
                <View className="flex-1">
                  <Text className="text-base font-semibold text-gray-900">{item.name}</Text>
                  <Text className="text-sm text-gray-600 mt-1">
                    SKU: {item.sku} | Stock: {item.quantity}
                  </Text>
                  <Text className="text-sm text-blue-600 font-medium mt-1">
                    ${item.unit_price.toFixed(2)}
                  </Text>
                </View>
                <View className="bg-blue-600 px-4 py-2 rounded-lg">
                  <Text className="text-white font-medium">Add</Text>
                </View>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View className="p-8 items-center">
                <Text className="text-gray-500">No products found</Text>
              </View>
            }
          />
        </View>

        {!isSmallScreen && <CartComponent />}
      </View>

      {isSmallScreen && showCart && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'white' }}>
          <CartComponent />
        </View>
      )}
    </View>
  );
}
