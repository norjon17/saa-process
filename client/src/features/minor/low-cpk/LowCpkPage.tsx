import { useMemo } from 'react';

import type { AppColumn } from '@/components/table/types';
import { CrudTablePage, type FieldSpec } from '@/components/ui/CrudTablePage';
import { Pill } from '@/components/ui/StatusPill';
import type { LowCpkRow } from '@/lib/api/types';
import { fmtNum } from '@/lib/format';

import { minorApi, minorKeys } from '../api';
import { dateColumn, dateField, minorToPatch, numberColumn, remarksField, shiftColumn, shiftField, textColumn, textareaColumn, toolColumn, toolField, useMobileTitle, useToolOptions } from '../shared';

const CPK_MIN = 1.33;
const crud = minorApi<LowCpkRow>('low-cpk');

export function LowCpkPage() {
  const toolOptions = useToolOptions();
  const mobileTitle = useMobileTitle<LowCpkRow>(toolOptions);

  const columns = useMemo<AppColumn<LowCpkRow>[]>(
    () => [
      dateColumn<LowCpkRow>(),
      shiftColumn<LowCpkRow>(),
      toolColumn<LowCpkRow>(toolOptions),
      textColumn<LowCpkRow>('modelHt', 'Model / HT', (r) => r.modelHt, 110),
      textColumn<LowCpkRow>('lotNo', 'Lot No', (r) => r.lotNo, 170),
      numberColumn<LowCpkRow>('mean', 'Mean', (r) => r.mean, 3),
      numberColumn<LowCpkRow>('sigma', 'Sigma', (r) => r.sigma, 4),
      numberColumn<LowCpkRow>('cpk', 'Cpk', (r) => r.cpk, 3),
      {
        id: 'cpkStatus',
        header: 'Status',
        accessor: (r) => (r.cpk === null ? null : r.cpk < CPK_MIN ? 'LOW' : 'OK'),
        render: (r) =>
          r.cpk === null ? (
            <span style={{ color: 'var(--saa-text3)' }}>—</span>
          ) : r.cpk < CPK_MIN ? (
            <Pill style={{ background: '#c62828', color: '#fff' }} title={`Cpk ${fmtNum(r.cpk)} < ${CPK_MIN}`}>
              LOW
            </Pill>
          ) : (
            <Pill style={{ background: '#2e7d32', color: '#fff' }}>OK</Pill>
          ),
        width: 70,
      },
      textareaColumn<LowCpkRow>('remarks', 'Remarks', (r) => r.remarks, 260),
    ],
    [toolOptions],
  );

  const createFields = useMemo<FieldSpec[]>(
    () => [
      dateField,
      shiftField,
      toolField(toolOptions),
      { name: 'modelHt', label: 'Model / HT', kind: 'text', placeholder: 'e.g. SEW UP' },
      { name: 'lotNo', label: 'Lot No', kind: 'text', required: true },
      { name: 'mean', label: 'Mean', kind: 'number', precision: 3 },
      { name: 'sigma', label: 'Sigma', kind: 'number', precision: 4 },
      { name: 'cpk', label: 'Cpk', kind: 'number', precision: 3, required: true },
      remarksField,
    ],
    [toolOptions],
  );

  return (
    <CrudTablePage<LowCpkRow>
      title="Low Cpk"
      subtitle={`Lots with Cpk below ${CPK_MIN} and their disposition`}
      queryKey={minorKeys.tab('low-cpk')}
      fetch={crud.list}
      columns={columns}
      createFields={createFields}
      createTitle="Add Low Cpk lot"
      onCreate={crud.create}
      onUpdate={crud.update}
      onDelete={crud.remove}
      toPatch={minorToPatch}
      filters={['date', 'tool', 'search']}
      toolOptions={toolOptions}
      mobileTitle={mobileTitle}
      exportName="low-cpk"
      minWidth={1300}
    />
  );
}
