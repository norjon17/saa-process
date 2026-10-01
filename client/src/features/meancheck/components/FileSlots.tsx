import { ActionIcon, Badge, Button, FileButton, Group, SimpleGrid, Text, Tooltip } from '@mantine/core';
import { IconFileTypeCsv, IconTrash } from '@tabler/icons-react';

import { SLOT_META, SLOT_ORDER, useUploadStore, type FileKind, type SlotKey } from '../store/upload.store';
import classes from './meancheck.module.css';

const KIND_LABEL: Record<FileKind, string> = { mcds: 'MC-DS header', remeasure: 'Re-Measure header', sat: 'SAT rows', unknown: 'Unrecognised' };

const fmtSize = (n: number) => (n < 1024 ? `${n} B` : n < 1024 * 1024 ? `${(n / 1024).toFixed(1)} KB` : `${(n / 1024 / 1024).toFixed(2)} MB`);

function Slot({ slotKey }: { slotKey: SlotKey }) {
  const slot = useUploadStore((s) => s.slots[slotKey]);
  const setSlot = useUploadStore((s) => s.setSlot);
  const meta = SLOT_META[slotKey];
  const matches = slot ? slot.sniff === slotKey : null;
  return (
    <div className={`${classes.slot} ${slot ? classes.slotFilled : ''}`}>
      <Group justify="space-between" wrap="nowrap" gap={6}>
        <div>
          <div className={classes.slotTitle}>{meta.title}</div>
          <div className={classes.slotPattern}>{meta.pattern}</div>
        </div>
        <IconFileTypeCsv size={20} style={{ opacity: slot ? 1 : 0.35 }} />
      </Group>
      {slot ? (
        <>
          <div className={classes.slotFile}>{slot.file.name}</div>
          <Group gap={6} wrap="nowrap">
            <Text size="xs" c="dimmed">
              {fmtSize(slot.file.size)}
            </Text>
            <Tooltip label={slot.firstLine ? `First line: ${slot.firstLine.slice(0, 80)}` : 'Could not read the file'} withArrow>
              <Badge size="xs" variant="light" color={matches ? 'teal' : slot.sniff === 'unknown' ? 'gray' : 'red'}>
                {KIND_LABEL[slot.sniff]}
              </Badge>
            </Tooltip>
          </Group>
          {matches === false && slot.sniff !== 'unknown' && (
            <Text size="xs" c="red" fw={700}>
              Looks like the {KIND_LABEL[slot.sniff]} file — check the slot.
            </Text>
          )}
          <Group gap={6} mt="auto">
            <FileButton onChange={(f) => void setSlot(slotKey, f)} accept=".csv,text/csv">
              {(props) => (
                <Button {...props} size="compact-xs" variant="default">
                  Replace
                </Button>
              )}
            </FileButton>
            <ActionIcon size="sm" variant="subtle" color="red" onClick={() => void setSlot(slotKey, null)} aria-label="Remove file">
              <IconTrash size={14} />
            </ActionIcon>
          </Group>
        </>
      ) : (
        <>
          <Text size="xs" c="dimmed">
            {meta.hint}
          </Text>
          <Group mt="auto">
            <FileButton onChange={(f) => void setSlot(slotKey, f)} accept=".csv,text/csv">
              {(props) => (
                <Button {...props} size="compact-xs" variant="light">
                  Choose file
                </Button>
              )}
            </FileButton>
          </Group>
        </>
      )}
    </div>
  );
}

/** The three lot-file slots; files dropped on the Dropzone are auto-assigned by filename / content. */
export function FileSlots() {
  return (
    <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="sm">
      {SLOT_ORDER.map((k) => (
        <Slot key={k} slotKey={k} />
      ))}
    </SimpleGrid>
  );
}
