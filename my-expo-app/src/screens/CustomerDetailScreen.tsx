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
  RefreshControl,
  ScrollView,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { KeyboardAvoidingView, Platform } from 'react-native';
import { useAuth } from '../context/AuthContext';
import apiService from '../services/api.service';

interface StatementRow {
  type: string;
  id: number;
  reference: string;
  date: string;
  debit: number;
  credit: number;
  description: string;
}

export default function CustomerDetailScreen({ route, navigation }: any) {
  const { customerId } = route.params || {};
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const insets = useSafeAreaInsets();

  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [customer, setCustomer] = useState<any>(null);
  const [transactions, setTransactions] = useState<StatementRow[]>([]);
  const [openingBalance, setOpeningBalance] = useState(0);
  const [closingBalance, setClosingBalance] = useState(0);
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 3);
    return d.toISOString().split('T')[0];
  });
  const [toDate, setToDate] = useState(() => new Date().toISOString().split('T')[0]);

  // Payment sheet state
  const [showPaymentSheet, setShowPaymentSheet] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('cash');
  const [payReference, setPayReference] = useState('');
  const [payNotes, setPayNotes] = useState('');
  const [savingPayment, setSavingPayment] = useState(false);

  // Balance adjust state
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [adjAmount, setAdjAmount] = useState('');
  const [adjType, setAdjType] = useState<'debit' | 'credit'>('debit');
  const [adjReason, setAdjReason] = useState('');
  const [savingAdj, setSavingAdj] = useState(false);

  // We need to find a sales invoice for this customer to attach payment to
  const [salesInvoices, setSalesInvoices] = useState<any[]>([]);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<number | null>(null);

  const loadData = useCallback(async () => {
    if (!customerId) return;
    try {
      const [stmtRes, invoicesRes] = await Promise.all([
        apiService.getCustomerStatement(customerId, { from_date: fromDate, to_date: toDate }),
        apiService.getInvoices({ invoice_type: 'sales', customer_id: customerId, limit: 50 }),
      ]);

      if (stmtRes.ok || stmtRes.success) {
        const d = stmtRes.data;
        setCustomer(d.customer);
        setTransactions(d.transactions || []);
        setOpeningBalance(d.opening_balance || 0);
        setClosingBalance(d.closing_balance || 0);
      }

      const invList = invoicesRes?.invoices?.data || invoicesRes?.data?.data || invoicesRes?.data || [];
      const allInvoices = Array.isArray(invList) ? invList : [];
      // Prefer unpaid first, but allow payment on any invoice
      const sorted = [...allInvoices].sort((a: any, b: any) => {
        const order: Record<string, number> = { unpaid: 0, partial: 1, paid: 2 };
        return (order[a.payment_status] ?? 3) - (order[b.payment_status] ?? 3);
      });
      setSalesInvoices(sorted);
      const firstUnpaid = sorted.find((i: any) => i.payment_status !== 'paid');
      if (firstUnpaid) setSelectedInvoiceId(firstUnpaid.id);
      else if (sorted.length > 0) setSelectedInvoiceId(sorted[0].id);
    } catch {
      Alert.alert('Error', 'Failed to load customer data');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [customerId, fromDate, toDate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleAddPayment = async () => {
    const amount = parseFloat(payAmount.replace(',', '.'));
    if (!amount || amount <= 0) return Alert.alert('Error', 'Enter a valid amount');
    if (!selectedInvoiceId) return Alert.alert('Error', 'No unpaid invoice available for this customer');

    setSavingPayment(true);
    try {
      const res = await apiService.createPayment({
        invoice_id: selectedInvoiceId,
        invoice_type: 'sales',
        amount,
        payment_method: payMethod,
        reference_number: payReference || undefined,
        notes: payNotes || undefined,
      });
      if (res.ok || res.success) {
        setShowPaymentSheet(false);
        setPayAmount('');
        setPayReference('');
        setPayNotes('');
        await loadData();
        Alert.alert('Success', 'Payment recorded');
      } else {
        Alert.alert('Error', res.message || 'Failed to record payment');
      }
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message || 'Failed to record payment');
    } finally {
      setSavingPayment(false);
    }
  };

  const handleReversePayment = (paymentId: number) => {
    Alert.alert('Reverse Payment', 'Are you sure you want to reverse this payment?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reverse', style: 'destructive',
        onPress: async () => {
          try {
            const res = await apiService.reversePayment(paymentId);
            if (res.ok || res.success) {
              await loadData();
            } else {
              Alert.alert('Error', res.message || 'Failed to reverse');
            }
          } catch (e: any) {
            Alert.alert('Error', e?.response?.data?.message || 'Failed to reverse payment');
          }
        },
      },
    ]);
  };

  const handleAdjustBalance = async () => {
    const amount = parseFloat(adjAmount.replace(',', '.'));
    if (!amount || amount <= 0) return Alert.alert('Error', 'Enter a valid amount');
    if (!adjReason.trim()) return Alert.alert('Error', 'Reason is required');

    setSavingAdj(true);
    try {
      const res = await apiService.adjustCustomerBalance(customerId, {
        amount,
        type: adjType,
        reason: adjReason.trim(),
      });
      if (res.ok || res.success) {
        setShowAdjustModal(false);
        setAdjAmount('');
        setAdjReason('');
        await loadData();
        Alert.alert('Success', 'Balance adjusted');
      } else {
        Alert.alert('Error', res.message || 'Failed to adjust balance');
      }
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message || 'Failed to adjust balance');
    } finally {
      setSavingAdj(false);
    }
  };

  const balanceColor = closingBalance > 0 ? '#EF4444' : closingBalance < 0 ? '#10B981' : '#6B7280';

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <SafeAreaView edges={['top']} style={{ backgroundColor: '#FFF' }}>
        <View className="bg-white px-5 py-4 border-b border-gray-100">
          <View className="flex-row items-center justify-between">
            <TouchableOpacity onPress={() => navigation.goBack()} className="mr-3">
              <Ionicons name="arrow-back" size={24} color="#374151" />
            </TouchableOpacity>
            <View className="flex-1">
              <Text className="text-xl font-bold text-gray-900">{customer?.name || 'Customer'}</Text>
              {customer?.phone ? (
                <Text className="text-xs text-gray-500">{customer.phone}</Text>
              ) : null}
            </View>
            <View className="items-end">
              <Text className="text-xs text-gray-400 uppercase">Balance</Text>
              <Text className="text-xl font-black" style={{ color: balanceColor }}>
                ${Math.abs(closingBalance).toFixed(2)}
              </Text>
            </View>
          </View>

          {/* Date range filter */}
          <View className="flex-row mt-3 gap-2 items-end">
            <View className="flex-1">
              <Text className="text-xs text-gray-400 mb-1">From</Text>
              <TextInput
                className="bg-gray-100 rounded-xl px-3 py-2.5 text-sm text-gray-900"
                value={fromDate}
                onChangeText={setFromDate}
                placeholder="YYYY-MM-DD"
              />
            </View>
            <View className="flex-1">
              <Text className="text-xs text-gray-400 mb-1">To</Text>
              <TextInput
                className="bg-gray-100 rounded-xl px-3 py-2.5 text-sm text-gray-900"
                value={toDate}
                onChangeText={setToDate}
                placeholder="YYYY-MM-DD"
              />
            </View>
            <TouchableOpacity
              onPress={loadData}
              className="w-11 h-11 bg-blue-600 rounded-2xl items-center justify-center"
              style={{ elevation: 3 }}>
              <Ionicons name="search" size={18} color="white" />
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>

      {/* Statement list */}
      <FlatList
        data={transactions}
        keyExtractor={(item, idx) => `${item.type}-${item.id}-${idx}`}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#3B82F6']} />}
        ListHeaderComponent={
          <View className="bg-blue-50 rounded-2xl p-4 mb-4">
            <Text className="text-xs text-blue-600 font-bold uppercase mb-1">Opening Balance</Text>
            <Text className="text-lg font-black text-blue-800">${openingBalance.toFixed(2)}</Text>
          </View>
        }
        ListEmptyComponent={
          <View className="items-center p-12">
            <Ionicons name="document-text-outline" size={48} color="#D1D5DB" />
            <Text className="text-gray-400 mt-3">No transactions in this period</Text>
          </View>
        }
        renderItem={({ item }) => {
          const isPayment = item.type === 'payment';
          const isDebit = item.debit > 0;
          return (
            <TouchableOpacity
              onLongPress={() => isPayment && isAdmin ? handleReversePayment(item.id) : undefined}
              activeOpacity={isPayment && isAdmin ? 0.6 : 1}
              className="bg-white rounded-2xl p-4 mb-3 border border-gray-100">
              <View className="flex-row items-center justify-between">
                <View className="flex-1">
                  <View className="flex-row items-center mb-1">
                    <View className={`w-7 h-7 rounded-full items-center justify-center mr-2 ${isPayment ? 'bg-green-100' : 'bg-red-100'}`}>
                      <Ionicons
                        name={isPayment ? 'arrow-down' : 'arrow-up'}
                        size={14}
                        color={isPayment ? '#10B981' : '#EF4444'}
                      />
                    </View>
                    <Text className="text-sm font-bold text-gray-900">{item.description}</Text>
                    {isPayment && isAdmin && (
                      <Text className="ml-2 text-xs text-gray-400">(hold to reverse)</Text>
                    )}
                  </View>
                  <Text className="text-xs text-gray-500 ml-9">{item.reference}</Text>
                  <Text className="text-xs text-gray-400 ml-9">{item.date?.split('T')[0]}</Text>
                </View>
                <View className="items-end">
                  {isDebit ? (
                    <Text className="text-base font-bold text-red-600">+${item.debit.toFixed(2)}</Text>
                  ) : (
                    <Text className="text-base font-bold text-green-600">-${item.credit.toFixed(2)}</Text>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
        ListFooterComponent={
          <View className="bg-gray-100 rounded-2xl p-4 mt-2">
            <Text className="text-xs text-gray-500 font-bold uppercase mb-1">Closing Balance</Text>
            <Text className="text-xl font-black" style={{ color: balanceColor }}>
              ${closingBalance.toFixed(2)}
            </Text>
          </View>
        }
      />

      {/* FABs */}
      <View className="absolute right-5 gap-3" style={{ bottom: insets.bottom + 16 }}>
        {isAdmin && (
          <TouchableOpacity
            onPress={() => setShowAdjustModal(true)}
            className="w-12 h-12 rounded-full bg-orange-500 items-center justify-center shadow-lg"
            style={{ elevation: 6 }}>
            <Ionicons name="swap-vertical" size={22} color="white" />
          </TouchableOpacity>
        )}
        <TouchableOpacity
          onPress={() => setShowPaymentSheet(true)}
          className="w-14 h-14 rounded-full bg-green-600 items-center justify-center shadow-lg"
          style={{ elevation: 8 }}>
          <Ionicons name="add" size={28} color="white" />
        </TouchableOpacity>
      </View>

      {/* Add Payment bottom sheet */}
      <Modal visible={showPaymentSheet} animationType="slide" transparent onRequestClose={() => setShowPaymentSheet(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1 justify-end">
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-3xl p-6" style={{ paddingBottom: insets.bottom + 16 }}>
            <View className="w-10 h-1 bg-gray-200 rounded-full self-center mb-4" />
            <View className="flex-row justify-between items-center mb-5">
              <Text className="text-xl font-bold text-gray-900">Add Payment</Text>
              <TouchableOpacity onPress={() => setShowPaymentSheet(false)}>
                <Ionicons name="close" size={24} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            {salesInvoices.length === 0 ? (
              <View className="items-center py-8">
                <Ionicons name="receipt-outline" size={40} color="#D1D5DB" />
                <Text className="text-gray-500 font-bold mt-3">No invoices found</Text>
                <Text className="text-gray-400 text-sm text-center mt-1">Create a sales invoice first</Text>
              </View>
            ) : (
              <>
                {/* Invoice selector */}
                <View className="mb-4">
                  <Text className="text-sm font-semibold text-gray-700 mb-2">Invoice</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {salesInvoices.map((inv: any) => {
                      const due = Math.max(0, (inv.total_amount || 0) - (inv.paid_amount || 0));
                      return (
                        <TouchableOpacity
                          key={inv.id}
                          onPress={() => setSelectedInvoiceId(inv.id)}
                          className={`mr-2 px-3 py-2 rounded-xl border ${selectedInvoiceId === inv.id ? 'bg-blue-600 border-blue-600' : 'bg-white border-gray-200'}`}>
                          <Text className={`text-xs font-bold ${selectedInvoiceId === inv.id ? 'text-white' : 'text-gray-700'}`}>
                            {inv.invoice_number}
                          </Text>
                          <Text className={`text-xs ${selectedInvoiceId === inv.id ? 'text-blue-100' : due > 0 ? 'text-red-500' : 'text-green-600'}`}>
                            {due > 0 ? `Due: $${due.toFixed(2)}` : 'Paid'}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>

                <View className="mb-4">
                  <Text className="text-sm font-semibold text-gray-700 mb-1.5">Amount *</Text>
                  <TextInput
                    className="bg-gray-100 rounded-xl px-4 py-3 text-base font-bold text-gray-900"
                    placeholder="0.00"
                    keyboardType="decimal-pad"
                    value={payAmount}
                    onChangeText={setPayAmount}
                    autoFocus
                  />
                </View>

                <View className="mb-4">
                  <Text className="text-sm font-semibold text-gray-700 mb-2">Method</Text>
                  <View className="flex-row gap-2">
                    {['cash', 'card', 'bank_transfer'].map((m) => (
                      <TouchableOpacity
                        key={m}
                        onPress={() => setPayMethod(m)}
                        className={`flex-1 py-2.5 rounded-xl border ${payMethod === m ? 'bg-blue-600 border-blue-600' : 'bg-white border-gray-200'}`}>
                        <Text className={`text-center text-xs font-bold ${payMethod === m ? 'text-white' : 'text-gray-600'}`}>
                          {m === 'bank_transfer' ? 'Transfer' : m.charAt(0).toUpperCase() + m.slice(1)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View className="mb-4">
                  <Text className="text-sm font-semibold text-gray-700 mb-1.5">Reference (optional)</Text>
                  <TextInput
                    className="bg-gray-100 rounded-xl px-4 py-3 text-base text-gray-900"
                    placeholder="Reference number"
                    value={payReference}
                    onChangeText={setPayReference}
                  />
                </View>

                <TouchableOpacity
                  onPress={handleAddPayment}
                  disabled={savingPayment}
                  className={`h-14 rounded-2xl items-center justify-center mt-2 ${savingPayment ? 'bg-gray-300' : 'bg-green-600'}`}>
                  {savingPayment ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text className="text-white font-bold text-lg">Record Payment</Text>
                  )}
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Balance Adjustment Modal (admin only) */}
      {isAdmin && (
        <Modal visible={showAdjustModal} animationType="slide" transparent onRequestClose={() => setShowAdjustModal(false)}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1 justify-end">
          <View className="flex-1 bg-black/50 justify-end">
            <View className="bg-white rounded-t-3xl p-6" style={{ paddingBottom: insets.bottom + 16 }}>
              <View className="w-10 h-1 bg-gray-200 rounded-full self-center mb-4" />
              <View className="flex-row justify-between items-center mb-5">
                <Text className="text-xl font-bold text-gray-900">Adjust Balance</Text>
                <TouchableOpacity onPress={() => setShowAdjustModal(false)}>
                  <Ionicons name="close" size={24} color="#9CA3AF" />
                </TouchableOpacity>
              </View>

              <View className="mb-4">
                <Text className="text-sm font-semibold text-gray-700 mb-2">Type</Text>
                <View className="flex-row gap-2">
                  <TouchableOpacity
                    onPress={() => setAdjType('debit')}
                    className={`flex-1 py-3 rounded-xl border ${adjType === 'debit' ? 'bg-red-500 border-red-500' : 'bg-white border-gray-200'}`}>
                    <Text className={`text-center font-bold ${adjType === 'debit' ? 'text-white' : 'text-gray-700'}`}>Debit (+)</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setAdjType('credit')}
                    className={`flex-1 py-3 rounded-xl border ${adjType === 'credit' ? 'bg-green-500 border-green-500' : 'bg-white border-gray-200'}`}>
                    <Text className={`text-center font-bold ${adjType === 'credit' ? 'text-white' : 'text-gray-700'}`}>Credit (-)</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View className="mb-4">
                <Text className="text-sm font-semibold text-gray-700 mb-1.5">Amount *</Text>
                <TextInput
                  className="bg-gray-100 rounded-xl px-4 py-3 text-base font-bold text-gray-900"
                  placeholder="0.00"
                  keyboardType="decimal-pad"
                  value={adjAmount}
                  onChangeText={setAdjAmount}
                />
              </View>

              <View className="mb-5">
                <Text className="text-sm font-semibold text-gray-700 mb-1.5">Reason *</Text>
                <TextInput
                  className="bg-gray-100 rounded-xl px-4 py-3 text-base text-gray-900"
                  placeholder="Reason for adjustment"
                  value={adjReason}
                  onChangeText={setAdjReason}
                  multiline
                  numberOfLines={2}
                />
              </View>

              <TouchableOpacity
                onPress={handleAdjustBalance}
                disabled={savingAdj}
                className={`h-14 rounded-2xl items-center justify-center ${savingAdj ? 'bg-gray-300' : 'bg-orange-500'}`}>
                {savingAdj ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-white font-bold text-lg">Apply Adjustment</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
          </KeyboardAvoidingView>
        </Modal>
      )}
    </View>
  );
}
