import { Badge, Button, Group, Stack, Text } from '@mantine/core';
import { DateInput, DatePickerInput } from '@mantine/dates';
import { IconCheck, IconForms, IconX } from '@tabler/icons-react';
import { useState } from 'react';

import { monthLabel } from '@/lib/time';

import type { PmItem, PmPatch } from '../api';
import { PM_STATE_META, shortDate, type PmState } from '../pmState';

export interface PmDoneEditorProps {
  item: PmItem;
  month: string;
  state: PmState;
  /** Plant date (Asia/Manila) — the default "done on" value and the latest date that can be picked. */
  today: string;
  /** Phones: bigger controls and a modal date picker (the editor sits in a bottom drawer). */
  phone?: boolean;
  onSave: (patch: PmPatch) => void;
  onOpenForm: () => void;
}

/** "PM done on" date + Save / Clear date / Open full PM form — shown in the card popover (desktop) or bottom drawer (phones). */
export function PmDoneEditor({ item, month, state, today, phone = false, onSave, onOpenForm }: PmDoneEditorProps) {
  const current = item.row?.actualDate ?? null;
  const [value, setValue] = useState<string | null>(current ?? today);
  const meta = PM_STATE_META[state];
  const size = phone ? 'md' : 'sm';
  const outsideMonth = value !== null && value.slice(0, 7) !== month;

  const save = () => {
    if (!value) return;
    const date = value.slice(0, 10);
    // A tool without a PM row gets one: carry the tool's type and EE like the full form does.
    onSave(item.row ? { actualDate: date } : { actualDate: date, toolType: item.tool.toolType, eeUserId: item.tool.ee?.id ?? null });
  };

  return (
    <Stack gap="xs" data-pm-editor>
      <Group justify="space-between" gap="xs" wrap="nowrap">
        <div style={{ minWidth: 0 }}>
          <Text fw={900} fz={phone ? 'lg' : 'md'} lh={1.2}>
            {item.tool.code}
          </Text>
          <Text size="xs" c="dimmed" truncate>
            PM {monthLabel(month)}
            {item.tool.ee ? ` · ${item.tool.ee.name}` : ''}
          </Text>
        </div>
        <Badge color={meta.color} variant="filled" autoContrast style={{ flexShrink: 0 }}>
          {state === 'done' && current ? `Done ${shortDate(current, month.slice(0, 4))}` : meta.short}
        </Badge>
      </Group>

      {phone ? (
        // Phones: no keyboard, and the calendar opens as a centred modal instead of covering the buttons.
        <DatePickerInput size={size} label="PM done on" value={value} onChange={setValue} valueFormat="MMM D, YYYY" maxDate={today} dropdownType="modal" />
      ) : (
        // Desktop: typeable; the calendar stays inside the card popover so picking a day doesn't dismiss it.
        <DateInput size={size} label="PM done on" value={value} onChange={setValue} valueFormat="MMM D, YYYY" maxDate={today} popoverProps={{ withinPortal: false }} />
      )}
      {outsideMonth && (
        <Text size="xs" c="orange" fw={700} mt={-4}>
          Outside {monthLabel(month)} — still saved as the {monthLabel(month)} PM.
        </Text>
      )}
      {!item.row && (
        <Text size="xs" c="dimmed" mt={-4}>
          No PM row yet — saving creates one.
        </Text>
      )}

      <Group gap="xs" grow wrap="nowrap">
        <Button size={size} leftSection={<IconCheck size={16} />} onClick={save} data-autofocus disabled={!value}>
          Save
        </Button>
        <Button size={size} variant="default" c={current ? 'red' : undefined} leftSection={<IconX size={16} />} onClick={() => onSave({ actualDate: null })} disabled={!current}>
          Clear date
        </Button>
      </Group>
      <Button size={phone ? 'sm' : 'xs'} variant="subtle" leftSection={<IconForms size={16} />} onClick={onOpenForm}>
        Open full PM form
      </Button>
    </Stack>
  );
}
