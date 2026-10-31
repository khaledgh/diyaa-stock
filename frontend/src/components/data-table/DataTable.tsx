import { ReactNode, useEffect, useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ChevronsUpDown,
  Columns3,
  Download,
  Inbox,
  Search,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { DateRangePicker } from '@/components/ui/date-picker';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export type SortDir = 'asc' | 'desc';
export interface SortState {
  id: string;
  dir: SortDir;
}

export interface ColumnDef<T> {
  id: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  /** Value used for sorting, searching and CSV export. Enables sorting unless sortable is false. */
  value?: (row: T) => string | number | null | undefined;
  sortable?: boolean;
  /** Include in the client-side search (defaults to true when value is set). */
  searchable?: boolean;
  align?: 'start' | 'end' | 'center';
  className?: string;
  headerClassName?: string;
  /** Hidden by default; the user can turn it on from the Columns menu. */
  defaultHidden?: boolean;
  /** Can't be hidden from the Columns menu. */
  alwaysVisible?: boolean;
}

export interface ServerPagination {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
}

interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  rowKey: (row: T) => string | number;
  loading?: boolean;

  /** Controlled (server) search. Omit for in-memory search over column values. */
  search?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  hideSearch?: boolean;

  /** Controlled (server) sort. Omit for in-memory sort. */
  sort?: SortState | null;
  onSortChange?: (sort: SortState | null) => void;
  defaultSort?: SortState;

  /** Server pagination. Omit to paginate in memory. */
  pagination?: ServerPagination;
  defaultPageSize?: number;
  pageSizeOptions?: number[];

  /** Extra controls rendered next to the search box (filters). */
  filters?: ReactNode;
  /** Controls rendered at the end of the toolbar. */
  toolbarEnd?: ReactNode;
  /** Shown under the toolbar when filters are active, with a reset link. */
  activeFilterCount?: number;
  onResetFilters?: () => void;

  onRowClick?: (row: T) => void;
  rowClassName?: (row: T) => string | undefined;
  emptyTitle?: string;
  emptyDescription?: string;
  /** Totals row: cell content per column id; receives the rows after search/sort (all pages). */
  footer?: (rows: T[]) => Partial<Record<string, ReactNode>>;
  exportFileName?: string;
  className?: string;
  /** Remember column visibility under this key. */
  storageKey?: string;
}

const alignClass = { start: 'text-start', end: 'text-end', center: 'text-center' } as const;

function useDebounced<T>(value: T, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

function compare(a: unknown, b: unknown) {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' });
}

function readHidden(storageKey: string | undefined, columns: ColumnDef<any>[]) {
  const defaults = columns.filter((c) => c.defaultHidden).map((c) => c.id);
  if (!storageKey) return defaults;
  try {
    const saved = localStorage.getItem(`table-columns:${storageKey}`);
    return saved ? (JSON.parse(saved) as string[]) : defaults;
  } catch {
    return defaults;
  }
}

function exportCsv<T>(rows: T[], columns: ColumnDef<T>[], fileName: string) {
  const exportable = columns.filter((c) => c.value);
  const escape = (v: unknown) => {
    const s = v == null ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const header = exportable.map((c) => escape(typeof c.header === 'string' ? c.header : c.id)).join(',');
  const body = rows.map((r) => exportable.map((c) => escape(c.value!(r))).join(',')).join('\n');
  const blob = new Blob(['﻿' + header + '\n' + body], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${fileName}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function DataTable<T>({
  data,
  columns,
  rowKey,
  loading,
  search,
  onSearchChange,
  searchPlaceholder = 'Search…',
  hideSearch,
  sort,
  onSortChange,
  defaultSort,
  pagination,
  defaultPageSize = 25,
  pageSizeOptions = [10, 25, 50, 100],
  filters,
  toolbarEnd,
  activeFilterCount = 0,
  onResetFilters,
  onRowClick,
  rowClassName,
  emptyTitle = 'No results',
  emptyDescription,
  footer,
  exportFileName,
  className,
  storageKey,
}: DataTableProps<T>) {
  const serverSearch = onSearchChange !== undefined;
  const serverSort = onSortChange !== undefined;

  const [searchInput, setSearchInput] = useState(search ?? '');
  const debouncedSearch = useDebounced(searchInput);
  useEffect(() => {
    if (serverSearch && debouncedSearch !== (search ?? '')) onSearchChange!(debouncedSearch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);
  useEffect(() => {
    if (serverSearch && (search ?? '') !== debouncedSearch) setSearchInput(search ?? '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const [localSort, setLocalSort] = useState<SortState | null>(defaultSort ?? null);
  const activeSort = serverSort ? sort ?? null : localSort;

  const [hidden, setHidden] = useState<string[]>(() => readHidden(storageKey, columns));
  const toggleColumn = (id: string) => {
    setHidden((prev) => {
      const next = prev.includes(id) ? prev.filter((h) => h !== id) : [...prev, id];
      if (storageKey) {
        try {
          localStorage.setItem(`table-columns:${storageKey}`, JSON.stringify(next));
        } catch {
          /* storage unavailable */
        }
      }
      return next;
    });
  };
  const visibleColumns = columns.filter((c) => !hidden.includes(c.id) || c.alwaysVisible);
  const hideableColumns = columns.filter((c) => !c.alwaysVisible && typeof c.header === 'string');

  const [localPage, setLocalPage] = useState(1);
  const [localPageSize, setLocalPageSize] = useState(defaultPageSize);

  // In-memory search + sort (skipped when the server does it).
  const processed = useMemo(() => {
    let rows = data;
    const q = debouncedSearch.trim().toLowerCase();
    if (!serverSearch && q) {
      const searchable = columns.filter((c) => c.value && c.searchable !== false);
      rows = rows.filter((r) => searchable.some((c) => String(c.value!(r) ?? '').toLowerCase().includes(q)));
    }
    if (!serverSort && activeSort) {
      const col = columns.find((c) => c.id === activeSort.id);
      if (col?.value) {
        const dir = activeSort.dir === 'asc' ? 1 : -1;
        rows = [...rows].sort((a, b) => compare(col.value!(a), col.value!(b)) * dir);
      }
    }
    return rows;
  }, [data, columns, debouncedSearch, serverSearch, serverSort, activeSort]);

  useEffect(() => setLocalPage(1), [debouncedSearch, activeSort?.id, activeSort?.dir, data.length]);

  const page = pagination ? pagination.page : localPage;
  const pageSize = pagination ? pagination.pageSize : localPageSize;
  const total = pagination ? pagination.total : processed.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const pageRows = pagination ? processed : processed.slice((page - 1) * pageSize, page * pageSize);

  const goTo = (p: number) => {
    const next = Math.min(Math.max(1, p), totalPages);
    pagination ? pagination.onPageChange(next) : setLocalPage(next);
  };
  const changePageSize = (size: number) => {
    if (pagination) {
      pagination.onPageSizeChange?.(size);
      pagination.onPageChange(1);
    } else {
      setLocalPageSize(size);
      setLocalPage(1);
    }
  };

  const toggleSort = (col: ColumnDef<T>) => {
    const next: SortState | null =
      !activeSort || activeSort.id !== col.id
        ? { id: col.id, dir: 'asc' }
        : activeSort.dir === 'asc'
          ? { id: col.id, dir: 'desc' }
          : null;
    serverSort ? onSortChange!(next) : setLocalSort(next);
  };

  const isSortable = (c: ColumnDef<T>) => (c.sortable ?? !!c.value) && (serverSort || !!c.value);
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className={cn('overflow-hidden rounded-lg border bg-card shadow-sm', className)}>
      {/* Toolbar */}
      {(!hideSearch || filters || toolbarEnd || exportFileName || hideableColumns.length > 0) && (
        <div className="flex flex-col gap-2 border-b p-3 lg:flex-row lg:items-center">
          <div className="flex flex-1 flex-wrap items-center gap-2">
            {!hideSearch && (
              <div className="relative w-full sm:w-64">
                <Search className="pointer-events-none absolute start-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                <input
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder={searchPlaceholder}
                  aria-label={searchPlaceholder}
                  className="h-8 w-full rounded-md border border-input bg-background pe-8 ps-8 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                {searchInput && (
                  <button
                    type="button"
                    onClick={() => setSearchInput('')}
                    aria-label="Clear search"
                    className="absolute end-1.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            )}
            {filters}
            {activeFilterCount > 0 && onResetFilters && (
              <button type="button" onClick={onResetFilters} className="inline-flex h-8 items-center gap-1 rounded-md px-2 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground">
                <X className="h-3.5 w-3.5" /> Reset
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            {toolbarEnd}
            {exportFileName && (
              <button
                type="button"
                onClick={() => exportCsv(processed, visibleColumns, exportFileName)}
                disabled={!processed.length}
                className="inline-flex h-8 items-center gap-1.5 rounded-md border bg-background px-2.5 text-xs font-medium hover:bg-muted disabled:opacity-50"
              >
                <Download className="h-3.5 w-3.5" /> CSV
              </button>
            )}
            {hideableColumns.length > 1 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button type="button" className="inline-flex h-8 items-center gap-1.5 rounded-md border bg-background px-2.5 text-xs font-medium hover:bg-muted">
                    <Columns3 className="h-3.5 w-3.5" /> Columns
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuLabel className="text-xs">Show columns</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {hideableColumns.map((c) => (
                    <DropdownMenuCheckboxItem
                      key={c.id}
                      checked={!hidden.includes(c.id)}
                      onCheckedChange={() => toggleColumn(c.id)}
                      onSelect={(e) => e.preventDefault()}
                    >
                      {c.header as string}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="relative overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10">
            <tr className="border-b">
              {visibleColumns.map((c) => {
                const sortable = isSortable(c);
                const sorted = activeSort?.id === c.id ? activeSort.dir : null;
                return (
                  <th
                    key={c.id}
                    scope="col"
                    aria-sort={sorted === 'asc' ? 'ascending' : sorted === 'desc' ? 'descending' : undefined}
                    className={cn(
                      'h-9 whitespace-nowrap bg-muted/50 px-3 text-xs font-medium text-muted-foreground first:ps-4 last:pe-4',
                      alignClass[c.align ?? 'start'],
                      c.headerClassName
                    )}
                  >
                    {sortable ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(c)}
                        className={cn(
                          'group -mx-1 inline-flex items-center gap-1 rounded px-1 py-0.5 hover:text-foreground',
                          sorted && 'text-foreground',
                          c.align === 'end' && 'flex-row-reverse'
                        )}
                      >
                        {c.header}
                        {sorted === 'asc' ? (
                          <ArrowUp className="h-3 w-3" />
                        ) : sorted === 'desc' ? (
                          <ArrowDown className="h-3 w-3" />
                        ) : (
                          <ChevronsUpDown className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-60" />
                        )}
                      </button>
                    ) : (
                      c.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              Array.from({ length: Math.min(pageSize, 8) }).map((_, i) => (
                <tr key={i}>
                  {visibleColumns.map((c) => (
                    <td key={c.id} className="px-3 py-3 first:ps-4 last:pe-4">
                      <div className="h-3.5 animate-pulse rounded bg-muted" style={{ width: `${40 + ((i * 7 + c.id.length * 13) % 50)}%` }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : pageRows.length === 0 ? (
              <tr>
                <td colSpan={visibleColumns.length} className="px-4 py-14 text-center">
                  <Inbox className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" aria-hidden />
                  <p className="text-sm font-medium">{emptyTitle}</p>
                  {(emptyDescription || debouncedSearch || activeFilterCount > 0) && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {emptyDescription || 'Try a different search or clear the filters.'}
                    </p>
                  )}
                </td>
              </tr>
            ) : (
              pageRows.map((row) => (
                <tr
                  key={rowKey(row)}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={cn('transition-colors hover:bg-muted/40', onRowClick && 'cursor-pointer', rowClassName?.(row))}
                >
                  {visibleColumns.map((c) => (
                    <td key={c.id} className={cn('px-3 py-2 align-middle first:ps-4 last:pe-4', alignClass[c.align ?? 'start'], c.className)}>
                      {c.cell(row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
          {footer && !loading && pageRows.length > 0 && (
            <tfoot className="border-t-2 bg-muted/40 font-semibold">
              <tr>
                {(() => {
                  const cells = footer(processed);
                  return visibleColumns.map((c) => (
                    <td key={c.id} className={cn('px-3 py-2.5 tabular-nums first:ps-4 last:pe-4', alignClass[c.align ?? 'start'])}>
                      {cells[c.id]}
                    </td>
                  ));
                })()}
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Pagination */}
      {!loading && total > 0 && (
        <div className="flex flex-col gap-2 border-t px-4 py-2.5 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span>
              <span className="font-medium text-foreground">{from.toLocaleString()}–{to.toLocaleString()}</span> of{' '}
              <span className="font-medium text-foreground">{total.toLocaleString()}</span>
            </span>
            {(!pagination || pagination.onPageSizeChange) && (
              <label className="flex items-center gap-1.5">
                Rows per page
                <select
                  value={pageSize}
                  onChange={(e) => changePageSize(Number(e.target.value))}
                  className="h-7 rounded-md border border-input bg-background ps-2 pe-7 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {pageSizeOptions.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
          <div className="flex items-center gap-1">
            <PageButton label="First page" onClick={() => goTo(1)} disabled={page <= 1}>
              <ChevronsLeft className="h-4 w-4 rtl:rotate-180" />
            </PageButton>
            <PageButton label="Previous page" onClick={() => goTo(page - 1)} disabled={page <= 1}>
              <ChevronLeft className="h-4 w-4 rtl:rotate-180" />
            </PageButton>
            <span className="px-2">
              Page <span className="font-medium text-foreground">{page}</span> of {totalPages}
            </span>
            <PageButton label="Next page" onClick={() => goTo(page + 1)} disabled={page >= totalPages}>
              <ChevronRight className="h-4 w-4 rtl:rotate-180" />
            </PageButton>
            <PageButton label="Last page" onClick={() => goTo(totalPages)} disabled={page >= totalPages}>
              <ChevronsRight className="h-4 w-4 rtl:rotate-180" />
            </PageButton>
          </div>
        </div>
      )}
    </div>
  );
}

function PageButton({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled: boolean; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className="inline-flex h-7 w-7 items-center justify-center rounded-md border bg-background text-foreground hover:bg-muted disabled:pointer-events-none disabled:opacity-40"
    >
      {children}
    </button>
  );
}

/** Compact select used in table toolbars. */
export function FilterSelect({
  label,
  value,
  onChange,
  options,
  allLabel = 'All',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  allLabel?: string;
}) {
  return (
    <label className={cn('relative inline-flex h-8 items-center rounded-md border text-xs', value ? 'border-primary/40 bg-primary/5' : 'border-dashed bg-background')}>
      <span className="ps-2.5 text-muted-foreground">{label}:</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-full max-w-[160px] cursor-pointer appearance-none truncate bg-transparent bg-none pe-6 ps-1 font-medium text-foreground focus-visible:outline-none"
      >
        <option value="">{allLabel}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronsUpDown className="pointer-events-none absolute end-1.5 h-3 w-3 text-muted-foreground" aria-hidden />
    </label>
  );
}

/** Date range filter for table toolbars (calendar popover with presets). */
export function DateRangeFilter({
  from,
  to,
  onChange,
  label = 'Date',
  clearable = true,
}: {
  from: string;
  to: string;
  onChange: (range: { from: string; to: string }) => void;
  label?: string;
  clearable?: boolean;
}) {
  return <DateRangePicker value={{ from, to }} onChange={onChange} label={label} clearable={clearable} />;
}
