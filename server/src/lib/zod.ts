import { z } from 'zod';

import { ID_NO_RE, SHIFTS, TOOL_CODE_RE } from '../shared/domain.js';

export const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'expected YYYY-MM-DD');
export const yearMonth = z.string().regex(/^\d{4}-\d{2}$/, 'expected YYYY-MM');
export const idNo = z.string().regex(ID_NO_RE, 'ID number must be 4 digits');
export const toolCode = z.string().regex(TOOL_CODE_RE, 'expected SAAnnH');
export const shift = z.enum(SHIFTS);
export const idParam = z.object({ id: z.coerce.number().int().positive() });
export const intId = z.coerce.number().int().positive();

export const pagination = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(500).default(50),
});

export const dateRange = z.object({
  from: isoDate.optional(),
  to: isoDate.optional(),
});

/** Query-string booleans arrive as strings. */
export const qbool = z
  .union([z.boolean(), z.enum(['true', 'false', '1', '0'])])
  .transform((v) => v === true || v === 'true' || v === '1');

export const nullableNumber = z.number().nullable().optional();
export const nullableString = z.string().nullable().optional();
