import { asc, eq } from 'drizzle-orm';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';

import { schema } from '../../db/index.js';
import { createdFields, recordAudit, recordUpdate } from '../../lib/audit.js';

const modelBody = z.object({
  pitchTarget: z.number(),
  rollTarget: z.number().default(0),
  tolerance: z.number().positive(),
  deltaSatLimit: z.number().positive().default(0.05),
  deltaTargetLimit: z.number().positive().default(0.05),
  sigmaLimit: z.number().positive().default(0.08),
  cpkMin: z.number().positive().default(1.33),
  isActive: z.boolean().default(true),
});

const codeParam = z.object({ code: z.string().regex(/^[A-Z0-9]{3}$/i).transform((s) => s.toUpperCase()) });

const AUDITED = ['pitchTarget', 'rollTarget', 'tolerance', 'deltaSatLimit', 'deltaTargetLimit', 'sigmaLimit', 'cpkMin', 'isActive'] as const;

const routes: FastifyPluginAsyncZod = async (app) => {
  app.addHook('preHandler', app.authenticate);

  app.get('/', async () => ({ items: await app.db.select().from(schema.models).orderBy(asc(schema.models.code)) }));

  app.put('/:code', { preHandler: app.requireRole('admin', 'ee'), schema: { params: codeParam, body: modelBody } }, async (request) => {
    const code = request.params.code;
    return app.db.transaction(async (tx) => {
      const [before] = await tx.select().from(schema.models).where(eq(schema.models.code, code)).for('update');
      const [row] = await tx
        .insert(schema.models)
        .values({ code, ...request.body })
        .onConflictDoUpdate({ target: schema.models.code, set: request.body })
        .returning();
      if (before) {
        await recordUpdate(tx, { entity: 'model', entityId: code, entityLabel: code, before, after: row!, fields: AUDITED, actor: request.user });
      } else {
        await recordAudit(tx, { entity: 'model', entityId: code, entityLabel: code, action: 'create', changes: createdFields(row!, AUDITED), actor: request.user });
      }
      return row;
    });
  });

  app.delete('/:code', { preHandler: app.requireRole('admin'), schema: { params: codeParam } }, async (request) => {
    const code = request.params.code;
    await app.db.transaction(async (tx) => {
      const [before] = await tx.select().from(schema.models).where(eq(schema.models.code, code)).for('update');
      if (!before) return;
      const [row] = await tx.update(schema.models).set({ isActive: false }).where(eq(schema.models.code, code)).returning();
      await recordUpdate(tx, { entity: 'model', entityId: code, entityLabel: code, before, after: row!, fields: AUDITED, actor: request.user });
    });
    return { ok: true };
  });
};

export default routes;
