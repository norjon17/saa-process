import { fileURLToPath } from 'node:url';

import { migrate } from 'drizzle-orm/node-postgres/migrator';

import { createDb, createPool } from './index.js';

const pool = createPool();
const db = createDb(pool);
try {
  await migrate(db, { migrationsFolder: fileURLToPath(new URL('../../drizzle', import.meta.url)) });
  console.info('migrations applied');
} finally {
  await pool.end();
}
