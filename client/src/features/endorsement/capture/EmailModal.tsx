import { Alert, Button, Group, Loader, Modal, Stack, Text, Textarea, TextInput } from '@mantine/core';
import { IconAlertTriangle, IconCheck, IconCopy, IconDownload, IconMail, IconRefresh } from '@tabler/icons-react';
import { useMemo, useState } from 'react';

import type { Shift } from '@shared/domain';

import type { BoardResponse } from '@/lib/api/types';
import { notify } from '@/lib/notify';
import { useIsMobile } from '@/lib/useIsMobile';

import { imageClipboardSupport } from './clipboard';
import { composeEmail, defaultSubject, invalidAddresses, MAILTO_MAX, parseAddresses } from './emailSummary';
import { loadRecipients, saveRecipients } from './recipients';
import classes from './share.module.css';
import type { CopyState, PictureState } from './types';

interface Props {
  opened: boolean;
  onClose: () => void;
  date: string;
  shift: Shift;
  board: BoardResponse;
  picture: PictureState;
  copy: CopyState;
  onCopy: () => void;
  onDownload: () => void;
  onRetry: () => void;
}

export function EmailModal(props: Props) {
  const isMobile = useIsMobile();
  return (
    <Modal opened={props.opened} onClose={props.onClose} title="Email shift endorsement" size="lg" fullScreen={isMobile} padding="md">
      {/* Mounted only while open, so every opening starts from the remembered recipients + a fresh subject. */}
      <EmailForm {...props} isMobile={isMobile} />
    </Modal>
  );
}

/** Opens the default mail app without navigating the SPA. */
function openMailto(url: string) {
  const a = document.createElement('a');
  a.href = url;
  a.rel = 'noopener';
  a.click();
}

function EmailForm({ date, shift, board, picture, copy, onCopy, onDownload, onRetry, isMobile }: Props & { isMobile: boolean }) {
  const [initial] = useState(loadRecipients);
  const [to, setTo] = useState(initial.to);
  const [cc, setCc] = useState(initial.cc);
  const [subject, setSubject] = useState(() => defaultSubject(date, shift));
  const [message, setMessage] = useState('Good day,\n\nPlease see the SAA Process endorsement for this shift (board picture below).');
  const [touched, setTouched] = useState(false);

  const link = `${window.location.origin}/endorsement?date=${date}&shift=${shift}`;
  const composed = useMemo(
    () => composeEmail({ to, cc, subject, message, date, shift, items: board.items, kpi: board.kpi, link }),
    [to, cc, subject, message, date, shift, board, link],
  );

  const toError = !parseAddresses(to).length ? 'Enter at least one recipient' : invalidAddresses(to).length ? `Not an email address: ${invalidAddresses(to).join(', ')}` : null;
  const ccError = invalidAddresses(cc).length ? `Not an email address: ${invalidAddresses(cc).join(', ')}` : null;

  const send = () => {
    setTouched(true);
    if (toError || ccError) return;
    saveRecipients({ to, cc });
    openMailto(composed.url);
    notify.info(copy.status === 'copied' ? 'Paste the board picture into the message with Ctrl+V.' : 'Attach the downloaded board picture to the message.', 'Opening your email app…');
  };

  return (
    <Stack gap="sm">
      <PictureStatus picture={picture} copy={copy} onCopy={onCopy} onDownload={onDownload} onRetry={onRetry} />

      <TextInput label="To" placeholder="name@wdc.com, other@wdc.com" description="Separate addresses with commas" value={to} onChange={(e) => setTo(e.currentTarget.value)} error={touched && toError} required autoFocus={!isMobile} />
      <TextInput label="CC" placeholder="optional" value={cc} onChange={(e) => setCc(e.currentTarget.value)} error={touched && ccError} />
      <TextInput label="Subject" value={subject} onChange={(e) => setSubject(e.currentTarget.value)} />
      <Textarea label="Message" autosize minRows={3} maxRows={8} value={message} onChange={(e) => setMessage(e.currentTarget.value)} />

      <div>
        <Group justify="space-between" gap="xs" mb={4}>
          <Text size="sm" fw={700}>
            Auto summary (added below your message)
          </Text>
          <Text size="xs" c={composed.overLimit ? 'red' : 'dimmed'}>
            {composed.shownIssues < composed.totalIssues ? `${composed.shownIssues} of ${composed.totalIssues} open issues listed · ` : ''}
            {composed.url.length} / {MAILTO_MAX} chars
          </Text>
        </Group>
        <pre className={classes.summary}>{composed.summary}</pre>
        {composed.overLimit && (
          <Text size="xs" c="red" mt={4}>
            The message is too long for an email link — some mail apps will cut it off. Shorten it, or type the rest in the mail app.
          </Text>
        )}
      </div>

      <Group justify="flex-end" gap="xs" className={isMobile ? classes.mobileActions : undefined}>
        <Button leftSection={<IconMail size={15} />} onClick={send}>
          Open in email app
        </Button>
      </Group>
      <Text size="xs" c="dimmed">
        Nothing is sent from this app — your mail app opens with the message filled in, and you send it from there.
      </Text>
    </Stack>
  );
}

function PictureStatus({ picture, copy, onCopy, onDownload, onRetry }: Pick<Props, 'picture' | 'copy' | 'onCopy' | 'onDownload' | 'onRetry'>) {
  const clip = imageClipboardSupport();
  const ready = picture.status === 'ready';
  const download = (
    <Button size="xs" variant="default" leftSection={<IconDownload size={14} />} onClick={onDownload} disabled={!ready}>
      Download PNG
    </Button>
  );

  if (picture.status === 'error') {
    return (
      <Alert color="red" icon={<IconAlertTriangle size={16} />} p="xs" title="Could not create the board picture">
        <Group gap="xs" justify="space-between">
          <Text size="sm">{picture.message}</Text>
          <Button size="xs" variant="light" leftSection={<IconRefresh size={14} />} onClick={onRetry}>
            Try again
          </Button>
        </Group>
      </Alert>
    );
  }
  if (!clip.ok) {
    return (
      <Alert color="yellow" icon={<IconAlertTriangle size={16} />} p="xs">
        <Stack gap={6} align="flex-start">
          <Text size="sm">{clip.reason}</Text>
          {ready ? (
            download
          ) : (
            <Group gap={6}>
              <Loader size="xs" /> <Text size="xs">Drawing the board…</Text>
            </Group>
          )}
        </Stack>
      </Alert>
    );
  }
  if (copy.status === 'copying' || (copy.status === 'idle' && picture.status !== 'ready')) {
    return (
      <Alert color="brand" icon={<Loader size={14} />} p="xs">
        <Text size="sm">Capturing the board and copying the picture…</Text>
      </Alert>
    );
  }
  if (copy.status === 'copied') {
    return (
      <Alert color="teal" icon={<IconCheck size={16} />} p="xs">
        <Group gap="xs" justify="space-between">
          <Text size="sm" fw={700}>
            Board picture copied — paste it into the email (Ctrl+V)
          </Text>
          <Group gap={6}>
            <Button size="xs" variant="subtle" leftSection={<IconCopy size={14} />} onClick={onCopy}>
              Copy again
            </Button>
            {download}
          </Group>
        </Group>
      </Alert>
    );
  }
  return (
    <Alert color={copy.status === 'error' ? 'red' : 'gray'} icon={<IconAlertTriangle size={16} />} p="xs">
      <Group gap="xs" justify="space-between">
        <Text size="sm">{copy.status === 'error' ? `The picture was not copied: ${copy.message}` : 'Copy the board picture, then paste it into the email.'}</Text>
        <Group gap={6}>
          <Button size="xs" variant="light" leftSection={<IconCopy size={14} />} onClick={onCopy} disabled={!ready}>
            Copy picture
          </Button>
          {download}
        </Group>
      </Group>
    </Alert>
  );
}
