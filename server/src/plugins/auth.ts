import cookie from '@fastify/cookie';
import { and, eq, gt } from 'drizzle-orm';
import type { FastifyReply, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';

import { env } from '../config/env.js';
import { schema } from '../db/index.js';
import { forbidden, unauthorized } from '../lib/errors.js';
import type { UserRole } from '../shared/domain.js';

export const SESSION_COOKIE = 'saa_sid';
const ttlMs = () => env.SESSION_TTL_HOURS * 3_600_000;

export function cookieOptions(expires: Date) {
  return {
    path: '/',
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: env.COOKIE_SECURE,
    expires,
  };
}

export default fp(async (app) => {
  await app.register(cookie);
  app.decorateRequest('user', null);
  app.decorateRequest('sessionId', null);

  // Resolve the session on every request (cheap indexed lookup); routes decide whether it is required.
  app.addHook('onRequest', async (request, reply) => {
    const sid = request.cookies[SESSION_COOKIE];
    if (!sid || !/^[0-9a-f-]{36}$/i.test(sid)) return;
    const now = new Date();
    const rows = await app.db
      .select({
        sessionId: schema.sessions.id,
        expiresAt: schema.sessions.expiresAt,
        id: schema.users.id,
        idNo: schema.users.idNo,
        name: schema.users.name,
        role: schema.users.role,
        isActive: schema.users.isActive,
      })
      .from(schema.sessions)
      .innerJoin(schema.users, eq(schema.users.id, schema.sessions.userId))
      .where(and(eq(schema.sessions.id, sid), gt(schema.sessions.expiresAt, now)))
      .limit(1);
    const row = rows[0];
    if (!row || !row.isActive) return;
    request.user = { id: row.id, idNo: row.idNo, name: row.name, role: row.role };
    request.sessionId = row.sessionId;
    // Sliding expiry: renew when less than half the TTL is left.
    if (row.expiresAt.getTime() - now.getTime() < ttlMs() / 2) {
      const expiresAt = new Date(now.getTime() + ttlMs());
      await app.db.update(schema.sessions).set({ expiresAt, lastSeenAt: now }).where(eq(schema.sessions.id, sid));
      reply.setCookie(SESSION_COOKIE, sid, cookieOptions(expiresAt));
    }
  });

  app.decorate('authenticate', async (request: FastifyRequest) => {
    if (!request.user) throw unauthorized();
  });

  app.decorate('requireRole', (...roles: UserRole[]) => {
    return async (request: FastifyRequest, _reply: FastifyReply) => {
      if (!request.user) throw unauthorized();
      if (!roles.includes(request.user.role)) throw forbidden(`requires role ${roles.join(' or ')}`);
    };
  });
});
