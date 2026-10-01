import { Fragment, memo } from 'react';

import { MC_CHECKS, MC_GROUPS } from '@shared/domain';
import type { CheckResult } from '@shared/meancheck/types';

import { PassFailPill } from '@/components/ui/StatusPill';
import { fmtNum } from '@/lib/format';

import { CHECK_META, findCheck, GROUP_LABEL, type LotView } from '../model';
import classes from './meancheck.module.css';

function ValueCell({ check }: { check: CheckResult | undefined }) {
  if (!check) return <td>—</td>;
  return (
    <td className={check.passed ? classes.pass : classes.fail}>
      <span className={classes.value}>{fmtNum(check.value, 4)}</span>
      <span className={classes.phoneMark} aria-label={check.passed ? 'passed' : 'failed'}>
        {check.passed ? '✓' : '✗'}
      </span>
    </td>
  );
}

function ResultCell({ check }: { check: CheckResult | undefined }) {
  return <td className={classes.phoneHide}>{check ? <PassFailPill passed={check.passed} /> : '—'}</td>;
}

/** The 24 verdict checks laid out like the Excel "Monitored Items" block. */
export const MonitoredItemsTable = memo(function MonitoredItemsTable({ view }: { view: LotView }) {
  return (
    <div>
      <div className={classes.blockTitle}>Monitored items (24 checks)</div>
      <div className={classes.scroll}>
        <table className={classes.xl}>
          <thead>
            <tr>
              <th className={classes.stick} style={{ textAlign: 'left' }}>
                Item
              </th>
              <th>Specs</th>
              <th>Pitch</th>
              <th className={classes.phoneHide}>Pitch result</th>
              <th>Roll</th>
              <th className={classes.phoneHide}>Roll result</th>
            </tr>
          </thead>
          <tbody>
            {MC_CHECKS.map((check) => {
              const meta = CHECK_META[check];
              return (
                <Fragment key={check}>
                  <tr className={classes.groupHead}>
                    <td colSpan={6}>{meta.label}</td>
                  </tr>
                  {MC_GROUPS.map((group) => {
                    const pitch = findCheck(view.checks, group, 'pitch', check);
                    const roll = findCheck(view.checks, group, 'roll', check);
                    return (
                      <tr key={group}>
                        <th className={classes.stick}>{GROUP_LABEL[group]}</th>
                        <td className={classes.value}>{meta.spec(view.spec)}</td>
                        <ValueCell check={pitch} />
                        <ResultCell check={pitch} />
                        <ValueCell check={roll} />
                        <ResultCell check={roll} />
                      </tr>
                    );
                  })}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
});
