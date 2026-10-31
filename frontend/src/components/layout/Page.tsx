import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Standard page container: consistent padding and a tight vertical rhythm. */
export function Page({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('mx-auto w-full max-w-[1600px] space-y-4 p-4 sm:px-6 sm:py-5', className)}>{children}</div>;
}

export function PageHeader({
  title,
  description,
  actions,
  backTo,
  icon: Icon,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  backTo?: string;
  icon?: LucideIcon;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        {backTo && (
          <Link
            to={backTo}
            aria-label="Back"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
          </Link>
        )}
        {Icon && (
          <span className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary sm:inline-flex">
            <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden />
          </span>
        )}
        <div className="min-w-0">
          <h1 className="truncate text-xl font-semibold tracking-tight">{title}</h1>
          {description && <p className="truncate text-sm text-muted-foreground">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export type BadgeTone = 'green' | 'amber' | 'red' | 'blue' | 'gray' | 'violet';

const toneClass: Record<BadgeTone, string> = {
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-600/15 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-400/20',
  amber: 'bg-amber-50 text-amber-700 ring-amber-600/15 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-400/20',
  red: 'bg-red-50 text-red-700 ring-red-600/15 dark:bg-red-500/10 dark:text-red-300 dark:ring-red-400/20',
  blue: 'bg-blue-50 text-blue-700 ring-blue-600/15 dark:bg-blue-500/10 dark:text-blue-300 dark:ring-blue-400/20',
  violet: 'bg-violet-50 text-violet-700 ring-violet-600/15 dark:bg-violet-500/10 dark:text-violet-300 dark:ring-violet-400/20',
  gray: 'bg-muted text-muted-foreground ring-border',
};

export function StatusBadge({ tone = 'gray', children, dot = true, className }: { tone?: BadgeTone; children: ReactNode; dot?: boolean; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium capitalize ring-1 ring-inset', toneClass[tone], className)}>
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" aria-hidden />}
      {children}
    </span>
  );
}

const paymentTones: Record<string, BadgeTone> = { paid: 'green', partial: 'amber', unpaid: 'red' };
export function PaymentBadge({ status }: { status?: string }) {
  return <StatusBadge tone={paymentTones[status || ''] || 'gray'}>{status || '—'}</StatusBadge>;
}

export function ActiveBadge({ active, activeLabel = 'Active', inactiveLabel = 'Inactive' }: { active: boolean; activeLabel?: string; inactiveLabel?: string }) {
  return <StatusBadge tone={active ? 'green' : 'gray'}>{active ? activeLabel : inactiveLabel}</StatusBadge>;
}

/** Small icon button for row actions; stops the click reaching the row. */
export function RowAction({
  label,
  icon: Icon,
  onClick,
  tone = 'default',
  disabled,
}: {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  tone?: 'default' | 'danger' | 'success';
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={cn(
        'inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors disabled:pointer-events-none disabled:opacity-40',
        tone === 'danger' && 'hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10',
        tone === 'success' && 'hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-500/10',
        tone === 'default' && 'hover:bg-muted hover:text-foreground'
      )}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

export function RowActions({ children }: { children: ReactNode }) {
  return <div className="flex items-center justify-end gap-0.5">{children}</div>;
}

/** Compact KPI strip used at the top of list pages. */
export function StatStrip({ items }: { items: { label: string; value: ReactNode; hint?: ReactNode; active?: boolean; onClick?: () => void }[] }) {
  return (
    <div className="grid grid-cols-2 overflow-hidden rounded-lg border bg-card shadow-sm sm:flex sm:divide-x rtl:sm:divide-x-reverse">
      {items.map((it) => {
        const Comp = it.onClick ? 'button' : 'div';
        return (
          <Comp
            key={it.label}
            type={it.onClick ? 'button' : undefined}
            onClick={it.onClick}
            className={cn(
              'min-w-0 flex-1 px-4 py-3 text-start',
              it.onClick && 'transition-colors hover:bg-muted/50',
              it.active && 'bg-primary/5 shadow-[inset_0_-2px_0_hsl(var(--primary))]'
            )}
          >
            <p className="truncate text-xs text-muted-foreground">{it.label}</p>
            <p className="mt-0.5 truncate text-lg font-semibold tabular-nums">{it.value}</p>
            {it.hint && <p className="truncate text-xs text-muted-foreground">{it.hint}</p>}
          </Comp>
        );
      })}
    </div>
  );
}
