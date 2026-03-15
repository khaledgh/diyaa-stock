/**
 * PNG decoder using pako for zlib decompression.
 * Decodes base64 PNG to raw RGBA pixel data for thermal printer bitmap conversion.
 */
import { inflate } from 'pako';

function paethPredictor(a: number, b: number, c: number): number {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

// Robust base64 decoder that works reliably on Hermes
const B64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const B64_LOOKUP = new Uint8Array(256);
for (let i = 0; i < B64_CHARS.length; i++) {
  B64_LOOKUP[B64_CHARS.charCodeAt(i)] = i;
}

function base64ToBytes(b64: string): Uint8Array {
  // Strip any data URI prefix
  const cleanB64 = b64.replace(/^data:[^;]+;base64,/, '');
  // Remove whitespace
  const str = cleanB64.replace(/[\s\r\n]/g, '');
  const padding = str.endsWith('==') ? 2 : str.endsWith('=') ? 1 : 0;
  const byteLen = (str.length * 3) / 4 - padding;
  const bytes = new Uint8Array(byteLen);

  let p = 0;
  for (let i = 0; i < str.length; i += 4) {
    const a = B64_LOOKUP[str.charCodeAt(i)];
    const b = B64_LOOKUP[str.charCodeAt(i + 1)];
    const c = B64_LOOKUP[str.charCodeAt(i + 2)];
    const d = B64_LOOKUP[str.charCodeAt(i + 3)];

    const triplet = (a << 18) | (b << 12) | (c << 6) | d;
    if (p < byteLen) bytes[p++] = (triplet >> 16) & 0xff;
    if (p < byteLen) bytes[p++] = (triplet >> 8) & 0xff;
    if (p < byteLen) bytes[p++] = triplet & 0xff;
  }
  return bytes;
}

/**
 * Decode a base64 PNG string to RGBA pixel data.
 */
export function decodePNG(base64Data: string): { width: number; height: number; pixels: Uint8Array } | null {
  try {
    console.log(`🔧 decodePNG: input length = ${base64Data.length} chars`);
    const bytes = base64ToBytes(base64Data);
    console.log(`🔧 decodePNG: decoded ${bytes.length} bytes, first 8: [${bytes.slice(0, 8).join(', ')}]`);

    // Verify PNG signature: 137 80 78 71 13 10 26 10
    if (bytes[0] !== 137 || bytes[1] !== 80 || bytes[2] !== 78 || bytes[3] !== 71) {
      console.error('Invalid PNG signature:', bytes.slice(0, 8));
      return null;
    }

    let width = 0, height = 0, bitDepth = 0, colorType = 0;
    let palette: Uint8Array = new Uint8Array(0);
    const idatChunks: Uint8Array[] = [];

    let offset = 8;
    while (offset < bytes.length) {
      const len = (bytes[offset] << 24) | (bytes[offset + 1] << 16) | (bytes[offset + 2] << 8) | bytes[offset + 3];
      const type = String.fromCharCode(bytes[offset + 4], bytes[offset + 5], bytes[offset + 6], bytes[offset + 7]);
      const data = bytes.slice(offset + 8, offset + 8 + len);

      if (type === 'IHDR') {
        width = (data[0] << 24) | (data[1] << 16) | (data[2] << 8) | data[3];
        height = (data[4] << 24) | (data[5] << 16) | (data[6] << 8) | data[7];
        bitDepth = data[8];
        colorType = data[9];
      } else if (type === 'PLTE') {
        palette = data;
      } else if (type === 'IDAT') {
        idatChunks.push(data);
      } else if (type === 'IEND') {
        break;
      }

      offset += 12 + len;
    }

    if (width === 0 || height === 0) {
      console.error('🔧 decodePNG: IHDR not found or zero dimensions');
      return null;
    }

    console.log(`🔧 decodePNG: IHDR ${width}x${height}, bitDepth=${bitDepth}, colorType=${colorType}, IDAT chunks=${idatChunks.length}, palette entries=${palette.length / 3}`);

    // Concatenate IDAT chunks
    const totalLen = idatChunks.reduce((s, c) => s + c.length, 0);
    const compressed = new Uint8Array(totalLen);
    let pos = 0;
    for (const chunk of idatChunks) {
      compressed.set(chunk, pos);
      pos += chunk.length;
    }

    // Decompress with pako
    const raw = inflate(compressed);
    console.log(`🔧 decodePNG: decompressed ${raw.length} bytes`);

    // Bytes per pixel in the scanline
    let bpp = 4;
    if (colorType === 0) bpp = bitDepth <= 8 ? 1 : 2;       // Grayscale
    else if (colorType === 2) bpp = 3;                         // RGB
    else if (colorType === 3) bpp = 1;                         // Palette-indexed
    else if (colorType === 4) bpp = 2;                         // Grayscale+Alpha
    else if (colorType === 6) bpp = 4;                         // RGBA

    const stride = width * bpp;
    const pixels = new Uint8Array(width * height * 4);
    const prevRow = new Uint8Array(stride);

    for (let y = 0; y < height; y++) {
      const rowStart = y * (stride + 1);
      const filterType = raw[rowStart];
      const scanline = new Uint8Array(stride);

      for (let x = 0; x < stride; x++) {
        const val = raw[rowStart + 1 + x];
        const a = x >= bpp ? scanline[x - bpp] : 0;
        const b = prevRow[x];
        const c = x >= bpp ? prevRow[x - bpp] : 0;

        switch (filterType) {
          case 0: scanline[x] = val; break;
          case 1: scanline[x] = (val + a) & 0xff; break;
          case 2: scanline[x] = (val + b) & 0xff; break;
          case 3: scanline[x] = (val + Math.floor((a + b) / 2)) & 0xff; break;
          case 4: scanline[x] = (val + paethPredictor(a, b, c)) & 0xff; break;
          default: scanline[x] = val;
        }
      }

      for (let x = 0; x < width; x++) {
        const pi = (y * width + x) * 4;
        if (colorType === 6) {
          // RGBA
          pixels[pi] = scanline[x * 4];
          pixels[pi + 1] = scanline[x * 4 + 1];
          pixels[pi + 2] = scanline[x * 4 + 2];
          pixels[pi + 3] = scanline[x * 4 + 3];
        } else if (colorType === 2) {
          // RGB
          pixels[pi] = scanline[x * 3];
          pixels[pi + 1] = scanline[x * 3 + 1];
          pixels[pi + 2] = scanline[x * 3 + 2];
          pixels[pi + 3] = 255;
        } else if (colorType === 3) {
          // Palette-indexed
          const idx = scanline[x] * 3;
          pixels[pi] = palette[idx] ?? 0;
          pixels[pi + 1] = palette[idx + 1] ?? 0;
          pixels[pi + 2] = palette[idx + 2] ?? 0;
          pixels[pi + 3] = 255;
        } else if (colorType === 0) {
          // Grayscale
          const v = scanline[x];
          pixels[pi] = v; pixels[pi + 1] = v; pixels[pi + 2] = v; pixels[pi + 3] = 255;
        } else if (colorType === 4) {
          // Grayscale+Alpha
          const v = scanline[x * 2];
          pixels[pi] = v; pixels[pi + 1] = v; pixels[pi + 2] = v;
          pixels[pi + 3] = scanline[x * 2 + 1];
        }
      }

      prevRow.set(scanline);
    }

    // Diagnostic: count dark pixels
    let darkCount = 0;
    for (let i = 0; i < pixels.length; i += 4) {
      const gray = 0.299 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2];
      if (pixels[i + 3] > 128 && gray < 128) darkCount++;
    }
    console.log(`📷 PNG decoded: ${width}x${height}, colorType=${colorType}, bitDepth=${bitDepth}, darkPixels=${darkCount}`);
    return { width, height, pixels };
  } catch (error) {
    console.error('PNG decode error:', error);
    return null;
  }
}
