# Printer Library Migration

## Summary
Migrated from `react-native-bluetooth-escpos-printer` to `@poriyaalar/react-native-thermal-receipt-printer`

## Changes Made

### 1. Package Changes
- **Removed**: `react-native-bluetooth-escpos-printer`
- **Added**: `@poriyaalar/react-native-thermal-receipt-printer@^1.3.0`

### 2. Service Updates (`src/services/bluetooth-printer.service.ts`)

#### API Changes:
- **Module Import**: Changed from `BluetoothManager` and `BluetoothEscposPrinter` to `ThermalPrinterModule`
- **Scan Devices**: Now uses `getBluetoothDeviceList()` instead of `scanDevices()`
- **Connect**: Uses `connectPrinter(address)` instead of `connect(address)`
- **Disconnect**: Uses `closeConn()` instead of `disconnect()`
- **Status Check**: Uses `getStatus()` instead of `isConnected()`
- **Print**: Uses `printBill(text)` with formatted text instead of multiple ESC/POS commands

#### Print Format:
The new library uses a simplified text-based format:
- `[C]` - Center align
- `[L]` - Left align
- `[R]` - Right align
- `<font size="big">` - Large text
- `\n` - New line

### 3. Next Steps

To use the printer functionality, you need to:

1. **Rebuild the app** (required for native modules):
   ```bash
   npx expo prebuild --clean
   npx expo run:android
   ```

2. **Test the printer**:
   - Go to Profile → Printer Settings
   - Scan for Bluetooth devices
   - Connect to your thermal printer
   - Use "Test Print" to verify

### 4. Benefits of New Library
- Simpler API with text-based formatting
- Better maintained and more recent updates
- Easier to use for receipt printing
- Supports modern thermal printers

## Files Modified
- `src/services/bluetooth-printer.service.ts` - Complete rewrite to use new API
- `package.json` - Updated dependencies

## Files Using Printer Service
- `src/screens/PrinterSettingsScreen.tsx` - No changes needed (uses service interface)
- `src/screens/POSScreen.tsx` - No changes needed (uses service interface)
