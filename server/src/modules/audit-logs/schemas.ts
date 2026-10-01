import { z } from 'zod';

import { AUDIT_ACTIONS, AUDIT_ENTITIES, type AuditEntity } from '../../db/schema/audit.js';

const entityList = z
  .string()
  .trim()
  .min(1)
  .transform((s, ctx) => {
    const parts = [...new Set(s.split(',').map((p) => p.trim()).filter(Boolean))];
    const bad = parts.filter((p) => !(AUDIT_ENTITIES as readonly string[]).includes(p));
    if (bad.length || parts.length === 0) {
      ctx.addIssue({ code: 'custom', message: `unknown entity: ${bad.join(', ') || s}; expected ${AUDIT_ENTITIES.join(' | ')}` });
      return z.NEVER;
    }
    return parts as AuditEntity[];
  });

export const listQuery = z.object({
  /** Single entity or comma list (`user,user_alias`); omitted = every entity. */
  entity: entityList.optional(),
  entityId: z.string().trim().min(1).max(64).optional(),
  action: z.enum(AUDIT_ACTIONS).optional(),
  actorId: z.coerce.number().int().positive().optional(),
  q: z.string().trim().max(200).optional(),
  /** Opaque keyset cursor from the previous page's `nextCursor`. */
  cursor: z.string().trim().max(200).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});
export type ListQuery = z.infer<typeof listQuery>;

/** Position in the `(created_at desc, id desc)` order; `t` = created_at in microseconds since the epoch (exact). */
export interface Cursor {
  t: number;
  id: number;
}

export function encodeCursor(c: Cursor): string {
  return Buffer.from(JSON.stringify(c), 'utf8').toString('base64url');
}

export function decodeCursor(raw: string): Cursor | null {
  try {
    const v = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8')) as unknown;
    if (!v || typeof v !== 'object') return null;
    const { t, id } = v as Record<string, unknown>;
    if (!Number.isSafeInteger(t) || !Number.isSafeInteger(id)) return null;
    return { t: t as number, id: id as number };
  } catch {
    return null;
  }
}
