import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ReceiptBitmapView from '../../components/ReceiptBitmapView';
import { generateInvoicePDF } from '../utils/PDFInvoiceGenerator';

interface InvoicePreviewModalProps {
  visible: boolean;
  onClose: () => void;
  user: any;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Sample Data for Preview
const SAMPLE_DATA = {
  invoiceNumber: 'INV-2024-001',
  customerName: 'Khaled Test Customer',
  customerPhone: '+961 70 123 456',
  customerAddress: 'Main Street, Tripoli, Lebanon',
  customerBalance: 1250.50,
  items: [
    { name: 'حلوم بلدي (Halloumi)', quantity: 2, unitPrice: 9.00, total: 18.00 },
    { name: 'Coffee Beans 1kg', quantity: 1, unitPrice: 25.50, total: 25.50, discountPercent: 10 },
    { name: 'Olive Oil 5L', quantity: 1, unitPrice: 45.00, total: 45.00 },
  ],
  subtotal: 88.50,
  discount: 2.55,
  tax: 0.00,
  total: 85.95,
  paidAmount: 50.00,
  date: new Date().toLocaleDateString(),
  cashierName: 'System Preview',
  storeName: 'DIYAA STOCK',
  notes: 'This is a sample invoice layout preview.',
  terms: 'Generated for template verification.',
};

export default function InvoicePreviewModal({ visible, onClose, user }: InvoicePreviewModalProps) {
  const [activeTab, setActiveTab] = useState<'thermal' | 'pdf'>('thermal');
  const [isGenerating, setIsGenerating] = useState(false);
  const [thermalHeight, setThermalHeight] = useState(1000);
  const thermalRef = useRef<View>(null);
  
  const PREVIEW_SCALE = (SCREEN_WIDTH - 80) / 576;

  const handlePreviewPDF = async () => {
    try {
      setIsGenerating(true);
      await generateInvoicePDF({
        ...SAMPLE_DATA,
        storeName: user?.location_name || 'DIYAA STOCK',
        cashierName: user?.full_name || 'Admin',
      });
    } catch (error) {
      console.error(error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View className="flex-1 bg-black/60">
        <TouchableOpacity className="flex-1" activeOpacity={1} onPress={onClose} />
        <View className="bg-white rounded-t-[32px] h-[85%]" style={{ elevation: 20 }}>
          {/* Header */}
          <View className="flex-row items-center justify-between px-6 py-5 border-b border-gray-100">
            <View>
              <Text className="text-xl font-black text-slate-900">Invoice Layouts</Text>
              <Text className="text-xs text-slate-400 font-bold uppercase tracking-wider">Preview & Testing</Text>
            </View>
            <TouchableOpacity onPress={onClose} className="w-10 h-10 rounded-2xl bg-slate-100 items-center justify-center">
              <Ionicons name="close" size={24} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* Tab Selector */}
          <View className="flex-row px-6 py-4 gap-3">
            <TouchableOpacity 
              onPress={() => setActiveTab('thermal')}
              className={`flex-1 flex-row items-center justify-center py-3 rounded-2xl border ${activeTab === 'thermal' ? 'bg-blue-600 border-blue-600' : 'bg-white border-slate-200'}`}>
              <Ionicons name="print" size={18} color={activeTab === 'thermal' ? '#FFF' : '#64748B'} />
              <Text className={`ml-2 font-black text-xs ${activeTab === 'thermal' ? 'text-white' : 'text-slate-500'}`}>THERMAL</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={() => setActiveTab('pdf')}
              className={`flex-1 flex-row items-center justify-center py-3 rounded-2xl border ${activeTab === 'pdf' ? 'bg-blue-600 border-blue-600' : 'bg-white border-slate-200'}`}>
              <Ionicons name="document-text" size={18} color={activeTab === 'pdf' ? '#FFF' : '#64748B'} />
              <Text className={`ml-2 font-black text-xs ${activeTab === 'pdf' ? 'text-white' : 'text-slate-500'}`}>PDF (ZOHO)</Text>
            </TouchableOpacity>
          </View>

          <ScrollView className="flex-1 px-6 pb-10" showsVerticalScrollIndicator={false}>
            {activeTab === 'thermal' ? (
              <View className="items-center pb-10">
                <Text className="text-[10px] text-slate-400 font-black mb-4 uppercase tracking-[2px]">Thermal Receipt Preview (80mm)</Text>
                
                {/* Scaled Preview of Thermal */}
                <View 
                  className="border-2 border-slate-100 rounded-3xl overflow-hidden bg-white shadow-sm"
                  style={{ 
                    width: SCREEN_WIDTH - 80, 
                    height: thermalHeight * PREVIEW_SCALE,
                  }}
                >
                  <View 
                    onLayout={(e) => setThermalHeight(e.nativeEvent.layout.height)}
                    style={{ 
                      width: 576, 
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      transform: [
                        { scale: PREVIEW_SCALE },
                        { translateX: -576 * (1 - PREVIEW_SCALE) / (2 * PREVIEW_SCALE) },
                        { translateY: -thermalHeight * (1 - PREVIEW_SCALE) / 2 }
                      ],
                    }}
                  >
                    <ReceiptBitmapView 
                      ref={thermalRef}
                      data={{
                        ...SAMPLE_DATA,
                        storeName: user?.location_name || 'DIYAA STOCK',
                        cashierName: user?.full_name || 'Admin',
                        locationName: user?.location_name,
                      }} 
                    />
                  </View>
                </View>
                
                <View className="mt-8 bg-slate-50 p-5 rounded-3xl border border-slate-100">
                  <View className="flex-row items-center mb-2">
                    <Ionicons name="information-circle" size={20} color="#3B82F6" />
                    <Text className="ml-2 font-bold text-slate-700">Arabic Thermal Support</Text>
                  </View>
                  <Text className="text-slate-500 text-xs leading-5">
                    This preview uses the internal Bitmap renderer to ensure Arabic text displays correctly on hardware that doesn't natively support RTL.
                  </Text>
                </View>
              </View>
            ) : (
              <View className="items-center py-10">
                <View className="w-24 h-24 rounded-[32px] bg-blue-50 items-center justify-center mb-6">
                  <Ionicons name="document-text" size={48} color="#2563EB" />
                </View>
                <Text className="text-xl font-black text-slate-900 text-center">Zoho Premium PDF</Text>
                <Text className="text-slate-400 text-center mt-2 px-6 font-medium leading-5">
                  The PDF layout is optimized for sharing via WhatsApp or Email. It uses a high-fidelity modern design system.
                </Text>

                <TouchableOpacity 
                  onPress={handlePreviewPDF}
                  disabled={isGenerating}
                  className="mt-10 w-full bg-blue-600 h-16 rounded-[24px] items-center justify-center shadow-lg shadow-blue-200">
                  {isGenerating ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <View className="flex-row items-center">
                      <Ionicons name="share-outline" size={24} color="#FFF" />
                      <Text className="ml-3 text-white font-black text-base">Generate & Share PDF</Text>
                    </View>
                  )}
                </TouchableOpacity>

                <View className="mt-8 flex-row items-center bg-slate-50 px-5 py-4 rounded-2xl border border-slate-100">
                   <Ionicons name="checkmark-done-circle" size={20} color="#10B981" />
                   <Text className="ml-2 text-[11px] font-bold text-slate-500">Includes logo, stamps, and signatures</Text>
                </View>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
