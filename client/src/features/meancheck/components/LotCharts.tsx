import type { LineChartSeries } from '@mantine/charts';
import { SimpleGrid } from '@mantine/core';
import { useMemo } from 'react';

import { HEAD_DELTA_LIMIT } from '@shared/domain';

import { BeforeAfterScatter, type BeforeAfterPoint } from '@/components/charts/BeforeAfterScatter';
import { LimitLineChart, type LimitLine } from '@/components/charts/LimitLineChart';

import { headRows, type LotView } from '../model';
import classes from './meancheck.module.css';

const satLimits = (mean: number): LimitLine[] => [
  { y: mean + HEAD_DELTA_LIMIT, label: 'SAT mean +0.15', shortLabel: '+0.15', color: 'red.6' },
  { y: mean, label: 'SAT mean', shortLabel: 'SAT mean', color: 'gray.6' },
  { y: mean - HEAD_DELTA_LIMIT, label: 'SAT mean −0.15', shortLabel: '−0.15', color: 'red.6' },
];

const PSA_REM_SAT: LineChartSeries[] = [
  { name: 'psaRemeasure', label: 'Re-Measure', color: 'brand.6' },
  { name: 'psaSat', label: 'SAT', color: 'orange.7' },
];
const RSA_REM_SAT: LineChartSeries[] = [
  { name: 'rsaRemeasure', label: 'Re-Measure', color: 'brand.6' },
  { name: 'rsaSat', label: 'SAT', color: 'orange.7' },
];
const PSA_AFTER_REM: LineChartSeries[] = [
  { name: 'psaAfter', label: 'After Adjust', color: 'violet.7' },
  { name: 'psaRemeasure', label: 'Re-Measure', color: 'brand.6' },
];
const RSA_AFTER_REM: LineChartSeries[] = [
  { name: 'rsaAfter', label: 'After Adjust', color: 'violet.7' },
  { name: 'rsaRemeasure', label: 'Re-Measure', color: 'brand.6' },
];

/**
 * Per-head charts in fixture order (Left 1–10, 21–30 then Right 11–20, 31–40):
 * Re-Measure vs SAT (with SAT mean ±0.15 limits), After Adjust vs Re-Measure, and Before vs After scatter.
 */
export function LotCharts({ view }: { view: LotView }) {
  const rows = useMemo(() => headRows(view), [view]);
  const data = useMemo(
    () =>
      rows.map((r) => ({
        head: `${r.fixture}${r.position}`,
        psaRemeasure: r.psaRemeasure,
        psaSat: r.psaSat,
        rsaRemeasure: r.rsaRemeasure,
        rsaSat: r.rsaSat,
        psaAfter: r.psaAfter,
        rsaAfter: r.rsaAfter,
      })),
    [rows],
  );
  const satPitch = view.stats.overall.pitch.sat.mean;
  const satRoll = view.stats.overall.roll.sat.mean;
  const pitchLimits = useMemo(() => satLimits(satPitch), [satPitch]);
  const rollLimits = useMemo(() => satLimits(satRoll), [satRoll]);
  const pitchTarget = useMemo(() => [{ y: view.spec.pitchTarget, label: 'Target', color: 'gray.6' }], [view.spec.pitchTarget]);
  const rollTarget = useMemo(() => [{ y: view.spec.rollTarget, label: 'Target', color: 'gray.6' }], [view.spec.rollTarget]);

  const scatter = useMemo(() => {
    const pick = (fixture: 'L' | 'R', axis: 'psa' | 'rsa'): BeforeAfterPoint[] =>
      rows
        .filter((r) => r.fixture === fixture)
        .flatMap((r) => {
          const before = axis === 'psa' ? r.psaBefore : r.rsaBefore;
          const after = axis === 'psa' ? r.psaAfter : r.rsaAfter;
          return before === null || after === null ? [] : [{ before, after, position: r.position }];
        });
    return { psaL: pick('L', 'psa'), psaR: pick('R', 'psa'), rsaL: pick('L', 'rsa'), rsaR: pick('R', 'rsa') };
  }, [rows]);

  return (
    <div>
      <div className={classes.blockTitle}>Charts (heads in fixture order)</div>
      <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="md">
        <LimitLineChart
          title="PSA per head — Re-Measure vs SAT"
          data={data}
          dataKey="head"
          series={PSA_REM_SAT}
          limits={pitchLimits}
        />
        <LimitLineChart
          title="RSA per head — Re-Measure vs SAT"
          data={data}
          dataKey="head"
          series={RSA_REM_SAT}
          limits={rollLimits}
        />
        <LimitLineChart
          title="PSA per head — After Adjust vs Re-Measure"
          data={data}
          dataKey="head"
          series={PSA_AFTER_REM}
          limits={pitchTarget}
        />
        <LimitLineChart
          title="RSA per head — After Adjust vs Re-Measure"
          data={data}
          dataKey="head"
          series={RSA_AFTER_REM}
          limits={rollTarget}
        />
        <BeforeAfterScatter title="PSA — Before vs After adjust" left={scatter.psaL} right={scatter.psaR} target={view.spec.pitchTarget} />
        <BeforeAfterScatter title="RSA — Before vs After adjust" left={scatter.rsaL} right={scatter.rsaR} target={view.spec.rollTarget} />
      </SimpleGrid>
    </div>
  );
}
