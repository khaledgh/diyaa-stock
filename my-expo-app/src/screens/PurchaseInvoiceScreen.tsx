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
    useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import apiService from '../services/api.service';
import { StockItem, Vendor, CartItem } from '../types';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';

// Parse decimal input (comma or dot)
const parseDecimal = (text: string): number => {
    const normalized = text.replace(',', '.');
    return parseFloat(normalized) || 0;
};

export default function PurchaseInvoiceScreen({ navigation }: any) {
    console.log('--- PurchaseInvoiceScreen: Rendering ---');
    const { user } = useAuth();
    const { t } = useTranslation();
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
    const [selectedLocationId, setSelectedLocationId] = useState<number | null>(null);
    const [locations, setLocations] = useState<any[]>([]);
    const [showLocationModal, setShowLocationModal] = useState(false);
    const [todaySession, setTodaySession] = useState<any>(null);
    const [locationMode, setLocationMode] = useState<'automatic' | 'manual'>('automatic');
    const [selectedProduct, setSelectedProduct] = useState<StockItem | null>(null);
    const [tempQty, setTempQty] = useState('1');
    const [tempPrice, setTempPrice] = useState('');
    const [quantityTextMap, setQuantityTextMap] = useState<Record<number, string>>({});
    const [vendorSearchResults, setVendorSearchResults] = useState<Vendor[]>([]);
    const [isSearchingVendors, setIsSearchingVendors] = useState(false);
    const vendorSearchTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
    const isAdmin = user?.role === 'admin';
    const { height } = useWindowDimensions();

    const searchVendorsFromServer = useCallback(async (query: string) => {
        if (!query.trim()) {
            setVendorSearchResults([]);
            setIsSearchingVendors(false);
            return;
        }
        setIsSearchingVendors(true);
        try {
            const response = await apiService.getVendors({ search: query });
            const data = response.data || [];
            setVendorSearchResults(Array.isArray(data) ? data : []);
        } catch {
            // silently fail
        } finally {
            setIsSearchingVendors(false);
        }
    }, []);

    const handleVendorSearch = (text: string) => {
        setVendorSearchQuery(text);
        if (vendorSearchTimeoutRef.current) clearTimeout(vendorSearchTimeoutRef.current);
        vendorSearchTimeoutRef.current = setTimeout(() => {
            searchVendorsFromServer(text);
        }, 400);
    };

    const loadInitialData = useCallback(async () => {
        console.log('--- PurchaseInvoiceScreen: loadInitialData START ---');
        setIsLoading(true);
        try {
            const locationId = selectedLocationId || user?.location_id;
            const [productsRes, vendorsRes, locationsRes] = await Promise.all([
                apiService.getProducts().catch((err: any) => {
                    console.error('PurchaseInvoice - getProducts error:', err);
                    return { data: [] };
                }),
                apiService.getVendors().catch(() => ({ data: [] })),
                apiService.getLocations().catch(() => ({ data: [] })),
            ]);

            let plist: any[] = [];
            if (Array.isArray(productsRes)) {
                plist = productsRes;
            } else if (productsRes && Array.isArray(productsRes.data)) {
                plist = productsRes.data;
            } else if (productsRes && productsRes.ok && Array.isArray(productsRes.data)) {
                plist = productsRes.data;
            }

            console.log('PurchaseInvoice loaded data:', {
                productsRaw: productsRes ? Object.keys(productsRes) : 'null',
                productsCount: plist.length,
                vendorsCount: vendorsRes?.data?.length || (Array.isArray(vendorsRes) ? vendorsRes.length : 0),
                locationsCount: locationsRes?.data?.length || (Array.isArray(locationsRes) ? locationsRes.length : 0),
            });

            if (plist.length > 0) {
                setStockItems(plist.map((item: any) => ({
                    id: item.id,
                    name: item.name_en || item.name_ar || 'Unknown',
                    sku: item.sku,
                    unit_price: parseFloat(item.cost_price || item.unit_price) || 0,
                    quantity: 0, 
                })));
            } else {
                setStockItems([]);
            }

            // Vendor API returns paginated format: {data: [], current_page, total}
            if (vendorsRes.data && Array.isArray(vendorsRes.data)) {
                const vendorData = vendorsRes.data;
                setVendors(vendorData);
            } else {
                setVendors([]);
            }

            const availableLocations = locationsRes?.data || (Array.isArray(locationsRes) ? locationsRes : []);
            if (availableLocations.length > 0) {
                setLocations(availableLocations);
            } else {
                // Fallback for non-admins
                const userId = user?.id;
                if (userId) {
                    const userLocsRes = await apiService.getUserLocations(userId).catch(() => ({ data: [] }));
                    setLocations(userLocsRes.data || []);
                }
            }
        } catch {
            // silently fail
            Alert.alert('Error', 'Failed to initialize screen');
        } finally {
            setIsLoading(false);
        }
    }, [user?.location_id, user?.id, selectedLocationId, isAdmin]);

    useEffect(() => {
        console.log('--- PurchaseInvoiceScreen: useEffect [loadInitialData] ---');
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
        if (!selectedVendor) {
            Alert.alert('Vendor Required', 'Please select a vendor before adding products.', [
                { text: 'Select Vendor', onPress: () => setShowVendorModal(true) },
                { text: 'Cancel', style: 'cancel' }
            ]);
            return;
        }
        openProductSubModal(product);
    };

    const updateCartQuantity = (productId: number, quantity: number) => {
        if (quantity <= 0) {
            setCart(cart.filter(item => item.product.id !== productId));
            // Also clear the text map entry
            setQuantityTextMap(prev => { const n = { ...prev }; delete n[productId]; return n; });
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
        if (!selectedLocationId) return Alert.alert('Error', 'Please select a location');
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
                Alert.alert(t('common.error'), res.message || t('history.submissionFailed'));
            }
        } catch {
            // silently fail
            Alert.alert(t('common.error'), t('history.submissionFailed'));
        } finally {
            setIsSubmitting(false);
        }
    };

    const loadSessionInfo = useCallback(async () => {
        if (isAdmin) return;
        try {
            const [modeResp, sessionResp] = await Promise.all([
                apiService.getLocationMode(),
                apiService.getTodaySession(),
            ]);
            setLocationMode(modeResp.mode || 'automatic');
            setTodaySession(sessionResp.data || null);
            if (sessionResp.data?.location_id) {
                setSelectedLocationId(sessionResp.data.location_id);
            }
        } catch { /* fail silently */ }
    }, [isAdmin]);

    useEffect(() => {
        loadSessionInfo();
    }, [loadSessionInfo]);

    if (isLoading) {
        return (
            <View className="flex-1 justify-center items-center bg-white">
                <ActivityIndicator size="large" color="#4F46E5" />
            </View>
        );
    }

    if (!isAdmin && !todaySession && locationMode === 'manual') {
        return (
            <View className="flex-1 bg-gray-50 items-center justify-center p-10">
                <View className="w-20 h-20 bg-orange-100 rounded-full items-center justify-center mb-6">
                    <Ionicons name="lock-closed" size={40} color="#F97316" />
                </View>
                <Text className="text-xl font-bold text-gray-900 text-center">{t('purchase.locationNotAssigned')}</Text>
                <Text className="text-gray-500 text-center mt-3 leading-6">
                    {t('purchase.locationNotAssignedDesc')}
                </Text>
                <TouchableOpacity onPress={loadSessionInfo} className="mt-8 bg-white border border-gray-200 px-6 py-3 rounded-full">
                    <Text className="text-gray-600 font-bold">{t('purchase.checkAgain')}</Text>
                </TouchableOpacity>
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
                    <Text className="text-xl font-bold text-gray-900">{t('purchase.newPurchase')}</Text>
                    <View style={{ width: 32 }} />
                </View>
            </SafeAreaView>

            <ScrollView 
                className="flex-1 p-4" 
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 100 }}
            >
                {/* Vendor Section (Step 1) */}
                <View className="mb-4">
                    <TouchableOpacity
                        onPress={() => setShowVendorModal(true)}
                        className={`flex-row items-center justify-between rounded-[25px] px-6 py-5 border-2 ${selectedVendor ? 'border-emerald-500 bg-emerald-50' : 'border-indigo-600 bg-indigo-50 shadow-lg shadow-indigo-100'}`}
                        activeOpacity={0.8}>
                        <View className="flex-1 flex-row items-center">
                            <View className={`w-12 h-12 rounded-2xl items-center justify-center mr-4 ${selectedVendor ? 'bg-emerald-100' : 'bg-indigo-600'}`}>
                                <Ionicons name="business" size={24} color={selectedVendor ? '#10B981' : '#FFFFFF'} />
                            </View>
                            <View>
                                <Text className={`text-[10px] font-black uppercase tracking-[1px] ${selectedVendor ? 'text-emerald-600' : 'text-indigo-600'}`}>
                                    {selectedVendor ? t('purchase.selectedVendor') : t('purchase.step1')}
                                </Text>
                                <Text className="text-lg font-black text-slate-900 tracking-tight">
                                    {selectedVendor ? selectedVendor.name : t('purchase.chooseVendor')}
                                </Text>
                            </View>
                        </View>
                        <View className={`w-10 h-10 rounded-full items-center justify-center ${selectedVendor ? 'bg-emerald-100' : 'bg-indigo-100'}`}>
                            <Ionicons name={selectedVendor ? "checkmark-circle" : "chevron-forward"} size={22} color={selectedVendor ? '#10B981' : '#4F46E5'} />
                        </View>
                    </TouchableOpacity>
                </View>

                {/* Location Section (Step 2) */}
                <View className="mb-4">
                    <TouchableOpacity
                        onPress={() => setShowLocationModal(true)}
                        className={`flex-row items-center justify-between rounded-[25px] px-6 py-5 border-2 ${selectedLocationId ? 'border-blue-500 bg-blue-50' : 'border-indigo-600 bg-indigo-50 shadow-lg shadow-indigo-100'}`}
                        activeOpacity={0.8}>
                        <View className="flex-1 flex-row items-center">
                            <View className={`w-12 h-12 rounded-2xl items-center justify-center mr-4 ${selectedLocationId ? 'bg-blue-100' : 'bg-indigo-600'}`}>
                                <Ionicons name="location" size={24} color={selectedLocationId ? '#3B82F6' : '#FFFFFF'} />
                            </View>
                            <View>
                                <Text className={`text-[10px] font-black uppercase tracking-[1px] ${selectedLocationId ? 'text-blue-600' : 'text-indigo-600'}`}>
                                    {selectedLocationId ? t('purchase.selectedLocation') : t('purchase.step2')}
                                </Text>
                                <Text className="text-lg font-black text-slate-900 tracking-tight">
                                    {locations.find(l => l.id === selectedLocationId)?.name || t('purchase.chooseLocation')}
                                </Text>
                            </View>
                        </View>
                        <View className={`w-10 h-10 rounded-full items-center justify-center ${selectedLocationId ? 'bg-blue-100' : 'bg-indigo-100'}`}>
                            <Ionicons name={selectedLocationId ? "checkmark-circle" : "chevron-forward"} size={22} color={selectedLocationId ? '#3B82F6' : '#4F46E5'} />
                        </View>
                    </TouchableOpacity>
                </View>

                {/* Items Section Header */}
                <View className="flex-row items-center justify-between mb-3 px-1">
                    <Text className="text-lg font-bold text-gray-900">{t('purchase.items')}</Text>
                    <View className="flex-row items-center gap-2">
                        {cart.length > 0 && (
                            <TouchableOpacity
                                onPress={() => Alert.alert(t('purchase.clearAll'), t('purchase.clearAllConfirm'), [
                                    { text: t('common.cancel'), style: 'cancel' },
                                    { text: t('purchase.clearAll'), style: 'destructive', onPress: () => setCart([]) },
                                ])}
                                className="flex-row items-center bg-red-50 border border-red-200 px-3 py-2 rounded-xl"
                            >
                                <Ionicons name="trash-outline" size={16} color="#EF4444" />
                                <Text className="text-red-500 font-bold ml-1">{t('common.delete')}</Text>
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity
                            onPress={() => {
                                if (!selectedVendor) {
                                    Alert.alert(t('purchase.vendorRequired'), t('purchase.vendorRequiredDesc'), [
                                        { text: t('purchase.chooseVendor'), onPress: () => setShowVendorModal(true) },
                                        { text: t('common.cancel'), style: 'cancel' }
                                    ]);
                                    return;
                                }
                                setShowItemModal(true);
                            }}
                            className="flex-row items-center bg-blue-600 px-4 py-2 rounded-xl"
                        >
                            <Ionicons name="add" size={18} color="white" />
                            <Text className="text-white font-bold ml-1">{t('common.add')}</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Cart/Items List */}
                {cart.length === 0 ? (
                    <View className="bg-white rounded-3xl p-10 items-center border border-dashed border-gray-300">
                        <Ionicons name="cart-outline" size={48} color="#D1D5DB" />
                        <Text className="text-gray-400 mt-4 text-center">{t('purchase.noItems')}</Text>
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
                                    <Text className="text-xs text-gray-400 mb-1">{t('purchase.unitPrice').toUpperCase()}</Text>
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
                                        onPress={() => {
                                            // Clear text map so input reverts to numeric value
                                            setQuantityTextMap(prev => { const n = { ...prev }; delete n[item.product.id]; return n; });
                                            updateCartQuantity(item.product.id, item.quantity - 1);
                                        }}
                                        className="w-10 h-10 items-center justify-center"
                                    >
                                        <Ionicons name="remove" size={22} color="#4B5563" />
                                    </TouchableOpacity>
                                    <TextInput
                                        className="w-16 text-center font-bold text-gray-900 text-lg p-0"
                                        keyboardType="decimal-pad"
                                        value={quantityTextMap[item.product.id] !== undefined
                                            ? quantityTextMap[item.product.id]
                                            : item.quantity.toString()}
                                        onChangeText={(val) => {
                                            // Always update the text map so intermediate values like "1." are preserved
                                            setQuantityTextMap(prev => ({ ...prev, [item.product.id]: val }));
                                            // Only parse and update cart when it's a complete valid number
                                            const normalized = val.replace(',', '.');
                                            if (!normalized.endsWith('.') && normalized !== '') {
                                                const parsed = parseFloat(normalized);
                                                if (!isNaN(parsed) && parsed > 0) {
                                                    updateCartQuantity(item.product.id, parsed);
                                                }
                                            }
                                        }}
                                        onBlur={() => {
                                            // On blur, commit whatever value is in the text map
                                            const raw = quantityTextMap[item.product.id];
                                            if (raw !== undefined) {
                                                const parsed = parseFloat(raw.replace(',', '.'));
                                                if (!isNaN(parsed) && parsed > 0) {
                                                    updateCartQuantity(item.product.id, parsed);
                                                }
                                                // Clear the map entry so it reverts to the committed value
                                                setQuantityTextMap(prev => { const n = { ...prev }; delete n[item.product.id]; return n; });
                                            }
                                        }}
                                        selectTextOnFocus
                                    />
                                    <TouchableOpacity
                                        onPress={() => {
                                            setQuantityTextMap(prev => { const n = { ...prev }; delete n[item.product.id]; return n; });
                                            updateCartQuantity(item.product.id, item.quantity + 1);
                                        }}
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
                        <Text className="text-gray-400 text-xs">{t('pos.total').toUpperCase()} ({cart.length} {t('purchase.items').toLowerCase()})</Text>
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
                                <Text className="text-white font-bold text-base ml-2">{t('purchase.submit')}</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            </View>

            {/* Vendor Selection Modal — bottom drawer */}
            <Modal visible={showVendorModal} animationType="slide" transparent onRequestClose={() => setShowVendorModal(false)}>
                <TouchableOpacity activeOpacity={1} onPress={() => setShowVendorModal(false)} className="flex-1" style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)' }} />
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={{ backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: height * 0.8 }}
                >
                    <SafeAreaView edges={['bottom']}>
                        <View className="p-6">
                            {/* Drag handle */}
                            <View className="items-center mb-4">
                                <View className="w-10 h-1 bg-gray-300 rounded-full" />
                            </View>
                            <View className="flex-row justify-between items-center mb-4">
                                <Text className="text-xl font-bold text-gray-900">{t('purchase.chooseVendor')}</Text>
                                <TouchableOpacity onPress={() => setShowVendorModal(false)}>
                                    <Ionicons name="close" size={24} color="#9CA3AF" />
                                </TouchableOpacity>
                            </View>

                            {/* Search Input */}
                            <View className="bg-gray-100 rounded-xl px-4 py-2 flex-row items-center mb-4">
                                <Ionicons name="search" size={20} color="#9CA3AF" />
                                <TextInput
                                    placeholder={t('purchase.searchVendors')}
                                    className="flex-1 ml-2 text-gray-900"
                                    value={vendorSearchQuery}
                                    onChangeText={handleVendorSearch}
                                />
                                {isSearchingVendors && <ActivityIndicator size="small" color="#4F46E5" />}
                                {vendorSearchQuery.length > 0 && !isSearchingVendors && (
                                    <TouchableOpacity onPress={() => { setVendorSearchQuery(''); setVendorSearchResults([]); }}>
                                        <Ionicons name="close-circle" size={20} color="#9CA3AF" />
                                    </TouchableOpacity>
                                )}
                            </View>
                        </View>

                        <ScrollView 
                            showsVerticalScrollIndicator={false} 
                            className="px-6" 
                            style={{ maxHeight: height * 0.5 }}
                            keyboardShouldPersistTaps="handled"
                        >
                            {(() => {
                                const displayedVendors = vendorSearchQuery.trim()
                                    ? vendorSearchResults
                                    : vendors;

                                if (vendors.length === 0 && !vendorSearchQuery) {
                                    return (
                                        <View className="py-10 items-center">
                                            <Ionicons name="business-outline" size={48} color="#D1D5DB" />
                                            <Text className="text-gray-400 mt-4 text-center">{t('purchase.noVendors')}</Text>
                                            <Text className="text-gray-400 text-sm text-center mt-2">{t('purchase.addVendorsFirst')}</Text>
                                        </View>
                                    );
                                }

                                if (displayedVendors.length === 0) {
                                    return (
                                        <View className="py-10 items-center">
                                            <Ionicons name="search-outline" size={48} color="#D1D5DB" />
                                            <Text className="text-gray-400 mt-4 text-center">{t('purchase.noVendorsFound')}</Text>
                                        </View>
                                    );
                                }

                                return displayedVendors.map(v => (
                                    <TouchableOpacity
                                        key={v.id}
                                        onPress={() => { 
                                            setSelectedVendor(v); 
                                            setShowVendorModal(false);
                                            setVendorSearchQuery('');
                                            setVendorSearchResults([]);
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
                            <Text className="text-xl font-bold text-gray-900">{t('purchase.addProduct')}</Text>
                            <TouchableOpacity onPress={() => { setSelectedProduct(null); setShowItemModal(false); }}>
                                <Ionicons name="close" size={24} color="#9CA3AF" />
                            </TouchableOpacity>
                        </View>

                        <View className="bg-gray-100 rounded-xl px-4 py-2 flex-row items-center mb-4">
                            <Ionicons name="search" size={20} color="#9CA3AF" />
                            <TextInput
                                placeholder={t('purchase.searchProducts')}
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
                                    <Text className="text-xs text-gray-400 font-bold mb-1">{t('purchase.quantity').toUpperCase()}</Text>
                                    <View className="flex-row items-center">
                                        <TouchableOpacity
                                            onPress={() => {
                                                const current = parseDecimal(tempQty);
                                                setTempQty((Math.max(0, current - 1)).toString().replace('.', ','));
                                            }}
                                            className="w-14 h-14 items-center justify-center bg-gray-100 rounded-2xl"
                                        >
                                            <Ionicons name="remove" size={28} color="#374151" />
                                        </TouchableOpacity>
                                        <TextInput
                                            className="flex-1 text-center text-3xl font-black text-gray-900 mx-3 border-2 border-indigo-100 rounded-2xl py-3 focus:border-indigo-500"
                                            keyboardType="decimal-pad"
                                            value={tempQty}
                                            onChangeText={(val) => setTempQty(val)}
                                            selectTextOnFocus
                                        />
                                        <TouchableOpacity
                                            onPress={() => {
                                                const current = parseDecimal(tempQty);
                                                setTempQty((current + 1).toString().replace('.', ','));
                                            }}
                                            className="w-14 h-14 items-center justify-center bg-indigo-600 rounded-2xl"
                                        >
                                            <Ionicons name="add" size={28} color="#FFF" />
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                <View className="mb-5">
                                    <Text className="text-xs text-gray-400 font-bold mb-1">{t('purchase.unitPrice').toUpperCase()} ($)</Text>
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
                                        <Text className="text-gray-700 font-bold">{t('common.cancel')}</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        onPress={confirmAddToCart}
                                        className="flex-1 h-12 items-center justify-center bg-blue-600 rounded-xl"
                                    >
                                        <Text className="text-white font-bold">{t('purchase.addToCart')}</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    )}
                </View>
            </Modal>

            {/* Location Selection Modal */}
            <Modal visible={showLocationModal} animationType="slide" transparent onRequestClose={() => setShowLocationModal(false)}>
                <TouchableOpacity activeOpacity={1} onPress={() => setShowLocationModal(false)} className="flex-1" style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)' }} />
                <View style={{ backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '50%' }}>
                    <SafeAreaView edges={['bottom']}>
                        <View className="p-6">
                            <View className="flex-row justify-between items-center mb-4">
                                <Text className="text-xl font-bold text-gray-900">{t('purchase.selectStorage')}</Text>
                                <TouchableOpacity onPress={() => setShowLocationModal(false)}>
                                    <Ionicons name="close" size={24} color="#9CA3AF" />
                                </TouchableOpacity>
                            </View>
                            <ScrollView>
                                {locations.map(loc => (
                                    <TouchableOpacity
                                        key={loc.id}
                                        onPress={() => {
                                            setSelectedLocationId(loc.id);
                                            setShowLocationModal(false);
                                        }}
                                        className="py-4 border-b border-gray-100 flex-row items-center justify-between"
                                    >
                                        <View>
                                            <Text className="text-gray-900 font-bold text-base">{loc.name}</Text>
                                            <Text className="text-gray-500 text-sm">{loc.type}</Text>
                                        </View>
                                        {selectedLocationId === loc.id && (
                                            <Ionicons name="checkmark-circle" size={24} color="#2563EB" />
                                        )}
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>
                    </SafeAreaView>
                </View>
            </Modal>
        </KeyboardAvoidingView>
    );
}
