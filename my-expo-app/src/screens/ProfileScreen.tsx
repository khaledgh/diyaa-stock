import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import PrinterSettingsScreen from './PrinterSettingsScreen';

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const [showPrinterSettings, setShowPrinterSettings] = useState(false);

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', style: 'destructive', onPress: logout },
      ]
    );
  };

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-white">
      {/* Header */}
      <View className="px-4 py-3 border-b border-gray-100">
        <Text className="text-gray-900 text-xl font-bold">Profile</Text>
      </View>

      <ScrollView className="flex-1" style={{ backgroundColor: '#F9FAFB' }}>
        {/* User Info Card */}
        <View className="p-4">
          <View className="bg-white rounded-2xl p-6 mb-4" style={{ elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 }}>
            <View className="items-center mb-4">
              <View className="w-24 h-24 rounded-full bg-blue-100 items-center justify-center mb-3">
                <Text className="text-blue-600 text-5xl font-bold">{user?.full_name?.charAt(0).toUpperCase()}</Text>
              </View>
              <Text className="text-gray-900 text-2xl font-bold">{user?.full_name}</Text>
              <Text className="text-gray-500 text-sm mt-1">{user?.email}</Text>
              <View className="mt-3 bg-blue-50 px-4 py-2 rounded-full">
                <Text className="text-blue-700 text-sm font-semibold capitalize">{user?.role}</Text>
              </View>
            </View>
            
            <View className="flex-row justify-around pt-4 border-t border-gray-100">
              <View className="items-center">
                <Text className="text-gray-900 text-2xl font-bold">{user?.van_id || '-'}</Text>
                <Text className="text-gray-500 text-xs mt-1">Van ID</Text>
              </View>
              <View className="w-px h-12 bg-gray-200" />
              <View className="items-center">
                <Text className="text-green-600 text-2xl font-bold">●</Text>
                <Text className="text-gray-500 text-xs mt-1">Active</Text>
              </View>
            </View>
          </View>

          {/* Quick Actions */}
          <View className="bg-white rounded-2xl p-4 mb-4" style={{ elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 }}>
            <Text className="text-sm font-bold text-gray-900 mb-3">Account Information</Text>
            
            <View className="mb-3 pb-3 border-b border-gray-100">
              <Text className="text-xs text-gray-500 mb-1">Email Address</Text>
              <Text className="text-base text-gray-900">{user?.email}</Text>
            </View>

            {user?.van_id && (
              <View className="mb-3 pb-3 border-b border-gray-100">
                <Text className="text-xs text-gray-500 mb-1">Assigned Van</Text>
                <Text className="text-base text-gray-900 font-semibold">Van {user.van_id}</Text>
              </View>
            )}

            <View>
              <Text className="text-xs text-gray-500 mb-1">Account Status</Text>
              <View className="flex-row items-center">
                <View className="w-2 h-2 rounded-full bg-green-500 mr-2" />
                <Text className="text-base text-gray-900">Active</Text>
              </View>
            </View>
          </View>

          {/* Printer Settings Button */}
          <TouchableOpacity
            onPress={() => setShowPrinterSettings(true)}
            className="bg-white rounded-2xl py-4 mb-3 flex-row items-center justify-between px-4"
            style={{ elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 }}
          >
            <View className="flex-row items-center">
              <Ionicons name="print" size={24} color="#3B82F6" />
              <Text className="text-gray-900 font-semibold text-base ml-3">Printer Settings</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>

          {/* Logout Button */}
          <TouchableOpacity
            onPress={handleLogout}
            className="bg-white rounded-2xl py-4 mb-4"
            style={{ elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, borderWidth: 1, borderColor: '#FEE2E2' }}
          >
            <Text className="text-red-600 text-center font-bold text-base">Logout</Text>
          </TouchableOpacity>

          {/* App Info */}
          <View className="items-center py-4">
            <Text className="text-gray-400 text-xs">Diyaa Stock Management</Text>
            <Text className="text-gray-400 text-xs mt-1">Version 1.0.0</Text>
          </View>
        </View>
      </ScrollView>

      {/* Printer Settings Modal */}
      <Modal
        visible={showPrinterSettings}
        animationType="slide"
        presentationStyle="fullScreen"
      >
        <PrinterSettingsScreen onClose={() => setShowPrinterSettings(false)} />
      </Modal>
    </SafeAreaView>
  );
}
