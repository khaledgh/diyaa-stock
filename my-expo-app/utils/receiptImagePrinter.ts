/**
 * Receipt image printer utility.
 * Generates ESC/POS commands for Arabic thermal receipt printing
 * using Windows-1256 code page text encoding.
 */

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
}

// Windows-1256 character mapping for Arabic
const WINDOWS_1256_MAP: Record<string, number> = {
  '،': 0xa1, '؛': 0xba, '؟': 0xbf,
  'ء': 0xc1, 'آ': 0xc2, 'أ': 0xc3, 'ؤ': 0xc4, 'إ': 0xc5, 'ئ': 0xc6,
  'ا': 0xc7, 'ب': 0xc8, 'ة': 0xc9, 'ت': 0xca, 'ث': 0xcb, 'ج': 0xcc,
  'ح': 0xcd, 'خ': 0xce, 'د': 0xcf, 'ذ': 0xd0, 'ر': 0xd1, 'ز': 0xd2,
  'س': 0xd3, 'ش': 0xd4, 'ص': 0xd5, 'ض': 0xd6, 'ط': 0xd8, 'ظ': 0xd9,
  'ع': 0xda, 'غ': 0xdb, 'ـ': 0xdc, 'ف': 0xdd, 'ق': 0xde, 'ك': 0xdf,
  'ل': 0xe0, 'م': 0xe1, 'ن': 0xe2, 'ه': 0xe3, 'و': 0xe4, 'ى': 0xe5,
  'ي': 0xe6, 'ً': 0xe7, 'ٌ': 0xe8, 'ٍ': 0xe9, 'َ': 0xea, 'ُ': 0xeb,
  'ِ': 0xec, 'ّ': 0xed, 'ْ': 0xee,
};

const ARABIC_CODE_PAGE = 0x16; // CP864

function encodeToWindows1256(text: string): number[] {
  const encoded: number[] = [];
  // Normalize
  let normalized = text.normalize('NFKC');
  normalized = normalized
    .replace(/\uFEFB|\uFEFC/g, 'لا')
    .replace(/\uFEF7|\uFEF8/g, 'لأ')
    .replace(/\uFEF9|\uFEFA/g, 'لإ')
    .replace(/\uFEF5|\uFEF6/g, 'لآ');
  normalized = normalized.replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x0660));
  normalized = normalized.replace(/[\u06F0-\u06F9]/g, (d) => String(d.charCodeAt(0) - 0x06F0));

  for (const char of normalized) {
    const code = char.charCodeAt(0);
    if (code <= 0x7f) {
      encoded.push(code);
    } else {
      const mapped = WINDOWS_1256_MAP[char];
      encoded.push(typeof mapped === 'number' ? mapped : 0x3f);
    }
  }
  return encoded;
}

/**
 * Generate ESC/POS commands for a full Arabic receipt using code-page text encoding.
 * This produces well-formatted receipts with proper alignment and separators.
 */
export function generateReceiptEscPos(data: PrintableReceiptData): number[] {
  const commands: number[] = [];

  // Initialize printer
  commands.push(0x1b, 0x40);
  // Set Arabic code page
  commands.push(0x1b, 0x52, 0x08); // Arabic international set
  commands.push(0x1b, 0x74, ARABIC_CODE_PAGE);
  commands.push(0x1d, 0x74, ARABIC_CODE_PAGE);

  const appendLine = (text: string) => {
    commands.push(...encodeToWindows1256(text));
    commands.push(0x0a);
  };

  const setCenter = () => commands.push(0x1b, 0x61, 0x01);
  const setLeft = () => commands.push(0x1b, 0x61, 0x00);
  const setRight = () => commands.push(0x1b, 0x61, 0x02);
  const setBold = () => commands.push(0x1b, 0x45, 0x01);
  const unsetBold = () => commands.push(0x1b, 0x45, 0x00);
  const setDoubleSize = () => commands.push(0x1d, 0x21, 0x11);
  const setNormalSize = () => commands.push(0x1d, 0x21, 0x00);
  const separator = () => appendLine('--------------------------------');

  // Header
  setCenter();
  setDoubleSize();
  setBold();
  appendLine(data.storeName || 'إيصال بيع');
  setNormalSize();
  unsetBold();
  commands.push(0x0a);

  separator();

  // Invoice info
  setLeft();
  appendLine(`رقم الفاتورة: ${data.invoiceNumber}`);
  appendLine(`التاريخ: ${data.date}`);
  if (data.customerName) {
    appendLine(`العميل: ${data.customerName}`);
  } else {
    appendLine('العميل: زبون نقدي');
  }
  if (data.cashierName) {
    appendLine(`الكاشير: ${data.cashierName}`);
  }

  separator();

  // Items header
  setBold();
  appendLine('المنتج          الكمية  السعر  الإجمالي');
  unsetBold();
  separator();

  // Items
  for (const item of data.items) {
    appendLine(item.name);
    appendLine(`  ${item.quantity} x $${item.unitPrice.toFixed(2)}    $${item.total.toFixed(2)}`);
  }

  separator();

  // Totals
  setRight();
  appendLine(`المجموع الفرعي: $${data.subtotal.toFixed(2)}`);
  if (data.discount > 0) {
    appendLine(`الخصم: -$${data.discount.toFixed(2)}`);
  }
  if (data.tax > 0) {
    appendLine(`الضريبة: $${data.tax.toFixed(2)}`);
  }

  separator();

  setBold();
  setDoubleSize();
  appendLine(`الإجمالي: $${data.total.toFixed(2)}`);
  setNormalSize();
  unsetBold();

  // Payment info
  setRight();
  appendLine(`المدفوع: $${data.paidAmount.toFixed(2)}`);
  const remaining = data.total - data.paidAmount;
  if (remaining > 0.01) {
    appendLine(`المتبقي: $${remaining.toFixed(2)}`);
  } else {
    appendLine('الحالة: مدفوع بالكامل');
  }

  separator();

  // Footer
  setCenter();
  commands.push(0x0a);
  appendLine('شكراً لتسوقكم معنا');
  appendLine('Thank you for shopping with us');
  commands.push(0x0a);

  // Feed and cut
  commands.push(0x1b, 0x64, 0x04); // Feed 4 lines
  commands.push(0x1d, 0x56, 0x42, 0x00); // Full cut

  return commands;
}
