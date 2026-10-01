import type { McAxis, McGroup } from '../domain.js';
import { HEAD_DELTA_LIMIT, LEFT_POSITIONS, MC_AXES, MC_GROUPS, RIGHT_POSITIONS } from '../domain.js';
import type { AxisStats, CheckResult, GroupStats, HeadDelta, LotResult, ModelSpec, Reading } from './types.js';

export const ENGINE_VERSION = '1.0.0';

export const mean = (xs: readonly number[]): number => xs.reduce((a, b) => a + b, 0) / xs.length;

/** Sample standard deviation (n − 1), matching Excel STDEV. */
export function stdev(xs: readonly number[]): number {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(xs.reduce((a, x) => a + (x - m) ** 2, 0) / (xs.length - 1));
}

const GROUP_POSITIONS: Record<McGroup, readonly number[]> = {
  left: LEFT_POSITIONS,
  right: RIGHT_POSITIONS,
  overall: [...LEFT_POSITIONS, ...RIGHT_POSITIONS],
};

const axisOf = (r: Reading, axis: McAxis, src: 'before' | 'after' | 'remeasure' | 'sat'): number | null => {
  if (axis === 'pitch') {
    return src === 'before' ? r.psaBefore : src === 'after' ? r.psaAfter : src === 'remeasure' ? r.psaRemeasure : r.psaSat;
  }
  return src === 'before' ? r.rsaBefore : src === 'after' ? r.rsaAfter : src === 'remeasure' ? r.rsaRemeasure : r.rsaSat;
};

function statsFor(readings: Reading[], axis: McAxis, src: 'before' | 'after' | 'remeasure' | 'sat'): AxisStats {
  const xs = readings.map((r) => axisOf(r, axis, src)).filter((v): v is number => v !== null);
  return { mean: xs.length ? mean(xs) : Number.NaN, sigma: xs.length ? stdev(xs) : Number.NaN };
}

/**
 * The verified judgment (matches the Excel template `First Mean Check` Summary sheet exactly):
 * for Left / Right / Overall × Pitch / Roll, four checks against the SAT reference.
 */
export function evaluateLot(spec: ModelSpec, readings: Reading[]): LotResult {
  const byPos = new Map(readings.map((r) => [r.position, r]));
  const checks: CheckResult[] = [];
  const stats = {} as LotResult['stats'];
  const headDelta = {} as HeadDelta;

  for (const group of MC_GROUPS) {
    const rows = GROUP_POSITIONS[group].map((p) => byPos.get(p)).filter((r): r is Reading => r !== undefined);
    const gs = {} as GroupStats;
    headDelta[group] = {} as HeadDelta[McGroup];
    for (const axis of MC_AXES) {
      const target = axis === 'pitch' ? spec.pitchTarget : spec.rollTarget;
      const before = statsFor(rows, axis, 'before');
      const after = statsFor(rows, axis, 'after');
      const remeasure = statsFor(rows, axis, 'remeasure');
      const sat = statsFor(rows, axis, 'sat');
      gs[axis] = { before, after, remeasure, sat };

      const deltaSat = remeasure.mean - sat.mean;
      const deltaTarget = sat.mean - target;
      const cpk = Math.min(
        (target + spec.tolerance - sat.mean) / (3 * sat.sigma),
        (sat.mean - (target - spec.tolerance)) / (3 * sat.sigma),
      );
      checks.push(
        { group, axis, check: 'delta_sat', value: deltaSat, limit: spec.deltaSatLimit, passed: Math.abs(deltaSat) <= spec.deltaSatLimit },
        {
          group,
          axis,
          check: 'delta_target',
          value: deltaTarget,
          limit: spec.deltaTargetLimit,
          passed: Math.abs(deltaTarget) <= spec.deltaTargetLimit,
        },
        { group, axis, check: 'sigma', value: sat.sigma, limit: spec.sigmaLimit, passed: Math.abs(sat.sigma) <= spec.sigmaLimit },
        { group, axis, check: 'cpk', value: cpk, limit: spec.cpkMin, passed: cpk >= spec.cpkMin },
      );

      // Informational per-head delta (Re-Measure − SAT), limit ±0.15 — displayed, not part of the verdict.
      const deltas = rows.map((r) => axisOf(r, axis, 'remeasure')! - axisOf(r, axis, 'sat')!);
      const min = Math.min(...deltas);
      const max = Math.max(...deltas);
      headDelta[group][axis] = { min, max, passed: Math.abs(min) <= HEAD_DELTA_LIMIT && Math.abs(max) <= HEAD_DELTA_LIMIT };
    }
    stats[group] = gs;
  }

  stats.leftVsRight = {
    pitch: { mean: stats.left.pitch.sat.mean - stats.right.pitch.sat.mean, sigma: stats.left.pitch.sat.sigma - stats.right.pitch.sat.sigma },
    roll: { mean: stats.left.roll.sat.mean - stats.right.roll.sat.mean, sigma: stats.left.roll.sat.sigma - stats.right.roll.sat.sigma },
  };

  const failCount = checks.filter((c) => !c.passed).length;
  return {
    verdict: failCount === 0 ? 'passed' : 'failed',
    failCount,
    checks,
    headDelta,
    stats,
    perHeadDelta: readings.map((r) => ({
      position: r.position,
      fixture: r.fixture,
      pitch: r.psaRemeasure - r.psaSat,
      roll: r.rsaRemeasure - r.rsaSat,
    })),
  };
}
