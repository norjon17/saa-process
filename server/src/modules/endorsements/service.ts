import { and, asc, count, desc, eq, gte, ilike, inArray, lte, or, sql, type SQL } from 'drizzle-orm';

import { schema, type Db } from '../../db/index.js';
import { badRequest, notFound } from '../../lib/errors.js';
import { SECTION_KEYS, type SectionKey } from '../../shared/domain.js';
import type { CreateBody, ListQuery, PatchBody } from './schemas.js';

const { endorsements, endorsementPeople, endorsementCategories, tools, users } = schema;

export interface PersonDto {
  id: number;
  idNo: string;
  name: string;
}

export interface EndorsementDto {
  id: number;
  seqNo: number | null;
  date: string;
  shift: 'DS' | 'NS';
  category: { id: number; name: string; sectionKey: string } | null;
  sectionKey: string;
  tool: { id: number; code: string } | null;
  issue: string;
  actionStatus: string;
  progress: 'open' | 'ongoing' | 'done';
  isNone: boolean;
  endorseBy: PersonDto[];
  endorseTo: PersonDto[];
  endorseByRaw: string | null;
  endorseToRaw: string | null;
  createdAt: Date;
  updatedAt: Date;
}

type Row = Awaited<ReturnType<typeof fetchRows>>[number];

async function fetchRows(db: Db, where: SQL | undefined, orderBy: SQL[], limit?: number, offset?: number) {
  return db.query.endorsements.findMany({
    where,
    with: {
      tool: { columns: { id: true, code: true } },
      category: { columns: { id: true, name: true, sectionKey: true } },
      people: { with: { user: { columns: { id: true, idNo: true, name: true } } } },
    },
    orderBy,
    ...(limit !== undefined ? { limit } : {}),
    ...(offset !== undefined ? { offset } : {}),
  });
}

export function toDto(r: Row): EndorsementDto {
  const by = r.people.filter((p) => p.kind === 'by').map((p) => p.user);
  const to = r.people.filter((p) => p.kind === 'to').map((p) => p.user);
  return {
    id: r.id,
    seqNo: r.seqNo,
    date: r.date,
    shift: r.shift,
    category: r.category,
    sectionKey: r.category?.sectionKey ?? r.sectionKey ?? 's6',
    tool: r.tool,
    issue: r.issue,
    actionStatus: r.actionStatus,
    progress: r.progress,
    isNone: r.isNone,
    endorseBy: by,
    endorseTo: to,
    endorseByRaw: r.endorseByRaw,
    endorseToRaw: r.endorseToRaw,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

function buildWhere(q: Partial<ListQuery>): SQL | undefined {
  const conds: (SQL | undefined)[] = [];
  if (q.from) conds.push(gte(endorsements.date, q.from));
  if (q.to) conds.push(lte(endorsements.date, q.to));
  if (q.shift) conds.push(eq(endorsements.shift, q.shift));
  if (q.toolId) conds.push(eq(endorsements.toolId, q.toolId));
  if (q.categoryId) conds.push(eq(endorsements.categoryId, q.categoryId));
  if (q.progress) conds.push(eq(endorsements.progress, q.progress));
  if (q.includeNone === 'false') conds.push(eq(endorsements.isNone, false));
  if (q.sectionKey) {
    conds.push(
      or(
        eq(endorsements.sectionKey, q.sectionKey),
        inArray(
          endorsements.categoryId,
          db_select_category_ids(q.sectionKey),
        ),
      ),
    );
  }
  if (q.userId) {
    conds.push(
      inArray(endorsements.id, sql`(select ${endorsementPeople.endorsementId} from ${endorsementPeople} where ${endorsementPeople.userId} = ${q.userId})`),
    );
  }
  if (q.q) {
    const like = `%${q.q}%`;
    conds.push(or(ilike(endorsements.issue, like), ilike(endorsements.actionStatus, like)));
  }
  return conds.length ? and(...conds) : undefined;
}

// Subquery expressed as raw SQL so buildWhere stays synchronous.
function db_select_category_ids(sectionKey: SectionKey): SQL {
  return sql`(select ${endorsementCategories.id} from ${endorsementCategories} where ${endorsementCategories.sectionKey} = ${sectionKey})`;
}

const orderFor = (sort: ListQuery['sort']): SQL[] => {
  switch (sort) {
    case 'date:asc':
      return [asc(endorsements.date), asc(endorsements.id)];
    case 'id:asc':
      return [asc(endorsements.id)];
    case 'id:desc':
      return [desc(endorsements.id)];
    default:
      return [desc(endorsements.date), desc(endorsements.id)];
  }
};

export async function list(db: Db, q: ListQuery) {
  const where = buildWhere(q);
  const [rows, totalRow] = await Promise.all([
    fetchRows(db, where, orderFor(q.sort), q.pageSize, (q.page - 1) * q.pageSize),
    db.select({ n: count() }).from(endorsements).where(where),
  ]);
  return { items: rows.map(toDto), total: totalRow[0]?.n ?? 0, page: q.page, pageSize: q.pageSize };
}

export async function listAll(db: Db, q: Partial<ListQuery>) {
  const rows = await fetchRows(db, buildWhere(q), orderFor(q.sort ?? 'date:desc'));
  return rows.map(toDto);
}

export async function getOne(db: Db, id: number): Promise<EndorsementDto> {
  const rows = await fetchRows(db, eq(endorsements.id, id), [asc(endorsements.id)], 1);
  const row = rows[0];
  if (!row) throw notFound('endorsement');
  return toDto(row);
}

export interface BoardKpi {
  total: number;
  done: number;
  ongoing: number;
  open: number;
}

export async function board(db: Db, date: string, shift: 'DS' | 'NS') {
  const rows = await fetchRows(db, and(eq(endorsements.date, date), eq(endorsements.shift, shift)), [asc(endorsements.id)]);
  const items = rows.map(toDto);
  const kpi = Object.fromEntries(SECTION_KEYS.map((k) => [k, { total: 0, done: 0, ongoing: 0, open: 0 }])) as Record<SectionKey, BoardKpi>;
  for (const it of items) {
    const k = (SECTION_KEYS as readonly string[]).includes(it.sectionKey) ? (it.sectionKey as SectionKey) : 's6';
    const bucket = kpi[k];
    bucket.total += 1;
    if (it.isNone) continue;
    if (it.progress === 'done') bucket.done += 1;
    else if (it.progress === 'ongoing') bucket.ongoing += 1;
    else bucket.open += 1;
  }
  return { date, shift, items, kpi };
}

async function sectionKeyForCategory(db: Db, categoryId: number | null | undefined): Promise<SectionKey | null> {
  if (!categoryId) return null;
  const c = await db.select({ sectionKey: endorsementCategories.sectionKey }).from(endorsementCategories).where(eq(endorsementCategories.id, categoryId)).limit(1);
  const k = c[0]?.sectionKey;
  return k && (SECTION_KEYS as readonly string[]).includes(k) ? (k as SectionKey) : null;
}

async function replacePeople(tx: Db, endorsementId: number, by: number[] | undefined, to: number[] | undefined) {
  if (by === undefined && to === undefined) return;
  const kinds: ('by' | 'to')[] = [];
  if (by !== undefined) kinds.push('by');
  if (to !== undefined) kinds.push('to');
  await tx.delete(endorsementPeople).where(and(eq(endorsementPeople.endorsementId, endorsementId), inArray(endorsementPeople.kind, kinds)));
  const values = [
    ...(by ?? []).map((userId) => ({ endorsementId, userId, kind: 'by' as const })),
    ...(to ?? []).map((userId) => ({ endorsementId, userId, kind: 'to' as const })),
  ];
  if (values.length) await tx.insert(endorsementPeople).values(values).onConflictDoNothing();
}

export async function create(db: Db, body: CreateBody, actorId: number): Promise<EndorsementDto> {
  const sectionKey = body.sectionKey ?? (await sectionKeyForCategory(db, body.categoryId)) ?? 's6';
  if (!body.isNone && !body.categoryId && !body.sectionKey) throw badRequest('categoryId or sectionKey is required');
  const id = await db.transaction(async (tx) => {
    const [row] = await tx
      .insert(endorsements)
      .values({
        date: body.date,
        shift: body.shift,
        categoryId: body.isNone ? null : (body.categoryId ?? null),
        sectionKey,
        toolId: body.isNone ? null : (body.toolId ?? null),
        issue: body.isNone ? 'NONE' : body.issue,
        actionStatus: body.isNone ? 'NONE' : body.actionStatus,
        progress: body.isNone ? 'done' : body.progress,
        isNone: body.isNone,
        createdBy: actorId,
        updatedBy: actorId,
      })
      .returning({ id: endorsements.id });
    if (!body.isNone) await replacePeople(tx as unknown as Db, row!.id, body.endorseBy, body.endorseTo);
    return row!.id;
  });
  return getOne(db, id);
}

export async function patch(db: Db, id: number, body: PatchBody, actorId: number): Promise<EndorsementDto> {
  const { endorseBy, endorseTo, ...fields } = body;
  const set: Record<string, unknown> = { ...fields, updatedBy: actorId, updatedAt: new Date() };
  if (fields.categoryId !== undefined && fields.sectionKey === undefined) {
    const k = await sectionKeyForCategory(db, fields.categoryId);
    if (k) set['sectionKey'] = k;
  }
  await db.transaction(async (tx) => {
    const [row] = await tx.update(endorsements).set(set).where(eq(endorsements.id, id)).returning({ id: endorsements.id });
    if (!row) throw notFound('endorsement');
    await replacePeople(tx as unknown as Db, id, endorseBy, endorseTo);
  });
  return getOne(db, id);
}

export async function remove(db: Db, ids: number[]) {
  if (!ids.length) return { deleted: 0 };
  const rows = await db.delete(endorsements).where(inArray(endorsements.id, ids)).returning({ id: endorsements.id });
  return { deleted: rows.length };
}

/** Insert a NONE row for every section that has no rows yet in this shift. */
export async function noneAll(db: Db, date: string, shift: 'DS' | 'NS', actorId: number) {
  const existing = await fetchRows(db, and(eq(endorsements.date, date), eq(endorsements.shift, shift)), [asc(endorsements.id)]);
  const have = new Set(existing.map((r) => toDto(r).sectionKey));
  const missing = SECTION_KEYS.filter((k) => !have.has(k));
  if (missing.length) {
    await db.insert(endorsements).values(
      missing.map((sectionKey) => ({
        date,
        shift,
        sectionKey,
        issue: 'NONE',
        actionStatus: 'NONE',
        progress: 'done' as const,
        isNone: true,
        createdBy: actorId,
        updatedBy: actorId,
      })),
    );
  }
  return board(db, date, shift);
}

export async function summary(db: Db, q: { from?: string; to?: string; shift?: 'DS' | 'NS' }) {
  const where = buildWhere({ ...q, includeNone: 'false' });
  const [byCategory, byProgress, byShift, byTool, byMonth, totals] = await Promise.all([
    db
      .select({ id: endorsementCategories.id, name: endorsementCategories.name, sectionKey: endorsementCategories.sectionKey, n: count() })
      .from(endorsements)
      .leftJoin(endorsementCategories, eq(endorsementCategories.id, endorsements.categoryId))
      .where(where)
      .groupBy(endorsementCategories.id, endorsementCategories.name, endorsementCategories.sectionKey)
      .orderBy(desc(count())),
    db.select({ progress: endorsements.progress, n: count() }).from(endorsements).where(where).groupBy(endorsements.progress),
    db.select({ shift: endorsements.shift, n: count() }).from(endorsements).where(where).groupBy(endorsements.shift),
    db
      .select({ id: tools.id, code: tools.code, n: count() })
      .from(endorsements)
      .innerJoin(tools, eq(tools.id, endorsements.toolId))
      .where(where)
      .groupBy(tools.id, tools.code)
      .orderBy(desc(count()))
      .limit(15),
    db
      .select({ month: sql<string>`to_char(${endorsements.date}, 'YYYY-MM')`, n: count() })
      .from(endorsements)
      .where(where)
      .groupBy(sql`to_char(${endorsements.date}, 'YYYY-MM')`)
      .orderBy(sql`to_char(${endorsements.date}, 'YYYY-MM')`),
    db.select({ n: count() }).from(endorsements).where(where),
  ]);
  const byPerson = await db
    .select({ id: users.id, idNo: users.idNo, name: users.name, kind: endorsementPeople.kind, n: count() })
    .from(endorsementPeople)
    .innerJoin(endorsements, eq(endorsements.id, endorsementPeople.endorsementId))
    .innerJoin(users, eq(users.id, endorsementPeople.userId))
    .where(where)
    .groupBy(users.id, users.idNo, users.name, endorsementPeople.kind)
    .orderBy(desc(count()));
  return { total: totals[0]?.n ?? 0, byCategory, byProgress, byShift, byTool, byMonth, byPerson };
}
