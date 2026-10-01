import type { McCellStatus, McDailyCell, McDailyOverall } from '../../shared/domain.js';
import { MC_DAILY_CELLS } from '../../shared/domain.js';

export type DailyCells = Record<McDailyCell, McCellStatus | null>;

/**
 * Overall verdict for a tool-day. Fixes the Excel template's "blank counts as Failed":
 * any F → failed; all eight P → passed; only IDLE/MB entries → idle/mb; anything incomplete → pending.
 */
export function computeOverall(cells: Partial<DailyCells>): McDailyOverall {
  const values = MC_DAILY_CELLS.map((k) => cells[k] ?? null);
  const filled = values.filter((v): v is McCellStatus => v !== null);
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

export const emptyCells = (): DailyCells => Object.fromEntries(MC_DAILY_CELLS.map((k) => [k, null])) as DailyCells;
