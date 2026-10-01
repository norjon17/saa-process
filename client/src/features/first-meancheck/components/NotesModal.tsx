import { Button, Group, Modal, Select, Stack, Text, Textarea, UnstyledButton } from '@mantine/core';
import { useEffect, useMemo, useState } from 'react';

import { OverallPill } from '@/components/ui/StatusPill';
import type { DailyRow, GridTool } from '@/lib/api/types';
import { formatLongDate, weekdayOf } from '@/lib/time';

export interface NotesModalProps {
  tool: GridTool | null;
  days: string[];
  rows: DailyRow[];
  saving?: boolean;
  onClose: () => void;
  onSave: (date: string, note: string | null) => void;
}

/** Per-tool notes for the month: pick a day, write a note (empty = remove). */
export function NotesModal({ tool, days, rows, saving, onClose, onSave }: NotesModalProps) {
  const [date, setDate] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const byDate = useMemo(() => new Map(rows.map((r) => [r.date, r])), [rows]);
  const noted = useMemo(() => rows.filter((r) => !!r.note).toSorted((a, b) => a.date.localeCompare(b.date)), [rows]);

  useEffect(() => {
    if (tool) {
      const first = noted[0]?.date ?? days[0] ?? null;
      setDate(first);
      setNote(first ? (byDate.get(first)?.note ?? '') : '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tool]);

  const pick = (d: string | null) => {
    setDate(d);
    setNote(d ? (byDate.get(d)?.note ?? '') : '');
  };

  return (
    <Modal opened={!!tool} onClose={onClose} title={tool ? `Notes · ${tool.code}` : 'Notes'} size="md">
      <Stack gap="sm">
        {noted.length > 0 && (
          <div>
            <Text size="xs" fw={700} c="dimmed" mb={4}>
              This month
            </Text>
            <Stack gap={4}>
              {noted.map((r) => (
                <UnstyledButton key={r.date} onClick={() => pick(r.date)} style={{ borderRadius: 8, padding: '4px 8px', background: r.date === date ? 'var(--saa-kpi-bg)' : 'var(--saa-surface2)', border: '1px solid var(--saa-border)' }}>
                  <Group gap={8} wrap="nowrap" align="flex-start">
                    <Text size="xs" fw={800} style={{ minWidth: 40 }}>
                      {Number(r.date.slice(8, 10))} {weekdayOf(r.date).slice(0, 3)}
                    </Text>
                    <OverallPill overall={r.overall} />
                    <Text size="xs" style={{ whiteSpace: 'pre-wrap' }}>
                      {r.note}
                    </Text>
                  </Group>
                </UnstyledButton>
              ))}
            </Stack>
          </div>
        )}
        <Select label="Day" size="xs" data={days.map((d) => ({ value: d, label: `${formatLongDate(d)} (${weekdayOf(d).slice(0, 3)})${byDate.get(d)?.note ? ' · has note' : ''}` }))} value={date} onChange={pick} searchable comboboxProps={{ withinPortal: true }} />
        <Textarea label="Note" size="xs" autosize minRows={3} maxLength={500} value={note} onChange={(e) => setNote(e.currentTarget.value)} placeholder="Reason, action taken, reference…" />
        <Group justify="flex-end" gap="xs">
          <Button variant="default" size="xs" onClick={onClose}>
            Close
          </Button>
          <Button size="xs" disabled={!date} loading={saving} onClick={() => date && onSave(date, note.trim() || null)}>
            Save note
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
