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
    ScrollView,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import apiService from '../services/api.service';
import { StockItem, Vendor, CartItem } from '../types';
import * as ImagePicker from 'expo-image-picker';

export default function PurchaseInvoiceScreen({ navigation }: any) {
    const { user } = useAuth();
    const [stockItems, setStockItems] = useState<StockItem[]>([]);
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showVendorModal, setShowVendorModal] = useState(false);
    const [showItemModal, setShowItemModal] = useState(false);
    const [vendorSearchQuery, setVendorSearchQuery] = useState('');
    const [selectedLocationId, setSelectedLocationId] = useState<number | null>(user?.location_id || null);
    const [locations, setLocations] = useState<any[]>([]);
    const [selectedProduct, setSelectedProduct] = useState<StockItem | null>(null);
    const [tempQty, setTempQty] = useState('1');
    const [tempPrice, setTempPrice] = useState('');
    const isAdmin = user?.role === 'admin';

    const loadInitialData = useCallback(async () => {
        setIsLoading(true);
        try {
            const locationId = selectedLocationId || user?.location_id;
            const [stockRes, vendorsRes, locationsRes] = await Promise.all([
                locationId ? apiService.getLocationStock(locationId) : Promise.resolve({ data: [] }),
                apiService.getVendors(),
                isAdmin ? apiService.getLocations() : Promise.resolve({ data: [] }),
            ]);

            if (stockRes.ok || stockRes.success) {
                setStockItems((stockRes.data || []).map((item: any) => ({
                    id: item.product_id,
                    name: item.name_en || item.name_ar || 'Unknown',
                    sku: item.sku,
                    unit_price: parseFloat(item.unit_price) || 0,
                    quantity: parseInt(item.quantity) || 0,
                    location_id: item.location_id,
                })));
            }

            // Vendor API returns paginated format: {data: [], current_page, total}
            if (vendorsRes.data && Array.isArray(vendorsRes.data)) {
                const vendorData = vendorsRes.data;
                setVendors(vendorData);
            } else {
                setVendors([]);
            }

            if (locationsRes.success || locationsRes.ok) {
                setLocations(locationsRes.data || []);
            }
        } catch {
            // silently fail
            Alert.alert('Error', 'Failed to initialize screen');
        } finally {
            setIsLoading(false);
        }
    }, [user?.location_id, selectedLocationId, isAdmin]);

    useEffect(() => {
        loadInitialData();
    }, [loadInitialData]);

    const openProductSubModal = (product: StockItem) => {
        setSelectedProduct(product);
        setTempQty('1');
        setTempPrice(product.unit_price.toString());
    };

    const confirmAddToCart = () => {
        if (!selectedProduct) return;
        const qty = parseFloat(tempQty.replace(',', '.')) || 1;
        const price = parseFloat(tempPrice.replace(',', '.')) || selectedProduct.unit_price;
        const existingItem = cart.find(item => item.product.id === selectedProduct.id);
        if (existingItem) {
            setCart(cart.map(item => {
                if (item.product.id === selectedProduct.id) {
                    const newQty = item.quantity + qty;
                    return { ...item, quantity: newQty, unit_price: price, total: newQty * price };
                }
                return item;
            }));
        } else {
            setCart([...cart, {
                product: selectedProduct,
                quantity: qty,
                unit_price: price,
                discount_percent: 0,
                total: qty * price,
            }]);
        }
        setSelectedProduct(null);
    };

    const addToCart = (product: StockItem) => {
        openProductSubModal(product);
    };

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

    const calculateTotal = () => cart.reduce((sum, item) => sum + item.total, 0);

    const handleAIScan = async () => {
        try {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') return Alert.alert('Error', 'Camera permission required');

            const result = await ImagePicker.launchCameraAsync({
                base64: true,
                quality: 0.5,
            });

            if (result.canceled || !result.assets[0].base64) return;

            setIsLoading(true);
            const aiResult = await apiService.extractDataWithAI('Extract this purchase invoice', result.assets[0].base64);

            if (aiResult.vendor_name) {
                const foundVendor = vendors.find(v => v.name.toLowerCase().includes(aiResult.vendor_name.toLowerCase()));
                if (foundVendor) setSelectedVendor(foundVendor);
            }

            if (aiResult.items && Array.isArray(aiResult.items)) {
                const newCartItems: CartItem[] = aiResult.items.map((aiItem: any) => {
                    const sysProduct = aiItem.product_id ? stockItems.find(s => s.id === aiItem.product_id) : null;
                    return {
                        product: sysProduct || {
                            id: Math.random(),
                            name: aiItem.name || aiItem.system_name || 'Generic Item',
                            sku: 'NEW',
                            unit_price: aiItem.unit_price || 0,
                            quantity: aiItem.quantity || 1,
                            location_id: selectedLocationId || 0,
                        } as any,
                        quantity: aiItem.quantity || 1,
                        unit_price: aiItem.unit_price || 0,
                        discount_percent: aiItem.discount_percent || 0,
                        total: (aiItem.quantity || 1) * (aiItem.unit_price || 0) * (1 - (aiItem.discount_percent || 0) / 100),
                    };
                });
                setCart([...cart, ...newCartItems]);
                Alert.alert('AI Success', `Imported ${newCartItems.length} items from scan!`);
            }
        } catch {
            // silently fail
            Alert.alert('Scan Failed', 'Unable to extract data from image.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async () => {
        if (!selectedVendor) return Alert.alert('Error', 'Please select a vendor');
        if (cart.length === 0) return Alert.alert('Error', 'Please add items');

        try {
            setIsSubmitting(true);
            const invoiceData = {
                vendor_id: selectedVendor.id,
                location_id: selectedLocationId || user?.location_id,
                items: cart.map(item => ({
                    product_id: item.product.id,
                    quantity: item.quantity,
                    unit_price: item.unit_price,
                    discount_percent: item.discount_percent,
                })),
                paid_amount: 0, // Assume not paid initially for purchase
                payment_method: 'bank_transfer',
                status: 'draft',
            };

            const res = await apiService.createPurchaseInvoice(invoiceData);
            if (res.ok || res.success) {
                Alert.alert('Success', 'Purchase invoice created successfully');
                // Reset form
                setCart([]);
                setSelectedVendor(null);
                // Try going back if pushed onto stack, otherwise just stay on reset form
                try { navigation.goBack(); } catch (_e) { /* tab mode — form already reset */ }
            } else {
                Alert.alert('Error', res.message || 'Submission failed');
            }
        } catch {
            // silently fail
            Alert.alert('Error', 'Communication failure');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) {
        return (
            <View className="flex-1 justify-center items-center bg-white">
                <ActivityIndicator size="large" color="#3B82F6" />
            </View>
        );
    }

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            className="flex-1 bg-gray-50"
        >
            <SafeAreaView edges={['top']} className="bg-white px-5 py-4" style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2 }}>
                <View className="flex-row items-center justify-between">
                    <TouchableOpacity onPress={() => navigation.goBack()}>
                        <Ionicons name="arrow-back" size={24} color="#374151" />
                    </TouchableOpacity>
                    <Text className="text-xl font-bold text-gray-900">New Purchase</Text>
                    <View style={{ width: 32 }} />
                </View>
            </SafeAreaView>

            <ScrollView 
                className="flex-1 p-4" 
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 100 }}
            >
                {/* Vendor Section */}
                <TouchableOpacity
                    onPress={() => setShowVendorModal(true)}
                    className="bg-white rounded-2xl p-4 mb-4 border border-blue-50"
                    style={{ elevation: 2 }}
                >
                    <View className="flex-row items-center justify-between">
                        <View className="flex-row items-center">
                            <View className="bg-blue-100 p-2 rounded-xl mr-3">
                                <Ionicons name="business" size={24} color="#2563EB" />
                            </View>
                            <View>
                                <Text className="text-xs text-gray-500 font-medium">VENDOR</Text>
                                <Text className="text-base font-bold text-gray-900">
                                    {selectedVendor ? selectedVendor.name : 'Select Vendor'}
                                </Text>
                            </View>
                        </View>
                        <Ionicons name="chevron-down" size={20} color="#9CA3AF" />
                    </View>
                </TouchableOpacity>

                {/* Items Section Header */}
                <View className="flex-row items-center justify-between mb-3 px-1">
                    <Text className="text-lg font-bold text-gray-900">Purchase Items</Text>
                    <View className="flex-row items-center gap-2">
                        {cart.length > 0 && (
                            <TouchableOpacity
                                onPress={() => Alert.alert('Clear All', 'Remove all items from the list?', [
                                    { text: 'Cancel', style: 'cancel' },
                                    { text: 'Clear', style: 'destructive', onPress: () => setCart([]) },
                                ])}
                                className="flex-row items-center bg-red-50 border border-red-200 px-3 py-2 rounded-xl"
                            >
                                <Ionicons name="trash-outline" size={16} color="#EF4444" />
                                <Text className="text-red-500 font-bold ml-1">Clear</Text>
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity
                            onPress={() => {
                                if (!selectedVendor) {
                                    Alert.alert('Vendor Required', 'Please select a vendor first.', [
                                        { text: 'Select Vendor', onPress: () => setShowVendorModal(true) },
                                        { text: 'Cancel', style: 'cancel' }
                                    ]);
                                    return;
                                }
                                setShowItemModal(true);
                            }}
                            className="flex-row items-center bg-blue-600 px-4 py-2 rounded-xl"
                        >
                            <Ionicons name="add" size={18} color="white" />
                            <Text className="text-white font-bold ml-1">Add</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Cart/Items List */}
                {cart.length === 0 ? (
                    <View className="bg-white rounded-3xl p-10 items-center border border-dashed border-gray-300">
                        <Ionicons name="cart-outline" size={48} color="#D1D5DB" />
                        <Text className="text-gray-400 mt-4 text-center">No items added to this purchase yet.</Text>
                    </View>
                ) : (
                    cart.map((item, index) => (
                        <View key={item.product.id} className="bg-white rounded-2xl p-4 mb-3 border border-gray-100" style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 }}>
                            <View className="flex-row justify-between mb-3">
                                <View className="flex-1">
                                    <Text className="font-bold text-gray-900 text-base">{item.product.name}</Text>
                                    <Text className="text-xs text-gray-500">SKU: {item.product.sku}</Text>
                                </View>
                                <TouchableOpacity onPress={() => updateCartQuantity(item.product.id, 0)}>
                                    <Ionicons name="trash-outline" size={20} color="#EF4444" />
                                </TouchableOpacity>
                            </View>

                            <View className="flex-row items-center justify-between">
                                <View className="flex-1 mr-4">
                                    <Text className="text-xs text-gray-400 mb-1">UNIT PRICE</Text>
                                    <TextInput
                                        className="border border-gray-200 rounded-lg px-3 py-2 text-gray-900 font-bold"
                                        keyboardType="decimal-pad"
                                        value={item.unit_price.toString()}
                                        onChangeText={(val) => updateCartPrice(item.product.id, parseFloat(val.replace(',', '.')) || 0)}
                                        selectTextOnFocus
                                    />
                                </View>
                                <View className="flex-row items-center bg-gray-100 rounded-xl px-2 py-1">
                                    <TouchableOpacity
                                        onPress={() => updateCartQuantity(item.product.id, item.quantity - 1)}
                                        className="w-10 h-10 items-center justify-center"
                                    >
                                        <Ionicons name="remove" size={22} color="#4B5563" />
                                    </TouchableOpacity>
                                    <TextInput
                                        className="w-16 text-center font-bold text-gray-900 text-lg p-0"
                                        keyboardType="decimal-pad"
                                        defaultValue={item.quantity.toString()}
                                        onEndEditing={(e) => {
                                            const val = e.nativeEvent.text;
                                            updateCartQuantity(item.product.id, parseFloat(val.replace(',', '.')) || 0);
                                        }}
                                        selectTextOnFocus
                                    />
                                    <TouchableOpacity
                                        onPress={() => updateCartQuantity(item.product.id, item.quantity + 1)}
                                        className="w-10 h-10 items-center justify-center"
                                    >
                                        <Ionicons name="add" size={22} color="#4B5563" />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    ))
                )}
            </ScrollView>

            {/* Footer / Summary */}
            <View className="bg-white border-t border-gray-100" style={{ shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 8 }}>
                <View className="px-4 py-2 flex-row items-center justify-between">
                    <View>
                        <Text className="text-gray-400 text-xs">TOTAL ({cart.length} items)</Text>
                        <Text className="text-xl font-black text-blue-600">${calculateTotal().toFixed(2)}</Text>
                    </View>
                    <TouchableOpacity
                        onPress={handleSubmit}
                        disabled={isSubmitting || cart.length === 0}
                        className={`flex-row items-center justify-center h-12 px-6 rounded-2xl ${isSubmitting || cart.length === 0 ? 'bg-gray-300' : 'bg-blue-600'}`}
                        style={{ elevation: 4 }}
                    >
                        {isSubmitting ? (
                            <ActivityIndicator color="white" />
                        ) : (
                            <>
                                <Ionicons name="checkmark-done" size={20} color="white" />
                                <Text className="text-white font-bold text-base ml-2">Submit</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            </View>

            {/* Vendor Selection Modal — bottom drawer */}
            <Modal visible={showVendorModal} animationType="slide" transparent onRequestClose={() => setShowVendorModal(false)}>
                <TouchableOpacity activeOpacity={1} onPress={() => setShowVendorModal(false)} className="flex-1" style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)' }} />
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    style={{ backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '70%' }}
                >
                    <SafeAreaView edges={['bottom']}>
                        <View className="p-6">
                            {/* Drag handle */}
                            <View className="items-center mb-4">
                                <View className="w-10 h-1 bg-gray-300 rounded-full" />
                            </View>
                            <View className="flex-row justify-between items-center mb-4">
                                <Text className="text-xl font-bold text-gray-900">Select Vendor</Text>
                                <TouchableOpacity onPress={() => setShowVendorModal(false)}>
                                    <Ionicons name="close" size={24} color="#9CA3AF" />
                                </TouchableOpacity>
                            </View>

                            {/* Search Input */}
                            <View className="bg-gray-100 rounded-xl px-4 py-2 flex-row items-center mb-4">
                                <Ionicons name="search" size={20} color="#9CA3AF" />
                                <TextInput
                                    placeholder="Search vendors..."
                                    className="flex-1 ml-2 text-gray-900"
                                    value={vendorSearchQuery}
                                    onChangeText={setVendorSearchQuery}
                                />
                                {vendorSearchQuery.length > 0 && (
                                    <TouchableOpacity onPress={() => setVendorSearchQuery('')}>
                                        <Ionicons name="close-circle" size={20} color="#9CA3AF" />
                                    </TouchableOpacity>
                                )}
                            </View>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false} className="px-6" style={{ maxHeight: 400 }}>
                            {(() => {
                                const filteredVendors = vendors.filter(v => {
                                    const query = vendorSearchQuery.toLowerCase();
                                    return (
                                        v.name?.toLowerCase().includes(query) ||
                                        v.company_name?.toLowerCase().includes(query) ||
                                        v.phone?.toLowerCase().includes(query)
                                    );
                                });

                                if (vendors.length === 0) {
                                    return (
                                        <View className="py-10 items-center">
                                            <Ionicons name="business-outline" size={48} color="#D1D5DB" />
                                            <Text className="text-gray-400 mt-4 text-center">No vendors available</Text>
                                            <Text className="text-gray-400 text-sm text-center mt-2">Add vendors in settings first</Text>
                                        </View>
                                    );
                                }

                                if (filteredVendors.length === 0) {
                                    return (
                                        <View className="py-10 items-center">
                                            <Ionicons name="search-outline" size={48} color="#D1D5DB" />
                                            <Text className="text-gray-400 mt-4 text-center">No vendors found</Text>
                                        </View>
                                    );
                                }

                                return filteredVendors.map(v => (
                                    <TouchableOpacity
                                        key={v.id}
                                        onPress={() => { 
                                            setSelectedVendor(v); 
                                            setShowVendorModal(false);
                                            setVendorSearchQuery('');
                                        }}
                                        className="py-4 border-b border-gray-100 flex-row items-center justify-between"
                                    >
                                        <View className="flex-row items-center flex-1">
                                            <View className="bg-blue-50 w-12 h-12 rounded-full items-center justify-center mr-3">
                                                <Text className="text-blue-600 font-bold text-lg">{v.name.charAt(0).toUpperCase()}</Text>
                                            </View>
                                            <View className="flex-1">
                                                <Text className="text-gray-900 font-bold text-base">{v.name}</Text>
                                                {v.company_name && (
                                                    <Text className="text-gray-500 text-sm mt-0.5">{v.company_name}</Text>
                                                )}
                                                {v.phone && (
                                                    <Text className="text-gray-400 text-xs mt-0.5">{v.phone}</Text>
                                                )}
                                            </View>
                                        </View>
                                        {selectedVendor?.id === v.id && (
                                            <Ionicons name="checkmark-circle" size={24} color="#2563EB" />
                                        )}
                                    </TouchableOpacity>
                                ));
                            })()}
                        </ScrollView>
                    </SafeAreaView>
                </KeyboardAvoidingView>
            </Modal>

            {/* Item Picker Modal */}
            <Modal visible={showItemModal} animationType="fade" transparent onRequestClose={() => { setSelectedProduct(null); setShowItemModal(false); }}>
                <View className="flex-1 justify-center p-6" style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)' }}>
                    <View className="bg-white rounded-3xl p-6 h-3/4">
                        <View className="flex-row justify-between items-center mb-4">
                            <Text className="text-xl font-bold text-gray-900">Add Product</Text>
                            <TouchableOpacity onPress={() => { setSelectedProduct(null); setShowItemModal(false); }}>
                                <Ionicons name="close" size={24} color="#9CA3AF" />
                            </TouchableOpacity>
                        </View>

                        <View className="bg-gray-100 rounded-xl px-4 py-2 flex-row items-center mb-4">
                            <Ionicons name="search" size={20} color="#9CA3AF" />
                            <TextInput
                                placeholder="Product name or SKU..."
                                className="flex-1 ml-2 text-gray-900"
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                            />
                        </View>

                        <FlatList
                            data={stockItems.filter(i => i.name.toLowerCase().includes(searchQuery.toLowerCase()) || i.sku?.toLowerCase().includes(searchQuery.toLowerCase()))}
                            keyExtractor={item => item.id.toString()}
                            renderItem={({ item }) => {
                                const inCart = cart.find(c => c.product.id === item.id);
                                return (
                                    <TouchableOpacity
                                        onPress={() => addToCart(item)}
                                        className="py-3 border-b border-gray-50 flex-row justify-between items-center"
                                    >
                                        <View className="flex-1">
                                            <Text className="text-gray-900 font-bold">{item.name}</Text>
                                            <Text className="text-xs text-gray-500">SKU: {item.sku} | Price: ${item.unit_price}</Text>
                                        </View>
                                        {inCart ? (
                                            <View className="bg-green-100 rounded-full px-3 py-1 mr-2">
                                                <Text className="text-green-700 text-xs font-bold">×{inCart.quantity}</Text>
                                            </View>
                                        ) : null}
                                        <Ionicons name="add-circle" size={28} color="#3B82F6" />
                                    </TouchableOpacity>
                                );
                            }}
                        />
                    </View>

                    {/* Qty/Price Sub-Modal */}
                    {selectedProduct && (
                        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
                            <View className="bg-white rounded-3xl p-6 w-full" style={{ maxWidth: 340 }}>
                                <Text className="text-lg font-bold text-gray-900 mb-1">{selectedProduct.name}</Text>
                                <Text className="text-xs text-gray-500 mb-4">SKU: {selectedProduct.sku}</Text>

                                <View className="mb-4">
                                    <Text className="text-xs text-gray-400 font-bold mb-1">QUANTITY</Text>
                                    <View className="flex-row items-center">
                                        <TouchableOpacity
                                            onPress={() => setTempQty(String(Math.max(0, (parseFloat(tempQty.replace(',', '.')) || 0) - 1)))}
                                            className="w-12 h-12 items-center justify-center bg-gray-100 rounded-xl"
                                        >
                                            <Ionicons name="remove" size={22} color="#374151" />
                                        </TouchableOpacity>
                                        <TextInput
                                            className="flex-1 text-center text-xl font-bold text-gray-900 mx-3 border border-gray-200 rounded-xl py-2"
                                            keyboardType="decimal-pad"
                                            value={tempQty}
                                            onChangeText={(val) => setTempQty(val)}
                                            selectTextOnFocus
                                        />
                                        <TouchableOpacity
                                            onPress={() => setTempQty(String((parseFloat(tempQty.replace(',', '.')) || 0) + 1))}
                                            className="w-12 h-12 items-center justify-center bg-gray-100 rounded-xl"
                                        >
                                            <Ionicons name="add" size={22} color="#374151" />
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                <View className="mb-5">
                                    <Text className="text-xs text-gray-400 font-bold mb-1">UNIT PRICE ($)</Text>
                                    <TextInput
                                        className="border border-gray-200 rounded-xl px-4 py-3 text-lg font-bold text-gray-900"
                                        keyboardType="decimal-pad"
                                        value={tempPrice}
                                        onChangeText={setTempPrice}
                                        selectTextOnFocus
                                    />
                                </View>

                                <View className="flex-row gap-3">
                                    <TouchableOpacity
                                        onPress={() => setSelectedProduct(null)}
                                        className="flex-1 h-12 items-center justify-center bg-gray-100 rounded-xl"
                                    >
                                        <Text className="text-gray-700 font-bold">Cancel</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        onPress={confirmAddToCart}
                                        className="flex-1 h-12 items-center justify-center bg-blue-600 rounded-xl"
                                    >
                                        <Text className="text-white font-bold">Add to Cart</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    )}
                </View>
            </Modal>
        </KeyboardAvoidingView>
    );
}
