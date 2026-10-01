import { keepPreviousData, queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { ContactChipValue } from '@shared/domain';

import { api } from '@/lib/api/client';
import type { ContactChipMonthResponse, ContactChipRow } from '@/lib/api/types';
import { notify } from '@/lib/notify';

export const contactChipKeys = {
  all: ['contact-chip'] as const,
  month: (month: string, regionId: number | undefined) => ['contact-chip', 'month', month, regionId ?? null] as const,
};

export const contactChipMonthQuery = (month: string, regionId: number | undefined) =>
  queryOptions({
    queryKey: contactChipKeys.month(month, regionId),
    queryFn: () => api.get<ContactChipMonthResponse>('/api/contact-chip', { month, regionId }),
    placeholderData: keepPreviousData,
  });

export const useContactChipMonth = (month: string, regionId: number | undefined) => useQuery(contactChipMonthQuery(month, regionId));

interface SetCellVars {
  toolId: number;
  date: string;
  value: ContactChipValue | null;
}

/** Optimistic PUT /api/contact-chip/:toolId/:date — null deletes the cell. */
export function useSetContactChip(month: string, regionId: number | undefined) {
  const qc = useQueryClient();
  const key = contactChipKeys.month(month, regionId);
  return useMutation({
    mutationFn: ({ toolId, date, value }: SetCellVars) => api.put<ContactChipRow | { deleted: true }>(`/api/contact-chip/${toolId}/${date}`, { value }),
    onMutate: async ({ toolId, date, value }) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<ContactChipMonthResponse>(key);
      qc.setQueryData<ContactChipMonthResponse>(key, (old) => {
        if (!old) return old;
        const rest = old.rows.filter((r) => !(r.toolId === toolId && r.date === date));
        if (value === null) return { ...old, rows: rest };
        const existing = old.rows.find((r) => r.toolId === toolId && r.date === date);
        return { ...old, rows: [...rest, { id: existing?.id ?? -Date.now(), toolId, date, value, note: existing?.note ?? null }] };
      });
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(key, ctx.prev);
    },
    onSuccess: (row, { toolId, date }) => {
      if (row && 'id' in row) {
        qc.setQueryData<ContactChipMonthResponse>(key, (old) => (old ? { ...old, rows: old.rows.map((r) => (r.toolId === toolId && r.date === date ? row : r)) } : old));
      }
      notify.autosaved();
    },
  });
}
