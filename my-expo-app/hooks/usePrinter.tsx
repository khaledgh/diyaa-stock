import React, { createContext, useContext, useRef, useState, useCallback, useEffect, ReactNode } from 'react';
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
  const pendingResolveRef = useRef<(() => void) | null>(null);
  const pendingRejectRef = useRef<((err: Error) => void) | null>(null);

  // When printer connects and we have a pending job, execute it
  const checkPendingPrint = useCallback(async () => {
    if (pendingPrintRef.current && printerRef.current?.isConnected()) {
      const data = pendingPrintRef.current;
      const resolve = pendingResolveRef.current;
      const reject = pendingRejectRef.current;
      pendingPrintRef.current = null;
      pendingResolveRef.current = null;
      pendingRejectRef.current = null;
      setShowUI(false);
      try {
        await printerRef.current.printReceiptData(data);
        if (resolve) resolve();
      } catch (err: any) {
        if (reject) reject(err);
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
    // If connected, print immediately
    if (printerRef.current.isConnected()) {
      return await printerRef.current.printReceiptData(data);
    }
    // Not connected: queue the job, open printer UI, and wait until it prints or user cancels
    return new Promise<void>((resolve, reject) => {
      pendingPrintRef.current = data;
      pendingResolveRef.current = resolve;
      pendingRejectRef.current = reject;
      setShowUI(true);
    });
  };

  const isConnected = (): boolean => printerRef.current?.isConnected() || false;
  const getConnectedDevice = () => printerRef.current?.getConnectedDevice();
  const openPrinterUI = () => setShowUI(true);
  const closePrinterUI = () => {
    const reject = pendingRejectRef.current;
    pendingPrintRef.current = null;
    pendingResolveRef.current = null;
    pendingRejectRef.current = null;
    if (reject) reject(new Error('Printing cancelled'));
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
