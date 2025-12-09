import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { DollarSign, FileText, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Combobox } from '@/components/ui/combobox';
import { paymentAllocationApi, customerApi, vendorApi, api } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';

export default function PaymentAllocation() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [invoiceType, setInvoiceType] = useState<'sales' | 'purchase'>('sales');
  const [selectedEntity, setSelectedEntity] = useState('');
  const [maxAmount, setMaxAmount] = useState<number>(0);
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [referenceNumber, setReferenceNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [allocationPreview, setAllocationPreview] = useState<any>(null);

  // Fetch customers
  const { data: customersData } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const response = await customerApi.getAll();
      const apiData = response.data;
      if (apiData?.data && Array.isArray(apiData.data)) {
        return apiData.data;
      }
      return Array.isArray(apiData) ? apiData : [];
    },
    enabled: invoiceType === 'sales',
  });

  // Fetch vendors
  const { data: vendorsData } = useQuery({
    queryKey: ['vendors'],
    queryFn: async () => {
      const response = await vendorApi.getAll();
      const apiData = response.data;
      if (apiData?.data && Array.isArray(apiData.data)) {
        return apiData.data;
      }
      return Array.isArray(apiData) ? apiData : [];
    },
    enabled: invoiceType === 'purchase',
  });

  // Fetch unpaid/partial invoices to filter entities
  const { data: invoicesData } = useQuery({
    queryKey: ['unpaid-invoices', invoiceType],
    queryFn: async () => {
      try {
        // Fetch invoices using the general endpoint with proper invoice_type
        if (invoiceType === 'sales') {
          const response = await api.get('/invoices', {
            params: {
              invoice_type: 'sales',
              per_page: 1000,
            }
          });
          console.log('Sales invoices response:', response.data);

          // Extract invoices from response - handle different response structures
          let invoices = [];
          if (response.data?.invoices?.data && Array.isArray(response.data.invoices.data)) {
            invoices = response.data.invoices.data;
          } else if (response.data?.data && Array.isArray(response.data.data)) {
            invoices = response.data.data;
          } else if (Array.isArray(response.data)) {
            invoices = response.data;
          }

          console.log('All sales invoices before filter:', invoices.length, invoices);

          // Filter for sales invoices (exclude paid ones)
          const salesInvoices = invoices.filter((inv: any) => {
            const hasCustomer = inv.customer_id != null;
            const notPaid = inv.payment_status !== 'paid';
            console.log(`Invoice ${inv.id}: customer_id=${inv.customer_id}, status=${inv.payment_status}, include=${hasCustomer && notPaid}`);
            return hasCustomer && notPaid;
          });

          console.log('Filtered sales invoices:', salesInvoices.length, salesInvoices);
          return salesInvoices;

        } else {
          // For purchase invoices, use the general endpoint with invoice_type=purchase
          const response = await api.get('/invoices', {
            params: {
              invoice_type: 'purchase',
              per_page: 1000,
            }
          });
          console.log('Purchase invoices response:', response.data);

          // Extract invoices from response - handle different response structures
          let invoices = [];
          if (response.data?.data?.data && Array.isArray(response.data.data.data)) {
            // Purchase invoices: response.data.data.data
            invoices = response.data.data.data;
          } else if (response.data?.invoices?.data && Array.isArray(response.data.invoices.data)) {
            // Sales invoices: response.data.invoices.data
            invoices = response.data.invoices.data;
          } else if (response.data?.data && Array.isArray(response.data.data)) {
            invoices = response.data.data;
          } else if (Array.isArray(response.data)) {
            invoices = response.data;
          }

          console.log('All purchase invoices before filter:', invoices.length, invoices);

          // Filter for purchase invoices (exclude paid ones)
          const purchaseInvoices = invoices.filter((inv: any) => {
            const hasVendor = inv.vendor_id != null;
            const notPaid = inv.payment_status !== 'paid';
            console.log(`Invoice ${inv.id}: vendor_id=${inv.vendor_id}, status=${inv.payment_status}, include=${hasVendor && notPaid}`);
            return hasVendor && notPaid;
          });

          console.log('Filtered purchase invoices:', purchaseInvoices.length, purchaseInvoices);
          return purchaseInvoices;
        }
      } catch (error) {
        console.error('Failed to fetch invoices:', error);
        return [];
      }
    },
  });

  const customers = Array.isArray(customersData) ? customersData : [];
  const vendors = Array.isArray(vendorsData) ? vendorsData : [];
  const invoices = Array.isArray(invoicesData) ? invoicesData : [];

  console.log('Payment Allocation Data:', {
    invoiceType,
    customersCount: customers.length,
    vendorsCount: vendors.length,
    invoicesCount: invoices.length,
    invoices: invoices
  });

  // Filter customers/vendors to only show those with unpaid invoices
  const entitiesWithUnpaidInvoices = invoiceType === 'sales'
    ? customers.filter((c: any) => 
        invoices.some((inv: any) => inv.customer_id === c.id)
      )
    : vendors.filter((v: any) => 
        invoices.some((inv: any) => inv.vendor_id === v.id)
      );

  console.log('Entities with unpaid invoices:', entitiesWithUnpaidInvoices);

  // Calculate total unpaid amount for each entity (including credit notes for purchase invoices)
  const entityOptions = entitiesWithUnpaidInvoices.map((entity: any) => {
    const entityInvoices = invoices.filter((inv: any) => 
      invoiceType === 'sales' ? inv.customer_id === entity.id : inv.vendor_id === entity.id
    );
    
    // For purchase invoices, subtract credit notes from total
    const totalUnpaid = entityInvoices.reduce((sum: number, inv: any) => {
      const creditNotesTotal = inv.credit_notes?.reduce((cnSum: number, cn: any) => cnSum + (cn.total_amount || 0), 0) || 0;
      const netAmount = inv.total_amount - creditNotesTotal - inv.paid_amount;
      return sum + Math.max(0, netAmount);
    }, 0);
    
    const invoiceCount = entityInvoices.length;
    
    return {
      value: entity.id?.toString() || '', 
      label: `${entity.company_name || entity.name || entity.name_en || entity.name_ar || 'Unknown'} (${invoiceCount} invoices, ${formatCurrency(totalUnpaid)} due)`
    };
  });

  console.log('Entity options for combobox:', entityOptions);

  const paymentMethodOptions = [
    { value: 'cash', label: t('paymentAllocation.cash') },
    { value: 'card', label: t('paymentAllocation.card') },
    { value: 'bank_transfer', label: t('paymentAllocation.bankTransfer') },
    { value: 'check', label: t('paymentAllocation.check') },
  ];

  // Allocate payment mutation
  const allocateMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await paymentAllocationApi.allocateFIFO(data);
      return response.data;
    },
    onSuccess: (data) => {
      setAllocationPreview(data);
      
      // Check if there's unallocated amount
      const payment = data.payment;
      if (payment && payment.unallocated_amount > 0) {
        toast.warning(`${t('paymentAllocation.unallocatedWarning')}${payment.unallocated_amount.toFixed(2)}${t('paymentAllocation.notAllocated')}`);
        toast.success(t('paymentAllocation.paymentAllocated'));
      } else {
        toast.success(t('paymentAllocation.paymentAllocated'));
      }
      
      // Reset form
      setSelectedEntity('');
      setAmount('');
      setReferenceNumber('');
      setNotes('');
      setMaxAmount(0);
      // Refetch invoices to update the combobox
      queryClient.invalidateQueries({ queryKey: ['unpaid-invoices'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || t('paymentAllocation.allocationFailed'));
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedEntity || !amount) {
      toast.error(t('paymentAllocation.fillRequired'));
      return;
    }

    const paymentAmount = parseFloat(amount);

    // Validate amount doesn't exceed total due
    if (paymentAmount > maxAmount) {
      toast.error(`${t('paymentAllocation.amountTooHigh')}${maxAmount.toFixed(2)}`);
      return;
    }

    if (paymentAmount <= 0) {
      toast.error(t('paymentAllocation.amountTooLow'));
      return;
    }

    const data: any = {
      invoice_type: invoiceType,
      // For purchase invoices, make the amount negative
      amount: invoiceType === 'purchase' ? -Math.abs(paymentAmount) : paymentAmount,
      payment_method: paymentMethod,
      payment_date: paymentDate,
    };

    if (invoiceType === 'sales') {
      data.customer_id = parseInt(selectedEntity);
      data.vendor_id = null;
    } else {
      data.vendor_id = parseInt(selectedEntity);
      data.customer_id = null;
    }

    if (referenceNumber) {
      data.reference_number = referenceNumber;
    }

    if (notes) {
      data.notes = notes;
    }

    allocateMutation.mutate(data);
  };

  const handleReset = () => {
    setAllocationPreview(null);
    setSelectedEntity('');
    setAmount('');
    setReferenceNumber('');
    setNotes('');
    setMaxAmount(0);
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
            <DollarSign className="h-8 w-8 text-green-600" />
            {t('paymentAllocation.title')}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Allocate payments to multiple invoices automatically (oldest first)
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment Form */}
        <Card>
          <CardHeader>
            <CardTitle>{t('paymentAllocation.newPayment')}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>{t('paymentAllocation.invoiceType')} *</Label>
                <select
                  value={invoiceType}
                  onChange={(e) => {
                    setInvoiceType(e.target.value as 'sales' | 'purchase');
                    setSelectedEntity('');
                    setAllocationPreview(null);
                  }}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="sales">{t('paymentAllocation.salesInvoices')}</option>
                  <option value="purchase">{t('paymentAllocation.purchaseInvoices')}</option>
                </select>
              </div>

              <div>
                <Label>{t(invoiceType === 'sales' ? 'paymentAllocation.customer' : 'paymentAllocation.vendor')} *</Label>
                <Combobox
                  options={entityOptions}
                  value={selectedEntity}
                  onChange={(value) => {
                    setSelectedEntity(value);
                    // Calculate max amount for selected entity
                    if (value) {
                      const entityInvoices = invoices.filter((inv: any) => 
                        invoiceType === 'sales' ? inv.customer_id === parseInt(value) : inv.vendor_id === parseInt(value)
                      );
                      // For purchase invoices, subtract credit notes from total
                      const totalDue = entityInvoices.reduce((sum: number, inv: any) => {
                        const creditNotesTotal = inv.credit_notes?.reduce((cnSum: number, cn: any) => cnSum + (cn.total_amount || 0), 0) || 0;
                        const netAmount = inv.total_amount - creditNotesTotal - inv.paid_amount;
                        return sum + Math.max(0, netAmount);
                      }, 0);
                      // Round to 2 decimals to match backend rounding
                      const roundedTotalDue = Math.round(totalDue * 100) / 100;
                      setMaxAmount(roundedTotalDue);
                    } else {
                      setMaxAmount(0);
                    }
                  }}
                  placeholder={t(invoiceType === 'sales' ? 'paymentAllocation.selectCustomer' : 'paymentAllocation.selectVendor')}
                  searchPlaceholder={t('paymentAllocation.search')}
                  emptyText={t('paymentAllocation.noResults')}
                />
              </div>

              <div>
                <Label>{t('paymentAllocation.paymentAmount')} *</Label>
                {maxAmount > 0 && (
                  <p className="text-sm text-muted-foreground mb-1">
                    {t('paymentAllocation.maxAmount')}: {formatCurrency(maxAmount)}
                  </p>
                )}
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  max={maxAmount > 0 ? maxAmount : undefined}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder={t('paymentAllocation.enterPaymentAmount')}
                  required
                />
              </div>

              <div>
                <Label>{t('paymentAllocation.paymentMethod')} *</Label>
                <Combobox
                  options={paymentMethodOptions}
                  value={paymentMethod}
                  onChange={setPaymentMethod}
                  placeholder={t('paymentAllocation.selectPaymentMethod')}
                  searchPlaceholder={t('paymentAllocation.search')}
                  emptyText={t('paymentAllocation.noResults')}
                />
              </div>

              <div>
                <Label>{t('paymentAllocation.paymentDate')} *</Label>
                <Input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  required
                />
              </div>

              <div>
                <Label>{t('paymentAllocation.referenceNumber')}</Label>
                <Input
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  placeholder={t('paymentAllocation.enterReferenceNumber')}
                />
              </div>

              <div>
                <Label>{t('paymentAllocation.notes')}</Label>
                <textarea
                  className="w-full px-3 py-2 border rounded-md"
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={t('paymentAllocation.enterNotes')}
                />
              </div>

              <div className="flex gap-2">
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={allocateMutation.isPending}
                >
                  {allocateMutation.isPending ? t('paymentAllocation.processing') : t('paymentAllocation.allocatePayment')}
                </Button>
                {allocationPreview && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleReset}
                  >
                    New Payment
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Allocation Preview/Result */}
        <Card>
          <CardHeader>
            <CardTitle>
              {allocationPreview ? 'Allocation Result' : 'How It Works'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!allocationPreview ? (
              <div className="space-y-4 text-sm text-muted-foreground">
                <div className="flex items-start gap-3">
                  <FileText className="h-5 w-5 mt-0.5 text-blue-600" />
                  <div>
                    <p className="font-medium text-foreground">FIFO Allocation</p>
                    <p>Payment is allocated to unpaid invoices starting from the oldest first (First In First Out)</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 mt-0.5 text-green-600" />
                  <div>
                    <p className="font-medium text-foreground">Automatic Distribution</p>
                    <p>The system automatically distributes the payment across multiple invoices until the amount is exhausted</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <DollarSign className="h-5 w-5 mt-0.5 text-orange-600" />
                  <div>
                    <p className="font-medium text-foreground">Overpayment Tracking</p>
                    <p>If payment exceeds total due, the remaining amount is tracked as unallocated</p>
                  </div>
                </div>
                <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                  <p className="font-medium text-blue-900 dark:text-blue-100">Example:</p>
                  <p className="text-sm text-blue-800 dark:text-blue-200 mt-2">
                    Payment of $2,000 will be allocated to:
                  </p>
                  <ul className="text-sm text-blue-800 dark:text-blue-200 mt-2 space-y-1 list-disc list-inside">
                    <li>Invoice #001 (oldest): $1,000 → Fully paid</li>
                    <li>Invoice #002: $500 → Fully paid</li>
                    <li>Invoice #003: $500 → Partially paid</li>
                  </ul>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Amount</p>
                    <p className="text-2xl font-bold text-green-600">
                      {formatCurrency(Math.abs(allocationPreview.data?.payment?.amount || 0))}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Allocated</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {formatCurrency(Math.abs(allocationPreview.data?.payment?.total_allocated || 0))}
                    </p>
                  </div>
                  {allocationPreview.data?.payment?.unallocated_amount > 0 && (
                    <div className="col-span-2">
                      <p className="text-sm text-muted-foreground">Unallocated</p>
                      <p className="text-xl font-bold text-orange-600">
                        {formatCurrency(Math.abs(allocationPreview.data?.payment?.unallocated_amount || 0))}
                      </p>
                    </div>
                  )}
                </div>

                <div>
                  <h3 className="font-medium mb-2">Allocation Details</h3>
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Invoice</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {allocationPreview.data?.allocations?.map((allocation: any, index: number) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium">
                              Invoice #{allocation.invoice_id}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(Math.abs(allocation.allocated_amount || 0))}
                            </TableCell>
                            <TableCell>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                allocation.invoice_status === 'paid'
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                  : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                              }`}>
                                {allocation.invoice_status || 'partial'}
                              </span>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                  <p className="text-sm text-green-800 dark:text-green-200">
                    ✓ Payment allocated successfully to {allocationPreview.data?.allocations?.length || 0} invoice(s)
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
