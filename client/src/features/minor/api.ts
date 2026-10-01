import type { CrudFilters } from '@/components/ui/CrudTablePage';
import { api } from '@/lib/api/client';
import type { Paged } from '@/lib/api/types';

export type MinorTab = 'low-cpk' | 'circuit-burn' | 'fit-ocap' | 'weekly-ooc';

export const minorKeys = {
  all: ['minor'] as const,
  tab: (tab: MinorTab) => ['minor', tab] as const,
};

/** The four simple tabs share one server-side CRUD contract (see server/src/modules/minor/routes.ts). */
export function minorApi<T extends { id: number }>(tab: MinorTab) {
  const base = `/api/${tab}`;
  return {
    list: (page: number, pageSize: number, filters: CrudFilters) => api.get<Paged<T>>(base, { page, pageSize, ...filters }),
    create: (body: Record<string, unknown>) => api.post<T>(base, body),
    update: (id: number, patch: Record<string, unknown>) => api.patch<T>(`${base}/${id}`, patch),
    remove: (id: number) => api.del<{ ok: true }>(`${base}/${id}`),
  };
}
