import { forwardRef } from 'react';
import { formatCurrency, formatDateTime } from '@/lib/utils';

interface InvoiceItem {
  product_name: string;
  sku: string;
  quantity: number;
  unit_price: number;
  total: number;
}

interface InvoicePrintProps {
  invoiceNumber?: string;
  invoiceDate: string;
  customerName?: string;
  locationName?: string;
  items: InvoiceItem[];
  subtotal: number;
  paidAmount: number;
  remainingAmount: number;
  paymentMethod: string;
}

export const InvoicePrint = forwardRef<HTMLDivElement, InvoicePrintProps>(
  (
    {
      invoiceNumber,
      invoiceDate,
      customerName,
      locationName,
      items,
      subtotal,
      paidAmount,
      remainingAmount,
      paymentMethod,
    },
    ref
  ) => {
    return (
      <div ref={ref} style={{ display: 'none' }}>
        <style>
          {`
            @media print {
              @page {
                size: 80mm auto;
                margin: 5mm;
              }
              body {
                margin: 0;
                padding: 0;
              }
            }
          `}
        </style>
        
        <div style={{ width: '80mm', fontFamily: 'Cairo, Inter, sans-serif', fontSize: '12px', padding: '5mm', direction: 'ltr' }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '10px', borderBottom: '2px solid #000', paddingBottom: '10px' }}>
            <h1 style={{ margin: '0', fontSize: '18px', fontWeight: 'bold' }}>DIYAA STOCK</h1>
            <p style={{ margin: '5px 0', fontSize: '10px' }}>Stock Management System</p>
            <p style={{ margin: '0', fontSize: '10px' }}>Tel: +123 456 7890</p>
          </div>

          {/* Invoice Info */}
          <div style={{ marginBottom: '10px', fontSize: '11px' }}>
            {invoiceNumber && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                <span style={{ fontWeight: 'bold' }}>Invoice #:</span>
                <span>{invoiceNumber}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
              <span style={{ fontWeight: 'bold' }}>Date:</span>
              <span>{formatDateTime(invoiceDate)}</span>
            </div>
            {customerName && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                <span style={{ fontWeight: 'bold' }}>Customer:</span>
                <span dir="auto">{customerName}</span>
              </div>
            )}
            {locationName && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                <span style={{ fontWeight: 'bold' }}>Location:</span>
                <span>{locationName}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
              <span style={{ fontWeight: 'bold' }}>Payment:</span>
              <span style={{ textTransform: 'capitalize' }}>{paymentMethod}</span>
            </div>
          </div>

          {/* Items */}
          <div style={{ borderTop: '1px dashed #000', borderBottom: '1px dashed #000', padding: '10px 0' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #000' }}>
                  <th style={{ textAlign: 'left', padding: '5px 0' }}>Item</th>
                  <th style={{ textAlign: 'center', padding: '5px 0' }}>Qty</th>
                  <th style={{ textAlign: 'right', padding: '5px 0' }}>Price</th>
                  <th style={{ textAlign: 'right', padding: '5px 0' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => (
                  <tr key={index} style={{ borderBottom: '1px dotted #ccc' }}>
                    <td style={{ padding: '5px 0' }}>
                      <div style={{ fontWeight: 'bold' }} dir="auto">{item.product_name}</div>
                      <div style={{ fontSize: '9px', color: '#666' }}>{item.sku}</div>
                    </td>
                    <td style={{ textAlign: 'center', padding: '5px 0' }}>{item.quantity}</td>
                    <td style={{ textAlign: 'right', padding: '5px 0' }}>{formatCurrency(item.unit_price)}</td>
                    <td style={{ textAlign: 'right', padding: '5px 0', fontWeight: 'bold' }}>
                      {formatCurrency(item.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div style={{ marginTop: '10px', fontSize: '11px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
              <span style={{ fontWeight: 'bold' }}>Subtotal:</span>
              <span style={{ fontWeight: 'bold' }}>{formatCurrency(subtotal)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
              <span style={{ fontWeight: 'bold' }}>Paid:</span>
              <span style={{ color: '#22c55e', fontWeight: 'bold' }}>{formatCurrency(paidAmount)}</span>
            </div>
            {remainingAmount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                <span style={{ fontWeight: 'bold' }}>Remaining:</span>
                <span style={{ color: '#ef4444', fontWeight: 'bold' }}>{formatCurrency(remainingAmount)}</span>
              </div>
            )}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginTop: '10px',
                paddingTop: '10px',
                borderTop: '2px solid #000',
                fontSize: '14px',
              }}
            >
              <span style={{ fontWeight: 'bold' }}>TOTAL:</span>
              <span style={{ fontWeight: 'bold' }}>{formatCurrency(subtotal)}</span>
            </div>
          </div>

          {/* Footer */}
          <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '10px', borderTop: '1px dashed #000', paddingTop: '10px' }}>
            <p style={{ margin: '5px 0' }}>Thank you for your business!</p>
            <p style={{ margin: '5px 0' }}>Please come again</p>
            <p style={{ margin: '10px 0 0 0', fontSize: '9px' }}>Powered by Diyaa Stock System</p>
          </div>
        </div>
      </div>
    );
  }
);

InvoicePrint.displayName = 'InvoicePrint';
