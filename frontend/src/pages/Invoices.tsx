import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { FileText, Eye, Plus, Trash2, DollarSign, Printer, Receipt } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { invoiceApi, productApi, vanApi, customerApi, paymentApi, stockApi } from '@/lib/api';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { Combobox } from '@/components/ui/combobox';

interface InvoiceItem {
  product_id: number;
  product_name?: string;
  quantity: number;
  unit_price: number;
  discount_percent?: number;
  total?: number;
}

export default function Invoices() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [invoiceType, setInvoiceType] = useState<'purchase' | 'sales'>('sales');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([]);
  
  // Form states
  const [selectedVan, setSelectedVan] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [selectedProduct, setSelectedProduct] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [discount, setDiscount] = useState('');
  const [paidAmount, setPaidAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDialogMethod, setPaymentDialogMethod] = useState('cash');
  const [paymentDialogReference, setPaymentDialogReference] = useState('');

  const { data: invoices, isLoading } = useQuery({
    queryKey: ['invoices', invoiceType],
    queryFn: async () => {
      const response = await invoiceApi.getAll({ invoice_type: invoiceType });
      return response.data.data || [];
    },
  });

  const { data: products } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const response = await productApi.getAll();
      return response.data.data || [];
    },
  });

  const { data: vans } = useQuery({
    queryKey: ['vans'],
    queryFn: async () => {
      const response = await vanApi.getAll();
      return response.data.data || [];
    },
  });

  const { data: customers } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const response = await customerApi.getAll();
      return response.data.data || [];
    },
  });

  const { data: vanStock } = useQuery({
    queryKey: ['van-stock', selectedVan],
    queryFn: async () => {
      if (!selectedVan || invoiceType !== 'sales') return [];
      const response = await vanApi.getStock(Number(selectedVan));
      return response.data.data || [];
    },
    enabled: !!selectedVan && invoiceType === 'sales',
  });

  const { data: warehouseStock } = useQuery({
    queryKey: ['warehouse-stock'],
    queryFn: async () => {
      const response = await stockApi.getWarehouse();
      return response.data.data || [];
    },
    enabled: invoiceType === 'purchase',
  });

  const createInvoiceMutation = useMutation({
    mutationFn: (data: any) => {
      return invoiceType === 'purchase' 
        ? invoiceApi.createPurchase(data)
        : invoiceApi.createSales(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['warehouse-stock'] });
      queryClient.invalidateQueries({ queryKey: ['van-stock'] });
      toast.success(`${invoiceType === 'purchase' ? 'Purchase' : 'Sales'} invoice created successfully`);
      handleCloseCreateDialog();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create invoice');
    },
  });

  const createPaymentMutation = useMutation({
    mutationFn: (data: any) => paymentApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success('Payment recorded successfully');
      setIsPaymentDialogOpen(false);
      if (selectedInvoice) {
        handleViewDetails(selectedInvoice.id);
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to record payment');
    },
  });

  const handleAddItem = () => {
    if (!selectedProduct || !quantity || !unitPrice) {
      toast.error('Please fill all item fields');
      return;
    }

    const product = products?.find((p: any) => p.id === Number(selectedProduct));
    
    // Check stock for sales
    if (invoiceType === 'sales') {
      const stock = vanStock?.find((s: any) => s.product_id === Number(selectedProduct));
      if (!stock || stock.quantity < Number(quantity)) {
        toast.error('Insufficient van stock');
        return;
      }
    }

    const itemTotal = Number(quantity) * Number(unitPrice);
    const discountAmount = itemTotal * (Number(discount) || 0) / 100;
    const finalTotal = itemTotal - discountAmount;

    const newItem: InvoiceItem = {
      product_id: Number(selectedProduct),
      product_name: product?.name_en,
      quantity: Number(quantity),
      unit_price: Number(unitPrice),
      discount_percent: Number(discount) || 0,
      total: finalTotal,
    };

    setInvoiceItems([...invoiceItems, newItem]);
    setSelectedProduct('');
    setQuantity('');
    setUnitPrice('');
    setDiscount('');
  };

  const handleRemoveItem = (index: number) => {
    setInvoiceItems(invoiceItems.filter((_, i) => i !== index));
  };

  const calculateTotal = () => {
    return invoiceItems.reduce((sum, item) => sum + (item.total || 0), 0);
  };

  const handleCloseCreateDialog = () => {
    setIsCreateDialogOpen(false);
    setInvoiceItems([]);
    setSelectedVan('');
    setSelectedCustomer('');
    setSelectedProduct('');
    setQuantity('');
    setUnitPrice('');
    setDiscount('');
    setPaidAmount('');
    setPaymentMethod('cash');
    setReferenceNumber('');
    setNotes('');
  };

  const handleCreateInvoice = () => {
    if (invoiceItems.length === 0) {
      toast.error('Please add at least one item');
      return;
    }

    if (invoiceType === 'sales' && !selectedVan) {
      toast.error('Please select a van');
      return;
    }

    const invoiceData: any = {
      items: invoiceItems.map(item => ({
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        discount_percent: item.discount_percent || 0,
      })),
      paid_amount: Number(paidAmount) || 0,
      payment_method: paymentMethod,
      reference_number: referenceNumber || undefined,
      notes: notes || undefined,
    };

    if (invoiceType === 'sales') {
      invoiceData.van_id = Number(selectedVan);
    }

    if (selectedCustomer) {
      invoiceData.customer_id = Number(selectedCustomer);
    }

    createInvoiceMutation.mutate(invoiceData);
  };

  const handleViewDetails = async (invoiceId: number) => {
    try {
      const response = await invoiceApi.getById(invoiceId);
      setSelectedInvoice(response.data.data);
      setIsDetailsDialogOpen(true);
    } catch (error) {
      toast.error('Failed to load invoice details');
    }
  };

  const handleAddPayment = () => {
    if (!selectedInvoice || !paymentAmount) {
      toast.error('Please enter payment amount');
      return;
    }

    const remaining = selectedInvoice.total_amount - selectedInvoice.paid_amount;
    if (Number(paymentAmount) > remaining) {
      toast.error('Payment amount exceeds remaining balance');
      return;
    }

    createPaymentMutation.mutate({
      invoice_id: selectedInvoice.id,
      amount: Number(paymentAmount),
      payment_method: paymentDialogMethod,
      reference_number: paymentDialogReference || undefined,
    });
  };

  const handlePrintInvoice = () => {
    if (!selectedInvoice) return;
    
    // Load company settings
    const savedSettings = localStorage.getItem('company_settings');
    let companySettings: any = {
      company_name: 'Company Name',
      company_address: '',
      company_phone: '',
      company_email: '',
      company_tax_id: '',
      company_logo_url: '',
      invoice_footer: 'Thank you for your business!',
    };
    
    if (savedSettings) {
      try {
        companySettings = JSON.parse(savedSettings);
      } catch (error) {
        console.error('Failed to load company settings');
      }
    }
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const invoiceHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Invoice ${selectedInvoice.invoice_number}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto; }
          .header { text-align: center; margin-bottom: 30px; }
          .header img { max-height: 80px; margin-bottom: 10px; }
          .header h1 { margin: 10px 0; color: #333; }
          .header p { margin: 5px 0; color: #666; font-size: 14px; }
          .invoice-title { font-size: 24px; font-weight: bold; margin: 20px 0; }
          .info { display: flex; justify-content: space-between; margin-bottom: 30px; }
          .info-section { flex: 1; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
          th { background-color: #f5f5f5; font-weight: bold; }
          .text-right { text-align: right; }
          .totals { margin-top: 20px; max-width: 400px; margin-left: auto; }
          .totals-row { display: flex; justify-content: space-between; padding: 5px 0; }
          .total-row { font-weight: bold; font-size: 1.2em; border-top: 2px solid #333; padding-top: 10px; margin-top: 10px; }
          .footer { text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 14px; }
          @media print { button { display: none; } }
        </style>
      </head>
      <body>
        <div class="header">
          ${companySettings.company_logo_url ? `<img src="${companySettings.company_logo_url}" alt="Company Logo" />` : ''}
          <h1>${companySettings.company_name}</h1>
          ${companySettings.company_address ? `<p>${companySettings.company_address}</p>` : ''}
          <p>
            ${companySettings.company_phone ? `Tel: ${companySettings.company_phone}` : ''}
            ${companySettings.company_phone && companySettings.company_email ? ' | ' : ''}
            ${companySettings.company_email ? `Email: ${companySettings.company_email}` : ''}
          </p>
          ${companySettings.company_tax_id ? `<p>Tax ID: ${companySettings.company_tax_id}</p>` : ''}
        </div>
        
        <div class="invoice-title">INVOICE</div>
        <p><strong>Invoice Number:</strong> ${selectedInvoice.invoice_number}</p>
        
        <div class="info">
          <div class="info-section">
            <strong>Date:</strong> ${formatDateTime(selectedInvoice.created_at)}<br>
            ${selectedInvoice.customer_name ? `<strong>Customer:</strong> ${selectedInvoice.customer_name}<br>` : ''}
            ${selectedInvoice.van_name ? `<strong>Van:</strong> ${selectedInvoice.van_name}<br>` : ''}
          </div>
          <div class="info-section" style="text-align: right;">
            <strong>Status:</strong> ${selectedInvoice.payment_status.toUpperCase()}<br>
            <strong>Type:</strong> ${selectedInvoice.invoice_type.toUpperCase()}
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Product</th>
              <th class="text-right">Quantity</th>
              <th class="text-right">Unit Price</th>
              <th class="text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            ${selectedInvoice.items?.map((item: any) => `
              <tr>
                <td>${item.product_name || item.name_en}</td>
                <td class="text-right">${item.quantity}</td>
                <td class="text-right">${formatCurrency(item.unit_price)}</td>
                <td class="text-right">${formatCurrency(item.total)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="totals">
          <div class="totals-row">
            <span>Subtotal:</span>
            <span>${formatCurrency(selectedInvoice.subtotal)}</span>
          </div>
          ${selectedInvoice.tax_amount > 0 ? `
            <div class="totals-row">
              <span>Tax:</span>
              <span>${formatCurrency(selectedInvoice.tax_amount)}</span>
            </div>
          ` : ''}
          ${selectedInvoice.discount_amount > 0 ? `
            <div class="totals-row">
              <span>Discount:</span>
              <span>-${formatCurrency(selectedInvoice.discount_amount)}</span>
            </div>
          ` : ''}
          <div class="totals-row total-row">
            <span>Total:</span>
            <span>${formatCurrency(selectedInvoice.total_amount)}</span>
          </div>
          <div class="totals-row" style="color: green;">
            <span>Paid:</span>
            <span>${formatCurrency(selectedInvoice.paid_amount)}</span>
          </div>
          <div class="totals-row" style="color: red; font-weight: bold;">
            <span>Remaining:</span>
            <span>${formatCurrency(selectedInvoice.total_amount - selectedInvoice.paid_amount)}</span>
          </div>
        </div>

        ${companySettings.invoice_footer ? `
          <div class="footer">
            ${companySettings.invoice_footer}
          </div>
        ` : ''}
        
        <div style="margin-top: 50px; text-align: center;">
          <button onclick="window.print()" style="padding: 10px 20px; font-size: 16px; cursor: pointer;">Print Invoice</button>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(invoiceHtml);
    printWindow.document.close();
  };

  const handlePrintPOSReceipt = () => {
    if (!selectedInvoice) return;
    
    // Load company settings
    const savedSettings = localStorage.getItem('company_settings');
    let companySettings: any = {
      company_name: 'Company Name',
      company_phone: '',
      company_tax_id: '',
    };
    
    if (savedSettings) {
      try {
        companySettings = JSON.parse(savedSettings);
      } catch (error) {
        console.error('Failed to load company settings');
      }
    }
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    // POS thermal receipt format (80mm width)
    const receiptHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Receipt ${selectedInvoice.invoice_number}</title>
        <style>
          @media print {
            @page { margin: 0; size: 80mm auto; }
          }
          body { 
            font-family: 'Courier New', monospace; 
            width: 80mm;
            margin: 0;
            padding: 5mm;
            font-size: 12px;
            line-height: 1.4;
          }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .large { font-size: 16px; }
          .line { border-top: 1px dashed #000; margin: 5px 0; }
          .double-line { border-top: 2px solid #000; margin: 5px 0; }
          .row { display: flex; justify-content: space-between; margin: 2px 0; }
          .item-row { display: flex; justify-content: space-between; margin: 3px 0; }
          .item-name { flex: 1; }
          .item-qty { width: 30px; text-align: center; }
          .item-price { width: 60px; text-align: right; }
          .total-row { font-size: 14px; font-weight: bold; margin: 5px 0; }
          button { margin: 10px auto; display: block; padding: 10px 20px; }
          @media print { button { display: none; } }
        </style>
      </head>
      <body>
        <div class="center bold large">${companySettings.company_name}</div>
        ${companySettings.company_phone ? `<div class="center">Tel: ${companySettings.company_phone}</div>` : ''}
        ${companySettings.company_tax_id ? `<div class="center">Tax ID: ${companySettings.company_tax_id}</div>` : ''}
        
        <div class="line"></div>
        
        <div class="row">
          <span>Invoice:</span>
          <span class="bold">${selectedInvoice.invoice_number}</span>
        </div>
        <div class="row">
          <span>Date:</span>
          <span>${new Date(selectedInvoice.created_at).toLocaleString()}</span>
        </div>
        ${selectedInvoice.customer_name ? `
          <div class="row">
            <span>Customer:</span>
            <span>${selectedInvoice.customer_name}</span>
          </div>
        ` : ''}
        ${selectedInvoice.van_name ? `
          <div class="row">
            <span>Van:</span>
            <span>${selectedInvoice.van_name}</span>
          </div>
        ` : ''}
        
        <div class="double-line"></div>
        
        ${selectedInvoice.items?.map((item: any) => `
          <div class="item-row">
            <div class="item-name">${item.product_name || item.name_en}</div>
          </div>
          <div class="item-row">
            <div class="item-qty">${item.quantity} x</div>
            <div class="item-price">${formatCurrency(item.unit_price)}</div>
            <div class="item-price">${formatCurrency(item.total)}</div>
          </div>
        `).join('')}
        
        <div class="line"></div>
        
        <div class="row">
          <span>Subtotal:</span>
          <span>${formatCurrency(selectedInvoice.subtotal)}</span>
        </div>
        ${selectedInvoice.tax_amount > 0 ? `
          <div class="row">
            <span>Tax:</span>
            <span>${formatCurrency(selectedInvoice.tax_amount)}</span>
          </div>
        ` : ''}
        ${selectedInvoice.discount_amount > 0 ? `
          <div class="row">
            <span>Discount:</span>
            <span>-${formatCurrency(selectedInvoice.discount_amount)}</span>
          </div>
        ` : ''}
        
        <div class="double-line"></div>
        
        <div class="row total-row">
          <span>TOTAL:</span>
          <span>${formatCurrency(selectedInvoice.total_amount)}</span>
        </div>
        
        <div class="row">
          <span>Paid:</span>
          <span>${formatCurrency(selectedInvoice.paid_amount)}</span>
        </div>
        
        ${selectedInvoice.total_amount - selectedInvoice.paid_amount > 0 ? `
          <div class="row bold">
            <span>Balance Due:</span>
            <span>${formatCurrency(selectedInvoice.total_amount - selectedInvoice.paid_amount)}</span>
          </div>
        ` : ''}
        
        <div class="line"></div>
        
        <div class="center" style="margin-top: 10px;">
          <div>Thank you for your business!</div>
          <div style="font-size: 10px; margin-top: 5px;">
            Status: ${selectedInvoice.payment_status.toUpperCase()}
          </div>
        </div>
        
        <button onclick="window.print()">Print Receipt</button>
      </body>
      </html>
    `;

    printWindow.document.write(receiptHtml);
    printWindow.document.close();
  };

  const vanOptions = vans?.filter((van: any) => van.is_active).map((van: any) => ({
    value: van.id.toString(),
    label: van.name,
  })) || [];

  const customerOptions = customers?.map((customer: any) => ({
    value: customer.id.toString(),
    label: customer.name,
  })) || [];

  const productOptions = products?.map((product: any) => {
    let stockInfo = '';
    if (invoiceType === 'sales' && selectedVan) {
      const stock = vanStock?.find((s: any) => s.product_id === product.id);
      stockInfo = ` (Stock: ${stock?.quantity || 0})`;
    } else if (invoiceType === 'purchase') {
      const stock = warehouseStock?.find((s: any) => s.product_id === product.id);
      stockInfo = ` (Stock: ${stock?.quantity || 0})`;
    }
    return {
      value: product.id.toString(),
      label: `${product.name_en}${stockInfo}`,
    };
  }) || [];

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">{t('invoices.title') || 'Invoices'}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {invoiceType === 'purchase' 
              ? 'Purchase invoices reduce warehouse stock and record expenses' 
              : 'Sales invoices reduce van stock and record income'}
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)} size="lg">
          <Plus className="mr-2 h-4 w-4" />
          {invoiceType === 'purchase' ? 'New Purchase' : 'New Sale'}
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card 
          className={`cursor-pointer transition-all ${invoiceType === 'purchase' ? 'ring-2 ring-red-500 bg-red-50 dark:bg-red-950' : 'hover:bg-muted'}`}
          onClick={() => setInvoiceType('purchase')}
        >
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Purchase Invoices</h3>
                <p className="text-sm text-muted-foreground">Buying from suppliers</p>
              </div>
              <div className="text-3xl font-bold text-red-600">
                {invoices?.filter((inv: any) => inv.invoice_type === 'purchase').length || 0}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className={`cursor-pointer transition-all ${invoiceType === 'sales' ? 'ring-2 ring-green-500 bg-green-50 dark:bg-green-950' : 'hover:bg-muted'}`}
          onClick={() => setInvoiceType('sales')}
        >
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Sales Invoices</h3>
                <p className="text-sm text-muted-foreground">Selling to customers</p>
              </div>
              <div className="text-3xl font-bold text-green-600">
                {invoices?.filter((inv: any) => inv.invoice_type === 'sales').length || 0}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="text-center py-8">{t('common.loading') || 'Loading...'}</div>
          ) : (
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('invoices.invoiceNumber') || 'Invoice #'}</TableHead>
                    <TableHead className="hidden md:table-cell">{t('common.date') || 'Date'}</TableHead>
                    <TableHead className="hidden lg:table-cell">{t('invoices.customer') || 'Customer'}</TableHead>
                    {invoiceType === 'sales' && <TableHead className="hidden xl:table-cell">{t('invoices.van') || 'Van'}</TableHead>}
                    <TableHead className="text-right">{t('common.total') || 'Total'}</TableHead>
                    <TableHead className="hidden sm:table-cell">{t('invoices.paid') || 'Paid'}</TableHead>
                    <TableHead>{t('invoices.paymentStatus') || 'Status'}</TableHead>
                    <TableHead className="text-right">{t('common.actions') || 'Actions'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices?.map((invoice: any) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          {invoice.invoice_number}
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">{formatDateTime(invoice.created_at)}</TableCell>
                      <TableCell className="hidden lg:table-cell">{invoice.customer_name || '-'}</TableCell>
                      {invoiceType === 'sales' && <TableCell className="hidden xl:table-cell">{invoice.van_name || '-'}</TableCell>}
                      <TableCell className="text-right font-medium">{formatCurrency(invoice.total_amount)}</TableCell>
                      <TableCell className="hidden sm:table-cell text-right">{formatCurrency(invoice.paid_amount)}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          invoice.payment_status === 'paid' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                          invoice.payment_status === 'partial' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                          'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                        }`}>
                          {invoice.payment_status}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewDetails(invoice.id)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Invoice Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className={`p-4 rounded-lg mb-4 ${invoiceType === 'purchase' ? 'bg-red-50 dark:bg-red-950' : 'bg-green-50 dark:bg-green-950'}`}>
              <DialogTitle className={`flex items-center gap-2 ${invoiceType === 'purchase' ? 'text-red-700 dark:text-red-300' : 'text-green-700 dark:text-green-300'}`}>
                <FileText className="h-5 w-5" />
                {invoiceType === 'purchase' ? 'Create Purchase Invoice' : 'Create Sales Invoice'}
              </DialogTitle>
              <p className="text-sm mt-1 text-muted-foreground">
                {invoiceType === 'purchase' 
                  ? '📦 Buying products - Adds to warehouse stock - Payment is expense (-)' 
                  : '💰 Selling products - Reduces van stock - Payment is income (+)'}
              </p>
            </div>
          </DialogHeader>
          <div className="space-y-4">
            {invoiceType === 'sales' && (
              <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-md">
                <Label className="text-blue-700 dark:text-blue-300">Select Van <span className="text-red-500">*</span></Label>
                <p className="text-xs text-muted-foreground mb-2">Products will be deducted from this van's stock</p>
                <Combobox
                  options={[{ value: '', label: 'Select a van...' }, ...vanOptions]}
                  value={selectedVan}
                  onChange={setSelectedVan}
                  placeholder="Select van"
                  searchPlaceholder="Search..."
                  emptyText="No vans found"
                />
              </div>
            )}

            {invoiceType === 'purchase' && (
              <div className="bg-amber-50 dark:bg-amber-950 p-3 rounded-md">
                <Label className="text-amber-700 dark:text-amber-300">Supplier/Vendor</Label>
                <p className="text-xs text-muted-foreground mb-2">Who are you buying from? (Optional)</p>
                <Combobox
                  options={[{ value: '', label: 'Select supplier...' }, ...customerOptions]}
                  value={selectedCustomer}
                  onChange={setSelectedCustomer}
                  placeholder="Select supplier"
                  searchPlaceholder="Search..."
                  emptyText="No suppliers found"
                />
              </div>
            )}

            {invoiceType === 'sales' && (
              <div>
                <Label>Customer (Optional)</Label>
                <Combobox
                  options={[{ value: '', label: 'Walk-in customer' }, ...customerOptions]}
                  value={selectedCustomer}
                  onChange={setSelectedCustomer}
                  placeholder="Select customer"
                  searchPlaceholder="Search..."
                  emptyText="No customers found"
                />
              </div>
            )}

            <div className="border-t pt-4">
              <h3 className="font-semibold mb-4">Add Items</h3>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-4">
                <div className="md:col-span-2">
                  <Label>Product</Label>
                  <Combobox
                    options={[{ value: '', label: 'Select product...' }, ...productOptions]}
                    value={selectedProduct}
                    onChange={(value) => {
                      setSelectedProduct(value);
                      const product = products?.find((p: any) => p.id === Number(value));
                      if (product) {
                        setUnitPrice(product.price?.toString() || '');
                      }
                    }}
                    placeholder="Select product"
                    searchPlaceholder="Search..."
                    emptyText="No products found"
                  />
                </div>
                <div>
                  <Label>Quantity</Label>
                  <Input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="0"
                    min="1"
                  />
                </div>
                <div>
                  <Label>Unit Price</Label>
                  <Input
                    type="number"
                    value={unitPrice}
                    onChange={(e) => setUnitPrice(e.target.value)}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                  />
                </div>
                <div>
                  <Label>Discount %</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      value={discount}
                      onChange={(e) => setDiscount(e.target.value)}
                      placeholder="0"
                      min="0"
                      max="100"
                      className="flex-1"
                    />
                    <Button type="button" onClick={handleAddItem} variant="outline">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {invoiceItems.length > 0 && (
                <div className="border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead className="text-right">Qty</TableHead>
                        <TableHead className="text-right">Price</TableHead>
                        <TableHead className="text-right">Discount</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invoiceItems.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{item.product_name}</TableCell>
                          <TableCell className="text-right">{item.quantity}</TableCell>
                          <TableCell className="text-right">{formatCurrency(item.unit_price)}</TableCell>
                          <TableCell className="text-right">{item.discount_percent}%</TableCell>
                          <TableCell className="text-right font-medium">{formatCurrency(item.total || 0)}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveItem(index)}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow>
                        <TableCell colSpan={4} className="text-right font-semibold">Total:</TableCell>
                        <TableCell className="text-right font-bold text-lg">{formatCurrency(calculateTotal())}</TableCell>
                        <TableCell></TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>

            <div className={`border-t pt-4 ${invoiceType === 'purchase' ? 'bg-red-50 dark:bg-red-950' : 'bg-green-50 dark:bg-green-950'} p-4 rounded-lg`}>
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Payment Information (Optional)
              </h3>
              <p className="text-xs text-muted-foreground mb-4">
                {invoiceType === 'purchase' 
                  ? '⚠️ Payment will be recorded as EXPENSE (negative amount in red)' 
                  : '✅ Payment will be recorded as INCOME (positive amount in green)'}
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Paid Amount</Label>
                  <Input
                    type="number"
                    value={paidAmount}
                    onChange={(e) => setPaidAmount(e.target.value)}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    className={paidAmount ? (invoiceType === 'purchase' ? 'border-red-500' : 'border-green-500') : ''}
                  />
                  {paidAmount && (
                    <p className={`text-xs mt-1 font-medium ${invoiceType === 'purchase' ? 'text-red-600' : 'text-green-600'}`}>
                      Will be recorded as: {invoiceType === 'purchase' ? '-' : '+'}{formatCurrency(Number(paidAmount))}
                    </p>
                  )}
                </div>
                <div>
                  <Label>Payment Method</Label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full border rounded-md p-2"
                  >
                    <option value="cash">Cash</option>
                    <option value="card">Card</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="check">Check</option>
                  </select>
                </div>
                <div>
                  <Label>Reference Number</Label>
                  <Input
                    value={referenceNumber}
                    onChange={(e) => setReferenceNumber(e.target.value)}
                    placeholder="Transaction reference"
                  />
                </div>
                <div>
                  <Label>Notes</Label>
                  <Input
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Optional notes"
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={handleCloseCreateDialog}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateInvoice}
              disabled={createInvoiceMutation.isPending}
              className="w-full sm:w-auto"
            >
              {createInvoiceMutation.isPending ? 'Creating...' : 'Create Invoice'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invoice Details Dialog */}
      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>Invoice Details</DialogTitle>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrintPOSReceipt}
                  title="Print POS Receipt (80mm)"
                >
                  <Receipt className="mr-2 h-4 w-4" />
                  Receipt
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrintInvoice}
                  title="Print A4 Invoice"
                >
                  <Printer className="mr-2 h-4 w-4" />
                  Invoice
                </Button>
              </div>
            </div>
          </DialogHeader>
          {selectedInvoice && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Invoice Number</Label>
                  <p className="font-medium">{selectedInvoice.invoice_number}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Date</Label>
                  <p className="font-medium">{formatDateTime(selectedInvoice.created_at)}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Customer</Label>
                  <p className="font-medium">{selectedInvoice.customer_name || '-'}</p>
                </div>
                {selectedInvoice.van_name && (
                  <div>
                    <Label className="text-muted-foreground">Van</Label>
                    <p className="font-medium">{selectedInvoice.van_name}</p>
                  </div>
                )}
              </div>

              <div className="border-t pt-4">
                <h3 className="font-semibold mb-3">Items</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead className="text-right">Quantity</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedInvoice.items?.map((item: any, index: number) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{item.product_name || item.name_en}</TableCell>
                        <TableCell className="text-right">{item.quantity}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.unit_price)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.total)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="border-t pt-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span className="font-medium">{formatCurrency(selectedInvoice.subtotal)}</span>
                  </div>
                  {selectedInvoice.tax_amount > 0 && (
                    <div className="flex justify-between">
                      <span>Tax:</span>
                      <span className="font-medium">{formatCurrency(selectedInvoice.tax_amount)}</span>
                    </div>
                  )}
                  {selectedInvoice.discount_amount > 0 && (
                    <div className="flex justify-between">
                      <span>Discount:</span>
                      <span className="font-medium text-red-600">-{formatCurrency(selectedInvoice.discount_amount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-bold border-t pt-2">
                    <span>Total:</span>
                    <span>{formatCurrency(selectedInvoice.total_amount)}</span>
                  </div>
                  <div className="flex justify-between text-green-600">
                    <span>Paid:</span>
                    <span className="font-medium">{formatCurrency(selectedInvoice.paid_amount)}</span>
                  </div>
                  <div className="flex justify-between text-red-600 font-semibold">
                    <span>Remaining:</span>
                    <span>{formatCurrency(selectedInvoice.total_amount - selectedInvoice.paid_amount)}</span>
                  </div>
                </div>
              </div>

              {selectedInvoice.payment_status !== 'paid' && (
                <div className="border-t pt-4">
                  <Button
                    onClick={() => setIsPaymentDialogOpen(true)}
                    className="w-full"
                  >
                    <DollarSign className="mr-2 h-4 w-4" />
                    Add Payment
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Payment Dialog */}
      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add Payment</DialogTitle>
          </DialogHeader>
          {selectedInvoice && (
            <div className="space-y-4">
              <div className="bg-muted p-4 rounded-md">
                <div className="flex justify-between mb-2">
                  <span>Invoice Total:</span>
                  <span className="font-medium">{formatCurrency(selectedInvoice.total_amount)}</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span>Already Paid:</span>
                  <span className="font-medium text-green-600">{formatCurrency(selectedInvoice.paid_amount)}</span>
                </div>
                <div className="flex justify-between font-bold border-t pt-2">
                  <span>Remaining:</span>
                  <span className="text-red-600">{formatCurrency(selectedInvoice.total_amount - selectedInvoice.paid_amount)}</span>
                </div>
              </div>

              <div>
                <Label>Payment Amount <span className="text-red-500">*</span></Label>
                <Input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="0.00"
                  min="0"
                  max={selectedInvoice.total_amount - selectedInvoice.paid_amount}
                  step="0.01"
                />
              </div>

              <div>
                <Label>Payment Method</Label>
                <select
                  value={paymentDialogMethod}
                  onChange={(e) => setPaymentDialogMethod(e.target.value)}
                  className="w-full border rounded-md p-2"
                >
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="check">Check</option>
                </select>
              </div>

              <div>
                <Label>Reference Number (Optional)</Label>
                <Input
                  value={paymentDialogReference}
                  onChange={(e) => setPaymentDialogReference(e.target.value)}
                  placeholder="Transaction reference"
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsPaymentDialogOpen(false);
                setPaymentAmount('');
                setPaymentDialogMethod('cash');
                setPaymentDialogReference('');
              }}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddPayment}
              disabled={createPaymentMutation.isPending}
              className="w-full sm:w-auto"
            >
              {createPaymentMutation.isPending ? 'Processing...' : 'Add Payment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
