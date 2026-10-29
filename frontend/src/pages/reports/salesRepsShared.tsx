import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { Calendar } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { locationApi } from '@/lib/api';
import { cn, toLocalISODate } from '@/lib/utils';

export type CommissionBasis = 'sales' | 'collected';

const PRESETS = [
  { key: 'this_month', label: 'This month' },
  { key: 'last_month', label: 'Last month' },
  { key: 'this_quarter', label: 'This quarter' },
  { key: 'this_year', label: 'This year' },
] as const;

function presetRange(key: string): { from: string; to: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  switch (key) {
    case 'last_month':
      return { from: toLocalISODate(new Date(y, m - 1, 1)), to: toLocalISODate(new Date(y, m, 0)) };
    case 'this_quarter':
      return { from: toLocalISODate(new Date(y, Math.floor(m / 3) * 3, 1)), to: toLocalISODate(now) };
    case 'this_year':
      return { from: toLocalISODate(new Date(y, 0, 1)), to: toLocalISODate(now) };
    default:
      return { from: toLocalISODate(new Date(y, m, 1)), to: toLocalISODate(now) };
  }
}

// Filters live in the URL so the list and a rep's detail page share the same period.
export function useRepReportParams() {
  const [params, setParams] = useSearchParams();
  const fallback = presetRange('this_month');
  const from = params.get('from') || fallback.from;
  const to = params.get('to') || fallback.to;
  const locationId = params.get('location') || '';
  const basis: CommissionBasis = params.get('basis') === 'collected' ? 'collected' : 'sales';

  const update = (next: Partial<{ from: string; to: string; location: string; basis: string }>) => {
    const merged = new URLSearchParams(params);
    Object.entries(next).forEach(([k, v]) => (v ? merged.set(k, v) : merged.delete(k)));
    setParams(merged, { replace: true });
  };

  const apiParams = { from_date: from, to_date: to, ...(locationId ? { location_id: locationId } : {}) };
  return { from, to, locationId, basis, update, apiParams, search: params.toString() };
}

export function RepReportFilters({ showBasis = true }: { showBasis?: boolean }) {
  const { from, to, locationId, basis, update } = useRepReportParams();
  const { data: locations = [] } = useQuery({
    queryKey: ['locations', 'report-filter'],
    queryFn: async () => (await locationApi.getAll()).data.data || [],
  });
  const activePreset = PRESETS.find((p) => {
    const r = presetRange(p.key);
    return r.from === from && r.to === to;
  })?.key;

  return (
    <Card className="print:hidden">
      <CardContent className="flex flex-col gap-3 py-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => update(presetRange(p.key))}
              className={cn(
                'rounded-md border px-3 py-1.5 text-sm transition-colors',
                activePreset === p.key ? 'border-primary bg-primary text-primary-foreground' : 'hover:bg-muted'
              )}
            >
              {p.label}
            </button>
          ))}
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" aria-hidden />
            <input
              type="date"
              aria-label="From date"
              value={from}
              onChange={(e) => e.target.value && update({ from: e.target.value })}
              className="rounded-md border border-input bg-background px-2.5 py-1.5 text-sm"
            />
            <span className="text-sm text-muted-foreground">to</span>
            <input
              type="date"
              aria-label="To date"
              value={to}
              onChange={(e) => e.target.value && update({ to: e.target.value })}
              className="rounded-md border border-input bg-background px-2.5 py-1.5 text-sm"
            />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label="Location"
            value={locationId}
            onChange={(e) => update({ location: e.target.value })}
            className="rounded-md border border-input bg-background px-2.5 py-1.5 text-sm"
          >
            <option value="">All locations</option>
            {locations.map((l: any) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
          {showBasis && (
            <div className="inline-flex rounded-md border p-0.5" role="group" aria-label="Commission basis">
              {(['sales', 'collected'] as const).map((b) => (
                <button
                  key={b}
                  type="button"
                  onClick={() => update({ basis: b === 'sales' ? '' : b })}
                  className={cn(
                    'rounded px-2.5 py-1 text-sm',
                    basis === b ? 'bg-muted font-medium' : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {b === 'sales' ? 'Commission on net sales' : 'Commission on collected'}
                </button>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function commissionFor(row: { commission_on_sales: number; commission_on_collected: number }, basis: CommissionBasis) {
  return basis === 'collected' ? row.commission_on_collected : row.commission_on_sales;
}
