/**
 * ESC/POS Printer Commands - TypeScript port of ZJ Bluetooth SDK
 * 
 * Ported from: sdk/BlueToothDEMO/src/zj/com/command/sdk/
 * Compatible with ZJ/Zjiang 58mm/80mm thermal printers via BLE.
 *
 * Usage: import { PrinterCommands } from './printerCommands';
 *        const cmds = PrinterCommands.init();
 *        // ... build command buffer, then send via BLE
 */

// ---------------------------------------------------------------------------
// Low-level byte constants (mirrors Command.java)
// ---------------------------------------------------------------------------
const ESC = 0x1b;
const FS  = 0x1c;
const GS  = 0x1d;
const DLE = 0x10;
// const DC4 = 0x14; // Available if needed for cash drawer commands
const DC1 = 0x11;
const US  = 0x1f;
const SP  = 0x20;
const NL  = 0x0a;
// const FF  = 0x0c; // Form feed - available if needed

// ---------------------------------------------------------------------------
// Alignment constants
// ---------------------------------------------------------------------------
export const ALIGN_LEFT   = 0;
export const ALIGN_CENTER = 1;
export const ALIGN_RIGHT  = 2;

// ---------------------------------------------------------------------------
// Barcode types (GS k)
// ---------------------------------------------------------------------------
export const BARCODE_UPC_A    = 0x41;
export const BARCODE_UPC_E    = 0x42;
export const BARCODE_EAN13    = 0x43;
export const BARCODE_EAN8     = 0x44;
export const BARCODE_CODE39   = 0x45;
export const BARCODE_ITF      = 0x46;
export const BARCODE_CODABAR  = 0x47;
export const BARCODE_CODE93   = 0x48;
export const BARCODE_CODE128  = 0x49;

// ---------------------------------------------------------------------------
// HRI (Human Readable Interpretation) positions for barcodes
// ---------------------------------------------------------------------------
export const HRI_NONE  = 0;
export const HRI_ABOVE = 1;
export const HRI_BELOW = 2;
export const HRI_BOTH  = 3;

// ---------------------------------------------------------------------------
// Code pages (ESC t n) — common ones for Arabic / multilingual
// ---------------------------------------------------------------------------
export const CODEPAGE_PC437       = 0;   // USA, Standard Europe
export const CODEPAGE_PC850       = 2;   // Multilingual
export const CODEPAGE_PC860       = 3;   // Portuguese
export const CODEPAGE_PC863       = 4;   // Canadian-French
export const CODEPAGE_PC865       = 5;   // Nordic
export const CODEPAGE_WPC1252     = 16;  // Latin 1
export const CODEPAGE_PC866       = 17;  // Cyrillic #2
export const CODEPAGE_PC852       = 18;  // Latin 2
export const CODEPAGE_PC858       = 19;  // Euro
export const CODEPAGE_WINDOWS1256 = 28;  // Arabic (Windows-1256)
export const CODEPAGE_PC720       = 32;  // Arabic (PC720)

// ---------------------------------------------------------------------------
// Helper: concatenate multiple byte arrays
// ---------------------------------------------------------------------------
function concat(...arrays: (number[] | Uint8Array)[]): number[] {
  const result: number[] = [];
  for (const arr of arrays) {
    for (let i = 0; i < arr.length; i++) result.push(arr[i]);
  }
  return result;
}

// ---------------------------------------------------------------------------
// Helper: encode string to bytes using a specific code page
// ---------------------------------------------------------------------------
function encodeText(text: string, encoding: 'ascii' | 'utf8' | 'windows1256' = 'utf8'): number[] {
  const bytes: number[] = [];

  if (encoding === 'windows1256') {
    // Windows-1256 Arabic code page mapping
    for (let i = 0; i < text.length; i++) {
      const code = text.charCodeAt(i);
      if (code <= 0x7f) {
        bytes.push(code);
      } else {
        const mapped = unicodeToWindows1256(code);
        bytes.push(mapped !== null ? mapped : 0x3f); // '?' for unmapped
      }
    }
  } else if (encoding === 'ascii') {
    for (let i = 0; i < text.length; i++) {
      const code = text.charCodeAt(i);
      bytes.push(code <= 0x7f ? code : 0x3f);
    }
  } else {
    // UTF-8
    for (let i = 0; i < text.length; i++) {
      let code = text.charCodeAt(i);
      if (code >= 0xd800 && code <= 0xdbff && i + 1 < text.length) {
        const next = text.charCodeAt(i + 1);
        if (next >= 0xdc00 && next <= 0xdfff) {
          code = ((code - 0xd800) << 10) + (next - 0xdc00) + 0x10000;
          i++;
        }
      }
      if (code <= 0x7f) bytes.push(code);
      else if (code <= 0x7ff) bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
      else if (code <= 0xffff) bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
      else bytes.push(0xf0 | (code >> 18), 0x80 | ((code >> 12) & 0x3f), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
    }
  }
  return bytes;
}

// ---------------------------------------------------------------------------
// Windows-1256 lookup for Arabic characters (Unicode -> byte)
// ---------------------------------------------------------------------------
const WIN1256_MAP: Record<number, number> = {
  // Arabic letters
  0x060c: 0xa1, // Arabic comma
  0x061b: 0xba, // Arabic semicolon
  0x061f: 0xbf, // Arabic question mark
  0x0621: 0xc1, // Hamza
  0x0622: 0xc2, // Alef with Madda
  0x0623: 0xc3, // Alef with Hamza Above
  0x0624: 0xc4, // Waw with Hamza
  0x0625: 0xc5, // Alef with Hamza Below
  0x0626: 0xc6, // Yeh with Hamza
  0x0627: 0xc7, // Alef
  0x0628: 0xc8, // Beh
  0x0629: 0xc9, // Teh Marbuta
  0x062a: 0xca, // Teh
  0x062b: 0xcb, // Theh
  0x062c: 0xcc, // Jeem
  0x062d: 0xcd, // Hah
  0x062e: 0xce, // Khah
  0x062f: 0xcf, // Dal
  0x0630: 0xd0, // Thal
  0x0631: 0xd1, // Reh
  0x0632: 0xd2, // Zain
  0x0633: 0xd3, // Seen
  0x0634: 0xd4, // Sheen
  0x0635: 0xd5, // Sad
  0x0636: 0xd6, // Dad
  0x0637: 0xd8, // Tah
  0x0638: 0xd9, // Zah
  0x0639: 0xda, // Ain
  0x063a: 0xdb, // Ghain
  0x0640: 0xdc, // Tatweel
  0x0641: 0xdd, // Feh
  0x0642: 0xde, // Qaf
  0x0643: 0xdf, // Kaf
  0x0644: 0xe1, // Lam
  0x0645: 0xe3, // Meem
  0x0646: 0xe4, // Noon
  0x0647: 0xe5, // Heh
  0x0648: 0xe6, // Waw
  0x0649: 0xec, // Alef Maksura
  0x064a: 0xed, // Yeh
  // Diacritics
  0x064b: 0xf0, // Fathatan
  0x064c: 0xf1, // Dammatan
  0x064d: 0xf2, // Kasratan
  0x064e: 0xf3, // Fatha
  0x064f: 0xf5, // Damma
  0x0650: 0xf6, // Kasra
  0x0651: 0xf8, // Shadda
  0x0652: 0xfa, // Sukun
  // Common symbols
  0x00a0: 0xa0, // Non-breaking space
  0x00ab: 0xab, // «
  0x00bb: 0xbb, // »
  0x200f: 0xfd, // Right-to-left mark
  0x200e: 0xfe, // Left-to-right mark
};

function unicodeToWindows1256(code: number): number | null {
  if (code <= 0x7f) return code;
  if (code >= 0xa0 && code <= 0xff) return code; // Latin-1 Supplement passthrough
  return WIN1256_MAP[code] ?? null;
}

// ===========================================================================
// PrinterCommands — main API
// ===========================================================================
export const PrinterCommands = {

  // -------------------------------------------------------------------------
  // Printer control
  // -------------------------------------------------------------------------

  /** ESC @ — Initialize / reset printer */
  init(): number[] {
    return [ESC, 0x40];
  },

  /** Print and line feed */
  lineFeed(): number[] {
    return [NL];
  },

  /** ESC d n — Print and feed n lines */
  feedLines(n: number): number[] {
    return [ESC, 0x64, Math.min(Math.max(n, 0), 255)];
  },

  /** ESC J n — Print and feed paper n dots (0-255) */
  feedDots(n: number): number[] {
    return [ESC, 0x4a, Math.min(Math.max(n, 0), 255)];
  },

  /** GS V m n — Cut paper. mode: 0=full, 1=partial, 66(0x42)=feed then partial */
  cut(mode: number = 0x42, feed: number = 0): number[] {
    return [GS, 0x56, mode, Math.min(Math.max(feed, 0), 255)];
  },

  /** ESC B m n — Beep. m=times(1-9), t=duration(1-9) */
  beep(times: number = 3, duration: number = 3): number[] {
    times = Math.min(Math.max(times, 1), 9);
    duration = Math.min(Math.max(duration, 1), 9);
    return [ESC, 0x42, times, duration];
  },

  /** Print self-test page */
  selfTest(): number[] {
    return [US, DC1, 0x04];
  },

  // -------------------------------------------------------------------------
  // Text formatting
  // -------------------------------------------------------------------------

  /** ESC a n — Set alignment: 0=left, 1=center, 2=right */
  align(mode: number): number[] {
    return [ESC, 0x61, Math.min(Math.max(mode, 0), 2)];
  },

  /** ESC E n — Bold on/off */
  bold(on: boolean): number[] {
    const v = on ? 1 : 0;
    return [ESC, 0x45, v, ESC, 0x47, v];
  },

  /** ESC - n — Underline: 0=off, 1=1dot, 2=2dot */
  underline(mode: number = 1): number[] {
    const v = Math.min(Math.max(mode, 0), 2);
    return [ESC, 0x2d, v, FS, 0x2d, v];
  },

  /** GS ! n — Font size (width x height multiplier 0-7 each) */
  fontSize(width: number = 0, height: number = 0): number[] {
    width = Math.min(Math.max(width, 0), 7);
    height = Math.min(Math.max(height, 0), 7);
    const widthBits  = [0x00, 0x10, 0x20, 0x30, 0x40, 0x50, 0x60, 0x70];
    const heightBits = [0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07];
    return [GS, 0x21, widthBits[width] + heightBits[height]];
  },

  /** ESC M n — Select character font: 0=Font A (12x24), 1=Font B (9x17) */
  font(type: 0 | 1 = 0): number[] {
    return [ESC, 0x4d, type];
  },

  /** GS B n — Inverse (white on black): 0=off, 1=on */
  inverse(on: boolean): number[] {
    return [GS, 0x42, on ? 1 : 0];
  },

  /** ESC V n — Rotate 90°: 0=off, 1=on */
  rotate90(on: boolean): number[] {
    return [ESC, 0x56, on ? 1 : 0];
  },

  /** ESC { n — Upside-down printing: 0=off, 1=on */
  upsideDown(on: boolean): number[] {
    return [ESC, 0x7b, on ? 1 : 0];
  },

  /** ESC SP n — Set right character spacing (0-255 dots) */
  charSpacing(n: number): number[] {
    return [ESC, SP, Math.min(Math.max(n, 0), 255)];
  },

  /** ESC 2 — Set default line spacing (about 3.75mm) */
  defaultLineSpacing(): number[] {
    return [ESC, 0x32];
  },

  /** ESC 3 n — Set line spacing to n dots (0-255) */
  lineSpacing(n: number): number[] {
    return [ESC, 0x33, Math.min(Math.max(n, 0), 255)];
  },

  // -------------------------------------------------------------------------
  // Code page & encoding
  // -------------------------------------------------------------------------

  /** ESC t n — Select character code page (0-255) */
  codePage(page: number): number[] {
    return [ESC, 0x74, Math.min(Math.max(page, 0), 255)];
  },

  /** FS & — Select Chinese/Kanji mode */
  kanjiMode(): number[] {
    return [FS, 0x26];
  },

  /** FS . — Cancel Chinese/Kanji mode (single-byte character mode) */
  singleByteMode(): number[] {
    return [FS, 0x2e];
  },

  // -------------------------------------------------------------------------
  // Layout
  // -------------------------------------------------------------------------

  /** GS L nL nH — Set left margin (0-65535 dots) */
  leftMargin(dots: number): number[] {
    dots = Math.min(Math.max(dots, 0), 65535);
    return [GS, 0x4c, dots & 0xff, (dots >> 8) & 0xff];
  },

  /** GS W nL nH — Set print area width (0-65535 dots) */
  printWidth(dots: number): number[] {
    dots = Math.min(Math.max(dots, 0), 65535);
    return [GS, 0x57, dots & 0xff, (dots >> 8) & 0xff];
  },

  /** ESC $ nL nH — Set absolute print position */
  absolutePosition(pos: number): number[] {
    pos = Math.min(Math.max(pos, 0), 65535);
    return [ESC, 0x24, pos & 0xff, (pos >> 8) & 0xff];
  },

  // -------------------------------------------------------------------------
  // Cash drawer
  // -------------------------------------------------------------------------

  /** ESC p m t1 t2 — Kick cash drawer. pin: 0 or 1 */
  openCashDrawer(pin: 0 | 1 = 0, onTime: number = 100, offTime: number = 100): number[] {
    return [ESC, 0x70, pin,
      Math.min(Math.max(onTime, 0), 255),
      Math.min(Math.max(offTime, 0), 255)];
  },

  // -------------------------------------------------------------------------
  // Status
  // -------------------------------------------------------------------------

  /** DLE EOT n — Real-time status. n: 1=printer, 2=offline, 3=error, 4=paper */
  realtimeStatus(n: 1 | 2 | 3 | 4 = 1): number[] {
    return [DLE, 0x04, n];
  },

  // -------------------------------------------------------------------------
  // Barcode printing (ported from PrinterCommand.getCodeBarCommand)
  // -------------------------------------------------------------------------

  /**
   * Print a 1D barcode.
   * @param data    - Barcode content string (ASCII)
   * @param type    - Barcode type (use BARCODE_* constants, 0x41-0x49)
   * @param width   - Bar width (2-6)
   * @param height  - Bar height in dots (1-255)
   * @param hriFont - HRI font: 0=Font A, 1=Font B
   * @param hriPos  - HRI position: 0=none, 1=above, 2=below, 3=both
   */
  barcode(
    data: string,
    type: number = BARCODE_CODE128,
    width: number = 3,
    height: number = 162,
    hriFont: number = 0,
    hriPos: number = HRI_BELOW,
  ): number[] {
    width  = Math.min(Math.max(width, 2), 6);
    height = Math.min(Math.max(height, 1), 255);

    const barcodeData = encodeText(data, 'ascii');
    const cmd: number[] = [
      GS, 0x77, width,           // GS w - set barcode width
      GS, 0x68, height,          // GS h - set barcode height
      GS, 0x66, hriFont & 0x01,  // GS f - HRI font
      GS, 0x48, hriPos & 0x03,   // GS H - HRI position
      GS, 0x6b, type,            // GS k - print barcode
      barcodeData.length,         // data length
      ...barcodeData,
    ];
    return cmd;
  },

  // -------------------------------------------------------------------------
  // QR Code printing (ported from PrinterCommand.getBarCommand)
  // -------------------------------------------------------------------------

  /**
   * Print a QR code.
   * @param data               - QR code content string
   * @param moduleSize         - Module (dot) size (1-8)
   * @param errorCorrection    - Error correction: 0=L, 1=M, 2=Q, 3=H
   */
  qrCode(
    data: string,
    moduleSize: number = 4,
    errorCorrection: number = 1,
  ): number[] {
    moduleSize = Math.min(Math.max(moduleSize, 1), 8);
    errorCorrection = Math.min(Math.max(errorCorrection, 0), 3);

    const qrData = encodeText(data, 'utf8');
    const len = qrData.length;

    // ESC Z version errorCorrection magnification nL nH [data]
    // (ZJ vendor-specific QR code command)
    const cmd: number[] = [
      ESC, 0x5a,               // ESC Z
      0x03,                    // QR version (auto)
      errorCorrection,         // Error correction level
      moduleSize,              // Magnification
      len & 0xff,              // nL
      (len >> 8) & 0xff,       // nH
      ...qrData,
    ];
    return cmd;
  },

  // -------------------------------------------------------------------------
  // Image / bitmap printing
  // -------------------------------------------------------------------------

  /**
   * Print raster bit image (GS v 0).
   * @param pixelData  - Raw RGBA pixel array (or 1-bit packed if prePacked=true)
   * @param width      - Image width in pixels
   * @param height     - Image height in pixels
   * @param printerWidth - Printer dot width (384 for 58mm, 576 for 80mm)
   * @param prePacked  - If true, pixelData is already 1-bit per pixel packed bytes
   */
  rasterImage(
    pixelData: Uint8Array | number[],
    width: number,
    height: number,
    printerWidth: number = 384,
    prePacked: boolean = false,
  ): number[] {
    const cmd: number[] = [];
    const bytesPerRow = Math.ceil(printerWidth / 8);

    if (prePacked) {
      // Data is already packed 1-bit monochrome
      const expectedRows = height;
      cmd.push(GS, 0x76, 0x30, 0x00); // GS v 0, normal mode
      cmd.push(bytesPerRow & 0xff);
      cmd.push((bytesPerRow >> 8) & 0xff);
      cmd.push(expectedRows & 0xff);
      cmd.push((expectedRows >> 8) & 0xff);

      for (let i = 0; i < pixelData.length; i++) {
        cmd.push(pixelData[i]);
      }
    } else {
      // RGBA pixel data — convert to 1-bit monochrome with area sampling
      // Area sampling: for each output pixel, scan ALL source pixels that map
      // into it. If ANY source pixel is dark, output pixel is black.
      // This preserves thin text strokes that nearest-neighbor would skip.
      const scaleX = width / printerWidth;
      const scaleY = scaleX; // uniform scale
      const scaledHeight = Math.round(height / scaleY);

      cmd.push(GS, 0x76, 0x30, 0x00);
      cmd.push(bytesPerRow & 0xff);
      cmd.push((bytesPerRow >> 8) & 0xff);
      cmd.push(scaledHeight & 0xff);
      cmd.push((scaledHeight >> 8) & 0xff);

      for (let y = 0; y < scaledHeight; y++) {
        const srcY0 = Math.floor(y * scaleY);
        const srcY1 = Math.min(Math.ceil((y + 1) * scaleY), height);

        for (let byteIdx = 0; byteIdx < bytesPerRow; byteIdx++) {
          let byte = 0;
          for (let bit = 0; bit < 8; bit++) {
            const px = byteIdx * 8 + bit;
            if (px >= printerWidth) continue;

            const srcX0 = Math.floor(px * scaleX);
            const srcX1 = Math.min(Math.ceil((px + 1) * scaleX), width);

            // Scan the source area — if any pixel is dark, mark as black
            let isDark = false;
            for (let sy = srcY0; sy < srcY1 && !isDark; sy++) {
              for (let sx = srcX0; sx < srcX1 && !isDark; sx++) {
                const idx = (sy * width + sx) * 4;
                const r = pixelData[idx] || 0;
                const g = pixelData[idx + 1] || 0;
                const b = pixelData[idx + 2] || 0;
                const a = pixelData[idx + 3] ?? 255;
                const gray = 0.299 * r + 0.587 * g + 0.114 * b;
                if (a > 128 && gray < 128) {
                  isDark = true;
                }
              }
            }

            if (isDark) {
              byte |= (0x80 >> bit);
            }
          }
          cmd.push(byte);
        }
      }
    }

    return cmd;
  },

  // -------------------------------------------------------------------------
  // High-level text printing (ported from PrinterCommand.POS_Print_Text)
  // -------------------------------------------------------------------------

  /**
   * Print text with full formatting options.
   * Mirrors the SDK's POS_Print_Text function.
   *
   * @param text         - Text to print
   * @param codepage     - Code page (0-255). 0=default/Chinese, 28=Windows-1256 Arabic
   * @param widthTimes   - Width multiplier (0-3)
   * @param heightTimes  - Height multiplier (0-3)
   * @param fontType     - Font: 0=Font A, 1=Font B
   */
  printText(
    text: string,
    codepage: number = 0,
    widthTimes: number = 0,
    heightTimes: number = 0,
    fontType: 0 | 1 = 0,
  ): number[] {
    const widthBits  = [0x00, 0x10, 0x20, 0x30];
    const heightBits = [0x00, 0x01, 0x02, 0x03];
    widthTimes  = Math.min(Math.max(widthTimes, 0), 3);
    heightTimes = Math.min(Math.max(heightTimes, 0), 3);

    const sizeCmd = [GS, 0x21, widthBits[widthTimes] + heightBits[heightTimes]];
    const pageCmd = [ESC, 0x74, codepage];
    const fontCmd = [ESC, 0x4d, fontType];

    // Choose encoding based on code page
    let encoding: 'ascii' | 'utf8' | 'windows1256' = 'utf8';
    if (codepage === CODEPAGE_WINDOWS1256 || codepage === CODEPAGE_PC720) {
      encoding = 'windows1256';
    } else if (codepage === 0) {
      encoding = 'utf8'; // Default / Chinese mode
    }

    const textBytes = encodeText(text, encoding);

    if (codepage === 0) {
      // Chinese/Kanji mode
      return concat(sizeCmd, pageCmd, [FS, 0x26], fontCmd, textBytes);
    } else {
      // Single-byte mode
      return concat(sizeCmd, pageCmd, [FS, 0x2e], fontCmd, textBytes);
    }
  },

  /**
   * Print a styled line (bold, font, size all in one).
   * Convenience wrapper around POS_Set_Font from SDK.
   */
  printStyledText(
    text: string,
    boldOn: boolean = false,
    fontType: 0 | 1 = 0,
    widthSize: number = 0,
    heightSize: number = 0,
  ): number[] {
    widthSize  = Math.min(Math.max(widthSize, 0), 4);
    heightSize = Math.min(Math.max(heightSize, 0), 4);
    const widthBits  = [0x00, 0x10, 0x20, 0x30, 0x40];
    const heightBits = [0x00, 0x01, 0x02, 0x03, 0x04];
    const textBytes = encodeText(text, 'utf8');

    return [
      ESC, 0x45, boldOn ? 1 : 0,   // Bold
      ESC, 0x4d, fontType,          // Font
      GS, 0x21, widthBits[widthSize] + heightBits[heightSize], // Size
      ...textBytes,
    ];
  },

  // -------------------------------------------------------------------------
  // Convenience: encode raw text to bytes
  // -------------------------------------------------------------------------

  /** Encode text to byte array */
  encode: encodeText,

  /** Separator line for 58mm printers (32 chars) */
  separator58(char: string = '-'): number[] {
    return encodeText(char.repeat(32) + '\n', 'ascii');
  },

  /** Separator line for 80mm printers (48 chars) */
  separator80(char: string = '-'): number[] {
    return encodeText(char.repeat(48) + '\n', 'ascii');
  },

  // -------------------------------------------------------------------------
  // High-level receipt builder
  // -------------------------------------------------------------------------

  /**
   * Build a complete receipt from structured data.
   * Returns byte array ready to send to printer.
   */
  buildReceipt(options: {
    printerWidth?: 58 | 80;
    storeName?: string;
    invoiceNumber?: string;
    date?: string;
    customerName?: string;
    cashierName?: string;
    items: { name: string; qty: number; price: number; total: number }[];
    subtotal: number;
    discount?: number;
    tax?: number;
    total: number;
    paid: number;
    notes?: string;
    footer?: string;
    qrCode?: string;
  }): number[] {
    const is58mm = (options.printerWidth ?? 58) === 58;
    const lineWidth = is58mm ? 32 : 48;
    const sep = () => encodeText('-'.repeat(lineWidth) + '\n', 'ascii');
    const doubleSep = () => encodeText('='.repeat(lineWidth) + '\n', 'ascii');

    const padLine = (left: string, right: string): string => {
      const space = lineWidth - left.length - right.length;
      if (space <= 0) return left + ' ' + right + '\n';
      return left + ' '.repeat(space) + right + '\n';
    };

    const cmd: number[] = [];

    // Init
    cmd.push(...this.init());

    // Store name
    if (options.storeName) {
      cmd.push(...this.align(ALIGN_CENTER));
      cmd.push(...this.bold(true));
      cmd.push(...this.fontSize(1, 1)); // Double size
      cmd.push(...encodeText(options.storeName + '\n', 'ascii'));
      cmd.push(...this.fontSize(0, 0)); // Normal size
      cmd.push(...this.bold(false));
    }

    cmd.push(...doubleSep());

    // Invoice info
    cmd.push(...this.align(ALIGN_LEFT));
    if (options.invoiceNumber) cmd.push(...encodeText(`# ${options.invoiceNumber}\n`, 'ascii'));
    if (options.date) cmd.push(...encodeText(`${options.date}\n`, 'ascii'));
    if (options.customerName) cmd.push(...encodeText(`Customer: ${options.customerName}\n`, 'ascii'));
    if (options.cashierName) cmd.push(...encodeText(`Cashier: ${options.cashierName}\n`, 'ascii'));

    cmd.push(...sep());

    // Items
    for (const item of options.items) {
      cmd.push(...encodeText(item.name + '\n', 'ascii'));
      const detail = `  ${item.qty} x ${item.price.toFixed(2)}`;
      const totalStr = item.total.toFixed(2);
      cmd.push(...encodeText(padLine(detail, totalStr), 'ascii'));
    }

    cmd.push(...sep());

    // Totals
    cmd.push(...this.align(ALIGN_RIGHT));
    cmd.push(...encodeText(padLine('Subtotal:', options.subtotal.toFixed(2)), 'ascii'));
    if (options.discount && options.discount > 0) {
      cmd.push(...encodeText(padLine('Discount:', `-${options.discount.toFixed(2)}`), 'ascii'));
    }
    if (options.tax && options.tax > 0) {
      cmd.push(...encodeText(padLine('Tax:', options.tax.toFixed(2)), 'ascii'));
    }

    cmd.push(...doubleSep());

    // Grand total
    cmd.push(...this.align(ALIGN_CENTER));
    cmd.push(...this.bold(true));
    cmd.push(...this.fontSize(1, 1));
    cmd.push(...encodeText(`TOTAL: ${options.total.toFixed(2)}\n`, 'ascii'));
    cmd.push(...this.fontSize(0, 0));
    cmd.push(...this.bold(false));

    cmd.push(...sep());

    // Payment
    cmd.push(...this.align(ALIGN_RIGHT));
    cmd.push(...encodeText(padLine('Paid:', options.paid.toFixed(2)), 'ascii'));
    const remaining = options.total - options.paid;
    if (remaining > 0.01) {
      cmd.push(...this.bold(true));
      cmd.push(...encodeText(padLine('Remaining:', remaining.toFixed(2)), 'ascii'));
      cmd.push(...this.bold(false));
    } else {
      cmd.push(...encodeText('FULLY PAID\n', 'ascii'));
    }

    cmd.push(...sep());

    // Notes
    if (options.notes) {
      cmd.push(...this.align(ALIGN_LEFT));
      cmd.push(...encodeText(`Note: ${options.notes}\n`, 'ascii'));
      cmd.push(...sep());
    }

    // QR Code
    if (options.qrCode) {
      cmd.push(...this.align(ALIGN_CENTER));
      cmd.push(...this.qrCode(options.qrCode, 4, 1));
      cmd.push(...this.lineFeed());
    }

    // Footer
    cmd.push(...this.align(ALIGN_CENTER));
    cmd.push(...encodeText(options.footer || 'Thank you!\n', 'ascii'));

    // Feed and cut
    cmd.push(...this.feedLines(5));
    cmd.push(...this.cut());

    return cmd;
  },
};

export default PrinterCommands;
