import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';

import { env } from '../config/env.js';
import * as schema from './schema/index.js';

// Return numeric/bigint-ish columns as numbers where safe (int8 count()).
pg.types.setTypeParser(20, (v) => Number(v));

export function createPool(connectionString = env.DATABASE_URL): pg.Pool {
  return new pg.Pool({ connectionString, max: 10 });
}

export function createDb(pool: pg.Pool) {
  return drizzle(pool, { schema, casing: 'snake_case' });
}

export type Db = ReturnType<typeof createDb>;
export type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];
export { schema };
