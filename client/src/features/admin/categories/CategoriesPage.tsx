import { Button, Switch } from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';
import { useMemo, useState } from 'react';

import { SECTION_KEYS, SECTION_META, type SectionKey } from '@shared/domain';

import { DataTable } from '@/components/table/DataTable';
import type { AppColumn, SortSpec } from '@/components/table/types';
import { FormDrawer, type FieldSpec } from '@/components/ui/CrudTablePage';
import { PageHeader } from '@/components/ui/PageHeader';
import { useCategories } from '@/features/ref/api';
import type { AuditEntity, Category } from '@/lib/api/types';
import { notify } from '@/lib/notify';
import { useIsMobile } from '@/lib/useIsMobile';
import { SECTIONS } from '@/theme/colors';

import { useCreateCategory, usePatchCategory, type CategoryBody } from '../api';
import { ChangeLogButton } from '../change-logs/ChangeLogButton';
import { activeSwitchColumn, CardTitle } from '../mobileColumns';

const AUDIT_ENTITIES: AuditEntity[] = ['category'];

const isSectionKey = (v: unknown): v is SectionKey => typeof v === 'string' && (SECTION_KEYS as readonly string[]).includes(v);

/** Pill editor: the section colour is the swatch, the label is the board section name. */
const sectionPillOptions = () => SECTION_KEYS.map((k) => ({ value: k, label: SECTION_META[k].name, bg: SECTIONS[k].bar, fg: '#fff' }));

const createFields: FieldSpec[] = [
  { name: 'name', label: 'Category name', kind: 'text', required: true },
  { name: 'sectionKey', label: 'Board section', kind: 'select', options: SECTION_KEYS.map((k) => ({ value: k, label: `${SECTION_META[k].name} — ${SECTION_META[k].meta}` })), required: true, initial: 's6' },
  { name: 'sortOrder', label: 'Sort order', kind: 'number', precision: 0, initial: 0 },
  { name: 'isActive', label: 'Active', kind: 'checkbox', initial: true },
];

export function CategoriesPage() {
  const categories = useCategories();
  const patch = usePatchCategory();
  const create = useCreateCategory();
  const [showInactive, setShowInactive] = useState(false);
  const [sorting, setSorting] = useState<SortSpec[]>([{ id: 'sortOrder', desc: false }]);
  const [drawer, setDrawer] = useState(false);

  const rows = useMemo(() => (categories.data ?? []).filter((c) => showInactive || c.isActive), [categories.data, showInactive]);

  const isMobile = useIsMobile();
  const patchCategory = patch.mutate;
  const columns = useMemo<AppColumn<Category>[]>(
    () => [
      isMobile
        ? // Phone cards: read-only name heading (renaming is a desktop edit).
          { id: 'name', header: 'Name', accessor: (c) => c.name, mobile: 'title', render: (c) => <CardTitle text={c.name} /> }
        : { id: 'name', header: 'Name', accessor: (c) => c.name, editor: { kind: 'text' }, align: 'left', width: 260 },
      // Phones: section pill full width, sort order + active share the next row.
      { id: 'sectionKey', header: 'Section', accessor: (c) => c.sectionKey, editor: { kind: 'pill', options: sectionPillOptions }, exportValue: (c) => SECTION_META[c.sectionKey]?.name ?? c.sectionKey, width: 170, mobile: 'full' },
      { id: 'sortOrder', header: 'Sort order', accessor: (c) => c.sortOrder, editor: { kind: 'number', precision: 0 }, width: 90 },
      isMobile
        ? activeSwitchColumn<Category>((c) => c.name, (c, isActive) => patchCategory({ id: c.id, patch: { isActive } }))
        : { id: 'isActive', header: 'Active', accessor: (c) => c.isActive, editor: { kind: 'checkbox' }, width: 70 },
    ],
    [isMobile, patchCategory],
  );

  const onCellCommit = (c: Category, columnId: string, value: unknown) => {
    switch (columnId) {
      case 'name': {
        const name = String(value ?? '').trim();
        if (!name) {
          notify.error('Name is required', 'Not saved');
          return;
        }
        patch.mutate({ id: c.id, patch: { name } });
        return;
      }
      case 'sectionKey':
        if (isSectionKey(value)) patch.mutate({ id: c.id, patch: { sectionKey: value } });
        return;
      case 'sortOrder':
        patch.mutate({ id: c.id, patch: { sortOrder: typeof value === 'number' && Number.isFinite(value) ? Math.round(value) : 0 } });
        return;
      case 'isActive':
        patch.mutate({ id: c.id, patch: { isActive: !!value } });
        return;
    }
  };

  return (
    <>
      <PageHeader
        title="Endorsement Categories"
        subtitle="Issue categories and the shift-board section (s1–s6) each one belongs to."
        actions={
          <>
            <ChangeLogButton module="Categories" entities={AUDIT_ENTITIES} />
            <Button size="xs" leftSection={<IconPlus size={14} />} onClick={() => setDrawer(true)}>
              Add category
            </Button>
          </>
        }
        filters={<Switch size={isMobile ? 'sm' : 'xs'} label="Show inactive" checked={showInactive} onChange={(e) => setShowInactive(e.currentTarget.checked)} />}
      />
      <DataTable<Category>
        columns={columns}
        data={rows}
        getRowId={(c) => String(c.id)}
        sorting={sorting}
        onSortingChange={setSorting}
        editable
        onCellCommit={onCellCommit}
        rowProps={(c) => (c.isActive ? undefined : { style: { opacity: 0.55 } })}
        stickyHeader
        minWidth={640}
        loading={categories.isFetching}
        emptyMessage="No categories"
        footer={<span style={{ fontSize: '0.7rem', color: 'var(--saa-text3)' }}>{rows.length} shown</span>}
      />
      <FormDrawer opened={drawer} onClose={() => setDrawer(false)} title="Add category" fields={createFields} submitLabel="Add category" onSubmit={(v) => create.mutateAsync(v as CategoryBody)} />
    </>
  );
}
