import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import apiService from '../services/api.service';
import { User } from '../types';

export default function UserManagementScreen({ navigation }: any) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [commissionRate, setCommissionRate] = useState('');
  const [saving, setSaving] = useState(false);

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiService.getUsers();
      setUsers(response.data || []);
    } catch (error) {
      console.error('Failed to load users:', error);
      Alert.alert('Error', 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadUsers();
    setRefreshing(false);
  };

  const openEditCommission = (user: User) => {
    setEditingUser(user);
    setCommissionRate(user.commission_rate?.toString() || '0');
  };

  const saveCommissionRate = async () => {
    if (!editingUser) return;

    const rate = parseFloat(commissionRate);
    if (isNaN(rate) || rate < 0 || rate > 100) {
      Alert.alert('Invalid Rate', 'Commission rate must be between 0 and 100');
      return;
    }

    try {
      setSaving(true);
      console.log('Updating user commission rate:', {
        userId: editingUser.id,
        newRate: rate,
        userName: editingUser.full_name,
      });
      
      const response = await apiService.updateUser(editingUser.id, {
        email: editingUser.email,
        full_name: editingUser.full_name,
        phone: editingUser.phone || '',
        role: editingUser.role,
        status: editingUser.is_active ? 'ACTIVE' : 'NOTACTIVE',
        position: editingUser.position || '',
        location_id: editingUser.location_id || null,
        commission_rate: rate,
      });
      
      console.log('Update response:', response);
      Alert.alert('Success', 'Commission rate updated successfully');
      setEditingUser(null);
      await loadUsers();
    } catch (error: any) {
      console.error('Failed to update commission rate:', error);
      console.error('Error response:', error.response?.data);
      Alert.alert('Error', error.response?.data?.message || 'Failed to update commission rate');
    } finally {
      setSaving(false);
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-purple-100 text-purple-700';
      case 'sales':
        return 'bg-blue-100 text-blue-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  if (loading) {
    return (
      <SafeAreaView edges={['top']} className="flex-1 bg-white">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text className="text-gray-500 mt-4">Loading users...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-white">
      <View className="px-4 py-3 border-b border-gray-100 flex-row items-center justify-between">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => navigation.goBack()} className="mr-3">
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text className="text-gray-900 text-xl font-bold">User Management</Text>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        style={{ backgroundColor: '#F9FAFB' }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View className="p-4">
          <Text className="text-sm text-gray-500 mb-4">
            {users.length} {users.length === 1 ? 'user' : 'users'}
          </Text>

          {users.map((user) => (
            <View
              key={user.id}
              className="bg-white rounded-2xl p-4 mb-3"
              style={{
                elevation: 2,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.05,
                shadowRadius: 8,
              }}
            >
              <View className="flex-row items-start justify-between mb-3">
                <View className="flex-1">
                  <Text className="text-gray-900 text-lg font-bold">{user.full_name}</Text>
                  <Text className="text-gray-500 text-sm mt-1">{user.email}</Text>
                  <View className="flex-row items-center mt-2">
                    <View className={`px-3 py-1 rounded-full ${getRoleBadgeColor(user.role)}`}>
                      <Text className="text-xs font-semibold capitalize">{user.role}</Text>
                    </View>
                    {user.location_id && (
                      <View className="ml-2 bg-gray-100 px-3 py-1 rounded-full">
                        <Text className="text-xs text-gray-700">
                          Location {user.location_name || user.location_id}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>

              {user.role === 'sales' && (
                <View className="border-t border-gray-100 pt-3 mt-2">
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center">
                      <Ionicons name="cash-outline" size={20} color="#10B981" />
                      <View className="ml-2">
                        <Text className="text-xs text-gray-500">Commission Rate</Text>
                        <Text className="text-base text-gray-900 font-semibold">
                          {user.commission_rate || 0}%
                        </Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      onPress={() => openEditCommission(user)}
                      className="bg-blue-600 px-4 py-2 rounded-lg"
                    >
                      <Text className="text-white text-sm font-semibold">Edit Rate</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Edit Commission Modal */}
      <Modal
        visible={!!editingUser}
        animationType="slide"
        transparent
        onRequestClose={() => setEditingUser(null)}
      >
        <View className="flex-1 justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <SafeAreaView edges={['bottom']} className="bg-white rounded-t-3xl" style={{ maxHeight: '70%' }}>
            <ScrollView 
              className="p-6"
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <View className="flex-row items-center justify-between mb-6">
                <Text className="text-xl font-bold text-gray-900">Edit Commission Rate</Text>
                <TouchableOpacity onPress={() => setEditingUser(null)}>
                  <Ionicons name="close" size={24} color="#9CA3AF" />
                </TouchableOpacity>
              </View>

              {editingUser && (
                <>
                  <View className="mb-6">
                    <Text className="text-base text-gray-900 font-semibold mb-1">
                      {editingUser.full_name}
                    </Text>
                    <Text className="text-sm text-gray-500">{editingUser.email}</Text>
                  </View>

                  <View className="mb-6">
                    <Text className="text-sm text-gray-700 font-semibold mb-2">
                      Commission Rate (%)
                    </Text>
                    <View className="bg-gray-100 rounded-xl px-4 py-3 flex-row items-center">
                      <Ionicons name="cash-outline" size={20} color="#6B7280" />
                      <TextInput
                        className="flex-1 ml-3 text-gray-900 text-base"
                        placeholder="0.00"
                        keyboardType="decimal-pad"
                        value={commissionRate}
                        onChangeText={setCommissionRate}
                        editable={!saving}
                      />
                      <Text className="text-gray-500 text-base">%</Text>
                    </View>
                    <Text className="text-xs text-gray-500 mt-2">
                      Enter a value between 0 and 100
                    </Text>
                  </View>

                  <View className="flex-row gap-3 mb-4">
                    <TouchableOpacity
                      onPress={() => setEditingUser(null)}
                      disabled={saving}
                      className="flex-1 bg-gray-100 py-4 rounded-xl"
                    >
                      <Text className="text-gray-700 text-center font-semibold">Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={saveCommissionRate}
                      disabled={saving}
                      className="flex-1 bg-blue-600 py-4 rounded-xl"
                    >
                      {saving ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <Text className="text-white text-center font-semibold">Save</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </ScrollView>
          </SafeAreaView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
