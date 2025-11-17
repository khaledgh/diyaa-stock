import { useRef } from 'react';
import PrinterDemo, { PrinterRef } from '../components/PrinterDemo';

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

  const isConnected = (): boolean => {
    return printerRef.current?.isConnected() || false;
  };

  const getConnectedDevice = () => {
    return printerRef.current?.getConnectedDevice();
  };

  return {
    printerRef,
    printReceipt,
    isConnected,
    getConnectedDevice,
    PrinterComponent: () => <PrinterDemo ref={printerRef} />,
  };
};
