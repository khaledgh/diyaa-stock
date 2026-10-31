import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Clock, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { reportApi } from '@/lib/api';
import { formatCurrency, toLocalISODate } from '@/lib/utils';
import { exportPayablesAgingPDF, exportReceivablesAgingPDF } from '@/lib/exportPDF';
import { ColumnDef, DataTable, FilterSelect } from '@/components/data-table/DataTable';
import { Page, PageHeader, StatStrip } from '@/components/layout/Page';
import { DatePicker } from '@/components/ui/date-picker';

type Kind = 'receivables' | 'payables';

const BUCKETS = [
  { id: 'current_amount', label: 'Current' },
  { id: 'days_1_15', label: '1–15 days' },
  { id: 'days_16_30', label: '16–30 days' },
  { id: 'days_31_45', label: '31–45 days' },
  { id: 'days_over_45', label: 'Over 45 days' },
] as const;

export default function AgingReport({ kind }: { kind: Kind }) {
  const navigate = useNavigate();
  const isReceivables = kind === 'receivables';
  const party = isReceivables ? 'customer' : 'vendor';
  const [asOfDate, setAsOfDate] = useState(toLocalISODate());
  const [overdueOnly, setOverdueOnly] = useState('');

  const { data: report, isLoading } = useQuery({
    queryKey: [`${kind}-aging`, asOfDate],
    queryFn: async () => {
      const response = isReceivables ? await reportApi.receivablesAging({ as_of_date: asOfDate }) : await reportApi.payablesAging({ as_of_date: asOfDate });
      return response.data.data || response.data;
    },
  });

  const rows: any[] = (isReceivables ? report?.customers : report?.vendors) || [];
  const num = (v: unknown) => Number(v || 0);
  const filtered = rows.filter((r) => !overdueOnly || num(r[overdueOnly]) > 0.009);
  const s = report?.summary || {};

  const columns: ColumnDef<any>[] = [
    {
      id: 'name',
      header: isReceivables ? 'Customer' : 'Vendor',
      alwaysVisible: true,
      value: (r) => r[`${party}_name`],
      cell: (r) => (
        <div className="min-w-0">
          <p className="truncate font-medium" dir="auto">{r[`${party}_name`]}</p>
          {r[`${party}_phone`] && r[`${party}_phone`] !== '-' && <p className="text-xs text-muted-foreground" dir="ltr">{r[`${party}_phone`]}</p>}
        </div>
      ),
    },
    ...BUCKETS.map(
      (b, i): ColumnDef<any> => ({
        id: b.id,
        header: b.label,
        align: 'end',
        value: (r) => num(r[b.id]),
        cell: (r) => {
          const v = num(r[b.id]);
          if (v < 0.01) return <span className="text-muted-foreground/50">—</span>;
          return <span className={`tabular-nums ${i >= 3 ? 'font-medium text-red-600 dark:text-red-400' : i >= 2 ? 'text-amber-700 dark:text-amber-300' : ''}`}>{formatCurrency(v)}</span>;
        },
      })
    ),
    { id: 'total_outstanding', header: 'Total', align: 'end', alwaysVisible: true, value: (r) => num(r.total_outstanding), cell: (r) => <span className="tabular-nums font-semibold">{formatCurrency(num(r.total_outstanding))}</span> },
  ];

  const statementLink = (r: any) => {
    const id = r[`${party}_id`];
    if (!id) return;
    navigate(isReceivables ? `/customers/${id}/statement` : `/vendors/${id}/statement`);
  };

  return (
    <Page>
      <PageHeader
        icon={Clock}
        backTo="/reports"
        title={isReceivables ? 'Receivables Aging' : 'Payables Aging'}
        description={isReceivables ? 'What customers owe, by how long it has been outstanding' : 'What you owe vendors, by how long it has been outstanding'}
        actions={
          <>
            <Button
              variant="outline"
              disabled={!rows.length}
              onClick={async () => (isReceivables ? await exportReceivablesAgingPDF(rows, asOfDate) : await exportPayablesAgingPDF(rows, asOfDate))}
            >
              <FileText className="me-1.5 h-4 w-4" /> PDF
            </Button>
          </>
        }
      />

      <StatStrip
        items={[
          { label: 'Total outstanding', value: formatCurrency(num(s.grand_total)), hint: `${s.total_customers ?? s.total_vendors ?? 0} ${isReceivables ? 'customers' : 'vendors'}` },
          { label: 'Current – 15 days', value: formatCurrency(num(s.current_amount) + num(s.days_1_15)) },
          { label: '16–45 days', value: formatCurrency(num(s.days_16_30) + num(s.days_31_45)) },
          {
            label: 'Over 45 days',
            value: <span className="text-red-600 dark:text-red-400">{formatCurrency(num(s.days_over_45))}</span>,
            hint: num(s.grand_total) > 0 ? `${((num(s.days_over_45) / num(s.grand_total)) * 100).toFixed(0)}% of total` : undefined,
            onClick: () => setOverdueOnly(overdueOnly === 'days_over_45' ? '' : 'days_over_45'),
            active: overdueOnly === 'days_over_45',
          },
        ]}
      />

      <DataTable
        data={filtered}
        columns={columns}
        rowKey={(r) => `${r[`${party}_id`] ?? 'none'}-${r[`${party}_name`]}`}
        loading={isLoading}
        defaultSort={{ id: 'total_outstanding', dir: 'desc' }}
        searchPlaceholder={`Search ${party}…`}
        onRowClick={statementLink}
        storageKey={`${kind}-aging`}
        exportFileName={`${kind}-aging-${asOfDate}`}
        emptyTitle="Nothing outstanding"
        activeFilterCount={overdueOnly ? 1 : 0}
        onResetFilters={() => setOverdueOnly('')}
        filters={
          <>
            <div className="inline-flex items-center gap-1.5 text-xs">
              <span className="text-muted-foreground">As of</span>
              <DatePicker size="sm" className="w-40" value={asOfDate} onChange={(v) => v && setAsOfDate(v)} />
            </div>
            <FilterSelect
              label="Has balance in"
              value={overdueOnly}
              onChange={setOverdueOnly}
              allLabel="Any bucket"
              options={BUCKETS.map((b) => ({ value: b.id, label: b.label }))}
            />
          </>
        }
        footer={(list) => ({
          name: <span className="text-xs font-medium text-muted-foreground">{list.length} {isReceivables ? 'customers' : 'vendors'}</span>,
          ...Object.fromEntries(BUCKETS.map((b) => [b.id, formatCurrency(list.reduce((t, r) => t + num(r[b.id]), 0))])),
          total_outstanding: formatCurrency(list.reduce((t, r) => t + num(r.total_outstanding), 0)),
        })}
      />
    </Page>
  );
}
