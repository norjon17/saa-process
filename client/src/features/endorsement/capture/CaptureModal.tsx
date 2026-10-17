import { Alert, Button, Group, Loader, Modal, Stack, Text } from '@mantine/core';
import { IconAlertTriangle, IconCheck, IconCopy, IconDownload, IconMail, IconRefresh } from '@tabler/icons-react';

import { useIsMobile } from '@/lib/useIsMobile';

import { imageClipboardSupport } from './clipboard';
import classes from './share.module.css';
import type { CopyState, PictureState } from './types';

interface Props {
  opened: boolean;
  onClose: () => void;
  picture: PictureState;
  copy: CopyState;
  fileName: string;
  onCopy: () => void;
  onDownload: () => void;
  onEmail: () => void;
  onRetry: () => void;
}

export function CaptureModal({ opened, onClose, picture, copy, fileName, onCopy, onDownload, onEmail, onRetry }: Props) {
  const isMobile = useIsMobile();
  const clip = imageClipboardSupport();
  const ready = picture.status === 'ready';

  return (
    <Modal opened={opened} onClose={onClose} title="Capture shift board" size={1180} fullScreen={isMobile} padding="md">
      <Stack gap="sm">
        <Text size="sm" c="dimmed">
          A picture of all six sections for this shift, sized for an email. Copy it and paste it into the message (Ctrl+V), or download the PNG.
        </Text>

        <div className={classes.preview} aria-busy={picture.status === 'capturing'}>
          {picture.status === 'ready' && <img src={picture.url} alt={`Shift board, all sections (${fileName})`} className={classes.previewImg} />}
          {(picture.status === 'capturing' || picture.status === 'idle') && (
            <Group gap="xs" justify="center" className={classes.previewState}>
              <Loader size="sm" />
              <Text size="sm">Drawing the board…</Text>
            </Group>
          )}
          {picture.status === 'error' && (
            <Alert color="red" icon={<IconAlertTriangle size={16} />} title="Could not create the picture" m="md">
              <Stack gap="xs" align="flex-start">
                <Text size="sm">{picture.message}</Text>
                <Button size="xs" variant="light" leftSection={<IconRefresh size={14} />} onClick={onRetry}>
                  Try again
                </Button>
              </Stack>
            </Alert>
          )}
        </div>

        {!clip.ok && (
          <Alert color="yellow" icon={<IconAlertTriangle size={16} />} p="xs">
            <Text size="sm">{clip.reason}</Text>
          </Alert>
        )}
        {copy.status === 'copied' && (
          <Alert color="teal" icon={<IconCheck size={16} />} p="xs">
            <Text size="sm">Picture copied — paste it into your email or chat (Ctrl+V).</Text>
          </Alert>
        )}
        {copy.status === 'error' && (
          <Alert color="red" icon={<IconAlertTriangle size={16} />} p="xs">
            <Text size="sm">Copy failed: {copy.message}. Use Download PNG instead.</Text>
          </Alert>
        )}

        <Group justify="flex-end" gap="xs" className={isMobile ? classes.mobileActions : undefined}>
          <Button variant="default" leftSection={<IconDownload size={15} />} onClick={onDownload} disabled={!ready}>
            Download PNG
          </Button>
          <Button variant="light" leftSection={<IconCopy size={15} />} onClick={onCopy} disabled={!ready || !clip.ok} loading={copy.status === 'copying'}>
            Copy picture
          </Button>
          <Button leftSection={<IconMail size={15} />} onClick={onEmail} disabled={picture.status === 'error'}>
            Email…
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
