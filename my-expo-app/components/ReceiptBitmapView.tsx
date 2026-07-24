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

  // 576px width — matches 80mm thermal printer (standard POS).
  const W = 576;
  const SEP = '- '.repeat(22) + '-';
  const DSEP = '= '.repeat(22) + '=';

  const remaining = data.total - data.paidAmount;

  const showField = (fieldId: string) => {
    if (!template) return true;
    return template.fields.includes(fieldId);
  };

  return (
    <View
      ref={ref}
      collapsable={false}
      style={{ width: W, backgroundColor: '#FFF', padding: 0, margin: 0 }}
    >
      {/* Dual Logos */}
      <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingTop: 20, paddingBottom: 10 }}>
        <Image
          source={require('../assets/logo.png')}
          style={{ width: 220, height: 100, resizeMode: 'contain', marginRight: 20 }}
        />
        <Image
          source={require('../assets/ghourani-logo.png')}
          style={{ width: 220, height: 100, resizeMode: 'contain' }}
        />
      </View>

      {/* Store Name — skip DaftarStock */}
      {showField('company_name') && data.storeName && data.storeName !== 'DaftarStock' && (
        <Text style={{ fontSize: 36, fontWeight: '900', textAlign: 'center', color: '#000', marginBottom: 2 }}>
          {data.storeName}
        </Text>
      )}

      {/* Document Title */}
      <Text style={{ fontSize: 32, fontWeight: '900', textAlign: 'center', color: '#000', marginBottom: 4, writingDirection: 'rtl' }}>
        {template?.custom_texts?.title || 'إيصال'}
      </Text>

      {/* Single separator */}
      <Text style={{ fontSize: 18, textAlign: 'center', marginVertical: 4 }}>{SEP}</Text>

      {/* Invoice info */}
      {data.invoiceNumber && showField('invoice_number') && (
        <Text style={{ fontSize: 24, color: '#000', textAlign: 'right', writingDirection: 'rtl', marginTop: 4, fontWeight: '700' }}>
          رقم الفاتورة: {data.invoiceNumber}
        </Text>
      )}
      {data.date && showField('invoice_date') && (
        <Text style={{ fontSize: 22, color: '#000', textAlign: 'right', writingDirection: 'rtl', marginTop: 3 }}>
          التاريخ: {data.date}
        </Text>
      )}
      {data.customerName && showField('customer_details') && (
        <Text style={{ fontSize: 24, color: '#000', textAlign: 'right', writingDirection: 'rtl', marginTop: 3, fontWeight: '800' }}>
          الزبون: {data.customerName}
        </Text>
      )}
      {data.cashierName && (
        <Text style={{ fontSize: 22, color: '#000', textAlign: 'right', writingDirection: 'rtl', marginTop: 2 }}>
          الكاشير: {data.cashierName}
        </Text>
      )}
      {data.locationName && (
        <Text style={{ fontSize: 22, color: '#000', textAlign: 'right', writingDirection: 'rtl', marginTop: 2 }}>
          الموقع: {data.locationName}
        </Text>
      )}

      {/* ━━━ Separator ━━━ */}
      <Text style={{ fontSize: 14, textAlign: 'center', color: '#000', marginTop: 8, letterSpacing: 1 }}>{SEP}</Text>

      {/* Items Table */}
      {showField('items_table') && (
        <>
          {/* Table header */}
          <View style={{ flexDirection: 'row', borderBottomWidth: 3, borderBottomColor: '#000', paddingVertical: 5 }}>
            <Text style={{ fontSize: 20, fontWeight: '900', color: '#000', width: '25%', textAlign: 'left' }}>المجموع</Text>
            <Text style={{ fontSize: 20, fontWeight: '900', color: '#000', width: '15%', textAlign: 'center' }}>الكمية</Text>
            <Text style={{ fontSize: 20, fontWeight: '900', color: '#000', width: '22%', textAlign: 'center' }}>السعر</Text>
            <Text style={{ fontSize: 20, fontWeight: '900', color: '#000', flex: 1, textAlign: 'right', writingDirection: 'rtl' }}>الصنف</Text>
          </View>

          {/* Table rows */}
          {data.items.map((item, index) => (
            <View key={index} style={{ borderBottomWidth: 1, borderBottomColor: '#999', paddingVertical: 6 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ fontSize: 20, color: '#000', width: '25%', textAlign: 'left', fontWeight: '800' }}>{item.total.toFixed(2)}</Text>
                <Text style={{ fontSize: 20, color: '#000', width: '15%', textAlign: 'center', fontWeight: '700' }}>{item.quantity}</Text>
                <Text style={{ fontSize: 20, color: '#000', width: '22%', textAlign: 'center' }}>{item.unitPrice.toFixed(2)}</Text>
                <View style={{ flex: 1, alignItems: 'flex-end' }}>
                  <Text style={{ fontSize: 20, color: '#000', textAlign: 'right', writingDirection: 'rtl', fontWeight: '900' }} numberOfLines={2}>
                    {item.name}
                  </Text>
                  {item.discountPercent && item.discountPercent > 0 ? (
                    <Text style={{ fontSize: 16, color: '#ef4444', textAlign: 'right', writingDirection: 'rtl', marginTop: 2 }}>
                      حسم {item.discountPercent}%
                    </Text>
                  ) : null}
                </View>
              </View>
            </View>
          ))}
        </>
      )}

      {/* ━━━ Separator ━━━ */}
      <Text style={{ fontSize: 14, textAlign: 'center', color: '#000', marginTop: 8, letterSpacing: 1 }}>{SEP}</Text>

      {/* Totals */}
      <View style={{ marginTop: 6 }}>
        {showField('subtotal') && (
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 }}>
            <Text style={{ fontSize: 26, color: '#000', fontWeight: '800' }}>{data.subtotal.toFixed(2)}</Text>
            <Text style={{ fontSize: 26, color: '#000', writingDirection: 'rtl', fontWeight: '700' }}>المجموع الفرعي</Text>
          </View>
        )}
        {data.discount > 0 && showField('discount') && (
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
            <Text style={{ fontSize: 26, color: '#000', fontWeight: '700' }}>-{data.discount.toFixed(2)}</Text>
            <Text style={{ fontSize: 26, color: '#000', writingDirection: 'rtl' }}>الحسم</Text>
          </View>
        )}
        {data.tax > 0 && showField('tax') && (
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
            <Text style={{ fontSize: 26, color: '#000', fontWeight: '700' }}>{data.tax.toFixed(2)}</Text>
            <Text style={{ fontSize: 26, color: '#000', writingDirection: 'rtl' }}>الضريبة</Text>
          </View>
        )}
      </View>

      <Text style={{ fontSize: 18, textAlign: 'center', color: '#000', marginVertical: 4 }}>{SEP}</Text>

      {/* Grand Total — BIG */}
      {showField('total_amount') && (
        <Text style={{ fontSize: 38, fontWeight: '900', textAlign: 'center', color: '#000', marginTop: 6, writingDirection: 'rtl' }}>
          الإجمالي: {data.total.toFixed(2)}
        </Text>
      )}

      {/* ━━━ Separator ━━━ */}
      <Text style={{ fontSize: 18, textAlign: 'center', color: '#000', marginVertical: 4 }}>{SEP}</Text>

      {/* Payment info */}
      {showField('notes') && (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
          <Text style={{ fontSize: 28, color: '#000', fontWeight: '800' }}>{data.paidAmount.toFixed(2)}</Text>
          <Text style={{ fontSize: 28, color: '#000', writingDirection: 'rtl', fontWeight: '700' }}>المدفوع</Text>
        </View>
      )}

      {remaining > 0.01 ? (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
          <Text style={{ fontSize: 30, fontWeight: '900', color: '#000' }}>{remaining.toFixed(2)}</Text>
          <Text style={{ fontSize: 30, fontWeight: '900', color: '#000', writingDirection: 'rtl' }}>المتبقي</Text>
        </View>
      ) : (
        <Text style={{ fontSize: 28, textAlign: 'center', color: '#000', marginTop: 4, fontWeight: '900', writingDirection: 'rtl' }}>
          مدفوع بالكامل
        </Text>
      )}

      {/* ━━━ Separator ━━━ */}
      <Text style={{ fontSize: 18, textAlign: 'center', color: '#000', marginVertical: 4 }}>{SEP}</Text>

      {/* Customer Balance Summary */}
      {data.customerName && (data.customerBalance !== undefined && data.customerBalance !== null) && (
        <>
          <Text style={{ fontSize: 26, fontWeight: '900', textAlign: 'center', color: '#000', marginTop: 6, writingDirection: 'rtl' }}>
            كشف حساب الزبون
          </Text>
          <View style={{ marginTop: 4 }}>
            {data.customerTotalOwed !== undefined && (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 3 }}>
                <Text style={{ fontSize: 24, color: '#000', fontWeight: '800' }}>{data.customerTotalOwed.toFixed(2)}</Text>
                <Text style={{ fontSize: 24, color: '#000', writingDirection: 'rtl', fontWeight: '700' }}>إجمالي المبيعات</Text>
              </View>
            )}
            {data.customerTotalPaid !== undefined && (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 3 }}>
                <Text style={{ fontSize: 24, color: '#000', fontWeight: '800' }}>{data.customerTotalPaid.toFixed(2)}</Text>
                <Text style={{ fontSize: 24, color: '#000', writingDirection: 'rtl', fontWeight: '700' }}>إجمالي المدفوعات</Text>
              </View>
            )}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 5 }}>
              <Text style={{ fontSize: 28, color: '#000', fontWeight: '900' }}>{data.customerBalance.toFixed(2)}</Text>
              <Text style={{ fontSize: 28, color: '#000', writingDirection: 'rtl', fontWeight: '900' }}>الرصيد المتبقي</Text>
            </View>
          </View>

          <Text style={{ fontSize: 18, textAlign: 'center', color: '#000', marginVertical: 4 }}>{SEP}</Text>
        </>
      )}

      {/* Footer */}
      <Text style={{ fontSize: 28, textAlign: 'center', color: '#000', marginTop: 10, fontWeight: '800', writingDirection: 'rtl' }}>
        {template?.custom_texts?.footer || 'شكراً لكم'}
      </Text>

      {template?.custom_texts?.terms ? (
        <Text style={{ fontSize: 18, textAlign: 'center', color: '#666', marginTop: 6 }}>
          {template.custom_texts.terms}
        </Text>
      ) : null}

      {/* Bottom padding for paper feed */}
      <View style={{ height: 30 }} />
    </View>
  );
});

export default ReceiptBitmapView;
