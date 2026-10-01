import { Button, Group, Tabs } from '@mantine/core';
import { modals } from '@mantine/modals';
import { IconFileSpreadsheet, IconFileTypeCsv, IconLayoutList, IconPrinter } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { useCallback, useMemo } from 'react';

import type { SectionKey, Shift } from '@shared/domain';
import { SECTION_KEYS } from '@shared/domain';

import { useHeaderActions } from '@/app/shell/useHeaderActions';
import { ShiftNav } from '@/components/ui/MonthNav';
import { PageHeader } from '@/components/ui/PageHeader';
import { SaveIndicator } from '@/components/ui/SaveIndicator';
import { KpiSkeleton } from '@/components/ui/Skeletons';
import { attachmentsQuery, boardQuery, useNoneAll } from '@/features/endorsement/api';
import { EXPORT_HEADERS, exportRow, type ColumnRefs } from '@/features/endorsement/columns';
import { BoardKpis } from '@/features/endorsement/components/BoardKpis';
import { BoardSection } from '@/features/endorsement/components/BoardSection';
import { parseBoardSearch, resolveBoardSearch } from '@/features/endorsement/search';
import { asSectionKey } from '@/features/endorsement/sections';
import { useSaveStore } from '@/features/endorsement/store';
import { useCategories, useTools, useUsers } from '@/features/ref/api';
import { buildUrl } from '@/lib/api/client';
import type { Attachment, Endorsement } from '@/lib/api/types';
import { downloadText, downloadUrl, toCsv } from '@/lib/export/csv';
import { formatLongDate } from '@/lib/time';

export const Route = createFileRoute('/_authed/endorsement/')({
  validateSearch: parseBoardSearch,
  // Only date/shift pick the board; switching the section tab never re-runs the loader.
  loaderDeps: ({ search }) => ({ date: search.date, shift: search.shift }),
  loader: ({ context, deps }) => {
    const { date, shift } = resolveBoardSearch(deps);
    // Start the board fetch in parallel with the route chunk. Not awaited: the page renders at once with
    // KPI/table skeletons instead of blocking navigation (and the full-page skeleton) on every shift change.
    context.queryClient.ensureQueryData(boardQuery(date, shift)).catch(() => undefined);
  },
  component: ShiftBoardPage,
});

const emptyBySection = <T,>() => Object.fromEntries(SECTION_KEYS.map((k) => [k, [] as T[]])) as Record<SectionKey, T[]>;

function ShiftBoardPage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const { date, shift, section } = resolveBoardSearch(search);

  const board = useQuery(boardQuery(date, shift));
  const attachments = useQuery(attachmentsQuery(date, shift));
  const users = useUsers();
  const tools = useTools();
  const categories = useCategories();
  const noneAll = useNoneAll();
  const saveState = useSaveStore((s) => s.state);
  const savedAt = useSaveStore((s) => s.at);

  const refs = useMemo<ColumnRefs>(() => ({ users: users.data ?? [], tools: tools.data ?? [], categories: categories.data ?? [] }), [users.data, tools.data, categories.data]);

  const items = board.data?.items;

  const bySection = useMemo(() => {
    const m = emptyBySection<Endorsement>();
    for (const r of items ?? []) m[asSectionKey(r.sectionKey)].push(r);
    return m;
  }, [items]);

  const attachmentsBySection = useMemo(() => {
    const m = emptyBySection<Attachment>();
    for (const a of attachments.data ?? []) m[asSectionKey(a.sectionKey)].push(a);
    return m;
  }, [attachments.data]);

  const onSectionChange = useCallback(
    (value: string | null) => {
      if (!value) return;
      void navigate({ search: (prev) => ({ ...prev, section: asSectionKey(value) }), replace: true });
    },
    [navigate],
  );

  // Keeps the selected section (and any other param) when stepping through shifts.
  const onShiftChange = useCallback((v: { date: string; shift: Shift }) => void navigate({ search: (prev) => ({ ...prev, ...v }) }), [navigate]);

  useHeaderActions(
    <Group gap={6} wrap="nowrap">
      <Button size="compact-xs" variant="white" color="navy" leftSection={<IconFileTypeCsv size={13} />} onClick={() => downloadText(`SAA_Endorsement_${date}_${shift}.csv`, toCsv(EXPORT_HEADERS, (items ?? []).map(exportRow)))}>
        CSV
      </Button>
      <Button size="compact-xs" variant="white" color="navy" leftSection={<IconFileSpreadsheet size={13} />} onClick={() => downloadUrl(buildUrl('/api/endorsements/export.xlsx', { from: date, to: date, shift }))}>
        Excel
      </Button>
      <Button size="compact-xs" variant="white" color="navy" leftSection={<IconPrinter size={13} />} onClick={() => window.print()}>
        Print
      </Button>
    </Group>,
    [date, shift, items],
  );

  const markAllNone = () =>
    modals.openConfirmModal({
      title: 'Mark all empty sections NONE?',
      children: `Every section with no rows for ${formatLongDate(date)} ${shift} gets a NONE row. Sections that already have rows are left alone.`,
      labels: { confirm: 'Mark NONE', cancel: 'Cancel' },
      onConfirm: () => noneAll.mutate({ date, shift }),
    });

  const rows = bySection[section];
  // Skeleton rows only on first load; an empty section that is merely refetching keeps its empty state.
  const loading = board.isPending || (board.isFetching && rows.length > 0);

  return (
    <>
      <PageHeader
        title="Shift Board"
        subtitle={`${formatLongDate(date)} · ${shift === 'DS' ? 'Day shift' : 'Night shift'} · ${items ? `${items.length} rows` : 'loading…'}`}
        actions={
          <>
            <SaveIndicator state={saveState} at={savedAt} />
            <Button size="compact-sm" variant="default" leftSection={<IconLayoutList size={13} />} onClick={markAllNone} loading={noneAll.isPending}>
              Mark all NONE
            </Button>
            <ShiftNav date={date} shift={shift} onChange={onShiftChange} />
          </>
        }
      />
      <Tabs value={section} onChange={onSectionChange} variant="unstyled" keepMounted={false}>
        {board.data ? <BoardKpis kpi={board.data.kpi} active={section} /> : <KpiSkeleton />}
        {/* keepMounted={false}: only the active panel mounts; each section keeps its own selection/page state. */}
        {SECTION_KEYS.map((key) => (
          <Tabs.Panel key={key} value={key}>
            <BoardSection sectionKey={key} date={date} shift={shift} rows={bySection[key]} attachments={attachmentsBySection[key]} refs={refs} loading={loading} />
          </Tabs.Panel>
        ))}
      </Tabs>
    </>
  );
}
