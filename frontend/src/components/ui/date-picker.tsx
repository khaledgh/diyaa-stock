import * as React from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { cn, toLocalISODate } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

// Dates travel as local "YYYY-MM-DD" strings, the same as native date inputs,
// so this is a drop-in replacement for <input type="date">.
const parse = (s?: string) => {
  if (!s) return null;
  const [y, m, d] = s.split('-').map(Number);
  return y && m && d ? new Date(y, m - 1, d) : null;
};
const sameDay = (a: Date | null, b: Date | null) => !!a && !!b && a.toDateString() === b.toDateString();
const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export function formatPickerDate(value?: string) {
  const d = parse(value);
  return d ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';
}

interface CalendarProps {
  selected?: string;
  rangeStart?: string;
  rangeEnd?: string;
  min?: string;
  max?: string;
  onSelect: (value: string) => void;
}

export function Calendar({ selected, rangeStart, rangeEnd, min, max, onSelect }: CalendarProps) {
  const anchor = parse(selected) || parse(rangeEnd) || parse(rangeStart) || new Date();
  const [view, setView] = React.useState(new Date(anchor.getFullYear(), anchor.getMonth(), 1));
  const today = new Date();
  const minD = parse(min);
  const maxD = parse(max);
  const start = parse(rangeStart);
  const end = parse(rangeEnd);

  const first = new Date(view.getFullYear(), view.getMonth(), 1);
  const gridStart = new Date(first);
  gridStart.setDate(1 - first.getDay());
  const days = Array.from({ length: 42 }, (_, i) => new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i));
  const shift = (months: number) => setView(new Date(view.getFullYear(), view.getMonth() + months, 1));

  return (
    <div className="w-[17rem] select-none">
      <div className="mb-2 flex items-center justify-between">
        <button type="button" onClick={() => shift(-1)} aria-label="Previous month" className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground">
          <ChevronLeft className="h-4 w-4 rtl:rotate-180" />
        </button>
        <div className="flex items-center gap-1 text-sm font-semibold">
          <span>{view.toLocaleDateString('en-US', { month: 'long' })}</span>
          <select
            aria-label="Year"
            value={view.getFullYear()}
            onChange={(e) => setView(new Date(Number(e.target.value), view.getMonth(), 1))}
            className="h-7 rounded-md border-0 bg-transparent bg-none px-1 font-semibold hover:bg-muted focus-visible:outline-none"
          >
            {Array.from({ length: 21 }, (_, i) => today.getFullYear() - 15 + i).map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
        <button type="button" onClick={() => shift(1)} aria-label="Next month" className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground">
          <ChevronRight className="h-4 w-4 rtl:rotate-180" />
        </button>
      </div>
      <div className="grid grid-cols-7 text-center text-[11px] font-medium uppercase text-muted-foreground">
        {WEEKDAYS.map((d) => (
          <div key={d} className="py-1">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-0.5">
        {days.map((d) => {
          const outside = d.getMonth() !== view.getMonth();
          const disabled = (minD && d < minD) || (maxD && d > maxD);
          const isSelected = sameDay(d, parse(selected)) || sameDay(d, start) || sameDay(d, end);
          const inRange = start && end && d > start && d < end;
          const isToday = sameDay(d, today);
          return (
            <button
              key={d.toISOString()}
              type="button"
              disabled={!!disabled}
              onClick={() => onSelect(toLocalISODate(d))}
              className={cn(
                'relative mx-auto inline-flex h-8 w-8 items-center justify-center rounded-md text-sm tabular-nums transition-colors',
                outside && 'text-muted-foreground/50',
                !isSelected && !disabled && 'hover:bg-muted',
                inRange && 'rounded-none bg-primary/10 text-foreground',
                isSelected && 'bg-primary font-semibold text-primary-foreground hover:bg-primary',
                isToday && !isSelected && 'font-semibold text-primary',
                disabled && 'cursor-not-allowed opacity-30'
              )}
            >
              {d.getDate()}
              {isToday && !isSelected && <span className="absolute bottom-1 h-1 w-1 rounded-full bg-primary" aria-hidden />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface DatePickerProps {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  min?: string;
  max?: string;
  className?: string;
  clearable?: boolean;
  disabled?: boolean;
  id?: string;
  'aria-label'?: string;
  size?: 'sm' | 'default';
}

export function DatePicker({ value, onChange, placeholder = 'Pick a date', min, max, className, clearable, disabled, id, size = 'default', ...rest }: DatePickerProps) {
  const [open, setOpen] = React.useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          id={id}
          type="button"
          disabled={disabled}
          aria-label={rest['aria-label']}
          className={cn(
            'inline-flex w-full items-center gap-2 rounded-md border border-input bg-background px-3 text-start text-sm transition-colors hover:border-ring/50 focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50',
            size === 'sm' ? 'h-8 text-xs' : 'h-9',
            open && 'border-ring ring-2 ring-ring/30',
            className
          )}
        >
          <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          <span className={cn('flex-1 truncate tabular-nums', !value && 'text-muted-foreground')}>{value ? formatPickerDate(value) : placeholder}</span>
          {clearable && value && !disabled && (
            <span
              role="button"
              tabIndex={-1}
              aria-label="Clear date"
              onClick={(e) => {
                e.stopPropagation();
                onChange('');
              }}
              className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-3" align="start">
        <Calendar
          selected={value}
          min={min}
          max={max}
          onSelect={(v) => {
            onChange(v);
            setOpen(false);
          }}
        />
        <div className="mt-2 flex items-center justify-between border-t pt-2">
          <button
            type="button"
            onClick={() => {
              onChange(toLocalISODate());
              setOpen(false);
            }}
            className="rounded px-2 py-1 text-xs font-medium text-primary hover:bg-primary/10"
          >
            Today
          </button>
          {clearable && value && (
            <button
              type="button"
              onClick={() => {
                onChange('');
                setOpen(false);
              }}
              className="rounded px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              Clear
            </button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export interface DateRange {
  from: string;
  to: string;
}

function rangePresets(): { label: string; range: DateRange }[] {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const day = (d: Date) => toLocalISODate(d);
  const daysAgo = (n: number) => day(new Date(y, m, now.getDate() - n));
  return [
    { label: 'Today', range: { from: day(now), to: day(now) } },
    { label: 'Last 7 days', range: { from: daysAgo(6), to: day(now) } },
    { label: 'Last 30 days', range: { from: daysAgo(29), to: day(now) } },
    { label: 'This month', range: { from: day(new Date(y, m, 1)), to: day(now) } },
    { label: 'Last month', range: { from: day(new Date(y, m - 1, 1)), to: day(new Date(y, m, 0)) } },
    { label: 'This year', range: { from: day(new Date(y, 0, 1)), to: day(now) } },
  ];
}

/** Two-click range selection with quick presets. */
export function DateRangePicker({
  value,
  onChange,
  placeholder = 'Any date',
  className,
  clearable = true,
  size = 'sm',
  label,
}: {
  value: DateRange;
  onChange: (range: DateRange) => void;
  placeholder?: string;
  className?: string;
  clearable?: boolean;
  size?: 'sm' | 'default';
  label?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [draft, setDraft] = React.useState<DateRange>(value);
  React.useEffect(() => {
    if (open) setDraft(value);
  }, [open, value]);

  const active = !!(value.from || value.to);
  const text = value.from && value.to ? (value.from === value.to ? formatPickerDate(value.from) : `${formatPickerDate(value.from)} – ${formatPickerDate(value.to)}`) : placeholder;
  const presets = rangePresets();
  const activePreset = presets.find((p) => p.range.from === value.from && p.range.to === value.to);

  const pick = (d: string) => {
    if (!draft.from || draft.to) {
      setDraft({ from: d, to: '' });
    } else {
      const next = d < draft.from ? { from: d, to: draft.from } : { from: draft.from, to: d };
      setDraft(next);
      onChange(next);
      setOpen(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            'inline-flex items-center gap-1.5 rounded-md border px-2.5 transition-colors',
            size === 'sm' ? 'h-8 text-xs' : 'h-9 text-sm',
            active ? 'border-primary/40 bg-primary/5' : 'border-dashed bg-background hover:border-ring/50',
            className
          )}
        >
          <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
          {label && <span className="text-muted-foreground">{label}:</span>}
          <span className={cn('font-medium tabular-nums', !active && 'text-foreground')}>{activePreset ? activePreset.label : text}</span>
          {clearable && active && (
            <span
              role="button"
              tabIndex={-1}
              aria-label="Clear dates"
              onClick={(e) => {
                e.stopPropagation();
                onChange({ from: '', to: '' });
              }}
              className="-me-1 rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="h-3 w-3" />
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="flex flex-col sm:flex-row">
          <div className="flex flex-row flex-wrap gap-1 border-b p-2 sm:w-36 sm:flex-col sm:border-b-0 sm:border-e">
            {presets.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => {
                  onChange(p.range);
                  setOpen(false);
                }}
                className={cn(
                  'rounded-md px-2.5 py-1.5 text-start text-xs transition-colors',
                  activePreset?.label === p.label ? 'bg-primary/10 font-medium text-primary' : 'hover:bg-muted'
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="p-3">
            <p className="mb-2 text-xs text-muted-foreground">{draft.from && !draft.to ? 'Now pick the end date' : 'Pick a start date'}</p>
            <Calendar rangeStart={draft.from} rangeEnd={draft.to} onSelect={pick} />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
