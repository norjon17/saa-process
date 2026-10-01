import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { refKeys } from '@/features/ref/api';
import { api } from '@/lib/api/client';
import type { Category, Model, Region, Tool, User } from '@/lib/api/types';
import { notify } from '@/lib/notify';

import { changeLogKeys } from './change-logs/api';

export const adminKeys = {
  aliases: (userId: number) => ['admin', 'aliases', userId] as const,
};

/** Every admin write is audited server-side → refresh an open change-log drawer. */
const invalidateChangeLogs = (qc: ReturnType<typeof useQueryClient>) => qc.invalidateQueries({ queryKey: changeLogKeys.all });

/**
 * Optimistic PATCH against one of the reference lists (users / tools / categories) — every admin
 * mutation ends by invalidating `refKeys.all` so selects everywhere pick the change up.
 */
function useListPatch<T extends { id: number }>(listKey: readonly unknown[], fn: (id: number, patch: Partial<T>) => Promise<T>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: number; patch: Partial<T> }) => fn(id, patch),
    onMutate: async ({ id, patch }) => {
      await qc.cancelQueries({ queryKey: listKey });
      const prev = qc.getQueryData<T[]>(listKey);
      qc.setQueryData<T[]>(listKey, (old) => old?.map((r) => (r.id === id ? { ...r, ...patch } : r)));
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(listKey, ctx.prev);
    },
    onSuccess: () => notify.autosaved(),
    onSettled: () => Promise.all([qc.invalidateQueries({ queryKey: refKeys.all }), invalidateChangeLogs(qc)]),
  });
}

function useRefCreate<TBody, TRow>(fn: (body: TBody) => Promise<TRow>, label: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: async () => {
      notify.success(`${label} added`);
      await Promise.all([qc.invalidateQueries({ queryKey: refKeys.all }), invalidateChangeLogs(qc)]);
    },
  });
}

/* ---- Users ---- */
export type UserBody = { idNo: string; name: string; role: User['role']; isActive: boolean };
export const useCreateUser = () => useRefCreate((body: UserBody) => api.post<User>('/api/users', body), 'User');
export const usePatchUser = () => useListPatch<User>(refKeys.users(true), (id, patch) => api.patch<User>(`/api/users/${id}`, patch));

export const useUserAliases = (userId: number | null) =>
  useQuery({
    queryKey: adminKeys.aliases(userId ?? 0),
    queryFn: () => api.get<{ items: string[] }>(`/api/users/${userId}/aliases`).then((r) => r.items),
    enabled: userId !== null,
  });

export function useSetUserAliases() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, aliases }: { userId: number; aliases: string[] }) => api.put<{ items: string[] }>(`/api/users/${userId}/aliases`, { aliases }),
    onSuccess: (r, { userId }) => {
      qc.setQueryData(adminKeys.aliases(userId), r.items);
      notify.success('Aliases saved');
      void qc.invalidateQueries({ queryKey: refKeys.all });
      void invalidateChangeLogs(qc);
    },
  });
}

/* ---- Regions & tools ---- */
export type RegionBody = { name: string; sortOrder: number; isActive: boolean };
export const useCreateRegion = () => useRefCreate((body: RegionBody) => api.post<Region>('/api/regions', body), 'Region');

export type ToolBody = { code: string; regionId: number | null; toolType: Tool['toolType']; eeUserId: number | null; isActive: boolean; notes: string | null };
export const useCreateTool = () => useRefCreate((body: ToolBody) => api.post<Tool>('/api/tools', body), 'Tool');
export const usePatchTool = () => useListPatch<Tool>(refKeys.tools(true), (id, patch) => api.patch<Tool>(`/api/tools/${id}`, patch));

/* ---- Model specs (keyed by code; PUT upserts the whole spec) ---- */
export type ModelBody = Omit<Model, 'code'>;
export function useUpsertModel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ code, body }: { code: string; body: ModelBody }) => api.put<Model>(`/api/models/${code}`, body),
    onMutate: async ({ code, body }) => {
      await qc.cancelQueries({ queryKey: refKeys.models });
      const prev = qc.getQueryData<Model[]>(refKeys.models);
      qc.setQueryData<Model[]>(refKeys.models, (old) => old?.map((m) => (m.code === code ? { ...m, ...body } : m)));
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(refKeys.models, ctx.prev);
    },
    onSuccess: () => notify.autosaved(),
    onSettled: () => Promise.all([qc.invalidateQueries({ queryKey: refKeys.all }), invalidateChangeLogs(qc)]),
  });
}
export const useCreateModel = () => useRefCreate(({ code, body }: { code: string; body: ModelBody }) => api.put<Model>(`/api/models/${code}`, body), 'Model');

/* ---- Endorsement categories ---- */
export type CategoryBody = Omit<Category, 'id'>;
export const useCreateCategory = () => useRefCreate((body: CategoryBody) => api.post<Category>('/api/endorsement-categories', body), 'Category');
export const usePatchCategory = () => useListPatch<Category>(refKeys.categories, (id, patch) => api.patch<Category>(`/api/endorsement-categories/${id}`, patch));
