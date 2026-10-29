import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  Banknote,
  BarChart3,
  Boxes,
  CircleDollarSign,
  Clock,
  FileText,
  Package,
  PackageX,
  Plus,
  Receipt,
  ShoppingCart,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { reportApi } from '@/lib/api';
import { formatCurrency, formatDate, formatQuantity } from '@/lib/utils';
import { usePermissions } from '@/hooks/usePermissions';
import { useAuthStore } from '@/store/authStore';
import {
  DeltaBadge,
  PaymentStatusBadge,
  RankList,
  SalesTrendChart,
  SectionCard,
  StatTile,
} from '@/components/reports/ReportWidgets';

interface RankRowData {
  id: number;
  name: string;
  quantity: number;
  invoices: number;
  total: number;
}

function AttentionItem({ icon: Icon, text, to, tone }: { icon: typeof AlertTriangle; text: string; to: string; tone: 'red' | 'amber' }) {
  return (
    <Link
      to={to}
      className={
        'group inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors ' +
        (tone === 'red'
          ? 'border-red-200 bg-red-50 text-red-800 hover:bg-red-100 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200'
          : 'border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200')
      }
    >
      <Icon className="h-4 w-4 shrink-0" aria-hidden />
      <span>{text}</span>
      <ArrowRight className="h-3.5 w-3.5 opacity-60 transition-transform group-hover:translate-x-0.5" aria-hidden />
    </Link>
  );
}

function AgingBars({ aging, total }: { aging: Record<string, number>; total: number }) {
  // Older debt is riskier, so buckets step from light to dark in a single hue.
  const buckets = [
    { key: 'days_0_15', label: '0–15 days', shade: 'bg-orange-200 dark:bg-orange-900' },
    { key: 'days_16_30', label: '16–30 days', shade: 'bg-orange-300 dark:bg-orange-700' },
    { key: 'days_31_45', label: '31–45 days', shade: 'bg-orange-500 dark:bg-orange-500' },
    { key: 'days_over_45', label: 'Over 45 days', shade: 'bg-orange-700 dark:bg-orange-300' },
  ];
  return (
    <ul className="space-y-3">
      {buckets.map((b) => {
        const value = aging?.[b.key] || 0;
        const pct = total > 0 ? (value / total) * 100 : 0;
        return (
          <li key={b.key}>
            <div className="flex items-baseline justify-between text-sm">
              <span className="text-muted-foreground">{b.label}</span>
              <span className="tabular-nums font-medium">
                {formatCurrency(value)}
                <span className="ml-1.5 text-xs text-muted-foreground">{pct.toFixed(0)}%</span>
              </span>
            </div>
            <div className="mt-1.5 h-1.5 rounded-full bg-muted">
              <div className={`h-1.5 rounded-full ${b.shade}`} style={{ width: `${pct}%` }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export default function Dashboard() {
  const { t } = useTranslation();
  const { isSales } = usePermissions();
  const user = useAuthStore((s) => s.user);
  const rep = isSales();

  const { data: d, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const response = await reportApi.dashboard();
      return response.data.data || response.data;
    },
  });

  if (isLoading || !d) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const monthLabel = d.period ? `${formatDate(d.period.month_start)} – ${formatDate(d.period.today)}` : '';
  const grossMargin = d.month_net_sales > 0 ? (d.month_gross_profit / d.month_net_sales) * 100 : 0;
  const overdue = d.receivables_aging?.days_over_45 || 0;
  const collectionRate = d.month_net_sales > 0 ? (d.monthly_collections / d.month_net_sales) * 100 : 0;

  const attention = [
    !rep && d.out_of_stock_count > 0 && { icon: PackageX, tone: 'red' as const, to: '/low-stock', text: `${d.out_of_stock_count} out of stock` },
    !rep && d.low_stock_count > 0 && { icon: AlertTriangle, tone: 'amber' as const, to: '/low-stock', text: `${d.low_stock_count} products low on stock` },
    overdue > 0 && { icon: Clock, tone: 'red' as const, to: '/reports/receivables-aging', text: `${formatCurrency(overdue)} overdue more than 45 days` },
  ].filter(Boolean) as { icon: typeof AlertTriangle; tone: 'red' | 'amber'; to: string; text: string }[];

  const toRank = (rows: RankRowData[] | undefined, sub: (r: RankRowData) => string, to?: (r: RankRowData) => string | undefined) =>
    (rows || []).map((r) => ({ id: r.id, name: r.name, total: r.total, sub: sub(r), to: to?.(r) }));

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t('dashboard.title')}</h1>
          <p className="text-sm text-muted-foreground">
            Month to date · {monthLabel}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/pos">
            <Button variant="outline">
              <ShoppingCart className="mr-2 h-4 w-4" />
              POS
            </Button>
          </Link>
          <Link to="/invoices/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Sale
            </Button>
          </Link>
        </div>
      </div>

      {attention.length > 0 && (
        <div className="flex flex-wrap gap-2" role="status">
          {attention.map((a) => (
            <AttentionItem key={a.text} {...a} />
          ))}
        </div>
      )}

      {/* Headline KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {rep ? (
          <StatTile
            label="Today's Sales"
            icon={Receipt}
            value={formatCurrency(d.today_sales_total || 0)}
            hint={<span className="text-xs text-muted-foreground">{d.today_sales_count || 0} invoices · {formatCurrency(d.today_collections || 0)} collected</span>}
          />
        ) : null}
        <StatTile
          label="Net Sales"
          icon={CircleDollarSign}
          emphasis
          value={formatCurrency(d.month_net_sales || 0)}
          hint={<DeltaBadge current={d.month_net_sales || 0} previous={d.last_month_net_sales || 0} />}
        />
        {!rep && (
          <StatTile
            label="Gross Profit"
            icon={TrendingUp}
            value={formatCurrency(d.month_gross_profit || 0)}
            hint={<DeltaBadge current={d.month_gross_profit || 0} previous={d.last_month_gross_profit || 0} label={`· ${grossMargin.toFixed(1)}% margin`} />}
          />
        )}
        <StatTile
          label="Collections"
          icon={Banknote}
          value={formatCurrency(d.monthly_collections || 0)}
          hint={<DeltaBadge current={d.monthly_collections || 0} previous={d.last_month_collections || 0} />}
        />
        <StatTile
          label="Receivables"
          icon={Wallet}
          to="/reports/receivables-aging"
          value={formatCurrency(d.pending_payments || 0)}
          hint={<span className="text-xs text-muted-foreground">{d.receivables_customers || 0} customers owe money</span>}
        />
      </div>

      {/* Secondary KPIs */}
      <div className="grid gap-4 grid-cols-2 xl:grid-cols-4">
        {!rep && (
          <StatTile
            label="Net Profit"
            value={formatCurrency(d.month_net_profit || 0)}
            hint={<span className="text-xs text-muted-foreground">After {formatCurrency(d.month_expenses || 0)} expenses</span>}
            to="/reports/profit-loss"
          />
        )}
        {!rep && (
          <StatTile
            label="Payables"
            value={formatCurrency(d.payables || 0)}
            hint={<span className="text-xs text-muted-foreground">Owed to vendors</span>}
            to="/reports/payables-aging"
          />
        )}
        <StatTile
          label="Avg. Invoice"
          value={formatCurrency(d.avg_invoice_value || 0)}
          hint={<span className="text-xs text-muted-foreground">{d.month_invoices || 0} invoices this month</span>}
        />
        <StatTile
          label="Collection Rate"
          value={`${collectionRate.toFixed(0)}%`}
          hint={<span className="text-xs text-muted-foreground">Collected vs. net sales</span>}
        />
        {rep && (
          <StatTile
            label="Stock Value"
            value={formatCurrency(d.inventory_value || 0)}
            hint={<span className="text-xs text-muted-foreground">At cost, my location</span>}
          />
        )}
        {rep && user?.id && (
          <StatTile
            label="My Performance"
            value={<span className="inline-flex items-center gap-1 text-base">View report <ArrowRight className="h-4 w-4" /></span>}
            hint={<span className="text-xs text-muted-foreground">Sales, collections & commission</span>}
            to={`/reports/sales-reps/${user.id}`}
          />
        )}
      </div>

      {/* Trend + receivables */}
      <div className="grid gap-4 lg:grid-cols-3">
        <SectionCard title="Sales & collections · last 30 days" className="lg:col-span-2">
          <SalesTrendChart data={d.sales_chart || []} />
        </SectionCard>
        <SectionCard
          title="Receivables by age"
          action={
            <Link to="/reports/receivables-aging" className="text-xs font-medium text-primary hover:underline">
              Details
            </Link>
          }
        >
          <p className="text-2xl font-semibold tabular-nums">{formatCurrency(d.pending_payments || 0)}</p>
          <p className="mb-5 text-xs text-muted-foreground">Outstanding across {d.receivables_customers || 0} customers</p>
          <AgingBars aging={d.receivables_aging} total={d.pending_payments || 0} />
        </SectionCard>
      </div>

      {/* Leaders */}
      <div className={`grid gap-4 ${rep ? 'lg:grid-cols-2' : 'lg:grid-cols-3'}`}>
        <SectionCard
          title="Top products this month"
          action={<Link to="/reports/sales-by-item" className="text-xs font-medium text-primary hover:underline">All items</Link>}
        >
          <RankList rows={toRank(d.top_products, (r) => `${formatQuantity(r.quantity)} units · ${r.invoices} invoices`)} />
        </SectionCard>
        <SectionCard
          title="Top customers this month"
          action={<Link to="/reports/sales-by-customer" className="text-xs font-medium text-primary hover:underline">All customers</Link>}
        >
          <RankList
            rows={toRank(d.top_customers, (r) => `${r.invoices} invoices`, (r) => (r.id ? `/customers/${r.id}` : undefined))}
          />
        </SectionCard>
        {!rep && (
          <SectionCard
            title="Top sales reps this month"
            action={<Link to="/reports/sales-reps" className="text-xs font-medium text-primary hover:underline">Commission report</Link>}
          >
            <RankList rows={toRank(d.top_reps, (r) => `${r.invoices} invoices`, (r) => `/reports/sales-reps/${r.id}`)} />
          </SectionCard>
        )}
      </div>

      {/* Activity */}
      <div className="grid gap-4 lg:grid-cols-3">
        <SectionCard
          title="Recent invoices"
          className="lg:col-span-2"
          action={<Link to="/invoices/sales" className="text-xs font-medium text-primary hover:underline">Sales log</Link>}
        >
          {d.recent_invoices?.length ? (
            <div className="-mx-5 -my-2 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted-foreground">
                    <th className="px-5 py-2 font-medium">Invoice</th>
                    <th className="px-2 py-2 font-medium">Customer</th>
                    <th className="px-2 py-2 font-medium">Date</th>
                    <th className="px-2 py-2 font-medium">Status</th>
                    <th className="px-5 py-2 text-right font-medium">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {d.recent_invoices.map((inv: any) => (
                    <tr key={inv.id} className="hover:bg-muted/40">
                      <td className="px-5 py-2.5">
                        <Link to={`/invoices/sales/${inv.id}`} className="font-medium text-primary hover:underline">
                          {inv.invoice_number}
                        </Link>
                      </td>
                      <td className="px-2 py-2.5 max-w-[180px] truncate">{inv.customer_name}</td>
                      <td className="px-2 py-2.5 whitespace-nowrap text-muted-foreground">{formatDate(inv.created_at?.replace(' ', 'T'))}</td>
                      <td className="px-2 py-2.5"><PaymentStatusBadge status={inv.payment_status} /></td>
                      <td className="px-5 py-2.5 text-right tabular-nums font-medium">{formatCurrency(inv.total_amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">No invoices yet</p>
          )}
        </SectionCard>

        {rep ? (
          <SectionCard title="Quick access">
            <div className="grid grid-cols-2 gap-3">
              {[
                { to: '/invoices/sales', icon: FileText, label: 'Sales log' },
                { to: '/customers', icon: Users, label: 'Customers' },
                { to: '/credit-notes', icon: Receipt, label: 'Credit notes' },
                { to: '/pos', icon: ShoppingCart, label: 'POS' },
              ].map((q) => (
                <Link key={q.to} to={q.to} className="flex flex-col items-center gap-2 rounded-lg border p-4 text-sm hover:bg-muted/50">
                  <q.icon className="h-5 w-5 text-muted-foreground" aria-hidden />
                  {q.label}
                </Link>
              ))}
            </div>
          </SectionCard>
        ) : (
          <SectionCard
            title="Inventory"
            action={<Link to="/low-stock" className="text-xs font-medium text-primary hover:underline">Low stock</Link>}
          >
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-muted-foreground">Value at cost</p>
                <p className="text-lg font-semibold tabular-nums">{formatCurrency(d.inventory_value || 0)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Value at retail</p>
                <p className="text-lg font-semibold tabular-nums">{formatCurrency(d.inventory_retail_value || 0)}</p>
              </div>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {d.total_products || 0} products · {d.active_locations || 0} locations
            </p>
            <div className="mt-4 border-t pt-3">
              {d.low_stock_items?.length ? (
                <ul className="divide-y text-sm">
                  {d.low_stock_items.map((s: any) => (
                    <li key={`${s.product_id}-${s.location_name}`} className="flex items-center justify-between gap-2 py-2">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{s.name}</p>
                        <p className="text-xs text-muted-foreground">{s.location_name}</p>
                      </div>
                      <span className={`shrink-0 tabular-nums text-xs font-medium ${s.quantity <= 0 ? 'text-red-600 dark:text-red-400' : 'text-amber-700 dark:text-amber-300'}`}>
                        {formatQuantity(s.quantity)} / {formatQuantity(s.min_level)}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="flex items-center gap-2 py-3 text-sm text-muted-foreground">
                  <Boxes className="h-4 w-4" aria-hidden /> All stock levels are healthy
                </p>
              )}
            </div>
            <div className="mt-3 flex gap-2">
              <Link to="/reports/inventory-valuation" className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                <Package className="h-3.5 w-3.5" aria-hidden /> Valuation
              </Link>
              <Link to="/reports" className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                <BarChart3 className="h-3.5 w-3.5" aria-hidden /> All reports
              </Link>
            </div>
          </SectionCard>
        )}
      </div>
    </div>
  );
}
