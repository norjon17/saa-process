import { z } from 'zod';

import { dateRange, isoDate, pagination, shift } from '../../lib/zod.js';
import { ENDORSEMENT_PROGRESS, SECTION_KEYS } from '../../shared/domain.js';

export const listQuery = pagination.merge(dateRange).extend({
  shift: shift.optional(),
  toolId: z.coerce.number().int().optional(),
  categoryId: z.coerce.number().int().optional(),
  sectionKey: z.enum(SECTION_KEYS).optional(),
  progress: z.enum(ENDORSEMENT_PROGRESS).optional(),
  userId: z.coerce.number().int().optional(),
  q: z.string().trim().max(200).optional(),
  sort: z.enum(['date:desc', 'date:asc', 'id:desc', 'id:asc']).default('date:desc'),
  includeNone: z.enum(['true', 'false']).default('true'),
});
export type ListQuery = z.infer<typeof listQuery>;

export const boardQuery = z.object({ date: isoDate, shift });

export const createBody = z.object({
  date: isoDate,
  shift,
  categoryId: z.number().int().nullable().optional(),
  sectionKey: z.enum(SECTION_KEYS).optional(),
  toolId: z.number().int().nullable().optional(),
  issue: z.string().max(4000).default(''),
  actionStatus: z.string().max(8000).default(''),
  progress: z.enum(ENDORSEMENT_PROGRESS).default('open'),
  isNone: z.boolean().default(false),
  endorseBy: z.array(z.number().int()).max(3).default([]),
  endorseTo: z.array(z.number().int()).max(6).default([]),
});
export type CreateBody = z.infer<typeof createBody>;

/**
 * PATCH body without defaults: zod 4 `.partial()` keeps `.default()`, which would silently reset every omitted
 * field (issue, status, progress, people) on a single-cell edit.
 */
export const patchBody = z
  .object({
    date: isoDate,
    shift,
    categoryId: z.number().int().nullable(),
    sectionKey: z.enum(SECTION_KEYS),
    toolId: z.number().int().nullable(),
    issue: z.string().max(4000),
    actionStatus: z.string().max(8000),
    progress: z.enum(ENDORSEMENT_PROGRESS),
    isNone: z.boolean(),
    endorseBy: z.array(z.number().int()).max(3),
    endorseTo: z.array(z.number().int()).max(6),
  })
  .partial();
export type PatchBody = z.infer<typeof patchBody>;

export const noneAllBody = z.object({ date: isoDate, shift });

export const summaryQuery = dateRange.extend({ shift: shift.optional() });
