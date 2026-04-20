export interface ReceiptItem {
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
  discountPercent?: number;
}

export interface ReceiptData {
  invoiceNumber: string;
  customerName?: string;
  customerPhone?: string;
  customerBalance?: number;
  items: ReceiptItem[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  paidAmount?: number;
  date: string;
  locationId?: number;
  locationName?: string;
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

  async scanDevices(): Promise<any[]> {
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

      // Build receipt text with professional layout
      let receipt = '';
      
      // Header
      receipt += '[C]<font size="big">DIYAA STOCK</font>\n';
      receipt += `[C]${data.locationName || 'Quality Wholesale'}\n`;
      receipt += '[L]--------------------------------\n';
      
      // Invoice info
      receipt += `[L]INVOICE: ${data.invoiceNumber}\n`;
      receipt += `[L]DATE: ${data.date}\n`;
      receipt += `[L]CASHIER: ${data.cashierName}\n`;
      
      if (data.customerName) {
        receipt += `[L]CUSTOMER: ${data.customerName}\n`;
      }
      
      receipt += '[L]--------------------------------\n';
      
      // Items Header
      receipt += '[L]ITEM[R]TOTAL\n';
      receipt += '[L]--------------------------------\n';
      
      for (const item of data.items) {
        // Name on one line
        receipt += `[L]${item.name.substring(0, 32)}\n`;
        // Qty and Price below
        const qtyPrice = `  ${item.quantity} x $${item.unitPrice.toFixed(2)}`;
        const itemTotal = `$${item.total.toFixed(2)}`;
        receipt += `[L]${qtyPrice}[R]${itemTotal}\n`;
        
        if (item.discountPercent && item.discountPercent > 0) {
          receipt += `[L]  (Disc: ${item.discountPercent}%)\n`;
        }
      }
      
      receipt += '[L]--------------------------------\n';
      
      // Totals
      receipt += `[L]SUBTOTAL:[R]$${data.subtotal.toFixed(2)}\n`;
      
      if (data.discount > 0) {
        receipt += `[L]DISCOUNT:[R]-$${data.discount.toFixed(2)}\n`;
      }
      
      if (data.tax > 0) {
        receipt += `[L]VAT (0%):[R]$${data.tax.toFixed(2)}\n`;
      }
      
      receipt += '[L]--------------------------------\n';
      receipt += `[L]<font size="big">TOTAL:[R]$${data.total.toFixed(2)}</font>\n`;
      
      if (data.paidAmount !== undefined) {
        receipt += `[L]PAID:[R]$${data.paidAmount.toFixed(2)}\n`;
        const bal = data.total - data.paidAmount;
        if (bal > 0) {
          receipt += `[L]<font size="big">DUE:[R]$${bal.toFixed(2)}</font>\n`;
        }
      }
      
      if (data.customerBalance !== undefined) {
        receipt += '[L]--------------------------------\n';
        receipt += `[L]TOTAL BALANCE:[R]$${data.customerBalance.toFixed(2)}\n`;
      }
      
      // Footer
      receipt += '[L]--------------------------------\n';
      receipt += '[C]Thank you for your business!\n';
      receipt += '[C]Goods once sold not returnable\n';
      receipt += '\n\n\n\n';

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
        '[C]================================\n' +
        '[C]       TEST PRINT\n' +
        '[C]================================\n' +
        '[C]   Printer is working!\n' +
        '[C]   DIYAA STOCK SYSTEM\n' +
        '\n\n\n\n';
      
      await ThermalPrinterModule.printText(testReceipt);
    } catch (error) {
      console.error('Test print error:', error);
      throw error;
    }
  }
}

export default new BluetoothPrinterService();
