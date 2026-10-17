import type { SectionKey, Shift } from '@shared/domain';
import { SECTION_KEYS, SECTION_META } from '@shared/domain';

import { RemarkPill } from '@/components/ui/StatusPill';
import type { BoardKpi, Endorsement } from '@/lib/api/types';
import { peopleLabel } from '@/lib/format';
import { formatDateTime, formatLongDate, weekdayOf } from '@/lib/time';
import { BRAND_GRADIENT, HEADER_GRADIENT_LIGHT, SECTIONS, SHIFT_COLORS } from '@/theme/colors';

import { asSectionKey } from '../sections';
import classes from './snapshot.module.css';

export interface SnapshotData {
  date: string;
  shift: Shift;
  items: Endorsement[];
  kpi: Record<SectionKey, BoardKpi>;
  capturedAt: Date;
  capturedBy?: string | null;
}

/** Fixed picture width (px) — wide enough for the board's columns, narrow enough for an email body. */
export const SNAPSHOT_WIDTH = 1100;

export const SHIFT_LABEL: Record<Shift, string> = { DS: 'Day shift · 06:00–17:59', NS: 'Night shift · 18:00–05:59' };

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;
const people = (list: { name: string }[], raw: string | null) => (list.length ? peopleLabel(list) : (raw ?? ''));

export function groupBySection(items: Endorsement[]): Record<SectionKey, Endorsement[]> {
  const m = Object.fromEntries(SECTION_KEYS.map((k) => [k, [] as Endorsement[]])) as Record<SectionKey, Endorsement[]>;
  for (const r of items) m[asSectionKey(r.sectionKey)].push(r);
  return m;
}

export function totalsOf(kpi: Record<SectionKey, BoardKpi>): BoardKpi {
  return SECTION_KEYS.reduce<BoardKpi>(
    (t, k) => ({ total: t.total + kpi[k].total, done: t.done + kpi[k].done, ongoing: t.ongoing + kpi[k].ongoing, open: t.open + kpi[k].open }),
    { total: 0, done: 0, ongoing: 0, open: 0 },
  );
}

/**
 * Read-only, email-sized picture of a whole shift: header, KPI counts and every section's rows (the live board only
 * mounts the active tab). Rendered off-screen by `captureBoardPng`; plain HTML tables, no Mantine components, so it
 * needs no provider and always uses the light palette.
 */
export function BoardSnapshot({ data }: { data: SnapshotData }) {
  const { date, shift, kpi } = data;
  const bySection = groupBySection(data.items);
  const totals = totalsOf(kpi);

  return (
    <div className={classes.root}>
      <div className={classes.header} style={{ background: HEADER_GRADIENT_LIGHT }}>
        <div>
          <h1 className={classes.title}>SAA Process Endorsement — Shift Board</h1>
          <div className={classes.subtitle}>
            {weekdayOf(date)}, {formatLongDate(date)} · {SHIFT_LABEL[shift]}
          </div>
        </div>
        <div className={classes.headerRight}>
          <span className={classes.shiftBadge} style={{ background: SHIFT_COLORS[shift].gradient }}>
            {shift}
          </span>
          <span>Captured {formatDateTime(data.capturedAt)}</span>
        </div>
      </div>
      <div className={classes.strip} style={{ background: BRAND_GRADIENT }} />

      <div className={classes.kpis}>
        <div className={`${classes.kpi} ${classes.kpiTotal}`}>
          <div className={classes.kpiLabel}>All sections</div>
          <div className={classes.kpiValue}>{totals.total}</div>
          <div className={classes.kpiSub}>
            {totals.done} Done · {totals.ongoing} Ongoing
          </div>
        </div>
        {SECTION_KEYS.map((key) => {
          const s = SECTIONS[key];
          const k = kpi[key];
          return (
            <div key={key} className={classes.kpi} style={{ background: s.bgLight, borderTopColor: s.base, color: s.textLight }}>
              <div className={classes.kpiLabel}>{SECTION_META[key].name}</div>
              <div className={classes.kpiValue}>{k.total}</div>
              <div className={classes.kpiSub}>
                {k.done} Done · {k.ongoing} Ongoing
              </div>
            </div>
          );
        })}
      </div>

      {SECTION_KEYS.map((key) => (
        <SnapshotSection key={key} sectionKey={key} rows={bySection[key]} kpi={kpi[key]} />
      ))}

      <div className={classes.footer}>
        <span>SAA Process Endorsement · Shift Board</span>
        <span>{data.capturedBy ? `Captured by ${data.capturedBy}` : ''}</span>
      </div>
    </div>
  );
}

const COLS = [
  { label: '#', width: 32 },
  { label: 'Category', width: 130 },
  { label: 'Tool', width: 82 },
  { label: 'Issue', width: 200 },
  { label: 'Action / Status', width: undefined },
  { label: 'Endorse By', width: 100 },
  { label: 'Endorse To', width: 100 },
  { label: 'Remarks', width: 78 },
] as const;

function SnapshotSection({ sectionKey, rows, kpi }: { sectionKey: SectionKey; rows: Endorsement[]; kpi: BoardKpi }) {
  const s = SECTIONS[sectionKey];
  const meta = SECTION_META[sectionKey];
  return (
    <div className={classes.section} style={{ borderColor: s.base }}>
      <div className={classes.sectionHead} style={{ background: s.bar }}>
        <span>
          <span className={classes.sectionName}>{meta.name}</span>
          <span className={classes.sectionMeta}>{meta.meta}</span>
        </span>
        <span className={classes.sectionCounts}>
          {plural(kpi.total, 'row')} · {kpi.done} done · {kpi.ongoing} ongoing
        </span>
      </div>
      {rows.length === 0 ? (
        <div className={classes.empty}>No rows endorsed for this section.</div>
      ) : (
        <table className={classes.table}>
          <colgroup>
            {COLS.map((c) => (
              <col key={c.label} style={c.width ? { width: c.width } : undefined} />
            ))}
          </colgroup>
          {/* A section holding only NONE rows needs no column headings. */}
          {rows.some((r) => !r.isNone) && (
            <thead>
              <tr style={{ background: s.bgLight, color: s.textLight }}>
                {COLS.map((c) => (
                  <th key={c.label}>{c.label}</th>
                ))}
              </tr>
            </thead>
          )}
          <tbody>
            {rows.map((r, i) =>
              r.isNone ? (
                <tr key={r.id} className={classes.noneRow}>
                  <td className={classes.num}>{i + 1}</td>
                  <td colSpan={COLS.length - 1}>
                    <span className={classes.noneLabel}>NONE</span>
                    {r.issue || r.actionStatus ? [r.issue, r.actionStatus].filter(Boolean).join(' — ') : 'Nothing to endorse for this section.'}
                  </td>
                </tr>
              ) : (
                <tr key={r.id}>
                  <td className={classes.num}>{i + 1}</td>
                  <td>{r.category?.name ?? '—'}</td>
                  <td className={classes.tool}>{r.tool?.code ?? ''}</td>
                  <td>{r.issue}</td>
                  <td>{r.actionStatus}</td>
                  <td className={classes.people}>{people(r.endorseBy, r.endorseByRaw)}</td>
                  <td className={classes.people}>{people(r.endorseTo, r.endorseToRaw)}</td>
                  <td className={classes.remarks}>
                    <RemarkPill progress={r.progress} />
                  </td>
                </tr>
              ),
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
