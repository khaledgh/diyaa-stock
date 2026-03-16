/**
 * Receipt printer utility.
 * Renders receipt as a bitmap image for printers without Arabic font support.
 * Uses react-native-view-shot to capture a React Native View, then converts
 * to 1-bit monochrome bitmap for ESC/POS raster printing (GS v 0).
 *
 * Now powered by printerCommands.ts (ported from ZJ Bluetooth SDK).
 */

import { PrinterCommands } from './printerCommands';

export interface PrintableReceiptData {
  invoiceNumber: string;
  customerName?: string;
  items: {
    name: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paidAmount: number;
  date: string;
  cashierName?: string;
  storeName?: string;
  locationName?: string;
}

/**
 * Convert base64 image data to 1-bit monochrome bitmap ESC/POS raster commands.
 * Delegates to PrinterCommands.rasterImage().
 */
export function imageToEscPos(
  pixelData: Uint8Array | number[],
  width: number,
  height: number,
  printerWidth: number = 384,
): number[] {
  const cmd: number[] = [];
  cmd.push(...PrinterCommands.init());
  cmd.push(...PrinterCommands.rasterImage(pixelData, width, height, printerWidth));
  cmd.push(...PrinterCommands.feedLines(3));
  cmd.push(...PrinterCommands.cut());

  const scale = printerWidth / width;
  const scaledHeight = Math.round(height * scale);
  console.log(`🖨️ Image receipt: ${cmd.length} bytes, ${printerWidth}x${scaledHeight}px`);
  return cmd;
}

/** Generate a simple ESC/POS receipt with ONLY ASCII text (no Arabic) as fallback.
 *  Now uses PrinterCommands SDK for all ESC/POS sequences. */
export function generateReceiptEscPos(data: PrintableReceiptData): number[] {
  const result = PrinterCommands.buildReceipt({
    printerWidth: 58,
    storeName: data.storeName,
    invoiceNumber: data.invoiceNumber,
    date: data.date,
    customerName: data.customerName,
    cashierName: data.cashierName,
    items: data.items.map(i => ({
      name: i.name,
      qty: i.quantity,
      price: i.unitPrice,
      total: i.total,
    })),
    subtotal: data.subtotal,
    discount: data.discount,
    tax: data.tax,
    total: data.total,
    paid: data.paidAmount,
  });

  console.log(`🖨️ SDK Receipt: ${result.length} bytes, ${data.items.length} items`);
  return result;
}
