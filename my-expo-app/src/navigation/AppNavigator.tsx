import React, { useState } from 'react';
import { View, TouchableOpacity } from 'react-native';
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
      
      {/* Ultra-Modern Floating Bottom Navigation */}
      <SafeAreaView edges={['bottom']} style={{ backgroundColor: 'transparent' }}>
        <View className="px-4 pb-2">
          <View 
            className="flex-row bg-white rounded-3xl px-2 py-3" 
            style={{ 
              elevation: 16, 
              shadowColor: '#000', 
              shadowOffset: { width: 0, height: -8 }, 
              shadowOpacity: 0.15, 
              shadowRadius: 24 
            }}
          >
            <TouchableOpacity
              className="flex-1 items-center justify-center"
              onPress={() => setActiveTab('dashboard')}
              activeOpacity={0.7}
            >
              <View className={`px-6 py-3 rounded-full items-center justify-center ${activeTab === 'dashboard' ? 'bg-blue-600' : ''}`}
                style={activeTab === 'dashboard' ? {
                  shadowColor: '#3B82F6',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.4,
                  shadowRadius: 12,
                  elevation: 8
                } : {}}
              >
                <Ionicons 
                  name={activeTab === 'dashboard' ? 'home' : 'home-outline'} 
                  size={26} 
                  color={activeTab === 'dashboard' ? '#FFFFFF' : '#9CA3AF'} 
                />
              </View>
              {activeTab === 'dashboard' && (
                <View className="absolute -bottom-1 w-1 h-1 bg-blue-600 rounded-full" />
              )}
            </TouchableOpacity>
            
            <TouchableOpacity
              className="flex-1 items-center justify-center"
              onPress={() => setActiveTab('pos')}
              activeOpacity={0.7}
            >
              <View className={`px-6 py-3 rounded-full items-center justify-center ${activeTab === 'pos' ? 'bg-blue-600' : ''}`}
                style={activeTab === 'pos' ? {
                  shadowColor: '#3B82F6',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.4,
                  shadowRadius: 12,
                  elevation: 8
                } : {}}
              >
                <Ionicons 
                  name={activeTab === 'pos' ? 'cart' : 'cart-outline'} 
                  size={26} 
                  color={activeTab === 'pos' ? '#FFFFFF' : '#9CA3AF'} 
                />
              </View>
              {activeTab === 'pos' && (
                <View className="absolute -bottom-1 w-1 h-1 bg-blue-600 rounded-full" />
              )}
            </TouchableOpacity>
            
            <TouchableOpacity
              className="flex-1 items-center justify-center"
              onPress={() => setActiveTab('history')}
              activeOpacity={0.7}
            >
              <View className={`px-6 py-3 rounded-full items-center justify-center ${activeTab === 'history' ? 'bg-blue-600' : ''}`}
                style={activeTab === 'history' ? {
                  shadowColor: '#3B82F6',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.4,
                  shadowRadius: 12,
                  elevation: 8
                } : {}}
              >
                <Ionicons 
                  name={activeTab === 'history' ? 'receipt' : 'receipt-outline'} 
                  size={26} 
                  color={activeTab === 'history' ? '#FFFFFF' : '#9CA3AF'} 
                />
              </View>
              {activeTab === 'history' && (
                <View className="absolute -bottom-1 w-1 h-1 bg-blue-600 rounded-full" />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              className="flex-1 items-center justify-center"
              onPress={() => setActiveTab('profile')}
              activeOpacity={0.7}
            >
              <View className={`px-6 py-3 rounded-full items-center justify-center ${activeTab === 'profile' ? 'bg-blue-600' : ''}`}
                style={activeTab === 'profile' ? {
                  shadowColor: '#3B82F6',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.4,
                  shadowRadius: 12,
                  elevation: 8
                } : {}}
              >
                <Ionicons 
                  name={activeTab === 'profile' ? 'person' : 'person-outline'} 
                  size={26} 
                  color={activeTab === 'profile' ? '#FFFFFF' : '#9CA3AF'} 
                />
              </View>
              {activeTab === 'profile' && (
                <View className="absolute -bottom-1 w-1 h-1 bg-blue-600 rounded-full" />
              )}
            </TouchableOpacity>
          </View>
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
