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

// Export Invoice to PDF using pdfmake
export async function exportInvoicePDFMake(invoice: any, type: 'sales' | 'purchase') {
  try {
    console.log('Starting PDF export for invoice:', invoice.invoice_number);
    await ensureFontsLoaded();
    console.log('Fonts loaded successfully');
    
    const company = getCompanySettings();
    console.log('Company settings loaded:', company);
  
  // Calculate credit notes total
  const creditNotesTotal = invoice.credit_notes?.reduce((sum: number, cn: any) => sum + (cn.total_amount || 0), 0) || 0;
  const remaining = invoice.total_amount - creditNotesTotal - invoice.paid_amount;
  
  // Calculate credited quantities per product
  const getCreditedQuantity = (productId: number) => {
    if (!invoice.credit_notes || invoice.credit_notes.length === 0) return 0;
    return invoice.credit_notes.reduce((total: number, cn: any) => {
      if (cn.status !== 'approved') return total;
      const cnItems = cn.items || [];
      const productItems = cnItems.filter((item: any) => item.product_id === productId);
      return total + productItems.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0);
    }, 0);
  };
  
  // Calculate remaining total after credit notes for each item
  const getItemRemainingTotal = (item: any) => {
    const creditedQty = getCreditedQuantity(item.product_id);
    const remainingQty = item.quantity - creditedQty;
    return remainingQty * item.unit_price * (1 - (item.discount_percent || 0) / 100);
  };

  // Build items table
  const itemsTableHeader = [
    { text: 'Product', style: 'tableHeader' },
    { text: 'Quantity', style: 'tableHeader', alignment: 'center' },
  ];
  
  if (creditNotesTotal > 0) {
    itemsTableHeader.push({ text: 'Credit Noted', style: 'tableHeader', alignment: 'center' });
  }
  
  itemsTableHeader.push(
    { text: 'Unit Price', style: 'tableHeader', alignment: 'right' },
    { text: 'Discount', style: 'tableHeader', alignment: 'center' },
    { text: 'Total', style: 'tableHeader', alignment: 'right' }
  );
  
  if (creditNotesTotal > 0) {
    itemsTableHeader.push({ text: 'After Credit', style: 'tableHeader', alignment: 'right' });
  }

  const itemsTableBody: any[][] = [itemsTableHeader];

  // Add items
  invoice.items?.forEach((item: any) => {
    const productName = item.product?.name_ar || item.product?.name_en || item.product_name || item.name_en || '-';
    const isArabic = containsArabic(productName);
    const creditedQty = getCreditedQuantity(item.product_id);
    
    const row: any[] = [
      { text: fixArabicText(productName), font: isArabic ? 'Amiri' : 'Roboto' },
      { text: item.quantity.toString(), alignment: 'center' },
    ];
    
    if (creditNotesTotal > 0) {
      row.push({ text: creditedQty > 0 ? creditedQty.toString() : '-', alignment: 'center', color: '#EA580C' });
    }
    
    row.push(
      { text: formatNumber(item.unit_price), alignment: 'right' },
      { text: `${item.discount_percent || 0}%`, alignment: 'center' },
      { text: formatNumber(item.total), alignment: 'right' }
    );
    
    if (creditNotesTotal > 0) {
      row.push({ 
        text: formatNumber(getItemRemainingTotal(item)), 
        alignment: 'right',
        color: creditedQty > 0 ? '#16A34A' : undefined
      });
    }
    
    itemsTableBody.push(row);
  });

  // Build credit notes table if exists
  let creditNotesTable: any = null;
  if (invoice.credit_notes && invoice.credit_notes.length > 0) {
    const cnTableBody: any[][] = [
      [
        { text: 'Credit Note #', style: 'tableHeader' },
        { text: 'Date', style: 'tableHeader' },
        { text: 'Status', style: 'tableHeader' },
        { text: 'Amount', style: 'tableHeader', alignment: 'right' },
      ]
    ];
    
    invoice.credit_notes.forEach((cn: any) => {
      cnTableBody.push([
        cn.credit_note_number,
        new Date(cn.credit_note_date).toLocaleDateString(),
        cn.status,
        { text: '-' + formatNumber(cn.total_amount), alignment: 'right', color: '#EA580C' },
      ]);
    });
    
    creditNotesTable = {
      table: {
        headerRows: 1,
        widths: ['*', 'auto', 'auto', 'auto'],
        body: cnTableBody
      },
      layout: {
        fillColor: function (rowIndex: number) {
          return rowIndex === 0 ? '#EA580C' : (rowIndex % 2 === 0 ? '#FFF7ED' : null);
        },
        hLineColor: function () { return '#E2E8F0'; },
        vLineColor: function () { return '#E2E8F0'; },
      },
      margin: [0, 10, 0, 10]
    };
  }

  // Build totals section
  const totalsContent: any[] = [
    {
      columns: [
        { text: 'Subtotal:', width: '*', alignment: 'right', bold: true },
        { text: formatNumber(invoice.subtotal), width: 100, alignment: 'right' }
      ]
    }
  ];

  if (invoice.tax_amount > 0) {
    totalsContent.push({
      columns: [
        { text: 'Tax:', width: '*', alignment: 'right' },
        { text: formatNumber(invoice.tax_amount), width: 100, alignment: 'right' }
      ],
      margin: [0, 5, 0, 0]
    });
  }

  if (invoice.discount_amount > 0) {
    totalsContent.push({
      columns: [
        { text: 'Discount:', width: '*', alignment: 'right' },
        { text: '-' + formatNumber(invoice.discount_amount), width: 100, alignment: 'right', color: '#DC2626' }
      ],
      margin: [0, 5, 0, 0]
    });
  }

  totalsContent.push({
    columns: [
      { text: 'Total:', width: '*', alignment: 'right', bold: true, fontSize: 14 },
      { text: formatNumber(invoice.total_amount), width: 100, alignment: 'right', bold: true, fontSize: 14 }
    ],
    margin: [0, 10, 0, 5]
  });

  if (creditNotesTotal > 0) {
    totalsContent.push({
      columns: [
        { text: 'Credit Notes:', width: '*', alignment: 'right', color: '#EA580C' },
        { text: '-' + formatNumber(creditNotesTotal), width: 100, alignment: 'right', color: '#EA580C' }
      ],
      margin: [0, 5, 0, 0]
    });
    
    totalsContent.push({
      columns: [
        { text: 'Net Amount:', width: '*', alignment: 'right', bold: true },
        { text: formatNumber(invoice.total_amount - creditNotesTotal), width: 100, alignment: 'right', bold: true }
      ],
      margin: [0, 5, 0, 0]
    });
  }

  totalsContent.push({
    columns: [
      { text: 'Paid:', width: '*', alignment: 'right', color: '#16A34A' },
      { text: formatNumber(invoice.paid_amount), width: 100, alignment: 'right', color: '#16A34A' }
    ],
    margin: [0, 10, 0, 0]
  });

  if (remaining > 0) {
    totalsContent.push({
      columns: [
        { text: 'Remaining:', width: '*', alignment: 'right', bold: true, color: '#DC2626' },
        { text: formatNumber(remaining), width: 100, alignment: 'right', bold: true, color: '#DC2626' }
      ],
      margin: [0, 5, 0, 0]
    });
  }

  const entityName = type === 'sales' 
    ? (invoice.customer_name || 'Walk-in Customer')
    : (invoice.vendor?.company_name || invoice.vendor?.name || invoice.vendor_name || 'N/A');
  const isArabicEntity = containsArabic(entityName);

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
        text: type === 'sales' ? 'Sales Invoice' : 'Purchase Invoice', 
        style: 'subheader',
        alignment: 'center',
        margin: [0, 10, 0, 20]
      },
      
      // Invoice Info
      {
        columns: [
          {
            width: '*',
            stack: [
              { 
                text: [
                  { text: 'Invoice #: ', bold: true },
                  invoice.invoice_number
                ]
              },
              { 
                text: [
                  { text: 'Date: ', bold: true },
                  new Date(invoice.invoice_date || invoice.created_at).toLocaleDateString()
                ]
              },
              { 
                text: [
                  { text: type === 'sales' ? 'Customer: ' : 'Vendor: ', bold: true },
                  { text: fixArabicText(entityName), font: isArabicEntity ? 'Amiri' : 'Roboto' }
                ]
              },
            ]
          },
          {
            width: '*',
            stack: [
              { 
                text: [
                  { text: 'Location: ', bold: true },
                  invoice.location_name || 'N/A'
                ]
              },
              { 
                text: [
                  { text: 'Status: ', bold: true },
                  invoice.payment_status
                ]
              },
            ]
          }
        ],
        margin: [0, 0, 0, 20]
      },
      
      // Items Table
      {
        table: {
          headerRows: 1,
          widths: creditNotesTotal > 0 
            ? ['*', 'auto', 'auto', 'auto', 'auto', 'auto', 'auto']
            : ['*', 'auto', 'auto', 'auto', 'auto'],
          body: itemsTableBody
        },
        layout: {
          fillColor: function (rowIndex: number) {
            return rowIndex === 0 ? (type === 'sales' ? '#16A34A' : '#2563EB') : (rowIndex % 2 === 0 ? '#F8FAFC' : null);
          },
          hLineColor: function () { return '#E2E8F0'; },
          vLineColor: function () { return '#E2E8F0'; },
        }
      },
      
      // Credit Notes Table
      ...(creditNotesTable ? [
        { text: 'Credit Notes', style: 'sectionHeader', margin: [0, 20, 0, 10], color: '#EA580C' },
        creditNotesTable
      ] : []),
      
      // Totals
      {
        stack: totalsContent,
        margin: [0, 20, 0, 0]
      },
      
      // Notes
      ...(invoice.notes ? [
        { text: 'Notes', style: 'sectionHeader', margin: [0, 20, 0, 5] },
        { text: invoice.notes, fontSize: 9, color: '#64748B' }
      ] : []),
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
      sectionHeader: {
        fontSize: 12,
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
  console.log('Generating PDF...');
  pdfMake.createPdf(docDefinition).download(`${type}_invoice_${invoice.invoice_number}.pdf`);
  console.log('PDF download initiated');
  } catch (error) {
    console.error('Error in exportInvoicePDFMake:', error);
    throw error;
  }
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
