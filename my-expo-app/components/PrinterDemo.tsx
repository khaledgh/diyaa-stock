import React, {
  useState,
  useEffect,
  useRef,
  forwardRef,
  useImperativeHandle,
} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  PermissionsAndroid,
  Platform,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiService from '../src/services/api.service';
import { PrintableReceiptData } from '../utils/receiptImagePrinter';
import { captureRef } from 'react-native-view-shot';
import { decodePNG } from '../utils/pngDecoder';
import ReceiptBitmapView from './ReceiptBitmapView';
import * as FileSystem from 'expo-file-system';

// Import Bluetooth Classic (SPP) — this printer uses Classic BT, NOT BLE
let RNBluetoothClassic: any = null;

const initializeBTClassic = async () => {
  try {
    const mod = await import('react-native-bluetooth-classic');
    RNBluetoothClassic = mod.default;
    console.log('🔵 Bluetooth Classic module loaded');
  } catch (error) {
    console.warn('Bluetooth Classic module not available:', error);
  }
};

initializeBTClassic();

const SAVED_DEVICE_KEY = 'saved_bt_printer';

// Helper: convert number[] to base64 string for Classic BT write
const bytesToBase64 = (bytes: number[]): string => {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
};

const PrinterDemo = forwardRef(function PrinterDemo({ hideUI, onClose }: { hideUI?: boolean; onClose?: () => void }, ref: any): React.ReactNode {
  const [devices, setDevices] = useState<any[]>([]);
  const [connectedDevice, setConnectedDevice] = useState<any | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [savedDeviceAddr, setSavedDeviceAddr] = useState<string | null>(null);
  const [btEnabled, setBtEnabled] = useState(false);
  const [receiptData, setReceiptData] = useState<PrintableReceiptData | null>(null);
  const [template, setTemplate] = useState<any>(null);
  const receiptViewRef = useRef<View>(null);

  // -------------------- PERMISSIONS --------------------
  const requestPermissions = async (): Promise<boolean> => {
    if (Platform.OS !== 'android') return true;
    try {
      if (Number(Platform.Version) >= 31) {
        const results = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        ]);
        const allGranted = Object.values(results).every(r => r === PermissionsAndroid.RESULTS.GRANTED);
        if (!allGranted) {
          Alert.alert('Permissions Required', 'Bluetooth and Location permissions are needed.');
          return false;
        }
      } else {
        const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          Alert.alert('Permission Required', 'Location permission is needed for Bluetooth.');
          return false;
        }
      }
      return true;
    } catch (e) {
      console.error('Permission error:', e);
      return false;
    }
  };

  // -------------------- SEND DATA VIA SPP --------------------
  const CHUNK_SIZE = 512; // bytes per BT write chunk to avoid buffer overflow

  const sendChunk = async (address: string, chunk: number[]): Promise<void> => {
    const b64 = bytesToBase64(chunk);
    try {
      await RNBluetoothClassic._nativeModule.writeToDevice(address, b64);
    } catch (e: any) {
      // Fallback: try the standard way
      await connectedDevice.write(b64, 'base64');
    }
  };

  const sendEscPosCommands = async (commands: number[]) => {
    if (!connectedDevice) throw new Error('No printer connected');
    if (!RNBluetoothClassic) throw new Error('Bluetooth Classic module not available');

    console.log(`📨 Sending ${commands.length} bytes via Classic BT SPP...`);

    const address = connectedDevice.address;

    if (commands.length <= CHUNK_SIZE) {
      // Small payload — send in one go
      const b64 = bytesToBase64(commands);
      try {
        await RNBluetoothClassic._nativeModule.writeToDevice(address, b64);
        console.log('✅ Transmission completed via native module');
      } catch (e: any) {
        console.error(`❌ Native write failed, trying device.write:`, e?.message);
        try {
          await connectedDevice.write(b64, 'base64');
          console.log('✅ Transmission completed via device.write');
        } catch (e2: any) {
          console.error(`❌ device.write also failed:`, e2?.message);
          throw e2;
        }
      }
    } else {
      // Large payload (bitmap) — send in chunks with small delays
      const totalChunks = Math.ceil(commands.length / CHUNK_SIZE);
      console.log(`📨 Sending in ${totalChunks} chunks of ${CHUNK_SIZE} bytes...`);
      for (let i = 0; i < commands.length; i += CHUNK_SIZE) {
        const chunk = commands.slice(i, i + CHUNK_SIZE);
        await sendChunk(address, chunk);
        // Small delay between chunks to let the printer process
        if (i + CHUNK_SIZE < commands.length) {
          await new Promise(r => setTimeout(r, 20));
        }
      }
      console.log('✅ Chunked transmission completed');
    }
  };

  // -------------------- DEVICE MANAGEMENT --------------------
  const saveDeviceAddress = async (address: string) => {
    await AsyncStorage.setItem(SAVED_DEVICE_KEY, address);
    setSavedDeviceAddr(address);
  };

  const clearSavedDevice = async () => {
    await AsyncStorage.removeItem(SAVED_DEVICE_KEY);
    setSavedDeviceAddr(null);
  };

  const loadBondedDevices = async () => {
    if (!RNBluetoothClassic) {
      Alert.alert('Error', 'Bluetooth Classic module not available. Use a development build.');
      return;
    }

    const ok = await requestPermissions();
    if (!ok) return;

    setIsScanning(true);
    try {
      const bonded = await RNBluetoothClassic.getBondedDevices();
      console.log(`🔍 Found ${bonded.length} bonded devices`);
      setDevices(bonded);
    } catch (e: any) {
      console.error('Failed to get bonded devices:', e?.message);
      Alert.alert('Error', `Failed to list paired devices: ${e?.message}`);
    } finally {
      setIsScanning(false);
    }
  };

  const connectToDevice = async (device: any) => {
    if (!RNBluetoothClassic) {
      Alert.alert('Error', 'Bluetooth Classic module not available.');
      return;
    }

    setIsConnecting(true);
    try {
      const address = device.address || device.id;
      console.log(`🔌 Connecting to ${device.name || address} via Classic BT SPP...`);

      // Check if already connected
      const alreadyConnected = await RNBluetoothClassic.isDeviceConnected(address);
      let connected;
      if (alreadyConnected) {
        console.log('✅ Already connected');
        connected = await RNBluetoothClassic.getConnectedDevice(address);
      } else {
        connected = await RNBluetoothClassic.connectToDevice(address, {});
      }

      setConnectedDevice(connected);
      await saveDeviceAddress(address);
      console.log('✅ Connected to', connected.name || address);
      Alert.alert('Success', `Connected to ${connected.name || 'Printer'}`);
    } catch (e: any) {
      console.error('❌ Connection failed:', e?.message);
      Alert.alert('Connection Failed', `Could not connect: ${e?.message}\n\nMake sure the printer is ON and paired in Android Bluetooth settings.`);
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectDevice = async () => {
    if (!connectedDevice || !RNBluetoothClassic) return;
    try {
      const address = connectedDevice.address || connectedDevice.id;
      await RNBluetoothClassic.disconnectFromDevice(address);
      setConnectedDevice(null);
      console.log('🔌 Disconnected');
      Alert.alert('Disconnected', 'Printer disconnected.');
    } catch (e: any) {
      console.error('Disconnect error:', e?.message);
      setConnectedDevice(null);
    }
  };

  // -------------------- INIT --------------------
  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      // Wait for BT Classic module
      if (!RNBluetoothClassic) {
        for (let i = 0; i < 20; i++) {
          await new Promise(r => setTimeout(r, 300));
          if (RNBluetoothClassic) break;
        }
      }
      if (cancelled || !RNBluetoothClassic) return;

      try {
        // Check if BT is enabled by trying to get bonded devices
        await RNBluetoothClassic.getBondedDevices();
        setBtEnabled(true);

        // Load saved device and auto-connect
        const savedAddr = await AsyncStorage.getItem(SAVED_DEVICE_KEY);
        if (cancelled || !savedAddr) return;
        setSavedDeviceAddr(savedAddr);

        // Try auto-connect
        setIsConnecting(true);
        try {
          const isConn = await RNBluetoothClassic.isDeviceConnected(savedAddr);
          let device;
          if (isConn) {
            device = await RNBluetoothClassic.getConnectedDevice(savedAddr);
          } else {
            device = await RNBluetoothClassic.connectToDevice(savedAddr, {});
          }
          if (!cancelled) {
            setConnectedDevice(device);
            console.log('✅ Auto-connected to', device.name || savedAddr);
          }
        } catch (e: any) {
          console.log('⚠️ Auto-connect failed:', e?.message);
        } finally {
          if (!cancelled) setIsConnecting(false);
        }
      } catch (e) {
        console.error('Init error:', e);
      }
    };

    init();
    
    const fetchTemplate = async () => {
      try {
        const response = await apiService.getDefaultTemplate('invoice');
        if (response.ok || response.success) {
          const t = response.data;
          setTemplate({
            ...t,
            fields: typeof t.fields === 'string' ? JSON.parse(t.fields) : t.fields,
            layout: typeof t.layout === 'string' ? JSON.parse(t.layout) : t.layout,
            custom_texts: typeof t.custom_texts === 'string' ? JSON.parse(t.custom_texts) : t.custom_texts,
          });
        }
      } catch (err) {
        console.log('Template fetch error:', err);
      }
    };
    fetchTemplate();

    return () => { cancelled = true; };
  }, []);

  const enableBluetooth = async () => {
    if (!RNBluetoothClassic) {
      Alert.alert('Error', 'Bluetooth Classic module not available. Use a development build.');
      return;
    }
    try {
      await RNBluetoothClassic.requestBluetoothEnabled();
      setBtEnabled(true);
      Alert.alert('Success', 'Bluetooth is enabled!');
    } catch (e: any) {
      Alert.alert('Bluetooth', `Please enable Bluetooth in Android Settings.\n\n${e?.message || ''}`);
    }
  };

  // -------------------- TEST PRINT --------------------
  // Simplest possible raw test — just ASCII bytes, no PrinterCommands helper
  const testRawPrint = async () => {
    if (!connectedDevice || !RNBluetoothClassic) return Alert.alert('Error', 'No printer connected');

    try {
      // Raw ESC/POS: init + "Hello\n" + feed 3 lines
      const raw: number[] = [
        0x1B, 0x40,                                             // ESC @ — initialize
        0x48, 0x65, 0x6C, 0x6C, 0x6F, 0x20, 0x57, 0x6F,       // "Hello Wo"
        0x72, 0x6C, 0x64, 0x21, 0x0A,                          // "rld!\n"
        0x54, 0x65, 0x73, 0x74, 0x0A,                          // "Test\n"
        0x1B, 0x64, 0x04,                                      // ESC d 4 — feed 4 lines
      ];

      console.log('🔬 RAW TEST: sending', raw.length, 'bytes directly');

      const address = connectedDevice.address;

      // Method 1: Direct native module call
      const b64 = bytesToBase64(raw);
      console.log('🔬 RAW b64:', b64);
      try {
        await RNBluetoothClassic._nativeModule.writeToDevice(address, b64);
        console.log('🔬 RAW: native module write OK');
      } catch (e1: any) {
        console.error('🔬 RAW: native write failed:', e1?.message);
      }

      // Method 2: Plain text write (no encoding param)
      try {
        await connectedDevice.write('Hello from method2\n');
        console.log('🔬 RAW: plain text write OK');
      } catch (e2: any) {
        console.error('🔬 RAW: plain text write failed:', e2?.message);
      }

      Alert.alert('Raw Test', 'Check printer and terminal logs');
    } catch (e: any) {
      Alert.alert('Raw Test Failed', e?.message || 'Unknown error');
    }
  };

  const testSimplePrint = async () => {
    if (!connectedDevice) return Alert.alert('Error', 'No printer connected');

    try {
      const cmd: number[] = [];
      cmd.push(0x1b, 0x40); // ESC @ init
      cmd.push(0x1b, 0x61, 0x01); // center
      cmd.push(0x1b, 0x45, 0x01); // bold on
      cmd.push(...textToUtf8Bytes('Hello World!\n'));
      cmd.push(0x1b, 0x45, 0x00); // bold off
      cmd.push(...textToUtf8Bytes('================================\n'));
      cmd.push(...textToUtf8Bytes('Classic BT SPP Test\n'));
      cmd.push(...textToUtf8Bytes('================================\n'));
      cmd.push(0x1b, 0x64, 0x04); // feed 4 lines
      cmd.push(0x1d, 0x56, 0x00); // cut

      await sendEscPosCommands(cmd);
      Alert.alert('Success', 'Test print sent! Check the printer.');
    } catch (e: any) {
      Alert.alert('Print Failed', e?.message || 'Unknown error');
    }
  };

  // -------------------- UTF-8 TEXT HELPERS --------------------
  // Convert a JS string to UTF-8 byte array — works for Arabic, English, any Unicode
  const textToUtf8Bytes = (text: string): number[] => {
    const bytes: number[] = [];
    for (let i = 0; i < text.length; i++) {
      let code = text.charCodeAt(i);
      // Handle surrogate pairs
      if (code >= 0xD800 && code <= 0xDBFF && i + 1 < text.length) {
        const low = text.charCodeAt(i + 1);
        if (low >= 0xDC00 && low <= 0xDFFF) {
          code = ((code - 0xD800) << 10) + (low - 0xDC00) + 0x10000;
          i++;
        }
      }
      if (code < 0x80) {
        bytes.push(code);
      } else if (code < 0x800) {
        bytes.push(0xC0 | (code >> 6), 0x80 | (code & 0x3F));
      } else if (code < 0x10000) {
        bytes.push(0xE0 | (code >> 12), 0x80 | ((code >> 6) & 0x3F), 0x80 | (code & 0x3F));
      } else {
        bytes.push(0xF0 | (code >> 18), 0x80 | ((code >> 12) & 0x3F), 0x80 | ((code >> 6) & 0x3F), 0x80 | (code & 0x3F));
      }
    }
    return bytes;
  };

  const testArabicPrint = async () => {
    if (!connectedDevice) return Alert.alert('Error', 'No printer connected');

    try {
      const testData: PrintableReceiptData = {
        invoiceNumber: 'TEST-001',
        customerName: 'عميل تجريبي',
        items: [
          { name: 'قهوة عربية', quantity: 2, unitPrice: 15.00, total: 30.00 },
          { name: 'شاي أخضر', quantity: 1, unitPrice: 10.00, total: 10.00 },
          { name: 'ماء معدني', quantity: 3, unitPrice: 5.00, total: 15.00 },
        ],
        subtotal: 55.00,
        discount: 0,
        tax: 0,
        total: 55.00,
        paidAmount: 55.00,
        date: new Date().toLocaleDateString('ar-SA'),
        cashierName: 'كاشير',
        storeName: 'متجر تجريبي',
      };
      await printReceiptData(testData);
      Alert.alert('Success', 'Arabic receipt sent!');
    } catch (e: any) {
      Alert.alert('Print Failed', e?.message || 'Unknown error');
    }
  };

  // -------------------- STRUCTURED RECEIPT PRINTING (BITMAP via ESC *) --------------------
  // Printer doesn't support UTF-8 Arabic or GS v 0 raster.
  // Use ESC * (bit image) line-by-line — universally supported on all ESC/POS printers.
  // Each line: ESC * m nL nH [data] where m=0 (8-dot single density) or m=33 (24-dot double density)
  
  const getPrinterWidth = () => {
    // 576px wide for 80mm thermal paper.
    return 576;
  };

  const printReceiptData = async (data: PrintableReceiptData) => {
    const printerWidth = getPrinterWidth();
    console.log(`🖨️ printReceiptData (ESC * bitmap): ${data.invoiceNumber}, width=${printerWidth}`);

    if (!connectedDevice) {
      throw new Error('No printer connected');
    }

    try {
      // 1. Render the receipt view
      setReceiptData(data);
      await new Promise(resolve => setTimeout(resolve, 1000));

      if (!receiptViewRef.current) {
        throw new Error('Receipt view ref not ready');
      }

      // 2. Capture as PNG at native device resolution (no width override).
      // On a 3x device, a 384 CSS-px view captures as ~1152px PNG.
      // The downsampling code (step 5) maps it to exactly 384 printer dots.
      // DO NOT pass width — it causes the capture to render at 1x scale,
      // making content only fill ~1/3 of the paper.
      console.log('📸 Capturing at native resolution...');
      const tmpUri = await captureRef(receiptViewRef.current, {
        format: 'png',
        quality: 1,
        result: 'tmpfile',
      });
      console.log('📸 Captured:', tmpUri);

      // 3. Read as base64
      const b64 = await FileSystem.readAsStringAsync(tmpUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      console.log('📄 Base64 length:', b64.length);

      // 4. Decode PNG to RGBA pixels
      const png = decodePNG(b64);
      if (!png) throw new Error('PNG decode failed');
      const { width: imgW, height: imgH, pixels } = png;
      console.log(`📷 Image: ${imgW}x${imgH}`);

      // 5. Convert to 1-bit monochrome at printerWidth
      const outW = printerWidth;
      const scaleX = imgW / outW;
      const scaleY = scaleX;
      const outH = Math.round(imgH / scaleY);
      console.log(`🔄 Output: ${outW}x${outH}, scale=${scaleX.toFixed(2)}`);

      // Build monochrome bitmap: 1 bit per pixel, 1=black 0=white
      // Organized as rows of (outW / 8) bytes
      const bytesPerRow = outW / 8; // 48 for 384px
      const mono = new Uint8Array(outH * bytesPerRow);
      let darkCount = 0;

      for (let y = 0; y < outH; y++) {
        for (let byteIdx = 0; byteIdx < bytesPerRow; byteIdx++) {
          let byte = 0;
          for (let bit = 0; bit < 8; bit++) {
            const outX = byteIdx * 8 + bit;
            const sx0 = Math.floor(outX * scaleX);
            const sx1 = Math.min(Math.ceil((outX + 1) * scaleX), imgW);
            const sy0 = Math.floor(y * scaleY);
            const sy1 = Math.min(Math.ceil((y + 1) * scaleY), imgH);

            let isDark = false;
            for (let sy = sy0; sy < sy1 && !isDark; sy++) {
              for (let sx = sx0; sx < sx1 && !isDark; sx++) {
                const idx = (sy * imgW + sx) * 4;
                const r = pixels[idx];
                const g = pixels[idx + 1];
                const bv = pixels[idx + 2];
                const a = pixels[idx + 3];
                const gray = 0.299 * r + 0.587 * g + 0.114 * bv;
                if (a > 128 && gray < 160) isDark = true;
              }
            }
            if (isDark) {
              byte |= (0x80 >> bit);
              darkCount++;
            }
          }
          mono[y * bytesPerRow + byteIdx] = byte;
        }
      }

      console.log(`🔍 Dark dots: ${darkCount}, mono size: ${mono.length}`);

      // 6. Send using ESC * line-by-line (24 dots high per stripe)
      // ESC * 33 nL nH [data]  — 24-dot double-density
      // nL nH = number of columns (low/high byte) = PRINTER_WIDTH
      // data = 3 bytes per column (24 bits = 24 dots vertically)
      // After each stripe: ESC J n to feed 24 dots

      const nL = outW & 0xff;
      const nH = (outW >> 8) & 0xff;
      const STRIPE_HEIGHT = 24; // 24 dots per ESC * stripe
      const stripes = Math.ceil(outH / STRIPE_HEIGHT);

      console.log(`📤 Sending ${stripes} stripes of ${STRIPE_HEIGHT}px...`);

      // ESC @ init + left align + zero margin + full print width
      const initCmd: number[] = [0x1b, 0x40]; // ESC @ — initialize
      initCmd.push(0x1b, 0x61, 0x00);         // ESC a 0 — left alignment
      initCmd.push(0x1d, 0x4c, 0x00, 0x00);   // GS L 0 0 — left margin = 0
      initCmd.push(0x1d, 0x57, 0x40, 0x02);   // GS W nL nH — print area = 576 dots (0x0240)
      initCmd.push(0x1b, 0x33, STRIPE_HEIGHT); // ESC 3 n — line spacing = stripe height
      await sendEscPosCommands(initCmd);

      for (let stripe = 0; stripe < stripes; stripe++) {
        const cmd: number[] = [];
        // ESC * 33 nL nH
        cmd.push(0x1b, 0x2a, 33, nL, nH);

        // For each column (x), send 3 bytes (24 vertical dots)
        for (let x = 0; x < outW; x++) {
          for (let k = 0; k < 3; k++) {
            let colByte = 0;
            for (let bit = 0; bit < 8; bit++) {
              const y = stripe * STRIPE_HEIGHT + k * 8 + bit;
              if (y < outH) {
                const byteIdx = Math.floor(x / 8);
                const bitIdx = 7 - (x % 8);
                if (mono[y * bytesPerRow + byteIdx] & (1 << bitIdx)) {
                  colByte |= (0x80 >> bit);
                }
              }
            }
            cmd.push(colByte);
          }
        }

        // Newline to print the stripe
        cmd.push(0x0a);

        await sendEscPosCommands(cmd);
        // Small delay between stripes
        await new Promise(r => setTimeout(r, 50));
      }

      // Reset line spacing, alignment, and finish
      const endCmd: number[] = [];
      endCmd.push(0x1b, 0x32);       // ESC 2 — reset to default line spacing
      endCmd.push(0x1b, 0x61, 0x00); // ESC a 0 — left alignment (reset)
      endCmd.push(0x1b, 0x64, 0x03); // feed 3 lines
      endCmd.push(0x1d, 0x56, 0x00); // cut
      await sendEscPosCommands(endCmd);

      console.log('✅ Bitmap receipt sent!');

      // Cleanup
      setReceiptData(null);
      FileSystem.deleteAsync(tmpUri, { idempotent: true }).catch(() => {});
    } catch (error) {
      console.error('❌ printReceiptData error:', error);
      setReceiptData(null);
      throw error;
    }
  };

  // -------------------- REF EXPOSE --------------------
  useImperativeHandle(ref, () => ({
    printReceipt: testArabicPrint,
    printReceiptData,
    getConnectedDevice: () => connectedDevice,
    isConnected: () => !!connectedDevice,
  }));

  // -------------------- UI --------------------
  const bitmapView = (
    <View collapsable={false} style={{ position: 'absolute', top: -9999, left: 0, width: 576, opacity: 0 }}>
      <ReceiptBitmapView ref={receiptViewRef} data={receiptData} template={template} />
    </View>
  );

  if (hideUI) {
    return bitmapView;
  }

  const deviceAddress = connectedDevice?.address || connectedDevice?.id || '';

  return (
    <>
    {bitmapView}
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: '#fff' }}>
        {onClose && (
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' }}>
            <TouchableOpacity onPress={onClose} style={{ marginRight: 12 }}>
              <Ionicons name="arrow-back" size={24} color="#000" />
            </TouchableOpacity>
            <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#111827' }}>Printer</Text>
          </View>
        )}
        <ScrollView
          className="flex-1 bg-gray-50"
          showsVerticalScrollIndicator
          contentContainerStyle={{ paddingBottom: 50 }}
        >
      <View className="p-6">
        <View className="mb-8 items-center">
          <View className="mb-4 h-16 w-16 items-center justify-center rounded-2xl bg-blue-100">
            <Ionicons name="bluetooth" size={32} color="#3B82F6" />
          </View>
          <Text className="mb-2 text-2xl font-bold text-gray-900">Bluetooth Printer</Text>
          <Text className="text-center text-gray-600">
            Connect via Classic Bluetooth (SPP) to thermal printer
          </Text>
        </View>

        {/* BLUETOOTH STATUS */}
        <View className="mb-6 rounded-2xl border border-gray-100 bg-white p-4" style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 }}>
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center">
              <Ionicons name="bluetooth-outline" size={24} color="#3B82F6" />
              <View className="ml-3">
                <Text className="font-semibold text-gray-900">Bluetooth</Text>
                <Text className={`text-sm ${btEnabled ? 'text-green-600' : 'text-red-600'}`}>
                  {btEnabled ? 'Enabled' : 'Disabled'}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={enableBluetooth}
              className={`rounded-xl px-4 py-2 ${btEnabled ? 'bg-green-600' : 'bg-blue-600'}`}
            >
              <Text className="font-semibold text-white">
                {btEnabled ? 'Ready' : 'Enable'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* CONNECTED DEVICE */}
        {connectedDevice && (
          <View className="mb-6 rounded-2xl border border-green-200 bg-green-50 p-4">
            <View className="mb-3 flex-row items-center justify-between">
              <View className="flex-row items-center">
                <Ionicons name="checkmark-circle" size={24} color="#10B981" />
                <Text className="ml-2 font-semibold text-green-900">Connected</Text>
              </View>
              <TouchableOpacity
                onPress={disconnectDevice}
                className="rounded-lg bg-red-100 px-3 py-1.5"
              >
                <Text className="text-sm font-semibold text-red-600">Disconnect</Text>
              </TouchableOpacity>
            </View>
            <Text className="font-medium text-green-800">{connectedDevice.name || 'Printer'}</Text>
            <Text className="text-sm text-green-600">{deviceAddress}</Text>

            <TouchableOpacity
              onPress={testRawPrint}
              className="mt-3 rounded-xl bg-orange-600 py-3"
            >
              <View className="flex-row items-center justify-center">
                <Ionicons name="bug" size={20} color="white" />
                <Text className="ml-2 font-semibold text-white">Raw Byte Test (Debug)</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={testSimplePrint}
              className="mt-2 rounded-xl bg-purple-600 py-3"
            >
              <View className="flex-row items-center justify-center">
                <Ionicons name="flash" size={20} color="white" />
                <Text className="ml-2 font-semibold text-white">Test Print (English)</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={testArabicPrint}
              className="mt-2 rounded-xl bg-green-600 py-3"
            >
              <View className="flex-row items-center justify-center">
                <Ionicons name="print" size={20} color="white" />
                <Text className="ml-2 font-semibold text-white">Test Print (Arabic)</Text>
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* PAIRED DEVICES FROM ANDROID */}
        <View className="mb-4">
          <View className="mb-4 flex-row items-center justify-between">
            <Text className="text-lg font-bold text-gray-900">Paired Devices</Text>
            <TouchableOpacity
              onPress={loadBondedDevices}
              disabled={isScanning}
              className="flex-row items-center rounded-lg bg-blue-100 px-3 py-1.5"
            >
              {isScanning ? (
                <ActivityIndicator size="small" color="#3B82F6" />
              ) : (
                <>
                  <Ionicons name="refresh" size={16} color="#3B82F6" />
                  <Text className="ml-1 text-sm font-semibold text-blue-600">Load</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          <Text className="mb-3 text-sm text-gray-500">
            Pair your printer in Android Settings → Bluetooth first, then tap Load.
          </Text>

          {devices.length > 0 ? (
            devices.map((item) => {
              const addr = item.address || item.id;
              const isSaved = savedDeviceAddr === addr;
              return (
              <TouchableOpacity
                key={addr}
                onPress={() => connectToDevice(item)}
                disabled={isConnecting}
                className={`mb-3 rounded-2xl border p-4 ${isSaved ? 'border-purple-200 bg-purple-50' : 'border-gray-100 bg-white'}`}
                style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 }}
              >
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center">
                    <View className={`mr-3 h-12 w-12 items-center justify-center rounded-xl ${isSaved ? 'bg-purple-100' : 'bg-blue-100'}`}>
                      <Ionicons name={isSaved ? 'bookmark' : 'print-outline'} size={24} color={isSaved ? '#7C3AED' : '#3B82F6'} />
                    </View>
                    <View>
                      <Text className="text-base font-semibold text-gray-900">
                        {item.name || 'Bluetooth Device'}
                      </Text>
                      <Text className="text-sm text-gray-500">{addr}</Text>
                      {isSaved && <Text className="text-xs text-purple-500 mt-1">Saved Printer</Text>}
                    </View>
                  </View>
                  <View className="flex-row items-center">
                    {isSaved && (
                      <TouchableOpacity
                        onPress={clearSavedDevice}
                        className="mr-2 rounded-lg bg-red-100 px-2 py-1"
                      >
                        <Ionicons name="trash-outline" size={16} color="#DC2626" />
                      </TouchableOpacity>
                    )}
                    {isConnecting ? (
                      <ActivityIndicator color="#3B82F6" size="small" />
                    ) : (
                      <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                    )}
                  </View>
                </View>
              </TouchableOpacity>
              );
            })
          ) : (
            <View className="items-center justify-center rounded-2xl border border-gray-100 bg-white p-8">
              <Ionicons name="print-outline" size={48} color="#D1D5DB" />
              <Text className="mt-4 text-center text-gray-500">
                Tap &quot;Load&quot; to show Bluetooth paired devices.
              </Text>
            </View>
          )}
        </View>
      </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
    </>
  );
});

export default PrinterDemo;
