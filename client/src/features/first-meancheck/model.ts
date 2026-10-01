import type { McCellStatus, McDailyCell, McDailyOverall } from '@shared/domain';
import { MC_CELL_STATUSES, MC_DAILY_CELLS } from '@shared/domain';

import type { GridOption } from '@/components/table/ToolDateGrid';
import type { DailyMonthResponse, DailyRow, GridTool } from '@/lib/api/types';
import { toCsv } from '@/lib/export/csv';
import { CELL_COLORS, OVERALL_COLORS } from '@/theme/colors';

export type DailyView = 'overall' | 'cells';

export const CELL_LABELS: Record<McDailyCell, string> = {
  vsSatPsaL: 'vs SAT PSA L',
  vsSatPsaR: 'vs SAT PSA R',
  vsSatRsaL: 'vs SAT RSA L',
  vsSatRsaR: 'vs SAT RSA R',
  vsTgtPsaL: 'vs Target PSA L',
  vsTgtPsaR: 'vs Target PSA R',
  vsTgtRsaL: 'vs Target RSA L',
  vsTgtRsaR: 'vs Target RSA R',
};

const CELL_SHORT: Record<McCellStatus, string> = { P_AUTO: 'PA', F_AUTO: 'FA', P_MAN: 'PM', F_MAN: 'FM', IDLE: 'ID', MB: 'MB' };

export type DailyCells = Partial<Record<McDailyCell, McCellStatus | null>>;

/**
 * Client mirror of the server's overall rule (server/src/modules/meancheck-daily/overall.ts), used only
 * for the optimistic update; the server's value replaces it as soon as the PUT returns.
 */
export function computeOverall(cells: DailyCells): McDailyOverall {
  const filled = MC_DAILY_CELLS.map((k) => cells[k] ?? null).filter((v): v is McCellStatus => v !== null);
  if (filled.length === 0) return 'pending';
  if (filled.some((v) => v === 'F_AUTO' || v === 'F_MAN')) return 'failed';
  const passes = filled.filter((v) => v === 'P_AUTO' || v === 'P_MAN').length;
  if (passes === MC_DAILY_CELLS.length) return 'passed';
  if (passes === 0) {
    if (filled.every((v) => v === 'IDLE')) return 'idle';
    if (filled.every((v) => v === 'MB')) return 'mb';
    return filled.includes('MB') ? 'mb' : 'idle';
  }
  return 'pending';
}

export const isCellStatus = (v: string | null | undefined): v is McCellStatus => !!v && (MC_CELL_STATUSES as readonly string[]).includes(v);

/** Grid options for the per-cell view: the six cell statuses. */
export const cellOptions: GridOption[] = MC_CELL_STATUSES.map((k) => ({ value: k, label: CELL_COLORS[k].label, bg: CELL_COLORS[k].bg, fg: CELL_COLORS[k].fg, short: CELL_SHORT[k] }));

/** Sentinel value shown in the overall view for a day that exists but is incomplete; choosing it clears the day. */
export const PENDING_VALUE = 'pending';

/** Overall view: the day is painted with the cell status that best describes it; picking one fills all eight cells. */
export const overallViewOptions: GridOption[] = [
  ...cellOptions,
  { value: PENDING_VALUE, label: 'Pending (clear the day)', bg: OVERALL_COLORS.pending.bg, fg: OVERALL_COLORS.pending.fg, short: '…' },
];

export function overallCellValue(row: DailyRow): string {
  switch (row.overall) {
    case 'passed':
      return MC_DAILY_CELLS.every((k) => row[k] === 'P_AUTO') ? 'P_AUTO' : 'P_MAN';
    case 'failed':
      return MC_DAILY_CELLS.some((k) => row[k] === 'F_AUTO') ? 'F_AUTO' : 'F_MAN';
    case 'idle':
      return 'IDLE';
    case 'mb':
      return 'MB';
    default:
      return PENDING_VALUE;
  }
}

export type RowIndex = Map<number, Map<string, DailyRow>>;

export function indexRows(rows: DailyRow[]): RowIndex {
  const idx: RowIndex = new Map();
  for (const r of rows) {
    let m = idx.get(r.toolId);
    if (!m) {
      m = new Map();
      idx.set(r.toolId, m);
    }
    m.set(r.date, r);
  }
  return idx;
}

export function toolPassRate(rows: Iterable<DailyRow> | undefined): number | null {
  if (!rows) return null;
  let passed = 0;
  let failed = 0;
  for (const r of rows) {
    if (r.overall === 'passed') passed += 1;
    else if (r.overall === 'failed') failed += 1;
  }
  return passed + failed > 0 ? passed / (passed + failed) : null;
}

export function cellTooltip(row: DailyRow | undefined): string | undefined {
  if (!row) return undefined;
  const parts: string[] = [`Overall: ${OVERALL_COLORS[row.overall].label}`];
  if (row.lotId) parts.push(`From lot upload (#${row.lotId})`);
  if (row.note) parts.push(`Note: ${row.note}`);
  return parts.join(' · ');
}

export const regionOf = (tool: GridTool) => tool.region ?? 'Unassigned';

/** Row key encoding for the grid: "<toolId>" (overall view) or "<toolId>:<cellKey>" (cells view). */
export const rowKey = (toolId: number, cell?: McDailyCell) => (cell ? `${toolId}:${cell}` : String(toolId));
export function parseRowKey(key: string): { toolId: number; cell: McDailyCell | undefined } {
  const [t, c] = key.split(':');
  return { toolId: Number(t), cell: c && (MC_DAILY_CELLS as readonly string[]).includes(c) ? (c as McDailyCell) : undefined };
}

const pct = (v: number | null) => (v === null ? '' : `${Math.round(v * 100)}%`);

export function monthCsv(data: DailyMonthResponse, days: string[], view: DailyView): string {
  const idx = indexRows(data.rows);
  const dayHeaders = days.map((d) => String(Number(d.slice(8, 10))));
  if (view === 'overall') {
    const rows = data.tools.map((t) => {
      const m = idx.get(t.id);
      return [t.code, regionOf(t), ...days.map((d) => m?.get(d)?.overall ?? ''), pct(toolPassRate(m?.values()))];
    });
    return toCsv(['Tool', 'Region', ...dayHeaders, 'Pass %'], rows);
  }
  const rows = data.tools.flatMap((t) => {
    const m = idx.get(t.id);
    return MC_DAILY_CELLS.map((cell) => [t.code, regionOf(t), CELL_LABELS[cell], ...days.map((d) => m?.get(d)?.[cell] ?? ''), pct(toolPassRate(m?.values()))]);
  });
  return toCsv(['Tool', 'Region', 'Cell', ...dayHeaders, 'Pass %'], rows);
}

/** Daily pass-rate target (%) drawn on the pass chart. */
export const PASS_TARGET_PCT = 80;
