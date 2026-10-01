import { ActionIcon, Checkbox, Group, Progress, Select, Skeleton, Table, Text } from '@mantine/core';
import { IconArrowDown, IconArrowUp, IconArrowsSort, IconSortAscending, IconSortDescending } from '@tabler/icons-react';
import { useState, type ReactNode } from 'react';

import { EmptyState } from '@/components/ui/EmptyState';
import { useIsMobile } from '@/lib/useIsMobile';

import { CellEditorView } from './cells';
import classes from './table.module.css';
import { TablePager } from './TablePager';
import type { AppColumn, SortSpec } from './types';
import { flexRender, useAppTable, type RowData } from './useAppTable';

export interface DataTableProps<T> {
  columns: AppColumn<T>[];
  data: T[];
  getRowId: (row: T) => string;
  sorting?: SortSpec[];
  onSortingChange?: (s: SortSpec[]) => void;
  /**
   * Server-side pagination: pass `total` + `page` + `pageSize` and handle `onPageChange`
   * (and optionally `onPageSizeChange`). Without `total` the table paginates `data` client-side.
   */
  page?: number;
  pageSize?: number;
  total?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  /** Client-side paging: initial rows per page (default 20). Set `paginate={false}` for fixed report blocks. */
  defaultPageSize?: number;
  paginate?: boolean;
  /** First load → skeleton rows; refetch with data on screen → thin progress bar. */
  loading?: boolean;
  /** Inline editing: called when an editable cell commits. */
  onCellCommit?: (row: T, columnId: string, value: unknown) => void;
  editable?: boolean;
  selection?: Record<string, boolean>;
  onSelectionChange?: (s: Record<string, boolean>) => void;
  rowProps?: (row: T) => Record<string, unknown> | undefined;
  emptyMessage?: ReactNode;
  stickyHeader?: boolean;
  minWidth?: number;
  footer?: ReactNode;
  unit?: string;
  /** Below 768px rows render as cards (`cards`, default) or keep the horizontally scrolling table (`scroll`). */
  mobileLayout?: 'cards' | 'scroll';
  /** Phone cards: rows for which only the card heading is shown (e.g. NONE rows). */
  mobileCollapsed?: (row: T) => boolean;
}

type AppCell<T extends RowData> = ReturnType<ReturnType<ReturnType<typeof useAppTable<T>>['getRowModel']>['rows'][number]['getAllCells']>[number];

const columnLabel = <T,>(c: AppColumn<T>) => c.mobileLabel ?? (typeof c.header === 'string' ? c.header : c.id);

/**
 * Shared table used by every list page. Client-side sorting; server- or client-side pagination
 * (every table is paginated unless `paginate={false}`); loading skeleton / refetch bar; optional
 * inline editors per column (`editor` in the column definition).
 */
export function DataTable<T extends RowData>(props: DataTableProps<T>) {
  const serverPaged = props.total !== undefined;
  const clientPaged = !serverPaged && props.paginate !== false;
  const [clientPage, setClientPage] = useState(1);
  const [clientPageSize, setClientPageSize] = useState(props.defaultPageSize ?? 20);

  const clientPages = Math.max(1, Math.ceil(props.data.length / clientPageSize));
  const safeClientPage = Math.min(clientPage, clientPages); // clamp when rows are deleted

  const table = useAppTable<T>({
    columns: props.columns,
    data: props.data,
    getRowId: props.getRowId,
    sorting: props.sorting,
    onSortingChange: props.onSortingChange,
    manualPagination: !clientPaged,
    ...(clientPaged ? { pageIndex: safeClientPage - 1, pageSize: clientPageSize, onPageChange: (i: number) => setClientPage(i + 1) } : {}),
    rowSelection: props.selection,
    onRowSelectionChange: props.onSelectionChange,
    enableRowSelection: !!props.onSelectionChange,
  });
  const rows = clientPaged ? table.getPaginatedRowModel().rows : table.getSortedRowModel().rows;
  const visibleCols = props.columns.filter((c) => !c.hidden);
  const hasSelection = !!props.onSelectionChange;
  const colSpan = visibleCols.length + (hasSelection ? 1 : 0);
  const firstLoad = !!props.loading && props.data.length === 0;
  const refetching = !!props.loading && props.data.length > 0;
  const isMobile = useIsMobile();
  const asCards = isMobile && props.mobileLayout !== 'scroll';

  const appCol = (cell: AppCell<T>) => (cell.column.columnDef.meta as { app?: AppColumn<T> } | undefined)?.app;
  /** Editor when the column is editable for this row, otherwise the column's renderer. Shared by table and cards. */
  const cellContent = (cell: AppCell<T>, original: T, layout: 'cell' | 'card' = 'cell') => {
    const col = appCol(cell);
    const editable = props.editable && col?.editor && props.onCellCommit && !(col.readOnly?.(original) ?? false);
    if (editable && col) {
      return <CellEditorView editor={col.editor!} value={col.accessor(original)} onCommit={(v) => props.onCellCommit!(original, col.id, v)} ariaLabel={columnLabel(col)} layout={layout} />;
    }
    return flexRender(cell.column.columnDef.cell, cell.getContext());
  };

  return (
    <div aria-busy={props.loading ? true : undefined}>
      <div style={{ height: 2 }}>{refetching && <Progress value={100} size={2} animated striped radius={0} aria-label="Refreshing" />}</div>
      {asCards ? (
        <MobileCards
          rows={rows}
          columns={visibleCols}
          appCol={appCol}
          cellContent={cellContent}
          firstLoad={firstLoad}
          emptyMessage={props.emptyMessage}
          hasSelection={hasSelection}
          rowProps={props.rowProps}
          collapsed={props.mobileCollapsed}
          sorting={props.sorting}
          onSortingChange={props.onSortingChange}
          allSelected={rows.length > 0 && table.getIsAllPageRowsSelected()}
          someSelected={table.getIsSomePageRowsSelected()}
          onToggleAll={table.getToggleAllPageRowsSelectedHandler()}
        />
      ) : (
      <Table.ScrollContainer minWidth={props.minWidth ?? 700}>
        <Table stickyHeader={props.stickyHeader} layout="fixed" withRowBorders>
          <colgroup>
            {hasSelection && <col style={{ width: 34 }} />}
            {visibleCols.map((c) => (
              <col key={c.id} style={{ width: c.width, minWidth: c.minWidth }} />
            ))}
          </colgroup>
          <Table.Thead className="saa-surface2">
            {table.getHeaderGroups().map((hg) => (
              <Table.Tr key={hg.id}>
                {hasSelection && (
                  <Table.Th style={{ textAlign: 'center' }}>
                    <Checkbox
                      size="xs"
                      checked={rows.length > 0 && table.getIsAllPageRowsSelected()}
                      indeterminate={table.getIsSomePageRowsSelected() && !table.getIsAllPageRowsSelected()}
                      onChange={table.getToggleAllPageRowsSelectedHandler()}
                      aria-label="Select all on this page"
                    />
                  </Table.Th>
                )}
                {hg.headers.map((h) => {
                  const col = h.column;
                  const sorted = col.getIsSorted();
                  const canSort = col.getCanSort() && props.onSortingChange;
                  return (
                    <Table.Th
                      key={h.id}
                      onClick={canSort ? col.getToggleSortingHandler() : undefined}
                      style={{ cursor: canSort ? 'pointer' : undefined, textAlign: 'center', fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--saa-text3)', whiteSpace: 'nowrap', userSelect: 'none' }}
                    >
                      <Group gap={3} justify="center" wrap="nowrap">
                        {flexRender(col.columnDef.header, h.getContext())}
                        {canSort && (sorted === 'asc' ? <IconArrowUp size={11} /> : sorted === 'desc' ? <IconArrowDown size={11} /> : <IconArrowsSort size={11} style={{ opacity: 0.35 }} />)}
                      </Group>
                    </Table.Th>
                  );
                })}
              </Table.Tr>
            ))}
          </Table.Thead>
          <Table.Tbody>
            {firstLoad &&
              Array.from({ length: 6 }, (_, i) => (
                <Table.Tr key={`sk-${i}`}>
                  <Table.Td colSpan={colSpan} style={{ padding: '5px 6px' }}>
                    <Skeleton height={22} radius="sm" opacity={1 - i * 0.12} />
                  </Table.Td>
                </Table.Tr>
              ))}
            {!firstLoad && rows.length === 0 && (
              <Table.Tr>
                <Table.Td colSpan={colSpan}>
                  <EmptyState message={props.emptyMessage ?? 'No rows'} />
                </Table.Td>
              </Table.Tr>
            )}
            {rows.map((row) => {
              const original = row.original;
              const extra = props.rowProps?.(original) ?? {};
              return (
                <Table.Tr key={row.id} {...extra} style={{ background: row.getIsSelected() ? 'var(--saa-kpi-bg)' : undefined }}>
                  {hasSelection && (
                    <Table.Td style={{ textAlign: 'center' }}>
                      <Checkbox size="xs" checked={row.getIsSelected()} onChange={row.getToggleSelectedHandler()} aria-label="Select row" />
                    </Table.Td>
                  )}
                  {row.getAllCells().map((cell) => {
                    const col = appCol(cell);
                    const editable = props.editable && col?.editor && props.onCellCommit && !(col.readOnly?.(original) ?? false);
                    return (
                      <Table.Td key={cell.id} style={{ textAlign: col?.align ?? 'center', verticalAlign: 'middle', padding: editable ? '2px 3px' : undefined }}>
                        {cellContent(cell, original)}
                      </Table.Td>
                    );
                  })}
                </Table.Tr>
              );
            })}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>
      )}
      {serverPaged && (
        <TablePager
          page={props.page ?? 1}
          pageSize={props.pageSize ?? 50}
          total={props.total ?? 0}
          onPageChange={(p) => props.onPageChange?.(p)}
          {...(props.onPageSizeChange ? { onPageSizeChange: props.onPageSizeChange } : {})}
          unit={props.unit}
          extra={props.footer}
        />
      )}
      {clientPaged && (
        <TablePager
          page={safeClientPage}
          pageSize={clientPageSize}
          total={props.data.length}
          onPageChange={setClientPage}
          onPageSizeChange={(n) => {
            setClientPageSize(n);
            setClientPage(1);
          }}
          unit={props.unit}
          extra={props.footer}
        />
      )}
      {!serverPaged && !clientPaged && props.footer && (
        <Group justify="flex-end" mt="xs">
          {typeof props.footer === 'string' ? <Text size="xs">{props.footer}</Text> : props.footer}
        </Group>
      )}
    </div>
  );
}

type AppRow<T extends RowData> = ReturnType<ReturnType<typeof useAppTable<T>>['getRowModel']>['rows'][number];

interface MobileCardsProps<T extends RowData> {
  rows: AppRow<T>[];
  columns: AppColumn<T>[];
  appCol: (cell: AppCell<T>) => AppColumn<T> | undefined;
  cellContent: (cell: AppCell<T>, original: T, layout: 'card') => ReactNode;
  firstLoad: boolean;
  emptyMessage?: ReactNode;
  hasSelection: boolean;
  rowProps?: (row: T) => Record<string, unknown> | undefined;
  collapsed?: (row: T) => boolean;
  sorting?: SortSpec[];
  onSortingChange?: (s: SortSpec[]) => void;
  allSelected: boolean;
  someSelected: boolean;
  onToggleAll: (e: unknown) => void;
}

/** Row props from `rowProps` on a card: its `className` is merged with the card class (not replacing it). */
function cardProps(extra: Record<string, unknown> | undefined) {
  const { className, ...rest } = extra ?? {};
  return { ...rest, className: typeof className === 'string' && className ? `${classes.card} ${className}` : classes.card };
}

/** Phone layout: one card per row — title column(s) in the heading, the rest as label-above-value fields. */
function MobileCards<T extends RowData>(p: MobileCardsProps<T>) {
  const sortable = p.onSortingChange ? p.columns.filter((c) => c.sortable !== false) : [];
  const current = p.sorting?.[0];
  const hasTitleCol = p.columns.some((c) => c.mobile === 'title');

  return (
    <div className={classes.cards}>
      {(sortable.length > 0 || p.hasSelection) && (
        <div className={classes.sortBar}>
          {p.hasSelection && (
            <Checkbox
              size="xs"
              label="Select page"
              checked={p.allSelected}
              indeterminate={p.someSelected && !p.allSelected}
              onChange={p.onToggleAll}
              style={{ marginRight: 'auto' }}
            />
          )}
          {sortable.length > 0 && (
            <>
              <Select
                size="xs"
                w={170}
                ml="auto"
                aria-label="Sort by"
                placeholder="Sort by…"
                clearable
                data={sortable.map((c) => ({ value: c.id, label: columnLabel(c) }))}
                value={current?.id ?? null}
                onChange={(v) => p.onSortingChange!(v ? [{ id: v, desc: current?.desc ?? false }] : [])}
                comboboxProps={{ withinPortal: true }}
              />
              <ActionIcon
                variant="default"
                size={30}
                disabled={!current}
                aria-label={current?.desc ? 'Sort ascending' : 'Sort descending'}
                onClick={() => current && p.onSortingChange!([{ id: current.id, desc: !current.desc }])}
              >
                {current?.desc ? <IconSortDescending size={15} /> : <IconSortAscending size={15} />}
              </ActionIcon>
            </>
          )}
        </div>
      )}
      {p.firstLoad && Array.from({ length: 4 }, (_, i) => <Skeleton key={`sk-${i}`} height={96} radius={10} opacity={1 - i * 0.18} />)}
      {!p.firstLoad && p.rows.length === 0 && (
        <div className={classes.card}>
          <EmptyState message={p.emptyMessage ?? 'No rows'} />
        </div>
      )}
      {p.rows.map((row) => {
        const original = row.original;
        const cells = row.getAllCells().filter((c) => p.appCol(c)?.mobile !== 'hidden');
        const isTitle = (c: AppCell<T>, i: number) => (hasTitleCol ? p.appCol(c)?.mobile === 'title' : i === 0);
        const title = cells.filter(isTitle);
        const fields = p.collapsed?.(original) ? [] : cells.filter((c, i) => !isTitle(c, i));
        return (
          <div key={row.id} {...cardProps(p.rowProps?.(original))} data-selected={row.getIsSelected() ? '' : undefined}>
            <div className={classes.cardHead}>
              {p.hasSelection && <Checkbox size="xs" checked={row.getIsSelected()} onChange={row.getToggleSelectedHandler()} aria-label="Select row" />}
              <div className={classes.cardTitle}>
                {title.map((c) => (
                  <span key={c.id} style={{ minWidth: 0 }}>
                    {p.cellContent(c, original, 'card')}
                  </span>
                ))}
              </div>
            </div>
            {fields.length > 0 && (
              <div className={classes.cardBody}>
                {fields.map((c) => {
                  const col = p.appCol(c);
                  return (
                    <div key={c.id} className={col?.mobile === 'full' ? classes.fieldFull : classes.field}>
                      <div className={classes.label}>{col ? columnLabel(col) : c.column.id}</div>
                      <div className={classes.value}>{p.cellContent(c, original, 'card')}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
