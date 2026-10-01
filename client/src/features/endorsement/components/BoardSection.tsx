import { Button } from '@mantine/core';
import { modals } from '@mantine/modals';
import { IconLayoutList, IconMinus, IconPhotoPlus, IconPlus } from '@tabler/icons-react';
import { memo, useCallback, useMemo, useRef, useState, type ChangeEvent } from 'react';

import type { SectionKey, Shift } from '@shared/domain';
import { SECTION_META } from '@shared/domain';

import { DataTable } from '@/components/table/DataTable';
import { SectionCard } from '@/components/ui/SectionCard';
import type { Attachment, Endorsement } from '@/lib/api/types';
import { useIsMobile } from '@/lib/useIsMobile';
import { useCurrentUser } from '@/stores/session.store';
import { SECTIONS } from '@/theme/colors';

import { useCreateEndorsement, useDeleteAttachment, useDeleteEndorsements, usePatchEndorsement, useUploadAttachments } from '../api';
import { buildEndorsementColumns, patchFromCell, TABLE_MIN_WIDTH, type ColumnRefs } from '../columns';
import classes from '../endorsement.module.css';
import { SECTION_ICONS } from '../sections';
import { AttachmentStrip } from './AttachmentStrip';

export interface BoardSectionProps {
  sectionKey: SectionKey;
  date: string;
  shift: Shift;
  rows: Endorsement[];
  attachments: Attachment[];
  refs: ColumnRefs;
  /** Board query is loading (first load -> skeleton rows, refetch -> thin bar). */
  loading?: boolean;
}

const noneRowProps = (r: Endorsement) => (r.isNone ? { 'data-none-row': '' } : undefined);
/** Phone cards: NONE rows show only their black "NONE" heading. */
const isNoneRow = (r: Endorsement) => r.isNone;
const rowId = (r: Endorsement) => String(r.id);

/**
 * One board section: coloured card + editable rows (client-paged, 20/page) + attached images.
 * Memoised: the board passes stable per-section arrays so untouched sections skip re-rendering.
 */
export const BoardSection = memo(function BoardSection({ sectionKey, date, shift, rows, attachments, refs, loading }: BoardSectionProps) {
  const user = useCurrentUser();
  const create = useCreateEndorsement();
  const { mutate: patchRow } = usePatchEndorsement();
  const { mutate: removeRows } = useDeleteEndorsements();
  const upload = useUploadAttachments();
  const { mutate: removeAttachment } = useDeleteAttachment();
  const createRow = create.mutate;
  const uploadFiles = upload.mutate;
  const fileInput = useRef<HTMLInputElement>(null);
  const [selection, setSelection] = useState<Record<string, boolean>>({});
  const isMobile = useIsMobile();
  // Phones: taller buttons (touch targets) in a 2 × 2 grid (SectionCard CSS).
  const btnSize = isMobile ? 'xs' : 'compact-xs';
  const iconSize = isMobile ? 14 : 11;

  const sectionCategories = useMemo(() => refs.categories.filter((c) => c.sectionKey === sectionKey), [refs.categories, sectionKey]);
  const columns = useMemo(
    () =>
      buildEndorsementColumns({
        mode: 'board',
        refs: { ...refs, categories: sectionCategories },
        onToolChange: (row, toolId) => patchRow({ id: row.id, patch: { toolId } }),
        mobile: isMobile,
      }),
    [refs, sectionCategories, patchRow, isMobile],
  );

  // Selection survives paging; only ids still present in this section count.
  const selectedIds = useMemo(() => {
    const present = new Set(rows.map((r) => r.id));
    return Object.entries(selection)
      .filter(([, v]) => v)
      .map(([k]) => Number(k))
      .filter((id) => present.has(id));
  }, [selection, rows]);

  const addRow = useCallback(
    () =>
      createRow({
        date,
        shift,
        sectionKey,
        categoryId: sectionCategories.find((c) => c.isActive)?.id ?? null,
        progress: 'open',
        endorseBy: user ? [user.id] : [],
      }),
    [createRow, date, shift, sectionKey, sectionCategories, user],
  );

  const addNone = useCallback(() => createRow({ date, shift, sectionKey, isNone: true }), [createRow, date, shift, sectionKey]);

  const delRows = useCallback(() => {
    if (!selectedIds.length) return;
    modals.openConfirmModal({
      title: `Delete ${selectedIds.length} row${selectedIds.length > 1 ? 's' : ''}?`,
      children: `This removes the selected ${SECTION_META[sectionKey].name} row${selectedIds.length > 1 ? 's' : ''} for ${date} ${shift} on every PC.`,
      labels: { confirm: 'Delete', cancel: 'Cancel' },
      confirmProps: { color: 'red' },
      onConfirm: () => {
        removeRows(selectedIds);
        setSelection({});
      },
    });
  }, [selectedIds, sectionKey, date, shift, removeRows]);

  const onFiles = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? []).filter((f) => f.type.startsWith('image/'));
      e.target.value = '';
      if (files.length) uploadFiles({ date, shift, sectionKey, files });
    },
    [uploadFiles, date, shift, sectionKey],
  );

  const onCellCommit = useCallback(
    (row: Endorsement, columnId: string, value: unknown) => {
      const body = patchFromCell(columnId, value);
      if (body) patchRow({ id: row.id, patch: body });
    },
    [patchRow],
  );

  const onDeleteAttachment = useCallback((a: Attachment) => removeAttachment({ id: a.id, date, shift }), [removeAttachment, date, shift]);

  const Icon = SECTION_ICONS[sectionKey];
  const live = rows.filter((r) => !r.isNone).length;
  const meta = `${SECTION_META[sectionKey].meta} · ${live} row${live === 1 ? '' : 's'}`;

  return (
    <SectionCard
      sectionKey={sectionKey}
      icon={<Icon size={20} />}
      meta={meta}
      actions={
        <>
          <Button size={btnSize} className={classes.addBtn} style={{ background: SECTIONS[sectionKey].bar }} leftSection={<IconPlus size={iconSize} />} onClick={addRow} loading={create.isPending}>
            Add Row
          </Button>
          <Button size={btnSize} color="red" variant="light" leftSection={<IconMinus size={iconSize} />} onClick={delRows} disabled={!selectedIds.length}>
            Del Row{selectedIds.length ? ` (${selectedIds.length})` : ''}
          </Button>
          <Button size={btnSize} variant="default" leftSection={<IconLayoutList size={iconSize} />} onClick={addNone}>
            Add None
          </Button>
          <Button size={btnSize} variant="default" leftSection={<IconPhotoPlus size={iconSize} />} onClick={() => fileInput.current?.click()} loading={upload.isPending}>
            Add Image
          </Button>
          <input ref={fileInput} type="file" accept="image/*" multiple hidden onChange={onFiles} />
        </>
      }
    >
      <div className={classes.cardsHost}>
        <DataTable<Endorsement>
          columns={columns}
          data={rows}
          getRowId={rowId}
          editable
          onCellCommit={onCellCommit}
          selection={selection}
          onSelectionChange={setSelection}
          rowProps={noneRowProps}
          mobileCollapsed={isNoneRow}
          minWidth={TABLE_MIN_WIDTH}
          loading={loading}
          emptyMessage={`No ${SECTION_META[sectionKey].name} rows for this shift — add a row or mark NONE.`}
        />
        <AttachmentStrip items={attachments} onDelete={onDeleteAttachment} />
      </div>
    </SectionCard>
  );
});
