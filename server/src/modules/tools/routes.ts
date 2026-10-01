import { asc, eq } from 'drizzle-orm';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';

import { schema } from '../../db/index.js';
import { createdFields, recordAudit, recordUpdate } from '../../lib/audit.js';
import { notFound } from '../../lib/errors.js';
import { idParam, toolCode } from '../../lib/zod.js';
import { TOOL_TYPES } from '../../shared/domain.js';

const regionFields = z.object({
  name: z.string().trim().min(1).max(60),
  sortOrder: z.number().int(),
  isActive: z.boolean(),
});
const regionBody = regionFields.extend({
  sortOrder: regionFields.shape.sortOrder.default(0),
  isActive: regionFields.shape.isActive.default(true),
});
/** No defaults in PATCH bodies: zod 4 `.partial()` keeps `.default()` and would reset omitted fields. */
const regionPatch = regionFields.partial();

const toolFields = z.object({
  code: toolCode,
  regionId: z.number().int().nullable().optional(),
  toolType: z.enum(TOOL_TYPES).nullable().optional(),
  eeUserId: z.number().int().nullable().optional(),
  isActive: z.boolean(),
  notes: z.string().nullable().optional(),
});
const toolBody = toolFields.extend({ isActive: toolFields.shape.isActive.default(true) });
const toolPatch = toolFields.partial();

const REGION_AUDITED = ['name', 'sortOrder', 'isActive'] as const;
const TOOL_AUDITED = ['code', 'regionId', 'toolType', 'eeUserId', 'isActive', 'notes'] as const;

const routes: FastifyPluginAsyncZod = async (app) => {
  app.addHook('preHandler', app.authenticate);

  app.get('/regions', async () => {
    const items = await app.db.select().from(schema.regions).orderBy(asc(schema.regions.sortOrder), asc(schema.regions.name));
    return { items };
  });
  app.post('/regions', { preHandler: app.requireRole('admin'), schema: { body: regionBody } }, async (request, reply) => {
    const row = await app.db.transaction(async (tx) => {
      const [created] = await tx.insert(schema.regions).values(request.body).returning();
      await recordAudit(tx, {
        entity: 'region',
        entityId: created!.id,
        entityLabel: created!.name,
        action: 'create',
        changes: createdFields(created!, REGION_AUDITED),
        actor: request.user,
      });
      return created;
    });
    return reply.status(201).send(row);
  });
  app.patch('/regions/:id', { preHandler: app.requireRole('admin'), schema: { params: idParam, body: regionPatch } }, async (request) => {
    return app.db.transaction(async (tx) => {
      const [before] = await tx.select().from(schema.regions).where(eq(schema.regions.id, request.params.id)).for('update');
      if (!before) throw notFound('region');
      if (Object.keys(request.body).length === 0) return before;
      const [row] = await tx.update(schema.regions).set(request.body).where(eq(schema.regions.id, request.params.id)).returning();
      if (!row) throw notFound('region');
      await recordUpdate(tx, { entity: 'region', entityId: row.id, entityLabel: row.name, before, after: row, fields: REGION_AUDITED, actor: request.user });
      return row;
    });
  });

  app.get('/tools', { schema: { querystring: z.object({ includeInactive: z.enum(['true', 'false']).optional() }) } }, async (request) => {
    const items = await app.db.query.tools.findMany({
      where: request.query.includeInactive === 'true' ? undefined : eq(schema.tools.isActive, true),
      with: { region: true, ee: { columns: { id: true, idNo: true, name: true } } },
      orderBy: [asc(schema.tools.sortOrder), asc(schema.tools.code)],
    });
    return { items };
  });
  app.post('/tools', { preHandler: app.requireRole('admin'), schema: { body: toolBody } }, async (request, reply) => {
    const sortOrder = Number(request.body.code.slice(3, 5));
    const row = await app.db.transaction(async (tx) => {
      const [created] = await tx.insert(schema.tools).values({ ...request.body, sortOrder }).returning();
      await recordAudit(tx, {
        entity: 'tool',
        entityId: created!.id,
        entityLabel: created!.code,
        action: 'create',
        changes: createdFields(created!, TOOL_AUDITED),
        actor: request.user,
      });
      return created;
    });
    return reply.status(201).send(row);
  });
  app.patch('/tools/:id', { preHandler: app.requireRole('admin'), schema: { params: idParam, body: toolPatch } }, async (request) => {
    const patch = { ...request.body, ...(request.body.code ? { sortOrder: Number(request.body.code.slice(3, 5)) } : {}) };
    return app.db.transaction(async (tx) => {
      const [before] = await tx.select().from(schema.tools).where(eq(schema.tools.id, request.params.id)).for('update');
      if (!before) throw notFound('tool');
      if (Object.keys(patch).length === 0) return before;
      const [row] = await tx.update(schema.tools).set(patch).where(eq(schema.tools.id, request.params.id)).returning();
      if (!row) throw notFound('tool');
      await recordUpdate(tx, { entity: 'tool', entityId: row.id, entityLabel: row.code, before, after: row, fields: TOOL_AUDITED, actor: request.user });
      return row;
    });
  });
};

export default routes;
