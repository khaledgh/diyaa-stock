// Server-side Arabic bitmap printing utility
// This would be implemented on your backend server

export interface ReceiptData {
  header: string;
  items: {
    name: string;
    price: string;
    quantity?: string;
  }[];
  total: string;
  footer: string;
}

// This function would be called from your backend
export const generateArabicReceiptBitmap = async (data: ReceiptData): Promise<string> => {
  // On your backend (Node.js), you would:
  // 1. Use canvas or sharp to render Arabic text with proper shaping
  // 2. Convert to 1-bit monochrome bitmap
  // 3. Format as ESC/POS raster commands
  // 4. Return base64 encoded bitmap data

  // Example backend implementation (Node.js):
  /*
  const canvas = createCanvas(384, 600);
  const ctx = canvas.getContext('2d');

  // Set up RTL text rendering
  ctx.direction = 'rtl';
  ctx.font = '16px Arial';
  ctx.fillStyle = 'black';
  ctx.textAlign = 'center';

  // Draw receipt
  ctx.fillText(data.header, 192, 50);
  data.items.forEach((item, index) => {
    ctx.fillText(`${item.name}: ${item.price}`, 192, 100 + (index * 30));
  });
  ctx.fillText(data.total, 192, 400);
  ctx.fillText(data.footer, 192, 500);

  // Convert to 1-bit bitmap
  const bitmap = canvas.toBuffer('image/png');

  // Convert to ESC/POS raster format
  const escPosData = convertToEscPosRaster(bitmap);

  return escPosData.toString('base64');
  */

  // For now, return a placeholder
  return '';
};

// Client-side function to call the backend
export const printArabicReceiptFromServer = async (data: ReceiptData): Promise<void> => {
  try {
    const response = await fetch('https://your-backend.com/api/print-arabic', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error('Failed to generate receipt');
    }

    const { bitmapData } = await response.json();
    return bitmapData;
  } catch (error) {
    console.error('Server-side printing error:', error);
    throw error;
  }
};

// Client-side print function using existing printer components
export const printArabicReceiptLocally = async (
  data: ReceiptData,
  printerRef?: any
): Promise<void> => {
  try {
    // Format the receipt text
    const receiptText = [
      data.header,
      '================',
      ...data.items.map(item =>
        item.quantity
          ? `${item.name} x${item.quantity}: ${item.price}`
          : `${item.name}: ${item.price}`
      ),
      '================',
      `المجموع: ${data.total}`,
      data.footer
    ].join('\n');

    // Use the printer ref if available (BLE printing)
    if (printerRef?.current?.printReceipt) {
      await printerRef.current.printReceipt(receiptText);
    } else {
      throw new Error('No printer available. Please connect to a BLE printer first.');
    }
  } catch (error) {
    console.error('Local printing error:', error);
    throw error;
  }
};
