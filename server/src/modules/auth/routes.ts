import { and, eq } from 'drizzle-orm';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';

import { env } from '../../config/env.js';
import { schema } from '../../db/index.js';
import { AppError } from '../../lib/errors.js';
import { idNo } from '../../lib/zod.js';
import { cookieOptions, SESSION_COOKIE } from '../../plugins/auth.js';
import { currentShiftInfo } from '../../shared/time.js';

const routes: FastifyPluginAsyncZod = async (app) => {
  app.post(
    '/login',
    {
      config: { rateLimit: { max: 20, timeWindow: '1 minute' } },
      schema: { body: z.object({ idNo }) },
    },
    async (request, reply) => {
      const user = (
        await app.db.select().from(schema.users).where(and(eq(schema.users.idNo, request.body.idNo))).limit(1)
      )[0];
      if (!user) throw new AppError(401, 'UNKNOWN_ID', 'Unknown ID number');
      if (!user.isActive) throw new AppError(403, 'INACTIVE', 'This account is inactive');

      const expiresAt = new Date(Date.now() + env.SESSION_TTL_HOURS * 3_600_000);
      const [session] = await app.db
        .insert(schema.sessions)
        .values({ userId: user.id, expiresAt, userAgent: request.headers['user-agent'] ?? null, ip: request.ip })
        .returning({ id: schema.sessions.id });
      reply.setCookie(SESSION_COOKIE, session!.id, cookieOptions(expiresAt));
      return { user: { id: user.id, idNo: user.idNo, name: user.name, role: user.role }, shift: currentShiftInfo() };
    },
  );

  app.post('/logout', async (request, reply) => {
    if (request.sessionId) await app.db.delete(schema.sessions).where(eq(schema.sessions.id, request.sessionId));
    reply.clearCookie(SESSION_COOKIE, { path: '/' });
    return { ok: true };
  });

  app.get('/me', async (request) => {
    return { user: request.user, shift: currentShiftInfo() };
  });
};

export default routes;
