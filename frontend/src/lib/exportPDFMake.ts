// PDF Export using pdfmake with RTL support for Arabic
import pdfMake from 'pdfmake/build/pdfmake';

// Font loading flag
let fontsLoaded = false;

// Load fonts dynamically for browser with Arabic support
async function ensureFontsLoaded() {
  if (fontsLoaded) return;
  try {
    // First try to load pdfmake's built-in fonts
    const pdfFonts = await import('pdfmake/build/vfs_fonts');
    // @ts-ignore - Handle different module formats
    const vfs = pdfFonts.default?.pdfMake?.vfs || pdfFonts.pdfMake?.vfs || pdfFonts.default?.vfs || pdfFonts.vfs;
    if (vfs) {
      pdfMake.vfs = vfs;
    } else {
      pdfMake.vfs = {};
    }
    
    // Load Amiri font for Arabic support
    try {
      const amiriResponse = await fetch('/fonts/Amiri-Regular.ttf');
      if (amiriResponse.ok) {
        const amiriBuffer = await amiriResponse.arrayBuffer();
        const amiriBase64 = arrayBufferToBase64(amiriBuffer);
        pdfMake.vfs['Amiri-Regular.ttf'] = amiriBase64;
        
        // Define Amiri font
        pdfMake.fonts = {
          Roboto: {
            normal: 'Roboto-Regular.ttf',
            bold: 'Roboto-Medium.ttf',
            italics: 'Roboto-Italic.ttf',
            bolditalics: 'Roboto-MediumItalic.ttf'
          },
          Amiri: {
            normal: 'Amiri-Regular.ttf',
            bold: 'Amiri-Regular.ttf',
            italics: 'Amiri-Regular.ttf',
            bolditalics: 'Amiri-Regular.ttf'
          }
        };
      }
    } catch (fontError) {
      console.warn('Could not load Amiri font:', fontError);
    }
    
    fontsLoaded = true;
  } catch (error) {
    console.error('Failed to load PDF fonts:', error);
  }
}

// Convert ArrayBuffer to Base64
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Get company settings from localStorage
function getCompanySettings() {
  const savedSettings = localStorage.getItem('company_settings');
  const defaults = {
    company_name: 'Company Name',
    company_address: '',
    company_phone: '',
    company_email: '',
    company_tax_id: '',
  };

  if (savedSettings) {
    try {
      return { ...defaults, ...JSON.parse(savedSettings) };
    } catch {
      return defaults;
    }
  }
  return defaults;
}

// Format number as currency
function formatNumber(value: number | undefined): string {
  if (value === undefined || value === null) return '0.00';
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

// Check if text contains Arabic
function containsArabic(text: string): boolean {
  if (!text) return false;
  const arabicPattern = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
  return arabicPattern.test(text);
}

// Fix Arabic text for RTL display in pdfmake (which renders LTR)
function fixArabicText(text: string): string {
  if (!text || !containsArabic(text)) return text;
  
  // Reverse the entire string for RTL display
  // This makes "ابو سعود ماركت" display correctly when pdfmake renders it LTR
  return text.split('').reverse().join('');
}

// Export Customer Statement to PDF using pdfmake
export async function exportCustomerStatementPDFMake(
  transactions: any[],
  customerInfo: { name: string; phone?: string; email?: string },
  fromDate: string,
  toDate: string,
  openingBalance: number,
  closingBalance: number
) {
  await ensureFontsLoaded();
  
  const company = getCompanySettings();
  const isArabicName = containsArabic(customerInfo.name);

  // Build table body
  const tableBody: any[][] = [
    // Header row
    [
      { text: 'Date', style: 'tableHeader' },
      { text: 'Type', style: 'tableHeader' },
      { text: 'Reference', style: 'tableHeader' },
      { text: 'Description', style: 'tableHeader' },
      { text: 'Debit', style: 'tableHeader', alignment: 'right' },
      { text: 'Credit', style: 'tableHeader', alignment: 'right' },
      { text: 'Balance', style: 'tableHeader', alignment: 'right' },
    ]
  ];

  // Data rows
  transactions.forEach(tx => {
    tableBody.push([
      new Date(tx.date).toLocaleDateString(),
      tx.type,
      tx.reference || '',
      tx.description || '',
      { text: tx.debit > 0 ? formatNumber(tx.debit) : '', alignment: 'right' },
      { text: tx.credit > 0 ? formatNumber(tx.credit) : '', alignment: 'right' },
      { text: formatNumber(tx.running_balance), alignment: 'right' },
    ]);
  });

  const docDefinition: any = {
    pageSize: 'A4',
    pageMargins: [40, 60, 40, 60],
    
    content: [
      // Company Header
      { 
        text: company.company_name, 
        style: 'header',
        alignment: 'center'
      },
      { 
        text: 'Customer Statement', 
        style: 'subheader',
        alignment: 'center',
        margin: [0, 10, 0, 20]
      },
      
      // Customer Info - use Amiri font for Arabic names
      {
        columns: [
          {
            width: '*',
            stack: [
              { 
                text: [
                  { text: 'Customer: ', bold: true },
                  { text: fixArabicText(customerInfo.name), font: isArabicName ? 'Amiri' : 'Roboto' }
                ]
              },
              { 
                text: [
                  { text: 'Period: ', bold: true },
                  `${fromDate} to ${toDate}`
                ]
              },
            ]
          }
        ]
      },
      
      // Opening Balance
      { 
        text: `Opening Balance: ${formatNumber(openingBalance)}`,
        margin: [0, 10, 0, 10],
        bold: true
      },
      
      // Transactions Table
      {
        table: {
          headerRows: 1,
          widths: ['auto', 'auto', 'auto', '*', 'auto', 'auto', 'auto'],
          body: tableBody
        },
        layout: {
          fillColor: function (rowIndex: number) {
            return rowIndex === 0 ? '#3B82F6' : (rowIndex % 2 === 0 ? '#F8FAFC' : null);
          },
          hLineColor: function () { return '#E2E8F0'; },
          vLineColor: function () { return '#E2E8F0'; },
        }
      },
      
      // Closing Balance
      { 
        text: `Closing Balance: ${formatNumber(closingBalance)}`,
        alignment: 'right',
        margin: [0, 20, 0, 0],
        bold: true,
        fontSize: 14
      },
    ],
    
    styles: {
      header: {
        fontSize: 18,
        bold: true,
      },
      subheader: {
        fontSize: 14,
        bold: true,
      },
      tableHeader: {
        bold: true,
        color: 'white',
        fillColor: '#3B82F6',
      }
    },
    
    defaultStyle: {
      fontSize: 10,
    }
  };

  // Generate and download PDF
  const safeName = customerInfo.name.replace(/[^a-zA-Z0-9\u0600-\u06FF]/g, '_');
  pdfMake.createPdf(docDefinition).download(`Statement_${safeName}_${fromDate}_to_${toDate}.pdf`);
}

// Export Vendor Statement to PDF using pdfmake
export async function exportVendorStatementPDFMake(
  transactions: any[],
  vendorInfo: { name: string; phone?: string; email?: string; address?: string },
  fromDate: string,
  toDate: string,
  openingBalance: number,
  closingBalance: number
) {
  await ensureFontsLoaded();
  
  const company = getCompanySettings();
  const isArabicName = containsArabic(vendorInfo.name);

  // Build table body
  const tableBody: any[][] = [
    // Header row
    [
      { text: 'Date', style: 'tableHeader' },
      { text: 'Type', style: 'tableHeader' },
      { text: 'Reference', style: 'tableHeader' },
      { text: 'Description', style: 'tableHeader' },
      { text: 'Debit', style: 'tableHeader', alignment: 'right' },
      { text: 'Credit', style: 'tableHeader', alignment: 'right' },
      { text: 'Balance', style: 'tableHeader', alignment: 'right' },
    ]
  ];

  // Data rows
  transactions.forEach(tx => {
    const typeLabel = tx.type === 'invoice' ? 'Bill' : tx.type === 'credit_note' ? 'Credit Note' : 'Payment';
    tableBody.push([
      new Date(tx.date).toLocaleDateString(),
      typeLabel,
      tx.reference || '',
      tx.description || '',
      { text: tx.debit > 0 ? formatNumber(tx.debit) : '', alignment: 'right' },
      { text: tx.credit > 0 ? formatNumber(tx.credit) : '', alignment: 'right' },
      { text: formatNumber(tx.running_balance), alignment: 'right' },
    ]);
  });

  const docDefinition: any = {
    pageSize: 'A4',
    pageMargins: [40, 60, 40, 60],
    
    content: [
      // Company Header
      { 
        text: company.company_name, 
        style: 'header',
        alignment: 'center'
      },
      { 
        text: 'Vendor Statement', 
        style: 'subheader',
        alignment: 'center',
        margin: [0, 10, 0, 20]
      },
      
      // Vendor Info - use Amiri font for Arabic names
      {
        columns: [
          {
            width: '*',
            stack: [
              { 
                text: [
                  { text: 'Vendor: ', bold: true },
                  { text: fixArabicText(vendorInfo.name), font: isArabicName ? 'Amiri' : 'Roboto' }
                ]
              },
              { 
                text: [
                  { text: 'Period: ', bold: true },
                  `${fromDate} to ${toDate}`
                ]
              },
            ]
          }
        ]
      },
      
      // Opening Balance
      { 
        text: `Opening Balance: ${formatNumber(openingBalance)}`,
        margin: [0, 10, 0, 10],
        bold: true
      },
      
      // Transactions Table
      {
        table: {
          headerRows: 1,
          widths: ['auto', 'auto', 'auto', '*', 'auto', 'auto', 'auto'],
          body: tableBody
        },
        layout: {
          fillColor: function (rowIndex: number) {
            return rowIndex === 0 ? '#DC2626' : (rowIndex % 2 === 0 ? '#F8FAFC' : null);
          },
          hLineColor: function () { return '#E2E8F0'; },
          vLineColor: function () { return '#E2E8F0'; },
        }
      },
      
      // Closing Balance
      { 
        text: `Closing Balance: ${formatNumber(closingBalance)}`,
        alignment: 'right',
        margin: [0, 20, 0, 0],
        bold: true,
        fontSize: 14
      },
    ],
    
    styles: {
      header: {
        fontSize: 18,
        bold: true,
      },
      subheader: {
        fontSize: 14,
        bold: true,
      },
      tableHeader: {
        bold: true,
        color: 'white',
      }
    },
    
    defaultStyle: {
      fontSize: 10,
    }
  };

  // Generate and download PDF
  const safeName = vendorInfo.name.replace(/[^a-zA-Z0-9\u0600-\u06FF]/g, '_');
  pdfMake.createPdf(docDefinition).download(`Statement_${safeName}_${fromDate}_to_${toDate}.pdf`);
}
