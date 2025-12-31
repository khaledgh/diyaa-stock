import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  DollarSign,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  User,
  Calendar
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { paymentApi, invoiceApi } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';

interface PaymentAllocationProps {
  open: boolean;
  onClose: () => void;
  entityId: number;
  entityName: string;
  type: 'sales' | 'purchase';
  onSuccess?: () => void;
}

interface Invoice {
  id: number;
  invoice_number: string;
  invoice_date: string;
  total_amount: number;
  paid_amount: number;
  remaining: number;
  payment_status: string;
}

interface Allocation {
  invoice_id: number;
  amount: number;
}

export default function PaymentAllocation({
  open,
  onClose,
  entityId,
  entityName,
  type,
  onSuccess
}: PaymentAllocationProps) {
  const queryClient = useQueryClient();

  const [totalAmount, setTotalAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [autoAllocate, setAutoAllocate] = useState(true);

  // Fetch outstanding invoices for this entity
  const { data: invoicesData, isLoading } = useQuery({
    queryKey: [type === 'sales' ? 'customer-outstanding-invoices' : 'vendor-outstanding-invoices', entityId],
    queryFn: async () => {
      const params: any = {
        invoice_type: type,
        limit: 1000
      };

      if (type === 'sales') {
        params.customer_id = entityId;
      } else {
        params.vendor_id = entityId;
      }

      const response = await invoiceApi.getAll(params);

      // Handle different API response formats
      let data: any[] = [];
      const payload = response.data;

      if (payload?.data?.data) {
        data = payload.data.data;
      } else if (payload?.data) {
        data = Array.isArray(payload.data) ? payload.data : (payload.data.invoices || []);
      } else if (payload?.invoices?.data) {
        data = payload.invoices.data;
      } else if (Array.isArray(payload)) {
        data = payload;
      }

      // Filter locally for unpaid/partial and calculate remaining
      return data
        .filter((inv: any) => inv.payment_status === 'unpaid' || inv.payment_status === 'partial')
        .map((inv: any) => {
          // Calculate net amount (Total - Approved Credit Notes)
          const creditNotesTotal = inv.credit_notes?.reduce((sum: number, cn: any) => {
            return sum + (cn.status === 'approved' ? (Number(cn.total_amount) || 0) : 0);
          }, 0) || 0;

          const netAmount = Number(inv.total_amount) - creditNotesTotal;
          const remaining = netAmount - Number(inv.paid_amount);

          return {
            ...inv,
            remaining: Math.max(0, remaining)
          };
        })
        .filter((inv: any) => inv.remaining > 0);
    },
    enabled: open && !!entityId,
  });

  const invoices: Invoice[] = invoicesData || [];
  const totalOutstanding = invoices.reduce((sum, inv) => sum + inv.remaining, 0);

  // Auto-allocate when total amount changes
  useEffect(() => {
    if (autoAllocate && totalAmount) {
      const amount = Number(totalAmount);
      let remaining = amount;
      const newAllocations: Allocation[] = [];

      // Allocate to oldest invoices first
      const sortedInvoices = [...invoices].sort((a, b) =>
        new Date(a.invoice_date || 0).getTime() - new Date(b.invoice_date || 0).getTime()
      );

      for (const invoice of sortedInvoices) {
        if (remaining <= 0) break;

        const allocationAmount = Math.min(remaining, invoice.remaining);
        if (allocationAmount > 0) {
          newAllocations.push({
            invoice_id: invoice.id,
            amount: allocationAmount
          });
          remaining -= allocationAmount;
        }
      }

      setAllocations(newAllocations);
    }
  }, [totalAmount, autoAllocate, invoices]);

  // Create payment mutation
  const createPayments = useMutation({
    mutationFn: async () => {
      // Create individual payments for each allocation
      const promises = allocations.map(allocation => {
        const payload: any = {
          invoice_id: allocation.invoice_id,
          invoice_type: type,
          amount: allocation.amount,
          payment_method: paymentMethod,
          reference_number: referenceNumber || undefined,
          notes: notes || undefined,
          payment_date: new Date().toISOString()
        };

        if (type === 'sales') {
          payload.customer_id = entityId;
        } else {
          payload.vendor_id = entityId;
        }

        return paymentApi.create(payload);
      });
      return Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: [type === 'sales' ? 'customer-outstanding-invoices' : 'vendor-outstanding-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      toast.success('Payment recorded successfully!');
      handleClose();
      onSuccess?.();
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to record payment');
    }
  });

  const handleClose = () => {
    setTotalAmount('');
    setPaymentMethod('cash');
    setReferenceNumber('');
    setNotes('');
    setAllocations([]);
    setAutoAllocate(true);
    onClose();
  };

  const updateAllocation = (invoiceId: number, amount: string) => {
    setAutoAllocate(false);
    const numAmount = Number(amount) || 0;
    const invoice = invoices.find(i => i.id === invoiceId);
    if (!invoice) return;

    const validAmount = Math.min(numAmount, invoice.remaining);

    setAllocations(prev => {
      const existing = prev.find(a => a.invoice_id === invoiceId);
      if (existing) {
        if (validAmount === 0) {
          return prev.filter(a => a.invoice_id !== invoiceId);
        }
        return prev.map(a =>
          a.invoice_id === invoiceId ? { ...a, amount: validAmount } : a
        );
      } else if (validAmount > 0) {
        return [...prev, { invoice_id: invoiceId, amount: validAmount }];
      }
      return prev;
    });
  };

  const getAllocationForInvoice = (invoiceId: number): number => {
    return allocations.find(a => a.invoice_id === invoiceId)?.amount || 0;
  };

  const totalAllocated = allocations.reduce((sum, a) => sum + a.amount, 0);
  const unallocated = Number(totalAmount) - totalAllocated;

  const canSubmit = allocations.length > 0 && totalAllocated > 0;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'partial':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-red-500" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-green-600" />
            Record Payment
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6">
          {/* Customer Info */}
          <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
            <User className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="font-medium">{entityName}</p>
              <p className="text-sm text-muted-foreground">
                Outstanding: <span className="font-medium text-red-600">{formatCurrency(totalOutstanding)}</span>
              </p>
            </div>
          </div>

          {/* Payment Amount */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Payment Amount *</Label>
              <div className="relative mt-1.5">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="number"
                  value={totalAmount}
                  onChange={(e) => setTotalAmount(e.target.value)}
                  placeholder="0.00"
                  className="pl-9"
                />
              </div>
            </div>
            <div>
              <Label>Payment Method</Label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full mt-1.5 p-2 border rounded-lg bg-background"
              >
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="check">Check</option>
              </select>
            </div>
          </div>

          {/* Reference & Notes */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Reference Number</Label>
              <Input
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                placeholder="Optional"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label>Notes</Label>
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional"
                className="mt-1.5"
              />
            </div>
          </div>

          {/* Auto-allocate toggle */}
          <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div>
              <p className="font-medium text-sm">Auto-allocate to oldest invoices</p>
              <p className="text-xs text-muted-foreground">Automatically distribute payment starting from oldest</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={autoAllocate}
                onChange={(e) => setAutoAllocate(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {/* Outstanding Invoices */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <Label>Outstanding Invoices</Label>
              <span className="text-sm text-muted-foreground">
                {invoices.length} invoice(s)
              </span>
            </div>

            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading invoices...</div>
            ) : invoices.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-500" />
                <p>No outstanding invoices</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[250px] overflow-y-auto">
                {invoices.map((invoice) => {
                  const allocation = getAllocationForInvoice(invoice.id);
                  const isFullyAllocated = allocation >= invoice.remaining;

                  return (
                    <div
                      key={invoice.id}
                      className={`p-3 border rounded-lg transition-colors ${allocation > 0
                        ? 'border-green-300 bg-green-50 dark:bg-green-900/20'
                        : 'border-gray-200'
                        }`}
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          {getStatusIcon(invoice.payment_status)}
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium text-sm">{invoice.invoice_number}</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                              <Calendar className="h-3 w-3" />
                              <span>{formatDate(invoice.invoice_date)}</span>
                            </div>
                          </div>
                        </div>

                        <div className="text-right text-sm">
                          <p className="text-muted-foreground">Remaining</p>
                          <p className="font-medium text-red-600">{formatCurrency(invoice.remaining)}</p>
                        </div>

                        <div className="w-28">
                          <Input
                            type="number"
                            value={allocation || ''}
                            onChange={(e) => updateAllocation(invoice.id, e.target.value)}
                            placeholder="0.00"
                            className="h-8 text-sm text-right"
                            max={invoice.remaining}
                          />
                        </div>

                        {isFullyAllocated && (
                          <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Allocation Summary */}
          {Number(totalAmount) > 0 && (
            <div className="border-t pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span>Total Payment:</span>
                <span className="font-medium">{formatCurrency(Number(totalAmount))}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Allocated:</span>
                <span className="font-medium text-green-600">{formatCurrency(totalAllocated)}</span>
              </div>
              {unallocated > 0 && (
                <div className="flex justify-between text-sm">
                  <span>Unallocated:</span>
                  <span className="font-medium text-yellow-600">{formatCurrency(unallocated)}</span>
                </div>
              )}
              {unallocated < 0 && (
                <div className="flex justify-between text-sm text-red-600">
                  <span>Over-allocated:</span>
                  <span className="font-medium">{formatCurrency(Math.abs(unallocated))}</span>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="border-t pt-4">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={() => createPayments.mutate()}
            disabled={!canSubmit || createPayments.isPending}
            className="bg-green-600 hover:bg-green-700"
          >
            {createPayments.isPending ? 'Processing...' : `Record Payment (${formatCurrency(totalAllocated)})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
