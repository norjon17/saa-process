import type { Fixture, HeadType, McAxis, McCheck, McGroup, McVerdict, Shift } from '@shared/domain';
import { HEAD_DELTA_LIMIT, LEFT_POSITIONS, MC_AXES, MC_CHECKS, MC_GROUPS, RIGHT_POSITIONS } from '@shared/domain';
import type { CheckResult, HeadDelta, LotResult, ModelSpec, Reading } from '@shared/meancheck/types';

import type { EvaluateResponse, LotDetail } from '@/lib/api/types';

/** One view-model for both a persisted lot and a dry-run evaluation. */
export interface LotView {
  id: number | null;
  lotNo: string;
  programLotName: string | null;
  toolCode: string;
  region: string | null;
  satTester: string | null;
  modelCode: string;
  headType: HeadType | null;
  suspension: string | null;
  mcDate: string;
  shift: Shift | null;
  operatorId: string | null;
  verdict: McVerdict;
  failCount: number;
  checks: CheckResult[];
  headDelta: HeadDelta;
  stats: LotResult['stats'];
  readings: Reading[];
  spec: ModelSpec;
  warnings: string[];
  /** Original file names (keys of `files.stored` for a persisted lot). */
  fileNames: string[];
  engineVersion: string;
  createdAt: string | null;
}

export const isLotDetail = (src: LotDetail | EvaluateResponse): src is LotDetail => 'id' in src && typeof (src as LotDetail).id === 'number';

export function toLotView(src: LotDetail | EvaluateResponse): LotView {
  if (isLotDetail(src)) {
    return {
      id: src.id,
      lotNo: src.lotNo,
      programLotName: src.programLotName,
      toolCode: src.tool.code,
      region: src.tool.region?.name ?? null,
      satTester: src.satTester,
      modelCode: src.modelCode,
      headType: src.headType,
      suspension: src.suspension,
      mcDate: src.mcDate,
      shift: src.shift,
      operatorId: src.operatorId,
      verdict: src.verdict,
      failCount: src.failCount,
      checks: src.checks,
      headDelta: src.headDelta,
      stats: src.stats,
      readings: src.readings,
      spec: src.specSnapshot,
      warnings: src.files?.warnings ?? [],
      fileNames: Object.keys(src.files?.stored ?? {}),
      engineVersion: src.engineVersion,
      createdAt: src.createdAt,
    };
  }
  return {
    id: null,
    lotNo: src.identity.lotNo,
    programLotName: src.identity.programLotName,
    toolCode: src.identity.toolCode,
    region: null,
    satTester: src.identity.satTester,
    modelCode: src.identity.modelCode,
    headType: src.identity.headType,
    suspension: src.identity.suspension,
    mcDate: src.identity.mcDate,
    shift: src.identity.shift,
    operatorId: src.identity.operatorId,
    verdict: src.result.verdict,
    failCount: src.result.failCount,
    checks: src.result.checks,
    headDelta: src.result.headDelta,
    stats: src.result.stats,
    readings: src.readings,
    spec: src.spec,
    warnings: src.warnings,
    fileNames: src.files,
    engineVersion: src.engineVersion,
    createdAt: null,
  };
}

export const TOTAL_CHECKS = MC_GROUPS.length * MC_AXES.length * MC_CHECKS.length;

export const GROUP_LABEL: Record<McGroup, string> = { left: 'SAA Left Fixture', right: 'SAA Right Fixture', overall: 'Over-all' };
export const GROUP_SHORT: Record<McGroup, string> = { left: 'Left', right: 'Right', overall: 'Overall' };
export const AXIS_LABEL: Record<McAxis, string> = { pitch: 'Pitch', roll: 'Roll' };
export const AXIS_CODE: Record<McAxis, 'PSA' | 'RSA'> = { pitch: 'PSA', roll: 'RSA' };

export const CHECK_META: Record<McCheck, { label: string; short: string; spec: (s: ModelSpec) => string }> = {
  delta_sat: { label: 'Measurement delta with respect to SAT', short: 'Δ vs SAT', spec: (s) => `≤ ±${s.deltaSatLimit}` },
  delta_target: { label: 'Measurement delta with respect to Target', short: 'Δ vs Target', spec: (s) => `≤ ±${s.deltaTargetLimit}` },
  sigma: { label: 'Sigma', short: 'Sigma', spec: (s) => `≤ ${s.sigmaLimit}` },
  cpk: { label: 'Cpk', short: 'Cpk', spec: (s) => `≥ ${s.cpkMin}` },
};

export const findCheck = (checks: CheckResult[], group: McGroup, axis: McAxis, check: McCheck) =>
  checks.find((c) => c.group === group && c.axis === axis && c.check === check);

/** Readings in fixture order: Left 1–10, 21–30 then Right 11–20, 31–40. */
export function fixtureOrder(readings: Reading[]): Reading[] {
  const byPos = new Map(readings.map((r) => [r.position, r]));
  const ordered: Reading[] = [];
  for (const p of [...LEFT_POSITIONS, ...RIGHT_POSITIONS]) {
    const r = byPos.get(p);
    if (r) ordered.push(r);
  }
  // Anything with an unexpected position goes last, so nothing silently disappears.
  for (const r of readings) if (!ordered.includes(r)) ordered.push(r);
  return ordered;
}

export interface HeadRow {
  idx: number;
  position: number;
  fixture: Fixture;
  psaBefore: number | null;
  rsaBefore: number | null;
  psaAfter: number | null;
  rsaAfter: number | null;
  psaRemeasure: number;
  rsaRemeasure: number;
  psaSat: number;
  rsaSat: number;
  dPitch: number;
  dRoll: number;
  dPitchOk: boolean;
  dRollOk: boolean;
  resultState: string | null;
}

export function headRows(view: LotView): HeadRow[] {
  return fixtureOrder(view.readings).map((r, i) => {
    const dPitch = r.psaRemeasure - r.psaSat;
    const dRoll = r.rsaRemeasure - r.rsaSat;
    return {
      idx: i + 1,
      position: r.position,
      fixture: r.fixture,
      psaBefore: r.psaBefore,
      rsaBefore: r.rsaBefore,
      psaAfter: r.psaAfter,
      rsaAfter: r.rsaAfter,
      psaRemeasure: r.psaRemeasure,
      rsaRemeasure: r.rsaRemeasure,
      psaSat: r.psaSat,
      rsaSat: r.rsaSat,
      dPitch,
      dRoll,
      dPitchOk: Math.abs(dPitch) <= HEAD_DELTA_LIMIT,
      dRollOk: Math.abs(dRoll) <= HEAD_DELTA_LIMIT,
      resultState: r.resultState,
    };
  });
}

export const HEAD_CSV_HEADERS = ['#', 'Position', 'Fixture', 'PSA Before', 'RSA Before', 'PSA After', 'RSA After', 'PSA Re-Measure', 'RSA Re-Measure', 'PSA SAT', 'RSA SAT', 'Δ Pitch (ReM−SAT)', 'Δ Roll (ReM−SAT)', 'Result'];

export const headCsvRows = (rows: HeadRow[]) =>
  rows.map((r) => [r.idx, r.position, r.fixture, r.psaBefore, r.rsaBefore, r.psaAfter, r.rsaAfter, r.psaRemeasure, r.rsaRemeasure, r.psaSat, r.rsaSat, r.dPitch.toFixed(4), r.dRoll.toFixed(4), r.resultState]);

export const lotFileUrl = (lotId: number, name: string) => `/api/meancheck/lots/${lotId}/files/${encodeURIComponent(name)}`;
