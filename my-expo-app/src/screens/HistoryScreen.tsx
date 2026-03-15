import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Alert,
  StatusBar,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import apiService from '../services/api.service';
import { Invoice } from '../types';
import { usePrinter } from '../../hooks/usePrinter';

export default function HistoryScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const { printReceiptData } = usePrinter();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const [transactionType, setTransactionType] = useState<'sales' | 'purchase'>('sales');
  const [selectedLocationId, setSelectedLocationId] = useState<number | null>(user?.location_id || null);
  const [locations, setLocations] = useState<any[]>([]);
  const isAdmin = user?.role === 'admin';

  const loadInvoices = useCallback(async () => {
    try {
      setIsLoading(true);
      const invoiceParams: any = {
        invoice_type: transactionType,
        limit: 100,
        offset: 0,
      };

      if (!isAdmin) {
        // Sales users only see their own invoices from their location
        invoiceParams.location_id = user?.location_id;
        invoiceParams.user_id = user?.id;
      } else if (selectedLocationId) {
        invoiceParams.location_id = selectedLocationId;
      }

      const response = await apiService.getInvoices(invoiceParams);

      if (response.ok || response.success) {
        const invoicesData = response.invoices?.data || response.data?.data || response.data || [];
        setInvoices(invoicesData.map((inv: any) => ({
          ...inv,
          total_amount: parseFloat(inv.total_amount) || 0,
          paid_amount: parseFloat(inv.paid_amount) || 0,
        })));
      }
    } catch {
      Alert.alert('Error', 'Could not refresh data');
    } finally {
      setIsLoading(false);
    }
  }, [transactionType, selectedLocationId, user?.location_id, user?.id, isAdmin]);

  const loadLocations = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const resp = await apiService.getLocations();
      if (resp.data) setLocations(resp.data);
    } catch {
      // silently fail
    }
  }, [isAdmin]);

  useEffect(() => {
    loadLocations();
    loadInvoices();
  }, [loadLocations, loadInvoices]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadInvoices();
    setRefreshing(false);
  }, [loadInvoices]);

  const handleConfirmInvoice = async (invoice: Invoice) => {
    Alert.alert(
      'Confirm Invoice',
      `Finalize this ${transactionType} invoice and add items to stock?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              // Call API to finalize invoice
              const res = await apiService.finalizeInvoice(invoice.id, transactionType);
              if (res.ok || res.success) {
                Alert.alert('Success', 'Invoice finalized and stock updated!');
                setSelectedInvoice(null);
                loadInvoices();
              } else {
                Alert.alert('Error', res.message || 'Failed to finalize invoice');
              }
            } catch {
              Alert.alert('Error', 'Failed to finalize invoice');
            }
          },
        },
      ]
    );
  };

  const handleDelete = async (id: number) => {
    Alert.alert('Confirm Delete', 'Are you sure you want to permanently delete this invoice?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const res = await apiService.deleteInvoice(id, transactionType);
            if (res.ok || res.success) {
              setInvoices(invoices.filter(i => i.id !== id));
              setSelectedInvoice(null);
              Alert.alert('Success', 'Invoice deleted.');
            } else {
              Alert.alert('Error', res.message || 'Deletion failed');
            }
          } catch (error) {
            Alert.alert('Error', 'Could not communicate with server');
          }
        }
      }
    ]);
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'paid': return { bg: 'bg-green-100', text: 'text-green-700' };
      case 'partial': return { bg: 'bg-orange-100', text: 'text-orange-700' };
      case 'unpaid': return { bg: 'bg-red-100', text: 'text-red-700' };
      default: return { bg: 'bg-gray-100', text: 'text-gray-700' };
    }
  };

  const formatDate = (dateString: string) => {
    const d = new Date(dateString);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <View className="flex-1 bg-gray-50">
      <StatusBar barStyle="dark-content" />
      <SafeAreaView edges={['top']} className="bg-white px-5 py-4" style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2 }}>
        <View className="flex-row justify-between items-center mb-4">
          <View>
            <Text className="text-2xl font-bold text-gray-900">Invoices</Text>
            <Text className="text-sm text-gray-500 font-medium">
              {isAdmin ? 'Global History' : 'My Sales'} • {invoices.length}
            </Text>
          </View>
          {isAdmin && (
            <TouchableOpacity
              onPress={() => navigation.getParent()?.navigate('PurchaseInvoice')}
              className="flex-row items-center bg-blue-600 px-4 py-3 rounded-2xl"
              style={{ shadowColor: '#93C5FD', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 6 }}
            >
              <Ionicons name="add-circle" size={20} color="white" />
              <Text className="text-white font-bold ml-1.5">New Purchase</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Global Filter Switcher - Only show Purchases tab for admin */}
        {isAdmin ? (
          <View className="flex-row bg-gray-100 p-1 rounded-2xl">
            <TouchableOpacity
              onPress={() => setTransactionType('sales')}
              className={`flex-1 flex-row items-center justify-center py-2.5 rounded-xl ${transactionType === 'sales' ? 'bg-white' : ''}`}
              style={transactionType === 'sales' ? { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 } : {}}
            >
              <Ionicons name="cart" size={18} color={transactionType === 'sales' ? '#2563EB' : '#9CA3AF'} />
              <Text className={`font-bold ml-2 ${transactionType === 'sales' ? 'text-gray-900' : 'text-gray-400'}`}>Sales</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setTransactionType('purchase')}
              className={`flex-1 flex-row items-center justify-center py-2.5 rounded-xl ${transactionType === 'purchase' ? 'bg-white' : ''}`}
              style={transactionType === 'purchase' ? { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 } : {}}
            >
              <Ionicons name="business" size={18} color={transactionType === 'purchase' ? '#2563EB' : '#9CA3AF'} />
              <Text className={`font-bold ml-2 ${transactionType === 'purchase' ? 'text-gray-900' : 'text-gray-400'}`}>Purchases</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </SafeAreaView>

      <FlatList
        data={invoices}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563EB" />}
        renderItem={({ item }) => {
          const statusStyle = getStatusStyle(item.payment_status);
          const isPos = transactionType === 'sales' && !item.customer_id; // Simple heuristic for local demo

          return (
            <TouchableOpacity
              onPress={() => setSelectedInvoice(item)}
              className="bg-white p-5 rounded-3xl mb-4 border border-gray-100 flex-row justify-between"
              style={{ elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10 }}
            >
              <View className="flex-1">
                <View className="flex-row items-center mb-2 flex-wrap">
                  <Text className="text-gray-900 font-extrabold text-base mr-2">{item.invoice_number}</Text>
                  <View className={`px-2 py-0.5 rounded-lg ${statusStyle.bg}`}>
                    <Text className={`text-[10px] font-black uppercase ${statusStyle.text}`}>{item.payment_status}</Text>
                  </View>
                  {item.status && (
                    <View className={`ml-2 px-2 py-0.5 rounded-lg ${item.status === 'draft' ? 'bg-orange-50' : 'bg-green-50'}`}>
                      <Text className={`text-[10px] font-black uppercase ${item.status === 'draft' ? 'text-orange-600' : 'text-green-600'}`}>
                        {item.status === 'draft' ? '📝 DRAFT' : '✓ FINALIZED'}
                      </Text>
                    </View>
                  )}
                  {isPos && (
                    <View className="ml-2 bg-blue-50 px-2 py-0.5 rounded-lg">
                      <Text className="text-[10px] font-black uppercase text-blue-600">POS</Text>
                    </View>
                  )}
                </View>
                <Text className="text-gray-500 font-bold text-xs uppercase tracking-tighter">
                  {transactionType === 'sales' ? (item.customer_name || 'Walk-in Customer') : (item.vendor_name || 'General Vendor')}
                </Text>
                <Text className="text-gray-400 text-[10px] mt-1">{formatDate(item.created_at)}</Text>
              </View>
              <View className="items-end justify-center">
                <Text className="text-gray-900 font-black text-xl">${item.total_amount.toFixed(2)}</Text>
                <Ionicons name="chevron-forward" size={16} color="#D1D5DB" />
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          isLoading ? null : (
            <View className="items-center justify-center mt-20">
              <Ionicons name="receipt-outline" size={80} color="#E5E7EB" />
              <Text className="text-gray-400 font-bold text-lg mt-4">Empty Stack</Text>
              <Text className="text-gray-300 text-sm text-center px-10">No {transactionType} records found. Try refreshing or changing location.</Text>
            </View>
          )
        }
      />

      {/* Invoice Details Modal */}
      <Modal visible={!!selectedInvoice} animationType="fade" transparent onRequestClose={() => setSelectedInvoice(null)}>
        <View className="flex-1 bg-black/60 justify-end">
          <View className="bg-white rounded-t-[40px] p-8" style={{ maxHeight: '85%' }}>
            {selectedInvoice && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View className="flex-row justify-between items-center mb-8">
                  <View>
                    <Text className="text-xs font-black text-blue-500 uppercase tracking-widest mb-1">{transactionType} Details</Text>
                    <Text className="text-3xl font-black text-gray-900">{selectedInvoice.invoice_number}</Text>
                  </View>
                  <TouchableOpacity onPress={() => setSelectedInvoice(null)} className="bg-gray-100 w-12 h-12 rounded-2xl items-center justify-center">
                    <Ionicons name="close" size={24} color="#4B5563" />
                  </TouchableOpacity>
                </View>

                {/* Summary Card */}
                <View className="bg-gray-50 rounded-[32px] p-6 mb-6">
                  <View className="flex-row justify-between items-center border-b border-gray-100 pb-4 mb-4">
                    <View>
                      <Text className="text-[10px] text-gray-400 font-black uppercase mb-1">{transactionType === 'sales' ? 'Customer' : 'Vendor'}</Text>
                      <Text className="text-base font-bold text-gray-900">
                        {transactionType === 'sales' ? (selectedInvoice.customer_name || 'Walk-in') : (selectedInvoice.vendor_name || 'Provider')}
                      </Text>
                    </View>
                    <View className="items-end">
                      <Text className="text-[10px] text-gray-400 font-black uppercase mb-1">Status</Text>
                      <View className={`px-3 py-1 rounded-xl ${getStatusStyle(selectedInvoice.payment_status).bg}`}>
                        <Text className={`text-xs font-black uppercase ${getStatusStyle(selectedInvoice.payment_status).text}`}>
                          {selectedInvoice.payment_status}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View className="flex-row justify-between items-center">
                    <View>
                      <Text className="text-[10px] text-gray-400 font-black uppercase mb-1">Total Paid</Text>
                      <Text className="text-xl font-bold text-gray-900">${selectedInvoice.paid_amount.toFixed(2)}</Text>
                    </View>
                    <View className="items-end">
                      <Text className="text-[10px] text-gray-400 font-black uppercase mb-1">Grand Total</Text>
                      <Text className="text-3xl font-black text-blue-600">${selectedInvoice.total_amount.toFixed(2)}</Text>
                    </View>
                  </View>
                </View>

                {/* Invoice Items List */}
                {selectedInvoice.items && selectedInvoice.items.length > 0 && (
                  <View className="mb-6">
                    <Text className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Items ({selectedInvoice.items.length})</Text>
                    {selectedInvoice.items.map((item, index) => (
                      <View key={index} className="bg-white rounded-2xl p-4 mb-2 border border-gray-100">
                        <View className="flex-row justify-between items-start">
                          <View className="flex-1">
                            <Text className="text-gray-900 font-bold text-base">{(item as any).product?.name_en || (item as any).product?.name_ar || item.product_name || 'Unknown'}</Text>
                            <Text className="text-gray-500 text-xs mt-1">Qty: {item.quantity} × ${item.unit_price.toFixed(2)}</Text>
                          </View>
                          <Text className="text-gray-900 font-black text-lg">${item.total.toFixed(2)}</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                )}

                {/* CRUD Actions */}
                <View className="flex-row gap-4 mb-3">
                  {selectedInvoice.status === 'draft' && (
                    <TouchableOpacity
                      onPress={() => handleConfirmInvoice(selectedInvoice)}
                      className="flex-1 flex-row items-center justify-center bg-green-600 h-14 rounded-2xl"
                      style={{ elevation: 4 }}
                    >
                      <Ionicons name="checkmark-done-circle" size={22} color="white" />
                      <Text className="text-white font-bold ml-2">Confirm & Add to Stock</Text>
                    </TouchableOpacity>
                  )}
                  {selectedInvoice.status !== 'draft' && (
                    <TouchableOpacity
                      onPress={() => {
                        setSelectedInvoice(null);
                        navigation.getParent()?.navigate('CreateCreditNote', { invoiceId: selectedInvoice.id, invoiceType: transactionType });
                      }}
                      className="flex-1 flex-row items-center justify-center bg-orange-50 h-14 rounded-2xl border border-orange-100"
                    >
                      <Ionicons name="return-up-back-outline" size={20} color="#EA580C" />
                      <Text className="text-orange-600 font-bold ml-2">Quick Return</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Print Invoice */}
                <TouchableOpacity
                  onPress={async () => {
                    try {
                      setIsPrinting(true);
                      const printData = {
                        invoiceNumber: selectedInvoice.invoice_number,
                        customerName: selectedInvoice.customer_name || undefined,
                        items: (selectedInvoice.items || []).map((item: any) => ({
                          name: item.product?.name_en || item.product?.name_ar || item.product_name || item.name || 'Item',
                          quantity: item.quantity,
                          unitPrice: parseFloat(item.unit_price) || 0,
                          total: parseFloat(item.total) || 0,
                        })),
                        subtotal: selectedInvoice.total_amount,
                        discount: 0,
                        tax: 0,
                        total: selectedInvoice.total_amount,
                        paidAmount: selectedInvoice.paid_amount,
                        date: new Date(selectedInvoice.created_at).toLocaleString(),
                        cashierName: user?.full_name,
                        storeName: 'DaftarStock',
                      };
                      await printReceiptData(printData);
                    } catch (err: any) {
                      Alert.alert('Print Error', err?.message || 'Failed to print invoice');
                    } finally {
                      setIsPrinting(false);
                    }
                  }}
                  disabled={isPrinting}
                  className={`w-full flex-row items-center justify-center h-14 rounded-2xl mb-3 ${isPrinting ? 'bg-blue-400' : 'bg-blue-600'}`}
                  style={{ elevation: 4 }}
                >
                  {isPrinting ? (
                    <>
                      <ActivityIndicator size="small" color="white" />
                      <Text className="text-white font-bold ml-2">Printing...</Text>
                    </>
                  ) : (
                    <>
                      <Ionicons name="print" size={20} color="white" />
                      <Text className="text-white font-bold ml-2">Print Invoice</Text>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => handleDelete(selectedInvoice.id)}
                  className="w-full flex-row items-center justify-center bg-red-50 h-14 rounded-2xl border border-red-100 mb-6"
                >
                  <Ionicons name="trash-outline" size={20} color="#EF4444" />
                  <Text className="text-red-500 font-bold ml-2">Delete Permanently</Text>
                </TouchableOpacity>

                <TouchableOpacity className="flex-row items-center justify-center bg-blue-50 py-4 rounded-2xl mb-10">
                  <Ionicons name="share-outline" size={20} color="#2563EB" />
                  <Text className="text-blue-600 font-bold ml-2">Share Digital Receipt</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

