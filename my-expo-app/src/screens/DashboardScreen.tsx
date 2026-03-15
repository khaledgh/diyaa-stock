import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import apiService from '../services/api.service';

export default function DashboardScreen({ navigation }: any) {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    todaySales: 0,
    weekSales: 0,
    monthSales: 0,
    todayProfit: 0,
    weekProfit: 0,
    monthProfit: 0,
    totalInvoices: 0,
    pendingAmount: 0,
    stockValue: 0,
  });
  const [locations, setLocations] = useState<any[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState<number | null>(null);
  const [commissionData, setCommissionData] = useState<any[]>([]);
  const isAdmin = user?.role === 'admin';

  const loadDashboardData = useCallback(async () => {
    try {
      const locationForQuery = isAdmin ? selectedLocationId : user?.location_id;
      console.log('Loading dashboard data for location_id:', locationForQuery);

      if (!isAdmin && !user?.location_id) {
        console.warn('No location_id found for non-admin user. User data:', user);
        setIsLoading(false);
        return;
      }

      // Load invoices for stats
      const invoiceParams: any = {
        invoice_type: 'sales',
        limit: 500,
        offset: 0,
      };

      // Filter by location: for admins use selectedLocationId (null = all), for sales use their assigned location
      if (locationForQuery) {
        invoiceParams.location_id = locationForQuery;
      }

      const invoicesResponse = await apiService.getInvoices(invoiceParams);

      console.log('Invoices response:', invoicesResponse);

      if (invoicesResponse.ok || invoicesResponse.success) {
        const invoices = invoicesResponse.invoices?.data || invoicesResponse.data?.data || [];
        console.log(`Loaded ${invoices.length} invoices for location ${user.location_id}`);

        const now = new Date();
        const todayStart = new Date(now.setHours(0, 0, 0, 0));
        const weekStart = new Date(now.setDate(now.getDate() - 7));
        const monthStart = new Date(now.setDate(now.getDate() - 30));

        let todaySales = 0;
        let weekSales = 0;
        let monthSales = 0;
        let todayProfit = 0;
        let weekProfit = 0;
        let monthProfit = 0;
        let pendingAmount = 0;

        const commissionRate = user?.commission_rate || 0;

        invoices.forEach((invoice: any) => {
          const invoiceDate = new Date(invoice.created_at);
          const total = parseFloat(invoice.total_amount) || 0;
          const paid = parseFloat(invoice.paid_amount) || 0;
          const profitPart = total * (commissionRate / 100);

          if (invoiceDate >= todayStart) {
            todaySales += total;
            todayProfit += profitPart;
          }
          if (invoiceDate >= weekStart) {
            weekSales += total;
            weekProfit += profitPart;
          }
          if (invoiceDate >= monthStart) {
            monthSales += total;
            monthProfit += profitPart;
          }

          if (invoice.payment_status !== 'paid') {
            pendingAmount += (total - paid);
          }
        });

        setStats({
          todaySales,
          weekSales,
          monthSales,
          todayProfit,
          weekProfit,
          monthProfit,
          totalInvoices: invoices.length,
          pendingAmount,
          stockValue: 0, // Would need stock endpoint
        });
      }
    } catch (error: any) {
      console.error('Failed to load dashboard data:', error);
      console.error('Error details:', error.response?.data || error.message);
    } finally {
      setIsLoading(false);
    }
  }, [user, isAdmin, selectedLocationId]);

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

  const loadCommissions = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const resp = await apiService.getCommissions();
      if (resp?.data) {
        setCommissionData(resp.data);
      }
    } catch (_) {
      // Commission API may not exist yet — silently fail
      console.log('Commission API not available yet');
    }
  }, [isAdmin]);

  useEffect(() => {
    loadDashboardData();
    loadLocations();
    loadCommissions();
  }, [loadDashboardData, loadLocations, loadCommissions]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadDashboardData(), loadLocations(), loadCommissions()]);
    setRefreshing(false);
  }, [loadDashboardData, loadLocations, loadCommissions]);

  if (isLoading) {
    return (
      <SafeAreaView edges={['top']} className="flex-1 bg-gray-50">
        <View className="px-4 py-3 bg-white border-b border-gray-100">
          <View className="h-6 bg-gray-200 rounded w-32 mb-1" />
          <View className="h-4 bg-gray-100 rounded w-40" />
        </View>

        <View className="p-4">
          {/* Large card skeleton */}
          <View className="bg-gray-200 rounded-2xl p-5 mb-3 h-32" style={{ elevation: 2 }} />

          {/* Two column skeleton */}
          <View className="flex-row gap-3 mb-3">
            <View className="flex-1 bg-gray-100 rounded-2xl h-24" />
            <View className="flex-1 bg-gray-100 rounded-2xl h-24" />
          </View>

          <View className="flex-row gap-3 mb-3">
            <View className="flex-1 bg-gray-100 rounded-2xl h-24" />
            <View className="flex-1 bg-gray-100 rounded-2xl h-24" />
          </View>

          {/* Chart skeleton */}
          <View className="bg-white rounded-3xl p-5 h-48" style={{ elevation: 2 }}>
            <View className="h-5 bg-gray-200 rounded w-32 mb-4" />
            <View className="space-y-3">
              {[1, 2, 3].map((i) => (
                <View key={i} className="h-3 bg-gray-100 rounded-full" />
              ))}
            </View>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="px-4 py-3 bg-white border-b border-gray-100">
        <Text className="text-gray-900 text-xl font-bold">Dashboard</Text>
        <Text className="text-gray-500 text-sm mt-0.5">
          {isAdmin
            ? (selectedLocationId
              ? locations.find((l: any) => l.id === selectedLocationId)?.name || 'Selected Location'
              : 'All Locations')
            : `Location ${user?.location_id || 'Overview'}`}
        </Text>
        {isAdmin && locations.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-2">
            <View className="flex-row gap-2">
              <TouchableOpacity
                onPress={() => setSelectedLocationId(null)}
                className={`rounded-xl px-3 py-1.5 border ${!selectedLocationId ? 'border-blue-600 bg-blue-50' : 'border-gray-200 bg-white'}`}>
                <Text className={`text-sm font-medium ${!selectedLocationId ? 'text-blue-700' : 'text-gray-600'}`}>All</Text>
              </TouchableOpacity>
              {locations.map((loc: any) => (
                <TouchableOpacity
                  key={loc.id}
                  onPress={() => setSelectedLocationId(loc.id)}
                  className={`rounded-xl px-3 py-1.5 border ${selectedLocationId === loc.id ? 'border-blue-600 bg-blue-50' : 'border-gray-200 bg-white'}`}>
                  <Text className={`text-sm font-medium ${selectedLocationId === loc.id ? 'text-blue-700' : 'text-gray-600'}`}>{loc.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        )}
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
            <View
              className="bg-blue-600 rounded-2xl p-5 mb-3"
              style={{ elevation: 4, shadowColor: '#2563EB', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 }}
            >
              <View className="flex-row justify-between items-start">
                <View className="flex-1">
                  <Text className="text-blue-100 text-xs font-semibold mb-2">TODAY&apos;S SALES</Text>
                  <Text className="text-white text-4xl font-bold mb-1">${stats.todaySales.toFixed(2)}</Text>
                  <Text className="text-blue-200 text-sm">Current day performance</Text>
                </View>
                <View className="w-16 h-16 bg-white/20 rounded-2xl items-center justify-center">
                  <Ionicons name="cash" size={32} color="#FFFFFF" />
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

            {/* Invoices & Profit/Pending Row */}
            <View className="flex-row gap-3">
              <View className="flex-1 bg-white rounded-2xl p-4" style={{ elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4 }}>
                <Text className="text-gray-500 text-xs font-medium mb-1">INVOICES</Text>
                <Text className="text-gray-900 text-2xl font-bold">{stats.totalInvoices}</Text>
                <Text className="text-gray-500 text-xs mt-1">Total count</Text>
              </View>

              {user?.role === 'sales' ? (
                <View className="flex-1 bg-green-50 rounded-2xl p-4 border border-green-100" style={{ elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4 }}>
                  <Text className="text-green-700 text-xs font-bold mb-1">PROFIT ({user?.commission_rate || 0}%)</Text>
                  <Text className="text-green-600 text-2xl font-bold">${stats.monthProfit.toFixed(1)}</Text>
                  <Text className="text-green-700 text-xs mt-1">This month</Text>
                </View>
              ) : (
                <View className="flex-1 bg-white rounded-2xl p-4" style={{ elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4 }}>
                  <Text className="text-gray-500 text-xs font-medium mb-1">PENDING</Text>
                  <Text className="text-red-600 text-2xl font-bold">${stats.pendingAmount.toFixed(0)}</Text>
                  <Text className="text-gray-500 text-xs mt-1">To collect</Text>
                </View>
              )}
            </View>
          </View>

          {/* Simple Bar Chart */}
          <View
            className="bg-white rounded-3xl p-5 mb-4"
            style={{ elevation: 2 }}
          >
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
          <View
            className="bg-white rounded-3xl p-5"
            style={{ elevation: 2 }}
          >
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
                <Text className="text-gray-600">Location Assignment</Text>
                <Text className="text-blue-600 font-bold">{isAdmin ? 'All (Admin)' : `Location ${user?.location_id || 'N/A'}`}</Text>
              </View>
            </View>
          </View>

          {/* Sales Rep Commission Widget - Admin Only */}
          {isAdmin && (
            <View
              className="bg-white rounded-3xl p-5 mt-4"
              style={{ elevation: 2 }}
            >
              <View className="flex-row items-center justify-between mb-4">
                <Text className="text-gray-900 text-lg font-bold">Sales Commissions</Text>
                <View className="bg-purple-100 rounded-full px-3 py-1">
                  <Text className="text-purple-700 text-xs font-bold">
                    {commissionData.length > 0 ? `${commissionData.length} reps` : 'No data'}
                  </Text>
                </View>
              </View>

              {commissionData.length > 0 ? (
                <View className="space-y-3">
                  {commissionData.map((rep: any, index: number) => (
                    <View key={rep.user_id || index}>
                      <View className="flex-row items-center justify-between py-2">
                        <View className="flex-row items-center flex-1">
                          <View className="w-9 h-9 rounded-full bg-blue-100 items-center justify-center mr-3">
                            <Text className="text-blue-600 font-bold text-sm">
                              {(rep.name || 'U').charAt(0).toUpperCase()}
                            </Text>
                          </View>
                          <View className="flex-1">
                            <Text className="text-gray-900 font-semibold text-sm">{rep.name || 'Unknown'}</Text>
                            <Text className="text-gray-400 text-xs">
                              {rep.commission_rate || 0}% rate • ${(rep.total_sales || 0).toFixed(0)} sales
                            </Text>
                          </View>
                        </View>
                        <View className="items-end">
                          <Text className="text-purple-600 font-bold text-base">
                            ${(rep.commission_owed || 0).toFixed(2)}
                          </Text>
                          <Text className="text-gray-400 text-[10px]">owed</Text>
                        </View>
                      </View>
                      {index < commissionData.length - 1 && <View className="h-px bg-gray-100" />}
                    </View>
                  ))}
                </View>
              ) : (
                <View className="items-center py-6">
                  <Ionicons name="people-outline" size={36} color="#D1D5DB" />
                  <Text className="text-gray-400 text-sm mt-2">No commission data available</Text>
                  <Text className="text-gray-300 text-xs mt-1">Configure commissions in the backend</Text>
                </View>
              )}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
