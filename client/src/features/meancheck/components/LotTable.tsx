import { ActionIcon, Anchor, Text, Tooltip } from '@mantine/core';
import { modals } from '@mantine/modals';
import { IconTrash } from '@tabler/icons-react';
import { Link } from '@tanstack/react-router';
import { memo, useMemo } from 'react';

import { DataTable } from '@/components/table/DataTable';
import type { AppColumn } from '@/components/table/types';
import { ShiftPill, VerdictPill } from '@/components/ui/StatusPill';
import type { LotSummary } from '@/lib/api/types';
import { notify } from '@/lib/notify';
import { timeAgo } from '@/lib/time';
import { useCan } from '@/stores/session.store';

import { useDeleteLot } from '../api';
import { TOTAL_CHECKS } from '../model';

export interface LotTableProps {
  items: LotSummary[];
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  /** Query is fetching: skeleton rows on first load, progress bar on page/filter switches. */
  loading?: boolean;
}

export function confirmDeleteLot(lot: { id: number; lotNo: string }, onConfirm: () => void) {
  modals.openConfirmModal({
    title: 'Delete verdict',
    children: (
      <Text size="sm">
        Delete the verdict for <b>{lot.lotNo}</b>? The stored CSV files and the derived 1st-meancheck cells for that day are removed too.
      </Text>
    ),
    labels: { confirm: 'Delete', cancel: 'Cancel' },
    confirmProps: { color: 'red' },
    onConfirm,
  });
}

const lotRowId = (r: LotSummary) => String(r.id);

/** Server-paginated lot list. */
export const LotTable = memo(function LotTable({ items, total, page, pageSize, onPageChange, onPageSizeChange, loading }: LotTableProps) {
  const canDelete = useCan('deleteLots');
  // `mutate` is referentially stable; depending on the whole mutation object would rebuild the columns on every state change.
  const deleteLot = useDeleteLot().mutate;

  const columns = useMemo<AppColumn<LotSummary>[]>(() => {
    const cols: AppColumn<LotSummary>[] = [
      {
        id: 'lotNo',
        header: 'Lot',
        accessor: (r) => r.lotNo,
        align: 'left',
        minWidth: 180,
        mobile: 'title',
        render: (r) => (
          <Anchor renderRoot={(props) => <Link to="/meancheck/$lotId" params={{ lotId: String(r.id) }} {...props} />} fw={800} size="sm">
            {r.lotNo}
          </Anchor>
        ),
      },
      { id: 'mcDate', header: 'Date', accessor: (r) => r.mcDate, width: 100 },
      { id: 'shift', header: 'Shift', accessor: (r) => r.shift, width: 60, render: (r) => (r.shift ? <ShiftPill shift={r.shift} /> : '—') },
      { id: 'tool', header: 'Tool', accessor: (r) => r.tool.code, width: 80, render: (r) => <b>{r.tool.code}</b> },
      { id: 'region', header: 'Region', accessor: (r) => r.tool.region?.name ?? '', width: 90, render: (r) => r.tool.region?.name ?? '—' },
      { id: 'model', header: 'Model', accessor: (r) => r.modelCode, width: 70 },
      { id: 'head', header: 'Head', accessor: (r) => r.headType, width: 60, render: (r) => r.headType ?? '—' },
      { id: 'sat', header: 'SAT tester', accessor: (r) => r.satTester, width: 90, render: (r) => r.satTester ?? '—' },
      { id: 'verdict', header: 'Verdict', accessor: (r) => r.verdict, width: 90, mobile: 'title', render: (r) => <VerdictPill verdict={r.verdict} /> },
      {
        id: 'fails',
        header: 'Fails',
        accessor: (r) => r.failCount,
        width: 70,
        render: (r) => (
          <Text size="xs" fw={800} c={r.failCount ? 'red' : 'dimmed'}>
            {r.failCount}/{TOTAL_CHECKS}
          </Text>
        ),
      },
      {
        id: 'uploaded',
        header: 'Uploaded',
        accessor: (r) => r.createdAt,
        width: 100,
        render: (r) => (
          <Text size="xs" c="dimmed" title={r.createdAt}>
            {timeAgo(r.createdAt)}
          </Text>
        ),
      },
    ];
    if (canDelete) {
      cols.push({
        id: 'actions',
        header: '',
        accessor: () => null,
        width: 44,
        sortable: false,
        mobile: 'title',
        render: (r) => (
          <Tooltip label="Delete verdict" withArrow>
            <ActionIcon
              size="sm"
              variant="subtle"
              color="red"
              aria-label="Delete verdict"
              onClick={() => confirmDeleteLot(r, () => deleteLot(r.id, { onSuccess: () => notify.success(`Deleted ${r.lotNo}`) }))}
            >
              <IconTrash size={14} />
            </ActionIcon>
          </Tooltip>
        ),
      });
    }
    return cols;
  }, [canDelete, deleteLot]);

  return (
    <DataTable
      columns={columns}
      data={items}
      getRowId={lotRowId}
      page={page}
      pageSize={pageSize}
      total={total}
      onPageChange={onPageChange}
      onPageSizeChange={onPageSizeChange}
      loading={loading}
      unit="lots"
      emptyMessage="No lots match these filters."
      minWidth={980}
    />
  );
});
