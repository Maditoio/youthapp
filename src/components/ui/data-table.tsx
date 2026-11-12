"use client";

import * as React from "react";
import { ChevronDown, ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import type { AppLocale } from "@/lib/config";
import { tx } from "@/lib/i18n/tx";
import { cn } from "@/lib/utils";
import { Spinner } from "@/components/ui/spinner";

export type DataTableAlign = "left" | "center" | "right";

export type DataTableFilterOption = {
  value: string;
  label: string;
};

export type DataTableColumn = {
  id: string;
  header: string;
  align?: DataTableAlign;
  sortable?: boolean;
  /** Hide this column on the compact stacked mobile layout. */
  hideOnMobile?: boolean;
  className?: string;
  /** When set, a filter select appears for this column. */
  filter?: {
    options: DataTableFilterOption[];
    /** Placeholder when no filter is selected. */
    allLabel?: string;
  };
};

export type DataTableRow = {
  id: string;
  /** Free-text search haystack (preferred). Falls back to concatenating string cells. */
  searchValue?: string;
  /** Values keyed by column id for filter matching. */
  filterValues?: Record<string, string>;
  /** Values keyed by column id for sorting. */
  sortValues?: Record<string, string | number | null | undefined>;
  /** Cell content keyed by column id. React nodes from Server Components are supported. */
  cells: Record<string, React.ReactNode>;
  /** Optional trailing actions (links/buttons/forms). */
  actions?: React.ReactNode;
};

export type DataTableLabels = {
  searchPlaceholder?: string;
  searchAria?: string;
  filters?: string;
  clearFilters?: string;
  empty?: string;
  loading?: string;
  showing?: string;
  previous?: string;
  next?: string;
  pageSize?: string;
  actions?: string;
  of?: string;
};

export type DataTableProps = {
  locale: AppLocale;
  columns: DataTableColumn[];
  rows: DataTableRow[];
  /** Show the search box. Default true. */
  searchable?: boolean;
  /** Initial page size. Default 10. */
  pageSize?: 10 | 25;
  pageSizeOptions?: Array<10 | 25>;
  loading?: boolean;
  emptyMessage?: string;
  labels?: DataTableLabels;
  className?: string;
  /** Extra toolbar content (e.g. export). */
  toolbarEnd?: React.ReactNode;
  /** Hide the actions column header when no row has actions. Default true. */
  hideActionsWhenEmpty?: boolean;
};

type SortState = { columnId: string; direction: "asc" | "desc" } | null;

function defaultLabels(locale: AppLocale, overrides?: DataTableLabels): Required<DataTableLabels> {
  return {
    searchPlaceholder: overrides?.searchPlaceholder ?? tx(locale, "Rechercher…", "Search…"),
    searchAria: overrides?.searchAria ?? tx(locale, "Rechercher dans le tableau", "Search the table"),
    filters: overrides?.filters ?? tx(locale, "Filtres", "Filters"),
    clearFilters: overrides?.clearFilters ?? tx(locale, "Effacer", "Clear"),
    empty: overrides?.empty ?? tx(locale, "Aucune donnée.", "No data."),
    loading: overrides?.loading ?? tx(locale, "Chargement…", "Loading…"),
    showing: overrides?.showing ?? tx(locale, "Affichage", "Showing"),
    previous: overrides?.previous ?? tx(locale, "Précédent", "Previous"),
    next: overrides?.next ?? tx(locale, "Suivant", "Next"),
    pageSize: overrides?.pageSize ?? tx(locale, "Par page", "Per page"),
    actions: overrides?.actions ?? tx(locale, "Actions", "Actions"),
    of: overrides?.of ?? tx(locale, "sur", "of"),
  };
}

function compareSortValues(
  a: string | number | null | undefined,
  b: string | number | null | undefined,
): number {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: "base" });
}

function alignClass(align: DataTableAlign | undefined): string {
  if (align === "right") return "text-right";
  if (align === "center") return "text-center";
  return "text-left";
}

export function DataTable({
  locale,
  columns,
  rows,
  searchable = true,
  pageSize: initialPageSize = 10,
  pageSizeOptions = [10, 25],
  loading = false,
  emptyMessage,
  labels: labelOverrides,
  className,
  toolbarEnd,
  hideActionsWhenEmpty = true,
}: DataTableProps) {
  const labels = defaultLabels(locale, labelOverrides);
  const [query, setQuery] = React.useState("");
  const [filters, setFilters] = React.useState<Record<string, string>>({});
  const [sort, setSort] = React.useState<SortState>(null);
  const [page, setPage] = React.useState(0);
  const [pageSize, setPageSize] = React.useState<10 | 25>(initialPageSize);

  const filterableColumns = columns.filter((column) => column.filter && column.filter.options.length > 0);
  const hasActions = !hideActionsWhenEmpty || rows.some((row) => Boolean(row.actions));
  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  const filteredRows = React.useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    let next = rows;

    if (normalizedQuery) {
      next = next.filter((row) => {
        if (row.searchValue) return row.searchValue.toLowerCase().includes(normalizedQuery);
        return columns.some((column) => {
          const cell = row.cells[column.id];
          return typeof cell === "string" || typeof cell === "number"
            ? String(cell).toLowerCase().includes(normalizedQuery)
            : false;
        });
      });
    }

    for (const [columnId, value] of Object.entries(filters)) {
      if (!value) continue;
      next = next.filter((row) => (row.filterValues?.[columnId] ?? "") === value);
    }

    if (sort) {
      const { columnId, direction } = sort;
      next = [...next].sort((a, b) => {
        const result = compareSortValues(a.sortValues?.[columnId], b.sortValues?.[columnId]);
        return direction === "asc" ? result : -result;
      });
    }

    return next;
  }, [rows, query, filters, sort, columns]);

  const pageCount = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const safePage = Math.min(page, pageCount - 1);
  const pageRows = filteredRows.slice(safePage * pageSize, safePage * pageSize + pageSize);
  const from = filteredRows.length === 0 ? 0 : safePage * pageSize + 1;
  const to = Math.min(filteredRows.length, (safePage + 1) * pageSize);

  React.useEffect(() => {
    setPage(0);
  }, [query, filters, pageSize, rows]);

  function toggleSort(columnId: string) {
    setSort((current) => {
      if (!current || current.columnId !== columnId) return { columnId, direction: "asc" };
      if (current.direction === "asc") return { columnId, direction: "desc" };
      return null;
    });
  }

  function clearFilters() {
    setFilters({});
    setQuery("");
  }

  const emptyText = emptyMessage ?? labels.empty;

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-end">
          {searchable ? (
            <label className="relative block w-full max-w-md">
              <span className="sr-only">{labels.searchAria}</span>
              <Search
                className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted"
                aria-hidden
              />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={labels.searchPlaceholder}
                className="h-11 w-full rounded-full border border-border bg-surface pl-10 pr-4 text-sm text-ink outline-none transition-[box-shadow,border-color] placeholder:text-muted focus:border-violet focus:ring-4 focus:ring-[var(--input-focus-ring)]"
              />
            </label>
          ) : null}

          {filterableColumns.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted">{labels.filters}</span>
              {filterableColumns.map((column) => (
                <label key={column.id} className="relative inline-flex items-center">
                  <span className="sr-only">{column.header}</span>
                  <select
                    value={filters[column.id] ?? ""}
                    onChange={(event) =>
                      setFilters((current) => ({
                        ...current,
                        [column.id]: event.target.value,
                      }))
                    }
                    className="h-11 appearance-none rounded-full border border-border bg-surface py-0 pl-3 pr-9 text-sm text-ink outline-none focus:border-violet focus:ring-4 focus:ring-[var(--input-focus-ring)]"
                  >
                    <option value="">{column.filter?.allLabel ?? column.header}</option>
                    {column.filter?.options.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 size-3.5 text-muted" aria-hidden />
                </label>
              ))}
              {activeFilterCount > 0 || query ? (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="inline-flex h-9 items-center gap-1 rounded-full px-3 text-xs font-semibold text-violet hover:bg-lilac"
                >
                  <X className="size-3.5" aria-hidden />
                  {labels.clearFilters}
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
        {toolbarEnd ? <div className="shrink-0">{toolbarEnd}</div> : null}
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 rounded-[24px] border border-border bg-surface px-4 py-16 text-sm text-muted">
          <Spinner tone="brand" />
          {labels.loading}
        </div>
      ) : filteredRows.length === 0 ? (
        <div className="rounded-[24px] border border-dashed border-border bg-surface px-4 py-16 text-center text-sm text-muted">
          {emptyText}
        </div>
      ) : (
        <>
          {/* Mobile: stacked rows driven by the same column config */}
          <div className="space-y-2 md:hidden">
            {pageRows.map((row) => (
              <article
                key={row.id}
                className="rounded-[20px] border border-border bg-surface p-4 shadow-[var(--shadow-card)]"
              >
                <dl className="space-y-2.5">
                  {columns
                    .filter((column) => !column.hideOnMobile)
                    .map((column) => (
                      <div key={column.id} className="grid grid-cols-[minmax(0,7.5rem)_1fr] gap-3 text-sm">
                        <dt className="text-xs font-semibold uppercase tracking-wide text-muted">{column.header}</dt>
                        <dd className={cn("min-w-0 text-ink", alignClass(column.align))}>{row.cells[column.id]}</dd>
                      </div>
                    ))}
                </dl>
                {row.actions ? (
                  <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
                    {row.actions}
                  </div>
                ) : null}
              </article>
            ))}
          </div>

          {/* Desktop / tablet: real table */}
          <div className="hidden overflow-hidden rounded-[24px] border border-border bg-surface shadow-[var(--shadow-card)] md:block">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[40rem] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border bg-surface-muted/80">
                    {columns.map((column) => {
                      const sorted = sort?.columnId === column.id ? sort.direction : null;
                      return (
                        <th
                          key={column.id}
                          scope="col"
                          aria-sort={
                            sorted === "asc" ? "ascending" : sorted === "desc" ? "descending" : "none"
                          }
                          className={cn(
                            "px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted",
                            alignClass(column.align),
                            column.className,
                          )}
                        >
                          {column.sortable ? (
                            <button
                              type="button"
                              onClick={() => toggleSort(column.id)}
                              className="inline-flex items-center gap-1 rounded-md hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet"
                            >
                              {column.header}
                              <span className="text-[10px] text-violet" aria-hidden>
                                {sorted === "asc" ? "▲" : sorted === "desc" ? "▼" : "↕"}
                              </span>
                            </button>
                          ) : (
                            column.header
                          )}
                        </th>
                      );
                    })}
                    {hasActions ? (
                      <th
                        scope="col"
                        className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted"
                      >
                        {labels.actions}
                      </th>
                    ) : null}
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((row) => (
                    <tr
                      key={row.id}
                      className="border-b border-border last:border-b-0 transition-colors hover:bg-lilac/40 dark:hover:bg-lilac/30"
                    >
                      {columns.map((column) => (
                        <td
                          key={column.id}
                          className={cn(
                            "px-4 py-3 align-middle text-ink",
                            alignClass(column.align),
                            column.className,
                          )}
                        >
                          {row.cells[column.id]}
                        </td>
                      ))}
                      {hasActions ? (
                        <td className="px-4 py-3 align-middle">
                          {row.actions ? (
                            <div className="flex flex-wrap items-center justify-end gap-2">{row.actions}</div>
                          ) : null}
                        </td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted">
              {labels.showing}{" "}
              <span className="font-semibold text-ink">
                {from}–{to}
              </span>{" "}
              {labels.of} <span className="font-semibold text-ink">{filteredRows.length}</span>
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <label className="inline-flex items-center gap-2 text-xs text-muted">
                {labels.pageSize}
                <select
                  value={pageSize}
                  onChange={(event) => setPageSize(Number(event.target.value) as 10 | 25)}
                  className="h-9 rounded-full border border-border bg-surface px-3 text-sm text-ink outline-none focus:border-violet focus:ring-4 focus:ring-[var(--input-focus-ring)]"
                >
                  {pageSizeOptions.map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </label>
              <div className="inline-flex items-center gap-1">
                <button
                  type="button"
                  disabled={safePage <= 0}
                  onClick={() => setPage((current) => Math.max(0, current - 1))}
                  className="inline-flex h-9 items-center gap-1 rounded-full border border-border bg-surface px-3 text-xs font-semibold text-ink disabled:opacity-40"
                >
                  <ChevronLeft className="size-3.5" aria-hidden />
                  {labels.previous}
                </button>
                <span className="min-w-16 text-center text-xs font-semibold text-ink">
                  {safePage + 1}/{pageCount}
                </span>
                <button
                  type="button"
                  disabled={safePage >= pageCount - 1}
                  onClick={() => setPage((current) => Math.min(pageCount - 1, current + 1))}
                  className="inline-flex h-9 items-center gap-1 rounded-full border border-border bg-surface px-3 text-xs font-semibold text-ink disabled:opacity-40"
                >
                  {labels.next}
                  <ChevronRight className="size-3.5" aria-hidden />
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
