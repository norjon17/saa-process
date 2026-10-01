import { Button, Switch } from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';
import { useMemo, useState } from 'react';

import { TOOL_CODE_RE, TOOL_TYPES } from '@shared/domain';

import { DataTable } from '@/components/table/DataTable';
import type { AppColumn, SortSpec } from '@/components/table/types';
import { FormDrawer, type FieldSpec } from '@/components/ui/CrudTablePage';
import { PageHeader } from '@/components/ui/PageHeader';
import { useRegions, useTools, useUsers } from '@/features/ref/api';
import type { AuditEntity, Tool } from '@/lib/api/types';
import { notify } from '@/lib/notify';
import { useIsMobile } from '@/lib/useIsMobile';

import { useCreateTool, usePatchTool, type ToolBody } from '../api';
import { ChangeLogButton } from '../change-logs/ChangeLogButton';
import { activeSwitchColumn, CardTitle } from '../mobileColumns';

const AUDIT_ENTITIES: AuditEntity[] = ['tool', 'region'];

const normalizeCode = (raw: string) => {
  const m = raw.toUpperCase().replace(/\s+/g, '').match(/^SAA0*(\d{1,2})H?$/);
  return m ? `SAA${m[1]!.padStart(2, '0')}H` : raw.toUpperCase().trim();
};

export function ToolsPage() {
  const tools = useTools(true);
  const regions = useRegions();
  const users = useUsers();
  const patch = usePatchTool();
  const create = useCreateTool();
  const [showInactive, setShowInactive] = useState(false);
  const [sorting, setSorting] = useState<SortSpec[]>([]);
  const [drawer, setDrawer] = useState(false);

  const regionOptions = useMemo(() => (regions.data ?? []).map((r) => ({ value: String(r.id), label: r.name })), [regions.data]);
  const eeOptions = useMemo(() => (users.data ?? []).filter((u) => u.role === 'ee').map((u) => ({ value: String(u.id), label: u.name })), [users.data]);
  const typeOptions = useMemo(() => TOOL_TYPES.map((t) => ({ value: t, label: t })), []);
  const rows = useMemo(() => (tools.data ?? []).filter((t) => showInactive || t.isActive), [tools.data, showInactive]);

  const isMobile = useIsMobile();
  const patchTool = patch.mutate;
  const columns = useMemo<AppColumn<Tool>[]>(() => {
    const region: AppColumn<Tool> = { id: 'regionId', header: 'Region', accessor: (t) => t.regionId, editor: { kind: 'select', options: () => regionOptions, clearable: true }, exportValue: (t) => t.region?.name ?? '', width: 140 };
    const type: AppColumn<Tool> = { id: 'toolType', header: 'Type', accessor: (t) => t.toolType, editor: { kind: 'select', options: () => typeOptions, clearable: true }, width: 100 };
    const ee: AppColumn<Tool> = { id: 'eeUserId', header: 'EE in charge', accessor: (t) => t.eeUserId, editor: { kind: 'select', options: () => eeOptions, clearable: true }, exportValue: (t) => t.ee?.name ?? '', width: 170 };
    const notes: AppColumn<Tool> = { id: 'notes', header: 'Notes', accessor: (t) => t.notes, editor: { kind: 'textarea' }, align: 'left', width: 300, mobile: 'full' };
    if (isMobile) {
      // Phone cards: read-only code heading (renaming a tool is a desktop edit), touch-sized Active switch.
      return [
        { id: 'code', header: 'Code', accessor: (t) => t.code, mobile: 'title', render: (t) => <CardTitle code={t.code} /> },
        region,
        type,
        ee,
        activeSwitchColumn<Tool>((t) => t.code, (t, isActive) => patchTool({ id: t.id, patch: { isActive } })),
        notes,
      ];
    }
    return [
      { id: 'code', header: 'Code', accessor: (t) => t.code, editor: { kind: 'text' }, width: 90 },
      region,
      type,
      ee,
      { id: 'isActive', header: 'Active', accessor: (t) => t.isActive, editor: { kind: 'checkbox' }, width: 70 },
      notes,
    ];
  }, [isMobile, patchTool, regionOptions, eeOptions, typeOptions]);

  const onCellCommit = (t: Tool, columnId: string, value: unknown) => {
    switch (columnId) {
      case 'code': {
        const code = normalizeCode(String(value ?? ''));
        if (!TOOL_CODE_RE.test(code)) {
          notify.error('Tool code must look like SAA05H', 'Not saved');
          return;
        }
        patch.mutate({ id: t.id, patch: { code } });
        return;
      }
      case 'regionId':
        patch.mutate({ id: t.id, patch: { regionId: value ? Number(value) : null } });
        return;
      case 'eeUserId':
        patch.mutate({ id: t.id, patch: { eeUserId: value ? Number(value) : null } });
        return;
      case 'toolType':
        patch.mutate({ id: t.id, patch: { toolType: value === 'SAAT05' || value === 'SAAT07' ? value : null } });
        return;
      case 'isActive':
        patch.mutate({ id: t.id, patch: { isActive: !!value } });
        return;
      case 'notes':
        patch.mutate({ id: t.id, patch: { notes: typeof value === 'string' && value.trim() ? value : null } });
        return;
    }
  };

  const createFields = useMemo<FieldSpec[]>(
    () => [
      { name: 'code', label: 'Tool code', kind: 'text', required: true, placeholder: 'SAA05H', transform: (v) => normalizeCode(String(v ?? '')), validate: (v) => (TOOL_CODE_RE.test(normalizeCode(String(v ?? ''))) ? null : 'Expected SAAnnH, e.g. SAA05H') },
      { name: 'regionId', label: 'Region', kind: 'select', options: regionOptions, numeric: true },
      { name: 'toolType', label: 'Type', kind: 'select', options: typeOptions },
      { name: 'eeUserId', label: 'EE in charge', kind: 'select', options: eeOptions, numeric: true, searchable: true },
      { name: 'isActive', label: 'Active', kind: 'checkbox', initial: true },
      { name: 'notes', label: 'Notes', kind: 'textarea' },
    ],
    [regionOptions, typeOptions, eeOptions],
  );

  return (
    <>
      <PageHeader
        title="Tools"
        subtitle="SAA tools, their area, type and the EE in charge. Inactive tools disappear from the grids but keep their history."
        actions={
          <>
            <ChangeLogButton module="Tools" entities={AUDIT_ENTITIES} />
            <Button size="xs" leftSection={<IconPlus size={14} />} onClick={() => setDrawer(true)}>
              Add tool
            </Button>
          </>
        }
        filters={<Switch size={isMobile ? 'sm' : 'xs'} label="Show inactive" checked={showInactive} onChange={(e) => setShowInactive(e.currentTarget.checked)} />}
      />
      <DataTable<Tool>
        columns={columns}
        data={rows}
        getRowId={(t) => String(t.id)}
        sorting={sorting}
        onSortingChange={setSorting}
        editable
        onCellCommit={onCellCommit}
        rowProps={(t) => (t.isActive ? undefined : { style: { opacity: 0.55 } })}
        stickyHeader
        minWidth={900}
        loading={tools.isFetching}
        emptyMessage="No tools"
        footer={<span style={{ fontSize: '0.7rem', color: 'var(--saa-text3)' }}>{rows.length} shown</span>}
      />
      <FormDrawer opened={drawer} onClose={() => setDrawer(false)} title="Add tool" fields={createFields} submitLabel="Add tool" onSubmit={(v) => create.mutateAsync(v as ToolBody)} />
    </>
  );
}
