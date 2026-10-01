import { keepPreviousData, queryOptions, useMutation, useQueryClient, type QueryClient, type QueryKey } from '@tanstack/react-query';

import type { EndorsementProgress, SectionKey, Shift } from '@shared/domain';
import { SECTION_KEYS } from '@shared/domain';

import { refKeys } from '@/features/ref/api';
import { api, type Query } from '@/lib/api/client';
import type { Attachment, BoardKpi, BoardResponse, Category, Endorsement, EndorsementInput, EndorsementSummary, LotSummary, Paged, Person, Tool, ToolStatusItem, User } from '@/lib/api/types';
import { notify } from '@/lib/notify';

import { useSaveStore } from './store';

/** Imperative access so mutation hooks never subscribe to (and re-render on) save-state changes. */
const saveBegin = () => useSaveStore.getState().begin();
const saveEnd = (ok: boolean) => useSaveStore.getState().end(ok);

// ---------------------------------------------------------------------------
// Params
// ---------------------------------------------------------------------------

export type ListSort = 'date:desc' | 'date:asc' | 'id:desc' | 'id:asc';

export interface ListParams {
  from?: string;
  to?: string;
  shift?: Shift;
  toolId?: number;
  categoryId?: number;
  sectionKey?: SectionKey;
  progress?: EndorsementProgress;
  userId?: number;
  q?: string;
  page?: number;
  pageSize?: number;
  sort?: ListSort;
  includeNone?: boolean;
}

export interface SummaryParams {
  from?: string;
  to?: string;
  shift?: Shift;
}

/** Drops empty values and turns `includeNone` into the string the server expects. */
export function listParamsToQuery(p: ListParams): Query {
  const { includeNone, ...rest } = p;
  return { ...rest, includeNone: includeNone === undefined ? undefined : includeNone ? 'true' : 'false' };
}

// ---------------------------------------------------------------------------
// Keys & queries
// ---------------------------------------------------------------------------

export const endorsementKeys = {
  all: ['endorsements'] as const,
  boards: () => ['endorsements', 'board'] as const,
  board: (date: string, shift: Shift) => ['endorsements', 'board', { date, shift }] as const,
  lists: () => ['endorsements', 'list'] as const,
  list: (params: ListParams) => ['endorsements', 'list', params] as const,
  summaries: () => ['endorsements', 'summary'] as const,
  summary: (params: SummaryParams) => ['endorsements', 'summary', params] as const,
  attachments: (date: string, shift: Shift) => ['endorsements', 'attachments', { date, shift }] as const,
  /** Meancheck data read by the tool drilldown; kept under our own prefix so it never collides with the meancheck module's cache. */
  toolStatus: () => ['endorsements', 'tool', 'status'] as const,
  toolLots: (toolId: number, page: number, pageSize: number) => ['endorsements', 'tool', 'lots', { toolId, page, pageSize }] as const,
};

export const boardQuery = (date: string, shift: Shift) =>
  queryOptions({
    queryKey: endorsementKeys.board(date, shift),
    queryFn: () => api.get<BoardResponse>('/api/endorsements/board', { date, shift }),
    staleTime: 10_000,
  });

export const listQuery = (params: ListParams) =>
  queryOptions({
    queryKey: endorsementKeys.list(params),
    queryFn: () => api.get<Paged<Endorsement>>('/api/endorsements', listParamsToQuery(params)),
    placeholderData: keepPreviousData,
  });

export const summaryQuery = (params: SummaryParams) =>
  queryOptions({
    queryKey: endorsementKeys.summary(params),
    queryFn: () => api.get<EndorsementSummary>('/api/endorsements/summary', { ...params }),
    placeholderData: keepPreviousData,
  });

export const attachmentsQuery = (date: string, shift: Shift) =>
  queryOptions({
    queryKey: endorsementKeys.attachments(date, shift),
    queryFn: () => api.get<{ items: Attachment[] }>('/api/endorsements/attachments', { date, shift }).then((r) => r.items),
  });

export const toolStatusQuery = queryOptions({
  queryKey: endorsementKeys.toolStatus(),
  queryFn: () => api.get<{ items: ToolStatusItem[] }>('/api/meancheck/tool-status').then((r) => r.items),
  staleTime: 60_000,
});

export const toolLotsQuery = (toolId: number, page = 1, pageSize = 50) =>
  queryOptions({
    queryKey: endorsementKeys.toolLots(toolId, page, pageSize),
    queryFn: () => api.get<Paged<LotSummary>>('/api/meancheck/lots', { toolId, page, pageSize }),
    placeholderData: keepPreviousData,
  });

// ---------------------------------------------------------------------------
// Optimistic cache helpers
// ---------------------------------------------------------------------------

export interface RefLookup {
  users: User[];
  tools: Tool[];
  categories: Category[];
}

const refsFrom = (qc: QueryClient): RefLookup => ({
  users: qc.getQueryData<User[]>(refKeys.users()) ?? [],
  tools: qc.getQueryData<Tool[]>(refKeys.tools()) ?? [],
  categories: qc.getQueryData<Category[]>(refKeys.categories) ?? [],
});

const toPeople = (ids: number[], users: User[]): Person[] =>
  ids.flatMap((id) => {
    const u = users.find((x) => x.id === id);
    return u ? [{ id: u.id, idNo: u.idNo, name: u.name }] : [];
  });

/** Applies a PATCH body to a cached row the way the server would (used for optimistic updates). */
export function applyPatch(row: Endorsement, patch: Partial<EndorsementInput>, refs: RefLookup): Endorsement {
  const next: Endorsement = { ...row };
  if (patch.date !== undefined) next.date = patch.date;
  if (patch.shift !== undefined) next.shift = patch.shift;
  if (patch.issue !== undefined) next.issue = patch.issue;
  if (patch.actionStatus !== undefined) next.actionStatus = patch.actionStatus;
  if (patch.progress !== undefined) next.progress = patch.progress;
  if (patch.isNone !== undefined) next.isNone = patch.isNone;
  if (patch.toolId !== undefined) {
    const t = patch.toolId === null ? undefined : refs.tools.find((x) => x.id === patch.toolId);
    next.tool = t ? { id: t.id, code: t.code } : null;
  }
  if (patch.categoryId !== undefined) {
    const c = patch.categoryId === null ? undefined : refs.categories.find((x) => x.id === patch.categoryId);
    next.category = c ? { id: c.id, name: c.name, sectionKey: c.sectionKey } : null;
    if (c) next.sectionKey = c.sectionKey;
  }
  if (patch.sectionKey !== undefined) next.sectionKey = patch.sectionKey;
  if (patch.endorseBy !== undefined) next.endorseBy = toPeople(patch.endorseBy, refs.users);
  if (patch.endorseTo !== undefined) next.endorseTo = toPeople(patch.endorseTo, refs.users);
  next.updatedAt = new Date().toISOString();
  return next;
}

/** Same bucketing as the server's board KPI. */
export function computeKpi(items: Endorsement[]): Record<SectionKey, BoardKpi> {
  const kpi = Object.fromEntries(SECTION_KEYS.map((k) => [k, { total: 0, done: 0, ongoing: 0, open: 0 }])) as Record<SectionKey, BoardKpi>;
  for (const it of items) {
    const k = (SECTION_KEYS as readonly string[]).includes(it.sectionKey) ? (it.sectionKey as SectionKey) : 's6';
    const b = kpi[k];
    b.total += 1;
    if (it.isNone) continue;
    if (it.progress === 'done') b.done += 1;
    else if (it.progress === 'ongoing') b.ongoing += 1;
    else b.open += 1;
  }
  return kpi;
}

type ItemsData = BoardResponse | Paged<Endorsement>;
const isBoard = (d: ItemsData): d is BoardResponse => 'kpi' in d;
const itemQueries = { queryKey: endorsementKeys.all, predicate: (q: { queryKey: QueryKey }) => q.queryKey[1] === 'board' || q.queryKey[1] === 'list' };

type Snapshot = [QueryKey, ItemsData | undefined][];
const snapshot = (qc: QueryClient): Snapshot => qc.getQueriesData<ItemsData>(itemQueries);
const restore = (qc: QueryClient, snap: Snapshot | undefined) => {
  for (const [key, data] of snap ?? []) qc.setQueryData(key, data);
};

/** Rewrites the `items` of every cached board and history page (KPI recomputed for boards). */
function updateItems(qc: QueryClient, fn: (items: Endorsement[]) => Endorsement[]) {
  qc.setQueriesData<ItemsData>(itemQueries, (old) => {
    if (!old) return old;
    const items = fn(old.items);
    return isBoard(old) ? { ...old, items, kpi: computeKpi(items) } : { ...old, items };
  });
}

function upsertInBoard(qc: QueryClient, row: Endorsement) {
  qc.setQueryData<BoardResponse>(endorsementKeys.board(row.date, row.shift), (old) => {
    if (!old) return old;
    const items = old.items.some((r) => r.id === row.id) ? old.items.map((r) => (r.id === row.id ? row : r)) : [...old.items, row];
    return { ...old, items, kpi: computeKpi(items) };
  });
}

const invalidateRows = (qc: QueryClient) =>
  Promise.all([
    qc.invalidateQueries({ queryKey: endorsementKeys.boards() }),
    qc.invalidateQueries({ queryKey: endorsementKeys.lists() }),
    qc.invalidateQueries({ queryKey: endorsementKeys.summaries() }),
  ]);

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export function useCreateEndorsement() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ['endorsements', 'create'],
    mutationFn: (body: EndorsementInput) => api.post<Endorsement>('/api/endorsements', body),
    onMutate: () => saveBegin(),
    onError: () => saveEnd(false),
    onSuccess: (row) => {
      upsertInBoard(qc, row);
      saveEnd(true);
      notify.autosaved();
    },
    onSettled: () => invalidateRows(qc),
  });
}

export function usePatchEndorsement() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ['endorsements', 'patch'],
    mutationFn: ({ id, patch }: { id: number; patch: Partial<EndorsementInput> }) => api.patch<Endorsement>(`/api/endorsements/${id}`, patch),
    onMutate: async ({ id, patch }) => {
      await qc.cancelQueries(itemQueries);
      const snap = snapshot(qc);
      const refs = refsFrom(qc);
      updateItems(qc, (items) => items.map((r) => (r.id === id ? applyPatch(r, patch, refs) : r)));
      saveBegin();
      return { snap };
    },
    onError: (_e, _v, ctx) => {
      restore(qc, ctx?.snap);
      saveEnd(false);
    },
    onSuccess: (row) => {
      updateItems(qc, (items) => items.map((r) => (r.id === row.id ? row : r)));
      saveEnd(true);
      notify.autosaved();
    },
    onSettled: () => invalidateRows(qc),
  });
}

export function useDeleteEndorsements() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ['endorsements', 'delete'],
    mutationFn: (ids: number[]) => api.post<{ deleted: number }>('/api/endorsements/delete', { ids }),
    onMutate: async (ids) => {
      await qc.cancelQueries(itemQueries);
      const snap = snapshot(qc);
      const gone = new Set(ids);
      updateItems(qc, (items) => items.filter((r) => !gone.has(r.id)));
      saveBegin();
      return { snap };
    },
    onError: (_e, _v, ctx) => {
      restore(qc, ctx?.snap);
      saveEnd(false);
    },
    onSuccess: () => {
      saveEnd(true);
      notify.autosaved();
    },
    onSettled: () => invalidateRows(qc),
  });
}

export function useNoneAll() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ['endorsements', 'none-all'],
    mutationFn: (body: { date: string; shift: Shift }) => api.post<BoardResponse>('/api/endorsements/none-all', body),
    onMutate: () => saveBegin(),
    onError: () => saveEnd(false),
    onSuccess: (board) => {
      qc.setQueryData(endorsementKeys.board(board.date, board.shift), board);
      saveEnd(true);
      notify.autosaved();
    },
    onSettled: () => invalidateRows(qc),
  });
}

export interface UploadAttachmentsVars {
  date: string;
  shift: Shift;
  sectionKey: SectionKey;
  files: File[];
}

export function useUploadAttachments() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ['endorsements', 'attachments', 'upload'],
    mutationFn: ({ date, shift, sectionKey, files }: UploadAttachmentsVars) => {
      const form = new FormData();
      form.set('date', date);
      form.set('shift', shift);
      form.set('sectionKey', sectionKey);
      for (const f of files) form.append('files', f, f.name);
      return api.upload<{ items: Attachment[] }>('/api/endorsements/attachments', form).then((r) => r.items);
    },
    onMutate: () => saveBegin(),
    onError: () => saveEnd(false),
    onSuccess: (items, vars) => {
      qc.setQueryData<Attachment[]>(endorsementKeys.attachments(vars.date, vars.shift), (old) => [...(old ?? []), ...items]);
      saveEnd(true);
      notify.autosaved();
    },
    onSettled: (_d, _e, vars) => qc.invalidateQueries({ queryKey: endorsementKeys.attachments(vars.date, vars.shift) }),
  });
}

export function useDeleteAttachment() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ['endorsements', 'attachments', 'delete'],
    mutationFn: ({ id }: { id: number; date: string; shift: Shift }) => api.del<{ ok: boolean }>(`/api/endorsements/attachments/${id}`),
    onMutate: async ({ id, date, shift }) => {
      const key = endorsementKeys.attachments(date, shift);
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<Attachment[]>(key);
      qc.setQueryData<Attachment[]>(key, (old) => (old ?? []).filter((a) => a.id !== id));
      saveBegin();
      return { prev, key };
    },
    onError: (_e, _v, ctx) => {
      if (ctx) qc.setQueryData(ctx.key, ctx.prev);
      saveEnd(false);
    },
    onSuccess: () => {
      saveEnd(true);
      notify.autosaved();
    },
    onSettled: (_d, _e, vars) => qc.invalidateQueries({ queryKey: endorsementKeys.attachments(vars.date, vars.shift) }),
  });
}
