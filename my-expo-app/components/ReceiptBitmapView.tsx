import React, { forwardRef } from 'react';
import { View, Text, Image } from 'react-native';
import { PrintableReceiptData } from '../utils/receiptImagePrinter';

interface Template {
  id: string | number;
  name: string;
  type: string;
  fields: string[];
  layout: {
    header_style: 'centered' | 'left' | 'right';
    show_logo: boolean;
    primary_color: string;
    font_family: string;
    paper_size: 'a4' | 'letter' | 'thermal' | 'thermal_80';
  };
  custom_texts: {
    title?: string;
    footer?: string;
    terms?: string;
  };
  is_default: boolean;
}

interface ReceiptBitmapViewProps {
  data: PrintableReceiptData | null;
  template?: Template | null;
}

const ReceiptBitmapView = forwardRef<View, ReceiptBitmapViewProps>(({ data, template }, ref) => {
  if (!data) {
    return <View ref={ref} collapsable={false} style={{ width: 1, height: 1 }} />;
  }

  // Determine width based on paper size
  const paperSize = template?.layout?.paper_size || 'thermal_80'; // Default to 80mm for bigger look
  const width = paperSize === 'thermal' ? 384 : 576; // 384 for 58mm, 576 for 80mm
  
  const separator = '─'.repeat(paperSize === 'thermal_80' ? 48 : 32);
  const doubleSeparator = '═'.repeat(paperSize === 'thermal_80' ? 48 : 32);

  const remaining = data.total - data.paidAmount;

  const showField = (fieldId: string) => {
    if (!template) return true; // Show all if no template
    return template.fields.includes(fieldId);
  };

  const primaryColor = template?.layout?.primary_color || '#000000';
  const headerStyle = (template?.layout?.header_style === 'centered' ? 'center' : template?.layout?.header_style) || 'center';

  return (
    <View
      ref={ref}
      collapsable={false}
      style={{
        width: width,
        backgroundColor: '#FFFFFF',
        padding: 2, // Even less padding to use full width
        margin: 0,
      }}
    >
      {/* Logo */}
      <View style={{ alignItems: 'center', marginTop: 2, marginBottom: 5 }}>
        <Image 
          source={require('../assets/logo.png')} 
          style={{ width: width * 0.8, height: 120, resizeMode: 'contain' }} 
        />
      </View>
      {/* Store Name */}
      {showField('company_name') && (
        <Text
          style={{
            fontSize: 36,
            fontWeight: '900',
            textAlign: headerStyle,
            color: primaryColor,
            marginBottom: 4,
            marginTop: 4,
          }}
        >
          {data.storeName || 'DaftarStock'}
        </Text>
      )}

      {/* Document Title */}
      <Text
        style={{
          fontSize: 28,
          fontWeight: 'bold',
          textAlign: headerStyle,
          color: '#000',
          marginBottom: 4,
          writingDirection: 'rtl',
        }}
>
        {template?.custom_texts?.title || 'إيصال'}
      </Text>

      {/* Double separator */}
      <Text style={{ fontSize: 16, textAlign: 'center', color: '#000', fontFamily: 'monospace' }}>
        {doubleSeparator}
      </Text>

      {/* Invoice info */}
      {data.invoiceNumber && showField('invoice_number') && (
        <Text style={{ fontSize: 20, color: '#000', textAlign: 'right', writingDirection: 'rtl', marginTop: 4, fontWeight: '600' }}>
          رقم الفاتورة: {data.invoiceNumber}
        </Text>
      )}

      {data.date && showField('invoice_date') && (
        <Text style={{ fontSize: 18, color: '#000', textAlign: 'right', writingDirection: 'rtl', marginTop: 6 }}>
          التاريخ: {data.date}
        </Text>
      )}

      {data.customerName && showField('customer_details') && (
        <Text style={{ fontSize: 18, color: '#000', textAlign: 'right', writingDirection: 'rtl', marginTop: 6, fontWeight: '600' }}>
          العميل: {data.customerName}
        </Text>
      )}

      {data.cashierName && (
        <Text style={{ fontSize: 22, color: '#000', textAlign: 'right', writingDirection: 'rtl', marginTop: 4 }}>
          الكاشير: {data.cashierName}
        </Text>
      )}

      {data.locationName && (
        <Text style={{ fontSize: 20, color: '#444', textAlign: 'right', writingDirection: 'rtl', marginTop: 2 }}>
          الموقع: {data.locationName}
        </Text>
      )}

      {/* Separator */}
      <Text style={{ fontSize: 16, textAlign: 'center', color: '#000', fontFamily: 'monospace', marginTop: 10 }}>
        {separator}
      </Text>

      {/* Items Table */}
      {showField('items_table') && (
        <>
          <View style={{ flexDirection: 'row', borderBottomWidth: 2, borderBottomColor: '#000', paddingVertical: 4 }}>
            <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#000', width: '25%', textAlign: 'left' }}>المجموع</Text>
            <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#000', width: '15%', textAlign: 'center' }}>الكمية</Text>
            <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#000', width: '20%', textAlign: 'center' }}>السعر</Text>
            <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#000', flex: 1, textAlign: 'right', writingDirection: 'rtl' }}>الصنف</Text>
          </View>

          {data.items.map((item, index) => (
            <View key={index} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#DDD' }}>
              <Text style={{ fontSize: 20, color: '#000', width: '25%', textAlign: 'left', fontWeight: 'bold' }}>{item.total.toFixed(2)}</Text>
              <Text style={{ fontSize: 20, color: '#000', width: '15%', textAlign: 'center' }}>{item.quantity}</Text>
              <Text style={{ fontSize: 20, color: '#000', width: '20%', textAlign: 'center' }}>{item.unitPrice.toFixed(2)}</Text>
              <Text style={{ fontSize: 22, color: '#000', flex: 1, textAlign: 'right', writingDirection: 'rtl', fontWeight: '900' }}>{item.name}</Text>
            </View>
          ))}
        </>
      )}

      {/* Separator */}
      <Text style={{ fontSize: 16, textAlign: 'center', color: '#000', fontFamily: 'monospace', marginTop: 10 }}>
        {separator}
      </Text>

      {/* Totals */}
      <View style={{ marginTop: 8 }}>
        {showField('subtotal') && (
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 20, color: '#000', fontWeight: '700' }}>{data.subtotal.toFixed(2)}</Text>
            <Text style={{ fontSize: 20, color: '#000', writingDirection: 'rtl', fontWeight: '600' }}>المجموع الفرعي</Text>
          </View>
        )}

        {data.discount > 0 && showField('discount') && (
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
            <Text style={{ fontSize: 20, color: '#000', fontWeight: '600' }}>-{data.discount.toFixed(2)}</Text>
            <Text style={{ fontSize: 20, color: '#000', writingDirection: 'rtl' }}>الخصم</Text>
          </View>
        )}

        {data.tax > 0 && showField('tax') && (
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
            <Text style={{ fontSize: 20, color: '#000', fontWeight: '600' }}>{data.tax.toFixed(2)}</Text>
            <Text style={{ fontSize: 20, color: '#000', writingDirection: 'rtl' }}>الضريبة</Text>
          </View>
        )}
      </View>

      {/* Double separator */}
      <Text style={{ fontSize: 16, textAlign: 'center', color: '#000', fontFamily: 'monospace', marginTop: 10 }}>
        {doubleSeparator}
      </Text>

      {/* Grand total */}
      {showField('total_amount') && (
        <Text
          style={{
            fontSize: 32,
            fontWeight: '900',
            textAlign: 'center',
            color: primaryColor,
            marginTop: 8,
            writingDirection: 'rtl',
          }}
        >
          الإجمالي: {data.total.toFixed(2)}
        </Text>
      )}

      {/* Separator */}
      <Text style={{ fontSize: 16, textAlign: 'center', color: '#000', fontFamily: 'monospace', marginTop: 10 }}>
        {separator}
      </Text>

      {/* Payment info */}
      {showField('notes') && ( // Reusing notes for generic info or payment
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
          <Text style={{ fontSize: 22, color: '#000', fontWeight: '700' }}>{data.paidAmount.toFixed(2)}</Text>
          <Text style={{ fontSize: 22, color: '#000', writingDirection: 'rtl', fontWeight: '600' }}>المدفوع</Text>
        </View>
      )}

      {remaining > 0.01 ? (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
          <Text style={{ fontSize: 22, fontWeight: '900', color: '#000' }}>{remaining.toFixed(2)}</Text>
          <Text style={{ fontSize: 22, fontWeight: '900', color: '#000', writingDirection: 'rtl' }}>المتبقي</Text>
        </View>
      ) : (
        <Text
          style={{
            fontSize: 22,
            textAlign: 'center',
            color: '#000',
            marginTop: 6,
            fontWeight: 'bold',
            writingDirection: 'rtl',
          }}
        >
          مدفوع بالكامل
        </Text>
      )}

      {/* Separator */}
      <Text style={{ fontSize: 16, textAlign: 'center', color: '#000', fontFamily: 'monospace', marginTop: 10 }}>
        {separator}
      </Text>

      {/* Footer */}
      <Text
        style={{
          fontSize: 24,
          textAlign: 'center',
          color: '#000',
          marginTop: 12,
          fontWeight: '700',
          writingDirection: 'rtl',
        }}
      >
        {template?.custom_texts?.footer || 'شكراً لكم'}
      </Text>

      {template?.custom_texts?.terms ? (
        <Text style={{ fontSize: 14, textAlign: 'center', color: '#666', marginTop: 8 }}>
          {template.custom_texts.terms}
        </Text>
      ) : null}

      {/* Bottom padding for paper feed */}
      <View style={{ height: 40 }} />
    </View>
  );
});

export default ReceiptBitmapView;
