import { useMemo } from 'react';

import type { AppColumn } from '@/components/table/types';
import { CrudTablePage, type FieldSpec } from '@/components/ui/CrudTablePage';
import type { CircuitBurnRow } from '@/lib/api/types';

import { minorApi, minorKeys } from '../api';
import { dateColumn, dateField, defectRateColumn, minorToPatch, numberColumn, remarksField, shiftColumn, shiftField, textColumn, textareaColumn, toolColumn, toolField, useMobileTitle, useToolOptions } from '../shared';

const crud = minorApi<CircuitBurnRow>('circuit-burn');

export function CircuitBurnPage() {
  const toolOptions = useToolOptions();
  const mobileTitle = useMobileTitle<CircuitBurnRow>(toolOptions);

  const columns = useMemo<AppColumn<CircuitBurnRow>[]>(
    () => [
      dateColumn<CircuitBurnRow>(),
      shiftColumn<CircuitBurnRow>(),
      toolColumn<CircuitBurnRow>(toolOptions),
      textColumn<CircuitBurnRow>('modelHt', 'Model / HT', (r) => r.modelHt, 110),
      textColumn<CircuitBurnRow>('lotNo', 'Lot No', (r) => r.lotNo, 170),
      numberColumn<CircuitBurnRow>('brickQty', 'Brick Qty', (r) => r.brickQty, 0),
      numberColumn<CircuitBurnRow>('defectQty', 'Defect Qty', (r) => r.defectQty, 0),
      defectRateColumn<CircuitBurnRow>(),
      textareaColumn<CircuitBurnRow>('remarks', 'Remarks', (r) => r.remarks, 280),
    ],
    [toolOptions],
  );

  const createFields = useMemo<FieldSpec[]>(
    () => [
      dateField,
      shiftField,
      toolField(toolOptions),
      { name: 'modelHt', label: 'Model / HT', kind: 'text' },
      { name: 'lotNo', label: 'Lot No', kind: 'text', required: true },
      { name: 'brickQty', label: 'Brick Qty', kind: 'number', precision: 0, min: 0 },
      { name: 'defectQty', label: 'Defect Qty', kind: 'number', precision: 0, min: 0 },
      remarksField,
    ],
    [toolOptions],
  );

  return (
    <CrudTablePage<CircuitBurnRow>
      title="Circuit Burn"
      subtitle="Circuit burn defects per lot; defect rate = defect / brick"
      queryKey={minorKeys.tab('circuit-burn')}
      fetch={crud.list}
      columns={columns}
      createFields={createFields}
      createTitle="Add circuit burn record"
      onCreate={crud.create}
      onUpdate={crud.update}
      onDelete={crud.remove}
      toPatch={minorToPatch}
      filters={['date', 'tool', 'search']}
      toolOptions={toolOptions}
      mobileTitle={mobileTitle}
      exportName="circuit-burn"
      minWidth={1200}
    />
  );
}
