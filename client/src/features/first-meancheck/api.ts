import { keepPreviousData, queryOptions, useMutation, useQueryClient } from '@tanstack/react-query';

import type { McCellStatus, McDailyCell } from '@shared/domain';
import { MC_DAILY_CELLS } from '@shared/domain';

import { api } from '@/lib/api/client';
import type { DailyMonthResponse, DailyRow, DailySummary } from '@/lib/api/types';
import { notify } from '@/lib/notify';

import { computeOverall, type DailyCells } from './model';

export const dailyKeys = {
  all: ['meancheck-daily'] as const,
  month: (month: string, regionId: number | undefined) => ['meancheck-daily', 'month', { month, regionId: regionId ?? null }] as const,
  summaries: ['meancheck-daily', 'summary'] as const,
  summary: (from: string, to: string) => ['meancheck-daily', 'summary', { from, to }] as const,
};

export const dailyMonthQuery = (month: string, regionId: number | undefined) =>
  queryOptions({
    queryKey: dailyKeys.month(month, regionId),
    queryFn: () => api.get<DailyMonthResponse>('/api/meancheck/daily', { month, regionId }),
    placeholderData: keepPreviousData,
  });

export const dailySummaryQuery = (from: string, to: string) =>
  queryOptions({
    queryKey: dailyKeys.summary(from, to),
    queryFn: () => api.get<DailySummary>('/api/meancheck/daily/summary', { from, to }),
    placeholderData: keepPreviousData,
  });

export interface DailyPatch {
  cells?: DailyCells;
  note?: string | null;
  fillAll?: McCellStatus;
}
export interface UpsertVars {
  toolId: number;
  date: string;
  patch: DailyPatch;
}

const emptyRow = (toolId: number, date: string): DailyRow => ({
  id: -Date.now(),
  toolId,
  date,
  vsSatPsaL: null,
  vsSatPsaR: null,
  vsSatRsaL: null,
  vsSatRsaR: null,
  vsTgtPsaL: null,
  vsTgtPsaR: null,
  vsTgtRsaL: null,
  vsTgtRsaR: null,
  overall: 'pending',
  lotId: null,
  note: null,
  updatedBy: null,
  updatedAt: new Date().toISOString(),
});

function applyPatch(prev: DailyMonthResponse, { toolId, date, patch }: UpsertVars): DailyMonthResponse {
  const existing = prev.rows.find((r) => r.toolId === toolId && r.date === date);
  const base = existing ?? emptyRow(toolId, date);
  const cells = {} as Record<McDailyCell, McCellStatus | null>;
  for (const k of MC_DAILY_CELLS) {
    cells[k] = base[k];
    if (patch.fillAll) cells[k] = patch.fillAll;
    const v = patch.cells?.[k];
    if (v !== undefined) cells[k] = v;
  }
  const next: DailyRow = { ...base, ...cells, overall: computeOverall(cells), note: patch.note !== undefined ? patch.note : base.note };
  return { ...prev, rows: existing ? prev.rows.map((r) => (r === existing ? next : r)) : [...prev.rows, next] };
}

const replaceRow = (prev: DailyMonthResponse, row: DailyRow): DailyMonthResponse => {
  const others = prev.rows.filter((r) => !(r.toolId === row.toolId && r.date === row.date));
  return { ...prev, rows: [...others, row] };
};

/** PUT one tool-day with optimistic update of the month query and rollback on error. */
export function useUpsertDaily(month: string, regionId: number | undefined) {
  const qc = useQueryClient();
  const key = dailyKeys.month(month, regionId);
  return useMutation({
    mutationFn: ({ toolId, date, patch }: UpsertVars) =>
      api.put<DailyRow>(`/api/meancheck/daily/${toolId}/${date}`, {
        ...patch.cells,
        ...(patch.note !== undefined ? { note: patch.note } : {}),
        ...(patch.fillAll ? { fillAll: patch.fillAll } : {}),
      }),
    onMutate: async (vars) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<DailyMonthResponse>(key);
      if (prev) qc.setQueryData<DailyMonthResponse>(key, applyPatch(prev, vars));
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(key, ctx.prev);
    },
    onSuccess: (row) => {
      qc.setQueryData<DailyMonthResponse>(key, (cur) => (cur ? replaceRow(cur, row) : cur));
      notify.autosaved();
      void qc.invalidateQueries({ queryKey: dailyKeys.summaries });
    },
  });
}

/** DELETE a tool-day (used by "clear" in the overall view). */
export function useDeleteDaily(month: string, regionId: number | undefined) {
  const qc = useQueryClient();
  const key = dailyKeys.month(month, regionId);
  return useMutation({
    mutationFn: ({ toolId, date }: { toolId: number; date: string }) => api.del<{ ok: boolean }>(`/api/meancheck/daily/${toolId}/${date}`),
    onMutate: async ({ toolId, date }) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<DailyMonthResponse>(key);
      if (prev) qc.setQueryData<DailyMonthResponse>(key, { ...prev, rows: prev.rows.filter((r) => !(r.toolId === toolId && r.date === date)) });
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(key, ctx.prev);
    },
    onSuccess: () => {
      notify.autosaved();
      void qc.invalidateQueries({ queryKey: dailyKeys.summaries });
    },
  });
}
