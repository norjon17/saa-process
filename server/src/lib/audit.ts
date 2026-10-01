import type { Db, Tx } from '../db/index.js';
import { schema } from '../db/index.js';
import type { AuditAction, AuditChanges, AuditEntity } from '../db/schema/audit.js';

export type { AuditAction, AuditChanges, AuditEntity };

/** Canonical JSON: object keys sorted so `{a,b}` and `{b,a}` compare equal; Dates become ISO strings. */
function canonical(value: unknown): string {
  return JSON.stringify(value ?? null, (_key, v: unknown) => {
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      return Object.fromEntries(Object.entries(v as Record<string, unknown>).toSorted(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));
    }
    return v;
  });
}

/** JSON-safe snapshot of a value for the `changes` column (Date → ISO string, undefined → null). */
function snapshot(value: unknown): unknown {
  if (value === undefined) return null;
  if (value instanceof Date) return value.toISOString();
  return value;
}

/**
 * Field-level diff with JSON semantics. A field whose `after` value is `undefined` counts as
 * "not provided" and is skipped; `null` is a real value. Only changed fields are returned.
 */
export function diffFields<T extends object>(before: Partial<T> | null | undefined, after: Partial<T>, fields: readonly (keyof T & string)[]): AuditChanges {
  const changes: AuditChanges = {};
  for (const field of fields) {
    const to = after[field];
    if (to === undefined) continue;
    const from = before ? before[field] : undefined;
    if (canonical(snapshot(from)) === canonical(snapshot(to))) continue;
    changes[field] = { from: snapshot(from), to: snapshot(to) };
  }
  return changes;
}

/** `create` log payload: every listed field with `from: null`. */
export function createdFields<T extends object>(row: T, fields: readonly (keyof T & string)[]): AuditChanges {
  return diffFields<T>(null, row, fields);
}

/** `activate` / `deactivate` when the only change is the `isActive` flag, otherwise `update`. */
export function updateAction(changes: AuditChanges): AuditAction {
  const keys = Object.keys(changes);
  if (keys.length === 1 && keys[0] === 'isActive') return changes['isActive']!.to === true ? 'activate' : 'deactivate';
  return 'update';
}

export interface AuditActor {
  id: number;
  name: string;
}

export interface AuditEntry {
  entity: AuditEntity;
  entityId: string | number;
  entityLabel?: string | null;
  action: AuditAction;
  changes: AuditChanges;
  actor: AuditActor | null | undefined;
}

/**
 * Append one audit row (inside the caller's transaction when `db` is a `tx`). Updates without any
 * changed field are skipped; `create` / `delete` are always recorded. Returns whether a row was written.
 */
export async function recordAudit(db: Db | Tx, entry: AuditEntry): Promise<boolean> {
  const always = entry.action === 'create' || entry.action === 'delete';
  if (!always && Object.keys(entry.changes).length === 0) return false;
  await db.insert(schema.auditLogs).values({
    entity: entry.entity,
    entityId: String(entry.entityId),
    entityLabel: entry.entityLabel ?? null,
    action: entry.action,
    changes: entry.changes,
    actorId: entry.actor?.id ?? null,
    actorName: entry.actor?.name ?? null,
  });
  return true;
}

/** Convenience for PATCH-style mutations: diff, pick the action, record. */
export async function recordUpdate<T extends object>(
  db: Db | Tx,
  opts: {
    entity: AuditEntity;
    entityId: string | number;
    entityLabel?: string | null;
    before: T;
    after: T;
    fields: readonly (keyof T & string)[];
    actor: AuditActor | null | undefined;
  },
): Promise<boolean> {
  const changes = diffFields(opts.before, opts.after, opts.fields);
  return recordAudit(db, {
    entity: opts.entity,
    entityId: opts.entityId,
    entityLabel: opts.entityLabel ?? null,
    action: updateAction(changes),
    changes,
    actor: opts.actor,
  });
}

export const userLabel = (u: { idNo: string; name: string }) => `${u.idNo} · ${u.name}`;
