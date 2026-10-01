import { useInfiniteQuery } from '@tanstack/react-query';

import { api } from '@/lib/api/client';
import type { AuditAction, AuditEntity, AuditLogPage } from '@/lib/api/types';

export interface ChangeLogFilters {
  entities: readonly AuditEntity[];
  q: string;
  action: AuditAction | null;
}

export const changeLogKeys = {
  /** Invalidate after every admin mutation so an open drawer refreshes. */
  all: ['admin', 'audit-logs'] as const,
  list: (filters: ChangeLogFilters) => ['admin', 'audit-logs', filters] as const,
};

const PAGE_SIZE = 50;

/** Keyset-paginated history, newest first; each page carries the cursor of the next one. */
export function useChangeLogs(filters: ChangeLogFilters) {
  return useInfiniteQuery({
    queryKey: changeLogKeys.list(filters),
    queryFn: ({ pageParam }) =>
      api.get<AuditLogPage>('/api/audit-logs', {
        entity: filters.entities.join(','),
        q: filters.q || undefined,
        action: filters.action ?? undefined,
        cursor: pageParam ?? undefined,
        limit: PAGE_SIZE,
      }),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
    staleTime: 30_000,
  });
}
