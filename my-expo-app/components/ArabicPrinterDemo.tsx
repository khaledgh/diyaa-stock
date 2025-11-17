import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, Alert, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ThermalPrinter from 'react-native-thermal-receipt-printer';

const ArabicPrinterDemo = () => {
  const [printerIp, setPrinterIp] = useState('');
  const [printerPort, setPrinterPort] = useState('9100');
  const [isConnected, setIsConnected] = useState(false);
  const [arabicText, setArabicText] = useState('فاتورة تجريبية\nالمنتج: اسم المنتج\nالسعر: 100 ريال\nشكراً لك');

  const connectPrinter = async () => {
    try {
      if (!printerIp) {
        Alert.alert('Error', 'Please enter printer IP address');
        return;
      }

      await ThermalPrinter.connectPrinter(printerIp, parseInt(printerPort));
      setIsConnected(true);
      Alert.alert('Success', 'Printer connected successfully!');
    } catch (error) {
      console.error('Connection error:', error);
      Alert.alert('Connection Failed', 'Could not connect to printer');
    }
  };

  const printArabicReceipt = async () => {
    try {
      if (!isConnected) {
        Alert.alert('Error', 'Please connect to printer first');
        return;
      }

      // Set encoding for Arabic support
      await ThermalPrinter.printText('<CB>إيصال تجريبي</CB>\n', {
        encoding: 'UTF-8',
        codepage: 32, // UTF-8 codepage
      });

      await ThermalPrinter.printText('================\n', {});

      await ThermalPrinter.printText(arabicText, {
        encoding: 'UTF-8',
        codepage: 32,
      });

      await ThermalPrinter.printText('\n================\n', {});

      // Cut paper
      await ThermalPrinter.printBill('', { beep: true });

      Alert.alert('Success', 'Arabic receipt printed!');
    } catch (error) {
      console.error('Print error:', error);
      Alert.alert('Print Failed', 'Could not print receipt');
    }
  };

  const disconnectPrinter = async () => {
    try {
      await ThermalPrinter.closeConn();
      setIsConnected(false);
      Alert.alert('Success', 'Printer disconnected');
    } catch (error) {
      console.error('Disconnect error:', error);
    }
  };

  return (
    <ScrollView className="flex-1 bg-gray-50 p-6">
      <View className="mb-6 items-center">
        <View className="mb-4 h-16 w-16 items-center justify-center rounded-2xl bg-green-100">
          <Ionicons name="print" size={32} color="#10B981" />
        </View>
        <Text className="mb-2 text-2xl font-bold text-gray-900">Arabic Printer Demo</Text>
        <Text className="text-center text-gray-600">
          Print Arabic receipts using thermal printer
        </Text>
      </View>

      {/* Connection Section */}
      <View className="mb-6 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
        <Text className="mb-3 text-lg font-semibold text-gray-900">Printer Connection</Text>

        <TextInput
          className="mb-3 rounded-lg border border-gray-300 p-3"
          placeholder="Printer IP Address (e.g., 192.168.1.100)"
          value={printerIp}
          onChangeText={setPrinterIp}
          keyboardType="numeric"
        />

        <TextInput
          className="mb-3 rounded-lg border border-gray-300 p-3"
          placeholder="Port (default: 9100)"
          value={printerPort}
          onChangeText={setPrinterPort}
          keyboardType="numeric"
        />

        <View className="flex-row space-x-2">
          <TouchableOpacity
            onPress={connectPrinter}
            disabled={isConnected}
            className={`flex-1 rounded-xl py-3 ${
              isConnected ? 'bg-gray-400' : 'bg-blue-600'
            }`}
          >
            <Text className="text-center font-semibold text-white">
              {isConnected ? 'Connected' : 'Connect'}
            </Text>
          </TouchableOpacity>

          {isConnected && (
            <TouchableOpacity
              onPress={disconnectPrinter}
              className="flex-1 rounded-xl bg-red-600 py-3"
            >
              <Text className="text-center font-semibold text-white">Disconnect</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Text Input Section */}
      <View className="mb-6 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
        <Text className="mb-3 text-lg font-semibold text-gray-900">Arabic Text</Text>

        <TextInput
          className="min-h-[100px] rounded-lg border border-gray-300 p-3 text-right"
          placeholder="Enter Arabic text..."
          value={arabicText}
          onChangeText={setArabicText}
          multiline
          textAlign="right"
        />
      </View>

      {/* Print Button */}
      {isConnected && (
        <TouchableOpacity
          onPress={printArabicReceipt}
          className="rounded-xl bg-green-600 py-4"
        >
          <View className="flex-row items-center justify-center">
            <Ionicons name="print" size={24} color="white" />
            <Text className="ml-2 text-lg font-semibold text-white">Print Arabic Receipt</Text>
          </View>
        </TouchableOpacity>
      )}

      {/* Info */}
      <View className="mt-6 rounded-2xl border border-blue-200 bg-blue-50 p-4">
        <Text className="text-sm text-blue-800">
          <Text className="font-semibold">Note:</Text> This demo uses react-native-thermal-receipt-printer with UTF-8 encoding for Arabic support.
          Make sure your printer supports UTF-8 and is connected to the same network.
        </Text>
      </View>
    </ScrollView>
  );
};

export default ArabicPrinterDemo;
