/**
 * Audit log: diff helpers (pure) + integration against the local database using ONLY a temporary user
 * (unused 4-digit ID in 8000–8999) that is removed again in afterAll. Skipped when PostgreSQL is down.
 */
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { buildApp } from '../src/app.js';
import { createDb, createPool } from '../src/db/index.js';
import { diffFields, updateAction } from '../src/lib/audit.js';

describe('audit diff helpers', () => {
  it('returns only changed fields and ignores undefined', () => {
    const before = { name: 'A', role: 'tech', isActive: true, notes: null as string | null, tags: ['x', 'y'] };
    expect(diffFields(before, { name: 'A', role: undefined, notes: null, tags: ['x', 'y'] }, ['name', 'role', 'notes', 'tags'])).toEqual({});
    expect(diffFields(before, { name: 'B', notes: 'n' }, ['name', 'role', 'notes'])).toEqual({ name: { from: 'A', to: 'B' }, notes: { from: null, to: 'n' } });
    expect(diffFields({ o: { a: 1, b: 2 } }, { o: { b: 2, a: 1 } }, ['o'])).toEqual({});
    expect(diffFields(null, { a: 1 }, ['a'])).toEqual({ a: { from: null, to: 1 } });
  });
  it('maps isActive-only changes to activate/deactivate', () => {
    expect(updateAction({ isActive: { from: true, to: false } })).toBe('deactivate');
    expect(updateAction({ isActive: { from: false, to: true } })).toBe('activate');
    expect(updateAction({ isActive: { from: false, to: true }, name: { from: 'a', to: 'b' } })).toBe('update');
  });
});

const pool = createPool();
let dbUp = false;
try {
  await pool.query('select 1');
  dbUp = true;
} catch (err) {
  console.warn('[audit.test] database not reachable, skipping integration tests:', (err as Error).message);
}

interface LogItem {
  id: number;
  entity: string;
  entityId: string;
  action: string;
  changes: Record<string, { from: unknown; to: unknown }>;
  actorName: string | null;
}

describe.skipIf(!dbUp)('audit logs (temporary user)', () => {
  let app: FastifyInstance;
  let cookie = '';
  let userId = 0;
  let idNo = '';

  const logsFor = async (extra = '') => {
    const res = await app.inject({ method: 'GET', url: `/api/audit-logs?entity=user,user_alias&entityId=${userId}&limit=200${extra}`, headers: { cookie } });
    expect(res.statusCode).toBe(200);
    return res.json() as { items: LogItem[]; nextCursor: string | null };
  };

  beforeAll(async () => {
    app = await buildApp({ db: createDb(pool), logger: false });
    await app.ready();
    const login = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { idNo: '1111' } });
    const setCookie = login.headers['set-cookie'];
    cookie = (Array.isArray(setCookie) ? setCookie[0]! : String(setCookie)).split(';')[0]!;

    const taken = await pool.query<{ id_no: string }>("select id_no from users where id_no between '8000' and '8999'");
    const used = new Set(taken.rows.map((r) => r.id_no));
    for (let n = 8999; n >= 8000; n--) {
      if (!used.has(String(n))) {
        idNo = String(n);
        break;
      }
    }
    if (!idNo) throw new Error('no free 4-digit ID in 8000–8999 for the temporary user');
  });

  afterAll(async () => {
    if (userId) {
      await pool.query("delete from audit_logs where entity in ('user', 'user_alias') and entity_id = $1", [String(userId)]);
      await pool.query('delete from users where id = $1', [userId]);
    }
    await app?.close();
    await pool.end().catch(() => undefined);
  });

  it('logs create with every field from null', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/users', headers: { cookie }, payload: { idNo, name: 'Audit Temp', role: 'ee' } });
    expect(res.statusCode).toBe(201);
    userId = res.json().id;
    const { items } = await logsFor();
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ action: 'create', entity: 'user', actorName: expect.any(String) });
    expect(items[0]!.changes['name']).toEqual({ from: null, to: 'Audit Temp' });
  });

  it('patching the name logs exactly one update and keeps other fields', async () => {
    const res = await app.inject({ method: 'PATCH', url: `/api/users/${userId}`, headers: { cookie }, payload: { name: 'Audit Temp 2' } });
    expect(res.statusCode).toBe(200);
    // Regression: omitted fields must not be reset to their create defaults.
    expect(res.json()).toMatchObject({ name: 'Audit Temp 2', role: 'ee', isActive: true });
    const { items } = await logsFor();
    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({ action: 'update', changes: { name: { from: 'Audit Temp', to: 'Audit Temp 2' } } });
    expect(Object.keys(items[0]!.changes)).toEqual(['name']);
  });

  it('patching identical values writes no log', async () => {
    const res = await app.inject({ method: 'PATCH', url: `/api/users/${userId}`, headers: { cookie }, payload: { name: 'Audit Temp 2', role: 'ee' } });
    expect(res.statusCode).toBe(200);
    expect((await logsFor()).items).toHaveLength(2);
  });

  it('deactivate / activate are their own actions', async () => {
    await app.inject({ method: 'PATCH', url: `/api/users/${userId}`, headers: { cookie }, payload: { isActive: false } });
    await app.inject({ method: 'PATCH', url: `/api/users/${userId}`, headers: { cookie }, payload: { isActive: true } });
    const { items } = await logsFor();
    expect(items.slice(0, 2).map((i) => i.action)).toEqual(['activate', 'deactivate']);
  });

  it('aliases PUT logs a user_alias change', async () => {
    const alias = `audit-temp-${idNo}-alias`;
    const res = await app.inject({ method: 'PUT', url: `/api/users/${userId}/aliases`, headers: { cookie }, payload: { aliases: [alias] } });
    expect(res.json()).toEqual({ items: [alias] });
    const { items } = await logsFor('&action=update');
    expect(items[0]).toMatchObject({ entity: 'user_alias', entityId: String(userId), changes: { aliases: { from: [], to: [alias] } } });
    // Same list again → nothing new.
    await app.inject({ method: 'PUT', url: `/api/users/${userId}/aliases`, headers: { cookie }, payload: { aliases: [alias] } });
    expect((await logsFor()).items.filter((i) => i.entity === 'user_alias')).toHaveLength(1);
  });

  it('keyset-paginates with limit 2 without duplicates or gaps', async () => {
    await app.inject({ method: 'PATCH', url: `/api/users/${userId}`, headers: { cookie }, payload: { role: 'tech' } });
    const all = (await logsFor()).items;
    expect(all.length).toBeGreaterThanOrEqual(5);

    const seen: number[] = [];
    let cursor: string | null = null;
    let pages = 0;
    do {
      const url: string = `/api/audit-logs?entity=user,user_alias&entityId=${userId}&limit=2${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`;
      const res = await app.inject({ method: 'GET', url, headers: { cookie } });
      expect(res.statusCode).toBe(200);
      const body = res.json() as { items: LogItem[]; nextCursor: string | null };
      expect(body.items.length).toBeLessThanOrEqual(2);
      seen.push(...body.items.map((i) => i.id));
      cursor = body.nextCursor;
      pages++;
    } while (cursor && pages < 20);
    expect(cursor).toBeNull();
    expect(seen).toEqual(all.map((i) => i.id));
    expect(new Set(seen).size).toBe(seen.length);
  });

  it('validates query params and requires admin', async () => {
    expect((await app.inject({ method: 'GET', url: '/api/audit-logs?entity=bogus', headers: { cookie } })).statusCode).toBe(400);
    expect((await app.inject({ method: 'GET', url: '/api/audit-logs?cursor=notacursor', headers: { cookie } })).statusCode).toBe(400);
    expect((await app.inject({ method: 'GET', url: '/api/audit-logs' })).statusCode).toBe(401);
  });
});
