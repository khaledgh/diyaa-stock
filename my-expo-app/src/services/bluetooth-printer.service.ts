import { CartItem } from '../types';

interface PrinterDevice {
  address: string;
  name: string;
}

interface ReceiptData {
  invoiceNumber: string;
  customerName?: string;
  items: CartItem[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  date: string;
  vanId: number;
  cashierName: string;
}

let ThermalPrinterModule: any = null;

// Try to load native modules
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { RNThermalPrinter } = require('react-native-thermal-printer');
  ThermalPrinterModule = RNThermalPrinter;
} catch {
  console.log('Thermal printer module not available (requires development build)');
}

class BluetoothPrinterService {
  isAvailable(): boolean {
    return ThermalPrinterModule !== null;
  }

  async enableBluetooth(): Promise<boolean> {
    // Thermal printer library handles bluetooth automatically
    return true;
  }

  async scanDevices(): Promise<PrinterDevice[]> {
    if (!this.isAvailable() || !ThermalPrinterModule) {
      throw new Error('Thermal printer not available. Requires development build.');
    }
    try {
      const devices = await ThermalPrinterModule.getBondedDevices();
      return devices.map((device: any) => ({
        address: device.address || device.macAddress,
        name: device.name || device.deviceName || 'Unknown Device',
      }));
    } catch (error) {
      console.error('Scan error:', error);
      throw error;
    }
  }

  async connectPrinter(address: string): Promise<boolean> {
    if (!this.isAvailable()) {
      throw new Error('Thermal printer not available. Requires development build.');
    }
    try {
      await ThermalPrinterModule.connect(address);
      return true;
    } catch (error) {
      console.error('Connect error:', error);
      return false;
    }
  }

  async disconnectPrinter(): Promise<void> {
    if (!this.isAvailable()) return;
    try {
      await ThermalPrinterModule.disconnect();
    } catch (error) {
      console.error('Disconnect error:', error);
    }
  }

  async isConnected(): Promise<boolean> {
    if (!this.isAvailable()) return false;
    try {
      const connected = await ThermalPrinterModule.isConnected();
      return connected === true;
    } catch {
      return false;
    }
  }

  async printReceipt(data: ReceiptData): Promise<void> {
    if (!this.isAvailable()) {
      throw new Error('Thermal printer not available. Requires development build.');
    }
    try {
      const isConnected = await this.isConnected();
      if (!isConnected) {
        throw new Error('Printer not connected');
      }

      // Build receipt text
      let receipt = '';
      
      // Header
      receipt += '[C]<font size="big">DIYAA STOCK</font>\n';
      receipt += '[C]Point of Sale System\n';
      receipt += '[C]================================\n';
      
      // Invoice info
      receipt += `[L]Invoice: ${data.invoiceNumber}\n`;
      receipt += `[L]Date: ${data.date}\n`;
      receipt += `[L]Van: ${data.vanId}\n`;
      receipt += `[L]Cashier: ${data.cashierName}\n`;
      
      if (data.customerName) {
        receipt += `[L]Customer: ${data.customerName}\n`;
      }
      
      receipt += '[C]================================\n';
      
      // Items
      receipt += '[L]ITEMS:\n';
      receipt += '[L]--------------------------------\n';
      
      for (const item of data.items) {
        const name = item.product.name.substring(0, 20);
        const qty = item.quantity;
        const price = item.unit_price.toFixed(2);
        const total = item.total.toFixed(2);
        
        receipt += `[L]${name}\n`;
        receipt += `[L]  ${qty} x $${price}[R]$${total}\n`;
      }
      
      receipt += '[C]================================\n';
      
      // Totals
      receipt += `[L]Subtotal:[R]$${data.subtotal.toFixed(2)}\n`;
      
      if (data.discount > 0) {
        receipt += `[L]Discount:[R]-$${data.discount.toFixed(2)}\n`;
      }
      
      if (data.tax > 0) {
        receipt += `[L]Tax:[R]$${data.tax.toFixed(2)}\n`;
      }
      
      receipt += '[C]================================\n';
      receipt += `[L]<font size="big">TOTAL:[R]$${data.total.toFixed(2)}</font>\n`;
      
      // Footer
      receipt += '\n';
      receipt += '[C]Thank you for your business!\n';
      receipt += '[C]Please come again\n';
      receipt += '\n\n\n';

      // Print the receipt
      await ThermalPrinterModule.printText(receipt);
    } catch (error) {
      console.error('Print error:', error);
      throw error;
    }
  }

  async testPrint(): Promise<void> {
    if (!this.isAvailable()) {
      throw new Error('Thermal printer not available. Requires development build.');
    }
    try {
      const testReceipt = 
        '\n' +
        '================================\n' +
        '       TEST PRINT\n' +
        '================================\n' +
        '   Printer is working!\n' +
        '\n\n\n';
      
      await ThermalPrinterModule.printText(testReceipt);
    } catch (error) {
      console.error('Test print error:', error);
      throw error;
    }
  }
}

export default new BluetoothPrinterService();
