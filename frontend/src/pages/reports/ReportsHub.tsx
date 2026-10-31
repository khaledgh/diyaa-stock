import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Boxes,
  Clock,
  CreditCard,
  FileText,
  HandCoins,
  LucideIcon,
  MapPin,
  Package,
  Receipt,
  Scale,
  Truck,
  Users,
  Warehouse,
} from 'lucide-react';
import { reportApi } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { Page, PageHeader, StatStrip } from '@/components/layout/Page';

interface ReportLink {
  name: string;
  description: string;
  href: string;
  icon: LucideIcon;
  stat?: string | null;
  statTone?: string;
}

interface ReportGroup {
  title: string;
  reports: ReportLink[];
}

function ReportRow({ report }: { report: ReportLink }) {
  return (
    <Link to={report.href} className="group flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-muted/60">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <report.icon className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{report.name}</span>
        <span className="block truncate text-xs text-muted-foreground">{report.description}</span>
      </span>
      {report.stat && <span className={`shrink-0 text-sm font-semibold tabular-nums ${report.statTone || ''}`}>{report.stat}</span>}
      <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5 group-hover:text-foreground rtl:rotate-180" aria-hidden />
    </Link>
  );
}

export default function ReportsHub() {
  const { data: receivablesData } = useQuery({
    queryKey: ['receivables-aging-summary'],
    queryFn: async () => {
      const response = await reportApi.receivablesAging();
      return response.data.data || response.data;
    },
  });

  const { data: payablesData } = useQuery({
    queryKey: ['payables-aging-summary'],
    queryFn: async () => {
      const response = await reportApi.payablesAging();
      return response.data.data || response.data;
    },
  });

  const receivables = Number(receivablesData?.summary?.grand_total || 0);
  const payables = Number(payablesData?.summary?.grand_total || 0);
  const overdue = Number(receivablesData?.summary?.days_over_45 || 0);
  const net = receivables - payables;

  const groups: ReportGroup[] = [
    {
      title: 'Sales',
      reports: [
        { name: 'Sales Reps & Commissions', description: 'Per-rep sales, collections and commission owed', href: '/reports/sales-reps', icon: HandCoins },
        { name: 'Sales by Customer', description: 'Who buys the most and who still owes', href: '/reports/sales-by-customer', icon: Users },
        { name: 'Sales by Item', description: 'Best-selling products, net of returns', href: '/reports/sales-by-item', icon: Package },
        { name: 'Sales by Location', description: 'Sales, profit and collections per location', href: '/reports/location-sales', icon: MapPin },
      ],
    },
    {
      title: 'Finance',
      reports: [
        { name: 'Profit & Loss', description: 'Revenue, cost of goods and expenses', href: '/reports/profit-loss', icon: Scale },
        { name: 'Payments', description: 'Money received and paid, by day or month', href: '/reports/payments', icon: CreditCard },
        { name: 'Expenses', description: 'Company spending by category', href: '/expenses', icon: Receipt },
      ],
    },
    {
      title: 'Receivables & payables',
      reports: [
        {
          name: 'Receivables Aging',
          description: 'What customers owe, by age',
          href: '/reports/receivables-aging',
          icon: Clock,
          stat: receivablesData ? formatCurrency(receivables) : null,
        },
        {
          name: 'Payables Aging',
          description: 'What you owe vendors, by age',
          href: '/reports/payables-aging',
          icon: Truck,
          stat: payablesData ? formatCurrency(payables) : null,
        },
        { name: 'Customer Statements', description: 'Open a customer to see their statement', href: '/customers', icon: FileText },
        { name: 'Vendor Statements', description: 'Open a vendor to see their statement', href: '/vendors', icon: FileText },
      ],
    },
    {
      title: 'Inventory',
      reports: [
        { name: 'Inventory Valuation', description: 'Stock value at cost and at retail', href: '/reports/inventory-valuation', icon: Warehouse },
        { name: 'Stock by Location', description: 'Every product, every location', href: '/inventory', icon: Boxes },
        { name: 'Low Stock', description: 'Items below their minimum level', href: '/low-stock', icon: AlertTriangle },
      ],
    },
  ];

  return (
    <Page>
      <PageHeader icon={BarChart3} title="Reports" description="Analyze sales, money and stock" />

      <StatStrip
        items={[
          { label: 'Receivables', value: formatCurrency(receivables), hint: `${receivablesData?.summary?.total_customers || 0} customers owe money` },
          { label: 'Payables', value: formatCurrency(payables), hint: `${payablesData?.summary?.total_vendors || 0} vendors to pay` },
          {
            label: 'Overdue receivables',
            value: <span className={overdue > 0 ? 'text-red-600 dark:text-red-400' : ''}>{formatCurrency(overdue)}</span>,
            hint: 'Outstanding over 45 days',
          },
          {
            label: 'Net position',
            value: <span className={net < 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}>{formatCurrency(net)}</span>,
            hint: 'Receivables minus payables',
          },
        ]}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        {groups.map((group) => (
          <section key={group.title} className="rounded-lg border bg-card p-2 shadow-sm">
            <h2 className="px-3 pb-1 pt-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">{group.title}</h2>
            <div className="space-y-0.5">
              {group.reports.map((report) => (
                <ReportRow key={report.name} report={report} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </Page>
  );
}
