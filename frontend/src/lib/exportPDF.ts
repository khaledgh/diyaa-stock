import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface PDFColumn {
  key: string;
  header: string;
  width?: number;
}

interface PDFExportOptions {
  title: string;
  subtitle?: string;
  filename: string;
  columns: PDFColumn[];
  data: any[];
  orientation?: 'portrait' | 'landscape';
  summary?: { label: string; value: string }[];
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

// Helper to load Arabic font
async function loadArabicFont(doc: jsPDF) {
  try {
    // Fetch from local public directory
    const fontUrl = '/fonts/Amiri-Regular.ttf';
    const response = await fetch(fontUrl);
    if (!response.ok) throw new Error('Failed to load font');
    
    const buffer = await response.arrayBuffer();
    
    // Convert ArrayBuffer to Base64
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64Font = btoa(binary);

    // Add font to VFS
    doc.addFileToVFS('Amiri-Regular.ttf', base64Font);
    doc.addFont('Amiri-Regular.ttf', 'Amiri', 'normal');
    
    return true;
  } catch (error) {
    console.error('Error loading Arabic font:', error);
    return false;
  }
}


// Process Arabic text for PDF rendering
function fixArabic(text: string): string {
  if (!text) return '';
  
  const arabicPattern = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
  if (!arabicPattern.test(text)) return text;

  // jsPDF renders LTR, so for Arabic RTL text:
  // We need to reverse the ENTIRE string (including spaces)
  // This makes "ابو سعود ماركت" render correctly when jsPDF draws it LTR
  return text.split('').reverse().join('');
}

export async function exportToPDF(options: PDFExportOptions) {
  const {
    title,
    subtitle,
    filename,
    columns,
    data,
    orientation = 'portrait',
    summary,
  } = options;

  const doc = new jsPDF({ orientation, unit: 'mm', format: 'a4' });
  
  // Load font before doing anything else
  const fontLoaded = await loadArabicFont(doc);
  const fontName = fontLoaded ? 'Amiri' : 'helvetica';

  const pageWidth = doc.internal.pageSize.getWidth();
  const company = getCompanySettings();

  let yPos = 15;

  // Company Header
  doc.setFontSize(16);
  doc.setFont(fontName, 'normal');
  doc.text(fixArabic(company.company_name), pageWidth / 2, yPos, { align: 'center' });
  yPos += 6;

  if (company.company_address) {
    doc.setFontSize(9);
    doc.setFont(fontName, 'normal');
    doc.text(fixArabic(company.company_address), pageWidth / 2, yPos, { align: 'center' });
    yPos += 4;
  }

  if (company.company_phone || company.company_email) {
    doc.setFontSize(9);
    doc.setFont(fontName, 'normal');
    const contactInfo = [
      company.company_phone ? `Tel: ${company.company_phone}` : '',
      company.company_email ? `Email: ${company.company_email}` : '',
    ]
      .filter(Boolean)
      .join(' | ');
    doc.text(fixArabic(contactInfo), pageWidth / 2, yPos, { align: 'center' });
    yPos += 4;
  }

  yPos += 5;

  // Report Title
  doc.setFontSize(14);
  doc.setFont(fontName, 'normal');
  doc.text(fixArabic(title), pageWidth / 2, yPos, { align: 'center' });
  yPos += 6;

  // Subtitle (e.g., date range)
  if (subtitle) {
    doc.setFontSize(10);
    doc.setFont(fontName, 'normal');
    doc.text(fixArabic(subtitle), pageWidth / 2, yPos, { align: 'center' });
    yPos += 4;
  }

  yPos += 5;

  // Table
  const tableData = data.map((row) => {
    const formatted: Record<string, any> = {};
    columns.forEach((col) => {
      const value = row[col.key] ?? '';
      formatted[col.key] = typeof value === 'string' ? fixArabic(value) : value;
    });
    return formatted;
  });

  autoTable(doc, {
    startY: yPos,
    head: [columns.map((c) => fixArabic(c.header))],
    body: tableData.map((row) => columns.map((c) => row[c.key])),
    theme: 'striped',
    headStyles: {
      fillColor: [59, 130, 246],
      textColor: 255,
      fontStyle: 'normal',
      font: fontName, // Use Cairo in table
      fontSize: 9,
    },
    bodyStyles: {
      fontSize: 8,
      font: fontName, // Use Cairo in table
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    margin: { left: 10, right: 10 },
    styles: {
      cellPadding: 2,
      overflow: 'linebreak',
    },
  });

  // Summary Section
  if (summary && summary.length > 0) {
    const finalY = (doc as any).lastAutoTable?.finalY || yPos + 50;
    let summaryY = finalY + 10;

    doc.setFontSize(10);
    doc.setFont(fontName, 'normal');
    
    summary.forEach((item) => {
      doc.text(`${fixArabic(item.label)}:`, pageWidth - 70, summaryY);
      doc.text(fixArabic(item.value), pageWidth - 15, summaryY, { align: 'right' });
      summaryY += 5;
    });
  }

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont(fontName, 'normal');
    doc.text(
      fixArabic(`Generated on ${new Date().toLocaleDateString()} | Page ${i} of ${pageCount}`),
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
  }

  // Save PDF
  const today = new Date().toISOString().split('T')[0];
  doc.save(`${filename}_${today}.pdf`);
}

// Specific export functions for each report type
export async function exportReceivablesAgingPDF(data: any[], asOfDate: string) {
  const columns: PDFColumn[] = [
    { key: 'customer_name', header: 'Customer' },
    { key: 'customer_phone', header: 'Phone' },
    { key: 'current_amount', header: 'Current' },
    { key: 'days_1_15', header: '1-15 Days' },
    { key: 'days_16_30', header: '16-30 Days' },
    { key: 'days_31_45', header: '31-45 Days' },
    { key: 'days_over_45', header: '45+ Days' },
    { key: 'total_outstanding', header: 'Total' },
  ];

  // Format currency values
  const formattedData = data.map((row) => ({
    ...row,
    current_amount: formatNumber(row.current_amount),
    days_1_15: formatNumber(row.days_1_15),
    days_16_30: formatNumber(row.days_16_30),
    days_31_45: formatNumber(row.days_31_45),
    days_over_45: formatNumber(row.days_over_45),
    total_outstanding: formatNumber(row.total_outstanding),
  }));

  const total = data.reduce((sum, r) => sum + (r.total_outstanding || 0), 0);

  await exportToPDF({
    title: 'Receivables Aging Report',
    subtitle: `As of ${asOfDate}`,
    filename: 'Receivables_Aging',
    columns,
    data: formattedData,
    orientation: 'landscape',
    summary: [{ label: 'Total Outstanding', value: formatNumber(total) }],
  });
}

export async function exportPayablesAgingPDF(data: any[], asOfDate: string) {
  const columns: PDFColumn[] = [
    { key: 'vendor_name', header: 'Vendor' },
    { key: 'vendor_phone', header: 'Phone' },
    { key: 'current_amount', header: 'Current' },
    { key: 'days_1_15', header: '1-15 Days' },
    { key: 'days_16_30', header: '16-30 Days' },
    { key: 'days_31_45', header: '31-45 Days' },
    { key: 'days_over_45', header: '45+ Days' },
    { key: 'total_outstanding', header: 'Total' },
  ];

  const formattedData = data.map((row) => ({
    ...row,
    current_amount: formatNumber(row.current_amount),
    days_1_15: formatNumber(row.days_1_15),
    days_16_30: formatNumber(row.days_16_30),
    days_31_45: formatNumber(row.days_31_45),
    days_over_45: formatNumber(row.days_over_45),
    total_outstanding: formatNumber(row.total_outstanding),
  }));

  const total = data.reduce((sum, r) => sum + (r.total_outstanding || 0), 0);

  await exportToPDF({
    title: 'Payables Aging Report',
    subtitle: `As of ${asOfDate}`,
    filename: 'Payables_Aging',
    columns,
    data: formattedData,
    orientation: 'landscape',
    summary: [{ label: 'Total Payables', value: formatNumber(total) }],
  });
}

export async function exportSalesByCustomerPDF(
  data: any[],
  fromDate: string,
  toDate: string
) {
  const columns: PDFColumn[] = [
    { key: 'customer_name', header: 'Customer' },
    { key: 'invoice_count', header: 'Invoices' },
    { key: 'total_sales', header: 'Total Sales' },
    { key: 'total_paid', header: 'Total Paid' },
    { key: 'total_outstanding', header: 'Outstanding' },
  ];

  const formattedData = data.map((row) => ({
    ...row,
    total_sales: formatNumber(row.total_sales),
    total_paid: formatNumber(row.total_paid),
    total_outstanding: formatNumber(row.total_outstanding),
  }));

  const totalSales = data.reduce((sum, r) => sum + (r.total_sales || 0), 0);

  await exportToPDF({
    title: 'Sales by Customer Report',
    subtitle: `${fromDate} to ${toDate}`,
    filename: 'Sales_By_Customer',
    columns,
    data: formattedData,
    summary: [{ label: 'Total Sales', value: formatNumber(totalSales) }],
  });
}

export async function exportSalesByItemPDF(
  data: any[],
  fromDate: string,
  toDate: string
) {
  const columns: PDFColumn[] = [
    { key: 'product_name', header: 'Product' },
    { key: 'sku', header: 'SKU' },
    { key: 'category_name', header: 'Category' },
    { key: 'quantity_sold', header: 'Qty Sold' },
    { key: 'avg_price', header: 'Avg Price' },
    { key: 'total_sales', header: 'Total Sales' },
  ];

  const formattedData = data.map((row) => ({
    ...row,
    avg_price: formatNumber(row.avg_price),
    total_sales: formatNumber(row.total_sales),
  }));

  const totalSales = data.reduce((sum, r) => sum + (r.total_sales || 0), 0);

  await exportToPDF({
    title: 'Sales by Item Report',
    subtitle: `${fromDate} to ${toDate}`,
    filename: 'Sales_By_Item',
    columns,
    data: formattedData,
    orientation: 'landscape',
    summary: [{ label: 'Total Sales', value: formatNumber(totalSales) }],
  });
}

export async function exportInventoryValuationPDF(data: any[]) {
  const columns: PDFColumn[] = [
    { key: 'name', header: 'Product' },
    { key: 'sku', header: 'SKU' },
    { key: 'category_name', header: 'Category' },
    { key: 'total_quantity', header: 'Quantity' },
    { key: 'cost_price', header: 'Cost Price' },
    { key: 'unit_price', header: 'Retail Price' },
    { key: 'stock_value', header: 'Stock Value' },
  ];

  const formattedData = data.map((row) => ({
    ...row,
    name: row.name_en || row.name_ar,
    cost_price: formatNumber(row.cost_price),
    unit_price: formatNumber(row.unit_price),
    stock_value: formatNumber(row.stock_value),
  }));

  const totalValue = data.reduce((sum, r) => sum + (r.stock_value || 0), 0);

  await exportToPDF({
    title: 'Inventory Valuation Report',
    subtitle: `As of ${new Date().toLocaleDateString()}`,
    filename: 'Inventory_Valuation',
    columns,
    data: formattedData,
    orientation: 'landscape',
    summary: [{ label: 'Total Stock Value', value: formatNumber(totalValue) }],
  });
}

export async function exportCustomerStatementPDF(
  transactions: any[],
  customerInfo: { name: string; phone?: string; email?: string },
  fromDate: string,
  toDate: string,
  openingBalance: number,
  closingBalance: number
) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  
  // Load font first
  const fontLoaded = await loadArabicFont(doc);
  const fontName = fontLoaded ? 'Amiri' : 'helvetica';

  const pageWidth = doc.internal.pageSize.getWidth();
  const company = getCompanySettings();

  let yPos = 15;

  // Company Header
  doc.setFontSize(16);
  doc.setFont(fontName, 'normal');
  doc.text(fixArabic(company.company_name), pageWidth / 2, yPos, { align: 'center' });
  yPos += 10;

  // Title
  doc.setFontSize(14);
  doc.text('Customer Statement', pageWidth / 2, yPos, { align: 'center' });
  yPos += 8;

  // Customer Info
  doc.setFontSize(10);
  doc.setFont(fontName, 'normal');
  doc.text(fixArabic('Customer:'), 15, yPos);
  doc.setFont(fontName, 'normal');
  doc.text(fixArabic(customerInfo.name), 45, yPos);
  yPos += 5;

  doc.setFont(fontName, 'normal');
  doc.text(fixArabic('Period:'), 15, yPos);
  doc.setFont(fontName, 'normal');
  doc.text(fixArabic(`${fromDate} to ${toDate}`), 45, yPos);
  yPos += 8;

  // Opening Balance
  doc.setFont(fontName, 'normal');
  doc.text(fixArabic(`Opening Balance: ${formatNumber(openingBalance)}`), 15, yPos);
  yPos += 8;

  // Transactions Table
  const columns = ['Date', 'Type', 'Reference', 'Description', 'Debit', 'Credit', 'Balance'];
  const rows = transactions.map((tx) => [
    new Date(tx.date).toLocaleDateString(),
    fixArabic(tx.type),
    fixArabic(tx.reference || ''),
    fixArabic(tx.description || ''),
    tx.debit > 0 ? formatNumber(tx.debit) : '',
    tx.credit > 0 ? formatNumber(tx.credit) : '',
    formatNumber(tx.running_balance),
  ]);

  autoTable(doc, {
    startY: yPos,
    head: [columns],
    body: rows,
    theme: 'striped',
    headStyles: {
      fillColor: [59, 130, 246],
      textColor: 255,
      fontStyle: 'normal',
      font: fontName,
      fontSize: 8,
    },
    bodyStyles: {
      fontSize: 8,
      font: fontName,
    },
    margin: { left: 10, right: 10 },
  });

  // Closing Balance
  const finalY = (doc as any).lastAutoTable?.finalY || yPos + 50;
  doc.setFontSize(12);
  doc.setFont(fontName, 'normal');
  doc.text(fixArabic(`Closing Balance: ${formatNumber(closingBalance)}`), pageWidth - 15, finalY + 10, {
    align: 'right',
  });

  // Save
  const safeName = customerInfo.name.replace(/[^a-zA-Z0-9]/g, '_');
  doc.save(`Statement_${safeName}_${fromDate}_to_${toDate}.pdf`);
}

export async function exportVendorStatementPDF(
  transactions: any[],
  vendorInfo: { name: string; phone?: string; email?: string; address?: string },
  fromDate: string,
  toDate: string,
  openingBalance: number,
  closingBalance: number
) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  
  // Load font first
  const fontLoaded = await loadArabicFont(doc);
  const fontName = fontLoaded ? 'Amiri' : 'helvetica';

  const pageWidth = doc.internal.pageSize.getWidth();
  const company = getCompanySettings();

  let yPos = 15;

  // Company Header
  doc.setFontSize(16);
  doc.setFont(fontName, 'normal');
  doc.text(fixArabic(company.company_name), pageWidth / 2, yPos, { align: 'center' });
  yPos += 10;

  // Title
  doc.setFontSize(14);
  doc.text('Vendor Statement', pageWidth / 2, yPos, { align: 'center' });
  yPos += 8;

  // Vendor Info
  doc.setFontSize(10);
  doc.setFont(fontName, 'normal');
  doc.text(fixArabic('Vendor:'), 15, yPos);
  doc.setFont(fontName, 'normal');
  doc.text(fixArabic(vendorInfo.name), 45, yPos);
  yPos += 5;

  doc.setFont(fontName, 'normal');
  doc.text(fixArabic('Period:'), 15, yPos);
  doc.setFont(fontName, 'normal');
  doc.text(fixArabic(`${fromDate} to ${toDate}`), 45, yPos);
  yPos += 8;

  // Opening Balance
  doc.setFont(fontName, 'normal');
  doc.text(fixArabic(`Opening Balance: ${formatNumber(openingBalance)}`), 15, yPos);
  yPos += 8;

  // Transactions Table
  const columns = ['Date', 'Type', 'Reference', 'Description', 'Debit', 'Credit', 'Balance'];
  const rows = transactions.map((tx) => [
    new Date(tx.date).toLocaleDateString(),
    fixArabic(tx.type === 'invoice' ? 'Bill' : tx.type === 'credit_note' ? 'Credit Note' : 'Payment'),
    fixArabic(tx.reference || ''),
    fixArabic(tx.description || ''),
    tx.debit > 0 ? formatNumber(tx.debit) : '',
    tx.credit > 0 ? formatNumber(tx.credit) : '',
    formatNumber(tx.running_balance),
  ]);

  autoTable(doc, {
    startY: yPos,
    head: [columns],
    body: rows,
    theme: 'striped',
    headStyles: {
      fillColor: [220, 38, 38], // Red for Payables
      textColor: 255,
      fontStyle: 'normal',
      font: fontName,
      fontSize: 8,
    },
    bodyStyles: {
      fontSize: 8,
      font: fontName,
    },
    margin: { left: 10, right: 10 },
  });

  // Closing Balance
  const finalY = (doc as any).lastAutoTable?.finalY || yPos + 50;
  doc.setFontSize(12);
  doc.setFont(fontName, 'normal');
  doc.text(fixArabic(`Closing Balance: ${formatNumber(closingBalance)}`), pageWidth - 15, finalY + 10, {
    align: 'right',
  });

  // Save
  const safeName = vendorInfo.name.replace(/[^a-zA-Z0-9]/g, '_');
  doc.save(`Statement_${safeName}_${fromDate}_to_${toDate}.pdf`);
}

// Helper function
function formatNumber(value: number | undefined): string {
  if (value === undefined || value === null) return '0.00';
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}
