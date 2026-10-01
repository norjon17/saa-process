import { Button, Group, Select, Text } from '@mantine/core';
import { IconDownload } from '@tabler/icons-react';
import { useCallback, useMemo } from 'react';

import type { ContactChipValue } from '@shared/domain';

import { ToolDateGrid, useTouchPointer, type GridOption, type GridRow } from '@/components/table/ToolDateGrid';
import { EmptyState } from '@/components/ui/EmptyState';
import { KpiRow, KpiTile } from '@/components/ui/KpiTile';
import { KpiSkeleton } from '@/components/ui/Skeletons';
import { MonthNav } from '@/components/ui/MonthNav';
import { PageHeader } from '@/components/ui/PageHeader';
import { useRegions } from '@/features/ref/api';
import { downloadText, toCsv } from '@/lib/export/csv';
import { daysInMonth, monthLabel } from '@/lib/time';
import { useIsMobile } from '@/lib/useIsMobile';

import { useContactChipMonth, useSetContactChip } from './api';
import classes from './contact-chip.module.css';

/** L blue, R green, L/R teal, PM grey, Repair orange — the workbook's cell colours. */
export const CONTACT_CHIP_OPTIONS: (GridOption & { value: ContactChipValue })[] = [
  { value: 'L', label: 'Left', short: 'L', bg: '#1565c0', fg: '#fff' },
  { value: 'R', label: 'Right', short: 'R', bg: '#2e7d32', fg: '#fff' },
  { value: 'LR', label: 'Left + Right', short: 'L/R', bg: '#00695c', fg: '#fff' },
  { value: 'PM', label: 'PM', short: 'PM', bg: '#9e9e9e', fg: '#fff' },
  { value: 'REPAIR', label: 'Repair', short: 'REP', bg: '#e65100', fg: '#fff' },
];

const isChipValue = (v: string | null): v is ContactChipValue => v !== null && CONTACT_CHIP_OPTIONS.some((o) => o.value === v);

export interface ContactChipPageProps {
  month: string;
  regionId: number | undefined;
  onMonthChange: (m: string) => void;
  onRegionChange: (id: number | undefined) => void;
}

export function ContactChipPage({ month, regionId, onMonthChange, onRegionChange }: ContactChipPageProps) {
  const data = useContactChipMonth(month, regionId);
  const regions = useRegions();
  const setCell = useSetContactChip(month, regionId).mutate;
  const days = useMemo(() => daysInMonth(month), [month]);
  const isMobile = useIsMobile();
  const touch = useTouchPointer();

  const rows = useMemo<GridRow[]>(() => {
    if (!data.data) return [];
    const byTool = new Map<number, Record<string, string>>();
    for (const r of data.data.rows) {
      const m = byTool.get(r.toolId) ?? {};
      m[r.date] = r.value;
      byTool.set(r.toolId, m);
    }
    return data.data.tools.map((t) => {
      const cells = byTool.get(t.id) ?? {};
      const n = Object.keys(cells).length;
      return {
        key: String(t.id),
        label: t.code,
        sub: t.toolType ?? undefined,
        group: t.region ?? 'Unassigned',
        cells,
        trailing: n ? (
          <Text size="xs" fw={800}>
            {n}
          </Text>
        ) : (
          <Text size="xs" c="dimmed">
            –
          </Text>
        ),
      };
    });
  }, [data.data]);

  const counts = useMemo(() => {
    const c: Record<ContactChipValue, number> = { L: 0, R: 0, LR: 0, PM: 0, REPAIR: 0 };
    for (const r of data.data?.rows ?? []) c[r.value] += 1;
    return c;
  }, [data.data]);

  const onCellChange = useCallback(
    (rowKey: string, day: string, value: string | null) => {
      if (value !== null && !isChipValue(value)) return;
      setCell({ toolId: Number(rowKey), date: day, value });
    },
    [setCell],
  );

  const exportCsv = () => {
    if (!data.data) return;
    const headers = ['Tool', 'Region', 'Type', ...days.map((d) => d.slice(8, 10))];
    const body = rows.map((r) => {
      const tool = data.data!.tools.find((t) => String(t.id) === r.key);
      return [tool?.code ?? '', tool?.region ?? '', tool?.toolType ?? '', ...days.map((d) => r.cells[d] ?? '')];
    });
    downloadText(`contact-chip-${month}.csv`, toCsv(headers, body));
  };

  return (
    <>
      <PageHeader
        title="Contact Chip"
        subtitle={`Contact chip replacement per tool and day · ${monthLabel(month)}`}
        actions={
          <Button variant="default" size="xs" leftSection={<IconDownload size={14} />} onClick={exportCsv} disabled={!rows.length}>
            Export CSV
          </Button>
        }
        filters={
          <>
            <MonthNav month={month} onChange={onMonthChange} />
            <Select
              size={isMobile ? 'sm' : 'xs'}
              w={isMobile ? '100%' : 160}
              placeholder="All regions"
              data={(regions.data ?? []).map((r) => ({ value: String(r.id), label: r.name }))}
              value={regionId === undefined ? null : String(regionId)}
              onChange={(v) => onRegionChange(v ? Number(v) : undefined)}
              clearable
              comboboxProps={{ withinPortal: true }}
              aria-label="Region filter"
            />
          </>
        }
      />

      {/* Phones: the five KPI tiles would take a full screen; the legend carries the month counts instead. */}
      {!isMobile &&
        (data.isPending ? (
          <KpiSkeleton count={5} />
        ) : (
          <KpiRow cols={5}>
            <KpiTile sectionKey="s3" label="Left" value={counts.L} />
            <KpiTile sectionKey="s1" label="Right" value={counts.R} />
            <KpiTile sectionKey="s6" label="Left + Right" value={counts.LR} />
            <KpiTile sectionKey="s5" label="PM" value={counts.PM} />
            <KpiTile sectionKey="s2" label="Repair" value={counts.REPAIR} />
          </KpiRow>
        ))}

      <Group justify="space-between" mb="xs" wrap="wrap" gap="xs">
        <div className={classes.legend} data-counts={isMobile || undefined}>
          {CONTACT_CHIP_OPTIONS.map((o) => (
            <span key={o.value} className={classes.legendItem}>
              <span className={classes.swatch} style={{ background: o.bg, color: o.fg }}>
                {o.short}
              </span>
              {o.label}
              {isMobile && <span className={classes.count}>{data.isPending ? '…' : counts[o.value]}</span>}
            </span>
          ))}
        </div>
        <span className={classes.hint}>{touch ? `Tap a cell to pick a value${isMobile ? ' · swipe the grid for more days' : ''}` : 'Click cycles · right-click picks · keys 1–5 set · Delete clears'}</span>
      </Group>

      {!data.isPending && rows.length === 0 ? (
        <EmptyState message="No active tools in this region" />
      ) : (
        <ToolDateGrid rows={rows} days={days} options={CONTACT_CHIP_OPTIONS} trailingHeader="Count" onCellChange={onCellChange} loading={data.isPending} />
      )}
    </>
  );
}
