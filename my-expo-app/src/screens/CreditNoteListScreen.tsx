import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
    StatusBar,
    Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import apiService from '../services/api.service';
import { CreditNote } from '../types';

export default function CreditNoteListScreen({ navigation }: any) {
    const [creditNotes, setCreditNotes] = useState<CreditNote[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const loadCreditNotes = useCallback(async () => {
        try {
            setIsLoading(true);
            const res = await apiService.getCreditNotes();
            if (res.ok || res.success) {
                setCreditNotes(res.data || []);
            }
        } catch (e) {
            console.error(e);
            Alert.alert('Error', 'Failed to fetch credit notes');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadCreditNotes();
    }, [loadCreditNotes]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await loadCreditNotes();
        setRefreshing(false);
    }, [loadCreditNotes]);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'approved': return 'bg-green-100 text-green-700';
            case 'cancelled': return 'bg-red-100 text-red-700';
            default: return 'bg-yellow-100 text-yellow-700';
        }
    };

    return (
        <View className="flex-1 bg-gray-50">
            <StatusBar barStyle="dark-content" />
            <SafeAreaView edges={['top']} className="bg-white px-5 py-4 border-b border-gray-100" style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2 }}>
                <View className="flex-row items-center">
                    <TouchableOpacity onPress={() => navigation.goBack()} className="mr-4">
                        <Ionicons name="arrow-back" size={24} color="#374151" />
                    </TouchableOpacity>
                    <View>
                        <Text className="text-2xl font-black text-gray-900">Credit Notes</Text>
                        <Text className="text-xs text-gray-500 font-bold uppercase tracking-widest">Returns & Adjustments</Text>
                    </View>
                </View>
            </SafeAreaView>

            <FlatList
                data={creditNotes}
                keyExtractor={item => item.id.toString()}
                contentContainerStyle={{ padding: 16 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563EB" />}
                renderItem={({ item }) => (
                    <TouchableOpacity
                        className="bg-white p-5 rounded-3xl mb-4 border border-gray-100"
                        style={{ elevation: 2 }}
                    >
                        <View className="flex-row justify-between items-start mb-3">
                            <View>
                                <Text className="text-gray-900 font-black text-base">{item.credit_note_number}</Text>
                                <Text className="text-xs text-gray-400 font-medium">REF: {item.invoice_number}</Text>
                            </View>
                            <View className={`px-3 py-1 rounded-full ${getStatusColor(item.status)}`}>
                                <Text className="text-[10px] font-black uppercase">{item.status}</Text>
                            </View>
                        </View>
                        <View className="flex-row justify-between items-center pt-3 border-t border-gray-50">
                            <View>
                                <Text className="text-gray-500 text-[10px] font-bold uppercase">Entity</Text>
                                <Text className="text-gray-900 font-bold">{item.customer_name || item.vendor_name || 'N/A'}</Text>
                            </View>
                            <View className="items-end">
                                <Text className="text-gray-500 text-[10px] font-bold uppercase">Amount</Text>
                                <Text className="text-xl font-black text-red-600">-${(parseFloat(item.total_amount as any) || 0).toFixed(2)}</Text>
                            </View>
                        </View>
                    </TouchableOpacity>
                )}
                ListEmptyComponent={
                    isLoading ? null : (
                        <View className="items-center justify-center mt-20">
                            <Ionicons name="receipt-outline" size={80} color="#E5E7EB" />
                            <Text className="text-gray-400 font-bold mt-4">No Credit Notes</Text>
                        </View>
                    )
                }
            />
        </View>
    );
}
