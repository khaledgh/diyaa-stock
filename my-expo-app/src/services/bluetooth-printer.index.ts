import Constants from 'expo-constants';
import mockService from './bluetooth-printer.mock';
import realService from './bluetooth-printer.service';

// Use mock service in Expo Go, real service in development builds
const isExpoGo = Constants.appOwnership === 'expo';

const bluetoothPrinterService = isExpoGo ? mockService : realService;

if (isExpoGo) {
  console.log('Using MOCK Bluetooth Printer Service (Expo Go)');
} else {
  console.log('Using REAL Bluetooth Printer Service (Development Build)');
}

export default bluetoothPrinterService;
