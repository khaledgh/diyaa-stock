import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    TextInput,
    Alert,
    ActivityIndicator,
    ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import apiService from '../services/api.service';
import { Invoice, InvoiceItem } from '../types';

export default function CreateCreditNoteScreen({ route, navigation }: any) {
    const { invoiceId, invoiceType } = route.params || {};
    const [invoice, setInvoice] = useState<Invoice | null>(null);
    const [returnItems, setReturnItems] = useState<{ [key: number]: number }>({});
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        const loadInvoice = async () => {
            if (!invoiceId) return;
            try {
                const res = await apiService.getInvoiceById(invoiceId, invoiceType);
                if (res.ok || res.success) {
                    setInvoice(res.data);
                    // Initialize return quantities to 0
                    const initialReturns: { [key: number]: number } = {};
                    res.data.items?.forEach((item: InvoiceItem) => {
                        initialReturns[item.product_id] = 0;
                    });
                    setReturnItems(initialReturns);
                }
            } catch (e) {
                Alert.alert('Error', 'Failed to load invoice details');
            } finally {
                setIsLoading(false);
            }
        };
        loadInvoice();
    }, [invoiceId, invoiceType]);

    const updateQuantity = (productId: number, qty: number, max: number) => {
        if (qty < 0 || qty > max) return;
        setReturnItems({ ...returnItems, [productId]: qty });
    };

    const calculateTotal = () => {
        if (!invoice?.items) return 0;
        return invoice.items.reduce((sum, item) => {
            const returnQty = returnItems[item.product_id] || 0;
            return sum + (returnQty * item.unit_price);
        }, 0);
    };

    const handleSubmit = async () => {
        const total = calculateTotal();
        if (total <= 0) return Alert.alert('Error', 'Please select items to return');

        try {
            setIsSubmitting(true);
            const data = {
                invoice_id: invoiceId,
                items: Object.entries(returnItems)
                    .filter(([_, qty]) => qty > 0)
                    .map(([pid, qty]) => ({
                        product_id: parseInt(pid),
                        quantity: qty,
                    })),
                total_amount: total,
            };

            const res = await apiService.createCreditNote(data);
            if (res.ok || res.success) {
                Alert.alert('Success', 'Credit note created successfully');
                navigation.navigate('CreditNoteList');
            } else {
                Alert.alert('Error', res.message || 'Failed to create credit note');
            }
        } catch (e) {
            Alert.alert('Error', 'Communication error');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) return <View className="flex-1 justify-center bg-white"><ActivityIndicator size="large" color="#3B82F6" /></View>;
    if (!invoice) return <View className="flex-1 justify-center items-center"><Text>Invoice not found</Text></View>;

    return (
        <View className="flex-1 bg-gray-50">
            <SafeAreaView edges={['top']} className="bg-white px-5 py-4 border-b border-gray-100">
                <View className="flex-row items-center">
                    <TouchableOpacity onPress={() => navigation.goBack()} className="mr-4">
                        <Ionicons name="arrow-back" size={24} color="#374151" />
                    </TouchableOpacity>
                    <View>
                        <Text className="text-xl font-black text-gray-900">Create Credit Note</Text>
                        <Text className="text-xs text-gray-500 font-bold uppercase tracking-tight">Invoice: {invoice.invoice_number}</Text>
                    </View>
                </View>
            </SafeAreaView>

            <ScrollView className="flex-1 p-4" showsVerticalScrollIndicator={false}>
                <Text className="text-gray-500 font-bold text-xs uppercase mb-3 ml-1">Select Items to Return</Text>

                {invoice.items?.map((item: InvoiceItem) => (
                    <View key={item.product_id} className="bg-white rounded-2xl p-4 mb-3 border border-gray-100" style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 }}>
                        <View className="flex-row justify-between mb-2">
                            <View className="flex-1">
                                <Text className="font-bold text-gray-900">{(item as any).product?.name_en || (item as any).product?.name_ar || item.product_name || 'Unknown Product'}</Text>
                                <Text className="text-xs text-gray-500">Purchased: {item.quantity} | Price: ${item.unit_price}</Text>
                            </View>
                            <Text className="font-black text-blue-600">${(item.unit_price * (returnItems[item.product_id] || 0)).toFixed(2)}</Text>
                        </View>

                        <View className="flex-row items-center bg-gray-50 rounded-xl p-1 self-start">
                            <TouchableOpacity
                                onPress={() => updateQuantity(item.product_id, (returnItems[item.product_id] || 0) - 1, item.quantity)}
                                className="w-10 h-10 items-center justify-center bg-white rounded-lg"
                                style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 }}
                            >
                                <Ionicons name="remove" size={20} color="#374151" />
                            </TouchableOpacity>
                            <Text className="w-12 text-center font-bold text-gray-900">{returnItems[item.product_id] || 0}</Text>
                            <TouchableOpacity
                                onPress={() => updateQuantity(item.product_id, (returnItems[item.product_id] || 0) + 1, item.quantity)}
                                className="w-10 h-10 items-center justify-center bg-white rounded-lg"
                                style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 }}
                            >
                                <Ionicons name="add" size={20} color="#374151" />
                            </TouchableOpacity>
                        </View>
                    </View>
                ))}
            </ScrollView>

            <SafeAreaView edges={['bottom']} className="bg-white rounded-t-3xl" style={{ shadowColor: '#000', shadowOffset: { width: 0, height: -6 }, shadowOpacity: 0.2, shadowRadius: 16, elevation: 16 }}>
                <View className="p-6">
                    <View className="flex-row justify-between items-center mb-6">
                        <Text className="text-gray-500 font-medium">Refund Amount</Text>
                        <Text className="text-3xl font-black text-red-600">${calculateTotal().toFixed(2)}</Text>
                    </View>

                    <TouchableOpacity
                        onPress={handleSubmit}
                        disabled={isSubmitting || calculateTotal() <= 0}
                        className={`h-14 rounded-2xl flex-row items-center justify-center ${isSubmitting || calculateTotal() <= 0 ? 'bg-gray-200' : 'bg-red-600'}`}
                    >
                        {isSubmitting ? <ActivityIndicator color="white" /> : (
                            <>
                                <Ionicons name="checkmark-circle" size={22} color="white" />
                                <Text className="text-white font-bold text-lg ml-2">Confirm Return</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        </View>
    );
}
