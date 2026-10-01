import { z } from 'zod';

import type { SectionKey, Shift } from '@shared/domain';
import { ENDORSEMENT_PROGRESS, SECTION_KEYS, SHIFTS } from '@shared/domain';

import { addDays, currentShiftInfo, shiftDate } from '@/lib/time';

import type { ListParams, ListSort, SummaryParams } from './api';

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

/**
 * `/endorsement?date&shift&section` — all optional; the current shift and the first section are the fallbacks.
 * Each field falls back on its own so one bad value never drops the others. Every key is always present
 * (possibly `undefined`): the router spreads the root's raw search under ours, so an omitted key would let
 * an invalid raw value (`?shift=XX`) leak through.
 */
export const boardSearchSchema = z.object({
  date: isoDate.optional().catch(undefined),
  shift: z.enum(SHIFTS).optional().catch(undefined),
  section: z.enum(SECTION_KEYS).optional().catch(undefined),
});
export type BoardSearch = z.infer<typeof boardSearchSchema>;

export const parseBoardSearch = (raw: Record<string, unknown>): BoardSearch => {
  const r = boardSearchSchema.safeParse(raw);
  const d = r.success ? r.data : {};
  return { date: d.date, shift: d.shift, section: d.section };
};

export const BOARD_DEFAULT_SECTION: SectionKey = 's1';

export function resolveBoardSearch(s: BoardSearch): { date: string; shift: Shift; section: SectionKey } {
  const now = currentShiftInfo();
  return { date: s.date ?? now.date, shift: s.shift ?? now.shift, section: s.section ?? BOARD_DEFAULT_SECTION };
}

export const LIST_SORTS = ['date:desc', 'date:asc', 'id:desc', 'id:asc'] as const satisfies readonly ListSort[];

/** `/endorsement/history` — every param optional so plain links keep working; defaults are applied by `resolveHistorySearch`. */
export const historySearchSchema = z.object({
  from: isoDate.optional(),
  to: isoDate.optional(),
  shift: z.enum(SHIFTS).optional(),
  toolId: z.coerce.number().int().positive().optional(),
  categoryId: z.coerce.number().int().positive().optional(),
  sectionKey: z.enum(SECTION_KEYS).optional(),
  progress: z.enum(ENDORSEMENT_PROGRESS).optional(),
  userId: z.coerce.number().int().positive().optional(),
  q: z.string().max(200).optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(500).optional(),
  sort: z.enum(LIST_SORTS).optional(),
});
export type HistorySearch = z.infer<typeof historySearchSchema>;

export const parseHistorySearch = (raw: Record<string, unknown>): HistorySearch => {
  const r = historySearchSchema.safeParse(raw);
  return r.success ? r.data : {};
};

export const HISTORY_DEFAULT_DAYS = 30;
export const HISTORY_DEFAULT_PAGE_SIZE = 50;

export interface ResolvedHistorySearch extends HistorySearch {
  from: string;
  to: string;
  page: number;
  pageSize: number;
  sort: ListSort;
}

export function resolveHistorySearch(s: HistorySearch): ResolvedHistorySearch {
  const today = shiftDate();
  return {
    ...s,
    from: s.from ?? addDays(today, -HISTORY_DEFAULT_DAYS),
    to: s.to ?? today,
    page: s.page ?? 1,
    pageSize: s.pageSize ?? HISTORY_DEFAULT_PAGE_SIZE,
    sort: s.sort ?? 'date:desc',
  };
}

export const historyListParams = (s: ResolvedHistorySearch): ListParams => ({
  from: s.from,
  to: s.to,
  ...(s.shift !== undefined ? { shift: s.shift } : {}),
  ...(s.toolId !== undefined ? { toolId: s.toolId } : {}),
  ...(s.categoryId !== undefined ? { categoryId: s.categoryId } : {}),
  ...(s.sectionKey !== undefined ? { sectionKey: s.sectionKey } : {}),
  ...(s.progress !== undefined ? { progress: s.progress } : {}),
  ...(s.userId !== undefined ? { userId: s.userId } : {}),
  ...(s.q ? { q: s.q } : {}),
  page: s.page,
  pageSize: s.pageSize,
  sort: s.sort,
});

/** The summary endpoint only understands from/to/shift (API gap: no tool/category/person/q filters). */
export const historySummaryParams = (s: ResolvedHistorySearch): SummaryParams => ({
  from: s.from,
  to: s.to,
  ...(s.shift !== undefined ? { shift: s.shift } : {}),
});
