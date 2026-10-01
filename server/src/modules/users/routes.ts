import { and, asc, eq, inArray, ne } from 'drizzle-orm';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';

import { schema } from '../../db/index.js';
import { createdFields, diffFields, recordAudit, recordUpdate, userLabel } from '../../lib/audit.js';
import { conflict, notFound } from '../../lib/errors.js';
import { idNo, idParam } from '../../lib/zod.js';
import { USER_ROLES } from '../../shared/domain.js';

const userFields = z.object({
  idNo,
  name: z.string().trim().min(1).max(120),
  role: z.enum(USER_ROLES),
  isActive: z.boolean(),
});
const userBody = userFields.extend({
  role: userFields.shape.role.default('tech'),
  isActive: userFields.shape.isActive.default(true),
});
/** No defaults here: zod 4 `.partial()` would still fill them in and silently reset omitted fields. */
const userPatch = userFields.partial();

const AUDITED = ['idNo', 'name', 'role', 'isActive'] as const;
const sorted = (xs: string[]) => xs.toSorted();

const routes: FastifyPluginAsyncZod = async (app) => {
  app.addHook('preHandler', app.authenticate);

  app.get('/', { schema: { querystring: z.object({ includeInactive: z.enum(['true', 'false']).optional() }) } }, async (request) => {
    const all = request.query.includeInactive === 'true' && request.user!.role === 'admin';
    const rows = await app.db
      .select()
      .from(schema.users)
      .where(all ? undefined : eq(schema.users.isActive, true))
      .orderBy(asc(schema.users.role), asc(schema.users.name));
    return { items: rows };
  });

  app.post('/', { preHandler: app.requireRole('admin'), schema: { body: userBody } }, async (request, reply) => {
    const row = await app.db.transaction(async (tx) => {
      const exists = await tx.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.idNo, request.body.idNo)).limit(1);
      if (exists.length) throw conflict(`ID number ${request.body.idNo} already exists`);
      const [created] = await tx.insert(schema.users).values(request.body).returning();
      await recordAudit(tx, {
        entity: 'user',
        entityId: created!.id,
        entityLabel: userLabel(created!),
        action: 'create',
        changes: createdFields(created!, AUDITED),
        actor: request.user,
      });
      return created;
    });
    return reply.status(201).send(row);
  });

  app.patch('/:id', { preHandler: app.requireRole('admin'), schema: { params: idParam, body: userPatch } }, async (request) => {
    return app.db.transaction(async (tx) => {
      if (request.body.idNo) {
        const clash = await tx.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.idNo, request.body.idNo)).limit(1);
        if (clash[0] && clash[0].id !== request.params.id) throw conflict(`ID number ${request.body.idNo} already exists`);
      }
      const [before] = await tx.select().from(schema.users).where(eq(schema.users.id, request.params.id)).for('update');
      if (!before) throw notFound('user');
      const [row] = await tx
        .update(schema.users)
        .set({ ...request.body, updatedAt: new Date() })
        .where(eq(schema.users.id, request.params.id))
        .returning();
      if (!row) throw notFound('user');
      await recordUpdate(tx, { entity: 'user', entityId: row.id, entityLabel: userLabel(row), before, after: row, fields: AUDITED, actor: request.user });
      return row;
    });
  });

  app.get('/:id/aliases', { preHandler: app.requireRole('admin'), schema: { params: idParam } }, async (request) => {
    const rows = await app.db.select().from(schema.userAliases).where(eq(schema.userAliases.userId, request.params.id));
    return { items: rows.map((r) => r.alias) };
  });

  app.put(
    '/:id/aliases',
    { preHandler: app.requireRole('admin'), schema: { params: idParam, body: z.object({ aliases: z.array(z.string().trim().min(1)) }) } },
    async (request) => {
      const userId = request.params.id;
      const aliases = [...new Set(request.body.aliases.map((a) => a.toLowerCase()))];
      await app.db.transaction(async (tx) => {
        const beforeRows = await tx.select({ alias: schema.userAliases.alias }).from(schema.userAliases).where(eq(schema.userAliases.userId, userId));
        // Aliases currently owned by someone else move to this user (upsert below) — log their loss too.
        const stolen = aliases.length
          ? await tx
              .select({ alias: schema.userAliases.alias, userId: schema.userAliases.userId })
              .from(schema.userAliases)
              .where(and(inArray(schema.userAliases.alias, aliases), ne(schema.userAliases.userId, userId)))
          : [];

        await tx.delete(schema.userAliases).where(eq(schema.userAliases.userId, userId));
        if (aliases.length) {
          await tx
            .insert(schema.userAliases)
            .values(aliases.map((alias) => ({ alias, userId })))
            .onConflictDoUpdate({ target: schema.userAliases.alias, set: { userId } });
        }

        const involved = [userId, ...new Set(stolen.map((s) => s.userId))];
        const people = await tx.select().from(schema.users).where(inArray(schema.users.id, involved));
        const byId = new Map(people.map((p) => [p.id, p]));

        const self = byId.get(userId);
        if (self) {
          const changes = diffFields({ aliases: sorted(beforeRows.map((r) => r.alias)) }, { aliases: sorted(aliases) }, ['aliases']);
          await recordAudit(tx, { entity: 'user_alias', entityId: userId, entityLabel: userLabel(self), action: 'update', changes, actor: request.user });
        }
        for (const otherId of involved.slice(1)) {
          const other = byId.get(otherId);
          if (!other) continue;
          const lost = new Set(stolen.filter((s) => s.userId === otherId).map((s) => s.alias));
          const remaining = await tx.select({ alias: schema.userAliases.alias }).from(schema.userAliases).where(eq(schema.userAliases.userId, otherId));
          const after = sorted(remaining.map((r) => r.alias));
          const changes = diffFields({ aliases: sorted([...after, ...lost]) }, { aliases: after }, ['aliases']);
          await recordAudit(tx, { entity: 'user_alias', entityId: otherId, entityLabel: userLabel(other), action: 'update', changes, actor: request.user });
        }
      });
      return { items: aliases };
    },
  );
};

export default routes;
