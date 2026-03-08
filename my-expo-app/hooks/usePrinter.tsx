import { useRef } from 'react';
import PrinterDemo from '../components/PrinterDemo';
import { PrintableReceiptData } from '../utils/receiptImagePrinter';

export interface PrinterRef {
  printReceipt: (text: string) => Promise<boolean>;
  printReceiptData: (data: PrintableReceiptData) => Promise<void>;
  getConnectedDevice: () => any;
  isConnected: () => boolean;
}

export const usePrinter = () => {
  const printerRef = useRef<PrinterRef>(null);

  const printReceipt = async (receiptData: string): Promise<boolean> => {
    if (!printerRef.current) {
      throw new Error('Printer component not mounted');
    }

    if (!printerRef.current.isConnected()) {
      throw new Error('No printer connected');
    }

    return await printerRef.current.printReceipt(receiptData);
  };

  const printReceiptData = async (data: PrintableReceiptData): Promise<void> => {
    if (!printerRef.current) {
      throw new Error('Printer component not mounted');
    }

    if (!printerRef.current.isConnected()) {
      throw new Error('No printer connected');
    }

    return await printerRef.current.printReceiptData(data);
  };

  const isConnected = (): boolean => {
    return printerRef.current?.isConnected() || false;
  };

  const getConnectedDevice = () => {
    return printerRef.current?.getConnectedDevice();
  };

  return {
    printerRef,
    printReceipt,
    printReceiptData,
    isConnected,
    getConnectedDevice,
    PrinterComponent: () => <PrinterDemo ref={printerRef} />,
  };
};
