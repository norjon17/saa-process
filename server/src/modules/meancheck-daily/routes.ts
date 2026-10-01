import { and, asc, count, eq, gte, lte, sql } from 'drizzle-orm';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';

import { schema, type Db, type Tx } from '../../db/index.js';
import { dateRange, isoDate, yearMonth } from '../../lib/zod.js';
import { MC_CELL_STATUSES, MC_DAILY_CELLS, type McCellStatus } from '../../shared/domain.js';
import { monthRange } from '../../shared/time.js';
import { computeOverall, emptyCells, type DailyCells } from './overall.js';

const { meancheckDaily, tools } = schema;

const cell = z.enum(MC_CELL_STATUSES).nullable().optional();
const cellsSchema = z.object({
  vsSatPsaL: cell,
  vsSatPsaR: cell,
  vsSatRsaL: cell,
  vsSatRsaR: cell,
  vsTgtPsaL: cell,
  vsTgtPsaR: cell,
  vsTgtRsaL: cell,
  vsTgtRsaR: cell,
});
type CellsPatch = z.infer<typeof cellsSchema>;

const upsertBody = cellsSchema.extend({ note: z.string().max(500).nullable().optional(), fillAll: z.enum(MC_CELL_STATUSES).optional() });
const cellParams = z.object({ toolId: z.coerce.number().int().positive(), date: isoDate });

function mergeCells(existing: Partial<DailyCells> | undefined, patch: CellsPatch, fillAll: McCellStatus | undefined): DailyCells {
  const merged = emptyCells();
  for (const k of MC_DAILY_CELLS) {
    if (existing?.[k] !== undefined) merged[k] = existing[k] ?? null;
    if (fillAll) merged[k] = fillAll;
    const v = patch[k];
    if (v !== undefined) merged[k] = v ?? null;
  }
  return merged;
}

async function upsertDay(db: Db | Tx, toolId: number, date: string, body: z.infer<typeof upsertBody>, userId: number) {
  const { fillAll, note, ...patch } = body;
  const existing = (await db.select().from(meancheckDaily).where(and(eq(meancheckDaily.toolId, toolId), eq(meancheckDaily.date, date))).limit(1))[0];
  const cells = mergeCells(existing, patch, fillAll);
  const overall = computeOverall(cells);
  const [row] = await db
    .insert(meancheckDaily)
    .values({ toolId, date, ...cells, overall, note: note ?? null, updatedBy: userId })
    .onConflictDoUpdate({
      target: [meancheckDaily.toolId, meancheckDaily.date],
      set: { ...cells, overall, ...(note !== undefined ? { note } : {}), updatedBy: userId, updatedAt: new Date() },
    })
    .returning();
  return row!;
}

const routes: FastifyPluginAsyncZod = async (app) => {
  app.addHook('preHandler', app.authenticate);

  app.get('/', { schema: { querystring: z.object({ month: yearMonth, regionId: z.coerce.number().int().optional() }) } }, async (request) => {
    const { from, to } = monthRange(request.query.month);
    const toolRows = await app.db.query.tools.findMany({
      where: and(eq(tools.isActive, true), request.query.regionId ? eq(tools.regionId, request.query.regionId) : undefined),
      with: { region: true },
      orderBy: [asc(tools.sortOrder), asc(tools.code)],
    });
    const rows = await app.db
      .select()
      .from(meancheckDaily)
      .where(and(gte(meancheckDaily.date, from), lte(meancheckDaily.date, to)));
    return {
      month: request.query.month,
      from,
      to,
      tools: toolRows.map((t) => ({ id: t.id, code: t.code, region: t.region?.name ?? null, toolType: t.toolType })),
      rows,
    };
  });

  app.get('/summary', { schema: { querystring: dateRange } }, async (request) => {
    const where = and(
      request.query.from ? gte(meancheckDaily.date, request.query.from) : undefined,
      request.query.to ? lte(meancheckDaily.date, request.query.to) : undefined,
    );
    const rows = await app.db
      .select({ date: meancheckDaily.date, overall: meancheckDaily.overall, n: count() })
      .from(meancheckDaily)
      .where(where)
      .groupBy(meancheckDaily.date, meancheckDaily.overall)
      .orderBy(asc(meancheckDaily.date));
    const byDate = new Map<string, Record<string, number>>();
    for (const r of rows) {
      const d = byDate.get(r.date) ?? { passed: 0, failed: 0, idle: 0, mb: 0, pending: 0 };
      d[r.overall] = r.n;
      byDate.set(r.date, d);
    }
    const items = [...byDate.entries()].map(([date, c]) => {
      const passed = c['passed'] ?? 0;
      const failed = c['failed'] ?? 0;
      return { date, ...c, passRate: passed + failed > 0 ? passed / (passed + failed) : null };
    });
    const monthly = await app.db
      .select({ month: sql<string>`to_char(${meancheckDaily.date}, 'YYYY-MM')`, overall: meancheckDaily.overall, n: count() })
      .from(meancheckDaily)
      .where(where)
      .groupBy(sql`to_char(${meancheckDaily.date}, 'YYYY-MM')`, meancheckDaily.overall);
    return { items, monthly };
  });

  app.put('/:toolId/:date', { schema: { params: cellParams, body: upsertBody } }, async (request) =>
    upsertDay(app.db, request.params.toolId, request.params.date, request.body, request.user!.id),
  );

  app.post('/bulk', { schema: { body: z.object({ items: z.array(cellParams.merge(upsertBody)).min(1).max(2000) }) } }, async (request) => {
    const items = await app.db.transaction(async (tx) => {
      const out = [];
      for (const it of request.body.items) {
        const { toolId, date, ...body } = it;
        out.push(await upsertDay(tx, toolId, date, body, request.user!.id));
      }
      return out;
    });
    return { items };
  });

  app.delete('/:toolId/:date', { schema: { params: cellParams } }, async (request) => {
    await app.db.delete(meancheckDaily).where(and(eq(meancheckDaily.toolId, request.params.toolId), eq(meancheckDaily.date, request.params.date)));
    return { ok: true };
  });
};

export default routes;
