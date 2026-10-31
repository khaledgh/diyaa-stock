import { ReactNode, useEffect, useMemo, useState } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import * as XLSX from 'xlsx';
import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Check,
  ChevronsUpDown,
  Columns3,
  FileSpreadsheet,
  Inbox,
  Printer,
  Search,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { DateRangePicker } from '@/components/ui/date-picker';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
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
  /** Heading on printed pages (defaults to a title made from exportFileName). */
  printTitle?: string;
  className?: string;
  /** Remember column visibility under this key. */
  storageKey?: string;
}

const prettyTitle = (name: string) => name.replace(/[-_]+/g, ' ').replace(/\b\w/g, (ch) => ch.toUpperCase());

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

const ISO_DATE = /^\d{4}-\d{2}-\d{2}(T|$)/;

function headerText(c: ColumnDef<any>) {
  return typeof c.header === 'string' ? c.header : c.id;
}

function nodeText(node: ReactNode): string {
  if (node == null || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  try {
    return renderToStaticMarkup(<>{node}</>)
      .replace(/<[^>]+>/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&nbsp;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  } catch {
    return '';
  }
}

/** Excel export of the rows the user is looking at (all pages, after search/sort/filters). */
function exportExcel<T>(rows: T[], columns: ColumnDef<T>[], fileName: string, footerCells?: Partial<Record<string, ReactNode>>) {
  const exportable = columns.filter((c) => c.value);
  const header = exportable.map(headerText);
  const body = rows.map((r) =>
    exportable.map((c) => {
      const v = c.value!(r);
      if (typeof v === 'string' && ISO_DATE.test(v)) {
        const d = new Date(v);
        return isNaN(d.getTime()) ? v : d;
      }
      return v ?? '';
    })
  );
  const aoa: unknown[][] = [header, ...body];
  if (footerCells) aoa.push(exportable.map((c) => nodeText(footerCells[c.id])));
  const ws = XLSX.utils.aoa_to_sheet(aoa, { cellDates: true, dateNF: 'yyyy-mm-dd' });
  ws['!cols'] = exportable.map((c, i) => ({
    wch: Math.min(
      40,
      Math.max(headerText(c).length, ...body.slice(0, 200).map((row) => (row[i] instanceof Date ? 10 : String(row[i] ?? '').length))) + 2
    ),
  }));
  if (body.length) {
    ws['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: body.length, c: exportable.length - 1 } }) };
  }
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Data');
  XLSX.writeFile(wb, `${fileName}.xlsx`);
}

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]!);

/** Prints the table on its own clean page (title, date, filters, rows, totals) via a hidden iframe. */
function printTable<T>(rows: T[], columns: ColumnDef<T>[], title: string, subtitle: string, footerCells?: Partial<Record<string, ReactNode>>) {
  const printable = columns.filter((c) => c.value || (c.id !== 'actions' && typeof c.header === 'string' && c.header));
  const cellHtml = (c: ColumnDef<T>, r: T) => {
    try {
      return renderToStaticMarkup(<>{c.cell(r)}</>);
    } catch {
      return escapeHtml(String(c.value?.(r) ?? ''));
    }
  };
  const align = (c: ColumnDef<T>) => (c.align === 'end' ? 'right' : c.align === 'center' ? 'center' : 'left');
  const dir = document.documentElement.dir || 'ltr';
  const styles = `
    @page { margin: 14mm; }
    * { box-sizing: border-box; }
    body { font-family: Inter, 'Segoe UI', Tahoma, Arial, sans-serif; color: #0f172a; font-size: 11px; margin: 0; }
    h1 { font-size: 18px; margin: 0 0 2px; }
    .meta { color: #64748b; font-size: 11px; margin-bottom: 14px; }
    table { width: 100%; border-collapse: collapse; }
    th { font-size: 10px; text-transform: uppercase; letter-spacing: .04em; color: #64748b; background: #f1f5f9; padding: 7px 8px; border-bottom: 1px solid #cbd5e1; }
    td { padding: 6px 8px; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
    tr { break-inside: avoid; }
    thead { display: table-header-group; }
    tfoot td { font-weight: 600; border-top: 2px solid #94a3b8; background: #f8fafc; }
    td p { margin: 0; }
    td .text-xs, td .text-muted-foreground { color: #64748b; font-size: 10px; }
    td button { all: unset; }
    svg { display: none; }`;
  const head = printable.map((c) => `<th style="text-align:${align(c)}">${escapeHtml(headerText(c))}</th>`).join('');
  const bodyRows = rows.map((r) => `<tr>${printable.map((c) => `<td style="text-align:${align(c)}">${cellHtml(c, r)}</td>`).join('')}</tr>`).join('');
  const foot = footerCells
    ? `<tfoot><tr>${printable.map((c) => `<td style="text-align:${align(c)}">${escapeHtml(nodeText(footerCells[c.id]))}</td>`).join('')}</tr></tfoot>`
    : '';
  const html = `<!doctype html><html dir="${dir}"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>${styles}</style></head>
    <body><h1>${escapeHtml(title)}</h1><div class="meta">${escapeHtml(subtitle)}</div>
    <table><thead><tr>${head}</tr></thead><tbody>${bodyRows}</tbody>${foot}</table></body></html>`;

  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
  document.body.appendChild(frame);
  const win = frame.contentWindow!;
  win.document.open();
  win.document.write(html);
  win.document.close();
  setTimeout(() => {
    win.focus();
    win.print();
    setTimeout(() => frame.remove(), 1000);
  }, 150);
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
  printTitle,
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
                  className="h-8 w-full rounded-md border border-input bg-background pe-8 ps-8 text-sm transition-colors placeholder:text-muted-foreground hover:border-ring/50 focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20"
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
              <>
                <button
                  type="button"
                  onClick={() =>
                    printTable(
                      processed,
                      visibleColumns,
                      printTitle || prettyTitle(exportFileName),
                      [
                        `Printed ${new Date().toLocaleString()}`,
                        `${processed.length} row${processed.length === 1 ? '' : 's'}`,
                        debouncedSearch ? `Search: "${debouncedSearch}"` : '',
                        activeFilterCount ? `${activeFilterCount} filter${activeFilterCount > 1 ? 's' : ''} applied` : '',
                      ]
                        .filter(Boolean)
                        .join(' · '),
                      footer && processed.length ? footer(processed) : undefined
                    )
                  }
                  disabled={!processed.length}
                  className="inline-flex h-8 items-center gap-1.5 rounded-md border bg-background px-2.5 text-xs font-medium hover:bg-muted disabled:opacity-50"
                >
                  <Printer className="h-3.5 w-3.5" /> Print
                </button>
                <button
                  type="button"
                  onClick={() => exportExcel(processed, visibleColumns, exportFileName, footer && processed.length ? footer(processed) : undefined)}
                  disabled={!processed.length}
                  className="inline-flex h-8 items-center gap-1.5 rounded-md border bg-background px-2.5 text-xs font-medium hover:bg-muted disabled:opacity-50"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" /> Excel
                </button>
              </>
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

/** Filter chip that opens a menu of options (searchable when the list is long). */
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
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const selected = options.find((o) => o.value === value);
  const searchable = options.length > 7;
  const visible = query ? options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase())) : options;
  const choose = (v: string) => {
    onChange(v);
    setOpen(false);
    setQuery('');
  };

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) setQuery(''); }}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            'inline-flex h-8 max-w-[220px] items-center gap-1.5 rounded-md border px-2.5 text-xs transition-colors',
            value ? 'border-primary/40 bg-primary/5' : 'border-dashed bg-background hover:border-ring/50',
            open && 'border-ring ring-2 ring-ring/20'
          )}
        >
          <span className="shrink-0 text-muted-foreground">{label}:</span>
          <span className="truncate font-medium" dir="auto">{selected ? selected.label : allLabel}</span>
          {value ? (
            <span
              role="button"
              tabIndex={-1}
              aria-label={`Clear ${label}`}
              onClick={(e) => {
                e.stopPropagation();
                choose('');
              }}
              className="-me-1 rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="h-3 w-3" />
            </span>
          ) : (
            <ChevronsUpDown className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden />
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-56 p-1">
        {searchable && (
          <div className="relative mb-1 border-b pb-1">
            <Search className="pointer-events-none absolute start-2 top-1/2 h-3.5 w-3.5 -translate-y-[60%] text-muted-foreground" aria-hidden />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Search ${label.toLowerCase()}…`}
              className="h-8 w-full rounded-md bg-transparent pe-2 ps-7 text-xs outline-none placeholder:text-muted-foreground"
            />
          </div>
        )}
        <div className="scroll-thin max-h-64 overflow-y-auto" role="listbox" aria-label={label}>
          {!query && (
            <FilterOption selected={!value} onClick={() => choose('')}>
              {allLabel}
            </FilterOption>
          )}
          {visible.map((o) => (
            <FilterOption key={o.value} selected={o.value === value} onClick={() => choose(o.value)}>
              {o.label}
            </FilterOption>
          ))}
          {visible.length === 0 && <p className="px-2 py-3 text-center text-xs text-muted-foreground">No matches</p>}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function FilterOption({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors hover:bg-primary/10',
        selected && 'font-medium text-primary'
      )}
    >
      <span className="min-w-0 flex-1 truncate" dir="auto">{children}</span>
      <Check className={cn('h-3.5 w-3.5 shrink-0', selected ? 'opacity-100' : 'opacity-0')} aria-hidden />
    </button>
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
