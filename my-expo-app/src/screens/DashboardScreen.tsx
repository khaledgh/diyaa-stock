import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import apiService from '../services/api.service';

import { LinearGradient } from 'expo-linear-gradient';

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
  const [showCommissionReport, setShowCommissionReport] = useState(false);
  const [commissionPeriod, setCommissionPeriod] = useState<'week' | 'month' | 'custom'>('week');
  const [reportData, setReportData] = useState<any[]>([]);
  const [reportLoading, setReportLoading] = useState(false);
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const isAdmin = user?.role === 'admin';

  const loadDashboardData = useCallback(async () => {
    try {
      const locationForQuery = isAdmin ? selectedLocationId : user?.location_id;
      if (!isAdmin && !user?.location_id) {
        setIsLoading(false);
        return;
      }

      const invoiceParams: any = {
        invoice_type: 'sales',
        limit: 500,
        offset: 0,
      };

      if (locationForQuery) {
        invoiceParams.location_id = locationForQuery;
      }

      const invoicesResponse = await apiService.getInvoices(invoiceParams);

      if (invoicesResponse.ok || invoicesResponse.success) {
        const invoices = invoicesResponse.invoices?.data || invoicesResponse.data?.data || [];
        const now = new Date();
        const todayStart = new Date(now.setHours(0, 0, 0, 0));
        const weekStart = new Date(new Date().setDate(new Date().getDate() - 7));
        const monthStart = new Date(new Date().setDate(new Date().getDate() - 30));

        let todaySales = 0, weekSales = 0, monthSales = 0;
        let todayProfit = 0, weekProfit = 0, monthProfit = 0;
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
          todaySales, weekSales, monthSales,
          todayProfit, weekProfit, monthProfit,
          totalInvoices: invoices.length,
          pendingAmount,
          stockValue: 0,
        });
      }
    } catch {
      // fail silently
    } finally {
      setIsLoading(false);
    }
  }, [user, isAdmin, selectedLocationId]);

  const loadLocations = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const resp = await apiService.getLocations();
      if (resp.data) setLocations(resp.data);
    } catch {}
  }, [isAdmin]);

  const loadCommissions = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const resp = await apiService.getCommissions();
      if (resp?.data) setCommissionData(resp.data);
    } catch {}
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

  const getDateRange = (period: 'week' | 'month' | 'custom') => {
    const now = new Date();
    const to = now.toISOString().split('T')[0];
    if (period === 'week') {
      const from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      return { from_date: from, to_date: to };
    }
    if (period === 'month') {
      const from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      return { from_date: from, to_date: to };
    }
    return { from_date: customFrom, to_date: customTo };
  };

  const loadCommissionReport = async (period?: 'week' | 'month' | 'custom') => {
    const p = period || commissionPeriod;
    if (p === 'custom' && (!customFrom || !customTo)) return;
    try {
      setReportLoading(true);
      const params = getDateRange(p);
      const resp = await apiService.getCommissions(params);
      setReportData(resp?.data || []);
    } catch {
      setReportData([]);
    } finally {
      setReportLoading(false);
    }
  };

  const openCommissionReport = (period: 'week' | 'month' | 'custom') => {
    setCommissionPeriod(period);
    setShowCommissionReport(true);
    if (period !== 'custom') loadCommissionReport(period);
  };

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-gray-50">
      <ScrollView
        className="flex-1"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#4F46E5']} />}
      >
        <LinearGradient colors={['#4F46E5', '#3730A3']} className="px-6 pt-8 pb-10 rounded-b-[40px]">
          <View className="flex-row justify-between items-center mb-6">
            <View>
              <Text className="text-white/70 text-sm font-medium">Welcome back,</Text>
              <Text className="text-white text-2xl font-bold">{user?.full_name || 'Merchant'}</Text>
            </View>
            <TouchableOpacity className="w-12 h-12 bg-white/20 rounded-2xl items-center justify-center backdrop-blur-md">
              <Ionicons name="notifications" size={24} color="white" />
            </TouchableOpacity>
          </View>

          {isAdmin && locations.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-6">
              <View className="flex-row gap-2">
                <TouchableOpacity
                  onPress={() => setSelectedLocationId(null)}
                  className={`px-4 py-2 rounded-xl backdrop-blur-md border ${!selectedLocationId ? 'bg-white border-white' : 'bg-white/10 border-white/20'}`}
                >
                  <Text className={`font-bold text-xs ${!selectedLocationId ? 'text-indigo-600' : 'text-white'}`}>All Branches</Text>
                </TouchableOpacity>
                {locations.map((loc: any) => (
                  <TouchableOpacity
                    key={loc.id}
                    onPress={() => setSelectedLocationId(loc.id)}
                    className={`px-4 py-2 rounded-xl backdrop-blur-md border ${selectedLocationId === loc.id ? 'bg-white border-white' : 'bg-white/10 border-white/20'}`}
                  >
                    <Text className={`font-bold text-xs ${selectedLocationId === loc.id ? 'text-indigo-600' : 'text-white'}`}>{loc.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          )}

          <View className="bg-white/10 p-6 rounded-3xl backdrop-blur-xl border border-white/20">
            <Text className="text-white/80 text-xs font-bold uppercase tracking-widest mb-1">Today's Revenue</Text>
            <View className="flex-row items-baseline">
              <Text className="text-white text-4xl font-black">${stats.todaySales.toFixed(2)}</Text>
              <View className="ml-3 bg-emerald-400/20 px-2 py-1 rounded-lg">
                <Text className="text-emerald-300 text-[10px] font-bold">+12.5%</Text>
              </View>
            </View>
            <View className="mt-4 flex-row justify-between items-center">
              <View>
                <Text className="text-white/60 text-[10px] uppercase font-bold">Week Profit</Text>
                <Text className="text-white font-bold">${stats.weekProfit.toFixed(1)}</Text>
              </View>
              <View className="w-px h-8 bg-white/10" />
              <View>
                <Text className="text-white/60 text-[10px] uppercase font-bold">Month Invoices</Text>
                <Text className="text-white font-bold">{stats.totalInvoices}</Text>
              </View>
              <View className="w-px h-8 bg-white/10" />
              <View>
                <Text className="text-white/60 text-[10px] uppercase font-bold">Pending</Text>
                <Text className="text-white font-bold">${stats.pendingAmount.toFixed(0)}</Text>
              </View>
            </View>
          </View>
        </LinearGradient>

        <View className="px-6 -mt-8 pb-10">
          <View className="flex-row gap-4 mb-6">
            <TouchableOpacity 
              onPress={() => navigation.navigate('Sales')}
              className="flex-1 bg-white p-5 rounded-3xl shadow-sm border border-gray-100"
            >
              <View className="w-10 h-10 bg-indigo-50 rounded-xl items-center justify-center mb-3">
                <Ionicons name="cart" size={20} color="#4F46E5" />
              </View>
              <Text className="text-gray-900 font-bold">New Sale</Text>
              <Text className="text-gray-400 text-[10px] mt-1">Open POS Screen</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={() => navigation.navigate('Purchase')}
              className="flex-1 bg-white p-5 rounded-3xl shadow-sm border border-gray-100"
            >
              <View className="w-10 h-10 bg-emerald-50 rounded-xl items-center justify-center mb-3">
                <Ionicons name="cube" size={20} color="#10B981" />
              </View>
              <Text className="text-gray-900 font-bold">Stock Hub</Text>
              <Text className="text-gray-400 text-[10px] mt-1">Manage Products</Text>
            </TouchableOpacity>
          </View>

          <Text className="text-gray-900 text-lg font-bold mb-4">Quick Statistics</Text>
          <View className="space-y-4">
            <View className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex-row items-center justify-between">
              <View className="flex-row items-center">
                <View className="w-12 h-12 bg-blue-50 rounded-2xl items-center justify-center mr-4">
                  <Ionicons name="trending-up" size={24} color="#3B82F6" />
                </View>
                <View>
                  <Text className="text-gray-400 text-xs font-medium">Growth Rate</Text>
                  <Text className="text-gray-900 font-bold text-lg">+24%</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#D1D5DB" />
            </View>

            <View className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex-row items-center justify-between">
              <View className="flex-row items-center">
                <View className="w-12 h-12 bg-purple-50 rounded-2xl items-center justify-center mr-4">
                  <Ionicons name="people" size={24} color="#8B5CF6" />
                </View>
                <View>
                  <Text className="text-gray-400 text-xs font-medium">Active Customers</Text>
                  <Text className="text-gray-900 font-bold text-lg">1,280</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#D1D5DB" />
            </View>
            
            {isAdmin && (
              <TouchableOpacity
                onPress={() => openCommissionReport('week')}
                className="bg-indigo-600 p-5 rounded-3xl flex-row items-center justify-between shadow-lg shadow-indigo-200"
              >
                <View className="flex-row items-center">
                  <View className="w-12 h-12 bg-white/20 rounded-2xl items-center justify-center mr-4">
                    <Ionicons name="document-text" size={24} color="white" />
                  </View>
                  <View>
                    <Text className="text-indigo-100 text-xs font-medium uppercase tracking-widest">Reporting</Text>
                    <Text className="text-white font-bold text-lg">Commissions</Text>
                  </View>
                </View>
                <Ionicons name="arrow-forward" size={24} color="white" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Commission Report Modal */}
      <Modal visible={showCommissionReport} animationType="slide" transparent>
        <View className="flex-1 bg-black/50 justify-end">
          <TouchableOpacity className="flex-1" onPress={() => setShowCommissionReport(false)} />
          <View className="bg-white rounded-t-[40px] p-8" style={{ maxHeight: '80%' }}>
            <View className="items-center mb-6">
              <View className="w-12 h-1.5 bg-gray-200 rounded-full" />
            </View>
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-2xl font-black text-gray-900">Commission Report</Text>
              <TouchableOpacity onPress={() => setShowCommissionReport(false)} className="w-10 h-10 bg-gray-100 rounded-full items-center justify-center">
                <Ionicons name="close" size={20} color="#374151" />
              </TouchableOpacity>
            </View>
            
            <View className="flex-row gap-2 mb-8">
              {(['week', 'month', 'custom'] as const).map(p => (
                <TouchableOpacity
                  key={p}
                  onPress={() => { setCommissionPeriod(p); if (p !== 'custom') loadCommissionReport(p); }}
                  className={`flex-1 py-3 rounded-2xl items-center ${commissionPeriod === p ? 'bg-indigo-600' : 'bg-gray-100'}`}
                >
                  <Text className={`font-bold capitalize ${commissionPeriod === p ? 'text-white' : 'text-gray-500'}`}>{p}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {reportLoading ? (
              <ActivityIndicator color="#4F46E5" size="large" className="py-20" />
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                {reportData.map((rep: any) => (
                  <View key={rep.user_id} className="bg-gray-50 p-4 rounded-2xl mb-3 flex-row items-center justify-between">
                    <View className="flex-row items-center flex-1">
                      <View className="w-10 h-10 bg-indigo-100 rounded-full items-center justify-center mr-3">
                        <Text className="text-indigo-700 font-bold">{(rep.name || 'U').charAt(0)}</Text>
                      </View>
                      <View className="flex-1">
                        <Text className="text-gray-900 font-bold">{rep.name || 'User'}</Text>
                        <Text className="text-gray-400 text-xs">${(rep.total_sales || 0).toFixed(0)} sales</Text>
                      </View>
                    </View>
                    <Text className="text-indigo-600 font-black text-lg">${(rep.commission_owed || 0).toFixed(2)}</Text>
                  </View>
                ))}
                {reportData.length === 0 && <Text className="text-center text-gray-400 py-10">No records found</Text>}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
