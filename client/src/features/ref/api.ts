import { queryOptions, useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api/client';
import type { Category, Model, Region, Tool, User } from '@/lib/api/types';

/** Reference data used by selects everywhere; invalidated by admin mutations. */
export const refKeys = {
  all: ['ref'] as const,
  users: (includeInactive = false) => ['ref', 'users', { includeInactive }] as const,
  tools: (includeInactive = false) => ['ref', 'tools', { includeInactive }] as const,
  regions: ['ref', 'regions'] as const,
  categories: ['ref', 'categories'] as const,
  models: ['ref', 'models'] as const,
};

export const usersQuery = (includeInactive = false) =>
  queryOptions({
    queryKey: refKeys.users(includeInactive),
    queryFn: () => api.get<{ items: User[] }>('/api/users', { includeInactive }).then((r) => r.items),
    staleTime: Infinity,
  });

export const toolsQuery = (includeInactive = false) =>
  queryOptions({
    queryKey: refKeys.tools(includeInactive),
    queryFn: () => api.get<{ items: Tool[] }>('/api/tools', { includeInactive }).then((r) => r.items),
    staleTime: Infinity,
  });

export const regionsQuery = queryOptions({
  queryKey: refKeys.regions,
  queryFn: () => api.get<{ items: Region[] }>('/api/regions').then((r) => r.items),
  staleTime: Infinity,
});

export const categoriesQuery = queryOptions({
  queryKey: refKeys.categories,
  queryFn: () => api.get<{ items: Category[] }>('/api/endorsement-categories').then((r) => r.items),
  staleTime: Infinity,
});

export const modelsQuery = queryOptions({
  queryKey: refKeys.models,
  queryFn: () => api.get<{ items: Model[] }>('/api/models').then((r) => r.items),
  staleTime: Infinity,
});

export const useUsers = (includeInactive = false) => useQuery(usersQuery(includeInactive));
export const useTools = (includeInactive = false) => useQuery(toolsQuery(includeInactive));
export const useRegions = () => useQuery(regionsQuery);
export const useCategories = () => useQuery(categoriesQuery);
export const useModels = () => useQuery(modelsQuery);

export const toSelectData = <T extends { id: number }>(items: T[] | undefined, label: (t: T) => string) =>
  (items ?? []).map((t) => ({ value: String(t.id), label: label(t) }));
