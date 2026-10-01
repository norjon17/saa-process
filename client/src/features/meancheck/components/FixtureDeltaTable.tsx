import { memo } from 'react';

import { HEAD_DELTA_LIMIT, MC_GROUPS } from '@shared/domain';

import { PassFailPill } from '@/components/ui/StatusPill';
import { fmtSigned } from '@/lib/format';

import { GROUP_SHORT, type LotView } from '../model';
import classes from './meancheck.module.css';

function Cell({ value, passed }: { value: number; passed: boolean }) {
  return (
    <td className={passed ? classes.pass : classes.fail}>
      <span className={classes.value}>{fmtSigned(value, 4)}</span>
    </td>
  );
}

/** Per-head Re-Measure − SAT extremes per fixture (informational, limit ±0.15). */
export const FixtureDeltaTable = memo(function FixtureDeltaTable({ view }: { view: LotView }) {
  return (
    <div>
      <div className={classes.blockTitle}>Fixture delta (Re-Measure − SAT per head, limit ±{HEAD_DELTA_LIMIT})</div>
      <div className={classes.scroll}>
        <table className={classes.xl}>
          <thead>
            <tr>
              <th className={classes.stick}>Fixture</th>
              <th>Pitch min</th>
              <th>Pitch max</th>
              <th>Pitch</th>
              <th>Roll min</th>
              <th>Roll max</th>
              <th>Roll</th>
            </tr>
          </thead>
          <tbody>
            {MC_GROUPS.map((g) => {
              const p = view.headDelta[g].pitch;
              const r = view.headDelta[g].roll;
              return (
                <tr key={g}>
                  <th className={classes.stick}>{g === 'overall' ? 'Overall' : `${GROUP_SHORT[g]} fixture`}</th>
                  <Cell value={p.min} passed={Math.abs(p.min) <= HEAD_DELTA_LIMIT} />
                  <Cell value={p.max} passed={Math.abs(p.max) <= HEAD_DELTA_LIMIT} />
                  <td>
                    <PassFailPill passed={p.passed} />
                  </td>
                  <Cell value={r.min} passed={Math.abs(r.min) <= HEAD_DELTA_LIMIT} />
                  <Cell value={r.max} passed={Math.abs(r.max) <= HEAD_DELTA_LIMIT} />
                  <td>
                    <PassFailPill passed={r.passed} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
});
