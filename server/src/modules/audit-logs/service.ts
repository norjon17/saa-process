import { and, desc, eq, ilike, or, sql, type SQL } from 'drizzle-orm';

import { schema, type Db } from '../../db/index.js';
import { AUDIT_ENTITIES, type AuditEntity } from '../../db/schema/audit.js';
import { badRequest } from '../../lib/errors.js';
import { decodeCursor, encodeCursor, type Cursor, type ListQuery } from './schemas.js';

const t = schema.auditLogs;

/** created_at as exact microseconds since the epoch (numeric → bigint, no float rounding). */
const tsMicros = sql<number>`(extract(epoch from ${t.createdAt}) * 1000000)::bigint`.mapWith(Number);

const escapeLike = (s: string) => s.replace(/[\\%_]/g, (c) => `\\${c}`);

function filters(q: ListQuery, cursor: Cursor | null): SQL[] {
  const where: SQL[] = [];
  if (q.entityId) where.push(eq(t.entityId, q.entityId));
  if (q.action) where.push(eq(t.action, q.action));
  if (q.actorId) where.push(eq(t.actorId, q.actorId));
  if (q.q) {
    const pattern = `%${escapeLike(q.q)}%`;
    where.push(or(ilike(t.entityLabel, pattern), ilike(t.actorName, pattern), sql`${t.changes}::text ilike ${pattern}`)!);
  }
  if (cursor) {
    // Row comparison matches the (entity, created_at desc, id desc) index order → index range scan.
    where.push(sql`(${t.createdAt}, ${t.id}) < (timestamptz 'epoch' + ${cursor.t}::float8 * interval '1 microsecond', ${cursor.id}::bigint)`);
  }
  return where;
}

/**
 * Keyset-paginated audit history, newest first. With several entities each one is fetched with its own
 * index-ordered `LIMIT n+1` query and the results are merged, so no query ever sorts the whole table.
 */
export async function listAuditLogs(db: Db, q: ListQuery) {
  const cursor = q.cursor ? decodeCursor(q.cursor) : null;
  if (q.cursor && !cursor) throw badRequest('invalid cursor');

  const entities: readonly AuditEntity[] = q.entity ?? AUDIT_ENTITIES;
  const common = filters(q, cursor);
  const take = q.limit + 1;

  const pages = await Promise.all(
    entities.map((entity) =>
      db
        .select({
          id: t.id,
          entity: t.entity,
          entityId: t.entityId,
          entityLabel: t.entityLabel,
          action: t.action,
          changes: t.changes,
          actorId: t.actorId,
          actorName: t.actorName,
          createdAt: t.createdAt,
          ts: tsMicros,
        })
        .from(t)
        .where(and(eq(t.entity, entity), ...common))
        .orderBy(desc(t.createdAt), desc(t.id))
        .limit(take),
    ),
  );

  const merged = pages.length === 1 ? pages[0]! : pages.flat().sort((a, b) => b.ts - a.ts || b.id - a.id);
  const pageRows = merged.slice(0, q.limit);
  const last = pageRows.at(-1);
  const nextCursor = merged.length > q.limit && last ? encodeCursor({ t: last.ts, id: last.id }) : null;
  return { items: pageRows.map(({ ts: _ts, ...row }) => row), nextCursor };
}
