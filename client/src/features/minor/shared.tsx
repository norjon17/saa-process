import { useCallback, useMemo, type ReactNode } from 'react';

import { SHIFTS, type Shift } from '@shared/domain';

import type { AppColumn } from '@/components/table/types';
import type { FieldSpec } from '@/components/ui/CrudTablePage';
import mc from '@/components/ui/mobileCards.module.css';
import { Pill, ShiftPill } from '@/components/ui/StatusPill';
import { useTools } from '@/features/ref/api';
import { fmtPct } from '@/lib/format';
import { shiftDate } from '@/lib/time';
import { SHIFT_COLORS } from '@/theme/colors';

export type SelectOption = { value: string; label: string };

/** Active tools as select options (value = tool id, label = code). */
export function useToolOptions(): SelectOption[] {
  const tools = useTools();
  return useMemo(() => (tools.data ?? []).map((t) => ({ value: String(t.id), label: t.code })), [tools.data]);
}

export const shiftPillOptions = () => SHIFTS.map((s) => ({ value: s, label: s, bg: SHIFT_COLORS[s].gradient, fg: '#fff' }));

/** Inline-editor commit → API patch for the minor tabs (tool select is a string id; blank text → null). */
export function minorToPatch(columnId: string, value: unknown): Record<string, unknown> | null {
  if (columnId === 'toolId') return { toolId: value === null || value === '' ? null : Number(value) };
  if (typeof value === 'string' && value.trim() === '') return { [columnId]: null };
  return { [columnId]: value };
}

type WithTool = { toolId: number | null; toolRaw?: string | null };

export const toolColumn = <T extends WithTool>(options: SelectOption[]): AppColumn<T> => ({
  id: 'toolId',
  header: 'Tool',
  accessor: (r) => r.toolId,
  editor: { kind: 'select', options: () => options, clearable: true },
  exportValue: (r) => options.find((o) => o.value === String(r.toolId))?.label ?? r.toolRaw ?? '',
  width: 110,
  mobile: 'hidden', // in the phone card heading (useMobileTitle)
});

export const dateColumn = <T extends { date: string | null }>(): AppColumn<T> => ({ id: 'date', header: 'Date', accessor: (r) => r.date, editor: { kind: 'date' }, width: 120, mobile: 'hidden' });

export const shiftColumn = <T extends { shift: string | null }>(): AppColumn<T> => ({
  id: 'shift',
  header: 'Shift',
  accessor: (r) => r.shift,
  editor: { kind: 'pill', options: shiftPillOptions },
  width: 70,
  mobile: 'hidden',
});

export const textColumn = <T,>(id: string, header: string, accessor: (r: T) => string | null, width = 120): AppColumn<T> => ({
  id,
  header,
  accessor,
  editor: { kind: 'text' },
  width,
});

export const textareaColumn = <T,>(id: string, header: string, accessor: (r: T) => string | null, width = 220): AppColumn<T> => ({
  id,
  header,
  accessor,
  editor: { kind: 'textarea' },
  align: 'left',
  width,
  mobile: 'full',
});

export const numberColumn = <T,>(id: string, header: string, accessor: (r: T) => number | null, precision = 3, width = 90): AppColumn<T> => ({
  id,
  header,
  accessor,
  editor: { kind: 'number', precision },
  width,
});

/**
 * Phone card heading for the minor tabs: date + shift pill (or work week) + tool code, read-only.
 * The date / shift / tool columns are `mobile: 'hidden'`, so on a phone those identity fields are edited on desktop.
 */
export function useMobileTitle<T extends WithTool & { date?: string | null; shift?: Shift | null; ww?: number | null; wwYear?: number | null }>(options: SelectOption[]): (row: T) => ReactNode {
  const codes = useMemo(() => new Map(options.map((o) => [o.value, o.label])), [options]);
  return useCallback(
    (r: T) => {
      const tool = (r.toolId !== null ? codes.get(String(r.toolId)) : undefined) ?? r.toolRaw ?? null;
      const when = r.ww !== undefined ? (r.ww !== null ? `WW${r.ww}${r.wwYear ? ` · ${r.wwYear}` : ''}` : null) : (r.date ?? null);
      return (
        <span className={mc.title}>
          <span className={when ? mc.titleText : mc.titleMuted}>{when ?? (r.ww !== undefined ? 'No work week' : 'No date')}</span>
          {r.shift && <ShiftPill shift={r.shift} />}
          {tool ? <span className={mc.titleCode}>{tool}</span> : <span className={mc.titleMuted}>No tool</span>}
        </span>
      );
    },
    [codes],
  );
}

/** Read-only defect / brick ratio, shown as a percentage. */
export const defectRateColumn = <T extends { brickQty: number | null; defectQty: number | null }>(): AppColumn<T> => {
  const rate = (r: T) => (r.brickQty && r.defectQty !== null ? r.defectQty / r.brickQty : null);
  return {
    id: 'defectRate',
    header: 'Defect Rate',
    accessor: rate,
    render: (r) => {
      const v = rate(r);
      if (v === null) return <span style={{ color: 'var(--saa-text3)' }}>—</span>;
      return <Pill style={{ background: v > 0.05 ? '#c62828' : v > 0 ? '#e65100' : '#2e7d32', color: '#fff' }}>{fmtPct(v, 2)}</Pill>;
    },
    exportValue: (r) => {
      const v = rate(r);
      return v === null ? '' : fmtPct(v, 2);
    },
    width: 90,
  };
};

/* ---- Create-form field specs shared by the dated tabs ---- */

export const dateField: FieldSpec = { name: 'date', label: 'Date', kind: 'date', required: true, initial: shiftDate() };
export const shiftField: FieldSpec = { name: 'shift', label: 'Shift', kind: 'select', options: SHIFTS.map((s) => ({ value: s, label: s })), required: true, initial: 'DS' };
export const toolField = (options: SelectOption[]): FieldSpec => ({ name: 'toolId', label: 'Tool', kind: 'select', options, numeric: true, required: true, searchable: true });
export const remarksField: FieldSpec = { name: 'remarks', label: 'Remarks', kind: 'textarea' };
