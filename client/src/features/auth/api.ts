import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query';

import { api } from '@/lib/api/client';
import type { MeResponse } from '@/lib/api/types';
import { useSessionStore } from '@/stores/session.store';

export const authKeys = { me: ['auth', 'me'] as const };

export const meQuery = queryOptions({
  queryKey: authKeys.me,
  queryFn: async () => {
    const res = await api.get<MeResponse>('/api/auth/me');
    useSessionStore.getState().setUser(res.user);
    return res;
  },
  staleTime: 60_000,
});

export function useLogin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (idNo: string) => api.post<MeResponse>('/api/auth/login', { idNo }),
    onSuccess: (res) => {
      useSessionStore.getState().setUser(res.user);
      qc.setQueryData(authKeys.me, res);
    },
    meta: { silent: true },
  });
}

export function useLogout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<{ ok: boolean }>('/api/auth/logout'),
    onSettled: () => {
      useSessionStore.getState().clear();
      qc.clear();
    },
  });
}
