import { ActionIcon, Button, Group, Text } from '@mantine/core';
import { MonthPickerInput } from '@mantine/dates';
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react';

import type { Shift } from '@shared/domain';

import { currentMonth, currentShiftInfo, formatLongDate, monthLabel, nextShift, prevShift, shiftMonth, weekdayOf } from '@/lib/time';
import { useIsMobile } from '@/lib/useIsMobile';
import { SHIFT_COLORS } from '@/theme/colors';

export function MonthNav({ month, onChange }: { month: string; onChange: (m: string) => void }) {
  // Phones: one row that fits 360px — larger tap targets, short month format, no duplicate month label.
  const isMobile = useIsMobile();
  return (
    <Group gap={6} wrap="nowrap">
      <ActionIcon variant="default" size={isMobile ? 36 : undefined} onClick={() => onChange(shiftMonth(month, -1))} aria-label="Previous month">
        <IconChevronLeft size={16} />
      </ActionIcon>
      <MonthPickerInput
        value={`${month}-01`}
        onChange={(v) => v && onChange(String(v).slice(0, 7))}
        valueFormat={isMobile ? 'MMM YYYY' : 'MMMM YYYY'}
        w={isMobile ? 118 : 170}
        aria-label="Month"
        styles={{ input: { fontWeight: 800, textAlign: 'center' } }}
      />
      <ActionIcon variant="default" size={isMobile ? 36 : undefined} onClick={() => onChange(shiftMonth(month, 1))} aria-label="Next month">
        <IconChevronRight size={16} />
      </ActionIcon>
      <Button variant="subtle" size={isMobile ? 'compact-sm' : 'compact-xs'} px={isMobile ? 6 : undefined} onClick={() => onChange(currentMonth())}>
        This month
      </Button>
      {!isMobile && (
        <Text size="xs" c="dimmed">
          {monthLabel(month)}
        </Text>
      )}
    </Group>
  );
}

export function ShiftNav({ date, shift, onChange }: { date: string; shift: Shift; onChange: (v: { date: string; shift: Shift }) => void }) {
  const c = SHIFT_COLORS[shift];
  return (
    <Group gap={6} wrap="nowrap">
      <ActionIcon variant="default" onClick={() => onChange(prevShift(date, shift))} aria-label="Previous shift">
        <IconChevronLeft size={16} />
      </ActionIcon>
      <div style={{ textAlign: 'center', minWidth: 190 }}>
        <Text fw={900} size="sm" style={{ lineHeight: 1.1 }}>
          {formatLongDate(date)}{' '}
          <span style={{ background: c.gradient, color: '#fff', borderRadius: 6, padding: '1px 8px', fontSize: '0.7rem', marginLeft: 6 }}>{shift}</span>
        </Text>
        <Text size="xs" c="dimmed">
          {weekdayOf(date)} · {shift === 'DS' ? 'Day shift' : 'Night shift'}
        </Text>
      </div>
      <ActionIcon variant="default" onClick={() => onChange(nextShift(date, shift))} aria-label="Next shift">
        <IconChevronRight size={16} />
      </ActionIcon>
      <Button variant="subtle" size="compact-xs" onClick={() => onChange(currentShiftInfo())}>
        Now
      </Button>
    </Group>
  );
}
