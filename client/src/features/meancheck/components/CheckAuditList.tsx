import { memo } from 'react';

import { PassFailPill } from '@/components/ui/StatusPill';
import { fmtNum } from '@/lib/format';

import { AXIS_LABEL, CHECK_META, GROUP_SHORT, type LotView } from '../model';
import classes from './meancheck.module.css';

/** Flat audit list of the 24 checks, in engine order (group → axis → check). */
export const CheckAuditList = memo(function CheckAuditList({ view }: { view: LotView }) {
  return (
    <div className={classes.scroll}>
      <table className={classes.xl}>
        <thead>
          <tr>
            <th>#</th>
            <th>Group</th>
            <th>Axis</th>
            <th style={{ textAlign: 'left' }}>Check</th>
            <th>Value</th>
            <th>Limit</th>
            <th>Result</th>
          </tr>
        </thead>
        <tbody>
          {view.checks.map((c, i) => (
            <tr key={`${c.group}-${c.axis}-${c.check}`}>
              <td>{i + 1}</td>
              <td>{GROUP_SHORT[c.group]}</td>
              <td>{AXIS_LABEL[c.axis]}</td>
              <th>{CHECK_META[c.check].label}</th>
              <td className={`${classes.value} ${c.passed ? classes.pass : classes.fail}`}>{fmtNum(c.value, 4)}</td>
              <td className={classes.value}>{CHECK_META[c.check].spec(view.spec)}</td>
              <td>
                <PassFailPill passed={c.passed} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
});
