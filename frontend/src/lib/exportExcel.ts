import * as XLSX from 'xlsx';

interface ExportColumn {
  key: string;
  header: string;
  format?: 'currency' | 'number' | 'date' | 'text';
}

export function exportToExcel(
  data: any[],
  columns: ExportColumn[],
  filename: string,
  sheetName: string = 'Sheet1'
) {
  // Prepare data with headers
  const rows = data.map((item) => {
    const row: Record<string, any> = {};
    columns.forEach((col) => {
      let value = item[col.key];
      
      // Format values
      if (col.format === 'currency' && typeof value === 'number') {
        value = value.toFixed(2);
      } else if (col.format === 'date' && value) {
        value = new Date(value).toLocaleDateString();
      } else if (col.format === 'number' && typeof value === 'number') {
        value = value.toString();
      }
      
      row[col.header] = value ?? '';
    });
    return row;
  });

  // Create worksheet
  const worksheet = XLSX.utils.json_to_sheet(rows);

  // Set column widths
  const columnWidths = columns.map((col) => ({
    wch: Math.max(col.header.length, 15),
  }));
  worksheet['!cols'] = columnWidths;

  // Create workbook
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  // Generate file and download
  const today = new Date().toISOString().split('T')[0];
  XLSX.writeFile(workbook, `${filename}_${today}.xlsx`);
}

// Specific export functions for each report type
export function exportReceivablesAging(data: any[], asOfDate: string) {
  const columns: ExportColumn[] = [
    { key: 'customer_name', header: 'Customer' },
    { key: 'customer_phone', header: 'Phone' },
    { key: 'current_amount', header: 'Current', format: 'currency' },
    { key: 'days_1_15', header: '1-15 Days', format: 'currency' },
    { key: 'days_16_30', header: '16-30 Days', format: 'currency' },
    { key: 'days_31_45', header: '31-45 Days', format: 'currency' },
    { key: 'days_over_45', header: '45+ Days', format: 'currency' },
    { key: 'total_outstanding', header: 'Total Outstanding', format: 'currency' },
  ];
  exportToExcel(data, columns, `Receivables_Aging_${asOfDate}`, 'Receivables');
}

export function exportPayablesAging(data: any[], asOfDate: string) {
  const columns: ExportColumn[] = [
    { key: 'vendor_name', header: 'Vendor' },
    { key: 'vendor_phone', header: 'Phone' },
    { key: 'current_amount', header: 'Current', format: 'currency' },
    { key: 'days_1_15', header: '1-15 Days', format: 'currency' },
    { key: 'days_16_30', header: '16-30 Days', format: 'currency' },
    { key: 'days_31_45', header: '31-45 Days', format: 'currency' },
    { key: 'days_over_45', header: '45+ Days', format: 'currency' },
    { key: 'total_outstanding', header: 'Total Outstanding', format: 'currency' },
  ];
  exportToExcel(data, columns, `Payables_Aging_${asOfDate}`, 'Payables');
}

export function exportSalesByCustomer(data: any[], fromDate: string, toDate: string) {
  const columns: ExportColumn[] = [
    { key: 'customer_name', header: 'Customer' },
    { key: 'invoice_count', header: 'Invoices', format: 'number' },
    { key: 'total_sales', header: 'Total Sales', format: 'currency' },
    { key: 'total_paid', header: 'Total Paid', format: 'currency' },
    { key: 'total_outstanding', header: 'Outstanding', format: 'currency' },
  ];
  exportToExcel(data, columns, `Sales_By_Customer_${fromDate}_to_${toDate}`, 'Sales');
}

export function exportSalesByItem(data: any[], fromDate: string, toDate: string) {
  const columns: ExportColumn[] = [
    { key: 'product_name', header: 'Product' },
    { key: 'sku', header: 'SKU' },
    { key: 'category_name', header: 'Category' },
    { key: 'quantity_sold', header: 'Qty Sold', format: 'number' },
    { key: 'avg_price', header: 'Avg Price', format: 'currency' },
    { key: 'total_sales', header: 'Total Sales', format: 'currency' },
  ];
  exportToExcel(data, columns, `Sales_By_Item_${fromDate}_to_${toDate}`, 'Products');
}

export function exportInventoryValuation(data: any[]) {
  const columns: ExportColumn[] = [
    { key: 'name_en', header: 'Product' },
    { key: 'sku', header: 'SKU' },
    { key: 'category_name', header: 'Category' },
    { key: 'total_quantity', header: 'Quantity', format: 'number' },
    { key: 'cost_price', header: 'Cost Price', format: 'currency' },
    { key: 'unit_price', header: 'Retail Price', format: 'currency' },
    { key: 'stock_value', header: 'Stock Value', format: 'currency' },
    { key: 'retail_value', header: 'Retail Value', format: 'currency' },
  ];
  exportToExcel(data, columns, 'Inventory_Valuation', 'Inventory');
}

export function exportCustomerStatement(
  transactions: any[], 
  customerName: string, 
  fromDate: string, 
  toDate: string
) {
  const columns: ExportColumn[] = [
    { key: 'date', header: 'Date', format: 'date' },
    { key: 'type', header: 'Type' },
    { key: 'reference', header: 'Reference' },
    { key: 'description', header: 'Description' },
    { key: 'debit', header: 'Debit', format: 'currency' },
    { key: 'credit', header: 'Credit', format: 'currency' },
    { key: 'running_balance', header: 'Balance', format: 'currency' },
  ];
  const safeName = customerName.replace(/[^a-zA-Z0-9]/g, '_');
  exportToExcel(transactions, columns, `Statement_${safeName}_${fromDate}_to_${toDate}`, 'Statement');
}
