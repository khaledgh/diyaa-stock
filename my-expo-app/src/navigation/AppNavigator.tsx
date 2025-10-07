import React, { useState } from 'react';
import { View, TouchableOpacity, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import LoginScreen from '../screens/LoginScreen';
import DashboardScreen from '../screens/DashboardScreen';
import POSScreen from '../screens/POSScreen';
import HistoryScreen from '../screens/HistoryScreen';
import ProfileScreen from '../screens/ProfileScreen';

function MainApp() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'pos' | 'history' | 'profile'>('dashboard');

  return (
    <View className="flex-1">
      {activeTab === 'dashboard' && <DashboardScreen />}
      {activeTab === 'pos' && <POSScreen />}
      {activeTab === 'history' && <HistoryScreen />}
      {activeTab === 'profile' && <ProfileScreen />}
      
      {/* Bottom Navigation */}
      <SafeAreaView edges={['bottom']} style={{ backgroundColor: '#FFFFFF' }}>
        <View className="flex-row px-2 py-2" style={{ elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.08, shadowRadius: 12 }}>
          <TouchableOpacity
            className="flex-1 items-center"
            onPress={() => setActiveTab('dashboard')}
            activeOpacity={0.7}
          >
            <View className={`px-4 py-2 rounded-full items-center justify-center ${activeTab === 'dashboard' ? 'bg-blue-600' : 'bg-gray-100'}`}>
              <Ionicons 
                name="home" 
                size={22} 
                color={activeTab === 'dashboard' ? '#FFFFFF' : '#6B7280'} 
              />
            </View>
            <Text className={`text-xs font-semibold mt-1.5 ${activeTab === 'dashboard' ? 'text-blue-600' : 'text-gray-500'}`}>
              Home
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            className="flex-1 items-center"
            onPress={() => setActiveTab('pos')}
            activeOpacity={0.7}
          >
            <View className={`px-4 py-2 rounded-full items-center justify-center ${activeTab === 'pos' ? 'bg-blue-600' : 'bg-gray-100'}`}>
              <Ionicons 
                name="cart" 
                size={22} 
                color={activeTab === 'pos' ? '#FFFFFF' : '#6B7280'} 
              />
            </View>
            <Text className={`text-xs font-semibold mt-1.5 ${activeTab === 'pos' ? 'text-blue-600' : 'text-gray-500'}`}>
              POS
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            className="flex-1 items-center"
            onPress={() => setActiveTab('history')}
            activeOpacity={0.7}
          >
            <View className={`px-4 py-2 rounded-full items-center justify-center ${activeTab === 'history' ? 'bg-blue-600' : 'bg-gray-100'}`}>
              <Ionicons 
                name="receipt" 
                size={22} 
                color={activeTab === 'history' ? '#FFFFFF' : '#6B7280'} 
              />
            </View>
            <Text className={`text-xs font-semibold mt-1.5 ${activeTab === 'history' ? 'text-blue-600' : 'text-gray-500'}`}>
              History
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="flex-1 items-center"
            onPress={() => setActiveTab('profile')}
            activeOpacity={0.7}
          >
            <View className={`px-4 py-2 rounded-full items-center justify-center ${activeTab === 'profile' ? 'bg-blue-600' : 'bg-gray-100'}`}>
              <Ionicons 
                name="person" 
                size={22} 
                color={activeTab === 'profile' ? '#FFFFFF' : '#6B7280'} 
              />
            </View>
            <Text className={`text-xs font-semibold mt-1.5 ${activeTab === 'profile' ? 'text-blue-600' : 'text-gray-500'}`}>
              Profile
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

export default function AppNavigator() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return null;
  }

  return isAuthenticated ? <MainApp /> : <LoginScreen />;
}
