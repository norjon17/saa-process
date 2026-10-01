import { and, count, desc, eq, getTableColumns, gte, ilike, lte, or, type SQL } from 'drizzle-orm';
import type { PgColumn, PgTable } from 'drizzle-orm/pg-core';
import type { FastifyInstance } from 'fastify';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z, type ZodObject, type ZodRawShape } from 'zod';

import { schema } from '../../db/index.js';
import { notFound } from '../../lib/errors.js';
import { dateRange, idParam, isoDate, nullableNumber, nullableString, pagination, shift } from '../../lib/zod.js';

const listQuery = pagination.merge(dateRange).extend({
  toolId: z.coerce.number().int().optional(),
  q: z.string().trim().max(100).optional(),
});

interface CrudSpec {
  prefix: string;
  table: PgTable;
  body: ZodObject<ZodRawShape>;
  dateCol?: string;
  toolCol?: string;
  searchCols: string[];
  orderCols: string[];
}

/** Generic list / create / patch / delete routes for the simple tabs (Low Cpk, Circuit Burn, FIT OCAP, Weekly OOC). */
function registerCrud(app: FastifyInstance, spec: CrudSpec) {
  const cols = getTableColumns(spec.table) as Record<string, PgColumn>;
  const col = (name: string): PgColumn => {
    const c = cols[name];
    if (!c) throw new Error(`column ${name} missing on ${spec.prefix}`);
    return c;
  };

  app.get(spec.prefix, { schema: { querystring: listQuery } }, async (request) => {
    const q = request.query as z.infer<typeof listQuery>;
    const conds: (SQL | undefined)[] = [];
    if (spec.dateCol && q.from) conds.push(gte(col(spec.dateCol), q.from));
    if (spec.dateCol && q.to) conds.push(lte(col(spec.dateCol), q.to));
    if (spec.toolCol && q.toolId) conds.push(eq(col(spec.toolCol), q.toolId));
    if (q.q && spec.searchCols.length) conds.push(or(...spec.searchCols.map((c) => ilike(col(c), `%${q.q}%`))));
    const where = conds.length ? and(...conds) : undefined;
    const [items, total] = await Promise.all([
      app.db
        .select()
        .from(spec.table)
        .where(where)
        .orderBy(...spec.orderCols.map((c) => desc(col(c))))
        .limit(q.pageSize)
        .offset((q.page - 1) * q.pageSize),
      app.db.select({ n: count() }).from(spec.table).where(where),
    ]);
    return { items, total: total[0]?.n ?? 0, page: q.page, pageSize: q.pageSize };
  });

  app.post(spec.prefix, { schema: { body: spec.body } }, async (request, reply) => {
    const values = { ...(request.body as Record<string, unknown>), createdBy: request.user!.id, updatedBy: request.user!.id };
    const [row] = await app.db.insert(spec.table).values(values).returning();
    return reply.status(201).send(row);
  });

  app.patch(`${spec.prefix}/:id`, { schema: { params: idParam, body: spec.body.partial() } }, async (request) => {
    const { id } = request.params as { id: number };
    const values = { ...(request.body as Record<string, unknown>), updatedBy: request.user!.id, updatedAt: new Date() };
    const [row] = await app.db.update(spec.table).set(values).where(eq(col('id'), id)).returning();
    if (!row) throw notFound('row');
    return row;
  });

  app.delete(`${spec.prefix}/:id`, { schema: { params: idParam } }, async (request) => {
    const { id } = request.params as { id: number };
    const rows = await app.db.delete(spec.table).where(eq(col('id'), id)).returning();
    if (!rows.length) throw notFound('row');
    return { ok: true };
  });
}

const common = {
  date: isoDate.nullable().optional(),
  shift: shift.nullable().optional(),
  toolId: z.number().int().nullable().optional(),
  seqNo: z.number().int().nullable().optional(),
  remarks: nullableString,
};

const routes: FastifyPluginAsyncZod = async (app) => {
  app.addHook('preHandler', app.authenticate);

  registerCrud(app, {
    prefix: '/low-cpk',
    table: schema.lowCpk,
    body: z.object({
      ...common,
      modelHt: nullableString,
      modelCode: z.string().length(3).nullable().optional(),
      lotNo: nullableString,
      mean: nullableNumber,
      sigma: nullableNumber,
      cpk: nullableNumber,
    }),
    dateCol: 'date',
    toolCol: 'toolId',
    searchCols: ['lotNo', 'modelHt', 'remarks'],
    orderCols: ['date', 'id'],
  });

  registerCrud(app, {
    prefix: '/circuit-burn',
    table: schema.circuitBurn,
    body: z.object({
      ...common,
      modelHt: nullableString,
      lotNo: nullableString,
      brickQty: z.number().int().nullable().optional(),
      defectQty: z.number().int().nullable().optional(),
    }),
    dateCol: 'date',
    toolCol: 'toolId',
    searchCols: ['lotNo', 'modelHt', 'remarks'],
    orderCols: ['date', 'id'],
  });

  registerCrud(app, {
    prefix: '/fit-ocap',
    table: schema.fitOcap,
    body: z.object({
      ...common,
      toolRaw: nullableString,
      model: nullableString,
      fitDetection: nullableString,
      defectName: nullableString,
      brickQty: z.number().int().nullable().optional(),
      defectQty: z.number().int().nullable().optional(),
      fitConfirmation: nullableString,
      beforeAction: nullableString,
      afterAction: nullableString,
      extra: z.record(z.string(), z.unknown()).nullable().optional(),
    }),
    dateCol: 'date',
    toolCol: 'toolId',
    searchCols: ['defectName', 'fitDetection', 'model', 'remarks'],
    orderCols: ['date', 'id'],
  });

  registerCrud(app, {
    prefix: '/weekly-ooc',
    table: schema.weeklyOoc,
    body: z.object({
      seqNo: z.number().int().nullable().optional(),
      ww: z.number().int().min(1).max(53).nullable().optional(),
      wwYear: z.number().int().nullable().optional(),
      toolId: z.number().int().nullable().optional(),
      toolRaw: nullableString,
      model: nullableString,
      headType: nullableString,
      suspension: nullableString,
      issue: nullableString,
      endorseBy: nullableString,
      endorseTo: nullableString,
      remarksAfterAction: nullableString,
    }),
    toolCol: 'toolId',
    searchCols: ['issue', 'model', 'remarksAfterAction'],
    orderCols: ['wwYear', 'ww', 'id'],
  });
};

export default routes;
