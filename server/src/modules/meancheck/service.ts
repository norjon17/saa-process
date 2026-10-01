import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { and, asc, count, desc, eq, gte, inArray, lte, type SQL } from 'drizzle-orm';

import { schema, type Db } from '../../db/index.js';
import { conflict, notFound } from '../../lib/errors.js';
import type { McCellStatus } from '../../shared/domain.js';
import { runMeancheck, type InputFile, type MeancheckRun, type ModelSpec } from '../../shared/meancheck/index.js';
import { computeOverall, type DailyCells } from '../meancheck-daily/overall.js';

const { meancheckLots, meancheckReadings, meancheckChecks, meancheckDaily, tools, models } = schema;

export async function specLookup(db: Db): Promise<(code: string) => ModelSpec | undefined> {
  const rows = await db.select().from(models).where(eq(models.isActive, true));
  const map = new Map(rows.map((r) => [r.code.toUpperCase(), r as ModelSpec]));
  return (code) => map.get(code.toUpperCase());
}

export async function evaluate(db: Db, files: InputFile[]): Promise<MeancheckRun> {
  return runMeancheck(files, await specLookup(db));
}

export interface PersistOptions {
  uploadDir: string;
  uploadedBy: number | null;
  replace: boolean;
  /** Also write P_AUTO/F_AUTO into the 1st-meancheck grid for that tool-day. */
  fillDaily?: boolean;
}

/** Derive the eight daily-grid cells from the lot's delta_sat / delta_target checks. */
export function dailyCellsFromRun(run: MeancheckRun): DailyCells {
  const get = (group: 'left' | 'right', axis: 'pitch' | 'roll', check: 'delta_sat' | 'delta_target'): McCellStatus => {
    const c = run.result.checks.find((x) => x.group === group && x.axis === axis && x.check === check);
    return c?.passed ? 'P_AUTO' : 'F_AUTO';
  };
  return {
    vsSatPsaL: get('left', 'pitch', 'delta_sat'),
    vsSatPsaR: get('right', 'pitch', 'delta_sat'),
    vsSatRsaL: get('left', 'roll', 'delta_sat'),
    vsSatRsaR: get('right', 'roll', 'delta_sat'),
    vsTgtPsaL: get('left', 'pitch', 'delta_target'),
    vsTgtPsaR: get('right', 'pitch', 'delta_target'),
    vsTgtRsaL: get('left', 'roll', 'delta_target'),
    vsTgtRsaR: get('right', 'roll', 'delta_target'),
  };
}

export async function persist(db: Db, run: MeancheckRun, files: InputFile[], opts: PersistOptions) {
  const tool = (await db.select({ id: tools.id }).from(tools).where(eq(tools.code, run.identity.toolCode)).limit(1))[0];
  if (!tool) throw notFound(`tool ${run.identity.toolCode} (add it under Admin › Tools)`);

  const existing = (await db.select({ id: meancheckLots.id }).from(meancheckLots).where(eq(meancheckLots.lotNo, run.identity.lotNo)).limit(1))[0];
  if (existing && !opts.replace) throw conflict(`lot ${run.identity.lotNo} already has a verdict`, { lotId: existing.id });

  const lotDir = path.posix.join('meancheck', run.identity.lotNo.replace(/[^A-Za-z0-9_-]/g, '_'));
  await mkdir(path.join(opts.uploadDir, lotDir), { recursive: true });
  const stored: Record<string, string> = {};
  for (const f of files) {
    const safe = path.basename(f.filename).replace(/[^A-Za-z0-9._-]/g, '_');
    const rel = path.posix.join(lotDir, safe);
    await writeFile(path.join(opts.uploadDir, rel), f.text, 'latin1');
    stored[safe] = rel;
  }

  const lotId = await db.transaction(async (tx) => {
    if (existing) await tx.delete(meancheckLots).where(eq(meancheckLots.id, existing.id));
    const [lot] = await tx
      .insert(meancheckLots)
      .values({
        lotNo: run.identity.lotNo,
        programLotName: run.identity.programLotName,
        toolId: tool.id,
        modelCode: run.spec.code,
        headType: run.identity.headType,
        suspension: run.identity.suspension,
        satTester: run.identity.satTester,
        mcDate: run.identity.mcDate,
        shift: run.identity.shift,
        asmLine: run.identity.asmLine,
        asmCell: run.identity.asmCell,
        operatorId: run.identity.operatorId,
        verdict: run.result.verdict,
        failCount: run.result.failCount,
        engineVersion: run.engineVersion,
        specSnapshot: run.spec,
        headDelta: run.result.headDelta,
        stats: run.result.stats,
        files: { stored, warnings: run.warnings },
        uploadedBy: opts.uploadedBy,
      })
      .returning({ id: meancheckLots.id });
    const id = lot!.id;
    await tx.insert(meancheckReadings).values(run.readings.map((r) => ({ lotId: id, ...r })));
    await tx.insert(meancheckChecks).values(run.result.checks.map((c) => ({ lotId: id, ...c })));

    if (opts.fillDaily !== false) {
      const cells = dailyCellsFromRun(run);
      await tx
        .insert(meancheckDaily)
        .values({ toolId: tool.id, date: run.identity.mcDate, ...cells, overall: computeOverall(cells), lotId: id, updatedBy: opts.uploadedBy })
        .onConflictDoUpdate({
          target: [meancheckDaily.toolId, meancheckDaily.date],
          set: { ...cells, overall: computeOverall(cells), lotId: id, updatedBy: opts.uploadedBy, updatedAt: new Date() },
        });
    }
    return id;
  });
  return getLot(db, lotId);
}

export interface LotListQuery {
  page: number;
  pageSize: number;
  toolId?: number;
  regionId?: number;
  verdict?: 'passed' | 'failed';
  model?: string;
  from?: string;
  to?: string;
  q?: string;
}

export async function listLots(db: Db, q: LotListQuery) {
  const conds: (SQL | undefined)[] = [];
  if (q.toolId) conds.push(eq(meancheckLots.toolId, q.toolId));
  if (q.verdict) conds.push(eq(meancheckLots.verdict, q.verdict));
  if (q.model) conds.push(eq(meancheckLots.modelCode, q.model.toUpperCase()));
  if (q.from) conds.push(gte(meancheckLots.mcDate, q.from));
  if (q.to) conds.push(lte(meancheckLots.mcDate, q.to));
  if (q.regionId) {
    const toolIds = (await db.select({ id: tools.id }).from(tools).where(eq(tools.regionId, q.regionId))).map((t) => t.id);
    conds.push(toolIds.length ? inArray(meancheckLots.toolId, toolIds) : eq(meancheckLots.id, -1));
  }
  if (q.q) conds.push(inArray(meancheckLots.lotNo, db.select({ l: meancheckLots.lotNo }).from(meancheckLots).where(eq(meancheckLots.lotNo, q.q))));
  const where = conds.length ? and(...conds) : undefined;
  const [items, total] = await Promise.all([
    db.query.meancheckLots.findMany({
      where,
      with: { tool: { columns: { id: true, code: true, regionId: true }, with: { region: true } } },
      orderBy: [desc(meancheckLots.mcDate), desc(meancheckLots.id)],
      limit: q.pageSize,
      offset: (q.page - 1) * q.pageSize,
    }),
    db.select({ n: count() }).from(meancheckLots).where(where),
  ]);
  return { items, total: total[0]?.n ?? 0, page: q.page, pageSize: q.pageSize };
}

export async function getLot(db: Db, id: number) {
  const lot = await db.query.meancheckLots.findFirst({
    where: eq(meancheckLots.id, id),
    with: {
      tool: { columns: { id: true, code: true, regionId: true }, with: { region: true } },
      readings: { orderBy: [asc(meancheckReadings.position)] },
      checks: true,
    },
  });
  if (!lot) throw notFound('lot');
  return lot;
}

export async function removeLot(db: Db, id: number) {
  const rows = await db.delete(meancheckLots).where(eq(meancheckLots.id, id)).returning({ id: meancheckLots.id });
  if (!rows.length) throw notFound('lot');
  return { ok: true };
}

/** Latest lot per active tool, grouped by region (the HGAProject-style status board). */
export async function toolStatus(db: Db) {
  const allTools = await db.query.tools.findMany({ where: eq(tools.isActive, true), with: { region: true }, orderBy: [asc(tools.sortOrder)] });
  const latest = await db.execute<{
    tool_id: number;
    id: number;
    lot_no: string;
    verdict: 'passed' | 'failed';
    mc_date: string;
    created_at: Date;
    model_code: string;
    head_type: string | null;
  }>(
    `select distinct on (tool_id) tool_id, id, lot_no, verdict, mc_date, created_at, model_code, head_type
       from meancheck_lots order by tool_id, mc_date desc, id desc`,
  );
  const byTool = new Map(latest.rows.map((r) => [r.tool_id, r]));
  return {
    items: allTools.map((t) => {
      const l = byTool.get(t.id);
      return {
        tool: { id: t.id, code: t.code, region: t.region?.name ?? null, toolType: t.toolType },
        latest: l
          ? { lotId: l.id, lotNo: l.lot_no, verdict: l.verdict, mcDate: l.mc_date, createdAt: l.created_at, model: l.model_code, headType: l.head_type }
          : null,
      };
    }),
  };
}
