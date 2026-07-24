import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface QuantityModalProps {
  visible: boolean;
  productName: string;
  currentQuantity: number;
  maxQuantity: number;
  unitPrice: number;
  currentDiscount?: number;
  onConfirm: (quantity: number, unitPrice: number, discount: number) => void;
  onCancel: () => void;
}

const parseDecimal = (text: string): number => {
  if (!text) return 0;
  const normalized = text.replace(',', '.');
  return parseFloat(normalized) || 0;
};

const formatDecimal = (num: number): string => {
  const rounded = Math.round(num * 100) / 100;
  return rounded.toString().replace('.', ',');
};

export default function QuantityModal({
  visible,
  productName,
  currentQuantity,
  maxQuantity,
  unitPrice,
  currentDiscount = 0,
  onConfirm,
  onCancel,
}: QuantityModalProps) {
  const [quantity, setQuantity] = useState(formatDecimal(currentQuantity));
  const [price, setPrice] = useState(formatDecimal(unitPrice));
  const [discount, setDiscount] = useState(formatDecimal(currentDiscount));

  useEffect(() => {
    if (visible) {
      setQuantity(formatDecimal(currentQuantity));
      setPrice(formatDecimal(unitPrice));
      setDiscount(formatDecimal(currentDiscount));
    }
  }, [visible, currentQuantity, unitPrice, currentDiscount]);

  const handleIncrement = () => {
    const current = parseDecimal(quantity);
    const newQty = Math.round((current + 1) * 100) / 100;
    if (current < maxQuantity && newQty > maxQuantity) {
      setQuantity(formatDecimal(maxQuantity));
    } else if (newQty <= maxQuantity) {
      setQuantity(formatDecimal(newQty));
    }
  };

  const handleDecrement = () => {
    const current = parseDecimal(quantity);
    const newQty = Math.max(0, Math.round((current - 1) * 100) / 100);
    setQuantity(formatDecimal(newQty));
  };

  const handleConfirm = () => {
    const qtyValue = parseDecimal(quantity);
    const priceValue = parseDecimal(price);
    const discValue = parseDecimal(discount);

    if (qtyValue > maxQuantity) {
      if (maxQuantity <= 0) {
        onCancel();
        return;
      }
      onConfirm(maxQuantity, priceValue, discValue);
      return;
    }
    onConfirm(qtyValue, priceValue, discValue);
  };

  const qtyNum = parseDecimal(quantity);
  const priceNum = parseDecimal(price);
  const discNum = parseDecimal(discount);
  
  const subtotal = qtyNum * priceNum;
  const total = subtotal * (1 - discNum / 100);

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onCancel}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View className="flex-1 justify-center items-center px-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)' }}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            className="w-full max-w-md"
          >
            <View className="bg-white rounded-[32px] overflow-hidden" style={{ elevation: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.15, shadowRadius: 20 }}>
              {/* Header */}
              <View className="bg-blue-600 px-6 py-5">
                <View className="flex-row justify-between items-center mb-1">
                  <Text className="text-white/80 text-[10px] font-black uppercase tracking-[2px]">
                    Item Override
                  </Text>
                  <TouchableOpacity onPress={onCancel} className="opacity-80">
                    <Ionicons name="close" size={24} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
                <Text className="text-white text-xl font-bold" numberOfLines={1}>
                  {productName}
                </Text>
              </View>

              <View className="p-6">
                {/* Quantity Section */}
                <View className="mb-6">
                  <View className="flex-row justify-between items-center mb-3">
                    <Text className="text-gray-500 font-bold text-xs uppercase tracking-wider">Quantity</Text>
                    <Text className="text-[10px] text-gray-400 font-medium bg-gray-100 px-2 py-0.5 rounded-full">
                      Stock: {maxQuantity}
                    </Text>
                  </View>
                  
                  <View className="flex-row items-center justify-between">
                    <TouchableOpacity
                      onPress={handleDecrement}
                      className="w-14 h-14 rounded-2xl bg-gray-100 items-center justify-center"
                    >
                      <Ionicons name="remove" size={24} color="#1F2937" />
                    </TouchableOpacity>

                    <TextInput
                      className="flex-1 mx-4 text-center text-3xl font-black text-gray-900"
                      style={{ textAlignVertical: 'center', padding: 0 }}
                      value={quantity}
                      onChangeText={setQuantity}
                      keyboardType="decimal-pad"
                      selectTextOnFocus
                      underlineColorAndroid="transparent"
                    />

                    <TouchableOpacity
                      onPress={handleIncrement}
                      className="w-14 h-14 rounded-2xl bg-blue-600 items-center justify-center"
                      style={{ shadowColor: '#2563EB', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 }}
                    >
                      <Ionicons name="add" size={24} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Price & Discount Row */}
                <View className="flex-row gap-4 mb-6">
                  <View className="flex-1">
                    <Text className="text-gray-500 font-bold text-xs uppercase tracking-wider mb-2">Unit Price ($)</Text>
                    <View className="bg-gray-50 rounded-2xl border border-gray-100 px-4 py-1 min-h-[56px] justify-center">
                      <TextInput
                        className="text-lg font-bold text-gray-900"
                        style={{ textAlignVertical: 'center', padding: 0 }}
                        value={price}
                        onChangeText={setPrice}
                        keyboardType="decimal-pad"
                        selectTextOnFocus
                        underlineColorAndroid="transparent"
                      />
                    </View>
                  </View>
                  
                  <View className="flex-1">
                    <Text className="text-gray-500 font-bold text-xs uppercase tracking-wider mb-2">Discount (%)</Text>
                    <View className="bg-gray-50 rounded-2xl border border-gray-100 px-4 py-1 min-h-[56px] justify-center">
                      <TextInput
                        className="text-lg font-bold text-red-600"
                        style={{ textAlignVertical: 'center', padding: 0 }}
                        value={discount}
                        onChangeText={setDiscount}
                        keyboardType="decimal-pad"
                        selectTextOnFocus
                        placeholder="0"
                        underlineColorAndroid="transparent"
                      />
                    </View>
                  </View>
                </View>

                {/* Summary Box */}
                <View className="bg-slate-50 rounded-2xl p-4 mb-6 border border-slate-100">
                  <View className="flex-row justify-between items-center mb-1">
                    <Text className="text-gray-500 text-xs font-medium">Subtotal</Text>
                    <Text className="text-gray-900 font-bold text-xs">${subtotal.toFixed(2)}</Text>
                  </View>
                  <View className="flex-row justify-between items-center mb-3">
                    <Text className="text-red-500 text-xs font-medium">Discount Applied</Text>
                    <Text className="text-red-500 font-bold text-xs">-${(subtotal - total).toFixed(2)}</Text>
                  </View>
                  <View className="h-[1px] bg-slate-200 mb-3" />
                  <View className="flex-row justify-between items-center">
                    <Text className="text-gray-900 font-black text-sm uppercase">Total</Text>
                    <Text className="text-2xl font-black text-blue-600">${total.toFixed(2)}</Text>
                  </View>
                </View>

                {/* Footer Buttons */}
                <View className="flex-row gap-3">
                  <TouchableOpacity
                    onPress={onCancel}
                    className="flex-1 h-14 rounded-2xl bg-gray-50 items-center justify-center border border-gray-100"
                  >
                    <Text className="text-gray-500 font-bold text-sm">Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleConfirm}
                    className="flex-[1.5] h-14 rounded-2xl bg-blue-600 items-center justify-center"
                    style={{ shadowColor: '#2563EB', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 6 }}
                  >
                    <Text className="text-white font-black text-sm uppercase tracking-wider">Apply Changes</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}
