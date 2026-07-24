import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, Modal, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { usePrinter } from '../../hooks/usePrinter';
import apiService from '../services/api.service';
import InvoicePreviewModal from '../components/InvoicePreviewModal';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { I18nManager } from 'react-native';
import * as Updates from 'expo-updates';

export default function ProfileScreen({ navigation }: any) {
  const { user, logout } = useAuth();
  const { openPrinterUI } = usePrinter();
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [showCommissionModal, setShowCommissionModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [commissionValue, setCommissionValue] = useState('');
  const { t, i18n } = useTranslation();
  const [showLanguageModal, setShowLanguageModal] = useState(false);

  const handleChangePassword = async () => {
    if (!newPassword || newPassword.length < 4) {
      Alert.alert('Error', 'Password must be at least 4 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }
    try {
      setIsUpdating(true);
      const res = await apiService.updateUser(user!.id, { password: newPassword });
      if (res.ok || res.success) {
        Alert.alert('Success', 'Password updated successfully');
        setShowPasswordModal(false);
        setNewPassword('');
        setConfirmPassword('');
      } else {
        Alert.alert('Error', res.message || 'Failed to update password');
      }
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to update password');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdateCommission = async () => {
    const rate = parseFloat(commissionValue);
    if (isNaN(rate) || rate < 0 || rate > 100) {
      Alert.alert('Error', 'Commission rate must be between 0 and 100');
      return;
    }
    if (!user?.id) return;
    try {
      setIsUpdating(true);
      const res = await apiService.updateUser(user.id, { commission_rate: rate });
      if (res.ok || res.success) {
        Alert.alert('Success', 'Commission rate updated');
        setShowCommissionModal(false);
      } else {
        Alert.alert('Error', res.message || 'Failed to update');
      }
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to update');
    } finally {
      setIsUpdating(false);
    }
  };

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

  const handleLanguageChange = async (lang: 'en' | 'ar') => {
    if (i18n.language === lang) {
      setShowLanguageModal(false);
      return;
    }

    try {
      await AsyncStorage.setItem('user-language', lang);
      const isRTL = lang === 'ar';
      
      // Update i18n instance immediately
      await i18n.changeLanguage(lang);
      
      // Handle RTL
      if (I18nManager.isRTL !== isRTL) {
        I18nManager.allowRTL(isRTL);
        I18nManager.forceRTL(isRTL);
        
        // Give some time for state to settle
        setTimeout(async () => {
          await Updates.reloadAsync();
        }, 500);
      } else {
        setShowLanguageModal(false);
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to change language');
    }
  };

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-white">
      {/* Header */}
      <View className="px-4 py-3 border-b border-gray-100">
        <Text className="text-gray-900 text-xl font-bold">{t('profile.title')}</Text>
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
                <Text className="text-gray-900 text-2xl font-bold">{user?.location_id || '-'}</Text>
                <Text className="text-gray-500 text-xs mt-1">ID</Text>
              </View>
              <View className="w-px h-12 bg-gray-200" />
              <View className="items-center">
                <Text className="text-green-600 text-2xl font-bold">●</Text>
                <Text className="text-gray-500 text-xs mt-1">{t('common.active')}</Text>
              </View>
            </View>
          </View>

          {/* Quick Actions */}
          <View className="bg-white rounded-2xl p-4 mb-4" style={{ elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 }}>
            <Text className="text-sm font-bold text-gray-900 mb-3">{t('profile.accountInfo')}</Text>

            <View className="mb-3 pb-3 border-b border-gray-100">
              <Text className="text-xs text-gray-500 mb-1">{t('auth.email')}</Text>
              <Text className="text-base text-gray-900">{user?.email}</Text>
            </View>

            {user?.locations && user.locations.length > 0 ? (
              <View className="mb-3 pb-3 border-b border-gray-100">
                <Text className="text-xs text-gray-500 mb-1">{t('profile.assignedLocations')}</Text>
                <View className="flex-row flex-wrap gap-1.5 mt-1">
                  {user.locations.map((loc: any) => (
                    <View key={loc.id} className="bg-blue-50 rounded-full px-3 py-1">
                      <Text className="text-xs font-semibold text-blue-700">{loc.name}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : user?.location_id ? (
              <View className="mb-3 pb-3 border-b border-gray-100">
                <Text className="text-xs text-gray-500 mb-1">{t('profile.assignedLocations')}</Text>
                <Text className="text-base text-gray-900 font-semibold">{user.location_name || `Location ${user.location_id}`}</Text>
              </View>
            ) : null}

            {user?.role === 'sales' && user?.commission_rate !== undefined && (
              <View className="mb-3 pb-3 border-b border-gray-100">
                <Text className="text-xs text-gray-500 mb-1">{t('profile.commissionRate')}</Text>
                <View className="flex-row items-center">
                  <Ionicons name="cash-outline" size={18} color="#10B981" />
                  <Text className="text-base text-gray-900 font-semibold ml-2">{user.commission_rate}%</Text>
                </View>
              </View>
            )}

            <View>
              <Text className="text-xs text-gray-500 mb-1">{t('profile.accountStatus')}</Text>
              <View className="flex-row items-center">
                <View className="w-2 h-2 rounded-full bg-green-500 mr-2" />
                <Text className="text-base text-gray-900">{t('common.active')}</Text>
              </View>
            </View>
          </View>

          {/* User Management Button (Admin Only) */}
          {user?.role === 'admin' && (
            <TouchableOpacity
              onPress={() => navigation.navigate('UserManagement')}
              className="bg-white rounded-2xl py-4 mb-3 flex-row items-center justify-between px-4"
              style={{ elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 }}
            >
              <View className="flex-row items-center">
                <Ionicons name="people" size={24} color="#7C3AED" />
                <Text className="text-gray-900 font-semibold text-base ml-3">{t('nav.userManagement')}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          )}

          {/* Customers Button */}
          <TouchableOpacity
            onPress={() => navigation.navigate('Customers')}
            className="bg-white rounded-2xl py-4 mb-3 flex-row items-center justify-between px-4"
            style={{ elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 }}
          >
            <View className="flex-row items-center">
              <Ionicons name="people-circle" size={24} color="#059669" />
              <Text className="text-gray-900 font-semibold text-base ml-3">{t('nav.customers')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>

          {/* Change Password Button */}
          <TouchableOpacity
            onPress={() => setShowPasswordModal(true)}
            className="bg-white rounded-2xl py-4 mb-3 flex-row items-center justify-between px-4"
            style={{ elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 }}
          >
            <View className="flex-row items-center">
              <Ionicons name="lock-closed" size={24} color="#F59E0B" />
              <Text className="text-gray-900 font-semibold text-base ml-3">{t('profile.changePassword')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={openPrinterUI}
            className="bg-white rounded-2xl py-4 mb-3 flex-row items-center justify-between px-4"
            style={{ elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 }}
          >
            <View className="flex-row items-center">
              <Ionicons name="print" size={24} color="#3B82F6" />
              <Text className="text-gray-900 font-semibold text-base ml-3">{t('profile.printer')}</Text>
            </View>
            <Ionicons name={I18nManager.isRTL ? 'chevron-back' : 'chevron-forward'} size={20} color="#9CA3AF" />
          </TouchableOpacity>

          {/* Language Selection */}
          <TouchableOpacity
            onPress={() => setShowLanguageModal(true)}
            className="bg-white rounded-2xl py-4 mb-3 flex-row items-center justify-between px-4"
            style={{ elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 }}
          >
            <View className="flex-row items-center">
              <Ionicons name="language" size={24} color="#10B981" />
              <Text className="text-gray-900 font-semibold text-base ml-3">{t('profile.language')}</Text>
            </View>
            <View className="flex-row items-center">
              <Text className="text-gray-500 text-sm mr-2">{i18n.language === 'ar' ? 'العربية' : 'English'}</Text>
              <Ionicons name={I18nManager.isRTL ? 'chevron-back' : 'chevron-forward'} size={20} color="#9CA3AF" />
            </View>
          </TouchableOpacity>

          {/* Invoice Preview Button */}
          <TouchableOpacity
            onPress={() => setShowPreviewModal(true)}
            className="bg-white rounded-2xl py-4 mb-3 flex-row items-center justify-between px-4"
            style={{ elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 }}
          >
            <View className="flex-row items-center">
              <Ionicons name="eye" size={24} color="#6366F1" />
              <Text className="text-gray-900 font-semibold text-base ml-3">{t('profile.invoicePreview')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>

          {/* Logout Button */}
          <TouchableOpacity
            onPress={handleLogout}
            className="bg-white rounded-2xl py-4 mb-4"
            style={{ elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, borderWidth: 1, borderColor: '#FEE2E2' }}
          >
            <Text className="text-red-600 text-center font-bold text-base">{t('profile.logout')}</Text>
          </TouchableOpacity>

          {/* App Info */}
          <View className="items-center py-4">
            <Text className="text-gray-400 text-xs">DaftarStock</Text>
            <Text className="text-gray-400 text-xs mt-1">Version 1.0.0</Text>
          </View>
        </View>
      </ScrollView>

      {/* Change Password Modal */}
      <Modal visible={showPasswordModal} animationType="fade" transparent onRequestClose={() => setShowPasswordModal(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 }}>
          <View className="bg-white rounded-3xl p-6">
            <Text className="text-xl font-bold text-gray-900 mb-4">{t('profile.changePassword')}</Text>
            <View className="mb-4">
              <Text className="text-xs text-gray-500 font-bold mb-1">{t('profile.newPassword')}</Text>
              <TextInput
                className="border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900"
                secureTextEntry
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="Enter new password"
              />
            </View>
            <View className="mb-6">
              <Text className="text-xs text-gray-500 font-bold mb-1">{t('profile.confirmPassword')}</Text>
              <TextInput
                className="border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900"
                secureTextEntry
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Confirm new password"
              />
            </View>
            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={() => { setShowPasswordModal(false); setNewPassword(''); setConfirmPassword(''); }}
                className="flex-1 h-12 items-center justify-center bg-gray-100 rounded-xl"
              >
                <Text className="text-gray-700 font-bold">{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleChangePassword}
                disabled={isUpdating}
                className={`flex-1 h-12 items-center justify-center rounded-xl ${isUpdating ? 'bg-yellow-300' : 'bg-yellow-500'}`}
              >
                {isUpdating ? <ActivityIndicator color="white" /> : <Text className="text-white font-bold">{t('common.update')}</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Commission Modal (admin) */}
      <Modal visible={showCommissionModal} animationType="fade" transparent onRequestClose={() => setShowCommissionModal(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 }}>
          <View className="bg-white rounded-3xl p-6">
            <Text className="text-xl font-bold text-gray-900 mb-4">{t('profile.updateCommissionRate')}</Text>
            <View className="mb-6">
              <Text className="text-xs text-gray-500 font-bold mb-1">COMMISSION (%)</Text>
              <TextInput
                className="border border-gray-200 rounded-xl px-4 py-3 text-lg font-bold text-gray-900"
                keyboardType="numeric"
                value={commissionValue}
                onChangeText={setCommissionValue}
                placeholder="e.g. 15"
              />
            </View>
            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={() => setShowCommissionModal(false)}
                className="flex-1 h-12 items-center justify-center bg-gray-100 rounded-xl"
              >
                <Text className="text-gray-700 font-bold">{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleUpdateCommission}
                disabled={isUpdating}
                className={`flex-1 h-12 items-center justify-center rounded-xl ${isUpdating ? 'bg-green-300' : 'bg-green-600'}`}
              >
                {isUpdating ? <ActivityIndicator color="white" /> : <Text className="text-white font-bold">{t('common.save')}</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <InvoicePreviewModal 
        visible={showPreviewModal}
        onClose={() => setShowPreviewModal(false)}
        user={user}
      />

      {/* Language Selection Modal */}
      <Modal visible={showLanguageModal} animationType="fade" transparent onRequestClose={() => setShowLanguageModal(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 }}>
          <View className="bg-white rounded-3xl p-6">
            <Text className="text-xl font-bold text-gray-900 mb-2">{t('profile.selectLanguage')}</Text>
            <Text className="text-sm text-gray-500 mb-6">{t('profile.restartNote')}</Text>
            
            <TouchableOpacity 
              onPress={() => handleLanguageChange('en')}
              className={`flex-row items-center justify-between p-4 rounded-2xl mb-3 ${i18n.language === 'en' ? 'bg-blue-50 border border-blue-100' : 'bg-gray-50'}`}
            >
              <Text className={`font-bold text-lg ${i18n.language === 'en' ? 'text-blue-700' : 'text-gray-700'}`}>English</Text>
              {i18n.language === 'en' && <Ionicons name="checkmark-circle" size={24} color="#2563EB" />}
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={() => handleLanguageChange('ar')}
              className={`flex-row items-center justify-between p-4 rounded-2xl mb-6 ${i18n.language === 'ar' ? 'bg-blue-50 border border-blue-100' : 'bg-gray-50'}`}
            >
              <Text className={`font-bold text-lg ${i18n.language === 'ar' ? 'text-blue-700' : 'text-gray-700'}`}>العربية</Text>
              {i18n.language === 'ar' && <Ionicons name="checkmark-circle" size={24} color="#2563EB" />}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setShowLanguageModal(false)}
              className="h-12 items-center justify-center bg-gray-100 rounded-xl"
            >
              <Text className="text-gray-700 font-bold">{t('common.cancel')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
