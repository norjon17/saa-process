import { and, asc, desc, eq, sql } from 'drizzle-orm';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';

import { schema } from '../../db/index.js';
import { badRequest } from '../../lib/errors.js';
import { isoDate, nullableNumber, nullableString, yearMonth } from '../../lib/zod.js';
import { TOOL_TYPES } from '../../shared/domain.js';

const { pmStatus, tools } = schema;

const numericKeys = [
  'fixVacLWith',
  'fixVacLWithout',
  'fixVacRWith',
  'fixVacRWithout',
  'pickVacLWith',
  'pickVacLWithout',
  'pickVacRWith',
  'pickVacRWithout',
  'clampLClamp',
  'clampLUnclamp',
  'clampRClamp',
  'clampRUnclamp',
  'fixtureSpring',
  'speedMotor',
  'zOffLPickup',
  'zOffLRelease',
  'zOffRPickup',
  'zOffRRelease',
] as const;
const boolKeys = ['optGrr', 'optCorrelation', 'optLaserRecipe', 'optAdditionalArea', 'optScanPatternDir'] as const;
const textKeys = ['area', 'eeRaw', 'fixtureLeft', 'fixtureRight', 'scanPattern', 'remarks'] as const;

const body = z.object({
  ...Object.fromEntries(numericKeys.map((k) => [k, nullableNumber])),
  ...Object.fromEntries(boolKeys.map((k) => [k, z.boolean().nullable().optional()])),
  ...Object.fromEntries(textKeys.map((k) => [k, nullableString])),
  toolType: z.enum(TOOL_TYPES).nullable().optional(),
  eeUserId: z.number().int().nullable().optional(),
  actualDate: isoDate.nullable().optional(),
  extra: z.record(z.string(), z.unknown()).nullable().optional(),
});

const avg = (a: number | null, b: number | null) => (a !== null && b !== null ? (a + b) / 2 : null);
const diff = (a: number | null, b: number | null) => (a !== null && b !== null ? a - b : null);

function withDerived<T extends Record<(typeof numericKeys)[number], number | null>>(r: T) {
  return {
    ...r,
    derived: {
      fixVacLAvg: avg(r.fixVacLWith, r.fixVacLWithout),
      fixVacLDelta: diff(r.fixVacLWith, r.fixVacLWithout),
      fixVacRAvg: avg(r.fixVacRWith, r.fixVacRWithout),
      fixVacRDelta: diff(r.fixVacRWith, r.fixVacRWithout),
      pickVacLAvg: avg(r.pickVacLWith, r.pickVacLWithout),
      pickVacLDelta: diff(r.pickVacLWith, r.pickVacLWithout),
      pickVacRAvg: avg(r.pickVacRWith, r.pickVacRWithout),
      pickVacRDelta: diff(r.pickVacRWith, r.pickVacRWithout),
    },
  };
}

const periodOf = (m: string) => `${m}-01`;

const routes: FastifyPluginAsyncZod = async (app) => {
  app.addHook('preHandler', app.authenticate);

  app.get('/periods', async () => {
    const rows = await app.db
      .select({ period: pmStatus.period, n: sql<number>`count(*)::int` })
      .from(pmStatus)
      .groupBy(pmStatus.period)
      .orderBy(desc(pmStatus.period));
    return { items: rows.map((r) => ({ month: r.period.slice(0, 7), rows: r.n })) };
  });

  app.get('/', { schema: { querystring: z.object({ month: yearMonth }) } }, async (request) => {
    const period = periodOf(request.query.month);
    const [toolRows, rows] = await Promise.all([
      app.db.query.tools.findMany({ where: eq(tools.isActive, true), with: { region: true, ee: { columns: { id: true, name: true } } }, orderBy: [asc(tools.sortOrder)] }),
      app.db.query.pmStatus.findMany({ where: eq(pmStatus.period, period), with: { ee: { columns: { id: true, idNo: true, name: true } } } }),
    ]);
    const byTool = new Map(rows.map((r) => [r.toolId, r]));
    return {
      month: request.query.month,
      items: toolRows.map((t) => {
        const r = byTool.get(t.id);
        return { tool: { id: t.id, code: t.code, region: t.region?.name ?? null, toolType: t.toolType, ee: t.ee }, row: r ? withDerived(r) : null };
      }),
    };
  });

  app.put('/:toolId/:month', { schema: { params: z.object({ toolId: z.coerce.number().int(), month: yearMonth }), body } }, async (request) => {
    const period = periodOf(request.params.month);
    const values = { ...request.body, toolId: request.params.toolId, period, updatedBy: request.user!.id };
    const [row] = await app.db
      .insert(pmStatus)
      .values(values)
      .onConflictDoUpdate({ target: [pmStatus.toolId, pmStatus.period], set: { ...request.body, updatedBy: request.user!.id, updatedAt: new Date() } })
      .returning();
    return withDerived(row!);
  });

  app.delete('/:toolId/:month', { preHandler: app.requireRole('admin', 'ee'), schema: { params: z.object({ toolId: z.coerce.number().int(), month: yearMonth }) } }, async (request) => {
    await app.db.delete(pmStatus).where(and(eq(pmStatus.toolId, request.params.toolId), eq(pmStatus.period, periodOf(request.params.month))));
    return { ok: true };
  });

  /** Copy the static setup fields of every tool from one month into another (only for tools without a row yet). */
  app.post('/copy', { schema: { body: z.object({ from: yearMonth, to: yearMonth }) } }, async (request) => {
    if (request.body.from === request.body.to) throw badRequest('from and to must differ');
    const src = await app.db.select().from(pmStatus).where(eq(pmStatus.period, periodOf(request.body.from)));
    const dst = new Set((await app.db.select({ toolId: pmStatus.toolId }).from(pmStatus).where(eq(pmStatus.period, periodOf(request.body.to)))).map((r) => r.toolId));
    const toInsert = src
      .filter((r) => !dst.has(r.toolId))
      .map(({ id: _id, sourceRef: _s, actualDate: _a, updatedAt: _u, ...rest }) => ({ ...rest, period: periodOf(request.body.to), updatedBy: request.user!.id }));
    if (toInsert.length) await app.db.insert(pmStatus).values(toInsert);
    return { copied: toInsert.length };
  });
};

export default routes;
