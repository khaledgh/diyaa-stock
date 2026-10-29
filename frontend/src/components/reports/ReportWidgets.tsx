import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDownRight, ArrowUpRight, Minus, LucideIcon } from 'lucide-react';
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card, CardContent } from '@/components/ui/card';
import { cn, formatCompactCurrency, formatCurrency } from '@/lib/utils';
import { useSettingsStore } from '@/store/settingsStore';

// Mirrors --chart-* in index.css; recharts needs literal colors for SVG attributes.
const CHART_COLORS = {
  light: { sales: '#2a78d6', collections: '#eb6834', grid: '#e5e7eb', axis: '#6b7280' },
  dark: { sales: '#3987e5', collections: '#d95926', grid: '#263247', axis: '#9aa4b2' },
};

export function useChartColors() {
  const theme = useSettingsStore((s) => s.theme);
  return CHART_COLORS[theme === 'dark' ? 'dark' : 'light'];
}

export function percentChange(current: number, previous: number): number | null {
  if (!previous) return current ? null : 0;
  return ((current - previous) / Math.abs(previous)) * 100;
}

export function DeltaBadge({ current, previous, label = 'vs last month' }: { current: number; previous: number; label?: string }) {
  const pct = percentChange(current, previous);
  if (pct === null) {
    return <span className="text-xs text-muted-foreground">New this period</span>;
  }
  const up = pct > 0.05;
  const down = pct < -0.05;
  const Icon = up ? ArrowUpRight : down ? ArrowDownRight : Minus;
  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
      <span
        className={cn(
          'inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 font-medium',
          up && 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
          down && 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300',
          !up && !down && 'bg-muted text-muted-foreground'
        )}
      >
        <Icon className="h-3 w-3" aria-hidden />
        {Math.abs(pct).toFixed(1)}%
      </span>
      {label}
    </span>
  );
}

interface StatTileProps {
  label: string;
  value: ReactNode;
  icon?: LucideIcon;
  hint?: ReactNode;
  to?: string;
  emphasis?: boolean;
}

export function StatTile({ label, value, icon: Icon, hint, to, emphasis }: StatTileProps) {
  const body = (
    <Card className={cn('h-full transition-colors', to && 'hover:border-primary/40', emphasis && 'border-primary/30 bg-primary/[0.03]')}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          {Icon && (
            <span className="rounded-md bg-muted p-1.5">
              <Icon className="h-4 w-4 text-muted-foreground" aria-hidden />
            </span>
          )}
        </div>
        <p className="mt-2 text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
        {hint && <div className="mt-1.5 min-h-[1.25rem]">{hint}</div>}
      </CardContent>
    </Card>
  );
  return to ? <Link to={to} className="block h-full">{body}</Link> : body;
}

export interface TrendPoint {
  date: string;
  sales: number;
  collections: number;
}

function formatTick(value: string, granularity: 'day' | 'month') {
  if (granularity === 'month') {
    const [y, m] = value.split('-').map(Number);
    return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
  }
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function SalesTrendChart({
  data,
  granularity = 'day',
  height = 300,
}: {
  data: TrendPoint[];
  granularity?: 'day' | 'month';
  height?: number;
}) {
  const colors = useChartColors();
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={colors.sales} stopOpacity={0.18} />
              <stop offset="100%" stopColor={colors.sales} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={colors.grid} strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={(v) => formatTick(v, granularity)}
            tickLine={false}
            axisLine={false}
            fontSize={12}
            tick={{ fill: colors.axis }}
            minTickGap={24}
          />
          <YAxis
            tickFormatter={(v) => formatCompactCurrency(v)}
            tickLine={false}
            axisLine={false}
            fontSize={12}
            tick={{ fill: colors.axis }}
            width={64}
          />
          <Tooltip
            cursor={{ stroke: colors.axis, strokeDasharray: '3 3' }}
            contentStyle={{
              borderRadius: 8,
              border: '1px solid hsl(var(--border))',
              background: 'hsl(var(--popover))',
              color: 'hsl(var(--popover-foreground))',
              fontSize: 12,
            }}
            labelFormatter={(v) => formatTick(String(v), granularity)}
            formatter={(value: number, name: string) => [formatCurrency(Number(value)), name]}
          />
          <Legend verticalAlign="top" align="right" height={28} iconType="plainline" wrapperStyle={{ fontSize: 12 }} />
          <Area
            type="monotone"
            dataKey="sales"
            name="Sales"
            stroke={colors.sales}
            strokeWidth={2}
            fill="url(#salesFill)"
            dot={false}
            activeDot={{ r: 4 }}
          />
          <Line
            type="monotone"
            dataKey="collections"
            name="Collections"
            stroke={colors.collections}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

export interface RankRow {
  id: number | string;
  name: string;
  total: number;
  sub?: ReactNode;
  to?: string;
}

// Horizontal bars, one hue, labelled with the value so color never carries meaning alone.
export function RankList({ rows, empty = 'No data for this period' }: { rows: RankRow[]; empty?: string }) {
  if (!rows.length) {
    return <p className="py-8 text-center text-sm text-muted-foreground">{empty}</p>;
  }
  const max = Math.max(...rows.map((r) => r.total), 1);
  return (
    <ul className="space-y-3">
      {rows.map((r) => {
        const content = (
          <>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="truncate font-medium">{r.name}</span>
              <span className="shrink-0 tabular-nums font-semibold">{formatCurrency(r.total)}</span>
            </div>
            <div className="mt-1.5 h-1.5 rounded-full bg-muted">
              <div
                className="h-1.5 rounded-full"
                style={{ width: `${Math.max((r.total / max) * 100, 2)}%`, background: 'var(--chart-1)' }}
              />
            </div>
            {r.sub && <p className="mt-1 text-xs text-muted-foreground">{r.sub}</p>}
          </>
        );
        return (
          <li key={r.id}>
            {r.to ? (
              <Link to={r.to} className="block rounded-md -mx-2 px-2 py-1 hover:bg-muted/60">
                {content}
              </Link>
            ) : (
              content
            )}
          </li>
        );
      })}
    </ul>
  );
}

export function SectionCard({
  title,
  action,
  children,
  className,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn('flex min-w-0 flex-col', className)}>
      <div className="flex items-center justify-between gap-2 border-b px-5 py-3.5">
        <h2 className="text-sm font-semibold">{title}</h2>
        {action}
      </div>
      <div className="flex-1 p-5">{children}</div>
    </Card>
  );
}

export function PaymentStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    paid: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
    partial: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    unpaid: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  };
  return (
    <span className={cn('inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize', styles[status] || 'bg-muted text-muted-foreground')}>
      {status || '-'}
    </span>
  );
}
