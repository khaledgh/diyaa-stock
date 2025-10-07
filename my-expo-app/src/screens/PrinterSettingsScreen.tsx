import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import bluetoothPrinterService from '../services/bluetooth-printer.service';

interface PrinterDevice {
  address: string;
  name: string;
}

export default function PrinterSettingsScreen({ onClose }: { onClose: () => void }) {
  const [devices, setDevices] = useState<PrinterDevice[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [connectedDevice, setConnectedDevice] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = async () => {
    const connected = await bluetoothPrinterService.isConnected();
    if (connected) {
      // You might want to store the connected device address in AsyncStorage
      setConnectedDevice('Connected');
    }
  };

  const handleScan = async () => {
    if (!bluetoothPrinterService.isAvailable()) {
      Alert.alert(
        'Development Build Required',
        'Bluetooth printer requires a development build. Run: npx expo run:android'
      );
      return;
    }

    setIsScanning(true);
    try {
      const enabled = await bluetoothPrinterService.enableBluetooth();
      if (!enabled) {
        Alert.alert('Bluetooth', 'Please enable Bluetooth');
        setIsScanning(false);
        return;
      }

      const foundDevices = await bluetoothPrinterService.scanDevices();
      setDevices(foundDevices);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to scan for devices');
    } finally {
      setIsScanning(false);
    }
  };

  const handleConnect = async (device: PrinterDevice) => {
    setIsConnecting(true);
    try {
      const success = await bluetoothPrinterService.connectPrinter(device.address);
      if (success) {
        setConnectedDevice(device.name);
        Alert.alert('Success', `Connected to ${device.name}`);
      } else {
        Alert.alert('Error', 'Failed to connect to printer');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to connect to printer');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await bluetoothPrinterService.disconnectPrinter();
      setConnectedDevice(null);
      Alert.alert('Success', 'Printer disconnected');
    } catch (error) {
      Alert.alert('Error', 'Failed to disconnect');
    }
  };

  const handleTestPrint = async () => {
    try {
      await bluetoothPrinterService.testPrint();
      Alert.alert('Success', 'Test print sent');
    } catch (error) {
      Alert.alert('Error', 'Failed to print. Make sure printer is connected.');
    }
  };

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-white">
      {/* Header */}
      <View className="px-4 py-3 border-b border-gray-100 flex-row items-center">
        <TouchableOpacity onPress={onClose} className="mr-3">
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text className="text-gray-900 text-xl font-bold">Printer Settings</Text>
      </View>

      <View className="flex-1 p-4">
        {/* Connection Status */}
        {connectedDevice && (
          <View className="bg-green-50 rounded-2xl p-4 mb-4 flex-row items-center justify-between">
            <View className="flex-row items-center">
              <Ionicons name="checkmark-circle" size={24} color="#10B981" />
              <View className="ml-3">
                <Text className="text-green-900 font-semibold">Connected</Text>
                <Text className="text-green-700 text-sm">{connectedDevice}</Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={handleDisconnect}
              className="bg-red-100 px-3 py-2 rounded-lg"
            >
              <Text className="text-red-600 font-semibold text-sm">Disconnect</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Test Print Button */}
        {connectedDevice && (
          <TouchableOpacity
            onPress={handleTestPrint}
            className="bg-blue-600 rounded-2xl py-3 mb-4"
          >
            <Text className="text-white text-center font-bold">Test Print</Text>
          </TouchableOpacity>
        )}

        {/* Scan Button */}
        <TouchableOpacity
          onPress={handleScan}
          disabled={isScanning}
          className="bg-blue-600 rounded-2xl py-3 mb-4"
        >
          {isScanning ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text className="text-white text-center font-bold">Scan for Printers</Text>
          )}
        </TouchableOpacity>

        {/* Devices List */}
        {devices.length > 0 && (
          <View className="flex-1">
            <Text className="text-gray-900 font-bold mb-3">Available Devices:</Text>
            <FlatList
              data={devices}
              keyExtractor={(item) => item.address}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => handleConnect(item)}
                  disabled={isConnecting}
                  className="bg-gray-50 rounded-2xl p-4 mb-2 flex-row items-center justify-between"
                  style={{ elevation: 1 }}
                >
                  <View className="flex-row items-center flex-1">
                    <Ionicons name="print" size={24} color="#3B82F6" />
                    <View className="ml-3 flex-1">
                      <Text className="text-gray-900 font-semibold">{item.name}</Text>
                      <Text className="text-gray-500 text-xs">{item.address}</Text>
                    </View>
                  </View>
                  {isConnecting ? (
                    <ActivityIndicator size="small" color="#3B82F6" />
                  ) : (
                    <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        )}

        {devices.length === 0 && !isScanning && (
          <View className="flex-1 items-center justify-center">
            <Ionicons name="print-outline" size={64} color="#D1D5DB" />
            <Text className="text-gray-500 mt-4 text-center">
              No printers found.{'\n'}Tap "Scan for Printers" to search.
            </Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
