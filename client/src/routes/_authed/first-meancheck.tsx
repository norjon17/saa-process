import { Button, Group, SegmentedControl, Select, Stack } from '@mantine/core';
import { IconFileTypeCsv } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { Suspense, useCallback, useMemo, useState } from 'react';
import { z } from 'zod';

import type { McCellStatus, McDailyCell } from '@shared/domain';

import { useTouchPointer } from '@/components/table/ToolDateGrid';
import { MonthNav } from '@/components/ui/MonthNav';
import { PageHeader } from '@/components/ui/PageHeader';
import { ChartSkeleton } from '@/components/ui/Skeletons';
import { dailyMonthQuery, dailySummaryQuery, useDeleteDaily, useUpsertDaily } from '@/features/first-meancheck/api';
import { DailyGrid } from '@/features/first-meancheck/components/DailyGrid';
import { DailyKpis } from '@/features/first-meancheck/components/DailyKpis';
import { DailyLegend } from '@/features/first-meancheck/components/DailyLegend';
import { DailyPassChartLazy, NotesModalLazy } from '@/features/first-meancheck/components/lazy';
import { isCellStatus, monthCsv, type DailyView } from '@/features/first-meancheck/model';
import { regionsQuery, useRegions } from '@/features/ref/api';
import type { GridTool } from '@/lib/api/types';
import { downloadText } from '@/lib/export/csv';
import { currentMonth, daysInMonth, monthLabel, monthRange } from '@/lib/time';
import { useIsMobile } from '@/lib/useIsMobile';

const searchSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/).optional(),
  regionId: z.number().int().positive().optional(),
  view: z.enum(['overall', 'cells']).optional(),
});

export const Route = createFileRoute('/_authed/first-meancheck')({
  validateSearch: searchSchema,
  // `view` only changes the rendering, so it is not a loader dependency.
  loaderDeps: ({ search }) => ({ month: search.month, regionId: search.regionId }),
  loader: ({ context, deps }) => {
    const month = deps.month ?? currentMonth();
    const { from, to } = monthRange(month);
    void context.queryClient.prefetchQuery(dailySummaryQuery(from, to));
    void context.queryClient.prefetchQuery(regionsQuery);
    return context.queryClient.ensureQueryData(dailyMonthQuery(month, deps.regionId));
  },
  component: FirstMeancheckPage,
});

const clean = <T extends object>(o: T): T => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as T;

function FirstMeancheckPage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const month = search.month ?? currentMonth();
  const regionId = search.regionId;
  const view: DailyView = search.view ?? 'overall';
  const days = useMemo(() => daysInMonth(month), [month]);
  const { from, to } = monthRange(month);

  const regions = useRegions();
  const grid = useQuery(dailyMonthQuery(month, regionId));
  const summary = useQuery(dailySummaryQuery(from, to));
  // `mutate` is stable across renders, unlike the mutation result objects.
  const upsert = useUpsertDaily(month, regionId);
  const upsertMutate = upsert.mutate;
  const removeMutate = useDeleteDaily(month, regionId).mutate;
  const [notesTool, setNotesTool] = useState<GridTool | null>(null);
  // Mount the (lazy) notes modal on first open and keep it mounted so its close transition still plays.
  const [notesMounted, setNotesMounted] = useState(false);
  const openNotes = useCallback((tool: GridTool) => {
    setNotesMounted(true);
    setNotesTool(tool);
  }, []);
  const closeNotes = useCallback(() => setNotesTool(null), []);

  const setSearch = (patch: { month?: string | undefined; regionId?: number | undefined; view?: DailyView | undefined }) =>
    void navigate({ search: (prev) => clean({ ...prev, ...patch }) });

  const onCellChange = useCallback(
    (toolId: number, date: string, cell: McDailyCell | undefined, value: McCellStatus | null) => {
      if (cell) {
        upsertMutate({ toolId, date, patch: { cells: { [cell]: isCellStatus(value) ? value : null } } });
        return;
      }
      // Overall view: a real status fills all eight cells; "pending" / clear removes the day.
      if (isCellStatus(value)) upsertMutate({ toolId, date, patch: { fillAll: value } });
      else removeMutate({ toolId, date });
    },
    [upsertMutate, removeMutate],
  );

  const saveNote = useCallback(
    (date: string, note: string | null) => {
      if (notesTool) upsertMutate({ toolId: notesTool.id, date, patch: { note } }, { onSuccess: () => setNotesTool(null) });
    },
    [notesTool, upsertMutate],
  );

  const exportCsv = () => {
    if (!grid.data) return;
    downloadText(`1st-meancheck-${month}-${view}.csv`, monthCsv(grid.data, days, view));
  };

  const isMobile = useIsMobile();
  const touch = useTouchPointer();
  const regionData = [{ label: 'All regions', value: 'all' }, ...(regions.data ?? []).map((r) => ({ label: r.name, value: String(r.id) }))];
  const regionValue = regionId === undefined ? 'all' : String(regionId);
  const onRegion = (v: string | null) => setSearch({ regionId: !v || v === 'all' ? undefined : Number(v) });

  const notesRows = useMemo(() => (notesTool && grid.data ? grid.data.rows.filter((r) => r.toolId === notesTool.id) : []), [notesTool, grid.data]);

  return (
    <div>
      <PageHeader
        title="1st Meancheck daily"
        subtitle={
          touch || isMobile
            ? `${monthLabel(month)} · tap a cell to pick a status · overall is derived on the server`
            : `${monthLabel(month)} · left-click cycles, right-click picks, Delete clears · overall is derived on the server`
        }
        actions={
          <Button size="xs" variant="default" leftSection={<IconFileTypeCsv size={14} />} onClick={exportCsv} disabled={!grid.data}>
            Export CSV
          </Button>
        }
        filters={
          <Stack gap={6} style={{ width: '100%' }}>
            <Group gap="sm" wrap="wrap">
              <MonthNav month={month} onChange={(m) => setSearch({ month: m === currentMonth() ? undefined : m })} />
              {/* Six regions do not fit a segmented control on a phone — use a select there. */}
              {isMobile ? (
                <Select
                  size="xs"
                  style={{ flex: '1 1 140px', minWidth: 0 }}
                  aria-label="Region"
                  allowDeselect={false}
                  data={regionData}
                  value={regionValue}
                  onChange={onRegion}
                  comboboxProps={{ withinPortal: true }}
                />
              ) : (
                <SegmentedControl size="xs" value={regionValue} onChange={onRegion} data={regionData} />
              )}
              <SegmentedControl
                size="xs"
                value={view}
                onChange={(v) => setSearch({ view: v === 'overall' ? undefined : (v as DailyView) })}
                data={[
                  { label: 'Overall', value: 'overall' },
                  { label: '8 cells', value: 'cells' },
                ]}
              />
            </Group>
            <DailyLegend />
          </Stack>
        }
      />
      <DailyKpis summary={summary.data} />
      <DailyGrid data={grid.data} loading={grid.isPending} days={days} view={view} onCellChange={onCellChange} onOpenNotes={openNotes} />
      <div style={{ marginTop: 14 }}>{summary.data ? <DailyPassChartLazy items={summary.data.items} days={days} /> : <ChartSkeleton h={246} />}</div>
      {notesMounted && (
        <Suspense fallback={null}>
          <NotesModalLazy tool={notesTool} days={days} rows={notesRows} saving={upsert.isPending} onClose={closeNotes} onSave={saveNote} />
        </Suspense>
      )}
    </div>
  );
}
