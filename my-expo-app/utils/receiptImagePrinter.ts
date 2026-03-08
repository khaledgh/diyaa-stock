/**
 * Receipt printer utility.
 * Generates ESC/POS commands for thermal receipt printing.
 * Uses Windows-1256 encoding for Arabic with proper code page setup.
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

// Windows-1256 mapping for Arabic characters
const W1256: Record<string, number> = {
  '،': 0xa1, '؛': 0xba, '؟': 0xbf,
  'ء': 0xc1, 'آ': 0xc2, 'أ': 0xc3, 'ؤ': 0xc4, 'إ': 0xc5, 'ئ': 0xc6,
  'ا': 0xc7, 'ب': 0xc8, 'ة': 0xc9, 'ت': 0xca, 'ث': 0xcb, 'ج': 0xcc,
  'ح': 0xcd, 'خ': 0xce, 'د': 0xcf, 'ذ': 0xd0, 'ر': 0xd1, 'ز': 0xd2,
  'س': 0xd3, 'ش': 0xd4, 'ص': 0xd5, 'ض': 0xd6, 'ط': 0xd8, 'ظ': 0xd9,
  'ع': 0xda, 'غ': 0xdb, 'ـ': 0xdc, 'ف': 0xdd, 'ق': 0xde, 'ك': 0xdf,
  'ل': 0xe0, 'م': 0xe1, 'ن': 0xe2, 'ه': 0xe3, 'و': 0xe4, 'ى': 0xe5,
  'ي': 0xe6,
};

/** Encode string: ASCII passes through, Arabic mapped to Windows-1256 bytes */
function encode(text: string): number[] {
  const out: number[] = [];
  // Strip diacritics for cleaner output
  const s = text.replace(/[\u064B-\u065F\u0670]/g, '');
  for (const ch of s) {
    const code = ch.charCodeAt(0);
    if (code <= 0x7f) {
      out.push(code);
    } else {
      out.push(W1256[ch] ?? 0x3f);
    }
  }
  return out;
}

/**
 * Generate ESC/POS commands for a formatted receipt.
 * Sends Arabic text using Windows-1256 encoding with multiple code page attempts.
 */
export function generateReceiptEscPos(data: PrintableReceiptData): number[] {
  const cmd: number[] = [];

  const raw = (...bytes: number[]) => cmd.push(...bytes);
  const line = (s: string) => { cmd.push(...encode(s)); raw(0x0a); };
  const feed = (n = 1) => { for (let i = 0; i < n; i++) raw(0x0a); };
  const center = () => raw(0x1b, 0x61, 0x01);
  const left = () => raw(0x1b, 0x61, 0x00);
  const right = () => raw(0x1b, 0x61, 0x02);
  const bold = (on: boolean) => raw(0x1b, 0x45, on ? 0x01 : 0x00);
  const sep = () => line('--------------------------------');

  // --- Initialize printer ---
  raw(0x1b, 0x40); // ESC @ - Reset printer

  // Set code page to Windows-1256 (CP864 Arabic)
  raw(0x1b, 0x74, 0x16); // ESC t 22 - Arabic code page
  raw(0x1b, 0x52, 0x08); // ESC R 8 - International character set: Arabic

  // --- Header ---
  center();
  bold(true);
  line(data.storeName || 'ايصال بيع');
  bold(false);
  feed();
  sep();

  // --- Invoice info ---
  left();
  if (data.invoiceNumber) line(`# ${data.invoiceNumber}`);
  if (data.date) line(data.date);
  if (data.customerName) line(data.customerName);
  if (data.cashierName) line(data.cashierName);
  sep();

  // --- Items ---
  for (const item of data.items) {
    line(item.name);
    line(`  ${item.quantity} x ${item.unitPrice.toFixed(2)} = ${item.total.toFixed(2)}`);
  }
  sep();

  // --- Totals ---
  right();
  line(`Subtotal: ${data.subtotal.toFixed(2)}`);
  if (data.discount > 0) line(`Discount: -${data.discount.toFixed(2)}`);
  if (data.tax > 0) line(`Tax: ${data.tax.toFixed(2)}`);
  sep();

  // --- Grand total ---
  center();
  bold(true);
  line(`TOTAL: ${data.total.toFixed(2)}`);
  bold(false);
  feed();

  // --- Payment ---
  right();
  line(`Paid: ${data.paidAmount.toFixed(2)}`);
  const remaining = data.total - data.paidAmount;
  if (remaining > 0.01) {
    bold(true);
    line(`Remaining: ${remaining.toFixed(2)}`);
    bold(false);
  } else {
    line('FULLY PAID');
  }
  sep();

  // --- Footer ---
  center();
  feed();
  line('شكرا لتسوقكم معنا');
  line('Thank you!');
  feed(3);

  // Cut paper
  raw(0x1d, 0x56, 0x42, 0x00);

  console.log(`🖨️ Receipt: ${cmd.length} bytes, ${data.items.length} items, total=${data.total}`);
  return cmd;
}
