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
import { generateInvoicePDF } from '../utils/PDFInvoiceGenerator';
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
  const [invoiceReturns, setInvoiceReturns] = useState<any[]>([]);
  const [showReturns, setShowReturns] = useState(false);
  const [loadingReturns, setLoadingReturns] = useState(false);
  const [selectedLocationId, setSelectedLocationId] = useState<number | null>(null);
  const [locations, setLocations] = useState<any[]>([]);
  const isAdmin = user?.role === 'admin';

  // Initialize selectedLocationId for non-admins
  useEffect(() => {
    if (!isAdmin && user?.location_id) {
      setSelectedLocationId(user.location_id);
    }
  }, [isAdmin, user?.location_id]);

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

  const loadInvoiceReturns = useCallback(async (invoiceId: number) => {
    setLoadingReturns(true);
    try {
      const res = await apiService.getInvoiceReturns(invoiceId);
      if (res.ok || res.success) {
        setInvoiceReturns(res.data || []);
      } else {
        setInvoiceReturns([]);
      }
    } catch {
      setInvoiceReturns([]);
    } finally {
      setLoadingReturns(false);
    }
  }, []);

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

        {/* Admin Location Filter */}
        {isAdmin && locations.length > 0 && (
          <View className="mb-4">
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-1">
              <TouchableOpacity
                onPress={() => setSelectedLocationId(null)}
                className={`px-4 py-2 rounded-full mr-2 border ${selectedLocationId === null ? 'bg-blue-600 border-blue-600' : 'bg-gray-100 border-gray-200'}`}
              >
                <Text className={`text-xs font-bold ${selectedLocationId === null ? 'text-white' : 'text-gray-600'}`}>
                  All Locations
                </Text>
              </TouchableOpacity>
              {locations.map((loc: any) => (
                <TouchableOpacity
                  key={loc.id}
                  onPress={() => setSelectedLocationId(loc.id)}
                  className={`px-4 py-2 rounded-full mr-2 border ${selectedLocationId === loc.id ? 'bg-blue-600 border-blue-600' : 'bg-gray-100 border-gray-200'}`}
                >
                  <Text className={`text-xs font-bold ${selectedLocationId === loc.id ? 'text-white' : 'text-gray-600'}`}>
                    {loc.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

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
              onPress={() => item && setSelectedInvoice(item)}
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
                  {transactionType === 'sales' ? (item.customer?.name || item.customer_name || 'Walk-in Customer') : (item.vendor?.name || item.vendor_name || 'General Vendor')}
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
                        {transactionType === 'sales' ? (selectedInvoice.customer?.name || selectedInvoice.customer_name || 'Walk-in') : (selectedInvoice.vendor?.name || selectedInvoice.vendor_name || 'Provider')}
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

                  <View className="flex-row justify-between items-center mb-4">
                    <View>
                      <Text className="text-[10px] text-gray-400 font-black uppercase mb-1">Subtotal</Text>
                      <Text className="text-xl font-bold text-gray-600">
                        ${(selectedInvoice.subtotal && selectedInvoice.subtotal > 0 
                          ? selectedInvoice.subtotal 
                          : (selectedInvoice.items?.reduce((acc, item) => acc + (item.quantity * item.unit_price), 0) || selectedInvoice.total_amount)
                        ).toFixed(2)}
                      </Text>
                    </View>
                    <View className="items-end">
                      <Text className="text-[10px] text-gray-400 font-black uppercase mb-1">Discount</Text>
                      <Text className="text-xl font-bold text-red-500">
                        -${(selectedInvoice.discount_amount && selectedInvoice.discount_amount > 0
                          ? selectedInvoice.discount_amount
                          : ((selectedInvoice.items?.reduce((acc, item) => acc + (item.quantity * item.unit_price), 0) || 0) - selectedInvoice.total_amount)
                        ).toFixed(2)}
                      </Text>
                    </View>
                  </View>

                  <View className="flex-row justify-between items-center">
                    <View>
                      <Text className="text-[10px] text-gray-400 font-black uppercase mb-1">Total Paid</Text>
                      <Text className="text-xl font-bold text-emerald-600">${selectedInvoice.paid_amount.toFixed(2)}</Text>
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
                            <View className="flex-row items-center mt-1">
                              <Text className="text-gray-500 text-xs">Qty: {item.quantity} × ${item.unit_price.toFixed(2)}</Text>
                              {item.discount_percent > 0 && (
                                <View className="ml-2 bg-red-50 px-1.5 py-0.5 rounded-md border border-red-100">
                                  <Text className="text-[9px] font-bold text-red-500">-{item.discount_percent}%</Text>
                                </View>
                              )}
                              {/* Fallback for manual discounts */}
                              {item.discount_percent <= 0 && (item.quantity * item.unit_price - item.total) > 0.01 && (
                                <View className="ml-2 bg-red-50 px-1.5 py-0.5 rounded-md border border-red-100">
                                  <Text className="text-[9px] font-bold text-red-500">
                                    -{(((item.quantity * item.unit_price - item.total) / (item.quantity * item.unit_price)) * 100).toFixed(0)}%
                                  </Text>
                                </View>
                              )}
                            </View>
                          </View>
                          <View className="items-end">
                            <Text className="text-gray-900 font-black text-lg">${item.total.toFixed(2)}</Text>
                            {(item.quantity * item.unit_price - item.total) > 0.01 && (
                              <Text className="text-[10px] font-bold text-red-500 mt-0.5">
                                -${(item.quantity * item.unit_price - item.total).toFixed(2)}
                              </Text>
                            )}
                          </View>
                        </View>
                      </View>
                    ))}
                  </View>
                )}

                {/* Return History Section */}
                {selectedInvoice.status === 'finalized' && (
                  <View className="mb-6">
                    <TouchableOpacity
                      onPress={() => {
                        if (!showReturns) {
                          loadInvoiceReturns(selectedInvoice.id);
                        }
                        setShowReturns(!showReturns);
                      }}
                      className="flex-row items-center justify-between mb-3">
                      <View className="flex-row items-center">
                        <Ionicons name="return-up-back" size={18} color="#F97316" />
                        <Text className="text-xs font-black text-gray-400 uppercase tracking-widest ml-2">
                          Returns & Credit Notes
                        </Text>
                      </View>
                      <View className="flex-row items-center">
                        {invoiceReturns.length > 0 && (
                          <View className="bg-orange-100 px-2 py-0.5 rounded-full mr-2">
                            <Text className="text-[10px] font-black text-orange-600">{invoiceReturns.length}</Text>
                          </View>
                        )}
                        <Ionicons name={showReturns ? "chevron-up" : "chevron-down"} size={20} color="#9CA3AF" />
                      </View>
                    </TouchableOpacity>

                    {showReturns && (
                      <View>
                        {loadingReturns ? (
                          <View className="py-8 items-center">
                            <ActivityIndicator size="small" color="#2563EB" />
                            <Text className="text-gray-400 text-xs mt-2">Loading returns...</Text>
                          </View>
                        ) : invoiceReturns.length === 0 ? (
                          <View className="bg-gray-50 rounded-2xl p-6 items-center">
                            <Ionicons name="checkmark-circle-outline" size={32} color="#10B981" />
                            <Text className="text-gray-500 text-sm mt-2">No returns for this invoice</Text>
                          </View>
                        ) : (
                          invoiceReturns.map((creditNote: any, idx: number) => (
                            <View key={idx} className="bg-orange-50 rounded-2xl p-4 mb-2 border border-orange-100">
                              <View className="flex-row justify-between items-start mb-2">
                                <View className="flex-1">
                                  <Text className="text-orange-900 font-bold text-sm">{creditNote.credit_note_number}</Text>
                                  <Text className="text-orange-600 text-xs mt-0.5">
                                    {new Date(creditNote.created_at).toLocaleDateString('en-GB', { 
                                      day: '2-digit', 
                                      month: 'short', 
                                      year: 'numeric' 
                                    })}
                                  </Text>
                                </View>
                                <View className="items-end">
                                  <Text className="text-orange-900 font-black text-lg">-${parseFloat(creditNote.total_amount || 0).toFixed(2)}</Text>
                                  <View className={`px-2 py-0.5 rounded-full mt-1 ${
                                    creditNote.status === 'approved' ? 'bg-green-100' : 
                                    creditNote.status === 'cancelled' ? 'bg-red-100' : 'bg-yellow-100'
                                  }`}>
                                    <Text className={`text-[9px] font-black uppercase ${
                                      creditNote.status === 'approved' ? 'text-green-700' : 
                                      creditNote.status === 'cancelled' ? 'text-red-700' : 'text-yellow-700'
                                    }`}>
                                      {creditNote.status}
                                    </Text>
                                  </View>
                                </View>
                              </View>
                              {creditNote.items && creditNote.items.length > 0 && (
                                <View className="mt-2 pt-2 border-t border-orange-200">
                                  {creditNote.items.map((item: any, itemIdx: number) => (
                                    <View key={itemIdx} className="flex-row justify-between py-1">
                                      <Text className="text-orange-800 text-xs flex-1">
                                        {item.product_name || 'Item'} × {item.quantity}
                                      </Text>
                                      <Text className="text-orange-900 text-xs font-bold">
                                        ${(item.quantity * item.unit_price).toFixed(2)}
                                      </Text>
                                    </View>
                                  ))}
                                </View>
                              )}
                            </View>
                          ))
                        )}
                      </View>
                    )}
                  </View>
                )}

                {/* CRUD Actions */}
                <View className="flex-row gap-4 mb-3">
                  {/* Edit button: always for purchase, draft-only for sales */}
                  {(transactionType === 'purchase' || selectedInvoice.status === 'draft') && (
                    <TouchableOpacity
                      onPress={() => {
                        setSelectedInvoice(null);
                        navigation.getParent()?.navigate('EditInvoice', { invoiceId: selectedInvoice.id, invoiceType: transactionType });
                      }}
                      className="flex-1 flex-row items-center justify-center bg-blue-600 h-14 rounded-2xl"
                      style={{ elevation: 4 }}
                    >
                      <Ionicons name="create-outline" size={20} color="white" />
                      <Text className="text-white font-bold ml-2">Edit</Text>
                    </TouchableOpacity>
                  )}
                  {selectedInvoice.status === 'draft' && transactionType === 'sales' && (
                    <TouchableOpacity
                      onPress={() => handleConfirmInvoice(selectedInvoice)}
                      className="flex-1 flex-row items-center justify-center bg-green-600 h-14 rounded-2xl"
                      style={{ elevation: 4 }}
                    >
                      <Ionicons name="checkmark-done-circle" size={22} color="white" />
                      <Text className="text-white font-bold ml-2">Confirm</Text>
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

                {/* Print & Share Actions */}
                <View className="flex-row gap-4 mb-4">
                  <TouchableOpacity
                    onPress={async () => {
                      try {
                        setIsPrinting(true);
                        let customerBalance: number | undefined;
                        const custId = selectedInvoice.customer_id || selectedInvoice.customer?.id;
                        if (custId) {
                          try {
                            const custResp = await apiService.getCustomerById(custId);
                            const cust = custResp.data || custResp;
                            customerBalance = parseFloat(cust.balance) || 0;
                          } catch { /* silently continue */ }
                        }
                        
                        const calcSubtotal = selectedInvoice.subtotal && selectedInvoice.subtotal > 0 
                          ? selectedInvoice.subtotal 
                          : (selectedInvoice.items?.reduce((acc, item) => acc + (item.quantity * item.unit_price), 0) || selectedInvoice.total_amount);
                        
                        const calcDiscount = selectedInvoice.discount_amount && selectedInvoice.discount_amount > 0
                          ? selectedInvoice.discount_amount
                          : (calcSubtotal - selectedInvoice.total_amount);

                        await printReceiptData({
                          invoiceNumber: selectedInvoice.invoice_number,
                          customerName: selectedInvoice.customer?.name || (selectedInvoice as any).customer_name,
                          items: selectedInvoice.items?.map((i) => ({
                            name: (i as any).product?.name_en || i.product_name || 'Item',
                            quantity: i.quantity,
                            unitPrice: i.unit_price,
                            total: i.total,
                            discountPercent: i.discount_percent || 0,
                          })) || [],
                          subtotal: calcSubtotal,
                          discount: calcDiscount,
                          tax: selectedInvoice.tax_amount || 0,
                          total: selectedInvoice.total_amount,
                          paidAmount: selectedInvoice.paid_amount,
                          date: new Date(selectedInvoice.created_at).toLocaleString(),
                          cashierName: user?.full_name,
                          locationName: user?.location_name,
                          customerBalance,
                        });
                      } catch (err: any) {
                        Alert.alert('Print Error', err?.message || 'Failed to print');
                      } finally {
                        setIsPrinting(false);
                      }
                    }}
                    className="flex-1 flex-row items-center justify-center bg-blue-600 h-14 rounded-2xl"
                    style={{ elevation: 4 }}
                  >
                    <Ionicons name="print-outline" size={20} color="white" />
                    <Text className="text-white font-bold ml-2">Print</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={async () => {
                      try {
                        setIsPrinting(true);
                        let customerBalance: number | undefined;
                        const custId = selectedInvoice.customer_id || selectedInvoice.customer?.id;
                        if (custId) {
                          try {
                            const custResp = await apiService.getCustomerById(custId);
                            const cust = custResp.data || custResp;
                            customerBalance = parseFloat(cust.balance) || 0;
                          } catch { /* silently continue */ }
                        }

                        const calcSubtotal = selectedInvoice.subtotal && selectedInvoice.subtotal > 0 
                          ? selectedInvoice.subtotal 
                          : (selectedInvoice.items?.reduce((acc, item) => acc + (item.quantity * item.unit_price), 0) || selectedInvoice.total_amount);
                        
                        const calcDiscount = selectedInvoice.discount_amount && selectedInvoice.discount_amount > 0
                          ? selectedInvoice.discount_amount
                          : (calcSubtotal - selectedInvoice.total_amount);

                        await generateInvoicePDF({
                          invoiceNumber: selectedInvoice.invoice_number,
                          customerName: selectedInvoice.customer?.name || (selectedInvoice as any).customer_name,
                          customerPhone: selectedInvoice.customer?.phone,
                          customerAddress: selectedInvoice.customer?.address,
                          customerBalance,
                          items: selectedInvoice.items?.map((i) => ({
                            name: (i as any).product?.name_en || (i as any).product?.name_ar || i.product_name || 'Item',
                            quantity: i.quantity,
                            unitPrice: i.unit_price,
                            total: i.total,
                            discountPercent: i.discount_percent || 0,
                          })) || [],
                          subtotal: calcSubtotal,
                          discount: calcDiscount,
                          tax: selectedInvoice.tax_amount || 0,
                          total: selectedInvoice.total_amount,
                          paidAmount: selectedInvoice.paid_amount,
                          date: new Date(selectedInvoice.created_at).toLocaleDateString(),
                          cashierName: user?.full_name,
                          storeName: user?.location_name || 'DIYAA STOCK',
                          storeAddress: 'Supply Warehouse, Lebanon', // Fallback or potentially from metadata
                          storePhone: user?.phone,
                        });
                      } catch (err: any) {
                        Alert.alert('PDF Error', err?.message || 'Failed to generate PDF');
                      } finally {
                        setIsPrinting(false);
                      }
                    }}
                    className="flex-1 flex-row items-center justify-center bg-emerald-600 h-14 rounded-2xl"
                    style={{ elevation: 4 }}
                  >
                    <Ionicons name="share-outline" size={20} color="white" />
                    <Text className="text-white font-bold ml-2">Share PDF</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  onPress={() => selectedInvoice && handleDelete(selectedInvoice.id)}
                  className="w-full flex-row items-center justify-center bg-red-50 h-14 rounded-2xl border border-red-100 mb-6"
                >
                  <Ionicons name="trash-outline" size={20} color="#EF4444" />
                  <Text className="text-red-500 font-bold ml-2">Delete Permanently</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

