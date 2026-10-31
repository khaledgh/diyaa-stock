import { useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { usePrint } from '@/lib/print';
import { ArrowLeft, Banknote, ChevronRight, CircleDollarSign, Download, HandCoins, Info, Printer, TrendingUp, UserRound, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { reportApi } from '@/lib/api';
import { formatCurrency, formatDate, formatQuantity } from '@/lib/utils';
import { exportToExcel } from '@/lib/exportExcel';
import { StatTile } from '@/components/reports/ReportWidgets';
import { RepReportFilters, commissionFor, useRepReportParams } from './salesRepsShared';

export default function SalesRepsReport() {
  const printRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { from, to, basis, apiParams, search } = useRepReportParams();

  const { data: report, isLoading } = useQuery({
    queryKey: ['sales-reps-report', apiParams],
    queryFn: async () => {
      const response = await reportApi.salesReps(apiParams);
      return response.data.data || response.data;
    },
  });

  const reps: any[] = [...(report?.reps || [])].sort((a, b) => b.net_sales - a.net_sales);
  const s = report?.summary || {};
  const totalCommission = basis === 'collected' ? s.commission_on_collected : s.commission_on_sales;

  const handlePrint = usePrint(printRef, `Sales_Reps_${from}_${to}`);

  const handleExport = () =>
    exportToExcel(
      reps.map((r) => ({ ...r, commission: commissionFor(r, basis) })),
      [
        { key: 'name', header: 'Sales Rep' },
        { key: 'location_name', header: 'Location' },
        { key: 'invoices', header: 'Invoices', format: 'number' },
        { key: 'customers', header: 'Customers', format: 'number' },
        { key: 'items_sold', header: 'Units Sold', format: 'number' },
        { key: 'gross_sales', header: 'Gross Sales', format: 'currency' },
        { key: 'returns', header: 'Returns', format: 'currency' },
        { key: 'net_sales', header: 'Net Sales', format: 'currency' },
        { key: 'gross_profit', header: 'Gross Profit', format: 'currency' },
        { key: 'collected', header: 'Cash Collected', format: 'currency' },
        { key: 'outstanding', header: 'Outstanding', format: 'currency' },
        { key: 'commission_rate', header: 'Commission %', format: 'number' },
        { key: 'commission', header: basis === 'collected' ? 'Commission (on collected)' : 'Commission (on net sales)', format: 'currency' },
      ],
      `Sales_Reps_${from}_${to}`,
      'Sales Reps'
    );

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link to="/reports">
            <Button variant="ghost" size="icon" aria-label="Back to reports">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Sales Reps & Commissions</h1>
            <p className="text-sm text-muted-foreground">What each rep sold, collected, and is owed</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport} disabled={!reps.length} className="gap-2">
            <Download className="h-4 w-4" /> Excel
          </Button>
          <Button variant="outline" onClick={() => handlePrint()} className="gap-2">
            <Printer className="h-4 w-4" /> Print
          </Button>
        </div>
      </div>

      <RepReportFilters />

      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : (
        <div ref={printRef} className="space-y-6">
          <p className="hidden print:block text-sm">
            Sales Reps & Commissions · {formatDate(from)} – {formatDate(to)}
          </p>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <StatTile label="Net Sales" icon={CircleDollarSign} value={formatCurrency(s.net_sales || 0)}
              hint={<span className="text-xs text-muted-foreground">{s.invoices || 0} invoices · {formatCurrency(s.returns || 0)} returns</span>} />
            <StatTile label="Gross Profit" icon={TrendingUp} value={formatCurrency(s.gross_profit || 0)}
              hint={<span className="text-xs text-muted-foreground">{(s.margin_percent || 0).toFixed(1)}% margin</span>} />
            <StatTile label="Cash Collected" icon={Banknote} value={formatCurrency(s.collected || 0)}
              hint={<span className="text-xs text-muted-foreground">Payments recorded by reps</span>} />
            <StatTile label="Outstanding" icon={Wallet} value={formatCurrency(s.outstanding || 0)}
              hint={<span className="text-xs text-muted-foreground">Unpaid on this period's invoices</span>} />
            <StatTile label="Commission Payable" icon={HandCoins} emphasis value={formatCurrency(totalCommission || 0)}
              hint={<span className="text-xs text-muted-foreground">{basis === 'collected' ? 'On cash collected' : 'On net sales'}</span>} />
          </div>

          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs text-muted-foreground">
                  <tr className="text-left">
                    <th className="px-4 py-3 font-medium">Sales rep</th>
                    <th className="px-3 py-3 text-right font-medium">Invoices</th>
                    <th className="px-3 py-3 text-right font-medium">Units</th>
                    <th className="px-3 py-3 text-right font-medium">Gross sales</th>
                    <th className="px-3 py-3 text-right font-medium">Returns</th>
                    <th className="px-3 py-3 text-right font-medium">Net sales</th>
                    <th className="px-3 py-3 text-right font-medium">Gross profit</th>
                    <th className="px-3 py-3 text-right font-medium">Collected</th>
                    <th className="px-3 py-3 text-right font-medium">Outstanding</th>
                    <th className="px-3 py-3 text-right font-medium">Rate</th>
                    <th className="px-4 py-3 text-right font-medium">Commission</th>
                    <th className="w-8 print:hidden" />
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {reps.length === 0 ? (
                    <tr>
                      <td colSpan={12} className="py-12 text-center text-muted-foreground">
                        <UserRound className="mx-auto mb-2 h-10 w-10 opacity-20" />
                        No sales reps or sales in this period
                      </td>
                    </tr>
                  ) : (
                    reps.map((r) => (
                      <tr
                        key={r.user_id}
                        onClick={() => navigate(`/reports/sales-reps/${r.user_id}?${search}`)}
                        className="cursor-pointer hover:bg-muted/40"
                      >
                        <td className="px-4 py-3">
                          <p className="font-medium">{r.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {r.location_name || (r.role === 'sales' ? 'No fixed location' : r.role)} · {r.customers} customers
                          </p>
                        </td>
                        <td className="px-3 py-3 text-right tabular-nums">{r.invoices}</td>
                        <td className="px-3 py-3 text-right tabular-nums">{formatQuantity(r.items_sold)}</td>
                        <td className="px-3 py-3 text-right tabular-nums">{formatCurrency(r.gross_sales)}</td>
                        <td className="px-3 py-3 text-right tabular-nums text-muted-foreground">{r.returns ? `−${formatCurrency(r.returns)}` : '–'}</td>
                        <td className="px-3 py-3 text-right tabular-nums font-medium">{formatCurrency(r.net_sales)}</td>
                        <td className="px-3 py-3 text-right tabular-nums">
                          {formatCurrency(r.gross_profit)}
                          <span className="block text-xs text-muted-foreground">{r.margin_percent.toFixed(1)}%</span>
                        </td>
                        <td className="px-3 py-3 text-right tabular-nums">{formatCurrency(r.collected)}</td>
                        <td className="px-3 py-3 text-right tabular-nums">{formatCurrency(r.outstanding)}</td>
                        <td className="px-3 py-3 text-right tabular-nums">{r.commission_rate ? `${r.commission_rate}%` : '–'}</td>
                        <td className="px-4 py-3 text-right tabular-nums font-semibold text-primary">{formatCurrency(commissionFor(r, basis))}</td>
                        <td className="pr-3 text-muted-foreground print:hidden"><ChevronRight className="h-4 w-4" /></td>
                      </tr>
                    ))
                  )}
                </tbody>
                {reps.length > 0 && (
                  <tfoot className="border-t-2 bg-muted/50 font-semibold">
                    <tr>
                      <td className="px-4 py-3">Total</td>
                      <td className="px-3 py-3 text-right tabular-nums">{s.invoices}</td>
                      <td className="px-3 py-3 text-right tabular-nums">{formatQuantity(s.items_sold)}</td>
                      <td className="px-3 py-3 text-right tabular-nums">{formatCurrency(s.gross_sales)}</td>
                      <td className="px-3 py-3 text-right tabular-nums">{s.returns ? `−${formatCurrency(s.returns)}` : '–'}</td>
                      <td className="px-3 py-3 text-right tabular-nums">{formatCurrency(s.net_sales)}</td>
                      <td className="px-3 py-3 text-right tabular-nums">{formatCurrency(s.gross_profit)}</td>
                      <td className="px-3 py-3 text-right tabular-nums">{formatCurrency(s.collected)}</td>
                      <td className="px-3 py-3 text-right tabular-nums">{formatCurrency(s.outstanding)}</td>
                      <td />
                      <td className="px-4 py-3 text-right tabular-nums text-primary">{formatCurrency(totalCommission || 0)}</td>
                      <td className="print:hidden" />
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </Card>

          <p className="flex items-start gap-2 text-xs text-muted-foreground">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            Sales are credited to the user who created the invoice; draft and deleted invoices are excluded. Net sales = gross sales − approved
            returns. Collected = customer payments the rep recorded in the period (the cash they should hand over). Commission uses each rep's rate
            set under Settings → Users.
          </p>
        </div>
      )}
    </div>
  );
}
