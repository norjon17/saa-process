import { Alert, Button, Group, Loader, Stack, Stepper, Text } from '@mantine/core';
import { Dropzone } from '@mantine/dropzone';
import { IconAlertCircle, IconArrowLeft, IconCheck, IconDeviceFloppy, IconFileTypeCsv, IconRefresh, IconUpload, IconX } from '@tabler/icons-react';
import { useNavigate } from '@tanstack/react-router';
import { lazy, Suspense, useEffect, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { ApiError } from '@/lib/api/client';
import { notify } from '@/lib/notify';
import { useIsMobile } from '@/lib/useIsMobile';

import { useEvaluate, useSaveLot } from '../api';
import { selectComplete, selectFiles, useUploadStore } from '../store/upload.store';
import { FileSlots } from './FileSlots';
import { LotResultSkeleton } from './LotResultSkeleton';

/** The review/result card (report tables + charts) is only needed after the files step — load it on demand. */
const LotResultCard = lazy(() => import('./LotResultCard').then((m) => ({ default: m.LotResultCard })));

const CSV_ACCEPT = { 'text/csv': ['.csv'], 'text/plain': ['.csv'], 'application/vnd.ms-excel': ['.csv'] };

function ProblemAlert({ error, title }: { error: unknown; title: string }) {
  const problems = error instanceof ApiError && error.problems?.length ? error.problems : null;
  const message = error instanceof Error ? error.message : String(error);
  return (
    <Alert color="red" icon={<IconAlertCircle size={16} />} title={title} variant="light">
      {problems ? (
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          {problems.map((p) => (
            <li key={p}>
              <Text size="xs">{p}</Text>
            </li>
          ))}
        </ul>
      ) : (
        <Text size="xs">{message}</Text>
      )}
    </Alert>
  );
}

/** Files → Review → Result. Evaluation is a dry run; nothing is stored until "Save verdict". */
export function UploadWizard() {
  const navigate = useNavigate();
  const stage = useUploadStore((s) => s.stage);
  const setStage = useUploadStore((s) => s.setStage);
  const addFiles = useUploadStore((s) => s.addFiles);
  const reset = useUploadStore((s) => s.reset);
  const rejected = useUploadStore((s) => s.rejected);
  const complete = useUploadStore(selectComplete);
  // useShallow: selectFiles builds a new array each call — Zustand 5 would re-render forever (React #185).
  const files = useUploadStore(useShallow(selectFiles));

  const evaluate = useEvaluate();
  const save = useSaveLot();
  const [conflictLotId, setConflictLotId] = useState<number | null>(null);
  // Phones: compact stepper (no step descriptions) and a tap-first drop zone.
  const isMobile = useIsMobile();

  // Landing on the Review step (e.g. after navigating away and back) re-runs the dry run.
  useEffect(() => {
    if (stage === 1 && complete && !evaluate.data && !evaluate.isPending && !evaluate.error) evaluate.mutate(files);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage]);

  const startReview = () => {
    setConflictLotId(null);
    evaluate.reset();
    setStage(1);
    evaluate.mutate(files);
  };

  const doSave = (replace: boolean) => {
    setConflictLotId(null);
    save.mutate(
      { files, replace },
      {
        onSuccess: (lot) => {
          setStage(2);
          notify.success(`Verdict ${lot.verdict.toUpperCase()} saved for ${lot.lotNo}`);
          reset();
          evaluate.reset();
          void navigate({ to: '/meancheck/$lotId', params: { lotId: String(lot.id) } });
        },
        onError: (err) => {
          if (err instanceof ApiError && err.status === 409) {
            const id = (err.details as { lotId?: number } | undefined)?.lotId ?? null;
            setConflictLotId(id);
          }
        },
      },
    );
  };

  const goBack = () => {
    setStage(0);
    setConflictLotId(null);
    save.reset();
  };

  const startOver = () => {
    reset();
    evaluate.reset();
    save.reset();
    setConflictLotId(null);
  };

  return (
    <Stack gap="md">
      <Stepper active={stage} onStepClick={(i) => (i < stage ? setStage(i) : undefined)} allowNextStepsSelect={false} size="sm" iconSize={isMobile ? 30 : undefined} wrap={!isMobile}>
        <Stepper.Step label="Files" description={isMobile ? undefined : 'Three lot CSVs'} icon={<IconUpload size={16} />}>
          <Stack gap="sm" mt="sm">
            <Dropzone onDrop={(dropped) => void addFiles(dropped)} onReject={() => notify.error('Only .csv files are accepted (max 3 at a time)')} accept={CSV_ACCEPT} multiple maxFiles={3} radius="md">
              <Group justify="center" gap={isMobile ? 'xs' : 'md'} wrap={isMobile ? 'nowrap' : 'wrap'} style={{ minHeight: isMobile ? 64 : 90, pointerEvents: 'none' }}>
                <Dropzone.Accept>
                  <IconUpload size={36} stroke={1.5} />
                </Dropzone.Accept>
                <Dropzone.Reject>
                  <IconX size={36} stroke={1.5} />
                </Dropzone.Reject>
                <Dropzone.Idle>
                  <IconFileTypeCsv size={36} stroke={1.5} style={{ opacity: 0.6 }} />
                </Dropzone.Idle>
                {isMobile ? (
                  <div style={{ minWidth: 0 }}>
                    <Text size="sm" fw={800}>
                      Tap to choose the three lot CSV files
                    </Text>
                    <Text size="xs" c="dimmed">
                      Pick all three at once — slots are assigned automatically
                    </Text>
                  </div>
                ) : (
                  <div>
                    <Text size="sm" fw={800}>
                      Drop the three lot CSV files here, or click to browse
                    </Text>
                    <Text size="xs" c="dimmed">
                      &lt;Lot&gt;-MC-DS.csv · &lt;Lot&gt;.csv · &lt;Lot&gt;_&lt;tool&gt;_&lt;seq&gt;_&lt;timestamp&gt;.csv — slots are assigned automatically
                    </Text>
                  </div>
                )}
              </Group>
            </Dropzone>
            {rejected.length > 0 && (
              <Alert color="yellow" variant="light" icon={<IconAlertCircle size={16} />}>
                Could not place: {rejected.join(', ')} — every slot is already filled. Use "Replace" on a slot instead.
              </Alert>
            )}
            <FileSlots />
            <Group justify="space-between">
              <Button variant="subtle" color="gray" leftSection={<IconRefresh size={14} />} onClick={startOver} disabled={files.length === 0}>
                Start over
              </Button>
              <Button onClick={startReview} disabled={!complete} rightSection={<IconCheck size={14} />}>
                Review verdict
              </Button>
            </Group>
          </Stack>
        </Stepper.Step>

        <Stepper.Step label="Review" description={isMobile ? undefined : 'Dry-run evaluation'} icon={<IconCheck size={16} />} loading={evaluate.isPending}>
          <Stack gap="sm" mt="sm">
            {evaluate.isPending && (
              <Stack gap="xs" aria-live="polite">
                <Group gap="xs">
                  <Loader size="xs" />
                  <Text size="sm">Evaluating the 24 checks…</Text>
                </Group>
                <LotResultSkeleton />
              </Stack>
            )}
            {evaluate.error && <ProblemAlert error={evaluate.error} title="The files could not be evaluated" />}
            {save.error && !conflictLotId && <ProblemAlert error={save.error} title="The verdict could not be saved" />}
            {conflictLotId !== null && (
              <Alert color="orange" variant="light" icon={<IconAlertCircle size={16} />} title="This lot already has a verdict">
                <Group gap="xs" mt={6}>
                  <Button size="compact-sm" color="orange" onClick={() => doSave(true)} loading={save.isPending}>
                    Replace existing
                  </Button>
                  <Button size="compact-sm" variant="default" onClick={() => void navigate({ to: '/meancheck/$lotId', params: { lotId: String(conflictLotId) } })}>
                    Open existing
                  </Button>
                </Group>
              </Alert>
            )}
            {evaluate.data && (
              <Suspense fallback={<LotResultSkeleton />}>
                <LotResultCard source={evaluate.data} />
              </Suspense>
            )}
            <Group justify="space-between">
              <Button variant="default" leftSection={<IconArrowLeft size={14} />} onClick={goBack}>
                Back
              </Button>
              <Button leftSection={<IconDeviceFloppy size={14} />} onClick={() => doSave(false)} disabled={!evaluate.data} loading={save.isPending}>
                Save verdict
              </Button>
            </Group>
          </Stack>
        </Stepper.Step>

        <Stepper.Step label="Result" description={isMobile ? undefined : 'Saved'} icon={<IconDeviceFloppy size={16} />}>
          <Stack gap="xs" mt="sm" aria-live="polite">
            <Group gap="xs">
              <Loader size="xs" />
              <Text size="sm">Opening the saved verdict…</Text>
            </Group>
            <LotResultSkeleton />
          </Stack>
        </Stepper.Step>
      </Stepper>
    </Stack>
  );
}
