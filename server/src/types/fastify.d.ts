import type { preHandlerHookHandler } from 'fastify';

import type { Db } from '../db/index.js';
import type { UserRole } from '../shared/domain.js';

export interface SessionUser {
  id: number;
  idNo: string;
  name: string;
  role: UserRole;
}

declare module 'fastify' {
  interface FastifyInstance {
    db: Db;
    authenticate: preHandlerHookHandler;
    requireRole: (...roles: UserRole[]) => preHandlerHookHandler;
  }
  interface FastifyRequest {
    user: SessionUser | null;
    sessionId: string | null;
  }
}
