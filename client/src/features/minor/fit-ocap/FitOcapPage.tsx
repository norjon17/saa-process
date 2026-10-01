import { useMemo } from 'react';

import type { AppColumn } from '@/components/table/types';
import { CrudTablePage, type FieldSpec } from '@/components/ui/CrudTablePage';
import type { FitOcapRow } from '@/lib/api/types';
import { useIsMobile } from '@/lib/useIsMobile';

import { minorApi, minorKeys } from '../api';
import { dateColumn, dateField, defectRateColumn, minorToPatch, numberColumn, remarksField, shiftColumn, shiftField, textColumn, textareaColumn, toolColumn, toolField, useMobileTitle, useToolOptions } from '../shared';

const crud = minorApi<FitOcapRow>('fit-ocap');

export function FitOcapPage() {
  const toolOptions = useToolOptions();
  const mobileTitle = useMobileTitle<FitOcapRow>(toolOptions);

  const isMobile = useIsMobile();
  const columns = useMemo<AppColumn<FitOcapRow>[]>(() => {
    const defectName = textColumn<FitOcapRow>('defectName', 'Defect Name', (r) => r.defectName, 110);
    return [
      dateColumn<FitOcapRow>(),
      shiftColumn<FitOcapRow>(),
      toolColumn<FitOcapRow>(toolOptions),
      textColumn<FitOcapRow>('model', 'Model', (r) => r.model, 80),
      // Phones: Model + Defect Name pair up, the long detection lot gets its own row.
      ...(isMobile ? [defectName] : []),
      { ...textColumn<FitOcapRow>('fitDetection', 'FIT Detection', (r) => r.fitDetection, 190), mobile: 'full' },
      ...(isMobile ? [] : [defectName]),
      numberColumn<FitOcapRow>('brickQty', 'Brick Qty', (r) => r.brickQty, 0, 80),
      numberColumn<FitOcapRow>('defectQty', 'Defect Qty', (r) => r.defectQty, 0, 80),
      defectRateColumn<FitOcapRow>(),
      textareaColumn<FitOcapRow>('fitConfirmation', 'FIT Confirmation', (r) => r.fitConfirmation, 280),
      textColumn<FitOcapRow>('beforeAction', 'Before', (r) => r.beforeAction, 90),
      textColumn<FitOcapRow>('afterAction', 'After', (r) => r.afterAction, 90),
      textareaColumn<FitOcapRow>('remarks', 'Remarks', (r) => r.remarks, 200),
    ];
  }, [toolOptions, isMobile]);

  const createFields = useMemo<FieldSpec[]>(
    () => [
      dateField,
      shiftField,
      toolField(toolOptions),
      { name: 'model', label: 'Model', kind: 'text', placeholder: 'e.g. SEW' },
      { name: 'fitDetection', label: 'FIT Detection', kind: 'text', description: 'Lot / detection reference' },
      { name: 'defectName', label: 'Defect Name', kind: 'text', required: true },
      { name: 'brickQty', label: 'Brick Qty', kind: 'number', precision: 0, min: 0 },
      { name: 'defectQty', label: 'Defect Qty', kind: 'number', precision: 0, min: 0 },
      { name: 'fitConfirmation', label: 'FIT Confirmation', kind: 'textarea' },
      { name: 'beforeAction', label: 'Before', kind: 'text' },
      { name: 'afterAction', label: 'After', kind: 'text' },
      remarksField,
    ],
    [toolOptions],
  );

  return (
    <CrudTablePage<FitOcapRow>
      title="FIT OCAP"
      subtitle="FIT detections, confirmation lots and before / after actions"
      queryKey={minorKeys.tab('fit-ocap')}
      fetch={crud.list}
      columns={columns}
      createFields={createFields}
      createTitle="Add FIT OCAP record"
      onCreate={crud.create}
      onUpdate={crud.update}
      onDelete={crud.remove}
      toPatch={minorToPatch}
      filters={['date', 'tool', 'search']}
      toolOptions={toolOptions}
      mobileTitle={mobileTitle}
      exportName="fit-ocap"
      minWidth={1750}
    />
  );
}
