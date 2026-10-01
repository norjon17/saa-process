import { Button, Group, SegmentedControl, Select, SimpleGrid, TextInput } from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { useDebouncedValue } from '@mantine/hooks';
import { IconRotate, IconSearch } from '@tabler/icons-react';
import { useEffect, useState, type ReactNode } from 'react';

import type { EndorsementProgress, SectionKey, Shift } from '@shared/domain';
import { SECTION_KEYS, SECTION_META } from '@shared/domain';

import { toSelectData } from '@/features/ref/api';
import { useIsMobile } from '@/lib/useIsMobile';

import type { ColumnRefs } from '../columns';
import type { HistorySearch, ResolvedHistorySearch } from '../search';

export interface HistoryFiltersProps {
  value: ResolvedHistorySearch;
  refs: ColumnRefs;
  onChange: (patch: Partial<HistorySearch>) => void;
  onReset: () => void;
}

const SHIFT_DATA: { value: string; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'DS', label: 'DS' },
  { value: 'NS', label: 'NS' },
];
const REMARK_DATA: { value: string; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'open', label: '-' },
  { value: 'ongoing', label: 'Ongoing' },
  { value: 'done', label: 'DONE' },
];

/** Number of filters that differ from the defaults (last 30 days, everything else "all") — for the phone Filters badge. */
export function countActiveHistoryFilters(s: HistorySearch): number {
  return [s.from !== undefined || s.to !== undefined, s.shift, s.toolId, s.sectionKey, s.categoryId, s.userId, s.progress, s.q].filter((v) => v !== undefined && v !== false && v !== '').length;
}

const FULL = { gridColumn: '1 / -1' } as const;

export function HistoryFilters({ value, refs, onChange, onReset }: HistoryFiltersProps) {
  const isMobile = useIsMobile();
  /** Desktop: fixed widths in a wrapping row. Phones: full-width fields in a 2-column grid. */
  const w = (px: number) => (isMobile ? undefined : px);
  const [q, setQ] = useState(value.q ?? '');
  const [debounced] = useDebouncedValue(q, 400);

  useEffect(() => {
    const next = debounced.trim();
    if (next !== (value.q ?? '')) onChange({ q: next || undefined, page: 1 });
    // only react to the debounced text
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  const tools = toSelectData(refs.tools, (t) => t.code);
  const categories = toSelectData(refs.categories, (c) => `${c.name} · ${SECTION_META[c.sectionKey].name}`);
  const users = toSelectData(refs.users, (u) => u.name);
  const sections = SECTION_KEYS.map((k) => ({ value: k, label: SECTION_META[k].name }));

  const Layout = isMobile ? MobileGrid : DesktopRow;

  return (
    <Layout>
      <DatePickerInput
        type="range"
        size="xs"
        label="Date range"
        valueFormat="YYYY-MM-DD"
        value={[value.from, value.to]}
        allowSingleDateInRange
        onChange={([from, to]) => {
          if (from && to) onChange({ from, to, page: 1 });
        }}
        w={w(220)}
        style={isMobile ? FULL : undefined}
      />
      <div>
        <div style={{ fontSize: 'var(--mantine-font-size-xs)', fontWeight: 500, marginBottom: 2 }}>Shift</div>
        <SegmentedControl size="xs" fullWidth={isMobile} data={SHIFT_DATA} value={value.shift ?? 'all'} onChange={(v) => onChange({ shift: v === 'all' ? undefined : (v as Shift), page: 1 })} />
      </div>
      <Select size="xs" label="Tool" placeholder="All tools" data={tools} value={value.toolId !== undefined ? String(value.toolId) : null} onChange={(v) => onChange({ toolId: v ? Number(v) : undefined, page: 1 })} searchable clearable w={w(120)} />
      <Select size="xs" label="Section" placeholder="All" data={sections} value={value.sectionKey ?? null} onChange={(v) => onChange({ sectionKey: v ? (v as SectionKey) : undefined, page: 1 })} clearable w={w(140)} />
      <Select size="xs" label="Category" placeholder="All categories" data={categories} value={value.categoryId !== undefined ? String(value.categoryId) : null} onChange={(v) => onChange({ categoryId: v ? Number(v) : undefined, page: 1 })} searchable clearable w={w(200)} />
      <Select size="xs" label="Person" placeholder="Anyone" data={users} value={value.userId !== undefined ? String(value.userId) : null} onChange={(v) => onChange({ userId: v ? Number(v) : undefined, page: 1 })} searchable clearable w={w(150)} style={isMobile ? FULL : undefined} />
      <div style={isMobile ? FULL : undefined}>
        <div style={{ fontSize: 'var(--mantine-font-size-xs)', fontWeight: 500, marginBottom: 2 }}>Remarks</div>
        <SegmentedControl size="xs" fullWidth={isMobile} data={REMARK_DATA} value={value.progress ?? 'all'} onChange={(v) => onChange({ progress: v === 'all' ? undefined : (v as EndorsementProgress), page: 1 })} />
      </div>
      <TextInput size="xs" label="Search" placeholder="Issue or status…" leftSection={<IconSearch size={13} />} value={q} onChange={(e) => setQ(e.currentTarget.value)} w={w(200)} style={isMobile ? FULL : undefined} />
      <Button
        size="xs"
        variant={isMobile ? 'default' : 'subtle'}
        style={isMobile ? FULL : undefined}
        leftSection={<IconRotate size={13} />}
        onClick={() => {
          setQ('');
          onReset();
        }}
      >
        Reset
      </Button>
    </Layout>
  );
}

function DesktopRow({ children }: { children: ReactNode }) {
  return (
    <Group gap="sm" wrap="wrap" align="flex-end">
      {children}
    </Group>
  );
}

function MobileGrid({ children }: { children: ReactNode }) {
  return (
    <SimpleGrid cols={2} spacing="xs" verticalSpacing="xs" w="100%">
      {children}
    </SimpleGrid>
  );
}
