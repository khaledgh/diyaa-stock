import { useRef, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { usePrint } from '@/lib/print';
import { ArrowLeft, Download, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { reportApi } from '@/lib/api';
import { formatCurrency, formatDate, formatQuantity } from '@/lib/utils';
import { exportToExcel } from '@/lib/exportExcel';
import { usePermissions } from '@/hooks/usePermissions';
import { PaymentStatusBadge, SalesTrendChart, SectionCard, StatTile } from '@/components/reports/ReportWidgets';
import { RepReportFilters, commissionFor, useRepReportParams } from './salesRepsShared';

interface Column<T> {
  header: string;
  cell: (row: T) => ReactNode;
  align?: 'right';
}

function SimpleTable<T>({ rows, columns, rowKey, empty }: { rows: T[]; columns: Column<T>[]; rowKey: (r: T) => string | number; empty: string }) {
  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs text-muted-foreground">
            <tr>
              {columns.map((c) => (
                <th key={c.header} className={`px-4 py-2.5 font-medium ${c.align === 'right' ? 'text-right' : 'text-left'}`}>
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="py-10 text-center text-muted-foreground">{empty}</td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={rowKey(r)} className="hover:bg-muted/40">
                  {columns.map((c) => (
                    <td key={c.header} className={`px-4 py-2.5 ${c.align === 'right' ? 'text-right tabular-nums' : ''}`}>
                      {c.cell(r)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function SettlementLine({ label, value, note, strong }: { label: string; value: number; note?: string; strong?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5">
      <div>
        <p className={strong ? 'font-semibold' : 'text-sm'}>{label}</p>
        {note && <p className="text-xs text-muted-foreground">{note}</p>}
      </div>
      <p className={`tabular-nums ${strong ? 'text-lg font-semibold text-primary' : 'font-medium'}`}>{formatCurrency(value)}</p>
    </div>
  );
}

export default function SalesRepDetail() {
  const { id } = useParams();
  const printRef = useRef<HTMLDivElement>(null);
  const { from, to, basis, apiParams, search } = useRepReportParams();
  const { isSales } = usePermissions();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['sales-rep-detail', id, apiParams],
    queryFn: async () => {
      const response = await reportApi.salesRepDetail(Number(id), apiParams);
      return response.data.data || response.data;
    },
    enabled: !!id,
  });

  const rep = data?.rep;
  const handlePrint = usePrint(printRef, `Sales_Rep_${rep?.name || id}_${from}_${to}`);

  const handleExport = () => {
    if (!data) return;
    const name = `Sales_Rep_${(rep?.name || id).toString().replace(/\s+/g, '_')}_${from}_${to}`;
    exportToExcel(
      data.products.map((p: any) => ({ ...p, net_qty: p.quantity - p.returned, profit: p.total - p.cost })),
      [
        { key: 'name', header: 'Product' },
        { key: 'sku', header: 'SKU' },
        { key: 'quantity', header: 'Qty Sold', format: 'number' },
        { key: 'returned', header: 'Qty Returned', format: 'number' },
        { key: 'net_qty', header: 'Net Qty', format: 'number' },
        { key: 'total', header: 'Net Sales', format: 'currency' },
        { key: 'cost', header: 'Cost', format: 'currency' },
        { key: 'profit', header: 'Profit', format: 'currency' },
      ],
      name,
      'Products'
    );
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (isError || !rep) {
    return (
      <div className="p-6 space-y-4">
        <Link to={`/reports/sales-reps?${search}`} className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        <p className="text-muted-foreground">This sales rep could not be loaded.</p>
      </div>
    );
  }

  const commission = commissionFor(rep, basis);
  const netQty = (p: any) => p.quantity - p.returned;

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link to={isSales() ? '/dashboard' : `/reports/sales-reps?${search}`}>
            <Button variant="ghost" size="icon" aria-label="Back">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{rep.name}</h1>
            <p className="text-sm text-muted-foreground">
              {[rep.location_name, rep.phone, rep.commission_rate ? `${rep.commission_rate}% commission` : 'No commission rate set']
                .filter(Boolean)
                .join(' · ')}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport} className="gap-2" disabled={!data.products.length}>
            <Download className="h-4 w-4" /> Excel
          </Button>
          <Button variant="outline" onClick={() => handlePrint()} className="gap-2">
            <Printer className="h-4 w-4" /> Print
          </Button>
        </div>
      </div>

      <RepReportFilters />

      <div ref={printRef} className="space-y-6">
        <p className="hidden print:block text-sm">
          {rep.name} · {formatDate(from)} – {formatDate(to)}
        </p>

        <div className="grid gap-4 lg:grid-cols-3">
          <SectionCard title="Settlement for this period">
            <div className="divide-y">
              <SettlementLine label="Net sales" value={rep.net_sales} note={`${formatCurrency(rep.gross_sales)} sold − ${formatCurrency(rep.returns)} returned`} />
              <SettlementLine label="Cash collected by rep" value={rep.collected} note="To be handed over to the company" />
              <SettlementLine label="Still owed by customers" value={rep.outstanding} note="On this period's invoices" />
              <SettlementLine
                strong
                label="Commission owed to rep"
                value={commission}
                note={`${rep.commission_rate || 0}% of ${basis === 'collected' ? 'cash collected' : 'net sales'}`}
              />
            </div>
          </SectionCard>
          <SectionCard title={data.granularity === 'month' ? 'Monthly trend' : 'Daily trend'} className="lg:col-span-2">
            <SalesTrendChart data={data.trend || []} granularity={data.granularity} height={260} />
          </SectionCard>
        </div>

        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <StatTile label="Invoices" value={rep.invoices} hint={<span className="text-xs text-muted-foreground">{rep.customers} customers served</span>} />
          <StatTile label="Units sold (net)" value={formatQuantity(rep.items_sold)} hint={<span className="text-xs text-muted-foreground">{data.products.length} products</span>} />
          <StatTile label="Gross profit" value={formatCurrency(rep.gross_profit)} hint={<span className="text-xs text-muted-foreground">{rep.margin_percent.toFixed(1)}% margin</span>} />
          <StatTile label="Discounts given" value={formatCurrency(rep.discounts)} hint={<span className="text-xs text-muted-foreground">Invoice-level discounts</span>} />
        </div>

        <Tabs defaultValue="products">
          <TabsList className="print:hidden">
            <TabsTrigger value="products">Products ({data.products.length})</TabsTrigger>
            <TabsTrigger value="customers">Customers ({data.customers.length})</TabsTrigger>
            <TabsTrigger value="locations">Locations ({data.locations.length})</TabsTrigger>
            <TabsTrigger value="payments">Collections ({data.payments.length})</TabsTrigger>
            <TabsTrigger value="invoices">Invoices ({data.invoices.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="products" className="mt-4">
            <SimpleTable
              rows={data.products}
              rowKey={(r: any) => r.id}
              empty="No products sold in this period"
              columns={[
                { header: 'Product', cell: (r: any) => (<><p className="font-medium">{r.name}</p><p className="text-xs text-muted-foreground font-mono">{r.sku}</p></>) },
                { header: 'Sold', align: 'right', cell: (r: any) => formatQuantity(r.quantity) },
                { header: 'Returned', align: 'right', cell: (r: any) => (r.returned ? formatQuantity(r.returned) : '–') },
                { header: 'Net qty', align: 'right', cell: (r: any) => <span className="font-medium">{formatQuantity(netQty(r))}</span> },
                { header: 'Net sales', align: 'right', cell: (r: any) => formatCurrency(r.total) },
                { header: 'Profit', align: 'right', cell: (r: any) => formatCurrency(r.total - r.cost) },
                { header: 'Share', align: 'right', cell: (r: any) => (rep.net_sales > 0 ? `${((r.total / rep.net_sales) * 100).toFixed(1)}%` : '–') },
              ]}
            />
          </TabsContent>

          <TabsContent value="customers" className="mt-4">
            <SimpleTable
              rows={data.customers}
              rowKey={(r: any) => r.id}
              empty="No customers in this period"
              columns={[
                { header: 'Customer', cell: (r: any) => (r.id ? <Link to={`/customers/${r.id}`} className="font-medium text-primary hover:underline">{r.name}</Link> : <span className="font-medium">{r.name}</span>) },
                { header: 'Invoices', align: 'right', cell: (r: any) => r.invoices },
                { header: 'Sales', align: 'right', cell: (r: any) => formatCurrency(r.total) },
                { header: 'Paid', align: 'right', cell: (r: any) => formatCurrency(r.paid) },
                { header: 'Outstanding', align: 'right', cell: (r: any) => <span className={r.outstanding > 0 ? 'font-medium text-red-600 dark:text-red-400' : ''}>{formatCurrency(r.outstanding)}</span> },
              ]}
            />
          </TabsContent>

          <TabsContent value="locations" className="mt-4">
            <SimpleTable
              rows={data.locations}
              rowKey={(r: any) => r.id}
              empty="No sales in this period"
              columns={[
                { header: 'Location', cell: (r: any) => <span className="font-medium">{r.name}</span> },
                { header: 'Invoices', align: 'right', cell: (r: any) => r.invoices },
                { header: 'Sales', align: 'right', cell: (r: any) => formatCurrency(r.total) },
                { header: 'Paid on invoices', align: 'right', cell: (r: any) => formatCurrency(r.paid) },
              ]}
            />
          </TabsContent>

          <TabsContent value="payments" className="mt-4 space-y-4">
            {data.payment_methods.length > 0 && (
              <div className="flex flex-wrap gap-3">
                {data.payment_methods.map((m: any) => (
                  <div key={m.payment_method} className="rounded-lg border px-4 py-2.5">
                    <p className="text-xs capitalize text-muted-foreground">{m.payment_method.replace('_', ' ')} · {m.count}</p>
                    <p className="font-semibold tabular-nums">{formatCurrency(m.amount)}</p>
                  </div>
                ))}
              </div>
            )}
            <SimpleTable
              rows={data.payments}
              rowKey={(r: any) => r.id}
              empty="No collections recorded in this period"
              columns={[
                { header: 'Date', cell: (r: any) => <span className="whitespace-nowrap">{r.date}</span> },
                { header: 'Customer', cell: (r: any) => r.customer_name },
                { header: 'Invoice', cell: (r: any) => (r.invoice_number === '-' ? <span className="text-muted-foreground">Unallocated</span> : r.invoice_number) },
                { header: 'Method', cell: (r: any) => <span className="capitalize">{(r.payment_method || '').replace('_', ' ')}</span> },
                { header: 'Amount', align: 'right', cell: (r: any) => <span className="font-medium">{formatCurrency(r.amount)}</span> },
              ]}
            />
          </TabsContent>

          <TabsContent value="invoices" className="mt-4">
            <SimpleTable
              rows={data.invoices}
              rowKey={(r: any) => r.id}
              empty="No invoices in this period"
              columns={[
                { header: 'Invoice', cell: (r: any) => <Link to={`/invoices/sales/${r.id}`} className="font-medium text-primary hover:underline">{r.invoice_number}</Link> },
                { header: 'Date', cell: (r: any) => <span className="whitespace-nowrap">{r.date}</span> },
                { header: 'Customer', cell: (r: any) => r.customer_name },
                { header: 'Location', cell: (r: any) => r.location_name },
                { header: 'Status', cell: (r: any) => <PaymentStatusBadge status={r.payment_status} /> },
                { header: 'Total', align: 'right', cell: (r: any) => formatCurrency(r.total_amount) },
                { header: 'Balance', align: 'right', cell: (r: any) => formatCurrency(r.balance) },
              ]}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
