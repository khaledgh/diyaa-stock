import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import apiService from '../services/api.service';

const { width } = Dimensions.get('window');

export default function DashboardScreen() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    todaySales: 0,
    weekSales: 0,
    monthSales: 0,
    totalInvoices: 0,
    pendingAmount: 0,
    stockValue: 0,
  });

  const loadDashboardData = useCallback(async () => {
    try {
      // Load invoices for stats
      const invoicesResponse = await apiService.getInvoices({
        van_id: user?.van_id,
        invoice_type: 'sales',
        limit: 100,
        offset: 0,
      });

      if (invoicesResponse.success) {
        const invoices = invoicesResponse.data?.data || [];
        
        const now = new Date();
        const todayStart = new Date(now.setHours(0, 0, 0, 0));
        const weekStart = new Date(now.setDate(now.getDate() - 7));
        const monthStart = new Date(now.setDate(now.getDate() - 30));

        let todaySales = 0;
        let weekSales = 0;
        let monthSales = 0;
        let pendingAmount = 0;

        invoices.forEach((invoice: any) => {
          const invoiceDate = new Date(invoice.created_at);
          const total = parseFloat(invoice.total_amount) || 0;
          const paid = parseFloat(invoice.paid_amount) || 0;

          if (invoiceDate >= todayStart) todaySales += total;
          if (invoiceDate >= weekStart) weekSales += total;
          if (invoiceDate >= monthStart) monthSales += total;
          
          if (invoice.payment_status !== 'paid') {
            pendingAmount += (total - paid);
          }
        });

        setStats({
          todaySales,
          weekSales,
          monthSales,
          totalInvoices: invoices.length,
          pendingAmount,
          stockValue: 0, // Would need stock endpoint
        });
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.van_id]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  }, [loadDashboardData]);

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text className="mt-4 text-gray-600">Loading dashboard...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="px-4 py-3 bg-white border-b border-gray-100">
        <Text className="text-gray-900 text-xl font-bold">Dashboard</Text>
        <Text className="text-gray-500 text-sm mt-0.5">Van {user?.van_id} Overview</Text>
      </View>

      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#3B82F6']}
            tintColor="#3B82F6"
          />
        }
      >
        <View className="p-4">
          {/* Sales Stats Grid */}
          <View className="mb-4">
            {/* Today Sales - Large Card */}
            <View className="bg-blue-600 rounded-2xl p-5 mb-3" style={{ elevation: 4, shadowColor: '#2563EB', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 }}>
              <View className="flex-row justify-between items-start">
                <View className="flex-1">
                  <Text className="text-blue-100 text-xs font-semibold mb-2">TODAY'S SALES</Text>
                  <Text className="text-white text-4xl font-bold mb-1">${stats.todaySales.toFixed(2)}</Text>
                  <Text className="text-blue-200 text-sm">Current day performance</Text>
                </View>
                <View className="w-16 h-16 bg-white/20 rounded-2xl items-center justify-center">
                  <Text className="text-4xl">💰</Text>
                </View>
              </View>
            </View>

            {/* Stats Row */}
            <View className="flex-row gap-3 mb-3">
              <View className="flex-1 bg-white rounded-2xl p-4" style={{ elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4 }}>
                <Text className="text-gray-500 text-xs font-medium mb-1">WEEK</Text>
                <Text className="text-gray-900 text-2xl font-bold">${stats.weekSales.toFixed(0)}</Text>
                <Text className="text-green-600 text-xs mt-1">↗ Last 7 days</Text>
              </View>
              
              <View className="flex-1 bg-white rounded-2xl p-4" style={{ elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4 }}>
                <Text className="text-gray-500 text-xs font-medium mb-1">MONTH</Text>
                <Text className="text-gray-900 text-2xl font-bold">${stats.monthSales.toFixed(0)}</Text>
                <Text className="text-blue-600 text-xs mt-1">📅 30 days</Text>
              </View>
            </View>

            {/* Invoices & Pending Row */}
            <View className="flex-row gap-3">
              <View className="flex-1 bg-white rounded-2xl p-4" style={{ elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4 }}>
                <Text className="text-gray-500 text-xs font-medium mb-1">INVOICES</Text>
                <Text className="text-gray-900 text-2xl font-bold">{stats.totalInvoices}</Text>
                <Text className="text-gray-500 text-xs mt-1">Total count</Text>
              </View>
              
              <View className="flex-1 bg-white rounded-2xl p-4" style={{ elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4 }}>
                <Text className="text-gray-500 text-xs font-medium mb-1">PENDING</Text>
                <Text className="text-red-600 text-2xl font-bold">${stats.pendingAmount.toFixed(0)}</Text>
                <Text className="text-gray-500 text-xs mt-1">To collect</Text>
              </View>
            </View>
          </View>

          {/* Simple Bar Chart */}
          <View className="bg-white rounded-3xl p-5 mb-4" style={{ elevation: 2 }}>
            <Text className="text-gray-900 text-lg font-bold mb-4">Sales Overview</Text>
            
            <View className="space-y-3">
              {/* Today Bar */}
              <View>
                <View className="flex-row justify-between mb-1">
                  <Text className="text-gray-600 text-sm">Today</Text>
                  <Text className="text-gray-900 text-sm font-semibold">${stats.todaySales.toFixed(0)}</Text>
                </View>
                <View className="h-3 bg-gray-100 rounded-full overflow-hidden">
                  <View 
                    className="h-full bg-blue-600 rounded-full"
                    style={{ width: `${Math.min((stats.todaySales / stats.monthSales) * 100, 100)}%` }}
                  />
                </View>
              </View>

              {/* Week Bar */}
              <View>
                <View className="flex-row justify-between mb-1">
                  <Text className="text-gray-600 text-sm">This Week</Text>
                  <Text className="text-gray-900 text-sm font-semibold">${stats.weekSales.toFixed(0)}</Text>
                </View>
                <View className="h-3 bg-gray-100 rounded-full overflow-hidden">
                  <View 
                    className="h-full bg-green-600 rounded-full"
                    style={{ width: `${Math.min((stats.weekSales / stats.monthSales) * 100, 100)}%` }}
                  />
                </View>
              </View>

              {/* Month Bar */}
              <View>
                <View className="flex-row justify-between mb-1">
                  <Text className="text-gray-600 text-sm">This Month</Text>
                  <Text className="text-gray-900 text-sm font-semibold">${stats.monthSales.toFixed(0)}</Text>
                </View>
                <View className="h-3 bg-gray-100 rounded-full overflow-hidden">
                  <View className="h-full bg-purple-600 rounded-full" style={{ width: '100%' }} />
                </View>
              </View>
            </View>
          </View>

          {/* Quick Stats */}
          <View className="bg-white rounded-3xl p-5" style={{ elevation: 2 }}>
            <Text className="text-gray-900 text-lg font-bold mb-4">Quick Stats</Text>
            
            <View className="space-y-3">
              <View className="flex-row justify-between items-center py-2">
                <Text className="text-gray-600">Average Sale</Text>
                <Text className="text-gray-900 font-bold">
                  ${stats.totalInvoices > 0 ? (stats.monthSales / stats.totalInvoices).toFixed(2) : '0.00'}
                </Text>
              </View>
              
              <View className="h-px bg-gray-100" />
              
              <View className="flex-row justify-between items-center py-2">
                <Text className="text-gray-600">Collection Rate</Text>
                <Text className="text-green-600 font-bold">
                  {stats.monthSales > 0 
                    ? (((stats.monthSales - stats.pendingAmount) / stats.monthSales) * 100).toFixed(1) 
                    : '0'}%
                </Text>
              </View>
              
              <View className="h-px bg-gray-100" />
              
              <View className="flex-row justify-between items-center py-2">
                <Text className="text-gray-600">Van Assignment</Text>
                <Text className="text-blue-600 font-bold">Van {user?.van_id}</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
