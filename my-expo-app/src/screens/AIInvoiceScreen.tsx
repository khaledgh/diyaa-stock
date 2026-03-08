import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  ScrollView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import apiService from '../services/api.service';
import { StockItem, Customer, Vendor } from '../types';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';

interface ExtractedItem {
  name: string;
  quantity: number;
  unit_price: number;
  matched_product?: StockItem;
  confidence: number;
}

interface ExtractionResult {
  summary: string;
  items: ExtractedItem[];
  customer_name?: string;
  vendor_name?: string;
  total?: number;
}

export default function AIInvoiceScreen() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [mode, setMode] = useState<'idle' | 'voice' | 'image' | 'review'>('idle');
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedData, setExtractedData] = useState<ExtractionResult | null>(null);
  const [voiceText, setVoiceText] = useState('');
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [, setCustomers] = useState<Customer[]>([]);
  const [, setVendors] = useState<Vendor[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [selectedLocationId] = useState<number | null>(user?.location_id || null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [capturedImageUri, setCapturedImageUri] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const locationId = selectedLocationId || user?.location_id;
      const promises: Promise<any>[] = [];

      if (locationId) {
        promises.push(apiService.getLocationStock(locationId));
      } else {
        promises.push(Promise.resolve({ data: [] }));
      }

      if (isAdmin) {
        promises.push(apiService.getVendors());
      } else {
        promises.push(apiService.getCustomers());
      }

      const [stockRes, entityRes] = await Promise.all(promises);

      if (stockRes.ok || stockRes.success) {
        const items = (stockRes.data || []).map((item: any) => ({
          id: item.product_id,
          name: item.name_en || item.name_ar || 'Unknown',
          sku: item.sku,
          barcode: item.barcode,
          category_name: item.category_name_en || item.category_name_ar,
          unit_price: parseFloat(item.unit_price) || 0,
          quantity: parseInt(item.quantity) || 0,
          location_type: item.location_type,
          location_id: item.location_id,
        }));
        setStockItems(items);
      }

      if (isAdmin) {
        if (entityRes.success || entityRes.ok) {
          setVendors(entityRes.data || []);
        }
      } else {
        if (entityRes.success || entityRes.ok) {
          const allCustomers = entityRes.data || entityRes.customers?.data || [];
          setCustomers(allCustomers);
        }
      }
    } catch (error) {
      console.error('Failed to load AI invoice data:', error);
    }
  };

  const matchProductsByName = (items: ExtractedItem[]): ExtractedItem[] => {
    return items.map(item => {
      const normalizedName = item.name.toLowerCase().trim();
      const match = stockItems.find(stock => {
        const stockName = stock.name.toLowerCase().trim();
        return stockName.includes(normalizedName) || normalizedName.includes(stockName);
      });

      return {
        ...item,
        matched_product: match || undefined,
        unit_price: match ? match.unit_price : item.unit_price,
        confidence: match ? 0.9 : 0.5,
      };
    });
  };

  // -------- Voice Input --------
  const handleVoiceSubmit = async () => {
    if (!voiceText.trim()) {
      Alert.alert('Error', 'Please type or paste the invoice description');
      return;
    }

    setIsProcessing(true);
    setMode('voice');

    try {
      const prompt = isAdmin
        ? `Extract purchase invoice items from this text. Return JSON with: summary (string), items (array of {name, quantity, unit_price}), vendor_name (string or null), total (number or null). Text: "${voiceText}"`
        : `Extract sales invoice items from this text. Return JSON with: summary (string), items (array of {name, quantity, unit_price}), customer_name (string or null), total (number or null). Text: "${voiceText}"`;

      const result = await apiService.extractDataWithAI(prompt);

      const matchedItems = matchProductsByName(result.items || []);
      setExtractedData({
        ...result,
        items: matchedItems,
      });
      setMode('review');
    } catch (error: any) {
      console.error('AI extraction failed:', error);
      Alert.alert('AI Error', error.message || 'Failed to process text. Please try again.');
      setMode('idle');
    } finally {
      setIsProcessing(false);
    }
  };

  // -------- Image Input --------
  const handleTakePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Camera access is needed to capture invoice images.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      base64: false,
    });

    if (!result.canceled && result.assets?.[0]) {
      setCapturedImageUri(result.assets[0].uri);
      processImage(result.assets[0].uri);
    }
  };

  const handlePickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Photo library access is needed to select invoice images.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        base64: false,
      });

      if (!result.canceled && result.assets?.[0]) {
        setCapturedImageUri(result.assets[0].uri);
        processImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Image picker error:', error);
      Alert.alert('Error', 'Failed to open image picker. Please use "Take Photo" instead.');
    }
  };

  const processImage = async (uri: string) => {
    setIsProcessing(true);
    setMode('image');

    try {
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: 'base64' as any,
      });

      const prompt = isAdmin
        ? 'Extract purchase invoice data from this image. Return JSON with: summary (string), items (array of {name, quantity, unit_price}), vendor_name (string or null), total (number or null).'
        : 'Extract sales invoice data from this image. Return JSON with: summary (string), items (array of {name, quantity, unit_price}), customer_name (string or null), total (number or null).';

      const result = await apiService.extractDataWithAI(prompt, base64, 'image/jpeg');

      const matchedItems = matchProductsByName(result.items || []);
      setExtractedData({
        ...result,
        items: matchedItems,
      });
      setMode('review');
    } catch (error: any) {
      console.error('AI image extraction failed:', error);
      Alert.alert('AI Error', error.message || 'Failed to process image. Please try again.');
      setMode('idle');
    } finally {
      setIsProcessing(false);
    }
  };

  // -------- Submit Invoice --------
  const handleCreateInvoice = async () => {
    if (!extractedData || extractedData.items.length === 0) {
      Alert.alert('Error', 'No items to create invoice');
      return;
    }

    const unmatchedItems = extractedData.items.filter(i => !i.matched_product);
    if (unmatchedItems.length > 0) {
      Alert.alert(
        'Unmatched Items',
        `${unmatchedItems.length} item(s) could not be matched to products in stock:\n${unmatchedItems.map(i => `• ${i.name}`).join('\n')}\n\nPlease remove or match them before submitting.`
      );
      return;
    }

    const locationId = selectedLocationId || user?.location_id;
    if (!locationId) {
      Alert.alert('Error', 'No location selected');
      return;
    }

    setIsSubmitting(true);

    try {
      const items = extractedData.items.map(item => ({
        product_id: item.matched_product!.id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        discount_percent: 0,
        tax_percent: 0,
      }));

      if (isAdmin) {
        const data = {
          location_id: locationId,
          vendor_id: selectedVendor?.id,
          items,
          paid_amount: extractedData.total || items.reduce((sum, i) => sum + i.quantity * i.unit_price, 0),
          payment_method: 'cash',
          notes: `AI-generated from ${capturedImageUri ? 'image' : 'voice/text'}`,
        };

        const res = await apiService.createPurchaseInvoice(data);
        if (res.ok || res.success) {
          Alert.alert('Success', 'Purchase invoice created!');
          resetState();
        } else {
          Alert.alert('Error', res.message || 'Failed to create invoice');
        }
      } else {
        const data = {
          location_id: locationId,
          customer_id: selectedCustomer?.id,
          items,
          paid_amount: extractedData.total || items.reduce((sum, i) => sum + i.quantity * i.unit_price, 0),
          payment_method: 'cash',
          notes: `AI-generated from ${capturedImageUri ? 'image' : 'voice/text'}`,
        };

        const res = await apiService.createSalesInvoice(data);
        if (res.ok || res.success) {
          Alert.alert('Success', 'Sales invoice created!');
          resetState();
        } else {
          Alert.alert('Error', res.message || 'Failed to create invoice');
        }
      }
    } catch (error: any) {
      console.error('Failed to create invoice:', error);
      Alert.alert('Error', error.message || 'Failed to create invoice');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetState = () => {
    setMode('idle');
    setExtractedData(null);
    setVoiceText('');
    setCapturedImageUri(null);
    setSelectedCustomer(null);
    setSelectedVendor(null);
  };

  const removeExtractedItem = (index: number) => {
    if (!extractedData) return;
    const newItems = [...extractedData.items];
    newItems.splice(index, 1);
    setExtractedData({ ...extractedData, items: newItems });
  };

  const updateItemQuantity = (index: number, qty: number) => {
    if (!extractedData) return;
    const newItems = [...extractedData.items];
    newItems[index] = { ...newItems[index], quantity: Math.max(1, qty) };
    setExtractedData({ ...extractedData, items: newItems });
  };

  const calculatedTotal = extractedData?.items.reduce(
    (sum, item) => sum + item.quantity * item.unit_price, 0
  ) || 0;

  // -------- Render --------

  if (isProcessing) {
    return (
      <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 }}>
          <View style={{
            width: 80, height: 80, borderRadius: 24,
            backgroundColor: isAdmin ? '#EFF6FF' : '#ECFDF5',
            justifyContent: 'center', alignItems: 'center', marginBottom: 24,
          }}>
            <ActivityIndicator size="large" color={isAdmin ? '#2563EB' : '#059669'} />
          </View>
          <Text style={{ fontSize: 20, fontWeight: '700', color: '#1E293B', marginBottom: 8 }}>
            Processing with AI
          </Text>
          <Text style={{ fontSize: 14, color: '#64748B', textAlign: 'center' }}>
            {mode === 'voice' ? 'Analyzing your text description...' : 'Extracting data from image...'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (mode === 'review' && extractedData) {
    return (
      <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
        {/* Header */}
        <View style={{
          backgroundColor: '#FFFFFF', paddingHorizontal: 20, paddingVertical: 16,
          borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
          flexDirection: 'row', alignItems: 'center',
        }}>
          <TouchableOpacity onPress={resetState} style={{ marginRight: 16 }}>
            <Ionicons name="arrow-back" size={24} color="#374151" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: '#1E293B' }}>
              Review {isAdmin ? 'Purchase' : 'Sales'} Invoice
            </Text>
            <Text style={{ fontSize: 13, color: '#64748B', marginTop: 2 }}>
              {extractedData.summary || `${extractedData.items.length} items extracted`}
            </Text>
          </View>
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
          {/* Items */}
          {extractedData.items.map((item, index) => (
            <View key={index} style={{
              backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 12,
              borderWidth: 1,
              borderColor: item.matched_product ? '#D1FAE5' : '#FED7AA',
              shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
            }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: '600', color: '#1E293B' }}>{item.name}</Text>
                  {item.matched_product ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                      <Ionicons name="checkmark-circle" size={14} color="#059669" />
                      <Text style={{ fontSize: 12, color: '#059669', marginLeft: 4 }}>
                        Matched: {item.matched_product.name}
                      </Text>
                    </View>
                  ) : (
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                      <Ionicons name="warning" size={14} color="#D97706" />
                      <Text style={{ fontSize: 12, color: '#D97706', marginLeft: 4 }}>
                        No matching product found
                      </Text>
                    </View>
                  )}
                </View>
                <TouchableOpacity onPress={() => removeExtractedItem(index)} style={{ padding: 4 }}>
                  <Ionicons name="close-circle" size={22} color="#EF4444" />
                </TouchableOpacity>
              </View>

              <View style={{ flexDirection: 'row', marginTop: 12, gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, color: '#94A3B8', marginBottom: 4 }}>QTY</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 10, paddingHorizontal: 8 }}>
                    <TouchableOpacity onPress={() => updateItemQuantity(index, item.quantity - 1)} style={{ padding: 8 }}>
                      <Ionicons name="remove" size={16} color="#64748B" />
                    </TouchableOpacity>
                    <Text style={{ flex: 1, textAlign: 'center', fontSize: 15, fontWeight: '600', color: '#1E293B' }}>
                      {item.quantity}
                    </Text>
                    <TouchableOpacity onPress={() => updateItemQuantity(index, item.quantity + 1)} style={{ padding: 8 }}>
                      <Ionicons name="add" size={16} color="#64748B" />
                    </TouchableOpacity>
                  </View>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, color: '#94A3B8', marginBottom: 4 }}>PRICE</Text>
                  <View style={{ backgroundColor: '#F8FAFC', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 }}>
                    <Text style={{ fontSize: 15, fontWeight: '600', color: '#1E293B' }}>
                      ${item.unit_price.toFixed(2)}
                    </Text>
                  </View>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, color: '#94A3B8', marginBottom: 4 }}>TOTAL</Text>
                  <View style={{ backgroundColor: '#F8FAFC', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 }}>
                    <Text style={{ fontSize: 15, fontWeight: '700', color: isAdmin ? '#2563EB' : '#059669' }}>
                      ${(item.quantity * item.unit_price).toFixed(2)}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          ))}

          {/* Total */}
          <View style={{
            backgroundColor: isAdmin ? '#EFF6FF' : '#ECFDF5',
            borderRadius: 16, padding: 20, marginTop: 4, marginBottom: 24,
          }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: 16, fontWeight: '600', color: '#1E293B' }}>Total</Text>
              <Text style={{ fontSize: 28, fontWeight: '800', color: isAdmin ? '#2563EB' : '#059669' }}>
                ${calculatedTotal.toFixed(2)}
              </Text>
            </View>
            <Text style={{ fontSize: 12, color: '#64748B', marginTop: 4 }}>
              {extractedData.items.length} item(s) • {isAdmin ? 'Purchase' : 'Sales'} Invoice
            </Text>
          </View>
        </ScrollView>

        {/* Bottom Actions */}
        <View style={{
          backgroundColor: '#FFFFFF', paddingHorizontal: 20, paddingVertical: 16,
          borderTopWidth: 1, borderTopColor: '#F1F5F9',
          paddingBottom: Platform.OS === 'ios' ? 34 : 16,
        }}>
          <TouchableOpacity
            onPress={handleCreateInvoice}
            disabled={isSubmitting || extractedData.items.length === 0}
            style={{
              backgroundColor: isSubmitting ? '#94A3B8' : (isAdmin ? '#2563EB' : '#059669'),
              borderRadius: 16, paddingVertical: 16, alignItems: 'center',
              shadowColor: isAdmin ? '#2563EB' : '#059669',
              shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8,
              elevation: 6,
            }}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '700', marginLeft: 8 }}>
                  Create {isAdmin ? 'Purchase' : 'Sales'} Invoice
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // -------- Idle Mode: Home --------
  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      {/* Header */}
      <View style={{
        backgroundColor: '#FFFFFF', paddingHorizontal: 20, paddingVertical: 16,
        borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
      }}>
        <Text style={{ fontSize: 22, fontWeight: '800', color: '#1E293B' }}>
          AI Invoice
        </Text>
        <Text style={{ fontSize: 13, color: '#64748B', marginTop: 2 }}>
          Create {isAdmin ? 'purchase' : 'sales'} invoices using AI
        </Text>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
        {/* Voice/Text Input Card */}
        <View style={{
          backgroundColor: '#FFFFFF', borderRadius: 20, padding: 20, marginBottom: 16,
          shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
            <View style={{
              width: 44, height: 44, borderRadius: 14,
              backgroundColor: '#F0F9FF', justifyContent: 'center', alignItems: 'center',
            }}>
              <Ionicons name="mic" size={22} color="#2563EB" />
            </View>
            <View style={{ marginLeft: 12 }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#1E293B' }}>Voice / Text</Text>
              <Text style={{ fontSize: 12, color: '#94A3B8', marginTop: 2 }}>Describe items to create an invoice</Text>
            </View>
          </View>

          <TextInput
            value={voiceText}
            onChangeText={setVoiceText}
            placeholder={isAdmin ? 'e.g. "50 boxes of cheese at $5 each, 30 butter at $3"' : 'e.g. "10 halloumi at $8, 5 nabulsi at $7"'}
            placeholderTextColor="#CBD5E1"
            multiline
            numberOfLines={4}
            style={{
              backgroundColor: '#F8FAFC', borderRadius: 14, padding: 16,
              fontSize: 15, color: '#1E293B', minHeight: 100,
              textAlignVertical: 'top', borderWidth: 1, borderColor: '#E2E8F0',
            }}
          />

          <TouchableOpacity
            onPress={handleVoiceSubmit}
            disabled={!voiceText.trim()}
            style={{
              backgroundColor: voiceText.trim() ? '#2563EB' : '#CBD5E1',
              borderRadius: 14, paddingVertical: 14, marginTop: 12, alignItems: 'center',
              flexDirection: 'row', justifyContent: 'center',
            }}
          >
            <Ionicons name="sparkles" size={18} color="#FFFFFF" />
            <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '600', marginLeft: 8 }}>
              Extract with AI
            </Text>
          </TouchableOpacity>
        </View>

        {/* Divider */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 8, paddingHorizontal: 8 }}>
          <View style={{ flex: 1, height: 1, backgroundColor: '#E2E8F0' }} />
          <Text style={{ marginHorizontal: 16, fontSize: 13, color: '#94A3B8', fontWeight: '600' }}>OR</Text>
          <View style={{ flex: 1, height: 1, backgroundColor: '#E2E8F0' }} />
        </View>

        {/* Image Input Card */}
        <View style={{
          backgroundColor: '#FFFFFF', borderRadius: 20, padding: 20, marginTop: 8,
          shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
            <View style={{
              width: 44, height: 44, borderRadius: 14,
              backgroundColor: '#FFF7ED', justifyContent: 'center', alignItems: 'center',
            }}>
              <Ionicons name="camera" size={22} color="#EA580C" />
            </View>
            <View style={{ marginLeft: 12 }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#1E293B' }}>Image</Text>
              <Text style={{ fontSize: 12, color: '#94A3B8', marginTop: 2 }}>Scan an invoice or receipt photo</Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', gap: 12 }}>
            <TouchableOpacity
              onPress={handleTakePhoto}
              style={{
                flex: 1, backgroundColor: '#FFF7ED', borderRadius: 14,
                paddingVertical: 20, alignItems: 'center', borderWidth: 1,
                borderColor: '#FFEDD5', borderStyle: 'dashed',
              }}
            >
              <Ionicons name="camera-outline" size={28} color="#EA580C" />
              <Text style={{ color: '#EA580C', fontSize: 13, fontWeight: '600', marginTop: 8 }}>Take Photo</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handlePickImage}
              style={{
                flex: 1, backgroundColor: '#F0F9FF', borderRadius: 14,
                paddingVertical: 20, alignItems: 'center', borderWidth: 1,
                borderColor: '#DBEAFE', borderStyle: 'dashed',
              }}
            >
              <Ionicons name="image-outline" size={28} color="#2563EB" />
              <Text style={{ color: '#2563EB', fontSize: 13, fontWeight: '600', marginTop: 8 }}>From Gallery</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Info Card */}
        <View style={{
          backgroundColor: isAdmin ? '#EFF6FF' : '#ECFDF5',
          borderRadius: 16, padding: 16, marginTop: 20,
          borderWidth: 1, borderColor: isAdmin ? '#DBEAFE' : '#D1FAE5',
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
            <Ionicons name="information-circle" size={20} color={isAdmin ? '#2563EB' : '#059669'} />
            <View style={{ marginLeft: 10, flex: 1 }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: isAdmin ? '#1E40AF' : '#047857' }}>
                How it works
              </Text>
              <Text style={{ fontSize: 12, color: isAdmin ? '#3B82F6' : '#10B981', marginTop: 4, lineHeight: 18 }}>
                1. Describe items by text or take a photo of an invoice{'\n'}
                2. AI extracts product names, quantities & prices{'\n'}
                3. Items are matched to your stock automatically{'\n'}
                4. Review, adjust & create the invoice instantly
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
