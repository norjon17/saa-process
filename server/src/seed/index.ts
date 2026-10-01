/**
 * Idempotent seeder: loads database/seed/* (produced by database/extract/run_all.py) into PostgreSQL.
 *   npm run db:seed                 → upsert everything
 *   npm run db:seed -- --reset      → truncate seeded tables first
 *   npm run db:seed -- --only=endorsements,pm_status
 */
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { parse } from 'csv-parse/sync';
import { eq, sql } from 'drizzle-orm';

import { createDb, createPool, schema, type Db } from '../db/index.js';
import { persist } from '../modules/meancheck/service.js';
import { computeOverall } from '../modules/meancheck-daily/overall.js';
import type { McCellStatus, SectionKey, ToolType, UserRole } from '../shared/domain.js';
import { MC_DAILY_CELLS } from '../shared/domain.js';
import { runMeancheck, type InputFile } from '../shared/meancheck/index.js';
import { normalizeProgress, normalizeShift, normalizeToolCode } from '../shared/normalize.js';

const root = fileURLToPath(new URL('../../..', import.meta.url));
const seedDir = path.join(root, 'database', 'seed');
const samplesDir = path.join(root, 'database', 'samples', 'meancheck');
const uploadDir = path.resolve(path.join(root, 'server', process.env['UPLOAD_DIR'] ?? './uploads'));

const args = process.argv.slice(2);
const RESET = args.includes('--reset');
const ONLY = args.find((a) => a.startsWith('--only='))?.slice(7).split(',').map((s) => s.trim()) ?? null;
const want = (name: string) => !ONLY || ONLY.includes(name);

type Row = Record<string, string>;
const readCsv = (name: string): Row[] => {
  const file = path.join(seedDir, name);
  if (!existsSync(file)) {
    console.warn(`  (skip) ${name} not found`);
    return [];
  }
  return parse(readFileSync(file, 'utf8'), { columns: true, skip_empty_lines: true, bom: true, trim: true }) as Row[];
};
const readJson = <T>(name: string): T | null => {
  const file = path.join(seedDir, name);
  return existsSync(file) ? (JSON.parse(readFileSync(file, 'utf8')) as T) : null;
};
const str = (v: string | undefined): string | null => (v === undefined || v === '' ? null : v);
const num = (v: string | undefined): number | null => {
  if (v === undefined || v.trim() === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
const int = (v: string | undefined): number | null => {
  const n = num(v);
  return n === null ? null : Math.trunc(n);
};
const bool = (v: string | undefined): boolean | null => (v === undefined || v === '' ? null : /^(true|1|yes|o)$/i.test(v));
const cellStatus = (v: string | undefined): McCellStatus | null =>
  v && (['P_AUTO', 'F_AUTO', 'P_MAN', 'F_MAN', 'IDLE', 'MB'] as const).includes(v as McCellStatus) ? (v as McCellStatus) : null;

async function batched<T>(rows: T[], size: number, fn: (chunk: T[]) => Promise<void>) {
  for (let i = 0; i < rows.length; i += size) await fn(rows.slice(i, i + size));
}

const summary: Record<string, number> = {};
const note = (table: string, n: number) => {
  summary[table] = (summary[table] ?? 0) + n;
  console.info(`  ${table}: ${n}`);
};

async function reset(db: Db) {
  const tables = [
    'endorsement_people', 'endorsement_attachments', 'endorsements', 'meancheck_checks', 'meancheck_readings', 'meancheck_daily',
    'meancheck_lots', 'pm_status', 'contact_chip', 'low_cpk', 'circuit_burn', 'fit_ocap', 'weekly_ooc', 'sessions',
    'tool_aliases', 'tools', 'user_aliases', 'users', 'models', 'endorsement_categories', 'regions',
  ];
  await db.execute(sql.raw(`TRUNCATE ${tables.map((t) => `"${t}"`).join(', ')} RESTART IDENTITY CASCADE`));
  console.info('  truncated all seeded tables');
}

// ---------- master data ----------
interface UserSeed { idNo: string; name: string; role: UserRole; aliases?: string[] }

async function seedUsers(db: Db) {
  const rows = readJson<UserSeed[]>('users.json') ?? [];
  if (!rows.length) return;
  await db
    .insert(schema.users)
    .values(rows.map((u) => ({ idNo: u.idNo, name: u.name, role: u.role })))
    .onConflictDoUpdate({ target: schema.users.idNo, set: { name: sql`excluded.name`, role: sql`excluded.role` } });
  const ids = new Map((await db.select({ id: schema.users.id, idNo: schema.users.idNo }).from(schema.users)).map((r) => [r.idNo, r.id]));
  const aliases = rows.flatMap((u) => [...new Set([...(u.aliases ?? []), u.name.toLowerCase()])].map((alias) => ({ alias: alias.toLowerCase(), userId: ids.get(u.idNo)! })));
  if (aliases.length) {
    await db.insert(schema.userAliases).values(aliases).onConflictDoUpdate({ target: schema.userAliases.alias, set: { userId: sql`excluded.user_id` } });
  }
  note('users', rows.length);
  note('user_aliases', aliases.length);
}

async function seedRegions(db: Db) {
  const raw = readJson<(string | { name: string; sortOrder?: number })[]>('regions.json') ?? [];
  const rows = raw.map((r, i) => (typeof r === 'string' ? { name: r, sortOrder: i } : { name: r.name, sortOrder: r.sortOrder ?? i }));
  if (!rows.length) return;
  await db.insert(schema.regions).values(rows).onConflictDoUpdate({ target: schema.regions.name, set: { sortOrder: sql`excluded.sort_order` } });
  note('regions', rows.length);
}

async function seedCategories(db: Db) {
  const rows = readJson<{ name: string; sectionKey: SectionKey; sortOrder?: number }[]>('categories.json') ?? [];
  if (!rows.length) return;
  await db
    .insert(schema.endorsementCategories)
    .values(rows.map((c, i) => ({ name: c.name, sectionKey: c.sectionKey, sortOrder: c.sortOrder ?? i })))
    .onConflictDoUpdate({ target: schema.endorsementCategories.name, set: { sectionKey: sql`excluded.section_key`, sortOrder: sql`excluded.sort_order` } });
  note('endorsement_categories', rows.length);
}

async function seedModels(db: Db) {
  const rows = readCsv('models.csv');
  if (!rows.length) return;
  await db
    .insert(schema.models)
    .values(
      rows.map((r) => ({
        code: r['code']!.toUpperCase(),
        pitchTarget: Number(r['pitch_target']),
        rollTarget: Number(r['roll_target'] ?? 0),
        tolerance: Number(r['tolerance']),
        deltaSatLimit: Number(r['delta_sat_limit'] ?? 0.05),
        deltaTargetLimit: Number(r['delta_target_limit'] ?? 0.05),
        sigmaLimit: Number(r['sigma_limit'] ?? 0.08),
        cpkMin: Number(r['cpk_min'] ?? 1.33),
      })),
    )
    .onConflictDoUpdate({
      target: schema.models.code,
      set: { pitchTarget: sql`excluded.pitch_target`, rollTarget: sql`excluded.roll_target`, tolerance: sql`excluded.tolerance` },
    });
  note('models', rows.length);
}

async function lookups(db: Db) {
  const regions = new Map((await db.select().from(schema.regions)).map((r) => [r.name.toLowerCase(), r.id]));
  const userByIdNo = new Map((await db.select().from(schema.users)).map((u) => [u.idNo, u.id]));
  const userByAlias = new Map((await db.select().from(schema.userAliases)).map((a) => [a.alias, a.userId]));
  const tools = new Map((await db.select().from(schema.tools)).map((t) => [t.code, t.id]));
  const toolAliases = new Map((await db.select().from(schema.toolAliases)).map((a) => [a.alias, a.toolId]));
  const categories = new Map((await db.select().from(schema.endorsementCategories)).map((c) => [c.name.toLowerCase(), c]));
  const models = new Set((await db.select({ code: schema.models.code }).from(schema.models)).map((m) => m.code));
  const toolId = (code: string | undefined | null): number | null => {
    if (!code) return null;
    const norm = normalizeToolCode(code);
    return (norm ? tools.get(norm) : undefined) ?? toolAliases.get(String(code).toUpperCase().replace(/\s+/g, '')) ?? null;
  };
  // Accepts an idNo, an alias/name, or a "|"- / "/"-joined list (first person wins for single-user columns).
  const userId = (idNoOrName: string | undefined | null): number | null => {
    if (!idNoOrName) return null;
    const first = idNoOrName.split(/[|/]/)[0]?.trim() ?? '';
    if (!first) return null;
    return userByIdNo.get(first) ?? userByAlias.get(first.toLowerCase()) ?? null;
  };
  return { regions, userByIdNo, userByAlias, tools, toolAliases, categories, models, toolId, userId };
}

async function seedTools(db: Db) {
  const rows = readCsv('tools.csv');
  if (!rows.length) return;
  const lk = await lookups(db);
  const values = rows
    .map((r) => {
      const code = normalizeToolCode(r['code']);
      if (!code) return null;
      return {
        code,
        regionId: r['region'] ? (lk.regions.get(r['region'].toLowerCase()) ?? null) : null,
        toolType: (r['tool_type'] === 'SAAT05' || r['tool_type'] === 'SAAT07' ? r['tool_type'] : null) as ToolType | null,
        eeUserId: lk.userId(r['ee_id_no'] || r['ee_name']),
        sortOrder: int(r['sort_order']) ?? Number(code.slice(3, 5)),
        isActive: r['active'] === undefined || r['active'] === '' ? true : bool(r['active'])!,
      };
    })
    .filter((v): v is NonNullable<typeof v> => v !== null);
  await db.insert(schema.tools).values(values).onConflictDoUpdate({
    target: schema.tools.code,
    set: { regionId: sql`excluded.region_id`, toolType: sql`excluded.tool_type`, eeUserId: sql`excluded.ee_user_id`, sortOrder: sql`excluded.sort_order` },
  });
  note('tools', values.length);
  const aliases = readJson<Record<string, string>>('tool_aliases.json') ?? {};
  const toolIds = new Map((await db.select().from(schema.tools)).map((t) => [t.code, t.id]));
  const aliasRows = Object.entries(aliases)
    .map(([alias, code]) => ({ alias: alias.toUpperCase().replace(/\s+/g, ''), toolId: toolIds.get(code)! }))
    .filter((a) => a.toolId);
  if (aliasRows.length) {
    await db.insert(schema.toolAliases).values(aliasRows).onConflictDoUpdate({ target: schema.toolAliases.alias, set: { toolId: sql`excluded.tool_id` } });
  }
  note('tool_aliases', aliasRows.length);
}

// ---------- endorsements ----------
async function seedEndorsements(db: Db) {
  const rows = readCsv('endorsements.csv');
  if (!rows.length) return;
  const lk = await lookups(db);
  const seedUserId = lk.userByIdNo.get('1111') ?? null;
  let skipped = 0;
  const prepared = rows
    .map((r) => {
      const shift = normalizeShift(r['shift']);
      const toolId = lk.toolId(r['tool_code'] || r['tool_raw']);
      if (!r['date'] || !shift) {
        skipped++;
        return null;
      }
      const cat = r['category'] ? lk.categories.get(r['category'].toLowerCase()) : undefined;
      const by = (r['endorse_by'] ?? '').split('|').map((s) => lk.userId(s)).filter((x): x is number => x !== null);
      const to = (r['endorse_to'] ?? '').split('|').map((s) => lk.userId(s)).filter((x): x is number => x !== null);
      return {
        sourceRef: `endorsement:${r['source_row']}`,
        seqNo: int(r['seq_no']),
        date: r['date'],
        shift,
        categoryId: cat?.id ?? null,
        sectionKey: (cat?.sectionKey ?? 's6') as SectionKey,
        toolId,
        issue: r['issue'] ?? '',
        actionStatus: r['action_status'] ?? '',
        progress: normalizeProgress(r['progress']),
        isNone: false,
        endorseByRaw: str(r['endorse_by_raw']),
        endorseToRaw: str(r['endorse_to_raw']),
        createdBy: seedUserId,
        updatedBy: seedUserId,
        by: [...new Set(by)],
        to: [...new Set(to)],
      };
    })
    .filter((v): v is NonNullable<typeof v> => v !== null);

  let inserted = 0;
  let people = 0;
  await batched(prepared, 500, async (chunk) => {
    await db.transaction(async (tx) => {
      const returned = await tx
        .insert(schema.endorsements)
        .values(chunk.map(({ by: _b, to: _t, ...v }) => v))
        .onConflictDoUpdate({
          target: schema.endorsements.sourceRef,
          set: {
            date: sql`excluded.date`, shift: sql`excluded.shift`, categoryId: sql`excluded.category_id`, sectionKey: sql`excluded.section_key`,
            toolId: sql`excluded.tool_id`, issue: sql`excluded.issue`, actionStatus: sql`excluded.action_status`, progress: sql`excluded.progress`,
            endorseByRaw: sql`excluded.endorse_by_raw`, endorseToRaw: sql`excluded.endorse_to_raw`,
          },
        })
        .returning({ id: schema.endorsements.id, sourceRef: schema.endorsements.sourceRef });
      const idBySource = new Map(returned.map((r) => [r.sourceRef, r.id]));
      const ids = returned.map((r) => r.id);
      await tx.delete(schema.endorsementPeople).where(sql`${schema.endorsementPeople.endorsementId} in ${ids}`);
      const peopleRows = chunk.flatMap((c) => {
        const id = idBySource.get(c.sourceRef)!;
        return [...c.by.map((userId) => ({ endorsementId: id, userId, kind: 'by' as const })), ...c.to.map((userId) => ({ endorsementId: id, userId, kind: 'to' as const }))];
      });
      if (peopleRows.length) await tx.insert(schema.endorsementPeople).values(peopleRows).onConflictDoNothing();
      inserted += returned.length;
      people += peopleRows.length;
    });
  });
  note('endorsements', inserted);
  note('endorsement_people', people);
  if (skipped) console.warn(`  endorsements skipped (no date/shift): ${skipped}`);
}

// ---------- pm status ----------
async function seedPmStatus(db: Db) {
  const rows = readCsv('pm_status.csv');
  if (!rows.length) return;
  const lk = await lookups(db);
  const values = rows
    .map((r) => {
      const toolId = lk.toolId(r['tool_code'] || r['tool_raw']);
      if (!toolId || !r['period']) return null;
      const period = r['period'].length === 7 ? `${r['period']}-01` : r['period'];
      return {
        sourceRef: `pm:${r['sheet']}:${r['tool_code']}`,
        toolId,
        period,
        area: str(r['area']),
        toolType: (r['tool_type'] === 'SAAT05' || r['tool_type'] === 'SAAT07' ? r['tool_type'] : null) as ToolType | null,
        eeUserId: lk.userId(r['ee_id_no'] || r['ee_raw']),
        eeRaw: str(r['ee_raw']),
        actualDate: str(r['actual_date']),
        fixVacLWith: num(r['fix_vac_l_with']), fixVacLWithout: num(r['fix_vac_l_without']),
        fixVacRWith: num(r['fix_vac_r_with']), fixVacRWithout: num(r['fix_vac_r_without']),
        pickVacLWith: num(r['pick_vac_l_with']), pickVacLWithout: num(r['pick_vac_l_without']),
        pickVacRWith: num(r['pick_vac_r_with']), pickVacRWithout: num(r['pick_vac_r_without']),
        clampLClamp: num(r['clamp_l_clamp']), clampLUnclamp: num(r['clamp_l_unclamp']),
        clampRClamp: num(r['clamp_r_clamp']), clampRUnclamp: num(r['clamp_r_unclamp']),
        fixtureSpring: num(r['fixture_spring']), speedMotor: num(r['speed_motor']),
        zOffLPickup: num(r['z_off_l_pickup']), zOffLRelease: num(r['z_off_l_release']),
        zOffRPickup: num(r['z_off_r_pickup']), zOffRRelease: num(r['z_off_r_release']),
        optGrr: bool(r['opt_grr']), optCorrelation: bool(r['opt_correlation']), optLaserRecipe: bool(r['opt_laser_recipe']),
        optAdditionalArea: bool(r['opt_additional_area']), optScanPatternDir: bool(r['opt_scan_pattern_dir']),
        fixtureLeft: str(r['fixture_left']), fixtureRight: str(r['fixture_right']), scanPattern: str(r['scan_pattern']),
        remarks: str(r['remarks']),
        extra: r['extra'] ? (JSON.parse(r['extra']) as Record<string, unknown>) : null,
      };
    })
    .filter((v): v is NonNullable<typeof v> => v !== null);
  // Dedupe on (toolId, period): keep the row with most filled values.
  const best = new Map<string, (typeof values)[number]>();
  for (const v of values) {
    const k = `${v.toolId}:${v.period}`;
    const filled = Object.values(v).filter((x) => x !== null && x !== '').length;
    const prev = best.get(k);
    if (!prev || filled > Object.values(prev).filter((x) => x !== null && x !== '').length) best.set(k, v);
  }
  const rowsToInsert = [...best.values()];
  await batched(rowsToInsert, 500, async (chunk) => {
    await db
      .insert(schema.pmStatus)
      .values(chunk)
      .onConflictDoUpdate({
        target: [schema.pmStatus.toolId, schema.pmStatus.period],
        set: Object.fromEntries(
          Object.keys(chunk[0]!)
            .filter((k) => !['toolId', 'period'].includes(k))
            .map((k) => [k, sql.raw(`excluded."${k.replace(/[A-Z]/g, (m) => `_${m.toLowerCase()}`)}"`)]),
        ),
      });
  });
  note('pm_status', rowsToInsert.length);
}

// ---------- contact chip ----------
async function seedContactChip(db: Db) {
  const rows = readCsv('contact_chip.csv');
  if (!rows.length) return;
  const lk = await lookups(db);
  const values = rows
    .map((r) => {
      const toolId = lk.toolId(r['tool_code']);
      const value = r['value'] as 'L' | 'R' | 'LR' | 'REPAIR' | 'PM';
      if (!toolId || !r['date'] || !['L', 'R', 'LR', 'REPAIR', 'PM'].includes(value)) return null;
      return { toolId, date: r['date'], value, note: str(r['note']), sourceRef: `cc:${r['tool_code']}:${r['date']}` };
    })
    .filter((v): v is NonNullable<typeof v> => v !== null);
  await batched(values, 1000, async (chunk) => {
    await db
      .insert(schema.contactChip)
      .values(chunk)
      .onConflictDoUpdate({ target: [schema.contactChip.toolId, schema.contactChip.date], set: { value: sql`excluded.value`, note: sql`excluded.note` } });
  });
  note('contact_chip', values.length);
}

// ---------- minor tabs ----------
async function seedMinor(db: Db) {
  const lk = await lookups(db);
  const lowCpk = readCsv('low_cpk.csv').map((r) => ({
    sourceRef: `lowcpk:${r['source_row']}`, seqNo: int(r['seq_no'] ?? r['no']), date: str(r['date']), shift: normalizeShift(r['shift']),
    toolId: lk.toolId(r['tool_code'] || r['tool_raw'] || r['saa_tool']), modelHt: str(r['model_ht'] ?? r['model_/_ht']),
    modelCode: (() => { const c = (r['model_ht'] ?? '').slice(0, 3).toUpperCase(); return lk.models.has(c) ? c : null; })(),
    lotNo: str(r['lot_no'] ?? r['lot_number']), mean: num(r['mean']), sigma: num(r['sigma']), cpk: num(r['cpk']),
  }));
  if (lowCpk.length) {
    await db.insert(schema.lowCpk).values(lowCpk).onConflictDoUpdate({ target: schema.lowCpk.sourceRef, set: { mean: sql`excluded.mean`, sigma: sql`excluded.sigma`, cpk: sql`excluded.cpk` } });
  }
  note('low_cpk', lowCpk.length);

  const circuit = readCsv('circuit_burn.csv').map((r) => ({
    sourceRef: `cb:${r['source_row']}`, seqNo: int(r['seq_no'] ?? r['no']), date: str(r['date']), shift: normalizeShift(r['shift']),
    toolId: lk.toolId(r['tool_code'] || r['tool_raw'] || r['saa_tool']), modelHt: str(r['model_ht']), lotNo: str(r['lot_no'] ?? r['lot_number']),
    brickQty: int(r['brick_qty']), defectQty: int(r['defect_qty']),
  }));
  if (circuit.length) {
    await db.insert(schema.circuitBurn).values(circuit).onConflictDoUpdate({ target: schema.circuitBurn.sourceRef, set: { brickQty: sql`excluded.brick_qty`, defectQty: sql`excluded.defect_qty` } });
  }
  note('circuit_burn', circuit.length);

  const fit = readCsv('fit_ocap.csv').map((r) => ({
    sourceRef: `fit:${r['source_row']}`, seqNo: int(r['seq_no'] ?? r['no']), date: str(r['date']), shift: normalizeShift(r['shift']),
    toolId: lk.toolId(r['tool_code'] || r['tool_raw'] || r['saa_tool']), toolRaw: str(r['tool_raw'] ?? r['saa_tool']), model: str(r['model']),
    fitDetection: str(r['fit_detection']), defectName: str(r['defect_name']), brickQty: int(r['brick_qty']), defectQty: int(r['defect_qty']),
    fitConfirmation: str(r['fit_confirmation']), beforeAction: str(r['before'] ?? r['before_action']), afterAction: str(r['after'] ?? r['after_action']),
    remarks: str(r['remarks']), extra: r['extra'] ? (JSON.parse(r['extra']) as Record<string, unknown>) : null,
  }));
  await batched(fit, 500, async (chunk) => {
    await db.insert(schema.fitOcap).values(chunk).onConflictDoUpdate({ target: schema.fitOcap.sourceRef, set: { defectName: sql`excluded.defect_name`, defectQty: sql`excluded.defect_qty` } });
  });
  note('fit_ocap', fit.length);

  const ooc = readCsv('weekly_ooc.csv').map((r) => ({
    sourceRef: `ooc:${r['source_row']}`, seqNo: int(r['seq_no'] ?? r['no']), ww: int(r['ww']), wwYear: int(r['ww_year']),
    toolId: lk.toolId(r['tool_code'] || r['tool_raw'] || r['tool']), toolRaw: str(r['tool_raw'] ?? r['tool']), model: str(r['model']),
    headType: str(r['head_type']), suspension: str(r['suspension']), issue: str(r['issue']), endorseBy: str(r['endorse_by']),
    endorseTo: str(r['endorse_to']), remarksAfterAction: str(r['remarks_after_action']),
  }));
  await batched(ooc, 500, async (chunk) => {
    await db.insert(schema.weeklyOoc).values(chunk).onConflictDoUpdate({ target: schema.weeklyOoc.sourceRef, set: { issue: sql`excluded.issue`, remarksAfterAction: sql`excluded.remarks_after_action` } });
  });
  note('weekly_ooc', ooc.length);
}

// ---------- 1st meancheck daily grid ----------
async function seedDaily(db: Db) {
  const rows = readCsv('meancheck_daily.csv');
  if (!rows.length) return;
  const lk = await lookups(db);
  let unknownTool = 0;
  const values = rows
    .map((r) => {
      const toolId = lk.toolId(r['tool_code']);
      if (!toolId || !r['date']) {
        unknownTool++;
        return null;
      }
      const cells = Object.fromEntries(MC_DAILY_CELLS.map((k) => [k, cellStatus(r[k.replace(/[A-Z]/g, (m) => `_${m.toLowerCase()}`)])])) as Record<(typeof MC_DAILY_CELLS)[number], McCellStatus | null>;
      return { toolId, date: r['date'], ...cells, overall: computeOverall(cells), sourceRef: str(r['source_ref']) ?? `rev21:${r['tool_code']}:${r['date']}` };
    })
    .filter((v): v is NonNullable<typeof v> => v !== null);
  await batched(values, 1000, async (chunk) => {
    await db
      .insert(schema.meancheckDaily)
      .values(chunk)
      .onConflictDoUpdate({
        target: [schema.meancheckDaily.toolId, schema.meancheckDaily.date],
        set: {
          ...Object.fromEntries(MC_DAILY_CELLS.map((k) => [k, sql.raw(`excluded."${k.replace(/[A-Z]/g, (m) => `_${m.toLowerCase()}`)}"`)])),
          overall: sql`excluded.overall`,
        },
      });
  });
  note('meancheck_daily', values.length);
  if (unknownTool) console.warn(`  meancheck_daily rows skipped (unknown tool/date): ${unknownTool}`);
}

// ---------- sample lots through the real engine ----------
async function seedSampleLots(db: Db) {
  const { readdirSync } = await import('node:fs');
  const lk = await lookups(db);
  const specRows = await db.select().from(schema.models);
  const getSpec = (code: string) => specRows.find((m) => m.code === code.toUpperCase());
  const uploadedBy = lk.userByIdNo.get('9000') ?? lk.userByIdNo.get('1111') ?? null;
  const expectations: Record<string, { verdict: 'passed' | 'failed'; failCount: number }> = {
    passed: { verdict: 'passed', failCount: 0 },
    failed: { verdict: 'failed', failCount: 6 },
  };
  for (const dir of ['passed', 'failed'] as const) {
    const folder = path.join(samplesDir, dir);
    if (!existsSync(folder)) continue;
    const files: InputFile[] = readdirSync(folder)
      .filter((f) => f.toLowerCase().endsWith('.csv'))
      .map((f) => ({ filename: f, text: readFileSync(path.join(folder, f), 'latin1') }));
    const run = runMeancheck(files, getSpec);
    const exp = expectations[dir]!;
    if (run.result.verdict !== exp.verdict || run.result.failCount !== exp.failCount) {
      throw new Error(`sample lot ${run.identity.lotNo}: expected ${exp.verdict} (${exp.failCount} fails) but engine returned ${run.result.verdict} (${run.result.failCount})`);
    }
    await persist(db, run, files, { uploadDir, uploadedBy, replace: true, fillDaily: true });
    console.info(`  meancheck_lots: ${run.identity.lotNo} → ${run.result.verdict} (${run.result.failCount} failing checks)`);
    summary['meancheck_lots'] = (summary['meancheck_lots'] ?? 0) + 1;
  }
}

async function main() {
  console.info(`seeding from ${seedDir}`);
  const pool = createPool();
  const db = createDb(pool);
  try {
    if (RESET) await reset(db);
    const steps: [string, (db: Db) => Promise<void>][] = [
      ['regions', seedRegions],
      ['users', seedUsers],
      ['categories', seedCategories],
      ['models', seedModels],
      ['tools', seedTools],
      ['endorsements', seedEndorsements],
      ['pm_status', seedPmStatus],
      ['contact_chip', seedContactChip],
      ['minor', seedMinor],
      ['daily', seedDaily],
      ['lots', seedSampleLots],
    ];
    for (const [name, fn] of steps) {
      if (!want(name)) continue;
      console.info(`▶ ${name}`);
      await fn(db);
    }
    // keep the sequence counters sane after upserts on serial ids
    for (const t of ['users', 'tools', 'regions', 'endorsements', 'endorsement_categories']) {
      await db.execute(sql.raw(`SELECT setval(pg_get_serial_sequence('${t}', 'id'), COALESCE((SELECT MAX(id) FROM "${t}"), 0) + 1, false)`));
    }
    console.info('done', summary);
  } finally {
    await pool.end();
  }
}

await main().catch((err) => {
  console.error(err);
  process.exit(1);
});

// referenced to keep the import used when ONLY excludes the users step
void eq;
