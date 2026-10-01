import { keepPreviousData, queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '@/lib/api/client';
import type { PmMonthResponse, PmRow } from '@/lib/api/types';
import { notify } from '@/lib/notify';

export type PmItem = PmMonthResponse['items'][number];

/** Any subset of the editable PM fields (the server's PUT body). */
export type PmPatch = Partial<Omit<PmRow, 'id' | 'toolId' | 'period' | 'updatedAt' | 'ee' | 'derived'>>;

export const pmKeys = {
  all: ['pm-status'] as const,
  periods: ['pm-status', 'periods'] as const,
  month: (month: string) => ['pm-status', 'month', month] as const,
};

export const pmMonthQuery = (month: string) =>
  queryOptions({
    queryKey: pmKeys.month(month),
    queryFn: () => api.get<PmMonthResponse>('/api/pm-status', { month }),
    placeholderData: keepPreviousData,
  });

export const usePmMonth = (month: string) => useQuery(pmMonthQuery(month));

export const usePmPeriods = () =>
  useQuery({
    queryKey: pmKeys.periods,
    queryFn: () => api.get<{ items: { month: string; rows: number }[] }>('/api/pm-status/periods').then((r) => r.items),
  });

/** A blank row used for the optimistic update when a tool has no PM row yet. */
export function emptyPmRow(item: PmItem, month: string): PmRow {
  return {
    id: 0,
    toolId: item.tool.id,
    period: `${month}-01`,
    area: item.tool.region,
    toolType: item.tool.toolType,
    eeUserId: item.tool.ee?.id ?? null,
    eeRaw: null,
    actualDate: null,
    fixVacLWith: null,
    fixVacLWithout: null,
    fixVacRWith: null,
    fixVacRWithout: null,
    pickVacLWith: null,
    pickVacLWithout: null,
    pickVacRWith: null,
    pickVacRWithout: null,
    clampLClamp: null,
    clampLUnclamp: null,
    clampRClamp: null,
    clampRUnclamp: null,
    fixtureSpring: null,
    speedMotor: null,
    zOffLPickup: null,
    zOffLRelease: null,
    zOffRPickup: null,
    zOffRRelease: null,
    optGrr: null,
    optCorrelation: null,
    optLaserRecipe: null,
    optAdditionalArea: null,
    optScanPatternDir: null,
    fixtureLeft: null,
    fixtureRight: null,
    scanPattern: null,
    remarks: null,
    extra: null,
    updatedAt: new Date().toISOString(),
    derived: {},
  };
}

const replaceRow = (data: PmMonthResponse | undefined, toolId: number, fn: (item: PmItem) => PmItem) => (data ? { ...data, items: data.items.map((it) => (it.tool.id === toolId ? fn(it) : it)) } : data);

/** Optimistic PUT /api/pm-status/:toolId/:month. Creates the row when the tool has none yet. */
export function useUpdatePmRow(month: string) {
  const qc = useQueryClient();
  const key = pmKeys.month(month);
  return useMutation({
    mutationFn: ({ toolId, patch }: { toolId: number; patch: PmPatch }) => api.put<PmRow>(`/api/pm-status/${toolId}/${month}`, patch),
    onMutate: async ({ toolId, patch }) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<PmMonthResponse>(key);
      qc.setQueryData<PmMonthResponse>(key, (old) => replaceRow(old, toolId, (it) => ({ ...it, row: { ...(it.row ?? emptyPmRow(it, month)), ...patch } })));
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(key, ctx.prev);
    },
    onSuccess: (row, { toolId }) => {
      qc.setQueryData<PmMonthResponse>(key, (old) => replaceRow(old, toolId, (it) => ({ ...it, row })));
      void qc.invalidateQueries({ queryKey: pmKeys.periods });
      notify.autosaved();
    },
  });
}

export function useDeletePmRow(month: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (toolId: number) => api.del<{ ok: true }>(`/api/pm-status/${toolId}/${month}`),
    onSuccess: (_r, toolId) => {
      qc.setQueryData<PmMonthResponse>(pmKeys.month(month), (old) => replaceRow(old, toolId, (it) => ({ ...it, row: null })));
      void qc.invalidateQueries({ queryKey: pmKeys.periods });
      notify.success('PM row cleared');
    },
  });
}

export function useCopyPmMonth() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { from: string; to: string }) => api.post<{ copied: number }>('/api/pm-status/copy', vars),
    onSuccess: (r, { to }) => {
      notify.success(r.copied ? `Copied setup for ${r.copied} tool${r.copied === 1 ? '' : 's'}` : 'Nothing to copy — every tool already has a row');
      void qc.invalidateQueries({ queryKey: pmKeys.month(to) });
      void qc.invalidateQueries({ queryKey: pmKeys.periods });
    },
  });
}
