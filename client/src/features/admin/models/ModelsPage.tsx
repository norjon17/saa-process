import { Button, Switch } from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';
import { useMemo, useState } from 'react';

import { DataTable } from '@/components/table/DataTable';
import type { AppColumn, SortSpec } from '@/components/table/types';
import { FormDrawer, type FieldSpec } from '@/components/ui/CrudTablePage';
import { PageHeader } from '@/components/ui/PageHeader';
import { useModels } from '@/features/ref/api';
import type { AuditEntity, Model } from '@/lib/api/types';
import { notify } from '@/lib/notify';
import { useIsMobile } from '@/lib/useIsMobile';

import { useCreateModel, useUpsertModel, type ModelBody } from '../api';
import { ChangeLogButton } from '../change-logs/ChangeLogButton';
import { activeSwitchColumn, CardTitle } from '../mobileColumns';

const AUDIT_ENTITIES: AuditEntity[] = ['model'];

type NumKey = Exclude<keyof ModelBody, 'isActive'>;
const NUM_FIELDS: { key: NumKey; label: string; precision: number; positive: boolean }[] = [
  { key: 'pitchTarget', label: 'Pitch target', precision: 3, positive: false },
  { key: 'rollTarget', label: 'Roll target', precision: 3, positive: false },
  { key: 'tolerance', label: 'Tolerance', precision: 3, positive: true },
  { key: 'deltaSatLimit', label: 'Δ SAT limit', precision: 3, positive: true },
  { key: 'deltaTargetLimit', label: 'Δ target limit', precision: 3, positive: true },
  { key: 'sigmaLimit', label: 'Sigma limit', precision: 3, positive: true },
  { key: 'cpkMin', label: 'Cpk min', precision: 2, positive: true },
];

const bodyOf = (m: Model): ModelBody => ({
  pitchTarget: m.pitchTarget,
  rollTarget: m.rollTarget,
  tolerance: m.tolerance,
  deltaSatLimit: m.deltaSatLimit,
  deltaTargetLimit: m.deltaTargetLimit,
  sigmaLimit: m.sigmaLimit,
  cpkMin: m.cpkMin,
  isActive: m.isActive,
});

const createFields: FieldSpec[] = [
  { name: 'code', label: 'Model code', kind: 'text', required: true, placeholder: '3 characters, e.g. SEW', transform: (v) => String(v ?? '').toUpperCase(), validate: (v) => (/^[A-Za-z0-9]{3}$/.test(String(v ?? '')) ? null : 'Exactly 3 letters / digits') },
  { name: 'pitchTarget', label: 'Pitch target', kind: 'number', precision: 3, required: true },
  { name: 'rollTarget', label: 'Roll target', kind: 'number', precision: 3, required: true, initial: 0 },
  { name: 'tolerance', label: 'Tolerance', kind: 'number', precision: 3, required: true, initial: 0.4 },
  { name: 'deltaSatLimit', label: 'Δ SAT limit', kind: 'number', precision: 3, required: true, initial: 0.05 },
  { name: 'deltaTargetLimit', label: 'Δ target limit', kind: 'number', precision: 3, required: true, initial: 0.05 },
  { name: 'sigmaLimit', label: 'Sigma limit', kind: 'number', precision: 3, required: true, initial: 0.08 },
  { name: 'cpkMin', label: 'Cpk min', kind: 'number', precision: 2, required: true, initial: 1.33 },
  { name: 'isActive', label: 'Active', kind: 'checkbox', initial: true },
];

export function ModelsPage() {
  const models = useModels();
  const upsert = useUpsertModel();
  const create = useCreateModel();
  const [showInactive, setShowInactive] = useState(false);
  const [sorting, setSorting] = useState<SortSpec[]>([]);
  const [drawer, setDrawer] = useState(false);

  const rows = useMemo(() => (models.data ?? []).filter((m) => showInactive || m.isActive), [models.data, showInactive]);

  const isMobile = useIsMobile();
  const upsertModel = upsert.mutate;
  const columns = useMemo<AppColumn<Model>[]>(
    () => [
      { id: 'code', header: 'Code', accessor: (m) => m.code, render: (m) => (isMobile ? <CardTitle code={m.code} /> : <b>{m.code}</b>), width: 80 },
      ...NUM_FIELDS.map<AppColumn<Model>>((f) => ({ id: f.key, header: f.label, accessor: (m) => m[f.key], editor: { kind: 'number', precision: f.precision }, width: 110 })),
      isMobile
        ? activeSwitchColumn<Model>((m) => m.code, (m, isActive) => upsertModel({ code: m.code, body: { ...bodyOf(m), isActive } }))
        : { id: 'isActive', header: 'Active', accessor: (m) => m.isActive, editor: { kind: 'checkbox' }, width: 70 },
    ],
    [isMobile, upsertModel],
  );

  const onCellCommit = (m: Model, columnId: string, value: unknown) => {
    const body = bodyOf(m);
    if (columnId === 'isActive') body.isActive = !!value;
    else {
      const f = NUM_FIELDS.find((x) => x.key === columnId);
      if (!f) return;
      if (typeof value !== 'number' || !Number.isFinite(value)) {
        notify.error(`${f.label} is required`, 'Not saved');
        return;
      }
      if (f.positive && value <= 0) {
        notify.error(`${f.label} must be greater than 0`, 'Not saved');
        return;
      }
      body[f.key] = value;
    }
    upsert.mutate({ code: m.code, body });
  };

  return (
    <>
      <PageHeader
        title="Model Specs"
        subtitle="Meancheck targets and limits per model code. Existing lots keep the spec snapshot they were judged with."
        actions={
          <>
            <ChangeLogButton module="Model Specs" entities={AUDIT_ENTITIES} />
            <Button size="xs" leftSection={<IconPlus size={14} />} onClick={() => setDrawer(true)}>
              Add model
            </Button>
          </>
        }
        filters={<Switch size={isMobile ? 'sm' : 'xs'} label="Show inactive" checked={showInactive} onChange={(e) => setShowInactive(e.currentTarget.checked)} />}
      />
      <DataTable<Model>
        columns={columns}
        data={rows}
        getRowId={(m) => m.code}
        sorting={sorting}
        onSortingChange={setSorting}
        editable
        onCellCommit={onCellCommit}
        rowProps={(m) => (m.isActive ? undefined : { style: { opacity: 0.55 } })}
        stickyHeader
        minWidth={960}
        loading={models.isFetching}
        emptyMessage="No models"
        footer={<span style={{ fontSize: '0.7rem', color: 'var(--saa-text3)' }}>{rows.length} shown</span>}
      />
      <FormDrawer
        opened={drawer}
        onClose={() => setDrawer(false)}
        title="Add model spec"
        fields={createFields}
        submitLabel="Save model"
        onSubmit={(v) => {
          const { code, ...body } = v as { code: string } & ModelBody;
          if (models.data?.some((m) => m.code === code)) {
            notify.error(`Model ${code} already exists — edit it in the table instead`, 'Not saved');
            throw new Error('exists');
          }
          return create.mutateAsync({ code, body });
        }}
      />
    </>
  );
}
