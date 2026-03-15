import React, { forwardRef } from 'react';
import { View, Text } from 'react-native';
import { PrintableReceiptData } from '../utils/receiptImagePrinter';

/**
 * Hidden receipt view that renders an Arabic-friendly receipt layout.
 * Captured via react-native-view-shot and sent as a raster bitmap to the printer.
 * Width is fixed at 384px to match 58mm thermal printer dot width.
 */
const PRINTER_WIDTH = 384;

interface ReceiptBitmapViewProps {
  data: PrintableReceiptData | null;
}

const ReceiptBitmapView = forwardRef<View, ReceiptBitmapViewProps>(({ data }, ref) => {
  if (!data) {
    return <View ref={ref} collapsable={false} style={{ width: 1, height: 1 }} />;
  }

  const separator = '─'.repeat(24);
  const doubleSeparator = '═'.repeat(24);

  const remaining = data.total - data.paidAmount;

  return (
    <View
      ref={ref}
      collapsable={false}
      style={{
        width: PRINTER_WIDTH,
        backgroundColor: '#FFFFFF',
        padding: 12,
      }}
    >
      {/* Store Name — large, bold, centered */}
      <Text
        style={{
          fontSize: 32,
          fontWeight: '900',
          textAlign: 'center',
          color: '#000',
          marginBottom: 6,
          letterSpacing: 1,
        }}
      >
        {data.storeName || 'Transgate'}
      </Text>

      {/* Receipt Title */}
      <Text
        style={{
          fontSize: 24,
          fontWeight: 'bold',
          textAlign: 'center',
          color: '#000',
          marginBottom: 6,
          writingDirection: 'rtl',
        }}
      >
        إيصال
      </Text>

      {/* Double separator */}
      <Text style={{ fontSize: 14, textAlign: 'center', color: '#000', fontFamily: 'monospace' }}>
        {doubleSeparator}
      </Text>

      {/* Invoice info */}
      {data.invoiceNumber ? (
        <Text style={{ fontSize: 16, color: '#000', textAlign: 'right', writingDirection: 'rtl', marginTop: 6 }}>
          رقم الفاتورة: {data.invoiceNumber}
        </Text>
      ) : null}

      {data.date ? (
        <Text style={{ fontSize: 16, color: '#000', textAlign: 'right', writingDirection: 'rtl', marginTop: 4 }}>
          التاريخ: {data.date}
        </Text>
      ) : null}

      {data.customerName ? (
        <Text style={{ fontSize: 16, color: '#000', textAlign: 'right', writingDirection: 'rtl', marginTop: 4 }}>
          العميل: {data.customerName}
        </Text>
      ) : null}

      {data.cashierName ? (
        <Text style={{ fontSize: 16, color: '#000', textAlign: 'right', writingDirection: 'rtl', marginTop: 4 }}>
          الكاشير: {data.cashierName}
        </Text>
      ) : null}

      {/* Separator */}
      <Text style={{ fontSize: 14, textAlign: 'center', color: '#000', fontFamily: 'monospace', marginTop: 8 }}>
        {separator}
      </Text>

      {/* Column headers */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6, marginBottom: 4 }}>
        <Text style={{ fontSize: 15, fontWeight: 'bold', color: '#000', flex: 1, textAlign: 'left' }}>المجموع</Text>
        <Text style={{ fontSize: 15, fontWeight: 'bold', color: '#000', flex: 1, textAlign: 'center' }}>الكمية × السعر</Text>
        <Text style={{ fontSize: 15, fontWeight: 'bold', color: '#000', flex: 1, textAlign: 'right', writingDirection: 'rtl' }}>الصنف</Text>
      </View>

      {/* Separator */}
      <Text style={{ fontSize: 14, textAlign: 'center', color: '#000', fontFamily: 'monospace' }}>
        {separator}
      </Text>

      {/* Items */}
      {data.items.map((item, index) => (
        <View key={index} style={{ marginTop: 6 }}>
          <Text
            style={{
              fontSize: 16,
              color: '#000',
              textAlign: 'right',
              writingDirection: 'rtl',
              fontWeight: '700',
            }}
          >
            {item.name}
          </Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 }}>
            <Text style={{ fontSize: 15, color: '#000', fontWeight: '600' }}>{item.total.toFixed(2)}</Text>
            <Text style={{ fontSize: 15, color: '#000' }}>
              {item.quantity} × {item.unitPrice.toFixed(2)}
            </Text>
          </View>
        </View>
      ))}

      {/* Separator */}
      <Text style={{ fontSize: 14, textAlign: 'center', color: '#000', fontFamily: 'monospace', marginTop: 8 }}>
        {separator}
      </Text>

      {/* Totals */}
      <View style={{ marginTop: 6 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ fontSize: 16, color: '#000', fontWeight: '600' }}>{data.subtotal.toFixed(2)}</Text>
          <Text style={{ fontSize: 16, color: '#000', writingDirection: 'rtl' }}>المجموع الفرعي</Text>
        </View>

        {data.discount > 0 ? (
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
            <Text style={{ fontSize: 16, color: '#000' }}>-{data.discount.toFixed(2)}</Text>
            <Text style={{ fontSize: 16, color: '#000', writingDirection: 'rtl' }}>الخصم</Text>
          </View>
        ) : null}

        {data.tax > 0 ? (
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
            <Text style={{ fontSize: 16, color: '#000' }}>{data.tax.toFixed(2)}</Text>
            <Text style={{ fontSize: 16, color: '#000', writingDirection: 'rtl' }}>الضريبة</Text>
          </View>
        ) : null}
      </View>

      {/* Double separator */}
      <Text style={{ fontSize: 14, textAlign: 'center', color: '#000', fontFamily: 'monospace', marginTop: 8 }}>
        {doubleSeparator}
      </Text>

      {/* Grand total */}
      <Text
        style={{
          fontSize: 26,
          fontWeight: '900',
          textAlign: 'center',
          color: '#000',
          marginTop: 6,
          writingDirection: 'rtl',
        }}
      >
        الإجمالي: {data.total.toFixed(2)}
      </Text>

      {/* Separator */}
      <Text style={{ fontSize: 14, textAlign: 'center', color: '#000', fontFamily: 'monospace', marginTop: 8 }}>
        {separator}
      </Text>

      {/* Payment info */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
        <Text style={{ fontSize: 16, color: '#000', fontWeight: '600' }}>{data.paidAmount.toFixed(2)}</Text>
        <Text style={{ fontSize: 16, color: '#000', writingDirection: 'rtl' }}>المدفوع</Text>
      </View>

      {remaining > 0.01 ? (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
          <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#000' }}>{remaining.toFixed(2)}</Text>
          <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#000', writingDirection: 'rtl' }}>المتبقي</Text>
        </View>
      ) : (
        <Text
          style={{
            fontSize: 16,
            textAlign: 'center',
            color: '#000',
            marginTop: 4,
            fontWeight: 'bold',
            writingDirection: 'rtl',
          }}
        >
          مدفوع بالكامل
        </Text>
      )}

      {/* Separator */}
      <Text style={{ fontSize: 14, textAlign: 'center', color: '#000', fontFamily: 'monospace', marginTop: 8 }}>
        {separator}
      </Text>

      {/* Footer */}
      <Text
        style={{
          fontSize: 18,
          textAlign: 'center',
          color: '#000',
          marginTop: 10,
          fontWeight: '600',
          writingDirection: 'rtl',
        }}
      >
        شكراً لكم
      </Text>

      {/* Bottom padding for paper feed */}
      <View style={{ height: 40 }} />
    </View>
  );
});

export default ReceiptBitmapView;
