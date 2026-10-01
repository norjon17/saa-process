/**
 * The only file that imports @tanstack/react-table. It adapts our `AppColumn` definitions to the
 * TanStack Table 9 feature-based API so the rest of the app is insulated from that surface.
 */
import {
  createPaginatedRowModel,
  createSortedRowModel,
  rowPaginationFeature,
  rowSelectionFeature,
  rowSortingFeature,
  sortFns,
  tableFeatures,
  useTable,
  type ColumnDef,
  type PaginationState,
  type RowData,
  type RowSelectionState,
  type SortingState,
} from '@tanstack/react-table';
import { useMemo, type ReactNode } from 'react';

import type { AppColumn, SortSpec } from './types';

/** Features, sort-fn registry and row-model factories all live on the features object in Table 9. */
export const appFeatures = tableFeatures({
  rowSortingFeature,
  rowPaginationFeature,
  rowSelectionFeature,
  sortFns,
  sortedRowModel: createSortedRowModel(),
  paginatedRowModel: createPaginatedRowModel(),
});
export type AppFeatures = typeof appFeatures;

export interface UseAppTableOptions<T extends RowData> {
  columns: AppColumn<T>[];
  data: T[];
  getRowId: (row: T) => string;
  /** Client-side sorting state (controlled). */
  sorting?: SortSpec[];
  onSortingChange?: (s: SortSpec[]) => void;
  /** Client-side pagination; omit for "render all rows". */
  pageSize?: number;
  pageIndex?: number;
  onPageChange?: (index: number) => void;
  manualPagination?: boolean;
  rowCount?: number;
  rowSelection?: Record<string, boolean>;
  onRowSelectionChange?: (s: Record<string, boolean>) => void;
  enableRowSelection?: boolean;
}

const toSelectionState = (s: Record<string, boolean> | undefined): RowSelectionState =>
  Object.fromEntries(Object.entries(s ?? {}).filter(([, v]) => v).map(([k]) => [k, true as const]));

export function useAppTable<T extends RowData>(opts: UseAppTableOptions<T>) {
  const columns = useMemo<ColumnDef<AppFeatures, T, unknown>[]>(
    () =>
      opts.columns
        .filter((c) => !c.hidden)
        .map((c) => ({
          id: c.id,
          accessorFn: (row: T) => c.accessor(row) as unknown,
          header: () => c.header,
          cell: (ctx) => (c.render ? c.render(ctx.row.original) : (ctx.getValue() as ReactNode)),
          enableSorting: c.sortable !== false,
          sortFn: 'alphanumeric',
          meta: { app: c } as never,
        })),
    [opts.columns],
  );

  const sorting = useMemo<SortingState>(() => (opts.sorting ?? []).map((s) => ({ id: s.id, desc: s.desc })), [opts.sorting]);
  const pagination = useMemo<PaginationState>(() => ({ pageIndex: opts.pageIndex ?? 0, pageSize: opts.pageSize ?? 1_000_000 }), [opts.pageIndex, opts.pageSize]);
  const rowSelection = useMemo<RowSelectionState>(() => toSelectionState(opts.rowSelection), [opts.rowSelection]);

  const table = useTable<AppFeatures, T>({
    features: appFeatures,
    columns,
    data: opts.data,
    getRowId: (row) => opts.getRowId(row),
    state: { sorting, pagination, rowSelection },
    onSortingChange: (updater) => {
      const next = typeof updater === 'function' ? updater(sorting) : updater;
      opts.onSortingChange?.(next.map((s) => ({ id: s.id, desc: s.desc })));
    },
    onPaginationChange: (updater) => {
      const next = typeof updater === 'function' ? updater(pagination) : updater;
      opts.onPageChange?.(next.pageIndex);
    },
    onRowSelectionChange: (updater) => {
      const next = typeof updater === 'function' ? updater(rowSelection) : updater;
      opts.onRowSelectionChange?.({ ...next });
    },
    manualPagination: opts.manualPagination ?? false,
    ...(opts.rowCount !== undefined ? { rowCount: opts.rowCount } : {}),
    enableRowSelection: opts.enableRowSelection ?? false,
    enableSortingRemoval: true,
  });

  return table;
}

export type AppTable<T extends RowData> = ReturnType<typeof useAppTable<T>>;
export { flexRender } from '@tanstack/react-table';
export type { RowData };
