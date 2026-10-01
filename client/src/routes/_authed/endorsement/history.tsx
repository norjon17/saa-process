import { Button, Card, Group } from '@mantine/core';
import { IconFileSpreadsheet, IconFileTypeCsv } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { useCallback, useMemo } from 'react';

import { DataTable } from '@/components/table/DataTable';
import type { SortSpec } from '@/components/table/types';
import { PageHeader } from '@/components/ui/PageHeader';
import { SaveIndicator } from '@/components/ui/SaveIndicator';
import { listParamsToQuery, listQuery, summaryQuery, usePatchEndorsement } from '@/features/endorsement/api';
import { buildEndorsementColumns, patchFromCell, TABLE_MIN_WIDTH, type ColumnRefs } from '@/features/endorsement/columns';
import { countActiveHistoryFilters, HistoryFilters } from '@/features/endorsement/components/HistoryFilters';
import { SummaryStrip } from '@/features/endorsement/components/SummaryStrip';
import { historyListParams, historySummaryParams, parseHistorySearch, resolveHistorySearch, type HistorySearch } from '@/features/endorsement/search';
import { useSaveStore } from '@/features/endorsement/store';
import { useCategories, useTools, useUsers } from '@/features/ref/api';
import { buildUrl } from '@/lib/api/client';
import type { Endorsement } from '@/lib/api/types';
import { downloadUrl } from '@/lib/export/csv';
import { useIsMobile } from '@/lib/useIsMobile';
import { useHeaderActions } from '@/app/shell/useHeaderActions';
import classes from '@/features/endorsement/endorsement.module.css';

export const Route = createFileRoute('/_authed/endorsement/history')({
  validateSearch: parseHistorySearch,
  component: HistoryPage,
});

const noneRowProps = (r: Endorsement) => (r.isNone ? { 'data-none-row': '' } : undefined);
/** Phone cards: NONE rows show only their black "NONE" heading. */
const isNoneRow = (r: Endorsement) => r.isNone;
const rowId = (r: Endorsement) => String(r.id);

function HistoryPage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const filters = useMemo(() => resolveHistorySearch(search), [search]);

  const listParams = useMemo(() => historyListParams(filters), [filters]);
  const list = useQuery(listQuery(listParams));
  const summary = useQuery(summaryQuery(historySummaryParams(filters)));
  const users = useUsers();
  const tools = useTools(true);
  const categories = useCategories();
  const { mutate: patchRow } = usePatchEndorsement();
  const saveState = useSaveStore((s) => s.state);
  const savedAt = useSaveStore((s) => s.at);

  const refs = useMemo<ColumnRefs>(() => ({ users: users.data ?? [], tools: tools.data ?? [], categories: categories.data ?? [] }), [users.data, tools.data, categories.data]);
  const isMobile = useIsMobile();
  const columns = useMemo(() => buildEndorsementColumns({ mode: 'history', refs, mobile: isMobile }), [refs, isMobile]);

  const setSearch = useCallback((patchSearch: Partial<HistorySearch>) => void navigate({ search: (prev) => ({ ...prev, ...patchSearch }) }), [navigate]);
  const reset = useCallback(() => void navigate({ search: {} }), [navigate]);

  const sorting = useMemo<SortSpec[]>(() => (filters.sort.startsWith('date') ? [{ id: 'date', desc: filters.sort === 'date:desc' }] : []), [filters.sort]);
  const onSortingChange = useCallback(
    (s: SortSpec[]) => {
      const d = s.find((x) => x.id === 'date');
      setSearch({ sort: d ? (d.desc ? 'date:desc' : 'date:asc') : 'date:desc', page: 1 });
    },
    [setSearch],
  );
  const onPageChange = useCallback((page: number) => setSearch({ page }), [setSearch]);
  const onPageSizeChange = useCallback((pageSize: number) => setSearch({ pageSize, page: 1 }), [setSearch]);
  const onCellCommit = useCallback(
    (row: Endorsement, columnId: string, value: unknown) => {
      const body = patchFromCell(columnId, value);
      if (body) patchRow({ id: row.id, patch: body });
    },
    [patchRow],
  );

  const exportQuery = () => {
    const { page: _p, pageSize: _ps, ...rest } = listParams;
    return listParamsToQuery(rest);
  };

  useHeaderActions(
    <Group gap={6} wrap="nowrap">
      <Button size="compact-xs" variant="white" color="navy" leftSection={<IconFileTypeCsv size={13} />} onClick={() => downloadUrl(buildUrl('/api/endorsements/export.csv', exportQuery()))}>
        CSV
      </Button>
      <Button size="compact-xs" variant="white" color="navy" leftSection={<IconFileSpreadsheet size={13} />} onClick={() => downloadUrl(buildUrl('/api/endorsements/export.xlsx', exportQuery()))}>
        Excel
      </Button>
    </Group>,
    [listParams],
  );

  return (
    <>
      <PageHeader
        title="Endorsement History"
        subtitle={`${filters.from} → ${filters.to}${filters.shift ? ` · ${filters.shift}` : ''}${list.data ? ` · ${list.data.total} rows` : ''}`}
        actions={<SaveIndicator state={saveState} at={savedAt} />}
        filters={<HistoryFilters value={filters} refs={refs} onChange={setSearch} onReset={reset} />}
        collapsibleFilters
        activeFilterCount={countActiveHistoryFilters(search)}
      />
      <SummaryStrip summary={summary.data} loading={summary.isFetching} />
      <Card padding="xs" className={classes.tableCard}>
        <DataTable<Endorsement>
          columns={columns}
          data={list.data?.items ?? []}
          getRowId={rowId}
          sorting={sorting}
          onSortingChange={onSortingChange}
          page={filters.page}
          pageSize={filters.pageSize}
          total={list.data?.total ?? 0}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
          loading={list.isFetching}
          editable
          onCellCommit={onCellCommit}
          rowProps={noneRowProps}
          mobileCollapsed={isNoneRow}
          minWidth={TABLE_MIN_WIDTH}
          stickyHeader
          emptyMessage="No endorsements match these filters."
        />
      </Card>
    </>
  );
}
