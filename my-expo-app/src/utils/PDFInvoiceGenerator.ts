import * as Print from 'expo-print';
import { shareAsync } from 'expo-sharing';
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system';

export interface PDFInvoiceData {
  invoiceNumber: string;
  customerName?: string;
  customerPhone?: string;
  customerAddress?: string;
  customerBalance?: number;
  items: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
    total: number;
    discountPercent?: number;
  }>;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paidAmount?: number;
  date: string;
  dueDate?: string;
  cashierName?: string;
  storeName?: string;
  storeAddress?: string;
  storePhone?: string;
  storeEmail?: string;
  notes?: string;
  terms?: string;
}

export const generateInvoicePDF = async (data: PDFInvoiceData) => {
  try {
    // 1. Load logos and convert to base64
    let logoBase64 = '';
    let secondLogoBase64 = '';
    
    try {
      const asset = Asset.fromModule(require('../../assets/logo.png'));
      await asset.downloadAsync();
      if (asset.localUri) {
        logoBase64 = await FileSystem.readAsStringAsync(asset.localUri, {
          encoding: FileSystem.EncodingType.Base64,
        });
      }
    } catch (err) {
      console.warn('Could not load main logo for PDF:', err);
    }

    try {
      const asset2 = Asset.fromModule(require('../../assets/ghourani-logo.png'));
      await asset2.downloadAsync();
      if (asset2.localUri) {
        secondLogoBase64 = await FileSystem.readAsStringAsync(asset2.localUri, {
          encoding: FileSystem.EncodingType.Base64,
        });
      }
    } catch (err) {
      console.warn('Could not load secondary logo for PDF:', err);
    }

    const logoHtml = `
      <div style="display: flex; align-items: center; gap: 20px;">
        ${logoBase64 ? `<img src="data:image/png;base64,${logoBase64}" style="max-height: 80px; max-width: 150px; object-fit: contain;" />` : `<h1 style="margin: 0; color: #2563eb; font-size: 28px;">${data.storeName || 'DIYAA STOCK'}</h1>`}
        ${secondLogoBase64 ? `<img src="data:image/png;base64,${secondLogoBase64}" style="max-height: 80px; max-width: 150px; object-fit: contain;" />` : ''}
      </div>
    `;

    // 2. Build items HTML
    const itemsHtml = data.items.map((item, index) => {
      const itemSubtotal = item.quantity * item.unitPrice;
      const itemDiscount = itemSubtotal - item.total;
      
      return `
        <tr class="item-row">
          <td style="padding: 12px 8px; border-bottom: 1px solid #eee; text-align: center; color: #666; width: 40px;">${index + 1}</td>
          <td style="padding: 12px 8px; border-bottom: 1px solid #eee; text-align: left;">
            <div style="font-weight: 600; color: #111;">${item.name}</div>
          </td>
          <td style="padding: 12px 8px; border-bottom: 1px solid #eee; text-align: right;">${item.quantity}</td>
          <td style="padding: 12px 8px; border-bottom: 1px solid #eee; text-align: right;">$${item.unitPrice.toFixed(2)}</td>
          <td style="padding: 12px 8px; border-bottom: 1px solid #eee; text-align: right; color: #ef4444;">${item.discountPercent && item.discountPercent > 0 ? `${item.discountPercent}%` : '-'}</td>
          <td style="padding: 12px 8px; border-bottom: 1px solid #eee; text-align: right; font-weight: 700;">$${item.total.toFixed(2)}</td>
        </tr>
      `;
    }).join('');

    // 3. Zoho Books Style HTML Template
    const htmlContent = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Invoice ${data.invoiceNumber}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
          
          body {
            font-family: 'Inter', 'Helvetica', 'Arial', sans-serif;
            color: #374151;
            margin: 0;
            padding: 30px;
            line-height: 1.5;
            background-color: white;
          }
          
          .container {
            max-width: 800px;
            margin: 0 auto;
          }
          
          .header {
            display: flex;
            justify-content: space-between;
            margin-bottom: 50px;
          }
          
          .company-info h1 {
            margin: 0;
            color: #2563eb;
            font-weight: 800;
            letter-spacing: -0.025em;
          }
          
          .invoice-title {
            text-align: right;
          }
          
          .invoice-title h2 {
            margin: 0;
            font-size: 36px;
            font-weight: 800;
            color: #111827;
            text-transform: uppercase;
            letter-spacing: 0.05em;
          }
          
          .invoice-meta {
            margin-top: 10px;
            font-size: 14px;
            color: #6b7280;
          }
          
          .billing-details {
            display: flex;
            justify-content: space-between;
            margin-bottom: 40px;
          }
          
          .bill-to, .bill-from {
            flex: 1;
          }
          
          .section-label {
            font-size: 11px;
            text-transform: uppercase;
            font-weight: 700;
            color: #9ca3af;
            margin-bottom: 8px;
            letter-spacing: 0.1em;
          }
          
          .entity-name {
            font-size: 16px;
            font-weight: 700;
            color: #111827;
            margin-bottom: 4px;
          }
          
          .entity-details {
            font-size: 13px;
            color: #4b5563;
            max-width: 250px;
          }
          
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
          }
          
          th {
            background-color: #1f2937;
            color: white;
            padding: 10px 8px;
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.05em;
          }
          
          .item-row:nth-child(even) {
            background-color: #f9fafb;
          }
          
          .summary-section {
            display: flex;
            justify-content: space-between;
            margin-top: 20px;
          }
          
          .notes-box {
            flex: 1;
            margin-right: 50px;
          }
          
          .totals-box {
            width: 280px;
          }
          
          .summary-row {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            font-size: 14px;
          }
          
          .summary-row.total {
            border-top: 2px solid #e5e7eb;
            margin-top: 10px;
            padding-top: 15px;
            font-size: 20px;
            font-weight: 800;
            color: #2563eb;
          }
          
          .summary-row.paid {
            color: #059669;
            font-weight: 600;
          }
          
          .summary-row.balance {
            background-color: #fef2f2;
            padding: 10px;
            border-radius: 8px;
            margin-top: 10px;
            color: #dc2626;
            font-weight: 700;
          }
          
          .footer {
            margin-top: 80px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            text-align: center;
            font-size: 12px;
            color: #9ca3af;
          }
          
          .ribbon {
            position: absolute;
            top: 20px;
            left: -10px;
            background-color: #2563eb;
            color: white;
            padding: 5px 20px;
            font-size: 12px;
            font-weight: 800;
            transform: rotate(-45deg);
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          
          @media print {
            body { padding: 0; }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="company-info" style="flex: 1;">
              ${logoHtml}
              <div class="entity-details" style="margin-top: 15px;">
                <strong>${data.storeName || 'DIYAA STOCK'}</strong><br>
                ${data.storeAddress || 'Main Warehouse, Bekaa, Lebanon'}<br>
                Tel: ${data.storePhone || '+961 00 000 000'}<br>
                ${data.storeEmail ? `Email: ${data.storeEmail}` : ''}
              </div>
            </div>
            <div class="invoice-title">
              <h2>INVOICE</h2>
              <div class="invoice-meta">
                <strong>Invoice #</strong> ${data.invoiceNumber}<br>
                <strong>Date:</strong> ${data.date}<br>
                ${data.dueDate ? `<strong>Due Date:</strong> ${data.dueDate}<br>` : ''}
                <strong>Status:</strong> <span style="color: #059669; font-weight: 700;">PAID</span>
              </div>
            </div>
          </div>

          <div class="billing-details">
            <div class="bill-to">
              <div class="section-label">Bill To</div>
              <div class="entity-name">${data.customerName || 'Walk-in Customer'}</div>
              <div class="entity-details">
                ${data.customerAddress || 'No address provided'}<br>
                ${data.customerPhone || ''}
              </div>
            </div>
            <div style="text-align: right;">
               <!-- Optional: Payment details or QR code -->
               <div class="section-label">Project</div>
               <div style="font-weight: 600; color: #111;">General Supply</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 40px; border-top-left-radius: 8px;">#</th>
                <th style="text-align: left;">Item & Description</th>
                <th style="text-align: right; width: 60px;">Qty</th>
                <th style="text-align: right; width: 80px;">Rate</th>
                <th style="text-align: right; width: 80px;">Disc (%)</th>
                <th style="text-align: right; width: 100px; border-top-right-radius: 8px;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <div class="summary-section">
            <div class="notes-box">
              <div class="section-label">Notes</div>
              <div style="font-size: 13px; color: #4b5563;">
                 ${data.notes || 'Thanks for your business. We hope to see you again soon!'}
              </div>
              
              <div class="section-label" style="margin-top: 25px;">Terms & Conditions</div>
              <div style="font-size: 11px; color: #6b7280; font-style: italic;">
                 ${data.terms || '1. Goods once sold will not be taken back.<br>2. Subject to Bekaa Jurisdiction.'}
              </div>
            </div>
            <div class="totals-box">
              <div class="summary-row">
                <span>Sub Total</span>
                <span>$${data.subtotal.toFixed(2)}</span>
              </div>
              
              ${data.discount > 0 ? `
              <div class="summary-row" style="color: #ef4444;">
                <span>Discount</span>
                <span>-$${data.discount.toFixed(2)}</span>
              </div>
              ` : ''}
              
              ${data.tax > 0 ? `
              <div class="summary-row">
                <span>Tax (0%)</span>
                <span>$${data.tax.toFixed(2)}</span>
              </div>
              ` : ''}
              
              <div class="summary-row total">
                <span>Total</span>
                <span>$${data.total.toFixed(2)}</span>
              </div>
              
              ${data.paidAmount !== undefined ? `
              <div class="summary-row paid" style="margin-top: 10px;">
                <span>Payment Made</span>
                <span>(-) $${data.paidAmount.toFixed(2)}</span>
              </div>
              
              <div class="summary-row balance">
                <span>Balance Due</span>
                <span>$${(data.total - data.paidAmount).toFixed(2)}</span>
              </div>
              ` : ''}

              ${data.customerBalance !== undefined ? `
              <div style="margin-top: 20px; padding: 10px; background-color: #fff7ed; border-radius: 8px; border: 1px solid #ffedd5;">
                <div class="section-label" style="color: #9a3412; margin-bottom: 2px;">Outstanding Balance</div>
                <div style="font-size: 16px; font-weight: 800; color: #9a3412;">$${data.customerBalance.toFixed(2)}</div>
              </div>
              ` : ''}
            </div>
          </div>

          <div style="margin-top: 60px; display: flex; justify-content: flex-end;">
             <div style="text-align: center; width: 200px;">
                <div style="border-bottom: 1px solid #111; height: 40px; margin-bottom: 5px;"></div>
                <div style="font-size: 12px; font-weight: 700;">Authorized Signature</div>
             </div>
          </div>

          <div class="footer">
            <p>Generated by <strong>DIYAA STOCK POS</strong> • www.diyaastock.com</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // 4. Generate and Share
    const { uri } = await Print.printToFileAsync({ 
      html: htmlContent,
      base64: false 
    });

    await shareAsync(uri, { 
      UTI: '.pdf', 
      mimeType: 'application/pdf',
      dialogTitle: `Share Invoice ${data.invoiceNumber}`
    });

    return true;
  } catch (error) {
    console.error('PDF Generation Error:', error);
    throw error;
  }
};
