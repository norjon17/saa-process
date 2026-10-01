import { ActionIcon, Button, Checkbox, Drawer, Group, NumberInput, Select, Stack, Text, Textarea, TextInput, Tooltip } from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { useForm, type UseFormReturnType } from '@mantine/form';
import { useDebouncedValue } from '@mantine/hooks';
import { modals } from '@mantine/modals';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { IconDownload, IconPlus, IconSearch, IconTrash } from '@tabler/icons-react';
import { useCallback, useMemo, useState, type ReactNode } from 'react';

import { DataTable } from '@/components/table/DataTable';
import type { AppColumn, SortSpec } from '@/components/table/types';
import { PageHeader } from '@/components/ui/PageHeader';
import type { Paged } from '@/lib/api/types';
import { downloadText, toCsv } from '@/lib/export/csv';
import { notify } from '@/lib/notify';
import { useIsMobile } from '@/lib/useIsMobile';

import fd from './formDrawer.module.css';

/* ------------------------------------------------------------------ */
/* Form field specs → a @mantine/form form rendered inside a Drawer    */
/* ------------------------------------------------------------------ */

interface FieldBase {
  name: string;
  label: string;
  required?: boolean;
  placeholder?: string;
  description?: string;
  /** Initial value (defaults: '' for text, null for number/date/select, false for checkbox). */
  initial?: unknown;
  /** Extra validation; return an error message or null. Runs after the `required` check. */
  validate?: (value: unknown) => string | null;
  /** Normalise the value before submit (after the generic '' → null / numeric select conversions). */
  transform?: (value: unknown) => unknown;
}

export type FieldSpec = FieldBase &
  (
    | { kind: 'text' }
    | { kind: 'textarea' }
    | { kind: 'number'; precision?: number; min?: number; max?: number; step?: number }
    | { kind: 'date' }
    | { kind: 'checkbox' }
    | { kind: 'select'; options: { value: string; label: string }[]; numeric?: boolean; clearable?: boolean; searchable?: boolean }
  );

export type FormValues = Record<string, unknown>;

export function initialValuesOf(fields: FieldSpec[]): FormValues {
  const out: FormValues = {};
  for (const f of fields) {
    if (f.initial !== undefined) out[f.name] = f.initial;
    else out[f.name] = f.kind === 'checkbox' ? false : f.kind === 'text' || f.kind === 'textarea' ? '' : null;
  }
  return out;
}

const isBlank = (v: unknown) => v === null || v === undefined || v === '';

/** Convert raw form state into the API payload shape. */
export function normalizeValues(fields: FieldSpec[], values: FormValues): FormValues {
  const out: FormValues = {};
  for (const f of fields) {
    let v = values[f.name];
    if (f.kind === 'number') v = v === '' || v === undefined ? null : typeof v === 'string' ? Number(v) : v;
    else if (f.kind === 'select') v = isBlank(v) ? null : f.numeric ? Number(v) : v;
    else if (f.kind === 'text' || f.kind === 'textarea') v = typeof v === 'string' && v.trim() === '' ? null : typeof v === 'string' ? v.trim() : v;
    else if (f.kind === 'date') v = isBlank(v) ? null : String(v).slice(0, 10);
    else if (f.kind === 'checkbox') v = !!v;
    if (f.transform) v = f.transform(v);
    out[f.name] = v;
  }
  return out;
}

type FormApi = Pick<UseFormReturnType<FormValues>, 'getInputProps'>;

function FieldInput({ field, form, size }: { field: FieldSpec; form: FormApi; size: 'sm' | 'md' }) {
  const common = { label: field.label, withAsterisk: !!field.required, description: field.description, placeholder: field.placeholder, size };
  switch (field.kind) {
    case 'text':
      return <TextInput {...common} {...form.getInputProps(field.name)} />;
    case 'textarea':
      return <Textarea {...common} autosize minRows={2} {...form.getInputProps(field.name)} />;
    case 'number': {
      const p = form.getInputProps(field.name);
      return <NumberInput {...common} decimalScale={field.precision} min={field.min} max={field.max} step={field.step} {...p} value={p.value ?? ''} />;
    }
    case 'date': {
      const p = form.getInputProps(field.name);
      return <DateInput {...common} valueFormat="YYYY-MM-DD" clearable {...p} value={p.value ?? null} />;
    }
    case 'checkbox':
      return <Checkbox size={size} label={field.label} description={field.description} {...form.getInputProps(field.name, { type: 'checkbox' })} />;
    case 'select': {
      const p = form.getInputProps(field.name);
      return <Select {...common} data={field.options} clearable={field.clearable ?? !field.required} searchable={field.searchable ?? field.options.length > 8} comboboxProps={{ withinPortal: true }} {...p} value={p.value === null || p.value === undefined ? null : String(p.value)} />;
    }
  }
}

export interface FormDrawerProps {
  opened: boolean;
  onClose: () => void;
  title: ReactNode;
  fields: FieldSpec[];
  onSubmit: (values: FormValues) => Promise<unknown>;
  submitLabel?: string;
}

/**
 * Right-hand drawer with a vertical form generated from `fields`. Resets when re-opened.
 * Phones: full-screen, 16px inputs (no iOS focus zoom), Cancel / Save pinned to the bottom.
 */
export function FormDrawer({ opened, onClose, title, fields, onSubmit, submitLabel = 'Save' }: FormDrawerProps) {
  const isMobile = useIsMobile();
  return (
    <Drawer opened={opened} onClose={onClose} title={title} position="right" size={isMobile ? '100%' : 'md'} padding="md">
      {opened && <FormDrawerBody fields={fields} onSubmit={onSubmit} onClose={onClose} submitLabel={submitLabel} inputSize={isMobile ? 'md' : 'sm'} />}
    </Drawer>
  );
}

function FormDrawerBody({
  fields,
  onSubmit,
  onClose,
  submitLabel,
  inputSize,
}: {
  fields: FieldSpec[];
  onSubmit: (v: FormValues) => Promise<unknown>;
  onClose: () => void;
  submitLabel: string;
  inputSize: 'sm' | 'md';
}) {
  const [busy, setBusy] = useState(false);
  const form = useForm<FormValues>({
    initialValues: initialValuesOf(fields),
    validate: (values) => {
      const errors: Record<string, string> = {};
      for (const f of fields) {
        const v = values[f.name];
        if (f.required && (isBlank(v) || (f.kind === 'checkbox' && !v))) errors[f.name] = 'Required';
        else if (f.validate) {
          const e = f.validate(v);
          if (e) errors[f.name] = e;
        }
      }
      return errors;
    },
  });
  const submit = form.onSubmit(async (values) => {
    setBusy(true);
    try {
      await onSubmit(normalizeValues(fields, values));
      onClose();
    } catch {
      /* the global mutation cache / caller already notified */
    } finally {
      setBusy(false);
    }
  });
  return (
    <form onSubmit={submit}>
      <Stack gap="sm">
        {fields.map((f) => (
          <FieldInput key={f.name} field={f} form={form} size={inputSize} />
        ))}
        <div className={fd.footer}>
          <Button variant="default" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" loading={busy}>
            {submitLabel}
          </Button>
        </div>
      </Stack>
    </form>
  );
}

/* ------------------------------------------------------------------ */
/* Generic server-paginated CRUD page                                  */
/* ------------------------------------------------------------------ */

export interface CrudFilters {
  from?: string;
  to?: string;
  toolId?: number;
  q?: string;
}

export type CrudFilterKind = 'date' | 'tool' | 'search';

export interface CrudTablePageProps<T extends { id: number }> {
  title: ReactNode;
  subtitle?: ReactNode;
  /** Base query key; page + filters are appended. Invalidated after create / delete. */
  queryKey: readonly unknown[];
  fetch: (page: number, pageSize: number, filters: CrudFilters) => Promise<Paged<T>>;
  columns: AppColumn<T>[];
  createFields: FieldSpec[];
  createTitle?: string;
  onCreate: (values: FormValues) => Promise<unknown>;
  onUpdate: (id: number, patch: Record<string, unknown>) => Promise<unknown>;
  onDelete: (id: number) => Promise<unknown>;
  filters?: CrudFilterKind[];
  /** Required when `filters` includes 'tool'. */
  toolOptions?: { value: string; label: string }[];
  exportName: string;
  /** Map an inline-editor commit to an API patch (default `{ [columnId]: value }`); return null to ignore. */
  toPatch?: (columnId: string, value: unknown, row: T) => Record<string, unknown> | null;
  minWidth?: number;
  /** Initial rows per page (default 50); the pager's size select changes it and resets to page 1. */
  pageSize?: number;
  canEdit?: boolean;
  extraActions?: ReactNode;
  emptyMessage?: ReactNode;
  /** Phones: read-only card heading (e.g. date · shift · tool). Pass a stable function (useCallback / useMemo). */
  mobileTitle?: (row: T) => ReactNode;
}

const crudRowId = (r: { id: number }) => String(r.id);

export function CrudTablePage<T extends { id: number }>(props: CrudTablePageProps<T>) {
  const { queryKey, fetch, onUpdate, onDelete, canEdit = true } = props;
  const qc = useQueryClient();
  // Pages pass `filters={[...]}` inline; key the memo on its content so the filter object stays stable.
  const kindsKey = (props.filters ?? []).join(',');
  const filterKinds = useMemo(() => (kindsKey ? (kindsKey.split(',') as CrudFilterKind[]) : []), [kindsKey]);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSizeState] = useState(props.pageSize ?? 50);
  const setPageSize = useCallback((size: number) => {
    setPageSizeState(size);
    setPage(1);
  }, []);
  const [from, setFrom] = useState<string | null>(null);
  const [to, setTo] = useState<string | null>(null);
  const [toolId, setToolId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [debounced] = useDebouncedValue(search, 400);
  const [sorting, setSorting] = useState<SortSpec[]>([]);
  const [drawer, setDrawer] = useState(false);

  const q = debounced.trim();
  const [lastQ, setLastQ] = useState(q);
  if (q !== lastQ) {
    setLastQ(q);
    setPage(1);
  }

  const filters = useMemo<CrudFilters>(() => {
    const f: CrudFilters = {};
    if (filterKinds.includes('date')) {
      if (from) f.from = from;
      if (to) f.to = to;
    }
    if (filterKinds.includes('tool') && toolId) f.toolId = Number(toolId);
    if (filterKinds.includes('search') && q) f.q = q;
    return f;
  }, [from, to, toolId, q, filterKinds]);

  const listKey = useMemo(() => [...queryKey, { page, pageSize, ...filters }] as const, [queryKey, page, pageSize, filters]);
  const list = useQuery({ queryKey: listKey, queryFn: () => fetch(page, pageSize, filters), placeholderData: keepPreviousData });

  const update = useMutation({
    mutationFn: ({ id, patch }: { id: number; patch: Record<string, unknown> }) => onUpdate(id, patch),
    onMutate: async ({ id, patch }) => {
      await qc.cancelQueries({ queryKey: listKey });
      const prev = qc.getQueryData<Paged<T>>(listKey);
      qc.setQueryData<Paged<T>>(listKey, (old) => (old ? { ...old, items: old.items.map((r) => (r.id === id ? { ...r, ...patch } : r)) } : old));
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(listKey, ctx.prev);
    },
    onSuccess: (row, { id }) => {
      if (row && typeof row === 'object' && 'id' in row) {
        qc.setQueryData<Paged<T>>(listKey, (old) => (old ? { ...old, items: old.items.map((r) => (r.id === id ? (row as T) : r)) } : old));
      }
      notify.autosaved();
    },
  });

  const remove = useMutation({
    mutationFn: (id: number) => onDelete(id),
    onSuccess: () => {
      notify.success('Row deleted');
      void qc.invalidateQueries({ queryKey });
    },
  });

  const removeRow = remove.mutate;
  const confirmDelete = useCallback(
    (row: T) =>
      modals.openConfirmModal({
        title: 'Delete row',
        children: (
          <Text size="sm">
            Delete row #{row.id}? This cannot be undone.
          </Text>
        ),
        labels: { confirm: 'Delete', cancel: 'Cancel' },
        confirmProps: { color: 'red' },
        onConfirm: () => removeRow(row.id),
      }),
    [removeRow],
  );

  const isMobile = useIsMobile();
  const mobileTitle = props.mobileTitle;
  const columns = useMemo<AppColumn<T>[]>(() => {
    const title: AppColumn<T>[] =
      isMobile && mobileTitle ? [{ id: '__title', header: '', accessor: () => null, sortable: false, mobile: 'title', render: mobileTitle }] : [];
    if (!canEdit) return [...title, ...props.columns];
    const actions: AppColumn<T> = isMobile
      ? {
          // Phones: a labelled, right-aligned Delete at the bottom of each card.
          id: '__actions',
          header: '',
          accessor: () => null,
          sortable: false,
          mobile: 'full',
          render: (row) => (
            <Group justify="flex-end">
              <Button variant="subtle" color="red" size="xs" leftSection={<IconTrash size={14} />} onClick={() => confirmDelete(row)}>
                Delete
              </Button>
            </Group>
          ),
        }
      : {
          id: '__actions',
          header: '',
          accessor: () => null,
          sortable: false,
          width: 40,
          render: (row) => (
            <Tooltip label="Delete row" withArrow>
              <ActionIcon variant="subtle" color="red" size="sm" onClick={() => confirmDelete(row)} aria-label="Delete row">
                <IconTrash size={14} />
              </ActionIcon>
            </Tooltip>
          ),
        };
    return [...title, ...props.columns, actions];
  }, [props.columns, canEdit, confirmDelete, isMobile, mobileTitle]);

  const exportCsv = () => {
    const rows = list.data?.items ?? [];
    const cols = props.columns.filter((c) => !c.hidden);
    const headers = cols.map((c) => (typeof c.header === 'string' ? c.header : c.id));
    const body = rows.map((r) =>
      cols.map((c) => {
        const v = c.exportValue ? c.exportValue(r) : c.accessor(r);
        return Array.isArray(v) ? v.join(' / ') : typeof v === 'boolean' ? (v ? 'Y' : 'N') : v;
      }),
    );
    downloadText(`${props.exportName}.csv`, toCsv(headers, body));
  };

  const toPatch = props.toPatch;
  const updateRow = update.mutate;
  const onCellCommit = useCallback(
    (row: T, columnId: string, value: unknown) => {
      const patch = toPatch ? toPatch(columnId, value, row) : { [columnId]: value };
      if (!patch) return;
      updateRow({ id: row.id, patch });
    },
    [toPatch, updateRow],
  );

  const activeFilterCount = [filterKinds.includes('date') && from, filterKinds.includes('date') && to, filterKinds.includes('tool') && toolId, filterKinds.includes('search') && q].filter(Boolean).length;
  // Phones: filters sit behind the PageHeader "Filters" toggle, one full-width row each, 36px touch height.
  const fSize = isMobile ? 'sm' : 'xs';
  const filterBar = filterKinds.length ? (
    <>
      {filterKinds.includes('date') && (
        <Group gap={6} wrap="nowrap" w={isMobile ? '100%' : undefined}>
          <DateInput
            size={fSize}
            w={isMobile ? undefined : 130}
            style={isMobile ? { flex: 1, minWidth: 0 } : undefined}
            placeholder="From"
            valueFormat="YYYY-MM-DD"
            clearable
            value={from}
            onChange={(v) => {
              setFrom(v);
              setPage(1);
            }}
            aria-label="From date"
          />
          <Text size="xs" c="dimmed">
            –
          </Text>
          <DateInput
            size={fSize}
            w={isMobile ? undefined : 130}
            style={isMobile ? { flex: 1, minWidth: 0 } : undefined}
            placeholder="To"
            valueFormat="YYYY-MM-DD"
            clearable
            value={to}
            onChange={(v) => {
              setTo(v);
              setPage(1);
            }}
            aria-label="To date"
          />
        </Group>
      )}
      {filterKinds.includes('tool') && (
        <Select
          size={fSize}
          w={isMobile ? '100%' : 140}
          placeholder="All tools"
          data={props.toolOptions ?? []}
          value={toolId}
          onChange={(v) => {
            setToolId(v);
            setPage(1);
          }}
          clearable
          searchable
          comboboxProps={{ withinPortal: true }}
          aria-label="Tool filter"
        />
      )}
      {filterKinds.includes('search') && (
        <TextInput size={fSize} w={isMobile ? '100%' : 220} placeholder="Search…" leftSection={<IconSearch size={14} />} value={search} onChange={(e) => setSearch(e.currentTarget.value)} aria-label="Search" />
      )}
    </>
  ) : undefined;

  return (
    <>
      <PageHeader
        title={props.title}
        subtitle={props.subtitle}
        actions={
          <>
            {props.extraActions}
            <Button variant="default" size="xs" leftSection={<IconDownload size={14} />} onClick={exportCsv} disabled={!list.data?.items.length}>
              Export CSV
            </Button>
            {canEdit && (
              <Button size="xs" leftSection={<IconPlus size={14} />} onClick={() => setDrawer(true)}>
                Add
              </Button>
            )}
          </>
        }
        filters={filterBar}
        collapsibleFilters={filterKinds.length > 1}
        activeFilterCount={activeFilterCount}
      />
      <DataTable<T>
        columns={columns}
        data={list.data?.items ?? []}
        getRowId={crudRowId}
        sorting={sorting}
        onSortingChange={setSorting}
        page={page}
        pageSize={pageSize}
        total={list.data?.total ?? 0}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        loading={list.isFetching}
        editable={canEdit}
        onCellCommit={onCellCommit}
        stickyHeader
        minWidth={props.minWidth ?? 1000}
        emptyMessage={props.emptyMessage ?? 'No rows match the current filters'}
      />
      <FormDrawer
        opened={drawer}
        onClose={() => setDrawer(false)}
        title={props.createTitle ?? 'Add row'}
        fields={props.createFields}
        submitLabel="Add"
        onSubmit={async (values) => {
          await props.onCreate(values);
          notify.success('Row added');
          await qc.invalidateQueries({ queryKey });
        }}
      />
    </>
  );
}
