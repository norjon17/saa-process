import { Button, Loader, Modal, Stack, TagsInput, Text } from '@mantine/core';
import { useState } from 'react';

import fd from '@/components/ui/formDrawer.module.css';
import type { User } from '@/lib/api/types';
import { useIsMobile } from '@/lib/useIsMobile';

import { useSetUserAliases, useUserAliases } from '../api';

/** Alias editor: centred modal on desktop, full-screen on phones (the tags input needs the keyboard room). */
export function AliasesModal({ user, onClose }: { user: User | null; onClose: () => void }) {
  const aliases = useUserAliases(user?.id ?? null);
  const isMobile = useIsMobile();
  return (
    <Modal opened={user !== null} onClose={onClose} title={user ? `Aliases · ${user.name}` : ''} size="md" fullScreen={isMobile} padding="md">
      {user && (aliases.data ? <AliasesEditor key={user.id} user={user} initial={aliases.data} onClose={onClose} size={isMobile ? 'md' : 'sm'} /> : <Loader size="sm" />)}
    </Modal>
  );
}

function AliasesEditor({ user, initial, onClose, size }: { user: User; initial: string[]; onClose: () => void; size: 'sm' | 'md' }) {
  const [value, setValue] = useState(initial);
  const save = useSetUserAliases();
  return (
    <Stack gap="sm">
      <Text size="xs" c="dimmed">
        Names this person appears under in the Excel workbooks (e.g. initials, nicknames). Used to match “Endorse by / to” text to the account. Stored lower-case.
      </Text>
      <TagsInput size={size} value={value} onChange={setValue} placeholder="Type an alias and press Enter" clearable splitChars={[',', ';']} data={[]} aria-label="Aliases" />
      <div className={fd.footer} style={{ marginTop: 0 }}>
        <Button variant="default" size={size === 'md' ? 'sm' : 'xs'} onClick={onClose}>
          Cancel
        </Button>
        <Button size={size === 'md' ? 'sm' : 'xs'} loading={save.isPending} onClick={() => save.mutate({ userId: user.id, aliases: value }, { onSuccess: onClose })}>
          Save aliases
        </Button>
      </div>
    </Stack>
  );
}
