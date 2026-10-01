import type { ReactNode } from 'react';

import { TOOL_TYPES } from '@shared/domain';

import type { AppColumn, CellEditor } from '@/components/table/types';
import { fmtNum } from '@/lib/format';

import type { PmItem, PmPatch } from './api';
import classes from './pm.module.css';

export const DELTA_LIMIT = 25;

/** Two-line header: group on top, sub label below. */
const H = (top: string, sub?: string): ReactNode => (
  <span className={classes.hdr}>
    {top}
    {sub && <span className={classes.hdrSub}>{sub}</span>}
  </span>
);

type NumKey = keyof Pick<
  PmPatch,
  | 'fixVacLWith'
  | 'fixVacLWithout'
  | 'fixVacRWith'
  | 'fixVacRWithout'
  | 'pickVacLWith'
  | 'pickVacLWithout'
  | 'pickVacRWith'
  | 'pickVacRWithout'
  | 'clampLClamp'
  | 'clampLUnclamp'
  | 'clampRClamp'
  | 'clampRUnclamp'
  | 'fixtureSpring'
  | 'speedMotor'
  | 'zOffLPickup'
  | 'zOffLRelease'
  | 'zOffRPickup'
  | 'zOffRRelease'
>;
type BoolKey = 'optGrr' | 'optCorrelation' | 'optLaserRecipe' | 'optAdditionalArea' | 'optScanPatternDir';
type TextKey = 'fixtureLeft' | 'fixtureRight' | 'scanPattern' | 'remarks';

const numberEditor: CellEditor = { kind: 'number', precision: 2 };

const num = (id: NumKey, header: ReactNode, width = 62): AppColumn<PmItem> => ({ id, header, accessor: (r) => r.row?.[id] ?? null, editor: numberEditor, width, exportValue: (r) => r.row?.[id] ?? '' });

const derived = (id: string, header: ReactNode, isDelta = false): AppColumn<PmItem> => ({
  id,
  header,
  accessor: (r) => r.row?.derived[id] ?? null,
  render: (r) => {
    const v = r.row?.derived[id] ?? null;
    if (v === null) return <span className={classes.derivedEmpty}>—</span>;
    const bad = isDelta && Math.abs(v) > DELTA_LIMIT;
    return (
      <span className={`${classes.derived} ${bad ? classes.deltaBad : ''}`} title={bad ? `|Δ| > ${DELTA_LIMIT}` : undefined}>
        {fmtNum(v, 2)}
      </span>
    );
  },
  exportValue: (r) => {
    const v = r.row?.derived[id] ?? null;
    return v === null ? '' : v.toFixed(2);
  },
  width: 58,
});

const bool = (id: BoolKey, header: ReactNode): AppColumn<PmItem> => ({ id, header, accessor: (r) => r.row?.[id] ?? false, editor: { kind: 'checkbox' }, width: 58, exportValue: (r) => (r.row?.[id] ? 'Y' : 'N') });

const text = (id: TextKey, header: ReactNode, width = 70, kind: 'text' | 'textarea' = 'text'): AppColumn<PmItem> => ({
  id,
  header,
  accessor: (r) => r.row?.[id] ?? null,
  editor: { kind },
  width,
  align: kind === 'textarea' ? 'left' : 'center',
});

const vacuumGroup = (side: 'L' | 'R', kind: 'fixVac' | 'pickVac', label: string): AppColumn<PmItem>[] => [
  num(`${kind}${side}With` as NumKey, H(label, 'with HGA')),
  num(`${kind}${side}Without` as NumKey, H(label, 'w/o HGA')),
  derived(`${kind}${side}Avg`, H(label, 'H1 avg')),
  derived(`${kind}${side}Delta`, H(label, 'Delta'), true),
];

export interface PmColumnOptions {
  eeOptions: { value: string; label: string }[];
  onOpen: (item: PmItem) => void;
}

const DELTA_IDS = ['fixVacLDelta', 'fixVacRDelta', 'pickVacLDelta', 'pickVacRDelta'] as const;

/** Number of vacuum deltas over the limit, and how many of the 18 measurements are filled in. */
function pmProgress(r: PmItem): { bad: number; filled: number } {
  const row = r.row;
  if (!row) return { bad: 0, filled: 0 };
  const bad = DELTA_IDS.filter((id) => {
    const v = row.derived[id];
    return v !== null && v !== undefined && Math.abs(v) > DELTA_LIMIT;
  }).length;
  const filled = PM_NUMBER_KEYS.filter((k) => row[k] !== null && row[k] !== undefined).length;
  return { bad, filled };
}

/**
 * Phone cards: tool + area as the heading, the day-to-day fields (type, EE, actual date, remarks) inline-editable,
 * and a summary that opens the full PM form (drawer) for the 18 measurements, flags and fixtures.
 */
export function buildPmMobileColumns(opts: PmColumnOptions): AppColumn<PmItem>[] {
  const all = new Map(buildPmColumns(opts).map((c) => [c.id, c]));
  const pick = (id: string, extra: Partial<AppColumn<PmItem>>): AppColumn<PmItem> => ({ ...all.get(id)!, ...extra });
  return [
    pick('tool', { mobile: 'title' }),
    pick('area', { mobile: 'title', render: (r) => <span className={classes.cardArea}>{r.row?.area ?? r.tool.region ?? '—'}</span> }),
    pick('toolType', { mobileLabel: 'Type' }),
    pick('eeUserId', { mobileLabel: 'EE in charge' }),
    pick('actualDate', { mobileLabel: 'Actual date' }),
    {
      id: 'pmSummary',
      header: 'Measurements',
      accessor: (r) => pmProgress(r).filled,
      sortable: false,
      render: (r) => {
        const { bad, filled } = pmProgress(r);
        return (
          <span className={classes.cardSummary}>
            <span>
              {filled}/{PM_NUMBER_KEYS.length} filled
            </span>
            {bad > 0 && <span className={classes.deltaBad}>{bad} Δ &gt; {DELTA_LIMIT}</span>}
          </span>
        );
      },
    },
    pick('remarks', { mobile: 'full' }),
    {
      id: 'pmOpen',
      header: '',
      mobile: 'full',
      mobileLabel: 'Full PM form',
      accessor: () => null,
      sortable: false,
      render: (r) => (
        <button type="button" className={classes.openForm} onClick={() => opts.onOpen(r)}>
          Vacuum, clamp, offsets, flags, fixtures →
        </button>
      ),
    },
  ];
}

/** The Excel "PM STATUS" sheet layout, left to right. Column ids equal the PmRow field names so commits map 1:1. */
export function buildPmColumns({ eeOptions, onOpen }: PmColumnOptions): AppColumn<PmItem>[] {
  return [
    { id: 'area', header: 'Area', accessor: (r) => r.row?.area ?? r.tool.region ?? '', width: 86, align: 'left' },
    {
      id: 'tool',
      header: 'Tool',
      accessor: (r) => r.tool.code,
      render: (r) => (
        <button type="button" className={classes.toolBtn} onClick={() => onOpen(r)} title="Open PM form">
          {r.tool.code}
        </button>
      ),
      width: 76,
    },
    {
      id: 'toolType',
      header: 'Type',
      accessor: (r) => r.row?.toolType ?? r.tool.toolType ?? null,
      editor: { kind: 'select', options: () => TOOL_TYPES.map((t) => ({ value: t, label: t })), clearable: true },
      width: 88,
    },
    {
      id: 'eeUserId',
      header: H('EE', 'in charge'),
      accessor: (r) => r.row?.eeUserId ?? r.tool.ee?.id ?? null,
      editor: { kind: 'select', options: () => eeOptions, clearable: true },
      exportValue: (r) => r.row?.ee?.name ?? eeOptions.find((o) => o.value === String(r.row?.eeUserId ?? r.tool.ee?.id))?.label ?? r.row?.eeRaw ?? '',
      width: 130,
    },
    { id: 'actualDate', header: H('Actual', 'Date'), accessor: (r) => r.row?.actualDate ?? null, editor: { kind: 'date' }, width: 112 },
    ...vacuumGroup('L', 'fixVac', 'L Fixture Vac'),
    ...vacuumGroup('R', 'fixVac', 'R Fixture Vac'),
    ...vacuumGroup('L', 'pickVac', 'L Picker Vac'),
    ...vacuumGroup('R', 'pickVac', 'R Picker Vac'),
    num('clampLClamp', H('Clamp Spd L', 'Clamp')),
    num('clampLUnclamp', H('Clamp Spd L', 'Unclamp')),
    num('clampRClamp', H('Clamp Spd R', 'Clamp')),
    num('clampRUnclamp', H('Clamp Spd R', 'Unclamp')),
    num('fixtureSpring', H('Fixture', 'Spring')),
    num('speedMotor', H('Speed', 'Motor')),
    num('zOffLPickup', H('Z Offset L', 'Pick up')),
    num('zOffLRelease', H('Z Offset L', 'Release')),
    num('zOffRPickup', H('Z Offset R', 'Pick up')),
    num('zOffRRelease', H('Z Offset R', 'Release')),
    bool('optGrr', H('Optimization', 'GRR')),
    bool('optCorrelation', H('Optimization', 'Correlation')),
    bool('optLaserRecipe', H('Optimization', 'Laser Recipe')),
    bool('optAdditionalArea', H('Optimization', 'Add. Area/Lines')),
    bool('optScanPatternDir', H('Optimization', 'Scan Pat. Dir')),
    text('fixtureLeft', H('Fixture', 'Left')),
    text('fixtureRight', H('Fixture', 'Right')),
    text('scanPattern', H('Scan', 'Pattern')),
    text('remarks', 'Remarks', 220, 'textarea'),
  ];
}

/** Editor commit → PUT body. Column ids are PmRow keys; selects deliver string ids. */
export function pmCellToPatch(columnId: string, value: unknown): PmPatch | null {
  switch (columnId) {
    case 'eeUserId':
      return { eeUserId: value === null || value === '' ? null : Number(value) };
    case 'toolType':
      return { toolType: value === 'SAAT05' || value === 'SAAT07' ? value : null };
    case 'actualDate':
      return { actualDate: typeof value === 'string' && value ? value : null };
    case 'fixtureLeft':
    case 'fixtureRight':
    case 'scanPattern':
    case 'remarks':
      return { [columnId]: typeof value === 'string' && value.trim() !== '' ? value : null };
    case 'optGrr':
    case 'optCorrelation':
    case 'optLaserRecipe':
    case 'optAdditionalArea':
    case 'optScanPatternDir':
      return { [columnId]: !!value };
    default:
      if (columnId in NUMBER_IDS) return { [columnId]: typeof value === 'number' && Number.isFinite(value) ? value : null };
      return null;
  }
}

const NUMBER_IDS: Record<NumKey, true> = {
  fixVacLWith: true,
  fixVacLWithout: true,
  fixVacRWith: true,
  fixVacRWithout: true,
  pickVacLWith: true,
  pickVacLWithout: true,
  pickVacRWith: true,
  pickVacRWithout: true,
  clampLClamp: true,
  clampLUnclamp: true,
  clampRClamp: true,
  clampRUnclamp: true,
  fixtureSpring: true,
  speedMotor: true,
  zOffLPickup: true,
  zOffLRelease: true,
  zOffRPickup: true,
  zOffRRelease: true,
};

export const PM_NUMBER_KEYS = Object.keys(NUMBER_IDS) as NumKey[];
export type { BoolKey as PmBoolKey, NumKey as PmNumKey, TextKey as PmTextKey };
