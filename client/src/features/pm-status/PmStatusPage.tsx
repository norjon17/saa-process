import { Button, SimpleGrid, Text } from '@mantine/core';
import { modals } from '@mantine/modals';
import { IconCopy, IconDownload } from '@tabler/icons-react';
import { lazy, Suspense, useCallback, useMemo, useState } from 'react';

import { DataTable } from '@/components/table/DataTable';
import { KpiTile } from '@/components/ui/KpiTile';
import { KpiSkeleton } from '@/components/ui/Skeletons';
import { MonthNav } from '@/components/ui/MonthNav';
import { PageHeader } from '@/components/ui/PageHeader';
import { useUsers } from '@/features/ref/api';
import { downloadText, toCsv } from '@/lib/export/csv';
import { monthLabel, shiftMonth } from '@/lib/time';
import { useIsMobile } from '@/lib/useIsMobile';

import { useCopyPmMonth, usePmMonth, useUpdatePmRow, type PmItem } from './api';
import { buildPmColumns, buildPmMobileColumns, pmCellToPatch } from './columns';
import classes from './pm.module.css';

/** The edit drawer (form + date inputs) is only needed when a tool is opened — its own chunk. */
const PmRowDrawer = lazy(() => import('./components/PmRowDrawer').then((m) => ({ default: m.PmRowDrawer })));

const pmRowId = (r: PmItem) => String(r.tool.id);
const NO_ROW_TITLE = 'No PM row yet — editing a cell creates it';
const pmRowProps = (r: PmItem) => (r.row ? undefined : { className: classes.noRow, title: NO_ROW_TITLE });

export interface PmStatusPageProps {
  month: string;
  onMonthChange: (m: string) => void;
}

export function PmStatusPage({ month, onMonthChange }: PmStatusPageProps) {
  const data = usePmMonth(month);
  const users = useUsers();
  const updateRow = useUpdatePmRow(month).mutate;
  const copy = useCopyPmMonth();
  const [open, setOpen] = useState<PmItem | null>(null);
  // Mount the lazy drawer on first open, then keep it so the close transition plays.
  const [drawerMounted, setDrawerMounted] = useState(false);
  const openRow = useCallback((item: PmItem) => {
    setDrawerMounted(true);
    setOpen(item);
  }, []);
  const closeRow = useCallback(() => setOpen(null), []);

  const eeOptions = useMemo(() => (users.data ?? []).filter((u) => u.role === 'ee').map((u) => ({ value: String(u.id), label: u.name })), [users.data]);
  const isMobile = useIsMobile();
  // The export always uses the full Excel layout; phones render a short card per tool instead of 45 columns.
  const columns = useMemo(() => buildPmColumns({ eeOptions, onOpen: openRow }), [eeOptions, openRow]);
  const mobileColumns = useMemo(() => buildPmMobileColumns({ eeOptions, onOpen: openRow }), [eeOptions, openRow]);
  const onCellCommit = useCallback(
    (row: PmItem, columnId: string, value: unknown) => {
      const patch = pmCellToPatch(columnId, value);
      if (patch) updateRow({ toolId: row.tool.id, patch });
    },
    [updateRow],
  );
  const items = useMemo(() => data.data?.items ?? [], [data.data]);

  const stats = useMemo(() => {
    const withRow = items.filter((i) => i.row).length;
    const done = items.filter((i) => i.row?.actualDate).length;
    return { total: items.length, withRow, done, pending: items.length - done };
  }, [items]);

  // Keep the drawer's item in sync with the (optimistically updated) cache.
  const openItem = open ? (items.find((i) => i.tool.id === open.tool.id) ?? open) : null;

  const confirmCopy = () => {
    const from = shiftMonth(month, -1);
    modals.openConfirmModal({
      title: 'Copy from previous month',
      children: (
        <Text size="sm">
          Copy the setup values (vacuum, clamping, offsets, optimization flags, fixtures, remarks) from {monthLabel(from)} into {monthLabel(month)} for every tool that has no row yet. Actual dates are not copied.
        </Text>
      ),
      labels: { confirm: 'Copy', cancel: 'Cancel' },
      onConfirm: () => copy.mutate({ from, to: month }),
    });
  };

  const exportCsv = () => {
    const headers = columns.map((c) => (typeof c.header === 'string' ? c.header : c.id));
    const body = items.map((r) =>
      columns.map((c) => {
        const v = c.exportValue ? c.exportValue(r) : c.accessor(r);
        return Array.isArray(v) ? v.join(' / ') : typeof v === 'boolean' ? (v ? 'Y' : 'N') : v;
      }),
    );
    downloadText(`pm-status-${month}.csv`, toCsv(headers, body));
  };

  return (
    <>
      <PageHeader
        title="PM Status"
        subtitle={`Monthly preventive maintenance record per tool · ${monthLabel(month)}`}
        actions={
          <>
            <Button variant="default" size="xs" leftSection={<IconCopy size={14} />} onClick={confirmCopy} loading={copy.isPending}>
              Copy from previous month
            </Button>
            <Button variant="default" size="xs" leftSection={<IconDownload size={14} />} onClick={exportCsv} disabled={!items.length}>
              Export CSV
            </Button>
          </>
        }
        filters={<MonthNav month={month} onChange={onMonthChange} />}
      />

      {data.isPending ? (
        <KpiSkeleton count={4} />
      ) : (
        // Phones: one row of four short tiles (no sub lines) instead of a 2 × 2 block.
        <SimpleGrid cols={{ base: 4, sm: 3, lg: 4 }} spacing={isMobile ? 6 : 10} mb="md">
          <KpiTile compactOnMobile sectionKey="s3" label={isMobile ? 'Tools' : 'Active tools'} value={stats.total} />
          <KpiTile compactOnMobile sectionKey="s4" label={isMobile ? 'With row' : 'With PM row'} value={stats.withRow} sub={isMobile ? undefined : `${stats.total - stats.withRow} without`} />
          <KpiTile compactOnMobile sectionKey="s1" label={isMobile ? 'Done' : 'PM done'} value={stats.done} sub={isMobile ? undefined : 'actual date set'} />
          <KpiTile compactOnMobile sectionKey={stats.pending ? 's2' : 's1'} label="Pending" value={stats.pending} />
        </SimpleGrid>
      )}

      <div className={isMobile ? classes.phoneCards : undefined}>
      <DataTable<PmItem>
        columns={isMobile ? mobileColumns : columns}
        data={items}
        getRowId={pmRowId}
        editable
        onCellCommit={onCellCommit}
        rowProps={pmRowProps}
        stickyHeader
        minWidth={2400}
        loading={data.isFetching}
        unit="tools"
        emptyMessage="No active tools"
      />
      </div>

      {drawerMounted && (
        <Suspense fallback={null}>
          <PmRowDrawer item={openItem} month={month} eeOptions={eeOptions} onClose={closeRow} />
        </Suspense>
      )}
    </>
  );
}
