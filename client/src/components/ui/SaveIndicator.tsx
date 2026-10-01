import { Badge, Loader } from '@mantine/core';

export type SaveState = 'idle' | 'saving' | 'saved' | 'error' | 'dirty';

export function SaveIndicator({ state, at }: { state: SaveState; at?: number | null }) {
  if (state === 'saving') {
    return (
      <Badge variant="light" color="brand" leftSection={<Loader size={10} />}>
        Saving…
      </Badge>
    );
  }
  if (state === 'error') return <Badge color="red">Save failed</Badge>;
  if (state === 'dirty') return <Badge color="yellow">Unsaved changes</Badge>;
  if (state === 'saved') {
    const t = at ? new Date(at).toLocaleTimeString('en-PH', { hour12: false }) : '';
    return (
      <Badge variant="light" color="teal">
        ✔ Auto-saved {t}
      </Badge>
    );
  }
  return null;
}
