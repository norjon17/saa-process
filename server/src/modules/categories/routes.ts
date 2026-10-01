import { asc, eq } from 'drizzle-orm';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';

import { schema } from '../../db/index.js';
import { createdFields, recordAudit, recordUpdate } from '../../lib/audit.js';
import { notFound } from '../../lib/errors.js';
import { idParam } from '../../lib/zod.js';
import { SECTION_KEYS } from '../../shared/domain.js';

const fields = z.object({
  name: z.string().trim().min(1).max(80),
  sectionKey: z.enum(SECTION_KEYS),
  sortOrder: z.number().int(),
  isActive: z.boolean(),
});
const body = fields.extend({
  sectionKey: fields.shape.sectionKey.default('s6'),
  sortOrder: fields.shape.sortOrder.default(0),
  isActive: fields.shape.isActive.default(true),
});
/** No defaults in the PATCH body: zod 4 `.partial()` keeps `.default()` and would reset omitted fields. */
const patchBody = fields.partial();

const AUDITED = ['name', 'sectionKey', 'sortOrder', 'isActive'] as const;

const routes: FastifyPluginAsyncZod = async (app) => {
  app.addHook('preHandler', app.authenticate);

  app.get('/', async () => ({
    items: await app.db
      .select()
      .from(schema.endorsementCategories)
      .orderBy(asc(schema.endorsementCategories.sortOrder), asc(schema.endorsementCategories.name)),
  }));

  app.post('/', { preHandler: app.requireRole('admin'), schema: { body } }, async (request, reply) => {
    const row = await app.db.transaction(async (tx) => {
      const [created] = await tx.insert(schema.endorsementCategories).values(request.body).returning();
      await recordAudit(tx, {
        entity: 'category',
        entityId: created!.id,
        entityLabel: created!.name,
        action: 'create',
        changes: createdFields(created!, AUDITED),
        actor: request.user,
      });
      return created;
    });
    return reply.status(201).send(row);
  });

  app.patch('/:id', { preHandler: app.requireRole('admin'), schema: { params: idParam, body: patchBody } }, async (request) => {
    return app.db.transaction(async (tx) => {
      const [before] = await tx
        .select()
        .from(schema.endorsementCategories)
        .where(eq(schema.endorsementCategories.id, request.params.id))
        .for('update');
      if (!before) throw notFound('category');
      if (Object.keys(request.body).length === 0) return before;
      const [row] = await tx
        .update(schema.endorsementCategories)
        .set(request.body)
        .where(eq(schema.endorsementCategories.id, request.params.id))
        .returning();
      if (!row) throw notFound('category');
      await recordUpdate(tx, { entity: 'category', entityId: row.id, entityLabel: row.name, before, after: row, fields: AUDITED, actor: request.user });
      return row;
    });
  });
};

export default routes;
