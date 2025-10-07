import * as Print from 'expo-print';
import { shareAsync } from 'expo-sharing';
import { CartItem } from '../types';

interface ReceiptData {
  invoiceNumber: string;
  customerName?: string;
  items: CartItem[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  date: string;
  vanId: number;
  cashierName: string;
}

class ReceiptService {
  generateReceiptHTML(data: ReceiptData): string {
    const itemsHTML = data.items.map(item => `
      <tr>
        <td style="padding: 8px 0; border-bottom: 1px dashed #ddd;">
          ${item.product.name}<br>
          <small style="color: #666;">${item.quantity} x $${item.unit_price.toFixed(2)}</small>
        </td>
        <td style="padding: 8px 0; border-bottom: 1px dashed #ddd; text-align: right;">
          $${item.total.toFixed(2)}
        </td>
      </tr>
    `).join('');

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
          <style>
            body {
              font-family: 'Courier New', monospace;
              margin: 0;
              padding: 20px;
              font-size: 14px;
            }
            .receipt {
              max-width: 300px;
              margin: 0 auto;
            }
            .header {
              text-align: center;
              margin-bottom: 20px;
              border-bottom: 2px solid #000;
              padding-bottom: 10px;
            }
            .company-name {
              font-size: 24px;
              font-weight: bold;
              margin-bottom: 5px;
            }
            .info {
              margin-bottom: 15px;
              font-size: 12px;
            }
            .info-row {
              display: flex;
              justify-content: space-between;
              margin: 5px 0;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin: 15px 0;
            }
            .totals {
              margin-top: 15px;
              border-top: 2px solid #000;
              padding-top: 10px;
            }
            .total-row {
              display: flex;
              justify-content: space-between;
              margin: 8px 0;
              font-size: 14px;
            }
            .grand-total {
              font-size: 18px;
              font-weight: bold;
              border-top: 2px solid #000;
              padding-top: 10px;
              margin-top: 10px;
            }
            .footer {
              text-align: center;
              margin-top: 20px;
              padding-top: 15px;
              border-top: 2px solid #000;
              font-size: 12px;
            }
          </style>
        </head>
        <body>
          <div class="receipt">
            <div class="header">
              <div class="company-name">DIYAA STOCK</div>
              <div>Point of Sale System</div>
            </div>

            <div class="info">
              <div class="info-row">
                <span>Invoice:</span>
                <strong>${data.invoiceNumber}</strong>
              </div>
              <div class="info-row">
                <span>Date:</span>
                <span>${data.date}</span>
              </div>
              <div class="info-row">
                <span>Van:</span>
                <span>${data.vanId}</span>
              </div>
              <div class="info-row">
                <span>Cashier:</span>
                <span>${data.cashierName}</span>
              </div>
              ${data.customerName ? `
              <div class="info-row">
                <span>Customer:</span>
                <span>${data.customerName}</span>
              </div>
              ` : ''}
            </div>

            <table>
              <thead>
                <tr style="border-bottom: 2px solid #000;">
                  <th style="text-align: left; padding: 8px 0;">Item</th>
                  <th style="text-align: right; padding: 8px 0;">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHTML}
              </tbody>
            </table>

            <div class="totals">
              <div class="total-row">
                <span>Subtotal:</span>
                <span>$${data.subtotal.toFixed(2)}</span>
              </div>
              ${data.discount > 0 ? `
              <div class="total-row">
                <span>Discount:</span>
                <span>-$${data.discount.toFixed(2)}</span>
              </div>
              ` : ''}
              ${data.tax > 0 ? `
              <div class="total-row">
                <span>Tax:</span>
                <span>$${data.tax.toFixed(2)}</span>
              </div>
              ` : ''}
              <div class="total-row grand-total">
                <span>TOTAL:</span>
                <span>$${data.total.toFixed(2)}</span>
              </div>
            </div>

            <div class="footer">
              <p>Thank you for your business!</p>
              <p>Please come again</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  async printReceipt(data: ReceiptData): Promise<void> {
    try {
      const html = this.generateReceiptHTML(data);
      
      // Generate PDF
      const { uri } = await Print.printToFileAsync({ html });
      
      // Share/Print the PDF
      await shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
    } catch (error) {
      console.error('Print error:', error);
      throw error;
    }
  }

  async printReceiptDirect(data: ReceiptData): Promise<void> {
    try {
      const html = this.generateReceiptHTML(data);
      
      // Direct print (will show system print dialog)
      await Print.printAsync({ html });
    } catch (error) {
      console.error('Print error:', error);
      throw error;
    }
  }
}

export default new ReceiptService();
