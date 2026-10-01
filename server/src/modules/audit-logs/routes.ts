import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';

import { listQuery } from './schemas.js';
import { listAuditLogs } from './service.js';

/** Admin-only change history of the reference data: `GET /api/audit-logs?entity=user,user_alias&cursor=…`. */
const routes: FastifyPluginAsyncZod = async (app) => {
  app.addHook('preHandler', app.requireRole('admin'));

  app.get('/', { schema: { querystring: listQuery } }, async (request) => listAuditLogs(app.db, request.query));
};

export default routes;
