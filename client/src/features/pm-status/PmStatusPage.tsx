import { Button, Group, SegmentedControl, Select, SimpleGrid, Text, TextInput } from '@mantine/core';
import { modals } from '@mantine/modals';
import { IconCopy, IconDownload, IconLayoutGrid, IconSearch, IconTable } from '@tabler/icons-react';
import { lazy, Suspense, useCallback, useMemo, useState } from 'react';

import { DataTable } from '@/components/table/DataTable';
import { KpiTile } from '@/components/ui/KpiTile';
import { KpiSkeleton } from '@/components/ui/Skeletons';
import { MonthNav } from '@/components/ui/MonthNav';
import { PageHeader } from '@/components/ui/PageHeader';
import { useUsers } from '@/features/ref/api';
import { downloadText, toCsv } from '@/lib/export/csv';
import { currentMonth, monthLabel, plantClock, shiftMonth } from '@/lib/time';
import { useIsMobile } from '@/lib/useIsMobile';

import { useCopyPmMonth, usePmMonth, useUpdatePmRow, type PmItem, type PmPatch } from './api';
import { buildPmColumns, buildPmMobileColumns, pmCellToPatch } from './columns';
import { PmBoardLegend, PmToolBoard, regionOf } from './components/PmToolBoard';
import classes from './pm.module.css';
import { normalizeQuery, pmState } from './pmState';

/** The edit drawer (form + date inputs) is only needed when a tool is opened — its own chunk. */
const PmRowDrawer = lazy(() => import('./components/PmRowDrawer').then((m) => ({ default: m.PmRowDrawer })));

const pmRowId = (r: PmItem) => String(r.tool.id);
const NO_ROW_TITLE = 'No PM row yet — editing a cell creates it';
const pmRowProps = (r: PmItem) => (r.row ? undefined : { className: classes.noRow, title: NO_ROW_TITLE });

export type PmView = 'cards' | 'table';

const VIEW_DATA = [
  {
    value: 'cards',
    label: (
      <Group gap={4} wrap="nowrap">
        <IconLayoutGrid size={14} /> Cards
      </Group>
    ),
  },
  {
    value: 'table',
    label: (
      <Group gap={4} wrap="nowrap">
        <IconTable size={14} /> Table
      </Group>
    ),
  },
];

export interface PmStatusPageProps {
  month: string;
  onMonthChange: (m: string) => void;
  view: PmView;
  onViewChange: (v: PmView) => void;
}

export function PmStatusPage({ month, onMonthChange, view, onViewChange }: PmStatusPageProps) {
  const data = usePmMonth(month);
  const users = useUsers();
  const updateRow = useUpdatePmRow(month).mutate;
  const copy = useCopyPmMonth();
  const [region, setRegion] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const today = plantClock().date;
  const nowMonth = currentMonth();
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
  const saveFromCard = useCallback((item: PmItem, patch: PmPatch) => updateRow({ toolId: item.tool.id, patch }), [updateRow]);

  const items = useMemo(() => data.data?.items ?? [], [data.data]);
  const regions = useMemo(() => [...new Set(items.map(regionOf))].toSorted(), [items]);
  const filtered = useMemo(() => {
    const q = normalizeQuery(query);
    return items.filter((i) => (!region || regionOf(i) === region) && (!q || i.tool.code.includes(q)));
  }, [items, region, query]);
  const filtering = region !== null || query.trim() !== '';

  // KPIs always cover the whole month; the filters only narrow the cards / table.
  const stats = useMemo(() => {
    const c = { done: 0, pending: 0, missed: 0, none: 0 };
    for (const i of items) c[pmState(i, month, nowMonth)] += 1;
    return { total: items.length, ...c };
  }, [items, month, nowMonth]);
  const isPast = month < nowMonth;

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

  const pct = (n: number) => (stats.total ? `${Math.round((n / stats.total) * 100)}% of tools` : undefined);

  return (
    <>
      <PageHeader
        title="PM Status"
        subtitle={`Monthly preventive maintenance per tool · ${monthLabel(month)}`}
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
        <SimpleGrid cols={{ base: 4, sm: 4 }} spacing={isMobile ? 6 : 10} mb="md">
          <KpiTile compactOnMobile sectionKey="s3" label={isMobile ? 'Tools' : 'Active tools'} value={stats.total} />
          <KpiTile compactOnMobile sectionKey="s1" label={isMobile ? 'Done' : 'PM done'} value={stats.done} sub={isMobile ? undefined : pct(stats.done)} />
          {isPast ? (
            <KpiTile compactOnMobile sectionKey={stats.missed ? 's5' : 's1'} label="Missed" value={stats.missed} sub={isMobile ? undefined : 'month over, no done date'} />
          ) : (
            <KpiTile compactOnMobile sectionKey={stats.pending ? 's2' : 's1'} label="Pending" value={stats.pending} sub={isMobile ? undefined : 'no done date yet'} />
          )}
          <KpiTile compactOnMobile sectionKey="s4" label={isMobile ? 'No row' : 'No PM row'} value={stats.none} sub={isMobile ? undefined : 'tool not in this month’s PM'} />
        </SimpleGrid>
      )}

      <Group gap="xs" mb="sm" wrap="wrap" className="saa-no-print">
        <SegmentedControl size="xs" data={VIEW_DATA} value={view} onChange={(v) => onViewChange(v === 'table' ? 'table' : 'cards')} aria-label="View" />
        <Select
          size="xs"
          w={isMobile ? undefined : 150}
          style={isMobile ? { flex: '1 1 100px' } : undefined}
          placeholder="All regions"
          data={regions}
          value={region}
          onChange={setRegion}
          clearable
          aria-label="Region"
        />
        <TextInput
          size="xs"
          w={isMobile ? undefined : 170}
          style={isMobile ? { flex: '1 1 100px' } : undefined}
          placeholder="Search tool"
          leftSection={<IconSearch size={14} />}
          value={query}
          onChange={(e) => setQuery(e.currentTarget.value)}
          aria-label="Search tool code"
        />
        {filtering && (
          <Text size="xs" c="dimmed" fw={700}>
            {filtered.length} of {items.length} tools
          </Text>
        )}
      </Group>

      {view === 'cards' ? (
        <>
          <div className={classes.legendRow}>
            <PmBoardLegend />
          </div>
          <PmToolBoard
            items={filtered}
            month={month}
            currentMonth={nowMonth}
            today={today}
            loading={data.isPending}
            emptyMessage={items.length ? 'No tools match the filters.' : 'No active tools.'}
            onSave={saveFromCard}
            onOpenForm={openRow}
          />
        </>
      ) : (
        <div className={isMobile ? classes.phoneCards : undefined}>
          <DataTable<PmItem>
            columns={isMobile ? mobileColumns : columns}
            data={filtered}
            getRowId={pmRowId}
            editable
            onCellCommit={onCellCommit}
            rowProps={pmRowProps}
            stickyHeader
            minWidth={2400}
            loading={data.isFetching}
            unit="tools"
            emptyMessage={items.length ? 'No tools match the filters' : 'No active tools'}
          />
        </div>
      )}

      {drawerMounted && (
        <Suspense fallback={null}>
          <PmRowDrawer item={openItem} month={month} eeOptions={eeOptions} onClose={closeRow} />
        </Suspense>
      )}
    </>
  );
}
