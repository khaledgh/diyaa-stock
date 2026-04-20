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
  StatusBar,
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
  const [dashboard, setDashboard] = useState<any>({});
  const [receivables, setReceivables] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState<number | null>(null);
  const [showCommissionReport, setShowCommissionReport] = useState(false);
  const [commissionPeriod, setCommissionPeriod] = useState<'week' | 'month' | 'custom'>('week');
  const [reportData, setReportData] = useState<any[]>([]);
  const [reportLoading, setReportLoading] = useState(false);
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const isAdmin = user?.role === 'admin';

  const loadDashboardData = useCallback(async () => {
    try {
      const [dashRes, recvRes] = await Promise.all([
        apiService.getDashboardReport(),
        apiService.getReceivables(),
      ]);

      if (dashRes?.data) setDashboard(dashRes.data);

      const recvList = recvRes?.data?.receivables || recvRes?.data || [];
      setReceivables(Array.isArray(recvList) ? recvList.slice(0, 10) : []);
    } catch {
      // fail silently
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadLocations = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const resp = await apiService.getLocations();
      if (resp.data) setLocations(resp.data);
    } catch {}
  }, [isAdmin]);

  useEffect(() => {
    loadDashboardData();
    loadLocations();
  }, [loadDashboardData, loadLocations]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadDashboardData(), loadLocations()]);
    setRefreshing(false);
  }, [loadDashboardData, loadLocations]);

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
    <SafeAreaView edges={['top']} className="flex-1 bg-[#F0F4FF]">
      <StatusBar barStyle="light-content" />
      <ScrollView
        className="flex-1"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#4F46E5']} tintColor="#4F46E5" />}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        {/* ── Header gradient ── */}
        <LinearGradient
          colors={['#3730A3', '#4F46E5', '#6366F1']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 70, borderBottomLeftRadius: 32, borderBottomRightRadius: 32 }}
        >
          {/* Top row */}
          <View className="flex-row justify-between items-center mb-6">
            <View>
              <Text className="text-indigo-200 text-xs font-bold uppercase tracking-widest">Business Overview</Text>
              <Text className="text-white text-2xl font-black mt-0.5">
                Hi, {user?.full_name?.split(' ')[0] || 'Merchant'} 👋
              </Text>
            </View>
            <TouchableOpacity className="w-11 h-11 bg-white/15 rounded-2xl items-center justify-center">
              <Ionicons name="notifications-outline" size={22} color="white" />
            </TouchableOpacity>
          </View>

          {/* Branch filter */}
          {isAdmin && locations.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
              <View className="flex-row gap-2">
                <TouchableOpacity
                  onPress={() => setSelectedLocationId(null)}
                  className={`px-4 py-2 rounded-full ${!selectedLocationId ? 'bg-white' : 'bg-white/20'}`}>
                  <Text className={`text-xs font-bold ${!selectedLocationId ? 'text-indigo-700' : 'text-white'}`}>All Branches</Text>
                </TouchableOpacity>
                {locations.map((loc: any) => (
                  <TouchableOpacity
                    key={loc.id}
                    onPress={() => setSelectedLocationId(loc.id)}
                    className={`px-4 py-2 rounded-full ${selectedLocationId === loc.id ? 'bg-white' : 'bg-white/20'}`}>
                    <Text className={`text-xs font-bold ${selectedLocationId === loc.id ? 'text-indigo-700' : 'text-white'}`}>{loc.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          )}

          {/* Hero KPI */}
          <View className="bg-white/15 rounded-3xl p-5 border border-white/20">
            <Text className="text-indigo-200 text-[10px] font-bold uppercase tracking-widest mb-1">Today's Sales</Text>
            <Text className="text-white text-4xl font-black tracking-tight">
              ${(dashboard.today_sales_total || 0).toFixed(2)}
            </Text>
            <View className="bg-emerald-400 self-start px-3 py-1 rounded-full mt-2 flex-row items-center">
              <Ionicons name="receipt-outline" size={12} color="white" />
              <Text className="text-white text-xs font-bold ml-1">{dashboard.today_sales_count || 0} invoices</Text>
            </View>

            {/* Sub-stats */}
            <View className="flex-row mt-5 pt-4 border-t border-white/20">
              <View className="flex-1 items-center">
                <Text className="text-white/50 text-[9px] font-bold uppercase tracking-wider mb-1">Monthly</Text>
                <Text className="text-white font-black text-base">${(dashboard.product_revenue || 0).toFixed(0)}</Text>
              </View>
              <View className="w-px bg-white/20" />
              <View className="flex-1 items-center">
                <Text className="text-white/50 text-[9px] font-bold uppercase tracking-wider mb-1">Collected</Text>
                <Text className="text-white font-black text-base">${(dashboard.today_collections || 0).toFixed(0)}</Text>
              </View>
              <View className="w-px bg-white/20" />
              <View className="flex-1 items-center">
                <Text className="text-white/50 text-[9px] font-bold uppercase tracking-wider mb-1">Receivables</Text>
                <Text className="text-rose-300 font-black text-base">${(dashboard.pending_payments || 0).toFixed(0)}</Text>
              </View>
            </View>
          </View>
        </LinearGradient>

        {/* ── Cards pulled up ── */}
        <View style={{ marginTop: -44, paddingHorizontal: 16 }}>
          {/* Quick Actions */}
          <View className="flex-row gap-3 mb-4">
            <TouchableOpacity
              onPress={() => navigation.navigate('Sales')}
              className="flex-1 bg-white rounded-3xl p-4 items-center"
              style={{ elevation: 4, shadowColor: '#6366F1', shadowOpacity: 0.12, shadowRadius: 12 }}>
              <View className="w-12 h-12 bg-indigo-100 rounded-2xl items-center justify-center mb-2">
                <Ionicons name="cart-outline" size={24} color="#4F46E5" />
              </View>
              <Text className="text-gray-900 font-black text-sm">POS Sale</Text>
              <Text className="text-gray-400 text-[11px]">New invoice</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => navigation.navigate('Purchase')}
              className="flex-1 bg-white rounded-3xl p-4 items-center"
              style={{ elevation: 4, shadowColor: '#10B981', shadowOpacity: 0.12, shadowRadius: 12 }}>
              <View className="w-12 h-12 bg-emerald-100 rounded-2xl items-center justify-center mb-2">
                <Ionicons name="cube-outline" size={24} color="#10B981" />
              </View>
              <Text className="text-gray-900 font-black text-sm">Purchase</Text>
              <Text className="text-gray-400 text-[11px]">Add stock</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => navigation.navigate('Customers')}
              className="flex-1 bg-white rounded-3xl p-4 items-center"
              style={{ elevation: 4, shadowColor: '#F43F5E', shadowOpacity: 0.12, shadowRadius: 12 }}>
              <View className="w-12 h-12 bg-rose-100 rounded-2xl items-center justify-center mb-2">
                <Ionicons name="people-outline" size={24} color="#F43F5E" />
              </View>
              <Text className="text-gray-900 font-black text-sm">Customers</Text>
              <Text className="text-gray-400 text-[11px]">Accounts</Text>
            </TouchableOpacity>
          </View>

          {/* ── KPI row ── */}
          <View className="flex-row gap-3 mb-4">
            <View className="flex-1 bg-white rounded-2xl p-4"
              style={{ elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8 }}>
              <Ionicons name="cube" size={20} color="#10B981" />
              <Text className="text-gray-500 text-[10px] font-bold uppercase tracking-wider mt-2 mb-1">Stock Value</Text>
              <Text className="text-gray-900 font-black text-lg">${(dashboard.inventory_value || 0).toFixed(0)}</Text>
              {(dashboard.low_stock_count || 0) > 0 && (
                <Text className="text-orange-500 text-[10px] font-bold mt-1">{dashboard.low_stock_count} low</Text>
              )}
            </View>

            <View className="flex-1 bg-white rounded-2xl p-4"
              style={{ elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8 }}>
              <Ionicons name="arrow-up-circle" size={20} color="#F59E0B" />
              <Text className="text-gray-500 text-[10px] font-bold uppercase tracking-wider mt-2 mb-1">Payables</Text>
              <Text className="text-gray-900 font-black text-lg">${(dashboard.payables || 0).toFixed(0)}</Text>
              <Text className="text-gray-400 text-[10px] mt-1">Owed to vendors</Text>
            </View>
          </View>

          {/* ── More stats row ── */}
          <View className="flex-row gap-3 mb-4">
            <View className="flex-1 bg-white rounded-2xl p-4"
              style={{ elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8 }}>
              <Ionicons name="document-text-outline" size={20} color="#6366F1" />
              <Text className="text-gray-500 text-[10px] font-bold uppercase tracking-wider mt-2 mb-1">Credit Notes</Text>
              <Text className="text-gray-900 font-black text-lg">{dashboard.credit_notes_total || 0}</Text>
              <Text className="text-orange-400 text-[10px] mt-1">{dashboard.credit_notes_pending || 0} pending</Text>
            </View>

            <View className="flex-1 bg-white rounded-2xl p-4"
              style={{ elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8 }}>
              <Ionicons name="storefront-outline" size={20} color="#8B5CF6" />
              <Text className="text-gray-500 text-[10px] font-bold uppercase tracking-wider mt-2 mb-1">Locations</Text>
              <Text className="text-gray-900 font-black text-lg">{dashboard.active_locations || 0}</Text>
              <Text className="text-gray-400 text-[10px] mt-1">Active branches</Text>
            </View>
          </View>

          {/* ── Commission report (admin) ── */}
          {isAdmin && (
            <TouchableOpacity
              onPress={() => openCommissionReport('week')}
              className="bg-indigo-600 rounded-3xl p-5 mb-4 flex-row items-center justify-between overflow-hidden"
              style={{ elevation: 6, shadowColor: '#4F46E5', shadowOpacity: 0.3, shadowRadius: 12 }}>
              <View className="absolute -right-6 -bottom-6 w-28 h-28 bg-white/10 rounded-full" />
              <View className="flex-row items-center">
                <View className="w-12 h-12 bg-white/20 rounded-2xl items-center justify-center mr-4">
                  <Ionicons name="bar-chart-outline" size={24} color="white" />
                </View>
                <View>
                  <Text className="text-indigo-200 text-[10px] font-bold uppercase tracking-wider">Staff Performance</Text>
                  <Text className="text-white font-black text-lg">Commission Report</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={22} color="rgba(255,255,255,0.6)" />
            </TouchableOpacity>
          )}

          {/* ── Top Receivables ── */}
          {receivables.length > 0 && (
            <View className="bg-white rounded-3xl p-5 mb-4"
              style={{ elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8 }}>
              <View className="flex-row justify-between items-center mb-4">
                <Text className="text-gray-900 font-black text-base">Top Receivables</Text>
                <TouchableOpacity onPress={() => navigation.navigate('Customers')}>
                  <Text className="text-indigo-600 text-sm font-bold">View All →</Text>
                </TouchableOpacity>
              </View>
              {receivables.slice(0, 5).map((item: any, idx: number) => (
                <TouchableOpacity
                  key={`${item.id}-${idx}`}
                  onPress={() => item.customer_id && navigation.navigate('CustomerDetail', { customerId: item.customer_id })}
                  className="flex-row items-center justify-between py-3 border-b border-gray-50">
                  <View className="flex-1">
                    <Text className="text-sm font-bold text-gray-900" numberOfLines={1}>{item.customer_name || 'Customer'}</Text>
                    <Text className="text-[11px] text-gray-400">{item.invoice_number}</Text>
                  </View>
                  <Text className="text-base font-black text-rose-500">${(item.balance || 0).toFixed(2)}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Commission Report Modal */}
      <Modal visible={showCommissionReport} animationType="slide" transparent>
        <View className="flex-1 bg-black/60 justify-end">
          <TouchableOpacity className="flex-1" onPress={() => setShowCommissionReport(false)} />
          <View className="bg-white rounded-t-[40px] px-6 pt-4 pb-10" style={{ maxHeight: '85%' }}>
            <View className="w-12 h-1.5 bg-gray-200 rounded-full self-center mb-5" />
            <View className="flex-row justify-between items-center mb-6">
              <View>
                <Text className="text-xs text-gray-400 font-bold uppercase tracking-wider">Analytics</Text>
                <Text className="text-2xl font-black text-gray-900">Commission Report</Text>
              </View>
              <TouchableOpacity onPress={() => setShowCommissionReport(false)} className="w-10 h-10 bg-gray-100 rounded-full items-center justify-center">
                <Ionicons name="close" size={20} color="#374151" />
              </TouchableOpacity>
            </View>

            <View className="flex-row bg-gray-100 p-1 rounded-2xl mb-5">
              {(['week', 'month', 'custom'] as const).map(p => (
                <TouchableOpacity
                  key={p}
                  onPress={() => { setCommissionPeriod(p); if (p !== 'custom') loadCommissionReport(p); }}
                  className={`flex-1 py-3 rounded-xl items-center ${commissionPeriod === p ? 'bg-white' : ''}`}
                  style={commissionPeriod === p ? { elevation: 2 } : {}}>
                  <Text className={`font-bold text-xs uppercase ${commissionPeriod === p ? 'text-gray-900' : 'text-gray-500'}`}>{p}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {reportLoading ? (
              <View className="py-16"><ActivityIndicator color="#4F46E5" size="large" /></View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
                {reportData.map((rep: any) => (
                  <View key={rep.user_id} className="flex-row items-center justify-between py-4 border-b border-gray-50">
                    <View className="flex-row items-center flex-1">
                      <View className="w-10 h-10 bg-indigo-100 rounded-2xl items-center justify-center mr-3">
                        <Text className="text-indigo-700 font-black">{(rep.name || 'U').charAt(0)}</Text>
                      </View>
                      <View className="flex-1">
                        <Text className="text-gray-900 font-bold text-sm">{rep.name || 'User'}</Text>
                        <Text className="text-gray-400 text-xs">${(rep.total_sales || 0).toFixed(0)} sales</Text>
                      </View>
                    </View>
                    <Text className="text-indigo-600 font-black text-lg">${(rep.commission_owed || 0).toFixed(2)}</Text>
                  </View>
                ))}
                {reportData.length === 0 && (
                  <View className="items-center py-16">
                    <Ionicons name="file-tray-outline" size={40} color="#D1D5DB" />
                    <Text className="text-gray-400 font-bold mt-3">No data for this period</Text>
                  </View>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
