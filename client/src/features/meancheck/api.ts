import { keepPreviousData, queryOptions, useMutation, useQueryClient } from '@tanstack/react-query';

import type { McVerdict } from '@shared/domain';

import { api } from '@/lib/api/client';
import type { EvaluateResponse, LotDetail, LotSummary, Paged, ToolStatusItem } from '@/lib/api/types';

/** `| undefined` on purpose: route search params (zod `.optional()`) and "clear this filter" patches both carry explicit undefined. */
export interface LotListParams {
  regionId?: number | undefined;
  verdict?: McVerdict | undefined;
  toolId?: number | undefined;
  model?: string | undefined;
  from?: string | undefined;
  to?: string | undefined;
  q?: string | undefined;
  page?: number | undefined;
  pageSize?: number | undefined;
}

export type LotListPatch = Partial<LotListParams>;

/** Default rows per page for the lot list (one of the pager's size options). */
export const LOT_PAGE_SIZE = 20;

export const meancheckKeys = {
  all: ['meancheck'] as const,
  lots: (params: LotListParams) => ['meancheck', 'lots', params] as const,
  lot: (id: number) => ['meancheck', 'lot', id] as const,
  toolStatus: ['meancheck', 'tool-status'] as const,
};

/** The daily grid is written by lot uploads too, so lot mutations invalidate it. */
export const DAILY_ROOT_KEY = ['meancheck-daily'] as const;

export const lotsQuery = (params: LotListParams) =>
  queryOptions({
    queryKey: meancheckKeys.lots(params),
    queryFn: () =>
      api.get<Paged<LotSummary>>('/api/meancheck/lots', {
        regionId: params.regionId,
        verdict: params.verdict,
        toolId: params.toolId,
        model: params.model,
        from: params.from,
        to: params.to,
        q: params.q,
        page: params.page ?? 1,
        pageSize: params.pageSize ?? LOT_PAGE_SIZE,
      }),
    placeholderData: keepPreviousData,
  });

export const lotQuery = (id: number) =>
  queryOptions({
    queryKey: meancheckKeys.lot(id),
    queryFn: () => api.get<LotDetail>(`/api/meancheck/lots/${id}`),
    staleTime: 5 * 60_000,
  });

export const toolStatusQuery = queryOptions({
  queryKey: meancheckKeys.toolStatus,
  queryFn: () => api.get<{ items: ToolStatusItem[] }>('/api/meancheck/tool-status').then((r) => r.items),
  refetchInterval: 60_000,
  placeholderData: keepPreviousData,
});

export function filesForm(files: File[]): FormData {
  const form = new FormData();
  files.forEach((f, i) => form.append(`file${i + 1}`, f, f.name));
  return form;
}

/** Dry run: parse + evaluate, nothing persisted. Errors are handled by the wizard, not the global toast. */
export function useEvaluate() {
  return useMutation({
    mutationFn: (files: File[]) => api.upload<EvaluateResponse>('/api/meancheck/evaluate', filesForm(files)),
    meta: { silent: true },
  });
}

export function useSaveLot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ files, replace }: { files: File[]; replace: boolean }) => api.upload<LotDetail>('/api/meancheck/lots', filesForm(files), { replace }),
    onSuccess: (lot) => {
      qc.setQueryData(meancheckKeys.lot(lot.id), lot);
      void qc.invalidateQueries({ queryKey: meancheckKeys.all });
      void qc.invalidateQueries({ queryKey: DAILY_ROOT_KEY });
    },
    meta: { silent: true },
  });
}

export function useDeleteLot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.del<{ ok: boolean }>(`/api/meancheck/lots/${id}`),
    onSuccess: (_r, id) => {
      qc.removeQueries({ queryKey: meancheckKeys.lot(id) });
      void qc.invalidateQueries({ queryKey: meancheckKeys.all });
      void qc.invalidateQueries({ queryKey: DAILY_ROOT_KEY });
    },
  });
}
