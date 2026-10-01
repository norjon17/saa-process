import { sql } from 'drizzle-orm';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';

const routes: FastifyPluginAsyncZod = async (app) => {
  app.get('/', async () => {
    const started = Date.now();
    await app.db.execute(sql`select 1`);
    return { ok: true, db: 'up', latencyMs: Date.now() - started, time: new Date().toISOString() };
  });
};

export default routes;
