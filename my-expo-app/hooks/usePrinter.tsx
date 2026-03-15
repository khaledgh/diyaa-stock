import React, { createContext, useContext, useRef, useState, useCallback, useEffect, ReactNode } from 'react';
import { Alert } from 'react-native';
import PrinterDemo from '../components/PrinterDemo';
import { PrintableReceiptData } from '../utils/receiptImagePrinter';

export interface PrinterRef {
  printReceipt: (text: string) => Promise<boolean>;
  printReceiptData: (data: PrintableReceiptData) => Promise<void>;
  getConnectedDevice: () => any;
  isConnected: () => boolean;
}

interface PrinterContextValue {
  printerRef: React.RefObject<PrinterRef | null>;
  printReceipt: (receiptData: string) => Promise<boolean>;
  printReceiptData: (data: PrintableReceiptData) => Promise<void>;
  isConnected: () => boolean;
  getConnectedDevice: () => any;
  openPrinterUI: () => void;
  closePrinterUI: () => void;
}

const PrinterContext = createContext<PrinterContextValue | null>(null);

// Single provider to be placed at the app root — mounts exactly ONE PrinterDemo
export function PrinterProvider({ children }: { children: ReactNode }) {
  const printerRef = useRef<PrinterRef>(null);
  const [showUI, setShowUI] = useState(false);
  const pendingPrintRef = useRef<PrintableReceiptData | null>(null);

  // When printer connects and we have a pending job, execute it
  const checkPendingPrint = useCallback(async () => {
    if (pendingPrintRef.current && printerRef.current?.isConnected()) {
      const data = pendingPrintRef.current;
      pendingPrintRef.current = null;
      setShowUI(false);
      try {
        await printerRef.current.printReceiptData(data);
        Alert.alert('Success', 'Receipt sent to printer.');
      } catch (err: any) {
        Alert.alert('Print Error', err?.message || 'Failed to print receipt.');
      }
    }
  }, []);

  // Poll for connection when UI is shown and there's a pending job
  useEffect(() => {
    if (!showUI || !pendingPrintRef.current) return;
    const interval = setInterval(() => {
      if (printerRef.current?.isConnected()) {
        checkPendingPrint();
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [showUI, checkPendingPrint]);

  const printReceipt = async (receiptData: string): Promise<boolean> => {
    if (!printerRef.current) throw new Error('Printer component not mounted');
    if (!printerRef.current.isConnected()) throw new Error('No printer connected');
    return await printerRef.current.printReceipt(receiptData);
  };

  const printReceiptData = async (data: PrintableReceiptData): Promise<void> => {
    if (!printerRef.current) throw new Error('Printer component not mounted');
    // If not connected, queue the job and open printer UI
    if (!printerRef.current.isConnected()) {
      pendingPrintRef.current = data;
      setShowUI(true);
      return; // Will auto-print when connected, or user can skip
    }
    return await printerRef.current.printReceiptData(data);
  };

  const isConnected = (): boolean => printerRef.current?.isConnected() || false;
  const getConnectedDevice = () => printerRef.current?.getConnectedDevice();
  const openPrinterUI = () => setShowUI(true);
  const closePrinterUI = () => {
    pendingPrintRef.current = null; // Clear pending job on skip/close
    setShowUI(false);
  };

  return (
    <PrinterContext.Provider value={{ printerRef, printReceipt, printReceiptData, isConnected, getConnectedDevice, openPrinterUI, closePrinterUI }}>
      {/* Single PrinterDemo instance - always mounted, showUI prop controls visibility */}
      <PrinterDemo ref={printerRef} hideUI={!showUI} onClose={closePrinterUI} />
      {children}
    </PrinterContext.Provider>
  );
}

export const usePrinter = (): PrinterContextValue => {
  const ctx = useContext(PrinterContext);
  if (!ctx) throw new Error('usePrinter must be used inside PrinterProvider');
  return ctx;
};
