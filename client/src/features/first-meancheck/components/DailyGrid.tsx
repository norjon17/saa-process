import { ActionIcon, Text, Tooltip } from '@mantine/core';
import { IconNote, IconNoteOff } from '@tabler/icons-react';
import { memo, useCallback, useMemo } from 'react';

import type { McCellStatus, McDailyCell } from '@shared/domain';
import { MC_DAILY_CELLS } from '@shared/domain';

import { ToolDateGrid, type GridRow } from '@/components/table/ToolDateGrid';
import type { DailyMonthResponse, GridTool } from '@/lib/api/types';
import { fmtPct } from '@/lib/format';

import { CELL_LABELS, cellOptions, cellTooltip, indexRows, overallCellValue, overallViewOptions, parseRowKey, regionOf, rowKey, toolPassRate, type DailyView } from '../model';

export interface DailyGridProps {
  /** Undefined until the month loads (skeleton rows). */
  data: DailyMonthResponse | undefined;
  loading?: boolean;
  days: string[];
  view: DailyView;
  /** `cell` undefined = overall view (fill all eight); `value` null = clear. */
  onCellChange: (toolId: number, date: string, cell: McDailyCell | undefined, value: McCellStatus | null) => void;
  onOpenNotes: (tool: GridTool) => void;
}

const ToolLabel = memo(function ToolLabel({ tool, noteCount, onOpenNotes }: { tool: GridTool; noteCount: number; onOpenNotes: (tool: GridTool) => void }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      {tool.code}
      <Tooltip label={noteCount ? `${noteCount} note${noteCount === 1 ? '' : 's'} this month` : 'Add a note'} withArrow openDelay={300}>
        <ActionIcon size={16} variant={noteCount ? 'light' : 'subtle'} color={noteCount ? 'brand' : 'gray'} onClick={() => onOpenNotes(tool)} aria-label={`Notes for ${tool.code}`}>
          {noteCount ? <IconNote size={11} /> : <IconNoteOff size={11} />}
        </ActionIcon>
      </Tooltip>
    </span>
  );
});

const NO_ROWS: GridRow[] = [];

/** Tools × days grid; overall view paints one row per tool, cells view eight sub-rows per tool (paged together by tool). */
export const DailyGrid = memo(function DailyGrid({ data, loading, days, view, onCellChange, onOpenNotes }: DailyGridProps) {
  const rows = useMemo<GridRow[]>(() => {
    if (!data) return NO_ROWS;
    const idx = indexRows(data.rows);
    const out: GridRow[] = [];
    for (const tool of data.tools) {
      const m = idx.get(tool.id);
      const rate = toolPassRate(m?.values());
      const noteCount = m ? [...m.values()].filter((r) => !!r.note).length : 0;
      const trailing = (
        <Text size="xs" fw={800} c={rate === null ? 'dimmed' : rate >= 0.8 ? 'green' : 'red'}>
          {fmtPct(rate)}
        </Text>
      );
      const tooltips: Record<string, string> = {};
      for (const d of days) {
        const t = cellTooltip(m?.get(d));
        if (t) tooltips[d] = t;
      }
      const label = <ToolLabel tool={tool} noteCount={noteCount} onOpenNotes={onOpenNotes} />;
      if (view === 'overall') {
        const cells: Record<string, string | null> = {};
        for (const d of days) {
          const r = m?.get(d);
          cells[d] = r ? overallCellValue(r) : null;
        }
        out.push({ key: rowKey(tool.id), label, pickerLabel: `${tool.code} overall`, sub: tool.toolType ?? undefined, group: regionOf(tool), cells, tooltips, trailing });
      } else {
        MC_DAILY_CELLS.forEach((cell, i) => {
          const cells: Record<string, string | null> = {};
          for (const d of days) cells[d] = m?.get(d)?.[cell] ?? null;
          out.push({
            key: rowKey(tool.id, cell),
            label: i === 0 ? label : CELL_LABELS[cell],
            pickerLabel: `${tool.code} ${CELL_LABELS[cell]}`,
            sub: i === 0 ? CELL_LABELS[cell] : undefined,
            group: `${regionOf(tool)} · ${tool.code}`,
            pageKey: String(tool.id),
            cells,
            tooltips,
            trailing: i === 0 ? trailing : null,
          });
        });
      }
    }
    return out;
  }, [data, days, view, onOpenNotes]);

  const handleCellChange = useCallback(
    (key: string, day: string, value: string | null) => {
      const { toolId, cell } = parseRowKey(key);
      if (!Number.isInteger(toolId)) return;
      onCellChange(toolId, day, cell, value as McCellStatus | null);
    },
    [onCellChange],
  );

  return (
    <ToolDateGrid
      rows={rows}
      days={days}
      options={view === 'overall' ? overallViewOptions : cellOptions}
      trailingHeader="Pass %"
      cellWidth={view === 'overall' ? 32 : 30}
      onCellChange={handleCellChange}
      loading={loading}
    />
  );
});
