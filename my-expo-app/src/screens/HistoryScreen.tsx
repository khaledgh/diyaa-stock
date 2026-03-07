import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import apiService from '../services/api.service';
import { Invoice } from '../types';

export default function HistoryScreen() {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  const [transactionType, setTransactionType] = useState<'sales' | 'purchase'>('sales');
  const [selectedLocationId, setSelectedLocationId] = useState<number | null>(user?.location_id || null);
  const [locations, setLocations] = useState<any[]>([]);
  const isAdmin = user?.role === 'admin';

  const loadInvoices = useCallback(async () => {
    const locationId = selectedLocationId || user?.location_id;

    if (!locationId) {
      if (!isAdmin) console.warn('No location_id found for user in History screen');
      setIsLoading(false);
      return;
    }

    try {
      console.log('Loading invoices for location_id:', locationId);
      const invoiceParams: any = {
        invoice_type: transactionType,
        limit: 50,
        offset: 0,
      };

      if (!isAdmin || selectedLocationId) {
        invoiceParams.location_id = locationId;
      }

      const response = await apiService.getInvoices(invoiceParams);

      console.log('Invoices response:', response);

      if (response.ok || response.success) {
        // The response has data inside response.invoices.data or response.data.data due to pagination
        const invoicesData = response.invoices?.data || response.data?.data || response.data || [];
        console.log('Invoices data:', invoicesData);
        console.log('Is array?', Array.isArray(invoicesData));

        // Ensure it's an array
        if (!Array.isArray(invoicesData)) {
          console.error('Invoices data is not an array:', invoicesData);
          setInvoices([]);
          return;
        }

        // Transform invoice data to ensure numbers are parsed
        const transformedInvoices = invoicesData.map((invoice: any) => ({
          ...invoice,
          id: invoice.id,
          invoice_number: invoice.invoice_number || '',
          customer_name: invoice.customer_name || null,
          payment_status: invoice.payment_status || 'unpaid',
          created_at: invoice.created_at || new Date().toISOString(),
          subtotal: parseFloat(invoice.subtotal) || 0,
          tax_amount: parseFloat(invoice.tax_amount) || 0,
          discount_amount: parseFloat(invoice.discount_amount) || 0,
          total_amount: parseFloat(invoice.total_amount) || 0,
          paid_amount: parseFloat(invoice.paid_amount) || 0,
        }));

        console.log('Transformed first invoice:', transformedInvoices[0]);
        setInvoices(transformedInvoices);
      }
    } catch (error) {
      console.error('Failed to load invoices:', error);
      setIsLoading(false);
    }
  }, [user?.location_id, selectedLocationId, transactionType, isAdmin]);

  const loadLocations = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const resp = await apiService.getLocations();
      if (resp.data) {
        setLocations(resp.data);
      }
    } catch (e) {
      console.error('Failed to load locations', e);
    }
  }, [isAdmin]);

  useEffect(() => {
    if (isAdmin) loadLocations();
  }, [isAdmin, loadLocations]);

  useEffect(() => {
    loadInvoices();
  }, [loadInvoices]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (isAdmin) await loadLocations();
    await loadInvoices();
    setRefreshing(false);
  }, [loadInvoices]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-700';
      case 'partial':
        return 'bg-yellow-100 text-yellow-700';
      case 'unpaid':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text className="mt-4 text-gray-600">Loading invoices...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-white">
      {/* Header */}
      <View className="px-4 py-3 border-b border-gray-100">
        <Text className="text-gray-900 text-xl font-bold">Sales History</Text>
        <Text className="text-gray-500 text-sm mt-0.5">
          {isAdmin && !selectedLocationId ? 'Global' : `Location ${selectedLocationId || user?.location_id}`} - {invoices.length} invoices
        </Text>
      </View>

      {isAdmin && (
        <View className="px-4 py-2 border-b border-gray-100">
          <View className="flex-row gap-2 mb-2">
            <TouchableOpacity
              onPress={() => setTransactionType('sales')}
              className={`flex-1 rounded-lg py-1.5 items-center ${transactionType === 'sales' ? 'bg-blue-100' : 'bg-gray-100'}`}>
              <Text className={`font-medium ${transactionType === 'sales' ? 'text-blue-700' : 'text-gray-600'}`}>Sales</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setTransactionType('purchase')}
              className={`flex-1 rounded-lg py-1.5 items-center ${transactionType === 'purchase' ? 'bg-blue-100' : 'bg-gray-100'}`}>
              <Text className={`font-medium ${transactionType === 'purchase' ? 'text-blue-700' : 'text-gray-600'}`}>Purchase</Text>
            </TouchableOpacity>
          </View>
          <View className="flex-row items-center flex-wrap gap-2">
            <TouchableOpacity
              onPress={() => setSelectedLocationId(null)}
              className={`rounded-lg px-3 py-1 border ${!selectedLocationId ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200'}`}>
              <Text className="text-xs">All Locations</Text>
            </TouchableOpacity>
            {locations.map(loc => (
              <TouchableOpacity
                key={loc.id}
                onPress={() => setSelectedLocationId(loc.id)}
                className={`rounded-lg px-3 py-1 border ${selectedLocationId === loc.id ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200'}`}>
                <Text className="text-xs">{loc.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Invoices List */}
      <FlatList
        data={invoices}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={{ padding: 12, paddingBottom: 20 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#3B82F6']}
            tintColor="#3B82F6"
          />
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            className="bg-white rounded-2xl p-4 mb-3"
            style={{
              borderWidth: 1,
              borderColor: '#F3F4F6',
              elevation: 2,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.05,
              shadowRadius: 8,
            }}
            onPress={() => setSelectedInvoice(item)}
          >
            <View className="flex-row justify-between items-start mb-2">
              <View className="flex-1">
                <Text className="text-base font-bold text-gray-900">
                  {item.invoice_number}
                </Text>
                <Text className="text-sm text-gray-500 mt-0.5">
                  {item.customer_name || 'Walk-in Customer'}
                </Text>
              </View>
              <View className={`px-3 py-1 rounded-full ${getStatusColor(item.payment_status)}`}>
                <Text className="text-xs font-semibold capitalize">
                  {item.payment_status}
                </Text>
              </View>
            </View>

            <View className="flex-row justify-between items-center pt-2 border-t border-gray-100">
              <View>
                <Text className="text-xs text-gray-500">Total Amount</Text>
                <Text className="text-lg font-bold text-gray-900">
                  ${(typeof item.total_amount === 'number' ? item.total_amount : parseFloat(item.total_amount) || 0).toFixed(2)}
                </Text>
              </View>
              <View>
                <Text className="text-xs text-gray-400">
                  {formatDate(item.created_at)}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View className="p-8 items-center">
            <Text className="text-gray-500 text-center">No invoices found</Text>
            <Text className="text-gray-400 text-sm text-center mt-2">
              Sales invoices will appear here
            </Text>
          </View>
        }
      />

      {/* Invoice Detail Modal */}
      {selectedInvoice && (
        <Modal
          visible={true}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setSelectedInvoice(null)}
        >
          <View className="flex-1 bg-black/50 justify-end">
            <View className="bg-white rounded-t-3xl" style={{ maxHeight: '80%' }}>
              <SafeAreaView edges={['bottom']}>
                <View className="p-4 border-b border-gray-100 flex-row justify-between items-center">
                  <View>
                    <Text className="text-lg font-bold text-gray-900">
                      Invoice Details
                    </Text>
                    <Text className="text-sm text-gray-500">
                      {selectedInvoice.invoice_number}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setSelectedInvoice(null)}
                    className="w-9 h-9 rounded-lg bg-gray-100 items-center justify-center"
                  >
                    <Text className="text-xl text-gray-600">×</Text>
                  </TouchableOpacity>
                </View>

                <View className="p-4">
                  {/* Customer Info */}
                  <View className="bg-gray-50 rounded-xl p-4 mb-4">
                    <Text className="text-xs text-gray-500 mb-2">CUSTOMER</Text>
                    <Text className="text-base font-semibold text-gray-900">
                      {selectedInvoice.customer_name || 'Walk-in Customer'}
                    </Text>
                    <Text className="text-sm text-gray-500 mt-1">
                      {formatDate(selectedInvoice.created_at)}
                    </Text>
                  </View>

                  {/* Amounts */}
                  <View className="bg-gray-50 rounded-xl p-4 mb-4">
                    <View className="flex-row justify-between mb-2">
                      <Text className="text-sm text-gray-600">Subtotal</Text>
                      <Text className="text-sm font-semibold text-gray-900">
                        ${(typeof selectedInvoice.subtotal === 'number' ? selectedInvoice.subtotal : parseFloat(selectedInvoice.subtotal) || 0).toFixed(2)}
                      </Text>
                    </View>
                    <View className="flex-row justify-between mb-2">
                      <Text className="text-sm text-gray-600">Tax</Text>
                      <Text className="text-sm font-semibold text-gray-900">
                        ${(typeof selectedInvoice.tax_amount === 'number' ? selectedInvoice.tax_amount : parseFloat(selectedInvoice.tax_amount) || 0).toFixed(2)}
                      </Text>
                    </View>
                    <View className="flex-row justify-between mb-2">
                      <Text className="text-sm text-gray-600">Discount</Text>
                      <Text className="text-sm font-semibold text-gray-900">
                        -${(typeof selectedInvoice.discount_amount === 'number' ? selectedInvoice.discount_amount : parseFloat(selectedInvoice.discount_amount) || 0).toFixed(2)}
                      </Text>
                    </View>
                    <View className="h-px bg-gray-200 my-2" />
                    <View className="flex-row justify-between">
                      <Text className="text-base font-bold text-gray-900">Total</Text>
                      <Text className="text-xl font-bold text-blue-600">
                        ${(typeof selectedInvoice.total_amount === 'number' ? selectedInvoice.total_amount : parseFloat(selectedInvoice.total_amount) || 0).toFixed(2)}
                      </Text>
                    </View>
                  </View>

                  {/* Payment Status */}
                  <View className="bg-gray-50 rounded-xl p-4">
                    <View className="flex-row justify-between items-center">
                      <Text className="text-sm text-gray-600">Payment Status</Text>
                      <View className={`px-3 py-1 rounded-full ${getStatusColor(selectedInvoice.payment_status)}`}>
                        <Text className="text-xs font-semibold capitalize">
                          {selectedInvoice.payment_status}
                        </Text>
                      </View>
                    </View>
                    <View className="flex-row justify-between items-center mt-2">
                      <Text className="text-sm text-gray-600">Paid Amount</Text>
                      <Text className="text-sm font-semibold text-gray-900">
                        ${(typeof selectedInvoice.paid_amount === 'number' ? selectedInvoice.paid_amount : parseFloat(selectedInvoice.paid_amount) || 0).toFixed(2)}
                      </Text>
                    </View>
                  </View>
                </View>
              </SafeAreaView>
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}
