import { Fragment, memo } from 'react';

import { MC_AXES, MC_GROUPS } from '@shared/domain';

import { fmtNum, fmtSigned } from '@/lib/format';

import { AXIS_CODE, GROUP_SHORT, type LotView } from '../model';
import classes from './meancheck.module.css';

const STAGES = [
  { key: 'before', label: 'SAA Before' },
  { key: 'after', label: 'SAA After' },
  { key: 'remeasure', label: 'Re-Measure' },
  { key: 'sat', label: 'SAT' },
] as const;

const STATS = [
  { key: 'mean', label: 'Mean' },
  { key: 'sigma', label: 'Sigma' },
] as const;

/** Mean / Sigma × Left / Right / Overall × stage × PSA / RSA, plus Left vs Right. */
export const MeansSigmaTable = memo(function MeansSigmaTable({ view }: { view: LotView }) {
  const lvr = view.stats.leftVsRight;
  return (
    <div>
      <div className={classes.blockTitle}>Means &amp; sigma</div>
      <div className={classes.scroll}>
        <table className={classes.xl}>
          <thead>
            <tr>
              <th rowSpan={2} style={{ textAlign: 'left' }}>
                Statistic
              </th>
              <th rowSpan={2}>Fixture</th>
              {STAGES.map((s) => (
                <th key={s.key} colSpan={2}>
                  {s.label}
                </th>
              ))}
            </tr>
            <tr>
              {STAGES.map((s) => (
                <Fragment key={s.key}>
                  <th>PSA</th>
                  <th>RSA</th>
                </Fragment>
              ))}
            </tr>
          </thead>
          <tbody>
            {STATS.map((stat) =>
              MC_GROUPS.map((group, gi) => (
                <tr key={`${stat.key}-${group}`}>
                  {gi === 0 && <th rowSpan={MC_GROUPS.length}>{stat.label}</th>}
                  <th>{GROUP_SHORT[group]}</th>
                  {STAGES.map((s) => (
                    <Fragment key={s.key}>
                      {MC_AXES.map((axis) => (
                        <td key={axis} className={classes.value}>
                          {fmtNum(view.stats[group][axis][s.key][stat.key], 4)}
                        </td>
                      ))}
                    </Fragment>
                  ))}
                </tr>
              )),
            )}
            <tr className={classes.groupHead}>
              <td colSpan={2 + STAGES.length * 2}>Left vs Right (SAT means)</td>
            </tr>
            <tr>
              <th colSpan={2}>Δ mean (L − R)</th>
              {MC_AXES.map((axis) => (
                <td key={axis} className={classes.value} colSpan={STAGES.length}>
                  {AXIS_CODE[axis]} {fmtSigned(lvr[axis].mean, 4)}
                </td>
              ))}
            </tr>
            <tr>
              <th colSpan={2}>Δ sigma (L − R)</th>
              {MC_AXES.map((axis) => (
                <td key={axis} className={classes.value} colSpan={STAGES.length}>
                  {AXIS_CODE[axis]} {fmtSigned(lvr[axis].sigma, 4)}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
});
