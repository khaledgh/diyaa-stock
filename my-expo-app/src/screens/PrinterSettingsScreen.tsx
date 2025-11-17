import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

export default function PrinterSettingsScreen({ onClose }: { onClose: () => void }) {
  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-white">
      {/* Header */}
      <View className="flex-row items-center border-b border-gray-100 px-4 py-3">
        <TouchableOpacity onPress={onClose} className="mr-3">
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-gray-900">Printer Settings</Text>
      </View>

      <View className="flex-1 items-center justify-center p-4">
        <Ionicons name="print-outline" size={64} color="#D1D5DB" />
        <Text className="mt-4 text-center text-lg text-gray-500">Printer Settings Moved</Text>
        <Text className="mt-2 text-center text-gray-400">
          Use the Printer Demo for Bluetooth printing functionality
        </Text>
        <TouchableOpacity onPress={onClose} className="mt-6 rounded-2xl bg-blue-600 px-6 py-3">
          <Text className="text-center font-bold text-white">Go Back</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
