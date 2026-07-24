import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  FlatList,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import apiService from '../services/api.service';
import { useTranslation } from 'react-i18next';


// Custom date formatter helper to avoid extra dependencies
const formatDate = (dateStr: string) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}`;
};

export default function ProductDetailsScreen({ navigation, route }: any) {
  const { product } = route.params;
  const { t } = useTranslation();
  const [details, setDetails] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'info' | 'transactions'>('info');

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [detailsResp, historyResp] = await Promise.all([
        apiService.getProductDetails(product.id).catch(() => ({ data: product })),
        apiService.getProductHistory(product.id).catch(() => ({ data: [] }))
      ]);
      
      setDetails(detailsResp.data || product);
      setHistory(historyResp.data || []);
    } catch (err) {
      console.error('Error loading product details:', err);
      setDetails(product);
    } finally {
      setIsLoading(false);
    }
  }, [product]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const renderHistoryItem = ({ item }: { item: any }) => (
    <View style={{ backgroundColor: '#FFFFFF', padding: 16, borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: '#F1F5F9', elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <View>
          <Text style={{ color: '#0F172A', fontWeight: 'bold', fontSize: 14 }}>
            {item.invoice_type === 'sales' ? t('nav.sales') : t('nav.purchase')}
          </Text>
          <Text style={{ color: '#94A3B8', fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase' }}>
            {item.location_name}
          </Text>
        </View>
        <Text style={{ color: '#94A3B8', fontSize: 10 }}>
          {item.created_at ? formatDate(item.created_at) : ''}
        </Text>
      </View>
      
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, borderTopWidth: 1, borderTopColor: '#F8FAFC' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ backgroundColor: '#EFF6FF', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, marginRight: 8 }}>
            <Text style={{ color: '#2563EB', fontSize: 12, fontWeight: '900' }}>x{item.quantity}</Text>
          </View>
          <Text style={{ color: '#0F172A', fontWeight: 'bold', fontSize: 12 }}>${parseFloat(item.unit_price || 0).toFixed(2)}</Text>
        </View>
        <Text style={{ color: '#0F172A', fontWeight: '900', fontSize: 14 }}>
          ${(parseFloat(item.quantity || 0) * parseFloat(item.unit_price || 0)).toFixed(2)}
        </Text>
      </View>
    </View>
  );

  if (isLoading && !refreshing) {
    return (
      <View style={{ flex: 1, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  const renderInfoHeader = () => (
    <View style={{ paddingHorizontal: 16 }}>
      {/* Price Info Card */}
      <View style={{ backgroundColor: '#FFFFFF', padding: 24, borderRadius: 32, borderWidth: 1, borderColor: '#F1F5F9', marginBottom: 24, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 }}>
        <Text style={{ color: '#94A3B8', fontWeight: '900', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 16 }}>Pricing Details</Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 }}>
          <View style={{ flex: 1, marginRight: 16 }}>
            <Text style={{ color: '#94A3B8', fontWeight: 'bold', fontSize: 12, marginBottom: 4 }}>Selling Price</Text>
            <Text style={{ color: '#2563EB', fontWeight: '900', fontSize: 24 }}>${parseFloat(details?.unit_price || product.unit_price || 0).toFixed(2)}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#94A3B8', fontWeight: 'bold', fontSize: 12, marginBottom: 4 }}>Purchase Price</Text>
            <Text style={{ color: '#0F172A', fontWeight: '900', fontSize: 24 }}>${parseFloat(details?.purchase_price || details?.cost_price || product.cost_price || 0).toFixed(2)}</Text>
          </View>
        </View>
        
        <View style={{ backgroundColor: '#EFF6FF', padding: 16, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View>
            <Text style={{ color: '#2563EB', fontWeight: 'bold', fontSize: 10, textTransform: 'uppercase' }}>Margin</Text>
            <Text style={{ color: '#1E3A8A', fontWeight: '900', fontSize: 18 }}>
              ${(parseFloat(details?.unit_price || product.unit_price || 0) - parseFloat(details?.purchase_price || details?.cost_price || product.cost_price || 0)).toFixed(2)}
            </Text>
          </View>
          <View style={{ backgroundColor: '#2563EB', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 99 }}>
            <Text style={{ color: '#FFFFFF', fontWeight: '900', fontSize: 12 }}>
              {parseFloat(details?.purchase_price || details?.cost_price || product.cost_price || 0) > 0 
                ? (((parseFloat(details?.unit_price || product.unit_price || 0) - parseFloat(details?.purchase_price || details?.cost_price || product.cost_price || 0)) / parseFloat(details?.purchase_price || details?.cost_price || product.cost_price || 0)) * 100).toFixed(1) 
                : '0.0'}%
            </Text>
          </View>
        </View>
      </View>

      {/* Stock per Location */}
      <Text style={{ color: '#0F172A', fontWeight: '900', fontSize: 18, marginBottom: 16, marginLeft: 8 }}>Stock Locations</Text>
      {details?.stock_per_location && Object.keys(details.stock_per_location).length > 0 ? (
        Object.entries(details.stock_per_location).map(([locName, qty]: any) => (
          <View key={locName} style={{ backgroundColor: '#FFFFFF', padding: 16, borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: '#F1F5F9', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                <Ionicons name="location" size={16} color="#64748B" />
              </View>
              <Text style={{ color: '#0F172A', fontWeight: 'bold', fontSize: 14 }}>{locName}</Text>
            </View>
            <View style={{ backgroundColor: '#F8FAFC', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 99, borderWidth: 1, borderColor: '#F1F5F9' }}>
              <Text style={{ color: '#0F172A', fontWeight: '900', fontSize: 14 }}>{qty}</Text>
            </View>
          </View>
        ))
      ) : (
        <View style={{ backgroundColor: '#FFFFFF', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#F1F5F9', alignItems: 'center', marginBottom: 24 }}>
          <Text style={{ color: '#94A3B8', fontWeight: 'bold', fontStyle: 'italic' }}>No location data available</Text>
        </View>
      )}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F1F5F9', paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', alignItems: 'center' }}>
        <TouchableOpacity onPress={() => navigation.navigate('Stock')} style={{ marginRight: 16 }}>
          <Ionicons name="arrow-back" size={24} color="#1E293B" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ color: '#0F172A', fontWeight: '900', fontSize: 18 }} numberOfLines={1}>{details?.name || product.name}</Text>
          <Text style={{ color: '#94A3B8', fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1 }}>SKU: {details?.sku || product.sku}</Text>
        </View>
      </SafeAreaView>

      <View style={{ backgroundColor: '#FFFFFF', paddingHorizontal: 16, paddingTop: 16 }}>
        <View style={{ flexDirection: 'row', backgroundColor: '#F1F5F9', padding: 4, borderRadius: 16, marginBottom: 16 }}>
          <TouchableOpacity 
            onPress={() => setSelectedTab('info')}
            style={{ 
              flex: 1, 
              paddingVertical: 10, 
              borderRadius: 12, 
              alignItems: 'center', 
              backgroundColor: selectedTab === 'info' ? '#FFFFFF' : 'transparent',
              ...(selectedTab === 'info' ? { elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 } : {})
            }}
          >
            <Text style={{ fontSize: 12, fontWeight: '900', color: selectedTab === 'info' ? '#2563EB' : '#64748B' }}>
              {t('common.info')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => setSelectedTab('transactions')}
            style={{ 
              flex: 1, 
              paddingVertical: 10, 
              borderRadius: 12, 
              alignItems: 'center', 
              backgroundColor: selectedTab === 'transactions' ? '#FFFFFF' : 'transparent',
              ...(selectedTab === 'transactions' ? { elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 } : {})
            }}
          >
            <Text style={{ fontSize: 12, fontWeight: '900', color: selectedTab === 'transactions' ? '#2563EB' : '#64748B' }}>
              {t('nav.history')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {selectedTab === 'info' ? (
        <ScrollView 
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingVertical: 16 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {renderInfoHeader()}
        </ScrollView>
      ) : (
        <FlatList
          data={history}
          keyExtractor={(_, index) => index.toString()}
          renderItem={renderHistoryItem}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', justifyContent: 'center', marginTop: 40 }}>
              <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                <Ionicons name="receipt-outline" size={32} color="#CBD5E1" />
              </View>
              <Text style={{ color: '#94A3B8', fontWeight: 'bold' }}>No history found</Text>
            </View>
          }
        />
      )}
    </View>
  );
}
