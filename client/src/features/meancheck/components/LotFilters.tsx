import { Button, Group, SegmentedControl, Select, SimpleGrid, TextInput } from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { IconSearch, IconX } from '@tabler/icons-react';
import { useState } from 'react';

import type { McVerdict } from '@shared/domain';

import { useModels, useRegions, useTools } from '@/features/ref/api';
import { useIsMobile } from '@/lib/useIsMobile';

import type { LotListParams, LotListPatch } from '../api';

/** Number of active (non-default) filters — the badge on the phone "Filters" toggle. */
export function countLotFilters(v: LotListParams): number {
  return [v.regionId, v.toolId, v.verdict, v.model, v.from ?? v.to, v.q || undefined].filter((x) => x !== undefined).length;
}

export interface LotFiltersProps {
  value: LotListParams;
  onChange: (patch: LotListPatch) => void;
}

/** Region / tool / verdict / model / date-range / lot-number filters for the lot list. */
export function LotFilters({ value, onChange }: LotFiltersProps) {
  const regions = useRegions();
  const tools = useTools();
  const models = useModels();
  const [q, setQ] = useState(value.q ?? '');
  const isMobile = useIsMobile();

  const toolData = (tools.data ?? [])
    .filter((t) => value.regionId === undefined || t.regionId === value.regionId)
    .map((t) => ({ value: String(t.id), label: t.code }));
  const modelData = (models.data ?? []).map((m) => ({ value: m.code, label: m.code }));
  const hasAny = countLotFilters(value) > 0;
  const regionData = [{ label: 'All regions', value: 'all' }, ...(regions.data ?? []).map((r) => ({ label: r.name, value: String(r.id) }))];
  const regionValue = value.regionId === undefined ? 'all' : String(value.regionId);
  const onRegion = (v: string | null) => onChange({ regionId: !v || v === 'all' ? undefined : Number(v), toolId: undefined });

  const tool = (
    <Select
      size="xs"
      w={isMobile ? undefined : 130}
      placeholder="Tool"
      searchable
      clearable
      data={toolData}
      value={value.toolId === undefined ? null : String(value.toolId)}
      onChange={(v) => onChange({ toolId: v ? Number(v) : undefined })}
      aria-label="Tool"
    />
  );
  const verdict = (
    <SegmentedControl
      size="xs"
      fullWidth={isMobile}
      value={value.verdict ?? 'all'}
      onChange={(v) => onChange({ verdict: v === 'all' ? undefined : (v as McVerdict) })}
      data={[
        { label: 'All', value: 'all' },
        { label: 'Passed', value: 'passed' },
        { label: 'Failed', value: 'failed' },
      ]}
    />
  );
  const model = (
    <Select size="xs" w={isMobile ? undefined : 110} placeholder="Model" searchable clearable data={modelData} value={value.model ?? null} onChange={(v) => onChange({ model: v ?? undefined })} aria-label="Model" />
  );
  const range = (
    <DatePickerInput
      type="range"
      size="xs"
      w={isMobile ? undefined : 230}
      placeholder="Date range"
      clearable
      valueFormat="YYYY-MM-DD"
      value={[value.from ?? null, value.to ?? null]}
      onChange={([from, to]) => onChange({ from: from ? String(from).slice(0, 10) : undefined, to: to ? String(to).slice(0, 10) : undefined })}
      aria-label="Date range"
      dropdownType={isMobile ? 'modal' : 'popover'}
    />
  );
  const lot = (
    <TextInput
      size="xs"
      w={isMobile ? undefined : 190}
      placeholder="Lot number (exact)"
      value={q}
      onChange={(e) => setQ(e.currentTarget.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onChange({ q: q.trim() || undefined });
      }}
      onBlur={() => onChange({ q: q.trim() || undefined })}
      leftSection={<IconSearch size={13} />}
      aria-label="Lot number"
      enterKeyHint="search"
    />
  );
  const clear = hasAny && (
    <Button
      size="compact-xs"
      variant="subtle"
      color="gray"
      leftSection={<IconX size={12} />}
      onClick={() => {
        setQ('');
        onChange({ regionId: undefined, toolId: undefined, verdict: undefined, model: undefined, from: undefined, to: undefined, q: undefined });
      }}
    >
      Clear
    </Button>
  );

  // Phones: a two-column form. Six regions do not fit a segmented control there, so region is a select.
  if (isMobile) {
    return (
      <SimpleGrid cols={2} spacing={8} verticalSpacing={8} style={{ width: '100%' }}>
        <Select size="xs" aria-label="Region" allowDeselect={false} data={regionData} value={regionValue} onChange={onRegion} />
        {tool}
        <div style={{ gridColumn: '1 / -1' }}>{verdict}</div>
        {model}
        {range}
        <div style={{ gridColumn: '1 / -1' }}>{lot}</div>
        {clear && <div style={{ gridColumn: '1 / -1' }}>{clear}</div>}
      </SimpleGrid>
    );
  }

  return (
    <Group gap="sm" wrap="wrap" align="flex-end">
      <SegmentedControl size="xs" value={regionValue} onChange={onRegion} data={regionData} />
      {tool}
      {verdict}
      {model}
      {range}
      {lot}
      {clear}
    </Group>
  );
}
