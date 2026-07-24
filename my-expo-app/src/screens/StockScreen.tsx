import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  TextInput,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import apiService from '../services/api.service';
import { useTranslation } from 'react-i18next';
import { StockItem, Location } from '../types';

export default function StockScreen({ navigation }: any) {
  const { t } = useTranslation();
  const [stock, setStock] = useState<StockItem[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadLocations = useCallback(async () => {
    try {
      const resp = await apiService.getLocations();
      if (resp.data) setLocations(resp.data);
    } catch (err) {
      console.error('Error loading locations:', err);
    }
  }, []);

  const loadStock = useCallback(async () => {
    try {
      setIsLoading(true);
      let data: StockItem[] = [];
      
      const resp = await (selectedLocationId 
        ? apiService.getLocationStock(selectedLocationId)
        : apiService.getProducts({ search: searchQuery }));
      
      console.log('STOCK DATA RESPONSE:', JSON.stringify(resp, null, 2));
      
      let rawItems: any[] = [];
      if (Array.isArray(resp)) {
        rawItems = resp;
      } else if (resp && Array.isArray(resp.data)) {
        rawItems = resp.data;
      } else if (resp && resp.data && Array.isArray(resp.data.data)) {
        rawItems = resp.data.data;
      } else if (resp && resp.data && typeof resp.data === 'object') {
        // Handle case where data might be an object with keys
        rawItems = Object.values(resp.data).filter(v => typeof v === 'object');
      }

      data = rawItems.map((item: any) => {
        const p = item.product || item;
        const mainName = item.name_en || p.name_en || item.product_name_en || p.product_name_en;
        const subName = item.product_name || p.name || p.title || item.name;
        
        return {
          ...item,
          id: item.product_id || item.id || p.id,
          name: mainName || subName || 'Unknown Product',
          name_ar: subName && subName !== mainName ? subName : null,
          sku: item.product_sku || p.sku || item.sku,
          barcode: item.product_barcode || p.barcode || item.barcode,
          unit_price: parseFloat(item.price || item.unit_price || p.unit_price || p.price || item.cost_price || p.cost_price) || 0,
          category_name: item.category_name || (item.category ? item.category.name : (p.category ? p.category.name : (p.category_name || null))),
          quantity: parseFloat(item.quantity ?? p.quantity ?? 0)
        };
      });
      
      // Local filtering for search query if location was selected (as getLocationStock might not support search param)
      if (selectedLocationId && searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        data = data.filter(item => 
          item.name.toLowerCase().includes(query) || 
          (item.sku && item.sku.toLowerCase().includes(query)) ||
          (item.barcode && item.barcode.toLowerCase().includes(query))
        );
      }

      // Sort by quantity: descending (bigger to smaller)
      data.sort((a, b) => (b.quantity || 0) - (a.quantity || 0));

      setStock(data);
    } catch (err) {
      console.error('Error loading stock:', err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedLocationId, searchQuery]);

  useEffect(() => {
    loadLocations();
  }, [loadLocations]);

  useEffect(() => {
    loadStock();
  }, [loadStock]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadLocations(), loadStock()]);
    setRefreshing(false);
  }, [loadLocations, loadStock]);

  return (
    <View className="flex-1 bg-gray-50">
      <StatusBar barStyle="dark-content" />
      <SafeAreaView edges={['top']} className="bg-white px-5 py-4 shadow-sm">
        <View className="flex-row items-center mb-4">
          <TouchableOpacity onPress={() => navigation.goBack()} className="mr-3">
            <Ionicons name="arrow-back" size={28} color="#0F172A" />
          </TouchableOpacity>
          <View>
            <Text className="text-2xl font-black text-slate-900">{t('pos.stock')}</Text>
            <Text className="text-sm text-slate-400 font-bold uppercase tracking-tighter">
              {selectedLocationId ? locations.find(l => l.id === selectedLocationId)?.name : t('history.allLocations')}
            </Text>
          </View>
        </View>

        {/* Search Bar */}
        <View className="flex-row items-center bg-slate-100 rounded-2xl px-4 py-3 mb-4">
          <Ionicons name="search" size={20} color="#94A3B8" />
          <TextInput
            className="flex-1 ml-2 text-slate-900 font-semibold"
            placeholder={t('pos.searchProducts')}
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>

        {/* Location Filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-1">
          <TouchableOpacity
            onPress={() => setSelectedLocationId(null)}
            className={`px-5 py-2.5 rounded-2xl mr-2 border-2 ${selectedLocationId === null ? 'bg-blue-600 border-blue-600' : 'bg-slate-50 border-slate-100'}`}
          >
            <Text className={`text-xs font-black ${selectedLocationId === null ? 'text-white' : 'text-slate-500'}`}>
              {t('history.allLocations')}
            </Text>
          </TouchableOpacity>
          {locations.map((loc) => (
            <TouchableOpacity
              key={loc.id}
              onPress={() => setSelectedLocationId(loc.id)}
              className={`px-5 py-2.5 rounded-2xl mr-2 border-2 ${selectedLocationId === loc.id ? 'bg-blue-600 border-blue-600' : 'bg-slate-50 border-slate-100'}`}
            >
              <Text className={`text-xs font-black ${selectedLocationId === loc.id ? 'text-white' : 'text-slate-500'}`}>
                {loc.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </SafeAreaView>

      <FlatList
        data={stock}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={{ padding: 16, paddingBottom: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563EB" />}
        renderItem={({ item }) => (
          <TouchableOpacity 
            onPress={() => navigation.navigate('ProductDetails', { product: item })}
            activeOpacity={0.7}
            className="bg-white p-4 rounded-[24px] mb-4 border border-slate-100 flex-row items-center" 
            style={{ elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 }}
          >
            <View className="w-12 h-12 rounded-2xl bg-blue-50 items-center justify-center mr-3">
              <Ionicons name="cube" size={22} color="#2563EB" />
            </View>
            
            <View className="flex-1">
              <Text className="text-slate-900 font-black text-[15px]" numberOfLines={1}>
                {item.name?.toLowerCase() === 'unknown' ? (item.name_ar || item.name_en || item.name) : item.name}
              </Text>
              {item.name?.toLowerCase() !== 'unknown' && (item.name_ar || item.name_en) && (
                <Text className="text-slate-500 font-bold text-xs mt-0.5" numberOfLines={1}>
                  {item.name_ar || item.name_en}
                </Text>
              )}
              
              <View className="flex-row items-center mt-2">
                <Text className="text-blue-600 font-black text-sm">${item.unit_price.toFixed(2)}</Text>
                {item.sku && (
                  <View className="bg-slate-100 px-2 py-0.5 rounded-lg ml-2">
                    <Text className="text-slate-500 text-[10px] font-bold">SKU: {item.sku}</Text>
                  </View>
                )}
              </View>
            </View>

            <View className="bg-slate-50 rounded-2xl px-3 py-2 items-center border border-slate-100 min-w-[70px]">
              <Text className={`text-lg font-black ${item.quantity > 0 ? 'text-slate-900' : 'text-red-500'}`}>
                {item.quantity}
              </Text>
              <Text className="text-[8px] text-slate-400 font-black uppercase tracking-widest">{t('pos.available')}</Text>
              <View className="mt-1 pt-1 border-t border-slate-200 w-full items-center">
                <Text className="text-[10px] font-black text-blue-600">
                  ${(item.quantity * item.unit_price).toFixed(2)}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          isLoading ? (
            <View className="mt-20 items-center">
              <ActivityIndicator size="large" color="#2563EB" />
            </View>
          ) : (
            <View className="items-center justify-center mt-20">
              <View className="w-24 h-24 rounded-full bg-slate-100 items-center justify-center mb-6">
                <Ionicons name="cube-outline" size={48} color="#CBD5E1" />
              </View>
              <Text className="text-slate-900 font-black text-xl">{t('pos.noProducts')}</Text>
              <Text className="text-slate-400 font-bold mt-1">{t('pos.adjustSearch')}</Text>
            </View>
          )
        }
      />
    </View>
  );
}
