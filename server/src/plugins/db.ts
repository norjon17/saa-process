import fp from 'fastify-plugin';

import { createDb, createPool, type Db } from '../db/index.js';

export interface DbPluginOptions {
  db?: Db;
  connectionString?: string;
}

export default fp<DbPluginOptions>(async (app, opts) => {
  if (opts.db) {
    app.decorate('db', opts.db);
    return;
  }
  const pool = createPool(opts.connectionString);
  app.decorate('db', createDb(pool));
  app.addHook('onClose', async () => {
    await pool.end();
  });
});
