import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, User, Phone, Mail, MapPin, FileText, CreditCard, Clock, Receipt } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DataTable } from '@/components/data-table/DataTable';
import { Page, PaymentBadge, StatStrip } from '@/components/layout/Page';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { customerApi, invoiceApi, paymentApi, reportApi } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';

export default function CustomerOverview() {
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState('overview');
  const navigate = useNavigate();

  // Fetch customer details
  const { data: customer, isLoading: loadingCustomer } = useQuery({
    queryKey: ['customer', id],
    queryFn: async () => {
      const response = await customerApi.getById(Number(id));
      return response.data.data || response.data;
    },
    enabled: !!id,
  });

  // Fetch recent invoices
  const { data: invoices } = useQuery({
    queryKey: ['customer-invoices', id],
    queryFn: async () => {
      const response = await invoiceApi.getAll({ 
        customer_id: id, 
        invoice_type: 'sales',
        limit: 10 
      });
      // Sales list responses nest under "invoices"; tolerate the other shapes too.
      const payload = response.data.invoices || response.data.data || response.data;
      const list = Array.isArray(payload) ? payload : payload?.data;
      return Array.isArray(list) ? list : [];
    },
    enabled: !!id,
  });

  // Fetch recent payments
  const { data: payments } = useQuery({
    queryKey: ['customer-payments', id],
    queryFn: async () => {
      const response = await paymentApi.getAll({ customer_id: id });
      const payload = response.data.data || response.data;
      const list = Array.isArray(payload) ? payload : payload?.data;
      return (Array.isArray(list) ? list : []).filter((p: any) => String(p.customer_id) === String(id));
    },
    enabled: !!id,
  });

  // Fetch statement summary
  const { data: statement } = useQuery({
    queryKey: ['customer-statement-summary', id],
    queryFn: async () => {
      const fromDate = new Date(new Date().setFullYear(new Date().getFullYear() - 1))
        .toISOString().split('T')[0];
      const toDate = new Date().toISOString().split('T')[0];
      const response = await reportApi.customerStatement(Number(id), { 
        from_date: fromDate, 
        to_date: toDate 
      });
      return response.data.data || response.data;
    },
    enabled: !!id,
  });

  if (loadingCustomer) {
    return (
      <div className="flex items-center justify-center h-full p-6">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Calculate totals
  const totalSales = statement?.total_debit || 0;
  const totalPayments = statement?.total_credit || 0;
  const balance = statement?.closing_balance || 0;

  const initials = (customer?.name || '?').trim().split(/\s+/).slice(0, 2).map((p: string) => p[0]?.toUpperCase()).join('');
  const recent = (statement?.transactions || []).filter((tx: any) => tx.type !== 'opening').slice(-6).reverse();

  return (
    <Page>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <Link to="/customers" aria-label="Back" className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border bg-card text-muted-foreground hover:bg-muted hover:text-foreground">
            <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
          </Link>
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">{initials}</span>
          <div className="min-w-0">
            <h1 className="truncate text-xl font-semibold tracking-tight" dir="auto">{customer?.name}</h1>
            <p className="flex flex-wrap items-center gap-x-3 text-sm text-muted-foreground">
              {customer?.phone && (
                <span className="inline-flex items-center gap-1" dir="ltr"><Phone className="h-3.5 w-3.5" aria-hidden />{customer.phone}</span>
              )}
              {customer?.email && (
                <span className="inline-flex items-center gap-1"><Mail className="h-3.5 w-3.5" aria-hidden />{customer.email}</span>
              )}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link to={`/customers/${id}/statement`}>
            <Button variant="outline">
              <FileText className="me-1.5 h-4 w-4" />
              Statement
            </Button>
          </Link>
          <Link to={`/invoices/new?customer_id=${id}`}>
            <Button>
              <Receipt className="me-1.5 h-4 w-4" />
              New Invoice
            </Button>
          </Link>
        </div>
      </div>

      <StatStrip
        items={[
          { label: 'Total sales', value: formatCurrency(totalSales), hint: 'Last 12 months' },
          { label: 'Total paid', value: <span className="text-emerald-600 dark:text-emerald-400">{formatCurrency(totalPayments)}</span> },
          { label: 'Balance due', value: <span className={balance > 0.009 ? 'text-red-600 dark:text-red-400' : ''}>{formatCurrency(balance)}</span> },
          { label: 'Credit limit', value: customer?.credit_limit ? formatCurrency(customer.credit_limit) : 'None' },
        ]}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="invoices">
            Invoices {invoices?.length ? <span className="rounded-full bg-muted px-1.5 text-xs text-muted-foreground">{invoices.length}</span> : null}
          </TabsTrigger>
          <TabsTrigger value="payments">
            Payments {payments?.length ? <span className="rounded-full bg-muted px-1.5 text-xs text-muted-foreground">{payments.length}</span> : null}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
            <Card>
              <div className="flex items-center gap-2 border-b px-5 py-3">
                <User className="h-4 w-4 text-muted-foreground" aria-hidden />
                <h2 className="text-sm font-semibold">Customer details</h2>
              </div>
              <CardContent className="p-5">
                <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                  <div>
                    <dt className="text-xs text-muted-foreground">Name</dt>
                    <dd className="font-medium" dir="auto">{customer?.name || '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Phone</dt>
                    <dd className="font-medium" dir="ltr">{customer?.phone || '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Email</dt>
                    <dd className="truncate font-medium">{customer?.email || '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Tax number</dt>
                    <dd className="font-medium">{customer?.tax_number || '—'}</dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="h-3 w-3" aria-hidden />Address</dt>
                    <dd className="font-medium" dir="auto">{customer?.address || '—'}</dd>
                  </div>
                </dl>
              </CardContent>
            </Card>

            <Card>
              <div className="flex items-center justify-between border-b px-5 py-3">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" aria-hidden />
                  <h2 className="text-sm font-semibold">Recent activity</h2>
                </div>
                <Link to={`/customers/${id}/statement`} className="text-xs font-medium text-primary hover:underline">Full statement</Link>
              </div>
              {recent.length ? (
                <ul className="divide-y">
                  {recent.map((tx: any, idx: number) => {
                    const isInvoice = Number(tx.debit) > 0;
                    return (
                      <li key={idx} className="flex items-center gap-3 px-5 py-2.5">
                        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${isInvoice ? 'bg-blue-50 text-blue-600 dark:bg-blue-500/10' : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10'}`}>
                          {isInvoice ? <Receipt className="h-4 w-4" aria-hidden /> : <CreditCard className="h-4 w-4" aria-hidden />}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{tx.reference || tx.description}</p>
                          <p className="text-xs text-muted-foreground">{tx.description} · {formatDate(tx.date)}</p>
                        </div>
                        <span className={`text-sm font-semibold tabular-nums ${isInvoice ? '' : 'text-emerald-600 dark:text-emerald-400'}`}>
                          {isInvoice ? formatCurrency(tx.debit) : `−${formatCurrency(tx.credit)}`}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="py-10 text-center text-sm text-muted-foreground">No activity in the last 12 months</p>
              )}
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="invoices">
          <DataTable
            data={invoices || []}
            rowKey={(inv: any) => inv.id}
            defaultSort={{ id: 'date', dir: 'desc' }}
            searchPlaceholder="Search invoice…"
            onRowClick={(inv: any) => navigate(`/invoices/sales/${inv.id}`)}
            exportFileName={`invoices-${customer?.name || id}`}
            emptyTitle="No invoices yet"
            columns={[
              { id: 'number', header: 'Invoice', alwaysVisible: true, value: (inv: any) => inv.invoice_number, cell: (inv: any) => <span className="font-medium text-primary">{inv.invoice_number}</span> },
              { id: 'date', header: 'Date', value: (inv: any) => inv.invoice_date || inv.created_at, cell: (inv: any) => <span className="text-muted-foreground">{formatDate(inv.invoice_date || inv.created_at)}</span> },
              { id: 'total', header: 'Total', align: 'end', value: (inv: any) => Number(inv.total_amount), cell: (inv: any) => <span className="tabular-nums font-medium">{formatCurrency(inv.total_amount)}</span> },
              { id: 'paid', header: 'Paid', align: 'end', value: (inv: any) => Number(inv.paid_amount || 0), cell: (inv: any) => <span className="tabular-nums">{formatCurrency(inv.paid_amount || 0)}</span> },
              { id: 'status', header: 'Payment', value: (inv: any) => inv.payment_status, cell: (inv: any) => <PaymentBadge status={inv.payment_status} /> },
            ]}
          />
        </TabsContent>

        <TabsContent value="payments">
          <DataTable
            data={payments || []}
            rowKey={(p: any) => p.id}
            defaultSort={{ id: 'date', dir: 'desc' }}
            searchPlaceholder="Search payments…"
            exportFileName={`payments-${customer?.name || id}`}
            emptyTitle="No payments yet"
            columns={[
              { id: 'date', header: 'Date', value: (p: any) => p.payment_date || p.created_at, cell: (p: any) => <span className="text-muted-foreground">{formatDate(p.payment_date || p.created_at)}</span> },
              { id: 'invoice', header: 'Invoice', value: (p: any) => p.invoice_number, cell: (p: any) => <span className="font-medium">{p.invoice_number || 'Unallocated'}</span> },
              { id: 'method', header: 'Method', value: (p: any) => p.payment_method, cell: (p: any) => <span className="capitalize text-muted-foreground">{(p.payment_method || '—').replace('_', ' ')}</span> },
              { id: 'reference', header: 'Reference', value: (p: any) => p.reference_number, cell: (p: any) => <span className="font-mono text-xs">{p.reference_number || '—'}</span> },
              { id: 'amount', header: 'Amount', align: 'end', value: (p: any) => Math.abs(Number(p.amount)), cell: (p: any) => <span className="tabular-nums font-medium text-emerald-600 dark:text-emerald-400">{formatCurrency(Math.abs(Number(p.amount)))}</span> },
            ]}
          />
        </TabsContent>
      </Tabs>
    </Page>
  );
}
