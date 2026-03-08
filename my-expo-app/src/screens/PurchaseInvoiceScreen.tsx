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
                console.log('📦 Loaded vendors:', vendorData.length, vendorData);
                setVendors(vendorData);
            } else {
                console.error('❌ Failed to load vendors:', vendorsRes);
                setVendors([]);
            }

            if (locationsRes.success || locationsRes.ok) {
                setLocations(locationsRes.data || []);
            }
        } catch (error) {
            console.error('Failed to load purchase data:', error);
            Alert.alert('Error', 'Failed to initialize screen');
        } finally {
            setIsLoading(false);
        }
    }, [user?.location_id, selectedLocationId, isAdmin]);

    useEffect(() => {
        loadInitialData();
    }, [loadInitialData]);

    const addToCart = (product: StockItem) => {
        const existingItem = cart.find(item => item.product.id === product.id);
        if (existingItem) {
            updateCartQuantity(product.id, existingItem.quantity + 1);
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

            console.log('AI Extraction Result:', aiResult);

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
        } catch (error) {
            console.error('Scan Error:', error);
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
                navigation.goBack();
            } else {
                Alert.alert('Error', res.message || 'Submission failed');
            }
        } catch (error) {
            console.error('Submit error:', error);
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
                    <TouchableOpacity onPress={handleAIScan}>
                        <Ionicons name="scan-circle" size={32} color="#2563EB" />
                    </TouchableOpacity>
                </View>
            </SafeAreaView>

            <ScrollView className="flex-1 p-4" showsVerticalScrollIndicator={false}>
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
                    <TouchableOpacity
                        onPress={() => setShowItemModal(true)}
                        className="flex-row items-center bg-blue-600 px-4 py-2 rounded-xl"
                    >
                        <Ionicons name="add" size={18} color="white" />
                        <Text className="text-white font-bold ml-1">Add</Text>
                    </TouchableOpacity>
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
                                        keyboardType="numeric"
                                        value={item.unit_price.toString()}
                                        onChangeText={(val) => updateCartPrice(item.product.id, parseFloat(val) || 0)}
                                    />
                                </View>
                                <View className="flex-row items-center bg-gray-100 rounded-xl px-2 py-1">
                                    <TouchableOpacity
                                        onPress={() => updateCartQuantity(item.product.id, item.quantity - 1)}
                                        className="w-10 h-10 items-center justify-center"
                                    >
                                        <Ionicons name="remove" size={22} color="#4B5563" />
                                    </TouchableOpacity>
                                    <Text className="w-10 text-center font-bold text-gray-900 text-lg">{item.quantity}</Text>
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
            <View className="bg-white border-t border-gray-100 p-6 rounded-t-3xl" style={{ shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 10 }}>
                <View className="flex-row justify-between items-center mb-4">
                    <View>
                        <Text className="text-gray-500 text-sm">Grand Total</Text>
                        <Text className="text-2xl font-black text-blue-600">${calculateTotal().toFixed(2)}</Text>
                    </View>
                    <View className="items-end">
                        <Text className="text-gray-400 text-xs">ITEMS: {cart.length}</Text>
                    </View>
                </View>

                <TouchableOpacity
                    onPress={handleSubmit}
                    disabled={isSubmitting}
                    className={`flex-row items-center justify-center h-14 rounded-2xl ${isSubmitting || cart.length === 0 ? 'bg-gray-300' : 'bg-blue-600'}`}
                    style={{ elevation: 4 }}
                >
                    {isSubmitting ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <>
                            <Ionicons name="checkmark-done" size={22} color="white" />
                            <Text className="text-white font-bold text-lg ml-2">Submit Invoice</Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>

            {/* Vendor Selection Modal */}
            <Modal visible={showVendorModal} animationType="slide" transparent>
                <KeyboardAvoidingView 
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    className="flex-1 justify-end" 
                    style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)' }}
                >
                    <View className="bg-white rounded-t-3xl p-6" style={{ maxHeight: '80%' }}>
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
                                placeholder="Search vendors by name, company, or phone..."
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

                        <ScrollView showsVerticalScrollIndicator={false}>
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
                                            <Text className="text-gray-400 text-sm text-center mt-2">Try a different search term</Text>
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
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* Item Picker Modal */}
            <Modal visible={showItemModal} animationType="fade" transparent>
                <View className="flex-1 justify-center p-6" style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)' }}>
                    <View className="bg-white rounded-3xl p-6 h-3/4">
                        <View className="flex-row justify-between items-center mb-4">
                            <Text className="text-xl font-bold text-gray-900">Add Product</Text>
                            <TouchableOpacity onPress={() => setShowItemModal(false)}>
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
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    onPress={() => addToCart(item)}
                                    className="py-3 border-b border-gray-50 flex-row justify-between items-center"
                                >
                                    <View>
                                        <Text className="text-gray-900 font-bold">{item.name}</Text>
                                        <Text className="text-xs text-gray-500">SKU: {item.sku} | Price: ${item.unit_price}</Text>
                                    </View>
                                    <Ionicons name="add-circle" size={28} color="#3B82F6" />
                                </TouchableOpacity>
                            )}
                        />
                    </View>
                </View>
            </Modal>
        </KeyboardAvoidingView>
    );
}
