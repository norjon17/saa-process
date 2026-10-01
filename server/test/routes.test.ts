/**
 * Integration tests against the local seeded database (npm run db:up && npm run db:seed).
 * Skipped automatically when PostgreSQL is not reachable.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { buildApp } from '../src/app.js';
import { createDb, createPool } from '../src/db/index.js';

const pool = createPool();
let dbUp = false;
try {
  await pool.query('select 1');
  dbUp = true;
} catch (err) {
  console.warn('[routes.test] database not reachable, skipping integration tests:', (err as Error).message);
  dbUp = false;
}

describe.skipIf(!dbUp)('API routes (seeded database)', () => {
  let app: FastifyInstance;
  let cookie = '';

  beforeAll(async () => {
    app = await buildApp({ db: createDb(pool), logger: false });
    await app.ready();
  });
  afterAll(async () => {
    await app?.close();
    await pool.end().catch(() => undefined);
  });

  it('GET /api/health', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/health' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ ok: true, db: 'up' });
  });

  it('rejects unauthenticated access and malformed IDs', async () => {
    expect((await app.inject({ method: 'GET', url: '/api/users' })).statusCode).toBe(401);
    const bad = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { idNo: '12' } });
    expect(bad.statusCode).toBe(400);
    expect(bad.json().error).toBe('VALIDATION');
    const unknown = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { idNo: '0000' } });
    expect(unknown.statusCode).toBe(401);
    expect(unknown.json().error).toBe('UNKNOWN_ID');
  });

  it('logs in the admin with ID 1111 and sets a session cookie', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { idNo: '1111' } });
    expect(res.statusCode).toBe(200);
    expect(res.json().user).toMatchObject({ idNo: '1111', role: 'admin' });
    const setCookie = res.headers['set-cookie'];
    const raw = Array.isArray(setCookie) ? setCookie[0]! : String(setCookie);
    cookie = raw.split(';')[0]!;
    expect(cookie.startsWith('saa_sid=')).toBe(true);
    const me = await app.inject({ method: 'GET', url: '/api/auth/me', headers: { cookie } });
    expect(me.json().user.idNo).toBe('1111');
  });

  it('serves the seeded endorsement board and KPIs', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/endorsements/board?date=2026-09-24&shift=DS', headers: { cookie } });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.items.length).toBeGreaterThan(5);
    expect(body.kpi.s4.total).toBeGreaterThan(0);
    expect(body.items[0]).toHaveProperty('endorseBy');
  });

  it('creates, patches and deletes an endorsement (with people)', async () => {
    const created = await app.inject({
      method: 'POST',
      url: '/api/endorsements',
      headers: { cookie },
      payload: { date: '2030-01-01', shift: 'DS', sectionKey: 's4', issue: 'test row', endorseBy: [1], endorseTo: [] },
    });
    expect(created.statusCode).toBe(201);
    const id = created.json().id as number;
    expect(created.json().endorseBy[0].idNo).toBe('1111');

    // A single-field PATCH must not reset the other fields (zod 4 partial()+default() regression).
    const onlyProgress = await app.inject({ method: 'PATCH', url: `/api/endorsements/${id}`, headers: { cookie }, payload: { progress: 'ongoing' } });
    expect(onlyProgress.json()).toMatchObject({ progress: 'ongoing', issue: 'test row' });
    expect(onlyProgress.json().endorseBy).toHaveLength(1);

    const patched = await app.inject({ method: 'PATCH', url: `/api/endorsements/${id}`, headers: { cookie }, payload: { progress: 'done', endorseBy: [] } });
    expect(patched.json()).toMatchObject({ progress: 'done', endorseBy: [], issue: 'test row' });

    const del = await app.inject({ method: 'DELETE', url: `/api/endorsements/${id}`, headers: { cookie } });
    expect(del.json()).toEqual({ deleted: 1 });
  });

  it('returns the seeded lots with 40 readings and 24 checks', async () => {
    const list = await app.inject({ method: 'GET', url: '/api/meancheck/lots', headers: { cookie } });
    expect(list.json().total).toBeGreaterThanOrEqual(2);
    const passed = list.json().items.find((l: { lotNo: string }) => l.lotNo === 'SF4UP17A260924BB23');
    expect(passed.verdict).toBe('passed');
    const detail = await app.inject({ method: 'GET', url: `/api/meancheck/lots/${passed.id}`, headers: { cookie } });
    expect(detail.json().readings).toHaveLength(40);
    expect(detail.json().checks).toHaveLength(24);
  });

  it('evaluates the failed sample lot through the multipart endpoint without persisting', async () => {
    const folder = fileURLToPath(new URL('../../database/samples/meancheck/failed', import.meta.url));
    const boundary = '----saaTestBoundary';
    const parts: Buffer[] = [];
    for (const f of readdirSync(folder).filter((x) => x.endsWith('.csv'))) {
      parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="files"; filename="${f}"\r\nContent-Type: text/csv\r\n\r\n`));
      parts.push(readFileSync(join(folder, f)));
      parts.push(Buffer.from('\r\n'));
    }
    parts.push(Buffer.from(`--${boundary}--\r\n`));
    const res = await app.inject({
      method: 'POST',
      url: '/api/meancheck/evaluate',
      headers: { cookie, 'content-type': `multipart/form-data; boundary=${boundary}` },
      payload: Buffer.concat(parts),
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().result.verdict).toBe('failed');
    expect(res.json().result.failCount).toBe(6);
  });

  it('upserts a daily grid cell and recomputes Overall', async () => {
    const res = await app.inject({ method: 'PUT', url: '/api/meancheck/daily/1/2030-01-01', headers: { cookie }, payload: { fillAll: 'P_AUTO' } });
    expect(res.statusCode).toBe(200);
    expect(res.json().overall).toBe('passed');
    const fail = await app.inject({ method: 'PUT', url: '/api/meancheck/daily/1/2030-01-01', headers: { cookie }, payload: { vsTgtRsaR: 'F_MAN' } });
    expect(fail.json().overall).toBe('failed');
    await app.inject({ method: 'DELETE', url: '/api/meancheck/daily/1/2030-01-01', headers: { cookie } });
  });

  it('serves PM status for a seeded month', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/pm-status?month=2026-09', headers: { cookie } });
    expect(res.statusCode).toBe(200);
    const withRows = res.json().items.filter((i: { row: unknown }) => i.row !== null);
    expect(withRows.length).toBeGreaterThan(30);
  });
});
