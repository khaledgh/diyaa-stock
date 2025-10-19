import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowLeft, Printer, Package, MapPin, User, Calendar, DollarSign, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { invoiceApi, paymentApi } from '@/lib/api';
import { formatCurrency, formatDateTime } from '@/lib/utils';

export default function PurchaseInvoiceDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [referenceNumber, setReferenceNumber] = useState('');

  const { data: invoice, isLoading } = useQuery({
    queryKey: ['purchase-invoice', id],
    queryFn: async () => {
      if (!id) throw new Error('Invoice ID is required');
      const response = await invoiceApi.getById(Number(id), 'purchase');
      return response.data.data;
    },
    enabled: !!id,
  });

  // Payment mutation
  const createPaymentMutation = useMutation({
    mutationFn: (data: any) => paymentApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-invoice', id] });
      toast.success('Payment recorded successfully');
      setIsPaymentDialogOpen(false);
      setPaymentAmount('');
      setPaymentMethod('cash');
      setReferenceNumber('');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to record payment');
    },
  });

  const handlePrint = () => {
    window.print();
  };
  
  const handleAddPayment = () => {
    if (!invoice || !paymentAmount) {
      toast.error('Please enter payment amount');
      return;
    }

    const remaining = invoice.total_amount - invoice.paid_amount;
    if (Number(paymentAmount) > remaining) {
      toast.error('Payment amount exceeds remaining balance');
      return;
    }

    createPaymentMutation.mutate({
      invoice_id: invoice.id,
      invoice_type: 'purchase',
      amount: Number(paymentAmount),
      payment_method: paymentMethod,
      reference_number: referenceNumber || undefined,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading invoice...</p>
        </div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-xl font-semibold">Invoice not found</p>
          <Button onClick={() => navigate('/invoices')} className="mt-4">
            Back to Invoices
          </Button>
        </div>
      </div>
    );
  }

  const remaining = invoice.total_amount - invoice.paid_amount;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between print:hidden">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/invoices')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Package className="h-8 w-8 text-blue-600" /> Purchase Invoice
            </h1>
            <p className="text-muted-foreground mt-1">{invoice.invoice_number}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {remaining > 0 && (
            <Button 
              onClick={() => setIsPaymentDialogOpen(true)} 
              variant="default"
              className="bg-green-600 hover:bg-green-700"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Payment
            </Button>
          )}
          <Button onClick={handlePrint} variant="outline">
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
        </div>
      </div>

      {/* Invoice Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>Invoice Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span className="text-sm">Date</span>
              </div>
              <p className="font-medium">{formatDateTime(invoice.created_at)}</p>
            </div>

            {invoice.location_name && (
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span className="text-sm">Location</span>
                </div>
                <p className="font-medium">
                  {invoice.location_name}
                  <span className="text-xs text-muted-foreground ml-2">
                    ({invoice.location_type})
                  </span>
                </p>
              </div>
            )}

            {invoice.vendor_name && (
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <User className="h-4 w-4" />
                  <span className="text-sm">Vendor</span>
                </div>
                <p className="font-medium">{invoice.vendor_name}</p>
                {invoice.vendor_company && (
                  <p className="text-sm text-muted-foreground">{invoice.vendor_company}</p>
                )}
              </div>
            )}

            <div className="space-y-1">
              <div className="flex items-center gap-2 text-muted-foreground">
                <DollarSign className="h-4 w-4" />
                <span className="text-sm">Payment Status</span>
              </div>
              <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${
                invoice.payment_status === 'paid' 
                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                  : invoice.payment_status === 'partial'
                  ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                  : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
              }`}>
                {invoice.payment_status}
              </span>
            </div>

            {invoice.created_by_name && (
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <User className="h-4 w-4" />
                  <span className="text-sm">Created By</span>
                </div>
                <p className="font-medium">{invoice.created_by_name}</p>
              </div>
            )}
          </div>

          {invoice.notes && (
            <div className="mt-6 pt-6 border-t">
              <p className="text-sm text-muted-foreground mb-2">Notes</p>
              <p className="text-sm">{invoice.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Items Table */}
      <Card>
        <CardHeader>
          <CardTitle>Items</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-center">Quantity</TableHead>
                  <TableHead className="text-right">Unit Price</TableHead>
                  <TableHead className="text-center">Discount</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoice.items?.map((item: any, index: number) => (
                  <TableRow key={index}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{item.product?.name_en || item.product_name || item.name_en || '-'}</p>
                        {(item.product?.sku || item.sku) && (
                          <p className="text-xs text-muted-foreground">SKU: {item.product?.sku || item.sku}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">{item.quantity}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.unit_price)}</TableCell>
                    <TableCell className="text-center">{item.discount_percent || 0}%</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(item.total)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Totals Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-3 max-w-md ml-auto">
            <div className="flex justify-between text-lg">
              <span className="text-muted-foreground">Subtotal:</span>
              <span className="font-medium">{formatCurrency(invoice.subtotal)}</span>
            </div>

            {invoice.tax_amount > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tax:</span>
                <span>{formatCurrency(invoice.tax_amount)}</span>
              </div>
            )}

            {invoice.discount_amount > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Discount:</span>
                <span className="text-red-600">-{formatCurrency(invoice.discount_amount)}</span>
              </div>
            )}

            <div className="flex justify-between text-xl font-bold border-t pt-3">
              <span>Total:</span>
              <span>{formatCurrency(invoice.total_amount)}</span>
            </div>

            <div className="flex justify-between text-lg border-t pt-3">
              <span className="text-green-600">Paid:</span>
              <span className="font-medium text-green-600">
                {formatCurrency(invoice.paid_amount)}
              </span>
            </div>

            {remaining > 0 && (
              <div className="flex justify-between text-lg">
                <span className="text-red-600 font-medium">Remaining:</span>
                <span className="font-bold text-red-600">
                  {formatCurrency(remaining)}
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Payment Dialog */}
      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add Payment</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="amount">Payment Amount</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0.01"
                max={remaining}
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                placeholder="0.00"
              />
              <p className="text-sm text-muted-foreground">
                Remaining balance: {formatCurrency(remaining)}
              </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="method">Payment Method</Label>
              <select
                id="method"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
              >
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="check">Check</option>
              </select>
            </div>
            {paymentMethod !== 'cash' && (
              <div className="grid gap-2">
                <Label htmlFor="reference">Reference Number</Label>
                <Input
                  id="reference"
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  placeholder="Transaction reference"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsPaymentDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleAddPayment}
              disabled={!paymentAmount || createPaymentMutation.isPending}
            >
              {createPaymentMutation.isPending ? 'Processing...' : 'Add Payment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Print Styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print\\:block {
            display: block !important;
          }
          .print\\:hidden {
            display: none !important;
          }
          #invoice-content, #invoice-content * {
            visibility: visible;
          }
          #invoice-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
