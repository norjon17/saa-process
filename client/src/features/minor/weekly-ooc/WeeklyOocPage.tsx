import { useMemo } from 'react';

import type { AppColumn } from '@/components/table/types';
import { CrudTablePage, type FieldSpec } from '@/components/ui/CrudTablePage';
import type { WeeklyOocRow } from '@/lib/api/types';
import { plantClock } from '@/lib/time';

import { minorApi, minorKeys } from '../api';
import { minorToPatch, numberColumn, textColumn, textareaColumn, toolColumn, toolField, useMobileTitle, useToolOptions } from '../shared';

const crud = minorApi<WeeklyOocRow>('weekly-ooc');

/** ISO work week of a YYYY-MM-DD date. */
function isoWeek(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number) as [number, number, number];
  const date = new Date(Date.UTC(y, m - 1, d));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = Date.UTC(date.getUTCFullYear(), 0, 1);
  return Math.ceil(((date.getTime() - yearStart) / 86_400_000 + 1) / 7);
}

export function WeeklyOocPage() {
  const toolOptions = useToolOptions();
  const mobileTitle = useMobileTitle<WeeklyOocRow>(toolOptions);

  const columns = useMemo<AppColumn<WeeklyOocRow>[]>(
    () => [
      { ...numberColumn<WeeklyOocRow>('ww', 'WW', (r) => r.ww, 0, 60), mobile: 'hidden' },
      { ...numberColumn<WeeklyOocRow>('wwYear', 'Year', (r) => r.wwYear, 0, 70), mobile: 'hidden' },
      toolColumn<WeeklyOocRow>(toolOptions),
      textColumn<WeeklyOocRow>('model', 'Model', (r) => r.model, 80),
      textColumn<WeeklyOocRow>('headType', 'Head Type', (r) => r.headType, 80),
      textColumn<WeeklyOocRow>('suspension', 'Suspension', (r) => r.suspension, 100),
      textareaColumn<WeeklyOocRow>('issue', 'Issue', (r) => r.issue, 300),
      textColumn<WeeklyOocRow>('endorseBy', 'Endorse By', (r) => r.endorseBy, 120),
      textColumn<WeeklyOocRow>('endorseTo', 'Endorse To', (r) => r.endorseTo, 120),
      textareaColumn<WeeklyOocRow>('remarksAfterAction', 'Remarks After Action', (r) => r.remarksAfterAction, 280),
    ],
    [toolOptions],
  );

  const createFields = useMemo<FieldSpec[]>(() => {
    const today = plantClock().date;
    return [
      { name: 'ww', label: 'Work week', kind: 'number', precision: 0, min: 1, max: 53, required: true, initial: isoWeek(today) },
      { name: 'wwYear', label: 'Year', kind: 'number', precision: 0, min: 2000, max: 2100, required: true, initial: Number(today.slice(0, 4)) },
      toolField(toolOptions),
      { name: 'model', label: 'Model', kind: 'text' },
      { name: 'headType', label: 'Head Type', kind: 'select', options: ['UP', 'DN'].map((v) => ({ value: v, label: v })) },
      { name: 'suspension', label: 'Suspension', kind: 'text' },
      { name: 'issue', label: 'Issue', kind: 'textarea', required: true },
      { name: 'endorseBy', label: 'Endorse By', kind: 'text' },
      { name: 'endorseTo', label: 'Endorse To', kind: 'text' },
      { name: 'remarksAfterAction', label: 'Remarks After Action', kind: 'textarea' },
    ];
  }, [toolOptions]);

  return (
    <CrudTablePage<WeeklyOocRow>
      title="Weekly OOC"
      subtitle="Out-of-control issues endorsed per work week"
      queryKey={minorKeys.tab('weekly-ooc')}
      fetch={crud.list}
      columns={columns}
      createFields={createFields}
      createTitle="Add weekly OOC issue"
      onCreate={crud.create}
      onUpdate={crud.update}
      onDelete={crud.remove}
      toPatch={minorToPatch}
      filters={['tool', 'search']}
      toolOptions={toolOptions}
      mobileTitle={mobileTitle}
      exportName="weekly-ooc"
      minWidth={1500}
    />
  );
}
