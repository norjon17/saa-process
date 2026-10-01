import { and, asc, eq, gte, lte } from 'drizzle-orm';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';

import { schema } from '../../db/index.js';
import { isoDate, yearMonth } from '../../lib/zod.js';
import { CONTACT_CHIP_VALUES } from '../../shared/domain.js';
import { monthRange } from '../../shared/time.js';

const { contactChip, tools } = schema;

const routes: FastifyPluginAsyncZod = async (app) => {
  app.addHook('preHandler', app.authenticate);

  app.get('/', { schema: { querystring: z.object({ month: yearMonth, regionId: z.coerce.number().int().optional() }) } }, async (request) => {
    const { from, to } = monthRange(request.query.month);
    const [toolRows, rows] = await Promise.all([
      app.db.query.tools.findMany({
        where: and(eq(tools.isActive, true), request.query.regionId ? eq(tools.regionId, request.query.regionId) : undefined),
        with: { region: true },
        orderBy: [asc(tools.sortOrder)],
      }),
      app.db.select().from(contactChip).where(and(gte(contactChip.date, from), lte(contactChip.date, to))),
    ]);
    return {
      month: request.query.month,
      from,
      to,
      tools: toolRows.map((t) => ({ id: t.id, code: t.code, region: t.region?.name ?? null, toolType: t.toolType })),
      rows,
    };
  });

  app.put(
    '/:toolId/:date',
    {
      schema: {
        params: z.object({ toolId: z.coerce.number().int(), date: isoDate }),
        body: z.object({ value: z.enum(CONTACT_CHIP_VALUES).nullable(), note: z.string().max(300).nullable().optional() }),
      },
    },
    async (request) => {
      const { toolId, date } = request.params;
      if (request.body.value === null) {
        await app.db.delete(contactChip).where(and(eq(contactChip.toolId, toolId), eq(contactChip.date, date)));
        return { deleted: true };
      }
      const [row] = await app.db
        .insert(contactChip)
        .values({ toolId, date, value: request.body.value, note: request.body.note ?? null, updatedBy: request.user!.id })
        .onConflictDoUpdate({
          target: [contactChip.toolId, contactChip.date],
          set: { value: request.body.value, note: request.body.note ?? null, updatedBy: request.user!.id, updatedAt: new Date() },
        })
        .returning();
      return row;
    },
  );
};

export default routes;
