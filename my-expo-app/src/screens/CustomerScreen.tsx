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
  StatusBar,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import apiService from '../services/api.service';
import { useTranslation } from 'react-i18next';
import { Customer } from '../types';

export default function CustomerScreen({ navigation }: any) {
  const { t } = useTranslation();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formTaxNumber, setFormTaxNumber] = useState('');
  const [formOpeningBalance, setFormOpeningBalance] = useState('');
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  const loadCustomers = useCallback(async () => {
    try {
      const params: any = { per_page: 500, sortBy: 'balance', orderBy: 'desc' };
      if (searchQuery.trim()) params.search = searchQuery;
      const response = await apiService.getCustomers(params);
      const data = response.data || [];
      setCustomers(Array.isArray(data) ? data : []);
    } catch {
      Alert.alert(t('common.error'), t('common.error'));
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadCustomers();
    setRefreshing(false);
  }, [loadCustomers]);

  const resetForm = () => {
    setFormName('');
    setFormPhone('');
    setFormEmail('');
    setFormAddress('');
    setFormTaxNumber('');
    setFormOpeningBalance('');
    setEditingCustomer(null);
  };

  const openAddModal = () => {
    resetForm();
    setShowAddModal(true);
  };

  const openEditModal = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormName(customer.name);
    setFormPhone(customer.phone || '');
    setFormEmail(customer.email || '');
    setFormAddress(customer.address || '');
    setFormTaxNumber('');
    setFormOpeningBalance((customer as any).opening_balance?.toString() || '');
    setShowAddModal(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) {
      Alert.alert(t('common.error'), t('customers.nameRequired'));
      return;
    }

    setSaving(true);
    try {
      const data: any = {
        name: formName.trim(),
        phone: formPhone.trim() || undefined,
        email: formEmail.trim() || undefined,
        address: formAddress.trim() || undefined,
        tax_number: formTaxNumber.trim() || undefined,
      };

      if (formOpeningBalance.trim()) {
        data.opening_balance = parseFloat(formOpeningBalance.replace(',', '.')) || 0;
      }

      if (editingCustomer) {
        await apiService.updateCustomer(editingCustomer.id, data);
        Alert.alert(t('common.success'), t('customers.successUpdated'));
      } else {
        await apiService.createCustomer(data);
        Alert.alert(t('common.success'), t('customers.successCreated'));
      }

      setShowAddModal(false);
      resetForm();
      await loadCustomers();
    } catch (error: any) {
      Alert.alert(t('common.error'), error.response?.data?.message || t('common.error'));
    } finally {
      setSaving(false);
    }
  };

  const filteredCustomers = React.useMemo(() => {
    let list = customers;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.phone?.toLowerCase().includes(q) ||
          c.email?.toLowerCase().includes(q)
      );
    }
    // Sort: unpaid (positive balance) first, then zero, then credit (negative)
    return [...list].sort((a, b) => parseFloat((b as any).balance || 0) - parseFloat((a as any).balance || 0));
  }, [customers, searchQuery]);

  return (
    <View className="flex-1 bg-gray-50">
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <SafeAreaView edges={['top']} style={{ backgroundColor: '#FFF' }}>
        <View className="bg-white px-5 py-4" style={{ elevation: 2 }}>
          <View className="flex-row items-center justify-between mb-3">
            <View className="flex-row items-center">
              <TouchableOpacity onPress={() => navigation.goBack()} className="mr-3">
                <Ionicons name="arrow-back" size={24} color="#374151" />
              </TouchableOpacity>
              <View>
                <Text className="text-xl font-bold text-gray-900">{t('customers.title')}</Text>
                <Text className="text-xs text-gray-500">{customers.length} {t('customers.total')}</Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={openAddModal}
              className="flex-row items-center bg-blue-600 rounded-xl px-4 py-2.5"
              style={{ elevation: 3 }}>
              <Ionicons name="add" size={18} color="#FFF" />
              <Text className="text-white font-semibold text-sm ml-1">{t('common.add')}</Text>
            </TouchableOpacity>
          </View>

          {/* Search */}
          <View className="flex-row items-center bg-gray-100 rounded-xl px-4 py-2.5">
            <Ionicons name="search" size={18} color="#9CA3AF" />
            <TextInput
              className="flex-1 ml-2 text-base text-gray-900"
              placeholder={t('customers.searchPlaceholder')}
              placeholderTextColor="#9CA3AF"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={18} color="#9CA3AF" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </SafeAreaView>

      {/* Customer List */}
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      ) : (
        <FlatList
          data={filteredCustomers}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#3B82F6']} />}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => navigation.navigate('CustomerDetail', { customerId: item.id })}
              onLongPress={() => openEditModal(item)}
              className="bg-white rounded-2xl p-4 mb-3"
              style={{ elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4 }}
              activeOpacity={0.7}>
              <View className="flex-row items-center">
                <View className="w-12 h-12 rounded-full bg-blue-100 items-center justify-center mr-3">
                  <Text className="text-lg font-bold text-blue-600">
                    {item.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View className="flex-1">
                  <Text className="text-base font-bold text-gray-900">{item.name}</Text>
                  {item.phone && (
                    <View className="flex-row items-center mt-0.5">
                      <Ionicons name="call-outline" size={12} color="#6B7280" />
                      <Text className="ml-1 text-xs text-gray-500">{item.phone}</Text>
                    </View>
                  )}
                  {item.email && (
                    <View className="flex-row items-center mt-0.5">
                      <Ionicons name="mail-outline" size={12} color="#6B7280" />
                      <Text className="ml-1 text-xs text-gray-500">{item.email}</Text>
                    </View>
                  )}
                </View>
                <View className="items-end">
                  {item.balance !== undefined && item.balance != 0 && (
                    <View className={`rounded-full px-3 py-1 ${parseFloat(item.balance) > 0 ? 'bg-red-50' : 'bg-green-50'}`}>
                      <Text className={`text-xs font-bold ${parseFloat(item.balance) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        ${Math.abs(parseFloat(item.balance || 0)).toFixed(2)}
                      </Text>
                    </View>
                  )}
                  <Ionicons name="chevron-forward" size={18} color="#D1D5DB" style={{ marginTop: 4 }} />
                </View>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View className="items-center p-16">
              <Ionicons name="people-outline" size={64} color="#D1D5DB" />
              <Text className="text-lg font-bold text-gray-400 mt-4">{t('customers.noCustomers')}</Text>
              <Text className="text-gray-400 text-center mt-1">{t('customers.addFirst')}</Text>
            </View>
          }
        />
      )}

      {/* Add/Edit Modal */}
      <Modal visible={showAddModal} animationType="slide" onRequestClose={() => setShowAddModal(false)}>
        <SafeAreaView className="flex-1 bg-gray-50">
          <View className="bg-white flex-row items-center justify-between px-5 py-4 border-b border-gray-100" style={{ elevation: 2 }}>
            <View className="flex-row items-center">
              <TouchableOpacity onPress={() => { setShowAddModal(false); resetForm(); }} className="mr-3">
                <Ionicons name="close" size={24} color="#374151" />
              </TouchableOpacity>
              <Text className="text-xl font-bold text-gray-900">
                {editingCustomer ? t('customers.editCustomer') : t('customers.newCustomer')}
              </Text>
            </View>
            <TouchableOpacity
              onPress={handleSave}
              disabled={saving}
              className={`rounded-xl px-5 py-2.5 ${saving ? 'bg-gray-300' : 'bg-blue-600'}`}>
              {saving ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Text className="text-white font-bold text-sm">{t('common.save')}</Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView className="flex-1 p-5" keyboardShouldPersistTaps="handled">
            {/* Name */}
            <View className="mb-4">
              <Text className="text-sm font-semibold text-gray-700 mb-1.5">{t('customers.name')} *</Text>
              <TextInput
                className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900"
                placeholder="Customer name"
                placeholderTextColor="#9CA3AF"
                value={formName}
                onChangeText={setFormName}
                autoFocus
              />
            </View>

            {/* Phone */}
            <View className="mb-4">
              <Text className="text-sm font-semibold text-gray-700 mb-1.5">{t('customers.phone')}</Text>
              <TextInput
                className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900"
                placeholder="Phone number"
                placeholderTextColor="#9CA3AF"
                value={formPhone}
                onChangeText={setFormPhone}
                keyboardType="phone-pad"
              />
            </View>

            {/* Email */}
            <View className="mb-4">
              <Text className="text-sm font-semibold text-gray-700 mb-1.5">{t('customers.email')}</Text>
              <TextInput
                className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900"
                placeholder="Email address"
                placeholderTextColor="#9CA3AF"
                value={formEmail}
                onChangeText={setFormEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            {/* Address */}
            <View className="mb-4">
              <Text className="text-sm font-semibold text-gray-700 mb-1.5">{t('customers.address')}</Text>
              <TextInput
                className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900"
                placeholder="Address"
                placeholderTextColor="#9CA3AF"
                value={formAddress}
                onChangeText={setFormAddress}
                multiline
                numberOfLines={2}
              />
            </View>

            {/* Tax Number */}
            <View className="mb-4">
              <Text className="text-sm font-semibold text-gray-700 mb-1.5">{t('customers.taxNumber')}</Text>
              <TextInput
                className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900"
                placeholder="Tax number (optional)"
                placeholderTextColor="#9CA3AF"
                value={formTaxNumber}
                onChangeText={setFormTaxNumber}
              />
            </View>

            {/* Opening Balance */}
            <View className="mb-4">
              <Text className="text-sm font-semibold text-gray-700 mb-1.5">{t('customers.openingBalance')}</Text>
              <TextInput
                className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900"
                placeholder="0.00"
                placeholderTextColor="#9CA3AF"
                value={formOpeningBalance}
                onChangeText={setFormOpeningBalance}
                keyboardType="decimal-pad"
              />
              <Text className="text-xs text-gray-400 mt-1">{t('customers.openingBalanceHint')}</Text>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </View>
  );
}
