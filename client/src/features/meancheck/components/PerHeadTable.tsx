import { memo, useMemo, useState } from 'react';

import { HEAD_DELTA_LIMIT } from '@shared/domain';

import { TablePager } from '@/components/table/TablePager';
import { Pill } from '@/components/ui/StatusPill';
import { fmtNum, fmtSigned } from '@/lib/format';

import { headRows, type HeadRow, type LotView } from '../model';
import classes from './meancheck.module.css';

function Delta({ value, ok }: { value: number; ok: boolean }) {
  return (
    <td className={ok ? classes.pass : classes.fail}>
      <span className={classes.value}>{fmtSigned(value, 4)}</span>
    </td>
  );
}

function State({ state }: { state: string | null }) {
  if (!state) return <td>—</td>;
  const up = state.toUpperCase();
  const bg = up === 'PASS' ? '#00c000' : up === 'FAIL' ? '#e53935' : '#e2e8f0';
  const fg = up === 'PASS' ? '#0b3d0b' : up === 'FAIL' ? '#fff' : '#475569';
  return (
    <td>
      <Pill style={{ background: bg, color: fg }}>{up}</Pill>
    </td>
  );
}

const num = (v: number | null) => <td className={classes.value}>{fmtNum(v, 3)}</td>;

/**
 * All 40 heads in fixture order with every reading and the Re-Measure − SAT delta (±0.15).
 * Paged on screen (20 per page by default); every row stays in the DOM so printing shows all heads.
 */
export const PerHeadTable = memo(function PerHeadTable({ view, rows: given }: { view: LotView; rows?: HeadRow[] }) {
  const rows = useMemo(() => given ?? headRows(view), [given, view]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const pages = Math.max(1, Math.ceil(rows.length / pageSize));
  const safePage = Math.min(page, pages);
  const first = (safePage - 1) * pageSize;
  return (
    <div>
      <div className={classes.scroll}>
        <table className={classes.xl}>
          <thead>
            <tr>
              <th rowSpan={2}>#</th>
              <th rowSpan={2}>Pos</th>
              <th rowSpan={2}>Fix</th>
              <th colSpan={2}>Before</th>
              <th colSpan={2}>After</th>
              <th colSpan={2}>Re-Measure</th>
              <th colSpan={2}>SAT</th>
              <th colSpan={2}>Δ ReM − SAT (±{HEAD_DELTA_LIMIT})</th>
              <th rowSpan={2}>State</th>
            </tr>
            <tr>
              <th>PSA</th>
              <th>RSA</th>
              <th>PSA</th>
              <th>RSA</th>
              <th>PSA</th>
              <th>RSA</th>
              <th>PSA</th>
              <th>RSA</th>
              <th>Pitch</th>
              <th>Roll</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.position} className={i < first || i >= first + pageSize ? classes.offPage : undefined}>
                <td>{r.idx}</td>
                <td className={classes.value}>{r.position}</td>
                <td>{r.fixture}</td>
                {num(r.psaBefore)}
                {num(r.rsaBefore)}
                {num(r.psaAfter)}
                {num(r.rsaAfter)}
                {num(r.psaRemeasure)}
                {num(r.rsaRemeasure)}
                {num(r.psaSat)}
                {num(r.rsaSat)}
                <Delta value={r.dPitch} ok={r.dPitchOk} />
                <Delta value={r.dRoll} ok={r.dRollOk} />
                <State state={r.resultState} />
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <TablePager
        page={safePage}
        pageSize={pageSize}
        total={rows.length}
        onPageChange={setPage}
        onPageSizeChange={(n) => {
          setPageSize(n);
          setPage(1);
        }}
        unit="heads"
      />
    </div>
  );
});
