import React, {
  useState,
  useEffect,
  forwardRef,
  useImperativeHandle,
  useCallback,
  useRef,
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { printArabicReceiptLocally as printArabicReceiptUtil, ReceiptData } from '../utils/arabicPrinter';

// Initialize BLE manager dynamically to handle Expo Go compatibility
let bleManager: any = null;

const initializeBLEManager = async () => {
  try {
    const { BleManager } = await import('react-native-ble-plx');
    bleManager = new BleManager();
    console.log('BLE Manager initialized successfully');
  } catch (error) {
    console.warn('BLE module not available:', error);
  }
};

// Initialize BLE manager on module load
initializeBLEManager();

const PrinterDemo = forwardRef(function PrinterDemo(_: any, ref: any): React.ReactNode {
  const [devices, setDevices] = useState<any[]>([]);
  const [connectedDevice, setConnectedDevice] = useState<any | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [savedDevice, setSavedDevice] = useState<any | null>(null);
  const [bluetoothState, setBluetoothState] = useState<string>('unknown');
  const receiptViewRef = useRef<View>(null);

  const SAVED_DEVICE_KEY = 'saved_bluetooth_printer';

  // -------------------- DEVICE MGMT --------------------
  const saveDevice = async (device: any) => {
    console.log('Saving device:', device);
    await AsyncStorage.setItem(SAVED_DEVICE_KEY, JSON.stringify(device));
    setSavedDevice(device);
    console.log('Device saved, current savedDevice state:', device);
  };

  const attemptAutoReconnect = useCallback(async (device: any) => {
    try {
      if (!bleManager) {
        console.log('BLE manager not available for auto-reconnect');
        return;
      }
      setIsConnecting(true);
      console.log('Attempting to connect to saved device:', device.id);
      const connectedDevice = await bleManager.connectToDevice(device.id);
      setConnectedDevice(connectedDevice);
      await saveDevice(connectedDevice);
      console.log('✅ Auto-reconnected to', connectedDevice.name);
    } catch (e) {
      console.log('Auto-reconnect failed:', e);
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const requestBluetoothPermissions = async () => {
    try {
      // Request location permission (required for BLE scanning on Android)
      const locationGranted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: 'Location Permission',
          message: 'This app needs location permission to scan for Bluetooth devices.',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        }
      );

      if (locationGranted !== PermissionsAndroid.RESULTS.GRANTED) {
        Alert.alert(
          'Permission Required',
          'Location permission is required for Bluetooth scanning. Please grant it in app settings.',
          [{ text: 'OK' }]
        );
        return false;
      }

      // For Android 12+, request Bluetooth permissions
      if (Number(Platform.Version) >= 31) { // Android 12+
        const bluetoothScanGranted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          {
            title: 'Bluetooth Scan Permission',
            message: 'This app needs permission to scan for Bluetooth devices.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );

        const bluetoothConnectGranted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          {
            title: 'Bluetooth Connect Permission',
            message: 'This app needs permission to connect to Bluetooth devices.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );

        if (bluetoothScanGranted !== PermissionsAndroid.RESULTS.GRANTED ||
            bluetoothConnectGranted !== PermissionsAndroid.RESULTS.GRANTED) {
          Alert.alert(
            'Bluetooth Permissions Required',
            'Bluetooth scan and connect permissions are required. Please grant them in app settings.',
            [{ text: 'OK' }]
          );
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('Permission request failed:', error);
      return false;
    }
  };

  const sendEscPosCommands = async (commands: number[]) => {
    if (!connectedDevice) {
      throw new Error('No printer connected');
    }

    console.log('📨 Preparing to send ESC/POS commands. Bytes:', commands.length);

    console.log('🔍 Checking BLE manager availability...');
    if (!bleManager) {
      throw new Error('BLE module not available or not initialized yet. Please wait a moment and try again.');
    }

    let activeDevice = connectedDevice;

    let discovery: any;

    const discoverServices = async (device: any) => {
      console.log('🔍 Discovering services...');
      try {
      const services = await device.services();
      console.log('📋 Available services:', services.map((s: any) => ({
        uuid: s.uuid,
        isPrimary: s.isPrimary
      })));

      const printService = services.find((s: any) => 
        s.uuid.toLowerCase().includes('49535343-fe7d-4ae5-8fa9-9fafd205e455')
      );

      if (!printService) {
        throw new Error('Print service not found');
      }

      console.log('🔍 Print service found:', printService.uuid);
      console.log('🔍 Discovering characteristics for service:', printService.uuid);
      const characteristics = await printService.characteristics();
      console.log('📋 Available characteristics:', characteristics.map((c: any) => ({
        uuid: c.uuid,
        isWritableWithResponse: c.isWritableWithResponse,
        isWritableWithoutResponse: c.isWritableWithoutResponse,
        isNotifiable: c.isNotifiable
      })));

      // Find the write characteristic - try 1e4d first if it's writable, otherwise use 8841
      const writeChar = characteristics.find((char: any) =>
        char.uuid.toLowerCase().includes('1e4d') &&
        (char.isWritableWithResponse || char.isWritableWithoutResponse)
      ) || characteristics.find((char: any) =>
        char.uuid.toLowerCase().includes('8841') &&
        (char.isWritableWithResponse || char.isWritableWithoutResponse)
      );

      console.log('🔍 Write characteristic found:', writeChar ? writeChar.uuid : 'NONE');

      if (!writeChar) {
        throw new Error('No writable characteristic found for printing');
      }

      return { printService, writeChar };
      } catch (error) {
        console.error('❌ Service discovery error:', error);
        throw error;
      }
    };

    try {
      discovery = await discoverServices(activeDevice);
    } catch (serviceError) {
      console.warn('❌ Service discovery failed, attempting automatic reconnection...', serviceError);
      activeDevice = await refreshConnection({ reason: 'Automatic reconnection before sending commands' });
      discovery = await discoverServices(activeDevice);
    }

    const { printService, writeChar } = discovery;

    console.log('✅ Using characteristic:', writeChar.uuid);
    console.log(`📤 Sending ${commands.length} bytes of ESC/POS data...`);

    console.log('🔍 Raw commands:', commands);

    // Try sending data in much smaller chunks to avoid BLE MTU issues
    let transmissionSuccess = false;

    // Method 1: Try sending as individual bytes with delays
    try {
      console.log('📤 Attempting byte-by-byte transmission...');
      
      for (let i = 0; i < commands.length; i++) {
        try {
          // Send each byte as a single-element array
          const byteData = new Uint8Array([commands[i]]);
          const base64Data = arrayBufferToBase64(byteData.buffer);
          
          if (writeChar.isWritableWithResponse) {
            await bleManager.writeCharacteristicWithResponseForDevice(
              activeDevice.id,
              printService.uuid,
              writeChar.uuid,
              base64Data
            );
          } else {
            await bleManager.writeCharacteristicWithoutResponseForDevice(
              activeDevice.id,
              printService.uuid,
              writeChar.uuid,
              base64Data
            );
          }
          
          // Small delay between bytes to prevent overwhelming the device
          await new Promise(resolve => setTimeout(resolve, 5));
          
        } catch (byteError) {
          console.log(`❌ Failed to send byte ${i}:`, byteError);
          throw byteError;
        }
      }
      
      transmissionSuccess = true;
      console.log('✅ Byte-by-byte transmission completed');
      
    } catch (byteMethodError) {
      console.log('❌ Byte-by-byte transmission failed, trying small chunks...', byteMethodError);
      
      // Method 2: Try sending in small chunks of 5 bytes
      try {
        const chunkSize = 5;
        console.log(`📤 Sending ${Math.ceil(commands.length / chunkSize)} chunks of ${chunkSize} bytes each...`);
        
        for (let i = 0; i < commands.length; i += chunkSize) {
          const chunk = commands.slice(i, i + chunkSize);
          const chunkBuffer = new Uint8Array(chunk);
          const chunkBase64 = arrayBufferToBase64(chunkBuffer.buffer);
          
          try {
            if (writeChar.isWritableWithResponse) {
              await bleManager.writeCharacteristicWithResponseForDevice(
                activeDevice.id,
                printService.uuid,
                writeChar.uuid,
                chunkBase64
              );
            } else {
              await bleManager.writeCharacteristicWithoutResponseForDevice(
                activeDevice.id,
                printService.uuid,
                writeChar.uuid,
                chunkBase64
              );
            }
            
            // Small delay between chunks
            await new Promise(resolve => setTimeout(resolve, 20));
            
          } catch (chunkError) {
            console.log(`❌ Failed to send chunk starting at byte ${i}:`, chunkError);
            throw chunkError;
          }
        }
        
        transmissionSuccess = true;
        console.log('✅ Chunked transmission completed');
        
      } catch (chunkMethodError) {
        console.log('❌ All chunked transmission methods failed:', chunkMethodError);
        throw new Error('All BLE transmission methods failed. The printer may be incompatible or there may be a Bluetooth issue.');
      }
    }

    if (!transmissionSuccess) {
      throw new Error('All transmission methods failed');
    }

    console.log('✅ ESC/POS command transmission completed');
  };

  const testSimplePrint = async () => {
    console.log('🧪 Testing simple ESC/POS text print...');
    if (!connectedDevice) {
      return Alert.alert('Error', 'No printer connected');
    }

    try {
      // Send simple text commands first
      const commands: number[] = [];
      commands.push(0x1b, 0x40); // Initialize printer
      commands.push(0x1b, 0x61, 0x01); // Center alignment
      commands.push(0x48, 0x65, 0x6c, 0x6c, 0x6f); // "Hello"
      commands.push(0x0a); // New line
      commands.push(0x57, 0x6f, 0x72, 0x6c, 0x64); // "World"
      commands.push(0x0a, 0x0a, 0x0a); // Feed paper
      commands.push(0x1d, 0x56, 0x01); // Cut
      
      await sendEscPosCommands(commands);
      
      console.log('✅ Simple text print completed');
      Alert.alert('Success', 'Simple text printed! Check printer output.');
    } catch (error) {
      console.error('❌ Simple text print error:', error);
      Alert.alert('Error', `Failed to print text: ${error}`);
    }
  };

  const printCodePageDiagnostics = async () => {
    console.log('🧪 Printing code page diagnostics...');
    if (!connectedDevice) {
      return Alert.alert('Error', 'No printer connected');
    }

    try {
      const commands: number[] = [];

      // Start with a clean reset and left alignment
      commands.push(0x1b, 0x40); // ESC @
      commands.push(0x1b, 0x61, 0x00); // Left align

      CODE_PAGE_TEST_VALUES.forEach((value) => {
        // Reset before each test line
        commands.push(0x1b, 0x40);
        // Set code page (ESC t n) and GS t n for broader compatibility
        commands.push(0x1b, 0x74, value);
        commands.push(0x1d, 0x74, value);

        const label = `CodePage 0x${value.toString(16).toUpperCase().padStart(2, '0')}`;
        for (let i = 0; i < label.length; i++) {
          commands.push(label.charCodeAt(i));
        }
        commands.push(0x0a);

        // Print byte grid 0x80-0xFF so user can see glyphs available in the code page
        let column = 0;
        for (let byte = 0x80; byte <= 0xff; byte++) {
          commands.push(byte);
          column++;
          if (column === 16) {
            commands.push(0x0a);
            column = 0;
          }
        }

        commands.push(0x0a, 0x0a);
      });

      // Feed a few blank lines at the end
      commands.push(0x1b, 0x64, 0x05);

      await sendEscPosCommands(commands);
      Alert.alert(
        'Diagnostics Sent',
        'Check the printed sheet to find which code page shows correct Arabic characters. Share the code page value so we can lock it in.'
      );
    } catch (error) {
      console.error('❌ Code page diagnostics failed:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      Alert.alert('Diagnostics Failed', message);
    }
  };

  const loadSavedDevice = useCallback(async () => {
    console.log('🔍 loadSavedDevice: Starting to load saved device...');
    try {
      const saved = await AsyncStorage.getItem(SAVED_DEVICE_KEY);
      console.log('🔍 loadSavedDevice: Raw saved data from AsyncStorage:', saved);

      if (!saved) {
        console.log('🔍 loadSavedDevice: No saved device found in storage');
        setSavedDevice(null);
        return;
      }

      const device = JSON.parse(saved);
      console.log('🔍 loadSavedDevice: Successfully parsed device:', device);
      console.log('🔍 loadSavedDevice: Setting savedDevice state...');
      setSavedDevice(device);
      console.log('🔍 loadSavedDevice: savedDevice state set successfully');

      console.log('🔍 loadSavedDevice: Attempting auto-reconnect...');
      attemptAutoReconnect(device);
    } catch (error) {
      console.error('🔍 loadSavedDevice: Error loading saved device:', error);
      console.log('🔍 loadSavedDevice: Clearing potentially corrupted data...');
      await AsyncStorage.removeItem(SAVED_DEVICE_KEY);
      console.log('🔍 loadSavedDevice: Corrupted data cleared');
      setSavedDevice(null);
    }
  }, [attemptAutoReconnect]);

  const clearSavedDevice = async () => {
    console.log('Clearing saved device');
    await AsyncStorage.removeItem(SAVED_DEVICE_KEY);
    setSavedDevice(null);
    console.log('Saved device cleared');
  };

  // -------------------- INIT --------------------
  useEffect(() => {
    console.log('PrinterDemo component mounted');
    if (!bleManager) {
      console.log('BLE module not available - running in Expo Go mode');
      // Don't show alert on init, let user discover this when they try to use Bluetooth
    } else {
      console.log('BLE module available - full Bluetooth functionality enabled');
    }
    loadSavedDevice();
  }, [loadSavedDevice]);

  // Debug: Log when savedDevice changes
  useEffect(() => {
    console.log('savedDevice state changed:', savedDevice);
  }, [savedDevice]);

  const enableBluetooth = async () => {
    try {
      console.log('Attempting to enable Bluetooth...');

      // First try BLE (for development builds)
      if (bleManager) {
        // Request necessary permissions first
        const permissionsGranted = await requestBluetoothPermissions();
        if (!permissionsGranted) {
          return; // Permissions not granted, user was alerted
        }

        const state = await bleManager.state();
        console.log('Bluetooth state:', state);
        setBluetoothState(state); // Store state for UI display

        if (state === 'PoweredOff') {
          Alert.alert(
            'Bluetooth is Disabled',
            'Bluetooth must be enabled to use this app. Please follow these steps:\n\n1. Pull down the notification shade\n2. Long-press the Bluetooth icon\n3. Turn Bluetooth ON\n\nThen return to this app.',
            [
              {
                text: 'I\'ve Enabled Bluetooth',
                onPress: () => {
                  // Check again after user says they enabled it
                  setTimeout(() => enableBluetooth(), 1000);
                },
              },
              {
                text: 'Open Quick Settings',
                onPress: () => {
                  Alert.alert(
                    'Quick Settings',
                    'Pull down from the top of your screen to access Quick Settings, then tap the Bluetooth icon to turn it on.'
                  );
                },
              },
              { text: 'Cancel', style: 'cancel' },
            ]
          );
          return;
        }

        if (state === 'Unauthorized') {
          Alert.alert(
            'Bluetooth Permission Required',
            'The app needs Bluetooth permission to scan for devices. Please grant Bluetooth permission in app settings.',
            [
              {
                text: 'Open App Settings',
                onPress: () => {
                  Alert.alert(
                    'App Settings',
                    'Go to Settings > Apps > [This App] > Permissions and enable Bluetooth permission.'
                  );
                },
              },
              { text: 'Cancel', style: 'cancel' },
            ]
          );
          return;
        }

        // Bluetooth is ready
        Alert.alert('Success', 'Bluetooth is enabled and ready to use!');

      } else {
        // Fallback for Expo Go - provide helpful instructions
        Alert.alert(
          'Development Build Required',
          'Bluetooth printing requires a development build for full functionality.\n\nFor now, you can:\n\n1. Enable Bluetooth manually in Settings\n2. Create a development build for full BLE support\n3. Test basic app functionality',
          [
            {
              text: 'Create Dev Build',
              onPress: () => {
                Alert.alert('Development Build', 'Run: npx expo run:android --device');
              },
            },
            {
              text: 'Enable Bluetooth',
              onPress: () => {
                Alert.alert('Manual Setup', 'Go to Settings > Bluetooth and turn Bluetooth on');
              },
            },
            { text: 'OK', style: 'default' },
          ]
        );
      }

    } catch (error) {
      console.error('Failed to enable Bluetooth:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      Alert.alert(
        'Bluetooth Setup Required',
        `Please ensure Bluetooth is enabled in your device settings.\n\nError: ${errorMessage}`,
        [
          { text: 'OK' }
        ]
      );
    }
  };

  const scanForDevices = async () => {
    let scanSubscription: any = null;
    try {
      if (!bleManager) {
        throw new Error('BLE module not available. Use a development build for Bluetooth scanning.');
      }
      setIsScanning(true);
      setDevices([]); // Clear previous devices
      
      const foundDevices: any[] = [];
      scanSubscription = bleManager.startDeviceScan(null, null, (error: any, device: any) => {
        if (error) {
          console.error('Scan error:', error);
          setIsScanning(false);
          // Don't try to remove subscription here as it may not be valid
          return;
        }
        
        console.log('🔍 Discovered device:', {
          id: device.id,
          name: device.name,
          localName: device.localName,
          manufacturerData: device.manufacturerData,
          serviceUUIDs: device.serviceUUIDs,
          isConnectable: device.isConnectable
        });
        
        // Add device if not already in list
        if (!foundDevices.some(d => d.id === device.id)) {
          foundDevices.push(device);
          setDevices([...foundDevices]);
          console.log(`📱 Added device ${device.id} to list. Total devices: ${foundDevices.length}`);
        }
      });
      
      // Stop scan after 10 seconds
      setTimeout(() => {
        if (bleManager) {
          bleManager.stopDeviceScan();
        }
        setIsScanning(false);
        if (scanSubscription && typeof scanSubscription.remove === 'function') {
          scanSubscription.remove();
        }
        console.log(`🔍 Scan completed, found ${foundDevices.length} devices:`);
        foundDevices.forEach((device, index) => {
          console.log(`  ${index + 1}. ${device.id} - ${device.name || device.localName || 'No name'}`);
        });
      }, 10000);
      
    } catch (error) {
      console.error('Failed to scan for devices:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      if (errorMessage.includes('module not available')) {
        Alert.alert(
          'BLE Scanning Not Available',
          'Device scanning requires a development build.\n\nPlease create a development build to scan for Bluetooth devices.',
          [
            { text: 'OK' }
          ]
        );
      } else {
        Alert.alert('Error', `Failed to scan for devices: ${errorMessage}`);
      }
      setIsScanning(false);
      if (scanSubscription && typeof scanSubscription.remove === 'function') {
        scanSubscription.remove();
      }
    }
  };

  const connectToDevice = async (device: any) => {
    try {
      if (!bleManager) {
        throw new Error('BLE module not available. Use a development build for Bluetooth connections.');
      }
      setIsConnecting(true);
      console.log('Connecting to device:', device.id);
      
      // Add timeout to connection (10 seconds)
      const connectionPromise = bleManager.connectToDevice(device.id, {
        timeout: 10000,
      });
      
      const connectedDevice = await Promise.race([
        connectionPromise,
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Connection timeout')), 10000)
        )
      ]);
      
      console.log('Connected, discovering services...');
      
      // Faster service discovery with timeout
      const discoveryPromise = connectedDevice.discoverAllServicesAndCharacteristics();
      await Promise.race([
        discoveryPromise,
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Service discovery timeout')), 5000)
        )
      ]);
      
      setConnectedDevice(connectedDevice);
      await saveDevice(connectedDevice);
      Alert.alert('Success', `Connected to ${connectedDevice.name || 'Device'}`);
    } catch (error) {
      console.error('Failed to connect to device:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      if (errorMessage.includes('module not available')) {
        Alert.alert(
          'BLE Connection Not Available',
          'Device connection requires a development build.\n\nPlease create a development build to connect to Bluetooth devices.',
          [{ text: 'OK' }]
        );
      } else if (errorMessage.includes('timeout')) {
        Alert.alert('Connection Timeout', 'Device took too long to respond. Please try again and ensure the printer is nearby.');
      } else {
        Alert.alert('Error', `Failed to connect to device: ${errorMessage}`);
      }
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectDevice = async () => {
    if (!connectedDevice) return;
    try {
      if (!bleManager) {
        throw new Error('BLE module not available. Use a development build for Bluetooth disconnection.');
      }
      await bleManager.cancelDeviceConnection(connectedDevice.id);
      setConnectedDevice(null);
      Alert.alert('Disconnected');
    } catch (error) {
      console.error('Disconnect error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      if (errorMessage.includes('module not available')) {
        Alert.alert(
          'BLE Disconnection Not Available',
          'Device disconnection requires a development build.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Error', `Failed to disconnect: ${errorMessage}`);
      }
    }
  };

  // -------------------- PRINTING --------------------
  // Helper function to convert ArrayBuffer to base64
  const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  };

  // -------------------- ARABIC ENCODING HELPERS --------------------
  const WINDOWS_1256_REVERSE_MAP: Record<string, number> = {
    '،': 0xa1,
    '؛': 0xba,
    '؟': 0xbf,
    'ء': 0xc1,
    'آ': 0xc2,
    'أ': 0xc3,
    'ؤ': 0xc4,
    'إ': 0xc5,
    'ئ': 0xc6,
    'ا': 0xc7,
    'ب': 0xc8,
    'ة': 0xc9,
    'ت': 0xca,
    'ث': 0xcb,
    'ج': 0xcc,
    'ح': 0xcd,
    'خ': 0xce,
    'د': 0xcf,
    'ذ': 0xd0,
    'ر': 0xd1,
    'ز': 0xd2,
    'س': 0xd3,
    'ش': 0xd4,
    'ص': 0xd5,
    'ض': 0xd6,
    'ط': 0xd8,
    'ظ': 0xd9,
    'ع': 0xda,
    'غ': 0xdb,
    'ـ': 0xdc,
    'ف': 0xdd,
    'ق': 0xde,
    'ك': 0xdf,
    'ل': 0xe0,
    'م': 0xe1,
    'ن': 0xe2,
    'ه': 0xe3,
    'و': 0xe4,
    'ى': 0xe5,
    'ي': 0xe6,
    'ً': 0xe7,
    'ٌ': 0xe8,
    'ٍ': 0xe9,
    'َ': 0xea,
    'ُ': 0xeb,
    'ِ': 0xec,
    'ّ': 0xed,
    'ْ': 0xee,
    'پ': 0xef,
    'چ': 0xf0,
    'ژ': 0xf1,
    'گ': 0xf2,
    '۰': 0xb0,
    '۱': 0xb1,
    '۲': 0xb2,
    '۳': 0xb3,
    '۴': 0xb4,
    '۵': 0xb5,
    '۶': 0xb6,
    '۷': 0xb7,
    '۸': 0xb8,
    '۹': 0xb9,
    '٠': 0xb0,
    '١': 0xb1,
    '٢': 0xb2,
    '٣': 0xb3,
    '٤': 0xb4,
    '٥': 0xb5,
    '٦': 0xb6,
    '٧': 0xb7,
    '٨': 0xb8,
    '٩': 0xb9,
  };

  const normalizeArabicText = (input: string): string => {
    let normalized = input.normalize('NFKC');

    // Normalize Lam-Alef ligatures to basic characters
    normalized = normalized
      .replace(/\uFEFB|\uFEFC/g, 'لا')
      .replace(/\uFEF7|\uFEF8/g, 'لأ')
      .replace(/\uFEF9|\uFEFA/g, 'لإ')
      .replace(/\uFEF5|\uFEF6/g, 'لآ');

    // Replace Arabic-Indic digits with ASCII digits
    normalized = normalized.replace(/[\u0660-\u0669]/g, (digit) =>
      String(digit.charCodeAt(0) - 0x0660)
    );

    // Replace Eastern Arabic digits
    normalized = normalized.replace(/[\u06F0-\u06F9]/g, (digit) =>
      String(digit.charCodeAt(0) - 0x06F0)
    );

    return normalized;
  };

  const encodeWindows1256 = (text: string): number[] => {
    const encoded: number[] = [];
    const normalized = normalizeArabicText(text);

    for (const char of normalized) {
      const code = char.charCodeAt(0);
      if (code <= 0x7f) {
        encoded.push(code);
        continue;
      }

      const mapped = WINDOWS_1256_REVERSE_MAP[char];
      if (typeof mapped === 'number') {
        encoded.push(mapped);
      } else {
        // Unsupported characters fall back to question mark
        encoded.push(0x3f);
      }
    }

    return encoded;
  };

  const CODE_PAGE_TEST_VALUES = [
    0x10, 0x11, 0x12, 0x13, 0x14, 0x15, 0x16,
    0x17, 0x18, 0x19, 0x1a, 0x1b, 0x1c, 0x1d,
    0x1e, 0x1f, 0x20, 0x21, 0x22, 0x23, 0x24,
    0x25, 0x26, 0x27, 0x28, 0x29,
  ];

  const DEFAULT_ARABIC_CODE_PAGE = 0x16; // Determined via diagnostics (CP864 Arabic)

  const refreshConnection = async ({
    showSpinner = false,
    reason,
  }: {
    showSpinner?: boolean;
    reason?: string;
  } = {}) => {
    if (!connectedDevice) {
      throw new Error('No printer connected');
    }
    if (!bleManager) {
      throw new Error('BLE module not available or not initialized yet.');
    }

    if (reason) {
      console.log(`🔄 Refreshing device connection (${reason})`);
    } else {
      console.log('🔄 Refreshing device connection...');
    }

    if (showSpinner) {
      setIsConnecting(true);
    }

    try {
      try {
        await bleManager.cancelDeviceConnection(connectedDevice.id);
      } catch (cancelError) {
        console.warn('⚠️ Cancel connection warning:', cancelError);
      }

      // Reduce delay from 1000ms to 300ms for faster reconnection
      await new Promise((resolve) => setTimeout(resolve, 300));

      const reconnectedDevice = await Promise.race([
        bleManager.connectToDevice(connectedDevice.id, {
          timeout: 5000, // Shorter timeout for reconnection
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Reconnection timeout')), 5000)
        )
      ]);
      
      await reconnectedDevice.discoverAllServicesAndCharacteristics();
      setConnectedDevice(reconnectedDevice);
      await saveDevice(reconnectedDevice);
      console.log('✅ Device reconnected successfully');
      return reconnectedDevice;
    } catch (error) {
      console.error('❌ Reconnection attempt failed:', error);
      if (showSpinner) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        Alert.alert('Reconnection Failed', `Could not reconnect to device: ${errorMessage}`);
      }
      throw error;
    } finally {
      if (showSpinner) {
        setIsConnecting(false);
      }
    }
  };

  const printTextWithCodePage = async ({
    header,
    bodyLines,
    footer,
    codePage,
  }: {
    header?: string[];
    bodyLines: string[];
    footer?: string[];
    codePage: number;
  }) => {
    const commands: number[] = [];

    // Initialize and set code page
    commands.push(0x1b, 0x40); // ESC @
    commands.push(0x1b, 0x52, 0x08); // Arabic international set
    commands.push(0x1b, 0x74, codePage);
    commands.push(0x1d, 0x74, codePage);

    const encodeAndAppend = (text: string) => {
      const encoded = encodeWindows1256(text);
      commands.push(...encoded);
    };

    if (header && header.length > 0) {
      commands.push(0x1b, 0x61, 0x01); // Center
      header.forEach((line) => {
        encodeAndAppend(line);
        commands.push(0x0a);
      });
      commands.push(0x0a);
    }

    commands.push(0x1b, 0x61, 0x00); // Left alignment for body
    bodyLines.forEach((line) => {
      encodeAndAppend(line);
      commands.push(0x0a);
    });

    if (footer && footer.length > 0) {
      commands.push(0x0a);
      commands.push(0x1b, 0x61, 0x01); // Center
      footer.forEach((line) => {
        encodeAndAppend(line);
        commands.push(0x0a);
      });
      commands.push(0x1b, 0x61, 0x00); // Back to left
    }

    commands.push(0x0a);
    commands.push(0x1d, 0x56, 0x42, 0x00); // Full cut
    commands.push(0x1b, 0x64, 0x03);

    await sendEscPosCommands(commands);
  };

  const printArabicAsImage = async (text: string) => {
    console.log('🖨️ Starting image-based Arabic printing...');
    if (!connectedDevice) throw new Error('No printer connected');
    if (!receiptViewRef.current) throw new Error('Receipt view not ready');

    try {
      // Try a different bitmap approach using GS * command (more compatible)
      const commands: number[] = [];
      commands.push(0x1b, 0x40); // Initialize printer
      commands.push(0x1b, 0x61, 0x01); // Center alignment
      
      // Create a smaller, simpler test pattern
      const width = 32; // 256 pixels / 8 pixels per byte
      const height = 50;
      
      // GS v 0 - Print bitmap (mode 0 = normal density)
      commands.push(0x1d, 0x76, 0x30, 0x00); // GS v 0
      commands.push(width & 0xff); // xL
      commands.push((width >> 8) & 0xff); // xH  
      commands.push(height & 0xff); // yL
      commands.push((height >> 8) & 0xff); // yH
      
      // Create a simple solid black rectangle (easier to debug)
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          commands.push(0xff); // Solid black (11111111)
        }
      }
      
      commands.push(0x0a, 0x0a, 0x0a, 0x0a, 0x0a); // Feed paper
      commands.push(0x1d, 0x56, 0x01); // Cut
      
      await sendEscPosCommands(commands);
      
      console.log('✅ Image-based printing completed');
      Alert.alert('Success', 'Test bitmap printed! Check for checkerboard pattern.');
    } catch (error) {
      console.error('❌ Image print error:', error);
      throw error;
    }
  };

  const printArabicTextDirect = async (text: string) => {
    console.log('🖨️ Starting direct Arabic text printing (fallback mode)...');
    if (!connectedDevice) throw new Error('No printer connected');

    console.log('📱 Connected device:', connectedDevice.name || 'Unknown', connectedDevice.id);

    try {
      const isConnected = await connectedDevice.isConnected();
      console.log('🔗 Device connection state:', isConnected);
      if (!isConnected) {
        throw new Error('Device is not connected. Please reconnect to the printer.');
      }
    } catch (connectionError) {
      console.error('❌ Failed to check device connection:', connectionError);
      throw new Error('Cannot verify device connection. Please reconnect to the printer.');
    }

    const header = ['========', 'إيصال تجريبي', '========'];
    const bodyLines = text.split('\n');
    const footer = ['========', 'شكراً لك'];

    try {
      await printTextWithCodePage({
        header,
        bodyLines,
        footer,
        codePage: DEFAULT_ARABIC_CODE_PAGE,
      });
      console.log('✅ Direct text printing completed via BLE');
    } catch (e) {
      console.error('❌ Direct print error:', e);
      console.error('❌ Error type:', typeof e);
      console.error('❌ Error properties:', e && typeof e === 'object' ? Object.keys(e as object) : 'N/A');
      if (e && typeof e === 'object') {
        console.error('❌ Error reason:', (e as any).reason);
        console.error('❌ Error errorCode:', (e as any).errorCode);
        console.error('❌ Error message:', (e as any).message);
        console.error('❌ Full error object:', JSON.stringify(e, null, 2));
      }
      const errorMessage = e instanceof Error ? e.message : 'Unknown error';

      if (errorMessage.includes('discover device services')) {
        throw new Error('Device connection is unstable. Please disconnect and reconnect to the printer before trying to print again.');
      } else if (errorMessage.includes('module not available')) {
        Alert.alert(
          'BLE Printing Not Available',
          'Printing requires a development build.\n\nPlease create a development build to print to Bluetooth devices.',
          [{ text: 'OK' }]
        );
      } else {
        throw e;
      }
    }
  };

  const printArabicText = async (text: string) => {
    console.log('🖨️ Starting Arabic text printing...');
    if (!connectedDevice) throw new Error('No printer connected');

    console.log('📱 Connected device:', connectedDevice.name || 'Unknown', connectedDevice.id);

    // Use direct text printing as primary method (image printing has compatibility issues)
    console.log('🔤 Using direct text printing for Arabic text...');
    await printArabicTextDirect(text);
  };

  const testArabicPrinting = async () => {
    console.log('🖨️ Starting print test...');
    if (!connectedDevice) {
      console.log('❌ No device connected');
      return Alert.alert('Error', 'No device connected');
    }

    console.log('✅ Device connected, proceeding with print test');
    try {
      const sample = 'فاتورة تجريبية\nالمنتج: اسم المنتج\nالسعر: 100 ريال';
      console.log('📝 Test text:', sample);
      await printArabicAsImage(sample);
      console.log('✅ Print test completed successfully');
      Alert.alert('Success', 'Arabic receipt printed successfully as image!');
    } catch (error) {
      console.error('❌ Print test failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Error details:', errorMessage);

      // Provide helpful error messages based on error type
      let userMessage = 'Printing failed';
      let suggestion = '';

      if (errorMessage.includes('discover device services')) {
        userMessage = 'Device connection unstable';
        suggestion = 'Try disconnecting and reconnecting to the printer before printing again.';
      } else if (errorMessage.includes('Image creation failed')) {
        userMessage = 'Image printing failed';
        suggestion = 'Try using "Print Text Only" button instead.';
      } else if (errorMessage.includes('Print service not found')) {
        userMessage = 'Printer service not found';
        suggestion = 'This printer may not be compatible with BLE printing.';
      } else if (errorMessage.includes('No writable characteristic')) {
        userMessage = 'Printer communication failed';
        suggestion = 'Try reconnecting to the printer.';
      } else if (errorMessage.includes('Unknown error')) {
        userMessage = 'BLE communication error';
        suggestion = 'Try restarting Bluetooth or reconnecting the device.';
      }

      Alert.alert(
        'Print Failed',
        `${userMessage}\n\n${suggestion}\n\nError: ${errorMessage}`
      );
    }
  };

  const reconnectDevice = async () => {
    try {
      await refreshConnection({ showSpinner: true, reason: 'Manual reconnection' });
      Alert.alert('Success', 'Device reconnected successfully!');
    } catch (error) {
      console.error('❌ Manual reconnection failed:', error);
      // Alert already shown in helper when showSpinner = true
    }
  };

  const testDeviceConnection = async () => {
    console.log('🔧 Testing device connection and services...');
    if (!connectedDevice) {
      console.log('❌ No device connected');
      return Alert.alert('Error', 'No device connected');
    }

    try {
      // Check connection state
      const isConnected = await connectedDevice.isConnected();
      console.log('🔗 Connection state:', isConnected);

      if (!isConnected) {
        throw new Error('Device is not connected');
      }

      // Try to discover services
      const services = await connectedDevice.services();
      console.log('📋 Services discovered:', services.length);
      services.forEach((service: any, index: number) => {
        console.log(`  ${index + 1}. ${service.uuid} (primary: ${service.isPrimary})`);
      });

      // Try to get characteristics for the first service
      if (services.length > 0) {
        const firstService = services[0];
        const characteristics = await firstService.characteristics();
        console.log(`🔍 Characteristics for ${firstService.uuid}:`, characteristics.length);
        characteristics.forEach((char: any, index: number) => {
          console.log(`  ${index + 1}. ${char.uuid} (writable: ${char.isWritableWithoutResponse || char.isWritableWithResponse})`);
        });
      }

      Alert.alert('Success', `Device connected! Found ${services.length} services.`);
    } catch (error) {
      console.error('❌ Connection test failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Provide specific guidance for different error types
      let userMessage = 'Connection test failed';
      let suggestion = '';

      if (errorMessage.includes('discover device services')) {
        userMessage = 'Device connection unstable';
        suggestion = 'Try disconnecting and reconnecting to the printer. The device may need to be rediscovered.';
      } else if (errorMessage.includes('Unknown error')) {
        userMessage = 'BLE communication error';
        suggestion = 'Try restarting Bluetooth or reconnecting the device. Some printers may have compatibility issues.';
      }

      Alert.alert(
        'Connection Test Failed',
        `${userMessage}\n\n${suggestion}\n\nError: ${errorMessage}`
      );
    }
  };

  const printArabicReceiptLocally = async () => {
    console.log('🖨️ Starting local Arabic receipt printing...');
    if (!connectedDevice) {
      Alert.alert('Error', 'No printer connected');
      return;
    }

    const receiptData: ReceiptData = {
      header: 'إيصال تجريبي',
      items: [
        { name: 'قهوة عربية', price: '15 ريال', quantity: '2' },
        { name: 'شاي أخضر', price: '10 ريال' },
        { name: 'ماء معدني', price: '5 ريال', quantity: '3' },
      ],
      total: '70 ريال',
      footer: 'شكراً لزيارتكم\nمرحباً بكم دائماً',
    };

    try {
      await printArabicReceiptUtil(receiptData, { current: { printReceipt: async (text: string) => await printArabicText(text) } });
      Alert.alert('Success', 'Arabic receipt printed successfully!');
    } catch (error) {
      console.error('Print error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      Alert.alert('Print Failed', `Could not print receipt: ${errorMessage}`);
    }
  };

  // -------------------- REF EXPOSE --------------------
  useImperativeHandle(ref, () => ({
    printReceipt: printArabicReceiptLocally,
    getConnectedDevice: () => connectedDevice,
    isConnected: () => !!connectedDevice,
  }));

  // -------------------- UI --------------------
  return (
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
            Connect and print with Bluetooth thermal printers
          </Text>
        </View>

        {/* PAIRED DEVICES SECTION */}
        <View className="mb-6">
          <Text className="mb-3 text-lg font-bold text-gray-900">Paired Devices</Text>
          {(() => {
            console.log('🔄 Rendering paired devices section, savedDevice exists:', !!savedDevice);
            if (savedDevice) {
              console.log('📱 Paired device details:', {
                name: savedDevice.name,
                id: savedDevice.id,
                displayName: savedDevice.name || 'Unnamed Device'
              });
            }
            return savedDevice ? (
            <TouchableOpacity
              onPress={() => connectToDevice(savedDevice)}
              disabled={isConnecting}
              className="mb-3 rounded-2xl border border-purple-200 bg-purple-50 p-4 shadow-sm"
            >
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center">
                  <View className="mr-3 h-12 w-12 items-center justify-center rounded-xl bg-purple-100">
                    <Ionicons name="bookmark" size={24} color="#7C3AED" />
                  </View>
                  <View>
                    <Text className="text-base font-semibold text-purple-900">
                      {savedDevice.name || 'Unnamed Device'}
                    </Text>
                    <Text className="text-sm text-purple-600">{savedDevice.id}</Text>
                    <Text className="text-xs text-purple-500 mt-1">Paired Device</Text>
                  </View>
                </View>
                <View className="flex-row items-center">
                  <TouchableOpacity
                    onPress={clearSavedDevice}
                    className="mr-2 rounded-lg bg-red-100 px-2 py-1"
                  >
                    <Ionicons name="trash-outline" size={16} color="#DC2626" />
                  </TouchableOpacity>
                  {isConnecting ? (
                    <ActivityIndicator color="#7C3AED" size="small" />
                  ) : (
                    <Ionicons name="chevron-forward" size={20} color="#7C3AED" />
                  )}
                </View>
              </View>
            </TouchableOpacity>
            ) : (
            <View className="items-center justify-center rounded-2xl border border-gray-200 bg-gray-50 p-8">
              <Ionicons name="bookmark-outline" size={48} color="#9CA3AF" />
              <Text className="mt-4 text-center text-gray-500">
                No paired devices. Connect to a printer to save it here.
              </Text>
              {(() => { console.log('📭 Showing "No paired devices" message'); return null; })()}
            </View>
          );
          })()}
        </View>

        <View className="mb-6 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center">
              <Ionicons name="bluetooth-outline" size={24} color="#3B82F6" />
              <View className="ml-3">
                <Text className="font-semibold text-gray-900">Bluetooth Status</Text>
                <Text className={`text-sm ${bluetoothState === 'PoweredOn' ? 'text-green-600' : bluetoothState === 'PoweredOff' ? 'text-red-600' : 'text-gray-500'}`}>
                  {bluetoothState === 'PoweredOn' ? 'Enabled' : 
                   bluetoothState === 'PoweredOff' ? 'Disabled' : 
                   bluetoothState === 'Unauthorized' ? 'Permission Required' : 
                   'Checking...'}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={enableBluetooth}
              className={`rounded-xl px-4 py-2 ${
                bluetoothState === 'PoweredOn' 
                  ? 'bg-green-600' 
                  : 'bg-blue-600'
              }`}
            >
              <Text className="font-semibold text-white">
                {bluetoothState === 'PoweredOn' ? 'Ready' : 'Enable'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {connectedDevice && (
          <View className="mb-6 rounded-2xl border border-green-200 bg-green-50 p-4">
            <View className="mb-3 flex-row items-center justify-between">
              <View className="flex-row items-center">
                <Ionicons name="checkmark-circle" size={24} color="#10B981" />
                <Text className="ml-2 font-semibold text-green-900">Connected</Text>
              </View>
              <View className="flex-row">
                <TouchableOpacity
                  onPress={reconnectDevice}
                  disabled={isConnecting}
                  className="mr-2 rounded-lg bg-yellow-100 px-3 py-1.5"
                >
                  <Text className="text-sm font-semibold text-yellow-600">Reconnect</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={disconnectDevice}
                  className="rounded-lg bg-red-100 px-3 py-1.5"
                >
                  <Text className="text-sm font-semibold text-red-600">Disconnect</Text>
                </TouchableOpacity>
              </View>
            </View>
            <Text className="font-medium text-green-800">{connectedDevice.name || 'Unnamed Device'}</Text>
            <Text className="text-sm text-green-600">{connectedDevice.id}</Text>

            <TouchableOpacity
              onPress={testDeviceConnection}
              className="mt-2 rounded-xl bg-orange-600 py-3"
            >
              <View className="flex-row items-center justify-center">
                <Ionicons name="hardware-chip" size={20} color="white" />
                <Text className="ml-2 font-semibold text-white">Test Connection</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={testSimplePrint}
              className="mt-2 rounded-xl bg-purple-600 py-3"
            >
              <View className="flex-row items-center justify-center">
                <Ionicons name="flash" size={20} color="white" />
                <Text className="ml-2 font-semibold text-white">Simple Print Test</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={printCodePageDiagnostics}
              className="mt-2 rounded-xl bg-indigo-600 py-3"
            >
              <View className="flex-row items-center justify-center">
                <Ionicons name="document-text" size={20} color="white" />
                <Text className="ml-2 font-semibold text-white">Print Code Page Test</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={testArabicPrinting}
              className="mt-2 rounded-xl bg-green-600 py-3"
            >
              <View className="flex-row items-center justify-center">
                <Ionicons name="print" size={20} color="white" />
                <Text className="ml-2 font-semibold text-white">Print Arabic Receipt</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => printArabicTextDirect('فاتورة تجريبية\nالمنتج: اسم المنتج\nالسعر: 100 ريال')}
              className="mt-2 rounded-xl bg-blue-600 py-3"
            >
              <View className="flex-row items-center justify-center">
                <Ionicons name="text" size={20} color="white" />
                <Text className="ml-2 font-semibold text-white">Print Text Only</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={printArabicReceiptLocally}
              className="mt-2 rounded-xl bg-teal-600 py-3"
            >
              <View className="flex-row items-center justify-center">
                <Ionicons name="receipt" size={20} color="white" />
                <Text className="ml-2 font-semibold text-white">Print Formatted Receipt</Text>
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* SCANNED DEVICES SECTION */}
        <View className="mb-4">
          <View className="mb-4 flex-row items-center justify-between">
            <Text className="text-lg font-bold text-gray-900">
              {savedDevice ? 'Available Devices' : 'Devices'}
            </Text>
            <TouchableOpacity
              onPress={scanForDevices}
              disabled={isScanning}
              className="rounded-lg bg-gray-100 px-3 py-1.5"
            >
              {isScanning ? (
                <ActivityIndicator size="small" color="#6B7280" />
              ) : (
                <Ionicons name="refresh" size={16} color="#6B7280" />
              )}
            </TouchableOpacity>
          </View>

          {devices.length > 0 ? (
            devices.map((item) => (
              <TouchableOpacity
                key={item.id}
                onPress={() => connectToDevice(item)}
                disabled={isConnecting}
                className="mb-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm"
              >
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center">
                    <View className="mr-3 h-12 w-12 items-center justify-center rounded-xl bg-blue-100">
                      <Ionicons name="print-outline" size={24} color="#3B82F6" />
                    </View>
                    <View>
                      <Text className="text-base font-semibold text-gray-900">
                        {(() => {
                          const deviceName = item.name || item.localName;
                          if (deviceName) return deviceName;
                          
                          // Try to extract name from manufacturer data or service UUIDs
                          if (item.serviceUUIDs && item.serviceUUIDs.length > 0) {
                            // Find the print service (try common UUIDs)
                            const printService = item.serviceUUIDs.find((s: any) => s.uuid.toLowerCase() === '49535343-fe7d-4ae5-8fa9-9fafd205e455') ||
                                             item.serviceUUIDs.find((s: any) => s.uuid.toLowerCase() === '000018f0-0000-1000-8000-00805f9b34fb') ||
                                             item.serviceUUIDs.find((s: any) => s.uuid.toLowerCase().includes('18f0')) ||
                                             item.serviceUUIDs.find((s: any) => s.uuid.toLowerCase().includes('print'));
                            if (printService) return 'Thermal Printer';
                          }
                          
                          // Fallback with partial MAC address
                          const shortId = item.id.substring(item.id.length - 6).toUpperCase();
                          return `BLE Device (${shortId})`;
                        })()}
                      </Text>
                      <Text className="text-sm text-gray-500">{item.id}</Text>
                      <Text className="text-xs text-blue-500 mt-1">Discovered</Text>
                    </View>
                  </View>
                  {isConnecting ? (
                    <ActivityIndicator color="#3B82F6" size="small" />
                  ) : (
                    <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                  )}
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <View className="items-center justify-center rounded-2xl border border-gray-100 bg-white p-8">
              <Ionicons name="print-outline" size={48} color="#D1D5DB" />
              <Text className="mt-4 text-center text-gray-500">
                {isScanning ? 'Scanning for devices...' : 'No devices found. Tap scan to search for BLE devices.'}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Hidden receipt view for image capture */}
      <View
        ref={receiptViewRef}
        style={{
          position: 'absolute',
          left: -9999,
          width: 384, // 48mm thermal printer width in pixels
          backgroundColor: 'white',
          padding: 16,
        }}
      >
        <Text style={{ fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginBottom: 8 }}>
          إيصال تجريبي
        </Text>
        <Text style={{ fontSize: 16, textAlign: 'center', marginBottom: 16 }}>
          ========
        </Text>
        <Text style={{ fontSize: 14, marginBottom: 4 }}>
          فاتورة تجريبية
        </Text>
        <Text style={{ fontSize: 14, marginBottom: 4 }}>
          المنتج: اسم المنتج
        </Text>
        <Text style={{ fontSize: 14, marginBottom: 16 }}>
          السعر: 100 ريال
        </Text>
        <Text style={{ fontSize: 16, textAlign: 'center', marginTop: 8 }}>
          ========
        </Text>
        <Text style={{ fontSize: 14, textAlign: 'center', marginTop: 8 }}>
          شكراً لك
        </Text>
      </View>
    </ScrollView>
  );
});

export default PrinterDemo;
