import { Button, Checkbox, Drawer, Fieldset, Group, NumberInput, Select, SimpleGrid, Stack, Text, Textarea, TextInput } from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { useForm } from '@mantine/form';
import { modals } from '@mantine/modals';

import { TOOL_TYPES } from '@shared/domain';

import { fmtNum } from '@/lib/format';
import { monthLabel } from '@/lib/time';
import { useIsMobile } from '@/lib/useIsMobile';
import { useCan } from '@/stores/session.store';

import type { PmItem, PmPatch } from '../api';
import { useDeletePmRow, useUpdatePmRow } from '../api';
import { DELTA_LIMIT, PM_NUMBER_KEYS, type PmBoolKey, type PmNumKey, type PmTextKey } from '../columns';

interface FormValues {
  toolType: string | null;
  eeUserId: string | null;
  actualDate: string | null;
  numbers: Record<PmNumKey, number | ''>;
  flags: Record<PmBoolKey, boolean>;
  texts: Record<PmTextKey, string>;
}

const BOOL_FIELDS: { key: PmBoolKey; label: string }[] = [
  { key: 'optGrr', label: 'GRR' },
  { key: 'optCorrelation', label: 'Correlation' },
  { key: 'optLaserRecipe', label: 'Laser Recipe' },
  { key: 'optAdditionalArea', label: 'Additional Area / Lines' },
  { key: 'optScanPatternDir', label: 'Scan Pattern Direction' },
];

function toForm(item: PmItem): FormValues {
  const r = item.row;
  const numbers = Object.fromEntries(PM_NUMBER_KEYS.map((k) => [k, r?.[k] ?? ''])) as Record<PmNumKey, number | ''>;
  return {
    toolType: r?.toolType ?? item.tool.toolType ?? null,
    eeUserId: r?.eeUserId !== null && r?.eeUserId !== undefined ? String(r.eeUserId) : item.tool.ee ? String(item.tool.ee.id) : null,
    actualDate: r?.actualDate ?? null,
    numbers,
    flags: { optGrr: !!r?.optGrr, optCorrelation: !!r?.optCorrelation, optLaserRecipe: !!r?.optLaserRecipe, optAdditionalArea: !!r?.optAdditionalArea, optScanPatternDir: !!r?.optScanPatternDir },
    texts: { fixtureLeft: r?.fixtureLeft ?? '', fixtureRight: r?.fixtureRight ?? '', scanPattern: r?.scanPattern ?? '', remarks: r?.remarks ?? '' },
  };
}

function toPatch(v: FormValues): PmPatch {
  const patch: PmPatch = {
    toolType: v.toolType === 'SAAT05' || v.toolType === 'SAAT07' ? v.toolType : null,
    eeUserId: v.eeUserId ? Number(v.eeUserId) : null,
    actualDate: v.actualDate ? v.actualDate.slice(0, 10) : null,
  };
  for (const k of PM_NUMBER_KEYS) patch[k] = v.numbers[k] === '' ? null : Number(v.numbers[k]);
  for (const { key } of BOOL_FIELDS) patch[key] = v.flags[key];
  for (const k of ['fixtureLeft', 'fixtureRight', 'scanPattern', 'remarks'] as const) patch[k] = v.texts[k].trim() || null;
  return patch;
}

export interface PmRowDrawerProps {
  item: PmItem | null;
  month: string;
  eeOptions: { value: string; label: string }[];
  onClose: () => void;
}

/** Vertical form for one tool's PM row — the narrow-screen alternative to the wide grid. */
export function PmRowDrawer({ item, month, eeOptions, onClose }: PmRowDrawerProps) {
  const isMobile = useIsMobile();
  return (
    <Drawer opened={item !== null} onClose={onClose} position="right" size={isMobile ? '100%' : 'lg'} padding="md" title={item ? `${item.tool.code} · PM ${monthLabel(month)}` : ''}>
      {item && <PmRowForm key={`${item.tool.id}-${month}`} item={item} month={month} eeOptions={eeOptions} onClose={onClose} />}
    </Drawer>
  );
}

function VacuumPair({ form, label, withKey, withoutKey, item, avgKey, deltaKey }: { form: ReturnType<typeof useForm<FormValues>>; label: string; withKey: PmNumKey; withoutKey: PmNumKey; item: PmItem; avgKey: string; deltaKey: string }) {
  const w = form.values.numbers[withKey];
  const wo = form.values.numbers[withoutKey];
  const avg = w !== '' && wo !== '' ? (Number(w) + Number(wo)) / 2 : (item.row?.derived[avgKey] ?? null);
  const delta = w !== '' && wo !== '' ? Number(w) - Number(wo) : (item.row?.derived[deltaKey] ?? null);
  const bad = delta !== null && Math.abs(delta) > DELTA_LIMIT;
  return (
    <Fieldset legend={label} p="xs">
      <SimpleGrid cols={2} spacing="xs">
        <NumberInput size="xs" label="With HGA" decimalScale={2} {...form.getInputProps(`numbers.${withKey}`)} />
        <NumberInput size="xs" label="Without HGA" decimalScale={2} {...form.getInputProps(`numbers.${withoutKey}`)} />
      </SimpleGrid>
      <Group gap="lg" mt={6}>
        <Text size="xs" c="dimmed">
          H1 avg <b>{fmtNum(avg, 2)}</b>
        </Text>
        <Text size="xs" c={bad ? 'red' : 'dimmed'} fw={bad ? 800 : undefined}>
          Delta <b>{fmtNum(delta, 2)}</b>
          {bad ? ` (> ${DELTA_LIMIT})` : ''}
        </Text>
      </Group>
    </Fieldset>
  );
}

function PmRowForm({ item, month, eeOptions, onClose }: { item: PmItem; month: string; eeOptions: { value: string; label: string }[]; onClose: () => void }) {
  const form = useForm<FormValues>({ initialValues: toForm(item) });
  const update = useUpdatePmRow(month);
  const remove = useDeletePmRow(month);
  const canClear = useCan('editSpecs');

  const submit = form.onSubmit((values) => {
    update.mutate({ toolId: item.tool.id, patch: toPatch(values) }, { onSuccess: onClose });
  });

  const confirmClear = () =>
    modals.openConfirmModal({
      title: 'Clear PM row',
      children: (
        <Text size="sm">
          Remove every PM value of {item.tool.code} for {monthLabel(month)}?
        </Text>
      ),
      labels: { confirm: 'Clear row', cancel: 'Cancel' },
      confirmProps: { color: 'red' },
      onConfirm: () => remove.mutate(item.tool.id, { onSuccess: onClose }),
    });

  const numInput = (key: PmNumKey, label: string) => <NumberInput size="xs" label={label} decimalScale={2} {...form.getInputProps(`numbers.${key}`)} />;

  return (
    <form onSubmit={submit}>
      <Stack gap="sm">
        <Text size="xs" c="dimmed">
          {item.tool.region ?? 'No region'} · {item.row ? 'Existing PM row' : 'No PM row yet — saving creates one'}
        </Text>
        <SimpleGrid cols={{ base: 1, xs: 3 }} spacing="xs">
          <Select size="xs" label="Type" data={TOOL_TYPES.map((t) => ({ value: t, label: t }))} clearable comboboxProps={{ withinPortal: true }} {...form.getInputProps('toolType')} />
          <Select size="xs" label="EE in charge" data={eeOptions} clearable searchable comboboxProps={{ withinPortal: true }} {...form.getInputProps('eeUserId')} />
          <DateInput size="xs" label="Actual date" valueFormat="YYYY-MM-DD" clearable {...form.getInputProps('actualDate')} />
        </SimpleGrid>

        <VacuumPair form={form} label="Left fixture vacuum" withKey="fixVacLWith" withoutKey="fixVacLWithout" item={item} avgKey="fixVacLAvg" deltaKey="fixVacLDelta" />
        <VacuumPair form={form} label="Right fixture vacuum" withKey="fixVacRWith" withoutKey="fixVacRWithout" item={item} avgKey="fixVacRAvg" deltaKey="fixVacRDelta" />
        <VacuumPair form={form} label="Left picker vacuum" withKey="pickVacLWith" withoutKey="pickVacLWithout" item={item} avgKey="pickVacLAvg" deltaKey="pickVacLDelta" />
        <VacuumPair form={form} label="Right picker vacuum" withKey="pickVacRWith" withoutKey="pickVacRWithout" item={item} avgKey="pickVacRAvg" deltaKey="pickVacRDelta" />

        <Fieldset legend="Clamping speed" p="xs">
          <SimpleGrid cols={2} spacing="xs">
            {numInput('clampLClamp', 'Left · Clamp')}
            {numInput('clampLUnclamp', 'Left · Unclamp')}
            {numInput('clampRClamp', 'Right · Clamp')}
            {numInput('clampRUnclamp', 'Right · Unclamp')}
          </SimpleGrid>
        </Fieldset>

        <SimpleGrid cols={2} spacing="xs">
          {numInput('fixtureSpring', 'Fixture spring')}
          {numInput('speedMotor', 'Speed motor')}
        </SimpleGrid>

        <Fieldset legend="Z offset" p="xs">
          <SimpleGrid cols={2} spacing="xs">
            {numInput('zOffLPickup', 'Left · Pick up')}
            {numInput('zOffLRelease', 'Left · Release')}
            {numInput('zOffRPickup', 'Right · Pick up')}
            {numInput('zOffRRelease', 'Right · Release')}
          </SimpleGrid>
        </Fieldset>

        <Fieldset legend="Optimization" p="xs">
          <SimpleGrid cols={2} spacing="xs">
            {BOOL_FIELDS.map((f) => (
              <Checkbox key={f.key} size="xs" label={f.label} {...form.getInputProps(`flags.${f.key}`, { type: 'checkbox' })} />
            ))}
          </SimpleGrid>
        </Fieldset>

        <SimpleGrid cols={3} spacing="xs">
          <TextInput size="xs" label="Fixture left" placeholder="LHC" {...form.getInputProps('texts.fixtureLeft')} />
          <TextInput size="xs" label="Fixture right" placeholder="LHC" {...form.getInputProps('texts.fixtureRight')} />
          <TextInput size="xs" label="Scan pattern" placeholder="POR" {...form.getInputProps('texts.scanPattern')} />
        </SimpleGrid>
        <Textarea size="xs" label="Remarks" autosize minRows={2} {...form.getInputProps('texts.remarks')} />

        <Group justify="space-between" mt="xs">
          {canClear && item.row ? (
            <Button variant="subtle" color="red" size="xs" onClick={confirmClear} loading={remove.isPending}>
              Clear row
            </Button>
          ) : (
            <span />
          )}
          <Group gap="xs">
            <Button variant="default" size="xs" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" size="xs" loading={update.isPending}>
              Save
            </Button>
          </Group>
        </Group>
      </Stack>
    </form>
  );
}
