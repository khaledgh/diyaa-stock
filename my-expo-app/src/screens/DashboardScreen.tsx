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
    <SafeAreaView edges={['top']} className="flex-1 bg-[#F8FAFC]">
      <StatusBar barStyle="light-content" />
      <ScrollView
        className="flex-1"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#4F46E5']} tintColor="#4F46E5" />}
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient 
          colors={['#1E1B4B', '#312E81', '#4338CA']} 
          start={{ x: 0, y: 0 }} 
          end={{ x: 1, y: 1 }}
          className="px-6 pt-10 pb-16 rounded-b-[50px] shadow-2xl shadow-indigo-300"
        >
          <View className="flex-row justify-between items-center mb-8">
            <View>
              <Text className="text-indigo-200 text-xs font-black uppercase tracking-[2px] mb-1">Business Overview</Text>
              <Text className="text-white text-3xl font-black tracking-tighter">
                Hi, {user?.full_name?.split(' ')[0] || 'Merchant'} 👋
              </Text>
            </View>
            <TouchableOpacity className="w-12 h-12 bg-white/10 rounded-2xl items-center justify-center border border-white/20">
              <Ionicons name="notifications" size={22} color="white" />
              <View className="absolute top-2 right-2 w-3 h-3 bg-rose-500 rounded-full border-2 border-[#1E1B4B]" />
            </TouchableOpacity>
          </View>

          {isAdmin && locations.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-8" contentContainerStyle={{ paddingRight: 20 }}>
              <View className="flex-row gap-3">
                <TouchableOpacity
                  onPress={() => setSelectedLocationId(null)}
                  className={`px-5 py-2.5 rounded-2xl border ${!selectedLocationId ? 'bg-white border-white' : 'bg-white/10 border-white/10'}`}
                >
                  <Text className={`font-black text-xs uppercase tracking-tight ${!selectedLocationId ? 'text-indigo-900' : 'text-white/60'}`}>All Branches</Text>
                </TouchableOpacity>
                {locations.map((loc: any) => (
                  <TouchableOpacity
                    key={loc.id}
                    onPress={() => setSelectedLocationId(loc.id)}
                    className={`px-5 py-2.5 rounded-2xl border ${selectedLocationId === loc.id ? 'bg-white border-white' : 'bg-white/10 border-white/10'}`}
                  >
                    <Text className={`font-black text-xs uppercase tracking-tight ${selectedLocationId === loc.id ? 'text-indigo-900' : 'text-white/60'}`}>{loc.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          )}

          <View className="bg-white/10 p-7 rounded-[35px] border border-white/20 relative overflow-hidden">
            <View className="absolute -right-10 -top-10 w-40 h-40 bg-white/5 rounded-full" />
            <Text className="text-indigo-100/60 text-[10px] font-black uppercase tracking-[3px] mb-2">Total Revenue Today</Text>
            <View className="flex-row items-end justify-between">
              <View className="flex-row items-baseline">
                <Text className="text-white text-5xl font-black tracking-tighter">${stats.todaySales.toFixed(0)}</Text>
                <Text className="text-white/60 text-lg font-bold ml-1">.{(stats.todaySales % 1).toFixed(2).substring(2)}</Text>
              </View>
              <View className="bg-emerald-500 px-3 py-1.5 rounded-full flex-row items-center">
                <Ionicons name="trending-up" size={14} color="white" />
                <Text className="text-white text-[10px] font-black ml-1">+12.5%</Text>
              </View>
            </View>

            <View className="mt-8 pt-6 border-t border-white/10 flex-row justify-between items-center">
              <View>
                <Text className="text-white/40 text-[9px] uppercase font-black tracking-widest mb-1">Weekly Profit</Text>
                <Text className="text-white text-lg font-black">${stats.weekProfit.toFixed(0)}</Text>
              </View>
              <View className="w-[1px] h-10 bg-white/10" />
              <View>
                <Text className="text-white/40 text-[9px] uppercase font-black tracking-widest mb-1">Invoices</Text>
                <Text className="text-white text-lg font-black">{stats.totalInvoices}</Text>
              </View>
              <View className="w-[1px] h-10 bg-white/10" />
              <View>
                <Text className="text-white/40 text-[9px] uppercase font-black tracking-widest mb-1">Receivables</Text>
                <Text className="text-rose-300 text-lg font-black">${stats.pendingAmount.toFixed(0)}</Text>
              </View>
            </View>
          </View>
        </LinearGradient>

        <View className="px-6 -mt-10 pb-12">
          {/* Main Actions */}
          <View className="flex-row gap-4 mb-8">
            <TouchableOpacity 
              onPress={() => navigation.navigate('Sales')}
              activeOpacity={0.8}
              className="flex-1 bg-white p-6 rounded-[35px] shadow-xl shadow-indigo-100 border border-slate-50"
            >
              <LinearGradient colors={['#EEF2FF', '#E0E7FF']} className="w-14 h-14 rounded-2xl items-center justify-center mb-4">
                <Ionicons name="cart" size={28} color="#4F46E5" />
              </LinearGradient>
              <Text className="text-slate-900 text-lg font-black tracking-tight">POS</Text>
              <Text className="text-slate-400 text-xs font-semibold mt-1">Terminal</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={() => navigation.navigate('Purchase')}
              activeOpacity={0.8}
              className="flex-1 bg-white p-6 rounded-[35px] shadow-xl shadow-indigo-100 border border-slate-50"
            >
              <LinearGradient colors={['#ECFDF5', '#D1FAE5']} className="w-14 h-14 rounded-2xl items-center justify-center mb-4">
                <Ionicons name="cube" size={28} color="#10B981" />
              </LinearGradient>
              <Text className="text-slate-900 text-lg font-black tracking-tight">Stock</Text>
              <Text className="text-slate-400 text-xs font-semibold mt-1">Inventory</Text>
            </TouchableOpacity>
          </View>

          {/* Quick Stats Grid */}
          <View className="flex-row items-center justify-between mb-5">
            <Text className="text-slate-900 text-xl font-black tracking-tight">Insights</Text>
            <TouchableOpacity>
              <Text className="text-indigo-600 font-bold text-sm">See Trends &rarr;</Text>
            </TouchableOpacity>
          </View>

          <View className="space-y-4">
            <View className="bg-white p-5 rounded-[30px] border border-slate-50 shadow-sm flex-row items-center justify-between">
              <View className="flex-row items-center">
                <View className="w-14 h-14 bg-blue-50 rounded-2xl items-center justify-center mr-4">
                  <Ionicons name="analytics" size={26} color="#3B82F6" />
                </View>
                <View>
                  <Text className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Growth Index</Text>
                  <View className="flex-row items-center">
                    <Text className="text-slate-900 font-black text-xl">+32.4%</Text>
                    <View className="ml-2 bg-blue-100 px-2 py-0.5 rounded-md">
                      <Text className="text-blue-700 text-[10px] font-bold">ALPHA</Text>
                    </View>
                  </View>
                </View>
              </View>
              <View className="w-10 h-10 rounded-full bg-slate-50 items-center justify-center">
                <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
              </View>
            </View>

            <View className="bg-white p-5 rounded-[30px] border border-slate-50 shadow-sm flex-row items-center justify-between">
              <View className="flex-row items-center">
                <View className="w-14 h-14 bg-rose-50 rounded-2xl items-center justify-center mr-4">
                  <Ionicons name="wallet-outline" size={26} color="#F43F5E" />
                </View>
                <View>
                  <Text className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Cash On Hand</Text>
                  <Text className="text-slate-900 font-black text-xl">$14,200</Text>
                </View>
              </View>
              <View className="w-10 h-10 rounded-full bg-slate-50 items-center justify-center">
                <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
              </View>
            </View>
            
            {isAdmin && (
              <TouchableOpacity
                onPress={() => openCommissionReport('week')}
                activeOpacity={0.9}
                className="mt-4 bg-indigo-600 p-7 rounded-[40px] flex-row items-center justify-between shadow-2xl shadow-indigo-200 overflow-hidden"
              >
                <View className="absolute -right-4 -bottom-4 w-32 h-32 bg-white/10 rounded-full" />
                <View className="flex-row items-center">
                  <View className="w-14 h-14 bg-white/20 rounded-2xl items-center justify-center mr-5">
                    <Ionicons name="document-text" size={28} color="white" />
                  </View>
                  <View>
                    <Text className="text-indigo-200 text-[9px] font-black uppercase tracking-[2px] mb-1">Advanced Analytics</Text>
                    <Text className="text-white font-black text-2xl tracking-tight">Commissions</Text>
                  </View>
                </View>
                <LinearGradient colors={['#818CF8', '#4F46E5']} className="w-12 h-12 rounded-full items-center justify-center">
                  <Ionicons name="arrow-forward" size={24} color="white" />
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Commission Report Modal */}
      <Modal visible={showCommissionReport} animationType="slide" transparent>
        <View className="flex-1 bg-black/60 justify-end">
          <TouchableOpacity className="flex-1" onPress={() => setShowCommissionReport(false)} />
          <View className="bg-white rounded-t-[50px] p-8 pb-12" style={{ maxHeight: '85%' }}>
            <View className="items-center mb-8">
              <View className="w-16 h-1.5 bg-slate-100 rounded-full" />
            </View>
            <View className="flex-row justify-between items-center mb-8">
              <View>
                <Text className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Performance Report</Text>
                <Text className="text-3xl font-black text-slate-900 tracking-tighter">Commissions</Text>
              </View>
              <TouchableOpacity onPress={() => setShowCommissionReport(false)} className="w-12 h-12 bg-slate-50 rounded-full items-center justify-center border border-slate-100">
                <Ionicons name="close" size={24} color="#1E293B" />
              </TouchableOpacity>
            </View>
            
            <View className="flex-row gap-2 mb-8 bg-slate-50 p-2 rounded-[25px] border border-slate-100">
              {(['week', 'month', 'custom'] as const).map(p => (
                <TouchableOpacity
                  key={p}
                  onPress={() => { setCommissionPeriod(p); if (p !== 'custom') loadCommissionReport(p); }}
                  className={`flex-1 py-4 rounded-[20px] items-center ${commissionPeriod === p ? 'bg-indigo-600 shadow-lg shadow-indigo-100' : 'bg-transparent'}`}
                >
                  <Text className={`font-black uppercase text-[10px] tracking-widest ${commissionPeriod === p ? 'text-white' : 'text-slate-500'}`}>{p}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {reportLoading ? (
              <View className="py-20">
                <ActivityIndicator color="#4F46E5" size="large" />
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
                {reportData.map((rep: any) => (
                  <View key={rep.user_id} className="bg-white border border-slate-50 p-5 rounded-[30px] mb-4 flex-row items-center justify-between shadow-sm">
                    <View className="flex-row items-center flex-1">
                      <LinearGradient colors={['#EEF2FF', '#E0E7FF']} className="w-12 h-12 rounded-2xl items-center justify-center mr-4">
                        <Text className="text-indigo-700 font-black text-lg">{(rep.name || 'U').charAt(0)}</Text>
                      </LinearGradient>
                      <View className="flex-1">
                        <Text className="text-slate-900 font-black text-base">{rep.name || 'User'}</Text>
                        <Text className="text-slate-400 text-[10px] font-bold uppercase tracking-tight">${(rep.total_sales || 0).toFixed(0)} Volume</Text>
                      </View>
                    </View>
                    <View className="items-end">
                      <Text className="text-indigo-600 font-black text-xl">${(rep.commission_owed || 0).toFixed(2)}</Text>
                      <Text className="text-slate-300 text-[8px] font-black uppercase">Earned</Text>
                    </View>
                  </View>
                ))}
                {reportData.length === 0 && (
                  <View className="items-center py-20">
                    <Ionicons name="file-tray-outline" size={48} color="#D1D5DB" />
                    <Text className="text-slate-400 font-bold mt-4">No data available for this range</Text>
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
