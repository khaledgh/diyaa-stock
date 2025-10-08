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

class MockBluetoothPrinterService {
  private connected = false;
  private connectedDevice: string | null = null;

  isAvailable(): boolean {
    return true; // Mock always available
  }

  async enableBluetooth(): Promise<boolean> {
    console.log('[MOCK] Bluetooth enabled');
    return true;
  }

  async scanDevices(): Promise<PrinterDevice[]> {
    console.log('[MOCK] Scanning for devices...');
    // Simulate scan delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Return mock devices
    return [
      { address: '00:11:22:33:44:55', name: 'Mock Thermal Printer 1' },
      { address: 'AA:BB:CC:DD:EE:FF', name: 'Mock Thermal Printer 2' },
      { address: '12:34:56:78:90:AB', name: 'Mock POS Printer' },
    ];
  }

  async connectPrinter(address: string): Promise<boolean> {
    console.log('[MOCK] Connecting to printer:', address);
    await new Promise(resolve => setTimeout(resolve, 1000));
    this.connected = true;
    this.connectedDevice = address;
    console.log('[MOCK] Connected successfully');
    return true;
  }

  async disconnectPrinter(): Promise<void> {
    console.log('[MOCK] Disconnecting printer');
    this.connected = false;
    this.connectedDevice = null;
  }

  async isConnected(): Promise<boolean> {
    return this.connected;
  }

  async printReceipt(data: ReceiptData): Promise<void> {
    if (!this.connected) {
      throw new Error('Printer not connected');
    }

    console.log('[MOCK] Printing receipt...');
    console.log('================================');
    console.log('       DIYAA STOCK');
    console.log('   Point of Sale System');
    console.log('================================');
    console.log(`Invoice: ${data.invoiceNumber}`);
    console.log(`Date: ${data.date}`);
    console.log(`Van: ${data.vanId}`);
    console.log(`Cashier: ${data.cashierName}`);
    if (data.customerName) {
      console.log(`Customer: ${data.customerName}`);
    }
    console.log('================================');
    console.log('ITEMS:');
    console.log('--------------------------------');
    
    data.items.forEach(item => {
      console.log(`${item.product.name}`);
      console.log(`  ${item.quantity} x $${item.unit_price.toFixed(2)} = $${item.total.toFixed(2)}`);
    });
    
    console.log('================================');
    console.log(`Subtotal: $${data.subtotal.toFixed(2)}`);
    if (data.discount > 0) {
      console.log(`Discount: -$${data.discount.toFixed(2)}`);
    }
    if (data.tax > 0) {
      console.log(`Tax: $${data.tax.toFixed(2)}`);
    }
    console.log('================================');
    console.log(`TOTAL: $${data.total.toFixed(2)}`);
    console.log('================================');
    console.log('Thank you for your business!');
    console.log('Please come again');
    console.log('================================');
    
    await new Promise(resolve => setTimeout(resolve, 1500));
    console.log('[MOCK] Print completed');
  }

  async testPrint(): Promise<void> {
    if (!this.connected) {
      throw new Error('Printer not connected');
    }

    console.log('[MOCK] Test print...');
    console.log('================================');
    console.log('       TEST PRINT');
    console.log('================================');
    console.log('   Printer is working!');
    console.log('================================');
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log('[MOCK] Test print completed');
  }
}

export default new MockBluetoothPrinterService();
